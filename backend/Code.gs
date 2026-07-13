/**
 * ============================================================
 * HSE Digital — الخلفية (Google Apps Script)
 * قاعدة البيانات: Google Sheet داخل مجلد ملفات المشروع في Drive
 * الأرشيف: مجلد فرعي تُحفظ فيه نسخ PDF الرسمية تلقائيًا
 * الإشعارات: إيميل تلقائي للمعتمد الذي عليه الدور
 * ============================================================
 *
 * خطوات التشغيل (مرة واحدة):
 * 1) افتح script.google.com ← مشروع جديد ← الصق هذا الملف كاملًا
 * 2) عبّئ FOLDER_ID أدناه بمعرّف مجلد ملفات المشروع في Drive
 *    (افتح المجلد في المتصفح وانسخ ما بعد /folders/ من الرابط)
 * 3) من أعلى المحرر: شغّل الدالة setup مرة واحدة ووافق على الأذونات
 * 4) Deploy ← New deployment ← Web app:
 *      Execute as: Me   |   Who has access: Anyone
 * 5) انسخ رابط الـ Web app وضعه في js/config.js في الموقع
 */

const FOLDER_ID = 'PUT_YOUR_DRIVE_FOLDER_ID_HERE'; // ← معرّف مجلد المشروع
const SS_NAME = 'HSE Digital — Database';
const ARCHIVE_FOLDER = 'HSE Archive (PDF)';

const ENTITY_SHEETS = {
  employees:   { name: 'Employees',   cols: ['name', 'role', 'company', 'phone', 'email', 'active'] },
  permits:     { name: 'Permits',     cols: ['code', 'type', 'building', 'status', 'dateFrom', 'descAr'] },
  equipment:   { name: 'Equipment',   cols: ['code', 'type', 'model', 'location'] },
  assessments: { name: 'Assessments', cols: ['activity', 'location', 'date'] },
};

const APPROVAL_CHAIN = [
  { key: 'siteManager', ar: 'مدير الموقع' },
  { key: 'hseSupervisor', ar: 'مشرف السلامة HSE' },
  { key: 'consultantEngineer', ar: 'مهندس الاستشاري' },
  { key: 'hseConsultant', ar: 'استشاري السلامة HSE' },
];

/* ---------------- الإعداد الأولي ---------------- */

function setup() {
  const folder = projectFolder_();
  const ss = database_();
  // مجلد الأرشيف
  archiveFolder_();
  Logger.log('تم الإعداد بنجاح ✓');
  Logger.log('قاعدة البيانات: ' + ss.getUrl());
  Logger.log('المجلد: ' + folder.getUrl());
}

function projectFolder_() {
  if (!FOLDER_ID || FOLDER_ID === 'PUT_YOUR_DRIVE_FOLDER_ID_HERE') {
    // بدون معرّف: أنشئ/استخدم مجلد "HSE Digital" في جذر Drive
    const it = DriveApp.getFoldersByName('HSE Digital');
    return it.hasNext() ? it.next() : DriveApp.createFolder('HSE Digital');
  }
  return DriveApp.getFolderById(FOLDER_ID);
}

function archiveFolder_() {
  const folder = projectFolder_();
  const it = folder.getFoldersByName(ARCHIVE_FOLDER);
  return it.hasNext() ? it.next() : folder.createFolder(ARCHIVE_FOLDER);
}

function database_() {
  const folder = projectFolder_();
  const it = folder.getFilesByName(SS_NAME);
  let ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.open(it.next());
  } else {
    ss = SpreadsheetApp.create(SS_NAME);
    const f = DriveApp.getFileById(ss.getId());
    folder.addFile(f);
    DriveApp.getRootFolder().removeFile(f);
  }
  // أنشئ التبويبات الناقصة
  Object.keys(ENTITY_SHEETS).forEach(function (k) {
    const def = ENTITY_SHEETS[k];
    let sh = ss.getSheetByName(def.name);
    if (!sh) {
      sh = ss.insertSheet(def.name);
      sh.appendRow(['id', 'updatedAt'].concat(def.cols).concat(['json']));
      sh.setFrozenRows(1);
    }
  });
  let cs = ss.getSheetByName('Counters');
  if (!cs) {
    cs = ss.insertSheet('Counters');
    cs.appendRow(['type', 'next']);
    [['G', 845], ['H', 216], ['RA', 13]].forEach(function (r) { cs.appendRow(r); });
    cs.setFrozenRows(1);
  }
  let st = ss.getSheetByName('Settings');
  if (!st) {
    st = ss.insertSheet('Settings');
    st.appendRow(['key', 'value']);
    [
      ['appUrl', 'https://haitham8888.github.io/hse-digital/'],
      ['pin_siteManager', '1111'],
      ['pin_hseSupervisor', '2222'],
      ['pin_consultantEngineer', '3333'],
      ['pin_hseConsultant', '4444'],
      ['pin_creator', ''],
    ].forEach(function (r) { st.appendRow(r); });
    st.setFrozenRows(1);
  }
  const s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  return ss;
}

