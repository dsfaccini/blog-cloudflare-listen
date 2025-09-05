'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-4">
            <div className="flex items-center justify-center py-12">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-12">
                        <div className="flex justify-center mb-8">
                            <CloudflareAudioLogo size={200} />
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                            Blog Cloudflare Listen
                        </h1>
                        
                        <p className="text-xl text-white/80 mb-8">
                            Listen to Cloudflare blog articles with AI-generated audio and summaries
                        </p>
                    </div>

                    <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="url" className="block text-white font-medium mb-2">
                                    Enter Cloudflare Blog URL
                                </label>
                                <input
                                    id="url"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://blog.cloudflare.com/article-title/"
                                    className="flex h-12 w-full rounded-md border border-white/30 bg-white/20 px-4 py-2 text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                {error && (
                                    <p className="text-red-300 text-sm mt-2">{error}</p>
                                )}
                            </div>
                            
                            <Button 
                                type="submit"
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3"
                                size="lg"
                            >
                                Listen to Article
                            </Button>
                        </form>
                        
                        <div className="mt-6 text-center">
                            <p className="text-white/60 text-sm">
                                Example: https://blog.cloudflare.com/cloudy-driven-email-security-summaries/
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
            
            <div className="max-w-6xl mx-auto pb-12">
                <RandomArticles />
            </div>
        </div>
    );
}
