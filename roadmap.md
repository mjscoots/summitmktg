# Roadmap

## Pass 181 (done, commit fa5b771b)
- [x] Palette V6, Archivo type, TRNTY logo, centred cover, Who runs it, How pay is set
- [x] Append Pass 181 report to docs/FINAL_REPORT.md

## Pass 182
- [x] LogoBurst runs on every cover load (drop trnty_intro_seen gate)
- [x] Remove Estimate your earnings section and gated calculator from the cover
- [x] Colour audit below the hero (black, greys, white, one gradient element per section)
- [x] Hero eyebrow NOT ON A JOB BOARD., gradient redaction reveal, Get in button label
- [x] Verify and append Pass 182 report

## Pass 185
- [x] Replace pixel assembly and burst with 28/56 clipped vector shards
- [x] Separate the logo hero and statement into full-screen sections
- [x] Update statement, doors, and ticker copy
- [x] Remove Who runs it, pay, season, and work sections
- [x] Verify and append Pass 185 report

## Pass 187
- [x] Soften the hero to statement transition and add the scroll cue
- [x] Write the statement headline and supporting lines in sequence
- [x] Remove the cover ticker and move the industries line
- [x] Add bounded pointer drift to the logo, peak glow, and industry tiles
- [x] Stabilize and measure the question sheet at 390 and 1280
- [x] Verify performance, reduced motion, build, gzip, and append the report

## Pass 188
- [x] Remove pay content from the public application pages
- [x] One step by step flow on both routes with the end choice
- [x] Store experience and wants a call, redeploy the form handler
- [x] Verify, report, no publish

## Pass 189 - pay mechanics off public routes
- [x] Calculator renders removed from /recruiting and IndustrySwitcher
- [x] Pay copy scrubbed on /recruiting and /industries/:slug
- [x] /parents and /ticket left as is, every hit listed for the owner
- [x] /apply now redirects to /apply/rookie
- [x] Typecheck, build, browser sweep, baselines unchanged, report written

## Pass 190 - the cover seam
- [x] One surface: hero, statement and main paint nothing, world wrapper paints once
- [x] Grid masked over the last 25vh, canvas masked over its lower 30 percent
- [x] Light world tint is a falloff to pure white by 60vh, nav band no longer a bordered box
- [x] Statement centred with the space above the headline capped at 18vh and 20vh
- [x] Pixel proof at 390 and 1280, no surface step above 0.60 percent, report written

## Pass 191 - statement composition
- [x] Rebalance the setup, two-line payoff, single support note and button
- [x] Add the industry eyebrow and keep its lower-page instance
- [x] Put the cover nav in one 56px row at every width
- [x] Measure 360, 390, 430 and 1280, reduced motion and the Pass 190 seam
- [x] Typecheck, automatic production build and report, no publish

## Pass 192 - scroll statement and public palette
- [x] Drive every statement reveal directly from reversible section progress
- [x] Remove the statement eyebrow and change the payoff to SO WE JOINED / ALL THREE.
- [x] Replace public purple with blue, black and white without changing the signed-in app
- [x] Measure six progress checkpoints, four widths, reduced motion, frame cost and seam proof
- [x] Typecheck, automatic production build and report, no publish

## Rookie application admin handoff
- [x] Trace the public rookie form through the protected submission function to the admin Applications inbox
- [x] Allow the current preview, published Trinity URL and Trinity custom domains to submit
- [x] Deploy the submission function and verify the live handoff without creating an application

## Pass 193 - timed statement sequence
- [x] Replace scroll progress and sticky layout with a replayable six second timeline
- [x] Replace SVG handwriting with selectable text, soft masks and one shared animation frame loop
- [x] Add the two-layer blue button glow and reduced-motion fallback
- [x] Measure timing, frames, centring, seam, gzip and baselines; append the report
