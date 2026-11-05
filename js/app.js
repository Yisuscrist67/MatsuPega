/* Arranque de la app, pestañas y refresco general */
/* ---------- APP START ---------- */
function startApp(){
  document.getElementById('gate').style.display='none';
  document.getElementById('shell').style.display='block';
  document.getElementById('whoName').textContent = session.nombre + ' · ' + roleLabel(session.role);
  document.getElementById('btnReporte').style.display = puedeVerReporte() ? 'inline-block' : 'none';
  if(!puedeVerReporte()) cerrarReporte();
  buildTabs();
  startDataListeners();
  if(session.role === 'admin') startUsersListener();
  refreshAll();
}

function buildTabs(){
  const tabs = document.getElementById('tabs');
  if(session.role === 'vendedora'){
    tabs.innerHTML = `<button id="tabNew" class="active">Nueva solicitud</button><button id="tabMine">Mis solicitudes</button><button id="tabGaleria">Galería</button><button id="tabDrive">Fotos Drive</button>`;
    document.getElementById('tabNew').addEventListener('click', ()=>setTab('new'));
    document.getElementById('tabMine').addEventListener('click', ()=>{ setTab('mine'); renderMine(); });
    document.getElementById('tabGaleria').addEventListener('click', ()=>{ setTab('galeria'); renderGaleria(); });
    document.getElementById('tabDrive').addEventListener('click', ()=>{ setTab('drive'); initDrive(); });
    setTab('new');
    document.getElementById('vendedora').value = session.nombre;
  } else {
    let html = `<button id="tabBoard" class="active">Tablero <span id="pendCount" class="badge-count" style="display:none">0</span></button><button id="tabGaleria">Galería</button><button id="tabDrive">Fotos Drive</button>`;
    if(session.role === 'admin'){
      html += `<button id="tabProd">Productos</button>`;
      html += `<button id="tabUsuarios">Usuarios <span id="pendUsersBadge" class="badge-count" style="display:none">0</span></button>`;
    }
    tabs.innerHTML = html;
    document.getElementById('tabBoard').addEventListener('click', ()=>{ setTab('board'); renderList(); });
    document.getElementById('tabGaleria').addEventListener('click', ()=>{ setTab('galeria'); renderGaleria(); });
    document.getElementById('tabDrive').addEventListener('click', ()=>{ setTab('drive'); initDrive(); });
    if(session.role === 'admin'){
      document.getElementById('tabProd').addEventListener('click', ()=>{ setTab('prod'); renderProductos(); });
      document.getElementById('tabUsuarios').addEventListener('click', ()=>{ setTab('usuarios'); renderUsuarios(); });
    }
    setTab('board');
  }
}

function setTab(which){
  document.getElementById('viewNew').style.display = which==='new' ? 'block':'none';
  document.getElementById('viewMine').style.display = which==='mine' ? 'block':'none';
  document.getElementById('viewBoard').style.display = which==='board' ? 'block':'none';
  document.getElementById('viewProductos').style.display = which==='prod' ? 'block':'none';
  document.getElementById('viewUsuarios').style.display = which==='usuarios' ? 'block':'none';
  document.getElementById('viewGaleria').style.display = which==='galeria' ? 'block':'none';
  document.getElementById('viewDrive').style.display = which==='drive' ? 'block':'none';
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.remove('active'));
  const map = {new:'tabNew', mine:'tabMine', board:'tabBoard', prod:'tabProd', usuarios:'tabUsuarios', galeria:'tabGaleria', drive:'tabDrive'};
  document.getElementById(map[which])?.classList.add('active');
}

function refreshAll(){
  if(!session) return;
  refreshVendedoraOptions();
  refreshProductoOptions();
  if(document.getElementById('viewGaleria').style.display !== 'none') renderGaleria();
  if(session.role === 'vendedora'){
    if(document.getElementById('viewMine').style.display !== 'none') renderMine();
  } else {
    if(document.getElementById('viewBoard').style.display !== 'none') renderList();
    if(session.role === 'admin' && document.getElementById('viewProductos').style.display !== 'none') renderProductos();
    updatePendBadge();
  }
}

// Todo cargó: recién ahora escuchamos la sesión de Firebase
iniciarAuth();
