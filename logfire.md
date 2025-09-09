# Pydantic Logfire Documentation for Blog Cloudflare Listen

This document covers integrating Pydantic Logfire for observability in our Next.js + Cloudflare Workers audio processing application.

## Installation

For Cloudflare Workers environment:

```bash
bun add @pydantic/logfire-api @pydantic/logfire-cf-workers
```

For development/testing in Node.js:

```bash
bun add @pydantic/logfire-api @pydantic/logfire-node
```

## Configuration

### Environment Variables

Add to your `.env` or Cloudflare Workers environment:

```env
LOGFIRE_TOKEN=your_logfire_token_here
```

### Cloudflare Workers Setup

In your worker code:

```typescript
import * as logfire from '@pydantic/logfire-api';
import { instrument } from '@pydantic/logfire-cf-workers';

// Initialize Logfire in your worker
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Initialize Logfire with your token
        logfire.configure({
            token: env.LOGFIRE_TOKEN,
            service_name: 'blog-cloudflare-listen',
            service_version: '1.0.0',
        });

        // Your worker logic here
        return instrument(request, env, ctx, async () => {
            // Your application code
        });
    },
};
```

### Next.js API Routes Setup

For API routes in `src/app/api/`:

```typescript
import * as logfire from '@pydantic/logfire-api';

// Configure at the start of your API route
logfire.configure({
    token: process.env.LOGFIRE_TOKEN!,
    service_name: 'blog-cloudflare-listen',
    service_version: '1.0.0',
});
```

## Core Concepts

### Spans

Spans represent a single operation. They can be nested to show relationships between operations.

### Traces

Traces are collections of spans that represent a complete workflow.

### Log Levels

- `trace` - Very detailed debugging information
- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error conditions
- `fatal` - Critical errors

## Basic Usage

### Simple Logging (replacing console.log)

```typescript
import * as logfire from '@pydantic/logfire-api';

// Instead of: console.log("Processing audio...")
logfire.info('Processing audio for chunk {chunk_index}', { chunk_index: 5 });

// Instead of: console.error("Failed to generate audio:", error)
logfire.error('Failed to generate audio: {error}', { error: error.message });
```

### Creating Spans

```typescript
import * as logfire from '@pydantic/logfire-api';

async function generateAudioChunk(chunkIndex: number, text: string) {
    return await logfire.span(
        'generate_audio_chunk',
        { chunk_index: chunkIndex, text_length: text.length },
        async (span) => {
            try {
                span.info('Starting audio generation for chunk {chunk_index}', {
                    chunk_index: chunkIndex,
                });

                const response = await env.AI.run('@cf/deepgram/aura-1', { text });

                span.info('Audio generation completed', {
                    response_type: typeof response,
                    is_readable_stream: response instanceof ReadableStream,
                });

                return response;
            } catch (error) {
                span.error('Audio generation failed: {error}', { error: error.message });
                throw error;
            }
        },
    );
}
```

## Practical Examples for Our Use Case

### 1. Audio Generation Pipeline Instrumentation

Replace the current audio generation logging:

```typescript
// OLD: Console logging
console.log(`🎵 Generating chunk ${chunkIndex}/${textChunks.length}...`);

// NEW: Logfire span
export async function generateAudioResilient(text: string, slug: string) {
    return await logfire.span(
        'generate_audio_resilient',
        {
            slug,
            text_length: text.length,
            service: 'audio-generation',
        },
        async (span) => {
            const textChunks = splitTextIntoChunks(text);
            span.info('Split text into {chunk_count} chunks', { chunk_count: textChunks.length });

            // Check existing chunks
            const chunkStatus = await getAudioChunkStatus(env.BLOG_STORAGE, slug);
            span.info('Found {available_chunks}/{total_chunks} existing chunks', {
                available_chunks: chunkStatus.availableChunks.length,
                total_chunks: chunkStatus.totalChunks,
            });

            // Continue with chunk generation...
        },
    );
}
```

### 2. Individual Chunk Processing

```typescript
const chunkPromises = missingChunks.map(async (chunkIndex) => {
    return await logfire.span(
        'generate_audio_chunk',
        {
            chunk_index: chunkIndex,
            slug,
            attempt: 1,
        },
        async (span) => {
            const chunkText = textChunks[chunkIndex];

            span.info('Processing chunk {chunk_index}', {
                chunk_index: chunkIndex,
                text_length: chunkText.length,
                text_preview: chunkText.substring(0, 100),
            });

            try {
                const response = await env.AI.run('@cf/deepgram/aura-1', { text: chunkText });

                span.info('AI response received', {
                    response_type: typeof response,
                    is_readable_stream: response instanceof ReadableStream,
                    is_array_buffer: response instanceof ArrayBuffer,
                });

                const audioBuffer = await validateAudioResponse(response, context);

                span.info('Audio conversion completed', {
                    buffer_size: audioBuffer.byteLength,
                });

                return { chunkIndex, audio: audioBuffer, success: true };
            } catch (error) {
                span.error('Chunk generation failed: {error}', {
                    error: error.message,
                    error_type: error.constructor.name,
                });
                return { chunkIndex, audio: null, success: false, error: error.message };
            }
        },
    );
});
```

