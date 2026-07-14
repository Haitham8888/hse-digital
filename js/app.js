/* ============================================================
   HSE Digital — منطق التطبيق
   SPA خفيف بدون إطار عمل: توجيه بالهاش + تخزين محلي
   ============================================================ */

'use strict';

/* ---------------- التخزين ---------------- */
const DB_KEY = 'hse_mvp_v1';
let DB = null;

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { DB = JSON.parse(raw); migrateDB(); return; }
  } catch (e) { /* تجاهل وأعد البذر */ }
  DB = hseSeed();
  migrateDB();
}

// ترقية قواعد بيانات النسخ السابقة دون فقدان بياناتها
function migrateDB() {
  if (!DB.employees) {
    DB.employees = seedEmployees();
    DB.counters.EMP = DB.employees.length + 1;
    DB.v = 2;
  }
  if (DB.v < 3) {
    DB.employees.forEach(e => { if (e.email === undefined) e.email = ''; });
    DB.settings = DB.settings || {};
    DB.v = 3;
  }
  if (DB.v < 4) {
    // نتائج الفحص الجديدة (مطابقة للنموذج): fit / partial / unfit
    DB.equipment.forEach(e => {
      if (e.ownership === undefined) e.ownership = 'own';
      (e.inspections || []).forEach(i => {
        if (i.result === 'pass') i.result = 'fit';
        if (i.result === 'fail') i.result = 'unfit';
      });
    });
    if ((DB.counters.RA || 0) < 54) DB.counters.RA = 54;
    DB.v = 4;
  }
  if (!DB.employees.some(e => e.role === 'admin')) {
    // حساب الأدمن — يُنشئ الحسابات ويدير النظام
    const adm = { id: 'e0', name: 'Admin', role: 'admin', company: 'SCC', phone: '', email: '', pin: '', active: true };
    DB.employees.unshift(adm);
    DB._pushAdmin = adm.id;
  }
  if (DB.v < 6) {
    // اعتماد الطاقم الحقيقي المستخرج من وثائق المشروع
    DB._pushRoster = applyRealRoster(DB);
    if ((DB.counters.EMP || 0) < 34) DB.counters.EMP = 34;
  }
  if (DB.v < 5) {
    // أعمدة تقييم المخاطر بالنموذج المعتمد (P/S + المتبقي)
    DB.assessments.forEach(ra => {
      if (!ra.refNo) ra.refNo = 'RBC-HSE-' + String(ra.seq).padStart(3, '0');
      if (!ra.assessor) ra.assessor = 'HSE Department';
      (ra.rows || []).forEach(r => {
        if (r.p === undefined) r.p = r.lik ?? 3;
        if (r.s === undefined) r.s = r.sev ?? 3;
        if (r.resP === undefined) r.resP = 1;
        if (r.resS === undefined) r.resS = r.s;
        if (r.consequence === undefined) r.consequence = '';
      });
    });
    DB.v = 5;
  }
  if (DB.v < 7) {
    // الأدمن هو فراس هتان — مدير تشغيل النظام
    const push = DB._pushRoster || (DB._pushRoster = []);
    const adm = DB.employees.find(e => e.id === 'e0');
    if (adm && adm.name === 'Admin') {
      adm.name = 'Feras Hatan'; adm.company = 'RBC';
      push.push('e0');
    }
    const dup = DB.employees.find(e => e.id === 'e16');
    if (dup && dup.active) { dup.active = false; push.push('e16'); }
  }
  if (DB.v < 7) DB.v = 7;
  if (DB.v < 8) {
    // سجلات المنصة الكاملة (حوادث/مخالفات/ملاحظات/توعية/تدقيق/رفع/طلبات/طقس)
    ['incidents', 'violations', 'nearmiss', 'observations', 'tbts',
      'audits', 'ncrs', 'liftings', 'requests', 'weathers'].forEach(k => {
      if (!Array.isArray(DB[k])) DB[k] = [];
    });
    // استكمال الترقيم الفعلي من سجلات المشروع الورقية
    const base = { INC: 15, VIO: 27, NM: 6, SOR: 12, SSA: 9, NCR: 45, REQ: 90, TBT: 1, TRN: 2, MTG: 1, WX: 3, LP: 2 };
    Object.keys(base).forEach(k => {
      if ((DB.counters[k] || 0) < base[k]) DB.counters[k] = base[k];
    });
    DB.v = 8;
  }
  saveDB();
}

// إنشاء الطلبات (تصاريح/تقييمات/معدات): الأدمن ومنشئو التصاريح فقط —
// بقية الأدوار تراجع وتوقع. الوضع المحلي التجريبي مفتوح.
function canCreate() {
  if (!CLOUD.enabled()) return true;
  const e = sessionEmployee();
  if (!e) return false;
  const f = roleFlags(e.role);
  return e.role === 'admin' || e.role === 'creator' || !!(f && f.canCreate);
}
function canInspect() {
  if (!CLOUD.enabled()) return true;
  const e = sessionEmployee();
  if (!e) return false;
  const f = roleFlags(e.role);
  return e.role === 'admin' || e.role === 'creator' || e.role === 'inspector' || !!(f && (f.canInspect || f.canCreate));
}
function blockedCard(msg) {
  return `<div class="card card-pad"><div class="empty">${icon('shield', 30)} ${msg}</div></div>`;
}

/* ---------------- الجلسة: دخول / خروج ---------------- */
const SESSION_KEY = 'hse_session_v1';
// رموز افتراضية حسب الدور — تُستخدم فقط إذا لم يُحدد للموظف رمز شخصي بعد
const DEFAULT_PINS = {
  admin: '9999', creator: '0000', siteManager: '1111', hseSupervisor: '2222',
  consultantEngineer: '3333', hseConsultant: '4444', inspector: '5555',
};
// صلاحيات الإدارة: الأدمن فقط في الوضع السحابي — الوضع المحلي التجريبي مفتوح
function isAdmin() {
  if (!CLOUD.enabled()) return true;
  const e = sessionEmployee();
  return !!(e && e.role === 'admin');
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch (e) { return null; }
}
function setSession(emp) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ empId: emp.id, at: new Date().toISOString() })); }
  catch (e) { /* */ }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* */ }
}
function sessionEmployee() {
  const s = getSession();
  if (!s) return null;
  return DB.employees.find(e => e.id === s.empId && e.active) || null;
}
function loginPinFor(emp) {
  return (emp.pin && String(emp.pin).trim()) || DEFAULT_PINS[emp.role] || '0000';
}
// الدخول مطلوب في الوضع السحابي فقط — الوضع المحلي يبقى تجريبيًا مفتوحًا
function loginRequired() { return CLOUD.enabled() && !sessionEmployee(); }

/* ---------------- اللغة: عربي / English ---------------- */
let LANG = 'ar';
try { LANG = localStorage.getItem('hse_lang') || 'ar'; } catch (e) { /* */ }

const I18N = {
  dash: ['لوحة التحكم', 'Dashboard'],
  permits: ['تصاريح العمل', 'Work Permits'],
  equipment: ['فحص المعدات', 'Equipment'],
  risk: ['تقييم المخاطر', 'Risk Assessment'],
  team: ['إدارة الموظفين', 'Employees'],
  files: ['ملفات المشروع', 'Project Files'],
  newPermit: ['تصريح جديد', 'New Permit'],
  newBtn: ['جديد', 'New'],
  tabDash: ['اللوحة', 'Home'],
  tabPermits: ['التصاريح', 'Permits'],
  tabEq: ['المعدات', 'Equipment'],
  tabRisk: ['المخاطر', 'Risk'],
  st_pending: ['قيد الموافقة', 'PENDING'],
  st_approved: ['معتمد', 'APPROVED'],
  st_rejected: ['مرفوض', 'REJECTED'],
  st_closed: ['مغلق', 'CLOSED'],
  st_extended: ['مُمدَّد', 'EXTENDED'],
  kpiActive: ['تصاريح سارية', 'Active permits'],
  kpiPending: ['قيد الموافقة', 'Awaiting approval'],
  kpiEq: ['معدات تحتاج فحص', 'Equipment due'],
  kpiClosed: ['أُغلقت هذا الأسبوع', 'Closed this week'],
  awaitingYou: ['بانتظار توقيعك', 'Awaiting your signature'],
  myPending: ['تصاريحك قيد الموافقة', 'Your pending permits'],
  latest: ['أحدث التصاريح', 'Latest permits'],
  viewAll: ['عرض الكل', 'View all'],
  signApprove: ['توقيع واعتماد', 'Sign & Approve'],
  rejectNote: ['رفض مع ملاحظة', 'Reject with note'],
  extend: ['تمديد التصريح', 'Extend'],
  closePermit: ['إغلاق التصريح', 'Close permit'],
  printPdf: ['PDF / طباعة', 'Print / PDF'],
  copyLink: ['نسخ الرابط', 'Copy link'],
  archiveDrive: ['أرشفة PDF إلى Drive', 'Archive PDF to Drive'],
  login: ['تسجيل الدخول', 'Sign in'],
  logout: ['تسجيل الخروج', 'Sign out'],
  profile: ['الملف الشخصي', 'My Profile'],
  name: ['الاسم', 'Name'],
  pin: ['الرمز الشخصي (PIN)', 'Personal PIN'],
  enter: ['دخول', 'Sign in'],
  next: ['التالي', 'Next'],
  back: ['رجوع', 'Back'],
  send: ['إرسال للموافقات', 'Submit for approval'],
  approvals: ['سلسلة الموافقات', 'Approval chain'],
  checklist: ['التشيك لست', 'Checklist'],
  addItem: ['إضافة بند', 'Add item'],
  search: ['بحث… (كود / وصف / مبنى)', 'Search… (code / description)'],
  registers: ['السجلات', 'Registers'],
  tabRegs: ['السجلات', 'Registers'],
  regsSub: ['كل نماذج ووثائق السلامة الميدانية', 'All field HSE forms & records'],
  board: ['اللوحة الإحصائية', 'HSE Statistics Board'],
  docs: ['مكتبة الوثائق', 'Document Library'],
  newRecord: ['سجل جديد', 'New record'],
  closeRecord: ['إغلاق السجل', 'Close record'],
  openItems: ['بنود مفتوحة', 'Open items'],
  attendance: ['كشف الحضور والتواقيع', 'Attendance & signatures'],
};
function tr(k) {
  const e = I18N[k];
  return e ? (LANG === 'en' ? e[1] : e[0]) : k;
}
function applyLangChrome() {
  document.documentElement.lang = LANG === 'en' ? 'en' : 'ar';
  document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl';
  const navMap = { dash: tr('dash'), permits: tr('permits'), equipment: tr('equipment'), risk: tr('risk'), registers: tr('registers'), team: tr('team'), files: tr('files'), new: tr('newPermit') };
  const tabMap = { dash: tr('tabDash'), permits: tr('tabPermits'), equipment: tr('tabEq'), risk: tr('tabRisk'), registers: tr('tabRegs'), new: tr('newBtn') };
  $$('.side-nav .js-nav').forEach(a => setNavText(a, navMap[a.dataset.nav]));
  $$('.tab-bar .js-nav').forEach(a => setNavText(a, tabMap[a.dataset.nav]));
  const lb = $('#lang-btn');
  if (lb) lb.textContent = LANG === 'en' ? 'ع' : 'EN';
}
function setNavText(a, label) {
  if (!label) return;
  for (const n of a.childNodes) {
    if (n.nodeType === 3 && n.textContent.trim()) { n.textContent = label; return; }
  }
  a.appendChild(document.createTextNode(label));
}
function toggleLang() {
  LANG = LANG === 'en' ? 'ar' : 'en';
  try { localStorage.setItem('hse_lang', LANG); } catch (e) { /* */ }
  applyLangChrome(); buildRoleSwitcher(); render();
}

const INSP_RESULTS = {
  fit: { en: 'FIT', ar: 'صالحة للعمل', cls: 'pass' },
  partial: { en: 'PARTIALLY FIT', ar: 'صالحة جزئيًا', cls: 'due' },
  unfit: { en: 'UNFIT', ar: 'غير صالحة', cls: 'fail' },
};
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { /* بيئة معاينة بدون تخزين — يستمر العمل في الذاكرة */ }
}
function resetDB() {
  localStorage.removeItem(DB_KEY);
  loadDB();
  toast('تمت إعادة تعيين البيانات التجريبية');
  location.hash = '#/';
  render();
}

/* ---------------- أدوات مساعدة ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function fmtDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysSince(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }

function permitCode(p) {
  return `${HSE.project.codePrefix}-${p.building}-${HSE.permitTypes[p.type].codeTag}-${p.seq}`;
}
function permitStatus(p) {
  if (p.rejection) return 'rejected';
  if (p.closeout) return 'closed';
  if (p.stage >= permitChain(p).length) return 'approved';
  return 'pending';
}
const STATUS_META = {
  pending: { ar: 'قيد الموافقة', cls: 'st-pending' },
  approved: { ar: 'معتمد', cls: 'st-approved' },
  rejected: { ar: 'مرفوض', cls: 'st-rejected' },
  closed: { ar: 'مغلق', cls: 'st-closed' },
};
function stampHTML(p, big = false) {
  const s = permitStatus(p);
  const m = STATUS_META[s];
  const ext = (s === 'approved' && p.extension) ? ` <span class="stamp ${big ? 'big ' : ''}st-extended">${tr('st_extended')}</span>` : '';
  return `<span class="stamp ${big ? 'big ' : ''}${m.cls}">${tr('st_' + s)}</span>${ext}`;
}
/* الأدوار المخصصة — يخزنها الأدمن في سجل إعدادات خاص يتزامن كأي كيان */
function rolesConfig() {
  return DB.employees.find(e => e.id === '_roles') || null;
}
function customRoles() {
  const c = rolesConfig();
  return (c && c.list) || [];
}
function roleOverrides() {
  const c = rolesConfig();
  return (c && c.overrides) || {};
}
function hiddenRoles() {
  const c = rolesConfig();
  return (c && c.hidden) || [];
}
function ensureRolesConfig() {
  let cfg = rolesConfig();
  if (!cfg) {
    cfg = { id: '_roles', role: '_config', name: 'ROLES CONFIG', company: '', phone: '', email: '', active: false, list: [], overrides: {}, hidden: [] };
    DB.employees.push(cfg);
  }
  cfg.list = cfg.list || []; cfg.overrides = cfg.overrides || {}; cfg.hidden = cfg.hidden || [];
  if (!cfg.chain || !cfg.chain.length) cfg.chain = HSE.chain.map(c => c.key);
  if (!cfg.buildings || !cfg.buildings.length) cfg.buildings = HSE.buildings.slice();
  return cfg;
}
function buildingsList() {
  const cfg = rolesConfig();
  return (cfg && cfg.buildings && cfg.buildings.length) ? cfg.buildings : HSE.buildings;
}

/* سلم الاعتماد الحالي (قابل للترتيب من الأدمن) */
function chainRoles() {
  const cfg = rolesConfig();
  const keys = (cfg && cfg.chain && cfg.chain.length) ? cfg.chain : HSE.chain.map(c => c.key);
  return keys.map(k => {
    const base = HSE.chain.find(c => c.key === k);
    const r = allTeamRoles().find(x => x.key === k);
    return { key: k, ar: r ? r.ar : (base ? base.ar : k), en: base ? base.en : ((r && r.ar) || k) };
  });
}
/* سلسلة التصريح: لقطة محفوظة داخله — القديمة تبقى على السلسلة الأصلية */
function permitChain(p) {
  return (p.chain && p.chain.length) ? p.chain : HSE.chain;
}
function allTeamRoles() {
  const ov = roleOverrides(), hid = hiddenRoles();
  return HSE.teamRoles
    .filter(r => !hid.includes(r.key))
    .map(r => ({ ...r, ar: (ov[r.key] && ov[r.key].ar) || r.ar }))
    .concat(customRoles().map(r => ({ key: r.key, ar: r.ar, duty: true, custom: true })));
}
function roleFlags(key) {
  return customRoles().find(r => r.key === key) || null;
}
function roleAr(key) {
  const r = allTeamRoles().find(r => r.key === key);
  return r ? r.ar : key;
}
// الموظف النشط المعيّن على الدور
function empFor(key) {
  return DB.employees.find(e => e.active && e.role === key) || null;
}
function roleName(key) {
  const e = empFor(key);
  if (e) return e.name;
  if (key === 'creator') return HSE.creator.name;
  const c = HSE.chain.find(c => c.key === key);
  return c ? c.name : '';
}
function dotsHTML(p) {
  const st = permitStatus(p);
  return `<span class="appr-dots">${permitChain(p).map((_, i) => {
    if (p.rejection && i === p.stage) return '<i class="stop"></i>';
    if (i < p.stage) return '<i class="done"></i>';
    if (i === p.stage && st === 'pending') return '<i class="now"></i>';
    return '<i></i>';
  }).join('')}</span>`;
}

