// ===== Firebase de Winter Arc =====
// Mismo proyecto que deberes / examenes / notas / mi-semana: la misma cuenta Google.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  doc, setDoc, onSnapshot, initializeFirestore,
  persistentLocalCache, persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC1mBofZooE010PRKjCo-fENDYU1lqWbh0',
  authDomain: 'deberes-e3282.firebaseapp.com',
  projectId: 'deberes-e3282',
  storageBucket: 'deberes-e3282.firebasestorage.app',
  messagingSenderId: '457365914046',
  appId: '1:457365914046:web:e3cf994128c4b75da479ef'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Winter Arc guarda TODO en un único documento: users/{uid}/arc/datos
// (el MISMO patrón que mi-semana / notas / examenes, que ya funcionan)
const docArc = (uid) => doc(db, 'users', uid, 'arc', 'datos');

// ---- Sesión ----

export function enCambiarSesion(callback) {
  onAuthStateChanged(auth, callback);
}

export async function entrar() {
  const proveedor = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, proveedor);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, proveedor);
    } else {
      throw e;
    }
  }
}

export async function salir() {
  await signOut(auth);
}

// Recoger el resultado del login por redirección (móvil)
getRedirectResult(auth).catch(() => {});

// ---- Sincronización ----

// Escucha el documento de la nube en tiempo real.
export function escucharArc(uid, alBajar, alEstado) {
  return onSnapshot(docArc(uid), (snap) => {
    alEstado('conectado');
    alBajar(snap.exists() ? snap.data() : null);
  }, (error) => {
    alEstado('error: ' + error.code);
  });
}

// Sube el estado completo (última-escritura-gana, como mi-semana)
export async function subirArc(uid, datos) {
  await setDoc(docArc(uid), datos);
}
