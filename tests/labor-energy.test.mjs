// Ausführen mit: node --test tests/labor-energy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import "../labor.js";
import "../energy.js";
import "../payroll.js";

const S = (d, a, b) => ({ shift_date: d, start_time: a, end_time: b });
const codes = (w) => w.map((x) => x.code).sort();

test("Arbeitsrecht: Tageshöchstzeit, Ruhezeit, Wochenstunden (Österreich)", () => {
  // 06:00–17:30 = 11,5 h, abzüglich 30 Min. Pause = 11 h > 10 h
  assert.deepEqual(codes(laborWarnings([S("2026-11-03", "06:00", "17:30")], { region: "AT-9", fullWeek: false })), ["day"]);
  // Spät bis 22:30, nächster Tag Früh 06:00 = 7,5 h Ruhe
  const w = laborWarnings([S("2026-11-03", "14:00", "22:30"), S("2026-11-04", "06:00", "14:30")], { region: "AT", fullWeek: false });
  assert.deepEqual(w.map((x) => [x.code, x.value]), [["rest", 7.5]]);
  // 6 x 9 h netto = 54 h > 48 h und keine 36 h Wochenruhe
  const week = ["03", "04", "05", "06", "07", "08"].map((d) => S("2026-11-" + d, "06:00", "15:30")).concat([S("2026-11-09", "06:00", "15:30")]);
  const ww = laborWarnings(week.slice(0, 6), { region: "AT" });
  assert.ok(ww.some((x) => x.code === "week" && x.value === 54));
  assert.ok(laborWarnings(week, { region: "AT" }).some((x) => x.code === "daysInRow" && x.value === 7), "7 Tage in Folge");
  // Montag frei bis Sonntag: Wochenruhe vorhanden
  assert.ok(!laborWarnings([S("2026-11-03", "06:00", "14:30")], { region: "AT" }).some((x) => x.code === "weeklyRest"));
});

test("Arbeitsrecht: Pausen aus Zeitbuchungen, Schweiz, Sonn- und Feiertage", () => {
  const entries = [{ clock_in: "2026-11-03T06:00:00Z", clock_out: "2026-11-03T14:00:00Z", break_minutes: 10 }];
  assert.deepEqual(laborWarnings([], { region: "AT", entries }).map((x) => [x.code, x.value]), [["break", 30]]);
  assert.equal(laborBreakNeeded(9.5, laborRulesFor("DE")), 45);
  assert.equal(laborBreakNeeded(6, laborRulesFor("CH")), 15);
  assert.equal(laborCountry("FR"), "AT", "unbekanntes Land: österreichische Regeln");
  // CH erlaubt 50 h – 5 x 10 h ist dort in Ordnung
  const five = ["02", "03", "04", "05", "06"].map((d) => S("2026-11-" + d, "07:00", "17:30"));
  assert.ok(!laborWarnings(five, { region: "CH", fullWeek: false }).some((x) => x.code === "week"));
  assert.ok(laborWarnings(five, { region: "DE", fullWeek: false }).some((x) => x.code === "week"));
  const sun = laborWarnings([S("2026-11-08", "07:00", "15:00"), S("2026-12-25", "07:00", "15:00")], { region: "AT", holidays: { "2026-12-25": "Christtag" }, fullWeek: false });
  assert.deepEqual(codes(sun), ["holiday", "sunday"]);
});

test("Energie: Verbrauch, Monate, Auffälligkeiten", () => {
  const r = [
    { read_on: "2026-01-01", value: 1000 }, { read_on: "2026-01-11", value: 1100 }, { read_on: "2026-01-21", value: 1200 },
    { read_on: "2026-01-31", value: 1300 }, { read_on: "2026-02-10", value: 1400 }, { read_on: "2026-02-20", value: 1600 },
  ];
  const p = energyConsumption(r);
  assert.equal(p.length, 5); assert.equal(p[4].perDay, 20);
  const m = energyMonthly(r);
  assert.deepEqual(m.map((x) => x.month), ["2026-01", "2026-02"]);
  assert.equal(m[0].used + m[1].used, 600);
  const a = energyAlerts(r, { today: "2026-02-21" });
  assert.deepEqual(a.map((x) => [x.code, x.value]), [["high", 100]], "doppelter Tagesverbrauch");
  assert.ok(energyAlerts(r, { today: "2026-04-30" }).some((x) => x.code === "stale"));
  assert.ok(energyAlerts([...r, { read_on: "2026-03-01", value: 5 }]).some((x) => x.code === "reset"), "Zählertausch erkannt");
  assert.equal(energyUsedBetween(r, "2026-01-06", "2026-01-16"), 100);
});

test("Lohnarten-Export: Überstunden, Zuschläge, DATEV LODAS", () => {
  const rows = [{ key: "u:1", name: "Ana", target: 160, worked: 170, entries: 20, night: 12, sunday: 0, holiday: 0, vacation: 2, sick: 0 },
    { key: "n:max", name: "Max", target: null, worked: 40, entries: 5, night: 0, sunday: 8, holiday: 0, vacation: 0, sick: 1 }];
  const lines = payrollLines(rows, { la: { worked: "100", overtime: "110", night: "210", sunday: "220", vacation: "300", sick: "310" }, pnr: { "u:1": "1001" } });
  assert.deepEqual(lines.map((l) => [l.name, l.la, l.value]), [["Ana", "100", 160], ["Ana", "110", 10], ["Ana", "210", 12], ["Ana", "300", 2], ["Max", "100", 40], ["Max", "220", 8], ["Max", "310", 1]]);
  const csv = payrollLinesCsv(lines, "2026-11");
  assert.match(csv, /1001;Ana;110;10;2026-11/);
  const lodas = payrollDatevLodas(lines, "2026-11", { berater: "1234", mandant: "56" });
  assert.match(lodas, /BeraterNr=1234\r\nMandantenNr=56/);
  assert.match(lodas, /1;01112026;1001;100;1;160,00;/);
  assert.ok(!lodas.includes("Max"), "ohne Personalnummer nicht in LODAS");
});
