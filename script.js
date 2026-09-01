const LOGIN_CONFIG = {
  USERNAME: 'admin',
  PASSWORD_HASH: 'e6ede62a1283d6e95761194fb9413ffddc8ab95c5352aa6cb66270168fe9ca9a',
};

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(pw) {
  const h = await sha256Hex(pw);
  console.log('PASSWORD_HASH =', h);
  return h;
}

const LOGIN_SESSION_KEY = 'grab_login_authed';
const LOGIN_ROLE_KEY = 'grab_login_role';

function isLoggedIn() {
  return sessionStorage.getItem(LOGIN_SESSION_KEY) === '1';
}

function isGuest() {
  return sessionStorage.getItem(LOGIN_ROLE_KEY) === 'guest';
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hide');
  document.getElementById('appRoot').style.display = '';
  initApp();
  applyRoleUI();
}

// ─── PULL CHAIN DRAG & RELEASE INTERACTION ──────────────────────────────────
let isLampOn = false;
let isDraggingChain = false;
let chainStartY = 0;
let chainCurrentDeltaY = 0;
const CHAIN_TRIGGER_THRESHOLD = 25; // px required drag distance to trigger lamp switch
const CHAIN_MAX_PULL = 70; // px max stretch

function initPullChain() {
  const chain = document.getElementById('pullChain');
  if (!chain || chain.dataset.initialized) return;
  chain.dataset.initialized = 'true';

  function onPointerDown(e) {
    isDraggingChain = true;
    chainStartY = e.clientY;
    chainCurrentDeltaY = 0;
    try { chain.setPointerCapture(e.pointerId); } catch(err) {}
    chain.classList.add('dragging');
  }

  function onPointerMove(e) {
    if (!isDraggingChain) return;
    const dy = Math.max(0, e.clientY - chainStartY);
    chainCurrentDeltaY = Math.min(CHAIN_MAX_PULL, dy * 0.85);
    updateChainVisual(chainCurrentDeltaY);
  }

  function onPointerUp(e) {
    if (!isDraggingChain) return;
    isDraggingChain = false;
    try { chain.releasePointerCapture(e.pointerId); } catch(err) {}
    chain.classList.remove('dragging');

    // Only switch light if dragged down past threshold
    if (chainCurrentDeltaY >= CHAIN_TRIGGER_THRESHOLD) {
      toggleLampLight();
    }

    animateChainRecoil(chainCurrentDeltaY);
    chainCurrentDeltaY = 0;
  }

  function onPointerCancel(e) {
    if (!isDraggingChain) return;
    isDraggingChain = false;
    try { chain.releasePointerCapture(e.pointerId); } catch(err) {}
    chain.classList.remove('dragging');
    animateChainRecoil(chainCurrentDeltaY);
    chainCurrentDeltaY = 0;
  }

  chain.addEventListener('pointerdown', onPointerDown);
  chain.addEventListener('pointermove', onPointerMove);
  chain.addEventListener('pointerup', onPointerUp);
  chain.addEventListener('pointercancel', onPointerCancel);
}

function updateChainVisual(dy) {
  const line = document.getElementById('chainLine');
  const knob = document.getElementById('chainKnobGroup');
  if (line) line.setAttribute('y2', 105 + dy);
  if (knob) knob.setAttribute('transform', `translate(0, ${dy})`);
}

function animateChainRecoil(startDy) {
  if (startDy <= 0) {
    updateChainVisual(0);
    return;
  }
  const startTime = performance.now();
  const duration = 380; // ms spring oscillation

  function springStep(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const decay = Math.exp(-6.5 * t);
    const oscillation = Math.cos(t * Math.PI * 4);
    const currentDy = startDy * decay * oscillation;

    updateChainVisual(currentDy);

    if (t < 1) {
      requestAnimationFrame(springStep);
    } else {
      updateChainVisual(0);
    }
  }
  requestAnimationFrame(springStep);
}

function toggleLampLight() {
  const screen = document.getElementById('loginScreen');
  if (!screen) return;

  isLampOn = !isLampOn;
  playSwitchSound(isLampOn);

  if (isLampOn) {
    screen.classList.add('light-on');
    setTimeout(() => {
      const u = document.getElementById('login-user');
      if (u) u.focus();
    }, 450);
  } else {
    screen.classList.remove('light-on');
  }
}

function showLogin() {
  const screen = document.getElementById('loginScreen');
  if (screen) {
    screen.classList.remove('hide');
    isLampOn = false;
    screen.classList.remove('light-on');
    initPullChain();
    updateChainVisual(0);
  }
  const appRoot = document.getElementById('appRoot');
  if (appRoot) appRoot.style.display = 'none';
}

async function doLogin() {
  const userEl = document.getElementById('login-user');
  const passEl = document.getElementById('login-pass');
  const errEl = document.getElementById('loginError');
  const user = userEl.value.trim();
  const pass = passEl.value;
  if (!user || !pass) {
    errEl.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
    return;
  }
  const hash = await sha256Hex(pass);
  if (user === LOGIN_CONFIG.USERNAME && hash === LOGIN_CONFIG.PASSWORD_HASH) {
    sessionStorage.setItem(LOGIN_SESSION_KEY, '1');
    sessionStorage.setItem(LOGIN_ROLE_KEY, 'admin');
    errEl.textContent = '';
    passEl.value = '';
    showApp();
  } else {
    errEl.textContent = '❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    const card = document.querySelector('.login-card');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    passEl.value = '';
    passEl.focus();
  }
}

function loginAsGuest() {
  sessionStorage.setItem(LOGIN_SESSION_KEY, '1');
  sessionStorage.setItem(LOGIN_ROLE_KEY, 'guest');
  document.getElementById('loginError').textContent = '';
  showApp();
}

function doLogout() {
  if (!confirm('ต้องการออกจากระบบใช่หรือไม่?')) return;
  sessionStorage.removeItem(LOGIN_SESSION_KEY);
  sessionStorage.removeItem(LOGIN_ROLE_KEY);
  sessionStorage.removeItem('grab_authed');
  showLogin();
}

function toggleLoginPass() {
  const inp = document.getElementById('login-pass');
  const btn = document.getElementById('loginEyeBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

// ─── GUEST MODE UI ──────────────────────────────────────────────────────────
function guestBlocked() {
  showToast('👀 บัญชี Guest ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขได้', 'red');
}

function applyRoleUI() {
  const guest = isGuest();
  ['importLabel', 'clearBtn', 'lockBtn', 'tabEntryBtn', 'goalCard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('guest-hidden', guest);
  });
  const badge = document.getElementById('guestBadge');
  if (badge) badge.style.display = guest ? 'inline-block' : 'none';
  const actionsTh = document.getElementById('historyActionsTh');
  if (actionsTh) actionsTh.classList.toggle('guest-hidden', guest);
  if (guest && document.getElementById('page-entry') && document.getElementById('page-entry').classList.contains('active')) {
    const dashBtn = document.querySelector('.tab-btn');
    showTab('dashboard', dashBtn);
  }
  renderHistory();
}

// ─── DATA ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'grab_tracker_v1';
const API_URL = 'https://script.google.com/macros/s/AKfycbxJs_MWuY6IjX5tMyx10Tk20d0iz6x2nozHr9MmZYNvPAGKUrGp4EfJdOEmRqrpNCM6/exec';
const API_KEY = 'guntgrabsecret';
let editingId = null;
let isSyncing = false;

function loadData()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveLocal(rows) { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }
function saveData(rows) { saveLocal(rows); }
function getRows() { return loadData().sort((a,b) => a.date.localeCompare(b.date)); }
function newId()  { return Date.now() + Math.random().toString(36).slice(2,6); }

function parseDateFromSheets(rawDate) {
  if (!rawDate) return '';
  let str = String(rawDate).trim();
  if (str.includes('T')) {
    const dt = new Date(str);
    dt.setHours(dt.getHours() + 7);
    return dt.toISOString().slice(0, 10);
  }
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : str.slice(0, 10);
}

// ─── CONFETTI ENGINE ────────────────────────────────────────────────────────
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiAnimationId = null;

function resizeConfettiCanvas() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

function launchConfetti(opts = {}) {
  if (!confettiCanvas || !confettiCtx) return;
  resizeConfettiCanvas();
  const count = opts.count || 60;
  const colors = ['#00b14f', '#00e066', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ffd700'];
  const originX = opts.x !== undefined ? opts.x : window.innerWidth / 2;
  const originY = opts.y !== undefined ? opts.y : window.innerHeight * 0.4;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    confettiParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      gravity: 0.25,
      drag: 0.98
    });
  }

  if (!confettiAnimationId) {
    animateConfetti();
  }
}

function animateConfetti() {
  if (!confettiCtx || confettiParticles.length === 0) {
    if (confettiCtx) confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiAnimationId = null;
    return;
  }

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.rotation += p.rSpeed;
    p.opacity -= 0.008;

    if (p.opacity <= 0 || p.y > confettiCanvas.height + 20) {
      confettiParticles.splice(i, 1);
      continue;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    confettiCtx.restore();
  }

  confettiAnimationId = requestAnimationFrame(animateConfetti);
}

function launchCelebration() {
  launchConfetti({ count: 50, x: window.innerWidth * 0.25, y: window.innerHeight * 0.3 });
  setTimeout(() => launchConfetti({ count: 70, x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 }), 200);
  setTimeout(() => launchConfetti({ count: 50, x: window.innerWidth * 0.75, y: window.innerHeight * 0.3 }), 400);
}

// ─── SOUND SYNTHESIZER (WEB AUDIO API) ──────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function isSoundEnabled() {
  return localStorage.getItem('grab_sound') !== '0';
}

function toggleSound() {
  const nextState = !isSoundEnabled();
  localStorage.setItem('grab_sound', nextState ? '1' : '0');
  updateSoundUI();
  if (nextState) playCoin();
  showToast(nextState ? '🔊 เปิดเสียงเอฟเฟกต์แล้ว' : '🔇 ปิดเสียงเอฟเฟกต์แล้ว', 'yellow');
}

function updateSoundUI() {
  const btn = document.getElementById('soundBtn');
  if (btn) btn.textContent = isSoundEnabled() ? '🔊' : '🔇';
}

function playCoin() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch(e) {}
}

function playChipClick() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch(e) {}
}

function playSwitchSound(stateOn) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(stateOn ? 1900 : 1300, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(stateOn ? 840 : 540, now + 0.03);
    gain2.gain.setValueAtTime(0.22, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.12);
  } catch(e) {}
}

function playVictoryFanfare() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  } catch(e) {}
}

// ─── THEME SYSTEM ───────────────────────────────────────────────────────────
const THEMES = ['default', 'dark', 'neon'];
const THEME_LABELS = {
  default: 'สดใส 🟢',
  dark: 'มิดไนท์ 🌙',
  neon: 'นีออน 💎'
};

function getStoredTheme() {
  return localStorage.getItem('grab_theme') || 'default';
}

function applyTheme(theme) {
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('grab_theme', theme);
  const labelEl = document.getElementById('themeName');
  if (labelEl) labelEl.textContent = THEME_LABELS[theme] || 'ธีม';
}

