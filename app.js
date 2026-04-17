// app.js - Application Logic (Regular Script, defer)

// SVG Icon Helper Functions
const SVGIcons = {
  send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
  lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  envelope: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>',
  save: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  clipboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
  building: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m5.08 0l4.24 4.24"/></svg>',
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
};

// Database wrapper
if (!window.DB) window.DB = { schools: [], tickets: [], admin: { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' } };

function showLoadingOverlay(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showDBError() {
  const el = document.getElementById('dbErrorBanner');
  if (el) el.style.display = 'block';
}

function loadDB() { return window.DB; }

async function saveDB(db) {
  window.DB = db;
}

async function initDB() {
  return window.DB;
}

let currentUser = null;
let schoolTicketFilter = 'all';
let adminTicketFilter = 'all';
let captchaA = 0, captchaB = 0;
let captchaVerified = false;
let resetTargetNPSN = '';
let photoFiles = [];
let followUpPhotoFiles = [];

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isLegacyHash(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

async function verifyPassword(plain, record) {
  if (!record) return false;
  if (record.passwordHash && isLegacyHash(record.passwordHash)) {
    return await hashPassword(plain) === record.passwordHash;
  }
  if (record.password && record.password === plain) {
    return true;
  }
  return false;
}

async function migrateSchoolPasswordHash(school) {
  if (!school || !school.id) return;
  if (school.password && !school.passwordHash) {
    const newHash = await hashPassword(school.password);
    school.passwordHash = newHash;
    if (window.fbUpdateSchool) await window.fbUpdateSchool(school.id, { passwordHash: newHash });
  }
}

async function migrateAdminPasswordHash(admin) {
  if (!admin) return;
  if (admin.password && !admin.passwordHash) {
    const newHash = await hashPassword(admin.password);
    admin.passwordHash = newHash;
    if (window.fbSaveAdmin) await window.fbSaveAdmin({ username: admin.username, passwordHash: newHash });
  }
}

function saveSessionUser(user) {
  try {
    sessionStorage.setItem('SiLaPorUser', JSON.stringify(user));
  } catch (e) {
    console.warn('Cannot save session user', e);
  }
}

function clearSessionUser() {
  try {
    sessionStorage.removeItem('SiLaPorUser');
  } catch (e) {
    console.warn('Cannot clear session user', e);
  }
}

function loadSessionUser() {
  try {
    const raw = sessionStorage.getItem('SiLaPorUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function applySchoolState(school) {
  if (!school) return;
  currentUser = { type: 'school', school };

  document.getElementById('sidebarPublicNav').classList.add('hidden');
  document.getElementById('sidebarSchoolNav').classList.remove('hidden');
  document.getElementById('sidebarAdminNav').classList.add('hidden');

  const initials = _getInitials(school.name);
  document.getElementById('sidebarUserAvatar').textContent = initials;
  document.getElementById('sidebarUserName').textContent = school.name;
  document.getElementById('sidebarUserRole').textContent = 'NPSN: ' + school.id;
  document.getElementById('sidebarUser').classList.remove('hidden');
  document.getElementById('sidebarActions').classList.remove('hidden');
  document.getElementById('sidebarBtnChangePass').style.display = 'none';

  document.getElementById('topbarUserAvatar').textContent = initials;
  document.getElementById('topbarUser').classList.remove('hidden');

  document.getElementById('schoolDashName').textContent = school.name;
  document.getElementById('schoolDashNPSN').textContent = 'NPSN: ' + school.id;
  if (school.firstLogin) {
    document.getElementById('firstLoginBanner').classList.remove('hidden');
  } else {
    document.getElementById('firstLoginBanner').classList.add('hidden');
  }
  schoolTicketFilter = 'all';
  renderSchoolTickets();
  updateSchoolStats();
  showPage('school-dash');
}

function applyAdminState() {
  currentUser = { type: 'admin' };

  document.getElementById('sidebarPublicNav').classList.add('hidden');
  document.getElementById('sidebarSchoolNav').classList.add('hidden');
  document.getElementById('sidebarAdminNav').classList.remove('hidden');

  document.getElementById('sidebarUserAvatar').textContent = 'AD';
  document.getElementById('sidebarUserName').textContent = 'Administrator';
  document.getElementById('sidebarUserRole').textContent = 'Akses Penuh';
  document.getElementById('sidebarUser').classList.remove('hidden');
  document.getElementById('sidebarActions').classList.remove('hidden');
  document.getElementById('sidebarBtnChangePass').style.display = 'flex';

  document.getElementById('topbarUserAvatar').textContent = 'AD';
  document.getElementById('topbarUser').classList.remove('hidden');

  showPage('admin-dash');
  updateAdminStats();
  renderAdminRecent();
}

function restoreLoginState() {
  const session = loadSessionUser();
  if (!session) {
    showPage('reporter');
    return;
  }
  const DB = loadDB();
  if (session.type === 'school') {
    const school = DB.schools.find(s => s.id === session.schoolId);
    if (school) {
      applySchoolState(school);
      return;
    }
  }
  if (session.type === 'admin') {
    if (DB.admin && DB.admin.username === session.username) {
      applyAdminState();
      return;
    }
  }
  clearSessionUser();
  showPage('reporter');
}

// ====================== MOBILE NAVIGATION (Sidebar) ======================
function toggleMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', isOpen);
}

function closeMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.remove('open');
  backdrop.classList.remove('show');
}

// ====================== NAVIGATION ======================
const PROTECTED_PAGES = ['school-dash', 'admin-dash'];

function updateSidebarActive(page) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const id = 'snav-' + page;
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function showPage(page) {
  closeMobileNav();
  if (PROTECTED_PAGES.includes(page) && !currentUser) {
    page = 'reporter';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  updateSidebarActive(page);

  if (page !== 'reporter') {
    captchaVerified = false;
  } else {
    genCaptcha();
  }
}

function logout() {
  currentUser = null;
  clearSessionUser();

  // Restore public sidebar nav
  document.getElementById('sidebarPublicNav').classList.remove('hidden');
  document.getElementById('sidebarSchoolNav').classList.add('hidden');
  document.getElementById('sidebarAdminNav').classList.add('hidden');
  document.getElementById('sidebarUser').classList.add('hidden');
  document.getElementById('sidebarActions').classList.add('hidden');
  document.getElementById('topbarUser').classList.add('hidden');

  closeMobileNav();
  showPage('reporter');
}

// ====================== CAPTCHA ======================
function genCaptcha() {
  captchaA = Math.floor(Math.random() * 10) + 1;
  captchaB = Math.floor(Math.random() * 10) + 1;
  document.getElementById('captchaQ').textContent = captchaA + ' + ' + captchaB;
  document.getElementById('captchaAns').value = '';
  document.getElementById('captchaAns').style.borderColor = 'var(--border)';
  captchaVerified = false;
  const statusEl = document.getElementById('captchaStatus');
  if (statusEl) statusEl.textContent = '';
}

function checkCaptchaAuto() {
  const ans = parseInt(document.getElementById('captchaAns').value);
  const statusEl = document.getElementById('captchaStatus');
  if (ans === captchaA + captchaB) {
    captchaVerified = true;
    statusEl.innerHTML = SVGIcons.check + ' Verifikasi berhasil!';
    statusEl.style.color = 'var(--success)';
    document.getElementById('captchaAns').style.borderColor = 'var(--success)';
  } else if (document.getElementById('captchaAns').value.length > 0) {
    captchaVerified = false;
    statusEl.innerHTML = SVGIcons.x + ' Jawaban salah';
    statusEl.style.color = 'var(--danger)';
    document.getElementById('captchaAns').style.borderColor = 'var(--danger)';
  } else {
    captchaVerified = false;
    statusEl.textContent = '';
    document.getElementById('captchaAns').style.borderColor = 'var(--border)';
  }
}

function verifyCaptcha() {
  checkCaptchaAuto();
}

// ====================== SCHOOL SEARCH DROPDOWN ======================
function filterSchools() {
  const q = document.getElementById('schoolSearch').value.toLowerCase();
  const dd = document.getElementById('schoolDropdown');
  const DB = loadDB();
  const matches = DB.schools.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q));
  dd.innerHTML = '';
  if (matches.length === 0) {
    dd.innerHTML = '<div class="dropdown-item" style="color:var(--text-3)">Sekolah tidak ditemukan</div>';
  } else {
    matches.forEach(s => {
      const d = document.createElement('div');
      d.className = 'dropdown-item';
      d.innerHTML = `<strong>${s.name}</strong> <span style="color:var(--text-3);font-size:11px">${s.level} · ${s.city}</span>`;
      d.onclick = () => {
        document.getElementById('schoolSearch').value = s.name;
        document.getElementById('r_school_id').value = s.id;
        document.getElementById('r_school_name').value = s.name;
        dd.classList.remove('show');
      };
      dd.appendChild(d);
    });
  }
  dd.classList.add('show');
}

function showDropdown() {
  filterSchools();
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-select')) document.getElementById('schoolDropdown').classList.remove('show');
});

// ====================== IMAGE COMPRESSION ======================
function detectWebPSupport() {
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const dataUrl = canvas.toDataURL('image/webp');
  return dataUrl.startsWith('data:image/webp');
}
const USE_WEBP = detectWebPSupport();
const IMG_FORMAT = USE_WEBP ? 'image/webp' : 'image/jpeg';

async function compressImage(file, maxSizeKB = 100) {
  const MAX_BYTES = maxSizeKB * 1024;
  const MAX_DIM = 1280;
  const MIN_QUALITY = 0.25;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) {
            height = Math.round((height / width) * MAX_DIM);
            width = MAX_DIM;
          } else {
            width = Math.round((width / height) * MAX_DIM);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = USE_WEBP ? 0.85 : 0.75;
        let dataUrl = canvas.toDataURL(IMG_FORMAT, quality);

        function base64SizeBytes(b64) {
          const base = b64.split(',')[1] || b64;
          return Math.ceil((base.length * 3) / 4);
        }

        while (base64SizeBytes(dataUrl) > MAX_BYTES && quality > MIN_QUALITY) {
          quality = Math.max(quality - 0.05, MIN_QUALITY);
          dataUrl = canvas.toDataURL(IMG_FORMAT, quality);
        }

        if (base64SizeBytes(dataUrl) > MAX_BYTES) {
          let scale = 0.85;
          while (base64SizeBytes(dataUrl) > MAX_BYTES && scale > 0.2) {
            const w2 = Math.round(width * scale);
            const h2 = Math.round(height * scale);
            const c2 = document.createElement('canvas');
            c2.width = w2; c2.height = h2;
            c2.getContext('2d').drawImage(img, 0, 0, w2, h2);
            dataUrl = c2.toDataURL(IMG_FORMAT, MIN_QUALITY);
            scale -= 0.1;
          }
        }
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function compressImages(files, maxSizeKB = 100) {
  const results = await Promise.all(files.map(async (f) => {
    const compressed = await compressImage(f, maxSizeKB);
    return compressed;
  }));
  return results;
}

// ====================== PHOTO UPLOAD ======================
function handlePhotos(inp) {
  const files = Array.from(inp.files).slice(0, 3);
  if (files.length === 0) return;
  ['photoInput', 'photoInputCamera', 'photoInputGallery'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el !== inp) el.value = '';
  });
  const prev = document.getElementById('photoPreview');
  prev.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--text-3);font-size:13px">Mengompresi foto...</div>';

  compressImages(files, 100).then(compressedDataUrls => {
    photoFiles = compressedDataUrls;
    prev.innerHTML = '';
    compressedDataUrls.forEach(dataUrl => {
      const img = document.createElement('img');
      img.className = 'photo-thumb';
      img.src = dataUrl;
      prev.appendChild(img);
    });
  }).catch(() => {
    prev.innerHTML = '<div style="grid-column:1/-1;color:var(--danger);font-size:13px;display:flex;align-items:center;gap:6px">' + SVGIcons.x + ' Gagal memproses foto. Coba lagi.</div>';
  });
}

