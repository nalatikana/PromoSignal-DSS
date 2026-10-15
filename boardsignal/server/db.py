# -*- coding: utf-8 -*-
"""ฐานข้อมูลกลางของ OpenInnoScore — เก็บผู้ใช้ ผลแบบสอบถาม/แบบประเมิน และบันทึกการใช้งาน (audit log)

ค่าเริ่มต้น: SQLite (ไลบรารีมาตรฐานของ Python) ที่ env DB_PATH (ค่าเริ่มต้น ./data/ois.db)
  บน Render ให้ต่อ persistent disk ที่ /var/data แล้วตั้ง DB_PATH=/var/data/ois.db (ดู render.yaml)
ทางเลือก: PostgreSQL เมื่อตั้ง env DATABASE_URL=postgres://… และติดตั้ง psycopg (v3) ได้
  ถ้า import psycopg ไม่ได้ จะเตือนแล้วกลับไปใช้ SQLite
  (ส่วน PostgreSQL ยังไม่ได้ทดสอบกับฐานข้อมูลจริง — SQL เขียนแบบพื้นฐานที่ใช้ได้ทั้งสองระบบ)

ตาราง
  users(id, email UNIQUE, name, provider, role, created, last_login, plan)
                                                                      plan = free | pro | max (ผู้ดูแลตั้งผ่าน /api/admin/users/{id}/plan)
  responses(id, user_id, kind, ticker, payload, created, client_id)   payload = JSON (TEXT)
  events(id, user_id, kind, detail, created)                          บันทึกการเข้าสู่ระบบ/การเรียก API
  survey_arms(user_id PK, arm, created)                               กลุ่ม A/B ของแบบสอบถามที่เซิร์ฟเวอร์ออกให้ (หนึ่งแถวต่อบัญชี)
เวลาเก็บเป็น ISO-8601 UTC (TEXT) เพื่อให้ส่งออก CSV/อ่านใน Excel ได้ตรง ๆ
"""
import json
import logging
import os
import sqlite3
import threading

from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger("ois.db")

