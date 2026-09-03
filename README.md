# ONDES 70 — Vercel + Radio Caprice HTTPS audio proxy

## Why there are two services

Vercel hosts the ONDES 70 website and the short ICY metadata endpoint. The live Radio Caprice audio is relayed by a Cloudflare Worker because the Radio Caprice source URLs are HTTP and a Vercel-hosted HTTPS page cannot reliably play them directly. A Vercel Function is also not a good always-on audio relay because function executions have duration limits.

## 1. Deploy the ONDES 70 folder to Vercel

Upload these files to GitHub and import the repository into Vercel:

- `index.html`
- `package.json`
- `api/icy.js`

## 2. Deploy `worker.js` to Cloudflare Workers

Create a Worker in Cloudflare and paste the contents of `worker.js`.

Deploy it. Cloudflare will give you a URL similar to:

`https://ondes70-caprice-audio.<your-subdomain>.workers.dev`

## 3. Put the Worker URL into `index.html`

Find:

`var CAPRICE_AUDIO_PROXY = "https://YOUR-WORKER.workers.dev";`

and replace it with your actual Worker URL, for example:

`var CAPRICE_AUDIO_PROXY = "https://ondes70-caprice-audio.example.workers.dev";`

Commit the change to GitHub. Vercel will redeploy automatically.

## 4. Test

Open your ONDES 70 Vercel URL and select a Radio Caprice station.

The browser should now receive the audio over HTTPS from the Worker while the Worker fetches the original Caprice HTTP stream server-side.

### Important

The upstream Caprice IP addresses can change. The current worker uses:

- Space Music: `79.111.119.111:9105`
- Traditional Electronic: `79.111.14.76:9069`
- Experimental / Avant-Garde: `79.111.119.111:9109`
- Retrowave: `79.120.39.202:9125`

If Caprice changes an address, edit `STREAMS` in `worker.js` and redeploy the Worker.
