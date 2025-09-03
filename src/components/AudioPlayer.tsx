'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
    slug: string;
    title: string;
}

export default function AudioPlayer({ slug, title }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isLoadingAudio, setIsLoadingAudio] = useState(true);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [audioReady, setAudioReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

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

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setIsLoadingAudio(false);
            setAudioReady(true);
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

    // Preload audio on component mount
    useEffect(() => {
        const preloadAudio = async () => {
            if (!audioRef.current) return;

            try {
                setIsLoadingAudio(true);
                setAudioError(null);
                
                // Preload the audio - it will be generated if it doesn't exist
                audioRef.current.src = `/api/audio/${slug}`;
                audioRef.current.load();
            } catch (error) {
                console.error('Error preloading audio:', error);
                setAudioError('Failed to load audio');
                setIsLoadingAudio(false);
                setAudioReady(false);
            }
        };

        preloadAudio();
    }, [slug]);

    const showLoader = isLoadingAudio;

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <Button
                    onClick={togglePlayPause}
                    disabled={showLoader || audioError !== null}
                    size="lg"
                    className="w-12 h-12 rounded-full"
                >
                    {showLoader ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-6 h-6" />
                    ) : (
                        <Play className="w-6 h-6 ml-0.5" />
                    )}
                </Button>
                
                <div className="flex-1">
                    <h3 className="font-semibold text-sm truncate" title={title}>
                        {title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {showLoader ? 'Generating audio...' : audioError ? 'Audio unavailable' : 'Ready to play'}
                    </p>
                    {audioError && (
                        <p className="text-xs text-red-500 mt-1">
                            {audioError}
                        </p>
                    )}
                </div>
                
                <div className="flex items-center space-x-2 min-w-0">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
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
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            )}
            
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={() => setIsPlaying(false)}
                onError={handleError}
                preload="none"
            />
        </div>
    );
}