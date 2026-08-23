/* ============================================================================
   PromoSignal DSS · ส่วนต่อขยาย v2 (ตามมติที่ประชุม 19/8/2569)
   1. สองโหมด  — ประเมินองค์กร / คัดหุ้นลงทุน  สลับได้จากหัวหน้าจอ
   2. ช่องเสียบโมเดล — ลากไฟล์สัญญา promosignal-model/1 ที่สร้างจาก Python เข้ามาแทนที่ได้
   3. ทดสอบย้อนหลัง 5 ปี — ตัวเลขจริงจาก rolling origin ไม่ใช่ค่าจำลอง
   4. ตัวติดตามข้อมูลตรวจสอบ 420 เรคคอร์ด
   ต่อท้าย dss_app.js — ใช้ $ $$ fmt esc S M VARS predict predInterval pctOf
   quintileOf go renderDashboard dl ที่ประกาศไว้แล้ว
   ============================================================================ */

/* ---------------------------------------------------------------- โหมด */
const MODES = {
  org: { lab: "ประเมินองค์กร", sub: "อ่านเอกสาร → วิเคราะห์ → จัดอันดับผู้สมัคร", tabs: ["up", "mo", "db"] },
  inv: { lab: "คัดหุ้นลงทุน", sub: "ให้เรตติ้ง → backtest ผลตอบแทน → Top 5 ล่าสุด", tabs: ["iv", "bt", "live"] },
};
const SHARED = ["dm", "mt", "howto", "guide"];
S.mode = "org";
S.sel = 0;                      // แถวที่เลือกในหน้าคัดหุ้น
S.loaded = null;                // ชุดโมเดลที่โหลดเข้ามาจากภายนอก

const PIPE_TEMPLATES = {
  text: `symbol,period,industry,text
ADVANC,2024Q1,เทคโนโลยี,"We expand digital platforms, launch new partnerships, and explore AI services."
PTT,2024Q1,พลังงาน,"บริษัทมุ่งพัฒนานวัตกรรมพลังงานสะอาด พร้อมบริหารความเสี่ยงและความปลอดภัย"
`,
  board: `symbol,period,industry,female_pct,indep_pct,board_size,wa_board_tenure,ln_assets,firm_age,roa,de_ratio_w,pol_tie
ADVANC,2024Q1,เทคโนโลยี,27,50,12,8.2,12.4,34,0.12,0.55,0
PTT,2024Q1,พลังงาน,18,42,15,11.5,14.1,45,0.08,0.80,1
`,
  returns: `symbol,period,return_pct
ADVANC,2024Q1,7.4
PTT,2024Q1,2.1
`,
  benchmark: `period,return_pct
2024Q1,3.2
`,
};

/** ห่อตารางด้วยกล่องเลื่อนแนวนอน — บนจอแคบตารางจะเลื่อนเอง ไม่ดันทั้งหน้าให้ล้น */
function wrapTables(sel) {
  const root = typeof sel === "string" ? $(sel) : sel;
  if (!root) return;
  root.querySelectorAll("table").forEach(t => {
    if (t.parentElement && t.parentElement.classList.contains("tscroll")) return;
    const w = document.createElement("div"); w.className = "tscroll";
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });
}

/* ---------------------------------------------------------------- เรตติ้ง */
const GRADE = { 5: "A", 4: "B", 3: "C", 2: "D", 1: "E" };
const GCOL = { A: "var(--accent)", B: "var(--accent)", C: "var(--amber)", D: "var(--amber)", E: "var(--rose)" };

/** ค่าที่ "เอื้อต่อนวัตกรรมเปิดที่สุด" เท่าที่พบจริงในข้อมูล — ใช้วัดศักยภาพที่เหลือ */
function bestConfig(f) {
  const g = Object.assign({}, f), R = M.ranges;
  const put = (k, v) => { if (v !== undefined && v !== null && !isNaN(v)) g[k] = v; };
  const eng = M.engines[S.engine];
  const has = k => eng.cov_order.some(t => t.split(":").some(p => p.replace(/^c_/, "") === k));
  if (has("wa_board_tenure")) put("wa_board_tenure", R.wa_board_tenure?.p05);   // อายุงานน้อย = ดี
  if (has("indep_pct")) put("indep_pct", R.indep_pct?.p95);
  if (has("board_size")) put("board_size", R.board_size?.p95);
  if (has("promotion")) put("promotion", R.promotion?.p95);
  if (has("female_pct")) put("female_pct", R.female_pct?.p95);
  return g;
}

/** คะแนนเติบโต 0–100 = 60% ตำแหน่งปัจจุบัน + 40% ศักยภาพที่ยังไม่ได้ใช้ */
function scoreOf(c) {
  const E = S.engine, p = c[E] || predict(E, c.form, c.industry, c.year);
  const pct = pctOf(p.mu, M.universe[E]?.quantiles || M.oi_quantiles);
  const pb = predict(E, bestConfig(c.form), c.industry, c.year);
  const head = Math.max(0, pb.mu / (p.mu || 1e-6) - 1) * 100;          // % ที่เพิ่มได้
  const headScore = 100 * (1 - Math.exp(-head / 100));                  // อิ่มตัวช้า ๆ
  return {
    p, pct, head, headScore,
    total: Math.round(.7 * pct + .3 * headScore),
    grade: GRADE[quintileOf(p.mu, M.universe[E]?.quintile_edges || [0, 1, 2, 3])],
    pi: predInterval(p.mu, M.engines[E].alpha),
  };
}

/* ---------------------------------------------------------------- หน้าคัดหุ้น */
function renderInvest() {
  const C = S.cands, E = S.engine;
  if (!C.length) {
    $("#ivBody").innerHTML = `<div class="empty">ยังไม่มีหลักทรัพย์ในรายการเฝ้าดู<br><br>
      กด <b>“＋ เพิ่มตัวอย่าง 6 หลักทรัพย์”</b> ด้านบนเพื่อดูการทำงาน หรือสลับไปโหมด
      <b>ประเมินองค์กร</b> อัปโหลดรายงานประจำปีแล้วกดเก็บ ระบบจะดึงมาที่นี่ให้เอง</div>`;
    $("#ivTiles").innerHTML = ""; $("#ivSens").innerHTML = ""; return;
  }
  const rows = C.map((c, i) => Object.assign({ i, c }, scoreOf(c))).sort((a, b) => b.total - a.total);
  if (S.sel >= C.length) S.sel = 0;

  const nA = rows.filter(r => r.grade === "A").length;
  const hs = rows.map(r => r.head).sort((a, b) => a - b);
  const avgHead = hs.length % 2 ? hs[(hs.length - 1) / 2] : (hs[hs.length / 2 - 1] + hs[hs.length / 2]) / 2;
  const spread = rows.length > 1 ? rows[0].p.mu - rows[rows.length - 1].p.mu : 0;
  $("#ivTiles").innerHTML = `
    <div class="tile hero"><div class="lab">อันดับ 1 · คะแนนรวม</div>
      <div class="val" style="font-size:20px">${esc(rows[0].c.alias)}</div>
      <div class="sub">คะแนน ${rows[0].total} · เรตติ้ง ${rows[0].grade} · คาด ${fmt(rows[0].p.mu, 2)} รายการ/ปี</div></div>
    <div class="tile"><div class="lab">เรตติ้ง A ในรายการ</div><div class="val">${nA}<span style="font-size:14px;color:var(--greyl)"> / ${rows.length}</span></div><div class="sub">กลุ่มบนสุดของการกระจายในกลุ่มตัวอย่าง</div></div>
    <div class="tile"><div class="lab">ศักยภาพที่ยังไม่ได้ใช้ (ค่ากลาง)</div><div class="val">+${fmt(avgHead, 0)}%</div><div class="sub">ถ้าโครงสร้างบอร์ดขยับไปที่ค่าที่ดีที่สุดเท่าที่พบจริง</div></div>
    <div class="tile"><div class="lab">ระยะห่างบน–ล่าง</div><div class="val">${fmt(spread, 2)}</div><div class="sub">รายการ/ปี · เทียบส่วนต่างควินไทล์จริง ${fmt(M.backtest?.engines?.[E]?.avg?.q_spread, 2)}</div></div>`;

  $("#ivBody").innerHTML = `<table><thead><tr>
      <th>#</th><th>ชื่อเรียก</th><th>อุตสาหกรรม</th>
      <th class="n">เรตติ้ง</th><th class="n">คะแนนรวม</th><th class="n">คาดการณ์</th>
      <th class="n">ช่วงค่าจริง 90%</th><th class="n">%ile</th><th class="n">ศักยภาพเพิ่ม</th></tr></thead><tbody>
    ${rows.map((r, k) => `<tr data-i="${r.i}" class="${r.i === S.sel ? "selrow" : ""}" style="cursor:pointer">
      <td class="n">${k + 1}</td><td><b>${esc(r.c.alias)}</b></td>
      <td style="color:var(--grey)">${esc(r.c.industry)} · ${r.c.year}</td>
      <td class="n"><span class="pill" style="background:${GCOL[r.grade]}1a;color:${GCOL[r.grade]};border-color:${GCOL[r.grade]}55">${r.grade}</span></td>
      <td class="n"><b>${r.total}</b></td>
      <td class="n">${fmt(r.p.mu, 2)}</td>
      <td class="n" style="color:var(--greyl)">${r.pi.lo}–${r.pi.hi}</td>
      <td class="n">${Math.round(r.pct)}</td>
      <td class="n" style="color:${r.head > 25 ? "var(--accent)" : "var(--greyl)"}">+${fmt(r.head, 0)}%</td></tr>`).join("")}
    </tbody></table>
    <div class="note info" style="margin-top:12px"><b>อ่านตารางนี้อย่างไร</b><br>
      <b>เรตติ้ง</b> มาจากควินไทล์ของค่าคาดการณ์เทียบกับบริษัทในกลุ่มตัวอย่าง (A = กลุ่มบนสุด 20%)<br>
      <b>คะแนนรวม</b> = 70% ของตำแหน่งปัจจุบัน + 30% ของศักยภาพที่ยังไม่ได้ใช้ — บริษัทที่คะแนนสูงจึงไม่ได้แปลว่าเก่งอยู่แล้ว แต่อาจแปลว่ายังมีที่ให้ขยับมาก<br>
      <b>ช่วงค่าจริง 90%</b> กว้างกว่าค่าคาดการณ์มาก เพราะจำนวนนวัตกรรมของบริษัทเดี่ยวผันผวนสูง — ใช้จัดอันดับได้ ใช้ทายตัวเลขรายบริษัทไม่ได้</div>`;

  wrapTables("#ivBody");
  $("#ivBody").querySelectorAll("tr[data-i]").forEach(tr => tr.onclick = () => { S.sel = +tr.dataset.i; renderInvest(); });
  renderSens(C[S.sel]);
}

