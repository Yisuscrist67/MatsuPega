/* Conexión a Firebase, Google Sheets y constantes */
/* ---------- FIREBASE ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDH40dDTcP1eAzfGin_MrU4gC9TD7A0Two",
  authDomain: "lolaso-87abc.firebaseapp.com",
  projectId: "lolaso-87abc",
  storageBucket: "lolaso-87abc.firebasestorage.app",
  messagingSenderId: "998346206931",
  appId: "1:998346206931:web:d58bc267c3fd5675edee26"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const EMAIL_DOMAIN = '@lonas-app.local';

/* ---------- GOOGLE SHEETS (la hoja es la fuente del catálogo) ---------- */
const SHEETS_WEBAPP_URL = '';

async function sheetsAccion(payload){
  if(!SHEETS_WEBAPP_URL) throw new Error('falta configurar SHEETS_WEBAPP_URL');
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(SHEETS_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ ...payload, idToken })
  });
  const json = await res.json();
  if(!json.ok) throw new Error(json.error || 'error desconocido');
  return json;
}
