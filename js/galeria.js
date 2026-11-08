/* Pestaña Galería */
/* ---------- GALERÍA ---------- */
function refreshCategoriaOptions(){
  const sel = document.getElementById('fCategoria');
  if(!sel) return;
  const current = sel.value;
  const cats = Array.from(new Set(Object.values(data.productos).map(p=>p.categoria).filter(Boolean))).sort();
  sel.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if(cats.includes(current)) sel.value = current;
}

function renderGaleria(){
  refreshCategoriaOptions();
  const fCat = document.getElementById('fCategoria').value;
  const fBuscar = (document.getElementById('fBuscarGaleria').value || '').trim().toLowerCase();

  const items = Object.entries(data.productos).filter(([,p])=>{
    if(!p.tieneFoto || !(p.fotos||[]).length) return false;
    if(fCat && p.categoria !== fCat) return false;
    if(fBuscar && !(p.nombreOriginal||'').toLowerCase().includes(fBuscar)) return false;
    return true;
  }).sort((a,b)=> (a[1].nombreOriginal||'').localeCompare(b[1].nombreOriginal||''));

  const grid = document.getElementById('galGrid');
  const empty = document.getElementById('emptyGaleria');
  if(!items.length){ grid.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  grid.innerHTML = items.map(([,p])=>{
    const foto = p.fotos[0];
    return `<div class="gal-card">
      <a href="${safeImgUrl(foto)}" target="_blank" rel="noopener"><img src="${safeImgUrl(foto)}" alt="${escapeHtml(p.nombreOriginal || '')}" loading="lazy"></a>
      <div class="gal-info">
        <div class="gal-name">${escapeHtml(p.nombreOriginal)}</div>
        ${p.categoria ? `<div class="gal-cat">${escapeHtml(p.categoria)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}
document.getElementById('fCategoria')?.addEventListener('change', renderGaleria);
document.getElementById('fBuscarGaleria')?.addEventListener('input', renderGaleria);
