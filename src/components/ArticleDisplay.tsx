'use client';

import { BookOpen, ExternalLink } from 'lucide-react';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import ArticleContent from '@/components/ArticleContent';
import AudioPlayer from '@/components/AudioPlayer';
import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import SummaryDrawer from '@/components/SummaryDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ArticleContent as ArticleContentType } from '@/lib/article-parser';

interface ArticleDisplayProps {
    article: ArticleContentType;
    slug: string;
    initialAudioAvailable: boolean;
    initialSummary: string[] | null;
}

export default function ArticleDisplay({
    article,
    slug,
    initialAudioAvailable,
    initialSummary,
}: ArticleDisplayProps) {
    const [audioAvailable, setAudioAvailable] = useState(initialAudioAvailable);
    const [summaries, setSummaries] = useState<string[] | null>(initialSummary);
    const [isAudioLoading, setIsAudioLoading] = useState(!initialAudioAvailable);
    const [isSummaryLoading, setIsSummaryLoading] = useState(!initialSummary);
    const [showSummary, setShowSummary] = useState(false);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (audioAvailable && summaries) return; // Already have everything

        // For now, poll every 5 seconds to check if audio/summary is ready
        // TODO: Replace with WebSocket implementation
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/article-status/${slug}`);
                if (response.ok) {
                    const status = (await response.json()) as {
                        audioReady: boolean;
                        summaryReady: boolean;
                        summaries: string[] | null;
                    };

                    if (status.audioReady && !audioAvailable) {
                        setAudioAvailable(true);
                        setIsAudioLoading(false);
                    }

                    if (status.summaryReady && !summaries) {
                        setSummaries(status.summaries);
                        setIsSummaryLoading(false);
                    }

                    // Stop polling if we have everything
                    if (status.audioReady && status.summaryReady) {
                        clearInterval(pollInterval);
                    }
                }
            } catch (error) {
                console.error('Error checking article status:', error);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [slug, audioAvailable, summaries]);

    const originalUrl = `https://blog.cloudflare.com/${slug}/`;

    return (
        <div className="bg-background min-h-screen">
            {/* Header */}
            <header className="border-border bg-card border-b">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <Link href="/" className="flex items-center space-x-2">
                        <CloudflareAudioLogo size={32} />
                        <span className="text-lg font-semibold">Blog Cloudflare Listen</span>
                    </Link>

                    <Button variant="outline" size="sm" asChild>
                        <Link href={originalUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Original
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto max-w-4xl px-4 py-8">
                {/* Article Header */}
                <div className="mb-8">
                    {article.heroImage && (
                        <div className="mb-6">
                            <Image
                                src={article.heroImage.src}
                                alt={article.heroImage.alt || article.title}
                                className="w-full rounded-lg shadow-lg"
                            />
                        </div>
                    )}

                    <h1 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
                        {article.title}
                    </h1>

                    {article.description && (
                        <p className="text-muted-foreground mb-6 text-xl">{article.description}</p>
                    )}

                    <div className="text-muted-foreground mb-6 flex flex-wrap items-center gap-4 text-sm">
                        {article.publishDate && (
                            <time dateTime={article.publishDate}>
                                {new Date(article.publishDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </time>
                        )}

                        {article.authors && article.authors.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span>by</span>
                                {article.authors.map((author, index: number) => (
                                    <span key={author.name}>
                                        {author.name}
                                        {index < article.authors.length - 1 && ', '}
                                    </span>
                                ))}
                            </div>
                        )}

                        {article.readingTime && <span>{article.readingTime} min read</span>}
                    </div>

                    {article.tags && article.tags.length > 0 && (
                        <div className="mb-6 flex flex-wrap gap-2">
                            {article.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Audio and Summary Controls */}
                <Card className="mb-8 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex-1">
                            <AudioPlayer
                                slug={slug}
                                available={audioAvailable}
                                loading={isAudioLoading}
                                title={article.title}
                            />
                        </div>

                        <Button
                            onClick={() => setShowSummary(true)}
                            disabled={isSummaryLoading}
                            variant="outline"
                            className="sm:w-auto"
                        >
                            <BookOpen className="mr-2 h-4 w-4" />
                            {isSummaryLoading ? 'Generating Summary...' : 'Read Summary'}
                        </Button>
                    </div>
                </Card>

                {/* Article Content */}
                <ArticleContent content={article.content} />
            </main>

            {/* Summary Drawer */}
            <SummaryDrawer
                open={showSummary}
                onOpenChange={setShowSummary}
                summaries={summaries}
                loading={isSummaryLoading}
                articleTitle={article.title}
            />
        </div>
    );
}
