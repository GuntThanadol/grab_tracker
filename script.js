// ═══════════════════════════════════════════════════════════════════════════
// ── LOGIN CONFIG ─────────────────────────────────────────────────────────────
// แก้ไข USERNAME และ PASSWORD_HASH ตรงนี้เพื่อเปลี่ยนบัญชีเข้าสู่ระบบ
// ค่าเริ่มต้น:  ชื่อผู้ใช้ = admin   รหัสผ่าน = grab2026
// วิธีเปลี่ยนรหัสผ่าน: เปิดหน้าเว็บ กด F12 เปิด Console แล้วพิมพ์
//   await hashPassword("รหัสผ่านใหม่ของคุณ")
// จะได้ค่า hash ยาวๆ ออกมา ก็อปมาแทนที่ PASSWORD_HASH ด้านล่างนี้ แล้วเซฟไฟล์
// ═══════════════════════════════════════════════════════════════════════════
const LOGIN_CONFIG = {
  USERNAME: 'admin',
  // นี่คือ hash (SHA-256) ของรหัสผ่าน "grab2026"
  PASSWORD_HASH: '28fc0e7502703ebc003c8e4b3582dc9284b1e1099c045320972638eee554b5a',
};

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
// เอาไว้เรียกจาก Console เพื่อสร้าง hash รหัสผ่านใหม่ เช่น await hashPassword("myNewPass")
async function hashPassword(pw) {
  const h = await sha256Hex(pw);
  console.log('PASSWORD_HASH =', h);
  return h;
}

const LOGIN_SESSION_KEY = 'grab_login_authed';

function isLoggedIn() {
  return sessionStorage.getItem(LOGIN_SESSION_KEY) === '1';
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hide');
  document.getElementById('appRoot').style.display = '';
  initApp();
}

function showLogin() {
  document.getElementById('loginScreen').classList.remove('hide');
  document.getElementById('appRoot').style.display = 'none';
  setTimeout(() => { const u = document.getElementById('login-user'); if (u) u.focus(); }, 50);
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

function doLogout() {
  if (!confirm('ต้องการออกจากระบบใช่หรือไม่?')) return;
  sessionStorage.removeItem(LOGIN_SESSION_KEY);
  sessionStorage.removeItem('grab_authed'); // ล้างการปลดล็อคแก้ไขด้วย
  showLogin();
}

function toggleLoginPass() {
  const inp = document.getElementById('login-pass');
  const btn = document.getElementById('loginEyeBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

// ─── DATA ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'grab_tracker_v1';
const API_URL = 'https://script.google.com/macros/s/AKfycbxJs_MWuY6IjX5tMyx10Tk20d0iz6x2nozHr9MmZYNvPAGKUrGp4EfJdOEmRqrpNCM6/exec';
let editingId = null;
let isSyncing = false;

function loadData()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveLocal(rows) { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }
function saveData(rows) { saveLocal(rows); }
function getRows() { return loadData().sort((a,b) => a.date.localeCompare(b.date)); }
function newId()  { return Date.now() + Math.random().toString(36).slice(2,6); }

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
  if (btn) btn.classList.toggle('show', window.scrollY > 300);
});

// ── GOOGLE SHEETS API ────────────────────────────────────────────────────────
const API_KEY = 'guntgrabsecret';
async function apiCall(action, body = {}) {
  if (action === 'getAll') {
    const res = await fetch(`${API_URL}?action=getAll`, { redirect:'follow' });
    return res.json();
  }
  const res = await fetch(API_URL, { method:'POST', redirect:'follow', body: JSON.stringify({ action, key:API_KEY, ...body }) });
  return res.json();
}

async function syncFromSheets() {
  if (isSyncing) return;
  isSyncing = true; setSyncStatus('syncing');
  try {
    const data = await apiCall('getAll');
    if (data.ok) {
      const rows = data.rows.map(r => {
        let dateStr = String(r.date);
        if (dateStr.includes('T')) { const d = new Date(dateStr); d.setHours(d.getHours()+7); dateStr = d.toISOString().slice(0,10); }
        return { id:String(r.id), date:dateStr, grab:Number(r.grab)||0, tip:Number(r.tip)||0, oil:Number(r.oil)||0, oilReal:Number(r.oilReal)||0, credit:Number(r.credit)||0, withdraw:Number(r.withdraw)||0, note:String(r.note||'') };
      });
      const localRows = loadData();
      if (rows.length > 0 || localRows.length === 0) { saveLocal(rows); }
      else if (rows.length === 0 && localRows.length > 0) { await apiCall('saveAll', { rows: localRows }); }
      setSyncStatus('ok');
    } else { setSyncStatus('error'); }
  } catch(e) { setSyncStatus('error'); }
  finally { isSyncing = false; }
}

async function saveRow(row) {
  saveLocal(loadData().filter(r => r.id !== row.id).concat(row));
  setSyncStatus('syncing');
  try { const res = await apiCall('save', { row }); setSyncStatus(res.ok ? 'ok' : 'error'); }
  catch { setSyncStatus('error'); }
}
async function deleteRowRemote(id) {
  saveLocal(loadData().filter(r => r.id !== id));
  setSyncStatus('syncing');
  try { const res = await apiCall('delete', { id }); setSyncStatus(res.ok ? 'ok' : 'error'); }
  catch { setSyncStatus('error'); }
}
async function saveAllRemote(rows) {
  saveLocal(rows); setSyncStatus('syncing');
  try { const res = await apiCall('saveAll', { rows }); setSyncStatus(res.ok ? 'ok' : 'error'); }
  catch { setSyncStatus('error'); }
}

function setSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = status;
  if (status==='syncing') el.textContent = '🔄 กำลัง sync...';
  else if (status==='ok')  el.textContent = '☁️ Synced';
  else                      el.textContent = '⚠️ Offline';
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(n) { if (n==null||n==='') return '—'; return Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d+'T00:00:00');
  return dt.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'});
}
function isWorkDay(r) { return (r.grab||0)>0||(r.tip||0)>0; }
function profit(r) { return (r.grab||0)+(r.tip||0)-(r.oil||0); }
function income(r) { return (r.grab||0)+(r.tip||0); }

// ── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function animateCount(el, targetVal, duration=800, isInt=false) {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  const opts = isInt ? {minimumFractionDigits:0, maximumFractionDigits:0} : {minimumFractionDigits:2, maximumFractionDigits:2};
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

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show ' + type;
  setTimeout(() => t.className = '', 2800);
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function showTab(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  if (name==='dashboard') renderDashboard();
  if (name==='history') renderHistory();
  if (name==='monthly') renderMonthly();
  if (name==='bonus') renderBonus();
}

// ─── FORM PREVIEW ─────────────────────────────────────────────────────────────
function updatePreview() {
  const g = parseFloat(document.getElementById('f-grab').value)||0;
  const t = parseFloat(document.getElementById('f-tip').value)||0;
  const o = parseFloat(document.getElementById('f-oil').value)||0;
  const incEl = document.getElementById('prev-income');
  const pEl   = document.getElementById('prev-profit');
  const box   = document.getElementById('previewBox');
  const hasVal = g||t||o;
  box.classList.toggle('active-entry', !!hasVal);
  function setAnimated(el, val) {
    el.textContent = fmt(val) + ' บาท';
    el.classList.remove('updated');
    void el.offsetWidth;
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 400);
  }
  setAnimated(incEl, g+t);
  const pVal = g+t-o;
  setAnimated(pEl, pVal);
  pEl.style.color = pVal < 0 ? 'var(--red)' : 'var(--green-dark)';
}

