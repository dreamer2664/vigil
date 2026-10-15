/* Vigil shell — router, state loader, live wires (CONTRACT.md §3–§4).
   No frameworks, no build step, no keys. Every fetch: timeout + retries +
   a visible banner instead of a blank page. */

const STATE_URLS = [
  "https://raw.githubusercontent.com/dreamer2664/chatcode/vigil-state/app/state.json",
  "./app/state.sample.json",
];
const WIRES = {
  formal: "formalcode", jobs: "jobscode", heartbeat: "heartbeatcode", group: "groupchatcode",
};
const NTFY = (topic, since = "3h") =>
  `https://ntfy.sh/${topic}/json?poll=1&since=${since}`;
const FETCH_TIMEOUT_MS = 8000;
const RETRIES = 2;

/* ---------- shape guard: the app must never break on a bad compile ------ */
const SHAPE = {
  schema: 1, generated_ts: null, warnings: [],
  git: {}, board: { counts: {}, open: [], claimed: [], review: [], blocked: [] },
  team: { window_min: 45, awake: 0, total: 0, agents: [] },
  chat: { count_24h: null, tail: [] },
  records: { pushes: [], wire: [], shifts: [] },
  projects: [], walls: {}, flags: { silent_agents: [], review_stuck: [], blocked_over_24h: [] },
};
function normalizeState(raw) {
  const fill = (dst, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (dst[k] === undefined || dst[k] === null) dst[k] = structuredClone(v);
      else if (v && typeof v === "object" && !Array.isArray(v) && typeof dst[k] === "object") fill(dst[k], v);
    }
    return dst;
  };
  return fill(raw && typeof raw === "object" ? raw : {}, SHAPE);
}

/* ---------- resilient fetch --------------------------------------------- */
async function getJSON(url, { timeout = FETCH_TIMEOUT_MS, retries = RETRIES } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { lastErr = e; }
    finally { clearTimeout(t); }
    if (i < retries) await new Promise((res) => setTimeout(res, [1000, 4000, 10000][i] ?? 4000));
  }
  throw lastErr;
}

/* ---------- live wires --------------------------------------------------- */
const live = { formal: [], jobs: [], heartbeat: [], group: [], updated_ts: null };
const seenIds = new Set();
async function pollWires() {
  const jobs = Object.entries(WIRES).map(async ([key, topic]) => {
    try {
      const r = await fetch(NTFY(topic), { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const text = await r.text();
      const out = [];
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.event !== "message" || seenIds.has(m.id)) continue;
        seenIds.add(m.id);
        out.push({ id: m.id, ts: new Date((m.time || 0) * 1000).toISOString(), text: m.message || "" });
      }
      live[key] = (live[key].concat(out)).slice(-30);
    } catch { /* keep the previous buffer; the banner already speaks */ }
  });
  await Promise.all(jobs);
  live.updated_ts = new Date().toISOString();
}

/* ---------- state -------------------------------------------------------- */
let state = null, stateSource = null, usingSample = false;
async function loadState() {
  let lastErr;
  for (const url of STATE_URLS) {
    try {
      const raw = await getJSON(url);
      state = normalizeState(raw);
      stateSource = url;
      usingSample = url === STATE_URLS[1];
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("state unavailable");
}

/* ---------- view registry + router -------------------------------------- */
const REG = {};   /* id -> module; loaded on first activation */
async function loadView(id) {
  if (!REG[id]) REG[id] = await import(`./views/${id}.js`);
  return REG[id].default;
}

const cleanups = [];
function onCleanup(fn) { cleanups.push(fn); }
function runCleanups() { while (cleanups.length) try { cleanups.pop()(); } catch {} }

let active = "now";
const root = document.getElementById("view");
async function show(id) {
  active = id;
  for (const b of document.querySelectorAll("#tabs button"))
    b.classList.toggle("on", b.dataset.view === id);
  runCleanups();
  root.innerHTML = "";
  try {
    const view = await loadView(id);
    const section = document.createElement("section");
    root.appendChild(section);
    view.render(section, ctx);
  } catch (e) {
    root.innerHTML = `<div class="card"><h2>view failed</h2><p class="small dim">
      ${id} could not load (${e.message}). The rest of the app still works.</p></div>`;
  }
}

/* ---------- banners / freshness / footer -------------------------------- */
const dot = document.getElementById("dot"), fresh = document.getElementById("fresh");
const banner = document.getElementById("banner"), footRight = document.getElementById("foot-right");
function say(msg, kind = "warn") {
  if (!msg) { banner.classList.add("hidden"); banner.textContent = ""; return; }
  banner.textContent = msg;
  banner.className = `banner ${kind}`;
}
function ageMin(ts) {
  if (!ts) return null;
  const d = (Date.now() - Date.parse(ts)) / 60000;
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null;
}
function humanMin(m) {
  if (m == null) return "unknown";
  if (m < 1) return "now";
  if (m < 90) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
function paintFreshness() {
  const m = ageMin(state?.generated_ts);
  const level = m == null ? "unknown" : m > 120 ? "bad" : m > 45 ? "stale" : "ok";
  dot.className = `dot ${level}`;
  fresh.textContent = `state ${humanMin(m)}`;
  if (state && state.warnings?.length)
    say("compiler warnings: " + state.warnings.slice(0, 2).join(" · "), "warn");
  else if (usingSample)
    say("showing the frozen fallback copy — live state unreachable", "warn");
  else if (stale === 2)
    say("state is stale — the compiler may be down; showing last good copy", "bad");
  else if (stale === 1) say("state is older than 45 min", "warn");
  else say(null);
}
function paintFooter() {
  const c = state?.board?.counts || {};
  footRight.textContent = state
    ? `open ${c.open ?? "?"} · review ${c.review ?? "?"} · awake ${state.team?.awake ?? "?"}/${state.team?.total ?? "?"}`
    : "";
}

/* ---------- ctx handed to views ----------------------------------------- */
const ctx = {
  get state() { return state; },
  get usingSample() { return usingSample; },
  getLive: () => live,
  now: () => new Date(),
  ageMin, humanMin,
  refresh: refresh,
  onCleanup,
};

/* ---------- boot --------------------------------------------------------- */
async function refresh() {
  try {
    await loadState();
    paintFreshness(); paintFooter();
    await show(active);
  } catch (e) {
    say(`could not load state (${e.message}) — check the connection`, "bad");
  }
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]");
  if (b) show(b.dataset.view);
});
document.getElementById("refresh").addEventListener("click", refresh);

window.addEventListener("online", () => { say(null); refresh(); });
window.addEventListener("offline", () => say("offline — showing the last good copy", "bad"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker
    .register("./app/sw.js").catch(() => { /* http LAN: no SW, page still works */ }));
}

await (async () => {
  await refresh();
  await pollWires();
  if (active !== "now") show(active);
  setInterval(pollWires, 60000);
  setInterval(paintFreshness, 30000);
})();
