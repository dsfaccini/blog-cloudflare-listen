# Blog Cloudflare Listen

This is the codebase for a small web app called "Blog Cloudflare Listen" that will be deployed on cloudflare workers under the domain `blog-cloudflare-audio.dsfapps.workers.dev`

The web app allows users to listen to articles from the cloudflare blog and read summaries for each paragraph. The web app will mirror the same page as on the cloudflare blog, but swapping out the Logo for our own Logo `@/components/CloudflareAudioLogo.tsx` and removing cloudflare's own server functionality, like the get started free, contact sales, subscribe input field...

## Example

we'll use the Blog Post "Cloudy Summarizations of Email Detections: Beta Announcement" with the URL `https://blog.cloudflare.com/cloudy-driven-email-security-summaries/` as an example throughout this doc.

## Overview

The web app is really simple: the homepage shows the title and an input bar where the user can paste a URL to an article in the cloudflare blog.

On submit the page should navigate to the same path in our domain under the `/blog`, so for the above example the page will navigate to `https://blog-cloudflare-audio.dsfapps.workers.dev/blog/cloudy-driven-email-security-summaries/`

### The generic article route

Our web app only has two routes: the homepage and the catch-all _also called_ `generic article route`. When a generic article route loads, the worker needs to fetch the original article. The part that we need is in an article tag, I've created a sample under `article-sample.html`. The worker saves the fetched html in an `R2` bucket, triggers the audio and summarization flows and simultaneously renders the article so the page loads fast. There are a few considerations here:

1. The HTML for the article is "orphaned" i.e. it misses the styles defined in the cloudflare blog site.
2. It also seems to be using tailwind styles that won't take effect if we just render it as normal HTML (not sure about this one, but this is my understanding).
3. Because this is a nextjs app we normally are rendering react.
4. We are also rendering other things, like our logo, a button that takes the user to the original article, the "listen to article" and the "read summary" buttons.
5. So I need your help thinking of a way to render the article properly, perhaps using a pre-made react component. The reality is that all articles follow the same structure, with some having more images and some less, but the sections are roughly the same, so we could programatically map the fecthed HTML to our pre-made react components.

### The audio and summary flows

#### audio

