'use strict';
/* تراز — منطق UI. محاسبات در calc.js (دست‌نخورده). ساخته‌شده روی AIhub Design System. بدون ?. و ?? (سازگار با WebView قدیمی) */
(function () {
var A = window.AIhub, C = window.Calc;
var $ = function (id) { return document.getElementById(id); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
var SET = Object.assign({ unit: 'toman' }, LS.get('taraz2-set', {}));
var saveSet = function () { LS.set('taraz2-set', { unit: SET.unit }); };

/* ---------- قالب‌بندی ---------- */
var LOC = 'fa-IR';
var fmt = function (x, d) { return isFinite(x) ? (+x).toLocaleString(LOC, { maximumFractionDigits: d || 0 }) : '—'; };
var nd = function (s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }).replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).replace(/٫/g, '.').replace(/[٬,،\s]/g, ''); };
var parse = function (v) { return parseFloat(nd(v)) || 0; };
var num = function (id) { return parse($(id).value); };
var UN = function () { return SET.unit === 'rial' ? 'ریال' : 'تومان'; };
var U = function (x) { return SET.unit === 'rial' ? x * 10 : x; };
var pct = function (x, d) { return (x < 0 ? '−' : '') + fmt(Math.abs(x) * 100, d == null ? 1 : d) + '٪'; };
var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
function words(x) {
  var a = Math.abs(x), s = x < 0 ? '−' : '';
  if (a >= 1e12) return s + fmt(a / 1e12, 2) + ' هزار میلیارد';
  if (a >= 1e9) return s + fmt(a / 1e9, 2) + ' میلیارد';
  if (a >= 1e6) return s + fmt(a / 1e6, 2) + ' میلیون';
  if (a >= 1e3) return s + fmt(a / 1e3, 1) + ' هزار';
  return s + fmt(a);
}
function scaleOf(v) {
  v = Math.abs(v);
  if (v >= 1e9) return { k: 1e9, w: 'میلیارد' };
  if (v >= 2e7) return { k: 1e6, w: 'میلیون' };
  if (v >= 2e4) return { k: 1e3, w: 'هزار' };
  return { k: 1, w: '' };
}
var unitOf = function (sc) { return (sc.w ? sc.w + ' ' : '') + UN(); };
var METHOD = { annuity: 'اقساط مساوی', principal: 'اصل مساوی', bullet: 'یک‌جا', gharz: 'قرض‌الحسنه' };
var toast = function (msg, o) { return A.toast(msg, o); };
var ico = function (n) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
var jFa = function (d) { return A.fa(C.fmtJ(d)); };
var r_ = function (l, v, c) { return '<div class="list__row ' + (c || '') + '"><span class="list__title">' + l + '</span><b>' + v + '</b></div>'; };
var kv = function (rows) { return '<div class="kv list">' + rows + '</div>'; };
var note = function (t, kind) { return '<div class="alert' + (kind ? ' alert--' + kind : '') + '">' + ico(kind === 'warning' || kind === 'danger' ? 'alert' : 'info') + '<span>' + t + '</span></div>'; };
var kpi = function (k, v, c) { return '<div class="card kpi ' + (c || '') + '"><div class="kpi__label">' + k + '</div><div class="kpi__value num">' + v + '</div></div>'; };
var money = function (x) { return fmt(x) + '<span class="kpi__unit">' + UN() + '</span>'; };
var later = (function () { var t; return function (fn, ms) { clearTimeout(t); t = setTimeout(fn, ms == null ? 70 : ms); }; })();
function safe(fn, errEl) {
  try { fn(); if (errEl) errEl.hidden = true; } catch (e) {
    if (window.console) console.error(e);
    if (errEl) { errEl.innerHTML = ico('alert') + '<span><b>مشکل:</b> محاسبه انجام نشد. <b>راه‌حل:</b> ورودی‌ها را بررسی کن؛ اگر ادامه داشت صفحه را بازخوانی کن.</span>'; errEl.hidden = false; }
  }
}
function setErr(id, msg) {
  var el = document.querySelector('[data-err-for="' + id + '"]'), inp = $(id);
  if (el) el.textContent = msg || '';
  if (inp) { if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
}
var cssv = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };

var CM = LS.get('taraz2-cm', null);
var LAST = null;

/* ---------- ورودی‌ها ---------- */
function moneyFormat(el) {
  var caret = el.selectionStart == null ? el.value.length : el.selectionStart;
  var before = nd(el.value.slice(0, caret)).replace(/\D/g, '').length;
  var iv = nd(el.value).replace(/[^\d.]/g, '').split('.')[0];
  el.value = iv ? (+iv).toLocaleString(LOC) : '';
  var cnt = 0, pos = 0, s = el.value;
  for (; pos < s.length && cnt < before; pos++) if (/[\d۰-۹]/.test(s[pos])) cnt++;
  try { el.setSelectionRange(pos, pos); } catch (e) {}
}
function hints() {
  $$('.field__hint[data-for]').forEach(function (h) { var v = num(h.dataset.for); h.textContent = v >= 1000 ? '≈ ' + words(v) + ' ' + UN() : ''; });
}
function paintUnits() {
  $$('.u').forEach(function (e) { e.textContent = UN(); });
  $$('[data-unit]').forEach(function (b) {
    var on = b.dataset.unit === SET.unit;
    if (b.getAttribute('role') === 'menuitemradio') b.setAttribute('aria-checked', String(on)); else b.setAttribute('aria-pressed', String(on));
  });
  $('unitLbl').textContent = UN();
}
$$('[data-seg]').forEach(function (g) {
  var inp = $(g.dataset.seg);
  var sync = function () { $$('button', g).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === inp.value)); }); };
  g.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; inp.value = b.dataset.v; sync(); inp.dispatchEvent(new Event('input', { bubbles: true })); });
  g._sync = sync;
});
var syncSegs = function () { $$('[data-seg]').forEach(function (g) { g._sync(); }); };

var NOKEEP = { fi: 1 };
var keepEls = function () { return $$('main input[id],main select[id]').filter(function (e) { return !NOKEEP[e.id] && e.type !== 'file'; }); };
var saveT;
function persist() { clearTimeout(saveT); saveT = setTimeout(function () { var o = {}; keepEls().forEach(function (e) { o[e.id] = e.value; }); LS.set('taraz2-in', o); }, 250); }
function restore() { var o = LS.get('taraz2-in', {}); keepEls().forEach(function (e) { if (o[e.id] != null) e.value = o[e.id]; }); }

/* ---------- ترازو ---------- */
function setBeam(theta, right, left) {
  var R = 130, a = (theta * Math.PI) / 180, cx = 180, cy = 62;
  $('bBeam').style.transform = 'rotate(' + theta + 'deg)';
  $('bR').style.transform = 'translate(' + (cx + R * Math.cos(a)) + 'px,' + (cy + R * Math.sin(a)) + 'px)';
  $('bL').style.transform = 'translate(' + (cx - R * Math.cos(a)) + 'px,' + (cy - R * Math.sin(a)) + 'px)';
  $('bRt').textContent = right; $('bLt').textContent = left;
}

