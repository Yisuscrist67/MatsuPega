/**
 * MatsuPega · Subida de fotos a Google Drive
 *
 * Este archivo NO lo usa la página directamente: se copia en script.google.com
 * y se publica como "Aplicación web". Los pasos están en apps-script/LEEME.md.
 *
 * Qué hace: recibe una foto desde el tablero, revisa que quien la envía sea un
 * admin o encargado aprobado en Firebase, la guarda en Drive dentro de
 *   <carpeta raíz>/Fotos solicitudes/<producto>/
 * y devuelve el id del archivo para guardar solo el enlace en Firestore.
 */

const FIREBASE_API_KEY = 'AIzaSyDH40dDTcP1eAzfGin_MrU4gC9TD7A0Two';
const FIREBASE_PROJECT_ID = 'lolaso-87abc';
const CARPETA_RAIZ_ID = '1wncZGyHVe8Ylkme8ftLGG3zAYyzGbBiN'; // la misma de "Fotos Drive"
const NOMBRE_CARPETA_FOTOS = 'Fotos solicitudes';
const ROLES_PERMITIDOS = ['admin', 'encargado'];
const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8 MB por foto

function doGet() {
  return ContentService.createTextOutput('MatsuPega · fotos a Drive funcionando');
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const usuario = verificarUsuario(body.idToken);

    if (body.accion === 'ping') return responder({ ok: true, nombre: usuario.nombre });
    if (body.accion === 'subirFoto') return responder(subirFoto(body));

    throw new Error('acción desconocida');
  } catch (err) {
    return responder({ ok: false, error: String(err && err.message || err) });
  }
}

/* Revisa el token de Firebase y que el usuario esté aprobado con rol permitido */
function verificarUsuario(idToken) {
  if (!idToken) throw new Error('falta la sesión');

  const lookup = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY,
    { method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true }
  );
  if (lookup.getResponseCode() !== 200) throw new Error('sesión no válida, vuelve a iniciar sesión');
  const uid = JSON.parse(lookup.getContentText()).users[0].localId;

  const doc = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID +
      '/databases/(default)/documents/usuarios/' + uid,
    { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true }
  );
  if (doc.getResponseCode() !== 200) throw new Error('usuario no encontrado');

  const f = JSON.parse(doc.getContentText()).fields || {};
  const estado = f.estado && f.estado.stringValue;
  const rol = f.rol && f.rol.stringValue;
  if (estado !== 'aprobado' || ROLES_PERMITIDOS.indexOf(rol) === -1) {
    throw new Error('no tienes permiso para subir fotos');
  }
  return { uid: uid, rol: rol, nombre: f.nombre ? f.nombre.stringValue : '' };
}

/* Guarda la imagen (data URL en base64) en la carpeta del producto */
function subirFoto(body) {
  const m = String(body.imagen || '').match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) throw new Error('imagen inválida');

  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > TAMANO_MAXIMO) throw new Error('la imagen es muy grande');

  const carpeta = carpetaDelProducto(body.producto || 'Sin producto');
  const extension = m[1] === 'image/png' ? '.png' : '.jpg';
  const archivo = carpeta.createFile(
    Utilities.newBlob(bytes, m[1], limpiarNombre(body.nombreArchivo || 'foto') + extension)
  );

  try {
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Si la carpeta raíz ya es pública, el archivo hereda el permiso igual
  }
  return { ok: true, id: archivo.getId() };
}

/* Busca o crea <raíz>/Fotos solicitudes/<producto>, con candado para no duplicar carpetas */
function carpetaDelProducto(producto) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const raiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
    const fotos = carpetaHija(raiz, NOMBRE_CARPETA_FOTOS);
    return carpetaHija(fotos, limpiarNombre(producto));
  } finally {
    lock.releaseLock();
  }
}

function carpetaHija(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function limpiarNombre(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'sin nombre';
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Ejecuta esta función una vez desde el editor para autorizar Drive y revisar la carpeta */
function probarPermisos() {
  const raiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);
  Logger.log('OK, las fotos se guardarán dentro de: ' + raiz.getName());
}