/* ---------------- الأيقونات ---------------- */
function icon(n, s = 18) {
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    truck: '<path d="M1 8h13v8H1z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="5.5" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 9v5"/><path d="M12 17.5v.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/>',
    print: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    check: '<path d="m4 12 5 5 11-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    pen: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    back: '<path d="m9 6 6 6-6 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
    flame: '<path d="M12 2c1 4-4 6-4 11a4 4 0 0 0 8 0c0-2-1-3.5-1-3.5S17 11 17 13"/>',
    cog: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    lift: '<path d="M4 21h16"/><path d="M8 21V8l8-4v17"/><path d="M12 9h.01M12 13h.01"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  };
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
}

/* ---------------- التنبيهات ---------------- */
function toast(msg) {
  let holder = $('.toast-holder');
  if (!holder) { holder = document.createElement('div'); holder.className = 'toast-holder'; document.body.appendChild(holder); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${icon('check', 16)}<span>${esc(msg)}</span>`;
  holder.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ============================================================
   الموجّه
   ============================================================ */
const routes = [
  { re: /^#?\/?$/, view: viewDashboard, nav: 'dash' },
  { re: /^#\/permits\/new$/, view: viewPermitNew, nav: 'new' },
  { re: /^#\/permits$/, view: viewPermits, nav: 'permits' },
  { re: /^#\/permit\/([^/]+)$/, view: viewPermitDetail, nav: 'permits' },
  { re: /^#\/equipment$/, view: viewEquipment, nav: 'equipment' },
  { re: /^#\/equipment\/new$/, view: viewEquipmentNew, nav: 'equipment' },
  { re: /^#\/equipment\/([^/]+)\/inspect$/, view: viewInspect, nav: 'equipment' },
  { re: /^#\/equipment\/([^/]+)$/, view: viewEquipmentDetail, nav: 'equipment' },
  { re: /^#\/risk\/new$/, view: viewRiskNew, nav: 'risk' },
  { re: /^#\/risk$/, view: viewRisk, nav: 'risk' },
  { re: /^#\/risk\/([^/]+)$/, view: viewRiskDetail, nav: 'risk' },
  { re: /^#\/team\/new$/, view: viewTeamForm, nav: 'team' },
  { re: /^#\/team\/([^/]+)$/, view: viewTeamForm, nav: 'team' },
  { re: /^#\/team$/, view: viewTeam, nav: 'team' },
  { re: /^#\/files$/, view: viewFiles, nav: 'files' },
  { re: /^#\/files\/([^/]+)$/, view: viewFiles, nav: 'files' },
  { re: /^#\/profile$/, view: viewProfile, nav: 'profile' },
];

let pendingHash = null; // الوجهة المطلوبة قبل الدخول (مثل مسح QR)

function render() {
  const hash = location.hash || '#/';
  // بوابة الدخول: كل الشاشات محمية في الوضع السحابي
  if (loginRequired()) {
    if (hash !== '#/' && hash !== '#/login') pendingHash = hash;
    $$('.js-nav').forEach(a => a.classList.remove('active'));
    const main0 = $('#main');
    main0.innerHTML = viewLogin();
    window.scrollTo(0, 0);
    if (afterRender) { const f = afterRender; afterRender = null; f(); }
    return;
  }
  let matched = routes[0], args = [];
  for (const r of routes) {
    const m = hash.match(r.re);
    if (m) { matched = r; args = m.slice(1); break; }
  }
  // تمييز عناصر التنقل
  $$('.js-nav').forEach(a => a.classList.toggle('active', a.dataset.nav === matched.nav));
  const main = $('#main');
  main.innerHTML = matched.view(...args);
  main.scrollTop = 0; window.scrollTo(0, 0);
  if (typeof matched.after === 'function') matched.after();
  // ربط أحداث ما بعد الرسم
  if (afterRender) { const f = afterRender; afterRender = null; f(); }
}
let afterRender = null;

/* ============================================================
   لوحة التحكم
   ============================================================ */
function equipmentDue(eq) {
  const last = eq.inspections[0];
  if (!last) return 'due';
  if (last.result === 'unfit') return 'fail';
  return daysSince(last.date) > 30 ? 'due' : 'ok';
}

function viewDashboard() {
  const ps = DB.permits;
  const today = todayISO();
  const active = ps.filter(p => permitStatus(p) === 'approved' && p.dateTo >= today);
  const pending = ps.filter(p => permitStatus(p) === 'pending');
  const lateEq = DB.equipment.filter(e => equipmentDue(e) !== 'ok');
  const closedWeek = ps.filter(p => p.closeout && daysSince(p.closeout.at) <= 7);

  const role = DB.currentRole;
  const myTurn = pending.filter(p => permitChain(p)[p.stage] && permitChain(p)[p.stage].key === role);

  const recent = [...ps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">${tr('dash')}</div>
      <div class="page-sub">${esc(HSE.project.siteAr)} — ${fmtDate(new Date().toISOString())}</div>
    </div>
    <a class="btn btn-amber" href="#/permits/new">${icon('plus', 16)} ${tr('newPermit')}</a>
  </div>

  <div class="kpis">
    <div class="kpi" style="--kc:var(--green)"><div class="n">${active.length}</div><div class="l">${tr('kpiActive')}</div><div class="s">معتمدة وضمن مدتها</div></div>
    <div class="kpi" style="--kc:var(--amber)"><div class="n">${pending.length}</div><div class="l">${tr('kpiPending')}</div><div class="s">في سلسلة التواقيع</div></div>
    <div class="kpi" style="--kc:var(--red)"><div class="n">${lateEq.length}</div><div class="l">${tr('kpiEq')}</div><div class="s">متأخرة أو موقوفة</div></div>
    <div class="kpi" style="--kc:var(--slate)"><div class="n">${closedWeek.length}</div><div class="l">${tr('kpiClosed')}</div><div class="s">مكتملة ومؤرشفة</div></div>
  </div>

  ${role !== 'creator' ? `
  <div class="card" style="margin-top:14px">
    <div class="card-head">${icon('pen', 17)} ${tr('awaitingYou')} <span class="chip">${roleAr(role)}</span><span class="spacer"></span></div>
    ${myTurn.length ? `<div class="row-list">${myTurn.map(rowPermit).join('')}</div>`
      : `<div class="empty">${icon('check', 30)} لا توجد تصاريح بانتظار توقيعك الآن</div>`}
  </div>` : `
  <div class="card" style="margin-top:14px">
    <div class="card-head">${icon('clock', 17)} ${tr('myPending')}<span class="spacer"></span></div>
    ${pending.length ? `<div class="row-list">${pending.map(rowPermit).join('')}</div>`
      : `<div class="empty">${icon('check', 30)} لا توجد تصاريح قيد الموافقة</div>`}
  </div>`}

  <div class="card">
    <div class="card-head">${icon('history', 17)} ${tr('latest')}<span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/permits">${tr('viewAll')} ${icon('back', 13)}</a></div>
    <div class="row-list">${recent.map(rowPermit).join('')}</div>
  </div>

  ${lateEq.length ? `
  <div class="card">
    <div class="card-head">${icon('alert', 17)} معدات تحتاج انتباه<span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/equipment">المعدات ${icon('back', 13)}</a></div>
    <div class="row-list">
      ${lateEq.map(e => {
        const st = equipmentDue(e);
        return `<div class="row-item" onclick="location.hash='#/equipment/${e.id}'">
          <div class="eq-ic">${icon(HSE.equipmentTypes[e.type].icon, 20)}</div>
          <div class="row-main">
            <div class="row-title">${esc(HSE.equipmentTypes[e.type].ar)} — ${esc(e.model)}</div>
            <div class="row-meta"><span class="mono">${e.code}</span><span>${esc(e.location)}</span></div>
          </div>
          <span class="insp-badge ${st === 'fail' ? 'fail' : 'due'}">${st === 'fail' ? 'موقوفة' : 'فحص متأخر'}</span>
        </div>`;
      }).join('')}
    </div>
  </div>` : ''}

  <div class="card">
    <div class="row-item" onclick="location.hash='#/files'">
      <div class="eq-ic" style="background:var(--amber-soft);color:var(--amber-ink)">${icon('grid', 20)}</div>
      <div class="row-main">
        <div class="row-title">ملفات المشروع — Google Drive</div>
        <div class="row-meta"><span>PTW القديمة · تقييمات المخاطر · الأرشيف · كل المجلدات</span></div>
      </div>
      ${icon('back', 16)}
    </div>
  </div>`;
}

function rowPermit(p) {
  const t = HSE.permitTypes[p.type];
  return `<div class="row-item" onclick="location.hash='#/permit/${p.id}'">
    <div class="row-main">
      <div class="row-code">${permitCode(p)}</div>
      <div class="row-title">${esc(p.descAr || p.desc)}</div>
      <div class="row-meta">
        <span class="chip ${p.type === 'H' ? 'hot' : ''}">${t.ar}</span>
        <span>${esc(p.building)}</span>
        <span class="mono">${fmtDate(p.dateFrom)}</span>
      </div>
    </div>
    <div class="row-side">${stampHTML(p)}${dotsHTML(p)}</div>
  </div>`;
}

/* ============================================================
   قائمة التصاريح
   ============================================================ */
let permitFilter = { q: '', status: 'all', type: 'all' };

function viewPermits() {
  const f = permitFilter;
  let list = [...DB.permits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (f.type !== 'all') list = list.filter(p => p.type === f.type);
  if (f.status !== 'all') list = list.filter(p => permitStatus(p) === f.status);
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(p =>
      permitCode(p).toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      (p.descAr || '').toLowerCase().includes(q) ||
      p.building.toLowerCase().includes(q));
  }

  afterRender = () => {
    $('#pf-q').addEventListener('input', e => { permitFilter.q = e.target.value; refreshPermitList(); });
    $('#pf-status').addEventListener('change', e => { permitFilter.status = e.target.value; refreshPermitList(); });
    $('#pf-type').addEventListener('change', e => { permitFilter.type = e.target.value; refreshPermitList(); });
  };

  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">${tr('permits')}</div>
      <div class="page-sub">السجل الكامل — بحث فوري بالكود أو الوصف أو المبنى</div>
    </div>
    <a class="btn btn-amber" href="#/permits/new">${icon('plus', 16)} ${tr('newBtn')}</a>
  </div>

  <div class="filters">
    <label class="search">${icon('search', 16)}<input id="pf-q" placeholder="${tr('search')}" value="${esc(f.q)}"></label>
    <select id="pf-status">
      <option value="all" ${f.status === 'all' ? 'selected' : ''}>كل الحالات</option>
      <option value="pending" ${f.status === 'pending' ? 'selected' : ''}>قيد الموافقة</option>
      <option value="approved" ${f.status === 'approved' ? 'selected' : ''}>معتمد</option>
      <option value="rejected" ${f.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
      <option value="closed" ${f.status === 'closed' ? 'selected' : ''}>مغلق</option>
    </select>
    <select id="pf-type">
      <option value="all" ${f.type === 'all' ? 'selected' : ''}>كل الأنواع</option>
      <option value="G" ${f.type === 'G' ? 'selected' : ''}>عام PTW.G</option>
      <option value="H" ${f.type === 'H' ? 'selected' : ''}>ساخن PTW.H</option>
    </select>
  </div>

  <div class="card"><div class="row-list" id="permit-list">
    ${list.length ? list.map(rowPermit).join('') : `<div class="empty">${icon('search', 30)} لا توجد نتائج مطابقة</div>`}
  </div></div>`;
}

function refreshPermitList() {
  const f = permitFilter;
  let list = [...DB.permits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (f.type !== 'all') list = list.filter(p => p.type === f.type);
  if (f.status !== 'all') list = list.filter(p => permitStatus(p) === f.status);
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(p =>
      permitCode(p).toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      (p.descAr || '').toLowerCase().includes(q) ||
      p.building.toLowerCase().includes(q));
  }
  $('#permit-list').innerHTML = list.length ? list.map(rowPermit).join('') : `<div class="empty">${icon('search', 30)} لا توجد نتائج مطابقة</div>`;
}

/* ============================================================
   إنشاء تصريح — معالج من 3 خطوات
   ============================================================ */
let draft = null;

function newDraft() {
  return {
    step: 1, type: 'G', building: 'B02', discipline: 'Civil',
    desc: '', descAr: '', equipment: '', workers: [],
    dateFrom: todayISO(), dateTo: todayISO(), timeFrom: '07:00', timeTo: '16:00',
    checklist: [], items: null, itemsType: null,
  };
}

function viewPermitNew() {
  if (!canCreate()) return blockedCard('إنشاء التصاريح صلاحية مدير النظام ومنشئي التصاريح — دورك المراجعة والتوقيع، وستصلك الطلبات في «بانتظار توقيعك»');
  if (!draft) draft = newDraft();
  const d = draft;
  const t = HSE.permitTypes[d.type];
  const nextSeq = DB.counters[d.type];
  const codePreview = `${HSE.project.codePrefix}-${d.building}-${t.codeTag}-<b>${nextSeq}</b>`;

  const steps = `
  <div class="wizard-steps">
    <div class="ws ${d.step === 1 ? 'on' : 'done'}">1 · البيانات</div>
    <div class="ws ${d.step === 2 ? 'on' : d.step > 2 ? 'done' : ''}">2 · التشيك لست</div>
    <div class="ws ${d.step === 3 ? 'on' : ''}">3 · المراجعة والإرسال</div>
  </div>`;

  if (d.step === 1) {
    afterRender = bindStep1;
    return `
    <div class="page-head"><div class="grow">
      <div class="page-title">تصريح عمل جديد</div>
      <div class="page-sub">يُولَّد الكود تلقائيًا حسب النوع والمبنى</div>
    </div></div>
    ${steps}
    <div class="card card-pad">
      <div class="code-preview" id="code-preview">${codePreview}</div>
      <div class="divider"></div>
      <div class="form-grid">
        <div class="field"><label>نوع التصريح</label>
          <select id="f-type">
            <option value="G" ${d.type === 'G' ? 'selected' : ''}>عام — General (PTW.G)</option>
            <option value="H" ${d.type === 'H' ? 'selected' : ''}>أعمال ساخنة — Hot Work (PTW.H)</option>
          </select></div>
        <div class="field"><label>المبنى / الموقع</label>
          <select id="f-building">${buildingsList().map(b => `<option ${b === d.building ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div class="field"><label>التخصص</label>
          <select id="f-discipline">${HSE.disciplines.map(x => `<option value="${x.en}" ${x.en === d.discipline ? 'selected' : ''}>${x.ar} — ${x.en}</option>`).join('')}</select></div>
        <div class="field"><label>المعدات المستخدمة <small>(اختياري)</small></label>
          <input type="text" id="f-equipment" value="${esc(d.equipment)}" placeholder="Loader, Dumper, Compactor…"></div>
        <div class="field full"><label>وصف العمل والموقع <small>Description & Location (EN)</small></label>
          <textarea id="f-desc" placeholder="Backfilling work at (B02) between …" dir="ltr">${esc(d.desc)}</textarea></div>
        <div class="field full"><label>الوصف بالعربية <small>(يظهر في التطبيق)</small></label>
          <input type="text" id="f-descAr" value="${esc(d.descAr)}" placeholder="أعمال ردم في المبنى B02…"></div>
        <div class="field"><label>من تاريخ</label><input type="date" id="f-dateFrom" value="${d.dateFrom}"></div>
        <div class="field"><label>إلى تاريخ</label><input type="date" id="f-dateTo" value="${d.dateTo}"></div>
        <div class="field"><label>من الساعة</label><input type="time" id="f-timeFrom" value="${d.timeFrom}"></div>
        <div class="field"><label>إلى الساعة</label><input type="time" id="f-timeTo" value="${d.timeTo}"></div>
        <div class="field full"><label>العمال المنفذون <small>Name of persons carrying out work</small></label>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <select id="f-worker-sel" style="flex:1"></select>
            <button class="btn btn-sm" id="f-worker-add-sel" type="button">${icon('plus', 14)} إضافة</button>
          </div>
          <div style="display:flex;gap:8px">
            <input type="text" id="f-worker" placeholder="أو اكتب اسمًا غير مسجل…" style="flex:1" dir="ltr">
            <button class="btn btn-sm" id="f-worker-add" type="button">${icon('plus', 14)} إضافة</button>
          </div>
          <div class="workers-chips" id="f-workers" style="margin-top:8px">${draftWorkersHTML()}</div>
          <div class="hint">القائمة من <a href="#/team" style="color:var(--blue)">سجل الموظفين</a> — دور «عامل تنفيذ»</div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="action-bar">
        <button class="btn btn-ghost" onclick="draft=null;location.hash='#/permits'">إلغاء</button>
        <button class="btn btn-amber" id="f-next">${tr('next')}: ${tr('checklist')} ${icon('back', 15)}</button>
      </div>
    </div>`;
  }

  if (d.step === 2) {
    // بنود قابلة للتحرير: نسخة خاصة بهذا التصريح من قالب النوع
    if (!d.items || d.itemsType !== d.type) {
      d.items = t.checklist.map(x => ({ ...x }));
      d.itemsType = d.type;
      d.checklist = d.items.map(() => 0);
    }
    afterRender = bindStep2;
    return `
    <div class="page-head"><div class="grow">
      <div class="page-title">${t.ar} — التشيك لست</div>
      <div class="page-sub mono" style="direction:ltr;text-align:end">${HSE.project.codePrefix}-${d.building}-${t.codeTag}-${nextSeq}</div>
    </div></div>
    ${steps}
    <div class="card card-pad">
      ${d.items.map((item, i) => `
        <div class="ck-item">
          <div class="ck-no">${i + 1}</div>
          <div class="ck-text">
            <div class="ar">${esc(item.ar)}</div><div class="en">${esc(item.en)}</div>
            <div style="margin-top:3px">
              <button class="btn btn-sm btn-ghost js-ck-edit" data-i="${i}" style="padding:1px 8px;font-size:11px">${icon('pen', 11)} تعديل</button>
              <button class="btn btn-sm btn-ghost js-ck-del" data-i="${i}" style="padding:1px 8px;font-size:11px;color:var(--red)">${icon('x', 11)} حذف</button>
            </div>
          </div>
          <div class="seg3" data-i="${i}">
            <button class="yes ${d.checklist[i] === 1 ? 'on' : ''}" data-v="1">YES</button>
            <button class="no ${d.checklist[i] === 2 ? 'on' : ''}" data-v="2">NO</button>
            <button class="na ${d.checklist[i] === 3 ? 'on' : ''}" data-v="3">N/A</button>
          </div>
        </div>`).join('')}
      <div class="divider"></div>
      <div style="display:flex;gap:8px">
        <input type="text" id="ck-new" placeholder="${tr('addItem')}…" style="flex:1;border:1px solid var(--line-2);border-radius:7px;padding:8px 12px">
        <button class="btn btn-sm" id="ck-add" type="button">${icon('plus', 14)} ${tr('addItem')}</button>
      </div>
      <div class="divider"></div>
      <div class="action-bar">
        <button class="btn" id="f-back">${icon('back', 15)} ${tr('back')}</button>
        <button class="btn btn-amber" id="f-next2">${tr('next')}</button>
      </div>
    </div>`;
  }

  // step 3 — review
  afterRender = bindStep3;
  return `
  <div class="page-head"><div class="grow">
    <div class="page-title">مراجعة وإرسال</div>
    <div class="page-sub">راجع البيانات ثم أرسل التصريح لسلسلة الموافقات</div>
  </div></div>
  ${steps}
  <div class="card card-pad">
    <div class="code-preview">${codePreview}</div>
    <div class="divider"></div>
    <div class="kv">
      <div><div class="k">النوع</div><div class="v">${t.ar}</div></div>
      <div><div class="k">المبنى</div><div class="v mono">${esc(d.building)}</div></div>
      <div><div class="k">التخصص</div><div class="v">${esc(d.discipline)}</div></div>
      <div><div class="k">التاريخ</div><div class="v mono">${fmtDate(d.dateFrom)} → ${fmtDate(d.dateTo)}</div></div>
      <div><div class="k">الوقت</div><div class="v mono">${d.timeFrom} → ${d.timeTo}</div></div>
      <div><div class="k">المعدات</div><div class="v">${esc(d.equipment || '—')}</div></div>
    </div>
    <div style="margin-top:12px">
      <div class="kv" style="grid-template-columns:1fr">
        <div><div class="k">الوصف</div><div class="v" dir="ltr" style="text-align:start">${esc(d.desc || d.descAr)}</div></div>
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-size:13px;font-weight:700;margin-bottom:6px">سلسلة الموافقات المطلوبة:</div>
    <div class="tl">
      ${chainRoles().map((c) => `<div class="tl-step"><div class="tl-node">${icon('clock', 12)}</div>
        <div class="tl-role">${roleAr(c.key)}</div><div class="tl-name">${esc(roleName(c.key))}</div></div>`).join('')}
    </div>
    <div class="divider"></div>
    <div class="action-bar">
      <button class="btn" id="f-back3">${icon('back', 15)} ${tr('back')}</button>
      <button class="btn btn-green" id="f-submit">${icon('send', 15)} ${tr('send')}</button>
    </div>
  </div>`;
}

function draftWorkersHTML() {
  return draft.workers.map((w, i) =>
    `<span class="wchip">${esc(w)} <button data-i="${i}" class="js-worker-del">${icon('x', 12)}</button></span>`).join('')
    || '<span class="hint">لم تتم إضافة عمال بعد</span>';
}

function bindStep1() {
  const d = draft;
  const upd = () => {
    d.type = $('#f-type').value; d.building = $('#f-building').value;
    d.discipline = $('#f-discipline').value; d.equipment = $('#f-equipment').value;
    d.desc = $('#f-desc').value; d.descAr = $('#f-descAr').value;
    d.dateFrom = $('#f-dateFrom').value; d.dateTo = $('#f-dateTo').value;
    d.timeFrom = $('#f-timeFrom').value; d.timeTo = $('#f-timeTo').value;
    const t = HSE.permitTypes[d.type];
    $('#code-preview').innerHTML = `${HSE.project.codePrefix}-${d.building}-${t.codeTag}-<b>${DB.counters[d.type]}</b>`;
  };
  ['f-type', 'f-building', 'f-discipline', 'f-equipment', 'f-desc', 'f-descAr', 'f-dateFrom', 'f-dateTo', 'f-timeFrom', 'f-timeTo']
    .forEach(id => $('#' + id).addEventListener('input', upd));

  // قائمة العمال من سجل الموظفين
  const refreshWorkerSel = () => {
    const sel = $('#f-worker-sel');
    const avail = DB.employees.filter(e => e.active && e.role === 'worker' && !d.workers.includes(e.name));
    sel.innerHTML = `<option value="">اختر من سجل الموظفين… (${avail.length})</option>` +
      avail.map(e => `<option value="${esc(e.name)}">${esc(e.name)} — ${esc(e.company)}</option>`).join('');
  };
  const refreshChips = () => {
    $('#f-workers').innerHTML = draftWorkersHTML();
    bindWorkerDel(refreshWorkerSel);
    refreshWorkerSel();
  };
  $('#f-worker-add-sel').addEventListener('click', () => {
    const v = $('#f-worker-sel').value;
    if (!v) return;
    d.workers.push(v); refreshChips();
  });
  const addWorker = () => {
    const v = $('#f-worker').value.trim();
    if (!v) return;
    d.workers.push(v); $('#f-worker').value = '';
    refreshChips();
  };
  $('#f-worker-add').addEventListener('click', addWorker);
  $('#f-worker').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addWorker(); } });
  bindWorkerDel(refreshWorkerSel);
  refreshWorkerSel();

  $('#f-next').addEventListener('click', () => {
    upd();
    if (!d.desc.trim() && !d.descAr.trim()) { toast('اكتب وصف العمل أولًا'); return; }
    if (!d.workers.length) { toast('أضِف اسم عامل واحد على الأقل'); return; }
    d.step = 2; render();
  });
}
function bindWorkerDel(onChange) {
  $$('.js-worker-del').forEach(b => b.addEventListener('click', () => {
    draft.workers.splice(+b.dataset.i, 1);
    $('#f-workers').innerHTML = draftWorkersHTML(); bindWorkerDel(onChange);
    if (onChange) onChange();
  }));
}