// ─── SAVE ENTRY ──────────────────────────────────────────────────────────────
async function saveEntry() {
  const date = document.getElementById('f-date').value;
  if (!date) { showToast('กรุณาเลือกวันที่','red'); return; }
  const rows = loadData();
  let existRow = rows.find(r => r.date === date);
  if (existRow && !confirm('มีข้อมูลของวันนี้แล้ว ต้องการแทนที่?')) return;
  const row = {
    id: existRow ? existRow.id : newId(), date,
    grab:     parseFloat(document.getElementById('f-grab').value)||0,
    tip:      parseFloat(document.getElementById('f-tip').value)||0,
    oil:      parseFloat(document.getElementById('f-oil').value)||0,
    oilReal:  parseFloat(document.getElementById('f-oilReal').value)||0,
    credit:   parseFloat(document.getElementById('f-credit').value)||0,
    withdraw: parseFloat(document.getElementById('f-withdraw').value)||0,
    note: document.getElementById('f-note').value.trim(),
  };
  showToast('💾 กำลังบันทึก...');
  await saveRow(row);
  const dt = new Date(date+'T00:00:00');
  dt.setDate(dt.getDate()+1);
  ['f-grab','f-tip','f-oil','f-oilReal','f-credit','f-withdraw','f-note'].forEach(id => document.getElementById(id).value = '');
  tdpSetValue('f-date', dt.toISOString().slice(0,10));
  updatePreview();
  renderDashboard();
  showToast('✅ บันทึกแล้ว', 'green');
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard() {
  const rows = getRows();
  const workRows = rows.filter(isWorkDay);
  const totalGrab    = rows.reduce((s,r)=>s+(r.grab||0),0);
  const totalTip     = rows.reduce((s,r)=>s+(r.tip||0),0);
  const totalIncome  = rows.reduce((s,r)=>s+income(r),0);
  const totalOil     = rows.reduce((s,r)=>s+(r.oil||0),0);
  const totalOilReal = rows.reduce((s,r)=>s+(r.oilReal||0),0);
  const totalCredit  = rows.reduce((s,r)=>s+(r.credit||0),0);
  const totalWithdraw= rows.reduce((s,r)=>s+(r.withdraw||0),0);
  const totalProfit  = rows.reduce((s,r)=>s+profit(r),0);
  const avgProfit    = workRows.length ? totalProfit / workRows.length : 0;
  const avgIncome    = workRows.length ? totalIncome / workRows.length : 0;

  const cards = [
    { label:'💚 รายได้ Grab รวม', val:totalGrab,    color:'green', sub:'บาท' },
    { label:'👋 Tip มือรวม',      val:totalTip,     color:'green', sub:'บาท' },
    { label:'💰 รายได้รวมทั้งสิ้น',val:totalIncome, color:'green', sub:'บาท' },
    { label:'⛽ ค่าน้ำมัน',       val:totalOil,     color:'red',   sub:`บาท | เติมจริง ${fmt(totalOilReal)} บาท`, cls:'red' },
    { label:'💳 เครดิต Grab',     val:totalCredit,  color:'yellow',sub:'บาท', cls:'yellow' },
    { label:'🏦 ถอนเข้ากรุงศรี',  val:totalWithdraw,color:'blue',  sub:'บาท', cls:'blue' },
    { label:'💵 กำไรสุทธิรวม',    val:totalProfit,  color:'green', sub:'บาท' },
    { label:'📅 วันทำงาน',        val:workRows.length, color:'green', sub:`วัน (จาก ${rows.length} วัน)`, isInt:true },
    { label:'📈 รายได้เฉลี่ย/วัน', val:avgIncome,   color:'green', sub:'บาท/วันทำงาน' },
    { label:'📈 กำไรเฉลี่ย/วัน',  val:avgProfit,    color:'green', sub:'บาท/วันทำงาน' },
  ];

  document.getElementById('statGrid').innerHTML = cards.map((c,i) =>
    `<div class="stat-card ${c.cls||''}" style="animation:rowIn 0.35s ${i*0.04}s ease both;opacity:0">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.color}" id="sv${i}">0</div>
      <div class="stat-sub">${c.sub}</div>
    </div>`
  ).join('');

  // Animate counters
  requestAnimationFrame(() => {
    cards.forEach((c,i) => {
      const el = document.getElementById('sv'+i);
      if (!el) return;
      if (c.isInt) { setTimeout(() => animateCount(el, c.val, 600, true), i*40); }
      else { setTimeout(() => animateCount(el, c.val, 700+i*30), i*40); }
    });
  });

  renderBarChart(rows);
  renderTrendChart(rows);
  renderGoal(rows);
  renderWeekCompare(rows);
  renderMonthCompare(rows);
  renderDowChart(rows);
}

// ─── BAR CHART ───────────────────────────────────────────────────────────────
function renderBarChart(rows) {
  const recent = rows.filter(isWorkDay).slice(-30);
  const maxP = Math.max(...recent.map(r=>profit(r)),1);
  if (!recent.length) {
    document.getElementById('barChart').innerHTML = '<div class="empty"><div class="empty-icon">📊</div><p>ยังไม่มีข้อมูล</p></div>';
    return;
  }
  const html = recent.map((r,i) => {
    const p = profit(r);
    const pct = Math.max((p/maxP)*100, 2);
    const [,m,d] = r.date.split('-').map(Number);
    const cls = p < 0 ? 'red' : p > maxP*0.8 ? 'good' : '';
    return `<div class="bar-row" style="animation:rowIn 0.3s ${i*0.02}s ease both;opacity:0">
      <div class="bar-label">${d} ${TH_MONTHS_S[m-1]}</div>
      <div class="bar-track" title="${fmtDate(r.date)}: ${fmt(p)} บาท">
        <div class="bar-fill ${cls}" id="bf${i}" style="width:0%"></div>
      </div>
      <div class="bar-val">${fmt(p)}</div>
    </div>`;
  }).join('');
  document.getElementById('barChart').innerHTML = html;
  requestAnimationFrame(() => {
    recent.forEach((_,i) => {
      const p = profit(recent[i]);
      const pct = Math.max((p/maxP)*100, 2);
      setTimeout(() => {
        const el = document.getElementById('bf'+i);
        if (el) el.style.width = pct+'%';
      }, i*20);
    });
  });
}

// ─── TREND CHART (interactive tooltip) ──────────────────────────────────────
function renderTrendChart(rows) {
  const el = document.getElementById('trendChart');
  if (!el) return;
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth()-2, 1);
  const cutoffStr = cutoff.toISOString().slice(0,10);
  const recent = rows.filter(r => r.date >= cutoffStr && isWorkDay(r));

  if (recent.length < 2) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📉</div><p>ต้องการข้อมูลอย่างน้อย 2 วัน</p></div>';
    return;
  }

  const W = Math.max(el.clientWidth||700, 400);
  const H = 250;
  const PAD = {top:20, right:16, bottom:44, left:62};
  const CW = W-PAD.left-PAD.right, CH = H-PAD.top-PAD.bottom;
  const n = recent.length;
  const incomes = recent.map(r=>income(r));
  const profits = recent.map(r=>profit(r));
  const oils    = recent.map(r=>r.oil||0);
  const allVals = [...incomes,...profits,...oils];
  const minV = Math.min(...allVals,0), maxV = Math.max(...allVals,1);
  const range = maxV-minV||1;

  function xp(i) { return PAD.left+(i/(n-1))*CW; }
  function yp(v) { return PAD.top+CH-((v-minV)/range)*CH; }

  function makePath(vals,color,dashed=false) {
    const d = vals.map((v,i)=>(i===0?'M':'L')+xp(i).toFixed(1)+','+yp(v).toFixed(1)).join(' ');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${dashed?' stroke-dasharray="5,4"':''} opacity="0.9"/>`;
  }
  function makeArea(vals,color) {
    const base = yp(Math.max(minV,0));
    const d = vals.map((v,i)=>(i===0?'M':'L')+xp(i).toFixed(1)+','+yp(v).toFixed(1)).join(' ')
      +`L${xp(n-1).toFixed(1)},${base} L${PAD.left},${base} Z`;
    return `<path d="${d}" fill="${color}" opacity="0.06"/>`;
  }
  function makeDots(vals,color) {
    return vals.map((v,i)=>`<circle class="chart-dot" cx="${xp(i).toFixed(1)}" cy="${yp(v).toFixed(1)}" r="4" fill="${color}" stroke="white" stroke-width="1.5" style="cursor:pointer" data-date="${recent[i].date}" data-val="${v.toFixed(0)}" data-color="${color}">
      <title>${fmtDate(recent[i].date)}: ${fmt(v)} บาท</title>
    </circle>`).join('');
  }

  const zeroY = yp(0).toFixed(1);
  const zeroLine = minV < 0 ? `<line x1="${PAD.left}" y1="${zeroY}" x2="${PAD.left+CW}" y2="${zeroY}" stroke="#fca5a5" stroke-width="1" stroke-dasharray="4,3"/>` : '';
  const tickCount = 5;
  const ticks = Array.from({length:tickCount+1},(_,i)=>minV+(range/tickCount)*i);
  const yAxis = ticks.map(v=>{
    const y=yp(v).toFixed(1);
    return `<line x1="${PAD.left-4}" y1="${y}" x2="${PAD.left+CW}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>
    <text x="${PAD.left-8}" y="${parseFloat(y)+4}" text-anchor="end" font-size="10" fill="#9ca3af">${Math.round(v)}</text>`;
  }).join('');

  const step = Math.max(1,Math.floor(n/10));
  const xLabels = recent.map((r,i)=>{
    if (i%step!==0&&i!==n-1) return '';
    const [,m,d]=r.date.split('-').map(Number);
    return `<text x="${xp(i).toFixed(1)}" y="${H-PAD.bottom+16}" text-anchor="middle" font-size="10" fill="#9ca3af">${d}/${m}</text>`;
  }).join('');

  let lastMonth='';
  const monthLabels = recent.map((r,i)=>{
    const mo=r.date.slice(0,7);
    if (mo===lastMonth) return '';
    lastMonth=mo;
    const [,m]=mo.split('-').map(Number);
    return `<line x1="${xp(i).toFixed(1)}" y1="${PAD.top}" x2="${xp(i).toFixed(1)}" y2="${PAD.top+CH}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,3"/>
    <text x="${parseFloat(xp(i).toFixed(1))+4}" y="${PAD.top+13}" font-size="10" fill="#6b7280" font-weight="600">${TH_MONTHS_S[m-1]}</text>`;
  }).join('');

  // Trend line
  const xs=profits.map((_,i)=>i);
  const meanX=xs.reduce((a,b)=>a+b,0)/n;
  const meanY=profits.reduce((a,b)=>a+b,0)/n;
  const num=xs.reduce((s,x,i)=>s+(x-meanX)*(profits[i]-meanY),0);
  const den=xs.reduce((s,x)=>s+(x-meanX)**2,0);
  const slope=den?num/den:0;
  const intercept=meanY-slope*meanX;
  const trendColor=slope>=0?'var(--green)':'var(--red)';
  const ty0=yp(intercept).toFixed(1), ty1=yp(intercept+slope*(n-1)).toFixed(1);
  const trendLine=`<line x1="${PAD.left}" y1="${ty0}" x2="${PAD.left+CW}" y2="${ty1}" stroke="${trendColor}" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.5"/>`;
  const trendPct=meanY?((slope*(n-1))/Math.abs(meanY)*100).toFixed(1):0;
  const trendLabel=slope>=0?`<tspan fill="var(--green)">▲ +${trendPct}%</tspan>`:`<tspan fill="var(--red)">▼ ${trendPct}%</tspan>`;

  // Hover crosshair line
  const crosshair = `<line id="tc-cross" x1="0" y1="${PAD.top}" x2="0" y2="${PAD.top+CH}" stroke="#9ca3af" stroke-width="1" stroke-dasharray="4,3" opacity="0" pointer-events="none"/>`;

  el.innerHTML = `<div style="position:relative">
    <div class="chart-tooltip" id="chartTip"></div>
    <svg id="trendSvg" width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="font-family:inherit;overflow:visible;cursor:crosshair">
      ${yAxis}${zeroLine}${monthLabels}
      ${makeArea(incomes,'#00b14f')}${makeArea(profits,'#3b82f6')}
      ${trendLine}
      ${makePath(incomes,'#00b14f')}${makePath(profits,'#3b82f6')}${makePath(oils,'#e53e3e',true)}
      ${crosshair}
      ${makeDots(incomes,'#00b14f')}${makeDots(profits,'#3b82f6')}
      ${xLabels}
      <text x="${PAD.left}" y="${H-2}" font-size="11" fill="#6b7280">Trend ${trendLabel} (กำไรสุทธิ 3 เดือน)</text>
      <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top+CH}" stroke="#e5e7eb" stroke-width="1"/>
      <line x1="${PAD.left}" y1="${PAD.top+CH}" x2="${PAD.left+CW}" y2="${PAD.top+CH}" stroke="#e5e7eb" stroke-width="1"/>
    </svg>
  </div>`;

  // Tooltip on dots
  el.querySelectorAll('.chart-dot').forEach(dot => {
    dot.addEventListener('mouseenter', (e) => {
      const tip = document.getElementById('chartTip');
      const svg = document.getElementById('trendSvg');
      const svgRect = svg.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const x = dotRect.left - svgRect.left + dotRect.width/2;
      const y = dotRect.top  - svgRect.top  - 38;
      const [,m,d] = dot.dataset.date.split('-').map(Number);
      tip.innerHTML = `<span style="color:${dot.dataset.color}">●</span> ${d} ${TH_MONTHS_S[m-1]}: <strong>${Number(dot.dataset.val).toLocaleString('th-TH',{minimumFractionDigits:0})} ฿</strong>`;
      tip.style.left = (x - tip.offsetWidth/2) + 'px';
      tip.style.top  = y + 'px';
      tip.classList.add('show');
      dot.setAttribute('r','6');
    });
    dot.addEventListener('mouseleave', () => {
      document.getElementById('chartTip').classList.remove('show');
      dot.setAttribute('r','4');
    });
  });
}

