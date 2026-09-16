# Rep progress dashboard

## What will change

### Rep Progress screen
Expand the existing **Progress** screen into the rep’s personal dashboard. Keep points, badges, and to-dos, then add:

- **Industry applications**: each Pest, Fiber, or Life application with status and submission date.
- **Earnings goal**: current saved goal, last updated date, and a direct action to set or update it.
- **My Resource links**: personal links the rep added, with add, edit, remove, and open actions.
- Clear empty states that send the rep to the correct next action.

The existing Progress links from each workspace home will continue to open this screen.

### Resources
Let every signed-in rep add personal links from Resources.

- Personal links are owned by their creator.
- A rep can view and manage only their own personal links.
- Owners can view every rep’s personal links for progress tracking.
- Existing company-managed Resource links and their current audience rules remain unchanged.
- Existing manager/admin/owner link controls remain available for shared company links.

### Owner Command Center
Add a **Rep Progress** section to Command Center with:

- Searchable rep rows showing name and current workspace.
- Industry application count and latest status.
- Earnings goal or “Not set”.
- Personal Resource link count.
- A compact completion indicator across the three areas.
- Expandable detail for a rep’s applications and personal links.

This view is owner/admin protected and uses the existing Command Center visual language.

## Access and data safety

- Add a link scope to Resources, defaulting all existing rows to shared so current behavior does not change.
- Require personal links to carry the signed-in rep’s ID.
- Add database access rules so reps cannot read or alter another rep’s personal links.
- Add a protected progress summary function for owners/admins; ordinary reps cannot retrieve team-wide progress.
- Reuse existing industry application and earnings goal records without changing their business rules.

## Technical details

- Extend `managed_links` with a shared/personal scope and enforce valid ownership through database rules.
- Update Resources inserts and edits to distinguish shared links from personal links.
- Add focused components for the rep progress summary and Command Center team table.
- Keep queries bounded and load expanded rep details only when requested.
- Verify signed-in rep ownership, owner visibility, empty states, mobile layout, desktop layout, reduced motion, and production build.

## Out of scope

- Original public job applications and team-lead applications.
- Resource-link click tracking.
- Notifications, compensation changes, or publishing.