/* ---------------- واجهة HTTP ---------------- */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  if (action === 'pull') return json_(pull_());
  return json_({ ok: true, service: 'hse-digital', time: new Date().toISOString() });
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) {
    return json_({ error: 'bad_request' });
  }
  try {
    switch (req.action) {
      case 'pull': return json_(pull_());
      case 'bootstrap': return json_(bootstrap_(req));
      case 'upsert': return json_(upsert_(req.entity, req.data));
      case 'nextSeq': return json_(nextSeq_(req.type));
      case 'archive': return json_(archive_(req.code, req.html, req.permitId));
      default: return json_({ error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- القراءة ---------------- */

function pull_() {
  const ss = database_();
  const out = { ok: true, time: new Date().toISOString() };
  Object.keys(ENTITY_SHEETS).forEach(function (k) {
    out[k] = readEntities_(ss, k);
  });
  out.counters = {};
  database_().getSheetByName('Counters').getDataRange().getValues().slice(1)
    .forEach(function (r) { if (r[0]) out.counters[r[0]] = Number(r[1]); });
  out.settings = {};
  ss.getSheetByName('Settings').getDataRange().getValues().slice(1)
    .forEach(function (r) { if (r[0]) out.settings[r[0]] = String(r[1]); });
  return out;
}

function readEntities_(ss, entity) {
  const sh = ss.getSheetByName(ENTITY_SHEETS[entity].name);
  const vals = sh.getDataRange().getValues();
  const jsonCol = vals[0].indexOf('json');
  const list = [];
  for (let i = 1; i < vals.length; i++) {
    if (!vals[i][0]) continue;
    try { list.push(JSON.parse(vals[i][jsonCol])); } catch (e) { /* صف تالف — تجاهل */ }
  }
  return list;
}

/* ---------------- الكتابة ---------------- */

// أول تشغيل: يستقبل بيانات الواجهة إذا كانت القاعدة فارغة
function bootstrap_(req) {
  const ss = database_();
  const existing = readEntities_(ss, 'employees');
  if (existing.length) return pull_(); // القاعدة مأهولة — تجاهل وأرجع الحالة
  ['employees', 'equipment', 'assessments', 'permits'].forEach(function (k) {
    (req[k] || []).forEach(function (obj) { writeEntity_(ss, k, obj); });
  });
  if (req.counters) {
    const cs = ss.getSheetByName('Counters');
    const vals = cs.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      const t = vals[i][0];
      if (req.counters[t] && Number(req.counters[t]) > Number(vals[i][1])) {
        cs.getRange(i + 1, 2).setValue(Number(req.counters[t]));
      }
    }
  }
  return pull_();
}

function upsert_(entity, data) {
  if (!ENTITY_SHEETS[entity]) return { error: 'unknown_entity' };
  if (!data || !data.id) return { error: 'missing_id' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = database_();
    const before = findEntity_(ss, entity, data.id);
    let merged = data;
    if (entity === 'permits') merged = mergePermit_(before, data);
    writeEntity_(ss, entity, merged);
    if (entity === 'permits') notifyIfNeeded_(before, merged);
    return { ok: true, id: merged.id };
  } finally {
    lock.releaseLock();
  }
}

function findEntity_(ss, entity, id) {
  const sh = ss.getSheetByName(ENTITY_SHEETS[entity].name);
  const vals = sh.getDataRange().getValues();
  const jsonCol = vals[0].indexOf('json');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(id)) {
      try { return JSON.parse(vals[i][jsonCol]); } catch (e) { return null; }
    }
  }
  return null;
}

function writeEntity_(ss, entity, obj) {
  const def = ENTITY_SHEETS[entity];
  const sh = ss.getSheetByName(def.name);
  const vals = sh.getDataRange().getValues();
  const row = ['' + obj.id, obj.updatedAt || new Date().toISOString()]
    .concat(def.cols.map(function (c) {
      const v = obj[c];
      return (v === undefined || v === null) ? '' : (typeof v === 'object' ? JSON.stringify(v) : v);
    }))
    .concat([JSON.stringify(obj)]);
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(obj.id)) {
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sh.appendRow(row);
}

// دمج ذكي للتصريح: لا يضيع توقيع وقّع بالتوازي
function mergePermit_(oldP, newP) {
  if (!oldP) return newP;
  const newer = String(newP.updatedAt || '') >= String(oldP.updatedAt || '');
  const m = newer ? Object.assign({}, oldP, newP) : Object.assign({}, newP, oldP);
  const n = Math.max((oldP.approvals || []).length, (newP.approvals || []).length);
  const ap = [];
  for (let i = 0; i < n; i++) {
    ap.push((oldP.approvals && oldP.approvals[i]) || (newP.approvals && newP.approvals[i]) || null);
  }
  m.approvals = ap;
  m.stage = Math.max(oldP.stage || 0, newP.stage || 0);
  m.rejection = newP.rejection || oldP.rejection || null;
  m.extension = newP.extension || oldP.extension || null;
  m.closeout = newP.closeout || oldP.closeout || null;
  return m;
}

/* ---------------- الأكواد المتسلسلة (مركزية بلا تعارض) ---------------- */

function nextSeq_(type) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cs = database_().getSheetByName('Counters');
    const vals = cs.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (vals[i][0] === type) {
        const n = Number(vals[i][1]);
        cs.getRange(i + 1, 2).setValue(n + 1);
        return { ok: true, seq: n };
      }
    }
    cs.appendRow([type, 2]);
    return { ok: true, seq: 1 };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- أرشفة PDF في Drive ---------------- */

