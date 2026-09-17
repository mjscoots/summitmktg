# Pass 220 — Front-door application flow

## Goal
Make the homepage immediately explain the opportunity and offer a working application path, while preserving the existing logo assembly, shard flight, burst, statement sequence, appearance fix, and lower-page content.

## Changes
- Add a first-paint cover message above the animation layer:
  - Headline: **“Pest control. Fiber internet. Life insurance.”**
  - Supporting line: **“Where being a sales rep is not the end goal.”**
  - Button: **“Get in”**, linking to `/apply/rookie`.
- Rename the first scroll cue from **“Scroll”** to **“See all three”** so it names the next content.
- Add a fixed public header action, **“Apply”**, beside **“Sign in”**, linking to `/apply/rookie`.
- Use one shared public header across public-facing recruiting and application pages so the action remains fixed while scrolling. Redirect-only screens will remain redirect-only; signed-in app screens are unchanged.
- Remove timer-dependent visibility from the statement CTA. Keep its existing DOM position and visual treatment, but make it visible and hit-testable whenever the statement screen is present.
- Keep the final apply-band CTA permanently present and hit-testable; do not place it under reveal opacity rules.

## Protected behavior
- Do not alter the logo component, shard paths, assembly timing, fill timing, burst timing, or mountain scene.
- Do not change signed-in navigation, authentication behavior, application logic, data, theme tokens, leads, or chat.
- Make no database writes.

## Measurement and proof
- Capture the pre-change and post-change visible cover-stage strings at 1280×900 and 390×844 with no interaction.
- At both sizes, verify the first-screen apply button is returned by `elementFromPoint` at 0, 200, 1000, and 4000 ms after load.
- At both sizes, verify the header Apply button and Sign in link are each topmost at scroll 0, 400, 1200, and 2400.
- Sweep the cover from 0 to the foot in 100 px steps at both sizes and in dark and light appearance; record the first statement latch position, prove it stays latched through the sweep, and remains latched after returning to the top.
- Measure horizontal overflow for the first-screen message and header at 390 px; both must equal 0.
- Open each homepage apply entry point once (first screen, header, statement, final band), confirm `/apply/rookie`, and confirm the application form renders.
- Confirm `people_leads = 1379`, `chat_messages = 717`, and `chat_reactions = 155` before and after, without writes.
- Check preview build/runtime signals and report any failed measurement plainly.
