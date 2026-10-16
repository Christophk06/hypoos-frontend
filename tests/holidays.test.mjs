// Prüft holidays.js gegen bekannte Termine. Ausführen: node tests/holidays.test.mjs
import assert from "node:assert/strict";
await import("../holidays.js");
const { holidaysFor, holidayMap, easterSunday, holidayRegionLabel, HOLIDAY_REGIONS } = globalThis;
const has = (r, y, d, name) => { const h = holidaysFor(r, y).find((x) => x.date === d); assert.ok(h, `${r} ${d} fehlt`); if (name) assert.equal(h.name, name); };

assert.equal(easterSunday(2024), "2024-03-31");
assert.equal(easterSunday(2026), "2026-04-05");
assert.equal(easterSunday(2027), "2027-03-28");
assert.equal(easterSunday(2038), "2038-04-25");

has("AT", 2026, "2026-06-04", "Fronleichnam"); has("AT", 2026, "2026-10-26"); has("AT", 2026, "2026-12-08");
assert.equal(holidaysFor("AT", 2026).length, 13);
assert.equal(holidaysFor("DE", 2026).length, 9);
has("DE-SN", 2026, "2026-11-18", "Buß- und Bettag"); has("DE-SN", 2027, "2027-11-17", "Buß- und Bettag");
has("DE-BY", 2026, "2026-08-15"); has("DE-BE", 2026, "2026-03-08"); has("DE-TH", 2026, "2026-09-20");
assert.ok(!holidaysFor("DE-HH", 2026).some((h) => h.date === "2026-01-06"), "Hamburg ohne Heilige Drei Könige");
has("CH-ZH", 2026, "2026-08-01"); has("CH-GE", 2026, "2026-09-10", "Jeûne genevois");
has("GB-ENG", 2026, "2026-05-04"); has("GB-ENG", 2026, "2026-05-25"); has("GB-ENG", 2026, "2026-08-31");
has("GB-ENG", 2027, "2027-12-27", "Christmas Day"); has("GB-ENG", 2027, "2027-12-28", "Boxing Day"); // 25. = Samstag
has("GB-ENG", 2022, "2022-12-26", "Boxing Day"); has("GB-ENG", 2022, "2022-12-27", "Christmas Day"); // 25. = Sonntag
has("US", 2026, "2026-11-26", "Thanksgiving Day"); has("US", 2026, "2026-07-03", "Independence Day"); // 4. Juli = Samstag
has("IE", 2026, "2026-02-02", "St Brigid’s Day"); has("IE", 2027, "2027-02-01", "St Brigid’s Day"); // 1. Feb 2027 = Montag
has("NL", 2026, "2026-04-27"); has("NL", 2025, "2025-04-26", "Koningsdag"); // 27.4.2025 = Sonntag
has("IT", 2026, "2026-04-06"); has("FR", 2026, "2026-05-25"); has("ES", 2026, "2026-04-03"); has("PT", 2026, "2026-06-04", "Corpo de Deus");
assert.deepEqual(Object.keys(holidayMap("AT", "2026-12-20", "2027-01-07")), ["2026-12-25", "2026-12-26", "2027-01-01", "2027-01-06"]);
assert.deepEqual(holidayMap(null, "2026-01-01", "2026-12-31"), {});
assert.deepEqual(holidaysFor("XX", 2026), []);
assert.equal(holidayRegionLabel("DE-BY", "de"), "Deutschland – Bayern");
assert.ok(HOLIDAY_REGIONS.length >= 30);
// Jeder Feiertag liegt im angefragten Jahr – außer US-Ersatztage (1.1.2028 = Samstag -> 31.12.2027)
has("US", 2028, "2027-12-31", "New Year’s Day");
for (const r of HOLIDAY_REGIONS) for (const y of [2025, 2026, 2027, 2028]) for (const h of holidaysFor(r, y)) if (!(r === "US" && h.date === (y - 1) + "-12-31")) assert.match(h.date, new RegExp("^" + y + "-\\d\\d-\\d\\d$"), r + " " + h.name);
console.log("Feiertage: alle Prüfungen bestanden");
