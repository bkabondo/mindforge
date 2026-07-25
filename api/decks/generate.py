"""MindForge deck generation (Python). Replaces app/api/decks/generate/route.ts.
AI-generates flashcards; guest mode returns them unsaved, authed mode saves deck+cards."""
import base64
import json
import os
import re
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler

import anthropic

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
COOKIE_BASE = f"sb-{SUPABASE_URL.replace('https://', '').split('.')[0]}-auth-token"
MODEL = "claude-haiku-4-5-20251001"


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
            user, tok = _user(self.headers)  # optional (guest mode allowed)
            length = int(self.headers.get("content-length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            name, description, source = body.get("name"), body.get("description"), body.get("sourceText")
            if not name or not source:
                return self._json(400, {"error": "Name and source text are required"})

            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            msg = client.messages.create(model=MODEL, max_tokens=2048, messages=[{
                "role": "user",
                "content": ('Generate flashcards from this text. Return ONLY a JSON array with no markdown, '
                            'no explanation, just the raw JSON array: [{"front":"question","back":"answer"}]\n\n'
                            'Generate 10-15 high-quality flashcards covering the key concepts, definitions, '
                            f'and important facts from this text:\n\n{source}'),
            }])
            text = "".join(b.text for b in (msg.content or []) if getattr(b, "type", None) == "text").strip()
            m = re.search(r"\[[\s\S]*\]", text)
            if not m:
                return self._json(500, {"error": "Failed to parse AI response"})
            cards = json.loads(m.group(0))
            if not isinstance(cards, list) or not cards:
                return self._json(500, {"error": "No cards generated"})

            if not user:
                return self._json(200, {"cards": cards, "guest": True})

            now = datetime.now(timezone.utc).isoformat()
            s, t = _rest("POST", "mindforge_decks", tok, [{
                "user_id": user["id"], "name": name, "description": description or "",
                "source_text": source, "card_count": len(cards),
            }], {"Prefer": "return=representation"})
            if s >= 400:
                return self._json(500, {"error": t})
            deck = json.loads(t or "[]")[0]

            rows = [{
                "deck_id": deck["id"], "user_id": user["id"], "front": c.get("front"), "back": c.get("back"),
                "difficulty": 2.5, "interval": 1, "repetitions": 0, "next_review": now,
            } for c in cards]
            s2, t2 = _rest("POST", "mindforge_cards", tok, rows)
            if s2 >= 400:
                return self._json(500, {"error": t2})
            return self._json(200, {"deckId": deck["id"], "cardCount": len(cards)})
        except Exception as err:  # noqa: BLE001
            return self._json(500, {"error": "Internal server error"})
