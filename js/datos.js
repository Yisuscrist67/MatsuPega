/* Escuchadores de Firestore en tiempo real */
/* ---------- FIRESTORE LISTENERS (tiempo real) ---------- */
function startDataListeners(){
  if (unsubscribeRequests) unsubscribeRequests();
  if (unsubscribeProductos) unsubscribeProductos();
  showConnecting();

  let primeraCarga = true;
  unsubscribeRequests = db.collection('requests').onSnapshot(snap=>{
    // La primera vez llegan todas las solicitudes que ya existían: esas no se avisan
    if(!primeraCarga) avisarSolicitudesNuevas(snap);
    primeraCarga = false;
    data.requests = snap.docs.map(d=>({ id: d.id, ...d.data() }));
    refreshAll();
    setConn(true);
  }, err=>{ setConn(false, err); });

  unsubscribeProductos = db.collection('productos').onSnapshot(snap=>{
    const map = {};
    snap.docs.forEach(d=>{ map[d.id] = d.data(); });
    productosFirestore = map;
    mezclarCatalogo();
    setConn(true);
  }, err=>{ setConn(false, err); });

  cargarHojaProductos();
  if(!timerHoja) timerHoja = setInterval(cargarHojaProductos, HOJA_REFRESCO_MS);
}

/* ---------- CATÁLOGO DESDE LA GOOGLE SHEET ----------
   La página lee la hoja "Base de datos (mia)" (columnas: Nombre, Categoria, tiene_foto)
   y la junta con los productos guardados en Firestore. La hoja tiene que estar
   compartida como "Cualquier persona con el enlace: Lector". */
const HOJA_ID = '1jmLgX-vIXlIkA30U45jKKrYNB1lfSIx83yrdx2w50YI';
const HOJA_PESTANA = 'Hoja 1';
const HOJA_REFRESCO_MS = 5 * 60 * 1000; // vuelve a leerla cada 5 minutos
let productosFirestore = {};
let productosHoja = {};
let timerHoja = null;

async function cargarHojaProductos(){
  const url = 'https://docs.google.com/spreadsheets/d/' + HOJA_ID
    + '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(HOJA_PESTANA); // headers=1: solo la fila 1 es encabezado
  try{
    const res = await fetch(url, { cache: 'no-store' });
    const texto = res.ok ? await res.text() : '';
    // Si la hoja no está compartida, Google responde con su página de inicio de sesión
    if(!res.ok || /^\s*</.test(texto)) throw new Error('la hoja no está compartida con enlace (HTTP ' + res.status + ')');
    productosHoja = leerFilasHoja(texto);
    mezclarCatalogo();
  }catch(e){
    console.warn('No se pudo leer la Google Sheet:', e);
  }
}

// Convierte el CSV de la hoja en { clave: producto }
function leerFilasHoja(csv){
  const filas = parsearCsv(csv);
  const map = {};
  filas.slice(1).forEach(f=>{
    const nombre = (f[0] || '').trim();
    if(!nombre || nombre.indexOf('/') !== -1) return;
    const marca = (f[2] || '').trim().toLowerCase();
    map[normProd(nombre)] = {
      nombreOriginal: nombre,
      categoria: (f[1] || '').trim(),
      tieneFoto: ['si', 'sí', 'true', 'x', '1'].includes(marca),
      origen: 'sheets',
      fecha: null
    };
  });
  return map;
}

function parsearCsv(texto){
  const filas = []; let fila = []; let campo = ''; let comillas = false;
  for(let i = 0; i < texto.length; i++){
    const c = texto[i];
    if(comillas){
      if(c === '"' && texto[i+1] === '"'){ campo += '"'; i++; }
      else if(c === '"') comillas = false;
      else campo += c;
    } else if(c === '"') comillas = true;
    else if(c === ','){ fila.push(campo); campo = ''; }
    else if(c === '\n' || c === '\r'){
      if(c === '\r' && texto[i+1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if(campo || fila.length){ fila.push(campo); filas.push(fila); }
  return filas;
}

// Junta hoja + Firestore. Lo guardado en Firestore (fotos subidas, marcas del admin) manda.
function mezclarCatalogo(){
  const map = {};
  Object.entries(productosHoja).forEach(([k,p])=>{ map[k] = { ...p }; });
  Object.entries(productosFirestore).forEach(([k,p])=>{ map[k] = { ...(map[k] || {}), ...p }; });
  data.productos = map;
  refreshAll();
}

function startUsersListener(){
  if (unsubscribeUsuarios) unsubscribeUsuarios();

  unsubscribeUsuarios = db.collection('usuarios').onSnapshot(snap=>{
    const map = {};
    snap.docs.forEach(d=>{ map[d.id] = d.data(); });
    data.usuarios = map;
    if(session && session.role === 'admin') renderUsuarios();
  }, err=>{ console.error(err); });
}

function showConnecting(){
  const el = document.getElementById('connstate');
  el.textContent = 'Conectando...'; el.className = 'connstate'; el.style.display = 'block';
}
function hideConn(){ document.getElementById('connstate').style.display = 'none'; }

function setConn(ok, err){
  const el = document.getElementById('connstate');
  if(ok){ el.textContent = 'Conectado'; el.className = 'connstate ok'; setTimeout(()=>{ el.style.display='none'; }, 1500); }
  else{ el.style.display='block'; el.textContent = 'Sin conexión con la base de datos'; el.className = 'connstate bad'; if(err) console.error(err); }
}

async function siguienteNumero(){
  const ref = db.collection('meta').doc('counter');
  return db.runTransaction(async (t)=>{
    const snap = await t.get(ref);
    const current = snap.exists ? (snap.data().nextNumero || 1) : 1;
    t.set(ref, { nextNumero: current + 1 });
    return current;
  });
}
