'use client';

import { useState } from 'react';
import Link from 'next/link';
import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, TestTube, ExternalLink } from 'lucide-react';

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
    const [url, setUrl] = useState('https://blog.cloudflare.com/cloudy-driven-email-security-summaries/');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [articleStatus, setArticleStatus] = useState<{
        audioReady: boolean;
        summaryReady: boolean;
        summaries?: string[] | null;
    } | null>(null);

    const addLog = (level: LogEntry['level'], message: string, data?: unknown) => {
        const entry: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message,
            data,
        };
        setLogs(prev => [...prev, entry]);
        console.log(`[${entry.level.toUpperCase()}]`, entry.message, data || '');
    };

    const testArticleProcessing = async () => {
        if (!url.trim()) {
            addLog('error', 'Please enter a URL');
            return;
        }

        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid Cloudflare blog URL');
            return;
        }

        setIsProcessing(true);
        setLogs([]);
        setArticleStatus(null);

        try {
            addLog('info', `Starting test for slug: ${slug}`);
            addLog('info', `Original URL: ${url}`);

            // Check initial status
            addLog('info', 'Checking if article is already cached...');
            const statusResponse = await fetch(`/api/article-status/${slug}`);
            if (statusResponse.ok) {
                const status = await statusResponse.json() as {
                    audioReady: boolean;
                    summaryReady: boolean;
                    summaries?: string[] | null;
                };
                addLog('success', 'Article status checked', status);
                setArticleStatus(status);
                
                if (status.audioReady && status.summaryReady) {
                    addLog('success', 'Article is fully processed and cached');
                } else {
                    addLog('info', 'Article needs processing');
                }
            } else {
                addLog('warning', 'Could not check article status');
            }

            // Test fetching the article page (this will trigger processing)
            addLog('info', 'Fetching article page...');
            const articleResponse = await fetch(`/${slug}`);
            
            if (articleResponse.ok) {
                addLog('success', 'Article page fetched successfully');
                addLog('info', `Response status: ${articleResponse.status}`);
                addLog('info', `Content-Type: ${articleResponse.headers.get('content-type')}`);
            } else {
                addLog('error', `Article fetch failed: ${articleResponse.status} ${articleResponse.statusText}`);
            }

            // Start polling for status updates
            addLog('info', 'Starting background processing monitor...');
            let pollCount = 0;
            const maxPolls = 20; // 2 minutes at 6-second intervals
            
            const poll = async () => {
                pollCount++;
                addLog('info', `Checking processing status (${pollCount}/${maxPolls})...`);
                
                try {
                    const response = await fetch(`/api/article-status/${slug}`);
                    if (response.ok) {
                        const status = await response.json() as {
                            audioReady: boolean;
                            summaryReady: boolean;
                            summaries?: string[] | null;
                        };
                        setArticleStatus(status);
                        
                        if (status.audioReady && !articleStatus?.audioReady) {
                            addLog('success', 'Audio generation completed!');
                        }
                        
                        if (status.summaryReady && !articleStatus?.summaryReady) {
                            addLog('success', `Summary generation completed! (${status.summaries?.length || 0} summaries)`);
                        }
                        
                        if (status.audioReady && status.summaryReady) {
                            addLog('success', 'All processing completed!');
                            return true; // Stop polling
                        }
                    }
                } catch (error) {
                    addLog('warning', 'Status check failed', error);
                }
                
                return pollCount >= maxPolls; // Stop after max polls
            };
            
            const pollInterval = setInterval(async () => {
                const shouldStop = await poll();
                if (shouldStop) {
                    clearInterval(pollInterval);
                    if (pollCount >= maxPolls) {
                        addLog('warning', 'Stopped polling - reached maximum attempts');
                    }
                    setIsProcessing(false);
                }
            }, 6000);

        } catch (error) {
            addLog('error', 'Test failed with error', error);
            setIsProcessing(false);
        }
    };

    const testAudioEndpoint = async () => {
        const slug = extractSlugFromUrl(url.trim());
        if (!slug) {
            addLog('error', 'Invalid URL for audio test');
            return;
        }

        try {
            addLog('info', `Testing audio endpoint: /api/audio/${slug}`);
            const response = await fetch(`/api/audio/${slug}`, { method: 'HEAD' });
            
            if (response.ok) {
                addLog('success', 'Audio endpoint accessible');
                addLog('info', `Content-Length: ${response.headers.get('content-length')}`);
                addLog('info', `Content-Type: ${response.headers.get('content-type')}`);
            } else {
                addLog('error', `Audio endpoint failed: ${response.status}`);
            }
        } catch (error) {
            addLog('error', 'Audio endpoint test failed', error);
        }
    };

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
        <div className="min-h-screen bg-background p-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <CloudflareAudioLogo size={32} />
                        <h1 className="text-2xl font-bold">Test Debug Page</h1>
                        <TestTube className="w-6 h-6 text-primary" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Cloudflare Blog URL
                                    </label>
                                    <Textarea
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://blog.cloudflare.com/article-title/"
                                        className="min-h-[80px]"
                                    />
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={testArticleProcessing}
                                        disabled={isProcessing}
                                        className="w-full"
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        {isProcessing ? 'Processing...' : 'Test Article Processing'}
                                    </Button>
                                    
                                    <Button
                                        onClick={testAudioEndpoint}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Test Audio Endpoint
                                    </Button>
                                    
                                    <Button
                                        onClick={clearLogs}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        Clear Logs
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Status */}
                        {articleStatus && (
                            <Card className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Current Status</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span>Audio Generation:</span>
                                        <Badge variant={articleStatus.audioReady ? 'default' : 'secondary'}>
                                            {articleStatus.audioReady ? 'Ready' : 'Processing'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Summary Generation:</span>
                                        <Badge variant={articleStatus.summaryReady ? 'default' : 'secondary'}>
                                            {articleStatus.summaryReady ? 
                                                `Ready (${articleStatus.summaries?.length || 0})` : 
                                                'Processing'
                                            }
                                        </Badge>
                                    </div>
                                </div>
                                
                                {articleStatus.audioReady && articleStatus.summaryReady && (
                                    <div className="mt-4 pt-4 border-t">
                                        <Button asChild className="w-full">
                                            <Link href={`/${extractSlugFromUrl(url) || ''}`}>
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View Processed Article
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Logs */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Debug Logs</h2>
                        
                        <ScrollArea className="h-[600px] w-full">
                            <div className="space-y-2">
                                {logs.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No logs yet. Run a test to see debug output.
                                    </p>
                                ) : (
                                    logs.map((log, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={logLevelBadges[log.level]}>
                                                    {log.level.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {log.timestamp}
                                                </span>
                                            </div>
                                            <p className={`text-sm ${logLevelColors[log.level]}`}>
                                                {log.message}
                                            </p>
                                            {log.data ? (
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(log.data, null, 2)}
                                                </pre>
                                            ) : null}
                                            {index < logs.length - 1 && (
                                                <Separator className="my-2" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>
        </div>
    );
}