/* ---------- وام ---------- */
function loanInputs() {
  return {
    P: num('lp'), rate: num('lr') / 100, n: Math.min(600, Math.round(num('lm'))), grace: Math.max(0, Math.min(120, Math.round(num('lg')))),
    method: $('lt').value, extra: num('lx'), lump: num('ly'), lumpAt: num('lk') || 12, lumpMode: $('lmo').value,
    feePct: num('lfee'), fixedFee: num('lfix'), inflation: num('linf') / 100
  };
}
var startDate = function () { return C.parseJ($('ld').value); };
var dateOf = function (k) { var s = startDate(); return s ? jFa(C.addMonths(s, k)) : ''; };
function setActions(on) { ['aSave', 'expBtn'].forEach(function (id) { $(id).disabled = !on; }); }

function renderLoan() {
  var o = loanInputs();
  $('lrl').textContent = o.method === 'gharz' ? 'نرخ کارمزد سالانه' : 'نرخ سود سالانه';
  var nRaw = num('lm');
  setErr('lm', o.P > 0 && (nRaw < 1 || nRaw > 600) ? 'مدت باید بین ۱ تا ۶۰۰ ماه باشد.' : '');
  setErr('lg', num('lg') > 120 ? 'تنفس حداکثر ۱۲۰ ماه است؛ عدد کمتری وارد کن.' : '');
  setErr('lr', num('lr') > 100 ? 'نرخ بیشتر از ۱۰۰٪ است؛ عدد را بررسی کن.' : '');
  $('loanSkel').hidden = true;
  if (!(o.P > 0 && o.n > 0)) {
    LAST = null; $('loanEmpty').hidden = false; $('loanRes').hidden = true; $('loanErr').hidden = true;
    setActions(false); renderTools(); renderDeposit(); return;
  }
  $('loanEmpty').hidden = true;
  var ok = true;
  safe(function () {
    var A_ = C.analyzeLoan(o); LAST = { o: o, A: A_ };
    var s = A_.sched;
    var head = { annuity: 'قسط ثابت ماهانه', principal: 'قسط اول (کاهشی)', bullet: 'پرداخت در سررسید', gharz: 'قسط اصل ماهانه' }[o.method];
    $('hK').textContent = head;
    $('hV').innerHTML = fmt(o.method === 'gharz' ? o.P / o.n : A_.payment) + '<small>' + UN() + '</small>';
    var heavy = A_.pv - A_.netIn;
    setBeam(Math.max(-16, Math.min(16, (-heavy / A_.netIn) * 55)), words(A_.netIn), words(A_.pv));
    var inflTxt = fmt(o.inflation * 100, 1) + '٪';
    $('hSay').className = 'hero__say ' + (heavy <= 0 ? 'is-good' : 'is-bad');
    $('hSay').innerHTML = ico(heavy <= 0 ? 'check' : 'alert') + '<span>' + (heavy <= 0
      ? 'با تورم ' + inflTxt + '، بازپرداخت‌ها به قیمت امروز <b>' + fmt(-heavy) + ' ' + UN() + '</b> کمتر از مبلغ دریافتی است. نرخ واقعی وام <b>' + pct(A_.realRate) + '</b>.'
      : 'با تورم ' + inflTxt + '، بازپرداخت‌ها به قیمت امروز <b>' + fmt(heavy) + ' ' + UN() + '</b> بیشتر از مبلغ دریافتی است. نرخ واقعی وام <b>' + pct(A_.realRate) + '</b>.') + '</span>';

    var hasFees = A_.fees > 0;
    $('loanKpis').innerHTML =
      kpi('مجموع سود' + (o.method === 'gharz' ? ' (کارمزد)' : ''), money(A_.totalInterest)) +
      kpi('مجموع بازپرداخت', money(A_.totalPaid)) +
      kpi('نرخ مؤثر سالانه', pct(A_.apr.effective), hasFees ? 'card--accent' : '') +
      kpi('مدت واقعی', fmt(s.months) + '<span class="kpi__unit">ماه</span>');

    var sc = scaleOf(o.P + A_.totalInterest + A_.fees), items = [{ label: 'اصل وام', value: o.P }, { label: 'سود', value: A_.totalInterest }];
    if (hasFees) items.push({ label: 'هزینه‌ها', value: A_.fees });
    A.charts.donut($('cDonut'), { items: items, scale: sc.k, centerLabel: unitOf(sc), label: 'سهم اصل، سود و هزینه‌ها از مبلغ کل' });
    var parts = '';
    if (hasFees) parts += r_('هزینه‌های جانبی', fmt(A_.fees) + ' ' + UN(), 'is-hl') + r_('دریافتی خالص', fmt(A_.netIn) + ' ' + UN());
    if (o.method === 'principal') parts += r_('آخرین قسط', fmt(s.rows[s.rows.length - 1].pay) + ' ' + UN());
    var pn = '';
    if (o.method === 'gharz') pn += note('فرض: کارمزد هر سال یک‌جا و روی مانده ابتدای همان سال گرفته می‌شود.');
    if (o.grace > 0 && (o.method === 'annuity' || o.method === 'principal')) pn += note('در ' + fmt(o.grace) + ' ماه اول فقط سود پرداخت می‌شود و بعد، اصل در ' + fmt(o.n) + ' ماه مستهلک می‌شود.');
    if (o.lump > 0) pn += note('پرداخت یک‌جا در ستون پرداخت جدول نیامده؛ فقط روی مانده اثر دارد.');
    $('loanParts').innerHTML = (parts ? '<div class="stack" style="--stack:var(--sp-3);margin-block-start:var(--sp-4)">' + kv(parts) + '</div>' : '') + (pn ? '<div class="stack" style="--stack:var(--sp-3);margin-block-start:var(--sp-3)">' + pn + '</div>' : '');

    var ex = $('loanExtra');
    if ((o.extra > 0 || o.lump > 0) && o.method !== 'bullet') {
      var xr = r_('پایان وام', fmt(s.months) + ' ماه به‌جای ' + fmt(A_.base.months), 'is-hl') + r_('سود صرفه‌جویی‌شده', fmt(A_.saved) + ' ' + UN());
      var e0 = s.rows.find(function (v) { return v.lump; });
      if (o.lump > 0 && o.lumpMode === 'pay' && e0 && s.rows[e0.k]) xr += r_('قسط جدید بعد از پرداخت یک‌جا', fmt(s.rows[e0.k].pay) + ' ' + UN());
      else if (A_.monthsSaved > 0) xr += r_('زودتر آزاد می‌شوی', fmt(A_.monthsSaved) + ' ماه');
      ex.innerHTML = '<div class="card__head"><h3>اثر پرداخت اضافه</h3></div>' + kv(xr) + '<div style="margin-block-start:var(--sp-3)">' + note('فقط وقتی درست است که قرارداد پرداخت یا تسویه زودتر را بدون جریمه و با کاهش سود اجازه دهد.', 'warning') + '</div>';
      ex.hidden = false;
    } else ex.hidden = true;

    var inc = num('linc'), af = $('loanAff');
    if (inc > 0) {
      var peak = Math.max.apply(null, s.rows.map(function (v) { return v.pay; })), dd = (peak / inc) * 100;
      var cls = dd <= 30 ? 'success' : dd <= 40 ? 'warning' : 'danger', tx = dd <= 30 ? 'در محدوده معمول' : dd <= 40 ? 'نیازمند احتیاط' : 'فشار سنگین بر بودجه';
      af.innerHTML = '<div class="card__head"><h3>توان بازپرداخت</h3><span class="badge badge--' + cls + '">' + tx + '</span></div>' +
        '<div class="row" style="justify-content:space-between;margin-block-end:var(--sp-2)"><span class="muted">' + (o.method === 'principal' ? 'بیشترین قسط از درآمد' : 'قسط از درآمد') + '</span><b class="num">' + fmt(dd) + '٪</b></div>' +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, Math.round(dd)) + '" style="--value:' + Math.min(100, dd).toFixed(1) + '%"><i></i></div>' +
        '<p class="muted" style="margin:var(--sp-3) 0 0">آستانه ۳۰ و ۴۰ درصد معیار تقریبی عمومی است، نه قانون بانک.</p>';
      af.hidden = false;
    } else af.hidden = true;

    /* نمودارها */
    var rows = s.rows, n = rows.length, g = n > 36 ? 12 : 1, labels = [], P = [], T = [], B = [];
    for (var i = 0; i < n; i += g) {
      var q = rows.slice(i, i + g);
      labels.push(g > 1 ? 'سال ' + A.fa(i / g + 1) : A.fa(rows[i].k));
      P.push(q.reduce(function (t, v) { return t + v.principal + (v.lump || 0); }, 0));
      T.push(q.reduce(function (t, v) { return t + v.interest; }, 0));
      B.push(q[q.length - 1].balance);
    }
    var mxb = Math.max.apply(null, P.map(function (v, k) { return Math.max(v, T[k]); })), sc2 = scaleOf(mxb * 4), sc3 = scaleOf(o.P);
    A.charts.bar($('cBars'), { labels: labels, series: [{ name: 'اصل', values: P }, { name: 'سود', values: T }], scale: sc2.k, unit: unitOf(sc2), label: 'اصل و سود هر دوره', height: 240 });
    A.charts.line($('cBal'), { labels: labels, series: [{ name: 'مانده وام', values: B }], scale: sc3.k, unit: unitOf(sc3), label: 'مانده وام در هر دوره', height: 240 });

    /* جدول */
    var body = $('schedBody'), st = startDate(), frag = document.createDocumentFragment();
    $$('tr:not([data-empty-row])', body).forEach(function (r) { r.parentNode.removeChild(r); });
    rows.forEach(function (v) {
      var tr = document.createElement('tr'), dtv = st ? C.fmtJ(C.addMonths(st, v.k)) : '';
      tr.innerHTML = '<td class="dt__title" data-label="ماه" data-value="' + v.k + '">' + fmt(v.k) + '</td><td data-label="تاریخ" data-value="' + dtv + '">' + (st ? dateOf(v.k) : '—') + '</td>' +
        '<td class="num-col" data-label="پرداخت" data-value="' + Math.round(v.pay) + '">' + fmt(v.pay) + '</td><td class="num-col" data-label="اصل" data-value="' + Math.round(v.principal) + '">' + fmt(v.principal) + '</td>' +
        '<td class="num-col" data-label="سود" data-value="' + Math.round(v.interest) + '">' + fmt(v.interest) + '</td><td class="num-col" data-label="مانده" data-value="' + Math.round(v.balance) + '">' + fmt(v.balance) + '</td>';
      frag.appendChild(tr);
    });
    body.insertBefore(frag, body.querySelector('[data-empty-row]'));
    A.table.init($('schedDt')).refresh();
  }, $('loanErr'));
  if ($('loanErr').hidden === false) ok = false;
  $('loanRes').hidden = !ok; setActions(ok);
  renderTools(); renderDeposit();
}

