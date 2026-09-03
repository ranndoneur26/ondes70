'use strict';

// ONDES 70 — Vercel Serverless Function for Radio Caprice ICY metadata.
// The browser calls /api/icy?stream=radcap-space (etc.).
// The function opens a short-lived ICY connection, reads the first metadata
// block it receives, and returns it as JSON. No persistent Node server is needed.

const CAPRICE_STREAMS = Object.freeze({
  'radcap-space': 'http://79.111.119.111:8000/spacemusic',
  'radcap-traditional': 'http://79.111.14.76:9069/',
  'radcap-concrete': 'http://79.111.119.111:9109/',
  'radcap-retrowave': 'http://79.120.39.202:9125/'
});

// Keep the function short-lived. The browser polls again if no metadata arrives.
module.exports.config = { maxDuration: 10 };

function parseIcyText(buffer) {
  const text = buffer.toString('utf8').replace(/\0/g, '').trim();
  const out = {};
  const re = /([A-Za-z][A-Za-z0-9]*)='((?:[^']|'')*)';/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2].replace(/''/g, "'");
  return out;
}

function splitStreamTitle(streamTitle) {
  if (!streamTitle) return { artist: '', title: '' };
  const s = String(streamTitle).trim();
  const sep = s.indexOf(' - ');
  if (sep > 0) {
    return { artist: s.slice(0, sep).trim(), title: s.slice(sep + 3).trim() };
  }
  return { artist: '', title: s };
}

function normaliseMetadata(channel, fields) {
  const streamTitle = String(fields.StreamTitle || fields.streamTitle || '').trim();
  const split = splitStreamTitle(streamTitle);
  const artist = String(fields.Artist || fields.artist || split.artist || '').trim();
  const title = String(fields.Title || fields.title || split.title || '').trim();
  const album = String(fields.Album || fields.album || '').trim();
  if (!artist && !title) return null;
  return {
    channel,
    artist,
    title,
    album,
    streamTitle,
    updatedAt: new Date().toISOString()
  };
}

async function readFirstIcyMetadata(response, channel) {
  const metaInt = Number(response.headers.get('icy-metaint') || 0);
  if (!metaInt || !response.body) {
    throw new Error('Stream did not return icy-metaint');
  }

  const reader = response.body.getReader();
  let audioRemaining = metaInt;
  let metadataLength = null;
  let metadataRemaining = 0;
  const metadataParts = [];

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw new Error('ICY stream ended before metadata');
      let buf = Buffer.from(value);
      let offset = 0;

      while (offset < buf.length) {
        if (audioRemaining > 0) {
          const take = Math.min(audioRemaining, buf.length - offset);
          offset += take;
          audioRemaining -= take;
          if (audioRemaining > 0) continue;
        }

        if (metadataLength === null) {
          if (offset >= buf.length) break;
          metadataLength = buf[offset] * 16;
          offset += 1;
          metadataRemaining = metadataLength;
          metadataParts.length = 0;

          if (metadataRemaining === 0) {
            metadataLength = null;
            audioRemaining = metaInt;
          }
          continue;
        }

        if (metadataRemaining > 0) {
          const take = Math.min(metadataRemaining, buf.length - offset);
          metadataParts.push(buf.subarray(offset, offset + take));
          offset += take;
          metadataRemaining -= take;
          if (metadataRemaining > 0) continue;
        }

        const fields = parseIcyText(Buffer.concat(metadataParts));
        const metadata = normaliseMetadata(channel, fields);
        if (metadata) return metadata;

        metadataLength = null;
        metadataParts.length = 0;
        audioRemaining = metaInt;
      }
    }
  } finally {
    try { await reader.cancel(); } catch (_) {}
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const channel = String((req.query && req.query.stream) || '').trim();
  const target = CAPRICE_STREAMS[channel];

  if (!target) {
    return res.status(400).json({ ok: false, error: 'Unknown Radio Caprice channel' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'ONDES70-ICY-Metadata/1.0'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const metadata = await readFirstIcyMetadata(response, channel);
    clearTimeout(timer);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ ok: true, channel, metadata, error: null });
  } catch (err) {
    clearTimeout(timer);
    const message = err && err.name === 'AbortError'
      ? 'No ICY metadata received within 8 seconds'
      : String(err && err.message ? err.message : err);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ ok: false, channel, metadata: null, error: message });
  }
};
