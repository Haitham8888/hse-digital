/* ============================================================
   فراس — محرك السجلات الموحد
   عشر وحدات تشغيلية مبنية على نماذج المشروع الفعلية في Drive:
   حوادث، مخالفات، ملاحظات، Near Miss، TBT/تدريب/اجتماعات،
   تدقيق SSA، NCR، خطة رفع، طلبات شراء، تقرير رياح + لوحة KPI + وثائق
   ============================================================ */

'use strict';

/* ---------- تعريف الوحدات ---------- */
const REGS = {
  incidents: {
    entity: 'incidents', seq: 'INC', prefix: 'INC', titleAr: 'الحوادث', one: 'حادث',
    en: 'Incident Notification Form', icon: 'alert', color: 'var(--red)',
    folder: 'INCIDENT NOTIFICATION', media: true, closable: true, notify: true,
    fields: [
      { k: 'date', ar: 'تاريخ الحادث', type: 'date' },
      { k: 'time', ar: 'وقت الحادث', type: 'time' },
      { k: 'location', ar: 'الموقع', type: 'building' },
      { k: 'reportedBy', ar: 'المبلّغ', type: 'emp' },
      { k: 'workRelated', ar: 'مرتبط بالعمل؟', type: 'radio', opts: ['Yes', 'No'] },
      { k: 'party', ar: 'الطرف المتأثر', type: 'radio', opts: ['RBC', 'Sub-Contractor', 'Client', 'PMC/Consultant', 'Public'] },
      { k: 'impact', ar: 'فئة التأثير', type: 'checks', opts: ['People', 'Production', 'Environment', 'RBC Asset', 'Work-Stop', 'Property Damage'] },
      { k: 'itype', ar: 'نوع الحادث', type: 'radio', opts: ['Fatality', 'LTI', 'Medical Treatment', 'First Aid', 'Occupational Illness', 'Fire', 'Heavy Equipment (HEI)', 'Road Vehicle (RVI)', 'Property Damage', 'Environmental', 'High Potential', 'Security'] },
      { k: 'severity', ar: 'الخطورة', type: 'radio', opts: ['Class-A', 'Class-B', 'Class-C', 'Class-D', 'Class-E'] },
      { k: 'desc', ar: 'وصف الحادث الكامل (ماذا، من، أين، لماذا)', type: 'textarea', req: true },
      { k: 'actions', ar: 'الإجراءات الفورية المتخذة', type: 'textarea' },
      { k: 'hr', ar: 'إجراء تأديبي مطلوب؟', type: 'radio', opts: ['Yes', 'No', 'N/A'] },
    ],
    listTitle: r => r.desc, listMeta: r => `${r.itype || ''} · ${r.severity || ''}`,
    signs: ['NOTIFICATION PREPARED BY (HSE)', 'PROJECT MANAGER'],
  },
  violations: {
    entity: 'violations', seq: 'VIO', prefix: 'VIO', titleAr: 'المخالفات', one: 'مخالفة',
    en: 'Safety Violation Reporting', icon: 'shield', color: 'var(--amber-ink)',
    folder: 'Safety Violation Reporting', media: true, closable: true,
    fields: [
      { k: 'date', ar: 'التاريخ', type: 'date' },
      { k: 'violator', ar: 'اسم المخالف', type: 'text', req: true },
      { k: 'vid', ar: 'رقم الهوية', type: 'text' },
      { k: 'position', ar: 'الوظيفة', type: 'text' },
      { k: 'company', ar: 'الجهة', type: 'radio', opts: ['Al-Rajhi (RBC)', 'Sub-Contractor'] },
      { k: 'location', ar: 'الموقع', type: 'building' },
      { k: 'desc', ar: 'وصف المخالفة وتقييمها', type: 'textarea', req: true },
      { k: 'siteActions', ar: 'الإجراءات الميدانية المتخذة', type: 'textarea' },
      { k: 'corrective', ar: 'الإجراء التصحيحي الموصى به', type: 'textarea' },
      { k: 'disciplinary', ar: 'الإجراء التأديبي الموصى به', type: 'text' },
    ],
    listTitle: r => `${r.violator} — ${r.desc}`, listMeta: r => r.company || '',
    signs: ['Offender', 'HSE Manager / Asst.', 'PM / Site Manager', 'HSE Consultant'],
  },
  nearmiss: {
    entity: 'nearmiss', seq: 'NM', prefix: 'NM', titleAr: 'Near Miss', one: 'بلاغ Near Miss',
    en: 'Near Miss Report', icon: 'alert', color: 'var(--blue)',
    folder: 'Near Miss', media: true, closable: true,
    fields: [
      { k: 'date', ar: 'تاريخ الحدث', type: 'date' },
      { k: 'location', ar: 'الموقع', type: 'building' },
      { k: 'reportedBy', ar: 'المبلّغ', type: 'emp' },
      { k: 'desc', ar: 'وصف الحدث', type: 'textarea', req: true },
      { k: 'actions', ar: 'الإجراءات الفورية', type: 'textarea' },
      { k: 'potential', ar: 'العواقب المحتملة', type: 'checks', opts: ['Environmental', 'Health & Safety', 'Operational'] },
      { k: 'corrective', ar: 'الإجراءات التصحيحية', type: 'textarea' },
    ],
    listTitle: r => r.desc, listMeta: r => r.location || '',
    signs: ['HSE Engineer', 'PM / Site Engineer'],
  },
  observations: {
    entity: 'observations', seq: 'SOR', prefix: 'SOR', titleAr: 'الملاحظات الميدانية', one: 'تقرير ملاحظات',
    en: 'Site Observations Report', icon: 'search', color: 'var(--slate)',
    folder: 'SOR', media: true, closable: true, rows: { obs: 'الملاحظة', action: 'الإجراء المتخذ' },
    fields: [
      { k: 'date', ar: 'التاريخ', type: 'date' },
      { k: 'location', ar: 'الموقع', type: 'building' },
    ],
    listTitle: r => `جولة ${fmtDate(r.date)} — ${(r.items || []).length} ملاحظة`,
    listMeta: r => `${(r.items || []).filter(i => i.closed).length}/${(r.items || []).length} مغلقة`,
    signs: ['Prepared By (HSE)'],
  },
  tbts: {
    entity: 'tbts', seq: 'TBT', prefix: 'TBT', titleAr: 'TBT والتدريب والاجتماعات', one: 'جلسة',
    en: 'Tool Box Talk / Training / Meeting', icon: 'user', color: 'var(--green)',
    folder: 'TBT', media: true, attendance: true,
    fields: [
      { k: 'kind', ar: 'النوع', type: 'radio', opts: ['TBT', 'تدريب', 'اجتماع'] },
      { k: 'date', ar: 'التاريخ', type: 'date' },
      { k: 'time', ar: 'الوقت', type: 'time' },
      { k: 'location', ar: 'الموقع', type: 'building' },
      { k: 'topic', ar: 'الموضوع', type: 'text', req: true },
      { k: 'speaker', ar: 'المتحدث / المدرب', type: 'emp' },
      { k: 'notes', ar: 'محتوى الجلسة', type: 'textarea' },
    ],
    listTitle: r => `${r.kind || 'TBT'} — ${r.topic}`,
    listMeta: r => `${(r.attendance || []).length} حاضرًا · ${r.location || ''}`,
    signs: [],
  },
  audits: {
    entity: 'audits', seq: 'SSA', prefix: 'SSA', titleAr: 'التدقيق الميداني', one: 'تدقيق',
    en: 'Site Safety Audit', icon: 'check', color: 'var(--amber-ink)',
    folder: 'Site Safety Audit', media: true, closable: true,
    rows: { obs: 'الملاحظة / Finding', action: 'الإجراء المطلوب', extra: 'المسؤول Action By' },
    refFmt: n => `SCC-RBC-ESCC-B10-XX-SSA-${String(n).padStart(2, '0')}`,
    fields: [
      { k: 'dateFrom', ar: 'من تاريخ', type: 'date' },
      { k: 'dateTo', ar: 'إلى تاريخ', type: 'date' },
      { k: 'location', ar: 'الموقع', type: 'building' },
    ],
    listTitle: r => `تدقيق ${fmtDate(r.dateFrom)} — ${(r.items || []).length} ملاحظة`,
    listMeta: r => `${(r.items || []).filter(i => i.closed).length}/${(r.items || []).length} مغلقة`,
    signs: ['RBC HSE Manager', "ESCC's HSE Manager"],
  },
  ncrs: {
    entity: 'ncrs', seq: 'NCR', prefix: 'NCR', titleAr: 'عدم المطابقة NCR', one: 'تقرير NCR',
    en: 'Non-Conformance Report', icon: 'x', color: 'var(--red)',
    folder: 'NCR', media: true, closable: true,
    refFmt: n => `SCC-ESCC-RBC-NCR-${String(n).padStart(3, '0')}`,
    fields: [
      { k: 'date', ar: 'التاريخ', type: 'date' },
      { k: 'location', ar: 'الموقع', type: 'building' },
      { k: 'desc', ar: 'وصف عدم المطابقة', type: 'textarea', req: true },
      { k: 'reference', ar: 'المرجع (مواصفة/مخطط/إجراء)', type: 'text' },
      { k: 'corrective', ar: 'الإجراء التصحيحي المطلوب', type: 'textarea' },
      { k: 'rootCause', ar: 'السبب الجذري', type: 'textarea' },
    ],
    listTitle: r => r.desc, listMeta: r => r.location || '',
    signs: ['Issued By', 'Contractor Rep.', 'Consultant (ESCC)'],
  },
  liftings: {
    entity: 'liftings', seq: 'LP', prefix: 'LP', titleAr: 'خطط الرفع', one: 'خطة رفع',
    en: 'Lifting Plan', icon: 'lift', color: 'var(--blue)',
    folder: 'Lfting plan', media: true, lifting: true,
    fields: [
      { k: 'date', ar: 'التاريخ', type: 'date' },
      { k: 'location', ar: 'الموقع', type: 'building' },
      { k: 'crane', ar: 'الرافعة (النوع/الموديل)', type: 'text', req: true },
      { k: 'craneOwner', ar: 'مالك الرافعة', type: 'text' },
      { k: 'task', ar: 'وصف الحمولة والمهمة', type: 'textarea', req: true },
      { k: 'loadWt', ar: 'وزن الحمولة (طن)', type: 'number' },
      { k: 'hookWt', ar: 'وزن بكرة الخطاف (طن)', type: 'number' },
      { k: 'radius', ar: 'نصف قطر العمل (م)', type: 'number' },
      { k: 'boomLen', ar: 'طول الذراع (م)', type: 'number' },
      { k: 'chartCap', ar: 'سعة الجدول عند هذا الوضع (طن)', type: 'number', req: true },
    ],
    checklist: [
      'وثائق الرافعة والمشغل والرقّاص سارية', 'معدات الرفع مفحوصة وموسومة',
      'منطقة الرفع محددة بالحواجز', 'الطقس مناسب (رياح < 32كم/س)',
      'المساند ممدودة بالكامل على ألواح', 'الرؤية والتواصل مع المُشير مؤمنة',
      'لا مخاطر حريق أو خطوط كهرباء', 'مسار الحمولة خالٍ من الأشخاص',
    ],
    listTitle: r => `${r.crane} — ${r.task}`,
    listMeta: r => liftPct(r) ? `استغلال السعة ${liftPct(r)}%` : '',
    signs: ['Lifting Supervisor', 'HSE', 'Crane Operator'],
  },
  requests: {
    entity: 'requests', seq: 'REQ', prefix: 'طلب', titleAr: 'طلبات الشراء', one: 'طلب شراء',
    en: 'Material Purchase Request', icon: 'doc', color: 'var(--green)',
    folder: 'نموذج الطلبات', media: false, closable: true,
    rows: { obs: 'الصنف', action: 'الكمية المطلوبة حاليًا', extra: 'الوحدة' },
    fields: [
      { k: 'date', ar: 'التاريخ', type: 'date' },
      { k: 'item', ar: 'موضوع الطلب', type: 'text', req: true },
      { k: 'supplier', ar: 'المورد (إن وجد)', type: 'text' },
      { k: 'notes', ar: 'ملاحظات', type: 'textarea' },
    ],
    listTitle: r => r.item, listMeta: r => `${(r.items || []).length} صنفًا`,
    signs: ['مهندس الموقع', 'مدير المجموعة', 'مدير المشاريع', 'مدير المشتريات'],
  },
  weathers: {
    entity: 'weathers', seq: 'WX', prefix: 'WX', titleAr: 'تقارير الطقس', one: 'إشعار طقس',
    en: 'Notice of Adverse Climatic Conditions', icon: 'alert', color: 'var(--slate)',
    folder: 'تقرير الرياح', media: true,
    fields: [
      { k: 'date', ar: 'تاريخ الحالة', type: 'date' },
      { k: 'time', ar: 'وقت البدء', type: 'time' },
      { k: 'nature', ar: 'طبيعة الحالة الجوية', type: 'radio', opts: ['عاصفة رملية', 'رياح شديدة', 'أمطار غزيرة', 'حرارة مفرطة', 'أخرى'] },
      { k: 'desc', ar: 'الوصف والمرجع', type: 'textarea' },
      { k: 'impact', ar: 'الأثر على الأعمال (الأنشطة المتوقفة)', type: 'textarea', req: true },
    ],
    listTitle: r => `${r.nature} — ${fmtDate(r.date)}`, listMeta: r => '',
    signs: ['Prepared By (HSE)', 'Project Manager'],
  },
};

