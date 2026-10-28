'use strict';
(function () {
const C = window.Calc;
const $ = id => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const SET = Object.assign({ unit: 'toman', digits: 'fa', theme: 'auto' }, LS.get('taraz2-set', {}));
const saveSet = () => LS.set('taraz2-set', SET);

/* ---------- قالب‌بندی ---------- */
const loc = () => (SET.digits === 'fa' ? 'fa-IR' : 'en-US');
const fmt = (x, d = 0) => (isFinite(x) ? (+x).toLocaleString(loc(), { maximumFractionDigits: d }) : '—');
const nd = s => String(s == null ? '' : s).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/٫/g, '.').replace(/[٬,،\s]/g, '');
const parse = v => parseFloat(nd(v)) || 0;
const num = id => parse($(id).value);
const UN = () => (SET.unit === 'rial' ? 'ریال' : 'تومان');
const U = x => (SET.unit === 'rial' ? x * 10 : x);
const pct = (x, d = 1) => (x < 0 ? '−' : '') + fmt(Math.abs(x) * 100, d) + '٪';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function words(x) {
  const a = Math.abs(x), s = x < 0 ? '−' : '';
  if (a >= 1e12) return s + fmt(a / 1e12, 2) + ' هزار میلیارد';
  if (a >= 1e9) return s + fmt(a / 1e9, 2) + ' میلیارد';
  if (a >= 1e6) return s + fmt(a / 1e6, 2) + ' میلیون';
  if (a >= 1e3) return s + fmt(a / 1e3, 1) + ' هزار';
  return s + fmt(a);
}
const METHOD = { annuity: 'اقساط مساوی', principal: 'اصل مساوی', bullet: 'یک‌جا', gharz: 'قرض‌الحسنه' };
let toastT;
function toast(msg, label, fn) {
  const t = $('toast'); t.textContent = msg;
  if (label) { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; t.appendChild(b); }
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), label ? 8000 : 2600);
}
function todayJ() {
  try {
    const p = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const g = t => +p.find(x => x.type === t).value;
    return { y: g('year'), m: g('month'), d: g('day') };
  } catch (e) { return null; }
}
const jFa = (d) => { const s = C.fmtJ(d); return SET.digits === 'fa' ? s.replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]) : s; };

/* ---------- ساخت بخش‌های ثابت ---------- */
const BEAM = `
<div class="hero" id="lHero">
 <div class="k" id="hK">قسط ماهانه</div><div class="v" id="hV">—</div>
 <svg class="beam" viewBox="0 0 360 200" role="img" aria-labelledby="beamT"><title id="beamT">ترازوی دریافتی و بازپرداخت</title>
  <path d="M180 62L158 176H202Z" fill="#26375F"/><rect x="128" y="172" width="104" height="8" rx="4" fill="#26375F"/>
  <g class="bm" id="bBeam" style="transform-origin:180px 62px"><rect x="50" y="58" width="260" height="8" rx="4" fill="#C9D4EA"/></g>
  <circle cx="180" cy="62" r="9" fill="#F4CF7A"/>
  <g class="pn" id="bR"><path d="M0 0L-38 50M0 0L38 50" stroke="#8FA3CC" stroke-width="1.5" fill="none"/><rect x="-46" y="50" width="92" height="8" rx="4" fill="#7FE3D7"/><text y="76" text-anchor="middle" font-size="11" fill="#9DAECC">دریافتی</text><text id="bRt" y="94" text-anchor="middle" font-size="13.5" font-weight="800" fill="#fff"></text></g>
  <g class="pn" id="bL"><path d="M0 0L-38 50M0 0L38 50" stroke="#8FA3CC" stroke-width="1.5" fill="none"/><rect x="-46" y="50" width="92" height="8" rx="4" fill="#F4CF7A"/><text y="76" text-anchor="middle" font-size="11" fill="#9DAECC">بازپرداخت، به قیمت امروز</text><text id="bLt" y="94" text-anchor="middle" font-size="13.5" font-weight="800" fill="#fff"></text></g>
 </svg>
 <div class="say" id="hSay"></div>
</div><div id="lRest"></div>`;

const TOOLS = `
<details class="tool"><summary>تسویه زودتر</summary>
 <div class="g"><div><label for="ek">بعد از قسط شماره</label><div class="fld"><input id="ek" inputmode="numeric" value="12"></div></div>
 <div><label for="epen">جریمه تسویه زودهنگام</label><div class="fld"><input class="p" id="epen" inputmode="decimal" value="0"><span class="suf">٪</span></div></div></div>
 <div id="eOut"></div><div class="note">جریمه تسویه (اگر قرارداد دارد) را درصدی از مانده وارد کن.</div></details>
<details class="tool"><summary>جریمه دیرکرد قسط</summary>
 <div class="g"><div><label for="ldays">روز تأخیر</label><div class="fld"><input class="t" id="ldays" inputmode="numeric" value="30"><span class="suf">روز</span></div></div>
 <div><label for="lpen">نرخ جریمه سالانه</label><div class="fld"><input class="p" id="lpen" inputmode="decimal" value="12"><span class="suf">٪</span></div></div></div>
 <div id="pOut"></div><div class="note">عدد ۱۲٪ نمونه است. نرخ و روش محاسبه جریمه را از قرارداد خودت بخوان.</div></details>
<details class="tool"><summary>محاسبه برعکس</summary>
 <div class="sec" style="margin-top:6px">چقدر وام می‌توانم بگیرم؟</div>
 <label for="rvPay">قسط ماهانه‌ای که می‌توانم بپردازم</label><div class="fld"><input class="m" id="rvPay" inputmode="numeric"><span class="suf u"></span></div>
 <div id="rvOut1"></div>
 <div class="sec">نرخ واقعی از روی قسط بانک</div><p class="sub" style="margin:0 0 6px">بانک مبلغ و قسط را گفته؛ نرخ واقعی چقدر است؟</p>
 <div class="g"><div class="w"><label for="rvP">مبلغ وام</label><div class="fld"><input class="m" id="rvP" inputmode="numeric"><span class="suf u"></span></div></div>
 <div><label for="rvQ">قسط ماهانه</label><div class="fld"><input class="m" id="rvQ" inputmode="numeric"><span class="suf u"></span></div></div>
 <div><label for="rvN">تعداد اقساط</label><div class="fld"><input class="t" id="rvN" inputmode="numeric" value="24"><span class="suf">ماه</span></div></div></div>
 <div id="rvOut2"></div></details>`;