function cycleTheme() {
  const current = getStoredTheme();
  const nextIdx = (THEMES.indexOf(current) + 1) % THEMES.length;
  const next = THEMES[nextIdx];
  applyTheme(next);
  playChipClick();
  showToast(`🎨 สลับเป็นธีม ${THEME_LABELS[next]}`, 'green');
}

// ─── QUICK CHIPS HELPERS ───────────────────────────────────────────────────
function setChipValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = val;
  playChipClick();
  if (id === 'f-hours') {
    el.dispatchEvent(new Event('change'));
  } else {
    updatePreview();
  }
}

function addChipValue(id, add) {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = parseFloat(el.value) || 0;
  el.value = (cur + add).toFixed(2).replace(/\.00$/, '');
  playChipClick();
  updatePreview();
}

function copyValue(fromId, toId) {
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);
  if (!fromEl || !toEl) return;
  toEl.value = fromEl.value;
  playChipClick();
  updatePreview();
}

function appendNote(tag) {
  const el = document.getElementById('f-note');
  if (!el) return;
  const cur = el.value.trim();
  if (!cur) {
    el.value = tag;
  } else if (!cur.includes(tag)) {
    el.value = cur + ' ' + tag;
  }
  playChipClick();
}

// ── RIPPLE EFFECT ────────────────────────────────────────────────────────────
function addRipple(e) {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ── SCROLL TO TOP ────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  btn.classList.toggle('show', window.scrollY > 300);
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── GOOGLE SHEETS API ───────────────────────────────────────────────────────
async function apiCall(action, payload = {}) {
  try {
    if (action === 'getAll') {
      const res = await fetch(`${API_URL}?action=getAll`, { redirect: 'follow' });
      return await res.json();
    }
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action, key: API_KEY, ...payload })
    });
    return await res.json();
  } catch (err) {
    console.warn('API error:', err);
    return null;
  }
}

async function syncFromSheets() {
  if (isSyncing) return false;
  isSyncing = true;
  setSyncStatus('syncing');
  const res = await apiCall('getAll');
  const rows = res && (res.rows || res.data);
  if (res && (res.ok || res.status === 'ok') && Array.isArray(rows)) {
    const cleanData = rows.map(r => ({
      ...r,
      date: parseDateFromSheets(r.date),
      grab: parseFloat(r.grab) || 0,
      tip: parseFloat(r.tip) || 0,
      oil: parseFloat(r.oil) || 0,
      oilReal: parseFloat(r.oilReal) || 0,
      credit: parseFloat(r.credit) || 0,
      withdraw: parseFloat(r.withdraw) || 0,
      hours: (r.hours !== undefined && r.hours !== null && r.hours !== '') ? parseFloat(r.hours) : null,
      note: r.note ? String(r.note).trim() : ''
    }));
    saveLocal(cleanData);
    setSyncStatus('online');
    isSyncing = false;
    return true;
  } else {
    setSyncStatus('offline');
    isSyncing = false;
    return false;
  }
}

async function saveRow(row) {
  const rows = loadData();
  const idx = rows.findIndex(r => r.id === row.id || r.date === row.date);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  saveLocal(rows);
  setSyncStatus('syncing');
  const res = await apiCall('save', { row });
  if (res && res.ok) {
    setSyncStatus('online');
    return true;
  } else {
    setSyncStatus('offline');
    return false;
  }
}

async function deleteRowRemote(id) {
  const rows = loadData().filter(r => r.id !== id);
  saveLocal(rows);
  setSyncStatus('syncing');
  const res = await apiCall('delete', { id });
  if (res && res.ok) {
    setSyncStatus('online');
    return true;
  } else {
    setSyncStatus('offline');
    return false;
  }
}

async function saveAllRemote(allRows) {
  saveLocal(allRows);
  setSyncStatus('syncing');
  const res = await apiCall('saveAll', { rows: allRows });
  if (res && res.ok) {
    setSyncStatus('online');
    return true;
  } else {
    setSyncStatus('offline');
    return false;
  }
}

function setSyncStatus(st) {
  const statusEl = document.getElementById('syncStatus');
  if (!statusEl) return;
  if (st === 'online' || st === 'ok') {
    statusEl.className = '';
    statusEl.textContent = '☁️ Synced';
  } else if (st === 'offline' || st === 'error') {
    statusEl.className = 'error';
    statusEl.textContent = '⚠️ ออฟไลน์';
  } else if (st === 'syncing') {
    statusEl.className = 'syncing';
    statusEl.textContent = '🔄 กำลัง sync...';
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function profit(r)   { return (r.grab || 0) + (r.tip || 0) - (r.oil || 0); }
function income(r)   { return (r.grab || 0) + (r.tip || 0); }
function isWorkDay(r){ return (r.grab || 0) > 0 || (r.tip || 0) > 0; }

function fmtHours(h) {
  if (h === null || h === undefined || isNaN(h) || h === '') return '—';
  const num = parseFloat(h);
  const totalMin = Math.round(num * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs === 0 && mins === 0) return '—';
  if (mins === 0) return `${hrs} ชม.`;
  if (hrs === 0) return `${mins} นาที`;
  return `${hrs} ชม. ${mins} นาที`;
}

function fmtHoursShort(h) {
  if (h === null || h === undefined || isNaN(h) || h === '') return '—';
  const num = parseFloat(h);
  const totalMin = Math.round(num * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs === 0 && mins === 0) return '—';
  if (mins === 0) return `${hrs} ชม.`;
  return `${hrs}h ${mins}m`;
}

function fmtHoursLabel(val) {
  if (!val) return '— ไม่ระบุ —';
  const num = parseFloat(val);
  const totalMin = Math.round(num * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hrs} ชั่วโมง`;
  if (hrs === 0) return `${mins} นาที`;
  return `${hrs} ชม. ${mins} นาที`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return `${d} ${TH_MONTHS_S[m - 1]} ${y + 543}`;
}

function populateHoursSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— ไม่ระบุ —</option>';
  const step = 0.25;
  const max = 18;
  for (let h = step; h <= max; h += step) {
    const val = (Math.round(h * 100) / 100).toString();
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = fmtHoursLabel(val);
    sel.appendChild(opt);
  }
}

// ── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function animateCount(el, targetVal, duration = 800, isInt = false) {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  const opts = isInt ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const cur = from + (targetVal - from) * ease;
    el.textContent = (isInt ? Math.round(cur) : cur).toLocaleString('th-TH', opts);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = targetVal.toLocaleString('th-TH', opts);
  }
  requestAnimationFrame(tick);
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = 'show ' + type;
  setTimeout(() => { if (t) t.className = ''; }, 2800);
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function showTab(name, btn) {
  if (name === 'entry' && isGuest()) { guestBlocked(); return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const targetPage = document.getElementById('page-' + name);
  if (targetPage) targetPage.classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'history')   renderHistory();
  if (name === 'monthly')   renderMonthly();
  if (name === 'bonus')     renderBonus();
}

// ─── FORM PREVIEW ─────────────────────────────────────────────────────────────
function updatePreview() {
  const g = parseFloat(document.getElementById('f-grab').value) || 0;
  const t = parseFloat(document.getElementById('f-tip').value) || 0;
  const o = parseFloat(document.getElementById('f-oil').value) || 0;
  const incEl = document.getElementById('prev-income');
  const pEl   = document.getElementById('prev-profit');
  const box   = document.getElementById('previewBox');
  const hasVal = g || t || o;
  if (box) box.classList.toggle('active-entry', !!hasVal);
  function setAnimated(el, val) {
    if (!el) return;
    el.textContent = fmt(val) + ' บาท';
    el.classList.remove('updated');
    void el.offsetWidth;
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 400);
  }
  setAnimated(incEl, g + t);
  const pVal = g + t - o;
  setAnimated(pEl, pVal);
  if (pEl) pEl.style.color = pVal < 0 ? 'var(--red)' : 'var(--green-dark)';
}

// ─── SAVE ENTRY ──────────────────────────────────────────────────────────────
async function saveEntry() {
  if (isGuest()) { guestBlocked(); return; }
  const date = document.getElementById('f-date').value;
  if (!date) { showToast('กรุณาเลือกวันที่', 'red'); return; }
  const rows = loadData();
  let existRow = rows.find(r => r.date === date);
  if (existRow && !confirm('มีข้อมูลของวันนี้แล้ว ต้องการแทนที่?')) return;
  const hoursVal = document.getElementById('f-hours').value;
  const row = {
    id: existRow ? existRow.id : newId(), date,
    grab:     parseFloat(document.getElementById('f-grab').value) || 0,
    tip:      parseFloat(document.getElementById('f-tip').value) || 0,
    oil:      parseFloat(document.getElementById('f-oil').value) || 0,
    oilReal:  parseFloat(document.getElementById('f-oilReal').value) || 0,
    credit:   parseFloat(document.getElementById('f-credit').value) || 0,
    withdraw: parseFloat(document.getElementById('f-withdraw').value) || 0,
    hours:    hoursVal ? parseFloat(hoursVal) : null,
    note: document.getElementById('f-note').value.trim(),
  };
  showToast('💾 กำลังบันทึก...');
  const success = await saveRow(row);
  if (success) {
    playCoin();
    launchConfetti({ count: 70 });
    const dt = new Date(date + 'T00:00:00');
    dt.setDate(dt.getDate() + 1);
    ['f-grab', 'f-tip', 'f-oil', 'f-oilReal', 'f-credit', 'f-withdraw', 'f-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const hoursEl = document.getElementById('f-hours');
    if (hoursEl) hoursEl.value = '';
    tdpSetValue('f-date', dt.toISOString().slice(0, 10));
    updatePreview();
    renderDashboard();
    renderHistory();
    renderMonthly();
    renderBonus();
    showToast('✅ บันทึกแล้ว', 'green');
  } else {
    showToast('⚠️ ไม่สามารถบันทึกข้อมูลไปยัง Sheets ได้', 'red');
  }
}

// ─── DYNAMIC GREETING ───────────────────────────────────────────────────────
function updateGreeting() {
  const hr = new Date().getHours();
  let greet = 'สวัสดีตอนเช้า ☀️';
  let quote = 'ขอให้เปิดงานได้ออเดอร์รัวๆ ขับขี่ปลอดภัย! 🏍️💨';
  if (hr >= 12 && hr < 17) {
    greet = 'สวัสดีตอนบ่าย ⛅';
    quote = 'บ่ายนี้ออเดอร์ไหลมาเทมา สู้ๆ🥤';
  } else if (hr >= 17 && hr < 21) {
    greet = 'สวัสดีช่วงเย็น 🌆';
    quote = 'ช่วงค่ำยอดกำลังปัง ลุยให้เต็มที่ รวยๆๆๆ! ⚡';
  } else if (hr >= 21 || hr < 5) {
    greet = 'ราตรีสวัสดิ์ กะดึก 🌙';
    quote = 'กะดึกขับขี่ระมัดระวัง เป็นห่วงความปลอดภัยเสมอ 🛡️';
  }
  const gEl = document.getElementById('heroGreeting');
  const qEl = document.getElementById('heroQuote');
  if (gEl) gEl.textContent = greet;
  if (qEl) qEl.textContent = quote;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard() {
  const rows = getRows();
  const workRows = rows.filter(isWorkDay);
  const totalGrab    = rows.reduce((s, r) => s + (r.grab || 0), 0);
  const totalTip     = rows.reduce((s, r) => s + (r.tip || 0), 0);
  const totalIncome  = rows.reduce((s, r) => s + income(r), 0);
  const totalOil     = rows.reduce((s, r) => s + (r.oil || 0), 0);
  const totalOilReal = rows.reduce((s, r) => s + (r.oilReal || 0), 0);
  const totalCredit  = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const totalWithdraw= rows.reduce((s, r) => s + (r.withdraw || 0), 0);
  const totalProfit  = rows.reduce((s, r) => s + profit(r), 0);
  const avgProfit    = workRows.length ? totalProfit / workRows.length : 0;
  const avgIncome    = workRows.length ? totalIncome / workRows.length : 0;

  updateGreeting();

  const cards = [
    { label:'💚 รายได้ Grab รวม', val:totalGrab,    color:'green', sub:'บาท' },
    { label:'👋 Tip มือรวม',      val:totalTip,     color:'yellow', sub:'บาท', cls:'yellow' },
    { label:'💰 รายได้รวมทั้งสิ้น',val:totalIncome, color:'green', sub:'บาท' },
    { label:'⛽ ค่าน้ำมัน (ประมาณ)', val:totalOil,     color:'red',   sub:`บาท | เติมจริง ${fmt(totalOilReal)} บาท`, cls:'red' },
    { label:'💳 เครดิต Grab',     val:totalCredit,  color:'yellow',sub:'บาท', cls:'yellow' },
    { label:'🏦 ถอนเข้ากรุงศรี',  val:totalWithdraw,color:'blue',  sub:'บาท', cls:'blue' },
    { label:'💵 กำไรสุทธิรวม',    val:totalProfit,  color:'green', sub:'บาท' },
    { label:'📅 วันทำงาน',        val:workRows.length, color:'green', sub:`วัน (จาก ${rows.length} วัน)`, isInt:true },
    { label:'📈 รายได้เฉลี่ย/วัน', val:avgIncome,   color:'green', sub:'บาท/วันทำงาน' },
    { label:'📈 กำไรเฉลี่ย/วัน',  val:avgProfit,    color:'green', sub:'บาท/วันทำงาน' },
  ];

  const gridEl = document.getElementById('statGrid');
  if (gridEl) {
    gridEl.innerHTML = cards.map((c, i) =>
      `<div class="stat-card ${c.cls || ''}" style="animation:rowIn 0.35s ${i * 0.04}s ease both">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value ${c.color}" id="sv${i}">0</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`
    ).join('');

    requestAnimationFrame(() => {
      cards.forEach((c, i) => {
        const el = document.getElementById('sv' + i);
        if (!el) return;
        if (c.isInt) { setTimeout(() => animateCount(el, c.val, 600, true), i * 40); }
        else { setTimeout(() => animateCount(el, c.val, 700 + i * 30), i * 40); }
      });
    });
  }

  renderBarChart(rows);
  renderTrendChart(rows);
  renderGoal(rows);
  renderWeekCompare(rows);
  renderMonthCompare(rows);
  renderDowChart(rows);
}

