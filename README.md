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
js/avisos.js        → aviso de horario de bodega y notificaciones de solicitudes nuevas
js/app.js           → arranque de la app (se carga al final) + registro de la PWA
manifest.webmanifest → datos para instalar como app (nombre, colores, íconos)
sw.js               → service worker: guarda los archivos de la página en caché
icons/              → íconos de la app (192, 512, maskable 512 y apple-touch 180)
icons/generar_iconos.py → script que dibuja los íconos (python icons/generar_iconos.py)
```
Los scripts se cargan en ese orden al final de `index.html`; `app.js` siempre va último.

## Perfiles y prioridad

| Perfil | Qué hace | Prioridad de sus solicitudes |
|---|---|---|
| Dueño | Pide fotos | Alta (sale arriba y en rojo en el Tablero) |
| Encargado de área | Pide fotos | Media (sale arriba y en amarillo) |
| Vendedora | Pide fotos | Normal |
| Encargado de bodega | Atiende el Tablero y sube las fotos | — |
| Admin | Todo, incluido aprobar usuarios y asignar perfiles | — |

El admin asigna el perfil en la pestaña **Usuarios**.

## Catálogo desde la Google Sheet

La página lee la hoja **Base de datos (mia)** (pestaña `Hoja 1`, columnas `Nombre`, `Categoria`, `tiene_foto`)
al entrar y cada 5 minutos, y la junta con los productos de Firestore. Así los productos de la hoja aparecen
al pedir fotos y, si dicen `si`, sale el aviso de que ya tienen foto.

- La hoja debe estar compartida como **Cualquier persona con el enlace → Lector**; si no, la página la ignora
  y sigue funcionando solo con Firestore.
- Si un producto está en la hoja y también en Firestore, manda lo de Firestore (fotos subidas, marcas del admin).
- El id de la hoja y el nombre de la pestaña están arriba de la sección de la hoja en `js/datos.js`.

## Avisos

- **Horario de bodega:** a partir de las 13:00 (y antes de las 08:00, y todo el fin de semana) a quien
  pide una foto le sale un aviso de que puede tardar. Se cambia arriba de `js/avisos.js`
  (`BODEGA_ABRE`, `BODEGA_CIERRA`, `AVISO_FIN_DE_SEMANA`).
- **Notificaciones:** el admin y el encargado de bodega ven el botón **Activar avisos** arriba a la derecha.
  Después, cada solicitud nueva genera una notificación con el nombre de quien pidió y su prioridad.
  Solo llegan mientras la app está abierta (aunque esté minimizada); con la app cerrada no llegan.

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
La app siempre pide primero la versión de internet, así que los cambios llegan solos al abrirla
(la copia guardada solo se usa sin conexión). Igual conviene subir el número en `sw.js`
(`const VERSION = 'v4';` → `'v5'`, etc.): así la app se recarga sola una vez y renueva su copia sin conexión.
Si agregas un archivo nuevo en `js/`, agrégalo también a la lista `SHELL` de `sw.js`.

### Probar en el PC
```
python -m http.server 8000
```
y abrir http://localhost:8000 en Chrome o Edge.

