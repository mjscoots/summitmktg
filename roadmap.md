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

## Pass 194 - statement bug fixes
- [x] Prove and remove the handwriting first-paint flash
- [x] Start once at 60 percent statement visibility and preserve replay on return
- [x] Keep the mountain scene mounted and active through the statement
- [x] Capture both widths, measure frames and seam, append the report

## Pass 195 - burst to writing handoff
- [x] Replace the live blur swell with a pre-painted radial edge and transform-only scale
- [x] Start the guarded statement clock with the burst and retime the sequence
- [x] Capture the first 1400ms and full monotonic sequence at both widths
- [x] Measure burst frames, seam, reduced motion, gzip and baselines; append the report

## Pass 196 - Resources page
- [x] Audience gate on managed_links made real
- [x] category column added and Links tab grouped
- [x] Sixteen operating resource rows inserted
- [x] tel: links tappable
- [x] Report in docs/FINAL_REPORT.md
- [x] Pass 197: single pinned cover stage, burst at s 0.34, type polish, report

## Pass 198 - faster fixed opening
- [x] Reserve all four statement blocks from frame one
- [x] Shorten the stage and retime the sequence
- [x] Replace the mask and dot with per-character handwriting
- [x] Verify motion, layout, surface, reduced motion and baselines; append the report

## Pass 199 - typed setup and brand slam
- [x] Replace the statement with two stable phases and continuous character typing
- [x] Add the character shatter, brand impact and final composition
- [x] Shorten pinned travel and trigger the question sheet immediately after exit
- [x] Verify timing, layout, motion, accessibility and baselines; append the report

## Pass 200 - cover repair
- [x] Fix the shatter variable cycle and guarantee phase isolation
- [x] Group typed words, remove the caret and rebuild the scroll cue
- [x] Retune the sequence and add the scroll-linked statement exit
- [x] Verify the cover and append the report

## Pass 201 - permanent statement section
- [x] Move the statement out of the pinned cover into normal document flow
- [x] Start the sequence once from statement visibility and latch its final state
- [x] Remove the scroll-linked exit and give the latched statement its own white surface
- [x] Verify scrolling, motion, reduced motion and baselines; append the report

## Rep progress dashboard
- [x] Show each rep their industry applications, earnings goal and personal Resource links
- [x] Let reps add and manage their own personal Resource links
- [x] Add the owner team progress view to Command Center
- [x] Apply ownership-safe access rules and verify rep and owner views


## Pass 202 - statement timing, fit and onward cue
- [x] Sweep every requested width and both heights before and after the fit repair
- [x] Retune the statement clock and prove the 1500ms still hold
- [x] Add and verify the one-way statement scroll cue
- [x] Verify latch, reduced motion, frame cost, build, gzip and baselines

## Pass 203 - hero logo inversion
- [x] Replace the shared tint with synchronized blue-letter and white-mountain fills
- [x] Verify fill colors, shard seams, reverse behavior and burst inheritance
- [x] Verify contrast, frame cost, build, gzip and baselines

## Pass 204 - statement layout, arrival and finish
- [x] Separate fixed typing and final-composition zones
- [x] Fit both typed lines to one line after fonts load
- [x] Shorten the stage and start the statement sooner
- [x] Add the static three-layer ridgeline floor
- [x] Replace character debris with one block exit
- [x] Stagger the brand impact and limit the button glow
- [x] Verify viewport fit, timing, latch, reduced motion and baselines
- [x] Keep the site unpublished