// ─── BAR CHART (30 DAYS NET PROFIT COLUMN CHART) ───────────────────────────
function renderBarChart(rows) {
  const el = document.getElementById('barChart');
  if (!el) return;

  const recent = rows.filter(isWorkDay).slice(-30);
  if (!recent.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><p>ยังไม่มีข้อมูลกำไรสุทธิ</p></div>';
    return;
  }

  // Summary statistics
  const profits = recent.map(r => profit(r));
  const totalP = profits.reduce((a, b) => a + b, 0);
  const avgP = Math.round(totalP / recent.length);
  const maxP = Math.max(...profits);
  const minP = Math.min(...profits, 0);
  const peakIdx = profits.indexOf(maxP);
  const peakRow = recent[peakIdx];

  const totalHours = recent.reduce((sum, r) => sum + (r.hours || 0), 0);
  const avgHourlyRate = totalHours > 0 ? Math.round(totalP / totalHours) : 0;

  // Header Summary Stats Chips
  const statsHtml = `
    <div class="chart-summary-grid">
      <div class="chart-stat-chip">
        <div class="stat-chip-label">💰 กำไรรวม 30 วัน</div>
        <div class="stat-chip-val text-green">${fmt(totalP)} ฿</div>
      </div>
      <div class="chart-stat-chip">
        <div class="stat-chip-label">📈 เฉลี่ยต่อวัน</div>
        <div class="stat-chip-val">${fmt(avgP)} ฿/วัน</div>
      </div>
      <div class="chart-stat-chip">
        <div class="stat-chip-label">🏆 วันพีคสุด (${peakRow ? peakRow.date.slice(5) : ''})</div>
        <div class="stat-chip-val text-gold">${fmt(maxP)} ฿</div>
      </div>
      <div class="chart-stat-chip">
        <div class="stat-chip-label">⚡ เฉลี่ยต่อ ชม.</div>
        <div class="stat-chip-val">${fmt(avgHourlyRate)} ฿/ชม.</div>
      </div>
    </div>
  `;

  // Chart layout calculations
  const n = recent.length;
  const W = Math.max(el.clientWidth || 750, 480);
  const H = 260;
  const PAD = { top: 34, right: 20, bottom: 44, left: 55 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  // Value scale
  const upperLimit = Math.max(maxP * 1.15, avgP * 1.35, 100);
  const lowerLimit = Math.min(minP < 0 ? minP * 1.15 : 0, 0);
  const range = (upperLimit - lowerLimit) || 1;

  function yp(v) {
    return PAD.top + CH - ((v - lowerLimit) / range) * CH;
  }

  const zeroY = yp(0);
  const avgY = yp(avgP);

  // Column geometry
  const colSlotW = CW / n;
  const colW = Math.max(7, Math.min(22, colSlotW * 0.72));

  // Y-axis ticks & grid lines
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => lowerLimit + (range / tickCount) * i);
  const yAxisSvg = ticks.map(v => {
    const y = yp(v).toFixed(1);
    return `
      <line x1="${PAD.left}" y1="${y}" x2="${PAD.left + CW}" y2="${y}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="2,2" opacity="0.6"/>
      <text x="${PAD.left - 8}" y="${parseFloat(y) + 3.5}" text-anchor="end" font-size="10" fill="var(--text-muted)" font-weight="600">${Math.round(v)}</text>
    `;
  }).join('');

  // Average reference line
  const avgLineSvg = `
    <line x1="${PAD.left}" y1="${avgY.toFixed(1)}" x2="${PAD.left + CW}" y2="${avgY.toFixed(1)}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.85"/>
    <rect x="${PAD.left + CW - 96}" y="${(avgY - 18).toFixed(1)}" width="96" height="16" rx="4" fill="#f59e0b" opacity="0.16"/>
    <text x="${PAD.left + CW - 6}" y="${(avgY - 6).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#d97706" font-weight="700">เฉลี่ย ${fmt(avgP)}฿</text>
  `;

  // Bars and labels
  const barsSvg = recent.map((r, i) => {
    const p = profit(r);
    const inc = income(r);
    const xCenter = PAD.left + i * colSlotW + colSlotW / 2;
    const x = xCenter - colW / 2;

    let barY, barH, gradId;
    const isPeak = (i === peakIdx && maxP > 0);
    const isAboveAvg = p >= avgP;

    if (p >= 0) {
      barY = yp(p);
      barH = Math.max(zeroY - barY, 2);
      gradId = isPeak ? 'gradPeak' : (isAboveAvg ? 'gradHigh' : 'gradNorm');
    } else {
      barY = zeroY;
      barH = Math.max(yp(p) - zeroY, 2);
      gradId = 'gradNeg';
    }

    const [, , d] = r.date.split('-').map(Number);
    const dt = parseDateFromSheets(r.date);
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const dayName = dt ? dayNames[dt.getDay()] : '';

    // X-Axis labels (smart spacing for readability)
    const step = n > 22 ? 2 : 1;
    const showLabel = (i % step === 0) || i === n - 1;
    const xLabelSvg = showLabel ? `
      <text x="${xCenter.toFixed(1)}" y="${H - PAD.bottom + 14}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)" font-weight="600">${d}</text>
      <text x="${xCenter.toFixed(1)}" y="${H - PAD.bottom + 26}" text-anchor="middle" font-size="8" fill="var(--text-subtle)">${dayName}</text>
    ` : '';

    // Peak Star Badge
    const peakStarSvg = isPeak ? `
      <g transform="translate(${xCenter.toFixed(1)}, ${(barY - 14).toFixed(1)})">
        <circle cx="0" cy="0" r="7.5" fill="#f59e0b" filter="drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))"/>
        <text x="0" y="3.5" text-anchor="middle" font-size="9" fill="#ffffff" font-weight="900">★</text>
      </g>
    ` : '';

    const rateHr = r.hours > 0 ? Math.round(p / r.hours) : 0;
    const oilPct = inc > 0 ? Math.round(((r.oil || 0) / inc) * 100) : 0;

    return `
      <g class="col-bar-group" data-idx="${i}" data-date="${r.date}" data-profit="${p}" data-income="${inc}" data-grab="${r.grab || 0}" data-tip="${r.tip || 0}" data-oil="${r.oil || 0}" data-oilpct="${oilPct}" data-hours="${r.hours || 0}" data-rate="${rateHr}" data-note="${encodeURIComponent(r.note || '')}">
        <rect class="col-bar-hover-zone" x="${(xCenter - colSlotW / 2).toFixed(1)}" y="${PAD.top}" width="${colSlotW.toFixed(1)}" height="${CH}" fill="transparent" style="cursor:pointer"/>
        <rect class="col-bar-rect" id="cbar${i}" x="${x.toFixed(1)}" y="${barY.toFixed(1)}" width="${colW.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" ry="4" fill="url(#${gradId})" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))" style="transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer"/>
        ${peakStarSvg}
        ${xLabelSvg}
      </g>
    `;
  }).join('');

  // SVG Definitions with Gradients
  const defsSvg = `
    <defs>
      <linearGradient id="gradPeak" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="50%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#00b14f"/>
      </linearGradient>
      <linearGradient id="gradHigh" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#00e066"/>
        <stop offset="100%" stop-color="#008a3e"/>
      </linearGradient>
      <linearGradient id="gradNorm" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2dd4bf"/>
        <stop offset="100%" stop-color="#0f766e"/>
      </linearGradient>
      <linearGradient id="gradNeg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f87171"/>
        <stop offset="100%" stop-color="#dc2626"/>
      </linearGradient>
    </defs>
  `;

  el.innerHTML = `
    ${statsHtml}
    <div class="col-chart-container" style="position:relative;width:100%;overflow-x:auto;">
      <div class="col-chart-tooltip" id="colChartTip"></div>
      <svg id="colBarSvg" width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:inherit;overflow:visible;">
        ${defsSvg}
        ${yAxisSvg}
        ${avgLineSvg}
        ${barsSvg}
      </svg>
    </div>
  `;

  // Attach hover & touch tooltip handler
  initColChartTooltip(recent);
}