function liftPct(r) {
  const total = (Number(r.loadWt) || 0) * 1.1 + (Number(r.hookWt) || 0);
  const cap = Number(r.chartCap) || 0;
  return cap ? Math.round(total / cap * 100) : 0;
}
const SYNC_REG_ENTITIES = Object.values(REGS).map(c => c.entity);

function regRef(cfg, n) {
  return cfg.refFmt ? cfg.refFmt(n) : `${cfg.prefix}-${String(n).padStart(3, '0')}`;
}
function regList(cfg) { return DB[cfg.entity] || (DB[cfg.entity] = []); }

/* ---------- مركز السجلات ---------- */
function viewRegHub() {
  const cards = Object.entries(REGS).map(([key, c]) => {
    const list = regList(c);
    const open = c.closable ? list.filter(r => r.status !== 'closed').length : list.length;
    return `<div class="eq-card" onclick="location.hash='#/reg/${key}'">
      <div class="eq-ic" style="color:${c.color}">${icon(c.icon, 21)}</div>
      <div class="eq-main">
        <div class="eq-name">${esc(LANG === 'en' ? c.en : c.titleAr)}</div>
        <div class="eq-meta">${list.length} سجلًا${c.closable && open ? ` · ${open} مفتوح` : ''}</div>
      </div>
      ${icon('back', 16)}
    </div>`;
  }).join('');
  return `
  <div class="page-head"><div class="grow">
    <div class="page-title">${tr('registers')}</div>
    <div class="page-sub">${tr('regsSub')}</div>
  </div></div>
  <div class="eq-grid">
    <div class="eq-card" onclick="location.hash='#/risk'">
      <div class="eq-ic" style="color:var(--amber-ink)">${icon('alert', 21)}</div>
      <div class="eq-main"><div class="eq-name">${tr('risk')}</div>
      <div class="eq-meta">${(DB.assessments || []).length} تقييمًا</div></div>${icon('back', 16)}
    </div>
    ${cards}
    <div class="eq-card" onclick="location.hash='#/board'">
      <div class="eq-ic" style="color:var(--green)">${icon('grid', 21)}</div>
      <div class="eq-main"><div class="eq-name">${tr('board')}</div>
      <div class="eq-meta">تتولد تلقائيًا من بيانات النظام</div></div>${icon('back', 16)}
    </div>
    <div class="eq-card" onclick="location.hash='#/docs'">
      <div class="eq-ic">${icon('doc', 21)}</div>
      <div class="eq-main"><div class="eq-name">${tr('docs')}</div>
      <div class="eq-meta">السياسات، خطة الطوارئ، خطة HSE…</div></div>${icon('back', 16)}
    </div>
  </div>`;
}