// ====================== SUBMIT REPORT ======================
function submitReport() {
  const name = document.getElementById('r_name').value.trim();
  const wa = document.getElementById('r_wa').value.trim();
  const schoolId = document.getElementById('r_school_id').value;
  const schoolName = document.getElementById('r_school_name').value;
  const topic = document.getElementById('r_topic').value;
  const desc = document.getElementById('r_desc').value.trim();

  if (!name) return showAlert('reporterAlert', 'danger', 'Nama pelapor wajib diisi.');
  if (!wa) return showAlert('reporterAlert', 'danger', 'Nomor WhatsApp wajib diisi.');
  if (!schoolId) return showAlert('reporterAlert', 'danger', 'Pilih sekolah dari dropdown.');
  if (!topic) return showAlert('reporterAlert', 'danger', 'Pilih topik permasalahan.');
  if (desc.length < 20) return showAlert('reporterAlert', 'danger', 'Deskripsi permasalahan minimal 20 karakter.');
  if (!captchaVerified) return showAlert('reporterAlert', 'danger', 'Harap jawab pertanyaan verifikasi matematika dengan benar.');

  const submitBtn = document.querySelector('#page-reporter .btn-primary');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengirim...';

  const id = 'TKT-' + Date.now().toString(36).toUpperCase().slice(-6);

  async function collectPhotos() {
    return photoFiles;
  }

  collectPhotos().then(async photos => {
    const ticket = {
      id, reporter: name, email: document.getElementById('r_email').value.trim(),
      wa, schoolId, schoolName, topic, desc, photos, status: 'Baru',
      date: new Date().toISOString(), notes: '', followUpPhotos: []
    };
    const DB = loadDB();
    DB.tickets.push(ticket);
    if (window.fbSaveTicket) await window.fbSaveTicket(ticket);

    // Reset form
    document.getElementById('r_name').value = '';
    document.getElementById('r_email').value = '';
    document.getElementById('r_wa').value = '';
    document.getElementById('schoolSearch').value = '';
    document.getElementById('r_school_id').value = '';
    document.getElementById('r_school_name').value = '';
    document.getElementById('r_topic').value = '';
    document.getElementById('r_desc').value = '';
    document.getElementById('photoPreview').innerHTML = '';
    photoFiles = [];
    genCaptcha();

    submitBtn.disabled = false;
    submitBtn.innerHTML = '📤 Kirim Laporan';
    showAlert('reporterAlert', 'success', `Laporan berhasil dikirim! Nomor Tiket Anda: <strong>${id}</strong>.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }).catch(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '📤 Kirim Laporan';
    showAlert('reporterAlert', 'danger', 'Terjadi kesalahan saat mengirim. Coba lagi.');
  });
}

// ====================== SCHOOL LOGIN ======================
async function schoolLogin() {
  const npsn = document.getElementById('sl_npsn').value.trim();
  const pass = document.getElementById('sl_pass').value;
  const DB = loadDB();
  const school = DB.schools.find(s => s.id === npsn);
  if (!school || !(await verifyPassword(pass, school))) {
    return showAlert('schoolLoginAlert', 'danger', 'NPSN atau password salah.');
  }
  await migrateSchoolPasswordHash(school);
  saveSessionUser({ type: 'school', schoolId: school.id });
  applySchoolState(school);
}

function updateSchoolStats() {
  if (!currentUser || currentUser.type !== 'school') return;
  const DB = loadDB();
  const tickets = DB.tickets.filter(t => t.schoolId === currentUser.school.id);
  document.getElementById('sTotal').textContent = tickets.length;
  document.getElementById('sNew').textContent = tickets.filter(t => t.status === 'Baru').length;
  document.getElementById('sProc').textContent = tickets.filter(t => t.status === 'Dalam Proses').length;
  document.getElementById('sDone').textContent = tickets.filter(t => t.status === 'Selesai').length;
}

function renderSchoolTickets() {
  if (!currentUser || currentUser.type !== 'school') return;
  const DB = loadDB();
  const q = (document.getElementById('schoolTicketSearch').value || '').toLowerCase();
  let tickets = DB.tickets.filter(t => t.schoolId === currentUser.school.id);
  if (schoolTicketFilter !== 'all') tickets = tickets.filter(t => t.status === schoolTicketFilter);
  if (q) tickets = tickets.filter(t => t.desc.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q) || t.reporter.toLowerCase().includes(q));
  tickets.sort((a, b) => new Date(b.date) - new Date(a.date));
  const el = document.getElementById('schoolTicketList');
  if (tickets.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-3)">Tidak ada laporan ditemukan</div>';
    return;
  }
  el.innerHTML = tickets.map(t => ticketCard(t, true)).join('');
}

function filterSchoolTickets(status, btn) {
  schoolTicketFilter = status;
  document.querySelectorAll('#page-school-dash .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderSchoolTickets();
}

// ====================== ADMIN LOGIN ======================
async function adminLogin() {
  const user = document.getElementById('al_user').value.trim();
  const pass = document.getElementById('al_pass').value;
  const DB = loadDB();
  if (user !== DB.admin.username || !(await verifyPassword(pass, DB.admin))) {
    return showAlert('adminLoginAlert', 'danger', 'Username atau password admin salah.');
  }
  await migrateAdminPasswordHash(DB.admin);
  saveSessionUser({ type: 'admin', username: DB.admin.username });
  applyAdminState();
}

function adminTab(tab, btn) {
  ['overview', 'schools', 'reports', 'users'].forEach(t => {
    document.getElementById('admin-' + t).classList.add('hidden');
  });
  document.querySelectorAll('#page-admin-dash .tab').forEach(b => b.classList.remove('active'));
  document.getElementById('admin-' + tab).classList.remove('hidden');
  btn.classList.add('active');
  if (tab === 'schools') renderSchoolTable();
  if (tab === 'reports') renderAdminTickets();
  if (tab === 'users') renderUserTable();
}

function updateAdminStats() {
  const DB = loadDB();
  document.getElementById('aTotal').textContent = DB.tickets.length;
  document.getElementById('aNew').textContent = DB.tickets.filter(t => t.status === 'Baru').length;
  document.getElementById('aProc').textContent = DB.tickets.filter(t => t.status === 'Dalam Proses').length;
  document.getElementById('aDone').textContent = DB.tickets.filter(t => t.status === 'Selesai').length;
}

function renderAdminRecent() {
  const DB = loadDB();
  const tickets = [...DB.tickets].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  document.getElementById('adminRecentList').innerHTML = tickets.map(t => ticketCard(t, false)).join('') || '<div style="text-align:center;padding:32px;color:var(--text-3)">Belum ada laporan</div>';
}

function renderSchoolTable() {
  const DB = loadDB();
  const q = (document.getElementById('schoolListSearch').value || '').toLowerCase();
  const schools = DB.schools.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q));
  document.getElementById('schoolTableBody').innerHTML = schools.map(s => {
    const cnt = DB.tickets.filter(t => t.schoolId === s.id).length;
    return `<tr>
      <td><code style="background:var(--neutral);padding:2px 6px;border-radius:4px;font-size:12px">${s.id}</code></td>
      <td><strong>${s.name}</strong></td>
      <td><span class="badge badge-new">${s.level}</span></td>
      <td>${s.city}</td>
      <td>${cnt}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="openEditSchool('${s.id}')" style="font-size:12px">Edit</button>
        <button class="btn btn-sm btn-outline" onclick="openResetPass('${s.id}','${s.name.replace(/'/g, '\\\'')}')" style="font-size:12px">Reset Pass</button>
      </td>
    </tr>`;
  }).join('');
}

function renderAdminTickets() {
  const DB = loadDB();
  const q = (document.getElementById('adminReportSearch').value || '').toLowerCase();
  let tickets = [...DB.tickets];
  if (adminTicketFilter !== 'all') tickets = tickets.filter(t => t.status === adminTicketFilter);
  if (q) tickets = tickets.filter(t => t.schoolName.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q) || t.reporter.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  tickets.sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('adminAllTickets').innerHTML = tickets.map(t => ticketCard(t, false)).join('') || '<div style="text-align:center;padding:32px;color:var(--text-3)">Tidak ada laporan</div>';
}

function filterAdminTickets(status, btn) {
  adminTicketFilter = status;
  document.querySelectorAll('#admin-reports .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAdminTickets();
}

function renderUserTable() {
  const DB = loadDB();
  document.getElementById('userTableBody').innerHTML = DB.schools.map(s => `
    <tr>
      <td><code style="background:var(--neutral);padding:2px 6px;border-radius:4px;font-size:12px">${s.id}</code></td>
      <td>${s.name}</td>
      <td>${s.firstLogin ? '<span class="badge badge-new">Belum Login</span>' : '<span class="badge badge-done">Sudah Login</span>'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="openResetPass('${s.id}','${s.name.replace(/'/g, '\\\'')}')" style="font-size:12px">Reset Password</button></td>
    </tr>
  `).join('');
}

async function addSchool() {
  const npsn = document.getElementById('a_npsn').value.trim();
  const name = document.getElementById('a_sname').value.trim();
  const level = document.getElementById('a_level').value;
  const city = document.getElementById('a_city').value.trim();
  const defpass = document.getElementById('a_defpass').value.trim();
  if (!npsn || npsn.length !== 8 || isNaN(npsn)) return alert('NPSN harus 8 digit angka');
  if (!name) return alert('Nama sekolah wajib diisi');
  const DB = loadDB();
  if (DB.schools.find(s => s.id === npsn)) return alert('NPSN sudah terdaftar');
  const defaultPassword = defpass || npsn;
  const passwordHash = await hashPassword(defaultPassword);
  const newSchool = { id: npsn, name, level, city, passwordHash, firstLogin: true };
  DB.schools.push(newSchool);
  if (window.fbSaveSchool) window.fbSaveSchool(newSchool);
  document.getElementById('a_npsn').value = '';
  document.getElementById('a_sname').value = '';
  document.getElementById('a_city').value = '';
  document.getElementById('a_defpass').value = '';
  renderSchoolTable();
  alert('Sekolah berhasil ditambahkan! NPSN: ' + npsn);
}

// Global variable to store excel data
let excelDataToImport = [];

function downloadExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    alert('Library XLSX tidak terload. Silakan refresh halaman.');
    return;
  }
  
  try {
    const ws_data = [
      ['NPSN', 'Nama Sekolah', 'Jenjang', 'Kota', 'Password (Opsional)'],
      ['12345678', 'SD Maju Jaya', 'SD', 'Jakarta', ''],
      ['87654321', 'SMP Pintar', 'SMP', 'Bandung', 'sandi123'],
      ['11223344', 'SMA Berprestasi', 'SMA', 'Surabaya', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sekolah');
    
    const fileName = 'Template_Import_Sekolah.xlsx';
    XLSX.writeFile(wb, fileName);
  } catch (err) {
    console.error('Error generating template:', err);
    alert('Gagal membuat template: ' + err.message);
  }
}

function previewExcelData(input) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rows.length < 2) {
        alert('File Excel kosong atau tidak memiliki data');
        return;
      }
      
      // Skip header row
      const dataRows = rows.slice(1).filter(row => row[0] && row[1]);
      excelDataToImport = [];
      let html = '';
      
      dataRows.forEach((row, idx) => {
        const npsn = String(row[0]).trim();
        const name = String(row[1]).trim();
        const level = String(row[2]).trim() || 'SD';
        const city = String(row[3]).trim();
        const password = row[4] ? String(row[4]).trim() : '';
        
        // Validate NPSN
        if (npsn.length !== 8 || isNaN(npsn)) {
          html += `<tr style="background:var(--danger-pale);opacity:0.6"><td>${npsn}</td><td>${name}</td><td>${level}</td><td>${city}</td><td>${password || '(NPSN)'}</td></tr>`;
          return;
        }
        
        excelDataToImport.push({ npsn, name, level, city, password });
        html += `<tr><td><code style="background:var(--neutral);padding:2px 6px;border-radius:4px;font-size:12px">${npsn}</code></td><td>${name}</td><td><span class="badge badge-new">${level}</span></td><td>${city}</td><td>${password || '(NPSN)'}</td></tr>`;
      });
      
      document.getElementById('excelTableBody').innerHTML = html;
      document.getElementById('excelPreview').style.display = 'block';
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function importExcelData() {
  if (excelDataToImport.length === 0) {
    alert('Tidak ada data valid untuk diimport');
    return;
  }
  
  const DB = loadDB();
  let successCount = 0;
  let duplicateCount = 0;
  
  for (const schoolData of excelDataToImport) {
    // Check if school already exists
    if (DB.schools.find(s => s.id === schoolData.npsn)) {
      duplicateCount++;
      continue;
    }
    
    const defaultPassword = schoolData.password || schoolData.npsn;
    const passwordHash = await hashPassword(defaultPassword);
    const newSchool = {
      id: schoolData.npsn,
      name: schoolData.name,
      level: schoolData.level,
      city: schoolData.city,
      passwordHash,
      firstLogin: true
    };
    
    DB.schools.push(newSchool);
    if (window.fbSaveSchool) await window.fbSaveSchool(newSchool);
    successCount++;
  }
  
  cancelExcelImport();
  renderSchoolTable();
  
  let message = `✓ ${successCount} sekolah berhasil diimport`;
  if (duplicateCount > 0) message += ` (${duplicateCount} data duplikat dilewati)`;
  alert(message);
}

function cancelExcelImport() {
  document.getElementById('excelFileInput').value = '';
  document.getElementById('excelPreview').style.display = 'none';
  document.getElementById('excelTableBody').innerHTML = '';
  excelDataToImport = [];
}

// ====================== GOOGLE SHEETS IMPORT ======================
let googleSheetDataToImport = [];

function parseGoogleSheetUrl(input) {
  const url = input.trim();
  // Extract Sheet ID from URL
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function importFromGoogleSheet() {
  const sheetUrlInput = document.getElementById('googleSheetUrl').value.trim();
  if (!sheetUrlInput) {
    alert('Masukkan URL Google Sheet atau Sheet ID');
    return;
  }
  
  const sheetId = parseGoogleSheetUrl(sheetUrlInput);
  if (!sheetId) {
    alert('URL Google Sheet tidak valid. Gunakan format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit');
    return;
  }
  
  try {
    const loadingDiv = document.getElementById('googleSheetLoading');
    if (loadingDiv) loadingDiv.style.display = 'block';
    
    // Fetch dari CSV export (tidak perlu API key)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error('Google Sheet tidak ditemukan atau tidak dapat diakses. Pastikan sheet sudah di-share dengan "Siapa saja dapat melihat".');
    }
    
    const csvText = await response.text();
    const rows = csvText.split('\\n').map(row => {
      // Parse CSV dengan benar (handle quotes)
      const regex = /(?:[^,\"]+|\"[^\"]*\")+/g;
      return row.match(regex)?.map(cell => cell.replace(/^\"|\"$/g, '').trim()) || [];
    }).filter(row => row.some(cell => cell)); // Filter empty rows
    
    if (rows.length < 2) {
      throw new Error('Google Sheet kosong atau hanya memiliki header');
    }
    
    // Parse data mulai dari row 2 (skip header)
    const dataRows = rows.slice(1);
    googleSheetDataToImport = [];
    let html = '';
    let validCount = 0;
    
    dataRows.forEach((row, idx) => {
      const npsn = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const level = String(row[2] || 'SD').trim();
      const city = String(row[3] || '').trim();
      const password = String(row[4] || '').trim();
      
      // Validate NPSN
      if (!npsn || npsn.length !== 8 || isNaN(npsn)) {
        html += `<tr style=\"background:var(--danger-pale);opacity:0.6\"><td>${npsn || '(kosong)'}</td><td>${name || '(kosong)'}</td><td>${level}</td><td>${city || '(kosong)'}</td><td>${password || '(NPSN)'}</td></tr>`;
        return;
      }
      
      googleSheetDataToImport.push({ npsn, name, level, city, password });
      validCount++;
      html += `<tr><td><code style=\"background:var(--neutral);padding:2px 6px;border-radius:4px;font-size:12px\">${npsn}</code></td><td>${name}</td><td><span class=\"badge badge-new\">${level}</span></td><td>${city}</td><td>${password || '(NPSN)'}</td></tr>`;
    });
    
    if (validCount === 0) {
      throw new Error('Tidak ada data valid yang ditemukan. Pastikan format: NPSN (8 digit) | Nama | Jenjang | Kota | Password');
    }
    
    document.getElementById('googleSheetTableBody').innerHTML = html;
    document.getElementById('googleSheetPreview').style.display = 'block';
    document.getElementById('googleSheetUrl').value = '';
    
    if (loadingDiv) loadingDiv.style.display = 'none';
  } catch (err) {
    if (loadingDiv) loadingDiv.style.display = 'none';
    console.error('Error importing from Google Sheet:', err);
    alert('Gagal membaca Google Sheet:\\n' + err.message);
  }
}

