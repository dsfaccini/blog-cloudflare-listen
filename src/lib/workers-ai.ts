import { getCloudflareContext } from '@opennextjs/cloudflare';

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

    // Generate audio for all chunks in parallel
    const audioPromises = chunks.map((chunk) =>
        env.AI.run(
            // @ts-expect-error the model was already released but the sdk hasn't been updated
            '@cf/deepgram/aura-1',
            { text: chunk },
            {
                gateway: {
                    id: 'audio-blog-gateway',
                },
            },
        ),
    );

    console.log(`Generating ${chunks.length} audio chunks in parallel...`);
    const audioResponses = await Promise.all(audioPromises);

    // Validate all responses are ArrayBuffers
    const audioChunks: ArrayBuffer[] = [];
    for (const response of audioResponses) {
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
    console.log(`Generating summaries for ${paragraphs.length} paragraphs in parallel...`);

    // Generate all summaries in parallel
    const summaryPromises = paragraphs.map((paragraph) => {
        // Skip very short paragraphs
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
    console.log(`Generated ${summaries.length} summaries in parallel`);

    return summaries;
}