/* ---------- ابزارها ---------- */
function renderTools() {
  var L = LAST, e = $('eOut'), p = $('pOut'), r1 = $('rvOut1'), r2 = $('rvOut2');
  if (!L) { e.innerHTML = note('اول در بخش «محاسبه وام» مبلغ و مدت را وارد کن.'); p.innerHTML = e.innerHTML; } else {
    var k = Math.round(num('ek')), rows = L.A.sched.rows;
    setErr('ek', '');
    if (L.o.method === 'bullet') e.innerHTML = note('برای وام یک‌جا، تسویه زودتر فقط سود دوره کمتر را کم می‌کند.');
    else if (k >= 1 && k < rows.length) {
      var x = C.earlyPayoff(rows, k, num('epen'));
      e.innerHTML = kv(r_('مبلغ تسویه همین حالا', fmt(x.payNow) + ' ' + UN()) + r_('سود باقی‌مانده که نمی‌دهی', fmt(x.interestSaved) + ' ' + UN(), 'is-hl') + (x.penalty > 0 ? r_('جریمه تسویه', fmt(x.penalty) + ' ' + UN(), 'is-bad') : '') + r_('صرفه‌جویی خالص', (x.net < 0 ? '−' : '') + fmt(Math.abs(x.net)) + ' ' + UN(), x.net >= 0 ? '' : 'is-bad'));
    } else e.innerHTML = note('شماره قسط باید بین ۱ و ' + fmt(rows.length - 1) + ' باشد.', 'warning');
    var q = C.latePenalty(L.A.payment, num('ldays'), num('lpen'));
    p.innerHTML = kv(r_('جریمه تقریبی یک قسط', fmt(q) + ' ' + UN(), 'is-bad') + r_('قسط به‌همراه جریمه', fmt(L.A.payment + q) + ' ' + UN()));
  }
  var o = L ? L.o : { rate: num('lr') / 100, n: Math.round(num('lm')) }, pay = num('rvPay');
  if (pay > 0 && o.n > 0) {
    var h = r_('حداکثر مبلغ وام', fmt(C.maxLoan(pay, o.rate, o.n)) + ' ' + UN(), 'is-hl'), inc = num('linc');
    if (inc > 0) h += r_('با سقف ۴۰٪ درآمد (فرض)', fmt(C.maxLoan(inc * 0.4, o.rate, o.n)) + ' ' + UN());
    r1.innerHTML = kv(h) + '<p class="muted" style="margin:var(--sp-2) 0 0">با نرخ ' + fmt(o.rate * 100, 1) + '٪ و ' + fmt(o.n) + ' ماه از بخش اصلی.</p>';
  } else r1.innerHTML = '';
  var P = num('rvP'), Q = num('rvQ'), N = Math.round(num('rvN'));
  if (P > 0 && Q > 0 && N > 0) {
    var r = C.rateFromPayment(P, Q, N);
    r2.innerHTML = kv(r_('نرخ واقعی سالانه', pct(r), 'is-hl') + r_('نرخ مؤثر (با سود مرکب ماهانه)', pct(Math.pow(1 + r / 12, 12) - 1)) + r_('مجموع بازپرداخت', fmt(Q * N) + ' ' + UN()));
  } else r2.innerHTML = '';
}

