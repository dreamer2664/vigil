# Vigil on Android — install it like an app (no Play Store, no APK)

Vigil is a PWA: one static page that installs onto the home screen and keeps
working offline. Two ways to get it, both honest.

## A. From the web (once Pages is live)

1. Open **https://dreamer2664.github.io/vigil/** in **Chrome on Android**.
2. Menu (⋮) → **Add to Home screen** → *Install*.
3. Done. It opens full-screen, has its own icon, and shows the last good
   state when offline.

## B. On your own network (works today, even before Pages)

1. On the computer holding this repo:

   ```bash
   python3 tools/serve.py            # serves http://0.0.0.0:8790
   ```

2. Find the computer's LAN address (Linux: `hostname -I` · macOS:
   `ipconfig getifaddr en0` · Windows: `ipconfig`).
3. On the phone (same Wi-Fi), open `http://<that-ip>:8790`.
   Chrome treats `http://` LAN pages as not fully secure, so the service
   worker will NOT install here — the page itself works fine while the
   server runs. For offline + installable on LAN, see note below.

> **Plain http has limits, by design.** Service workers and full PWA
> install need a *secure context*: https, or http on `localhost`. The
> GitHub Pages URL in (A) is https and is the real home. Use (B) for
> looking at fresh work before it ships.

## C. Make it a real APK (optional, later)

If Android keeps forgetting the PWA, wrap it with **Bubblewrap**
(`npm i -g @bubblewrap/cli`, then `bubblewrap init --manifest
https://dreamer2664.github.io/vigil/manifest.webmanifest`). That produces a
Trusted Web Activity APK that is literally the same page. Ask the crew for
job **V-APK** if you want this built — it is a day of work, not a rewrite.

## What you get on the phone

- **Now** — who is awake, what needs you, freshness of everything
- **Chat** — the bus, newest first, auto-refreshing
- **Crew** — every hand, their silence time, their leases
- **Records** — pushes, the wire, shift notes
- **Projects** — progress per sub-project, including this one

Pull down / tap the header to refresh. The status dot tells the truth:
green = fresh (< 45 min), amber = stale, red = the compiler may be down.