### 3. Stream Conversion Tracking

```typescript
export async function validateAudioResponse(
    response: unknown,
    context: AudioGenerationContext,
): Promise<ArrayBuffer> {
    return await logfire.span(
        'validate_audio_response',
        {
            chunk_index: context.chunkIndex,
            response_type: typeof response,
            response_constructor: response?.constructor?.name,
        },
        async (span) => {
            // Handle ArrayBuffer
            if (response instanceof ArrayBuffer) {
                span.info('Response is ArrayBuffer', { buffer_size: response.byteLength });
                return response;
            }

            // Handle ReadableStream
            if (response instanceof ReadableStream) {
                span.info('Converting ReadableStream to ArrayBuffer');

                const reader = response.getReader();
                const chunks: Uint8Array[] = [];
                let totalLength = 0;
                let chunkCount = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    totalLength += value.length;
                    chunkCount++;
                }

                span.info('ReadableStream conversion completed', {
                    chunk_count: chunkCount,
                    total_bytes: totalLength,
                });

                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }

                return combined.buffer;
            }

            // Handle errors
            span.error('Unexpected response type', {
                response_type: typeof response,
                response_keys:
                    response && typeof response === 'object' ? Object.keys(response) : [],
            });

            throw new Error(`Unexpected response type: ${typeof response}`);
        },
    );
}
```

### 4. R2 Storage Operations

```typescript
export async function storeAudioChunk(
    bucket: R2Bucket,
    slug: string,
    chunkIndex: number,
    audioBuffer: ArrayBuffer,
): Promise<void> {
    return await logfire.span(
        'store_audio_chunk',
        {
            slug,
            chunk_index: chunkIndex,
            buffer_size: audioBuffer.byteLength,
        },
        async (span) => {
            const basePath = `blogs/${slug}`;
            const key = `${basePath}/audio-chunk-${chunkIndex}.mp3`;

            span.info('Storing chunk to R2', { r2_key: key });

            await bucket.put(key, audioBuffer, {
                httpMetadata: { contentType: 'audio/mpeg' },
            });

            span.info('Chunk stored successfully');
        },
    );
}
```

## Error Handling and Exception Tracking

### Automatic Error Capture in Spans

Errors thrown within spans are automatically captured:

```typescript
await logfire.span('risky_operation', {}, async (span) => {
    // If this throws, the error is automatically captured
    throw new Error('Something went wrong');
});
```

### Manual Error Reporting

```typescript
try {
    await riskyOperation();
} catch (error) {
    logfire.error('Operation failed: {error}', {
        error: error.message,
        error_type: error.constructor.name,
        stack_trace: error.stack,
        operation: 'riskyOperation',
    });
    throw error;
}
```

## Best Practices

### 1. Span Naming Conventions

- Use `snake_case` for span names
- Be descriptive but concise: `generate_audio_chunk`, `validate_response`, `store_r2_object`

### 2. Attribute Guidelines

- Use structured data with meaningful keys
- Include relevant context: `chunk_index`, `slug`, `buffer_size`
- Avoid sensitive information (API keys, user data)

### 3. Performance Considerations

- Logfire is designed for production use
- Spans have minimal overhead
- Async operations are properly handled

### 4. Production Configuration

```typescript
logfire.configure({
    token: env.LOGFIRE_TOKEN,
    service_name: 'blog-cloudflare-listen',
    service_version: process.env.GIT_COMMIT_SHA || '1.0.0',
    environment: env.ENVIRONMENT || 'production',
    // Sampling for high-traffic scenarios
    sample_rate: 1.0, // 100% sampling, adjust as needed
});
```

### 5. Development vs Production

```typescript
// Different log levels for different environments
const logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

logfire.configure({
    token: env.LOGFIRE_TOKEN,
    service_name: 'blog-cloudflare-listen',
    min_log_level: logLevel,
});
```

## Integration with Existing Code

### Replacing Console Statements

```typescript
// OLD
console.log(
    `Audio generation result: ${result.availableChunks.length}/${result.totalChunks} chunks complete`,
);

// NEW
logfire.info('Audio generation completed', {
    available_chunks: result.availableChunks.length,
    total_chunks: result.totalChunks,
    completion_rate: `${Math.round((result.availableChunks.length / result.totalChunks) * 100)}%`,
    is_complete: result.isComplete,
});
```

### WebSocket Instrumentation (Future Enhancement)

```typescript
// For future WebSocket implementation
export function instrumentWebSocket(ws: WebSocket, slug: string) {
    return logfire.span('websocket_session', { slug }, async (span) => {
        ws.onopen = () => span.info('WebSocket connected');
        ws.onclose = () => span.info('WebSocket disconnected');
        ws.onerror = (error) => span.error('WebSocket error: {error}', { error });

        // Continue with WebSocket logic
    });
}
```

## Migration Strategy

1. **Phase 1**: Replace critical error logging in audio generation
2. **Phase 2**: Add spans around main operations (chunk generation, R2 storage)
3. **Phase 3**: Replace all console.log statements with appropriate Logfire calls
4. **Phase 4**: Add performance metrics and advanced instrumentation

This approach provides comprehensive visibility into your audio processing pipeline while maintaining the existing functionality.
