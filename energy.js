/* Energie und Verbrauch: aus Zählerständen den Verbrauch je Zeitraum berechnen und Auffälliges finden.
   readings: [{read_on: "JJJJ-MM-TT", value}] eines Zählers, beliebig sortiert. */
(function (root) {
  var DAY = 86400000;
  function days(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY); }

  // Verbrauch zwischen zwei Ablesungen; fällt der Stand (Zählertausch), zählt der Abschnitt nicht
  function consumption(readings) {
    var r = (readings || []).slice().sort(function (a, b) { return a.read_on < b.read_on ? -1 : 1; });
    var out = [];
    for (var i = 1; i < r.length; i++) {
      var d = days(r[i - 1].read_on, r[i].read_on), used = Number(r[i].value) - Number(r[i - 1].value);
      if (d <= 0) continue;
      out.push({ from: r[i - 1].read_on, to: r[i].read_on, days: d, used: used, perDay: used / d, reset: used < 0 });
    }
    return out;
  }

  // Monatssummen (Verbrauch tageweise auf die Monate verteilt)
  function monthly(readings) {
    var m = {};
    consumption(readings).forEach(function (p) {
      if (p.reset) return;
      for (var i = 0; i < p.days; i++) {
        var d = new Date(Date.parse(p.from + "T00:00:00Z") + i * DAY).toISOString().slice(0, 7);
        m[d] = (m[d] || 0) + p.perDay;
      }
    });
    return Object.keys(m).sort().map(function (k) { return { month: k, used: Math.round(m[k] * 10) / 10 }; });
  }

  function median(xs) { var s = xs.slice().sort(function (a, b) { return a - b; }); var n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }

  // Hinweise: letzter Abschnitt deutlich über dem üblichen Tagesverbrauch, Zählerstand gesunken, lange nicht abgelesen
  function energyAlerts(readings, opts) {
    opts = opts || {};
    var p = consumption(readings), out = [];
    var normal = p.filter(function (x) { return !x.reset; });
    var last = normal[normal.length - 1];
    var before = normal.slice(Math.max(0, normal.length - 9), normal.length - 1).map(function (x) { return x.perDay; });
    var med = median(before);
    if (last && before.length >= 3 && med > 0 && last.perDay > med * (opts.factor || 1.3)) out.push({ code: "high", value: Math.round((last.perDay / med - 1) * 100), from: last.from, to: last.to });
    p.forEach(function (x) { if (x.reset) out.push({ code: "reset", from: x.from, to: x.to }); });
    var r = (readings || []).map(function (x) { return x.read_on; }).sort();
    if (opts.today && r.length && days(r[r.length - 1], opts.today) > (opts.staleDays || 35)) out.push({ code: "stale", value: days(r[r.length - 1], opts.today) });
    return out;
  }

  // Verbrauch im Zeitraum (anteilig) – z. B. je belegtem Zimmer
  function usedBetween(readings, from, to) {
    var sum = 0;
    consumption(readings).forEach(function (p) {
      if (p.reset) return;
      var a = p.from > from ? p.from : from, b = p.to < to ? p.to : to;
      var d = days(a, b); if (d > 0) sum += p.perDay * d;
    });
    return sum;
  }

  root.energyConsumption = consumption;
  root.energyMonthly = monthly;
  root.energyAlerts = energyAlerts;
  root.energyUsedBetween = usedBetween;
})(typeof window !== "undefined" ? window : globalThis);
