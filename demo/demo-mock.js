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
  if (D.hotel.phase === undefined) D.hotel.phase = "opening"; // Phase des Hotels (Migration 029)
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
  // 024: Bewertungen, Zähler mit Ständen, Anreisen, Dokumente mit Ablaufdatum
  D.reviews = (D.reviews || []).map(function (r) { return Object.assign({}, r, { review_date: add(todayIso, -r.daysAgo), created_at: now.toISOString() }); });
  D.review_summary = D.review_summary ? { id: "rs-1", hotel_id: D.hotel.id, review_count: 24, language: D.lang, created_at: new Date(now.getTime() - 2 * 86400000).toISOString(), summary: D.review_summary } : null;
  D.meter_readings = [];
  (D.meters || []).forEach(function (mt, mi) {
    var base = [182000, 41000, 9800][mi], perDay = [610, 95, 31][mi], v = base;
    for (var w = 56; w >= 0; w--) {
      var d = add(todayIso, -w * 7 - 2), month = Number(d.slice(5, 7)), season = mi === 1 ? (month <= 3 || month >= 11 ? 1.8 : month >= 6 && month <= 8 ? 0.4 : 1) : 1;
      var spike = mi === 0 && w === 0 ? 1.55 : 1;
      if (w < 56) v += Math.round(perDay * 7 * season * spike * (0.92 + ((w * 37) % 17) / 100));
      D.meter_readings.push({ id: "mr-" + mi + "-" + w, meter_id: mt.id, read_on: d, value: v, note: null, created_by: "u-admin" });
    }
  });
  D.hotel.guest_mail = { enabled: true, days_before: 3, checkin_time: "15:00", info: "", extras: (D.guest_extras || []).map(function (name, i) { return { id: "x" + i, name: name, price: [24, 18, 35][i] }; }) };
  D.arrivals = [["Familie Weber", "de", 1, true], ["Sarah Collins", "en", 1, false], ["Lucía Romero", "es", 2, true], ["Kenji Sato", "ja", 2, false], ["Ahmet Yılmaz", "tr", 3, false], ["Marie Dubois", "fr", 4, false]].map(function (g, i) {
    return { id: "ar-" + i, hotel_id: D.hotel.id, guest_name: g[0], language: g[1], arrival_date: add(todayIso, g[2]), departure_date: add(todayIso, g[2] + 3), email: "gast" + i + "@example.com",
      room_type: i % 2 ? "Superior" : "Deluxe", source: i < 4 ? "pms" : "import", mail_sent_at: g[2] <= 3 ? new Date(now.getTime() - 86400000 * (4 - g[2])).toISOString() : null,
      answered_at: g[3] ? now.toISOString() : null, eta: g[3] ? ["17:30", "21:00"][i ? 1 : 0] : null, extras: g[3] ? (i ? ["x0"] : ["x0", "x1"]) : [], guest_note: g[3] ? (D.guest_notes || [])[i ? 1 : 0] || null : null };
  });
  D.docs = (D.doc_names || []).map(function (name, i) { return { id: "dc-" + i, hotel_id: D.hotel.id, name: name, size_bytes: [480000, 210000, 1300000][i], mime_type: "application/pdf", uploaded_by: "u-admin", uploaded_by_email: "admin@alpenblick.at",
    created_at: new Date(now.getTime() - (i + 2) * 86400000 * 9).toISOString(), task_id: null, task_title: null, category: ["Wartungsvertrag", "Zertifikat", "Versicherung"][i], expires_at: add(todayIso, [21, -4, 280][i]), remind_days: 30 }; });
  // 025: Lieferanten, Bestellungen, Veranstaltungen, Gäste-Chat
  D.suppliers = [{ id: "sp-1", hotel_id: D.hotel.id, name: "Textil Moser", email: "bestellung@moser.example" }, { id: "sp-2", hotel_id: D.hotel.id, name: "GastroGroß", email: "order@gastrogross.example" }];
  D.purchase_orders = [{ id: "po-1", hotel_id: D.hotel.id, supplier_id: "sp-1", status: "Bestellt", items: [{ name: (D.procurement[0] || {}).name || "Handtücher", quantity: 40, unit: "Stück" }], sent_at: new Date(now.getTime() - 2 * 86400000).toISOString(), created_at: new Date(now.getTime() - 2 * 86400000).toISOString() }];
  D.events = (D.event_seed || []).map(function (e, i) { return Object.assign({ id: "ev-" + i, hotel_id: D.hotel.id }, e, { event_date: add(todayIso, e.inDays) }); });
  D.guest_threads = (D.chat_seed || []).map(function (c, i) { var t0 = now.getTime() - (i + 1) * 3600000; return { thread: "demo-thread-" + i + "-xxxxxxxx", room_number: c.room,
    messages: c.msgs.map(function (m, j) { return { id: "gm-" + i + "-" + j, sender: m[0], body: m[1], read_at: m[0] === "staff" || i ? new Date().toISOString() : null, created_at: new Date(t0 + j * 300000).toISOString() }; }) }; });
  // 027: Rechnungsdaten, Rechnungen, eigene Vorlagen
  D.hotel.invoice_settings = D.hotel.invoice_settings || { company: D.hotel.name + " GmbH", address: "Ringstraße 1\n1010 Wien", uid: "ATU12345678", iban: "AT61 1904 3002 3457 3201", bic: "GIBAATWWXXX", bank: "Demo Bank", phone: "+43 1 234 56 78", email: "info@hotel.example", prefix: "RE-", payment_days: 14, default_tax_rate: 10, prices_gross: true };
  D.invoices = []; D.doc_templates = [];
  (D.budget || []).slice(0, 2).forEach(function (x, i) { x.committed = Math.round(Number(x.planned || 0) * [0.15, 0.1][i]); });
  // 026: Räume, Angebote, eigene Vorlagen
  D.event_spaces = []; D.event_templates = [];
  D.events.forEach(function (e, i) {
    var sp = D.event_spaces.find(function (x) { return x.name === e.location; });
    if (!sp && e.location) { sp = { id: "es-" + i, hotel_id: D.hotel.id, name: e.location, capacity: [120, 40, 150][i] || 60, position: i }; D.event_spaces.push(sp); }
    e.space_id = sp ? sp.id : null; e.offer_items = []; e.offer_status = "keins";
  });
  if (D.events[0]) { D.events[0].offer_items = [{ label: (D.events[0].menu || "").split("\n")[1] || "Menü", unit_price: 69, per_person: true }, { label: "Getränkepauschale", unit_price: 45, per_person: true }, { label: D.events[0].location || "Raum", qty: 1, unit_price: 800, per_person: false }];
    D.events[0].offer_status = "angenommen"; D.events[0].offer_answer_name = D.events[0].client; D.events[0].offer_answered_at = new Date(now.getTime() - 5 * 86400000).toISOString();
    var g0 = Number(D.events[0].guests) || 80, dep = Math.round((69 + 45) * g0 * 0.3 + 800 * 0.3);
    D.invoices.push({ id: "inv-1", hotel_id: D.hotel.id, event_id: D.events[0].id, kind: "Anzahlung", year: Number(todayIso.slice(0, 4)), seq: 1, number: "RE-" + todayIso.slice(0, 4) + "-0001", issued_on: add(todayIso, -4), due_on: add(todayIso, 10),
      service_date: D.events[0].event_date, recipient: D.events[0].client || "Kunde", recipient_email: null, items: [{ label: "Anzahlung 30 %", qty: 1, unit: "", unit_price: dep, tax_rate: 10 }], prices_gross: true,
      net_total: Math.round(dep / 1.1 * 100) / 100, tax_total: Math.round((dep - dep / 1.1) * 100) / 100, gross_total: dep, deducted: 0, currency: D.hotel.currency || "EUR", seller: Object.assign({ hotel: D.hotel.name }, D.hotel.invoice_settings), status: "bezahlt", paid_on: add(todayIso, -1) }); }
  if (D.events[1]) { D.events[1].offer_items = [{ label: "Tagungspauschale", unit_price: 58, per_person: true }]; D.events[1].offer_status = "offen"; D.events[1].offer_valid_until = add(todayIso, 10); }
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
  /* Migration 031: Gerätebuch, Kontrollgänge, Arbeitsanweisungen, Krankmeldungen, Urlaub, Ortstaxe */
  function tok(n) { var s = "", c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; for (var i = 0; i < 64; i++) s += c[(n * 7 + i * 13 + (i * i) % 11) % c.length]; return s; }
  D.rooms.forEach(function (r) { if (r.cleaning_credits === undefined) r.cleaning_credits = r.room_type === "Suite" ? 2.0 : 1.0; });
  D.hotel.tourism_tax = { rate_per_night: 2.6, label: "Ortstaxe", note: "" };
  var AH = D.hotel.id;
  // Migration 032: Gäste-Infos, Lieferantenportal, Akademie
  D.hotel.guest_info = D.hotel.guest_info || { wifi_name: "Alpenblick-Gast", wifi_password: "Bergluft2026", breakfast: "täglich 07:00–10:30 Uhr, Restaurant Erdgeschoss", checkout: "bis 11:00 Uhr", reception_phone: "Durchwahl 9", taxi: "Taxi Zillertal +43 5282 1234", notes: "",
    menu: [{ name: "Tiroler Gröstl", note: "A, C, G", price: "16,50" }, { name: "Kaspressknödelsuppe", note: "A, C, G, L", price: "8,90" }, { name: "Wiener Schnitzel", note: "A, C, G", price: "21,00" }, { name: "Kaiserschmarrn", note: "A, C, G, H", price: "11,50" }],
    spa: [{ name: "Klassische Massage", duration: "50 Min.", price: "75" }, { name: "Kräuterstempel-Massage", duration: "60 Min.", price: "89" }, { name: "Gesichtsbehandlung", duration: "45 Min.", price: "68" }] };
  if (D.purchase_orders[0]) Object.assign(D.purchase_orders[0], { supplier_status: "bestätigt", supplier_delivery_date: add(todayIso, 3), supplier_note: "Lieferung vormittags, bitte Rampe freihalten.", supplier_answered_at: new Date(now.getTime() - 86400000).toISOString() });
  D.purchase_orders.push({ id: "po-2", hotel_id: AH, supplier_id: "sp-2", status: "Bestellt", items: [{ name: "Kaffeebohnen", quantity: 12, unit: "kg" }], sent_at: new Date(now.getTime() - 3600000).toISOString(), created_at: new Date(now.getTime() - 3600000).toISOString(), supplier_status: "offen", supplier_delivery_date: null, supplier_note: null });
  D.courses = [
    { id: "co-1", hotel_id: AH, title: "Zimmerreinigung in 10 Schritten", description: "Der Standard für ein perfektes Gästezimmer.", department: "Housekeeping", pass_percent: 80, active: true,
      lessons: [{ title: "Vorbereitung und Wagen", text: "Wagen vollständig bestücken, Handschuhe anziehen, Zimmer klopfen und melden." }, { title: "Bad zuerst", text: "Bad von oben nach unten reinigen, Armaturen polieren, Handtücher ersetzen." }, { title: "Bett und Kontrolle", text: "Bett nach Hausstandard beziehen, Staub wischen, Boden saugen, Schlusskontrolle." }],
      quiz: [{ question: "Womit beginnt die Reinigung im Bad?", options: ["Boden", "Oben (Spiegel, Armaturen)", "WC-Schüssel"], correct: 1 }, { question: "Was geschieht vor dem Betreten des Zimmers?", options: ["Klopfen und melden", "Direkt eintreten", "Fenster öffnen"], correct: 0 }, { question: "Wann erfolgt die Schlusskontrolle?", options: ["Nie", "Nach dem Saugen", "Vor dem Bettenmachen"], correct: 1 }] },
    { id: "co-2", hotel_id: AH, title: "HACCP-Grundlagen", description: "Lebensmittelhygiene und Kühlketten.", department: "F&B", pass_percent: 80, active: true,
      lessons: [{ title: "Was ist HACCP?", text: "Ein System, um Gefahren bei Lebensmitteln zu erkennen und zu beherrschen." }, { title: "Kühlkette", text: "Kühlware bei höchstens 5 °C lagern, Temperaturen täglich dokumentieren." }],
      quiz: [{ question: "Maximale Lagertemperatur für Kühlware?", options: ["5 °C", "12 °C", "20 °C"], correct: 0 }, { question: "Wie oft werden Temperaturen dokumentiert?", options: ["Jährlich", "Täglich", "Nie"], correct: 1 }, { question: "Wofür steht das erste H in HACCP?", options: ["Hygiene", "Hazard (Gefahren)", "Hotel"], correct: 1 }, { question: "Rohes Fleisch lagert man ...", options: ["über Salat", "unten im Kühlschrank", "bei Raumtemperatur"], correct: 1 }] },
    { id: "co-3", hotel_id: AH, title: "Brandschutz im Hotel", description: "Verhalten im Brandfall für alle Abteilungen.", department: null, pass_percent: 80, active: true,
      lessons: [{ title: "Alarmieren", text: "Ruhe bewahren, Feuerwehr 122 rufen, Rezeption informieren." }, { title: "Evakuieren", text: "Gäste über Fluchtwege nach draußen zum Sammelplatz führen, keine Aufzüge benutzen." }, { title: "Löschen", text: "Nur Entstehungsbrände und nur ohne Eigengefährdung löschen." }, { title: "Sammelplatz", text: "Anwesenheit prüfen und der Feuerwehr melden." }],
      quiz: [{ question: "Welche Notrufnummer hat die Feuerwehr?", options: ["112", "122", "144"], correct: 1 }, { question: "Darf im Brandfall der Aufzug benutzt werden?", options: ["Ja", "Nein"], correct: 1 }, { question: "Wohin werden Gäste geführt?", options: ["Zum Sammelplatz", "Zurück aufs Zimmer", "Zur Bar"], correct: 0 }] }];
  var cm0 = D.members.map(function (x) { return x.user_id; });
  D.course_results = [["co-3", 0, 100, 5], ["co-3", 1, 100, 4], ["co-3", 2, 67, 2], ["co-1", 1, 100, 3], ["co-2", 2, 75, 1], ["co-2", 3, 100, 6]].filter(function (r) { return cm0[r[1]]; }).map(function (r, i) {
    return { id: "cr-" + i, course_id: r[0], hotel_id: AH, user_id: cm0[r[1]], score: r[2], passed: r[2] >= 80, completed_at: new Date(now.getTime() - r[3] * 86400000).toISOString() }; });
  D.assets = [
    { id: "as-1", name: "Kühlzelle Küche", category: "Kälte", location: "Küche, Keller", manufacturer: "Liebherr", model: "LKS 4500", serial_no: "KZ-20871", department: "F&B", purchased_on: add(todayIso, -900), warranty_until: add(todayIso, 190), inspection_interval_months: 6, last_inspection: add(todayIso, -150), next_inspection: add(todayIso, 31), notes: "Temperaturlogger angeschlossen." },
    { id: "as-2", name: "Personenaufzug Hauptstiege", category: "Aufzug", location: "Treppenhaus A", manufacturer: "Schindler", model: "3300", serial_no: "SC-330-1187", department: "Technik", purchased_on: add(todayIso, -2400), warranty_until: add(todayIso, -1500), inspection_interval_months: 12, last_inspection: add(todayIso, -380), next_inspection: add(todayIso, -15), notes: "Wiederkehrende Prüfung durch TÜV Austria; Termin überfällig." },
    { id: "as-3", name: "Brandmeldeanlage", category: "Brandschutz", location: "Technikraum EG", manufacturer: "Siemens", model: "Sinteso FS20", serial_no: "BMA-4410", department: "Technik", purchased_on: add(todayIso, -1500), warranty_until: add(todayIso, -700), inspection_interval_months: 12, last_inspection: add(todayIso, -340), next_inspection: add(todayIso, 25), notes: "Jahreswartung laut TRVB 123 S." },
    { id: "as-4", name: "Heizkessel", category: "Heizung", location: "Heizraum UG", manufacturer: "Viessmann", model: "Vitoplex 200", serial_no: "VP-2009-552", department: "Technik", purchased_on: add(todayIso, -3000), warranty_until: add(todayIso, -2200), inspection_interval_months: 12, last_inspection: add(todayIso, -200), next_inspection: add(todayIso, 165), notes: "Rauchfangkehrer jährlich." },
    { id: "as-5", name: "Gewerbespülmaschine", category: "Küche", location: "Spülküche", manufacturer: "Winterhalter", model: "UC-L", serial_no: "WH-884210", department: "F&B", purchased_on: add(todayIso, -400), warranty_until: add(todayIso, 330), inspection_interval_months: 6, last_inspection: add(todayIso, -60), next_inspection: add(todayIso, 121), notes: "" },
    { id: "as-6", name: "Kaffeemaschine Frühstücksbuffet", category: "Küche", location: "Frühstücksraum", manufacturer: "WMF", model: "1500 S+", serial_no: "WMF-77231", department: "F&B", purchased_on: add(todayIso, -250), warranty_until: add(todayIso, 115), inspection_interval_months: 3, last_inspection: add(todayIso, -80), next_inspection: add(todayIso, 10), notes: "Entkalkung alle 3 Monate." },
    { id: "as-7", name: "Notstromaggregat", category: "Elektro", location: "Garage Nord", manufacturer: "Kohler", model: "KD45", serial_no: "KO-45-0912", department: "Technik", purchased_on: add(todayIso, -1800), warranty_until: add(todayIso, -1000), inspection_interval_months: 6, last_inspection: add(todayIso, -120), next_inspection: add(todayIso, 62), notes: "Probelauf monatlich." },
    { id: "as-8", name: "Lüftungsanlage Wellness", category: "Lüftung", location: "Dach, Wellnessbereich", manufacturer: "Menerga", model: "Adconair", serial_no: "ME-2231-04", department: "Technik", purchased_on: add(todayIso, -700), warranty_until: add(todayIso, 30), inspection_interval_months: 12, last_inspection: add(todayIso, -300), next_inspection: add(todayIso, 65), notes: "Filterwechsel im Frühjahr." }
  ].map(function (a) { return Object.assign({ hotel_id: AH, created_at: now.toISOString() }, a); });
  var PTS = [["Feuerlöscher Gang 1. OG", "brandschutz", "Technik"], ["Notausgang Treppenhaus A", "brandschutz", "Technik"], ["Warmwasser Zimmer 214 (Legionellen)", "legionellen", "Technik"], ["Warmwasserspeicher Keller", "legionellen", "Technik"], ["Nachtrunde Rezeption/Lobby", "nachtrunde", "Rezeption"]];
  D.patrol_points = PTS.map(function (x, i) { return { id: "pp-" + (i + 1), hotel_id: AH, name: x[0], kind: x[1], department: x[2], token: tok(i + 1), active: true, created_at: now.toISOString() }; });
  D.patrol_scans = [];
  for (var psi = 0; psi < 15; psi++) {
    var ppt = D.patrol_points[psi % 5], bad = psi === 4 || psi === 11, leg = ppt.kind === "legionellen";
    D.patrol_scans.push({ id: "ps-" + (psi + 1), hotel_id: AH, point_id: ppt.id, user_id: psi % 2 ? "u-ewa" : "u-hkm", ok: !bad,
      temperature: leg ? (psi === 11 ? 49.5 : [55.5, 58, 61.5, 56.5][psi % 4]) : null,
      note: psi === 4 ? "Feuerlöscher-Plombe fehlt, Meldung an Technik." : psi === 11 ? "Temperatur zu niedrig, Speicher prüfen." : null,
      scanned_at: new Date(now.getTime() - (psi * 0.9 + 0.2) * 86400000).toISOString() });
  }
  // Ergänzungen: Automatik, Abnahme, Kontrollpunkt-Nachweise, Mitarbeiter-Dokumente, Gerätebuch-Verträge, Allergene, Pflichtplan
  D.hotel.automations = D.hotel.automations || {}; D.hotel.inspection_items = D.hotel.inspection_items || [];
  D.patrol_points.forEach(function (pp) { pp.require_photo = pp.kind === "brandschutz" && pp.name.indexOf("Feuerlöscher") === 0 || pp.id === "pp-1"; pp.require_signature = pp.id === "pp-5"; });
  D.patrol_scans.forEach(function (s) { s.has_photo = s.point_id === "pp-1"; s.has_signature = s.point_id === "pp-5"; });
  // Rundgänge (Migration 037): Nachtrunde mit 4 Punkten, Brandschutz mit 2; heute sind die ersten zwei Punkte der Nachtrunde gescannt
  [["Wellness-Eingang", "Rezeption"], ["Tiefgarage Zugang", "Technik"], ["Hintereingang Küche", "Technik"]].forEach(function (x, i) {
    D.patrol_points.push({ id: "pp-" + (6 + i), hotel_id: AH, name: x[0], kind: "nachtrunde", department: x[1], token: tok(6 + i), active: true, created_at: now.toISOString(), require_photo: false, require_signature: false }); });
  [["pp-5", "Nachtrunde", 1], ["pp-6", "Nachtrunde", 2], ["pp-7", "Nachtrunde", 3], ["pp-8", "Nachtrunde", 4], ["pp-1", "Brandschutz", 1], ["pp-2", "Brandschutz", 2]].forEach(function (r) {
    var pt = byId(D.patrol_points, r[0]); pt.route = r[1]; pt.route_order = r[2]; });
  D.patrol_points.forEach(function (pt) { if (!("route" in pt)) { pt.route = null; pt.route_order = null; } });
  ["pp-5", "pp-6"].forEach(function (id, i) { D.patrol_scans.push({ id: "ps-r" + i, hotel_id: AH, point_id: id, user_id: "u-hkm", ok: true, temperature: null, note: null, has_photo: false, has_signature: id === "pp-5",
    scanned_at: new Date(now.getTime() - (12 + i * 8) * 60000).toISOString() }); });
  var PX_PHOTO = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#d9d4c7"/><rect x="130" y="50" width="60" height="110" rx="10" fill="#b3402f"/><rect x="150" y="30" width="20" height="25" fill="#444"/></svg>');
  var PX_SIGN = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><rect width="300" height="100" fill="#fff"/><path d="M20 70 C50 10 70 90 100 40 S150 80 180 35 S240 70 280 30" stroke="#1a2b4c" stroke-width="3" fill="none"/></svg>');
  [["as-1", "Kältetechnik Huber GmbH", "service@kaeltetechnik-huber.example", "+43 512 555 0142", 1280, add(todayIso, 240)], ["as-3", "Securitas Brandschutz", "wartung@brandschutz.example", "+43 512 555 0177", 2400, add(todayIso, 25)]].forEach(function (c) {
    var a = byId(D.assets, c[0]); if (a) { a.service_company = c[1]; a.service_email = c[2]; a.service_phone = c[3]; a.contract_cost_year = c[4]; a.contract_until = c[5]; } });
  D.assets.forEach(function (a) { if (a.service_company === undefined) { a.service_company = null; a.service_email = null; a.service_phone = null; a.contract_cost_year = null; a.contract_until = null; } });
  var ALG = [["A", "C", "G"], ["A", "C", "G", "L"], ["A", "C", "G"], ["A", "C", "G", "H"]];
  ((D.hotel.guest_info || {}).menu || []).forEach(function (it, i) { if (!it.allergens) it.allergens = ALG[i % ALG.length]; });
  D.acks = D.acks.filter(function (a) { return !(a.training_id === "tr-1" && a.user_id === "u-ewa"); });
  D.acks.push({ training_id: "tr-1", user_id: "u-ewa", acked_at: new Date(now.getTime() - 350 * 86400000).toISOString() }, { training_id: "tr-1", user_id: "u-member", acked_at: new Date(now.getTime() - 420 * 86400000).toISOString() });
  D.trainings.forEach(function (t) { if (t.valid_months === undefined) t.valid_months = 12; if (!t.departments) t.departments = []; });
  D.staff_docs = [
    { id: "sd-1", organization_id: "demo-org", hotel_id: AH, user_id: "u-member", person_name: null, kind: "Gesundheitszeugnis", title: "Gesundheitszeugnis Lebensmittel", valid_until: add(todayIso, 20), remind_days: 30, note: null, has_file: true, created_at: new Date(now.getTime() - 300 * 86400000).toISOString() },
    { id: "sd-2", organization_id: "demo-org", hotel_id: AH, user_id: "u-ewa", person_name: null, kind: "Aufenthaltstitel", title: "Aufenthaltstitel Rot-Weiß-Rot Karte", valid_until: add(todayIso, -12), remind_days: 60, note: "Verlängerung beantragt.", has_file: true, created_at: new Date(now.getTime() - 700 * 86400000).toISOString() },
    { id: "sd-3", organization_id: "demo-org", hotel_id: AH, user_id: "u-hkm", person_name: null, kind: "Arbeitsvertrag", title: "Arbeitsvertrag unbefristet", valid_until: null, remind_days: 30, note: null, has_file: false, created_at: new Date(now.getTime() - 900 * 86400000).toISOString() }];
  D.room_insp = [{ id: "ri-1", room_id: D.rooms[0] && D.rooms[0].id, inspector: "u-hkm", created_at: new Date(now.getTime() - 2 * 86400000).toISOString(), passed: false, note: "Nachkontrolle am Nachmittag.",
    items: [{ label: "Bett und Wäsche", ok: true, note: null, has_photo: false }, { label: "Bad sauber", ok: false, note: "Haare im Duschablauf", has_photo: true }, { label: "Boden gesaugt", ok: true, note: null, has_photo: false }] }];
  D.work_instructions = [
    { id: "wi-1", title: "Bett richtig beziehen", department: "Housekeeping", steps: [{ text: "Alte Wäsche abziehen und im Wäschesack sammeln." }, { text: "Matratzenschoner auf Sauberkeit prüfen." }, { text: "Spannleintuch faltenfrei über die Matratze ziehen." }, { text: "Duvet in den Bezug einziehen, Ecken ausrichten." }, { text: "Kopfpolster aufschütteln und mittig platzieren." }, { text: "Tagesdecke glatt streichen, Zierpolster anordnen." }] },
    { id: "wi-2", title: "Kaffeemaschine reinigen", department: "F&B", steps: [{ text: "Maschine ausschalten und Reinigungsprogramm starten." }, { text: "Reinigungstablette in den Schacht legen." }, { text: "Milchsystem mit Reiniger spülen." }, { text: "Auffangschale und Abtropfgitter ausspülen." }, { text: "Gehäuse feucht abwischen, Protokoll abzeichnen." }] },
    { id: "wi-3", title: "Check-in Ablauf", department: "Rezeption", steps: [{ text: "Gast freundlich begrüßen, Namen bestätigen." }, { text: "Meldezettel prüfen und Ausweis kontrollieren." }, { text: "Zimmerkarten codieren und Frühstückszeiten nennen." }, { text: "Auf Ortstaxe und Zusatzleistungen hinweisen." }] }
  ].map(function (w) { return Object.assign({ hotel_id: AH, created_at: now.toISOString() }, w); });
  D.sick_notes = [{ id: "sn-1", hotel_id: AH, user_id: "u-ewa", from_date: add(todayIso, -6), to_date: add(todayIso, -3), note: "Grippaler Infekt", has_photo: false, created_at: new Date(now.getTime() - 6 * 86400000).toISOString() },
    { id: "sn-2", hotel_id: AH, user_id: "u-member", from_date: add(todayIso, -25), to_date: add(todayIso, -22), note: null, has_photo: false, created_at: new Date(now.getTime() - 25 * 86400000).toISOString() }];
  D.leave_bal = {};
  D.members.forEach(function (x, i) { D.leave_bal[x.user_id] = { entitlement_days: 25, carried_over_days: i % 3 === 0 ? 3 : 0 }; });
  var yr0 = Number(todayIso.slice(0, 4)), curM = Number(todayIso.slice(5, 7));
  D.tax_months = [];
  for (var tm = 1; tm <= curM; tm++) { var ns = [1650, 1500, 1980, 2300, 2650, 3100, 3500, 3380, 2900, 2450, 1900, 2800][tm - 1];
    D.tax_months.push({ id: "tt-" + tm, hotel_id: AH, month: yr0 + "-" + String(tm).padStart(2, "0") + "-01", overnight_stays: ns, exempt_stays: Math.round(ns * 0.05), note: null }); }
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

  /* Kasse, Schlüssel, Dienstkleidung, Umfrage, Tagesinfo */
  var MON = todayIso.slice(0, 7), nowIso = function (h) { return new Date(now.getTime() - h * 3600000).toISOString(); };
  var RCPT = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='260'><rect width='200' height='260' fill='#fff' stroke='#999'/><text x='20' y='40' font-size='16' font-family='sans-serif'>Beleg (Demo)</text><text x='20' y='80' font-size='13' font-family='sans-serif'>Blumen Lobby</text><text x='20' y='110' font-size='13' font-family='sans-serif'>Summe 24,90</text></svg>");
  D.cash = [
    { id: "cash-1", entry_date: MON + "-02", direction: "ein", category: "Trinkgeld", amount: 86.5, note: "Trinkgeld-Kasse Rezeption", department: "Rezeption", created_by: "u-admin", created_at: nowIso(300), has_receipt: false },
    { id: "cash-2", entry_date: MON + "-05", direction: "aus", category: "Einkauf", amount: 24.9, note: "Blumen Lobby", department: "Rezeption", created_by: "u-admin", created_at: nowIso(240), has_receipt: true },
    { id: "cash-3", entry_date: MON + "-08", direction: "ein", category: "Wechselgeld", amount: 200, note: "Wechselgeld von der Bank", department: "Rezeption", created_by: "u-admin", created_at: nowIso(170), has_receipt: false },
    { id: "cash-4", entry_date: MON + "-12", direction: "aus", category: "Sonstiges", amount: 12.4, note: "Briefmarken", department: "Büro", created_by: "u-admin", created_at: nowIso(100), has_receipt: true }
  ];
  D.keys = [
    { id: "key-1", name: "Generalschlüssel Haus", kind: "Generalschlüssel", code: "GS-01", note: "Nur Direktion und Hausdame", active: true },
    { id: "key-2", name: "Technikraum", kind: "Schlüssel", code: "T-12", note: null, active: true },
    { id: "key-3", name: "Zimmerkarte Master Etage 2", kind: "Karte", code: "M-02", note: null, active: true },
    { id: "key-4", name: "Dachzugang", kind: "Transponder", code: "D-07", note: "Wartungsfirmen", active: true },
    { id: "key-5", name: "Lager Keller", kind: "Schlüssel", code: "K-03", note: null, active: true }];
  D.key_loans = [
    { id: "kl-1", key_id: "key-4", user_id: null, holder_name: "Elektro Huber", issued_at: nowIso(5), due_back: add(todayIso, 1), returned_at: null, note: "Prüfung Elektroanlage" },
    { id: "kl-2", key_id: "key-2", user_id: "u-hkm", holder_name: null, issued_at: nowIso(24 * 5), due_back: add(todayIso, -2), returned_at: null, note: null },
    { id: "kl-3", key_id: "key-5", user_id: "u-ewa", holder_name: null, issued_at: nowIso(24 * 3), due_back: add(todayIso, -2), returned_at: nowIso(24 * 2), note: null }];
  D.uniforms = [
    { id: "un-1", user_id: "u-fb", holder_name: null, item: "Kochjacke", size: "L", quantity: 3, issued_at: add(todayIso, -60), returned_at: null, note: null },
    { id: "un-2", user_id: "u-fb", holder_name: null, item: "Schürze", size: "Einheitsgröße", quantity: 2, issued_at: add(todayIso, -60), returned_at: null, note: null },
    { id: "un-3", user_id: "u-ewa", holder_name: null, item: "Bluse", size: "38", quantity: 3, issued_at: add(todayIso, -90), returned_at: null, note: null },
    { id: "un-4", user_id: null, holder_name: "Anna K. (Aushilfe)", item: "Bluse", size: "36", quantity: 2, issued_at: add(todayIso, -50), returned_at: add(todayIso, -6), note: "Aushilfe beendet" }];
  D.pulse_done = false;
  D.pulse_comments = ["Der Dienstplan kommt jetzt früh genug, das hilft sehr.", "Im Frühdienst fehlt oft eine Person, dann wird es hektisch.", "Gute Stimmung im Team, danke für die neue Kaffeemaschine."];
  D.cal_notes = [{ id: "cn-1", date_from: add(todayIso, 3), date_to: add(todayIso, 3), title: "Betriebsversammlung", kind: "Hinweis", note: "14:00 Uhr im Salon" }];

  /* Antworten auf Bewertungen, Inventur, Empfehlung */
  D.reviews.forEach(function (r, i) {
    r.reply_status = i === 1 ? "beantwortet" : i === 3 ? "entwurf" : "offen";
    r.reply_draft = i === 1 ? "Vielen Dank für Ihre Bewertung und die netten Worte! Wir freuen uns sehr, dass Ihnen der Aufenthalt gefallen hat, und hoffen, Sie bald wieder bei uns zu begrüßen. Ihr Team des Beispielhotel Alpenblick"
      : i === 3 ? "Herzlichen Dank für Ihr Feedback! Es freut uns, dass Sie sich bei uns wohlgefühlt haben. Ihr Team des Beispielhotel Alpenblick" : null;
    r.replied_at = i === 1 ? nowIso(48) : null;
  });
  (D.stock || []).forEach(function (s, i) { s.barcode = ["9001234567890", null, "9004567890123", null, "4001234500017"][i % 5] || null; });
  D.inventories = [{ id: "inv-1", hotel_id: D.hotel.id, department: "Housekeeping", started_at: nowIso(24 * 20), finished_at: nowIso(24 * 20 - 1), note: null, lines: [] }];
  (D.stock || []).filter(function (s) { return s.department === "Housekeeping"; }).forEach(function (s) { D.inventories[0].lines.push({ item_id: s.id, counted: s.quantity, counted_at: nowIso(24 * 20) }); });
  function invOut(c) { return Object.assign({}, c, { lines: c.lines.slice() }); }

  /* Migration 037: Wäscherei, Minibar, Frühstück, Personalunterkünfte */
  function dayIn(k) { var d = add(todayIso, -k); return d < MON + "-01" ? MON + "-01" : d; }
  D.laundry_items = [["Bettlaken", 18, 400], ["Badetuch", 9.5, 300], ["Handtuch", 5.5, 350], ["Bademantel", 32, 60]].map(function (x, i) {
    return { id: "li-" + (i + 1), hotel_id: AH, name: x[0], unit_cost: x[1], par_level: x[2], active: true, created_at: now.toISOString() }; });
  D.laundry_moves = [];
  [["li-1", [[6, 120, 118, 1], [4, 110, 106, 2], [2, 130, 124, 1], [0, 90, 0, 0]]], ["li-2", [[6, 80, 79, 0], [3, 90, 85, 3], [1, 70, 68, 0]]],
    ["li-3", [[5, 100, 97, 1], [2, 120, 116, 2], [0, 60, 0, 0]]], ["li-4", [[5, 20, 20, 0], [2, 24, 22, 1]]]].forEach(function (g) {
    g[1].forEach(function (r, j) { D.laundry_moves.push({ id: "lm-" + g[0] + "-" + j, hotel_id: AH, item_id: g[0], move_date: dayIn(r[0]), sent: r[1], returned: r[2], damaged: r[3],
      note: r[3] ? "Flecken, aussortiert" : null, created_by: "u-hkm", created_at: now.toISOString() }); }); });
  D.minibar_items = [["Wasser 0,33 l", 3.5], ["Cola 0,33 l", 4.5], ["Bier 0,33 l", 5], ["Erdnüsse", 3.9], ["Schokolade", 4.2]].map(function (x, i) {
    return { id: "mi-" + (i + 1), hotel_id: AH, name: x[0], price: x[1], active: true, sort: i, created_at: now.toISOString() }; });
  function roomOf(num) { return D.rooms.find(function (r) { return r.number === num; }) || D.rooms[0] || { id: "room-" + num, number: num }; }
  D.minibar_charges = [["214", "mi-2", 2, 30], ["214", "mi-4", 1, 30], ["305", "mi-3", 2, 22], ["118", "mi-1", 3, 14], ["118", "mi-5", 1, 14], ["402", "mi-3", 1, 6], ["402", "mi-2", 1, 6], ["226", "mi-1", 2, 3]].map(function (c, i) {
    var it = byId(D.minibar_items, c[1]), rm = roomOf(c[0]);
    return { id: "mc-" + (i + 1), hotel_id: AH, room_id: rm.id, item_id: it.id, item_name: it.name, unit_price: it.price, quantity: c[2], charged_at: nowIso(c[3]), created_by: "u-hkm", billed_at: null, billed_by: null, room: c[0] }; });
  D.minibar_charges.push({ id: "mc-b1", hotel_id: AH, room_id: roomOf("109").id, item_id: "mi-3", item_name: "Bier 0,33 l", unit_price: 5, quantity: 2, charged_at: nowIso(72), created_by: "u-hkm", billed_at: nowIso(60), billed_by: "u-fo", room: "109" });
  D.hotel.breakfast_settings = D.hotel.breakfast_settings || { persons_per_room: 1.8, share: 0.9, guests_per_staff: 30, min_staff: 1,
    items: [{ name: "Eier", per_guest: 1.5, unit: "Stk" }, { name: "Brötchen", per_guest: 2.2, unit: "Stk" }, { name: "Milch", per_guest: 0.15, unit: "l" }, { name: "Joghurt", per_guest: 0.8, unit: "Stk" }, { name: "Aufschnitt", per_guest: 60, unit: "g" }, { name: "Kaffee", per_guest: 0.4, unit: "Tassen" }] };
  function cleanBf(o) {
    function num(v, lo, hi, d) { var n = Number(String(v == null ? "" : v).replace(",", ".")); return n >= lo && n <= hi ? Math.round(n * 100) / 100 : d; }
    o = o || {};
    return { persons_per_room: num(o.persons_per_room, 0.5, 6, 1.8), share: num(o.share, 0, 1, 0.9), guests_per_staff: num(o.guests_per_staff, 5, 200, 30), min_staff: Math.round(num(o.min_staff, 0, 20, 1)),
      items: (Array.isArray(o.items) ? o.items : []).slice(0, 40).map(function (x) { return { name: String((x && x.name) || "").trim().slice(0, 60), per_guest: num(x && x.per_guest, 0, 100, 0), unit: String((x && x.unit) || "").trim().slice(0, 15) }; }).filter(function (x) { return x.name && x.per_guest > 0; }) };
  }
  D.hotel.breakfast_settings = cleanBf(D.hotel.breakfast_settings);
  D.housing_units = [["Personalhaus Zimmer 1", 2, 180, "Erdgeschoss, eigenes Bad"], ["Personalhaus Zimmer 2", 1, 240, "1. Stock, Balkon"], ["Personalhaus Zimmer 3", 2, 180, "1. Stock, Gemeinschaftsküche"]].map(function (x, i) {
    return { id: "hu-" + (i + 1), hotel_id: AH, name: x[0], beds: x[1], rent_month: x[2], note: x[3], active: true, created_at: now.toISOString() }; });
  D.housing_assignments = [
    { id: "ha-1", unit_id: "hu-1", user_id: "u-member", person_name: null, from_date: add(todayIso, -200), to_date: null, deposit: 300, deposit_returned_at: null, handover_note: "Schlüssel und Bettwäsche übergeben." },
    { id: "ha-2", unit_id: "hu-1", user_id: "u-fb", person_name: null, from_date: add(todayIso, -90), to_date: null, deposit: 300, deposit_returned_at: null, handover_note: null },
    { id: "ha-3", unit_id: "hu-3", user_id: "u-ewa", person_name: null, from_date: add(todayIso, -150), to_date: null, deposit: 300, deposit_returned_at: null, handover_note: "Zimmer ohne Mängel übergeben." },
    { id: "ha-4", unit_id: "hu-3", user_id: null, person_name: "Tomasz W. (Saison)", from_date: add(todayIso, -40), to_date: add(todayIso, 50), deposit: 200, deposit_returned_at: null, handover_note: null },
    { id: "ha-5", unit_id: "hu-2", user_id: null, person_name: "Anna K. (Aushilfe)", from_date: add(todayIso, -120), to_date: add(todayIso, -10), deposit: 300, deposit_returned_at: add(todayIso, -8), handover_note: "Sauber zurückgegeben, Kaution erstattet." }
  ].map(function (a) { return Object.assign({ hotel_id: AH, created_at: now.toISOString() }, a); });
  function numOrNull(v) { if (v === "" || v == null) return null; var n = Math.round(Number(String(v).replace(",", ".")) * 100) / 100; return isNaN(n) ? null : n; }

  /* Migration 038: Gästeprofile, Gästebuchungen, Simulator, Saison-Übergabe, Nachhaltigkeit, Aushilfs-Börse, Lehrlinge */
  var CO2_DEF = { Strom: 0.13, Gas: 0.2, "Wärme": 0.15, "Öl": 0.27, Pellets: 0.03, Wasser: 0.3 };
  function cleanSust(v) {
    var o = v && typeof v === "object" ? v : {}, f = o.factors && typeof o.factors === "object" ? o.factors : {}, fx = {};
    Object.keys(CO2_DEF).forEach(function (k) { var n = f[k] == null || f[k] === "" ? NaN : Number(String(f[k]).replace(",", ".")); fx[k] = n >= 0 && n <= 10 ? n : CO2_DEF[k]; });
    var l = Number(String(o.laundry_kg_per_piece == null ? "" : o.laundry_kg_per_piece).replace(",", "."));
    return { factors: fx, laundry_kg_per_piece: l > 0 && l <= 10 ? l : 0.5 };
  }
  function cleanHandover(v) {
    var o = v && typeof v === "object" ? v : {}, t = function (x, n) { return String(x == null ? "" : x).trim().slice(0, n); };
    return { good: t(o.good, 3000), bad: t(o.bad, 3000), next: t(o.next, 3000), updated_at: new Date().toISOString(),
      rehire: (Array.isArray(o.rehire) ? o.rehire : []).slice(0, 200).map(function (r) { return { user_id: r && r.user_id || null, name: t(r && r.name, 120), rehire: r && (r.rehire === "ja" || r.rehire === "nein") ? r.rehire : "vielleicht", note: t(r && r.note, 300) }; }) };
  }
  D.hotel.google_place_id = D.hotel.google_place_id || "ChIJdemoAlpenblick2026";
  D.hotel.sustainability_settings = cleanSust(D.hotel.sustainability_settings);
  D.hotel.investor_view = D.hotel.investor_view || { budget: true, risks: false, tasks: true };
  D.hotel.season_handover = D.hotel.season_handover || { updated_at: new Date(now.getTime() - 9 * 86400000).toISOString(),
    good: "Frühstück und Wellness wurden sehr gut bewertet. Der neue Dienstplan kam rechtzeitig.",
    bad: "Im August fehlten zwei Personen im Housekeeping, Reklamationen wegen Wartezeiten beim Check-in.",
    next: "Aufzugsprüfung vor Saisonstart erledigen, Poolreinigung beauftragen, Saisonkräfte bis Ende Februar zusagen.",
    rehire: [{ user_id: "u-ewa", name: "Ewa", rehire: "ja", note: "Sehr zuverlässig, gern wieder." }, { user_id: "u-fb", name: "F&B", rehire: "vielleicht", note: "" }] };
  D.hotel.guest_info = D.hotel.guest_info || {};
  D.hotel.guest_info.offers = D.hotel.guest_info.offers || [
    { key: "late-check-out", title: "Late Check-out bis 14 Uhr", note: "Je nach Verfügbarkeit, Bestätigung durch die Rezeption.", price: 25, needs_date: true },
    { key: "massage", title: "Massage 60 Minuten", note: "Im Wellnessbereich, bitte Wunschtermin angeben.", price: 95, needs_date: true }];

  D.guest_profiles = [
    { id: "gp-1", _email: "gast0@example.com", display_name: "Familie Weber", preferences: "Ruhiges Zimmer nach hinten, Federkissen, Frühstück laktosefrei.", consent_at: new Date(now.getTime() - 400 * 86400000).toISOString(), consent_source: "rezeption", updated_at: new Date(now.getTime() - 30 * 86400000).toISOString() },
    { id: "gp-2", _email: "gast2@example.com", display_name: "Lucía Romero", preferences: "Tee statt Kaffee aufs Zimmer, Spätanreise ist üblich.", consent_at: new Date(now.getTime() - 200 * 86400000).toISOString(), consent_source: "rezeption", updated_at: new Date(now.getTime() - 60 * 86400000).toISOString() }];
  function profileOut(p) { return { id: p.id, display_name: p.display_name, preferences: p.preferences, consent_at: p.consent_at, consent_source: p.consent_source, updated_at: p.updated_at }; }
  function arrivalOut(g) { var pr = D.guest_profiles.find(function (p) { return g.email && p._email === String(g.email).toLowerCase(); });
    return Object.assign({ vip: false, first_impression: {}, country: null, adults: null, children: null }, g, { profile: pr ? profileOut(pr) : null }); }
  [["DE", 2, 2], ["GB", 2, 0], ["ES", 2, 0], ["JP", 1, 0], ["TR", 2, 1], ["FR", 2, 0]].forEach(function (c, i) {
    var g = D.arrivals[i]; if (g) { g.country = c[0]; g.adults = c[1]; g.children = c[2]; g.vip = false; g.first_impression = {}; } });

  D.guest_orders = [
    { id: "go-1", room: "214", offer_key: "late-check-out", title: "Late Check-out bis 14 Uhr", price: 25, wish_date: add(todayIso, 1), note: "Spätflug, danke!", status: "offen", created_at: nowIso(3), decided_at: null, simulation: false },
    { id: "go-2", room: "305", offer_key: "massage", title: "Massage 60 Minuten", price: 95, wish_date: add(todayIso, 1), note: "Gern am Nachmittag.", status: "offen", created_at: nowIso(1), decided_at: null, simulation: false },
    { id: "go-3", room: "118", offer_key: "late-check-out", title: "Late Check-out bis 14 Uhr", price: 25, wish_date: todayIso, note: null, status: "bestätigt", created_at: nowIso(20), decided_at: nowIso(18), simulation: false }];

  D.sim = { total: 0 };
  var SIM_DEPTS = ["Housekeeping", "Technik", "Rezeption & Empfang", "Food & Beverage"];
  function simReport() {
    if (!D.sim.total) return { total: 0, departments: [] };
    var by = {}; for (var i = 0; i < D.sim.total; i++) { var d = SIM_DEPTS[i % 4]; (by[d] = by[d] || { department: d, total: 0, done: 0 }).total++; }
    var med = { "Housekeeping": 18, "Technik": 42, "Rezeption & Empfang": 9, "Food & Beverage": 26 };
    return { total: D.sim.total, departments: Object.keys(by).map(function (d) { var r = by[d], done = Math.max(0, r.total - (d === "Technik" ? 1 : 0)); return { department: d, total: r.total, done: done, median_minutes: done ? med[d] : null, slowest_minutes: done ? med[d] * 2 + 7 : null }; }) };
  }

  D.net_optin = { city: D.hotel.city || "Mayrhofen", departments: ["Housekeeping"], created_at: now.toISOString() };
  D.net_jobs = [
    { id: "nj-1", hotel_id: D.hotel.id, organization_id: "demo-org", department: "Housekeeping", job_date: add(todayIso, 4), start_time: "07:00:00", end_time: "13:00:00", city: D.hotel.city || "Mayrhofen", pay_note: "16 € pro Stunde", note: "Aushilfe für Zimmerreinigung, Einschulung vor Ort.", status: "offen", created_at: nowIso(30), hotel_name: D.hotel.name },
    { id: "nj-2", hotel_id: "other-hotel-1", organization_id: "other-org", department: "Housekeeping", job_date: add(todayIso, 6), start_time: "08:00:00", end_time: "14:00:00", city: D.hotel.city || "Mayrhofen", pay_note: "15,50 € pro Stunde", note: "Wochenende, Saisonstart.", status: "offen", created_at: nowIso(50), hotel_name: "Hotel Zillertalerhof" },
    { id: "nj-3", hotel_id: "other-hotel-2", organization_id: "other-org", department: "Housekeeping", job_date: add(todayIso, 9), start_time: "06:30:00", end_time: "12:30:00", city: D.hotel.city || "Mayrhofen", pay_note: "nach Vereinbarung", note: null, status: "offen", created_at: nowIso(70), hotel_name: "Gasthof Post" }];
  D.net_apps = [
    { id: "na-1", job_id: "nj-1", user_id: "u-ext-1", message: "Habe zwei Saisonen Erfahrung im Zimmerservice.", contact: "+43 664 555 0101", status: "offen", created_at: nowIso(12) },
    { id: "na-2", job_id: "nj-1", user_id: "u-ext-2", message: "", contact: "maria.h@example.com", status: "offen", created_at: nowIso(5) },
    { id: "na-3", job_id: "nj-3", user_id: ME, message: "", contact: "meine@example.com", status: "offen", created_at: nowIso(8) }];
  function jobOut(j) { var mine = D.net_apps.find(function (a) { return a.job_id === j.id && a.user_id === ME; }); return Object.assign({}, j, { my_application: mine ? mine.status : null }); }

  function mondayOf(s) { var d = new Date(s + "T00:00:00Z"), w = (d.getUTCDay() + 6) % 7; return add(s, -w); }
  D.apprentices = [{ id: "ap-1", organization_id: "demo-org", user_id: "u-member", person_name: null, trade: "Hotel- und Gastgewerbeassistent/in", start_date: add(todayIso, -420), end_date: add(todayIso, 675), trainer_user_id: "u-hkm",
    plan: [["Zimmerreinigung und Bettenmachen", -380], ["Wäschekreislauf und Lagerhaltung", -300], ["Hygiene und Reinigungsmittel", -210], ["Rezeption: Check-in und Check-out", null], ["Servieren und Abräumen im Frühstück", null], ["Gästebetreuung und Reklamationen", null]]
      .map(function (x) { return { item: x[0], done: x[1] != null, done_at: x[1] != null ? add(todayIso, x[1]) : null }; }), created_at: now.toISOString() }];
  D.apprentice_logs = [
    { id: "al-1", apprentice_id: "ap-1", week_start: mondayOf(add(todayIso, -7)), text: "Diese Woche Etage 2 gereinigt, Wäsche gezählt und das Minibar-Auffüllen gelernt.", trainer_feedback: "Gut gemacht, bitte noch auf die Reihenfolge beim Bettenmachen achten.", created_at: nowIso(24 * 6) },
    { id: "al-2", apprentice_id: "ap-1", week_start: mondayOf(add(todayIso, -14)), text: "Einschulung Reinigungswagen und Chemikalien (Sicherheitsdatenblätter).", trainer_feedback: null, created_at: nowIso(24 * 13) }];

  /* ===== Paket 040: Eröffnung & Einkauf, Team & Sicherheit, Gäste/Zimmer/Kasse (Beispieldaten, nur im Speicher) ===== */
  var HID = D.hotel.id, ORG = "demo-org";
  function dAt(n) { return add(todayIso, n); }
  function slugKey(s) { return String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "a"; }
  function cmpNum(a, c) { return String(a).localeCompare(String(c), "de", { numeric: true }); }
  var TINY_PDF = "data:application/pdf;base64," + btoa("%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 68>>stream\nBT /F1 14 Tf 20 60 Td (Beispiel-Beleg aus der Live-Demo) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\n%%EOF");

  // --- Hotel-Felder
  var WL_TOKEN = "DEMOwartelisteAlpenblick01";
  D.hotel.waitlist = { enabled: true, token: WL_TOKEN, headline: "Alpenblick eröffnet im Herbst – seien Sie als Erste dabei",
    text: "Tragen Sie sich ein und erfahren Sie als Erste, wann die Buchung startet. Wir melden uns einmal zur Eröffnung, mehr nicht.",
    offer: "Frühbucher-Angebot: 3 Nächte zum Preis von 2 in den ersten zwei Wochen nach der Eröffnung." };
  D.hotel.accessibility_info = { areas: {
    entrance: { step_free: true, automatic_door: true, note: "" }, parking: { accessible_spaces: true, near_entrance: false, note: "2 Plätze in der Tiefgarage, mit Aufzug zur Rezeption." },
    elevator: { available: true, wheelchair_size: true, note: "" }, restaurant: { step_free: true, accessible_table: false, note: "" },
    spa: { step_free: true, pool_lift: false, note: "" }, toilets: { accessible_public: true, note: "" } }, note: "Ein Rollstuhl steht an der Rezeption zum Verleih bereit.", saved: true };
  D.hotel.referral_settings = { bonus: 300, after_weeks: 4, note: "Die Prämie wird mit dem Gehalt nach der Probezeit ausbezahlt." };
  D.hotel.safety_settings = { min_first_aid: 2, min_fire: 1 };
  D.hotel.registration_settings = { enabled: true, require_id: false };
  D.hotel.queue_settings = { enabled: true, areas: ["Restaurant", "Spa", "Bar"], token: "DEMOwarteschlangeAlpenblick" };
  D.hotel.occasion_mail = { enabled: true, anniversary: true, birthday: true, offer: "10 % auf Ihre nächste Direktbuchung mit dem Code WIEDERSEHEN." };
  D.hotel.lost_found_shipping = { enabled: true, fee: 12.9, payment_link: "https://example.com/zahlung-beispiel", note: "Versand per Post innerhalb Europas, Fundsachen bewahren wir 3 Monate auf." };
  D.hotel.pos_settings = { enabled: true, token_hash: "demo-beispiel-pruefsumme", token_created_at: nowIso(24 * 9) };
  D.hotel.floor_settings = { kwh_per_floor_day: 180, price_kwh: 0.24 };

  // --- Zimmer: Barrierefreiheit (einige Zimmer ausgestattet)
  var ACC_FLAGS = ["step_free", "wide_door", "roll_in_shower", "grab_bars", "lowered_bed", "hearing_loop", "visual_alarm"];
  function cleanRoomAccess(a) { var o = a && typeof a === "object" ? a : {}, out = {}; ACC_FLAGS.forEach(function (k) { out[k] = o[k] === true; }); out.note = String(o.note || "").trim().slice(0, 300); return out; }
  D.rooms.forEach(function (r) { r.accessibility = cleanRoomAccess(null); });
  [["101", ["step_free", "wide_door", "roll_in_shower", "grab_bars"], "Nahe am Aufzug."], ["102", ["step_free", "wide_door", "roll_in_shower", "grab_bars", "lowered_bed"], ""],
    ["103", ["step_free", "wide_door", "grab_bars"], ""], ["201", ["step_free", "wide_door", "roll_in_shower", "grab_bars"], ""], ["202", ["hearing_loop", "visual_alarm"], "Für Gäste mit Hörbehinderung."]].forEach(function (x) {
    var rr = D.rooms.find(function (r) { return r.number === x[0]; }); if (!rr) return; x[1].forEach(function (k) { rr.accessibility[k] = true; }); rr.accessibility.note = x[2]; });
  function accAreas(info) {
    var def = { entrance: ["step_free", "automatic_door"], parking: ["accessible_spaces", "near_entrance"], elevator: ["available", "wheelchair_size"], restaurant: ["step_free", "accessible_table"], spa: ["step_free", "pool_lift"], toilets: ["accessible_public"] };
    var src = info && info.areas && typeof info.areas === "object" ? info.areas : {}, areas = {};
    Object.keys(def).forEach(function (a) { var x = src[a] && typeof src[a] === "object" ? src[a] : {}; areas[a] = {}; def[a].forEach(function (f) { areas[a][f] = x[f] === true; }); areas[a].note = String(x.note || "").trim().slice(0, 200); });
    return { areas: areas, note: String((info && info.note) || "").trim().slice(0, 1000), saved: !!(info && (info.saved === true || info.areas)) };
  }
  var ACC_TXT = {
    rooms: { de: { step_free: "stufenlos erreichbar", wide_door: "mit breiter Tür (mind. 90 cm)", roll_in_shower: "mit bodengleicher Dusche", grab_bars: "mit Haltegriffen im Bad", lowered_bed: "mit unterfahrbarem bzw. niedrigerem Bett", hearing_loop: "mit Höranlage (Induktion)", visual_alarm: "mit optischem Alarm" },
      en: { step_free: "with step-free access", wide_door: "with a wide door (at least 90 cm)", roll_in_shower: "with a roll-in shower", grab_bars: "with grab bars in the bathroom", lowered_bed: "with an accessible or lower bed", hearing_loop: "with a hearing loop", visual_alarm: "with a visual alarm" } },
    areas: { de: { "entrance.step_free": "Der Eingang ist stufenlos.", "entrance.automatic_door": "Die Eingangstür öffnet automatisch.", "parking.accessible_spaces": "Es gibt Behindertenparkplätze.", "parking.near_entrance": "Parkplätze liegen nahe am Eingang.", "elevator.available": "Ein Aufzug ist vorhanden.", "elevator.wheelchair_size": "Der Aufzug ist rollstuhlgerecht.", "restaurant.step_free": "Das Restaurant ist stufenlos erreichbar.", "restaurant.accessible_table": "Im Restaurant gibt es unterfahrbare Tische.", "spa.step_free": "Der Wellnessbereich ist stufenlos erreichbar.", "spa.pool_lift": "Am Pool gibt es einen Lift.", "toilets.accessible_public": "Es gibt eine öffentliche barrierefreie Toilette." },
      en: { "entrance.step_free": "The entrance is step-free.", "entrance.automatic_door": "The entrance door opens automatically.", "parking.accessible_spaces": "Accessible parking spaces are available.", "parking.near_entrance": "Parking is close to the entrance.", "elevator.available": "There is a lift.", "elevator.wheelchair_size": "The lift is wheelchair-accessible.", "restaurant.step_free": "The restaurant has step-free access.", "restaurant.accessible_table": "The restaurant has wheelchair-accessible tables.", "spa.step_free": "The spa has step-free access.", "spa.pool_lift": "There is a pool lift.", "toilets.accessible_public": "There is an accessible public toilet." } },
    ask: { de: "Bitte sprechen Sie uns vor der Buchung an – wir beschreiben Ihnen gern Maße und Wege genau.", en: "Please contact us before booking – we are happy to describe dimensions and routes in detail." },
    title: { de: "Barrierefreiheit", en: "Accessibility" }, none: { de: "Wir haben noch keine Zimmer mit besonderer Ausstattung für Gäste mit Behinderung.", en: "We do not yet have rooms with special equipment for guests with disabilities." } };
  function accPublic() {
    var info = accAreas(D.hotel.accessibility_info), counts = {}, text = {};
    ACC_FLAGS.forEach(function (k) { counts[k] = D.rooms.filter(function (r) { return r.accessibility && r.accessibility[k]; }).length; });
    ["de", "en"].forEach(function (l) {
      var rl = ACC_FLAGS.filter(function (k) { return counts[k] > 0; }).map(function (k) { return l === "de" ? counts[k] + " Zimmer " + ACC_TXT.rooms.de[k] : counts[k] + (counts[k] > 1 ? " rooms " : " room ") + ACC_TXT.rooms.en[k]; });
      var lines = [rl.length ? rl.join(", ") + "." : ACC_TXT.none[l]];
      Object.keys(info.areas).forEach(function (a) { Object.keys(info.areas[a]).forEach(function (f) { if (f !== "note" && info.areas[a][f]) lines.push(ACC_TXT.areas[l][a + "." + f]); }); });
      if (info.note) lines.push(info.note); lines.push(ACC_TXT.ask[l]);
      text[l] = ACC_TXT.title[l] + " – " + D.hotel.name + "\n" + lines.join("\n"); });
    return { rooms: counts, areas: info.areas, note: info.note, text: text };
  }

  // --- 1. Erstausstattung: 2 Zimmertypen, Etagen 1-3 vollständig montiert (= 60 %), Etage 4 geliefert, Etage 5 teilweise
  var EQ_STD = [["Föhn", 1], ["Bademantel", 2], ["Kleiderbügel", 8], ["TV-Fernbedienung", 1], ["Wasserkocher", 1], ["Zimmersafe", 1]];
  var EQ_SUITE = EQ_STD.map(function (x) { return x[0] === "Bademantel" ? [x[0], 4] : x[0] === "Kleiderbügel" ? [x[0], 12] : x; }).concat([["Kaffeemaschine", 1], ["Minibar-Kühlschrank", 1]]);
  function eqItems(list) { return list.map(function (x) { return { key: slugKey(x[0]), name: x[0], qty: x[1] }; }); }
  var EQ_TPL = [{ id: "eqt-1", hotel_id: HID, room_type: "Standard", items: eqItems(EQ_STD), updated_at: nowIso(24 * 8) }, { id: "eqt-2", hotel_id: HID, room_type: "Suite", items: eqItems(EQ_SUITE), updated_at: nowIso(24 * 8) }];
  function eqType(r) { return r.room_type || "Standard"; }
  function eqNeed(r) {
    var all = EQ_TPL.find(function (t) { return t.room_type === ""; }), own = EQ_TPL.find(function (t) { return t.room_type === eqType(r); }), mp = {}, out = [];
    (all ? all.items : []).concat(own ? own.items : []).forEach(function (it) { if (!(it.key in mp)) out.push(it.key); mp[it.key] = it; });
    return out.map(function (k) { return mp[k]; });
  }
  var EQ = {}, EQ_INSP = {};
  D.rooms.forEach(function (r) {
    var f = Number(r.floor) || 0, st = { room_id: r.id, hotel_id: HID, delivered: {}, installed: {}, note: null, updated_at: nowIso(24 * (7 - f)), updated_by: "u-hkm" };
    eqNeed(r).forEach(function (it, i) {
      var del = f <= 3 ? it.qty : f === 4 ? (i === 5 ? 0 : it.qty) : (i % 2 ? 0 : Math.ceil(it.qty / 2));
      if (del > 0) st.delivered[it.key] = del; if (f <= 3) st.installed[it.key] = true; });
    if (r.number === "214") st.note = "Safe-Code von Technik gesetzt.";
    EQ[r.id] = st;
    var n = Number(r.number);
    if (f <= 2) EQ_INSP[r.id] = { passed: true, created_at: nowIso(24 * 4) };
    else if (f === 3 && n <= 314) EQ_INSP[r.id] = { passed: true, created_at: nowIso(24 * 2) };
    else if (f === 3 && n >= 327) EQ_INSP[r.id] = { passed: false, created_at: nowIso(24) };
  });
  function lastInsp(roomId) {
    var a = D.room_insp.find(function (x) { return x.room_id === roomId; }), b = EQ_INSP[roomId];
    if (a && (!b || a.created_at >= b.created_at)) return { passed: a.passed, created_at: a.created_at };
    return b || null;
  }
  function eqView() {
    var arts = {}, floors = {}, need = 0, deliv = 0, inst = 0, ready = 0;
    var rooms = D.rooms.slice().sort(function (a, c) { return cmpNum(a.number, c.number); }).map(function (room) {
      var items = eqNeed(room), st = EQ[room.id] || {}, dv = st.delivered || {}, ins = st.installed || {}, rn = 0, rd = 0, ri = 0;
      var lines = items.map(function (it) {
        var d = Math.min(it.qty, Math.max(0, Math.round(Number(dv[it.key]) || 0))), mo = ins[it.key] === true ? it.qty : 0;
        rn += it.qty; rd += d; ri += mo;
        var a = arts[it.key] || (arts[it.key] = { key: it.key, name: it.name, need: 0, delivered: 0, installed: 0 }); a.need += it.qty; a.delivered += d; a.installed += mo;
        return { key: it.key, name: it.name, qty: it.qty, delivered: d, installed: mo > 0 }; });
      var last = lastInsp(room.id), complete = ri >= rn, isReady = complete && !!(last && last.passed);
      need += rn; deliv += rd; inst += ri; if (isReady) ready++;
      var fk = room.floor || "", fl = floors[fk] || (floors[fk] = { floor: fk, rooms: 0, need: 0, delivered: 0, installed: 0, ready: 0 });
      fl.rooms++; fl.need += rn; fl.delivered += rd; fl.installed += ri; if (isReady) fl.ready++;
      return { id: room.id, number: room.number, floor: room.floor, room_type: eqType(room), items: lines, note: st.note || null, updated_at: st.updated_at || null,
        need: rn, delivered: rd, installed: ri, complete: complete, inspection: last ? { passed: last.passed, at: last.created_at } : null, ready: isReady };
    });
    return { rooms: rooms, templates: EQ_TPL.slice(), summary: { rooms: rooms.length, ready: ready, need: need, delivered: deliv, installed: inst,
      floors: Object.keys(floors).map(function (k) { return floors[k]; }).sort(function (a, c) { return cmpNum(a.floor, c.floor); }),
      articles: Object.keys(arts).map(function (k) { var a = arts[k]; return Object.assign({}, a, { missing: a.need - a.delivered }); }).sort(function (a, c) { return a.name.localeCompare(c.name, "de"); }) } };
  }
  function cleanEqItems(raw) {
    var used = {}; return (Array.isArray(raw) ? raw : []).slice(0, 80).map(function (x) {
      var name = String((x && x.name) || "").trim().slice(0, 120); if (!name) return null;
      var key = slugKey(name), base = key, n = 2; while (used[key]) key = base.slice(0, 36) + "-" + n++; used[key] = 1;
      var qty = Math.round(Number(x.qty)); return { key: key, name: name, qty: qty >= 1 && qty <= 999 ? qty : 1 }; }).filter(Boolean);
  }

  // --- 2. Angebotsvergleich
  var QR = [
    { id: "qr-1", hotel_id: HID, title: "Matratzen und Lattenroste für 140 Zimmer", department: "Einkauf", budget_item_id: (D.budget[0] || {}).id || null, status: "offen", decided_quote_id: null, decision_reason: null, decided_by: null, decided_at: null, created_at: nowIso(24 * 6) },
    { id: "qr-2", hotel_id: HID, title: "Scheuersaugmaschine für das Housekeeping", department: "Housekeeping", budget_item_id: null, status: "entschieden", decided_quote_id: "qt-4", decision_reason: "Günstigster Preis bei kürzester Lieferzeit, Service vor Ort in Innsbruck.", decided_by: "u-admin", decided_at: nowIso(24 * 3), created_at: nowIso(24 * 12) }];
  var QT = [
    { id: "qt-1", request_id: "qr-1", supplier_id: null, supplier_name: "Schlafwelt Tirol", amount: 86400, currency: "EUR", delivery_days: 35, valid_until: dAt(20), note: "Inklusive Lieferung und Montage, 10 Jahre Garantie.", created_at: nowIso(24 * 5), has_file: true },
    { id: "qt-2", request_id: "qr-1", supplier_id: null, supplier_name: "Möbel Moser", amount: 79800, currency: "EUR", delivery_days: 49, valid_until: dAt(12), note: "Ohne Montage; Lieferzeit abhängig vom Werk.", created_at: nowIso(24 * 4), has_file: false },
    { id: "qt-3", request_id: "qr-1", supplier_id: null, supplier_name: "Hotelbetten Austria", amount: 92150, currency: "EUR", delivery_days: 21, valid_until: dAt(30), note: "Premium-Kaltschaum, Rücknahme der Altmatratzen inklusive.", created_at: nowIso(24 * 3), has_file: false },
    { id: "qt-4", request_id: "qr-2", supplier_id: null, supplier_name: "Reinigungstechnik Pichler", amount: 6480, currency: "EUR", delivery_days: 14, valid_until: dAt(-5), note: "", created_at: nowIso(24 * 10), has_file: false },
    { id: "qt-5", request_id: "qr-2", supplier_id: null, supplier_name: "Gastro Service Wagner", amount: 7120, currency: "EUR", delivery_days: 28, valid_until: dAt(-5), note: "", created_at: nowIso(24 * 10), has_file: false }];
  function quoteOut(x) { return Object.assign({}, x); }

  // --- 3. Eingangsrechnungen (eine mit Skonto bis morgen)
  var INV = [
    { id: "si-1", hotel_id: HID, supplier_id: "sp-1", supplier_name: "Textil Moser", invoice_number: "RE-2026-0412", amount: 4280, currency: "EUR", invoice_date: dAt(-12), due_on: dAt(18), skonto_percent: 2, skonto_until: dAt(1), paid_at: null, paid_by: null, budget_item_id: null, note: "Bettwäsche und Frottee, 2 % Skonto bei Zahlung bis morgen.", created_at: nowIso(24 * 11), has_file: true },
    { id: "si-2", hotel_id: HID, supplier_id: "sp-2", supplier_name: "GastroGroß", invoice_number: "2026-88213", amount: 8915.6, currency: "EUR", invoice_date: dAt(-33), due_on: dAt(-3), skonto_percent: null, skonto_until: null, paid_at: null, paid_by: null, budget_item_id: null, note: "Geschirr und Besteck Restaurant.", created_at: nowIso(24 * 30), has_file: false },
    { id: "si-3", hotel_id: HID, supplier_id: null, supplier_name: "Elektro Huber", invoice_number: "E-1187", amount: 2340, currency: "EUR", invoice_date: dAt(-14), due_on: dAt(9), skonto_percent: 2, skonto_until: dAt(-2), paid_at: null, paid_by: null, budget_item_id: null, note: "Leuchten Flur 3. Etage; Skonto verpasst.", created_at: nowIso(24 * 13), has_file: false },
    { id: "si-4", hotel_id: HID, supplier_id: null, supplier_name: "Sanitär Wagner", invoice_number: "SW-2026-203", amount: 1560, currency: "EUR", invoice_date: dAt(-25), due_on: dAt(-5), skonto_percent: null, skonto_until: null, paid_at: nowIso(24 * 6), paid_by: "u-admin", budget_item_id: null, note: "", created_at: nowIso(24 * 24), has_file: false }];

  // --- 4. Warteliste (23 Einträge)
  var WL_NAMES = ["Anna Hofer", "Thomas Gruber", "Familie Steiner", "Elena Rossi", "Martin Bauer", "Julia Winkler", "Peter Mayr", "Sophie Martin", "Lukas Brandstätter", "Claudia Pichler", "Henrik Larsen", "Mia Schneider",
    "Robert Fuchs", "Sarah Collins", "Katrin Egger", "Daniel Wolf", "Ines Moser", "Paul Leitner", "Nora Hartmann", "Felix Kaiser", "Laura Berger", "Markus Huber", "Eva Lindner"];
  var WL_LANG = ["de", "de", "de", "it", "de", "de", "de", "fr", "de", "de", "en", "de", "de", "en", "de", "de", "de", "de", "de", "de", "de", "de", "de"];
  var WL_SIGNUPS = WL_NAMES.map(function (nm, i) {
    var created = nowIso(24 * (30 - i) + (i * 5) % 11), conf = i % 8 !== 5;
    return { id: "wl-" + i, email: slugKey(nm).replace(/-/g, ".") + "@example.com", name: nm, language: WL_LANG[i], created_at: created,
      confirmed_at: conf ? created : null, notified_at: null, unsubscribed_at: i === 3 || i === 17 ? nowIso(24 * 4) : null };
  }).reverse();
  function waitlistUrl() { try { return new URL("warteliste.html?w=" + encodeURIComponent(D.hotel.waitlist.token), location.href).href; } catch (e) { return "warteliste.html?w=" + D.hotel.waitlist.token; } }
  function waitlistSettings() { var w = D.hotel.waitlist; return { enabled: !!w.enabled, headline: w.headline || "", text: w.text || "", offer: w.offer || "" }; }

  // --- 6. Ereignisse in der Stadt
  var CITY_EV = [
    { id: "ce-1", hotel_id: HID, title: "Innsbrucker Herbstmesse", start_date: dAt(6), end_date: dAt(9), impact: "hoch", note: "Hotels in der Stadt meist ausgebucht, Preise anheben.", created_at: nowIso(100) },
    { id: "ce-2", hotel_id: HID, title: "Konzert in der Olympiahalle", start_date: dAt(13), end_date: null, impact: "mittel", note: "Späte Anreisen, Frühstück verlängern.", created_at: nowIso(90) },
    { id: "ce-3", hotel_id: HID, title: "Christkindlmarkt Eröffnung", start_date: dAt(24), end_date: dAt(30), impact: "hoch", note: "", created_at: nowIso(80) },
    { id: "ce-4", hotel_id: HID, title: "Baustelle Maria-Theresien-Straße", start_date: dAt(3), end_date: dAt(16), impact: "niedrig", note: "Anfahrt über die Museumstraße empfehlen.", created_at: nowIso(70) }];

  // --- Team: Stellenanzeigen, Bewerbungen, Probezeit, Qualifikationen
  var posRez = (D.staff.find(function (s) { return s.department === "Rezeption & Empfang"; }) || D.staff[0] || {}).id;
  var posHk = (D.staff.find(function (s) { return s.department === "Housekeeping"; }) || D.staff[0] || {}).id;
  var JOBS = [
    { id: "jp-1", hotel_id: HID, organization_id: ORG, title: "Rezeptionist:in", department: "Rezeption & Empfang", employment: "Vollzeit", start_date: D.hotel.opening_date, salary_note: "Kollektivvertragliches Mindestentgelt ab 2.450 € brutto monatlich, Überzahlung je nach Erfahrung möglich.", status: "Veröffentlicht", public_token: "DEMOjobRezeptionAlpenblick1",
      description: "Du bist die erste Ansprechperson unserer Gäste: Check-in und Check-out, Reservierungen, Auskünfte und kleine Wünsche.\n\nDas bringst du mit:\n- Freude am Umgang mit Menschen\n- Gute Deutsch- und Englischkenntnisse\n- Erfahrung mit einem Hotel-PMS ist von Vorteil\n\nDas bieten wir:\n- Ein neues Haus und ein junges Team\n- Geregelte Dienstpläne mit zwei freien Tagen pro Woche\n- Mitarbeiterverpflegung und Einschulung", created_at: nowIso(24 * 20) },
    { id: "jp-2", hotel_id: HID, organization_id: ORG, title: "Zimmerreinigung (Saison)", department: "Housekeeping", employment: "Saison", start_date: D.hotel.opening_date, salary_note: "Ab 2.150 € brutto monatlich laut Kollektivvertrag.", status: "Veröffentlicht", public_token: "DEMOjobHousekeepingAlpenbl2",
      description: "Du sorgst dafür, dass sich unsere Gäste vom ersten Moment an wohlfühlen: Zimmer reinigen, Betten machen, Wäsche versorgen.\n\nWir freuen uns über Erfahrung, sind aber auch offen für Quereinsteiger:innen. Einschulung am Haus.", created_at: nowIso(24 * 18) }];
  var CVDATA = TINY_PDF;
  var APPS = [
    { id: "ap-1", hotel_id: HID, position_id: posRez, posting_id: "jp-1", name: "Katharina Gruber", email: "k.gruber@example.com", phone: null, stage: "Eingegangen", note: "Drei Jahre Rezeption im Stadthotel, sucht Veränderung.", source: "Website", interview_at: null, referred_by: null, referral_bonus: null, referral_paid_at: null, consent_at: nowIso(30), created_at: nowIso(30), updated_at: nowIso(30), cv: true },
    { id: "ap-2", hotel_id: HID, position_id: posRez, posting_id: "jp-1", name: "Luka Horvat", email: "luka.horvat@example.com", phone: "+43 660 555 0142", stage: "Gespräch", note: "Spricht fünf Sprachen.", source: "Website", interview_at: null, referred_by: null, referral_bonus: null, referral_paid_at: null, consent_at: nowIso(100), created_at: nowIso(100), updated_at: nowIso(60), cv: true },
    { id: "ap-3", hotel_id: HID, position_id: posHk, posting_id: "jp-2", name: "Sofia Marin", email: null, phone: "+43 664 555 0177", stage: "Eingegangen", note: "", source: "Empfehlung", interview_at: null, referred_by: "u-member", referral_bonus: null, referral_paid_at: null, consent_at: null, created_at: nowIso(48), updated_at: nowIso(48), cv: false },
    { id: "ap-4", hotel_id: HID, position_id: posHk, posting_id: "jp-2", name: "Jonas Berger", email: "jonas.berger@example.com", phone: null, stage: "Angebot", note: "Kann ab dem ersten Tag starten.", source: "Website", interview_at: null, referred_by: null, referral_bonus: null, referral_paid_at: null, consent_at: nowIso(200), created_at: nowIso(200), updated_at: nowIso(24), cv: false },
    { id: "ap-5", hotel_id: HID, position_id: posHk, posting_id: "jp-2", name: "Aylin Demir", email: "aylin.demir@example.com", phone: null, stage: "Zusage", note: "Zusage mündlich erteilt.", source: "Empfehlung", interview_at: null, referred_by: "u-ewa", referral_bonus: 300, referral_paid_at: null, consent_at: null, created_at: nowIso(24 * 25), updated_at: nowIso(24 * 21), cv: false }];
  APPS[1].interview_at = new Date(now.getTime() + 20 * 3600000).toISOString();
  function appOut(a) { var o = {}; Object.keys(a).forEach(function (k) { if (k !== "cv") o[k] = a[k]; }); o.has_cv = !!a.cv; return o; }
  function hrNow() { return ROLE === "admin" || (ROLE === "manager" && MYDEPTS.indexOf("Personal") >= 0); }

  var PROB = [
    { id: "pr-1", hotel_id: HID, organization_id: ORG, user_id: "u-ewa", week: 1, due_on: dAt(-22), done_at: nowIso(24 * 22), done_by: "u-hkm", rating: "gut", notes: "Findet sich schnell zurecht, gutes Verhältnis im Team." },
    { id: "pr-2", hotel_id: HID, organization_id: ORG, user_id: "u-ewa", week: 2, due_on: dAt(-15), done_at: nowIso(24 * 15), done_by: "u-hkm", rating: "gut", notes: "Etagenwagen sicher im Griff. Wunsch: mehr Einschulung zur Wäscheausgabe." },
    { id: "pr-3", hotel_id: HID, organization_id: ORG, user_id: "u-ewa", week: 4, due_on: dAt(-1), done_at: null, done_by: null, rating: null, notes: null },
    { id: "pr-4", hotel_id: HID, organization_id: ORG, user_id: "u-it", week: 1, due_on: dAt(-7), done_at: nowIso(24 * 7), done_by: "u-admin", rating: "in Ordnung", notes: "Technisch stark, Abstimmung mit der Rezeption noch holprig." },
    { id: "pr-5", hotel_id: HID, organization_id: ORG, user_id: "u-it", week: 2, due_on: dAt(0), done_at: null, done_by: null, rating: null, notes: null },
    { id: "pr-6", hotel_id: HID, organization_id: ORG, user_id: "u-it", week: 4, due_on: dAt(14), done_at: null, done_by: null, rating: null, notes: null }];
  var QUALS = [
    { id: "ql-1", organization_id: ORG, user_id: "u-fo", kind: "Erste Hilfe", valid_until: dAt(300), note: "Kurs Rotes Kreuz, 16 Stunden" },
    { id: "ql-2", organization_id: ORG, user_id: "u-hkm", kind: "Erste Hilfe", valid_until: dAt(25), note: "" },
    { id: "ql-3", organization_id: ORG, user_id: "u-hkm", kind: "Brandschutz", valid_until: dAt(400), note: "Brandschutzbeauftragte Etage 1-3" },
    { id: "ql-4", organization_id: ORG, user_id: "u-fb", kind: "Erste Hilfe", valid_until: dAt(-10), note: "Auffrischung nötig" },
    { id: "ql-5", organization_id: ORG, user_id: "u-it", kind: "Brandschutz", valid_until: dAt(180), note: "" },
    { id: "ql-6", organization_id: ORG, user_id: "u-fb", kind: "Hygiene", valid_until: dAt(500), note: "HACCP-Schulung Küche" }];
  function qualSet(day) { var map = {}; QUALS.forEach(function (q) { if ((q.kind === "Erste Hilfe" || q.kind === "Brandschutz") && (!q.valid_until || q.valid_until >= day)) (map[q.user_id] = map[q.user_id] || {})[q.kind] = true; }); return map; }

  // --- Rollenspiel: feste Beispielverläufe, keine KI
  var RP_FEEDBACK = { zusammenfassung: "Beispiel-Rückmeldung (fest hinterlegt, keine KI-Auswertung): Du bist freundlich und ruhig geblieben und hast dich für die Unannehmlichkeit entschuldigt. Noch besser wird das Gespräch, wenn du eine konkrete Lösung mit Uhrzeit anbietest.",
    staerken: ["Freundlicher Einstieg mit Entschuldigung", "Ruhiger Ton, auch als der Gast ungeduldig wurde", "Du hast nachgefragt, was dem Gast am wichtigsten ist"],
    verbesserungen: ["Eine konkrete Lösung mit Uhrzeit nennen (z. B. „bis 15 Uhr“)", "Den Namen des Gastes öfter verwenden", "Am Ende kurz zusammenfassen, was vereinbart wurde"], punktzahl: 7,
    musterformulierungen: [{ situation: "Entschuldigung und Lösung", formulierung: "Das tut mir wirklich leid, Frau Berger. Ich kümmere mich sofort darum und gebe Ihnen bis 15 Uhr persönlich Bescheid." }, { situation: "Abschluss", formulierung: "Damit ich sichergehe: Wir tauschen das Zimmer heute Nachmittag, und ich rufe Sie auf Ihrem Zimmer an, sobald es fertig ist." }] };
  var RP_OPEN = { de: { laerm: "Entschuldigung, ich habe heute Nacht kaum geschlafen. Im Nebenzimmer war bis drei Uhr laute Musik. So geht das nicht.", ueberbuchung: "Guten Abend, ich habe ein bestätigtes Zimmer für drei Nächte – und Sie sagen mir, es ist keines frei?", zimmer: "Hallo, wir sind schon da. Das Zimmer ist doch sicher fertig? Wir kommen direkt vom Flughafen und sind müde.", sonderwunsch: "Wir feiern morgen unseren 25. Hochzeitstag. Können Sie uns ein kleines Abendessen auf dem Zimmer organisieren?", rechnung: "Auf meiner Rechnung stehen Minibar-Artikel, die ich nie angerührt habe, und eine Nacht zu viel.", vip: "Ich komme seit zehn Jahren zu Ihnen, und diesmal bekomme ich ein Zimmer zur Straße? Wo ist mein gewohntes Zimmer?" },
    en: { laerm: "Excuse me, I hardly slept last night. There was loud music next door until three in the morning. This is not acceptable.", ueberbuchung: "Good evening, I have a confirmed room for three nights – and you tell me there is none available?", zimmer: "Hello, we are here already. The room is surely ready? We came straight from the airport and are tired.", sonderwunsch: "We celebrate our 25th wedding anniversary tomorrow. Could you arrange a small dinner in our room?", rechnung: "My bill shows minibar items I never touched, and one night too many.", vip: "I have been coming here for ten years, and this time I get a room facing the street? Where is my usual room?" } };
  var RP_NEXT = { de: ["Hm, das klingt schon besser. Und was genau können Sie jetzt konkret für mich tun?", "Okay, das ist ein Anfang. Bis wann ist das erledigt?", "Gut, das beruhigt mich. Danke, dass Sie sich Zeit genommen haben."],
    en: ["Hm, that sounds better. What exactly can you do for me now?", "Okay, that is a start. By when will it be done?", "Good, that reassures me. Thank you for taking the time."] };
  function rpLang(l) { return l === "en" ? "en" : "de"; }
  var RP = [
    { id: "rp-1", hotel_id: HID, user_id: ME, scenario: "laerm", language: "de", score: 7, finished_at: nowIso(24 * 2), created_at: nowIso(24 * 2 + 1), feedback: RP_FEEDBACK,
      transcript: [{ role: "guest", text: "(Beispielgast aus der Demo, keine KI) " + RP_OPEN.de.laerm }, { role: "staff", text: "Das tut mir sehr leid, dass Sie so schlecht geschlafen haben. Darf ich fragen, welches Zimmer Sie haben?" }, { role: "guest", text: RP_NEXT.de[0] },
        { role: "staff", text: "Ich sehe nach, ob wir Sie heute in ein ruhigeres Zimmer auf der anderen Seite des Hauses umquartieren können." }, { role: "guest", text: RP_NEXT.de[1] }, { role: "staff", text: "Ich melde mich bis 15 Uhr bei Ihnen." }, { role: "guest", text: RP_NEXT.de[2] }] },
    { id: "rp-2", hotel_id: HID, user_id: "u-ewa", scenario: "zimmer", language: "de", score: 8, finished_at: nowIso(24 * 4), created_at: nowIso(24 * 4 + 1), feedback: Object.assign({}, RP_FEEDBACK, { punktzahl: 8 }), transcript: [{ role: "guest", text: "(Beispielgast aus der Demo, keine KI) " + RP_OPEN.de.zimmer }] },
    { id: "rp-3", hotel_id: HID, user_id: "u-hkm", scenario: "rechnung", language: "de", score: 5, finished_at: nowIso(24 * 6), created_at: nowIso(24 * 6 + 1), feedback: Object.assign({}, RP_FEEDBACK, { punktzahl: 5 }), transcript: [{ role: "guest", text: "(Beispielgast aus der Demo, keine KI) " + RP_OPEN.de.rechnung }] }];

  // --- Gäste: Anreisen heute (für Zimmerverteilung), Meldeschein bei 2 Anreisen
  [["Familie Berger", "de", "Superior", false, "15:30"], ["Dr. Hannah Weiss", "en", null, true, "13:00"], ["Marco Ricci", "it", "Deluxe", false, "19:45"], ["Yuki Tanaka", "ja", "Superior", false, "21:10"]].forEach(function (g, i) {
    D.arrivals.push({ id: "ar-t" + i, hotel_id: HID, organization_id: ORG, guest_name: g[0], language: g[1], arrival_date: todayIso, departure_date: add(todayIso, 2 + i), email: null, room_type: g[2], source: "pms", mail_sent_at: null,
      answered_at: null, eta: g[4], extras: [], guest_note: null, vip: g[3], adults: 2, children: 0, country: ["AT", "GB", "IT", "JP"][i], assigned_room: null, first_impression: {} }); });
  (function () {
    var w = D.arrivals[0], c = D.arrivals[1];
    Object.assign(w, { has_registration: true, birth_date: "1984-03-12", nationality: "DE", street: "Lindenstraße 14", zip: "80331", city: "München", address_country: "DE", id_doc_type: null, id_doc_number: null, registration_at: nowIso(20),
      companions: [{ name: "Anja Weber", birth_date: "1986-07-02", nationality: "DE" }, { name: "Mia Weber", birth_date: "2015-05-20", nationality: "DE" }, { name: "Ben Weber", birth_date: "2018-01-09", nationality: "DE" }] });
    Object.assign(c, { has_registration: true, birth_date: "1979-11-30", nationality: "GB", street: "14 Mill Lane", zip: "OX2 6AE", city: "Oxford", address_country: "GB", id_doc_type: "Reisepass", id_doc_number: "5321****", registration_at: nowIso(5), companions: [{ name: "James Collins", birth_date: "1977-02-14", nationality: "GB" }] });
  })();

  // --- Warteschlange Restaurant/Spa (3 Gäste)
  var QUEUE = [
    { id: "gq-1", area: "Restaurant", name: "Familie Hofmann", party_size: 4, note: "Kinderstuhl bitte", status: "wartet", called_at: null, done_at: null, created_at: nowIso(0.5) },
    { id: "gq-2", area: "Spa", name: "Herr Lindgren", party_size: 2, note: "", status: "wartet", called_at: null, done_at: null, created_at: nowIso(0.3) },
    { id: "gq-3", area: "Restaurant", name: "Frau Okafor", party_size: 2, note: "Tisch am Fenster", status: "aufgerufen", called_at: nowIso(0.05), done_at: null, created_at: nowIso(0.8) }];

  // --- Fundsachen-Rückversand (eine Anfrage mit Adresse, wartet auf Zahlung)
  var SHIP = {};
  if (D.lost_found[0]) SHIP[D.lost_found[0].id] = { ship_status: "angefragt", ship_token: "DEMOfundsacheVersand0001", ship_fee: 12.9, ship_requested_at: nowIso(20), paid_confirmed_at: null, shipped_at: null, tracking: null, guest_name: "Herr Brandt", guest_contact: "brandt@example.com",
    ship_address: { lang: "de", name: "Stefan Brandt", street: "Hauptstraße 7", zip: "70173", city: "Stuttgart", country: "DE", phone: "+49 711 555 0100" } };
  function shipOut(x) { var s = SHIP[x.id] || {}; return { id: x.id, hotel_id: HID, organization_id: ORG, description: x.description, found_on: x.found_on, guest_name: s.guest_name || x.guest_name || null, guest_contact: s.guest_contact || x.guest_contact || null, has_photo: !!x.has_photo, status: x.status,
    ship_status: s.ship_status || null, ship_address: s.ship_address || null, ship_fee: s.ship_fee == null ? null : s.ship_fee, ship_requested_at: s.ship_requested_at || null, paid_confirmed_at: s.paid_confirmed_at || null, shipped_at: s.shipped_at || null, tracking: s.tracking || null,
    link: s.ship_token ? "fundsache.html?t=" + s.ship_token : null }; }

  // --- Zimmer-Lebenslauf und Problemzimmer: ältere, erledigte Meldungen und Abnahmen (nur für diese Auswertung)
  function hoursAgoIso(h) { return new Date(now.getTime() - h * 3600000).toISOString(); }
  var HIST_T = [["214", "Klimagerät tropft", 24 * 21, "Normal"], ["214", "TV findet keine Sender", 24 * 33, "Normal"], ["214", "Duschkopf verkalkt", 24 * 52, "Normal"], ["214", "Tür schließt nicht richtig", 24 * 70, "Dringend"],
    ["305", "Wasserschaden Decke", 24 * 12, "Dringend"], ["305", "Heizkörper kalt", 24 * 29, "Normal"], ["305", "Fenster klemmt", 24 * 61, "Normal"], ["118", "Glühbirne Bad defekt", 24 * 15, "Normal"], ["226", "Minibar zu warm", 24 * 40, "Normal"]]
    .map(function (x, i) { return { id: "ht-" + i, location: "Zimmer " + x[0], title: x[1], status: "Erledigt", priority: x[3], created_at: hoursAgoIso(x[2]), done_at: hoursAgoIso(x[2] - 20) }; });
  var HIST_INSP = [["214", true, 24 * 40, "Alles in Ordnung."], ["214", false, 24 * 18, "Teppich fleckig."], ["305", false, 24 * 11, "Feuchter Fleck an der Decke."]]
    .map(function (x, i) { var rm = D.rooms.find(function (r) { return r.number === x[0]; }) || {}; return { id: "hi-" + i, room_id: rm.id, passed: x[1], created_at: hoursAgoIso(x[2]), note: x[3], inspector: "u-hkm" }; });
  function mentionsRoom(text, number) { var n = String(number || "").trim(); if (!n) return false; return new RegExp("(^|[^0-9A-Za-z])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^0-9A-Za-z]|$)", "i").test(String(text || "")); }
  function allTickets() { return D.tickets.map(function (t) { return { id: t.id, location: t.location, title: t.title, status: t.status, priority: t.priority, created_at: t.created_at, done_at: t.done_at || null }; }).concat(HIST_T); }

  // --- Kassenumsätze: 14 Tage, Restaurant und Bar
  var POS = [];
  (function () {
    var base = [3100, 2650, 2800, 3300, 3900, 5200, 4800];
    for (var d = 13; d >= 0; d--) {
      var day = dAt(-d), wd = new Date(day + "T00:00:00Z").getUTCDay(), k = (d * 37) % 11;
      var g1 = Math.round((base[wd] * (0.92 + k / 60)) * 100) / 100, n1 = Math.round(g1 / 1.13 * 100) / 100, c1 = Math.round(g1 * (0.2 + (k % 4) / 40) * 100) / 100;
      POS.push({ id: "pos-r" + d, sale_date: day, outlet: "Restaurant", net: n1, gross: g1, tax: Math.round((g1 - n1) * 100) / 100, cash: c1, card: Math.round((g1 - c1) * 100) / 100, covers: Math.round(g1 / 36), source: "api", created_at: nowIso(d * 24) });
      var g2 = Math.round((base[wd] * (0.3 + k / 80)) * 100) / 100, n2 = Math.round(g2 / 1.2 * 100) / 100, c2 = Math.round(g2 * 0.35 * 100) / 100;
      POS.push({ id: "pos-b" + d, sale_date: day, outlet: "Bar", net: n2, gross: g2, tax: Math.round((g2 - n2) * 100) / 100, cash: c2, card: Math.round((g2 - c2) * 100) / 100, covers: null, source: "api", created_at: nowIso(d * 24) });
    }
  })();
  function cleanPosRow(s) {
    var o = s && typeof s === "object" ? s : {}, date = String(o.date != null ? o.date : o.sale_date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ungültiges Datum (JJJJ-MM-TT).");
    var row = { sale_date: date, outlet: String(o.outlet || "").replace(/[<>]/g, "").trim().slice(0, 60) };
    ["net", "gross", "tax", "cash", "card"].forEach(function (k) { var v = o[k]; if (v === "" || v == null) { row[k] = null; return; } var n = typeof v === "number" ? v : Number(String(v).replace(/[\s€$]/g, "").replace(/\./g, "").replace(",", "."));
      if (!isFinite(n)) throw new Error("Ungültiger Betrag: " + k); row[k] = Math.round(n * 100) / 100; });
    var cv = o.covers === "" || o.covers == null ? null : Number(o.covers); if (cv !== null && !(cv >= 0)) throw new Error("Ungültige Anzahl Couverts."); row.covers = cv === null ? null : Math.round(cv);
    if (row.gross === null && row.net === null) throw new Error("Bitte Netto- oder Bruttoumsatz angeben.");
    return row;
  }

  // --- Etagen-Vorschlag und Reinigungs-Reihenfolge (gleiche Regeln wie der Server)
  function floorOfR(r) { var f = r.floor; if (!f) { var mt = String(r.number).match(/^(\d+)/); f = mt && mt[1].length >= 3 ? String(Number(mt[1].slice(0, mt[1].length - 2))) : null; } return String(f || "?"); }
  function sameTypeR(room, arr) { return !arr.room_type || !room.room_type || String(room.room_type).trim().toLowerCase() === String(arr.room_type).trim().toLowerCase(); }
  function floorPlanAssign(rooms, arrivals) {
    var usable = rooms.filter(function (r) { return r.status !== "Außer Betrieb"; }), byNumber = {}; usable.forEach(function (r) { byNumber[String(r.number)] = r; });
    var busy = usable.filter(function (r) { return r.occupancy === "Belegt" || r.occupancy === "Anreise"; }), open = {}, taken = {};
    busy.forEach(function (r) { open[floorOfR(r)] = 1; taken[String(r.number)] = 1; });
    var out = [], unassigned = [], rest = [];
    arrivals.forEach(function (a) {
      var r = a.assigned_room && byNumber[String(a.assigned_room)];
      if (r && !taken[String(r.number)]) { taken[String(r.number)] = 1; open[floorOfR(r)] = 1;
        out.push({ arrival_id: a.id, guest_name: a.guest_name, vip: !!a.vip, room_type: a.room_type || null, assigned_room: String(r.number), floor: floorOfR(r), kept: true, needs_cleaning: ["Sauber", "Kontrolliert"].indexOf(r.status) < 0 }); }
      else rest.push(a); });
    var clean = function (r) { return r.occupancy === "Unbelegt" && ["Sauber", "Kontrolliert"].indexOf(r.status) >= 0; }, later = function (r) { return r.occupancy === "Unbelegt" || r.occupancy === "Abreise"; };
    rest.sort(function (a, c) { return (c.vip ? 1 : 0) - (a.vip ? 1 : 0) || String(a.eta || "99").localeCompare(String(c.eta || "99")) || String(a.guest_name || "").localeCompare(String(c.guest_name || "")); });
    rest.forEach(function (a) {
      var pick = null;
      [clean, later].some(function (okf) {
        var cand = usable.filter(function (r) { return okf(r) && !taken[String(r.number)] && sameTypeR(r, a); }); if (!cand.length) return false;
        var pool = cand.filter(function (r) { return open[floorOfR(r)]; });
        if (!pool.length) { var count = {}; cand.forEach(function (r) { count[floorOfR(r)] = (count[floorOfR(r)] || 0) + 1; });
          var fl = Object.keys(count).sort(function (x, y) { return a.vip ? cmpNum(y, x) : count[y] - count[x] || cmpNum(x, y); }); pool = cand.filter(function (r) { return floorOfR(r) === fl[0]; }); }
        pool.sort(function (x, y) { return (a.vip ? cmpNum(floorOfR(y), floorOfR(x)) : cmpNum(floorOfR(x), floorOfR(y))) || cmpNum(x.number, y.number); });
        pick = { r: pool[0], needs_cleaning: okf === later && !clean(pool[0]) }; return true; });
      if (!pick) { unassigned.push({ arrival_id: a.id, guest_name: a.guest_name, vip: !!a.vip, room_type: a.room_type || null }); return; }
      taken[String(pick.r.number)] = 1; open[floorOfR(pick.r)] = 1;
      out.push({ arrival_id: a.id, guest_name: a.guest_name, vip: !!a.vip, room_type: a.room_type || null, assigned_room: String(pick.r.number), floor: floorOfR(pick.r), kept: false, needs_cleaning: pick.needs_cleaning }); });
    var fls = {}; usable.forEach(function (r) { fls[floorOfR(r)] = 1; });
    var floors = Object.keys(fls).sort(cmpNum).map(function (f) { return { floor: f, rooms: usable.filter(function (r) { return floorOfR(r) === f; }).length, used: usable.filter(function (r) { return floorOfR(r) === f && taken[String(r.number)]; }).length }; });
    return { assignments: out, unassigned: unassigned, floors: floors, empty_floors: floors.filter(function (f) { return f.used === 0; }).map(function (f) { return f.floor; }) };
  }
  function cleaningOrderList() {
    var arr = {}; D.arrivals.filter(function (a) { return a.arrival_date === todayIso && a.assigned_room; }).forEach(function (a) { var k = String(a.assigned_room), cur = arr[k];
      if (!cur || (a.vip && !cur.vip) || (!!a.vip === !!cur.vip && String(a.eta || "99") < String(cur.eta || "99"))) arr[k] = a; });
    var dep = {}; D.arrivals.filter(function (a) { return a.departure_date === todayIso && a.assigned_room; }).forEach(function (a) { dep[String(a.assigned_room)] = 1; });
    var list = D.rooms.filter(function (r) { return r.status === "Schmutzig" || r.status === "In Reinigung"; }).map(function (r) {
      var n = String(r.number), a = arr[n], isArr = !!a || r.occupancy === "Anreise", isDep = r.occupancy === "Abreise" || !!dep[n], prio = isArr ? 0 : isDep ? 1 : r.occupancy === "Belegt" ? 3 : 2;
      var eta = a && /^\d{1,2}:\d{2}/.test(String(a.eta || "")) ? String(a.eta).slice(0, 5).padStart(5, "0") : null, vip = !!(a && a.vip);
      return { id: r.id, number: n, floor: floorOfR(r), status: r.status, occupancy: r.occupancy, assigned_to: r.assigned_to || null, prio: prio, reason: { kind: ["anreise", "abreise", "frei", "bleibe"][prio], eta: eta, vip: vip, departure: isArr && isDep },
        text: "", _vip: vip, _eta: eta || "99:99" }; });
    list.sort(function (x, y) { return x.prio - y.prio || (x.prio === 0 ? (y._vip ? 1 : 0) - (x._vip ? 1 : 0) || x._eta.localeCompare(y._eta) : 0) || cmpNum(x.floor, y.floor) || cmpNum(x.number, y.number); });
    return list.map(function (r, i) { var o = Object.assign({}, r, { order: i + 1 }); delete o._vip; delete o._eta;
      o.text = r.prio === 0 ? ["Anreise" + (r.reason.eta ? " " + r.reason.eta : " heute"), r.reason.vip ? "VIP" : "", r.reason.departure ? "nach Abreise" : ""].filter(Boolean).join(", ") : r.prio === 1 ? "Abreise" : r.prio === 3 ? "Bleibe" : "Schmutzig, unbelegt"; return o; });
  }

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
    if (p === "/api/hotels/" + D.hotel.id && m === "PATCH") { if (b.breakfast_settings !== undefined) b = Object.assign({}, b, { breakfast_settings: cleanBf(b.breakfast_settings) });
      if (b.season_handover !== undefined) b = Object.assign({}, b, { season_handover: cleanHandover(b.season_handover) });
      if (b.sustainability_settings !== undefined) b = Object.assign({}, b, { sustainability_settings: cleanSust(b.sustainability_settings) });
      if (b.investor_view !== undefined) { var iv0 = b.investor_view || {}; b = Object.assign({}, b, { investor_view: { budget: iv0.budget === true, risks: iv0.risks === true, tasks: iv0.tasks === true } }); }
      if (b.google_place_id !== undefined) { var gp0 = String(b.google_place_id || "").trim(); if (gp0 && !/^[A-Za-z0-9_-]{10,200}$/.test(gp0)) return ok({ error: "Die Google-Place-ID sieht ungültig aus." }, 400); b = Object.assign({}, b, { google_place_id: gp0 || null }); }
      Object.assign(D.hotel, b); return ok(D.hotel); }
    if (p === "/api/organizations/demo-org/members") return ok(D.members.map(function (x) { return Object.assign({ joined_at: D.hotel.created_at }, x); }));
    if (p === "/api/organizations/demo-org/my-role") return ok({ is_admin: ROLE === "admin" });
    if (p === "/api/organizations/demo-org/invites") return ok([]);
    if (p === "/api/invites") return ok({ id: nid("i"), email: b.email, role: b.role, status: "ausstehend", token: "demo", email_sent: false });
    if (p === "/api/organizations/demo-org/billing") return ok({ plan: "trial", plan_name: "Testphase", status: "trialing", active: true, trial_days_left: 14, trial_ends_at: add(todayIso, 14),
      hotel_limit: 1, hotel_count: 1, can_add_hotel: false, has_customer: false, stripe_enabled: false, ai_enabled: true, currencies: ["EUR"],
      has_subscription: false, billing_interval: "month", extra_hotels: 0, season_months: [], paused: false, addons: [],
      addon_offers: [{ key: "ki", name: "KI-Paket", monthlyEur: 49, monthly: { EUR: 49 } }],
      plans: [{ key: "starter", name: "Starter", hotels: 1, monthlyEur: 299, monthly: { EUR: 299 }, available: false, features: ["1 Hotel-Eröffnung", "Unbegrenzt viele Teammitglieder"] },
              { key: "professional", name: "Professional", hotels: 5, monthlyEur: 790, monthly: { EUR: 790 }, available: false, features: ["Bis zu 5 Hotel-Eröffnungen gleichzeitig", "Alles aus Starter"] }] });
    if (p === "/api/organizations/demo-org/template-packs") return ok([
      { key: "saisonstart", title: "Saisonstart", description: "Wiedereröffnung nach der Zwischensaison: Personal, Technik, Housekeeping, Küche und Vertrieb.", priceEur: 99, tasks: 33, checklists: 2, purchased: true },
      { key: "wellness", title: "Wellness & Spa eröffnen", description: "Abnahmen, Wasser- und Saunatechnik, Behandlungen, Personal und Hygieneplan.", priceEur: 99, tasks: 28, checklists: 2, purchased: false },
      { key: "haccp", title: "HACCP-Grundausstattung", description: "Gefahrenanalyse, Reinigungsplan, Temperaturen, Allergene und Schulungen für die Küche.", priceEur: 99, tasks: 21, checklists: 3, purchased: false }]);
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
    if (p === H + "/documents") return ok(lead ? D.docs : []);
    // Lieferanten und Bestellungen
    if (p === H + "/suppliers") { if (m === "POST") { var sp = Object.assign({ id: nid("sp"), hotel_id: D.hotel.id }, b); D.suppliers.push(sp); return ok(sp); } return ok(D.suppliers); }
    if ((mm = p.match(/^\/api\/suppliers\/([^/]+)$/))) { if (m === "DELETE") { remove(D.suppliers, mm[1]); return ok({ ok: true }); } var sp2 = byId(D.suppliers, mm[1]); Object.assign(sp2, b); return ok(sp2); }
    if ((mm = p.match(/^\/api\/stock\/([^/]+)\/ordering$/))) { var st = byId(D.stock || [], mm[1]); if (st) Object.assign(st, b); return ok(st || {}); }
    if (p === H + "/purchase-suggestions") return ok((D.stock || []).filter(function (i) { return Number(i.quantity) < Number(i.min_quantity); }).map(function (i) {
      return { stock_item_id: i.id, name: i.name, unit: i.unit, department: i.department, supplier_id: i.supplier_id || (i.department === "Housekeeping" ? "sp-1" : "sp-2"), quantity: i.order_quantity || Math.max(1, Math.ceil(i.min_quantity * 2 - i.quantity)) }; }));
    if (p === H + "/purchase-orders") { if (m === "POST") { var po = { id: nid("po"), hotel_id: D.hotel.id, supplier_id: b.supplier_id, status: "Entwurf", items: b.items, created_at: new Date().toISOString() }; D.purchase_orders.unshift(po); return ok(po); }
      return ok(D.purchase_orders.map(function (o) { var s2 = byId(D.suppliers, o.supplier_id) || {}; return Object.assign({ supplier_name: s2.name, supplier_email: s2.email }, o); })); }
    if ((mm = p.match(/^\/api\/purchase-orders\/([^/]+)\/send$/))) { var po2 = byId(D.purchase_orders, mm[1]); po2.status = "Bestellt"; po2.sent_at = new Date().toISOString(); return ok(po2); }
    if ((mm = p.match(/^\/api\/purchase-orders\/([^/]+)$/))) { if (m === "DELETE") { remove(D.purchase_orders, mm[1]); return ok({ ok: true }); } var po3 = byId(D.purchase_orders, mm[1]); Object.assign(po3, b); return ok(po3); }
    // Veranstaltungen
    if (p === H + "/events") { if (m === "POST") { var ev = Object.assign({ id: nid("ev"), hotel_id: D.hotel.id }, b); D.events.push(ev); return ok(ev); }
      return ok(D.events.filter(function (e) { return e.event_date >= (q.get("from") || add(todayIso, -7)); }).sort(function (a, c) { return a.event_date < c.event_date ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/events\/([^/]+)$/))) { if (m === "DELETE") { remove(D.events, mm[1]); return ok({ ok: true }); } var ev2 = byId(D.events, mm[1]); Object.assign(ev2, b); return ok(ev2); }
    // Räume, Angebote, eigene Vorlagen
    if (p === H + "/event-spaces") { if (m === "POST") { var es = { id: nid("es"), hotel_id: D.hotel.id, name: b.name, capacity: Number(b.capacity) || null, position: D.event_spaces.length }; D.event_spaces.push(es); return ok(es); } return ok(D.event_spaces); }
    if ((mm = p.match(/^\/api\/event-spaces\/([^/]+)$/))) { if (m === "DELETE") { remove(D.event_spaces, mm[1]); D.events.forEach(function (e) { if (e.space_id === mm[1]) e.space_id = null; }); return ok({ ok: true }); } var es2 = byId(D.event_spaces, mm[1]); Object.assign(es2, b); return ok(es2); }
    if (p === H + "/event-templates") { if (m === "POST") { var et = { id: nid("et"), hotel_id: D.hotel.id, name: b.name, data: b.data }; D.event_templates.push(et); return ok(et); } return ok(D.event_templates); }
    if ((mm = p.match(/^\/api\/event-templates\/([^/]+)$/))) { remove(D.event_templates, mm[1]); return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/events\/([^/]+)\/offer$/))) { var eo = byId(D.events, mm[1]); if (eo.offer_status === "keins") eo.offer_status = "offen"; return ok(Object.assign({ url: location.origin + location.pathname.replace(/[^/]*$/, "") + "angebot.html?demo=1", email_sent: false }, eo)); }
    // Rechnungen
    if (p === H + "/invoices") {
      if (m === "POST") {
        var set = D.hotel.invoice_settings || {}, gross = set.prices_gross !== false, its = (b.items || []).filter(function (i) { return i.label && i.qty; });
        if (b.kind === "Anzahlung") { var byR = {}; its.forEach(function (i) { byR[i.tax_rate] = (byR[i.tax_rate] || 0) + i.qty * i.unit_price; }); var ks = Object.keys(byR);
          its = ks.map(function (r) { return { label: "Anzahlung " + b.deposit_percent + " %" + (ks.length > 1 ? " (" + r + " %)" : ""), qty: 1, unit: "", unit_price: Math.round(byR[r] * b.deposit_percent) / 100, tax_rate: Number(r) }; }); }
        if (!its.length) return ok({ error: "Bitte mindestens eine Position eintragen." }, 400);
        var gT = 0, tT = 0; var byR2 = {}; its.forEach(function (i) { byR2[i.tax_rate] = (byR2[i.tax_rate] || 0) + i.qty * i.unit_price; });
        Object.keys(byR2).forEach(function (r) { var a = byR2[r], tx = gross ? a * r / (100 + Number(r)) : a * r / 100; tT += Math.round(tx * 100) / 100; gT += gross ? a : a + tx; });
        var yr = Number(todayIso.slice(0, 4)), sq2 = D.invoices.filter(function (x) { return x.year === yr; }).length + 1;
        var ded = b.kind === "Schlussrechnung" ? D.invoices.filter(function (x) { return x.event_id === b.event_id && x.kind === "Anzahlung" && x.status !== "storniert"; }).reduce(function (s3, x) { return s3 + x.gross_total; }, 0) : 0;
        var inv = { id: nid("inv"), hotel_id: D.hotel.id, event_id: b.event_id || null, kind: b.kind || "Rechnung", year: yr, seq: sq2, number: (set.prefix || "") + yr + "-" + String(sq2).padStart(4, "0"), issued_on: todayIso, due_on: add(todayIso, set.payment_days || 14),
          service_date: b.service_date || null, recipient: b.recipient, recipient_email: b.recipient_email || null, items: its, prices_gross: gross, net_total: Math.round((gT - tT) * 100) / 100, tax_total: Math.round(tT * 100) / 100, gross_total: Math.round(gT * 100) / 100,
          deducted: ded, currency: D.hotel.currency || "EUR", note: b.note || null, seller: Object.assign({ hotel: D.hotel.name }, set), status: "offen", paid_on: null };
        D.invoices.unshift(inv); return ok(inv);
      }
      return ok(D.invoices.filter(function (x) { return !q.get("event_id") || x.event_id === q.get("event_id"); }));
    }
    if ((mm = p.match(/^\/api\/invoices\/([^/]+)\/cancel$/))) { var oi = byId(D.invoices, mm[1]); oi.status = "storniert"; var yr2 = Number(todayIso.slice(0, 4)), sq3 = D.invoices.filter(function (x) { return x.year === yr2; }).length + 1;
      var st2 = Object.assign({}, oi, { id: nid("inv"), kind: "Storno", seq: sq3, number: ((D.hotel.invoice_settings || {}).prefix || "") + yr2 + "-" + String(sq3).padStart(4, "0"), issued_on: todayIso, due_on: null, cancels: oi.id, status: "storniert",
        items: oi.items.map(function (i) { return Object.assign({}, i, { qty: -i.qty }); }), net_total: -oi.net_total, tax_total: -oi.tax_total, gross_total: -oi.gross_total, deducted: -(oi.deducted || 0) });
      D.invoices.unshift(st2); return ok(st2); }
    if ((mm = p.match(/^\/api\/invoices\/([^/]+)\/send$/))) return ok({ ok: true });
    if ((mm = p.match(/^\/api\/invoices\/([^/]+)$/))) { var iv = byId(D.invoices, mm[1]); if (b.status) { iv.status = b.status; iv.paid_on = b.status === "bezahlt" ? todayIso : null; } return ok(iv); }
    // Dokument-Vorlagen
    if (p === H + "/doc-templates") { if (m === "POST") { var dt = Object.assign({ id: nid("dt"), hotel_id: D.hotel.id, has_file: !!b.file_data, created_at: new Date().toISOString() }, b); D.doc_templates.push(dt); return ok(dt); }
      return ok(D.doc_templates.map(function (x) { return Object.assign({}, x, { file_data: undefined }); })); }
    if ((mm = p.match(/^\/api\/doc-templates\/([^/]+)\/file$/))) { var df = byId(D.doc_templates, mm[1]) || {}; return ok({ file_data: df.file_data, file_name: df.file_name }); }
    if ((mm = p.match(/^\/api\/doc-templates\/([^/]+)$/))) { if (m === "DELETE") { remove(D.doc_templates, mm[1]); return ok({ ok: true }); } var dt2 = byId(D.doc_templates, mm[1]); Object.assign(dt2, b, b.file_data !== undefined ? { has_file: !!b.file_data } : {}); return ok(dt2); }
    if (p === H + "/send-document") return ok({ ok: true });
    if ((mm = p.match(/^\/api\/lost-found\/([^/]+)\/notify$/))) { var lfn = byId(D.lost_found, mm[1]); lfn.notified_at = new Date().toISOString(); if (!lfn.guest_contact) lfn.guest_contact = b.email; return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/trainings\/([^/]+)\/proof$/))) { var trp = byId(D.trainings, mm[1]); return ok({ training: trp, acks: D.acks.filter(function (a) { return a.training_id === trp.id; }) }); }
    // Gäste-Chat
    if (p === H + "/guest-chats") return ok(D.guest_threads.map(function (t) { return Object.assign({ last_at: t.messages[t.messages.length - 1].created_at, unread: t.messages.filter(function (x) { return x.sender === "guest" && !x.read_at; }).length }, t); }));
    if ((mm = p.match(/^\/api\/hotels\/[^/]+\/guest-chats\/([^/]+)$/))) { var th = D.guest_threads.find(function (t) { return t.thread === mm[1]; }); if (!th) return ok({ error: "Nicht gefunden." }, 404);
      th.messages.forEach(function (x) { if (x.sender === "guest") x.read_at = new Date().toISOString(); });
      if (b.body) { var gm = { id: nid("gm"), sender: "staff", body: b.body, created_at: new Date().toISOString() }; th.messages.push(gm); return ok(gm); } return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/documents\/([^/]+)$/)) && m === "PATCH") { var dc = byId(D.docs, mm[1]); Object.assign(dc, b); return ok(dc); }
    if (/^\/api\/documents\/[^/]+\/download$/.test(p)) return ok({ error: "In der Live-Demo nicht verfügbar." }, 400);
    // Anreisen
    if (p === H + "/arrivals") { if (m === "POST") { var ag = Object.assign({ id: nid("ar"), hotel_id: D.hotel.id, source: "hand", extras: [], mail_sent_at: null, answered_at: null }, b); D.arrivals.push(ag); return ok({ ok: true }); }
      return ok(D.arrivals.filter(function (g) { return g.arrival_date >= add(todayIso, -1); }).sort(function (a, c) { return a.arrival_date < c.arrival_date ? -1 : 1; }).map(arrivalOut)); }
    if ((mm = p.match(/^\/api\/arrivals\/([^/]+)\/registration$/))) { var rg = byId(D.arrivals, mm[1]); if (!rg || !rg.has_registration) return ok(null); return ok({ arrival_guest_id: rg.id, birth_date: rg.birth_date, nationality: rg.nationality, street: rg.street, zip: rg.zip, city: rg.city, address_country: rg.address_country, id_doc_type: rg.id_doc_type, id_doc_number: rg.id_doc_number, companions: rg.companions || [], registration_at: rg.registration_at }); }
    if ((mm = p.match(/^\/api\/arrivals\/([^/]+)$/)) && m === "PATCH") { var pa = byId(D.arrivals, mm[1]); if (!pa) return ok({ error: "Gäste pflegt die Rezeption bzw. ihre Leitung." }, 403);
      var chg = false;
      if (b.vip !== undefined) { pa.vip = !!b.vip; chg = true; }
      if (b.first_impression !== undefined) { var fi0 = b.first_impression || {}, fi = Object.assign({}, pa.first_impression || {}); chg = true;
        ["room_checked", "wishes_done", "front_desk_briefed", "welcome_ready"].forEach(function (k) { if (fi0[k] !== undefined) fi[k] = fi0[k] ? { at: new Date().toISOString(), by: ME } : null; });
        if (fi0.note !== undefined) fi.note = String(fi0.note || "").slice(0, 500); pa.first_impression = fi; }
      if (b.country !== undefined) { var cc = String(b.country || "").trim().toUpperCase(); pa.country = /^[A-Z]{2}$/.test(cc) ? cc : null; chg = true; }
      ["adults", "children"].forEach(function (k) { if (b[k] !== undefined) { var n = b[k] === "" || b[k] == null ? null : Math.round(Number(b[k])); pa[k] = n === null || (n >= 0 && n <= 20) ? n : null; chg = true; } });
      if (!chg) return ok({ error: "Nichts zu ändern." }, 400);
      return ok(arrivalOut(pa)); }
    if (p === H + "/arrivals/import") return ok({ error: "In der Live-Demo nicht verfügbar." }, 400);
    if ((mm = p.match(/^\/api\/arrivals\/([^/]+)\/send$/))) { byId(D.arrivals, mm[1]).mail_sent_at = new Date().toISOString(); return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/arrivals\/([^/]+)$/))) { remove(D.arrivals, mm[1]); return ok({ ok: true }); }
    // Bewertungen
    if (p === H + "/reviews") {
      var rated = D.reviews.filter(function (r) { return r.rating != null; }), five = function (r) { return r.rating / (r.scale || 5) * 5; };
      var avgR = function (l) { return l.length ? Math.round(l.reduce(function (a, r) { return a + five(r); }, 0) / l.length * 100) / 100 : null; };
      var bySrc = {}; D.reviews.forEach(function (r) { (bySrc[r.source] = bySrc[r.source] || []).push(r); });
      var months = []; for (var i2 = 5; i2 >= 0; i2--) { var dd = new Date(now.getFullYear(), now.getMonth() - i2, 15); months.push({ month: dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"), count: [9, 11, 14, 12, 16, 7][5 - i2], average: [4.1, 4.0, 4.2, 4.3, 4.4, 4.5][5 - i2] }); }
      return ok({ reviews: D.reviews, ai: true, summary: D.review_summary, stats: { count: 69, average: 4.3, months: months,
        sources: Object.keys(bySrc).map(function (k) { return { source: k, count: { google: 31, booking: 27, tripadvisor: 11 }[k] || bySrc[k].length, average: avgR(bySrc[k]) }; }) } });
    }
    if (p === H + "/reviews/summary") { D.review_summary.created_at = new Date().toISOString(); return ok(D.review_summary); }
    if (p === H + "/reviews/import") return ok({ error: "In der Live-Demo nicht verfügbar." }, 400);
    if ((mm = p.match(/^\/api\/reviews\/([^/]+)\/reply-draft$/)) && m === "POST") {
      var rv = byId(D.reviews, mm[1]); if (!rv) return ok({ error: "Nicht gefunden." }, 404);
      var low = rv.rating != null && rv.rating / (rv.scale || 5) * 5 < 3.5, ttl = rv.title ? " zu „" + rv.title + "“" : "";
      rv.reply_draft = low ? "Vielen Dank für Ihr ehrliches Feedback" + ttl + ". Es tut uns sehr leid, dass Ihr Aufenthalt nicht Ihren Erwartungen entsprochen hat. Wir haben Ihre Rückmeldung an das Team weitergegeben und möchten es gern besser machen – wir laden Sie herzlich ein, uns noch einmal die Chance zu geben. Ihr Team des Beispielhotel Alpenblick"
        : "Herzlichen Dank für Ihre tolle Bewertung" + ttl + "! Es freut uns sehr, dass Sie sich bei uns wohlgefühlt haben, und wir geben Ihr Lob gern an das Team weiter. Wir würden uns freuen, Sie bald wieder bei uns zu begrüßen. Ihr Team des Beispielhotel Alpenblick";
      rv.reply_status = "entwurf";
      return new Promise(function (res) { setTimeout(function () { ok(rv).then(res); }, 700); });
    }
    if ((mm = p.match(/^\/api\/reviews\/([^/]+)$/))) {
      if (m === "PATCH") { var rv2 = byId(D.reviews, mm[1]); if (!rv2) return ok({ error: "Nicht gefunden." }, 404);
        if (b.reply_draft !== undefined) rv2.reply_draft = b.reply_draft; if (b.reply_status !== undefined) rv2.reply_status = b.reply_status;
        if (rv2.reply_status === "beantwortet") rv2.replied_at = new Date().toISOString(); return ok(rv2); }
      remove(D.reviews, mm[1]); return ok({ ok: true });
    }
    // Personalbedarf (KI), Monatsabschluss, Inventur, Empfehlung
    if (p === H + "/staffing-advice" && m === "POST") {
      var f0 = b.from || todayIso, days = [];
      for (var di = 0; di < 7; di++) {
        var dt = add(f0, di), wd = new Date(dt + "T00:00:00Z").getUTCDay(), adj = [], hint = "Normaler Betrieb, Besetzung laut Regeln.";
        if (wd === 5) { hint = "Messe in der Stadt, Veranstaltung im Haus (Seminar mit 40 Personen)."; adj.push({ abteilung: "Food & Beverage", aenderung: 2, grund: "Veranstaltung und volles Haus beim Abendessen" }); }
        else if (wd === 0) { hint = "Abreisetag, viele Zimmer zu reinigen."; adj.push({ abteilung: "Housekeeping", aenderung: 1, grund: "Viele Abreisen am Vormittag" }); }
        else if (wd === 2) { hint = "Ruhiger Tag, niedrige Belegung."; adj.push({ abteilung: "Rezeption", aenderung: -1, grund: "Wenige An- und Abreisen" }); }
        days.push({ datum: dt, hinweis: hint, anpassungen: adj });
      }
      var advice = { zusammenfassung: "Die Woche startet mit normaler Auslastung. Zum Freitag ist wegen Messe und Veranstaltung mehr Personal im Service nötig, am Sonntag braucht das Housekeeping Unterstützung. Der ruhige Dienstag lässt eine Reduzierung an der Rezeption zu.", tage: days };
      return new Promise(function (res) { setTimeout(function () { ok({ from: f0, advice: advice }).then(res); }, 700); });
    }
    if (p === H + "/month-close") {
      var mo = q.get("month") || MON, cin = 0, cout = 0, byc = {}, cnt = 0;
      D.cash.forEach(function (c) { if (String(c.entry_date).slice(0, 7) !== mo) return; var a = Number(c.amount); if (c.direction === "ein") cin += a; else cout += a; var k = c.direction + "|" + c.category; byc[k] = Math.round(((byc[k] || 0) + a) * 100) / 100; cnt++; });
      if (!cnt) { cin = 286.5; cout = 37.3; byc = { "ein|Trinkgeld": 86.5, "ein|Wechselgeld": 200, "aus|Einkauf": 24.9, "aus|Sonstiges": 12.4 }; cnt = 4; }
      return ok({ month: mo, hotel: { name: D.hotel.name, currency: "EUR" }, people: [
        { user_id: "u-hkm", departments: ["Housekeeping"], hours: 168.5, shifts: 21, sick_days: 0, leave_days: 2 },
        { user_id: "u-ewa", departments: ["Housekeeping"], hours: 142, shifts: 18, sick_days: 3, leave_days: 0 },
        { user_id: "u-fb", departments: ["Food & Beverage"], hours: 174, shifts: 22, sick_days: 0, leave_days: 1 },
        { user_id: "u-member", departments: ["Housekeeping", "Rezeption"], hours: 120.5, shifts: 16, sick_days: 0, leave_days: 4 },
        { user_id: "u-admin", departments: ["Rezeption"], hours: 160, shifts: 20, sick_days: 0, leave_days: 0 }],
        cash: { total_in: Math.round(cin * 100) / 100, total_out: Math.round(cout * 100) / 100, by_category: byc, count: cnt },
        tourism_tax: { stays: 412, exempt: 38, rate: 2.5, amount: 935 }, room_nights: 1286 });
    }
    if (p === H + "/inventory") {
      if (m === "POST") { var inv = { id: nid("inv"), hotel_id: D.hotel.id, department: b.department, started_at: new Date().toISOString(), finished_at: null, note: null, lines: [] }; D.inventories.unshift(inv); return ok(invOut(inv)); }
      return ok(D.inventories.map(function (c) { return Object.assign({}, c, { lines: c.lines.length }); }));
    }
    if ((mm = p.match(/^\/api\/inventory\/([^/]+)\/lines$/)) && m === "PUT") {
      var ic = byId(D.inventories, mm[1]); if (!ic) return ok({ error: "Nicht gefunden." }, 404);
      var ln = ic.lines.find(function (x) { return x.item_id === b.item_id; });
      if (!ln) { ln = { item_id: b.item_id }; ic.lines.push(ln); } ln.counted = Number(b.counted); ln.counted_at = new Date().toISOString(); return ok(ln);
    }
    if ((mm = p.match(/^\/api\/inventory\/([^/]+)\/finish$/)) && m === "POST") {
      var ic2 = byId(D.inventories, mm[1]); if (!ic2) return ok({ error: "Nicht gefunden." }, 404); var chg = 0;
      ic2.lines.forEach(function (l) { var s2 = byId(D.stock, l.item_id); if (s2 && Number(s2.quantity) !== l.counted) { s2.quantity = l.counted; chg++; } if (s2 && s2.quantity >= s2.min_quantity) s2.reorder_ticket = null; });
      ic2.finished_at = new Date().toISOString(); return ok({ changed: chg });
    }
    if ((mm = p.match(/^\/api\/inventory\/([^/]+)$/))) {
      if (m === "DELETE") { remove(D.inventories, mm[1]); return ok({ ok: true }); }
      var ic3 = byId(D.inventories, mm[1]); return ic3 ? ok(invOut(ic3)) : ok({ error: "Nicht gefunden." }, 404);
    }
    if (/^\/api\/organizations\/[^/]+\/referral$/.test(p)) return ok({ code: "ALPN7K2Q", link: "https://hypoos-frontend.onrender.com/index.html?ref=ALPN7K2Q", referrals: [
      { created_at: nowIso(24 * 9), rewarded_at: null, reward_note: null }, { created_at: nowIso(24 * 60), rewarded_at: nowIso(24 * 40), reward_note: "Gutschrift 249.00 EUR" }] });
    // Energie
    if (p === H + "/meters") { if (m === "POST") { var mt2 = Object.assign({ id: nid("mt"), hotel_id: D.hotel.id }, b); D.meters.push(mt2); return ok(mt2); } return ok({ meters: D.meters, readings: D.meter_readings }); }
    if ((mm = p.match(/^\/api\/meters\/([^/]+)\/readings$/))) { if (D.meter_readings.some(function (r) { return r.meter_id === mm[1] && r.read_on === b.read_on; })) return ok({ error: "Für diesen Tag gibt es schon einen Zählerstand." }, 400);
      var rd = { id: nid("rd"), meter_id: mm[1], read_on: b.read_on, value: Number(String(b.value).replace(",", ".")), created_by: ME }; D.meter_readings.push(rd); D.meter_readings.sort(function (a, c) { return a.read_on < c.read_on ? -1 : 1; }); return ok(rd); }
    if ((mm = p.match(/^\/api\/meter-readings\/([^/]+)$/))) { remove(D.meter_readings, mm[1]); return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/meters\/([^/]+)$/))) { if (m === "DELETE") { remove(D.meters, mm[1]); return ok({ ok: true }); } var mt3 = byId(D.meters, mm[1]); Object.assign(mt3, b); return ok(mt3); }
    // Eigentümer-Countdown und Kalender-Abo
    if (p === H + "/owner-link") { if (m === "DELETE") { D.ownerLink = null; return ok({ ok: true }); } if (m === "POST") D.ownerLink = location.origin + location.pathname.replace(/[^/]*$/, "") + "countdown.html?demo=1"; return ok(D.ownerLink ? { url: D.ownerLink } : null); }
    if (p === "/api/me/calendar") { if (m === "DELETE") { D.cal = null; return ok({ ok: true }); } if (m === "POST") D.cal = { url: "https://hpoos-backend-1.onrender.com/api/calendar/demo.ics", webcal: "webcal://hpoos-backend-1.onrender.com/api/calendar/demo.ics" }; return ok(D.cal || null); }
    if (p === H + "/template-preview") return ok({ tasks: q.get("hotelType") ? 6 : 0, milestones: 0, alreadyApplied: D.tasks.length, past: 0 });
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
        outF.push({ day: dd, occupied: base, arrivals: Math.round(base * 0.27), departures: Math.round(base * 0.24), revenue: Math.round(base * [142, 128, 124, 129, 138, 159, 152][wd]), source: "pms" });
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
    if ((mm = p.match(/^\/api\/trainings\/([^/]+)\/ack$/))) { var ak = { training_id: mm[1], user_id: ME, acked_at: new Date().toISOString(), signer_name: b.signer_name || null, signature_data: b.signature_data || null }; D.acks.push(ak); return ok(ak); }
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
        temp_readings: D.readings.length, temp_out_of_range: D.readings.filter(function (r) { return r.out_of_range; }).length,
        rooms_available: (D.hotel.rooms || 140) * Math.round((new Date(k1) - new Date(k0)) / 86400000), occupancy_pct: Math.round(nights / ((D.hotel.rooms || 140) * Math.round((new Date(k1) - new Date(k0)) / 86400000)) * 1000) / 10,
        room_revenue: Math.round(nights * 141), adr: 141, revpar: Math.round(nights * 141 / ((D.hotel.rooms || 140) * Math.round((new Date(k1) - new Date(k0)) / 86400000)) * 100) / 100 });
    }
    // Gruppenansicht
    if (p === "/api/organizations/demo-org/overview") {
      var fcT = [118, 92, 88, 96, 112, 131, 126][new Date(todayIso + "T00:00:00Z").getUTCDay()];
      return ok([Object.assign({}, D.hotel, { tickets_open: D.tickets.filter(function (t) { return t.status !== "Erledigt"; }).length, tickets_urgent: 1,
        on_duty: TIMES.filter(function (e) { return !e.clock_out; }).length, rooms_total: D.rooms.length,
        rooms_ready: D.rooms.filter(function (r) { return r.status === "Sauber" || r.status === "Kontrolliert"; }).length,
        rooms_dirty: D.rooms.filter(function (r) { return r.status === "Schmutzig"; }).length, arrivals: Math.round(fcT * 0.27), departures: Math.round(fcT * 0.24),
        month_occupancy: 79.1, month_adr: 141, month_revpar: 111.5, tasks_overdue: D.tasks.filter(function (t) { return t.status !== "Erledigt" && t.due_date && t.due_date < todayIso; }).length, review_avg: 4.5, feedback_avg: 4.6,
        month_hours: 3120, hours_per_room_night: 0.42, staff_cost_per_room_night: 14.8, staff_cost_share: 31.5,
        budget_planned: D.budget.reduce(function (s4, x) { return s4 + Number(x.planned || 0); }, 0), budget_spent: D.budget.reduce(function (s4, x) { return s4 + Number(x.actual || 0) + Number(x.committed || 0); }, 0) })]);
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
        var os1 = { id: nid("os"), hotel_id: D.hotel.id, department: b.department, shift_date: b.shift_date, kind: b.kind, start_time: (tm.start_time || (defs[b.kind] || defs["Früh"])[0]) + "", end_time: (tm.end_time || (defs[b.kind] || defs["Früh"])[1]) + "", reason: "zusatz", status: "offen", created_by: ME, note: b.note || null };
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
    if ((mm = p.match(/^\/api\/candidates\/([^/]+)$/))) { if (m === "DELETE") { remove(D.candidates, mm[1]); remove(APPS, mm[1]); return ok({ ok: true }); } var cd2 = byId(D.candidates, mm[1]); Object.assign(cd2, b); return ok(cd2); }
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
          priority: b.priority || "Normal", status: "Offen", has_photo: !!b.photo_data, photo_data: b.photo_data || null, reporter_id: ME, assignee_id: null, created_at: new Date().toISOString(),
          kind: b.kind || "Mangel", contractor_id: b.contractor_id || null, due_on: b.due_on || null };
        D.tickets.unshift(tkn); return ok(tkn);
      }
      var sq = q.get("status");
      return ok(D.tickets.filter(function (t) { return (canSee(t.department) || t.reporter_id === ME || t.assignee_id === ME) &&
        (sq === "open" ? t.status !== "Erledigt" : sq === "done" ? t.status === "Erledigt" : true) && (!q.get("kind") || t.kind === q.get("kind")) && (!q.get("plan_id") || t.plan_id === q.get("plan_id")); }));
    }
    if ((mm = p.match(/^\/api\/tickets\/([^/]+)\/photo$/))) return ok({ photo_data: (byId(D.tickets, mm[1]) || {}).photo_data || null });
    if ((mm = p.match(/^\/api\/tickets\/([^/]+)$/))) {
      if (m === "DELETE") { remove(D.tickets, mm[1]); return ok({ ok: true }); }
      var tk = byId(D.tickets, mm[1]); Object.assign(tk, b);
      if (b.status) { tk.done_by = b.status === "Erledigt" ? ME : null; tk.done_at = b.status === "Erledigt" ? new Date().toISOString() : null; }
      return ok(tk);
    }
    // Migration 031
    if (p === H + "/assets") { if (m === "POST") { var na = Object.assign({ id: nid("as"), hotel_id: D.hotel.id, department: "Technik", created_at: new Date().toISOString() }, b);
        if (na.last_inspection && na.inspection_interval_months && !na.next_inspection) { var nd = new Date(na.last_inspection + "T12:00:00Z"); nd.setUTCMonth(nd.getUTCMonth() + Number(na.inspection_interval_months)); na.next_inspection = nd.toISOString().slice(0, 10); }
        D.assets.push(na); return ok(na); }
      return ok(D.assets.slice().sort(function (a, c) { return a.name < c.name ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/assets\/([^/]+)$/))) { if (m === "DELETE") { remove(D.assets, mm[1]); return ok({ ok: true }); } return ok(Object.assign(byId(D.assets, mm[1]), b)); }
    // Ergänzte Routen: Schicht abgeben, Zimmer-Abnahme, Mitarbeiter-Dokumente, Nachweise, Trinkgeld, Reinigungszeiten, Notfall
    if ((mm = p.match(/^\/api\/shifts\/([^/]+)\/offer$/)) && m === "POST") { var osh = byId(D.shifts, mm[1]); if (!osh) return ok({ error: "Nicht gefunden." }, 404);
      var oo = { id: nid("os"), hotel_id: D.hotel.id, department: osh.department, shift_date: osh.shift_date, kind: osh.kind, start_time: osh.start_time, end_time: osh.end_time, reason: "abgabe", status: "offen", created_by: ME, offered_shift_id: osh.id, note: (b && b.note) || null };
      D.open_shifts.push(oo); return ok({ open_shift_id: oo.id }); }
    if ((mm = p.match(/^\/api\/open-shifts\/([^/]+)\/withdraw$/)) && m === "POST") { var ow = byId(D.open_shifts, mm[1]); if (ow) ow.status = "abgesagt"; return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/patrol-scans\/([^/]+)\/proof$/))) { var pse = byId(D.patrol_scans, mm[1]); return ok({ photo_data: pse && pse.has_photo ? PX_PHOTO : null, signature_data: pse && pse.has_signature ? PX_SIGN : null }); }
    if ((mm = p.match(/^\/api\/rooms\/([^/]+)\/inspections$/))) {
      if (m === "POST") { var irm = byId(D.rooms, mm[1]); if (!irm) return ok({ error: "Nicht gefunden." }, 404);
        var its = (b.items || []).filter(function (x) { return x && String(x.label || "").trim(); }); if (!its.length) return ok({ error: "Bitte die Prüfpunkte ausfüllen." }, 400);
        var okAll = its.every(function (x) { return x.ok !== false; });
        var ins = { id: nid("ri"), room_id: irm.id, inspector: ME, created_at: new Date().toISOString(), passed: okAll, note: b.note || null,
          items: its.map(function (x) { return { label: x.label, ok: x.ok !== false, note: x.note || null, has_photo: !!x.photo_data }; }) };
        D.room_insp.unshift(ins); irm.status = okAll ? "Kontrolliert" : "Schmutzig"; irm.updated_by = ME; irm.updated_at = ins.created_at;
        return ok({ id: ins.id, created_at: ins.created_at, passed: ins.passed }); }
      return ok(D.room_insp.filter(function (x) { return x.room_id === mm[1]; }).slice(0, 20)); }
    if ((mm = p.match(/^\/api\/room-inspections\/([^/]+)$/))) { var rin = byId(D.room_insp, mm[1]); return rin ? ok(Object.assign({ hotel_id: D.hotel.id }, rin)) : ok({ error: "Nicht gefunden." }, 404); }
    if (p === "/api/organizations/demo-org/staff-documents") {
      if (m === "POST") { var nsd = Object.assign({ id: nid("sd"), organization_id: "demo-org", hotel_id: D.hotel.id, user_id: null, person_name: null, kind: "Sonstiges", title: "", valid_until: null, remind_days: 30, note: null, created_at: new Date().toISOString() }, b);
        nsd.has_file = !!b.file_data; if (b.file_data) nsd._file = b.file_data; delete nsd.file_data; D.staff_docs.push(nsd); return ok({ id: nsd.id }); }
      return ok(D.staff_docs.filter(function (d) { return lead || d.user_id === ME; }).sort(function (a, c) { return (a.valid_until || "9999") < (c.valid_until || "9999") ? -1 : 1; }).map(function (d) { var o = Object.assign({}, d); delete o._file; return o; })); }
    if ((mm = p.match(/^\/api\/staff-documents\/([^/]+)\/file$/))) { var sdf = byId(D.staff_docs, mm[1]); if (!sdf || !sdf.has_file) return ok({ error: "Nicht gefunden." }, 404); return ok({ file_data: sdf._file || PX_PHOTO, title: sdf.title, kind: sdf.kind }); }
    if ((mm = p.match(/^\/api\/staff-documents\/([^/]+)$/))) { if (m === "DELETE") { remove(D.staff_docs, mm[1]); return ok({ ok: true }); }
      var sdp = byId(D.staff_docs, mm[1]); if (!sdp) return ok({ error: "Nicht gefunden." }, 403); var pb = Object.assign({}, b); if (pb.file_data !== undefined) { sdp._file = pb.file_data || null; sdp.has_file = !!pb.file_data; delete pb.file_data; } Object.assign(sdp, pb); return ok({ id: sdp.id }); }
    if (p === H + "/tip-split") {
      var tmo = q.get("month") || todayIso.slice(0, 7), tdp = q.get("department") || "";
      var tsh = [["u-member", 142.5], ["u-ewa", 118], ["u-hkm", 96.25]], tsum = 356.75, ttot = 214.5, tdone = 0;
      var tshares = tsh.map(function (x, i) { var a = i < tsh.length - 1 ? Math.floor(ttot * x[1] / tsum * 100) / 100 : Math.round((ttot - tdone) * 100) / 100; tdone += a; return { user_id: x[0], hours: x[1], amount: a }; });
      return ok({ month: tmo, department: tdp, total: ttot, hours: tsum, currency: "EUR", shares: tshares.sort(function (a, c) { return c.amount - a.amount; }) }); }
    if (p === H + "/cleaning-times") { var cto = q.get("to") || todayIso;
      return ok({ from: q.get("from") || add(cto, -30), to: cto, runs: 186, by_user: [{ key: "u-member", count: 78, avg: 26, median: 25 }, { key: "u-ewa", count: 71, avg: 29, median: 28 }, { key: "u-hkm", count: 37, avg: 33, median: 31 }],
        by_type: [{ key: "Doppelzimmer", count: 112, avg: 27, median: 26 }, { key: "Einzelzimmer", count: 49, avg: 22, median: 21 }, { key: "Suite", count: 25, avg: 41, median: 40 }] }); }
    if (p === H + "/emergency/present") { return ok({ at: new Date().toISOString(), people: [{ user_id: "u-member", name: "Ana Petrovic", department: "Housekeeping", since: new Date(now.getTime() - 3 * 3600000).toISOString() },
      { user_id: "u-fo", name: "L. Stein", department: "Rezeption & Empfang", since: new Date(now.getTime() - 5 * 3600000).toISOString() }, { user_id: "u-fb", name: "L. Bianchi", department: "Food & Beverage", since: new Date(now.getTime() - 2 * 3600000).toISOString() }] }); }
    if (p === H + "/emergency" && m === "POST") return ok({ ok: true, sent: 12 });
    if (p === H + "/patrol-points") { if (m === "POST") { var npp = Object.assign({ id: nid("pp"), hotel_id: D.hotel.id, kind: "sonstiges", department: "Technik", active: true, created_at: new Date().toISOString() }, b, { token: tok(nextId + 40) }); D.patrol_points.push(npp); return ok(npp); }
      return ok(D.patrol_points.slice().sort(function (a, c) { return a.name < c.name ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/patrol-points\/([^/]+)$/))) { if (m === "DELETE") { remove(D.patrol_points, mm[1]); return ok({ ok: true }); } return ok(Object.assign(byId(D.patrol_points, mm[1]), b)); }
    if (p === H + "/patrol-scans") { var pf = q.get("from") || add(todayIso, -30); return ok(D.patrol_scans.filter(function (s) { return s.scanned_at.slice(0, 10) >= pf; }).sort(function (a, c) { return a.scanned_at < c.scanned_at ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/patrol\/([^/]+)\/scan$/))) { var sp = D.patrol_points.find(function (x) { return x.token === mm[1] && x.active; }); if (!sp) return ok({ error: "Dieser Kontrollpunkt ist nicht (mehr) gültig." }, 404);
      var sc = { id: nid("ps"), hotel_id: D.hotel.id, point_id: sp.id, user_id: ME, ok: b.ok !== false, note: b.note || null, temperature: b.temperature === undefined || b.temperature === null || b.temperature === "" ? null : Number(b.temperature), scanned_at: new Date().toISOString() };
      D.patrol_scans.unshift(sc); return ok(Object.assign({}, sc, { point: { id: sp.id, name: sp.name, kind: sp.kind, active: true, hotel_id: sp.hotel_id } })); }
    if ((mm = p.match(/^\/api\/patrol\/([^/]+)$/))) { var gp = D.patrol_points.find(function (x) { return x.token === mm[1] && x.active; }); if (!gp) return ok({ error: "Dieser Kontrollpunkt ist nicht (mehr) gültig." }, 404);
      return ok({ id: gp.id, name: gp.name, kind: gp.kind, department: gp.department, active: true, hotel_id: gp.hotel_id, hotels: { name: D.hotel.name } }); }
    if (p === H + "/work-instructions") { if (m === "POST") { var nw = Object.assign({ id: nid("wi"), hotel_id: D.hotel.id, created_at: new Date().toISOString() }, b); D.work_instructions.push(nw); return ok(nw); }
      return ok(D.work_instructions.slice().sort(function (a, c) { return a.title < c.title ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/work-instructions\/([^/]+)$/))) { if (m === "DELETE") { remove(D.work_instructions, mm[1]); return ok({ ok: true }); } return ok(Object.assign(byId(D.work_instructions, mm[1]), b)); }
    if (p === H + "/sick-notes") { if (m === "POST") { var nsn = { id: nid("sn"), hotel_id: D.hotel.id, user_id: ME, from_date: b.from_date, to_date: b.to_date, note: b.note || null, has_photo: !!b.photo_data, created_at: new Date().toISOString() };
        D.sick_notes.unshift(nsn); return ok({ id: nsn.id, from_date: nsn.from_date, to_date: nsn.to_date, created_at: nsn.created_at }); }
      return ok(D.sick_notes.filter(function (s) { return ROLE !== "member" || s.user_id === ME; }).sort(function (a, c) { return a.from_date < c.from_date ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/sick-notes\/([^/]+)\/photo$/))) return ok({ error: "Nicht gefunden." }, 404);
    if ((mm = p.match(/^\/api\/sick-notes\/([^/]+)$/))) { remove(D.sick_notes, mm[1]); return ok({ ok: true }); }
    if ((mm = p.match(/^\/api\/organizations\/([^/]+)\/leave$/))) {
      if (m === "PUT") { D.leave_bal[b.user_id] = { entitlement_days: Number(b.entitlement_days), carried_over_days: Number(b.carried_over_days || 0) }; return ok({ organization_id: mm[1], user_id: b.user_id, year: Number(b.year), entitlement_days: Number(b.entitlement_days), carried_over_days: Number(b.carried_over_days || 0) }); }
      var lyr = Number(q.get("year")) || yr0, used = {}, seen = {};
      D.shifts.forEach(function (s) { if (s.kind === "Urlaub" && s.user_id && String(s.shift_date).slice(0, 4) === String(lyr) && !seen[s.user_id + s.shift_date]) { seen[s.user_id + s.shift_date] = 1; used[s.user_id] = (used[s.user_id] || 0) + 1; } });
      var fixed = { "u-hkm": 12, "u-ewa": 7, "u-member": 3, "u-fb": 15, "u-admin": 9 };
      D.members.forEach(function (x) { if (!used[x.user_id] && lyr === yr0) used[x.user_id] = fixed[x.user_id] !== undefined ? fixed[x.user_id] : 5; });
      return ok({ year: lyr, balances: D.members.filter(function (x) { return D.leave_bal[x.user_id]; }).map(function (x) { var lb = D.leave_bal[x.user_id]; return { organization_id: mm[1], user_id: x.user_id, year: lyr, entitlement_days: lb.entitlement_days, carried_over_days: lb.carried_over_days }; }), used: used }); }
    if (p === H + "/tourism-tax") {
      if (m === "PUT") { var tmo = /^\d{4}-\d{2}$/.test(b.month || "") ? b.month + "-01" : null; if (!tmo) return ok({ error: "Bitte gültige Werte angeben (befreite Nächtigungen höchstens so viele wie alle)." }, 400);
        var tr = D.tax_months.find(function (x) { return x.month === tmo; }); if (!tr) { tr = { id: nid("tt"), hotel_id: D.hotel.id, month: tmo }; D.tax_months.push(tr); }
        tr.overnight_stays = Number(b.overnight_stays); tr.exempt_stays = Number(b.exempt_stays || 0); tr.note = b.note || null; return ok(tr); }
      var tyr = Number(q.get("year")) || yr0; return ok({ year: tyr, months: D.tax_months.filter(function (x) { return x.month.slice(0, 4) === String(tyr); }).sort(function (a, c) { return a.month < c.month ? -1 : 1; }) }); }
    if (p === H + "/room-credits" && m === "PUT") { var rcn = 0, rct = b.room_type || null; D.rooms.forEach(function (r) { if ((r.room_type || null) === rct) { r.cleaning_credits = Math.round(Number(b.credits) * 10) / 10; rcn++; } }); return ok({ updated: rcn }); }
    if (p === "/api/me/export") return ok({ exported_at: new Date().toISOString(), user: { id: ME, email: meRow.email }, memberships: [{ organization_id: "demo-org", role: ROLE, departments: MYDEPTS }], time_entries: TIMES.filter(function (e) { return e.user_id === ME; }).length, shifts: D.shifts.filter(function (s) { return s.user_id === ME; }).length, sick_notes: D.sick_notes.filter(function (s) { return s.user_id === ME; }) });
    if (p === H + "/guest-qr/rotate" && m === "POST") return ok({ rotated: D.rooms.length });
    if ((mm = p.match(/^\/api\/purchase-orders\/([^/]+)\/supplier-link$/)) && m === "POST") return ok({ url: "lieferant.html?t=demo" });
    if (p === H + "/courses") { if (m === "POST") { var nc = Object.assign({ id: nid("co"), hotel_id: D.hotel.id, pass_percent: 80, active: true, lessons: [], quiz: [], created_at: new Date().toISOString() }, b); D.courses.push(nc); return ok(nc); }
      return ok(D.courses.filter(function (c) { return lead || c.active; })); }
    if (p === H + "/course-results") return ok(D.course_results.slice().sort(function (a, c) { return a.completed_at < c.completed_at ? 1 : -1; }));
    if ((mm = p.match(/^\/api\/courses\/([^/]+)\/submit$/)) && m === "POST") {
      var cu = byId(D.courses, mm[1]); if (!cu || !cu.active) return ok({ error: "Kurs nicht gefunden." }, 404);
      var ans = (Array.isArray(b.answers) ? b.answers : []).map(function (a) { return Number.isInteger(a) ? a : -1; }), qz = cu.quiz || [];
      var rt = qz.filter(function (qq, i) { return ans[i] === qq.correct; }).length, sc2 = qz.length ? Math.round(rt / qz.length * 100) : 100;
      var cr = { id: nid("cr"), course_id: cu.id, hotel_id: D.hotel.id, user_id: ME, score: sc2, passed: sc2 >= (cu.pass_percent || 80), completed_at: new Date().toISOString() };
      D.course_results.unshift(cr);
      return ok({ id: cr.id, score: cr.score, passed: cr.passed, completed_at: cr.completed_at, right: rt, total: qz.length, wrong: qz.map(function (qq, i) { return ans[i] === qq.correct ? null : i; }).filter(function (x) { return x !== null; }) }); }
    if ((mm = p.match(/^\/api\/courses\/([^/]+)$/))) { if (m === "DELETE") { remove(D.courses, mm[1]); return ok({ ok: true }); } var cu2 = byId(D.courses, mm[1]); if (cu2) Object.assign(cu2, b); return ok(cu2 || {}); }
    // Kasse
    if (p === H + "/cash") {
      if (m === "POST") { if (!(Number(b.amount) > 0)) return ok({ error: "Bitte einen Betrag angeben." }, 400);
        var ce = { id: nid("cash"), entry_date: b.entry_date || todayIso, direction: b.direction === "aus" ? "aus" : "ein", category: b.category || "Sonstiges", amount: Number(b.amount), note: b.note || null, department: b.department || null, created_by: ME, created_at: new Date().toISOString(), has_receipt: !!b.receipt_data };
        D.cash.push(ce); return ok(ce); }
      var cmo = q.get("month") || MON, ces = D.cash.filter(function (x) { return x.entry_date.slice(0, 7) === cmo; }).sort(function (a, c) { return a.entry_date < c.entry_date ? 1 : -1; });
      var tin = 0, tout = 0; ces.forEach(function (x) { if (x.direction === "ein") tin += x.amount; else tout += x.amount; });
      return ok({ month: cmo, entries: ces, total_in: Math.round(tin * 100) / 100, total_out: Math.round(tout * 100) / 100 }); }
    if ((mm = p.match(/^\/api\/cash\/([^/]+)\/receipt$/))) return ok({ receipt_data: RCPT });
    if ((mm = p.match(/^\/api\/cash\/([^/]+)$/)) && m === "DELETE") { remove(D.cash, mm[1]); return ok({ ok: true }); }
    // Schlüssel
    if (p === H + "/keys") { if (m === "POST") { if (!b.name) return ok({ error: "Bitte einen Namen angeben." }, 400);
        var nk = { id: nid("key"), name: b.name, kind: b.kind || "Schlüssel", code: b.code || null, note: b.note || null, active: true }; D.keys.push(nk); return ok(nk); }
      return ok(D.keys); }
    if (p === H + "/key-loans") return ok(D.key_loans.slice().sort(function (a, c) { return a.issued_at < c.issued_at ? 1 : -1; }));
    if ((mm = p.match(/^\/api\/keys\/([^/]+)\/loan$/)) && m === "POST") {
      if (!b.user_id && !b.holder_name) return ok({ error: "Bitte angeben, wer den Schlüssel bekommt." }, 400);
      if (D.key_loans.some(function (l) { return l.key_id === mm[1] && !l.returned_at; })) return ok({ error: "Dieser Schlüssel ist bereits ausgegeben." }, 400);
      var nl = { id: nid("kl"), key_id: mm[1], user_id: b.user_id || null, holder_name: b.user_id ? null : b.holder_name, issued_at: new Date().toISOString(), due_back: b.due_back || null, returned_at: null, note: b.note || null };
      D.key_loans.push(nl); return ok(nl); }
    if ((mm = p.match(/^\/api\/key-loans\/([^/]+)\/return$/)) && m === "POST") { var kl = byId(D.key_loans, mm[1]); if (kl) kl.returned_at = new Date().toISOString(); return ok(kl || {}); }
    if ((mm = p.match(/^\/api\/keys\/([^/]+)$/))) { if (m === "DELETE") { remove(D.keys, mm[1]); D.key_loans = D.key_loans.filter(function (l) { return l.key_id !== mm[1]; }); return ok({ ok: true }); } var ky = byId(D.keys, mm[1]); if (ky) Object.assign(ky, b); return ok(ky || {}); }
    // Dienstkleidung
    if (p === H + "/uniforms") { if (m === "POST") { if (!b.item) return ok({ error: "Bitte ein Kleidungsstück angeben." }, 400);
        var nu = { id: nid("un"), user_id: b.user_id || null, holder_name: b.user_id ? null : (b.holder_name || null), item: b.item, size: b.size || null, quantity: Number(b.quantity) || 1, issued_at: b.issued_at || todayIso, returned_at: null, note: b.note || null }; D.uniforms.push(nu); return ok(nu); }
      return ok(D.uniforms); }
    if ((mm = p.match(/^\/api\/uniforms\/([^/]+)$/))) { if (m === "DELETE") { remove(D.uniforms, mm[1]); return ok({ ok: true }); } var un = byId(D.uniforms, mm[1]); if (un) Object.assign(un, b); return ok(un || {}); }
    // Stimmungsumfrage
    if (p === "/api/organizations/demo-org/pulse/status") return ok({ month: MON + "-01", done: D.pulse_done });
    if (p === "/api/organizations/demo-org/pulse" && m === "POST") { if (!(Number(b.score) >= 1 && Number(b.score) <= 5)) return ok({ error: "Bitte eine Bewertung von 1 bis 5 wählen." }, 400); D.pulse_done = true; if (b.comment) D.pulse_comments.unshift(String(b.comment)); return ok({ ok: true }); }
    if (p === "/api/organizations/demo-org/pulse/summary") {
      var prow = [], py = Number(todayIso.slice(0, 4)), pmo = Number(todayIso.slice(5, 7));
      for (var pi = 5; pi >= 0; pi--) { var pk = 5 - pi, cur = pi === 0, hid = pi === 3;
        prow.push({ month: iso(new Date(Date.UTC(py, pmo - 1 - pi, 1))), department: null, responses: cur ? 0 : (hid ? null : [18, 21, 0, 24, 26][pk]), avg_score: cur || hid ? null : [4.1, 3.9, 0, 4.2, 4.4][pk], hidden: hid }); }
      var pdm = iso(new Date(Date.UTC(py, pmo - 2, 1)));
      prow.push({ month: pdm, department: "Housekeeping", responses: 7, avg_score: 3.7, hidden: false }, { month: pdm, department: "Küche", responses: 5, avg_score: 4.5, hidden: false });
      return ok(prow); }
    if (p === "/api/organizations/demo-org/pulse/comments") return ok(D.pulse_comments);
    // Kalender mit Wetter
    if (p === H + "/day-info") {
      var wf = q.get("from") || todayIso, wt = q.get("to") || add(wf, 8), grp = ["sonnig", "wolkig", "wolkig", "regen", "bedeckt", "gewitter", "sonnig", "nebel", "schnee"], wx = [];
      for (var wi = 0; wi < 9; wi++) { var wd = add(todayIso, wi); if (wd < wf || wd > wt) continue; wx.push({ date: wd, tmax: [17, 15, 14, 11, 12, 16, 18, 9, 2][wi], tmin: [7, 8, 6, 6, 5, 9, 8, 4, -2][wi], rain: [0, 0.2, 0, 6.5, 1.1, 9.8, 0, 0.4, 3.2][wi], group: grp[wi] }); }
      return ok({ weather: wx, weather_source: "MET Norway", notes: D.cal_notes.filter(function (n) { return n.date_to >= wf && n.date_from <= wt; }), events: [] }); }
    if (p === H + "/calendar-notes" && m === "POST") { if (!b.title) return ok({ error: "Bitte einen Titel angeben." }, 400);
      var cn = { id: nid("cn"), date_from: b.date_from || todayIso, date_to: b.date_to || b.date_from || todayIso, title: b.title, kind: b.kind || "Hinweis", note: b.note || null }; D.cal_notes.push(cn); return ok(cn); }
    if ((mm = p.match(/^\/api\/calendar-notes\/([^/]+)$/)) && m === "DELETE") { remove(D.cal_notes, mm[1]); return ok({ ok: true }); }
    // KI-Service (Demo: Stichwort-Regeln statt echter KI)
    if (p === "/api/assistant" && m !== "POST") return ok({ enabled: true });
    if (p === "/api/assistant" && m === "POST") {
      var amsgs = (b && b.messages) || [], alast = "";
      for (var ai = amsgs.length - 1; ai >= 0; ai--) { if (amsgs[ai].role === "user") { alast = String(amsgs[ai].content || ""); break; } }
      var at = alast.toLowerCase(), anav = ((b && b.nav) || []).map(function (n) { return n[0]; });
      var ar = function (txt, key, fw) { return { antwort: txt, bereich: key && anav.indexOf(key) >= 0 ? key : "", weiterleiten: !!fw }; };
      var aout;
      if (/dienstplan|veröffentlich/.test(at)) aout = ar("So veröffentlichst du den Dienstplan:\n1. Im Dienstplan Abteilung und Woche wählen.\n2. Schichten setzen oder „Plan-Vorschlag“ nutzen.\n3. Auf „Veröffentlichen“ klicken – die Mitarbeitenden bekommen eine Nachricht.", "roster");
      else if (/ruhezeit|warnung/.test(at)) aout = ar("Nach dem Arbeitszeitgesetz (AZG) müssen zwischen zwei Diensten mindestens 11 Stunden Ruhezeit liegen. Wird das unterschritten, erscheint im Dienstplan eine Warnung neben der Person.", "roster");
      else if (/einlad|team/.test(at)) aout = ar("So lädst du jemanden ein:\n1. „Team“ öffnen.\n2. Auf „Einladen“ klicken.\n3. E-Mail, Rolle und Abteilung angeben und absenden.", "team");
      else if (/zwei-faktor|2fa|authenticator/.test(at)) aout = ar("So schaltest du die Zwei-Faktor-Anmeldung ein:\n1. „Konto“ öffnen.\n2. Bei „Zwei-Faktor-Anmeldung“ auf Einrichten klicken.\n3. Den Code mit einer Authenticator-App scannen und bestätigen.", "account");
      else if (/lohn|export|buchung/.test(at)) aout = ar("Zeiten und Lohn:\n1. „Zeiterfassung“ öffnen – dort siehst du alle Buchungen.\n2. Fehlende oder falsche Buchungen korrigiert die Leitung.\n3. Danach kannst du den Lohnarten-Export erzeugen.", "time");
      else if (/zimmer|pms/.test(at)) aout = ar("Zimmer:\n1. Im „Zimmerstatus“ siehst du den Stand aller Zimmer.\n2. Mit „Zimmer verteilen“ teilst du sie dem Housekeeping zu.\n3. Die PMS-Anbindung liefert den Status automatisch nach.", "rooms");
      else if (/abo|rechnung|zahlung|fehler|kaputt/.test(at)) aout = ar("Das kann ich hier nicht selbst klären. Ich leite deine Frage an den Support weiter.", "", true);
      else aout = ar("Das ist die Demo – der echte KI-Service beantwortet frei formulierte Fragen. Schau gern in den Bereich „Hilfe“.", "help");
      return new Promise(function (res) { setTimeout(function () { ok(aout).then(res); }, 600); });
    }
    if (p === "/api/feedback" && m === "POST") return ok({ ok: true });
    // Migration 037: Wäscherei, Minibar, Frühstück, Unterkünfte
    function itemsRoute(list, coll, prefix, fields, orderKey, defaults) {
      if (p === H + "/" + coll) {
        if (m === "POST") { if (!String(b.name || "").trim()) return ok({ error: "Bitte einen Namen angeben." }, 400);
          var row = Object.assign({ id: nid(prefix), hotel_id: D.hotel.id, active: true, created_at: new Date().toISOString() }, defaults || {}, b); fields(row); list.push(row); return ok(row); }
        return ok(list.slice().sort(function (a, c) { return a[orderKey] < c[orderKey] ? -1 : a[orderKey] > c[orderKey] ? 1 : 0; })); }
      var im = p.match(new RegExp("^/api/" + coll + "/([^/]+)$"));
      if (im) { if (m === "DELETE") { remove(list, im[1]); return ok({ ok: true }); } var row2 = byId(list, im[1]); if (!row2) return ok({ error: "Nicht gefunden." }, 403); Object.assign(row2, b); fields(row2); return ok(row2); }
      return null;
    }
    var r037 = itemsRoute(D.laundry_items, "laundry-items", "li", function (r) { r.unit_cost = numOrNull(r.unit_cost); r.par_level = r.par_level === "" || r.par_level == null ? null : Math.round(Number(r.par_level)); }, "name")
      || itemsRoute(D.minibar_items, "minibar-items", "mi", function (r) { r.price = numOrNull(r.price) || 0; r.sort = Number(r.sort) || (r.sort === 0 ? 0 : D.minibar_items.length); }, "sort")
      || itemsRoute(D.housing_units, "housing-units", "hu", function (r) { r.beds = Math.max(1, Math.round(Number(r.beds)) || 1); r.rent_month = numOrNull(r.rent_month); }, "name", { beds: 1 });
    if (r037) return r037;
    if (p === H + "/laundry") {
      var lmo = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : MON;
      var lmv = D.laundry_moves.filter(function (x) { return x.move_date.slice(0, 7) === lmo; }).sort(function (a, c) { return a.move_date < c.move_date ? 1 : -1; });
      var lsum = D.laundry_items.map(function (it) {
        var mv = lmv.filter(function (x) { return x.item_id === it.id; }), t = function (k) { return mv.reduce(function (s, x) { return s + (x[k] || 0); }, 0); };
        var sent = t("sent"), ret = t("returned"), dam = t("damaged"), miss = Math.max(0, sent - ret - dam);
        return { item_id: it.id, sent: sent, returned: ret, damaged: dam, missing: miss, cost: it.unit_cost != null ? Math.round((miss + dam) * it.unit_cost * 100) / 100 : null }; });
      return ok({ month: lmo, items: D.laundry_items.slice().sort(function (a, c) { return a.name < c.name ? -1 : 1; }), moves: lmv, summary: lsum }); }
    if ((mm = p.match(/^\/api\/laundry-items\/([^/]+)\/moves$/)) && m === "POST") {
      var nn = function (k) { var v = Math.round(Number(b[k] || 0)); return v >= 0 && v <= 100000 ? v : 0; };
      if (!byId(D.laundry_items, mm[1])) return ok({ error: "Nicht gefunden." }, 400);
      if (!nn("sent") && !nn("returned") && !nn("damaged")) return ok({ error: "Bitte eine Menge angeben." }, 400);
      var nlm = { id: nid("lm"), hotel_id: D.hotel.id, item_id: mm[1], move_date: b.move_date || todayIso, sent: nn("sent"), returned: nn("returned"), damaged: nn("damaged"), note: b.note || null, created_by: ME, created_at: new Date().toISOString() };
      D.laundry_moves.push(nlm); return ok(nlm); }
    if ((mm = p.match(/^\/api\/laundry-moves\/([^/]+)$/)) && m === "DELETE") { remove(D.laundry_moves, mm[1]); return ok({ ok: true }); }
    // Hotel-Gedächtnis (KI-Fragen an die eigenen Daten) – Demo: Stichwort-Antworten
    if (p === H + "/ask-data" && m === "POST") {
      var aq = String(b.question || "").toLowerCase(), ar;
      if (/personal|stunden|überstunden|lohn|kosten/.test(aq)) ar = { antwort: "Die Personalkosten lagen im letzten Monat bei rund 41.300 €, davor bei 37.900 € (+9 %). Haupttreiber sind 212 zusätzliche Stunden im Housekeeping und Service (Belegung 84 % statt 73 %) sowie 38 Überstunden in der Küche.", quellen: ["Stempelzeiten", "Belegung", "Dienstplan"] };
      else if (/meldung|zimmer|mängel|defekt/.test(aq)) ar = { antwort: "Die meisten Meldungen kommen aus den Zimmern 214 (7), 305 (5) und 118 (4) – meist Klimaanlage, tropfende Armaturen und Beleuchtung. Zimmer 214 ist seit 60 Tagen auffällig.", quellen: ["Meldungen", "Zimmer"] };
      else if (/bewert|gäste|feedback|sterne/.test(aq)) ar = { antwort: "Die Durchschnittsbewertung stieg von 4,3 auf 4,5 Sterne. Gelobt werden Frühstück und Freundlichkeit; die häufigste Kritik betrifft die Lautstärke an der Straßenseite (6 von 42 Bewertungen).", quellen: ["Bewertungen"] };
      else if (/wäsche|handtuch|bettwäsche/.test(aq)) ar = { antwort: "Pro Monat werden durchschnittlich 46 Teile aussortiert (Handtücher 21, Bettlaken 14, Bademäntel 11) – das sind etwa 410 € Ersatzbedarf. Im letzten Monat waren es 58 Teile.", quellen: ["Wäsche", "Minibar"] };
      else if (/energie|strom|gas|wasser|heizung/.test(aq)) ar = { antwort: "Der Stromverbrauch stieg im letzten Monat um 12 % auf 18.400 kWh, vor allem durch Kühlung (Kühlzelle, Klimaanlagen) bei warmem Wetter. Gas und Wasser blieben pro Übernachtung nahezu gleich.", quellen: ["Energie", "Belegung"] };
      else ar = { antwort: "Dazu kann die Demo nur Beispielantworten geben. Probieren Sie Fragen zu Personalkosten, Meldungen pro Zimmer, Bewertungen, Wäsche oder Energie. In der echten Version beantwortet die KI jede Frage aus Ihren Daten.", quellen: [], unsicher: true };
      return new Promise(function (res) { setTimeout(function () { ar.unsicher = !!ar.unsicher; res(ok(ar)); }, 900); }).then(function (r) { return r; });
    }
    // Belastung im Team
    if (p === H + "/wellbeing") {
      return ok({ from: add(todayIso, -56), to: add(todayIso, 14), people: [
        { user_id: "u-ewa", nights: 13, weekends_worked: 7, max_streak: 8, jumped_in: 4, hours_4w: 188.5, contract_week: 40, flags: ["streak", "weekends", "jumped_in", "nights"] },
        { user_id: "u-hkm", nights: 0, weekends_worked: 8, max_streak: 6, jumped_in: 1, hours_4w: 176, contract_week: 40, flags: ["streak", "weekends"] },
        { user_id: "u-member", nights: 2, weekends_worked: 3, max_streak: 4, jumped_in: 1, hours_4w: 142.5, contract_week: 40, flags: [] }] });
    }
    // Mängel-Vorhersage
    if (p === H + "/asset-risk") {
      return ok([
        { asset_id: "as-2", name: "Personenaufzug Hauptstiege", location: "Treppenhaus A", tickets_60d: 3, tickets_180d: 5, score: 11, reasons: [{ code: "recent", n: 3 }, { code: "rising" }, { code: "overdue", date: add(todayIso, -15) }] },
        { asset_id: "as-6", name: "Kaffeemaschine Frühstücksbuffet", location: "Frühstücksraum", tickets_60d: 2, tickets_180d: 3, score: 5, reasons: [{ code: "recent", n: 2 }, { code: "warranty", date: add(todayIso, 115) }] }]);
    }
    // Wartungskalender
    if (p === H + "/maintenance-calendar") {
      var mf = q.get("from") || add(todayIso, -30), mt = q.get("to") || add(todayIso, 120), mi = [];
      (D.assets || []).forEach(function (a) {
        if (a.next_inspection) mi.push({ date: a.next_inspection, kind: "pruefung", title: a.name, detail: a.location || "", tab: "assets" });
        if (a.contract_until) mi.push({ date: a.contract_until, kind: "vertrag", title: a.name, detail: a.service_company || "", tab: "assets" }); });
      (D.plans || []).forEach(function (x) { if (x.next_due) mi.push({ date: x.next_due, kind: "wartung", title: x.title, detail: [x.location, x.department].filter(Boolean).join(" · "), tab: "tickets" }); });
      (D.docs || []).forEach(function (x) { if (x.expires_at) mi.push({ date: x.expires_at, kind: "dokument", title: x.name, detail: "", tab: "docs" }); });
      (D.permits || []).forEach(function (x) { if (x.valid_until) mi.push({ date: x.valid_until, kind: "genehmigung", title: x.title, detail: x.status || "", tab: "permits" }); });
      return ok({ from: mf, to: mt, items: mi.filter(function (x) { return x.date >= mf && x.date <= mt; }).sort(function (a, c) { return a.date < c.date ? -1 : a.date > c.date ? 1 : 0; }) });
    }
    if (p === H + "/minibar-charges") {
      return ok(D.minibar_charges.filter(function (c) { return q.get("open") === "1" ? !c.billed_at : true; }).sort(function (a, c) { return a.charged_at < c.charged_at ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/rooms\/([^/]+)\/minibar$/)) && m === "POST") {
      var mrm = byId(D.rooms, mm[1]); if (!mrm) return ok({ error: "Nicht gefunden." }, 404);
      var mits = (b.items || []).map(function (x) { return { it: byId(D.minibar_items, x && x.item_id), qty: Math.round(Number(x && x.quantity)) }; }).filter(function (x) { return x.it && x.qty >= 1 && x.qty <= 50; });
      if (!mits.length) return ok({ error: "Bitte einen Minibar-Artikel auswählen." }, 400);
      return ok(mits.map(function (x) { var c = { id: nid("mc"), hotel_id: D.hotel.id, room_id: mrm.id, item_id: x.it.id, item_name: x.it.name, unit_price: x.it.price, quantity: x.qty, charged_at: new Date().toISOString(), created_by: ME, billed_at: null, billed_by: null, room: mrm.number };
        D.minibar_charges.push(c); return { id: c.id, item_name: c.item_name, unit_price: c.unit_price, quantity: c.quantity }; })); }
    if (p === "/api/minibar-charges/bill" && m === "POST") { var bn = 0; D.minibar_charges.forEach(function (c) { if ((b.ids || []).indexOf(c.id) >= 0 && !c.billed_at) { c.billed_at = new Date().toISOString(); c.billed_by = ME; bn++; } });
      return bn ? ok({ billed: bn }) : ok({ billed: 0 }); }
    if ((mm = p.match(/^\/api\/minibar-charges\/([^/]+)$/)) && m === "DELETE") { remove(D.minibar_charges, mm[1]); return ok({ ok: true }); }
    if (p === H + "/breakfast-plan") {
      var bfrom = /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") || "") ? q.get("from") : todayIso, bst = cleanBf(D.hotel.breakfast_settings), btot = 0;
      var bdays = [0, 1, 2, 3, 4, 5, 6].map(function (i) {
        var d = add(bfrom, i), prev = add(d, -1), fx = D.forecast.find(function (x) { return x.day === prev; });
        var rooms = fx ? fx.occupied : [118, 92, 88, 96, 112, 131, 126][new Date(prev + "T00:00:00Z").getUTCDay()];
        var guests = Math.round(rooms * bst.persons_per_room * bst.share); btot += guests;
        return { date: d, rooms: rooms, guests: guests, staff: Math.max(bst.min_staff, Math.ceil(guests / bst.guests_per_staff)) }; });
      return ok({ from: bfrom, settings: bst, days: bdays, shopping: bst.items.map(function (it) { return Object.assign({}, it, { total: Math.ceil(it.per_guest * btot * 10) / 10 }); }) }); }
    if (p === H + "/housing-assignments") {
      if (m === "POST") { if (!byId(D.housing_units, b.unit_id)) return ok({ error: "Unterkunft nicht gefunden." }, 400); if (!b.from_date) return ok({ error: "Bitte ein Einzugsdatum angeben." }, 400);
        var nha = { id: nid("ha"), hotel_id: D.hotel.id, unit_id: b.unit_id, user_id: b.user_id || null, person_name: b.user_id ? null : (b.person_name || b.holder_name || null), from_date: b.from_date, to_date: b.to_date || null,
          deposit: numOrNull(b.deposit), deposit_returned_at: b.deposit_returned_at || null, handover_note: b.handover_note || null, created_at: new Date().toISOString() };
        D.housing_assignments.push(nha); return ok(nha); }
      return ok(D.housing_assignments.slice().sort(function (a, c) { return a.from_date < c.from_date ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/housing-assignments\/([^/]+)$/))) {
      if (m === "DELETE") { remove(D.housing_assignments, mm[1]); return ok({ ok: true }); }
      var eha = byId(D.housing_assignments, mm[1]); if (!eha) return ok({ error: "Unterkünfte verwalten Admins und die Leitung Personal." }, 403);
      var pb2 = Object.assign({}, b); if (pb2.holder_name !== undefined) { pb2.person_name = pb2.holder_name; delete pb2.holder_name; } if (pb2.deposit !== undefined) pb2.deposit = numOrNull(pb2.deposit);
      Object.assign(eha, pb2); return ok(eha); }

    /* Migration 038 */
    if (p === "/api/organizations/demo-org/guest-profiles") {
      if (m === "POST") { var gem = String(b.email || "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gem)) return ok({ error: "Ungültige E-Mail-Adresse." }, 400);
        if (b.consent !== true) return ok({ error: "Bitte die Einwilligung des Gastes bestätigen." }, 400);
        var gpx = D.guest_profiles.find(function (x) { return x._email === gem; }), ts = new Date().toISOString();
        if (gpx) { gpx.preferences = String(b.preferences || "").slice(0, 1000); gpx.display_name = String(b.name || "").slice(0, 120) || gpx.display_name; gpx.updated_at = ts; }
        else { gpx = { id: nid("gp"), _email: gem, display_name: String(b.name || "").slice(0, 120) || null, preferences: String(b.preferences || "").slice(0, 1000) || null, consent_at: ts, consent_source: "rezeption", updated_at: ts }; D.guest_profiles.unshift(gpx); }
        return ok({ id: gpx.id }); }
      return ok(D.guest_profiles.slice().sort(function (a, c) { return a.updated_at < c.updated_at ? 1 : -1; }).map(profileOut)); }
    if ((mm = p.match(/^\/api\/guest-profiles\/([^/]+)$/))) { var gpe = byId(D.guest_profiles, mm[1]); if (!gpe) return ok({ error: "Gästeprofile pflegt die Rezeption." }, 403);
      if (m === "DELETE") { remove(D.guest_profiles, mm[1]); return ok({ ok: true }); }
      gpe.preferences = String(b.preferences || "").slice(0, 1000) || null; gpe.updated_at = new Date().toISOString(); return ok({ id: gpe.id }); }

    if (p === H + "/guest-orders") return ok(D.guest_orders.filter(function (o) { return q.get("open") !== "1" || o.status === "offen" || o.status === "bestätigt"; }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }));
    if ((mm = p.match(/^\/api\/guest-orders\/([^/]+)$/)) && m === "PATCH") { var gor = byId(D.guest_orders, mm[1]);
      if (["offen", "bestätigt", "abgelehnt", "abgerechnet"].indexOf(b.status) < 0) return ok({ error: "Ungültiger Status." }, 400);
      if (!gor) return ok({ error: "Gästebuchungen bearbeitet die Rezeption." }, 403);
      gor.status = b.status; gor.decided_at = new Date().toISOString(); return ok({ id: gor.id, status: gor.status }); }

    if (p === H + "/reviews/google-sync" && m === "POST") return ok({ created: 0, existing: 5, google_rating: 4.6, google_count: 318 });

    if (p === H + "/tourism-statistics") {
      var tmo = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : add(todayIso.slice(0, 8) + "01", -1).slice(0, 7), tk = 0.8 + (Number(tmo.slice(5, 7)) % 5) * 0.1;
      var trows = [["DE", 142, 610], ["AT", 96, 288], ["NL", 58, 331], ["CH", 41, 172], ["GB", 33, 198], ["IT", 27, 94], ["??", 6, 21]].map(function (r) { return { country: r[0], arrivals: Math.round(r[1] * tk), nights: Math.round(r[2] * tk) }; });
      return ok({ month: tmo, rows: trows.sort(function (a, c) { return c.nights - a.nights; }), missing_country: 3 }); }

    if (p === H + "/simulation/start" && m === "POST") { var sn = Math.max(3, Math.min(30, Math.round(Number(b.count) || 12))); D.sim.total += sn; return ok({ created: sn }); }
    if (p === H + "/simulation/report") return ok(simReport());
    if (p === H + "/simulation/clear" && m === "POST") { var sdl = D.sim.total; D.sim.total = 0; return ok({ deleted: sdl }); }

    if (p === H + "/season-handover" && m === "GET") return ok(Object.assign({ allowed: true }, D.hotel.season_handover || {}));
    if (p === H + "/season-handover" && m === "PUT") { D.hotel.season_handover = cleanHandover(b); return ok(D.hotel.season_handover); }
    if (p === H + "/sustainability") {
      var sy = Number(q.get("year")) || Number(todayIso.slice(0, 4)), sc = 1 + (Number(todayIso.slice(0, 4)) - sy) * 0.06, sst = cleanSust(D.hotel.sustainability_settings), snights = Math.round(31200 * sc);
      var sen = [["Strom", "kWh", 412000], ["Wärme", "kWh", 268000], ["Wasser", "m³", 5200]].map(function (e) { var used = Math.round(e[2] * sc);
        return { kind: e[0], unit: e[1], used: used, co2_kg: Math.round(used * sst.factors[e[0]]), per_night: Math.round(used / snights * 100) / 100 }; });
      var spieces = Math.round(41800 * sc), sco2 = sen.reduce(function (x, k) { return x + (k.co2_kg || 0); }, 0);
      return ok({ year: sy, room_nights: snights, energy: sen, laundry_pieces: spieces, laundry_kg: Math.round(spieces * sst.laundry_kg_per_piece), co2_kg: sco2, co2_per_night_kg: Math.round(sco2 / snights * 100) / 100, settings: sst }); }

    if (p === "/api/network/optin") {
      if (m === "PUT") { var oc = String(b.city || "").trim().slice(0, 80), od = (Array.isArray(b.departments) ? b.departments : []).map(String).slice(0, 12);
        if (!oc || !od.length) return ok({ error: "Bitte Ort und mindestens eine Abteilung angeben." }, 400);
        D.net_optin = { city: oc, departments: od, created_at: new Date().toISOString() }; return ok(D.net_optin); }
      if (m === "DELETE") { D.net_optin = null; return ok({ ok: true }); }
      return ok(D.net_optin); }
    if (p === "/api/network/jobs") return ok(D.net_jobs.filter(function (j) { return j.job_date >= todayIso; }).sort(function (a, c) { return a.job_date < c.job_date ? -1 : 1; }).map(jobOut));
    if (p === H + "/network-jobs" && m === "POST") {
      if (!b.department || !/^\d{4}-\d{2}-\d{2}$/.test(b.job_date || "")) return ok({ error: "Bitte Abteilung und Datum angeben." }, 400);
      var tm2 = function (x) { return /^\d{2}:\d{2}$/.test(String(x || "")) ? x + ":00" : null; };
      var njn = { id: nid("nj"), hotel_id: D.hotel.id, organization_id: "demo-org", department: b.department, job_date: b.job_date, start_time: tm2(b.start_time), end_time: tm2(b.end_time), city: D.hotel.city || "", pay_note: String(b.pay_note || "").slice(0, 120) || null, note: String(b.note || "").slice(0, 500) || null, status: "offen", created_at: new Date().toISOString(), hotel_name: D.hotel.name };
      D.net_jobs.push(njn); return ok(njn); }
    if ((mm = p.match(/^\/api\/network-jobs\/([^/]+)\/applications$/))) return ok(D.net_apps.filter(function (a) { return a.job_id === mm[1]; }).sort(function (a, c) { return a.created_at < c.created_at ? -1 : 1; }));
    if ((mm = p.match(/^\/api\/network-jobs\/([^/]+)\/apply$/)) && m === "POST") {
      if (!String(b.contact || "").trim()) return ok({ error: "Bitte Telefon oder E-Mail für die Rückmeldung angeben." }, 400);
      if (D.net_apps.some(function (a) { return a.job_id === mm[1] && a.user_id === ME; })) return ok({ error: "Du hast dich schon beworben." }, 400);
      var nap = { id: nid("na"), job_id: mm[1], user_id: ME, message: String(b.message || "").slice(0, 500), contact: String(b.contact).trim().slice(0, 160), status: "offen", created_at: new Date().toISOString() };
      D.net_apps.push(nap); return ok({ id: nap.id }); }
    if ((mm = p.match(/^\/api\/network-jobs\/([^/]+)$/)) && m === "PATCH") { var njp = byId(D.net_jobs, mm[1]);
      if (["offen", "vergeben", "abgesagt"].indexOf(b.status) < 0) return ok({ error: "Ungültiger Status." }, 400);
      if (!njp) return ok({ error: "Einsätze schreibt die Leitung der Abteilung aus." }, 403);
      njp.status = b.status; return ok({ id: njp.id, status: njp.status }); }
    if ((mm = p.match(/^\/api\/network-applications\/([^/]+)$/)) && m === "PATCH") { var nao = byId(D.net_apps, mm[1]);
      if (["angenommen", "abgelehnt", "zurückgezogen"].indexOf(b.status) < 0) return ok({ error: "Ungültiger Status." }, 400);
      if (!nao) return ok({ error: "Nicht berechtigt." }, 403);
      nao.status = b.status; return ok({ id: nao.id, status: nao.status, user_id: nao.user_id }); }

    if (p === "/api/organizations/demo-org/apprentices") {
      if (m === "POST") { if (!String(b.trade || "").trim()) return ok({ error: "Bitte den Lehrberuf angeben." }, 400); if (!b.start_date) return ok({ error: "Bitte den Lehrbeginn angeben." }, 400);
        var nap2 = { id: nid("ap"), organization_id: "demo-org", user_id: b.user_id || null, person_name: b.user_id ? null : (b.person_name || null), trade: String(b.trade).trim().slice(0, 80), start_date: b.start_date, end_date: b.end_date || null,
          trainer_user_id: b.trainer_user_id || null, plan: Array.isArray(b.plan) ? b.plan : [], created_at: new Date().toISOString() };
        D.apprentices.unshift(nap2); return ok(nap2); }
      return ok(D.apprentices.slice().sort(function (a, c) { return a.start_date < c.start_date ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/apprentices\/([^/]+)\/logs$/))) {
      if (m === "PUT") { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.week_start || "")) return ok({ error: "Bitte die Woche angeben." }, 400);
        var alg = D.apprentice_logs.find(function (l) { return l.apprentice_id === mm[1] && l.week_start === b.week_start; });
        if (!alg) { alg = { id: nid("al"), apprentice_id: mm[1], week_start: b.week_start, text: "", trainer_feedback: null, created_at: new Date().toISOString() }; D.apprentice_logs.push(alg); }
        if (b.text !== undefined) alg.text = String(b.text || "").slice(0, 4000);
        if (b.trainer_feedback !== undefined) alg.trainer_feedback = String(b.trainer_feedback || "").slice(0, 2000) || null;
        return ok(alg); }
      return ok(D.apprentice_logs.filter(function (l) { return l.apprentice_id === mm[1]; }).sort(function (a, c) { return a.week_start < c.week_start ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/apprentices\/([^/]+)$/)) && m === "PATCH") { var apx = byId(D.apprentices, mm[1]); if (!apx) return ok({ error: "Lehrlinge verwalten Admins, die Leitung Personal und die Ausbilder." }, 403);
      ["trade", "start_date", "end_date", "trainer_user_id", "user_id", "person_name"].forEach(function (k) { if (b[k] !== undefined) apx[k] = b[k] === "" ? null : b[k]; });
      if (b.plan !== undefined) apx.plan = (Array.isArray(b.plan) ? b.plan : []).slice(0, 200).map(function (x) { return { item: String((x && x.item) || "").trim().slice(0, 200), done: !!(x && x.done), done_at: x && x.done ? (x.done_at || todayIso) : null }; }).filter(function (x) { return x.item; });
      return ok(apx); }
    /* ===== Paket 040 (Beispieldaten im Speicher; Antworten wie routes-opening/-team/-guests.js) ===== */
    var deny = function (msg) { return ok({ error: msg }, 403); };
    var nf = function () { return ok({ error: "Nicht gefunden." }, 404); };
    var hasDept = function () { if (ROLE === "admin") return true; for (var i = 0; i < arguments.length; i++) if (MYDEPTS.indexOf(arguments[i]) >= 0) return true; return false; };
    var s200 = function (v, n) { return String(v == null ? "" : v).trim().slice(0, n); };
    var isoOr = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : null; };
    var nowS = function () { return new Date().toISOString(); };

    // --- Erstausstattung
    if (p === H + "/equipment-templates") {
      if (m === "PUT") { if (!lead) return deny("Die Erstausstattung pflegt die Leitung.");
        var etr = s200(b.room_type, 60), eit = cleanEqItems(b.items), eti = EQ_TPL.findIndex(function (t) { return t.room_type === etr; });
        if (!eit.length) { if (eti >= 0) EQ_TPL.splice(eti, 1); return ok({ room_type: etr, items: [], deleted: true }); }
        if (eti >= 0) { EQ_TPL[eti].items = eit; EQ_TPL[eti].updated_at = nowS(); return ok(EQ_TPL[eti]); }
        var etn = { id: nid("eqt"), hotel_id: D.hotel.id, room_type: etr, items: eit, updated_at: nowS() }; EQ_TPL.push(etn); return ok(etn); }
      return ok(EQ_TPL.slice()); }
    if (p === H + "/room-equipment") return ok(eqView());
    if ((mm = p.match(/^\/api\/room-equipment\/([^/]+)$/)) && m === "PUT") {
      var eqr = byId(D.rooms, mm[1]); if (!eqr) return nf();
      if (!lead && !hasDept("Housekeeping", "Technik", "Einkauf")) return deny("Den Lieferstand pflegen Housekeeping, Technik oder Einkauf.");
      var eqs = EQ[eqr.id] || (EQ[eqr.id] = { room_id: eqr.id, hotel_id: D.hotel.id, delivered: {}, installed: {}, note: null });
      if (b.delivered !== undefined) { eqs.delivered = {}; Object.keys(b.delivered || {}).forEach(function (k) { var n = Math.round(Number(b.delivered[k])); if (n > 0 && n <= 999) eqs.delivered[k] = n; }); }
      if (b.installed !== undefined) { eqs.installed = {}; Object.keys(b.installed || {}).forEach(function (k) { if (b.installed[k] === true) eqs.installed[k] = true; }); }
      if (b.note !== undefined) eqs.note = s200(b.note, 500) || null;
      eqs.updated_at = nowS(); eqs.updated_by = ME; return ok(eqs); }

    // --- Angebotsvergleich
    var DENIED_Q = "Angebote pflegen die Leitung und der Einkauf.";
    if (p === H + "/quote-requests") {
      if (m === "POST") { if (!lead) return deny(DENIED_Q); var qtitle = s200(b.title, 200); if (!qtitle) return ok({ error: "Bitte einen Titel angeben." }, 400);
        var qrn = { id: nid("qr"), hotel_id: D.hotel.id, title: qtitle, department: s200(b.department, 80) || "Einkauf", budget_item_id: b.budget_item_id || null, status: "offen", decided_quote_id: null, decision_reason: null, decided_by: null, decided_at: null, created_at: nowS() };
        QR.unshift(qrn); return ok(Object.assign({ quotes: [] }, qrn)); }
      return ok(QR.slice().sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }).map(function (r) {
        return Object.assign({}, r, { quotes: QT.filter(function (x) { return x.request_id === r.id; }).sort(function (a, c) { return a.amount - c.amount; }).map(quoteOut) }); })); }
    if ((mm = p.match(/^\/api\/quote-requests\/([^/]+)$/))) { var qrr = byId(QR, mm[1]); if (!qrr) return deny(DENIED_Q); if (!lead) return deny(DENIED_Q);
      if (m === "DELETE") { remove(QR, qrr.id); QT = QT.filter(function (x) { return x.request_id !== qrr.id; }); return ok({ ok: true }); }
      if (qrr.status === "entschieden") return deny("Entschiedene Anfragen können nicht mehr geändert werden.");
      if (b.status !== undefined) { if (["offen", "verworfen"].indexOf(b.status) < 0) return ok({ error: "Unbekannter Status." }, 400); qrr.status = b.status; }
      if (b.title !== undefined) qrr.title = s200(b.title, 200) || qrr.title;
      return ok(qrr); }
    if ((mm = p.match(/^\/api\/quote-requests\/([^/]+)\/quotes$/)) && m === "POST") { var qrq = byId(QR, mm[1]); if (!qrq) return nf(); if (!lead) return deny(DENIED_Q);
      if (qrq.status === "entschieden") return ok({ error: "Diese Anfrage ist schon entschieden." }, 400);
      var qam = Number(String(b.amount == null ? "" : b.amount).replace(",", ".")); if (!(qam >= 0) || b.amount === "" || b.amount == null) return ok({ error: "Bitte einen gültigen Betrag angeben." }, 400);
      var qsn = s200(b.supplier_name, 120), qsup = b.supplier_id ? byId(D.suppliers, b.supplier_id) : null; if (qsup && !qsn) qsn = qsup.name; if (!qsn) return ok({ error: "Bitte einen Lieferanten angeben." }, 400);
      var qnew = { id: nid("qt"), request_id: qrq.id, supplier_id: qsup ? qsup.id : null, supplier_name: qsn, amount: Math.round(qam * 100) / 100, currency: /^[A-Z]{3}$/.test(b.currency || "") ? b.currency : null,
        delivery_days: b.delivery_days === "" || b.delivery_days == null ? null : Math.round(Number(b.delivery_days)), valid_until: isoOr(b.valid_until), note: s200(b.note, 1000), created_at: nowS(), has_file: !!b.file_data };
      QT.push(qnew); return ok(qnew); }
    if ((mm = p.match(/^\/api\/quotes\/([^/]+)$/))) { var qto = byId(QT, mm[1]); if (!qto) return nf(); if (!lead) return deny(DENIED_Q);
      if (m === "DELETE") { var qpr = byId(QR, qto.request_id); if (qpr && qpr.decided_quote_id === qto.id) return ok({ error: "Das gewählte Angebot bleibt als Nachweis erhalten." }, 400); remove(QT, qto.id); return ok({ ok: true }); }
      ["supplier_name", "note"].forEach(function (k) { if (b[k] !== undefined) qto[k] = s200(b[k], k === "note" ? 1000 : 120); });
      if (b.amount !== undefined) qto.amount = Math.round(Number(b.amount) * 100) / 100; if (b.delivery_days !== undefined) qto.delivery_days = b.delivery_days === "" ? null : Math.round(Number(b.delivery_days)); if (b.valid_until !== undefined) qto.valid_until = isoOr(b.valid_until);
      return ok(qto); }
    if ((mm = p.match(/^\/api\/quotes\/([^/]+)\/file$/))) { var qtf = byId(QT, mm[1]); if (!qtf || !qtf.has_file) return ok({ error: "Keine Datei hinterlegt." }, 404); return ok({ file_data: TINY_PDF }); }
    if ((mm = p.match(/^\/api\/quote-requests\/([^/]+)\/decide$/)) && m === "POST") {
      var qrd = byId(QR, mm[1]); if (!qrd) return nf(); if (!lead) return deny(DENIED_Q);
      var reason = s200(b.reason, 2000); if (!reason) return ok({ error: "Bitte die Entscheidung kurz begründen." }, 400);
      if (qrd.status !== "offen") return ok({ error: "Diese Anfrage ist nicht mehr offen." }, 400);
      var qdq = byId(QT, b.quote_id); if (!qdq || qdq.request_id !== qrd.id) return ok({ error: "Bitte ein Angebot dieser Anfrage wählen." }, 400);
      var budg = null;
      if (qrd.budget_item_id) { budg = byId(D.budget, qrd.budget_item_id); if (budg) budg.committed = Math.round((Number(budg.committed || 0) + qdq.amount) * 100) / 100; }
      else if (b.create_budget_item) { var cbi = typeof b.create_budget_item === "object" ? b.create_budget_item : {};
        budg = { id: nid("b"), hotel_id: D.hotel.id, department: s200(cbi.department, 80) || qrd.department || "Einkauf", category: s200(cbi.category, 80) || "Sonstiges", title: s200(cbi.title, 200) || qrd.title, planned: qdq.amount, committed: qdq.amount, actual: 0, note: "Vergabe: " + qdq.supplier_name };
        D.budget.push(budg); qrd.budget_item_id = budg.id; }
      Object.assign(qrd, { status: "entschieden", decided_quote_id: qdq.id, decision_reason: reason, decided_by: ME, decided_at: nowS() });
      return ok({ request: qrd, budget: budg }); }

    // --- Eingangsrechnungen
    var DENIED_I = "Eingangsrechnungen pflegen die Leitung, Finanzen und der Einkauf.";
    var invFiles = { "si-1": true };
    if (p === H + "/supplier-invoices") {
      if (m === "POST") { if (!lead) return deny(DENIED_I); var iam = Number(String(b.amount == null ? "" : b.amount).replace(",", ".")); if (!(iam >= 0) || b.amount === "" || b.amount == null) return ok({ error: "Bitte einen gültigen Betrag angeben." }, 400);
        if (!s200(b.supplier_name, 120) && !b.supplier_id) return ok({ error: "Bitte einen Lieferanten angeben." }, 400);
        var isk = b.skonto_percent === "" || b.skonto_percent == null ? null : Number(b.skonto_percent); if (isk && !b.skonto_until) return ok({ error: "Bitte das Datum für den Skonto angeben." }, 400);
        var inw = { id: nid("si"), hotel_id: D.hotel.id, supplier_id: b.supplier_id || null, supplier_name: s200(b.supplier_name, 120) || (byId(D.suppliers, b.supplier_id) || {}).name || "", invoice_number: s200(b.invoice_number, 80), amount: Math.round(iam * 100) / 100, currency: b.currency || null,
          invoice_date: isoOr(b.invoice_date), due_on: isoOr(b.due_on), skonto_percent: isk || null, skonto_until: isoOr(b.skonto_until), paid_at: null, paid_by: null, budget_item_id: b.budget_item_id || null, note: s200(b.note, 1000), created_at: nowS(), has_file: !!b.file_data };
        INV.push(inw); return ok(inw); }
      return ok(lead ? INV.filter(function (x) { return q.get("open") !== "1" || !x.paid_at; }).sort(function (a, c) { return String(a.due_on || "9") < String(c.due_on || "9") ? -1 : 1; }) : []); }
    if ((mm = p.match(/^\/api\/supplier-invoices\/([^/]+)$/))) { var inv = byId(INV, mm[1]); if (!inv || !lead) return deny(DENIED_I);
      if (m === "DELETE") { remove(INV, inv.id); return ok({ ok: true }); }
      ["supplier_name", "invoice_number", "note"].forEach(function (k) { if (b[k] !== undefined) inv[k] = s200(b[k], k === "note" ? 1000 : 120); });
      ["invoice_date", "due_on", "skonto_until"].forEach(function (k) { if (b[k] !== undefined) inv[k] = isoOr(b[k]); });
      if (b.amount !== undefined) inv.amount = Math.round(Number(String(b.amount).replace(",", ".")) * 100) / 100;
      if (b.skonto_percent !== undefined) inv.skonto_percent = Number(b.skonto_percent) || null;
      if (b.budget_item_id !== undefined) inv.budget_item_id = b.budget_item_id || null;
      if (b.paid !== undefined) { inv.paid_at = b.paid ? nowS() : null; inv.paid_by = b.paid ? ME : null; }
      return ok(inv); }
    if ((mm = p.match(/^\/api\/supplier-invoices\/([^/]+)\/file$/))) { var invf = byId(INV, mm[1]); if (!invf || !invf.has_file) return ok({ error: "Keine Datei hinterlegt." }, 404); return ok({ file_data: TINY_PDF }); }

    // --- Warteliste (Eröffnung)
    if (p === H + "/waitlist") {
      if (m === "PUT") { if (ROLE !== "admin") return deny("Die Warteliste stellen Admins ein.");
        var wo = D.hotel.waitlist; D.hotel.waitlist = { enabled: b.enabled === true, token: b.rotate === true ? "DEMOwartelisteNeu" + Math.floor(Math.random() * 1e6) : wo.token, headline: s200(b.headline, 160), text: String(b.text == null ? "" : b.text).trim().slice(0, 3000), offer: s200(b.offer, 1000) };
        return ok({ settings: waitlistSettings(), url: waitlistUrl() }); }
      if (!lead) return deny("Die Warteliste sehen Admins und die Leitung.");
      return ok({ settings: waitlistSettings(), url: waitlistUrl(), signups: WL_SIGNUPS.slice() }); }
    if ((mm = p.match(/^\/api\/waitlist-signups\/([^/]+)$/)) && m === "DELETE") { if (ROLE !== "admin") return deny("Einträge löschen Admins."); remove(WL_SIGNUPS, mm[1]); return ok({ ok: true }); }
    if (p === H + "/waitlist/send" && m === "POST") { if (!lead) return deny("Die Eröffnungs-Mail verschicken Admins und die Leitung.");
      if (!s200(b.subject, 160) || !String(b.text || "").trim()) return ok({ error: "Bitte Betreff und Text angeben." }, 400);
      var wq = WL_SIGNUPS.filter(function (s) { return s.confirmed_at && !s.unsubscribed_at && !s.notified_at; });
      if (!wq.length) return ok({ error: "Niemand wartet auf eine Mail: keine bestätigten, noch nicht benachrichtigten Einträge." }, 400);
      wq.forEach(function (s) { s.notified_at = nowS(); }); return ok({ queued: wq.length }); }

    // --- Barrierefreiheit
    if (p === H + "/accessibility") {
      if (m === "PUT") { if (ROLE !== "admin") return deny("Die Angaben zum Haus pflegen Admins."); D.hotel.accessibility_info = accAreas(b); return ok({ info: accAreas(D.hotel.accessibility_info) }); }
      return ok({ info: accAreas(D.hotel.accessibility_info), rooms: D.rooms.slice().sort(function (a, c) { return cmpNum(a.number, c.number); }).map(function (r) { return { id: r.id, number: r.number, floor: r.floor, room_type: r.room_type, accessibility: cleanRoomAccess(r.accessibility) }; }), public: accPublic() }); }
    if ((mm = p.match(/^\/api\/rooms\/([^/]+)\/accessibility$/)) && m === "PUT") { var acr = byId(D.rooms, mm[1]); if (!acr || !(lead || hasDept("Housekeeping", "Rezeption & Empfang"))) return deny("Zimmerangaben pflegen Housekeeping und Rezeption.");
      acr.accessibility = cleanRoomAccess(b); return ok({ id: acr.id, number: acr.number, accessibility: acr.accessibility }); }

    // --- Ereignisse in der Stadt
    if (p === H + "/city-events") {
      if (m === "POST") { if (!lead) return deny("Ereignisse pflegt die Leitung."); if (!s200(b.title, 160)) return ok({ error: "Bitte einen Titel angeben." }, 400); if (!isoOr(b.start_date)) return ok({ error: "Bitte ein Datum angeben." }, 400);
        if (b.end_date && b.end_date < b.start_date) return ok({ error: "Das Ende liegt vor dem Beginn." }, 400);
        var cen = { id: nid("ce"), hotel_id: D.hotel.id, title: s200(b.title, 160), start_date: b.start_date, end_date: isoOr(b.end_date), impact: ["niedrig", "mittel", "hoch"].indexOf(b.impact) >= 0 ? b.impact : "mittel", note: s200(b.note, 1000), created_at: nowS() };
        CITY_EV.push(cen); return ok(cen); }
      return ok(CITY_EV.slice().sort(function (a, c) { return a.start_date < c.start_date ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/city-events\/([^/]+)$/))) { var cev = byId(CITY_EV, mm[1]); if (!cev || !lead) return deny("Ereignisse pflegt die Leitung.");
      if (m === "DELETE") { remove(CITY_EV, cev.id); return ok({ ok: true }); }
      ["title", "note"].forEach(function (k) { if (b[k] !== undefined) cev[k] = s200(b[k], k === "title" ? 160 : 1000); }); if (b.start_date !== undefined) cev.start_date = isoOr(b.start_date) || cev.start_date; if (b.end_date !== undefined) cev.end_date = isoOr(b.end_date);
      if (b.impact !== undefined && ["niedrig", "mittel", "hoch"].indexOf(b.impact) >= 0) cev.impact = b.impact; return ok(cev); }

    // --- Stellenanzeigen und Bewerbungen
    var DENIED_J = "Stellenanzeigen pflegt die Leitung der Abteilung oder des Personals.";
    if (p === H + "/job-postings") {
      if (m === "POST") { if (!lead) return deny(DENIED_J); if (!s200(b.title, 160)) return ok({ error: "Bitte einen Titel angeben." }, 400); if (!s200(b.department, 80)) return ok({ error: "Bitte eine Abteilung wählen." }, 400);
        var jn = { id: nid("jp"), hotel_id: D.hotel.id, organization_id: ORG, title: s200(b.title, 160), department: s200(b.department, 80), employment: ["Vollzeit", "Teilzeit", "Saison", "Lehre", "Aushilfe"].indexOf(b.employment) >= 0 ? b.employment : "Vollzeit",
          description: s200(b.description, 8000), salary_note: s200(b.salary_note, 300), start_date: isoOr(b.start_date), status: ["Entwurf", "Veröffentlicht", "Geschlossen"].indexOf(b.status) >= 0 ? b.status : "Entwurf", public_token: null, created_at: nowS() };
        if (jn.status === "Veröffentlicht") jn.public_token = "DEMOjob" + Math.floor(Math.random() * 1e9) + "abcdefgh"; JOBS.unshift(jn); return ok(jn); }
      return ok(lead ? JOBS.slice().sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }) : []); }
    if ((mm = p.match(/^\/api\/job-postings\/([^/]+)$/))) { var jo = byId(JOBS, mm[1]); if (!jo || !lead) return deny(DENIED_J);
      if (m === "DELETE") { remove(JOBS, jo.id); return ok({ ok: true }); }
      ["title", "department", "description", "salary_note"].forEach(function (k) { if (b[k] !== undefined) jo[k] = s200(b[k], k === "description" ? 8000 : k === "salary_note" ? 300 : 160); });
      if (b.employment !== undefined && ["Vollzeit", "Teilzeit", "Saison", "Lehre", "Aushilfe"].indexOf(b.employment) >= 0) jo.employment = b.employment; if (b.start_date !== undefined) jo.start_date = isoOr(b.start_date);
      if (b.status !== undefined && ["Entwurf", "Veröffentlicht", "Geschlossen"].indexOf(b.status) >= 0) { jo.status = b.status; if (b.status === "Veröffentlicht" && !jo.public_token) jo.public_token = "DEMOjob" + Math.floor(Math.random() * 1e9) + "abcdefgh"; }
      if (b.new_token) jo.public_token = "DEMOjob" + Math.floor(Math.random() * 1e9) + "abcdefgh"; return ok(jo); }
    if (p === H + "/job-postings/draft" && m === "POST") { if (!lead) return deny(DENIED_J); var jt = s200(b.title, 160) || "Mitarbeiter:in";
      return ok({ titel: jt + " (m/w/d)", text: "BEISPIELTEXT AUS DER DEMO – in der echten Version schreibt die KI einen Vorschlag zu deiner Stelle.\n\nDein Alltag als " + jt + " bei uns:\n- Du bist Teil eines jungen Teams in einem neuen Haus\n- Du bekommst eine ausführliche Einschulung\n- Geregelte Dienstpläne und Mitarbeiterverpflegung\n\nWas wir uns wünschen:\n- Freude am Umgang mit Gästen\n- Zuverlässigkeit und Teamgeist\n\nWir freuen uns auf deine Bewerbung! Das kollektivvertragliche Mindestentgelt und die Bereitschaft zur Überzahlung ergänzt du bitte oben im Feld Gehalt." }); }
    if (p === H + "/applications") return ok(lead ? APPS.filter(function (a) { return !q.get("posting_id") || a.posting_id === q.get("posting_id"); }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }).map(appOut) : []);
    if ((mm = p.match(/^\/api\/applications\/([^/]+)\/cv$/))) { var apc = byId(APPS, mm[1]); if (!apc || !apc.cv || !lead) return ok({ error: "Kein Lebenslauf vorhanden." }, 404); return ok({ cv_data: CVDATA }); }
    if ((mm = p.match(/^\/api\/applications\/([^/]+)\/referral-paid$/)) && m === "POST") { var apr = byId(APPS, mm[1]); if (!apr || !hrNow()) return deny("Prämien verwaltet die Leitung Personal.");
      if (!apr.referred_by) return ok({ error: "Diese Bewerbung kam nicht über eine Empfehlung." }, 400); if (b.paid && apr.stage !== "Zusage") return ok({ error: "Die Prämie ist erst nach einer Zusage fällig." }, 400);
      apr.referral_paid_at = b.paid ? nowS() : null; return ok({ id: apr.id, referral_paid_at: apr.referral_paid_at }); }
    if ((mm = p.match(/^\/api\/applications\/([^/]+)$/)) && m === "PATCH") { var apa = byId(APPS, mm[1]); if (!apa || !lead) return deny("Bewerbungen sieht und pflegt nur die Leitung der Abteilung.");
      if (b.stage !== undefined) { if (["Eingegangen", "Gespräch", "Angebot", "Zusage", "Absage"].indexOf(b.stage) < 0) return ok({ error: "Unbekannter Status." }, 400);
        if (b.stage !== apa.stage) { apa.stage = b.stage; apa.updated_at = nowS(); if (b.stage === "Zusage" && apa.referred_by && apa.referral_bonus == null && Number(D.hotel.referral_settings.bonus) > 0) apa.referral_bonus = Number(D.hotel.referral_settings.bonus); } }
      if (b.interview_at !== undefined) { if (b.interview_at && isNaN(Date.parse(b.interview_at))) return ok({ error: "Bitte einen gültigen Termin angeben." }, 400); apa.interview_at = b.interview_at ? new Date(b.interview_at).toISOString() : null; }
      if (b.note !== undefined) apa.note = s200(b.note, 2000); return ok(appOut(apa)); }

    // --- Mitarbeiter-Empfehlung und Einstellungen
    if (p === H + "/referral-options") {
      var rs0 = D.hotel.referral_settings || {};
      return ok({ postings: JOBS.filter(function (j) { return j.status === "Veröffentlicht"; }).map(function (j) { return { id: j.id, title: j.title, department: j.department }; }),
        positions: D.staff.filter(function (s) { return (s.filled || 0) < (s.headcount || 1); }).map(function (s) { return { id: s.id, title: s.title, department: s.department }; }),
        settings: { bonus: Number(rs0.bonus) > 0 ? Number(rs0.bonus) : null, after_weeks: Number(rs0.after_weeks) > 0 ? Number(rs0.after_weeks) : null, note: s200(rs0.note, 500) } }); }
    if (p === H + "/referrals" && m === "POST") {
      var rname = s200(b.name, 120), rcon = s200(b.contact, 200); if (!rname || !rcon) return ok({ error: "Bitte Name und Kontakt angeben." }, 400);
      if (b.agreed !== true) return ok({ error: "Bitte bestätigen, dass die Person mit der Weitergabe ihrer Daten einverstanden ist." }, 400);
      var rmail = rcon.indexOf("@") >= 0; if (rmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rcon)) return ok({ error: "Ungültige E-Mail-Adresse." }, 400);
      var rpost = b.posting_id ? byId(JOBS, b.posting_id) : null, rpos = b.position_id ? byId(D.staff, b.position_id) : null; if (!rpost && !rpos) return ok({ error: "Bitte eine Stelle wählen." }, 400);
      var rna = { id: nid("ap"), hotel_id: D.hotel.id, position_id: rpos ? rpos.id : (rpost.department === "Housekeeping" ? posHk : posRez), posting_id: rpost ? rpost.id : null, name: rname, email: rmail ? rcon : null, phone: rmail ? null : rcon.slice(0, 60), stage: "Eingegangen", note: s200(b.note, 1000), source: "Empfehlung",
        interview_at: null, referred_by: ME, referral_bonus: null, referral_paid_at: null, consent_at: null, created_at: nowS(), updated_at: nowS(), cv: false };
      APPS.push(rna); return ok({ ok: true, id: rna.id }); }
    if (p === H + "/my-referrals") return ok(APPS.filter(function (a) { return a.referred_by === ME; }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }).map(function (a) {
      var pj = byId(JOBS, a.posting_id), ps = byId(D.staff, a.position_id); return { id: a.id, name: a.name, position: pj ? pj.title : ps ? ps.title : "", created_at: a.created_at, status: a.stage === "Zusage" ? "eingestellt" : a.stage === "Absage" ? "abgesagt" : "läuft" }; }));
    if (p === H + "/referral-bonuses") { if (!hrNow()) return deny("Prämien verwaltet die Leitung Personal.");
      var rs1 = D.hotel.referral_settings || {}, wk = Number(rs1.after_weeks) > 0 ? Number(rs1.after_weeks) : 0;
      return ok({ settings: { bonus: Number(rs1.bonus) > 0 ? Number(rs1.bonus) : null, after_weeks: wk || null, note: rs1.note || "" },
        list: APPS.filter(function (a) { return a.referred_by; }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }).map(function (a) {
          var pj = byId(JOBS, a.posting_id), ps = byId(D.staff, a.position_id);
          return { id: a.id, name: a.name, stage: a.stage, referred_by: a.referred_by, referral_bonus: a.referral_bonus, referral_paid_at: a.referral_paid_at, created_at: a.created_at, updated_at: a.updated_at, position: pj ? pj.title : ps ? ps.title : "", due_on: a.stage === "Zusage" ? add(String(a.updated_at).slice(0, 10), wk * 7) : null }; }) }); }
    if (p === H + "/team-settings") {
      if (m === "PUT") { var tso = {};
        var tnum = function (v, max) { var n = Number(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) && String(v == null ? "" : v) !== "" && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null; };
        if (b.referral_settings !== undefined) { if (!hrNow()) return deny("Die Empfehlungsprämie stellt die Leitung Personal ein."); var rr = b.referral_settings || {};
          tso.referral_settings = { bonus: tnum(rr.bonus, 100000), after_weeks: tnum(rr.after_weeks, 104) === null ? null : Math.round(tnum(rr.after_weeks, 104)), note: s200(rr.note, 500) }; }
        if (b.safety_settings !== undefined) { if (!hrNow() && !(ROLE === "manager" && MYDEPTS.indexOf("Sicherheit") >= 0)) return deny("Die Mindestbesetzung stellt die Leitung Personal oder Sicherheit ein."); var ss = b.safety_settings || {}, ti = function (v) { var n = Math.round(Number(v)); return n >= 0 && n <= 50 ? n : 0; };
          tso.safety_settings = { min_first_aid: ti(ss.min_first_aid), min_fire: ti(ss.min_fire) }; }
        if (!Object.keys(tso).length) return ok({ error: "Nichts zu speichern." }, 400);
        Object.assign(D.hotel, tso); return ok({ referral_settings: D.hotel.referral_settings, safety_settings: D.hotel.safety_settings }); }
      return ok({ referral_settings: D.hotel.referral_settings || {}, safety_settings: D.hotel.safety_settings || {} }); }

    // --- Probezeit
    var DENIED_P = "Probezeit-Gespräche führt die Leitung Personal.";
    if (p === H + "/probation") { if (!hrNow()) return deny(DENIED_P);
      var planned = {}; PROB.forEach(function (r) { planned[r.user_id] = 1; });
      var fresh = D.onboardings.filter(function (o) { return !planned[o.user_id] && o.start_date >= dAt(-120); }).map(function (o) { return { user_id: o.user_id, start_date: o.start_date, from_onboarding: true }; });
      return ok({ reviews: PROB.slice().sort(function (a, c) { return a.due_on < c.due_on ? -1 : 1; }), new_members: fresh, country: D.hotel.country || null }); }
    if (p === H + "/probation/plan" && m === "POST") { if (!hrNow()) return deny(DENIED_P);
      if (!byId(D.members.map(function (x) { return { id: x.user_id }; }), b.user_id)) return ok({ error: "Bitte eine Person wählen." }, 400); if (!isoOr(b.start_date)) return ok({ error: "Bitte das Eintrittsdatum angeben." }, 400);
      var pw = (Array.isArray(b.weeks) ? b.weeks : [2, 6, 10]).map(Number).filter(function (w, i, a) { return w >= 1 && w <= 26 && a.indexOf(w) === i; }).sort(function (x, y) { return x - y; }).slice(0, 6);
      if (!pw.length) return ok({ error: "Bitte mindestens eine Woche angeben (1–26)." }, 400);
      var made = []; pw.forEach(function (w) { if (PROB.some(function (r) { return r.user_id === b.user_id && r.week === w; })) return;
        var r = { id: nid("pr"), hotel_id: D.hotel.id, organization_id: ORG, user_id: b.user_id, week: w, due_on: add(b.start_date, w * 7), done_at: null, done_by: null, rating: null, notes: null }; PROB.push(r); made.push(r); });
      return ok(made); }
    if ((mm = p.match(/^\/api\/probation-reviews\/([^/]+)$/))) { var pro = byId(PROB, mm[1]); if (!pro || !hrNow()) return deny(DENIED_P);
      if (m === "DELETE") { remove(PROB, pro.id); return ok({ ok: true }); }
      if (b.notes !== undefined) pro.notes = s200(b.notes, 5000); if (b.rating !== undefined) pro.rating = ["gut", "in Ordnung", "kritisch"].indexOf(b.rating) >= 0 ? b.rating : null;
      if (b.due_on !== undefined) { if (!isoOr(b.due_on)) return ok({ error: "Bitte ein gültiges Datum angeben." }, 400); pro.due_on = b.due_on; }
      if (b.done !== undefined) { pro.done_at = b.done ? nowS() : null; pro.done_by = b.done ? ME : null; } return ok(pro); }

    // --- Qualifikationen und Ersthelfer im Dienst
    var DENIED_QL = "Qualifikationen pflegt die Leitung Personal oder Sicherheit.", canQual = hrNow() || (ROLE === "manager" && MYDEPTS.indexOf("Sicherheit") >= 0);
    if (p === "/api/organizations/demo-org/qualifications") {
      if (m === "POST") { if (!canQual) return deny(DENIED_QL); var QK = ["Erste Hilfe", "Brandschutz", "Evakuierungshelfer", "Sicherheitsvertrauensperson", "Hygiene", "Sonstiges"];
        if (!b.user_id) return ok({ error: "Bitte eine Person wählen." }, 400); if (QK.indexOf(b.kind) < 0) return ok({ error: "Bitte die Art der Qualifikation wählen." }, 400);
        var qln = { id: nid("ql"), organization_id: ORG, user_id: b.user_id, kind: b.kind, valid_until: isoOr(b.valid_until), note: s200(b.note, 500) }; QUALS.push(qln); return ok(qln); }
      return ok(QUALS.filter(function (x) { return lead || x.user_id === ME; }).sort(function (a, c) { return String(a.valid_until || "9") < String(c.valid_until || "9") ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/qualifications\/([^/]+)$/))) { var qlo = byId(QUALS, mm[1]); if (!qlo || !canQual) return deny(DENIED_QL);
      if (m === "DELETE") { remove(QUALS, qlo.id); return ok({ ok: true }); }
      if (b.kind !== undefined) qlo.kind = b.kind; if (b.valid_until !== undefined) qlo.valid_until = isoOr(b.valid_until); if (b.note !== undefined) qlo.note = s200(b.note, 500); return ok(qlo); }
    if (p === H + "/on-duty") { if (meRow.role === "viewer") return deny("Nicht berechtigt.");
      var qs0 = qualSet(todayIso), hh = new Date(), at0 = String(hh.getHours()).padStart(2, "0") + ":" + String(hh.getMinutes()).padStart(2, "0"), since = new Date(); since.setHours(6, 0, 0, 0);
      var pres = [["u-fo", "Rezeption & Empfang", "Stempeluhr"], ["u-member", "Housekeeping", "Stempeluhr"], ["u-ewa", "Housekeeping", "Stempeluhr"], ["u-it", "IT & Systeme", "Dienstplan"], [null, "Food & Beverage", "Dienstplan"]].map(function (x) {
        var o = { user_id: x[0], name: x[0] ? null : "Joana Silva", department: x[1], via: x[2] }; if (x[2] === "Stempeluhr") o.since = since.toISOString(); else o.shift = "Früh 06:00–14:30";
        o.first_aid = !!(x[0] && qs0[x[0]] && qs0[x[0]]["Erste Hilfe"]); o.fire = !!(x[0] && qs0[x[0]] && qs0[x[0]]["Brandschutz"]); return o; });
      var sf = D.hotel.safety_settings || {}, mi = { min_first_aid: Number(sf.min_first_aid) || 0, min_fire: Number(sf.min_fire) || 0 }, fa0 = pres.filter(function (x) { return x.first_aid; }), fi0 = pres.filter(function (x) { return x.fire; });
      return ok({ min_first_aid: mi.min_first_aid, min_fire: mi.min_fire, total: pres.length, first_aid: fa0, fire: fi0, warn_first_aid: mi.min_first_aid > 0 && fa0.length < mi.min_first_aid, warn_fire: mi.min_fire > 0 && fi0.length < mi.min_fire, present: lead ? pres : undefined, at: at0 }); }
    if (p === H + "/first-aid-roster") { if (!lead) return deny("Nicht berechtigt.");
      var rfrom = isoOr(q.get("from")) || todayIso, rn = Math.min(31, Math.max(1, Number(q.get("days")) || 7)), sf2 = D.hotel.safety_settings || {}, rdays = [];
      for (var ri = 0; ri < rn; ri++) { var rd = add(rfrom, ri), per = {}, qd = qualSet(rd);
        D.shifts.filter(function (s) { return s.shift_date === rd && ["Früh", "Spät", "Nacht", "Zwischen"].indexOf(s.kind) >= 0; }).forEach(function (s) {
          var c = per[s.kind] || (per[s.kind] = { total: 0, first_aid: 0, fire: 0, seen: {} }), k = s.user_id || "x" + c.total; if (c.seen[k]) return; c.seen[k] = 1; c.total++;
          if (s.user_id && qd[s.user_id] && qd[s.user_id]["Erste Hilfe"]) c.first_aid++; if (s.user_id && qd[s.user_id] && qd[s.user_id]["Brandschutz"]) c.fire++; });
        var sh = {}; Object.keys(per).forEach(function (k) { sh[k] = { total: per[k].total, first_aid: per[k].first_aid, fire: per[k].fire }; }); rdays.push({ date: rd, shifts: sh }); }
      return ok({ min_first_aid: Number(sf2.min_first_aid) || 0, min_fire: Number(sf2.min_fire) || 0, days: rdays }); }

    // --- Übungsgast (feste Beispieltexte, keine KI)
    if (p === H + "/roleplay") {
      if (m === "POST") { var rsk = b.scenario === "frei" ? "frei" : RP_OPEN.de[b.scenario] ? b.scenario : null; if (!rsk) return ok({ error: "Bitte ein Szenario wählen." }, 400);
        var rcu = rsk === "frei" ? s200(b.custom, 600) : null; if (rsk === "frei" && !rcu) return ok({ error: "Bitte die Situation kurz beschreiben." }, 400);
        var rl = /^(de|en|fr|it|es|pt|tr|ja|zh|ar)$/.test(String(b.language || "")) ? b.language : "de", open1 = rsk === "frei" ? (rpLang(rl) === "en" ? "Hello, I have a concern: " : "Guten Tag, ich habe ein Anliegen: ") + rcu : RP_OPEN[rpLang(rl)][rsk];
        var rsn = { id: nid("rp"), hotel_id: D.hotel.id, user_id: ME, scenario: rsk === "frei" ? "frei:" + rcu : rsk, language: rl, score: null, feedback: null, finished_at: null, created_at: nowS(), transcript: [{ role: "guest", text: "(Beispielgast aus der Demo, keine KI) " + open1 }] };
        RP.unshift(rsn); return ok(rsn); }
      var rall = q.get("all") === "1" && lead;
      return ok(RP.filter(function (s) { return rall || s.user_id === ME; }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; }).map(function (s) {
        return q.get("full") ? s : { id: s.id, user_id: s.user_id, scenario: s.scenario, language: s.language, score: s.score, feedback: s.feedback, finished_at: s.finished_at, created_at: s.created_at }; })); }
    if ((mm = p.match(/^\/api\/roleplay\/([^/]+)$/))) { var rpo = byId(RP, mm[1]);
      if (m === "DELETE") { if (!rpo || rpo.user_id !== ME) return deny("Nicht berechtigt."); remove(RP, rpo.id); return ok({ ok: true }); }
      if (!rpo || (rpo.user_id !== ME && !lead)) return nf(); return ok(rpo); }
    if ((mm = p.match(/^\/api\/roleplay\/([^/]+)\/turn$/)) && m === "POST") { var rpt = byId(RP, mm[1]); if (!rpt || rpt.user_id !== ME) return nf();
      if (rpt.finished_at) return ok({ error: "Diese Übung ist schon beendet." }, 400); var rtx = s200(b.text, 1000); if (!rtx) return ok({ error: "Bitte eine Antwort eingeben." }, 400);
      if (rpt.transcript.length >= 40) return ok({ error: "Die Übung ist lang genug – bitte beenden und die Rückmeldung ansehen." }, 400);
      rpt.transcript.push({ role: "staff", text: rtx }); var nst = rpt.transcript.filter(function (x) { return x.role === "staff"; }).length, nxt = RP_NEXT[rpLang(rpt.language)];
      rpt.transcript.push({ role: "guest", text: nxt[Math.min(nst - 1, nxt.length - 1)] }); return ok(Object.assign({}, rpt, { satisfied: nst >= 3 })); }
    if ((mm = p.match(/^\/api\/roleplay\/([^/]+)\/finish$/)) && m === "POST") { var rpf = byId(RP, mm[1]); if (!rpf || rpf.user_id !== ME) return nf(); if (rpf.finished_at) return ok(rpf);
      if (rpf.transcript.some(function (x) { return x.role === "staff"; })) { rpf.feedback = RP_FEEDBACK; rpf.score = RP_FEEDBACK.punktzahl; } rpf.finished_at = nowS(); return ok(rpf); }

    // --- Dienstzeugnis-Entwurf (fester Beispieltext)
    if (p === H + "/reference-letter" && m === "POST") { if (!hrNow()) return deny("Dienstzeugnisse erstellt die Leitung Personal.");
      var rlm = D.members.find(function (x) { return x.user_id === b.user_id; }); if (!b.user_id) return ok({ error: "Bitte eine Person wählen." }, 400); if (!rlm) return ok({ error: "Diese Person gehört nicht zur Organisation." }, 400);
      var rnm = s200(b.name, 120) || "[Name]", rps = s200(b.position, 120) || "[Position]", rst = isoOr(b.start_date) || "[Eintrittsdatum]", ren = isoOr(b.end_date) || "[Austrittsdatum]", rat = b.country !== "DE", rdep = (rlm.departments || []).join(", ") || "[Abteilung]";
      var rtxt = (rat ? "Dienstzeugnis" : "Arbeitszeugnis") + " (BEISPIELTEXT AUS DER DEMO – kein KI-Entwurf)\n\n" + rnm + " war vom " + rst + " bis " + ren + " in unserem Haus " + D.hotel.name + " als " + rps + " in der Abteilung " + rdep + " beschäftigt.\n\n"
        + "Aufgaben: " + (s200(b.tasks, 2000) || "[Aufgaben ergänzen]") + "\n\n" + (b.type === "qualifiziert" ? "Frau/Herr " + rnm + " erledigte die übertragenen Aufgaben stets zu unserer vollen Zufriedenheit, zuverlässig und selbstständig. Das Verhalten gegenüber Vorgesetzten, Kolleg:innen und Gästen war stets vorbildlich.\n\n" : "")
        + "Das Dienstverhältnis endete [Grund des Austritts]. Wir danken für die Zusammenarbeit und wünschen alles Gute für die Zukunft.\n\n[Ort], am [Datum]\n\n[Name und Unterschrift der Leitung]";
      return ok({ text: rtxt, hinweise: ["Beispieltext aus der Demo: In der echten Version erstellt die KI einen Entwurf aus Eintritt, Kursen und Notizen.", "Platzhalter in eckigen Klammern ergänzen und vor der Ausgabe von der Leitung prüfen und unterschreiben lassen."], draft: true,
        input: { eintritt: rst, austritt: ren, abteilung: rdep, kurse: 0, unterweisungen: 0 } }); }

    // --- Gäste: Einstellungen, Meldeschein, Warteschlange, Wiederkehr-Mail, Fundsachen-Rückversand
    if (p === H + "/guest-settings" && m === "PUT") { if (ROLE !== "admin") return deny("Nur Admins können das einstellen.");
      var gso = {}, gok = false;
      if (b.registration_settings !== undefined) { var rg = b.registration_settings || {}; D.hotel.registration_settings = { enabled: !!rg.enabled, require_id: !!rg.require_id }; gok = true; }
      if (b.queue_settings !== undefined) { var qsn2 = b.queue_settings || {}, ar0 = [], seen0 = {}; (Array.isArray(qsn2.areas) ? qsn2.areas : []).forEach(function (a) { a = String(a || "").replace(/[<>]/g, "").trim().slice(0, 40); if (a && !seen0[a]) { seen0[a] = 1; ar0.push(a); } });
        D.hotel.queue_settings = { enabled: !!qsn2.enabled, areas: ar0.slice(0, 8), token: b.rotate_queue_token ? "DEMOwarteschlange" + Math.floor(Math.random() * 1e7) : (D.hotel.queue_settings || {}).token || "DEMOwarteschlangeAlpenblick" }; gok = true; }
      if (b.occasion_mail !== undefined) { var om = b.occasion_mail || {}; D.hotel.occasion_mail = { enabled: !!om.enabled, anniversary: om.anniversary !== false, birthday: !!om.birthday, offer: String(om.offer || "").trim().slice(0, 600) }; gok = true; }
      if (b.lost_found_shipping !== undefined) { var ls = b.lost_found_shipping || {}, lfee = Number(String(ls.fee == null ? "" : ls.fee).replace(",", ".")), llink = String(ls.payment_link || "").trim().slice(0, 500);
        if (llink && !/^https:\/\/[^\s<>"']+$/i.test(llink)) return ok({ error: "Der Zahlungslink muss mit https:// beginnen." }, 400);
        D.hotel.lost_found_shipping = { enabled: !!ls.enabled, fee: lfee >= 0 && lfee <= 500 ? Math.round(lfee * 100) / 100 : 0, payment_link: llink, note: String(ls.note || "").trim().slice(0, 500) }; gok = true; }
      if (b.floor_settings !== undefined) { var fl0 = b.floor_settings || {}, fk = Number(fl0.kwh_per_floor_day), fp = Number(fl0.price_kwh);
        D.hotel.floor_settings = { kwh_per_floor_day: fk >= 0 && fk <= 5000 ? fk : 0, price_kwh: fl0.price_kwh !== "" && fl0.price_kwh != null && fp >= 0 && fp <= 5 ? fp : null }; gok = true; }
      if (b.pos_enabled !== undefined) { D.hotel.pos_settings = Object.assign({}, D.hotel.pos_settings, { enabled: !!b.pos_enabled }); gok = true; }
      if (!gok) return ok({ error: "Nichts zu ändern." }, 400); return ok(D.hotel); }
    if (p === H + "/registrations") { if (!(lead || hasDept("Rezeption & Empfang"))) return deny("Meldescheine sieht die Rezeption.");
      var gto = isoOr(q.get("to")) || todayIso, gfrom = isoOr(q.get("from")) || add(gto, -31), gtoDemo = add(gto, 7); // Demo: Anreisen der nächsten Tage zählen mit
      return ok(D.arrivals.filter(function (g) { return g.registration_at && g.arrival_date >= gfrom && g.arrival_date <= gtoDemo; }).sort(function (a, c) { return a.arrival_date < c.arrival_date ? -1 : 1; }).map(function (g) {
        return { id: g.id, guest_name: g.guest_name, arrival_date: g.arrival_date, departure_date: g.departure_date, adults: g.adults, children: g.children, country: g.country, assigned_room: g.assigned_room || null, birth_date: g.birth_date, nationality: g.nationality, street: g.street, zip: g.zip, city: g.city,
          address_country: g.address_country, id_doc_type: g.id_doc_type, id_doc_number: g.id_doc_number, companions: g.companions || [], registration_at: g.registration_at }; })); }
    if (p === H + "/queue") { var qarea = q.get("area"); return ok(QUEUE.filter(function (x) { return !qarea || x.area === qarea; }).sort(function (a, c) { return a.created_at < c.created_at ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/queue\/([^/]+)$/)) && m === "PATCH") { var qe = byId(QUEUE, mm[1]); if (["wartet", "aufgerufen", "platziert", "abgesagt"].indexOf(b.status) < 0) return ok({ error: "Unbekannter Status." }, 400); if (!qe) return deny("Nicht berechtigt.");
      qe.status = b.status; if (b.status === "aufgerufen") { qe.called_at = nowS(); qe.done_at = null; } else if (b.status === "wartet") { qe.called_at = null; qe.done_at = null; } else qe.done_at = nowS(); return ok(qe); }
    if (p === H + "/marketing-stats") { if (!(lead || hasDept("Rezeption & Empfang"))) return deny("Gästeprofile sieht die Rezeption."); return ok({ confirmed: 186, pending: 14, unsubscribed: 5, mailed_30d: 23 }); }
    if (p === H + "/occasion-mail/preview") { var okind = q.get("kind") === "birthday" ? "birthday" : "anniversary", ol = q.get("lang") === "en" ? "en" : "de", offer = (D.hotel.occasion_mail || {}).offer || "";
      var osub = ol === "en" ? (okind === "birthday" ? "Happy birthday from " : "One year ago you stayed with us – ") + D.hotel.name : (okind === "birthday" ? "Alles Gute zum Geburtstag von " : "Vor einem Jahr waren Sie bei uns zu Gast – ") + D.hotel.name;
      var otx = ol === "en" ? (okind === "birthday" ? "We wish you a wonderful birthday." : "We would be delighted to welcome you again.") : (okind === "birthday" ? "Wir wünschen Ihnen einen wunderschönen Geburtstag." : "Wir würden uns freuen, Sie bald wieder bei uns zu begrüßen.");
      return ok({ subject: osub, html: "<div style=\"font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1C2430\"><h2 style=\"font-family:Georgia,serif\">" + osub + "</h2><p>" + (ol === "en" ? "Hello Maria Muster," : "Guten Tag Maria Muster,") + "</p><p>" + otx + "</p>"
        + (offer ? "<div style=\"padding:12px 14px;background:#F6F4EF;border-radius:8px\"><b>" + (ol === "en" ? "Our offer" : "Unser Angebot") + "</b><br>" + offer + "</div>" : "") + "<p style=\"font-size:12px;color:#6B7280;margin-top:24px\">Vorschau mit Beispielname (Demo)</p></div>" }); }
    if ((mm = p.match(/^\/api\/lost-found\/([^/]+)\/shipping$/))) { var lfs = byId(D.lost_found, mm[1]); if (!lfs) return nf(); return ok(shipOut(lfs)); }
    if ((mm = p.match(/^\/api\/lost-found\/([^/]+)\/ship-offer$/)) && m === "POST") { var lfo = byId(D.lost_found, mm[1]); if (!lfo) return nf(); if (lfo.status !== "Aufbewahrt") return ok({ error: "Diese Fundsache ist schon abgeschlossen." }, 400);
      var lsh = D.hotel.lost_found_shipping || {}; if (!lsh.enabled || !lsh.payment_link) return ok({ error: "Bitte zuerst den Rückversand mit Gebühr und Zahlungslink einstellen." }, 400);
      var lto = s200(b.email, 200); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lto)) return ok({ error: "Bitte die E-Mail-Adresse des Gastes angeben." }, 400);
      SHIP[lfo.id] = { ship_status: "angefragt", ship_token: "DEMOfundsache" + lfo.id.replace(/\W/g, ""), ship_fee: lsh.fee, ship_requested_at: nowS(), paid_confirmed_at: null, shipped_at: null, tracking: null, guest_name: lfo.guest_name || null, guest_contact: lto, ship_address: { lang: b.language || "de" } };
      return ok(shipOut(lfo)); }
    if ((mm = p.match(/^\/api\/lost-found\/([^/]+)\/ship-status$/)) && m === "POST") { var lfp = byId(D.lost_found, mm[1]); if (["bezahlt", "versendet"].indexOf(b.status) < 0) return ok({ error: "Unbekannter Status." }, 400); if (!lfp || !SHIP[lfp.id]) return nf();
      var sh2 = SHIP[lfp.id]; if (b.status === "bezahlt") { sh2.ship_status = "bezahlt"; sh2.paid_confirmed_at = nowS(); } else { sh2.ship_status = "versendet"; sh2.shipped_at = nowS(); sh2.tracking = s200(b.tracking, 120) || null; sh2.paid_confirmed_at = sh2.paid_confirmed_at || nowS(); lfp.status = "Zurückgegeben"; lfp.closed_at = nowS(); lfp.returned_to = ("Versand" + (sh2.tracking ? " " + sh2.tracking : "")).slice(0, 200); }
      return ok(Object.assign(shipOut(lfp), { mailed: false })); }

    // --- Zimmer: Etagen-Vorschlag, Reinigungs-Reihenfolge, Lebenslauf, Problemzimmer
    if (p === H + "/floor-plan") { if (!(lead || hasDept("Rezeption & Empfang"))) return deny("Die Zimmerverteilung sieht die Rezeption.");
      var fdate = isoOr(q.get("date")) || todayIso, frs = fdate === todayIso ? D.rooms : D.rooms.map(function (r) { return Object.assign({}, r, { occupancy: "Unbelegt", status: r.status === "Außer Betrieb" ? r.status : "Sauber" }); });
      var fplan = floorPlanAssign(frs, D.arrivals.filter(function (a) { return a.arrival_date === fdate; })), ffs = D.hotel.floor_settings || {}, fmeter = (D.meters || []).find(function (x) { return x.kind === "Strom" && Number(x.price_per_unit) > 0; });
      var fprice = fmeter ? Number(fmeter.price_per_unit) : ffs.price_kwh != null ? ffs.price_kwh : null, fkwh = fplan.empty_floors.length * (ffs.kwh_per_floor_day || 0);
      return ok(Object.assign({ date: fdate }, fplan, { kwh_per_floor_day: ffs.kwh_per_floor_day || 0, kwh_saved: fkwh, price_kwh: fprice, price_source: fmeter ? "zaehler" : fprice != null ? "einstellung" : null, saving: fprice != null && fkwh ? Math.round(fkwh * fprice * 100) / 100 : null, status_live: fdate === todayIso })); }
    if (p === H + "/floor-plan/apply" && m === "POST") { if (!(lead || hasDept("Rezeption & Empfang"))) return deny("Zimmer weist die Rezeption zu.");
      var fl2 = (Array.isArray(b.assignments) ? b.assignments : []).slice(0, 500); if (!fl2.length) return ok({ error: "Nichts zu übernehmen." }, 400);
      var fsaved = 0; fl2.forEach(function (a) { var ga = byId(D.arrivals, a && a.arrival_id); if (!ga) return; var rn2 = a.room === null || a.room === "" ? null : String(a.room || "").trim(); if (rn2 !== null && !D.rooms.some(function (r) { return r.number === rn2; })) return; ga.assigned_room = rn2; fsaved++; });
      if (!fsaved) return deny("Zimmer weist die Rezeption zu."); return ok({ saved: fsaved }); }
    if (p === H + "/cleaning-order") return ok(cleaningOrderList());
    if ((mm = p.match(/^\/api\/rooms\/([^/]+)\/history$/))) { var hr0 = byId(D.rooms, mm[1]); if (!hr0) return nf();
      var hnr = String(hr0.number), hts = allTickets().filter(function (t) { return mentionsRoom(t.location, hnr); }), hin = D.room_insp.filter(function (x) { return x.room_id === hr0.id; }).concat(HIST_INSP.filter(function (x) { return x.room_id === hr0.id; }));
      if (EQ_INSP[hr0.id] && !hin.length) hin.push({ id: "hi-eq", room_id: hr0.id, passed: EQ_INSP[hr0.id].passed, created_at: EQ_INSP[hr0.id].created_at, note: "Abnahme Erstausstattung" });
      var hmb = D.minibar_charges.filter(function (c) { return c.room_id === hr0.id; }), hlf = D.lost_found.filter(function (x) { return mentionsRoom(x.location, hnr); });
      var hev = lead ? [["Sauber", 26], ["Schmutzig", 50], ["Kontrolliert", 74]].map(function (x) { return { status: x[0], at: hoursAgoIso(x[1]), by_user: "u-hkm" }; }) : [];
      var htl = hts.map(function (x) { return { kind: "meldung", at: x.created_at, title: x.title, status: x.status, priority: x.priority, id: x.id }; })
        .concat(hin.map(function (x) { return { kind: "abnahme", at: x.created_at, passed: x.passed, title: x.note || "", id: x.id }; }))
        .concat(hmb.map(function (x) { return { kind: "minibar", at: x.charged_at, title: x.quantity + " × " + x.item_name, billed: !!x.billed_at, amount: Math.round(x.quantity * x.unit_price * 100) / 100, id: x.id }; }))
        .concat(hlf.map(function (x) { return { kind: "fundsache", at: x.found_on, title: x.description, status: x.status, id: x.id }; }))
        .concat(hev.map(function (x) { return { kind: "status", at: x.at, title: x.status }; })).sort(function (a, c) { return String(c.at).localeCompare(String(a.at)); }).slice(0, 400);
      var h90 = hoursAgoIso(24 * 90), heq = EQ[hr0.id];
      return ok({ room: { id: hr0.id, number: hnr, floor: hr0.floor || floorOfR(hr0), room_type: hr0.room_type, status: hr0.status, occupancy: hr0.occupancy, note: hr0.note, accessibility: hr0.accessibility || {} },
        equipment: heq ? { delivered: heq.delivered, installed: heq.installed, note: heq.note, updated_at: heq.updated_at } : null, timeline: htl,
        counts: { tickets: hts.length, tickets_90d: hts.filter(function (x) { return x.created_at >= h90; }).length, open_tickets: hts.filter(function (x) { return x.status !== "Erledigt"; }).length, inspections: hin.length, failed_inspections: hin.filter(function (x) { return !x.passed; }).length,
          minibar_unbilled: hmb.filter(function (x) { return !x.billed_at; }).length, lost_found: hlf.length }, status_log: hev.length > 0 }); }
    if (p === H + "/problem-rooms") { var h90b = hoursAgoIso(24 * 90), alt = allTickets().filter(function (t) { return t.location && t.created_at >= h90b; });
      var prs = D.rooms.map(function (r) { var t = alt.filter(function (x) { return mentionsRoom(x.location, r.number); });
        return { id: r.id, number: r.number, floor: r.floor || floorOfR(r), room_type: r.room_type, status: r.status, tickets_90d: t.length, open: t.filter(function (x) { return x.status !== "Erledigt"; }).length, urgent: t.filter(function (x) { return x.priority === "Dringend"; }).length, last_at: t.map(function (x) { return x.created_at; }).sort().pop() || null }; })
        .filter(function (r) { return r.tickets_90d > 0; }).sort(function (a, c) { return c.tickets_90d - a.tickets_90d || c.urgent - a.urgent || cmpNum(a.number, c.number); });
      return ok(prs.slice(0, Math.min(50, Number(q.get("limit")) || 10))); }

    // --- Kassen-Anbindung
    if (p === H + "/pos/token" && m === "POST") { if (ROLE !== "admin") return deny("Nur Admins können das einstellen.");
      var ptk = "DEMO-BEISPIEL-" + Math.floor(Math.random() * 1e9); D.hotel.pos_settings = { enabled: true, token_hash: "demo-" + ptk, token_created_at: nowS() };
      return ok({ token: ptk, endpoint: "https://hpoos-backend-1.onrender.com/api/public/pos/" + ptk }); }
    if (p === H + "/pos-sales") { if (!lead) return deny("Kassenumsätze sieht die Leitung."); var pmo = /^\d{4}-\d{2}$/.test(String(q.get("month") || "")) ? q.get("month") : todayIso.slice(0, 7);
      return ok({ month: pmo, rows: POS.filter(function (r) { return r.sale_date.slice(0, 7) === pmo; }).sort(function (a, c) { return a.sale_date < c.sale_date ? -1 : a.sale_date > c.sale_date ? 1 : a.outlet < c.outlet ? -1 : 1; }) }); }
    if (p === H + "/pos-sales/import" && m === "POST") { if (!lead) return deny("Kassenumsätze pflegt die Leitung."); var plist = Array.isArray(b.rows) ? b.rows.slice(0, 3000) : [], prow = [], pskip = [];
      plist.forEach(function (r, i) { try { prow.push(cleanPosRow(r)); } catch (e) { if (pskip.length < 20) pskip.push({ row: i + 1, error: e.message }); } });
      if (!prow.length) return ok({ error: "In der Datei wurden keine gültigen Tageszeilen erkannt.", skipped: pskip }, 400);
      prow.forEach(function (r) { var ex = POS.find(function (x) { return x.sale_date === r.sale_date && x.outlet === r.outlet; }); if (ex) Object.assign(ex, r, { source: "csv" }); else POS.push(Object.assign({ id: nid("pos"), source: "csv", created_at: nowS() }, r)); });
      return ok({ saved: prow.length, skipped: pskip, skipped_count: plist.length - prow.length }); }
    if ((mm = p.match(/^\/api\/pos-sales\/([^/]+)$/)) && m === "DELETE") { if (!lead || !byId(POS, mm[1])) return deny("Nicht berechtigt."); remove(POS, mm[1]); return ok({ ok: true }); }
    if (p === H + "/pos-sales/cash-to-book" && m === "POST") { if (!lead) return deny("Kassenbuch: nicht berechtigt."); var cdate = String(b.date || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(cdate)) return ok({ error: "Bitte ein Datum wählen." }, 400);
      var ccr = [], csales = POS.filter(function (x) { return x.sale_date === cdate && (typeof b.outlet !== "string" || x.outlet === b.outlet); });
      csales.forEach(function (s) { var amt = Math.round(Number(s.cash || 0) * 100) / 100; if (!(amt > 0)) return; var note = ("Barumsatz Kasse " + (s.outlet || "gesamt") + " " + cdate).slice(0, 500);
        if (D.cash.some(function (x) { return x.entry_date === cdate && x.note === note; })) return;
        var ce2 = { id: nid("cash"), entry_date: cdate, direction: "ein", category: "Sonstiges", amount: amt, note: note, department: "Food & Beverage", created_by: ME, created_at: nowS(), has_receipt: false }; D.cash.push(ce2); ccr.push({ outlet: s.outlet, id: ce2.id, amount: amt }); });
      return ok({ created: ccr, skipped: csales.length - ccr.length }); }

    return ok({});
  };
})();
