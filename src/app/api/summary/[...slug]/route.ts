import { getCloudflareContext } from '@opennextjs/cloudflare';

import { NextRequest, NextResponse } from 'next/server';

import { extractParagraphsForSummary } from '@/lib/article-parser';
import { generateParagraphSummaries } from '@/lib/workers-ai';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> },
) {
    try {
        const { env } = await getCloudflareContext();
        const resolvedParams = await params;
        const slug = resolvedParams.slug.join('/');

        if (!env.BLOG_STORAGE) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

        const basePath = `blogs/${slug}`;

        // First, check if summary already exists
        const summaryObject = await env.BLOG_STORAGE.get(`${basePath}/summary.json`);

        if (summaryObject) {
            console.log(`Serving cached summary for: ${slug}`);
            const summaryData = JSON.parse(await summaryObject.text()) as { summaries: string[] };

            return NextResponse.json({
                summaries: summaryData.summaries,
                cached: true,
            });
        }

        // Summary doesn't exist, check if we have the article to generate from
        if (!env.AI) {
            return NextResponse.json({ error: 'AI binding not configured' }, { status: 500 });
        }

        console.log(`Summary not found, generating for: ${slug}`);

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
        const paragraphsForSummary = extractParagraphsForSummary(article);

        if (!paragraphsForSummary || paragraphsForSummary.length === 0) {
            return NextResponse.json(
                {
                    error: 'No paragraphs found for summary generation',
                },
                { status: 400 },
            );
        }

        console.log(`Generating summaries for ${paragraphsForSummary.length} paragraphs...`);

        // Generate the summaries
        const summaries = await generateParagraphSummaries(paragraphsForSummary);

        console.log(`Summaries generated successfully: ${summaries.length} summaries`);

        // Store the summaries to R2 for future requests
        await env.BLOG_STORAGE.put(`${basePath}/summary.json`, JSON.stringify({ summaries }), {
            httpMetadata: { contentType: 'application/json' },
        });

        console.log(`Summaries saved to R2: ${basePath}/summary.json`);

        // Return the generated summaries directly
        return NextResponse.json({
            summaries,
            cached: false,
        });
    } catch (error) {
        console.error('Error serving/generating summary:', error);
        return NextResponse.json(
            {
                error: 'Summary generation failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