async function confirmGoogleSheetImport() {
  if (googleSheetDataToImport.length === 0) {
    alert('Tidak ada data untuk diimport');
    return;
  }
  
  const DB = loadDB();
  let successCount = 0;
  let duplicateCount = 0;
  
  for (const schoolData of googleSheetDataToImport) {
    if (DB.schools.find(s => s.id === schoolData.npsn)) {
      duplicateCount++;
      continue;
    }
    
    const defaultPassword = schoolData.password || schoolData.npsn;
    const passwordHash = await hashPassword(defaultPassword);
    const newSchool = {
      id: schoolData.npsn,
      name: schoolData.name,
      level: schoolData.level,
      city: schoolData.city,
      passwordHash,
      firstLogin: true
    };
    
    DB.schools.push(newSchool);
    if (window.fbSaveSchool) await window.fbSaveSchool(newSchool);
    successCount++;
  }
  
  cancelGoogleSheetImport();
  renderSchoolTable();
  
  let message = `✓ ${successCount} sekolah berhasil diimport dari Google Sheet`;
  if (duplicateCount > 0) message += ` (${duplicateCount} data duplikat dilewati)`;
  alert(message);
}

function cancelGoogleSheetImport() {
  document.getElementById('googleSheetUrl').value = '';
  document.getElementById('googleSheetPreview').style.display = 'none';
  document.getElementById('googleSheetTableBody').innerHTML = '';
  document.getElementById('googleSheetLoading').style.display = 'none';
  googleSheetDataToImport = [];
}

