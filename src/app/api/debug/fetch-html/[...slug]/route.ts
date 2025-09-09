import { getCloudflareContext } from '@opennextjs/cloudflare';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

        // Fetch the original HTML
        const url = `https://blog.cloudflare.com/${slug}/`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BlogCloudflareListenBot/1.0',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: `Failed to fetch article: ${response.status} ${response.statusText}`,
                    url,
                },
                { status: response.status },
            );
        }

        const html = await response.text();

        // Store raw HTML to R2
        const basePath = `blogs/${slug}`;
        await env.BLOG_STORAGE.put(`${basePath}/raw.html`, html, {
            httpMetadata: { contentType: 'text/html' },
        });

        return NextResponse.json({
            success: true,
            message: 'HTML fetched and stored successfully',
            url,
            storedPath: `${basePath}/raw.html`,
            htmlLength: html.length,
            preview: html.substring(0, 500) + '...',
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}

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

        // Get raw HTML from R2
        const basePath = `blogs/${slug}`;
        const htmlObj = await env.BLOG_STORAGE.get(`${basePath}/raw.html`);

        if (!htmlObj) {
            return NextResponse.json(
                {
                    error: 'Raw HTML not found in storage',
                    path: `${basePath}/raw.html`,
                },
                { status: 404 },
            );
        }

        const html = await htmlObj.text();

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
