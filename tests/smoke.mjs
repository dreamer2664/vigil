#!/usr/bin/env node
/* tests/smoke.mjs — boot the REAL app.js in a stub DOM against REAL state.
 *
 * Why this exists: on 2026-10-15 the deployed app threw
 *   "could not load state (stale is not defined) — check the connection"
 * the first time a clean compile (warnings: []) loaded: paintFreshness() read a
 * variable that was never defined. curl could not catch that; a browser could.
 * This harness is that browser, in ~120 lines, no dependencies.
 *
 * Usage:  node tests/smoke.mjs            (fetches the live state, falls back to the sample)
 *         STATE_FILE=/path/state.json node tests/smoke.mjs   (pin a state file)
 *         OFFLINE=1 node tests/smoke.mjs     (simulate the SW cache: first pass caches
 *                                            state, then the network dies + navigator.onLine
 *                                            is false — must boot on the cached copy and
 *                                            paint the offline badge, CONTRACT 4.5)
 * Exits 0 only if: boot clean, all five tabs render, footer/freshness painted.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_URL = "https://raw.githubusercontent.com/dreamer2664/chatcode/vigil-state/app/state.json";
const failures = [];
const notes = [];
const ok = (cond, msg) => (cond ? notes.push("  PASS " + msg) : failures.push("  FAIL " + msg));

/* ---------- 1. real app sources in a module-ready temp dir --------------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vigil-smoke-"));
fs.cpSync(path.join(ROOT, "app"), path.join(tmp, "app"), { recursive: true });
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ type: "module" }));

/* ---------- 2. state: live (preferred) or pinned file -------------------- */
let stateSource = "live fetch";
let stateObj = null;
if (process.env.STATE_FILE) {
  stateObj = JSON.parse(fs.readFileSync(process.env.STATE_FILE, "utf8"));
  stateSource = "STATE_FILE=" + process.env.STATE_FILE;
} else {
  try {
    const r = await fetch(STATE_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    stateObj = await r.json();
  } catch (e) {
    stateObj = JSON.parse(fs.readFileSync(path.join(ROOT, "app", "state.sample.json"), "utf8"));
    stateSource = "sample fallback (" + e.message + ")";
  }
}
notes.push(`  state: ${stateSource}, generated ${stateObj.generated_ts}, warnings ${JSON.stringify(stateObj.warnings)}`);

/* ---------- offline mode? ----------------------------------------------- */
const OFFLINE = process.env.OFFLINE === "1";

/* ---------- 3. stub DOM -------------------------------------------------- */
function makeEl(tag = "div") {
  const el = {
    tagName: tag, children: [], attributes: {},
    _innerHTML: "", textContent: "", className: "", dataset: {}, style: {},
    hidden: false,
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = String(v); },
    classList: {
      _s: new Set(),
      add: (c) => el.classList._s.add(c),
      remove: (c) => el.classList._s.delete(c),
      contains: (c) => el.classList._s.has(c),
      toggle: (c, on) => (on ? el.classList._s.add(c) : el.classList._s.delete(c)),
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { this.children.push(...cs); },
    addEventListener(t, fn) { (this._h ||= {})[t] = fn; },
    removeEventListener() {},
    closest() { return null; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    insertAdjacentHTML(_p, html) { this._innerHTML += html; },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
    remove() {},
  };
  return el;
}
const byId = {};
for (const id of ["dot", "fresh", "banner", "foot-right", "view", "tabs", "refresh"]) byId[id] = makeEl();
const documentStub = {
  getElementById: (id) => byId[id] ?? (byId[id] = makeEl()),
  createElement: (t) => makeEl(t),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  body: makeEl("body"),
  title: "",
};
globalThis.document = documentStub;
globalThis.window = globalThis;
globalThis.navigator = OFFLINE ? { onLine: false } : {};   // no serviceWorker: LAN/http path also valid
globalThis.location = { href: "https://smoke.local/", origin: "https://smoke.local" };
globalThis.addEventListener = () => {};       // window.addEventListener no-ops

/* ---------- 4. fetch stub ------------------------------------------------- */
/* OFFLINE=1: the first state fetch populates a "cache", then the network dies
   exactly like a phone that lost signal — fetch rejects, the stub plays the
   service worker's part (serve the last good copy), navigator.onLine is false. */
const swCache = new Map();
let networkUp = true;
globalThis.fetch = async (url) => {
  const u = String(url);
  if (OFFLINE && u.includes("state.json") && !u.includes("sample")) {
    if (networkUp) {
      swCache.set(u, stateObj);
      return { ok: true, status: 200, json: async () => stateObj };
    }
    if (swCache.has(u)) return { ok: true, status: 200, json: async () => swCache.get(u) };
    throw new TypeError("fetch failed (offline)");
  }
  if (u.includes("state.json") || u.includes("state.sample.json")) {
    return { ok: true, status: 200, json: async () => stateObj };
  }
  if (u.includes("ntfy.sh")) {
    if (OFFLINE && !networkUp) throw new TypeError("fetch failed (offline)");
    return { ok: true, status: 200, text: async () => "" };
  }
  if (OFFLINE && !networkUp) throw new TypeError("fetch failed (offline)");
  return { ok: false, status: 404, json: async () => ({}) };
};

/* ---------- 5. boot the real module -------------------------------------- */
if (OFFLINE) {
  /* pass 1: online, primes the SW cache; then the network dies and a FRESH
     copy of the app module (cache-busted) must boot against the dark network */
  await import(path.join(tmp, "app", "app.js"));
  networkUp = false;
}
let bootErr = null;
try {
  const bust = `?offline-${Date.now()}`;
  await import(path.join(tmp, "app", "app.js") + bust);
} catch (e) {
  bootErr = e;
}
ok(!bootErr, "app.js boots without throwing" + (bootErr ? ` (${bootErr.message})` : ""));
if (OFFLINE) ok(/offline — showing the last good copy/.test(byId["banner"].textContent || ""),
  `offline badge painted (banner: ${JSON.stringify(byId["banner"].textContent)})`);
if (OFFLINE) ok(/^state /.test(byId["fresh"].textContent || ""),
  `freshness painted from the cached copy (got: ${JSON.stringify(byId["fresh"].textContent)})`);

const banner = byId["banner"].textContent || "";
const fresh = byId["fresh"].textContent || "";
const foot = byId["foot-right"].textContent || "";
const sectionHTML = () => (byId["view"].children.at(-1)?._innerHTML || "") + (byId["view"].innerHTML || "");
const rootHTML = sectionHTML();

ok(!/could not load state/.test(banner), `no "could not load state" banner (banner: ${JSON.stringify(banner).slice(0, 90)})`);
ok(!/is not defined/i.test(banner), "no ReferenceError in the banner");
ok(/^state (now|\d+ min ago|\d+ h ago|\d+ d ago|unknown)/.test(fresh), `freshness painted (got: ${JSON.stringify(fresh)})`);
ok(/open \d+/.test(foot), `footer painted (got: ${JSON.stringify(foot)})`);
ok(/Empire now/.test(rootHTML), "Now view rendered with real data");
ok(rootHTML.length > 300, `Now view has substance (${rootHTML.length} chars)`);
ok(!/view failed/.test(rootHTML), "no view failure card on boot");
const liveMode = stateSource.startsWith("live fetch");
ok(!liveMode || !/SAMPLE/.test(rootHTML), liveMode ? "live state was used (no SAMPLE marker)" : "sample mode: skip live check");

/* ---------- 6. every tab -------------------------------------------------- */
const tabsEl = byId["tabs"];
const clickHandler = tabsEl._h?.click;
ok(typeof clickHandler === "function", "tabs click handler is wired");
for (const id of ["chat", "crew", "records", "projects", "now"]) {
  byId["view"].innerHTML = "";
  clickHandler?.({ target: { closest: () => ({ dataset: { view: id } }) } });
  await new Promise((r) => setTimeout(r, 200));
  const html = sectionHTML();
  ok(html.length > 150 && !/view failed/.test(html), `tab "${id}" renders (${html.length} chars)`);
}

/* ---------- 7. report ----------------------------------------------------- */
console.log(`vigil smoke — state: ${stateSource}`);
for (const n of notes) console.log(n);
for (const f of failures) console.log(f);
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : "\nall good");
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
process.exit(failures.length ? 1 : 0);
