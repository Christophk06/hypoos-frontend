/* Dienstplan nach Arbeitsrecht prüfen – Hinweise, keine Rechtsberatung.
   Grundregeln je Land (Kollektivverträge können abweichen, z. B. Gastgewerbe AT: geteilte Dienste, 8 h Ruhezeit):
   AT  (AZG/ARG): höchstens 10 h am Tag, 48 h pro Woche (im Schnitt), 11 h Ruhezeit, 30 Min. Pause ab 6 h, 36 h Wochenruhe
   DE  (ArbZG):   höchstens 10 h am Tag, 48 h pro Woche, 11 h Ruhezeit, 30 Min. ab 6 h / 45 Min. ab 9 h, Sonn- und Feiertagsruhe
   CH  (ArG):     höchstens 50 h pro Woche, 11 h Ruhezeit, 15 Min. ab 5,5 h / 30 Min. ab 7 h / 60 Min. ab 9 h
   Eingabe: Schichten EINER Person (Arbeitsschichten mit Beginn/Ende), Pausen aus Zeitbuchungen optional. */
(function (root) {
  var RULES = {
    AT: { dayMax: 10, weekMax: 48, rest: 11, weeklyRest: 36, maxDaysInRow: 6, breaks: [[6, 30]] },
    DE: { dayMax: 10, weekMax: 48, rest: 11, weeklyRest: 35, maxDaysInRow: 6, breaks: [[6, 30], [9, 45]] },
    CH: { dayMax: 12.5, weekMax: 50, rest: 11, weeklyRest: 35, maxDaysInRow: 6, breaks: [[5.5, 15], [7, 30], [9, 60]] },
  };
  RULES.LI = RULES.CH;

  function countryOf(region) { var c = String(region || "AT").slice(0, 2).toUpperCase(); return RULES[c] ? c : "AT"; }
  function rulesFor(region) { return RULES[countryOf(region)]; }
  function toMin(t) { var p = String(t).split(":"); return Number(p[0]) * 60 + Number(p[1] || 0); }
  function span(s) { // Minuten seit 1970 (UTC-Tagesraster, wie im Plan)
    var d = Date.UTC(+s.shift_date.slice(0, 4), +s.shift_date.slice(5, 7) - 1, +s.shift_date.slice(8, 10)) / 60000;
    var a = d + toMin(s.start_time), b = d + toMin(s.end_time);
    if (b <= a) b += 1440;
    return [a, b];
  }
  // Nötige Pause für eine Dauer in Stunden
  function breakNeeded(hours, rules) { var need = 0; (rules.breaks || []).forEach(function (r) { if (hours > r[0]) need = r[1]; }); return need; }

  // Liefert Hinweise als [{code, date, value}] – die Oberfläche formuliert sie in der Sprache der Person.
  function laborWarnings(shifts, opts) {
    opts = opts || {};
    var rules = rulesFor(opts.region);
    var own = (shifts || []).filter(function (s) { return s.start_time && s.end_time; }).slice().sort(function (a, b) { return span(a)[0] - span(b)[0]; });
    var out = [];
    var hoursOf = function (s) { var x = span(s); return (x[1] - x[0]) / 60; };
    own.forEach(function (s) {
      var h = hoursOf(s);
      // Geplante Schichten enthalten die Pause; ohne Pause wäre die Arbeitszeit h - Pause
      var work = h - breakNeeded(h, rules) / 60;
      if (work > rules.dayMax) out.push({ code: "day", date: s.shift_date, value: Math.round(work * 10) / 10 });
      if (opts.holidays && opts.holidays[s.shift_date]) out.push({ code: "holiday", date: s.shift_date, value: opts.holidays[s.shift_date] });
      else if (new Date(s.shift_date + "T12:00:00Z").getUTCDay() === 0) out.push({ code: "sunday", date: s.shift_date });
    });
    for (var i = 1; i < own.length; i++) {
      var rest = (span(own[i])[0] - span(own[i - 1])[1]) / 60;
      if (rest < rules.rest) out.push({ code: "rest", date: own[i].shift_date, value: Math.round(rest * 10) / 10 });
    }
    // Wochenstunden (Montag–Sonntag) und Wochenruhe innerhalb der betrachteten Woche
    var weeks = {};
    own.forEach(function (s) {
      var d = new Date(s.shift_date + "T12:00:00Z"); var wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd);
      var k = d.toISOString().slice(0, 10); (weeks[k] = weeks[k] || []).push(s);
    });
    Object.keys(weeks).forEach(function (w) {
      var list = weeks[w];
      var total = list.reduce(function (sum, s) { var h = hoursOf(s); return sum + h - breakNeeded(h, rules) / 60; }, 0);
      if (total > rules.weekMax) out.push({ code: "week", date: w, value: Math.round(total * 10) / 10 });
      if (opts.fullWeek !== false) {
        var start = Date.UTC(+w.slice(0, 4), +w.slice(5, 7) - 1, +w.slice(8, 10)) / 60000, end = start + 7 * 1440;
        var t = start, longest = 0;
        list.map(span).forEach(function (x) { longest = Math.max(longest, x[0] - t); t = Math.max(t, x[1]); });
        longest = Math.max(longest, end - t);
        if (list.length && longest / 60 < rules.weeklyRest) out.push({ code: "weeklyRest", date: w, value: Math.round(longest / 6) / 10 });
      }
    });
    // Tage in Folge (über Wochengrenzen)
    var days = own.map(function (s) { return s.shift_date; }).filter(function (d, i, a) { return a.indexOf(d) === i; });
    var run = 1;
    for (var j = 1; j < days.length; j++) {
      var diff = (Date.parse(days[j] + "T00:00:00Z") - Date.parse(days[j - 1] + "T00:00:00Z")) / 86400000;
      run = diff === 1 ? run + 1 : 1;
      if (run === rules.maxDaysInRow + 1) out.push({ code: "daysInRow", date: days[j], value: run });
    }
    // Pausen aus echten Zeitbuchungen
    (opts.entries || []).forEach(function (e) {
      if (!e.clock_out) return;
      var gross = (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000;
      var need = breakNeeded(gross - (Number(e.break_minutes) || 0) / 60, rules);
      if ((Number(e.break_minutes) || 0) < need) out.push({ code: "break", date: String(e.clock_in).slice(0, 10), value: need });
    });
    return out;
  }

  root.laborWarnings = laborWarnings;
  root.laborRulesFor = rulesFor;
  root.laborCountry = countryOf;
  root.laborBreakNeeded = breakNeeded;
})(typeof window !== "undefined" ? window : globalThis);
