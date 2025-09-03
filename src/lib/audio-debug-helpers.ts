/**
 * Audio Debug Helpers
 * 
 * Utilities for debugging audio generation failures with detailed error information
 * instead of useless generic error messages.
 */

interface AudioGenerationContext {
    chunkIndex?: number;
    textLength?: number;
    textPreview?: string;
    attempt?: number;
    totalChunks?: number;
    slug?: string;
}

interface ErrorAnalysis {
    type: string;
    message: string;
    details: Record<string, unknown>;
    suggestions: string[];
}

/**
 * Validate and debug AI audio responses with detailed error information
 */
export async function validateAudioResponse(response: unknown, context: AudioGenerationContext): Promise<ArrayBuffer> {
    // Handle ArrayBuffer (legacy response format)
    if (response instanceof ArrayBuffer) {
        return response;
    }

    // Handle ReadableStream (new response format)
    if (response instanceof ReadableStream) {
        try {
            console.log(`📥 Converting ReadableStream to ArrayBuffer for chunk ${context.chunkIndex || 'single'}...`);
            
            // Convert ReadableStream to ArrayBuffer
            const reader = response.getReader();
            const chunks: Uint8Array[] = [];
            let totalLength = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                chunks.push(value);
                totalLength += value.length;
            }

            // Combine all chunks
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }

            console.log(`✅ Converted ReadableStream to ArrayBuffer: ${combined.buffer.byteLength} bytes`);
            return combined.buffer;
            
        } catch (streamError) {
            console.error('❌ Failed to convert ReadableStream:', streamError);
            throw new Error(`Failed to convert ReadableStream to ArrayBuffer: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`);
        }
    }

    // Analyze other response types (errors)
    const analysis = analyzeFailedResponse(response, context);
    
    // Log detailed error information
    console.error('🚨 AUDIO GENERATION FAILED - DETAILED ANALYSIS:');
    console.error('Context:', context);
    console.error('Response Analysis:', analysis);
    console.error('Raw Response (first 1000 chars):', 
        typeof response === 'string' ? response.substring(0, 1000) :
        JSON.stringify(response, null, 2).substring(0, 1000)
    );

    // Throw a helpful error message
    throw new Error(analysis.message);
}

/**
 * Analyze a failed AI response to determine what went wrong
 */
function analyzeFailedResponse(response: unknown, context: AudioGenerationContext): ErrorAnalysis {
    const chunkInfo = context.chunkIndex !== undefined ? ` (Chunk ${context.chunkIndex})` : '';
    
    // Check for null/undefined
    if (response === null) {
        return {
            type: 'NULL_RESPONSE',
            message: `AI returned null response${chunkInfo}. This usually indicates a server error or timeout.`,
            details: { response: null, context },
            suggestions: [
                'Check if AI service is available',
                'Retry with shorter text',
                'Check rate limits'
            ]
        };
    }

    if (response === undefined) {
        return {
            type: 'UNDEFINED_RESPONSE',
            message: `AI returned undefined response${chunkInfo}. This indicates a connection or API error.`,
            details: { response: undefined, context },
            suggestions: [
                'Check network connectivity',
                'Verify AI binding configuration',
                'Check for API endpoint issues'
            ]
        };
    }

    // Check for error objects
    if (typeof response === 'object' && response !== null) {
        const errorObj = response as Record<string, unknown>;
        
        // Standard error format
        if ('error' in errorObj) {
            const errorMessage = typeof errorObj.error === 'string' ? errorObj.error : JSON.stringify(errorObj.error);
            return {
                type: 'API_ERROR',
                message: `AI API Error${chunkInfo}: ${errorMessage}`,
                details: { response: errorObj, context },
                suggestions: [
                    'Check if text length is within limits',
                    'Verify model availability',
                    'Check API quotas and rate limits'
                ]
            };
        }

        // Check for specific error patterns
        if ('message' in errorObj || 'detail' in errorObj) {
            const errorMessage = (errorObj.message || errorObj.detail) as string;
            return {
                type: 'DETAILED_ERROR',
                message: `AI Error${chunkInfo}: ${errorMessage}`,
                details: { response: errorObj, context },
                suggestions: [
                    'Check the specific error details above',
                    'Reduce text complexity if needed',
                    'Try again with different parameters'
                ]
            };
        }

        // Check for timeout indicators
        if ('timeout' in errorObj || 'TimeoutError' in errorObj || errorObj.constructor?.name === 'TimeoutError') {
            return {
                type: 'TIMEOUT_ERROR',
                message: `AI Request Timeout${chunkInfo}: Request took too long to complete`,
                details: { response: errorObj, context },
                suggestions: [
                    'Reduce text length for this chunk',
                    'Retry the request',
                    'Check server load/capacity'
                ]
            };
        }

        // Generic object response
        return {
            type: 'UNEXPECTED_OBJECT',
            message: `AI returned unexpected object${chunkInfo}: Expected ArrayBuffer, got object with keys: ${Object.keys(errorObj).join(', ')}`,
            details: { 
                response: errorObj, 
                context,
                objectKeys: Object.keys(errorObj),
                objectConstructor: errorObj.constructor?.name
            },
            suggestions: [
                'Check AI model configuration',
                'Verify request parameters',
                'Check for model updates or changes'
            ]
        };
    }

    // Check for string responses (might contain error info)
    if (typeof response === 'string') {
        const lowerResponse = response.toLowerCase();
        
        if (lowerResponse.includes('timeout') || lowerResponse.includes('timed out')) {
            return {
                type: 'TIMEOUT_STRING',
                message: `AI Timeout${chunkInfo}: ${response}`,
                details: { response, context },
                suggestions: [
                    'Reduce chunk size',
                    'Retry with exponential backoff',
                    'Check service status'
                ]
            };
        }

        if (lowerResponse.includes('error') || lowerResponse.includes('failed')) {
            return {
                type: 'ERROR_STRING',
                message: `AI Error Response${chunkInfo}: ${response}`,
                details: { response, context },
                suggestions: [
                    'Check the error message details',
                    'Verify input text format',
                    'Try different model parameters'
                ]
            };
        }

        return {
            type: 'UNEXPECTED_STRING',
            message: `AI returned string instead of audio${chunkInfo}: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`,
            details: { response, context, stringLength: response.length },
            suggestions: [
                'Check if using correct AI model',
                'Verify model supports audio generation',
                'Check request format and parameters'
            ]
        };
    }

    // Handle other types
    return {
        type: 'UNKNOWN_TYPE',
        message: `AI returned unexpected type${chunkInfo}: Expected ArrayBuffer, got ${typeof response}`,
        details: { 
            response, 
            context,
            responseType: typeof response,
            responseConstructor: (response as Record<string, unknown>)?.constructor?.name
        },
        suggestions: [
            'Check AI service configuration',
            'Verify model compatibility',
            'Check for service interruptions'
        ]
    };
}

