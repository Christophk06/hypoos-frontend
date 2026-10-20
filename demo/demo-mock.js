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
      return ok(D.arrivals.filter(function (g) { return g.arrival_date >= add(todayIso, -1); }).sort(function (a, c) { return a.arrival_date < c.arrival_date ? -1 : 1; })); }
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
    if ((mm = p.match(/^\/api\/reviews\/([^/]+)$/))) { remove(D.reviews, mm[1]); return ok({ ok: true }); }
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
    return ok({});
  };
})();
