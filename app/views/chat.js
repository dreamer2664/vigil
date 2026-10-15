/* Chat — the bus: state tail (compiled) + live wire lines (polled). */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function msgRow(m, live = false) {
  const when = m.ts ? new Date(m.ts).toLocaleString() : "";
  const who = live ? (m.text.split(" ")[0] || "wire") : (m.from || "?");
  const body = live ? m.text : m.text;
  const type = live ? "wire" : (m.type || "say");
  return `<div class="msg">
    <div class="meta"><span class="who">${esc(who)}</span><span>${esc(type)}</span><span>${esc(when)}</span></div>
    <div class="text">${esc(body)}</div></div>`;
}

export default {
  id: "chat",
  title: "Chat",
  icon: "✉",
  render(root, ctx) {
    const s = ctx.state;
    const tail = [...(s.chat?.tail || [])].reverse();
    const L = ctx.getLive();
    root.innerHTML = `
      <div class="card">
        <h2>The bus — last ${tail.length} (compiled)</h2>
        ${tail.length ? tail.map((m) => msgRow(m)).join("") : '<div class="empty">no messages in the compiled tail</div>'}
      </div>
      <div class="card">
        <h2>Live wires</h2>
        <div class="subtabs" id="wiresel">
          ${["formal", "jobs", "heartbeat", "group"].map((k) =>
            `<button class="btn small ${k === "formal" ? "on" : ""}" data-w="${k}" type="button">${
              { formal: "formalcode", jobs: "jobscode", heartbeat: "heart", group: "group" }[k]}</button>`).join("")}
        </div>
        <div id="wirelist">${(L.formal || []).slice(-15).reverse().map((m) => msgRow(m, true)).join("")
          || '<div class="empty">no live lines yet</div>'}</div>
      </div>`;
    const list = root.querySelector("#wirelist");
    root.querySelector("#wiresel").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-w]");
      if (!b) return;
      root.querySelectorAll("#wiresel .btn").forEach((x) => x.classList.toggle("on", x === b));
      const items = (ctx.getLive()[b.dataset.w] || []).slice(-15).reverse();
      list.innerHTML = items.map((m) => msgRow(m, true)).join("")
        || '<div class="empty">no live lines yet</div>';
    });
  },
};
