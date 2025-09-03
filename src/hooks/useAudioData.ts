'use client';

import { useQuery } from '@tanstack/react-query';

export interface AudioChunkInfo {
    isComplete: boolean;
    totalChunks: number;
    availableChunks: number;
    missingChunks: string[];
}

export interface AudioData {
    audioUrl: string;
    chunkInfo: AudioChunkInfo;
    contentLength: number;
}

/**
 * Custom hook for fetching audio data with automatic retry and chunk monitoring
 */
export function useAudioData(slug: string) {
    return useQuery<AudioData, Error>({
        queryKey: ['audio', slug],
        queryFn: async (): Promise<AudioData> => {
            const response = await fetch(`/api/audio/${slug}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Parse headers for chunk information
            const audioStatus = response.headers.get('X-Audio-Status');
            const totalChunks = parseInt(response.headers.get('X-Total-Chunks') || '0');
            const availableChunks = parseInt(response.headers.get('X-Available-Chunks') || '0');
            const missingChunksHeader = response.headers.get('X-Missing-Chunks');
            const contentLength = parseInt(response.headers.get('Content-Length') || '0');
            
            const missingChunks = missingChunksHeader && missingChunksHeader !== 'none'
                ? missingChunksHeader.split(',')
                : [];

            const chunkInfo: AudioChunkInfo = {
                isComplete: audioStatus === 'complete',
                totalChunks,
                availableChunks,
                missingChunks,
            };

            // Create blob URL for the audio
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            console.log(
                `Audio loaded via React Query: ${availableChunks}/${totalChunks} chunks, status: ${audioStatus}`,
            );

            return {
                audioUrl,
                chunkInfo,
                contentLength,
            };
        },
        retry: 4,
        retryDelay: (attemptIndex) => {
            // 30s, 1min, 2min, 5min delays to prevent rate limiting
            const delays = [30000, 60000, 120000, 300000];
            return delays[attemptIndex] || 300000;
        },
        refetchInterval: (query) => {
            // Only refetch if chunks are missing
            const data = query.state.data;
            if (!data || data.chunkInfo.isComplete) return false;
            return 30000; // Check every 30s for missing chunks
        },
        staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnReconnect: true, // Refetch when connection is restored
    });
}