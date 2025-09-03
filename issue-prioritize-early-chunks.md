# Prioritize early chunks

- Empirically it seems each chunk of length 1250 is equivalent to roughly 50-60 seconds of audio.
- The first 2-3 chunks always seem to come through
- But beyond that they start failing and require a retry after some time
- The way we are processing chunks it happens that chunks 4,5 and 6 may get processed first
- Leaving the user waiting for chunk one

## Solution proposal

If we deterministically send the first chunks first we'll have content earlier that the user can listen to while the server hopefully gets the missing chunks before the user runs out of audio. If we do it this way we can actually send them 3 at a time, leaving missing chunks on purpose so the next GET call will trigger the generation of the missing ones. This is different from forcing Workers AI to reject our call and retrying, because we're voluntarily only sending the 3 earliest missing chunks on each call.

## Decision

We'll do it this way bc it will ensure users getting their audio faster.
