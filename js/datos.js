/* Escuchadores de Firestore en tiempo real */
/* ---------- FIRESTORE LISTENERS (tiempo real) ---------- */
function startDataListeners(){
  if (unsubscribeRequests) unsubscribeRequests();
  if (unsubscribeProductos) unsubscribeProductos();
  showConnecting();

  unsubscribeRequests = db.collection('requests').onSnapshot(snap=>{
    data.requests = snap.docs.map(d=>({ id: d.id, ...d.data() }));
    refreshAll();
    setConn(true);
  }, err=>{ setConn(false, err); });

  unsubscribeProductos = db.collection('productos').onSnapshot(snap=>{
    const map = {};
    snap.docs.forEach(d=>{ map[d.id] = d.data(); });
    data.productos = map;
    refreshAll();
    setConn(true);
  }, err=>{ setConn(false, err); });
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
