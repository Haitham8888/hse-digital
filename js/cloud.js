/* ============================================================
   HSE Digital — طبقة المزامنة السحابية
   Google Apps Script + Google Sheet كقاعدة بيانات مشتركة
   - يعمل الموقع محليًا فور الفتح ثم يتزامن في الخلفية
   - طابور أوفلاين: أي إجراء بدون إنترنت يُرفع تلقائيًا عند عودته
   - الأكواد المتسلسلة تُحجز مركزيًا من الخادم (بلا تعارض)
   ============================================================ */

'use strict';

const CLOUD = {
  url: ((window.HSE_CONFIG && window.HSE_CONFIG.backendUrl) || '').trim(),
  state: 'off',          // off | syncing | ok | offline
  pending: 0,
  lastSync: null,
  _draining: false,
  _retryMs: 5000,

  enabled() { return !!this.url; },

  /* ---------- نداء الخادم ---------- */
  async api(payload, timeoutMs = 25000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        // text/plain = طلب بسيط بلا preflight (متوافق مع Apps Script)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: ctl.signal,
      });
      const data = await res.json();
      if (data && data.error) throw new Error(data.error);
      return data;
    } finally { clearTimeout(t); }
  },

  /* ---------- الإقلاع: سحب الحالة من الخادم ---------- */
  async bootstrap() {
    if (!this.enabled()) { this.setState('off'); return; }
    this.setState('syncing');
    try {
      let server = await this.api({ action: 'pull' }, 15000);
      if (!server.employees || !server.employees.length) {
        // قاعدة فارغة (أول تشغيل): ازرع الموظفين والعدادات فقط —
        // السجل الرسمي (تصاريح/فحوصات/تقييمات) يبدأ نظيفًا بلا بيانات تجريبية
        server = await this.api({
          action: 'bootstrap',
          employees: DB.employees,
          counters: DB.counters,
        }, 30000);
      }
      this.applyServer(server);
      this.lastSync = new Date();
      this.setState('ok');
      this.drain();
    } catch (e) {
      this.setState('offline');
      this.scheduleRetry();
    }
  },

  // الخادم هو مصدر الحقيقة — لا يبقى محليًا إلا ما ينتظر رفعه في الطابور
  applyServer(server) {
    const queued = new Set(this.queue().map(q => q.entity + ':' + q.id));
    ['employees', 'permits', 'equipment', 'assessments'].forEach(k => {
      const byId = new Map((server[k] || []).map(o => [String(o.id), o]));
      (DB[k] || []).forEach(lo => {
        if (queued.has(k + ':' + lo.id)) byId.set(String(lo.id), lo);
      });
      DB[k] = [...byId.values()];
    });
    if (server.counters) Object.assign(DB.counters, server.counters);
    DB.settings = server.settings || {};
    saveDB();
  },

  /* ---------- طابور الرفع ---------- */
  queue() {
    try { return JSON.parse(localStorage.getItem('hse_sync_q') || '[]'); }
    catch (e) { return []; }
  },
  setQueue(q) {
    try { localStorage.setItem('hse_sync_q', JSON.stringify(q)); } catch (e) { /* */ }
    this.pending = q.length;
    this.indicator();
  },

  // يُستدعى بعد كل تعديل: يختم الوقت ويجدول الرفع
  push(entity, obj) {
    obj.updatedAt = new Date().toISOString();
    saveDB();
    if (!this.enabled()) return;
    const q = this.queue().filter(x => !(x.entity === entity && String(x.id) === String(obj.id)));
    q.push({ entity, id: obj.id, ts: Date.now() });
    this.setQueue(q);
    this.drain();
  },

  async drain() {
    if (!this.enabled() || this._draining) return;
    this._draining = true;
    this.setState('syncing');
    try {
      for (;;) {
        const q = this.queue();
        if (!q.length) break;
        const item = q[0];
        const obj = (DB[item.entity] || []).find(o => String(o.id) === String(item.id));
        if (obj) await this.api({ action: 'upsert', entity: item.entity, data: obj });
        // احذف هذا الإدخال تحديدًا — إن أُعيد إدراجه أثناء الرفع (ts أحدث) يُرفع مجددًا بأحدث نسخة
        const q2 = this.queue();
        const i = q2.findIndex(x => x.entity === item.entity && String(x.id) === String(item.id) && x.ts === item.ts);
        if (i > -1) { q2.splice(i, 1); this.setQueue(q2); }
        else if (!obj) {
          const j = q2.findIndex(x => x.entity === item.entity && String(x.id) === String(item.id));
          if (j > -1) { q2.splice(j, 1); this.setQueue(q2); }
        }
      }
      this.lastSync = new Date();
      this._retryMs = 5000;
      this.setState('ok');
    } catch (e) {
      this.setState('offline');
      this.scheduleRetry();
    } finally {
      this._draining = false;
    }
  },

  scheduleRetry() {
    clearTimeout(this._retryT);
    this._retryT = setTimeout(() => this.drain(), this._retryMs);
    this._retryMs = Math.min(this._retryMs * 2, 60000);
  },

  /* ---------- كود متسلسل مركزي ---------- */
  async nextSeq(type) {
    const r = await this.api({ action: 'nextSeq', type }, 15000);
    return r.seq;
  },

  /* ---------- أرشفة PDF في Drive ---------- */
  async archive(p, html) {
    const r = await this.api({
      action: 'archive', code: permitCode(p), permitId: p.id, html,
    }, 45000);
    return r.url;
  },

  /* ---------- تصفح ملفات Drive ---------- */
  _driveCache: {},
  async driveList(folderId) {
    const key = folderId || 'root';
    const c = this._driveCache[key];
    if (c && Date.now() - c.t < 300000) return c.d;
    const d = await this.api({ action: 'driveList', folderId: folderId || '' }, 30000);
    this._driveCache[key] = { t: Date.now(), d };
    return d;
  },

  /* ---------- المزامنة الحية التلقائية ---------- */
  startPolling() {
    if (!this.enabled()) return;
    // كل 30 ثانية والتبويب ظاهر — وفور العودة للتبويب أو عودة الاتصال
    setInterval(() => this.refresh(), 30000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.refresh();
    });
    window.addEventListener('online', () => { this.drain(); this.refresh(); });
  },

  // بصمة خفيفة للحالة — لإعادة الرسم فقط عند تغير فعلي (بلا وميض)
  _stamp() {
    return ['permits', 'equipment', 'assessments', 'employees'].map(k => {
      const list = DB[k] || [];
      let max = '';
      for (const o of list) if (String(o.updatedAt || '') > max) max = String(o.updatedAt || '');
      return k + ':' + list.length + '|' + max;
    }).join(';');
  },

  async refresh() {
    if (!this.enabled() || this._draining || document.hidden) return;
    try {
      const server = await this.api({ action: 'pull' }, 15000);
      const before = this._stamp();
      const permitsBefore = (DB.permits || []).length;
      this.applyServer(server);
      this.lastSync = new Date();
      this.setState(this.queue().length ? 'syncing' : 'ok');
      if (this._stamp() === before) return; // لا تغيير — لا إعادة رسم

      // لا نقاطع نموذج إدخال مفتوحًا أو لوحة توقيع
      const h = location.hash || '#/';
      const editing = h === '#/permits/new' || h === '#/risk/new' ||
        h.endsWith('/inspect') || h.startsWith('#/team/') || h === '#/equipment/new';
      if (!editing && !document.querySelector('.modal-back')) render();
      if ((DB.permits || []).length > permitsBefore) toast('وصل تصريح جديد من الفريق');
    } catch (e) { /* السحب الدوري صامت */ }
  },

  /* ---------- مؤشر الحالة ---------- */
  setState(s) { this.state = s; this.indicator(); },
  indicator() {
    const el = document.getElementById('sync-chip');
    if (!el) return;
    const q = this.pending || this.queue().length;
    let cls = 'off', txt = 'محلي';
    if (this.enabled()) {
      if (this.state === 'ok') { cls = 'ok'; txt = 'متزامن'; }
      else if (this.state === 'syncing') { cls = 'busy'; txt = 'مزامنة…'; }
      else { cls = 'down'; txt = q ? `أوفلاين (${q})` : 'أوفلاين'; }
    }
    el.className = 'sync-chip ' + cls;
    el.querySelector('span').textContent = txt;
    el.title = this.lastSync ? 'آخر مزامنة: ' + this.lastSync.toLocaleTimeString() : '';
  },

  /* ---------- حماية الأدوار بـ PIN ---------- */
  pinFor(roleKey) {
    return (DB.settings && DB.settings['pin_' + roleKey]) || '';
  },
  roleUnlocked(roleKey) {
    if (!this.enabled()) return true;            // الوضع المحلي التجريبي مفتوح
    const pin = this.pinFor(roleKey);
    if (!pin) return true;
    try { return sessionStorage.getItem('hse_unlock_' + roleKey) === '1'; }
    catch (e) { return false; }
  },
  unlockRole(roleKey) {
    const pin = this.pinFor(roleKey);
    if (!pin) return true;
    const entered = prompt('أدخل رمز PIN لدور «' + roleAr(roleKey) + '»:');
    if (entered === null) return false;
    if (entered.trim() === pin) {
      try { sessionStorage.setItem('hse_unlock_' + roleKey, '1'); } catch (e) { /* */ }
      return true;
    }
    toast('رمز PIN غير صحيح');
    return false;
  },
};
