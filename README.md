# MatsuPega
Página web para llevar las solicitudes de fotos entre bodega y administración.

## Estructura
```
index.html          → estructura de la página (HTML)
css/styles.css      → estilos
js/firebase.js      → conexión a Firebase y Google Sheets
js/utils.js         → estado compartido y funciones de ayuda
js/datos.js         → escuchadores de Firestore en tiempo real
js/auth.js          → login, registro y sesión
js/drive.js         → pestaña Fotos Drive
js/galeria.js       → pestaña Galería
js/solicitudes.js   → nueva solicitud, mis solicitudes y tablero
js/productos.js     → catálogo de productos (admin)
js/usuarios.js      → usuarios y roles (admin)
js/reporte.js       → reporte mensual (admin y encargado)
js/app.js           → arranque de la app (se carga al final) + registro de la PWA
manifest.webmanifest → datos para instalar como app (nombre, colores, íconos)
sw.js               → service worker: guarda los archivos de la página en caché
icons/              → íconos de la app (192, 512, maskable 512 y apple-touch 180)
icons/generar_iconos.py → script que dibuja los íconos (python icons/generar_iconos.py)
```
Los scripts se cargan en ese orden al final de `index.html`; `app.js` siempre va último.

## Instalar como app (PWA)
La página se puede instalar en el teléfono o el PC y se abre como una app, sin barra del navegador.
Necesita estar publicada con **https** (GitHub Pages ya lo tiene).

- **Android (Chrome):** abrir la página → aparece abajo a la izquierda el botón **Instalar app**
  (o menú ⋮ → *Instalar aplicación* / *Agregar a pantalla principal*).
- **iPhone / iPad (Safari):** abrir la página en Safari → botón **Compartir** (cuadrado con flecha)
  → **Agregar a inicio**. La página muestra un aviso con estas instrucciones.
- **PC (Chrome o Edge):** botón **Instalar app**, o el ícono de instalar en la barra de direcciones.

La app sigue necesitando internet: Firebase y Drive funcionan igual que en la página web.
El service worker solo guarda `index.html`, `css/`, `js/` e `icons/`; nunca guarda datos de Firebase ni de Drive.

### Al publicar cambios
Cada vez que cambies archivos de la página, sube el número en `sw.js`
(`const VERSION = 'v1';` → `'v2'`, etc.). Así los teléfonos con la app instalada reciben la versión nueva.
Si agregas un archivo nuevo en `js/`, agrégalo también a la lista `SHELL` de `sw.js`.

### Probar en el PC
```
python -m http.server 8000
```
y abrir http://localhost:8000 en Chrome o Edge.

