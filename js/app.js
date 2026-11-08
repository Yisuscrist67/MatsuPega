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
  prepararAvisos();
  refreshAll();
}

function buildTabs(){
  const tabs = document.getElementById('tabs');
  if(esSolicitante(session.role)){
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
  if(esSolicitante(session.role)){
    if(document.getElementById('viewMine').style.display !== 'none') renderMine();
  } else {
    if(document.getElementById('viewBoard').style.display !== 'none') renderList();
    if(session.role === 'admin' && document.getElementById('viewProductos').style.display !== 'none') renderProductos();
    updatePendBadge();
  }
}

// Todo cargó: recién ahora escuchamos la sesión de Firebase
iniciarAuth();

/* ---------- PWA: instalar como app + service worker ---------- */
// Registra el service worker (permite instalar la página y abrirla más rápido)
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(err=>console.warn('No se pudo registrar el service worker:', err));
  });
}

(function instalarApp(){
  const yaInstalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if(yaInstalada) return;

  // Android y PC (Chrome/Edge): el navegador avisa cuando se puede instalar
  const btn = document.getElementById('btnInstalar');
  let aviso = null;
  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault();
    aviso = e;
    btn.hidden = false;
  });
  btn.addEventListener('click', async ()=>{
    if(!aviso) return;
    btn.hidden = true;
    aviso.prompt();
    try { await aviso.userChoice; } catch(_){}
    aviso = null;
  });
  window.addEventListener('appinstalled', ()=>{ btn.hidden = true; aviso = null; });

  // iPhone/iPad (Safari): no hay botón automático, mostramos cómo hacerlo
  const ua = navigator.userAgent;
  const esIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const esSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  let cerrado = false;
  try { cerrado = localStorage.getItem('iosInstallCerrado') === '1'; } catch(_){}
  if(esIOS && esSafari && !cerrado){
    const tip = document.getElementById('iosInstall');
    tip.hidden = false;
    document.getElementById('iosInstallCerrar').addEventListener('click', ()=>{
      tip.hidden = true;
      try { localStorage.setItem('iosInstallCerrado', '1'); } catch(_){}
    });
  }
})();
