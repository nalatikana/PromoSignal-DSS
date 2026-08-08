"""PromoSignal DSS — FastAPI backend

เชื่อมหน้าเว็บกับโมเดล Python จริง (statsmodels Negative Binomial)
รัน:  uvicorn dss_api.app:app --reload --port 8000
แล้วเปิด http://127.0.0.1:8000

Endpoint
  GET  /                     หน้าเว็บ DSS
  GET  /api/model            ข้อมูลโมเดลทั้งสองชุดโมเดล + ค่าอ้างอิง
  POST /api/extract          อัปโหลดไฟล์ → สกัดสารผู้บริหาร + นับคำ + นับนวัตกรรม
  POST /api/predict          ค่าที่กรอก → ค่าคาดการณ์ + CI + เปอร์เซ็นไทล์ + ความไว
  POST /api/rank             รายการผู้สมัคร → จัดอันดับ
  POST /api/report           รายการผู้สมัคร → รายงาน HTML
"""
from __future__ import annotations

import io
import json
import math
import re
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "out" / "dss_model.json"
HTML_PATH = ROOT / "out" / "PromoSignal_DSS.html"
LEX_PATH = Path(__file__).resolve().parent / "lexicon.json"

if not MODEL_PATH.is_file():
    raise SystemExit(f"ไม่พบ {MODEL_PATH} — รัน  python3 src/export_dss_model.py  ก่อน")

M: dict[str, Any] = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
LEX: dict[str, Any] = json.loads(LEX_PATH.read_text(encoding="utf-8"))

app = FastAPI(title="PromoSignal DSS", version="0.1.0",
              description="ต้นแบบระบบสนับสนุนการตัดสินใจ — ไม่ใช่ระบบ production")


# ==================================================================== โมเดล
def _design_vec(eng: dict, f: dict[str, float]) -> np.ndarray:
    """สร้างเวกเตอร์ดีไซน์ตามลำดับ cov_order (ต้องตรงกับฝั่งเบราว์เซอร์เป๊ะ)"""
    out = []
    for term in eng["cov_order"]:
        if term == "Intercept":
            out.append(1.0)
            continue
        v = 1.0
        for part in term.split(":"):
            k = part[2:] if part.startswith("c_") else part
            x = f.get(k)
            if x is None or (isinstance(x, float) and math.isnan(x)):
                x = M["center"][k]
            v *= float(x) - M["center"][k]
        out.append(v)
    return np.array(out, dtype=float)


def predict(engine: str, f: dict[str, float], industry: str, year: int) -> dict:
    """ค่าคาดการณ์ + ช่วงความเชื่อมั่น 95% (delta method บนสเกล log)"""
    if engine not in M["engines"]:
        raise HTTPException(400, f"ไม่รู้จักชุดโมเดล {engine} (มีให้เลือก: A, B)")
    eng = M["engines"][engine]
    x = _design_vec(eng, f)
    beta = np.array([eng["intercept"] if t == "Intercept" else eng["coef"][t]
                     for t in eng["cov_order"]], dtype=float)
    lp = float(x @ beta)
    lp += eng["base_industry"].get(industry, 0.0)
    lp += eng["base_year"].get(str(year), eng["base_year"].get(year, 0.0))
    V = np.array(eng["cov"], dtype=float)
    se = float(np.sqrt(max(x @ V @ x, 0.0)))
    q = M["universe"][engine]["quantiles"]
    edges = M["universe"][engine]["quintile_edges"]
    mu = math.exp(lp)
    return {
        "mu": round(mu, 4),
        "lo": round(math.exp(lp - 1.96 * se), 4),
        "hi": round(math.exp(lp + 1.96 * se), 4),
        "se_log": round(se, 5),
        "percentile": round(_pct_of(mu, q), 1),
        "quintile": _quintile(mu, edges),
    }


def _pct_of(v: float, arr: list[float]) -> float:
    if v <= arr[0]:
        return 0.0
    if v >= arr[100]:
        return 100.0
    lo, hi = 0, 100
    while lo < hi - 1:
        mid = (lo + hi) // 2
        if arr[mid] <= v:
            lo = mid
        else:
            hi = mid
    span = arr[hi] - arr[lo] or 1.0
    return lo + (v - arr[lo]) / span


