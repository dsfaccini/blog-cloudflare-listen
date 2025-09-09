import { getCloudflareContext } from '@opennextjs/cloudflare';

import { NextRequest, NextResponse } from 'next/server';

const MAX_CHUNK_SIZE = 1250; // Same limit as production

/**
 * Split text into chunks for audio generation (same logic as production)
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

export async function POST(request: NextRequest) {
    try {
        const { env } = await getCloudflareContext();

        // Block access in production environment
        if (env.ENVIRONMENT === 'production') {
            return NextResponse.json(
                { error: 'TTS testing not available in production' },
                { status: 403 },
            );
        }

        if (!env.AI) {
            return NextResponse.json({ error: 'AI binding not configured' }, { status: 500 });
        }

        const body = (await request.json()) as { text: string };
        const { text } = body;

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
        }

        if (text.length === 0) {
            return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
        }

        console.log(`🎵 TTS Test: Generating audio for ${text.length} characters`);

        // Check if we need chunking
        if (text.length <= MAX_CHUNK_SIZE) {
            // Single chunk - handle directly
            return await generateSingleAudio(env, text);
        } else {
            // Multiple chunks - generate and combine
            return await generateChunkedAudio(env, text);
        }
    } catch (error) {
        console.error('❌ TTS Test: Request processing error:', error);
        return NextResponse.json(
            {
                error: 'Request processing failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}

async function generateSingleAudio(env: CloudflareEnv, text: string): Promise<NextResponse> {
    try {
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

        // Check if response is a ReadableStream
        if (response instanceof ReadableStream) {
            console.log('✅ TTS Test: Received streaming response');

            return new NextResponse(response, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-cache',
                    'X-Generated-By': 'tts-test-single',
                },
            });
        }

        // Check if response is an ArrayBuffer
        if (response instanceof ArrayBuffer) {
            console.log(`✅ TTS Test: Received audio buffer (${response.byteLength} bytes)`);

            return new NextResponse(response, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': response.byteLength.toString(),
                    'Cache-Control': 'no-cache',
                    'X-Generated-By': 'tts-test-single',
                },
            });
        }

        console.error('❌ TTS Test: Unexpected response type:', typeof response);
        return NextResponse.json(
            {
                error: 'Unexpected response format from AI model',
                responseType: typeof response,
            },
            { status: 500 },
        );
    } catch (aiError) {
        console.error('❌ TTS Test: AI model error:', aiError);
        return NextResponse.json(
            {
                error: 'Failed to generate audio',
                details: aiError instanceof Error ? aiError.message : 'Unknown AI error',
            },
            { status: 500 },
        );
    }
}

async function generateChunkedAudio(env: CloudflareEnv, text: string): Promise<NextResponse> {
    const chunks = splitTextIntoChunks(text);
    console.log(`🎵 TTS Test: Generating ${chunks.length} audio chunks sequentially`);

    try {
        const audioChunks: ArrayBuffer[] = [];

        // Generate chunks sequentially to maintain order
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(
                `🎵 TTS Test: Generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`,
            );

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

            let audioBuffer: ArrayBuffer;

            // Handle ReadableStream (new response format)
            if (response instanceof ReadableStream) {
                console.log(`📥 Converting ReadableStream to ArrayBuffer for chunk ${i + 1}...`);

                const reader = response.getReader();
                const streamChunks: Uint8Array[] = [];
                let totalLength = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    streamChunks.push(value);
                    totalLength += value.length;
                }

                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const streamChunk of streamChunks) {
                    combined.set(streamChunk, offset);
                    offset += streamChunk.length;
                }

                audioBuffer = combined.buffer;
                console.log(
                    `✅ TTS Test: Chunk ${i + 1} converted from stream (${audioBuffer.byteLength} bytes)`,
                );
            }
            // Handle ArrayBuffer (legacy response format)
            else if (response instanceof ArrayBuffer) {
                audioBuffer = response;
                console.log(`✅ TTS Test: Chunk ${i + 1} generated (${response.byteLength} bytes)`);
            }
            // Handle unexpected response types
            else {
                throw new Error(
                    `Chunk ${i + 1} returned unexpected response type: ${typeof response}`,
                );
            }

            audioChunks.push(audioBuffer);
        }

        // Combine all chunks into a single audio file
        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of audioChunks) {
            combined.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }

        console.log(
            `✅ TTS Test: Combined ${audioChunks.length} chunks into ${combined.buffer.byteLength} bytes`,
        );

        return new NextResponse(combined.buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': combined.buffer.byteLength.toString(),
                'Cache-Control': 'no-cache',
                'X-Generated-By': 'tts-test-chunked',
                'X-Chunk-Count': chunks.length.toString(),
            },
        });
    } catch (error) {
        console.error('❌ TTS Test: Chunked audio generation failed:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate chunked audio',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
