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

        const basePath = `blogs/${slug}`;
        
        // Check if audio and summary files exist
        const [audioCheck, summaryCheck] = await Promise.allSettled([
            env.BLOG_STORAGE.head(`${basePath}/audio.mp3`),
            env.BLOG_STORAGE.get(`${basePath}/summary.json`),
        ]);

        const audioReady = audioCheck.status === 'fulfilled' && audioCheck.value !== null;
        let summaryReady = false;
        let summaries: string[] | null = null;

        if (summaryCheck.status === 'fulfilled' && summaryCheck.value) {
            try {
                const summaryData = await summaryCheck.value.json() as { summaries?: string[] };
                summaries = summaryData.summaries || null;
                summaryReady = summaries !== null;
            } catch (error) {
                console.error('Error parsing summary data:', error);
            }
        }

        return NextResponse.json({
            audioReady,
            summaryReady,
            summaries: summaryReady ? summaries : null,
        });
    } catch (error) {
        console.error('Error checking article status:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}