'use client';

import { Loader2, Pause, Play, RefreshCw, Volume2 } from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioData, type AudioData } from '@/hooks/useAudioData';

interface AudioPlayerProps {
    slug: string;
    title: string;
}

export default function AudioPlayer({ slug, title }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [audioReady, setAudioReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentAudioUrl = useRef<string | null>(null);

    // Use React Query for audio data fetching
    const { data: audioData, error: audioError, isLoading: isLoadingAudio, refetch } = useAudioData(slug);
    
    // Type assertion to help TypeScript
    const typedAudioData = audioData as AudioData | undefined;

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
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleError = () => {
        setAudioReady(false);
        console.error('Audio element error');
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

    // Set volume on audio element
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Update audio source when React Query data changes
    useEffect(() => {
        if (typedAudioData && typedAudioData.audioUrl && audioRef.current) {
            // Clean up previous URL to prevent memory leaks
            if (currentAudioUrl.current) {
                URL.revokeObjectURL(currentAudioUrl.current);
            }
            
            // Set new audio source
            audioRef.current.src = typedAudioData.audioUrl;
            currentAudioUrl.current = typedAudioData.audioUrl;
            audioRef.current.load();
        }
    }, [typedAudioData]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (currentAudioUrl.current) {
                URL.revokeObjectURL(currentAudioUrl.current);
            }
        };
    }, []);

    // Manual retry function using React Query's refetch
    const manualRetry = () => {
        refetch();
    };

    // Update audio ready state when metadata loads
    useEffect(() => {
        const handleLoadedMetadata = () => {
            if (audioRef.current) {
                setDuration(audioRef.current.duration);
                setAudioReady(true);
            }
        };

        const audioElement = audioRef.current;
        if (audioElement) {
            audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            return () => {
                audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [typedAudioData]);

    const showLoader = isLoadingAudio && !typedAudioData;
    const chunkInfo = typedAudioData?.chunkInfo;

    const getStatusMessage = () => {
        if (audioError) return `Audio unavailable: ${audioError.message}`;
        if (showLoader) return 'Generating audio...';
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
                    disabled={showLoader || audioError !== null || !audioReady}
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
                        disabled={isLoadingAudio}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-full p-0"
                        title="Retry loading missing parts"
                    >
                        {isLoadingAudio ? (
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
                    {audioError && <p className="mt-1 text-xs text-red-500">{audioError.message}</p>}
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