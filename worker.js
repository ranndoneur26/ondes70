/**
 * ONDES 70 — Cloudflare Worker audio proxy for Radio Caprice.
 *
 * Deploy this file as a Cloudflare Worker. It exposes HTTPS endpoints:
 *   /stream/radcap-space
 *   /stream/radcap-traditional
 *   /stream/radcap-concrete
 *   /stream/radcap-retrowave
 *
 * The worker relays the live audio stream without buffering the whole response.
 * It exists because a Vercel Serverless Function is not a suitable always-on
 * audio relay: Vercel documents execution-duration limits for functions.
 */

const STREAMS = {
  'radcap-space': 'http://79.111.119.111:9105/',
  'radcap-traditional': 'http://79.111.14.76:9069/',
  'radcap-concrete': 'http://79.111.119.111:9109/',
  'radcap-retrowave': 'http://79.120.39.202:9125/'
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Icy-MetaData, Accept, Origin, User-Agent',
  'Access-Control-Expose-Headers': 'Content-Type, Content-Length, Icy-MetaInt, Icy-Name, Icy-Genre, Icy-Br, Icy-Url, Accept-Ranges, Content-Range'
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    const match = url.pathname.match(/^\/stream\/([^/]+)\/?$/);
    if (!match) {
      return new Response(JSON.stringify({
        ok: true,
        service: 'ONDES 70 Radio Caprice audio proxy',
        streams: Object.keys(STREAMS)
      }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const channel = match[1];
    const target = STREAMS[channel];
    if (!target) {
      return new Response('Unknown Radio Caprice channel', { status: 404, headers: CORS });
    }

    try {
      const upstreamHeaders = new Headers();
      upstreamHeaders.set('Icy-MetaData', '1');
      upstreamHeaders.set('User-Agent', 'ONDES70-AudioProxy/1.0');
      const range = request.headers.get('Range');
      if (range) upstreamHeaders.set('Range', range);

      const upstream = await fetch(target, {
        method: 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
        cf: { cacheTtl: -1, cacheEverything: false }
      });

      if (!upstream.ok && upstream.status !== 206) {
        return new Response(`Upstream Radio Caprice error: HTTP ${upstream.status}`, {
          status: 502,
          headers: CORS
        });
      }

      const headers = new Headers(CORS);
      const passthrough = [
        'content-type', 'content-length', 'icy-metaint', 'icy-name',
        'icy-genre', 'icy-br', 'icy-url', 'accept-ranges', 'content-range'
      ];
      for (const name of passthrough) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }

      // Do not buffer: pipe the live body directly to the browser.
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers
      });
    } catch (error) {
      return new Response(JSON.stringify({
        ok: false,
        error: String(error && error.message ? error.message : error)
      }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }
};
