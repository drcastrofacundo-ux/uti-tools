# UTI Tools como PWA — diseño

Fecha: 2026-09-01
Estado: aprobado, en implementación

## Objetivo

Que UTI Tools se instale en el celular como una app: ícono en la pantalla de
inicio, pantalla completa sin barra del navegador, y funcionamiento sin señal.
Sin tiendas, sin cuentas de desarrollador y sin costo recurrente.

## Por qué PWA y no una app de tienda

El repositorio pesa 263 KB y no depende de ningún asset externo: los únicos
enlaces salientes son a PubMed y DOI de las referencias. Todo el cálculo ya
corre en el cliente. No hay nada que un empaquetado nativo agregue acá salvo
descubrimiento en la tienda, a cambio de una cuota anual (Apple), revisión
externa de una app médica, y días de demora entre una corrección y su llegada
al celular de quien la usa.

## Decisión central: network-first, no cache-first

Una PWA guarda los archivos en el dispositivo. Lo habitual es **cache-first**:
servir lo guardado y buscar actualizaciones después. Es más rápido, pero deja
al usuario calculando sobre una versión vieja sin saberlo.

El riesgo no es teórico. El 2026-09-01 se corrigió la tarjeta de
nitroglicerina, que afirmaba 25 mg/ampolla contra los 50 mg reales: con la
misma dilución y velocidad, el error **duplica la dosis calculada**. Esa
corrección estuvo hecha en local y sin publicar durante días. Bajo cache-first,
publicarla tampoco habría alcanzado: los celulares con la app instalada
habrían seguido sirviendo la versión con 25 mg fijos hasta la siguiente
revalidación.

Por eso: **network-first con respaldo en cache**. Con señal —el caso normal,
incluso con 3G pobre— siempre se sirve la versión vigente. Sin señal, se sirve
la última guardada. El costo es del orden de 200 ms al abrir.

Consecuencias que se agregan por la misma razón:

- **Sello de versión** al pie de cada pantalla, para poder preguntarle a quien
  reporta un número raro qué versión está corriendo.
- **Aviso de sin conexión**, para que quede explícito cuándo se está sirviendo
  una copia guardada que puede no ser la última.

## Piezas

| Archivo | Responsabilidad |
|---|---|
| `manifest.webmanifest` | Identidad de la app: nombre, colores, íconos, `display: standalone` |
| `sw.js` | Service worker: precarga, estrategia network-first, autoactualización |
| `registrar-sw.js` | Registra el service worker y pinta el aviso de sin conexión |
| `iconos/generar_iconos.py` | Fuente única de la geometría del ícono; emite el SVG y los PNG |
| `iconos/*.png`, `iconos/icono.svg` | Salida del script anterior |

Cada HTML suma tres líneas en el `<head>` (manifest, theme-color,
apple-touch-icon) y una al final (`registrar-sw.js`). Ningún archivo
`*-calculos.js` se modifica.

## Alcance del cache

Los 13 archivos servidos: `index.html`, las 6 calculadoras, los 6
`*-calculos.js`, más el manifest y los íconos. Al pesar 263 KB en total no hay
que decidir qué guardar: se guarda todo.

## Actualización

El service worker nuevo toma control apenas está listo (`skipWaiting` +
`clients.claim`), sin esperar a que se cierren las pestañas. En una
herramienta de dosificación, la versión vigente gana sobre no interrumpir.

## Qué queda afuera, a propósito

Notificaciones push, analytics y pantalla de bienvenida propia. Nada de eso
sirve al objetivo y todo agrega superficie que mantener.

## Cómo se evita que se pudra

`tests/pwa.test.js`, en el mismo estilo que el resto (`node tests/x.test.js`):

- Falla si un archivo servido del repositorio no está en la lista de precarga
  del service worker. Sin esto, la próxima calculadora que se agregue no
  funcionaría sin señal y no habría forma de notarlo hasta que alguien esté
  sin señal.
- Falla si el manifest declara un ícono que no existe en disco.
- Falla si la versión del `sw.js` no coincide con el sello que muestran los
  HTML.

## Limitación conocida

En iOS la instalación es manual: Compartir → «Agregar a inicio». Apple no
expone el evento que en Android permite un botón de instalar. Se mitiga con
una línea de ayuda que aparece solo en iOS y solo cuando la app todavía no
está instalada.