def _quintile(v: float, edges: list[float]) -> int:
    for i, e in enumerate(edges):
        if v < e:
            return i + 1
    return 5


def sensitivity(engine: str, f: dict, industry: str, year: int) -> list[dict]:
    """ผลของการเพิ่มแต่ละตัวแปร 1 SD — เรียงตามขนาดผล"""
    eng = M["engines"][engine]
    base = predict(engine, f, industry, year)["mu"]
    ctrl = set(M["controls"])
    keys = [t[2:] for t in eng["vars"] if ":" not in t and t[2:] not in ctrl]
    rows = []
    for k in keys:
        r = M["ranges"].get(k)
        if not r:
            continue
        step = 1.0 if k == "pol_tie" else r["sd"]
        f2 = dict(f)
        f2[k] = float(f.get(k, M["center"][k])) + step
        mu2 = predict(engine, f2, industry, year)["mu"]
        pvals = [eng["p"][t] for t in eng["vars"] if ("c_" + k) in t]
        rows.append({"var": k, "step": round(step, 3),
                     "pct_change": round((mu2 / base - 1) * 100, 2),
                     "p": round(min(pvals), 4) if pvals else None,
                     "significant_5pct": bool(pvals and min(pvals) < .05)})
    return sorted(rows, key=lambda r: -abs(r["pct_change"]))


# ==================================================================== ข้อความ
def _count_words(t: str) -> int:
    latin = len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'’\-]*", t))
    thai = len(re.findall(r"[฀-๿]", t))
    return latin + round(thai / 4.2)


def _count_hits(t: str, words: list[str]) -> tuple[int, dict[str, int]]:
    low = t.lower()
    n, found = 0, {}
    for w in words:
        c = low.count(w.lower())
        if c:
            n += c
            found[w] = c
    return n, found


def slice_statement(text: str) -> tuple[str, str | None]:
    low = text.lower()
    start, head = -1, None
    for h in LEX["statementHeads"]:
        i = low.find(h.lower())
        if i != -1 and (start == -1 or i < start):
            start, head = i, h
    if start == -1:
        return "", None
    end = len(text)
    for e in LEX["statementEnds"]:
        i = low.find(e.lower(), start + 200)
        if i != -1 and i < end:
            end = i
    end = min(end, start + 40000)
    return text[start:end].strip(), head


def analyse(statement: str, full: str) -> dict:
    pro_n, pro_f = _count_hits(statement, LEX["promotion"]["th"] + LEX["promotion"]["en"])
    pre_n, pre_f = _count_hits(statement, LEX["prevention"]["th"] + LEX["prevention"]["en"])
    denom = (pro_n + pre_n) or 1
    ratio = (pro_n - pre_n) / denom
    I = M["liwc"]["intensity_median"]
    inv = {k: _count_hits(full, LEX["innovation"][k]["th"] + LEX["innovation"][k]["en"])[0]
           for k in ("product", "service", "process", "partner")}
    return {
        "word_count": _count_words(statement),
        "promotion_hits": pro_n, "prevention_hits": pre_n,
        "tone_ratio": round(ratio, 4),
        "promotion": round(I * (1 + ratio) / 2, 4),
        "prevention": round(I * (1 - ratio) / 2, 4),
        "promotion_percentile": round(_pct_of(I * (1 + ratio) / 2, M["liwc"]["promotion_q"]), 1),
        "top_promotion": sorted(pro_f.items(), key=lambda x: -x[1])[:10],
        "top_prevention": sorted(pre_f.items(), key=lambda x: -x[1])[:10],
        "innovation": inv,
        "innovation_total": sum(inv.values()),
        "open_innovation_actual": inv["partner"],
    }


