# Blog Cloudflare Listen - Backend Flow Documentation

This document explains the complete backend flow for the generic article route and how audio files and summaries are generated and stored in the R2 bucket.

## Overview

The backend follows a lazy-loading pattern where content is cached in R2 after first generation. Audio and summaries are generated **on-demand** when first requested, not during the initial page load.

## Main Components

1. **Generic Article Route** (`src/app/[...slug]/page.tsx`)
2. **Audio API Endpoint** (`src/app/api/audio/[...slug]/route.ts`)
3. **Summary API Endpoint** (`src/app/api/summary/[...slug]/route.ts`)
4. **Workers AI Integration** (`src/lib/workers-ai.ts`)
5. **Article Parser** (`src/lib/article-parser.ts`)
6. **R2 Storage** (Cloudflare Object Storage)

## Storage Structure in R2 Bucket (`blog-cloudflare-listen`)

```
blogs/
└── {slug}/
    ├── raw.html          # Original HTML from Cloudflare blog
    ├── article.json      # Parsed and structured article data
    ├── audio.mp3         # Generated audio file (MP3 format)
    └── summary.json      # Generated paragraph summaries
```

## Detailed Backend Flow

### 1. Initial Article Request Flow

When a user visits `/{slug}`:

1. **Route Handler** (`src/app/[...slug]/page.tsx:100-163`)
   - Extracts slug from URL parameters
   - Calls `getStoredData(slug)` to check R2 cache

2. **Cache Check** (`src/app/[...slug]/page.tsx:22-53`)
   - Looks for `blogs/{slug}/article.json` in R2
   - Looks for `blogs/{slug}/summary.json` in R2
   - Returns cached data if available

3. **Fresh Article Fetch** (if not cached)
   - Fetches HTML from `https://blog.cloudflare.com/{slug}/`
   - Stores raw HTML at `blogs/{slug}/raw.html`
   - Parses article using `parseArticle()` function
   - Stores parsed data at `blogs/{slug}/article.json`
   - **Note:** Audio and summary are NOT generated at this stage

4. **Page Rendering**
   - Returns `ArticleDisplay` component with article data
   - Summary is passed as `initialSummary` if cached

### 2. Audio Generation and Storage Flow

**Audio files ARE being stored correctly in R2.** Here's the flow:

1. **Audio Request** - AudioPlayer component loads and requests `/api/audio/{slug}`

2. **Audio API Handler** (`src/app/api/audio/[...slug]/route.ts:6-97`)
   - **Cache Check First** (lines 21-36):
     ```typescript
     const audioObject = await env.BLOG_STORAGE.get(`${basePath}/audio.mp3`);
     if (audioObject) {
         // Serve cached audio directly
         return new NextResponse(audioBuffer, { /* headers */ });
     }
     ```

   - **Generate if Not Cached** (lines 43-86):
     - Retrieves article data from `blogs/{slug}/article.json`
     - Extracts text using `extractTextForAudio(article)`
     - Generates audio using `generateAudio(textForAudio)`
     - **STORES IN R2** (lines 70-75):
       ```typescript
       await env.BLOG_STORAGE.put(`${basePath}/audio.mp3`, audioBuffer, {
           httpMetadata: { contentType: 'audio/mpeg' },
       });
       ```
     - Returns generated audio to client

3. **Audio Generation** (`src/lib/workers-ai.ts:8-57`)
   - Uses Cloudflare Workers AI model `@cf/deepgram/aura-1`
   - Handles text chunking for long articles (>1250 characters)
   - Uses AI Gateway with ID `audio-blog-gateway`
   - Returns ArrayBuffer containing MP3 data

### 3. Summary Generation and Storage Flow

1. **Summary Request** - ArticleDisplay component calls `/api/summary/{slug}` on mount

2. **Summary API Handler** (`src/app/api/summary/[...slug]/route.ts:6-89`)
   - **Cache Check First** (lines 21-32):
     ```typescript
     const summaryObject = await env.BLOG_STORAGE.get(`${basePath}/summary.json`);
     if (summaryObject) {
         // Serve cached summaries
         return NextResponse.json({ summaries: summaryData.summaries, cached: true });
     }
     ```

   - **Generate if Not Cached** (lines 39-77):
     - Retrieves article data from `blogs/{slug}/article.json`
     - Extracts paragraphs using `extractParagraphsForSummary(article)`
     - Generates summaries using `generateParagraphSummaries(paragraphs)`
     - **STORES IN R2** (lines 66-69):
       ```typescript
       await env.BLOG_STORAGE.put(`${basePath}/summary.json`, JSON.stringify({ summaries }), {
           httpMetadata: { contentType: 'application/json' },
       });
       ```
     - Returns generated summaries to client

3. **Summary Generation** (`src/lib/workers-ai.ts:184-205`)
   - Uses Cloudflare Workers AI model `@cf/meta/llama-3.2-3b-instruct`
   - Processes all paragraphs in parallel
   - 30-word limit per paragraph summary
   - Includes error handling with fallback to truncation

## Component Interactions

### Frontend Components

1. **ArticleDisplay** (`src/components/ArticleDisplay.tsx`)
   - Renders article content
   - Contains AudioPlayer and summary controls
   - Preloads summaries on mount (line 39-64)

2. **AudioPlayer** (`src/components/AudioPlayer.tsx`)
   - Preloads audio by setting `src="/api/audio/{slug}"` (line 98)
   - Shows loading states during generation
   - Handles audio playback controls

## API Endpoint Behaviors

