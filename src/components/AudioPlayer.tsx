'use client';

import { Loader2, Pause, Play, RefreshCw, Volume2 } from 'lucide-react';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
    slug: string;
    title: string;
}

interface AudioChunkInfo {
    isComplete: boolean;
    totalChunks: number;
    availableChunks: number;
    missingChunks: string[];
}

export default function AudioPlayer({ slug, title }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isLoadingAudio, setIsLoadingAudio] = useState(true);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [audioReady, setAudioReady] = useState(false);
    const [chunkInfo, setChunkInfo] = useState<AudioChunkInfo | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const togglePlayPause = async () => {
        if (!audioRef.current || !audioReady) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            try {
                await audioRef.current.play();
            } catch (error) {
                console.error('Error playing audio:', error);
                setAudioError('Failed to play audio');
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleError = () => {
        setIsLoadingAudio(false);
        setAudioReady(false);
        setAudioError('Failed to load audio');
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Load audio with progressive loading support
    const loadAudio = useCallback(
        async (isRetry = false) => {
            if (!audioRef.current) return;

            try {
                if (!isRetry) {
                    setIsLoadingAudio(true);
                    setAudioError(null);
                    setChunkInfo(null);
                } else {
                    setIsRetrying(true);
                }

                // Fetch audio with headers to get chunk information
                const response = await fetch(`/api/audio/${slug}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Extract chunk information from headers
                const audioStatus = response.headers.get('X-Audio-Status');
                const totalChunks = parseInt(response.headers.get('X-Total-Chunks') || '0');
                const availableChunks = parseInt(response.headers.get('X-Available-Chunks') || '0');
                const missingChunksHeader = response.headers.get('X-Missing-Chunks');
                const missingChunks =
                    missingChunksHeader && missingChunksHeader !== 'none'
                        ? missingChunksHeader.split(',')
                        : [];

                const newChunkInfo: AudioChunkInfo = {
                    isComplete: audioStatus === 'complete',
                    totalChunks,
                    availableChunks,
                    missingChunks,
                };

                setChunkInfo(newChunkInfo);

                // Create blob URL for the audio
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                // Set the audio source
                audioRef.current.src = audioUrl;
                audioRef.current.load();

                console.log(
                    `Audio loaded: ${availableChunks}/${totalChunks} chunks, status: ${audioStatus}`,
                );

                // If audio is partial, schedule retry for missing chunks
                if (!newChunkInfo.isComplete && missingChunks.length > 0) {
                    // Schedule retry inline to avoid dependency issues
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }

                    const delays = [30000, 60000, 120000, 300000]; // 30s, 1min, 2min, 5min
                    const delay = retryCount < delays.length ? delays[retryCount] : 300000;

                    console.log(`Scheduling retry ${retryCount + 1} in ${delay}ms`);

                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount((prev) => prev + 1);
                        loadAudio(true);
                    }, delay);
                }
            } catch (error) {
                console.error('Error loading audio:', error);
                setAudioError(
                    `Failed to load audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
                setIsLoadingAudio(false);
                setAudioReady(false);
            } finally {
                setIsRetrying(false);
            }
        },
        [slug, retryCount],
    );

    // Manual retry function
    const manualRetry = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }
        setRetryCount(0);
        loadAudio(true);
    }, [loadAudio]);

    // Load audio on component mount
    useEffect(() => {
        loadAudio();

        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [loadAudio]);

    // Update audio ready state when metadata loads
    useEffect(() => {
        const handleLoadedMetadata = () => {
            if (audioRef.current) {
                setDuration(audioRef.current.duration);
                setIsLoadingAudio(false);
                setAudioReady(true);

                // Reset retry count on successful load
                if (chunkInfo?.isComplete) {
                    setRetryCount(0);
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }
                }
            }
        };

        const audioElement = audioRef.current;
        if (audioElement) {
            audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            return () => {
                audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [chunkInfo]);

    const showLoader = isLoadingAudio && !chunkInfo;
    const showPartialLoader = isRetrying && chunkInfo && !chunkInfo.isComplete;

    const getStatusMessage = () => {
        if (audioError) return 'Audio unavailable';
        if (showLoader) return 'Generating audio...';
        if (showPartialLoader)
            return `Loading missing parts... (${chunkInfo?.availableChunks}/${chunkInfo?.totalChunks})`;
        if (chunkInfo && !chunkInfo.isComplete) {
            return `Partial audio ready (${chunkInfo.availableChunks}/${chunkInfo.totalChunks} parts) - missing parts loading in background`;
        }
        if (chunkInfo?.isComplete) return 'Ready to play';
        return 'Ready to play';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <Button
                    onClick={togglePlayPause}
                    disabled={showLoader || audioError !== null}
                    size="lg"
                    className="h-12 w-12 rounded-full"
                >
                    {showLoader ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="h-6 w-6" />
                    ) : (
                        <Play className="ml-0.5 h-6 w-6" />
                    )}
                </Button>

                {chunkInfo && !chunkInfo.isComplete && !showLoader && (
                    <Button
                        onClick={manualRetry}
                        disabled={isRetrying}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-full p-0"
                        title="Retry loading missing parts"
                    >
                        {isRetrying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                )}

                <div className="flex-1">
                    <h3 className="truncate text-sm font-semibold" title={title}>
                        {title}
                    </h3>
                    <p className="text-muted-foreground text-xs">{getStatusMessage()}</p>
                    {chunkInfo && !chunkInfo.isComplete && (
                        <div className="mt-1 flex items-center gap-1">
                            <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                                <div
                                    className="bg-primary h-full transition-all duration-300"
                                    style={{
                                        width: `${(chunkInfo.availableChunks / chunkInfo.totalChunks) * 100}%`,
                                    }}
                                />
                            </div>
                            <span className="text-muted-foreground ml-1 text-xs">
                                {chunkInfo.availableChunks}/{chunkInfo.totalChunks}
                            </span>
                        </div>
                    )}
                    {audioError && <p className="mt-1 text-xs text-red-500">{audioError}</p>}
                </div>

                <div className="flex min-w-0 items-center space-x-2">
                    <Volume2 className="text-muted-foreground h-4 w-4" />
                    <Slider
                        value={[volume]}
                        onValueChange={handleVolumeChange}
                        max={1}
                        step={0.1}
                        className="w-16"
                    />
                </div>
            </div>

            {!showLoader && duration > 0 && (
                <div className="space-y-2">
                    <Slider
                        value={[currentTime]}
                        onValueChange={handleSeek}
                        max={duration}
                        step={1}
                        className="w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            )}

            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={() => setIsPlaying(false)}
                onError={handleError}
                preload="none"
            />
        </div>
    );
}