def read_upload(name: str, blob: bytes) -> tuple[str, int]:
    low = name.lower()
    if low.endswith(".pdf"):
        try:
            from pypdf import PdfReader
        except ImportError:
            raise HTTPException(500, "ต้องติดตั้ง pypdf ก่อน:  pip install pypdf")
        r = PdfReader(io.BytesIO(blob))
        return "\n".join((p.extract_text() or "") for p in r.pages), len(r.pages)
    if low.endswith(".docx"):
        try:
            from docx import Document
        except ImportError:
            raise HTTPException(500, "ต้องติดตั้ง python-docx ก่อน:  pip install python-docx")
        doc = Document(io.BytesIO(blob))
        return "\n".join(p.text for p in doc.paragraphs), 0
    return blob.decode("utf-8", errors="ignore"), 0


# ==================================================================== schema
class Form(BaseModel):
    promotion: float | None = None
    female_pct: float | None = None
    pol_tie: float | None = 0
    wa_board_tenure: float | None = None
    indep_pct: float | None = None
    board_size: float | None = None
    ln_assets: float | None = None
    firm_age: float | None = None
    roa: float | None = None
    de_ratio_w: float | None = None


class PredictReq(BaseModel):
    engine: str = Field("B", pattern="^[AB]$")
    industry: str
    year: int
    form: Form
    with_sensitivity: bool = True


class Candidate(BaseModel):
    alias: str
    industry: str
    year: int
    form: Form
    actual: float | None = None


class RankReq(BaseModel):
    engine: str = Field("B", pattern="^[AB]$")
    candidates: list[Candidate]


# ==================================================================== routes
@app.get("/", response_class=HTMLResponse)
def home():
    if HTML_PATH.is_file():
        return FileResponse(HTML_PATH)
    return HTMLResponse("<h1>PromoSignal DSS API</h1><p>รัน <code>python3 src/build_dss.py</code> "
                        "เพื่อสร้างหน้าเว็บ หรือดูเอกสาร API ที่ <a href='/docs'>/docs</a></p>")


@app.get("/api/model")
def get_model():
    return {"meta": M["meta"], "center": M["center"], "controls": M["controls"],
            "industries": sorted(M["industry"].keys()), "years": M["meta"]["years"],
            "ranges": M["ranges"], "industry_stats": M["industry"],
            "engines": {k: {"label": v["label"], "n": v["n"], "pseudo_r2": v["pseudo_r2"],
                            "oos": v["oos"],
                            "terms": [{"term": t, "coef": round(v["coef"][t], 6),
                                       "se": round(v["se"][t], 6), "p": round(v["p"][t], 4),
                                       "significant_5pct": v["p"][t] < .05} for t in v["vars"]]}
                        for k, v in M["engines"].items()}}


@app.post("/api/extract")
async def extract(file: UploadFile = File(...)):
    blob = await file.read()
    if len(blob) > 90 * 1024 * 1024:
        raise HTTPException(413, "ไฟล์ใหญ่เกิน 90 MB")
    text, pages = read_upload(file.filename or "upload.txt", blob)
    text = re.sub(r"\n{3,}", "\n\n", text.replace(" ", " "))
    stmt, head = slice_statement(text)
    res = analyse(stmt or text[:6000], text)
    return {"filename": file.filename, "pages": pages, "bytes": len(blob),
            "statement_head": head, "statement": (stmt or text[:6000])[:20000],
            "full_word_count": _count_words(text), **res}


@app.post("/api/predict")
def do_predict(req: PredictReq):
    f = {k: v for k, v in req.form.model_dump().items() if v is not None}
    if req.industry not in M["industry"]:
        raise HTTPException(400, f"ไม่รู้จักอุตสาหกรรม {req.industry}")
    out = {"engine": req.engine, "industry": req.industry, "year": req.year,
           "prediction": predict(req.engine, f, req.industry, req.year),
           "industry_median_open_innovation": M["industry"][req.industry]["oi_median"],
           "warnings": []}
    for k, v in f.items():
        r = M["ranges"].get(k)
        if r and (v < r["p05"] or v > r["p95"]):
            out["warnings"].append(
                f"{k} = {v} อยู่นอกช่วงข้อมูลที่พบจริง ({r['p05']}–{r['p95']}) — เป็นการคาดนอกช่วงข้อมูล")
    if req.with_sensitivity:
        out["sensitivity"] = sensitivity(req.engine, f, req.industry, req.year)
    out["disclaimer"] = ("ผลลัพธ์เป็นการคาดการณ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง ไม่ใช่ความสัมพันธ์เชิงสาเหตุ "
                         "และไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน")
    return out