function openEditSchool(npsn) {
  const DB = loadDB();
  const school = DB.schools.find(s => s.id === npsn);
  if (!school) return alert('Sekolah tidak ditemukan');
  
  document.getElementById('e_npsn').value = school.id;
  document.getElementById('e_npsn').disabled = true;
  document.getElementById('e_sname').value = school.name;
  document.getElementById('e_level').value = school.level;
  document.getElementById('e_city').value = school.city;
  
  document.getElementById('editSchoolModal').classList.add('show');
}

function closeEditSchool() {
  document.getElementById('editSchoolModal').classList.remove('show');
}

async function saveEditSchool() {
  const npsn = document.getElementById('e_npsn').value.trim();
  const name = document.getElementById('e_sname').value.trim();
  const level = document.getElementById('e_level').value;
  const city = document.getElementById('e_city').value.trim();
  
  if (!name) return alert('Nama sekolah wajib diisi');
  if (!level) return alert('Jenjang wajib diisi');
  if (!city) return alert('Kota/Kabupaten wajib diisi');
  
  const DB = loadDB();
  const schoolIndex = DB.schools.findIndex(s => s.id === npsn);
  if (schoolIndex === -1) return alert('Sekolah tidak ditemukan');
  
  const updatedSchool = {
    ...DB.schools[schoolIndex],
    name,
    level,
    city
  };
  
  DB.schools[schoolIndex] = updatedSchool;
  
  if (window.fbUpdateSchool) {
    await window.fbUpdateSchool(npsn, { name, level, city });
  }
  
  closeEditSchool();
  renderSchoolTable();
  alert('Data sekolah berhasil diperbarui!');
}

