# Fotos en Google Drive · cómo activarlo

Las fotos se guardan en tu Drive, dentro de la carpeta raíz de "Fotos Drive":

```
<carpeta raíz>/Fotos solicitudes/<producto>/#0001 Lona Hilux (1).jpg
```

En Firestore queda solo el enlace, así la página carga mucho más rápido.

## 1. Crear el script (una sola vez)
1. Entra a https://script.google.com con la cuenta de Google **dueña de la carpeta raíz**.
2. **Nuevo proyecto**. Ponle de nombre `MatsuPega fotos`.
3. Borra lo que trae el editor y pega todo el contenido de `fotos-drive.gs`. Guarda con `Ctrl+S`.
4. Arriba, elige la función `probarPermisos` y presiona **Ejecutar**.
   Google te pedirá permisos: *Revisar permisos* → tu cuenta → *Configuración avanzada* →
   *Ir a MatsuPega fotos (no seguro)* → *Permitir*. Aparece ese aviso porque el script es tuyo y Google no lo ha revisado; es normal.
   En el registro debería salir `OK, las fotos se guardarán dentro de: ...`.

## 2. Publicarlo como aplicación web
1. **Implementar** → **Nueva implementación** → en el engranaje elige **Aplicación web**.
2. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**.
   No es inseguro: el script revisa la sesión de Firebase y solo acepta admin o encargado aprobados.
3. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

## 3. Conectarlo a la página
1. En `js/firebase.js` pega la URL en `FOTOS_WEBAPP_URL`:
   ```js
   const FOTOS_WEBAPP_URL = 'https://script.google.com/macros/s/.../exec';
   ```
2. Commit y push, y publica como siempre.

## 4. Pasar las fotos antiguas
Entra como admin → pestaña **Productos** → botón **Pasar fotos a Drive**.
No cierres la página hasta que termine. Si algo falla, vuelve a presionarlo: solo procesa las que faltan.

## Si cambias el script
Después de editar `fotos-drive.gs` en script.google.com: **Implementar** → **Gestionar implementaciones** →
lápiz → *Versión*: **Nueva versión** → **Implementar**. Así la URL sigue siendo la misma.
