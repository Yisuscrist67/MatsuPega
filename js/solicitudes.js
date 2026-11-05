/* Solicitudes: crear, listar, tablero, subir fotos */
/* ---------- CATÁLOGO: opciones del datalist ---------- */
function refreshProductoOptions(){
  const dl = document.getElementById('productoList');
  if(!dl) return;
  const keys = Object.keys(data.productos).sort((a,b)=>
    (data.productos[a].nombreOriginal||'').localeCompare(data.productos[b].nombreOriginal||'')
  );
  dl.innerHTML = keys.map(k=>`<option value="${escapeHtml(data.productos[k].nombreOriginal)}">${data.productos[k].tieneFoto ? 'ya tiene foto' : ''}</option>`).join('');
  checkProductWarning();
}

/* ---------- VENDEDORA: nueva solicitud ---------- */
document.getElementById('producto').addEventListener('input', checkProductWarning);

function checkProductWarning(){
  const box = document.getElementById('warnBox');
  const key = normProd(document.getElementById('producto').value || '');
  if(!key){ box.innerHTML=''; return; }
  const p = data.productos[key];
  if(p && p.tieneFoto){
    box.innerHTML = `<div class="warning"><b>Este producto ya tiene foto registrada</b> (desde ${fmtDate(p.fecha)}). Mejor escríbele directamente a Yisus en vez de mandar la solicitud — así es más rápido.</div>`;
  } else {
    box.innerHTML = '';
  }
}

async function crearSolicitud(){
  const vendedora = session.nombre;
  const key = normProd(document.getElementById('producto').value || '');
  const detalle = document.getElementById('detalle').value.trim();
  const msg = document.getElementById('msgNew');
  const btn = document.getElementById('btnCrear');
  if(!key || !data.productos[key]){ msg.textContent = 'Escribe y elige un producto que exista en el catálogo (empieza a escribir para ver las opciones).'; return; }
  const producto = data.productos[key].nombreOriginal;

  btn.disabled = true;
  try{
    const numero = await siguienteNumero();
    const nueva = {
      numero, vendedora, producto, detalle,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      fotos: [],
      atendidoPor: null
    };
    await db.collection('requests').add(nueva);
    msg.textContent = `Solicitud ${padNum(numero)} enviada. El equipo la verá en el Tablero.`;
    document.getElementById('producto').value='';
    document.getElementById('detalle').value='';
    document.getElementById('warnBox').innerHTML='';
  }catch(e){
    msg.textContent = 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.';
    console.error(e);
  }
  btn.disabled = false;
}
document.getElementById('btnCrear').addEventListener('click', crearSolicitud);

/* ---------- VENDEDORA: mis solicitudes ---------- */
function renderMine(){
  const mine = data.requests.filter(r=>(r.vendedora||'').trim().toLowerCase() === session.nombre.trim().toLowerCase())
    .sort((a,b)=> new Date(b.fecha) - new Date(a.fecha));
  const el = document.getElementById('listMine');
  const empty = document.getElementById('emptyMine');
  if(!mine.length){ el.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  el.innerHTML = mine.map(r=>{
    const done = r.estado==='completada';
    return `<div class="card ${done?'done':''}">
      <div class="row1">
        <div>
          <div class="numero">${padNum(r.numero)}</div>
          <div class="producto">${escapeHtml(r.producto)}</div>
          <div class="meta">${fmtDate(r.fecha)}</div>
        </div>
        <span class="status ${done?'done':''}">${done?'Completada':'Pendiente'}</span>
      </div>
      ${done && (r.fotos||[]).length ? `<div class="thumbs">${r.fotos.map(f=>`<a href="${f}" target="_blank"><img src="${f}"></a>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

/* ---------- ENCARGADO / ADMIN: tablero ---------- */
function distinctVendedoras(){
  return Array.from(new Set(data.requests.map(r=>r.vendedora).filter(Boolean))).sort();
}
function refreshVendedoraOptions(){
  const list = distinctVendedoras();
  const sel = document.getElementById('fVendedora');
  if(sel){
    const current = sel.value;
    sel.innerHTML = '<option value="">Todas las vendedoras</option>' + list.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    sel.value = current;
  }
}

function updatePendBadge(){
  const pendientes = data.requests.filter(r=>r.estado==='pendiente').length;
  const badge = document.getElementById('pendCount');
  if(badge){ if(pendientes>0){ badge.style.display='inline-block'; badge.textContent=pendientes; } else badge.style.display='none'; }
}

function renderList(){
  const fVend = document.getElementById('fVendedora').value;
  const fEstado = document.getElementById('fEstado').value;
  const fBuscar = document.getElementById('fBuscar').value.trim().toLowerCase();

  let items = data.requests.filter(r=>{
    if(fVend && r.vendedora !== fVend) return false;
    if(fEstado && r.estado !== fEstado) return false;
    if(fBuscar && !(r.producto||'').toLowerCase().includes(fBuscar)) return false;
    return true;
  });
  items.sort((a,b)=> new Date(b.fecha) - new Date(a.fecha));
  updatePendBadge();

  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('emptyMsg');
  if(!items.length){ listEl.innerHTML=''; emptyEl.style.display='block'; return; }
  emptyEl.style.display='none';

  listEl.innerHTML = items.map(r=>{
    const isOpen = expandedId === r.id;
    const done = r.estado==='completada';
    return `<div class="card ${done?'done':''}" data-id="${r.id}">
      <div class="row1" data-toggle="${r.id}">
        <div>
          <div class="numero">${padNum(r.numero)}</div>
          <div class="producto">${escapeHtml(r.producto)}</div>
          <div class="meta">${escapeHtml(r.vendedora)} · ${fmtDate(r.fecha)}${r.atendidoPor ? ' · atendida por '+escapeHtml(r.atendidoPor) : ''}</div>
        </div>
        <span class="status ${done?'done':''}">${done?'Completada':'Pendiente'}</span>
      </div>
      ${isOpen ? renderDetail(r) : ''}
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-toggle]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.getAttribute('data-toggle');
      expandedId = expandedId === id ? null : id;
      renderList();
    });
  });
  listEl.querySelectorAll('.file-input').forEach(el=> el.addEventListener('change', handleFileUpload));
  listEl.querySelectorAll('.btn-reabrir').forEach(el=> el.addEventListener('click', e=>{ e.stopPropagation(); reabrirSolicitud(el.dataset.id); }));
  listEl.querySelectorAll('.btn-eliminar').forEach(el=> el.addEventListener('click', e=>{ e.stopPropagation(); eliminarSolicitud(el.dataset.id); }));
}

