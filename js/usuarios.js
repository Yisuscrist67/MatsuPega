/* Admin: usuarios y roles */
/* ---------- ADMIN: usuarios (registro y roles) ---------- */
function renderUsuarios(){
  const entries = Object.entries(data.usuarios);
  const pendientes = entries.filter(([,u])=>u.estado==='pendiente');
  const aprobados = entries.filter(([,u])=>u.estado==='aprobado');
  const rechazados = entries.filter(([,u])=>u.estado==='rechazado');

  const badge = document.getElementById('pendUsersBadge');
  if(pendientes.length){ badge.style.display='inline-block'; badge.textContent = pendientes.length; } else badge.style.display='none';

  const pendEl = document.getElementById('pendUsersList');
  const pendEmpty = document.getElementById('emptyPendUsers');
  if(!pendientes.length){ pendEl.innerHTML=''; pendEmpty.style.display='block'; }
  else{
    pendEmpty.style.display='none';
    pendEl.innerHTML = pendientes.map(([uid,u])=>`
      <div class="prod-row">
        <div>
          <div class="pname">${escapeHtml(u.nombre)} <span class="hint" style="margin:0;">@${escapeHtml(u.usuario)}</span></div>
          <div class="porigen">Solicitó acceso el ${fmtDate(u.fecha)}</div>
        </div>
        <div class="pactions">
          <select data-uid="${uid}" class="sel-rol-nuevo">${opcionesRol('vendedora')}</select>
          <button class="btn small btn-aprobar" data-uid="${uid}">Aprobar</button>
          <button class="btn secondary small btn-rechazar" data-uid="${uid}">Rechazar</button>
        </div>
      </div>`).join('');
    pendEl.querySelectorAll('.btn-aprobar').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const uid = b.getAttribute('data-uid');
        const rol = pendEl.querySelector(`.sel-rol-nuevo[data-uid="${uid}"]`).value;
        try{ await db.collection('usuarios').doc(uid).update({ estado:'aprobado', rol }); showToast('Usuario aprobado.'); }
        catch(e){ showToast('No se pudo aprobar.', true); }
      });
    });
    pendEl.querySelectorAll('.btn-rechazar').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const uid = b.getAttribute('data-uid');
        try{ await db.collection('usuarios').doc(uid).update({ estado:'rechazado', rol:null }); showToast('Solicitud rechazada.'); }
        catch(e){ showToast('No se pudo rechazar.', true); }
      });
    });
  }

  const apEl = document.getElementById('approvedUsersList');
  const apEmpty = document.getElementById('emptyApprovedUsers');
  if(!aprobados.length){ apEl.innerHTML=''; apEmpty.style.display='block'; }
  else{
    apEmpty.style.display='none';
    apEl.innerHTML = aprobados.map(([uid,u])=>`
      <div class="prod-row">
        <div>
          <div class="pname">${escapeHtml(u.nombre)} <span class="status rol" style="margin-left:6px;">${roleLabel(u.rol)}</span></div>
          <div class="porigen">@${escapeHtml(u.usuario)}</div>
        </div>
        <div class="pactions">
          <select data-uid="${uid}" class="sel-rol-cambio">${opcionesRol(u.rol)}</select>
          <button class="btn secondary small btn-revocar" data-uid="${uid}">Revocar acceso</button>
        </div>
      </div>`).join('');
    apEl.querySelectorAll('.sel-rol-cambio').forEach(sel=>{
      sel.addEventListener('change', async ()=>{
        const uid = sel.getAttribute('data-uid');
        try{ await db.collection('usuarios').doc(uid).update({ rol: sel.value }); showToast('Rol actualizado.'); }
        catch(e){ showToast('No se pudo cambiar el rol.', true); }
      });
    });
    apEl.querySelectorAll('.btn-revocar').forEach(b=>{
      b.addEventListener('click', async ()=>{
        if(!confirm('¿Revocar el acceso de este usuario?')) return;
        const uid = b.getAttribute('data-uid');
        try{ await db.collection('usuarios').doc(uid).update({ estado:'rechazado' }); showToast('Acceso revocado.'); }
        catch(e){ showToast('No se pudo revocar.', true); }
      });
    });
  }

  const reEl = document.getElementById('rejectedUsersList');
  const reEmpty = document.getElementById('emptyRejectedUsers');
  if(!rechazados.length){ reEl.innerHTML=''; reEmpty.style.display='block'; }
  else{
    reEmpty.style.display='none';
    reEl.innerHTML = rechazados.map(([uid,u])=>`
      <div class="prod-row">
        <div>
          <div class="pname">${escapeHtml(u.nombre)}</div>
          <div class="porigen">@${escapeHtml(u.usuario)}</div>
        </div>
        <button class="btn secondary small btn-reconsiderar" data-uid="${uid}">Reconsiderar</button>
      </div>`).join('');
    reEl.querySelectorAll('.btn-reconsiderar').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const uid = b.getAttribute('data-uid');
        try{ await db.collection('usuarios').doc(uid).update({ estado:'pendiente' }); showToast('Vuelto a solicitudes pendientes.'); }
        catch(e){ showToast('No se pudo actualizar.', true); }
      });
    });
  }
}
