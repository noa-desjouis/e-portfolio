/* E-portfolio — shared script.
   Content lives in the CSV files. Pages fetch them; if the page is opened
   directly from disk (file://), the embedded copy in data.js is used instead. */

const PAGES = [
  ["index.html", "Welcome"],
  ["engineering-course.html", "Engineering Course"],
  ["international-mobility.html", "International Mobility"],
  ["sustainability-civic.html", "Sustainability & Civic Engagement"],
  ["sport-activities.html", "Sport & Other Activities"],
  ["career-development.html", "Career Development"]
];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some(v => v.trim() !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); if (row.some(v => v.trim() !== "")) rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadCSV(name) {
  try {
    const r = await fetch(name, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return parseCSV(await r.text());
  } catch (e) {
    if (window.PORTFOLIO_DATA && window.PORTFOLIO_DATA[name]) return parseCSV(window.PORTFOLIO_DATA[name]);
    throw new Error("Cannot load " + name);
  }
}

function buildChrome() {
  const here = location.pathname.split("/").pop() || "index.html";
  const nav = PAGES.map(([h, t]) => `<a href="${h}"${h === here ? ' class="active"' : ""}>${t}</a>`).join("");
  document.body.insertAdjacentHTML("afterbegin",
    `<header class="site"><div class="inner"><a class="brand" href="index.html" data-profile="name">My e-portfolio</a><nav>${nav}</nav></div></header>`);
  document.body.insertAdjacentHTML("beforeend",
    `<footer>© <span id="year"></span> <span data-profile="name"></span> — E-portfolio</footer>`);
  document.getElementById("year").textContent = new Date().getFullYear();
}

const J = (r, k) => (k || "").split("|").map(c => r[c]).filter(Boolean).join(", ");

const R = {
  cards(rows, el) {
    const t = el.dataset.title, s = el.dataset.subtitle, m = (el.dataset.meta || "").split("|").filter(Boolean),
          x = el.dataset.text, tag = el.dataset.tag;
    el.classList.add("grid");
    el.innerHTML = rows.map(r => `<article class="card">
      <h3>${esc(r[t])}</h3>${s ? `<div class="sub">${esc(J(r, s))}</div>` : ""}
      ${m.length ? `<div class="meta">${m.map(k => esc(r[k])).filter(Boolean).join(" · ")}</div>` : ""}
      ${tag && r[tag] ? `<span class="tag">${esc(r[tag])}</span>` : ""}
      ${x ? `<p>${esc(r[x])}</p>` : ""}</article>`).join("");
  },
  timeline(rows, el) {
    const d = el.dataset.date, t = el.dataset.title, s = el.dataset.subtitle, x = el.dataset.text,
          x2 = el.dataset.text2, l2 = el.dataset.label2 || "", tag = el.dataset.tag;
    el.classList.add("timeline");
    el.innerHTML = rows.map(r => `<div class="tl-item">
      <div class="date">${esc(r[d])}${tag && r[tag] ? ` &nbsp;<span class="tag">${esc(r[tag])}</span>` : ""}</div>
      <h3>${esc(r[t])}</h3>${s ? `<div class="sub">${esc(J(r, s))}</div>` : ""}
      ${x ? `<p>${esc(r[x])}</p>` : ""}
      ${x2 && r[x2] ? `<p><strong>${esc(l2)}</strong> ${esc(r[x2])}</p>` : ""}</div>`).join("");
  },
  skills(rows, el) {
    const groups = {};
    rows.forEach(r => (groups[r.category] = groups[r.category] || []).push(r));
    el.innerHTML = Object.entries(groups).map(([g, list]) => `<div class="skill-group"><h3>${esc(g)}</h3>` +
      list.map(r => `<div class="skill"><span>${esc(r.skill)}</span><div class="bar" title="${esc(r.level)}/5"><span style="width:${Math.min(5, +r.level || 0) * 20}%"></span></div></div>`).join("") +
      `</div>`).join("");
  },
  table(rows, el) {
    if (!rows.length) { el.innerHTML = ""; return; }
    const cols = (el.dataset.cols || Object.keys(rows[0]).join("|")).split("|");
    const search = el.dataset.search !== "off";
    el.innerHTML = (search ? `<div class="toolbar"><input type="search" placeholder="Filter…" aria-label="Filter"></div>` : "") +
      `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th>${esc(c.replace(/_/g, " "))}</th>`).join("")}</tr></thead><tbody>` +
      rows.map(r => `<tr>${cols.map(c => `<td>${/^(https?:\/\/|[\w./-]+\.(pdf|zip|docx?|pptx?|png|jpe?g)$)/i.test(r[c]) ? `<a href="${esc(r[c])}" target="_blank" rel="noopener">${esc(r[c].length > 40 ? "Open" : r[c])}</a>` : esc(r[c])}</td>`).join("")}</tr>`).join("") + `</tbody></table></div>`;
    const inp = el.querySelector("input");
    if (inp) inp.addEventListener("input", () => {
      const q = inp.value.toLowerCase();
      el.querySelectorAll("tbody tr").forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none");
    });
  }
};

async function init() {
  buildChrome();
  // Profile fields
  try {
    const p = Object.fromEntries((await loadCSV("profile.csv")).map(r => [r.key, r.value]));
    document.querySelectorAll("[data-profile]").forEach(el => {
      const v = p[el.dataset.profile]; if (v == null) return;
      if (el.tagName === "A" && el.dataset.profile !== "name") { el.href = (el.dataset.prefix || "") + v; el.style.display = v ? "" : "none"; }
      else el.textContent = v;
    });
    const av = document.getElementById("avatar");
    if (av) {
      if (p.photo) av.innerHTML = `<img src="${esc(p.photo)}" alt="Portrait">`;
      else av.textContent = (p.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    }
    if (p.name) document.title = document.title.replace("{name}", p.name);
  } catch (e) { /* profile optional */ }
  // Data blocks
  for (const el of document.querySelectorAll("[data-csv]")) {
    try {
      let rows = await loadCSV(el.dataset.csv);
      if (el.dataset.filter) { const [k, v] = el.dataset.filter.split("="); rows = rows.filter(r => r[k] === v); }
      R[el.dataset.render](rows, el);
    } catch (e) { el.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }
}
document.addEventListener("DOMContentLoaded", init);
