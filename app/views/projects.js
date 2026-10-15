/* Projects — progress per sub-project (grouping rule: CONTRACT.md §2). */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function bar(p) {
  const cls = p >= 0.9 ? "" : p >= 0.5 ? "warn" : "bad";
  return `<div class="bar-track"><div class="bar-fill ${cls}" style="width:${(Math.max(0, Math.min(1, p)) * 100).toFixed(1)}%"></div></div>`;
}

export default {
  id: "projects",
  title: "Projects",
  icon: "▦",
  render(root, ctx) {
    const s = ctx.state;
    const projects = s.projects || [];
    root.innerHTML = projects.length ? projects.map((p) => `
      <div class="card">
        <h2>${esc(p.title || p.key)}</h2>
        <div class="row"><span class="grow mono">${p.done}/${p.total}</span>
          <span class="dim small">${(p.progress * 100).toFixed(0)}% done</span></div>
        ${bar(p.progress)}
        <div class="chips" style="margin-top:8px">
          <span class="chip">open ${p.open}</span>
          <span class="chip info">claimed ${p.claimed}</span>
          <span class="chip info">review ${p.review}</span>
          <span class="chip ok">done ${p.done}</span>
        </div>
        ${(p.epics || []).length ? `<h3>epics</h3>` + p.epics.map((e) => `
          <div class="row"><span class="grow small">${esc(e.title)}</span>
          <span class="mono small dim">${e.done}/${e.total}</span></div>
          ${bar(e.total ? e.done / e.total : 0)}`).join("") : ""}
      </div>`).join("") : '<div class="card"><div class="empty">no projects compiled yet</div></div>';
  },
};
