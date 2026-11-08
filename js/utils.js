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
/* ---------- Reglas de registro (las mismas están en firestore.rules) ---------- */
// Usuario: solo letras a-z, sin números, espacios ni tildes; puede llevar . o _ entre letras
const USUARIO_REGEX = /^[a-z]+([._][a-z]+)*$/;
// Nombre: al menos nombre y apellido, solo letras (con tildes y ñ) separadas por un espacio
const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/;

function limpiarNombre(s){ return s.trim().replace(/\s+/g, ' '); }
function limpiarUsuario(s){ return s.trim().toLowerCase(); }

// Devuelve el mensaje de error, o '' si está bien
function validarRegistro(nombre, usuario, pass){
  if(!nombre || !usuario || !pass) return 'Completa todos los campos.';
  if(nombre.length > 60) return 'El nombre es muy largo (máximo 60 caracteres).';
  if(!NOMBRE_REGEX.test(nombre)) return 'Escribe tu nombre y apellido, solo con letras.';
  if(usuario.length < 3 || usuario.length > 20) return 'El usuario debe tener entre 3 y 20 caracteres.';
  if(/\d/.test(usuario)) return 'El usuario no puede tener números.';
  if(!USUARIO_REGEX.test(usuario)) return 'El usuario solo puede tener letras sin tildes (puedes usar . o _ entre medio).';
  if(pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return '';
}

function normProd(s){ return s.trim().toLowerCase().replace(/\s+/g,' '); }
function padNum(n){ return '#' + String(n||0).padStart(4,'0'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Solo deja pasar fotos (data:image/...) o links https, ya escapados para ir dentro de href/src
function safeImgUrl(u){
  const s = String(u || '');
  return /^(data:image\/|https:\/\/)/i.test(s) ? escapeHtml(s) : '';
}
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
/* ---------- PERFILES ---------- */
// Orden en que aparecen en las listas del admin
const ROLES = [
  { id:'vendedora',      nombre:'Vendedora' },
  { id:'encargado_area', nombre:'Encargado de área' },
  { id:'dueno',          nombre:'Dueño' },
  { id:'encargado',      nombre:'Encargado de bodega' },
  { id:'admin',          nombre:'Admin' }
];
function roleLabel(r){ const x = ROLES.find(o=>o.id===r); return x ? x.nombre : '(sin rol)'; }
function opcionesRol(actual){
  return ROLES.map(o=>`<option value="${o.id}" ${o.id===actual?'selected':''}>${o.nombre}</option>`).join('');
}

// Perfiles que piden fotos (ven "Nueva solicitud" y "Mis solicitudes")
const ROLES_SOLICITANTES = ['vendedora', 'encargado_area', 'dueno'];
function esSolicitante(rol){ return ROLES_SOLICITANTES.includes(rol); }

/* ---------- PRIORIDAD (según quién pide) ---------- */
const PRIORIDAD_POR_ROL = { dueno:'alta', encargado_area:'media', vendedora:'normal' };
const PRIORIDAD_NIVEL = { alta:2, media:1, normal:0 };
function prioridadDe(r){ return r.prioridad || 'normal'; } // las solicitudes antiguas no la tienen
function etiquetaPrioridad(p){ return { alta:'Prioridad alta', media:'Prioridad media', normal:'' }[p] || ''; }

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
