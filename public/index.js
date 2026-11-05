/* Eyes Up — the front door: type a code, go to the join page. */
const code = document.getElementById("code");
const go = () => {
  const c = code.value.trim().toUpperCase();
  if (c.length === 4) location.href = "/join?code=" + encodeURIComponent(c);
};
document.getElementById("go").onclick = go;
code.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
code.addEventListener("input", () => { if (code.value.trim().length === 4) go(); });
