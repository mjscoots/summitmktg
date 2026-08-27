# Go / No-Go — publish readiness

Written for the owner. Last checked 26 August 2026. Nothing in this document has been
published.

---

## 1. Verdict

**Not yet — because of two things only you can do.** A full regression check on 26 August
re-ran the five everyday actions (new account, chat message, public application, fiber
install, pest sale), the invite link end to end, and every rebuilt screen at phone and
desktop width. Everything passed and all test records were deleted afterwards, so the
counts are back where they started. The code compiles clean, the production build has one
file at 210 kB and nothing larger, no screen scrolls sideways at any width from 390 to
1280 pixels, and no table in the database is readable without the right permission. Two
small faults were found and fixed during the check: logging a fiber install failed on a
missing note field, and the Fiber team roster was asking the database the wrong question.
What is still not ready is *email* and *one person's access*. Every email — welcome
messages, application approvals, calendar notices, the weekly owner report — goes out from
a shared Resend test address that Resend only delivers to your own inbox. And Mathew
Rubino is listed as the lead of Summit Pest with no role assigned, so he cannot use the
tools that job needs. Fix those two and the app is ready to publish. The credit spend for
this work is tracked outside the app.

---

## 2. What changed since the last published version

- **The name.** The organisation is Summit Trinity; day to day the app says Summit. The
  new three-peak wordmark is on every screen, the login page and the phone icon.
- **Invites replace sign-up.** Nobody creates their own account any more. An admin or a
  manager sends one link; the link sets the person's industry, team, region and manager.
- **One design system.** Dark, sharp, high contrast, one type family, one set of colours.
- **Home rebuilt.** The screen a rep opens ten times a day: today's number, the week, the
  goal, their streak, what needs them, and the next event.
- **Chat is one room, not a list.** It opens straight into your team room, with the other
  rooms and direct messages on a strip across the top.
- **The other tabs rebuilt.** Leaderboard with a podium, missions as cards, team as
  people, and money, playbook and profile all in the same look.
- **Each industry looks like itself.** Pest, Fiber and Life have their own tabs, their own
  texture and their own home screen; switching swaps the whole app at once.
- **The front door.** Public home, industry pages and both application forms rebuilt, with
  no invented numbers and a top accessibility score.
- **My money, every industry.** One screen with an All tab plus Pest, Fiber and Life.
  Anything you have not set reads "Not set" rather than guessing.
- **Fiber pay loaded from your v5 scale.** 13 carriers, 80 confirmed rows, 10 per cent
  holdback released at 90 days. Public publishing stays off until you switch it on.
- **Elijah Hughes has left.** Last day 26 August, archived, and his accounts are in the
  lead pool.
- **Brandon Pillar** is the East region lead and still needs an invite or a password reset
  from you before he can sign in.

---

## 3. Things only you can do

Each item says where to click and what happens if you leave it.

### Blocking — do these before publishing

- [ ] **Email sender.** Either verify `summitmktgsales.com` in Resend, or add a secret
  named `RESEND_FROM_EMAIL` in Project Settings → Secrets set to an address on a domain
  you have already verified.
  *If you do nothing:* every email the app sends goes out from
  `onboarding@resend.dev`, which Resend only delivers to your own Resend account email.
  New reps get no welcome email, applicants get no approval email, nobody gets calendar
  notices, and the weekly owner report never arrives.

- [ ] **Mathew Rubino's access.** Admin → Team → Restore access, and give him the
  **Industry lead** role for Pest (or replace him as the Pest lead).
  *If you do nothing:* he is shown as the lead of Summit Pest but cannot open the admin
  screens, approve anything, or see his industry's numbers.

### Strongly recommended

- [ ] **Login code length.** Set the one-time email code length to 8. This is a Lovable
  Cloud auth setting; ask for it to be changed if you cannot reach it yourself.
  *If you do nothing:* login codes stay shorter than recommended. Low risk, but it is the
  one security warning in the report that is a genuine setting rather than by design.

- [ ] **Fiber region leads.** Neither Fiber East nor Fiber West has a region lead.
  Admin → Settings → Regions.
  *If you do nothing:* Fiber reps have no region lead and the region picker shows a gap.

- [ ] **Brandon Pillar's account.** He is on the roster as a Fiber rep with no region
  lead role. Send him an invite link from Admin → People → Invite, or reset his password
  from Admin → Team, so he can sign in himself.
  *If you do nothing:* he cannot get into the app.

- [x] **Fiber per-install values.** Loaded from v5, Aug 2026: 13 carriers, 80 confirmed
  rows. Publishing stays off, so nothing shows publicly until you switch it on in
  Admin → Money → Fiber.

- [ ] **Fiber and Life setup steps.** Fiber's path has 4 steps and Life has 1, and
  neither is marked configured. Admin → Industries → the industry → mark configured and
  publish the Fiber path.
  *If you do nothing:* Fiber and Life reps see an incomplete first-day sequence.

- [ ] **Pest tier rules.** 16 rank requirements and 4 ladder rungs exist. Confirm they
  match the Manager Manual. Admin → Money → Ranks.
  *If you do nothing:* reps may see the wrong threshold for their next tier.

- [ ] **Season goal.** Currently **$9,000,000**, noted as "Set from coaching notes — edit
  anytime." Admin → Settings.
  *If you do nothing:* that figure shows on the season screen as the company target.

- [ ] **Custom domain.** The app publishes to `summitmktg.lovable.app`. To serve
  `summitmktgsales.com`, connect it in Project Settings → Domains and add the DNS records
  that screen gives you.
  *If you do nothing:* the app is only reachable at the `lovable.app` address.
  You must also add the custom domain to the list of allowed sign-in redirect addresses,
  or password resets and email confirmations sent from that domain will be rejected.

