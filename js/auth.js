/* Login, registro, sesión y cierre de sesión */
/* ---------- GATE NAV ---------- */
document.getElementById('goLogin').addEventListener('click', ()=> switchGate('gateLogin'));
document.getElementById('goRegistro').addEventListener('click', ()=> switchGate('gateRegistro'));
document.getElementById('backFromLogin').addEventListener('click', ()=> switchGate('gateHome'));
document.getElementById('backFromRegistro').addEventListener('click', ()=> switchGate('gateHome'));
function switchGate(which){
  ['gateHome','gateLogin','gateRegistro'].forEach(id=>{
    document.getElementById(id).style.display = id===which ? (id==='gateHome' ? 'flex':'block') : 'none';
  });
}

/* ---------- REGISTRO ---------- */
document.getElementById('btnRegistro').addEventListener('click', async ()=>{
  const nombre = document.getElementById('regNombre').value.trim();
  const usuario = document.getElementById('regUsuario').value.trim();
  const pass = document.getElementById('regPass').value;
  const msg = document.getElementById('regMsg');
  msg.style.color = 'var(--canvas-dim)';
  if(!nombre || !usuario || !pass){ msg.textContent = 'Completa todos los campos.'; return; }
  if(pass.length < 6){ msg.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
  try{
    const cred = await auth.createUserWithEmailAndPassword(usuarioToEmail(usuario), pass);
    await db.collection('usuarios').doc(cred.user.uid).set({
      nombre, usuario: usuario.toLowerCase(), estado: 'pendiente', rol: null, fecha: new Date().toISOString()
    });
    await auth.signOut();
    msg.textContent = 'Tu solicitud fue enviada. Espera a que el admin apruebe tu acceso y te asigne un rol.';
    document.getElementById('regNombre').value='';
    document.getElementById('regUsuario').value='';
    document.getElementById('regPass').value='';
  }catch(e){
    msg.style.color = '#E08A8A';
    if(e.code === 'auth/email-already-in-use') msg.textContent = 'Ese nombre de usuario ya está en uso.';
    else if(e.code === 'auth/weak-password') msg.textContent = 'La contraseña es muy débil (mínimo 6 caracteres).';
    else msg.textContent = 'No se pudo enviar la solicitud. Intenta de nuevo.';
    console.error(e);
  }
});

/* ---------- LOGIN ---------- */
document.getElementById('btnLogin').addEventListener('click', async ()=>{
  const usuario = document.getElementById('loginUsuario').value.trim();
  const pass = document.getElementById('loginPass').value;
  const remember = document.getElementById('rememberMe').checked;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';
  if(!usuario || !pass){ msg.textContent = 'Ingresa usuario y contraseña.'; return; }
  try{
    if(remember){
      // Si selecciona recordar por 15 días: persistencia LOCAL y guardamos la fecha límite
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const expireTime = Date.now() + (15 * 24 * 60 * 60 * 1000); // 15 días en ms
      localStorage.setItem('session_expiration', expireTime.toString());
    } else {
      // Si no lo marca: la sesión se cierra al cerrar la pestaña
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      localStorage.removeItem('session_expiration');
    }

    const cred = await auth.signInWithEmailAndPassword(usuarioToEmail(usuario), pass);
    document.getElementById('loginUsuario').value='';
    document.getElementById('loginPass').value='';
  }catch(e){
    msg.textContent = 'Usuario o contraseña incorrectos.';
    console.error(e);
  }
});

/* ---------- SESIÓN Y CONEXIÓN EN TIEMPO REAL ---------- */
// Se llama desde app.js cuando todos los archivos ya cargaron
function iniciarAuth(){
  auth.onAuthStateChanged((user) => {
    // Limpiar escuchadores previos si existen
    stopAllListeners();

    if (!user) {
      session = null;
      document.getElementById('shell').style.display = 'none';
      document.getElementById('gate').style.display = 'block';
      switchGate('gateHome');
      return;
    }

    // Verificar expiración de 15 días
    const expireTimeStr = localStorage.getItem('session_expiration');
    if (expireTimeStr) {
      const expireTime = parseInt(expireTimeStr, 10);
      if (Date.now() > expireTime) {
        localStorage.removeItem('session_expiration');
        auth.signOut();
        showToast('Tu sesión de 15 días ha expirado. Por favor, vuelve a ingresar.', true);
        return;
      }
    }

    // Escuchar el perfil del usuario actual en TIEMPO REAL
    unsubscribeUserDoc = db.collection('usuarios').doc(user.uid).onSnapshot((docSnap) => {
      if (!docSnap.exists) {
        auth.signOut();
        showToast('Usuario no registrado en la base de datos.', true);
        return;
      }

      const u = docSnap.data();

      if (u.estado !== 'aprobado') {
        auth.signOut();
        session = null;
        document.getElementById('shell').style.display = 'none';
        document.getElementById('gate').style.display = 'block';
        if (u.estado === 'pendiente') showToast('Tu cuenta aún está pendiente de aprobación.');
        if (u.estado === 'rechazado') showToast('Tu solicitud de acceso fue rechazada.', true);
        return;
      }

      const prevRole = session ? session.role : null;
      session = { role: u.rol, nombre: u.nombre, uid: user.uid, usuario: u.usuario };

      // Si cambió de rol o es la primera carga
      if (!prevRole || prevRole !== u.rol) {
        startApp();
      } else {
        document.getElementById('whoName').textContent = session.nombre + ' · ' + roleLabel(session.role);
      }
    }, (err) => {
      console.error("Error reconectando usuario:", err);
      setConn(false, err);
    });
  });
}

function stopAllListeners() {
  if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
  if (unsubscribeRequests) { unsubscribeRequests(); unsubscribeRequests = null; }
  if (unsubscribeProductos) { unsubscribeProductos(); unsubscribeProductos = null; }
  if (unsubscribeUsuarios) { unsubscribeUsuarios(); unsubscribeUsuarios = null; }
}

document.getElementById('btnLogout').addEventListener('click', async ()=>{
  cerrarReporte();
  stopAllListeners();
  localStorage.removeItem('session_expiration');
  await auth.signOut();
  session = null;
  document.getElementById('shell').style.display='none';
  document.getElementById('gate').style.display='block';
  switchGate('gateHome');
});
