/**
 * Audio Chunk Manager
 *
 * Handles resilient audio generation with individual chunk storage and progressive loading.
 * Stores chunks individually in R2 and provides utilities for managing partial audio content.
 */

export interface AudioChunkMetadata {
    totalChunks: number;
    completedChunks: number[];
    chunkSizes: number[];
    lastUpdated: string;
    textChunks: string[]; // Store original text chunks for regeneration
}

export interface AudioChunkStatus {
    isComplete: boolean;
    availableChunks: number[];
    missingChunks: number[];
    totalChunks: number;
    availableAudio?: ArrayBuffer;
}

/**
 * Get the status of audio chunks for a given slug
 */
export async function getAudioChunkStatus(
    bucket: R2Bucket,
    slug: string,
): Promise<AudioChunkStatus> {
    const basePath = `blogs/${slug}`;

    try {
        // Check if complete audio already exists
        const completeAudio = await bucket.get(`${basePath}/audio.mp3`);
        if (completeAudio) {
            return {
                isComplete: true,
                availableChunks: [],
                missingChunks: [],
                totalChunks: 1,
                availableAudio: await completeAudio.arrayBuffer(),
            };
        }

        // Check for metadata
        const metadataObj = await bucket.get(`${basePath}/audio-metadata.json`);
        if (!metadataObj) {
            return {
                isComplete: false,
                availableChunks: [],
                missingChunks: [],
                totalChunks: 0,
            };
        }

        const metadata: AudioChunkMetadata = JSON.parse(await metadataObj.text());
        const missingChunks: number[] = [];
        const availableChunkBuffers: ArrayBuffer[] = [];

        // Check which chunks exist
        for (let i = 0; i < metadata.totalChunks; i++) {
            const chunkObj = await bucket.get(`${basePath}/audio-chunk-${i}.mp3`);
            if (chunkObj) {
                availableChunkBuffers[i] = await chunkObj.arrayBuffer();
            } else {
                missingChunks.push(i);
            }
        }

        const availableChunks = metadata.completedChunks.filter(
            (chunk) => !missingChunks.includes(chunk),
        );

        // Combine only contiguous chunks starting from index 0 to maintain order
        let availableAudio: ArrayBuffer | undefined;
        if (availableChunks.length > 0) {
            // Take only contiguous chunks from the beginning to avoid out-of-order playback
            const contiguousChunks: ArrayBuffer[] = [];
            for (let i = 0; i < availableChunkBuffers.length; i++) {
                if (availableChunkBuffers[i]) {
                    contiguousChunks.push(availableChunkBuffers[i]);
                } else {
                    // Stop at first gap to maintain sequential order
                    break;
                }
            }

            if (contiguousChunks.length > 0) {
                availableAudio = combineAudioChunks(contiguousChunks);
                console.log(
                    `Combined ${contiguousChunks.length} contiguous chunks (out of ${availableChunks.length} available)`,
                );
            }
        }

        return {
            isComplete: missingChunks.length === 0,
            availableChunks,
            missingChunks,
            totalChunks: metadata.totalChunks,
            availableAudio,
        };
    } catch (error) {
        console.error('Error getting audio chunk status:', error);
        return {
            isComplete: false,
            availableChunks: [],
            missingChunks: [],
            totalChunks: 0,
        };
    }
}

/**
 * Store audio metadata in R2
 */
export async function storeAudioMetadata(
    bucket: R2Bucket,
    slug: string,
    metadata: AudioChunkMetadata,
): Promise<void> {
    const basePath = `blogs/${slug}`;

    await bucket.put(`${basePath}/audio-metadata.json`, JSON.stringify(metadata), {
        httpMetadata: { contentType: 'application/json' },
    });
}

/**
 * Store individual audio chunk in R2
 */
