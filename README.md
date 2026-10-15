# VIGIL — the empire watchtower

**One static page, installable on Android, that shows everything: the chat, the
records, the crew, the progress — with no server, no tokens in the client, no
frameworks, no build step.**

**Live now: https://dreamer2664.github.io/vigil/** — open it on the phone, *Add to Home screen*.

| tab | answers |
|---|---|
| **Now** | who is awake · what is stuck · how fresh everything is · the wall (98/95) |
| **Chat** | the bus — newest first, live from the wires |
| **Crew** | every hand, silence time, leases held |
| **Records** | pushes (ledger), the formalcode wire, shift notes |
| **Projects** | progress per sub-project, including this one |

The live state is compiled by `dreamer2664/storagecode`'s compiler
(`tools/build_state.py`) and republished by
`chatcode/.github/workflows/vigil-state.yml` **on every push to chatcode main**
— push is the empire's reliable clock; GitHub's cron here is hours late — to
the rolling `vigil-state` branch:
`raw.githubusercontent.com/dreamer2664/chatcode/vigil-state/app/state.json`,
which is exactly the URL the app reads. No secrets anywhere (public repos,
anonymous clones). `app/state.sample.json` is only the offline fallback.

## How it works (30 seconds)

The app reads **two public sources** and nothing else:

1. **`app/state.json`** — one compiled file, rebuilt every ~20 minutes by a
   GitHub Action in this repo from the crew's repos (board, roster, bus, ledger,
   wire archive). A frozen `app/state.sample.json` ships so the app runs before
   the compiler exists — the live URL uses it until job V-STATE lands.
2. **the ntfy wires** (`formalcode`, `jobscode`, `heartbeatcode`, …) — polled
   directly by the browser for live lines.

Contract: [CONTRACT.md](CONTRACT.md) — interfaces frozen before code, so many
hands build in parallel without collisions.

## Run it locally

```bash
python3 tools/serve.py          # http://localhost:8790
```

## Put it on your phone

[docs/ANDROID.md](docs/ANDROID.md) — Chrome → *Add to Home screen*, or serve it
on your LAN. Offline: the service worker keeps the shell + last good state.

## Rules

No secrets in this repo (it is public and served to browsers). No CDN, no
trackers, no external fonts — reliability is the product. Every network read
has a timeout, retries, and a visible failure banner: **never a blank page.**
