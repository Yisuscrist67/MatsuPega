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
js/app.js           → arranque de la app (se carga al final)
```
Los scripts se cargan en ese orden al final de `index.html`; `app.js` siempre va último.