function renderDetail(r){
  const fotos = r.fotos || [];
  return `<div class="detail" onclick="event.stopPropagation()">
      ${r.detalle ? `<p>${escapeHtml(r.detalle)}</p>` : ''}
      ${fotos.length ? `<div class="thumbs">${fotos.map(f=>`<a href="${f}" target="_blank"><img src="${f}"></a>`).join('')}</div>` : ''}
      <div class="upload-row"><input type="file" class="file-input" data-id="${r.id}" accept="image/*" multiple></div>
      <div class="actions-row">
        ${r.estado==='completada' ? `<button class="btn secondary small btn-reabrir" data-id="${r.id}">Reabrir</button>` : ''}
        <button class="btn secondary small btn-eliminar" data-id="${r.id}">Eliminar</button>
      </div>
    </div>`;
}

async function handleFileUpload(e){
  const id = e.target.getAttribute('data-id');
  const files = Array.from(e.target.files || []);
  if(!files.length) return;
  e.target.disabled = true;
  try{
    const r = data.requests.find(x=>x.id===id);
    if(!r) return;
    const dataUrls = await Promise.all(files.map(f=>resizeImage(f, 1100)));

    // Con Drive configurado se suben allá y en Firestore queda solo el enlace
    let nuevas = dataUrls;
    if(fotosEnDrive()){
      const yaTenia = (r.fotos||[]).length;
      nuevas = [];
      for(let i = 0; i < dataUrls.length; i++){
        showToast(`Subiendo foto ${i+1} de ${dataUrls.length} a Drive...`);
        nuevas.push(await subirFotoDrive(dataUrls[i], r.producto, `${padNum(r.numero)} ${r.producto} (${yaTenia+i+1})`));
      }
    }

    const fotosFinal = (r.fotos||[]).concat(nuevas);
    const fechaCompletada = new Date().toISOString();

    await db.collection('requests').doc(id).update({
      fotos: fotosFinal,
      estado: 'completada',
      fechaCompletada,
      atendidoPor: session.nombre
    });

    const key = normProd(r.producto);
    const fotosProductoPrevias = (data.productos[key] && data.productos[key].fotos) || [];
    await db.collection('productos').doc(key).set({
      nombreOriginal: (data.productos[key] && data.productos[key].nombreOriginal) || r.producto,
      tieneFoto: true,
      fecha: fechaCompletada,
      origen: (data.productos[key] && data.productos[key].origen) || 'auto',
      fotos: fotosProductoPrevias.concat(nuevas)
    }, { merge: true });

    showToast(`Fotos subidas para ${padNum(r.numero)} · enviadas a ${r.vendedora}`);
  }catch(err){
    showToast('No se pudo subir la foto: ' + (err.message || 'revisa tu conexión.'), true);
    console.error(err);
  }
  e.target.disabled = false;
}

async function reabrirSolicitud(id){
  try{ await db.collection('requests').doc(id).update({ estado: 'pendiente' }); }
  catch(e){ showToast('No se pudo actualizar.', true); }
}
async function eliminarSolicitud(id){
  if(!confirm('¿Eliminar esta solicitud?')) return;
  try{ await db.collection('requests').doc(id).delete(); }
  catch(e){ showToast('No se pudo eliminar.', true); }
}

document.getElementById('fVendedora')?.addEventListener('change', renderList);
document.getElementById('fEstado')?.addEventListener('change', renderList);
document.getElementById('fBuscar')?.addEventListener('input', renderList);