/* ---------- قائمة سجل ---------- */
function viewRegList(key) {
  const c = REGS[key]; if (!c) return '<div class="empty">غير موجود</div>';
  const list = [...regList(c)].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/registers" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">${esc(LANG === 'en' ? c.en : c.titleAr)}</div>
      <div class="page-sub">${esc(LANG === 'en' ? c.titleAr : c.en)} — يؤرشف في مجلد «${esc(c.folder)}»</div>
    </div>
    ${canCreate() ? `<a class="btn btn-amber" href="#/reg/${key}/new">${icon('plus', 16)} ${esc(c.one)} جديد</a>` : ''}
  </div>
  <div class="card"><div class="row-list">
    ${list.length ? list.map(r => `
    <div class="row-item" onclick="location.hash='#/reg/${key}/${r.id}'">
      <div class="row-main">
        <div class="row-code">${esc(r.refNo)}</div>
        <div class="row-title">${esc(c.listTitle(r) || '')}</div>
        <div class="row-meta"><span class="mono">${fmtDate(r.date || r.dateFrom || r.createdAt)}</span><span>${esc(c.listMeta(r) || '')}</span></div>
      </div>
      ${c.closable ? (r.status === 'closed' ? '<span class="stamp st-closed">مغلق</span>' : '<span class="stamp st-pending">مفتوح</span>') : ''}
    </div>`).join('') : `<div class="empty">${icon(c.icon, 30)} لا توجد سجلات بعد${canCreate() ? ' — أنشئ أول ' + esc(c.one) : ''}</div>`}
  </div></div>`;
}

/* ---------- نموذج إنشاء ---------- */
let regDraft = null;
function regFieldHTML(f, val) {
  const v = val ?? '';
  switch (f.type) {
    case 'textarea': return `<div class="field full"><label>${esc(f.ar)}${f.req ? ' *' : ''}</label><textarea class="js-rf" data-k="${f.k}">${esc(v)}</textarea></div>`;
    case 'date': return `<div class="field"><label>${esc(f.ar)}</label><input type="date" class="js-rf" data-k="${f.k}" value="${esc(v || todayISO())}"></div>`;
    case 'time': return `<div class="field"><label>${esc(f.ar)}</label><input type="time" class="js-rf" data-k="${f.k}" value="${esc(v || new Date().toTimeString().slice(0, 5))}"></div>`;
    case 'number': return `<div class="field"><label>${esc(f.ar)}${f.req ? ' *' : ''}</label><input type="number" step="any" class="js-rf" data-k="${f.k}" value="${esc(v)}" dir="ltr"></div>`;
    case 'building': return `<div class="field"><label>${esc(f.ar)}</label><select class="js-rf js-bld" data-k="${f.k}">${bldOptionsHTML(v)}</select></div>`;
    case 'emp': return `<div class="field"><label>${esc(f.ar)}</label><select class="js-rf" data-k="${f.k}">${DB.employees.filter(e => e.active && e.role !== '_config').map(e => `<option ${e.name === v ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></div>`;
    case 'radio': return `<div class="field full"><label>${esc(f.ar)}</label><div style="display:flex;flex-wrap:wrap;gap:8px">${f.opts.map(o =>
      `<label class="chip" style="cursor:pointer;padding:6px 12px"><input type="radio" name="rf-${f.k}" class="js-rfr" data-k="${f.k}" value="${esc(o)}" ${o === v ? 'checked' : ''} style="margin-inline-end:5px">${esc(o)}</label>`).join('')}</div></div>`;
    case 'checks': return `<div class="field full"><label>${esc(f.ar)}</label><div style="display:flex;flex-wrap:wrap;gap:8px">${f.opts.map(o =>
      `<label class="chip" style="cursor:pointer;padding:6px 12px"><input type="checkbox" class="js-rfc" data-k="${f.k}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''} style="margin-inline-end:5px">${esc(o)}</label>`).join('')}</div></div>`;
    default: return `<div class="field full"><label>${esc(f.ar)}${f.req ? ' *' : ''}</label><input type="text" class="js-rf" data-k="${f.k}" value="${esc(v)}"></div>`;
  }
}

function viewRegNew(key) {
  const c = REGS[key]; if (!c) return '<div class="empty">غير موجود</div>';
  if (!canCreate()) return blockedCard(`إنشاء ${c.one} صلاحية مدير النظام ومنشئي التصاريح`);
  if (!regDraft || regDraft._key !== key) regDraft = { _key: key, media: [], items: [], checklist: (c.checklist || []).map(() => 0) };
  const d = regDraft;

  afterRender = () => {
    $$('.js-rf').forEach(el => el.addEventListener('input', () => d[el.dataset.k] = el.value));
    $$('.js-rfr').forEach(el => el.addEventListener('change', () => d[el.dataset.k] = el.value));
    $$('.js-rfc').forEach(el => el.addEventListener('change', () => {
      d[el.dataset.k] = d[el.dataset.k] || [];
      if (el.checked) d[el.dataset.k].push(el.value);
      else d[el.dataset.k] = d[el.dataset.k].filter(x => x !== el.value);
    }));
    // القيم الافتراضية للحقول الظاهرة
    $$('.js-rf').forEach(el => { if (!d[el.dataset.k] && el.value) d[el.dataset.k] = el.value; });
    // صفوف (ملاحظات/أصناف)
    $('#rg-row-add')?.addEventListener('click', () => {
      d.items.push({ obs: '', action: '', extra: '', closed: false });
      render();
    });
    $$('.js-rg-ri').forEach(el => el.addEventListener('input', () => {
      d.items[+el.dataset.i][el.dataset.f] = el.value;
    }));
    $$('.js-rg-rdel').forEach(b => b.addEventListener('click', () => { d.items.splice(+b.dataset.i, 1); render(); }));
    // تشيك لست خطة الرفع
    $$('.seg3[data-rg]').forEach(seg => seg.addEventListener('click', ev => {
      const b2 = ev.target.closest('button'); if (!b2) return;
      d.checklist[+seg.dataset.rg] = +b2.dataset.v;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b2));
    }));
    // مرفقات
    $('#rg-media')?.addEventListener('change', async ev => {
      await addMediaFiles([...ev.target.files], d.media);
      $('#rg-media-grid').innerHTML = mediaGridHTML(d.media, 'js-rgm-del'); bindRgm();
    });
    const bindRgm = () => $$('.js-rgm-del').forEach(b => b.addEventListener('click', () => {
      d.media.splice(+b.dataset.i, 1);
      $('#rg-media-grid').innerHTML = mediaGridHTML(d.media, 'js-rgm-del'); bindRgm();
    }));
    bindRgm();
    $('#rg-save').addEventListener('click', () => saveReg(key));
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/reg/${key}" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">${esc(c.one)} جديد</div>
      <div class="page-sub mono" style="direction:ltr;text-align:end">${esc(regRef(c, DB.counters[c.seq] || 1))}</div>
    </div>
  </div>
  <div class="card card-pad">
    <div class="form-grid">${c.fields.map(f => regFieldHTML(f, d[f.k])).join('')}</div>
    ${c.rows ? `
    <div class="divider"></div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <b style="font-size:14px">${esc(c.rows.obs)} — البنود</b><span style="flex:1"></span>
      <button class="btn btn-sm" id="rg-row-add" type="button">${icon('plus', 14)} إضافة بند</button>
    </div>
    ${d.items.map((it, i) => `
    <div class="ra-row">
      <div class="rr-head">
        <input type="text" class="js-rg-ri" data-i="${i}" data-f="obs" value="${esc(it.obs)}" placeholder="${esc(c.rows.obs)}…" style="flex:1;border:0;outline:0;font-weight:700;background:transparent">
        <button class="rr-del js-rg-rdel" data-i="${i}">${icon('x', 15)}</button>
      </div>
      <input type="text" class="js-rg-ri" data-i="${i}" data-f="action" value="${esc(it.action)}" placeholder="${esc(c.rows.action)}…" style="width:100%;border:0;border-bottom:1px dashed var(--line);outline:0;font-size:12.5px;padding:4px 0;background:transparent">
      ${c.rows.extra ? `<input type="text" class="js-rg-ri" data-i="${i}" data-f="extra" value="${esc(it.extra || '')}" placeholder="${esc(c.rows.extra)}…" style="width:100%;border:0;outline:0;font-size:12.5px;padding:4px 0;background:transparent">` : ''}
    </div>`).join('') || '<div class="hint">أضف البنود بزر «إضافة بند»</div>'}` : ''}
    ${c.checklist ? `
    <div class="divider"></div>
    <b style="font-size:14px">تشيك لست ما قبل الرفع:</b>
    ${c.checklist.map((item, i) => `
    <div class="ck-item">
      <div class="ck-no">${i + 1}</div>
      <div class="ck-text"><div class="ar">${esc(item)}</div></div>
      <div class="seg3" data-rg="${i}">
        <button class="yes ${d.checklist[i] === 1 ? 'on' : ''}" data-v="1" style="width:52px">YES</button>
        <button class="no ${d.checklist[i] === 2 ? 'on' : ''}" data-v="2" style="width:52px">NO</button>
      </div>
    </div>`).join('')}` : ''}
    ${c.lifting ? `<div class="hint" id="rg-liftpct" style="margin-top:8px"></div>` : ''}
    ${c.media ? `
    <div class="divider"></div>
    <div class="field full"><label>صور ومقاطع <small>(حتى 10)</small></label>
      <input type="file" id="rg-media" accept="image/*,video/*" multiple>
      <div id="rg-media-grid" style="margin-top:8px">${mediaGridHTML(d.media, 'js-rgm-del')}</div></div>` : ''}
    <div class="divider"></div>
    <button class="btn btn-green btn-block" id="rg-save">${icon('check', 16)} حفظ ${esc(c.one)}</button>
  </div>`;
}

async function saveReg(key) {
  const c = REGS[key];
  const d = regDraft;
  for (const f of c.fields) {
    if (f.req && !(d[f.k] || '').toString().trim()) { toast(`املأ حقل: ${f.ar}`); return; }
  }
  if (c.lifting) {
    const pct = liftPct(d);
    if (pct > 70 && !confirm(`تحذير: استغلال سعة الرافعة ${pct}% يتجاوز حد 70% — متأكد من المتابعة؟`)) return;
  }
  let seq;
  if (CLOUD.enabled()) {
    try { seq = await CLOUD.nextSeq(c.seq); DB.counters[c.seq] = Math.max(DB.counters[c.seq] || 1, seq + 1); }
    catch (e) { toast('تعذر الاتصال — إصدار الرقم يتطلب إنترنت'); return; }
  } else {
    seq = DB.counters[c.seq] = (DB.counters[c.seq] || 1); DB.counters[c.seq]++;
  }
  const rec = { id: key.slice(0, 2) + Date.now().toString(36), refNo: regRef(c, seq), seq, status: 'open', by: currentUserName(), createdAt: new Date().toISOString() };
  c.fields.forEach(f => rec[f.k] = d[f.k] ?? '');
  if (c.rows) rec.items = d.items.filter(it => (it.obs || '').trim());
  if (c.checklist) rec.checklist = d.checklist;
  if (c.media) rec.media = d.media.slice(0, MEDIA_MAX);
  if (c.attendance) rec.attendance = [];
  if (c.lifting) rec.pct = liftPct(d);
  regList(c).push(rec);
  saveDB(); CLOUD.push(c.entity, rec);
  regDraft = null;
  toast(`تم الحفظ: ${rec.refNo}`);
  location.hash = `#/reg/${key}/${rec.id}`;
  // أرشفة تلقائية للحوادث فور التسجيل
  if (key === 'incidents') archiveReg(key, rec, true);
}

