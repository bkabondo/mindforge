"""MindForge card review (Python). Replaces app/api/cards/review/route.ts.
Applies the SM-2 spaced-repetition algorithm and updates the card."""
import base64
import json
import os
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
COOKIE_BASE = f"sb-{SUPABASE_URL.replace('https://', '').split('.')[0]}-auth-token"


def _http(method, url, headers=None, body=None, timeout=25):
    req = urllib.request.Request(url, data=(body.encode() if isinstance(body, str) else body), method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")


def _user(headers):
    ch = headers.get("cookie")
    if not ch:
        return None, None
    jar = SimpleCookie()
    try:
        jar.load(ch)
    except Exception:
        return None, None
    parts = []
    if COOKIE_BASE in jar:
        parts.append((-1, jar[COOKIE_BASE].value))
    i = 0
    while f"{COOKIE_BASE}.{i}" in jar:
        parts.append((i, jar[f"{COOKIE_BASE}.{i}"].value))
        i += 1
    if not parts:
        return None, None
    parts.sort(key=lambda p: p[0])
    raw = urllib.parse.unquote("".join(p[1] for p in parts))
    if raw.startswith("base64-"):
        raw = raw[len("base64-"):]
    try:
        tok = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)).decode("utf-8", "ignore")).get("access_token")
    except Exception:
        return None, None
    if not tok:
        return None, None
    s, t = _http("GET", f"{SUPABASE_URL}/auth/v1/user", {"apikey": ANON, "Authorization": f"Bearer {tok}"})
    if s != 200:
        return None, None
    try:
        return json.loads(t), tok
    except Exception:
        return None, None


def _rest(method, path, tok, body=None, extra=None):
    h = {"apikey": ANON, "Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    if extra:
        h.update(extra)
    return _http(method, f"{SUPABASE_URL}/rest/v1/{path}", h, json.dumps(body) if body is not None else None)


def sm2(quality, repetitions, interval, ease):
    if quality >= 3:
        new_interval = 1 if repetitions == 0 else (6 if repetitions == 1 else round(interval * ease))
        new_ef = max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        return {"interval": new_interval, "repetitions": repetitions + 1, "easeFactor": new_ef}
    return {"interval": 1, "repetitions": 0, "easeFactor": max(1.3, ease - 0.2)}


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        b = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        try:
            user, tok = _user(self.headers)
            if not user:
                return self._json(401, {"error": "Unauthorized"})
            length = int(self.headers.get("content-length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            card_id, quality = body.get("cardId"), body.get("quality")
            if not card_id or quality is None:
                return self._json(400, {"error": "Missing cardId or quality"})
            if quality < 1 or quality > 5:
                return self._json(400, {"error": "Quality must be between 1 and 5"})

            s, t = _rest("GET", f"mindforge_cards?id=eq.{urllib.parse.quote(str(card_id))}&user_id=eq.{user['id']}&select=*", tok)
            cards = json.loads(t or "[]") if s < 400 else []
            if not cards:
                return self._json(404, {"error": "Card not found"})
            card = cards[0]

            r = sm2(quality, card.get("repetitions", 0), card.get("interval", 1), card.get("difficulty", 2.5))
            nxt = (datetime.now(timezone.utc) + timedelta(days=r["interval"])).isoformat()
            s2, t2 = _rest("PATCH", f"mindforge_cards?id=eq.{urllib.parse.quote(str(card_id))}&user_id=eq.{user['id']}", tok, {
                "difficulty": r["easeFactor"], "interval": r["interval"],
                "repetitions": r["repetitions"], "next_review": nxt,
            })
            if s2 >= 400:
                return self._json(500, {"error": t2})
            return self._json(200, {"success": True, "nextReview": nxt, "interval": r["interval"]})
        except Exception as err:  # noqa: BLE001
            return self._json(500, {"error": "Internal server error"})
