

## Sidebar Cleanup

**Changes to `src/components/layout/AppSidebar.tsx`:**

1. **Remove "Videos"** from the Learn section — Training already leads to video content, no need for a separate tab.

2. **Move "Resources"** from Learn → Tools section (renamed stays "Resources").

3. **Remove "Notepad"** from Tools section entirely.

**Resulting sidebar structure:**

```text
Home

▶ Learn
    Training

▶ Compete
    Leaderboard

▶ Community
    Community
    War Room        (manager only)

▶ Tools
    Forms           (manager only)
    Resources
    Calendar
```

Learn and Compete become single-item sections. Since they only have one item each, clicking the section header will still accordion-expand to reveal the single item — keeps the pattern consistent. No other files need changes.