let CM = LS.get('taraz2-cm', null);
let LAST = null;

/* ---------- ورودی‌ها ---------- */
function moneyFormat(el) {
  const caret = el.selectionStart == null ? el.value.length : el.selectionStart;
  const before = nd(el.value.slice(0, caret)).replace(/\D/g, '').length;
  const iv = nd(el.value).replace(/[^\d.]/g, '').split('.')[0];
  el.value = iv ? (+iv).toLocaleString(loc()) : '';
  let cnt = 0, pos = 0; const s = el.value;
  for (; pos < s.length && cnt < before; pos++) if (/[\d۰-۹]/.test(s[pos])) cnt++;
  try { el.setSelectionRange(pos, pos); } catch (e) {}
}
const setM = (id, x) => { $(id).value = x ? Math.round(x).toLocaleString(loc()) : ''; };
function hints() {
  document.querySelectorAll('.hint[data-for]').forEach(h => {
    const v = num(h.dataset.for); h.textContent = v >= 1000 ? '≈ ' + words(v) + ' ' + UN() : '';
  });
}
function paintUnits() { document.querySelectorAll('.u').forEach(e => (e.textContent = UN())); document.querySelectorAll('[data-unit]').forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === SET.unit)); }

document.addEventListener('input', e => { const t = e.target; if (t.classList && t.classList.contains('m')) { moneyFormat(t); hints(); } });
document.querySelectorAll('.seg').forEach(sg => {
  const inp = $(sg.dataset.id);
  const sync = () => sg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === inp.value)));
  sg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; inp.value = b.dataset.v; sync(); inp.dispatchEvent(new Event('input', { bubbles: true })); });
  sg._sync = sync;
});
const syncSegs = () => document.querySelectorAll('.seg').forEach(s => s._sync());

/* ---------- نگهداری ورودی‌ها ---------- */
const NOKEEP = new Set(['digits', 'theme', 'fi']);
const keepEls = () => [...document.querySelectorAll('main input[id],main select[id]')].filter(e => !NOKEEP.has(e.id) && e.type !== 'file');
let saveT;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { const o = {}; keepEls().forEach(e => (o[e.id] = e.value)); LS.set('taraz2-in', o); }, 250); }
function restore() { const o = LS.get('taraz2-in', {}); keepEls().forEach(e => { if (o[e.id] != null) e.value = o[e.id]; }); }

/* ---------- ترازو ---------- */
function setBeam(theta, right, left) {
  const R = 130, a = (theta * Math.PI) / 180, cx = 180, cy = 62;
  $('bBeam').style.transform = `rotate(${theta}deg)`;
  $('bR').style.transform = `translate(${cx + R * Math.cos(a)}px,${cy + R * Math.sin(a)}px)`;
  $('bL').style.transform = `translate(${cx - R * Math.cos(a)}px,${cy - R * Math.sin(a)}px)`;
  $('bRt').textContent = right; $('bLt').textContent = left;
}