/* ---------- خروجی‌ها ---------- */
function download(name, blob) { var a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(blob); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
function exportCsv() {
  if (!LAST) return;
  var s = startDate(), t = '﻿' + ['شماره', s ? 'تاریخ' : null, 'پرداخت', 'اصل', 'سود', 'مانده'].filter(Boolean).join(',') + '\n';
  LAST.A.sched.rows.forEach(function (v) { t += [v.k, s ? C.fmtJ(C.addMonths(s, v.k)) : null, Math.round(v.pay), Math.round(v.principal), Math.round(v.interest), Math.round(v.balance)].filter(function (x) { return x !== null; }).join(',') + '\n'; });
  download('taraz-schedule.csv', new Blob([t], { type: 'text/csv;charset=utf-8' })); toast('فایل CSV ذخیره شد', { kind: 'success' });
}
function chartSvg() {
  var A_ = LAST.A, rows = A_.sched.rows, n = rows.length, g = n > 36 ? 12 : 1, B = [];
  for (var i = 0; i < n; i += g) { var q = rows.slice(i, i + g); B.push({ p: q.reduce(function (t, v) { return t + v.principal + (v.lump || 0); }, 0), t: q.reduce(function (t, v) { return t + v.interest; }, 0) }); }
  var W = 600, H = 330, pl = 14, top = 84, ch = H - top - 40, bw = (W - 2 * pl) / B.length, mx = Math.max.apply(null, B.map(function (v) { return v.p + v.t; })) || 1;
  var c = { bg: cssv('--white'), t1: cssv('--ink-900'), t2: cssv('--ink-600'), a: cssv('--brand-600'), b: cssv('--accent-600'), l: cssv('--ink-200') };
  var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="Vazirmatn,Tahoma,sans-serif"><rect width="' + W + '" height="' + H + '" fill="' + c.bg + '"/>' +
    '<text x="' + (W - pl) + '" y="30" text-anchor="end" font-size="18" font-weight="700" fill="' + c.t1 + '">تراز — وام ' + fmt(LAST.o.P) + ' ' + UN() + '</text>' +
    '<text x="' + (W - pl) + '" y="56" text-anchor="end" font-size="13" fill="' + c.t2 + '">قسط ' + fmt(A_.payment) + ' | ' + fmt(n) + ' ماه | سود کل ' + fmt(A_.totalInterest) + '</text>' +
    '<line x1="' + pl + '" x2="' + (W - pl) + '" y1="' + (top + ch) + '" y2="' + (top + ch) + '" stroke="' + c.l + '"/>';
  B.forEach(function (v, i) {
    var x = W - pl - (i + 1) * bw, hp = (v.p / mx) * ch, ht = (v.t / mx) * ch;
    s += '<rect x="' + (x + 1) + '" y="' + (top + ch - hp) + '" width="' + Math.max(1, bw - 2) + '" height="' + hp + '" fill="' + c.a + '" rx="1.5"/><rect x="' + (x + 1) + '" y="' + (top + ch - hp - ht) + '" width="' + Math.max(1, bw - 2) + '" height="' + ht + '" fill="' + c.b + '" rx="1.5"/>';
  });
  s += '<g font-size="12" fill="' + c.t2 + '"><rect x="' + (W - pl - 10) + '" y="' + (H - 24) + '" width="10" height="10" fill="' + c.a + '" rx="2"/><text x="' + (W - pl - 16) + '" y="' + (H - 15) + '" text-anchor="end">اصل</text><rect x="' + (W - pl - 70) + '" y="' + (H - 24) + '" width="10" height="10" fill="' + c.b + '" rx="2"/><text x="' + (W - pl - 76) + '" y="' + (H - 15) + '" text-anchor="end">سود</text><text x="' + pl + '" y="' + (H - 15) + '">' + (g > 1 ? 'هر ستون یک سال' : 'هر ستون یک ماه') + '</text></g></svg>';
  return { svg: s, bg: c.bg };
}
function exportPng() {
  if (!LAST) return;
  var r = chartSvg(), im = new Image(), cv = document.createElement('canvas'); cv.width = 1200; cv.height = 660;
  im.onload = function () { var x = cv.getContext('2d'); x.fillStyle = r.bg; x.fillRect(0, 0, 1200, 660); x.drawImage(im, 0, 0, 1200, 660); cv.toBlob(function (b) { download('taraz-loan.png', b); toast('تصویر ذخیره شد', { kind: 'success' }); }); };
  im.onerror = function () { toast('ساخت تصویر ناموفق بود؛ دوباره امتحان کن', { kind: 'error' }); };
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg);
}
function summaryText() {
  var o = LAST.o, A_ = LAST.A;
  return 'تراز | ' + METHOD[o.method] + '\nمبلغ: ' + fmt(o.P) + ' ' + UN() + '\nنرخ: ' + fmt(o.rate * 100, 1) + '٪ | مدت: ' + fmt(A_.sched.months) + ' ماه\nقسط: ' + fmt(A_.payment) + ' ' + UN() + '\nسود کل: ' + fmt(A_.totalInterest) + ' ' + UN() + '\nنرخ مؤثر سالانه: ' + pct(A_.apr.effective) + '\nنرخ واقعی پس از تورم ' + fmt(o.inflation * 100, 0) + '٪: ' + pct(A_.realRate);
}
function shareSummary() {
  if (!LAST) return; var t = summaryText();
  if (navigator.share) navigator.share({ text: t }).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('خلاصه کپی شد', { kind: 'success' }); }, function () { toast('کپی نشد؛ مرورگر اجازه نداد', { kind: 'error' }); });
  else toast('اشتراک‌گذاری در این مرورگر پشتیبانی نمی‌شود', { kind: 'error' });
}
function exportPdf() {
  if (!LAST) return; var o = LAST.o, A_ = LAST.A, s = startDate(), rows = A_.sched.rows;
  $('report').innerHTML = '<h1>گزارش وام — تراز</h1><div class="fine">' + METHOD[o.method] + (s ? ' | تاریخ دریافت ' + jFa(s) : '') + '</div>' +
    '<div class="kv2"><div><span>مبلغ وام</span><b>' + fmt(o.P) + ' ' + UN() + '</b></div><div><span>نرخ سالانه</span><b>' + fmt(o.rate * 100, 1) + '٪</b></div><div><span>مدت</span><b>' + fmt(rows.length) + ' ماه</b></div><div><span>قسط</span><b>' + fmt(A_.payment) + ' ' + UN() + '</b></div>' +
    '<div><span>مجموع سود</span><b>' + fmt(A_.totalInterest) + ' ' + UN() + '</b></div><div><span>هزینه‌های جانبی</span><b>' + fmt(A_.fees) + ' ' + UN() + '</b></div><div><span>نرخ مؤثر سالانه</span><b>' + pct(A_.apr.effective) + '</b></div><div><span>نرخ واقعی پس از تورم ' + fmt(o.inflation * 100, 0) + '٪</span><b>' + pct(A_.realRate) + '</b></div></div>' +
    '<table><tr><th>ماه</th>' + (s ? '<th>تاریخ</th>' : '') + '<th>پرداخت</th><th>اصل</th><th>سود</th><th>مانده</th></tr>' + rows.map(function (v) { return '<tr><td>' + fmt(v.k) + '</td>' + (s ? '<td>' + dateOf(v.k) + '</td>' : '') + '<td>' + fmt(v.pay) + '</td><td>' + fmt(v.principal) + '</td><td>' + fmt(v.interest) + '</td><td>' + fmt(v.balance) + '</td></tr>'; }).join('') + '</table>' +
    '<p class="fine">محاسبه تقریبی است؛ مبنای نهایی قرارداد و آیین‌نامه بانک است.</p>';
  document.body.classList.add('pr'); window.print();
}
addEventListener('afterprint', function () { document.body.classList.remove('pr'); });

