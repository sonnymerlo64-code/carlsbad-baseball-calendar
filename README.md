# Carlsbad Baseball Calendar V15 — Bulk Game Upload

Coach Admin → **Import Games**. Download the Excel or CSV template, enter games, upload the completed file, review validation and matching, then confirm. Supports up to 500 games per import.

Fields: Date, Team, Opponent, Game Time, Arrival Time, Home/Away, Location, Address, Bus Departure, Uniform, Notes, Status.

- Date: YYYY-MM-DD (or MM/DD/YYYY)
- Times: 3:30 PM or 15:30.
- Teams: Varsity, JV, Frosh, JV/Frosh, All.
- Home/Away: Home, Away, Neutral, TBD.
- When location and address are empty, matches saved team address for Away, configured home field for Home, and Carlsbad High School fallback.
- A named venue with blank address matches the Saved Venues library.
- Preview flags invalid rows, duplicate games, unknown opponents, and missing venue addresses.
- Existing games are not overwritten. Duplicates are blocked by date/team/opponent/time.
- Warning rows may be imported after review; errors must be corrected in the spreadsheet.
- Existing game details remain editable individually in Coach Admin.

V15 adds npm `xlsx` dependency for client-side spreadsheet reading. Vercel will install it during build. No new environment variables are required.

**Deployment:** Unzip and upload project files to your GitHub repository. Verify Vercel shows Ready before using the import. Back up production database before bulk changes.

**Build validation:** Not verified locally; npm install timed out in this environment.

## V16: Away Game Indicator

Both public and Coach Admin month calendars display away games as **@ Opponent**. Home games retain the existing opponent-only label. Event details heading and downloaded calendar event summary also use the @ prefix for away games. The prefix is display-only: stored opponent names and spreadsheet imports are unchanged, so library matching continues to work. Case-insensitive Away detection; avoids doubled @ signs.


## V17: Select and Delete Multiple Events

Coach Admin → **Select Events**. Click event cards or check boxes in the list. Filter by the existing team selector, event type, optional date range, and navigate months. **Select All Matching** selects all matching events in the displayed month. **Clear Matching** and **Clear All** are provided. Click **Delete Selected** and confirm the permanent deletion. Coach Admin authentication is enforced server-side; up to 500 unique IDs can be deleted per operation. No changes to public calendar or event database schema.

## V18 — Print Calendar

Both the public calendar and Coach Admin include a **Print Calendar** link. This opens `/print`, where users can choose first and last months (up to 24 months), select All teams or one team, and click **Print / Save as PDF**.

- Landscape US Letter, one month per printed page
- Sunday–Saturday monthly grid with opponent, time, team, and @ for away games
- Team-specific colors and calendar break banners
- Print controls and admin editing controls hidden on paper
- Uses live `/api/events` data; no database migration or new environment variables
- Browser print dialog can save to PDF; turn on background graphics to preserve colors

Note: Dense dates with unusually many events may have text clipped to maintain a strict one-page-per-month layout. This release has not been validated by a complete Next.js production build in this environment.

## V19 — Layout fixes

- Coach Admin toolbar buttons are smaller and wrap cleanly on narrow screens.
- Print view hides the global site header, uses a bounded printable page area, and sizes the monthly grid by actual calendar week count.
- Print output remains landscape US Letter, one month per page.
- For Safari, turn off **Print headers and footers** in the print dialog.


## V21 — School library deletion and opponent address fill
- Manage HS Teams now shows Edit and Delete buttons for every saved school. Confirmation names the school and clarifies that existing games are retained.
- Deletion uses the existing admin-authenticated DELETE API and reports errors; only the school-library record is removed.
- Choosing a saved opponent immediately fills its saved field/location and address for Away or TBD. Home games retain the configured home venue. Changing Home/Away later still applies the correct field.
- Saved school address is displayed below the opponent selector, including a prompt when the record has no address.
- No database migration or environment changes.
