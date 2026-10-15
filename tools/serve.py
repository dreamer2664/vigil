#!/usr/bin/env python3
"""Vigil dev server — serve the app locally for phone-on-LAN testing.

    python3 tools/serve.py            # http://0.0.0.0:8790
    python3 tools/serve.py --port 9000

Zero dependencies (stdlib http.server + correct mime types + no caching,
so a phone reload always sees the current files). For your phone, open
http://<your-computer-lan-ip>:8790 — see docs/ANDROID.md.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import socketserver


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8790)
    ap.add_argument("--dir", default=".")
    args = ap.parse_args()
    handler = functools.partial(Handler, directory=args.dir)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", args.port), handler) as httpd:
        print(f"vigil dev server: http://0.0.0.0:{args.port}  (dir: {args.dir})")
        print("phone on the same wi-fi: http://<your-lan-ip>:%d" % args.port)
        httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
