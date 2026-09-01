'use strict';

// El enlace de colaboracion apunta al slug de Cafecito, que es `utitools`.
// `drcastrofacundo` es el nombre visible del perfil, no su URL: al usarlo
// Cafecito responde 200 y renderiza "Esta pagina no esta disponible".

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SLUG_CORRECTO = 'utitools';
const raiz = path.join(__dirname, '..');
const archivos = fs.readdirSync(raiz).filter((f) => f.endsWith('.html') || f === 'README.md');

let encontrados = 0;

for (const archivo of archivos) {
  const contenido = fs.readFileSync(path.join(raiz, archivo), 'utf8');
  for (const [, slug] of contenido.matchAll(/cafecito\.app\/([A-Za-z0-9_-]+)/g)) {
    encontrados += 1;
    assert.equal(slug, SLUG_CORRECTO, `${archivo}: cafecito.app/${slug} no resuelve, se espera /${SLUG_CORRECTO}`);
  }
}

assert.ok(encontrados >= 7, `Se esperaba el enlace en index + 6 calculadoras, se hallaron ${encontrados}`);

console.log(`OK: ${encontrados} enlaces de Cafecito apuntan a /${SLUG_CORRECTO}`);