// ====================== TICKET CARD ======================
function ticketCard(t, isSchool) {
  const statusClass = t.status === 'Baru' ? 'badge-new' : t.status === 'Dalam Proses' ? 'badge-process' : 'badge-done';
  const date = new Date(t.date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `<div class="ticket">
    <div class="ticket-head">
      <div>
        <div class="ticket-id">${t.id} · ${date}</div>
        <div class="ticket-title">${t.topic}</div>
      </div>
      <span class="badge ${statusClass}">${t.status}</span>
    </div>
    <div class="ticket-body">${t.desc.substring(0, 120)}${t.desc.length > 120 ? '...' : ''}</div>
    <div class="ticket-meta">
      <span>${SVGIcons.user} ${t.reporter}</span>
      ${t.wa ? `<span>${SVGIcons.phone} ${t.wa}</span>` : ''}
      ${!isSchool ? `<span>${SVGIcons.building} ${t.schoolName}</span>` : ''}
    </div>
    ${t.notes ? `<div style="margin-top:8px;font-size:12px;background:var(--success-pale);padding:6px 10px;border-radius:6px;color:var(--success);display:flex;align-items:center;gap:6px">${SVGIcons.clipboard} ${t.notes}</div>` : ''}
    ${isSchool ? `
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="openTicket('${t.id}',${isSchool})">Lihat Detail</button>
        ${t.status === 'Baru' ? `<button class="btn btn-sm" style="background:var(--warning-pale);color:var(--warning);border:1px solid #f9e79f" onclick="updateStatus('${t.id}','Dalam Proses'); closeMobileNav()">Proses</button>` : ''}
        ${t.status !== 'Selesai' ? `<button class="btn btn-sm" style="background:var(--success-pale);color:var(--success);border:1px solid #a9dfbf" onclick="updateStatus('${t.id}','Selesai'); closeMobileNav()">Selesai</button>` : ''}
      </div>
    ` : `
      <div style="margin-top:12px">
        <button class="btn btn-sm btn-outline" onclick="openTicket('${t.id}',${isSchool})">Lihat Detail</button>
      </div>
    `}
  </div>`;
}

function openTicket(id, isSchool) {
  document.getElementById('modalTicketId').textContent = 'Memuat detail...';
  document.getElementById('modalTicketContent').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">Memuat data laporan...</div>';
  openModal('ticketModal');

  const fetchAndRender = async () => {
    let t = null;
    if (window.fbGetTicketFull) t = await window.fbGetTicketFull(id);
    if (!t) {
      const DB = loadDB();
      t = DB.tickets.find(x => x.id === id);
      if (!t) {
        document.getElementById('modalTicketContent').innerHTML = '<div class="alert alert-danger"><div class="alert-icon">' + SVGIcons.x + '</div><div>Gagal memuat data laporan.</div></div>';
        return;
      }
      t = { ...t, photos: [], followUpPhotos: [] };
    }

    const date = new Date(t.date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const statusClass = t.status === 'Baru' ? 'badge-new' : t.status === 'Dalam Proses' ? 'badge-process' : 'badge-done';

    const photosHTML = t.photos && t.photos.length > 0 ? `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;font-weight:600">📷 Foto Laporan</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${t.photos.map(p => `<img src="${p}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="openPhotoLightbox(this.src)">`).join('')}
        </div>
      </div>` : '';

    const followUpPhotosHTML = t.followUpPhotos && t.followUpPhotos.length > 0 ? `
      <div style="margin-top:10px">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;font-weight:600">📷 Foto Tindak Lanjut</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${t.followUpPhotos.map(p => `<img src="${p}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="openPhotoLightbox(this.src)">`).join('')}
        </div>
      </div>` : '';

    document.getElementById('modalTicketId').textContent = 'Detail Laporan — ' + t.id;
    document.getElementById('modalTicketContent').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span class="badge ${statusClass}" style="font-size:13px;padding:5px 14px">${t.status}</span>
        <span style="font-size:12px;color:var(--text-3)">${date}</span>
      </div>
      <div style="background:var(--neutral);border-radius:8px;padding:12px 16px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">Topik</div>
        <div style="font-weight:600">${t.topic}</div>
      </div>
      <div style="background:var(--neutral);border-radius:8px;padding:12px 16px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">Deskripsi Permasalahan</div>
        <div style="line-height:1.7;font-size:14px">${t.desc}</div>
      </div>
      ${photosHTML}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--neutral);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:3px">Pelapor</div>
          <div style="font-weight:600;font-size:14px">${t.reporter}</div>
          <div style="font-size:12px;color:var(--text-2)">${t.wa}</div>
          ${t.email ? `<div style="font-size:12px;color:var(--primary)">${t.email}</div>` : ''}
        </div>
        <div style="background:var(--neutral);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:3px">Sekolah</div>
          <div style="font-weight:600;font-size:14px">${t.schoolName}</div>
          <div style="font-size:12px;color:var(--text-2)">NPSN: ${t.schoolId}</div>
        </div>
      </div>
      ${t.notes ? `<div style="background:var(--success-pale);border-radius:8px;padding:12px 16px;margin-bottom:12px;border:1px solid #a9dfbf">
        <div style="font-size:12px;color:var(--success);font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">${SVGIcons.clipboard} Catatan Tindak Lanjut</div>
        <div style="font-size:13px;color:var(--text)">${t.notes}</div>
        ${followUpPhotosHTML}
      </div>` : (followUpPhotosHTML ? `<div style="margin-bottom:12px">${followUpPhotosHTML}</div>` : '')}
      ${isSchool ? `
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">Catatan Tindak Lanjut</div>
        <textarea id="ticketNotes" placeholder="Tuliskan langkah tindak lanjut yang telah dilakukan..." style="margin-bottom:12px;min-height:80px">${t.notes || ''}</textarea>
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">📷 Lampiran Foto Tindak Lanjut</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('followUpPhotoInputCamera').click()">📷 Ambil Foto</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('followUpPhotoInputGallery').click()">🖼️ Dari Galeri</button>
        </div>
        <div style="font-size:11px;color:var(--text-3);text-align:center;margin-bottom:8px">Maks. 3 foto, JPG/PNG</div>
        <div id="followUpPreview" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${t.status === 'Baru' ? `<button class="btn btn-sm" style="background:var(--warning-pale);color:var(--warning);border:1px solid #f9e79f" onclick="updateStatusModal('${t.id}','Dalam Proses'); closeMobileNav()">Tandai: Dalam Proses</button>` : ''}
          ${t.status !== 'Selesai' ? `<button class="btn btn-sm" style="background:var(--success-pale);color:var(--success);border:1px solid #a9dfbf" onclick="updateStatusModal('${t.id}','Selesai'); closeMobileNav()">Tandai: Selesai</button>` : ''}
        </div>
      </div>` : ''}
    `;
  };
  fetchAndRender();
}

function updateStatus(id, status) {
  const DB = loadDB();
  const t = DB.tickets.find(x => x.id === id);
  if (t) {
    t.status = status;
    if (window.fbUpdateTicket) window.fbUpdateTicket(id, { status });
  }
  renderSchoolTickets();
  updateSchoolStats();
}

function updateStatusModal(id, status) {
  const notes = document.getElementById('ticketNotes').value.trim();
  if (!notes) return alert('Harap isi catatan tindak lanjut sebelum menyimpan.');
  if (followUpPhotoFiles.length === 0) return alert('Harap lampirkan minimal 1 foto tindak lanjut.');
  const photos = followUpPhotoFiles;
  (async () => {
    const DB = loadDB();
    const t = DB.tickets.find(x => x.id === id);
    if (t) {
      t.status = status; t.notes = notes; t.followUpPhotos = photos;
      if (window.fbUpdateTicket) await window.fbUpdateTicket(id, { status, notes, followUpPhotos: photos });
    }
    followUpPhotoFiles = [];
    closeModal('ticketModal');
    renderSchoolTickets();
    updateSchoolStats();
  })();
}

// ====================== CHANGE PASSWORD ======================
function openChangePass() {
  document.getElementById('changePassAlert').innerHTML = '';
  document.getElementById('newPass1').value = '';
  document.getElementById('newPass2').value = '';
  openModal('changePassModal');
}

async function saveNewPassword() {
  const p1 = document.getElementById('newPass1').value;
  const p2 = document.getElementById('newPass2').value;
  if (p1.length < 6) return showAlert('changePassAlert', 'danger', 'Password minimal 6 karakter.');
  if (p1 !== p2) return showAlert('changePassAlert', 'danger', 'Konfirmasi password tidak cocok.');
  const DB = loadDB();
  const s = DB.schools.find(x => x.id === currentUser.school.id);
  if (s) {
    const hash = await hashPassword(p1);
    s.passwordHash = hash;
    s.firstLogin = false;
    if (window.fbUpdateSchool) await window.fbUpdateSchool(s.id, { passwordHash: hash, firstLogin: false });
    currentUser.school = s;
  }
  document.getElementById('firstLoginBanner').classList.add('hidden');
  closeModal('changePassModal');
  alert('Password berhasil diperbarui!');
}

// ====================== RESET PASSWORD (ADMIN) ======================
function openResetPass(npsn, name) {
  resetTargetNPSN = npsn;
  document.getElementById('resetPassContent').innerHTML = `<div class="alert alert-warning"><div class="alert-icon">⚠️</div><div>Reset password untuk: <strong>${name}</strong> (NPSN: ${npsn})</div></div>`;
  document.getElementById('resetPassVal').value = '';
  openModal('resetPassModal');
}

async function doResetPass() {
  const val = document.getElementById('resetPassVal').value.trim();
  const DB = loadDB();
  const s = DB.schools.find(x => x.id === resetTargetNPSN);
  if (s) {
    const newPassword = val || resetTargetNPSN;
    const hash = await hashPassword(newPassword);
    s.passwordHash = hash;
    s.firstLogin = true;
    if (window.fbUpdateSchool) await window.fbUpdateSchool(resetTargetNPSN, { passwordHash: hash, firstLogin: true });
  }
  closeModal('resetPassModal');
  renderUserTable();
  alert('Password berhasil direset! Password baru: ' + (val || resetTargetNPSN));
}

// ====================== LIGHTBOX FOTO ======================
function openPhotoLightbox(src) {
  document.getElementById('photoLightboxImg').src = src;
  document.getElementById('photoLightboxModal').classList.add('show');
}
function closePhotoLightbox() {
  document.getElementById('photoLightboxModal').classList.remove('show');
  document.getElementById('photoLightboxImg').src = '';
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closePhotoLightbox();
});

// ====================== MODAL HELPERS ======================
function openModal(id) { document.getElementById(id).classList.add('show') }
function closeModal(id) { document.getElementById(id).classList.remove('show') }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show') });
});

// ====================== ALERT ======================
function showAlert(elId, type, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}"><div class="alert-icon">${type === 'success' ? SVGIcons.check : type === 'danger' ? SVGIcons.x : SVGIcons.info}</div><div>${msg}</div></div>`;
  const delay = type === 'success' ? 8000 : 12000;
  setTimeout(() => { el.innerHTML = ''; }, delay);
}

// ====================== FOLLOW-UP PHOTO UPLOAD ======================
function handleFollowUpPhotos(inp) {
  const files = Array.from(inp.files).slice(0, 3);
  if (files.length === 0) return;
  ['followUpPhotoInput', 'followUpPhotoInputCamera', 'followUpPhotoInputGallery'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el !== inp) el.value = '';
  });
  const prev = document.getElementById('followUpPreview');
  if (!prev) return;
  prev.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:10px;color:var(--text-3);font-size:13px">Mengompresi foto...</div>';

  compressImages(files, 100).then(compressedDataUrls => {
    followUpPhotoFiles = compressedDataUrls;
    prev.innerHTML = '';
    compressedDataUrls.forEach(dataUrl => {
      const img = document.createElement('img');
      img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid var(--border)';
      img.src = dataUrl;
      prev.appendChild(img);
    });
  }).catch(() => {
    prev.innerHTML = '<div style="grid-column:1/-1;color:var(--danger);font-size:13px">❌ Gagal memproses foto. Coba lagi.</div>';
  });
}

