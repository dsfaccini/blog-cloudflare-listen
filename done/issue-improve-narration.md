# Improve narration

Currently the articles are being turned into audio fine, but the narration has timing issues (for example, missing pauses between a heading and the paragraph's content) and also the pronounciation of some words (like "LLM") make it hard to understand the word and the next word

## Solution proposal 1

The first thing I'd like to try is to pass the article as markdown to the TTS model, just to see if that has any effect in the quality of the output audio

## Solution proposal 2

Swap out the cloudflare aura-1 for one of the classic ones (eleven labs? does open ai have one? gemini flash 2.5 probably can do it too, not sure)

## Solution proposal 3

Are there STS models? Like, could I pass the synthesized audio to gemini flash and ask it to improve it (i.e. generate a new-, improved version)?

## First try: Solution 1

### Implementation

Created a TTS test page at `/tts-test` that allows side-by-side comparison of different text formatting approaches

- tried prepending "Heading:" to headings, didn't work
- tried adding ssml `<break time="200ms"/>` tags but aura-1 doesn't honor them
    - didn't wrap the whole text in `<speak>` tags, aura-1 supposedly doesn't support ssml so who knows
- adding a hyphen `—` works to create a pause (the model generates a breathing sound it seems...)
    - so I appended a hyphen to each heading and list item, and once before every list

### Summary

The real problem from headings and list items -- it seems -- is that the may miss a final period. aura-1 honors periods with a very short pause but doesn't do the same for line breaks.
