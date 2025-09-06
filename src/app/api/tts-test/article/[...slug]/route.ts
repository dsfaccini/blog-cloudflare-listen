import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';
import { extractTextForAudio, extractTextForAudioWithHyphenPauses } from '@/lib/article-parser';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> },
) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug.join('/');
    
    try {
        const { env } = await getCloudflareContext();

        // Block access in production environment
        if (env.ENVIRONMENT === 'production') {
            return NextResponse.json({ error: 'TTS testing not available in production' }, { status: 403 });
        }

        if (!env.BLOG_STORAGE) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

        const basePath = `blogs/${slug}`;

        // Fetch the parsed article data
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

        // Generate both versions of text
        const originalText = extractTextForAudio(article);
        const modifiedText = extractTextForAudioWithHyphenPauses(article);

        return NextResponse.json({
            slug,
            title: article.title || 'Untitled Article',
            originalText,
            modifiedText,
            originalLength: originalText.length,
            modifiedLength: modifiedText.length,
            blockCount: article.blocks?.length || 0,
            headingCount: article.blocks?.filter((block: { type: string }) => block.type === 'heading').length || 0
        });

    } catch (error) {
        console.error(`Error fetching article text for TTS test (${slug}):`, error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch article text',
                details: error instanceof Error ? error.message : 'Unknown error',
                slug
            }, 
            { status: 500 }
        );
    }
}