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
  saveDB();
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
  saveDB();
}
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
  if (p.stage >= HSE.chain.length) return 'approved';
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
  const ext = (s === 'approved' && p.extension) ? ` <span class="stamp ${big ? 'big ' : ''}st-extended">مُمدَّد</span>` : '';
  return `<span class="stamp ${big ? 'big ' : ''}${m.cls}">${m.ar}</span>${ext}`;
}
function roleAr(key) {
  const r = HSE.teamRoles.find(r => r.key === key);
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
  return `<span class="appr-dots">${HSE.chain.map((_, i) => {
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
  { re: /^#\/equipment\/([^/]+)\/inspect$/, view: viewInspect, nav: 'equipment' },
  { re: /^#\/equipment\/([^/]+)$/, view: viewEquipmentDetail, nav: 'equipment' },
  { re: /^#\/risk\/new$/, view: viewRiskNew, nav: 'risk' },
  { re: /^#\/risk$/, view: viewRisk, nav: 'risk' },
  { re: /^#\/risk\/([^/]+)$/, view: viewRiskDetail, nav: 'risk' },
  { re: /^#\/team\/new$/, view: viewTeamForm, nav: 'team' },
  { re: /^#\/team\/([^/]+)$/, view: viewTeamForm, nav: 'team' },
  { re: /^#\/team$/, view: viewTeam, nav: 'team' },
];

function render() {
  const hash = location.hash || '#/';
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
  if (last.result === 'fail') return 'fail';
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
  const myTurn = pending.filter(p => HSE.chain[p.stage] && HSE.chain[p.stage].key === role);

  const recent = [...ps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">لوحة التحكم</div>
      <div class="page-sub">${esc(HSE.project.siteAr)} — ${fmtDate(new Date().toISOString())}</div>
    </div>
    <a class="btn btn-amber" href="#/permits/new">${icon('plus', 16)} تصريح جديد</a>
  </div>

  <div class="kpis">
    <div class="kpi" style="--kc:var(--green)"><div class="n">${active.length}</div><div class="l">تصاريح سارية</div><div class="s">معتمدة وضمن مدتها</div></div>
    <div class="kpi" style="--kc:var(--amber)"><div class="n">${pending.length}</div><div class="l">قيد الموافقة</div><div class="s">في سلسلة التواقيع</div></div>
    <div class="kpi" style="--kc:var(--red)"><div class="n">${lateEq.length}</div><div class="l">معدات تحتاج فحص</div><div class="s">متأخرة أو موقوفة</div></div>
    <div class="kpi" style="--kc:var(--slate)"><div class="n">${closedWeek.length}</div><div class="l">أُغلقت هذا الأسبوع</div><div class="s">مكتملة ومؤرشفة</div></div>
  </div>

  ${role !== 'creator' ? `
  <div class="card" style="margin-top:14px">
    <div class="card-head">${icon('pen', 17)} بانتظار توقيعك <span class="chip">${roleAr(role)}</span><span class="spacer"></span></div>
    ${myTurn.length ? `<div class="row-list">${myTurn.map(rowPermit).join('')}</div>`
      : `<div class="empty">${icon('check', 30)} لا توجد تصاريح بانتظار توقيعك الآن</div>`}
  </div>` : `
  <div class="card" style="margin-top:14px">
    <div class="card-head">${icon('clock', 17)} تصاريحك قيد الموافقة<span class="spacer"></span></div>
    ${pending.length ? `<div class="row-list">${pending.map(rowPermit).join('')}</div>`
      : `<div class="empty">${icon('check', 30)} لا توجد تصاريح قيد الموافقة</div>`}
  </div>`}

  <div class="card">
    <div class="card-head">${icon('history', 17)} أحدث التصاريح<span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/permits">عرض الكل ${icon('back', 13)}</a></div>
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
  </div>` : ''}`;
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
      <div class="page-title">تصاريح العمل</div>
      <div class="page-sub">السجل الكامل — بحث فوري بالكود أو الوصف أو المبنى</div>
    </div>
    <a class="btn btn-amber" href="#/permits/new">${icon('plus', 16)} جديد</a>
  </div>

  <div class="filters">
    <label class="search">${icon('search', 16)}<input id="pf-q" placeholder="بحث… (كود / وصف / مبنى)" value="${esc(f.q)}"></label>
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
    checklist: [],
  };
}

function viewPermitNew() {
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
          <select id="f-building">${HSE.buildings.map(b => `<option ${b === d.building ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
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
        <button class="btn btn-amber" id="f-next">التالي: التشيك لست ${icon('back', 15)}</button>
      </div>
    </div>`;
  }

  if (d.step === 2) {
    if (d.checklist.length !== t.checklist.length) d.checklist = t.checklist.map(() => 0);
    afterRender = bindStep2;
    return `
    <div class="page-head"><div class="grow">
      <div class="page-title">${t.ar} — التشيك لست</div>
      <div class="page-sub mono" style="direction:ltr;text-align:end">${HSE.project.codePrefix}-${d.building}-${t.codeTag}-${nextSeq}</div>
    </div></div>
    ${steps}
    <div class="card card-pad">
      ${t.checklist.map((item, i) => `
        <div class="ck-item">
          <div class="ck-no">${i + 1}</div>
          <div class="ck-text"><div class="ar">${esc(item.ar)}</div><div class="en">${esc(item.en)}</div></div>
          <div class="seg3" data-i="${i}">
            <button class="yes ${d.checklist[i] === 1 ? 'on' : ''}" data-v="1">YES</button>
            <button class="no ${d.checklist[i] === 2 ? 'on' : ''}" data-v="2">NO</button>
            <button class="na ${d.checklist[i] === 3 ? 'on' : ''}" data-v="3">N/A</button>
          </div>
        </div>`).join('')}
      <div class="divider"></div>
      <div class="action-bar">
        <button class="btn" id="f-back">${icon('back', 15)} رجوع</button>
        <button class="btn btn-amber" id="f-next2">التالي: المراجعة</button>
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
      ${HSE.chain.map((c) => `<div class="tl-step"><div class="tl-node">${icon('clock', 12)}</div>
        <div class="tl-role">${roleAr(c.key)}</div><div class="tl-name">${esc(roleName(c.key))}</div></div>`).join('')}
    </div>
    <div class="divider"></div>
    <div class="action-bar">
      <button class="btn" id="f-back3">${icon('back', 15)} رجوع</button>
      <button class="btn btn-green" id="f-submit">${icon('send', 15)} إرسال للموافقات</button>
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
      checklist: d.checklist, stage: 0,
      approvals: HSE.chain.map(() => null),
      rejection: null, extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: new Date().toISOString(),
    };
    p.code = permitCode(p);
    DB.permits.push(p); saveDB();
    CLOUD.push('permits', p);
    draft = null;
    toast(`تم إنشاء التصريح ${p.code}`);
    location.hash = '#/permit/' + p.id;
  });
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
  const myTurn = st === 'pending' && HSE.chain[p.stage] && HSE.chain[p.stage].key === role;
  const canCloseout = st === 'approved' && !p.closeout && ['consultantEngineer', 'hseConsultant'].includes(role);
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
    <div class="card-head">${icon('check', 17)} التشيك لست</div>
    <div class="card-pad" style="padding-top:6px">
      ${t.checklist.map((item, i) => `
        <div class="ck-item">
          <div class="ck-no">${i + 1}</div>
          <div class="ck-text"><div class="ar">${esc(item.ar)}</div></div>
          <span class="ck-ans ${ansCls[p.checklist[i]]}">${ansTxt[p.checklist[i]]}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-head">${icon('pen', 17)} سلسلة الموافقات</div>
    <div class="card-pad">
      <div class="tl">
        ${HSE.chain.map((c, i) => {
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
        <button class="btn btn-green" id="a-sign">${icon('pen', 15)} توقيع واعتماد</button>
        <button class="btn btn-red-o" id="a-reject">${icon('x', 15)} رفض مع ملاحظة</button>` : ''}
      ${st === 'pending' && !myTurn ? `
        <button class="btn" id="a-notify">${icon('send', 15)} تنبيه ${roleAr(HSE.chain[p.stage].key)} عبر واتساب</button>` : ''}
      ${canExtend ? `<button class="btn" id="a-extend">${icon('clock', 15)} تمديد التصريح</button>` : ''}
      ${canCloseout ? `<button class="btn btn-dark" id="a-close">${icon('check', 15)} إغلاق التصريح</button>` : ''}
      ${st === 'rejected' ? `<button class="btn btn-amber" id="a-reissue">${icon('copy', 15)} إعادة الإصدار بكود جديد</button>` : ''}
      <button class="btn" id="a-print">${icon('print', 15)} PDF / طباعة</button>
      ${CLOUD.enabled() && (st === 'approved' || st === 'closed') ? `<button class="btn" id="a-archive">${icon('doc', 15)} أرشفة PDF إلى Drive</button>` : ''}
      ${p.driveUrl ? `<a class="btn btn-ghost" href="${esc(p.driveUrl)}" target="_blank" rel="noopener">${icon('doc', 15)} النسخة المؤرشفة في Drive</a>` : ''}
      <button class="btn btn-ghost" id="a-copy">${icon('copy', 15)} نسخ الرابط</button>
    </div>
    ${myTurn ? `<div class="hint" style="margin-top:8px">أنت الآن بدور: <b>${roleAr(role)}</b> — توقيعك سيُسجَّل بالاسم والتاريخ والوقت.</div>` : ''}
  </div>`;
}

function bindPermitDetail(p) {
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

  on('#a-sign', () => openSignature({
    title: `توقيع ${roleAr(DB.currentRole)}`,
    name: roleName(DB.currentRole),
    onDone: (dataURL) => {
      p.approvals[p.stage] = { role: DB.currentRole, name: roleName(DB.currentRole), sig: dataURL, at: new Date().toISOString() };
      p.stage++;
      saveDB(); CLOUD.push('permits', p); render();
      toast(p.stage >= HSE.chain.length ? 'اكتملت الموافقات — التصريح معتمد ✓' : 'تم التوقيع — انتقل التصريح للمعتمد التالي');
    },
  }));

  on('#a-reject', () => {
    const note = prompt('سبب الرفض (سيظهر للمنشئ وفي السجل):');
    if (!note || !note.trim()) return;
    p.rejection = { by: roleName(DB.currentRole), role: DB.currentRole, note: note.trim(), at: new Date().toISOString() };
    saveDB(); CLOUD.push('permits', p); render();
    toast('تم تسجيل الرفض');
  });

  on('#a-notify', () => {
    const c = HSE.chain[p.stage];
    const emp = empFor(c.key);
    const phone = emp && emp.phone ? emp.phone.replace(/[^0-9]/g, '') : '';
    const url = location.origin + location.pathname + '#/permit/' + p.id;
    const msg = `تصريح عمل بانتظار موافقتك\n${permitCode(p)}\n${p.descAr || p.desc}\nالموقع: ${p.building} · ${fmtDate(p.dateFrom)}\nدورك الآن: ${roleAr(c.key)}\n${url}`;
    const base = phone ? `https://wa.me/${phone}?text=` : 'https://wa.me/?text=';
    window.open(base + encodeURIComponent(msg), '_blank');
  });

  on('#a-extend', () => {
    const from = prompt('تمديد من الساعة:', p.timeTo || '16:00'); if (!from) return;
    const to = prompt('إلى الساعة:', '19:00'); if (!to) return;
    openSignature({
      title: 'توقيع التمديد', name: roleName(DB.currentRole),
      onDone: (sig) => {
        p.extension = { from, to, by: roleName(DB.currentRole), sig, at: new Date().toISOString() };
        saveDB(); CLOUD.push('permits', p); render(); toast('تم تمديد التصريح');
      },
    });
  });

  on('#a-close', () => {
    openSignature({
      title: 'إغلاق التصريح — توقيع الاستشاري', name: roleName(DB.currentRole),
      onDone: (sig) => {
        const now = new Date();
        p.closeout = {
          date: todayISO(),
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          note: 'All work completed and area has been cleared.',
          by: roleName(DB.currentRole), sig, at: now.toISOString(),
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
      stage: 0, approvals: HSE.chain.map(() => null),
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
      ${t.checklist.map((item, i) => `
      <tr>
        <td class="n">${i + 1}</td>
        <td>${esc(item.en)}</td>
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
    <div class="sh-signs">
      ${HSE.chain.map((c, i) => {
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
      <span>HSE Digital System — generated ${fmtDT(new Date().toISOString())}</span>
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
      <div class="page-title">فحص المعدات</div>
      <div class="page-sub">كود لون هذا الشهر: <span class="month-dot" style="background:${mc.hex}"></span> ${mc.ar} — الفحص شهري لكل معدة</div>
    </div>
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

  <div class="card card-pad">
    <a class="btn btn-amber btn-block" href="#/equipment/${e.id}/inspect">${icon('check', 16)} فحص جديد الآن</a>
  </div>

  <div class="card">
    <div class="card-head">${icon('history', 17)} سجل الفحوصات (${e.inspections.length})</div>
    <div class="row-list">
      ${e.inspections.length ? e.inspections.map(i => `
        <div class="row-item" style="cursor:default">
          <div class="row-main">
            <div class="row-title">${i.result === 'pass' ? 'فحص سليم' : 'فحص غير مجتاز'} — ${esc(i.by)}</div>
            <div class="row-meta"><span class="mono">${fmtDate(i.date)}</span>${i.notes ? `<span>${esc(i.notes)}</span>` : ''}</div>
          </div>
          <span class="insp-badge ${i.result}">${i.result === 'pass' ? 'PASS' : 'FAIL'}</span>
        </div>`).join('') : `<div class="empty">لا توجد فحوصات مسجلة</div>`}
    </div>
  </div>`;
}

let inspDraft = null;
function viewInspect(id) {
  const e = DB.equipment.find(x => x.id === id);
  if (!e) return `<div class="empty">المعدة غير موجودة</div>`;
  const ty = HSE.equipmentTypes[e.type];
  if (!inspDraft || inspDraft.eqId !== id) inspDraft = { eqId: id, items: ty.items.map(() => 0), notes: '' };

  afterRender = () => {
    $$('.seg3').forEach(seg => {
      seg.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        inspDraft.items[+seg.dataset.i] = +b.dataset.v;
        $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      });
    });
    $('#ins-notes').addEventListener('input', ev => inspDraft.notes = ev.target.value);
    $('#ins-save').addEventListener('click', () => {
      if (inspDraft.items.some(v => v === 0)) { toast('أجب على جميع البنود'); return; }
      openSignature({
        title: 'توقيع الفاحص', name: roleName(DB.currentRole),
        onDone: (sig) => {
          const result = inspDraft.items.includes(2) ? 'fail' : 'pass';
          e.inspections.unshift({
            id: 'i' + (DB.counters.INS++),
            date: todayISO(), by: roleName(DB.currentRole),
            result, notes: inspDraft.notes.trim(), items: [...inspDraft.items], sig,
          });
          saveDB(); CLOUD.push('equipment', e); inspDraft = null;
          toast(result === 'pass' ? 'الفحص سليم — المعدة جاهزة للعمل' : 'الفحص غير مجتاز — تم إيقاف المعدة');
          location.hash = '#/equipment/' + e.id;
        },
      });
    });
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/equipment/${e.id}" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">${e.code}</div>
      <div class="page-title" style="font-size:18px">فحص ${esc(ty.ar)} — ${esc(e.model)}</div>
      <div class="page-sub">الفاحص: ${esc(roleName(DB.currentRole))} · ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>
  <div class="card card-pad">
    ${ty.items.map((item, i) => `
      <div class="ck-item">
        <div class="ck-no">${i + 1}</div>
        <div class="ck-text"><div class="ar">${esc(item)}</div></div>
        <div class="seg3" data-i="${i}">
          <button class="yes" data-v="1">YES</button>
          <button class="no" data-v="2">NO</button>
          <button class="na" data-v="3">N/A</button>
        </div>
      </div>`).join('')}
    <div class="divider"></div>
    <div class="field"><label>ملاحظات <small>(اختياري)</small></label>
      <textarea id="ins-notes" placeholder="أي ملاحظات على حالة المعدة…"></textarea></div>
    <div class="hint" style="margin:8px 0">أي إجابة بـ NO تُوقف المعدة تلقائيًا حتى الإصلاح وإعادة الفحص.</div>
    <button class="btn btn-green btn-block" id="ins-save">${icon('pen', 16)} توقيع وحفظ الفحص</button>
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
function riskScore(sev, lik) {
  const s = sev * lik;
  const cls = s <= 6 ? 'lo' : s <= 12 ? 'md' : 'hi';
  const lbl = s <= 6 ? 'منخفض' : s <= 12 ? 'متوسط' : 'عالٍ';
  return `<span class="risk-score ${cls}">${sev}×${lik} = ${s} · ${lbl}</span>`;
}

function viewRisk() {
  const list = [...DB.assessments].sort((a, b) => b.date.localeCompare(a.date));
  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">تقييم المخاطر</div>
      <div class="page-sub">اكتب النشاط — والنظام يقترح المخاطر والاحتياطات من المكتبة</div>
    </div>
    <a class="btn btn-amber" href="#/risk/new">${icon('plus', 16)} تقييم جديد</a>
  </div>
  <div class="card"><div class="row-list">
    ${list.length ? list.map(ra => `
      <div class="row-item" onclick="location.hash='#/risk/${ra.id}'">
        <div class="row-main">
          <div class="row-code">RA-${String(ra.seq).padStart(3, '0')}</div>
          <div class="row-title">${esc(ra.activity)}</div>
          <div class="row-meta"><span>${esc(ra.location)}</span><span class="mono">${fmtDate(ra.date)}</span><span>${ra.rows.length} مخاطر</span></div>
        </div>
        ${icon('back', 16)}
      </div>`).join('') : `<div class="empty">${icon('alert', 30)} لا توجد تقييمات بعد</div>`}
  </div></div>`;
}

let raDraft = null;
function viewRiskNew() {
  if (!raDraft) raDraft = { activity: '', location: 'B02', rows: [], suggested: null };

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
    $('#ra-add').addEventListener('click', () => {
      raDraft.rows.push({ hazard: '', control: '', sev: 3, lik: 3 });
      renderRaRows();
    });
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
        activity: raDraft.activity.trim(), location: raDraft.location,
        date: todayISO(), by: roleName(DB.currentRole) || HSE.creator.name,
        rows,
      };
      DB.assessments.push(ra); saveDB(); CLOUD.push('assessments', ra); raDraft = null;
      toast(`تم حفظ التقييم RA-${String(ra.seq).padStart(3, '0')}`);
      location.hash = '#/risk/' + ra.id;
    });
    renderRaSuggest(); renderRaRows();
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/risk" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">تقييم مخاطر جديد</div>
      <div class="page-sub">RA-${String(DB.counters.RA).padStart(3, '0')}</div>
    </div>
  </div>
  <div class="card card-pad">
    <div class="form-grid">
      <div class="field full"><label>النشاط</label>
        <input type="text" id="ra-activity" value="${esc(raDraft.activity)}" placeholder="مثال: أعمال ردم ودك في المبنى B02…"></div>
      <div class="field"><label>الموقع</label>
        <select id="ra-location">${HSE.buildings.map(b => `<option ${b === raDraft.location ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
    </div>
    <div id="ra-suggest"></div>
    <div class="divider"></div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <b style="font-size:14px">المخاطر والاحتياطات</b>
      <span class="spacer" style="flex:1"></span>
      <button class="btn btn-sm" id="ra-add">${icon('plus', 14)} إضافة يدوية</button>
    </div>
    <div id="ra-rows"></div>
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
    s.rows.forEach(r => raDraft.rows.push({ ...r }));
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
  box.innerHTML = raDraft.rows.map((r, i) => `
  <div class="ra-row">
    <div class="rr-head">
      <div style="flex:1">
        <input type="text" class="js-hz" data-i="${i}" value="${esc(r.hazard)}" placeholder="الخطر…" style="width:100%;border:0;outline:0;font-weight:700;font-size:13.5px;background:transparent">
      </div>
      <button class="rr-del js-del" data-i="${i}">${icon('x', 15)}</button>
    </div>
    <textarea class="js-ctl" data-i="${i}" placeholder="الاحتياطات (سطر لكل احتياط)…" style="width:100%;border:1px dashed var(--line);border-radius:5px;padding:7px 10px;font-size:12.5px;margin-top:6px;min-height:60px">${esc(r.control)}</textarea>
    <div style="display:flex;gap:8px;align-items:center;margin-top:7px;flex-wrap:wrap">
      <label style="font-size:11.5px;color:var(--mut)">الشدة
        <select class="mini-select js-sev" data-i="${i}">${[1,2,3,4,5].map(v => `<option ${v === r.sev ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </label>
      <label style="font-size:11.5px;color:var(--mut)">الاحتمالية
        <select class="mini-select js-lik" data-i="${i}">${[1,2,3,4,5].map(v => `<option ${v === r.lik ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </label>
      <span class="js-score" data-i="${i}">${riskScore(r.sev, r.lik)}</span>
    </div>
  </div>`).join('');

  $$('.js-hz', box).forEach(el => el.addEventListener('input', () => raDraft.rows[+el.dataset.i].hazard = el.value));
  $$('.js-ctl', box).forEach(el => el.addEventListener('input', () => raDraft.rows[+el.dataset.i].control = el.value));
  $$('.js-sev', box).forEach(el => el.addEventListener('change', () => {
    const r = raDraft.rows[+el.dataset.i]; r.sev = +el.value;
    $(`.js-score[data-i="${el.dataset.i}"]`, box).innerHTML = riskScore(r.sev, r.lik);
  }));
  $$('.js-lik', box).forEach(el => el.addEventListener('change', () => {
    const r = raDraft.rows[+el.dataset.i]; r.lik = +el.value;
    $(`.js-score[data-i="${el.dataset.i}"]`, box).innerHTML = riskScore(r.sev, r.lik);
  }));
  $$('.js-del', box).forEach(el => el.addEventListener('click', () => {
    raDraft.rows.splice(+el.dataset.i, 1); renderRaRows();
  }));
}

function viewRiskDetail(id) {
  const ra = DB.assessments.find(x => x.id === id);
  if (!ra) return `<div class="empty">التقييم غير موجود</div>`;
  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/risk" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">RA-${String(ra.seq).padStart(3, '0')}</div>
      <div class="page-title" style="font-size:18px">${esc(ra.activity)}</div>
      <div class="page-sub">${esc(ra.location)} · ${fmtDate(ra.date)} · أعده ${esc(ra.by)}</div>
    </div>
  </div>
  <div class="card card-pad">
    ${ra.rows.map((r, i) => `
    <div class="ra-row">
      <div class="rr-head"><div class="rr-hz">${i + 1}. ${esc(r.hazard)}</div>${riskScore(r.sev, r.lik)}</div>
      <div class="rr-ctl">${esc(r.control)}</div>
    </div>`).join('')}
  </div>`;
}

/* ============================================================
   إدارة الموظفين
   ============================================================ */
function viewTeam() {
  const groups = HSE.teamRoles.map(r => ({
    role: r,
    emps: DB.employees.filter(e => e.role === r.key),
  })).filter(g => g.emps.length);

  afterRender = () => {
    $$('.js-emp-toggle').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const e = DB.employees.find(x => x.id === b.dataset.id);
      e.active = !e.active; saveDB(); CLOUD.push('employees', e);
      buildRoleSwitcher(); render();
      toast(e.active ? `تم تفعيل ${e.name}` : `تم إيقاف ${e.name}`);
    }));
  };

  return `
  <div class="page-head">
    <div class="grow">
      <div class="page-title">إدارة الموظفين</div>
      <div class="page-sub">${DB.employees.filter(e => e.active).length} نشط من أصل ${DB.employees.length} — المعتمدون والفاحصون والعمال</div>
    </div>
    <a class="btn btn-amber" href="#/team/new">${icon('plus', 16)} موظف جديد</a>
  </div>

  ${groups.map(g => `
  <div class="card">
    <div class="card-head">${icon(g.role.duty ? 'pen' : g.role.key === 'worker' ? 'user' : 'check', 17)} ${g.role.ar}
      <span class="chip">${g.emps.length}</span><span class="spacer"></span></div>
    <div class="row-list">
      ${g.emps.map(e => `
      <div class="row-item ${e.active ? '' : 'emp-off'}" onclick="location.hash='#/team/${e.id}'">
        <div class="eq-ic">${icon('user', 19)}</div>
        <div class="row-main">
          <div class="row-title" dir="ltr" style="text-align:start">${esc(e.name)}</div>
          <div class="row-meta"><span class="chip">${esc(e.company)}</span>${e.phone ? `<span class="mono">${esc(e.phone)}</span>` : '<span>بدون جوال</span>'}</div>
        </div>
        <div class="row-side">
          <span class="stamp ${e.active ? 'st-approved' : 'st-closed'}">${e.active ? 'نشط' : 'موقوف'}</span>
          <button class="btn btn-sm js-emp-toggle" data-id="${e.id}">${e.active ? 'إيقاف' : 'تفعيل'}</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('')}

  <div class="card card-pad">
    <div class="hint">المعتمد المعروض في سلسلة الموافقات هو الموظف <b>النشط</b> الأول بذلك الدور — التصاريح الموقعة سابقًا تحتفظ بأسماء موقّعيها كما هي.
    <br>أضف رقم الجوال بصيغة دولية (9665xxxxxxxx) ليصل تنبيه واتساب مباشرة لصاحب الدور.</div>
  </div>`;
}

function viewTeamForm(id) {
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
        <select id="emp-role">${HSE.teamRoles.map(r => `<option value="${r.key}" ${r.key === e.role ? 'selected' : ''}>${r.ar}</option>`).join('')}</select></div>
      <div class="field"><label>الجهة</label>
        <select id="emp-company">${HSE.companies.map(c => `<option ${c === e.company ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field full"><label>الجوال <small>(بصيغة دولية لتنبيهات واتساب — اختياري)</small></label>
        <input type="text" id="emp-phone" value="${esc(e.phone)}" dir="ltr" placeholder="9665XXXXXXXX"></div>
      <div class="field full"><label>البريد الإلكتروني <small>(يصله إشعار تلقائي عندما يكون الدور عليه — اختياري)</small></label>
        <input type="text" id="emp-email" value="${esc(e.email || '')}" dir="ltr" placeholder="name@company.com"></div>
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
   الإقلاع
   ============================================================ */
function buildRoleSwitcher() {
  const roleSel = $('#role-select');
  if (!roleSel) return;
  roleSel.innerHTML = HSE.teamRoles.filter(r => r.duty).map(r =>
    `<option value="${r.key}" ${r.key === DB.currentRole ? 'selected' : ''}>${r.ar} — ${roleName(r.key)}</option>`).join('');
}

function boot() {
  loadDB();

  // مبدّل الدور — يُبنى من سجل الموظفين النشطين
  const roleSel = $('#role-select');
  buildRoleSwitcher();
  roleSel.addEventListener('change', () => {
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
  CLOUD.bootstrap().then(() => { buildRoleSwitcher(); render(); });
  CLOUD.startPolling();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
