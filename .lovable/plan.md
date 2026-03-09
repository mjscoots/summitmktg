

## Sidebar Accordion Navigation

**What changes**: Convert the sidebar section headers (Learn, Compete, Community, Tools) into clickable accordion toggles. Only one section expands at a time — clicking a new one collapses the previous. This keeps the sidebar ultra-compact.

### Approach

**Single file change** — `src/components/layout/AppSidebar.tsx`:

1. Add `openSection` state (`string | null`), defaulting to whichever section contains the current route (so the active page's group is always open on load).

2. Replace the static `SidebarGroupLabel` with a clickable button that toggles `openSection`. Add a small chevron icon that rotates when open.

3. Wrap the `SidebarGroupContent` for each section in a conditional render (`openSection === section.title`), with a smooth height transition using Radix `Collapsible` (already installed).

4. When collapsed (icon-only mode), skip the accordion behavior — just show icons for all items as today, since there are no labels to toggle.

5. Auto-open logic: use a `useMemo` that checks `location.pathname` against all section items to determine which section should default open. Update on route change so navigating always reveals the active item.

6. Sections with badges (Community chat unread, Tools calendar RSVP) will show the badge dot on the section header when collapsed, so notifications remain visible.

### Visual result

```text
  ▶ Learn            (collapsed)
  ▼ Compete          (expanded)
     Leaderboard ●
  ▶ Community    2   (badge on header)
  ▶ Tools
```

No new files, no new dependencies. Purely a UI behavior change in the existing sidebar component.

