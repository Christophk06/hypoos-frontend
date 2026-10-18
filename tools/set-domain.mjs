// Eigene Domain eintragen: ersetzt die Render-Adresse der Webseite in Links, Sitemap und robots.txt.
// Aufruf: node tools/set-domain.mjs ouverture.at
// Die Server-Adresse (hpoos-backend-1.onrender.com) bleibt, bis auch dafür eine Domain eingerichtet ist.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domain = String(process.argv[2] || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
  console.error("Bitte eine Domain angeben, z. B.: node tools/set-domain.mjs ouverture.at");
  process.exit(1);
}
const OLD = "https://hypoos-frontend.onrender.com";
const NEW = "https://" + domain;
const files = ["landing.html", "dienstplan-hotel.html", "pre-opening-checkliste.html", "sitemap.xml", "robots.txt"];
let changed = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, "utf8");
  if (!s.includes(OLD)) continue;
  fs.writeFileSync(p, s.split(OLD).join(NEW));
  console.log("  " + f);
  changed++;
}
console.log(changed ? `Fertig: ${changed} Dateien zeigen jetzt auf ${NEW}.` : "Nichts zu ändern.");
console.log("Nicht vergessen: bei Render (Backend) APP_URL=" + NEW + " setzen und in Supabase die Site-URL anpassen.");
