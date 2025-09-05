'use client';

import {
    ArrowLeft,
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    TestTube,
    Volume2,
} from 'lucide-react';

import { useState } from 'react';

import Link from 'next/link';

import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface LogEntry {
    timestamp: string;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    data?: unknown;
}

function extractSlugFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'blog.cloudflare.com') {
            return null;
        }
        const path = urlObj.pathname;
        return path.replace(/^\/*/g, '').replace(/\/*$/g, '');
    } catch {
        return null;
    }
}

export default function TestPage() {
    const [url, setUrl] = useState(
        'https://blog.cloudflare.com/cloudy-driven-email-security-summaries/',
    );
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [articleStatus, setArticleStatus] = useState<{
        audioReady: boolean;
        summaryReady: boolean;
        summaries?: string[] | null;
    } | null>(null);
    const [rawHtml, setRawHtml] = useState<string | null>(null);
    const [parsedArticle, setParsedArticle] = useState<{
        title?: string;
        description?: string;
        authors?: string[];
        contentLength?: number;
    } | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    const addLog = (level: LogEntry['level'], message: string, data?: unknown) => {
        const entry: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message,
            data,
        };
        setLogs((prev) => [...prev, entry]);
        console.log(`[${entry.level.toUpperCase()}]`, entry.message, data || '');
    };

    // No more polling - summaries are generated on-demand

    const fetchRawHtml = async () => {
        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid URL for HTML fetch');
            return;
        }

        try {
            addLog('info', `Fetching raw HTML for: ${slug}`);
            setIsProcessing(true);

            const response = await fetch(`/api/debug/fetch-html/${slug}`, {
                method: 'POST',
            });

            const result = (await response.json()) as {
                message: string;
                url: string;
                storedPath: string;
                htmlLength: number;
                preview: string;
                error?: string;
            };
            if (response.ok) {
                addLog('success', result.message, {
                    url: result.url,
                    storedPath: result.storedPath,
                    htmlLength: result.htmlLength,
                });
                setRawHtml(result.preview);
            } else {
                addLog('error', `HTML fetch failed: ${result.error}`, result);
            }
        } catch (error) {
            addLog('error', 'HTML fetch failed', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const viewRawHtml = async () => {
        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid URL');
            return;
        }

        try {
            const response = await fetch(`/api/debug/fetch-html/${slug}`);
            if (response.ok) {
                const html = await response.text();
                setRawHtml(html);
                addLog('success', `Loaded raw HTML (${html.length} characters)`);
            } else {
                addLog('error', `Failed to load raw HTML: ${response.status}`);
            }
        } catch (error) {
            addLog('error', 'Failed to view raw HTML', error);
        }
    };

    const parseArticle = async () => {
        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid URL for article parsing');
            return;
        }

        try {
            addLog('info', `Parsing article for: ${slug}`);
            setIsProcessing(true);

            const response = await fetch(`/api/debug/parse-article/${slug}`, {
                method: 'POST',
            });

            // CLAUTODO: needs a type
            const result = (await response.json()) as {
                message: string;
                storedPath: string;
                title: string;
                contentLength: number;
                error?: string;
                article: {
                    title: string;
                    contentLength: number;
                };
            };

            if (response.ok) {
                addLog('success', result.message, {
                    storedPath: result.storedPath,
                    title: result.article.title,
                    contentLength: result.article.contentLength,
                });
                setParsedArticle(result.article);
            } else {
                addLog('error', `Article parsing failed: ${result.error}`, result);
            }
        } catch (error) {
            addLog('error', 'Article parsing failed', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const testAudio = async () => {
        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid URL for audio test');
            return;
        }

        if (isGeneratingAudio) {
            addLog('warning', 'Audio test already in progress');
            return;
        }

        try {
            setIsGeneratingAudio(true);
            addLog('info', `Testing audio endpoint for: ${slug} (will generate if needed)`);

            const response = await fetch(`/api/audio/${slug}`);

            if (response.ok) {
                const audioBlob = await response.blob();
                addLog('success', `Audio endpoint successful - ${audioBlob.size} bytes`, {
                    audioSize: audioBlob.size,
                    contentType: response.headers.get('content-type'),
                });
                // Clean up the blob
                URL.revokeObjectURL(URL.createObjectURL(audioBlob));
            } else {
                const errorResult = await response.json() as { error?: string };
                addLog('error', `Audio endpoint failed: ${errorResult.error || 'Unknown error'}`, errorResult);
            }
        } catch (error) {
            addLog('error', 'Audio test request failed', error);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const testSummary = async () => {
        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid URL for summary test');
            return;
        }

        if (isGeneratingSummary) {
            addLog('warning', 'Summary test already in progress');
            return;
        }

        try {
            setIsGeneratingSummary(true);
            addLog('info', `Testing summary endpoint for: ${slug} (will generate if needed)`);

            const response = await fetch(`/api/summary/${slug}`);

            if (response.ok) {
                const data = await response.json() as { summaries: string[]; cached?: boolean };
                addLog('success', `Summary endpoint successful - ${data.summaries.length} summaries`, {
                    summaryCount: data.summaries.length,
                    cached: data.cached,
                });
                
                // Update article status for display
                setArticleStatus(prev => ({
                    ...prev,
                    audioReady: prev?.audioReady || false,
                    summaryReady: true,
                    summaries: data.summaries
                }));
            } else {
                const errorResult = await response.json() as { error?: string };
                addLog('error', `Summary endpoint failed: ${errorResult.error || 'Unknown error'}`, errorResult);
            }
        } catch (error) {
            addLog('error', 'Summary test request failed', error);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // Status check removed - no more centralized status endpoint

    const clearLogs = () => {
        setLogs([]);
        setArticleStatus(null);
    };

    const logLevelColors = {
        info: 'text-blue-600',
        success: 'text-green-600',
        warning: 'text-yellow-600',
        error: 'text-red-600',
    };

    const logLevelBadges = {
        info: 'default',
        success: 'default',
        warning: 'secondary',
        error: 'destructive',
    } as const;

    return (
        <div className="bg-background min-h-screen p-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <CloudflareAudioLogo size={32} />
                        <h1 className="text-2xl font-bold">Test Debug Page</h1>
                        <TestTube className="text-primary h-6 w-6" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* URL Input */}
                    <div className="lg:col-span-3">
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">URL Input</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Cloudflare Blog URL
                                    </label>
                                    <Textarea
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://blog.cloudflare.com/article-title/"
                                        className="min-h-[80px]"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button onClick={clearLogs} variant="ghost" size="sm">
                                        Clear Logs
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Column 1: Steps 1-2 */}
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                <Download className="h-5 w-5" />
                                Step 1: Fetch HTML
                            </h2>

                            <div className="space-y-3">
                                <Button
                                    onClick={fetchRawHtml}
                                    disabled={isProcessing}
                                    className="w-full"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    {isProcessing ? 'Fetching...' : 'Fetch & Store Raw HTML'}
                                </Button>

                                <Button onClick={viewRawHtml} variant="outline" className="w-full">
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Stored HTML
                                </Button>

                                <p className="text-muted-foreground text-xs">
                                    Fetches HTML from Cloudflare and stores to R2 at
                                    blogs/slug/raw.html
                                </p>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                <FileText className="h-5 w-5" />
                                Step 2: Parse Article
                            </h2>

                            <div className="space-y-3">
                                <Button
                                    onClick={parseArticle}
                                    disabled={isProcessing}
                                    className="w-full"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    {isProcessing ? 'Parsing...' : 'Parse & Store Article JSON'}
                                </Button>

                                <p className="text-muted-foreground text-xs">
                                    Parses raw HTML and stores structured data to
                                    blogs/slug/article.json
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Column 2: Steps 3-4 */}
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                <Volume2 className="h-5 w-5" />
                                Step 3: Test Audio
                            </h2>

                            <div className="space-y-3">
                                <Button
                                    onClick={testAudio}
                                    disabled={isGeneratingAudio}
                                    className="w-full"
                                >
                                    <Volume2 className="mr-2 h-4 w-4" />
                                    {isGeneratingAudio ? 'Testing Audio...' : 'Test Audio'}
                                </Button>

                                <p className="text-muted-foreground text-xs">
                                    Tests audio endpoint - generates MP3 on-demand if needed and stores to R2
                                </p>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                <BookOpen className="h-5 w-5" />
                                Step 4: Test Summary
                            </h2>

                            <div className="space-y-3">
                                <Button
                                    onClick={testSummary}
                                    disabled={isGeneratingSummary}
                                    className="w-full"
                                >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    {isGeneratingSummary
                                        ? 'Testing Summary...'
                                        : 'Test Summary'}
                                </Button>

                                <p className="text-muted-foreground text-xs">
                                    Tests summary endpoint - generates paragraph summaries on-demand if needed and stores to R2
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Column 3: Status & Data Preview */}
                    <div className="space-y-6">
                        {articleStatus && (
                            <Card className="p-6">
                                <h3 className="mb-4 text-lg font-semibold">Current Status</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span>Audio Generation:</span>
                                        <Badge
                                            variant={
                                                articleStatus.audioReady ? 'default' : 'secondary'
                                            }
                                        >
                                            {articleStatus.audioReady ? 'Ready' : 'Not Ready'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Summary Generation:</span>
                                        <Badge
                                            variant={
                                                articleStatus.summaryReady ? 'default' : 'secondary'
                                            }
                                        >
                                            {articleStatus.summaryReady
                                                ? `Ready (${articleStatus.summaries?.length || 0})`
                                                : 'Not Ready'}
                                        </Badge>
                                    </div>
                                </div>

                                {articleStatus.audioReady && articleStatus.summaryReady && (
                                    <div className="mt-4 border-t pt-4">
                                        <Button asChild className="w-full">
                                            <Link href={`/blog/${extractSlugFromUrl(url) || ''}`}>
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Processed Article
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Data Previews */}
                        {parsedArticle && (
                            <Card className="p-6">
                                <h3 className="mb-4 text-lg font-semibold">Parsed Article Data</h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <strong>Title:</strong>{' '}
                                        {(parsedArticle as { title?: string }).title}
                                    </div>
                                    <div>
                                        <strong>Description:</strong>{' '}
                                        {(parsedArticle as { description?: string }).description}
                                    </div>
                                    <div>
                                        <strong>Authors:</strong>{' '}
                                        {(parsedArticle as { authors?: string[] }).authors?.join(
                                            ', ',
                                        )}
                                    </div>
                                    <div>
                                        <strong>Content Length:</strong>{' '}
                                        {
                                            (parsedArticle as { contentLength?: number })
                                                .contentLength
                                        }{' '}
                                        chars
                                    </div>
                                </div>
                            </Card>
                        )}

                        {rawHtml && (
                            <Card className="p-6">
                                <h3 className="mb-4 text-lg font-semibold">Raw HTML Preview</h3>
                                <ScrollArea className="h-[200px]">
                                    <pre className="bg-muted overflow-x-auto rounded p-2 text-xs whitespace-pre-wrap">
                                        {rawHtml.length > 1000
                                            ? rawHtml.substring(0, 1000) + '...'
                                            : rawHtml}
                                    </pre>
                                </ScrollArea>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Logs - Outside grid, full width */}
                <Card className="mt-6 p-6">
                    <h2 className="mb-4 text-lg font-semibold">Debug Logs</h2>

                    <ScrollArea className="h-[600px] w-full">
                        <div className="space-y-2">
                            {logs.length === 0 ? (
                                <p className="text-muted-foreground py-8 text-center">
                                    No logs yet. Run a test to see debug output.
                                </p>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={logLevelBadges[log.level]}>
                                                {log.level.toUpperCase()}
                                            </Badge>
                                            <span className="text-muted-foreground text-xs">
                                                {log.timestamp}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${logLevelColors[log.level]}`}>
                                            {log.message}
                                        </p>
                                        {log.data ? (
                                            <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                                                {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                        ) : null}
                                        {index < logs.length - 1 && <Separator className="my-2" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </div>
    );
}
