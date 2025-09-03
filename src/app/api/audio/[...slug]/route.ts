import { getCloudflareContext } from '@opennextjs/cloudflare';

import { NextRequest, NextResponse } from 'next/server';

import { extractTextForAudio } from '@/lib/article-parser';
import { getAudioChunkStatus } from '@/lib/audio-chunk-manager';
import { createErrorDetails } from '@/lib/audio-debug-helpers';
import { generateAudioResilient } from '@/lib/workers-ai';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> },
) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug.join('/');
    
    try {
        const { env } = await getCloudflareContext();

        if (!env.BLOG_STORAGE) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

        const basePath = `blogs/${slug}`;

        // First, check if complete audio already exists
        const audioObject = await env.BLOG_STORAGE.get(`${basePath}/audio.mp3`);

        if (audioObject) {
            console.log(`Serving complete cached audio for: ${slug}`);
            const audioBuffer = await audioObject.arrayBuffer();

            return new NextResponse(audioBuffer, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.byteLength.toString(),
                    'Cache-Control': 'public, max-age=31536000',
                    'Accept-Ranges': 'bytes',
                    'X-Audio-Status': 'complete',
                    'X-Total-Chunks': '1',
                    'X-Available-Chunks': '1',
                },
            });
        }

        // Check for partial audio chunks and always attempt to complete missing ones
        const chunkStatus = await getAudioChunkStatus(env.BLOG_STORAGE, slug);

        // If we have chunks but they're incomplete, continue to regenerate missing ones
        // Only return early if we have complete audio
        if (chunkStatus.isComplete && chunkStatus.availableAudio) {
            console.log(`Serving complete cached audio for: ${slug}`);
            return new NextResponse(chunkStatus.availableAudio, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': chunkStatus.availableAudio.byteLength.toString(),
                    'Cache-Control': 'public, max-age=31536000', // Long cache for complete content
                    'Accept-Ranges': 'bytes',
                    'X-Audio-Status': 'complete',
                    'X-Total-Chunks': chunkStatus.totalChunks.toString(),
                    'X-Available-Chunks': chunkStatus.availableChunks.length.toString(),
                    'X-Missing-Chunks': 'none',
                },
            });
        }

        // If incomplete or no chunks exist, continue to generation logic below
        if (chunkStatus.totalChunks > 0 && chunkStatus.missingChunks.length > 0) {
            console.log(
                `Found incomplete audio for: ${slug} (${chunkStatus.availableChunks.length}/${chunkStatus.totalChunks} chunks). Regenerating missing chunks...`,
            );
        }

        // No audio exists, start generation process
        if (!env.AI) {
            return NextResponse.json({ error: 'AI binding not configured' }, { status: 500 });
        }

        console.log(`No audio found, starting resilient generation for: ${slug}`);

        const articleObj = await env.BLOG_STORAGE.get(`${basePath}/article.json`);

        if (!articleObj) {
            return NextResponse.json(
                {
                    error: 'Article not found in storage',
                    path: `${basePath}/article.json`,
                },
                { status: 404 },
            );
        }

        const article = JSON.parse(await articleObj.text());
        const textForAudio = extractTextForAudio(article);

        if (!textForAudio || textForAudio.length === 0) {
            return NextResponse.json(
                {
                    error: 'No text content found for audio generation',
                },
                { status: 400 },
            );
        }

        console.log(`Starting resilient audio generation for ${textForAudio.length} characters...`);

        // Generate audio using resilient approach
        const result = await generateAudioResilient(textForAudio, slug);

        console.log(
            `Resilient generation result: ${result.availableChunks.length}/${result.totalChunks} chunks complete`,
        );

        if (!result.audio) {
            const errorDetails = createErrorDetails(
                new Error('Complete audio generation failure - no chunks completed'), 
                {
                    slug,
                    totalChunks: result.totalChunks,
                    failedChunks: result.missingChunks,
                    context: 'resilient-audio-generation'
                }
            );

            console.error('🚨 COMPLETE AUDIO GENERATION FAILURE:');
            console.error(`All ${result.totalChunks} chunks failed to generate`);
            console.error('Failed chunks:', result.missingChunks);
            console.error('Error details:', errorDetails);

            return NextResponse.json(
                {
                    error: 'Complete audio generation failure',
                    message: `Failed to generate any of ${result.totalChunks} chunks`,
                    debugging: errorDetails,
                    chunkFailures: {
                        totalChunks: result.totalChunks,
                        failedChunks: result.missingChunks,
                        successfulChunks: result.availableChunks,
                        failureRate: '100%'
                    },
                    recommendations: [
                        'Check if AI service is operational',
                        'Verify text content is valid and not too long',
                        'Try with a shorter article or different content',
                        'Check rate limits and quotas',
                        'Wait a few minutes and retry'
                    ]
                },
                { status: 500 },
            );
        }

        const statusCode = result.isComplete ? 200 : 206; // 206 = Partial Content
        const audioStatus = result.isComplete ? 'complete' : 'partial';
        const cacheControl = result.isComplete ? 'public, max-age=31536000' : 'public, max-age=300';

        return new NextResponse(result.audio, {
            status: statusCode,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': result.audio.byteLength.toString(),
                'Cache-Control': cacheControl,
                'Accept-Ranges': 'bytes',
                'X-Audio-Status': audioStatus,
                'X-Total-Chunks': result.totalChunks.toString(),
                'X-Available-Chunks': result.availableChunks.length.toString(),
                'X-Missing-Chunks': result.missingChunks.join(',') || 'none',
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Create comprehensive error details for debugging
        const errorDetails = createErrorDetails(err, {
            slug: slug,
            totalChunks: 0, // Will be filled if known
            context: 'audio-api-route'
        });

        console.error('🚨 AUDIO API ERROR - Full debugging details:');
        console.error('Error message:', err.message);
        console.error('Error details:', errorDetails);
        console.error('Stack trace:', err.stack);

        return NextResponse.json(
            {
                error: 'Audio generation failed',
                message: err.message,
                debugging: errorDetails,
                troubleshooting: {
                    steps: [
                        '1. Check the error message above for specific failure reason',
                        '2. Verify the article exists and has content',
                        '3. Check if AI service is available and within quotas',
                        '4. Try again - some failures are transient',
                        '5. Check server logs for more detailed error information'
                    ],
                    commonCauses: [
                        'AI model timeout (>30s)',
                        'AI service temporarily unavailable',
                        'Text too long or contains unsupported content',
                        'Rate limiting or quota exceeded',
                        'Network connectivity issues'
                    ]
                }
            },
            { status: 500 },
        );
    }
}
