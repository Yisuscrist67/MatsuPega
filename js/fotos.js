/* Fotos en Google Drive: subida y migración de las fotos antiguas */

function fotosEnDrive(){
  return !!FOTOS_WEBAPP_URL;
}

// Las fotos guardadas a la antigua son textos "data:image/..." dentro de Firestore
function esFotoEnBase(f){
  return typeof f === 'string' && f.startsWith('data:');
}

function urlFotoDrive(id){
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600';
}

async function fotosAccion(payload){
  if(!fotosEnDrive()) throw new Error('falta configurar FOTOS_WEBAPP_URL');
  const idToken = await auth.currentUser.getIdToken();
  // Sin "Content-Type" para que el navegador no haga preflight (Apps Script no lo acepta)
  const res = await fetch(FOTOS_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ ...payload, idToken })
  });
  const json = await res.json();
  if(!json.ok) throw new Error(json.error || 'error desconocido');
  return json;
}

// Sube una foto (data URL) y devuelve el enlace para guardar en Firestore
async function subirFotoDrive(dataUrl, producto, nombreArchivo){
  const { id } = await fotosAccion({ accion:'subirFoto', imagen: dataUrl, producto, nombreArchivo });
  return urlFotoDrive(id);
}

/* ---------- Migración (solo admin, pestaña Productos) ---------- */
let migrandoFotos = false;

function contarFotosEnBase(){
  let n = 0;
  data.requests.forEach(r=> (r.fotos||[]).forEach(f=>{ if(esFotoEnBase(f)) n++; }));
  Object.values(data.productos).forEach(p=> (p.fotos||[]).forEach(f=>{ if(esFotoEnBase(f)) n++; }));
  return n;
}

function renderMigracion(){
  const box = document.getElementById('migracionBox');
  if(!box || migrandoFotos) return;
  const n = contarFotosEnBase();
  if(!n){ box.style.display = 'none'; return; }
  box.style.display = 'block';
  document.getElementById('migracionTexto').innerHTML = fotosEnDrive()
    ? `Hay <b>${n}</b> foto${n===1?'':'s'} guardada${n===1?'':'s'} dentro de la base de datos. Pásalas a Drive para que la página cargue más rápido.`
    : `Hay <b>${n}</b> foto${n===1?'':'s'} dentro de la base de datos. Para pasarlas a Drive, primero configura <code>FOTOS_WEBAPP_URL</code> en <code>js/firebase.js</code>.`;
  document.getElementById('btnMigrar').style.display = fotosEnDrive() ? 'inline-block' : 'none';
}

async function migrarFotos(){
  if(migrandoFotos || !fotosEnDrive()) return;
  if(!confirm('Se subirán a Drive todas las fotos guardadas en la base de datos. Puede tardar varios minutos. No cierres la página mientras tanto. ¿Continuar?')) return;
  migrandoFotos = true;
  const btn = document.getElementById('btnMigrar');
  const txt = document.getElementById('migracionTexto');
  btn.disabled = true;

  const total = contarFotosEnBase();
  const yaSubidas = new Map(); // misma foto en la solicitud y en el producto → se sube una sola vez
  let hechas = 0, errores = 0;

  async function pasar(lista, producto, nombreBase){
    const nueva = [];
    for(let i = 0; i < lista.length; i++){
      const f = lista[i];
      if(!esFotoEnBase(f)){ nueva.push(f); continue; }
      try{
        if(!yaSubidas.has(f)) yaSubidas.set(f, await subirFotoDrive(f, producto, `${nombreBase} (${i+1})`));
        nueva.push(yaSubidas.get(f));
        hechas++;
      }catch(e){
        console.error(e); errores++;
        nueva.push(f); // si falla se deja como estaba y se puede reintentar
      }
      txt.textContent = `Migrando... ${hechas + errores} de ${total}`;
    }
    return nueva;
  }

  try{
    const solicitudes = data.requests.filter(r=> (r.fotos||[]).some(esFotoEnBase));
    for(const r of solicitudes){
      const fotos = await pasar(r.fotos, r.producto, `${padNum(r.numero)} ${r.producto}`);
      await db.collection('requests').doc(r.id).update({ fotos });
    }
    const productos = Object.entries(data.productos).filter(([,p])=> (p.fotos||[]).some(esFotoEnBase));
    for(const [key, p] of productos){
      const fotos = await pasar(p.fotos, p.nombreOriginal || key, p.nombreOriginal || key);
      await db.collection('productos').doc(key).update({ fotos });
    }
    showToast(errores ? `Listo, pero ${errores} foto(s) fallaron. Vuelve a presionar para reintentar.` : `Listo: ${hechas} foto(s) pasadas a Drive.`, !!errores);
  }catch(e){
    console.error(e);
    showToast('La migración se detuvo: ' + e.message + '. Puedes volver a presionar para continuar.', true);
  }
  migrandoFotos = false;
  btn.disabled = false;
  renderMigracion();
}

document.getElementById('btnMigrar')?.addEventListener('click', migrarFotos);
