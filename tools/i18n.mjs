// Übersetzungen pflegen.
//   node tools/i18n.mjs missing            → neue, noch nicht übersetzte Texte aus src/app/*.jsx (ohne bekannte technische Texte)
//   node tools/i18n.mjs add datei.txt …    → Übersetzungen in src/i18n.js eintragen
//   node tools/i18n.mjs baseline           → aktuelle Restliste als „bekannt/technisch“ merken (tools/i18n-ignore.txt)
// Format für add: je Text ein Block aus 10 Zeilen (de, en, fr, it, es, pt, tr, ja, zh, ar), Blöcke durch Leerzeile getrennt.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseMod from "@babel/traverse";
const traverse = traverseMod.default;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const I18N = path.join(ROOT, "src/i18n.js");
const IGNORE = path.join(ROOT, "tools/i18n-ignore.txt");
const LANGS = ["en", "fr", "it", "es", "pt", "tr", "ja", "zh", "ar"];
const START = "startI18n(initialUiLanguage());";

function appSource() {
  const dir = path.join(ROOT, "src/app");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".jsx")).sort().map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("");
}
// Alle sichtbaren Texte: JSX-Text, Zeichenketten (ohne Style/Klassen/Schlüssel), Vorlagen von tf()
function extract(code) {
  const ast = parse(code, { sourceType: "script", plugins: ["jsx"] });
  const out = new Set();
  const keep = (t) => { t = String(t).replace(/\s+/g, " ").trim(); if (t.length >= 2 && /[A-Za-zÄÖÜäöüß]{2,}/.test(t)) out.add(t); };
  const skip = (p) => {
    const parent = p.parentPath;
    if (!parent) return false;
    if (parent.isJSXAttribute()) return ["style", "className", "type", "key", "value", "href", "src", "data-no-i18n", "dir", "min", "max", "accept", "rel", "target", "id", "name", "role", "color", "bg", "inputMode", "autoComplete", "method", "list"].includes(parent.node.name.name);
    if (parent.isObjectProperty() && parent.node.key === p.node) return true;
    if (parent.isMemberExpression()) return true;
    if (parent.isCallExpression() && parent.node.callee.type === "Import") return true;
    return false;
  };
  traverse(ast, {
    JSXText(p) { keep(p.node.value); },
    StringLiteral(p) { if (!skip(p)) keep(p.node.value); },
    TemplateLiteral(p) { p.node.quasis.forEach((q) => keep(q.value.cooked || "")); },
  });
  // Technisches weglassen: HTML/XML, Pfade, CSS, Bezeichner
  return [...out].filter((t) => !/^(https?:|\/|#|<|>|"|;|\.|\[|_|data:|[a-z_]+$|[a-z-]+ ?[a-z-]*$)/.test(t) && !/^[A-Z_]+$/.test(t) && !/[<>{}]=?["']|w:|xmlns|rgba?\(|px\b|minmax\(/.test(t)).sort();
}
function loadI18n() {
  const ctx = { window: { confirm: () => true, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, location: {} }, document: {}, navigator: { language: "de" }, MutationObserver: class {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(I18N, "utf8").replace(START, "") + ";this.__I=I18N;this.__T=I18N_TF;this.__P=I18N_PATTERNS;", ctx);
  return ctx;
}
function missing() {
  const ctx = loadI18n();
  const ignore = new Set(fs.existsSync(IGNORE) ? fs.readFileSync(IGNORE, "utf8").split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean) : []);
  return extract(appSource()).filter((k) => !(k in ctx.__I.en) && !(k in (ctx.__T.en || {})) && !(ctx.__P.en || []).some(([re]) => re.test(k)) && !ignore.has(k));
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "missing") {
  const m = missing();
  console.log(m.join("\n"));
  console.error(m.length + " Texte ohne Übersetzung");
} else if (cmd === "baseline") {
  const m = missing();
  const old = fs.existsSync(IGNORE) ? fs.readFileSync(IGNORE, "utf8").split("\n").filter(Boolean) : [];
  fs.writeFileSync(IGNORE, [...new Set([...old, ...m])].sort().join("\n") + "\n");
  console.log(m.length + " Texte als bekannt markiert");
} else if (cmd === "add") {
  const out = [], seen = new Set();
  for (const f of args) {
    for (const b of fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n\n")) {
      if (!b.trim()) continue;
      const l = b.replace(/^\n+|\n+$/g, "").split("\n");
      if (l.length !== 10) { console.error(`${f}: Block mit ${l.length} statt 10 Zeilen: ${l[0]}`); process.exit(1); }
      for (const x of l.slice(1)) for (const ph of l[0].match(/\{\d\}/g) || []) if (!x.includes(ph)) { console.error(`Platzhalter ${ph} fehlt: ${x}`); process.exit(1); }
      if (seen.has(l[0])) continue;
      seen.add(l[0]);
      LANGS.forEach((lang, i) => out.push(`I18N.${lang}[${JSON.stringify(l[0])}] = ${JSON.stringify(l[i + 1])};`));
    }
  }
  const src = fs.readFileSync(I18N, "utf8");
  if (src.split(START).length !== 2) throw new Error(START + " nicht eindeutig in src/i18n.js");
  fs.writeFileSync(I18N, src.replace(START, out.join("\n") + "\n\n" + START));
  console.log(seen.size + " Texte eingetragen – danach `npm run build`");
} else {
  console.log("Verwendung: node tools/i18n.mjs missing | add datei.txt … | baseline");
}
