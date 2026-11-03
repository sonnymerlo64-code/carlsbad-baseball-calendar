# Carlsbad Baseball Calendar V22 — safe repair

- Fix saved opponent selection to populate the saved school/field address even when Home/Away is TBD. Home uses the configured team home field; Away/TBD uses saved opponent information. Manually selected venues remain available.
- Saved school list has explicit Edit and Delete actions, with confirmation. Deleting a school does not delete existing events.
- **Critical data-safety fix:** removed the historical automatic seed routine that could DELETE all calendar events if a special marker was absent. Existing database rows are not changed or re-seeded by this release.
- No new database, project, or environment variables are created by this ZIP. The existing `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, and `GOOGLE_PLACES_API_KEY` must remain configured in the **original Vercel project**.
- Deploy to the **same existing Vercel project connected to the current working database**, not by creating a new Vercel project from an upload. Verify environment variable names (do not expose values) before deployment. Keep a backup.
- This ZIP has not undergone a full production build in this environment.

## V23 March layout fix
The public month grid now uses shrinkable equal-width columns and clips overflowing cards, with two-line opponent names. Busy days retain all event buttons without widening columns. No database or API changes.

## V24: March calendar layout correction

V23 only changed text wrapping, leaving grid rows to expand based on busy dates. V24 uses a fixed 124px height for each desktop calendar week row, with 26px weekday headings. Day cells scroll internally when they have more events than can fit. This keeps every event accessible without stretching entire weeks or cutting off March 30. The same calendar CSS applies to public and Coach Admin views. No data or database changes.

Test March 2027 in Safari: the five calendar week rows should be equal height. Scroll within March 8, 16, 18, 24, 26, or 30 to see all events. Mobile retains its existing compact view.


## V25 — compact month height
Reduces the fixed 124px week rows to viewport-aware rows capped at 104px, with internal day scrolling. Keeps the final week of March 2027 in view on common desktop heights. Each event remains clickable by scrolling inside a busy date. No database changes.
