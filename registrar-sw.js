'use strict';

// Registra el service worker y agrega tres cosas al pie de cada pantalla:
// el sello de version, el aviso de sin conexion y, solo en iPhone, la ayuda
// para instalar.
//
// La version se declara aca y en sw.js. tests/pwa.test.js falla si difieren.

(function () {
  const VERSION = '2026.09.01';

  function pie() {
    let el = document.getElementById('uti-estado');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'uti-estado';
    el.style.cssText = [
      'max-width:460px', 'margin:14px auto 24px', 'padding:0 16px',
      'text-align:center', 'font-size:0.68rem', 'line-height:1.5',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function linea(texto, color) {
    const p = document.createElement('p');
    p.style.cssText = `margin:4px 0;color:${color};`;
    p.textContent = texto;
    return p;
  }

  // --- Sello de version -----------------------------------------------------
  // Si alguien reporta un numero raro, sirve para saber que version corre.
  // Se etiqueta como "instalada" para no confundirla con el "v2.3" del indice,
  // que es la version del contenido. Esta es la copia que corre en el telefono.
  const sello = linea(`versión instalada ${VERSION}`, 'rgba(255,255,255,0.28)');
  sello.id = 'uti-version';
  pie().appendChild(sello);

  // --- Aviso de sin conexion ------------------------------------------------
  // Sin senal la app sirve la copia guardada, que puede no ser la ultima. Que
  // eso sea visible, no implicito.
  const aviso = linea(
    'Sin conexión — estás viendo la copia guardada en el teléfono.',
    '#EF9F27',
  );
  aviso.id = 'uti-offline';
  aviso.style.display = 'none';
  pie().appendChild(aviso);

  function estado() {
    aviso.style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', estado);
  window.addEventListener('offline', estado);
  estado();

  // --- Ayuda de instalacion en iOS -----------------------------------------
  // Apple no expone beforeinstallprompt, asi que en iPhone hay que instalarla a
  // mano. Se muestra solo ahi y solo si todavia no esta instalada.
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const yaInstalada = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;

  if (esIOS && !yaInstalada) {
    pie().appendChild(linea(
      'Para tenerla como app: Compartir → «Agregar a inicio».',
      'rgba(255,255,255,0.40)',
    ));
  }

  // --- Boton de instalar en Android ----------------------------------------
  // Sin esto hay que buscar «Instalar» en el menu de Chrome, y si uno cae en
  // «Agregar a pantalla principal» lo que queda es un acceso directo al
  // navegador —con el logo de Chrome encima del icono— y no la app: se abre con
  // barra de direcciones y no funciona sin senal.
  //
  // El listener se registra al cargar el archivo, antes de que Chrome dispare el
  // evento. Chrome solo lo dispara si considera el sitio instalable, asi que su
  // presencia tambien sirve como diagnostico.
  window.__utiInstalable = false;
  let promptGuardado = null;

  window.addEventListener('beforeinstallprompt', (evento) => {
    // Se frena el aviso propio de Chrome para ofrecerlo en el momento elegido.
    evento.preventDefault();
    promptGuardado = evento;
    window.__utiInstalable = true;

    if (yaInstalada) return;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = '⬇ Instalar la app';
    boton.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:6px',
      'margin:10px auto 4px', 'padding:9px 18px', 'border-radius:8px',
      'font-size:0.78rem', 'font-weight:700', 'cursor:pointer',
      'color:#0a0f1e', 'background:#1D9E75', 'border:0',
      'font-family:inherit',
    ].join(';');

    boton.addEventListener('click', async () => {
      if (!promptGuardado) return;
      boton.disabled = true;
      promptGuardado.prompt();
      const { outcome } = await promptGuardado.userChoice;
      promptGuardado = null;
      if (outcome === 'accepted') boton.remove();
      else boton.disabled = false;
    });

    const contenedor = document.createElement('div');
    contenedor.style.textAlign = 'center';
    contenedor.appendChild(boton);
    pie().prepend(contenedor);
  });

  window.addEventListener('appinstalled', () => {
    promptGuardado = null;
    const b = document.querySelector('#uti-estado button');
    if (b) b.parentElement.remove();
  });

  // --- Registro -------------------------------------------------------------
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Sin service worker la app sigue funcionando: pierde el uso sin senal,
      // no las calculadoras.
      console.warn('[uti] no se pudo registrar el service worker:', error);
    });
  });
})();
