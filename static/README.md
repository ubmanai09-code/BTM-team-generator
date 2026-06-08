# BTM Team Generator — Static Edition

A self-contained, browser-only version of the BTM Team Generator.  
No Node.js, no build step, no database, and no installation required.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main UI page |
| `style.css` | Styles (matches the existing BTM branding) |
| `app.js` | All client-side logic (team generation, shuffling, clipboard export) |
| `README.md` | This file |

## How to use locally

Open `index.html` directly in any modern web browser (Chrome, Firefox, Edge, Safari).  
No web server is needed for local use.

## Deploying to Hostinger subdomain

### Option A — Hostinger File Manager (easiest)

1. Log in to your [Hostinger hPanel](https://hpanel.hostinger.com).
2. Go to **Websites → your domain → File Manager**.
3. Navigate into the subdomain folder, e.g. `domains/btm-team.ubtmapp.com/public_html/`.
4. Upload the three files:
   - `index.html`
   - `style.css`
   - `app.js`
5. Open `https://btm-team.ubtmapp.com` in a browser — it should work immediately.

### Option B — FTP / SFTP

1. Connect to your hosting using an FTP client (e.g. [FileZilla](https://filezilla-project.org/)).
2. Upload `index.html`, `style.css`, and `app.js` to the subdomain's `public_html` folder.
3. Done — visit the subdomain URL.

### Option C — Git + Hostinger auto-deploy (if enabled)

If your Hostinger plan supports Git deployment, you can point it at the `static/` folder as the deployment source.

## Features

- Paste or type participant names, one per line (commas and semicolons also work).
- Choose **by number of teams** or **by team size**.
- Generates randomly shuffled, evenly distributed teams in the browser.
- **Reshuffle** button regenerates with a new random seed.
- **Copy as text** exports all teams to your clipboard.
- Plain-text export area for manual copy-paste.
- Leftover participants (who don't fit into a full team) are listed separately.
- Duplicate names are automatically removed.

## What this version does NOT include

This static version intentionally omits the backend-only features of the full app:

- Skill score and fairness analytics (requires database + API).
- Persistent run history (requires database).
- Gender-balanced distribution enforcement (simplified to pure random shuffle).
- Manual overrides and team locking.

For those features, use the full `apps/web` + `apps/api` stack described in the main [README](../README.md).

## Browser support

Works in any modern browser (Chrome 80+, Firefox 75+, Edge 80+, Safari 14+).  
Uses no external libraries or frameworks.