/* ---------- وام ---------- */
function loanInputs() {
  return {
    P: num('lp'), rate: num('lr') / 100, n: Math.min(600, Math.round(num('lm'))), grace: Math.min(120, Math.round(num('lg'))),
    method: $('lt').value, extra: num('lx'), lump: num('ly'), lumpAt: num('lk') || 12, lumpMode: $('lmo').value,
    feePct: num('lfee'), fixedFee: num('lfix'), inflation: num('linf') / 100
  };
}
const startDate = () => C.parseJ($('ld').value);
const dateOf = k => { const s = startDate(); return s ? jFa(C.addMonths(s, k)) : ''; };
const r_ = (l, v, c) => `<div class="r ${c || ''}"><span>${l}</span><b>${v}</b></div>`;
const kpi = (k, v, c) => `<div class="kpi ${c || ''}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
const money = x => fmt(x) + ' <small style="font-size:11px;font-weight:500;color:var(--mut)">' + UN() + '</small>';

function renderLoan() {
  const o = loanInputs();
  $('lrl').textContent = o.method === 'gharz' ? 'نرخ کارمزد سالانه' : 'نرخ سود سالانه';
  const rest = $('lRest');
  if (!(o.P > 0 && o.n > 0)) {
    LAST = null; $('hK').textContent = 'قسط ماهانه'; $('hV').textContent = '—';
    setBeam(0, '', ''); $('hSay').innerHTML = 'مبلغ و مدت وام را وارد کن تا ترازو کار کند.';
    rest.innerHTML = ''; renderTools(); renderDeposit(); return;
  }
  const A = C.analyzeLoan(o); LAST = { o, A };
  const s = A.sched;
  const head = { annuity: 'قسط ثابت ماهانه', principal: 'قسط اول (کاهشی)', bullet: 'پرداخت در سررسید', gharz: 'قسط اصل ماهانه' }[o.method];
  $('hK').textContent = head;
  $('hV').innerHTML = fmt(o.method === 'gharz' ? o.P / o.n : A.payment) + '<small>' + UN() + '</small>';
  const heavy = A.pv - A.netIn;
  setBeam(Math.max(-16, Math.min(16, (-heavy / A.netIn) * 55)), words(A.netIn), words(A.pv));
  const inflTxt = fmt(o.inflation * 100, 1) + '٪';
  $('hSay').className = 'say ' + (heavy <= 0 ? 'good' : 'bad');
  $('hSay').innerHTML = heavy <= 0
    ? `با تورم ${inflTxt}، بازپرداخت‌ها به قیمت امروز <b>${fmt(-heavy)} ${UN()}</b> کمتر از مبلغ دریافتی است. نرخ واقعی وام <b>${pct(A.realRate)}</b>.`
    : `با تورم ${inflTxt}، بازپرداخت‌ها به قیمت امروز <b>${fmt(heavy)} ${UN()}</b> بیشتر از مبلغ دریافتی است. نرخ واقعی وام <b>${pct(A.realRate)}</b>.`;

  const feeTxt = A.fees > 0;
  let h = '<div class="kpis">' +
    kpi('مجموع سود' + (o.method === 'gharz' ? ' (کارمزد)' : ''), money(A.totalInterest)) +
    kpi('مجموع بازپرداخت', money(A.totalPaid)) +
    kpi('نرخ مؤثر سالانه', pct(A.apr.effective), feeTxt ? 'hl' : '') +
    kpi('مدت واقعی', fmt(s.months) + ' ماه') + '</div>';
  const tot = Math.max(1, o.P + A.totalInterest + A.fees);
  h += `<div class="sheet" style="margin-top:12px;padding:14px"><h3>سهم هر بخش از مبلغ کل</h3><div class="stack" role="img" aria-label="سهم اصل، سود و هزینه">
   <i style="width:${(o.P / tot) * 100}%;background:var(--sea)"></i><i style="width:${(A.totalInterest / tot) * 100}%;background:var(--gold)"></i><i style="width:${(A.fees / tot) * 100}%;background:var(--bad)"></i></div>
   <div class="lg"><span style="--c:var(--sea)">اصل ${fmt((o.P / tot) * 100)}٪</span><span style="--c:var(--gold)">سود ${fmt((A.totalInterest / tot) * 100)}٪</span>${feeTxt ? `<span style="--c:var(--bad)">هزینه‌ها ${fmt((A.fees / tot) * 100, 1)}٪</span>` : ''}</div>
   ${feeTxt ? r_('هزینه‌های جانبی', fmt(A.fees) + ' ' + UN(), 'y') + r_('دریافتی خالص', fmt(A.netIn) + ' ' + UN()) : ''}
   ${o.method === 'principal' ? r_('آخرین قسط', fmt(s.rows[s.rows.length - 1].pay) + ' ' + UN()) : ''}
   ${o.method === 'gharz' ? '<div class="note">فرض: کارمزد هر سال یک‌جا و روی مانده ابتدای همان سال گرفته می‌شود.</div>' : ''}
   ${o.grace > 0 && (o.method === 'annuity' || o.method === 'principal') ? `<div class="note">در ${fmt(o.grace)} ماه اول فقط سود پرداخت می‌شود و بعد، اصل در ${fmt(o.n)} ماه مستهلک می‌شود.</div>` : ''}</div>`;
  if ((o.extra > 0 || o.lump > 0) && o.method !== 'bullet') {
    h += '<div class="sheet" style="margin-top:12px;padding:14px"><h3>اثر پرداخت اضافه</h3>' +
      r_('پایان وام', fmt(s.months) + ' ماه به‌جای ' + fmt(A.base.months), 'y') + r_('سود صرفه‌جویی‌شده', fmt(A.saved) + ' ' + UN());
    const e0 = s.rows.find(v => v.lump);
    if (o.lump > 0 && o.lumpMode === 'pay' && e0 && s.rows[e0.k]) h += r_('قسط جدید بعد از پرداخت یک‌جا', fmt(s.rows[e0.k].pay) + ' ' + UN());
    else if (A.monthsSaved > 0) h += r_('زودتر آزاد می‌شوی', fmt(A.monthsSaved) + ' ماه');
    h += '<div class="note">فقط وقتی درست است که قرارداد پرداخت یا تسویه زودتر را بدون جریمه و با کاهش سود اجازه دهد.</div></div>';
  }
  const inc = num('linc');
  if (inc > 0) {
    const peak = Math.max(...s.rows.map(v => v.pay)), d = (peak / inc) * 100;
    const c = d <= 30 ? '' : d <= 40 ? 'y' : 'b', t = d <= 30 ? 'در محدوده معمول' : d <= 40 ? 'نیازمند احتیاط' : 'فشار سنگین بر بودجه';
    h += '<div class="sheet" style="margin-top:12px;padding:14px"><h3>توان بازپرداخت</h3>' + r_(o.method === 'principal' ? 'بیشترین قسط از درآمد' : 'قسط از درآمد', fmt(d, 0) + '٪ — ' + t, c) +
      '<div class="note">آستانه ۳۰ و ۴۰ درصد معیار تقریبی عمومی است، نه قانون بانک.</div></div>';
  }
  h += `<div class="sheet" style="margin-top:12px;padding:14px"><h3>نمودار و جدول اقساط</h3><p class="sub" style="margin:0 0 8px">${o.extra > 0 || o.lump > 0 ? 'با پرداخت اضافه' : 'برنامه عادی'}</p>
    <div id="chartBox">${chart(A, false)}</div>
    <details class="more" style="margin-top:10px"><summary>جدول ماه‌به‌ماه (${fmt(s.rows.length)} ردیف)</summary><div class="tw"><table><thead><tr><th>ماه</th>${startDate() ? '<th>تاریخ</th>' : ''}<th>پرداخت</th><th>اصل</th><th>سود</th><th>مانده</th></tr></thead><tbody>` +
    s.rows.map(v => `<tr><td>${fmt(v.k)}</td>${startDate() ? `<td>${dateOf(v.k)}</td>` : ''}<td>${fmt(v.pay)}</td><td>${fmt(v.principal)}</td><td>${fmt(v.interest)}</td><td>${fmt(v.balance)}</td></tr>`).join('') +
    `</tbody></table></div>${o.lump > 0 ? '<div class="note">پرداخت یک‌جا در ستون پرداخت نیامده؛ فقط روی مانده اثر دارد.</div>' : ''}</details>
    <div class="acts"><button class="btn" id="aSave">ذخیره برای مقایسه</button><button class="btn ghost" id="aCsv">خروجی اکسل (CSV)</button><button class="btn ghost" id="aPdf">گزارش PDF</button><button class="btn ghost" id="aPng">تصویر نمودار</button><button class="btn ghost" id="aShare">اشتراک خلاصه</button></div></div>`;
  rest.innerHTML = h;
  $('aSave').onclick = () => addToCompare(o, 'وام ' + (CM.length + 1));
  $('aCsv').onclick = exportCsv; $('aPdf').onclick = exportPdf; $('aPng').onclick = exportPng; $('aShare').onclick = shareSummary;
  renderTools(); renderDeposit();
}

function chart(A, exp) {
  const rows = A.sched.rows, n = rows.length, g = n > 36 ? 12 : 1, B = [];
  for (let i = 0; i < n; i += g) { const q = rows.slice(i, i + g); B.push({ p: q.reduce((t, v) => t + v.principal + (v.lump || 0), 0), t: q.reduce((t, v) => t + v.interest, 0), b: q[q.length - 1].balance }); }
  const W = 600, H = exp ? 330 : 250, pl = 14, top = exp ? 84 : 18, ch = H - top - (exp ? 40 : 46), bw = (W - 2 * pl) / B.length;
  const mx = Math.max(...B.map(v => v.p + v.t)) || 1;
  const c = exp ? { bg: '#fff', t1: '#0F1A33', t2: '#586480', a: '#0F7F78', b: '#C58A12', l: '#DCE1E9' } : { bg: 'none', t1: 'var(--tx)', t2: 'var(--mut)', a: 'var(--sea)', b: 'var(--gold)', l: 'var(--line)' };
  let s = `<svg ${exp ? 'xmlns="http://www.w3.org/2000/svg" id="svgx"' : 'class="chart"'} viewBox="0 0 ${W} ${H}" font-family="Vazirmatn,Tahoma,sans-serif" role="img" aria-label="نمودار اقساط: اصل و سود هر دوره">`;
  if (exp) s += `<rect width="${W}" height="${H}" fill="${c.bg}"/><text x="${W - pl}" y="30" text-anchor="end" font-size="18" font-weight="700" fill="${c.t1}">تراز — وام ${fmt(LAST.o.P)} ${UN()}</text><text x="${W - pl}" y="56" text-anchor="end" font-size="13" fill="${c.t2}">قسط ${fmt(A.payment)} | ${fmt(n)} ماه | سود کل ${fmt(A.totalInterest)}</text>`;
  s += `<line x1="${pl}" x2="${W - pl}" y1="${top + ch}" y2="${top + ch}" stroke="${c.l}"/>`;
  B.forEach((v, i) => {
    const x = W - pl - (i + 1) * bw, hp = (v.p / mx) * ch, ht = (v.t / mx) * ch;
    s += `<rect x="${x + 1}" y="${top + ch - hp}" width="${Math.max(1, bw - 2)}" height="${hp}" fill="${c.a}" rx="1.5"/><rect x="${x + 1}" y="${top + ch - hp - ht}" width="${Math.max(1, bw - 2)}" height="${ht}" fill="${c.b}" rx="1.5"/>`;
  });
  s += `<g font-size="${exp ? 12 : 17}" fill="${c.t2}"><rect x="${W - pl - 10}" y="${H - 24}" width="10" height="10" fill="${c.a}" rx="2"/><text x="${W - pl - 16}" y="${H - 15}" text-anchor="end">اصل</text><rect x="${W - pl - 70}" y="${H - 24}" width="10" height="10" fill="${c.b}" rx="2"/><text x="${W - pl - 76}" y="${H - 15}" text-anchor="end">سود</text><text x="${pl}" y="${H - 15}">${g > 1 ? 'هر ستون یک سال' : 'هر ستون یک ماه'}</text></g></svg>`;
  return s;
}

/* ---------- ابزارها ---------- */
function renderTools() {
  const L = LAST;
  const e = $('eOut'), p = $('pOut'), r1 = $('rvOut1'), r2 = $('rvOut2');
  if (!L) { e.innerHTML = p.innerHTML = ''; } else {
    const k = Math.round(num('ek')), rows = L.A.sched.rows;
    if (L.o.method === 'bullet') e.innerHTML = '<div class="note">برای وام یک‌جا، تسویه زودتر فقط سود دوره کمتر را کم می‌کند.</div>';
    else if (k >= 1 && k < rows.length) {
      const x = C.earlyPayoff(rows, k, num('epen'));
      e.innerHTML = r_('مبلغ تسویه همین حالا', fmt(x.payNow) + ' ' + UN()) + r_('سود باقی‌مانده که نمی‌دهی', fmt(x.interestSaved) + ' ' + UN(), 'y') + (x.penalty > 0 ? r_('جریمه تسویه', fmt(x.penalty) + ' ' + UN(), 'b') : '') + r_('صرفه‌جویی خالص', fmt(x.net) + ' ' + UN(), x.net >= 0 ? '' : 'b');
    } else e.innerHTML = '<div class="note">شماره قسط باید بین ۱ و ' + fmt(rows.length - 1) + ' باشد.</div>';
    const q = C.latePenalty(L.A.payment, num('ldays'), num('lpen'));
    p.innerHTML = r_('جریمه تقریبی یک قسط', fmt(q) + ' ' + UN(), 'b') + r_('قسط به‌همراه جریمه', fmt(L.A.payment + q) + ' ' + UN());
  }
  const o = L ? L.o : { rate: num('lr') / 100, n: Math.round(num('lm')) }, pay = num('rvPay');
  if (pay > 0 && o.n > 0) {
    let h = r_('حداکثر مبلغ وام', fmt(C.maxLoan(pay, o.rate, o.n)) + ' ' + UN(), 'y');
    const inc = num('linc'); if (inc > 0) h += r_('با سقف ۴۰٪ درآمد (فرض)', fmt(C.maxLoan(inc * 0.4, o.rate, o.n)) + ' ' + UN());
    r1.innerHTML = h + `<div class="note">با نرخ ${fmt(o.rate * 100, 1)}٪ و ${fmt(o.n)} ماه از بخش اصلی.</div>`;
  } else r1.innerHTML = '';
  const P = num('rvP'), Q = num('rvQ'), N = Math.round(num('rvN'));
  if (P > 0 && Q > 0 && N > 0) {
    const r = C.rateFromPayment(P, Q, N);
    r2.innerHTML = r_('نرخ واقعی سالانه', pct(r), 'y') + r_('نرخ مؤثر (با سود مرکب ماهانه)', pct(Math.pow(1 + r / 12, 12) - 1)) + r_('مجموع بازپرداخت', fmt(Q * N) + ' ' + UN());
  } else r2.innerHTML = '';
}

/* ---------- خروجی‌ها ---------- */
function download(name, blob) { const a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(blob); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function exportCsv() {
  if (!LAST) return;
  const s = startDate(); let t = '﻿' + ['شماره', s ? 'تاریخ' : null, 'پرداخت', 'اصل', 'سود', 'مانده'].filter(Boolean).join(',') + '\n';
  LAST.A.sched.rows.forEach(v => { t += [v.k, s ? C.fmtJ(C.addMonths(s, v.k)) : null, Math.round(v.pay), Math.round(v.principal), Math.round(v.interest), Math.round(v.balance)].filter(x => x !== null).join(',') + '\n'; });
  download('taraz-schedule.csv', new Blob([t], { type: 'text/csv;charset=utf-8' })); toast('فایل CSV ذخیره شد');
}
function exportPng() {
  if (!LAST) return;
  const holder = document.createElement('div'); holder.innerHTML = chart(LAST.A, true);
  const svg = holder.firstChild, im = new Image(), cv = document.createElement('canvas'); cv.width = 1200; cv.height = 660;
  im.onload = () => { const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1200, 660); x.drawImage(im, 0, 0, 1200, 660); cv.toBlob(b => { download('taraz-loan.png', b); toast('تصویر ذخیره شد'); }); };
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
}
function summaryText() {
  const { o, A } = LAST;
  return `تراز | ${METHOD[o.method]}\nمبلغ: ${fmt(o.P)} ${UN()}\nنرخ: ${fmt(o.rate * 100, 1)}٪ | مدت: ${fmt(A.sched.months)} ماه\nقسط: ${fmt(A.payment)} ${UN()}\nسود کل: ${fmt(A.totalInterest)} ${UN()}\nنرخ مؤثر سالانه: ${pct(A.apr.effective)}\nنرخ واقعی پس از تورم ${fmt(o.inflation * 100, 0)}٪: ${pct(A.realRate)}`;
}
function shareSummary() {
  if (!LAST) return; const t = summaryText();
  if (navigator.share) navigator.share({ text: t }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('خلاصه کپی شد'), () => toast('کپی نشد'));
}
function exportPdf() {
  if (!LAST) return; const { o, A } = LAST, s = startDate(), rows = A.sched.rows;
  $('report').innerHTML = `<h1>گزارش وام — تراز</h1><div style="color:#555;font-size:12px">${METHOD[o.method]} | ${s ? 'تاریخ دریافت ' + jFa(s) : ''}</div>
  <div class="kv"><div><span>مبلغ وام</span><b>${fmt(o.P)} ${UN()}</b></div><div><span>نرخ سالانه</span><b>${fmt(o.rate * 100, 1)}٪</b></div><div><span>مدت</span><b>${fmt(rows.length)} ماه</b></div><div><span>قسط</span><b>${fmt(A.payment)} ${UN()}</b></div>
  <div><span>مجموع سود</span><b>${fmt(A.totalInterest)} ${UN()}</b></div><div><span>هزینه‌های جانبی</span><b>${fmt(A.fees)} ${UN()}</b></div><div><span>نرخ مؤثر سالانه</span><b>${pct(A.apr.effective)}</b></div><div><span>نرخ واقعی پس از تورم ${fmt(o.inflation * 100, 0)}٪</span><b>${pct(A.realRate)}</b></div></div>
  <table><tr><th>ماه</th>${s ? '<th>تاریخ</th>' : ''}<th>پرداخت</th><th>اصل</th><th>سود</th><th>مانده</th></tr>${rows.map(v => `<tr><td>${fmt(v.k)}</td>${s ? `<td>${dateOf(v.k)}</td>` : ''}<td>${fmt(v.pay)}</td><td>${fmt(v.principal)}</td><td>${fmt(v.interest)}</td><td>${fmt(v.balance)}</td></tr>`).join('')}</table>
  <p style="font-size:11px;color:#666">محاسبه تقریبی است؛ مبنای نهایی قرارداد و آیین‌نامه بانک است.</p>`;
  document.body.classList.add('pr'); window.print();
}
addEventListener('afterprint', () => document.body.classList.remove('pr'));

/* ---------- مقایسه وام‌ها ---------- */
const defCM = () => [{ n: 'وام الف', P: U(100e6), r: 23, m: 24, t: 'annuity', g: 0, fee: 0, fix: 0 }, { n: 'وام ب', P: U(100e6), r: 18, m: 24, t: 'annuity', g: 0, fee: 2, fix: U(1e6) }];
function addToCompare(o, name) {
  if (CM.length >= 4) return toast('حداکثر ۴ وام قابل مقایسه است');
  CM.push({ n: name, P: o.P, r: +(o.rate * 100).toFixed(2), m: o.n, t: o.method, g: o.grace, fee: o.feePct, fix: o.fixedFee });
  LS.set('taraz2-cm', CM); renderCmpCards(); renderCmpOut(); toast('به مقایسه اضافه شد', 'ببین', () => switchTab('cmp'));
}
function renderCmpCards() {
  $('cCards').innerHTML = CM.map((c, i) => `<div class="ccard" data-ci="${i}"><div class="hd"><input data-f="n" value="${esc(c.n)}" aria-label="نام وام"><button class="xbtn" data-del="${i}" aria-label="حذف ${esc(c.n)}"${CM.length < 3 ? ' disabled style="opacity:.4"' : ''}>✕</button></div>
  <div class="g"><label class="w">مبلغ<div class="fld"><input class="m" data-f="P" inputmode="numeric" value="${c.P ? Math.round(c.P).toLocaleString(loc()) : ''}"><span class="suf u">${UN()}</span></div></label>
  <label>نرخ سالانه<div class="fld"><input class="p" data-f="r" inputmode="decimal" value="${c.r}"><span class="suf">٪</span></div></label>
  <label>مدت<div class="fld"><input class="t" data-f="m" inputmode="numeric" value="${c.m}"><span class="suf">ماه</span></div></label>
  <label class="w">روش<select data-f="t">${Object.keys(METHOD).map(k => `<option value="${k}"${k === c.t ? ' selected' : ''}>${METHOD[k]}</option>`).join('')}</select></label>
  <label>تنفس<div class="fld"><input class="t" data-f="g" inputmode="numeric" value="${c.g || 0}"><span class="suf">ماه</span></div></label>
  <label>کارمزد صدور<div class="fld"><input class="p" data-f="fee" inputmode="decimal" value="${c.fee || 0}"><span class="suf">٪</span></div></label>
  <label class="w">هزینه ثابت (بیمه، تمبر)<div class="fld"><input class="m" data-f="fix" inputmode="numeric" value="${c.fix ? Math.round(c.fix).toLocaleString(loc()) : ''}"><span class="suf u">${UN()}</span></div></label></div></div>`).join('');
  $('cAdd').disabled = CM.length >= 4;
}
function renderCmpOut() {
  const inf = num('cinf') / 100, out = $('cOut');
  const R = CM.map(c => ({ c, A: c.P > 0 && c.m > 0 ? C.analyzeLoan({ P: c.P, rate: c.r / 100, n: Math.min(600, Math.round(c.m)), grace: c.g, method: c.t, feePct: c.fee, fixedFee: c.fix, inflation: inf }) : null }));
  const ok = R.filter(x => x.A);
  if (ok.length < 2) { out.innerHTML = '<div class="empty">مبلغ و مدت حداقل دو وام را کامل کن تا مقایسه ساخته شود.</div>'; return; }
  const rowsDef = [
    ['قسط ماهانه', a => a.payment, f => fmt(f), 1], ['مدت واقعی (ماه)', a => a.sched.months, f => fmt(f), 0], ['مجموع سود', a => a.totalInterest, f => fmt(f), 1],
    ['کارمزد و هزینه‌ها', a => a.fees, f => fmt(f), 1], ['هزینه کل (سود + هزینه‌ها)', a => a.totalCost, f => fmt(f), 1], ['نرخ مؤثر سالانه', a => a.apr.effective, f => pct(f), 1],
    ['بازپرداخت به قیمت امروز', a => a.pv, f => fmt(f), 0], ['هزینه واقعی پس از تورم', a => a.realCost, f => (f < 0 ? '−' : '') + fmt(Math.abs(f)), 1], ['نرخ واقعی پس از تورم', a => a.realRate, f => pct(f), 1]
  ];
  const best = (fn, flag) => { if (!flag) return -1; const v = ok.map(x => fn(x.A)), m = Math.min(...v); return v.filter(x => Math.abs(x - m) < 1e-9).length === v.length ? -1 : R.findIndex(x => x.A && Math.abs(fn(x.A) - m) < 1e-9); };
  const byCost = ok.reduce((a, b) => (b.A.totalCost < a.A.totalCost ? b : a)), byReal = ok.reduce((a, b) => (b.A.realCost < a.A.realCost ? b : a)), byApr = ok.reduce((a, b) => (b.A.apr.effective < a.A.apr.effective ? b : a));
  const mx = Math.max(...ok.map(x => x.c.P + x.A.totalInterest + x.A.fees));
  let h = `<div class="hero"><div class="k">کم‌هزینه‌ترین پس از احتساب کارمزد</div><div class="v">${esc(byCost.c.n)}</div>
   <div class="say good" style="margin-top:8px">هزینه کل <b>${fmt(byCost.A.totalCost)} ${UN()}</b>، نرخ مؤثر <b>${pct(byCost.A.apr.effective)}</b>${byReal !== byCost ? `. با تورم ${fmt(inf * 100, 0)}٪، «${esc(byReal.c.n)}» برایت بهتر می‌ماند` : ''}${byApr !== byCost ? `. کمترین نرخ مؤثر: «${esc(byApr.c.n)}»` : ''}.</div></div>
   <div class="sheet" style="margin-top:12px;padding:14px"><div class="tw" style="max-height:none"><table class="cmpt"><thead><tr><th></th>${R.map(x => `<th>${esc(x.c.n)}</th>`).join('')}</tr></thead><tbody>` +
    rowsDef.map(([t, fn, ff, flag]) => { const b = best(fn, flag); return `<tr><td>${t}</td>${R.map((x, i) => `<td class="${i === b ? 'best' : ''}">${x.A ? ff(fn(x.A)) : '—'}</td>`).join('')}</tr>`; }).join('') +
    `</tbody></table></div><div class="note">عدد سبز یعنی بهتر برای وام‌گیرنده. «هزینه واقعی» منفی یعنی بازپرداخت‌ها، به قیمت امروز، از مبلغ دریافتی کمتر است. وام کم‌هزینه‌تر لزوماً بهترین نیست؛ سقف، ضمانت و زمان پرداخت را هم ببین.</div></div>
   <div class="sheet" style="margin-top:12px;padding:14px"><h3>اصل، سود و هزینه هر وام</h3>` +
    R.map(x => { if (!x.A) return ''; const t = x.c.P + x.A.totalInterest + x.A.fees; return `<div class="sc"><div class="h"><span>${esc(x.c.n)}</span><b>${fmt(t)}</b></div><div class="stack" style="width:${(t / mx) * 100}%"><i style="width:${(x.c.P / t) * 100}%;background:var(--sea)"></i><i style="width:${(x.A.totalInterest / t) * 100}%;background:var(--gold)"></i><i style="width:${(x.A.fees / t) * 100}%;background:var(--bad)"></i></div></div>`; }).join('') +
    `<div class="lg"><span style="--c:var(--sea)">اصل</span><span style="--c:var(--gold)">سود</span><span style="--c:var(--bad)">هزینه‌ها</span></div></div>`;
  out.innerHTML = h;
}

/* ---------- وام یا سرمایه‌گذاری ---------- */
function renderAssets() {
  const out = $('aOut'), P = num('aP'), n = Math.max(1, Math.round(num('aN'))), y = n / 12, inf = num('aI') / 100, rd = num('aD') / 100, g = num('aG') / 100, gs = num('aGs') / 100, u = num('aU') / 100, us = num('aUs') / 100, L = num('aL'), rl = num('aLr') / 100;
  if (!P) { out.innerHTML = '<div class="empty">سرمایه را وارد کن تا مقایسه ساخته شود.</div>'; return; }
  const erosion = P * (Math.pow(1 + inf, y) - 1);
  const gain = (B, k) => (k === 'd' ? B * rd * y : k === 'g' ? B * Math.pow(1 + g, y) * (1 - gs) - B : B * Math.pow(1 + u, y) * (1 - us) - B);
  const S = [{ t: 'سپرده بانکی', n: gain(P, 'd'), real: gain(P, 'd') - erosion, d: 'سود ساده، بدون ریسک بازار' }, { t: 'خرید طلا', n: gain(P, 'g'), real: gain(P, 'g') - erosion, d: 'با کسر اختلاف خرید و فروش' }, { t: 'خرید دلار', n: gain(P, 'u'), real: gain(P, 'u') - erosion, d: 'با کسر اختلاف خرید و فروش' }];
  if (L > 0) {
    const k = $('aLa').value, intr = C.schedule({ P: L, rate: rl, n, method: 'annuity' }).totalInterest, gn = gain(L, k);
    S.push({ t: 'وام و سرمایه‌گذاری در ' + { g: 'طلا', u: 'دلار', d: 'سپرده' }[k], n: gn - intr, real: gn - intr, d: 'سود دارایی منهای ' + fmt(intr) + ' ' + UN() + ' سود وام؛ سرمایه شخصی درگیر نیست' });
  }
  S.sort((a, b) => b.real - a.real);
  const best = S[0], mx = Math.max(...S.map(s => Math.abs(s.real))) || 1, bad = best.real <= 0;
  let h = `<div class="hero"><div class="k">${bad ? 'هیچ گزینه‌ای از تورم جلو نمی‌زند؛ کم‌زیان‌ترین' : 'بهترین گزینه با فرض‌های تو'}</div><div class="v">${best.t}</div><div class="say ${bad ? 'bad' : 'good'}" style="margin-top:8px">سود واقعی پس از تورم، در ${fmt(n)} ماه: <b>${fmt(best.real)} ${UN()}</b></div></div>
  <div class="sheet" style="margin-top:12px"><h2>سود واقعی هر گزینه</h2><p class="sub">میله به راست یعنی سود، به چپ یعنی زیان نسبت به تورم.</p>`;
  S.forEach(s => { h += `<div class="sc"><div class="h"><span>${s.t}</span><b>${fmt(s.real)}</b></div><div class="axis"><i class="${s.real >= 0 ? 'p' : 'n'}" style="width:${(Math.abs(s.real) / mx) * 50}%"></i></div><div class="d">اسمی: ${fmt(s.n)} — ${s.d}</div></div>`; });
  h += `<div class="note">فرسایش تورم روی سرمایه: ${fmt(erosion)} ${UN()}. نتیجه فقط به فرض‌های وارد‌شده بستگی دارد.</div></div>`;
  out.innerHTML = h;
}

/* ---------- سپرده ---------- */
function renderDeposit() {
  const out = $('depOut'), P = num('dA'), n = Math.max(1, Math.round(num('dn'))), r = num('dr') / 100, inf = num('dinf') / 100, mode = $('dm').value, days = +$('dd').value;
  if (!P) { out.innerHTML = '<div class="empty">مبلغ سپرده را وارد کن.</div>'; return; }
  const D = C.deposit(P, r, n, { compound: mode === 'compound', payout: mode === 'payout', days }), y = n / 12;
  const need = P * Math.pow(1 + inf, y), realGain = D.final - need, yld = Math.pow(D.final / P, 1 / y) - 1, realRate = (1 + yld) / (1 + inf) - 1;
  const infl = Array.from({ length: n + 1 }, (_, k) => P * Math.pow(1 + inf, k / 12));
  const W = 600, H = 220, pl = 10, pt = 14, pb = 22, all = D.series.concat(infl), lo = Math.min(...all), hi = Math.max(...all), sp = hi - lo || 1;
  const X = k => W - pl - (k / n) * (W - 2 * pl), Yy = v => pt + (1 - (v - lo) / sp) * (H - pt - pb);
  const path = a => a.map((v, k) => (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Yy(v).toFixed(1)).join('');
  const svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" font-family="Vazirmatn,Tahoma,sans-serif" role="img" aria-label="رشد سپرده در برابر تورم"><path d="${path(D.series)}" fill="none" stroke="var(--sea)" stroke-width="3" stroke-linecap="round"/><path d="${path(infl)}" fill="none" stroke="var(--bad)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round"/><g font-size="15" fill="var(--mut)"><text x="${W - pl}" y="${H - 5}" text-anchor="end">امروز</text><text x="${pl}" y="${H - 5}">${fmt(n)} ماه بعد</text></g></svg>
  <div class="lg"><span style="--c:var(--sea)">ارزش سپرده</span><span style="--c:var(--bad)">مبلغی که برای هم‌پای‌تورم ماندن لازم است</span></div>`;
  let h = `<div class="hero"><div class="k">ارزش سپرده پس از ${fmt(n)} ماه</div><div class="v">${fmt(D.final)}<small>${UN()}</small></div><div class="say ${realGain >= 0 ? 'good' : 'bad'}" style="margin-top:8px">${realGain >= 0 ? 'از تورم جلو می‌زند' : 'از تورم عقب می‌ماند'}: <b>${fmt(Math.abs(realGain))} ${UN()}</b> ${realGain >= 0 ? 'سود واقعی' : 'کاهش قدرت خرید'} (نرخ واقعی ${pct(realRate)})</div></div>
  <div class="kpis c3"><div class="kpi">${'<div class="k">سود ماهانه</div>'}<div class="v">${fmt(D.monthly)}</div></div><div class="kpi"><div class="k">مجموع سود</div><div class="v">${fmt(D.interest)}</div></div><div class="kpi ${yld > inf ? 'ok' : 'bd'}"><div class="k">بازده سالانه مؤثر</div><div class="v">${pct(yld)}</div></div></div>
  <div class="sheet" style="margin-top:12px;padding:14px"><h3>سپرده در برابر تورم</h3>${svg}</div>`;
  if (LAST) {
    const D2 = C.deposit(LAST.o.P, r, LAST.A.sched.months, { compound: mode === 'compound', payout: mode === 'payout', days }), net = D2.interest - LAST.A.totalCost;
    h += `<div class="sheet" style="margin-top:12px;padding:14px"><h3>اگر پول وام را در این سپرده بگذاری</h3><p class="sub" style="margin:0 0 4px">وام ${fmt(LAST.o.P)} ${UN()} از بخش «وام»</p>${r_('سود سپرده', fmt(D2.interest) + ' ' + UN())}${r_('هزینه وام (سود و کارمزد)', fmt(LAST.A.totalCost) + ' ' + UN(), 'y')}${r_('خالص', (net < 0 ? '−' : '') + fmt(Math.abs(net)) + ' ' + UN(), net >= 0 ? '' : 'b')}<div class="note">فقط سودِ دریافتی و سودِ پرداختی مقایسه شده است. اقساط را از جیب خودت می‌دهی و ضوابط بانک (مثل محدودیت استفاده از وام) در نظر گرفته نشده.</div></div>`;
  }
  out.innerHTML = h;
}

