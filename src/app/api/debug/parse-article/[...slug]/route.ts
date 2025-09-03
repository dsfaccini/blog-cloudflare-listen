import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { parseArticle } from '@/lib/article-parser';

export async function POST(
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

        // Get raw HTML from R2
        const basePath = `blogs/${slug}`;
        const htmlObj = await env.BLOG_STORAGE.get(`${basePath}/raw.html`);
        
        if (!htmlObj) {
            return NextResponse.json({ 
                error: 'Raw HTML not found. Fetch HTML first.',
                path: `${basePath}/raw.html`
            }, { status: 404 });
        }

        const html = await htmlObj.text();
        
        // Parse the article
        const article = parseArticle(html);

        if (!article || !article.title) {
            return NextResponse.json({ 
                error: 'Failed to parse article or article is invalid'
            }, { status: 400 });
        }

        // Store parsed article to R2
        await env.BLOG_STORAGE.put(`${basePath}/article.json`, JSON.stringify(article, null, 2), {
            httpMetadata: { contentType: 'application/json' },
        });

        return NextResponse.json({
            success: true,
            message: 'Article parsed and stored successfully',
            storedPath: `${basePath}/article.json`,
            article: {
                title: article.title,
                description: article.description,
                publishDate: article.publishDate,
                authors: article.authors,
                tags: article.tags,
                readingTime: article.readingTime,
                heroImage: article.heroImage,
                contentLength: article.content.length
            }
        });

    } catch (error) {
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, 
            { status: 500 }
        );
    }
}