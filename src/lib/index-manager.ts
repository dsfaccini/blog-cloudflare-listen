import { type RandomArticle } from '@/app/api/articles/random/route';

export interface ArticleIndex {
    articles: RandomArticle[];
    lastUpdated: string;
    version: number;
}

export interface ArticleData {
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

/**
 * Updates the article index in R2 by adding or updating an article entry
 */
export async function updateArticleIndex(env: { BLOG_STORAGE: R2Bucket }, articleData: ArticleData): Promise<void> {
    try {
        // Fetch current index from R2 or create new one
        const indexObj = await env.BLOG_STORAGE.get('blogs/index.json');
        const index: ArticleIndex = indexObj 
            ? JSON.parse(await indexObj.text()) 
            : { articles: [], version: 1, lastUpdated: new Date().toISOString() };
        
        // Add/update article entry
        const existingIndex = index.articles.findIndex(a => a.slug === articleData.slug);
        if (existingIndex >= 0) {
            index.articles[existingIndex] = articleData;
        } else {
            index.articles.push(articleData);
        }
        
        // Sort articles alphabetically by title
        index.articles.sort((a, b) => a.title.localeCompare(b.title));
        
        // Update metadata
        index.lastUpdated = new Date().toISOString();
        
        // Save back to R2
        await env.BLOG_STORAGE.put('blogs/index.json', JSON.stringify(index, null, 2));
        
        console.log(`Updated article index with: ${articleData.slug}`);
    } catch (error) {
        console.error('Error updating article index:', error);
        throw error;
    }
}

/**
 * Initializes the article index by scanning all existing articles in R2
 */
export async function initializeIndex(env: { BLOG_STORAGE: R2Bucket }): Promise<ArticleIndex> {
    console.log('Initializing article index from existing articles...');
    
    try {
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
        console.log(`Found ${allSlugs.length} existing articles to index`);

        if (allSlugs.length === 0) {
            const emptyIndex: ArticleIndex = {
                articles: [],
                lastUpdated: new Date().toISOString(),
                version: 1
            };
            await env.BLOG_STORAGE.put('blogs/index.json', JSON.stringify(emptyIndex, null, 2));
            return emptyIndex;
        }

        // Fetch article.json for each article
        const articles: RandomArticle[] = [];
        
        for (const slug of allSlugs) {
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
                console.error(`Error loading article ${slug} for indexing:`, error);
                // Continue with other articles
            }
        }

        // Sort articles alphabetically by title
        articles.sort((a, b) => a.title.localeCompare(b.title));

        // Create and save the index
        const index: ArticleIndex = {
            articles,
            lastUpdated: new Date().toISOString(),
            version: 1
        };

        await env.BLOG_STORAGE.put('blogs/index.json', JSON.stringify(index, null, 2));
        
        console.log(`Initialized article index with ${articles.length} articles`);
        return index;
        
    } catch (error) {
        console.error('Error initializing article index:', error);
        throw error;
    }
}

/**
 * Gets the article index from R2, initializing if it doesn't exist
 */
export async function getArticleIndex(env: { BLOG_STORAGE: R2Bucket }): Promise<ArticleIndex> {
    try {
        const indexObj = await env.BLOG_STORAGE.get('blogs/index.json');
        
        if (!indexObj) {
            // Index doesn't exist, initialize it
            return await initializeIndex(env);
        }
        
        return JSON.parse(await indexObj.text());
    } catch (error) {
        console.error('Error getting article index:', error);
        throw error;
    }
}