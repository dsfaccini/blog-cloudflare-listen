import { getCloudflareContext } from '@opennextjs/cloudflare';

import { notFound } from 'next/navigation';

import ArticleDisplay from '@/components/ArticleDisplay';
import {
    extractParagraphsForSummary,
    extractTextForAudio,
    parseArticle,
    type ArticleContent,
} from '@/lib/article-parser';
import { generateAudio, generateParagraphSummaries } from '@/lib/workers-ai';

interface ArticlePageProps {
    params: Promise<{ slug: string[] }>;
}

async function fetchArticleFromCloudflare(slug: string): Promise<string> {
    const url = `https://blog.cloudflare.com/${slug}/`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BlogCloudflareListenBot/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } catch (error) {
        console.error('Error fetching article:', error);
        throw new Error(
            `Failed to fetch article: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
    }
}

async function getStoredData(slug: string) {
    const { env } = await getCloudflareContext();
    const bucket = env.BLOG_STORAGE;

    if (!bucket) {
        throw new Error('R2 bucket not configured');
    }

    const basePath = `blogs/${slug}`;

    try {
        const [articleObj, audioObj, summaryObj] = await Promise.allSettled([
            bucket.get(`${basePath}/article.json`),
            bucket.get(`${basePath}/audio.mp3`),
            bucket.get(`${basePath}/summary.json`),
        ]);

        const article =
            articleObj.status === 'fulfilled' && articleObj.value
                ? JSON.parse(await articleObj.value.text())
                : null;

        const hasAudio = audioObj.status === 'fulfilled' && audioObj.value !== null;
        const summary =
            summaryObj.status === 'fulfilled' && summaryObj.value
                ? JSON.parse(await summaryObj.value.text())
                : null;

        return { article, hasAudio, summary };
    } catch (error) {
        console.error('Error accessing R2 storage:', error);
        return { article: null, hasAudio: false, summary: null };
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

async function processArticleInBackground(slug: string, article: ArticleContent) {
    try {
        const textForAudio = extractTextForAudio(article);
        const paragraphsForSummary = extractParagraphsForSummary(article);

        // Generate audio and summaries in parallel
        const [audioBuffer, summaries] = await Promise.all([
            generateAudio(textForAudio).catch((error) => {
                console.error('Audio generation failed:', error);
                return null;
            }),
            generateParagraphSummaries(paragraphsForSummary).catch((error) => {
                console.error('Summary generation failed:', error);
                return null;
            }),
        ]);

        // Store the generated content
        await storeArticleData(slug, article, audioBuffer || undefined, summaries || undefined);
    } catch (error) {
        console.error('Background processing failed:', error);
    }
}

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
        const { hasAudio, summary } = storedData;

        // If no cached article, fetch and parse it
        if (!article) {
            console.log(`Fetching article: ${slug}`);
            const html = await fetchArticleFromCloudflare(slug);
            article = parseArticle(html);

            if (!article || !article.title) {
                console.error('Failed to parse article or article is invalid');
                notFound();
            }

            // Store the parsed article immediately and start background processing
            await storeArticleData(slug, article);
            processArticleInBackground(slug, article); // Fire and forget
        }

        return (
            <ArticleDisplay
                article={article}
                slug={slug}
                initialAudioAvailable={hasAudio}
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