// ====================== TRACKING ======================
async function trackReport() {
  const id = document.getElementById('trackInput').value.trim().toUpperCase();
  const el = document.getElementById('trackResult');
  if (!id) { el.innerHTML = '<div class="alert alert-warning"><div class="alert-icon">⚠️</div><div>Masukkan nomor tiket terlebih dahulu.</div></div>'; return; }
  el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3)">Mencari laporan...</div>';

  let t = null;
  if (window.fbGetTicketFull) t = await window.fbGetTicketFull(id);
  if (!t) {
    const DB = loadDB();
    const cached = DB.tickets.find(x => x.id === id);
    if (cached) t = { ...cached, photos: [], followUpPhotos: [] };
  }
  if (!t) { el.innerHTML = `<div class="alert alert-danger"><div class="alert-icon">${SVGIcons.x}</div><div>Nomor tiket <strong>${id}</strong> tidak ditemukan.</div></div>`; return; }

  const date = new Date(t.date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const statusClass = t.status === 'Baru' ? 'badge-new' : t.status === 'Dalam Proses' ? 'badge-process' : 'badge-done';
  const statusIcon = t.status === 'Baru' ? '<span style="font-size:11px;font-weight:bold;color:var(--primary)">NEW</span>' : t.status === 'Dalam Proses' ? SVGIcons.gear : SVGIcons.check;
  const steps = [
    { label: 'Laporan Dikirim', done: true },
    { label: 'Diterima Sekolah', done: t.status !== 'Baru' },
    { label: 'Dalam Proses', done: t.status === 'Dalam Proses' || t.status === 'Selesai' },
    { label: 'Selesai', done: t.status === 'Selesai' }
  ];
  const photosHTML = t.photos && t.photos.length > 0 ? `
    <div style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-3);font-weight:600;margin-bottom:6px">📷 Foto Laporan</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${t.photos.map(p => `<img src="${p}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer" onclick="openPhotoLightbox(this.src)">`).join('')}
      </div>
    </div>` : '';
  const followUpPhotosHTML = t.followUpPhotos && t.followUpPhotos.length > 0 ? `
    <div style="margin-top:8px">
      <div style="font-size:12px;color:var(--success);font-weight:600;margin-bottom:6px">📷 Foto Tindak Lanjut</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${t.followUpPhotos.map(p => `<img src="${p}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer" onclick="openPhotoLightbox(this.src)">`).join('')}
      </div>
    </div>` : '';
  el.innerHTML = `
    <div style="background:var(--primary-pale);border:1px solid #aed6f1;border-radius:12px;padding:16px;margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:var(--text-3)">Nomor Tiket</div>
          <div style="font-size:18px;font-weight:700;color:var(--primary);font-family:'Sora',sans-serif">${t.id}</div>
        </div>
        <span class="badge ${statusClass}" style="font-size:13px;padding:6px 14px">${statusIcon} ${t.status}</span>
      </div>
      <div class="steps" style="margin-bottom:12px">
        ${steps.map(s => `<div class="step ${s.done ? 'done' : ''}"><span class="step-num">${s.done ? '✓' : ''}</span>${s.label}</div>`).join('')}
      </div>
      <div style="background:#fff;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:2px">Topik</div>
        <div style="font-weight:600;font-size:14px">${t.topic}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px">Dilaporkan: ${date}</div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Sekolah</div>
        <div style="font-weight:600;font-size:14px">${t.schoolName}</div>
      </div>
      ${photosHTML}
      ${t.notes ? `<div style="background:var(--success-pale);border-radius:8px;padding:12px;border:1px solid #a9dfbf">
        <div style="font-size:11px;color:var(--success);font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px">${SVGIcons.clipboard} Tindak Lanjut Sekolah</div>
        <div style="font-size:13px;color:var(--text)">${t.notes}</div>
        ${followUpPhotosHTML}
      </div>` : '<div style="background:var(--warning-pale);border-radius:8px;padding:12px;border:1px solid #f9e79f;font-size:13px;color:var(--warning)">Laporan Anda sedang menunggu tindak lanjut dari pihak sekolah.</div>'}}
    </div>`;
}

