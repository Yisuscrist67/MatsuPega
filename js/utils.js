/* Estado compartido y funciones de ayuda */
let data = { requests: [], productos: {}, usuarios: {} };
let session = null;
let expandedId = null;

// Desuscripciones de escuchadores Firestore
let unsubscribeRequests = null;
let unsubscribeProductos = null;
let unsubscribeUsuarios = null;
let unsubscribeUserDoc = null;

function usuarioToEmail(u){ return u.trim().toLowerCase().replace(/\s+/g,'') + EMAIL_DOMAIN; }
function normProd(s){ return s.trim().toLowerCase().replace(/\s+/g,' '); }
function padNum(n){ return '#' + String(n||0).padStart(4,'0'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {day:'2-digit', month:'short'}) + ' · ' + d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
}
function showToast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(()=>{ t.classList.remove('show'); }, 2500);
}
function roleLabel(r){ return {vendedora:'Vendedora', encargado:'Encargado', admin:'Admin'}[r] || '(sin rol)'; }

function resizeImage(file, maxW){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxW){ h = Math.round(h * (maxW / w)); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
