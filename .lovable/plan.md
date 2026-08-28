# Plan: Pass 117 — Chat Becomes WhatsApp

## Build

- Replace the room strip and separate DM screen with one fast conversation list containing every visible group and DM, ordered by activity and showing cover/avatar, name, sender-first-name preview, timestamp, and real unread badge.
- Open any row directly into the existing room data flow; the room header returns to the list and opens a member sheet with profile photos.
- Restyle the existing message renderer into compact left/right Summit-color bubbles with group sender names and avatars, day separators, tappable image lightbox, and a stable composer above the phone nav/keyboard.
- Preserve current messages, memberships, notifications, pagination, reactions, replies, attachments, typing, read state, and realtime subscriptions.

## Channel Covers and Security

- Add one nullable `cover_image_path` column to `chat_channels`; no new table.
- Store covers in the existing private chat upload storage and resolve them with short-lived signed URLs.
- Add authenticated RPCs for channel details/members and cover updates. Authorization stays inside the database: owner/admin may update any visible group; a team channel's current manager may update that team; existing vertical-manager scope is honored for vertical rooms. DMs use the other person's avatar and do not expose cover editing.
- Extend the existing conversation payload with the cover path and member summary so the client never broad-fetches people or channels.

## Visual and Responsive Rules

- Use only existing semantic tokens and Summit workspace accents, with finished light/dark states and no WhatsApp green.
- Keep rows and header actions at least 44px; use stable avatar, preview, badge, and timestamp tracks so content cannot shift or overflow from 390 through 1280px.
- Use a clean Summit-palette monogram whenever a group has no cover.

## Verification and Report

- Verify database totals remain 17 channels and 712 messages, cover authorization rejects unauthorized callers, and cover changes do not alter memberships or messages.
- With a real authenticated session, inspect list/unreads, room/member sheet, image lightbox, scroll/composer behavior, both themes, and 390/1280 widths with no console errors or horizontal overflow.
- Run TypeScript checking and the production build, then append `## Pass 117 — Chat` to `docs/FINAL_REPORT.md` in at most 10 lines. Keep preview-only and do not publish.