The audio uses a **resilient chunked generation system** with the [@cf/deepgram/aura-1](https://developers.cloudflare.com/workers-ai/models/aura-1/) model:

- **Short articles** (<1250 chars): Single audio file saved as `audio.mp3`
- **Long articles** (>1250 chars): Split into sentence-based chunks, generated in parallel
- **Individual chunks** stored as `audio-chunk-0.mp3`, `audio-chunk-1.mp3`, etc.
- **Metadata tracking** in `audio-metadata.json` for chunk completion status
- **Progressive playback**: Users can listen to available chunks while missing ones generate
- **Automatic cleanup**: Individual chunks deleted once complete `audio.mp3` is created

#### sumarrization

We'll use [@cf/meta/llama-3.2-3b-instruct](https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/) for summarization. The summary will be saved as "summary.md" in the `R2` bucket.

## R2

We need to set up an `R2` binding in `wrangler.jsonc` and also create it remotely via the `wrangler` cli.

The name of the bucket will be `blog-cloudflare-listen` and the path to the blog posts will be `blogs`.

Each post will have the name of their url path, so to keep using or example from above, the path to the files in the `R2` bucket for the "Cloudy Summarizations of Email Detections: Beta Announcement" will be:

- `/blogs/cloudy-driven-email-security-summaries/` in the `blog-cloudflare-listen` `R2` bucket

**Storage structure during audio generation:**

```
blogs/cloudy-driven-email-security-summaries/
├── raw.html              # Original HTML
├── article.json          # Parsed article
├── audio-metadata.json   # Chunk tracking (temporary)
├── audio-chunk-0.mp3     # Individual chunks (temporary)
├── audio-chunk-1.mp3
├── audio-chunk-N.mp3
├── audio.mp3             # Complete audio (replaces chunks)
└── summary.json          # Paragraph summaries
```

## Storing past articles (we can call it "cache")

We only need to fetch the HTML once, and generate an audio and summary once, after that they are stored in our R2 bucket. That means that the logic for rendering the article page needs to first check the `R2` bucket and only fetch the page and trigger the other two workflows if the files aren't found.

## Test page

I need you to make a test page, similar to the homepage, where I can enter a URL and the page will console log the logic of what's happening, like: article found in "cache" or "fetched article"

## Last considerations

Generally I'd outsource the generation of the audio and the summary to a queue or separate worker but I want to keep this application simple. Nonetheless I'd like to have a feedback on the test page like "audio file is ready now", which we could achieve with a websocket. So the client connects to the worker, the worker fetches the article and maps it to our react components and renders it as soon as it's ready. The websocket comes into play for the "Listen to this article" and "Read a summary" buttons on the page: they should be greyed out if the files aren't ready, and the websocket can tell the client when they're ready so they can activate.

## Development instructions

- DON'T OVERENGINEER: fulfill the task as described or approved by me, don't add features and defensive checks we didn't discuss. If you have recommendations about the implementation use the planning phase to ask them in BIG LETTERS so I don't miss your question. If you believe an implementation can be improved leave a comment with "FORDAVID:" explaining your recommendation
- comments marked with "CLAUTODO" are generally TODOs or NOTEs directed at you.
- use bun as a package manager (i.e. use `bun run ...`)
- check the `package.json` to know which commands are available.
- don't manually modify the `cloudflare-env.d.ts`, this is a generated file. Instead, run `bun run cf-typegen`.
- you may use the links in this file to understand the syntax, parameters, inputs and outputs of the models to use.
- for any information not contained in this document or otherwise linked in this repo, you may use the `Ref` MCP to research docs. If you don't find the information you're looking for you may use your Web Search tool. Make sure to state beforehand which information you're going to look for, so that you can asses when to stop researching.
- Never read the `cloudflare-env.d.ts` file.
- don't use literal quotes in HTML, the linter will complain and the build will fail. use the escaped variant (e.g. `&quot;`)

## Current Architecture

### Chunked Audio Generation System

**Resilient chunked approach** in `src/lib/workers-ai.ts` and `src/lib/audio-chunk-manager.ts`:

1. Text >1250 characters automatically split into sentence-based chunks
2. All chunks generated in parallel using `Promise.allSettled` for maximum resilience
3. Individual chunks stored in R2 as `audio-chunk-{index}.mp3`
4. Metadata tracks completion status and preserves original text for retries
5. Only **contiguous chunks from index 0** are combined for playback (ensures correct sequence)
6. Complete `audio.mp3` replaces individual chunks when all are ready

### React Query Data Fetching

**TanStack Query integration** eliminates manual fetch logic and provides automatic retries:

- **`src/hooks/useAudioData.ts`** - Audio fetching with:
    - Automatic retries: 30s, 1min, 2min, 5min delays (prevents rate limiting)
    - Background refetching for incomplete chunks every 30 seconds
    - Smart caching with 5-minute stale time

- **`src/hooks/useSummaryData.ts`** - Summary fetching with:
    - Infinite stale time (summaries don't change once generated)
    - Automatic error handling and retries

**Why React Query:** Eliminates complex manual retry logic, provides automatic background updates, built-in caching, and better error handling.

### Audio API Behavior

The `/api/audio/{slug}` endpoint logic:

1. **Check complete audio**: Return `audio.mp3` if exists (200 OK)
2. **Check chunked audio**: Assemble contiguous chunks if available
3. **Generate missing chunks**: Always attempt to fill gaps automatically
4. **Return response**:
    - 200 OK for complete audio
    - 206 Partial Content for incomplete with progress headers
    - Headers include chunk status: `X-Audio-Status`, `X-Total-Chunks`, etc.

### Troubleshooting Audio Issues

**If audio doesn't play properly:**

- Check browser console for chunk status headers
- Verify chunks are loading in sequence (0,1,2,3...)
- React Query will auto-retry missing chunks after 30+ second delays

**If audio generation fails:**

- Check `src/lib/audio-debug-helpers.ts` logs for detailed error analysis
- Individual chunk failures are logged but don't stop other chunks
- Complete failure returns 500 with comprehensive debugging info

### Testing Commands

- `bun run build` - Build and type-check the application
- `bun run lint` - Run ESLint checks
