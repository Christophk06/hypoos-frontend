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
  D.open_shifts = []; D.reads = []; D.ob_done = []; D.contractors = [{ id: "ct-1", hotel_id: D.hotel.id, name: "Elektro Huber", trade: "Elektro", url: "handwerk.html?demo=1" }, { id: "ct-2", hotel_id: D.hotel.id, name: "Sanitär Wagner", trade: "Sanitär", url: "handwerk.html?demo=1" }];
  D.onboarding_items = D.onboarding_items || []; D.onboardings = [{ organization_id: "demo-org", user_id: "u-member", buddy_id: "u-ewa", start_date: add(todayIso, -3), completed_at: null }];
  D.ob_done = [{ user_id: "u-member", item_id: "ob-1", done_by: "u-member" }, { user_id: "u-member", item_id: "ob-2", done_by: "u-ewa" }];
  D.procurement = (D.procurement || []).map(function (x) { return Object.assign({}, x, { order_by: add(todayIso, x.orderIn), delivery_date: add(todayIso, x.deliveryIn) }); });
  D.feedback = (D.feedback || []).map(function (x) { return Object.assign({}, x, { created_at: new Date(now.getTime() - x.daysAgo * 86400000).toISOString() }); });
  (D.snags || []).forEach(function (t) { D.tickets.push(Object.assign({}, t, { created_at: new Date(now.getTime() - t.hoursAgo * 3600000).toISOString() })); });
  D.candidates = [{ id: "cd-1", position_id: (D.staff[0] || {}).id, hotel_id: D.hotel.id, name: "Maria Kovač", email: "maria.k@example.com", stage: "Gespräch" }, { id: "cd-2", position_id: (D.staff[0] || {}).id, hotel_id: D.hotel.id, name: "Tomás Ruiz", stage: "Angebot" }];
  D.staff.forEach(function (s, i) { s.monthly_cost = [3400, 2900, 3100, 4200, 3800][i % 5]; });
  D.permits = [{ id: "pm-1", hotel_id: D.hotel.id, title: "Betriebsanlagengenehmigung", authority: "Bezirkshauptmannschaft", status: "beantragt", due_date: add(todayIso, 9) },
    { id: "pm-2", hotel_id: D.hotel.id, title: "Brandschutzabnahme", authority: "Feuerwehr", status: "offen", due_date: add(todayIso, 21) },
    { id: "pm-3", hotel_id: D.hotel.id, title: "Aufzugsabnahme", authority: "TÜV", status: "erteilt", valid_until: add(todayIso, 360) },
    { id: "pm-4", hotel_id: D.hotel.id, title: "Lebensmittelrechtliche Registrierung", authority: "Lebensmittelaufsicht", status: "offen", due_date: add(todayIso, -2) }];
  // Abhängigkeiten für den kritischen Pfad (über die festen Vorlagen-Schlüssel, in jeder Sprache gleich)
  (function () { var k = function (key) { return D.tasks.find(function (t) { return t.template_key === key; }); };
    var pms = k("t-pms-config"), mock = k("t-mock-checkins"), snag = k("t-room-snagging"), uni = k("t-uniforms"), evac = k("t-evacuation");
    if (pms) pms.duration_days = 14;
    if (mock && pms) { mock.depends_on = [pms.id]; mock.duration_days = 60; }
    if (snag && uni) { snag.depends_on = [uni.id]; snag.duration_days = 14; }
    if (evac && snag) { evac.depends_on = [snag.id]; evac.duration_days = 2; } })();
  // eine offene Schicht für die Demo
  D.open_shifts.push({ id: "os-demo", hotel_id: D.hotel.id, department: "Housekeeping", shift_date: add(todayIso, 2), kind: "Früh", start_time: "06:00:00", end_time: "14:30:00", reason: "krank", status: "offen", created_by: "u-ewa" });
  D.plans = (D.plans || []).map(function (x) { return Object.assign({}, x, { next_due: add(todayIso, x.dueIn) }); });
  D.temp_points = D.temp_points || []; D.trainings = D.trainings || []; D.stock = D.stock || []; D.forecast = []; D.moves = [];
  D.rules = [{ department: "Housekeeping", basis: "abreisen+bleiber", units_per_person: 28, minimum: 2 }];
  D.lost_found = (D.lost_found || []).map(function (x) { return Object.assign({}, x, { found_on: add(todayIso, -x.daysAgo), created_at: new Date(now.getTime() - x.daysAgo * 86400000).toISOString() }); });
  D.readings = [];
  D.temp_points.forEach(function (pt, i) {
    [[-26, "u-fb"], [-2, "u-fb"]].forEach(function (h, j) { var v = pt.min_c + (pt.max_c - pt.min_c) * [0.4, 0.6][j] + i * 0.1;
      D.readings.push({ id: "rd-" + i + "-" + j, point_id: pt.id, value_c: Math.round(v * 10) / 10, out_of_range: false, action: null, taken_by: h[1], taken_at: new Date(now.getTime() + h[0] * 3600000).toISOString() }); });
  });
  D.acks = [{ training_id: "tr-1", user_id: "u-hkm", acked_at: new Date(now.getTime() - 40 * 86400000).toISOString() }, { training_id: "tr-1", user_id: "u-ewa", acked_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
    { training_id: "tr-2", user_id: "u-fb", acked_at: new Date(now.getTime() - 5 * 86400000).toISOString() }];
  D.chat = (D.chat || []).map(function (c) { return Object.assign({}, c, { created_at: new Date(now.getTime() - c.minutesAgo * 60000).toISOString() }); });

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
    // Team-Chat
    if (p === H + "/chat/latest") { var lt = {}; D.chat.forEach(function (c) { if (canSee(c.channel) || c.channel === "_all") if (!lt[c.channel] || lt[c.channel].at < c.created_at) lt[c.channel] = { channel: c.channel, at: c.created_at, author_id: c.author_id }; });
      return ok(Object.keys(lt).map(function (k) { return lt[k]; })); }
    if (p === H + "/chat") {
      if (m === "POST") { var cm = { id: nid("chat"), hotel_id: D.hotel.id, channel: b.channel, body: b.body, author_id: ME, created_at: new Date().toISOString() }; D.chat.push(cm); return ok(cm); }
      var ch = q.get("channel"), af = q.get("after");
      return ok(D.chat.filter(function (c) { return c.channel === ch && (ch === "_all" || canSee(ch)) && (!af || c.created_at > af); }).sort(function (a, c) { return a.created_at < c.created_at ? -1 : 1; }));
    }
    if ((mm = p.match(/^\/api\/chat\/([^/]+)$/))) { remove(D.chat, mm[1]); return ok({ ok: true }); }
    // PMS-Anbindung: in der Demo nur zum Ansehen
    if (p === H + "/pms") { if (m === "GET") return ok(D.pms || null); if (m === "DELETE") { D.pms = null; return ok({ ok: true }); }
      D.pms = { hotel_id: D.hotel.id, provider: b.provider, settings: b.settings || {}, has_token: false, last_sync_at: null, last_result: null,
        webhook_url: b.provider === "webhook" ? "https://hpoos-backend-1.onrender.com/api/pms/webhook/demo-nur-zum-ansehen" : null }; return ok(D.pms); }
    if (p === H + "/pms/sync" || p === H + "/pms/rotate-token") return ok({ error: "In der Live-Demo nicht verfügbar." }, 400);
    if (p === H + "/rooms/import") {
      var upd = 0, unk = [];
      (b.rows || []).forEach(function (r) { var num = String(r.number || "").trim(); var rm2 = D.rooms.find(function (x) { return x.number === num; }); if (!rm2) { if (num) unk.push(num); return; } upd++; });
      return ok({ updated: upd, unchanged: 0, unknown: unk.slice(0, 50) });
    }
    // Übersetzung und Stempel-QR gibt es in der Demo nicht
    if (p === "/api/translate/status") return ok({ enabled: false });
    if (p === H + "/clock-code" || /clock-code\/rotate$|\/clock-qr$/.test(p)) return ok({ error: "In der Live-Demo nicht verfügbar." }, 400);
    // Wartungsplan
    if (p === H + "/maintenance-plans") {
      if (m === "POST") { var mp = Object.assign({ id: nid("mp"), hotel_id: D.hotel.id, active: true }, b); D.plans.push(mp); return ok(mp); }
      return ok(D.plans.filter(function (x) { return canSee(x.department); }).sort(function (a, c) { return a.next_due < c.next_due ? -1 : 1; }));
    }
    if ((mm = p.match(/^\/api\/maintenance-plans\/([^/]+)\/run$/))) {
      var pl = byId(D.plans, mm[1]);
      D.tickets.unshift({ id: nid("tk"), hotel_id: D.hotel.id, department: pl.department, kind: "Wartung", title: pl.title, location: pl.location, priority: "Normal", status: "Offen", reporter_id: ME, created_at: new Date().toISOString() });
      return ok({ created: 1 });
    }
    if ((mm = p.match(/^\/api\/maintenance-plans\/([^/]+)$/))) { if (m === "DELETE") { remove(D.plans, mm[1]); return ok({ ok: true }); } var pl2 = byId(D.plans, mm[1]); Object.assign(pl2, b); return ok(pl2); }
    // Belegung und Personalbedarf
    if (p === H + "/forecast") {
      if (m === "PUT") { (b.days || []).forEach(function (d) { D.forecast = D.forecast.filter(function (x) { return x.day !== d.day; }); D.forecast.push(Object.assign({ source: "manuell" }, d)); }); return ok({ saved: (b.days || []).length }); }
      var fr = q.get("from"), tt = q.get("to"), outF = [];
      for (var dd = fr; dd <= tt; dd = add(dd, 1)) {
        var ex = D.forecast.find(function (x) { return x.day === dd; });
        if (ex) { outF.push(ex); continue; }
        var wd = new Date(dd + "T00:00:00Z").getUTCDay(), base = [118, 92, 88, 96, 112, 131, 126][wd];
        outF.push({ day: dd, occupied: base, arrivals: Math.round(base * 0.27), departures: Math.round(base * 0.24), source: "pms" });
      }
      return ok(lead ? outF : []);
    }
    if (p === H + "/staffing-rules") {
      if (m === "PUT") { D.rules = D.rules.filter(function (r) { return r.department !== b.department; }); if (b.units_per_person) D.rules.push({ department: b.department, basis: b.basis || "belegt", units_per_person: Number(b.units_per_person), minimum: Number(b.minimum) || 0 }); return ok(D.rules.find(function (r) { return r.department === b.department; }) || {}); }
      return ok(D.rules.filter(function (r) { return canSee(r.department); }));
    }
    if (p === H + "/roster/suggest") return ok({ error: "In der Live-Demo nicht verfügbar." }, 400);
    // HACCP
    if (p === H + "/temp-points") {
      if (m === "POST") { var tp = Object.assign({ id: nid("tp"), hotel_id: D.hotel.id, readings: [] }, b, { min_c: b.min_c === "" ? null : Number(b.min_c), max_c: b.max_c === "" ? null : Number(b.max_c) }); D.temp_points.push(tp); return ok(tp); }
      return ok(D.temp_points.filter(function (x) { return canSee(x.department) || lead; }).map(function (x) { return Object.assign({}, x, { readings: D.readings.filter(function (r) { return r.point_id === x.id; }).sort(function (a, c) { return a.taken_at < c.taken_at ? 1 : -1; }).slice(0, 6) }); }));
    }
    if ((mm = p.match(/^\/api\/temp-points\/([^/]+)\/readings$/))) {
      var pt = byId(D.temp_points, mm[1]), v = Number(String(b.value).replace(",", "."));
      var out = (pt.min_c != null && v < pt.min_c) || (pt.max_c != null && v > pt.max_c);
      if (out && !String(b.action || "").trim()) return ok({ error: "Der Wert liegt außerhalb des Bereichs. Bitte die ergriffene Maßnahme eintragen." }, 400);
      var rd = { id: nid("rd"), point_id: pt.id, value_c: v, out_of_range: out, action: b.action || null, taken_by: ME, taken_at: new Date().toISOString() }; D.readings.push(rd); return ok(rd);
    }
    if ((mm = p.match(/^\/api\/temp-points\/([^/]+)$/))) { remove(D.temp_points, mm[1]); return ok({ ok: true }); }
    if (p === H + "/temp-readings") return ok(D.readings.map(function (r) { var pt2 = byId(D.temp_points, r.point_id) || {}; return Object.assign({ point_name: pt2.name, min_c: pt2.min_c, max_c: pt2.max_c }, r); }));
    // Unterweisungen
    if (p === "/api/organizations/demo-org/trainings") {
      if (m === "POST") { var tr = Object.assign({ id: nid("tr"), organization_id: "demo-org", acks: [] }, b); D.trainings.unshift(tr); return ok(tr); }
      return ok(D.trainings.map(function (t) { return Object.assign({}, t, { acks: D.acks.filter(function (a) { return a.training_id === t.id && (lead || a.user_id === ME); }) }); }));
    }
    if ((mm = p.match(/^\/api\/trainings\/([^/]+)\/ack$/))) { var ak = { training_id: mm[1], user_id: ME, acked_at: new Date().toISOString() }; D.acks.push(ak); return ok(ak); }
    if ((mm = p.match(/^\/api\/trainings\/([^/]+)$/))) { if (m === "DELETE") { remove(D.trainings, mm[1]); return ok({ ok: true }); } var tr2 = byId(D.trainings, mm[1]); Object.assign(tr2, b); return ok(tr2); }
    // Fundsachen
    if (p === H + "/lost-found") {
      if (m === "POST") { var lf = Object.assign({ id: nid("lf"), hotel_id: D.hotel.id, status: "Aufbewahrt", found_by: ME, has_photo: !!b.photo_data, created_at: new Date().toISOString() }, b); D.lost_found.unshift(lf); return ok(lf); }
      return ok(D.lost_found.filter(function (x) { return q.get("status") !== "open" || x.status === "Aufbewahrt"; }));
    }
    if ((mm = p.match(/^\/api\/lost-found\/([^/]+)\/photo$/))) return ok({ photo_data: (byId(D.lost_found, mm[1]) || {}).photo_data || null });
    if ((mm = p.match(/^\/api\/lost-found\/([^/]+)$/))) { if (m === "DELETE") { remove(D.lost_found, mm[1]); return ok({ ok: true }); } var lf2 = byId(D.lost_found, mm[1]); Object.assign(lf2, b); return ok(lf2); }
    // Lager
    if (p === H + "/stock") {
      if (m === "POST") { var si = Object.assign({ id: nid("st"), hotel_id: D.hotel.id, reorder_ticket: null }, b, { quantity: Number(b.quantity) || 0, min_quantity: Number(b.min_quantity) || 0 }); D.stock.push(si); return ok(si); }
      return ok(D.stock.filter(function (x) { return canSee(x.department) || canSee("Einkauf"); }));
    }
    if ((mm = p.match(/^\/api\/stock\/([^/]+)\/move$/))) {
      var it = byId(D.stock, mm[1]); it.quantity = Math.round((Number(it.quantity) + Number(b.delta)) * 100) / 100;
      D.moves.unshift({ id: nid("mv"), item_id: it.id, delta: Number(b.delta), by_user: ME, created_at: new Date().toISOString() });
      var created = null; if (it.quantity < it.min_quantity && !it.reorder_ticket) { created = nid("tk"); it.reorder_ticket = created; }
      if (it.quantity >= it.min_quantity) it.reorder_ticket = null;
      return ok(Object.assign({}, it, { reorder_created: created }));
    }
    if ((mm = p.match(/^\/api\/stock\/([^/]+)\/moves$/))) return ok(D.moves.filter(function (x) { return x.item_id === mm[1]; }));
    if ((mm = p.match(/^\/api\/stock\/([^/]+)$/))) { if (m === "DELETE") { remove(D.stock, mm[1]); return ok({ ok: true }); } var it2 = byId(D.stock, mm[1]); Object.assign(it2, b, b.min_quantity !== undefined ? { min_quantity: Number(b.min_quantity) } : {}); return ok(it2); }
    // Kennzahlen (aus den Demo-Daten)
    if (p === H + "/kpis") {
      var k0 = q.get("from") + "T00:00:00", k1 = add(q.get("to"), 1) + "T00:00:00";
      var inR = function (x) { return x >= new Date(k0).toISOString() && x < new Date(k1).toISOString(); };
      var es = TIMES.filter(function (e) { return inR(e.clock_in) && e.clock_out; });
      var hrs = es.reduce(function (s, e) { return s + Math.max(0, (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000 - e.break_minutes / 60); }, 0);
      var sh = D.shifts.filter(function (s) { return s.shift_date >= q.get("from") && s.shift_date <= q.get("to") && ["Früh", "Spät", "Nacht", "Zwischen"].indexOf(s.kind) >= 0; });
      var plannedH = sh.reduce(function (s, x) { var a = x.start_time.split(":"), c = x.end_time.split(":"); var d = (c[0] * 60 + +c[1]) - (a[0] * 60 + +a[1]); if (d <= 0) d += 1440; return s + d / 60; }, 0);
      var depts = {}; es.forEach(function (e) { (depts[e.department] = depts[e.department] || { department: e.department, worked: 0, planned: 0 }).worked += Math.max(0, (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000 - e.break_minutes / 60); });
      sh.forEach(function (x) { var a = x.start_time.split(":"), c = x.end_time.split(":"); var d = (c[0] * 60 + +c[1]) - (a[0] * 60 + +a[1]); if (d <= 0) d += 1440; (depts[x.department] = depts[x.department] || { department: x.department, worked: 0, planned: 0 }).planned += d / 60; });
      var nights = 0; for (var kd = q.get("from"); kd <= q.get("to"); kd = add(kd, 1)) nights += [118, 92, 88, 96, 112, 131, 126][new Date(kd + "T00:00:00Z").getUTCDay()];
      var r1 = function (x) { return Math.round(x * 10) / 10; };
      return ok({ worked_hours: r1(hrs), planned_hours: r1(plannedH), room_nights: nights, hours_per_room_night: Math.round(hrs / nights * 100) / 100,
        corrected_entries: es.filter(function (e) { return e.edited_by; }).length, offline_entries: 0,
        departments: Object.keys(depts).map(function (k2) { return { department: k2, worked: r1(depts[k2].worked), planned: r1(depts[k2].planned) }; }).sort(function (a, c) { return c.worked - a.worked; }),
        tickets_opened: D.tickets.length, tickets_done: D.tickets.filter(function (t) { return t.status === "Erledigt"; }).length, tickets_open: D.tickets.filter(function (t) { return t.status !== "Erledigt"; }).length,
        tickets_urgent_open: D.tickets.filter(function (t) { return t.status !== "Erledigt" && t.priority === "Dringend"; }).length, median_hours_to_fix: 4.5,
        guest_requests: D.tickets.filter(function (t) { return t.kind === "Gästewunsch"; }).length, rooms_cleaned: Math.round(nights * 0.3), avg_cleaning_minutes: 27,
        temp_readings: D.readings.length, temp_out_of_range: D.readings.filter(function (r) { return r.out_of_range; }).length });
    }
    // Gruppenansicht
    if (p === "/api/organizations/demo-org/overview") {
      var fcT = [118, 92, 88, 96, 112, 131, 126][new Date(todayIso + "T00:00:00Z").getUTCDay()];
      return ok([Object.assign({}, D.hotel, { tickets_open: D.tickets.filter(function (t) { return t.status !== "Erledigt"; }).length, tickets_urgent: 1,
        on_duty: TIMES.filter(function (e) { return !e.clock_out; }).length, rooms_total: D.rooms.length,
        rooms_ready: D.rooms.filter(function (r) { return r.status === "Sauber" || r.status === "Kontrolliert"; }).length,
        rooms_dirty: D.rooms.filter(function (r) { return r.status === "Schmutzig"; }).length, arrivals: Math.round(fcT * 0.27), departures: Math.round(fcT * 0.24) })]);
    }
    // Krankmeldung und offene Schichten
    if (p === H + "/sick") {
      var n2 = 0; D.shifts.forEach(function (s) { if (s.user_id === ME && s.shift_date >= b.from && s.shift_date <= b.to && ["Früh", "Spät", "Nacht", "Zwischen"].indexOf(s.kind) >= 0) {
        D.open_shifts.push({ id: nid("os"), hotel_id: D.hotel.id, department: s.department, shift_date: s.shift_date, kind: s.kind, start_time: s.start_time, end_time: s.end_time, reason: "krank", status: "offen", created_by: ME, note: b.note || null });
        s.kind = "Krank"; s.start_time = null; s.end_time = null; n2++; } });
      return ok({ shifts: n2 });
    }
    if (p === H + "/open-shifts") {
      if (m === "POST") { var tm = (D.shift_minimums.find(function (x) { return x.department === b.department && x.kind === b.kind; }) || {});
        var defs = { "Früh": ["06:00", "14:30"], "Spät": ["14:00", "22:30"], "Nacht": ["22:00", "06:30"], "Zwischen": ["10:00", "18:30"] };
        var os1 = { id: nid("os"), hotel_id: D.hotel.id, department: b.department, shift_date: b.shift_date, kind: b.kind, start_time: (tm.start_time || defs[b.kind][0]) + "", end_time: (tm.end_time || defs[b.kind][1]) + "", reason: "zusatz", status: "offen", created_by: ME, note: b.note || null };
        D.open_shifts.push(os1); return ok(os1); }
      return ok(D.open_shifts.filter(function (o) { return o.shift_date >= (q.get("from") || todayIso) && o.status !== "abgesagt" && canSee(o.department); }).sort(function (a, c) { return a.shift_date < c.shift_date ? -1 : 1; }));
    }
    if ((mm = p.match(/^\/api\/open-shifts\/([^/]+)\/claim$/))) {
      var o2 = byId(D.open_shifts, mm[1]);
      if (D.shifts.some(function (s) { return s.user_id === ME && s.shift_date === o2.shift_date && s.kind !== "Frei"; })) return ok({ error: "Du hast an diesem Tag schon eine Schicht." }, 400);
      D.shifts = D.shifts.filter(function (s) { return !(s.user_id === ME && s.shift_date === o2.shift_date && s.kind === "Frei"); });
      var ns = { id: nid("s"), hotel_id: D.hotel.id, department: o2.department, shift_date: o2.shift_date, kind: o2.kind, start_time: o2.start_time, end_time: o2.end_time, user_id: ME };
      D.shifts.push(ns); o2.status = "vergeben"; o2.taken_by = ME; return ok({ shift_id: ns.id });
    }
    if ((mm = p.match(/^\/api\/open-shifts\/([^/]+)$/))) { var o3 = byId(D.open_shifts, mm[1]); if (o3) o3.status = "abgesagt"; return ok({ ok: true }); }
    // Schichtbriefing
    if (p === H + "/briefing") {
      var dep = q.get("department"), today2 = todayIso;
      var staff = D.shifts.filter(function (s) { return s.department === dep && s.shift_date === today2 && ["Früh", "Spät", "Nacht", "Zwischen"].indexOf(s.kind) >= 0; }).map(function (s) { var mb = D.members.find(function (x) { return x.user_id === s.user_id; }); return { name: mb ? mb.email.split("@")[0] : s.employee_name, kind: s.kind }; });
      var wd2 = new Date(today2 + "T00:00:00Z").getUTCDay(), bse = [118, 92, 88, 96, 112, 131, 126][wd2];
      var tks = D.tickets.filter(function (t) { return t.department === dep && t.status !== "Erledigt"; });
      return ok({ department: dep, day: today2, staff: staff, forecast: { occupied: bse, arrivals: Math.round(bse * 0.27), departures: Math.round(bse * 0.24) },
        rooms: dep === "Housekeeping" || dep === "Rezeption & Empfang" ? { dirty: D.rooms.filter(function (r) { return r.status === "Schmutzig"; }).length, ready: D.rooms.filter(function (r) { return r.status === "Sauber" || r.status === "Kontrolliert"; }).length,
          departures: 0, arrivals: 0, out_of_order: D.rooms.filter(function (r) { return r.status === "Außer Betrieb"; }).map(function (r) { return r.number; }) } : null,
        logbook: D.logbook.filter(function (e) { return e.department === dep && (e.kind === "Wichtig" || (e.kind === "Offen" && !e.done)); }).map(function (e) { return { kind: e.kind, body: e.body }; }),
        tickets: tks.slice(0, 5).map(function (t) { return { title: t.title, location: t.location, priority: t.priority, kind: t.kind, status: t.status }; }), tickets_open: tks.length, guest_requests_open: 0,
        haccp_missing: D.temp_points.filter(function (pt) { return pt.department === dep && !D.readings.some(function (r) { return r.point_id === pt.id && r.taken_at.slice(0, 10) === today2; }); }).map(function (pt) { return pt.name; }),
        open_shifts: D.open_shifts.filter(function (o) { return o.department === dep && o.status === "offen"; }), read_by_me: D.reads.indexOf(dep + "|" + ME) >= 0,
        reads: D.reads.filter(function (r) { return r.indexOf(dep + "|") === 0; }).map(function (r) { var mb = D.members.find(function (x) { return x.user_id === r.split("|")[1]; }); return { name: mb ? mb.email.split("@")[0] : "" }; }) });
    }
    if (p === H + "/briefing/read") { D.reads.push(b.department + "|" + ME); return ok({ ok: true }); }
    // Zimmer verteilen (gleiche Regel wie der Server)
    if (p === H + "/rooms/assign") {
      var dirty = D.rooms.filter(function (r) { return r.status === "Schmutzig"; }).sort(function (a, c) { return String(a.floor).localeCompare(String(c.floor), "de", { numeric: true }) || a.number.localeCompare(c.number, "de", { numeric: true }); });
      var us = b.user_ids || [], tot = dirty.reduce(function (s, r) { return s + (r.occupancy === "Belegt" ? 0.5 : 1); }, 0), per = 0, acc = 0, asg = [], load = {};
      us.forEach(function (u) { load[u] = { rooms: 0, credits: 0 }; });
      dirty.forEach(function (r) { var c = r.occupancy === "Belegt" ? 0.5 : 1; if (per < us.length - 1 && acc + c / 2 > tot * (per + 1) / us.length) per++; acc += c; asg.push({ id: r.id, number: r.number, user_id: us[per] }); load[us[per]].rooms++; load[us[per]].credits += c; });
      if (b.apply) asg.forEach(function (a) { var rr = byId(D.rooms, a.id); rr.assigned_to = a.user_id; });
      return ok({ assign: asg, load: load, applied: !!b.apply });
    }
    // Einarbeitung
    if (p === "/api/organizations/demo-org/onboarding") return ok({ items: D.onboarding_items, onboardings: D.onboardings, done: D.ob_done });
    if (p === "/api/organizations/demo-org/onboarding/items") { var it3 = { id: nid("ob"), organization_id: "demo-org", text: b.text, department: b.department || null, position: D.onboarding_items.length }; D.onboarding_items.push(it3); return ok(it3); }
    if ((mm = p.match(/^\/api\/onboarding-items\/([^/]+)$/))) { remove(D.onboarding_items, mm[1]); return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/organizations\/demo-org\/onboarding\/([^/]+)\/toggle$/))) { var uid = mm[1];
      D.ob_done = D.ob_done.filter(function (x) { return !(x.user_id === uid && x.item_id === b.item_id); }); if (b.done) D.ob_done.push({ user_id: uid, item_id: b.item_id, done_by: ME }); return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/organizations\/demo-org\/onboarding\/([^/]+)$/))) { var uid2 = mm[1]; D.onboardings = D.onboardings.filter(function (x) { return x.user_id !== uid2; });
      if (m !== "DELETE") D.onboardings.push({ organization_id: "demo-org", user_id: uid2, buddy_id: b.buddy_id || null, start_date: b.start_date || todayIso, completed_at: b.completed ? new Date().toISOString() : null }); return ok({}); }
    // Handwerker
    if (p === H + "/contractors") { if (m === "POST") { var ct = { id: nid("ct"), hotel_id: D.hotel.id, name: b.name, trade: b.trade, url: "handwerk.html?demo=1" }; D.contractors.push(ct); return ok(ct); } return ok(lead ? D.contractors : []); }
    if ((mm = p.match(/^\/api\/contractors\/([^/]+)(\/rotate)?$/))) { if (m === "DELETE") { remove(D.contractors, mm[1]); return ok({ ok: true }); } return ok(byId(D.contractors, mm[1])); }
    // Bestellungen
    if (p === H + "/procurement") { if (m === "POST") { var pc = Object.assign({ id: nid("pc"), hotel_id: D.hotel.id }, b); D.procurement.push(pc); return ok(pc); } return ok(lead ? D.procurement : []); }
    if ((mm = p.match(/^\/api\/procurement\/([^/]+)$/))) { if (m === "DELETE") { remove(D.procurement, mm[1]); return ok({ ok: true }); } var pc2 = byId(D.procurement, mm[1]); Object.assign(pc2, b); return ok(pc2); }
    // Bewerbungen
    if (p === H + "/candidates") { if (m === "POST") { var cd = Object.assign({ id: nid("cd"), hotel_id: D.hotel.id, stage: "Eingegangen" }, b); D.candidates.push(cd); return ok(cd); } return ok(lead ? D.candidates : []); }
    if ((mm = p.match(/^\/api\/candidates\/([^/]+)$/))) { if (m === "DELETE") { remove(D.candidates, mm[1]); return ok({ ok: true }); } var cd2 = byId(D.candidates, mm[1]); Object.assign(cd2, b); return ok(cd2); }
    // Genehmigungen
    if (p === H + "/permits") { if (m === "POST") { var pm = Object.assign({ id: nid("pm"), hotel_id: D.hotel.id, status: "offen" }, b); D.permits.push(pm); return ok(pm); } return ok(lead ? D.permits : []); }
    if ((mm = p.match(/^\/api\/permits\/([^/]+)$/))) { if (m === "DELETE") { remove(D.permits, mm[1]); return ok({ ok: true }); } var pm2 = byId(D.permits, mm[1]); Object.assign(pm2, b); return ok(pm2); }
    // Gäste-Feedback
    if (p === H + "/feedback") {
      var cats = ["zimmer", "sauberkeit", "service", "fruehstueck", "checkin"], avg = {};
      cats.forEach(function (c) { var v = D.feedback.map(function (f) { return f.ratings[c]; }).filter(function (x) { return x; }); avg[c] = v.length ? Math.round(v.reduce(function (a, c2) { return a + c2; }, 0) / v.length * 10) / 10 : null; });
      return ok({ entries: D.feedback, averages: avg, count: D.feedback.length });
    }
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
