'use client';

import { BookOpen, ExternalLink } from 'lucide-react';

import { useState } from 'react';

import Link from 'next/link';

import ArticleContent from '@/components/ArticleContent';
import AudioPlayer from '@/components/AudioPlayer';
import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import SummaryDrawer from '@/components/SummaryDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSummaryData } from '@/hooks/useSummaryData';
import type { ArticleContent as ArticleContentType } from '@/lib/article-parser';

interface ArticleDisplayProps {
    article: ArticleContentType;
    slug: string;
    initialSummary: string[] | null;
}

export default function ArticleDisplay({ article, slug, initialSummary }: ArticleDisplayProps) {
    const [showSummary, setShowSummary] = useState(false);

    // Use React Query for summary data fetching
    const {
        data: summaryData,
        isLoading: isSummaryLoading,
        error: summaryError,
    } = useSummaryData(slug);

    // Use React Query data or fallback to initial summary
    const summaries = summaryData?.summaries || initialSummary;

    const handleShowSummary = () => {
        setShowSummary(true);
    };

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
                    <h1
                        className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl"
                        style={{
                            fontFamily:
                                '-apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                            fontWeight: 700,
                            color: 'rgb(54, 57, 58)',
                        }}
                    >
                        {article.title}
                    </h1>

                    {article.description && (
                        <p
                            className="text-muted-foreground mb-6 text-xl"
                            style={{
                                fontFamily:
                                    '-apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                                fontWeight: 400,
                                color: 'rgb(54, 57, 58)',
                                fontSize: '20px',
                                lineHeight: '32px',
                            }}
                        >
                            {article.description}
                        </p>
                    )}

                    <div
                        className="text-muted-foreground mb-6 flex flex-wrap items-center gap-4 text-sm"
                        style={{
                            fontFamily:
                                '-apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                            fontWeight: 400,
                            color: 'rgb(54, 57, 58)',
                        }}
                    >
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
                                        <a
                                            href={`https://blog.cloudflare.com${author.href}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline"
                                            style={{ color: 'inherit' }}
                                        >
                                            {author.name}
                                        </a>
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
                            <AudioPlayer slug={slug} title={article.title} />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={handleShowSummary}
                                disabled={isSummaryLoading || summaryError !== null}
                                variant="outline"
                                className="sm:w-auto"
                            >
                                <BookOpen className="mr-2 h-4 w-4" />
                                {isSummaryLoading ? 'Generating Summary...' : 'Read Summary'}
                            </Button>
                            {summaryError && (
                                <p className="text-xs text-red-500">{summaryError.message}</p>
                            )}
                        </div>
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
