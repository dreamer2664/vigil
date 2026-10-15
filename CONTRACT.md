# CONTRACT.md — Vigil v1: the interfaces everything else is built against

**Vigil** is the watchtower: one static page, installable on Android, that shows
the whole empire — chat, records, crew, progress — with **no server, no keys in
the client, no frameworks, no build step**. It reads public raw files (compiled
by the crew) and the public ntfy wires. This document pins every interface so
jobs can be worked in parallel without collisions. **Change this file first,
then the code** — never silently.

- Deploy target: **https://dreamer2664.github.io/vigil/** (GitHub Pages, main / root)
- Repo: `dreamer2664/vigil` · tasks: chatcode board, tag `vigil`

---

## 1. Data sources — exactly two, both public, no secrets

| source | URL | shape |
|---|---|---|
| **state** (compiled every ~20 min) | `https://raw.githubusercontent.com/dreamer2664/storagecode/main/app/state.json` | schema §2 |
| **live wires** (polled by the app) | `https://ntfy.sh/<topic>/json?poll=1&since=2h` — topics `formalcode`, `jobscode`, `heartbeatcode`, `groupchatcode`, `newentriescode` | ndjson: `{"id","time","topic","event":"message","message"}` |

Rules: the app **never** calls the GitHub API, never carries a token, never
talks to anything else. The state compiler runs in GitHub Actions — the public
repos are cloned anonymously, the job commits with the repo's own default
token, no secret exists — and writes ONE file. A frozen
`app/state.sample.json` ships in this repo as the offline fallback (a frozen
copy of a live compile, refreshed by hand when it drifts badly).

## 2. `state.json` — schema v1 (the compiler's contract)

Exact keys; every list **capped** (cap in brackets); deterministic order;
any missing source → the key exists once with `null` + a line in `warnings`.

```jsonc
{
  "schema": 1,
  "generated_ts": "2026-10-15T07:00:00Z",       // authoritative freshness stamp
  "warnings": [],                                // human-readable; [] when clean

  "git": { "chatcode": "<sha10>", "superocr": "<sha10>",
           "storage": "<sha10>", "storagecode": "<sha10>" },

  "board": {
    "counts": { "open": 43, "claimed": 6, "review": 20, "blocked": 5,
                "done": 134, "dropped": 15 },
    "open":    [ {"id","title","priority","tags","owner","age_h"} ],   // cap 100
    "claimed": [ {"id","title","priority","owner","lease_expires","checkpoint"} ], // cap 50
    "review":  [ {"id","title","owner","pr","age_h"} ],                // cap 50
    "blocked": [ {"id","title","owner","note"} ]                       // cap 50
  },

  "team": {
    "window_min": 45,                             // silence beyond this = presumed dark
    "awake": 3, "total": 6,
    "agents": [ {"name","role","kind","last_seen","silent_min","alive","leases"} ]
  },

  "chat": { "count_24h": 120, "tail": [ {"id","ts","from","type","text"} ] },  // cap 40

  "records": {
    "pushes": [ {"date","agent","repo","what"} ],        // parsed PUSHES.md rows, newest first, cap 30
    "wire":   [ {"id","ts","topic","message"} ],         // storagecode/wire archive tail, cap 30
    "shifts": [ {"date","agent","file"} ]                // cap 10
  },

  "projects": [                                    // one entry per sub-project
    { "key": "superocr", "title": "SUPEROCR — the OCR war",
      "open": 20, "claimed": 4, "review": 9, "done": 110, "total": 143,
      "progress": 0.77,                            // done/total, 3 decimals
      "epics": [ {"id","title","done","total"} ],  // cap 12, by parent task
      "last_push": "2026-10-15T06:31:00Z" }
  ],

  "walls": { "easy_best": 75, "hard_best": 29, "easy_target": 98, "hard_target": 95,
             "source": "reports/s55-bench-seed1-3x (best honest receipts)" },

  "flags": { "silent_agents": [], "review_stuck": [], "blocked_over_24h": [] }
}
```