// ─── GOAL ─────────────────────────────────────────────────────────────────────
function saveGoal() {
  const v = parseFloat(document.getElementById('goalInput').value);
  if (!v||v<=0) { showToast('กรุณากรอกเป้าหมาย','red'); return; }
  localStorage.setItem('grab_goal', v);
  renderDashboard();
  showToast('🎯 บันทึกเป้าหมายแล้ว','green');
}
function renderGoal(rows) {
  const goal = parseFloat(localStorage.getItem('grab_goal'))||0;
  const el = document.getElementById('goalContent');
  const inp = document.getElementById('goalInput');
  const now = new Date();
  const thisMonthPfx = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const monthRows = rows.filter(r=>r.date.startsWith(thisMonthPfx));
  const monthProfit = monthRows.reduce((s,r)=>s+profit(r),0);
  const workDays = monthRows.filter(isWorkDay).length;
  const daysInMonth = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  if (!goal) {
    el.innerHTML = `<div style="color:var(--gray-400);font-size:0.86rem;padding:8px 0">กรอกเป้าหมายด้านล่างเพื่อเริ่มติดตาม</div>
      <div style="font-size:0.83rem;color:var(--gray-600);margin-top:6px">เดือนนี้: <strong style="color:var(--green-dark)">${fmt(monthProfit)} บาท</strong> (${workDays} วัน)</div>`;
    return;
  }
  inp.value = inp.value || goal;
  const pct = Math.min((monthProfit/goal)*100,100);
  const over = monthProfit >= goal;
  const remaining = Math.max(goal-monthProfit, 0);
  const moName = TH_MONTHS_S[now.getMonth()];
  let needPerDay = !over && daysLeft > 0 ? `<div style="font-size:0.79rem;color:var(--gray-600);margin-top:4px">ต้องทำ <strong>${fmt(remaining/daysLeft)}</strong> บาท/วัน (${daysLeft} วันที่เหลือ)</div>` : '';

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
      <span style="font-size:0.83rem;color:var(--gray-600)">${moName} ${now.getFullYear()+543}</span>
      <span style="font-size:0.82rem;font-weight:800;color:${over?'#b7870a':'var(--green-dark)'}">${pct.toFixed(1)}%</span>
    </div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-fill ${over?'over':''}" id="goalBar" style="width:0%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--gray-600)">
      <span>กำไร <strong style="color:var(--green-dark)">${fmt(monthProfit)}</strong> บาท</span>
      <span>เป้า <strong>${fmt(goal)}</strong> บาท</span>
    </div>
    ${over
      ? `<div style="font-size:0.82rem;margin-top:6px;color:#b7870a;font-weight:800">🎉 ถึงเป้าแล้ว! เกิน ${fmt(monthProfit-goal)} บาท</div>`
      : `<div style="font-size:0.82rem;margin-top:4px;color:var(--gray-600)">ยังขาดอีก <strong style="color:var(--red)">${fmt(remaining)}</strong> บาท</div>${needPerDay}`
    }`;
  setTimeout(() => {
    const bar = document.getElementById('goalBar');
    if (bar) bar.style.width = pct + '%';
  }, 200);
}

// ─── WEEK COMPARE ─────────────────────────────────────────────────────────────
function renderWeekCompare(rows) {
  const el = document.getElementById('weekCompare');
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now); monday.setDate(now.getDate()-(dow===0?6:dow-1)); monday.setHours(0,0,0,0);
  const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate()-7);
  const lastSunday = new Date(monday); lastSunday.setDate(monday.getDate()-1);
  const toStr = d => d.toISOString().slice(0,10);
  const thisWeek = rows.filter(r=>r.date>=toStr(monday)&&r.date<=toStr(now));
  const lastWeek = rows.filter(r=>r.date>=toStr(lastMonday)&&r.date<=toStr(lastSunday));
  const thisP = thisWeek.reduce((s,r)=>s+profit(r),0);
  const lastP = lastWeek.reduce((s,r)=>s+profit(r),0);
  const thisI = thisWeek.reduce((s,r)=>s+income(r),0);
  const lastI = lastWeek.reduce((s,r)=>s+income(r),0);
  const diffP = thisP-lastP;
  const diffPct = lastP ? ((diffP/Math.abs(lastP))*100).toFixed(1) : null;
  const diffClass = diffP>0?'up':diffP<0?'down':'flat';
  const diffIcon = diffP>0?'▲':diffP<0?'▼':'–';
  const diffLabel = diffPct!==null ? `${diffIcon} ${Math.abs(diffPct)}%` : `${diffIcon} ${fmt(Math.abs(diffP))} บาท`;

  el.innerHTML = `
    <div class="week-grid">
      <div class="week-col">
        <div class="week-col-title">สัปดาห์นี้</div>
        <div class="week-col-val" style="color:var(--green-dark)" id="wkThis">—</div>
        <div style="font-size:0.77rem;color:var(--gray-400);margin-top:2px">รายได้ ${fmt(thisI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--gray-400)">${thisWeek.filter(isWorkDay).length} วันทำงาน</div>
      </div>
      <div class="week-col">
        <div class="week-col-title">สัปดาห์ที่แล้ว</div>
        <div class="week-col-val" style="color:var(--gray-600)" id="wkLast">—</div>
        <div style="font-size:0.77rem;color:var(--gray-400);margin-top:2px">รายได้ ${fmt(lastI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--gray-400)">${lastWeek.filter(isWorkDay).length} วันทำงาน</div>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="week-diff ${diffClass}">${diffLabel}</span>
      <span style="font-size:0.79rem;color:var(--gray-400)">เทียบกำไรสุทธิ</span>
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
  function localMonthPfx(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  const thisMonthPfx = localMonthPfx(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthPfx = localMonthPfx(lastMonthDate);

  const thisMonth = rows.filter(r=>r.date.startsWith(thisMonthPfx));
  const lastMonth  = rows.filter(r=>r.date.startsWith(lastMonthPfx));

  const thisP = thisMonth.reduce((s,r)=>s+profit(r),0);
  const lastP = lastMonth.reduce((s,r)=>s+profit(r),0);
  const thisI = thisMonth.reduce((s,r)=>s+income(r),0);
  const lastI = lastMonth.reduce((s,r)=>s+income(r),0);

  const diffP = thisP-lastP;
  const diffPct = lastP ? ((diffP/Math.abs(lastP))*100).toFixed(1) : null;
  const diffClass = diffP>0?'up':diffP<0?'down':'flat';
  const diffIcon = diffP>0?'▲':diffP<0?'▼':'–';
  const diffLabel = diffPct!==null ? `${diffIcon} ${Math.abs(diffPct)}%` : `${diffIcon} ${fmt(Math.abs(diffP))} บาท`;

  const thisName = `${TH_MONTHS_S[now.getMonth()]} ${now.getFullYear()+543}`;
  const lastName = `${TH_MONTHS_S[lastMonthDate.getMonth()]} ${lastMonthDate.getFullYear()+543}`;

  el.innerHTML = `
    <div class="week-grid">
      <div class="week-col">
        <div class="week-col-title">${thisName}</div>
        <div class="week-col-val" style="color:var(--green-dark)" id="moThis">—</div>
        <div style="font-size:0.77rem;color:var(--gray-400);margin-top:2px">รายได้ ${fmt(thisI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--gray-400)">${thisMonth.filter(isWorkDay).length} วันทำงาน</div>
      </div>
      <div class="week-col">
        <div class="week-col-title">${lastName}</div>
        <div class="week-col-val" style="color:var(--gray-600)" id="moLast">—</div>
        <div style="font-size:0.77rem;color:var(--gray-400);margin-top:2px">รายได้ ${fmt(lastI)} บาท</div>
        <div style="font-size:0.77rem;color:var(--gray-400)">${lastMonth.filter(isWorkDay).length} วันทำงาน</div>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="week-diff ${diffClass}">${diffLabel}</span>
      <span style="font-size:0.79rem;color:var(--gray-400)">เทียบกำไรสุทธิ</span>
    </div>`;
  setTimeout(() => {
    animateCount(document.getElementById('moThis'), thisP, 600);
    animateCount(document.getElementById('moLast'), lastP, 600);
  }, 100);
}

// ─── DOW CHART ────────────────────────────────────────────────────────────────
function renderDowChart(rows) {
  const el = document.getElementById('dowChart');
  const DOW_LABELS = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  const sums=Array(7).fill(0), counts=Array(7).fill(0);
  rows.filter(isWorkDay).forEach(r => {
    const d=new Date(r.date+'T00:00:00').getDay();
    sums[d]+=income(r); counts[d]++;
  });
  const avgs=sums.map((s,i)=>counts[i]?s/counts[i]:0);
  const maxAvg=Math.max(...avgs,1);
  const bestDow=avgs.indexOf(Math.max(...avgs));

  if (!rows.filter(isWorkDay).length) {
    el.innerHTML='<div class="empty"><div class="empty-icon">📅</div><p>ยังไม่มีข้อมูล</p></div>'; return;
  }
  el.innerHTML = `<div class="dow-grid">
    ${DOW_LABELS.map((label,i)=>{
      const h=avgs[i]?Math.max((avgs[i]/maxAvg)*90,4):4;
      const isBest=i===bestDow&&avgs[i]>0;
      return `<div class="dow-col" title="${label}: เฉลี่ย ${fmt(avgs[i])} บาท (${counts[i]} วัน)">
        <div class="dow-bar-wrap">
          <div style="font-size:0.7rem;color:${isBest?'#b7870a':'var(--gray-400)'};font-weight:${isBest?800:500};margin-bottom:2px;transition:all 0.2s">
            ${avgs[i]>0?(avgs[i]>=1000?(avgs[i]/1000).toFixed(1)+'k':Math.round(avgs[i])):''}
          </div>
          <div class="dow-bar ${isBest?'best':''}" id="dbar${i}" style="height:0px"></div>
        </div>
        <div class="dow-label" style="color:${isBest?'#b7870a':'var(--gray-600)'}">${label}</div>
        <div class="dow-val">${counts[i]?counts[i]+'วัน':'-'}</div>
      </div>`;
    }).join('')}
  </div>
  <div style="margin-top:12px;font-size:0.82rem;color:var(--gray-600)">
    🏆 วันที่ดีที่สุด: <strong style="color:#b7870a">${DOW_LABELS[bestDow]}</strong> เฉลี่ย <strong style="color:#b7870a">${fmt(avgs[bestDow])} บาท</strong>
  </div>`;

  // Animate bars
  requestAnimationFrame(() => {
    DOW_LABELS.forEach((_,i) => {
      setTimeout(() => {
        const bar = document.getElementById('dbar'+i);
        if (bar) { const h=avgs[i]?Math.max((avgs[i]/maxAvg)*90,4):4; bar.style.height=h+'px'; }
      }, i*60);
    });
  });
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function renderHistory() {
  let rows = getRows();
  const monthFilter = document.getElementById('filterMonth').value;
  const typeFilter  = document.getElementById('filterType').value;
  if (monthFilter) rows = rows.filter(r=>r.date.startsWith(monthFilter));
  if (typeFilter==='work') rows=rows.filter(isWorkDay);
  if (typeFilter==='rest') rows=rows.filter(r=>!isWorkDay(r));

  const tbody = document.getElementById('historyBody');
  if (!rows.length) {
    tbody.innerHTML=`<tr><td colspan="11"><div class="empty"><div class="empty-icon">📋</div><p>ไม่มีข้อมูล</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.reverse().map((r,i) => {
    const p=profit(r);
    return `<tr class="row-anim" style="animation-delay:${i*0.018}s">
      <td class="td-date">${fmtDate(r.date)}</td>
      <td class="td-num">${r.grab?fmt(r.grab):'<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.tip?fmt(r.tip):'<span class="td-gray">—</span>'}</td>
      <td class="td-num td-green">${fmt(income(r))}</td>
      <td class="td-num td-red">${r.oil?fmt(r.oil):'<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.oilReal?fmt(r.oilReal):'<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.credit?fmt(r.credit):'<span class="td-gray">—</span>'}</td>
      <td class="td-num">${r.withdraw?fmt(r.withdraw):'<span class="td-gray">—</span>'}</td>
      <td class="td-num"><strong class="${p>=0?'td-green':'td-red'}">${fmt(p)}</strong></td>
      <td class="note-cell" title="${r.note||''}">${r.note||''}</td>
      <td style="display:flex;gap:4px;padding:8px">
        <button class="btn btn-outline btn-sm" onclick="addRipple(event);openEdit('${r.id}')">✏️</button>
        <button class="btn btn-red btn-sm" onclick="addRipple(event);requireAuth(()=>deleteRow('${r.id}'))">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── MONTHLY ──────────────────────────────────────────────────────────────────
function renderMonthly() {
  const rows = getRows();
  const byMonth = {};
  rows.forEach(r => { const m=r.date.slice(0,7); if(!byMonth[m]) byMonth[m]=[]; byMonth[m].push(r); });
  const months = Object.keys(byMonth).sort().reverse();
  if (!months.length) {
    document.getElementById('monthlyContent').innerHTML=`<div class="empty"><div class="empty-icon">📅</div><p>ยังไม่มีข้อมูล</p></div>`; return;
  }
  document.getElementById('monthlyContent').innerHTML = months.map((m,mi)=>{
    const mrs=byMonth[m];
    const workDays=mrs.filter(isWorkDay).length;
    const totIncome=mrs.reduce((s,r)=>s+income(r),0);
    const totOil=mrs.reduce((s,r)=>s+(r.oil||0),0);
    const totOilReal=mrs.reduce((s,r)=>s+(r.oilReal||0),0);
    const totCredit=mrs.reduce((s,r)=>s+(r.credit||0),0);
    const totWithdraw=mrs.reduce((s,r)=>s+(r.withdraw||0),0);
    const totProfit=mrs.reduce((s,r)=>s+profit(r),0);
    const [yr,mo]=m.split('-');
    const monthName=`${TH_MONTHS_S[parseInt(mo)-1]} ${parseInt(yr)+543}`;
    return `<div class="month-section" style="animation:rowIn 0.4s ${mi*0.08}s ease both;opacity:0">
      <div class="month-header">
        <div class="month-title">📅 ${monthName}</div>
        <div class="month-stats">
          <span>ทำงาน <strong>${workDays} วัน</strong></span>
          <span>รายได้รวม <strong>${fmt(totIncome)} ฿</strong></span>
          <span>กำไรสุทธิ <strong style="color:var(--green-dark)">${fmt(totProfit)} ฿</strong></span>
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table style="font-size:0.84rem">
          <thead><tr>
            <th>วันที่</th><th class="td-num">รายได้ Grab</th><th class="td-num">Tip</th>
            <th class="td-num">รายได้รวม</th><th class="td-num">ค่าน้ำมัน</th>
            <th class="td-num">เติมน้ำมันจริง</th><th class="td-num">เครดิต Grab</th>
            <th class="td-num">ถอนกรุงศรี</th><th class="td-num">กำไรสุทธิ</th>
          </tr></thead>
          <tbody>
            ${mrs.map(r=>`<tr>
              <td>${fmtDate(r.date)}</td>
              <td class="td-num">${r.grab?fmt(r.grab):'<span class="td-gray">—</span>'}</td>
              <td class="td-num">${r.tip?fmt(r.tip):'<span class="td-gray">—</span>'}</td>
              <td class="td-num td-green">${fmt(income(r))}</td>
              <td class="td-num td-red">${r.oil?fmt(r.oil):'<span class="td-gray">—</span>'}</td>
              <td class="td-num">${r.oilReal?fmt(r.oilReal):'<span class="td-gray">—</span>'}</td>
              <td class="td-num">${r.credit?fmt(r.credit):'<span class="td-gray">—</span>'}</td>
              <td class="td-num">${r.withdraw?fmt(r.withdraw):'<span class="td-gray">—</span>'}</td>
              <td class="td-num"><strong class="${profit(r)>=0?'td-green':'td-red'}">${fmt(profit(r))}</strong></td>
            </tr>`).join('')}
            <tr style="background:var(--green-light);font-weight:800;">
              <td>รวม ${monthName}</td>
              <td class="td-num">${fmt(mrs.reduce((s,r)=>s+(r.grab||0),0))}</td>
              <td class="td-num">${fmt(mrs.reduce((s,r)=>s+(r.tip||0),0))}</td>
              <td class="td-num td-green">${fmt(totIncome)}</td>
              <td class="td-num td-red">${fmt(totOil)}</td>
              <td class="td-num">${fmt(totOilReal)}</td>
              <td class="td-num">${fmt(totCredit)}</td>
              <td class="td-num">${fmt(totWithdraw)}</td>
              <td class="td-num td-green">${fmt(totProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

// ─── BONUS (อินพิเศษ / อินเพชร) ────────────────────────────────────────────────
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
    const diamond = bs.filter(b=>b.type==='diamond').reduce((s,b)=>s+b.amount,0);
    const special = bs.filter(b=>b.type==='special').reduce((s,b)=>s+b.amount,0);
    groups.push({ date: r.date, diamond, special, note: r.note, rowId: r.id });
  });
  return groups.sort((a,b)=>a.date.localeCompare(b.date));
}
function renderBonus() {
  const rows = getRows();
  const groups = getBonusGroups(rows);
  const filterType = document.getElementById('bonusFilterType') ? document.getElementById('bonusFilterType').value : 'all';

  const totalDiamond = groups.reduce((s,g)=>s+g.diamond,0);
  const totalSpecial = groups.reduce((s,g)=>s+g.special,0);
  const daysDiamond = groups.filter(g=>g.diamond>0).length;
  const daysSpecial = groups.filter(g=>g.special>0).length;
  const totalAll = totalDiamond + totalSpecial;

  const summaryCards = [
    { label:'💎 อินเพชรรวม', val:totalDiamond, cls:'blue', color:'blue', sub:`${daysDiamond} วัน` },
    { label:'⭐ อินพิเศษรวม', val:totalSpecial, cls:'yellow', color:'yellow', sub:`${daysSpecial} วัน` },
    { label:'💰 รวมทั้งหมด', val:totalAll, cls:'', color:'green', sub:`${groups.length} วัน` },
  ];
  const summaryEl = document.getElementById('bonusSummary');
  if (summaryEl) {
    summaryEl.innerHTML = summaryCards.map((c,i)=>`
      <div class="stat-card ${c.cls}" style="animation:rowIn 0.35s ${i*0.05}s ease both;opacity:0">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value ${c.color}" id="bsv${i}">0</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`).join('');
    requestAnimationFrame(()=>{
      summaryCards.forEach((c,i)=>{
        const el = document.getElementById('bsv'+i);
        if (el) setTimeout(()=>animateCount(el, c.val, 700+i*30), i*40);
      });
    });
  }

  let filtered = groups;
  if (filterType === 'diamond') filtered = groups.filter(g=>g.diamond>0);
  if (filterType === 'special') filtered = groups.filter(g=>g.special>0);
  filtered = filtered.slice().reverse();

  const tbody = document.getElementById('bonusBody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="empty-icon">💎</div><p>ยังไม่มีวันที่ได้อินพิเศษ/อินเพชร<br>พิมพ์คำว่า "อินเพชร 80" หรือ "อินพิเศษ 50" ในช่องหมายเหตุ</p></div></td></tr>`;
    return;
  }
  const showDiamond = filterType !== 'special';
  const showSpecial = filterType !== 'diamond';

  tbody.innerHTML = filtered.map((g,i)=>{
    let badges = '';
    if (showDiamond && g.diamond>0) badges += `<span class="bonus-type-badge diamond">💎 อินเพชร</span>`;
    if (showSpecial && g.special>0) badges += `<span class="bonus-type-badge special">⭐ อินพิเศษ</span>`;

    const dAmt = showDiamond ? g.diamond : 0;
    const sAmt = showSpecial ? g.special : 0;

    let amountHtml;
    if (dAmt>0 && sAmt>0) {
      amountHtml = `<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">
        <span style="color:#1d6fd1;font-weight:800">💎 ${fmt(dAmt)}</span>
        <span style="color:#a5710a;font-weight:800">⭐ ${fmt(sAmt)}</span>
        <span class="td-green" style="font-size:0.78rem;font-weight:900;border-top:1px solid var(--gray-100);padding-top:2px;margin-top:1px">รวม ${fmt(dAmt+sAmt)}</span>
      </div>`;
    } else {
      amountHtml = `<strong class="td-green">${fmt(dAmt+sAmt)}</strong>`;
    }

    return `<tr class="row-anim" style="animation-delay:${i*0.02}s">
      <td class="td-date">${fmtDate(g.date)}</td>
      <td><div style="display:flex;flex-wrap:wrap;gap:5px">${badges}</div></td>
      <td class="td-num">${amountHtml}</td>
      <td class="note-cell" style="max-width:260px" title="${g.note||''}">${g.note||''}</td>
    </tr>`;
  }).join('');
}

// ─── EDIT / DELETE ────────────────────────────────────────────────────────────
function openEdit(id) {
  const r = loadData().find(x=>x.id===id);
  if (!r) return;
  editingId=id;
  tdpSetValue('e-date',r.date);
  ['grab','tip','oil','oilReal','credit','withdraw'].forEach(f=>document.getElementById('e-'+f).value=r[f]||'');
  document.getElementById('e-note').value=r.note||'';
  document.getElementById('editModal').classList.add('show');
}
function closeModal() { document.getElementById('editModal').classList.remove('show'); editingId=null; }
async function saveEdit() {
  const rows=loadData(); const idx=rows.findIndex(r=>r.id===editingId);
  if (idx<0) return;
  const row={...rows[idx], date:document.getElementById('e-date').value,
    grab:parseFloat(document.getElementById('e-grab').value)||0,
    tip:parseFloat(document.getElementById('e-tip').value)||0,
    oil:parseFloat(document.getElementById('e-oil').value)||0,
    oilReal:parseFloat(document.getElementById('e-oilReal').value)||0,
    credit:parseFloat(document.getElementById('e-credit').value)||0,
    withdraw:parseFloat(document.getElementById('e-withdraw').value)||0,
    note:document.getElementById('e-note').value.trim()};
  closeModal(); showToast('💾 กำลังบันทึก...');
  await saveRow(row); renderHistory(); showToast('✅ แก้ไขแล้ว','green');
}
function deleteRow(id) {
  pinAction={type:'deleteRow',id}; pinBuffer=''; updatePinDots();
  document.getElementById('pinMsg').textContent='';
  document.getElementById('pinTitle').textContent='🗑️ ยืนยันการลบรายการ';
  document.getElementById('pinModal').classList.add('show');
}

// ─── IMPORT EXCEL ─────────────────────────────────────────────────────────────
function excelSerialToDateStr(serial) {
  const utc=(serial-25569)*86400000; const d=new Date(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function parseDateVal(v) {
  if (!v) return null;
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  if (typeof v==='number'&&v>1000) return excelSerialToDateStr(v);
  if (typeof v==='string') { const m=v.match(/(\d{4})-(\d{2})-(\d{2})/); if(m) return `${m[1]}-${m[2]}-${m[3]}`; }
  return null;
}

let pendingImportData=null;

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportData() {
  const rows=getRows();
  const ws_data=[['วันที่','รายได้ Grab (บาท)','Tip มือ (บาท)','รายได้รวม (บาท)','ค่าน้ำมัน (บาท)','เติมน้ำมันจริง (บาท)','เครดิต Grab (บาท)','ถอนเข้ากรุงศรี (บาท)','กำไรสุทธิ (บาท)','หมายเหตุ'],
    ...rows.map(r=>[r.date,r.grab||0,r.tip||0,income(r),r.oil||0,r.oilReal||0,r.credit||0,r.withdraw||0,profit(r),r.note||''])];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(ws_data),'บัญชีรายวัน');
  XLSX.writeFile(wb,`Grab_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('📤 Export สำเร็จ','green');
}

// ─── THAI DATE PICKER ─────────────────────────────────────────────────────────
const TH_MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_S=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_DOWS=['อา','จ','อ','พ','พฤ','ศ','ส'];
const TDP={};

function tdpOpen(fieldId){
  document.querySelectorAll('.tdp-pop.show').forEach(p=>{if(p.id!==fieldId+'-pop')p.classList.remove('show');});
  const pop=document.getElementById(fieldId+'-pop');
  if(pop.classList.contains('show')){pop.classList.remove('show');return;}
  const val=document.getElementById(fieldId).value;
  const now=new Date(); let y=now.getFullYear(),m=now.getMonth();
  if(val){const d=new Date(val+'T00:00:00');y=d.getFullYear();m=d.getMonth();}
  TDP[fieldId]={year:y,month:m,mode:'day'};
  tdpRender(fieldId); pop.classList.add('show');
  document.getElementById(fieldId+'-btn').classList.add('open');
  setTimeout(()=>{
    function outside(e){
      const btn=document.getElementById(fieldId+'-btn');
      const popEl=document.getElementById(fieldId+'-pop');
      if(btn&&!btn.contains(e.target)&&popEl&&!popEl.contains(e.target)){
        popEl.classList.remove('show'); btn.classList.remove('open');
        document.removeEventListener('mousedown',outside);
      }
    }
    document.addEventListener('mousedown',outside);
  },0);
}

function tdpRender(fieldId){
  const state=TDP[fieldId];
  const pop=document.getElementById(fieldId+'-pop');
  const selectedVal=document.getElementById(fieldId).value;
  const todayStr=new Date().toISOString().slice(0,10);

  if(state.mode==='day'){
    const firstDay=new Date(state.year,state.month,1).getDay();
    const daysInMonth=new Date(state.year,state.month+1,0).getDate();
    let cells='';
    for(let i=0;i<firstDay;i++) cells+='<div class="tdp-day empty"></div>';
    for(let d=1;d<=daysInMonth;d++){
      const ds=`${state.year}-${String(state.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cls=['tdp-day',ds===selectedVal?'selected':'',ds===todayStr&&ds!==selectedVal?'today':''].join(' ');
      cells+=`<div class="${cls}" onclick="tdpSelect('${fieldId}','${ds}')">${d}</div>`;
    }
    pop.innerHTML=`<div class="tdp-head">
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="tdpNav('${fieldId}',-1)">◀</button>
      <span class="tdp-title" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].mode='month';tdpRender('${fieldId}')">${TH_MONTHS[state.month]} ${state.year+543}</span>
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="tdpNav('${fieldId}',1)">▶</button>
    </div>
    <div class="tdp-grid">${TH_DOWS.map(d=>`<div class="tdp-dow">${d}</div>`).join('')}${cells}</div>`;
  } else if(state.mode==='month'){
    const items=TH_MONTHS_S.map((m,i)=>`<div class="tdp-sel-item${i===state.month?' selected':''}" onclick="TDP['${fieldId}'].month=${i};TDP['${fieldId}'].mode='day';tdpRender('${fieldId}')">${m}</div>`).join('');
    pop.innerHTML=`<div class="tdp-head">
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year--;tdpRender('${fieldId}')">◀</button>
      <span class="tdp-title" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].mode='year';tdpRender('${fieldId}')">${state.year+543}</span>
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year++;tdpRender('${fieldId}')">▶</button>
    </div><div class="tdp-sel-grid">${items}</div>`;
  } else {
    const base=state.year-5;
    const items=Array.from({length:12},(_,i)=>base+i).map(y=>`<div class="tdp-sel-item${y===state.year?' selected':''}" onclick="TDP['${fieldId}'].year=${y};TDP['${fieldId}'].mode='month';tdpRender('${fieldId}')">${y+543}</div>`).join('');
    pop.innerHTML=`<div class="tdp-head">
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year-=12;tdpRender('${fieldId}')">◀</button>
      <span class="tdp-title">เลือกปี</span>
      <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year+=12;tdpRender('${fieldId}')">▶</button>
    </div><div class="tdp-sel-grid">${items}</div>`;
  }
}

function tdpNav(fieldId,dir){
  const s=TDP[fieldId]; s.month+=dir;
  if(s.month>11){s.month=0;s.year++;} if(s.month<0){s.month=11;s.year--;}
  tdpRender(fieldId);
}
function tdpSelect(fieldId,dateStr){
  document.getElementById(fieldId).value=dateStr;
  const [y,m,d]=dateStr.split('-').map(Number);
  const btn=document.getElementById(fieldId+'-btn');
  btn.textContent=`${d} ${TH_MONTHS[m-1]} ${y+543}`;
  btn.classList.remove('placeholder','open');
  document.getElementById(fieldId+'-pop').classList.remove('show');
  if(fieldId==='f-date') updatePreview();
}
function tdpSetValue(fieldId,dateStr){
  if(!dateStr) return;
  document.getElementById(fieldId).value=dateStr;
  const [y,m,d]=dateStr.split('-').map(Number);
  const btn=document.getElementById(fieldId+'-btn');
  btn.textContent=`${d} ${TH_MONTHS[m-1]} ${y+543}`;
  btn.classList.remove('placeholder');
}

// ─── MONTH PICKER ─────────────────────────────────────────────────────────────
function tdpOpenMonth(fieldId){
  document.querySelectorAll('.tdp-pop.show').forEach(p=>p.classList.remove('show'));
  const pop=document.getElementById(fieldId+'-pop');
  pop.onmousedown=e=>e.stopPropagation();
  const val=document.getElementById(fieldId).value;
  const now=new Date(); let y=now.getFullYear(),m=now.getMonth();
  if(val){const [vy,vm]=val.split('-');y=parseInt(vy);m=parseInt(vm)-1;}
  TDP[fieldId]={year:y,month:m,mode:'monthYear'};
  tdpRenderMonth(fieldId); pop.classList.add('show');
  setTimeout(()=>{
    function outside(e){
      const btn=document.getElementById(fieldId+'-btn');
      const popEl=document.getElementById(fieldId+'-pop');
      if(btn&&!btn.contains(e.target)&&popEl&&!popEl.contains(e.target)){
        popEl.classList.remove('show'); btn.classList.remove('open');
        document.removeEventListener('mousedown',outside);
      }
    }
    document.addEventListener('mousedown',outside);
  },0);
}
function tdpRenderMonth(fieldId){
  const state=TDP[fieldId];
  const pop=document.getElementById(fieldId+'-pop');
  const selVal=document.getElementById(fieldId).value;
  const items=TH_MONTHS_S.map((mn,i)=>{
    const v=`${state.year}-${String(i+1).padStart(2,'0')}`;
    return `<div class="tdp-sel-item${v===selVal?' selected':''}" onclick="tdpSelectMonth('${fieldId}','${v}',${i})">${mn}</div>`;
  }).join('');
  pop.innerHTML=`<div class="tdp-head">
    <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year--;tdpRenderMonth('${fieldId}')">◀</button>
    <span class="tdp-title">${state.year+543}</span>
    <button class="tdp-nav" onmousedown="event.stopPropagation()" onclick="TDP['${fieldId}'].year++;tdpRenderMonth('${fieldId}')">▶</button>
  </div><div class="tdp-sel-grid">${items}</div>`;
}
function tdpSelectMonth(fieldId,val,monthIdx){
  document.getElementById(fieldId).value=val;
  const [y]=val.split('-');
  const btn=document.getElementById(fieldId+'-btn');
  btn.textContent=`${TH_MONTHS_S[monthIdx]} ${parseInt(y)+543}`;
  btn.classList.remove('placeholder','open');
  document.getElementById(fieldId+'-pop').classList.remove('show');
  renderHistory();
}
function clearMonthFilter(){
  document.getElementById('filterMonth').value='';
  const btn=document.getElementById('filterMonth-btn');
  btn.textContent='ทุกเดือน'; btn.classList.add('placeholder');
  document.getElementById('filterType').value='all';
  renderHistory();
}

// ─── PIN (สำหรับยืนยันการแก้ไข/ลบข้อมูล แยกจากระบบล็อคอิน) ────────────────────
const PIN_CORRECT='120946';
let pinBuffer='', pinAction=null;
function isAuthed(){return sessionStorage.getItem('grab_authed')==='1';}
function setAuthed(){sessionStorage.setItem('grab_authed','1');updateAuthUI();}
function clearAuthed(){sessionStorage.removeItem('grab_authed');updateAuthUI();}
function updateAuthUI(){
  const btn=document.getElementById('lockBtn'); if(!btn) return;
  btn.textContent=isAuthed()?'🔓 ล็อค':'🔒 ปลดล็อค';
  btn.title=isAuthed()?'กดเพื่อล็อคการแก้ไข':'กดเพื่อปลดล็อคการแก้ไข';
}
function requireAuth(callback){
  if(isAuthed()){callback();return;}
  pinAction={type:'auth',callback}; pinBuffer=''; updatePinDots();
  document.getElementById('pinMsg').textContent='';
  document.getElementById('pinTitle').textContent='🔐 กรอกรหัสเพื่อแก้ไขข้อมูล';
  document.getElementById('pinModal').classList.add('show');
}
function clearAllConfirm(){
  pinAction={type:'clearAll'}; pinBuffer=''; updatePinDots();
  document.getElementById('pinMsg').textContent='';
  document.getElementById('pinTitle').textContent='🗑️ ยืนยันการล้างข้อมูลทั้งหมด';
  document.getElementById('pinModal').classList.add('show');
}
function closePinModal(){pinBuffer='';updatePinDots();document.getElementById('pinMsg').textContent='';document.getElementById('pinModal').classList.remove('show');}
function pinKey(k){
  if(k==='del'){pinBuffer=pinBuffer.slice(0,-1);updatePinDots();document.getElementById('pinMsg').textContent='';return;}
  if(pinBuffer.length>=6) return;
  pinBuffer+=k; updatePinDots();
  if(pinBuffer.length===6){
    if(pinBuffer===PIN_CORRECT){
      closePinModal();
      if(pinAction?.type==='auth'){
        setAuthed(); showToast('🔓 ปลดล็อคแล้ว','green');
        const cb=pinAction.callback; pinAction=null; if(cb) cb();
      } else if(pinAction?.type==='clearAll'){
        showToast('🗑️ กำลังล้างข้อมูล...');
        saveAllRemote([]).then(()=>{localStorage.removeItem(STORAGE_KEY);renderDashboard();renderHistory();showToast('🗑️ ล้างข้อมูลแล้ว');});
        pinAction=null;
      } else if(pinAction?.type==='deleteRow'){
        showToast('🗑️ กำลังลบ...');
        deleteRowRemote(pinAction.id).then(()=>{renderHistory();showToast('🗑️ ลบแล้ว');});
        pinAction=null;
      }
    } else {
      document.querySelectorAll('.pin-dot').forEach(d=>d.classList.add('error'));
      document.getElementById('pinMsg').textContent='❌ รหัสไม่ถูกต้อง';
      setTimeout(()=>{pinBuffer='';updatePinDots();document.querySelectorAll('.pin-dot').forEach(d=>d.classList.remove('error'));document.getElementById('pinMsg').textContent='';},1000);
    }
  }
}
function updatePinDots(){for(let i=0;i<6;i++){const dot=document.getElementById('pd'+i);dot.classList.toggle('filled',i<pinBuffer.length);dot.classList.remove('error');}}

// ─── MISC ─────────────────────────────────────────────────────────────────────
async function manualSync(){
  showToast('🔄 กำลัง sync...');
  await syncFromSheets(); renderDashboard(); renderHistory(); showToast('✅ Sync สำเร็จ','green');
}
function toggleLock(){
  if(isAuthed()){clearAuthed();showToast('🔒 ล็อคแล้ว');}
  else{pinAction={type:'auth',callback:null};pinBuffer='';updatePinDots();document.getElementById('pinMsg').textContent='';document.getElementById('pinTitle').textContent='🔐 กรอกรหัสเพื่อปลดล็อค';document.getElementById('pinModal').classList.add('show');}
}

// ─── APP INIT (เรียกหลังล็อคอินสำเร็จเท่านั้น) ──────────────────────────────
let appInitialized = false;
function initApp(){
  if (appInitialized) return;
  appInitialized = true;
  ['f-grab','f-tip','f-oil'].forEach(id => document.getElementById(id).addEventListener('input', updatePreview));
  document.getElementById('importFile').addEventListener('change', function(e){
    const file=e.target.files[0]; if(!file) return; e.target.value='';
    const reader=new FileReader();
    reader.onload=function(ev){
      try {
        const wb=XLSX.read(ev.target.result,{type:'array',cellDates:false});
        function isDateSerial(v){return typeof v==='number'&&v>40000;}
        function isDateString(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v);}
        function isDateCell(v){return isDateSerial(v)||isDateString(v);}
        let raw=null;
        for(const name of wb.SheetNames){
          const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null});
          if(rows.some(r=>r&&isDateCell(r[0]))){raw=rows;break;}
        }
        if(!raw){showToast('ไม่พบข้อมูลวันที่ในไฟล์','red');return;}
        const firstDataRow=raw.findIndex(r=>r&&isDateCell(r[0]));
        if(firstDataRow<0){showToast('ไม่พบข้อมูล','red');return;}
        const headerRow=firstDataRow>0?raw[firstDataRow-1]:null;
        const headers=(headerRow||[]).map(h=>h?String(h):'');
        function colOf(kws){for(const kw of kws){const i=headers.findIndex(h=>h.includes(kw));if(i>=0)return i;}return -1;}
        const cGrab=colOf(['Grab'])>=0?colOf(['Grab']):1;
        const cTip=colOf(['Tip','tip'])>=0?colOf(['Tip','tip']):2;
        const cOil=colOf(['ค่าน้ำมัน'])>=0?colOf(['ค่าน้ำมัน']):4;
        const cOilReal=colOf(['เติมน้ำมันจริง'])>=0?colOf(['เติมน้ำมันจริง']):5;
        const cCredit=colOf(['เครดิต'])>=0?colOf(['เครดิต']):6;
        const cWithdraw=colOf(['ถอน'])>=0?colOf(['ถอน']):7;
        const cNote=colOf(['หมายเหตุ','note'])>=0?colOf(['หมายเหตุ','note']):9;
        const parsed=[];
        for(let i=firstDataRow;i<raw.length;i++){
          const row=raw[i]; if(!row) continue;
          const dateStr=parseDateVal(row[0]); if(!dateStr) continue;
          parsed.push({id:newId(),date:dateStr,grab:parseFloat(row[cGrab])||0,tip:parseFloat(row[cTip])||0,oil:parseFloat(row[cOil])||0,oilReal:parseFloat(row[cOilReal])||0,credit:parseFloat(row[cCredit])||0,withdraw:parseFloat(row[cWithdraw])||0,note:cNote>=0&&row[cNote]?String(row[cNote]).trim():''});
        }
        if(!parsed.length){showToast('ไม่พบข้อมูล','red');return;}
        pendingImportData=parsed;
        document.getElementById('importCount').textContent=parsed.length;
        document.getElementById('importModal').classList.add('show');
      } catch(err){showToast('เกิดข้อผิดพลาด: '+err.message,'red');console.error(err);}
    };
    reader.readAsArrayBuffer(file);
  });

  tdpSetValue('f-date', new Date().toISOString().slice(0,10));
  updateAuthUI();
  renderDashboard();
  syncFromSheets().then(()=>{renderDashboard();renderHistory();});
}

async function doImport(replaceAll) {
  document.getElementById('importModal').classList.remove('show');
  if(!pendingImportData) return;
  const base=replaceAll?[]:loadData();
  const existDates=new Set(base.map(r=>r.date));
  let added=0,skipped=0;
  for(const row of pendingImportData){
    if(existDates.has(row.date)){skipped++;continue;}
    base.push(row); existDates.add(row.date); added++;
  }
  pendingImportData=null;
  showToast(`⏳ กำลัง sync ${base.length} วัน...`);
  await saveAllRemote(base);
  renderDashboard();
  showToast(replaceAll?`✅ Import สำเร็จ: ${added} วัน`:`✅ Import: ${added} วัน (ข้าม ${skipped} ซ้ำ)`,'green');
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
if (isLoggedIn()) { showApp(); } else { showLogin(); }
