// script.js - Firebase Configuration & Database Functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ============================================================
// KONFIGURASI FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBK285KQJNJJvHQdTiXVY6B__jr6tWy_BE",
  authDomain: "silapor-57339.firebaseapp.com",
  databaseURL: "https://silapor-57339-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "silapor-57339",
  storageBucket: "silapor-57339.firebasestorage.app",
  messagingSenderId: "234883893986",
  appId: "1:234883893986:web:7c580af095e67fbcd32cbb"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

// Expose ke global scope untuk app.js
window._firebaseDB = db;
window._fbRef = ref;
window._fbSet = set;
window._fbGet = get;
window._fbUpdate = update;
window._fbOnValue = onValue;

// Inisialisasi data awal
async function initFirebaseDB() {
  showLoadingOverlay(true);
  try {
    const snapshot = await get(ref(db, '/'));
    if (!snapshot.exists()) {
      const initialData = {
        schools: {},
        tickets: {},
        admin: { username: "admin", passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918" }
      };
      await set(ref(db, '/'), initialData);
    }
    await reloadDB();
  } catch(e) {
    console.error('Firebase init error:', e);
    showDBError();
  }
  showLoadingOverlay(false);
}

// Load DB ringan ke cache lokal
window.reloadDB = async function() {
  try {
    const [schoolsSnap, adminSnap, ticketsSnap] = await Promise.all([
      get(ref(db, 'schools')),
      get(ref(db, 'admin')),
      get(ref(db, 'tickets'))
    ]);
    window.DB = {
      schools: schoolsSnap.exists() ? Object.values(schoolsSnap.val()) : [],
      tickets: ticketsSnap.exists()
        ? Object.values(ticketsSnap.val()).map(t => stripPhotos(t))
        : [],
      admin: adminSnap.exists() ? adminSnap.val() : { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }
    };
  } catch(e) {
    console.error('reloadDB error:', e);
  }
};

// Ambil SATU tiket lengkap (dengan foto) dari Firebase
window.fbGetTicketFull = async function(id) {
  try {
    const snap = await get(ref(db, 'tickets/' + id));
    if (snap.exists()) {
      const t = snap.val();
      return { ...t, photos: t.photos || [], followUpPhotos: t.followUpPhotos || [] };
    }
  } catch(e) {
    console.error('fbGetTicketFull error:', e);
  }
  return null;
};

// Simpan schools ke Firebase
window.fbSaveSchool = async function(school) {
  await set(ref(db, 'schools/' + school.id), school);
};

// Simpan ticket ke Firebase
window.fbSaveTicket = async function(ticket) {
  await set(ref(db, 'tickets/' + ticket.id), ticket);
};

// Update sebagian field ticket
window.fbUpdateTicket = async function(id, fields) {
  await update(ref(db, 'tickets/' + id), fields);
};

// Update admin
window.fbSaveAdmin = async function(adminObj) {
  await set(ref(db, 'admin'), adminObj);
};

// Update school
window.fbUpdateSchool = async function(id, fields) {
  await update(ref(db, 'schools/' + id), fields);
};

// Realtime listener RINGAN
let _schoolsUnsub = null, _ticketsUnsub = null;

function startRealtimeListeners() {
  if (_schoolsUnsub) _schoolsUnsub();
  if (_ticketsUnsub) _ticketsUnsub();

  _schoolsUnsub = onValue(ref(db, 'schools'), (snap) => {
    if (!window.DB) return;
    window.DB.schools = snap.exists() ? Object.values(snap.val()) : [];
  });

  _ticketsUnsub = onValue(ref(db, 'tickets'), (snap) => {
    if (!window.DB) return;
    window.DB.tickets = snap.exists()
      ? Object.values(snap.val()).map(t => stripPhotos(t))
      : [];
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

// Jalankan inisialisasi
window.addEventListener('DOMContentLoaded', () => {
  initFirebaseDB().then(() => {
    startRealtimeListeners();
    if (window.restoreLoginState) {
      window.restoreLoginState();
    }
  });
});