# Carlsbad Baseball Calendar V22 — safe repair

- Fix saved opponent selection to populate the saved school/field address even when Home/Away is TBD. Home uses the configured team home field; Away/TBD uses saved opponent information. Manually selected venues remain available.
- Saved school list has explicit Edit and Delete actions, with confirmation. Deleting a school does not delete existing events.
- **Critical data-safety fix:** removed the historical automatic seed routine that could DELETE all calendar events if a special marker was absent. Existing database rows are not changed or re-seeded by this release.
- No new database, project, or environment variables are created by this ZIP. The existing `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, and `GOOGLE_PLACES_API_KEY` must remain configured in the **original Vercel project**.
- Deploy to the **same existing Vercel project connected to the current working database**, not by creating a new Vercel project from an upload. Verify environment variable names (do not expose values) before deployment. Keep a backup.
- This ZIP has not undergone a full production build in this environment.

## V23 March layout fix
The public month grid now uses shrinkable equal-width columns and clips overflowing cards, with two-line opponent names. Busy days retain all event buttons without widening columns. No database or API changes.