/* ---------- مقایسه وام‌ها ---------- */
var defCM = function () { return [{ n: 'وام الف', P: U(100e6), r: 23, m: 24, t: 'annuity', g: 0, fee: 0, fix: 0 }, { n: 'وام ب', P: U(100e6), r: 18, m: 24, t: 'annuity', g: 0, fee: 2, fix: U(1e6) }]; };
function saveCM() { LS.set('taraz2-cm', CM); regCmds(); }
function addToCompare(o, name) {
  if (CM.length >= 4) { toast('حداکثر ۴ وام قابل مقایسه است. یکی را حذف کن.', { kind: 'error' }); return; }
  CM.push({ n: name, P: o.P, r: +(o.rate * 100).toFixed(2), m: o.n, t: o.method, g: o.grace, fee: o.feePct, fix: o.fixedFee });
  saveCM(); renderCmpCards(); renderCmpOut(); toast('به مقایسه اضافه شد', { kind: 'success', action: { label: 'ببین', onClick: function () { location.hash = '#compare'; } } });
}
function saveLoan() { if (!LAST) { toast('اول مبلغ و مدت وام را وارد کن'); return; } addToCompare(LAST.o, 'وام ' + (CM.length + 1)); }
function renderCmpCards() {
  $('cCards').innerHTML = CM.map(function (c, i) {
    return '<div class="card ccard" data-ci="' + i + '"><div class="ccard__head"><input class="input ccard__name" data-f="n" value="' + esc(c.n) + '" aria-label="نام وام"><button type="button" class="btn btn--ghost btn--icon" data-del="' + i + '" aria-label="حذف ' + esc(c.n) + '"' + (CM.length < 3 ? ' disabled' : '') + '>' + ico('trash') + '</button></div>' +
    '<div class="fgrid"><label class="field fgrid__w"><span class="field__label">مبلغ</span><span class="fx"><input class="input m" data-f="P" inputmode="numeric" value="' + (c.P ? Math.round(c.P).toLocaleString(LOC) : '') + '"><span class="fx__suf u">' + UN() + '</span></span></label>' +
    '<label class="field"><span class="field__label">نرخ سالانه</span><span class="fx"><input class="input p" data-f="r" inputmode="decimal" value="' + c.r + '"><span class="fx__suf">٪</span></span></label>' +
    '<label class="field"><span class="field__label">مدت</span><span class="fx"><input class="input t" data-f="m" inputmode="numeric" value="' + c.m + '"><span class="fx__suf">ماه</span></span></label>' +
    '<label class="field fgrid__w"><span class="field__label">روش</span><select class="select" data-f="t">' + Object.keys(METHOD).map(function (k) { return '<option value="' + k + '"' + (k === c.t ? ' selected' : '') + '>' + METHOD[k] + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span class="field__label">تنفس</span><span class="fx"><input class="input t" data-f="g" inputmode="numeric" value="' + (c.g || 0) + '"><span class="fx__suf">ماه</span></span></label>' +
    '<label class="field"><span class="field__label">کارمزد صدور</span><span class="fx"><input class="input p" data-f="fee" inputmode="decimal" value="' + (c.fee || 0) + '"><span class="fx__suf">٪</span></span></label>' +
    '<label class="field fgrid__w"><span class="field__label">هزینه ثابت (بیمه، تمبر)</span><span class="fx"><input class="input m" data-f="fix" inputmode="numeric" value="' + (c.fix ? Math.round(c.fix).toLocaleString(LOC) : '') + '"><span class="fx__suf u">' + UN() + '</span></span></label></div></div>';
  }).join('');
  $('cAdd').disabled = CM.length >= 4;
}
function renderCmpOut() {
  var inf = num('cinf') / 100;
  var R = CM.map(function (c) { return { c: c, A: c.P > 0 && c.m > 0 ? C.analyzeLoan({ P: c.P, rate: c.r / 100, n: Math.min(600, Math.round(c.m)), grace: c.g, method: c.t, feePct: c.fee, fixedFee: c.fix, inflation: inf }) : null }; });
  var ok = R.filter(function (x) { return x.A; });
  if (ok.length < 2) { $('cEmpty').hidden = false; $('cRes').hidden = true; return; }
  $('cEmpty').hidden = true; $('cRes').hidden = false;
  var rowsDef = [
    ['قسط ماهانه', function (a) { return a.payment; }, function (f) { return fmt(f); }, 1], ['مدت واقعی (ماه)', function (a) { return a.sched.months; }, function (f) { return fmt(f); }, 0],
    ['مجموع سود', function (a) { return a.totalInterest; }, function (f) { return fmt(f); }, 1], ['کارمزد و هزینه‌ها', function (a) { return a.fees; }, function (f) { return fmt(f); }, 1],
    ['هزینه کل (سود + هزینه‌ها)', function (a) { return a.totalCost; }, function (f) { return fmt(f); }, 1], ['نرخ مؤثر سالانه', function (a) { return a.apr.effective; }, function (f) { return pct(f); }, 1],
    ['بازپرداخت به قیمت امروز', function (a) { return a.pv; }, function (f) { return fmt(f); }, 0], ['هزینه واقعی پس از تورم', function (a) { return a.realCost; }, function (f) { return (f < 0 ? '−' : '') + fmt(Math.abs(f)); }, 1],
    ['نرخ واقعی پس از تورم', function (a) { return a.realRate; }, function (f) { return pct(f); }, 1]
  ];
  var best = function (fn, flag) {
    if (!flag) return -1; var v = ok.map(function (x) { return fn(x.A); }), m = Math.min.apply(null, v);
    return v.filter(function (x) { return Math.abs(x - m) < 1e-9; }).length === v.length ? -1 : R.findIndex(function (x) { return x.A && Math.abs(fn(x.A) - m) < 1e-9; });
  };
  var pick = function (key) { return ok.reduce(function (a, b) { return key(b.A) < key(a.A) ? b : a; }); };
  var byCost = pick(function (a) { return a.totalCost; }), byReal = pick(function (a) { return a.realCost; }), byApr = pick(function (a) { return a.apr.effective; });
  $('cHero').innerHTML = '<div><div class="hero__k">کم‌هزینه‌ترین پس از احتساب کارمزد</div><div class="hero__v">' + esc(byCost.c.n) + '</div></div>' +
    '<div class="hero__say is-good">' + ico('check') + '<span>هزینه کل <b>' + fmt(byCost.A.totalCost) + ' ' + UN() + '</b>، نرخ مؤثر <b>' + pct(byCost.A.apr.effective) + '</b>' +
    (byReal !== byCost ? '. با تورم ' + fmt(inf * 100, 0) + '٪، «' + esc(byReal.c.n) + '» برایت بهتر می‌ماند' : '') + (byApr !== byCost ? '. کمترین نرخ مؤثر: «' + esc(byApr.c.n) + '»' : '') + '.</span></div>';
  $('cTable').innerHTML = '<thead><tr><th></th>' + R.map(function (x) { return '<th class="num-col">' + esc(x.c.n) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rowsDef.map(function (d) { var b = best(d[1], d[3]); return '<tr><td>' + d[0] + '</td>' + R.map(function (x, i) { return '<td class="num-col' + (i === b ? ' is-best' : '') + '">' + (i === b ? ico('check') + '<span class="sr-only">بهترین: </span>' : '') + (x.A ? d[2](d[1](x.A)) : '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
  var mxv = Math.max.apply(null, ok.map(function (x) { return Math.max(x.A.totalInterest, x.A.fees); })), sc = scaleOf(mxv * 5);
  A.charts.bar($('cmChart'), { labels: ok.map(function (x) { return x.c.n; }), series: [{ name: 'سود', values: ok.map(function (x) { return x.A.totalInterest; }) }, { name: 'کارمزد و هزینه‌ها', values: ok.map(function (x) { return x.A.fees; }) }], scale: sc.k, unit: unitOf(sc), label: 'سود و هزینه‌های هر وام', height: 240 });
}

/* ---------- وام یا سرمایه‌گذاری ---------- */
function renderAssets() {
  var P = num('aP'), n = Math.max(1, Math.round(num('aN'))), y = n / 12, inf = num('aI') / 100, rd = num('aD') / 100, g = num('aG') / 100, gs = num('aGs') / 100, u = num('aU') / 100, us = num('aUs') / 100, L = num('aL'), rl = num('aLr') / 100;
  if (!P) { $('aEmpty').hidden = false; $('aRes').hidden = true; return; }
  $('aEmpty').hidden = true; $('aRes').hidden = false;
  var erosion = P * (Math.pow(1 + inf, y) - 1);
  var gain = function (B, k) { return k === 'd' ? B * rd * y : k === 'g' ? B * Math.pow(1 + g, y) * (1 - gs) - B : B * Math.pow(1 + u, y) * (1 - us) - B; };
  var S = [{ t: 'سپرده بانکی', n: gain(P, 'd'), real: gain(P, 'd') - erosion, d: 'سود ساده، بدون ریسک بازار' }, { t: 'خرید طلا', n: gain(P, 'g'), real: gain(P, 'g') - erosion, d: 'با کسر اختلاف خرید و فروش' }, { t: 'خرید دلار', n: gain(P, 'u'), real: gain(P, 'u') - erosion, d: 'با کسر اختلاف خرید و فروش' }];
  if (L > 0) {
    var k = $('aLa').value, intr = C.schedule({ P: L, rate: rl, n: n, method: 'annuity' }).totalInterest, gn = gain(L, k);
    S.push({ t: 'وام و سرمایه‌گذاری در ' + { g: 'طلا', u: 'دلار', d: 'سپرده' }[k], n: gn - intr, real: gn - intr, d: 'سود دارایی منهای ' + fmt(intr) + ' ' + UN() + ' سود وام؛ سرمایه شخصی درگیر نیست' });
  }
  S.sort(function (a, b) { return b.real - a.real; });
  var best = S[0], mx = Math.max.apply(null, S.map(function (s) { return Math.abs(s.real); })) || 1, bad = best.real <= 0;
  $('aHero').innerHTML = '<div><div class="hero__k">' + (bad ? 'هیچ گزینه‌ای از تورم جلو نمی‌زند؛ کم‌زیان‌ترین' : 'بهترین گزینه با فرض‌های تو') + '</div><div class="hero__v">' + best.t + '</div></div>' +
    '<div class="hero__say ' + (bad ? 'is-bad' : 'is-good') + '">' + ico(bad ? 'alert' : 'check') + '<span>سود واقعی پس از تورم، در ' + fmt(n) + ' ماه: <b>' + (best.real < 0 ? '−' : '') + fmt(Math.abs(best.real)) + ' ' + UN() + '</b></span></div>';
  var h = '<div class="card__head"><h3>سود واقعی هر گزینه</h3></div><p class="muted card__sub">میله به راست یعنی سود، به چپ یعنی زیان نسبت به تورم.</p>';
  S.forEach(function (s) {
    var pos = s.real >= 0;
    h += '<div class="dbar"><div class="dbar__h"><span>' + s.t + ' <span class="badge badge--' + (pos ? 'success' : 'danger') + '">' + (pos ? 'سود' : 'زیان') + '</span></span><b>' + (pos ? '+' : '−') + fmt(Math.abs(s.real)) + '</b></div><div class="dbar__t" aria-hidden="true"><i class="' + (pos ? 'p' : 'n') + '" style="width:' + (Math.abs(s.real) / mx) * 50 + '%"></i></div><div class="dbar__d">اسمی: ' + (s.n < 0 ? '−' : '') + fmt(Math.abs(s.n)) + ' — ' + s.d + '</div></div>';
  });
  h += '<p class="muted" style="margin:var(--sp-4) 0 0">فرسایش تورم روی سرمایه: ' + fmt(erosion) + ' ' + UN() + '. نتیجه فقط به فرض‌های واردشده بستگی دارد.</p>';
  $('aBars').innerHTML = h;
}

/* ---------- سپرده ---------- */
function renderDeposit() {
  var P = num('dA'), n = Math.min(600, Math.max(1, Math.round(num('dn')))), r = num('dr') / 100, inf = num('dinf') / 100, mode = $('dm').value, days = +$('dd').value;
  if (!P) { $('depEmpty').hidden = false; $('depRes').hidden = true; return; }
  $('depEmpty').hidden = true; $('depRes').hidden = false;
  var D = C.deposit(P, r, n, { compound: mode === 'compound', payout: mode === 'payout', days: days }), y = n / 12;
  var need = P * Math.pow(1 + inf, y), realGain = D.final - need, yld = Math.pow(D.final / P, 1 / y) - 1, realRate = (1 + yld) / (1 + inf) - 1;
  $('depHero').innerHTML = '<div><div class="hero__k">ارزش سپرده پس از ' + fmt(n) + ' ماه</div><div class="hero__v num">' + fmt(D.final) + '<small>' + UN() + '</small></div></div>' +
    '<div class="hero__say ' + (realGain >= 0 ? 'is-good' : 'is-bad') + '">' + ico(realGain >= 0 ? 'check' : 'alert') + '<span>' + (realGain >= 0 ? 'از تورم جلو می‌زند' : 'از تورم عقب می‌ماند') + ': <b>' + fmt(Math.abs(realGain)) + ' ' + UN() + '</b> ' + (realGain >= 0 ? 'سود واقعی' : 'کاهش قدرت خرید') + ' (نرخ واقعی ' + pct(realRate) + ')</span></div>';
  $('depKpis').innerHTML = kpi('سود ماهانه', money(D.monthly)) + kpi('مجموع سود', money(D.interest)) + kpi('بازده سالانه مؤثر', pct(yld), yld > inf ? '' : 'card--accent');
  var step = Math.max(1, Math.ceil(n / 48)), idx = [], k;
  for (k = 0; k <= n; k += step) idx.push(k);
  if (idx[idx.length - 1] !== n) idx.push(n);
  var sc = scaleOf(Math.max(D.final, need));
  A.charts.line($('depChart'), { labels: idx.map(function (i) { return A.fa(i); }), series: [{ name: 'ارزش سپرده', values: idx.map(function (i) { return D.series[i]; }) }, { name: 'مبلغ لازم برای هم‌پای تورم ماندن', values: idx.map(function (i) { return P * Math.pow(1 + inf, i / 12); }) }], scale: sc.k, unit: unitOf(sc), label: 'رشد سپرده در برابر تورم (محور افقی: ماه)', height: 240 });
  var dl = $('depLoan');
  if (LAST) {
    var D2 = C.deposit(LAST.o.P, r, LAST.A.sched.months, { compound: mode === 'compound', payout: mode === 'payout', days: days }), net = D2.interest - LAST.A.totalCost;
    dl.innerHTML = '<div class="card__head"><h3>اگر پول وام را در این سپرده بگذاری</h3></div><p class="muted card__sub">وام ' + fmt(LAST.o.P) + ' ' + UN() + ' از بخش «وام»</p>' +
      kv(r_('سود سپرده', fmt(D2.interest) + ' ' + UN()) + r_('هزینه وام (سود و کارمزد)', fmt(LAST.A.totalCost) + ' ' + UN(), 'is-hl') + r_('خالص', (net < 0 ? '−' : '') + fmt(Math.abs(net)) + ' ' + UN(), net >= 0 ? '' : 'is-bad')) +
      '<div style="margin-block-start:var(--sp-3)">' + note('فقط سودِ دریافتی و سودِ پرداختی مقایسه شده است. اقساط را از جیب خودت می‌دهی و ضوابط بانک (مثل محدودیت استفاده از وام) در نظر گرفته نشده.', 'warning') + '</div>';
    dl.hidden = false;
  } else dl.hidden = true;
}

/* ---------- سکه ---------- */
function renderCoin() {
  var w = +$('bt').value, c = num('bc'), g = num('bg');
  if (!c || !g) { $('coinEmpty').hidden = false; $('coinRes').hidden = true; return; }
  $('coinEmpty').hidden = true; $('coinRes').hidden = false;
  var B = C.bubble(w, c, g);
  $('coinHero').innerHTML = '<div><div class="hero__k">حباب سکه</div><div class="hero__v num">' + (B.pct < 0 ? '−' : '') + fmt(Math.abs(B.pct), 1) + '٪</div></div>' +
    '<div class="hero__say ' + (B.b > 0 ? 'is-bad' : 'is-good') + '">' + ico(B.b > 0 ? 'alert' : 'check') + '<span>' + (B.b > 0 ? 'سکه گران‌تر از ارزش ذاتی' : 'سکه ارزان‌تر یا هم‌اندازه ارزش ذاتی') + ' معامله می‌شود.</span></div>';
  $('coinRows').innerHTML = r_('ارزش ذاتی', fmt(B.v) + ' ' + UN()) + r_('حباب', (B.b < 0 ? '−' : '') + fmt(Math.abs(B.b)) + ' ' + UN(), B.b > 0 ? 'is-bad' : '');
}

/* ---------- رندر کلی ---------- */
function renderAll() { paintUnits(); hints(); renderLoan(); renderCmpOut(); renderAssets(); renderDeposit(); renderCoin(); }

document.addEventListener('input', function (e) {
  var t = e.target; if (!t.closest || t.type === 'file') return;
  if (t.classList.contains('m')) { moneyFormat(t); hints(); }
  if (t.closest('#cCards') || t.hasAttribute('data-table-search')) return;
  persist();
  var sec = t.closest('[data-page]'); if (!sec) return;
  var pg = sec.dataset.page;
  if (pg === 'loan') later(renderLoan);
  else if (pg === 'compare') { if (t.id === 'cinf') renderCmpOut(); else if (t.closest('#cm-assets')) renderAssets(); }
  else if (pg === 'deposit') renderDeposit();
  else if (pg === 'coin') renderCoin();
});
$('ld').addEventListener('change', function () { persist(); later(renderLoan, 0); });
$('cCards').addEventListener('input', function (e) {
  var card = e.target.closest('[data-ci]'), f = e.target.dataset.f; if (!card || !f) return;
  var c = CM[+card.dataset.ci]; c[f] = f === 'n' || f === 't' ? e.target.value : parse(e.target.value);
  LS.set('taraz2-cm', CM); renderCmpOut();
});
$('cCards').addEventListener('change', function (e) { if (e.target.dataset.f === 'n') regCmds(); });
$('cCards').addEventListener('click', function (e) {
  var b = e.target.closest('[data-del]'); if (!b || CM.length < 3) return;
  var i = +b.dataset.del, del = CM.splice(i, 1)[0];
  saveCM(); renderCmpCards(); renderCmpOut();
  toast('«' + del.n + '» حذف شد', { action: { label: 'واگرد', onClick: function () { CM.splice(i, 0, del); saveCM(); renderCmpCards(); renderCmpOut(); } } });
});
$('cAdd').onclick = function () {
  if (CM.length >= 4) return;
  CM.push({ n: 'وام ' + (CM.length + 1), P: U(100e6), r: 20, m: 24, t: 'annuity', g: 0, fee: 0, fix: 0 });
  saveCM(); renderCmpCards(); renderCmpOut();
};
$('cAddFrom').onclick = function () { if (!LAST) { toast('اول در بخش «وام» مبلغ و مدت را وارد کن'); return; } addToCompare(LAST.o, 'وام ' + (CM.length + 1)); };
$('aSave').onclick = saveLoan; $('aCsv').onclick = exportCsv; $('aPdf').onclick = exportPdf; $('aPng').onclick = exportPng; $('aShare').onclick = shareSummary;
$('dToAssets').onclick = function () {
  ['dA:aP', 'dn:aN', 'dinf:aI', 'dr:aD'].forEach(function (p) { var q = p.split(':'); $(q[1]).value = $(q[0]).value; });
  location.hash = '#compare'; $('tab-cm-assets').click(); renderAssets(); persist();
};

/* ---------- روتر ---------- */
var ROUTES = { loan: 'وام و اقساط', compare: 'مقایسه', deposit: 'سپرده', coin: 'حباب سکه', settings: 'تنظیمات' };
var ALIAS = { cmp: 'compare', dep: 'deposit', more: 'settings' };
function route(name, focus) {
  name = ALIAS[name] || name; if (!ROUTES[name]) name = 'loan';
  $$('section[data-page]').forEach(function (s) { s.hidden = s.dataset.page !== name; });
  $$('[data-route]').forEach(function (a) { if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('topTitle').textContent = ROUTES[name]; $('crumbCur').textContent = ROUTES[name];
  document.title = 'تراز — ' + ROUTES[name];
  LS.set('taraz2-tab', name); window.scrollTo(0, 0);
  if (focus) $('main').focus({ preventScroll: true });
  A.shell.closeDrawer(false);
}
addEventListener('hashchange', function () { route(location.hash.slice(1), true); });

/* ---------- پوسته و برند ---------- */
function themeMode() { var t = A.store('aihub-theme'); return t === 'light' || t === 'dark' ? t : 'auto'; }
function syncTheme() {
  var m = themeMode(), dark = A.theme.get() === 'dark';
  $$('[data-theme-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeMode === m)); });
  $('icoMoon').hidden = dark; $('icoSun').hidden = !dark;
  var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = cssv('--brand-700') || meta.content;
  $$('[data-brand-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.brandSet === A.brand.get())); });
}
document.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('[data-theme-mode]') : null;
  if (b) {
    var m = b.dataset.themeMode;
    if (m === 'auto') { A.store('aihub-theme', null); document.documentElement.removeAttribute('data-theme'); } else A.theme.set(m);
  }
  if (e.target.closest && (b || e.target.closest('[data-theme-toggle],[data-brand-set]'))) setTimeout(syncTheme, 0);
  var u = e.target.closest ? e.target.closest('[data-unit]') : null;
  if (u) setUnit(u.dataset.unit);
});
if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme); } catch (e) {} }
function setUnit(to) {
  if (to === SET.unit) return;
  var k = to === 'rial' ? 10 : 0.1;
  $$('input.m').forEach(function (el) { if (!el.closest('#cCards') && el.value) el.value = Math.round(parse(el.value) * k).toLocaleString(LOC); });
  CM.forEach(function (c) { c.P *= k; c.fix = (c.fix || 0) * k; }); LS.set('taraz2-cm', CM);
  SET.unit = to; saveSet(); renderCmpCards(); renderAll(); persist();
}

/* ---------- تنظیمات: پشتیبان ---------- */
$('bk').onclick = function () { var o = { v: 2, set: SET, cm: CM, inputs: LS.get('taraz2-in', {}) }; download('taraz-backup.json', new Blob([JSON.stringify(o)], { type: 'application/json' })); toast('پشتیبان ذخیره شد', { kind: 'success' }); };
$('rs').onclick = function () { $('fi').click(); };
$('fi').onchange = function (e) {
  var fl = e.target.files[0]; if (!fl) return; var rd = new FileReader();
  rd.onload = function () { try { var d = JSON.parse(rd.result); if (d.v !== 2 || !Array.isArray(d.cm)) throw 0; LS.set('taraz2-set', d.set); LS.set('taraz2-cm', d.cm); LS.set('taraz2-in', d.inputs || {}); location.reload(); } catch (x) { toast('فایل پشتیبان معتبر نیست. فایلی که از همین برنامه گرفته‌ای را انتخاب کن.', { kind: 'error' }); } };
  rd.readAsText(fl);
};
$('rst').onclick = function () {
  var s = A.sheet('<h2 class="card__title">همه داده‌ها پاک شود؟</h2><p class="muted">سناریوها و ورودی‌های ذخیره‌شده روی این دستگاه حذف می‌شود و قابل بازگشت نیست. اگر لازم داری، اول پشتیبان بگیر.</p><div class="row row--wrap"><button type="button" class="btn btn--danger" data-confirm>بله، پاک کن</button><button type="button" class="btn" data-sheet-close>انصراف</button></div>', { label: 'تأیید پاک‌کردن داده‌ها' });
  s.el.querySelector('[data-confirm]').onclick = function () { ['taraz2-set', 'taraz2-cm', 'taraz2-in', 'taraz2-tab'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); location.reload(); };
};

/* ---------- جستجوی سراسری ---------- */
function openTool(id) {
  location.hash = '#loan';
  setTimeout(function () { var d = $(id); if (!d) return; d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
}
function regCmds() {
  A.cmdk.clear();
  A.cmdk.fromNav('.sidebar .nav__item[data-route]', 'صفحه‌ها');
  A.cmdk.register([
    { title: 'تغییر پوسته (روشن/تیره)', group: 'دستورها', icon: 'i-moon', keywords: ['dark', 'تیره', 'روشن', 'شب'], run: function () { A.theme.toggle(); syncTheme(); } },
    { title: 'نمایش مبالغ به ' + (SET.unit === 'rial' ? 'تومان' : 'ریال'), group: 'دستورها', icon: 'i-coin', keywords: ['واحد', 'ریال', 'تومان'], run: function () { setUnit(SET.unit === 'rial' ? 'toman' : 'rial'); } },
    { title: 'ذخیره وام برای مقایسه', group: 'دستورها', icon: 'i-bookmark', run: saveLoan },
    { title: 'خروجی اکسل (CSV)', group: 'دستورها', icon: 'i-file', keywords: ['csv', 'اکسل'], run: exportCsv },
    { title: 'گزارش PDF وام', group: 'دستورها', icon: 'i-file', keywords: ['pdf', 'چاپ'], run: exportPdf },
    { title: 'تسویه زودتر', group: 'ابزارها', icon: 'i-loan', keywords: ['جریمه', 'تسویه'], run: function () { openTool('tool-early'); } },
    { title: 'جریمه دیرکرد قسط', group: 'ابزارها', icon: 'i-alert', keywords: ['تاخیر', 'دیرکرد'], run: function () { openTool('tool-late'); } },
    { title: 'محاسبه برعکس (نرخ واقعی)', group: 'ابزارها', icon: 'i-percent', keywords: ['نرخ', 'سقف وام'], run: function () { openTool('tool-rev'); } },
    { title: 'وام یا سرمایه‌گذاری؟', group: 'ابزارها', icon: 'i-scale', keywords: ['طلا', 'دلار'], run: function () { location.hash = '#compare'; $('tab-cm-assets').click(); } }
  ]);
  (CM || []).forEach(function (c) { A.cmdk.register({ title: c.n, group: 'وام‌های مقایسه', icon: 'i-loan', hint: 'مقایسه', keywords: ['وام'], run: function () { location.hash = '#compare'; $('tab-cm-loans').click(); } }); });
}

/* ---------- راه‌اندازی ---------- */
A.ready(function () {
  restore();
  if (!CM || !Array.isArray(CM) || CM.length < 2) { CM = defCM(); LS.set('taraz2-cm', CM); }
  var ld = $('ld');
  if (ld.value) A.datepicker.set(ld, ld.value); else A.datepicker.set(ld, A.jalali.today());
  syncSegs(); syncTheme();
  $$('input.m').forEach(function (el) { if (el.value) el.value = Math.round(parse(el.value)).toLocaleString(LOC); });
  renderCmpCards(); renderAll(); regCmds();
  var h = location.hash.slice(1);
  route(h && (ROUTES[ALIAS[h] || h]) ? h : LS.get('taraz2-tab', 'loan'), false);
  document.addEventListener('aihub:brand', syncTheme);
});

/* PWA */
if ('serviceWorker' in navigator) {
  var had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(function () {});
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (had) toast('نسخه جدید نصب شد', { action: { label: 'بازخوانی', onClick: function () { location.reload(); } } }); });
}
})();
