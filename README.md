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

- Paste/enter participant names
- Set number of teams and/or team size
- Generate teams
- Reshuffle/regenerate
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
