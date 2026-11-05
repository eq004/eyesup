/* Eyes Up — printable class QR sticker. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const code = (new URLSearchParams(location.search).get("c") || "").toUpperCase().slice(0, 5);
const url = location.origin + "/join?c=" + encodeURIComponent(code);
function sticker(name) {
  let qr = "";
  try { const q = qrcode(0, "M"); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch {}
  return '<div class="sticker"><h1>' + esc(name || "Our class") + '</h1><p class="how">Scan to join today\u2019s lesson</p>' +
    '<div class="qr">' + qr + '</div><p class="code">or go to <b style="font-size:1.05rem;letter-spacing:0;padding:0">' + esc(location.host) + '/join</b> and type <b>' + esc(code) + '</b></p>' +
    '<p class="brand">\uD83D\uDC41 Eyes Up</p></div>';
}
async function draw() {
  let name = "";
  try { const r = await fetch("/api/join-info?code=" + encodeURIComponent(code)); const j = await r.json(); name = j.className || ""; } catch {}
  const four = document.getElementById("layout").value === "four";
  document.body.classList.toggle("small", four);
  document.getElementById("page").innerHTML = four ? '<div class="grid">' + [1, 2, 3, 4].map(() => sticker(name)).join("") + '</div>' : sticker(name);
  document.title = (name ? name + " — " : "") + "Eyes Up class sticker";
}
document.getElementById("layout").onchange = draw;
if (code.length === 5) draw(); else document.getElementById("page").innerHTML = '<p class="note">No class code in this link.</p>';
document.getElementById("printBtn").onclick = () => window.print();