function initColChartTooltip(recent) {
  const svg = document.getElementById('colBarSvg');
  const tip = document.getElementById('colChartTip');
  if (!svg || !tip) return;

  const groups = svg.querySelectorAll('.col-bar-group');
  const TH_DAY_NAMES = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

  groups.forEach(g => {
    function show() {
      const idx = Number(g.dataset.idx);
      const r = recent[idx];
      if (!r) return;

      const p = Number(g.dataset.profit);
      const inc = Number(g.dataset.income);
      const grab = Number(g.dataset.grab);
      const tipVal = Number(g.dataset.tip);
      const oil = Number(g.dataset.oil);
      const oilpct = g.dataset.oilpct;
      const hours = Number(g.dataset.hours);
      const rate = Number(g.dataset.rate);
      const note = decodeURIComponent(g.dataset.note || '');

      const dt = parseDateFromSheets(r.date);
      const dayFull = dt ? `${TH_DAY_NAMES[dt.getDay()]}ที่ ${dt.getDate()} ${TH_MONTHS_S[dt.getMonth()]} ${dt.getFullYear() + 543}` : fmtDate(r.date);

      const isPos = p >= 0;
      const profitColor = isPos ? 'var(--green)' : 'var(--red)';

      tip.innerHTML = `
        <div class="tip-header">
          <span class="tip-date">📅 ${dayFull}</span>
          <span class="tip-badge" style="background:${isPos ? 'var(--green-light)' : 'var(--red-light)'};color:${profitColor}">
            ${isPos ? 'กำไร' : 'ขาดทุน'}
          </span>
        </div>
        <div class="tip-body">
          <div class="tip-profit-row">
            <span>กำไรสุทธิ</span>
            <strong style="color:${profitColor};font-size:1.15rem">${isPos ? '+' : ''}${fmt(p)} ฿</strong>
          </div>
          <div class="tip-divider"></div>
          <div class="tip-grid">
            <div class="tip-item">
              <span class="tip-k">🛵 รายได้รวม</span>
              <strong class="tip-v">${fmt(inc)} ฿</strong>
            </div>
            <div class="tip-item">
              <span class="tip-k">⛽ ค่าน้ำมัน</span>
              <strong class="tip-v text-red">${fmt(oil)} ฿ <small style="font-weight:normal;color:var(--text-subtle)">(${oilpct}%)</small></strong>
            </div>
            <div class="tip-item">
              <span class="tip-k">⏱️ วิ่งงาน</span>
              <strong class="tip-v">${fmtHours(hours)} ชม.</strong>
            </div>
            <div class="tip-item">
              <span class="tip-k">⚡ เฉลี่ย/ชม.</span>
              <strong class="tip-v text-gold">${fmt(rate)} ฿/ชม.</strong>
            </div>
          </div>
          ${(grab > 0 || tipVal > 0) ? `
            <div class="tip-sub-breakdown">
              <span>(Grab: ${fmt(grab)} ฿ ${tipVal > 0 ? `+ ทิป: ${fmt(tipVal)} ฿` : ''})</span>
            </div>
          ` : ''}
          ${note ? `<div class="tip-note">📝 ${note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
        </div>
      `;

      // Highlight active bar
      groups.forEach(other => {
        const rect = other.querySelector('.col-bar-rect');
        if (rect) rect.style.opacity = (other === g) ? '1' : '0.4';
      });
      const activeRect = g.querySelector('.col-bar-rect');
      if (activeRect) {
        activeRect.style.filter = 'drop-shadow(0 0 8px rgba(0, 224, 102, 0.8)) brightness(1.2)';
      }

      // Position tooltip
      const rect = g.getBoundingClientRect();
      const containerRect = svg.parentElement.getBoundingClientRect();
      const leftPos = rect.left - containerRect.left + rect.width / 2;
      const tipWidth = 230;

      let clampedLeft = leftPos - tipWidth / 2;
      if (clampedLeft < 10) clampedLeft = 10;
      if (clampedLeft + tipWidth > containerRect.width - 10) {
        clampedLeft = containerRect.width - tipWidth - 10;
      }

      tip.style.left = clampedLeft + 'px';
      tip.style.top = '10px';
      tip.classList.add('show');
    }

    function hide() {
      tip.classList.remove('show');
      groups.forEach(other => {
        const rect = other.querySelector('.col-bar-rect');
        if (rect) {
          rect.style.opacity = '1';
          rect.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))';
        }
      });
    }

    g.addEventListener('mouseenter', show);
    g.addEventListener('mouseleave', hide);
    g.addEventListener('touchstart', (e) => {
      show();
      e.stopPropagation();
    }, { passive: true });
  });

  document.addEventListener('touchstart', (e) => {
    if (!svg.contains(e.target)) {
      tip.classList.remove('show');
      groups.forEach(other => {
        const rect = other.querySelector('.col-bar-rect');
        if (rect) {
          rect.style.opacity = '1';
          rect.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))';
        }
      });
    }
  }, { passive: true });
}

// ─── TREND CHART (interactive tooltip) ──────────────────────────────────────
function renderTrendChart(rows) {
  const el = document.getElementById('trendChart');
  if (!el) return;
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = rows.filter(r => r.date >= cutoffStr && isWorkDay(r));

  if (recent.length < 2) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📉</div><p>ต้องการข้อมูลอย่างน้อย 2 วัน</p></div>';
    return;
  }

  const W = Math.max(el.clientWidth || 700, 400);
  const H = 250;
  const PAD = { top: 20, right: 16, bottom: 44, left: 62 };
  const CW = W - PAD.left - PAD.right, CH = H - PAD.top - PAD.bottom;
  const n = recent.length;
  const incomes = recent.map(r => income(r));
  const profits = recent.map(r => profit(r));
  const oils    = recent.map(r => r.oil || 0);
  const allVals = [...incomes, ...profits, ...oils];
  const minV = Math.min(...allVals, 0), maxV = Math.max(...allVals, 1);
  const range = maxV - minV || 1;

  function xp(i) { return PAD.left + (i / (n - 1)) * CW; }
  function yp(v) { return PAD.top + CH - ((v - minV) / range) * CH; }

  function makePath(vals, color, dashed = false) {
    const d = vals.map((v, i) => (i === 0 ? 'M' : 'L') + xp(i).toFixed(1) + ',' + yp(v).toFixed(1)).join(' ');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${dashed ? ' stroke-dasharray="5,4"' : ''} opacity="0.9"/>`;
  }
  function makeArea(vals, color) {
    const base = yp(Math.max(minV, 0));
    const d = vals.map((v, i) => (i === 0 ? 'M' : 'L') + xp(i).toFixed(1) + ',' + yp(v).toFixed(1)).join(' ')
      + `L${xp(n - 1).toFixed(1)},${base} L${PAD.left},${base} Z`;
    return `<path d="${d}" fill="${color}" opacity="0.06"/>`;
  }
  function makeDots(vals, color) {
    return vals.map((v, i) => `<circle class="chart-dot" cx="${xp(i).toFixed(1)}" cy="${yp(v).toFixed(1)}" r="4" fill="${color}" stroke="white" stroke-width="1.5" style="cursor:pointer" data-date="${recent[i].date}" data-val="${v.toFixed(0)}" data-color="${color}">
      <title>${fmtDate(recent[i].date)}: ${fmt(v)} บาท</title>
    </circle>`).join('');
  }

  const zeroY = yp(0).toFixed(1);
  const zeroLine = minV < 0 ? `<line x1="${PAD.left}" y1="${zeroY}" x2="${PAD.left + CW}" y2="${zeroY}" stroke="#fca5a5" stroke-width="1" stroke-dasharray="4,3"/>` : '';
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minV + (range / tickCount) * i);
  const yAxis = ticks.map(v => {
    const y = yp(v).toFixed(1);
    return `<line x1="${PAD.left - 4}" y1="${y}" x2="${PAD.left + CW}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>
    <text x="${PAD.left - 8}" y="${parseFloat(y) + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${Math.round(v)}</text>`;
  }).join('');

  const step = Math.max(1, Math.floor(n / 10));
  const xLabels = recent.map((r, i) => {
    if (i % step !== 0 && i !== n - 1) return '';
    const [, m, d] = r.date.split('-').map(Number);
    return `<text x="${xp(i).toFixed(1)}" y="${H - PAD.bottom + 16}" text-anchor="middle" font-size="10" fill="#9ca3af">${d}/${m}</text>`;
  }).join('');

  let lastMonth = '';
  const monthLabels = recent.map((r, i) => {
    const mo = r.date.slice(0, 7);
    if (mo === lastMonth) return '';
    lastMonth = mo;
    const [, m] = mo.split('-').map(Number);
    return `<line x1="${xp(i).toFixed(1)}" y1="${PAD.top}" x2="${xp(i).toFixed(1)}" y2="${PAD.top + CH}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3"/>
    <text x="${parseFloat(xp(i).toFixed(1)) + 4}" y="${PAD.top + 13}" font-size="10" fill="#6b7280" font-weight="600">${TH_MONTHS_S[m - 1]}</text>`;
  }).join('');

  // Trend line
  const xs = profits.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = profits.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (profits[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = den ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const trendColor = slope >= 0 ? 'var(--green)' : 'var(--red)';
  const ty0 = yp(intercept).toFixed(1), ty1 = yp(intercept + slope * (n - 1)).toFixed(1);
  const trendLine = `<line x1="${PAD.left}" y1="${ty0}" x2="${PAD.left + CW}" y2="${ty1}" stroke="${trendColor}" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.5"/>`;
  const trendPct = meanY ? ((slope * (n - 1)) / Math.abs(meanY) * 100).toFixed(1) : 0;
  const trendLabel = slope >= 0 ? `<tspan fill="var(--green)">▲ +${trendPct}%</tspan>` : `<tspan fill="var(--red)">▼ ${trendPct}%</tspan>`;

  const crosshair = `<line id="tc-cross" x1="0" y1="${PAD.top}" x2="0" y2="${PAD.top + CH}" stroke="#9ca3af" stroke-width="1" stroke-dasharray="4,3" opacity="0" pointer-events="none"/>`;

  el.innerHTML = `<div style="position:relative">
    <div class="chart-tooltip" id="chartTip"></div>
    <svg id="trendSvg" width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:inherit;overflow:visible;cursor:crosshair">
      ${yAxis}${zeroLine}${monthLabels}
      ${makeArea(incomes, '#00b14f')}${makeArea(profits, '#3b82f6')}
      ${trendLine}
      ${makePath(incomes, '#00b14f')}${makePath(profits, '#3b82f6')}${makePath(oils, '#e53e3e', true)}
      ${crosshair}
      ${makeDots(incomes, '#00b14f')}${makeDots(profits, '#3b82f6')}
      ${xLabels}
      <text x="${PAD.left}" y="${H - 2}" font-size="11" fill="#6b7280">Trend ${trendLabel} (กำไรสุทธิ 3 เดือน)</text>
      <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + CH}" stroke="#e5e7eb" stroke-width="1"/>
      <line x1="${PAD.left}" y1="${PAD.top + CH}" x2="${PAD.left + CW}" y2="${PAD.top + CH}" stroke="#e5e7eb" stroke-width="1"/>
    </svg>
  </div>`;

  // Tooltip on dots
  el.querySelectorAll('.chart-dot').forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      const tip = document.getElementById('chartTip');
      const svg = document.getElementById('trendSvg');
      if (!tip || !svg) return;
      const svgRect = svg.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const x = dotRect.left - svgRect.left + dotRect.width / 2;
      const y = dotRect.top  - svgRect.top  - 38;
      const [, m, d] = dot.dataset.date.split('-').map(Number);
      tip.innerHTML = `<span style="color:${dot.dataset.color}">●</span> ${d} ${TH_MONTHS_S[m - 1]}: <strong>${Number(dot.dataset.val).toLocaleString('th-TH', { minimumFractionDigits: 0 })} ฿</strong>`;
      tip.style.left = (x - tip.offsetWidth / 2) + 'px';
      tip.style.top  = y + 'px';
      tip.classList.add('show');
      dot.setAttribute('r', '6');
    });
    dot.addEventListener('mouseleave', () => {
      const tip = document.getElementById('chartTip');
      if (tip) tip.classList.remove('show');
      dot.setAttribute('r', '4');
    });
  });
}

