# Blog Cloudflare Listen

This is the codebase for a small web app called "Blog Cloudflare Listen" that will be deployed on cloudflare workers under the domain `blog-cloudflare-audio.dsfapps.workers.dev`

The web app allows users to listen to articles from the cloudflare blog and read summaries for each paragraph. The web app will mirror the same page as on the cloudflare blog, but swapping out the Logo for our own Logo `@/components/CloudflareAudioLogo.tsx` and removing cloudflare's own server functionality, like the get started free, contact sales, subscribe input field...

## Example

we'll use the Blog Post "Cloudy Summarizations of Email Detections: Beta Announcement" with the URL `https://blog.cloudflare.com/cloudy-driven-email-security-summaries/` as an example throughout this doc.

## Overview

The web app is really simple: the homepage shows the title and an input bar where the user can paste a URL to an article in the cloudflare blog.

On submit the page should navigate to the same path in our domain, so for the above example the page will navigate to `https://blog-cloudflare-audio.dsfapps.workers.dev/cloudy-driven-email-security-summaries/`

### The generic article route

Our web app only has two routes: the homepage and the catch-all *also called* `generic article route`. When a generic article route loads, the worker needs to fetch the original article. The part that we need is in an article tag, I've created a sample under `article-sample.html`. The worker saves the fetched html in an `R2` bucket, triggers the audio and summarization flows and simultaneously renders the article so the page loads fast. There are a few considerations here:

1. The HTML for the article is "orphaned" i.e. it misses the styles defined in the cloudflare blog site.
2. It also seems to be using tailwind styles that won't take effect if we just render it as normal HTML (not sure about this one, but this is my understanding).
3. Because this is a nextjs app we normally are rendering react.
4. We are also rendering other things, like our logo, a button that takes the user to the original article, the "listen to article" and the "read summary" buttons.
5. So I need your help thinking of a way to render the article properly, perhaps using a pre-made react component. The reality is that all articles follow the same structure, with some having more images and some less, but the sections are roughly the same, so we could programatically map the fecthed HTML to our pre-made react components.

### The audio and summary flows

#### audio

The audio is generated using the new [@cf/deepgram/aura-1](https://developers.cloudflare.com/workers-ai/models/aura-1/) model and saved to the `R2` bucket as "audio.mp3".

#### sumarrization

We'll use [@cf/meta/llama-3.2-3b-instruct](https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/) for summarization. The summary will be saved as "summary.md" in the `R2` bucket.

## R2

We need to set up an `R2` binding in `wrangler.jsonc` and also create it remotely via the `wrangler` cli.

The name of the bucket will be `blog-cloudflare-listen` and the path to the blog posts will be `blogs`.

Each post will have the name of their url path, so to keep using or example from above, the path to the `audio and summary` files in the `R2` bucket for the "Cloudy Summarizations of Email Detections: Beta Announcement" will be:
- `/blogs/cloudy-driven-email-security-summaries/` in the `blog-cloudflare-listen` `R2` bucket

## Storing past articles (we can call it "cache")

We only need to fetch the HTML once, and generate an audio and summary once, after that they are stored in our R2 bucket. That means that the logic for rendering the article page needs to first check the `R2` bucket and only fetch the page and trigger the other two workflows if the files aren't found.

## Test page

I need you to make a test page, similar to the homepage, where I can enter a URL and the page will console log the logic of what's happening, like: article found in "cache" or "fetched article"

## Last considerations

Generally I'd outsource the generation of the audio and the summary to a queue or separate worker but I want to keep this application simple. Nonetheless I'd like to have a feedback on the test page like "audio file is ready now", which we could achieve with a websocket. So the client connects to the worker, the worker fetches the article and maps it to our react components and renders it as soon as it's ready. The websocket comes into play for the "Listen to this article" and "Read a summary" buttons on the page: they should be greyed out if the files aren't ready, and the websocket can tell the client when they're ready so they can activate.
