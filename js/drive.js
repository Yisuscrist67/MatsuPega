/* Pestaña Fotos Drive (solo lectura) */
/* ---------- GOOGLE DRIVE (solo lectura, carpeta pública) ---------- */
const DRIVE_API_KEY = 'AIzaSyAlw7VuQR-prD_xmc2-Iwp2svaEXkYRSCs';
const DRIVE_ROOT_FOLDER_ID = '1wncZGyHVe8Ylkme8ftLGG3zAYyzGbBiN';
let drivePath = [];
let driveSubfolders = [];
let driveFiles = [];
let driveStarted = false;
const driveCache = {};

async function driveList(q, fields){
  const url = 'https://www.googleapis.com/drive/v3/files?pageSize=200&orderBy=name'
    + '&q=' + encodeURIComponent(q)
    + '&fields=' + encodeURIComponent(fields)
    + '&key=' + DRIVE_API_KEY;
  const res = await fetch(url);
  if(!res.ok){
    const txt = await res.text();
    throw new Error('Drive ' + res.status + ': ' + txt);
  }
  return (await res.json()).files || [];
}

function initDrive(){
  if(driveStarted) return;
  driveStarted = true;
  loadDriveFolder(DRIVE_ROOT_FOLDER_ID);
}

function currentDriveId(){
  return drivePath.length ? drivePath[drivePath.length-1].id : DRIVE_ROOT_FOLDER_ID;
}

async function loadDriveFolder(folderId){
  const msg = document.getElementById('driveMsg');
  msg.style.color = '';
  try{
    if(!driveCache[folderId]){
      msg.textContent = 'Cargando...';
      const [folders, files] = await Promise.all([
        driveList(`'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, 'files(id,name)'),
        driveList(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`, 'files(id,name)')
      ]);
      driveCache[folderId] = { folders, files };
    }
    msg.textContent = '';
    driveSubfolders = driveCache[folderId].folders;
    driveFiles = driveCache[folderId].files;
    renderDrive();
  }catch(e){
    console.error(e);
    driveStarted = false;
    msg.style.color = '#E08A8A';
    msg.textContent = 'No se pudo leer Drive. Revisa que la carpeta sea pública y que la clave de API tenga habilitada la API de Drive.';
  }
}

function renderDrive(){
  const q = (document.getElementById('fDriveBuscar').value || '').trim().toLowerCase();

  const crumbs = document.getElementById('driveCrumbs');
  if(drivePath.length){
    let html = '<button data-i="-1">Inicio</button>';
    drivePath.forEach((c,i)=>{
      html += '<span>/</span>';
      html += (i === drivePath.length-1)
        ? `<span class="actual">${escapeHtml(c.name)}</span>`
        : `<button data-i="${i}">${escapeHtml(c.name)}</button>`;
    });
    crumbs.innerHTML = html;
    crumbs.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        drivePath = drivePath.slice(0, parseInt(b.getAttribute('data-i'),10) + 1);
        document.getElementById('fDriveBuscar').value = '';
        loadDriveFolder(currentDriveId());
      });
    });
  } else {
    crumbs.innerHTML = '';
  }

  const folders = driveSubfolders.filter(f=> !q || f.name.toLowerCase().includes(q));
  const folderEl = document.getElementById('driveFolders');
  folderEl.innerHTML = folders.map(f=>`<button class="folder-card" data-id="${escapeHtml(f.id)}" data-name="${escapeHtml(f.name)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>
    <span>${escapeHtml(f.name)}</span>
  </button>`).join('');
  folderEl.querySelectorAll('.folder-card').forEach(b=>{
    b.addEventListener('click', ()=>{
      drivePath.push({ id: b.getAttribute('data-id'), name: b.getAttribute('data-name') });
      document.getElementById('fDriveBuscar').value = '';
      loadDriveFolder(currentDriveId());
    });
  });

  const items = driveFiles.filter(f=> !q || f.name.toLowerCase().includes(q));
  const grid = document.getElementById('driveGrid');
  grid.innerHTML = items.map(f=>`<div class="gal-card">
    <a href="https://drive.google.com/file/d/${f.id}/view" target="_blank" rel="noopener">
      <img loading="lazy" src="https://drive.google.com/thumbnail?id=${f.id}&sz=w500" alt="${escapeHtml(f.name)}">
    </a>
    <div class="gal-info"><div class="gal-name">${escapeHtml(f.name)}</div></div>
  </div>`).join('');

  document.getElementById('emptyDrive').style.display = (!folders.length && !items.length) ? 'block' : 'none';
}

document.getElementById('fDriveBuscar')?.addEventListener('input', renderDrive);