KINDS = ("survey", "rfq", "bodset", "bod_oi", "approval", "dict", "feedback")
PLANS = ("free", "pro", "max")          # ป้ายบนหน้าจอ: Basic · Pro · Pro Max (ค่าภายในยังเป็น free)

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
         id {pk}, email TEXT NOT NULL UNIQUE, name TEXT, provider TEXT, role TEXT DEFAULT 'user',
         created TEXT NOT NULL, last_login TEXT)""",
    """CREATE TABLE IF NOT EXISTS responses (
         id {pk}, user_id INTEGER NOT NULL, kind TEXT NOT NULL, ticker TEXT, payload {json} NOT NULL,
         created TEXT NOT NULL, client_id TEXT)""",
    "CREATE INDEX IF NOT EXISTS ix_resp_kind ON responses(kind, created)",
    "CREATE INDEX IF NOT EXISTS ix_resp_user ON responses(user_id, kind)",
    """CREATE TABLE IF NOT EXISTS events (
         id {pk}, user_id INTEGER, kind TEXT NOT NULL, detail TEXT, created TEXT NOT NULL)""",
    "CREATE INDEX IF NOT EXISTS ix_ev_created ON events(created)",
    """CREATE TABLE IF NOT EXISTS survey_arms (
         user_id INTEGER PRIMARY KEY, arm TEXT NOT NULL, created TEXT NOT NULL)""",
]


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class DB:
    """ตัวห่อบาง ๆ ให้ SQLite และ PostgreSQL ใช้ API เดียวกัน (placeholder ใช้ '?' แล้วแปลงเป็น %s สำหรับ PG)"""

    def __init__(self, path=None, url=None):
        self.lock = threading.Lock()
        self.kind = "sqlite"
        url = url if url is not None else os.environ.get("DATABASE_URL", "")
        if url.startswith(("postgres://", "postgresql://")):
            try:
                import psycopg  # noqa: F401  (psycopg v3)
                self.kind = "postgres"
                self._pg_url = url
            except Exception as e:  # noqa: BLE001
                log.warning("ตั้ง DATABASE_URL แล้วแต่ import psycopg ไม่ได้ (%s) — ใช้ SQLite แทน", type(e).__name__)
        if self.kind == "sqlite":
            p = Path(path or os.environ.get("DB_PATH") or "./data/ois.db")
            p.parent.mkdir(parents=True, exist_ok=True)
            self.path = str(p)
            self.conn = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA journal_mode=WAL")
            self.conn.execute("PRAGMA foreign_keys=ON")
            pk, js = "INTEGER PRIMARY KEY AUTOINCREMENT", "TEXT"
        else:
            self.path = "postgres"
            self.conn = self._pg_connect()
            pk, js = "BIGSERIAL PRIMARY KEY", "JSONB"
        for s in SCHEMA:
            self._exec(s.format(pk=pk, json=js))
        self._migrate()
        log.info("database: %s", self.kind if self.kind == "postgres" else f"sqlite {self.path}")

    def _migrate(self):
        """เพิ่มคอลัมน์ที่มาทีหลังให้ฐานข้อมูลเดิม (ไม่ลบข้อมูล)"""
        if self.kind == "postgres":
            self._exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'")
            self._exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_set INTEGER DEFAULT 0")
            return
        cols = {r["name"] for r in self._exec("PRAGMA table_info(users)", fetch="all")}
        if "plan" not in cols:
            self._exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'")
        if "plan_set" not in cols:
            self._exec("ALTER TABLE users ADD COLUMN plan_set INTEGER DEFAULT 0")

    def ping(self):
        """ตรวจการเชื่อมต่อจริง (ใช้ใน /api/integrations)"""
        try:
            return self._exec("SELECT 1 AS ok", fetch="one") is not None
        except Exception:  # noqa: BLE001
            return False

    # ---------------------------------------------------------------- ระดับล่าง
    def _pg_connect(self):
        import psycopg
        from psycopg.rows import dict_row
        return psycopg.connect(self._pg_url, autocommit=True, row_factory=dict_row)

    def _sql(self, q):
        return q.replace("?", "%s") if self.kind == "postgres" else q

    def _exec(self, q, args=(), fetch=None):
        with self.lock:
            if self.kind == "postgres":
                try:
                    cur = self.conn.execute(self._sql(q), args)
                except Exception:  # noqa: BLE001  การเชื่อมต่อหลุด → ต่อใหม่หนึ่งครั้ง
                    self.conn = self._pg_connect()
                    cur = self.conn.execute(self._sql(q), args)
            else:
                cur = self.conn.execute(q, args)
            if fetch == "one":
                r = cur.fetchone()
                return dict(r) if r else None
            if fetch == "all":
                return [dict(r) for r in cur.fetchall()]
            if fetch == "id":
                r = cur.fetchone()
                return (r["id"] if self.kind == "postgres" else r[0]) if r else None
            return None

    def _insert(self, q, args):
        """INSERT … RETURNING id (SQLite ≥ 3.35 และ PostgreSQL รองรับเหมือนกัน)"""
        return self._exec(q + " RETURNING id", args, fetch="id")

    # ---------------------------------------------------------------- ผู้ใช้
    def upsert_user(self, email, name, provider, role="user"):
        email = (email or "").strip().lower()[:254]
        t = now_iso()
        u = self._exec("SELECT * FROM users WHERE email = ?", (email,), fetch="one")
        if u:
            self._exec("UPDATE users SET name = ?, provider = ?, role = ?, last_login = ? WHERE id = ?",
                       ((name or u["name"] or "")[:120], provider, role, t, u["id"]))
            u.update(name=(name or u["name"] or "")[:120], provider=provider, role=role, last_login=t)
            return u
        uid = self._insert("INSERT INTO users (email, name, provider, role, created, last_login) VALUES (?, ?, ?, ?, ?, ?)",
                           (email, (name or "")[:120], provider, role, t, t))
        return {"id": uid, "email": email, "name": name, "provider": provider, "role": role, "created": t, "last_login": t}

    def get_user(self, uid):
        return self._exec("SELECT * FROM users WHERE id = ?", (int(uid),), fetch="one")

    def set_plan(self, uid, plan):
        if plan not in PLANS:
            raise ValueError("plan")
        self._exec("UPDATE users SET plan = ?, plan_set = 1 WHERE id = ?", (plan, int(uid)))
        return self.get_user(uid)

    def users(self):
        return self._exec("""SELECT u.id, u.email, u.name, u.provider, u.role, COALESCE(u.plan, 'free') AS plan, u.created, u.last_login,
                                    (SELECT COUNT(*) FROM responses r WHERE r.user_id = u.id) AS n_responses
                             FROM users u ORDER BY u.id""", fetch="all")

    # ---------------------------------------------------------------- ผลแบบสอบถาม
    def add_response(self, user_id, kind, payload, ticker=None, client_id=None):
        return self._insert("INSERT INTO responses (user_id, kind, ticker, payload, created, client_id) VALUES (?, ?, ?, ?, ?, ?)",
                            (user_id, kind, ticker, json.dumps(payload, ensure_ascii=False), now_iso(), client_id))

    @staticmethod
    def _decode(rows):
        for r in rows:
            p = r.get("payload")
            if isinstance(p, str):
                try:
                    r["payload"] = json.loads(p)
                except ValueError:
                    pass
        return rows

    def mine(self, user_id, kind=None, limit=200):
        q, a = "SELECT id, kind, ticker, payload, created, client_id FROM responses WHERE user_id = ?", [user_id]
        if kind:
            q += " AND kind = ?"; a.append(kind)
        return self._decode(self._exec(q + " ORDER BY id DESC LIMIT ?", (*a, int(limit)), fetch="all"))

    def responses(self, kind=None, limit=20000):
        q = """SELECT r.id, r.kind, r.ticker, r.created, r.client_id, r.user_id, u.email, u.name, u.provider, r.payload
               FROM responses r LEFT JOIN users u ON u.id = r.user_id"""
        a = []
        if kind:
            q += " WHERE r.kind = ?"; a.append(kind)
        return self._decode(self._exec(q + " ORDER BY r.id LIMIT ?", (*a, int(limit)), fetch="all"))

    # ---------------------------------------------------------------- กลุ่ม A/B ของแบบสอบถาม (เซิร์ฟเวอร์ออกให้)
    def survey_arm_of(self, user_id):
        r = self._exec("SELECT arm FROM survey_arms WHERE user_id = ?", (int(user_id),), fetch="one")
        return r["arm"] if r else None

    def survey_arm_set(self, user_id, arm):
        """บันทึกกลุ่มครั้งแรกเท่านั้น (ON CONFLICT DO NOTHING) แล้วคืนกลุ่มที่เก็บจริง — กันการจัดซ้ำเมื่อเรียกพร้อมกัน"""
        self._exec("INSERT INTO survey_arms (user_id, arm, created) VALUES (?, ?, ?) ON CONFLICT (user_id) DO NOTHING",
                   (int(user_id), arm, now_iso()))
        return self.survey_arm_of(user_id)

    def survey_arm_counts(self):
        return {r["arm"]: int(r["n"]) for r in self._exec("SELECT arm, COUNT(*) AS n FROM survey_arms GROUP BY arm", fetch="all")}

    # ---------------------------------------------------------------- บันทึกการใช้งาน
    def event(self, user_id, kind, detail=None):
        try:
            d = detail if isinstance(detail, str) or detail is None else json.dumps(detail, ensure_ascii=False)
            self._exec("INSERT INTO events (user_id, kind, detail, created) VALUES (?, ?, ?, ?)",
                       (user_id, kind[:40], (d or "")[:1000], now_iso()))
        except Exception as e:  # noqa: BLE001  log ห้ามทำให้คำขอหลักล้ม
            log.warning("event log failed: %s", type(e).__name__)

    def events(self, limit=500):
        return self._exec("SELECT * FROM events ORDER BY id DESC LIMIT ?", (int(limit),), fetch="all")

    def summary(self):
        since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
        per = self._exec("SELECT kind, COUNT(*) AS n, COUNT(DISTINCT user_id) AS users FROM responses GROUP BY kind", fetch="all")
        last7 = self._exec("SELECT kind, COUNT(*) AS n FROM responses WHERE created >= ? GROUP BY kind", (since,), fetch="all")
        ev7 = self._exec("SELECT kind, COUNT(*) AS n FROM events WHERE created >= ? GROUP BY kind", (since,), fetch="all")
        nu = self._exec("SELECT COUNT(*) AS n FROM users", fetch="one")["n"]
        au = self._exec("SELECT COUNT(*) AS n FROM users WHERE last_login >= ?", (since,), fetch="one")["n"]
        by = {k: {"total": 0, "users": 0, "last7d": 0} for k in KINDS}
        for r in per:
            by.setdefault(r["kind"], {"total": 0, "users": 0, "last7d": 0}).update(total=r["n"], users=r["users"])
        for r in last7:
            by.setdefault(r["kind"], {"total": 0, "users": 0, "last7d": 0})["last7d"] = r["n"]
        return {"db": self.kind, "users": nu, "active_users_7d": au, "responses": by,
                "responses_total": sum(v["total"] for v in by.values()),
                "events_7d": {r["kind"]: r["n"] for r in ev7}, "generated": now_iso()}


def flatten(rows):
    """แปลงแถว responses เป็นตารางแบน: payload ถูกกระจายหนึ่งชั้น (payload.<key>) ค่าที่ซ้อนลึกกว่าเป็น JSON"""
    cols, out = ["id", "kind", "ticker", "created", "client_id", "user_id", "email", "name", "provider"], []
    pkeys = []
    for r in rows:
        flat = {k: r.get(k) for k in cols}
        p = r.get("payload")
        if isinstance(p, dict):
            for k, v in p.items():
                key = "payload." + str(k)
                if key not in pkeys:
                    pkeys.append(key)
                flat[key] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v
        else:
            if "payload" not in pkeys:
                pkeys.append("payload")
            flat["payload"] = json.dumps(p, ensure_ascii=False)
        out.append(flat)
    return cols + pkeys, out


def to_csv(rows):
    """CSV แบบ UTF-8 มี BOM (Excel ภาษาไทยเปิดได้ถูกต้อง) — ใช้กับ SPSS/Excel/R"""
    import csv
    import io
    header, flat = flatten(rows)
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(header)
    for f in flat:
        row = []
        for h in header:
            v = f.get(h)
            v = "" if v is None else str(v)
            if v[:1] in ("=", "+", "-", "@") and not _is_number(v):   # กัน CSV/formula injection ใน Excel
                v = "'" + v
            row.append(v)
        w.writerow(row)
    return "﻿" + buf.getvalue()


def _is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False


_db = None
_db_lock = threading.Lock()


def get_db():
    global _db
    with _db_lock:
        if _db is None:
            _db = DB()
        return _db


def reset_db(path=None):
    """สำหรับการทดสอบ — เปิดฐานข้อมูลใหม่ที่ path"""
    global _db
    with _db_lock:
        _db = DB(path=path, url="")
        return _db


if __name__ == "__main__":
    # python3 -m server.db  → พิมพ์สรุปฐานข้อมูล (ใช้ตรวจหลัง restore backup)
    print(json.dumps(get_db().summary(), ensure_ascii=False, indent=1))