/* ---------- سکه ---------- */
function renderCoin() {
  const w = +$('bt').value, c = num('bc'), g = num('bg'), out = $('coinOut');
  if (!c || !g) { out.innerHTML = '<div class="empty">قیمت سکه و طلا را وارد کن تا حباب را ببینی.</div>'; return; }
  const B = C.bubble(w, c, g);
  out.innerHTML = `<div class="hero"><div class="k">حباب سکه</div><div class="v">${fmt(B.pct, 1)}٪</div><div class="say ${B.b > 0 ? 'bad' : 'good'}" style="margin-top:8px">${B.b > 0 ? 'سکه گران‌تر از ارزش ذاتی' : 'سکه ارزان‌تر یا هم‌اندازه ارزش ذاتی'} معامله می‌شود.</div></div>${r_('ارزش ذاتی', fmt(B.v) + ' ' + UN())}${r_('حباب', (B.b < 0 ? '−' : '') + fmt(Math.abs(B.b)) + ' ' + UN(), B.b > 0 ? 'b' : '')}`;
}

/* ---------- رندر کلی و رویدادها ---------- */
function renderAll() { paintUnits(); hints(); renderLoan(); renderCmpOut(); renderAssets(); renderDeposit(); renderCoin(); }
const routes = [['p-loan', renderLoan], ['p-cmp', () => { renderCmpOut(); renderAssets(); }], ['p-dep', renderDeposit], ['p-coin', renderCoin]];
document.addEventListener('input', e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('#cCards')) return;
  if (t.id === 'digits' || t.id === 'theme') return;
  persist();
  const p = t.closest('.panel'); if (!p) return;
  if (p.id === 'p-loan') renderLoan(); else if (p.id === 'p-cmp') { if (t.id === 'cm') showCm(); else if (t.id === 'cinf') renderCmpOut(); else renderAssets(); } else if (p.id === 'p-dep') renderDeposit(); else if (p.id === 'p-coin') renderCoin();
});
function showCm() { const v = $('cm').value; $('cm-loans').hidden = v !== 'loans'; $('cm-assets').hidden = v !== 'assets'; }
$('cCards').addEventListener('input', e => {
  const card = e.target.closest('[data-ci]'), f = e.target.dataset.f; if (!card || !f) return;
  const c = CM[+card.dataset.ci]; c[f] = f === 'n' || f === 't' ? e.target.value : parse(e.target.value);
  LS.set('taraz2-cm', CM); renderCmpOut();
});
$('cCards').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b || CM.length < 3) return; CM.splice(+b.dataset.del, 1); LS.set('taraz2-cm', CM); renderCmpCards(); renderCmpOut(); });
$('cAdd').onclick = () => { if (CM.length >= 4) return; CM.push({ n: 'وام ' + 'ABCD'.length, P: U(100e6), r: 20, m: 24, t: 'annuity', g: 0, fee: 0, fix: 0 }); CM[CM.length - 1].n = 'وام ' + (CM.length); LS.set('taraz2-cm', CM); renderCmpCards(); renderCmpOut(); };
$('cAddFrom').onclick = () => { if (!LAST) { toast('اول در بخش «وام» مبلغ و مدت را وارد کن'); return; } addToCompare(LAST.o, 'وام ' + (CM.length + 1)); };