function archive_(code, html, permitId) {
  if (!code || !html) return { error: 'missing_data' };
  const folder = archiveFolder_();
  const name = code.replace(/[^\w.\-]+/g, '-') + '.pdf';
  const pdf = Utilities.newBlob(html, 'text/html', name).getAs('application/pdf').setName(name);
  // استبدل النسخة السابقة إن وجدت
  const it = folder.getFilesByName(name);
  while (it.hasNext()) it.next().setTrashed(true);
  const file = folder.createFile(pdf);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, url: file.getUrl(), fileId: file.getId() };
}

/* ---------------- الإشعارات بالبريد ---------------- */

function notifyIfNeeded_(oldP, newP) {
  try {
    const oldStage = oldP ? (oldP.stage || 0) : -1;
    const status = permitStatus_(newP);
    const appUrl = getSetting_('appUrl');
    const link = appUrl + '#/permit/' + newP.id;
    const code = newP.code || '';

    if (status === 'pending' && newP.stage > oldStage && newP.stage < APPROVAL_CHAIN.length) {
      const roleKey = APPROVAL_CHAIN[newP.stage].key;
      const emp = employeeByRole_(roleKey);
      if (emp && emp.email) {
        MailApp.sendEmail({
          to: emp.email,
          subject: 'تصريح عمل بانتظار توقيعك — ' + code,
          htmlBody: mailBody_('لديك تصريح عمل بانتظار توقيعك بدور: <b>' +
            APPROVAL_CHAIN[newP.stage].ar + '</b>', newP, link),
        });
      }
    }
    if ((status === 'approved' && oldP && permitStatus_(oldP) !== 'approved') ||
        (status === 'rejected' && (!oldP || !oldP.rejection))) {
      const creator = employeeByRole_('creator');
      if (creator && creator.email) {
        MailApp.sendEmail({
          to: creator.email,
          subject: (status === 'approved' ? 'تم اعتماد التصريح ✓ — ' : 'تم رفض التصريح ✗ — ') + code,
          htmlBody: mailBody_(status === 'approved'
            ? 'اكتملت جميع التواقيع والتصريح معتمد.'
            : 'تم رفض التصريح: ' + ((newP.rejection && newP.rejection.note) || ''), newP, link),
        });
      }
    }
  } catch (err) { /* فشل الإيميل لا يوقف الحفظ */ }
}

function mailBody_(msg, p, link) {
  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8">' +
    '<p>' + msg + '</p>' +
    '<p><b>الكود:</b> ' + (p.code || '') + '<br><b>الوصف:</b> ' + (p.descAr || p.desc || '') +
    '<br><b>الموقع:</b> ' + (p.building || '') + '</p>' +
    '<p><a href="' + link + '" style="background:#f0a500;color:#191b1f;padding:10px 22px;' +
    'border-radius:6px;text-decoration:none;font-weight:bold">فتح التصريح والتوقيع</a></p>' +
    '<p style="color:#888;font-size:12px">HSE Digital — نظام إدارة السلامة الرقمي</p></div>';
}

function permitStatus_(p) {
  if (p.rejection) return 'rejected';
  if (p.closeout) return 'closed';
  if ((p.stage || 0) >= APPROVAL_CHAIN.length) return 'approved';
  return 'pending';
}

function employeeByRole_(roleKey) {
  const emps = readEntities_(database_(), 'employees');
  for (let i = 0; i < emps.length; i++) {
    if (emps[i].active && emps[i].role === roleKey) return emps[i];
  }
  return null;
}

function getSetting_(key) {
  const vals = database_().getSheetByName('Settings').getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] === key) return String(vals[i][1]);
  }
  return '';
}
