// Prüft planning.js (kritischer Pfad). Ausführen: node tests/planning.test.mjs
import assert from "node:assert/strict";
await import("../planning.js");
const { planTasks, delayImpact } = globalThis;

const tasks = [
  { id: "pms", title: "PMS installieren", due_date: "2026-10-01", duration_days: 10, depends_on: [] },
  { id: "train", title: "PMS-Schulung", due_date: "2026-10-20", duration_days: 5, depends_on: ["pms"] },
  { id: "test", title: "Probe-Check-in", due_date: "2026-10-30", duration_days: 3, depends_on: ["train"] },
  { id: "late", title: "Netzwerk", due_date: "2026-10-18", duration_days: 2, depends_on: [] },
  { id: "wifi", title: "WLAN-Test", due_date: "2026-10-19", duration_days: 4, depends_on: ["late"] }, // beginnt 15.10., Netzwerk erst 18.10. -> Konflikt 3 Tage
  { id: "done", title: "Erledigt", due_date: "2026-09-01", status: "Abgeschlossen", depends_on: [] },
  { id: "free", title: "Unabhängig", due_date: "2026-10-05", depends_on: [] },
];
const p = planTasks(tasks, "2026-11-01");
assert.deepEqual(p.conflicts, [{ task: "wifi", pred: "late", days: 3 }]);
assert.equal(p.slack.test, 2, "Probe-Check-in hat 2 Tage bis zur Eröffnung");
assert.equal(p.slack.train, 7); assert.equal(p.slack.pms, 14);
assert.ok(!p.critical.free, "unverknüpfte Aufgaben sind nie kritisch");
// Netzwerk: spätestes Ende = Beginn WLAN-Test (15.10.) -> Puffer -3 -> kritisch
assert.equal(p.slack.late, -3); assert.ok(p.critical.late);

// Was-wäre-wenn: PMS 20 Tage später -> Schulung und Probe-Check-in rutschen, Eröffnung um 0 bzw. mehr Tage
const d = delayImpact(tasks, "pms", 20, "2026-11-01");
assert.deepEqual(d.affected, [{ id: "train", delay: 6, new_due: "2026-10-26" }], "Probe-Check-in hat noch Puffer");
assert.equal(d.opening_delay, 0);
const d2 = delayImpact(tasks, "pms", 30, "2026-11-01");
assert.deepEqual(d2.affected.map((a) => a.id), ["train", "test"]);
assert.equal(d2.opening_delay, 7, "Eröffnung wäre um 7 Tage gefährdet");

// Kreis bricht nicht
const loop = planTasks([{ id: "a", due_date: "2026-10-10", depends_on: ["b"] }, { id: "b", due_date: "2026-10-12", depends_on: ["a"] }], "2026-11-01");
assert.ok(Array.isArray(loop.conflicts));
console.log("Kritischer Pfad: alle Prüfungen bestanden");
