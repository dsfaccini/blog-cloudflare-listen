'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { type RandomArticle } from '@/app/api/articles/random/route';

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
                const data = await response.json() as { articles: RandomArticle[] };
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
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    Recent Articles
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i} className="p-6 bg-white/10 backdrop-blur-sm border-white/20 animate-pulse">
                            <div className="h-4 bg-white/20 rounded mb-4"></div>
                            <div className="h-3 bg-white/10 rounded mb-2"></div>
                            <div className="h-3 bg-white/10 rounded w-3/4 mb-4"></div>
                            <div className="h-3 bg-white/10 rounded w-1/2"></div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    Recent Articles
                </h2>
                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 text-center">
                    <p className="text-white/80">{error}</p>
                </Card>
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    Recent Articles
                </h2>
                <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 text-center">
                    <p className="text-white/80">No articles available yet</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Recent Articles
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`}>
                        <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-colors cursor-pointer h-full">
                            <h3 className="font-semibold text-white mb-2 line-clamp-2">
                                {article.title}
                            </h3>
                            {article.description && (
                                <p className="text-white/70 text-sm mb-4 line-clamp-3">
                                    {article.description}
                                </p>
                            )}
                            <div className="mt-auto">
                                <p className="text-white/60 text-xs">
                                    {article.date}
                                </p>
                                {article.authors.length > 0 && (
                                    <p className="text-white/60 text-xs mt-1">
                                        by {article.authors.map(a => a.name).join(', ')}
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