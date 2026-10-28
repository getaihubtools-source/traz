/* تراز — هسته محاسبات (بدون وابستگی به DOM) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- تقویم شمسی ---------- */
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const isLeap = y => [1, 5, 9, 13, 17, 22, 26, 30].indexOf(((y % 33) + 33) % 33) >= 0;
  const monthLen = (y, m) => (m <= 6 ? 31 : m <= 11 ? 30 : isLeap(y) ? 30 : 29);
  function addMonths(d, k) {
    let t = d.y * 12 + (d.m - 1) + k;
    const y = Math.floor(t / 12), m = (t % 12) + 1;
    return { y, m, d: Math.min(d.d, monthLen(y, m)) };
  }
  function parseJ(s) {
    const t = String(s || '').replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
    const a = t.split(/[\/\-.\s]+/).map(Number);
    if (a.length !== 3 || a.some(isNaN)) return null;
    const [y, m, d] = a;
    if (y < 1300 || y > 1600 || m < 1 || m > 12 || d < 1 || d > monthLen(y, m)) return null;
    return { y, m, d };
  }
  const pad = n => (n < 10 ? '0' : '') + n;
  const fmtJ = d => d.y + '/' + pad(d.m) + '/' + pad(d.d);

  /* ---------- پایه‌ها ---------- */
  function pmt(P, annual, n) {
    const i = annual / 12;
    if (n <= 0) return 0;
    return i ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n;
  }
  const maxLoan = (payment, annual, n) => {
    const i = annual / 12;
    return i ? (payment * (1 - Math.pow(1 + i, -n))) / i : payment * n;
  };

  /**
   * جدول اقساط
   * o: {P, rate(سالانه، اعشاری), n, grace, method:'annuity'|'principal'|'bullet'|'gharz',
   *     extra(پرداخت اضافه ماهانه روی اصل), lump, lumpAt, lumpMode:'term'|'pay'}
   * بازگشت: {rows:[{k,pay,principal,interest,balance,lump?}], totalInterest, totalPaid, firstPay}
   */
  function schedule(o) {
    const P = o.P, r = o.rate, n = Math.max(1, Math.round(o.n)), g = Math.max(0, Math.round(o.grace || 0));
    const method = o.method || 'annuity', i = r / 12;
    const rows = [];
    let ti = 0;
    if (method === 'bullet') {
      const s = (P * r * n) / 12;
      rows.push({ k: n, pay: P + s, principal: P, interest: s, balance: 0 });
      return pack(rows, s);
    }
    let b = P, k = 0, pm = method === 'annuity' ? pmt(P, r, n) : 0, q = P / n;
    const x = Math.max(0, o.extra || 0), L = Math.max(0, o.lump || 0);
    const lk = Math.min(Math.max(Math.round(o.lumpAt || 12), 1), g + n - 1);
    const limit = (n + g) * 2 + 2;
    for (k = 1; k <= limit && b > 0.5; k++) {
      let it, pr;
      if (method === 'gharz') {
        it = (k - 1) % 12 === 0 ? b * r : 0; /* کارمزد سالانه روی مانده ابتدای سال */
        pr = Math.min(q + x, b);
      } else if (k <= g) { it = b * i; pr = 0; }
      else {
        it = b * i;
        pr = (method === 'annuity' ? pm - it : q) + x;
        if (pr > b) pr = b;
        if (pr < 0) pr = 0;
      }
      b -= pr; ti += it;
      const row = { k, pay: it + pr, principal: pr, interest: it, balance: b };
      if (L > 0 && k === lk && b > 0) {
        const cut = Math.min(L, b);
        b -= cut; row.lump = cut; row.balance = b;
        if (o.lumpMode === 'pay' && b > 0) {
          const left = Math.max(1, n + g - k);
          if (method === 'annuity') pm = pmt(b, r, left);
          else q = b / left;
        }
      }
      rows.push(row);
    }
    return pack(rows, ti);
  }
  function pack(rows, ti) {
    const tp = rows.reduce((t, v) => t + v.pay + (v.lump || 0), 0);
    return { rows, totalInterest: ti, totalPaid: tp, firstPay: rows.length ? rows[0].pay : 0, months: rows.length ? rows[rows.length - 1].k : 0 };
  }

  /* نرخ مؤثر: IRR جریان نقدی ماهانه (netIn دریافتی واقعی پس از کسر هزینه‌ها) */
  function irr(netIn, rows) {
    const f = q => {
      let pv = 0;
      for (const v of rows) pv += (v.pay + (v.lump || 0)) / Math.pow(1 + q, v.k);
      return pv - netIn;
    };
    let lo = 0, hi = 1;
    if (f(0) < 0) return 0; /* بازپرداخت کمتر از دریافتی */
    for (let j = 0; j < 80; j++) { const m = (lo + hi) / 2; f(m) > 0 ? (lo = m) : (hi = m); }
    const q = (lo + hi) / 2;
    return { nominal: q * 12, effective: Math.pow(1 + q, 12) - 1 };
  }

  /* ارزش امروز بازپرداخت‌ها با تورم سالانه */
  function pvInflation(rows, inf) {
    let pv = 0;
    for (const v of rows) pv += (v.pay + (v.lump || 0)) / Math.pow(1 + inf, v.k / 12);
    return pv;
  }

  /** تحلیل کامل یک وام */
  function analyzeLoan(o) {
    const s = schedule(o);
    const fees = (o.P * (o.feePct || 0)) / 100 + (o.fixedFee || 0);
    const netIn = o.P - fees;
    const apr = fees > 0 || o.method === 'gharz' ? irr(netIn, s.rows) : irr(o.P, s.rows);
    const base = o.extra || o.lump ? schedule(Object.assign({}, o, { extra: 0, lump: 0 })) : s;
    const inf = o.inflation || 0;
    const pv = pvInflation(s.rows, inf);
    return {
      sched: s, base, fees, netIn,
      payment: s.firstPay,
      totalInterest: s.totalInterest,
      totalCost: s.totalInterest + fees,
      totalPaid: s.totalPaid + fees,
      apr: apr || { nominal: 0, effective: 0 },
      saved: base.totalInterest - s.totalInterest,
      monthsSaved: base.months - s.months,
      pv, realCost: pv + fees - o.P, /* منفی = وام برای وام‌گیرنده ارزان‌تر از اصل پول */
      realRate: inf > -1 ? (1 + (o.rate || 0)) / (1 + inf) - 1 : 0
    };
  }

  /* نرخ پنهان: از روی اصل و قسط معلوم */
  function rateFromPayment(P, pay, n) {
    if (pay * n <= P) return 0;
    let lo = 0, hi = 5;
    for (let j = 0; j < 80; j++) {
      const m = (lo + hi) / 2;
      pmt(P, m, n) > pay ? (hi = m) : (lo = m);
    }
    return (lo + hi) / 2;
  }

  /* تسویه زودتر: بعد از قسط k */
  function earlyPayoff(rows, k, penaltyPct) {
    const idx = Math.min(Math.max(k, 0), rows.length);
    const bal = idx === 0 ? null : rows[idx - 1].balance;
    if (bal == null) return null;
    const rest = rows.slice(idx).reduce((t, v) => t + v.interest, 0);
    const pen = (bal * (penaltyPct || 0)) / 100;
    return { balance: bal, penalty: pen, payNow: bal + pen, interestSaved: rest, net: rest - pen };
  }

  const latePenalty = (inst, days, annualPct) => (inst * (annualPct / 100) * days) / 365;

  /* ---------- سپرده ---------- */
  function deposit(P, rate, months, o) {
    o = o || {};
    const i = rate / 12, series = [];
    if (o.payout) {
      const m = P * rate * (o.days || 30) / 365;
      for (let k = 0; k <= months; k++) series.push(P + m * k);
      return { monthly: m, final: P + m * months, series, interest: m * months };
    }
    if (o.compound) {
      for (let k = 0; k <= months; k++) series.push(P * Math.pow(1 + i, k));
      const fin = series[months];
      return { monthly: P * i, final: fin, series, interest: fin - P };
    }
    for (let k = 0; k <= months; k++) series.push(P + P * rate * (k / 12));
    return { monthly: (P * rate * (o.days || 30)) / 365, final: series[months], series, interest: series[months] - P };
  }

  /* ---------- سکه ---------- */
  const bubble = (w, coin, gram18) => { const v = w * (900 / 750) * gram18; return { v, b: coin - v, pct: v ? ((coin - v) / v) * 100 : 0 }; };

  return { MONTHS, isLeap, monthLen, addMonths, parseJ, fmtJ, pmt, maxLoan, schedule, irr, pvInflation, analyzeLoan, rateFromPayment, earlyPayoff, latePenalty, deposit, bubble };
});
