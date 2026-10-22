// Baut die App für den Browser – damit sie am Handy schnell öffnet:
//  - src/app/*.jsx → app.js (JSX vorab übersetzt und verkleinert, kein Babel im Browser)
//  - src/i18n.js  → i18n.js (nur die Übersetzungs-Logik) + lang/<sprache>.js (je Sprache ein Wörterbuch,
//                   geladen wird nur die Sprache, die gerade gebraucht wird)
//  - src/index.html → index.html (mit Versions-Kennung an jeder Datei, damit nichts Altes aus dem Cache kommt)
//
// Ausführen: npm run build        Prüfen, ob die gebauten Dateien aktuell sind: npm run check
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { transform, build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const lf = (s) => s.replace(/\r\n/g, "\n"); // gleiche Ausgabe unter Windows und Linux
const read = (f) => lf(fs.readFileSync(path.join(ROOT, f), "utf8"));
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
const outputs = new Map();
const emit = (f, content) => outputs.set(f, content);

// ---------- App ----------
// Quellcode liegt thematisch aufgeteilt in src/app/*.jsx; zusammengefügt in Dateireihenfolge (gemeinsamer Gültigkeitsbereich wie vorher)
const appSource = fs.readdirSync(path.join(ROOT, "src/app")).filter((f) => f.endsWith(".jsx")).sort().map((f) => read("src/app/" + f)).join("");
const app = (await transform(appSource, {
  loader: "jsx", minify: true, target: "es2019", charset: "utf8", legalComments: "none",
})).code;
emit("app.js", app);

// ---------- Word-Bibliotheken (nur bei Bedarf geladen) ----------
const vendor = await build({ entryPoints: [path.join(ROOT, "src/vendor-docx.js")], bundle: true, write: false, minify: true, format: "iife",
  target: "es2019", charset: "utf8", legalComments: "none", platform: "browser", logLevel: "silent" });
emit("vendor/docx.js", "// Gebaut aus src/vendor-docx.js (docxtemplater, pizzip) – nicht von Hand ändern.\n" + lf(vendor.outputFiles[0].text));

// ---------- Übersetzungen ----------
const src = read("src/i18n.js");
const DATA_START = src.indexOf("/* ------------------------------ Englisch");
if (DATA_START < 0) throw new Error("Marker für den Datenteil in src/i18n.js fehlt");
const START_CALL = "startI18n(initialUiLanguage());";
if (!src.includes(START_CALL)) throw new Error(START_CALL + " fehlt in src/i18n.js");

const ctx = {
  window: { confirm: () => true, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, location: {} },
  document: { documentElement: {}, addEventListener() {} }, navigator: { language: "de" }, MutationObserver: class {}, console,
};
vm.createContext(ctx);
vm.runInContext(src.replace(START_CALL, "") + ";this.__I=I18N;this.__T=I18N_TF;this.__P=I18N_PATTERNS;this.__L=LANGS;", ctx);
const langs = ctx.__L.map(([c]) => c).filter((c) => c !== "de");

const serPattern = ([re, rep]) => `[${re.toString()},${typeof rep === "function" ? rep.toString() : JSON.stringify(rep)}]`;
const langHashes = {};
for (const l of langs) {
  const body = [
    `Object.assign(I18N.${l},${JSON.stringify(ctx.__I[l] || {})});`,
    `Object.assign(I18N_TF.${l},${JSON.stringify(ctx.__T[l] || {})});`,
    `I18N_PATTERNS.${l}=[${(ctx.__P[l] || []).map(serPattern).join(",\n")}];`,
    `startI18n(${JSON.stringify(l)});`,
  ].join("\n");
  emit(`lang/${l}.js`, "// Gebaut aus src/i18n.js – nicht von Hand ändern.\n" + body + "\n");
  langHashes[l] = hash(body);
}

const core = (await transform(src.slice(0, DATA_START) + `
const I18N = {}; const I18N_PATTERNS = {};
LANGS.forEach(([c]) => { if (c !== "de") { I18N[c] = {}; I18N_TF[c] = {}; I18N_PATTERNS[c] = []; } });
// Nur die Sprache laden, die gebraucht wird; Deutsch braucht kein Wörterbuch.
(function(){
  var v = ${JSON.stringify(langHashes)};
  var l = initialUiLanguage();
  if (l === "de" || !v[l]) { startI18n("de"); return; }
  UI_LANG = l; UI_LOCALE = LOCALES[l];
  var base = (document.currentScript && document.currentScript.src || "").replace(/i18n\\.js(\\?.*)?$/, "");
  document.write('<script src="' + base + 'lang/' + l + '.js?v=' + v[l] + '"><\\/script>');
})();
`, { loader: "js", minify: true, target: "es2019", charset: "utf8", legalComments: "none" })).code;
emit("i18n.js", core);

// ---------- Seiten ----------
const ver = (f) => `${f}?v=${hash(outputs.get(f) ?? read(f))}`;
const appVersion = hash(app + core).slice(0, 7);
let html = read("src/index.html");
if (!html.includes("<!--APP-->")) throw new Error("<!--APP--> fehlt in src/index.html");
html = html
  .replace("<!--APP-->", `<script>window.__APP_VERSION=${JSON.stringify(appVersion)};window.__DOCX_SRC=${JSON.stringify(ver("vendor/docx.js"))};window.__LAZY=${JSON.stringify({ "event-templates.js": ver("event-templates.js"), "doc-templates.js": ver("doc-templates.js") })};</script>\n<script src="${ver("app.js")}"></script>`)
  .replace(/<script src="(i18n\.js|payroll\.js|holidays\.js|planning\.js|labor\.js|energy\.js|event-templates\.js|doc-templates\.js)"><\/script>/g, (m, f) => `<script src="${ver(f)}"></script>`)
  // Live-Demo: Daten und Mock ebenfalls mit Versions-Kennung
  .replace(`'<script src="demo/demo-mock.js"><\\/script>'`, `'<script src="${ver("demo/demo-mock.js")}"><\\/script>'`)
  .replace(`+ '.js"><\\/script>'`, `+ '.js?v=${hash(fs.readdirSync(path.join(ROOT, "demo")).filter((f) => f.startsWith("data-")).sort().map((f) => read("demo/" + f)).join(""))}"><\\/script>'`);
emit("index.html", "<!-- Gebaut aus src/index.html und src/app/*.jsx (npm run build) – nicht von Hand ändern. -->\n" + html);

// ---------- Schreiben oder prüfen ----------
let stale = [];
for (const [f, content] of outputs) {
  const p = path.join(ROOT, f);
  const old = fs.existsSync(p) ? lf(fs.readFileSync(p, "utf8")) : null;
  if (old === content) continue;
  if (CHECK) { stale.push(f); continue; }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
if (CHECK && stale.length) {
  console.error("Nicht aktuell – bitte `npm run build` ausführen und committen:\n  " + stale.join("\n  "));
  process.exit(1);
}
const kb = (f) => (Buffer.byteLength(outputs.get(f)) / 1024).toFixed(0) + " KB";
console.log(`${CHECK ? "Aktuell" : "Gebaut"}: app.js ${kb("app.js")}, i18n.js ${kb("i18n.js")}, lang/en.js ${kb("lang/en.js")}, Version ${appVersion}`);
