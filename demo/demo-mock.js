// Live-Demo: beantwortet alle Server-Anfragen der App im Browser aus window.DEMO_DATA.
// Nichts wird gespeichert – nach dem Neuladen ist alles wieder wie am Anfang.
(function () {
  var D = window.DEMO_DATA;
  if (!D) return;
  window.OUVERTURE_DEMO = true;
  var Q = new URLSearchParams(location.search);
  var ROLE = ["admin", "manager", "member"].indexOf(Q.get("role")) >= 0 ? Q.get("role") : "admin";
  var ME = { admin: "u-admin", manager: "u-hkm", member: "u-member" }[ROLE];
  var meRow = D.members.find(function (m) { return m.user_id === ME; });
  var MYDEPTS = ROLE === "admin" ? [] : meRow.departments;

  // Datumsangaben auf "heute" verschieben: Termine um Tage, Dienstplan um ganze Wochen (Montag bleibt Montag)
  function iso(d) { return d.toISOString().slice(0, 10); }
  function add(s, n) { var d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  var now = new Date(); var todayIso = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  var delta = Math.round((new Date(todayIso + "T00:00:00Z") - new Date(D.built + "T00:00:00Z")) / 86400000);
  var weekDelta = Math.round(delta / 7) * 7;
  function shiftDays(list, fields, n) { (list || []).forEach(function (r) { fields.forEach(function (f) { if (r[f]) r[f] = add(r[f], n); }); }); }
  shiftDays([D.hotel], ["opening_date"], delta);
  shiftDays(D.tasks, ["due_date"], delta); shiftDays(D.milestones, ["date"], delta); shiftDays(D.staff, ["start_date"], delta);
  shiftDays(D.logbook, ["entry_date"], delta); shiftDays(D.duties, ["duty_date"], delta); shiftDays(D.availabilities, ["avail_date"], delta);
  shiftDays(D.shifts, ["shift_date"], weekDelta); shiftDays(D.publications, ["week_start"], weekDelta);
  var runs = {}; Object.keys(D.checklist_runs || {}).forEach(function (k) { runs[k + "|" + todayIso] = D.checklist_runs[k]; });

  // Zeitbuchungen aus den Schichten der letzten Wochen ableiten (leicht abweichend, wie im echten Leben)
  var TIMES = [], WORKK = ["Früh", "Spät", "Nacht", "Zwischen"], monthAgo = add(todayIso.slice(0, 8) + "01", -31);
  D.shifts.forEach(function (s, i) {
    if (!s.user_id || WORKK.indexOf(s.kind) < 0 || !s.start_time || s.shift_date < monthAgo || s.shift_date > todayIso) return;
    var p0 = s.start_time.split(":"), p1 = s.end_time.split(":");
    var a = new Date(s.shift_date + "T00:00:00"); a.setHours(Number(p0[0]), Number(p0[1]) + ((i * 7) % 11) - 6, 0, 0);
    var e = new Date(s.shift_date + "T00:00:00"); e.setHours(Number(p1[0]), Number(p1[1]) + ((i * 5) % 13), 0, 0); if (e <= a) e.setDate(e.getDate() + 1);
    if (a > now) return;
    var open = e > now;
    TIMES.push({ id: "te-" + i, hotel_id: D.hotel.id, department: s.department, user_id: s.user_id, clock_in: a.toISOString(), clock_out: open ? null : e.toISOString(),
      break_minutes: open ? 0 : ((e - a) / 3600000 > 6 ? 30 : 0), note: null, edited_by: !open && i % 9 === 0 ? "u-hkm" : null, edited_at: !open && i % 9 === 0 ? e.toISOString() : null });
  });
  (D.tickets || []).forEach(function (t) {
    t.created_at = new Date(now.getTime() - t.hoursAgo * 3600000).toISOString();
    if (t.status === "Erledigt") t.done_at = new Date(now.getTime() - (t.hoursAgo - 4) * 3600000).toISOString();
  });
  D.rooms = D.rooms || []; D.tickets = D.tickets || [];

  var nextId = 1;
  function nid(p) { return "demo-" + p + "-" + (nextId++); }
  function canSee(dept) { return ROLE === "admin" || MYDEPTS.indexOf(dept) >= 0; }
  function published(dept, date) {
    var d = new Date(date + "T00:00:00Z"); var mon = add(date, -((d.getUTCDay() + 6) % 7));
    return D.publications.some(function (p) { return p.department === dept && p.week_start === mon; });
  }
  function visibleTasks() { return D.tasks.filter(function (t) { return canSee(t.department) || t.assignee_id === ME; }); }
  function visibleShifts() { return D.shifts.filter(function (s) { return (canSee(s.department) || s.user_id === ME) && (ROLE !== "member" || published(s.department, s.shift_date)); }); }
  var lead = ROLE !== "member";

  function body(opt) { try { return opt && opt.body ? JSON.parse(opt.body) : {}; } catch (e) { return {}; } }
  function ok(x, st) { return Promise.resolve(new Response(JSON.stringify(x === undefined ? {} : x), { status: st || 200, headers: { "Content-Type": "application/json" } })); }
  function crud(list, path, m, b, prefix, rest) {
    // rest: "/api/<res>/<id>"
    if (m === "POST") { var row = Object.assign({ id: nid(prefix), hotel_id: D.hotel.id, created_at: new Date().toISOString() }, b); list.push(row); return ok(row); }
    return ok(list);
  }
  function byId(list, id) { return list.find(function (x) { return x.id === id; }); }
  function remove(list, id) { var i = list.findIndex(function (x) { return x.id === id; }); if (i >= 0) list.splice(i, 1); }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, opt) {
    var url = new URL(typeof input === "string" ? input : input.url, location.href);
    var backend = /onrender\.com$|^localhost$/.test(url.hostname) && url.pathname.indexOf("/api/") === 0 && url.origin !== location.origin;
    var supa = /supabase\.co$/.test(url.hostname);
    if (!backend && !supa) return realFetch(input, opt);
    if (supa) return ok({});
    var p = url.pathname, m = (opt && opt.method) || "GET", b = body(opt), q = url.searchParams, mm;
    var H = "/api/hotels/" + D.hotel.id;

    if (p === "/api/me") return ok({ id: ME, email: meRow.email, language: null, currency: null });
    if (p === "/api/me/settings") return ok({});
    if (p === "/api/fx") return ok({ rates: { EUR: 1, CHF: 0.94, GBP: 0.86, USD: 1.09, JPY: 163, CNY: 7.85, AED: 4, SAR: 4.09, TRY: 37, BRL: 6 }, date: todayIso });
    if (p === "/api/bootstrap-organization") return ok({ organization_id: "demo-org" });
    if (p === "/api/organizations") return ok([{ id: "demo-org", name: "Alpenblick Hotels", role: ROLE, departments: MYDEPTS, language: D.lang }]);
    if (p === "/api/hotels") return ok([D.hotel]);
    if (p === "/api/hotels/" + D.hotel.id && m === "PATCH") { Object.assign(D.hotel, b); return ok(D.hotel); }
    if (p === "/api/organizations/demo-org/members") return ok(D.members.map(function (x) { return Object.assign({ joined_at: D.hotel.created_at }, x); }));
    if (p === "/api/organizations/demo-org/my-role") return ok({ is_admin: ROLE === "admin" });
    if (p === "/api/organizations/demo-org/invites") return ok([]);
    if (p === "/api/invites") return ok({ id: nid("i"), email: b.email, role: b.role, status: "ausstehend", token: "demo", email_sent: false });
    if (p === "/api/organizations/demo-org/billing") return ok({ plan: "trial", plan_name: "Testphase", status: "trialing", active: true, trial_days_left: 14, trial_ends_at: add(todayIso, 14),
      hotel_limit: 1, hotel_count: 1, can_add_hotel: false, has_customer: false, stripe_enabled: false, ai_enabled: true, currencies: ["EUR"],
      plans: [{ key: "starter", name: "Starter", hotels: 1, monthlyEur: 299, monthly: { EUR: 299 }, available: false, features: ["1 Hotel-Eröffnung", "Unbegrenzt viele Teammitglieder"] },
              { key: "professional", name: "Professional", hotels: 5, monthlyEur: 790, monthly: { EUR: 790 }, available: false, features: ["Bis zu 5 Hotel-Eröffnungen gleichzeitig", "Alles aus Starter"] }] });
    if (p === "/api/organizations/demo-org/my-tasks") return ok(D.tasks.filter(function (t) { return t.assignee_id === ME; }).map(function (t) { return Object.assign({ hotel_name: D.hotel.name }, t); }));
    if (p === "/api/organizations/demo-org/my-shifts") return ok(visibleShifts().filter(function (s) { return s.user_id === ME && s.shift_date >= todayIso; })
      .sort(function (a, c) { return a.shift_date < c.shift_date ? -1 : 1; }).map(function (s) { return Object.assign({ hotel_name: D.hotel.name }, s); }));

    // Aufgaben und Projektdaten
    if (p === H + "/tasks") { if (m === "POST") { var t = Object.assign({ id: nid("t"), hotel_id: D.hotel.id, status: "Nicht begonnen", comment_count: 0, document_count: 0 }, b); D.tasks.push(t); return ok(t); } return ok(visibleTasks()); }
    if ((mm = p.match(/^\/api\/tasks\/([^/]+)$/))) { if (m === "DELETE") { remove(D.tasks, mm[1]); return ok({ ok: true }); } var tk = byId(D.tasks, mm[1]); Object.assign(tk, b); return ok(tk); }
    if (/^\/api\/tasks\/[^/]+\/activity$/.test(p)) return ok([]);
    if (/^\/api\/tasks\/[^/]+\/comments$/.test(p)) return ok({ id: nid("k"), body: b.body, author_id: ME, created_at: new Date().toISOString() });
    var PROJ = { milestones: D.milestones, risks: D.risks, budget: D.budget, staff: D.staff };
    for (var k in PROJ) {
      if (p === H + "/" + k) { if (m === "POST") return crud(PROJ[k], p, m, b, k); if (!lead && k !== "milestones") return ok([]); return ok(PROJ[k].filter(function (x) { return !x.department || canSee(x.department); })); }
      if ((mm = p.match(new RegExp("^/api/" + k + "/([^/]+)$")))) { if (m === "DELETE") { remove(PROJ[k], mm[1]); return ok({ ok: true }); } var it = byId(PROJ[k], mm[1]); Object.assign(it, b); return ok(it); }
    }
    if (p === H + "/readiness") return ok(D.readiness);
    if (p === H + "/ai-report") return ok(lead ? { enabled: true, report: D.ai } : { enabled: true, report: null });
    if (p === H + "/documents") return ok([]);
    if (p === H + "/template-preview") return ok({ tasks: 0, milestones: 0, alreadyApplied: D.tasks.length, past: 0 });
    if (p === H + "/apply-template") return ok({ tasksCreated: 0, milestonesCreated: 0, skippedExisting: D.tasks.length, skippedPast: 0 });

    // Dienstplan
    if (p === H + "/shifts") {
      if (m === "POST") { var s = Object.assign({ id: nid("s"), hotel_id: D.hotel.id }, b); D.shifts.push(s); return ok(s); }
      var from = q.get("from"), to = q.get("to"), dep = q.get("department");
      return ok(visibleShifts().filter(function (s) { return s.shift_date >= from && s.shift_date <= to && (!dep || s.department === dep); }));
    }
    if ((mm = p.match(/^\/api\/shifts\/([^/]+)$/))) { if (m === "DELETE") { remove(D.shifts, mm[1]); return ok({ ok: true }); } var sh = byId(D.shifts, mm[1]); Object.assign(sh, b); return ok(sh); }
    if (p === H + "/shifts/copy-week") return ok({ created: 0 });
    if (p === H + "/shift-minimums") {
      if (m === "PUT") { var mn = D.shift_minimums.find(function (x) { return x.department === b.department && x.kind === b.kind; });
        if (!mn) { mn = { department: b.department, kind: b.kind, min_count: 0 }; D.shift_minimums.push(mn); } Object.assign(mn, b); return ok(mn); }
      return ok(D.shift_minimums);
    }
    if (p === H + "/shift-requests") return ok(m === "POST" ? Object.assign({ id: nid("q"), status: "Offen", user_id: ME }, b) : []);
    if (/^\/api\/shift-requests\//.test(p)) return ok({ ok: true });
    if (p === H + "/duties") {
      if (m === "POST") { var du = Object.assign({ id: nid("d") }, b); D.duties.push(du); return ok(du); }
      return ok(D.duties.filter(function (x) { return x.duty_date >= q.get("from") && x.duty_date <= q.get("to") && canSee(x.department); }));
    }
    if ((mm = p.match(/^\/api\/duties\/([^/]+)$/))) { if (m === "DELETE") { remove(D.duties, mm[1]); return ok({ ok: true }); } var dd = byId(D.duties, mm[1]); Object.assign(dd, b); return ok(dd); }
    if (p === H + "/publications") return ok(D.publications);
    if (p === H + "/publish") {
      if (m === "DELETE") { D.publications = D.publications.filter(function (x) { return !(x.department === q.get("department") && x.week_start === q.get("week")); }); return ok({ ok: true }); }
      D.publications.push({ department: b.department, week_start: b.week }); return ok({ sent: 0, recipients: 0 });
    }
    if (p === H + "/staff-hours") {
      if (m === "PUT") { D.staff_hours = D.staff_hours.filter(function (x) { return !(x.department === b.department && (x.user_id || x.employee_name) === (b.user_id || b.employee_name)); });
        if (b.weekly_hours !== null) D.staff_hours.push(Object.assign({ id: nid("h") }, b)); return ok({ ok: true }); }
      return ok(lead ? D.staff_hours : D.staff_hours.filter(function (x) { return x.user_id === ME; }));
    }
    if (p === H + "/availabilities") {
      if (m === "PUT") { D.availabilities = D.availabilities.filter(function (x) { return !(x.user_id === ME && x.avail_date === b.date); });
        if (b.status) D.availabilities.push({ user_id: ME, avail_date: b.date, status: b.status }); return ok({ ok: true }); }
      return ok(D.availabilities.filter(function (x) { return lead || x.user_id === ME; }));
    }
    // Übergabebuch und Checklisten
    if (p === H + "/logbook") {
      if (m === "POST") { var le = { id: nid("l"), department: b.department, kind: b.kind, body: b.body, author_id: ME, entry_date: todayIso, created_at: new Date().toISOString(), done: false }; D.logbook.unshift(le); return ok(le); }
      return ok(D.logbook.filter(function (x) { return canSee(x.department) && (!q.get("department") || x.department === q.get("department")) && (q.get("open") !== "true" || (x.kind === "Offen" && !x.done)); }));
    }
    if ((mm = p.match(/^\/api\/logbook\/([^/]+)$/))) { if (m === "DELETE") { remove(D.logbook, mm[1]); return ok({ ok: true }); } var lg = byId(D.logbook, mm[1]); Object.assign(lg, b, b.done ? { done_by: ME } : {}); return ok(lg); }
    if (p === "/api/checklist-templates") return ok(D.checklist_templates.filter(function (t) { return !q.get("department") || t.department === q.get("department"); }));
    if (p === H + "/checklists") {
      if (m === "POST") { var tpl = b.template_key && D.checklist_templates.find(function (t) { return t.template_key === b.template_key; });
        var cl = Object.assign({ id: nid("c"), hotel_id: D.hotel.id }, tpl || {}, { department: b.department || (tpl && tpl.department) }, tpl ? {} : { title: b.title, items: b.items || [] }); D.checklists.push(cl); return ok(cl); }
      var date = q.get("date") || todayIso;
      return ok(D.checklists.filter(function (c) { return canSee(c.department); }).map(function (c) { var r = runs[c.id + "|" + date]; return Object.assign({}, c, { run: r ? { checked: r } : null }); }));
    }
    if ((mm = p.match(/^\/api\/checklists\/([^/]+)\/run$/))) { var key = mm[1] + "|" + b.date; runs[key] = runs[key] || {};
      if (b.checked) runs[key][b.item] = { by: meRow.email, at: new Date().toISOString() }; else delete runs[key][b.item]; return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/checklists\/([^/]+)$/))) { if (m === "DELETE") { remove(D.checklists, mm[1]); return ok({ ok: true }); } var c2 = byId(D.checklists, mm[1]); Object.assign(c2, b); return ok(c2); }
    // Push gibt es in der Demo nicht
    if (p === "/api/push/key") return ok({ error: "Push-Benachrichtigungen sind noch nicht eingerichtet." }, 404);
    // Zeiterfassung
    if (p === "/api/time/me") {
      var mineT = TIMES.filter(function (e) { return e.user_id === ME; }).sort(function (a, c) { return a.clock_in < c.clock_in ? 1 : -1; })
        .map(function (e) { return Object.assign({ hotel_name: D.hotel.name }, e); });
      return ok({ open: mineT.find(function (e) { return !e.clock_out; }) || null, entries: mineT });
    }
    if (p === H + "/time/clock-in") {
      if (TIMES.some(function (e) { return e.user_id === ME && !e.clock_out; })) return ok({ error: "Du bist bereits eingestempelt." }, 400);
      var ci = { id: nid("te"), hotel_id: D.hotel.id, department: b.department, user_id: ME, clock_in: new Date().toISOString(), clock_out: null, break_minutes: 0, note: null, edited_by: null };
      TIMES.push(ci); return ok(ci);
    }
    if (p === "/api/time/clock-out") {
      var op = TIMES.find(function (e) { return e.user_id === ME && !e.clock_out; });
      if (!op) return ok({ error: "Du bist gerade nicht eingestempelt." }, 400);
      op.clock_out = new Date().toISOString(); op.break_minutes = Math.min(Number(b.break_minutes) || 0, Math.floor((new Date(op.clock_out) - new Date(op.clock_in)) / 60000)); return ok(op);
    }
    if (p === H + "/time-entries") {
      if (m === "POST") { var te = Object.assign({ id: nid("te"), hotel_id: D.hotel.id, edited_by: ME, edited_at: new Date().toISOString() }, b); TIMES.push(te); return ok(te); }
      var f0 = add(q.get("from"), -1) + "T00:00:00Z", f1 = add(q.get("to"), 2) + "T00:00:00Z", dq = q.get("department");
      return ok(TIMES.filter(function (e) { return e.clock_in >= f0 && e.clock_in < f1 && (!dq || e.department === dq) && (lead ? canSee(e.department) : e.user_id === ME); })
        .sort(function (a, c) { return a.clock_in < c.clock_in ? -1 : 1; }));
    }
    if ((mm = p.match(/^\/api\/time-entries\/([^/]+)$/))) {
      if (m === "DELETE") { remove(TIMES, mm[1]); return ok({ ok: true }); }
      var tt = byId(TIMES, mm[1]); Object.assign(tt, b, { edited_by: ME, edited_at: new Date().toISOString() }); return ok(tt);
    }
    // Zimmer
    if (p === H + "/rooms") {
      if (m === "POST") {
        var made = 0, skipped = 0;
        String(b.numbers || "").split(/[,;\n]+/).forEach(function (part) {
          part = part.trim(); if (!part) return; var r = part.match(/^(\d+)\s*[-–]\s*(\d+)$/), list = [];
          if (r) { for (var n = Number(r[1]); n <= Number(r[2]) && list.length < 500; n++) list.push(String(n)); } else list.push(part);
          list.forEach(function (num) { if (D.rooms.some(function (x) { return x.number === num; })) { skipped++; return; }
            D.rooms.push({ id: nid("room"), hotel_id: D.hotel.id, number: num, floor: num.length >= 3 && /^\d+$/.test(num) ? String(Number(num.slice(0, -2))) : null, room_type: b.room_type || null, status: "Schmutzig", occupancy: "Unbelegt", note: null, assigned_to: null }); made++; });
        });
        return ok({ created: made, skipped: skipped });
      }
      return ok(D.rooms.slice().sort(function (a, c) { return a.number.localeCompare(c.number, "de", { numeric: true }); }));
    }
    if (p === H + "/rooms/bulk") {
      var cnt = 0; D.rooms.forEach(function (r) { if ((b.ids || []).indexOf(r.id) >= 0) { if (b.status) r.status = b.status; if (b.occupancy) r.occupancy = b.occupancy; r.updated_by = ME; r.updated_at = new Date().toISOString(); cnt++; } });
      return ok({ updated: cnt });
    }
    if ((mm = p.match(/^\/api\/rooms\/([^/]+)$/))) {
      if (m === "DELETE") { remove(D.rooms, mm[1]); return ok({ ok: true }); }
      var rm = byId(D.rooms, mm[1]); Object.assign(rm, b, { updated_by: ME, updated_at: new Date().toISOString() }); return ok(rm);
    }
    // Technik-Meldungen
    if (p === H + "/tickets") {
      if (m === "POST") {
        var tkn = { id: nid("tk"), hotel_id: D.hotel.id, department: b.department || "Technik", location: b.location || null, title: b.title, description: b.description || null,
          priority: b.priority || "Normal", status: "Offen", has_photo: !!b.photo_data, photo_data: b.photo_data || null, reporter_id: ME, assignee_id: null, created_at: new Date().toISOString() };
        D.tickets.unshift(tkn); return ok(tkn);
      }
      var sq = q.get("status");
      return ok(D.tickets.filter(function (t) { return (canSee(t.department) || t.reporter_id === ME || t.assignee_id === ME) &&
        (sq === "open" ? t.status !== "Erledigt" : sq === "done" ? t.status === "Erledigt" : true); }));
    }
    if ((mm = p.match(/^\/api\/tickets\/([^/]+)\/photo$/))) return ok({ photo_data: (byId(D.tickets, mm[1]) || {}).photo_data || null });
    if ((mm = p.match(/^\/api\/tickets\/([^/]+)$/))) {
      if (m === "DELETE") { remove(D.tickets, mm[1]); return ok({ ok: true }); }
      var tk = byId(D.tickets, mm[1]); Object.assign(tk, b);
      if (b.status) { tk.done_by = b.status === "Erledigt" ? ME : null; tk.done_at = b.status === "Erledigt" ? new Date().toISOString() : null; }
      return ok(tk);
    }
    return ok({});
  };
})();
