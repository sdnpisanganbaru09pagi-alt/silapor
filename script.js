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
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// LOAD XLSX LIBRARY (CDN)
// ============================================================
(function loadXLSX() {
  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.15.6/xlsx.full.min.js';
    script.onload = () => console.log('[OK] XLSX library loaded from CDN');
    script.onerror = () => console.error('[ERROR] Failed to load XLSX library from CDN');
    document.head.appendChild(script);
  }
})();

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

const TICKET_PAGE_SIZE = 25;
const DB_DEFAULT = { schools: [], tickets: [], admin: { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' } };

if (!window.DB) window.DB = { ...DB_DEFAULT };
if (!window.DBMeta) {
  window.DBMeta = {
    tickets: {
      context: 'none',
      schoolId: null,
      lastVisible: null,
      hasMore: false,
      isLoading: false,
      pageSize: TICKET_PAGE_SIZE
    }
  };
}

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

function defaultAdmin() {
  return { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' };
}

function upsertTicketToCache(ticketLite) {
  if (!window.DB || !window.DB.tickets) return;
  const idx = window.DB.tickets.findIndex(t => t.id === ticketLite.id);
  if (idx === -1) window.DB.tickets.unshift(ticketLite);
  else window.DB.tickets[idx] = { ...window.DB.tickets[idx], ...ticketLite };
}

function runTicketRenderHooks() {
  const session = getSessionUser();
  if (session?.type === 'school') {
    window.renderSchoolTickets && window.renderSchoolTickets();
    window.updateSchoolStats && window.updateSchoolStats();
  } else if (session?.type === 'admin') {
    window.updateAdminStats && window.updateAdminStats();
    window.renderAdminRecent && window.renderAdminRecent();
    window.renderAdminTickets && window.renderAdminTickets();
    window.renderSchoolTable && window.renderSchoolTable();
    window.renderUserTable && window.renderUserTable();
  }
}

function getSessionUser() {
  try {
    const raw = sessionStorage.getItem('SiLaPorUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function buildTicketsQuery({ context, schoolId, lastVisible = null, pageSize = TICKET_PAGE_SIZE }) {
  const baseRef = collection(db, 'tickets');
  let q = null;

  if (context === 'school' && schoolId) {
    // Hindari kebutuhan composite index (schoolId + date) agar dashboard sekolah tetap ter-load
    // di project yang belum membuat index tersebut.
    q = query(baseRef, where('schoolId', '==', schoolId), limit(pageSize));
  } else {
    q = query(baseRef, orderBy('date', 'desc'), limit(pageSize));
  }

  if (lastVisible) {
    q = context === 'school' && schoolId
      ? query(baseRef, where('schoolId', '==', schoolId), startAfter(lastVisible), limit(pageSize))
      : query(baseRef, orderBy('date', 'desc'), startAfter(lastVisible), limit(pageSize));
  }

  return q;
}

let _schoolsUnsub = null;
let _ticketsUnsub = null;

function stopRealtimeListeners() {
  if (_schoolsUnsub) _schoolsUnsub();
  if (_ticketsUnsub) _ticketsUnsub();
  _schoolsUnsub = null;
  _ticketsUnsub = null;
}

async function ensureCoreData() {
  const [schoolsSnap, adminSnap] = await Promise.all([
    getDocs(collection(db, 'schools')),
    getDoc(doc(db, 'config', 'admin'))
  ]);

  window.DB.schools = schoolsSnap.empty ? [] : schoolsSnap.docs.map(d => d.data());
  window.DB.admin = adminSnap.exists() ? adminSnap.data() : defaultAdmin();
}

window.fbLoadTicketsPage = async function ({ context = 'admin', schoolId = null, reset = false } = {}) {
  const meta = window.DBMeta.tickets;
  if (meta.isLoading) return;

  const contextChanged = meta.context !== context || meta.schoolId !== schoolId;
  if (reset || contextChanged) {
    window.DB.tickets = [];
    meta.lastVisible = null;
    meta.hasMore = false;
  }

  meta.context = context;
  meta.schoolId = schoolId || null;
  meta.isLoading = true;

  try {
    let q = buildTicketsQuery({
      context,
      schoolId,
      lastVisible: meta.lastVisible,
      pageSize: meta.pageSize
    });

    let snap = await getDocs(q);

    // Fallback: beberapa data lama bisa tidak punya field "date" / belum ada index orderBy.
    // Jika query gagal, coba query tanpa orderBy agar data tidak hilang setelah refresh.
    if (!snap) {
      throw new Error('Failed to load ticket page');
    }
    const rows = snap.empty ? [] : snap.docs.map(d => stripPhotos(d.data()));

    if (!meta.lastVisible) {
      window.DB.tickets = rows;
    } else {
      const existing = new Set(window.DB.tickets.map(t => t.id));
      const merged = rows.filter(r => !existing.has(r.id));
      window.DB.tickets = [...window.DB.tickets, ...merged];
    }

    meta.lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : meta.lastVisible;
    meta.hasMore = snap.docs.length === meta.pageSize;
    runTicketRenderHooks();
  } catch (e) {
    console.error('fbLoadTicketsPage error:', e);
    try {
      // fallback aman: tanpa orderBy, tetap bisa paginate by doc snapshot
      const meta = window.DBMeta.tickets;
      let fallbackQ = context === 'school' && schoolId
        ? query(collection(db, 'tickets'), where('schoolId', '==', schoolId), limit(meta.pageSize))
        : query(collection(db, 'tickets'), limit(meta.pageSize));

      if (meta.lastVisible) {
        fallbackQ = context === 'school' && schoolId
          ? query(collection(db, 'tickets'), where('schoolId', '==', schoolId), startAfter(meta.lastVisible), limit(meta.pageSize))
          : query(collection(db, 'tickets'), startAfter(meta.lastVisible), limit(meta.pageSize));
      }

      const fallbackSnap = await getDocs(fallbackQ);
      const rows = fallbackSnap.empty ? [] : fallbackSnap.docs.map(d => stripPhotos(d.data()));
      if (!meta.lastVisible) window.DB.tickets = rows;
      else {
        const existing = new Set(window.DB.tickets.map(t => t.id));
        window.DB.tickets = [...window.DB.tickets, ...rows.filter(r => !existing.has(r.id))];
      }
      meta.lastVisible = fallbackSnap.docs.length > 0 ? fallbackSnap.docs[fallbackSnap.docs.length - 1] : meta.lastVisible;
      meta.hasMore = fallbackSnap.docs.length === meta.pageSize;
      runTicketRenderHooks();
    } catch (fallbackErr) {
      console.error('fbLoadTicketsPage fallback error:', fallbackErr);
    }
  } finally {
    meta.isLoading = false;
  }
};

window.fbStartRealtimeForContext = function ({ context = 'public', schoolId = null } = {}) {
  stopRealtimeListeners();

  _schoolsUnsub = onSnapshot(collection(db, 'schools'), (snap) => {
    if (!window.DB) return;
    window.DB.schools = snap.empty ? [] : snap.docs.map(d => d.data());
  });

  if (context === 'public') return;

  const q = buildTicketsQuery({ context, schoolId, pageSize: TICKET_PAGE_SIZE });
  _ticketsUnsub = onSnapshot(q, (snap) => {
    if (!window.DB) return;

    snap.docChanges().forEach(change => {
      const ticketLite = stripPhotos(change.doc.data());
      if (change.type === 'removed') {
        window.DB.tickets = window.DB.tickets.filter(t => t.id !== ticketLite.id);
      } else {
        upsertTicketToCache(ticketLite);
      }
    });

    runTicketRenderHooks();
  });
};

window.fbStopRealtime = stopRealtimeListeners;

let _lastSessionSignature = '';
async function syncContextFromSession(force = false) {
  const session = getSessionUser();
  const signature = session ? `${session.type}:${session.schoolId || session.username || ''}` : 'public';
  if (!force && signature === _lastSessionSignature) return;
  _lastSessionSignature = signature;

  if (!session) {
    window.fbStartRealtimeForContext({ context: 'public' });
    return;
  }

  if (session.type === 'school' && session.schoolId) {
    await window.fbLoadTicketsPage({ context: 'school', schoolId: session.schoolId, reset: true });
    window.fbStartRealtimeForContext({ context: 'school', schoolId: session.schoolId });
    return;
  }

  if (session.type === 'admin') {
    await window.fbLoadTicketsPage({ context: 'admin', reset: true });
    window.fbStartRealtimeForContext({ context: 'admin' });
    return;
  }
}

// ============================================================
// INISIALISASI DATA AWAL (TANPA MENARIK SEMUA TIKET)
// ============================================================
async function initFirebaseDB() {
  showLoadingOverlay(true);
  try {
    const adminRef = doc(db, 'config', 'admin');
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, defaultAdmin());
    }

    await ensureCoreData();
  } catch (e) {
    console.error('Firestore init error:', e);
    showDBError();
  }
  showLoadingOverlay(false);
}

// Tetap dipertahankan untuk kompatibilitas lama
window.reloadDB = async function () {
  try {
    await ensureCoreData();
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
window.fbSaveSchool = async function (school) {
  await setDoc(doc(db, 'schools', school.id), school);
};

window.fbSaveTicket = async function (ticket) {
  await setDoc(doc(db, 'tickets', ticket.id), ticket);
};

window.fbUpdateTicket = async function (id, fields) {
  await updateDoc(doc(db, 'tickets', id), fields);
};

window.fbSaveAdmin = async function (adminObj) {
  await setDoc(doc(db, 'config', 'admin'), adminObj);
};

window.fbUpdateSchool = async function (id, fields) {
  await updateDoc(doc(db, 'schools', id), fields);
};

// ============================================================
// JALANKAN INISIALISASI SAAT DOM SIAP
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initFirebaseDB().then(() => {
    window.fbStartRealtimeForContext({ context: 'public' });
    if (window.restoreLoginState) {
      window.restoreLoginState();
    }
    syncContextFromSession(true);
    setInterval(() => {
      syncContextFromSession(false);
    }, 1200);
  });
});
