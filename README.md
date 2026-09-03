# ONDES 70 — paquet final Radio Caprice

Aquest paquet deixa preparat ONDES 70 per funcionar amb les emissores Radio Caprice en una web HTTPS.

## Fitxers

- `index.html` — web ONDES 70, sense canvis visuals.
- `api/icy.js` — lectura de metadades ICY de Radio Caprice.
- `worker.js` — proxy d'àudio HTTPS per a les 4 emissores Caprice.
- `vercel.json` — configuració de la funció de metadades.
- `package.json` — configuració mínima de Vercel.

## ÚNIC PAS QUE FALTA

El proxy d'àudio ha de viure en un Cloudflare Worker. El fitxer `worker.js` ja està complet i preparat.

1. Crea un Cloudflare Worker nou.
2. Enganxa-hi íntegrament `worker.js` i fes **Deploy**.
3. Cloudflare et donarà una adreça `https://....workers.dev`.
4. Substitueix aquesta línia de `index.html`:

   `var CAPRICE_AUDIO_PROXY = "https://ondes70-caprice.digitalformacio.workers.dev";`

   per l'adreça real del Worker.
5. Puja `index.html`, `api/icy.js`, `vercel.json` i `package.json` a GitHub/Vercel.

No cal executar cap servidor Node al Mac.

## Canals configurats

- Space Music → `http://79.111.119.111:9105/`
- Traditional Electronic → `http://79.111.14.76:9069/`
- Experimental / Avant-garde → `http://79.111.119.111:9109/`
- Retrowave → `http://79.120.39.202:9125/`

El Worker retorna el flux sense emmagatzemar-lo sencer; Cloudflare documenta aquest patró de streaming directe del `response.body`. citeturn0search0turn0search5

## Important

No s'ha modificat el disseny visual de la web. L'única configuració funcional pendent és indicar a `index.html` la URL concreta del Worker que Cloudflare genera en fer el Deploy.