/* ---------- تفاصيل سجل ---------- */
function viewRegDetail(key, id) {
  const c = REGS[key]; if (!c) return '<div class="empty">غير موجود</div>';
  const r = regList(c).find(x => x.id === id);
  if (!r) return '<div class="empty">السجل غير موجود</div>';

  afterRender = () => {
    $('#rg-print')?.addEventListener('click', () => printReg(key, r));
    $('#rg-archive')?.addEventListener('click', () => archiveReg(key, r, false));
    $('#rg-close')?.addEventListener('click', () => {
      const note = prompt('ملاحظة الإغلاق (الإجراء التصحيحي المنفذ):', '') ?? '';
      r.status = 'closed'; r.closedAt = new Date().toISOString(); r.closeNote = note;
      saveDB(); CLOUD.push(c.entity, r); render();
      toast('أُغلق السجل'); archiveReg(key, r, true);
    });
    $$('.js-rg-itclose').forEach(b => b.addEventListener('click', () => {
      const it = r.items[+b.dataset.i];
      it.closed = !it.closed;
      if (it.closed) it.closedAt = todayISO();
      saveDB(); CLOUD.push(c.entity, r); render();
    }));
    // حضور TBT بتوقيع الإصبع
    $('#rg-att-add')?.addEventListener('click', () => {
      const sel = $('#rg-att-sel');
      const name = sel.value === '__free' ? (prompt('اسم الحاضر:') || '').trim() : sel.value;
      if (!name) return;
      openSignature({
        title: `توقيع الحضور — ${name}`, name,
        onDone: (sig) => {
          r.attendance = r.attendance || [];
          r.attendance.push({ name, sig, at: new Date().toISOString() });
          saveDB(); CLOUD.push(c.entity, r); render();
          toast(`سُجل حضور ${name}`);
        },
      });
    });
    $('#rgd-media')?.addEventListener('change', async ev => {
      r.media = r.media || [];
      await addMediaFiles([...ev.target.files], r.media);
      saveDB(); CLOUD.push(c.entity, r); render();
    });
  };

  const fieldVal = (f) => {
    const v = r[f.k];
    if (Array.isArray(v)) return v.join('، ') || '—';
    return (v || '—');
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/reg/${key}" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="row-code" style="font-size:13px">${esc(r.refNo)}</div>
      <div class="page-title" style="font-size:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(c.listTitle(r) || c.one)}</div>
      <div class="page-sub">${esc(r.by || '')} · ${fmtDT(r.createdAt)}</div>
    </div>
    ${c.closable ? (r.status === 'closed' ? '<span class="stamp big st-closed">مغلق</span>' : '<span class="stamp big st-pending">مفتوح</span>') : ''}
  </div>

  <div class="card card-pad">
    <div class="kv">
      ${c.fields.filter(f => f.type !== 'textarea').map(f => `<div><div class="k">${esc(f.ar)}</div><div class="v">${esc(fieldVal(f))}</div></div>`).join('')}
      ${c.lifting ? `<div><div class="k">استغلال السعة</div><div class="v" style="color:${liftPct(r) > 70 ? 'var(--red)' : 'var(--green)'}">${liftPct(r)}% ${liftPct(r) > 70 ? '⚠' : '✓'}</div></div>` : ''}
    </div>
    ${c.fields.filter(f => f.type === 'textarea' && r[f.k]).map(f => `
      <div style="margin-top:10px"><div style="font-size:11px;color:var(--mut);font-weight:600">${esc(f.ar)}</div>
      <div class="prose" style="white-space:pre-line">${esc(r[f.k])}</div></div>`).join('')}
  </div>

  ${c.rows && (r.items || []).length ? `
  <div class="card"><div class="card-head">${icon('check', 17)} البنود (${r.items.length})</div>
    <div class="card-pad">
      ${r.items.map((it, i) => `
      <div class="ra-row">
        <div class="rr-head"><div class="rr-hz">${i + 1}. ${esc(it.obs)}</div>
          ${c.closable ? `<button class="btn btn-sm js-rg-itclose" data-i="${i}">${it.closed ? '↩ إعادة فتح' : '✓ إغلاق'}</button>` : ''}
          ${it.closed ? '<span class="insp-badge pass">مغلق</span>' : '<span class="insp-badge due">مفتوح</span>'}</div>
        ${it.action ? `<div class="rr-ctl">${esc(it.action)}</div>` : ''}
        ${it.extra ? `<div style="font-size:12px;color:var(--mut)">${esc(it.extra)}</div>` : ''}
        ${it.closedAt ? `<div style="font-size:11px;color:var(--mut)" class="mono">أُغلق: ${fmtDate(it.closedAt)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>` : ''}

  ${c.checklist ? `
  <div class="card"><div class="card-head">${icon('check', 17)} التشيك لست</div>
    <div class="card-pad" style="padding-top:6px">
    ${c.checklist.map((item, i) => `
      <div class="ck-item"><div class="ck-no">${i + 1}</div>
        <div class="ck-text"><div class="ar">${esc(item)}</div></div>
        <span class="ck-ans ${(r.checklist || [])[i] === 1 ? 'yes' : 'no'}">${(r.checklist || [])[i] === 1 ? 'YES' : 'NO'}</span>
      </div>`).join('')}
    </div>
  </div>` : ''}

  ${c.attendance ? `
  <div class="card"><div class="card-head">${icon('user', 17)} الحضور (${(r.attendance || []).length})
    <span class="spacer"></span></div>
    <div class="card-pad">
      ${(r.attendance || []).map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line)">
        <b style="flex:1;font-size:13.5px" dir="ltr">${esc(a.name)}</b>
        <img src="${a.sig}" style="height:32px;max-width:110px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:4px">
        <span class="tl-when">${fmtDT(a.at)}</span>
      </div>`).join('') || '<div class="hint">لا حضور مسجل بعد</div>'}
      ${canCreate() ? `
      <div style="display:flex;gap:8px;margin-top:12px">
        <select id="rg-att-sel" style="flex:1;border:1px solid var(--line-2);border-radius:7px;padding:8px 10px">
          ${DB.employees.filter(e => e.active && e.role !== '_config' && !(r.attendance || []).some(a => a.name === e.name)).map(e => `<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('')}
          <option value="__free">اسم غير مسجل…</option>
        </select>
        <button class="btn btn-amber btn-sm" id="rg-att-add">${icon('pen', 14)} توقيع حضور</button>
      </div>` : ''}
    </div>
  </div>` : ''}

  ${c.media ? `
  <div class="card"><div class="card-head">الصور والمقاطع <span class="chip">${(r.media || []).length}/10</span>
    <span class="spacer"></span>
    ${canCreate() ? `<label class="btn btn-sm">${icon('plus', 13)} إضافة<input type="file" id="rgd-media" accept="image/*,video/*" multiple style="display:none"></label>` : ''}</div>
    <div class="card-pad">${mediaGridHTML(r.media, '')}</div>
  </div>` : ''}

  <div class="card card-pad"><div class="action-bar">
    ${c.closable && r.status !== 'closed' && canCreate() ? `<button class="btn btn-dark" id="rg-close">${icon('check', 15)} إغلاق السجل</button>` : ''}
    <button class="btn" id="rg-print">${icon('print', 15)} PDF / طباعة</button>
    ${CLOUD.enabled() ? `<button class="btn" id="rg-archive">${icon('doc', 15)} أرشفة في «${esc(c.folder)}»</button>` : ''}
    ${r.driveUrl ? `<a class="btn btn-ghost" href="${esc(r.driveUrl)}" target="_blank" rel="noopener">النسخة المؤرشفة</a>` : ''}
  </div>
  ${r.closeNote ? `<div class="hint" style="margin-top:8px"><b>ملاحظة الإغلاق:</b> ${esc(r.closeNote)}</div>` : ''}</div>`;
}

/* ---------- طباعة وأرشفة ---------- */
function buildRegSheetHTML(key, r) {
  const c = REGS[key];
  const check = (v, o) => (Array.isArray(v) ? v.includes(o) : v === o) ? '☑' : '☐';
  const fieldRow = (f) => {
    if (f.type === 'radio' || f.type === 'checks') {
      return `<tr><th style="width:180px">${esc(f.ar)}</th><td>${f.opts.map(o => `${check(r[f.k], o)} ${esc(o)}`).join(' &nbsp; ')}</td></tr>`;
    }
    const v = Array.isArray(r[f.k]) ? r[f.k].join(', ') : (r[f.k] || '');
    return `<tr><th style="width:180px">${esc(f.ar)}</th><td>${esc(v)}</td></tr>`;
  };
  return `
  <div class="sheet">
    <div class="sh-head">
      <div class="sh-party"><div class="cap">The Contractor</div><div class="nm">RBC</div><div class="ar">${esc(HSE.project.contractorEn)}</div></div>
      <div class="sh-title"><div class="t">${esc(c.en)}</div><div class="t-ar">${esc(c.titleAr)}</div></div>
      <div class="sh-party"><div class="cap">Project</div><div class="nm">SCC</div><div class="ar">${esc(HSE.project.siteAr)}</div></div>
    </div>
    <div class="sh-code"><span>REF No.:</span><span>${esc(r.refNo)}</span></div>
    <table class="sh-ck" style="font-size:9pt">${c.fields.map(fieldRow).join('')}</table>
    ${c.rows && (r.items || []).length ? `
    <table class="sh-ck" style="font-size:8.6pt">
      <tr><th style="width:24px">#</th><th>${esc(c.rows.obs)}</th><th>${esc(c.rows.action)}</th>${c.rows.extra ? `<th>${esc(c.rows.extra)}</th>` : ''}<th style="width:56px">Status</th></tr>
      ${r.items.map((it, i) => `<tr><td class="n">${i + 1}</td><td>${esc(it.obs)}</td><td>${esc(it.action)}</td>${c.rows.extra ? `<td>${esc(it.extra || '')}</td>` : ''}<td class="c">${it.closed ? 'Closed' : 'Open'}</td></tr>`).join('')}
    </table>` : ''}
    ${c.checklist ? `
    <table class="sh-ck" style="font-size:8.8pt">
      ${c.checklist.map((item, i) => `<tr><td class="n">${i + 1}</td><td>${esc(item)}</td><td class="c">${(r.checklist || [])[i] === 1 ? 'Yes' : 'No'}</td></tr>`).join('')}
    </table>` : ''}
    ${c.lifting ? `<div class="sh-block"><span class="bt">Crane capacity utilization:</span> ${liftPct(r)}% (limit 70%) — Load ${esc(String(r.loadWt || 0))}t ×1.1 rigging + hook ${esc(String(r.hookWt || 0))}t vs chart ${esc(String(r.chartCap || 0))}t @ radius ${esc(String(r.radius || '—'))}m</div>` : ''}
    ${c.attendance && (r.attendance || []).length ? `
    <table class="sh-ck" style="font-size:8.8pt">
      <tr><th style="width:24px">#</th><th>Name</th><th style="width:120px">Signature</th><th style="width:110px">Time</th></tr>
      ${r.attendance.map((a, i) => `<tr><td class="n">${i + 1}</td><td>${esc(a.name)}</td><td class="c"><img src="${a.sig}" style="height:24px"></td><td class="c">${fmtDT(a.at)}</td></tr>`).join('')}
    </table>` : ''}
    ${r.closeNote ? `<div class="sh-block"><span class="bt">Closeout:</span> ${esc(r.closeNote)} — ${fmtDT(r.closedAt)}</div>` : ''}
    <div class="sh-signs" style="grid-template-columns:repeat(${Math.max(c.signs.length, 1)}, 1fr)">
      ${(c.signs.length ? c.signs : ['Prepared By']).map(s => `<div><div class="r">${esc(s)}</div><div class="sg"></div><div class="dt">Sign / Date: ____________</div></div>`).join('')}
    </div>
    <div class="sh-foot"><span>FERAS — HSE Digital System</span><span>${esc(r.refNo)} · ${fmtDate(r.createdAt)}</span></div>
  </div>`;
}

function printReg(key, r) {
  $('#printRoot').innerHTML = buildRegSheetHTML(key, r);
  window.print();
}

async function archiveReg(key, r, silent) {
  if (!CLOUD.enabled()) { if (!silent) toast('الأرشفة تتطلب تفعيل الخلفية'); return; }
  const c = REGS[key];
  if (!silent) toast('جارٍ الأرشفة في Drive…');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${ARCHIVE_CSS}</style></head><body>${buildRegSheetHTML(key, r)}</body></html>`;
  try {
    const res = await CLOUD.api({ action: 'archive', code: r.refNo, html, folder: c.folder }, 60000);
    if (res.url) {
      r.driveUrl = res.url;
      saveDB(); CLOUD.push(c.entity, r);
      if ((location.hash || '').includes(r.id)) render();
      toast(`أُرشف في مجلد «${c.folder}» ✓`);
    }
  } catch (e) { if (!silent) toast('تعذرت الأرشفة — أعد المحاولة'); }
}

