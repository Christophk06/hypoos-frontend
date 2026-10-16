// Prüft payroll.js (Frontend). Ausführen: TZ=Europe/Vienna node tests/payroll.test.mjs
import assert from "node:assert/strict";
await import("../payroll.js");
const { payrollSummary, splitTimeEntry, payrollCsv } = globalThis;
// Sonntag 1.11.2026, 20:00–04:00 (8 h), 30 min Pause
let p = splitTimeEntry({ clock_in: "2026-11-01T20:00:00+01:00", clock_out: "2026-11-02T04:00:00+01:00", break_minutes: 30 });
assert.equal(p.worked, 450); assert.equal(Math.round(p.night), Math.round(360 * 450 / 480)); assert.equal(Math.round(p.sunday), Math.round(240 * 450 / 480));
p = splitTimeEntry({ clock_in: "2026-11-03T06:00:00+01:00", clock_out: "2026-11-03T14:30:00+01:00", break_minutes: 30 });
assert.equal(p.worked, 480); assert.equal(p.night, 0); assert.equal(p.sunday, 0);
const rows = payrollSummary({ month: "2026-11", nameOf: (id) => id + "@x",
  shifts: [{ user_id: "a", department: "Housekeeping", shift_date: "2026-11-03", kind: "Früh", start_time: "06:00", end_time: "14:30" },
           { user_id: "a", department: "Housekeeping", shift_date: "2026-11-04", kind: "Urlaub" },
           { employee_name: "Aushilfe", department: "Housekeeping", shift_date: "2026-11-05", kind: "Spät", start_time: "14:00", end_time: "22:30" },
           { user_id: "a", department: "Housekeeping", shift_date: "2026-12-01", kind: "Früh", start_time: "06:00", end_time: "14:30" }],
  entries: [{ user_id: "a", department: "Housekeeping", clock_in: "2026-11-03T06:02:00+01:00", clock_out: "2026-11-03T14:40:00+01:00", break_minutes: 30, edited_by: "m" },
            { user_id: "a", department: "Housekeeping", clock_in: "2026-11-30T23:00:00+01:00", clock_out: null, break_minutes: 0 },
            { user_id: "a", department: "Housekeeping", clock_in: "2026-10-31T22:00:00+01:00", clock_out: "2026-11-01T06:00:00+01:00", break_minutes: 0 }],
  targets: [{ user_id: "a", department: "Housekeeping", weekly_hours: 40 }] });
const a = rows.find((r) => r.user_id === "a");
assert.equal(a.planned, 8.5); assert.equal(a.vacation, 1); assert.equal(a.entries, 1, "Oktober-Buchung zählt nicht"); assert.equal(a.open, 1);
assert.equal(a.worked, Math.round((8 + 8 / 60) * 100) / 100); assert.equal(a.target, Math.round(40 * 30 / 7 * 100) / 100); assert.equal(a.corrected, 1);
assert.ok(a.diff < 0);
const h = rows.find((r) => r.name === "Aushilfe"); assert.equal(h.planned, 8.5); assert.equal(h.diff, null);
assert.equal(payrollCsv(["a", "b"], [["x;y", 1]]), "\ufeffa;b\r\n\"x;y\";1");
assert.equal(payrollSummary({ month: "2026-11", today: "2026-11-15", targets: [{ user_id: "z", department: "X", weekly_hours: 7 }] })[0].target, 15, "laufender Monat");
console.log("payroll ok");
