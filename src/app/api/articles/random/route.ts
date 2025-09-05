import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

export interface RandomArticle {
    slug: string;
    title: string;
    date: string;
    description?: string;
    authors: Array<{
        name: string;
        href: string;
        avatarSrc: string;
    }>;
}

export async function GET() {
    try {
        const { env } = await getCloudflareContext();

        if (!env.BLOG_STORAGE) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

        // List all articles in the blogs folder
        const listResult = await env.BLOG_STORAGE.list({ prefix: 'blogs/' });
        
        // Extract unique slugs from the keys
        const slugs = new Set<string>();
        for (const object of listResult.objects) {
            const match = object.key.match(/^blogs\/([^/]+)\//);
            if (match) {
                slugs.add(match[1]);
            }
        }

        const allSlugs = Array.from(slugs);
        
        if (allSlugs.length === 0) {
            return NextResponse.json({ articles: [] });
        }

        // Randomly select up to 5 articles
        const selectedSlugs = allSlugs
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);

        // Fetch article.json for each selected article
        const articles: RandomArticle[] = [];
        
        for (const slug of selectedSlugs) {
            try {
                const articleObj = await env.BLOG_STORAGE.get(`blogs/${slug}/article.json`);
                if (articleObj) {
                    const articleData = JSON.parse(await articleObj.text());
                    articles.push({
                        slug,
                        title: articleData.title || 'Untitled',
                        date: articleData.date || 'Unknown date',
                        description: articleData.description,
                        authors: articleData.authors || []
                    });
                }
            } catch (error) {
                console.error(`Error loading article ${slug}:`, error);
                // Continue with other articles
            }
        }

        return NextResponse.json({ articles });
    } catch (error) {
        console.error('Error fetching random articles:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}