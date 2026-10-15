/* Now — the home tab: who is awake, what needs a human, freshness, the wall. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function pct(bar, target) {
  const p = Math.max(0, Math.min(1, (bar || 0) / (target || 1)));
  const cls = p >= 0.97 ? "" : p >= 0.8 ? "warn" : "bad";
  return `<div class="bar-track"><div class="bar-fill ${cls}" style="width:${(p * 100).toFixed(1)}%"></div></div>`;
}

export default {
  id: "now",
  title: "Now",
  icon: "◎",
  render(root, ctx) {
    const s = ctx.state;
    const c = s.board?.counts || {};
    const w = s.walls || {};
    const flags = s.flags || {};
    const age = ctx.ageMin(s.generated_ts);

    root.innerHTML = `
      <div class="card">
        <h2>Empire now</h2>
        <div class="chips">
          <span class="chip ${s.team?.awake ? "ok" : "bad"}">${s.team?.awake ?? "?"} awake / ${s.team?.total ?? "?"}</span>
          <span class="chip">open ${c.open ?? "?"}</span>
          <span class="chip info">claimed ${c.claimed ?? "?"}</span>
          <span class="chip info">review ${c.review ?? "?"}</span>
          ${c.blocked ? `<span class="chip bad">blocked ${c.blocked}</span>` : ""}
          <span class="chip ok">done ${c.done ?? "?"}</span>
        </div>
        <div class="small dim" style="margin-top:8px">state compiled ${esc(s.generated_ts || "?")} (${ctx.humanMin(age)})
        ${ctx.usingSample ? "· SAMPLE" : ""}</div>
      </div>

      <div class="card">
        <h2>The wall — target vs today</h2>
        <div class="row"><span class="grow">easy</span><span class="mono">${w.easy_best ?? "?"}/${w.easy_target ?? 98}</span></div>
        ${pct(w.easy_best, w.easy_target)}
        <div class="row"><span class="grow">hard</span><span class="mono">${w.hard_best ?? "?"}/${w.hard_target ?? 95}</span></div>
        ${pct(w.hard_best, w.hard_target)}
        <div class="small dim" style="margin-top:8px">source: ${esc(w.source || "unknown")} — never rounded up</div>
      </div>

      ${(flags.silent_agents?.length || flags.review_stuck?.length || flags.blocked_over_24h?.length) ? `
      <div class="card">
        <h2>Needs a decision</h2>
        ${flags.silent_agents?.length ? `<h3>silent hands (${flags.silent_agents.length})</h3>
          <div class="chips">${flags.silent_agents.map((n) => `<span class="chip bad">${esc(n)}</span>`).join("")}</div>` : ""}
        ${flags.review_stuck?.length ? `<h3>reviews stuck &gt;24 h (${flags.review_stuck.length})</h3>
          <div class="chips">${flags.review_stuck.map((id) => `<span class="chip warn">${esc(id)}</span>`).join("")}</div>` : ""}
        ${flags.blocked_over_24h?.length ? `<h3>blocked &gt;24 h (${flags.blocked_over_24h.length})</h3>
          <div class="chips">${flags.blocked_over_24h.map((id) => `<span class="chip warn">${esc(id)}</span>`).join("")}</div>` : ""}
      </div>` : ""}

      <div class="card">
        <h2>Live — formalcode</h2>
        <div id="live-formal">${liveList(ctx.getLive().formal)}</div>
      </div>

      <div class="card">
        <h2>Repos</h2>
        ${Object.entries(s.git || {}).map(([k, v]) =>
          `<div class="row"><span class="grow">${esc(k)}</span><span class="mono dim small">${esc(v ?? "?")}</span></div>`).join("")
          || '<div class="empty">no git info</div>'}
      </div>`;
  },
};

function liveList(items) {
  if (!items?.length) return '<div class="empty">no live lines yet</div>';
  return items.slice(-8).reverse().map((m) =>
    `<div class="msg"><div class="meta"><span>${new Date(m.ts).toLocaleTimeString()}</span></div>
     <div class="text">${esc(m.text.slice(0, 220))}</div></div>`).join("");
}