/**
 * Create a timeout promise for AI requests
 */
export function createTimeoutPromise(timeoutMs: number, context: AudioGenerationContext): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            const chunkInfo = context.chunkIndex !== undefined ? ` for chunk ${context.chunkIndex}` : '';
            const textInfo = context.textLength ? ` (${context.textLength} chars)` : '';
            
            console.error(`⏰ TIMEOUT: AI request${chunkInfo}${textInfo} exceeded ${timeoutMs}ms`);
            console.error('Timeout Context:', context);
            
            reject(new Error(`TIMEOUT: AI request${chunkInfo} took longer than ${timeoutMs}ms. Text length: ${context.textLength || 'unknown'} chars`));
        }, timeoutMs);
    });
}

/**
 * Log successful chunk generation with context
 */
export function logSuccessfulChunk(chunkIndex: number, audioSize: number, context: AudioGenerationContext): void {
    console.log(`✅ Chunk ${chunkIndex} SUCCESS: Generated ${audioSize} bytes from ${context.textLength || 'unknown'} chars`);
    
    if (context.attempt && context.attempt > 1) {
        console.log(`   └─ Succeeded on attempt ${context.attempt}`);
    }
}

/**
 * Log chunk failure with detailed context
 */
export function logChunkFailure(chunkIndex: number, error: Error, context: AudioGenerationContext): void {
    console.error(`❌ Chunk ${chunkIndex} FAILED:`);
    console.error(`   ├─ Error: ${error.message}`);
    console.error(`   ├─ Text length: ${context.textLength || 'unknown'} chars`);
    console.error(`   ├─ Text preview: "${context.textPreview?.substring(0, 100) || 'N/A'}..."`);
    
    if (context.attempt) {
        console.error(`   ├─ Attempt: ${context.attempt}`);
    }
    
    console.error(`   └─ Full context:`, context);
    
    // Log stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
        console.error('   └─ Stack trace:', error.stack);
    }
}

/**
 * Create comprehensive error details for API responses
 */
export function createErrorDetails(error: Error, context: AudioGenerationContext & {
    successfulChunks?: number[];
    failedChunks?: number[];
    totalAttempts?: number;
    context?: string;
}): Record<string, unknown> {
    return {
        message: error.message,
        timestamp: new Date().toISOString(),
        context: {
            slug: context.slug,
            chunkIndex: context.chunkIndex,
            totalChunks: context.totalChunks,
            textLength: context.textLength,
            attempt: context.attempt,
            totalAttempts: context.totalAttempts
        },
        chunkStatus: {
            successful: context.successfulChunks || [],
            failed: context.failedChunks || [],
            successCount: context.successfulChunks?.length || 0,
            failureCount: context.failedChunks?.length || 0
        },
        debugging: {
            nodeEnv: process.env.NODE_ENV,
            timestamp: Date.now(),
            userAgent: 'BlogCloudflareListenBot/1.0'
        },
        stackTrace: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
}