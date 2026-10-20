/* سوگل — تقویم مدیریت زندگی شخصی | وب‌اپ آفلاین */
(function () {
  'use strict';
  const J = window.Jalali, D = window.DEFAULTS, H = window.HOLIDAYS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ================= ابزارها ================= */
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const fa = (v) => String(v).replace(/\d/g, (d) => FA[d]);
  const toEn = (s) => String(s || '').replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const num = (s) => { const n = parseInt(toEn(s).replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n; };
  const sep = (n) => fa(Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  const money = (n) => `${sep(n)} تومان`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const ymKey = (y, m) => `${y}-${pad(m)}`;
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const WD = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const WDS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const ORD = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم'];
  const todayJ = () => { const t = J.toJalali(new Date()); return { y: t.jy, m: t.jm, d: t.jd }; };
  const todayKey = () => { const t = todayJ(); return key(t.y, t.m, t.d); };
  const dn = (k) => { const p = parse(k); return J.dayNumber(p.y, p.m, p.d); };
  const fromDn = (n) => { const r = J.fromDayNumber(n); return key(r.jy, r.jm, r.jd); };
  const wdOf = (k) => { const p = parse(k); return J.weekday(p.y, p.m, p.d); };
  const fullDate = (k) => { const p = parse(k); return `${WD[wdOf(k)]} ${fa(p.d)} ${MONTHS[p.m - 1]} ${fa(p.y)}`; };
  const shortDate = (k) => { const p = parse(k); return `${fa(p.d)} ${MONTHS[p.m - 1]}`; };
  const slash = (k) => { const p = parse(k); return fa(`${p.y}/${pad(p.m)}/${pad(p.d)}`); };
  const addM = (y, m, n) => { const t = y * 12 + (m - 1) + n; return { y: Math.floor(t / 12), m: (t % 12) + 1 }; };
  const soft = (hex, a = 0.22) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const countdown = (n) => (n === 0 ? 'امروز' : n === 1 ? 'فردا' : `${fa(n)} روز دیگر`);

  /* ================= ذخیره‌سازی ================= */
  const LS = 'sogol.v1';
  let S;
  let memoryOnly = false;
  function fresh() {
    return {
      version: 1, started: false,
      profile: { name: 'سوگل', title: 'تقویم مدیریت زندگی شخصی', tagline: 'زندگی متعادل، سالم، خلاقانه و رضایت‌بخش', motto: 'هر روز یک قدم کوچک به زندگی دلخواه‌تر من نزدیک‌تر است.' },
      plan: { start: [todayJ().y, todayJ().m, 1], quarters: [1, 2, 3, 4].map((i) => ({ title: `سه‌ماهه ${ORD[i - 1]}`, sub: '' })), periods: Array.from({ length: 12 }, () => ({ focus: '', goals: [] })) },
      annualGoals: JSON.parse(JSON.stringify(D.annualGoals)),
      events: [], habits: JSON.parse(JSON.stringify(D.habits)), habitLog: {}, days: {},
      finance: { cats: JSON.parse(JSON.stringify(D.expenseCats)), expenses: [], savings: {} },
      reviews: {}, books: [], meals: {}, shopping: [], ideas: [], photos: {}
    };
  }
  function load() {
    try { const raw = localStorage.getItem(LS); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) { memoryOnly = true; }
    return fresh();
  }
  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { if (!memoryOnly) toast('ذخیره‌سازی ممکن نشد'); memoryOnly = true; } }, 120);
  }
  S = load();

  /* تصاویر در IndexedDB */
  const IMG = {
    cache: {}, db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('sogol', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('img');
          r.onsuccess = () => { this.db = r.result; res(this.db); };
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async put(id, dataUrl) {
      this.cache[id] = dataUrl;
      try { const db = await this.open(); await new Promise((res, rej) => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').put(dataUrl, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { /* فقط در حافظه */ }
    },
    async get(id) {
      if (id in this.cache) return this.cache[id];
      try { const db = await this.open(); const v = await new Promise((res) => { const r = db.transaction('img').objectStore('img').get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); this.cache[id] = v || null; return v; } catch (e) { return null; }
    },
    async del(id) { delete this.cache[id]; try { const db = await this.open(); db.transaction('img', 'readwrite').objectStore('img').delete(id); } catch (e) { } },
    url(id) { if (!id) return null; if (id in this.cache) return this.cache[id]; this.get(id).then((v) => v && render()); return null; }
  };
  function compress(file, max = 1100) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.82));
        };
        im.onerror = rej; im.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function pickImage() {
    return new Promise((res) => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
      i.onchange = async () => { if (!i.files[0]) return res(null); try { res(await compress(i.files[0])); } catch (e) { toast('خواندن عکس ممکن نشد'); res(null); } };
      i.click();
    });
  }

  /* ================= منطق تقویم ================= */
  function holidaysOn(y, m, d) {
    const out = [];
    H.fixed.forEach(([hm, hd, t]) => { if (hm === m && hd === d) out.push({ t, off: true }); });
    (H.lunar[y] || []).forEach(([hm, hd, t]) => { if (hm === m && hd === d) out.push({ t, off: true }); });
    H.cultural.forEach(([hm, hd, t]) => { if (hm === m && hd === d && !out.some((o) => o.t === t)) out.push({ t, off: false }); });
    if (m === 12 && d === 29 && J.isLeap(y)) { /* ۲۹ اسفند در سال کبیسه هم تعطیل است */ }
    return out;
  }
  const eventsOn = (y, m, d) => S.events.filter((e) => e.m === m && e.d === d && (!e.y || e.y === y));
  const dayData = (k) => S.days[k] || {};
  const ensureDay = (k) => (S.days[k] = S.days[k] || {});
  const habitDone = (k, id) => (S.habitLog[k] || []).includes(id);

  /* دوره‌های برنامه (۲۵ هر ماه تا ۲۴ ماه بعد) */
  function periodRange(i) {
    const [y, m, d] = S.plan.start;
    const a = addM(y, m, i), b = addM(y, m, i + 1);
    const dd = (yy, mm) => Math.min(d, J.monthLength(yy, mm));
    const s = key(a.y, a.m, dd(a.y, a.m));
    const e = fromDn(J.dayNumber(b.y, b.m, dd(b.y, b.m)) - 1);
    return { s, e };
  }
  function periodOf(k) {
    const n = dn(k);
    for (let i = 0; i < 12; i++) { const r = periodRange(i); if (n >= dn(r.s) && n <= dn(r.e)) return i; }
    return -1;
  }
  const planEnd = () => periodRange(11).e;
  const periodLabel = (i) => { const r = periodRange(i); return `${shortDate(r.s)} تا ${shortDate(r.e)}`; };

  function monthCells(y, m) {
    const first = J.weekday(y, m, 1), len = J.monthLength(y, m);
    const start = J.dayNumber(y, m, 1) - first;
    const total = Math.ceil((first + len) / 7) * 7;
    return Array.from({ length: total }, (_, i) => fromDn(start + i));
  }
  function upcoming(days = 45) {
    const t0 = dn(todayKey()), out = [];
    for (let i = 0; i <= days; i++) {
      const k = fromDn(t0 + i), p = parse(k);
      eventsOn(p.y, p.m, p.d).forEach((e) => out.push({ k, i, t: e.title, kind: e.kind || 'star', personal: true }));
      holidaysOn(p.y, p.m, p.d).forEach((h) => out.push({ k, i, t: h.t, kind: h.off ? 'hol' : 'cul', personal: false }));
      (dayData(k).items || []).forEach((it) => out.push({ k, i, t: it.text, kind: 'item', emoji: it.emoji, personal: true }));
    }
    return out;
  }
  function nextOccurrence(e) {
    if (!e.m) return null;
    const t = todayJ();
    for (let yy = t.y; yy <= t.y + 1; yy++) {
      if (e.y && e.y !== yy) continue;
      const d = e.d || 1; if (d > J.monthLength(yy, e.m)) continue;
      const k = key(yy, e.m, d), diff = dn(k) - dn(todayKey());
      if (diff >= 0 || (!e.d && e.m === t.m && yy === t.y)) return { k, diff: Math.max(diff, 0) };
    }
    return null;
  }

  /* پیشرفت خودکار */
  function monthStats(y, m) {
    const len = J.monthLength(y, m), t = todayJ();
    const cur = y * 12 + m, now = t.y * 12 + t.m;
    const elapsed = cur < now ? len : cur > now ? 0 : t.d;
    const habit = {};
    S.habits.forEach((h) => {
      let done = 0;
      for (let d = 1; d <= len; d++) if (habitDone(key(y, m, d), h.id)) done++;
      const expected = (h.perWeek * elapsed) / 7;
      habit[h.id] = { done, expected, rate: expected ? Math.min(1, done / expected) : 0 };
    });
    const sN = J.dayNumber(y, m, 1), eN = J.dayNumber(y, m, len);
    const goals = [];
    for (let i = 0; i < 12; i++) { const r = periodRange(i); if (dn(r.s) <= eN && dn(r.e) >= sN) goals.push(...S.plan.periods[i].goals); }
    const ym = ymKey(y, m);
    const exps = S.finance.expenses.filter((x) => x.date.startsWith(ym));
    let loggedDays = new Set(exps.map((x) => x.date)).size;
    const cats = {};
    D.progressCats.forEach((c) => {
      const parts = [];
      const hs = S.habits.filter((h) => h.cat === c.id);
      if (hs.length && elapsed) parts.push(hs.reduce((a, h) => a + habit[h.id].rate, 0) / hs.length);
      const gs = goals.filter((g) => g.cat === c.id);
      if (gs.length) parts.push(gs.filter((g) => g.done).length / gs.length);
      if (c.id === 'money' && elapsed) {
        parts.push(Math.min(1, loggedDays / Math.max(1, elapsed * 0.6)));
        const budgeted = S.finance.cats.filter((x) => x.budget > 0);
        if (budgeted.length) parts.push(budgeted.filter((x) => spent(ym, x.id) <= x.budget).length / budgeted.length);
      }
      cats[c.id] = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
    });
    return { habit, cats, elapsed, len };
  }
  function streak(h) {
    let n = 0, d = dn(todayKey());
    if (!habitDone(fromDn(d), h.id)) d--;
    while (habitDone(fromDn(d), h.id)) { n++; d--; }
    return n;
  }
  const spent = (ym, cat) => S.finance.expenses.filter((x) => x.date.startsWith(ym) && (!cat || x.cat === cat)).reduce((a, x) => a + x.amount, 0);
  const catOf = (id) => S.finance.cats.find((c) => c.id === id) || { name: 'نامشخص', color: '#ccc' };
  const quoteOf = (k) => D.quotes[dn(k) % D.quotes.length];

  /* ================= رابط کاربری ================= */
  const ui = { view: 'today', sub: null, y: todayJ().y, m: todayJ().m, sel: todayKey(), week: 0 };
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    ui.view = ['today', 'month', 'habits', 'money', 'more'].includes(h[0]) ? h[0] : 'today';
    ui.sub = h[1] || null;
    render(); window.scrollTo(0, 0);
  }
  const go = (h) => { if (location.hash === '#/' + h) route(); else location.hash = '/' + h; };

  function card(cls, icon, title, body, act = '') {
    return `<section class="card ${cls}"><div class="card-h">${ic(icon, 'ic')}<h2>${title}</h2>${act}</div><div class="card-b">${body}</div></section>`;
  }
  const ring = (on, color, a, attrs = '') => `<button class="ring ${on ? 'on' : ''}" style="--c:${color || 'var(--rose)'}" data-a="${a}" ${attrs} aria-pressed="${on}">${ic('check')}</button>`;
  const rangeText = () => { const r = periodRange(0); return `${slash(r.s)} تا ${slash(planEnd())}`; };

  function topbar(title, sub) {
    return `<header class="topbar no-print"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
      <button class="icon-btn" data-a="go" data-h="more/settings" aria-label="تنظیمات">${ic('settings')}</button></header>`;
  }

  /* ---------- بخش‌های مشترک ---------- */
  function heroCard() {
    return `<section class="card hero a-hero">
      <img class="flowers blend" src="flowers.webp" alt="">
      <div class="txt"><div class="name">${esc(S.profile.name)} ${ic('heartFill')}</div>
        <div class="ttl">${esc(S.profile.title)}</div><div class="rng">${rangeText()}</div><div class="tag">${esc(S.profile.tagline)}</div></div>
      <img class="cup blend" src="cupbooks.webp" alt="">
    </section>`;
  }
  function annualCard() {
    const tones = [['#a9c19f', '#e3ecdd'], ['#d98b9b', '#fbe6e8'], ['#d98b9b', '#fbe6e8'], ['#94b58c', '#e3ecdd'], ['#d98b9b', '#fbe6e8'], ['#d99a6c', '#f9e6d6'], ['#d98b9b', '#fbe6e8'], ['#e1a25c', '#fbefd9'], ['#a99ab2', '#ece2ee']];
    const body = `<div class="agrid">${S.annualGoals.map((g, i) => `<div class="ag" style="--c:${tones[i % 9][0]};--soft:${tones[i % 9][1]}"><div class="ico">${ic(g.icon)}</div><b>${esc(g.title)}</b><span>${esc(g.sub)}</span></div>`).join('')}</div>`;
    return `<section class="card a-annual"><div class="card-h">${ic('heart', 'ic')}<h2>اهداف ثابت سالانه</h2><button class="act no-print" data-a="go" data-h="more/annual">ویرایش</button></div>${body}</section>`;
  }
  function eventsCard(y, m) {
    const len = J.monthLength(y, m), rows = [];
    for (let d = 1; d <= len; d++) {
      const k = key(y, m, d);
      eventsOn(y, m, d).forEach((e) => rows.push({ k, t: e.title, kind: e.kind || 'star' }));
      holidaysOn(y, m, d).forEach((h) => rows.push({ k, t: h.t, kind: h.off ? 'hol' : 'cul' }));
      (dayData(k).items || []).forEach((it) => rows.push({ k, t: it.text, kind: 'item', emoji: it.emoji }));
    }
    S.events.filter((e) => e.m === m && !e.d).forEach((e) => rows.push({ k: null, t: e.title, kind: e.kind || 'star' }));
    const t0 = dn(todayKey());
    const body = rows.length ? rows.map((r) => {
      const diff = r.k ? dn(r.k) - t0 : null;
      const chip = r.k ? `<span class="chip ${r.kind === 'hol' ? 'red' : ''}">${shortDate(r.k)}</span>` : `<span class="chip peach">${MONTHS[m - 1]}</span>`;
      const icon = r.kind === 'item' ? `<span style="font-size:17px">${r.emoji || '📌'}</span>` : r.kind === 'hol' ? ic('flag') : r.kind === 'cul' ? ic('sparkle') : ic(r.kind === 'heart' ? 'heartFill' : r.kind === 'cake' ? 'cake' : r.kind === 'gift' ? 'gift' : 'star');
      return `<div class="ev" ${r.k ? `data-a="openDay" data-k="${r.k}"` : ''}>${icon}<div class="t">${esc(r.t)}${r.kind === 'hol' ? ' <span class="tiny faint">(تعطیل)</span>' : ''}</div>${diff !== null && diff >= 0 && diff <= 60 ? `<span class="cd">${countdown(diff)}</span>` : ''}${chip}</div>`;
    }).join('') : '<div class="empty">مناسبتی برای این ماه ثبت نشده</div>';
    return card('a-events', 'gift', 'مناسبت‌های ماه', body, `<button class="act no-print" data-a="addEvent">+ افزودن</button>`) ;
  }
  function goalsCard(k) {
    const i = periodOf(k);
    if (i < 0) return card('a-goals', 'target', 'اهداف اصلی ماه', `<div class="empty">این تاریخ خارج از برنامه سالانه است.<br><button class="btn soft" style="margin-top:8px" data-a="go" data-h="more/plan">تنظیم برنامه سال</button></div>`);
    const p = S.plan.periods[i];
    const rows = p.goals.map((g, gi) => {
      const c = D.progressCats.find((x) => x.id === g.cat);
      return `<div class="goal ${g.done ? 'done' : ''}">${ring(g.done, c ? c.color : '', 'toggleGoal', `data-p="${i}" data-g="${gi}"`)}<span class="t">${esc(g.text)}</span></div>`;
    }).join('') || '<div class="empty">هدفی ثبت نشده</div>';
    const done = p.goals.filter((g) => g.done).length;
    return card('a-goals', 'target', `اهداف ماه ${ORD[i]} برنامه`, `<div class="small muted" style="margin-bottom:4px">${periodLabel(i)}${p.focus ? ` · <b>${esc(p.focus)}</b>` : ''} · ${fa(done)} از ${fa(p.goals.length)}</div>${rows}`,
      `<button class="act no-print" data-a="go" data-h="more/plan/${i}">ویرایش</button>`).replace('</section>', `<img class="deco no-print" src="vase2.webp" style="left:8px;bottom:6px;width:44px;opacity:.55" alt=""></section>`);
  }
  function weekStart(k) { return fromDn(dn(k) - wdOf(k)); }
  function checklistCard(k, cls = 'a-check') {
    const ws = weekStart(k), tk = todayKey();
    const days = Array.from({ length: 7 }, (_, i) => fromDn(dn(ws) + i));
    const head = `<tr><th></th>${days.map((d, i) => `<th class="${d === tk ? 'today' : ''}">${WDS[i]}<div class="tiny faint">${fa(parse(d).d)}</div></th>`).join('')}</tr>`;
    const rows = S.habits.map((h) => `<tr><td class="hn"><i style="--c:${h.color}"></i>${esc(h.name)}</td>${days.map((d) => `<td>${ring(habitDone(d, h.id), h.color, 'toggleHabit', `data-k="${d}" data-h="${h.id}"`)}</td>`).join('')}</tr>`).join('');
    const nav = `<span class="row no-print" style="gap:4px"><button class="icon-btn" style="width:30px;height:30px" data-a="week" data-n="-7" aria-label="هفته قبل">${ic('chevR')}</button><button class="icon-btn" style="width:30px;height:30px" data-a="week" data-n="7" aria-label="هفته بعد">${ic('chevL')}</button></span>`;
    return card(cls, 'calCheck', 'چک‌لیست‌های روزانه', `<table class="hgrid">${head}${rows}</table>`, nav);
  }
  function progressCard(y, m) {
    const st = monthStats(y, m);
    const body = D.progressCats.map((c) => `<div class="bar" style="--c:${c.color}"><span>${c.name}</span><div class="track"><div class="fill" style="width:${st.cats[c.id]}%"></div></div><span class="pc">${fa(st.cats[c.id])}٪</span></div>`).join('')
      + `<div class="tiny faint" style="margin-top:6px">${ic('info', '').replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-2px"')} خودکار از روی چک‌لیست‌ها، اهداف ماه و ثبت هزینه‌ها</div>`;
    return card('a-prog', 'bars', 'پیشرفت ماهانه', body);
  }
  function donut(parts, size = 150) {
    const total = parts.reduce((a, p) => a + p.v, 0), r = 15.9155, c = 100;
    let off = 25;
    const segs = total ? parts.filter((p) => p.v > 0).map((p) => { const len = (p.v / total) * c; const s = `<circle cx="21" cy="21" r="${r}" fill="none" stroke="${p.color}" stroke-width="6.5" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${off}"/>`; off -= len; return s; }).join('')
      : `<circle cx="21" cy="21" r="${r}" fill="none" stroke="#f1e4e3" stroke-width="6.5"/>`;
    return `<svg viewBox="0 0 42 42" width="${size}" height="${size}">${segs}</svg>`;
  }
  function financeCard(y, m, cls = 'a-fin') {
    const ym = ymKey(y, m), tot = spent(ym);
    const parts = S.finance.cats.map((c) => ({ ...c, v: spent(ym, c.id) }));
    const sv = S.finance.savings[ym] || {};
    const body = `<div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="chip">دسته‌بندی هزینه‌ها</span><span class="chip sage">پس‌انداز ماه: ${sv.actual ? money(sv.actual) : '—'}</span></div>
      <div class="fin"><ul class="leg">${parts.map((p) => `<li style="--c:${p.color}"><i></i><span>${esc(p.name)}</span><span class="money">${p.v ? sep(p.v) : '—'}</span></li>`).join('')}</ul>
      <div class="donut">${donut(parts)}<div class="mid"><div>جمع کل<b class="money">${tot ? sep(tot) : '—'}</b>${tot ? 'تومان' : ''}</div></div></div></div>`;
    return card(cls, 'wallet', 'مدیریت مالی', body, `<button class="act no-print" data-a="addExpense">+ هزینه</button>`);
  }
  function moodRow(k) {
    const cur = dayData(k).mood;
    return `<div class="moods">${D.moods.map((e, i) => `<button class="${cur === e ? 'on' : ''}" data-a="mood" data-k="${k}" data-v="${e}" aria-label="${D.moodNames[i]}">${e}</button>`).join('')}</div>`;
  }
  function noteCard(k) {
    const body = `<div class="small muted" style="margin-bottom:6px">${fullDate(k)}</div>${moodRow(k)}
      <div class="prompts" style="margin-top:10px">${D.dayPrompts.join('<br>')}</div>
      <textarea class="lined" style="margin-top:10px" rows="4" data-in="note" data-k="${k}" placeholder="بنویس…">${esc(dayData(k).note || '')}</textarea>`;
    return card('a-note', 'notebook', 'یادداشت و حال‌وهوای روزانه', body).replace('</section>', `<img class="deco no-print" src="vase3.webp" style="left:6px;top:46px;width:34px;opacity:.5" alt=""></section>`);
  }
  function reviewCard(y, m) {
    const ym = ymKey(y, m), r = S.reviews[ym] || {};
    const body = D.reviewFields.map((f) => `<div class="review-item">${ic(f.icon)}<div><label class="lbl" style="margin-top:0">${f.label}</label><textarea rows="2" data-in="review" data-ym="${ym}" data-f="${f.k}">${esc(r[f.k] || '')}</textarea></div></div>`).join('');
    return card('a-review', 'star', `ارزیابی و جمع‌بندی ${MONTHS[m - 1]}`, body);
  }
  function photoCard(y, m) {
    const ym = ymKey(y, m), id = S.photos[ym], u = id ? IMG.url(id) : null;
    return `<section class="card a-photo"><div class="card-h">${ic('image', 'ic')}<h2>تصویر ماه</h2>${id ? `<button class="act no-print" data-a="delPhoto" data-ym="${ym}">حذف</button>` : ''}</div>
      <div class="photo"><img src="${u || 'photo.webp'}" alt="تصویر ماه"><button class="btn no-print" data-a="setPhoto" data-ym="${ym}">${ic('camera')} ${id ? 'تغییر عکس' : 'عکس خودم'}</button></div></section>`;
  }
  function yearCard() {
    const cur = periodOf(todayKey()), imgs = ['q1', 'q2', 'q3', 'q4'];
    const qs = S.plan.quarters.map((q, qi) => {
      const s = periodRange(qi * 3).s, e = periodRange(qi * 3 + 2).e;
      const btns = [0, 1, 2].map((j) => { const i = qi * 3 + j; return `<button class="${i === cur ? 'cur' : i < cur ? 'past' : ''}" data-a="jumpPeriod" data-i="${i}" title="${esc(S.plan.periods[i].focus)}">${fa(i + 1)}</button>`; }).join('');
      return `<div class="q ${Math.floor(cur / 3) === qi && cur >= 0 ? 'cur' : ''}"><div><h4>سه‌ماهه ${ORD[qi]}</h4><div class="rng">${shortDate(s)} ${fa(parse(s).y)} تا ${shortDate(e)} ${fa(parse(e).y)}</div><div class="tt">${esc(q.title)}</div><div class="ms">${btns}</div><div class="sub">${esc(q.sub)}</div></div><img src="${imgs[qi]}.webp" alt=""></div>`;
    }).join('');
    return card('a-year', 'leaf', `نمای کلی ۱۲ ماه پروژه ${esc(S.profile.name)}`, `<div class="quarters">${qs}</div>`, `<button class="act no-print" data-a="go" data-h="more/plan">برنامه کامل</button>`);
  }

  /* ---------- تقویم ماه ---------- */
  function monthHeadCard() {
    const { y, m } = ui, i = periodOf(ui.sel);
    const per = i >= 0 ? `ماه ${ORD[i]} برنامه · سه‌ماهه ${ORD[Math.floor(i / 3)]}` : 'خارج از برنامه سالانه';
    const focus = i >= 0 ? (S.plan.quarters[Math.floor(i / 3)].title + (S.plan.periods[i].focus ? ' — ' + S.plan.periods[i].focus : '')) : '';
    return `<section class="card a-head"><div class="mhead">
      <div><div class="nav"><button class="icon-btn no-print" data-a="month" data-n="-1" aria-label="ماه قبل">${ic('chevR')}</button>
        <div class="mname">${MONTHS[m - 1]} ${fa(y)}<small>${per}</small></div>
        <button class="icon-btn no-print" data-a="month" data-n="1" aria-label="ماه بعد">${ic('chevL')}</button></div>
        ${focus ? `<div class="focus" style="margin-top:6px">${esc(focus)}</div>` : ''}</div>
      <div class="motto">${ic('heartFill')}<span>${esc(S.profile.motto)}</span></div>
    </div></section>`;
  }
  function calendarCard() {
    const { y, m } = ui, tk = todayKey();
    const startDay = S.plan.start[2];
    const cells = monthCells(y, m).map((k) => {
      const p = parse(k), out = p.m !== m, wd = wdOf(k);
      const hol = holidaysOn(p.y, p.m, p.d), evs = eventsOn(p.y, p.m, p.d), dd = dayData(k);
      const off = hol.some((h) => h.off);
      const g = J.toDate(p.y, p.m, p.d).getDate();
      let marks = '';
      evs.forEach((e) => { marks += `<span style="color:var(--rose)">${ic(e.kind === 'heart' ? 'heartFill' : e.kind === 'cake' ? 'cake' : e.kind === 'gift' ? 'gift' : 'starFill')}</span>`; });
      (dd.items || []).slice(0, 2).forEach((it) => { marks += `<span class="mood">${it.emoji || '📌'}</span>`; });
      if (dd.mood) marks += `<span class="mood">${dd.mood}</span>`;
      const hc = (S.habitLog[k] || []).length; if (hc && !out) marks += `<i class="dot" title="${fa(hc)} عادت"></i>`;
      if (dd.note && !out) marks += `<span style="color:#86a77c">${ic('book')}</span>`;
      const isStart = !out && p.d === startDay && periodOf(k) >= 0;
      return `<button class="day ${out ? 'out' : ''} ${wd === 6 ? 'fri' : ''} ${off ? 'hol' : ''} ${k === tk ? 'today' : ''} ${k === ui.sel ? 'sel' : ''}" data-a="selDay" data-k="${k}" aria-label="${fullDate(k)}">
        <span class="n">${fa(p.d)}</span>${!out ? `<span class="g">${fa(g)}</span>` : ''}${isStart ? `<span class="start" title="شروع ماه ${ORD[periodOf(k)]} برنامه">${ic('starFill')}</span>` : ''}<span class="marks">${out ? '' : marks}</span></button>`;
    }).join('');
    return `<section class="card a-cal"><div class="cal"><div class="wd">${WD.map((w, i) => `<div><span class="l">${w}</span><span class="s">${WDS[i]}</span></div>`).join('')}</div><div class="grid">${cells}</div>
      <div class="cal-legend"><span style="color:var(--holiday)">● تعطیل</span><span style="color:var(--peach)">${ic('starFill')} شروع ماه برنامه</span><span style="color:var(--rose)">${ic('heartFill')} مناسبت</span><span><i class="dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--sage)"></i> عادت انجام‌شده</span></div></div></section>`;
  }
  function dayCard() {
    const k = ui.sel, p = parse(k), hol = holidaysOn(p.y, p.m, p.d), evs = eventsOn(p.y, p.m, p.d), dd = dayData(k);
    const list = [...hol.map((h) => `<div class="ev">${ic('flag')}<div class="t">${esc(h.t)}${h.off ? ' <span class="tiny faint">(تعطیل)</span>' : ''}</div></div>`),
      ...evs.map((e) => `<div class="ev">${ic(e.kind === 'heart' ? 'heartFill' : 'cake')}<div class="t">${esc(e.title)}</div></div>`),
      ...(dd.items || []).map((it) => `<div class="ev"><span style="font-size:17px">${it.emoji || '📌'}</span><div class="t">${esc(it.text)}</div><button class="x" data-a="delItem" data-k="${k}" data-id="${it.id}" aria-label="حذف">${ic('x')}</button></div>`)].join('');
    const i = periodOf(k);
    return card('a-day no-print', 'calendar', fullDate(k), `${i >= 0 ? `<div class="small muted">ماه ${ORD[i]} برنامه · ${esc(S.plan.periods[i].focus || '')}</div>` : ''}${list || '<div class="empty" style="padding:8px">رویدادی برای این روز نیست</div>'}
      <div class="btn-row" style="margin-top:10px"><button class="btn soft" data-a="openDay" data-k="${k}">${ic('edit')} جزئیات روز</button><button class="btn soft" data-a="addItem" data-k="${k}">${ic('plus')} رویداد</button></div>`);
  }
  function viewMonth() {
    const { y, m } = ui;
    return `${topbar(`${MONTHS[m - 1]} ${fa(y)}`, 'تقویم و نمای ماه')}
      <div class="btn-row no-print" style="margin:0 2px 10px"><button class="btn soft" data-a="today">${ic('calendar')} امروز</button><button class="btn soft" data-a="print">${ic('printer')} نسخه چاپی / PDF</button></div>
      <div class="dash">${heroCard()}${monthHeadCard()}${calendarCard()}${dayCard()}${goalsCard(ui.sel)}${eventsCard(y, m)}${checklistCard(weekStartForMonth())}${progressCard(y, m)}${financeCard(y, m)}${noteCard(ui.sel)}${annualCard()}${reviewCard(y, m)}${photoCard(y, m)}${yearCard()}
      <div class="a-foot"><div class="script">A More Balanced and Beautiful Life ♥</div><img src="sprigbl.webp" class="blend" style="width:140px;margin:0 auto" alt=""></div></div>`;
  }
  const weekStartForMonth = () => fromDn(dn(ui.sel) + ui.week);

  /* ---------- امروز ---------- */
  function reminders() {
    const out = [], tk = todayKey(), t = todayJ();
    upcoming(14).forEach((u) => {
      if (u.kind === 'cul' && u.i > 3) return;
      if (u.kind === 'hol' && u.i > 7) return;
      const icon = u.kind === 'hol' ? 'flag' : u.kind === 'item' ? 'bell' : u.kind === 'heart' ? 'heartFill' : u.kind === 'cake' ? 'cake' : 'star';
      out.push({ icon, c: u.kind === 'hol' ? 'var(--holiday)' : 'var(--rose-deep)', soft: u.kind === 'hol' ? '#fbe3e6' : 'var(--rose-pale)', t: `${esc(u.t)}`, s: `${countdown(u.i)} · ${shortDate(u.k)}`, k: u.k });
    });
    const left = S.habits.filter((h) => !habitDone(tk, h.id)).length;
    if (left) out.push({ icon: 'listCheck', c: '#5f7a55', soft: 'var(--sage-soft)', t: `${fa(left)} مورد از چک‌لیست امروز مونده`, s: 'هر قدم کوچیک حساب میشه' });
    const i = periodOf(tk);
    if (i >= 0) { const r = periodRange(i); const rem = dn(r.e) - dn(tk); if (rem <= 3) out.push({ icon: 'sparkle', c: '#a46a3c', soft: 'var(--peach-soft)', t: rem === 0 ? `امروز آخرین روز ماه ${ORD[i]} برنامه‌ست` : `${fa(rem)} روز تا پایان ماه ${ORD[i]} برنامه`, s: 'وقت جمع‌بندی و ارزیابی ماه', h: 'month' }); }
    if (J.monthLength(t.y, t.m) - t.d <= 2 && !(S.reviews[ymKey(t.y, t.m)] || {}).wins) out.push({ icon: 'star', c: '#a46a3c', soft: 'var(--peach-soft)', t: `ارزیابی ${MONTHS[t.m - 1]} رو فراموش نکن`, s: 'دستاوردها، چالش‌ها، درس‌ها', h: 'month' });
    const ym = ymKey(t.y, t.m);
    S.finance.cats.filter((c) => c.budget > 0 && spent(ym, c.id) > c.budget).forEach((c) => out.push({ icon: 'alert', c: 'var(--danger)', soft: '#fbe3e6', t: `هزینه‌ی «${esc(c.name)}» از سقف بودجه رد شد`, s: `${money(spent(ym, c.id))} از ${money(c.budget)}`, h: 'money' }));
    if (dn(tk) > dn(planEnd())) out.push({ icon: 'flag', c: 'var(--rose-deep)', soft: 'var(--rose-pale)', t: 'سال برنامه تموم شده! وقت برنامه‌ی سال جدیده', s: 'از بخش «برنامه ۱۲ ماهه»', h: 'more/plan' });
    return out;
  }
  function viewToday() {
    const tk = todayKey(), dd = dayData(tk), i = periodOf(tk);
    const rem = reminders();
    const remHtml = rem.length ? rem.map((r) => `<div class="reminder" ${r.k ? `data-a="openDay" data-k="${r.k}"` : r.h ? `data-a="go" data-h="${r.h}"` : ''} style="--c:${r.c};--soft:${r.soft}"><span class="bub">${ic(r.icon)}</span><div class="grow"><div>${r.t}</div><div class="tiny muted">${r.s}</div></div></div>`).join('') : '<div class="empty">امروز یادآوری خاصی نداری 🌸</div>';
    const habits = S.habits.map((h) => { const on = habitDone(tk, h.id), st = streak(h); return `<button class="habit-row ${on ? 'on' : ''}" data-a="toggleHabit" data-k="${tk}" data-h="${h.id}"><span class="ring ${on ? 'on' : ''}" style="--c:${h.color}">${ic('check')}</span><span class="nm">${esc(h.name)}</span>${st > 1 ? `<span class="streak">🔥 ${fa(st)} روز</span>` : ''}</button>`; }).join('');
    const done = S.habits.filter((h) => habitDone(tk, h.id)).length;
    const items = (dd.items || []).map((it) => `<div class="ev"><span style="font-size:17px">${it.emoji || '📌'}</span><div class="t">${esc(it.text)}</div><button class="x" data-a="delItem" data-k="${tk}" data-id="${it.id}" aria-label="حذف">${ic('x')}</button></div>`).join('');
    const todaySpent = S.finance.expenses.filter((x) => x.date === tk).reduce((a, x) => a + x.amount, 0);
    return `${topbar(`سلام ${esc(S.profile.name)} ${ic('heartFill').replace('<svg', '<svg style="width:20px;height:20px;color:var(--rose)"')}`, fullDate(tk))}
      <section class="card quote"><div><div class="when">جمله‌ی امروز</div><p>${esc(quoteOf(tk))}</p></div><img class="blend" src="sprig2.webp" alt=""></section>
      ${card('', 'bell', 'یادآوری‌ها', remHtml)}
      ${card('', 'heart', 'حالت امروز چطوره؟', moodRow(tk))}
      ${card('', 'listCheck', `چک‌لیست امروز <span class="tiny muted">(${fa(done)} از ${fa(S.habits.length)})</span>`, habits, `<button class="act" data-a="go" data-h="habits">همه</button>`)}
      ${i >= 0 ? goalsCard(tk) : ''}
      ${card('', 'calendar', 'امروز در تقویم', (items || '<div class="empty" style="padding:6px">هنوز چیزی ثبت نکردی</div>') + `<div class="btn-row" style="margin-top:10px"><button class="btn soft" data-a="addItem" data-k="${tk}">${ic('plus')} رویداد</button><button class="btn soft" data-a="addExpense">${ic('wallet')} هزینه${todaySpent ? ` (${sep(todaySpent)})` : ''}</button></div>`)}
      ${card('', 'notebook', 'یادداشت امروز', `<div class="prompts">${D.dayPrompts.join('<br>')}</div><textarea class="lined" style="margin-top:10px" rows="5" data-in="note" data-k="${tk}" placeholder="بنویس…">${esc(dd.note || '')}</textarea>`)}`;
  }

  /* ---------- عادت‌ها ---------- */
  function viewHabits() {
    const t = todayJ(), { y, m } = ui, len = J.monthLength(y, m), st = monthStats(y, m), first = J.weekday(y, m, 1);
    const cards = S.habits.map((h) => {
      const hs = st.habit[h.id];
      const cells = Array.from({ length: first }, () => '<i class="out"></i>').join('') + Array.from({ length: len }, (_, i) => `<i class="${habitDone(key(y, m, i + 1), h.id) ? 'on' : ''}">${fa(i + 1)}</i>`).join('');
      return `<div class="habit-card"><div class="row" style="margin-bottom:8px"><i style="width:14px;height:14px;border-radius:50%;background:${h.color}"></i><b class="grow">${esc(h.name)}</b><span class="streak">🔥 ${fa(streak(h))}</span><span class="chip">${fa(hs.done)} بار · هدف ${fa(h.perWeek)} در هفته</span><button class="x" data-a="editHabit" data-id="${h.id}" aria-label="ویرایش">${ic('edit')}</button></div><div class="heat" style="--c:${h.color}">${cells}</div></div>`;
    }).join('');
    return `${topbar('عادت‌ها و چک‌لیست', `${MONTHS[m - 1]} ${fa(y)}`)}
      ${checklistCard(fromDn(dn(todayKey()) + ui.week), '')}
      <div class="row no-print" style="margin:14px 2px 8px"><button class="icon-btn" data-a="month" data-n="-1">${ic('chevR')}</button><b class="grow center">نقشه‌ی ${MONTHS[m - 1]} ${fa(y)}</b><button class="icon-btn" data-a="month" data-n="1">${ic('chevL')}</button></div>
      ${card('', 'flame', 'زنجیره‌ی عادت‌ها', cards || '<div class="empty">عادتی تعریف نشده</div>', `<button class="act" data-a="editHabit">+ عادت</button>`)}
      ${progressCard(y, m)}`;
  }

  /* ---------- مالی ---------- */
  function viewMoney() {
    const { y, m } = ui, ym = ymKey(y, m), sv = S.finance.savings[ym] || {};
    const warn = S.finance.cats.filter((c) => c.budget > 0).map((c) => {
      const s = spent(ym, c.id), r = s / c.budget;
      if (r > 1) return `<div class="alert">${ic('alert')}<div>«${esc(c.name)}» از سقف بودجه رد شده: ${money(s)} از ${money(c.budget)}</div></div>`;
      if (r >= 0.8) return `<div class="alert peach">${ic('alert')}<div>«${esc(c.name)}» به ${fa(Math.round(r * 100))}٪ سقف بودجه رسیده</div></div>`;
      return '';
    }).join('');
    const budgets = S.finance.cats.map((c) => {
      const s = spent(ym, c.id), pc = c.budget ? Math.round((s / c.budget) * 100) : 0;
      return `<div class="bar ${pc > 100 ? 'warn' : ''}" style="--c:${c.color};grid-template-columns:100px 1fr 64px" data-a="editCat" data-id="${c.id}"><span>${esc(c.name)}</span><div class="track"><div class="fill" style="width:${Math.min(100, c.budget ? pc : 0)}%"></div></div><span class="pc">${c.budget ? fa(pc) + '٪' : '<span class="tiny faint">بی‌سقف</span>'}</span></div>`;
    }).join('');
    const exps = S.finance.expenses.filter((x) => x.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));
    let last = '', list = '';
    exps.forEach((x) => {
      if (x.date !== last) { list += `<div class="daygrp">${fullDate(x.date)}</div>`; last = x.date; }
      const c = catOf(x.cat);
      list += `<div class="exp" data-a="addExpense" data-id="${x.id}"><i class="c" style="--c:${c.color};--soft:${soft(c.color, .3)}">${esc(c.name[0])}</i><div class="grow"><div>${esc(x.note || c.name)}</div><div class="tiny muted">${esc(c.name)}</div></div><span class="amt money">${sep(x.amount)}</span></div>`;
    });
    return `${topbar('مدیریت مالی', 'به تومان')}
      <div class="row no-print" style="margin:0 2px 10px"><button class="icon-btn" data-a="month" data-n="-1">${ic('chevR')}</button><b class="grow center">${MONTHS[m - 1]} ${fa(y)}</b><button class="icon-btn" data-a="month" data-n="1">${ic('chevL')}</button></div>
      ${warn}
      ${financeCard(y, m, '')}
      ${card('', 'piggy', 'پس‌انداز ماه', `<div class="row"><div class="grow"><label class="lbl" style="margin-top:0">هدف (تومان)</label><input type="text" inputmode="numeric" data-in="saving" data-ym="${ym}" data-f="target" value="${sv.target ? sep(sv.target) : ''}" placeholder="مثلاً ۲,۰۰۰,۰۰۰"></div><div class="grow"><label class="lbl" style="margin-top:0">پس‌انداز شده</label><input type="text" inputmode="numeric" data-in="saving" data-ym="${ym}" data-f="actual" value="${sv.actual ? sep(sv.actual) : ''}"></div></div>
        ${sv.target ? `<div class="bar" style="--c:var(--sage);grid-template-columns:1fr 44px;margin-top:8px"><div class="track"><div class="fill" style="width:${Math.min(100, Math.round(((sv.actual || 0) / sv.target) * 100))}%"></div></div><span class="pc">${fa(Math.round(((sv.actual || 0) / sv.target) * 100))}٪</span></div>` : ''}`)}
      ${card('', 'target', 'سقف بودجه هر دسته', budgets + '<div class="tiny faint" style="margin-top:6px">برای تعیین سقف، روی هر دسته بزن.</div>', `<button class="act" data-a="editCat">+ دسته</button>`)}
      ${card('', 'listCheck', 'هزینه‌های ماه', list || '<div class="empty">هنوز هزینه‌ای ثبت نشده</div>', `<button class="act" data-a="addExpense">+ هزینه</button>`)}`;
  }

  /* ---------- بیشتر ---------- */
  const MORE = [
    ['plan', 'leaf', 'برنامه ۱۲ ماهه', 'اهداف هر ماه و فصل', '#94b58c', '#e3ecdd'],
    ['annual', 'heart', 'اهداف ثابت سالانه', 'عادت‌ها و قول‌های سال', '#d98b9b', '#fbe6e8'],
    ['events', 'gift', 'مناسبت‌ها', 'تولدها، سالگردها، شمارش معکوس', '#d98b9b', '#fbe6e8'],
    ['books', 'book', 'کتابخانه من', 'کتاب‌ها و پیشرفت مطالعه', '#d99a6c', '#f9e6d6'],
    ['meals', 'utensils', 'منوی هفتگی', 'برنامه غذا و لیست خرید', '#d98b9b', '#fbe6e8'],
    ['ideas', 'shirt', 'دفترچه ایده', 'ایده‌های طراحی لباس', '#a99ab2', '#ece2ee'],
    ['review', 'star', 'ارزیابی ماه', 'جمع‌بندی و درس‌ها', '#e1a25c', '#fbefd9'],
    ['settings', 'settings', 'پشتیبان و تنظیمات', 'خروجی، ورود فایل، نام', '#8d6e74', '#f1e6e4']
  ];
  const backBtn = () => `<button class="back no-print" data-a="go" data-h="more">${ic('chevR')} بیشتر</button>`;
  function viewMore() {
    const s = ui.sub;
    if (s === 'plan') return viewPlan();
    if (s === 'annual') return viewAnnual();
    if (s === 'events') return viewEvents();
    if (s === 'books') return viewBooks();
    if (s === 'meals') return viewMeals();
    if (s === 'ideas') return viewIdeas();
    if (s === 'review') return `${backBtn()}${reviewCard(ui.y, ui.m)}${photoCard(ui.y, ui.m)}`;
    if (s === 'settings') return viewSettings();
    return `${topbar('بیشتر', '')}<div class="tiles">${MORE.map(([h, i, t, d, c, sf]) => `<button class="tile" data-a="go" data-h="more/${h}" style="--c:${c};--soft:${sf}"><span class="ico">${ic(i)}</span><b>${t}</b><span>${d}</span></button>`).join('')}</div>
      <div class="card" style="margin-top:12px">${yearCard().replace(/^<section class="card a-year">/, '').replace(/<\/section>$/, '')}</div>`;
  }
  function viewPlan() {
    const cur = periodOf(todayKey()), open = location.hash.split('/')[3];
    const cats = D.progressCats;
    const per = S.plan.periods.map((p, i) => {
      const isOpen = open !== undefined ? +open === i : i === cur;
      const goals = p.goals.map((g, gi) => `<div class="goal ${g.done ? 'done' : ''}">${ring(g.done, (cats.find((c) => c.id === g.cat) || {}).color, 'toggleGoal', `data-p="${i}" data-g="${gi}"`)}<span class="t">${esc(g.text)}</span><span class="chip" style="font-size:10.5px">${(cats.find((c) => c.id === g.cat) || { name: '—' }).name}</span><button class="x" data-a="delGoal" data-p="${i}" data-g="${gi}" aria-label="حذف">${ic('trash')}</button></div>`).join('');
      return `<details class="card" ${isOpen ? 'open' : ''} style="margin-top:10px"><summary class="card-h" style="cursor:pointer;list-style:none"><span class="chip ${i === cur ? '' : i < cur ? 'sage' : 'peach'}">${fa(i + 1)}</span><h2>${esc(p.focus || 'بدون عنوان')}<div class="tiny muted" style="font-weight:500">${periodLabel(i)}</div></h2><span class="tiny muted">${fa(p.goals.filter((g) => g.done).length)}/${fa(p.goals.length)}</span></summary>
        <div class="card-b"><label class="lbl" style="margin-top:0">تمرکز این ماه</label><input type="text" data-in="focus" data-p="${i}" value="${esc(p.focus)}">
        <label class="lbl">اهداف</label>${goals || '<div class="empty" style="padding:6px">هدفی نیست</div>'}
        <div class="row" style="margin-top:8px"><input type="text" id="ng-${i}" placeholder="هدف جدید…" class="grow"><select id="nc-${i}" style="width:120px">${cats.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select><button class="btn" data-a="addGoal" data-p="${i}">${ic('plus')}</button></div></div></details>`;
    }).join('');
    const quarters = S.plan.quarters.map((q, qi) => `<div class="row" style="margin-bottom:6px"><span class="chip">سه‌ماهه ${ORD[qi]}</span><input type="text" class="grow" data-in="qtitle" data-q="${qi}" value="${esc(q.title)}"></div>`).join('');
    const [sy, sm, sd] = S.plan.start;
    return `${backBtn()}${card('', 'calendar', 'شروع سال برنامه', `<div class="small muted">۱۲ ماه برنامه از این روز شروع میشه. برای سال بعد کافیه تاریخ رو عوض کنی.</div>
      <div class="row" style="margin-top:8px"><select id="ps-d" style="width:80px">${Array.from({ length: 29 }, (_, i) => `<option ${i + 1 === sd ? 'selected' : ''} value="${i + 1}">${fa(i + 1)}</option>`).join('')}</select>
      <select id="ps-m">${MONTHS.map((mn, i) => `<option ${i + 1 === sm ? 'selected' : ''} value="${i + 1}">${mn}</option>`).join('')}</select>
      <input id="ps-y" type="text" inputmode="numeric" style="width:90px" value="${fa(sy)}"><button class="btn" data-a="setStart">ثبت</button></div>
      <div class="tiny faint" style="margin-top:6px">${rangeText()}</div>`)}
      ${card('', 'leaf', 'عنوان سه‌ماهه‌ها', quarters)}${per}`;
  }
  function viewAnnual() {
    const icons = ['book', 'lotus', 'dumbbell', 'sprout', 'piggy', 'utensils', 'heart', 'sun', 'moon', 'palette', 'star', 'leaf', 'wallet', 'shirt'];
    const rows = S.annualGoals.map((g, i) => `<div class="listrow"><select data-in="agIcon" data-i="${i}" style="width:110px">${icons.map((x) => `<option ${x === g.icon ? 'selected' : ''} value="${x}">${{ book: 'کتاب', lotus: 'نیلوفر', dumbbell: 'دمبل', sprout: 'جوانه', piggy: 'قلک', utensils: 'قاشق‌چنگال', heart: 'قلب', sun: 'خورشید', moon: 'ماه', palette: 'پالت', star: 'ستاره', leaf: 'برگ', wallet: 'کیف پول', shirt: 'لباس' }[x]}</option>`).join('')}</select><input type="text" data-in="agTitle" data-i="${i}" value="${esc(g.title)}" style="width:30%"><input type="text" class="grow" data-in="agSub" data-i="${i}" value="${esc(g.sub)}"><button class="x" data-a="delAnnual" data-i="${i}">${ic('trash')}</button></div>`).join('');
    return `${backBtn()}${annualCard().replace('<button class="act no-print" data-a="go" data-h="more/annual">ویرایش</button>', '')}${card('', 'edit', 'ویرایش اهداف', rows + `<button class="btn soft block" style="margin-top:10px" data-a="addAnnual">${ic('plus')} هدف جدید</button>`)}`;
  }
  function viewEvents() {
    const evs = S.events.map((e) => ({ e, n: nextOccurrence(e) })).sort((a, b) => (a.n ? a.n.diff : 9999) - (b.n ? b.n.diff : 9999));
    const rows = evs.map(({ e, n }) => `<div class="ev" data-a="addEvent" data-id="${e.id}">${ic(e.kind === 'heart' ? 'heartFill' : e.kind === 'cake' ? 'cake' : e.kind === 'gift' ? 'gift' : 'star')}<div class="t">${esc(e.title)}<div class="tiny muted">${e.m ? (e.d ? `${fa(e.d)} ${MONTHS[e.m - 1]}` : MONTHS[e.m - 1]) : 'تاریخ نامشخص'}${e.y ? ` ${fa(e.y)}` : ' · هر سال'}</div></div>${n && e.d ? `<span class="cd">${countdown(n.diff)}</span>` : ''}</div>`).join('');
    return `${backBtn()}${card('', 'gift', 'مناسبت‌های من', rows || '<div class="empty">مناسبتی ثبت نشده</div>', `<button class="act" data-a="addEvent">+ افزودن</button>`)}`;
  }
  function seasonOf(k) { const p = parse(k); return `${p.y}-${Math.ceil(p.m / 3)}`; }
  function viewBooks() {
    const se = seasonOf(todayKey()), finished = S.books.filter((b) => b.status === 'done' && b.doneAt && seasonOf(b.doneAt) === se).length;
    const order = { reading: 0, next: 1, done: 2 };
    const rows = [...S.books].sort((a, b) => order[a.status] - order[b.status]).map((b) => {
      const pc = b.pages ? Math.round((b.current / b.pages) * 100) : 0;
      return `<div class="book"><div class="row"><b class="grow">${esc(b.title)}</b><span class="chip ${b.status === 'done' ? 'sage' : b.status === 'next' ? 'peach' : ''}">${{ reading: 'در حال خواندن', next: 'بعدی', done: 'تمام‌شده' }[b.status]}</span><button class="x" data-a="editBook" data-id="${b.id}">${ic('edit')}</button></div>
        <div class="meta">${esc(b.author || '')}${b.pages ? ` · صفحه ${fa(b.current || 0)} از ${fa(b.pages)}` : ''}</div>
        ${b.pages ? `<div class="bar" style="--c:var(--peach);grid-template-columns:1fr 40px"><div class="track"><div class="fill" style="width:${pc}%"></div></div><span class="pc">${fa(pc)}٪</span></div>` : ''}
        ${b.status === 'reading' ? `<div class="btn-row"><button class="btn soft" data-a="bookPages" data-id="${b.id}" data-n="10">+۱۰ صفحه</button><button class="btn soft" data-a="bookPages" data-id="${b.id}" data-n="25">+۲۵ صفحه</button><button class="btn soft" data-a="bookDone" data-id="${b.id}">تمامش کردم 🎉</button></div>` : ''}</div>`;
    }).join('');
    return `${backBtn()}<div class="alert info">${ic('book')}<div>این فصل ${fa(finished)} کتاب تمام کردی؛ هدف: ${fa(2)} کتاب در هر فصل</div></div>${card('', 'book', 'کتابخانه من', rows || '<div class="empty">اولین کتابت رو اضافه کن</div>', `<button class="act" data-a="editBook">+ کتاب</button>`)}`;
  }
  function viewMeals() {
    const tk = todayKey(), ws = fromDn(dn(weekStart(tk)) + ui.week), w = S.meals[ws] || {};
    const rows = WD.map((d, i) => { const k = fromDn(dn(ws) + i), v = w[i] || {}; return `<div class="meal ${k === tk ? 'today' : ''}"><b>${d}<div class="tiny faint">${shortDate(k)}</div></b><input type="text" placeholder="ناهار" data-in="meal" data-w="${ws}" data-d="${i}" data-f="l" value="${esc(v.l || '')}"><input type="text" placeholder="شام" data-in="meal" data-w="${ws}" data-d="${i}" data-f="s" value="${esc(v.s || '')}"></div>`; }).join('');
    const shop = S.shopping.map((s) => `<div class="listrow ${s.done ? 'done' : ''}">${ring(s.done, 'var(--sage)', 'toggleShop', `data-id="${s.id}"`)}<span class="t">${esc(s.text)}</span><button class="x" data-a="delShop" data-id="${s.id}">${ic('x')}</button></div>`).join('');
    return `${backBtn()}${card('', 'utensils', 'منوی هفتگی', rows, `<span class="row"><button class="icon-btn" style="width:30px;height:30px" data-a="week" data-n="-7">${ic('chevR')}</button><button class="icon-btn" style="width:30px;height:30px" data-a="week" data-n="7">${ic('chevL')}</button></span>`)}
      ${card('', 'cart', 'لیست خرید', `${shop || '<div class="empty" style="padding:6px">لیست خالیه</div>'}<div class="row" style="margin-top:8px"><input id="shop-new" type="text" class="grow" placeholder="مثلاً: سبزی تازه"><button class="btn" data-a="addShop">${ic('plus')}</button></div>${S.shopping.some((s) => s.done) ? '<button class="btn ghost" data-a="clearShop" style="margin-top:6px">پاک کردن خریدهای انجام‌شده</button>' : ''}`)}`;
  }
  function viewIdeas() {
    const items = [...S.ideas].reverse().map((x) => { const u = x.img ? IMG.url(x.img) : null; return `<button class="idea" data-a="editIdea" data-id="${x.id}"><div class="im" style="${u ? `background-image:url('${u}')` : ''}">${u ? '' : ic('shirt')}</div><div class="tx"><b>${esc(x.title)}</b><span>${shortDate(x.date)}</span></div></button>`; }).join('');
    return `${backBtn()}${card('', 'shirt', 'دفترچه ایده طراحی لباس', items ? `<div class="ideas">${items}</div>` : '<div class="empty">ایده‌ها، طرح‌ها و الهام‌هات رو اینجا جمع کن</div>', `<button class="act" data-a="editIdea">+ ایده</button>`)}`;
  }
  function viewSettings() {
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    return `${backBtn()}
      ${card('', 'download', 'پشتیبان‌گیری', `<p class="small muted" style="margin-top:0">همه‌ی اطلاعات فقط روی همین گوشی ذخیره میشه. هفته‌ای یک بار فایل پشتیبان بگیر و یه جای امن (مثلاً Files یا تلگرام) نگهش دار.</p>
        <div class="btn-row"><button class="btn" data-a="export">${ic('share')} گرفتن فایل پشتیبان</button><button class="btn soft" data-a="importFile">${ic('upload')} وارد کردن فایل</button><button class="btn soft" data-a="importPaste">جای‌گذاری متن</button></div>
        ${S.lastBackup ? `<div class="tiny faint" style="margin-top:8px">آخرین پشتیبان: ${fullDate(S.lastBackup)}</div>` : ''}${memoryOnly ? '<div class="alert" style="margin-top:8px">ذخیره‌سازی مرورگر در دسترس نیست؛ اطلاعات با بستن صفحه پاک میشه.</div>' : ''}`)}
      ${card('', 'edit', 'شخصی‌سازی', `<label class="lbl" style="margin-top:0">نام</label><input type="text" data-in="profile" data-f="name" value="${esc(S.profile.name)}">
        <label class="lbl">عنوان</label><input type="text" data-in="profile" data-f="title" value="${esc(S.profile.title)}">
        <label class="lbl">شعار زیر عنوان</label><input type="text" data-in="profile" data-f="tagline" value="${esc(S.profile.tagline)}">
        <label class="lbl">جمله‌ی انگیزشی ماه</label><input type="text" data-in="profile" data-f="motto" value="${esc(S.profile.motto)}">`)}
      ${iOS && !standalone ? card('', 'info', 'نصب روی آیفون', installHtml()) : ''}
      ${card('', 'trash', 'شروع از نو', `<p class="small muted" style="margin-top:0">همه‌ی اطلاعات این گوشی پاک میشه. قبلش حتماً پشتیبان بگیر.</p><button class="btn danger" data-a="reset">پاک کردن همه‌چیز</button>`)}
      <div class="center tiny faint" style="margin-top:14px">سوگل · نسخه ۱.۰ · آفلاین و خصوصی</div>`;
  }
  const installHtml = () => `<div class="install">۱. این صفحه رو در <b>Safari</b> باز کن.<br>۲. دکمه‌ی اشتراک‌گذاری ${ic('share')} پایین صفحه رو بزن.<br>۳. گزینه‌ی <b>Add to Home Screen</b> (افزودن به صفحه اصلی) رو انتخاب کن.<br>۴. از این به بعد اپ رو از آیکون سوگل روی صفحه اصلی باز کن.<br><span class="tiny muted">مهم: اطلاعات نسخه‌ی نصب‌شده جدا از Safari نگه داشته میشه؛ فایل شخصی رو داخل اپ نصب‌شده وارد کن.</span></div>`;

  /* ---------- خوش‌آمد ---------- */
  function viewWelcome() {
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    return `<div class="welcome"><img class="flw" src="flowers.webp" alt=""><h1>سوگل ♥</h1><p>تقویم مدیریت زندگی شخصی<br>زندگی متعادل، سالم، خلاقانه و رضایت‌بخش</p>
      ${iOS && !standalone ? `<section class="card" style="margin:14px 0">${'<div class="card-b">' + installHtml() + '</div>'}</section>` : ''}
      <section class="card"><div class="card-b stack"><b>فایل برنامه‌ی شخصی داری؟</b><div class="small muted">فایل <span dir="ltr">sogol-preset.json</span> برنامه‌ی ۱۲ ماهه، مناسبت‌ها و اهدافت رو وارد می‌کنه.</div>
      <button class="btn block" data-a="importFile">${ic('upload')} انتخاب فایل</button><button class="btn soft block" data-a="importPaste">جای‌گذاری متن فایل</button><button class="btn ghost block" data-a="startEmpty">شروع بدون فایل</button></div></section></div>`;
  }

  /* ================= رندر ================= */
  function render() {
    const app = $('#app');
    const tabbar = $('#tabbar');
    if (!S.started) { app.innerHTML = viewWelcome(); tabbar.hidden = true; return; }
    tabbar.hidden = false;
    const v = { today: viewToday, month: viewMonth, habits: viewHabits, money: viewMoney, more: viewMore }[ui.view];
    app.innerHTML = v();
    $$('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.v === ui.view));
  }
  const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

  /* ================= شیت و پیام ================= */
  let sheetDone = null;
  function sheet(html, onSave) {
    closeSheet(true);
    const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.dataset.a = 'closeSheet';
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog');
    sh.innerHTML = `<div class="grab"></div>${html}`;
    document.body.append(bg, sh);
    requestAnimationFrame(() => { bg.classList.add('on'); sh.classList.add('on'); });
    sheetDone = onSave;
    return sh;
  }
  function closeSheet(instant) {
    $$('.sheet, .sheet-bg').forEach((el) => { if (instant) el.remove(); else { el.classList.remove('on'); setTimeout(() => el.remove(), 250); } });
    sheetDone = null;
  }
  let toastT;
  function toast(t) {
    let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
    el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
  }
  const foot = (del) => `<div class="foot">${del ? `<button class="btn danger" data-a="sheetDel" style="flex:0 0 auto">${ic('trash')}</button>` : ''}<button class="btn ghost" data-a="closeSheet">انصراف</button><button class="btn" data-a="sheetSave">ذخیره</button></div>`;
  const opts = (name, list, cur) => `<div class="opts" data-opt="${name}">${list.map(([v, l]) => `<button type="button" class="${v === cur ? 'on' : ''}" data-a="opt" data-v="${v}">${l}</button>`).join('')}</div>`;
  const optVal = (sh, name) => { const b = $(`[data-opt="${name}"] .on`, sh); return b ? b.dataset.v : null; };
  const colorOpts = (cur) => `<div class="opts colors" data-opt="color">${['#e8a0a8', '#e9a3b0', '#d6a6c4', '#c4b0cb', '#b2c6a6', '#9fbf98', '#eec29f', '#dcc7ab', '#f3bfc5', '#a8c4d4'].map((c) => `<button type="button" style="--c:${c}" class="${c === cur ? 'on' : ''}" data-a="opt" data-v="${c}"></button>`).join('')}</div>`;

  function dateFields(k) {
    const p = parse(k);
    return `<div class="row"><select id="f-d" style="width:80px">${Array.from({ length: 31 }, (_, i) => `<option ${i + 1 === p.d ? 'selected' : ''} value="${i + 1}">${fa(i + 1)}</option>`).join('')}</select><select id="f-m">${MONTHS.map((mn, i) => `<option ${i + 1 === p.m ? 'selected' : ''} value="${i + 1}">${mn}</option>`).join('')}</select><input id="f-y" type="text" inputmode="numeric" style="width:90px" value="${fa(p.y)}"></div>`;
  }
  function readDate(sh) {
    const y = num($('#f-y', sh).value), m = +$('#f-m', sh).value; let d = +$('#f-d', sh).value;
    d = Math.min(d, J.monthLength(y, m)); return key(y, m, d);
  }

  /* ---------- شیت‌ها ---------- */
  function openDay(k) {
    const p = parse(k), dd = dayData(k), hol = holidaysOn(p.y, p.m, p.d), evs = eventsOn(p.y, p.m, p.d);
    const habits = S.habits.map((h) => `<button class="habit-row ${habitDone(k, h.id) ? 'on' : ''}" data-a="toggleHabit" data-k="${k}" data-h="${h.id}" data-sheet="1"><span class="ring ${habitDone(k, h.id) ? 'on' : ''}" style="--c:${h.color}">${ic('check')}</span><span class="nm">${esc(h.name)}</span></button>`).join('');
    const exps = S.finance.expenses.filter((x) => x.date === k);
    sheet(`<h3>${fullDate(k)}</h3><div class="small muted">${fa(J.toDate(p.y, p.m, p.d).toLocaleDateString('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
      ${hol.map((h) => `<div class="chip red" style="margin:6px 0 0 4px">${esc(h.t)}</div>`).join('')}${evs.map((e) => `<div class="chip" style="margin:6px 0 0 4px">${esc(e.title)}</div>`).join('')}
      <label class="lbl">حال‌وهوا</label>${moodRow(k)}
      <label class="lbl">رویدادها و کارهای این روز</label><div id="day-items">${(dd.items || []).map((it) => `<div class="ev"><span style="font-size:17px">${it.emoji || '📌'}</span><div class="t">${esc(it.text)}</div><button class="x" data-a="delItem" data-k="${k}" data-id="${it.id}" data-sheet="1">${ic('x')}</button></div>`).join('') || '<div class="tiny faint">چیزی ثبت نشده</div>'}</div>
      <button class="btn soft" style="margin-top:6px" data-a="addItem" data-k="${k}">${ic('plus')} رویداد</button>
      <label class="lbl">چک‌لیست</label>${habits}
      <label class="lbl">یادداشت</label><textarea class="lined" rows="4" data-in="note" data-k="${k}">${esc(dd.note || '')}</textarea>
      ${exps.length ? `<label class="lbl">هزینه‌ها</label>${exps.map((x) => `<div class="exp"><span class="grow">${esc(x.note || catOf(x.cat).name)}</span><span class="money">${sep(x.amount)}</span></div>`).join('')}` : ''}
      <div class="foot"><button class="btn soft" data-a="addExpense" data-k="${k}">${ic('wallet')} هزینه</button><button class="btn" data-a="closeSheet">بستن</button></div>`);
  }
  function addItem(k) {
    const emojis = ['📌', '💗', '🎂', '🎉', '✈️', '🎨', '📚', '🏃‍♀️', '🧘‍♀️', '🍰', '🛍️', '👗', '☕', '🌸', '🏥', '📞'];
    const sh = sheet(`<h3>رویداد جدید</h3><div class="small muted">${fullDate(k)}</div><label class="lbl">عنوان</label><input id="it-t" type="text" placeholder="مثلاً: کلاس طراحی">
      <label class="lbl">نشانه</label><div class="opts" data-opt="emoji">${emojis.map((e, i) => `<button type="button" class="${i ? '' : 'on'}" data-a="opt" data-v="${e}" style="font-size:20px;padding:2px 8px">${e}</button>`).join('')}</div>${foot()}`, () => {
      const t = $('#it-t', sh).value.trim(); if (!t) return toast('عنوان رو بنویس');
      const d = ensureDay(k); d.items = d.items || []; d.items.push({ id: uid(), text: t, emoji: optVal(sh, 'emoji') });
      save(); closeSheet(); rerender(); toast('ثبت شد');
    });
    setTimeout(() => $('#it-t', sh).focus(), 300);
  }
  function addExpense(id, k) {
    const x = id ? S.finance.expenses.find((e) => e.id === id) : null;
    const sh = sheet(`<h3>${x ? 'ویرایش هزینه' : 'هزینه جدید'}</h3><label class="lbl">مبلغ (تومان)</label><input id="ex-a" type="text" inputmode="numeric" value="${x ? sep(x.amount) : ''}" placeholder="۰" style="font-size:22px;font-weight:800;text-align:center" class="money">
      <label class="lbl">دسته</label>${opts('cat', S.finance.cats.map((c) => [c.id, c.name]), x ? x.cat : S.finance.cats[0].id)}
      <label class="lbl">توضیح</label><input id="ex-n" type="text" value="${esc(x ? x.note : '')}" placeholder="اختیاری">
      <label class="lbl">تاریخ</label>${dateFields(x ? x.date : k || todayKey())}${foot(!!x)}`, () => {
      const amount = num($('#ex-a', sh).value); if (!amount) return toast('مبلغ رو وارد کن');
      const data = { amount, cat: optVal(sh, 'cat'), note: $('#ex-n', sh).value.trim(), date: readDate(sh) };
      if (x) Object.assign(x, data); else S.finance.expenses.push({ id: uid(), ...data });
      save(); closeSheet(); rerender();
      const ym = data.date.slice(0, 7), c = catOf(data.cat);
      if (c.budget && spent(ym, c.id) > c.budget) toast(`هشدار: «${c.name}» از سقف بودجه رد شد`); else toast('هزینه ثبت شد');
    });
    sh._del = () => { S.finance.expenses = S.finance.expenses.filter((e) => e !== x); save(); closeSheet(); rerender(); };
    const a = $('#ex-a', sh); a.addEventListener('input', () => { const n = num(a.value); a.value = n ? sep(n) : ''; });
    if (!x) setTimeout(() => a.focus(), 300);
  }
  function editCat(id) {
    const c = id ? S.finance.cats.find((x) => x.id === id) : null;
    const sh = sheet(`<h3>${c ? 'دسته‌ی هزینه' : 'دسته‌ی جدید'}</h3><label class="lbl">نام</label><input id="c-n" type="text" value="${esc(c ? c.name : '')}">
      <label class="lbl">سقف بودجه ماهانه (تومان) — خالی یعنی بی‌سقف</label><input id="c-b" type="text" inputmode="numeric" value="${c && c.budget ? sep(c.budget) : ''}">
      <label class="lbl">رنگ</label>${colorOpts(c ? c.color : '#e9a3b0')}${foot(!!c)}`, () => {
      const name = $('#c-n', sh).value.trim(); if (!name) return toast('نام رو بنویس');
      const data = { name, budget: num($('#c-b', sh).value), color: optVal(sh, 'color') || '#e9a3b0' };
      if (c) Object.assign(c, data); else S.finance.cats.push({ id: uid(), ...data });
      save(); closeSheet(); rerender();
    });
    const b = $('#c-b', sh); b.addEventListener('input', () => { const n = num(b.value); b.value = n ? sep(n) : ''; });
    sh._del = () => { if (S.finance.expenses.some((e) => e.cat === c.id)) return toast('این دسته هزینه‌ی ثبت‌شده داره'); S.finance.cats = S.finance.cats.filter((x) => x !== c); save(); closeSheet(); rerender(); };
  }
  function editHabit(id) {
    const h = id ? S.habits.find((x) => x.id === id) : null;
    const sh = sheet(`<h3>${h ? 'ویرایش عادت' : 'عادت جدید'}</h3><label class="lbl">نام</label><input id="h-n" type="text" value="${esc(h ? h.name : '')}">
      <label class="lbl">هدف در هفته</label>${opts('per', [1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), fa(n)]), String(h ? h.perWeek : 3))}
      <label class="lbl">حوزه (برای پیشرفت ماهانه)</label>${opts('cat', D.progressCats.map((c) => [c.id, c.name]), h ? h.cat : 'health')}
      <label class="lbl">رنگ</label>${colorOpts(h ? h.color : '#e8a0a8')}${foot(!!h)}`, () => {
      const name = $('#h-n', sh).value.trim(); if (!name) return toast('نام رو بنویس');
      const data = { name, perWeek: +optVal(sh, 'per'), cat: optVal(sh, 'cat'), color: optVal(sh, 'color') || '#e8a0a8' };
      if (h) Object.assign(h, data); else S.habits.push({ id: uid(), ...data });
      save(); closeSheet(); rerender();
    });
    sh._del = () => { S.habits = S.habits.filter((x) => x !== h); save(); closeSheet(); rerender(); };
  }
  function addEvent(id) {
    const e = id ? S.events.find((x) => x.id === id) : null;
    const base = e && e.m ? key(e.y || todayJ().y, e.m, e.d || 1) : ui.view === 'month' ? ui.sel : todayKey();
    const sh = sheet(`<h3>${e ? 'ویرایش مناسبت' : 'مناسبت جدید'}</h3><label class="lbl">عنوان</label><input id="e-t" type="text" value="${esc(e ? e.title : '')}" placeholder="مثلاً: تولد مامان">
      <label class="lbl">نوع</label>${opts('kind', [['cake', '🎂 تولد'], ['heart', '💗 سالگرد'], ['gift', '🎁 هدیه'], ['star', '⭐ سایر']], e ? e.kind : 'cake')}
      <label class="lbl">تاریخ</label>${dateFields(base)}
      <label class="lbl">تکرار</label>${opts('rep', [['y', 'هر سال'], ['o', 'فقط همین سال']], e && e.y ? 'o' : 'y')}${foot(!!e)}`, () => {
      const t = $('#e-t', sh).value.trim(); if (!t) return toast('عنوان رو بنویس');
      const p = parse(readDate(sh));
      const data = { title: t, kind: optVal(sh, 'kind'), m: p.m, d: p.d, y: optVal(sh, 'rep') === 'o' ? p.y : undefined };
      if (e) Object.assign(e, data); else S.events.push({ id: uid(), ...data });
      save(); closeSheet(); rerender(); toast('مناسبت ثبت شد');
    });
    sh._del = () => { S.events = S.events.filter((x) => x !== e); save(); closeSheet(); rerender(); };
  }
  function editBook(id) {
    const b = id ? S.books.find((x) => x.id === id) : null;
    const sh = sheet(`<h3>${b ? 'ویرایش کتاب' : 'کتاب جدید'}</h3><label class="lbl">نام کتاب</label><input id="b-t" type="text" value="${esc(b ? b.title : '')}">
      <label class="lbl">نویسنده</label><input id="b-a" type="text" value="${esc(b ? b.author : '')}">
      <div class="row"><div class="grow"><label class="lbl">تعداد صفحات</label><input id="b-p" type="text" inputmode="numeric" value="${b && b.pages ? fa(b.pages) : ''}"></div><div class="grow"><label class="lbl">صفحه فعلی</label><input id="b-c" type="text" inputmode="numeric" value="${b && b.current ? fa(b.current) : ''}"></div></div>
      <label class="lbl">وضعیت</label>${opts('st', [['reading', 'در حال خواندن'], ['next', 'بعدی'], ['done', 'تمام‌شده']], b ? b.status : 'reading')}${foot(!!b)}`, () => {
      const title = $('#b-t', sh).value.trim(); if (!title) return toast('نام کتاب رو بنویس');
      const status = optVal(sh, 'st');
      const data = { title, author: $('#b-a', sh).value.trim(), pages: num($('#b-p', sh).value), current: num($('#b-c', sh).value), status };
      if (status === 'done' && (!b || b.status !== 'done')) data.doneAt = todayKey();
      if (b) Object.assign(b, data); else S.books.push({ id: uid(), ...data });
      save(); closeSheet(); rerender();
    });
    sh._del = () => { S.books = S.books.filter((x) => x !== b); save(); closeSheet(); rerender(); };
  }
  function editIdea(id) {
    const x = id ? S.ideas.find((i) => i.id === id) : null;
    let img = x ? x.img : null, newImg = null;
    const sh = sheet(`<h3>${x ? 'ایده' : 'ایده‌ی جدید'}</h3><div class="photo" style="border-radius:14px;overflow:hidden;margin:6px 0"><img id="i-im" src="${(img && IMG.url(img)) || 'photo.webp'}" style="${img ? '' : 'opacity:.35'}" alt=""><button class="btn" data-a="ideaPhoto">${ic('camera')} عکس</button></div>
      <label class="lbl">عنوان</label><input id="i-t" type="text" value="${esc(x ? x.title : '')}" placeholder="مثلاً: پیراهن کتان صورتی">
      <label class="lbl">توضیح، رنگ، پارچه…</label><textarea id="i-n" rows="3">${esc(x ? x.note : '')}</textarea>${foot(!!x)}`, async () => {
      const title = $('#i-t', sh).value.trim(); if (!title) return toast('عنوان رو بنویس');
      if (newImg) { if (img) IMG.del(img); img = 'idea-' + uid(); await IMG.put(img, newImg); }
      const data = { title, note: $('#i-n', sh).value.trim(), img };
      if (x) Object.assign(x, data); else S.ideas.push({ id: uid(), date: todayKey(), ...data });
      save(); closeSheet(); rerender();
    });
    sh._photo = async () => { const d = await pickImage(); if (d) { newImg = d; const im = $('#i-im', sh); im.src = d; im.style.opacity = 1; } };
    sh._del = () => { if (x.img) IMG.del(x.img); S.ideas = S.ideas.filter((i) => i !== x); save(); closeSheet(); rerender(); };
  }

  /* ---------- پشتیبان ---------- */
  async function exportData() {
    const imgs = {}, ids = [...Object.values(S.photos), ...S.ideas.map((i) => i.img)].filter(Boolean);
    for (const id of ids) { const v = await IMG.get(id); if (v) imgs[id] = v; }
    S.lastBackup = todayKey(); save();
    const blob = new Blob([JSON.stringify({ type: 'sogol-backup', exportedAt: new Date().toISOString(), state: S, images: imgs })], { type: 'application/json' });
    const name = `sogol-backup-${S.lastBackup}.json`;
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'پشتیبان سوگل' }); toast('فایل پشتیبان آماده شد'); rerender(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
    toast('فایل پشتیبان دانلود شد'); rerender();
  }
  async function importText(txt) {
    let o; try { o = JSON.parse(txt); } catch (e) { return toast('فایل معتبر نیست'); }
    if (o.type === 'sogol-backup' && o.state) {
      S = Object.assign(fresh(), o.state); S.started = true;
      for (const [id, v] of Object.entries(o.images || {})) await IMG.put(id, v);
      save(); toast('اطلاعات پشتیبان بازگردانی شد');
    } else if (o.type === 'sogol-preset') {
      if (o.profile) Object.assign(S.profile, o.profile);
      if (o.plan) {
        S.plan.start = o.plan.start || S.plan.start;
        if (o.plan.quarters) S.plan.quarters = o.plan.quarters;
        if (o.plan.periods) S.plan.periods = o.plan.periods.map((p) => ({ focus: p.focus || '', goals: (p.goals || []).map((g) => (Array.isArray(g) ? { text: g[0], cat: g[1], done: false } : { done: false, ...g })) }));
      }
      if (o.annualGoals) S.annualGoals = o.annualGoals;
      (o.events || []).forEach((e) => { const ex = S.events.find((x) => x.id === e.id); if (ex) Object.assign(ex, e); else S.events.push({ id: e.id || uid(), ...e }); });
      S.started = true; save(); toast('برنامه‌ی شخصی وارد شد 🌸');
    } else return toast('این فایل مربوط به سوگل نیست');
    closeSheet(); go('today');
  }
  function importFile() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json,text/plain';
    i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importText(r.result); r.readAsText(f); };
    i.click();
  }
  function importPaste() {
    const sh = sheet(`<h3>جای‌گذاری متن فایل</h3><div class="small muted">کل متن فایل پشتیبان یا فایل برنامه‌ی شخصی رو اینجا paste کن.</div><textarea id="imp" rows="8" dir="ltr" style="font-size:12px"></textarea>${foot()}`, () => importText($('#imp', sh).value));
  }

  /* ================= رویدادها ================= */
  const A = {
    go: (el) => { closeSheet(true); go(el.dataset.h); },
    month: (el) => { const n = addM(ui.y, ui.m, +el.dataset.n); ui.y = n.y; ui.m = n.m; ui.week = 0; ui.sel = key(n.y, n.m, Math.min(parse(ui.sel).d, J.monthLength(n.y, n.m))); const t = todayJ(); if (n.y === t.y && n.m === t.m) ui.sel = todayKey(); rerender(); },
    today: () => { const t = todayJ(); ui.y = t.y; ui.m = t.m; ui.sel = todayKey(); ui.week = 0; rerender(); },
    week: (el) => { ui.week += +el.dataset.n; rerender(); },
    selDay: (el) => { const k = el.dataset.k, p = parse(k); if (k === ui.sel) return openDay(k); ui.sel = k; ui.week = 0; if (p.m !== ui.m) { ui.y = p.y; ui.m = p.m; } rerender(); },
    openDay: (el) => openDay(el.dataset.k),
    jumpPeriod: (el) => { const r = periodRange(+el.dataset.i), p = parse(r.s); ui.y = p.y; ui.m = p.m; ui.sel = r.s; ui.week = 0; go('month'); },
    toggleHabit: (el) => {
      const k = el.dataset.k, id = el.dataset.h, arr = (S.habitLog[k] = S.habitLog[k] || []);
      const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id);
      if (!arr.length) delete S.habitLog[k];
      save();
      if (el.dataset.sheet) { el.classList.toggle('on'); el.querySelector('.ring').classList.toggle('on'); }
      rerender();
      if (i < 0 && navigator.vibrate) navigator.vibrate(8);
    },
    toggleGoal: (el) => { const g = S.plan.periods[+el.dataset.p].goals[+el.dataset.g]; g.done = !g.done; save(); rerender(); if (g.done) toast('آفرین! 🌸'); },
    addGoal: (el) => { const i = +el.dataset.p, t = $('#ng-' + i).value.trim(); if (!t) return; S.plan.periods[i].goals.push({ text: t, cat: $('#nc-' + i).value, done: false }); save(); location.hash = `/more/plan/${i}`; rerender(); },
    delGoal: (el) => { S.plan.periods[+el.dataset.p].goals.splice(+el.dataset.g, 1); save(); rerender(); },
    setStart: () => { const y = num($('#ps-y').value), m = +$('#ps-m').value, d = +$('#ps-d').value; if (y < 1300 || y > 1500) return toast('سال درست نیست'); S.plan.start = [y, m, d]; save(); rerender(); toast('تاریخ شروع ثبت شد'); },
    mood: (el) => { const d = ensureDay(el.dataset.k); d.mood = d.mood === el.dataset.v ? undefined : el.dataset.v; save(); $$(`[data-a="mood"][data-k="${el.dataset.k}"]`).forEach((b) => b.classList.toggle('on', b.dataset.v === d.mood)); if (!el.closest('.sheet')) rerender(); },
    addItem: (el) => addItem(el.dataset.k),
    delItem: (el) => { const d = ensureDay(el.dataset.k); d.items = (d.items || []).filter((x) => x.id !== el.dataset.id); save(); if (el.dataset.sheet) el.closest('.ev').remove(); rerender(); },
    addExpense: (el) => addExpense(el.dataset.id, el.dataset.k),
    editCat: (el) => editCat(el.dataset.id),
    editHabit: (el) => editHabit(el.dataset.id),
    addEvent: (el) => addEvent(el.dataset.id),
    editBook: (el) => editBook(el.dataset.id),
    bookPages: (el) => { const b = S.books.find((x) => x.id === el.dataset.id); b.current = Math.min(b.pages || 99999, (b.current || 0) + +el.dataset.n); if (b.pages && b.current >= b.pages) { b.status = 'done'; b.doneAt = todayKey(); toast('یه کتاب دیگه تموم شد! 🎉'); } save(); rerender(); },
    bookDone: (el) => { const b = S.books.find((x) => x.id === el.dataset.id); b.status = 'done'; b.doneAt = todayKey(); if (b.pages) b.current = b.pages; save(); rerender(); toast('تبریک! 🎉'); },
    addShop: () => { const t = $('#shop-new').value.trim(); if (!t) return; S.shopping.push({ id: uid(), text: t, done: false }); save(); rerender(); setTimeout(() => $('#shop-new') && $('#shop-new').focus(), 30); },
    toggleShop: (el) => { const s = S.shopping.find((x) => x.id === el.dataset.id); s.done = !s.done; save(); rerender(); },
    delShop: (el) => { S.shopping = S.shopping.filter((x) => x.id !== el.dataset.id); save(); rerender(); },
    clearShop: () => { S.shopping = S.shopping.filter((x) => !x.done); save(); rerender(); },
    editIdea: (el) => editIdea(el.dataset.id),
    ideaPhoto: (el) => { const sh = el.closest('.sheet'); sh && sh._photo && sh._photo(); },
    setPhoto: async (el) => { const d = await pickImage(); if (!d) return; const ym = el.dataset.ym, old = S.photos[ym]; if (old) IMG.del(old); const id = 'photo-' + ym + '-' + uid(); await IMG.put(id, d); S.photos[ym] = id; save(); rerender(); },
    delPhoto: (el) => { const ym = el.dataset.ym; IMG.del(S.photos[ym]); delete S.photos[ym]; save(); rerender(); },
    addAnnual: () => { S.annualGoals.push({ icon: 'star', title: 'هدف جدید', sub: '' }); save(); rerender(); },
    delAnnual: (el) => { S.annualGoals.splice(+el.dataset.i, 1); save(); rerender(); },
    print: () => { window.print(); },
    export: () => exportData(),
    importFile: () => importFile(),
    importPaste: () => importPaste(),
    startEmpty: () => { S.started = true; save(); go('today'); render(); },
    reset: () => {
      const sh = sheet(`<h3>پاک کردن همه‌چیز؟</h3><p class="small muted">این کار برگشت‌پذیر نیست. برای تأیید، کلمه‌ی <b>پاک</b> رو بنویس.</p><input id="rs" type="text">${foot()}`, () => {
        if ($('#rs', sh).value.trim() !== 'پاک') return toast('برای تأیید «پاک» رو بنویس');
        try { localStorage.removeItem(LS); indexedDB.deleteDatabase('sogol'); } catch (e) { }
        S = fresh(); IMG.cache = {}; closeSheet(); render();
      });
    },
    opt: (el) => { $$('button', el.parentElement).forEach((b) => b.classList.toggle('on', b === el)); },
    closeSheet: () => closeSheet(),
    sheetSave: () => sheetDone && sheetDone(),
    sheetDel: (el) => { const sh = el.closest('.sheet'); if (sh._del) sh._del(); }
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const f = A[el.dataset.a]; if (!f) return;
    e.preventDefault(); f(el, e);
  });
  const IN = {
    note: (el) => { const d = ensureDay(el.dataset.k); d.note = el.value; if (!d.note) delete d.note; },
    review: (el) => { const r = (S.reviews[el.dataset.ym] = S.reviews[el.dataset.ym] || {}); r[el.dataset.f] = el.value; },
    saving: (el) => { const n = num(el.value); el.value = n ? sep(n) : ''; const s = (S.finance.savings[el.dataset.ym] = S.finance.savings[el.dataset.ym] || {}); s[el.dataset.f] = n; },
    focus: (el) => { S.plan.periods[+el.dataset.p].focus = el.value; },
    qtitle: (el) => { S.plan.quarters[+el.dataset.q].title = el.value; },
    agTitle: (el) => { S.annualGoals[+el.dataset.i].title = el.value; },
    agSub: (el) => { S.annualGoals[+el.dataset.i].sub = el.value; },
    agIcon: (el) => { S.annualGoals[+el.dataset.i].icon = el.value; },
    meal: (el) => { const w = (S.meals[el.dataset.w] = S.meals[el.dataset.w] || {}); const d = (w[el.dataset.d] = w[el.dataset.d] || {}); d[el.dataset.f] = el.value; },
    profile: (el) => { S.profile[el.dataset.f] = el.value; }
  };
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-in]'); if (el && IN[el.dataset.in]) { IN[el.dataset.in](el); save(); } });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-in]'); if (el && el.tagName === 'SELECT' && IN[el.dataset.in]) { IN[el.dataset.in](el); save(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Enter' && e.target.id === 'shop-new') A.addShop();
    if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('ng-')) A.addGoal({ dataset: { p: e.target.id.slice(3) } });
  });

  /* بارگذاری اولیه تصاویر ذخیره‌شده */
  [...Object.values(S.photos), ...S.ideas.map((i) => i.img)].filter(Boolean).forEach((id) => IMG.get(id));

  /* تغییر روز وقتی اپ باز می‌ماند */
  let lastDay = todayKey();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && todayKey() !== lastDay) { lastDay = todayKey(); A.today(); } });

  window.addEventListener('hashchange', route);
  route();

  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.SOGOL_NO_SW) {
    try { navigator.serviceWorker.register('sw.js').catch(() => { }); } catch (e) { }
  }
  window.__sogol = { S: () => S, ui, periodRange, monthStats, importText };
})();