/** แผนภาพความอ่อนไหว: ขยับตัวแปรทีละตัว ±1 SD แล้วดูว่าค่าคาดการณ์เปลี่ยนกี่ % */
function renderSens(c) {
  const E = S.engine, eng = M.engines[E];
  const keys = eng.cov_order.filter(t => t !== "Intercept" && !t.includes(":"))
    .map(t => t.replace(/^c_/, "")).filter(k => VARS[k]);
  const base = predict(E, c.form, c.industry, c.year).mu;
  const rows = keys.map(k => {
    const sd = M.ranges[k]?.sd || 1, v = VARS[k];
    const up = Object.assign({}, c.form); up[k] = Math.min(v.max, (c.form[k] ?? M.center[k]) + sd);
    const dn = Object.assign({}, c.form); dn[k] = Math.max(v.min, (c.form[k] ?? M.center[k]) - sd);
    const pu = predict(E, up, c.industry, c.year).mu, pd = predict(E, dn, c.industry, c.year).mu;
    const pv = eng.p["c_" + k] ?? eng.p[k] ?? 1;
    return { k, lab: v.lab, sd, up: (pu / base - 1) * 100, dn: (pd / base - 1) * 100,
             span: Math.abs(pu - pd) / base * 100, p: pv, ctrl: !!v.ctrl };
  }).sort((a, b) => (a.ctrl - b.ctrl) || (b.span - a.span));
  const mx = Math.max(...rows.map(r => Math.max(Math.abs(r.up), Math.abs(r.dn))), 1) * 1.45;

  $("#ivSens").innerHTML = `
    <div style="font-size:11.5px;color:var(--greyl);margin-bottom:10px">
      หลักทรัพย์ที่เลือก: <b style="color:var(--ink)">${esc(c.alias)}</b> · ค่าคาดการณ์ตั้งต้น ${fmt(base, 2)} รายการ/ปี ·
      ขยับทีละตัวแปร ±1 ส่วนเบี่ยงเบนมาตรฐาน</div>
    ${rows.map(r => {
      const sig = r.p < .05;
      const w = v => Math.abs(v) / mx * 50;
      const col = v => v >= 0 ? "var(--accent)" : "var(--amber)";
      return `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span>${r.lab} <span style="color:var(--greyl)">±${fmt(r.sd, 2)}</span>
            ${r.ctrl ? '<span class="pill" style="margin-left:5px;color:var(--greyl)">ตัวแปรควบคุม</span>' : ""}
            ${sig ? '<span class="pill ok" style="margin-left:5px">มีนัยสำคัญ</span>'
                  : '<span class="pill" style="margin-left:5px;color:var(--greyl)">p = ' + fmt(r.p, 2) + '</span>'}</span>
          <span style="color:var(--greyl)">ช่วงรวม ${fmt(r.span, 1)}%</span></div>
        <div class="tor"><span class="mid"></span>
          <span class="lft" style="width:${w(r.dn)}%;right:50%;opacity:${sig ? 1 : .35};background:${col(r.dn)}"></span>
          <span class="rgt" style="width:${w(r.up)}%;left:50%;opacity:${sig ? 1 : .35};background:${col(r.up)}"></span>
          <span class="tl">−1 SD ${r.dn > 0 ? "+" : ""}${fmt(r.dn, 1)}%</span>
          <span class="tr">+1 SD ${r.up > 0 ? "+" : ""}${fmt(r.up, 1)}%</span></div></div>`;
    }).join("")}
    <div class="note warn" style="margin-top:12px">แถบจาง ๆ คือตัวแปรที่ <b>ไม่มีนัยสำคัญทางสถิติ</b> (p ≥ 0.05) —
      ระบบยังคำนวณให้เห็น แต่ไม่ควรใช้เป็นเหตุผลในการตัดสินใจ เพราะทิศทางของมันอาจกลับด้านได้ถ้าเปลี่ยนชุดข้อมูล</div>`;
}

/** เพิ่มตัวอย่างหลักทรัพย์สมมุติ — ไม่ใช่บริษัทจริง ตัวเลขสร้างจากค่ากลางรายอุตสาหกรรม */
function seedInvest() {
  const inds = Object.keys(M.industry);
  const cfg = [
    ["บอร์ดใหม่ อิสระสูง", { wa_board_tenure: 4, indep_pct: 55, board_size: 13, promotion: .9, female_pct: 30, pol_tie: 0 }],
    ["บอร์ดอยู่นาน อิสระต่ำ", { wa_board_tenure: 17, indep_pct: 30, board_size: 8, promotion: .45, female_pct: 10, pol_tie: 1 }],
    ["ขนาดกลาง สมดุล", { wa_board_tenure: 9, indep_pct: 42, board_size: 11, promotion: .55, female_pct: 20, pol_tie: 0 }],
    ["ภาษาเชิงรุกสูง บอร์ดเดิม", { wa_board_tenure: 15, indep_pct: 38, board_size: 10, promotion: 1.4, female_pct: 15, pol_tie: 0 }],
    ["บอร์ดเล็ก อิสระสูง", { wa_board_tenure: 6, indep_pct: 60, board_size: 7, promotion: .6, female_pct: 25, pol_tie: 0 }],
    ["บอร์ดใหญ่ กระจายตัว", { wa_board_tenure: 11, indep_pct: 45, board_size: 16, promotion: .5, female_pct: 22, pol_tie: 1 }],
  ];
  cfg.forEach(([nm, ov], i) => {
    const ind = inds[i % inds.length], yr = 2024;
    const f = Object.assign({}, M.center, ov);
    const pA = predict("A", f, ind, yr), pB = predict("B", f, ind, yr);
    S.cands.push({
      alias: `หลักทรัพย์สมมุติ ${i + 1} · ${nm}`, industry: ind, year: yr,
      form: f, actual: null, doc: null, demo: true, A: pA, B: pB,
      pctA: pctOf(pA.mu, M.universe.A.quantiles), pctB: pctOf(pB.mu, M.universe.B.quantiles),
      qA: quintileOf(pA.mu, M.universe.A.quintile_edges), qB: quintileOf(pB.mu, M.universe.B.quintile_edges),
    });
  });
  renderInvest(); if (typeof renderDashboard === "function") renderDashboard();
}

/* ---------------------------------------------------------------- Market validation */
function moneyPct(v, d = 2) {
  return (v > 0 ? "+" : "") + fmt(v, d) + "%";
}

