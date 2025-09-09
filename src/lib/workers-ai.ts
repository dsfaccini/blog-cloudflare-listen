import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
    getAudioChunkStatus,
    initializeAudioMetadata,
    storeAudioChunk,
    storeCompleteAudio,
    updateChunkMetadata,
} from './audio-chunk-manager';
import { logChunkFailure, logSuccessfulChunk, validateAudioResponse } from './audio-debug-helpers';

const MAX_CHUNK_SIZE = 1250; // Reduced limit for better reliability

/**
 * Generates audio from text using Cloudflare Workers AI Deepgram Aura-1 model
 * @param text - The text to convert to speech
 * @returns ArrayBuffer containing MP3 audio data
 */
export async function generateAudio(text: string): Promise<ArrayBuffer> {
    const { env } = await getCloudflareContext();

    if (!env.AI) {
        throw new Error('AI binding not configured');
    }

    // Check text length and use chunking proactively for long texts
    if (text.length > MAX_CHUNK_SIZE) {
        console.log(`Text is ${text.length} characters, using chunking strategy...`);
        return generateAudioWithChunking(text);
    }

    const context = {
        textLength: text.length,
        textPreview: text.substring(0, 100),
        attempt: 1,
    };

    try {
        console.log(`🎵 Generating single audio (${text.length} chars)...`);

        const response = await env.AI.run(
            // @ts-expect-error the model was already released but the sdk hasn't been updated
            '@cf/deepgram/aura-1',
            { text: text },
            {
                gateway: {
                    id: 'audio-blog-gateway',
                },
            },
        );

        const audioBuffer = await validateAudioResponse(response, context);

        console.log(`✅ Single audio generated successfully: ${audioBuffer.byteLength} bytes`);
        return audioBuffer;
    } catch (error) {
        console.error(
            '❌ Single audio generation failed:',
            error instanceof Error ? error.message : error,
        );
        console.error('Context:', context);
        throw error;
    }
}

/**
 * Fallback function to generate audio with chunking if the main function fails
 * @param text - The text to convert to speech
 * @returns ArrayBuffer containing MP3 audio data
 */
async function generateAudioWithChunking(text: string): Promise<ArrayBuffer> {
    const { env } = await getCloudflareContext();

    if (!env.AI) {
        throw new Error('AI binding not configured');
    }

    console.log('Using chunking strategy for audio generation...');

    const chunks: string[] = [];

    // Split by sentences to avoid cutting words
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= MAX_CHUNK_SIZE) {
            currentChunk += sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    console.log(`Split into ${chunks.length} chunks for generation`);

    console.log(`🎵 Generating ${chunks.length} audio chunks in parallel (old method)...`);

    // Generate audio for all chunks in parallel with timeout protection
    const audioPromises = chunks.map(async (chunk, index) => {
        const context = {
            chunkIndex: index,
            textLength: chunk.length,
            textPreview: chunk.substring(0, 100),
            totalChunks: chunks.length,
            attempt: 1,
        };

        try {
            const response = await env.AI.run(
                // @ts-expect-error the model was already released but the sdk hasn't been updated
                '@cf/deepgram/aura-1',
                { text: chunk },
                {
                    gateway: {
                        id: 'audio-blog-gateway',
                    },
                },
            );

            return await validateAudioResponse(response, context);
        } catch (error) {
            logChunkFailure(
                index,
                error instanceof Error ? error : new Error(String(error)),
                context,
            );
            throw error;
        }
    });

    const audioResponses = await Promise.all(audioPromises);

    // All responses should be ArrayBuffers at this point due to validation
    const audioChunks: ArrayBuffer[] = audioResponses;

    // Combine multiple audio chunks (basic concatenation)
    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of audioChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }

    console.log(`Combined ${audioChunks.length} chunks into ${combined.buffer.byteLength} bytes`);
    return combined.buffer;
}

/**
 * Resilient audio generation with individual chunk storage and progressive loading
 * @param text - The text to convert to speech
 * @param slug - Article slug for storage
 * @returns Object containing available audio and generation status
 */