function switchTab(t) {
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  LS.set('taraz2-tab', t); window.scrollTo({ top: 0 });
}
document.querySelector('nav.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) switchTab(b.dataset.t); });

/* واحد پول */
document.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => {
  const to = b.dataset.unit; if (to === SET.unit) return;
  const k = to === 'rial' ? 10 : 0.1;
  document.querySelectorAll('input.m').forEach(el => { if (!el.closest('#cCards') && el.value) el.value = Math.round(parse(el.value) * k).toLocaleString(loc()); });
  CM.forEach(c => { c.P *= k; c.fix = (c.fix || 0) * k; }); LS.set('taraz2-cm', CM);
  SET.unit = to; saveSet(); renderCmpCards(); renderAll(); persist();
}));
/* ارقام و پوسته */
function applyTheme() { if (SET.theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = SET.theme; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = SET.theme === 'dark' || (SET.theme === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches) ? '#090F1E' : '#0F1A33'; }
$('digits').addEventListener('input', () => { SET.digits = $('digits').value; saveSet(); document.querySelectorAll('input.m').forEach(el => { if (el.value) el.value = Math.round(parse(el.value)).toLocaleString(loc()); }); renderCmpCards(); renderAll(); });
$('theme').addEventListener('input', () => { SET.theme = $('theme').value; saveSet(); applyTheme(); });
$('themeBtn').onclick = () => { const dark = document.documentElement.dataset.theme === 'dark' || (SET.theme === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches); SET.theme = dark ? 'light' : 'dark'; $('theme').value = SET.theme; $('theme')._sync && 0; syncSegs(); saveSet(); applyTheme(); };

/* پشتیبان */
$('bk').onclick = () => { const o = { v: 2, set: SET, cm: CM, inputs: LS.get('taraz2-in', {}) }; download('taraz-backup.json', new Blob([JSON.stringify(o)], { type: 'application/json' })); toast('پشتیبان ذخیره شد'); };
$('rs').onclick = () => $('fi').click();
$('fi').onchange = e => {
  const fl = e.target.files[0]; if (!fl) return; const rd = new FileReader();
  rd.onload = () => { try { const d = JSON.parse(rd.result); if (d.v !== 2 || !Array.isArray(d.cm)) throw 0; LS.set('taraz2-set', d.set); LS.set('taraz2-cm', d.cm); LS.set('taraz2-in', d.inputs || {}); location.reload(); } catch (x) { toast('فایل پشتیبان معتبر نیست'); } };
  rd.readAsText(fl);
};
$('rst').onclick = () => { if (confirm('همه سناریوها و ورودی‌های ذخیره‌شده پاک شود؟')) { ['taraz2-set', 'taraz2-cm', 'taraz2-in', 'taraz2-tab'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); location.reload(); } };

/* ---------- راه‌اندازی ---------- */
$('lRest') || (document.querySelector('#loanOut').innerHTML = BEAM);
document.querySelector('#loanOut').insertAdjacentHTML('beforeend', TOOLS);
restore();
if (!CM || !Array.isArray(CM) || CM.length < 2) { CM = defCM(); LS.set('taraz2-cm', CM); }
if (!$('ld').value) { const t = todayJ(); if (t) $('ld').value = C.fmtJ(t); }
$('digits').value = SET.digits; $('theme').value = SET.theme; syncSegs(); applyTheme(); showCm();
document.querySelectorAll('input.m').forEach(el => { if (el.value) el.value = Math.round(parse(el.value)).toLocaleString(loc()); });
renderCmpCards(); renderAll();
switchTab((location.hash.slice(1) && $('p-' + location.hash.slice(1)) ? location.hash.slice(1) : LS.get('taraz2-tab', 'loan')));
requestAnimationFrame(() => renderLoan());

/* PWA */
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) toast('نسخه جدید نصب شد', 'بازخوانی', () => location.reload()); });
}
})();
