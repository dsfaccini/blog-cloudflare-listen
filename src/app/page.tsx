'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import ArticleSearch from '@/components/ArticleSearch';
import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import RandomArticles from '@/components/RandomArticles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function extractSlugFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'blog.cloudflare.com') {
            return null;
        }
        const path = urlObj.pathname;
        // Remove leading slash and trailing slash if present
        return path.replace(/^\/*/g, '').replace(/\/*$/g, '');
    } catch {
        return null;
    }
}

export default function HomePage() {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        const slug = extractSlugFromUrl(url.trim());

        if (!slug) {
            setError('Please enter a valid Cloudflare blog URL (blog.cloudflare.com)');
            return;
        }

        router.push(`/blog/${slug}`);
    };

    return (
        <div className="from-primary via-primary to-secondary min-h-screen bg-gradient-to-br p-4">
            <div className="flex items-center justify-center py-12">
                <div className="w-full max-w-2xl">
                    <div className="mb-12 text-center">
                        <div className="mb-8 flex justify-center">
                            <CloudflareAudioLogo size={200} />
                        </div>

                        <h1 className="mb-4 text-4xl font-bold text-white md:text-6xl">
                            Blog Cloudflare Listen
                        </h1>

                        <p className="mb-8 text-xl text-white/80">
                            Listen to Cloudflare blog articles with AI-generated audio and summaries
                        </p>
                    </div>

                    <Card className="border-white/20 bg-white/10 p-8 backdrop-blur-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="url" className="mb-2 block font-medium text-white">
                                    Enter Cloudflare Blog URL
                                </label>
                                <input
                                    id="url"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://blog.cloudflare.com/article-title/"
                                    className="focus-visible:ring-accent flex h-12 w-full rounded-md border border-white/30 bg-white/20 px-4 py-2 text-white placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
                            </div>

                            <Button
                                type="submit"
                                className="bg-accent hover:bg-accent/90 text-accent-foreground w-full py-3 font-semibold"
                                size="lg"
                            >
                                Listen to Article
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-white/60">
                                Example:
                                https://blog.cloudflare.com/cloudy-driven-email-security-summaries/
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="mx-auto max-w-6xl pb-12">
                <ArticleSearch />
                <RandomArticles />
            </div>
        </div>
    );
}
