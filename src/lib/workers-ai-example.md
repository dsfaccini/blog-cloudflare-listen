# Workers AI Utilities Usage Examples

This file demonstrates how to use the Workers AI utility functions for text-to-speech and summarization.

## Basic Usage

```typescript
import { generateAudio, generateSummary } from './workers-ai';

// In your Cloudflare Worker or Next.js API route
export default async function handler(request: Request, env: any) {
  const articleText = "This is a long article about AI...";

  try {
    // Generate audio from text
    const audioBuffer = await generateAudio(articleText, env, {
      speaker: "asteria", // Female voice
      encoding: "mp3"
    });

    // Save audio to R2
    await env.BLOG_STORAGE.put(`blogs/article-slug/audio.mp3`, audioBuffer);

    // Generate summary
    const summary = await generateSummary(articleText, env, {
      max_tokens: 150,
      temperature: 0.3
    });

    // Save summary to R2
    await env.BLOG_STORAGE.put(`blogs/article-slug/summary.txt`, summary);

    return new Response(JSON.stringify({ 
      audioGenerated: true, 
      summary,
      audioUrl: `/api/audio/article-slug` 
    }));

  } catch (error) {
    console.error('AI processing failed:', error);
    return new Response('AI processing failed', { status: 500 });
  }
}
```

## Advanced Configuration

```typescript
// Custom audio settings
const audioConfig = {
  speaker: "zeus", // Deep male voice
  encoding: "mp3",
  sample_rate: 22050,
  bit_rate: 128000
};

const audioBuffer = await generateAudio(text, env, audioConfig);

// Custom summarization
const summaryConfig = {
  max_tokens: 300,
  temperature: 0.2, // More focused
  system_prompt: "Create a technical summary focusing on key insights and actionable takeaways."
};

const summary = await generateSummary(text, env, summaryConfig);
```

## Error Handling

```typescript
import { WorkersAIError } from './workers-ai';

try {
  const result = await generateAudio(text, env);
} catch (error) {
  if (error instanceof WorkersAIError) {
    console.error(`AI Error for ${error.model}:`, error.message);
    // Handle specific AI model errors
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Cost Estimation

```typescript
import { getUsageEstimate } from './workers-ai';

const estimate = getUsageEstimate(articleText);
console.log(`Estimated cost: Audio $${estimate.estimatedCost.audio.toFixed(4)}, Summary $${estimate.estimatedCost.summary.toFixed(4)}`);
```

## Available Speakers for Aura-1

- `angus` - Default male voice
- `asteria` - Female voice
- `arcas` - Male voice
- `orion` - Male voice  
- `orpheus` - Male voice
- `athena` - Female voice
- `luna` - Female voice
- `zeus` - Deep male voice
- `perseus` - Male voice
- `helios` - Male voice
- `hera` - Female voice
- `stella` - Female voice

## Notes

- The functions automatically handle text chunking for long content
- Audio concatenation is performed for chunked text (simple approach)
- Summarization uses a two-pass approach for very long text
- All functions include proper error handling and rate limit considerations
- The utility functions work with Cloudflare's Workers AI binding