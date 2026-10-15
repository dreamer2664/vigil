/* Records — the ledger (PUSHES), the formalcode wire archive, shift notes. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TABS = {
  pushes: (s) => (s.records?.pushes || []).map((p) => `
    <div class="msg">
      <div class="meta"><span>${esc(p.date)}</span><span class="who">${esc(p.agent)}</span><span>${esc(p.repo)}</span></div>
      <div class="text">${esc(p.what)}</div>
    </div>`).join("") || '<div class="empty">no pushes compiled yet</div>',
  wire: (s) => (s.records?.wire || []).slice().reverse().map((w) => `
    <div class="msg">
      <div class="meta"><span>${w.ts ? new Date(w.ts).toLocaleString() : ""}</span><span>${esc(w.topic)}</span><span class="dim">${esc(w.id)}</span></div>
      <div class="text">${esc(w.message)}</div>
    </div>`).join("") || '<div class="empty">wire archive empty</div>',
  shifts: (s) => (s.records?.shifts || []).slice().reverse().map((x) => `
    <div class="row"><span class="grow mono small">${esc(x.file)}</span>
      <span class="dim small">${esc(x.agent)}</span></div>`).join("")
    || '<div class="empty">no shift notes</div>',
};

export default {
  id: "records",
  title: "Records",
  icon: "▤",
  render(root, ctx) {
    const s = ctx.state;
    root.innerHTML = `
      <div class="card">
        <h2>Records</h2>
        <div class="subtabs" id="recsel">
          <button class="btn small on" data-t="pushes" type="button">pushes</button>
          <button class="btn small" data-t="wire" type="button">wire</button>
          <button class="btn small" data-t="shifts" type="button">shifts</button>
        </div>
        <div id="reclist">${TABS.pushes(s)}</div>
        <div class="small dim" style="margin-top:8px">
          full record: github.com/dreamer2664/storage (PUSHES.md) ·
          storagecode/wire (durable) · ntfy.sh/formalcode (live)
        </div>
      </div>`;
    const list = root.querySelector("#reclist");
    root.querySelector("#recsel").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-t]");
      if (!b) return;
      root.querySelectorAll("#recsel .btn").forEach((x) => x.classList.toggle("on", x === b));
      list.innerHTML = TABS[b.dataset.t](ctx.state);
    });
  },
};
