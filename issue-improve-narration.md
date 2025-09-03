# Improve narration

Currently the articles are being turned into audio fine, but the narration has timing issues (for example, missing pauses between a heading and the paragraph's content) and also the pronounciation of some words (like "LLM") make it hard to understand the word and the next word

## Solution proposal 1

The first thing I'd like to try is to pass the article as markdown to the TTS model, just to see if that has any effect in the quality of the output audio

## Solution proposal 2

Swap out the cloudflare aura-1 for one of the classic ones (eleven labs? does open ai have one? gemini flash 2.5 probably can do it too, not sure)

## Solution proposal 3

Are there STS models? Like, could I pass the synthesized audio to gemini flash and ask it to improve it (i.e. generate a new-, improved version)?
