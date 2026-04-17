// script.js - Firebase Configuration & Database Functions (Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// KONFIGURASI FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBK285KQJNJJvHQdTiXVY6B__jr6tWy_BE",
  authDomain: "silapor-57339.firebaseapp.com",
  projectId: "silapor-57339",
  storageBucket: "silapor-57339.firebasestorage.app",
  messagingSenderId: "234883893986",
  appId: "1:234883893986:web:7c580af095e67fbcd32cbb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// STRATEGI HEMAT BANDWIDTH - Strip foto dari cache list
// ============================================================
function stripPhotos(t) {
  const { photos, followUpPhotos, ...rest } = t;
  return {
    ...rest,
    hasPhotos: (photos && photos.length > 0) || false,
    hasFollowUpPhotos: (followUpPhotos && followUpPhotos.length > 0) || false
  };
}

// ============================================================
// INISIALISASI DATA AWAL
// ============================================================
async function initFirebaseDB() {
  showLoadingOverlay(true);
  try {
    // Cek apakah dokumen admin sudah ada
    const adminSnap = await getDoc(doc(db, 'config', 'admin'));
    if (!adminSnap.exists()) {
      // Buat data awal jika belum ada
      await setDoc(doc(db, 'config', 'admin'), {
        username: "admin",
        passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
      });
    }
    await reloadDB();
  } catch (e) {
    console.error('Firestore init error:', e);
    showDBError();
  }
  showLoadingOverlay(false);
}

// ============================================================
// LOAD DB RINGAN KE CACHE LOKAL
// ============================================================
window.reloadDB = async function () {
  try {
    const [schoolsSnap, adminSnap, ticketsSnap] = await Promise.all([
      getDocs(collection(db, 'schools')),
      getDoc(doc(db, 'config', 'admin')),
      getDocs(collection(db, 'tickets'))
    ]);

    window.DB = {
      schools: schoolsSnap.empty
        ? []
        : schoolsSnap.docs.map(d => d.data()),
      tickets: ticketsSnap.empty
        ? []
        : ticketsSnap.docs.map(d => stripPhotos(d.data())),
      admin: adminSnap.exists()
        ? adminSnap.data()
        : { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }
    };
  } catch (e) {
    console.error('reloadDB error:', e);
  }
};

// ============================================================
// AMBIL SATU TIKET LENGKAP (dengan foto) dari Firestore
// ============================================================
window.fbGetTicketFull = async function (id) {
  try {
    const snap = await getDoc(doc(db, 'tickets', id));
    if (snap.exists()) {
      const t = snap.data();
      return { ...t, photos: t.photos || [], followUpPhotos: t.followUpPhotos || [] };
    }
  } catch (e) {
    console.error('fbGetTicketFull error:', e);
  }
  return null;
};

// ============================================================
// SIMPAN / UPDATE DATA KE FIRESTORE
// ============================================================

// Simpan school ke Firestore
window.fbSaveSchool = async function (school) {
  await setDoc(doc(db, 'schools', school.id), school);
};

// Simpan ticket baru ke Firestore
window.fbSaveTicket = async function (ticket) {
  await setDoc(doc(db, 'tickets', ticket.id), ticket);
};

// Update sebagian field ticket
window.fbUpdateTicket = async function (id, fields) {
  await updateDoc(doc(db, 'tickets', id), fields);
};

// Update admin (disimpan di koleksi config, dokumen admin)
window.fbSaveAdmin = async function (adminObj) {
  await setDoc(doc(db, 'config', 'admin'), adminObj);
};

// Update sebagian field school
window.fbUpdateSchool = async function (id, fields) {
  await updateDoc(doc(db, 'schools', id), fields);
};

// ============================================================
// REALTIME LISTENERS (onSnapshot)
// ============================================================
let _schoolsUnsub = null;
let _ticketsUnsub = null;

function startRealtimeListeners() {
  // Hentikan listener lama jika ada
  if (_schoolsUnsub) _schoolsUnsub();
  if (_ticketsUnsub) _ticketsUnsub();

  // Listener koleksi schools
  _schoolsUnsub = onSnapshot(collection(db, 'schools'), (snap) => {
    if (!window.DB) return;
    window.DB.schools = snap.empty ? [] : snap.docs.map(d => d.data());
  });

  // Listener koleksi tickets (tanpa foto untuk hemat bandwidth)
  _ticketsUnsub = onSnapshot(collection(db, 'tickets'), (snap) => {
    if (!window.DB) return;
    window.DB.tickets = snap.empty
      ? []
      : snap.docs.map(d => stripPhotos(d.data()));

    // Re-render UI sesuai tipe user yang sedang login
    if (window.currentUser) {
      if (window.currentUser.type === 'school') {
        renderSchoolTickets && renderSchoolTickets();
        updateSchoolStats && updateSchoolStats();
      } else if (window.currentUser.type === 'admin') {
        updateAdminStats && updateAdminStats();
        renderAdminRecent && renderAdminRecent();
      }
    }
  });
}

window.startRealtimeListeners = startRealtimeListeners;

// ============================================================
// JALANKAN INISIALISASI SAAT DOM SIAP
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initFirebaseDB().then(() => {
    startRealtimeListeners();
    if (window.restoreLoginState) {
      window.restoreLoginState();
    }
  });
});
