/* Checks that the step-by-step Teach page (/teach) still has every element the engine looks for.
   The two dashboards share public/teacher.js; an id that exists on the classic page but is missing from
   views/teach-main.html would stop the new page at load. Run: node tools/check-teach-ids.js */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const classic = fs.readFileSync(path.join(root, "public/teacher.html"), "utf8");
const main = fs.readFileSync(path.join(root, "views/teach-main.html"), "utf8");
const js = fs.readFileSync(path.join(root, "public/teacher.js"), "utf8");
const START = "<!-- MAIN:START -->", END = "<!-- MAIN:END -->";
const s = classic.indexOf(START), e = classic.indexOf(END);
if (s < 0 || e < s) { console.error("teacher.html has lost its MAIN markers"); process.exit(1); }
const ids = (html) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const swappedOut = ids(classic.slice(s, e)), inNew = ids(main);
const used = new Set([...js.matchAll(/\$\("([A-Za-z0-9_-]+)"\)|getElementById\("([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1] || m[2]));
const classicOnly = new Set(["newUiLink"]); // the engine checks these exist before touching them
const missing = [...swappedOut].filter((id) => used.has(id) && !inNew.has(id) && !classicOnly.has(id));
const dup = [...main.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]).filter((id, i, a) => a.indexOf(id) !== i);
const clash = [...inNew].filter((id) => ids(classic.slice(0, s) + classic.slice(e)).has(id));
if (missing.length || dup.length || clash.length) {
  if (missing.length) console.error("Missing from views/teach-main.html (the engine uses them):", missing.join(", "));
  if (dup.length) console.error("Used twice in views/teach-main.html:", [...new Set(dup)].join(", "));
  if (clash.length) console.error("Also defined in the shared part of teacher.html:", clash.join(", "));
  process.exit(1);
}
console.log(`ok: ${[...swappedOut].filter((id) => used.has(id)).length} engine ids present on the new page`);
