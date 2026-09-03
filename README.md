# ONDES 70 — Vercel

Project prepared for GitHub + Vercel.

## Files

- `index.html` — ONDES 70 site.
- `api/icy.js` — Vercel Serverless Function that reads ICY metadata from the four Radio Caprice streams used by the site.
- `package.json` — project metadata.

## Local test

From this folder:

```bash
npx vercel dev
```

Then open:

```text
http://localhost:3000/
```

Test an API endpoint:

```text
http://localhost:3000/api/icy?stream=radcap-space
```

## Deploy

1. Create a GitHub repository and upload this folder's contents.
2. In Vercel, import the GitHub repository.
3. Deploy with the default settings.
4. The site will be available at the Vercel URL.

The browser code already calls `/api/icy`, so no localhost URL needs to be changed.

## Important

Radio Caprice stream IPs can change. If a channel stops returning metadata, update `CAPRICE_STREAMS` in `api/icy.js` with the current stream URL.
