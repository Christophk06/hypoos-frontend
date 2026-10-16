/* Abhängigkeiten und kritischer Pfad der Eröffnungsaufgaben (läuft im Browser).
   Jede Aufgabe endet am Termin (due_date) und dauert duration_days (sonst 5 Tage).
   - Konflikt: eine Vorgänger-Aufgabe endet erst nach dem Beginn der Nachfolgerin.
   - Puffer: wie viele Tage sich eine Aufgabe verschieben darf, ohne Nachfolgerinnen oder die Eröffnung zu gefährden.
   - Kritisch: Aufgaben in einer Kette ohne Puffer. */
(function (root) {
  var DAY = 86400000, DEFAULT = 5;
  function t(iso) { return new Date(iso + "T00:00:00Z").getTime(); }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function dur(x) { return Number(x.duration_days) > 0 ? Number(x.duration_days) : DEFAULT; }
  function open(x) { return x.status !== "Abgeschlossen" && x.due_date; }

  function planTasks(tasks, openingDate) {
    var byId = {}; tasks.forEach(function (x) { byId[x.id] = x; });
    var succ = {}; tasks.forEach(function (x) { (x.depends_on || []).forEach(function (p) { if (byId[p]) (succ[p] = succ[p] || []).push(x.id); }); });
    var conflicts = [];
    tasks.forEach(function (x) {
      if (!open(x)) return;
      var start = t(x.due_date) - dur(x) * DAY;
      (x.depends_on || []).forEach(function (pid) {
        var p = byId[pid]; if (!p || !open(p)) return;
        var over = Math.round((t(p.due_date) - start) / DAY);
        if (over > 0) conflicts.push({ task: x.id, pred: pid, days: over });
      });
    });
    // spätestes Ende (rückwärts über die Nachfolgerinnen), mit Schutz vor Kreisen
    var lf = {}, visiting = {};
    var limit = openingDate ? t(openingDate) : null;
    function latest(id) {
      if (lf[id] !== undefined) return lf[id];
      if (visiting[id]) return limit; visiting[id] = true;
      var best = limit;
      (succ[id] || []).forEach(function (sid) {
        var s = byId[sid]; if (!open(s)) return;
        var l = latest(sid); if (l == null) l = t(s.due_date);
        var v = Math.min(l, t(s.due_date)) - dur(s) * DAY;
        best = best == null ? v : Math.min(best, v);
      });
      visiting[id] = false; lf[id] = best; return best;
    }
    var slack = {}, critical = {};
    tasks.forEach(function (x) {
      if (!open(x)) return;
      var l = latest(x.id); if (l == null) return;
      slack[x.id] = Math.round((l - t(x.due_date)) / DAY);
      var linked = (x.depends_on || []).some(function (p) { return byId[p] && open(byId[p]); }) || (succ[x.id] || []).some(function (s) { return open(byId[s]); });
      if (linked && slack[x.id] <= 0) critical[x.id] = true;
    });
    return { conflicts: conflicts, slack: slack, critical: critical, successors: succ };
  }

  // Was passiert, wenn sich eine Aufgabe um n Tage verschiebt? Nachfolgerinnen rücken nach, wo nötig.
  function delayImpact(tasks, id, days, openingDate) {
    var byId = {}; tasks.forEach(function (x) { byId[x.id] = Object.assign({}, x); });
    var succ = planTasks(tasks, openingDate).successors;
    var newDue = {}; newDue[id] = t(byId[id].due_date) + days * DAY;
    var queue = [id], affected = [], guard = 0;
    while (queue.length && guard++ < 1000) {
      var cur = queue.shift();
      (succ[cur] || []).forEach(function (sid) {
        var s = byId[sid]; if (!open(s)) return;
        var earliestEnd = newDue[cur] + dur(s) * DAY, due = newDue[sid] || t(s.due_date);
        if (earliestEnd > due) { newDue[sid] = earliestEnd; affected.push({ id: sid, delay: Math.round((earliestEnd - t(s.due_date)) / DAY), new_due: iso(earliestEnd) }); queue.push(sid); }
      });
    }
    var last = Math.max.apply(null, [newDue[id]].concat(affected.map(function (a) { return newDue[a.id]; })));
    var beyond = openingDate ? Math.max(0, Math.round((last - t(openingDate)) / DAY)) : 0;
    return { affected: affected, opening_delay: beyond };
  }

  root.planTasks = planTasks;
  root.delayImpact = delayImpact;
})(typeof window !== "undefined" ? window : globalThis);