export async function storeAudioChunk(
    bucket: R2Bucket,
    slug: string,
    chunkIndex: number,
    audioBuffer: ArrayBuffer,
): Promise<void> {
    const basePath = `blogs/${slug}`;

    await bucket.put(`${basePath}/audio-chunk-${chunkIndex}.mp3`, audioBuffer, {
        httpMetadata: { contentType: 'audio/mpeg' },
    });
}

/**
 * Update metadata with newly completed chunk
 */
export async function updateChunkMetadata(
    bucket: R2Bucket,
    slug: string,
    chunkIndex: number,
    chunkSize: number,
): Promise<AudioChunkMetadata> {
    const basePath = `blogs/${slug}`;

    // Get existing metadata
    const metadataObj = await bucket.get(`${basePath}/audio-metadata.json`);
    let metadata: AudioChunkMetadata;

    if (metadataObj) {
        metadata = JSON.parse(await metadataObj.text());
    } else {
        throw new Error('Audio metadata not found');
    }

    // Update metadata
    if (!metadata.completedChunks.includes(chunkIndex)) {
        metadata.completedChunks.push(chunkIndex);
        metadata.completedChunks.sort((a, b) => a - b); // Keep sorted
    }

    metadata.chunkSizes[chunkIndex] = chunkSize;
    metadata.lastUpdated = new Date().toISOString();

    // Store updated metadata
    await storeAudioMetadata(bucket, slug, metadata);

    return metadata;
}

/**
 * Combine multiple audio chunks into a single ArrayBuffer
 */
export function combineAudioChunks(audioChunks: ArrayBuffer[]): ArrayBuffer {
    if (audioChunks.length === 0) {
        return new ArrayBuffer(0);
    }

    if (audioChunks.length === 1) {
        return audioChunks[0];
    }

    // Calculate total length
    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);

    // Combine chunks
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of audioChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }

    return combined.buffer;
}

/**
 * Store the complete audio file once all chunks are available
 */
export async function storeCompleteAudio(
    bucket: R2Bucket,
    slug: string,
    completeAudio: ArrayBuffer,
): Promise<void> {
    const basePath = `blogs/${slug}`;

    // Store the complete audio
    await bucket.put(`${basePath}/audio.mp3`, completeAudio, {
        httpMetadata: { contentType: 'audio/mpeg' },
    });

    // Clean up individual chunks and metadata
    try {
        const metadata = await getAudioMetadata(bucket, slug);
        if (metadata) {
            // Delete individual chunks
            for (let i = 0; i < metadata.totalChunks; i++) {
                await bucket.delete(`${basePath}/audio-chunk-${i}.mp3`);
            }
            // Delete metadata
            await bucket.delete(`${basePath}/audio-metadata.json`);
        }
    } catch (error) {
        console.warn('Error cleaning up chunks after complete audio creation:', error);
        // Don't throw - complete audio was stored successfully
    }
}

/**
 * Get audio metadata from R2
 */
export async function getAudioMetadata(
    bucket: R2Bucket,
    slug: string,
): Promise<AudioChunkMetadata | null> {
    const basePath = `blogs/${slug}`;

    try {
        const metadataObj = await bucket.get(`${basePath}/audio-metadata.json`);
        if (!metadataObj) {
            return null;
        }

        return JSON.parse(await metadataObj.text()) as AudioChunkMetadata;
    } catch (error) {
        console.error('Error getting audio metadata:', error);
        return null;
    }
}

/**
 * Initialize audio metadata for a new chunked generation
 */
export async function initializeAudioMetadata(
    bucket: R2Bucket,
    slug: string,
    textChunks: string[],
): Promise<AudioChunkMetadata> {
    const metadata: AudioChunkMetadata = {
        totalChunks: textChunks.length,
        completedChunks: [],
        chunkSizes: new Array(textChunks.length).fill(0),
        lastUpdated: new Date().toISOString(),
        textChunks,
    };

    await storeAudioMetadata(bucket, slug, metadata);
    return metadata;
}