// ====================== ADMIN CHANGE PASSWORD ======================
function openAdminChangePass() {
  document.getElementById('adminChangePassAlert').innerHTML = '';
  document.getElementById('adminOldPass').value = '';
  document.getElementById('adminNewPass1').value = '';
  document.getElementById('adminNewPass2').value = '';
  openModal('adminChangePassModal');
}

async function saveAdminPassword() {
  const old = document.getElementById('adminOldPass').value;
  const p1 = document.getElementById('adminNewPass1').value;
  const p2 = document.getElementById('adminNewPass2').value;
  const DB = loadDB();
  if (!(await verifyPassword(old, DB.admin))) return showAlert('adminChangePassAlert', 'danger', 'Password lama tidak sesuai.');
  if (p1.length < 8) return showAlert('adminChangePassAlert', 'danger', 'Password baru minimal 8 karakter.');
  if (p1 !== p2) return showAlert('adminChangePassAlert', 'danger', 'Konfirmasi password tidak cocok.');
  const hash = await hashPassword(p1);
  DB.admin.passwordHash = hash;
  if (window.fbSaveAdmin) await window.fbSaveAdmin({ username: DB.admin.username, passwordHash: hash });
  closeModal('adminChangePassModal');
  alert('Password administrator berhasil diperbarui!');
}