/* ---------- اللوحة الإحصائية KPI ---------- */
function viewBoard() {
  const inc = DB.incidents || [], vio = DB.violations || [], nm = DB.nearmiss || [];
  const cfg = rolesConfig() || {};
  const board = cfg.board || {};
  const start = board.start || '2024-09-01';
  const workforce = board.workforce || DB.employees.filter(e => e.active && e.role !== '_config').length;
  const hoursDay = board.hoursDay || 10;
  const days = Math.max(1, daysSince(start));
  const totalHours = workforce * hoursDay * days;
  const lti = inc.filter(i => i.itype === 'LTI' || i.itype === 'Fatality').length;
  const byType = {};
  inc.forEach(i => { byType[i.itype || 'أخرى'] = (byType[i.itype || 'أخرى'] || 0) + 1; });

  afterRender = () => {
    $('#bd-edit')?.addEventListener('click', () => {
      const c2 = ensureRolesConfig();
      c2.board = c2.board || {};
      const s = prompt('تاريخ بداية المشروع (YYYY-MM-DD):', start); if (s) c2.board.start = s;
      const w = prompt('عدد العمالة الحالي:', String(workforce)); if (w) c2.board.workforce = +w;
      const h = prompt('ساعات العمل اليومية:', String(hoursDay)); if (h) c2.board.hoursDay = +h;
      saveDB(); CLOUD.push('employees', c2); render();
    });
    $('#bd-print')?.addEventListener('click', () => {
      $('#printRoot').innerHTML = `
      <div class="sheet">
        <div class="sh-head"><div class="sh-party"><div class="nm">RBC</div></div>
        <div class="sh-title"><div class="t">Project HSE Statistical Display Board</div><div class="t-ar">Safety Records — OUR TARGET IS ZERO INCIDENT</div></div>
        <div class="sh-party"><div class="nm">SCC</div></div></div>
        <table class="sh-ck">
          <tr><th>Item</th><th>Value</th></tr>
          <tr><td>Project start</td><td>${fmtDate(start)}</td></tr>
          <tr><td>Number of workforce</td><td>${workforce}</td></tr>
          <tr><td>Days worked</td><td>${days}</td></tr>
          <tr><td>Total working hours</td><td>${totalHours.toLocaleString()}</td></tr>
          <tr><td>LTI</td><td>${lti}</td></tr>
          <tr><td>Total incidents</td><td>${inc.length}</td></tr>
          <tr><td>Near miss reports</td><td>${nm.length}</td></tr>
          <tr><td>Safety violations</td><td>${vio.length}</td></tr>
          <tr><td>Work permits issued</td><td>${DB.permits.length}</td></tr>
          <tr><td>Equipment inspections</td><td>${DB.equipment.reduce((n, e) => n + (e.inspections || []).length, 0)}</td></tr>
        </table>
        <div class="sh-foot"><span>FERAS — generated ${fmtDT(new Date().toISOString())}</span></div>
      </div>`;
      window.print();
    });
  };

  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/registers" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">${tr('board')}</div>
      <div class="page-sub">Safety Records — OUR TARGET IS ZERO INCIDENT</div>
    </div>
    ${isAdmin() ? `<button class="btn btn-sm" id="bd-edit">${icon('pen', 14)} الإعدادات</button>` : ''}
    <button class="btn btn-sm" id="bd-print">${icon('print', 14)} طباعة</button>
  </div>
  <div class="kpis">
    <div class="kpi" style="--kc:var(--green)"><div class="n">${totalHours.toLocaleString()}</div><div class="l">إجمالي ساعات العمل</div><div class="s">${workforce} عاملًا × ${hoursDay} ساعات × ${days} يومًا</div></div>
    <div class="kpi" style="--kc:${lti ? 'var(--red)' : 'var(--green)'}"><div class="n">${lti}</div><div class="l">إصابات مضيعة للوقت LTI</div><div class="s">منذ بداية المشروع</div></div>
    <div class="kpi" style="--kc:var(--amber)"><div class="n">${inc.length}</div><div class="l">الحوادث المسجلة</div><div class="s">كل التصنيفات</div></div>
    <div class="kpi" style="--kc:var(--blue)"><div class="n">${nm.length}</div><div class="l">بلاغات Near Miss</div><div class="s">ثقافة إبلاغ إيجابية</div></div>
    <div class="kpi" style="--kc:var(--amber)"><div class="n">${vio.length}</div><div class="l">المخالفات</div><div class="s">سجل المخالفات</div></div>
    <div class="kpi" style="--kc:var(--slate)"><div class="n">${DB.permits.length}</div><div class="l">تصاريح العمل</div><div class="s">إجمالي الصادرة</div></div>
    <div class="kpi" style="--kc:var(--green)"><div class="n">${DB.equipment.reduce((n, e) => n + (e.inspections || []).length, 0)}</div><div class="l">فحوصات المعدات</div><div class="s">إجمالي المنفذة</div></div>
    <div class="kpi" style="--kc:var(--slate)"><div class="n">${(DB.tbts || []).length}</div><div class="l">جلسات TBT وتدريب</div><div class="s">موثقة بالحضور</div></div>
  </div>
  ${Object.keys(byType).length ? `
  <div class="card" style="margin-top:14px"><div class="card-head">${icon('alert', 17)} الحوادث حسب النوع</div>
    <div class="card-pad">
      ${Object.entries(byType).map(([t2, n]) => `
      <div style="display:flex;align-items:center;gap:10px;padding:4px 0">
        <span style="flex:0 0 160px;font-size:13px">${esc(t2)}</span>
        <div style="flex:1;background:var(--slate-soft);border-radius:4px;height:14px"><div style="width:${Math.min(100, n / inc.length * 100)}%;background:var(--amber);height:14px;border-radius:4px"></div></div>
        <b class="mono">${n}</b>
      </div>`).join('')}
    </div>
  </div>` : ''}`;
}

/* ---------- مكتبة الوثائق ---------- */
const DOCS_FOLDERS = [
  { name: 'خطة الطوارئ — Emergency Plan', id: '1Rjy494QM2JqLfKuyBCAnSVtwRgWdYI-C' },
  { name: 'سياسة الصحة والسلامة', id: '1alg5PhQQGoPLnJvjPRCOnM0_h67eY4Nj' },
  { name: 'خطة HSE', id: '1YbvlNOfg36_tl--xrcr1QSJhM3bY1Bey' },
  { name: 'الهيكل التنظيمي', id: '15fzkqWOsUV6t4PSledQwviH6FgSqdeqG' },
  { name: 'كود اللون الشهري', id: '1oRmDPrN7WjFMgjzjoXCFDRYWipTX_Y6n' },
];
function viewDocs() {
  return `
  <div class="page-head">
    <a class="btn btn-ghost btn-sm" href="#/registers" style="padding-inline:6px">${icon('back', 18)}</a>
    <div class="grow">
      <div class="page-title">مكتبة الوثائق</div>
      <div class="page-sub">الوثائق المرجعية المعتمدة — مباشرة من درايف المشروع</div>
    </div>
  </div>
  <div class="card"><div class="row-list">
    ${DOCS_FOLDERS.map(d2 => `
    <div class="row-item" onclick="location.hash='#/files/${d2.id}'">
      <div class="eq-ic">${icon('doc', 19)}</div>
      <div class="row-main"><div class="row-title">${esc(d2.name)}</div></div>
      ${icon('back', 16)}
    </div>`).join('')}
    <div class="row-item" onclick="location.hash='#/files'">
      <div class="eq-ic" style="background:var(--amber-soft);color:var(--amber-ink)">${icon('grid', 19)}</div>
      <div class="row-main"><div class="row-title">كل ملفات المشروع…</div></div>
      ${icon('back', 16)}
    </div>
  </div></div>`;
}

/* ---------- التوجيه ---------- */
routes.unshift(
  { re: /^#\/registers$/, view: viewRegHub, nav: 'registers' },
  { re: /^#\/board$/, view: viewBoard, nav: 'registers' },
  { re: /^#\/docs$/, view: viewDocs, nav: 'registers' },
  { re: /^#\/reg\/([a-z]+)\/new$/, view: viewRegNew, nav: 'registers' },
  { re: /^#\/reg\/([a-z]+)\/([^/]+)$/, view: viewRegDetail, nav: 'registers' },
  { re: /^#\/reg\/([a-z]+)$/, view: viewRegList, nav: 'registers' },
);
