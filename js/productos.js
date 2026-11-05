/* Admin: catálogo de productos */
/* ---------- ADMIN: catálogo de productos ---------- */
function renderProductos(){
  document.getElementById('statTotal').textContent = data.requests.length;
  document.getElementById('statPend').textContent = data.requests.filter(r=>r.estado==='pendiente').length;
  document.getElementById('statDone').textContent = data.requests.filter(r=>r.estado==='completada').length;
  const allKeys = Object.keys(data.productos);
  document.getElementById('statProd').textContent = allKeys.filter(k=>data.productos[k].tieneFoto).length;

  const listEl = document.getElementById('prodList');
  const emptyEl = document.getElementById('emptyProd');
  if(!allKeys.length){ listEl.innerHTML=''; emptyEl.style.display='block'; return; }
  emptyEl.style.display='none';
  const sorted = allKeys.sort((a,b)=> (data.productos[a].nombreOriginal||'').localeCompare(data.productos[b].nombreOriginal||''));
  listEl.innerHTML = sorted.map(k=>{
    const p = data.productos[k];
    return `<div class="prod-row">
      <div>
        <div class="pname">${escapeHtml(p.nombreOriginal)} <span class="status ${p.tieneFoto?'done':'nofoto'}" style="margin-left:6px;">${p.tieneFoto?'Con foto':'Sin foto'}</span></div>
        <div class="porigen">${p.categoria ? escapeHtml(p.categoria) + ' · ' : ''}${p.origen==='manual' ? 'Agregado manualmente' : p.origen==='sheets' ? 'Desde la hoja de Google' : p.origen==='importado' ? 'Importado desde archivo' : 'Detectado desde una solicitud'} · ${fmtDate(p.fecha)}</div>
      </div>
      <div class="pactions">
        <button class="btn secondary small btn-toggle-prod" data-k="${escapeHtml(k)}" data-val="${p.tieneFoto ? 'false' : 'true'}">${p.tieneFoto ? 'Quitar marca' : 'Marcar con foto'}</button>
        <button class="btn secondary small btn-del-prod" data-k="${escapeHtml(k)}">Quitar del catálogo</button>
      </div>
    </div>`;
  }).join('');
  listEl.querySelectorAll('.btn-del-prod').forEach(b=>{
    b.addEventListener('click', async ()=>{
      if(!confirm('¿Quitar este producto del catálogo? Las vendedoras ya no podrán seleccionarlo.')) return;
      const p = data.productos[b.getAttribute('data-k')];
      b.disabled = true;
      try{
        await sheetsAccion({ accion:'remove', nombre: p ? p.nombreOriginal : b.getAttribute('data-k') });
        showToast('Quitado de la hoja. Se actualiza en unos segundos.');
      }catch(e){ showToast('No se pudo quitar: ' + e.message, true); b.disabled = false; }
    });
  });
  listEl.querySelectorAll('.btn-toggle-prod').forEach(b=>{
    b.addEventListener('click', async ()=>{
      const key = b.getAttribute('data-k');
      const nuevoValor = b.getAttribute('data-val') === 'true';
      try{
        await db.collection('productos').doc(key).set({ tieneFoto: nuevoValor, fecha: new Date().toISOString() }, { merge: true });
      }catch(e){ showToast('No se pudo actualizar.', true); }
    });
  });
}

document.getElementById('btnAddProd')?.addEventListener('click', async ()=>{
  const input = document.getElementById('prodManual');
  const catInput = document.getElementById('prodCategoria');
  const checkbox = document.getElementById('prodTieneFoto');
  const btn = document.getElementById('btnAddProd');
  const nombre = input.value.trim();
  const categoria = catInput.value.trim();
  if(!nombre) return;
  if(nombre.indexOf('/') !== -1){ showToast('El nombre no puede contener "/".', true); return; }
  const key = normProd(nombre);
  if(data.productos[key]){ showToast('Ese código ya existe en el catálogo.', true); return; }
  btn.disabled = true;
  try{
    await sheetsAccion({ accion:'add', nombre, categoria, tieneFoto: checkbox.checked });
    input.value=''; catInput.value=''; checkbox.checked = false;
    showToast('Agregado a la hoja. Aparece en unos segundos.');
  }catch(e){ showToast('No se pudo agregar: ' + e.message, true); }
  btn.disabled = false;
});
