'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { type RandomArticle } from '@/app/api/articles/random/route';
import { Card } from '@/components/ui/card';

export default function RandomArticles() {
    const [articles, setArticles] = useState<RandomArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchRandomArticles() {
            try {
                const response = await fetch('/api/articles/random');
                if (!response.ok) {
                    throw new Error('Failed to fetch articles');
                }
                const data = (await response.json()) as { articles: RandomArticle[] };
                setArticles(data.articles || []);
            } catch (error) {
                console.error('Error fetching random articles:', error);
                setError('Failed to load articles');
            } finally {
                setLoading(false);
            }
        }

        fetchRandomArticles();
    }, []);

    if (loading) {
        return (
            <div className="mt-12">
                <h2 className="mb-6 text-center text-2xl font-bold text-white">Recent Articles</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(5)].map((_, i) => (
                        <Card
                            key={i}
                            className="animate-pulse border-white/20 bg-white/10 p-6 backdrop-blur-sm"
                        >
                            <div className="mb-4 h-4 rounded bg-white/20"></div>
                            <div className="mb-2 h-3 rounded bg-white/10"></div>
                            <div className="mb-4 h-3 w-3/4 rounded bg-white/10"></div>
                            <div className="h-3 w-1/2 rounded bg-white/10"></div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-12">
                <h2 className="mb-6 text-center text-2xl font-bold text-white">Recent Articles</h2>
                <Card className="border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm">
                    <p className="text-white/80">{error}</p>
                </Card>
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="mt-12">
                <h2 className="mb-6 text-center text-2xl font-bold text-white">Recent Articles</h2>
                <Card className="border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm">
                    <p className="text-white/80">No articles available yet</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="mt-12">
            <h2 className="mb-6 text-center text-2xl font-bold text-white">Recent Articles</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`}>
                        <Card className="h-full cursor-pointer border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-colors hover:bg-white/20">
                            <h3 className="mb-2 line-clamp-2 font-semibold text-white">
                                {article.title}
                            </h3>
                            {article.description && (
                                <p className="mb-4 line-clamp-3 text-sm text-white/70">
                                    {article.description}
                                </p>
                            )}
                            <div className="mt-auto">
                                <p className="text-xs text-white/60">{article.date}</p>
                                {article.authors.length > 0 && (
                                    <p className="mt-1 text-xs text-white/60">
                                        by {article.authors.map((a) => a.name).join(', ')}
                                    </p>
                                )}
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
