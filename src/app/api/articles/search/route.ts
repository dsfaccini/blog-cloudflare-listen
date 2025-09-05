import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';
import { getArticleIndex } from '@/lib/index-manager';

export async function GET() {
    try {
        const { env } = await getCloudflareContext();

        if (!env.BLOG_STORAGE) {
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

        const index = await getArticleIndex(env);
        
        return NextResponse.json(index);
    } catch (error) {
        console.error('Error fetching article index:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}