function bindStep2() {
  $$('.js-ck-edit').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    const cur = draft.items[i];
    const v = prompt('عدّل نص البند:', cur.ar || cur.en);
    if (v === null || !v.trim()) return;
    cur.ar = v.trim();
    render();
  }));
  $$('.js-ck-del').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    if (draft.items.length <= 1) { toast('لا يمكن حذف كل البنود'); return; }
    draft.items.splice(i, 1);
    draft.checklist.splice(i, 1);
    render();
  }));
  $('#ck-add').addEventListener('click', () => {
    const v = $('#ck-new').value.trim();
    if (!v) return;
    draft.items.push({ ar: v, en: '' });
    draft.checklist.push(0);
    render();
  });
  $$('.seg3').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const i = +seg.dataset.i;
      draft.checklist[i] = +b.dataset.v;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
    });
  });
  $('#f-back').addEventListener('click', () => { draft.step = 1; render(); });
  $('#f-next2').addEventListener('click', () => {
    if (draft.checklist.some(v => v === 0)) { toast('أجب على جميع بنود التشيك لست'); return; }
    draft.step = 3; render();
  });
}

function bindStep3() {
  $('#f-back3').addEventListener('click', () => { draft.step = 2; render(); });
  $('#f-submit').addEventListener('click', async () => {
    const d = draft;
    const btn = $('#f-submit');
    // نافذة واتساب تُفتح ضمن إيماءة النقر (قبل أي await) حتى لا يحجبها المتصفح
    const waWin = window.open('about:blank', '_blank');
    let seq;
    if (CLOUD.enabled()) {
      // الكود يُحجز مركزيًا من الخادم — لا تعارض بين المستخدمين
      btn.disabled = true; btn.textContent = 'جارٍ إصدار الكود…';
      try {
        seq = await CLOUD.nextSeq(d.type);
        DB.counters[d.type] = Math.max(DB.counters[d.type], seq + 1);
      } catch (e) {
        btn.disabled = false; btn.innerHTML = `${icon('send', 15)} إرسال للموافقات`;
        toast('تعذر الاتصال بالخادم — إصدار الكود يتطلب إنترنت');
        if (waWin && !waWin.closed) waWin.close();
        return;
      }
    } else {
      seq = DB.counters[d.type]++;
    }
    const p = {
      id: 'p' + Date.now().toString(36),
      type: d.type, seq, building: d.building, discipline: d.discipline,
      desc: d.desc.trim(), descAr: d.descAr.trim(), equipment: d.equipment.trim(),
      workers: d.workers,
      dateFrom: d.dateFrom, dateTo: d.dateTo, timeFrom: d.timeFrom, timeTo: d.timeTo,
      checklist: d.checklist, items: d.items, stage: 0,
      chain: chainRoles(),
      approvals: chainRoles().map(() => null),
      rejection: null, extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: new Date().toISOString(),
    };
    p.code = permitCode(p);
    DB.permits.push(p); saveDB();
    CLOUD.push('permits', p);
    draft = null;
    toast(`تم إنشاء التصريح ${p.code}`);
    location.hash = '#/permit/' + p.id;
    waNotifyNext(p, waWin); // تنبيه أول معتمد فور الإرسال
  });
}

/* ---------------- المرفقات: صور ومقاطع (حتى 10) ---------------- */
const MEDIA_MAX = 10;
function fileToDataURL(f) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
}
async function compressImage(file) {
  const durl = await fileToDataURL(file);
  const img = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = durl; });
  const s = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}