// ====================== ADMIN FORGOT PASSWORD ======================
function openAdminForgotPass() {
  document.getElementById('adminForgotAlert').innerHTML = '';
  openModal('adminForgotPassModal');
}

function sendAdminForgotPass() {
  const subject = encodeURIComponent('[SiLaPor] Permintaan Reset Password Administrator');
  const body = encodeURIComponent(
    'Halo Developer,\n\nTerdapat permintaan reset password untuk akun Administrator SiLaPor.\n\n' +
    'Waktu permintaan: ' + new Date().toLocaleString('id-ID') + '\n\n' +
    'Mohon segera proses permintaan ini.\n\nTerima kasih.'
  );
  window.location.href = `mailto:developer@silapor.id?subject=${subject}&body=${body}`;
  showAlert('adminForgotAlert', 'success', 'Aplikasi email Anda akan terbuka untuk mengirim permintaan reset ke developer.');
}

// ====================== INIT ======================
window.restoreLoginState = restoreLoginState;
window.renderSchoolTickets = typeof renderSchoolTickets !== 'undefined' ? renderSchoolTickets : undefined;
window.updateSchoolStats = typeof updateSchoolStats !== 'undefined' ? updateSchoolStats : undefined;
window.updateAdminStats = typeof updateAdminStats !== 'undefined' ? updateAdminStats : undefined;
window.renderAdminRecent = typeof renderAdminRecent !== 'undefined' ? renderAdminRecent : undefined;
genCaptcha();
document.getElementById('captchaAns').addEventListener('keyup', function(e) {
  if (e.key === 'Enter') checkCaptchaAuto();
});