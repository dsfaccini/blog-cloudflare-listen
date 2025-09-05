'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { type RandomArticle } from '@/app/api/articles/random/route';
import { Card } from '@/components/ui/card';
import { type ArticleIndex } from '@/lib/index-manager';

interface SearchResults {
    startsWith: RandomArticle[];
    contains: RandomArticle[];
}

export default function ArticleSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<RandomArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResults>({
        startsWith: [],
        contains: [],
    });
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        async function fetchArticles() {
            try {
                const response = await fetch('/api/articles/search');
                if (!response.ok) {
                    throw new Error('Failed to fetch articles');
                }
                const data = (await response.json()) as ArticleIndex;
                setArticles(data.articles || []);
            } catch (error) {
                console.error('Error fetching articles:', error);
                setError('Failed to load articles for search');
            } finally {
                setLoading(false);
            }
        }

        fetchArticles();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            setSearchResults({ startsWith: [], contains: [] });
            setHasSearched(false);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const startsWith: RandomArticle[] = [];
        const contains: RandomArticle[] = [];

        for (const article of articles) {
            const title = article.title.toLowerCase();
            if (title.startsWith(query)) {
                startsWith.push(article);
            } else if (title.includes(query)) {
                contains.push(article);
            }
        }

        setSearchResults({ startsWith, contains });
        setHasSearched(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch(e as unknown as React.FormEvent);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto mt-8 w-full max-w-6xl">
                <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                    <div className="animate-pulse">
                        <div className="mb-4 h-4 rounded bg-white/20"></div>
                        <div className="h-12 rounded bg-white/20"></div>
                    </div>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto mt-8 w-full max-w-6xl">
                <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                    <p className="text-center text-white/80">{error}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto mt-8 w-full max-w-6xl">
            <Card className="mb-8 border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-center text-xl font-semibold text-white">
                    Search Articles
                </h2>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search articles by title... (Press Enter to search)"
                        className="focus-visible:ring-accent h-12 flex-1 rounded-md border border-white/30 bg-white/20 px-4 py-2 text-white placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    />
                </form>

                {articles.length > 0 && (
                    <p className="mt-2 text-center text-sm text-white/60">
                        {articles.length} article{articles.length !== 1 ? 's' : ''} available to
                        search
                    </p>
                )}
            </Card>

            {hasSearched && (
                <div className="space-y-8">
                    {searchResults.startsWith.length > 0 && (
                        <div>
                            <h3 className="mb-4 text-lg font-semibold text-white">
                                Starts with &quot;{searchQuery}&quot; (
                                {searchResults.startsWith.length})
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {searchResults.startsWith.map((article) => (
                                    <Link key={article.slug} href={`/blog/${article.slug}`}>
                                        <Card className="h-full cursor-pointer border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-colors hover:bg-white/20">
                                            <h4 className="mb-2 line-clamp-2 font-semibold text-white">
                                                {article.title}
                                            </h4>
                                            {article.description && (
                                                <p className="mb-4 line-clamp-3 text-sm text-white/70">
                                                    {article.description}
                                                </p>
                                            )}
                                            <div className="mt-auto">
                                                <p className="text-xs text-white/60">
                                                    {article.date}
                                                </p>
                                                {article.authors.length > 0 && (
                                                    <p className="mt-1 text-xs text-white/60">
                                                        by{' '}
                                                        {article.authors
                                                            .map((a) => a.name)
                                                            .join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.contains.length > 0 && (
                        <div>
                            <h3 className="mb-4 text-lg font-semibold text-white">
                                Contains &quot;{searchQuery}&quot; ({searchResults.contains.length})
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {searchResults.contains.map((article) => (
                                    <Link key={article.slug} href={`/blog/${article.slug}`}>
                                        <Card className="h-full cursor-pointer border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-colors hover:bg-white/20">
                                            <h4 className="mb-2 line-clamp-2 font-semibold text-white">
                                                {article.title}
                                            </h4>
                                            {article.description && (
                                                <p className="mb-4 line-clamp-3 text-sm text-white/70">
                                                    {article.description}
                                                </p>
                                            )}
                                            <div className="mt-auto">
                                                <p className="text-xs text-white/60">
                                                    {article.date}
                                                </p>
                                                {article.authors.length > 0 && (
                                                    <p className="mt-1 text-xs text-white/60">
                                                        by{' '}
                                                        {article.authors
                                                            .map((a) => a.name)
                                                            .join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.startsWith.length === 0 &&
                        searchResults.contains.length === 0 && (
                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <p className="text-center text-white/80">
                                    No articles found matching &quot;{searchQuery}&quot;
                                </p>
                            </Card>
                        )}
                </div>
            )}
        </div>
    );
}
