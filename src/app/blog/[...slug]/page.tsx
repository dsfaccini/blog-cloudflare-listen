import { getCloudflareContext } from '@opennextjs/cloudflare';

import { notFound } from 'next/navigation';

import ArticleDisplay from '@/components/ArticleDisplay';
import { type ArticleContent, parseArticle } from '@/lib/article-parser';
import { updateArticleIndex } from '@/lib/index-manager';

interface ArticlePageProps {
    params: Promise<{ slug: string[] }>;
}

async function fetchArticleFromCloudflare(slug: string) {
    const url = `https://blog.cloudflare.com/${slug}/`;

    return await fetch(url, {
        headers: {
            'User-Agent': 'BlogCloudflareListenBot/1.0',
        },
    });
}

async function getStoredData(slug: string) {
    const { env } = await getCloudflareContext();
    const bucket = env.BLOG_STORAGE;

    if (!bucket) {
        throw new Error('R2 bucket not configured');
    }

    const basePath = `blogs/${slug}`;

    try {
        const [articleObj, summaryObj] = await Promise.allSettled([
            bucket.get(`${basePath}/article.json`),
            bucket.get(`${basePath}/summary.json`),
        ]);

        const article =
            articleObj.status === 'fulfilled' && articleObj.value
                ? JSON.parse(await articleObj.value.text())
                : null;

        const summary =
            summaryObj.status === 'fulfilled' && summaryObj.value
                ? JSON.parse(await summaryObj.value.text())
                : null;

        return { article, summary };
    } catch (error) {
        console.error('Error accessing R2 storage:', error);
        return { article: null, summary: null };
    }
}

async function storeArticleData(
    slug: string,
    article: ArticleContent,
    audioBuffer?: ArrayBuffer,
    summaries?: string[],
) {
    const { env } = await getCloudflareContext();
    const bucket = env.BLOG_STORAGE;

    if (!bucket) {
        throw new Error('R2 bucket not configured');
    }

    const basePath = `blogs/${slug}`;

    try {
        // Store article JSON
        await bucket.put(`${basePath}/article.json`, JSON.stringify(article), {
            httpMetadata: { contentType: 'application/json' },
        });

        // Store audio if provided
        if (audioBuffer) {
            await bucket.put(`${basePath}/audio.mp3`, audioBuffer, {
                httpMetadata: { contentType: 'audio/mpeg' },
            });
        }

        // Store summaries if provided
        if (summaries) {
            await bucket.put(`${basePath}/summary.json`, JSON.stringify({ summaries }), {
                httpMetadata: { contentType: 'application/json' },
            });
        }
    } catch (error) {
        console.error('Error storing data to R2:', error);
        throw new Error(
            `Failed to store data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

// Background processing has been moved to WebSocket endpoint
// This function is no longer used but kept for reference

export default async function ArticlePage({ params }: ArticlePageProps) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug.join('/');

    if (!slug) {
        notFound();
    }

    try {
        // First check if we have cached data
        const storedData = await getStoredData(slug);
        let { article } = storedData;
        const { summary } = storedData;

        // If no cached article, fetch and parse it
        if (!article) {
            console.log(`Fetching article: ${slug}`);
            const htmlResponse = await fetchArticleFromCloudflare(slug);
            if (htmlResponse.status === 404) {
                console.log(`Article not found for "${slug}"`);
                return notFound();
            }
            const html = await htmlResponse.text();

            // Store raw HTML first
            const basePath = `blogs/${slug}`;
            const { env } = await getCloudflareContext();
            const bucket = env.BLOG_STORAGE;
            if (bucket) {
                await bucket.put(`${basePath}/raw.html`, html, {
                    httpMetadata: { contentType: 'text/html' },
                });
            }

            article = parseArticle(html);

            if (!article || !article.title) {
                console.error('Failed to parse article or article is invalid');
                return notFound();
            }

            // Store only the parsed article
            await storeArticleData(slug, article);
            
            // Update the search index with the new article
            try {
                await updateArticleIndex(env, {
                    slug,
                    title: article.title,
                    date: article.date || new Date().toISOString(),
                    description: article.description,
                    authors: article.authors || []
                });
            } catch (indexError) {
                console.error('Error updating article index:', indexError);
                // Don't fail the entire request if index update fails
            }
            
            // Audio and summary are now generated on-demand when requested
        }

        return (
            <ArticleDisplay
                article={article}
                slug={slug}
                initialSummary={summary?.summaries || null}
            />
        );
    } catch (error) {
        console.error('Error loading article:', error);

        if (error instanceof Error && error.message.includes('404')) {
            notFound();
        }

        throw error; // Let Next.js handle other errors
    }
}

export async function generateMetadata({ params }: ArticlePageProps) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug.join('/');

    try {
        const { article } = await getStoredData(slug);

        if (article) {
            return {
                title: `${article.title} | Blog Cloudflare Listen`,
                description:
                    article.description || `Listen to "${article.title}" from the Cloudflare blog`,
                openGraph: {
                    title: article.title,
                    description: article.description,
                    images: article.heroImage ? [article.heroImage.src] : [],
                },
            };
        }
    } catch (error) {
        console.error('Error generating metadata:', error);
    }

    return {
        title: 'Article | Blog Cloudflare Listen',
        description: 'Listen to Cloudflare blog articles with AI-generated audio and summaries',
    };
}
