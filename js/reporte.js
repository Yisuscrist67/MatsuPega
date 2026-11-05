/* Reporte mensual de solicitudes (solo admin y encargado) */

const ROLES_REPORTE = ['admin', 'encargado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
let reporteActual = null; // { mes, titulo, items, porVendedora }

function puedeVerReporte(){
  return !!session && ROLES_REPORTE.includes(session.role);
}

function mesActualISO(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function tituloMes(mesISO){
  const [y, m] = mesISO.split('-').map(Number);
  return MESES[m-1].charAt(0).toUpperCase() + MESES[m-1].slice(1) + ' ' + y;
}

function fechaCorta(iso){
  if(!iso) return '';
  return new Date(iso).toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit', year:'numeric'});
}

function abrirReporte(){
  if(!puedeVerReporte()) return;
  const input = document.getElementById('reporteMes');
  if(!input.value) input.value = mesActualISO();
  input.max = mesActualISO();
  document.getElementById('reporteModal').style.display = 'flex';
  generarReporte();
}

function cerrarReporte(){
  document.getElementById('reporteModal').style.display = 'none';
}

function calcularReporte(mesISO){
  const [y, m] = mesISO.split('-').map(Number);
  const items = data.requests.filter(r=>{
    if(!r.fecha) return false;
    const d = new Date(r.fecha);
    return d.getFullYear() === y && d.getMonth() === m-1;
  }).sort((a,b)=> new Date(a.fecha) - new Date(b.fecha));

  const porVendedora = {};
  items.forEach(r=>{
    const v = r.vendedora || '(sin nombre)';
    if(!porVendedora[v]) porVendedora[v] = { total:0, solucionadas:0, pendientes:0 };
    porVendedora[v].total++;
    if(r.estado === 'completada') porVendedora[v].solucionadas++;
    else porVendedora[v].pendientes++;
  });

  return { mes: mesISO, titulo: tituloMes(mesISO), items, porVendedora };
}

function generarReporte(){
  if(!puedeVerReporte()) return;
  const mes = document.getElementById('reporteMes').value;
  const cont = document.getElementById('reporteContenido');
  const acciones = document.getElementById('reporteAcciones');
  if(!mes){ cont.innerHTML = '<div class="empty">Elige un mes.</div>'; acciones.style.display='none'; return; }

  reporteActual = calcularReporte(mes);
  const { items, porVendedora, titulo } = reporteActual;

  if(!items.length){
    cont.innerHTML = `<div class="empty">No hubo solicitudes en ${escapeHtml(titulo)}.</div>`;
    acciones.style.display = 'none';
    return;
  }

  const solucionadas = items.filter(r=>r.estado==='completada').length;
  const pendientes = items.length - solucionadas;
  const vendedoras = Object.keys(porVendedora).sort();

  cont.innerHTML = `
    <div class="stats-grid">
      <div class="stat"><div class="n">${items.length}</div><div class="l">Solicitudes</div></div>
      <div class="stat"><div class="n">${solucionadas}</div><div class="l">Solucionadas</div></div>
      <div class="stat"><div class="n">${pendientes}</div><div class="l">Pendientes</div></div>
    </div>

    <h3 class="section">Por vendedora</h3>
    <div class="rep-table-wrap"><table class="rep-table">
      <thead><tr><th>Vendedora</th><th>Total</th><th>Solucionadas</th><th>Pendientes</th></tr></thead>
      <tbody>${vendedoras.map(v=>`<tr>
        <td>${escapeHtml(v)}</td><td>${porVendedora[v].total}</td>
        <td>${porVendedora[v].solucionadas}</td><td>${porVendedora[v].pendientes}</td>
      </tr>`).join('')}</tbody>
    </table></div>

    <h3 class="section">Detalle de solicitudes</h3>
    <div class="rep-table-wrap"><table class="rep-table">
      <thead><tr><th>N°</th><th>Fecha</th><th>Vendedora</th><th>Producto</th><th>Descripción</th><th>Estado</th></tr></thead>
      <tbody>${items.map(r=>{
        const ok = r.estado === 'completada';
        return `<tr>
          <td>${padNum(r.numero)}</td>
          <td>${fechaCorta(r.fecha)}</td>
          <td>${escapeHtml(r.vendedora||'')}</td>
          <td>${escapeHtml(r.producto||'')}</td>
          <td class="desc">${escapeHtml(r.detalle||'—')}</td>
          <td class="${ok?'ok':'no'}">${ok ? 'Solucionada' : 'Pendiente'}${ok && r.atendidoPor ? `<br><span style="font-weight:400;color:var(--ink-dim);font-size:11.5px;">${escapeHtml(r.atendidoPor)}</span>` : ''}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  acciones.style.display = 'flex';
}

/* ---------- Exportar a Excel (CSV) ---------- */
function celdaCsv(v){
  const s = String(v ?? '').replace(/\r?\n/g, ' ');
  return /[";]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}

function descargarCsv(){
  if(!reporteActual) return;
  const filas = [['N°','Fecha','Vendedora','Producto','Descripción','Estado','Atendida por','Fecha solución']];
  reporteActual.items.forEach(r=>{
    const ok = r.estado === 'completada';
    filas.push([
      padNum(r.numero), fechaCorta(r.fecha), r.vendedora, r.producto, r.detalle,
      ok ? 'Solucionada' : 'Pendiente', ok ? (r.atendidoPor||'') : '', ok ? fechaCorta(r.fechaCompletada) : ''
    ]);
  });
  // Excel en español usa ";" como separador; el BOM hace que lea bien los tildes
  const csv = '﻿' + filas.map(f=>f.map(celdaCsv).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-solicitudes-${reporteActual.mes}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

/* ---------- Imprimir / guardar como PDF ---------- */
function imprimirReporte(){
  if(!reporteActual) return;
  const contenido = document.getElementById('reporteContenido').innerHTML;
  const w = window.open('', '_blank');
  if(!w){ showToast('El navegador bloqueó la ventana. Permite ventanas emergentes para esta página.', true); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Reporte de solicitudes · ${escapeHtml(reporteActual.titulo)}</title>
    <style>
      body{font-family:Arial, sans-serif;color:#1a1a1a;margin:28px;font-size:12px;}
      h1{font-size:18px;margin:0 0 4px;} .sub{color:#666;margin-bottom:18px;}
      .stats-grid{display:flex;gap:10px;margin-bottom:16px;}
      .stat{border:1px solid #ccc;padding:8px 12px;flex:1;} .stat .n{font-size:20px;font-weight:bold;} .stat .l{color:#666;font-size:11px;}
      h3{font-size:13px;margin:18px 0 8px;}
      table{width:100%;border-collapse:collapse;}
      th{text-align:left;border-bottom:2px solid #333;padding:5px 6px;font-size:11px;}
      td{border-bottom:1px solid #ddd;padding:5px 6px;vertical-align:top;}
      td span{color:#666 !important;}
      .ok{color:#2e6b38;font-weight:bold;} .no{color:#a5531c;font-weight:bold;}
      tr{page-break-inside:avoid;}
    </style></head><body>
    <h1>Reporte de solicitudes de fotos</h1>
    <div class="sub">${escapeHtml(reporteActual.titulo)} · generado el ${fechaCorta(new Date().toISOString())} por ${escapeHtml(session.nombre)}</div>
    ${contenido}
    <script>window.onload = () => window.print();<\/script>
    </body></html>`);
  w.document.close();
}

/* ---------- Eventos ---------- */
document.getElementById('btnReporte').addEventListener('click', abrirReporte);
document.getElementById('reporteCerrar').addEventListener('click', cerrarReporte);
document.getElementById('reporteGenerar').addEventListener('click', generarReporte);
document.getElementById('reporteMes').addEventListener('change', generarReporte);
document.getElementById('reporteCsv').addEventListener('click', descargarCsv);
document.getElementById('reporteImprimir').addEventListener('click', imprimirReporte);
document.getElementById('reporteModal').addEventListener('click', e=>{
  if(e.target.id === 'reporteModal') cerrarReporte();
});
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && document.getElementById('reporteModal').style.display !== 'none') cerrarReporte();
});
