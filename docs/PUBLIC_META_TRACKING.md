# Public recruiting Meta placeholder

No pixel ID is configured and no Meta data is transmitted. The managed `.env` is untouched; `.env.example` contains a commented `VITE_META_PIXEL_ID=` placeholder. No GA4, GTM, CAPI or matching is installed.

## Wired moments
- PageView: public recruiting route navigation only; duplicate route effects suppressed.
- Lead: the existing application handler after `submit-application` succeeds, never partial capture, a rejected submission or the success-page render.
- SchedulingClick: use of Set up a call first or the existing ticket Calendly link. This is a custom click event, not proof of a booked appointment.

## Before activation
Add only a verified pixel ID. The no-banner route skips EEA/UK/Swiss and unknown regions, using a same-origin `/cdn-cgi/trace` lookup with a two-second timeout and host verification. Missing/failed trace blocks tracking. GPC and Do Not Track block all hits. No refused/blocked events are replayed. Private routes revoke tracking; they do not load a pixel or emit app events. No contact fields or custom URLs are passed as properties. PageView inherently exposes the visited URL to Meta: keep identifiers out of public URLs.

The owner chose “Skip tracking there” on November 10, 2026: no banner; consent-required and unresolved regions remain unmeasured. Before enabling, disclose Meta sharing and advertising purposes in the privacy notice, retain any consent evidence and withdrawal mechanism, check Events Manager dataset restrictions, disable automatic advanced matching in the pixel settings, and accept Meta Business Tools Terms. Ordinary tracking does not authorize matching or uploads.

## Verification boundaries
Local tests and mocked public application journeys verify wiring without creating applicants or sending emails. No-ID network silence is verified locally. Real submission-to-Meta transmission, provider receipt and attribution cannot be verified without the real ID, resolved consent setup and a separately authorized publish. The existing boot-cover remains in `index.html` for the next production publish; nothing is deployed by this task.