function linePath(rows, key, w, h) {
  const vals = rows.map(r => +r[key]);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  return vals.map((v, i) => {
    const x = vals.length === 1 ? 0 : i / (vals.length - 1) * w;
    const y = h - ((v - lo) / span * h);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function renderEquityChart(mv) {
  const p = mv.backtest.equity_curve.portfolio;
  const b = mv.backtest.equity_curve.benchmark;
  const rows = p.map((r, i) => ({ period: r.period, portfolio: r.value, benchmark: b[i].value }));
  const w = 640, h = 170, all = rows.flatMap(r => [r.portfolio, r.benchmark]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const y = v => h - ((v - lo) / ((hi - lo) || 1) * h);
  const last = rows[rows.length - 1];
  return `<svg class="eqchart" viewBox="0 0 ${w + 64} ${h + 58}" role="img" aria-label="Equity curve">
    <line x1="0" y1="${y(100).toFixed(1)}" x2="${w}" y2="${y(100).toFixed(1)}" stroke="#dfe5ea" stroke-width="1"/>
    <path d="${linePath(rows, "portfolio", w, h)}" fill="none" stroke="#17b387" stroke-width="3" stroke-linecap="round"/>
    <path d="${linePath(rows, "benchmark", w, h)}" fill="none" stroke="#3c8dde" stroke-width="3" stroke-linecap="round"/>
    <text x="0" y="${h + 28}" fill="#93a1ac" font-size="12">${esc(rows[0].period)}</text>
    <text x="${w - 48}" y="${h + 28}" fill="#93a1ac" font-size="12">${esc(last.period)}</text>
    <text x="${w + 12}" y="${y(last.portfolio).toFixed(1)}" fill="#0d7a5c" font-size="12">Top 10 ${fmt(last.portfolio, 1)}</text>
    <text x="${w + 12}" y="${y(last.benchmark).toFixed(1)}" fill="#255d99" font-size="12">SET ${fmt(last.benchmark, 1)}</text>
  </svg>`;
}

function renderMarketBacktestBlock() {
  const mv = M.market_validation;
  if (!mv) return `<div class="note warn" style="margin-bottom:16px"><b>ยังไม่มี market backtest</b><br>
    ต้องรัน Python pipeline เพื่อเติมบล็อก <code>market_validation</code> ในไฟล์โมเดลก่อน จึงจะแสดงผลตอบแทน Top 10 เทียบ SET Index ได้</div>`;
  const m = mv.backtest.metrics;
  return `
    <h3 style="margin:0 0 8px">TRL 6 · Quantitative Backtesting: Top 10 เทียบ SET Index</h3>
    <div class="tiles" style="margin-bottom:16px">
      <div class="tile hero"><div class="lab">Alpha รวม</div><div class="val">${moneyPct(m.alpha_pct)}</div>
        <div class="sub">${esc(mv.backtest.portfolio)} · ${esc(mv.backtest.period)}</div></div>
      <div class="tile"><div class="lab">ผลตอบแทนพอร์ต Top 10</div><div class="val">${moneyPct(m.portfolio_total_return_pct)}</div>
        <div class="sub">SET Index ${moneyPct(m.set_total_return_pct)}</div></div>
      <div class="tile"><div class="lab">Win rate รายไตรมาส</div><div class="val">${fmt(m.win_rate_pct, 0)}%</div>
        <div class="sub">จำนวนไตรมาสที่ชนะ benchmark</div></div>
      <div class="tile"><div class="lab">Sharpe / Max drawdown</div><div class="val">${fmt(m.sharpe, 2)}</div>
        <div class="sub">Max DD ${moneyPct(m.max_drawdown_pct)}</div></div>
    </div>
    <div class="softbox" style="margin-bottom:16px">
      <h3>Equity curve</h3>
      <p class="desc">ฐาน 100 · รีบาลานซ์รายไตรมาส · พอร์ต Top 10 ถือแบบ equal-weight</p>
      ${renderEquityChart(mv)}
    </div>
    <table><thead><tr><th>ปี</th><th class="n">Top 10</th><th class="n">SET Index</th><th class="n">Alpha</th><th>ผล</th></tr></thead><tbody>
      ${mv.backtest.folds.map(f => `<tr>
        <td><b>${esc(f.period)}</b></td>
        <td class="n">${moneyPct(f.top10_return_pct)}</td>
        <td class="n">${moneyPct(f.set_return_pct)}</td>
        <td class="n" style="color:${f.alpha_pct > 0 ? "var(--accent)" : "var(--rose)"}"><b>${moneyPct(f.alpha_pct)}</b></td>
        <td><span class="pill ${f.hit ? "ok" : "warn"}">${f.hit ? "ชนะ SET" : "แพ้ SET"}</span></td></tr>`).join("")}
    </tbody></table>
    <div class="note ${mv.status === "demo_generated" ? "warn" : "ok"}" style="margin:12px 0 20px">
      <b>${mv.status === "demo_generated" ? "ข้อมูลสาธิตจาก Python" : "ข้อมูลจาก pipeline จริง"}</b><br>
      ${esc(mv.data_note)}<br>
      Workflow: ${mv.pipeline.map(esc).join(" → ")}
    </div>`;
}

function renderLatestTop5() {
  const host = $("#liveBody");
  if (!host) return;
  const mv = M.market_validation;
  if (!mv?.latest?.rows?.length) {
    host.innerHTML = `<div class="empty">ยังไม่มีข้อมูลล่าสุด<br><br>รัน Python pipeline เพื่อเติม <code>market_validation.latest.rows</code> ก่อน</div>`;
    return;
  }
  const rows = mv.latest.rows.slice(0, 5);
  const rest = mv.latest.rows.slice(5);
  host.innerHTML = `
    <div class="tiles" style="margin-bottom:16px">
      <div class="tile hero"><div class="lab">อันดับ 1 ล่าสุด</div><div class="val" style="font-size:26px">${esc(rows[0].symbol)}</div>
        <div class="sub">Innovation Alpha Score ${fmt(rows[0].innovation_alpha_score, 1)} · ${esc(rows[0].industry)}</div></div>
      <div class="tile"><div class="lab">วันที่ประมวลผล</div><div class="val" style="font-size:25px">${esc(mv.latest.as_of)}</div>
        <div class="sub">${esc(mv.latest.universe)}</div></div>
      <div class="tile"><div class="lab">Top 5 เฉลี่ย</div><div class="val">${fmt(rows.reduce((s, r) => s + r.innovation_alpha_score, 0) / rows.length, 1)}</div>
        <div class="sub">คะแนน Innovation Alpha</div></div>
      <div class="tile"><div class="lab">สถานะข้อมูล</div><div class="val" style="font-size:22px">${mv.status === "demo_generated" ? "Demo" : "Live"}</div>
        <div class="sub">สร้างจาก Python pipeline</div></div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h3>Top 5 หุ้นนวัตกรรมล่าสุด</h3>
        <p class="desc">ใช้สำหรับ TRL 7: รันกับข้อมูลไตรมาสล่าสุดและนำไปทดสอบพฤติกรรมตลาดจริง</p>
        <table><thead><tr><th>#</th><th>Symbol</th><th>อุตสาหกรรม</th><th class="n">Score</th><th class="n">Model signal</th><th>หลักฐาน</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td class="n">${r.rank}</td><td><b>${esc(r.symbol)}</b></td><td>${esc(r.industry)}</td>
            <td class="n"><b>${fmt(r.innovation_alpha_score, 1)}</b></td><td class="n">${fmt(r.model_signal, 2)}</td>
            <td style="color:var(--grey)">${esc(r.evidence || "Public text + board variables")}</td></tr>`).join("")}
        </tbody></table>
      </div>
      <div class="card">
        <h3>รายการสำรองและความเสี่ยง</h3>
        <p class="desc">ใช้ดูหุ้นอันดับ 6-10 เผื่อกรณีสภาพคล่องหรือข่าวล่าสุดทำให้ต้องตัดออก</p>
        <table><thead><tr><th>#</th><th>Symbol</th><th class="n">Score</th><th>หมายเหตุ</th></tr></thead><tbody>
          ${rest.map(r => `<tr><td class="n">${r.rank}</td><td><b>${esc(r.symbol)}</b></td>
            <td class="n">${fmt(r.innovation_alpha_score, 1)}</td><td>${esc(r.risk_flag || "ตรวจต่อ")}</td></tr>`).join("")}
        </tbody></table>
        <div class="note warn" style="margin-top:12px"><b>ไม่ใช่คำแนะนำลงทุน</b><br>
          หน้านี้เป็น screener เพื่อคัดหุ้นไปตรวจต่อ ต้องตรวจราคา ข่าว งบล่าสุด สภาพคล่อง และข้อจำกัดการลงทุนก่อนใช้งานจริง</div>
      </div>
    </div>`;
  wrapTables(host);
}

/* ---------------------------------------------------------------- ทดสอบย้อนหลัง */
function renderBacktest() {
  const bt = M.backtest, E = S.engine, host = $("#btBody");
  if (!host) return;
  if (!bt || !bt.engines[E]) {
    const o2 = M.engines[E].oos;
    host.innerHTML = o2
      ? `<div class="note info"><b>ชุดโมเดลนี้มาจากไฟล์ภายนอก</b> — ผลทดสอบย้อนหลังแบบเลื่อนจุดตั้งต้นคำนวณจากข้อมูลดิบ
           ซึ่งไม่ได้มากับไฟล์สัญญา ระบบจึงแสดงเฉพาะตัวเลขความแม่นที่ผู้ส่งแนบมาในไฟล์</div>
         <div class="kv2" style="margin-top:12px">
           ${[["n_test", "จำนวนที่ทดสอบ", 0], ["spearman", "Spearman", 3], ["c_index", "c-index", 3],
              ["mase", "MASE", 3], ["mae", "MAE", 3], ["pi90_coverage", "ครอบคลุมช่วง 90%", 3]]
             .filter(([k]) => o2[k] !== undefined && o2[k] !== null)
             .map(([k, lab, d]) => `<div><span>${lab}</span><b>${fmt(o2[k], d)}</b></div>`).join("")}</div>
         <div class="note warn" style="margin-top:12px">ตัวเลขเหล่านี้ระบบ<b>ตรวจสอบเองไม่ได้</b> เพราะไม่มีข้อมูลดิบ —
           ต้องเชื่อผู้ส่งไฟล์ ควรระบุในรายงานว่าใครฟิตและฟิตด้วยชุดข้อมูลไหน<br>
           สลับกลับไปชุดโมเดล A หรือ B เพื่อดูผลทดสอบย้อนหลังเต็มรูปแบบที่ระบบคำนวณเอง</div>`
      : `<div class="note warn"><b>ชุดโมเดลนี้ไม่ได้แนบผลความแม่นมาด้วย</b><br>
           ไฟล์สัญญาไม่มีบล็อก <code>oos</code> จึงไม่มีตัวเลขให้แสดง —
           ตามข้อกำหนด explainability ของ ก.ล.ต. และ ธปท. ไม่ควรนำผลไปใช้ตัดสินใจจนกว่าจะมีการทดสอบนอกกลุ่มตัวอย่าง<br>
           สลับกลับไปชุดโมเดล A หรือ B เพื่อดูผลทดสอบย้อนหลังที่ระบบคำนวณเอง</div>`;
    return;
  }
  const b = bt.engines[E], o = b.avg;
  const cell = (v, good) => `<td class="n" style="color:${good ? "var(--accent)" : "var(--ink)"}">${fmt(v, 3)}</td>`;

  host.innerHTML = `
    ${renderMarketBacktestBlock()}
    <div class="tiles" style="margin-bottom:16px">
      <div class="tile hero"><div class="lab">ความสามารถในการเรียงอันดับ (c-index)</div>
        <div class="val">${fmt(o.c_index, 3)}</div>
        <div class="sub">0.50 = เดาสุ่ม · ${fmt(o.c_index, 2)} แปลว่าเลือกคู่ใดมาสองบริษัท ระบบบอกได้ถูกว่าใครมีนวัตกรรมเปิดมากกว่า ${fmt(o.c_index * 100, 0)} ครั้งจาก 100</div></div>
      <div class="tile"><div class="lab">สหสัมพันธ์อันดับ (Spearman)</div><div class="val">${fmt(o.spearman, 3)}</div><div class="sub">อันดับที่ทายกับอันดับจริงไปด้วยกันปานกลาง</div></div>
      <div class="tile"><div class="lab">MASE</div>
        <div class="val" style="color:${o.mase < 1 ? "var(--accent)" : "var(--amber)"}">${fmt(o.mase, 3)}</div>
        <div class="sub">${o.mase < 1 ? "ดีกว่า" : "<b>ยังไม่ดีกว่า</b>"}การทายด้วยตัวเลขของปีก่อน — ระบบนี้ใช้จัดอันดับ ไม่ใช่ทายจำนวน</div></div>
      <div class="tile"><div class="lab">ส่วนต่างควินไทล์</div><div class="val">${fmt(o.q_spread, 2)}</div>
        <div class="sub">กลุ่มที่ระบบให้อันดับสูงสุด มีนวัตกรรมเปิดจริงมากกว่ากลุ่มล่างสุดเฉลี่ย ${fmt(o.q_spread, 2)} รายการ/ปี</div></div>
    </div>

    <h3 style="margin:0 0 8px">ผลรายรอบ — เทรนด้วยข้อมูลถึงปีหนึ่ง แล้วทดสอบกับปีถัดไปที่โมเดลไม่เคยเห็น</h3>
    <table><thead><tr><th>เทรนด้วยปี</th><th>ทดสอบปี</th><th class="n">n ทดสอบ</th>
      <th class="n">Spearman</th><th class="n">c-index</th><th class="n">MASE</th>
      <th class="n">ครอบคลุมช่วง 90%</th><th class="n">ค่าจริงกลุ่มบน</th><th class="n">กลุ่มล่าง</th><th class="n">ส่วนต่าง</th></tr></thead><tbody>
      ${b.folds.map(f => `<tr>
        <td>${f.train_years[0]}–${f.train_years[1]}</td><td><b>${f.test_year}</b></td>
        <td class="n">${f.n_test}</td>${cell(f.spearman, f.spearman > .3)}${cell(f.c_index, f.c_index > .6)}
        ${cell(f.mase, f.mase < 1)}<td class="n">${fmt(f.pi90_coverage * 100, 1)}%</td>
        <td class="n">${fmt(f.q_top_actual, 2)}</td><td class="n">${fmt(f.q_bot_actual, 2)}</td>
        <td class="n"><b>${fmt(f.q_spread, 2)}</b></td></tr>`).join("")}
      <tr style="border-top:2px solid var(--line)"><td colspan="3"><b>เฉลี่ยทุกรอบ</b></td>
        <td class="n"><b>${fmt(o.spearman, 3)}</b></td><td class="n"><b>${fmt(o.c_index, 3)}</b></td>
        <td class="n"><b>${fmt(o.mase, 3)}</b></td><td class="n"><b>${fmt(o.pi90_coverage * 100, 1)}%</b></td>
        <td class="n">—</td><td class="n">—</td><td class="n"><b>${fmt(o.q_spread, 2)}</b></td></tr>
    </tbody></table>

    <h3 style="margin:22px 0 8px">ชุดโมเดล A เทียบ B บนการทดสอบชุดเดียวกัน</h3>
    <table><thead><tr><th>ตัวชี้วัด</th><th class="n">ชุดโมเดล A</th><th class="n">ชุดโมเดล B</th><th>อ่านว่าอย่างไร</th></tr></thead><tbody>
      ${[["c_index", "c-index", "สูงกว่าดีกว่า"], ["spearman", "Spearman", "สูงกว่าดีกว่า"],
         ["mase", "MASE", "ต่ำกว่าดีกว่า"], ["q_spread", "ส่วนต่างควินไทล์", "สูงกว่าดีกว่า"]]
        .map(([k, lab, how]) => {
          const a = bt.engines.A.avg[k], bb = bt.engines.B.avg[k];
          const bwin = how.startsWith("ต่ำ") ? bb < a : bb > a;
          return `<tr><td>${lab}</td>
            <td class="n" style="color:${bwin ? "var(--greyl)" : "var(--accent)"}">${fmt(a, 3)}</td>
            <td class="n" style="color:${bwin ? "var(--accent)" : "var(--greyl)"}"><b>${fmt(bb, 3)}</b></td>
            <td style="color:var(--grey)">${how}</td></tr>`;
        }).join("")}
    </tbody></table>

    <div class="note ok" style="margin-top:16px"><b>ข้อสรุปที่นำไปพูดในที่ประชุมได้</b><br>
      ชุดโมเดล B ชนะชุดโมเดล A ทุกตัวชี้วัด ในทุกรอบการทดสอบ — โครงสร้างคณะกรรมการอธิบายนวัตกรรมเปิดได้ดีกว่า
      ปฏิสัมพันธ์ระหว่าง Promotion focus กับเพศ/การเมืองตามสเปกเดิม</div>
    <div class="note warn" style="margin-top:9px"><b>ข้อจำกัดที่ต้องพูดพร้อมกันเสมอ</b><br>
      MASE ยังมากกว่า 1 แปลว่า <b>ถ้าเป้าหมายคือทายตัวเลขรายบริษัท การทายด้วยตัวเลขปีที่แล้วยังแม่นกว่า</b>
      คุณค่าของระบบนี้อยู่ที่การ<b>เรียงลำดับ</b>ว่าบริษัทไหนน่าจะมีนวัตกรรมเปิดมากกว่ากัน ซึ่งทำได้จริงตามส่วนต่างควินไทล์ข้างบน</div>
    <div class="note" style="margin-top:9px">${esc(bt.design)} · ${esc(bt.note)}</div>`;
  wrapTables(host);
}

/* ---------------------------------------------------------------- ช่องเสียบโมเดล */
const CONTRACT_ERR = [];
/** ตรวจไฟล์สัญญา คืนอาร์เรย์ข้อผิดพลาด (ว่าง = ผ่าน) */
function validateContract(c) {
  const e = [];
  if (!c || typeof c !== "object") return ["ไฟล์ไม่ใช่ JSON object"];
  if (c.schema !== "promosignal-model/1") e.push(`schema ต้องเป็น "promosignal-model/1" (พบ "${c.schema}")`);
  ["name", "intercept", "variables", "terms", "coef", "vcov"].forEach(k =>
    (c[k] === undefined || c[k] === null) && e.push(`ขาดคีย์ ${k}`));
  if (!Array.isArray(c.variables) || !c.variables.length) e.push("variables ต้องเป็นอาร์เรย์และมีอย่างน้อย 1 ตัว");
  if (!Array.isArray(c.terms) || !c.terms.length) e.push("terms ต้องเป็นอาร์เรย์และมีอย่างน้อย 1 พจน์");
  if (e.length) return e;

  const vk = new Set(c.variables.map(v => v.key));
  c.variables.forEach((v, i) => {
    if (!v.key) e.push(`variables[${i}] ขาด key`);
    if (v.center === undefined || v.center === null || isNaN(v.center))
      e.push(`ตัวแปร ${v.key || i} ขาดค่า center (ค่าเฉลี่ยที่ใช้ mean-center)`);
  });
  c.terms.forEach(t => {
    t.split(":").forEach(p => vk.has(p) || e.push(`พจน์ "${t}" อ้างถึงตัวแปร "${p}" ที่ไม่มีใน variables`));
    (c.coef[t] === undefined) && e.push(`ขาดสัมประสิทธิ์ของพจน์ "${t}"`);
  });
  const ord = c.vcov?.order, mx = c.vcov?.matrix;
  if (!Array.isArray(ord) || !Array.isArray(mx)) e.push("vcov ต้องมี order และ matrix");
  else {
    if (ord[0] !== "Intercept") e.push('vcov.order ต้องขึ้นต้นด้วย "Intercept"');
    if (ord.length !== mx.length) e.push(`vcov.order มี ${ord.length} รายการ แต่ matrix มี ${mx.length} แถว`);
    mx.forEach((r, i) => Array.isArray(r) && r.length === ord.length || e.push(`vcov.matrix แถวที่ ${i + 1} ยาวไม่ตรงกับ order`));
    c.terms.forEach(t => ord.includes(t) || e.push(`พจน์ "${t}" ไม่มีใน vcov.order`));
  }
  const fam = c.target?.family || "negbin";
  if (fam === "negbin" && !(c.alpha > 0)) e.push("target.family = negbin จึงต้องมี alpha > 0");
  return e;
}

/** แปลงไฟล์สัญญาเป็นชุดโมเดลภายในแล้วติดตั้ง */
function installContract(c) {
  const key = (c.key || "X").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12) || "X";
  const pre = t => t.split(":").map(p => "c_" + p).join(":");
  const vars = c.terms.map(pre);

  c.variables.forEach(v => {
    M.center[v.key] = v.center;
    VARS[v.key] = {
      lab: v.label || v.key, unit: v.unit || "",
      min: v.min ?? v.center - 3 * (v.sd || 1), max: v.max ?? v.center + 3 * (v.sd || 1),
      step: v.step || .01, dec: v.dec ?? 2, bool: !!v.bool, ctrl: !!v.control,
    };
    M.ranges[v.key] = Object.assign({}, M.ranges[v.key], {
      sd: v.sd ?? M.ranges[v.key]?.sd ?? 1, min: v.min, max: v.max,
      p05: v.min, p95: v.max, mean: v.center,
    });
  });

  M.engines[key] = {
    label: c.name, formula: c.terms.join(" + "), external: true,
    n: c.fit?.n ?? 0, pseudo_r2: c.fit?.pseudo_r2 ?? null, llf: c.fit?.llf ?? null,
    intercept: c.intercept, alpha: c.alpha ?? 1, n_terms: c.terms.length + 1,
    vars,
    coef: Object.fromEntries(c.terms.map(t => [pre(t), c.coef[t]])),
    se: Object.fromEntries(c.terms.map(t => [pre(t), c.se?.[t] ?? NaN])),
    p: Object.fromEntries(c.terms.map(t => [pre(t), c.p?.[t] ?? 1])),
    cov: c.vcov.matrix, cov_order: c.vcov.order.map(t => t === "Intercept" ? t : pre(t)),
    base_industry: c.fixed_effects?.industry || {},
    base_year: c.fixed_effects?.year || {},
    oos: c.oos || null,
  };
  M.universe[key] = c.reference || M.universe.B;
  M.controls = [...new Set([...M.controls, ...c.variables.filter(v => v.control).map(v => v.key)])];
  if (c.target?.label) M.meta.target_loaded = c.target.label;

  S.loaded = { key, name: c.name, at: new Date().toISOString().slice(0, 16).replace("T", " "),
               by: c.produced_by || "ไม่ระบุ", terms: c.terms.length, target: c.target?.label || c.target?.var || "—" };
  S.engine = key;
  ENG_NOTE[key] = { cls: "info", html:
    `<b>${esc(c.name)} — ชุดโมเดลจากไฟล์ภายนอก</b><br>` +
    `ตัวแปรตาม: ${esc(c.target?.label || c.target?.var || "ไม่ระบุ")} · ` +
    `${c.terms.length} พจน์ · ฟิตด้วย ${esc(c.produced_by || "ไม่ระบุ")}` +
    (c.notes ? `<br>${esc(c.notes)}` : "") };

  // เติมค่าตั้งต้นของตัวแปรใหม่ที่ยังไม่มีในฟอร์ม
  c.variables.forEach(v => { if (S.form[v.key] === undefined || isNaN(S.form[v.key])) S.form[v.key] = v.center; });
  S.base = Object.assign({}, S.form);

  // คำนวณผลของชุดโมเดลใหม่ให้ทุกรายการที่เก็บไว้แล้ว ไม่งั้นหน้าแดชบอร์ดจะหาค่าไม่เจอ
  S.cands.forEach(c => { c[key] = predict(key, c.form, c.industry, c.year); });

  syncEngineButtons();
  if (typeof renderModel === "function") renderModel();
  if (typeof renderMethod === "function") renderMethod();
  if (typeof renderDashboard === "function") renderDashboard();
  renderInvest(); renderBacktest(); renderLatestTop5(); renderModelSlot();
}

/** สร้าง/ซิงก์ปุ่มสลับชุดโมเดลทุกที่ให้ครบทุกชุดที่มีอยู่ตอนนี้ */
function engLabel(k) {
  if (k === "A") return "A · ตามสเปก Pitch";
  if (k === "B") return "B · ตามหลักฐาน";
  return esc(M.engines[k].label).slice(0, 40);
}
function switchEngine(k) {
  if (!M.engines[k]) return;
  S.engine = k;
  syncEngineButtons();
  if (typeof renderModel === "function") renderModel();
  if (typeof renderMethod === "function") renderMethod();
  if (typeof renderDashboard === "function") renderDashboard();
  renderInvest(); renderBacktest(); renderLatestTop5(); renderModelSlot();
}
function syncEngineButtons() {
  const keys = Object.keys(M.engines);
  const tog = $("#engTog");
  if (tog) {
    tog.innerHTML = keys.map(k => `<button data-e="${k}" aria-selected="${S.engine === k}">${engLabel(k)}</button>`).join("");
    tog.querySelectorAll("button").forEach(b => b.onclick = () => switchEngine(b.dataset.e));
  }
  $$(".engpick").forEach(box => {
    box.innerHTML = keys.map(k =>
      `<button class="segb${S.engine === k ? " on" : ""}" data-eng="${k}">${engLabel(k)}</button>`).join("");
    box.querySelectorAll("[data-eng]").forEach(b => b.onclick = () => switchEngine(b.dataset.eng));
  });
}

/* ---------------------------------------------------------------- หน้าข้อมูลและโมเดล */
const SPEC_SLOTS = 8;   // จำนวนตัวแปรหลักที่ตกลงกันไว้ในที่ประชุม — ชื่อยังรอยืนยัน

function renderModelSlot() {
  const host = $("#dmModel"); if (!host) return;
  const E = M.engines[S.engine], L = S.loaded;
  host.innerHTML = `
    <div class="kv2">
      <div><span>ชุดโมเดลที่ระบบใช้อยู่</span><b>${esc(E.label)}</b></div>
      <div><span>ที่มา</span><b>${L && L.key === S.engine ? "ไฟล์ภายนอก · " + esc(L.by) : "ฝังมากับระบบ (Python · statsmodels)"}</b></div>
      <div><span>ตัวแปรตาม</span><b>${esc(L && L.key === S.engine ? L.target : M.meta.target)}</b></div>
      <div><span>จำนวนพจน์</span><b>${E.n_terms}</b></div>
      <div><span>α (การกระจายเกิน)</span><b>${fmt(E.alpha, 4)}</b></div>
      <div><span>ข้อมูลที่ใช้ฟิต</span><b>${E.n ? E.n + " บริษัท-ปี" : "ไม่ระบุ"}</b></div>
      ${L && L.key === S.engine ? `<div><span>โหลดเข้าระบบเมื่อ</span><b>${esc(L.at)}</b></div>` : ""}
    </div>
    <div class="segbar engpick" style="margin-top:12px"></div>
    ${L ? `<div class="note ok" style="margin-top:12px"><b>โหลดชุดโมเดลภายนอกสำเร็จ</b> — “${esc(L.name)}” · ${L.terms} พจน์ ·
      ทุกหน้าจอในระบบเปลี่ยนไปใช้สมการชุดนี้แล้ว กดปุ่มด้านบนเพื่อสลับกลับไปชุดเดิมได้ตลอด</div>` : ""}`;
  syncEngineButtons();
}

function renderDataStatus() {
  const host = $("#dmData"); if (!host) return;
  const D = M.datastatus;
  if (!D) { host.innerHTML = `<div class="empty">ไม่มีข้อมูลสถานะ</div>`; return; }
  const V = D.validation_target, pctDone = V.records ? V.done / V.records * 100 : 0;
  const c5 = D.complete5y;

  host.innerHTML = `
    <div class="tiles" style="margin-bottom:16px">
      <div class="tile hero"><div class="lab">ชุดข้อมูลตรวจสอบ (เป้าหมาย)</div>
        <div class="val">${V.done} <span style="font-size:15px;color:var(--greyl)">/ ${V.records}</span></div>
        <div class="sub">${V.firms} บริษัท × ${V.years} ปี · ${esc(V.purpose)}</div>
        <div class="prog" style="margin-top:8px"><span style="width:${pctDone}%"></span></div></div>
      <div class="tile"><div class="lab">ข้อมูลที่มีอยู่ตอนนี้</div><div class="val">${D.n_rows}</div>
        <div class="sub">${D.n_firms} บริษัท × ${D.years[1] - D.years[0] + 1} ปี (${D.years[0]}–${D.years[1]})</div></div>
      <div class="tile"><div class="lab">บริษัทที่มีข้อมูลครบ 5 ปี</div>
        <div class="val" style="color:var(--accent)">${c5.full}</div>
        <div class="sub">${c5.full * 5} เรคคอร์ดที่ใช้ได้เต็มทุกตัวแปร</div></div>
      <div class="tile"><div class="lab">ส่วนที่ยังขาด</div><div class="val">${D.n_firms - c5.full}</div>
        <div class="sub">บริษัทที่ยังไม่ครบ 5 ปี — คือคิวงานตรวจสอบข้อมูล</div></div>
    </div>

    <div class="note ok"><b>ผลตรวจข้อมูลจริง — ต่างจากตัวเลขที่พูดในที่ประชุม</b><br>
      ที่ประชุมบันทึกไว้ว่ามีบริษัทที่ข้อมูลครบ 5 ปีอยู่ <b>122 บริษัท</b> แต่เมื่อตรวจแฟ้ม panel ที่ใช้ฟิตโมเดลจริง
      พบว่า <b>${c5.full} บริษัท</b> มีข้อมูลครบทั้ง 5 ปี และตัวเลขนี้ <b>เท่ากันหมด</b> ไม่ว่าจะนับด้วย 8 ตัวแปรหลัก
      (${c5.core8}) 12 ตัวแปร (${c5.core12}) หรือครบทุกตัวแปร (${c5.full})<br><br>
      แปลว่าสิ่งที่จำกัดจำนวนบริษัท <b>ไม่ใช่</b>ตัวแปรใดตัวแปรหนึ่งหายเป็นจุด ๆ แต่เป็นการที่ทั้งแถวหายไปพร้อมกัน
      — การเก็บข้อมูลเพิ่มจึงควรเก็บเป็น<b>ทั้งบริษัท-ปี</b> ไม่ใช่ไล่เติมทีละตัวแปร</div>

    <h3 style="margin:22px 0 8px">ความครบถ้วนรายตัวแปร (จาก ${D.n_rows} แถว)</h3>
    <table><thead><tr><th>ตัวแปร</th><th class="n">มีข้อมูล</th><th class="n">ขาด</th><th class="n">% ที่ขาด</th><th>สถานะ</th></tr></thead><tbody>
      ${D.vars.map(v => `<tr><td>${esc(v.label)}<br><span style="color:var(--greyl);font-size:10.5px">${v.var}</span></td>
        <td class="n">${v.n}</td><td class="n">${v.missing}</td><td class="n">${fmt(v.pct, 1)}%</td>
        <td><div class="prog sm"><span style="width:${100 - v.pct}%;background:${v.pct > 10 ? "var(--amber)" : "var(--accent)"}"></span></div></td></tr>`).join("")}
    </tbody></table>

    <h3 style="margin:22px 0 8px">ตรวจความผิดปกติของ Political / Military ตามที่ประชุมสั่ง</h3>
    <table><thead><tr><th>ตัวแปร</th><th class="n">มีข้อมูล</th><th class="n">ต่ำสุด–สูงสุด</th><th class="n">เฉลี่ย</th>
      <th class="n">เกินขนาดบอร์ด</th><th class="n">ติดลบ</th><th class="n">ไม่ใช่จำนวนเต็ม</th></tr></thead><tbody>
      ${Object.entries(D.anomaly).map(([k, a]) => `<tr>
        <td>${k === "peps_bod" ? "กรรมการเชื่อมโยงการเมือง" : "กรรมการสายความมั่นคง"}<br>
          <span style="color:var(--greyl);font-size:10.5px">${k}</span></td>
        <td class="n">${a.n}</td><td class="n">${a.min}–${a.max}</td><td class="n">${fmt(a.mean, 2)}</td>
        ${[a.gt_board_size, a.negative, a.non_integer].map(v =>
          `<td class="n" style="color:${v ? "var(--rose)" : "var(--accent)"}"><b>${v}</b></td>`).join("")}</tr>`).join("")}
    </tbody></table>
    <div style="margin-top:10px">${Object.entries(D.anomaly).map(([k, a]) => `
      <div style="margin-bottom:10px"><div style="font-size:11.5px;color:var(--greyl);margin-bottom:4px">การกระจายของ ${k}</div>
        ${Object.entries(a.dist).map(([v, n]) => `<div class="bar" style="--lw:38px;margin:2px 0">
          <div style="font-size:11px">${v} คน</div>
          <div class="t"><span class="f" style="left:0;width:${n / Math.max(...Object.values(a.dist)) * 100}%"></span></div>
          <div class="v">${n}</div></div>`).join("")}</div>`).join("")}</div>

    <div class="note warn" style="margin-top:12px"><b>สรุป: ไม่พบความผิดปกติเชิงโครงสร้าง</b><br>
      ไม่มีแถวใดที่จำนวนกรรมการการเมืองหรือสายความมั่นคง<b>มากกว่าขนาดคณะกรรมการ</b> ไม่มีค่าติดลบ และไม่มีค่าที่ไม่ใช่จำนวนเต็ม
      สิ่งเดียวที่พบคือ <b>ขาดข้อมูล ${D.anomaly.peps_bod.missing} แถว (${fmt(D.anomaly.peps_bod.missing / D.n_rows * 100, 1)}%)</b> ซึ่งเป็นแถวชุดเดียวกันกับตัวแปรบอร์ดตัวอื่น<br><br>
      ถ้าที่ประชุมเห็นความผิดปกติจริง แปลว่า<b>กำลังดูแฟ้มคนละฉบับกับที่ใช้ฟิตโมเดล</b> — ควรยืนยันกับคุณปูลมว่าใช้ไฟล์ไหน
      ก่อนจะเสียเวลาไล่แก้ข้อมูลที่อาจไม่ได้ผิด</div>

    <div class="btnrow" style="margin-top:16px">
      <button class="btn s" id="btnTmpl">ดาวน์โหลดแม่แบบเก็บข้อมูล 420 เรคคอร์ด (CSV)</button>
      <button class="btn s" id="btnGapCsv">ดาวน์โหลดตารางความครบถ้วน (CSV)</button>
    </div>`;

  wrapTables("#dmData");
  $("#btnTmpl").onclick = () => {
    const cols = ["firm_code", "year", ...D.vars.map(v => v.var), "source_page", "checked_by", "note"];
    const rows = [cols.join(",")];
    for (let i = 1; i <= V.firms; i++)
      for (let y = 0; y < V.years; y++)
        rows.push([`C${String(i).padStart(3, "0")}`, 2025 + y, ...D.vars.map(() => ""), "", "", ""].join(","));
    dl("promosignal_validation_template.csv", "﻿" + rows.join("\n"), "text/csv;charset=utf-8");
  };
  $("#btnGapCsv").onclick = () => {
    const rows = [["ตัวแปร", "ชื่อคอลัมน์", "มีข้อมูล", "ขาด", "% ที่ขาด"].join(",")]
      .concat(D.vars.map(v => [`"${v.label}"`, v.var, v.n, v.missing, v.pct].join(",")));
    dl("promosignal_data_gaps.csv", "﻿" + rows.join("\n"), "text/csv;charset=utf-8");
  };
}

function renderSpecSlot() {
  const host = $("#dmSpec"); if (!host) return;
  const cur = M.engines[S.engine].cov_order.filter(t => t !== "Intercept").map(t => t.replace(/^c_/, ""));
  host.innerHTML = `
    <div class="note info"><b>สถานะ: รอชื่อตัวแปรจากคุณปูลม</b><br>
      ที่ประชุมตกลงว่าโมเดลชุดใหม่จะเปลี่ยนตัวแปรตามเป็น <b>Innovation Intensity</b> ที่คำนวณจาก Wording Ratios
      และใช้ตัวแปรอิสระ <b>${SPEC_SLOTS} ตัว</b> โดยรายชื่อจะยืนยันภายในวันจันทร์
      ระบบจึงเตรียม<b>ช่องเสียบ</b>ไว้ล่วงหน้า — เมื่อได้รายชื่อแล้วไม่ต้องแก้โค้ดเว็บ เพียงฟิตโมเดลด้วย Python
      ส่งออกเป็นไฟล์สัญญา แล้วลากเข้ามาในกล่องด้านล่าง</div>
    <table style="margin-top:12px"><thead><tr><th class="n">ช่อง</th><th>ตัวแปรที่ตกลงไว้</th><th>ตัวแปรที่ระบบใช้อยู่ตอนนี้</th><th>สถานะ</th></tr></thead><tbody>
      ${Array.from({ length: SPEC_SLOTS }, (_, i) => {
        const c = cur[i];
        return `<tr><td class="n">${i + 1}</td>
          <td style="color:var(--greyl)">— รอยืนยัน —</td>
          <td>${c ? esc((VARS[c] || {}).lab || c) : '<span style="color:var(--greyl)">ว่าง</span>'}</td>
          <td><span class="pill warn">รอสเปก</span></td></tr>`;
      }).join("")}
    </tbody></table>
    <div class="note" style="margin-top:12px"><b>ทำไมต้องมีไฟล์สัญญา ไม่ส่งข้อมูลดิบ</b><br>
      ไฟล์สัญญาบรรจุเฉพาะ<b>สัมประสิทธิ์กับเมทริกซ์ความแปรปรวนร่วม</b> ซึ่งเป็นตัวเลขสรุป ไม่มีชื่อบริษัท ชื่อบุคคล
      หรือแถวข้อมูลรายบริษัทอยู่เลย ทีมสถิติจึงส่งโมเดลให้ทีมเว็บได้โดยไม่ต้องส่งฐานข้อมูลออกจากเครื่อง
      และเว็บก็คำนวณค่าคาดการณ์กับช่วงความเชื่อมั่นได้ครบเหมือนเดิม</div>`;
  wrapTables("#dmSpec");
}

function initModelDrop() {
  const dz = $("#mdz"), fi = $("#mdzFile"), out = $("#mdzOut");
  if (!dz) return;
  const show = (cls, html) => out.innerHTML = `<div class="note ${cls}" style="margin-top:12px">${html}</div>`;

  const handle = async file => {
    if (!file) return;
    if (!/\.json$/i.test(file.name)) return show("bad", "ต้องเป็นไฟล์ <b>.json</b> ที่ส่งออกตามสัญญา promosignal-model/1");
    let obj;
    try { obj = JSON.parse(await file.text()); }
    catch (e) { return show("bad", `อ่านไฟล์ไม่สำเร็จ — JSON ไม่ถูกรูปแบบ<br><code>${esc(e.message)}</code>`); }
    const errs = validateContract(obj);
    if (errs.length) return show("bad",
      `<b>ไฟล์ไม่ผ่านการตรวจ (${errs.length} ข้อ) — ยังไม่ได้เปลี่ยนโมเดลในระบบ</b><ul style="margin:6px 0 0 16px">${
        errs.slice(0, 12).map(e => `<li>${esc(e)}</li>`).join("")}</ul>${
        errs.length > 12 ? `<div style="margin-top:5px">…และอีก ${errs.length - 12} ข้อ</div>` : ""}`);
    try { installContract(obj); }
    catch (e) { return show("bad", `ติดตั้งไม่สำเร็จ — <code>${esc(e.message)}</code>`); }
    show("ok", `<b>สำเร็จ</b> — ติดตั้ง “${esc(obj.name)}” แล้ว · ${obj.terms.length} พจน์ ·
      ตัวแปรตาม ${esc(obj.target?.label || obj.target?.var || "—")} ·
      ทุกหน้าจอเปลี่ยนไปใช้สมการชุดนี้แล้ว`);
  };

  dz.onclick = () => fi.click();
  fi.onchange = e => handle(e.target.files[0]);
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", e => handle(e.dataTransfer.files[0]));

  const bindDl = (id, name, text, mime) => {
    const btn = $("#" + id);
    if (btn && text) btn.onclick = () => dl(name, text, mime);
  };
  bindDl("btnSpecEx", "example_model.json", SPEC_FILES.example, "application/json");
  bindDl("btnSpecSchema", "model_contract.schema.json", SPEC_FILES.schema, "application/json");
}

function initPipelineDownloads() {
  const bind = (id, name, text) => {
    const btn = $("#" + id);
    if (btn) btn.onclick = () => dl(name, "﻿" + text, "text/csv;charset=utf-8");
  };
  bind("btnTplText", "set100_text_template.csv", PIPE_TEMPLATES.text);
  bind("btnTplBoard", "set100_board_template.csv", PIPE_TEMPLATES.board);
  bind("btnTplReturns", "set100_returns_template.csv", PIPE_TEMPLATES.returns);
  bind("btnTplBench", "set_index_returns_template.csv", PIPE_TEMPLATES.benchmark);
}

/* ---------------------------------------------------------------- โครงหน้าใหม่ */
const PANES_V2 = `
<section class="pane" id="p-iv">
  <div class="kicker">TRL 5 · Ideate & Prototype</div>
  <h2 class="sechead">Innovation Alpha Score สำหรับคัดหุ้นนวัตกรรม</h2>
  <p class="secsub">Python pipeline ดึง text สาธารณะของ SET100 มาคำนวณ LIWC-style score ผสมกับตัวแปรบอร์ด 4 ตัว แล้วแปลงเป็น Innovation Alpha Score 0–100 รายไตรมาส — หน้านี้ใช้ดู ranking และ sensitivity ให้คุยในที่ประชุมง่าย</p>

  <div class="flow3">
    <div><b>1 · Prototype</b><span>Public text + board variables → Score 0–100</span></div>
    <div><b>2 · Technical validation</b><span>ซื้อ Top 10 รายไตรมาส เทียบ SET Index</span></div>
    <div><b>3 · Operational shortlist</b><span>รันไตรมาสล่าสุดเพื่อหา Top 5 ตรวจต่อ</span></div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="btnrow">
      <button class="btn p" id="btnSeedInv">＋ โหลดตัวอย่างคะแนน</button>
      <button class="btn s" id="btnGoUp">อัปโหลดรายงานประจำปีเพื่อเพิ่มเอง</button>
      <button class="btn s" id="btnInvCsv">ส่งออกตารางเรตติ้ง (CSV)</button>
      <button class="btn s" id="btnClearInv">ล้างรายการ</button>
      <div style="flex:1"></div>
      <div class="segbar engpick"></div>
    </div>
  </div>

  <div class="tiles" id="ivTiles"></div>
  <div class="split2">
    <div class="card"><h3>1 · ตารางเรตติ้งและคะแนนเติบโต</h3>
      <p class="desc">เรียงตามคะแนนรวม · คลิกแถวเพื่อดูการวิเคราะห์ความอ่อนไหวของหลักทรัพย์นั้น</p>
      <div id="ivBody"></div></div>
    <div class="card"><h3>2 · วิเคราะห์ความอ่อนไหว</h3>
      <p class="desc">ถ้าตัวแปรแต่ละตัวเปลี่ยนไป 1 ส่วนเบี่ยงเบนมาตรฐาน ค่าคาดการณ์จะเปลี่ยนกี่เปอร์เซ็นต์</p>
      <div id="ivSens"></div></div>
  </div>
</section>

<section class="pane" id="p-bt">
  <div class="kicker">คัดหุ้นลงทุน</div>
  <h2 class="sechead">Backtest ผลตอบแทน และทดสอบย้อนหลัง 5 ปี</h2>
  <p class="secsub">ทดสอบสองชั้น: 1) พอร์ตจำลองซื้อหุ้น Top 10 ตาม Innovation Alpha Score เทียบ SET Index และ 2) ตรวจความแม่นของโมเดลกับข้อมูลปีถัดไปที่ไม่เคยเห็น</p>
  <div class="card"><div class="btnrow" style="margin-bottom:14px"><div style="flex:1"></div><div class="segbar engpick"></div></div>
    <div id="btBody"></div></div>
</section>

<section class="pane" id="p-live">
  <div class="kicker">TRL 7</div>
  <h2 class="sechead">Top 5 หุ้นนวัตกรรมล่าสุด</h2>
  <p class="secsub">รันข้อมูลไตรมาสล่าสุดเพื่อหา shortlist สำหรับ operational validation เช่น landing page, Substack, LINE OA หรือ request API access</p>
  <div id="liveBody"></div>
</section>

<section class="pane" id="p-dm">
  <div class="kicker">ทั้งสองโหมด</div>
  <h2 class="sechead">ข้อมูลและโมเดล</h2>
  <p class="secsub">ที่เดียวสำหรับสองเรื่อง — เปลี่ยนสมการที่ระบบใช้ได้โดยไม่ต้องแก้โค้ด และติดตามว่าข้อมูลที่ต้องเก็บเพิ่มเหลืออีกเท่าไหร่</p>

  <div class="card" style="margin-bottom:14px"><h3>1 · ชุดโมเดลที่ระบบใช้อยู่</h3>
    <div id="dmModel"></div></div>

  <div class="card" style="margin-bottom:14px"><h3>2 · เสียบโมเดลจาก Python</h3>
    <p class="desc">ฟิตโมเดลด้วย Python ส่งออกเป็นไฟล์สัญญา แล้วลากเข้ามาที่นี่ ระบบจะตรวจไฟล์ก่อน ถ้าไม่ผ่านจะไม่เปลี่ยนอะไรเลย</p>
    <div class="dz" id="mdz"><div class="dzi">⇩</div>
      <div><b>ลากไฟล์ model.json มาวางที่นี่</b><br><span style="color:var(--greyl);font-size:11.5px">หรือคลิกเพื่อเลือกไฟล์ · อ่านในเบราว์เซอร์เท่านั้น ไม่ส่งขึ้นเซิร์ฟเวอร์</span></div></div>
    <input type="file" id="mdzFile" accept=".json,application/json" style="display:none">
    <div id="mdzOut"></div>
    <div class="btnrow" style="margin-top:14px">
      <button class="btn s" id="btnSpecEx">ไฟล์ตัวอย่าง example_model.json</button>
      <button class="btn s" id="btnSpecSchema">ข้อกำหนดไฟล์ (JSON Schema)</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px"><h3>3 · สเปกโมเดลชุดใหม่ (8 ตัวแปร)</h3>
    <div id="dmSpec"></div></div>

  <div class="card" style="margin-bottom:14px"><h3>4 · Python pipeline สำหรับ TRL 5-6</h3>
    <p class="desc">ใส่ข้อมูลรายไตรมาส 4 ไฟล์ แล้วรันคำสั่งนี้เพื่อสร้าง score, backtest Top 10 และอัปเดตหน้าเว็บ</p>
    <div class="cmd">python src/innovation_alpha_pipeline.py --text-csv data/set100_text.csv --board-csv data/set100_board.csv --returns-csv data/set100_returns.csv --benchmark-csv data/set_index_returns.csv --update-model</div>
    <div class="btnrow" style="margin-top:14px">
      <button class="btn s" id="btnTplText">template: public text</button>
      <button class="btn s" id="btnTplBoard">template: board variables</button>
      <button class="btn s" id="btnTplReturns">template: stock returns</button>
      <button class="btn s" id="btnTplBench">template: SET Index</button>
    </div>
  </div>

  <div class="card"><h3>5 · ตัวติดตามข้อมูลตรวจสอบ</h3>
    <div id="dmData"></div></div>
</section>`;

const CSS_V2 = `
.app-shell-ready header{position:fixed;left:0;top:0;bottom:0;width:260px;z-index:20;background:#fff;color:var(--ink);border-right:1px solid var(--line);box-shadow:0 12px 34px rgba(15,34,51,.08);padding:18px 0;overflow-y:auto}
.app-shell-ready .wrap{max-width:none;margin:0 0 0 260px;padding:24px 28px 90px}
.app-shell-ready .hrow{display:block;padding:0 18px;max-width:none}
.app-shell-ready .logo{margin-bottom:13px}
.app-shell-ready .logo span{border-radius:10px}
.app-shell-ready h1{font-size:17px;line-height:1.25;color:var(--ink)}
.app-shell-ready h1 span{display:block!important;margin-top:3px;color:var(--greyl)!important;font-size:11px!important}
.app-shell-ready .hsub{display:none}
.app-shell-ready .hspace{display:none}
.app-shell-ready .hbtn{width:100%;margin-top:8px;border-color:var(--line);color:var(--grey);border-radius:8px;text-align:center;background:#fff}
.app-shell-ready .hbtn:hover{border-color:var(--accent);color:var(--accent)}
.app-shell-ready .modebar{display:block;padding:14px 18px 8px;border-top:1px solid var(--line);margin-top:16px}
.app-shell-ready .modebar>span:first-child{display:block;margin-bottom:8px}
.app-shell-ready .modebar .mb{width:100%;border-radius:8px;text-align:left;margin:0 0 7px;padding:8px 11px;background:#f8fafb}
.app-shell-ready .modebar .mb.on{background:var(--ink);color:#fff}
.app-shell-ready .modebar .msub{display:block;margin-top:6px;line-height:1.45}
.app-shell-ready .steps{display:block;margin:10px 0 0;padding:0 12px;max-width:none;overflow:visible}
.app-shell-ready .navGroup{font-size:10px;font-weight:600;letter-spacing:1.2px;color:var(--greyl);text-transform:uppercase;margin:16px 8px 6px}
.app-shell-ready .step{width:100%;min-width:0;display:block;border:0;border-radius:9px;padding:10px 12px;margin:2px 0;color:var(--grey);background:transparent}
.app-shell-ready .step:hover{background:var(--mist);color:var(--ink)}
.app-shell-ready .step[aria-selected=true]{background:var(--mint);color:#0d7a5c;box-shadow:inset 3px 0 0 var(--accent)}
.app-shell-ready .step .n{font-size:10px;letter-spacing:.8px;color:inherit;opacity:.68}
.app-shell-ready .step .t{font-size:13px;margin-top:0;color:inherit}
.app-shell-ready footer{padding-left:0;padding-right:0}
.segbar{display:inline-flex;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;flex-wrap:wrap}
.segbar .segb{background:transparent;border:0;border-right:1px solid var(--line);padding:7px 13px;font:inherit;font-size:11.5px;color:var(--grey);cursor:pointer}
.segbar .segb:last-child{border-right:0}
.segbar .segb.on{background:var(--accent);color:#fff}
.modebar{display:flex;align-items:center;gap:10px;padding:0 20px 10px;flex-wrap:wrap}
.modebar .mb{background:transparent;border:1px solid var(--line);border-radius:999px;padding:6px 15px;font:inherit;font-size:12px;color:var(--grey);cursor:pointer}
.modebar .mb.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.modebar .msub{font-size:11.5px;color:var(--greyl)}
.tor{position:relative;height:19px;background:var(--mist);border-radius:5px}
.tor .mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)}
.tor .lft,.tor .rgt{position:absolute;top:3px;bottom:3px;border-radius:3px}
.tor .lft{background:var(--amber)}
.tor .rgt{background:var(--accent)}
.tor .tl,.tor .tr{position:absolute;top:2px;font-size:10.5px;color:var(--grey);background:rgba(255,255,255,.82);padding:0 3px;border-radius:3px}
.tor .tl{left:4px}
.tor .tr{right:4px}
.kv2{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}
.kv2>div{display:flex;justify-content:space-between;gap:10px;padding:8px 11px;background:var(--mist);border-radius:7px;font-size:12px}
.kv2>div span{color:var(--greyl)}
.prog{height:7px;background:var(--mist);border-radius:4px;overflow:hidden}
.prog.sm{height:6px;min-width:70px}
.prog>span{display:block;height:100%;background:var(--accent);border-radius:4px}
.softbox{border:1px solid var(--line);border-radius:10px;padding:14px 16px;background:#fff}
.eqchart{width:100%;height:auto;display:block;overflow:visible}
.split2{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;align-items:start}
@media(max-width:1000px){.split2{grid-template-columns:1fr}}
.flow3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px}
.flow3>div{border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px 14px;min-height:78px}
.flow3 b{display:block;font-size:13px;margin-bottom:6px;color:var(--ink)}
.flow3 span{display:block;font-size:12px;line-height:1.45;color:var(--grey)}
.cmd{font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--mist);border:1px solid var(--line);border-radius:7px;padding:10px 12px;overflow-x:auto;color:var(--ink)}
@media(max-width:900px){.flow3{grid-template-columns:1fr}}
tr.selrow{background:var(--mist)}
tr.selrow td{border-left:0}
tr.selrow td:first-child{box-shadow:inset 3px 0 0 var(--accent)}
.dz.over{border-color:var(--accent);background:var(--mint)}
.dzi{font-size:26px;color:var(--greyl);line-height:1}
.note.bad{background:var(--blush);color:#9c3550}
.note.bad b{color:#7d2740}
.note.bad code{background:#fff;padding:1px 5px;border-radius:4px;font-size:11px}
.step[hidden]{display:none!important}
.tscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -2px;padding:0 2px;max-width:100%}
/* grid item ตั้งต้นเป็น min-width:auto ทำให้คอลัมน์ยืดตามตาราง แทนที่จะให้ตารางเลื่อนเอง */
.split>*,.split2>*,.tiles>*,.pane .card{min-width:0}
@media(max-width:760px){.tscroll table{min-width:620px}}
@media(max-width:900px){
  .app-shell-ready header{position:static;width:auto;border-right:0;border-bottom:1px solid var(--line);box-shadow:none;padding:14px 0}
  .app-shell-ready .wrap{margin:0;padding:20px 16px 80px}
  .app-shell-ready .hrow{padding:0 16px}
  .app-shell-ready .modebar{padding:12px 16px 6px}
  .app-shell-ready .steps{display:flex;gap:8px;overflow-x:auto;padding:8px 16px 2px}
  .app-shell-ready .navGroup{display:none}
  .app-shell-ready .step{min-width:168px;margin:0}
  .app-shell-ready footer{padding-left:0;padding-right:0}
}
`;

/* ---------------------------------------------------------------- สลับโหมด */
function tabsOf(mode) { return MODES[mode].tabs.concat(SHARED); }
function syncNavGroups() {
  const kids = $$("nav.steps > *");
  kids.forEach((el, i) => {
    if (!el.classList.contains("navGroup")) return;
    let hasVisible = false;
    for (let j = i + 1; j < kids.length && !kids[j].classList.contains("navGroup"); j++) {
      if (kids[j].classList.contains("step") && !kids[j].hidden) hasVisible = true;
    }
    el.hidden = !hasVisible;
  });
}
function setMode(m, quiet) {
  if (!MODES[m]) return;
  S.mode = m;
  const allow = new Set(tabsOf(m));
  $$("nav.steps .step").forEach(b => b.hidden = !allow.has(b.dataset.p));
  syncNavGroups();
  $$(".modebar .mb").forEach(b => b.classList.toggle("on", b.dataset.m === m));
  const sub = $("#modeSub"); if (sub) sub.textContent = MODES[m].sub;
  const cur = ($$(".pane.on")[0] || {}).id?.slice(2);
  if (!quiet || !allow.has(cur)) go(MODES[m].tabs[0]);
  try { localStorage.setItem("ps_mode", m); } catch (e) { }
}

/** ให้ปุ่มแท็บที่ถูกซ่อนอยู่ พาไปโหมดที่มันสังกัดโดยอัตโนมัติ */
function modeOfPane(p) {
  for (const [k, v] of Object.entries(MODES)) if (v.tabs.includes(p)) return k;
  return null;
}

/* ---------------------------------------------------------------- ประกอบเข้าระบบ */
function bootV2() {
  // 1 · สไตล์
  const st = document.createElement("style"); st.textContent = CSS_V2; document.head.appendChild(st);

  // 2 · หน้าใหม่ (แทรกก่อน footer)
  const wrap = $("footer").parentNode;
  const box = document.createElement("div"); box.innerHTML = PANES_V2;
  while (box.firstElementChild) wrap.insertBefore(box.firstElementChild, $("footer"));

  // 3 · ปุ่มแท็บใหม่ + จัดลำดับตาม mode ก่อน shared
  const nav = $("header nav.steps");
  const mk = (p, kicker, lab) => {
    const b = document.createElement("button");
    b.className = "step"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", "false");
    b.dataset.p = p;
    b.innerHTML = `<span class="n">${kicker}</span><span class="t">${lab}</span>`;
    b.onclick = () => go(p);
    return b;
  };
  const existing = Object.fromEntries($$("nav.steps .step").map(b => [b.dataset.p, b]));
  const wanted = [
    ["group", "ประเมินองค์กร"],
    ["up", existing.up], ["mo", existing.mo], ["db", existing.db],
    ["group", "คัดหุ้นลงทุน"],
    ["iv", mk("iv", "TRL 5", "Innovation Alpha Score")],
    ["bt", mk("bt", "TRL 6", "Backtest เทียบ SET")],
    ["live", mk("live", "TRL 7", "Top 5 ล่าสุด")],
    ["group", "ระบบ"],
    ["dm", mk("dm", "ข้อมูล", "ข้อมูลและโมเดล")],
    ["mt", existing.mt], ["howto", existing.howto], ["guide", existing.guide],
  ];
  nav.innerHTML = "";
  wanted.forEach(([p, el]) => {
    if (p === "group") {
      const lab = document.createElement("div");
      lab.className = "navGroup";
      lab.textContent = el;
      nav.appendChild(lab);
      return;
    }
    if (el) { el.onclick = () => go(p); nav.appendChild(el); }
  });

  // 4 · แถบสลับโหมด
  const bar = document.createElement("div");
  bar.className = "modebar";
  bar.innerHTML = `<span style="font-size:11.5px;color:var(--greyl)">โหมดการใช้งาน</span>` +
    Object.entries(MODES).map(([k, v]) => `<button class="mb" data-m="${k}">${v.lab}</button>`).join("") +
    `<span class="msub" id="modeSub"></span>`;
  nav.parentNode.insertBefore(bar, nav);
  bar.querySelectorAll(".mb").forEach(b => b.onclick = () => setMode(b.dataset.m));

  // 5 · ให้ go() พาไปโหมดที่ถูกต้องเสมอ เมื่อเปิดจาก hash หรือจากลิงก์ภายใน
  const go0 = window.go;
  window.go = function (p, fromHash) {
    const m = modeOfPane(p);
    if (m && m !== S.mode) setMode(m, true);
    return go0(p, fromHash);
  };

  // 6 · ปุ่มในหน้าคัดหุ้น
  $("#btnSeedInv").onclick = seedInvest;
  $("#btnGoUp").onclick = () => { setMode("org", true); go("up"); };
  $("#btnClearInv").onclick = () => {
    if (!S.cands.length || !confirm("ล้างรายการเฝ้าดูทั้งหมด?")) return;
    S.cands.length = 0; S.sel = 0; renderInvest();
    if (typeof renderDashboard === "function") renderDashboard();
  };
  $("#btnInvCsv").onclick = () => {
    if (!S.cands.length) return alert("ยังไม่มีหลักทรัพย์ในรายการ");
    const head = ["ชื่อเรียก", "อุตสาหกรรม", "ปี", "เรตติ้ง", "คะแนนรวม", "คาดการณ์",
                  "ช่วงค่าจริง90_ล่าง", "ช่วงค่าจริง90_บน", "เปอร์เซ็นไทล์", "ศักยภาพเพิ่ม_%", "ชุดโมเดล"].join(",");
    const body = S.cands.map(c => { const r = scoreOf(c);
      return [`"${c.alias}"`, `"${c.industry}"`, c.year, r.grade, r.total, r.p.mu.toFixed(3),
              r.pi.lo, r.pi.hi, Math.round(r.pct), r.head.toFixed(1), S.engine].join(","); });
    dl("promosignal_rating.csv", "﻿" + [head, ...body].join("\n"), "text/csv;charset=utf-8");
  };

  // 6b · ห่อตารางของหน้าเดิมด้วย เมื่อแดชบอร์ดวาดใหม่
  if (typeof renderDashboard === "function") {
    const rd0 = renderDashboard;
    window.renderDashboard = function () {
      const r = rd0.apply(this, arguments);
      ["#rankTable", "#benchTable", "#engCmp"].forEach(wrapTables);
      return r;
    };
  }

  // 7 · ช่องเสียบโมเดล + เนื้อหา
  initModelDrop();
  initPipelineDownloads();
  renderModelSlot(); renderSpecSlot(); renderDataStatus();
  renderInvest(); renderBacktest(); renderLatestTop5();
  syncEngineButtons();
  document.body.classList.add("app-shell-ready");

  // 8 · โหมดเริ่มต้น — ถ้ามี hash ให้ hash ชนะ
  let m0 = "org";
  try { m0 = localStorage.getItem("ps_mode") || "org"; } catch (e) { }
  const h = location.hash.slice(1);
  setMode(modeOfPane(h) || m0, true);
  if (h && $("#p-" + h)) go(h, true);
}

// ให้ saveCandidate อัปเดตหน้าคัดหุ้นด้วย
if (typeof saveCandidate === "function") {
  const sc0 = saveCandidate;
  window.saveCandidate = function () { const r = sc0.apply(this, arguments); renderInvest(); return r; };
  const btn = document.getElementById("btnSaveCand");
  if (btn) btn.onclick = window.saveCandidate;
}

bootV2();