### Optional — leave blank and the app just hides that number

- [ ] `fiber_expense_allowance_per_install`, `fiber_holdback_percent`,
  `summit_stack_fiber_sonic`, `summit_stack_fiber_surf` — all currently blank.
- [ ] `vertical_lead_margin` — currently **50**.
- [ ] `public_fiber_starting_rate` — blank, so the public Fiber page shows no rate.
- [ ] `under_led_min_revenue` — not set.
- [ ] **Life industry lead** — currently nobody; Life is marked "coming soon".
- [ ] **Who sees pay figures.** `stack_visibility` = *direct leader only*,
  `show_stacks_to_rookies` = **off**, `publish_stacks_publicly` = **off**.
  These three are why no dollar amounts appear on the public industry pages today.
- [ ] **Lead cycling.** On, 14-day default, maximum 25 open designated leads per manager.
  Admin → Settings.
- [ ] **Default phone visibility.** Currently **team only** for everyone. Each person can
  change their own in their profile.
- [ ] **Seasonal insects pricing page.** Not loaded into the Field Playbook. Everything
  else in your material is in, word for word. Send that page and it gets added.
- [ ] **Life setup path.** Written as four draft steps and left unpublished on purpose.
  Settings → Industries → Life when you want reps to start on it.
- [ ] **Monday email digest.** Built and scheduled, but no email leaves the app until the
  sender above is set. Managers can still open My Week any time.


### One test worth doing yourself

- [ ] **Two-phone smoke test with one rep.** On two phones: send a chat message with a
  photo and confirm it appears on the other phone; RSVP to an event card; search for a
  manager in chat and tap the phone number to call; open Ask Summit, ask something,
  leave, come back and confirm the same thread is still there.

---

## 4. Known limitations that ship as-is

- **313 database linter items, and that is expected.** 292 of them say "a signed-in user
  can call this function", and 19 say "anyone can call this function". These functions
  *are* the app's own interface to its data, and every one of them checks the caller's
  role before returning anything. The 19 open ones are the public pages: the landing
  calculator, industry pages, ticket page, application forms. Since Pass 71A one more is
  deliberately open — `redeem_invite`, which lets a person open an invite link and claim
  their spot before they have an account; it checks the token, its expiry and its use
  count before doing anything. One further item notes a
  table with no policies (`backup_job_tokens`), which is correct — nobody but the backup
  job should ever read it. The last is the login code length in section 3.
- **A React warning in the browser console during development.** It does not appear in
  the published build and has no effect on anything.
- **Two first-day sequences were never walked through as a live signed-in user:** the
  Fiber industry lead's first day, and a Fiber rep's day one. The screens exist and were
  checked individually; the end-to-end run was not captured.
- **Recurring events post one chat card per stored occurrence.** If a weekly meeting has
  twelve stored dates, chat shows twelve cards rather than one repeating card.
- **AI rep profiles are thin until reps generate activity.** 26 profiles exist now. A rep
  with little chat, training, or event history gets a short profile, and that is correct
  behaviour — the profile only states what the data shows.
- **Multi-person flows were verified through the database rather than two live browsers.**
  Only one signed-in preview session can be restored at a time in the build environment,
  so manager-and-rep interactions were proven by running the same calls as each person
  against the real rules, with throwaway accounts that were then deleted.
- **Performance on the preview address scores low; the published address will not.** The
  preview serves unminified files with the editing toolbar attached. The published build
  is 192 kB for the main file with no file over 200 kB.

---

## 5. How to publish, how to roll back, what to watch

### Publishing

Press **Publish** in the top right. It takes about a minute. The app appears at
`summitmktg.lovable.app`. If you have connected the custom domain, allow a few extra
minutes for it.

### Rolling back

- **Code:** open version history and revert to the previous version, then publish again.
  This is instant and safe.
- **Database:** database changes are not undone by reverting code. If a database change
  needs reversing, ask for it explicitly and describe what to put back — do not revert
  code and assume the data followed.
- **A bad setting:** every item in section 3 is a setting you can change back in the app
  without publishing again.

### First 24 hours — where to look

| What to check | Where |
| --- | --- |
| Applications arriving | Admin → Applications, and your notification bell |
| Chat photos loading | Open a chat with an image on a phone, not just desktop |
| Event card RSVPs | Events → an upcoming event → attendance count |
| Weekly owner report email | Your inbox on Sunday evening; if nothing arrives, section 3's email item is why |
| Nightly jobs ran | Admin → Reports; the rep profiles and lead cycling both run overnight and have not yet had a first run |

### Scheduled jobs and their state

| Job | Runs | Last run |
| --- | --- | --- |
| Event reminders | every 15 min | succeeded |
| Notification digest | every 30 min | succeeded |
| Bootcamp reminders | hourly | succeeded |
| Bootcamp overdue check | hourly | succeeded |
| Pairing request sweep | hourly | succeeded |
| Action item due | daily 13:05 UTC | succeeded |
| Inactivity check | daily 17:00 UTC | succeeded |
| Event series expansion | daily 03:17 UTC | succeeded |
| **Rep AI profiles** | daily 10:40 UTC | **not yet run** |
| **Stale lead cycling** | daily 10:50 UTC | **not yet run** |
| Weekly champion notice | Mondays 08:05 UTC | succeeded |
| **Weekly owner report** | Sundays 22:05 UTC | **not yet run** |
| **Weekly awards** | Sundays 22:05 UTC | **not yet run** |
| **Weekly backup** | Sundays 09:20 UTC | **not yet run** |

The five marked "not yet run" are all recent additions whose first scheduled time has not
come round yet. Check them on the day after publishing.