async function addMediaFiles(files, media) {
  for (const f of files) {
    if (media.length >= MEDIA_MAX) { toast('الحد الأقصى 10 مرفقات'); break; }
    if (f.type.startsWith('video')) {
      if (!CLOUD.enabled()) { toast('رفع المقاطع يتطلب تفعيل الخلفية'); continue; }
      if (f.size > 12 * 1024 * 1024) { toast('المقطع أكبر من 12MB — قصّه أو اضغطه'); continue; }
      toast('جارٍ رفع المقطع…');
      try {
        const durl = await fileToDataURL(f);
        const r = await CLOUD.api({ action: 'upload', name: f.name, mime: f.type, data: durl.split(',')[1] }, 240000);
        media.push({ kind: 'video', url: r.url, id: r.id || '', name: f.name });
      } catch (e) { toast('تعذر رفع المقطع'); }
    } else {
      const durl = await compressImage(f);
      if (CLOUD.enabled()) {
        try {
          const r = await CLOUD.api({ action: 'upload', name: f.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', data: durl.split(',')[1] }, 120000);
          media.push({ kind: 'image', url: r.url, id: r.id || '', name: f.name });
        } catch (e) { toast('تعذر رفع الصورة'); }
      } else {
        media.push({ kind: 'image', url: durl, id: '', name: f.name });
      }
    }
  }
}
function mediaThumb(m) {
  const src = m.id ? `https://drive.google.com/thumbnail?id=${esc(m.id)}&sz=w300` : m.url;
  if (m.kind === 'image') {
    return `<a href="${esc(m.url)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="" style="width:74px;height:74px;object-fit:cover;border-radius:7px;border:1px solid var(--line)"></a>`;
  }
  return `<a href="${esc(m.url)}" target="_blank" rel="noopener" style="width:74px;height:74px;border-radius:7px;border:1px solid var(--line);display:grid;place-items:center;background:var(--slate-soft);font-size:22px">▶</a>`;
}
function mediaGridHTML(media, delClass) {
  const list = media || [];
  if (!list.length) return '<span class="hint">لا مرفقات بعد</span>';
  return `<div style="display:flex;flex-wrap:wrap;gap:8px">${list.map((m, i) =>
    `<div style="position:relative">${mediaThumb(m)}${delClass ? `<button class="${delClass}" data-i="${i}" style="position:absolute;top:-6px;inset-inline-end:-6px;width:20px;height:20px;border-radius:50%;border:0;background:var(--red);color:#fff;font-size:11px;line-height:1">×</button>` : ''}</div>`
  ).join('')}</div>`;
}

/* تنبيه واتساب للمعتمد الذي عليه الدور — يُفتح تلقائيًا بعد التوقيع/الإرسال */
function waNotifyNext(p, preWin) {
  const pch = permitChain(p);
  if (permitStatus(p) !== 'pending' || !pch[p.stage]) {
    if (preWin && !preWin.closed) preWin.close();
    return;
  }
  const c = pch[p.stage];
  const emp = empFor(c.key);
  const phone = emp && emp.phone ? emp.phone.replace(/[^0-9]/g, '') : '';
  const url = location.origin + location.pathname + '#/permit/' + p.id;
  const msg = `تصريح عمل بانتظار موافقتك\n${permitCode(p)}\n${p.descAr || p.desc}\nالموقع: ${p.building} · ${fmtDate(p.dateFrom)}\nدورك الآن: ${roleAr(c.key)}\n${url}`;
  const full = (phone ? `https://wa.me/${phone}?text=` : 'https://wa.me/?text=') + encodeURIComponent(msg);
  if (preWin && !preWin.closed) preWin.location.href = full;
  else window.open(full, '_blank');
}

/* ============================================================
   تفاصيل التصريح
   ============================================================ */
function viewPermitDetail(id) {
  const p = DB.permits.find(x => x.id === id);
  if (!p) return `<div class="empty">التصريح غير موجود</div>`;
  const t = HSE.permitTypes[p.type];
  const st = permitStatus(p);
  const role = DB.currentRole;
  const pch = permitChain(p);
  const myTurn = st === 'pending' && pch[p.stage] && pch[p.stage].key === role;
  const lastKey = pch[pch.length - 1] ? pch[pch.length - 1].key : '';
  const canCloseout = st === 'approved' && !p.closeout && (isAdmin() || role === lastKey || ['consultantEngineer', 'hseConsultant'].includes(role));
  const canExtend = st === 'approved' && !p.closeout && role !== 'creator';
  const ansCls = ['', 'yes', 'no', 'na'], ansTxt = ['—', 'YES', 'NO', 'N/A'];

  afterRender = () => bindPermitDetail(p);

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/permits" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">${permitCode(p)}</div>
      <div class="page-title" style="font-size:17px">${esc(p.descAr || p.desc)}</div>
      <div class="page-sub"><span class="chip ${p.type === 'H' ? 'hot' : ''}">${t.ar}</span> أنشأه ${esc(p.createdBy)} · ${fmtDT(p.createdAt)}</div>
    </div>
    <div>${stampHTML(p, true)}</div>
  </div>

  <div class="card card-pad">
    <div class="kv">
      <div><div class="k">المبنى</div><div class="v mono">${esc(p.building)}</div></div>
      <div><div class="k">التخصص</div><div class="v">${esc(p.discipline)}</div></div>
      <div><div class="k">المعدات</div><div class="v">${esc(p.equipment || '—')}</div></div>
      <div><div class="k">التاريخ</div><div class="v mono">${fmtDate(p.dateFrom)} → ${fmtDate(p.dateTo)}</div></div>
      <div><div class="k">الوقت</div><div class="v mono">${p.timeFrom} → ${p.timeTo}${p.extension ? ` <span class="stamp st-extended" style="font-size:10px">مُمدَّد حتى ${p.extension.to}</span>` : ''}</div></div>
      <div><div class="k">العمال</div><div class="v">${p.workers.map(esc).join('، ')}</div></div>
    </div>
    ${p.desc ? `<div style="margin-top:10px" class="hint" dir="ltr">${esc(p.desc)}</div>` : ''}
  </div>

  <div class="card">
    <div class="card-head">${icon('check', 17)} ${tr('checklist')}</div>
    <div class="card-pad" style="padding-top:6px">
      ${(p.items || t.checklist).map((item, i) => `
        <div class="ck-item">
          <div class="ck-no">${i + 1}</div>
          <div class="ck-text"><div class="ar">${esc(item.ar || item.en)}</div></div>
          <span class="ck-ans ${ansCls[p.checklist[i]]}">${ansTxt[p.checklist[i]]}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-head">${icon('pen', 17)} ${tr('approvals')}</div>
    <div class="card-pad">
      <div class="tl">
        ${pch.map((c, i) => {
          const a = p.approvals[i];
          const rejectedHere = p.rejection && p.stage === i;
          const cls = a ? 'done' : rejectedHere ? 'stop' : (st === 'pending' && p.stage === i) ? 'now' : '';
          return `<div class="tl-step ${cls}">
            <div class="tl-node">${a ? icon('check', 12) : rejectedHere ? icon('x', 12) : icon('clock', 12)}</div>
            <div class="tl-role">${roleAr(c.key)} <span class="tl-name">— ${esc(a ? a.name : roleName(c.key))}</span></div>
            ${a ? `<div class="tl-when">وقّع في ${fmtDT(a.at)}</div><div class="tl-sig"><img src="${a.sig}" alt="توقيع"></div>` : ''}
            ${rejectedHere ? `<div class="tl-note"><b>رفض — ${esc(p.rejection.by)}:</b> ${esc(p.rejection.note)}<div class="tl-when">${fmtDT(p.rejection.at)}</div></div>` : ''}
            ${!a && !rejectedHere && st === 'pending' && p.stage === i ? `<div class="tl-wait">دوره الآن — بانتظار التوقيع</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${p.extension ? `<div class="divider"></div>
        <div style="font-size:13px"><b>تمديد التصريح:</b> من <span class="mono">${p.extension.from}</span> إلى <span class="mono">${p.extension.to}</span> — ${esc(p.extension.by)} <span class="tl-when">(${fmtDT(p.extension.at)})</span></div>` : ''}
      ${p.closeout ? `<div class="divider"></div>
        <div style="font-size:13px"><b>إغلاق التصريح:</b> ${esc(p.closeout.note)}<br>
        <span class="tl-when">${fmtDate(p.closeout.date)} ${p.closeout.time} — ${esc(p.closeout.by)}</span></div>` : ''}
    </div>
  </div>

  <div class="card card-pad">
    <div class="action-bar">
      ${myTurn ? `
        <button class="btn btn-green" id="a-sign">${icon('pen', 15)} ${tr('signApprove')}</button>
        <button class="btn btn-red-o" id="a-reject">${icon('x', 15)} ${tr('rejectNote')}</button>` : ''}
      ${st === 'pending' && !myTurn ? `
        <button class="btn" id="a-notify">${icon('send', 15)} تنبيه ${roleAr(pch[p.stage].key)} عبر واتساب</button>` : ''}
      ${canExtend ? `<button class="btn" id="a-extend">${icon('clock', 15)} ${tr('extend')}</button>` : ''}
      ${canCloseout ? `<button class="btn btn-dark" id="a-close">${icon('check', 15)} ${tr('closePermit')}</button>` : ''}
      ${st === 'rejected' ? `<button class="btn btn-amber" id="a-reissue">${icon('copy', 15)} إعادة الإصدار بكود جديد</button>` : ''}
      <button class="btn" id="a-print">${icon('print', 15)} ${tr('printPdf')}</button>
      ${CLOUD.enabled() && (st === 'approved' || st === 'closed') ? `<button class="btn" id="a-archive">${icon('doc', 15)} ${tr('archiveDrive')}</button>` : ''}
      ${p.driveUrl ? `<a class="btn btn-ghost" href="${esc(p.driveUrl)}" target="_blank" rel="noopener">${icon('doc', 15)} النسخة المؤرشفة في Drive</a>` : ''}
      <button class="btn btn-ghost" id="a-copy">${icon('copy', 15)} ${tr('copyLink')}</button>
    </div>
    ${myTurn ? `<div class="hint" style="margin-top:8px">أنت الآن بدور: <b>${roleAr(role)}</b> — توقيعك سيُسجَّل بالاسم والتاريخ والوقت.</div>` : ''}
  </div>`;
}

function bindPermitDetail(p) {
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

  on('#a-sign', () => openSignature({
    title: `توقيع ${roleAr(DB.currentRole)}`,
    name: currentUserName(),
    onDone: (dataURL) => {
      p.approvals[p.stage] = { role: DB.currentRole, name: currentUserName(), sig: dataURL, at: new Date().toISOString() };
      p.stage++;
      saveDB(); CLOUD.push('permits', p); render();
      if (p.stage >= permitChain(p).length) {
        toast('اكتملت الموافقات — التصريح معتمد ✓');
      } else {
        toast('تم التوقيع — جارٍ فتح واتساب لتنبيه المعتمد التالي');
        waNotifyNext(p); // توقيع + تنبيه بضغطة واحدة
      }
    },
  }));

  on('#a-reject', () => {
    const note = prompt('سبب الرفض (سيظهر للمنشئ وفي السجل):');
    if (!note || !note.trim()) return;
    p.rejection = { by: currentUserName(), role: DB.currentRole, note: note.trim(), at: new Date().toISOString() };
    saveDB(); CLOUD.push('permits', p); render();
    toast('تم تسجيل الرفض');
  });

  on('#a-notify', () => waNotifyNext(p));

  on('#a-extend', () => {
    const from = prompt('تمديد من الساعة:', p.timeTo || '16:00'); if (!from) return;
    const to = prompt('إلى الساعة:', '19:00'); if (!to) return;
    openSignature({
      title: 'توقيع التمديد', name: currentUserName(),
      onDone: (sig) => {
        p.extension = { from, to, by: currentUserName(), sig, at: new Date().toISOString() };
        saveDB(); CLOUD.push('permits', p); render(); toast('تم تمديد التصريح');
      },
    });
  });

  on('#a-close', () => {
    openSignature({
      title: 'إغلاق التصريح — توقيع الاستشاري', name: currentUserName(),
      onDone: (sig) => {
        const now = new Date();
        p.closeout = {
          date: todayISO(),
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          note: 'All work completed and area has been cleared.',
          by: currentUserName(), sig, at: now.toISOString(),
        };
        saveDB(); CLOUD.push('permits', p); render();
        toast('تم إغلاق التصريح');
        archiveToDrive(p, true); // أرشفة PDF تلقائية في Drive عند الإغلاق
      },
    });
  });

  on('#a-reissue', async () => {
    let seq;
    if (CLOUD.enabled()) {
      try {
        seq = await CLOUD.nextSeq(p.type);
        DB.counters[p.type] = Math.max(DB.counters[p.type], seq + 1);
      } catch (e) { toast('تعذر الاتصال بالخادم — إصدار الكود يتطلب إنترنت'); return; }
    } else {
      seq = DB.counters[p.type]++;
    }
    const np = {
      ...JSON.parse(JSON.stringify(p)),
      id: 'p' + Date.now().toString(36), seq,
      stage: 0, chain: chainRoles(), approvals: chainRoles().map(() => null),
      rejection: null, extension: null, closeout: null,
      createdAt: new Date().toISOString(),
    };
    np.code = permitCode(np);
    DB.permits.push(np); saveDB();
    CLOUD.push('permits', np);
    toast(`أُعيد الإصدار بالكود الجديد ${np.code}`);
    location.hash = '#/permit/' + np.id;
  });

  on('#a-print', () => printPermit(p));
  on('#a-archive', () => archiveToDrive(p, false));
  on('#a-copy', () => {
    const url = location.origin + location.pathname + '#/permit/' + p.id;
    navigator.clipboard?.writeText(url).then(() => toast('تم نسخ الرابط'));
  });
}

/* ============================================================
   لوحة التوقيع
   ============================================================ */
function openSignature({ title, name, onDone }) {
  const saved = DB.savedSignatures[DB.currentRole];
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `
  <div class="modal">
    <div class="modal-head">${icon('pen', 17)} ${esc(title)}<button class="x">${icon('x', 18)}</button></div>
    <div class="modal-body">
      <div class="hint" style="margin-bottom:8px">${esc(name)} — سيُختم التوقيع بالتاريخ والوقت تلقائيًا</div>
      <div class="sig-wrap">
        <canvas class="sig-pad" id="sig-pad"></canvas>
        <div class="sig-line"></div><div class="sig-x">✕</div>
      </div>
      <div class="sig-tools">
        <button class="btn btn-sm" id="sig-clear">مسح</button>
        ${saved ? `<button class="btn btn-sm" id="sig-saved">استخدام توقيعي المحفوظ</button>` : ''}
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink-2);margin-inline-start:auto">
          <input type="checkbox" id="sig-remember" checked> حفظ توقيعي للمرات القادمة
        </label>
      </div>
      <div class="divider"></div>
      <button class="btn btn-green btn-block" id="sig-ok">${icon('check', 16)} اعتماد التوقيع</button>
    </div>
  </div>`;
  document.body.appendChild(back);

  const canvas = $('#sig-pad', back);
  const dpr = window.devicePixelRatio || 1;
  const rect = () => canvas.getBoundingClientRect();
  const sizeCanvas = () => {
    const r = rect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a2a55'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    return ctx;
  };
  let ctx = sizeCanvas();
  let drawing = false, dirty = false, last = null;

  const pos = (e) => {
    const r = rect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); drawing = true; last = pos(e); };
  const move = (e) => {
    if (!drawing) return; e.preventDefault();
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; dirty = true;
  };
  const end = () => { drawing = false; };

  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);

  const close = () => { window.removeEventListener('pointerup', end); back.remove(); };
  $('.x', back).addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });

  $('#sig-clear', back).addEventListener('click', () => { ctx = sizeCanvas(); dirty = false; });

  if (saved) $('#sig-saved', back).addEventListener('click', () => {
    const img = new Image();
    img.onload = () => {
      ctx = sizeCanvas();
      const r = rect();
      const h = Math.min(r.height * .7, img.height), w = img.width * (h / img.height);
      ctx.drawImage(img, (r.width - w) / 2, (r.height - h) / 2, w, h);
      dirty = true;
    };
    img.src = saved;
  });

  $('#sig-ok', back).addEventListener('click', () => {
    if (!dirty) { toast('ارسم التوقيع أولًا'); return; }
    const dataURL = canvas.toDataURL('image/png');
    if ($('#sig-remember', back).checked) { DB.savedSignatures[DB.currentRole] = dataURL; }
    close();
    onDone(dataURL);
  });
}

/* ============================================================
   الطباعة — النموذج الرسمي A4
   ============================================================ */
function buildPermitSheetHTML(p) {
  const t = HSE.permitTypes[p.type];
  const st = permitStatus(p);
  const ansMark = (v, want) => v === want ? '✔' : '';
  const stamp = st === 'approved' ? '<div class="sh-stamp ok">APPROVED</div>'
    : st === 'rejected' ? '<div class="sh-stamp no">REJECTED</div>'
    : st === 'closed' ? '<div class="sh-stamp cl">CLOSED</div>' : '';

  return `
  <div class="sheet">
    <div class="sh-stamp-wrap">${stamp}</div>
    <div class="sh-head">
      <div class="sh-party">
        <div class="cap">The Employer</div>
        <div class="nm">${esc(HSE.project.employerEn)}</div>
        <div class="ar">${esc(HSE.project.employerAr)}</div>
      </div>
      <div class="sh-title">
        <div class="t">${esc(t.en)}</div>
        <div class="t-ar">${esc(t.ar)}</div>
      </div>
      <div class="sh-party">
        <div class="cap">The Engineer / The Contractor</div>
        <div class="nm">${esc(HSE.project.engineerEn)} · RBC</div>
        <div class="ar">${esc(HSE.project.contractorEn)}</div>
      </div>
    </div>
    <div class="sh-code"><span>CODE:</span><span>${permitCode(p)}</span></div>
    <div class="sh-meta">
      <div><b>Contractor:</b> RBC</div>
      <div><b>Project:</b> SCC</div>
      <div><b>DATE:</b> ${fmtDate(p.dateFrom)} → ${fmtDate(p.dateTo)}</div>
      <div><b>TIME:</b> ${p.timeFrom} → ${p.timeTo}${p.extension ? ` (Ext. → ${p.extension.to})` : ''}</div>
    </div>
    <div class="sh-desc">
      <span class="lbl">Description and Location:</span> ${esc(p.desc || p.descAr)}
      ${p.equipment ? `<br><span class="lbl">Equipment:</span> ${esc(p.equipment)}` : ''}
      <br><span class="lbl">Discipline:</span> ${esc(p.discipline)}
    </div>
    <table class="sh-ck">
      <tr><th style="width:26px">No.</th><th>Description</th><th style="width:40px">YES</th><th style="width:40px">NO</th><th style="width:40px">N/A</th></tr>
      ${(p.items || t.checklist).map((item, i) => `
      <tr>
        <td class="n">${i + 1}</td>
        <td>${esc(item.en || item.ar)}</td>
        <td class="c">${ansMark(p.checklist[i], 1)}</td>
        <td class="c">${ansMark(p.checklist[i], 2)}</td>
        <td class="c">${ansMark(p.checklist[i], 3)}</td>
      </tr>`).join('')}
    </table>
    <div class="sh-workers">
      <b>Name of persons carrying out work:</b>
      ${p.workers.map(w => `<span>${esc(w)}</span>`).join(' · ')}
    </div>
    <div class="sh-decl">
      The work permit for the above-mentioned work at the location specified is issued after personally inspecting
      the area to ensure that the precautions mentioned in the checklist have been complied with.
    </div>
    <div class="sh-signs" style="grid-template-columns:repeat(${permitChain(p).length}, 1fr)">
      ${permitChain(p).map((c, i) => {
        const a = p.approvals[i];
        return `<div>
          <div class="r">${esc(c.en)}</div>
          <div class="nm">${esc(a ? a.name : roleName(c.key))}</div>
          <div class="sg">${a ? `<img src="${a.sig}">` : '<span class="pending">Pending…</span>'}</div>
          <div class="dt">${a ? fmtDT(a.at) : ''}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="sh-block">
      <span class="bt">Extending Work Permit —</span>
      This work permit validity is extended for time from
      <span class="fill">[ ${p.extension ? p.extension.from : '     '} ]</span> to
      <span class="fill">[ ${p.extension ? p.extension.to : '     '} ]</span>.
      Signature: ${p.extension ? `${esc(p.extension.by)} — <span class="fill">${fmtDT(p.extension.at)}</span>` : '________________'}
    </div>
    <div class="sh-block">
      <span class="bt">Closeout of Permit —</span>
      All work completed and area has been cleared.
      Date: <span class="fill">${p.closeout ? fmtDate(p.closeout.date) : '  /  /    '}</span>
      &nbsp;Time: <span class="fill">${p.closeout ? p.closeout.time : '  :  '}</span>
      &nbsp;Permit closed, signature of Consultant Manager: ${p.closeout ? `${esc(p.closeout.by)}` : '________________'}
    </div>
    <div class="sh-foot">
      <span>FERAS — HSE Digital System · generated ${fmtDT(new Date().toISOString())}</span>
      <span>${permitCode(p)}</span>
    </div>
  </div>`;
}

function printPermit(p) {
  $('#printRoot').innerHTML = buildPermitSheetHTML(p);
  window.print();
}

/* أنماط مدمجة لملف PDF المؤرشف (محوّل HTML→PDF في الخادم) */
const ARCHIVE_CSS = `
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10pt;margin:14px}
.sheet{width:100%;direction:ltr;line-height:1.45}
.sh-head{display:table;width:100%;border:2px solid #111;border-collapse:collapse}
.sh-head>div{display:table-cell;padding:6px 8px;text-align:center;border-left:1px solid #111;vertical-align:middle}
.sh-party .cap{font-size:8pt;color:#444}.sh-party .nm{font-weight:bold}
.sh-title .t{font-size:15pt;font-weight:bold}.sh-title .t-ar{font-size:10pt}
.sh-code{border:2px solid #111;border-top:0;padding:4px 10px;font-weight:bold;font-family:monospace}
.sh-code span{display:inline-block;margin-left:8px}
.sh-meta{display:table;width:100%;border:2px solid #111;border-top:0}
.sh-meta>div{display:table-cell;padding:4px 8px;font-size:9.5pt;border-left:1px solid #111}
.sh-desc{border:2px solid #111;border-top:0;padding:5px 10px;font-size:9.8pt}
.sh-desc .lbl{font-weight:bold}
.sh-ck{border-collapse:collapse;width:100%;border:2px solid #111;border-top:0}
.sh-ck th,.sh-ck td{border:1px solid #111;padding:3px 7px;font-size:9pt}
.sh-ck th{background:#efefef}.sh-ck td.c{text-align:center;width:34px}.sh-ck td.n{text-align:center;width:26px}
.sh-workers,.sh-decl,.sh-block{border:2px solid #111;border-top:0;padding:5px 10px;font-size:9.3pt}
.sh-decl{font-size:8.8pt;color:#222}
.sh-block .bt{font-weight:bold}
.sh-signs{display:table;width:100%;border:2px solid #111;border-top:0}
.sh-signs>div{display:table-cell;width:25%;padding:5px 8px;border-left:1px solid #111;vertical-align:top}
.sh-signs .r{font-weight:bold;font-size:9pt}.sh-signs .nm{font-size:9.5pt}
.sh-signs .sg img{height:34px}.sh-signs .dt{font-family:monospace;font-size:7.5pt;color:#333}
.sh-signs .pending{color:#999;font-style:italic;font-size:8.5pt}
.sh-stamp-wrap{position:relative}
.sh-stamp{position:absolute;top:6px;right:150px;border:3px solid;border-radius:6px;padding:2px 14px;font-weight:bold;font-size:13pt}
.sh-stamp.ok{color:#1d7a4c}.sh-stamp.no{color:#bd3a2a}.sh-stamp.cl{color:#444}
.sh-foot{margin-top:6px;font-size:7.8pt;color:#555;font-family:monospace}
.sh-foot span{display:inline-block;margin-left:16px}`;

async function archiveToDrive(p, silent) {
  if (!CLOUD.enabled()) { if (!silent) toast('الأرشفة تتطلب تفعيل الخلفية'); return; }
  if (!silent) toast('جارٍ إنشاء PDF وحفظه في Drive…');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${ARCHIVE_CSS}</style></head><body>${buildPermitSheetHTML(p)}</body></html>`;
  try {
    const url = await CLOUD.archive(p, html);
    if (url) {
      p.driveUrl = url;
      saveDB(); CLOUD.push('permits', p);
      if ((location.hash || '').includes(p.id)) render();
      toast('تمت الأرشفة في Google Drive ✓');
    }
  } catch (e) {
    if (!silent) toast('تعذرت الأرشفة — أعد المحاولة لاحقًا');
  }
}

/* ============================================================
   المعدات + QR
   ============================================================ */
function viewEquipment() {
  const mc = HSE.monthColors[new Date().getMonth()];
  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">${tr('equipment')}</div>
      <div class="page-sub">كود لون هذا الشهر: <span class="month-dot" style="background:${mc.hex}"></span> ${mc.ar} — لكل معدة نموذج فحص خاص بها (${Object.keys(HSE.equipmentTypes).length} نوعًا)</div>
    </div>
    <a class="btn btn-amber" href="#/equipment/new">${icon('plus', 16)} معدة جديدة</a>
  </div>
  <div class="eq-grid">
    ${DB.equipment.map(e => {
      const ty = HSE.equipmentTypes[e.type];
      const last = e.inspections[0];
      const st = equipmentDue(e);
      const badge = st === 'fail' ? '<span class="insp-badge fail">موقوفة</span>'
        : st === 'due' ? '<span class="insp-badge due">فحص متأخر</span>'
        : '<span class="insp-badge pass">سليمة</span>';
      return `<div class="eq-card" onclick="location.hash='#/equipment/${e.id}'">
        <div class="eq-ic">${icon(ty.icon, 21)}</div>
        <div class="eq-main">
          <div class="eq-name">${esc(ty.ar)} — ${esc(e.model)}</div>
          <div class="eq-meta"><span class="mono">${e.code}</span> · ${esc(e.location)} · آخر فحص: ${last ? fmtDate(last.date) : '—'}</div>
        </div>
        ${badge}
      </div>`;
    }).join('')}
  </div>`;
}

function viewEquipmentDetail(id) {
  const e = DB.equipment.find(x => x.id === id);
  if (!e) return `<div class="empty">المعدة غير موجودة</div>`;
  const ty = HSE.equipmentTypes[e.type];
  const st = equipmentDue(e);

  afterRender = () => {
    drawQR($('#eq-qr'), location.origin + location.pathname + '#/equipment/' + e.id + '/inspect');
    $('#eq-sticker')?.addEventListener('click', () => printSticker(e));
    $$('.js-ins-print').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      printInspection(e, e.inspections[+b.dataset.idx]);
    }));
    $('#eqd-media')?.addEventListener('change', async ev => {
      e.media = e.media || [];
      await addMediaFiles([...ev.target.files], e.media);
      saveDB(); CLOUD.push('equipment', e); render();
    });
    $$('.js-eqdm-del').forEach(b => b.addEventListener('click', () => {
      e.media.splice(+b.dataset.i, 1);
      saveDB(); CLOUD.push('equipment', e); render();
    }));
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/equipment" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">${e.code}</div>
      <div class="page-title" style="font-size:18px">${esc(ty.ar)} — ${esc(e.model)}</div>
      <div class="page-sub">${esc(e.location)}${e.plate !== '—' ? ` · لوحة: <span class="mono">${esc(e.plate)}</span>` : ''}</div>
    </div>
    ${st === 'fail' ? '<span class="stamp big st-rejected">موقوفة</span>' : st === 'due' ? '<span class="stamp big st-pending">فحص متأخر</span>' : '<span class="stamp big st-approved">سليمة</span>'}
  </div>

  <div class="card">
    <div class="card-head">${icon('qr', 17)} QR المعدة<span class="spacer"></span><button class="btn btn-sm" id="eq-sticker">${icon('print', 14)} طباعة الملصق</button></div>
    <div class="qr-box">
      <div class="qr-holder"><div id="eq-qr"></div></div>
      <div class="qr-code-label">${e.code}</div>
      <div class="hint">امسح الكود في الموقع → يفتح نموذج الفحص مباشرة</div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">${icon('qr', 17)} الصور والمقاطع <span class="chip">${(e.media || []).length}/10</span>
      <span class="spacer"></span>
      ${canCreate() ? `<label class="btn btn-sm">${icon('plus', 13)} إضافة<input type="file" id="eqd-media" accept="image/*,video/*" multiple style="display:none"></label>` : ''}</div>
    <div class="card-pad" id="eqd-media-grid">${mediaGridHTML(e.media, canCreate() ? 'js-eqdm-del' : '')}</div>
  </div>

  <div class="card card-pad">
    <a class="btn btn-amber btn-block" href="#/equipment/${e.id}/inspect">${icon('check', 16)} فحص جديد الآن</a>
  </div>

  <div class="card">
    <div class="card-head">${icon('history', 17)} سجل الفحوصات (${e.inspections.length})</div>
    <div class="row-list">
      ${e.inspections.length ? e.inspections.map((i, idx) => {
        const R = INSP_RESULTS[i.result] || INSP_RESULTS.fit;
        return `
        <div class="row-item" style="cursor:default">
          <div class="row-main">
            <div class="row-title">${R.ar} — ${esc(i.by)}</div>
            <div class="row-meta"><span class="mono">${i.clNo ? esc(i.clNo) + ' · ' : ''}${fmtDate(i.date)}</span>${i.notes ? `<span>${esc(i.notes)}</span>` : ''}</div>
          </div>
          <span class="insp-badge ${R.cls}">${R.en}</span>
          <button class="btn btn-sm js-ins-print" data-idx="${idx}">${icon('print', 14)}</button>
        </div>`;
      }).join('') : `<div class="empty">لا توجد فحوصات مسجلة</div>`}
    </div>
  </div>`;
}

let inspDraft = null;
function viewInspect(id) {
  if (!canInspect()) return blockedCard('فحص المعدات صلاحية مدير النظام والفاحصين');
  const e = DB.equipment.find(x => x.id === id);
  if (!e) return `<div class="empty">المعدة غير موجودة</div>`;
  const ty = HSE.equipmentTypes[e.type];
  if (!inspDraft || inspDraft.eqId !== id) {
    inspDraft = { eqId: id, items: ty.items.map(() => 0), notes: '', result: '' };
  }
  const clNo = 'CL-' + String(DB.counters.INS).padStart(4, '0');

  afterRender = () => {
    $$('.seg3').forEach(seg => {
      seg.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        inspDraft.items[+seg.dataset.i] = +b.dataset.v;
        $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
        // اقتراح النتيجة تلقائيًا حسب الإجابات
        if (!inspDraft.items.some(v => v === 0)) {
          const noCount = inspDraft.items.filter(v => v === 2).length;
          const suggested = noCount === 0 ? 'fit' : noCount <= 2 ? 'partial' : 'unfit';
          if (!inspDraft.result) setInsResult(suggested);
        }
      });
    });
    $$('.js-res').forEach(b => b.addEventListener('click', () => setInsResult(b.dataset.r)));
    $('#ins-notes').addEventListener('input', ev => inspDraft.notes = ev.target.value);
    $('#ins-save').addEventListener('click', () => {
      if (inspDraft.items.some(v => v === 0)) { toast('أجب على جميع البنود بـ Yes أو No'); return; }
      if (!inspDraft.result) { toast('حدد نتيجة الفحص (FIT / PARTIALLY FIT / UNFIT)'); return; }
      openSignature({
        title: 'توقيع الفاحص — Inspected By', name: currentUserName(),
        onDone: (sig) => {
          const result = inspDraft.result;
          e.inspections.unshift({
            id: 'i' + (DB.counters.INS++), clNo,
            date: todayISO(), by: currentUserName(),
            result, notes: inspDraft.notes.trim(), items: [...inspDraft.items], sig,
          });
          saveDB(); CLOUD.push('equipment', e); inspDraft = null;
          toast(result === 'fit' ? 'النتيجة: صالحة للعمل ✓' : result === 'partial' ? 'النتيجة: صالحة جزئيًا — عالج الملاحظات' : 'النتيجة: غير صالحة — أوقفت المعدة');
          location.hash = '#/equipment/' + e.id;
        },
      });
    });
  };

  const setInsResult = (r) => {
    inspDraft.result = r;
    $$('.js-res').forEach(x => x.classList.toggle('on', x.dataset.r === r));
  };
  window.setInsResult = setInsResult;

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/equipment/${e.id}" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">${clNo} · ${e.code}</div>
      <div class="page-title" style="font-size:18px">Equipment Inspection Checklist — ${esc(ty.ar)}</div>
      <div class="page-sub">${esc(e.model)} · لوحة: ${esc(e.plate)} · ${roleAr('inspector')}: ${esc(currentUserName())} · ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>
  <div class="card card-pad">
    ${ty.items.map((item, i) => `
      <div class="ck-item">
        <div class="ck-no">${i + 1}</div>
        <div class="ck-text"><div class="ar">${esc(item.ar)}</div><div class="en">${esc(item.en)}</div></div>
        <div class="seg3" data-i="${i}">
          <button class="yes" data-v="1" style="width:52px">YES</button>
          <button class="no" data-v="2" style="width:52px">NO</button>
        </div>
      </div>`).join('')}
    <div class="divider"></div>
    <div class="field"><label>ملاحظات / Remarks <small>(اختياري)</small></label>
      <textarea id="ins-notes" placeholder="أي ملاحظات على حالة المعدة…"></textarea></div>
    <div style="font-size:13px;font-weight:700;margin:10px 0 6px">النتيجة النهائية — Overall Result:</div>
    <div class="action-bar" style="margin-bottom:12px">
      <button class="btn js-res res-fit" data-r="fit">FIT — صالحة</button>
      <button class="btn js-res res-partial" data-r="partial">PARTIALLY FIT — جزئيًا</button>
      <button class="btn js-res res-unfit" data-r="unfit">UNFIT — غير صالحة</button>
    </div>
    <div class="hint" style="margin:8px 0">نتيجة UNFIT تُوقف المعدة تلقائيًا حتى الإصلاح وإعادة الفحص.</div>
    <button class="btn btn-green btn-block" id="ins-save">${icon('pen', 16)} توقيع وحفظ الفحص</button>
  </div>`;
}

/* إضافة معدة جديدة */
let eqNewMedia = [];
function viewEquipmentNew() {
  if (!canCreate()) return blockedCard('إضافة المعدات صلاحية مدير النظام ومنشئي التصاريح');
  afterRender = () => {
    $('#eq-media').addEventListener('change', async ev => {
      await addMediaFiles([...ev.target.files], eqNewMedia);
      $('#eq-media-grid').innerHTML = mediaGridHTML(eqNewMedia, 'js-eqm-del');
      bindEqmDel();
    });
    const bindEqmDel = () => $$('.js-eqm-del').forEach(b => b.addEventListener('click', () => {
      eqNewMedia.splice(+b.dataset.i, 1);
      $('#eq-media-grid').innerHTML = mediaGridHTML(eqNewMedia, 'js-eqm-del');
      bindEqmDel();
    }));
    bindEqmDel();
    $('#eq-save').addEventListener('click', () => {
      const type = $('#eq-type').value;
      const model = $('#eq-model').value.trim();
      if (!model) { toast('اكتب موديل / وصف المعدة'); return; }
      const num = DB.equipment.length + 1;
      const eq = {
        id: 'eq' + Date.now().toString(36),
        code: 'EQ-' + String(num).padStart(3, '0'),
        type, model,
        plate: $('#eq-plate').value.trim() || '—',
        location: $('#eq-location').value.trim() || $('#eq-building').value,
        ownership: $('#eq-own').value,
        media: eqNewMedia.slice(0, MEDIA_MAX),
        inspections: [],
      };
      eqNewMedia = [];
      DB.equipment.push(eq); saveDB(); CLOUD.push('equipment', eq);
      toast(`تمت إضافة ${eq.code} — اطبع ملصق QR والصقه عليها`);
      location.hash = '#/equipment/' + eq.id;
    });
  };
  const groups = Object.entries(HSE.equipmentTypes);
  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/equipment" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow"><div class="page-title">معدة جديدة</div>
    <div class="page-sub">اختر النوع — لكل نوع نموذج فحص خاص به</div></div>
  </div>
  <div class="card card-pad">
    <div class="form-grid">
      <div class="field full"><label>نوع المعدة</label>
        <select id="eq-type">${groups.map(([k, t]) => `<option value="${k}">${t.ar} — ${t.en}</option>`).join('')}</select></div>
      <div class="field full"><label>الموديل / الوصف</label>
        <input type="text" id="eq-model" dir="ltr" placeholder="CAT 950GC"></div>
      <div class="field"><label>رقم اللوحة <small>(إن وجد)</small></label>
        <input type="text" id="eq-plate" dir="ltr" placeholder="1234 ABC"></div>
      <div class="field"><label>الملكية</label>
        <select id="eq-own">${HSE.ownership.map(o => `<option value="${o.key}">${o.ar} — ${o.en}</option>`).join('')}</select></div>
      <div class="field"><label>المبنى</label>
        <select id="eq-building">${buildingsList().map(b => `<option>${b}</option>`).join('')}</select></div>
      <div class="field"><label>وصف الموقع <small>(اختياري)</small></label>
        <input type="text" id="eq-location" placeholder="B02 — منطقة التفريغ"></div>
      <div class="field full"><label>صور ومقاطع للمعدة <small>(حتى 10)</small></label>
        <input type="file" id="eq-media" accept="image/*,video/*" multiple>
        <div id="eq-media-grid" style="margin-top:8px">${mediaGridHTML(eqNewMedia, 'js-eqm-del')}</div></div>
    </div>
    <div class="divider"></div>
    <button class="btn btn-green btn-block" id="eq-save">${icon('check', 16)} حفظ المعدة</button>
  </div>`;
}

function drawQR(el, text) {
  if (!el) return;
  el.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(el, { text, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });
  } else {
    el.innerHTML = `<div style="width:150px;height:150px;display:grid;place-items:center;border:1.5px dashed var(--line-2);border-radius:6px;color:var(--mut)">
      ${icon('qr', 44)}<div class="hint" style="margin-top:-30px">QR في النسخة المستضافة</div></div>`;
  }
}

/* نموذج فحص المعدة — مطابق لقالب "Equipment Inspection Checklist" في Drive */
function buildInspectionSheetHTML(e, insp) {
  const ty = HSE.equipmentTypes[e.type];
  const own = HSE.ownership.find(o => o.key === (e.ownership || 'own')) || HSE.ownership[0];
  const R = INSP_RESULTS[insp.result] || INSP_RESULTS.fit;
  const mark = (v) => v === 1 ? 'Yes' : v === 2 ? 'No' : '';
  return `
  <div class="sheet">
    <div class="sh-head">
      <div class="sh-party"><div class="cap">The Contractor</div><div class="nm">RBC</div><div class="ar">${esc(HSE.project.contractorEn)}</div></div>
      <div class="sh-title"><div class="t">Equipment Inspection Checklist</div><div class="t-ar">${esc(ty.en)} — ${esc(ty.ar)}</div></div>
      <div class="sh-party"><div class="cap">Project</div><div class="nm">SCC</div><div class="ar">${esc(HSE.project.employerEn)}</div></div>
    </div>
    <div class="sh-meta" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div><b>Checklist No.:</b> ${esc(insp.clNo || '—')}</div>
      <div><b>Date:</b> ${fmtDate(insp.date)}</div>
      <div><b>Plate No.:</b> ${esc(e.plate)}</div>
      <div><b>Ownership:</b> ${own.en}</div>
    </div>
    <div class="sh-desc">
      <span class="lbl">Equipment Name & Number:</span> ${esc(ty.en)} — ${esc(e.model)} (${esc(e.code)})
      <br><span class="lbl">Location:</span> ${esc(e.location)}
      <br><span style="font-size:8pt;color:#444">Please write Yes or No in the given box and if some comments write in remarks column.</span>
    </div>
    <table class="sh-ck">
      <tr><th style="width:26px">SN.</th><th>Description</th><th style="width:52px">Yes/No</th><th style="width:120px">Remarks</th></tr>
      ${ty.items.map((item, i) => `
      <tr>
        <td class="n">${i + 1}</td>
        <td>${esc(item.en)}</td>
        <td class="c">${mark(insp.items[i])}</td>
        <td></td>
      </tr>`).join('')}
    </table>
    ${insp.notes ? `<div class="sh-desc" style="border-top:0"><span class="lbl">Remarks:</span> ${esc(insp.notes)}</div>` : ''}
    <div class="sh-block">
      <span class="bt">Overall Result:</span>
      &nbsp; [${insp.result === 'fit' ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}] FIT
      &nbsp; [${insp.result === 'partial' ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}] PARTIALLY FIT
      &nbsp; [${insp.result === 'unfit' ? ' ✔ ' : '&nbsp;&nbsp;&nbsp;'}] UNFIT
    </div>
    <div class="sh-signs" style="grid-template-columns:1fr 1fr">
      <div>
        <div class="r">Inspected By</div>
        <div class="nm">${esc(insp.by)}</div>
        <div class="sg">${insp.sig ? `<img src="${insp.sig}">` : ''}</div>
        <div class="dt">${fmtDate(insp.date)}</div>
      </div>
      <div>
        <div class="r">Reviewed By (HSE)</div>
        <div class="nm">${esc(roleName('hseSupervisor'))}</div>
        <div class="sg"></div>
        <div class="dt">Sign / Date: ______________</div>
      </div>
    </div>
    <div class="sh-foot"><span>FERAS — HSE Digital System · ${esc(R.en)}</span><span>${esc(e.code)} · ${fmtDate(insp.date)}</span></div>
  </div>`;
}

function printInspection(e, insp) {
  $('#printRoot').innerHTML = buildInspectionSheetHTML(e, insp);
  window.print();
}

function printSticker(e) {
  const ty = HSE.equipmentTypes[e.type];
  const mc = HSE.monthColors[new Date().getMonth()];
  $('#printRoot').innerHTML = `
  <div class="sticker">
    <div class="s-head"><span>HSE INSPECTION</span><span class="s-dot" style="background:${mc.hex}"></span></div>
    <div class="s-qr"><div id="stk-qr"></div></div>
    <div class="s-code">${e.code}</div>
    <div class="s-sub">${esc(ty.en)} — ${esc(e.model)}</div>
    <div class="s-sub">Scan to inspect · ${esc(HSE.project.codePrefix)}</div>
  </div>`;
  drawQR($('#stk-qr'), location.origin + location.pathname + '#/equipment/' + e.id + '/inspect');
  setTimeout(() => window.print(), 250);
}

/* ============================================================
   تقييم المخاطر
   ============================================================ */
/* نطاقات التقييم كما في النموذج المعتمد: 1-4 Low · 5-12 Medium · 15-25 High */
function riskBand(p, s) {
  const rr = p * s;
  if (rr <= 4) return { rr, letter: 'L', ar: 'منخفض', cls: 'lo' };
  if (rr <= 12) return { rr, letter: 'M', ar: 'متوسط', cls: 'md' };
  return { rr, letter: 'H', ar: 'عالٍ', cls: 'hi' };
}
function riskScore(p, s) {
  const b = riskBand(p, s);
  return `<span class="risk-score ${b.cls}">P${p}×S${s}=${b.rr} · ${b.letter}</span>`;
}
function raRefNo(ra) { return ra.refNo || ('RBC-HSE-' + String(ra.seq).padStart(3, '0')); }
const RA_SECTIONS_DEFAULT = {
  persons: 'Workers, operators, engineers and visitors present at the work area.',
  ppe: 'Safety helmet, safety shoes, hi-vis vest, hand gloves, safety glasses + task-specific PPE.',
  training: 'Toolbox talk on this assessment before starting the activity; only trained and certified personnel.',
  emergency: 'Site emergency plan applies — first aider available, assembly point and emergency numbers displayed.',
  monitoring: 'Monitored by HSE department; re-assessed upon any change of scope or after any incident.',
};

function viewRisk() {
  const list = [...DB.assessments].sort((a, b) => b.date.localeCompare(a.date));
  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">${tr('risk')}</div>
      <div class="page-sub">اكتب النشاط — والنظام يقترح المخاطر والاحتياطات من المكتبة</div>
    </div>
    <a class="btn btn-amber" href="#/risk/new">${icon('plus', 16)} تقييم جديد</a>
  </div>
  <div class="card"><div class="row-list">
    ${list.length ? list.map(ra => `
      <div class="row-item" onclick="location.hash='#/risk/${ra.id}'">
        <div class="row-main">
          <div class="row-code">${raRefNo(ra)}</div>
          <div class="row-title">${esc(ra.activity)}</div>
          <div class="row-meta"><span>${esc(ra.location)}</span><span class="mono">${fmtDate(ra.date)}</span><span>${ra.rows.length} مخاطر</span></div>
        </div>
        ${icon('back', 16)}
      </div>`).join('') : `<div class="empty">${icon('alert', 30)} لا توجد تقييمات بعد</div>`}
  </div></div>`;
}

let raDraft = null;
function viewRiskNew() {
  if (!canCreate()) return blockedCard('إنشاء تقييمات المخاطر صلاحية مدير النظام ومنشئي التصاريح');
  if (!raDraft) raDraft = { activity: '', location: 'B02', assessor: 'HSE Department', rows: [], suggested: null, media: [] };

  afterRender = () => {
    const inp = $('#ra-activity');
    inp.addEventListener('input', () => {
      raDraft.activity = inp.value;
      const q = inp.value.toLowerCase();
      const lib = q.length >= 2 ? HSE.riskLibrary.find(L => L.match.some(k => q.includes(k))) : null;
      raDraft.suggested = lib || null;
      renderRaSuggest();
    });
    $('#ra-location').addEventListener('change', e => raDraft.location = e.target.value);
    $('#ra-assessor').addEventListener('input', e => raDraft.assessor = e.target.value);
    $('#ra-media').addEventListener('change', async ev => {
      await addMediaFiles([...ev.target.files], raDraft.media);
      $('#ra-media-grid').innerHTML = mediaGridHTML(raDraft.media, 'js-ram-del');
      bindRamDel();
    });
    const bindRamDel = () => $$('.js-ram-del').forEach(b => b.addEventListener('click', () => {
      raDraft.media.splice(+b.dataset.i, 1);
      $('#ra-media-grid').innerHTML = mediaGridHTML(raDraft.media, 'js-ram-del');
      bindRamDel();
    }));
    bindRamDel();
    const addRaRow = () => {
      raDraft.rows.push({ hazard: '', risks: '', consequence: '', control: '', p: 3, s: 3, resP: 1, resS: 3 });
      renderRaRows();
    };
    $('#ra-add').addEventListener('click', addRaRow);
    $('#ra-add2').addEventListener('click', addRaRow);
    $('#ra-save').addEventListener('click', async () => {
      if (!raDraft.activity.trim()) { toast('اكتب وصف النشاط'); return; }
      const rows = raDraft.rows.filter(r => r.hazard.trim());
      if (!rows.length) { toast('أضِف خطرًا واحدًا على الأقل'); return; }
      let raSeq;
      if (CLOUD.enabled()) {
        try { raSeq = await CLOUD.nextSeq('RA'); DB.counters.RA = Math.max(DB.counters.RA, raSeq + 1); }
        catch (e) { raSeq = DB.counters.RA++; }
      } else { raSeq = DB.counters.RA++; }
      const ra = {
        id: 'ra' + Date.now().toString(36), seq: raSeq,
        refNo: 'RBC-HSE-' + String(raSeq).padStart(3, '0'),
        activity: raDraft.activity.trim(), location: raDraft.location,
        assessor: (raDraft.assessor || 'HSE Department').trim(),
        date: todayISO(), by: currentUserName() || HSE.creator.name,
        rows, sections: { ...RA_SECTIONS_DEFAULT },
        media: (raDraft.media || []).slice(0, MEDIA_MAX),
      };
      DB.assessments.push(ra); saveDB(); CLOUD.push('assessments', ra); raDraft = null;
      toast(`تم حفظ التقييم ${ra.refNo}`);
      location.hash = '#/risk/' + ra.id;
    });
    renderRaSuggest(); renderRaRows();
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/risk" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">تقييم مخاطر جديد — RISK ASSESSMENT</div>
      <div class="page-sub mono" style="direction:ltr;text-align:end">RBC-HSE-${String(DB.counters.RA).padStart(3, '0')}</div>
    </div>
  </div>
  <div class="card card-pad">
    <div class="form-grid">
      <div class="field full"><label>النشاط <small>Title of the activity</small></label>
        <input type="text" id="ra-activity" value="${esc(raDraft.activity)}" placeholder="مثال: أعمال ردم ودك في المبنى B02…"></div>
      <div class="field"><label>الموقع</label>
        <select id="ra-location">${buildingsList().map(b => `<option ${b === raDraft.location ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
      <div class="field"><label>المُقيِّم <small>Assessor</small></label>
        <input type="text" id="ra-assessor" value="${esc(raDraft.assessor)}" dir="ltr"></div>
      <div class="field full"><label>صور ومقاطع من الموقع <small>(حتى 10)</small></label>
        <input type="file" id="ra-media" accept="image/*,video/*" multiple>
        <div id="ra-media-grid" style="margin-top:8px">${mediaGridHTML(raDraft.media, 'js-ram-del')}</div></div>
    </div>
    <div id="ra-suggest"></div>
    <div class="divider"></div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <b style="font-size:14px">المخاطر والاحتياطات</b>
      <span class="spacer" style="flex:1"></span>
      <button class="btn btn-sm" id="ra-add">${icon('plus', 14)} إضافة خطر</button>
    </div>
    <div id="ra-rows"></div>
    <button class="btn btn-block" id="ra-add2" style="margin-top:10px;border-style:dashed">${icon('plus', 15)} إضافة خطر جديد</button>
    <div class="divider"></div>
    <button class="btn btn-green btn-block" id="ra-save">${icon('check', 16)} حفظ التقييم</button>
  </div>`;
}

function renderRaSuggest() {
  const box = $('#ra-suggest'); if (!box) return;
  const s = raDraft.suggested;
  if (!s) { box.innerHTML = ''; return; }
  box.innerHTML = `
  <div class="ra-suggest">
    <div class="t">${icon('alert', 15)} وُجد في المكتبة: «${esc(s.activity)}» — ${s.rows.length} مخاطر باحتياطاتها</div>
    <button class="btn btn-sm btn-dark" id="ra-apply">${icon('plus', 13)} إضافة الاقتراحات للجدول</button>
  </div>`;
  $('#ra-apply').addEventListener('click', () => {
    s.rows.forEach(r => raDraft.rows.push(raRowFromLib(r)));
    raDraft.suggested = null;
    renderRaSuggest(); renderRaRows();
    toast('أُضيفت المخاطر المقترحة — عدّلها كما يناسب الموقع');
  });
}

function renderRaRows() {
  const box = $('#ra-rows'); if (!box) return;
  if (!raDraft.rows.length) {
    box.innerHTML = `<div class="empty" style="padding:18px">اكتب النشاط بالأعلى لعرض الاقتراحات، أو أضف المخاطر يدويًا</div>`;
    return;
  }
  const sel5 = (cls, i, val) =>
    `<select class="mini-select ${cls}" data-i="${i}">${[1, 2, 3, 4, 5].map(v => `<option ${v === val ? 'selected' : ''}>${v}</option>`).join('')}</select>`;

  box.innerHTML = raDraft.rows.map((r, i) => `
  <div class="ra-row">
    <div class="rr-head">
      <div style="flex:1">
        <input type="text" class="js-hz" data-i="${i}" value="${esc(r.hazard)}" placeholder="الخطر وأسبابه — Hazard (causes)…" style="width:100%;border:0;outline:0;font-weight:700;font-size:13.5px;background:transparent">
      </div>
      <button class="rr-del js-del" data-i="${i}">${icon('x', 15)}</button>
    </div>
    <input type="text" class="js-cons" data-i="${i}" value="${esc(r.consequence || '')}" placeholder="العواقب المحتملة — Consequences/Impact…" style="width:100%;border:0;border-bottom:1px dashed var(--line);outline:0;font-size:12.5px;padding:4px 0;background:transparent">
    <textarea class="js-ctl" data-i="${i}" placeholder="الاحتياطات (سطر لكل احتياط) — Control measures…" style="width:100%;border:1px dashed var(--line);border-radius:5px;padding:7px 10px;font-size:12.5px;margin-top:6px;min-height:60px">${esc(r.control)}</textarea>
    <div style="display:flex;gap:10px;align-items:center;margin-top:7px;flex-wrap:wrap">
      <label style="font-size:11.5px;color:var(--mut)">P ${sel5('js-p', i, r.p)}</label>
      <label style="font-size:11.5px;color:var(--mut)">S ${sel5('js-s', i, r.s)}</label>
      <span class="js-score" data-i="${i}">${riskScore(r.p, r.s)}</span>
      <span style="color:var(--line-2)">→</span>
      <label style="font-size:11.5px;color:var(--mut)">المتبقي P ${sel5('js-rp', i, r.resP)}</label>
      <label style="font-size:11.5px;color:var(--mut)">S ${sel5('js-rs', i, r.resS)}</label>
      <span class="js-rscore" data-i="${i}">${riskScore(r.resP, r.resS)}</span>
    </div>
  </div>`).join('');

  const bind = (cls, fn) => $$(cls, box).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => fn(raDraft.rows[+el.dataset.i], el)));
  bind('.js-hz', (r, el) => r.hazard = el.value);
  bind('.js-cons', (r, el) => r.consequence = el.value);
  bind('.js-ctl', (r, el) => r.control = el.value);
  const rescore = (el) => {
    const r = raDraft.rows[+el.dataset.i];
    $(`.js-score[data-i="${el.dataset.i}"]`, box).innerHTML = riskScore(r.p, r.s);
    $(`.js-rscore[data-i="${el.dataset.i}"]`, box).innerHTML = riskScore(r.resP, r.resS);
  };
  bind('.js-p', (r, el) => { r.p = +el.value; rescore(el); });
  bind('.js-s', (r, el) => { r.s = +el.value; rescore(el); });
  bind('.js-rp', (r, el) => { r.resP = +el.value; rescore(el); });
  bind('.js-rs', (r, el) => { r.resS = +el.value; rescore(el); });
  $$('.js-del', box).forEach(el => el.addEventListener('click', () => {
    raDraft.rows.splice(+el.dataset.i, 1); renderRaRows();
  }));
}

function viewRiskDetail(id) {
  const ra = DB.assessments.find(x => x.id === id);
  if (!ra) return `<div class="empty">التقييم غير موجود</div>`;
  afterRender = () => { $('#ra-print')?.addEventListener('click', () => printRA(ra)); };
  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/risk" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">${raRefNo(ra)}</div>
      <div class="page-title" style="font-size:18px">${esc(ra.activity)}</div>
      <div class="page-sub">${esc(ra.location)} · ${fmtDate(ra.date)} · ${esc(ra.assessor || ra.by)}</div>
    </div>
    <button class="btn" id="ra-print">${icon('print', 15)} PDF / طباعة</button>
  </div>
  ${(ra.media && ra.media.length) ? `<div class="card"><div class="card-head">الصور والمقاطع <span class="chip">${ra.media.length}</span></div>
    <div class="card-pad">${mediaGridHTML(ra.media, '')}</div></div>` : ''}
  <div class="card card-pad">
    ${ra.rows.map((r, i) => `
    <div class="ra-row">
      <div class="rr-head"><div class="rr-hz">${i + 1}. ${esc(r.hazard)}</div>${riskScore(r.p ?? r.lik, r.s ?? r.sev)}</div>
      ${r.consequence ? `<div style="font-size:12px;color:var(--mut)">${esc(r.consequence)}</div>` : ''}
      <div class="rr-ctl">${esc(r.control)}</div>
      <div style="margin-top:6px;font-size:11.5px;color:var(--mut)">المتبقي بعد الاحتياطات: ${riskScore(r.resP ?? 1, r.resS ?? (r.s ?? r.sev))}</div>
    </div>`).join('')}
  </div>`;
}

/* نموذج تقييم المخاطر — مطابق لقالب RISK ASSESSMENT (RBC-HSE-###) */
function printRA(ra) {
  const S = ra.sections || RA_SECTIONS_DEFAULT;
  const row = (r, i) => {
    const b = riskBand(r.p ?? r.lik, r.s ?? r.sev);
    const rb = riskBand(r.resP ?? 1, r.resS ?? (r.s ?? r.sev));
    return `<tr>
      <td class="n">${i + 1}</td>
      <td>${esc(ra.activity)}</td>
      <td>${esc(r.hazard)}</td>
      <td>${esc(r.consequence || 'Personnel injury / property damage')}</td>
      <td class="c">${r.p ?? r.lik}</td><td class="c">${r.s ?? r.sev}</td><td class="c">${b.letter}</td>
      <td>${esc(r.control)}</td>
      <td class="c">${r.resP ?? 1}</td><td class="c">${r.resS ?? (r.s ?? r.sev)}</td><td class="c">${rb.letter}</td>
      <td class="c">Y</td>
    </tr>`;
  };
  $('#printRoot').innerHTML = `
  <div class="sheet">
    <div class="sh-head" style="grid-template-columns:1fr 1.3fr 1fr">
      <div class="sh-party"><div class="cap">HSE DEPARTMENT</div><div class="nm">RBC</div><div class="ar">${esc(HSE.project.contractorEn)}</div></div>
      <div class="sh-title"><div class="t">RISK ASSESSMENT</div><div class="t-ar">تقييم المخاطر</div></div>
      <div class="sh-party"><div class="cap">Project</div><div class="nm">SCC</div><div class="ar">${esc(HSE.project.siteAr)}</div></div>
    </div>
    <div class="sh-meta" style="grid-template-columns:2fr 1fr 1fr 1fr">
      <div><b>TITLE OF THE ACTIVITY:</b> ${esc(ra.activity)}</div>
      <div><b>REF No.:</b> ${raRefNo(ra)}</div>
      <div><b>ASSESSOR:</b> ${esc(ra.assessor || 'HSE Department')}</div>
      <div><b>ASSESSED DATE:</b> ${fmtDate(ra.date)}</div>
    </div>
    <table class="sh-ck" style="font-size:8pt">
      <tr>
        <th style="width:20px">SN</th><th>ACTIVITY</th><th>HAZARD<br>(CAUSES)</th><th>CONSEQUENCES /<br>IMPACT</th>
        <th style="width:22px">P</th><th style="width:22px">S</th><th style="width:28px">RISK</th>
        <th style="width:28%">IMPLEMENTED CONTROL MEASURES</th>
        <th style="width:22px">P</th><th style="width:22px">S</th><th style="width:28px">RES.</th>
        <th style="width:30px">ACC.</th>
      </tr>
      ${ra.rows.map(row).join('')}
    </table>
    <table class="sh-ck" style="font-size:8.4pt">
      <tr><th style="width:170px">Persons in danger</th><td>${esc(S.persons)}</td></tr>
      <tr><th>Personal protective equipment</th><td>${esc(S.ppe)}</td></tr>
      <tr><th>Information, instruction and training</th><td>${esc(S.training)}</td></tr>
      <tr><th>Emergency procedures</th><td>${esc(S.emergency)}</td></tr>
      <tr><th>Recording, monitoring and review</th><td>${esc(S.monitoring)}</td></tr>
    </table>
    <div class="sh-block" style="font-size:8.4pt">
      <span class="bt">Risk rating (P×S):</span> 1–4 Low — quick easy controls, monitor ·
      5–12 Medium — reduce risk with timescaled actions; work not to start until risk acceptable ·
      15–25 High — do not commence activity until risk is reduced.
    </div>
    <div class="sh-signs" style="grid-template-columns:1fr 1fr 1fr">
      <div><div class="r">Approved Project Manager</div><div class="nm">${esc(roleName('siteManager'))}</div><div class="sg"></div><div class="dt">Sign: ______________</div></div>
      <div><div class="r">Approved HSE Manager</div><div class="nm">${esc(roleName('hseSupervisor'))}</div><div class="sg"></div><div class="dt">Sign: ______________</div></div>
      <div><div class="r">Approved HSE Consultant</div><div class="nm">${esc(roleName('hseConsultant'))}</div><div class="sg"></div><div class="dt">Sign: ______________</div></div>
    </div>
    <div class="sh-foot"><span>HSE DEPARTMENT — RBC</span><span>${raRefNo(ra)} · ${fmtDate(ra.date)}</span></div>
  </div>`;
  window.print();
}

/* ============================================================
   إدارة الموظفين
   ============================================================ */
let teamTab = 'emps'; // الموظفون | الأدوار | السلم | المواقع

function viewTeam() {
  const groups = allTeamRoles().map(r => ({
    role: r,
    emps: DB.employees.filter(e => e.role === r.key && e.id !== '_roles'),
  })).filter(g => g.emps.length);

  const admin = isAdmin();
  if (!admin) teamTab = 'emps';
  afterRender = () => {
    // تبويبات القسم
    $$('.js-team-tab').forEach(b => b.addEventListener('click', () => {
      teamTab = b.dataset.t; render();
    }));
    // بحث فوري بلا إعادة رسم (يحافظ على التركيز)
    $('#emp-q')?.addEventListener('input', () => {
      const q = $('#emp-q').value.trim().toLowerCase();
      $$('.js-emp-row').forEach(r => {
        r.style.display = !q || (r.dataset.q || '').includes(q) ? '' : 'none';
      });
      $$('.js-emp-group').forEach(g => {
        const any = $$('.js-emp-row', g).some(r => r.style.display !== 'none');
        g.style.display = any ? '' : 'none';
      });
    });
    if (!admin) return;
    $$('.js-emp-toggle').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const e = DB.employees.find(x => x.id === b.dataset.id);
      e.active = !e.active; saveDB(); CLOUD.push('employees', e);
      buildRoleSwitcher(); render();
      toast(e.active ? `تم تفعيل ${e.name}` : `تم إيقاف ${e.name}`);
    }));
    // إدارة الأدوار المخصصة
    $('#nr-add')?.addEventListener('click', () => {
      const name = $('#nr-name').value.trim();
      if (!name) { toast('اكتب اسم الدور'); return; }
      const cfg = ensureRolesConfig();
      cfg.list.push({
        key: 'r' + Date.now().toString(36), ar: name,
        canCreate: $('#nr-create').checked, canInspect: $('#nr-inspect').checked,
      });
      saveDB(); CLOUD.push('employees', cfg);
      toast('أُضيف الدور: ' + name); render();
    });
    $$('.js-role-ren').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      const cur = allTeamRoles().find(r => r.key === k);
      const v = prompt('الاسم الجديد للدور:', cur ? cur.ar : '');
      if (v === null || !v.trim()) return;
      const cfg = ensureRolesConfig();
      const custom = (cfg.list || []).find(r => r.key === k);
      if (custom) custom.ar = v.trim();
      else cfg.overrides[k] = { ar: v.trim() };
      saveDB(); CLOUD.push('employees', cfg);
      buildRoleSwitcher(); render();
      toast('تم تعديل اسم الدور');
    }));
    $$('.js-role-del').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'admin') return;
      if (DB.employees.some(e => e.role === k && e.id !== '_roles')) { toast('الدور مُسند لموظفين — انقلهم لدور آخر أولًا'); return; }
      const cfg = ensureRolesConfig();
      if (cfg.chain.includes(k) && cfg.chain.length <= 1) { toast('لا يمكن حذف آخر دور في سلم الاعتماد'); return; }
      cfg.chain = cfg.chain.filter(x => x !== k);
      if ((cfg.list || []).some(r => r.key === k)) {
        cfg.list = cfg.list.filter(r => r.key !== k);
      } else {
        if (!cfg.hidden.includes(k)) cfg.hidden.push(k);
      }
      saveDB(); CLOUD.push('employees', cfg); render();
      toast('حُذف الدور');
    }));
    // ترتيب سلم الاعتماد
    const chMove = (i, d) => {
      const cfg = ensureRolesConfig();
      const j = i + d;
      if (j < 0 || j >= cfg.chain.length) return;
      [cfg.chain[i], cfg.chain[j]] = [cfg.chain[j], cfg.chain[i]];
      saveDB(); CLOUD.push('employees', cfg); render();
    };
    $$('.js-ch-up').forEach(b => b.addEventListener('click', () => chMove(+b.dataset.i, -1)));
    $$('.js-ch-dn').forEach(b => b.addEventListener('click', () => chMove(+b.dataset.i, 1)));
    $$('.js-ch-rm').forEach(b => b.addEventListener('click', () => {
      const cfg = ensureRolesConfig();
      if (cfg.chain.length <= 1) { toast('السلم يحتاج دورًا واحدًا على الأقل'); return; }
      cfg.chain.splice(+b.dataset.i, 1);
      saveDB(); CLOUD.push('employees', cfg); render();
      toast('أُزيل من سلم الاعتماد');
    }));
    // إدارة المواقع
    $$('.js-bld-ren').forEach(b => b.addEventListener('click', () => {
      const cfg = ensureRolesConfig();
      const i = +b.dataset.i;
      const v = prompt('الاسم الجديد للموقع:', cfg.buildings[i]);
      if (v === null || !v.trim()) return;
      cfg.buildings[i] = v.trim();
      saveDB(); CLOUD.push('employees', cfg); render();
    }));
    $$('.js-bld-del').forEach(b => b.addEventListener('click', () => {
      const cfg = ensureRolesConfig();
      if (cfg.buildings.length <= 1) return;
      cfg.buildings.splice(+b.dataset.i, 1);
      saveDB(); CLOUD.push('employees', cfg); render();
    }));
    $('#bld-add')?.addEventListener('click', () => {
      const v = $('#bld-new').value.trim();
      if (!v) return;
      const cfg = ensureRolesConfig();
      if (!cfg.buildings.includes(v)) cfg.buildings.push(v);
      saveDB(); CLOUD.push('employees', cfg); render();
      toast('أُضيف الموقع: ' + v);
    });
    $('#ch-add')?.addEventListener('click', () => {
      const k = $('#ch-add-sel').value;
      if (!k) return;
      const cfg = ensureRolesConfig();
      if (!cfg.chain.includes(k)) cfg.chain.push(k);
      saveDB(); CLOUD.push('employees', cfg); render();
      toast('أُضيف لسلم الاعتماد');
    });
  };

  /* ---------- تبويب: الموظفون ---------- */
  const empsTab = `
  ${admin ? `<a class="quick-add js-quick-emp" href="#/team/new">
    <span class="qa-ic">${icon('plus', 18)}</span>
    <span class="grow"><b>موظف جديد</b><small>الاسم، الدور، الجهة، الجوال ورمز الدخول</small></span>
    ${icon('back', 16)}
  </a>` : ''}
  <div class="search-wrap"><input type="search" id="emp-q" placeholder="ابحث بالاسم أو الجهة أو الجوال…" autocomplete="off"></div>
  ${groups.map(g => `
  <div class="card js-emp-group">
    <div class="card-head">${icon(g.role.duty ? 'pen' : g.role.key === 'worker' ? 'user' : 'check', 17)} ${esc(g.role.ar)}
      <span class="chip">${g.emps.length}</span><span class="spacer"></span></div>
    <div class="row-list">
      ${g.emps.map(e => `
      <div class="row-item js-emp-row ${e.active ? '' : 'emp-off'}" data-q="${esc((e.name + ' ' + e.company + ' ' + (e.phone || '')).toLowerCase())}" ${admin ? `onclick="location.hash='#/team/${e.id}'"` : 'style="cursor:default"'}>
        <div class="eq-ic">${icon('user', 19)}</div>
        <div class="row-main">
          <div class="row-title" dir="ltr" style="text-align:start">${esc(e.name)}</div>
          <div class="row-meta"><span class="chip">${esc(e.company)}</span>${e.phone ? `<span class="mono">${esc(e.phone)}</span>` : '<span>بدون جوال</span>'}</div>
        </div>
        <div class="row-side">
          <span class="stamp ${e.active ? 'st-approved' : 'st-closed'}">${e.active ? 'نشط' : 'موقوف'}</span>
          ${admin ? `<button class="btn btn-sm js-emp-toggle" data-id="${e.id}">${e.active ? 'إيقاف' : 'تفعيل'}</button>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('')}
  <div class="card card-pad"><div class="hint">أضف رقم الجوال بصيغة دولية (9665xxxxxxxx) ليصل تنبيه واتساب مباشرة لصاحب الدور عند وصول الدور إليه.</div></div>`;

  /* ---------- تبويب: الأدوار (الإضافة أولًا ثم القائمة) ---------- */
  const empCountFor = k => DB.employees.filter(e => e.role === k && e.id !== '_roles').length;
  const rolesTab = `
  <div class="quick-add">
    <div class="qa-title">${icon('plus', 16)} إضافة دور جديد</div>
    <div class="qa-row">
      <input type="text" id="nr-name" placeholder="اسم الدور… (مثال: مشرف بيئة)">
      <button class="btn btn-amber" id="nr-add">إضافة</button>
    </div>
    <div class="qa-checks">
      <label><input type="checkbox" id="nr-create"> يُنشئ تصاريح وتقييمات وسجلات</label>
      <label><input type="checkbox" id="nr-inspect"> يفحص المعدات</label>
    </div>
    <small class="qa-hint">بعد الإضافة: أسنده لموظف من تبويب «الموظفون»، وأدخله سلم الاعتماد إن أردت أن يوقّع.</small>
  </div>
  <div class="card">
    <div class="card-head">${icon('shield', 17)} الأدوار الحالية <span class="chip">${allTeamRoles().length}</span></div>
    <div class="row-list">
      ${allTeamRoles().map(r => {
        const inChain = chainRoles().some(c => c.key === r.key);
        const n = empCountFor(r.key);
        return `
      <div class="row-item" style="cursor:default">
        <div class="eq-ic">${icon(r.key === 'admin' ? 'cog' : inChain ? 'pen' : 'user', 18)}</div>
        <div class="row-main">
          <div class="row-title">${esc(r.ar)}</div>
          <div class="row-meta">
            <span class="chip">${r.key === 'admin' ? 'مسؤول النظام' : r.custom ? 'مخصص' : 'أساسي'}</span>
            ${inChain ? '<span class="chip" style="background:var(--green-soft);color:var(--green)">في سلم الاعتماد</span>' : ''}
            <span>${n} موظف</span>
          </div>
        </div>
        <div class="row-side" style="flex-direction:row;gap:6px">
          ${r.key !== 'admin' ? `<button class="btn btn-sm js-role-ren" data-k="${esc(r.key)}">${icon('pen', 13)}</button>` : ''}
          ${r.key !== 'admin' ? `<button class="btn btn-sm js-role-del" data-k="${esc(r.key)}" style="color:var(--red)">${icon('x', 13)}</button>` : ''}
        </div>
      </div>`;
      }).join('')}
    </div>
  </div>
  <div class="card card-pad"><div class="hint">لا يمكن حذف دور مُسند لموظفين — انقلهم لدور آخر أولًا. مسؤول النظام (الأدمن) ثابت.</div></div>`;

  /* ---------- تبويب: سلم الاعتماد ---------- */
  const chainTab = `
  <div class="quick-add">
    <div class="qa-title">${icon('plus', 16)} إضافة دور إلى السلم</div>
    <div class="qa-row">
      <select id="ch-add-sel">
        ${allTeamRoles().filter(r => r.key !== 'admin' && r.key !== 'worker' && !chainRoles().some(c => c.key === r.key)).map(r => `<option value="${esc(r.key)}">${esc(r.ar)}</option>`).join('') || '<option value="">كل الأدوار داخل السلم</option>'}
      </select>
      <button class="btn btn-amber" id="ch-add">إضافة</button>
    </div>
  </div>
  <div class="card">
    <div class="card-head">${icon('check', 17)} ترتيب التوقيعات — من الأول إلى الأخير</div>
    <div class="card-pad" style="padding-top:6px">
      ${chainRoles().map((c, i) => `
      <div class="ladder-step">
        <span class="ck-no">${i + 1}</span>
        <div class="grow">
          <b style="font-size:14px">${esc(roleAr(c.key))}</b>
          <div style="font-size:11.5px;color:var(--mut)">${esc((empFor(c.key) || {}).name || 'لا يوجد موظف نشط بهذا الدور')}</div>
        </div>
        <button class="btn btn-sm js-ch-up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn btn-sm js-ch-dn" data-i="${i}" ${i === chainRoles().length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn btn-sm js-ch-rm" data-i="${i}" style="color:var(--red)" ${chainRoles().length <= 1 ? 'disabled' : ''}>${icon('x', 13)}</button>
      </div>`).join('')}
    </div>
  </div>
  <div class="card card-pad"><div class="hint">التصاريح الجديدة تتبع هذا الترتيب بالضبط — والتصاريح السابقة تحتفظ بسلسلتها كما وُقعت. المعتمد المعروض هو الموظف <b>النشط</b> الأول بذلك الدور.</div></div>`;

  /* ---------- تبويب: المواقع ---------- */
  const bldTab = `
  <div class="quick-add">
    <div class="qa-title">${icon('plus', 16)} إضافة موقع / مبنى</div>
    <div class="qa-row">
      <input type="text" id="bld-new" placeholder="B11، المستودع، البوابة الشرقية…">
      <button class="btn btn-amber" id="bld-add">إضافة</button>
    </div>
  </div>
  <div class="card">
    <div class="card-head">${icon('grid', 17)} المواقع المعتمدة <span class="chip">${buildingsList().length}</span></div>
    <div class="row-list">
      ${buildingsList().map((b2, i) => `
      <div class="row-item" style="cursor:default">
        <div class="row-main"><div class="row-title mono" style="font-size:13.5px">${esc(b2)}</div></div>
        <div class="row-side" style="flex-direction:row;gap:6px">
          <button class="btn btn-sm js-bld-ren" data-i="${i}">${icon('pen', 13)}</button>
          <button class="btn btn-sm js-bld-del" data-i="${i}" style="color:var(--red)" ${buildingsList().length <= 1 ? 'disabled' : ''}>${icon('x', 13)}</button>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="card card-pad"><div class="hint">هذه القائمة تظهر في كل النماذج: التصاريح، الفحوصات، التقييمات وكل السجلات.</div></div>`;

  const tabs = [
    { k: 'emps', ar: 'الموظفون', n: DB.employees.filter(e => e.id !== '_roles').length },
    { k: 'roles', ar: 'الأدوار', n: allTeamRoles().length },
    { k: 'chain', ar: 'سلم الاعتماد', n: chainRoles().length },
    { k: 'bld', ar: 'المواقع', n: buildingsList().length },
  ];
  const body = teamTab === 'roles' ? rolesTab : teamTab === 'chain' ? chainTab : teamTab === 'bld' ? bldTab : empsTab;

  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">${tr('team')}</div>
      <div class="page-sub">${DB.employees.filter(e => e.active).length} نشط من أصل ${DB.employees.length} — ${admin ? 'الإدارة الكاملة بيدك (أدمن)' : 'عرض فقط — الإدارة لمسؤول النظام'}</div>
    </div>
  </div>
  ${admin ? `<div class="pill-tabs">
    ${tabs.map(t2 => `<button class="js-team-tab ${teamTab === t2.k ? 'on' : ''}" data-t="${t2.k}">${t2.ar}<span class="pt-n">${t2.n}</span></button>`).join('')}
  </div>` : ''}
  ${admin ? body : empsTab}`;
}

function viewTeamForm(id) {
  if (!isAdmin()) return `<div class="card card-pad"><div class="empty">${icon('shield', 30)} إنشاء الحسابات وتعديلها صلاحية مسؤول النظام (الأدمن) فقط</div></div>`;
  const editing = id ? DB.employees.find(e => e.id === id) : null;
  if (id && !editing) return `<div class="empty">الموظف غير موجود</div>`;
  const e = editing || { name: '', role: 'worker', company: 'RBC', phone: '', active: true };

  afterRender = () => {
    $('#emp-save').addEventListener('click', () => {
      const name = $('#emp-name').value.trim();
      if (!name) { toast('اكتب اسم الموظف'); return; }
      const data = {
        name,
        role: $('#emp-role').value,
        company: $('#emp-company').value,
        phone: $('#emp-phone').value.trim(),
        email: $('#emp-email').value.trim(),
        pin: $('#emp-pin').value.trim(),
        active: $('#emp-active').checked,
      };
      let saved;
      if (editing) { Object.assign(editing, data); saved = editing; }
      else { saved = { id: 'e' + (DB.counters.EMP++), ...data }; DB.employees.push(saved); }
      saveDB(); CLOUD.push('employees', saved); buildRoleSwitcher();
      toast(editing ? 'تم حفظ التعديلات' : `تمت إضافة ${name}`);
      location.hash = '#/team';
    });
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/team" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">${editing ? 'تعديل موظف' : 'موظف جديد'}</div>
      ${editing ? `<div class="page-sub" dir="ltr" style="text-align:end">${esc(editing.name)}</div>` : ''}
    </div>
  </div>
  <div class="card card-pad">
    <div class="form-grid">
      <div class="field full"><label>الاسم <small>(كما سيظهر في النماذج والتواقيع)</small></label>
        <input type="text" id="emp-name" value="${esc(e.name)}" dir="ltr" placeholder="Mohammed Ali"></div>
      <div class="field"><label>الدور</label>
        <select id="emp-role">${allTeamRoles().map(r => `<option value="${r.key}" ${r.key === e.role ? 'selected' : ''}>${r.ar}${r.custom ? ' (مخصص)' : ''}</option>`).join('')}</select></div>
      <div class="field"><label>الجهة</label>
        <select id="emp-company">${HSE.companies.map(c => `<option ${c === e.company ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field full"><label>الجوال <small>(بصيغة دولية لتنبيهات واتساب — اختياري)</small></label>
        <input type="text" id="emp-phone" value="${esc(e.phone)}" dir="ltr" placeholder="9665XXXXXXXX"></div>
      <div class="field full"><label>البريد الإلكتروني <small>(يصله إشعار تلقائي عندما يكون الدور عليه — اختياري)</small></label>
        <input type="text" id="emp-email" value="${esc(e.email || '')}" dir="ltr" placeholder="name@company.com"></div>
      <div class="field full"><label>رمز الدخول الشخصي (PIN) <small>(لتسجيل دخوله للنظام — العمال لا يحتاجونه)</small></label>
        <input type="text" id="emp-pin" value="${esc(e.pin || '')}" dir="ltr" inputmode="numeric" placeholder="اتركه فارغًا للرمز الافتراضي للدور"></div>
      <div class="field full">
        <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="emp-active" ${e.active ? 'checked' : ''}> نشط — يظهر في القوائم وسلاسل الاعتماد
        </label>
      </div>
    </div>
    <div class="divider"></div>
    <div class="action-bar">
      <button class="btn btn-ghost" onclick="location.hash='#/team'">إلغاء</button>
      <button class="btn btn-green" id="emp-save">${icon('check', 15)} حفظ</button>
    </div>
  </div>`;
}

/* ============================================================
   ملفات المشروع في Google Drive (المجلدات القديمة والمؤرشفة)
   ============================================================ */
let filesPath = []; // مسار التنقل [{id, name}]

function viewFiles(folderId) {
  if (!CLOUD.enabled()) {
    return `
    <div class="page-head"><div class="grow">
      <div class="page-title">${tr('files')} — Google Drive</div>
    </div></div>
    <div class="card card-pad">
      <div class="empty">${icon('doc', 32)}
        تصفح مجلدات المشروع (PTW القديمة، الأرشيف، التقييمات…) يعمل بعد تفعيل الخلفية.<br>
        <span class="hint">فعّل backend/Code.gs ثم ضع الرابط في js/config.js — الخطوات في README.</span>
      </div>
    </div>`;
  }

  afterRender = async () => {
    const box = $('#files-box');
    try {
      const d = await CLOUD.driveList(folderId || '');
      // حدّث مسار التنقل
      if (!folderId) filesPath = [{ id: d.id, name: d.name }];
      else {
        const i = filesPath.findIndex(x => x.id === d.id);
        if (i > -1) filesPath = filesPath.slice(0, i + 1);
        else filesPath.push({ id: d.id, name: d.name });
      }
      const crumbs = filesPath.map((c, i) =>
        i === filesPath.length - 1
          ? `<b>${esc(c.name)}</b>`
          : `<a href="${i === 0 ? '#/files' : '#/files/' + c.id}" style="color:var(--blue)">${esc(c.name)}</a>`
      ).join(' <span style="color:var(--line-2)">/</span> ');

      const fmtSize = (n) => !n ? '' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
      const fIcon = (m) => m.includes('pdf') ? 'doc' : m.includes('sheet') || m.includes('excel') ? 'grid' : m.includes('image') ? 'qr' : 'doc';

      box.innerHTML = `
      <div class="card-pad" style="padding-bottom:8px;font-size:13px">${crumbs}</div>
      <div class="row-list">
        ${d.folders.map(f => `
          <div class="row-item" onclick="location.hash='#/files/${f.id}'">
            <div class="eq-ic" style="background:var(--amber-soft);color:var(--amber-ink)">${icon('grid', 19)}</div>
            <div class="row-main"><div class="row-title">${esc(f.name)}</div>
            <div class="row-meta"><span>مجلد</span><span class="mono">${fmtDate(f.updated)}</span></div></div>
            ${icon('back', 16)}
          </div>`).join('')}
        ${d.files.map(f => `
          <a class="row-item" href="${esc(f.url)}" target="_blank" rel="noopener">
            <div class="eq-ic">${icon(fIcon(f.mime), 19)}</div>
            <div class="row-main"><div class="row-title" dir="ltr" style="text-align:start">${esc(f.name)}</div>
            <div class="row-meta"><span class="mono">${fmtDate(f.updated)}</span><span>${fmtSize(+f.size)}</span></div></div>
            ${icon('back', 16)}
          </a>`).join('')}
        ${!d.folders.length && !d.files.length ? `<div class="empty">مجلد فارغ</div>` : ''}
      </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty">تعذر تحميل الملفات — تحقق من الاتصال وأعد المحاولة</div>`;
    }
  };

  return `
  <div class="page-head">
    ${folderId ? `<a class="btn btn-ghost btn-sm" href="#/files" style="padding-inline:6px">${icon('back', 18)}</a>` : ''}
    <div class="grow">
      <div class="page-title">ملفات المشروع — Google Drive</div>
      <div class="page-sub">كل مجلدات وسجلات المشروع القديمة والمؤرشفة، مباشرة من درايف المشروع</div>
    </div>
  </div>
  <div class="card" id="files-box"><div class="empty">جارٍ تحميل الملفات…</div></div>`;
}

/* ============================================================
   الدخول والملف الشخصي
   ============================================================ */
function viewLogin() {
  const loginables = DB.employees.filter(e => e.active && e.role !== 'worker' && e.role !== '_config');
  afterRender = () => {
    $('#lg-btn').addEventListener('click', doLogin);
    $('#lg-pin').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  };
  const doLogin = () => {
    const emp = DB.employees.find(e => e.id === $('#lg-emp').value);
    const pin = $('#lg-pin').value.trim();
    if (!emp) { toast('اختر اسمك من القائمة'); return; }
    if (pin !== loginPinFor(emp)) { toast('الرمز غير صحيح'); return; }
    setSession(emp);
    DB.currentRole = emp.role; saveDB();
    buildRoleSwitcher();
    toast(`أهلًا ${emp.name} — ${roleAr(emp.role)}`);
    location.hash = pendingHash || '#/';
    pendingHash = null;
    render();
  };
  return `
  <div style="max-width:420px;margin:8vh auto 0">
    <div class="card card-pad" style="text-align:center">
      <div class="brand-mark" style="margin:0 auto 10px;width:48px;height:48px;font-size:22px;font-family:var(--font)">ف</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:19px">${tr('login')}</div>
      <div class="hint" style="margin-bottom:16px">${esc(HSE.project.siteAr)}</div>
      <div class="field" style="text-align:start;margin-bottom:10px"><label>${tr('name')}</label>
        <select id="lg-emp">${loginables.map(e => `<option value="${e.id}">${esc(e.name)} — ${roleAr(e.role)}</option>`).join('')}</select></div>
      <div class="field" style="text-align:start"><label>${tr('pin')}</label>
        <input type="password" id="lg-pin" inputmode="numeric" dir="ltr" placeholder="••••"></div>
      <div class="divider"></div>
      <button class="btn btn-amber btn-block" id="lg-btn">${tr('enter')}</button>
      <div class="hint" style="margin-top:10px">تغيّر رمزك من ملفك الشخصي بعد الدخول — والعمال لا يحتاجون حسابًا</div>
    </div>
  </div>`;
}

function viewProfile() {
  const emp = sessionEmployee();
  if (!emp) {
    // الوضع المحلي التجريبي: الملف يعرض الدور الحالي فقط
    return `<div class="card card-pad"><div class="empty">الملف الشخصي يعمل بعد تسجيل الدخول (الوضع السحابي)</div></div>`;
  }
  const pending = DB.permits.filter(p => permitStatus(p) === 'pending' && permitChain(p)[p.stage] && permitChain(p)[p.stage].key === emp.role);
  const savedSig = DB.savedSignatures[emp.role];
  afterRender = () => {
    $('#pf-savepin').addEventListener('click', () => {
      const np = $('#pf-newpin').value.trim();
      if (np.length < 4) { toast('الرمز 4 أرقام على الأقل'); return; }
      emp.pin = np; saveDB(); CLOUD.push('employees', emp);
      $('#pf-newpin').value = '';
      toast('تم تغيير رمزك الشخصي');
    });
    $('#pf-clearsig')?.addEventListener('click', () => {
      delete DB.savedSignatures[emp.role]; saveDB(); render();
      toast('حُذف التوقيع المحفوظ');
    });
    $('#pf-logout').addEventListener('click', () => {
      clearSession();
      toast('تم تسجيل الخروج');
      location.hash = '#/'; render();
    });
  };
  return `
  <div class="page-head"><div class="grow">
    <div class="page-title">${tr('profile')}</div>
    <div class="page-sub">جلستك على هذا الجهاز</div>
  </div>
  <button class="btn btn-red-o" id="pf-logout">${icon('x', 15)} ${tr('logout')}</button></div>

  <div class="card card-pad">
    <div class="kv">
      <div><div class="k">الاسم</div><div class="v" dir="ltr" style="text-align:start">${esc(emp.name)}</div></div>
      <div><div class="k">الدور</div><div class="v">${roleAr(emp.role)}</div></div>
      <div><div class="k">الجهة</div><div class="v">${esc(emp.company)}</div></div>
      <div><div class="k">الجوال</div><div class="v mono">${esc(emp.phone || '—')}</div></div>
      <div><div class="k">البريد</div><div class="v mono" style="font-size:11px">${esc(emp.email || '—')}</div></div>
    </div>
    <div class="hint" style="margin-top:8px">تعديل بياناتك من <a href="#/team/${emp.id}" style="color:var(--blue)">إدارة الموظفين</a></div>
  </div>

  <div class="card">
    <div class="card-head">${icon('shield', 17)} الرمز الشخصي (PIN)</div>
    <div class="card-pad">
      <div style="display:flex;gap:8px">
        <input type="password" id="pf-newpin" inputmode="numeric" dir="ltr" placeholder="رمز جديد" style="flex:1;border:1px solid var(--line-2);border-radius:7px;padding:9px 12px">
        <button class="btn" id="pf-savepin">حفظ</button>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">${icon('pen', 17)} توقيعي المحفوظ<span class="spacer"></span>
      ${savedSig ? `<button class="btn btn-sm btn-red-o" id="pf-clearsig">حذف</button>` : ''}</div>
    <div class="card-pad" style="text-align:center">
      ${savedSig ? `<img src="${savedSig}" style="height:60px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:4px 14px">`
        : `<div class="hint">لا يوجد — عند أول توقيع فعّل «حفظ توقيعي» وسيظهر هنا</div>`}
    </div>
  </div>

  <div class="card">
    <div class="card-head">${icon('clock', 17)} بانتظار توقيعك (${pending.length})</div>
    ${pending.length ? `<div class="row-list">${pending.map(rowPermit).join('')}</div>` : `<div class="empty">لا شيء بانتظارك الآن ✓</div>`}
  </div>`;
}

/* ============================================================
   الإقلاع
   ============================================================ */
function currentUserName() {
  const e = sessionEmployee();
  return e ? e.name : roleName(DB.currentRole);
}

function buildRoleSwitcher() {
  const wrap = $('.role-switch');
  if (!wrap) return;
  if (CLOUD.enabled()) {
    // الوضع السحابي: هوية المستخدم المسجل بدل مبدّل الأدوار
    const emp = sessionEmployee();
    wrap.innerHTML = `<a href="#/profile" style="display:flex;align-items:center;gap:8px;color:#fff;min-width:0">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="flex:0 0 auto;opacity:.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
      <span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${emp ? esc(emp.name) : 'تسجيل الدخول'}</span></a>`;
    return;
  }
  const roleSel = $('#role-select');
  if (!roleSel) return;
  roleSel.innerHTML = allTeamRoles().filter(r => r.duty).map(r =>
    `<option value="${r.key}" ${r.key === DB.currentRole ? 'selected' : ''}>${r.ar} — ${roleName(r.key)}</option>`).join('');
}

function boot() {
  loadDB();
  applyLangChrome();
  $('#lang-btn')?.addEventListener('click', toggleLang);

  // في الوضع السحابي: الدور من هوية المستخدم المسجل
  const se = sessionEmployee();
  if (CLOUD.enabled() && se) { DB.currentRole = se.role; }

  // مبدّل الدور — يُبنى من سجل الموظفين النشطين (الوضع المحلي فقط)
  const roleSel = $('#role-select');
  buildRoleSwitcher();
  if (roleSel && !CLOUD.enabled()) roleSel.addEventListener('change', () => {
    const target = roleSel.value;
    // حماية الأدوار برمز PIN عند تفعيل الخلفية
    if (!CLOUD.roleUnlocked(target) && !CLOUD.unlockRole(target)) {
      roleSel.value = DB.currentRole;
      return;
    }
    DB.currentRole = target; saveDB(); render();
    toast(`تم التبديل إلى: ${roleAr(DB.currentRole)}`);
  });

  const resetBtn = $('#reset-demo');
  if (CLOUD.enabled()) {
    resetBtn.textContent = 'إعادة التحميل من الخادم';
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem('hse_sync_q');
      location.reload();
    });
    const note = resetBtn.parentElement;
    if (note) note.firstChild.textContent = 'البيانات مشتركة ومتزامنة عبر قاعدة المشروع في Google Drive · ';
  } else {
    resetBtn.addEventListener('click', () => {
      if (confirm('إعادة تعيين جميع البيانات التجريبية؟')) resetDB();
    });
  }

  window.addEventListener('hashchange', render);
  render();

  // المزامنة السحابية في الخلفية (لا تؤخر فتح التطبيق)
  CLOUD.indicator();
  CLOUD.bootstrap().then(() => {
    // ضمان وجود حساب الأدمن في القاعدة المشتركة
    if (DB._pushAdmin || !DB.employees.some(e => e.role === 'admin')) {
      let adm = DB.employees.find(e => e.role === 'admin');
      if (!adm) {
        adm = { id: 'e0', name: 'Admin', role: 'admin', company: 'SCC', phone: '', email: '', pin: '', active: true };
        DB.employees.unshift(adm);
      }
      delete DB._pushAdmin;
      CLOUD.push('employees', adm);
    }
    // رفع تحديث الطاقم الحقيقي للقاعدة المشتركة (مرة واحدة)
    if (DB._pushRoster && DB._pushRoster.length) {
      const ids = DB._pushRoster; delete DB._pushRoster; saveDB();
      ids.forEach(id => {
        const emp = DB.employees.find(e => e.id === id);
        if (emp) CLOUD.push('employees', emp);
      });
    }
    buildRoleSwitcher(); render();
  });
  CLOUD.startPolling();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
