import { getCloudflareContext } from '@opennextjs/cloudflare';

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

    try {
        // Try generating audio without chunking first
        // The Aura-1 model documentation doesn't specify a character limit
        console.log(`Generating audio for ${text.length} characters...`);

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

        if (response instanceof ArrayBuffer) {
            console.log(`Audio generated successfully, size: ${response.byteLength} bytes`);
            return response;
        } else {
            throw new Error('Unexpected response from AI model');
        }
    } catch (error) {
        console.error('Error generating audio:', error);

        // If the error suggests the text is too long, fall back to chunking
        if (
            error instanceof Error &&
            (error.message.includes('too long') || error.message.includes('limit'))
        ) {
            console.log('Text too long, falling back to chunking...');
            return generateAudioWithChunking(text);
        }

        throw new Error(
            `Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
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

    const maxChunkSize = 3000; // Conservative limit for chunking
    const chunks: string[] = [];

    // Split by sentences to avoid cutting words
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChunkSize) {
            currentChunk += sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    console.log(`Split into ${chunks.length} chunks for generation`);

    // Generate audio for each chunk
    const audioChunks: ArrayBuffer[] = [];

    for (const chunk of chunks) {
        // @ts-expect-error the model was already released but the sdk hasn't been updated
        const response = await env.AI.run('@cf/deepgram/aura-1', {
            text: chunk,
        });

        if (response instanceof ArrayBuffer) {
            audioChunks.push(response);
        } else {
            throw new Error('Unexpected response from AI model');
        }
    }

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

    try {
        const prompt = `Summarize the following text in ${maxLength} words or less. Be concise and capture the main points:\n\n${text}\n\nSummary:`;

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
    const summaries: string[] = [];

    for (const paragraph of paragraphs) {
        // Skip very short paragraphs
        if (paragraph.length < 50) {
            summaries.push(paragraph);
            continue;
        }

        try {
            const summary = await generateSummary(paragraph, 30); // Short summary per paragraph
            summaries.push(summary);
        } catch (error) {
            console.error('Error summarizing paragraph:', error);
            summaries.push(paragraph.substring(0, 100) + '...'); // Fallback to truncation
        }
    }

    return summaries;
}
