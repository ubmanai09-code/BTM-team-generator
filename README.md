# BTM Team Generator (Static)

This repository now uses a **static HTML/CSS/JavaScript app as the main deployment path**.

## Recommended Deployment (Hostinger subdomain)

Deploy by direct file upload to your subdomain (for example `btm-team.ubtmapp.com`):

1. Open your Hostinger file manager for the target subdomain.
2. Upload these files from this repository root:
   - `index.html`
   - `style.css`
   - `app.js`
3. Ensure `index.html` is in the web root for the subdomain.
4. Open your subdomain URL and use the app.

No Node runtime, no build step, no backend, and no database are required.

## In-browser workflow

The static app supports:

- Paste/enter participant names manually
- Import participants from CSV and map columns:
   - Name ID (required)
   - Average Score (required for balanced mode)
   - Gender (optional, used for female cap rule and gender stats)
- Choose input source: manual only, CSV only, or merged manual + CSV
- Show import stats: total players, female, male, other/unknown
- Set persons per team
- Automatically calculate possible number of generated teams
- Set optional gender rule (max females per team)
- Set optional max deviation between teams (average score gap)
- Generate teams in Random or Balanced mode (balanced uses average score)
- Reshuffle/regenerate
- Manage teams after generation: edit player, move player, remove player
- Save snapshot to browser storage
- Copy results
- Export results as text (`.txt`)

## Local preview (optional)

You can open `index.html` directly in a browser, or run a simple local static server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Legacy implementation (fallback)

The previous Node/Next/Express/Prisma monorepo is preserved in [`legacy/`](legacy/) for fallback use.
