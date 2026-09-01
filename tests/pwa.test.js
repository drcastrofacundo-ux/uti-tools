'use strict';

// Protege la PWA de la forma en que se rompe sola: alguien agrega una
// calculadora nueva, se olvida de sumarla a la precarga del service worker, y
// nadie se entera hasta que un colega la abre sin senal en una guardia.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const sw = leer('sw.js');
const registrador = leer('registrar-sw.js');
const manifest = JSON.parse(leer('manifest.webmanifest'));

// Archivos que se sirven al navegador pero no forman parte de la app.
const FUERA_DE_LA_APP = new Set(['robots.txt', 'sitemap.xml', '_headers']);

// --- La precarga cubre todo lo que se sirve ---------------------------------

const precarga = new Set(
  [...sw.matchAll(/^\s*'(\/[^']*)',/gm)].map(([, url]) => url),
);

const servidos = fs
  .readdirSync(raiz)
  .filter((f) => /\.(html|js)$/.test(f) && !FUERA_DE_LA_APP.has(f) && f !== 'sw.js');

for (const archivo of servidos) {
  assert.ok(
    precarga.has(`/${archivo}`),
    `${archivo} se sirve pero no esta en la precarga de sw.js: no funcionaria sin senal`,
  );
}

// --- Lo que la precarga declara existe en disco -----------------------------

for (const url of precarga) {
  if (url === '/') continue; // alias de /index.html
  assert.ok(
    fs.existsSync(path.join(raiz, url.replace(/^\//, ''))),
    `sw.js precarga ${url}, que no existe en disco`,
  );
}

// --- Los iconos del manifest existen ----------------------------------------

for (const icono of manifest.icons) {
  assert.ok(
    fs.existsSync(path.join(raiz, icono.src.replace(/^\//, ''))),
    `El manifest declara ${icono.src}, que no existe en disco`,
  );
}

// Android recorta el icono a un circulo; sin uno maskable queda con un marco
// blanco alrededor.
assert.ok(
  manifest.icons.some((i) => i.purpose === 'maskable'),
  'El manifest no declara ningun icono maskable',
);

// --- La version no se desincroniza ------------------------------------------

const versionSw = sw.match(/const VERSION = '([^']+)'/);
const versionReg = registrador.match(/const VERSION = '([^']+)'/);
assert.ok(versionSw && versionReg, 'No se hallo la constante VERSION');
assert.equal(
  versionReg[1],
  versionSw[1],
  'La version de registrar-sw.js no coincide con la de sw.js: el sello mostraria un numero equivocado',
);

// --- Cada HTML enlaza el manifest y el registrador --------------------------

const htmls = fs.readdirSync(raiz).filter((f) => f.endsWith('.html'));
assert.equal(htmls.length, 7, `Se esperaban 7 HTML, hay ${htmls.length}`);

for (const archivo of htmls) {
  const s = leer(archivo);
  assert.match(s, /rel="manifest"/, `${archivo} no enlaza el manifest`);
  assert.match(s, /registrar-sw\.js/, `${archivo} no carga registrar-sw.js`);
  assert.match(s, /name="theme-color"/, `${archivo} no declara theme-color`);
  assert.match(s, /apple-touch-icon/, `${archivo} no declara apple-touch-icon`);
}

// --- Netlify sirve el manifest con el MIME correcto -------------------------
// Sin esto Netlify lo manda como application/octet-stream y Firefox se niega a
// instalar la app.

// Se normalizan los espacios para comparar por contenido y no por sangria.
const cabeceras = leer('_headers').split('\n').map((l) => l.trim());

function reglaBajo(ruta, cabecera) {
  const i = cabeceras.indexOf(ruta);
  if (i === -1) return false;
  // La cabecera aplica hasta la proxima ruta o linea en blanco.
  for (let j = i + 1; j < cabeceras.length; j += 1) {
    const linea = cabeceras[j];
    if (linea === '' || linea.startsWith('/')) break;
    if (linea.startsWith('#')) continue;
    if (linea.toLowerCase().startsWith(cabecera.toLowerCase())) return true;
  }
  return false;
}

assert.ok(
  reglaBajo('/manifest.webmanifest', 'Content-Type: application/manifest+json'),
  '_headers ya no fija el Content-Type del manifest: Firefox no podria instalar la app',
);
assert.ok(
  reglaBajo('/sw.js', 'Cache-Control: no-cache'),
  '_headers ya no impide que el navegador cachee sw.js',
);

// --- La estrategia sigue siendo network-first -------------------------------
// Si alguien la cambia a cache-first, que sea una decision consciente y que
// tenga que borrar esta prueba a mano (ver docs/2026-09-01-pwa-diseno.md).

const manejadorFetch = sw.slice(sw.indexOf("addEventListener('fetch'"));
assert.ok(
  manejadorFetch.indexOf('fetch(request)') < manejadorFetch.indexOf('caches.match'),
  'sw.js ya no consulta la red antes que el cache: esto sirve dosis, la version vigente tiene que ganar',
);

console.log(
  `OK: PWA v${versionSw[1]} — ${precarga.size} archivos precargados, `
  + `${manifest.icons.length} iconos, ${htmls.length} pantallas`,
);
