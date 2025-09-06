'use client';

import { ArrowLeft, Download, Headphones, Loader2, RefreshCw, Volume2 } from 'lucide-react';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Article {
    slug: string;
    title: string;
    date: string;
    description?: string;
}

interface ArticleTextData {
    slug: string;
    title: string;
    originalText: string;
    modifiedText: string;
    originalLength: number;
    modifiedLength: number;
    blockCount: number;
    headingCount: number;
}

export default function TTSTestPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<string>('');
    const [articleData, setArticleData] = useState<ArticleTextData | null>(null);
    const [isLoadingArticles, setIsLoadingArticles] = useState(true);
    const [isLoadingArticleText, setIsLoadingArticleText] = useState(false);
    const [originalText, setOriginalText] = useState('');
    const [modifiedText, setModifiedText] = useState('');
    const [isGeneratingOriginal, setIsGeneratingOriginal] = useState(false);
    const [isGeneratingModified, setIsGeneratingModified] = useState(false);
    const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
    const [modifiedAudioUrl, setModifiedAudioUrl] = useState<string | null>(null);
    const [originalGenerationTime, setOriginalGenerationTime] = useState<number | null>(null);
    const [modifiedGenerationTime, setModifiedGenerationTime] = useState<number | null>(null);

    // Block access in production
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
            window.location.href = '/';
        }
    }, []);

    // Load articles on component mount
    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await fetch('/api/articles/search');
                if (response.ok) {
                    const data = (await response.json()) as { articles: Article[] };
                    setArticles(data.articles || []);
                } else {
                    console.error('Failed to load articles');
                }
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setIsLoadingArticles(false);
            }
        };

        fetchArticles();
    }, []);

    // Load article text when selection changes
    const handleArticleSelect = async (slug: string) => {
        if (!slug) return;

        setSelectedArticle(slug);
        setIsLoadingArticleText(true);

        // Clear previous data
        setArticleData(null);
        setOriginalText('');
        setModifiedText('');
        setOriginalAudioUrl(null);
        setModifiedAudioUrl(null);
        setOriginalGenerationTime(null);
        setModifiedGenerationTime(null);

        try {
            const response = await fetch(`/api/tts-test/article/${slug}`);
            if (response.ok) {
                const data: ArticleTextData = await response.json();
                setArticleData(data);
                setOriginalText(data.originalText);
                setModifiedText(data.modifiedText);
            } else {
                const error = (await response.json()) as { error: string };
                console.error('Failed to load article text:', error);
                alert(`Failed to load article: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error fetching article text:', error);
            alert('Error loading article text');
        } finally {
            setIsLoadingArticleText(false);
        }
    };

    const resetToOriginal = () => {
        if (articleData) {
            setOriginalText(articleData.originalText);
            setModifiedText(articleData.modifiedText);
        }
    };

    const generateAudio = async (text: string, isOriginal: boolean) => {
        const setIsGenerating = isOriginal ? setIsGeneratingOriginal : setIsGeneratingModified;
        const setAudioUrl = isOriginal ? setOriginalAudioUrl : setModifiedAudioUrl;
        const setGenerationTime = isOriginal
            ? setOriginalGenerationTime
            : setModifiedGenerationTime;

        setIsGenerating(true);
        setAudioUrl(null);
        const startTime = Date.now();

        try {
            const response = await fetch('/api/tts-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const error = (await response.json()) as { error: string };
                throw new Error(error.error || 'Failed to generate audio');
            }

            // Create blob URL for audio playback
            const audioBlob = await response.blob();
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);

            const endTime = Date.now();
            setGenerationTime(Math.round((endTime - startTime) / 1000));
        } catch (error) {
            console.error('Audio generation failed:', error);
            alert(error instanceof Error ? error.message : 'Audio generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadAudio = (audioUrl: string, prefix: string) => {
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `tts-test-${prefix}-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="bg-background min-h-screen p-4">
            <div className="container mx-auto max-w-6xl">
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
                        <h1 className="text-2xl font-bold">TTS Model Test</h1>
                        <Volume2 className="text-primary h-6 w-6" />
                    </div>
                </div>

                {/* Article Selection Section */}
                <Card className="mb-6 p-6">
                    <h2 className="mb-4 text-lg font-semibold">Select Article</h2>

                    <div className="space-y-4">
                        <div>
                            <Select
                                value={selectedArticle}
                                onValueChange={handleArticleSelect}
                                disabled={isLoadingArticles}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={
                                            isLoadingArticles
                                                ? 'Loading articles...'
                                                : 'Choose an article to test TTS'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {articles.map((article) => (
                                        <SelectItem key={article.slug} value={article.slug}>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">{article.title}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {article.date} • {article.slug}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isLoadingArticleText && (
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading article text...
                            </div>
                        )}

                        {articleData && (
                            <div className="space-y-2">
                                <h3 className="font-medium">{articleData.title}</h3>
                                <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                                    <Badge variant="outline">{articleData.blockCount} blocks</Badge>
                                    <Badge variant="outline">
                                        {articleData.headingCount} headings
                                    </Badge>
                                    <Badge variant="outline">
                                        Original: {articleData.originalLength} chars
                                    </Badge>
                                    <Badge variant="outline">
                                        Modified: {articleData.modifiedLength} chars
                                    </Badge>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={resetToOriginal} variant="ghost" size="sm">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Reset to Original
                                    </Button>
                                </div>
                            </div>
                        )}

                        {!selectedArticle && !isLoadingArticles && (
                            <p className="text-muted-foreground text-sm">
                                Select an article from the dropdown to load real content with proper
                                heading detection. The text will be automatically prepared with and
                                without hyphen pause markers for comparison.
                            </p>
                        )}
                    </div>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left Column - Original Audio */}
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Original Version</h2>

                        <div className="mb-4">
                            <div className="bg-muted max-h-[200px] overflow-y-auto rounded p-3 text-sm">
                                {originalText ? (
                                    <pre className="font-mono whitespace-pre-wrap">
                                        {originalText}
                                    </pre>
                                ) : (
                                    <p className="text-muted-foreground italic">
                                        No article selected. Choose an article from the dropdown
                                        above.
                                    </p>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {originalText.length} characters • Raw text without modifications
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => generateAudio(originalText, true)}
                                    disabled={isGeneratingOriginal || !originalText.trim()}
                                    className="flex-1"
                                >
                                    <Headphones className="mr-2 h-4 w-4" />
                                    {isGeneratingOriginal
                                        ? 'Generating...'
                                        : 'Generate Original Audio'}
                                </Button>

                                {originalGenerationTime && (
                                    <Badge variant="outline">{originalGenerationTime}s</Badge>
                                )}
                            </div>

                            {isGeneratingOriginal && (
                                <div className="space-y-2">
                                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                                        <div className="bg-primary h-full animate-pulse rounded-full"></div>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        Generating original audio...
                                    </p>
                                </div>
                            )}

                            {originalAudioUrl && (
                                <div className="space-y-2">
                                    <audio controls className="w-full" src={originalAudioUrl}>
                                        Your browser does not support the audio element.
                                    </audio>
                                    <Button
                                        onClick={() => downloadAudio(originalAudioUrl, 'original')}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Original MP3
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Right Column - Modified Audio */}
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">
                            Modified Version
                            {articleData && (
                                <Badge variant="secondary" className="ml-2">
                                    With Hyphen Pauses
                                </Badge>
                            )}
                        </h2>

                        <div className="mb-4">
                            <div className="bg-muted max-h-[200px] overflow-y-auto rounded p-3 text-sm">
                                {modifiedText ? (
                                    <pre className="font-mono whitespace-pre-wrap">
                                        {modifiedText}
                                    </pre>
                                ) : (
                                    <p className="text-muted-foreground italic">
                                        No article selected. Choose an article from the dropdown
                                        above.
                                    </p>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {modifiedText.length} characters •{' '}
                                {articleData
                                    ? 'Modified with hyphen pause markers'
                                    : 'No article loaded'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => generateAudio(modifiedText, false)}
                                    disabled={isGeneratingModified || !modifiedText.trim()}
                                    className="flex-1"
                                >
                                    <Headphones className="mr-2 h-4 w-4" />
                                    {isGeneratingModified
                                        ? 'Generating...'
                                        : 'Generate Modified Audio'}
                                </Button>

                                {modifiedGenerationTime && (
                                    <Badge variant="outline">{modifiedGenerationTime}s</Badge>
                                )}
                            </div>

                            {isGeneratingModified && (
                                <div className="space-y-2">
                                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                                        <div className="bg-primary h-full animate-pulse rounded-full"></div>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        Generating modified audio...
                                    </p>
                                </div>
                            )}

                            {modifiedAudioUrl && (
                                <div className="space-y-2">
                                    <audio controls className="w-full" src={modifiedAudioUrl}>
                                        Your browser does not support the audio element.
                                    </audio>
                                    <Button
                                        onClick={() => downloadAudio(modifiedAudioUrl, 'modified')}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Modified MP3
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Tips Section */}
                <Card className="mt-6 p-6">
                    <h3 className="mb-3 text-lg font-semibold">Testing Guide</h3>
                    <div className="text-muted-foreground space-y-2 text-sm">
                        <p>
                            • <strong>Select Article:</strong> Choose from real articles stored in
                            R2 for realistic testing
                        </p>
                        <p>
                            • <strong>Original vs Modified:</strong> Compare audio with and without
                            hyphen pause markers
                        </p>
                        <p>
                            • <strong>Hyphen Pauses:</strong> Modified version adds &quot; — &quot;
                            after headings, before lists, and after list items to improve pacing
                        </p>
                        <p>
                            • <strong>Real Content:</strong> Test with actual blog articles to see
                            how TTS handles different content types
                        </p>
                        <p>
                            • <strong>Direct Streaming:</strong> Audio generates directly without R2
                            storage for fast testing
                        </p>
                        <p>
                            • <strong>Statistics:</strong> View article stats (blocks, headings,
                            character counts) to understand content structure
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
