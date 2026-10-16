/* Gesetzliche Feiertage je Land bzw. Bundesland/Kanton (Namen in der Landessprache).
   Für Lohn-Export (Feiertagsstunden) und Dienstplan. Regionale Sonderfälle (z. B. einzelne
   Gemeinden, einmalige Feiertage) sind nicht enthalten. */
(function (root) {
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(y, m, d) { var x = new Date(Date.UTC(y, m - 1, d)); return x.getUTCFullYear() + "-" + pad(x.getUTCMonth() + 1) + "-" + pad(x.getUTCDate()); }
  function dow(s) { return new Date(s + "T00:00:00Z").getUTCDay(); } // 0 = Sonntag
  function addD(s, n) { var x = new Date(s + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  // Ostersonntag (gregorianisch, Algorithmus nach Meeus/Jones/Butcher)
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return iso(y, month, day);
  }
  // n-ter Wochentag im Monat (n = -1: letzter)
  function nth(y, m, wd, n) {
    if (n > 0) { var s = iso(y, m, 1); var off = (wd - dow(s) + 7) % 7; return addD(s, off + (n - 1) * 7); }
    var last = iso(y, m + 1, 0); return addD(last, -((dow(last) - wd + 7) % 7));
  }
  var F = function (m, d, name) { return function (y) { return [iso(y, m, d), name]; }; };
  var E = function (off, name) { return function (y) { return [addD(easter(y), off), name]; }; };

  var DE = [F(1, 1, "Neujahr"), E(-2, "Karfreitag"), E(1, "Ostermontag"), F(5, 1, "Tag der Arbeit"), E(39, "Christi Himmelfahrt"), E(50, "Pfingstmontag"),
    F(10, 3, "Tag der Deutschen Einheit"), F(12, 25, "1. Weihnachtstag"), F(12, 26, "2. Weihnachtstag")];
  var dk = F(1, 6, "Heilige Drei Könige"), fr = E(60, "Fronleichnam"), ah = F(11, 1, "Allerheiligen"), rf = F(10, 31, "Reformationstag"), mh = F(8, 15, "Mariä Himmelfahrt");
  var bussUndBettag = function (y) { var d = iso(y, 11, 22); return [addD(d, -((dow(d) - 3 + 7) % 7)), "Buß- und Bettag"]; };
  var genfFast = function (y) { return [addD(nth(y, 9, 0, 1), 4), "Jeûne genevois"]; };
  var CH = [F(1, 1, "Neujahr"), E(-2, "Karfreitag"), E(1, "Ostermontag"), E(39, "Auffahrt"), E(50, "Pfingstmontag"), F(8, 1, "Bundesfeier"), F(12, 25, "Weihnachten")];

  var RULES = {
    AT: [F(1, 1, "Neujahr"), F(1, 6, "Heilige Drei Könige"), E(1, "Ostermontag"), F(5, 1, "Staatsfeiertag"), E(39, "Christi Himmelfahrt"), E(50, "Pfingstmontag"),
      E(60, "Fronleichnam"), F(8, 15, "Mariä Himmelfahrt"), F(10, 26, "Nationalfeiertag"), F(11, 1, "Allerheiligen"), F(12, 8, "Mariä Empfängnis"),
      F(12, 25, "Christtag"), F(12, 26, "Stefanitag")],
    DE: DE,
    "DE-BW": DE.concat([dk, fr, ah]), "DE-BY": DE.concat([dk, fr, mh, ah]), "DE-BE": DE.concat([F(3, 8, "Internationaler Frauentag")]),
    "DE-BB": DE.concat([E(0, "Ostersonntag"), E(49, "Pfingstsonntag"), rf]), "DE-HB": DE.concat([rf]), "DE-HH": DE.concat([rf]), "DE-HE": DE.concat([fr]),
    "DE-MV": DE.concat([F(3, 8, "Internationaler Frauentag"), rf]), "DE-NI": DE.concat([rf]), "DE-NW": DE.concat([fr, ah]), "DE-RP": DE.concat([fr, ah]),
    "DE-SL": DE.concat([fr, mh, ah]), "DE-SN": DE.concat([rf, bussUndBettag]), "DE-ST": DE.concat([dk, rf]), "DE-SH": DE.concat([rf]),
    "DE-TH": DE.concat([F(9, 20, "Weltkindertag"), rf]),
    "CH-ZH": CH.concat([F(1, 2, "Berchtoldstag"), F(5, 1, "Tag der Arbeit"), F(12, 26, "Stephanstag")]),
    "CH-BE": CH.concat([F(1, 2, "Berchtoldstag"), F(12, 26, "Stephanstag")]),
    "CH-GE": [F(1, 1, "Nouvel An"), E(-2, "Vendredi saint"), E(1, "Lundi de Pâques"), E(39, "Ascension"), E(50, "Lundi de Pentecôte"), F(8, 1, "Fête nationale"),
      genfFast, F(12, 25, "Noël"), F(12, 31, "Restauration de la République")],
    IT: [F(1, 1, "Capodanno"), F(1, 6, "Epifania"), E(0, "Pasqua"), E(1, "Lunedì dell’Angelo"), F(4, 25, "Festa della Liberazione"), F(5, 1, "Festa del Lavoro"),
      F(6, 2, "Festa della Repubblica"), F(8, 15, "Ferragosto"), F(11, 1, "Ognissanti"), F(12, 8, "Immacolata Concezione"), F(12, 25, "Natale"), F(12, 26, "Santo Stefano")],
    FR: [F(1, 1, "Jour de l’an"), E(1, "Lundi de Pâques"), F(5, 1, "Fête du Travail"), F(5, 8, "Victoire 1945"), E(39, "Ascension"), E(50, "Lundi de Pentecôte"),
      F(7, 14, "Fête nationale"), F(8, 15, "Assomption"), F(11, 1, "Toussaint"), F(11, 11, "Armistice 1918"), F(12, 25, "Noël")],
    ES: [F(1, 1, "Año Nuevo"), F(1, 6, "Epifanía del Señor"), E(-2, "Viernes Santo"), F(5, 1, "Fiesta del Trabajo"), F(8, 15, "Asunción de la Virgen"),
      F(10, 12, "Fiesta Nacional de España"), F(11, 1, "Todos los Santos"), F(12, 6, "Día de la Constitución"), F(12, 8, "Inmaculada Concepción"), F(12, 25, "Natividad del Señor")],
    PT: [F(1, 1, "Ano Novo"), E(-2, "Sexta-feira Santa"), E(0, "Páscoa"), F(4, 25, "Dia da Liberdade"), F(5, 1, "Dia do Trabalhador"), E(60, "Corpo de Deus"),
      F(6, 10, "Dia de Portugal"), F(8, 15, "Assunção de Nossa Senhora"), F(10, 5, "Implantação da República"), F(11, 1, "Todos os Santos"),
      F(12, 1, "Restauração da Independência"), F(12, 8, "Imaculada Conceição"), F(12, 25, "Natal")],
    "GB-ENG": [function (y) { var d = iso(y, 1, 1), w = dow(d); return [w === 6 ? addD(d, 2) : w === 0 ? addD(d, 1) : d, "New Year’s Day"]; },
      E(-2, "Good Friday"), E(1, "Easter Monday"), function (y) { return [nth(y, 5, 1, 1), "Early May bank holiday"]; },
      function (y) { return [nth(y, 5, 1, -1), "Spring bank holiday"]; }, function (y) { return [nth(y, 8, 1, -1), "Summer bank holiday"]; },
      function (y) { var w = dow(iso(y, 12, 25)); return [w === 6 || w === 0 ? iso(y, 12, 27) : iso(y, 12, 25), "Christmas Day"]; },
      function (y) { var w = dow(iso(y, 12, 26)); return [w === 6 ? iso(y, 12, 28) : w === 0 ? iso(y, 12, 28) : iso(y, 12, 26), "Boxing Day"]; }],
    NL: [F(1, 1, "Nieuwjaarsdag"), E(0, "Eerste Paasdag"), E(1, "Tweede Paasdag"), function (y) { var d = iso(y, 4, 27); return [dow(d) === 0 ? iso(y, 4, 26) : d, "Koningsdag"]; },
      F(5, 5, "Bevrijdingsdag"), E(39, "Hemelvaartsdag"), E(49, "Eerste Pinksterdag"), E(50, "Tweede Pinksterdag"), F(12, 25, "Eerste Kerstdag"), F(12, 26, "Tweede Kerstdag")],
    BE: [F(1, 1, "Nieuwjaar"), E(1, "Paasmaandag"), F(5, 1, "Dag van de Arbeid"), E(39, "Onze-Lieve-Heer-Hemelvaart"), E(50, "Pinkstermaandag"),
      F(7, 21, "Nationale feestdag"), F(8, 15, "Onze-Lieve-Vrouw-Hemelvaart"), F(11, 1, "Allerheiligen"), F(11, 11, "Wapenstilstand"), F(12, 25, "Kerstmis")],
    LU: [F(1, 1, "Neijoerschdag"), E(1, "Ouschterméindeg"), F(5, 1, "Dag vun der Aarbecht"), F(5, 9, "Europadag"), E(39, "Christi Himmelfahrt"), E(50, "Péngschtméindeg"),
      F(6, 23, "Nationalfeierdag"), F(8, 15, "Léiffrawëschdag"), F(11, 1, "Allerhellgen"), F(12, 25, "Chrëschtdag"), F(12, 26, "Stiefesdag")],
    IE: [F(1, 1, "New Year’s Day"), function (y) { var d = iso(y, 2, 1); return [dow(d) === 5 ? d : nth(y, 2, 1, 1), "St Brigid’s Day"]; }, F(3, 17, "St Patrick’s Day"),
      E(1, "Easter Monday"), function (y) { return [nth(y, 5, 1, 1), "May bank holiday"]; }, function (y) { return [nth(y, 6, 1, 1), "June bank holiday"]; },
      function (y) { return [nth(y, 8, 1, 1), "August bank holiday"]; }, function (y) { return [nth(y, 10, 1, -1), "October bank holiday"]; },
      F(12, 25, "Christmas Day"), F(12, 26, "St Stephen’s Day")],
    US: (function () {
      var obs = function (m, d, name) { return function (y) { var s = iso(y, m, d), w = dow(s); return [w === 6 ? addD(s, -1) : w === 0 ? addD(s, 1) : s, name]; }; };
      var n = function (m, wd, k, name) { return function (y) { return [nth(y, m, wd, k), name]; }; };
      return [obs(1, 1, "New Year’s Day"), n(1, 1, 3, "Martin Luther King Jr. Day"), n(2, 1, 3, "Washington’s Birthday"), n(5, 1, -1, "Memorial Day"),
        obs(6, 19, "Juneteenth"), obs(7, 4, "Independence Day"), n(9, 1, 1, "Labor Day"), n(10, 1, 2, "Columbus Day"), obs(11, 11, "Veterans Day"),
        n(11, 4, 4, "Thanksgiving Day"), obs(12, 25, "Christmas Day")];
    })(),
  };

  var STATES = { "DE-BW": "Baden-Württemberg", "DE-BY": "Bayern", "DE-BE": "Berlin", "DE-BB": "Brandenburg", "DE-HB": "Bremen", "DE-HH": "Hamburg", "DE-HE": "Hessen",
    "DE-MV": "Mecklenburg-Vorpommern", "DE-NI": "Niedersachsen", "DE-NW": "Nordrhein-Westfalen", "DE-RP": "Rheinland-Pfalz", "DE-SL": "Saarland", "DE-SN": "Sachsen",
    "DE-ST": "Sachsen-Anhalt", "DE-SH": "Schleswig-Holstein", "DE-TH": "Thüringen", "CH-ZH": "Zürich", "CH-BE": "Bern", "CH-GE": "Genève", "GB-ENG": "England" };

  var cache = {};
  function holidaysFor(region, year) {
    var rules = RULES[region]; if (!rules) return [];
    var k = region + year; if (cache[k]) return cache[k];
    var seen = {}, out = [];
    rules.forEach(function (r) { var x = r(year); if (!seen[x[0]]) { seen[x[0]] = 1; out.push({ date: x[0], name: x[1] }); } });
    return (cache[k] = out.sort(function (a, b) { return a.date < b.date ? -1 : 1; }));
  }
  function holidayMap(region, from, to) { // { "2026-12-25": "Christtag", ... }
    var m = {}; if (!region) return m;
    for (var y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) holidaysFor(region, y).forEach(function (h) { if (h.date >= from && h.date <= to) m[h.date] = h.name; });
    return m;
  }
  function regionLabel(code, locale) {
    var c = code.slice(0, 2), name = c;
    try { name = new Intl.DisplayNames([locale || "de"], { type: "region" }).of(c) || c; } catch (e) {}
    return STATES[code] ? name + " – " + STATES[code] : name;
  }
  root.HOLIDAY_REGIONS = Object.keys(RULES);
  root.holidaysFor = holidaysFor;
  root.holidayMap = holidayMap;
  root.holidayRegionLabel = regionLabel;
  root.easterSunday = easter;
})(typeof window !== "undefined" ? window : globalThis);
