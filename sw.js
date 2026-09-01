'use strict';

// Service worker de UTI Tools.
//
// Estrategia: network-first con respaldo en cache, NO cache-first.
//
// Es una decision deliberada y esta documentada en docs/2026-09-01-pwa-diseno.md.
// Resumen: esto calcula dosis. Bajo cache-first, una correccion publicada puede
// tardar en llegar y alguien sigue calculando con numeros viejos. Paso de verdad
// con la tarjeta de nitroglicerina, que afirmaba 25 mg/ampolla contra los 50 mg
// reales: con la misma dilucion y velocidad, eso duplica la dosis calculada.
// Con senal siempre gana la version vigente; sin senal, la ultima guardada.
//
// Al cambiar VERSION se invalida el cache anterior. Tiene que coincidir con el
// sello que muestran los HTML; tests/pwa.test.js falla si se desincronizan.

const VERSION = '2026.09.01';
const CACHE = `uti-tools-${VERSION}`;

// Todo lo que se sirve. tests/pwa.test.js falla si un archivo del repositorio
// queda afuera de esta lista, para que una calculadora nueva no quede sin
// funcionar offline sin que nadie se entere.
const PRECARGA = [
  '/',
  '/index.html',
  '/albumina.html',
  '/dsi.html',
  '/opioides.html',
  '/oxigeno.html',
  '/sofa2.html',
  '/vasopresores.html',
  '/albumina-calculos.js',
  '/dsi-calculos.js',
  '/opioides-calculos.js',
  '/oxigeno-calculos.js',
  '/vasopresores-calculos.js',
  '/registrar-sw.js',
  '/manifest.webmanifest',
  '/iconos/icono.svg',
  '/iconos/icono-180.png',
  '/iconos/icono-192.png',
  '/iconos/icono-512.png',
  '/iconos/icono-512-maskable.png',
  '/iconos/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll es atomico: si un archivo falla no se instala nada. Se piden de a
      // uno para que un archivo caido no deje la app entera sin cache.
      .then((cache) => Promise.all(
        PRECARGA.map((url) => cache.add(url).catch(() => {
          console.warn(`[sw] no se pudo precargar ${url}`);
        })),
      ))
      // Toma control apenas esta listo, sin esperar a que se cierren las
      // pestanas: en una herramienta de dosificacion la version vigente gana
      // sobre no interrumpir.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(
        claves.filter((c) => c.startsWith('uti-tools-') && c !== CACHE)
          .map((c) => caches.delete(c)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo se maneja la navegacion y los assets propios. Los enlaces a PubMed y
  // DOI de las referencias salen por la red como siempre.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((respuesta) => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(request).then((guardada) => {
        if (guardada) return guardada;
        // Una navegacion a una URL nunca visitada, estando sin senal: se
        // devuelve el indice, que si esta precargado.
        if (request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      })),
  );
});

// registrar-sw.js pregunta la version para mostrarla al pie.
self.addEventListener('message', (event) => {
  if (event.data === 'version' && event.source) {
    event.source.postMessage({ version: VERSION });
  }
});