export async function generateAudioResilient(
    text: string,
    slug: string,
): Promise<{
    audio: ArrayBuffer | null;
    isComplete: boolean;
    availableChunks: number[];
    missingChunks: number[];
    totalChunks: number;
}> {
    const { env } = await getCloudflareContext();

    if (!env.AI || !env.BLOG_STORAGE) {
        throw new Error('AI or storage binding not configured');
    }

    // Check current status of audio chunks
    const chunkStatus = await getAudioChunkStatus(env.BLOG_STORAGE, slug);

    // If we already have complete audio, return it
    if (chunkStatus.isComplete && chunkStatus.availableAudio) {
        return {
            audio: chunkStatus.availableAudio,
            isComplete: true,
            availableChunks: chunkStatus.availableChunks,
            missingChunks: [],
            totalChunks: chunkStatus.totalChunks,
        };
    }

    // Split text into chunks
    const textChunks = splitTextIntoChunks(text);

    // If no existing metadata, initialize it
    if (chunkStatus.totalChunks === 0) {
        console.log(`Initializing audio generation for ${textChunks.length} chunks`);
        await initializeAudioMetadata(env.BLOG_STORAGE, slug, textChunks);
    }

    // Generate only missing chunks using Promise.allSettled for resilience
    const missingChunks =
        chunkStatus.missingChunks.length > 0
            ? chunkStatus.missingChunks
            : Array.from({ length: textChunks.length }, (_, i) => i);

    console.log(`Generating ${missingChunks.length} missing chunks: [${missingChunks.join(', ')}]`);

    const chunkPromises = missingChunks.map(async (chunkIndex) => {
        const chunkText = textChunks[chunkIndex];
        const context = {
            chunkIndex,
            textLength: chunkText?.length || 0,
            textPreview: chunkText?.substring(0, 100) || '',
            totalChunks: textChunks.length,
            attempt: 1,
            slug,
        };

        try {
            if (!chunkText) {
                throw new Error(
                    `No text available for chunk ${chunkIndex} - textChunks array may be corrupted`,
                );
            }

            console.log(
                `🎵 Generating chunk ${chunkIndex}/${textChunks.length} (${chunkText.length} chars, attempt ${context.attempt})...`,
            );

            const response = await env.AI.run(
                // @ts-expect-error the model was already released but the sdk hasn't been updated
                '@cf/deepgram/aura-1',
                { text: chunkText },
                {
                    gateway: {
                        id: 'audio-blog-gateway',
                    },
                },
            );

            // Validate response with detailed error info
            const audioBuffer = await validateAudioResponse(response, context);

            // Store the chunk
            await storeAudioChunk(env.BLOG_STORAGE, slug, chunkIndex, audioBuffer);

            // Update metadata
            await updateChunkMetadata(env.BLOG_STORAGE, slug, chunkIndex, audioBuffer.byteLength);

            logSuccessfulChunk(chunkIndex, audioBuffer.byteLength, context);

            return { chunkIndex, audio: audioBuffer, success: true };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logChunkFailure(chunkIndex, err, context);
            return {
                chunkIndex,
                audio: null,
                success: false,
                error: err.message,
                context,
            };
        }
    });

    // Wait for all chunk generation attempts
    const chunkResults = await Promise.allSettled(chunkPromises);

    // Process results
    const newlyCompletedChunks: number[] = [];
    const stillMissingChunks: number[] = [];

    chunkResults.forEach((result, index) => {
        const chunkIndex = missingChunks[index];

        if (result.status === 'fulfilled' && result.value.success) {
            newlyCompletedChunks.push(chunkIndex);
        } else {
            stillMissingChunks.push(chunkIndex);
            const errorMsg = result.status === 'rejected' ? result.reason : result.value.error;
            console.warn(`Chunk ${chunkIndex} failed:`, errorMsg);
        }
    });

    // Get updated chunk status
    const updatedStatus = await getAudioChunkStatus(env.BLOG_STORAGE, slug);

    // If all chunks are now complete, store the complete audio and clean up
    if (updatedStatus.isComplete && updatedStatus.availableAudio) {
        console.log('All chunks complete, storing final audio file');
        await storeCompleteAudio(env.BLOG_STORAGE, slug, updatedStatus.availableAudio);
    }

    console.log(
        `Audio generation result: ${updatedStatus.availableChunks.length}/${updatedStatus.totalChunks} chunks complete`,
    );

    return {
        audio: updatedStatus.availableAudio || null,
        isComplete: updatedStatus.isComplete,
        availableChunks: updatedStatus.availableChunks,
        missingChunks: updatedStatus.missingChunks,
        totalChunks: updatedStatus.totalChunks,
    };
}