### Audio API (`/api/audio/{slug}`)
- **Method:** GET
- **Cache-First Strategy:** Always checks R2 before generating
- **Storage:** Saves generated audio as `blogs/{slug}/audio.mp3`
- **Content-Type:** `audio/mpeg`
- **Caching Headers:** `max-age=31536000` (1 year)

### Summary API (`/api/summary/{slug}`)
- **Method:** GET
- **Cache-First Strategy:** Always checks R2 before generating
- **Storage:** Saves generated summaries as `blogs/{slug}/summary.json`
- **Response Format:**
  ```json
  {
    "summaries": ["summary1", "summary2", ...],
    "cached": true/false
  }
  ```

## Error Handling

1. **Audio Generation Errors:**
   - Falls back to chunking for long texts
   - Returns 500 with error details if generation fails
   - Logs detailed error information

2. **Summary Generation Errors:**
   - Individual paragraph failures fall back to truncation
   - Returns 500 with error details if all generation fails
   - Continues with partial results when possible

3. **Storage Errors:**
   - Logged but don't prevent serving content
   - Generation continues even if storage fails
   - Next request will retry storage

## Performance Characteristics

1. **First Visit:** Slower (fetches + parses article, but no audio/summary generation)
2. **Audio First Play:** Slower (generates and stores audio)
3. **Summary First View:** Slower (generates and stores summaries)
4. **Subsequent Visits:** Fast (everything served from R2 cache)
5. **Parallel Generation:** Audio and summaries can be generated simultaneously

## Backend Flow Diagram

```mermaid
graph TB
    Start([User visits /{slug}]) --> CheckCache{Check R2 Cache<br/>article.json exists?}
    
    CheckCache -->|Yes| LoadCached[Load article from<br/>blogs/{slug}/article.json]
    CheckCache -->|No| FetchOriginal[Fetch from<br/>blog.cloudflare.com/{slug}/]
    
    FetchOriginal --> StoreRaw[Store raw HTML<br/>blogs/{slug}/raw.html]
    StoreRaw --> ParseArticle[Parse HTML to<br/>structured data]
    ParseArticle --> StoreArticle[Store article<br/>blogs/{slug}/article.json]
    
    StoreArticle --> LoadCached
    LoadCached --> RenderPage[Render ArticleDisplay<br/>component]
    
    RenderPage --> AudioRequest[AudioPlayer requests<br/>/api/audio/{slug}]
    RenderPage --> SummaryRequest[Component requests<br/>/api/summary/{slug}]
    
    AudioRequest --> CheckAudioCache{Audio cached<br/>in R2?}
    CheckAudioCache -->|Yes| ServeAudio[Serve cached audio<br/>from R2]
    CheckAudioCache -->|No| GenerateAudio[Generate audio using<br/>@cf/deepgram/aura-1]
    
    GenerateAudio --> ExtractAudioText[Extract text using<br/>extractTextForAudio()]
    ExtractAudioText --> CheckTextLength{Text > 1250<br/>characters?}
    CheckTextLength -->|Yes| ChunkText[Split into chunks<br/>by sentences]
    CheckTextLength -->|No| SingleAudio[Generate single<br/>audio file]
    
    ChunkText --> ParallelAudio[Generate audio for<br/>all chunks in parallel]
    ParallelAudio --> CombineAudio[Combine audio<br/>chunks]
    CombineAudio --> StoreAudio
    SingleAudio --> StoreAudio[Store audio<br/>blogs/{slug}/audio.mp3]
    
    StoreAudio --> ServeAudio
    
    SummaryRequest --> CheckSummaryCache{Summary cached<br/>in R2?}
    CheckSummaryCache -->|Yes| ServeSummary[Serve cached summary<br/>from R2]
    CheckSummaryCache -->|No| GenerateSummary[Generate summaries using<br/>@cf/meta/llama-3.2-3b-instruct]
    
    GenerateSummary --> ExtractParagraphs[Extract paragraphs using<br/>extractParagraphsForSummary()]
    ExtractParagraphs --> ParallelSummaries[Generate summaries for<br/>all paragraphs in parallel]
    ParallelSummaries --> StoreSummary[Store summaries<br/>blogs/{slug}/summary.json]
    
    StoreSummary --> ServeSummary
    
    ServeAudio --> AudioReady[Audio ready for playback]
    ServeSummary --> SummaryReady[Summary ready for display]
    
    AudioReady --> End([User can play audio])
    SummaryReady --> End2([User can view summaries])

    classDef storage fill:#e1f5fe
    classDef generation fill:#fff3e0
    classDef cache fill:#f1f8e9
    classDef api fill:#fce4ec
    
    class StoreRaw,StoreArticle,StoreAudio,StoreSummary storage
    class GenerateAudio,GenerateSummary,ChunkText,ParallelAudio,ParallelSummaries generation
    class CheckCache,CheckAudioCache,CheckSummaryCache cache
    class AudioRequest,SummaryRequest api
```

## Conclusion

**The audio files ARE being stored correctly in the R2 bucket.** The system follows a proper cache-first approach:

1. All generated content is stored in R2 for future requests
2. Audio files are stored as `blogs/{slug}/audio.mp3` 
3. Summary files are stored as `blogs/{slug}/summary.json`
4. The first generation is slower, but subsequent requests are served from cache
5. Both audio and summary generation happen on-demand, not during initial page load

If audio files seem to be missing, the issue might be:
- Network errors during generation (check logs)
- R2 bucket permissions
- AI model availability
- Text extraction returning empty content