/* Monatsauswertung für die Lohnverrechnung (läuft im Browser, Ortszeit des Geräts).
   Je Person: Soll, geplant, gearbeitet, Pausen, Nacht- (22–6 Uhr), Sonntags- und Feiertagsstunden, Urlaubs- und Krankentage.
   Feiertage kommen aus holidays.js (Region des Hotels), als Karte { "JJJJ-MM-TT": Name }. */
(function (root) {
  var WORK = ["Früh", "Spät", "Nacht", "Zwischen"];

  function pad(n) { return String(n).padStart(2, "0"); }
  function localIso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function monthBounds(month) { // "2026-11" -> {start, end, days}
    var y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1;
    var start = new Date(y, m, 1), end = new Date(y, m + 1, 1);
    return { start: start, end: end, days: new Date(y, m + 1, 0).getDate(), first: localIso(start), last: localIso(new Date(y, m + 1, 0)) };
  }
  function overlap(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
  function minutesOfShift(s) {
    if (!s.start_time || !s.end_time) return 0;
    var t = function (x) { var p = String(x).split(":"); return Number(p[0]) * 60 + Number(p[1]); };
    var d = t(s.end_time) - t(s.start_time); if (d <= 0) d += 1440; return d;
  }

  // Arbeitszeit einer Buchung zerlegen: gesamt, Nacht (22–6), Sonntag – in Minuten, ohne Pause
  function splitEntry(e, holidays) {
    var a = new Date(e.clock_in).getTime(), b = new Date(e.clock_out).getTime();
    var gross = Math.max(0, (b - a) / 60000), night = 0, sunday = 0, holiday = 0;
    var day = new Date(a); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - 1);
    while (day.getTime() < b) {
      var n0 = new Date(day); n0.setHours(22, 0, 0, 0);
      var n1 = new Date(day); n1.setDate(n1.getDate() + 1); n1.setHours(6, 0, 0, 0);
      night += overlap(a, b, n0.getTime(), n1.getTime()) / 60000;
      var d1 = new Date(day); d1.setDate(d1.getDate() + 1);
      if (day.getDay() === 0) sunday += overlap(a, b, day.getTime(), d1.getTime()) / 60000;
      if (holidays && holidays[localIso(day)]) holiday += overlap(a, b, day.getTime(), d1.getTime()) / 60000;
      day.setDate(day.getDate() + 1);
    }
    var brk = Math.min(Number(e.break_minutes) || 0, gross);
    // Pause anteilig abziehen, damit Nacht/Sonntag nie über der Arbeitszeit liegen
    var f = gross ? (gross - brk) / gross : 0;
    return { worked: gross - brk, breakMin: brk, night: night * f, sunday: sunday * f, holiday: holiday * f };
  }

  function personKey(userId, name) { return userId ? "u:" + userId : "n:" + String(name || "").trim().toLowerCase(); }

  // entries: Zeitbuchungen · shifts: Schichten · targets: Soll-Stunden je Woche · nameOf(user_id) -> Anzeigename
  function payrollSummary(o) {
    var mb = monthBounds(o.month), rows = {}, list = [];
    // Laufender Monat: Soll nur bis heute (o.today = "JJJJ-MM-TT"), sonst der ganze Monat
    var days = o.today && o.today >= mb.first && o.today <= mb.last ? Number(o.today.slice(8, 10)) : mb.days;
    function row(userId, name, dept) {
      var k = personKey(userId, name);
      if (!rows[k]) { rows[k] = { key: k, user_id: userId || null, name: userId ? (o.nameOf ? o.nameOf(userId) : userId) : name, departments: [],
        target: null, planned: 0, worked: 0, breaks: 0, night: 0, sunday: 0, holiday: 0, vacation: 0, sick: 0, entries: 0, open: 0, corrected: 0 }; list.push(rows[k]); }
      if (dept && rows[k].departments.indexOf(dept) < 0) rows[k].departments.push(dept);
      return rows[k];
    }
    (o.shifts || []).forEach(function (s) {
      if (s.shift_date < mb.first || s.shift_date > mb.last) return;
      var r = row(s.user_id, s.employee_name, s.department);
      if (WORK.indexOf(s.kind) >= 0) r.planned += minutesOfShift(s) / 60;
      else if (s.kind === "Urlaub") r.vacation += 1;
      else if (s.kind === "Krank") r.sick += 1;
    });
    (o.entries || []).forEach(function (e) {
      var t = new Date(e.clock_in);
      if (t < mb.start || t >= mb.end) return;
      var r = row(e.user_id, null, e.department);
      if (!e.clock_out) { r.open += 1; return; }
      var p = splitEntry(e, o.holidays);
      r.worked += p.worked / 60; r.breaks += p.breakMin / 60; r.night += p.night / 60; r.sunday += p.sunday / 60; r.holiday += p.holiday / 60; r.entries += 1;
      if (e.edited_by) r.corrected += 1;
    });
    (o.targets || []).forEach(function (t) {
      var k = personKey(t.user_id, t.employee_name);
      var r = rows[k] || row(t.user_id, t.employee_name, t.department);
      if (r.departments.indexOf(t.department) < 0) r.departments.push(t.department);
      r.target = (r.target || 0) + Number(t.weekly_hours) * days / 7;
    });
    list.forEach(function (r) {
      r.diff = r.entries ? (r.target != null ? r.worked - r.target : null) : null;
      ["target", "planned", "worked", "breaks", "night", "sunday", "holiday", "diff"].forEach(function (f) { if (r[f] != null) r[f] = Math.round(r[f] * 100) / 100; });
    });
    return list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }

  // CSV mit Semikolon (öffnet in deutschsprachigem Excel direkt richtig)
  function toCsv(header, rows) {
    var q = function (v) { var s = v == null ? "" : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return "﻿" + [header].concat(rows).map(function (r) { return r.map(q).join(";"); }).join("\r\n");
  }

  root.payrollSummary = payrollSummary;
  root.splitTimeEntry = splitEntry;
  root.payrollMonthBounds = monthBounds;
  root.payrollCsv = toCsv;
  root.payrollSollDays = function (month, today) { var mb = monthBounds(month); return today && today >= mb.first && today <= mb.last ? Number(today.slice(8, 10)) : mb.days; };
})(typeof window !== "undefined" ? window : globalThis);
