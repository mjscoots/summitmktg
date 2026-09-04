# Pass 168: Premium motion and feel

## Goal
Polish the existing Pass 167 experience without changing navigation, information architecture, permissions, data sources, or deployment state. All motion will become instant under `prefers-reduced-motion`.

## Implementation

### Chat room and composer
- Refine own bubbles with a workspace-accent two-stop gradient and inner top highlight; keep incoming/AI semantics while adding the requested subtle shadow.
- Animate only messages received after the room's initial load, and add reaction pop, pressed-bubble lift, blurred context-menu backdrop, and quick-react entrance states.
- Crossfade and scale the mic/send control, add consistent pressed states, restyle typing dots as a compact incoming bubble, and add the 44px scroll-to-bottom control with unread count.
- Capture the first unread message at room open, render the one-time divider, and retire it after the reader passes it.
- Add the restrained workspace glow and low-opacity grain above each existing wallpaper gradient without changing the room header.

### Chat list and bottom navigation
- Make conversation rows exactly 72px with 48px avatars, online treatment, pinned grouping, requested typography, unread treatment, and press feedback.
- Reuse the existing pinned/muted channel mechanisms discovered in the codebase; add preference storage only if no existing mechanism exists. Add swipe actions without changing room routing.
- Convert the six-item phone bar to the translucent rounded pill and animate one shared active indicator between tabs; retain Chat badge and composer-focus hiding.

### More, Settings, Home, and route feel
- Convert More and Settings sections to Radix Collapsible with animated height, rotating chevrons, 36px icon tiles, and visually distinct neutral Settings tiles.
- Add a shared premium Home hero to Pest, Fiber, and Life using only each page's already-loaded first name, streak, date, workspace, and period figure; omit any unavailable figure.
- Key AppLayout content by pathname for the 160ms route transition, tighten AppLayout page headings, enable tabular figures, and provide a restrained global press state for buttons/cards that do not already define one.

### Notification integrity
- Add one migration that removes notification insertion from `record_daily_login` while preserving login recording.
- Add a `BEFORE INSERT` trigger that skips duplicate non-null `(user_id, source_key)` notifications.
- Confirm the client streak writer remains the sole streak notification writer and checklist reminders retain `checklist:<date>:<half>` source keys. No historical deletion or permission expansion.

## Verification
- Validate authenticated chat, context menu, list, bottom bar, More, and Pest Home at 390px and 1280px, including computed dimensions and reduced-motion behavior.
- Read back database function/trigger definitions and run the duplicate-source-key proof inside a rollback.
- Confirm no copy drift, no emoji/em dash in newly added copy, baseline row counts, clean typecheck/build, and shell gzip within 6 KB of 197.3 KB.
- Append a precise Pass 168 section to `docs/FINAL_REPORT.md`, including data origins, observed values, dedupe delta explanation, and any honest verification limitations. Do not publish.
