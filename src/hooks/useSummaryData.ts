'use client';

import { useQuery } from '@tanstack/react-query';

export interface SummaryData {
    summaries: string[];
    cached?: boolean;
}

/**
 * Custom hook for fetching summary data
 */
export function useSummaryData(slug: string) {
    return useQuery<SummaryData, Error>({
        queryKey: ['summary', slug],
        queryFn: async (): Promise<SummaryData> => {
            const response = await fetch(`/api/summary/${slug}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                throw new Error(errorData.error || `Failed to load summaries (${response.status})`);
            }
            
            const data = await response.json() as SummaryData;
            
            console.log(
                `Summary loaded via React Query: ${data.summaries.length} summaries, cached: ${data.cached || false}`,
            );
            
            return data;
        },
        retry: 3,
        retryDelay: (attemptIndex) => {
            // 10s, 30s, 60s delays for summary retries
            const delays = [10000, 30000, 60000];
            return delays[attemptIndex] || 60000;
        },
        staleTime: Infinity, // Summaries don't change once generated
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnReconnect: false, // Don't refetch on reconnect - summaries are static
    });
}