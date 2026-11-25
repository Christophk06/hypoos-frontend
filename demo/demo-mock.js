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
  /* Paket 044: Preisempfehlung, Tischreservierung, Gutscheine, Unterkunft-Erweiterung (alles nur im Speicher) */
  D.housing_assignments.forEach(function (a) { if (a.deduction_month === undefined) a.deduction_month = a.id === "ha-1" ? 150 : a.id === "ha-3" ? 120 : null; });
  var HO = [{ id: "hov-1", assignment_id: "ha-1", hotel_id: AH, kind: "einzug", day: add(todayIso, -200), keys: 2, damages: null, signer_name: null, signature_data: null, created_at: now.toISOString(),
    meters: { Strom: "12345", Wasser: "208" }, items: [{ label: "Wände und Decke", ok: true, note: null }, { label: "Bett und Matratze", ok: true, note: null }, { label: "Schrank", ok: true, note: null }, { label: "Bad und WC", ok: false, note: "Silikonfuge leicht verfärbt" }, { label: "Fenster und Türen", ok: true, note: null }] },
    { id: "hov-2", assignment_id: "ha-5", hotel_id: AH, kind: "auszug", day: add(todayIso, -10), keys: 2, damages: "Keine Schäden. Sauber zurückgegeben.", signer_name: "Anna K.", signature_data: null, created_at: now.toISOString(),
    meters: { Strom: "12980" }, items: [{ label: "Wände und Decke", ok: true, note: null }, { label: "Bad und WC", ok: true, note: null }] }];
  function hoClean(b, partial) {
    var o = {}, t = function (v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n) || null; };
    if (!partial || b.kind !== undefined) { if (["einzug", "auszug"].indexOf(b.kind) < 0) throw new Error("Bitte Einzug oder Auszug wählen."); o.kind = b.kind; }
    if (!partial || b.day !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.day || ""))) throw new Error("Bitte ein Datum angeben."); o.day = b.day; }
    if (b.items !== undefined) { if (!Array.isArray(b.items) || b.items.length > 60) throw new Error("Zu viele Punkte."); o.items = b.items.map(function (x) { return { label: t(x && x.label, 120) || "", ok: x && x.ok === true ? true : x && x.ok === false ? false : null, note: t(x && x.note, 300) }; }).filter(function (x) { return x.label; }); }
    if (b.meters !== undefined) { var mt = b.meters && typeof b.meters === "object" && !Array.isArray(b.meters) ? b.meters : {}, mo = {}; Object.keys(mt).slice(0, 10).forEach(function (k) { var v = t(mt[k], 40); if (k && v) mo[String(k).slice(0, 40)] = v; }); o.meters = mo; }
    if (b.keys !== undefined) { var n = b.keys === "" || b.keys == null ? null : Math.round(Number(b.keys)); if (n !== null && !(n >= 0 && n <= 50)) throw new Error("Schlüssel: 0 bis 50."); o.keys = n; }
    if (b.damages !== undefined) o.damages = t(b.damages, 2000);
    if (b.signer_name !== undefined) o.signer_name = t(b.signer_name, 120);
    if (b.signature_data !== undefined) { var sg = b.signature_data || null; if (sg && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sg) || sg.length > 200000)) throw new Error("Ungültige Unterschrift."); o.signature_data = sg; }
    return o;
  }
  var RT = { settings: { enabled: true, base: { "Standard Doppelzimmer": 129, "Superior Doppelzimmer": 169 }, min: 99, max: 340, weekend_pct: 10, holiday_pct: 15, event_pct: { niedrig: 5, mittel: 15, hoch: 30 },
    occ_steps: [[30, -10], [50, 0], [70, 8], [85, 15], [95, 25]], lastminute_days: 3, lastminute_pct: -10, early_days: 90, early_pct: 0, rounding: 1 }, decisions: [],
    events: [{ title: "Stadtfest", start_date: add(todayIso, 12), end_date: add(todayIso, 14), impact: "mittel" }, { title: "Messe Alpin", start_date: add(todayIso, 30), end_date: add(todayIso, 33), impact: "hoch" }] };
  function rtNum(v, lo, hi, d) { var s = v == null ? "" : String(v), n = Number(s.replace(",", ".")); return s !== "" && isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 10) / 10)) : d; }
  function rtPrice(v) { if (v === "" || v == null) return null; var n = Number(String(v).replace(",", ".")); if (!isFinite(n) || n < 0 || n > 100000) throw new Error("Bitte gültige Preise angeben."); return Math.round(n * 100) / 100; }
  function cleanRates(o) {
    o = o || {}; var base = {}; Object.keys(o.base || {}).slice(0, 40).forEach(function (k) { var n = rtPrice(o.base[k]); if (n != null) base[String(k).trim().slice(0, 60)] = n; });
    var mn = rtPrice(o.min), mx = rtPrice(o.max); if (mn != null && mx != null && mn > mx) throw new Error("Der Mindestpreis ist höher als der Höchstpreis.");
    var ev = o.event_pct || RT.settings.event_pct, steps = (Array.isArray(o.occ_steps) ? o.occ_steps : RT.settings.occ_steps).filter(function (s) { return Array.isArray(s) && s.length === 2; })
      .map(function (s) { return [Math.min(100, Math.max(0, Math.round(Number(s[0]) || 0))), rtNum(s[1], -90, 300, 0)]; }).sort(function (a, c) { return a[0] - c[0]; }).slice(0, 10);
    return { enabled: o.enabled === undefined ? true : !!o.enabled, base: base, min: mn, max: mx, weekend_pct: rtNum(o.weekend_pct, -90, 300, 10), holiday_pct: rtNum(o.holiday_pct, -90, 300, 15),
      event_pct: { niedrig: rtNum(ev.niedrig, -90, 300, 0), mittel: rtNum(ev.mittel, -90, 300, 0), hoch: rtNum(ev.hoch, -90, 300, 0) }, occ_steps: steps,
      lastminute_days: Math.min(30, Math.max(0, Math.round(Number(o.lastminute_days)) || 0)), lastminute_pct: rtNum(o.lastminute_pct, -90, 300, 0),
      early_days: Math.min(365, Math.max(0, Math.round(Number(o.early_days)) || 0)), early_pct: rtNum(o.early_pct, -90, 300, 0), rounding: [1, 5, 10].indexOf(Number(o.rounding)) >= 0 ? Number(o.rounding) : 1 };
  }
  function rtOcc(day) { var f = D.forecast.find(function (x) { return x.day === day; }); return f ? f.occupied : [118, 92, 88, 96, 112, 131, 126][new Date(day + "T00:00:00Z").getUTCDay()]; }
  function rtSuggest(from, days, holidays) {
    var s = RT.settings, types = Object.keys(s.base), rooms = Number(D.hotel.rooms) || 140, out = [], hol = {}; (holidays || []).forEach(function (h) { hol[h] = 1; });
    for (var i = 0; i < days; i++) {
      var day = add(from, i), occ = Math.min(100, Math.round(rtOcc(day) / rooms * 100)), factors = [], st = s.occ_steps.length ? s.occ_steps[0][1] : 0;
      s.occ_steps.forEach(function (x) { if (occ >= x[0]) st = x[1]; }); if (st) factors.push({ key: "belegung", pct: st });
      var wd = new Date(day + "T12:00:00Z").getUTCDay(); if ((wd === 5 || wd === 6) && s.weekend_pct) factors.push({ key: "wochenende", pct: s.weekend_pct });
      if (hol[day] && s.holiday_pct) factors.push({ key: "feiertag", pct: s.holiday_pct });
      var ev = RT.events.filter(function (e) { return e.start_date <= day && (e.end_date || e.start_date) >= day; }), evMax = ev.reduce(function (mx, e) { return Math.max(mx, s.event_pct[e.impact] || 0); }, 0);
      if (evMax) factors.push({ key: "ereignis", pct: evMax, label: ev.map(function (e) { return e.title; }).join(", ") });
      if (i <= s.lastminute_days && s.lastminute_pct && occ < 60) factors.push({ key: "lastminute", pct: s.lastminute_pct });
      if (i > s.early_days && s.early_pct) factors.push({ key: "fruehbucher", pct: s.early_pct });
      var total = factors.reduce(function (mm2, f) { return mm2 * (1 + f.pct / 100); }, 1);
      types.forEach(function (rt) { var pr = s.base[rt] * total; if (s.min != null) pr = Math.max(s.min, pr); if (s.max != null) pr = Math.min(s.max, pr); pr = Math.round(pr / s.rounding) * s.rounding;
        out.push({ day: day, room_type: rt, base: s.base[rt], price: Math.round(pr * 100) / 100, occupancy: occ, factors: factors }); });
    }
    return out;
  }

  var DN_FB = "Food & Beverage";
  var DN_TABLES = [["Tisch 1", 2, "Restaurant"], ["Tisch 2", 2, "Restaurant"], ["Tisch 3", 4, "Restaurant"], ["Tisch 4", 4, "Restaurant"], ["Tisch 5", 6, "Restaurant"], ["Terrasse 1", 4, "Terrasse"], ["Terrasse 2", 4, "Terrasse"]]
    .map(function (x, i) { return { id: "rtb-" + (i + 1), hotel_id: AH, name: x[0], seats: x[1], area: x[2], active: true, sort: i, created_at: now.toISOString() }; });
  function dnMin(s) { var mt = String(s || "").match(/^(\d{1,2}):(\d{2})$/); return mt && +mt[1] < 24 && +mt[2] < 60 ? +mt[1] * 60 + +mt[2] : null; }
  function dnTime(n) { return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0"); }
  var DN = { settings: { enabled: true, token: "demoTischToken0123456789ab", name: null, open: { "1": [["18:00", "22:00"]], "2": [["18:00", "22:00"]], "3": [["18:00", "22:00"]], "4": [["18:00", "22:00"]], "5": [["12:00", "14:00"], ["18:00", "22:30"]], "6": [["12:00", "14:00"], ["18:00", "22:30"]], "7": [["12:00", "15:00"]] },
    slot_min: 30, duration_min: 120, max_party: 8, lead_hours: 2, max_days: 60, auto_confirm: true, closed_days: [], note: "Wir freuen uns auf Ihren Besuch." } };
  DN.res = [[0, 1140, 2, "Familie Bauer", "bestätigt", ["A", "G"], "Kind mit Nussallergie, bitte Küche informieren.", "online", ["rtb-1"], "Z 214"], [0, 1170, 4, "Dr. Hofer", "bestätigt", [], "Jahrestag, Kerze am Tisch.", "intern", ["rtb-3"], null],
    [0, 1200, 6, "Schmid (Geburtstag)", "angefragt", ["C", "G", "H"], null, "online", [], null], [0, 1110, 2, "Herr Lang", "bestätigt", [], null, "intern", ["rtb-2"], "Z 305"], [0, 1230, 3, "Ana Ferreira", "bestätigt", [], null, "online", ["rtb-4"], null],
    [1, 1140, 2, "Mayer", "bestätigt", ["N"], "Sellerieallergie", "online", ["rtb-1"], null], [1, 1200, 4, "Kuhn", "angefragt", [], null, "online", [], null], [2, 1170, 5, "Reisegruppe Weber", "bestätigt", [], "Menü vorbestellt.", "intern", ["rtb-5"], null]]
    .map(function (x, i) { return { id: "trs-" + (i + 1), hotel_id: AH, day: add(todayIso, x[0]), start_min: x[1], duration_min: 120, party: x[2], name: x[3], email: x[7] === "online" ? "gast" + (i + 1) + "@example.com" : null, phone: null, room_no: x[9], allergens: x[5], note: x[6], status: x[4], table_ids: x[8], source: x[7], created_at: now.toISOString() }; });
  function dnPick(tables, res, start, dur, party) {
    var busy = {}; res.forEach(function (r) { if ((r.status === "angefragt" || r.status === "bestätigt") && r.start_min < start + dur && start < r.start_min + (r.duration_min || 120)) (r.table_ids || []).forEach(function (t) { busy[t] = 1; }); });
    var free = tables.filter(function (t) { return t.active !== false && !busy[t.id]; }).sort(function (a, c) { return a.seats - c.seats || (a.sort || 0) - (c.sort || 0); });
    var one = free.find(function (t) { return t.seats >= party; }); if (one) return [one.id];
    var best = null; for (var i = 0; i < free.length; i++) for (var j = i + 1; j < free.length; j++) { var a = free[i], c = free[j];
      if ((a.area || "") !== (c.area || "") || a.seats + c.seats < party) continue; if (!best || a.seats + c.seats < best[2]) best = [a.id, c.id, a.seats + c.seats]; }
    return best ? [best[0], best[1]] : [];
  }
  function dnAllerg(v) { var L = "ABCDEFGHLMNOPR".split(""), list = Array.isArray(v) ? v : String(v || "").split(/[,\s]+/); return list.map(function (x) { return String(x).trim().toUpperCase(); }).filter(function (x, i, a) { return L.indexOf(x) >= 0 && a.indexOf(x) === i; }).sort(); }

  /* Paket 045: Restaurant-Erweiterungen (Stammtisch-Serie, No-Show-Hinweis, Statistik) – Beispieldaten */
  [[-20, 1140, 2, "Herr Schmid", "nicht_erschienen", "intern", "gast3@example.com", null], [-18, 1170, 2, "Fam. Oberhofer", "erledigt", "online", "gast20@example.com", null], [-16, 1140, 4, "Dr. Wagner", "erledigt", "intern", null, "Z 118"],
    [-14, 1200, 3, "Frau Leitner", "abgesagt", "online", "gast22@example.com", null], [-12, 1170, 6, "Geburtstag Roth", "erledigt", "online", "gast23@example.com", null], [-10, 1140, 2, "Herr Brandt", "erledigt", "intern", null, "Z 305"],
    [-9, 1230, 2, "Ehepaar Mayr", "nicht_erschienen", "online", "gast25@example.com", null], [-7, 1170, 4, "Fam. Kunz", "erledigt", "online", "gast26@example.com", null], [-6, 1140, 5, "Firma Alpina", "erledigt", "intern", null, null],
    [-4, 1200, 2, "Frau Ruiz", "erledigt", "online", "gast28@example.com", null], [-3, 1170, 2, "Herr Lang", "erledigt", "intern", null, "Z 305"], [-2, 1140, 3, "Fam. Egger", "abgesagt", "online", "gast30@example.com", null], [-1, 1170, 4, "Fam. Bauer", "erledigt", "online", "gast31@example.com", "Z 214"]]
    .forEach(function (x, i) { DN.res.push({ id: "trs-p" + (i + 1), hotel_id: AH, day: add(todayIso, x[0]), start_min: x[1], duration_min: 120, party: x[2], name: x[3], email: x[6], phone: null, room_no: x[7], allergens: [], note: null, status: x[4], table_ids: ["rtb-" + (3 + i % 3)], source: x[5], created_at: now.toISOString() }); });
  [0, 1, 2, 3].forEach(function (d, i) { DN.res.push({ id: "trs-s" + (i + 1), hotel_id: AH, day: add(todayIso, d), start_min: 1080, duration_min: 120, party: 2, name: "Fam. Keller (Halbpension)", email: null, phone: null, room_no: "Z 120", allergens: [], note: "Stammtisch für Hausgäste", status: "bestätigt", table_ids: ["rtb-6"], source: "intern", series_id: "ser-demo-1", created_at: now.toISOString() }); });
  function dnStats(rows) {
    var wd = []; for (var i = 0; i < 7; i++) wd.push({ reservations: 0, guests: 0 });
    var c = { total: rows.length, guests: 0, online: 0, cancelled: 0, no_show: 0, came: 0 };
    rows.forEach(function (r) { if (r.source === "online") c.online++; if (r.status === "abgesagt") { c.cancelled++; return; } if (r.status === "nicht_erschienen") { c.no_show++; return; } if (r.status === "erledigt") c.came++;
      var w = (new Date(r.day + "T12:00:00Z").getUTCDay() + 6) % 7; wd[w].reservations++; wd[w].guests += r.party || 0; c.guests += r.party || 0; });
    c.no_show_pct = c.no_show + c.came ? Math.round(c.no_show / (c.no_show + c.came) * 100) : null; c.cancel_pct = c.total ? Math.round(c.cancelled / c.total * 100) : null; c.weekdays = wd; return c;
  }

  /* Paket 045: Spa & Freizeit – Beispieldaten im Speicher; Logik (freeSlots, priceOf, bookingStats) aus routes-booking.js portiert */
  var SPA_ACT = ["angefragt", "bestätigt", "angekommen"], SPA_CATS = ["behandlung", "paar", "zeitfenster", "kurs", "aktivitaet", "verleih", "platz"];
  var SPA_STAT = ["angefragt", "bestätigt", "angekommen", "erledigt", "storniert", "nicht_erschienen"], SPA_PAYS = ["zimmer", "vor_ort", "online", "gutschein", "inklusive"];
  function spWd(day) { var w = new Date(day + "T12:00:00Z").getUTCDay(); return String(w === 0 ? 7 : w); }
  function spR2(n) { return Math.round(Number(n) * 100) / 100; }
  function spInt(x, lo, hi, d) { var n = Math.round(Number(x)); return x !== "" && x != null && isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; }
  function spTxt(v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n) || null; }
  function spWeek(v) { var out = {}; ["1", "2", "3", "4", "5", "6", "7"].forEach(function (d) { var r = (Array.isArray(v && v[d]) ? v[d] : []).slice(0, 4).map(function (x) { return [dnMin(x && x[0]), dnMin(x && x[1])]; }).filter(function (x) { return x[0] != null && x[1] != null && x[1] > x[0]; }); if (r.length) out[d] = r.map(function (x) { return [dnTime(x[0]), dnTime(x[1])]; }); }); return out; }
  function spSched(v) { var out = {}; ["1", "2", "3", "4", "5", "6", "7"].forEach(function (d) { var t = (Array.isArray(v && v[d]) ? v[d] : []).map(dnMin).filter(function (x) { return x != null; }).sort(function (a, c) { return a - c; }).slice(0, 12); if (t.length) out[d] = t.map(dnTime); }); return out; }
  var SPA_ALL_DAYS = function (a, e) { var o = {}; ["1", "2", "3", "4", "5", "6", "7"].forEach(function (d) { o[d] = [[a, e]]; }); return o; };
  var SPA = { settings: { enabled: true, token: "demoBuchenToken0123456789", name: null, open: SPA_ALL_DAYS("09:00", "20:00"), slot_min: 30, lead_hours: 2, max_days: 60, cancel_hours: 24, reminder: true, room_charge: true, terms: "Stornierung bis 24 Stunden vor dem Termin kostenfrei.", closed_days: [] }, health: {} };
  SPA.svc = [["behandlung", "Klassische Massage", 50, 10, 79, "buchung", 1, 1, true, ["brs-4", "brs-5"], true, null, null], ["behandlung", "Aromaöl-Massage", 80, 10, 115, "buchung", 1, 1, true, ["brs-4", "brs-5"], true, null, null],
    ["behandlung", "Gesichtsbehandlung", 50, 10, 85, "buchung", 1, 1, true, ["brs-4", "brs-5"], true, null, null], ["paar", "Paarmassage", 50, 15, 160, "buchung", 1, 2, true, ["brs-6"], true, null, null],
    ["zeitfenster", "Private Sauna", 60, 0, 25, "person", 4, 0, false, [], false, null, null], ["kurs", "Yoga am Morgen", 60, 0, 0, "buchung", 10, 0, false, [], false, null, { "1": ["07:30"], "3": ["07:30"], "5": ["07:30"], "6": ["08:30"] }],
    ["verleih", "E-Bike (halber Tag)", 240, 0, 35, "person", 1, 0, false, [], false, "brs-7", null], ["platz", "Tennisplatz", 60, 0, 20, "buchung", 1, 0, true, ["brs-8"], false, null, null]]
    .map(function (x, i) { return { id: "bsv-" + (i + 1), hotel_id: AH, category: x[0], name: x[1], description: null, duration_min: x[2], buffer_before: 0, buffer_after: x[3], price: x[4], price_per: x[5], capacity: x[6], staff_count: x[7], needs_room: x[8], room_ids: x[9],
      gear_id: x[11], gear_qty: 1, min_age: null, health_form: x[10], online: true, guests_only: false, active: true, schedule: x[12] || {}, color: ["#A9834B", "#6B8F71", "#5B7DB1", "#9B6B9E", "#C0714F", "#4F8A8B", "#8A7F5B", "#A9834B"][i], sort: i, deposit_pct: 0, noshow_fee_pct: 0, created_at: now.toISOString() }; });
  SPA.res = [["person", "Anna Berger", "w", SPA_ALL_DAYS("09:00", "18:00"), null, 1], ["person", "Lisa Moser", "w", SPA_ALL_DAYS("10:00", "19:00"), "u-member", 1], ["person", "Markus Gruber", "m", SPA_ALL_DAYS("09:00", "17:00"), null, 1],
    ["raum", "Kabine 1", null, {}, null, 1], ["raum", "Kabine 2", null, {}, null, 1], ["raum", "Paarkabine", null, {}, null, 1], ["geraet", "E-Bikes", null, {}, null, 8], ["raum", "Tennisplatz", null, {}, null, 1]]
    .map(function (x, i) { return { id: "brs-" + (i + 1), hotel_id: AH, kind: x[0], name: x[1], user_id: x[4], service_ids: [], quantity: x[5], hours: x[3], gender: x[2], active: true, sort: i, created_at: now.toISOString() }; });
  SPA.blocks = [{ id: "bbl-1", hotel_id: AH, resource_id: "brs-1", day: todayIso, start_min: 750, end_min: 810, reason: "Mittagspause", created_at: now.toISOString() }];
  function spPrice(s, persons, minutes) { if (s.price == null) return null; var p = Number(s.price); if (s.price_per === "person") return spR2(p * persons); if (s.price_per === "stunde") return spR2(p * (minutes || s.duration_min) / 60 * (s.category === "verleih" ? persons : 1)); return spR2(p); }
  function spWork(r, day, st) { var own = (r.hours && r.hours[spWd(day)]) || []; if (own.length) return own.map(function (x) { return [dnMin(x[0]), dnMin(x[1])]; }); if (r.kind === "person") return []; return ((st.open || {})[spWd(day)] || []).map(function (x) { return [dnMin(x[0]), dnMin(x[1])]; }); }
  function spWithin(w, a, b) { return w.some(function (x) { return a >= x[0] && b <= x[1]; }); }
  function spOv(a0, a1, b0, b1) { return a0 < b1 && b0 < a1; }
  function spFree(o) {
    var s = o.service, day = o.day, st = o.settings, res = o.resources, act = o.bookings.filter(function (b) { return SPA_ACT.indexOf(b.status) >= 0 && b.id !== o.ignoreId; }), blocks = o.blocks, persons = o.persons || 1, pref = o.staffPref || "egal";
    if ((st.closed_days || []).indexOf(day) >= 0 || (o.nowDay && day < o.nowDay)) return [];
    var wd = spWd(day), dur = s.duration_min, bb = s.buffer_before || 0, ba = s.buffer_after || 0, open = ((st.open || {})[wd] || []).map(function (x) { return [dnMin(x[0]), dnMin(x[1])]; }), shared = (s.capacity || 1) > 1, starts = [];
    if (s.category === "kurs" && s.schedule && Object.keys(s.schedule).length) starts = (s.schedule[wd] || []).map(dnMin); else open.forEach(function (x) { for (var t = x[0]; t + dur <= x[1]; t += st.slot_min || 30) starts.push(t); });
    var minStart = o.nowDay && day === o.nowDay ? o.nowMin + (st.lead_hours || 0) * 60 : -1;
    var pool = function (k) { return res.filter(function (r) { return r.kind === k && r.active !== false; }); };
    var busy = function (rid, a, b) { return act.some(function (x) { return (x.resource_ids || []).indexOf(rid) >= 0 && spOv(a, b, x.block_start != null ? x.block_start : x.start_min, x.block_end != null ? x.block_end : x.end_min); }) || blocks.some(function (x) { return x.resource_id === rid && spOv(a, b, x.start_min, x.end_min); }); };
    var load = function (rid) { return act.filter(function (x) { return (x.resource_ids || []).indexOf(rid) >= 0; }).reduce(function (m, x) { return m + (x.end_min - x.start_min); }, 0); };
    var out = [], uniq = starts.filter(function (t, i, a) { return a.indexOf(t) === i; }).sort(function (a, c) { return a - c; });
    uniq.forEach(function (t) {
      if (t < minStart) return; var a = t - bb, e = t + dur, b = e + ba; if (s.category !== "kurs" && !spWithin(open, t, e)) return;
      if (shared) { var same = act.filter(function (x) { return x.service_id === s.id && x.start_min === t; }), left = (s.capacity || 1) - same.reduce(function (m, x) { return m + (x.persons || 1); }, 0);
        if (left < persons) return; if (same.length) { out.push({ time: dnTime(t), start: t, staff: [], room: null, resource_ids: same[0].resource_ids || [], left: left }); return; } }
      var staff = [];
      if (s.staff_count > 0) { var okp = pool("person").filter(function (r) { return (!r.service_ids || !r.service_ids.length || r.service_ids.indexOf(s.id) >= 0) && (pref === "egal" || !pref || r.gender === pref) && spWithin(spWork(r, day, st), t, e) && !busy(r.id, a, b); })
          .sort(function (x, y) { return load(x.id) - load(y.id) || (x.sort || 0) - (y.sort || 0); }); if (okp.length < s.staff_count) return; staff = okp.slice(0, s.staff_count).map(function (r) { return r.id; }); }
      var room = null;
      if (s.needs_room) { var rooms = pool("raum").filter(function (r) { return (!s.room_ids || !s.room_ids.length || s.room_ids.indexOf(r.id) >= 0) && spWithin(spWork(r, day, st), t, e) && !busy(r.id, a, b); }); if (!rooms.length) return; room = rooms.sort(function (x, y) { return (x.sort || 0) - (y.sort || 0); })[0].id; }
      var ids = staff.concat(room ? [room] : []);
      if (s.gear_id) { var g = res.find(function (r) { return r.id === s.gear_id && r.active !== false; }); if (!g) return; var need = (s.gear_qty || 1) * persons,
          used = act.filter(function (x) { return (x.resource_ids || []).indexOf(g.id) >= 0 && spOv(a, b, x.block_start != null ? x.block_start : x.start_min, x.block_end != null ? x.block_end : x.end_min); }).reduce(function (m, x) { return m + (x.gear_qty || 0); }, 0)
            + (blocks.some(function (x) { return x.resource_id === g.id && spOv(a, b, x.start_min, x.end_min); }) ? g.quantity : 0);
        if (used + need > (g.quantity || 1)) return; ids.push(g.id); out.push({ time: dnTime(t), start: t, staff: staff, room: room, resource_ids: ids, gear_qty: need, left: (g.quantity || 1) - used }); return; }
      out.push({ time: dnTime(t), start: t, staff: staff, room: room, resource_ids: ids, left: shared ? s.capacity : 1 });
    });
    return out;
  }
  function spNow() { return { day: todayIso, min: now.getHours() * 60 + now.getMinutes() }; }
  function spSlots(svcId, day, persons, pref, ignoreId) { var s = byId(SPA.svc, svcId); if (!s) return null; var n = spNow();
    return spFree({ service: s, day: day, settings: SPA.settings, resources: SPA.res, bookings: SPA.bk.filter(function (b) { return b.day === day; }), blocks: SPA.blocks.filter(function (b) { return b.day === day; }), persons: persons, staffPref: pref, nowDay: n.day, nowMin: n.min, ignoreId: ignoreId }); }
  function spOut(b) { return Object.assign({}, b, { time: dnTime(b.start_min), end: dnTime(b.end_min) }); }
  function spBk(day, time, svcId, persons, name, status, ids, x) {
    var s = byId(SPA.svc, svcId), st = dnMin(time); x = x || {};
    SPA.bk.push(Object.assign({ id: "bbk-" + (SPA.bk.length + 1), hotel_id: AH, service_id: s.id, day: day, start_min: st, end_min: st + s.duration_min, block_start: st - (s.buffer_before || 0), block_end: st + s.duration_min + (s.buffer_after || 0), persons: persons, resource_ids: ids,
      gear_qty: s.gear_id ? persons : null, guest_name: name, email: null, phone: null, room_no: null, arrival_guest_id: null, wishes: null, staff_pref: "egal", price: spPrice(s, persons), payment: "vor_ort", paid: false, charged_at: null, deposit: null, deposit_paid_at: null, status: status, source: "intern", health_flag: false, cancel_reason: null, created_at: now.toISOString() }, x));
  }
  SPA.bk = [];
  spBk(todayIso, "10:00", "bsv-1", 1, "Frau Berger", "bestätigt", ["brs-1", "brs-4"], { room_no: "214", payment: "zimmer", wishes: "Nacken und Schultern", source: "gast" });
  spBk(todayIso, "11:30", "bsv-2", 1, "Herr Kern", "bestätigt", ["brs-3", "brs-5"], { health_flag: true, phone: "+43 660 1234567", staff_pref: "m" });
  spBk(todayIso, "14:00", "bsv-4", 2, "Familie Hofmann", "bestätigt", ["brs-1", "brs-3", "brs-6"], { room_no: "301", payment: "zimmer", wishes: "Hochzeitstag, bitte Rosenblätter" });
  spBk(todayIso, "16:00", "bsv-5", 2, "Julia Steiner", "angefragt", [], { email: "julia.steiner@example.com", source: "online" });
  spBk(todayIso, "09:00", "bsv-3", 1, "Frau Lehner", "erledigt", ["brs-3", "brs-5"], { paid: true });
  spBk(todayIso, "17:00", "bsv-8", 2, "Herr Brandt", "bestätigt", ["brs-8"], { room_no: "305" });
  spBk(add(todayIso, 1), "10:00", "bsv-1", 1, "Frau Novak", "bestätigt", ["brs-1", "brs-4"], { room_no: "118", payment: "zimmer" });
  spBk(add(todayIso, 1), "09:00", "bsv-7", 2, "Familie Weiss", "bestätigt", ["brs-7"], { payment: "inklusive", room_no: "122" });
  spBk(add(todayIso, -1), "15:00", "bsv-1", 1, "Herr Pichler", "nicht_erschienen", ["brs-1", "brs-4"]);
  spBk(add(todayIso, -2), "11:00", "bsv-2", 1, "Frau Aigner", "erledigt", ["brs-2", "brs-5"], { paid: true });
  spBk(add(todayIso, -3), "16:00", "bsv-4", 2, "Ehepaar Mayr", "erledigt", ["brs-1", "brs-3", "brs-6"], { payment: "zimmer", charged_at: now.toISOString() });
  spBk(add(todayIso, -5), "14:00", "bsv-3", 1, "Frau Ruiz", "storniert", ["brs-2", "brs-4"], { cancel_reason: "vom Gast online storniert" });
  spBk(add(todayIso, -6), "10:30", "bsv-5", 3, "Familie Kunz", "erledigt", [], { paid: true });
  SPA.health["bbk-2"] = { booking_id: "bbk-2", answers: { pregnant: false, heart: false, blood_pressure: true, allergies: false, injuries: true, skin: false, medication: false, note: "Bandscheibenvorfall vor zwei Jahren, bitte sanft." }, consent_at: now.toISOString() };
  function spStats(from, to) {
    var done = SPA.bk.filter(function (b) { return b.day >= from && b.day <= to; }), act = done.filter(function (b) { return ["bestätigt", "angekommen", "erledigt"].indexOf(b.status) >= 0; }), svc = {};
    SPA.svc.forEach(function (s) { svc[s.id] = { id: s.id, name: s.name, category: s.category, count: 0, persons: 0, revenue: 0 }; });
    act.forEach(function (b) { var s = svc[b.service_id]; if (!s) return; s.count++; s.persons += b.persons || 1; s.revenue = spR2(s.revenue + (Number(b.price) || 0)); });
    var rs = SPA.res.filter(function (r) { return r.kind !== "geraet" && r.active !== false; }).map(function (r) { var work = 0; for (var d = from; d <= to; d = add(d, 1)) spWork(r, d, SPA.settings).forEach(function (x) { work += x[1] - x[0]; });
      var booked = act.filter(function (b) { return (b.resource_ids || []).indexOf(r.id) >= 0; }).reduce(function (m, b) { return m + (b.end_min - b.start_min); }, 0); return { id: r.id, name: r.name, kind: r.kind, work_min: work, booked_min: booked, pct: work ? Math.round(booked / work * 100) : null }; });
    var ns = done.filter(function (b) { return b.status === "nicht_erschienen"; }).length, base = ns + done.filter(function (b) { return b.status === "angekommen" || b.status === "erledigt"; }).length;
    return { from: from, to: to, services: Object.keys(svc).map(function (k) { return svc[k]; }).sort(function (a, c) { return c.revenue - a.revenue || c.count - a.count; }), resources: rs,
      total: { bookings: act.length, revenue: spR2(act.reduce(function (m, b) { return m + (Number(b.price) || 0); }, 0)), cancelled: done.filter(function (b) { return b.status === "storniert"; }).length, no_show: ns, no_show_pct: base ? Math.round(ns / base * 100) : null } };
  }
  function spCleanSvc(b, partial) {
    var o = {};
    if (!partial || b.category !== undefined) { if (SPA_CATS.indexOf(b.category) < 0) throw new Error("Bitte eine Art wählen."); o.category = b.category; }
    if (!partial || b.name !== undefined) { o.name = spTxt(b.name, 120); if (!o.name) throw new Error("Bitte einen Namen angeben."); }
    if (b.description !== undefined) o.description = spTxt(b.description, 1000);
    if (!partial || b.duration_min !== undefined) { var n = Math.round(Number(b.duration_min)); if (!(n >= 5 && n <= 1440)) throw new Error("Dauer: 5 Minuten bis 24 Stunden."); o.duration_min = n; }
    ["buffer_before", "buffer_after"].forEach(function (k) { if (b[k] !== undefined) o[k] = spInt(b[k], 0, 120, 0); });
    if (b.price !== undefined) { if (b.price === "" || b.price == null) o.price = null; else { var pr = Number(String(b.price).replace(",", ".")); if (!(pr >= 0 && pr <= 100000)) throw new Error("Bitte einen gültigen Preis angeben."); o.price = spR2(pr); } }
    if (b.price_per !== undefined) o.price_per = ["buchung", "person", "stunde"].indexOf(b.price_per) >= 0 ? b.price_per : "buchung";
    if (b.capacity !== undefined) o.capacity = spInt(b.capacity, 1, 500, 1); if (b.staff_count !== undefined) o.staff_count = spInt(b.staff_count, 0, 4, 1); if (b.needs_room !== undefined) o.needs_room = !!b.needs_room;
    if (b.room_ids !== undefined) o.room_ids = Array.isArray(b.room_ids) ? b.room_ids.filter(function (x, i, a) { return a.indexOf(x) === i; }) : []; if (b.gear_id !== undefined) o.gear_id = b.gear_id || null; if (b.gear_qty !== undefined) o.gear_qty = spInt(b.gear_qty, 1, 50, 1);
    if (b.min_age !== undefined) o.min_age = b.min_age === "" || b.min_age == null ? null : spInt(b.min_age, 0, 99, null);
    ["health_form", "online", "guests_only", "active"].forEach(function (k) { if (b[k] !== undefined) o[k] = !!b[k]; });
    if (b.schedule !== undefined) o.schedule = spSched(b.schedule); if (b.color !== undefined) o.color = /^#[0-9a-fA-F]{6}$/.test(String(b.color || "")) ? b.color : null; if (b.sort !== undefined) o.sort = spInt(b.sort, -1000, 1000, 0);
    ["deposit_pct", "noshow_fee_pct"].forEach(function (k) { if (b[k] !== undefined) o[k] = spInt(b[k], 0, 100, 0); });
    if (!partial) { if (o.category === "paar" && b.staff_count === undefined) o.staff_count = 2; if (["verleih", "platz"].indexOf(o.category) >= 0 && b.staff_count === undefined) o.staff_count = 0; if (o.category === "verleih" && b.needs_room === undefined) o.needs_room = false;
      if (["zeitfenster", "kurs", "aktivitaet"].indexOf(o.category) >= 0 && b.capacity === undefined) o.capacity = o.category === "zeitfenster" ? 10 : 8; if (o.category === "zeitfenster" && b.staff_count === undefined) o.staff_count = 0; }
    return o;
  }
  function spCleanRes(b, partial) {
    var o = {};
    if (!partial || b.kind !== undefined) { if (["person", "raum", "geraet"].indexOf(b.kind) < 0) throw new Error("Bitte Person, Raum oder Gerät wählen."); o.kind = b.kind; }
    if (!partial || b.name !== undefined) { o.name = spTxt(b.name, 80); if (!o.name) throw new Error("Bitte einen Namen angeben."); }
    if (b.user_id !== undefined) o.user_id = b.user_id || null; if (b.service_ids !== undefined) o.service_ids = Array.isArray(b.service_ids) ? b.service_ids : []; if (b.quantity !== undefined) o.quantity = spInt(b.quantity, 1, 500, 1);
    if (b.hours !== undefined) o.hours = spWeek(b.hours); if (b.gender !== undefined) o.gender = ["w", "m", "d"].indexOf(b.gender) >= 0 ? b.gender : null; if (b.active !== undefined) o.active = !!b.active; if (b.sort !== undefined) o.sort = spInt(b.sort, -1000, 1000, 0);
    return o;
  }
  function spCleanBlock(b, partial) {
    var o = {};
    if (!partial || b.resource_id !== undefined) { if (!b.resource_id) throw new Error("Bitte eine Ressource wählen."); o.resource_id = b.resource_id; }
    if (!partial || b.day !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.day || ""))) throw new Error("Bitte ein Datum angeben."); o.day = b.day; }
    if (!partial || b.from !== undefined || b.to !== undefined) { var a = dnMin(b.from), e = dnMin(b.to); if (a == null || e == null || e <= a) throw new Error("Bitte eine gültige Zeit angeben."); o.start_min = a; o.end_min = e; }
    if (b.reason !== undefined) o.reason = spTxt(b.reason, 120); return o;
  }
  var SPA_CRUD = { "booking-services": [SPA.svc, spCleanSvc, "bsv", { category: "behandlung", description: null, buffer_before: 0, buffer_after: 0, price: null, price_per: "buchung", capacity: 1, staff_count: 1, needs_room: true, room_ids: [], gear_id: null, gear_qty: 1, min_age: null, health_form: false, online: true, guests_only: false, active: true, schedule: {}, color: null, sort: 0, deposit_pct: 0, noshow_fee_pct: 0 }, "Leistungen verwaltet die Leitung Spa & Wellness oder Rezeption."],
    "booking-resources": [SPA.res, spCleanRes, "brs", { user_id: null, service_ids: [], quantity: 1, hours: {}, gender: null, active: true, sort: 0 }, "Ressourcen verwaltet die Leitung Spa & Wellness oder Rezeption."],
    "booking-blocks": [SPA.blocks, spCleanBlock, "bbl", { reason: null }, "Buchungen verwalten Spa & Wellness und die Rezeption."] };
  function spBuild(b, ignoreId) {
    var s = byId(SPA.svc, b.service_id); if (!b.service_id) throw new Error("Bitte eine Leistung wählen."); if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.day || ""))) throw new Error("Bitte ein Datum angeben."); var st = dnMin(b.time); if (st == null) throw new Error("Bitte eine Uhrzeit angeben.");
    if (!s) throw new Error("Leistung nicht gefunden."); var persons = spInt(b.persons, 1, 500, 1), ids = Array.isArray(b.resource_ids) ? b.resource_ids.slice() : [], gear = null;
    if (!ids.length) { var n = spNow(), set = Object.assign({}, SPA.settings, { lead_hours: 0 }); if (b.force_time) set.open = SPA_ALL_DAYS("00:00", "23:59");
      var slot = spFree({ service: s, day: b.day, settings: set, resources: SPA.res, bookings: SPA.bk.filter(function (x) { return x.day === b.day; }), blocks: SPA.blocks.filter(function (x) { return x.day === b.day; }), persons: persons, staffPref: b.staff_pref || "egal", ignoreId: ignoreId }).find(function (x) { return x.start === st; });
      if (!slot) { var e = new Error("Zu dieser Zeit ist nichts frei. Bitte eine andere Zeit wählen."); e.status = 409; throw e; } ids = slot.resource_ids; gear = slot.gear_qty != null ? slot.gear_qty : null; } else if (s.gear_id) gear = (s.gear_qty || 1) * persons;
    return { service_id: s.id, day: b.day, start_min: st, end_min: st + s.duration_min, block_start: Math.max(0, st - (s.buffer_before || 0)), block_end: st + s.duration_min + (s.buffer_after || 0), persons: persons, resource_ids: ids, gear_qty: gear,
      price: b.price !== undefined && b.price !== "" && b.price != null ? spR2(Number(String(b.price).replace(",", "."))) : spPrice(s, persons) };
  }
  function spGuest(b) {
    var o = {}; if (b.guest_name !== undefined) { o.guest_name = spTxt(b.guest_name, 120); if (!o.guest_name) throw new Error("Bitte einen Namen angeben."); }
    if (b.email !== undefined) { var em = String(b.email || "").trim(); if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(em)) throw new Error("Ungültige E-Mail-Adresse."); o.email = em || null; }
    if (b.phone !== undefined) o.phone = spTxt(b.phone, 40); if (b.room_no !== undefined) o.room_no = spTxt(b.room_no, 20); if (b.arrival_guest_id !== undefined) o.arrival_guest_id = b.arrival_guest_id || null; if (b.wishes !== undefined) o.wishes = spTxt(b.wishes, 500);
    if (b.staff_pref !== undefined) o.staff_pref = ["egal", "w", "m"].indexOf(b.staff_pref) >= 0 ? b.staff_pref : "egal";
    if (b.payment !== undefined) { if (SPA_PAYS.indexOf(b.payment) < 0) throw new Error("Unbekannte Zahlungsart."); o.payment = b.payment; } if (b.paid !== undefined) o.paid = !!b.paid;
    if (b.status !== undefined) { if (SPA_STAT.indexOf(b.status) < 0) throw new Error("Unbekannter Status."); o.status = b.status; } if (b.cancel_reason !== undefined) o.cancel_reason = spTxt(b.cancel_reason, 300); return o;
  }

  var VC_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function vcCode() { var g = function () { var s = ""; for (var i = 0; i < 4; i++) s += VC_ALPHA.charAt(Math.floor(Math.random() * VC_ALPHA.length)); return s; }; return g() + "-" + g() + "-" + g(); }
  var VC = { settings: { enabled: true, token: "demoGutscheinToken0123456789", presets: [50, 100, 150], custom: true, custom_min: 20, custom_max: 1000, valid_years: 0, title: "Gutschein Alpenblick Hotels", text: "Einlösbar für Zimmer, Restaurant und Wellness." } };
  VC.list = [["AB23-KM7P-XY34", 100, 100, "aktiv", "Julia Berger", "online", "stripe", 3, "Alles Gute zum Geburtstag!", "Martin"], ["CD45-QR8T-WZ56", 150, 70, "aktiv", "Rezeption", "rezeption", "karte", 12, null, "Familie Steiner"],
    ["EF67-WX9H-AB78", 50, 0, "eingelöst", "Rezeption", "rezeption", "bar", 40, null, null], ["GH89-JL2N-CD34", 200, 200, "aktiv", "Peter Gruber", "online", "stripe", 1, "Schöne Auszeit zu zweit.", "Eva und Tom"], ["JK23-MN4P-EF56", 100, 100, "storniert", "Rezeption", "rezeption", "bar", 25, null, null]]
    .map(function (x, i) { var t = new Date(now.getTime() - x[7] * 86400000).toISOString(); return { id: "vch-" + (i + 1), hotel_id: AH, code: x[0], title: VC.settings.title, amount: x[1], remaining: x[2], currency: D.hotel.currency || "EUR", status: x[3], buyer_name: x[4], buyer_email: x[5] === "online" ? "kaeufer" + (i + 1) + "@example.com" : null,
      recipient_name: x[9], message: x[8], valid_until: null, source: x[5], payment_method: x[6], paid_at: t, created_at: t }; });
  VC.red = [{ id: "vcr-1", voucher_id: "vch-2", amount: 50, note: "Abendessen", redeemed_by: "u-admin", redeemed_at: new Date(now.getTime() - 6 * 86400000).toISOString() }, { id: "vcr-2", voucher_id: "vch-2", amount: 30, note: "Bar", redeemed_by: "u-admin", redeemed_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { id: "vcr-3", voucher_id: "vch-3", amount: 50, note: "Spa-Anwendung", redeemed_by: "u-admin", redeemed_at: new Date(now.getTime() - 30 * 86400000).toISOString() }];
  var TOURS = {};

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
  D.hotel.safety_settings = { min_first_aid: 2, min_fire: 1, emergency_contacts: [{ name: "Haustechnik-Notdienst", role: "Technik", phone: "+43 512 555 0100" }, { name: "Aufzugsfirma Schindler", role: "Aufzug", phone: "+43 512 555 0111" }, { name: "Gesamtleitung (Bereitschaft)", role: "Leitung", phone: "+43 664 555 0123" }] };
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

  D.hotel.upgrade_settings = { enabled: true, ranking: ["Standard", "Superior", "Deluxe", "Suite"], price_per_step: 25 };
  D.hotel.transfer_settings = { enabled: true, places: ["Flughafen Innsbruck", "Hauptbahnhof Innsbruck", "Bahnhof Jenbach"], prices: { "Flughafen Innsbruck": 45, "Hauptbahnhof Innsbruck": 28, "Bahnhof Jenbach": 60 } };

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
    // Akademie-Videos (Migration 042): in der Demo gibt es keinen Speicher – keine fremden Inhalte
    if ((mm = p.match(/^\/api\/courses\/([^/]+)\/video-url$/))) return ok({ url: null, message: "In der Demo nicht verfügbar." });
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
          deposit: numOrNull(b.deposit), deposit_returned_at: b.deposit_returned_at || null, handover_note: b.handover_note || null, deduction_month: numOrNull(b.deduction_month), created_at: new Date().toISOString() };
        D.housing_assignments.push(nha); return ok(nha); }
      return ok(D.housing_assignments.slice().sort(function (a, c) { return a.from_date < c.from_date ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/housing-assignments\/([^/]+)$/))) {
      if (m === "DELETE") { remove(D.housing_assignments, mm[1]); return ok({ ok: true }); }
      var eha = byId(D.housing_assignments, mm[1]); if (!eha) return ok({ error: "Unterkünfte verwalten Admins und die Leitung Personal." }, 403);
      var pb2 = Object.assign({}, b); if (pb2.holder_name !== undefined) { pb2.person_name = pb2.holder_name; delete pb2.holder_name; } if (pb2.deposit !== undefined) pb2.deposit = numOrNull(pb2.deposit); if (pb2.deduction_month !== undefined) pb2.deduction_month = numOrNull(pb2.deduction_month);
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
          tso.safety_settings = { min_first_aid: ti(ss.min_first_aid), min_fire: ti(ss.min_fire), emergency_contacts: (D.hotel.safety_settings || {}).emergency_contacts || [] }; }
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

    /* ===== Paket 041 (Schnittstellen, Wunschliste, Plattform; nur im Speicher; Antworten wie routes-integrations.js / routes-platform.js) ===== */
    if (p === "/api/platform/me") return ok({ admin: false });
    if (p === "/api/usage" && m === "POST") return Promise.resolve(new Response(null, { status: 204 }));
    if (p === "/api/partner-attribution" && m === "POST") return ok({ ok: true, attributed: false });

    if (!D.fr) {
      D.fr = [
        { id: "fr-1", title: "DATEV-Export für die Lohnbuchhaltung", description: "Monatliche Stunden und Zuschläge als DATEV-Datei, damit unser Steuerberater nichts abtippen muss.", status: "in Arbeit", vote_count: 23, created_at: nowIso(24 * 40), mine: false, my_vote: true },
        { id: "fr-2", title: "Schichttausch direkt in der App", description: "Mitarbeitende sollen untereinander tauschen können, die Leitung bestätigt nur.", status: "geplant", vote_count: 17, created_at: nowIso(24 * 31), mine: false, my_vote: false },
        { id: "fr-3", title: "Dunkler Modus für die Nachtschicht", description: "Die Nachtportiers wünschen sich eine dunkle Oberfläche.", status: "neu", vote_count: 9, created_at: nowIso(24 * 12), mine: true, my_vote: true },
        { id: "fr-4", title: "Zimmerstatus per QR-Code am Wagen melden", description: "Housekeeping scannt den Code an der Tür und setzt den Status ohne Tippen.", status: "geplant", vote_count: 14, created_at: nowIso(24 * 21), mine: false, my_vote: false },
        { id: "fr-5", title: "Anbindung an unser Kassensystem", description: "Tagesumsätze sollen automatisch in die Auswertung fließen.", status: "fertig", vote_count: 31, created_at: nowIso(24 * 90), mine: false, my_vote: true },
        { id: "fr-6", title: "Eigene Farben für das Gästeportal", description: "", status: "abgelehnt", vote_count: 3, created_at: nowIso(24 * 60), mine: false, my_vote: false }];
      D.ig_keys = [{ id: "ak-1", organization_id: ORG, name: "Kassensystem (Beispiel)", prefix: "DEMO1a2b", scopes: ["read:tickets", "read:rooms"], created_by: "u-admin", created_at: nowIso(24 * 20), last_used_at: nowIso(3), revoked_at: null }];
      D.ig_hooks = [{ id: "wh-1", organization_id: ORG, hotel_id: null, url: "https://example.com/hooks/ouverture", events: ["ticket.created", "ticket.done", "guest_order.created"], active: true, failure_count: 0, disabled_at: null, created_at: nowIso(24 * 15) }];
      D.ig_deliv = [
        { id: "wd-1", webhook_id: "wh-1", event: "guest_order.created", status_code: 200, ok: true, attempt: 1, error: null, created_at: nowIso(2) },
        { id: "wd-2", webhook_id: "wh-1", event: "ticket.created", status_code: 200, ok: true, attempt: 1, error: null, created_at: nowIso(9) },
        { id: "wd-3", webhook_id: "wh-1", event: "ticket.created", status_code: 200, ok: true, attempt: 2, error: null, created_at: nowIso(26) },
        { id: "wd-4", webhook_id: "wh-1", event: "ticket.done", status_code: 503, ok: false, attempt: 1, error: "HTTP 503", created_at: nowIso(26.1) },
        { id: "wd-5", webhook_id: "wh-1", event: "ticket.done", status_code: 200, ok: true, attempt: 1, error: null, created_at: nowIso(50) }];
    }
    var frOut = function (x) { return Object.assign({}, x); };
    if (p === "/api/feature-requests" && m === "GET") return ok({ items: D.fr.map(frOut), can_create: true });
    if (p === "/api/feature-requests" && m === "POST") {
      var ftitle = String(b.title || "").trim().slice(0, 120); if (ftitle.length < 5) return ok({ error: "Bitte einen Titel mit mindestens 5 Zeichen angeben." }, 400);
      var fnew = { id: nid("fr"), title: ftitle, description: String(b.description || "").trim().slice(0, 2000) || null, status: "neu", vote_count: 0, created_at: new Date().toISOString(), mine: true, my_vote: false };
      D.fr.push(fnew); return ok(fnew); }
    if ((mm = p.match(/^\/api\/feature-requests\/([^/]+)\/vote$/)) && (m === "POST" || m === "DELETE")) {
      var fv = byId(D.fr, mm[1]); if (!fv) return nf();
      var von = m === "POST"; if (von !== fv.my_vote) { fv.my_vote = von; fv.vote_count = Math.max(0, fv.vote_count + (von ? 1 : -1)); }
      return ok({ ok: true, my_vote: von }); }
    if ((mm = p.match(/^\/api\/feature-requests\/([^/]+)$/)) && m === "PATCH") {
      var fp = byId(D.fr, mm[1]); if (!fp || !fp.mine || fp.status !== "neu") return deny("Ändern lassen sich nur eigene Wünsche, solange sie neu sind.");
      var ft2 = String(b.title || "").trim().slice(0, 120); if (ft2.length < 5) return ok({ error: "Bitte einen Titel mit mindestens 5 Zeichen angeben." }, 400);
      fp.title = ft2; fp.description = String(b.description || "").trim().slice(0, 2000) || null; return ok(frOut(fp)); }

    var igAdmin = function () { return ROLE === "admin"; }, IGDENY = "Schnittstellen verwalten nur Admins der Organisation.";
    var rnd = function (n) { var s = "", c = "abcdefghijklmnopqrstuvwxyz0123456789"; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
    if (p === "/api/organizations/demo-org/api-keys") {
      if (!igAdmin()) return deny(IGDENY);
      if (m === "POST") {
        var kname = String(b.name || "").trim().slice(0, 80); if (!kname) return ok({ error: "Bitte einen Namen angeben (z. B. „Kassensystem“)." }, 400);
        var kscopes = (b.scopes || []).filter(function (s) { return ["read:tasks", "read:rooms", "read:tickets", "read:arrivals", "write:tickets"].indexOf(s) >= 0; });
        if (!kscopes.length) return ok({ error: "Bitte mindestens eine Berechtigung wählen." }, 400);
        var kpre = "DEMO" + rnd(4), krow = { id: nid("ak"), organization_id: ORG, name: kname, prefix: kpre, scopes: kscopes, created_by: ME, created_at: new Date().toISOString(), last_used_at: null, revoked_at: null };
        D.ig_keys.unshift(krow); return ok(Object.assign({}, krow, { key: "ouv_" + kpre + "_NUR-DEMO-KEIN-ECHTER-SCHLUESSEL" })); }
      return ok(D.ig_keys); }
    if ((mm = p.match(/^\/api\/api-keys\/([^/]+)\/revoke$/)) && m === "POST") {
      if (!igAdmin()) return deny(IGDENY);
      var kr = byId(D.ig_keys, mm[1]); if (!kr || kr.revoked_at) return ok({ error: "Schlüssel nicht gefunden oder schon widerrufen." }, 404);
      kr.revoked_at = new Date().toISOString(); return ok(kr); }

    var IG_EV = ["ticket.created", "ticket.done", "task.done", "arrival.answered", "guest_order.created", "review.created", "application.created"];
    var hookIn = function (bb, base) {
      var evs = (bb.events || base.events || []).filter(function (e) { return IG_EV.indexOf(e) >= 0; });
      if (!evs.length) return { error: "Bitte mindestens ein Ereignis wählen." };
      if (bb.url !== undefined && !/^https:\/\/[^\s/]+/.test(String(bb.url))) return { error: "Nur https-Adressen sind erlaubt." };
      return { url: bb.url !== undefined ? String(bb.url).trim().slice(0, 500) : base.url, events: evs, hotel_id: bb.hotel_id !== undefined ? (bb.hotel_id ? HID : null) : base.hotel_id }; };
    if (p === "/api/organizations/demo-org/webhooks") {
      if (!igAdmin()) return deny(IGDENY);
      if (m === "POST") {
        var hn = hookIn(b, { url: "", events: [], hotel_id: null }); if (hn.error) return ok({ error: hn.error }, 400);
        var hrow = { id: nid("wh"), organization_id: ORG, hotel_id: hn.hotel_id, url: hn.url, events: hn.events, active: true, failure_count: 0, disabled_at: null, created_at: new Date().toISOString() };
        D.ig_hooks.push(hrow); return ok(Object.assign({}, hrow, { secret: "whsec_DEMO_nur-zur-Ansicht-" + rnd(10) })); }
      return ok({ webhooks: D.ig_hooks, events: IG_EV }); }
    if ((mm = p.match(/^\/api\/webhooks\/([^/]+)(\/rotate-secret|\/test|\/deliveries)?$/))) {
      if (!igAdmin()) return deny(IGDENY);
      var wh = byId(D.ig_hooks, mm[1]); if (!wh) return nf();
      if (!mm[2] && m === "PATCH") {
        var hp2 = Object.assign({}, wh); if (b.url !== undefined || b.events !== undefined || b.hotel_id !== undefined) { var hu = hookIn(b, wh); if (hu.error) return ok({ error: hu.error }, 400); hp2 = Object.assign(hp2, hu); }
        if (b.active !== undefined) { hp2.active = !!b.active; if (hp2.active) { hp2.failure_count = 0; hp2.disabled_at = null; } }
        Object.assign(wh, hp2); return ok(wh); }
      if (!mm[2] && m === "DELETE") { remove(D.ig_hooks, wh.id); D.ig_deliv = D.ig_deliv.filter(function (d) { return d.webhook_id !== wh.id; }); return ok({ ok: true }); }
      if (mm[2] === "/rotate-secret" && m === "POST") return ok({ id: wh.id, secret: "whsec_DEMO_nur-zur-Ansicht-" + rnd(10) });
      if (mm[2] === "/test" && m === "POST") {
        var dl = { id: nid("wd"), webhook_id: wh.id, event: "ping", status_code: 200, ok: true, attempt: 1, error: null, created_at: new Date().toISOString() };
        D.ig_deliv.unshift(dl); return ok({ ok: true, status_code: 200, attempt: 1, error: null }); }
      if (mm[2] === "/deliveries" && m === "GET") return ok(D.ig_deliv.filter(function (d) { return d.webhook_id === wh.id; }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; })); }

    if (p === H + "/whatsapp") {
      if (!igAdmin()) return deny(IGDENY);
      var waOff = { enabled: false, phone_number_id: "", display_number: "", has_verify_token: false, has_access_token: false, has_app_secret: false, webhook_url: "https://demo.invalid/api/public/whatsapp/" + HID, graph_version: "v21.0" };
      if (m === "GET") return ok(waOff);
      return ok({ error: "In der Live-Demo nicht verfügbar." }, 400); }
    if (p === H + "/google-business") {
      if (!igAdmin()) return deny(IGDENY);
      if (m === "GET") return ok({ configured: true, connected: false, location_name: "", location_title: "", account_name: "", account_title: "", last_post_at: null });
      return ok({ ok: true }); }
    if (p.indexOf(H + "/google-business/") === 0) {
      if (!igAdmin()) return deny(IGDENY);
      return ok({ error: "In der Live-Demo nicht verfügbar." }, 400); }

    // Paket 042: Zertifikat und Notfallmappe (Schreibvorgänge nur im Speicher)
    if (p === H + "/readiness-certificate" && m === "POST") {
      if (!(ROLE === "admin" || (ROLE === "manager" && !MYDEPTS.length))) return deny("Das Zertifikat erstellen nur Admin und Gesamtleitung.");
      var pc = function (a, n) { return n > 0 ? Math.max(0, Math.min(100, Math.round(a * 100 / n))) : null; };
      var cdone = D.tasks.filter(function (t) { return t.status === "Erledigt" || t.status === "Abgeschlossen"; }).length, cperm = D.permits.filter(function (x) { return x.status === "erteilt"; }).length;
      var cprocOk = (D.procurement || []).filter(function (x) { return x.status === "geliefert" || x.status === "montiert"; }).length;
      var cr = [], ca = [["tasks", "Aufgaben", pc(cdone, D.tasks.length), cdone + " / " + D.tasks.length, true], ["schedule", "Zeitplan (Bereitschafts-Score)", 62, null, false], ["permits", "Genehmigungen", pc(cperm, D.permits.length), cperm + " / " + D.permits.length, true],
        ["procurement", "Einkauf und Lieferungen", (D.procurement || []).length ? pc(cprocOk, D.procurement.length) : null, (D.procurement || []).length ? cprocOk + " / " + D.procurement.length : null, true], ["staff", "Personal", 71, null, true]]
        .map(function (x) { return { key: x[0], label: x[1], pct: x[2], detail: x[3], in_total: x[4], status: x[2] == null ? "keine Daten" : x[2] >= 95 ? "bereit" : x[2] >= 80 ? "fast bereit" : "offen" }; });
      D.permits.forEach(function (x) { if (x.status !== "erteilt") cr.push({ area: "permits", text: x.title, detail: x.status === "beantragt" ? "beantragt, noch nicht erteilt" : "noch nicht beantragt", code: x.status === "beantragt" ? "permit_requested" : "permit_open", arg: null }); });
      D.tasks.forEach(function (t) { if (t.priority === "Kritisch" && t.status !== "Erledigt" && t.status !== "Abgeschlossen") cr.push({ area: "tasks", text: t.title, detail: t.due_date && t.due_date < todayIso ? "überfällig seit " + t.due_date : "Aufgabe mit Priorität Kritisch", code: t.due_date && t.due_date < todayIso ? "overdue" : "critical_task", arg: t.due_date || null }); });
      var cnt = ca.filter(function (x) { return x.in_total && x.pct != null; }), covr = cnt.length ? Math.round(cnt.reduce(function (s, x) { return s + x.pct; }, 0) / cnt.length) : 0;
      var ccrit = [{ key: "overall", text: "Gesamtstand mindestens 95 %", ok: covr >= 95 }, { key: "critical", text: "Keine offenen kritischen Punkte", ok: cr.length === 0 }, { key: "areas", text: "Kein Bereich unter 80 %", ok: cnt.every(function (x) { return x.pct >= 80; }) }, { key: "data", text: "Aufgaben und Genehmigungen sind erfasst", ok: true }];
      var cready = ccrit.every(function (x) { return x.ok; });
      return ok({ hotel: { id: D.hotel.id, name: D.hotel.name, city: D.hotel.city || null, country: D.hotel.country || null, opening_date: D.hotel.opening_date || null }, date: todayIso, generated_at: new Date().toISOString(),
        ready: cready, title: cready ? "Eröffnungsbereit" : "Bereitschaftsbericht", overall: covr, areas: ca, criteria: ccrit, critical: cr.slice(0, 40), critical_count: cr.length, readiness_score: 62,
        days_to_opening: D.hotel.opening_date ? Math.round((new Date(D.hotel.opening_date + "T00:00:00Z") - new Date(todayIso + "T00:00:00Z")) / 86400000) : null,
        code: "DEMO-Pruefcode-nicht-gueltig-nur-Beispiel", verify_url: "DEMO – kein echter Prüfcode", secret_fallback: false }); }
    if (p === H + "/emergency-folder" && m === "GET") {
      if (ROLE === "member") return deny("Den Notfall-Modus nutzt die Leitung.");
      var etom = add(todayIso, 1), emn = function (u) { var mb = D.members.find(function (x) { return x.user_id === u; }); return mb ? mb.email.split("@")[0] : "Teammitglied"; }, eq = qualSet(todayIso), ehm = function (t, d) { return String(t || d).slice(0, 5); };
      var esh = D.shifts.filter(function (s) { return s.shift_date === todayIso && ["Früh", "Spät", "Nacht", "Zwischen"].indexOf(s.kind) >= 0 && (ROLE === "admin" || !MYDEPTS.length || MYDEPTS.indexOf(s.department) >= 0); }).map(function (s) {
        return { department: s.department, kind: s.kind, from: ehm(s.start_time, "06:00"), to: ehm(s.end_time, "14:30"), name: s.user_id ? emn(s.user_id) : String(s.employee_name || ""), first_aid: !!(s.user_id && eq[s.user_id] && eq[s.user_id]["Erste Hilfe"]), fire: !!(s.user_id && eq[s.user_id] && eq[s.user_id]["Brandschutz"]) }; })
        .sort(function (a, c) { return a.department.localeCompare(c.department, "de") || a.from.localeCompare(c.from) || a.name.localeCompare(c.name, "de"); });
      var ear = D.arrivals.filter(function (a) { return a.arrival_date === todayIso || a.arrival_date === etom; }).sort(function (a, c) { return a.arrival_date < c.arrival_date ? -1 : a.arrival_date > c.arrival_date ? 1 : String(a.guest_name).localeCompare(c.guest_name, "de"); }).map(function (a) {
        return { arrival_date: a.arrival_date, departure_date: a.departure_date || null, guest_name: a.guest_name, room: a.assigned_room || null, room_type: a.room_type || null, adults: a.adults != null ? a.adults : null, children: a.children != null ? a.children : null, vip: a.vip === true, eta: a.eta || null }; });
      var erm = D.rooms.map(function (r) { return { number: r.number, floor: r.floor || floorOfR(r) || null, room_type: r.room_type || null, status: r.status, occupancy: r.occupancy }; }).sort(function (a, c) { return String(a.number).localeCompare(String(c.number), "de", { numeric: true }); });
      return ok({ hotel: { id: D.hotel.id, name: D.hotel.name }, today: todayIso, tomorrow: etom, generated_at: new Date().toISOString(), generated_local: new Date().toTimeString().slice(0, 5), arrivals: ear, rooms: erm, shifts: esh,
        contacts: ((D.hotel.safety_settings || {}).emergency_contacts || []).slice(0, 15), reception_phone: (D.hotel.guest_info && D.hotel.guest_info.reception_phone) || "+43 512 555 0100",
        public_numbers: [{ label: "Feuerwehr", number: "122" }, { label: "Rettung", number: "144" }, { label: "Polizei", number: "133" }, { label: "Euro-Notruf", number: "112" }], missing: [] }); }
    if (p === H + "/emergency-contacts" && m === "PUT") {
      if (!(ROLE === "admin" || (ROLE === "manager" && (!MYDEPTS.length || MYDEPTS.indexOf("Sicherheit") >= 0)))) return deny("Notfallkontakte pflegen Admin, Gesamtleitung und Leitung Sicherheit.");
      var ecs = (Array.isArray(b.contacts) ? b.contacts : []).slice(0, 15).map(function (c) { return { name: String((c && c.name) || "").trim().slice(0, 60), role: String((c && c.role) || "").trim().slice(0, 60), phone: String((c && c.phone) || "").trim().slice(0, 30).replace(/[^0-9+()/ .-]/g, "") }; }).filter(function (c) { return c.name && c.phone; });
      D.hotel.safety_settings = Object.assign({}, D.hotel.safety_settings || {}, { emergency_contacts: ecs }); return ok({ contacts: ecs }); }
    if (p === H + "/emergency-mail") {
      var eelig = ROLE === "admin" || (ROLE === "manager" && (!MYDEPTS.length || MYDEPTS.indexOf("Rezeption & Empfang") >= 0));
      if (m === "PUT") { var eon = b.enabled === true; if (eon && !eelig) return deny("Die Notfall-Mail gibt es nur für Admin, Gesamtleitung und Leitung Rezeption."); D.emergency_mail_on = eon; return ok({ available: true, eligible: eelig, enabled: eon }); }
      return ok({ available: true, eligible: eelig, enabled: !!D.emergency_mail_on, hours: "05:00–08:00" }); }
    /* ===== Paket 043 B (Betrieb & Geld) und Team & Eigentümer (Antworten wie routes-money.js / routes-ops2.js; nur im Speicher) ===== */
    var r2x = function (n) { return Math.round(Number(n) * 100) / 100; }, r1x = function (n) { return Math.round(Number(n) * 10) / 10; }, SLOT = 15 * 60000;
    var dayDiff = function (a, c) { return Math.round((new Date(c + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000); };
    if (!D.p43) {
      var P = D.p43 = { cur: D.hotel.currency || "EUR" };
      // 1. Preisverlauf (Rapsöl: zwei Anstiege; Butter leicht; Rest stabil/fallend)
      var ob = function (name, unit, price, daysAgo, sup, src) { return { id: nid("po"), item_name: name, item_key: name.toLowerCase(), unit: unit, unit_price: price, observed_on: add(todayIso, -daysAgo), supplier_id: "sp-2", supplier_name: sup || "GastroGroß", source: src || "bestellung", ref_id: null, created_at: add(todayIso, -daysAgo) + "T08:00:00Z" }; };
      P.obs = [ob("Rapsöl 10 l", "Kanister", 21.5, 330), ob("Rapsöl 10 l", "Kanister", 22.9, 160, null, "rechnung"), ob("Rapsöl 10 l", "Kanister", 26.4, 25),
        ob("Butter 250 g", "Stück", 2.1, 300), ob("Butter 250 g", "Stück", 2.18, 140), ob("Butter 250 g", "Stück", 2.24, 20),
        ob("Espresso Bohnen 1 kg", "kg", 14.2, 280, "Kaffeerösterei Alm"), ob("Espresso Bohnen 1 kg", "kg", 14.2, 100, "Kaffeerösterei Alm"), ob("Espresso Bohnen 1 kg", "kg", 14.4, 15, "Kaffeerösterei Alm"),
        ob("Mineralwasser 0,33 l", "Flasche", 0.52, 250), ob("Mineralwasser 0,33 l", "Flasche", 0.49, 40)];
      P.quotes = {};
      P.supInv = [{ id: "si-1", supplier_id: "sp-2", supplier_name: "GastroGroß", invoice_number: "GG-88231", invoice_date: add(todayIso, -25), amount: 1284.6, currency: P.cur }, { id: "si-2", supplier_id: "sp-1", supplier_name: "Textil Moser", invoice_number: "TM-2026-417", invoice_date: add(todayIso, -40), amount: 932.0, currency: P.cur }];
      // 2. Mahnwesen: 3 offene Rechnungen
      P.dset = { enabled: true, auto: false, days: [7, 14, 14], fees: [0, 0, 10], pay_days: 7 };
      P.eset = { price_per_kw_month: 9.5, max_kw: 55 };
      var di = function (id, no, rec, mail, issued, due, gross) { return { id: id, number: no, kind: "Rechnung", issued_on: add(todayIso, issued), due_on: add(todayIso, due), recipient: rec, recipient_email: mail, gross_total: gross, deducted: 0, currency: P.cur, status: "offen", seller: { company: D.hotel.name, email: "rechnung@alpenblick.example", iban: "AT61 1904 3002 3457 3201", bic: "BKAUATWW", bank: "Bank Austria" } }; };
      P.dinv = [di("dn-1", "RE-" + todayIso.slice(0, 4) + "-0011", "Reisebüro Tirol Tours", "buchhaltung@tirol-tours.example", -26, -12, 3480), di("dn-2", "RE-" + todayIso.slice(0, 4) + "-0007", "Firma Innova GmbH (Seminar)", "ap@innova.example", -54, -40, 1850.5), di("dn-3", "RE-" + todayIso.slice(0, 4) + "-0003", "Hochzeit Berger/Huber", "familie.berger@example.com", -89, -75, 6200)];
      P.drem = [{ id: "dr-1", invoice_id: "dn-2", level: 0, sent_at: add(todayIso, -25) + "T09:00:00Z", due_on: add(todayIso, -18), fee: 0, sent_to: "ap@innova.example" },
        { id: "dr-2", invoice_id: "dn-3", level: 0, sent_at: add(todayIso, -60) + "T09:00:00Z", due_on: add(todayIso, -53), fee: 0, sent_to: "familie.berger@example.com" }, { id: "dr-3", invoice_id: "dn-3", level: 1, sent_at: add(todayIso, -40) + "T09:00:00Z", due_on: add(todayIso, -33), fee: 0, sent_to: "familie.berger@example.com" }];
      P.dstate = function (inv) {
        var set = P.dset, due = inv.due_on, over = dayDiff(due, todayIso), sent = P.drem.filter(function (r) { return r.invoice_id === inv.id; }).sort(function (a, c) { return a.level - c.level; }), last = sent.length ? sent[sent.length - 1] : null, nx = last ? last.level + 1 : 0;
        var base = { due_on: due, days_overdue: over, reminders: sent, last_level: last ? last.level : null }, names = ["Zahlungserinnerung", "1. Mahnung", "2. Mahnung", "Letzte Mahnung"];
        if (nx >= set.days.length || nx > 3) return Object.assign(base, { next: null, final_reached: true });
        var at = add(last ? String(last.sent_at).slice(0, 10) : due, set.days[nx]);
        return Object.assign(base, { next: { level: nx, name: names[nx], due_at: at, due_now: over > 0 && todayIso >= at, fee: set.fees[nx] || 0, pay_until: add(todayIso, set.pay_days) } });
      };
      // 3. Schwund (portions = Abgang x Portionen je Einheit)
      var si = function (id, name, dep, unit, sku, per, outS, sold) { return { id: id, name: name, department: dep, unit: unit, pos_sku: sku, pos_units_per_stock: per, out_stock: outS, sold: sold }; };
      P.shr = [si("sh-1", "Grüner Veltliner 0,75 l", "Food & Beverage", "Flasche", "W-GV-015", 5, 40, 196), si("sh-2", "Prosecco 0,75 l", "Food & Beverage", "Flasche", "S-PRO-01", 6, 30, 175),
        si("sh-3", "Bier Fass 30 l", "Food & Beverage", "Fass", "B-FASS-03", 60, 12, 690), si("sh-4", "Whisky 0,7 l", "Food & Beverage", "Flasche", "D-WHI-004", 14, 14, 142), si("sh-5", "Kaffeebohnen 1 kg", "Food & Beverage", "kg", "K-ESP-01", 120, 18, 2105)];
      P.unm = [{ sku: "tiroler groestl", item_name: "Tiroler Gröstl", qty: 212 }, { sku: "kaiserschmarrn", item_name: "Kaiserschmarrn", qty: 164 }];
      // 4. Geräte und Läufe (Wochen -1 bis +2, lokale Zeit)
      P.dev = [{ id: "ed-1", hotel_id: D.hotel.id, name: "Kombidämpfer Küche", kw: 24, flexible: false, note: "Frühstücksvorbereitung" }, { id: "ed-2", hotel_id: D.hotel.id, name: "Industrie-Waschmaschine", kw: 18, flexible: true, note: null },
        { id: "ed-3", hotel_id: D.hotel.id, name: "Wäschetrockner", kw: 22, flexible: true, note: null }, { id: "ed-4", hotel_id: D.hotel.id, name: "Poolwärmepumpe", kw: 15, flexible: true, note: "Ladezeit nach Bedarf" }];
      P.runs = [];
      var mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      for (var wk = -1; wk <= 2; wk++) for (var dy = 0; dy < 7; dy++) {
        var dd = new Date(mon.getTime()); dd.setDate(dd.getDate() + wk * 7 + dy);
        [["ed-1", 6, 9], ["ed-2", 6.5, 10], ["ed-3", 7, 10], ["ed-4", 6, 8]].forEach(function (rr) {
          var s = new Date(dd.getTime()); s.setHours(Math.floor(rr[1]), (rr[1] % 1) * 60, 0, 0); var e = new Date(dd.getTime()); e.setHours(Math.floor(rr[2]), (rr[2] % 1) * 60, 0, 0);
          P.runs.push({ id: nid("dr"), hotel_id: D.hotel.id, device_id: rr[0], start_at: s.toISOString(), end_at: e.toISOString(), planned: true });
        });
      }
      // Hilfen Lastspitzen
      P.curve = function (runs, from, to) { var n = Math.max(0, Math.ceil((to - from) / SLOT)), ld = []; for (var i = 0; i < n; i++) ld.push(0); runs.forEach(function (r) { P.addRun(ld, from, Date.parse(r.start_at), Date.parse(r.end_at), (byId(P.dev, r.device_id) || {}).kw || 0, 1); }); return ld; };
      P.addRun = function (ld, from, s, e, kw, sg) { if (!(e > s) || !kw) return; var i0 = Math.max(0, Math.floor((s - from) / SLOT)), i1 = Math.min(ld.length - 1, Math.floor((e - 1 - from) / SLOT));
        for (var i = i0; i <= i1; i++) { var a = from + i * SLOT, ov = Math.min(e, a + SLOT) - Math.max(s, a); if (ov > 0) ld[i] += sg * kw * ov / SLOT; } };
      P.peak = function (ld) { var m = { kw: 0, i: -1 }; ld.forEach(function (x, i) { if (x > m.kw + 1e-9) m = { kw: x, i: i }; }); return m; };
      P.suggest = function (runs, from, to, maxH) {
        var ld = P.curve(runs, from, to), before = P.peak(ld), steps = Math.round(maxH * 4);
        var cand = runs.filter(function (r) { var d = byId(P.dev, r.device_id); return r.planned && d && d.flexible; }).map(function (r) { return { id: r.id, device_id: r.device_id, start_at: r.start_at, s: Date.parse(r.start_at), e: Date.parse(r.end_at), kw: byId(P.dev, r.device_id).kw }; })
          .sort(function (a, c) { return c.kw * (c.e - c.s) - a.kw * (a.e - a.s); });
        for (var pass = 0; pass < 2; pass++) cand.forEach(function (r) {
          P.addRun(ld, from, r.s, r.e, r.kw, -1); var best = null;
          for (var k = -steps; k <= steps; k++) { var s = r.s + k * SLOT, e = r.e + k * SLOT; if (s < from || e > to) continue; P.addRun(ld, from, s, e, r.kw, 1);
            var pk = P.peak(ld).kw, sq = ld.reduce(function (a, x) { return a + x * x; }, 0); P.addRun(ld, from, s, e, r.kw, -1);
            var sc = [r1x(pk * 10), sq, Math.abs(k)];
            if (!best || sc[0] < best.sc[0] || (sc[0] === best.sc[0] && (sc[1] < best.sc[1] - 1e-6 || (Math.abs(sc[1] - best.sc[1]) <= 1e-6 && sc[2] < best.sc[2])))) best = { k: k, sc: sc }; }
          var kk = best ? best.k : 0; r.s += kk * SLOT; r.e += kk * SLOT; P.addRun(ld, from, r.s, r.e, r.kw, 1); });
        var after = P.peak(ld), mv = [];
        cand.forEach(function (r) { var o = Date.parse(r.start_at); if (r.s !== o) mv.push({ run_id: r.id, device_id: r.device_id, device: (byId(P.dev, r.device_id) || {}).name || "", kw: r.kw, from_start: new Date(o).toISOString(), to_start: new Date(r.s).toISOString(), to_end: new Date(r.e).toISOString(), shift_min: Math.round((r.s - o) / 60000) }); });
        if (after.kw >= before.kw - 0.05) return { before: r2x(before.kw), after: r2x(before.kw), moves: [] };
        return { before: r2x(before.kw), after: r2x(after.kw), moves: mv };
      };
      // Team & Eigentümer
      var oc = function (d, h) { return new Date(add(todayIso, d) + "T" + h + ":00Z").toISOString(); };
      P.inc = [{ id: "ic-1", hotel_id: D.hotel.id, organization_id: ORG, kind: "Mitarbeiterunfall", occurred_at: oc(-12, "09:40"), location: "Küche, Kochbereich", description: "Schnittverletzung am linken Zeigefinger beim Gemüseschneiden. Wunde in der Erste-Hilfe-Station versorgt, Arzt am selben Tag aufgesucht.",
          persons: [{ name: "Küchenhilfe (Mitarbeitende)", role: "Verletzte Person", contact: null }], witnesses: [{ name: "Sous-Chef", role: "Zeuge", contact: null }], measures: "Schneidehandschuhe für alle Posten bestellt; Unterweisung im Team wiederholt.", insurer: "AUVA", insurer_notified_at: oc(-11, "08:00"), status: "gemeldet", created_at: oc(-12, "10:30"), created_by: "u-hkm", photos: [], signature_data: null },
        { id: "ic-2", hotel_id: D.hotel.id, organization_id: ORG, kind: "Gästeunfall", occurred_at: oc(-3, "16:20"), location: "Poolbereich", description: "Gast ist auf nassem Boden ausgerutscht und leicht gestürzt, Prellung am Knie. Eis angelegt, Gast lehnt Arzt ab.",
          persons: [{ name: "Gast Zimmer 214", role: "Betroffener Gast", contact: null }], witnesses: [], measures: "Rutschfeste Matten am Beckenrand ausgelegt, Warnschild aufgestellt.", insurer: null, insurer_notified_at: null, status: "offen", created_at: oc(-3, "17:00"), created_by: ME, photos: [], signature_data: null }];
      P.meals = []; P.mealSet = { values: { "Frühstück": 1.5, Mittag: 3, Abend: 3 }, country: "Österreich" };
      P.wt = []; P.pay = [];
      var cx = function (id, comp, area, y, life, cond, cost, qty, room) { return { id: id, hotel_id: D.hotel.id, room_id: room ? room.id : null, area: area, component: comp, installed_on: y + "-06-01", lifetime_years: life, condition: cond, unit_cost: cost, quantity: qty, note: null, created_at: todayIso + "T08:00:00Z", rooms: room ? { number: room.number, room_type: room.room_type } : null }; };
      var rm = function (n) { return (D.rooms || []).find(function (r) { return String(r.number) === n; }) || null; };
      P.capex = [cx("cx-1", "Teppich Flure", "Etagen 1–3", 2016, 10, 2, 38, 420, null), cx("cx-2", "Matratzen", "Zimmer 101", 2018, 8, 3, 480, 1, rm("101")), cx("cx-3", "Fassadenanstrich", "Außenhülle", 2019, 8, 3, 54000, 1, null),
        cx("cx-4", "Aufzugssteuerung", "Haupttreppenhaus", 2008, 20, 4, 42000, 1, null), cx("cx-5", "Lobby-Möbel", "Empfang", 2017, 10, 2, 18500, 1, null), cx("cx-6", "Industrie-Waschmaschinen", "Wäscherei", 2019, 7, 3, 9800, 2, null),
        cx("cx-7", "Kühlanlage Küche", "Küche", 2014, 16, 4, 31000, 1, null), cx("cx-8", "Dachterrasse Abdichtung", "Dach", 2015, 15, 3, 26000, 1, null), cx("cx-9", "Badezimmer-Fliesen", "Zimmer 102", 2011, 15, 3, 3600, 1, rm("102"))];
    }
    var P43 = D.p43, yr43 = Number(todayIso.slice(0, 4));
    var HR43 = ROLE === "admin" || ROLE === "manager";
    var uid43 = function () { return String(Math.abs(nextId)) && ME; };
    if (/^\/api\/(hotels\/[^/]+\/(money-settings|price-watch|price-observations|dunning|pos-items|shrinkage|energy-peaks|energy-devices|device-runs)|price-observations\/|invoices\/[^/]+\/reminder|stock-items\/[^/]+\/pos-mapping|energy-devices\/|device-runs\/)/.test(p) && !HR43) return deny("Dafür fehlt die Berechtigung.");
    if (p === H + "/money-settings") {
      if (m === "PUT") { if (b.dunning_settings !== undefined) { var ds = b.dunning_settings || {}; P43.dset = { enabled: !!ds.enabled, auto: !!ds.auto && !!ds.enabled, days: (ds.days || P43.dset.days).slice(0, 4).map(function (x) { return Math.max(1, Math.round(Number(x)) || 7); }), fees: (ds.fees || P43.dset.fees).map(function (x) { return Number(x) > 0 ? r2x(x) : 0; }), pay_days: Math.round(Number(ds.pay_days)) || 7 }; }
        if (b.energy_peak_settings !== undefined) { var es43 = b.energy_peak_settings || {}; P43.eset = { price_per_kw_month: Number(es43.price_per_kw_month) >= 0 && es43.price_per_kw_month !== "" && es43.price_per_kw_month != null ? r2x(es43.price_per_kw_month) : null, max_kw: Number(es43.max_kw) > 0 ? r1x(es43.max_kw) : null }; } }
      return ok({ dunning_settings: P43.dset, energy_peak_settings: P43.eset, can: { dunning: true, energy: true } }); }
    if (p === H + "/price-watch") {
      var groups = {}; P43.obs.forEach(function (o) { var k = o.item_key + "|" + (o.unit || "").toLowerCase(); (groups[k] = groups[k] || []).push(o); });
      var items = Object.keys(groups).map(function (k) {
        var l = groups[k].slice().sort(function (a, c) { return a.observed_on.localeCompare(c.observed_on); }), lt = l[l.length - 1], ch = {};
        [3, 6, 12].forEach(function (mo) { var cut = add(todayIso, -30 * mo), ref = l.slice().reverse().find(function (x) { return x.observed_on <= cut; }); ch["m" + mo] = ref ? { price: ref.unit_price, on: ref.observed_on, pct: r1x((lt.unit_price - ref.unit_price) * 100 / ref.unit_price) } : null; });
        var pv = l.length > 1 ? l[l.length - 2] : null, pcts = Object.keys(ch).filter(function (c) { return ch[c]; }).map(function (c) { return ch[c].pct; }), mx = pcts.length ? Math.max.apply(null, pcts) : null;
        return { key: k, item_key: lt.item_key, item_name: lt.item_name, unit: lt.unit || null, latest: { price: lt.unit_price, on: lt.observed_on, supplier_name: lt.supplier_name, source: lt.source }, previous: pv ? { price: pv.unit_price, on: pv.observed_on, pct: r1x((lt.unit_price - pv.unit_price) * 100 / pv.unit_price) } : null,
          change: ch, max_pct: mx, warn: mx !== null && mx >= 10, min: Math.min.apply(null, l.map(function (x) { return x.unit_price; })), max: Math.max.apply(null, l.map(function (x) { return x.unit_price; })), count: l.length,
          suppliers: l.map(function (x) { return x.supplier_name; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }), history: l.slice(-24).map(function (x) { return { id: x.id, on: x.observed_on, price: x.unit_price, supplier_name: x.supplier_name, source: x.source }; }) };
      }).sort(function (a, c) { return (c.warn - a.warn) || ((c.max_pct == null ? -1e9 : c.max_pct) - (a.max_pct == null ? -1e9 : a.max_pct)); });
      return ok({ items: items, warn_count: items.filter(function (x) { return x.warn; }).length, observations: P43.obs.length, synced: 0 }); }
    if (p === H + "/price-observations" && m === "POST") {
      var list43 = Array.isArray(b.rows) ? b.rows : [b], saved = [];
      for (var li = 0; li < list43.length; li++) { var x43 = list43[li], nm = String(x43.item_name || "").trim(), pr = Number(String(x43.unit_price).replace(",", "."));
        if (!nm) return ok({ error: "Bitte den Artikel angeben." }, 400); if (!(pr > 0)) return ok({ error: "Bitte einen gültigen Stückpreis angeben." }, 400);
        var o43 = { id: nid("po"), item_name: nm, item_key: nm.toLowerCase(), unit: String(x43.unit || "").trim() || null, unit_price: pr, observed_on: x43.observed_on || todayIso, supplier_id: x43.supplier_id || null, supplier_name: x43.supplier_name || null, source: x43.source || "manuell", ref_id: x43.ref_id || null, created_at: new Date().toISOString() };
        P43.obs.push(o43); saved.push(o43); }
      return ok({ saved: saved.length, rows: saved }); }
    if ((mm = p.match(/^\/api\/price-observations\/([^/]+)$/)) && m === "DELETE") { remove(P43.obs, mm[1]); return ok({ ok: true }); }
    if (p === H + "/price-watch/invoices") return ok(P43.supInv);
    if (p === H + "/price-watch/quote-request" && m === "POST") {
      var qi = String(b.item_name || "").trim(); if (!qi) return ok({ error: "Bitte den Artikel angeben." }, 400);
      if (P43.quotes[qi]) return ok(Object.assign({ existed: true }, P43.quotes[qi]));
      P43.quotes[qi] = { id: nid("qr"), title: "Angebot: " + qi, status: "offen" }; return ok(P43.quotes[qi]); }
    if (p === H + "/dunning") {
      var rows43 = P43.dinv.filter(function (i) { return i.status === "offen"; }).map(function (i) { var o = Object.assign({}, i); delete o.seller; return Object.assign(o, { open: r2x(i.gross_total - i.deducted) }, P43.dstate(i)); });
      var ag = { not_due: { count: 0, amount: 0 }, d0_30: { count: 0, amount: 0 }, d31_60: { count: 0, amount: 0 }, d60p: { count: 0, amount: 0 } };
      rows43.forEach(function (r) { var k = r.days_overdue <= 0 ? "not_due" : r.days_overdue <= 30 ? "d0_30" : r.days_overdue <= 60 ? "d31_60" : "d60p"; ag[k].count++; ag[k].amount = r2x(ag[k].amount + r.open); });
      return ok({ settings: P43.dset, aging: ag, invoices: rows43, due_now: rows43.filter(function (r) { return r.next && r.next.due_now; }).length, can_send: true, today: todayIso }); }
    if ((mm = p.match(/^\/api\/invoices\/([^/]+)\/reminder-preview$/))) {
      var iv43 = byId(P43.dinv, mm[1]); if (!iv43) return nf(); var st43 = P43.dstate(iv43); if (!st43.next) return ok({ error: "Alle Mahnstufen sind verschickt." }, 400);
      var en = q.get("language") === "en", amt = r2x(iv43.gross_total - iv43.deducted), fmt = function (n) { return n.toLocaleString(en ? "en-GB" : "de-AT", { style: "currency", currency: P43.cur }); }, nx43 = st43.next;
      var txt = en ? ["Dear Sir or Madam,", "", "we have not yet received payment for our invoice " + iv43.number + " for " + fmt(amt) + " (due since " + iv43.due_on + "). Please settle the amount by " + nx43.pay_until + ".", nx43.fee > 0 ? "\nReminder fee: " + fmt(nx43.fee) + "." : "", "", "Kind regards", D.hotel.name]
        : ["Guten Tag,", "", "zu unserer Rechnung " + iv43.number + " über " + fmt(amt) + " (fällig seit " + iv43.due_on + ") konnten wir bis heute keine Zahlung feststellen. Bitte begleichen Sie den Betrag bis " + nx43.pay_until + ".", nx43.fee > 0 ? "\nFür diese Mahnung berechnen wir Mahnspesen von " + fmt(nx43.fee) + "." : "", "", "Mit freundlichen Grüßen", D.hotel.name];
      return ok({ level: nx43.level, name: nx43.name, fee: nx43.fee, pay_until: nx43.pay_until, email: iv43.recipient_email || "", subject: nx43.name + (en ? " for invoice " : " zur Rechnung ") + iv43.number + " – " + D.hotel.name, text: txt.filter(function (l) { return l !== ""  || true; }).join("\n") }); }
    if ((mm = p.match(/^\/api\/invoices\/([^/]+)\/reminder$/)) && m === "POST") {
      var iv44 = byId(P43.dinv, mm[1]); if (!iv44) return nf(); var st44 = P43.dstate(iv44); if (!st44.next) return ok({ error: "Alle Mahnstufen sind verschickt." }, 400);
      if (b.level !== undefined && Number(b.level) !== st44.next.level) return ok({ error: "Die Mahnstufe hat sich inzwischen geändert. Bitte neu laden." }, 409);
      var rem44 = { id: nid("dr"), hotel_id: D.hotel.id, invoice_id: iv44.id, level: st44.next.level, sent_at: new Date().toISOString(), due_on: st44.next.pay_until, fee: st44.next.fee || 0, sent_to: b.manual === true ? "Post" : (b.email || iv44.recipient_email) };
      P43.drem.push(rem44); return ok(rem44); }
    if (p === H + "/pos-items/import" && m === "POST") {
      var imp = (Array.isArray(b.rows) ? b.rows : []).filter(function (r) { return r && (r.sku || r.item_name) && Number(r.qty) === Number(r.qty); }); if (!imp.length) return ok({ error: "In der Datei wurden keine gültigen Verkaufszeilen erkannt.", skipped: [] }, 400);
      imp.forEach(function (r) { var it = P43.shr.find(function (s) { return String(s.pos_sku).toLowerCase() === String(r.sku || "").toLowerCase(); }); if (it) it.sold = r2x(it.sold + Number(r.qty)); });
      return ok({ saved: imp.length, skipped: [], skipped_count: (Array.isArray(b.rows) ? b.rows.length : 0) - imp.length }); }
    if (p === H + "/pos-items") {
      if (m === "DELETE") return ok({ deleted: 0 });
      return ok({ from: q.get("from") || add(todayIso, -30), to: q.get("to") || todayIso, items: P43.shr.map(function (s) { return { sku: s.pos_sku, item_name: s.name, qty: s.sold, days: 30 }; }).concat(P43.unm.map(function (u) { return { sku: u.sku, item_name: u.item_name, qty: u.qty, days: 30 }; })).sort(function (a, c) { return c.qty - a.qty; }), rows: 120 }); }
    if ((mm = p.match(/^\/api\/stock-items\/([^/]+)\/pos-mapping$/)) && m === "PATCH") {
      var sh = byId(P43.shr, mm[1]); if (!sh) return nf();
      if (b.pos_sku !== undefined) sh.pos_sku = String(b.pos_sku || "").trim() || null;
      if (b.pos_units_per_stock !== undefined) { var un = Number(b.pos_units_per_stock); if (!(un > 0)) return ok({ error: "Bitte die Portionen je Lagereinheit angeben (größer als 0)." }, 400); sh.pos_units_per_stock = un; }
      return ok({ id: sh.id, name: sh.name, pos_sku: sh.pos_sku, pos_units_per_stock: sh.pos_units_per_stock }); }
    if (p === H + "/shrinkage") {
      var srows = P43.shr.filter(function (s) { return s.pos_sku; }).map(function (s) { var per = s.pos_units_per_stock > 0 ? s.pos_units_per_stock : 1, por = r2x(s.out_stock * per), diff = r2x(por - s.sold), rate = por > 0 ? r1x(diff * 100 / por) : null;
        var light = por <= 0 && s.sold <= 0 ? "grau" : por <= 0 || diff < 0 ? "gelb" : rate <= 3 ? "gruen" : rate <= 8 ? "gelb" : "rot";
        return { id: s.id, name: s.name, department: s.department, unit: s.unit, pos_sku: s.pos_sku, units_per_stock: per, out_stock: s.out_stock, portions: por, sold: s.sold, diff: diff, rate: rate, light: light, value_hint: null, sold_more: diff < 0 }; });
      var ord = { rot: 0, gelb: 1, gruen: 2, grau: 3 }; srows.sort(function (a, c) { return ord[a.light] - ord[c.light] || (c.rate == null ? -1e9 : c.rate) - (a.rate == null ? -1e9 : a.rate); });
      var tp = 0, td = 0; srows.forEach(function (r) { tp += Math.max(0, r.portions); td += Math.max(0, r.diff); });
      return ok({ from: q.get("from") || add(todayIso, -30), to: q.get("to") || todayIso, rows: srows, unmapped: P43.unm, total_rate: tp > 0 ? r1x(td * 100 / tp) : null,
        items: P43.shr.map(function (s) { return { id: s.id, name: s.name, department: s.department, unit: s.unit, pos_sku: s.pos_sku || null, pos_units_per_stock: s.pos_units_per_stock || 1 }; }) }); }
    if (p === H + "/energy-devices") { if (m === "POST") { var nd = { id: nid("ed"), hotel_id: D.hotel.id, name: String(b.name || "").trim(), kw: Number(b.kw), flexible: !!b.flexible, note: b.note || null };
        if (!nd.name) return ok({ error: "Bitte einen Namen angeben." }, 400); if (!(nd.kw > 0)) return ok({ error: "Bitte die Leistung in kW angeben (größer als 0)." }, 400); P43.dev.push(nd); return ok(nd); }
      return ok(P43.dev.slice().sort(function (a, c) { return a.name.localeCompare(c.name, "de"); })); }
    if ((mm = p.match(/^\/api\/energy-devices\/([^/]+)$/))) { if (m === "DELETE") { remove(P43.dev, mm[1]); P43.runs = P43.runs.filter(function (r) { return r.device_id !== mm[1]; }); return ok({ ok: true }); } var dv = byId(P43.dev, mm[1]); if (!dv) return nf(); Object.assign(dv, b); return ok(dv); }
    if (p === H + "/device-runs/copy-week" && m === "POST") {
      var src = Date.parse(b.from), dst = Date.parse(b.to), W = 7 * 86400000; if (!isFinite(src) || !isFinite(dst) || src === dst) return ok({ error: "Bitte Quell- und Zielwoche wählen." }, 400);
      var inRange = function (a) { return P43.runs.filter(function (r) { var t = Date.parse(r.start_at); return t >= a && t < a + W; }); };
      if (inRange(dst).length && b.force !== true) return ok({ error: "In der Zielwoche gibt es schon Läufe." }, 409);
      var srcRuns = inRange(src); if (!srcRuns.length) return ok({ error: "In der Quellwoche gibt es keine Läufe." }, 400);
      srcRuns.forEach(function (r) { P43.runs.push({ id: nid("dr"), hotel_id: D.hotel.id, device_id: r.device_id, start_at: new Date(Date.parse(r.start_at) + dst - src).toISOString(), end_at: new Date(Date.parse(r.end_at) + dst - src).toISOString(), planned: true }); });
      return ok({ copied: srcRuns.length }); }
    if (p === H + "/device-runs") {
      if (m === "POST") { var s1 = Date.parse(b.start_at), e1 = Date.parse(b.end_at); if (!byId(P43.dev, b.device_id)) return ok({ error: "Bitte ein Gerät wählen." }, 400); if (!isFinite(s1) || !isFinite(e1)) return ok({ error: "Bitte Beginn und Ende angeben." }, 400);
        if (!(e1 > s1)) return ok({ error: "Das Ende muss nach dem Beginn liegen." }, 400); var nr = { id: nid("dr"), hotel_id: D.hotel.id, device_id: b.device_id, start_at: new Date(s1).toISOString(), end_at: new Date(e1).toISOString(), planned: b.planned !== false }; P43.runs.push(nr); return ok(nr); }
      var f1 = Date.parse(q.get("from")), t1 = Date.parse(q.get("to")); return ok(P43.runs.filter(function (r) { return Date.parse(r.start_at) < t1 && Date.parse(r.end_at) > f1; }).sort(function (a, c) { return a.start_at.localeCompare(c.start_at); })); }
    if ((mm = p.match(/^\/api\/device-runs\/([^/]+)$/))) { if (m === "DELETE") { remove(P43.runs, mm[1]); return ok({ ok: true }); } var rn = byId(P43.runs, mm[1]); if (!rn) return nf(); ["start_at", "end_at", "planned", "device_id"].forEach(function (k) { if (b[k] !== undefined) rn[k] = b[k]; }); return ok(rn); }
    if (p === H + "/energy-peaks") {
      var from43 = Date.parse(q.get("from")), to43 = Date.parse(q.get("to")); if (!isFinite(from43) || !isFinite(to43) || to43 <= from43) return ok({ error: "Bitte eine Woche wählen." }, 400);
      var runs43 = P43.runs.filter(function (r) { return Date.parse(r.start_at) < to43 && Date.parse(r.end_at) > from43; }), ld43 = P43.curve(runs43, from43, to43), pk43 = P43.peak(ld43), mxs = Math.min(12, Math.max(1, Number(q.get("max_shift_h")) || 6));
      var sg43 = P43.suggest(runs43, from43, to43, mxs), set43 = P43.eset, hrs = []; for (var hi = 0; hi < ld43.length; hi += 4) hrs.push(r1x(Math.max.apply(null, ld43.slice(hi, hi + 4))));
      return ok({ from: new Date(from43).toISOString(), to: new Date(to43).toISOString(), settings: set43, devices: P43.dev.map(function (d) { return { id: d.id, name: d.name, kw: d.kw, flexible: d.flexible }; }), runs: runs43.map(function (r) { return { id: r.id, device_id: r.device_id, start_at: r.start_at, end_at: r.end_at, planned: r.planned }; }),
        slots: ld43.map(r1x), hours: hrs, peak: { kw: r2x(pk43.kw), at: pk43.i >= 0 ? new Date(from43 + pk43.i * SLOT).toISOString() : null }, over_max: set43.max_kw ? r2x(Math.max(0, pk43.kw - set43.max_kw)) : null,
        suggestion: Object.assign({}, sg43, { max_shift_h: mxs, saving_month: set43.price_per_kw_month != null ? r2x((sg43.before - sg43.after) * set43.price_per_kw_month) : null }) }); }
    // Unfall- und Schadensprotokoll
    var incList = function () { return P43.inc.filter(function (i) { return HR43 || i.created_by === ME; }); };
    var incLite = function (i) { var o = Object.assign({}, i); delete o.photos; delete o.signature_data; return o; };
    if (p === H + "/incidents") {
      if (m === "POST") { if (!b.kind) return ok({ error: "Bitte die Art des Vorfalls wählen." }, 400); if (!b.occurred_at || isNaN(Date.parse(b.occurred_at))) return ok({ error: "Bitte Datum und Uhrzeit des Vorfalls angeben." }, 400); if (!String(b.description || "").trim()) return ok({ error: "Bitte beschreiben, was passiert ist." }, 400);
        var ni = { id: nid("ic"), hotel_id: D.hotel.id, organization_id: ORG, kind: b.kind, occurred_at: new Date(b.occurred_at).toISOString(), location: b.location || null, description: b.description, persons: b.persons || [], witnesses: b.witnesses || [], measures: b.measures || null, insurer: b.insurer || null,
          insurer_notified_at: b.insurer_notified_at || (b.status === "gemeldet" ? new Date().toISOString() : null), status: b.status || "offen", created_at: new Date().toISOString(), created_by: ME, photos: b.photos || [], signature_data: b.signature_data || null };
        P43.inc.unshift(ni); return ok(incLite(ni)); }
      var il = incList().slice().sort(function (a, c) { return c.occurred_at.localeCompare(a.occurred_at); }); if (q.get("status")) il = il.filter(function (i) { return i.status === q.get("status"); }); return ok(il.map(incLite)); }
    if ((mm = p.match(/^\/api\/incidents\/([^/]+)$/))) { var ix = byId(P43.inc, mm[1]); if (!ix) return nf();
      if (m === "DELETE") { remove(P43.inc, mm[1]); return ok({ ok: true }); }
      if (m === "PATCH") { ["kind", "occurred_at", "location", "description", "persons", "witnesses", "measures", "photos", "signature_data", "insurer", "insurer_notified_at", "status"].forEach(function (k) { if (b[k] !== undefined) ix[k] = b[k]; });
        if (b.status === "gemeldet" && b.insurer_notified_at === undefined && !ix.insurer_notified_at) ix.insurer_notified_at = new Date().toISOString(); return ok(incLite(ix)); }
      return ok(ix); }
    // Personalverpflegung
    if (p === H + "/staff-meal-settings") { if (m === "PUT") { if (!HR43) return deny("Sachbezugswerte stellen Admin oder Leitung Personal ein."); var vv = b.values || {}; P43.mealSet = { values: { "Frühstück": Number(vv["Frühstück"]) || 0, Mittag: Number(vv.Mittag) || 0, Abend: Number(vv.Abend) || 0 }, country: b.country || null }; } return ok(P43.mealSet); }
    if (p === H + "/staff-meals/counts") {
      var cf = q.get("from") || todayIso, ct = q.get("to") || add(cf, 1), days43 = {}; for (var cd = cf, cn = 0; cd <= ct && cn < 32; cd = add(cd, 1), cn++) { var wd = new Date(cd + "T12:00:00Z").getUTCDay(), base = wd === 0 || wd === 6 ? 0.6 : 1;
        days43[cd] = { "Frühstück": Math.round(14 * base) + (cn % 3), Mittag: Math.round(26 * base) + (cn % 4), Abend: Math.round(9 * base) + (cn % 2) };
        P43.meals.filter(function (r) { return r.meal_date === cd; }).forEach(function (r) { days43[cd][r.meal]++; }); }
      return ok({ from: cf, to: ct, days: days43 }); }
    if (p === H + "/staff-meals/month") {
      if (!HR43) return deny("Die Monatsauswertung sehen Admin und Leitung Personal.");
      var mo = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : todayIso.slice(0, 7), vals = P43.mealSet.values, ppl = D.members.filter(function (x) { return x.role !== "viewer"; }).slice(0, 6).map(function (x, i) {
        var c = { "Frühstück": 6 + (i * 3) % 9, Mittag: 14 + (i * 5) % 8, Abend: 3 + (i * 2) % 6 }; return { user_id: x.user_id, counts: c, amount: r2x(c["Frühstück"] * vals["Frühstück"] + c.Mittag * vals.Mittag + c.Abend * vals.Abend) }; });
      return ok({ month: mo, from: mo + "-01", to: mo + "-31", values: vals, country: P43.mealSet.country, people: ppl }); }
    if (p === H + "/staff-meals") {
      if (m === "POST") { if (!b.meal_date || b.meal_date < todayIso || b.meal_date > add(todayIso, 14)) return ok({ error: "Eintragen geht für heute und die nächsten 14 Tage." }, 400); if (["Frühstück", "Mittag", "Abend"].indexOf(b.meal) < 0) return ok({ error: "Bitte eine Mahlzeit wählen." }, 400);
        if (P43.meals.some(function (r) { return r.meal_date === b.meal_date && r.meal === b.meal && r.user_id === ME; })) return ok({ error: "Diese Mahlzeit ist schon eingetragen." }, 409);
        var sm = { id: nid("sm"), user_id: ME, meal_date: b.meal_date, meal: b.meal, created_at: new Date().toISOString() }; P43.meals.push(sm); return ok(sm); }
      var mf = q.get("from") || todayIso, mt = q.get("to") || add(mf, 1); return ok(P43.meals.filter(function (r) { return r.user_id === ME && r.meal_date >= mf && r.meal_date <= mt; })); }
    if ((mm = p.match(/^\/api\/staff-meals\/([^/]+)$/)) && m === "DELETE") { remove(P43.meals, mm[1]); return ok({ ok: true }); }
    // KV-Lohnprüfung (Lohntabelle bewusst leer: Hinweis erscheint in der Oberfläche)
    if (/^\/api\/(organizations\/[^/]+\/(wage-tables|staff-pay|wage-check)|wage-tables\/|staff-pay\/)/.test(p) && !HR43 && !(m === "GET" && /staff-pay$/.test(p))) return deny("Lohntabellen und Löhne pflegen nur Admin und Leitung Personal.");
    if (/^\/api\/organizations\/[^/]+\/wage-tables$/.test(p)) {
      if (m === "POST") { if (!String(b.name || "").trim()) return ok({ error: "Bitte einen Namen angeben (z. B. Kollektivvertrag und Jahr)." }, 400); if (!b.valid_from) return ok({ error: "Bitte das Datum „gültig ab“ angeben." }, 400);
        var wt = { id: nid("wt"), organization_id: ORG, name: b.name, country: b.country || null, valid_from: b.valid_from, valid_to: b.valid_to || null, groups: b.groups || [] }; P43.wt.unshift(wt); return ok(wt); }
      return ok(P43.wt); }
    if ((mm = p.match(/^\/api\/wage-tables\/([^/]+)$/))) { if (m === "DELETE") { remove(P43.wt, mm[1]); P43.pay.forEach(function (x) { if (x.wage_table_id === mm[1]) x.wage_table_id = null; }); return ok({ ok: true }); } var wx = byId(P43.wt, mm[1]); if (!wx) return nf(); Object.assign(wx, b); return ok(wx); }
    if (/^\/api\/organizations\/[^/]+\/staff-pay$/.test(p)) {
      if (m === "POST") { if (!b.user_id) return ok({ error: "Bitte eine Person wählen." }, 400); var pw = { id: nid("sp"), organization_id: ORG, user_id: b.user_id, wage_table_id: b.wage_table_id || null, wage_group: b.wage_group || null, pay_type: b.pay_type || "Monat", amount: Number(b.amount) || 0, hours_per_week: Number(b.hours_per_week) || 0, valid_from: b.valid_from || todayIso }; P43.pay.unshift(pw); return ok(pw); }
      return ok(HR43 ? P43.pay : P43.pay.filter(function (x) { return x.user_id === ME; })); }
    if ((mm = p.match(/^\/api\/staff-pay\/([^/]+)$/))) { if (m === "DELETE") { remove(P43.pay, mm[1]); return ok({ ok: true }); } var px = byId(P43.pay, mm[1]); if (!px) return nf(); Object.assign(px, b); return ok(px); }
    if (/^\/api\/organizations\/[^/]+\/wage-check$/.test(p)) {
      var cur43 = {}; P43.pay.forEach(function (x) { if (x.valid_from > todayIso) return; var c = cur43[x.user_id]; if (!c || x.valid_from > c.valid_from) cur43[x.user_id] = x; });
      var wr = Object.keys(cur43).map(function (k) { var x = cur43[k], t = byId(P43.wt, x.wage_table_id), amt = Number(x.amount) || 0, hrs2 = Number(x.hours_per_week) || 0;
        var o = { user_id: x.user_id, pay_id: x.id, wage_table: t ? t.name : null, wage_group: x.wage_group || null, pay_type: x.pay_type, amount: amt, hours_per_week: hrs2 || null, minimum: null, basis: null, diff: null, status: "ok", reason: null };
        if (!t) return Object.assign(o, { status: "unklar", reason: "Keine Lohntabelle zugeordnet." });
        var g = (t.groups || []).find(function (y) { return y.key === x.wage_group; }); if (!g) return Object.assign(o, { status: "unklar", reason: "Die Lohngruppe fehlt in der Tabelle." });
        var mM = Number(g.monthly_min) || 0, hM = Number(g.hourly_min) || 0, have, need;
        if (x.pay_type === "Stunde") { if (hM > 0) { have = amt; need = hM; o.basis = "Stunde"; } else if (mM > 0 && hrs2 > 0) { have = amt * hrs2 * 4.33; need = mM; o.basis = "Monat"; } }
        else { if (hM > 0 && hrs2 > 0) { have = amt; need = hM * hrs2 * 4.33; o.basis = "Monat"; } else if (mM > 0) { have = amt; need = mM; o.basis = "Monat"; } }
        if (need == null) return Object.assign(o, { status: "unklar", reason: "Für diese Lohngruppe ist noch kein Mindestwert eingetragen." });
        o.minimum = r2x(need); o.diff = r2x(have - need); o.status = have + 0.005 < need ? "zu niedrig" : "ok"; return o; });
      return ok({ date: todayIso, weeks_per_month: 4.33, rows: wr, warnings: wr.filter(function (r) { return r.status !== "ok"; }).length }); }
    // Renovierungs-Planer (5 Jahre)
    if (p === H + "/capex" && m === "POST") {
      if (!HR43) return deny("Den Renovierungs-Planer pflegen Admin, Gesamtleitung und Leitung Technik."); if (!String(b.component || "").trim()) return ok({ error: "Bitte die Komponente angeben (z. B. Teppich, Matratze)." }, 400);
      var targets = b.room_type || b.all_rooms ? (D.rooms || []).filter(function (r) { return !b.room_type || r.room_type === b.room_type; }) : [null]; if (!targets.length) return ok({ error: "Keine Zimmer dieses Typs gefunden." }, 400);
      targets.forEach(function (r) { P43.capex.push({ id: nid("cx"), hotel_id: D.hotel.id, room_id: r ? r.id : (b.room_id || null), area: b.area || (r ? "Zimmer " + r.number : null), component: b.component, installed_on: b.installed_on || null, lifetime_years: Number(b.lifetime_years) || 0, condition: b.condition === "" || b.condition == null ? null : Number(b.condition), unit_cost: Number(b.unit_cost) || 0, quantity: b.quantity == null || b.quantity === "" ? 1 : Number(b.quantity), note: b.note || null, created_at: new Date().toISOString(), rooms: r ? { number: r.number, room_type: r.room_type } : null }); });
      return ok({ ok: true, created: targets.length }); }
    if (p === H + "/capex") {
      var cols = [0, 1, 2, 3, 4].map(function (i) { return yr43 + i; }), sums = {}; cols.forEach(function (y) { sums[y] = 0; });
      var crows = P43.capex.map(function (it) { var life = Number(it.lifetime_years) || 0, due = it.installed_on && life > 0 ? Number(String(it.installed_on).slice(0, 4)) + Math.ceil(life) : null, why = [];
        if (due == null) why.push("ohne Einbaudatum oder Lebensdauer"); var cond = Number(it.condition) || 0;
        if (cond && cond <= 2) { var early = yr43 + (cond === 1 ? 0 : 1); if (due == null || early < due) { due = early; why.push(cond === 1 ? "Zustand sehr schlecht" : "Zustand schlecht"); } }
        var overdue = due != null && due < yr43, dy2 = due == null ? null : Math.max(due, yr43), cost = r2x((Number(it.unit_cost) || 0) * (Number(it.quantity) || 1)); if (dy2 != null && sums[dy2] !== undefined) sums[dy2] += cost;
        return Object.assign({}, it, { due_year: dy2, overdue: overdue, reasons: why, cost: cost, tickets_12m: 0 }); });
      cols.forEach(function (y) { sums[y] = r2x(sums[y]); }); return ok({ years: cols, sums: sums, total: r2x(cols.reduce(function (s, y) { return s + sums[y]; }, 0)), rows: crows }); }
    if ((mm = p.match(/^\/api\/capex\/([^/]+)$/))) { if (!HR43) return deny("Den Renovierungs-Planer pflegen Admin, Gesamtleitung und Leitung Technik."); if (m === "DELETE") { remove(P43.capex, mm[1]); return ok({ ok: true }); }
      var cxi = byId(P43.capex, mm[1]); if (!cxi) return nf(); ["component", "area", "room_id", "installed_on", "lifetime_years", "unit_cost", "quantity", "condition", "note"].forEach(function (k) { if (b[k] !== undefined) cxi[k] = ["lifetime_years", "unit_cost", "quantity"].indexOf(k) >= 0 ? Number(b[k]) || 0 : (b[k] === "" ? null : b[k]); }); return ok(cxi); }
    /* ===== Paket 043 G (Gäste schützen und mehr verkaufen; Antworten wie routes-guests2.js; nur im Speicher) ===== */
    if (!D.p43g) {
      var G2 = D.p43g = {};
      var lt = function (dayOff, hm) { return new Date(add(todayIso, dayOff) + "T" + hm + ":00").toISOString(); };
      // (1) Frühwarnung: 2 Gäste im Haus
      G2.risk = [
        { id: "gr-1", arrival_guest_id: "ig-1", guest_name: "Dr. Elisabeth Gruber", room: "214", vip: false, arrival_date: add(todayIso, -1), departure_date: add(todayIso, 2), score: 85, reasons: [{ key: "tickets", n: 1 }, { key: "complaint", n: 1 }, { key: "unanswered", n: 1 }], handled_at: null, handled_by: null, note: "" },
        { id: "gr-2", arrival_guest_id: "ig-2", guest_name: "James Whitfield", room: "408", vip: true, arrival_date: todayIso, departure_date: add(todayIso, 3), score: 55, reasons: [{ key: "feedback", n: 1 }, { key: "vip", n: 1 }], handled_at: null, handled_by: null, note: "" }];
      // (2) Allergien an zwei heutigen Anreisen (D.arrivals ar-t0, ar-t2)
      G2.alg = [{ id: "ag-1", arrival_guest_id: "ar-t0", allergens: ["A", "G"], note: "Zöliakie – bitte streng glutenfrei, Milchprodukte laktosefrei", source: "anreise", created_at: nowIso(3) },
        { id: "ag-2", arrival_guest_id: "ar-t2", allergens: ["H", "E"], note: "Nussallergie, Notfallset (Adrenalin) liegt im Zimmer", source: "rezeption", created_at: nowIso(2) }];
      G2.rooms = { "ar-t0": "112", "ar-t2": "227" };
      G2.acks = [{ allergy_id: "ag-1", meal_date: todayIso, meal: "Mittag", department: "Küche", confirmed_by: "u-hkm", confirmed_at: nowIso(1) }, { allergy_id: "ag-1", meal_date: todayIso, meal: "Mittag", department: "Service", confirmed_by: "u-ewa", confirmed_at: nowIso(1) },
        { allergy_id: "ag-2", meal_date: todayIso, meal: "Mittag", department: "Küche", confirmed_by: "u-hkm", confirmed_at: nowIso(1) }];
      G2.meals = ["Frühstück", "Mittag", "Abend"]; G2.times = { "Frühstück": "07:00", Mittag: "12:00", Abend: "18:00" };
      G2.eats = function (g, day, meal) { var dep = g.departure_date || add(g.arrival_date, 1); return meal === "Frühstück" ? (day > g.arrival_date && day <= dep) : (day >= g.arrival_date && day < dep); };
      G2.rows = function (from, to) { return G2.alg.map(function (a) { var g = byId(D.arrivals, a.arrival_guest_id); return g && a.allergens.length && (g.departure_date || add(g.arrival_date, 1)) >= from && g.arrival_date <= to ? Object.assign({}, a, { guest: g }) : null; }).filter(Boolean); };
      G2.email = function (id) { var mb = D.members.find(function (x) { return x.user_id === id; }); return mb ? mb.email : ""; };
      // (3) Transfers
      var tr = function (id, ag, name, room, dir, off, hm, place, flight, pax, driver, veh, price, notified, note) { return { id: id, hotel_id: D.hotel.id, arrival_guest_id: ag, guest_name: name, room_number: room, direction: dir, pickup_at: lt(off, hm), place: place, flight_no: flight, pax: pax, driver_id: driver, vehicle: veh, price: price, status: "geplant", note: note, guest_token: "demo-transfer-" + id, guest_notified_at: notified, created_at: nowIso(20) }; };
      G2.tr = [tr("tf-1", "ar-t0", "Familie Berger", "112", "Abholung", 0, "14:20", "Flughafen Innsbruck", "OS 112", 4, ME, "Van Mercedes V-Klasse", 45, null, "2 Kindersitze"),
        tr("tf-2", "ar-t2", "Marco Ricci", "227", "Abholung", 0, "19:30", "Hauptbahnhof Innsbruck", null, 2, null, "Limousine", 28, null, null),
        tr("tf-3", "ar-t1", "Dr. Hannah Weiss", null, "Bringen", 1, "06:15", "Flughafen Innsbruck", "LH 2347", 1, "u-hkm", "Limousine", 45, nowIso(5), "VIP – Gepäckhilfe")];
      // (4) Upgrades
      G2.freeRooms = [{ id: "fr-1", number: "305", room_type: "Deluxe", status: "Sauber", occupancy: "Unbelegt" }, { id: "fr-2", number: "412", room_type: "Suite", status: "Kontrolliert", occupancy: "Unbelegt" }];
      G2.returning = { "ar-t0": true };
      G2.offers = [{ id: "up-1", arrival_guest_id: "ar-0", from_room_type: "Superior", to_room: "301", price: 75, status: "angenommen", decided_by: "u-hkm", decided_at: nowIso(24 * 9), created_at: nowIso(24 * 10) },
        { id: "up-2", arrival_guest_id: "ar-1", from_room_type: "Deluxe", to_room: "410", price: 120, status: "abgelehnt", decided_by: "u-hkm", decided_at: nowIso(24 * 5), created_at: nowIso(24 * 5) },
        { id: "up-3", arrival_guest_id: "ar-2", from_room_type: "Superior", to_room: "308", price: 50, status: "angenommen", decided_by: "u-hkm", decided_at: nowIso(24 * 3), created_at: nowIso(24 * 3) }];
      G2.trOut = function (x) { var o = Object.assign({}, x); delete o.guest_token; o.link = location.origin + location.pathname.replace(/[^/]*$/, "") + "transfer.html?t=" + encodeURIComponent(x.guest_token) + "&demo=1"; return o; };
    }
    var G2d = D.p43g, FRONT = ROLE === "admin" || ROLE === "manager";
    if (/^\/api\/(hotels\/[^/]+\/(guest-risk|upgrades)|guest-risk\/|upgrades\/)/.test(p) && !FRONT) return deny("Das sieht die Rezeption.");
    if (p === H + "/guest2-settings" && m === "PUT") {
      if (ROLE !== "admin") return deny("Nur Admins können das einstellen.");
      if (b.upgrade_settings !== undefined) { var us = b.upgrade_settings || {}; D.hotel.upgrade_settings = { enabled: !!us.enabled, ranking: (Array.isArray(us.ranking) ? us.ranking : []).map(function (x) { return String(x).trim(); }).filter(Boolean).slice(0, 20), price_per_step: Number(us.price_per_step) > 0 ? Math.round(Number(us.price_per_step) * 100) / 100 : 0 }; }
      if (b.transfer_settings !== undefined) { var ts = b.transfer_settings || {}, pl = (Array.isArray(ts.places) ? ts.places : []).map(function (x) { return String(x).trim(); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 20), pr = {};
        pl.forEach(function (x) { var v = Number(String((ts.prices || {})[x]).replace(",", ".")); if (v >= 0 && (ts.prices || {})[x] !== "" && (ts.prices || {})[x] != null) pr[x] = v; }); D.hotel.transfer_settings = { enabled: !!ts.enabled, places: pl, prices: pr }; }
      return ok(D.hotel); }
    if (p === H + "/guest-risk") return ok(G2d.risk.filter(function (r) { return r.score > 0 || q.get("all") === "1"; }).map(function (r) { return Object.assign({ likely_unhappy: r.score >= 70 }, r); }).sort(function (a, c) { return (a.handled_at ? 1 : 0) - (c.handled_at ? 1 : 0) || c.score - a.score; }));
    if ((mm = p.match(/^\/api\/guest-risk\/([^/]+)$/)) && m === "PATCH") { var gr = byId(G2d.risk, mm[1]); if (!gr) return nf(); if (b.handled !== undefined) { gr.handled_at = b.handled ? new Date().toISOString() : null; gr.handled_by = b.handled ? ME : null; } if (b.note !== undefined) gr.note = String(b.note || "").slice(0, 1000);
      return ok({ id: gr.id, arrival_guest_id: gr.arrival_guest_id, score: gr.score, reasons: gr.reasons, handled_at: gr.handled_at, handled_by: gr.handled_by, note: gr.note }); }
    if ((mm = p.match(/^\/api\/arrivals\/([^/]+)\/allergies$/))) {
      var ga = G2d.alg.find(function (a) { return a.arrival_guest_id === mm[1]; });
      if (m === "PUT") { if (!byId(D.arrivals, mm[1])) return ok({ error: "Gast nicht gefunden." }, 404); var KEYS = "ABCDEFGHLMNOPR".split(""), al = KEYS.filter(function (k) { return (Array.isArray(b.allergens) ? b.allergens : []).map(function (x) { return String(x).toUpperCase(); }).indexOf(k) >= 0; }), nt = String(b.note || "").trim().slice(0, 500) || null;
        if (!al.length && !nt) { if (ga) remove(G2d.alg, ga.id); return ok(null); }
        if (ga) { ga.allergens = al; ga.note = nt; ga.source = "rezeption"; } else { ga = { id: nid("ag"), arrival_guest_id: mm[1], allergens: al, note: nt, source: "rezeption", created_at: new Date().toISOString() }; G2d.alg.push(ga); }
        return ok(ga); }
      return ok(ga || null); }
    if (p === H + "/allergy-board") {
      var day = /^\d{4}-\d{2}-\d{2}$/.test(q.get("date") || "") ? q.get("date") : todayIso, lst = G2d.rows(day, day);
      return ok({ date: day, meals: G2d.meals.map(function (meal) {
        var gs = lst.filter(function (a) { return G2d.eats(a.guest, day, meal); }).map(function (a) { var ak = {}; G2d.acks.filter(function (k) { return k.allergy_id === a.id && k.meal === meal && k.meal_date === day; }).forEach(function (k) { ak[k.department] = { by: k.confirmed_by, at: k.confirmed_at }; });
          return { allergy_id: a.id, guest_name: a.guest.guest_name, room: G2d.rooms[a.guest.id] || a.guest.assigned_room || "", persons: (a.guest.adults || 0) + (a.guest.children || 0) || null, allergens: a.allergens, note: a.note || "", source: a.source, acks: ak }; })
          .sort(function (x, y) { return String(x.room).localeCompare(String(y.room), "de", { numeric: true }); });
        return { meal: meal, start: G2d.times[meal], guests: gs, missing: gs.length ? ["Küche", "Service"].filter(function (d) { return gs.some(function (g) { return !g.acks[d]; }); }) : [] }; }) }); }
    if ((mm = p.match(/^\/api\/allergies\/([^/]+)\/ack$/)) && m === "POST") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.meal_date || "")) || G2d.meals.indexOf(b.meal) < 0 || ["Küche", "Service"].indexOf(b.department) < 0) return ok({ error: "Bitte Tag, Mahlzeit und Bereich (Küche/Service) angeben." }, 400);
      if (b.meal_date < add(todayIso, -1) || b.meal_date > add(todayIso, 1)) return ok({ error: "Bestätigen geht nur für gestern, heute und morgen." }, 400);
      if (!byId(G2d.alg, mm[1])) return nf();
      if (G2d.acks.some(function (k) { return k.allergy_id === mm[1] && k.meal_date === b.meal_date && k.meal === b.meal && k.department === b.department; })) return ok({ ok: true, already: true });
      var ak2 = { allergy_id: mm[1], meal_date: b.meal_date, meal: b.meal, department: b.department, confirmed_by: ME, confirmed_at: new Date().toISOString() }; G2d.acks.push(ak2); return ok(ak2); }
    if (p === H + "/allergy-protocol") {
      var pto = /^\d{4}-\d{2}-\d{2}$/.test(q.get("to") || "") ? q.get("to") : todayIso, pfr = /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") || "") ? q.get("from") : add(pto, -6); if (pfr > pto) pfr = pto;
      var prow = G2d.rows(pfr, pto), prs = []; for (var pd = pfr, pn = 0; pd <= pto && pn < 63; pd = add(pd, 1), pn++) G2d.meals.forEach(function (meal) { prow.filter(function (a) { return G2d.eats(a.guest, pd, meal); }).forEach(function (a) {
        prs.push({ date: pd, meal: meal, guest_name: a.guest.guest_name, room: G2d.rooms[a.guest.id] || a.guest.assigned_room || "", allergens: a.allergens, note: a.note || "", acks: ["Küche", "Service"].map(function (dep) { var k = G2d.acks.find(function (x) { return x.allergy_id === a.id && x.meal_date === pd && x.meal === meal && x.department === dep; }); return { department: dep, by: k ? G2d.email(k.confirmed_by) : null, at: k ? k.confirmed_at : null }; }) }); }); });
      return ok({ from: pfr, to: pto, rows: prs }); }
    if (p === H + "/transfers") {
      if (m === "POST") {
        var tg = b.arrival_guest_id ? byId(D.arrivals, b.arrival_guest_id) : null, tname = String(b.guest_name || (tg && tg.guest_name) || "").trim(); if (!tname) return ok({ error: "Bitte den Namen des Gastes angeben." }, 400);
        if (["Abholung", "Bringen"].indexOf(b.direction) < 0) return ok({ error: "Bitte Abholung oder Bringen wählen." }, 400); var pk = new Date(String(b.pickup_at || "")); if (!b.pickup_at || isNaN(pk.getTime())) return ok({ error: "Bitte Datum und Uhrzeit der Fahrt angeben." }, 400);
        var tplace = String(b.place || "").trim(); if (!tplace) return ok({ error: "Bitte den Ort angeben (z. B. Flughafen, Bahnhof)." }, 400);
        var tpax = Math.round(Number(b.pax == null || b.pax === "" ? 1 : b.pax)); if (!(tpax >= 1 && tpax <= 60)) return ok({ error: "Bitte die Personenzahl angeben (1–60)." }, 400);
        var tprice = b.price === "" || b.price == null ? ((D.hotel.transfer_settings || {}).prices || {})[tplace] : Number(String(b.price).replace(",", ".")); if (tprice != null && !(tprice >= 0)) return ok({ error: "Ungültiger Preis." }, 400);
        var nt2 = { id: nid("tf"), hotel_id: D.hotel.id, arrival_guest_id: b.arrival_guest_id || null, guest_name: tname, room_number: b.room_number || (tg && (G2d.rooms[tg.id] || tg.assigned_room)) || null, direction: b.direction, pickup_at: pk.toISOString(), place: tplace, flight_no: b.flight_no || null, pax: tpax, driver_id: b.driver_id || null, vehicle: b.vehicle || null, price: tprice == null ? null : tprice, status: "geplant", note: b.note || null, guest_token: "demo-transfer-" + nextId, guest_notified_at: null, created_at: new Date().toISOString() };
        G2d.tr.push(nt2); return ok(G2d.trOut(nt2)); }
      var tfrom = q.get("from") || add(todayIso, -1), tto = q.get("to") || add(tfrom, 14), lo = Date.parse(tfrom + "T00:00:00"), hi = Date.parse(add(tto, 1) + "T00:00:00");
      return ok(G2d.tr.filter(function (x) { var t = Date.parse(x.pickup_at); return t >= lo && t <= hi && (q.get("mine") !== "1" || x.driver_id === ME); }).sort(function (a, c) { return a.pickup_at.localeCompare(c.pickup_at); }).map(G2d.trOut)); }
    if ((mm = p.match(/^\/api\/transfers\/([^/]+)\/notify$/)) && m === "POST") {
      var tn = byId(G2d.tr, mm[1]); if (!tn) return nf(); if (!FRONT) return deny("Gäste benachrichtigt die Rezeption."); if (["erledigt", "abgesagt"].indexOf(tn.status) >= 0) return ok({ error: "Dieser Transfer ist schon abgeschlossen." }, 400);
      var tag = tn.arrival_guest_id ? byId(D.arrivals, tn.arrival_guest_id) : null, tmail = String(b.email || (tag && tag.email) || "").trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(tmail)) return ok({ error: "Bitte eine gültige E-Mail-Adresse des Gastes angeben." }, 400);
      tn.guest_notified_at = new Date().toISOString(); return ok(G2d.trOut(tn)); }
    if ((mm = p.match(/^\/api\/transfers\/([^/]+)\/bill$/)) && m === "POST") {
      var tb = byId(G2d.tr, mm[1]); if (!tb) return nf(); if (!FRONT) return deny("Abrechnen darf die Rezeption."); if (!(Number(tb.price) > 0)) return ok({ error: "Für diesen Transfer ist kein Preis eingetragen." }, 400); if (tb.status === "abgesagt") return ok({ error: "Abgesagte Transfers werden nicht abgerechnet." }, 400);
      if (!tb.room_number) return ok({ billed: false, hint: "Kein passendes Zimmer gefunden – bitte den Betrag an der Rezeption bzw. im PMS auf die Rechnung buchen." });
      if (tb.billed) return ok({ billed: true, already: true }); tb.billed = true; return ok({ billed: true, room: tb.room_number, hint: "Als bestätigte Gäste-Bestellung eingetragen. Ins PMS wird nichts automatisch übertragen." }); }
    if ((mm = p.match(/^\/api\/transfers\/([^/]+)$/))) {
      var tx = byId(G2d.tr, mm[1]); if (!tx) return nf();
      if (m === "DELETE") { remove(G2d.tr, mm[1]); return ok({ ok: true }); }
      if (m === "PATCH") { if (Object.keys(b).every(function (k) { return k === "status"; })) { if (["geplant", "unterwegs", "erledigt", "abgesagt"].indexOf(b.status) < 0) return ok({ error: "Unbekannter Status." }, 400); tx.status = b.status; return ok(G2d.trOut(tx)); }
        ["guest_name", "room_number", "direction", "place", "flight_no", "vehicle", "note", "driver_id", "status"].forEach(function (k) { if (b[k] !== undefined) tx[k] = b[k] === "" ? null : b[k]; });
        if (b.pickup_at !== undefined) { var pk2 = new Date(String(b.pickup_at)); if (isNaN(pk2.getTime())) return ok({ error: "Bitte Datum und Uhrzeit der Fahrt angeben." }, 400); tx.pickup_at = pk2.toISOString(); }
        if (b.pax !== undefined) tx.pax = Math.round(Number(b.pax)) || 1; if (b.price !== undefined) tx.price = b.price === "" || b.price == null ? null : Number(String(b.price).replace(",", ".")); return ok(G2d.trOut(tx)); } }
    if ((mm = p.match(/^\/api\/public\/transfer\/([^/]+)$/))) { var tp = G2d.tr.find(function (x) { return x.guest_token === mm[1]; }); if (!tp) return ok({ error: "Dieser Link ist nicht (mehr) gültig." }, 404);
      return ok({ hotel: { name: D.hotel.name, logo_data: null, brand_color: null }, guest_first: String(tp.guest_name).split(/\s+/)[0], direction: tp.direction, pickup_at: tp.pickup_at, tz: "Europe/Vienna", place: tp.place, flight_no: tp.flight_no, pax: tp.pax, vehicle: tp.vehicle, driver: tp.driver_id ? "Hans" : "", status: tp.status }); }
    if (p === H + "/upgrades" && m === "POST") {
      var ug = byId(D.arrivals, b.arrival_guest_id); if (!ug) return ok({ error: "Bitte einen Gast wählen." }, 400); if (!String(b.to_room || "").trim()) return ok({ error: "Bitte ein Zimmer wählen." }, 400);
      var up = Number(String(b.price == null ? 0 : b.price).replace(",", ".")); if (!(up >= 0)) return ok({ error: "Ungültiger Preis." }, 400);
      var no = { id: nid("up"), arrival_guest_id: ug.id, from_room_type: b.from_room_type || ug.room_type || null, to_room: String(b.to_room).trim(), price: up, status: "vorgeschlagen", decided_by: null, decided_at: null, created_at: new Date().toISOString() }; G2d.offers.unshift(no); return ok(no); }
    if ((mm = p.match(/^\/api\/upgrades\/([^/]+)$/)) && m === "PATCH") {
      var uo = byId(G2d.offers, mm[1]); if (!uo) return nf(); if (["vorgeschlagen", "angenommen", "abgelehnt"].indexOf(b.status) < 0) return ok({ error: "Unbekannter Status." }, 400);
      uo.status = b.status; uo.decided_by = b.status === "vorgeschlagen" ? null : ME; uo.decided_at = b.status === "vorgeschlagen" ? null : new Date().toISOString(); if (b.price !== undefined) { var pp = Number(String(b.price).replace(",", ".")); if (!(pp >= 0)) return ok({ error: "Ungültiger Preis." }, 400); uo.price = pp; }
      var hint = null; if (b.status === "angenommen") { G2d.rooms[uo.arrival_guest_id] = uo.to_room; hint = "Zimmer " + uo.to_room + " beim Gast eingetragen. Bitte auch im PMS umbuchen und den Preis abrechnen."; }
      return ok(Object.assign({}, uo, { hint: hint })); }
    if (p === H + "/upgrades") {
      var us2 = D.hotel.upgrade_settings || { enabled: false, ranking: [], price_per_step: 0 }, tdy = todayIso, dayAgo = add(tdy, -1);
      var todays = G2d.offers.filter(function (o) { return String(o.created_at).slice(0, 10) >= dayAgo; }), offered = {}; todays.forEach(function (o) { offered[o.arrival_guest_id] = 1; });
      var takenR = {}; todays.filter(function (o) { return o.status !== "abgelehnt"; }).forEach(function (o) { takenR[o.to_room] = 1; });
      var rank = function (t) { return us2.ranking.findIndex(function (x) { return x.toLowerCase() === String(t || "").trim().toLowerCase(); }); };
      var sugg = [];
      if (us2.enabled && us2.ranking.length) {
        var freeL = G2d.freeRooms.filter(function (r) { return !takenR[r.number] && rank(r.room_type) >= 0; }).sort(function (a, c) { return rank(a.room_type) - rank(c.room_type); });
        var cand = D.arrivals.filter(function (g) { return g.arrival_date === tdy && !offered[g.id] && rank(g.room_type) >= 0 && rank(g.room_type) < us2.ranking.length - 1; }).map(function (g) { return { g: g, ret: !!G2d.returning[g.id], nights: g.departure_date ? Math.max(1, dayDiff(g.arrival_date, g.departure_date)) : 1 }; })
          .sort(function (a, c) { return (c.g.vip ? 1 : 0) - (a.g.vip ? 1 : 0) || (c.ret ? 1 : 0) - (a.ret ? 1 : 0) || c.nights - a.nights; });
        var usedR = {}; cand.forEach(function (c) { var from = rank(c.g.room_type), r = freeL.find(function (x) { return !usedR[x.id] && rank(x.room_type) > from; }); if (!r) return; usedR[r.id] = 1; var steps = rank(r.room_type) - from;
          sugg.push({ arrival_guest_id: c.g.id, guest_name: c.g.guest_name, vip: !!c.g.vip, returning: c.ret, nights: c.nights, from_room_type: c.g.room_type, to_room: r.number, to_room_type: r.room_type, room_ready: ["Sauber", "Kontrolliert"].indexOf(r.status) >= 0, steps: steps, price: Math.round(steps * us2.price_per_step * c.nights * 100) / 100 }); }); }
      var acc = G2d.offers.filter(function (o) { return o.status === "angenommen"; }), dec = G2d.offers.filter(function (o) { return o.status === "abgelehnt"; }), mo2 = {};
      acc.forEach(function (o) { var k = String(o.decided_at || o.created_at).slice(0, 7); mo2[k] = Math.round(((mo2[k] || 0) + o.price) * 100) / 100; });
      return ok({ settings: us2, suggestions: sugg, today: todays.map(function (o) { var gg = byId(D.arrivals, o.arrival_guest_id); return Object.assign({}, o, { guest_name: gg ? gg.guest_name : "" }); }),
        stats: { offered: G2d.offers.length, accepted: acc.length, declined: dec.length, open: G2d.offers.filter(function (o) { return o.status === "vorgeschlagen"; }).length, rate: acc.length + dec.length ? Math.round(acc.length * 100 / (acc.length + dec.length)) : null,
          revenue: Math.round(acc.reduce(function (s, o) { return s + o.price; }, 0) * 100) / 100, months: Object.keys(mo2).sort().map(function (k) { return { month: k, revenue: mo2[k] }; }) } }); }
    /* Paket 044: Preisempfehlung */
    if (p === H + "/rates" && m === "GET") {
      var rdays = Math.min(120, Math.max(1, Number(q.get("days")) || 60)), rhol = String(q.get("holidays") || "").split(",").filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); });
      var rlist = rtSuggest(todayIso, rdays, rhol), adr = [0, 0, 0, 0, 0, 0, 0].map(function (_, w) { return [152, 142, 128, 124, 129, 138, 159][w]; });
      return ok({ from: todayIso, days: rdays, currency: D.hotel.currency || "EUR", rooms: Number(D.hotel.rooms) || 140, settings: RT.settings, can_edit: lead, adr_weekday: adr, has_forecast: true,
        rates: rlist.map(function (r) { return Object.assign({}, r, { decision: RT.decisions.find(function (d) { return d.day === r.day && d.room_type === r.room_type; }) || null }); }) }); }
    if (p === H + "/rate-settings" && m === "PUT") { if (!lead) return deny("Die Einstellungen ändert die Leitung Revenue Management oder Finanzen.");
      try { RT.settings = cleanRates(b); } catch (e1) { return ok({ error: e1.message }, 400); } return ok(RT.settings); }
    if ((mm = p.match(/^\/api\/hotels\/[^/]+\/rates\/(\d{4}-\d{2}-\d{2})$/)) && m === "PUT") {
      var rrt = String(b.room_type || "").trim().slice(0, 60), rfin, rnote = String(b.note || "").trim().slice(0, 300) || null;
      try { rfin = rtPrice(b.final); } catch (e2) { return ok({ error: e2.message }, 400); }
      RT.decisions = RT.decisions.filter(function (d) { return !(d.day === mm[1] && d.room_type === rrt); });
      if (rfin == null && !rnote) return ok({ ok: true, removed: true });
      var rd = { hotel_id: D.hotel.id, day: mm[1], room_type: rrt, suggested: rtPrice(b.suggested) || 0, final: rfin, note: rnote, decided_at: new Date().toISOString() }; RT.decisions.push(rd); return ok(rd); }

    /* Paket 044: Tischreservierung */
    if (p === H + "/restaurant-tables") {
      if (m === "POST") { if (!lead) return deny("Tische verwaltet die Leitung Food & Beverage."); var tnm = s200(b.name, 40), tse = Math.round(Number(b.seats));
        if (!tnm) return ok({ error: "Bitte einen Namen angeben." }, 400); if (!(tse >= 1 && tse <= 40)) return ok({ error: "Plätze: 1 bis 40." }, 400);
        var ntb = { id: nid("rtb"), hotel_id: D.hotel.id, name: tnm, seats: tse, area: s200(b.area, 40) || null, active: b.active === undefined ? true : !!b.active, sort: Math.round(Number(b.sort) || 0), created_at: new Date().toISOString() }; DN_TABLES.push(ntb); return ok(ntb); }
      return ok(DN_TABLES.slice().sort(function (a, c) { return (a.sort || 0) - (c.sort || 0) || (a.name < c.name ? -1 : 1); })); }
    if ((mm = p.match(/^\/api\/restaurant-tables\/([^/]+)$/))) { if (!lead) return deny("Tische verwaltet die Leitung Food & Beverage.");
      if (m === "DELETE") { remove(DN_TABLES, mm[1]); return ok({ ok: true }); } var etb = byId(DN_TABLES, mm[1]); if (!etb) return deny("Tische verwaltet die Leitung Food & Beverage.");
      if (b.name !== undefined) { if (!s200(b.name, 40)) return ok({ error: "Bitte einen Namen angeben." }, 400); etb.name = s200(b.name, 40); }
      if (b.seats !== undefined) { var se2 = Math.round(Number(b.seats)); if (!(se2 >= 1 && se2 <= 40)) return ok({ error: "Plätze: 1 bis 40." }, 400); etb.seats = se2; }
      if (b.area !== undefined) etb.area = s200(b.area, 40) || null; if (b.active !== undefined) etb.active = !!b.active; if (b.sort !== undefined) etb.sort = Math.round(Number(b.sort) || 0); return ok(etb); }
    if (p === H + "/table-reservations") {
      if (m === "POST") {
        var rday = String(b.day || ""), rmin = dnMin(b.time), rpar = Math.round(Number(b.party)), rna = s200(b.name, 120), rdu = Math.round(Number(b.duration_min || 120));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rday)) return ok({ error: "Bitte ein Datum angeben." }, 400); if (rmin == null) return ok({ error: "Bitte eine Uhrzeit angeben (z. B. 19:30)." }, 400);
        if (!(rdu >= 15 && rdu <= 600)) return ok({ error: "Ungültige Dauer." }, 400); if (!(rpar >= 1 && rpar <= 200)) return ok({ error: "Bitte die Personenzahl angeben." }, 400); if (!rna) return ok({ error: "Bitte einen Namen angeben." }, 400);
        var rem = String(b.email || "").trim(); if (rem && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(rem)) return ok({ error: "Ungültige E-Mail-Adresse." }, 400);
        var rtid = Array.isArray(b.table_ids) && b.table_ids.length ? b.table_ids : dnPick(DN_TABLES, DN.res.filter(function (x) { return x.day === rday; }), rmin, rdu, rpar);
        var nrs = { id: nid("trs"), hotel_id: D.hotel.id, day: rday, start_min: rmin, duration_min: rdu, party: rpar, name: rna, email: rem || null, phone: s200(b.phone, 40) || null, room_no: s200(b.room_no, 20) || null,
          allergens: dnAllerg(b.allergens), note: s200(b.note, 500) || null, status: (["angefragt", "bestätigt", "abgesagt", "nicht_erschienen", "erledigt"].indexOf(b.status) >= 0 ? b.status : "bestätigt"), table_ids: rtid, source: "intern", created_at: new Date().toISOString() };
        DN.res.push(nrs); return ok(Object.assign({}, nrs, { time: dnTime(nrs.start_min) })); }
      var rfr = /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") || "") ? q.get("from") : todayIso, rto = /^\d{4}-\d{2}-\d{2}$/.test(q.get("to") || "") ? q.get("to") : rfr;
      return ok(DN.res.filter(function (x) { return x.day >= rfr && x.day <= rto; }).sort(function (a, c) { return a.day < c.day ? -1 : a.day > c.day ? 1 : a.start_min - c.start_min; }).map(function (x) { return Object.assign({}, x, { time: dnTime(x.start_min) }); })); }
    if ((mm = p.match(/^\/api\/table-reservations\/([^/]+)$/))) {
      if (m === "DELETE") { remove(DN.res, mm[1]); return ok({ ok: true }); } var ers = byId(DN.res, mm[1]); if (!ers) return nf();
      if (b.status !== undefined && ["angefragt", "bestätigt", "abgesagt", "nicht_erschienen", "erledigt"].indexOf(b.status) < 0) return ok({ error: "Unbekannter Status." }, 400);
      if (b.time !== undefined) { var m2 = dnMin(b.time); if (m2 == null) return ok({ error: "Bitte eine Uhrzeit angeben (z. B. 19:30)." }, 400); ers.start_min = m2; }
      if (b.party !== undefined) { var p2 = Math.round(Number(b.party)); if (!(p2 >= 1 && p2 <= 200)) return ok({ error: "Bitte die Personenzahl angeben." }, 400); ers.party = p2; }
      if (b.name !== undefined) { if (!s200(b.name, 120)) return ok({ error: "Bitte einen Namen angeben." }, 400); ers.name = s200(b.name, 120); }
      ["day", "status", "table_ids", "duration_min"].forEach(function (k) { if (b[k] !== undefined) ers[k] = b[k]; });
      ["email", "phone", "room_no", "note"].forEach(function (k) { if (b[k] !== undefined) ers[k] = s200(b[k], 500) || null; }); if (b.allergens !== undefined) ers.allergens = dnAllerg(b.allergens);
      return ok(Object.assign({}, ers, { time: dnTime(ers.start_min) })); }
    if (p === H + "/restaurant-settings") {
      if (m === "PUT") { if (!lead) return deny("Die Einstellungen ändert die Leitung Food & Beverage.");
        var ds = DN.settings, nopen = {}; ["1", "2", "3", "4", "5", "6", "7"].forEach(function (d) { var rg = ((b.open || {})[d] || []).slice(0, 4).map(function (r) { return [dnMin(r && r[0]), dnMin(r && r[1])]; }).filter(function (r) { return r[0] != null && r[1] != null && r[1] > r[0]; }); if (rg.length) nopen[d] = rg.map(function (r) { return [dnTime(r[0]), dnTime(r[1])]; }); });
        var ci = function (v, lo, hi, d) { var n = Math.round(Number(v)); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
        DN.settings = { enabled: !!b.enabled, token: ds.token, name: s200(b.name, 80) || null, open: nopen, slot_min: [15, 30, 60].indexOf(Number(b.slot_min)) >= 0 ? Number(b.slot_min) : 30, duration_min: ci(b.duration_min, 30, 360, 120), max_party: ci(b.max_party, 1, 40, 8),
          lead_hours: ci(b.lead_hours, 0, 72, 2), max_days: ci(b.max_days, 1, 180, 60), auto_confirm: b.auto_confirm === undefined ? true : !!b.auto_confirm, closed_days: (Array.isArray(b.closed_days) ? b.closed_days : []).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d)); }).sort(), note: s200(b.note, 500) || null };
        if (b.new_token || (DN.settings.enabled && !DN.settings.token)) DN.settings.token = "demoTisch" + Math.random().toString(36).slice(2, 12) + "abcdef"; return ok(DN.settings); }
      return ok(Object.assign({}, DN.settings, { can_edit: lead })); }

    /* Paket 044: Gutscheine */
    if (p === H + "/payments/status") return ok({ connected: true, admin: ROLE === "admin", stripe_enabled: true, charges_enabled: true, details_submitted: true, account: "acct_demo…" });
    if (p === H + "/payments/connect" && m === "POST") return ok({ error: "In der Demo nicht möglich." }, 400);
    if (p === H + "/voucher-settings") {
      if (m === "PUT") { if (ROLE !== "admin") return deny("Nur Admins können das einstellen."); var vs = VC.settings, vpr = (Array.isArray(b.presets) ? b.presets : [50, 100, 150]).map(function (x) { var n = Number(String(x).replace(",", ".")); return n > 0 && n <= 10000 ? Math.round(n * 100) / 100 : null; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort(function (a, c) { return a - c; }).slice(0, 8);
        var vmn = Number(String(b.custom_min == null ? 20 : b.custom_min).replace(",", ".")) || 20, vmx = Number(String(b.custom_max == null ? 1000 : b.custom_max).replace(",", ".")) || 1000; if (vmn > vmx) return ok({ error: "Der Mindestbetrag ist höher als der Höchstbetrag." }, 400);
        var vyr = Math.round(Number(b.valid_years)); VC.settings = { enabled: !!b.enabled, token: vs.token, presets: vpr, custom: b.custom === undefined ? true : !!b.custom, custom_min: vmn, custom_max: vmx, valid_years: isFinite(vyr) ? Math.min(30, Math.max(0, vyr)) : 0, title: s200(b.title, 120) || null, text: s200(b.text, 600) || null };
        if (b.new_token || (VC.settings.enabled && !VC.settings.token)) VC.settings.token = "demoGutschein" + Math.random().toString(36).slice(2, 12) + "abcdef"; return ok(VC.settings); }
      return ok(Object.assign({}, VC.settings, { currency: D.hotel.currency || "EUR", can_edit: ROLE === "admin" })); }
    if (p === H + "/vouchers") {
      if (m === "POST") { var vam = Number(String(b.amount == null ? "" : b.amount).replace(",", ".")); if (!(vam > 0 && vam <= 10000)) return ok({ error: "Bitte einen Betrag angeben (bis 10.000)." }, 400); vam = Math.round(vam * 100) / 100;
        if (["bar", "karte", "überweisung", "sonstiges"].indexOf(b.payment_method) < 0) return ok({ error: "Bitte die Zahlungsart wählen." }, 400);
        var vem = String(b.buyer_email || "").trim(); if (vem && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(vem)) return ok({ error: "Ungültige E-Mail-Adresse." }, 400);
        var nvc = { id: nid("vch"), hotel_id: D.hotel.id, code: vcCode(), title: s200(b.title, 120) || VC.settings.title, amount: vam, remaining: vam, currency: D.hotel.currency || "EUR", status: "aktiv", buyer_name: s200(b.buyer_name, 120) || "Rezeption", buyer_email: vem || null,
          recipient_name: s200(b.recipient_name, 120) || null, message: s200(b.message, 500) || null, valid_until: /^\d{4}-\d{2}-\d{2}$/.test(String(b.valid_until || "")) ? b.valid_until : null, source: "rezeption", payment_method: b.payment_method, paid_at: new Date().toISOString(), created_at: new Date().toISOString() };
        VC.list.unshift(nvc); return ok(nvc); }
      var vcq = String(q.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), vst = q.get("status");
      return ok(VC.list.filter(function (v) { return (vcq.length !== 12 || v.code.replace(/-/g, "") === vcq) && (!vst || v.status === vst); }).sort(function (a, c) { return a.created_at < c.created_at ? 1 : -1; })); }
    if ((mm = p.match(/^\/api\/vouchers\/([^/]+)\/redeem$/)) && m === "POST") { var rv = byId(VC.list, mm[1]); if (!rv) return nf();
      var rva = Number(String(b.amount == null ? "" : b.amount).replace(",", ".")); if (!(rva > 0 && rva <= 100000)) return ok({ error: "Bitte einen Betrag angeben." }, 400); rva = Math.round(rva * 100) / 100;
      if (rv.status !== "aktiv") return ok({ error: "Dieser Gutschein ist nicht einlösbar (Status: " + rv.status + ")." }, 400); if (rva > rv.remaining) return ok({ error: "Der Betrag ist höher als der Restwert (" + rv.remaining + ")." }, 400);
      rv.remaining = Math.round((rv.remaining - rva) * 100) / 100; if (rv.remaining <= 0) { rv.remaining = 0; rv.status = "eingelöst"; }
      VC.red.push({ id: nid("vcr"), voucher_id: rv.id, amount: rva, note: s200(b.note, 200) || null, redeemed_by: ME, redeemed_at: new Date().toISOString() }); return ok(rv); }
    if ((mm = p.match(/^\/api\/vouchers\/([^/]+)\/redemptions$/))) return ok(VC.red.filter(function (x) { return x.voucher_id === mm[1]; }).sort(function (a, c) { return a.redeemed_at < c.redeemed_at ? -1 : 1; }));
    if ((mm = p.match(/^\/api\/vouchers\/([^/]+)$/))) {
      if (m === "DELETE") { var dv = byId(VC.list, mm[1]); if (ROLE !== "admin" || !dv || (dv.status !== "storniert" && dv.status !== "ausstehend")) return deny("Löschen können Admins nur stornierte Gutscheine."); remove(VC.list, mm[1]); return ok({ ok: true }); }
      var ev2 = byId(VC.list, mm[1]); if (!ev2) return nf(); if (m === "PATCH") {
        if (b.status !== undefined) { if (b.status !== "storniert") return ok({ error: "Nur Stornieren ist möglich." }, 400); ev2.status = "storniert"; }
        ["recipient_name", "message", "title", "buyer_name"].forEach(function (k) { if (b[k] !== undefined) ev2[k] = s200(b[k], k === "message" ? 500 : 120) || null; });
        if (b.valid_until !== undefined) ev2.valid_until = /^\d{4}-\d{2}-\d{2}$/.test(String(b.valid_until || "")) ? b.valid_until : null; }
      return ok(ev2); }

    /* Paket 044: Unterkunft – Übergabe-Protokolle, Monatsliste, Touren */
    if ((mm = p.match(/^\/api\/housing-assignments\/([^/]+)\/handovers$/))) {
      if (m === "POST") { if (!hrNow()) return deny("Übergaben trägt die Leitung Personal ein."); var hasg = byId(D.housing_assignments, mm[1]); if (!hasg) return nf(); var hrow; try { hrow = hoClean(b, false); } catch (e3) { return ok({ error: e3.message }, 400); }
        var nho = Object.assign({ items: [], meters: {}, keys: null, damages: null, signer_name: null, signature_data: null }, hrow, { id: nid("hov"), assignment_id: hasg.id, hotel_id: D.hotel.id, created_at: new Date().toISOString() }); HO.push(nho); return ok(nho); }
      return ok(HO.filter(function (x) { return x.assignment_id === mm[1]; }).sort(function (a, c) { return a.day < c.day ? -1 : 1; })); }
    if ((mm = p.match(/^\/api\/housing-handovers\/([^/]+)$/))) { if (!hrNow()) return deny("Übergaben trägt die Leitung Personal ein.");
      if (m === "DELETE") { remove(HO, mm[1]); return ok({ ok: true }); } var eho = byId(HO, mm[1]); if (!eho) return deny("Übergaben trägt die Leitung Personal ein.");
      try { Object.assign(eho, hoClean(b, true)); } catch (e4) { return ok({ error: e4.message }, 400); } return ok(eho); }
    if (p === H + "/housing/payroll") {
      if (!hrNow()) return deny("Die Monatsliste sieht die Leitung Personal.");
      var pmo = /^\d{4}-(0[1-9]|1[0-2])$/.test(q.get("month") || "") ? q.get("month") : todayIso.slice(0, 7), pm0 = pmo + "-01", pdim = new Date(Date.UTC(Number(pmo.slice(0, 4)), Number(pmo.slice(5)), 0)).getUTCDate(), pm1 = add(pm0, pdim - 1), prows = [];
      D.housing_assignments.forEach(function (a) {
        var pf = a.from_date > pm0 ? a.from_date : pm0, pt = a.to_date && a.to_date < pm1 ? a.to_date : pm1; if (a.from_date > pm1 || (a.to_date && a.to_date < pm0) || pt < pf) return;
        var pd = Math.round((new Date(pt + "T12:00:00Z") - new Date(pf + "T12:00:00Z")) / 86400000) + 1, pu = byId(D.housing_units, a.unit_id) || {}, pmn = a.deduction_month != null ? Number(a.deduction_month) : pu.rent_month != null ? Number(pu.rent_month) : null;
        var pmem = a.user_id ? D.members.find(function (x) { return x.user_id === a.user_id; }) : null;
        prows.push({ assignment_id: a.id, user_id: a.user_id || null, person_name: a.person_name || (pmem && (pmem.full_name || pmem.name)) || null, unit: pu.name || "", from: pf, to: pt, days: pd, days_in_month: pdim, monthly: pmn, amount: pmn == null ? null : Math.round(pmn * pd / pdim * 100) / 100, source: a.deduction_month != null ? "abzug" : "miete" }); });
      prows.sort(function (x, y) { return String(x.unit).localeCompare(String(y.unit)) || x.from.localeCompare(y.from); });
      return ok({ month: pmo, currency: D.hotel.currency || "EUR", rows: prows, total: Math.round(prows.reduce(function (s, r) { return s + (r.amount || 0); }, 0) * 100) / 100 }); }
    if (p === "/api/me/tours") { if (m === "PATCH") { Object.keys(b || {}).forEach(function (k) { if (b[k] === null) delete TOURS[k]; else TOURS[k] = todayIso; }); } return ok(TOURS); }

    return ok({});
  };
})();