// ─── GOAL ─────────────────────────────────────────────────────────────────────
function saveGoal() {
  if (isGuest()) { guestBlocked(); return; }
  const v = parseFloat(document.getElementById('goalInput').value);
  if (!v || v <= 0) { showToast('กรุณากรอกเป้าหมาย', 'red'); return; }
  localStorage.setItem('grab_goal', v);
  renderDashboard();
  showToast('🎯 บันทึกเป้าหมายแล้ว', 'green');
}

function renderGoal(rows) {
  const goal = parseFloat(localStorage.getItem('grab_goal')) || 0;
  const el = document.getElementById('goalContent');
  const inp = document.getElementById('goalInput');
  if (!el) return;
  const now = new Date();
  const thisMonthPfx = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthRows = rows.filter(r => r.date.startsWith(thisMonthPfx));
  const monthProfit = monthRows.reduce((s, r) => s + profit(r), 0);
  const workDays = monthRows.filter(isWorkDay).length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  if (!goal) {
    const hint = isGuest() ? 'ยังไม่มีการตั้งเป้าหมาย' : 'กรอกเป้าหมายด้านล่างเพื่อเริ่มติดตาม';
    el.innerHTML = `<div style="color:var(--text-muted);font-size:0.86rem;padding:8px 0">${hint}</div>
      <div style="font-size:0.83rem;color:var(--text-muted);margin-top:6px">เดือนนี้: <strong style="color:var(--green)">${fmt(monthProfit)} บาท</strong> (${workDays} วัน)</div>`;
    return;
  }
  if (inp) inp.value = inp.value || goal;
  const pct = Math.min((monthProfit / goal) * 100, 100);
  const over = monthProfit >= goal;
  const remaining = Math.max(goal - monthProfit, 0);
  const moName = TH_MONTHS_S[now.getMonth()];
  let needPerDay = !over && daysLeft > 0 ? `<div style="font-size:0.79rem;color:var(--text-muted);margin-top:4px">ต้องทำ <strong>${fmt(remaining / daysLeft)}</strong> บาท/วัน (${daysLeft} วันที่เหลือ)</div>` : '';

  const bikeLeft = Math.min(Math.max(pct, 4), 98);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
      <span style="font-size:0.85rem;color:var(--text-muted);font-weight:700">${moName} ${now.getFullYear() + 543}</span>
      <span style="font-size:0.86rem;font-weight:900;color:${over ? 'var(--yellow)' : 'var(--green)'}">${pct.toFixed(1)}%</span>
    </div>
    <div class="goal-track-container">
      <div class="goal-bike-rider" id="goalBike" style="left: 0%"><span class="bike-smoke">💨</span><span class="bike-body">🏍️</span></div>
      <div class="goal-bar-wrap">
        <div class="goal-bar-fill ${over ? 'over' : ''}" id="goalBar" style="width:0%"></div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);font-weight:600">
      <span>กำไร <strong style="color:var(--green)">${fmt(monthProfit)}</strong> บาท</span>
      <span>เป้า <strong>${fmt(goal)}</strong> บาท</span>
    </div>
    ${over
      ? `<div style="font-size:0.85rem;margin-top:8px;color:var(--yellow);font-weight:900">🎉 ถึงเป้าหมายแล้ว! ยอดเกิน ${fmt(monthProfit - goal)} บาท สุดยอดมากๆ!</div>`
      : `<div style="font-size:0.82rem;margin-top:6px;color:var(--text-muted)">ยังขาดอีก <strong style="color:var(--red)">${fmt(remaining)}</strong> บาท ${needPerDay}</div>`
    }`;

  setTimeout(() => {
    const bar = document.getElementById('goalBar');
    const bike = document.getElementById('goalBike');
    if (bar) bar.style.width = pct + '%';
    if (bike) bike.style.left = bikeLeft + '%';
    if (over) {
      launchCelebration();
      playVictoryFanfare();
    }
  }, 250);
}

// ─── WEEK COMPARE ─────────────────────────────────────────────────────────────
function renderWeekCompare(rows) {
  const el = document.getElementById('weekCompare');
  if (!el) return;
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now); monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1)); monday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7);
  const lastSunday = new Date(monday); lastSunday.setDate(monday.getDate() - 1);
  const toStr = d => d.toISOString().slice(0, 10);
  const thisWeek = rows.filter(r => r.date >= toStr(monday) && r.date <= toStr(now));
  const lastWeek = rows.filter(r => r.date >= toStr(lastMonday) && r.date <= toStr(lastSunday));
  const thisP = thisWeek.reduce((s, r) => s + profit(r), 0);
  const lastP = lastWeek.reduce((s, r) => s + profit(r), 0);
  const thisI = thisWeek.reduce((s, r) => s + income(r), 0);
  const lastI = lastWeek.reduce((s, r) => s + income(r), 0);
  const diffP = thisP - lastP;
  const diffPct = lastP ? ((diffP / Math.abs(lastP)) * 100).toFixed(1) : null;
  const diffClass = diffP > 0 ? 'up' : diffP < 0 ? 'down' : 'flat';
  const diffIcon = diffP > 0 ? '▲' : diffP < 0 ? '▼' : '–';
  const diffLabel = diffPct !== null ? `${diffIcon} ${Math.abs(diffPct)}%` : `${diffIcon} ${fmt(Math.abs(diffP))} บาท`;

  el.innerHTML = `
    <div class="week-grid">
      <div class="week-col">
        <div class="week-col-title">สัปดาห์นี้</div>
        <div class="week-col-val" style="color:var(--green)" id="wkThis">—</div>
        <div style="font-size:0.77rem;color:var(--text-muted);margin-top:2px">รายได้ ${fmt(thisI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--text-muted)">${thisWeek.filter(isWorkDay).length} วันทำงาน</div>
      </div>
      <div class="week-col">
        <div class="week-col-title">สัปดาห์ที่แล้ว</div>
        <div class="week-col-val" style="color:var(--text-muted)" id="wkLast">—</div>
        <div style="font-size:0.77rem;color:var(--text-muted);margin-top:2px">รายได้ ${fmt(lastI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--text-muted)">${lastWeek.filter(isWorkDay).length} วันทำงาน</div>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="week-diff ${diffClass}">${diffLabel}</span>
      <span style="font-size:0.79rem;color:var(--text-muted)">เทียบกำไรสุทธิ</span>
    </div>`;
  setTimeout(() => {
    animateCount(document.getElementById('wkThis'), thisP, 600);
    animateCount(document.getElementById('wkLast'), lastP, 600);
  }, 100);
}

// ─── MONTH COMPARE ─────────────────────────────────────────────────────────────
function renderMonthCompare(rows) {
  const el = document.getElementById('monthCompare');
  if (!el) return;
  const now = new Date();
  function localMonthPfx(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  const thisMonthPfx = localMonthPfx(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPfx = localMonthPfx(lastMonthDate);

  const thisMonth = rows.filter(r => r.date.startsWith(thisMonthPfx));
  const lastMonth  = rows.filter(r => r.date.startsWith(lastMonthPfx));

  const thisP = thisMonth.reduce((s, r) => s + profit(r), 0);
  const lastP = lastMonth.reduce((s, r) => s + profit(r), 0);
  const thisI = thisMonth.reduce((s, r) => s + income(r), 0);
  const lastI = lastMonth.reduce((s, r) => s + income(r), 0);

  const diffP = thisP - lastP;
  const diffPct = lastP ? ((diffP / Math.abs(lastP)) * 100).toFixed(1) : null;
  const diffClass = diffP > 0 ? 'up' : diffP < 0 ? 'down' : 'flat';
  const diffIcon = diffP > 0 ? '▲' : diffP < 0 ? '▼' : '–';
  const diffLabel = diffPct !== null ? `${diffIcon} ${Math.abs(diffPct)}%` : `${diffIcon} ${fmt(Math.abs(diffP))} บาท`;

  const thisName = `${TH_MONTHS_S[now.getMonth()]} ${now.getFullYear() + 543}`;
  const lastName = `${TH_MONTHS_S[lastMonthDate.getMonth()]} ${lastMonthDate.getFullYear() + 543}`;

  el.innerHTML = `
    <div class="week-grid">
      <div class="week-col">
        <div class="week-col-title">${thisName}</div>
        <div class="week-col-val" style="color:var(--green)" id="moThis">—</div>
        <div style="font-size:0.77rem;color:var(--text-muted);margin-top:2px">รายได้ ${fmt(thisI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--text-muted)">${thisMonth.filter(isWorkDay).length} วันทำงาน</div>
      </div>
      <div class="week-col">
        <div class="week-col-title">${lastName}</div>
        <div class="week-col-val" style="color:var(--text-muted)" id="moLast">—</div>
        <div style="font-size:0.77rem;color:var(--text-muted);margin-top:2px">รายได้ ${fmt(lastI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--text-muted)">${lastMonth.filter(isWorkDay).length} วันทำงาน</div>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="week-diff ${diffClass}">${diffLabel}</span>
      <span style="font-size:0.79rem;color:var(--text-muted)">เทียบกำไรสุทธิ</span>
    </div>`;
  setTimeout(() => {
    animateCount(document.getElementById('moThis'), thisP, 600);
    animateCount(document.getElementById('moLast'), lastP, 600);
  }, 100);
}

// ─── DOW CHART ────────────────────────────────────────────────────────────────
function renderDowChart(rows) {
  const el = document.getElementById('dowChart');
  if (!el) return;
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  rows.filter(isWorkDay).forEach(r => {
    const dow = new Date(r.date + 'T00:00:00').getDay();
    sums[dow] += profit(r);
    counts[dow]++;
  });
  const avgs = sums.map((s, i) => counts[i] ? s / counts[i] : 0);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const maxAvg = Math.max(...avgs, 1);
  const bestDow = order.reduce((best, d) => avgs[d] > avgs[best] ? d : best, 1);

  el.innerHTML = `<div class="dow-grid">
    ${order.map(d => {
      const avg = avgs[d];
      const pct = maxAvg ? Math.max((avg / maxAvg) * 88, 3) : 3;
      const isBest = d === bestDow && avg > 0;
      return `<div class="dow-col" title="${TH_DOWS[d]}: เฉลี่ย ${fmt(avg)} บาท (${counts[d]} วัน)">
        <div class="dow-bar-wrap">
          <div class="dow-bar ${isBest ? 'best' : ''}" style="height:${pct}px"></div>
        </div>
        <div class="dow-label">${TH_DOWS[d]}</div>
        <div class="dow-val">${avg > 0 ? Math.round(avg) : '—'}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── HISTORY TABLE ────────────────────────────────────────────────────────────
function renderHistory() {
  let rows = getRows();
  const monthFilterEl = document.getElementById('filterMonth');
  const typeFilterEl  = document.getElementById('filterType');
  const monthFilter   = monthFilterEl ? monthFilterEl.value : '';
  const typeFilter    = typeFilterEl  ? typeFilterEl.value  : 'all';

  if (monthFilter) rows = rows.filter(r => r.date.startsWith(monthFilter));
  if (typeFilter === 'work') rows = rows.filter(isWorkDay);
  if (typeFilter === 'rest' || typeFilter === 'off') rows = rows.filter(r => !isWorkDay(r));

  const guest = isGuest();
  const colCount = guest ? 11 : 12;
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colCount}"><div class="empty"><div class="empty-icon">📋</div><p>ไม่มีข้อมูล</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.slice().reverse().map((r, i) => {
    const p = profit(r);
    const isW = isWorkDay(r);
    const actionsCell = guest ? '' : `<td style="display:flex;gap:4px;padding:8px">
        <button class="btn btn-outline btn-sm" onclick="addRipple(event);openEdit('${r.id}')" title="แก้ไข">✏️</button>
        <button class="btn btn-red btn-sm" onclick="addRipple(event);requireAuth(()=>deleteRow('${r.id}'))" title="ลบ">🗑️</button>
      </td>`;
    return `<tr class="row-anim" style="animation-delay:${Math.min(i * 0.015, 0.3)}s; ${isW ? '' : 'opacity:0.75'}">
      <td class="td-date">${fmtDate(r.date)}</td>
      <td class="td-num">${r.grab ? fmt(r.grab) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.tip ? fmt(r.tip) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num td-green font-bold">${fmt(income(r))}</td>
      <td class="td-num td-red">${r.oil ? fmt(r.oil) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.oilReal ? fmt(r.oilReal) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.credit ? fmt(r.credit) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.withdraw ? fmt(r.withdraw) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.hours ? fmtHoursShort(r.hours) : '<span class="td-gray">—</span>'}</td>
      <td class="td-num"><strong class="${p >= 0 ? 'td-green' : 'td-red'}">${fmt(p)}</strong></td>
      <td class="note-cell" title="${r.note || ''}">${r.note || '<span class="td-gray">—</span>'}</td>
      ${actionsCell}
    </tr>`;
  }).join('');
}

// ─── MONTHLY REPORT ──────────────────────────────────────────────────────────
function renderMonthly() {
  const rows = getRows();
  const container = document.getElementById('monthlyContent');
  if (!container) return;

  const byMonth = {};
  rows.forEach(r => {
    const m = r.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(r);
  });

  const months = Object.keys(byMonth).sort().reverse();
  if (!months.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">📅</div><p>ยังไม่มีข้อมูล</p></div>`;
    return;
  }

  container.innerHTML = months.map((m, mi) => {
    const mrs = byMonth[m];
    const workDays = mrs.filter(isWorkDay).length;
    const totGrab = mrs.reduce((s, r) => s + (r.grab || 0), 0);
    const totTip = mrs.reduce((s, r) => s + (r.tip || 0), 0);
    const totIncome = mrs.reduce((s, r) => s + income(r), 0);
    const totOil = mrs.reduce((s, r) => s + (r.oil || 0), 0);
    const totOilReal = mrs.reduce((s, r) => s + (r.oilReal || 0), 0);
    const totCredit = mrs.reduce((s, r) => s + (r.credit || 0), 0);
    const totWithdraw = mrs.reduce((s, r) => s + (r.withdraw || 0), 0);
    const totProfit = mrs.reduce((s, r) => s + profit(r), 0);
    const totHours = mrs.reduce((s, r) => s + (r.hours || 0), 0);
    const avgP = workDays ? totProfit / workDays : 0;
    const [yr, mo] = m.split('-').map(Number);
    const monthName = `${TH_MONTHS[mo - 1]} ${yr + 543}`;

    return `
      <div class="month-section" style="animation:rowIn 0.4s ${mi * 0.08}s ease both">
        <div class="month-header">
          <div class="month-title">📅 ${monthName}</div>
          <div class="month-stats">
            <span>ทำงาน: <strong>${workDays} วัน</strong></span>
            <span>ชั่วโมง: <strong>${fmtHours(totHours)}</strong></span>
            <span>กำไรเฉลี่ย: <strong>${fmt(avgP)} ฿/วัน</strong></span>
            <span>กำไรสุทธิ: <strong style="color:var(--green)">${fmt(totProfit)} ฿</strong></span>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:18px;">
          <div class="table-wrap">
            <table style="font-size:0.84rem">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th class="td-num">รายได้ Grab</th>
                  <th class="td-num">Tip</th>
                  <th class="td-num">รายได้รวม</th>
                  <th class="td-num">ค่าน้ำมัน</th>
                  <th class="td-num">เติมน้ำมันจริง</th>
                  <th class="td-num">เครดิต Grab</th>
                  <th class="td-num">ถอนกรุงศรี</th>
                  <th class="td-num">ชั่วโมงขับ</th>
                  <th class="td-num">กำไรสุทธิ</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${mrs.map(r => `
                  <tr>
                    <td class="td-date">${fmtDate(r.date)}</td>
                    <td class="td-num">${r.grab ? fmt(r.grab) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num">${r.tip ? fmt(r.tip) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num td-green">${fmt(income(r))}</td>
                    <td class="td-num td-red">${r.oil ? fmt(r.oil) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num">${r.oilReal ? fmt(r.oilReal) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num">${r.credit ? fmt(r.credit) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num">${r.withdraw ? fmt(r.withdraw) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num">${r.hours ? fmtHoursShort(r.hours) : '<span class="td-gray">—</span>'}</td>
                    <td class="td-num"><strong class="${profit(r) >= 0 ? 'td-green' : 'td-red'}">${fmt(profit(r))}</strong></td>
                    <td class="note-cell">${r.note || '—'}</td>
                  </tr>
                `).join('')}
                <tr style="background:var(--green-light);font-weight:800;">
                  <td>รวม ${monthName}</td>
                  <td class="td-num">${fmt(totGrab)}</td>
                  <td class="td-num">${fmt(totTip)}</td>
                  <td class="td-num td-green">${fmt(totIncome)}</td>
                  <td class="td-num td-red">${fmt(totOil)}</td>
                  <td class="td-num">${fmt(totOilReal)}</td>
                  <td class="td-num">${fmt(totCredit)}</td>
                  <td class="td-num">${fmt(totWithdraw)}</td>
                  <td class="td-num">${fmtHoursShort(totHours)}</td>
                  <td class="td-num td-green">${fmt(totProfit)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── BONUS REPORT (อินพิเศษ/อินเพชร) ──────────────────────────────────────────
function extractBonuses(note) {
  if (!note) return [];
  const results = [];
  const re = /(อินเพชร|อินพิเศษ)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/g;
  let m;
  while ((m = re.exec(note)) !== null) {
    const type = m[1] === 'อินเพชร' ? 'diamond' : 'special';
    const amount = parseFloat(m[2].replace(',', ''));
    if (!isNaN(amount)) results.push({ type, amount });
  }
  return results;
}

function getBonusGroups(rows) {
  const groups = [];
  rows.forEach(r => {
    const bs = extractBonuses(r.note);
    if (!bs.length) return;
    const diamond = bs.filter(b => b.type === 'diamond').reduce((s, b) => s + b.amount, 0);
    const special = bs.filter(b => b.type === 'special').reduce((s, b) => s + b.amount, 0);
    groups.push({ date: r.date, diamond, special, note: r.note, rowId: r.id });
  });
  return groups.sort((a, b) => a.date.localeCompare(b.date));
}

function renderBonus() {
  const rows = getRows();
  const groups = getBonusGroups(rows);
  const filterTypeEl = document.getElementById('bonusFilterType');
  const filterType = filterTypeEl ? filterTypeEl.value : 'all';

  const totalDiamond = groups.reduce((s, g) => s + g.diamond, 0);
  const totalSpecial = groups.reduce((s, g) => s + g.special, 0);
  const daysDiamond = groups.filter(g => g.diamond > 0).length;
  const daysSpecial = groups.filter(g => g.special > 0).length;
  const totalAll = totalDiamond + totalSpecial;

  const summaryCards = [
    { label: '💎 อินเพชรรวม', val: totalDiamond, cls: 'blue', color: 'blue', sub: `${daysDiamond} วัน` },
    { label: '⭐ อินพิเศษรวม', val: totalSpecial, cls: 'yellow', color: 'yellow', sub: `${daysSpecial} วัน` },
    { label: '💰 รวมทั้งหมด', val: totalAll, cls: '', color: 'green', sub: `${groups.length} วัน` },
  ];

  const summaryEl = document.getElementById('bonusSummary');
  if (summaryEl) {
    summaryEl.innerHTML = summaryCards.map((c, i) => `
      <div class="stat-card ${c.cls}" style="animation:rowIn 0.35s ${i * 0.05}s ease both">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value ${c.color}" id="bsv${i}">0</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`).join('');
    requestAnimationFrame(() => {
      summaryCards.forEach((c, i) => {
        const el = document.getElementById('bsv' + i);
        if (el) setTimeout(() => animateCount(el, c.val, 700 + i * 30), i * 40);
      });
    });
  }

  let filtered = groups;
  if (filterType === 'diamond') filtered = groups.filter(g => g.diamond > 0);
  if (filterType === 'special') filtered = groups.filter(g => g.special > 0);
  filtered = filtered.slice().reverse();

  const tbody = document.getElementById('bonusBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="empty-icon">💎</div><p>ยังไม่มีวันที่ได้อินพิเศษ/อินเพชร<br>พิมพ์คำว่า "อินเพชร 80" หรือ "อินพิเศษ 50" ในช่องหมายเหตุ</p></div></td></tr>`;
    return;
  }

  const showDiamond = filterType !== 'special';
  const showSpecial = filterType !== 'diamond';

  tbody.innerHTML = filtered.map((g, i) => {
    let badges = '';
    if (showDiamond && g.diamond > 0) badges += `<span class="bonus-type-badge diamond">💎 อินเพชร</span> `;
    if (showSpecial && g.special > 0) badges += `<span class="bonus-type-badge special">⭐ อินพิเศษ</span> `;

    const dAmt = showDiamond ? g.diamond : 0;
    const sAmt = showSpecial ? g.special : 0;

    let amountHtml;
    if (dAmt > 0 && sAmt > 0) {
      amountHtml = `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">
        <span style="color:#1d6fd1;font-weight:800">💎 ${fmt(dAmt)}</span>
        <span style="color:#a5710a;font-weight:800">⭐ ${fmt(sAmt)}</span>
        <span class="td-green" style="font-size:0.78rem;font-weight:900;border-top:1px solid var(--border-color);padding-top:2px;margin-top:1px">รวม ${fmt(dAmt + sAmt)}</span>
      </div>`;
    } else {
      amountHtml = `<strong class="td-green">${fmt(dAmt + sAmt)}</strong>`;
    }

    return `<tr class="row-anim" style="animation-delay:${Math.min(i * 0.02, 0.3)}s">
      <td class="td-date">${fmtDate(g.date)}</td>
      <td><div style="display:flex;flex-wrap:wrap;gap:5px">${badges}</div></td>
      <td class="td-num">${amountHtml}</td>
      <td class="note-cell">${g.note}</td>
    </tr>`;
  }).join('');
}

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────
function openEdit(id) {
  if (isGuest()) { guestBlocked(); return; }
  const rows = loadData();
  const r = rows.find(x => x.id === id);
  if (!r) return;
  editingId = id;
  tdpSetValue('e-date', r.date);
  document.getElementById('e-grab').value     = r.grab || '';
  document.getElementById('e-tip').value      = r.tip || '';
  document.getElementById('e-oil').value      = r.oil || '';
  document.getElementById('e-oilReal').value  = r.oilReal || '';
  document.getElementById('e-credit').value   = r.credit || '';
  document.getElementById('e-withdraw').value = r.withdraw || '';
  document.getElementById('e-hours').value    = (r.hours !== null && r.hours !== undefined) ? r.hours : '';
  document.getElementById('e-note').value      = r.note || '';
  document.getElementById('editModal').classList.add('show');
}
const openEditModal = openEdit;

function closeModal() {
  document.getElementById('editModal').classList.remove('show');
  editingId = null;
}
const closeEditModal = closeModal;

async function saveEdit() {
  if (!editingId || isGuest()) return;
  const date = document.getElementById('e-date').value;
  if (!date) { showToast('กรุณาเลือกวันที่', 'red'); return; }
  const hoursVal = document.getElementById('e-hours').value;
  const row = {
    id: editingId, date,
    grab:     parseFloat(document.getElementById('e-grab').value) || 0,
    tip:      parseFloat(document.getElementById('e-tip').value) || 0,
    oil:      parseFloat(document.getElementById('e-oil').value) || 0,
    oilReal:  parseFloat(document.getElementById('e-oilReal').value) || 0,
    credit:   parseFloat(document.getElementById('e-credit').value) || 0,
    withdraw: parseFloat(document.getElementById('e-withdraw').value) || 0,
    hours:    hoursVal ? parseFloat(hoursVal) : null,
    note: document.getElementById('e-note').value.trim(),
  };
  closeModal();
  showToast('💾 กำลังบันทึกการแก้ไข...');
  const success = await saveRow(row);
  if (success) {
    renderDashboard();
    renderHistory();
    renderMonthly();
    renderBonus();
    showToast('✅ แก้ไขสำเร็จ', 'green');
  } else {
    showToast('⚠️ ไม่สามารถบันทึกการแก้ไขไปยัง Sheets ได้', 'red');
  }
}

function deleteRow(id) {
  if (isGuest()) { guestBlocked(); return; }
  pinAction = { type: 'deleteRow', id }; pinBuffer = ''; updatePinDots();
  document.getElementById('pinMsg').textContent = '';
  document.getElementById('pinTitle').textContent = '🗑️ ยืนยันการลบรายการ';
  document.getElementById('pinModal').classList.add('show');
}
const deleteRowPrompt = deleteRow;

// ─── IMPORT EXCEL ─────────────────────────────────────────────────────────────
function excelSerialToDateStr(serial) {
  const utc = (serial - 25569) * 86400000;
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function parseDateVal(v) {
  if (!v) return null;
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  if (typeof v === 'number' && v > 1000) return excelSerialToDateStr(v);
  if (typeof v === 'string') { const m = v.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; }
  return null;
}

let pendingImportData = null;

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportData() {
  const rows = getRows();
  const ws_data = [['วันที่', 'รายได้ Grab (บาท)', 'Tip มือ (บาท)', 'รายได้รวม (บาท)', 'ค่าน้ำมัน (บาท)', 'เติมน้ำมันจริง (บาท)', 'เครดิต Grab (บาท)', 'ถอนเข้ากรุงศรี (บาท)', 'ชั่วโมงขับ', 'กำไรสุทธิ (บาท)', 'หมายเหตุ'],
    ...rows.map(r => [r.date, r.grab || 0, r.tip || 0, income(r), r.oil || 0, r.oilReal || 0, r.credit || 0, r.withdraw || 0, r.hours || '', profit(r), r.note || ''])];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws_data), 'บัญชีรายวัน');
  XLSX.writeFile(wb, `Grab_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast('📤 Export สำเร็จ', 'green');
}

// ─── THAI DATE PICKER ─────────────────────────────────────────────────────────
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DOWS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TDP = {};

function tdpOpen(fieldId) {
  document.querySelectorAll('.tdp-pop.show').forEach(p => { if (p.id !== fieldId + '-pop') p.classList.remove('show'); });
  const pop = document.getElementById(fieldId + '-pop');
  if (!pop) return;
  if (pop.classList.contains('show')) { pop.classList.remove('show'); return; }
  const val = document.getElementById(fieldId).value;
  const now = new Date(); let y = now.getFullYear(), m = now.getMonth();
  if (val) { const d = new Date(val + 'T00:00:00'); y = d.getFullYear(); m = d.getMonth(); }
  TDP[fieldId] = { year: y, month: m, mode: 'day' };
  tdpRender(fieldId); pop.classList.add('show');
  const btn = document.getElementById(fieldId + '-btn');
  if (btn) btn.classList.add('open');
  setTimeout(() => {
    function outside(e) {
      const b = document.getElementById(fieldId + '-btn');
      const popEl = document.getElementById(fieldId + '-pop');
      if (b && !b.contains(e.target) && popEl && !popEl.contains(e.target)) {
        popEl.classList.remove('show'); b.classList.remove('open');
        document.removeEventListener('mousedown', outside);
      }
    }
    document.addEventListener('mousedown', outside);
  }, 0);
}

function tdpRender(fieldId) {
  const state = TDP[fieldId];
  const pop = document.getElementById(fieldId + '-pop');
  if (!pop) return;
  const selectedVal = document.getElementById(fieldId).value;
  const todayStr = new Date().toISOString().slice(0, 10);

  if (state.mode === 'day') {
    const firstDay = new Date(state.year, state.month, 1).getDay();
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < firstDay; i++) cells += '<div class="tdp-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${state.year}-${String(state.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cls = ['tdp-day', ds === selectedVal ? 'selected' : '', ds === todayStr && ds !== selectedVal ? 'today' : ''].join(' ');
      cells += `<div class="${cls}" onclick="tdpSelect('${fieldId}','${ds}')">${d}</div>`;
    }
    pop.innerHTML = `<div class="tdp-head">
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="tdpNav('${fieldId}',-1)">◀</button>
      <span class="tdp-title" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].mode='month';tdpRender('${fieldId}')">${TH_MONTHS[state.month]} ${state.year + 543}</span>
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="tdpNav('${fieldId}',1)">▶</button>
    </div>
    <div class="tdp-grid">${TH_DOWS.map(d => `<div class="tdp-dow">${d}</div>`).join('')}${cells}</div>`;
  } else if (state.mode === 'month') {
    const items = TH_MONTHS_S.map((m, i) => `<div class="tdp-sel-item${i === state.month ? ' selected' : ''}" onclick="TDP['${fieldId}'].month=${i};TDP['${fieldId}'].mode='day';tdpRender('${fieldId}')">${m}</div>`).join('');
    pop.innerHTML = `<div class="tdp-head">
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year--;tdpRender('${fieldId}')">◀</button>
      <span class="tdp-title" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].mode='year';tdpRender('${fieldId}')">${state.year + 543}</span>
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year++;tdpRender('${fieldId}')">▶</button>
    </div><div class="tdp-sel-grid">${items}</div>`;
  } else {
    const base = state.year - 5;
    const items = Array.from({ length: 12 }, (_, i) => base + i).map(y => `<div class="tdp-sel-item${y === state.year ? ' selected' : ''}" onclick="TDP['${fieldId}'].year=${y};TDP['${fieldId}'].mode='month';tdpRender('${fieldId}')">${y + 543}</div>`).join('');
    pop.innerHTML = `<div class="tdp-head">
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year-=12;tdpRender('${fieldId}')">◀</button>
      <span class="tdp-title">เลือกปี</span>
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year+=12;tdpRender('${fieldId}')">▶</button>
    </div><div class="tdp-sel-grid">${items}</div>`;
  }
}

function tdpNav(fieldId, dir) {
  const s = TDP[fieldId]; s.month += dir;
  if (s.month > 11) { s.month = 0; s.year++; }
  if (s.month < 0)  { s.month = 11; s.year--; }
  tdpRender(fieldId);
}
function tdpSelect(fieldId, dateStr) {
  document.getElementById(fieldId).value = dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const btn = document.getElementById(fieldId + '-btn');
  if (btn) {
    btn.textContent = `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
    btn.classList.remove('placeholder', 'open');
  }
  const pop = document.getElementById(fieldId + '-pop');
  if (pop) pop.classList.remove('show');
  if (fieldId === 'f-date') updatePreview();
}
function tdpSetValue(fieldId, dateStr) {
  if (!dateStr) return;
  const el = document.getElementById(fieldId);
  if (el) el.value = dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const btn = document.getElementById(fieldId + '-btn');
  if (btn) {
    btn.textContent = `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
    btn.classList.remove('placeholder');
  }
}

// ─── MONTH PICKER ─────────────────────────────────────────────────────────────
function tdpOpenMonth(fieldId) {
  document.querySelectorAll('.tdp-pop.show').forEach(p => p.classList.remove('show'));
  const pop = document.getElementById(fieldId + '-pop');
  if (!pop) return;
  pop.onmousedown = e => e.stopPropagation();
  const val = document.getElementById(fieldId).value;
  const now = new Date(); let y = now.getFullYear(), m = now.getMonth();
  if (val) { const [vy, vm] = val.split('-'); y = parseInt(vy); m = parseInt(vm) - 1; }
  TDP[fieldId] = { year: y, month: m, mode: 'monthYear' };
  tdpRenderMonth(fieldId); pop.classList.add('show');
  setTimeout(() => {
    function outside(e) {
      const btn = document.getElementById(fieldId + '-btn');
      const popEl = document.getElementById(fieldId + '-pop');
      if (btn && !btn.contains(e.target) && popEl && !popEl.contains(e.target)) {
        popEl.classList.remove('show'); btn.classList.remove('open');
        document.removeEventListener('mousedown', outside);
      }
    }
    document.addEventListener('mousedown', outside);
  }, 0);
}
function tdpRenderMonth(fieldId) {
  const state = TDP[fieldId];
  const pop = document.getElementById(fieldId + '-pop');
  if (!pop) return;
  const selVal = document.getElementById(fieldId).value;
  const items = TH_MONTHS_S.map((mn, i) => {
    const v = `${state.year}-${String(i + 1).padStart(2, '0')}`;
    return `<div class="tdp-sel-item${v === selVal ? ' selected' : ''}" onclick="tdpSelectMonth('${fieldId}','${v}',${i})">${mn}</div>`;
  }).join('');
  pop.innerHTML = `<div class="tdp-head">
    <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year--;tdpRenderMonth('${fieldId}')">◀</button>
    <span class="tdp-title">${state.year + 543}</span>
    <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year++;tdpRenderMonth('${fieldId}')">▶</button>
  </div><div class="tdp-sel-grid">${items}</div>`;
}
function tdpSelectMonth(fieldId, val, monthIdx) {
  document.getElementById(fieldId).value = val;
  const [y] = val.split('-');
  const btn = document.getElementById(fieldId + '-btn');
  if (btn) {
    btn.textContent = `${TH_MONTHS_S[monthIdx]} ${parseInt(y) + 543}`;
    btn.classList.remove('placeholder', 'open');
  }
  const pop = document.getElementById(fieldId + '-pop');
  if (pop) pop.classList.remove('show');
  renderHistory();
}
function clearMonthFilter() {
  document.getElementById('filterMonth').value = '';
  const btn = document.getElementById('filterMonth-btn');
  if (btn) {
    btn.textContent = 'ทุกเดือน';
    btn.classList.add('placeholder');
  }
  const fType = document.getElementById('filterType');
  if (fType) fType.value = 'all';
  renderHistory();
}

// ─── PIN AUTH ─────────────────────────────────────────────────────────────────
const PIN_CORRECT = '120946';
let pinBuffer = '', pinAction = null;
function isAuthed() { return sessionStorage.getItem('grab_authed') === '1'; }
function setAuthed() { sessionStorage.setItem('grab_authed', '1'); updateAuthUI(); }
function clearAuthed() { sessionStorage.removeItem('grab_authed'); updateAuthUI(); }
function updateAuthUI() {
  const btn = document.getElementById('lockBtn'); if (!btn) return;
  btn.textContent = isAuthed() ? '🔓 ล็อค' : '🔒 ปลดล็อค';
  btn.title = isAuthed() ? 'กดเพื่อล็อคการแก้ไข' : 'กดเพื่อปลดล็อคการแก้ไข';
}
function requireAuth(callback) {
  if (isGuest()) { guestBlocked(); return; }
  if (isAuthed()) { callback(); return; }
  pinAction = { type: 'auth', callback }; pinBuffer = ''; updatePinDots();
  document.getElementById('pinMsg').textContent = '';
  document.getElementById('pinTitle').textContent = '🔐 กรอกรหัสเพื่อแก้ไขข้อมูล';
  document.getElementById('pinModal').classList.add('show');
}
function clearAllConfirm() {
  if (isGuest()) { guestBlocked(); return; }
  pinAction = { type: 'clearAll' }; pinBuffer = ''; updatePinDots();
  document.getElementById('pinMsg').textContent = '';
  document.getElementById('pinTitle').textContent = '🗑️ ยืนยันการล้างข้อมูลทั้งหมด';
  document.getElementById('pinModal').classList.add('show');
}
function closePinModal() {
  pinBuffer = ''; updatePinDots();
  document.getElementById('pinMsg').textContent = '';
  document.getElementById('pinModal').classList.remove('show');
}
function pinKey(k) {
  if (k === 'del') { pinBuffer = pinBuffer.slice(0, -1); updatePinDots(); document.getElementById('pinMsg').textContent = ''; return; }
  if (pinBuffer.length >= 6) return;
  pinBuffer += k; updatePinDots();
  if (pinBuffer.length === 6) {
    if (pinBuffer === PIN_CORRECT) {
      closePinModal();
      if (pinAction?.type === 'auth') {
        setAuthed(); showToast('🔓 ปลดล็อคแล้ว', 'green');
        const cb = pinAction.callback; pinAction = null; if (cb) cb();
      } else if (pinAction?.type === 'clearAll') {
        showToast('🗑️ กำลังล้างข้อมูล...');
        saveAllRemote([]).then(() => {
          localStorage.removeItem(STORAGE_KEY);
          renderDashboard();
          renderHistory();
          renderMonthly();
          renderBonus();
          showToast('🗑️ ล้างข้อมูลแล้ว');
        });
        pinAction = null;
      } else if (pinAction?.type === 'deleteRow') {
        showToast('🗑️ กำลังลบ...');
        deleteRowRemote(pinAction.id).then(() => {
          renderDashboard();
          renderHistory();
          renderMonthly();
          renderBonus();
          showToast('🗑️ ลบแล้ว');
        });
        pinAction = null;
      }
    } else {
      document.querySelectorAll('.pin-dot').forEach(d => d.classList.add('error'));
      document.getElementById('pinMsg').textContent = '❌ รหัสไม่ถูกต้อง';
      setTimeout(() => {
        pinBuffer = ''; updatePinDots();
        document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('error'));
        document.getElementById('pinMsg').textContent = '';
      }, 1000);
    }
  }
}
function updatePinDots() {
  for (let i = 0; i < 6; i++) {
    const dot = document.getElementById('pd' + i);
    if (dot) {
      dot.classList.toggle('filled', i < pinBuffer.length);
      dot.classList.remove('error');
    }
  }
}

// ─── MISC ─────────────────────────────────────────────────────────────────────
async function manualSync() {
  showToast('🔄 กำลัง sync...');
  const success = await syncFromSheets();
  renderDashboard();
  renderHistory();
  renderMonthly();
  renderBonus();
  if (success) {
    showToast('✅ Sync สำเร็จ', 'green');
  } else {
    showToast('⚠️ Sync ไม่สำเร็จ (ออฟไลน์)', 'red');
  }
}
function toggleLock() {
  if (isGuest()) { guestBlocked(); return; }
  if (isAuthed()) {
    clearAuthed(); showToast('🔒 ล็อคแล้ว');
  } else {
    pinAction = { type: 'auth', callback: null }; pinBuffer = ''; updatePinDots();
    document.getElementById('pinMsg').textContent = '';
    document.getElementById('pinTitle').textContent = '🔐 กรอกรหัสเพื่อปลดล็อค';
    document.getElementById('pinModal').classList.add('show');
  }
}

// ─── APP INIT ─────────────────────────────────────────────────────────────────
let appInitialized = false;
function initApp() {
  applyTheme(getStoredTheme());
  updateSoundUI();
  if (appInitialized) return;
  appInitialized = true;
  populateHoursSelect('f-hours');
  populateHoursSelect('e-hours');
  ['f-grab', 'f-tip', 'f-oil'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePreview);
  });
  document.getElementById('importFile').addEventListener('change', function(e) {
    if (isGuest()) { guestBlocked(); e.target.value = ''; return; }
    const file = e.target.files[0]; if (!file) return; e.target.value = '';
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: false });
        function isDateSerial(v) { return typeof v === 'number' && v > 40000; }
        function isDateString(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v); }
        function isDateCell(v)   { return isDateSerial(v) || isDateString(v); }
        let raw = null;
        for (const name of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null });
          if (rows.some(r => r && isDateCell(r[0]))) { raw = rows; break; }
        }
        if (!raw) { showToast('ไม่พบข้อมูลวันที่ในไฟล์', 'red'); return; }
        const firstDataRow = raw.findIndex(r => r && isDateCell(r[0]));
        if (firstDataRow < 0) { showToast('ไม่พบข้อมูล', 'red'); return; }
        const headerRow = firstDataRow > 0 ? raw[firstDataRow - 1] : null;
        const headers = (headerRow || []).map(h => h ? String(h) : '');
        function colOf(kws) { for (const kw of kws) { const i = headers.findIndex(h => h.includes(kw)); if (i >= 0) return i; } return -1; }
        const cGrab     = colOf(['Grab']) >= 0 ? colOf(['Grab']) : 1;
        const cTip      = colOf(['Tip', 'tip']) >= 0 ? colOf(['Tip', 'tip']) : 2;
        const cOil      = colOf(['ค่าน้ำมัน']) >= 0 ? colOf(['ค่าน้ำมัน']) : 4;
        const cOilReal  = colOf(['เติมน้ำมันจริง']) >= 0 ? colOf(['เติมน้ำมันจริง']) : 5;
        const cCredit   = colOf(['เครดิต']) >= 0 ? colOf(['เครดิต']) : 6;
        const cWithdraw = colOf(['ถอน']) >= 0 ? colOf(['ถอน']) : 7;
        const cHours    = colOf(['ชั่วโมง']);
        const cNote     = colOf(['หมายเหตุ', 'note']) >= 0 ? colOf(['หมายเหตุ', 'note']) : 9;
        const parsed = [];
        for (let i = firstDataRow; i < raw.length; i++) {
          const row = raw[i]; if (!row) continue;
          const dateStr = parseDateVal(row[0]); if (!dateStr) continue;
          parsed.push({
            id: newId(), date: dateStr,
            grab:     parseFloat(row[cGrab]) || 0,
            tip:      parseFloat(row[cTip]) || 0,
            oil:      parseFloat(row[cOil]) || 0,
            oilReal:  parseFloat(row[cOilReal]) || 0,
            credit:   parseFloat(row[cCredit]) || 0,
            withdraw: parseFloat(row[cWithdraw]) || 0,
            hours:    cHours >= 0 && row[cHours] ? parseFloat(row[cHours]) || null : null,
            note:     cNote >= 0 && row[cNote] ? String(row[cNote]).trim() : ''
          });
        }
        if (!parsed.length) { showToast('ไม่พบข้อมูล', 'red'); return; }
        pendingImportData = parsed;
        document.getElementById('importCount').textContent = parsed.length;
        document.getElementById('importModal').classList.add('show');
      } catch (err) { showToast('เกิดข้อผิดพลาด: ' + err.message, 'red'); console.error(err); }
    };
    reader.readAsArrayBuffer(file);
  });

  tdpSetValue('f-date', new Date().toISOString().slice(0, 10));
  updateAuthUI();
  renderDashboard();
  renderHistory();
  renderMonthly();
  renderBonus();
  syncFromSheets().then(() => {
    renderDashboard();
    renderHistory();
    renderMonthly();
    renderBonus();
    applyRoleUI();
  });
}

async function doImport(replaceAll) {
  if (isGuest()) { guestBlocked(); document.getElementById('importModal').classList.remove('show'); return; }
  document.getElementById('importModal').classList.remove('show');
  if (!pendingImportData) return;
  const base = replaceAll ? [] : loadData();
  const existDates = new Set(base.map(r => r.date));
  let added = 0, skipped = 0;
  for (const row of pendingImportData) {
    if (existDates.has(row.date)) { skipped++; continue; }
    base.push(row); existDates.add(row.date); added++;
  }
  pendingImportData = null;
  showToast(`⏳ กำลัง sync ${base.length} วัน...`);
  await saveAllRemote(base);
  renderDashboard();
  renderHistory();
  renderMonthly();
  renderBonus();
  showToast(replaceAll ? `✅ Import สำเร็จ: ${added} วัน` : `✅ Import: ${added} วัน (ข้าม ${skipped} ซ้ำ)`, 'green');
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
applyTheme(getStoredTheme());
updateSoundUI();
if (isLoggedIn()) { showApp(); } else { showLogin(); }
