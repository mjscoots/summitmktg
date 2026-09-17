# Pass 222 — Kill the blank first paint

## Goal
Show the real homepage message and working application link from the initial HTML response, then hand off cleanly to the animated cover.

## Changes
- Import the landing page eagerly while leaving every other route split as-is.
- Add a black, inline-styled static first screen outside the app root in `index.html` containing the existing headline, supporting line, and a real `/apply/rookie` anchor.
- Remove the static first screen only after the landing cover mounts. Other routes will remove it as the app starts so it never covers their content.
- Preserve the proof lines, public header, first-screen wording, cover animation, logo assembly, shard flight, burst, mountain scene, auth, chat, and leads.

## Technical details
- React will continue mounting into the empty `#root`; it will not hydrate the static markup.
- The static block will match the mounted cover's viewport geometry and black surface to avoid duplicate copy, background flash, and layout movement.
- The handoff will be measured under deterministic request throttling, including DOM counts during the swap.

## Verification
- Compare raw HTML source before and after, including matching source lines for both strings and the apply anchor.
- Measure cold-navigation time until an apply link is hit-testable using the same repeatable slow-network profile before and after.
- Capture static and mounted screenshots at 1280×900 and 390×844; count headline matches before, during, and after handoff and require a maximum of one.
- Sample body/background colors at static and mounted stages; measure static and mounted overflow at 390px.
- Re-run header Apply and Sign in checks at four scroll positions on both viewports, plus Get in at 0/200/1000/4000ms.
- Re-run dark/light latch sweeps at both viewport sizes, confirm the live proof line remains visible, and confirm row counts remain 1379/717/155 with no writes.