@app.post("/api/rank")
def do_rank(req: RankReq):
    rows = []
    for c in req.candidates:
        f = {k: v for k, v in c.form.model_dump().items() if v is not None}
        rows.append({"alias": c.alias, "industry": c.industry, "year": c.year,
                     "actual": c.actual,
                     "A": predict("A", f, c.industry, c.year),
                     "B": predict("B", f, c.industry, c.year)})
    rows.sort(key=lambda r: -r[req.engine]["mu"])
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    flips = sum(1 for r in rows if r["A"]["quintile"] != r["B"]["quintile"])
    return {"engine": req.engine, "n": len(rows), "ranking": rows,
            "quintile_flips_between_engines": flips,
            "note": ("อันดับเปลี่ยนเมื่อสลับชุดโมเดล — ข้อสรุปขึ้นกับสมมติฐานของโมเดล"
                     if flips else "ทั้งสองชุดโมเดลให้ข้อสรุปตรงกัน")}


@app.post("/api/report", response_class=HTMLResponse)
def do_report(req: RankReq):
    r = do_rank(req)
    head = "".join(f"<th>{h}</th>" for h in
                   ["#", "ชื่อเรียก", "อุตสาหกรรม", "ปี", "คาดการณ์ A", "A 95%", "A Q",
                    "คาดการณ์ B", "B 95%", "B Q", "ค่าจริง"])
    body = "".join(
        f"<tr><td>{x['rank']}</td><td>{x['alias']}</td><td>{x['industry']}</td><td>{x['year']}</td>"
        f"<td>{x['A']['mu']}</td><td>{x['A']['lo']}–{x['A']['hi']}</td><td>Q{x['A']['quintile']}</td>"
        f"<td>{x['B']['mu']}</td><td>{x['B']['lo']}–{x['B']['hi']}</td><td>Q{x['B']['quintile']}</td>"
        f"<td>{'' if x['actual'] is None else x['actual']}</td></tr>" for x in r["ranking"])
    return HTMLResponse(f"""<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<title>PromoSignal — รายงาน</title><style>
body{{font-family:"Kanit","Sarabun",system-ui,sans-serif;font-weight:300;max-width:1050px;margin:34px auto;padding:0 22px;color:#0f2233;line-height:1.65}}
h1{{font-size:22px;font-weight:600;margin:0 0 4px}}p{{font-size:13px;color:#5c6b78}}
table{{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}}
th{{text-align:left;background:#edf1f5;padding:6px 8px;font-weight:500}}td{{padding:5px 8px;border-bottom:1px solid #eef1f4}}
.note{{background:#fceef1;border-radius:9px;padding:12px 15px;font-size:12px;margin-top:18px}}</style></head><body>
<h1>PromoSignal — รายงานผลการวิเคราะห์</h1>
<p>ชุดโมเดลที่ใช้จัดอันดับ: {r['engine']} · ผู้สมัคร/บริษัท {r['n']} ราย · {r['note']}</p>
<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>
<div class="note"><b>ข้อจำกัด</b><br>
1. โมเดลจับความสัมพันธ์เชิงสหสัมพันธ์จากข้อมูลย้อนหลัง 5 ปี ไม่ใช่ความสัมพันธ์เชิงสาเหตุ<br>
2. ชุดโมเดล A ใช้ตัวแปรกำกับที่ไม่มีนัยสำคัญทางสถิติในข้อมูลชุดนี้ (p = 0.80 และ 0.27)<br>
3. ตัวแปรตามนับจากการประกาศในรายงานประจำปี ไม่ใช่นวัตกรรมจริง<br>
4. ต้นแบบนี้ไม่ใช่ระบบ production และไม่ใช่คำแนะนำการลงทุนหรือการจ้างงาน</div>
</body></html>""")


@app.get("/api/health")
def health():
    return {"ok": True, "model_built": M["meta"]["built"], "engines": list(M["engines"])}
