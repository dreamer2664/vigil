/* Crew — every hand: awake or dark, silence time, leases held. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function silence(min) {
  if (min == null) return "unknown";
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 60 * 48) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
}

export default {
  id: "crew",
  title: "Crew",
  icon: "☰",
  render(root, ctx) {
    const s = ctx.state;
    const agents = [...(s.team?.agents || [])].sort((a, b) => (a.silent_min ?? 1e9) - (b.silent_min ?? 1e9));
    const leaseCards = s.board?.claimed || [];
    const leasesBy = {};
    for (const c of leaseCards) (leasesBy[c.owner] ||= []).push(c);

    root.innerHTML = `
      <div class="card">
        <h2>Roster — window ${s.team?.window_min ?? 45} min</h2>
        ${agents.length ? agents.map((a) => `
          <div class="row">
            <span class="dot ${a.alive ? "ok" : "bad"}"></span>
            <span class="grow"><strong>${esc(a.name)}</strong> <span class="dim small">${esc(a.role || "")}${a.kind ? " · " + esc(a.kind) : ""}</span></span>
            <span class="mono small ${a.alive ? "dim" : ""}">${silence(a.silent_min)} silent</span>
            ${a.leases ? `<span class="chip info">${a.leases} lease${a.leases > 1 ? "s" : ""}</span>` : ""}
          </div>`).join("") : '<div class="empty">no roster</div>'}
      </div>
      <div class="card">
        <h2>Leases right now (${leaseCards.length})</h2>
        ${leaseCards.length ? leaseCards.map((c) => `
          <div class="msg">
            <div class="meta"><span class="who">${esc(c.owner || "?")}</span>
              <span>${esc(c.id)}</span><span>p${c.priority ?? "?"}</span>
              <span>${esc(c.lease_expires || "no lease")}</span></div>
            <div class="text">${esc(c.title)}</div>
            ${c.checkpoint ? `<div class="small dim">checkpoint: ${esc(c.checkpoint)}</div>` : ""}
          </div>`).join("") : '<div class="empty">nobody holds anything — the room is open</div>'}
      </div>`;
  },
};
