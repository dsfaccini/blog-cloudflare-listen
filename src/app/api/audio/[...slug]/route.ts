import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

        const audioObject = await env.BLOG_STORAGE.get(`blogs/${slug}/audio.mp3`);
        
        if (!audioObject) {
            return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
        }

        const audioBuffer = await audioObject.arrayBuffer();
        
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                'Accept-Ranges': 'bytes',
            },
        });
    } catch (error) {
        console.error('Error serving audio:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}