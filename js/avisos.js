/* Avisos: horario de bodega y notificaciones de solicitudes nuevas */

/* ---------- HORARIO DE BODEGA ----------
   Fuera de este horario, a quien pide una foto le sale un aviso de que
   puede tardar. Cambia estos números si cambia el horario. */
const BODEGA_ABRE = 8;          // desde las 08:00
const BODEGA_CIERRA = 13;       // a partir de las 13:00 ya sale el aviso
const AVISO_FIN_DE_SEMANA = true; // sábado y domingo, aviso todo el día

function fueraDeHorario(ahora = new Date()){
  const dia = ahora.getDay(); // 0 = domingo, 6 = sábado
  if(AVISO_FIN_DE_SEMANA && (dia === 0 || dia === 6)) return true;
  const h = ahora.getHours();
  return h < BODEGA_ABRE || h >= BODEGA_CIERRA;
}

// Muestra la ventana y responde true (enviar igual) o false (cancelar)
function confirmarFueraDeHorario(){
  return new Promise(resolve=>{
    const modal = document.getElementById('horarioModal');
    const enviar = document.getElementById('horarioEnviar');
    const cancelar = document.getElementById('horarioCancelar');
    const cerrar = (respuesta)=>{
      modal.style.display = 'none';
      enviar.removeEventListener('click', alEnviar);
      cancelar.removeEventListener('click', alCancelar);
      modal.removeEventListener('click', alFondo);
      document.removeEventListener('keydown', alTecla);
      resolve(respuesta);
    };
    const alEnviar = ()=> cerrar(true);
    const alCancelar = ()=> cerrar(false);
    const alFondo = e=>{ if(e.target === modal) cerrar(false); };
    const alTecla = e=>{ if(e.key === 'Escape') cerrar(false); };
    enviar.addEventListener('click', alEnviar);
    cancelar.addEventListener('click', alCancelar);
    modal.addEventListener('click', alFondo);
    document.addEventListener('keydown', alTecla);
    modal.style.display = 'flex';
    enviar.focus();
  });
}

/* ---------- NOTIFICACIONES ----------
   Le avisan al admin y al encargado de bodega cuando alguien manda una
   solicitud. Funcionan mientras la app esté abierta (aunque esté minimizada
   o en otra pestaña). Con la app cerrada no llegan. */
const ROLES_RECIBEN_AVISOS = ['admin', 'encargado'];

function recibeAvisos(){ return !!session && ROLES_RECIBEN_AVISOS.includes(session.role); }
function notificacionesDisponibles(){ return 'Notification' in window; }

// Se llama al entrar: muestra el botón "Activar avisos" si hace falta pedir permiso
function prepararAvisos(){
  const btn = document.getElementById('btnAvisos');
  btn.hidden = !(recibeAvisos() && notificacionesDisponibles() && Notification.permission === 'default');
}

document.getElementById('btnAvisos').addEventListener('click', async ()=>{
  try{
    const permiso = await Notification.requestPermission();
    if(permiso === 'granted') showToast('Listo: te avisaré cuando llegue una solicitud nueva.');
    else showToast('Los avisos quedaron bloqueados. Puedes activarlos en la configuración del navegador.', true);
  }catch(e){ console.error(e); }
  prepararAvisos();
});

// Recibe el cambio de la lista de solicitudes y avisa las que se acaban de crear
function avisarSolicitudesNuevas(snap){
  if(!recibeAvisos()) return;
  snap.docChanges().forEach(cambio=>{
    if(cambio.type !== 'added') return;
    if(cambio.doc.metadata.hasPendingWrites) return; // la creé yo desde este equipo
    const r = cambio.doc.data();
    if(r.vendedoraUid && r.vendedoraUid === session.uid) return;
    avisarSolicitud(cambio.doc.id, r);
  });
}

function avisarSolicitud(id, r){
  const prio = prioridadDe(r);
  const quien = r.vendedora || 'Alguien';
  const rol = r.rolSolicitante && r.rolSolicitante !== 'vendedora' ? ' (' + roleLabel(r.rolSolicitante) + ')' : '';
  const titulo = (prio === 'alta' ? '¡Urgente! ' : '') + 'Nueva solicitud de ' + quien + rol;
  const cuerpo = padNum(r.numero) + ' · ' + (r.producto || '') + (etiquetaPrioridad(prio) ? ' · ' + etiquetaPrioridad(prio) : '');

  // Dentro de la app siempre sale el mensajito de abajo
  showToast(titulo + ': ' + (r.producto || ''));

  if(!notificacionesDisponibles() || Notification.permission !== 'granted') return;
  const opciones = {
    body: cuerpo,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'solicitud-' + id,           // no repetir la misma solicitud
    requireInteraction: prio === 'alta'
  };
  // En Android las notificaciones tienen que salir por el service worker
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(titulo, opciones))
      .catch(err => console.warn('No se pudo mostrar la notificación:', err));
  } else {
    try{ new Notification(titulo, opciones); }catch(e){ console.warn('No se pudo mostrar la notificación:', e); }
  }
}
