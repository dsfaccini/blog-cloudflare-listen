import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { extractTextForAudio } from '@/lib/article-parser';
import { generateAudio } from '@/lib/workers-ai';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> }
) {
    try {
        const { env } = await getCloudflareContext();
        const resolvedParams = await params;
        const slug = resolvedParams.slug.join('/');
        
        if (!env.BLOG_STORAGE) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

        const basePath = `blogs/${slug}`;

        // First, check if audio already exists
        const audioObject = await env.BLOG_STORAGE.get(`${basePath}/audio.mp3`);
        
        if (audioObject) {
            console.log(`Serving cached audio for: ${slug}`);
            const audioBuffer = await audioObject.arrayBuffer();
            
            return new NextResponse(audioBuffer, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.byteLength.toString(),
                    'Cache-Control': 'public, max-age=31536000',
                    'Accept-Ranges': 'bytes',
                },
            });
        }

        // Audio doesn't exist, check if we have the article to generate from
        if (!env.AI) {
            return NextResponse.json({ error: 'AI binding not configured' }, { status: 500 });
        }

        console.log(`Audio not found, generating for: ${slug}`);

        const articleObj = await env.BLOG_STORAGE.get(`${basePath}/article.json`);
        
        if (!articleObj) {
            return NextResponse.json({ 
                error: 'Article not found in storage',
                path: `${basePath}/article.json`
            }, { status: 404 });
        }

        const article = JSON.parse(await articleObj.text());
        const textForAudio = extractTextForAudio(article);

        if (!textForAudio || textForAudio.length === 0) {
            return NextResponse.json({ 
                error: 'No text content found for audio generation'
            }, { status: 400 });
        }

        console.log(`Generating audio for ${textForAudio.length} characters...`);

        // Generate the audio
        const audioBuffer = await generateAudio(textForAudio);

        console.log(`Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);

        // Store the audio to R2 for future requests
        await env.BLOG_STORAGE.put(`${basePath}/audio.mp3`, audioBuffer, {
            httpMetadata: { contentType: 'audio/mpeg' },
        });

        console.log(`Audio saved to R2: ${basePath}/audio.mp3`);

        // Return the generated audio directly
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=31536000',
                'Accept-Ranges': 'bytes',
            },
        });

    } catch (error) {
        console.error('Error serving/generating audio:', error);
        return NextResponse.json(
            { 
                error: 'Audio generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, 
            { status: 500 }
        );
    }
}