/**
 * Split text into chunks for audio generation
 */
function splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= MAX_CHUNK_SIZE) {
            currentChunk += sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
}

const summarizeWithLora = async (text: string) => {
    const { env } = await getCloudflareContext();
    // https://developers.cloudflare.com/workers-ai/models/mistral-7b-instruct-v0.2-lora/
    const stream = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.2-lora', {
        stream: true,
        raw: true,
        lora: 'cf-public-cnn-summarization',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant that summarizes articles.',
            },
            {
                role: 'user',
                content: `Summarize the following article:

<article_to_summarize>
${text}
</article_to_summarize>

Summary:`,
            },
        ],
    });

    return stream;
};

/**
 * Generates a summary of the provided text using Cloudflare Workers AI Llama 3.2 model
 * @param text - The text to summarize
 * @param maxLength - Maximum length of the summary in words (optional)
 * @returns Summary text string
 */
export async function generateSummary(text: string, maxLength = 100): Promise<string> {
    const { env } = await getCloudflareContext();

    if (!env.AI) {
        throw new Error('AI binding not configured');
    }

    const trimmedText = text.trim();

    // Check if text is empty or too short to meaningfully summarize
    if (!trimmedText || trimmedText.length < 20) {
        return `No summarization possible: ${trimmedText}`;
    }

    try {
        const prompt = `Summarize the following text in ${maxLength} words or less. Be concise and capture the main points. If the text is too short or incomplete to summarize meaningfully, return "No summarization possible: <original text>".

<text_to_summarize>
${trimmedText}
</text_to_summarize>

Summary:`;

        const response = await env.AI.run(
            '@cf/meta/llama-3.2-3b-instruct',
            {
                prompt,
                max_tokens: Math.min(maxLength * 2, 500), // Rough estimate: 2 tokens per word
                temperature: 0.3, // Lower temperature for more focused summaries
            },
            {
                gateway: {
                    id: 'audio-blog-gateway',
                },
            },
        );

        if (typeof response === 'object' && response !== null && 'response' in response) {
            return (response as { response: string }).response.trim();
        } else if (typeof response === 'string') {
            return (response as string).trim();
        } else {
            throw new Error('Unexpected response format from AI model' + JSON.stringify(response));
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        throw new Error(
            `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

/**
 * Generates paragraph-by-paragraph summaries for an article
 * @param paragraphs - Array of paragraph texts
 * @returns Array of summaries for each paragraph
 */
export async function generateParagraphSummaries(paragraphs: string[]): Promise<string[]> {
    console.log(`Generating summaries for ${paragraphs.length} paragraphs in parallel...`);

    // Filter out empty or very short paragraphs first
    const validParagraphs = paragraphs.map((paragraph) => {
        const trimmed = paragraph.trim();
        return trimmed.length > 0 ? trimmed : null;
    });

    // Generate all summaries in parallel
    const summaryPromises = validParagraphs.map((paragraph) => {
        // Return null for empty paragraphs
        if (!paragraph) {
            return Promise.resolve(null);
        }

        // Skip very short paragraphs (return as-is)
        if (paragraph.length < 50) {
            return Promise.resolve(paragraph);
        }

        // Generate summary with error handling
        return generateSummary(paragraph, 30).catch((error) => {
            console.error('Error summarizing paragraph:', error);
            return paragraph.substring(0, 100) + '...'; // Fallback to truncation
        });
    });

    const summaries = await Promise.all(summaryPromises);

    // Filter out null values and maintain array structure
    const filteredSummaries = summaries.map((summary, index) =>
        summary !== null ? summary : paragraphs[index],
    );

    console.log(`Generated ${filteredSummaries.length} summaries in parallel`);

    return filteredSummaries;
}