How the compiler derives things (bind these, don't invent):

- `team.agents`: `agents/*.json` roster + the newest timestamp per name from
  the bus and heartbeatcode archive; `alive = silent_min <= window_min`;
  `leases` = number of cards owned with status claimed/blocked.
- `projects`: board cards grouped by **repo**, resolved in this order (the
  board is older than tags — most legacy cards carry none):
  1. first `tags` entry among `superocr|chatcode|storage|storagecode|vigil|empire`;
  2. else walk `parent` (up to 6 hops) and apply rule 1;
  3. else title matches `\bS\d{1,2}\b` / `\bW[12]\b` / an OCR-domain word
     (OCR, captcha, reader, glyph, corrosion, snow, spiderweb, strippy,
     collage, darts, stitch, split, dark-on-dark, obstruction, deskew, lexicon,
     bench, v7b, recognition, reader_lex) → `superocr`;
  4. else `chatcode`.
  `epics` = cards with children (parent pointers) inside that group, `done/total`
  over children; `progress` over all cards in the group.
- `chat.tail`: newest 40 non-dm messages across channels (general + human-*),
  text truncated to 280 chars, `ts` from message.
- `records.*`: parse `storage/PUSHES.md` table rows; tail `storagecode/wire/*.jsonl`
  (newest file(s)); list `storage/shifts/`.
- `flags.silent_agents`: agents with `alive == false`; `review_stuck`: review
  cards older than 24 h; `blocked_over_24h`: blocked cards older than 24 h.
- `walls`: NEVER computed from memory — read the S55 bench receipts
  (`superocr/reports/s55-bench-*/*.json`): `easy_best`/`hard_best` = max correct
  over all their runs, targets from the newest receipt's `bars`; if none are
  found, keep the last known values and add a warning.
- `projects[].last_push`: git HEAD committer date of the group's repo checkout;
  `vigil` falls back to its newest PUSHES.md row, `empire` takes the newest overall.

**Compiler command (pinned):** `python3 tools/build_state.py --out app/state.json`
run from a **storagecode** checkout with sibling checkouts available at
`./src/chatcode`, `./src/superocr`, `./src/storage` (plus optional `./src/vigil`,
which makes that group's `last_push` exact; the workflow arranges that);
`--src-root <dir>` overrides. Exit 0 on success, 1 on any internal error.
No network required: everything comes from the checkouts. (Optional API use
only for PR titles — never required.)

## 3. App files and ownership (parallel-safe)

| file | owner job | notes |
|---|---|---|
| `index.html` | V-SHELL | single page; loads `app.js` as module |
| `app.css` | V-SHELL | design tokens §5; dark-first |
| `app.js` | V-SHELL | router + state loader + live poller + view registry |
| `views/now.js` | V-NOW | the home tab |
| `views/chat.js` | V-CHAT | the bus |
| `views/crew.js` | V-CREW | the roster / leases |
| `views/records.js` | V-RECORDS | ledger + wire + shifts |
| `views/projects.js` | V-PROJECTS | progress per sub-project |
| `sw.js`, `manifest.webmanifest` | V-SHELL | offline + installable |
| `icons/*` | V-SHELL | svg source + 192/512 png |
| `docs/ANDROID.md`, `tools/serve.py` | V-ANDROID | install guide + local server |
| `CONTRACT.md` | frozen | managers only |

**View module contract** (exact): each `views/<id>.js` exports
`export default { id, title, icon, render(root, ctx) }`.
`root` is an empty `<section>`; fill it. `ctx` = `{ state, getLive(), refresh(),
now() }` where `state` is the parsed schema-v1 object (never null — if not yet
loaded, `render` is not called) and `getLive()` returns the rolling live-wire
buffer (below). Views must be pure-ish: no globals, no direct fetch, no
`document.querySelector` outside `root`, clean up timers via
`ctx.onCleanup(fn)`. Tabs are `<button data-view="<id>">`; the router swaps
sections and calls `render` once per activation.

**Live buffers** (built by app.js, read by views): `ctx.getLive()` →
`{ formal: [msg...], jobs: [...], heartbeat: [...], group: [...] , updated_ts }`
each capped at 30 newest, deduped by ntfy `id`.

## 4. Reliability rules (stability IS the product)

1. **No build step, no frameworks, no CDN, no fonts from the network.**
   ES modules + plain CSS only; system font stack.
2. **Every network read** has: 8 s timeout, ≤3 retries with backoff
   (1s/4s/10s), and surfaces failure as a visible banner — never a blank page.
3. **Freshness is always visible:** header shows `updated <age> ago` from
   `generated_ts`, and turns amber past 45 min, red past 2 h.
4. **Shape-guard:** state passes through `normalizeState()` which fills every
   missing key from the sample shape; a broken compile must not break the app.
5. **Offline:** service worker caches the shell + last good state; app opens
   and renders the cached state with an "offline — last good copy" badge.
   Update policy: network-first for `state.json`, cache-first for shell.
6. **Phone-first:** viewport-fit=cover, safe-area insets, 16px base, 48px
   touch targets, tabs reachable one-handed; no horizontal scroll anywhere.
7. **Lists** cap their DOM (render ≤60 rows, "show more" after) — 200+ cards
   must stay smooth.
8. **No emoji-only information**: every status is icon + text.

## 5. Design tokens (pin these in app.css)

```css
:root{
  --bg:#0b0e14; --panel:#131826; --panel-2:#1a2133; --line:#232c42;
  --text:#e8ecf1; --dim:#8b95a7; --accent:#6ee7b7; --link:#93c5fd;
  --ok:#34d399; --warn:#fbbf24; --bad:#f87171; --info:#60a5fa;
  --r:12px; --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
}
```

Card = `background:var(--panel); border:1px solid var(--line); border-radius:var(--r); padding:var(--s3)`.
Status colors: alive/ok → `--ok`, stale → `--warn`, dead/bad → `--bad`.

## 6. The room's jobs (tag `vigil`)

V-STATE (compile + workflow) · V-SHELL (shell/router/PWA) · V-NOW · V-CHAT ·
V-CREW · V-RECORDS · V-PROJECTS · V-ANDROID (+ install guide) — plus a Review
card per high-risk piece. Take one, own its files, ship it with evidence.
