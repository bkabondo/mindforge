"""MindForge deck-share email (Python). Replaces app/api/email/share/route.ts."""
import base64
import html
import json
import os
import urllib.request
import urllib.parse
import urllib.error
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
        return None
    jar = SimpleCookie()
    try:
        jar.load(ch)
    except Exception:
        return None
    parts = []
    if COOKIE_BASE in jar:
        parts.append((-1, jar[COOKIE_BASE].value))
    i = 0
    while f"{COOKIE_BASE}.{i}" in jar:
        parts.append((i, jar[f"{COOKIE_BASE}.{i}"].value))
        i += 1
    if not parts:
        return None
    parts.sort(key=lambda p: p[0])
    raw = urllib.parse.unquote("".join(p[1] for p in parts))
    if raw.startswith("base64-"):
        raw = raw[len("base64-"):]
    try:
        tok = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)).decode("utf-8", "ignore")).get("access_token")
    except Exception:
        return None
    if not tok:
        return None
    s, t = _http("GET", f"{SUPABASE_URL}/auth/v1/user", {"apikey": ANON, "Authorization": f"Bearer {tok}"})
    if s != 200:
        return None
    try:
        return json.loads(t)
    except Exception:
        return None


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        b = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        user = _user(self.headers)
        if not user:
            return self._json(401, {"error": "Unauthorized"})
        length = int(self.headers.get("content-length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        recipient = body.get("recipientEmail")
        if not recipient:
            return self._json(400, {"error": "recipientEmail required"})
        deck_name = html.escape(body.get("deckName") or "")
        deck_id = body.get("deckId")
        count = body.get("cardCount") or 0
        sender = html.escape(body.get("senderName") or "")
        site = os.environ.get("NEXT_PUBLIC_SITE_URL") or "https://mindforge-ochre.vercel.app"
        deck_url = f"{site}/decks/{deck_id}"
        plural = "" if count == 1 else "s"
        html_body = (
            '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#f1f5f9;border-radius:16px;">'
            '<div style="text-align:center;margin-bottom:24px;">'
            '<div style="width:48px;height:48px;background:#7c3aed;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;color:white;">MF</div>'
            '<h1 style="color:#a78bfa;margin:8px 0;">MindForge</h1></div>'
            f'<h2 style="color:#f1f5f9;margin-bottom:8px;">{sender} shared a deck with you</h2>'
            f'<p style="color:#94a3b8;line-height:1.6;">You\'ve been invited to study <strong style="color:#f1f5f9;">"{deck_name}"</strong> — a deck with {count} flashcard{plural}.</p>'
            f'<div style="text-align:center;margin:24px 0;"><a href="{deck_url}" style="background:#7c3aed;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">View Deck</a></div>'
            '<p style="color:#64748b;font-size:13px;text-align:center;">Sign in to MindForge to start studying</p></div>'
        )
        payload = {
            "from": "MindForge <onboarding@resend.dev>",
            "to": recipient,
            "subject": f"{body.get('senderName') or ''} shared a flashcard deck with you 📚",
            "html": html_body,
        }
        key = os.environ.get("RESEND_API_KEY") or "placeholder"
        s, t = _http("POST", "https://api.resend.com/emails", {"Authorization": f"Bearer {key}"}, json.dumps(payload))
        if s >= 400:
            try:
                msg = json.loads(t).get("message") or t
            except Exception:
                msg = t
            return self._json(500, {"error": msg})
        return self._json(200, {"ok": True})
