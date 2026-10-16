/* ================================ Sprachen ================================
   Ouverture ist auf Deutsch geschrieben. Für andere Sprachen ersetzt dieser kleine
   Übersetzer die angezeigten Texte (Textknoten, Platzhalter, Tooltips, Rückfragen).
   Daten wie Status, Priorität oder Abteilung bleiben in der Datenbank deutsch und
   werden nur übersetzt angezeigt.

   Welche Sprache gilt:
   1. die selbst gewählte (Sprachauswahl in der App / auf der Anmeldeseite)
   2. sonst die Standardsprache der Organisation
   3. vor der Anmeldung: zuletzt genutzte Sprache, sonst Sprache des Browsers

   Neue Sprache hinzufügen: unten in LANGS, LOCALES und I18N eintragen und eine
   Übersetzungstabelle (gleiche Schlüssel wie I18N.en) plus Muster ergänzen. */

const LANGS = [["de","Deutsch"],["en","English"],["fr","Français"],["it","Italiano"],["es","Español"],
  ["pt","Português"],["tr","Türkçe"],["ja","日本語"],["zh","中文"],["ar","العربية"]];
// Arabisch mit westlichen Ziffern (wie in Hotellerie und Finanzen am Golf üblich)
const LOCALES = { de:"de-DE", en:"en-GB", fr:"fr-FR", it:"it-IT", es:"es-ES", pt:"pt-PT", tr:"tr-TR", ja:"ja-JP", zh:"zh-CN", ar:"ar-AE-u-nu-latn" };
const RTL_LANGS = ["ar"];
const LS_LANG_CHOICE = "hpoos_ui_lang_choice";   // ausdrücklich gewählt
const LS_LANG_LAST = "hpoos_ui_lang";            // zuletzt genutzt (z. B. Standard der Organisation)

let UI_LANG = "de";
let UI_LOCALE = "de-DE";

function i18nGet(k){ try { return window.localStorage.getItem(k); } catch(e){ return null; } }
function i18nSet(k, v){ try { if(v) window.localStorage.setItem(k, v); else window.localStorage.removeItem(k); } catch(e){} }
const isLang = (l) => LANGS.some(([c]) => c === l);

function translateString(str){
  if(UI_LANG === "de" || !str) return str;
  const trimmed = str.trim();
  if(!trimmed) return str;
  const dict = I18N[UI_LANG] || {};
  const hit = dict[trimmed];
  if(hit !== undefined) return str.replace(trimmed, hit);
  for(const [re, rep] of (I18N_PATTERNS[UI_LANG] || [])){ if(re.test(trimmed)) return str.replace(trimmed, trimmed.replace(re, rep)); }
  return str;
}

// Ganze Sätze mit Platzhaltern übersetzen: tf("{0} von {1} Aufgaben", 3, 10).
// So stimmt auch die Wortstellung (z. B. Japanisch, Türkisch, Arabisch).
const I18N_TF = {};
function tf(template, ...args){
  const dict = I18N_TF[UI_LANG];
  let out = (UI_LANG !== "de" && dict && dict[template]) || (UI_LANG !== "de" && I18N[UI_LANG] && I18N[UI_LANG][template]) || template;
  return out.replace(/\{(\d)\}/g, (_, i) => (args[i] === undefined || args[i] === null) ? "" : String(args[i]));
}

const I18N_ATTRS = ["placeholder", "title", "aria-label"];
function translateNode(node){
  if(node.nodeType === 3){
    const t = translateString(node.nodeValue);
    if(t !== node.nodeValue) node.nodeValue = t;
  } else if(node.nodeType === 1 && node.tagName !== "SCRIPT" && node.tagName !== "STYLE" && node.tagName !== "TEXTAREA" && !node.hasAttribute("data-no-i18n")){
    for(const a of I18N_ATTRS){ const v = node.getAttribute(a); if(v){ const t = translateString(v); if(t !== v) node.setAttribute(a, t); } }
    node.childNodes.forEach(translateNode);
  }
}

// Rückfragen (window.confirm) ebenfalls übersetzen
const nativeConfirm = window.confirm.bind(window);
window.confirm = (msg) => nativeConfirm(translateString(msg));

// Einmal beim Laden: Übersetzer starten (Deutsch braucht keinen)
function startI18n(lang){
  UI_LANG = isLang(lang) ? lang : "de";
  UI_LOCALE = LOCALES[UI_LANG];
  document.documentElement.lang = UI_LANG;
  document.documentElement.dir = RTL_LANGS.includes(UI_LANG) ? "rtl" : "ltr";
  if(UI_LANG === "de") return;
  const run = () => {
    translateNode(document.body);
    new MutationObserver((muts) => {
      for(const m of muts){
        if(m.type === "characterData" || m.type === "attributes") translateNode(m.target);
        else m.addedNodes.forEach(translateNode);
      }
    }).observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:I18N_ATTRS});
  };
  if(document.body) run(); else document.addEventListener("DOMContentLoaded", run);
}

// Sprache selbst wählen (null = wieder der Organisation folgen). Lädt die Seite neu,
// weil sich übersetzte Texte nicht zuverlässig zurückverwandeln lassen.
function chooseUiLanguage(lang){
  i18nSet(LS_LANG_CHOICE, isLang(lang) ? lang : null);
  if(isLang(lang)) i18nSet(LS_LANG_LAST, lang);
  window.location.reload();
}
function chosenUiLanguage(){ const c = i18nGet(LS_LANG_CHOICE); return isLang(c) ? c : null; }

// Standardsprache der Organisation übernehmen – nur wenn nichts selbst gewählt wurde
function followOrgLanguage(orgLang){
  if(chosenUiLanguage() || !isLang(orgLang) || orgLang === UI_LANG) return;
  i18nSet(LS_LANG_LAST, orgLang);
  window.location.reload();
}

function initialUiLanguage(){
  const chosen = chosenUiLanguage();
  if(chosen) return chosen;
  const last = i18nGet(LS_LANG_LAST);
  if(isLang(last)) return last;
  const nav = (navigator.language || "de").slice(0, 2).toLowerCase();
  return isLang(nav) ? nav : "de";
}

/* ------------------------------ Englisch ------------------------------ */
const I18N_EN = {
  // Navigation und Rahmen
  "Dashboard":"Dashboard", "Meine Aufgaben":"My tasks", "Aufgaben":"Tasks", "Meilensteine":"Milestones", "Zeitstrahl":"Timeline",
  "Risiken":"Risks", "Budget":"Budget", "Personal":"HR", "Dokumente":"Documents", "Team":"Team", "Abo":"Subscription", "Konto":"Account",
  "Hotel wechseln":"Switch hotel", "Abmelden":"Sign out", "ORGANISATION":"ORGANISATION", "Organisation":"Organisation",
  "Statusbericht":"Status report", "Excel-Export":"Excel export", "Kalender":"Calendar", "Hotel bearbeiten":"Edit hotel",
  "Beispiel entfernen":"Remove sample", "Beispielhotel":"Sample hotel", "Beispiel":"Sample", "Zimmer":"rooms", "Zimmer · Eröffnung":"rooms · Opening",
  "Lädt…":"Loading…", "Hotels werden geladen…":"Loading hotels…", "Abo-Daten werden geladen…":"Loading subscription…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Open deadlines and milestones for Outlook, Google or Apple Calendar",

  // Werte (bleiben intern deutsch)
  "Nicht begonnen":"Not started", "In Arbeit":"In progress", "Blockiert":"Blocked", "In Prüfung":"In review", "Abgeschlossen":"Done",
  "Kritisch":"Critical", "Hoch":"High", "Mittel":"Medium", "Niedrig":"Low",
  "Geplant":"Planned", "Gefährdet":"At risk",
  "Rezeption & Empfang":"Front Office", "Housekeeping":"Housekeeping", "Food & Beverage":"Food & Beverage", "Technik":"Engineering",
  "IT & Systeme":"IT & Systems", "Einkauf":"Purchasing", "Sicherheit":"Safety & Security", "Allgemein":"General",
  "Ausstattung":"Equipment", "Bau & Instandhaltung":"Construction & maintenance", "Dienstleister":"Service providers", "IT & Technik":"IT & technology",
  "Marketing":"Marketing", "Personal & Schulung":"Staff & training", "Vorräte":"Supplies", "Sonstiges":"Other",
  "sofort":"immediately", "diese Woche":"this week", "diesen Monat":"this month",
  "Admin":"Admin", "Mitglied":"Member", "Eigentümer (nur lesen)":"Owner (read-only)",

  // Anmeldung
  "Anmelden":"Sign in", "Registrieren":"Sign up", "Neues Konto erstellen":"Create new account", "Konto erstellen":"Create account",
  "E-Mail":"Email", "Passwort":"Password", "Passwort vergessen?":"Forgot password?", "Passwort vergessen":"Forgot password",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"Enter your email address — we'll send you a reset link.",
  "Link schicken":"Send link", "Zurück zur Anmeldung":"Back to sign in", "Bitte warten…":"Please wait…",
  "Neues Passwort festlegen":"Set new password", "Passwort speichern":"Save password", "Passwort geändert":"Password changed",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"You can now sign in with your new password.", "Zur Anmeldung":"Go to sign in",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"PRE-OPENING SOFTWARE FOR HOTELS", "Bis zum ersten Gast –":"Up to the first guest –", "alles im Blick.":"everything in view.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"Tasks · Milestones · Risks · AI status report",
  "Login fehlgeschlagen.":"Sign-in failed.", "Registrierung fehlgeschlagen.":"Sign-up failed.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"The password must be at least 6 characters.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"Account created! Please confirm your email address via the link we sent you, then sign in.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"If this email address is registered, we've just sent you a link to reset your password. Please check your inbox (and spam folder).",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"Your session has expired – please sign in again.", "Bitte erneut anmelden.":"Please sign in again.",

  // Hotels
  "Hotel auswählen":"Select hotel", "+ Neues Hotel":"+ New hotel", "Neues Hotel":"New hotel", "Name":"Name", "Stadt":"City", "Land":"Country",
  "Zimmeranzahl":"Number of rooms", "Eröffnungsdatum":"Opening date", "Hotel anlegen":"Create hotel", "Speichert…":"Saving…", "Abbrechen":"Cancel",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"Want to try it first? The sample hotel shows a project 30 days before opening – with tasks, risks, budget and staffing. It doesn't count towards your plan.",
  "Beispielhotel öffnen":"Open sample hotel", "Wird angelegt…":"Creating…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"There's no hotel in this organisation yet. As soon as the project team creates one, you'll see it here.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"Delete the sample hotel with all sample data? You can create it again at any time.",
  "Speichern":"Save", "Gespeichert.":"Saved.", "Speichern & weiter":"Save & continue",

  // Dashboard
  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"READINESS · ON SCHEDULE ⓘ", "IM ZEITPLAN":"ON SCHEDULE",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"How much of what was due by today is done – minus risks, staffing and budget gaps. 100% means fully on schedule.",
  "Gesamtfortschritt:":"Overall progress:", "aller Aufgaben erledigt":"of all tasks done", "% aller Aufgaben erledigt":"% of all tasks done",
  "überfällig ·":"overdue ·", "hohe Risiken":"high risks", "Bereitschaft je Abteilung":"Readiness by department",
  "Budget überschritten:":"Budget exceeded:", "Stellen über Starttermin offen":"positions open past start date",
  "Noch keine Posten – hier anlegen →":"No items yet – add here →", "Noch keine Stellen – hier anlegen →":"No positions yet – add here →",
  "Überfällige kritische Aufgaben":"Overdue critical tasks", "Höchste Risiken":"Top risks", "Keine.":"None.", "· Score":"· Score",
  "Personen eingestellt ·":"people hired ·", "offen":"open", "überschritten um":"over by",

  // KI-Lagebericht
  "KI-Lagebericht":"AI status report", "Lagebericht erstellen":"Create status report", "Neu erstellen":"Regenerate", "Analysiert…":"Analysing…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"The AI analyses tasks, milestones, risks, budget and staffing and writes an assessment for management and owners – with a traffic light, action items and next steps.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"The AI is analysing the project. This usually takes 20–60 seconds …",
  "Handlungsbedarf":"Action required", "Risikohinweise":"Risk notes", "Was gut läuft":"What's going well", "Nächste Schritte (7 Tage)":"Next steps (7 days)",
  "Risikohinweise und nächste Schritte anzeigen":"Show risk notes and next steps", "Weniger anzeigen":"Show less",
  "Im Plan":"On track", "Verzug – aufholbar":"Delayed – recoverable", "Eröffnung gefährdet":"Opening at risk", "Einschätzung":"Assessment",

  // Aufgaben
  "+ Aufgabe":"+ Task", "Aus Excel importieren":"Import from Excel", "Aus Vorlage ergänzen":"Add from template",
  "Aufgabe":"Task", "Titel":"Title", "Abteilung":"Department", "Priorität":"Priority", "Status":"Status", "Fällig":"Due", "Fällig am":"Due date",
  "Zuständig":"Responsible", "Zuständig im Team":"Responsible (team)", "Extern / Sonstige":"External / other", "— niemand aus dem Team —":"— nobody from the team —",
  "Alle Abteilungen":"All departments", "Alle Status":"All statuses", "Alle offenen":"All open", "Nur meine":"Mine only", "Ohne Zuständigkeit":"Unassigned",
  "Erledigte anzeigen":"Show completed", "Sortierung":"Sort", "Nach Termin":"By due date", "Nach Priorität":"By priority", "Nach Abteilung":"By department",
  "Filter zurücksetzen":"Reset filters", "Keine Aufgabe passt zu den Filtern.":"No task matches the filters.",
  "Suchen: Titel, Zuständige, Externe …":"Search: title, responsible, external …", "Bearbeiten":"Edit", "Löschen":"Delete", "löschen":"delete",
  "Kommentare und Verlauf":"Comments and history", "Noch keine Kommentare.":"No comments yet.", "Kommentar schreiben … (Strg+Enter zum Senden)":"Write a comment … (Ctrl+Enter to send)",
  "Senden":"Send", "Änderungsverlauf anzeigen":"Show change history", "Kommentar löschen?":"Delete comment?", "hat die Aufgabe angelegt":"created the task",
  "Automatisch":"Automatic", "(Eröffnung verschoben)":"(opening moved)", "Du":"You", "Unbekannt":"Unknown",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"No task is assigned to you yet. You set responsibilities under “Tasks” when editing.",
  "Keine offenen Aufgaben – alles erledigt.":"No open tasks – all done.", "Hotel":"Hotel", "kein Termin":"no due date",
  "· am Eröffnungstag":"· on opening day", "Tage vor":"days before", "Tage nach":"days after", "Eröffnung":"Opening",
  "Vorlage: Standard-Eröffnungsplanung":"Template: standard opening plan",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"Typical pre-opening tasks and milestones for all departments, scheduled relative to the opening date. If the opening moves, these dates move automatically – until you change a date yourself.",
  "Wird geprüft…":"Checking…", "Die Vorlage ist bereits vollständig angewendet.":"The template has already been fully applied.",
  "Neu angelegt werden":"To be created:", "Aufgaben und":"tasks and", "Meilensteine angelegt.":"milestones created.", "Vorlage anwenden":"Apply template",
  "sind schon vorhanden und werden übersprungen)":"already exist and will be skipped)", "vergangene weggelassen.":"past ones left out.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"of them would be due before today. Leave these out (otherwise they're created as overdue).",

  // Import
  "Aufgaben aus Excel oder CSV importieren":"Import tasks from Excel or CSV",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"First sheet of the file, one task per row. Columns such as “Task”, “Department”, “Priority”, “Status”, “Due” and “Owner” are detected automatically – in English or German.",
  "Spalten zuordnen":"Map columns", "– nicht importieren –":"– don't import –", "(Pflicht)":"(required)", "Spalte":"Column",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"Unknown priorities become “Medium”, unknown statuses “Not started”, missing departments “General”. Owners are imported as text – you can assign team members afterwards.",
  "Importiert…":"Importing…", "Schließen":"Close", "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"No rows were found below the header in the file.",
  "Datei konnte nicht gelesen werden:":"Could not read the file:",

  // Meilensteine, Zeitstrahl
  "Meilenstein":"Milestone", "Datum":"Date", "Kritikalität":"Criticality", "Keine offenen Meilensteine.":"No open milestones.",
  "Heute":"Today", "Monate":"Months", "nur offene Aufgaben":"open tasks only", "erledigt":"done", "blockiert":"blocked", "überfällig":"overdue",
  "◆ Meilenstein":"◆ Milestone", "Noch keine Aufgaben oder Meilensteine mit Termin.":"No tasks or milestones with a date yet.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"Hover over a dot to see the task. Larger dots are critical tasks.",

  // Risiken
  "+ Risiko":"+ Risk", "Risiko":"Risk", "Gegenmaßnahme":"Mitigation", "Gegenmaßnahme (optional)":"Mitigation (optional)", "Score":"Score",
  "Wahrscheinlichkeit:":"Probability:", "Auswirkung:":"Impact:", "Maßnahme:":"Mitigation:", "keine festgelegt":"none defined", "Keine Risiken erfasst.":"No risks recorded.",

  // Budget
  "+ Budgetposten":"+ Budget item", "Posten":"Item", "Posten, z. B. Matratzen":"Item, e.g. mattresses", "Plan":"Plan", "Ist":"Actual",
  "Plan (€)":"Plan (€)", "Ist (€)":"Actual (€)", "Notiz":"Note", "Noch keine Budgetposten.":"No budget items yet.", "Kein Budget erfasst.":"No budget recorded.",
  "Ist vs. Plan je Abteilung":"Actual vs. plan by department", "NOCH VERFÜGBAR":"STILL AVAILABLE", "ÜBERSCHRITTEN":"OVER BUDGET",
  "verfügbar":"available", "überschritten":"exceeded", "Alle Abteilungen im Plan.":"All departments within plan.", "% vom Plan":"% of plan", "% über Plan)":"% over plan)",

  // Personal
  "+ Stelle":"+ Position", "Stelle":"Position", "z. B. Rezeptionist/in":"e.g. receptionist", "Benötigt":"Required", "Besetzt":"Filled", "Start":"Start",
  "Personen":"people", "Besetzung je Abteilung":"Staffing by department", "Noch keine Stellen angelegt.":"No positions created yet.", "Keine Stellen erfasst.":"No positions recorded.",
  "Eine Person mehr":"One more person", "Eine Person weniger":"One person less", "Stellen mit Lücken":"positions with gaps", "1 Stelle mit Lücken":"1 position with gaps",
  "Bitte eine Stellenbezeichnung eingeben.":"Please enter a job title.", "„Benötigt“ muss mindestens 1 sein.":"“Required” must be at least 1.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"“Filled” must be between 0 and “Required”.", "weitere Stellen.":"more positions.", "% besetzt":"% filled",

  // Dokumente
  "Dateien hochladen":"Upload files", "oder hierher ziehen · max. 25 MB je Datei":"or drag here · max. 25 MB per file", "Noch keine Dokumente.":"No documents yet.",
  "Herunterladen":"Download", "Datei anhängen":"Attach file", "ANHÄNGE":"ATTACHMENTS", "Keine Anhänge.":"No attachments.", "Lädt hoch:":"Uploading:",
  "Hochladen fehlgeschlagen":"Upload failed",

  // Team
  "Teammitglied einladen":"Invite team member", "E-Mail-Adresse":"Email address", "Einladen":"Invite", "Mitglieder":"Members", "(du)":"(you)",
  "Ausstehende Einladungen":"Pending invitations", "Link kopieren":"Copy link", "Kopiert!":"Copied!", "Entfernen":"Remove", "Teammitglied":"Team member",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"The person receives the invitation link by email. They sign up or sign in with it and then automatically belong to your organisation. If no email arrives, you can also copy the link below and pass it on yourself.",
  "Eigentümer (nur lesen)":"Owner (read-only)",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"see the dashboard, AI status report and status report and can comment, but can't change anything – ideal for owners and investors.",
  "Sprache der Organisation":"Organisation language", "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"Applies to the interface for all members, emails, the pre-opening template and the AI status report.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"Organisation name, e.g. Vienna Hotel Group", "Umbenennen":"Rename", "Meine Organisation":"My organisation",
  "Gefahrenzone":"Danger zone", "Organisation verlassen":"Leave organisation", "Organisation endgültig löschen":"Delete organisation permanently",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"If you leave the organisation, you lose access to all its hotels.",
  "Löscht":"Deletes", "Das kann nicht rückgängig gemacht werden.":"This cannot be undone.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"permanently with all hotels, tasks, comments, documents and reports. An active subscription ends immediately. If needed, export each hotel first via “Excel export”.",
  "Zur Bestätigung den Namen der Organisation eingeben:":"To confirm, type the organisation name:", "Wird gelöscht…":"Deleting…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"Invitation created, but no email sent (email not set up). Please copy the link below and pass it on.",
  "Eigentümer-Ansicht:":"Owner view:", "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"You see the current status, the AI status report and the status report. Only project team members can make changes.",

  // Konto
  "ANGEMELDET ALS":"SIGNED IN AS", "Passwort ändern":"Change password", "Neues Passwort":"New password", "Neues Passwort wiederholen":"Repeat new password",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"The new password must be at least 8 characters.", "Die beiden Passwörter stimmen nicht überein.":"The two passwords don't match.",
  "Passwort geändert.":"Password changed.", "Passwort konnte nicht geändert werden.":"Password could not be changed.",
  "Konto löschen":"Delete account", "Konto endgültig löschen":"Delete account permanently",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"Deletes your login and memberships. Organisations where you're the only member are deleted with all data (an active subscription ends immediately). In organisations with other members the data is kept. If you're the last admin there, hand over the role under “Team” first.",

  // Abo
  "Tarif wählen":"Choose plan", "Zahlungsart ändern":"Change payment method", "AKTUELLER TARIF":"CURRENT PLAN", "Testphase":"Trial", "Aktiv":"Active", "Aktuell":"Current",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"Manage subscription (invoices, payment method, cancellation)", "Öffnet…":"Opening…", "Öffnet Bezahlseite…":"Opening checkout…",
  "Nur Admins der Organisation können das Abo ändern.":"Only admins of the organisation can change the subscription.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"Online payment is being set up.", "Für ein Abo schreib an":"For a subscription, write to",
  "pro Monat zzgl. USt., monatlich kündbar":"per month plus VAT, cancel monthly", "Bald verfügbar":"Coming soon", "Über „Abo verwalten“ wechseln":"Switch via “Manage subscription”",
  "auf Anfrage":"on request", "Jahresvertrag":"Annual contract", "Mehr als 5 Hotels":"More than 5 hotels", "Eigene Vorlagen je Marke":"Custom templates per brand",
  "Onboarding und Schulung":"Onboarding and training", "Kontakt aufnehmen":"Get in touch", "Status aktualisieren":"Refresh status",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"Payment is handled securely by Stripe. Invoices are sent by email and are available under “Manage subscription”.",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"Thank you! Payment was successful. The subscription will be activated in a few seconds.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"Payment was cancelled. Nothing was charged.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"The trial has ended. Ouverture is in read-only mode – all data is kept.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"No active subscription. Ouverture is in read-only mode – all data is kept.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"The last payment failed. Please update your payment method.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"Payment due – please update payment method", "Beendet":"Ended", "Unbezahlt":"Unpaid", "Zahlung nicht abgeschlossen":"Payment not completed",
  "1 Hotel-Eröffnung":"1 hotel opening", "Unbegrenzt viele Teammitglieder":"Unlimited team members", "Vorlage mit Pre-Opening-Plan":"Pre-opening plan template",
  "Statusbericht als PDF":"Status report as PDF", "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"Up to 5 hotel openings at once", "Alles aus Starter":"Everything in Starter",
  "Für Hotelgruppen und Beratungen":"For hotel groups and consultancies", "Bevorzugter Support":"Priority support",

  // Statusbericht
  "← Zurück":"← Back", "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"In the print dialog, choose “Save as PDF” as the destination.",
  "Als PDF speichern / Drucken":"Save as PDF / Print", "STATUSBERICHT PRE-OPENING":"PRE-OPENING STATUS REPORT", "Stand:":"As of:", "Eröffnung:":"Opening:",
  "AUFGABEN":"TASKS", "MEILENSTEINE":"MILESTONES", "BUDGET (IST / PLAN)":"BUDGET (ACTUAL / PLAN)", "PERSONAL":"STAFFING",
  "Überfällige Aufgaben mit hoher Priorität":"Overdue high-priority tasks", "Blockiert:":"Blocked:", "Größte Risiken":"Top risks",
  "Noch keine Abteilungsdaten.":"No department data yet.", "Erstellt mit Ouverture":"Created with Ouverture", "KI-Lagebericht vom":"AI status report of",
  "im Plan":"on track", "gefährdet":"at risk", "Überfällig":"Overdue", "ÜBERFÄLLIG":"OVERDUE",

  // Fehlerseite
  "Da ist etwas schiefgelaufen":"Something went wrong",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"The error has been reported automatically. Your data is saved – please reload the page.",
  "Seite neu laden":"Reload page",

  // Häufige Meldungen des Servers
  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Change not possible: either you have read-only access (owner view), or this organisation's subscription isn't active (e.g. trial ended). An admin can change the role under “Team” or the plan under “Subscription”.",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"Your current plan doesn't allow another hotel (hotel limit reached or trial ended). An admin can change the plan under “Subscription”.",
  "Nur Admins der Organisation können das Abo verwalten.":"Only admins of the organisation can manage the subscription.",
  "Keine Aufgaben mit Titel gefunden.":"No tasks with a title found.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"There must be at least one admin. Please make someone else an admin first.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"The last admin can't leave the organisation. Please make someone else an admin first – or delete the organisation.",
};
// Neue Texte (Währung, Sprachauswahl, Team) – Englisch
const I18N_EN_EXTRA = {
  "Stand":"As of", 
  "Währung":"Currency", "Währung für das Budget":"Budget currency",
  "Euro (€)":"Euro (€)", "Schweizer Franken (CHF)":"Swiss franc (CHF)", "Britisches Pfund (£)":"British pound (£)", "US-Dollar ($)":"US dollar ($)",
  "VAE-Dirham (AED)":"UAE dirham (AED)", "Saudi-Riyal (SAR)":"Saudi riyal (SAR)", "Katar-Riyal (QAR)":"Qatari riyal (QAR)",
  "Sprache":"Language", "Wie die Organisation":"Same as organisation",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"Your language applies only to you. Without a choice, Ouverture follows the organisation's default language.",
  "Standardsprache der Organisation":"Organisation default language",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"Applies to emails, the pre-opening template, the AI status report and all members without their own language choice.",
  "Meine Sprache":"My language",
};

Object.assign(I18N_EN, I18N_EN_EXTRA);
const I18N_EN_PATTERNS = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "$1 days until opening"],
  [/^Eröffnung war vor (\d+) Tagen$/, "Opening was $1 days ago"],
  [/^noch (\d+) Tage$/, "$1 days to go"],
  [/^seit (\d+) Tagen eröffnet$/, "open for $1 days"],
  [/^Testphase: noch 1 Tag\.$/, "Trial: 1 day left."],
  [/^Testphase: noch (\d+) Tage\.$/, "Trial: $1 days left."],
  [/^Testphase bis (.+)$/, "Trial until $1"],
  [/^Testphase abgelaufen am (.+)$/, "Trial ended on $1"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "Active · next billing $1"],
  [/^Gekündigt – läuft bis (.+)$/, "Cancelled – runs until $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$1 of $2 hotels used"],
  [/^Personal (\d+) % besetzt$/, "Staffing $1% filled"],
  [/^Stand (.+)$/, "As of $1"],
  [/^seit (.+)$/, "since $1"],
  [/^Stand: (.+)$/, "As of: $1"],
  [/^erstellt von (.+)$/, "created by $1"],
  [/^(\d+) Aufgaben importieren$/, "Import $1 tasks"],
  [/^(\d+) Aufgaben importiert\.$/, "$1 tasks imported."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1 tasks imported, $2 empty rows skipped."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "Preview of the first rows ($1 of $2 rows have a task title):"],
  [/^(.+) wählen$/, "Choose $1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 is now $2."],
  [/^(.+) wurde entfernt\.$/, "$1 has been removed."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "Invitation sent by email to $1."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "To confirm, type “$1”"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "To confirm, type the organisation name: $1"],
  [/^(\d+) Personen eingestellt · (\d+) offen$/, "$1 people hired · $2 open"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 of $2 people hired · $3 open"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 open · $2 overdue"],
  [/^(\d+) gefährdet$/, "$1 at risk"],
  [/^(\d+) besetzt$/, "$1 filled"],
  [/^(.+) ausgegeben$/, "$1 spent"],
  [/^Um (.+) überschritten$/, "Over by $1"],
  [/^… und (\d+) weitere\.$/, "… and $1 more."],
  [/^… und (\d+) weitere Stellen\.$/, "… and $1 more positions."],
  [/^(\d+) überfällig$/, "$1 overdue"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "Plan $1 · Actual $2 · available $3"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 of $2 people hired · $3 open"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "“$1” is larger than 25 MB."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "Remove $1 from the organisation? They lose access immediately; their tasks are kept but unassigned."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "Really leave “$1”? You lose access until an admin invites you again."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "Really delete $1? This cannot be undone."],
  [/^Aufgabe „(.+)“$/, "task “$1”"], [/^Risiko „(.+)“$/, "risk “$1”"], [/^Meilenstein „(.+)“$/, "milestone “$1”"],
  [/^Stelle „(.+)“$/, "position “$1”"], [/^Budgetposten „(.+)“$/, "budget item “$1”"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "Delete “$1”? The file will be removed permanently."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "Daily limit reached: at most $1 AI status reports per organisation in 24 hours."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "Couldn't open the checkout page: $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "You're the last admin in: $1. Please make someone else an admin there under “Team” first."],
  [/^Plan \((.+)\)$/, "Plan ($1)"], [/^Ist \((.+)\)$/, "Actual ($1)"],
];

/* ------------------------------ Französisch ------------------------------ */
const I18N_FR = {
  "Stand":"État au", 
  "Dashboard":"Tableau de bord", "Meine Aufgaben":"Mes tâches", "Aufgaben":"Tâches", "Meilensteine":"Jalons", "Zeitstrahl":"Chronologie",
  "Risiken":"Risques", "Budget":"Budget", "Personal":"RH", "Dokumente":"Documents", "Team":"Équipe", "Abo":"Abonnement", "Konto":"Compte",
  "Hotel wechseln":"Changer d'hôtel", "Abmelden":"Se déconnecter", "ORGANISATION":"ORGANISATION", "Organisation":"Organisation",
  "Statusbericht":"Rapport d'avancement", "Excel-Export":"Export Excel", "Kalender":"Calendrier", "Hotel bearbeiten":"Modifier l'hôtel",
  "Beispiel entfernen":"Supprimer l'exemple", "Beispielhotel":"Hôtel exemple", "Beispiel":"Exemple", "Zimmer":"chambres", "Zimmer · Eröffnung":"chambres · Ouverture",
  "Lädt…":"Chargement…", "Hotels werden geladen…":"Chargement des hôtels…", "Abo-Daten werden geladen…":"Chargement de l'abonnement…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Échéances et jalons ouverts pour Outlook, Google ou Apple Calendrier",

  "Nicht begonnen":"Non commencée", "In Arbeit":"En cours", "Blockiert":"Bloquée", "In Prüfung":"En vérification", "Abgeschlossen":"Terminée",
  "Kritisch":"Critique", "Hoch":"Haute", "Mittel":"Moyenne", "Niedrig":"Basse",
  "Geplant":"Planifié", "Gefährdet":"Compromis",
  "Rezeption & Empfang":"Réception", "Housekeeping":"Étages", "Food & Beverage":"Restauration (F&B)", "Technik":"Technique",
  "IT & Systeme":"IT & systèmes", "Einkauf":"Achats", "Sicherheit":"Sécurité", "Allgemein":"Général",
  "Ausstattung":"Équipement", "Bau & Instandhaltung":"Travaux & maintenance", "Dienstleister":"Prestataires", "IT & Technik":"IT & technique",
  "Marketing":"Marketing", "Personal & Schulung":"Personnel & formation", "Vorräte":"Stocks", "Sonstiges":"Divers",
  "sofort":"immédiatement", "diese Woche":"cette semaine", "diesen Monat":"ce mois-ci",
  "Admin":"Admin", "Mitglied":"Membre", "Eigentümer (nur lesen)":"Propriétaire (lecture seule)",

  "Anmelden":"Se connecter", "Registrieren":"S'inscrire", "Neues Konto erstellen":"Créer un compte", "Konto erstellen":"Créer le compte",
  "E-Mail":"E-mail", "Passwort":"Mot de passe", "Passwort vergessen?":"Mot de passe oublié ?", "Passwort vergessen":"Mot de passe oublié",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"Saisissez votre adresse e-mail — nous vous enverrons un lien de réinitialisation.",
  "Link schicken":"Envoyer le lien", "Zurück zur Anmeldung":"Retour à la connexion", "Bitte warten…":"Veuillez patienter…",
  "Neues Passwort festlegen":"Définir un nouveau mot de passe", "Passwort speichern":"Enregistrer le mot de passe", "Passwort geändert":"Mot de passe modifié",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.", "Zur Anmeldung":"Aller à la connexion",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"LOGICIEL DE PRÉ-OUVERTURE POUR HÔTELS", "Bis zum ersten Gast –":"Jusqu'au premier client –", "alles im Blick.":"tout sous contrôle.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"Tâches · Jalons · Risques · Rapport IA",
  "Login fehlgeschlagen.":"Échec de la connexion.", "Registrierung fehlgeschlagen.":"Échec de l'inscription.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"Le mot de passe doit comporter au moins 6 caractères.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"Compte créé ! Veuillez confirmer votre adresse e-mail via le lien que nous vous avons envoyé, puis connectez-vous.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"Si cette adresse e-mail est enregistrée, nous venons de vous envoyer un lien pour réinitialiser votre mot de passe. Vérifiez votre boîte de réception (et les spams).",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"Votre session a expiré – veuillez vous reconnecter.", "Bitte erneut anmelden.":"Veuillez vous reconnecter.",

  "Hotel auswählen":"Choisir un hôtel", "+ Neues Hotel":"+ Nouvel hôtel", "Neues Hotel":"Nouvel hôtel", "Name":"Nom", "Stadt":"Ville", "Land":"Pays",
  "Zimmeranzahl":"Nombre de chambres", "Eröffnungsdatum":"Date d'ouverture", "Hotel anlegen":"Créer l'hôtel", "Speichert…":"Enregistrement…", "Abbrechen":"Annuler",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"Envie d'essayer d'abord ? L'hôtel exemple montre un projet 30 jours avant l'ouverture – avec tâches, risques, budget et personnel. Il n'est pas décompté de votre forfait.",
  "Beispielhotel öffnen":"Ouvrir l'hôtel exemple", "Wird angelegt…":"Création…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"Cette organisation n'a pas encore d'hôtel. Dès que l'équipe projet en crée un, vous le verrez ici.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"Supprimer l'hôtel exemple et toutes ses données ? Vous pourrez le recréer à tout moment.",
  "Speichern":"Enregistrer", "Gespeichert.":"Enregistré.", "Speichern & weiter":"Enregistrer et continuer",

  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"PRÉPARATION · DANS LES DÉLAIS ⓘ", "IM ZEITPLAN":"DANS LES DÉLAIS",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"Part de ce qui était dû jusqu'à aujourd'hui et qui est fait – moins les risques et les écarts de personnel et de budget. 100 % signifie : entièrement dans les délais.",
  "Gesamtfortschritt:":"Avancement global :", "aller Aufgaben erledigt":"de toutes les tâches terminées", "% aller Aufgaben erledigt":"% de toutes les tâches terminées",
  "überfällig ·":"en retard ·", "hohe Risiken":"risques élevés", "Bereitschaft je Abteilung":"Préparation par service",
  "Budget überschritten:":"Budget dépassé :", "Stellen über Starttermin offen":"postes ouverts après la date de début",
  "Noch keine Posten – hier anlegen →":"Aucun poste – ajouter ici →", "Noch keine Stellen – hier anlegen →":"Aucun poste – ajouter ici →",
  "Überfällige kritische Aufgaben":"Tâches critiques en retard", "Höchste Risiken":"Risques principaux", "Keine.":"Aucune.", "· Score":"· Score",
  "Personen eingestellt ·":"personnes recrutées ·", "offen":"ouvert", "überschritten um":"dépassé de",

  "KI-Lagebericht":"Rapport IA", "Lagebericht erstellen":"Créer le rapport", "Neu erstellen":"Régénérer", "Analysiert…":"Analyse…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"L'IA analyse tâches, jalons, risques, budget et personnel et rédige une évaluation pour la direction et les propriétaires – avec feu tricolore, actions requises et prochaines étapes.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"L'IA analyse le projet. Cela prend généralement 20 à 60 secondes …",
  "Handlungsbedarf":"Actions requises", "Risikohinweise":"Points de vigilance", "Was gut läuft":"Ce qui va bien", "Nächste Schritte (7 Tage)":"Prochaines étapes (7 jours)",
  "Risikohinweise und nächste Schritte anzeigen":"Afficher les points de vigilance et les prochaines étapes", "Weniger anzeigen":"Afficher moins",
  "Im Plan":"Dans les temps", "Verzug – aufholbar":"Retard – rattrapable", "Eröffnung gefährdet":"Ouverture compromise", "Einschätzung":"Évaluation",

  "+ Aufgabe":"+ Tâche", "Aus Excel importieren":"Importer depuis Excel", "Aus Vorlage ergänzen":"Compléter depuis le modèle",
  "Aufgabe":"Tâche", "Titel":"Titre", "Abteilung":"Service", "Priorität":"Priorité", "Status":"Statut", "Fällig":"Échéance", "Fällig am":"Date d'échéance",
  "Zuständig":"Responsable", "Zuständig im Team":"Responsable (équipe)", "Extern / Sonstige":"Externe / autre", "— niemand aus dem Team —":"— personne de l'équipe —",
  "Alle Abteilungen":"Tous les services", "Alle Status":"Tous les statuts", "Alle offenen":"Toutes les ouvertes", "Nur meine":"Les miennes", "Ohne Zuständigkeit":"Sans responsable",
  "Erledigte anzeigen":"Afficher les terminées", "Sortierung":"Tri", "Nach Termin":"Par échéance", "Nach Priorität":"Par priorité", "Nach Abteilung":"Par service",
  "Filter zurücksetzen":"Réinitialiser les filtres", "Keine Aufgabe passt zu den Filtern.":"Aucune tâche ne correspond aux filtres.",
  "Suchen: Titel, Zuständige, Externe …":"Rechercher : titre, responsable, externe …", "Bearbeiten":"Modifier", "Löschen":"Supprimer", "löschen":"supprimer",
  "Kommentare und Verlauf":"Commentaires et historique", "Noch keine Kommentare.":"Aucun commentaire.", "Kommentar schreiben … (Strg+Enter zum Senden)":"Écrire un commentaire … (Ctrl+Entrée pour envoyer)",
  "Senden":"Envoyer", "Änderungsverlauf anzeigen":"Afficher l'historique", "Kommentar löschen?":"Supprimer le commentaire ?", "hat die Aufgabe angelegt":"a créé la tâche",
  "Automatisch":"Automatique", "(Eröffnung verschoben)":"(ouverture déplacée)", "Du":"Vous", "Unbekannt":"Inconnu",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"Aucune tâche ne vous est encore attribuée. Les responsabilités se définissent dans « Tâches » lors de la modification.",
  "Keine offenen Aufgaben – alles erledigt.":"Aucune tâche ouverte – tout est fait.", "Hotel":"Hôtel", "kein Termin":"sans échéance",
  "· am Eröffnungstag":"· le jour de l'ouverture", "Tage vor":"jours avant", "Tage nach":"jours après", "Eröffnung":"Ouverture",
  "Vorlage: Standard-Eröffnungsplanung":"Modèle : planification standard de l'ouverture",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"Tâches et jalons typiques de pré-ouverture pour tous les services, planifiés par rapport à la date d'ouverture. Si l'ouverture est déplacée, ces dates suivent automatiquement – jusqu'à ce que vous modifiiez une date vous-même.",
  "Wird geprüft…":"Vérification…", "Die Vorlage ist bereits vollständig angewendet.":"Le modèle est déjà entièrement appliqué.",
  "Neu angelegt werden":"Seront créés :", "Aufgaben und":"tâches et", "Meilensteine angelegt.":"jalons créés.", "Vorlage anwenden":"Appliquer le modèle",
  "sind schon vorhanden und werden übersprungen)":"existent déjà et seront ignorés)", "vergangene weggelassen.":"passés omis.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"d'entre eux seraient déjà échus. Les omettre (sinon ils sont créés en retard).",

  "Aufgaben aus Excel oder CSV importieren":"Importer des tâches depuis Excel ou CSV",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"Première feuille du fichier, une tâche par ligne. Les colonnes « Tâche », « Service », « Priorité », « Statut », « Échéance » et « Responsable » sont reconnues automatiquement – aussi en allemand et en anglais.",
  "Spalten zuordnen":"Associer les colonnes", "– nicht importieren –":"– ne pas importer –", "(Pflicht)":"(obligatoire)", "Spalte":"Colonne",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"Les priorités inconnues deviennent « Moyenne », les statuts inconnus « Non commencée », les services manquants « Général ». Les responsables sont importés en texte – vous pourrez attribuer des membres ensuite.",
  "Importiert…":"Importation…", "Schließen":"Fermer", "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"Aucune ligne n'a été trouvée sous l'en-tête du fichier.",
  "Datei konnte nicht gelesen werden:":"Impossible de lire le fichier :",

  "Meilenstein":"Jalon", "Datum":"Date", "Kritikalität":"Criticité", "Keine offenen Meilensteine.":"Aucun jalon ouvert.",
  "Heute":"Aujourd'hui", "Monate":"Mois", "nur offene Aufgaben":"tâches ouvertes uniquement", "erledigt":"terminé", "blockiert":"bloqué", "überfällig":"en retard",
  "◆ Meilenstein":"◆ Jalon", "Noch keine Aufgaben oder Meilensteine mit Termin.":"Aucune tâche ni jalon daté.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"Survolez un point pour voir la tâche. Les points plus grands sont des tâches critiques.",

  "+ Risiko":"+ Risque", "Risiko":"Risque", "Gegenmaßnahme":"Mesure", "Gegenmaßnahme (optional)":"Mesure (facultatif)", "Score":"Score",
  "Wahrscheinlichkeit:":"Probabilité :", "Auswirkung:":"Impact :", "Maßnahme:":"Mesure :", "keine festgelegt":"aucune définie", "Keine Risiken erfasst.":"Aucun risque saisi.",

  "+ Budgetposten":"+ Poste budgétaire", "Posten":"Poste", "Posten, z. B. Matratzen":"Poste, p. ex. matelas", "Plan":"Prévu", "Ist":"Réel",
  "Notiz":"Note", "Noch keine Budgetposten.":"Aucun poste budgétaire.", "Kein Budget erfasst.":"Aucun budget saisi.",
  "Ist vs. Plan je Abteilung":"Réel vs prévu par service", "NOCH VERFÜGBAR":"ENCORE DISPONIBLE", "ÜBERSCHRITTEN":"DÉPASSÉ",
  "verfügbar":"disponible", "überschritten":"dépassé", "Alle Abteilungen im Plan.":"Tous les services dans le budget.", "% vom Plan":"% du prévu", "% über Plan)":"% au-dessus du prévu)",

  "+ Stelle":"+ Poste", "Stelle":"Poste", "z. B. Rezeptionist/in":"p. ex. réceptionniste", "Benötigt":"Requis", "Besetzt":"Pourvus", "Start":"Début",
  "Personen":"personnes", "Besetzung je Abteilung":"Effectifs par service", "Noch keine Stellen angelegt.":"Aucun poste créé.", "Keine Stellen erfasst.":"Aucun poste saisi.",
  "Eine Person mehr":"Une personne de plus", "Eine Person weniger":"Une personne de moins", "Stellen mit Lücken":"postes non pourvus", "1 Stelle mit Lücken":"1 poste non pourvu",
  "Bitte eine Stellenbezeichnung eingeben.":"Veuillez saisir un intitulé de poste.", "„Benötigt“ muss mindestens 1 sein.":"« Requis » doit être d'au moins 1.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"« Pourvus » doit être entre 0 et « Requis ».", "weitere Stellen.":"postes supplémentaires.", "% besetzt":"% pourvus",

  "Dateien hochladen":"Téléverser des fichiers", "oder hierher ziehen · max. 25 MB je Datei":"ou glisser ici · max. 25 Mo par fichier", "Noch keine Dokumente.":"Aucun document.",
  "Herunterladen":"Télécharger", "Datei anhängen":"Joindre un fichier", "ANHÄNGE":"PIÈCES JOINTES", "Keine Anhänge.":"Aucune pièce jointe.", "Lädt hoch:":"Téléversement :",
  "Hochladen fehlgeschlagen":"Échec du téléversement",

  "Teammitglied einladen":"Inviter un membre", "E-Mail-Adresse":"Adresse e-mail", "Einladen":"Inviter", "Mitglieder":"Membres", "(du)":"(vous)",
  "Ausstehende Einladungen":"Invitations en attente", "Link kopieren":"Copier le lien", "Kopiert!":"Copié !", "Entfernen":"Retirer", "Teammitglied":"Membre de l'équipe",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"La personne reçoit le lien d'invitation par e-mail. Elle s'inscrit ou se connecte avec, puis rejoint automatiquement votre organisation. Si aucun e-mail n'arrive, vous pouvez aussi copier le lien ci-dessous et le transmettre vous-même.",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"voient le tableau de bord, le rapport IA et le rapport d'avancement et peuvent commenter, sans rien modifier – idéal pour propriétaires et investisseurs.",
  "Sprache der Organisation":"Langue de l'organisation", "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"S'applique à l'interface de tous les membres, aux e-mails, au modèle de pré-ouverture et au rapport IA.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"Nom de l'organisation, p. ex. Groupe hôtelier Vienne", "Umbenennen":"Renommer", "Meine Organisation":"Mon organisation",
  "Gefahrenzone":"Zone de danger", "Organisation verlassen":"Quitter l'organisation", "Organisation endgültig löschen":"Supprimer définitivement l'organisation",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"Si vous quittez l'organisation, vous perdez l'accès à tous ses hôtels.",
  "Löscht":"Supprime", "Das kann nicht rückgängig gemacht werden.":"Cette action est irréversible.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"définitivement avec tous les hôtels, tâches, commentaires, documents et rapports. Un abonnement en cours prend fin immédiatement. Exportez si besoin chaque hôtel au préalable via « Export Excel ».",
  "Zur Bestätigung den Namen der Organisation eingeben:":"Pour confirmer, saisissez le nom de l'organisation :", "Wird gelöscht…":"Suppression…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"Invitation créée, mais aucun e-mail envoyé (envoi non configuré). Copiez le lien ci-dessous et transmettez-le.",
  "Eigentümer-Ansicht:":"Vue propriétaire :", "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"Vous voyez l'état actuel, le rapport IA et le rapport d'avancement. Seuls les membres de l'équipe projet peuvent modifier.",

  "ANGEMELDET ALS":"CONNECTÉ EN TANT QUE", "Passwort ändern":"Changer le mot de passe", "Neues Passwort":"Nouveau mot de passe", "Neues Passwort wiederholen":"Répéter le nouveau mot de passe",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"Le nouveau mot de passe doit comporter au moins 8 caractères.", "Die beiden Passwörter stimmen nicht überein.":"Les deux mots de passe ne correspondent pas.",
  "Passwort geändert.":"Mot de passe modifié.", "Passwort konnte nicht geändert werden.":"Impossible de modifier le mot de passe.",
  "Konto löschen":"Supprimer le compte", "Konto endgültig löschen":"Supprimer définitivement le compte",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"Supprime votre connexion et vos adhésions. Les organisations dont vous êtes le seul membre sont supprimées avec toutes leurs données (un abonnement en cours prend fin immédiatement). Dans les organisations avec d'autres membres, les données sont conservées. Si vous y êtes le dernier admin, transmettez d'abord ce rôle dans « Équipe ».",

  "Tarif wählen":"Choisir un forfait", "Zahlungsart ändern":"Modifier le moyen de paiement", "AKTUELLER TARIF":"FORFAIT ACTUEL", "Testphase":"Essai", "Aktiv":"Actif", "Aktuell":"Actuel",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"Gérer l'abonnement (factures, paiement, résiliation)", "Öffnet…":"Ouverture…", "Öffnet Bezahlseite…":"Ouverture du paiement…",
  "Nur Admins der Organisation können das Abo ändern.":"Seuls les admins de l'organisation peuvent modifier l'abonnement.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"Le paiement en ligne est en cours de mise en place.", "Für ein Abo schreib an":"Pour un abonnement, écrivez à",
  "pro Monat zzgl. USt., monatlich kündbar":"par mois HT, résiliable chaque mois", "Bald verfügbar":"Bientôt disponible", "Über „Abo verwalten“ wechseln":"Changer via « Gérer l'abonnement »",
  "auf Anfrage":"sur demande", "Jahresvertrag":"Contrat annuel", "Mehr als 5 Hotels":"Plus de 5 hôtels", "Eigene Vorlagen je Marke":"Modèles propres par marque",
  "Onboarding und Schulung":"Onboarding et formation", "Kontakt aufnehmen":"Nous contacter", "Status aktualisieren":"Actualiser le statut",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"Le paiement est traité en toute sécurité par Stripe. Les factures sont envoyées par e-mail et disponibles sous « Gérer l'abonnement ».",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"Merci ! Le paiement a réussi. L'abonnement sera activé dans quelques secondes.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"Le paiement a été annulé. Rien n'a été facturé.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"L'essai est terminé. Ouverture est en lecture seule – toutes les données sont conservées.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"Aucun abonnement actif. Ouverture est en lecture seule – toutes les données sont conservées.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"Le dernier paiement a échoué. Veuillez mettre à jour le moyen de paiement.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"Paiement en attente – veuillez mettre à jour le moyen de paiement", "Beendet":"Terminé", "Unbezahlt":"Impayé", "Zahlung nicht abgeschlossen":"Paiement non finalisé",
  "1 Hotel-Eröffnung":"1 ouverture d'hôtel", "Unbegrenzt viele Teammitglieder":"Membres illimités", "Vorlage mit Pre-Opening-Plan":"Modèle de plan de pré-ouverture",
  "Statusbericht als PDF":"Rapport d'avancement en PDF", "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"Jusqu'à 5 ouvertures simultanées", "Alles aus Starter":"Tout Starter",
  "Für Hotelgruppen und Beratungen":"Pour groupes hôteliers et cabinets de conseil", "Bevorzugter Support":"Support prioritaire",

  "← Zurück":"← Retour", "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"Dans la boîte d'impression, choisissez « Enregistrer au format PDF ».",
  "Als PDF speichern / Drucken":"Enregistrer en PDF / Imprimer", "STATUSBERICHT PRE-OPENING":"RAPPORT D'AVANCEMENT PRÉ-OUVERTURE", "Stand:":"État au :", "Eröffnung:":"Ouverture :",
  "AUFGABEN":"TÂCHES", "MEILENSTEINE":"JALONS", "BUDGET (IST / PLAN)":"BUDGET (RÉEL / PRÉVU)", "PERSONAL":"EFFECTIFS",
  "Überfällige Aufgaben mit hoher Priorität":"Tâches prioritaires en retard", "Blockiert:":"Bloquées :", "Größte Risiken":"Risques principaux",
  "Noch keine Abteilungsdaten.":"Aucune donnée par service.", "Erstellt mit Ouverture":"Créé avec Ouverture", "KI-Lagebericht vom":"Rapport IA du",
  "im Plan":"dans les temps", "gefährdet":"compromis", "Überfällig":"En retard", "ÜBERFÄLLIG":"EN RETARD",

  "Da ist etwas schiefgelaufen":"Une erreur s'est produite",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"L'erreur a été signalée automatiquement. Vos données sont enregistrées – veuillez recharger la page.",
  "Seite neu laden":"Recharger la page",

  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Modification impossible : soit vous avez un accès en lecture seule (vue propriétaire), soit l'abonnement de cette organisation n'est pas actif (p. ex. essai terminé). Un admin peut changer le rôle dans « Équipe » ou le forfait dans « Abonnement ».",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"Votre forfait actuel ne permet pas d'ajouter un hôtel (limite atteinte ou essai terminé). Un admin peut changer le forfait dans « Abonnement ».",
  "Nur Admins der Organisation können das Abo verwalten.":"Seuls les admins de l'organisation peuvent gérer l'abonnement.",
  "Keine Aufgaben mit Titel gefunden.":"Aucune tâche avec titre trouvée.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"Il doit y avoir au moins un admin. Nommez d'abord quelqu'un d'autre admin.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"Le dernier admin ne peut pas quitter l'organisation. Nommez d'abord quelqu'un d'autre admin – ou supprimez l'organisation.",

  "Währung":"Devise", "Währung für das Budget":"Devise du budget",
  "Euro (€)":"Euro (€)", "Schweizer Franken (CHF)":"Franc suisse (CHF)", "Britisches Pfund (£)":"Livre sterling (£)", "US-Dollar ($)":"Dollar américain ($)",
  "VAE-Dirham (AED)":"Dirham des EAU (AED)", "Saudi-Riyal (SAR)":"Riyal saoudien (SAR)", "Katar-Riyal (QAR)":"Riyal qatari (QAR)",
  "Sprache":"Langue", "Wie die Organisation":"Comme l'organisation",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"Votre langue ne s'applique qu'à vous. Sans choix, Ouverture suit la langue par défaut de l'organisation.",
  "Standardsprache der Organisation":"Langue par défaut de l'organisation",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"S'applique aux e-mails, au modèle de pré-ouverture, au rapport IA et à tous les membres sans choix de langue personnel.",
  "Meine Sprache":"Ma langue",
};

const I18N_FR_PATTERNS = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "Ouverture dans $1 jours"],
  [/^Eröffnung war vor (\d+) Tagen$/, "Ouverture il y a $1 jours"],
  [/^noch (\d+) Tage$/, "encore $1 jours"],
  [/^seit (\d+) Tagen eröffnet$/, "ouvert depuis $1 jours"],
  [/^Testphase: noch 1 Tag\.$/, "Essai : encore 1 jour."],
  [/^Testphase: noch (\d+) Tage\.$/, "Essai : encore $1 jours."],
  [/^Testphase bis (.+)$/, "Essai jusqu'au $1"],
  [/^Testphase abgelaufen am (.+)$/, "Essai terminé le $1"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "Actif · prochaine facturation le $1"],
  [/^Gekündigt – läuft bis (.+)$/, "Résilié – actif jusqu'au $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$1 sur $2 hôtels utilisés"],
  [/^Personal (\d+) % besetzt$/, "Effectifs pourvus à $1 %"],
  [/^Stand (.+)$/, "État au $1"],
  [/^seit (.+)$/, "depuis le $1"],
  [/^Stand: (.+)$/, "État au : $1"],
  [/^erstellt von (.+)$/, "créé par $1"],
  [/^(\d+) Aufgaben importieren$/, "Importer $1 tâches"],
  [/^(\d+) Aufgaben importiert\.$/, "$1 tâches importées."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1 tâches importées, $2 lignes vides ignorées."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "Aperçu des premières lignes ($1 sur $2 lignes ont un titre) :"],
  [/^(.+) wählen$/, "Choisir $1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 est maintenant $2."],
  [/^(.+) wurde entfernt\.$/, "$1 a été retiré(e)."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "Invitation envoyée par e-mail à $1."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "Pour confirmer, saisissez « $1 »"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "Pour confirmer, saisissez le nom de l'organisation : $1"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 sur $2 personnes recrutées · $3 ouverts"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 ouvertes · $2 en retard"],
  [/^(\d+) gefährdet$/, "$1 compromis"],
  [/^(.+) ausgegeben$/, "$1 dépensés"],
  [/^Um (.+) überschritten$/, "Dépassé de $1"],
  [/^… und (\d+) weitere\.$/, "… et $1 de plus."],
  [/^… und (\d+) weitere Stellen\.$/, "… et $1 postes de plus."],
  [/^(\d+) überfällig$/, "$1 en retard"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "Prévu $1 · Réel $2 · disponible $3"],
  [/^Plan \((.+)\)$/, "Prévu ($1)"], [/^Ist \((.+)\)$/, "Réel ($1)"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "« $1 » dépasse 25 Mo."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "Retirer $1 de l'organisation ? La personne perd immédiatement l'accès ; ses tâches sont conservées mais sans responsable."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "Vraiment quitter « $1 » ? Vous perdez l'accès jusqu'à ce qu'un admin vous réinvite."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "Vraiment supprimer $1 ? Cette action est irréversible."],
  [/^Aufgabe „(.+)“$/, "la tâche « $1 »"], [/^Risiko „(.+)“$/, "le risque « $1 »"], [/^Meilenstein „(.+)“$/, "le jalon « $1 »"],
  [/^Stelle „(.+)“$/, "le poste « $1 »"], [/^Budgetposten „(.+)“$/, "le poste budgétaire « $1 »"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "Supprimer « $1 » ? Le fichier sera définitivement supprimé."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "Limite quotidienne atteinte : au maximum $1 rapports IA par organisation en 24 heures."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "Impossible d'ouvrir la page de paiement : $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "Vous êtes le dernier admin dans : $1. Nommez d'abord quelqu'un d'autre admin dans « Équipe »."],
];

/* ------------------------------ Italienisch ------------------------------ */
const I18N_IT = {
  "Stand":"Aggiornato al", 
  "Dashboard":"Dashboard", "Meine Aufgaben":"Le mie attività", "Aufgaben":"Attività", "Meilensteine":"Milestone", "Zeitstrahl":"Cronologia",
  "Risiken":"Rischi", "Budget":"Budget", "Personal":"Personale", "Dokumente":"Documenti", "Team":"Team", "Abo":"Abbonamento", "Konto":"Account",
  "Hotel wechseln":"Cambia hotel", "Abmelden":"Esci", "ORGANISATION":"ORGANIZZAZIONE", "Organisation":"Organizzazione",
  "Statusbericht":"Report di avanzamento", "Excel-Export":"Esporta Excel", "Kalender":"Calendario", "Hotel bearbeiten":"Modifica hotel",
  "Beispiel entfernen":"Rimuovi esempio", "Beispielhotel":"Hotel di esempio", "Beispiel":"Esempio", "Zimmer":"camere", "Zimmer · Eröffnung":"camere · Apertura",
  "Lädt…":"Caricamento…", "Hotels werden geladen…":"Caricamento hotel…", "Abo-Daten werden geladen…":"Caricamento abbonamento…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Scadenze e milestone aperte per Outlook, Google o Apple Calendar",

  "Nicht begonnen":"Non iniziata", "In Arbeit":"In corso", "Blockiert":"Bloccata", "In Prüfung":"In verifica", "Abgeschlossen":"Completata",
  "Kritisch":"Critica", "Hoch":"Alta", "Mittel":"Media", "Niedrig":"Bassa",
  "Geplant":"Pianificata", "Gefährdet":"A rischio",
  "Rezeption & Empfang":"Ricevimento", "Housekeeping":"Housekeeping", "Food & Beverage":"Food & Beverage", "Technik":"Manutenzione",
  "IT & Systeme":"IT & sistemi", "Einkauf":"Acquisti", "Sicherheit":"Sicurezza", "Allgemein":"Generale",
  "Ausstattung":"Arredi e attrezzature", "Bau & Instandhaltung":"Lavori e manutenzione", "Dienstleister":"Fornitori di servizi", "IT & Technik":"IT e tecnologia",
  "Marketing":"Marketing", "Personal & Schulung":"Personale e formazione", "Vorräte":"Scorte", "Sonstiges":"Altro",
  "sofort":"subito", "diese Woche":"questa settimana", "diesen Monat":"questo mese",
  "Admin":"Admin", "Mitglied":"Membro", "Eigentümer (nur lesen)":"Proprietario (sola lettura)",

  "Anmelden":"Accedi", "Registrieren":"Registrati", "Neues Konto erstellen":"Crea un nuovo account", "Konto erstellen":"Crea account",
  "E-Mail":"E-mail", "Passwort":"Password", "Passwort vergessen?":"Password dimenticata?", "Passwort vergessen":"Password dimenticata",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"Inserisci il tuo indirizzo e-mail — ti invieremo un link per reimpostarla.",
  "Link schicken":"Invia link", "Zurück zur Anmeldung":"Torna all'accesso", "Bitte warten…":"Attendere…",
  "Neues Passwort festlegen":"Imposta una nuova password", "Passwort speichern":"Salva password", "Passwort geändert":"Password modificata",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"Ora puoi accedere con la nuova password.", "Zur Anmeldung":"Vai all'accesso",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"SOFTWARE DI PRE-OPENING PER HOTEL", "Bis zum ersten Gast –":"Fino al primo ospite –", "alles im Blick.":"tutto sotto controllo.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"Attività · Milestone · Rischi · Report IA",
  "Login fehlgeschlagen.":"Accesso non riuscito.", "Registrierung fehlgeschlagen.":"Registrazione non riuscita.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"La password deve avere almeno 6 caratteri.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"Account creato! Conferma il tuo indirizzo e-mail tramite il link che ti abbiamo inviato, poi accedi.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"Se questo indirizzo e-mail è registrato, ti abbiamo appena inviato un link per reimpostare la password. Controlla la posta in arrivo (anche lo spam).",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"La sessione è scaduta – accedi di nuovo.", "Bitte erneut anmelden.":"Accedi di nuovo.",

  "Hotel auswählen":"Seleziona hotel", "+ Neues Hotel":"+ Nuovo hotel", "Neues Hotel":"Nuovo hotel", "Name":"Nome", "Stadt":"Città", "Land":"Paese",
  "Zimmeranzahl":"Numero di camere", "Eröffnungsdatum":"Data di apertura", "Hotel anlegen":"Crea hotel", "Speichert…":"Salvataggio…", "Abbrechen":"Annulla",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"Vuoi prima provare? L'hotel di esempio mostra un progetto a 30 giorni dall'apertura – con attività, rischi, budget e personale. Non conta nel tuo piano.",
  "Beispielhotel öffnen":"Apri l'hotel di esempio", "Wird angelegt…":"Creazione…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"In questa organizzazione non c'è ancora un hotel. Appena il team di progetto ne crea uno, lo vedrai qui.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"Eliminare l'hotel di esempio con tutti i dati? Potrai ricrearlo in qualsiasi momento.",
  "Speichern":"Salva", "Gespeichert.":"Salvato.", "Speichern & weiter":"Salva e continua",

  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"PRONTEZZA · NEI TEMPI ⓘ", "IM ZEITPLAN":"NEI TEMPI",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"Quanto di ciò che scadeva entro oggi è completato – meno rischi e carenze di personale e budget. 100% significa: perfettamente nei tempi.",
  "Gesamtfortschritt:":"Avanzamento complessivo:", "aller Aufgaben erledigt":"di tutte le attività completate", "% aller Aufgaben erledigt":"% di tutte le attività completate",
  "überfällig ·":"in ritardo ·", "hohe Risiken":"rischi elevati", "Bereitschaft je Abteilung":"Prontezza per reparto",
  "Budget überschritten:":"Budget superato:", "Stellen über Starttermin offen":"posizioni scoperte oltre la data di inizio",
  "Noch keine Posten – hier anlegen →":"Nessuna voce – aggiungi qui →", "Noch keine Stellen – hier anlegen →":"Nessuna posizione – aggiungi qui →",
  "Überfällige kritische Aufgaben":"Attività critiche in ritardo", "Höchste Risiken":"Rischi principali", "Keine.":"Nessuna.", "· Score":"· Punteggio",
  "Personen eingestellt ·":"persone assunte ·", "offen":"aperte", "überschritten um":"superato di",

  "KI-Lagebericht":"Report IA", "Lagebericht erstellen":"Crea report", "Neu erstellen":"Rigenera", "Analysiert…":"Analisi…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"L'IA analizza attività, milestone, rischi, budget e personale e redige una valutazione per direzione e proprietà – con semaforo, azioni necessarie e prossimi passi.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"L'IA sta analizzando il progetto. Di solito servono 20–60 secondi …",
  "Handlungsbedarf":"Azioni necessarie", "Risikohinweise":"Segnalazioni di rischio", "Was gut läuft":"Cosa funziona bene", "Nächste Schritte (7 Tage)":"Prossimi passi (7 giorni)",
  "Risikohinweise und nächste Schritte anzeigen":"Mostra rischi e prossimi passi", "Weniger anzeigen":"Mostra meno",
  "Im Plan":"In linea", "Verzug – aufholbar":"Ritardo – recuperabile", "Eröffnung gefährdet":"Apertura a rischio", "Einschätzung":"Valutazione",

  "+ Aufgabe":"+ Attività", "Aus Excel importieren":"Importa da Excel", "Aus Vorlage ergänzen":"Aggiungi dal modello",
  "Aufgabe":"Attività", "Titel":"Titolo", "Abteilung":"Reparto", "Priorität":"Priorità", "Status":"Stato", "Fällig":"Scadenza", "Fällig am":"Data di scadenza",
  "Zuständig":"Responsabile", "Zuständig im Team":"Responsabile (team)", "Extern / Sonstige":"Esterno / altro", "— niemand aus dem Team —":"— nessuno del team —",
  "Alle Abteilungen":"Tutti i reparti", "Alle Status":"Tutti gli stati", "Alle offenen":"Tutte le aperte", "Nur meine":"Solo le mie", "Ohne Zuständigkeit":"Senza responsabile",
  "Erledigte anzeigen":"Mostra completate", "Sortierung":"Ordinamento", "Nach Termin":"Per scadenza", "Nach Priorität":"Per priorità", "Nach Abteilung":"Per reparto",
  "Filter zurücksetzen":"Azzera filtri", "Keine Aufgabe passt zu den Filtern.":"Nessuna attività corrisponde ai filtri.",
  "Suchen: Titel, Zuständige, Externe …":"Cerca: titolo, responsabile, esterni …", "Bearbeiten":"Modifica", "Löschen":"Elimina", "löschen":"elimina",
  "Kommentare und Verlauf":"Commenti e cronologia", "Noch keine Kommentare.":"Nessun commento.", "Kommentar schreiben … (Strg+Enter zum Senden)":"Scrivi un commento … (Ctrl+Invio per inviare)",
  "Senden":"Invia", "Änderungsverlauf anzeigen":"Mostra cronologia modifiche", "Kommentar löschen?":"Eliminare il commento?", "hat die Aufgabe angelegt":"ha creato l'attività",
  "Automatisch":"Automatico", "(Eröffnung verschoben)":"(apertura spostata)", "Du":"Tu", "Unbekannt":"Sconosciuto",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"Non ti è ancora stata assegnata alcuna attività. Le responsabilità si impostano in «Attività» durante la modifica.",
  "Keine offenen Aufgaben – alles erledigt.":"Nessuna attività aperta – tutto completato.", "Hotel":"Hotel", "kein Termin":"senza scadenza",
  "· am Eröffnungstag":"· il giorno dell'apertura", "Tage vor":"giorni prima", "Tage nach":"giorni dopo", "Eröffnung":"Apertura",
  "Vorlage: Standard-Eröffnungsplanung":"Modello: pianificazione standard dell'apertura",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"Attività e milestone tipiche di pre-opening per tutti i reparti, pianificate rispetto alla data di apertura. Se l'apertura si sposta, queste date si spostano automaticamente – finché non modifichi tu una data.",
  "Wird geprüft…":"Verifica…", "Die Vorlage ist bereits vollständig angewendet.":"Il modello è già stato applicato completamente.",
  "Neu angelegt werden":"Verranno creati:", "Aufgaben und":"attività e", "Meilensteine angelegt.":"milestone creati.", "Vorlage anwenden":"Applica modello",
  "sind schon vorhanden und werden übersprungen)":"esistono già e verranno saltati)", "vergangene weggelassen.":"passati omessi.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"di questi scadrebbero prima di oggi. Ometterli (altrimenti vengono creati in ritardo).",

  "Aufgaben aus Excel oder CSV importieren":"Importa attività da Excel o CSV",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"Primo foglio del file, un'attività per riga. Colonne come «Attività», «Reparto», «Priorità», «Stato», «Scadenza» e «Responsabile» vengono riconosciute automaticamente – anche in tedesco e inglese.",
  "Spalten zuordnen":"Associa colonne", "– nicht importieren –":"– non importare –", "(Pflicht)":"(obbligatorio)", "Spalte":"Colonna",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"Le priorità sconosciute diventano «Media», gli stati sconosciuti «Non iniziata», i reparti mancanti «Generale». I responsabili vengono importati come testo – potrai assegnare i membri del team in seguito.",
  "Importiert…":"Importazione…", "Schließen":"Chiudi", "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"Nel file non sono state trovate righe sotto l'intestazione.",
  "Datei konnte nicht gelesen werden:":"Impossibile leggere il file:",

  "Meilenstein":"Milestone", "Datum":"Data", "Kritikalität":"Criticità", "Keine offenen Meilensteine.":"Nessuna milestone aperta.",
  "Heute":"Oggi", "Monate":"Mesi", "nur offene Aufgaben":"solo attività aperte", "erledigt":"completata", "blockiert":"bloccata", "überfällig":"in ritardo",
  "◆ Meilenstein":"◆ Milestone", "Noch keine Aufgaben oder Meilensteine mit Termin.":"Nessuna attività o milestone con data.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"Passa il mouse su un punto per vedere l'attività. I punti più grandi sono attività critiche.",

  "+ Risiko":"+ Rischio", "Risiko":"Rischio", "Gegenmaßnahme":"Contromisura", "Gegenmaßnahme (optional)":"Contromisura (facoltativa)", "Score":"Punteggio",
  "Wahrscheinlichkeit:":"Probabilità:", "Auswirkung:":"Impatto:", "Maßnahme:":"Contromisura:", "keine festgelegt":"nessuna definita", "Keine Risiken erfasst.":"Nessun rischio registrato.",

  "+ Budgetposten":"+ Voce di budget", "Posten":"Voce", "Posten, z. B. Matratzen":"Voce, ad es. materassi", "Plan":"Previsto", "Ist":"Effettivo",
  "Notiz":"Nota", "Noch keine Budgetposten.":"Nessuna voce di budget.", "Kein Budget erfasst.":"Nessun budget registrato.",
  "Ist vs. Plan je Abteilung":"Effettivo vs previsto per reparto", "NOCH VERFÜGBAR":"ANCORA DISPONIBILE", "ÜBERSCHRITTEN":"SUPERATO",
  "verfügbar":"disponibile", "überschritten":"superato", "Alle Abteilungen im Plan.":"Tutti i reparti nel budget.", "% vom Plan":"% del previsto", "% über Plan)":"% oltre il previsto)",

  "+ Stelle":"+ Posizione", "Stelle":"Posizione", "z. B. Rezeptionist/in":"ad es. receptionist", "Benötigt":"Necessari", "Besetzt":"Coperti", "Start":"Inizio",
  "Personen":"persone", "Besetzung je Abteilung":"Organico per reparto", "Noch keine Stellen angelegt.":"Nessuna posizione creata.", "Keine Stellen erfasst.":"Nessuna posizione registrata.",
  "Eine Person mehr":"Una persona in più", "Eine Person weniger":"Una persona in meno", "Stellen mit Lücken":"posizioni scoperte", "1 Stelle mit Lücken":"1 posizione scoperta",
  "Bitte eine Stellenbezeichnung eingeben.":"Inserisci il titolo della posizione.", "„Benötigt“ muss mindestens 1 sein.":"«Necessari» deve essere almeno 1.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"«Coperti» deve essere tra 0 e «Necessari».", "weitere Stellen.":"altre posizioni.", "% besetzt":"% coperto",

  "Dateien hochladen":"Carica file", "oder hierher ziehen · max. 25 MB je Datei":"o trascina qui · max. 25 MB per file", "Noch keine Dokumente.":"Nessun documento.",
  "Herunterladen":"Scarica", "Datei anhängen":"Allega file", "ANHÄNGE":"ALLEGATI", "Keine Anhänge.":"Nessun allegato.", "Lädt hoch:":"Caricamento:",
  "Hochladen fehlgeschlagen":"Caricamento non riuscito",

  "Teammitglied einladen":"Invita un membro", "E-Mail-Adresse":"Indirizzo e-mail", "Einladen":"Invita", "Mitglieder":"Membri", "(du)":"(tu)",
  "Ausstehende Einladungen":"Inviti in sospeso", "Link kopieren":"Copia link", "Kopiert!":"Copiato!", "Entfernen":"Rimuovi", "Teammitglied":"Membro del team",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"La persona riceve il link d'invito via e-mail. Si registra o accede e fa automaticamente parte della tua organizzazione. Se l'e-mail non arriva, puoi copiare il link qui sotto e inoltrarlo tu.",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"vedono dashboard, report IA e report di avanzamento e possono commentare, ma non modificare nulla – ideale per proprietari e investitori.",
  "Sprache der Organisation":"Lingua dell'organizzazione", "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"Vale per l'interfaccia di tutti i membri, le e-mail, il modello di pre-opening e il report IA.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"Nome dell'organizzazione, ad es. Gruppo alberghiero Vienna", "Umbenennen":"Rinomina", "Meine Organisation":"La mia organizzazione",
  "Gefahrenzone":"Zona pericolosa", "Organisation verlassen":"Lascia l'organizzazione", "Organisation endgültig löschen":"Elimina definitivamente l'organizzazione",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"Se lasci l'organizzazione, perdi l'accesso a tutti i suoi hotel.",
  "Löscht":"Elimina", "Das kann nicht rückgängig gemacht werden.":"L'operazione è irreversibile.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"definitivamente con tutti gli hotel, attività, commenti, documenti e report. Un abbonamento attivo termina subito. Se necessario, esporta prima ogni hotel con «Esporta Excel».",
  "Zur Bestätigung den Namen der Organisation eingeben:":"Per confermare, digita il nome dell'organizzazione:", "Wird gelöscht…":"Eliminazione…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"Invito creato, ma nessuna e-mail inviata (invio non configurato). Copia il link qui sotto e inoltralo.",
  "Eigentümer-Ansicht:":"Vista proprietario:", "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"Vedi lo stato attuale, il report IA e il report di avanzamento. Solo i membri del team di progetto possono modificare.",

  "ANGEMELDET ALS":"ACCESSO COME", "Passwort ändern":"Cambia password", "Neues Passwort":"Nuova password", "Neues Passwort wiederholen":"Ripeti nuova password",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"La nuova password deve avere almeno 8 caratteri.", "Die beiden Passwörter stimmen nicht überein.":"Le due password non coincidono.",
  "Passwort geändert.":"Password modificata.", "Passwort konnte nicht geändert werden.":"Impossibile modificare la password.",
  "Konto löschen":"Elimina account", "Konto endgültig löschen":"Elimina definitivamente l'account",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"Elimina il tuo accesso e le tue appartenenze. Le organizzazioni in cui sei l'unico membro vengono eliminate con tutti i dati (un abbonamento attivo termina subito). Nelle organizzazioni con altri membri i dati restano. Se sei l'ultimo admin, cedi prima il ruolo in «Team».",

  "Tarif wählen":"Scegli piano", "Zahlungsart ändern":"Cambia metodo di pagamento", "AKTUELLER TARIF":"PIANO ATTUALE", "Testphase":"Prova", "Aktiv":"Attivo", "Aktuell":"Attuale",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"Gestisci abbonamento (fatture, pagamento, disdetta)", "Öffnet…":"Apertura…", "Öffnet Bezahlseite…":"Apertura pagamento…",
  "Nur Admins der Organisation können das Abo ändern.":"Solo gli admin dell'organizzazione possono modificare l'abbonamento.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"Il pagamento online è in fase di configurazione.", "Für ein Abo schreib an":"Per un abbonamento scrivi a",
  "pro Monat zzgl. USt., monatlich kündbar":"al mese + IVA, disdetta mensile", "Bald verfügbar":"Presto disponibile", "Über „Abo verwalten“ wechseln":"Cambia tramite «Gestisci abbonamento»",
  "auf Anfrage":"su richiesta", "Jahresvertrag":"Contratto annuale", "Mehr als 5 Hotels":"Più di 5 hotel", "Eigene Vorlagen je Marke":"Modelli propri per brand",
  "Onboarding und Schulung":"Onboarding e formazione", "Kontakt aufnehmen":"Contattaci", "Status aktualisieren":"Aggiorna stato",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"Il pagamento è gestito in sicurezza da Stripe. Le fatture arrivano via e-mail e sono disponibili in «Gestisci abbonamento».",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"Grazie! Il pagamento è andato a buon fine. L'abbonamento verrà attivato tra pochi secondi.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"Il pagamento è stato annullato. Non è stato addebitato nulla.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"La prova è terminata. Ouverture è in sola lettura – tutti i dati restano.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"Nessun abbonamento attivo. Ouverture è in sola lettura – tutti i dati restano.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"L'ultimo pagamento non è riuscito. Aggiorna il metodo di pagamento.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"Pagamento in sospeso – aggiorna il metodo di pagamento", "Beendet":"Terminato", "Unbezahlt":"Non pagato", "Zahlung nicht abgeschlossen":"Pagamento non completato",
  "1 Hotel-Eröffnung":"1 apertura di hotel", "Unbegrenzt viele Teammitglieder":"Membri illimitati", "Vorlage mit Pre-Opening-Plan":"Modello di piano pre-opening",
  "Statusbericht als PDF":"Report di avanzamento in PDF", "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"Fino a 5 aperture contemporanee", "Alles aus Starter":"Tutto di Starter",
  "Für Hotelgruppen und Beratungen":"Per gruppi alberghieri e società di consulenza", "Bevorzugter Support":"Supporto prioritario",

  "← Zurück":"← Indietro", "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"Nella finestra di stampa scegli «Salva come PDF».",
  "Als PDF speichern / Drucken":"Salva in PDF / Stampa", "STATUSBERICHT PRE-OPENING":"REPORT DI AVANZAMENTO PRE-OPENING", "Stand:":"Aggiornato al:", "Eröffnung:":"Apertura:",
  "AUFGABEN":"ATTIVITÀ", "MEILENSTEINE":"MILESTONE", "BUDGET (IST / PLAN)":"BUDGET (EFFETTIVO / PREVISTO)", "PERSONAL":"PERSONALE",
  "Überfällige Aufgaben mit hoher Priorität":"Attività prioritarie in ritardo", "Blockiert:":"Bloccate:", "Größte Risiken":"Rischi principali",
  "Noch keine Abteilungsdaten.":"Nessun dato per reparto.", "Erstellt mit Ouverture":"Creato con Ouverture", "KI-Lagebericht vom":"Report IA del",
  "im Plan":"in linea", "gefährdet":"a rischio", "Überfällig":"In ritardo", "ÜBERFÄLLIG":"IN RITARDO",

  "Da ist etwas schiefgelaufen":"Qualcosa è andato storto",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"L'errore è stato segnalato automaticamente. I tuoi dati sono salvati – ricarica la pagina.",
  "Seite neu laden":"Ricarica la pagina",

  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Modifica non possibile: hai solo accesso in lettura (vista proprietario) oppure l'abbonamento di questa organizzazione non è attivo (ad es. prova terminata). Un admin può cambiare il ruolo in «Team» o il piano in «Abbonamento».",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"Con il piano attuale non puoi creare un altro hotel (limite raggiunto o prova terminata). Un admin può cambiare il piano in «Abbonamento».",
  "Nur Admins der Organisation können das Abo verwalten.":"Solo gli admin dell'organizzazione possono gestire l'abbonamento.",
  "Keine Aufgaben mit Titel gefunden.":"Nessuna attività con titolo trovata.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"Deve esserci almeno un admin. Nomina prima un'altra persona admin.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"L'ultimo admin non può lasciare l'organizzazione. Nomina prima un'altra persona admin – oppure elimina l'organizzazione.",

  "Währung":"Valuta", "Währung für das Budget":"Valuta del budget",
  "Euro (€)":"Euro (€)", "Schweizer Franken (CHF)":"Franco svizzero (CHF)", "Britisches Pfund (£)":"Sterlina britannica (£)", "US-Dollar ($)":"Dollaro USA ($)",
  "VAE-Dirham (AED)":"Dirham degli EAU (AED)", "Saudi-Riyal (SAR)":"Riyal saudita (SAR)", "Katar-Riyal (QAR)":"Riyal del Qatar (QAR)",
  "Sprache":"Lingua", "Wie die Organisation":"Come l'organizzazione",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"La tua lingua vale solo per te. Senza scelta, Ouverture segue la lingua predefinita dell'organizzazione.",
  "Standardsprache der Organisation":"Lingua predefinita dell'organizzazione",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"Vale per e-mail, modello di pre-opening, report IA e per tutti i membri senza una propria scelta di lingua.",
  "Meine Sprache":"La mia lingua",
};

const I18N_IT_PATTERNS = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "Mancano $1 giorni all'apertura"],
  [/^Eröffnung war vor (\d+) Tagen$/, "Apertura $1 giorni fa"],
  [/^noch (\d+) Tage$/, "ancora $1 giorni"],
  [/^seit (\d+) Tagen eröffnet$/, "aperto da $1 giorni"],
  [/^Testphase: noch 1 Tag\.$/, "Prova: ancora 1 giorno."],
  [/^Testphase: noch (\d+) Tage\.$/, "Prova: ancora $1 giorni."],
  [/^Testphase bis (.+)$/, "Prova fino al $1"],
  [/^Testphase abgelaufen am (.+)$/, "Prova terminata il $1"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "Attivo · prossimo addebito il $1"],
  [/^Gekündigt – läuft bis (.+)$/, "Disdetto – attivo fino al $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$1 di $2 hotel utilizzati"],
  [/^Personal (\d+) % besetzt$/, "Personale coperto al $1%"],
  [/^Stand (.+)$/, "Aggiornato al $1"],
  [/^seit (.+)$/, "dal $1"],
  [/^Stand: (.+)$/, "Aggiornato al: $1"],
  [/^erstellt von (.+)$/, "creato da $1"],
  [/^(\d+) Aufgaben importieren$/, "Importa $1 attività"],
  [/^(\d+) Aufgaben importiert\.$/, "$1 attività importate."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1 attività importate, $2 righe vuote saltate."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "Anteprima delle prime righe ($1 di $2 righe hanno un titolo):"],
  [/^(.+) wählen$/, "Scegli $1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 ora è $2."],
  [/^(.+) wurde entfernt\.$/, "$1 è stato rimosso."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "Invito inviato via e-mail a $1."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "Per confermare digita «$1»"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "Per confermare, digita il nome dell'organizzazione: $1"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 di $2 persone assunte · $3 scoperte"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 aperte · $2 in ritardo"],
  [/^(\d+) gefährdet$/, "$1 a rischio"],
  [/^(.+) ausgegeben$/, "$1 spesi"],
  [/^Um (.+) überschritten$/, "Superato di $1"],
  [/^… und (\d+) weitere\.$/, "… e altre $1."],
  [/^… und (\d+) weitere Stellen\.$/, "… e altre $1 posizioni."],
  [/^(\d+) überfällig$/, "$1 in ritardo"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "Previsto $1 · Effettivo $2 · disponibile $3"],
  [/^Plan \((.+)\)$/, "Previsto ($1)"], [/^Ist \((.+)\)$/, "Effettivo ($1)"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "«$1» supera 25 MB."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "Rimuovere $1 dall'organizzazione? La persona perde subito l'accesso; le sue attività restano ma senza responsabile."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "Vuoi davvero lasciare «$1»? Perdi l'accesso finché un admin non ti invita di nuovo."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "Eliminare davvero $1? L'operazione è irreversibile."],
  [/^Aufgabe „(.+)“$/, "l'attività «$1»"], [/^Risiko „(.+)“$/, "il rischio «$1»"], [/^Meilenstein „(.+)“$/, "la milestone «$1»"],
  [/^Stelle „(.+)“$/, "la posizione «$1»"], [/^Budgetposten „(.+)“$/, "la voce di budget «$1»"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "Eliminare «$1»? Il file verrà rimosso definitivamente."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "Limite giornaliero raggiunto: al massimo $1 report IA per organizzazione in 24 ore."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "Impossibile aprire la pagina di pagamento: $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "Sei l'ultimo admin in: $1. Nomina prima un'altra persona admin in «Team»."],
];

/* ------------------------------ Spanisch ------------------------------ */
const I18N_ES = {
  "Stand":"A fecha de", 
  "Dashboard":"Panel", "Meine Aufgaben":"Mis tareas", "Aufgaben":"Tareas", "Meilensteine":"Hitos", "Zeitstrahl":"Cronograma",
  "Risiken":"Riesgos", "Budget":"Presupuesto", "Personal":"RR. HH.", "Dokumente":"Documentos", "Team":"Equipo", "Abo":"Suscripción", "Konto":"Cuenta",
  "Hotel wechseln":"Cambiar de hotel", "Abmelden":"Cerrar sesión", "ORGANISATION":"ORGANIZACIÓN", "Organisation":"Organización",
  "Statusbericht":"Informe de estado", "Excel-Export":"Exportar a Excel", "Kalender":"Calendario", "Hotel bearbeiten":"Editar hotel",
  "Beispiel entfernen":"Eliminar ejemplo", "Beispielhotel":"Hotel de ejemplo", "Beispiel":"Ejemplo", "Zimmer":"habitaciones", "Zimmer · Eröffnung":"habitaciones · Apertura",
  "Lädt…":"Cargando…", "Hotels werden geladen…":"Cargando hoteles…", "Abo-Daten werden geladen…":"Cargando suscripción…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Plazos e hitos abiertos para Outlook, Google o Apple Calendar",

  "Nicht begonnen":"Sin empezar", "In Arbeit":"En curso", "Blockiert":"Bloqueada", "In Prüfung":"En revisión", "Abgeschlossen":"Completada",
  "Kritisch":"Crítica", "Hoch":"Alta", "Mittel":"Media", "Niedrig":"Baja",
  "Geplant":"Planificado", "Gefährdet":"En riesgo",
  "Rezeption & Empfang":"Recepción", "Housekeeping":"Pisos", "Food & Beverage":"Alimentos y bebidas", "Technik":"Mantenimiento",
  "IT & Systeme":"IT y sistemas", "Einkauf":"Compras", "Sicherheit":"Seguridad", "Allgemein":"General",
  "Ausstattung":"Equipamiento", "Bau & Instandhaltung":"Obras y mantenimiento", "Dienstleister":"Proveedores de servicios", "IT & Technik":"IT y tecnología",
  "Marketing":"Marketing", "Personal & Schulung":"Personal y formación", "Vorräte":"Existencias", "Sonstiges":"Otros",
  "sofort":"de inmediato", "diese Woche":"esta semana", "diesen Monat":"este mes",
  "Admin":"Admin", "Mitglied":"Miembro", "Eigentümer (nur lesen)":"Propietario (solo lectura)",

  "Anmelden":"Iniciar sesión", "Registrieren":"Registrarse", "Neues Konto erstellen":"Crear cuenta nueva", "Konto erstellen":"Crear cuenta",
  "E-Mail":"Correo", "Passwort":"Contraseña", "Passwort vergessen?":"¿Olvidaste la contraseña?", "Passwort vergessen":"Contraseña olvidada",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"Introduce tu correo — te enviaremos un enlace para restablecerla.",
  "Link schicken":"Enviar enlace", "Zurück zur Anmeldung":"Volver al inicio de sesión", "Bitte warten…":"Espera…",
  "Neues Passwort festlegen":"Establecer nueva contraseña", "Passwort speichern":"Guardar contraseña", "Passwort geändert":"Contraseña cambiada",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"Ya puedes iniciar sesión con tu nueva contraseña.", "Zur Anmeldung":"Ir al inicio de sesión",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"SOFTWARE DE PRE-APERTURA PARA HOTELES", "Bis zum ersten Gast –":"Hasta el primer huésped –", "alles im Blick.":"todo bajo control.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"Tareas · Hitos · Riesgos · Informe IA",
  "Login fehlgeschlagen.":"Error al iniciar sesión.", "Registrierung fehlgeschlagen.":"Error en el registro.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"La contraseña debe tener al menos 6 caracteres.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"¡Cuenta creada! Confirma tu correo con el enlace que te hemos enviado y después inicia sesión.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"Si este correo está registrado, te acabamos de enviar un enlace para restablecer la contraseña. Revisa tu bandeja de entrada (y el spam).",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"Tu sesión ha caducado – inicia sesión de nuevo.", "Bitte erneut anmelden.":"Inicia sesión de nuevo.",

  "Hotel auswählen":"Seleccionar hotel", "+ Neues Hotel":"+ Nuevo hotel", "Neues Hotel":"Nuevo hotel", "Name":"Nombre", "Stadt":"Ciudad", "Land":"País",
  "Zimmeranzahl":"Número de habitaciones", "Eröffnungsdatum":"Fecha de apertura", "Hotel anlegen":"Crear hotel", "Speichert…":"Guardando…", "Abbrechen":"Cancelar",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"¿Quieres probar primero? El hotel de ejemplo muestra un proyecto a 30 días de la apertura, con tareas, riesgos, presupuesto y personal. No cuenta para tu plan.",
  "Beispielhotel öffnen":"Abrir hotel de ejemplo", "Wird angelegt…":"Creando…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"Esta organización aún no tiene hotel. En cuanto el equipo del proyecto cree uno, lo verás aquí.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"¿Eliminar el hotel de ejemplo con todos sus datos? Puedes volver a crearlo cuando quieras.",
  "Speichern":"Guardar", "Gespeichert.":"Guardado.", "Speichern & weiter":"Guardar y continuar",

  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"PREPARACIÓN · EN PLAZO ⓘ", "IM ZEITPLAN":"EN PLAZO",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"Cuánto de lo que vencía hasta hoy está hecho, menos riesgos y faltas de personal y presupuesto. 100 % significa: totalmente en plazo.",
  "Gesamtfortschritt:":"Progreso total:", "aller Aufgaben erledigt":"de todas las tareas hechas", "% aller Aufgaben erledigt":"% de todas las tareas hechas",
  "überfällig ·":"atrasadas ·", "hohe Risiken":"riesgos altos", "Bereitschaft je Abteilung":"Preparación por departamento",
  "Budget überschritten:":"Presupuesto superado:", "Stellen über Starttermin offen":"puestos vacantes tras la fecha de inicio",
  "Noch keine Posten – hier anlegen →":"Aún no hay partidas – añadir aquí →", "Noch keine Stellen – hier anlegen →":"Aún no hay puestos – añadir aquí →",
  "Überfällige kritische Aufgaben":"Tareas críticas atrasadas", "Höchste Risiken":"Riesgos principales", "Keine.":"Ninguna.", "· Score":"· Puntuación",
  "Personen eingestellt ·":"personas contratadas ·", "offen":"abiertas", "überschritten um":"superado en",

  "KI-Lagebericht":"Informe IA", "Lagebericht erstellen":"Crear informe", "Neu erstellen":"Regenerar", "Analysiert…":"Analizando…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"La IA analiza tareas, hitos, riesgos, presupuesto y personal y redacta una valoración para dirección y propiedad, con semáforo, acciones necesarias y próximos pasos.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"La IA está analizando el proyecto. Suele tardar entre 20 y 60 segundos …",
  "Handlungsbedarf":"Acciones necesarias", "Risikohinweise":"Alertas de riesgo", "Was gut läuft":"Lo que va bien", "Nächste Schritte (7 Tage)":"Próximos pasos (7 días)",
  "Risikohinweise und nächste Schritte anzeigen":"Mostrar alertas y próximos pasos", "Weniger anzeigen":"Mostrar menos",
  "Im Plan":"En plazo", "Verzug – aufholbar":"Retraso – recuperable", "Eröffnung gefährdet":"Apertura en riesgo", "Einschätzung":"Valoración",

  "+ Aufgabe":"+ Tarea", "Aus Excel importieren":"Importar desde Excel", "Aus Vorlage ergänzen":"Completar desde plantilla",
  "Aufgabe":"Tarea", "Titel":"Título", "Abteilung":"Departamento", "Priorität":"Prioridad", "Status":"Estado", "Fällig":"Vence", "Fällig am":"Fecha límite",
  "Zuständig":"Responsable", "Zuständig im Team":"Responsable (equipo)", "Extern / Sonstige":"Externo / otro", "— niemand aus dem Team —":"— nadie del equipo —",
  "Alle Abteilungen":"Todos los departamentos", "Alle Status":"Todos los estados", "Alle offenen":"Todas las abiertas", "Nur meine":"Solo las mías", "Ohne Zuständigkeit":"Sin responsable",
  "Erledigte anzeigen":"Mostrar completadas", "Sortierung":"Orden", "Nach Termin":"Por fecha", "Nach Priorität":"Por prioridad", "Nach Abteilung":"Por departamento",
  "Filter zurücksetzen":"Restablecer filtros", "Keine Aufgabe passt zu den Filtern.":"Ninguna tarea coincide con los filtros.",
  "Suchen: Titel, Zuständige, Externe …":"Buscar: título, responsable, externos …", "Bearbeiten":"Editar", "Löschen":"Eliminar", "löschen":"eliminar",
  "Kommentare und Verlauf":"Comentarios e historial", "Noch keine Kommentare.":"Aún no hay comentarios.", "Kommentar schreiben … (Strg+Enter zum Senden)":"Escribe un comentario … (Ctrl+Intro para enviar)",
  "Senden":"Enviar", "Änderungsverlauf anzeigen":"Mostrar historial de cambios", "Kommentar löschen?":"¿Eliminar comentario?", "hat die Aufgabe angelegt":"creó la tarea",
  "Automatisch":"Automático", "(Eröffnung verschoben)":"(apertura aplazada)", "Du":"Tú", "Unbekannt":"Desconocido",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"Aún no tienes tareas asignadas. Los responsables se asignan en «Tareas» al editar.",
  "Keine offenen Aufgaben – alles erledigt.":"No hay tareas abiertas – todo hecho.", "Hotel":"Hotel", "kein Termin":"sin fecha",
  "· am Eröffnungstag":"· el día de la apertura", "Tage vor":"días antes", "Tage nach":"días después", "Eröffnung":"Apertura",
  "Vorlage: Standard-Eröffnungsplanung":"Plantilla: planificación estándar de apertura",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"Tareas e hitos típicos de pre-apertura para todos los departamentos, programados según la fecha de apertura. Si la apertura se mueve, estas fechas se mueven automáticamente – hasta que cambies una fecha tú mismo.",
  "Wird geprüft…":"Comprobando…", "Die Vorlage ist bereits vollständig angewendet.":"La plantilla ya está aplicada por completo.",
  "Neu angelegt werden":"Se crearán:", "Aufgaben und":"tareas y", "Meilensteine angelegt.":"hitos creados.", "Vorlage anwenden":"Aplicar plantilla",
  "sind schon vorhanden und werden übersprungen)":"ya existen y se omitirán)", "vergangene weggelassen.":"pasadas omitidas.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"de ellas vencerían antes de hoy. Omitirlas (si no, se crean como atrasadas).",

  "Aufgaben aus Excel oder CSV importieren":"Importar tareas desde Excel o CSV",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"Primera hoja del archivo, una tarea por fila. Las columnas «Tarea», «Departamento», «Prioridad», «Estado», «Vence» y «Responsable» se reconocen automáticamente – también en alemán e inglés.",
  "Spalten zuordnen":"Asignar columnas", "– nicht importieren –":"– no importar –", "(Pflicht)":"(obligatorio)", "Spalte":"Columna",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"Las prioridades desconocidas pasan a «Media», los estados desconocidos a «Sin empezar» y los departamentos que faltan a «General». Los responsables se importan como texto – después puedes asignar miembros del equipo.",
  "Importiert…":"Importando…", "Schließen":"Cerrar", "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"No se encontraron filas bajo el encabezado del archivo.",
  "Datei konnte nicht gelesen werden:":"No se pudo leer el archivo:",

  "Meilenstein":"Hito", "Datum":"Fecha", "Kritikalität":"Criticidad", "Keine offenen Meilensteine.":"No hay hitos abiertos.",
  "Heute":"Hoy", "Monate":"Meses", "nur offene Aufgaben":"solo tareas abiertas", "erledigt":"hecha", "blockiert":"bloqueada", "überfällig":"atrasada",
  "◆ Meilenstein":"◆ Hito", "Noch keine Aufgaben oder Meilensteine mit Termin.":"Aún no hay tareas ni hitos con fecha.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"Pasa el ratón sobre un punto para ver la tarea. Los puntos más grandes son tareas críticas.",

  "+ Risiko":"+ Riesgo", "Risiko":"Riesgo", "Gegenmaßnahme":"Medida", "Gegenmaßnahme (optional)":"Medida (opcional)", "Score":"Puntuación",
  "Wahrscheinlichkeit:":"Probabilidad:", "Auswirkung:":"Impacto:", "Maßnahme:":"Medida:", "keine festgelegt":"ninguna definida", "Keine Risiken erfasst.":"No hay riesgos registrados.",

  "+ Budgetposten":"+ Partida", "Posten":"Partida", "Posten, z. B. Matratzen":"Partida, p. ej. colchones", "Plan":"Previsto", "Ist":"Real",
  "Notiz":"Nota", "Noch keine Budgetposten.":"Aún no hay partidas.", "Kein Budget erfasst.":"No hay presupuesto registrado.",
  "Ist vs. Plan je Abteilung":"Real vs previsto por departamento", "NOCH VERFÜGBAR":"AÚN DISPONIBLE", "ÜBERSCHRITTEN":"SUPERADO",
  "verfügbar":"disponible", "überschritten":"superado", "Alle Abteilungen im Plan.":"Todos los departamentos dentro del presupuesto.", "% vom Plan":"% de lo previsto", "% über Plan)":"% por encima de lo previsto)",

  "+ Stelle":"+ Puesto", "Stelle":"Puesto", "z. B. Rezeptionist/in":"p. ej. recepcionista", "Benötigt":"Necesarios", "Besetzt":"Cubiertos", "Start":"Inicio",
  "Personen":"personas", "Besetzung je Abteilung":"Plantilla por departamento", "Noch keine Stellen angelegt.":"Aún no hay puestos.", "Keine Stellen erfasst.":"No hay puestos registrados.",
  "Eine Person mehr":"Una persona más", "Eine Person weniger":"Una persona menos", "Stellen mit Lücken":"puestos sin cubrir", "1 Stelle mit Lücken":"1 puesto sin cubrir",
  "Bitte eine Stellenbezeichnung eingeben.":"Introduce el nombre del puesto.", "„Benötigt“ muss mindestens 1 sein.":"«Necesarios» debe ser al menos 1.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"«Cubiertos» debe estar entre 0 y «Necesarios».", "weitere Stellen.":"puestos más.", "% besetzt":"% cubierto",

  "Dateien hochladen":"Subir archivos", "oder hierher ziehen · max. 25 MB je Datei":"o arrastrar aquí · máx. 25 MB por archivo", "Noch keine Dokumente.":"Aún no hay documentos.",
  "Herunterladen":"Descargar", "Datei anhängen":"Adjuntar archivo", "ANHÄNGE":"ADJUNTOS", "Keine Anhänge.":"Sin adjuntos.", "Lädt hoch:":"Subiendo:",
  "Hochladen fehlgeschlagen":"Error al subir",

  "Teammitglied einladen":"Invitar a un miembro", "E-Mail-Adresse":"Correo electrónico", "Einladen":"Invitar", "Mitglieder":"Miembros", "(du)":"(tú)",
  "Ausstehende Einladungen":"Invitaciones pendientes", "Link kopieren":"Copiar enlace", "Kopiert!":"¡Copiado!", "Entfernen":"Quitar", "Teammitglied":"Miembro del equipo",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"La persona recibe el enlace de invitación por correo. Se registra o inicia sesión con él y pasa a formar parte de tu organización. Si no llega el correo, puedes copiar el enlace de abajo y enviárselo tú.",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"ven el panel, el informe IA y el informe de estado y pueden comentar, pero no cambiar nada – ideal para propietarios e inversores.",
  "Sprache der Organisation":"Idioma de la organización", "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"Se aplica a la interfaz de todos los miembros, los correos, la plantilla de pre-apertura y el informe IA.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"Nombre de la organización, p. ej. Grupo hotelero Viena", "Umbenennen":"Renombrar", "Meine Organisation":"Mi organización",
  "Gefahrenzone":"Zona de peligro", "Organisation verlassen":"Abandonar la organización", "Organisation endgültig löschen":"Eliminar la organización definitivamente",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"Si abandonas la organización, pierdes el acceso a todos sus hoteles.",
  "Löscht":"Elimina", "Das kann nicht rückgängig gemacht werden.":"No se puede deshacer.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"definitivamente con todos los hoteles, tareas, comentarios, documentos e informes. Una suscripción activa termina de inmediato. Si lo necesitas, exporta antes cada hotel con «Exportar a Excel».",
  "Zur Bestätigung den Namen der Organisation eingeben:":"Para confirmar, escribe el nombre de la organización:", "Wird gelöscht…":"Eliminando…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"Invitación creada, pero no se envió ningún correo (envío no configurado). Copia el enlace de abajo y compártelo.",
  "Eigentümer-Ansicht:":"Vista de propietario:", "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"Ves el estado actual, el informe IA y el informe de estado. Solo los miembros del equipo del proyecto pueden hacer cambios.",

  "ANGEMELDET ALS":"SESIÓN INICIADA COMO", "Passwort ändern":"Cambiar contraseña", "Neues Passwort":"Nueva contraseña", "Neues Passwort wiederholen":"Repetir nueva contraseña",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"La nueva contraseña debe tener al menos 8 caracteres.", "Die beiden Passwörter stimmen nicht überein.":"Las dos contraseñas no coinciden.",
  "Passwort geändert.":"Contraseña cambiada.", "Passwort konnte nicht geändert werden.":"No se pudo cambiar la contraseña.",
  "Konto löschen":"Eliminar cuenta", "Konto endgültig löschen":"Eliminar la cuenta definitivamente",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"Elimina tu acceso y tus membresías. Las organizaciones en las que eres el único miembro se eliminan con todos sus datos (una suscripción activa termina de inmediato). En organizaciones con otros miembros, los datos se conservan. Si eres el último admin, cede antes el rol en «Equipo».",

  "Tarif wählen":"Elegir plan", "Zahlungsart ändern":"Cambiar método de pago", "AKTUELLER TARIF":"PLAN ACTUAL", "Testphase":"Prueba", "Aktiv":"Activo", "Aktuell":"Actual",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"Gestionar suscripción (facturas, pago, cancelación)", "Öffnet…":"Abriendo…", "Öffnet Bezahlseite…":"Abriendo pago…",
  "Nur Admins der Organisation können das Abo ändern.":"Solo los admins de la organización pueden cambiar la suscripción.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"El pago online se está configurando.", "Für ein Abo schreib an":"Para una suscripción, escribe a",
  "pro Monat zzgl. USt., monatlich kündbar":"al mes + IVA, cancelable mensualmente", "Bald verfügbar":"Próximamente", "Über „Abo verwalten“ wechseln":"Cambiar en «Gestionar suscripción»",
  "auf Anfrage":"bajo consulta", "Jahresvertrag":"Contrato anual", "Mehr als 5 Hotels":"Más de 5 hoteles", "Eigene Vorlagen je Marke":"Plantillas propias por marca",
  "Onboarding und Schulung":"Onboarding y formación", "Kontakt aufnehmen":"Contactar", "Status aktualisieren":"Actualizar estado",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"El pago se procesa de forma segura con Stripe. Las facturas llegan por correo y están disponibles en «Gestionar suscripción».",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"¡Gracias! El pago se ha realizado. La suscripción se activará en unos segundos.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"El pago se canceló. No se ha cobrado nada.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"La prueba ha terminado. Ouverture está en modo solo lectura – se conservan todos los datos.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"No hay suscripción activa. Ouverture está en modo solo lectura – se conservan todos los datos.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"El último pago falló. Actualiza el método de pago.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"Pago pendiente – actualiza el método de pago", "Beendet":"Finalizada", "Unbezahlt":"Impagada", "Zahlung nicht abgeschlossen":"Pago no completado",
  "1 Hotel-Eröffnung":"1 apertura de hotel", "Unbegrenzt viele Teammitglieder":"Miembros ilimitados", "Vorlage mit Pre-Opening-Plan":"Plantilla de plan de pre-apertura",
  "Statusbericht als PDF":"Informe de estado en PDF", "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"Hasta 5 aperturas a la vez", "Alles aus Starter":"Todo lo de Starter",
  "Für Hotelgruppen und Beratungen":"Para grupos hoteleros y consultoras", "Bevorzugter Support":"Soporte prioritario",

  "← Zurück":"← Volver", "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"En el diálogo de impresión elige «Guardar como PDF».",
  "Als PDF speichern / Drucken":"Guardar en PDF / Imprimir", "STATUSBERICHT PRE-OPENING":"INFORME DE ESTADO PRE-APERTURA", "Stand:":"A fecha de:", "Eröffnung:":"Apertura:",
  "AUFGABEN":"TAREAS", "MEILENSTEINE":"HITOS", "BUDGET (IST / PLAN)":"PRESUPUESTO (REAL / PREVISTO)", "PERSONAL":"PLANTILLA",
  "Überfällige Aufgaben mit hoher Priorität":"Tareas prioritarias atrasadas", "Blockiert:":"Bloqueadas:", "Größte Risiken":"Riesgos principales",
  "Noch keine Abteilungsdaten.":"Aún no hay datos por departamento.", "Erstellt mit Ouverture":"Creado con Ouverture", "KI-Lagebericht vom":"Informe IA del",
  "im Plan":"en plazo", "gefährdet":"en riesgo", "Überfällig":"Atrasadas", "ÜBERFÄLLIG":"ATRASADAS",

  "Da ist etwas schiefgelaufen":"Algo ha salido mal",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"El error se ha notificado automáticamente. Tus datos están guardados – recarga la página.",
  "Seite neu laden":"Recargar página",

  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"No se puede cambiar: o tienes acceso de solo lectura (vista de propietario) o la suscripción de esta organización no está activa (p. ej. prueba terminada). Un admin puede cambiar el rol en «Equipo» o el plan en «Suscripción».",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"Tu plan actual no permite crear otro hotel (límite alcanzado o prueba terminada). Un admin puede cambiar el plan en «Suscripción».",
  "Nur Admins der Organisation können das Abo verwalten.":"Solo los admins de la organización pueden gestionar la suscripción.",
  "Keine Aufgaben mit Titel gefunden.":"No se encontraron tareas con título.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"Debe haber al menos un admin. Nombra antes admin a otra persona.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"El último admin no puede abandonar la organización. Nombra antes admin a otra persona – o elimina la organización.",

  "Währung":"Moneda", "Währung für das Budget":"Moneda del presupuesto",
  "Euro (€)":"Euro (€)", "Schweizer Franken (CHF)":"Franco suizo (CHF)", "Britisches Pfund (£)":"Libra esterlina (£)", "US-Dollar ($)":"Dólar estadounidense ($)",
  "VAE-Dirham (AED)":"Dírham de los EAU (AED)", "Saudi-Riyal (SAR)":"Riyal saudí (SAR)", "Katar-Riyal (QAR)":"Riyal catarí (QAR)",
  "Sprache":"Idioma", "Wie die Organisation":"Como la organización",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"Tu idioma solo se aplica a ti. Sin elección, Ouverture sigue el idioma predeterminado de la organización.",
  "Standardsprache der Organisation":"Idioma predeterminado de la organización",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"Se aplica a los correos, la plantilla de pre-apertura, el informe IA y a todos los miembros sin idioma propio.",
  "Meine Sprache":"Mi idioma",
};

const I18N_ES_PATTERNS = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "Faltan $1 días para la apertura"],
  [/^Eröffnung war vor (\d+) Tagen$/, "La apertura fue hace $1 días"],
  [/^noch (\d+) Tage$/, "faltan $1 días"],
  [/^seit (\d+) Tagen eröffnet$/, "abierto desde hace $1 días"],
  [/^Testphase: noch 1 Tag\.$/, "Prueba: queda 1 día."],
  [/^Testphase: noch (\d+) Tage\.$/, "Prueba: quedan $1 días."],
  [/^Testphase bis (.+)$/, "Prueba hasta el $1"],
  [/^Testphase abgelaufen am (.+)$/, "La prueba terminó el $1"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "Activo · próximo cobro el $1"],
  [/^Gekündigt – läuft bis (.+)$/, "Cancelada – activa hasta el $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$1 de $2 hoteles en uso"],
  [/^Personal (\d+) % besetzt$/, "Plantilla cubierta al $1 %"],
  [/^Stand (.+)$/, "A fecha de $1"],
  [/^seit (.+)$/, "desde el $1"],
  [/^Stand: (.+)$/, "A fecha de: $1"],
  [/^erstellt von (.+)$/, "creado por $1"],
  [/^(\d+) Aufgaben importieren$/, "Importar $1 tareas"],
  [/^(\d+) Aufgaben importiert\.$/, "$1 tareas importadas."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1 tareas importadas, $2 filas vacías omitidas."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "Vista previa de las primeras filas ($1 de $2 filas tienen título):"],
  [/^(.+) wählen$/, "Elegir $1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 ahora es $2."],
  [/^(.+) wurde entfernt\.$/, "Se ha quitado a $1."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "Invitación enviada por correo a $1."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "Para confirmar, escribe «$1»"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "Para confirmar, escribe el nombre de la organización: $1"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 de $2 personas contratadas · $3 vacantes"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 abiertas · $2 atrasadas"],
  [/^(\d+) gefährdet$/, "$1 en riesgo"],
  [/^(.+) ausgegeben$/, "$1 gastados"],
  [/^Um (.+) überschritten$/, "Superado en $1"],
  [/^… und (\d+) weitere\.$/, "… y $1 más."],
  [/^… und (\d+) weitere Stellen\.$/, "… y $1 puestos más."],
  [/^(\d+) überfällig$/, "$1 atrasadas"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "Previsto $1 · Real $2 · disponible $3"],
  [/^Plan \((.+)\)$/, "Previsto ($1)"], [/^Ist \((.+)\)$/, "Real ($1)"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "«$1» supera los 25 MB."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "¿Quitar a $1 de la organización? Pierde el acceso de inmediato; sus tareas se conservan, pero sin responsable."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "¿Seguro que quieres abandonar «$1»? Perderás el acceso hasta que un admin vuelva a invitarte."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "¿Seguro que quieres eliminar $1? No se puede deshacer."],
  [/^Aufgabe „(.+)“$/, "la tarea «$1»"], [/^Risiko „(.+)“$/, "el riesgo «$1»"], [/^Meilenstein „(.+)“$/, "el hito «$1»"],
  [/^Stelle „(.+)“$/, "el puesto «$1»"], [/^Budgetposten „(.+)“$/, "la partida «$1»"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "¿Eliminar «$1»? El archivo se borrará definitivamente."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "Límite diario alcanzado: como máximo $1 informes IA por organización en 24 horas."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "No se pudo abrir la página de pago: $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "Eres el último admin en: $1. Nombra antes admin a otra persona en «Equipo»."],
];

const I18N = { en: I18N_EN, fr: I18N_FR, it: I18N_IT, es: I18N_ES };
const I18N_PATTERNS = { en: I18N_EN_PATTERNS, fr: I18N_FR_PATTERNS, it: I18N_IT_PATTERNS, es: I18N_ES_PATTERNS };


/* ======================= Rollen, Dienstplan, weitere Sprachen ======================= */
// Neue Texte (Abteilungsrechte, Dienstplan) für die bisherigen Sprachen
Object.assign(I18N.en, {
  "Ablehnen":"Reject",
  "Abteilungen":"Departments",
  "Abteilungsleitung":"Head of department",
  "Antrag abgelehnt.":"Request rejected.",
  "Antrag genehmigt.":"Request approved.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"Request submitted. The head of department will decide on it.",
  "Antrag stellen":"Submit request",
  "Antrag zurückgezogen.":"Request withdrawn.",
  "Anträge zur Entscheidung":"Requests awaiting decision",
  "Antwort:":"Reply:",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"Copy last week's work shifts into this week? Days that are already planned stay unchanged.",
  "Beginn":"Start",
  "Begründung für die Ablehnung (optional)":"Reason for rejection (optional)",
  "Besetzung":"Coverage",
  "Bis":"To",
  "Deine Ansicht:":"Your view:",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"The head of department decides; talk to each other directly if you have questions.",
  "Dienstplan":"Rota",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"You haven't been assigned to a department yet. An admin can change this under “Team” – then you'll see your department's rota here.",
  "Drucken":"Print",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"You have no upcoming shifts in this hotel that you could swap.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"You see the tasks of your departments and all tasks assigned to you. Budget, risks and staffing are visible to the head of department.",
  "Ende":"End",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"Export failed:",
  "Frei":"Off",
  "Frei-Wunsch":"Day-off request",
  "Früh":"Early",
  "Genehmigen":"Approve",
  "Genehmigt":"Approved",
  "Abgelehnt":"Rejected",
  "Zurückgezogen":"Withdrawn",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"No shifts are planned for you in the next eight weeks.",
  "Keine Abteilung":"No department",
  "Krank":"Sick",
  "KW":"Wk",
  "Meine Anträge":"My requests",
  "Meine Schicht":"My shift",
  "Meine Schichten":"My shifts",
  "Mindestbesetzung":"Minimum staffing",
  "Mitarbeitende":"Staff",
  "Nacht":"Night",
  "Name ohne Login (z. B. Aushilfe)":"Name without login (e.g. temp)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"Nobody in this department yet. Assign staff under “Team” or enter a name below.",
  "Nächste Woche":"Next week",
  "Vorige Woche":"Previous week",
  "Bitte wählen":"Please choose",
  "Offen":"Open",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"Without a department, this person only sees tasks assigned directly to them.",
  "Schicht bearbeiten":"Edit shift",
  "Schicht eintragen":"Add shift",
  "Schichten, die du übernehmen sollst":"Shifts you are asked to take over",
  "Schichttausch":"Shift swap",
  "Spät":"Late",
  "Tausch":"Swap",
  "Unterbesetzt:":"Understaffed:",
  "Urlaub":"Holiday",
  "Von":"From",
  "Vorwoche übernehmen":"Copy last week",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"How many people does this department need per shift? If people are missing, the rota warns you.",
  "Zeile hinzufügen":"Add row",
  "Zurückziehen":"Withdraw",
  "Zwischen":"Mid",
  "ohne Login":"no login",
  "Übernimmt":"Takes over",
  "Übernommene Schichten:":"Shifts copied:",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"see only the tasks of their departments and their own, their rota, and can request holiday, days off and shift swaps.",
  "sieht und verwaltet alles, auch Abo und Team.":"sees and manages everything, including subscription and team.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"sees and fully manages their departments – tasks, budget, risks, staffing and rota – and approves requests.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Change not possible: either you lack the rights (e.g. owner view or a different department), or this organisation's subscription isn't active (e.g. trial ended). An admin can change roles and departments under “Team” or the plan under “Subscription”.",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"The AI status report is created by admins and heads of department.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"Request not possible: it must concern your own department or your own shift, and the person taking over must be on the team.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"Only the head of department or admins can decide on requests.",
  "Dieser Antrag wurde bereits bearbeitet.":"This request has already been processed.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"Only your own open requests can be withdrawn.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"Please choose a person or enter a name.",
  "Diese Schicht kannst du nicht löschen.":"You can't delete this shift.",
  "Quell- und Zielwoche sind gleich.":"Source and target week are the same.",
  "Nur Admins können Abteilungen zuordnen.":"Only admins can assign departments.",
});
Object.assign(I18N.fr, {
  "Ablehnen":"Refuser",
  "Abteilungen":"Services",
  "Abteilungsleitung":"Chef de service",
  "Antrag abgelehnt.":"Demande refusée.",
  "Antrag genehmigt.":"Demande approuvée.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"Demande envoyée. Le chef de service va la traiter.",
  "Antrag stellen":"Envoyer la demande",
  "Antrag zurückgezogen.":"Demande retirée.",
  "Anträge zur Entscheidung":"Demandes à traiter",
  "Antwort:":"Réponse :",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"Reprendre les postes de travail de la semaine précédente dans cette semaine ? Les jours déjà planifiés restent inchangés.",
  "Beginn":"Début",
  "Begründung für die Ablehnung (optional)":"Motif du refus (facultatif)",
  "Besetzung":"Effectif",
  "Bis":"Au",
  "Deine Ansicht:":"Ta vue :",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"Le chef de service décide ; en cas de question, parlez-en directement.",
  "Dienstplan":"Planning",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"Aucun service ne t'a encore été attribué. Un admin peut le faire sous « Équipe » – tu verras alors ici le planning de ton service.",
  "Drucken":"Imprimer",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"Tu n'as aucun poste à venir dans cet hôtel que tu pourrais échanger.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"Tu vois les tâches de tes services et toutes celles qui te sont attribuées. Le budget, les risques et le personnel sont visibles par le chef de service.",
  "Ende":"Fin",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"Échec de l'export :",
  "Frei":"Repos",
  "Frei-Wunsch":"Souhait de repos",
  "Früh":"Matin",
  "Genehmigen":"Approuver",
  "Genehmigt":"Approuvée",
  "Abgelehnt":"Refusée",
  "Zurückgezogen":"Retirée",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"Aucun poste n'est prévu pour toi dans les huit prochaines semaines.",
  "Keine Abteilung":"Aucun service",
  "Krank":"Malade",
  "KW":"Sem.",
  "Meine Anträge":"Mes demandes",
  "Meine Schicht":"Mon poste",
  "Meine Schichten":"Mes postes",
  "Mindestbesetzung":"Effectif minimum",
  "Mitarbeitende":"Collaborateurs",
  "Nacht":"Nuit",
  "Name ohne Login (z. B. Aushilfe)":"Nom sans compte (p. ex. extra)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"Personne dans ce service pour l'instant. Attribue des collaborateurs sous « Équipe » ou saisis un nom ci-dessous.",
  "Nächste Woche":"Semaine suivante",
  "Vorige Woche":"Semaine précédente",
  "Bitte wählen":"Veuillez choisir",
  "Offen":"Ouverte",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"Sans service, cette personne ne voit que les tâches qui lui sont directement attribuées.",
  "Schicht bearbeiten":"Modifier le poste",
  "Schicht eintragen":"Ajouter un poste",
  "Schichten, die du übernehmen sollst":"Postes que l'on te demande de reprendre",
  "Schichttausch":"Échange de poste",
  "Spät":"Soir",
  "Tausch":"Échange",
  "Unterbesetzt:":"Sous-effectif :",
  "Urlaub":"Congés",
  "Von":"Du",
  "Vorwoche übernehmen":"Reprendre la semaine précédente",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"Combien de personnes ce service doit-il avoir par poste ? S'il en manque, le planning t'avertit.",
  "Zeile hinzufügen":"Ajouter une ligne",
  "Zurückziehen":"Retirer",
  "Zwischen":"Coupure",
  "ohne Login":"sans compte",
  "Übernimmt":"Reprend",
  "Übernommene Schichten:":"Postes repris :",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"ne voient que les tâches de leurs services et les leurs, leur planning, et peuvent demander des congés, des jours de repos et des échanges de poste.",
  "sieht und verwaltet alles, auch Abo und Team.":"voit et gère tout, y compris l'abonnement et l'équipe.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"voit et gère entièrement ses services – tâches, budget, risques, personnel et planning – et approuve les demandes.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Modification impossible : soit tu n'as pas les droits nécessaires (p. ex. accès propriétaire ou autre service), soit l'abonnement de cette organisation n'est pas actif (p. ex. essai terminé). Un admin peut modifier rôles et services sous « Équipe » ou la formule sous « Abonnement ».",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"Le rapport de situation IA est créé par les admins et les chefs de service.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"Demande impossible : elle doit concerner ton propre service ou ton propre poste, et la personne qui reprend doit faire partie de l'équipe.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"Seuls le chef de service ou les admins peuvent traiter les demandes.",
  "Dieser Antrag wurde bereits bearbeitet.":"Cette demande a déjà été traitée.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"Seules tes propres demandes encore ouvertes peuvent être retirées.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"Choisis une personne ou saisis un nom.",
  "Diese Schicht kannst du nicht löschen.":"Tu ne peux pas supprimer ce poste.",
  "Quell- und Zielwoche sind gleich.":"La semaine source et la semaine cible sont identiques.",
  "Nur Admins können Abteilungen zuordnen.":"Seuls les admins peuvent attribuer des services.",
});
Object.assign(I18N.it, {
  "Ablehnen":"Rifiuta",
  "Abteilungen":"Reparti",
  "Abteilungsleitung":"Capo reparto",
  "Antrag abgelehnt.":"Richiesta rifiutata.",
  "Antrag genehmigt.":"Richiesta approvata.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"Richiesta inviata. Decide il capo reparto.",
  "Antrag stellen":"Invia richiesta",
  "Antrag zurückgezogen.":"Richiesta ritirata.",
  "Anträge zur Entscheidung":"Richieste da decidere",
  "Antwort:":"Risposta:",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"Copiare i turni di lavoro della settimana precedente in questa settimana? I giorni già pianificati restano invariati.",
  "Beginn":"Inizio",
  "Begründung für die Ablehnung (optional)":"Motivo del rifiuto (facoltativo)",
  "Besetzung":"Copertura",
  "Bis":"Al",
  "Deine Ansicht:":"La tua vista:",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"Decide il capo reparto; per domande parlatene direttamente.",
  "Dienstplan":"Turni",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"Non ti è ancora stato assegnato un reparto. Un admin può farlo in «Team» – poi qui vedrai i turni del tuo reparto.",
  "Drucken":"Stampa",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"Non hai turni futuri in questo hotel da poter scambiare.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"Vedi le attività dei tuoi reparti e tutte quelle assegnate a te. Budget, rischi e personale li vede il capo reparto.",
  "Ende":"Fine",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"Esportazione non riuscita:",
  "Frei":"Riposo",
  "Frei-Wunsch":"Richiesta di riposo",
  "Früh":"Mattina",
  "Genehmigen":"Approva",
  "Genehmigt":"Approvata",
  "Abgelehnt":"Rifiutata",
  "Zurückgezogen":"Ritirata",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"Nelle prossime otto settimane non hai turni pianificati.",
  "Keine Abteilung":"Nessun reparto",
  "Krank":"Malattia",
  "KW":"Sett.",
  "Meine Anträge":"Le mie richieste",
  "Meine Schicht":"Il mio turno",
  "Meine Schichten":"I miei turni",
  "Mindestbesetzung":"Copertura minima",
  "Mitarbeitende":"Collaboratori",
  "Nacht":"Notte",
  "Name ohne Login (z. B. Aushilfe)":"Nome senza accesso (es. extra)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"Ancora nessuno in questo reparto. Assegna collaboratori in «Team» o inserisci un nome qui sotto.",
  "Nächste Woche":"Settimana successiva",
  "Vorige Woche":"Settimana precedente",
  "Bitte wählen":"Seleziona",
  "Offen":"Aperta",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"Senza reparto questa persona vede solo le attività assegnate direttamente a lei.",
  "Schicht bearbeiten":"Modifica turno",
  "Schicht eintragen":"Aggiungi turno",
  "Schichten, die du übernehmen sollst":"Turni che ti chiedono di coprire",
  "Schichttausch":"Cambio turno",
  "Spät":"Pomeriggio",
  "Tausch":"Cambio",
  "Unterbesetzt:":"Sotto organico:",
  "Urlaub":"Ferie",
  "Von":"Dal",
  "Vorwoche übernehmen":"Copia settimana precedente",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"Di quante persone ha bisogno questo reparto per turno? Se ne mancano, il piano ti avvisa.",
  "Zeile hinzufügen":"Aggiungi riga",
  "Zurückziehen":"Ritira",
  "Zwischen":"Spezzato",
  "ohne Login":"senza accesso",
  "Übernimmt":"Copre",
  "Übernommene Schichten:":"Turni copiati:",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"vedono solo le attività dei loro reparti e le proprie, i loro turni, e possono richiedere ferie, giorni di riposo e cambi turno.",
  "sieht und verwaltet alles, auch Abo und Team.":"vede e gestisce tutto, anche abbonamento e team.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"vede e gestisce completamente i propri reparti – attività, budget, rischi, personale e turni – e approva le richieste.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Modifica non possibile: o non hai i permessi necessari (es. accesso proprietario o un altro reparto), oppure l'abbonamento di questa organizzazione non è attivo (es. prova scaduta). Un admin può cambiare ruoli e reparti in «Team» o il piano in «Abbonamento».",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"Il rapporto IA lo creano gli admin e i capi reparto.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"Richiesta non possibile: deve riguardare il tuo reparto o un tuo turno, e la persona che subentra deve far parte del team.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"Solo il capo reparto o gli admin possono decidere sulle richieste.",
  "Dieser Antrag wurde bereits bearbeitet.":"Questa richiesta è già stata gestita.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"Si possono ritirare solo le proprie richieste ancora aperte.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"Scegli una persona o inserisci un nome.",
  "Diese Schicht kannst du nicht löschen.":"Non puoi eliminare questo turno.",
  "Quell- und Zielwoche sind gleich.":"Settimana di origine e di destinazione coincidono.",
  "Nur Admins können Abteilungen zuordnen.":"Solo gli admin possono assegnare i reparti.",
});
Object.assign(I18N.es, {
  "Ablehnen":"Rechazar",
  "Abteilungen":"Departamentos",
  "Abteilungsleitung":"Jefe de departamento",
  "Antrag abgelehnt.":"Solicitud rechazada.",
  "Antrag genehmigt.":"Solicitud aprobada.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"Solicitud enviada. Decide el jefe de departamento.",
  "Antrag stellen":"Enviar solicitud",
  "Antrag zurückgezogen.":"Solicitud retirada.",
  "Anträge zur Entscheidung":"Solicitudes pendientes de decisión",
  "Antwort:":"Respuesta:",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"¿Copiar los turnos de trabajo de la semana anterior a esta semana? Los días ya planificados no cambian.",
  "Beginn":"Inicio",
  "Begründung für die Ablehnung (optional)":"Motivo del rechazo (opcional)",
  "Besetzung":"Cobertura",
  "Bis":"Hasta",
  "Deine Ansicht:":"Tu vista:",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"Decide el jefe de departamento; si tenéis dudas, habladlo directamente.",
  "Dienstplan":"Turnos",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"Todavía no tienes ningún departamento asignado. Un admin puede cambiarlo en «Equipo»; entonces verás aquí los turnos de tu departamento.",
  "Drucken":"Imprimir",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"No tienes turnos próximos en este hotel que puedas cambiar.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"Ves las tareas de tus departamentos y todas las que tienes asignadas. El presupuesto, los riesgos y el personal los ve el jefe de departamento.",
  "Ende":"Fin",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"Error al exportar:",
  "Frei":"Libre",
  "Frei-Wunsch":"Petición de día libre",
  "Früh":"Mañana",
  "Genehmigen":"Aprobar",
  "Genehmigt":"Aprobada",
  "Abgelehnt":"Rechazada",
  "Zurückgezogen":"Retirada",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"No tienes turnos planificados en las próximas ocho semanas.",
  "Keine Abteilung":"Sin departamento",
  "Krank":"Baja",
  "KW":"Sem.",
  "Meine Anträge":"Mis solicitudes",
  "Meine Schicht":"Mi turno",
  "Meine Schichten":"Mis turnos",
  "Mindestbesetzung":"Cobertura mínima",
  "Mitarbeitende":"Empleados",
  "Nacht":"Noche",
  "Name ohne Login (z. B. Aushilfe)":"Nombre sin acceso (p. ej. extra)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"Todavía no hay nadie en este departamento. Asigna empleados en «Equipo» o escribe un nombre abajo.",
  "Nächste Woche":"Semana siguiente",
  "Vorige Woche":"Semana anterior",
  "Bitte wählen":"Elegir",
  "Offen":"Abierta",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"Sin departamento, esta persona solo ve las tareas que tiene asignadas directamente.",
  "Schicht bearbeiten":"Editar turno",
  "Schicht eintragen":"Añadir turno",
  "Schichten, die du übernehmen sollst":"Turnos que te piden cubrir",
  "Schichttausch":"Cambio de turno",
  "Spät":"Tarde",
  "Tausch":"Cambio",
  "Unterbesetzt:":"Falta personal:",
  "Urlaub":"Vacaciones",
  "Von":"Desde",
  "Vorwoche übernehmen":"Copiar semana anterior",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"¿Cuántas personas necesita este departamento por turno? Si faltan, el plan te avisa.",
  "Zeile hinzufügen":"Añadir fila",
  "Zurückziehen":"Retirar",
  "Zwischen":"Partido",
  "ohne Login":"sin acceso",
  "Übernimmt":"Cubre",
  "Übernommene Schichten:":"Turnos copiados:",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"solo ven las tareas de sus departamentos y las suyas, sus turnos, y pueden solicitar vacaciones, días libres y cambios de turno.",
  "sieht und verwaltet alles, auch Abo und Team.":"ve y gestiona todo, también la suscripción y el equipo.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"ve y gestiona por completo sus departamentos – tareas, presupuesto, riesgos, personal y turnos – y aprueba solicitudes.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"No se puede cambiar: o no tienes los permisos (p. ej. acceso de propietario u otro departamento), o la suscripción de esta organización no está activa (p. ej. prueba finalizada). Un admin puede cambiar roles y departamentos en «Equipo» o el plan en «Suscripción».",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"El informe de situación IA lo crean los admins y los jefes de departamento.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"Solicitud no posible: debe referirse a tu propio departamento o a tu propio turno, y la persona que lo cubre debe pertenecer al equipo.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"Solo el jefe de departamento o los admins pueden decidir sobre las solicitudes.",
  "Dieser Antrag wurde bereits bearbeitet.":"Esta solicitud ya ha sido tramitada.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"Solo puedes retirar tus propias solicitudes abiertas.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"Elige una persona o escribe un nombre.",
  "Diese Schicht kannst du nicht löschen.":"No puedes eliminar este turno.",
  "Quell- und Zielwoche sind gleich.":"La semana de origen y la de destino son la misma.",
  "Nur Admins können Abteilungen zuordnen.":"Solo los admins pueden asignar departamentos.",
});

/* ------------------------------ Portugiesisch ------------------------------ */
I18N.pt = {
  "Dashboard":"Painel",
  "Meine Aufgaben":"As minhas tarefas",
  "Aufgaben":"Tarefas",
  "Meilensteine":"Marcos",
  "Zeitstrahl":"Cronologia",
  "Risiken":"Riscos",
  "Budget":"Orçamento",
  "Personal":"Pessoal",
  "Dokumente":"Documentos",
  "Team":"Equipa",
  "Abo":"Subscrição",
  "Konto":"Conta",
  "Hotel wechseln":"Mudar de hotel",
  "Abmelden":"Terminar sessão",
  "ORGANISATION":"ORGANIZAÇÃO",
  "Organisation":"Organização",
  "Statusbericht":"Relatório de estado",
  "Excel-Export":"Exportar Excel",
  "Kalender":"Calendário",
  "Hotel bearbeiten":"Editar hotel",
  "Beispiel entfernen":"Remover exemplo",
  "Beispielhotel":"Hotel de exemplo",
  "Beispiel":"Exemplo",
  "Zimmer":"quartos",
  "Zimmer · Eröffnung":"quartos · Abertura",
  "Lädt…":"A carregar…",
  "Hotels werden geladen…":"A carregar hotéis…",
  "Abo-Daten werden geladen…":"A carregar subscrição…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Prazos e marcos em aberto para Outlook, Google ou Apple Calendar",
  "Nicht begonnen":"Não iniciada",
  "In Arbeit":"Em curso",
  "Blockiert":"Bloqueada",
  "In Prüfung":"Em revisão",
  "Abgeschlossen":"Concluída",
  "Kritisch":"Crítica",
  "Hoch":"Alta",
  "Mittel":"Média",
  "Niedrig":"Baixa",
  "Geplant":"Planeado",
  "Gefährdet":"Em risco",
  "Rezeption & Empfang":"Receção",
  "Housekeeping":"Housekeeping",
  "Food & Beverage":"Food & Beverage",
  "Technik":"Manutenção técnica",
  "IT & Systeme":"TI & Sistemas",
  "Einkauf":"Compras",
  "Sicherheit":"Segurança",
  "Allgemein":"Geral",
  "Ausstattung":"Equipamento",
  "Bau & Instandhaltung":"Construção e manutenção",
  "Dienstleister":"Prestadores de serviços",
  "IT & Technik":"TI e tecnologia",
  "Marketing":"Marketing",
  "Personal & Schulung":"Pessoal e formação",
  "Vorräte":"Consumíveis",
  "Sonstiges":"Outros",
  "sofort":"imediatamente",
  "diese Woche":"esta semana",
  "diesen Monat":"este mês",
  "Admin":"Admin",
  "Mitglied":"Membro",
  "Eigentümer (nur lesen)":"Proprietário (só leitura)",
  "Anmelden":"Iniciar sessão",
  "Registrieren":"Registar",
  "Neues Konto erstellen":"Criar nova conta",
  "Konto erstellen":"Criar conta",
  "E-Mail":"E-mail",
  "Passwort":"Palavra-passe",
  "Passwort vergessen?":"Esqueceu-se da palavra-passe?",
  "Passwort vergessen":"Esqueci-me da palavra-passe",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"Introduz o teu e-mail — enviamos-te um link para redefinir.",
  "Link schicken":"Enviar link",
  "Zurück zur Anmeldung":"Voltar ao início de sessão",
  "Bitte warten…":"Aguarda…",
  "Neues Passwort festlegen":"Definir nova palavra-passe",
  "Passwort speichern":"Guardar palavra-passe",
  "Passwort geändert":"Palavra-passe alterada",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"Já podes iniciar sessão com a nova palavra-passe.",
  "Zur Anmeldung":"Ir para o início de sessão",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"SOFTWARE DE PRÉ-ABERTURA PARA HOTÉIS",
  "Bis zum ersten Gast –":"Até ao primeiro hóspede –",
  "alles im Blick.":"tudo sob controlo.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"Tarefas · Marcos · Riscos · Relatório IA",
  "Login fehlgeschlagen.":"Falha ao iniciar sessão.",
  "Registrierung fehlgeschlagen.":"Falha no registo.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"A palavra-passe tem de ter pelo menos 6 caracteres.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"Conta criada! Confirma o teu e-mail através do link que te enviámos e depois inicia sessão.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"Se este e-mail estiver registado, acabámos de te enviar um link para redefinir a palavra-passe. Verifica a caixa de entrada (e a pasta de spam).",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"A tua sessão expirou – inicia sessão novamente.",
  "Bitte erneut anmelden.":"Inicia sessão novamente.",
  "Hotel auswählen":"Escolher hotel",
  "+ Neues Hotel":"+ Novo hotel",
  "Neues Hotel":"Novo hotel",
  "Name":"Nome",
  "Stadt":"Cidade",
  "Land":"País",
  "Zimmeranzahl":"Número de quartos",
  "Eröffnungsdatum":"Data de abertura",
  "Hotel anlegen":"Criar hotel",
  "Speichert…":"A guardar…",
  "Abbrechen":"Cancelar",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"Queres experimentar primeiro? O hotel de exemplo mostra um projeto 30 dias antes da abertura – com tarefas, riscos, orçamento e pessoal. Não conta para o teu plano.",
  "Beispielhotel öffnen":"Abrir hotel de exemplo",
  "Wird angelegt…":"A criar…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"Ainda não há nenhum hotel nesta organização. Assim que a equipa do projeto criar um, vê-lo-ás aqui.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"Eliminar o hotel de exemplo com todos os dados de exemplo? Podes voltar a criá-lo a qualquer momento.",
  "Speichern":"Guardar",
  "Gespeichert.":"Guardado.",
  "Speichern & weiter":"Guardar e continuar",
  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"PRONTIDÃO · NO PRAZO ⓘ",
  "IM ZEITPLAN":"NO PRAZO",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"Quanto do que devia estar feito até hoje está concluído – menos riscos e lacunas de pessoal e orçamento. 100 % significa: totalmente no prazo.",
  "Gesamtfortschritt:":"Progresso total:",
  "aller Aufgaben erledigt":"de todas as tarefas concluídas",
  "% aller Aufgaben erledigt":"% de todas as tarefas concluídas",
  "überfällig ·":"em atraso ·",
  "hohe Risiken":"riscos elevados",
  "Bereitschaft je Abteilung":"Prontidão por departamento",
  "Budget überschritten:":"Orçamento ultrapassado:",
  "Stellen über Starttermin offen":"vagas em aberto após a data de início",
  "Noch keine Posten – hier anlegen →":"Ainda sem rubricas – criar aqui →",
  "Noch keine Stellen – hier anlegen →":"Ainda sem vagas – criar aqui →",
  "Überfällige kritische Aufgaben":"Tarefas críticas em atraso",
  "Höchste Risiken":"Maiores riscos",
  "Keine.":"Nenhuma.",
  "· Score":"· Pontuação",
  "Personen eingestellt ·":"pessoas contratadas ·",
  "offen":"em aberto",
  "überschritten um":"ultrapassado em",
  "KI-Lagebericht":"Relatório de situação IA",
  "Lagebericht erstellen":"Criar relatório",
  "Neu erstellen":"Criar novamente",
  "Analysiert…":"A analisar…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"A IA analisa tarefas, marcos, riscos, orçamento e pessoal e escreve uma avaliação para a direção e os proprietários – com semáforo, ações necessárias e próximos passos.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"A IA está a analisar o projeto. Normalmente demora 20–60 segundos …",
  "Handlungsbedarf":"Ações necessárias",
  "Risikohinweise":"Alertas de risco",
  "Was gut läuft":"O que está a correr bem",
  "Nächste Schritte (7 Tage)":"Próximos passos (7 dias)",
  "Risikohinweise und nächste Schritte anzeigen":"Mostrar alertas de risco e próximos passos",
  "Weniger anzeigen":"Mostrar menos",
  "Im Plan":"No plano",
  "Verzug – aufholbar":"Atraso – recuperável",
  "Eröffnung gefährdet":"Abertura em risco",
  "Einschätzung":"Avaliação",
  "+ Aufgabe":"+ Tarefa",
  "Aus Excel importieren":"Importar do Excel",
  "Aus Vorlage ergänzen":"Completar a partir do modelo",
  "Aufgabe":"Tarefa",
  "Titel":"Título",
  "Abteilung":"Departamento",
  "Priorität":"Prioridade",
  "Status":"Estado",
  "Fällig":"Prazo",
  "Fällig am":"Data limite",
  "Zuständig":"Responsável",
  "Zuständig im Team":"Responsável na equipa",
  "Extern / Sonstige":"Externo / outros",
  "— niemand aus dem Team —":"— ninguém da equipa —",
  "Alle Abteilungen":"Todos os departamentos",
  "Alle Status":"Todos os estados",
  "Alle offenen":"Todas em aberto",
  "Nur meine":"Só as minhas",
  "Ohne Zuständigkeit":"Sem responsável",
  "Erledigte anzeigen":"Mostrar concluídas",
  "Sortierung":"Ordenação",
  "Nach Termin":"Por prazo",
  "Nach Priorität":"Por prioridade",
  "Nach Abteilung":"Por departamento",
  "Filter zurücksetzen":"Repor filtros",
  "Keine Aufgabe passt zu den Filtern.":"Nenhuma tarefa corresponde aos filtros.",
  "Suchen: Titel, Zuständige, Externe …":"Pesquisar: título, responsáveis, externos …",
  "Bearbeiten":"Editar",
  "Löschen":"Eliminar",
  "löschen":"eliminar",
  "Kommentare und Verlauf":"Comentários e histórico",
  "Noch keine Kommentare.":"Ainda sem comentários.",
  "Kommentar schreiben … (Strg+Enter zum Senden)":"Escrever um comentário … (Ctrl+Enter para enviar)",
  "Senden":"Enviar",
  "Änderungsverlauf anzeigen":"Mostrar histórico de alterações",
  "Kommentar löschen?":"Eliminar comentário?",
  "hat die Aufgabe angelegt":"criou a tarefa",
  "Automatisch":"Automático",
  "(Eröffnung verschoben)":"(abertura adiada)",
  "Du":"Tu",
  "Unbekannt":"Desconhecido",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"Ainda não tens tarefas atribuídas. Defines os responsáveis em «Tarefas» ao editar.",
  "Keine offenen Aufgaben – alles erledigt.":"Sem tarefas em aberto – tudo concluído.",
  "Hotel":"Hotel",
  "kein Termin":"sem prazo",
  "· am Eröffnungstag":"· no dia da abertura",
  "Tage vor":"dias antes",
  "Tage nach":"dias depois",
  "Eröffnung":"Abertura",
  "Vorlage: Standard-Eröffnungsplanung":"Modelo: planeamento padrão de abertura",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"Tarefas e marcos típicos de pré-abertura para todos os departamentos, agendados em relação à data de abertura. Se a abertura mudar, estas datas acompanham automaticamente – até alterares uma data manualmente.",
  "Wird geprüft…":"A verificar…",
  "Die Vorlage ist bereits vollständig angewendet.":"O modelo já foi aplicado por completo.",
  "Neu angelegt werden":"Serão criados",
  "Aufgaben und":"tarefas e",
  "Meilensteine angelegt.":"marcos criados.",
  "Vorlage anwenden":"Aplicar modelo",
  "sind schon vorhanden und werden übersprungen)":"já existem e serão ignorados)",
  "vergangene weggelassen.":"passados omitidos.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"deles já teriam prazo antes de hoje. Omitir estes (caso contrário são criados como em atraso).",
  "Aufgaben aus Excel oder CSV importieren":"Importar tarefas de Excel ou CSV",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"Primeira folha do ficheiro, uma tarefa por linha. Colunas como «Tarefa», «Departamento», «Prioridade», «Estado», «Prazo» e «Responsável» são reconhecidas automaticamente – também em inglês ou alemão.",
  "Spalten zuordnen":"Associar colunas",
  "– nicht importieren –":"– não importar –",
  "(Pflicht)":"(obrigatório)",
  "Spalte":"Coluna",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"Prioridades desconhecidas passam a «Média», estados desconhecidos a «Não iniciada», departamento em falta a «Geral». Os responsáveis são importados como texto – depois podes atribuir membros da equipa.",
  "Importiert…":"A importar…",
  "Schließen":"Fechar",
  "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"Não foram encontradas linhas abaixo do cabeçalho no ficheiro.",
  "Datei konnte nicht gelesen werden:":"Não foi possível ler o ficheiro:",
  "Meilenstein":"Marco",
  "Datum":"Data",
  "Kritikalität":"Criticidade",
  "Keine offenen Meilensteine.":"Sem marcos em aberto.",
  "Heute":"Hoje",
  "Monate":"Meses",
  "nur offene Aufgaben":"só tarefas em aberto",
  "erledigt":"concluída",
  "blockiert":"bloqueada",
  "überfällig":"em atraso",
  "◆ Meilenstein":"◆ Marco",
  "Noch keine Aufgaben oder Meilensteine mit Termin.":"Ainda não há tarefas ou marcos com data.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"Passa o rato sobre um ponto para ver a tarefa. Pontos maiores são tarefas críticas.",
  "+ Risiko":"+ Risco",
  "Risiko":"Risco",
  "Gegenmaßnahme":"Medida de mitigação",
  "Gegenmaßnahme (optional)":"Medida de mitigação (opcional)",
  "Score":"Pontuação",
  "Wahrscheinlichkeit:":"Probabilidade:",
  "Auswirkung:":"Impacto:",
  "Maßnahme:":"Medida:",
  "keine festgelegt":"nenhuma definida",
  "Keine Risiken erfasst.":"Sem riscos registados.",
  "+ Budgetposten":"+ Rubrica",
  "Posten":"Rubrica",
  "Posten, z. B. Matratzen":"Rubrica, p. ex. colchões",
  "Plan":"Previsto",
  "Ist":"Real",
  "Plan (€)":"Previsto (€)",
  "Ist (€)":"Real (€)",
  "Notiz":"Nota",
  "Noch keine Budgetposten.":"Ainda sem rubricas de orçamento.",
  "Kein Budget erfasst.":"Sem orçamento registado.",
  "Ist vs. Plan je Abteilung":"Real vs. previsto por departamento",
  "NOCH VERFÜGBAR":"AINDA DISPONÍVEL",
  "ÜBERSCHRITTEN":"ULTRAPASSADO",
  "verfügbar":"disponível",
  "überschritten":"ultrapassado",
  "Alle Abteilungen im Plan.":"Todos os departamentos dentro do previsto.",
  "% vom Plan":"% do previsto",
  "% über Plan)":"% acima do previsto)",
  "+ Stelle":"+ Vaga",
  "Stelle":"Vaga",
  "z. B. Rezeptionist/in":"p. ex. rececionista",
  "Benötigt":"Necessárias",
  "Besetzt":"Preenchidas",
  "Start":"Início",
  "Personen":"pessoas",
  "Besetzung je Abteilung":"Preenchimento por departamento",
  "Noch keine Stellen angelegt.":"Ainda sem vagas criadas.",
  "Keine Stellen erfasst.":"Sem vagas registadas.",
  "Eine Person mehr":"Mais uma pessoa",
  "Eine Person weniger":"Menos uma pessoa",
  "Stellen mit Lücken":"vagas com lacunas",
  "1 Stelle mit Lücken":"1 vaga com lacunas",
  "Bitte eine Stellenbezeichnung eingeben.":"Introduz a designação da vaga.",
  "„Benötigt“ muss mindestens 1 sein.":"«Necessárias» tem de ser pelo menos 1.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"«Preenchidas» tem de estar entre 0 e «Necessárias».",
  "weitere Stellen.":"vagas adicionais.",
  "% besetzt":"% preenchido",
  "Dateien hochladen":"Carregar ficheiros",
  "oder hierher ziehen · max. 25 MB je Datei":"ou arrasta para aqui · máx. 25 MB por ficheiro",
  "Noch keine Dokumente.":"Ainda sem documentos.",
  "Herunterladen":"Descarregar",
  "Datei anhängen":"Anexar ficheiro",
  "ANHÄNGE":"ANEXOS",
  "Keine Anhänge.":"Sem anexos.",
  "Lädt hoch:":"A carregar:",
  "Hochladen fehlgeschlagen":"Falha no carregamento",
  "Teammitglied einladen":"Convidar membro da equipa",
  "E-Mail-Adresse":"Endereço de e-mail",
  "Einladen":"Convidar",
  "Mitglieder":"Membros",
  "(du)":"(tu)",
  "Ausstehende Einladungen":"Convites pendentes",
  "Link kopieren":"Copiar link",
  "Kopiert!":"Copiado!",
  "Entfernen":"Remover",
  "Teammitglied":"Membro da equipa",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"A pessoa recebe o link de convite por e-mail. Regista-se ou inicia sessão com ele e passa automaticamente a pertencer à tua organização. Se o e-mail não chegar, podes copiar o link abaixo e enviá-lo tu.",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"veem o painel, o relatório IA e o relatório de estado e podem comentar, mas não alterar nada – ideal para proprietários e investidores.",
  "Sprache der Organisation":"Idioma da organização",
  "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"Aplica-se à interface de todos os membros, aos e-mails, ao modelo de pré-abertura e ao relatório IA.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"Nome da organização, p. ex. Grupo Hoteleiro Lisboa",
  "Umbenennen":"Renomear",
  "Meine Organisation":"A minha organização",
  "Gefahrenzone":"Zona de perigo",
  "Organisation verlassen":"Sair da organização",
  "Organisation endgültig löschen":"Eliminar organização definitivamente",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"Se saíres da organização, perdes o acesso a todos os seus hotéis.",
  "Löscht":"Elimina",
  "Das kann nicht rückgängig gemacht werden.":"Esta ação não pode ser anulada.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"definitivamente com todos os hotéis, tarefas, comentários, documentos e relatórios. Uma subscrição ativa termina de imediato. Se necessário, exporta antes cada hotel com «Exportar Excel».",
  "Zur Bestätigung den Namen der Organisation eingeben:":"Para confirmar, escreve o nome da organização:",
  "Wird gelöscht…":"A eliminar…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"Convite criado, mas nenhum e-mail enviado (envio de e-mail não configurado). Copia o link abaixo e partilha-o.",
  "Eigentümer-Ansicht:":"Vista de proprietário:",
  "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"Vês o estado atual, o relatório IA e o relatório de estado. Só os membros da equipa do projeto podem fazer alterações.",
  "ANGEMELDET ALS":"SESSÃO INICIADA COMO",
  "Passwort ändern":"Alterar palavra-passe",
  "Neues Passwort":"Nova palavra-passe",
  "Neues Passwort wiederholen":"Repetir nova palavra-passe",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"A nova palavra-passe tem de ter pelo menos 8 caracteres.",
  "Die beiden Passwörter stimmen nicht überein.":"As duas palavras-passe não coincidem.",
  "Passwort geändert.":"Palavra-passe alterada.",
  "Passwort konnte nicht geändert werden.":"Não foi possível alterar a palavra-passe.",
  "Konto löschen":"Eliminar conta",
  "Konto endgültig löschen":"Eliminar conta definitivamente",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"Elimina o teu acesso e as tuas filiações. As organizações em que és o único membro são eliminadas com todos os dados (uma subscrição ativa termina de imediato). Nas organizações com outros membros os dados mantêm-se. Se aí fores o último admin, passa primeiro a função em «Equipa».",
  "Tarif wählen":"Escolher plano",
  "Zahlungsart ändern":"Alterar forma de pagamento",
  "AKTUELLER TARIF":"PLANO ATUAL",
  "Testphase":"Período de teste",
  "Aktiv":"Ativo",
  "Aktuell":"Atual",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"Gerir subscrição (faturas, forma de pagamento, cancelamento)",
  "Öffnet…":"A abrir…",
  "Öffnet Bezahlseite…":"A abrir pagamento…",
  "Nur Admins der Organisation können das Abo ändern.":"Só os admins da organização podem alterar a subscrição.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"O pagamento online está a ser configurado.",
  "Für ein Abo schreib an":"Para uma subscrição, escreve para",
  "pro Monat zzgl. USt., monatlich kündbar":"por mês mais IVA, cancelável mensalmente",
  "Bald verfügbar":"Disponível em breve",
  "Über „Abo verwalten“ wechseln":"Mudar em «Gerir subscrição»",
  "auf Anfrage":"sob consulta",
  "Jahresvertrag":"Contrato anual",
  "Mehr als 5 Hotels":"Mais de 5 hotéis",
  "Eigene Vorlagen je Marke":"Modelos próprios por marca",
  "Onboarding und Schulung":"Onboarding e formação",
  "Kontakt aufnehmen":"Entrar em contacto",
  "Status aktualisieren":"Atualizar estado",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"O pagamento é processado com segurança pela Stripe. As faturas chegam por e-mail e estão disponíveis em «Gerir subscrição».",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"Obrigado! O pagamento foi concluído. A subscrição será ativada dentro de segundos.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"O pagamento foi cancelado. Nada foi cobrado.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"O período de teste terminou. O Ouverture está em modo só de leitura – todos os dados são mantidos.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"Sem subscrição ativa. O Ouverture está em modo só de leitura – todos os dados são mantidos.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"O último pagamento falhou. Atualiza a forma de pagamento.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"Pagamento em aberto – atualiza a forma de pagamento",
  "Beendet":"Terminada",
  "Unbezahlt":"Não paga",
  "Zahlung nicht abgeschlossen":"Pagamento não concluído",
  "1 Hotel-Eröffnung":"1 abertura de hotel",
  "Unbegrenzt viele Teammitglieder":"Membros da equipa ilimitados",
  "Vorlage mit Pre-Opening-Plan":"Modelo com plano de pré-abertura",
  "Statusbericht als PDF":"Relatório de estado em PDF",
  "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"Até 5 aberturas de hotel em simultâneo",
  "Alles aus Starter":"Tudo do Starter",
  "Für Hotelgruppen und Beratungen":"Para grupos hoteleiros e consultoras",
  "Bevorzugter Support":"Suporte prioritário",
  "← Zurück":"← Voltar",
  "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"Na janela de impressão, escolhe «Guardar como PDF» como destino.",
  "Als PDF speichern / Drucken":"Guardar como PDF / Imprimir",
  "STATUSBERICHT PRE-OPENING":"RELATÓRIO DE ESTADO DA PRÉ-ABERTURA",
  "Stand:":"Data:",
  "Eröffnung:":"Abertura:",
  "AUFGABEN":"TAREFAS",
  "MEILENSTEINE":"MARCOS",
  "BUDGET (IST / PLAN)":"ORÇAMENTO (REAL / PREVISTO)",
  "PERSONAL":"PESSOAL",
  "Überfällige Aufgaben mit hoher Priorität":"Tarefas em atraso de prioridade alta",
  "Blockiert:":"Bloqueadas:",
  "Größte Risiken":"Maiores riscos",
  "Noch keine Abteilungsdaten.":"Ainda sem dados por departamento.",
  "Erstellt mit Ouverture":"Criado com Ouverture",
  "KI-Lagebericht vom":"Relatório IA de",
  "im Plan":"no plano",
  "gefährdet":"em risco",
  "Überfällig":"Em atraso",
  "ÜBERFÄLLIG":"EM ATRASO",
  "Da ist etwas schiefgelaufen":"Algo correu mal",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"O erro foi comunicado automaticamente. Os teus dados estão guardados – recarrega a página.",
  "Seite neu laden":"Recarregar página",
  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Alteração impossível: ou tens apenas acesso de leitura (acesso de proprietário), ou a subscrição desta organização não está ativa (p. ex. teste terminado). Um admin pode alterar a função em «Equipa» ou o plano em «Subscrição».",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"Com o plano atual não podes criar mais hotéis (limite atingido ou teste terminado). Um admin pode alterar o plano em «Subscrição».",
  "Nur Admins der Organisation können das Abo verwalten.":"Só os admins da organização podem gerir a subscrição.",
  "Keine Aufgaben mit Titel gefunden.":"Não foram encontradas tarefas com título.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"Tem de existir pelo menos um admin. Torna primeiro outra pessoa admin.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"O último admin não pode sair da organização. Torna primeiro outra pessoa admin – ou elimina a organização.",
  "Stand":"Data",
  "Währung":"Moeda",
  "Währung für das Budget":"Moeda do orçamento",
  "Euro (€)":"Euro (€)",
  "Schweizer Franken (CHF)":"Franco suíço (CHF)",
  "Britisches Pfund (£)":"Libra esterlina (£)",
  "US-Dollar ($)":"Dólar americano ($)",
  "VAE-Dirham (AED)":"Dirham dos EAU (AED)",
  "Saudi-Riyal (SAR)":"Rial saudita (SAR)",
  "Katar-Riyal (QAR)":"Rial do Catar (QAR)",
  "Sprache":"Idioma",
  "Wie die Organisation":"Como a organização",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"O teu idioma aplica-se só a ti. Sem escolha, o Ouverture segue o idioma padrão da organização.",
  "Standardsprache der Organisation":"Idioma padrão da organização",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"Aplica-se aos e-mails, ao modelo de pré-abertura, ao relatório IA e a todos os membros sem idioma próprio.",
  "Meine Sprache":"O meu idioma",
  "Ablehnen":"Recusar",
  "Abteilungen":"Departamentos",
  "Abteilungsleitung":"Chefe de departamento",
  "Antrag abgelehnt.":"Pedido recusado.",
  "Antrag genehmigt.":"Pedido aprovado.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"Pedido enviado. O chefe de departamento decide.",
  "Antrag stellen":"Enviar pedido",
  "Antrag zurückgezogen.":"Pedido retirado.",
  "Anträge zur Entscheidung":"Pedidos para decidir",
  "Antwort:":"Resposta:",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"Copiar os turnos de trabalho da semana anterior para esta semana? Os dias já planeados não mudam.",
  "Beginn":"Início",
  "Begründung für die Ablehnung (optional)":"Motivo da recusa (opcional)",
  "Besetzung":"Cobertura",
  "Bis":"Até",
  "Deine Ansicht:":"A tua vista:",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"O chefe de departamento decide; em caso de dúvida, falem diretamente.",
  "Dienstplan":"Escala",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"Ainda não tens nenhum departamento atribuído. Um admin pode alterar isto em «Equipa» – depois vês aqui a escala do teu departamento.",
  "Drucken":"Imprimir",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"Não tens turnos futuros neste hotel que possas trocar.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"Vês as tarefas dos teus departamentos e todas as que te estão atribuídas. Orçamento, riscos e pessoal são vistos pelo chefe de departamento.",
  "Ende":"Fim",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"Falha na exportação:",
  "Frei":"Folga",
  "Frei-Wunsch":"Pedido de folga",
  "Früh":"Manhã",
  "Genehmigen":"Aprovar",
  "Genehmigt":"Aprovado",
  "Abgelehnt":"Recusado",
  "Zurückgezogen":"Retirado",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"Não tens turnos planeados nas próximas oito semanas.",
  "Keine Abteilung":"Sem departamento",
  "Krank":"Doente",
  "KW":"Sem.",
  "Meine Anträge":"Os meus pedidos",
  "Meine Schicht":"O meu turno",
  "Meine Schichten":"Os meus turnos",
  "Mindestbesetzung":"Cobertura mínima",
  "Mitarbeitende":"Colaboradores",
  "Nacht":"Noite",
  "Name ohne Login (z. B. Aushilfe)":"Nome sem acesso (p. ex. extra)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"Ainda ninguém neste departamento. Atribui colaboradores em «Equipa» ou escreve um nome abaixo.",
  "Nächste Woche":"Semana seguinte",
  "Vorige Woche":"Semana anterior",
  "Bitte wählen":"Escolher",
  "Offen":"Em aberto",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"Sem departamento, esta pessoa só vê as tarefas que lhe foram atribuídas diretamente.",
  "Schicht bearbeiten":"Editar turno",
  "Schicht eintragen":"Adicionar turno",
  "Schichten, die du übernehmen sollst":"Turnos que te pedem para assumir",
  "Schichttausch":"Troca de turno",
  "Spät":"Tarde",
  "Tausch":"Troca",
  "Unterbesetzt:":"Falta de pessoal:",
  "Urlaub":"Férias",
  "Von":"De",
  "Vorwoche übernehmen":"Copiar semana anterior",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"Quantas pessoas precisa este departamento por turno? Se faltarem, a escala avisa.",
  "Zeile hinzufügen":"Adicionar linha",
  "Zurückziehen":"Retirar",
  "Zwischen":"Intermédio",
  "ohne Login":"sem acesso",
  "Übernimmt":"Assume",
  "Übernommene Schichten:":"Turnos copiados:",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"veem só as tarefas dos seus departamentos e as próprias, a sua escala, e podem pedir férias, folgas e trocas de turno.",
  "sieht und verwaltet alles, auch Abo und Team.":"vê e gere tudo, incluindo subscrição e equipa.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"vê e gere totalmente os seus departamentos – tarefas, orçamento, riscos, pessoal e escala – e aprova pedidos.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Alteração impossível: ou não tens os direitos necessários (p. ex. acesso de proprietário ou outro departamento), ou a subscrição desta organização não está ativa (p. ex. teste terminado). Um admin pode alterar funções e departamentos em «Equipa» ou o plano em «Subscrição».",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"O relatório IA é criado por admins e chefes de departamento.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"Pedido impossível: tem de dizer respeito ao teu departamento ou ao teu turno, e a pessoa que assume tem de pertencer à equipa.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"Só o chefe de departamento ou os admins podem decidir sobre pedidos.",
  "Dieser Antrag wurde bereits bearbeitet.":"Este pedido já foi tratado.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"Só podes retirar os teus pedidos ainda em aberto.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"Escolhe uma pessoa ou escreve um nome.",
  "Diese Schicht kannst du nicht löschen.":"Não podes eliminar este turno.",
  "Quell- und Zielwoche sind gleich.":"A semana de origem e a de destino são iguais.",
  "Nur Admins können Abteilungen zuordnen.":"Só os admins podem atribuir departamentos.",
};
I18N_PATTERNS.pt = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "Faltam $1 dias para a abertura"],
  [/^Eröffnung war vor (\d+) Tagen$/, "A abertura foi há $1 dias"],
  [/^noch (\d+) Tage$/, "faltam $1 dias"],
  [/^seit (\d+) Tagen eröffnet$/, "aberto há $1 dias"],
  [/^Testphase: noch 1 Tag\.$/, "Teste: falta 1 dia."],
  [/^Testphase: noch (\d+) Tage\.$/, "Teste: faltam $1 dias."],
  [/^Testphase bis (.+)$/, "Teste até $1"],
  [/^Testphase abgelaufen am (.+)$/, "Teste terminou em $1"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "Ativo · próxima faturação $1"],
  [/^Gekündigt – läuft bis (.+)$/, "Cancelada – válida até $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$1 de $2 hotéis usados"],
  [/^Personal (\d+) % besetzt$/, "Pessoal $1 % preenchido"],
  [/^Stand (.+)$/, "Data $1"],
  [/^seit (.+)$/, "desde $1"],
  [/^Stand: (.+)$/, "Data: $1"],
  [/^erstellt von (.+)$/, "criado por $1"],
  [/^(\d+) Aufgaben importieren$/, "Importar $1 tarefas"],
  [/^(\d+) Aufgaben importiert\.$/, "$1 tarefas importadas."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1 tarefas importadas, $2 linhas vazias ignoradas."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "Pré-visualização das primeiras linhas ($1 de $2 linhas têm título de tarefa):"],
  [/^(.+) wählen$/, "Escolher $1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 é agora $2."],
  [/^(.+) wurde entfernt\.$/, "$1 foi removido."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "Convite enviado por e-mail para $1."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "Para confirmar, escreve «$1»"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "Para confirmar, escreve o nome da organização: $1"],
  [/^(\d+) Personen eingestellt · (\d+) offen$/, "$1 pessoas contratadas · $2 em aberto"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 de $2 pessoas contratadas · $3 em aberto"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 em aberto · $2 em atraso"],
  [/^(\d+) gefährdet$/, "$1 em risco"],
  [/^(\d+) besetzt$/, "$1 preenchidas"],
  [/^(.+) ausgegeben$/, "$1 gastos"],
  [/^Um (.+) überschritten$/, "Ultrapassado em $1"],
  [/^… und (\d+) weitere\.$/, "… e mais $1."],
  [/^… und (\d+) weitere Stellen\.$/, "… e mais $1 vagas."],
  [/^(\d+) überfällig$/, "$1 em atraso"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "Previsto $1 · Real $2 · disponível $3"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$1 de $2 pessoas contratadas · $3 em aberto"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "«$1» tem mais de 25 MB."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "Remover $1 da organização? A pessoa perde o acesso de imediato; as suas tarefas mantêm-se, mas sem responsável."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "Sair mesmo de «$1»? Perdes o acesso até um admin te convidar novamente."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "Eliminar mesmo $1? Esta ação não pode ser anulada."],
  [/^Aufgabe „(.+)“$/, "a tarefa «$1»"],
  [/^Risiko „(.+)“$/, "o risco «$1»"],
  [/^Meilenstein „(.+)“$/, "o marco «$1»"],
  [/^Stelle „(.+)“$/, "a vaga «$1»"],
  [/^Budgetposten „(.+)“$/, "a rubrica «$1»"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "Eliminar «$1»? O ficheiro será removido definitivamente."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "Limite diário atingido: no máximo $1 relatórios IA por organização em 24 horas."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "Não foi possível abrir a página de pagamento: $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "És o último admin em: $1. Torna primeiro outra pessoa admin em «Equipa»."],
  [/^Plan \((.+)\)$/, "Previsto ($1)"],
  [/^Ist \((.+)\)$/, "Real ($1)"],
];

/* ------------------------------ Türkisch ------------------------------ */
I18N.tr = {
  "Dashboard":"Gösterge paneli",
  "Meine Aufgaben":"Görevlerim",
  "Aufgaben":"Görevler",
  "Meilensteine":"Kilometre taşları",
  "Zeitstrahl":"Zaman çizelgesi",
  "Risiken":"Riskler",
  "Budget":"Bütçe",
  "Personal":"Personel",
  "Dokumente":"Belgeler",
  "Team":"Ekip",
  "Abo":"Abonelik",
  "Konto":"Hesap",
  "Hotel wechseln":"Otel değiştir",
  "Abmelden":"Çıkış yap",
  "ORGANISATION":"ORGANİZASYON",
  "Organisation":"Organizasyon",
  "Statusbericht":"Durum raporu",
  "Excel-Export":"Excel'e aktar",
  "Kalender":"Takvim",
  "Hotel bearbeiten":"Oteli düzenle",
  "Beispiel entfernen":"Örneği kaldır",
  "Beispielhotel":"Örnek otel",
  "Beispiel":"Örnek",
  "Zimmer":"oda",
  "Zimmer · Eröffnung":"oda · Açılış",
  "Lädt…":"Yükleniyor…",
  "Hotels werden geladen…":"Oteller yükleniyor…",
  "Abo-Daten werden geladen…":"Abonelik yükleniyor…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Outlook, Google veya Apple Takvim için açık süreler ve kilometre taşları",
  "Nicht begonnen":"Başlanmadı",
  "In Arbeit":"Devam ediyor",
  "Blockiert":"Engellendi",
  "In Prüfung":"İncelemede",
  "Abgeschlossen":"Tamamlandı",
  "Kritisch":"Kritik",
  "Hoch":"Yüksek",
  "Mittel":"Orta",
  "Niedrig":"Düşük",
  "Geplant":"Planlandı",
  "Gefährdet":"Risk altında",
  "Rezeption & Empfang":"Ön büro",
  "Housekeeping":"Kat hizmetleri",
  "Food & Beverage":"Yiyecek & İçecek",
  "Technik":"Teknik servis",
  "IT & Systeme":"BT & Sistemler",
  "Einkauf":"Satın alma",
  "Sicherheit":"Güvenlik",
  "Allgemein":"Genel",
  "Ausstattung":"Donanım",
  "Bau & Instandhaltung":"İnşaat ve bakım",
  "Dienstleister":"Hizmet sağlayıcılar",
  "IT & Technik":"BT ve teknoloji",
  "Marketing":"Pazarlama",
  "Personal & Schulung":"Personel ve eğitim",
  "Vorräte":"Sarf malzemeleri",
  "Sonstiges":"Diğer",
  "sofort":"hemen",
  "diese Woche":"bu hafta",
  "diesen Monat":"bu ay",
  "Admin":"Yönetici",
  "Mitglied":"Üye",
  "Eigentümer (nur lesen)":"Sahip (salt okunur)",
  "Anmelden":"Giriş yap",
  "Registrieren":"Kaydol",
  "Neues Konto erstellen":"Yeni hesap oluştur",
  "Konto erstellen":"Hesap oluştur",
  "E-Mail":"E-posta",
  "Passwort":"Şifre",
  "Passwort vergessen?":"Şifreni mi unuttun?",
  "Passwort vergessen":"Şifremi unuttum",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"E-posta adresini gir — sana sıfırlama bağlantısı gönderelim.",
  "Link schicken":"Bağlantı gönder",
  "Zurück zur Anmeldung":"Girişe dön",
  "Bitte warten…":"Lütfen bekle…",
  "Neues Passwort festlegen":"Yeni şifre belirle",
  "Passwort speichern":"Şifreyi kaydet",
  "Passwort geändert":"Şifre değiştirildi",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"Artık yeni şifrenle giriş yapabilirsin.",
  "Zur Anmeldung":"Girişe git",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"OTELLER İÇİN AÇILIŞ ÖNCESİ YAZILIMI",
  "Bis zum ersten Gast –":"İlk misafire kadar –",
  "alles im Blick.":"her şey kontrol altında.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"Görevler · Kilometre taşları · Riskler · YZ durum raporu",
  "Login fehlgeschlagen.":"Giriş başarısız.",
  "Registrierung fehlgeschlagen.":"Kayıt başarısız.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"Şifre en az 6 karakter olmalı.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"Hesap oluşturuldu! Lütfen gönderdiğimiz bağlantıyla e-posta adresini doğrula, ardından giriş yap.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"Bu e-posta adresi kayıtlıysa, şifreni sıfırlaman için az önce bir bağlantı gönderdik. Lütfen gelen kutunu (ve spam klasörünü) kontrol et.",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"Oturumunun süresi doldu – lütfen yeniden giriş yap.",
  "Bitte erneut anmelden.":"Lütfen yeniden giriş yap.",
  "Hotel auswählen":"Otel seç",
  "+ Neues Hotel":"+ Yeni otel",
  "Neues Hotel":"Yeni otel",
  "Name":"Ad",
  "Stadt":"Şehir",
  "Land":"Ülke",
  "Zimmeranzahl":"Oda sayısı",
  "Eröffnungsdatum":"Açılış tarihi",
  "Hotel anlegen":"Otel oluştur",
  "Speichert…":"Kaydediliyor…",
  "Abbrechen":"İptal",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"Önce denemek ister misin? Örnek otel, açılıştan 30 gün önceki bir projeyi gösterir – görevler, riskler, bütçe ve personelle. Tarifene sayılmaz.",
  "Beispielhotel öffnen":"Örnek oteli aç",
  "Wird angelegt…":"Oluşturuluyor…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"Bu organizasyonda henüz otel yok. Proje ekibi bir otel oluşturduğunda burada göreceksin.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"Örnek otel tüm örnek verilerle silinsin mi? İstediğin zaman yeniden oluşturabilirsin.",
  "Speichern":"Kaydet",
  "Gespeichert.":"Kaydedildi.",
  "Speichern & weiter":"Kaydet ve devam et",
  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"HAZIRLIK · PLANA UYGUN ⓘ",
  "IM ZEITPLAN":"PLANA UYGUN",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"Bugüne kadar yapılması gerekenlerin ne kadarının tamamlandığı – riskler, personel ve bütçe açıkları düşülerek. %100: tamamen planda.",
  "Gesamtfortschritt:":"Genel ilerleme:",
  "aller Aufgaben erledigt":"tüm görevlerin tamamlandı",
  "% aller Aufgaben erledigt":"% tüm görevlerin tamamlandı",
  "überfällig ·":"gecikmiş ·",
  "hohe Risiken":"yüksek risk",
  "Bereitschaft je Abteilung":"Departmana göre hazırlık",
  "Budget überschritten:":"Bütçe aşıldı:",
  "Stellen über Starttermin offen":"başlangıç tarihi geçmiş açık pozisyon",
  "Noch keine Posten – hier anlegen →":"Henüz kalem yok – buradan ekle →",
  "Noch keine Stellen – hier anlegen →":"Henüz pozisyon yok – buradan ekle →",
  "Überfällige kritische Aufgaben":"Gecikmiş kritik görevler",
  "Höchste Risiken":"En yüksek riskler",
  "Keine.":"Yok.",
  "· Score":"· Puan",
  "Personen eingestellt ·":"kişi işe alındı ·",
  "offen":"açık",
  "überschritten um":"aşım",
  "KI-Lagebericht":"YZ durum raporu",
  "Lagebericht erstellen":"Rapor oluştur",
  "Neu erstellen":"Yeniden oluştur",
  "Analysiert…":"Analiz ediliyor…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"YZ görevleri, kilometre taşlarını, riskleri, bütçeyi ve personeli değerlendirir; yönetim ve sahipler için bir değerlendirme yazar – trafik ışığı, yapılması gerekenler ve sonraki adımlarla.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"YZ projeyi analiz ediyor. Bu genellikle 20–60 saniye sürer …",
  "Handlungsbedarf":"Yapılması gerekenler",
  "Risikohinweise":"Risk uyarıları",
  "Was gut läuft":"İyi gidenler",
  "Nächste Schritte (7 Tage)":"Sonraki adımlar (7 gün)",
  "Risikohinweise und nächste Schritte anzeigen":"Risk uyarılarını ve sonraki adımları göster",
  "Weniger anzeigen":"Daha az göster",
  "Im Plan":"Planda",
  "Verzug – aufholbar":"Gecikme – telafi edilebilir",
  "Eröffnung gefährdet":"Açılış risk altında",
  "Einschätzung":"Değerlendirme",
  "+ Aufgabe":"+ Görev",
  "Aus Excel importieren":"Excel'den içe aktar",
  "Aus Vorlage ergänzen":"Şablondan ekle",
  "Aufgabe":"Görev",
  "Titel":"Başlık",
  "Abteilung":"Departman",
  "Priorität":"Öncelik",
  "Status":"Durum",
  "Fällig":"Bitiş",
  "Fällig am":"Bitiş tarihi",
  "Zuständig":"Sorumlu",
  "Zuständig im Team":"Ekipteki sorumlu",
  "Extern / Sonstige":"Harici / diğer",
  "— niemand aus dem Team —":"— ekipten kimse —",
  "Alle Abteilungen":"Tüm departmanlar",
  "Alle Status":"Tüm durumlar",
  "Alle offenen":"Tüm açıklar",
  "Nur meine":"Sadece benimkiler",
  "Ohne Zuständigkeit":"Sorumlusuz",
  "Erledigte anzeigen":"Tamamlananları göster",
  "Sortierung":"Sıralama",
  "Nach Termin":"Tarihe göre",
  "Nach Priorität":"Önceliğe göre",
  "Nach Abteilung":"Departmana göre",
  "Filter zurücksetzen":"Filtreleri sıfırla",
  "Keine Aufgabe passt zu den Filtern.":"Filtrelere uyan görev yok.",
  "Suchen: Titel, Zuständige, Externe …":"Ara: başlık, sorumlu, harici …",
  "Bearbeiten":"Düzenle",
  "Löschen":"Sil",
  "löschen":"sil",
  "Kommentare und Verlauf":"Yorumlar ve geçmiş",
  "Noch keine Kommentare.":"Henüz yorum yok.",
  "Kommentar schreiben … (Strg+Enter zum Senden)":"Yorum yaz … (Göndermek için Ctrl+Enter)",
  "Senden":"Gönder",
  "Änderungsverlauf anzeigen":"Değişiklik geçmişini göster",
  "Kommentar löschen?":"Yorum silinsin mi?",
  "hat die Aufgabe angelegt":"görevi oluşturdu",
  "Automatisch":"Otomatik",
  "(Eröffnung verschoben)":"(açılış ertelendi)",
  "Du":"Sen",
  "Unbekannt":"Bilinmiyor",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"Sana henüz görev atanmadı. Sorumlulukları «Görevler» bölümünde düzenlerken belirlersin.",
  "Keine offenen Aufgaben – alles erledigt.":"Açık görev yok – her şey tamam.",
  "Hotel":"Otel",
  "kein Termin":"tarih yok",
  "· am Eröffnungstag":"· açılış gününde",
  "Tage vor":"gün önce",
  "Tage nach":"gün sonra",
  "Eröffnung":"Açılış",
  "Vorlage: Standard-Eröffnungsplanung":"Şablon: standart açılış planı",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"Tüm departmanlar için tipik açılış öncesi görevleri ve kilometre taşları, açılış tarihine göre planlanır. Açılış kayarsa bu tarihler otomatik olarak kayar – sen bir tarihi elle değiştirene kadar.",
  "Wird geprüft…":"Kontrol ediliyor…",
  "Die Vorlage ist bereits vollständig angewendet.":"Şablon zaten tamamen uygulandı.",
  "Neu angelegt werden":"Oluşturulacak",
  "Aufgaben und":"görev ve",
  "Meilensteine angelegt.":"kilometre taşı oluşturuldu.",
  "Vorlage anwenden":"Şablonu uygula",
  "sind schon vorhanden und werden übersprungen)":"zaten var ve atlanacak)",
  "vergangene weggelassen.":"geçmiş olanlar atlandı.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"tanesinin tarihi bugünden önce olurdu. Bunları atla (yoksa gecikmiş olarak oluşturulur).",
  "Aufgaben aus Excel oder CSV importieren":"Excel veya CSV'den görev içe aktar",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"Dosyanın ilk sayfası, satır başına bir görev. «Görev», «Departman», «Öncelik», «Durum», «Bitiş» ve «Sorumlu» gibi sütunlar otomatik tanınır – İngilizce veya Almanca da.",
  "Spalten zuordnen":"Sütunları eşleştir",
  "– nicht importieren –":"– içe aktarma –",
  "(Pflicht)":"(zorunlu)",
  "Spalte":"Sütun",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"Bilinmeyen öncelikler «Orta», bilinmeyen durum «Başlanmadı», eksik departman «Genel» olur. Sorumlular metin olarak aktarılır – ekip üyelerini sonra atayabilirsin.",
  "Importiert…":"İçe aktarılıyor…",
  "Schließen":"Kapat",
  "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"Dosyada başlığın altında satır bulunamadı.",
  "Datei konnte nicht gelesen werden:":"Dosya okunamadı:",
  "Meilenstein":"Kilometre taşı",
  "Datum":"Tarih",
  "Kritikalität":"Kritiklik",
  "Keine offenen Meilensteine.":"Açık kilometre taşı yok.",
  "Heute":"Bugün",
  "Monate":"Aylar",
  "nur offene Aufgaben":"sadece açık görevler",
  "erledigt":"tamamlandı",
  "blockiert":"engellendi",
  "überfällig":"gecikmiş",
  "◆ Meilenstein":"◆ Kilometre taşı",
  "Noch keine Aufgaben oder Meilensteine mit Termin.":"Henüz tarihli görev veya kilometre taşı yok.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"Görevi görmek için farenle bir noktanın üzerine gel. Büyük noktalar kritik görevlerdir.",
  "+ Risiko":"+ Risk",
  "Risiko":"Risk",
  "Gegenmaßnahme":"Önlem",
  "Gegenmaßnahme (optional)":"Önlem (isteğe bağlı)",
  "Score":"Puan",
  "Wahrscheinlichkeit:":"Olasılık:",
  "Auswirkung:":"Etki:",
  "Maßnahme:":"Önlem:",
  "keine festgelegt":"belirlenmedi",
  "Keine Risiken erfasst.":"Kayıtlı risk yok.",
  "+ Budgetposten":"+ Bütçe kalemi",
  "Posten":"Kalem",
  "Posten, z. B. Matratzen":"Kalem, ör. yataklar",
  "Plan":"Plan",
  "Ist":"Gerçekleşen",
  "Plan (€)":"Plan (€)",
  "Ist (€)":"Gerçekleşen (€)",
  "Notiz":"Not",
  "Noch keine Budgetposten.":"Henüz bütçe kalemi yok.",
  "Kein Budget erfasst.":"Kayıtlı bütçe yok.",
  "Ist vs. Plan je Abteilung":"Departmana göre gerçekleşen / plan",
  "NOCH VERFÜGBAR":"HÂLÂ KULLANILABİLİR",
  "ÜBERSCHRITTEN":"AŞILDI",
  "verfügbar":"kullanılabilir",
  "überschritten":"aşıldı",
  "Alle Abteilungen im Plan.":"Tüm departmanlar planda.",
  "% vom Plan":"% plan",
  "% über Plan)":"% plan üstü)",
  "+ Stelle":"+ Pozisyon",
  "Stelle":"Pozisyon",
  "z. B. Rezeptionist/in":"ör. resepsiyonist",
  "Benötigt":"Gerekli",
  "Besetzt":"Dolu",
  "Start":"Başlangıç",
  "Personen":"kişi",
  "Besetzung je Abteilung":"Departmana göre doluluk",
  "Noch keine Stellen angelegt.":"Henüz pozisyon oluşturulmadı.",
  "Keine Stellen erfasst.":"Kayıtlı pozisyon yok.",
  "Eine Person mehr":"Bir kişi fazla",
  "Eine Person weniger":"Bir kişi eksik",
  "Stellen mit Lücken":"eksik pozisyon",
  "1 Stelle mit Lücken":"1 eksik pozisyon",
  "Bitte eine Stellenbezeichnung eingeben.":"Lütfen bir pozisyon adı gir.",
  "„Benötigt“ muss mindestens 1 sein.":"«Gerekli» en az 1 olmalı.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"«Dolu» 0 ile «Gerekli» arasında olmalı.",
  "weitere Stellen.":"pozisyon daha.",
  "% besetzt":"% dolu",
  "Dateien hochladen":"Dosya yükle",
  "oder hierher ziehen · max. 25 MB je Datei":"veya buraya sürükle · dosya başına en fazla 25 MB",
  "Noch keine Dokumente.":"Henüz belge yok.",
  "Herunterladen":"İndir",
  "Datei anhängen":"Dosya ekle",
  "ANHÄNGE":"EKLER",
  "Keine Anhänge.":"Ek yok.",
  "Lädt hoch:":"Yükleniyor:",
  "Hochladen fehlgeschlagen":"Yükleme başarısız",
  "Teammitglied einladen":"Ekip üyesi davet et",
  "E-Mail-Adresse":"E-posta adresi",
  "Einladen":"Davet et",
  "Mitglieder":"Üyeler",
  "(du)":"(sen)",
  "Ausstehende Einladungen":"Bekleyen davetler",
  "Link kopieren":"Bağlantıyı kopyala",
  "Kopiert!":"Kopyalandı!",
  "Entfernen":"Kaldır",
  "Teammitglied":"Ekip üyesi",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"Kişi davet bağlantısını e-postayla alır. Bununla kaydolur veya giriş yapar ve otomatik olarak organizasyonuna katılır. E-posta gelmezse aşağıdaki bağlantıyı kopyalayıp kendin de iletebilirsin.",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"gösterge panelini, YZ durum raporunu ve durum raporunu görür, yorum yapabilir ama hiçbir şeyi değiştiremez – sahipler ve yatırımcılar için ideal.",
  "Sprache der Organisation":"Organizasyon dili",
  "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"Tüm üyelerin arayüzü, e-postalar, açılış öncesi şablonu ve YZ durum raporu için geçerlidir.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"Organizasyon adı, ör. İstanbul Otel Grubu",
  "Umbenennen":"Yeniden adlandır",
  "Meine Organisation":"Organizasyonum",
  "Gefahrenzone":"Tehlikeli bölge",
  "Organisation verlassen":"Organizasyondan ayrıl",
  "Organisation endgültig löschen":"Organizasyonu kalıcı olarak sil",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"Organizasyondan ayrılırsan tüm otellerine erişimini kaybedersin.",
  "Löscht":"Siler:",
  "Das kann nicht rückgängig gemacht werden.":"Bu işlem geri alınamaz.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"tüm oteller, görevler, yorumlar, belgeler ve raporlarla birlikte kalıcı olarak. Devam eden abonelik hemen sona erer. Gerekirse önce her oteli «Excel'e aktar» ile dışa aktar.",
  "Zur Bestätigung den Namen der Organisation eingeben:":"Onaylamak için organizasyon adını yaz:",
  "Wird gelöscht…":"Siliniyor…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"Davet oluşturuldu ama e-posta gönderilmedi (e-posta gönderimi ayarlı değil). Lütfen aşağıdaki bağlantıyı kopyalayıp ilet.",
  "Eigentümer-Ansicht:":"Sahip görünümü:",
  "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"Güncel durumu, YZ durum raporunu ve durum raporunu görürsün. Değişiklikleri yalnızca proje ekibi yapabilir.",
  "ANGEMELDET ALS":"GİRİŞ YAPAN",
  "Passwort ändern":"Şifre değiştir",
  "Neues Passwort":"Yeni şifre",
  "Neues Passwort wiederholen":"Yeni şifreyi tekrarla",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"Yeni şifre en az 8 karakter olmalı.",
  "Die beiden Passwörter stimmen nicht überein.":"İki şifre eşleşmiyor.",
  "Passwort geändert.":"Şifre değiştirildi.",
  "Passwort konnte nicht geändert werden.":"Şifre değiştirilemedi.",
  "Konto löschen":"Hesabı sil",
  "Konto endgültig löschen":"Hesabı kalıcı olarak sil",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"Girişini ve üyeliklerini siler. Tek üyesi olduğun organizasyonlar tüm verileriyle silinir (devam eden abonelik hemen sona erer). Başka üyeleri olan organizasyonlarda veriler korunur. Oradaki son yöneticiysen rolü önce «Ekip» bölümünden devret.",
  "Tarif wählen":"Tarife seç",
  "Zahlungsart ändern":"Ödeme yöntemini değiştir",
  "AKTUELLER TARIF":"MEVCUT TARİFE",
  "Testphase":"Deneme süresi",
  "Aktiv":"Aktif",
  "Aktuell":"Mevcut",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"Aboneliği yönet (faturalar, ödeme yöntemi, iptal)",
  "Öffnet…":"Açılıyor…",
  "Öffnet Bezahlseite…":"Ödeme sayfası açılıyor…",
  "Nur Admins der Organisation können das Abo ändern.":"Aboneliği yalnızca organizasyonun yöneticileri değiştirebilir.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"Çevrimiçi ödeme şu anda kuruluyor.",
  "Für ein Abo schreib an":"Abonelik için şu adrese yaz:",
  "pro Monat zzgl. USt., monatlich kündbar":"aylık, KDV hariç, aylık iptal edilebilir",
  "Bald verfügbar":"Yakında",
  "Über „Abo verwalten“ wechseln":"«Aboneliği yönet» üzerinden geç",
  "auf Anfrage":"talep üzerine",
  "Jahresvertrag":"Yıllık sözleşme",
  "Mehr als 5 Hotels":"5'ten fazla otel",
  "Eigene Vorlagen je Marke":"Markaya özel şablonlar",
  "Onboarding und Schulung":"Kurulum ve eğitim",
  "Kontakt aufnehmen":"İletişime geç",
  "Status aktualisieren":"Durumu yenile",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"Ödeme Stripe üzerinden güvenle yapılır. Faturalar e-postayla gelir ve «Aboneliği yönet» altında görüntülenebilir.",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"Teşekkürler! Ödeme başarılı. Abonelik birkaç saniye içinde etkinleşecek.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"Ödeme iptal edildi. Hiçbir ücret alınmadı.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"Deneme süresi sona erdi. Ouverture salt okunur modda – tüm veriler korunur.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"Aktif abonelik yok. Ouverture salt okunur modda – tüm veriler korunur.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"Son ödeme başarısız oldu. Lütfen ödeme yöntemini güncelle.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"Ödeme bekliyor – lütfen ödeme yöntemini güncelle",
  "Beendet":"Sona erdi",
  "Unbezahlt":"Ödenmedi",
  "Zahlung nicht abgeschlossen":"Ödeme tamamlanmadı",
  "1 Hotel-Eröffnung":"1 otel açılışı",
  "Unbegrenzt viele Teammitglieder":"Sınırsız ekip üyesi",
  "Vorlage mit Pre-Opening-Plan":"Açılış öncesi plan şablonu",
  "Statusbericht als PDF":"PDF olarak durum raporu",
  "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"Aynı anda 5 otel açılışına kadar",
  "Alles aus Starter":"Starter'daki her şey",
  "Für Hotelgruppen und Beratungen":"Otel grupları ve danışmanlıklar için",
  "Bevorzugter Support":"Öncelikli destek",
  "← Zurück":"← Geri",
  "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"Yazdırma penceresinde hedef olarak «PDF olarak kaydet»i seç.",
  "Als PDF speichern / Drucken":"PDF olarak kaydet / Yazdır",
  "STATUSBERICHT PRE-OPENING":"AÇILIŞ ÖNCESİ DURUM RAPORU",
  "Stand:":"Tarih:",
  "Eröffnung:":"Açılış:",
  "AUFGABEN":"GÖREVLER",
  "MEILENSTEINE":"KİLOMETRE TAŞLARI",
  "BUDGET (IST / PLAN)":"BÜTÇE (GERÇEKLEŞEN / PLAN)",
  "PERSONAL":"PERSONEL",
  "Überfällige Aufgaben mit hoher Priorität":"Gecikmiş yüksek öncelikli görevler",
  "Blockiert:":"Engellenen:",
  "Größte Risiken":"En büyük riskler",
  "Noch keine Abteilungsdaten.":"Henüz departman verisi yok.",
  "Erstellt mit Ouverture":"Ouverture ile oluşturuldu",
  "KI-Lagebericht vom":"YZ durum raporu:",
  "im Plan":"planda",
  "gefährdet":"risk altında",
  "Überfällig":"Gecikmiş",
  "ÜBERFÄLLIG":"GECİKMİŞ",
  "Da ist etwas schiefgelaufen":"Bir şeyler ters gitti",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"Hata otomatik olarak bildirildi. Verilerin kayıtlı – lütfen sayfayı yenile.",
  "Seite neu laden":"Sayfayı yenile",
  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Değişiklik yapılamıyor: Ya yalnızca okuma erişimin var (sahip erişimi) ya da bu organizasyonun aboneliği aktif değil (ör. deneme süresi bitti). Bir yönetici rolü «Ekip», tarifeyi «Abonelik» altında değiştirebilir.",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"Mevcut tarifeyle başka otel oluşturamazsın (otel sınırına ulaşıldı veya deneme süresi bitti). Bir yönetici tarifeyi «Abonelik» altında değiştirebilir.",
  "Nur Admins der Organisation können das Abo verwalten.":"Aboneliği yalnızca organizasyonun yöneticileri yönetebilir.",
  "Keine Aufgaben mit Titel gefunden.":"Başlıklı görev bulunamadı.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"En az bir yönetici olmalı. Lütfen önce başka birini yönetici yap.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"Son yönetici organizasyondan ayrılamaz. Lütfen önce başka birini yönetici yap – ya da organizasyonu sil.",
  "Stand":"Tarih",
  "Währung":"Para birimi",
  "Währung für das Budget":"Bütçe para birimi",
  "Euro (€)":"Euro (€)",
  "Schweizer Franken (CHF)":"İsviçre frangı (CHF)",
  "Britisches Pfund (£)":"İngiliz sterlini (£)",
  "US-Dollar ($)":"ABD doları ($)",
  "VAE-Dirham (AED)":"BAE dirhemi (AED)",
  "Saudi-Riyal (SAR)":"Suudi riyali (SAR)",
  "Katar-Riyal (QAR)":"Katar riyali (QAR)",
  "Sprache":"Dil",
  "Wie die Organisation":"Organizasyonla aynı",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"Dilin yalnızca senin için geçerli. Seçim yapmazsan Ouverture organizasyonun varsayılan dilini kullanır.",
  "Standardsprache der Organisation":"Organizasyonun varsayılan dili",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"E-postalar, açılış öncesi şablonu, YZ durum raporu ve kendi dilini seçmemiş tüm üyeler için geçerlidir.",
  "Meine Sprache":"Dilim",
  "Ablehnen":"Reddet",
  "Abteilungen":"Departmanlar",
  "Abteilungsleitung":"Departman müdürü",
  "Antrag abgelehnt.":"Talep reddedildi.",
  "Antrag genehmigt.":"Talep onaylandı.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"Talep gönderildi. Departman müdürü karar verecek.",
  "Antrag stellen":"Talep gönder",
  "Antrag zurückgezogen.":"Talep geri çekildi.",
  "Anträge zur Entscheidung":"Karar bekleyen talepler",
  "Antwort:":"Yanıt:",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"Önceki haftanın çalışma vardiyaları bu haftaya kopyalansın mı? Zaten planlanmış günler değişmez.",
  "Beginn":"Başlangıç",
  "Begründung für die Ablehnung (optional)":"Ret gerekçesi (isteğe bağlı)",
  "Besetzung":"Kadro",
  "Bis":"Bitiş",
  "Deine Ansicht:":"Görünümün:",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"Kararı departman müdürü verir; sorularınız varsa doğrudan konuşun.",
  "Dienstplan":"Vardiya planı",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"Sana henüz bir departman atanmadı. Bir yönetici bunu «Ekip» altında değiştirebilir – sonra burada departmanının vardiya planını görürsün.",
  "Drucken":"Yazdır",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"Bu otelde takas edebileceğin yaklaşan vardiyan yok.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"Departmanlarının görevlerini ve sana atanan tüm görevleri görürsün. Bütçe, riskler ve personeli departman müdürü görür.",
  "Ende":"Bitiş",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"Dışa aktarma başarısız:",
  "Frei":"İzinli",
  "Frei-Wunsch":"İzin isteği",
  "Früh":"Sabah",
  "Genehmigen":"Onayla",
  "Genehmigt":"Onaylandı",
  "Abgelehnt":"Reddedildi",
  "Zurückgezogen":"Geri çekildi",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"Önümüzdeki sekiz haftada senin için planlanmış vardiya yok.",
  "Keine Abteilung":"Departman yok",
  "Krank":"Hasta",
  "KW":"Hf.",
  "Meine Anträge":"Taleplerim",
  "Meine Schicht":"Vardiyam",
  "Meine Schichten":"Vardiyalarım",
  "Mindestbesetzung":"Asgari kadro",
  "Mitarbeitende":"Çalışanlar",
  "Nacht":"Gece",
  "Name ohne Login (z. B. Aushilfe)":"Girişsiz ad (ör. geçici)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"Bu departmanda henüz kimse yok. «Ekip» altında çalışan ata veya aşağıya bir ad yaz.",
  "Nächste Woche":"Sonraki hafta",
  "Vorige Woche":"Önceki hafta",
  "Bitte wählen":"Lütfen seç",
  "Offen":"Açık",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"Departmanı olmayan bu kişi yalnızca doğrudan kendisine atanan görevleri görür.",
  "Schicht bearbeiten":"Vardiyayı düzenle",
  "Schicht eintragen":"Vardiya ekle",
  "Schichten, die du übernehmen sollst":"Devralman istenen vardiyalar",
  "Schichttausch":"Vardiya takası",
  "Spät":"Akşam",
  "Tausch":"Takas",
  "Unterbesetzt:":"Eksik kadro:",
  "Urlaub":"Yıllık izin",
  "Von":"Başlangıç",
  "Vorwoche übernehmen":"Önceki haftayı kopyala",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"Bu departman vardiya başına kaç kişiye ihtiyaç duyuyor? Eksik varsa plan uyarır.",
  "Zeile hinzufügen":"Satır ekle",
  "Zurückziehen":"Geri çek",
  "Zwischen":"Ara",
  "ohne Login":"girişsiz",
  "Übernimmt":"Devralan",
  "Übernommene Schichten:":"Kopyalanan vardiyalar:",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"yalnızca kendi departmanlarının ve kendi görevlerini, vardiya planlarını görür; izin, izin günü ve vardiya takası talep edebilir.",
  "sieht und verwaltet alles, auch Abo und Team.":"abonelik ve ekip dahil her şeyi görür ve yönetir.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"departmanlarını tamamen görür ve yönetir – görevler, bütçe, riskler, personel ve vardiya planı – ve talepleri onaylar.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"Değişiklik yapılamıyor: Ya bunun için yetkin yok (ör. sahip erişimi veya başka bir departman) ya da bu organizasyonun aboneliği aktif değil (ör. deneme süresi bitti). Bir yönetici rolleri ve departmanları «Ekip», tarifeyi «Abonelik» altında değiştirebilir.",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"YZ durum raporunu yöneticiler ve departman müdürleri oluşturur.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"Talep mümkün değil: Kendi departmanını veya kendi vardiyanı ilgilendirmeli ve devralan kişi ekipte olmalı.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"Taleplere yalnızca departman müdürü veya yöneticiler karar verebilir.",
  "Dieser Antrag wurde bereits bearbeitet.":"Bu talep zaten işlendi.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"Yalnızca kendi açık taleplerin geri çekilebilir.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"Lütfen bir kişi seç veya ad yaz.",
  "Diese Schicht kannst du nicht löschen.":"Bu vardiyayı silemezsin.",
  "Quell- und Zielwoche sind gleich.":"Kaynak ve hedef hafta aynı.",
  "Nur Admins können Abteilungen zuordnen.":"Departmanları yalnızca yöneticiler atayabilir.",
};
I18N_PATTERNS.tr = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "Açılışa $1 gün kaldı"],
  [/^Eröffnung war vor (\d+) Tagen$/, "Açılış $1 gün önceydi"],
  [/^noch (\d+) Tage$/, "$1 gün kaldı"],
  [/^seit (\d+) Tagen eröffnet$/, "$1 gündür açık"],
  [/^Testphase: noch 1 Tag\.$/, "Deneme: 1 gün kaldı."],
  [/^Testphase: noch (\d+) Tage\.$/, "Deneme: $1 gün kaldı."],
  [/^Testphase bis (.+)$/, "Deneme $1 tarihine kadar"],
  [/^Testphase abgelaufen am (.+)$/, "Deneme $1 tarihinde sona erdi"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "Aktif · sonraki fatura $1"],
  [/^Gekündigt – läuft bis (.+)$/, "İptal edildi – $1 tarihine kadar geçerli"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$2 otelden $1 tanesi kullanılıyor"],
  [/^Personal (\d+) % besetzt$/, "Personel %$1 dolu"],
  [/^Stand (.+)$/, "Tarih $1"],
  [/^seit (.+)$/, "$1 tarihinden beri"],
  [/^Stand: (.+)$/, "Tarih: $1"],
  [/^erstellt von (.+)$/, "oluşturan: $1"],
  [/^(\d+) Aufgaben importieren$/, "$1 görevi içe aktar"],
  [/^(\d+) Aufgaben importiert\.$/, "$1 görev içe aktarıldı."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1 görev içe aktarıldı, $2 boş satır atlandı."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "İlk satırların önizlemesi ($2 satırdan $1 tanesinde görev başlığı var):"],
  [/^(.+) wählen$/, "$1 seç"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 artık $2."],
  [/^(.+) wurde entfernt\.$/, "$1 kaldırıldı."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "Davet e-postayla $1 adresine gönderildi."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "Onaylamak için «$1» yaz"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "Onaylamak için organizasyon adını yaz: $1"],
  [/^(\d+) Personen eingestellt · (\d+) offen$/, "$1 kişi işe alındı · $2 açık"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$2 kişiden $1 işe alındı · $3 açık"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 açık · $2 gecikmiş"],
  [/^(\d+) gefährdet$/, "$1 risk altında"],
  [/^(\d+) besetzt$/, "$1 dolu"],
  [/^(.+) ausgegeben$/, "$1 harcandı"],
  [/^Um (.+) überschritten$/, "$1 aşıldı"],
  [/^… und (\d+) weitere\.$/, "… ve $1 tane daha."],
  [/^… und (\d+) weitere Stellen\.$/, "… ve $1 pozisyon daha."],
  [/^(\d+) überfällig$/, "$1 gecikmiş"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "Plan $1 · Gerçekleşen $2 · kullanılabilir $3"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$2 kişiden $1 işe alındı · $3 açık"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "«$1» 25 MB'tan büyük."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "$1 organizasyondan kaldırılsın mı? Kişi erişimini hemen kaybeder; görevleri korunur ama sorumlusuz kalır."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "«$1» organizasyonundan gerçekten ayrılmak istiyor musun? Bir yönetici seni yeniden davet edene kadar erişimini kaybedersin."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "$1 gerçekten silinsin mi? Bu işlem geri alınamaz."],
  [/^Aufgabe „(.+)“$/, "«$1» görevi"],
  [/^Risiko „(.+)“$/, "«$1» riski"],
  [/^Meilenstein „(.+)“$/, "«$1» kilometre taşı"],
  [/^Stelle „(.+)“$/, "«$1» pozisyonu"],
  [/^Budgetposten „(.+)“$/, "«$1» bütçe kalemi"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "«$1» silinsin mi? Dosya kalıcı olarak kaldırılacak."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "Günlük sınıra ulaşıldı: organizasyon başına 24 saatte en fazla $1 YZ durum raporu."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "Ödeme sayfası açılamadı: $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "Şu organizasyonlarda son yöneticisin: $1. Lütfen önce orada «Ekip» altında başka birini yönetici yap."],
  [/^Plan \((.+)\)$/, "Plan ($1)"],
  [/^Ist \((.+)\)$/, "Gerçekleşen ($1)"],
];

/* ------------------------------ Japanisch ------------------------------ */
I18N.ja = {
  "Dashboard":"ダッシュボード",
  "Meine Aufgaben":"マイタスク",
  "Aufgaben":"タスク",
  "Meilensteine":"マイルストーン",
  "Zeitstrahl":"タイムライン",
  "Risiken":"リスク",
  "Budget":"予算",
  "Personal":"人員",
  "Dokumente":"ドキュメント",
  "Team":"チーム",
  "Abo":"サブスクリプション",
  "Konto":"アカウント",
  "Hotel wechseln":"ホテルを切り替え",
  "Abmelden":"ログアウト",
  "ORGANISATION":"組織",
  "Organisation":"組織",
  "Statusbericht":"ステータスレポート",
  "Excel-Export":"Excelエクスポート",
  "Kalender":"カレンダー",
  "Hotel bearbeiten":"ホテルを編集",
  "Beispiel entfernen":"サンプルを削除",
  "Beispielhotel":"サンプルホテル",
  "Beispiel":"サンプル",
  "Zimmer":"室",
  "Zimmer · Eröffnung":"室 · 開業",
  "Lädt…":"読み込み中…",
  "Hotels werden geladen…":"ホテルを読み込み中…",
  "Abo-Daten werden geladen…":"サブスクリプションを読み込み中…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"Outlook・Google・Appleカレンダー用の未完了の期限とマイルストーン",
  "Nicht begonnen":"未着手",
  "In Arbeit":"進行中",
  "Blockiert":"ブロック中",
  "In Prüfung":"レビュー中",
  "Abgeschlossen":"完了",
  "Kritisch":"緊急",
  "Hoch":"高",
  "Mittel":"中",
  "Niedrig":"低",
  "Geplant":"予定",
  "Gefährdet":"危険",
  "Rezeption & Empfang":"フロント",
  "Housekeeping":"ハウスキーピング",
  "Food & Beverage":"料飲（F&B）",
  "Technik":"施設管理",
  "IT & Systeme":"IT・システム",
  "Einkauf":"購買",
  "Sicherheit":"安全・セキュリティ",
  "Allgemein":"全般",
  "Ausstattung":"備品",
  "Bau & Instandhaltung":"建設・保守",
  "Dienstleister":"委託業者",
  "IT & Technik":"IT・テクノロジー",
  "Marketing":"マーケティング",
  "Personal & Schulung":"人事・研修",
  "Vorräte":"消耗品",
  "Sonstiges":"その他",
  "sofort":"至急",
  "diese Woche":"今週中",
  "diesen Monat":"今月中",
  "Admin":"管理者",
  "Mitglied":"メンバー",
  "Eigentümer (nur lesen)":"オーナー（閲覧のみ）",
  "Anmelden":"ログイン",
  "Registrieren":"登録",
  "Neues Konto erstellen":"新しいアカウントを作成",
  "Konto erstellen":"アカウントを作成",
  "E-Mail":"メールアドレス",
  "Passwort":"パスワード",
  "Passwort vergessen?":"パスワードをお忘れですか？",
  "Passwort vergessen":"パスワードを忘れた場合",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"メールアドレスを入力してください。再設定用のリンクをお送りします。",
  "Link schicken":"リンクを送信",
  "Zurück zur Anmeldung":"ログインに戻る",
  "Bitte warten…":"お待ちください…",
  "Neues Passwort festlegen":"新しいパスワードを設定",
  "Passwort speichern":"パスワードを保存",
  "Passwort geändert":"パスワードを変更しました",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"新しいパスワードでログインできます。",
  "Zur Anmeldung":"ログインへ",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"ホテル向け開業準備ソフトウェア",
  "Bis zum ersten Gast –":"最初のゲストを迎えるまで —",
  "alles im Blick.":"すべてを見える化。",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"タスク · マイルストーン · リスク · AI状況レポート",
  "Login fehlgeschlagen.":"ログインに失敗しました。",
  "Registrierung fehlgeschlagen.":"登録に失敗しました。",
  "Das Passwort muss mindestens 6 Zeichen haben.":"パスワードは6文字以上にしてください。",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"アカウントを作成しました。お送りしたリンクからメールアドレスを確認し、その後ログインしてください。",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"このメールアドレスが登録されている場合、パスワード再設定用のリンクをお送りしました。受信トレイ（迷惑メールフォルダも）をご確認ください。",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"セッションの有効期限が切れました。もう一度ログインしてください。",
  "Bitte erneut anmelden.":"もう一度ログインしてください。",
  "Hotel auswählen":"ホテルを選択",
  "+ Neues Hotel":"+ 新しいホテル",
  "Neues Hotel":"新しいホテル",
  "Name":"名前",
  "Stadt":"都市",
  "Land":"国",
  "Zimmeranzahl":"客室数",
  "Eröffnungsdatum":"開業日",
  "Hotel anlegen":"ホテルを作成",
  "Speichert…":"保存中…",
  "Abbrechen":"キャンセル",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"まずは試してみますか？サンプルホテルでは、開業30日前のプロジェクトをタスク・リスク・予算・人員とともに確認できます。プランの対象数には含まれません。",
  "Beispielhotel öffnen":"サンプルホテルを開く",
  "Wird angelegt…":"作成中…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"この組織にはまだホテルがありません。プロジェクトチームがホテルを作成すると、ここに表示されます。",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"サンプルホテルをすべてのサンプルデータとともに削除しますか？いつでも再作成できます。",
  "Speichern":"保存",
  "Gespeichert.":"保存しました。",
  "Speichern & weiter":"保存して次へ",
  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"準備度 · 計画どおり ⓘ",
  "IM ZEITPLAN":"計画どおり",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"今日までに期限を迎えたもののうち完了した割合（リスク・人員・予算の不足分を差し引き）。100% は完全に計画どおりという意味です。",
  "Gesamtfortschritt:":"全体の進捗：",
  "aller Aufgaben erledigt":"のタスクが完了",
  "% aller Aufgaben erledigt":"% のタスクが完了",
  "überfällig ·":"件遅延 ·",
  "hohe Risiken":"件の高リスク",
  "Bereitschaft je Abteilung":"部門別の準備度",
  "Budget überschritten:":"予算超過：",
  "Stellen über Starttermin offen":"件のポジションが開始日を過ぎても未充足",
  "Noch keine Posten – hier anlegen →":"まだ項目がありません – ここで追加 →",
  "Noch keine Stellen – hier anlegen →":"まだポジションがありません – ここで追加 →",
  "Überfällige kritische Aufgaben":"期限切れの緊急タスク",
  "Höchste Risiken":"上位のリスク",
  "Keine.":"なし。",
  "· Score":"· スコア",
  "Personen eingestellt ·":"名採用済み ·",
  "offen":"未充足",
  "überschritten um":"超過額",
  "KI-Lagebericht":"AI状況レポート",
  "Lagebericht erstellen":"レポートを作成",
  "Neu erstellen":"再作成",
  "Analysiert…":"分析中…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"AIがタスク、マイルストーン、リスク、予算、人員を分析し、経営陣とオーナー向けの評価を作成します。信号表示、要対応事項、次のステップ付きです。",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"AIがプロジェクトを分析しています。通常20〜60秒かかります…",
  "Handlungsbedarf":"要対応事項",
  "Risikohinweise":"リスクに関する注意",
  "Was gut läuft":"順調な点",
  "Nächste Schritte (7 Tage)":"次のステップ（7日間）",
  "Risikohinweise und nächste Schritte anzeigen":"リスクの注意と次のステップを表示",
  "Weniger anzeigen":"表示を減らす",
  "Im Plan":"計画どおり",
  "Verzug – aufholbar":"遅延 – 挽回可能",
  "Eröffnung gefährdet":"開業に危険あり",
  "Einschätzung":"評価",
  "+ Aufgabe":"+ タスク",
  "Aus Excel importieren":"Excelからインポート",
  "Aus Vorlage ergänzen":"テンプレートから追加",
  "Aufgabe":"タスク",
  "Titel":"タイトル",
  "Abteilung":"部門",
  "Priorität":"優先度",
  "Status":"ステータス",
  "Fällig":"期限",
  "Fällig am":"期限日",
  "Zuständig":"担当",
  "Zuständig im Team":"チーム内の担当者",
  "Extern / Sonstige":"外部 / その他",
  "— niemand aus dem Team —":"— チームの担当者なし —",
  "Alle Abteilungen":"すべての部門",
  "Alle Status":"すべてのステータス",
  "Alle offenen":"未完了すべて",
  "Nur meine":"自分のみ",
  "Ohne Zuständigkeit":"担当者なし",
  "Erledigte anzeigen":"完了済みを表示",
  "Sortierung":"並べ替え",
  "Nach Termin":"期限順",
  "Nach Priorität":"優先度順",
  "Nach Abteilung":"部門順",
  "Filter zurücksetzen":"フィルターをリセット",
  "Keine Aufgabe passt zu den Filtern.":"フィルターに一致するタスクはありません。",
  "Suchen: Titel, Zuständige, Externe …":"検索：タイトル、担当者、外部…",
  "Bearbeiten":"編集",
  "Löschen":"削除",
  "löschen":"削除",
  "Kommentare und Verlauf":"コメントと履歴",
  "Noch keine Kommentare.":"コメントはまだありません。",
  "Kommentar schreiben … (Strg+Enter zum Senden)":"コメントを書く…（Ctrl+Enterで送信）",
  "Senden":"送信",
  "Änderungsverlauf anzeigen":"変更履歴を表示",
  "Kommentar löschen?":"コメントを削除しますか？",
  "hat die Aufgabe angelegt":"がタスクを作成しました",
  "Automatisch":"自動",
  "(Eröffnung verschoben)":"（開業日変更）",
  "Du":"あなた",
  "Unbekannt":"不明",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"まだ割り当てられたタスクはありません。担当者は「タスク」で編集時に設定します。",
  "Keine offenen Aufgaben – alles erledigt.":"未完了のタスクはありません – すべて完了です。",
  "Hotel":"ホテル",
  "kein Termin":"期限なし",
  "· am Eröffnungstag":"· 開業当日",
  "Tage vor":"日前",
  "Tage nach":"日後",
  "Eröffnung":"開業",
  "Vorlage: Standard-Eröffnungsplanung":"テンプレート：標準開業計画",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"全部門の典型的な開業準備タスクとマイルストーンを、開業日を基準に予定します。開業日が変わると、これらの日付も自動的に移動します（日付を手動で変更するまで）。",
  "Wird geprüft…":"確認中…",
  "Die Vorlage ist bereits vollständig angewendet.":"テンプレートはすでにすべて適用されています。",
  "Neu angelegt werden":"新規作成",
  "Aufgaben und":"件のタスクと",
  "Meilensteine angelegt.":"件のマイルストーンを作成しました。",
  "Vorlage anwenden":"テンプレートを適用",
  "sind schon vorhanden und werden übersprungen)":"件はすでに存在するためスキップ）",
  "vergangene weggelassen.":"件の過去分を除外。",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"件は期限が今日より前になります。これらを除外する（除外しない場合は遅延として作成されます）。",
  "Aufgaben aus Excel oder CSV importieren":"ExcelまたはCSVからタスクをインポート",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"ファイルの最初のシート、1行につき1タスク。「タスク」「部門」「優先度」「ステータス」「期限」「担当」などの列は自動認識されます（英語・ドイツ語も可）。",
  "Spalten zuordnen":"列の割り当て",
  "– nicht importieren –":"– インポートしない –",
  "(Pflicht)":"（必須）",
  "Spalte":"列",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"不明な優先度は「中」、不明なステータスは「未着手」、部門なしは「全般」になります。担当者はテキストとして取り込まれます。チームメンバーは後で割り当てられます。",
  "Importiert…":"インポート中…",
  "Schließen":"閉じる",
  "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"ファイルの見出しの下に行が見つかりませんでした。",
  "Datei konnte nicht gelesen werden:":"ファイルを読み込めませんでした：",
  "Meilenstein":"マイルストーン",
  "Datum":"日付",
  "Kritikalität":"重要度",
  "Keine offenen Meilensteine.":"未完了のマイルストーンはありません。",
  "Heute":"今日",
  "Monate":"か月",
  "nur offene Aufgaben":"未完了のタスクのみ",
  "erledigt":"完了",
  "blockiert":"ブロック中",
  "überfällig":"遅延",
  "◆ Meilenstein":"◆ マイルストーン",
  "Noch keine Aufgaben oder Meilensteine mit Termin.":"日付のあるタスクやマイルストーンはまだありません。",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"点にマウスを合わせるとタスクが表示されます。大きい点は緊急タスクです。",
  "+ Risiko":"+ リスク",
  "Risiko":"リスク",
  "Gegenmaßnahme":"対策",
  "Gegenmaßnahme (optional)":"対策（任意）",
  "Score":"スコア",
  "Wahrscheinlichkeit:":"発生確率：",
  "Auswirkung:":"影響度：",
  "Maßnahme:":"対策：",
  "keine festgelegt":"未設定",
  "Keine Risiken erfasst.":"登録されたリスクはありません。",
  "+ Budgetposten":"+ 予算項目",
  "Posten":"項目",
  "Posten, z. B. Matratzen":"項目（例：マットレス）",
  "Plan":"計画",
  "Ist":"実績",
  "Plan (€)":"計画（€）",
  "Ist (€)":"実績（€）",
  "Notiz":"メモ",
  "Noch keine Budgetposten.":"予算項目はまだありません。",
  "Kein Budget erfasst.":"予算が登録されていません。",
  "Ist vs. Plan je Abteilung":"部門別 実績 vs 計画",
  "NOCH VERFÜGBAR":"残予算",
  "ÜBERSCHRITTEN":"予算超過",
  "verfügbar":"残り",
  "überschritten":"超過",
  "Alle Abteilungen im Plan.":"すべての部門が計画内です。",
  "% vom Plan":"% （計画比）",
  "% über Plan)":"% 計画超過）",
  "+ Stelle":"+ ポジション",
  "Stelle":"ポジション",
  "z. B. Rezeptionist/in":"例：フロントスタッフ",
  "Benötigt":"必要人数",
  "Besetzt":"充足",
  "Start":"開始日",
  "Personen":"名",
  "Besetzung je Abteilung":"部門別の充足状況",
  "Noch keine Stellen angelegt.":"ポジションはまだ作成されていません。",
  "Keine Stellen erfasst.":"登録されたポジションはありません。",
  "Eine Person mehr":"1名増やす",
  "Eine Person weniger":"1名減らす",
  "Stellen mit Lücken":"件のポジションに欠員",
  "1 Stelle mit Lücken":"1件のポジションに欠員",
  "Bitte eine Stellenbezeichnung eingeben.":"職種名を入力してください。",
  "„Benötigt“ muss mindestens 1 sein.":"「必要人数」は1以上にしてください。",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"「充足」は0から「必要人数」の間にしてください。",
  "weitere Stellen.":"件のポジション。",
  "% besetzt":"% 充足",
  "Dateien hochladen":"ファイルをアップロード",
  "oder hierher ziehen · max. 25 MB je Datei":"またはここにドラッグ · 1ファイル最大25MB",
  "Noch keine Dokumente.":"ドキュメントはまだありません。",
  "Herunterladen":"ダウンロード",
  "Datei anhängen":"ファイルを添付",
  "ANHÄNGE":"添付ファイル",
  "Keine Anhänge.":"添付ファイルなし。",
  "Lädt hoch:":"アップロード中：",
  "Hochladen fehlgeschlagen":"アップロードに失敗しました",
  "Teammitglied einladen":"チームメンバーを招待",
  "E-Mail-Adresse":"メールアドレス",
  "Einladen":"招待",
  "Mitglieder":"メンバー",
  "(du)":"（あなた）",
  "Ausstehende Einladungen":"保留中の招待",
  "Link kopieren":"リンクをコピー",
  "Kopiert!":"コピーしました！",
  "Entfernen":"削除",
  "Teammitglied":"チームメンバー",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"招待された人はメールで招待リンクを受け取ります。そのリンクで登録またはログインすると、自動的にあなたの組織に参加します。メールが届かない場合は、下のリンクをコピーして直接渡すこともできます。",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"はダッシュボード、AI状況レポート、ステータスレポートを閲覧しコメントできますが、変更はできません。オーナーや投資家に最適です。",
  "Sprache der Organisation":"組織の言語",
  "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"全メンバーの画面、メール、開業準備テンプレート、AI状況レポートに適用されます。",
  "Name der Organisation, z. B. Hotelgruppe Wien":"組織名（例：東京ホテルグループ）",
  "Umbenennen":"名前を変更",
  "Meine Organisation":"マイ組織",
  "Gefahrenzone":"危険ゾーン",
  "Organisation verlassen":"組織を退出",
  "Organisation endgültig löschen":"組織を完全に削除",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"組織を退出すると、その組織のすべてのホテルにアクセスできなくなります。",
  "Löscht":"削除対象：",
  "Das kann nicht rückgängig gemacht werden.":"この操作は元に戻せません。",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"をすべてのホテル、タスク、コメント、ドキュメント、レポートとともに完全に削除します。継続中のサブスクリプションは直ちに終了します。必要に応じて、先に各ホテルを「Excelエクスポート」で書き出してください。",
  "Zur Bestätigung den Namen der Organisation eingeben:":"確認のため組織名を入力してください：",
  "Wird gelöscht…":"削除中…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"招待を作成しましたが、メールは送信されていません（メール送信が未設定）。下のリンクをコピーして共有してください。",
  "Eigentümer-Ansicht:":"オーナービュー：",
  "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"現在の状況、AI状況レポート、ステータスレポートを閲覧できます。変更できるのはプロジェクトチームのメンバーのみです。",
  "ANGEMELDET ALS":"ログイン中のアカウント",
  "Passwort ändern":"パスワードを変更",
  "Neues Passwort":"新しいパスワード",
  "Neues Passwort wiederholen":"新しいパスワード（確認）",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"新しいパスワードは8文字以上にしてください。",
  "Die beiden Passwörter stimmen nicht überein.":"2つのパスワードが一致しません。",
  "Passwort geändert.":"パスワードを変更しました。",
  "Passwort konnte nicht geändert werden.":"パスワードを変更できませんでした。",
  "Konto löschen":"アカウントを削除",
  "Konto endgültig löschen":"アカウントを完全に削除",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"ログイン情報とメンバーシップを削除します。あなただけが所属する組織はすべてのデータとともに削除されます（継続中のサブスクリプションは直ちに終了）。他のメンバーがいる組織のデータは残ります。そこで最後の管理者の場合は、先に「チーム」で権限を引き継いでください。",
  "Tarif wählen":"プランを選択",
  "Zahlungsart ändern":"支払い方法を変更",
  "AKTUELLER TARIF":"現在のプラン",
  "Testphase":"無料トライアル",
  "Aktiv":"有効",
  "Aktuell":"現在",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"サブスクリプションを管理（請求書、支払い方法、解約）",
  "Öffnet…":"開いています…",
  "Öffnet Bezahlseite…":"決済ページを開いています…",
  "Nur Admins der Organisation können das Abo ändern.":"サブスクリプションを変更できるのは組織の管理者のみです。",
  "Die Online-Bezahlung wird gerade eingerichtet.":"オンライン決済は現在準備中です。",
  "Für ein Abo schreib an":"サブスクリプションのお問い合わせ先：",
  "pro Monat zzgl. USt., monatlich kündbar":"月額（税別）、毎月解約可能",
  "Bald verfügbar":"近日公開",
  "Über „Abo verwalten“ wechseln":"「サブスクリプションを管理」から変更",
  "auf Anfrage":"要問い合わせ",
  "Jahresvertrag":"年間契約",
  "Mehr als 5 Hotels":"6軒以上のホテル",
  "Eigene Vorlagen je Marke":"ブランドごとの独自テンプレート",
  "Onboarding und Schulung":"導入支援と研修",
  "Kontakt aufnehmen":"お問い合わせ",
  "Status aktualisieren":"状態を更新",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"決済はStripeで安全に処理されます。請求書はメールで届き、「サブスクリプションを管理」から確認できます。",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"ありがとうございます！お支払いが完了しました。数秒でサブスクリプションが有効になります。",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"お支払いはキャンセルされました。料金は発生していません。",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"トライアル期間が終了しました。Ouvertureは閲覧専用モードです。データはすべて保持されます。",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"有効なサブスクリプションがありません。Ouvertureは閲覧専用モードです。データはすべて保持されます。",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"前回のお支払いに失敗しました。支払い方法を更新してください。",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"支払い未完了 – 支払い方法を更新してください",
  "Beendet":"終了",
  "Unbezahlt":"未払い",
  "Zahlung nicht abgeschlossen":"支払い未完了",
  "1 Hotel-Eröffnung":"ホテル開業 1軒",
  "Unbegrenzt viele Teammitglieder":"チームメンバー無制限",
  "Vorlage mit Pre-Opening-Plan":"開業準備計画テンプレート",
  "Statusbericht als PDF":"PDFステータスレポート",
  "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"最大5軒のホテル開業を同時管理",
  "Alles aus Starter":"Starterの全機能",
  "Für Hotelgruppen und Beratungen":"ホテルグループ・コンサルティング会社向け",
  "Bevorzugter Support":"優先サポート",
  "← Zurück":"← 戻る",
  "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"印刷ダイアログで送信先に「PDFに保存」を選択してください。",
  "Als PDF speichern / Drucken":"PDFとして保存 / 印刷",
  "STATUSBERICHT PRE-OPENING":"開業準備ステータスレポート",
  "Stand:":"時点：",
  "Eröffnung:":"開業：",
  "AUFGABEN":"タスク",
  "MEILENSTEINE":"マイルストーン",
  "BUDGET (IST / PLAN)":"予算（実績 / 計画）",
  "PERSONAL":"人員",
  "Überfällige Aufgaben mit hoher Priorität":"期限切れの優先度の高いタスク",
  "Blockiert:":"ブロック中：",
  "Größte Risiken":"最大のリスク",
  "Noch keine Abteilungsdaten.":"部門データはまだありません。",
  "Erstellt mit Ouverture":"Ouvertureで作成",
  "KI-Lagebericht vom":"AI状況レポート：",
  "im Plan":"計画どおり",
  "gefährdet":"危険",
  "Überfällig":"遅延",
  "ÜBERFÄLLIG":"遅延",
  "Da ist etwas schiefgelaufen":"問題が発生しました",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"エラーは自動的に報告されました。データは保存されています。ページを再読み込みしてください。",
  "Seite neu laden":"ページを再読み込み",
  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"変更できません：閲覧のみの権限（オーナー）であるか、この組織のサブスクリプションが有効ではありません（例：トライアル終了）。管理者は「チーム」で役割を、「サブスクリプション」でプランを変更できます。",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"現在のプランではホテルを追加できません（上限に達したか、トライアル終了）。管理者は「サブスクリプション」でプランを変更できます。",
  "Nur Admins der Organisation können das Abo verwalten.":"サブスクリプションを管理できるのは組織の管理者のみです。",
  "Keine Aufgaben mit Titel gefunden.":"タイトルのあるタスクが見つかりません。",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"管理者が少なくとも1人必要です。先に別の人を管理者にしてください。",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"最後の管理者は組織を退出できません。先に別の人を管理者にするか、組織を削除してください。",
  "Stand":"時点",
  "Währung":"通貨",
  "Währung für das Budget":"予算の通貨",
  "Euro (€)":"ユーロ（€）",
  "Schweizer Franken (CHF)":"スイスフラン（CHF）",
  "Britisches Pfund (£)":"英ポンド（£）",
  "US-Dollar ($)":"米ドル（$）",
  "VAE-Dirham (AED)":"UAEディルハム（AED）",
  "Saudi-Riyal (SAR)":"サウジアラビア・リヤル（SAR）",
  "Katar-Riyal (QAR)":"カタール・リヤル（QAR）",
  "Sprache":"言語",
  "Wie die Organisation":"組織と同じ",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"言語設定はあなたにのみ適用されます。選択しない場合、Ouvertureは組織の標準言語に従います。",
  "Standardsprache der Organisation":"組織の標準言語",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"メール、開業準備テンプレート、AI状況レポート、および言語を選択していない全メンバーに適用されます。",
  "Meine Sprache":"表示言語",
  "Ablehnen":"却下",
  "Abteilungen":"部門",
  "Abteilungsleitung":"部門長",
  "Antrag abgelehnt.":"申請を却下しました。",
  "Antrag genehmigt.":"申請を承認しました。",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"申請を送信しました。部門長が判断します。",
  "Antrag stellen":"申請する",
  "Antrag zurückgezogen.":"申請を取り下げました。",
  "Anträge zur Entscheidung":"承認待ちの申請",
  "Antwort:":"回答：",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"前週の勤務シフトを今週にコピーしますか？すでに予定がある日は変更されません。",
  "Beginn":"開始",
  "Begründung für die Ablehnung (optional)":"却下の理由（任意）",
  "Besetzung":"配置人数",
  "Bis":"終了日",
  "Deine Ansicht:":"あなたの表示：",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"判断するのは部門長です。質問があれば直接相談してください。",
  "Dienstplan":"勤務表",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"まだ部門が割り当てられていません。管理者が「チーム」で設定すると、ここに部門の勤務表が表示されます。",
  "Drucken":"印刷",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"このホテルで交代できる今後のシフトはありません。",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"あなたの部門のタスクと、あなたに割り当てられたすべてのタスクが表示されます。予算・リスク・人員は部門長が確認します。",
  "Ende":"終了",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"エクスポートに失敗しました：",
  "Frei":"休み",
  "Frei-Wunsch":"休日希望",
  "Früh":"早番",
  "Genehmigen":"承認",
  "Genehmigt":"承認済み",
  "Abgelehnt":"却下",
  "Zurückgezogen":"取り下げ",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"今後8週間に予定されているシフトはありません。",
  "Keine Abteilung":"部門なし",
  "Krank":"病欠",
  "KW":"週",
  "Meine Anträge":"自分の申請",
  "Meine Schicht":"自分のシフト",
  "Meine Schichten":"マイシフト",
  "Mindestbesetzung":"最低配置人数",
  "Mitarbeitende":"スタッフ",
  "Nacht":"夜勤",
  "Name ohne Login (z. B. Aushilfe)":"ログインなしの名前（例：臨時スタッフ）",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"この部門にはまだ誰もいません。「チーム」でスタッフを割り当てるか、下に名前を入力してください。",
  "Nächste Woche":"翌週",
  "Vorige Woche":"前週",
  "Bitte wählen":"選択してください",
  "Offen":"未処理",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"部門がない場合、この人は直接割り当てられたタスクのみ表示されます。",
  "Schicht bearbeiten":"シフトを編集",
  "Schicht eintragen":"シフトを追加",
  "Schichten, die du übernehmen sollst":"引き継ぎを依頼されたシフト",
  "Schichttausch":"シフト交代",
  "Spät":"遅番",
  "Tausch":"交代",
  "Unterbesetzt:":"人員不足：",
  "Urlaub":"休暇",
  "Von":"開始日",
  "Vorwoche übernehmen":"前週をコピー",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"この部門ではシフトごとに何人必要ですか？不足すると勤務表が警告します。",
  "Zeile hinzufügen":"行を追加",
  "Zurückziehen":"取り下げる",
  "Zwischen":"中番",
  "ohne Login":"ログインなし",
  "Übernimmt":"引き継ぐ人",
  "Übernommene Schichten:":"コピーしたシフト：",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"は自部門のタスクと自分のタスク、勤務表のみを閲覧でき、休暇・休日希望・シフト交代を申請できます。",
  "sieht und verwaltet alles, auch Abo und Team.":"はサブスクリプションやチームを含め、すべてを閲覧・管理します。",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"は担当部門のタスク、予算、リスク、人員、勤務表をすべて閲覧・管理し、申請を承認します。",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"変更できません：権限がない（例：オーナー閲覧や別部門）か、この組織のサブスクリプションが有効ではありません（例：トライアル終了）。管理者は「チーム」で役割と部門を、「サブスクリプション」でプランを変更できます。",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"AI状況レポートは管理者と部門長が作成します。",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"申請できません：自分の部門または自分のシフトに関するもので、引き継ぐ人がチームに所属している必要があります。",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"申請を判断できるのは部門長または管理者のみです。",
  "Dieser Antrag wurde bereits bearbeitet.":"この申請はすでに処理されています。",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"取り下げられるのは自分の未処理の申請のみです。",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"担当者を選ぶか、名前を入力してください。",
  "Diese Schicht kannst du nicht löschen.":"このシフトは削除できません。",
  "Quell- und Zielwoche sind gleich.":"コピー元とコピー先の週が同じです。",
  "Nur Admins können Abteilungen zuordnen.":"部門を割り当てられるのは管理者のみです。",
};
I18N_PATTERNS.ja = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "開業まであと$1日"],
  [/^Eröffnung war vor (\d+) Tagen$/, "開業から$1日経過"],
  [/^noch (\d+) Tage$/, "あと$1日"],
  [/^seit (\d+) Tagen eröffnet$/, "開業から$1日"],
  [/^Testphase: noch 1 Tag\.$/, "トライアル：残り1日。"],
  [/^Testphase: noch (\d+) Tage\.$/, "トライアル：残り$1日。"],
  [/^Testphase bis (.+)$/, "トライアル期限 $1"],
  [/^Testphase abgelaufen am (.+)$/, "トライアルは$1に終了しました"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "有効 · 次回請求 $1"],
  [/^Gekündigt – läuft bis (.+)$/, "解約済み – $1まで利用可能"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "$2軒中$1軒を利用中"],
  [/^Personal (\d+) % besetzt$/, "人員充足率 $1%"],
  [/^Stand (.+)$/, "$1 時点"],
  [/^seit (.+)$/, "$1から"],
  [/^Stand: (.+)$/, "時点：$1"],
  [/^erstellt von (.+)$/, "作成者：$1"],
  [/^(\d+) Aufgaben importieren$/, "$1件のタスクをインポート"],
  [/^(\d+) Aufgaben importiert\.$/, "$1件のタスクをインポートしました。"],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "$1件のタスクをインポートし、空行$2件をスキップしました。"],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "最初の行のプレビュー（$2行中$1行にタスク名あり）："],
  [/^(.+) wählen$/, "$1を選択"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 は $2 になりました。"],
  [/^(.+) wurde entfernt\.$/, "$1 を削除しました。"],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "$1 に招待メールを送信しました。"],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "確認のため「$1」と入力"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "確認のため組織名を入力してください：$1"],
  [/^(\d+) Personen eingestellt · (\d+) offen$/, "$1名採用済み · $2名未充足"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$2名中$1名採用済み · $3名未充足"],
  [/^(\d+) offen · (\d+) überfällig$/, "未完了$1件 · 遅延$2件"],
  [/^(\d+) gefährdet$/, "危険 $1件"],
  [/^(\d+) besetzt$/, "$1名充足"],
  [/^(.+) ausgegeben$/, "$1 支出済み"],
  [/^Um (.+) überschritten$/, "$1 超過"],
  [/^… und (\d+) weitere\.$/, "… ほか$1件。"],
  [/^… und (\d+) weitere Stellen\.$/, "… ほか$1件のポジション。"],
  [/^(\d+) überfällig$/, "遅延 $1件"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "計画 $1 · 実績 $2 · 残り $3"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "$2名中$1名採用済み · $3名未充足"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "「$1」は25MBを超えています。"],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "$1 を組織から削除しますか？すぐにアクセスできなくなります。タスクは残りますが、担当者なしになります。"],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "本当に「$1」を退出しますか？管理者が再招待するまでアクセスできなくなります。"],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "本当に$1を削除しますか？この操作は元に戻せません。"],
  [/^Aufgabe „(.+)“$/, "タスク「$1」"],
  [/^Risiko „(.+)“$/, "リスク「$1」"],
  [/^Meilenstein „(.+)“$/, "マイルストーン「$1」"],
  [/^Stelle „(.+)“$/, "ポジション「$1」"],
  [/^Budgetposten „(.+)“$/, "予算項目「$1」"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "「$1」を削除しますか？ファイルは完全に削除されます。"],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "1日の上限に達しました：AI状況レポートは組織あたり24時間で最大$1件です。"],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "決済ページを開けませんでした：$1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "次の組織で最後の管理者です：$1。先にそこで「チーム」から別の人を管理者にしてください。"],
  [/^Plan \((.+)\)$/, "計画（$1）"],
  [/^Ist \((.+)\)$/, "実績（$1）"],
];

/* ------------------------------ Chinesisch (vereinfacht) ------------------------------ */
I18N.zh = {
  "Dashboard":"仪表板",
  "Meine Aufgaben":"我的任务",
  "Aufgaben":"任务",
  "Meilensteine":"里程碑",
  "Zeitstrahl":"时间轴",
  "Risiken":"风险",
  "Budget":"预算",
  "Personal":"人员",
  "Dokumente":"文档",
  "Team":"团队",
  "Abo":"订阅",
  "Konto":"账户",
  "Hotel wechseln":"切换酒店",
  "Abmelden":"退出登录",
  "ORGANISATION":"组织",
  "Organisation":"组织",
  "Statusbericht":"状态报告",
  "Excel-Export":"导出 Excel",
  "Kalender":"日历",
  "Hotel bearbeiten":"编辑酒店",
  "Beispiel entfernen":"移除示例",
  "Beispielhotel":"示例酒店",
  "Beispiel":"示例",
  "Zimmer":"间客房",
  "Zimmer · Eröffnung":"间客房 · 开业",
  "Lädt…":"加载中…",
  "Hotels werden geladen…":"正在加载酒店…",
  "Abo-Daten werden geladen…":"正在加载订阅…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"用于 Outlook、Google 或 Apple 日历的未完成截止日期和里程碑",
  "Nicht begonnen":"未开始",
  "In Arbeit":"进行中",
  "Blockiert":"受阻",
  "In Prüfung":"审核中",
  "Abgeschlossen":"已完成",
  "Kritisch":"紧急",
  "Hoch":"高",
  "Mittel":"中",
  "Niedrig":"低",
  "Geplant":"已计划",
  "Gefährdet":"有风险",
  "Rezeption & Empfang":"前厅",
  "Housekeeping":"客房部",
  "Food & Beverage":"餐饮部",
  "Technik":"工程部",
  "IT & Systeme":"IT 与系统",
  "Einkauf":"采购",
  "Sicherheit":"安全保卫",
  "Allgemein":"综合",
  "Ausstattung":"设备",
  "Bau & Instandhaltung":"建设与维护",
  "Dienstleister":"服务供应商",
  "IT & Technik":"IT 与技术",
  "Marketing":"市场营销",
  "Personal & Schulung":"人员与培训",
  "Vorräte":"物料",
  "Sonstiges":"其他",
  "sofort":"立即",
  "diese Woche":"本周",
  "diesen Monat":"本月",
  "Admin":"管理员",
  "Mitglied":"成员",
  "Eigentümer (nur lesen)":"业主（只读）",
  "Anmelden":"登录",
  "Registrieren":"注册",
  "Neues Konto erstellen":"创建新账户",
  "Konto erstellen":"创建账户",
  "E-Mail":"电子邮箱",
  "Passwort":"密码",
  "Passwort vergessen?":"忘记密码？",
  "Passwort vergessen":"忘记密码",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"请输入你的电子邮箱，我们会发送重置链接。",
  "Link schicken":"发送链接",
  "Zurück zur Anmeldung":"返回登录",
  "Bitte warten…":"请稍候…",
  "Neues Passwort festlegen":"设置新密码",
  "Passwort speichern":"保存密码",
  "Passwort geändert":"密码已更改",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"现在可以使用新密码登录了。",
  "Zur Anmeldung":"前往登录",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"酒店开业筹备软件",
  "Bis zum ersten Gast –":"直到迎来第一位客人——",
  "alles im Blick.":"一切尽在掌握。",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"任务 · 里程碑 · 风险 · AI 状况报告",
  "Login fehlgeschlagen.":"登录失败。",
  "Registrierung fehlgeschlagen.":"注册失败。",
  "Das Passwort muss mindestens 6 Zeichen haben.":"密码至少需要 6 个字符。",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"账户已创建！请通过我们发送的链接确认电子邮箱，然后登录。",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"如果该邮箱已注册，我们刚刚已发送重置密码的链接。请查看收件箱（包括垃圾邮件文件夹）。",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"会话已过期，请重新登录。",
  "Bitte erneut anmelden.":"请重新登录。",
  "Hotel auswählen":"选择酒店",
  "+ Neues Hotel":"+ 新酒店",
  "Neues Hotel":"新酒店",
  "Name":"名称",
  "Stadt":"城市",
  "Land":"国家",
  "Zimmeranzahl":"客房数量",
  "Eröffnungsdatum":"开业日期",
  "Hotel anlegen":"创建酒店",
  "Speichert…":"正在保存…",
  "Abbrechen":"取消",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"想先试试吗？示例酒店展示一个距开业 30 天的项目——包含任务、风险、预算和人员。不计入你的套餐。",
  "Beispielhotel öffnen":"打开示例酒店",
  "Wird angelegt…":"正在创建…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"该组织还没有酒店。项目团队创建酒店后，你会在这里看到。",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"删除示例酒店及所有示例数据？你可以随时重新创建。",
  "Speichern":"保存",
  "Gespeichert.":"已保存。",
  "Speichern & weiter":"保存并继续",
  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"准备度 · 按计划 ⓘ",
  "IM ZEITPLAN":"按计划",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"截至今天应完成事项的完成比例——扣除风险、人员和预算缺口。100% 表示完全按计划。",
  "Gesamtfortschritt:":"总体进度：",
  "aller Aufgaben erledigt":"的任务已完成",
  "% aller Aufgaben erledigt":"% 的任务已完成",
  "überfällig ·":"项逾期 ·",
  "hohe Risiken":"项高风险",
  "Bereitschaft je Abteilung":"各部门准备度",
  "Budget überschritten:":"超出预算：",
  "Stellen über Starttermin offen":"个职位已过入职日期仍空缺",
  "Noch keine Posten – hier anlegen →":"还没有条目——在此添加 →",
  "Noch keine Stellen – hier anlegen →":"还没有职位——在此添加 →",
  "Überfällige kritische Aufgaben":"逾期的紧急任务",
  "Höchste Risiken":"最高风险",
  "Keine.":"无。",
  "· Score":"· 评分",
  "Personen eingestellt ·":"人已招聘 ·",
  "offen":"空缺",
  "überschritten um":"超出",
  "KI-Lagebericht":"AI 状况报告",
  "Lagebericht erstellen":"生成报告",
  "Neu erstellen":"重新生成",
  "Analysiert…":"分析中…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"AI 会分析任务、里程碑、风险、预算和人员，为管理层和业主撰写评估——包含信号灯、需处理事项和后续步骤。",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"AI 正在分析项目，通常需要 20–60 秒…",
  "Handlungsbedarf":"需处理事项",
  "Risikohinweise":"风险提示",
  "Was gut läuft":"进展顺利的方面",
  "Nächste Schritte (7 Tage)":"后续步骤（7 天）",
  "Risikohinweise und nächste Schritte anzeigen":"显示风险提示和后续步骤",
  "Weniger anzeigen":"收起",
  "Im Plan":"按计划",
  "Verzug – aufholbar":"延误——可追回",
  "Eröffnung gefährdet":"开业有风险",
  "Einschätzung":"评估",
  "+ Aufgabe":"+ 任务",
  "Aus Excel importieren":"从 Excel 导入",
  "Aus Vorlage ergänzen":"从模板补充",
  "Aufgabe":"任务",
  "Titel":"标题",
  "Abteilung":"部门",
  "Priorität":"优先级",
  "Status":"状态",
  "Fällig":"截止",
  "Fällig am":"截止日期",
  "Zuständig":"负责人",
  "Zuständig im Team":"团队负责人",
  "Extern / Sonstige":"外部 / 其他",
  "— niemand aus dem Team —":"— 团队中无人负责 —",
  "Alle Abteilungen":"所有部门",
  "Alle Status":"所有状态",
  "Alle offenen":"所有未完成",
  "Nur meine":"仅我的",
  "Ohne Zuständigkeit":"无人负责",
  "Erledigte anzeigen":"显示已完成",
  "Sortierung":"排序",
  "Nach Termin":"按截止日期",
  "Nach Priorität":"按优先级",
  "Nach Abteilung":"按部门",
  "Filter zurücksetzen":"重置筛选",
  "Keine Aufgabe passt zu den Filtern.":"没有符合筛选条件的任务。",
  "Suchen: Titel, Zuständige, Externe …":"搜索：标题、负责人、外部…",
  "Bearbeiten":"编辑",
  "Löschen":"删除",
  "löschen":"删除",
  "Kommentare und Verlauf":"评论和记录",
  "Noch keine Kommentare.":"还没有评论。",
  "Kommentar schreiben … (Strg+Enter zum Senden)":"写评论…（Ctrl+Enter 发送）",
  "Senden":"发送",
  "Änderungsverlauf anzeigen":"显示变更记录",
  "Kommentar löschen?":"删除评论？",
  "hat die Aufgabe angelegt":"创建了任务",
  "Automatisch":"自动",
  "(Eröffnung verschoben)":"（开业日期已调整）",
  "Du":"你",
  "Unbekannt":"未知",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"你还没有被分配任务。负责人可在“任务”中编辑时设置。",
  "Keine offenen Aufgaben – alles erledigt.":"没有未完成的任务——全部完成。",
  "Hotel":"酒店",
  "kein Termin":"无截止日期",
  "· am Eröffnungstag":"· 开业当天",
  "Tage vor":"天前",
  "Tage nach":"天后",
  "Eröffnung":"开业",
  "Vorlage: Standard-Eröffnungsplanung":"模板：标准开业计划",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"适用于所有部门的典型开业筹备任务和里程碑，按开业日期倒排。开业日期变化时，这些日期会自动随之调整——直到你手动修改某个日期。",
  "Wird geprüft…":"正在检查…",
  "Die Vorlage ist bereits vollständig angewendet.":"模板已全部应用。",
  "Neu angelegt werden":"将新建",
  "Aufgaben und":"项任务和",
  "Meilensteine angelegt.":"个里程碑已创建。",
  "Vorlage anwenden":"应用模板",
  "sind schon vorhanden und werden übersprungen)":"项已存在，将跳过）",
  "vergangene weggelassen.":"项过去的已省略。",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"项的截止日期早于今天。省略这些（否则将作为逾期创建）。",
  "Aufgaben aus Excel oder CSV importieren":"从 Excel 或 CSV 导入任务",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"文件的第一个工作表，每行一项任务。“任务”“部门”“优先级”“状态”“截止”“负责人”等列会被自动识别——英文或德文也可以。",
  "Spalten zuordnen":"对应列",
  "– nicht importieren –":"– 不导入 –",
  "(Pflicht)":"（必填）",
  "Spalte":"列",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"未知优先级设为“中”，未知状态设为“未开始”，缺少部门设为“综合”。负责人以文本导入——之后可分配团队成员。",
  "Importiert…":"正在导入…",
  "Schließen":"关闭",
  "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"文件中标题行下方没有找到数据。",
  "Datei konnte nicht gelesen werden:":"无法读取文件：",
  "Meilenstein":"里程碑",
  "Datum":"日期",
  "Kritikalität":"重要程度",
  "Keine offenen Meilensteine.":"没有未完成的里程碑。",
  "Heute":"今天",
  "Monate":"个月",
  "nur offene Aufgaben":"仅未完成任务",
  "erledigt":"已完成",
  "blockiert":"受阻",
  "überfällig":"逾期",
  "◆ Meilenstein":"◆ 里程碑",
  "Noch keine Aufgaben oder Meilensteine mit Termin.":"还没有带日期的任务或里程碑。",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"将鼠标移到点上即可查看任务。较大的点表示紧急任务。",
  "+ Risiko":"+ 风险",
  "Risiko":"风险",
  "Gegenmaßnahme":"应对措施",
  "Gegenmaßnahme (optional)":"应对措施（可选）",
  "Score":"评分",
  "Wahrscheinlichkeit:":"可能性：",
  "Auswirkung:":"影响：",
  "Maßnahme:":"措施：",
  "keine festgelegt":"未设定",
  "Keine Risiken erfasst.":"没有登记风险。",
  "+ Budgetposten":"+ 预算项",
  "Posten":"项目",
  "Posten, z. B. Matratzen":"项目，例如床垫",
  "Plan":"计划",
  "Ist":"实际",
  "Plan (€)":"计划（€）",
  "Ist (€)":"实际（€）",
  "Notiz":"备注",
  "Noch keine Budgetposten.":"还没有预算项。",
  "Kein Budget erfasst.":"没有登记预算。",
  "Ist vs. Plan je Abteilung":"各部门实际 vs 计划",
  "NOCH VERFÜGBAR":"剩余可用",
  "ÜBERSCHRITTEN":"已超支",
  "verfügbar":"可用",
  "überschritten":"超支",
  "Alle Abteilungen im Plan.":"所有部门均在计划内。",
  "% vom Plan":"% 占计划",
  "% über Plan)":"% 超出计划）",
  "+ Stelle":"+ 职位",
  "Stelle":"职位",
  "z. B. Rezeptionist/in":"例如前台接待",
  "Benötigt":"需要",
  "Besetzt":"已到岗",
  "Start":"入职",
  "Personen":"人",
  "Besetzung je Abteilung":"各部门人员到岗情况",
  "Noch keine Stellen angelegt.":"还没有创建职位。",
  "Keine Stellen erfasst.":"没有登记职位。",
  "Eine Person mehr":"增加一人",
  "Eine Person weniger":"减少一人",
  "Stellen mit Lücken":"个职位有缺口",
  "1 Stelle mit Lücken":"1 个职位有缺口",
  "Bitte eine Stellenbezeichnung eingeben.":"请输入职位名称。",
  "„Benötigt“ muss mindestens 1 sein.":"“需要”至少为 1。",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"“已到岗”必须在 0 和“需要”之间。",
  "weitere Stellen.":"个其他职位。",
  "% besetzt":"% 到岗",
  "Dateien hochladen":"上传文件",
  "oder hierher ziehen · max. 25 MB je Datei":"或拖到此处 · 每个文件最大 25 MB",
  "Noch keine Dokumente.":"还没有文档。",
  "Herunterladen":"下载",
  "Datei anhängen":"附加文件",
  "ANHÄNGE":"附件",
  "Keine Anhänge.":"没有附件。",
  "Lädt hoch:":"正在上传：",
  "Hochladen fehlgeschlagen":"上传失败",
  "Teammitglied einladen":"邀请团队成员",
  "E-Mail-Adresse":"电子邮箱地址",
  "Einladen":"邀请",
  "Mitglieder":"成员",
  "(du)":"（你）",
  "Ausstehende Einladungen":"待接受的邀请",
  "Link kopieren":"复制链接",
  "Kopiert!":"已复制！",
  "Entfernen":"移除",
  "Teammitglied":"团队成员",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"对方会通过电子邮件收到邀请链接，用它注册或登录后即自动加入你的组织。如果没有收到邮件，你也可以复制下方链接自行转发。",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"可查看仪表板、AI 状况报告和状态报告并发表评论，但不能修改任何内容——非常适合业主和投资人。",
  "Sprache der Organisation":"组织语言",
  "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"适用于所有成员的界面、电子邮件、开业筹备模板和 AI 状况报告。",
  "Name der Organisation, z. B. Hotelgruppe Wien":"组织名称，例如上海酒店集团",
  "Umbenennen":"重命名",
  "Meine Organisation":"我的组织",
  "Gefahrenzone":"危险区域",
  "Organisation verlassen":"退出组织",
  "Organisation endgültig löschen":"永久删除组织",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"退出组织后，你将无法访问其所有酒店。",
  "Löscht":"将永久删除",
  "Das kann nicht rückgängig gemacht werden.":"此操作无法撤销。",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"及其所有酒店、任务、评论、文档和报告。正在进行的订阅会立即终止。如有需要，请先通过“导出 Excel”导出每家酒店。",
  "Zur Bestätigung den Namen der Organisation eingeben:":"请输入组织名称以确认：",
  "Wird gelöscht…":"正在删除…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"邀请已创建，但未发送邮件（未配置邮件发送）。请复制下方链接并转发。",
  "Eigentümer-Ansicht:":"业主视图：",
  "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"你可以查看当前状态、AI 状况报告和状态报告。只有项目团队成员可以修改。",
  "ANGEMELDET ALS":"当前登录",
  "Passwort ändern":"修改密码",
  "Neues Passwort":"新密码",
  "Neues Passwort wiederholen":"重复新密码",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"新密码至少需要 8 个字符。",
  "Die beiden Passwörter stimmen nicht überein.":"两次输入的密码不一致。",
  "Passwort geändert.":"密码已更改。",
  "Passwort konnte nicht geändert werden.":"无法更改密码。",
  "Konto löschen":"删除账户",
  "Konto endgültig löschen":"永久删除账户",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"删除你的登录信息和成员资格。只有你一人的组织将连同所有数据一起删除（正在进行的订阅会立即终止）。有其他成员的组织会保留数据。如果你是那里的最后一位管理员，请先在“团队”中移交该角色。",
  "Tarif wählen":"选择套餐",
  "Zahlungsart ändern":"更改付款方式",
  "AKTUELLER TARIF":"当前套餐",
  "Testphase":"试用期",
  "Aktiv":"有效",
  "Aktuell":"当前",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"管理订阅（发票、付款方式、取消）",
  "Öffnet…":"正在打开…",
  "Öffnet Bezahlseite…":"正在打开付款页面…",
  "Nur Admins der Organisation können das Abo ändern.":"只有组织管理员可以更改订阅。",
  "Die Online-Bezahlung wird gerade eingerichtet.":"在线支付正在配置中。",
  "Für ein Abo schreib an":"如需订阅，请发邮件至",
  "pro Monat zzgl. USt., monatlich kündbar":"每月（不含增值税），可按月取消",
  "Bald verfügbar":"即将推出",
  "Über „Abo verwalten“ wechseln":"通过“管理订阅”切换",
  "auf Anfrage":"按需报价",
  "Jahresvertrag":"年度合同",
  "Mehr als 5 Hotels":"5 家以上酒店",
  "Eigene Vorlagen je Marke":"按品牌定制模板",
  "Onboarding und Schulung":"上线支持与培训",
  "Kontakt aufnehmen":"联系我们",
  "Status aktualisieren":"刷新状态",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"付款由 Stripe 安全处理。发票通过电子邮件发送，也可在“管理订阅”中查看。",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"谢谢！付款成功。订阅将在几秒钟内激活。",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"付款已取消，未产生任何费用。",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"试用期已结束。Ouverture 处于只读模式——所有数据均保留。",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"没有有效订阅。Ouverture 处于只读模式——所有数据均保留。",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"上次付款失败。请更新付款方式。",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"待付款——请更新付款方式",
  "Beendet":"已结束",
  "Unbezahlt":"未付款",
  "Zahlung nicht abgeschlossen":"付款未完成",
  "1 Hotel-Eröffnung":"1 家酒店开业",
  "Unbegrenzt viele Teammitglieder":"团队成员不限",
  "Vorlage mit Pre-Opening-Plan":"开业筹备计划模板",
  "Statusbericht als PDF":"PDF 状态报告",
  "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"最多同时管理 5 家酒店开业",
  "Alles aus Starter":"包含 Starter 全部功能",
  "Für Hotelgruppen und Beratungen":"适合酒店集团和咨询公司",
  "Bevorzugter Support":"优先支持",
  "← Zurück":"← 返回",
  "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"在打印对话框中选择“另存为 PDF”作为目标。",
  "Als PDF speichern / Drucken":"另存为 PDF / 打印",
  "STATUSBERICHT PRE-OPENING":"开业筹备状态报告",
  "Stand:":"截至：",
  "Eröffnung:":"开业：",
  "AUFGABEN":"任务",
  "MEILENSTEINE":"里程碑",
  "BUDGET (IST / PLAN)":"预算（实际 / 计划）",
  "PERSONAL":"人员",
  "Überfällige Aufgaben mit hoher Priorität":"逾期的高优先级任务",
  "Blockiert:":"受阻：",
  "Größte Risiken":"最大风险",
  "Noch keine Abteilungsdaten.":"还没有部门数据。",
  "Erstellt mit Ouverture":"由 Ouverture 生成",
  "KI-Lagebericht vom":"AI 状况报告：",
  "im Plan":"按计划",
  "gefährdet":"有风险",
  "Überfällig":"逾期",
  "ÜBERFÄLLIG":"逾期",
  "Da ist etwas schiefgelaufen":"出现了问题",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"错误已自动上报。你的数据已保存——请重新加载页面。",
  "Seite neu laden":"重新加载页面",
  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"无法修改：你只有只读权限（业主访问），或该组织的订阅未生效（例如试用期已结束）。管理员可在“团队”中更改角色，或在“订阅”中更改套餐。",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"当前套餐无法再添加酒店（已达上限或试用期已结束）。管理员可在“订阅”中更改套餐。",
  "Nur Admins der Organisation können das Abo verwalten.":"只有组织管理员可以管理订阅。",
  "Keine Aufgaben mit Titel gefunden.":"没有找到带标题的任务。",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"至少需要一位管理员。请先将其他人设为管理员。",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"最后一位管理员不能退出组织。请先将其他人设为管理员——或删除该组织。",
  "Stand":"截至",
  "Währung":"货币",
  "Währung für das Budget":"预算货币",
  "Euro (€)":"欧元（€）",
  "Schweizer Franken (CHF)":"瑞士法郎（CHF）",
  "Britisches Pfund (£)":"英镑（£）",
  "US-Dollar ($)":"美元（$）",
  "VAE-Dirham (AED)":"阿联酋迪拉姆（AED）",
  "Saudi-Riyal (SAR)":"沙特里亚尔（SAR）",
  "Katar-Riyal (QAR)":"卡塔尔里亚尔（QAR）",
  "Sprache":"语言",
  "Wie die Organisation":"与组织相同",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"你的语言设置仅对你自己生效。不选择时，Ouverture 使用组织的默认语言。",
  "Standardsprache der Organisation":"组织默认语言",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"适用于电子邮件、开业筹备模板、AI 状况报告以及所有未自行选择语言的成员。",
  "Meine Sprache":"我的语言",
  "Ablehnen":"拒绝",
  "Abteilungen":"部门",
  "Abteilungsleitung":"部门负责人",
  "Antrag abgelehnt.":"申请已拒绝。",
  "Antrag genehmigt.":"申请已批准。",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"申请已提交，由部门负责人审批。",
  "Antrag stellen":"提交申请",
  "Antrag zurückgezogen.":"申请已撤回。",
  "Anträge zur Entscheidung":"待审批的申请",
  "Antwort:":"回复：",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"将上周的工作班次复制到本周？已安排的日期保持不变。",
  "Beginn":"开始",
  "Begründung für die Ablehnung (optional)":"拒绝理由（可选）",
  "Besetzung":"在岗人数",
  "Bis":"至",
  "Deine Ansicht:":"你的视图：",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"由部门负责人决定；如有疑问请直接沟通。",
  "Dienstplan":"排班表",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"你还没有被分配部门。管理员可在“团队”中设置——之后你会在这里看到所在部门的排班表。",
  "Drucken":"打印",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"你在这家酒店没有可以调换的后续班次。",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"你可以看到所在部门的任务以及分配给你的所有任务。预算、风险和人员由部门负责人查看。",
  "Ende":"结束",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"导出失败：",
  "Frei":"休息",
  "Frei-Wunsch":"休息申请",
  "Früh":"早班",
  "Genehmigen":"批准",
  "Genehmigt":"已批准",
  "Abgelehnt":"已拒绝",
  "Zurückgezogen":"已撤回",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"未来八周内没有为你安排班次。",
  "Keine Abteilung":"无部门",
  "Krank":"病假",
  "KW":"周",
  "Meine Anträge":"我的申请",
  "Meine Schicht":"我的班次",
  "Meine Schichten":"我的班次",
  "Mindestbesetzung":"最低在岗人数",
  "Mitarbeitende":"员工",
  "Nacht":"夜班",
  "Name ohne Login (z. B. Aushilfe)":"无账号人员姓名（例如临时工）",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"该部门还没有人员。请在“团队”中分配员工，或在下方输入姓名。",
  "Nächste Woche":"下一周",
  "Vorige Woche":"上一周",
  "Bitte wählen":"请选择",
  "Offen":"待处理",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"没有部门时，此人只能看到直接分配给自己的任务。",
  "Schicht bearbeiten":"编辑班次",
  "Schicht eintragen":"添加班次",
  "Schichten, die du übernehmen sollst":"请你接替的班次",
  "Schichttausch":"调班",
  "Spät":"晚班",
  "Tausch":"调班",
  "Unterbesetzt:":"人手不足：",
  "Urlaub":"休假",
  "Von":"从",
  "Vorwoche übernehmen":"复制上周",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"该部门每个班次需要多少人？人手不足时排班表会提醒。",
  "Zeile hinzufügen":"添加一行",
  "Zurückziehen":"撤回",
  "Zwischen":"中班",
  "ohne Login":"无账号",
  "Übernimmt":"接替人",
  "Übernommene Schichten:":"已复制班次：",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"只能查看所在部门的任务和自己的任务、自己的排班表，并可申请休假、休息和调班。",
  "sieht und verwaltet alles, auch Abo und Team.":"可查看并管理一切，包括订阅和团队。",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"可全面查看并管理所负责的部门——任务、预算、风险、人员和排班表——并审批申请。",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"无法修改：你没有相应权限（例如业主访问或其他部门），或该组织的订阅未生效（例如试用期已结束）。管理员可在“团队”中更改角色和部门，或在“订阅”中更改套餐。",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"AI 状况报告由管理员和部门负责人生成。",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"无法提交申请：申请必须涉及你自己的部门或你自己的班次，且接替人必须是团队成员。",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"只有部门负责人或管理员可以审批申请。",
  "Dieser Antrag wurde bereits bearbeitet.":"该申请已处理。",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"只能撤回你自己尚未处理的申请。",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"请选择人员或输入姓名。",
  "Diese Schicht kannst du nicht löschen.":"你不能删除该班次。",
  "Quell- und Zielwoche sind gleich.":"源周与目标周相同。",
  "Nur Admins können Abteilungen zuordnen.":"只有管理员可以分配部门。",
};
I18N_PATTERNS.zh = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "距开业还有 $1 天"],
  [/^Eröffnung war vor (\d+) Tagen$/, "已开业 $1 天"],
  [/^noch (\d+) Tage$/, "还有 $1 天"],
  [/^seit (\d+) Tagen eröffnet$/, "已开业 $1 天"],
  [/^Testphase: noch 1 Tag\.$/, "试用：剩余 1 天。"],
  [/^Testphase: noch (\d+) Tage\.$/, "试用：剩余 $1 天。"],
  [/^Testphase bis (.+)$/, "试用至 $1"],
  [/^Testphase abgelaufen am (.+)$/, "试用已于 $1 结束"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "有效 · 下次扣费 $1"],
  [/^Gekündigt – läuft bis (.+)$/, "已取消——有效期至 $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "已使用 $1 / $2 家酒店"],
  [/^Personal (\d+) % besetzt$/, "人员到岗 $1%"],
  [/^Stand (.+)$/, "截至 $1"],
  [/^seit (.+)$/, "自 $1 起"],
  [/^Stand: (.+)$/, "截至：$1"],
  [/^erstellt von (.+)$/, "创建人：$1"],
  [/^(\d+) Aufgaben importieren$/, "导入 $1 项任务"],
  [/^(\d+) Aufgaben importiert\.$/, "已导入 $1 项任务。"],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "已导入 $1 项任务，跳过 $2 个空行。"],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "前几行预览（$2 行中有 $1 行包含任务标题）："],
  [/^(.+) wählen$/, "选择$1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 现在是 $2。"],
  [/^(.+) wurde entfernt\.$/, "$1 已被移除。"],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "已通过电子邮件向 $1 发送邀请。"],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "请输入“$1”以确认"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "请输入组织名称以确认：$1"],
  [/^(\d+) Personen eingestellt · (\d+) offen$/, "已招聘 $1 人 · 空缺 $2"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "已招聘 $1 / $2 人 · 空缺 $3"],
  [/^(\d+) offen · (\d+) überfällig$/, "未完成 $1 · 逾期 $2"],
  [/^(\d+) gefährdet$/, "$1 项有风险"],
  [/^(\d+) besetzt$/, "已到岗 $1"],
  [/^(.+) ausgegeben$/, "已支出 $1"],
  [/^Um (.+) überschritten$/, "超出 $1"],
  [/^… und (\d+) weitere\.$/, "… 另有 $1 项。"],
  [/^… und (\d+) weitere Stellen\.$/, "… 另有 $1 个职位。"],
  [/^(\d+) überfällig$/, "逾期 $1 项"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "计划 $1 · 实际 $2 · 可用 $3"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "已招聘 $1 / $2 人 · 空缺 $3"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "“$1”超过 25 MB。"],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "将 $1 从组织中移除？此人将立即失去访问权限；其任务会保留，但没有负责人。"],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "确定要退出“$1”吗？在管理员重新邀请你之前，你将无法访问。"],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "确定删除$1吗？此操作无法撤销。"],
  [/^Aufgabe „(.+)“$/, "任务“$1”"],
  [/^Risiko „(.+)“$/, "风险“$1”"],
  [/^Meilenstein „(.+)“$/, "里程碑“$1”"],
  [/^Stelle „(.+)“$/, "职位“$1”"],
  [/^Budgetposten „(.+)“$/, "预算项“$1”"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "删除“$1”？文件将被永久移除。"],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "已达每日上限：每个组织 24 小时内最多生成 $1 份 AI 状况报告。"],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "无法打开付款页面：$1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "你是以下组织的最后一位管理员：$1。请先在那里的“团队”中将其他人设为管理员。"],
  [/^Plan \((.+)\)$/, "计划（$1）"],
  [/^Ist \((.+)\)$/, "实际（$1）"],
];

/* ------------------------------ Arabisch (von rechts nach links) ------------------------------ */
I18N.ar = {
  "Dashboard":"لوحة التحكم",
  "Meine Aufgaben":"مهامي",
  "Aufgaben":"المهام",
  "Meilensteine":"المراحل الرئيسية",
  "Zeitstrahl":"الخط الزمني",
  "Risiken":"المخاطر",
  "Budget":"الميزانية",
  "Personal":"الموظفون",
  "Dokumente":"المستندات",
  "Team":"الفريق",
  "Abo":"الاشتراك",
  "Konto":"الحساب",
  "Hotel wechseln":"تبديل الفندق",
  "Abmelden":"تسجيل الخروج",
  "ORGANISATION":"المؤسسة",
  "Organisation":"المؤسسة",
  "Statusbericht":"تقرير الحالة",
  "Excel-Export":"تصدير Excel",
  "Kalender":"التقويم",
  "Hotel bearbeiten":"تعديل الفندق",
  "Beispiel entfernen":"إزالة المثال",
  "Beispielhotel":"فندق تجريبي",
  "Beispiel":"مثال",
  "Zimmer":"غرفة",
  "Zimmer · Eröffnung":"غرفة · الافتتاح",
  "Lädt…":"جارٍ التحميل…",
  "Hotels werden geladen…":"جارٍ تحميل الفنادق…",
  "Abo-Daten werden geladen…":"جارٍ تحميل الاشتراك…",
  "Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender":"المواعيد النهائية والمراحل المفتوحة لتقويم Outlook أو Google أو Apple",
  "Nicht begonnen":"لم تبدأ",
  "In Arbeit":"قيد التنفيذ",
  "Blockiert":"متوقفة",
  "In Prüfung":"قيد المراجعة",
  "Abgeschlossen":"مكتملة",
  "Kritisch":"حرجة",
  "Hoch":"عالية",
  "Mittel":"متوسطة",
  "Niedrig":"منخفضة",
  "Geplant":"مخطط لها",
  "Gefährdet":"معرضة للخطر",
  "Rezeption & Empfang":"الاستقبال",
  "Housekeeping":"التدبير الفندقي",
  "Food & Beverage":"الأغذية والمشروبات",
  "Technik":"الصيانة الفنية",
  "IT & Systeme":"تقنية المعلومات والأنظمة",
  "Einkauf":"المشتريات",
  "Sicherheit":"الأمن والسلامة",
  "Allgemein":"عام",
  "Ausstattung":"التجهيزات",
  "Bau & Instandhaltung":"البناء والصيانة",
  "Dienstleister":"مزودو الخدمات",
  "IT & Technik":"تقنية المعلومات والتكنولوجيا",
  "Marketing":"التسويق",
  "Personal & Schulung":"الموظفون والتدريب",
  "Vorräte":"المستلزمات",
  "Sonstiges":"أخرى",
  "sofort":"فورًا",
  "diese Woche":"هذا الأسبوع",
  "diesen Monat":"هذا الشهر",
  "Admin":"مسؤول",
  "Mitglied":"عضو",
  "Eigentümer (nur lesen)":"مالك (قراءة فقط)",
  "Anmelden":"تسجيل الدخول",
  "Registrieren":"إنشاء حساب",
  "Neues Konto erstellen":"إنشاء حساب جديد",
  "Konto erstellen":"إنشاء الحساب",
  "E-Mail":"البريد الإلكتروني",
  "Passwort":"كلمة المرور",
  "Passwort vergessen?":"نسيت كلمة المرور؟",
  "Passwort vergessen":"نسيت كلمة المرور",
  "Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.":"أدخل بريدك الإلكتروني — وسنرسل لك رابطًا لإعادة التعيين.",
  "Link schicken":"إرسال الرابط",
  "Zurück zur Anmeldung":"العودة إلى تسجيل الدخول",
  "Bitte warten…":"يرجى الانتظار…",
  "Neues Passwort festlegen":"تعيين كلمة مرور جديدة",
  "Passwort speichern":"حفظ كلمة المرور",
  "Passwort geändert":"تم تغيير كلمة المرور",
  "Du kannst dich jetzt mit deinem neuen Passwort anmelden.":"يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
  "Zur Anmeldung":"الذهاب إلى تسجيل الدخول",
  "PRE-OPENING-SOFTWARE FÜR HOTELS":"برنامج التحضير للافتتاح للفنادق",
  "Bis zum ersten Gast –":"حتى أول ضيف –",
  "alles im Blick.":"كل شيء تحت السيطرة.",
  "Aufgaben · Meilensteine · Risiken · KI-Lagebericht":"المهام · المراحل · المخاطر · تقرير الذكاء الاصطناعي",
  "Login fehlgeschlagen.":"فشل تسجيل الدخول.",
  "Registrierung fehlgeschlagen.":"فشل إنشاء الحساب.",
  "Das Passwort muss mindestens 6 Zeichen haben.":"يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
  "Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.":"تم إنشاء الحساب! يرجى تأكيد بريدك الإلكتروني عبر الرابط الذي أرسلناه، ثم سجّل الدخول.",
  "Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).":"إذا كان هذا البريد مسجلًا لدينا، فقد أرسلنا إليك للتو رابطًا لإعادة تعيين كلمة المرور. يرجى التحقق من صندوق الوارد (ومجلد الرسائل غير المرغوب فيها).",
  "Deine Sitzung ist abgelaufen – bitte erneut anmelden.":"انتهت صلاحية جلستك – يرجى تسجيل الدخول مرة أخرى.",
  "Bitte erneut anmelden.":"يرجى تسجيل الدخول مرة أخرى.",
  "Hotel auswählen":"اختر فندقًا",
  "+ Neues Hotel":"+ فندق جديد",
  "Neues Hotel":"فندق جديد",
  "Name":"الاسم",
  "Stadt":"المدينة",
  "Land":"الدولة",
  "Zimmeranzahl":"عدد الغرف",
  "Eröffnungsdatum":"تاريخ الافتتاح",
  "Hotel anlegen":"إنشاء الفندق",
  "Speichert…":"جارٍ الحفظ…",
  "Abbrechen":"إلغاء",
  "Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.":"هل تريد التجربة أولًا؟ يعرض الفندق التجريبي مشروعًا قبل 30 يومًا من الافتتاح – مع المهام والمخاطر والميزانية والموظفين. لا يُحتسب ضمن خطتك.",
  "Beispielhotel öffnen":"فتح الفندق التجريبي",
  "Wird angelegt…":"جارٍ الإنشاء…",
  "In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.":"لا يوجد فندق في هذه المؤسسة بعد. بمجرد أن ينشئ فريق المشروع فندقًا، ستراه هنا.",
  "Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.":"حذف الفندق التجريبي مع جميع البيانات التجريبية؟ يمكنك إنشاؤه من جديد في أي وقت.",
  "Speichern":"حفظ",
  "Gespeichert.":"تم الحفظ.",
  "Speichern & weiter":"حفظ ومتابعة",
  "BEREITSCHAFT · IM ZEITPLAN ⓘ":"الجاهزية · وفق الجدول ⓘ",
  "IM ZEITPLAN":"وفق الجدول",
  "Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.":"نسبة ما أُنجز مما كان مستحقًا حتى اليوم – بعد خصم المخاطر ونقص الموظفين والميزانية. 100٪ تعني: وفق الجدول تمامًا.",
  "Gesamtfortschritt:":"التقدم الإجمالي:",
  "aller Aufgaben erledigt":"من جميع المهام مكتملة",
  "% aller Aufgaben erledigt":"% من جميع المهام مكتملة",
  "überfällig ·":"متأخرة ·",
  "hohe Risiken":"مخاطر عالية",
  "Bereitschaft je Abteilung":"الجاهزية حسب القسم",
  "Budget überschritten:":"تجاوز الميزانية:",
  "Stellen über Starttermin offen":"وظائف شاغرة بعد تاريخ البدء",
  "Noch keine Posten – hier anlegen →":"لا توجد بنود بعد – أضف هنا ←",
  "Noch keine Stellen – hier anlegen →":"لا توجد وظائف بعد – أضف هنا ←",
  "Überfällige kritische Aufgaben":"المهام الحرجة المتأخرة",
  "Höchste Risiken":"أعلى المخاطر",
  "Keine.":"لا شيء.",
  "· Score":"· الدرجة",
  "Personen eingestellt ·":"تم تعيينهم ·",
  "offen":"شاغرة",
  "überschritten um":"تجاوز بمقدار",
  "KI-Lagebericht":"تقرير الحالة بالذكاء الاصطناعي",
  "Lagebericht erstellen":"إنشاء التقرير",
  "Neu erstellen":"إنشاء من جديد",
  "Analysiert…":"جارٍ التحليل…",
  "Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.":"يحلل الذكاء الاصطناعي المهام والمراحل والمخاطر والميزانية والموظفين ويكتب تقييمًا للإدارة والملاك – مع إشارة ضوئية والإجراءات المطلوبة والخطوات التالية.",
  "Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …":"يحلل الذكاء الاصطناعي المشروع. يستغرق ذلك عادةً 20–60 ثانية …",
  "Handlungsbedarf":"الإجراءات المطلوبة",
  "Risikohinweise":"تنبيهات المخاطر",
  "Was gut läuft":"ما يسير بشكل جيد",
  "Nächste Schritte (7 Tage)":"الخطوات التالية (7 أيام)",
  "Risikohinweise und nächste Schritte anzeigen":"عرض تنبيهات المخاطر والخطوات التالية",
  "Weniger anzeigen":"عرض أقل",
  "Im Plan":"وفق الخطة",
  "Verzug – aufholbar":"تأخير – يمكن تداركه",
  "Eröffnung gefährdet":"الافتتاح في خطر",
  "Einschätzung":"التقييم",
  "+ Aufgabe":"+ مهمة",
  "Aus Excel importieren":"استيراد من Excel",
  "Aus Vorlage ergänzen":"إضافة من القالب",
  "Aufgabe":"المهمة",
  "Titel":"العنوان",
  "Abteilung":"القسم",
  "Priorität":"الأولوية",
  "Status":"الحالة",
  "Fällig":"الاستحقاق",
  "Fällig am":"تاريخ الاستحقاق",
  "Zuständig":"المسؤول",
  "Zuständig im Team":"المسؤول من الفريق",
  "Extern / Sonstige":"خارجي / أخرى",
  "— niemand aus dem Team —":"— لا أحد من الفريق —",
  "Alle Abteilungen":"جميع الأقسام",
  "Alle Status":"جميع الحالات",
  "Alle offenen":"جميع المفتوحة",
  "Nur meine":"مهامي فقط",
  "Ohne Zuständigkeit":"بدون مسؤول",
  "Erledigte anzeigen":"عرض المكتملة",
  "Sortierung":"الترتيب",
  "Nach Termin":"حسب الموعد",
  "Nach Priorität":"حسب الأولوية",
  "Nach Abteilung":"حسب القسم",
  "Filter zurücksetzen":"إعادة ضبط عوامل التصفية",
  "Keine Aufgabe passt zu den Filtern.":"لا توجد مهمة تطابق عوامل التصفية.",
  "Suchen: Titel, Zuständige, Externe …":"بحث: العنوان، المسؤولون، الخارجيون …",
  "Bearbeiten":"تعديل",
  "Löschen":"حذف",
  "löschen":"حذف",
  "Kommentare und Verlauf":"التعليقات والسجل",
  "Noch keine Kommentare.":"لا توجد تعليقات بعد.",
  "Kommentar schreiben … (Strg+Enter zum Senden)":"اكتب تعليقًا … (Ctrl+Enter للإرسال)",
  "Senden":"إرسال",
  "Änderungsverlauf anzeigen":"عرض سجل التغييرات",
  "Kommentar löschen?":"حذف التعليق؟",
  "hat die Aufgabe angelegt":"أنشأ المهمة",
  "Automatisch":"تلقائي",
  "(Eröffnung verschoben)":"(تم تأجيل الافتتاح)",
  "Du":"أنت",
  "Unbekannt":"غير معروف",
  "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest.":"لم تُسند إليك أي مهمة بعد. تحدد المسؤوليات في «المهام» عند التعديل.",
  "Keine offenen Aufgaben – alles erledigt.":"لا توجد مهام مفتوحة – اكتمل كل شيء.",
  "Hotel":"الفندق",
  "kein Termin":"بدون موعد",
  "· am Eröffnungstag":"· في يوم الافتتاح",
  "Tage vor":"يومًا قبل",
  "Tage nach":"يومًا بعد",
  "Eröffnung":"الافتتاح",
  "Vorlage: Standard-Eröffnungsplanung":"القالب: خطة الافتتاح القياسية",
  "Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum. Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.":"مهام ومراحل نموذجية للتحضير للافتتاح لجميع الأقسام، مجدولة بالنسبة إلى تاريخ الافتتاح. إذا تغيّر الافتتاح، تتحرك هذه المواعيد تلقائيًا – حتى تغيّر موعدًا بنفسك.",
  "Wird geprüft…":"جارٍ التحقق…",
  "Die Vorlage ist bereits vollständig angewendet.":"تم تطبيق القالب بالكامل بالفعل.",
  "Neu angelegt werden":"سيتم إنشاء",
  "Aufgaben und":"مهام و",
  "Meilensteine angelegt.":"مراحل تم إنشاؤها.",
  "Vorlage anwenden":"تطبيق القالب",
  "sind schon vorhanden und werden übersprungen)":"موجودة بالفعل وسيتم تخطيها)",
  "vergangene weggelassen.":"تم حذف السابقة.",
  "davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"منها سيكون موعدها قبل اليوم. احذفها (وإلا ستُنشأ كمتأخرة).",
  "Aufgaben aus Excel oder CSV importieren":"استيراد المهام من Excel أو CSV",
  "Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.":"الورقة الأولى من الملف، مهمة واحدة في كل صف. يتم التعرف تلقائيًا على أعمدة مثل «المهمة» و«القسم» و«الأولوية» و«الحالة» و«الاستحقاق» و«المسؤول» – بالإنجليزية أو الألمانية أيضًا.",
  "Spalten zuordnen":"مطابقة الأعمدة",
  "– nicht importieren –":"– عدم الاستيراد –",
  "(Pflicht)":"(إلزامي)",
  "Spalte":"العمود",
  "Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.":"الأولويات غير المعروفة تصبح «متوسطة»، والحالة غير المعروفة «لم تبدأ»، والقسم المفقود «عام». يُستورد المسؤولون كنص – يمكنك إسناد أعضاء الفريق لاحقًا.",
  "Importiert…":"جارٍ الاستيراد…",
  "Schließen":"إغلاق",
  "In der Datei wurden keine Zeilen unter der Überschrift gefunden.":"لم يتم العثور على صفوف أسفل العنوان في الملف.",
  "Datei konnte nicht gelesen werden:":"تعذرت قراءة الملف:",
  "Meilenstein":"مرحلة رئيسية",
  "Datum":"التاريخ",
  "Kritikalität":"الأهمية",
  "Keine offenen Meilensteine.":"لا توجد مراحل مفتوحة.",
  "Heute":"اليوم",
  "Monate":"أشهر",
  "nur offene Aufgaben":"المهام المفتوحة فقط",
  "erledigt":"مكتملة",
  "blockiert":"متوقفة",
  "überfällig":"متأخرة",
  "◆ Meilenstein":"◆ مرحلة رئيسية",
  "Noch keine Aufgaben oder Meilensteine mit Termin.":"لا توجد مهام أو مراحل ذات تاريخ بعد.",
  "Mit der Maus über einen Punkt fahren, um die Aufgabe zu sehen. Größere Punkte sind kritische Aufgaben.":"مرّر الماوس فوق نقطة لرؤية المهمة. النقاط الأكبر مهام حرجة.",
  "+ Risiko":"+ خطر",
  "Risiko":"الخطر",
  "Gegenmaßnahme":"إجراء التخفيف",
  "Gegenmaßnahme (optional)":"إجراء التخفيف (اختياري)",
  "Score":"الدرجة",
  "Wahrscheinlichkeit:":"الاحتمال:",
  "Auswirkung:":"التأثير:",
  "Maßnahme:":"الإجراء:",
  "keine festgelegt":"لم يُحدد",
  "Keine Risiken erfasst.":"لا توجد مخاطر مسجلة.",
  "+ Budgetposten":"+ بند ميزانية",
  "Posten":"البند",
  "Posten, z. B. Matratzen":"البند، مثل المراتب",
  "Plan":"المخطط",
  "Ist":"الفعلي",
  "Plan (€)":"المخطط (€)",
  "Ist (€)":"الفعلي (€)",
  "Notiz":"ملاحظة",
  "Noch keine Budgetposten.":"لا توجد بنود ميزانية بعد.",
  "Kein Budget erfasst.":"لا توجد ميزانية مسجلة.",
  "Ist vs. Plan je Abteilung":"الفعلي مقابل المخطط حسب القسم",
  "NOCH VERFÜGBAR":"المتبقي المتاح",
  "ÜBERSCHRITTEN":"تم التجاوز",
  "verfügbar":"متاح",
  "überschritten":"تم التجاوز",
  "Alle Abteilungen im Plan.":"جميع الأقسام ضمن الخطة.",
  "% vom Plan":"% من المخطط",
  "% über Plan)":"% فوق المخطط)",
  "+ Stelle":"+ وظيفة",
  "Stelle":"الوظيفة",
  "z. B. Rezeptionist/in":"مثل موظف استقبال",
  "Benötigt":"المطلوب",
  "Besetzt":"المشغول",
  "Start":"البدء",
  "Personen":"أشخاص",
  "Besetzung je Abteilung":"شغل الوظائف حسب القسم",
  "Noch keine Stellen angelegt.":"لم يتم إنشاء وظائف بعد.",
  "Keine Stellen erfasst.":"لا توجد وظائف مسجلة.",
  "Eine Person mehr":"شخص إضافي",
  "Eine Person weniger":"شخص أقل",
  "Stellen mit Lücken":"وظائف بها نقص",
  "1 Stelle mit Lücken":"وظيفة واحدة بها نقص",
  "Bitte eine Stellenbezeichnung eingeben.":"يرجى إدخال المسمى الوظيفي.",
  "„Benötigt“ muss mindestens 1 sein.":"يجب أن يكون «المطلوب» 1 على الأقل.",
  "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.":"يجب أن يكون «المشغول» بين 0 و«المطلوب».",
  "weitere Stellen.":"وظائف أخرى.",
  "% besetzt":"% مشغول",
  "Dateien hochladen":"رفع الملفات",
  "oder hierher ziehen · max. 25 MB je Datei":"أو اسحبها إلى هنا · 25 ميغابايت كحد أقصى لكل ملف",
  "Noch keine Dokumente.":"لا توجد مستندات بعد.",
  "Herunterladen":"تنزيل",
  "Datei anhängen":"إرفاق ملف",
  "ANHÄNGE":"المرفقات",
  "Keine Anhänge.":"لا توجد مرفقات.",
  "Lädt hoch:":"جارٍ الرفع:",
  "Hochladen fehlgeschlagen":"فشل الرفع",
  "Teammitglied einladen":"دعوة عضو في الفريق",
  "E-Mail-Adresse":"عنوان البريد الإلكتروني",
  "Einladen":"دعوة",
  "Mitglieder":"الأعضاء",
  "(du)":"(أنت)",
  "Ausstehende Einladungen":"دعوات معلقة",
  "Link kopieren":"نسخ الرابط",
  "Kopiert!":"تم النسخ!",
  "Entfernen":"إزالة",
  "Teammitglied":"عضو في الفريق",
  "Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden, dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.":"يتلقى الشخص رابط الدعوة عبر البريد الإلكتروني. يسجّل أو يسجّل الدخول به فينضم تلقائيًا إلى مؤسستك. إذا لم يصل البريد، يمكنك أيضًا نسخ الرابط أدناه وإرساله بنفسك.",
  "sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.":"يرون لوحة التحكم وتقرير الذكاء الاصطناعي وتقرير الحالة ويمكنهم التعليق، لكن لا يمكنهم تغيير أي شيء – مثالي للملاك والمستثمرين.",
  "Sprache der Organisation":"لغة المؤسسة",
  "Gilt für die Oberfläche aller Mitglieder, E-Mails, die Pre-Opening-Vorlage und den KI-Lagebericht.":"تنطبق على واجهة جميع الأعضاء والبريد الإلكتروني وقالب التحضير للافتتاح وتقرير الذكاء الاصطناعي.",
  "Name der Organisation, z. B. Hotelgruppe Wien":"اسم المؤسسة، مثل مجموعة فنادق دبي",
  "Umbenennen":"إعادة التسمية",
  "Meine Organisation":"مؤسستي",
  "Gefahrenzone":"منطقة الخطر",
  "Organisation verlassen":"مغادرة المؤسسة",
  "Organisation endgültig löschen":"حذف المؤسسة نهائيًا",
  "Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.":"إذا غادرت المؤسسة، ستفقد الوصول إلى جميع فنادقها.",
  "Löscht":"يحذف",
  "Das kann nicht rückgängig gemacht werden.":"لا يمكن التراجع عن ذلك.",
  "endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet. Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“.":"نهائيًا مع جميع الفنادق والمهام والتعليقات والمستندات والتقارير. ينتهي الاشتراك الجاري فورًا. عند الحاجة، صدّر كل فندق أولًا عبر «تصدير Excel».",
  "Zur Bestätigung den Namen der Organisation eingeben:":"للتأكيد، أدخل اسم المؤسسة:",
  "Wird gelöscht…":"جارٍ الحذف…",
  "Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben.":"تم إنشاء الدعوة، لكن لم يُرسل بريد إلكتروني (إرسال البريد غير مُعد). يرجى نسخ الرابط أدناه ومشاركته.",
  "Eigentümer-Ansicht:":"عرض المالك:",
  "Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.":"ترى الحالة الحالية وتقرير الذكاء الاصطناعي وتقرير الحالة. يمكن لأعضاء فريق المشروع فقط إجراء التغييرات.",
  "ANGEMELDET ALS":"مسجّل الدخول باسم",
  "Passwort ändern":"تغيير كلمة المرور",
  "Neues Passwort":"كلمة المرور الجديدة",
  "Neues Passwort wiederholen":"تكرار كلمة المرور الجديدة",
  "Das neue Passwort muss mindestens 8 Zeichen haben.":"يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.",
  "Die beiden Passwörter stimmen nicht überein.":"كلمتا المرور غير متطابقتين.",
  "Passwort geändert.":"تم تغيير كلمة المرور.",
  "Passwort konnte nicht geändert werden.":"تعذر تغيير كلمة المرور.",
  "Konto löschen":"حذف الحساب",
  "Konto endgültig löschen":"حذف الحساب نهائيًا",
  "Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort). In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.":"يحذف بيانات دخولك وعضوياتك. المؤسسات التي أنت عضوها الوحيد تُحذف مع جميع بياناتها (ينتهي الاشتراك الجاري فورًا). في المؤسسات التي تضم أعضاء آخرين تبقى البيانات. إذا كنت آخر مسؤول هناك، فانقل الدور أولًا في «الفريق».",
  "Tarif wählen":"اختر الخطة",
  "Zahlungsart ändern":"تغيير طريقة الدفع",
  "AKTUELLER TARIF":"الخطة الحالية",
  "Testphase":"الفترة التجريبية",
  "Aktiv":"نشط",
  "Aktuell":"الحالية",
  "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)":"إدارة الاشتراك (الفواتير، طريقة الدفع، الإلغاء)",
  "Öffnet…":"جارٍ الفتح…",
  "Öffnet Bezahlseite…":"جارٍ فتح صفحة الدفع…",
  "Nur Admins der Organisation können das Abo ändern.":"يمكن لمسؤولي المؤسسة فقط تغيير الاشتراك.",
  "Die Online-Bezahlung wird gerade eingerichtet.":"يجري الآن إعداد الدفع الإلكتروني.",
  "Für ein Abo schreib an":"للاشتراك، راسلنا على",
  "pro Monat zzgl. USt., monatlich kündbar":"شهريًا غير شامل ضريبة القيمة المضافة، قابل للإلغاء شهريًا",
  "Bald verfügbar":"قريبًا",
  "Über „Abo verwalten“ wechseln":"التبديل عبر «إدارة الاشتراك»",
  "auf Anfrage":"عند الطلب",
  "Jahresvertrag":"عقد سنوي",
  "Mehr als 5 Hotels":"أكثر من 5 فنادق",
  "Eigene Vorlagen je Marke":"قوالب خاصة لكل علامة تجارية",
  "Onboarding und Schulung":"الإعداد والتدريب",
  "Kontakt aufnehmen":"تواصل معنا",
  "Status aktualisieren":"تحديث الحالة",
  "Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.":"تتم عملية الدفع بأمان عبر Stripe. تصل الفواتير بالبريد الإلكتروني وتتوفر في «إدارة الاشتراك».",
  "Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert.":"شكرًا! تمت عملية الدفع بنجاح. سيتم تفعيل الاشتراك خلال ثوانٍ.",
  "Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet.":"تم إلغاء الدفع. لم يتم خصم أي مبلغ.",
  "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"انتهت الفترة التجريبية. Ouverture في وضع القراءة فقط – جميع البيانات محفوظة.",
  "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten.":"لا يوجد اشتراك نشط. Ouverture في وضع القراءة فقط – جميع البيانات محفوظة.",
  "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren.":"فشلت عملية الدفع الأخيرة. يرجى تحديث طريقة الدفع.",
  "Zahlung offen – bitte Zahlungsart aktualisieren":"دفعة مستحقة – يرجى تحديث طريقة الدفع",
  "Beendet":"منتهٍ",
  "Unbezahlt":"غير مدفوع",
  "Zahlung nicht abgeschlossen":"لم تكتمل عملية الدفع",
  "1 Hotel-Eröffnung":"افتتاح فندق واحد",
  "Unbegrenzt viele Teammitglieder":"عدد غير محدود من أعضاء الفريق",
  "Vorlage mit Pre-Opening-Plan":"قالب خطة التحضير للافتتاح",
  "Statusbericht als PDF":"تقرير الحالة بصيغة PDF",
  "Bis zu 5 Hotel-Eröffnungen gleichzeitig":"حتى 5 افتتاحات فندقية في الوقت نفسه",
  "Alles aus Starter":"كل ما في Starter",
  "Für Hotelgruppen und Beratungen":"لمجموعات الفنادق وشركات الاستشارات",
  "Bevorzugter Support":"دعم ذو أولوية",
  "← Zurück":"→ رجوع",
  "Im Druckdialog als Ziel „Als PDF speichern“ wählen.":"في نافذة الطباعة، اختر «حفظ كملف PDF» كوجهة.",
  "Als PDF speichern / Drucken":"حفظ كملف PDF / طباعة",
  "STATUSBERICHT PRE-OPENING":"تقرير حالة التحضير للافتتاح",
  "Stand:":"بتاريخ:",
  "Eröffnung:":"الافتتاح:",
  "AUFGABEN":"المهام",
  "MEILENSTEINE":"المراحل الرئيسية",
  "BUDGET (IST / PLAN)":"الميزانية (الفعلي / المخطط)",
  "PERSONAL":"الموظفون",
  "Überfällige Aufgaben mit hoher Priorität":"المهام المتأخرة ذات الأولوية العالية",
  "Blockiert:":"متوقفة:",
  "Größte Risiken":"أكبر المخاطر",
  "Noch keine Abteilungsdaten.":"لا توجد بيانات للأقسام بعد.",
  "Erstellt mit Ouverture":"أُنشئ باستخدام Ouverture",
  "KI-Lagebericht vom":"تقرير الذكاء الاصطناعي بتاريخ",
  "im Plan":"وفق الخطة",
  "gefährdet":"معرضة للخطر",
  "Überfällig":"متأخرة",
  "ÜBERFÄLLIG":"متأخرة",
  "Da ist etwas schiefgelaufen":"حدث خطأ ما",
  "Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.":"تم الإبلاغ عن الخطأ تلقائيًا. بياناتك محفوظة – يرجى إعادة تحميل الصفحة.",
  "Seite neu laden":"إعادة تحميل الصفحة",
  "Änderung nicht möglich: Entweder hast du nur Lesezugriff (Eigentümer-Zugang), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann die Rolle unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"لا يمكن التغيير: إما أن لديك صلاحية قراءة فقط (وصول المالك)، أو أن اشتراك هذه المؤسسة غير نشط (مثل انتهاء الفترة التجريبية). يمكن للمسؤول تغيير الدور في «الفريق» أو الخطة في «الاشتراك».",
  "Mit dem aktuellen Tarif kannst du kein weiteres Hotel anlegen (Hotel-Limit erreicht oder Testphase abgelaufen). Ein Admin kann unter „Abo“ den Tarif ändern.":"لا تسمح خطتك الحالية بإضافة فندق آخر (تم بلوغ الحد أو انتهت الفترة التجريبية). يمكن للمسؤول تغيير الخطة في «الاشتراك».",
  "Nur Admins der Organisation können das Abo verwalten.":"يمكن لمسؤولي المؤسسة فقط إدارة الاشتراك.",
  "Keine Aufgaben mit Titel gefunden.":"لم يتم العثور على مهام ذات عنوان.",
  "Es muss mindestens einen Admin geben. Bitte zuerst eine andere Person zum Admin machen.":"يجب وجود مسؤول واحد على الأقل. يرجى تعيين شخص آخر مسؤولًا أولًا.",
  "Der letzte Admin kann die Organisation nicht verlassen. Bitte zuerst eine andere Person zum Admin machen – oder die Organisation löschen.":"لا يمكن لآخر مسؤول مغادرة المؤسسة. يرجى تعيين شخص آخر مسؤولًا أولًا – أو حذف المؤسسة.",
  "Stand":"بتاريخ",
  "Währung":"العملة",
  "Währung für das Budget":"عملة الميزانية",
  "Euro (€)":"يورو (€)",
  "Schweizer Franken (CHF)":"فرنك سويسري (CHF)",
  "Britisches Pfund (£)":"جنيه إسترليني (£)",
  "US-Dollar ($)":"دولار أمريكي ($)",
  "VAE-Dirham (AED)":"درهم إماراتي (AED)",
  "Saudi-Riyal (SAR)":"ريال سعودي (SAR)",
  "Katar-Riyal (QAR)":"ريال قطري (QAR)",
  "Sprache":"اللغة",
  "Wie die Organisation":"مثل المؤسسة",
  "Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.":"تنطبق لغتك عليك وحدك. بدون اختيار، يتبع Ouverture اللغة الافتراضية للمؤسسة.",
  "Standardsprache der Organisation":"اللغة الافتراضية للمؤسسة",
  "Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.":"تنطبق على البريد الإلكتروني وقالب التحضير للافتتاح وتقرير الذكاء الاصطناعي وجميع الأعضاء الذين لم يختاروا لغتهم.",
  "Meine Sprache":"لغتي",
  "Ablehnen":"رفض",
  "Abteilungen":"الأقسام",
  "Abteilungsleitung":"رئيس القسم",
  "Antrag abgelehnt.":"تم رفض الطلب.",
  "Antrag genehmigt.":"تمت الموافقة على الطلب.",
  "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.":"تم إرسال الطلب. سيقرر رئيس القسم بشأنه.",
  "Antrag stellen":"إرسال الطلب",
  "Antrag zurückgezogen.":"تم سحب الطلب.",
  "Anträge zur Entscheidung":"طلبات بانتظار القرار",
  "Antwort:":"الرد:",
  "Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert.":"نسخ نوبات العمل من الأسبوع السابق إلى هذا الأسبوع؟ تبقى الأيام المخطط لها بالفعل دون تغيير.",
  "Beginn":"البداية",
  "Begründung für die Ablehnung (optional)":"سبب الرفض (اختياري)",
  "Besetzung":"التغطية",
  "Bis":"إلى",
  "Deine Ansicht:":"عرضك:",
  "Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.":"يقرر رئيس القسم؛ تواصلوا مباشرة إذا كانت لديكم أسئلة.",
  "Dienstplan":"جدول المناوبات",
  "Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.":"لم يتم تعيين قسم لك بعد. يمكن للمسؤول تغيير ذلك في «الفريق» – بعدها سترى هنا جدول مناوبات قسمك.",
  "Drucken":"طباعة",
  "Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.":"ليس لديك نوبات قادمة في هذا الفندق يمكنك تبديلها.",
  "Du siehst die Aufgaben deiner Abteilungen und alle, die dir zugewiesen sind. Budget, Risiken und Personal sieht die Abteilungsleitung.":"ترى مهام أقسامك وجميع المهام المسندة إليك. الميزانية والمخاطر والموظفون يراها رئيس القسم.",
  "Ende":"النهاية",
  "Excel":"Excel",
  "Export fehlgeschlagen:":"فشل التصدير:",
  "Frei":"راحة",
  "Frei-Wunsch":"طلب يوم راحة",
  "Früh":"صباحية",
  "Genehmigen":"موافقة",
  "Genehmigt":"تمت الموافقة",
  "Abgelehnt":"مرفوض",
  "Zurückgezogen":"مسحوب",
  "In den nächsten acht Wochen sind für dich keine Schichten eingetragen.":"لا توجد نوبات مخطط لها لك في الأسابيع الثمانية القادمة.",
  "Keine Abteilung":"بدون قسم",
  "Krank":"مريض",
  "KW":"أسبوع",
  "Meine Anträge":"طلباتي",
  "Meine Schicht":"نوبتي",
  "Meine Schichten":"نوباتي",
  "Mindestbesetzung":"الحد الأدنى للتغطية",
  "Mitarbeitende":"الموظفون",
  "Nacht":"ليلية",
  "Name ohne Login (z. B. Aushilfe)":"اسم بدون حساب (مثل عامل مؤقت)",
  "Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.":"لا يوجد أحد في هذا القسم بعد. عيّن موظفين في «الفريق» أو أدخل اسمًا أدناه.",
  "Nächste Woche":"الأسبوع التالي",
  "Vorige Woche":"الأسبوع السابق",
  "Bitte wählen":"يرجى الاختيار",
  "Offen":"مفتوح",
  "Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.":"بدون قسم، لا يرى هذا الشخص إلا المهام المسندة إليه مباشرة.",
  "Schicht bearbeiten":"تعديل النوبة",
  "Schicht eintragen":"إضافة نوبة",
  "Schichten, die du übernehmen sollst":"نوبات مطلوب منك تغطيتها",
  "Schichttausch":"تبديل النوبة",
  "Spät":"مسائية",
  "Tausch":"تبديل",
  "Unterbesetzt:":"نقص في الموظفين:",
  "Urlaub":"إجازة",
  "Von":"من",
  "Vorwoche übernehmen":"نسخ الأسبوع السابق",
  "Wie viele Personen braucht diese Abteilung je Schicht? Fehlen welche, warnt der Plan.":"كم شخصًا يحتاج هذا القسم في كل نوبة؟ إذا كان هناك نقص، ينبّهك الجدول.",
  "Zeile hinzufügen":"إضافة صف",
  "Zurückziehen":"سحب",
  "Zwischen":"وسطى",
  "ohne Login":"بدون حساب",
  "Übernimmt":"يتولى",
  "Übernommene Schichten:":"النوبات المنسوخة:",
  "sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.":"يرون فقط مهام أقسامهم ومهامهم الخاصة وجدول مناوباتهم، ويمكنهم طلب الإجازات وأيام الراحة وتبديل النوبات.",
  "sieht und verwaltet alles, auch Abo und Team.":"يرى ويدير كل شيء، بما في ذلك الاشتراك والفريق.",
  "sieht und verwaltet ihre Abteilungen komplett – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"يرى ويدير أقسامه بالكامل – المهام والميزانية والمخاطر والموظفين وجدول المناوبات – ويوافق على الطلبات.",
  "Änderung nicht möglich: Entweder fehlen dir dafür die Rechte (z. B. Eigentümer-Zugang oder eine andere Abteilung), oder das Abo dieser Organisation ist nicht aktiv (z. B. Testphase abgelaufen). Ein Admin kann Rolle und Abteilungen unter „Team“ bzw. den Tarif unter „Abo“ ändern.":"لا يمكن التغيير: إما أنك لا تملك الصلاحيات (مثل وصول المالك أو قسم آخر)، أو أن اشتراك هذه المؤسسة غير نشط (مثل انتهاء الفترة التجريبية). يمكن للمسؤول تغيير الأدوار والأقسام في «الفريق» أو الخطة في «الاشتراك».",
  "Den KI-Lagebericht erstellen Admins und Abteilungsleitungen.":"يُنشئ تقرير الذكاء الاصطناعي المسؤولون ورؤساء الأقسام.",
  "Antrag nicht möglich: Er muss deine eigene Abteilung bzw. deine eigene Schicht betreffen, und die übernehmende Person muss zum Team gehören.":"لا يمكن تقديم الطلب: يجب أن يتعلق بقسمك أو بنوبتك، ويجب أن يكون الشخص الذي يتولاها من الفريق.",
  "Nur die Abteilungsleitung oder Admins können Anträge entscheiden.":"يمكن لرئيس القسم أو المسؤولين فقط البت في الطلبات.",
  "Dieser Antrag wurde bereits bearbeitet.":"تمت معالجة هذا الطلب بالفعل.",
  "Nur eigene, noch offene Anträge können zurückgezogen werden.":"يمكن سحب طلباتك المفتوحة فقط.",
  "Bitte eine Person auswählen oder einen Namen eintragen.":"يرجى اختيار شخص أو إدخال اسم.",
  "Diese Schicht kannst du nicht löschen.":"لا يمكنك حذف هذه النوبة.",
  "Quell- und Zielwoche sind gleich.":"أسبوع المصدر والهدف متطابقان.",
  "Nur Admins können Abteilungen zuordnen.":"يمكن للمسؤولين فقط تعيين الأقسام.",
};
I18N_PATTERNS.ar = [
  [/^Noch (\d+) Tage bis zur Eröffnung$/, "متبقٍ $1 يومًا على الافتتاح"],
  [/^Eröffnung war vor (\d+) Tagen$/, "تم الافتتاح قبل $1 يومًا"],
  [/^noch (\d+) Tage$/, "متبقٍ $1 يومًا"],
  [/^seit (\d+) Tagen eröffnet$/, "مفتوح منذ $1 يومًا"],
  [/^Testphase: noch 1 Tag\.$/, "الفترة التجريبية: يوم واحد متبقٍ."],
  [/^Testphase: noch (\d+) Tage\.$/, "الفترة التجريبية: $1 أيام متبقية."],
  [/^Testphase bis (.+)$/, "الفترة التجريبية حتى $1"],
  [/^Testphase abgelaufen am (.+)$/, "انتهت الفترة التجريبية في $1"],
  [/^Aktiv · nächste Abrechnung (.+)$/, "نشط · الفوترة التالية $1"],
  [/^Gekündigt – läuft bis (.+)$/, "تم الإلغاء – ساري حتى $1"],
  [/^(\d+) von (\d+) Hotels? genutzt$/, "مستخدم $1 من $2 فنادق"],
  [/^Personal (\d+) % besetzt$/, "الموظفون: $1٪ مشغول"],
  [/^Stand (.+)$/, "بتاريخ $1"],
  [/^seit (.+)$/, "منذ $1"],
  [/^Stand: (.+)$/, "بتاريخ: $1"],
  [/^erstellt von (.+)$/, "أنشأه $1"],
  [/^(\d+) Aufgaben importieren$/, "استيراد $1 مهام"],
  [/^(\d+) Aufgaben importiert\.$/, "تم استيراد $1 مهام."],
  [/^(\d+) Aufgaben importiert, (\d+) leere Zeilen übersprungen\.$/, "تم استيراد $1 مهام وتخطي $2 صفوف فارغة."],
  [/^Vorschau der ersten Zeilen \((\d+) von (\d+) Zeilen haben einen Aufgabentitel\):$/, "معاينة الصفوف الأولى ($1 من $2 صفوف تحتوي على عنوان مهمة):"],
  [/^(.+) wählen$/, "اختر $1"],
  [/^(.+) ist jetzt (.+)\.$/, "$1 الآن $2."],
  [/^(.+) wurde entfernt\.$/, "تمت إزالة $1."],
  [/^Einladung per E-Mail an (.+) verschickt\.$/, "تم إرسال الدعوة بالبريد الإلكتروني إلى $1."],
  [/^Zur Bestätigung „(.+)“ eingeben$/, "للتأكيد، أدخل «$1»"],
  [/^Zur Bestätigung den Namen der Organisation eingeben: (.+)$/, "للتأكيد، أدخل اسم المؤسسة: $1"],
  [/^(\d+) Personen eingestellt · (\d+) offen$/, "تم تعيين $1 · $2 شاغرة"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "تم تعيين $1 من $2 · $3 شاغرة"],
  [/^(\d+) offen · (\d+) überfällig$/, "$1 مفتوحة · $2 متأخرة"],
  [/^(\d+) gefährdet$/, "$1 معرضة للخطر"],
  [/^(\d+) besetzt$/, "$1 مشغولة"],
  [/^(.+) ausgegeben$/, "تم إنفاق $1"],
  [/^Um (.+) überschritten$/, "تجاوز بمقدار $1"],
  [/^… und (\d+) weitere\.$/, "… و$1 أخرى."],
  [/^… und (\d+) weitere Stellen\.$/, "… و$1 وظائف أخرى."],
  [/^(\d+) überfällig$/, "$1 متأخرة"],
  [/^Plan (.+) · Ist (.+) · verfügbar (.+)$/, "المخطط $1 · الفعلي $2 · المتاح $3"],
  [/^(\d+) von (\d+) Personen eingestellt · (\d+) offen$/, "تم تعيين $1 من $2 · $3 شاغرة"],
  [/^„(.+)“ ist größer als 25 MB\.$/, "«$1» أكبر من 25 ميغابايت."],
  [/^(.+) aus der Organisation entfernen\? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit\.$/s, "إزالة $1 من المؤسسة؟ يفقد الشخص الوصول فورًا؛ تبقى مهامه ولكن بدون مسؤول."],
  [/^„(.+)“ wirklich verlassen\? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt\.$/s, "هل تريد فعلًا مغادرة «$1»؟ ستفقد الوصول حتى يدعوك مسؤول مجددًا."],
  [/^(.+) wirklich löschen\? Das kann nicht rückgängig gemacht werden\.$/s, "هل تريد فعلًا حذف $1؟ لا يمكن التراجع عن ذلك."],
  [/^Aufgabe „(.+)“$/, "المهمة «$1»"],
  [/^Risiko „(.+)“$/, "الخطر «$1»"],
  [/^Meilenstein „(.+)“$/, "المرحلة «$1»"],
  [/^Stelle „(.+)“$/, "الوظيفة «$1»"],
  [/^Budgetposten „(.+)“$/, "بند الميزانية «$1»"],
  [/^„(.+)“ löschen\? Die Datei wird endgültig entfernt\.$/s, "حذف «$1»؟ ستتم إزالة الملف نهائيًا."],
  [/^Tageslimit erreicht: höchstens (\d+) KI-Lageberichte pro Organisation in 24 Stunden\.$/, "تم بلوغ الحد اليومي: $1 تقارير ذكاء اصطناعي كحد أقصى لكل مؤسسة خلال 24 ساعة."],
  [/^Die Bezahlseite konnte nicht geöffnet werden: (.+)$/s, "تعذر فتح صفحة الدفع: $1"],
  [/^Du bist der letzte Admin in: (.+)\. Bitte dort zuerst unter „Team“ eine andere Person zum Admin machen\.$/, "أنت آخر مسؤول في: $1. يرجى أولًا تعيين شخص آخر مسؤولًا هناك في «الفريق»."],
  [/^Plan \((.+)\)$/, "المخطط ($1)"],
  [/^Ist \((.+)\)$/, "الفعلي ($1)"],
];



/* ================== Satzvorlagen (tf) – ganze Sätze mit Platzhaltern ================== */
I18N_TF.en = {
  "({0} % über Plan)":"({0}% over plan)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} already exist and will be skipped)",
  "3 Monate":"3 months",
  "6 Wochen":"6 weeks",
  "Abgebucht wird genau in dieser Währung.":"You'll be charged in exactly this currency.",
  "Aktiv · nächste Abrechnung {0}":"Active · next billing {0}",
  "Als Bild teilen":"Share as image",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"On your phone straight to WhatsApp & co. – on a computer the image is saved.",
  "Aufgabe „{0}“":"task “{0}”",
  "Aufgabe: {0}":"Task: {0}",
  "Auswirkung: {0}":"Impact: {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"Amounts converted from {0} to {1} (daily rate{2}). Entries stay in {0}.",
  "Bezahlen in":"Pay in",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"Image saved. You can now send it via WhatsApp or email.",
  "Bis zur Eröffnung":"Until opening",
  "Budget überschritten: {0}":"Budget exceeded: {0}",
  "Budgetposten „{0}“":"budget item “{0}”",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"Budgets are shown converted at the daily rate. They are still stored in the hotel's currency.",
  "Datei konnte nicht gelesen werden: {0}":"Could not read the file: {0}",
  "Einladung per E-Mail an {0} verschickt.":"Invitation sent by email to {0}.",
  "Einladung: {0}":"Invitation: {0}",
  "Erledigt":"Done",
  "Eröffnung war vor {0} Tagen":"Opening was {0} days ago",
  "Eröffnung {0}":"Opening {0}",
  "Eröffnungstermin":"Opening date",
  "Export fehlgeschlagen: {0}":"Export failed: {0}",
  "Fehler {0}":"Error {0}",
  "Gekündigt – läuft bis {0}":"Cancelled – runs until {0}",
  "Gesamt":"All",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"Applies only to you and on all your devices – including emails and the AI status report.",
  "Hochladen fehlgeschlagen: {0}":"Upload failed: {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"Nothing is due in the next 3 weeks.",
  "Ist ({0})":"Actual ({0})",
  "KI-Lagebericht vom {0}":"AI status report of {0}",
  "KW {0}":"Wk {0}",
  "LÖSCHEN":"DELETE",
  "Lädt hoch: {0}":"Uploading: {0}",
  "Maßnahme: {0}":"Mitigation: {0}",
  "Meilenstein „{0}“":"milestone “{0}”",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"{0} tasks and {1} milestones will be created.",
  "Noch {0} Tage bis zur Eröffnung":"{0} days until opening",
  "Nächster Meilenstein":"Next milestone",
  "Personal {0} % besetzt":"Staffing {0}% filled",
  "Plan ({0})":"Plan ({0})",
  "Plan {0} · Ist {1}":"Plan {0} · Actual {1}",
  "Priorität {0}":"Priority {0}",
  "Risiko „{0}“":"risk “{0}”",
  "Score {0}":"Score {0}",
  "Spalte {0}":"Column {0}",
  "Sprache und Währung":"Language and currency",
  "Stand {0}":"As of {0}",
  "Start {0}":"Start {0}",
  "Statusbericht {0}":"Status report {0}",
  "Stelle „{0}“":"position “{0}”",
  "Termin schon vorbei":"Date already passed",
  "Termine":"Dates",
  "Testphase abgelaufen am {0}":"Trial ended on {0}",
  "Testphase bis {0}":"Trial until {0}",
  "Testphase: noch 1 Tag.":"Trial: 1 day left.",
  "Testphase: noch {0} Tage.":"Trial: {0} days left.",
  "Um {0} überschritten":"Over by {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"Preview of the first rows ({0} of {1} rows have a task title):",
  "Wahrscheinlichkeit: {0}":"Probability: {0}",
  "Was steht an":"What's coming up",
  "Wie das Hotel":"Same as hotel",
  "Wird übersetzt…":"Translating…",
  "Wochen":"Weeks",
  "Währung für Beträge":"Currency for amounts",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"To confirm, type the organisation name: {0}",
  "dir zugewiesen, alle Hotels":"assigned to you, all hotels",
  "erstellt von {0}":"created by {0}",
  "fällig {0}":"due {0}",
  "noch {0} Tage":"{0} days to go",
  "offen, Start in ≤ 30 Tagen":"open, starting in ≤ 30 days",
  "seit {0}":"since {0}",
  "seit {0} Tagen eröffnet":"open for {0} days",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"sees and manages all departments – tasks, budget, risks, staffing and rota – and approves requests.",
  "verfügbar {0}":"available {0}",
  "von dir":"by you",
  "von {0}":"by {0}",
  "{0} % aller Aufgaben erledigt":"{0}% of all tasks done",
  "{0} % vom Plan":"{0}% of plan",
  "{0} / {1} besetzt":"{0} / {1} filled",
  "{0} Aufgaben importieren":"Import {0} tasks",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0} tasks imported, {1} empty rows skipped.",
  "{0} Aufgaben importiert.":"{0} tasks imported.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"{0} tasks and {1} milestones created.",
  "{0} Posten":"{0} items",
  "{0} Stellen mit Lücken":"{0} positions with gaps",
  "{0} Stellen über Starttermin offen":"{0} positions open past start date",
  "{0} Tage":"{0} days",
  "{0} Tage nach Eröffnung":"{0} days after opening",
  "{0} Tage vor Eröffnung":"{0} days before opening",
  "{0} Zimmer":"{0} rooms",
  "{0} Zimmer · Eröffnung {1}":"{0} rooms · Opening {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"Remove {0} from the organisation? They lose access immediately; their tasks are kept but unassigned.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"{0} of them would be due before today. Leave these out (otherwise they're created as overdue).",
  "{0} gefährdet":"{0} at risk",
  "{0} ist jetzt {1}.":"{0} is now {1}.",
  "{0} offen":"{0} open",
  "{0} offen · {1} überfällig":"{0} open · {1} overdue",
  "{0} vergangene weggelassen.":"{0} past ones left out.",
  "{0} von {1} Aufgaben":"{0} of {1} tasks",
  "{0} von {1} Hotels genutzt":"{0} of {1} hotels used",
  "{0} von {1} Personen":"{0} of {1} people",
  "{0} von {1} Personen eingestellt · {2} offen":"{0} of {1} people hired · {2} open",
  "{0} von {1} ausgegeben":"{0} of {1} spent",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"Really delete {0}? This cannot be undone.",
  "{0} wurde entfernt.":"{0} has been removed.",
  "{0} überfällig":"{0} overdue",
  "{0} überfällig · {1} hohe Risiken":"{0} overdue · {1} high risks",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"Overdue items and everything due in the next 3 weeks.",
  "Übernommene Schichten: {0}":"Shifts copied: {0}",
  "überschritten um {0}":"over by {0}",
  "„{0}“ ist größer als 25 MB.":"“{0}” is larger than 25 MB.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"Delete “{0}”? The file will be removed permanently.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"Really leave “{0}”? You lose access until an admin invites you again.",
  "… und {0} weitere Stellen.":"… and {0} more positions.",
  "… und {0} weitere.":"… and {0} more.",
  "Wahrscheinlichkeit":"Probability",
  "Auswirkung":"Impact",
  "Kategorie":"Category",
  "Hinweis":"Note",
  "Keine Einträge":"No entries",
  "Preise in\r":"Prices in",
};
I18N_TF.fr = {
  "({0} % über Plan)":"({0} % au-dessus du budget)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} existent déjà et seront ignorées)",
  "3 Monate":"3 mois",
  "6 Wochen":"6 semaines",
  "Abgebucht wird genau in dieser Währung.":"Le prélèvement se fait exactement dans cette devise.",
  "Aktiv · nächste Abrechnung {0}":"Actif · prochaine facturation {0}",
  "Als Bild teilen":"Partager en image",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"Sur le téléphone, directement vers WhatsApp & co. – sur ordinateur, l'image est enregistrée.",
  "Aufgabe „{0}“":"la tâche « {0} »",
  "Aufgabe: {0}":"Tâche : {0}",
  "Auswirkung: {0}":"Impact : {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"Montants convertis de {0} en {1} (taux du jour{2}). Les saisies restent en {0}.",
  "Bezahlen in":"Payer en",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"Image enregistrée. Tu peux maintenant l'envoyer par WhatsApp ou par e-mail.",
  "Bis zur Eröffnung":"Avant l'ouverture",
  "Budget überschritten: {0}":"Budget dépassé : {0}",
  "Budgetposten „{0}“":"le poste budgétaire « {0} »",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"Les budgets sont affichés convertis au taux du jour. Ils restent enregistrés dans la devise de l'hôtel.",
  "Datei konnte nicht gelesen werden: {0}":"Impossible de lire le fichier : {0}",
  "Einladung per E-Mail an {0} verschickt.":"Invitation envoyée par e-mail à {0}.",
  "Einladung: {0}":"Invitation : {0}",
  "Erledigt":"Terminé",
  "Eröffnung war vor {0} Tagen":"L'ouverture a eu lieu il y a {0} jours",
  "Eröffnung {0}":"Ouverture {0}",
  "Eröffnungstermin":"Date d'ouverture",
  "Export fehlgeschlagen: {0}":"Échec de l'export : {0}",
  "Fehler {0}":"Erreur {0}",
  "Gekündigt – läuft bis {0}":"Résilié – court jusqu'au {0}",
  "Gesamt":"Tout",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"S'applique uniquement à toi et sur tous tes appareils – y compris les e-mails et le rapport IA.",
  "Hochladen fehlgeschlagen: {0}":"Échec du téléversement : {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"Rien n'est dû dans les 3 prochaines semaines.",
  "Ist ({0})":"Réel ({0})",
  "KI-Lagebericht vom {0}":"Rapport IA du {0}",
  "KW {0}":"Sem. {0}",
  "LÖSCHEN":"SUPPRIMER",
  "Lädt hoch: {0}":"Téléversement : {0}",
  "Maßnahme: {0}":"Mesure : {0}",
  "Meilenstein „{0}“":"le jalon « {0} »",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"{0} tâches et {1} jalons seront créés.",
  "Noch {0} Tage bis zur Eröffnung":"Encore {0} jours avant l'ouverture",
  "Nächster Meilenstein":"Prochain jalon",
  "Personal {0} % besetzt":"Personnel pourvu à {0} %",
  "Plan ({0})":"Prévu ({0})",
  "Plan {0} · Ist {1}":"Prévu {0} · Réel {1}",
  "Priorität {0}":"Priorité {0}",
  "Risiko „{0}“":"le risque « {0} »",
  "Score {0}":"Score {0}",
  "Spalte {0}":"Colonne {0}",
  "Sprache und Währung":"Langue et devise",
  "Stand {0}":"Au {0}",
  "Start {0}":"Début {0}",
  "Statusbericht {0}":"Rapport de situation {0}",
  "Stelle „{0}“":"le poste « {0} »",
  "Termin schon vorbei":"Échéance dépassée",
  "Termine":"Échéances",
  "Testphase abgelaufen am {0}":"Essai terminé le {0}",
  "Testphase bis {0}":"Essai jusqu'au {0}",
  "Testphase: noch 1 Tag.":"Essai : encore 1 jour.",
  "Testphase: noch {0} Tage.":"Essai : encore {0} jours.",
  "Um {0} überschritten":"Dépassé de {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"Aperçu des premières lignes ({0} sur {1} lignes ont un titre de tâche) :",
  "Wahrscheinlichkeit: {0}":"Probabilité : {0}",
  "Was steht an":"À venir",
  "Wie das Hotel":"Comme l'hôtel",
  "Wird übersetzt…":"Traduction…",
  "Wochen":"Semaines",
  "Währung für Beträge":"Devise des montants",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"Pour confirmer, saisis le nom de l'organisation : {0}",
  "dir zugewiesen, alle Hotels":"qui te sont attribuées, tous hôtels",
  "erstellt von {0}":"créé par {0}",
  "fällig {0}":"échéance {0}",
  "noch {0} Tage":"encore {0} jours",
  "offen, Start in ≤ 30 Tagen":"ouverts, début dans ≤ 30 jours",
  "seit {0}":"depuis le {0}",
  "seit {0} Tagen eröffnet":"ouvert depuis {0} jours",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"voit et gère tous les services – tâches, budget, risques, personnel et planning – et approuve les demandes.",
  "verfügbar {0}":"disponible {0}",
  "von dir":"par toi",
  "von {0}":"par {0}",
  "{0} % aller Aufgaben erledigt":"{0} % de toutes les tâches terminées",
  "{0} % vom Plan":"{0} % du budget",
  "{0} / {1} besetzt":"{0} / {1} pourvus",
  "{0} Aufgaben importieren":"Importer {0} tâches",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0} tâches importées, {1} lignes vides ignorées.",
  "{0} Aufgaben importiert.":"{0} tâches importées.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"{0} tâches et {1} jalons créés.",
  "{0} Posten":"{0} postes",
  "{0} Stellen mit Lücken":"{0} postes avec des manques",
  "{0} Stellen über Starttermin offen":"{0} postes encore vacants après la date de début",
  "{0} Tage":"{0} jours",
  "{0} Tage nach Eröffnung":"{0} jours après l'ouverture",
  "{0} Tage vor Eröffnung":"{0} jours avant l'ouverture",
  "{0} Zimmer":"{0} chambres",
  "{0} Zimmer · Eröffnung {1}":"{0} chambres · Ouverture {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"Retirer {0} de l'organisation ? La personne perd l'accès immédiatement ; ses tâches sont conservées, mais sans responsable.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"{0} d'entre elles auraient une échéance avant aujourd'hui. Les ignorer (sinon elles sont créées en retard).",
  "{0} gefährdet":"{0} en danger",
  "{0} ist jetzt {1}.":"{0} est maintenant {1}.",
  "{0} offen":"{0} ouverts",
  "{0} offen · {1} überfällig":"{0} ouvertes · {1} en retard",
  "{0} vergangene weggelassen.":"{0} passées ignorées.",
  "{0} von {1} Aufgaben":"{0} sur {1} tâches",
  "{0} von {1} Hotels genutzt":"{0} hôtel(s) utilisé(s) sur {1}",
  "{0} von {1} Personen":"{0} sur {1} personnes",
  "{0} von {1} Personen eingestellt · {2} offen":"{0} sur {1} personnes recrutées · {2} ouverts",
  "{0} von {1} ausgegeben":"{0} dépensés sur {1}",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"Supprimer vraiment {0} ? Cette action est irréversible.",
  "{0} wurde entfernt.":"{0} a été retiré(e).",
  "{0} überfällig":"{0} en retard",
  "{0} überfällig · {1} hohe Risiken":"{0} en retard · {1} risques élevés",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"Les retards et tout ce qui arrive à échéance dans les 3 prochaines semaines.",
  "Übernommene Schichten: {0}":"Postes repris : {0}",
  "überschritten um {0}":"dépassé de {0}",
  "„{0}“ ist größer als 25 MB.":"« {0} » dépasse 25 Mo.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"Supprimer « {0} » ? Le fichier sera supprimé définitivement.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"Quitter vraiment « {0} » ? Tu perds l'accès jusqu'à ce qu'un admin t'invite à nouveau.",
  "… und {0} weitere Stellen.":"… et {0} postes de plus.",
  "… und {0} weitere.":"… et {0} de plus.",
  "Wahrscheinlichkeit":"Probabilité",
  "Auswirkung":"Impact",
  "Kategorie":"Catégorie",
  "Hinweis":"Remarque",
  "Keine Einträge":"Aucune entrée",
  "Preise in\r":"Prix en",
};
I18N_TF.it = {
  "({0} % über Plan)":"({0} % oltre il piano)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} esistono già e verranno saltate)",
  "3 Monate":"3 mesi",
  "6 Wochen":"6 settimane",
  "Abgebucht wird genau in dieser Währung.":"L'addebito avviene esattamente in questa valuta.",
  "Aktiv · nächste Abrechnung {0}":"Attivo · prossimo addebito {0}",
  "Als Bild teilen":"Condividi come immagine",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"Sul telefono direttamente su WhatsApp & co. – sul computer l'immagine viene salvata.",
  "Aufgabe „{0}“":"l'attività «{0}»",
  "Aufgabe: {0}":"Attività: {0}",
  "Auswirkung: {0}":"Impatto: {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"Importi convertiti da {0} in {1} (cambio del giorno{2}). Gli inserimenti restano in {0}.",
  "Bezahlen in":"Paga in",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"Immagine salvata. Ora puoi inviarla via WhatsApp o e-mail.",
  "Bis zur Eröffnung":"All'apertura",
  "Budget überschritten: {0}":"Budget superato: {0}",
  "Budgetposten „{0}“":"la voce di budget «{0}»",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"I budget sono mostrati convertiti al cambio del giorno. Restano salvati nella valuta dell'hotel.",
  "Datei konnte nicht gelesen werden: {0}":"Impossibile leggere il file: {0}",
  "Einladung per E-Mail an {0} verschickt.":"Invito inviato via e-mail a {0}.",
  "Einladung: {0}":"Invito: {0}",
  "Erledigt":"Completate",
  "Eröffnung war vor {0} Tagen":"L'apertura è stata {0} giorni fa",
  "Eröffnung {0}":"Apertura {0}",
  "Eröffnungstermin":"Data di apertura",
  "Export fehlgeschlagen: {0}":"Esportazione non riuscita: {0}",
  "Fehler {0}":"Errore {0}",
  "Gekündigt – läuft bis {0}":"Disdetto – valido fino al {0}",
  "Gesamt":"Tutto",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"Vale solo per te e su tutti i tuoi dispositivi – anche per le e-mail e il rapporto IA.",
  "Hochladen fehlgeschlagen: {0}":"Caricamento non riuscito: {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"Nelle prossime 3 settimane non scade nulla.",
  "Ist ({0})":"Effettivo ({0})",
  "KI-Lagebericht vom {0}":"Rapporto IA del {0}",
  "KW {0}":"Sett. {0}",
  "LÖSCHEN":"ELIMINA",
  "Lädt hoch: {0}":"Caricamento: {0}",
  "Maßnahme: {0}":"Misura: {0}",
  "Meilenstein „{0}“":"la milestone «{0}»",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"Verranno create {0} attività e {1} milestone.",
  "Noch {0} Tage bis zur Eröffnung":"Ancora {0} giorni all'apertura",
  "Nächster Meilenstein":"Prossima milestone",
  "Personal {0} % besetzt":"Personale coperto al {0} %",
  "Plan ({0})":"Piano ({0})",
  "Plan {0} · Ist {1}":"Piano {0} · Effettivo {1}",
  "Priorität {0}":"Priorità {0}",
  "Risiko „{0}“":"il rischio «{0}»",
  "Score {0}":"Punteggio {0}",
  "Spalte {0}":"Colonna {0}",
  "Sprache und Währung":"Lingua e valuta",
  "Stand {0}":"Aggiornato al {0}",
  "Start {0}":"Inizio {0}",
  "Statusbericht {0}":"Rapporto di avanzamento {0}",
  "Stelle „{0}“":"la posizione «{0}»",
  "Termin schon vorbei":"Scadenza già passata",
  "Termine":"Scadenze",
  "Testphase abgelaufen am {0}":"Prova scaduta il {0}",
  "Testphase bis {0}":"Prova fino al {0}",
  "Testphase: noch 1 Tag.":"Prova: ancora 1 giorno.",
  "Testphase: noch {0} Tage.":"Prova: ancora {0} giorni.",
  "Um {0} überschritten":"Superato di {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"Anteprima delle prime righe ({0} di {1} righe hanno un titolo):",
  "Wahrscheinlichkeit: {0}":"Probabilità: {0}",
  "Was steht an":"In arrivo",
  "Wie das Hotel":"Come l'hotel",
  "Wird übersetzt…":"Traduzione in corso…",
  "Wochen":"Settimane",
  "Währung für Beträge":"Valuta per gli importi",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"Per confermare, inserisci il nome dell'organizzazione: {0}",
  "dir zugewiesen, alle Hotels":"assegnate a te, tutti gli hotel",
  "erstellt von {0}":"creato da {0}",
  "fällig {0}":"scadenza {0}",
  "noch {0} Tage":"ancora {0} giorni",
  "offen, Start in ≤ 30 Tagen":"aperte, inizio entro ≤ 30 giorni",
  "seit {0}":"dal {0}",
  "seit {0} Tagen eröffnet":"aperto da {0} giorni",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"vede e gestisce tutti i reparti – attività, budget, rischi, personale e turni – e approva le richieste.",
  "verfügbar {0}":"disponibile {0}",
  "von dir":"da te",
  "von {0}":"da {0}",
  "{0} % aller Aufgaben erledigt":"{0} % di tutte le attività completate",
  "{0} % vom Plan":"{0} % del piano",
  "{0} / {1} besetzt":"{0} / {1} coperti",
  "{0} Aufgaben importieren":"Importa {0} attività",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0} attività importate, {1} righe vuote saltate.",
  "{0} Aufgaben importiert.":"{0} attività importate.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"{0} attività e {1} milestone create.",
  "{0} Posten":"{0} voci",
  "{0} Stellen mit Lücken":"{0} posizioni scoperte",
  "{0} Stellen über Starttermin offen":"{0} posizioni ancora aperte dopo la data di inizio",
  "{0} Tage":"{0} giorni",
  "{0} Tage nach Eröffnung":"{0} giorni dopo l'apertura",
  "{0} Tage vor Eröffnung":"{0} giorni prima dell'apertura",
  "{0} Zimmer":"{0} camere",
  "{0} Zimmer · Eröffnung {1}":"{0} camere · Apertura {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"Rimuovere {0} dall'organizzazione? La persona perde subito l'accesso; le sue attività restano, ma senza responsabile.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"{0} di queste avrebbero la scadenza prima di oggi. Escluderle (altrimenti vengono create come in ritardo).",
  "{0} gefährdet":"{0} a rischio",
  "{0} ist jetzt {1}.":"{0} ora è {1}.",
  "{0} offen":"{0} aperte",
  "{0} offen · {1} überfällig":"{0} aperte · {1} in ritardo",
  "{0} vergangene weggelassen.":"{0} passate escluse.",
  "{0} von {1} Aufgaben":"{0} di {1} attività",
  "{0} von {1} Hotels genutzt":"{0} di {1} hotel utilizzati",
  "{0} von {1} Personen":"{0} di {1} persone",
  "{0} von {1} Personen eingestellt · {2} offen":"{0} di {1} persone assunte · {2} aperte",
  "{0} von {1} ausgegeben":"{0} spesi su {1}",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"Eliminare davvero {0}? L'operazione non può essere annullata.",
  "{0} wurde entfernt.":"{0} è stato rimosso.",
  "{0} überfällig":"{0} in ritardo",
  "{0} überfällig · {1} hohe Risiken":"{0} in ritardo · {1} rischi alti",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"Arretrati e tutto ciò che scade nelle prossime 3 settimane.",
  "Übernommene Schichten: {0}":"Turni copiati: {0}",
  "überschritten um {0}":"superato di {0}",
  "„{0}“ ist größer als 25 MB.":"«{0}» supera i 25 MB.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"Eliminare «{0}»? Il file verrà rimosso definitivamente.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"Lasciare davvero «{0}»? Perderai l'accesso finché un admin non ti inviterà di nuovo.",
  "… und {0} weitere Stellen.":"… e altre {0} posizioni.",
  "… und {0} weitere.":"… e altri {0}.",
  "Wahrscheinlichkeit":"Probabilità",
  "Auswirkung":"Impatto",
  "Kategorie":"Categoria",
  "Hinweis":"Nota",
  "Keine Einträge":"Nessuna voce",
  "Preise in\r":"Prezzi in",
};
I18N_TF.es = {
  "({0} % über Plan)":"({0} % por encima del plan)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} ya existen y se omitirán)",
  "3 Monate":"3 meses",
  "6 Wochen":"6 semanas",
  "Abgebucht wird genau in dieser Währung.":"El cargo se realiza exactamente en esta moneda.",
  "Aktiv · nächste Abrechnung {0}":"Activa · próxima facturación {0}",
  "Als Bild teilen":"Compartir como imagen",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"En el móvil, directamente a WhatsApp y similares; en el ordenador se guarda la imagen.",
  "Aufgabe „{0}“":"la tarea «{0}»",
  "Aufgabe: {0}":"Tarea: {0}",
  "Auswirkung: {0}":"Impacto: {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"Importes convertidos de {0} a {1} (cambio del día{2}). Los datos se introducen en {0}.",
  "Bezahlen in":"Pagar en",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"Imagen guardada. Ya puedes enviarla por WhatsApp o por correo.",
  "Bis zur Eröffnung":"Hasta la apertura",
  "Budget überschritten: {0}":"Presupuesto superado: {0}",
  "Budgetposten „{0}“":"la partida «{0}»",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"Los presupuestos se muestran convertidos al cambio del día. Se siguen guardando en la moneda del hotel.",
  "Datei konnte nicht gelesen werden: {0}":"No se pudo leer el archivo: {0}",
  "Einladung per E-Mail an {0} verschickt.":"Invitación enviada por correo a {0}.",
  "Einladung: {0}":"Invitación: {0}",
  "Erledigt":"Hechas",
  "Eröffnung war vor {0} Tagen":"La apertura fue hace {0} días",
  "Eröffnung {0}":"Apertura {0}",
  "Eröffnungstermin":"Fecha de apertura",
  "Export fehlgeschlagen: {0}":"Error al exportar: {0}",
  "Fehler {0}":"Error {0}",
  "Gekündigt – läuft bis {0}":"Cancelada – válida hasta {0}",
  "Gesamt":"Todo",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"Solo se aplica a ti y en todos tus dispositivos, también en los correos y el informe IA.",
  "Hochladen fehlgeschlagen: {0}":"Error al subir: {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"No vence nada en las próximas 3 semanas.",
  "Ist ({0})":"Real ({0})",
  "KI-Lagebericht vom {0}":"Informe IA del {0}",
  "KW {0}":"Sem. {0}",
  "LÖSCHEN":"ELIMINAR",
  "Lädt hoch: {0}":"Subiendo: {0}",
  "Maßnahme: {0}":"Medida: {0}",
  "Meilenstein „{0}“":"el hito «{0}»",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"Se crearán {0} tareas y {1} hitos.",
  "Noch {0} Tage bis zur Eröffnung":"Faltan {0} días para la apertura",
  "Nächster Meilenstein":"Próximo hito",
  "Personal {0} % besetzt":"Personal cubierto al {0} %",
  "Plan ({0})":"Plan ({0})",
  "Plan {0} · Ist {1}":"Plan {0} · Real {1}",
  "Priorität {0}":"Prioridad {0}",
  "Risiko „{0}“":"el riesgo «{0}»",
  "Score {0}":"Puntuación {0}",
  "Spalte {0}":"Columna {0}",
  "Sprache und Währung":"Idioma y moneda",
  "Stand {0}":"A fecha de {0}",
  "Start {0}":"Inicio {0}",
  "Statusbericht {0}":"Informe de estado {0}",
  "Stelle „{0}“":"el puesto «{0}»",
  "Termin schon vorbei":"Fecha ya pasada",
  "Termine":"Fechas",
  "Testphase abgelaufen am {0}":"Prueba finalizada el {0}",
  "Testphase bis {0}":"Prueba hasta el {0}",
  "Testphase: noch 1 Tag.":"Prueba: queda 1 día.",
  "Testphase: noch {0} Tage.":"Prueba: quedan {0} días.",
  "Um {0} überschritten":"Superado en {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"Vista previa de las primeras filas ({0} de {1} filas tienen título de tarea):",
  "Wahrscheinlichkeit: {0}":"Probabilidad: {0}",
  "Was steht an":"Próximamente",
  "Wie das Hotel":"Como el hotel",
  "Wird übersetzt…":"Traduciendo…",
  "Wochen":"Semanas",
  "Währung für Beträge":"Moneda de los importes",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"Para confirmar, escribe el nombre de la organización: {0}",
  "dir zugewiesen, alle Hotels":"asignadas a ti, todos los hoteles",
  "erstellt von {0}":"creado por {0}",
  "fällig {0}":"vence {0}",
  "noch {0} Tage":"faltan {0} días",
  "offen, Start in ≤ 30 Tagen":"abiertos, inicio en ≤ 30 días",
  "seit {0}":"desde {0}",
  "seit {0} Tagen eröffnet":"abierto desde hace {0} días",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"ve y gestiona todos los departamentos – tareas, presupuesto, riesgos, personal y turnos – y aprueba solicitudes.",
  "verfügbar {0}":"disponible {0}",
  "von dir":"por ti",
  "von {0}":"por {0}",
  "{0} % aller Aufgaben erledigt":"{0} % de todas las tareas hechas",
  "{0} % vom Plan":"{0} % del plan",
  "{0} / {1} besetzt":"{0} / {1} cubiertos",
  "{0} Aufgaben importieren":"Importar {0} tareas",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0} tareas importadas, {1} filas vacías omitidas.",
  "{0} Aufgaben importiert.":"{0} tareas importadas.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"{0} tareas y {1} hitos creados.",
  "{0} Posten":"{0} partidas",
  "{0} Stellen mit Lücken":"{0} puestos con huecos",
  "{0} Stellen über Starttermin offen":"{0} puestos abiertos pasada la fecha de inicio",
  "{0} Tage":"{0} días",
  "{0} Tage nach Eröffnung":"{0} días después de la apertura",
  "{0} Tage vor Eröffnung":"{0} días antes de la apertura",
  "{0} Zimmer":"{0} habitaciones",
  "{0} Zimmer · Eröffnung {1}":"{0} habitaciones · Apertura {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"¿Eliminar a {0} de la organización? Pierde el acceso de inmediato; sus tareas se conservan, pero sin responsable.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"{0} de ellas vencerían antes de hoy. Omitirlas (si no, se crean como atrasadas).",
  "{0} gefährdet":"{0} en riesgo",
  "{0} ist jetzt {1}.":"{0} ahora es {1}.",
  "{0} offen":"{0} abiertos",
  "{0} offen · {1} überfällig":"{0} abiertas · {1} atrasadas",
  "{0} vergangene weggelassen.":"{0} pasadas omitidas.",
  "{0} von {1} Aufgaben":"{0} de {1} tareas",
  "{0} von {1} Hotels genutzt":"{0} de {1} hoteles usados",
  "{0} von {1} Personen":"{0} de {1} personas",
  "{0} von {1} Personen eingestellt · {2} offen":"{0} de {1} personas contratadas · {2} abiertos",
  "{0} von {1} ausgegeben":"{0} gastados de {1}",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"¿Eliminar de verdad {0}? No se puede deshacer.",
  "{0} wurde entfernt.":"{0} ha sido eliminado.",
  "{0} überfällig":"{0} atrasadas",
  "{0} überfällig · {1} hohe Risiken":"{0} atrasadas · {1} riesgos altos",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"Lo atrasado y todo lo que vence en las próximas 3 semanas.",
  "Übernommene Schichten: {0}":"Turnos copiados: {0}",
  "überschritten um {0}":"superado en {0}",
  "„{0}“ ist größer als 25 MB.":"«{0}» supera los 25 MB.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"¿Eliminar «{0}»? El archivo se borrará definitivamente.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"¿Salir de verdad de «{0}»? Perderás el acceso hasta que un admin te invite de nuevo.",
  "… und {0} weitere Stellen.":"… y {0} puestos más.",
  "… und {0} weitere.":"… y {0} más.",
  "Wahrscheinlichkeit":"Probabilidad",
  "Auswirkung":"Impacto",
  "Kategorie":"Categoría",
  "Hinweis":"Nota",
  "Keine Einträge":"Sin entradas",
  "Preise in\r":"Precios en",
};
I18N_TF.pt = {
  "({0} % über Plan)":"({0} % acima do previsto)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} já existem e serão ignorados)",
  "3 Monate":"3 meses",
  "6 Wochen":"6 semanas",
  "Abgebucht wird genau in dieser Währung.":"A cobrança é feita exatamente nesta moeda.",
  "Aktiv · nächste Abrechnung {0}":"Ativo · próxima faturação {0}",
  "Als Bild teilen":"Partilhar como imagem",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"No telemóvel, diretamente para o WhatsApp e afins – no computador a imagem é guardada.",
  "Aufgabe „{0}“":"a tarefa «{0}»",
  "Aufgabe: {0}":"Tarefa: {0}",
  "Auswirkung: {0}":"Impacto: {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"Valores convertidos de {0} para {1} (câmbio do dia{2}). Os registos continuam em {0}.",
  "Bezahlen in":"Pagar em",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"Imagem guardada. Já a podes enviar por WhatsApp ou e-mail.",
  "Bis zur Eröffnung":"Até à abertura",
  "Budget überschritten: {0}":"Orçamento ultrapassado: {0}",
  "Budgetposten „{0}“":"a rubrica «{0}»",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"Os orçamentos são apresentados convertidos ao câmbio do dia. Continuam guardados na moeda do hotel.",
  "Datei konnte nicht gelesen werden: {0}":"Não foi possível ler o ficheiro: {0}",
  "Einladung per E-Mail an {0} verschickt.":"Convite enviado por e-mail para {0}.",
  "Einladung: {0}":"Convite: {0}",
  "Erledigt":"Concluído",
  "Eröffnung war vor {0} Tagen":"A abertura foi há {0} dias",
  "Eröffnung {0}":"Abertura {0}",
  "Eröffnungstermin":"Data de abertura",
  "Export fehlgeschlagen: {0}":"Falha na exportação: {0}",
  "Fehler {0}":"Erro {0}",
  "Gekündigt – läuft bis {0}":"Cancelada – válida até {0}",
  "Gesamt":"Tudo",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"Aplica-se só a ti e em todos os teus dispositivos – incluindo e-mails e o relatório IA.",
  "Hochladen fehlgeschlagen: {0}":"Falha no carregamento: {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"Nada vence nas próximas 3 semanas.",
  "Ist ({0})":"Real ({0})",
  "KI-Lagebericht vom {0}":"Relatório IA de {0}",
  "KW {0}":"Sem. {0}",
  "LÖSCHEN":"ELIMINAR",
  "Lädt hoch: {0}":"A carregar: {0}",
  "Maßnahme: {0}":"Medida: {0}",
  "Meilenstein „{0}“":"o marco «{0}»",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"Serão criadas {0} tarefas e {1} marcos.",
  "Noch {0} Tage bis zur Eröffnung":"Faltam {0} dias para a abertura",
  "Nächster Meilenstein":"Próximo marco",
  "Personal {0} % besetzt":"Pessoal {0} % preenchido",
  "Plan ({0})":"Previsto ({0})",
  "Plan {0} · Ist {1}":"Previsto {0} · Real {1}",
  "Priorität {0}":"Prioridade {0}",
  "Risiko „{0}“":"o risco «{0}»",
  "Score {0}":"Pontuação {0}",
  "Spalte {0}":"Coluna {0}",
  "Sprache und Währung":"Idioma e moeda",
  "Stand {0}":"Data {0}",
  "Start {0}":"Início {0}",
  "Statusbericht {0}":"Relatório de estado {0}",
  "Stelle „{0}“":"a vaga «{0}»",
  "Termin schon vorbei":"Prazo já passou",
  "Termine":"Prazos",
  "Testphase abgelaufen am {0}":"Teste terminou em {0}",
  "Testphase bis {0}":"Teste até {0}",
  "Testphase: noch 1 Tag.":"Teste: falta 1 dia.",
  "Testphase: noch {0} Tage.":"Teste: faltam {0} dias.",
  "Um {0} überschritten":"Ultrapassado em {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"Pré-visualização das primeiras linhas ({0} de {1} linhas têm título de tarefa):",
  "Wahrscheinlichkeit: {0}":"Probabilidade: {0}",
  "Was steht an":"O que vem aí",
  "Wie das Hotel":"Como o hotel",
  "Wird übersetzt…":"A traduzir…",
  "Wochen":"Semanas",
  "Währung für Beträge":"Moeda dos valores",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"Para confirmar, escreve o nome da organização: {0}",
  "dir zugewiesen, alle Hotels":"atribuídas a ti, todos os hotéis",
  "erstellt von {0}":"criado por {0}",
  "fällig {0}":"prazo {0}",
  "noch {0} Tage":"faltam {0} dias",
  "offen, Start in ≤ 30 Tagen":"em aberto, início em ≤ 30 dias",
  "seit {0}":"desde {0}",
  "seit {0} Tagen eröffnet":"aberto há {0} dias",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"vê e gere todos os departamentos – tarefas, orçamento, riscos, pessoal e escala – e aprova pedidos.",
  "verfügbar {0}":"disponível {0}",
  "von dir":"por ti",
  "von {0}":"por {0}",
  "{0} % aller Aufgaben erledigt":"{0} % de todas as tarefas concluídas",
  "{0} % vom Plan":"{0} % do previsto",
  "{0} / {1} besetzt":"{0} / {1} preenchidas",
  "{0} Aufgaben importieren":"Importar {0} tarefas",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0} tarefas importadas, {1} linhas vazias ignoradas.",
  "{0} Aufgaben importiert.":"{0} tarefas importadas.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"{0} tarefas e {1} marcos criados.",
  "{0} Posten":"{0} rubricas",
  "{0} Stellen mit Lücken":"{0} vagas com lacunas",
  "{0} Stellen über Starttermin offen":"{0} vagas em aberto após a data de início",
  "{0} Tage":"{0} dias",
  "{0} Tage nach Eröffnung":"{0} dias depois da abertura",
  "{0} Tage vor Eröffnung":"{0} dias antes da abertura",
  "{0} Zimmer":"{0} quartos",
  "{0} Zimmer · Eröffnung {1}":"{0} quartos · Abertura {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"Remover {0} da organização? A pessoa perde o acesso de imediato; as suas tarefas mantêm-se, mas sem responsável.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"{0} delas teriam prazo antes de hoje. Omiti-las (caso contrário são criadas em atraso).",
  "{0} gefährdet":"{0} em risco",
  "{0} ist jetzt {1}.":"{0} é agora {1}.",
  "{0} offen":"{0} em aberto",
  "{0} offen · {1} überfällig":"{0} em aberto · {1} em atraso",
  "{0} vergangene weggelassen.":"{0} passadas omitidas.",
  "{0} von {1} Aufgaben":"{0} de {1} tarefas",
  "{0} von {1} Hotels genutzt":"{0} de {1} hotéis usados",
  "{0} von {1} Personen":"{0} de {1} pessoas",
  "{0} von {1} Personen eingestellt · {2} offen":"{0} de {1} pessoas contratadas · {2} em aberto",
  "{0} von {1} ausgegeben":"{0} gastos de {1}",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"Eliminar mesmo {0}? Esta ação não pode ser anulada.",
  "{0} wurde entfernt.":"{0} foi removido.",
  "{0} überfällig":"{0} em atraso",
  "{0} überfällig · {1} hohe Risiken":"{0} em atraso · {1} riscos elevados",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"O que está em atraso e tudo o que vence nas próximas 3 semanas.",
  "Übernommene Schichten: {0}":"Turnos copiados: {0}",
  "überschritten um {0}":"ultrapassado em {0}",
  "„{0}“ ist größer als 25 MB.":"«{0}» tem mais de 25 MB.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"Eliminar «{0}»? O ficheiro será removido definitivamente.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"Sair mesmo de «{0}»? Perdes o acesso até um admin te convidar novamente.",
  "… und {0} weitere Stellen.":"… e mais {0} vagas.",
  "… und {0} weitere.":"… e mais {0}.",
  "Wahrscheinlichkeit":"Probabilidade",
  "Auswirkung":"Impacto",
  "Kategorie":"Categoria",
  "Hinweis":"Nota",
  "Keine Einträge":"Sem registos",
  "Preise in\r":"Preços em",
};
I18N_TF.tr = {
  "({0} % über Plan)":"(planın %{0} üzerinde)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} tanesi zaten var ve atlanacak)",
  "3 Monate":"3 ay",
  "6 Wochen":"6 hafta",
  "Abgebucht wird genau in dieser Währung.":"Ödeme tam olarak bu para biriminde alınır.",
  "Aktiv · nächste Abrechnung {0}":"Aktif · sonraki fatura {0}",
  "Als Bild teilen":"Görsel olarak paylaş",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"Telefonda doğrudan WhatsApp vb. uygulamalara – bilgisayarda görsel kaydedilir.",
  "Aufgabe „{0}“":"«{0}» görevi",
  "Aufgabe: {0}":"Görev: {0}",
  "Auswirkung: {0}":"Etki: {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"Tutarlar {0} biriminden {1} birimine çevrildi (günlük kur{2}). Girişler {0} cinsinden kalır.",
  "Bezahlen in":"Ödeme birimi",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"Görsel kaydedildi. Artık WhatsApp veya e-postayla gönderebilirsin.",
  "Bis zur Eröffnung":"Açılışa kalan",
  "Budget überschritten: {0}":"Bütçe aşıldı: {0}",
  "Budgetposten „{0}“":"«{0}» bütçe kalemi",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"Bütçeler günlük kurla çevrilerek gösterilir. Kayıt yine otelin para biriminde yapılır.",
  "Datei konnte nicht gelesen werden: {0}":"Dosya okunamadı: {0}",
  "Einladung per E-Mail an {0} verschickt.":"Davet e-postayla {0} adresine gönderildi.",
  "Einladung: {0}":"Davet: {0}",
  "Erledigt":"Tamamlanan",
  "Eröffnung war vor {0} Tagen":"Açılış {0} gün önceydi",
  "Eröffnung {0}":"Açılış {0}",
  "Eröffnungstermin":"Açılış tarihi",
  "Export fehlgeschlagen: {0}":"Dışa aktarma başarısız: {0}",
  "Fehler {0}":"Hata {0}",
  "Gekündigt – läuft bis {0}":"İptal edildi – {0} tarihine kadar geçerli",
  "Gesamt":"Tümü",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"Yalnızca senin için ve tüm cihazlarında geçerlidir – e-postalar ve YZ durum raporu dahil.",
  "Hochladen fehlgeschlagen: {0}":"Yükleme başarısız: {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"Önümüzdeki 3 haftada süresi dolan bir şey yok.",
  "Ist ({0})":"Gerçekleşen ({0})",
  "KI-Lagebericht vom {0}":"YZ durum raporu: {0}",
  "KW {0}":"{0}. hafta",
  "LÖSCHEN":"SİL",
  "Lädt hoch: {0}":"Yükleniyor: {0}",
  "Maßnahme: {0}":"Önlem: {0}",
  "Meilenstein „{0}“":"«{0}» kilometre taşı",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"{0} görev ve {1} kilometre taşı oluşturulacak.",
  "Noch {0} Tage bis zur Eröffnung":"Açılışa {0} gün kaldı",
  "Nächster Meilenstein":"Sonraki kilometre taşı",
  "Personal {0} % besetzt":"Personel %{0} dolu",
  "Plan ({0})":"Plan ({0})",
  "Plan {0} · Ist {1}":"Plan {0} · Gerçekleşen {1}",
  "Priorität {0}":"Öncelik {0}",
  "Risiko „{0}“":"«{0}» riski",
  "Score {0}":"Puan {0}",
  "Spalte {0}":"Sütun {0}",
  "Sprache und Währung":"Dil ve para birimi",
  "Stand {0}":"Tarih {0}",
  "Start {0}":"Başlangıç {0}",
  "Statusbericht {0}":"Durum raporu {0}",
  "Stelle „{0}“":"«{0}» pozisyonu",
  "Termin schon vorbei":"Süresi geçti",
  "Termine":"Tarihler",
  "Testphase abgelaufen am {0}":"Deneme {0} tarihinde sona erdi",
  "Testphase bis {0}":"Deneme {0} tarihine kadar",
  "Testphase: noch 1 Tag.":"Deneme: 1 gün kaldı.",
  "Testphase: noch {0} Tage.":"Deneme: {0} gün kaldı.",
  "Um {0} überschritten":"{0} aşıldı",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"İlk satırların önizlemesi ({1} satırdan {0} tanesinde görev başlığı var):",
  "Wahrscheinlichkeit: {0}":"Olasılık: {0}",
  "Was steht an":"Yaklaşanlar",
  "Wie das Hotel":"Otelle aynı",
  "Wird übersetzt…":"Çevriliyor…",
  "Wochen":"Haftalar",
  "Währung für Beträge":"Tutarlar için para birimi",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"Onaylamak için organizasyon adını yaz: {0}",
  "dir zugewiesen, alle Hotels":"sana atanan, tüm oteller",
  "erstellt von {0}":"oluşturan: {0}",
  "fällig {0}":"bitiş {0}",
  "noch {0} Tage":"{0} gün kaldı",
  "offen, Start in ≤ 30 Tagen":"açık, ≤ 30 gün içinde başlıyor",
  "seit {0}":"{0} tarihinden beri",
  "seit {0} Tagen eröffnet":"{0} gündür açık",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"tüm departmanları görür ve yönetir – görevler, bütçe, riskler, personel ve vardiya planı – ve talepleri onaylar.",
  "verfügbar {0}":"kullanılabilir {0}",
  "von dir":"senin tarafından",
  "von {0}":"{0} tarafından",
  "{0} % aller Aufgaben erledigt":"tüm görevlerin %{0} tamamlandı",
  "{0} % vom Plan":"planın %{0}",
  "{0} / {1} besetzt":"{0} / {1} dolu",
  "{0} Aufgaben importieren":"{0} görevi içe aktar",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0} görev içe aktarıldı, {1} boş satır atlandı.",
  "{0} Aufgaben importiert.":"{0} görev içe aktarıldı.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"{0} görev ve {1} kilometre taşı oluşturuldu.",
  "{0} Posten":"{0} kalem",
  "{0} Stellen mit Lücken":"{0} eksik pozisyon",
  "{0} Stellen über Starttermin offen":"başlangıç tarihi geçmiş {0} açık pozisyon",
  "{0} Tage":"{0} gün",
  "{0} Tage nach Eröffnung":"açılıştan {0} gün sonra",
  "{0} Tage vor Eröffnung":"açılıştan {0} gün önce",
  "{0} Zimmer":"{0} oda",
  "{0} Zimmer · Eröffnung {1}":"{0} oda · Açılış {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"{0} organizasyondan kaldırılsın mı? Kişi erişimini hemen kaybeder; görevleri korunur ama sorumlusuz kalır.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"Bunlardan {0} tanesinin tarihi bugünden önce olurdu. Bunları atla (yoksa gecikmiş olarak oluşturulur).",
  "{0} gefährdet":"{0} risk altında",
  "{0} ist jetzt {1}.":"{0} artık {1}.",
  "{0} offen":"{0} açık",
  "{0} offen · {1} überfällig":"{0} açık · {1} gecikmiş",
  "{0} vergangene weggelassen.":"{0} geçmiş görev atlandı.",
  "{0} von {1} Aufgaben":"{0} / {1} görev",
  "{0} von {1} Hotels genutzt":"{1} otelden {0} tanesi kullanılıyor",
  "{0} von {1} Personen":"{0} / {1} kişi",
  "{0} von {1} Personen eingestellt · {2} offen":"{1} kişiden {0} işe alındı · {2} açık",
  "{0} von {1} ausgegeben":"{1} bütçenin {0} kadarı harcandı",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"{0} gerçekten silinsin mi? Bu işlem geri alınamaz.",
  "{0} wurde entfernt.":"{0} kaldırıldı.",
  "{0} überfällig":"{0} gecikmiş",
  "{0} überfällig · {1} hohe Risiken":"{0} gecikmiş · {1} yüksek risk",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"Gecikenler ve önümüzdeki 3 hafta içinde süresi dolan her şey.",
  "Übernommene Schichten: {0}":"Kopyalanan vardiyalar: {0}",
  "überschritten um {0}":"{0} aşıldı",
  "„{0}“ ist größer als 25 MB.":"«{0}» 25 MB'tan büyük.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"«{0}» silinsin mi? Dosya kalıcı olarak kaldırılacak.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"«{0}» organizasyonundan gerçekten ayrılmak istiyor musun? Bir yönetici seni yeniden davet edene kadar erişimini kaybedersin.",
  "… und {0} weitere Stellen.":"… ve {0} pozisyon daha.",
  "… und {0} weitere.":"… ve {0} tane daha.",
  "Wahrscheinlichkeit":"Olasılık",
  "Auswirkung":"Etki",
  "Kategorie":"Kategori",
  "Hinweis":"Not",
  "Keine Einträge":"Kayıt yok",
  "Preise in\r":"Fiyat birimi",
};
I18N_TF.ja = {
  "({0} % über Plan)":"（計画比 {0}% 超過）",
  "({0} sind schon vorhanden und werden übersprungen)":"（{0}件はすでに存在するためスキップ）",
  "3 Monate":"3か月",
  "6 Wochen":"6週間",
  "Abgebucht wird genau in dieser Währung.":"このとおりの通貨で請求されます。",
  "Aktiv · nächste Abrechnung {0}":"有効 · 次回請求 {0}",
  "Als Bild teilen":"画像で共有",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"スマートフォンではWhatsAppなどへ直接送信、パソコンでは画像が保存されます。",
  "Aufgabe „{0}“":"タスク「{0}」",
  "Aufgabe: {0}":"タスク：{0}",
  "Auswirkung: {0}":"影響度：{0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"金額は{0}から{1}に換算して表示しています（当日レート{2}）。入力は{0}のままです。",
  "Bezahlen in":"支払い通貨",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"画像を保存しました。WhatsAppやメールで送信できます。",
  "Bis zur Eröffnung":"開業まで",
  "Budget überschritten: {0}":"予算超過：{0}",
  "Budgetposten „{0}“":"予算項目「{0}」",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"予算は当日のレートで換算して表示されます。保存はホテルの通貨のままです。",
  "Datei konnte nicht gelesen werden: {0}":"ファイルを読み込めませんでした：{0}",
  "Einladung per E-Mail an {0} verschickt.":"{0} に招待メールを送信しました。",
  "Einladung: {0}":"招待：{0}",
  "Erledigt":"完了",
  "Eröffnung war vor {0} Tagen":"開業から{0}日経過",
  "Eröffnung {0}":"開業 {0}",
  "Eröffnungstermin":"開業日",
  "Export fehlgeschlagen: {0}":"エクスポートに失敗しました：{0}",
  "Fehler {0}":"エラー {0}",
  "Gekündigt – läuft bis {0}":"解約済み – {0}まで利用可能",
  "Gesamt":"全期間",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"あなたにのみ、すべての端末で適用されます。メールとAI状況レポートにも適用されます。",
  "Hochladen fehlgeschlagen: {0}":"アップロードに失敗しました：{0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"今後3週間に期限のものはありません。",
  "Ist ({0})":"実績（{0}）",
  "KI-Lagebericht vom {0}":"AI状況レポート（{0}）",
  "KW {0}":"第{0}週",
  "LÖSCHEN":"削除",
  "Lädt hoch: {0}":"アップロード中：{0}",
  "Maßnahme: {0}":"対策：{0}",
  "Meilenstein „{0}“":"マイルストーン「{0}」",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"タスク{0}件とマイルストーン{1}件を作成します。",
  "Noch {0} Tage bis zur Eröffnung":"開業まであと{0}日",
  "Nächster Meilenstein":"次のマイルストーン",
  "Personal {0} % besetzt":"人員充足率 {0}%",
  "Plan ({0})":"計画（{0}）",
  "Plan {0} · Ist {1}":"計画 {0} · 実績 {1}",
  "Priorität {0}":"優先度 {0}",
  "Risiko „{0}“":"リスク「{0}」",
  "Score {0}":"スコア {0}",
  "Spalte {0}":"列 {0}",
  "Sprache und Währung":"言語と通貨",
  "Stand {0}":"{0} 時点",
  "Start {0}":"開始 {0}",
  "Statusbericht {0}":"ステータスレポート {0}",
  "Stelle „{0}“":"ポジション「{0}」",
  "Termin schon vorbei":"期限切れ",
  "Termine":"日程",
  "Testphase abgelaufen am {0}":"トライアルは{0}に終了しました",
  "Testphase bis {0}":"トライアル期限 {0}",
  "Testphase: noch 1 Tag.":"トライアル：残り1日。",
  "Testphase: noch {0} Tage.":"トライアル：残り{0}日。",
  "Um {0} überschritten":"{0} 超過",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"最初の行のプレビュー（{1}行中{0}行にタスク名あり）：",
  "Wahrscheinlichkeit: {0}":"発生確率：{0}",
  "Was steht an":"今後の予定",
  "Wie das Hotel":"ホテルと同じ",
  "Wird übersetzt…":"翻訳中…",
  "Wochen":"週",
  "Währung für Beträge":"金額の表示通貨",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"確認のため組織名を入力してください：{0}",
  "dir zugewiesen, alle Hotels":"あなたの担当、全ホテル",
  "erstellt von {0}":"作成者：{0}",
  "fällig {0}":"期限 {0}",
  "noch {0} Tage":"あと{0}日",
  "offen, Start in ≤ 30 Tagen":"未充足、30日以内に開始",
  "seit {0}":"{0}から",
  "seit {0} Tagen eröffnet":"開業から{0}日",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"はすべての部門のタスク、予算、リスク、人員、勤務表を閲覧・管理し、申請を承認します。",
  "verfügbar {0}":"残り {0}",
  "von dir":"自分",
  "von {0}":"{0}",
  "{0} % aller Aufgaben erledigt":"全タスクの{0}%が完了",
  "{0} % vom Plan":"計画の{0}%",
  "{0} / {1} besetzt":"{0} / {1} 充足",
  "{0} Aufgaben importieren":"{0}件のタスクをインポート",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"{0}件のタスクをインポートし、空行{1}件をスキップしました。",
  "{0} Aufgaben importiert.":"{0}件のタスクをインポートしました。",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"タスク{0}件とマイルストーン{1}件を作成しました。",
  "{0} Posten":"{0}項目",
  "{0} Stellen mit Lücken":"欠員のあるポジション {0}件",
  "{0} Stellen über Starttermin offen":"開始日を過ぎても未充足のポジション {0}件",
  "{0} Tage":"{0}日",
  "{0} Tage nach Eröffnung":"開業{0}日後",
  "{0} Tage vor Eröffnung":"開業{0}日前",
  "{0} Zimmer":"{0}室",
  "{0} Zimmer · Eröffnung {1}":"{0}室 · 開業 {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"{0} を組織から削除しますか？すぐにアクセスできなくなります。タスクは残りますが、担当者なしになります。",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"このうち{0}件は期限が今日より前になります。これらを除外する（除外しない場合は遅延として作成されます）。",
  "{0} gefährdet":"危険 {0}件",
  "{0} ist jetzt {1}.":"{0} は {1} になりました。",
  "{0} offen":"未充足 {0}",
  "{0} offen · {1} überfällig":"未完了{0}件 · 遅延{1}件",
  "{0} vergangene weggelassen.":"過去の{0}件を除外しました。",
  "{0} von {1} Aufgaben":"{1}件中{0}件のタスク",
  "{0} von {1} Hotels genutzt":"{1}軒中{0}軒を利用中",
  "{0} von {1} Personen":"{1}名中{0}名",
  "{0} von {1} Personen eingestellt · {2} offen":"{1}名中{0}名採用済み · 未充足{2}名",
  "{0} von {1} ausgegeben":"{1}のうち{0}を支出",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"本当に{0}を削除しますか？この操作は元に戻せません。",
  "{0} wurde entfernt.":"{0} を削除しました。",
  "{0} überfällig":"遅延 {0}件",
  "{0} überfällig · {1} hohe Risiken":"遅延{0}件 · 高リスク{1}件",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"遅延中のものと、今後3週間以内に期限を迎えるもの。",
  "Übernommene Schichten: {0}":"コピーしたシフト：{0}",
  "überschritten um {0}":"{0} 超過",
  "„{0}“ ist größer als 25 MB.":"「{0}」は25MBを超えています。",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"「{0}」を削除しますか？ファイルは完全に削除されます。",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"本当に「{0}」を退出しますか？管理者が再招待するまでアクセスできなくなります。",
  "… und {0} weitere Stellen.":"… ほか{0}件のポジション。",
  "… und {0} weitere.":"… ほか{0}件。",
  "Wahrscheinlichkeit":"発生確率",
  "Auswirkung":"影響度",
  "Kategorie":"カテゴリ",
  "Hinweis":"備考",
  "Keine Einträge":"項目なし",
  "Preise in\r":"表示通貨",
};
I18N_TF.zh = {
  "({0} % über Plan)":"（超出计划 {0}%）",
  "({0} sind schon vorhanden und werden übersprungen)":"（{0} 项已存在，将跳过）",
  "3 Monate":"3 个月",
  "6 Wochen":"6 周",
  "Abgebucht wird genau in dieser Währung.":"将严格按此货币扣款。",
  "Aktiv · nächste Abrechnung {0}":"有效 · 下次扣费 {0}",
  "Als Bild teilen":"以图片分享",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"手机上可直接发送到 WhatsApp 等应用；电脑上会保存图片。",
  "Aufgabe „{0}“":"任务“{0}”",
  "Aufgabe: {0}":"任务：{0}",
  "Auswirkung: {0}":"影响：{0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"金额已从 {0} 换算为 {1}（当日汇率{2}）。录入仍使用 {0}。",
  "Bezahlen in":"付款货币",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"图片已保存。现在可以通过 WhatsApp 或电子邮件发送。",
  "Bis zur Eröffnung":"距开业",
  "Budget überschritten: {0}":"超出预算：{0}",
  "Budgetposten „{0}“":"预算项“{0}”",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"预算按当日汇率换算显示，仍以酒店货币保存。",
  "Datei konnte nicht gelesen werden: {0}":"无法读取文件：{0}",
  "Einladung per E-Mail an {0} verschickt.":"已通过电子邮件向 {0} 发送邀请。",
  "Einladung: {0}":"邀请：{0}",
  "Erledigt":"已完成",
  "Eröffnung war vor {0} Tagen":"已开业 {0} 天",
  "Eröffnung {0}":"开业 {0}",
  "Eröffnungstermin":"开业日期",
  "Export fehlgeschlagen: {0}":"导出失败：{0}",
  "Fehler {0}":"错误 {0}",
  "Gekündigt – läuft bis {0}":"已取消——有效期至 {0}",
  "Gesamt":"全部",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"仅对你本人生效，适用于你的所有设备——包括电子邮件和 AI 状况报告。",
  "Hochladen fehlgeschlagen: {0}":"上传失败：{0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"未来 3 周内没有到期事项。",
  "Ist ({0})":"实际（{0}）",
  "KI-Lagebericht vom {0}":"AI 状况报告（{0}）",
  "KW {0}":"第 {0} 周",
  "LÖSCHEN":"删除",
  "Lädt hoch: {0}":"正在上传：{0}",
  "Maßnahme: {0}":"措施：{0}",
  "Meilenstein „{0}“":"里程碑“{0}”",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"将创建 {0} 项任务和 {1} 个里程碑。",
  "Noch {0} Tage bis zur Eröffnung":"距开业还有 {0} 天",
  "Nächster Meilenstein":"下一个里程碑",
  "Personal {0} % besetzt":"人员到岗 {0}%",
  "Plan ({0})":"计划（{0}）",
  "Plan {0} · Ist {1}":"计划 {0} · 实际 {1}",
  "Priorität {0}":"优先级 {0}",
  "Risiko „{0}“":"风险“{0}”",
  "Score {0}":"评分 {0}",
  "Spalte {0}":"第 {0} 列",
  "Sprache und Währung":"语言和货币",
  "Stand {0}":"截至 {0}",
  "Start {0}":"入职 {0}",
  "Statusbericht {0}":"状态报告 {0}",
  "Stelle „{0}“":"职位“{0}”",
  "Termin schon vorbei":"已过截止日期",
  "Termine":"日程",
  "Testphase abgelaufen am {0}":"试用已于 {0} 结束",
  "Testphase bis {0}":"试用至 {0}",
  "Testphase: noch 1 Tag.":"试用：剩余 1 天。",
  "Testphase: noch {0} Tage.":"试用：剩余 {0} 天。",
  "Um {0} überschritten":"超出 {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"前几行预览（{1} 行中有 {0} 行包含任务标题）：",
  "Wahrscheinlichkeit: {0}":"可能性：{0}",
  "Was steht an":"即将到来",
  "Wie das Hotel":"与酒店相同",
  "Wird übersetzt…":"正在翻译…",
  "Wochen":"周",
  "Währung für Beträge":"金额显示货币",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"请输入组织名称以确认：{0}",
  "dir zugewiesen, alle Hotels":"分配给你的，所有酒店",
  "erstellt von {0}":"创建人：{0}",
  "fällig {0}":"截止 {0}",
  "noch {0} Tage":"还有 {0} 天",
  "offen, Start in ≤ 30 Tagen":"空缺，≤ 30 天内入职",
  "seit {0}":"自 {0} 起",
  "seit {0} Tagen eröffnet":"已开业 {0} 天",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"可查看并管理所有部门——任务、预算、风险、人员和排班表——并审批申请。",
  "verfügbar {0}":"可用 {0}",
  "von dir":"由你",
  "von {0}":"由 {0}",
  "{0} % aller Aufgaben erledigt":"已完成全部任务的 {0}%",
  "{0} % vom Plan":"占计划 {0}%",
  "{0} / {1} besetzt":"已到岗 {0} / {1}",
  "{0} Aufgaben importieren":"导入 {0} 项任务",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"已导入 {0} 项任务，跳过 {1} 个空行。",
  "{0} Aufgaben importiert.":"已导入 {0} 项任务。",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"已创建 {0} 项任务和 {1} 个里程碑。",
  "{0} Posten":"{0} 个条目",
  "{0} Stellen mit Lücken":"{0} 个职位有缺口",
  "{0} Stellen über Starttermin offen":"{0} 个职位已过入职日期仍空缺",
  "{0} Tage":"{0} 天",
  "{0} Tage nach Eröffnung":"开业后 {0} 天",
  "{0} Tage vor Eröffnung":"开业前 {0} 天",
  "{0} Zimmer":"{0} 间客房",
  "{0} Zimmer · Eröffnung {1}":"{0} 间客房 · 开业 {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"将 {0} 从组织中移除？此人将立即失去访问权限；其任务会保留，但没有负责人。",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"其中 {0} 项的截止日期早于今天。省略这些（否则将作为逾期创建）。",
  "{0} gefährdet":"{0} 项有风险",
  "{0} ist jetzt {1}.":"{0} 现在是 {1}。",
  "{0} offen":"{0} 空缺",
  "{0} offen · {1} überfällig":"未完成 {0} · 逾期 {1}",
  "{0} vergangene weggelassen.":"已省略 {0} 项过去的任务。",
  "{0} von {1} Aufgaben":"{0} / {1} 项任务",
  "{0} von {1} Hotels genutzt":"已使用 {0} / {1} 家酒店",
  "{0} von {1} Personen":"{0} / {1} 人",
  "{0} von {1} Personen eingestellt · {2} offen":"已招聘 {0} / {1} 人 · 空缺 {2}",
  "{0} von {1} ausgegeben":"已支出 {0} / {1}",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"确定删除{0}吗？此操作无法撤销。",
  "{0} wurde entfernt.":"{0} 已被移除。",
  "{0} überfällig":"逾期 {0} 项",
  "{0} überfällig · {1} hohe Risiken":"{0} 项逾期 · {1} 项高风险",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"逾期事项以及未来 3 周内到期的所有事项。",
  "Übernommene Schichten: {0}":"已复制班次：{0}",
  "überschritten um {0}":"超出 {0}",
  "„{0}“ ist größer als 25 MB.":"“{0}”超过 25 MB。",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"删除“{0}”？文件将被永久移除。",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"确定要退出“{0}”吗？在管理员重新邀请你之前，你将无法访问。",
  "… und {0} weitere Stellen.":"… 另有 {0} 个职位。",
  "… und {0} weitere.":"… 另有 {0} 项。",
  "Wahrscheinlichkeit":"可能性",
  "Auswirkung":"影响",
  "Kategorie":"类别",
  "Hinweis":"备注",
  "Keine Einträge":"没有条目",
  "Preise in\r":"价格货币",
};
I18N_TF.ar = {
  "({0} % über Plan)":"({0}٪ فوق المخطط)",
  "({0} sind schon vorhanden und werden übersprungen)":"({0} موجودة بالفعل وسيتم تخطيها)",
  "3 Monate":"3 أشهر",
  "6 Wochen":"6 أسابيع",
  "Abgebucht wird genau in dieser Währung.":"يتم الخصم بهذه العملة تحديدًا.",
  "Aktiv · nächste Abrechnung {0}":"نشط · الفوترة التالية {0}",
  "Als Bild teilen":"مشاركة كصورة",
  "Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.":"على الهاتف مباشرة إلى واتساب وغيره – وعلى الكمبيوتر يتم حفظ الصورة.",
  "Aufgabe „{0}“":"المهمة «{0}»",
  "Aufgabe: {0}":"المهمة: {0}",
  "Auswirkung: {0}":"التأثير: {0}",
  "Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.":"تم تحويل المبالغ من {0} إلى {1} (سعر اليوم{2}). يبقى الإدخال بعملة {0}.",
  "Bezahlen in":"الدفع بعملة",
  "Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.":"تم حفظ الصورة. يمكنك الآن إرسالها عبر واتساب أو البريد الإلكتروني.",
  "Bis zur Eröffnung":"حتى الافتتاح",
  "Budget überschritten: {0}":"تجاوز الميزانية: {0}",
  "Budgetposten „{0}“":"بند الميزانية «{0}»",
  "Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.":"تُعرض الميزانيات محوّلة بسعر اليوم، وتبقى محفوظة بعملة الفندق.",
  "Datei konnte nicht gelesen werden: {0}":"تعذرت قراءة الملف: {0}",
  "Einladung per E-Mail an {0} verschickt.":"تم إرسال الدعوة بالبريد الإلكتروني إلى {0}.",
  "Einladung: {0}":"الدعوة: {0}",
  "Erledigt":"مكتمل",
  "Eröffnung war vor {0} Tagen":"تم الافتتاح قبل {0} يومًا",
  "Eröffnung {0}":"افتتاح {0}",
  "Eröffnungstermin":"موعد الافتتاح",
  "Export fehlgeschlagen: {0}":"فشل التصدير: {0}",
  "Fehler {0}":"خطأ {0}",
  "Gekündigt – läuft bis {0}":"تم الإلغاء – ساري حتى {0}",
  "Gesamt":"الكل",
  "Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.":"ينطبق عليك وحدك وعلى جميع أجهزتك – بما في ذلك البريد الإلكتروني وتقرير الذكاء الاصطناعي.",
  "Hochladen fehlgeschlagen: {0}":"فشل الرفع: {0}",
  "In den nächsten 3 Wochen ist nichts fällig.":"لا يستحق شيء خلال الأسابيع الثلاثة القادمة.",
  "Ist ({0})":"الفعلي ({0})",
  "KI-Lagebericht vom {0}":"تقرير الذكاء الاصطناعي بتاريخ {0}",
  "KW {0}":"الأسبوع {0}",
  "LÖSCHEN":"حذف",
  "Lädt hoch: {0}":"جارٍ الرفع: {0}",
  "Maßnahme: {0}":"الإجراء: {0}",
  "Meilenstein „{0}“":"المرحلة «{0}»",
  "Neu angelegt werden {0} Aufgaben und {1} Meilensteine.":"سيتم إنشاء {0} مهام و{1} مراحل.",
  "Noch {0} Tage bis zur Eröffnung":"متبقٍ {0} يومًا على الافتتاح",
  "Nächster Meilenstein":"المرحلة التالية",
  "Personal {0} % besetzt":"الموظفون: {0}٪ مشغول",
  "Plan ({0})":"المخطط ({0})",
  "Plan {0} · Ist {1}":"المخطط {0} · الفعلي {1}",
  "Priorität {0}":"الأولوية {0}",
  "Risiko „{0}“":"الخطر «{0}»",
  "Score {0}":"الدرجة {0}",
  "Spalte {0}":"العمود {0}",
  "Sprache und Währung":"اللغة والعملة",
  "Stand {0}":"بتاريخ {0}",
  "Start {0}":"البدء {0}",
  "Statusbericht {0}":"تقرير الحالة {0}",
  "Stelle „{0}“":"الوظيفة «{0}»",
  "Termin schon vorbei":"انقضى الموعد",
  "Termine":"المواعيد",
  "Testphase abgelaufen am {0}":"انتهت الفترة التجريبية في {0}",
  "Testphase bis {0}":"الفترة التجريبية حتى {0}",
  "Testphase: noch 1 Tag.":"الفترة التجريبية: يوم واحد متبقٍ.",
  "Testphase: noch {0} Tage.":"الفترة التجريبية: {0} أيام متبقية.",
  "Um {0} überschritten":"تجاوز بمقدار {0}",
  "Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):":"معاينة الصفوف الأولى ({0} من {1} صفوف تحتوي على عنوان مهمة):",
  "Wahrscheinlichkeit: {0}":"الاحتمال: {0}",
  "Was steht an":"ما هو قادم",
  "Wie das Hotel":"مثل الفندق",
  "Wird übersetzt…":"جارٍ الترجمة…",
  "Wochen":"الأسابيع",
  "Währung für Beträge":"عملة المبالغ",
  "Zur Bestätigung den Namen der Organisation eingeben: {0}":"للتأكيد، أدخل اسم المؤسسة: {0}",
  "dir zugewiesen, alle Hotels":"مسندة إليك، جميع الفنادق",
  "erstellt von {0}":"أنشأه {0}",
  "fällig {0}":"الاستحقاق {0}",
  "noch {0} Tage":"متبقٍ {0} يومًا",
  "offen, Start in ≤ 30 Tagen":"شاغرة، تبدأ خلال ≤ 30 يومًا",
  "seit {0}":"منذ {0}",
  "seit {0} Tagen eröffnet":"مفتوح منذ {0} يومًا",
  "sieht und verwaltet alle Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge.":"يرى ويدير جميع الأقسام – المهام والميزانية والمخاطر والموظفين وجدول المناوبات – ويوافق على الطلبات.",
  "verfügbar {0}":"المتاح {0}",
  "von dir":"بواسطتك",
  "von {0}":"بواسطة {0}",
  "{0} % aller Aufgaben erledigt":"اكتمل {0}٪ من جميع المهام",
  "{0} % vom Plan":"{0}٪ من المخطط",
  "{0} / {1} besetzt":"{0} / {1} مشغول",
  "{0} Aufgaben importieren":"استيراد {0} مهام",
  "{0} Aufgaben importiert, {1} leere Zeilen übersprungen.":"تم استيراد {0} مهام وتخطي {1} صفوف فارغة.",
  "{0} Aufgaben importiert.":"تم استيراد {0} مهام.",
  "{0} Aufgaben und {1} Meilensteine angelegt.":"تم إنشاء {0} مهام و{1} مراحل.",
  "{0} Posten":"{0} بنود",
  "{0} Stellen mit Lücken":"{0} وظائف بها نقص",
  "{0} Stellen über Starttermin offen":"{0} وظائف شاغرة بعد تاريخ البدء",
  "{0} Tage":"{0} يومًا",
  "{0} Tage nach Eröffnung":"بعد الافتتاح بـ {0} يومًا",
  "{0} Tage vor Eröffnung":"قبل الافتتاح بـ {0} يومًا",
  "{0} Zimmer":"{0} غرفة",
  "{0} Zimmer · Eröffnung {1}":"{0} غرفة · الافتتاح {1}",
  "{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.":"إزالة {0} من المؤسسة؟ يفقد الشخص الوصول فورًا؛ تبقى مهامه ولكن بدون مسؤول.",
  "{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).":"{0} منها سيكون موعدها قبل اليوم. احذفها (وإلا ستُنشأ كمتأخرة).",
  "{0} gefährdet":"{0} معرضة للخطر",
  "{0} ist jetzt {1}.":"{0} الآن {1}.",
  "{0} offen":"{0} شاغرة",
  "{0} offen · {1} überfällig":"{0} مفتوحة · {1} متأخرة",
  "{0} vergangene weggelassen.":"تم حذف {0} مهام سابقة.",
  "{0} von {1} Aufgaben":"{0} من {1} مهام",
  "{0} von {1} Hotels genutzt":"مستخدم {0} من {1} فنادق",
  "{0} von {1} Personen":"{0} من {1} أشخاص",
  "{0} von {1} Personen eingestellt · {2} offen":"تم تعيين {0} من {1} · {2} شاغرة",
  "{0} von {1} ausgegeben":"تم إنفاق {0} من {1}",
  "{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.":"هل تريد فعلًا حذف {0}؟ لا يمكن التراجع عن ذلك.",
  "{0} wurde entfernt.":"تمت إزالة {0}.",
  "{0} überfällig":"{0} متأخرة",
  "{0} überfällig · {1} hohe Risiken":"{0} متأخرة · {1} مخاطر عالية",
  "Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.":"المتأخرات وكل ما يستحق خلال الأسابيع الثلاثة القادمة.",
  "Übernommene Schichten: {0}":"النوبات المنسوخة: {0}",
  "überschritten um {0}":"تجاوز بمقدار {0}",
  "„{0}“ ist größer als 25 MB.":"«{0}» أكبر من 25 ميغابايت.",
  "„{0}“ löschen? Die Datei wird endgültig entfernt.":"حذف «{0}»؟ ستتم إزالة الملف نهائيًا.",
  "„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.":"هل تريد فعلًا مغادرة «{0}»؟ ستفقد الوصول حتى يدعوك مسؤول مجددًا.",
  "… und {0} weitere Stellen.":"… و{0} وظائف أخرى.",
  "… und {0} weitere.":"… و{0} أخرى.",
  "Wahrscheinlichkeit":"الاحتمال",
  "Auswirkung":"التأثير",
  "Kategorie":"الفئة",
  "Hinweis":"ملاحظة",
  "Keine Einträge":"لا توجد إدخالات",
  "Preise in\r":"الأسعار بعملة",
};

// Zeitstrahl-Legende: offene (noch nicht erledigte) Aufgaben
I18N_TF.en["noch offen"] = "open";
I18N_TF.fr["noch offen"] = "à faire";
I18N_TF.it["noch offen"] = "da fare";
I18N_TF.es["noch offen"] = "pendientes";
I18N_TF.pt["noch offen"] = "por fazer";
I18N_TF.tr["noch offen"] = "açık";
I18N_TF.ja["noch offen"] = "未完了";
I18N_TF.zh["noch offen"] = "未完成";
I18N_TF.ar["noch offen"] = "قيد الانتظار";

// Zeitstrahl-Spuren und Dienstplan-Ansichten
I18N_TF.en["Andere Zeit …"] = "Other time …";
I18N_TF.fr["Andere Zeit …"] = "Autre horaire …";
I18N_TF.it["Andere Zeit …"] = "Altro orario …";
I18N_TF.es["Andere Zeit …"] = "Otro horario …";
I18N_TF.pt["Andere Zeit …"] = "Outro horário …";
I18N_TF.tr["Andere Zeit …"] = "Başka saat …";
I18N_TF.ja["Andere Zeit …"] = "別の時間 …";
I18N_TF.zh["Andere Zeit …"] = "其他时间 …";
I18N_TF.ar["Andere Zeit …"] = "وقت آخر …";
I18N_TF.en["Arbeitsstunden in dieser Woche"] = "Working hours this week";
I18N_TF.fr["Arbeitsstunden in dieser Woche"] = "Heures de travail cette semaine";
I18N_TF.it["Arbeitsstunden in dieser Woche"] = "Ore di lavoro questa settimana";
I18N_TF.es["Arbeitsstunden in dieser Woche"] = "Horas de trabajo esta semana";
I18N_TF.pt["Arbeitsstunden in dieser Woche"] = "Horas de trabalho nesta semana";
I18N_TF.tr["Arbeitsstunden in dieser Woche"] = "Bu haftaki çalışma saatleri";
I18N_TF.ja["Arbeitsstunden in dieser Woche"] = "今週の勤務時間";
I18N_TF.zh["Arbeitsstunden in dieser Woche"] = "本周工作时长";
I18N_TF.ar["Arbeitsstunden in dieser Woche"] = "ساعات العمل هذا الأسبوع";
I18N_TF.en["Keine Schichten eingetragen."] = "No shifts planned.";
I18N_TF.fr["Keine Schichten eingetragen."] = "Aucun poste planifié.";
I18N_TF.it["Keine Schichten eingetragen."] = "Nessun turno pianificato.";
I18N_TF.es["Keine Schichten eingetragen."] = "No hay turnos planificados.";
I18N_TF.pt["Keine Schichten eingetragen."] = "Nenhum turno planeado.";
I18N_TF.tr["Keine Schichten eingetragen."] = "Planlanmış vardiya yok.";
I18N_TF.ja["Keine Schichten eingetragen."] = "シフトは登録されていません。";
I18N_TF.zh["Keine Schichten eingetragen."] = "未安排班次。";
I18N_TF.ar["Keine Schichten eingetragen."] = "لا توجد نوبات مخطط لها.";
I18N_TF.en["Std."] = "Hrs";
I18N_TF.fr["Std."] = "H";
I18N_TF.it["Std."] = "Ore";
I18N_TF.es["Std."] = "Horas";
I18N_TF.pt["Std."] = "Horas";
I18N_TF.tr["Std."] = "Saat";
I18N_TF.ja["Std."] = "時間";
I18N_TF.zh["Std."] = "小时";
I18N_TF.ar["Std."] = "ساعات";
I18N_TF.en["Tagesübersicht"] = "By day";
I18N_TF.fr["Tagesübersicht"] = "Par jour";
I18N_TF.it["Tagesübersicht"] = "Per giorno";
I18N_TF.es["Tagesübersicht"] = "Por día";
I18N_TF.pt["Tagesübersicht"] = "Por dia";
I18N_TF.tr["Tagesübersicht"] = "Günlük";
I18N_TF.ja["Tagesübersicht"] = "日別";
I18N_TF.zh["Tagesübersicht"] = "按日";
I18N_TF.ar["Tagesübersicht"] = "حسب اليوم";
I18N_TF.en["Titel anzeigen"] = "Show titles";
I18N_TF.fr["Titel anzeigen"] = "Afficher les titres";
I18N_TF.it["Titel anzeigen"] = "Mostra titoli";
I18N_TF.es["Titel anzeigen"] = "Mostrar títulos";
I18N_TF.pt["Titel anzeigen"] = "Mostrar títulos";
I18N_TF.tr["Titel anzeigen"] = "Başlıkları göster";
I18N_TF.ja["Titel anzeigen"] = "タイトルを表示";
I18N_TF.zh["Titel anzeigen"] = "显示标题";
I18N_TF.ar["Titel anzeigen"] = "إظهار العناوين";
I18N_TF.en["Wochentabelle"] = "Week table";
I18N_TF.fr["Wochentabelle"] = "Tableau semaine";
I18N_TF.it["Wochentabelle"] = "Tabella settimana";
I18N_TF.es["Wochentabelle"] = "Tabla semanal";
I18N_TF.pt["Wochentabelle"] = "Tabela semanal";
I18N_TF.tr["Wochentabelle"] = "Haftalık tablo";
I18N_TF.ja["Wochentabelle"] = "週表";
I18N_TF.zh["Wochentabelle"] = "周表";
I18N_TF.ar["Wochentabelle"] = "جدول الأسبوع";

// Dienstplan: leere Abteilungen
I18N_TF.en["Noch ohne Mitarbeitende:"] = "No staff yet:";
I18N_TF.fr["Noch ohne Mitarbeitende:"] = "Pas encore de collaborateurs :";
I18N_TF.it["Noch ohne Mitarbeitende:"] = "Ancora senza collaboratori:";
I18N_TF.es["Noch ohne Mitarbeitende:"] = "Aún sin empleados:";
I18N_TF.pt["Noch ohne Mitarbeitende:"] = "Ainda sem colaboradores:";
I18N_TF.tr["Noch ohne Mitarbeitende:"] = "Henüz çalışanı olmayan:";
I18N_TF.ja["Noch ohne Mitarbeitende:"] = "スタッフ未登録：";
I18N_TF.zh["Noch ohne Mitarbeitende:"] = "尚无员工：";
I18N_TF.ar["Noch ohne Mitarbeitende:"] = "لا يوجد موظفون بعد:";
I18N_TF.en["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "Click a department to add names, or assign people under “Team”.";
I18N_TF.fr["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "Clique sur un service pour ajouter des noms, ou attribue des personnes sous « Équipe ».";
I18N_TF.it["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "Clicca su un reparto per inserire nomi, oppure assegna persone in «Team».";
I18N_TF.es["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "Haz clic en un departamento para añadir nombres o asigna personas en «Equipo».";
I18N_TF.pt["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "Clica num departamento para adicionar nomes ou atribui pessoas em «Equipa».";
I18N_TF.tr["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "Ad eklemek için bir departmana tıkla veya «Ekip» altında kişi ata.";
I18N_TF.ja["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "部門をクリックして名前を追加するか、「チーム」で割り当ててください。";
I18N_TF.zh["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "点击部门以添加姓名，或在“团队”中分配人员。";
I18N_TF.ar["Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen."] = "انقر على قسم لإضافة أسماء، أو عيّن الأشخاص في «الفريق».";

// Abteilungsleitung je Abteilung, Tageseinteilung, neue Abteilungen
I18N_TF.en["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "Head of department: sees and plans only the selected departments. No department selected = all departments (e.g. management).";
I18N_TF.fr["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "Chef de service : voit et planifie uniquement les services cochés. Aucun service coché = tous les services (p. ex. direction).";
I18N_TF.it["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "Capo reparto: vede e pianifica solo i reparti selezionati. Nessun reparto selezionato = tutti i reparti (es. direzione).";
I18N_TF.es["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "Jefe de departamento: ve y planifica solo los departamentos marcados. Ninguno marcado = todos los departamentos (p. ej. dirección).";
I18N_TF.pt["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "Chefe de departamento: vê e planeia só os departamentos marcados. Nenhum marcado = todos os departamentos (p. ex. direção).";
I18N_TF.tr["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "Departman müdürü: yalnızca işaretli departmanları görür ve planlar. Hiçbiri işaretli değilse = tüm departmanlar (ör. genel müdürlük).";
I18N_TF.ja["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "部門長：選択した部門だけを閲覧・計画します。部門を選ばない場合はすべての部門（例：経営陣）。";
I18N_TF.zh["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "部门负责人：只查看和规划所选部门。未选择部门 = 所有部门（例如管理层）。";
I18N_TF.ar["Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion)."] = "رئيس القسم: يرى ويخطط للأقسام المحددة فقط. عدم تحديد أي قسم = جميع الأقسام (مثل الإدارة العليا).";
I18N_TF.en["An diesem Tag ist niemand eingeplant."] = "Nobody is scheduled on this day.";
I18N_TF.fr["An diesem Tag ist niemand eingeplant."] = "Personne n'est planifié ce jour-là.";
I18N_TF.it["An diesem Tag ist niemand eingeplant."] = "Nessuno è pianificato in questo giorno.";
I18N_TF.es["An diesem Tag ist niemand eingeplant."] = "Nadie está planificado este día.";
I18N_TF.pt["An diesem Tag ist niemand eingeplant."] = "Ninguém está escalado neste dia.";
I18N_TF.tr["An diesem Tag ist niemand eingeplant."] = "Bu gün kimse planlanmadı.";
I18N_TF.ja["An diesem Tag ist niemand eingeplant."] = "この日は誰も勤務予定がありません。";
I18N_TF.zh["An diesem Tag ist niemand eingeplant."] = "这一天没有人排班。";
I18N_TF.ar["An diesem Tag ist niemand eingeplant."] = "لا يوجد أحد مجدول في هذا اليوم.";
I18N_TF.en["Auch Personen ohne Schicht"] = "Include people without a shift";
I18N_TF.fr["Auch Personen ohne Schicht"] = "Inclure les personnes sans poste";
I18N_TF.it["Auch Personen ohne Schicht"] = "Anche persone senza turno";
I18N_TF.es["Auch Personen ohne Schicht"] = "También personas sin turno";
I18N_TF.pt["Auch Personen ohne Schicht"] = "Incluir pessoas sem turno";
I18N_TF.tr["Auch Personen ohne Schicht"] = "Vardiyası olmayanları da göster";
I18N_TF.ja["Auch Personen ohne Schicht"] = "シフトのない人も表示";
I18N_TF.zh["Auch Personen ohne Schicht"] = "也显示无班次人员";
I18N_TF.ar["Auch Personen ohne Schicht"] = "إظهار من ليس لديهم نوبة أيضًا";
I18N_TF.en["Einteilung als Bild teilen"] = "Share assignments as image";
I18N_TF.fr["Einteilung als Bild teilen"] = "Partager l'affectation en image";
I18N_TF.it["Einteilung als Bild teilen"] = "Condividi le assegnazioni come immagine";
I18N_TF.es["Einteilung als Bild teilen"] = "Compartir la asignación como imagen";
I18N_TF.pt["Einteilung als Bild teilen"] = "Partilhar a distribuição como imagem";
I18N_TF.tr["Einteilung als Bild teilen"] = "Görev dağılımını görsel olarak paylaş";
I18N_TF.ja["Einteilung als Bild teilen"] = "担当表を画像で共有";
I18N_TF.zh["Einteilung als Bild teilen"] = "以图片分享任务分配";
I18N_TF.ar["Einteilung als Bild teilen"] = "مشاركة التوزيع كصورة";
I18N_TF.en["Leitet nur die markierten Abteilungen."] = "Leads only the selected departments.";
I18N_TF.fr["Leitet nur die markierten Abteilungen."] = "Dirige uniquement les services cochés.";
I18N_TF.it["Leitet nur die markierten Abteilungen."] = "Guida solo i reparti selezionati.";
I18N_TF.es["Leitet nur die markierten Abteilungen."] = "Dirige solo los departamentos marcados.";
I18N_TF.pt["Leitet nur die markierten Abteilungen."] = "Dirige só os departamentos marcados.";
I18N_TF.tr["Leitet nur die markierten Abteilungen."] = "Yalnızca işaretli departmanları yönetir.";
I18N_TF.ja["Leitet nur die markierten Abteilungen."] = "選択した部門のみを担当します。";
I18N_TF.zh["Leitet nur die markierten Abteilungen."] = "仅负责所选部门。";
I18N_TF.ar["Leitet nur die markierten Abteilungen."] = "يقود الأقسام المحددة فقط.";
I18N_TF.en["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "Staff only see tasks and rota of the selected departments.";
I18N_TF.fr["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "Les collaborateurs ne voient que les tâches et le planning des services cochés.";
I18N_TF.it["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "I collaboratori vedono solo attività e turni dei reparti selezionati.";
I18N_TF.es["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "Los empleados solo ven tareas y turnos de los departamentos marcados.";
I18N_TF.pt["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "Os colaboradores só veem tarefas e escala dos departamentos marcados.";
I18N_TF.tr["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "Çalışanlar yalnızca işaretli departmanların görevlerini ve vardiya planını görür.";
I18N_TF.ja["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "スタッフは選択した部門のタスクと勤務表のみ閲覧できます。";
I18N_TF.zh["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "员工只能看到所选部门的任务和排班表。";
I18N_TF.ar["Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen."] = "يرى الموظفون مهام وجدول مناوبات الأقسام المحددة فقط.";
I18N_TF.en["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "No department: leads all departments (e.g. management).";
I18N_TF.fr["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "Sans service : dirige tous les services (p. ex. direction).";
I18N_TF.it["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "Senza reparto: guida tutti i reparti (es. direzione).";
I18N_TF.es["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "Sin departamento: dirige todos los departamentos (p. ej. dirección).";
I18N_TF.pt["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "Sem departamento: dirige todos os departamentos (p. ex. direção).";
I18N_TF.tr["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "Departman yok: tüm departmanları yönetir (ör. genel müdürlük).";
I18N_TF.ja["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "部門なし：すべての部門を担当します（例：経営陣）。";
I18N_TF.zh["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "无部门：负责所有部门（例如管理层）。";
I18N_TF.ar["Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion)."] = "بدون قسم: يقود جميع الأقسام (مثل الإدارة العليا).";
I18N_TF.en["Tageseinteilung"] = "Daily assignments";
I18N_TF.fr["Tageseinteilung"] = "Affectation du jour";
I18N_TF.it["Tageseinteilung"] = "Assegnazioni del giorno";
I18N_TF.es["Tageseinteilung"] = "Asignación diaria";
I18N_TF.pt["Tageseinteilung"] = "Distribuição diária";
I18N_TF.tr["Tageseinteilung"] = "Günlük görev dağılımı";
I18N_TF.ja["Tageseinteilung"] = "担当表";
I18N_TF.zh["Tageseinteilung"] = "每日分工";
I18N_TF.ar["Tageseinteilung"] = "توزيع المهام اليومي";
I18N_TF.en["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "Freely enter who does what today – e.g. rooms 101–120, breakfast service, lobby, goods receiving.";
I18N_TF.fr["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "Indique librement qui fait quoi aujourd'hui – p. ex. chambres 101–120, service petit-déjeuner, lobby, réception des marchandises.";
I18N_TF.it["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "Inserisci liberamente chi fa cosa oggi – es. camere 101–120, servizio colazione, lobby, ricevimento merci.";
I18N_TF.es["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "Escribe libremente quién hace qué hoy, p. ej. habitaciones 101–120, servicio de desayuno, lobby, recepción de mercancía.";
I18N_TF.pt["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "Escreve livremente quem faz o quê hoje – p. ex. quartos 101–120, serviço de pequeno-almoço, lobby, receção de mercadorias.";
I18N_TF.tr["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "Bugün kimin ne yaptığını serbestçe yaz – ör. oda 101–120, kahvaltı servisi, lobi, mal kabul.";
I18N_TF.ja["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "今日の担当を自由に入力してください。例：客室101–120、朝食サービス、ロビー、検品。";
I18N_TF.zh["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "自由填写今天谁做什么——例如 101–120 号房、早餐服务、大堂、收货。";
I18N_TF.ar["Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang."] = "اكتب بحرية من يقوم بماذا اليوم – مثل الغرف 101–120، خدمة الإفطار، الردهة، استلام البضائع.";
I18N_TF.en["Was macht diese Person heute?"] = "What does this person do today?";
I18N_TF.fr["Was macht diese Person heute?"] = "Que fait cette personne aujourd'hui ?";
I18N_TF.it["Was macht diese Person heute?"] = "Cosa fa questa persona oggi?";
I18N_TF.es["Was macht diese Person heute?"] = "¿Qué hace esta persona hoy?";
I18N_TF.pt["Was macht diese Person heute?"] = "O que faz esta pessoa hoje?";
I18N_TF.tr["Was macht diese Person heute?"] = "Bu kişi bugün ne yapıyor?";
I18N_TF.ja["Was macht diese Person heute?"] = "この人の今日の担当は？";
I18N_TF.zh["Was macht diese Person heute?"] = "此人今天做什么？";
I18N_TF.ar["Was macht diese Person heute?"] = "ماذا يفعل هذا الشخص اليوم؟";
I18N_TF.en["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "sees and manages the assigned departments – tasks, budget, risks, staffing and rota – and approves requests. Without a department: all departments.";
I18N_TF.fr["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "voit et gère les services attribués – tâches, budget, risques, personnel et planning – et approuve les demandes. Sans service : tous les services.";
I18N_TF.it["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "vede e gestisce i reparti assegnati – attività, budget, rischi, personale e turni – e approva le richieste. Senza reparto: tutti i reparti.";
I18N_TF.es["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "ve y gestiona los departamentos asignados – tareas, presupuesto, riesgos, personal y turnos – y aprueba solicitudes. Sin departamento: todos.";
I18N_TF.pt["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "vê e gere os departamentos atribuídos – tarefas, orçamento, riscos, pessoal e escala – e aprova pedidos. Sem departamento: todos.";
I18N_TF.tr["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "atanan departmanları görür ve yönetir – görevler, bütçe, riskler, personel ve vardiya planı – ve talepleri onaylar. Departman yoksa: tüm departmanlar.";
I18N_TF.ja["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "は担当部門のタスク、予算、リスク、人員、勤務表を閲覧・管理し、申請を承認します。部門なしの場合はすべての部門。";
I18N_TF.zh["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "可查看并管理所分配的部门——任务、预算、风险、人员和排班表——并审批申请。无部门时：所有部门。";
I18N_TF.ar["sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen."] = "يرى ويدير الأقسام المعينة – المهام والميزانية والمخاطر والموظفين وجدول المناوبات – ويوافق على الطلبات. بدون قسم: جميع الأقسام.";
I18N.en["Revenue Management"] = "Revenue Management";
I18N.fr["Revenue Management"] = "Revenue management";
I18N.it["Revenue Management"] = "Revenue management";
I18N.es["Revenue Management"] = "Revenue management";
I18N.pt["Revenue Management"] = "Revenue management";
I18N.tr["Revenue Management"] = "Gelir Yönetimi";
I18N.ja["Revenue Management"] = "レベニューマネジメント";
I18N.zh["Revenue Management"] = "收益管理";
I18N.ar["Revenue Management"] = "إدارة الإيرادات";
I18N.en["Finanzen & Controlling"] = "Finance & Control";
I18N.fr["Finanzen & Controlling"] = "Finance & contrôle de gestion";
I18N.it["Finanzen & Controlling"] = "Finanza e controllo";
I18N.es["Finanzen & Controlling"] = "Finanzas y control";
I18N.pt["Finanzen & Controlling"] = "Finanças e controlo";
I18N.tr["Finanzen & Controlling"] = "Finans ve Kontrol";
I18N.ja["Finanzen & Controlling"] = "財務・管理会計";
I18N.zh["Finanzen & Controlling"] = "财务与控制";
I18N.ar["Finanzen & Controlling"] = "المالية والرقابة";

// Logbuch, Checklisten, Startseite Mitarbeitende, Dienstplan-Erweiterungen
I18N_TF.en["+ Checkliste"] = "+ Checklist";
I18N_TF.fr["+ Checkliste"] = "+ Checklist";
I18N_TF.it["+ Checkliste"] = "+ Checklist";
I18N_TF.es["+ Checkliste"] = "+ Checklist";
I18N_TF.pt["+ Checkliste"] = "+ Checklist";
I18N_TF.tr["+ Checkliste"] = "+ Kontrol listesi";
I18N_TF.ja["+ Checkliste"] = "+ チェックリスト";
I18N_TF.zh["+ Checkliste"] = "+ 检查清单";
I18N_TF.ar["+ Checkliste"] = "+ قائمة تحقق";
I18N_TF.en["Arbeitszeit"] = "Working time";
I18N_TF.fr["Arbeitszeit"] = "Temps de travail";
I18N_TF.it["Arbeitszeit"] = "Orario di lavoro";
I18N_TF.es["Arbeitszeit"] = "Jornada";
I18N_TF.pt["Arbeitszeit"] = "Tempo de trabalho";
I18N_TF.tr["Arbeitszeit"] = "Çalışma süresi";
I18N_TF.ja["Arbeitszeit"] = "労働時間";
I18N_TF.zh["Arbeitszeit"] = "工作时间";
I18N_TF.ar["Arbeitszeit"] = "وقت العمل";
I18N_TF.en["Bald fällig in deiner Abteilung"] = "Due soon in your department";
I18N_TF.fr["Bald fällig in deiner Abteilung"] = "Bientôt dû dans ton service";
I18N_TF.it["Bald fällig in deiner Abteilung"] = "In scadenza nel tuo reparto";
I18N_TF.es["Bald fällig in deiner Abteilung"] = "Vence pronto en tu departamento";
I18N_TF.pt["Bald fällig in deiner Abteilung"] = "A vencer no teu departamento";
I18N_TF.tr["Bald fällig in deiner Abteilung"] = "Departmanında yakında bitecekler";
I18N_TF.ja["Bald fällig in deiner Abteilung"] = "部門で期限間近";
I18N_TF.zh["Bald fällig in deiner Abteilung"] = "你部门即将到期";
I18N_TF.ar["Bald fällig in deiner Abteilung"] = "يستحق قريبًا في قسمك";
I18N_TF.en["Checkliste löschen?"] = "Delete checklist?";
I18N_TF.fr["Checkliste löschen?"] = "Supprimer la checklist ?";
I18N_TF.it["Checkliste löschen?"] = "Eliminare la checklist?";
I18N_TF.es["Checkliste löschen?"] = "¿Eliminar la checklist?";
I18N_TF.pt["Checkliste löschen?"] = "Eliminar a checklist?";
I18N_TF.tr["Checkliste löschen?"] = "Kontrol listesi silinsin mi?";
I18N_TF.ja["Checkliste löschen?"] = "チェックリストを削除しますか？";
I18N_TF.zh["Checkliste löschen?"] = "删除检查清单？";
I18N_TF.ar["Checkliste löschen?"] = "حذف قائمة التحقق؟";
I18N_TF.en["Checklisten heute"] = "Today's checklists";
I18N_TF.fr["Checklisten heute"] = "Checklists du jour";
I18N_TF.it["Checklisten heute"] = "Checklist di oggi";
I18N_TF.es["Checklisten heute"] = "Checklists de hoy";
I18N_TF.pt["Checklisten heute"] = "Checklists de hoje";
I18N_TF.tr["Checklisten heute"] = "Bugünkü kontrol listeleri";
I18N_TF.ja["Checklisten heute"] = "今日のチェックリスト";
I18N_TF.zh["Checklisten heute"] = "今日检查清单";
I18N_TF.ar["Checklisten heute"] = "قوائم التحقق اليوم";
I18N_TF.en["Deine Aufgabe heute:"] = "Your task today:";
I18N_TF.fr["Deine Aufgabe heute:"] = "Ta tâche aujourd'hui :";
I18N_TF.it["Deine Aufgabe heute:"] = "Il tuo compito oggi:";
I18N_TF.es["Deine Aufgabe heute:"] = "Tu tarea hoy:";
I18N_TF.pt["Deine Aufgabe heute:"] = "A tua tarefa hoje:";
I18N_TF.tr["Deine Aufgabe heute:"] = "Bugünkü görevin:";
I18N_TF.ja["Deine Aufgabe heute:"] = "今日の担当：";
I18N_TF.zh["Deine Aufgabe heute:"] = "你今天的任务：";
I18N_TF.ar["Deine Aufgabe heute:"] = "مهمتك اليوم:";
I18N_TF.en["Dir ist gerade keine offene Aufgabe zugewiesen."] = "No open task is assigned to you right now.";
I18N_TF.fr["Dir ist gerade keine offene Aufgabe zugewiesen."] = "Aucune tâche ouverte ne t'est attribuée pour l'instant.";
I18N_TF.it["Dir ist gerade keine offene Aufgabe zugewiesen."] = "Al momento non hai attività aperte assegnate.";
I18N_TF.es["Dir ist gerade keine offene Aufgabe zugewiesen."] = "Ahora mismo no tienes tareas abiertas asignadas.";
I18N_TF.pt["Dir ist gerade keine offene Aufgabe zugewiesen."] = "Neste momento não tens tarefas em aberto atribuídas.";
I18N_TF.tr["Dir ist gerade keine offene Aufgabe zugewiesen."] = "Şu anda sana atanmış açık görev yok.";
I18N_TF.ja["Dir ist gerade keine offene Aufgabe zugewiesen."] = "現在、割り当てられた未完了のタスクはありません。";
I18N_TF.zh["Dir ist gerade keine offene Aufgabe zugewiesen."] = "目前没有分配给你的未完成任务。";
I18N_TF.ar["Dir ist gerade keine offene Aufgabe zugewiesen."] = "لا توجد مهمة مفتوحة مسندة إليك حاليًا.";
I18N_TF.en["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "Custom times per shift for this department. If people are missing against minimum staffing, the rota warns you.";
I18N_TF.fr["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "Horaires propres par poste pour ce service. S'il manque du monde par rapport à l'effectif minimum, le planning avertit.";
I18N_TF.it["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "Orari propri per turno in questo reparto. Se mancano persone rispetto alla copertura minima, il piano avvisa.";
I18N_TF.es["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "Horarios propios por turno para este departamento. Si falta personal respecto a la cobertura mínima, el plan avisa.";
I18N_TF.pt["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "Horários próprios por turno para este departamento. Se faltar pessoal face à cobertura mínima, a escala avisa.";
I18N_TF.tr["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "Bu departman için vardiya başına özel saatler. Asgari kadroya göre eksik kişi varsa plan uyarır.";
I18N_TF.ja["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "この部門のシフトごとの独自時間。最低配置人数に足りない場合は勤務表が警告します。";
I18N_TF.zh["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "此部门各班次的自定义时间。低于最低在岗人数时，排班表会提醒。";
I18N_TF.ar["Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan."] = "أوقات خاصة لكل نوبة في هذا القسم. إذا نقص العدد عن الحد الأدنى، ينبّهك الجدول.";
I18N_TF.en["Eintrag löschen?"] = "Delete entry?";
I18N_TF.fr["Eintrag löschen?"] = "Supprimer l'entrée ?";
I18N_TF.it["Eintrag löschen?"] = "Eliminare la voce?";
I18N_TF.es["Eintrag löschen?"] = "¿Eliminar la entrada?";
I18N_TF.pt["Eintrag löschen?"] = "Eliminar o registo?";
I18N_TF.tr["Eintrag löschen?"] = "Kayıt silinsin mi?";
I18N_TF.ja["Eintrag löschen?"] = "項目を削除しますか？";
I18N_TF.zh["Eintrag löschen?"] = "删除条目？";
I18N_TF.ar["Eintrag löschen?"] = "حذف الإدخال؟";
I18N_TF.en["Eintragen"] = "Add";
I18N_TF.fr["Eintragen"] = "Ajouter";
I18N_TF.it["Eintragen"] = "Inserisci";
I18N_TF.es["Eintragen"] = "Añadir";
I18N_TF.pt["Eintragen"] = "Registar";
I18N_TF.tr["Eintragen"] = "Ekle";
I18N_TF.ja["Eintragen"] = "登録";
I18N_TF.zh["Eintragen"] = "添加";
I18N_TF.ar["Eintragen"] = "إضافة";
I18N_TF.en["Entwurf"] = "Draft";
I18N_TF.fr["Entwurf"] = "Brouillon";
I18N_TF.it["Entwurf"] = "Bozza";
I18N_TF.es["Entwurf"] = "Borrador";
I18N_TF.pt["Entwurf"] = "Rascunho";
I18N_TF.tr["Entwurf"] = "Taslak";
I18N_TF.ja["Entwurf"] = "下書き";
I18N_TF.zh["Entwurf"] = "草稿";
I18N_TF.ar["Entwurf"] = "مسودة";
I18N_TF.en["Erledigt von {0}"] = "Done by {0}";
I18N_TF.fr["Erledigt von {0}"] = "Fait par {0}";
I18N_TF.it["Erledigt von {0}"] = "Fatto da {0}";
I18N_TF.es["Erledigt von {0}"] = "Hecho por {0}";
I18N_TF.pt["Erledigt von {0}"] = "Feito por {0}";
I18N_TF.tr["Erledigt von {0}"] = "{0} tamamladı";
I18N_TF.ja["Erledigt von {0}"] = "{0}が完了";
I18N_TF.zh["Erledigt von {0}"] = "{0} 已完成";
I18N_TF.ar["Erledigt von {0}"] = "أنجزه {0}";
I18N_TF.en["Für Mitarbeitende noch nicht sichtbar."] = "Not yet visible to staff.";
I18N_TF.fr["Für Mitarbeitende noch nicht sichtbar."] = "Pas encore visible pour les collaborateurs.";
I18N_TF.it["Für Mitarbeitende noch nicht sichtbar."] = "Non ancora visibile ai collaboratori.";
I18N_TF.es["Für Mitarbeitende noch nicht sichtbar."] = "Aún no visible para los empleados.";
I18N_TF.pt["Für Mitarbeitende noch nicht sichtbar."] = "Ainda não visível para os colaboradores.";
I18N_TF.tr["Für Mitarbeitende noch nicht sichtbar."] = "Çalışanlar henüz göremez.";
I18N_TF.ja["Für Mitarbeitende noch nicht sichtbar."] = "スタッフにはまだ表示されません。";
I18N_TF.zh["Für Mitarbeitende noch nicht sichtbar."] = "员工尚不可见。";
I18N_TF.ar["Für Mitarbeitende noch nicht sichtbar."] = "غير مرئي للموظفين بعد.";
I18N_TF.en["Für diese Abteilung gibt es noch keine Checklisten."] = "There are no checklists for this department yet.";
I18N_TF.fr["Für diese Abteilung gibt es noch keine Checklisten."] = "Il n'y a pas encore de checklist pour ce service.";
I18N_TF.it["Für diese Abteilung gibt es noch keine Checklisten."] = "Non ci sono ancora checklist per questo reparto.";
I18N_TF.es["Für diese Abteilung gibt es noch keine Checklisten."] = "Todavía no hay checklists para este departamento.";
I18N_TF.pt["Für diese Abteilung gibt es noch keine Checklisten."] = "Ainda não há checklists para este departamento.";
I18N_TF.tr["Für diese Abteilung gibt es noch keine Checklisten."] = "Bu departman için henüz kontrol listesi yok.";
I18N_TF.ja["Für diese Abteilung gibt es noch keine Checklisten."] = "この部門のチェックリストはまだありません。";
I18N_TF.zh["Für diese Abteilung gibt es noch keine Checklisten."] = "此部门还没有检查清单。";
I18N_TF.ar["Für diese Abteilung gibt es noch keine Checklisten."] = "لا توجد قوائم تحقق لهذا القسم بعد.";
I18N_TF.en["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "Planned hours for the whole month vs. target (weekly hours pro rata).";
I18N_TF.fr["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "Heures planifiées sur le mois par rapport à l'objectif (heures hebdomadaires au prorata).";
I18N_TF.it["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "Ore pianificate nel mese rispetto all'obiettivo (ore settimanali in proporzione).";
I18N_TF.es["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "Horas planificadas en el mes frente al objetivo (horas semanales prorrateadas).";
I18N_TF.pt["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "Horas planeadas no mês face ao objetivo (horas semanais proporcionais).";
I18N_TF.tr["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "Ay boyunca planlanan saatler ile hedef (haftalık saatler orantılı).";
I18N_TF.ja["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "月全体の予定時間と目標（週時間を按分）の比較。";
I18N_TF.zh["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "整月计划工时与目标（按周工时折算）对比。";
I18N_TF.ar["Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig)."] = "الساعات المخططة للشهر كاملًا مقارنة بالهدف (الساعات الأسبوعية نسبيًا).";
I18N_TF.en["Heute hast du keine Schicht."] = "You have no shift today.";
I18N_TF.fr["Heute hast du keine Schicht."] = "Tu n'as pas de poste aujourd'hui.";
I18N_TF.it["Heute hast du keine Schicht."] = "Oggi non hai turni.";
I18N_TF.es["Heute hast du keine Schicht."] = "Hoy no tienes turno.";
I18N_TF.pt["Heute hast du keine Schicht."] = "Hoje não tens turno.";
I18N_TF.tr["Heute hast du keine Schicht."] = "Bugün vardiyan yok.";
I18N_TF.ja["Heute hast du keine Schicht."] = "今日はシフトがありません。";
I18N_TF.zh["Heute hast du keine Schicht."] = "你今天没有班次。";
I18N_TF.ar["Heute hast du keine Schicht."] = "ليس لديك نوبة اليوم.";
I18N_TF.en["Keine Checklisten."] = "No checklists.";
I18N_TF.fr["Keine Checklisten."] = "Aucune checklist.";
I18N_TF.it["Keine Checklisten."] = "Nessuna checklist.";
I18N_TF.es["Keine Checklisten."] = "No hay checklists.";
I18N_TF.pt["Keine Checklisten."] = "Sem checklists.";
I18N_TF.tr["Keine Checklisten."] = "Kontrol listesi yok.";
I18N_TF.ja["Keine Checklisten."] = "チェックリストはありません。";
I18N_TF.zh["Keine Checklisten."] = "没有检查清单。";
I18N_TF.ar["Keine Checklisten."] = "لا توجد قوائم تحقق.";
I18N_TF.en["Meine Verfügbarkeit"] = "My availability";
I18N_TF.fr["Meine Verfügbarkeit"] = "Mes disponibilités";
I18N_TF.it["Meine Verfügbarkeit"] = "La mia disponibilità";
I18N_TF.es["Meine Verfügbarkeit"] = "Mi disponibilidad";
I18N_TF.pt["Meine Verfügbarkeit"] = "A minha disponibilidade";
I18N_TF.tr["Meine Verfügbarkeit"] = "Uygunluğum";
I18N_TF.ja["Meine Verfügbarkeit"] = "自分の勤務可否";
I18N_TF.zh["Meine Verfügbarkeit"] = "我的可上班时间";
I18N_TF.ar["Meine Verfügbarkeit"] = "تفرغي";
I18N_TF.en["Mindestens"] = "At least";
I18N_TF.fr["Mindestens"] = "Au moins";
I18N_TF.it["Mindestens"] = "Almeno";
I18N_TF.es["Mindestens"] = "Al menos";
I18N_TF.pt["Mindestens"] = "Pelo menos";
I18N_TF.tr["Mindestens"] = "En az";
I18N_TF.ja["Mindestens"] = "最低";
I18N_TF.zh["Mindestens"] = "至少";
I18N_TF.ar["Mindestens"] = "على الأقل";
I18N_TF.en["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "Staff can see this week. Changes are emailed to the people affected.";
I18N_TF.fr["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "Les collaborateurs voient cette semaine. Les modifications sont envoyées par e-mail aux personnes concernées.";
I18N_TF.it["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "I collaboratori vedono questa settimana. Le modifiche vengono inviate via e-mail agli interessati.";
I18N_TF.es["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "Los empleados ven esta semana. Los cambios se comunican por correo a los afectados.";
I18N_TF.pt["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "Os colaboradores veem esta semana. As alterações são enviadas por e-mail aos afetados.";
I18N_TF.tr["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "Çalışanlar bu haftayı görür. Değişiklikler ilgili kişilere e-postayla bildirilir.";
I18N_TF.ja["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "スタッフはこの週を閲覧できます。変更は該当者にメールで通知されます。";
I18N_TF.zh["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "员工可以看到本周排班。变更会通过邮件通知相关人员。";
I18N_TF.ar["Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet."] = "يرى الموظفون هذا الأسبوع. تُرسل التغييرات بالبريد إلى المعنيين.";
I18N_TF.en["Neuer Eintrag"] = "New entry";
I18N_TF.fr["Neuer Eintrag"] = "Nouvelle entrée";
I18N_TF.it["Neuer Eintrag"] = "Nuova voce";
I18N_TF.es["Neuer Eintrag"] = "Nueva entrada";
I18N_TF.pt["Neuer Eintrag"] = "Novo registo";
I18N_TF.tr["Neuer Eintrag"] = "Yeni kayıt";
I18N_TF.ja["Neuer Eintrag"] = "新規記入";
I18N_TF.zh["Neuer Eintrag"] = "新条目";
I18N_TF.ar["Neuer Eintrag"] = "إدخال جديد";
I18N_TF.en["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "No checklists yet. Create one or use a template.";
I18N_TF.fr["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "Pas encore de checklist. Crée-en une ou reprends un modèle.";
I18N_TF.it["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "Ancora nessuna checklist. Creane una o usa un modello.";
I18N_TF.es["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "Aún no hay checklists. Crea una o usa una plantilla.";
I18N_TF.pt["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "Ainda não há checklists. Cria uma ou usa um modelo.";
I18N_TF.tr["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "Henüz kontrol listesi yok. Bir tane oluştur veya şablon kullan.";
I18N_TF.ja["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "チェックリストはまだありません。作成するかテンプレートを使ってください。";
I18N_TF.zh["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "还没有检查清单。新建一个或使用模板。";
I18N_TF.ar["Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage."] = "لا توجد قوائم تحقق بعد. أنشئ واحدة أو استخدم قالبًا.";
I18N_TF.en["Noch keine Einträge."] = "No entries yet.";
I18N_TF.fr["Noch keine Einträge."] = "Pas encore d'entrées.";
I18N_TF.it["Noch keine Einträge."] = "Ancora nessuna voce.";
I18N_TF.es["Noch keine Einträge."] = "Aún no hay entradas.";
I18N_TF.pt["Noch keine Einträge."] = "Ainda não há registos.";
I18N_TF.tr["Noch keine Einträge."] = "Henüz kayıt yok.";
I18N_TF.ja["Noch keine Einträge."] = "まだ記入はありません。";
I18N_TF.zh["Noch keine Einträge."] = "还没有条目。";
I18N_TF.ar["Noch keine Einträge."] = "لا توجد إدخالات بعد.";
I18N_TF.en["Noch nichts veröffentlicht."] = "Nothing published yet.";
I18N_TF.fr["Noch nichts veröffentlicht."] = "Rien de publié pour l'instant.";
I18N_TF.it["Noch nichts veröffentlicht."] = "Ancora nulla di pubblicato.";
I18N_TF.es["Noch nichts veröffentlicht."] = "Aún no se ha publicado nada.";
I18N_TF.pt["Noch nichts veröffentlicht."] = "Ainda nada publicado.";
I18N_TF.tr["Noch nichts veröffentlicht."] = "Henüz bir şey yayınlanmadı.";
I18N_TF.ja["Noch nichts veröffentlicht."] = "まだ公開されていません。";
I18N_TF.zh["Noch nichts veröffentlicht."] = "尚未发布。";
I18N_TF.ar["Noch nichts veröffentlicht."] = "لم يُنشر شيء بعد.";
I18N_TF.en["Nur offene Punkte"] = "Open items only";
I18N_TF.fr["Nur offene Punkte"] = "Seulement les points ouverts";
I18N_TF.it["Nur offene Punkte"] = "Solo punti aperti";
I18N_TF.es["Nur offene Punkte"] = "Solo puntos abiertos";
I18N_TF.pt["Nur offene Punkte"] = "Só pontos em aberto";
I18N_TF.tr["Nur offene Punkte"] = "Yalnızca açık konular";
I18N_TF.ja["Nur offene Punkte"] = "未対応のみ";
I18N_TF.zh["Nur offene Punkte"] = "仅未完成事项";
I18N_TF.ar["Nur offene Punkte"] = "النقاط المفتوحة فقط";
I18N_TF.en["Nächste Schichten"] = "Upcoming shifts";
I18N_TF.fr["Nächste Schichten"] = "Prochains postes";
I18N_TF.it["Nächste Schichten"] = "Prossimi turni";
I18N_TF.es["Nächste Schichten"] = "Próximos turnos";
I18N_TF.pt["Nächste Schichten"] = "Próximos turnos";
I18N_TF.tr["Nächste Schichten"] = "Sonraki vardiyalar";
I18N_TF.ja["Nächste Schichten"] = "今後のシフト";
I18N_TF.zh["Nächste Schichten"] = "接下来的班次";
I18N_TF.ar["Nächste Schichten"] = "النوبات القادمة";
I18N_TF.en["Offene Punkte im Übergabebuch"] = "Open items in the logbook";
I18N_TF.fr["Offene Punkte im Übergabebuch"] = "Points ouverts dans le cahier de liaison";
I18N_TF.it["Offene Punkte im Übergabebuch"] = "Punti aperti nel registro";
I18N_TF.es["Offene Punkte im Übergabebuch"] = "Puntos abiertos en el libro de relevo";
I18N_TF.pt["Offene Punkte im Übergabebuch"] = "Pontos em aberto no livro de passagem";
I18N_TF.tr["Offene Punkte im Übergabebuch"] = "Devir defterindeki açık konular";
I18N_TF.ja["Offene Punkte im Übergabebuch"] = "引継ぎ帳の未対応事項";
I18N_TF.zh["Offene Punkte im Übergabebuch"] = "交接本中的未完成事项";
I18N_TF.ar["Offene Punkte im Übergabebuch"] = "النقاط المفتوحة في سجل التسليم";
I18N_TF.en["Punkte (einer pro Zeile)"] = "Items (one per line)";
I18N_TF.fr["Punkte (einer pro Zeile)"] = "Points (un par ligne)";
I18N_TF.it["Punkte (einer pro Zeile)"] = "Punti (uno per riga)";
I18N_TF.es["Punkte (einer pro Zeile)"] = "Puntos (uno por línea)";
I18N_TF.pt["Punkte (einer pro Zeile)"] = "Pontos (um por linha)";
I18N_TF.tr["Punkte (einer pro Zeile)"] = "Maddeler (her satıra bir)";
I18N_TF.ja["Punkte (einer pro Zeile)"] = "項目（1行に1つ）";
I18N_TF.zh["Punkte (einer pro Zeile)"] = "条目（每行一个）";
I18N_TF.ar["Punkte (einer pro Zeile)"] = "البنود (واحد في كل سطر)";
I18N_TF.en["Schichtzeiten und Mindestbesetzung"] = "Shift times and minimum staffing";
I18N_TF.fr["Schichtzeiten und Mindestbesetzung"] = "Horaires des postes et effectif minimum";
I18N_TF.it["Schichtzeiten und Mindestbesetzung"] = "Orari dei turni e copertura minima";
I18N_TF.es["Schichtzeiten und Mindestbesetzung"] = "Horarios de turno y cobertura mínima";
I18N_TF.pt["Schichtzeiten und Mindestbesetzung"] = "Horários dos turnos e cobertura mínima";
I18N_TF.tr["Schichtzeiten und Mindestbesetzung"] = "Vardiya saatleri ve asgari kadro";
I18N_TF.ja["Schichtzeiten und Mindestbesetzung"] = "シフト時間と最低配置人数";
I18N_TF.zh["Schichtzeiten und Mindestbesetzung"] = "班次时间和最低在岗人数";
I18N_TF.ar["Schichtzeiten und Mindestbesetzung"] = "أوقات النوبات والحد الأدنى للتغطية";
I18N_TF.en["Soll"] = "Target";
I18N_TF.fr["Soll"] = "Objectif";
I18N_TF.it["Soll"] = "Obiettivo";
I18N_TF.es["Soll"] = "Objetivo";
I18N_TF.pt["Soll"] = "Objetivo";
I18N_TF.tr["Soll"] = "Hedef";
I18N_TF.ja["Soll"] = "目標";
I18N_TF.zh["Soll"] = "目标";
I18N_TF.ar["Soll"] = "المستهدف";
I18N_TF.en["Soll-Stunden pro Woche für {0} (leer = keine)"] = "Target hours per week for {0} (empty = none)";
I18N_TF.fr["Soll-Stunden pro Woche für {0} (leer = keine)"] = "Heures cibles par semaine pour {0} (vide = aucune)";
I18N_TF.it["Soll-Stunden pro Woche für {0} (leer = keine)"] = "Ore previste a settimana per {0} (vuoto = nessuna)";
I18N_TF.es["Soll-Stunden pro Woche für {0} (leer = keine)"] = "Horas objetivo por semana para {0} (vacío = ninguna)";
I18N_TF.pt["Soll-Stunden pro Woche für {0} (leer = keine)"] = "Horas-alvo por semana para {0} (vazio = nenhuma)";
I18N_TF.tr["Soll-Stunden pro Woche für {0} (leer = keine)"] = "{0} için haftalık hedef saat (boş = yok)";
I18N_TF.ja["Soll-Stunden pro Woche für {0} (leer = keine)"] = "{0}の週あたり目標時間（空欄＝なし）";
I18N_TF.zh["Soll-Stunden pro Woche für {0} (leer = keine)"] = "{0} 的每周目标工时（空 = 无）";
I18N_TF.ar["Soll-Stunden pro Woche für {0} (leer = keine)"] = "الساعات المستهدفة أسبوعيًا لـ {0} (فارغ = لا شيء)";
I18N_TF.en["Stundenkonto"] = "Hours balance";
I18N_TF.fr["Stundenkonto"] = "Compteur d'heures";
I18N_TF.it["Stundenkonto"] = "Conto ore";
I18N_TF.es["Stundenkonto"] = "Bolsa de horas";
I18N_TF.pt["Stundenkonto"] = "Banco de horas";
I18N_TF.tr["Stundenkonto"] = "Saat hesabı";
I18N_TF.ja["Stundenkonto"] = "労働時間の収支";
I18N_TF.zh["Stundenkonto"] = "工时账户";
I18N_TF.ar["Stundenkonto"] = "رصيد الساعات";
I18N_TF.en["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "Tip: drag shifts with the mouse to move them – hold Ctrl to copy them.";
I18N_TF.fr["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "Astuce : fais glisser les postes pour les déplacer – avec Ctrl enfoncé, ils sont copiés.";
I18N_TF.it["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "Suggerimento: trascina i turni per spostarli – tenendo premuto Ctrl vengono copiati.";
I18N_TF.es["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "Consejo: arrastra los turnos para moverlos; con Ctrl pulsado se copian.";
I18N_TF.pt["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "Dica: arrasta os turnos para os mover – com Ctrl premido são copiados.";
I18N_TF.tr["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "İpucu: Vardiyaları taşımak için fareyle sürükle – Ctrl basılıyken kopyalanır.";
I18N_TF.ja["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "ヒント：シフトをドラッグして移動、Ctrlキーを押しながらでコピーできます。";
I18N_TF.zh["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "提示：用鼠标拖动班次即可移动，按住 Ctrl 则为复制。";
I18N_TF.ar["Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert."] = "تلميح: اسحب النوبات بالماوس لنقلها – مع الضغط على Ctrl يتم نسخها.";
I18N_TF.en["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "Tap a day: available → rather not → not available → no answer. The head of department sees this when planning.";
I18N_TF.fr["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "Touche un jour : disponible → plutôt pas → indisponible → pas d'indication. Le chef de service le voit en planifiant.";
I18N_TF.it["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "Tocca un giorno: disponibile → preferibilmente no → non disponibile → nessuna indicazione. Il capo reparto lo vede pianificando.";
I18N_TF.es["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "Toca un día: disponible → mejor no → no disponible → sin indicar. El jefe de departamento lo ve al planificar.";
I18N_TF.pt["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "Toca num dia: disponível → de preferência não → indisponível → sem indicação. O chefe de departamento vê isto ao planear.";
I18N_TF.tr["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "Bir güne dokun: uygun → tercihen değil → uygun değil → belirtilmedi. Departman müdürü planlarken görür.";
I18N_TF.ja["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "日付をタップ：勤務可 → できれば不可 → 不可 → 未回答。部門長が計画時に確認します。";
I18N_TF.zh["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "点击日期：可上班 → 尽量不要 → 不可上班 → 未填写。部门负责人排班时可见。";
I18N_TF.ar["Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen."] = "اضغط على يوم: متاح ← يفضّل لا ← غير متاح ← بلا إجابة. يرى رئيس القسم ذلك عند التخطيط.";
I18N_TF.en["Veröffentlichen & benachrichtigen"] = "Publish & notify";
I18N_TF.fr["Veröffentlichen & benachrichtigen"] = "Publier et prévenir";
I18N_TF.it["Veröffentlichen & benachrichtigen"] = "Pubblica e avvisa";
I18N_TF.es["Veröffentlichen & benachrichtigen"] = "Publicar y avisar";
I18N_TF.pt["Veröffentlichen & benachrichtigen"] = "Publicar e avisar";
I18N_TF.tr["Veröffentlichen & benachrichtigen"] = "Yayınla ve bildir";
I18N_TF.ja["Veröffentlichen & benachrichtigen"] = "公開して通知";
I18N_TF.zh["Veröffentlichen & benachrichtigen"] = "发布并通知";
I18N_TF.ar["Veröffentlichen & benachrichtigen"] = "نشر وإشعار";
I18N_TF.en["Veröffentlicht"] = "Published";
I18N_TF.fr["Veröffentlicht"] = "Publié";
I18N_TF.it["Veröffentlicht"] = "Pubblicato";
I18N_TF.es["Veröffentlicht"] = "Publicado";
I18N_TF.pt["Veröffentlicht"] = "Publicado";
I18N_TF.tr["Veröffentlicht"] = "Yayınlandı";
I18N_TF.ja["Veröffentlicht"] = "公開済み";
I18N_TF.zh["Veröffentlicht"] = "已发布";
I18N_TF.ar["Veröffentlicht"] = "منشور";
I18N_TF.en["Veröffentlicht."] = "Published.";
I18N_TF.fr["Veröffentlicht."] = "Publié.";
I18N_TF.it["Veröffentlicht."] = "Pubblicato.";
I18N_TF.es["Veröffentlicht."] = "Publicado.";
I18N_TF.pt["Veröffentlicht."] = "Publicado.";
I18N_TF.tr["Veröffentlicht."] = "Yayınlandı.";
I18N_TF.ja["Veröffentlicht."] = "公開しました。";
I18N_TF.zh["Veröffentlicht."] = "已发布。";
I18N_TF.ar["Veröffentlicht."] = "تم النشر.";
I18N_TF.en["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "Published. {0} people were notified by email.";
I18N_TF.fr["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "Publié. {0} personnes ont été prévenues par e-mail.";
I18N_TF.it["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "Pubblicato. {0} persone sono state avvisate via e-mail.";
I18N_TF.es["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "Publicado. Se avisó por correo a {0} personas.";
I18N_TF.pt["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "Publicado. {0} pessoas foram avisadas por e-mail.";
I18N_TF.tr["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "Yayınlandı. {0} kişiye e-postayla bildirildi.";
I18N_TF.ja["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "公開しました。{0}人にメールで通知しました。";
I18N_TF.zh["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "已发布。已通过邮件通知 {0} 人。";
I18N_TF.ar["Veröffentlicht. {0} Personen wurden per E-Mail informiert."] = "تم النشر. تم إشعار {0} أشخاص بالبريد الإلكتروني.";
I18N_TF.en["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "Withdraw publication? Staff will no longer see this week.";
I18N_TF.fr["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "Retirer la publication ? Les collaborateurs ne verront plus cette semaine.";
I18N_TF.it["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "Ritirare la pubblicazione? I collaboratori non vedranno più questa settimana.";
I18N_TF.es["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "¿Retirar la publicación? Los empleados ya no verán esta semana.";
I18N_TF.pt["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "Retirar a publicação? Os colaboradores deixam de ver esta semana.";
I18N_TF.tr["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "Yayın geri çekilsin mi? Çalışanlar bu haftayı artık görmez.";
I18N_TF.ja["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "公開を取り消しますか？スタッフはこの週を見られなくなります。";
I18N_TF.zh["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "撤回发布？员工将无法再看到本周排班。";
I18N_TF.ar["Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."] = "سحب النشر؟ لن يرى الموظفون هذا الأسبوع بعد ذلك.";
I18N_TF.en["Vorlagen:"] = "Templates:";
I18N_TF.fr["Vorlagen:"] = "Modèles :";
I18N_TF.it["Vorlagen:"] = "Modelli:";
I18N_TF.es["Vorlagen:"] = "Plantillas:";
I18N_TF.pt["Vorlagen:"] = "Modelos:";
I18N_TF.tr["Vorlagen:"] = "Şablonlar:";
I18N_TF.ja["Vorlagen:"] = "テンプレート：";
I18N_TF.zh["Vorlagen:"] = "模板：";
I18N_TF.ar["Vorlagen:"] = "القوالب:";
I18N_TF.en["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "What should the next shift know? e.g. room 214: remote missing, guest in 305 leaving early …";
I18N_TF.fr["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "Que doit savoir le poste suivant ? p. ex. chambre 214 : télécommande manquante, client de la 305 part plus tôt …";
I18N_TF.it["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "Cosa deve sapere il turno successivo? es. camera 214: manca il telecomando, ospite della 305 parte prima …";
I18N_TF.es["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "¿Qué debe saber el siguiente turno? p. ej. habitación 214: falta el mando, el huésped de la 305 sale antes …";
I18N_TF.pt["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "O que deve saber o próximo turno? p. ex. quarto 214: falta o comando, hóspede do 305 sai mais cedo …";
I18N_TF.tr["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "Sonraki vardiya neyi bilmeli? ör. oda 214: kumanda eksik, 305'teki misafir erken ayrılıyor …";
I18N_TF.ja["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "次のシフトへの申し送りは？例：214号室リモコンなし、305号室のお客様が早めにチェックアウト…";
I18N_TF.zh["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "下一班需要知道什么？例如：214 房遥控器缺失，305 房客人提前离店…";
I18N_TF.ar["Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …"] = "ما الذي يجب أن تعرفه المناوبة التالية؟ مثل: الغرفة 214 جهاز التحكم مفقود، ضيف 305 يغادر مبكرًا …";
I18N_TF.en["Zum Dienstplan →"] = "To the rota →";
I18N_TF.fr["Zum Dienstplan →"] = "Vers le planning →";
I18N_TF.it["Zum Dienstplan →"] = "Ai turni →";
I18N_TF.es["Zum Dienstplan →"] = "Ir a los turnos →";
I18N_TF.pt["Zum Dienstplan →"] = "Ir para a escala →";
I18N_TF.tr["Zum Dienstplan →"] = "Vardiya planına →";
I18N_TF.ja["Zum Dienstplan →"] = "勤務表へ →";
I18N_TF.zh["Zum Dienstplan →"] = "前往排班表 →";
I18N_TF.ar["Zum Dienstplan →"] = "إلى جدول المناوبات ←";
I18N_TF.en["mehr als 48 Stunden in der Woche"] = "more than 48 hours in the week";
I18N_TF.fr["mehr als 48 Stunden in der Woche"] = "plus de 48 heures dans la semaine";
I18N_TF.it["mehr als 48 Stunden in der Woche"] = "più di 48 ore nella settimana";
I18N_TF.es["mehr als 48 Stunden in der Woche"] = "más de 48 horas en la semana";
I18N_TF.pt["mehr als 48 Stunden in der Woche"] = "mais de 48 horas na semana";
I18N_TF.tr["mehr als 48 Stunden in der Woche"] = "haftada 48 saatten fazla";
I18N_TF.ja["mehr als 48 Stunden in der Woche"] = "週48時間超";
I18N_TF.zh["mehr als 48 Stunden in der Woche"] = "一周超过 48 小时";
I18N_TF.ar["mehr als 48 Stunden in der Woche"] = "أكثر من 48 ساعة في الأسبوع";
I18N_TF.en["{0} offene Punkte"] = "{0} open items";
I18N_TF.fr["{0} offene Punkte"] = "{0} points ouverts";
I18N_TF.it["{0} offene Punkte"] = "{0} punti aperti";
I18N_TF.es["{0} offene Punkte"] = "{0} puntos abiertos";
I18N_TF.pt["{0} offene Punkte"] = "{0} pontos em aberto";
I18N_TF.tr["{0} offene Punkte"] = "{0} açık konu";
I18N_TF.ja["{0} offene Punkte"] = "未対応 {0}件";
I18N_TF.zh["{0} offene Punkte"] = "{0} 个未完成事项";
I18N_TF.ar["{0} offene Punkte"] = "{0} نقاط مفتوحة";
I18N_TF.en["{0}: mehr als 10 Stunden"] = "{0}: more than 10 hours";
I18N_TF.fr["{0}: mehr als 10 Stunden"] = "{0} : plus de 10 heures";
I18N_TF.it["{0}: mehr als 10 Stunden"] = "{0}: più di 10 ore";
I18N_TF.es["{0}: mehr als 10 Stunden"] = "{0}: más de 10 horas";
I18N_TF.pt["{0}: mehr als 10 Stunden"] = "{0}: mais de 10 horas";
I18N_TF.tr["{0}: mehr als 10 Stunden"] = "{0}: 10 saatten fazla";
I18N_TF.ja["{0}: mehr als 10 Stunden"] = "{0}：10時間超";
I18N_TF.zh["{0}: mehr als 10 Stunden"] = "{0}：超过 10 小时";
I18N_TF.ar["{0}: mehr als 10 Stunden"] = "{0}: أكثر من 10 ساعات";
I18N_TF.en["{0}: nur {1} h Ruhezeit"] = "{0}: only {1} h rest";
I18N_TF.fr["{0}: nur {1} h Ruhezeit"] = "{0} : seulement {1} h de repos";
I18N_TF.it["{0}: nur {1} h Ruhezeit"] = "{0}: solo {1} h di riposo";
I18N_TF.es["{0}: nur {1} h Ruhezeit"] = "{0}: solo {1} h de descanso";
I18N_TF.pt["{0}: nur {1} h Ruhezeit"] = "{0}: só {1} h de descanso";
I18N_TF.tr["{0}: nur {1} h Ruhezeit"] = "{0}: yalnızca {1} saat dinlenme";
I18N_TF.ja["{0}: nur {1} h Ruhezeit"] = "{0}：休息{1}時間のみ";
I18N_TF.zh["{0}: nur {1} h Ruhezeit"] = "{0}：仅 {1} 小时休息";
I18N_TF.ar["{0}: nur {1} h Ruhezeit"] = "{0}: راحة {1} ساعة فقط";
I18N_TF.en["Übergabebuch"] = "Logbook";
I18N_TF.fr["Übergabebuch"] = "Cahier de liaison";
I18N_TF.it["Übergabebuch"] = "Registro consegne";
I18N_TF.es["Übergabebuch"] = "Libro de relevo";
I18N_TF.pt["Übergabebuch"] = "Livro de passagem";
I18N_TF.tr["Übergabebuch"] = "Devir defteri";
I18N_TF.ja["Übergabebuch"] = "引継ぎ帳";
I18N_TF.zh["Übergabebuch"] = "交接本";
I18N_TF.ar["Übergabebuch"] = "سجل التسليم";
I18N.en["Start"] = "Home";
I18N.fr["Start"] = "Accueil";
I18N.it["Start"] = "Home";
I18N.es["Start"] = "Inicio";
I18N.pt["Start"] = "Início";
I18N.tr["Start"] = "Ana sayfa";
I18N.ja["Start"] = "ホーム";
I18N.zh["Start"] = "首页";
I18N.ar["Start"] = "الرئيسية";
I18N.en["Übergabebuch"] = "Logbook";
I18N.fr["Übergabebuch"] = "Cahier de liaison";
I18N.it["Übergabebuch"] = "Registro consegne";
I18N.es["Übergabebuch"] = "Libro de relevo";
I18N.pt["Übergabebuch"] = "Livro de passagem";
I18N.tr["Übergabebuch"] = "Devir defteri";
I18N.ja["Übergabebuch"] = "引継ぎ帳";
I18N.zh["Übergabebuch"] = "交接本";
I18N.ar["Übergabebuch"] = "سجل التسليم";
I18N.en["Checklisten"] = "Checklists";
I18N.fr["Checklisten"] = "Checklists";
I18N.it["Checklisten"] = "Checklist";
I18N.es["Checklisten"] = "Checklists";
I18N.pt["Checklisten"] = "Checklists";
I18N.tr["Checklisten"] = "Kontrol listeleri";
I18N.ja["Checklisten"] = "チェックリスト";
I18N.zh["Checklisten"] = "检查清单";
I18N.ar["Checklisten"] = "قوائم التحقق";
I18N.en["lieber nicht"] = "rather not";
I18N.fr["lieber nicht"] = "plutôt pas";
I18N.it["lieber nicht"] = "preferibilmente no";
I18N.es["lieber nicht"] = "mejor no";
I18N.pt["lieber nicht"] = "de preferência não";
I18N.tr["lieber nicht"] = "tercihen değil";
I18N.ja["lieber nicht"] = "できれば不可";
I18N.zh["lieber nicht"] = "尽量不要";
I18N.ar["lieber nicht"] = "يفضّل لا";
I18N.en["nicht verfügbar"] = "not available";
I18N.fr["nicht verfügbar"] = "indisponible";
I18N.it["nicht verfügbar"] = "non disponibile";
I18N.es["nicht verfügbar"] = "no disponible";
I18N.pt["nicht verfügbar"] = "indisponível";
I18N.tr["nicht verfügbar"] = "uygun değil";
I18N.ja["nicht verfügbar"] = "不可";
I18N.zh["nicht verfügbar"] = "不可上班";
I18N.ar["nicht verfügbar"] = "غير متاح";
I18N.en["Info"] = "Info";
I18N.fr["Info"] = "Info";
I18N.it["Info"] = "Info";
I18N.es["Info"] = "Info";
I18N.pt["Info"] = "Info";
I18N.tr["Info"] = "Bilgi";
I18N.ja["Info"] = "情報";
I18N.zh["Info"] = "信息";
I18N.ar["Info"] = "معلومة";
I18N.en["Wichtig"] = "Important";
I18N.fr["Wichtig"] = "Important";
I18N.it["Wichtig"] = "Importante";
I18N.es["Wichtig"] = "Importante";
I18N.pt["Wichtig"] = "Importante";
I18N.tr["Wichtig"] = "Önemli";
I18N.ja["Wichtig"] = "重要";
I18N.zh["Wichtig"] = "重要";
I18N.ar["Wichtig"] = "مهم";

// 018: Logo/Farbe, App, Erste Schritte, Demo
I18N.en["Abteilungsleitung Housekeeping"] = "Housekeeping manager";
I18N.fr["Abteilungsleitung Housekeeping"] = "Responsable housekeeping";
I18N.it["Abteilungsleitung Housekeeping"] = "Responsabile housekeeping";
I18N.es["Abteilungsleitung Housekeeping"] = "Jefe/a de housekeeping";
I18N.pt["Abteilungsleitung Housekeeping"] = "Chefe de housekeeping";
I18N.tr["Abteilungsleitung Housekeeping"] = "Kat hizmetleri müdürü";
I18N.ja["Abteilungsleitung Housekeeping"] = "ハウスキーピング責任者";
I18N.zh["Abteilungsleitung Housekeeping"] = "客房部经理";
I18N.ar["Abteilungsleitung Housekeeping"] = "مدير التدبير الفندقي";
I18N.en["Admin / Direktion"] = "Admin / management";
I18N.fr["Admin / Direktion"] = "Admin / direction";
I18N.it["Admin / Direktion"] = "Admin / direzione";
I18N.es["Admin / Direktion"] = "Admin / dirección";
I18N.pt["Admin / Direktion"] = "Admin / direção";
I18N.tr["Admin / Direktion"] = "Yönetici / müdürlük";
I18N.ja["Admin / Direktion"] = "管理者 / 経営陣";
I18N.zh["Admin / Direktion"] = "管理员 / 管理层";
I18N.ar["Admin / Direktion"] = "المسؤول / الإدارة";
I18N.en["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "Try everything – changes are not saved.";
I18N.fr["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "Testez tout – les modifications ne sont pas enregistrées.";
I18N.it["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "Prova tutto – le modifiche non vengono salvate.";
I18N.es["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "Pruébalo todo – los cambios no se guardan.";
I18N.pt["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "Experimente tudo – as alterações não são guardadas.";
I18N.tr["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "Her şeyi deneyin – değişiklikler kaydedilmez.";
I18N.ja["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "すべて試せます – 変更は保存されません。";
I18N.zh["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "随意体验 – 更改不会被保存。";
I18N.ar["Alles ausprobieren – Änderungen werden nicht gespeichert."] = "جرّب كل شيء – لا يتم حفظ التغييرات.";
I18N.en["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "On iPhone: tap “Share” at the bottom and choose “Add to Home Screen”.";
I18N.fr["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "Sur iPhone : touchez « Partager » en bas, puis « Sur l’écran d’accueil ».";
I18N.it["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "Su iPhone: tocca «Condividi» in basso e scegli «Aggiungi alla schermata Home».";
I18N.es["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "En iPhone: toca «Compartir» abajo y elige «Añadir a pantalla de inicio».";
I18N.pt["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "No iPhone: toque em «Partilhar» em baixo e escolha «Adicionar ao ecrã principal».";
I18N.tr["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "iPhone’da: alttaki “Paylaş”a dokunun ve “Ana Ekrana Ekle”yi seçin.";
I18N.ja["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "iPhoneの場合：下の「共有」をタップし、「ホーム画面に追加」を選択します。";
I18N.zh["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "在 iPhone 上：点击底部的“分享”，然后选择“添加到主屏幕”。";
I18N.ar["Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."] = "على iPhone: اضغط على «مشاركة» في الأسفل واختر «إضافة إلى الشاشة الرئيسية».";
I18N.en["Ansicht als:"] = "View as:";
I18N.fr["Ansicht als:"] = "Afficher en tant que :";
I18N.it["Ansicht als:"] = "Visualizza come:";
I18N.es["Ansicht als:"] = "Ver como:";
I18N.pt["Ansicht als:"] = "Ver como:";
I18N.tr["Ansicht als:"] = "Görünüm:";
I18N.ja["Ansicht als:"] = "表示ロール：";
I18N.zh["Ansicht als:"] = "查看身份：";
I18N.ar["Ansicht als:"] = "العرض بصفة:";
I18N.en["App installieren"] = "Install app";
I18N.fr["App installieren"] = "Installer l’app";
I18N.it["App installieren"] = "Installa app";
I18N.es["App installieren"] = "Instalar app";
I18N.pt["App installieren"] = "Instalar app";
I18N.tr["App installieren"] = "Uygulamayı yükle";
I18N.ja["App installieren"] = "アプリをインストール";
I18N.zh["App installieren"] = "安装应用";
I18N.ar["App installieren"] = "تثبيت التطبيق";
I18N.en["Ausblenden"] = "Hide";
I18N.fr["Ausblenden"] = "Masquer";
I18N.it["Ausblenden"] = "Nascondi";
I18N.es["Ausblenden"] = "Ocultar";
I18N.pt["Ausblenden"] = "Ocultar";
I18N.tr["Ausblenden"] = "Gizle";
I18N.ja["Ausblenden"] = "非表示";
I18N.zh["Ausblenden"] = "隐藏";
I18N.ar["Ausblenden"] = "إخفاء";
I18N.en["Bitte eine Bilddatei wählen."] = "Please choose an image file.";
I18N.fr["Bitte eine Bilddatei wählen."] = "Veuillez choisir un fichier image.";
I18N.it["Bitte eine Bilddatei wählen."] = "Scegli un file immagine.";
I18N.es["Bitte eine Bilddatei wählen."] = "Elige un archivo de imagen.";
I18N.pt["Bitte eine Bilddatei wählen."] = "Escolha um ficheiro de imagem.";
I18N.tr["Bitte eine Bilddatei wählen."] = "Lütfen bir resim dosyası seçin.";
I18N.ja["Bitte eine Bilddatei wählen."] = "画像ファイルを選択してください。";
I18N.zh["Bitte eine Bilddatei wählen."] = "请选择图片文件。";
I18N.ar["Bitte eine Bilddatei wählen."] = "يرجى اختيار ملف صورة.";
I18N.en["Das Logo ist zu groß."] = "The logo is too large.";
I18N.fr["Das Logo ist zu groß."] = "Le logo est trop volumineux.";
I18N.it["Das Logo ist zu groß."] = "Il logo è troppo grande.";
I18N.es["Das Logo ist zu groß."] = "El logotipo es demasiado grande.";
I18N.pt["Das Logo ist zu groß."] = "O logótipo é demasiado grande.";
I18N.tr["Das Logo ist zu groß."] = "Logo çok büyük.";
I18N.ja["Das Logo ist zu groß."] = "ロゴのサイズが大きすぎます。";
I18N.zh["Das Logo ist zu groß."] = "标志文件过大。";
I18N.ar["Das Logo ist zu groß."] = "الشعار كبير جدًا.";
I18N.en["Erste Schritte"] = "Getting started";
I18N.fr["Erste Schritte"] = "Premiers pas";
I18N.it["Erste Schritte"] = "Primi passi";
I18N.es["Erste Schritte"] = "Primeros pasos";
I18N.pt["Erste Schritte"] = "Primeiros passos";
I18N.tr["Erste Schritte"] = "İlk adımlar";
I18N.ja["Erste Schritte"] = "はじめに";
I18N.zh["Erste Schritte"] = "入门步骤";
I18N.ar["Erste Schritte"] = "الخطوات الأولى";
I18N.en["Ersten Dienstplan anlegen"] = "Create the first roster";
I18N.fr["Ersten Dienstplan anlegen"] = "Créer le premier planning";
I18N.it["Ersten Dienstplan anlegen"] = "Crea il primo turno";
I18N.es["Ersten Dienstplan anlegen"] = "Crear el primer cuadrante";
I18N.pt["Ersten Dienstplan anlegen"] = "Criar a primeira escala";
I18N.tr["Ersten Dienstplan anlegen"] = "İlk vardiya planını oluşturun";
I18N.ja["Ersten Dienstplan anlegen"] = "最初の勤務表を作成";
I18N.zh["Ersten Dienstplan anlegen"] = "创建第一份排班表";
I18N.ar["Ersten Dienstplan anlegen"] = "إنشاء أول جدول مناوبات";
I18N.en["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "In the browser menu, choose “Install app” or “Add to Home screen”.";
I18N.fr["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».";
I18N.it["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "Nel menu del browser scegli «Installa app» o «Aggiungi a schermata Home».";
I18N.es["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "En el menú del navegador elige «Instalar aplicación» o «Añadir a pantalla de inicio».";
I18N.pt["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "No menu do navegador escolha «Instalar aplicação» ou «Adicionar ao ecrã principal».";
I18N.tr["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "Tarayıcı menüsünde “Uygulamayı yükle” veya “Ana ekrana ekle”yi seçin.";
I18N.ja["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "ブラウザのメニューで「アプリをインストール」または「ホーム画面に追加」を選択します。";
I18N.zh["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "在浏览器菜单中选择“安装应用”或“添加到主屏幕”。";
I18N.ar["Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen."] = "من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».";
I18N.en["Kostenlos testen"] = "Try for free";
I18N.fr["Kostenlos testen"] = "Essai gratuit";
I18N.it["Kostenlos testen"] = "Prova gratis";
I18N.es["Kostenlos testen"] = "Prueba gratis";
I18N.pt["Kostenlos testen"] = "Experimente grátis";
I18N.tr["Kostenlos testen"] = "Ücretsiz deneyin";
I18N.ja["Kostenlos testen"] = "無料で試す";
I18N.zh["Kostenlos testen"] = "免费试用";
I18N.ar["Kostenlos testen"] = "جرّب مجانًا";
I18N.en["Live-Demo"] = "Live demo";
I18N.fr["Live-Demo"] = "Démo en direct";
I18N.it["Live-Demo"] = "Demo live";
I18N.es["Live-Demo"] = "Demo en vivo";
I18N.pt["Live-Demo"] = "Demo ao vivo";
I18N.tr["Live-Demo"] = "Canlı demo";
I18N.ja["Live-Demo"] = "ライブデモ";
I18N.zh["Live-Demo"] = "在线演示";
I18N.ar["Live-Demo"] = "عرض تجريبي مباشر";
I18N.en["Logo"] = "Logo";
I18N.fr["Logo"] = "Logo";
I18N.it["Logo"] = "Logo";
I18N.es["Logo"] = "Logotipo";
I18N.pt["Logo"] = "Logótipo";
I18N.tr["Logo"] = "Logo";
I18N.ja["Logo"] = "ロゴ";
I18N.zh["Logo"] = "标志";
I18N.ar["Logo"] = "الشعار";
I18N.en["Logo hochladen"] = "Upload logo";
I18N.fr["Logo hochladen"] = "Téléverser le logo";
I18N.it["Logo hochladen"] = "Carica logo";
I18N.es["Logo hochladen"] = "Subir logotipo";
I18N.pt["Logo hochladen"] = "Carregar logótipo";
I18N.tr["Logo hochladen"] = "Logo yükle";
I18N.ja["Logo hochladen"] = "ロゴをアップロード";
I18N.zh["Logo hochladen"] = "上传标志";
I18N.ar["Logo hochladen"] = "رفع الشعار";
I18N.en["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "The logo and colour appear in the sidebar, in the status report and on shared roster images.";
I18N.fr["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "Le logo et la couleur apparaissent dans la barre latérale, dans le rapport d’état et sur les images de planning partagées.";
I18N.it["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "Logo e colore compaiono nella barra laterale, nel report di stato e nelle immagini dei turni condivise.";
I18N.es["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "El logotipo y el color aparecen en la barra lateral, en el informe de estado y en las imágenes de cuadrante compartidas.";
I18N.pt["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "O logótipo e a cor aparecem na barra lateral, no relatório de estado e nas imagens de escala partilhadas.";
I18N.tr["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "Logo ve renk kenar çubuğunda, durum raporunda ve paylaşılan vardiya görsellerinde görünür.";
I18N.ja["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "ロゴと色はサイドバー、ステータスレポート、共有する勤務表の画像に表示されます。";
I18N.zh["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "标志和颜色会显示在侧边栏、状态报告以及分享的排班图片中。";
I18N.ar["Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern."] = "يظهر الشعار واللون في الشريط الجانبي وتقرير الحالة وصور جداول المناوبات المشتركة.";
I18N.en["Los"] = "Go";
I18N.fr["Los"] = "Go";
I18N.it["Los"] = "Vai";
I18N.es["Los"] = "Ir";
I18N.pt["Los"] = "Ir";
I18N.tr["Los"] = "Başla";
I18N.ja["Los"] = "開始";
I18N.zh["Los"] = "开始";
I18N.ar["Los"] = "ابدأ";
I18N.en["Markenfarbe"] = "Brand colour";
I18N.fr["Markenfarbe"] = "Couleur de marque";
I18N.it["Markenfarbe"] = "Colore del marchio";
I18N.es["Markenfarbe"] = "Color de marca";
I18N.pt["Markenfarbe"] = "Cor da marca";
I18N.tr["Markenfarbe"] = "Marka rengi";
I18N.ja["Markenfarbe"] = "ブランドカラー";
I18N.zh["Markenfarbe"] = "品牌颜色";
I18N.ar["Markenfarbe"] = "لون العلامة";
I18N.en["Mitarbeitende Housekeeping"] = "Housekeeping staff";
I18N.fr["Mitarbeitende Housekeeping"] = "Employé·e housekeeping";
I18N.it["Mitarbeitende Housekeeping"] = "Personale housekeeping";
I18N.es["Mitarbeitende Housekeeping"] = "Personal de housekeeping";
I18N.pt["Mitarbeitende Housekeeping"] = "Colaborador de housekeeping";
I18N.tr["Mitarbeitende Housekeeping"] = "Kat hizmetleri çalışanı";
I18N.ja["Mitarbeitende Housekeeping"] = "ハウスキーピングスタッフ";
I18N.zh["Mitarbeitende Housekeeping"] = "客房部员工";
I18N.ar["Mitarbeitende Housekeeping"] = "موظف التدبير الفندقي";
I18N.en["Ouverture als App"] = "Ouverture as an app";
I18N.fr["Ouverture als App"] = "Ouverture en application";
I18N.it["Ouverture als App"] = "Ouverture come app";
I18N.es["Ouverture als App"] = "Ouverture como app";
I18N.pt["Ouverture als App"] = "Ouverture como app";
I18N.tr["Ouverture als App"] = "Uygulama olarak Ouverture";
I18N.ja["Ouverture als App"] = "アプリ版 Ouverture";
I18N.zh["Ouverture als App"] = "Ouverture 应用";
I18N.ar["Ouverture als App"] = "Ouverture كتطبيق";
I18N.en["Ouverture als App aufs Handy holen"] = "Put Ouverture on your phone as an app";
I18N.fr["Ouverture als App aufs Handy holen"] = "Installer Ouverture sur le téléphone";
I18N.it["Ouverture als App aufs Handy holen"] = "Installa Ouverture come app sul telefono";
I18N.es["Ouverture als App aufs Handy holen"] = "Lleva Ouverture al móvil como app";
I18N.pt["Ouverture als App aufs Handy holen"] = "Instale o Ouverture no telemóvel como app";
I18N.tr["Ouverture als App aufs Handy holen"] = "Ouverture’ı telefona uygulama olarak ekleyin";
I18N.ja["Ouverture als App aufs Handy holen"] = "Ouverture をスマホにアプリとして追加";
I18N.zh["Ouverture als App aufs Handy holen"] = "将 Ouverture 作为应用添加到手机";
I18N.ar["Ouverture als App aufs Handy holen"] = "ثبّت Ouverture كتطبيق على الهاتف";
I18N.en["Ouverture ist als App installiert."] = "Ouverture is installed as an app.";
I18N.fr["Ouverture ist als App installiert."] = "Ouverture est installé comme application.";
I18N.it["Ouverture ist als App installiert."] = "Ouverture è installato come app.";
I18N.es["Ouverture ist als App installiert."] = "Ouverture está instalado como app.";
I18N.pt["Ouverture ist als App installiert."] = "O Ouverture está instalado como app.";
I18N.tr["Ouverture ist als App installiert."] = "Ouverture uygulama olarak yüklü.";
I18N.ja["Ouverture ist als App installiert."] = "Ouverture はアプリとしてインストール済みです。";
I18N.zh["Ouverture ist als App installiert."] = "Ouverture 已作为应用安装。";
I18N.ar["Ouverture ist als App installiert."] = "تم تثبيت Ouverture كتطبيق.";
I18N.en["Pre-Opening-Vorlage anwenden"] = "Apply the pre-opening template";
I18N.fr["Pre-Opening-Vorlage anwenden"] = "Appliquer le modèle de pré-ouverture";
I18N.it["Pre-Opening-Vorlage anwenden"] = "Applica il modello di pre-apertura";
I18N.es["Pre-Opening-Vorlage anwenden"] = "Aplicar la plantilla de preapertura";
I18N.pt["Pre-Opening-Vorlage anwenden"] = "Aplicar o modelo de pré-abertura";
I18N.tr["Pre-Opening-Vorlage anwenden"] = "Açılış öncesi şablonunu uygulayın";
I18N.ja["Pre-Opening-Vorlage anwenden"] = "開業準備テンプレートを適用";
I18N.zh["Pre-Opening-Vorlage anwenden"] = "应用开业筹备模板";
I18N.ar["Pre-Opening-Vorlage anwenden"] = "تطبيق قالب ما قبل الافتتاح";
I18N.en["Rollen und Abteilungen zuordnen"] = "Assign roles and departments";
I18N.fr["Rollen und Abteilungen zuordnen"] = "Attribuer les rôles et les services";
I18N.it["Rollen und Abteilungen zuordnen"] = "Assegna ruoli e reparti";
I18N.es["Rollen und Abteilungen zuordnen"] = "Asignar roles y departamentos";
I18N.pt["Rollen und Abteilungen zuordnen"] = "Atribuir funções e departamentos";
I18N.tr["Rollen und Abteilungen zuordnen"] = "Rolleri ve departmanları atayın";
I18N.ja["Rollen und Abteilungen zuordnen"] = "役割と部門を割り当て";
I18N.zh["Rollen und Abteilungen zuordnen"] = "分配角色和部门";
I18N.ar["Rollen und Abteilungen zuordnen"] = "تعيين الأدوار والأقسام";
I18N.en["Standard"] = "Default";
I18N.fr["Standard"] = "Par défaut";
I18N.it["Standard"] = "Predefinito";
I18N.es["Standard"] = "Predeterminado";
I18N.pt["Standard"] = "Predefinição";
I18N.tr["Standard"] = "Varsayılan";
I18N.ja["Standard"] = "標準";
I18N.zh["Standard"] = "默认";
I18N.ar["Standard"] = "الافتراضي";
I18N.en["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "An icon on the home screen, full screen and fast start – no App Store needed. Ideal for the roster and checklists.";
I18N.fr["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "Une icône sur l’écran d’accueil, le plein écran et un démarrage rapide – sans App Store. Idéal pour le planning et les checklists.";
I18N.it["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "Icona nella schermata Home, schermo intero e avvio rapido – senza App Store. Ideale per turni e checklist.";
I18N.es["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "Icono en la pantalla de inicio, pantalla completa y arranque rápido – sin App Store. Ideal para el cuadrante y las checklists.";
I18N.pt["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "Ícone no ecrã principal, ecrã inteiro e arranque rápido – sem App Store. Ideal para a escala e as checklists.";
I18N.tr["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "Ana ekranda simge, tam ekran ve hızlı açılış – App Store gerekmez. Vardiya planı ve kontrol listeleri için ideal.";
I18N.ja["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "ホーム画面にアイコン、全画面表示、すばやい起動 – App Store は不要です。勤務表とチェックリストに最適です。";
I18N.zh["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "主屏幕图标、全屏显示、快速启动 – 无需 App Store。非常适合排班表和检查清单。";
I18N.ar["Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten."] = "أيقونة على الشاشة الرئيسية، وملء الشاشة، وتشغيل سريع – دون متجر التطبيقات. مثالي لجدول المناوبات وقوائم التحقق.";
I18N.en["Team einladen"] = "Invite the team";
I18N.fr["Team einladen"] = "Inviter l’équipe";
I18N.it["Team einladen"] = "Invita il team";
I18N.es["Team einladen"] = "Invitar al equipo";
I18N.pt["Team einladen"] = "Convidar a equipa";
I18N.tr["Team einladen"] = "Ekibi davet edin";
I18N.ja["Team einladen"] = "チームを招待";
I18N.zh["Team einladen"] = "邀请团队";
I18N.ar["Team einladen"] = "دعوة الفريق";

// 019: Zeiterfassung, Zimmer, Technik-Meldungen, Push
I18N.en["Zeiterfassung"] = "Time tracking";
I18N.fr["Zeiterfassung"] = "Pointage";
I18N.it["Zeiterfassung"] = "Rilevazione presenze";
I18N.es["Zeiterfassung"] = "Control horario";
I18N.pt["Zeiterfassung"] = "Registo de horas";
I18N.tr["Zeiterfassung"] = "Zaman kaydı";
I18N.ja["Zeiterfassung"] = "勤怠管理";
I18N.zh["Zeiterfassung"] = "考勤";
I18N.ar["Zeiterfassung"] = "تسجيل الوقت";
I18N.en["Technik-Meldungen"] = "Maintenance reports";
I18N.fr["Technik-Meldungen"] = "Signalements techniques";
I18N.it["Technik-Meldungen"] = "Segnalazioni tecniche";
I18N.es["Technik-Meldungen"] = "Avisos técnicos";
I18N.pt["Technik-Meldungen"] = "Ocorrências técnicas";
I18N.tr["Technik-Meldungen"] = "Arıza bildirimleri";
I18N.ja["Technik-Meldungen"] = "不具合報告";
I18N.zh["Technik-Meldungen"] = "报修";
I18N.ar["Technik-Meldungen"] = "بلاغات الصيانة";
I18N.en["Schmutzig"] = "Dirty";
I18N.fr["Schmutzig"] = "Sale";
I18N.it["Schmutzig"] = "Sporca";
I18N.es["Schmutzig"] = "Sucia";
I18N.pt["Schmutzig"] = "Sujo";
I18N.tr["Schmutzig"] = "Kirli";
I18N.ja["Schmutzig"] = "未清掃";
I18N.zh["Schmutzig"] = "脏房";
I18N.ar["Schmutzig"] = "متسخة";
I18N.en["In Reinigung"] = "Cleaning";
I18N.fr["In Reinigung"] = "En nettoyage";
I18N.it["In Reinigung"] = "In pulizia";
I18N.es["In Reinigung"] = "Limpiando";
I18N.pt["In Reinigung"] = "Em limpeza";
I18N.tr["In Reinigung"] = "Temizleniyor";
I18N.ja["In Reinigung"] = "清掃中";
I18N.zh["In Reinigung"] = "清扫中";
I18N.ar["In Reinigung"] = "قيد التنظيف";
I18N.en["Sauber"] = "Clean";
I18N.fr["Sauber"] = "Propre";
I18N.it["Sauber"] = "Pulita";
I18N.es["Sauber"] = "Limpia";
I18N.pt["Sauber"] = "Limpo";
I18N.tr["Sauber"] = "Temiz";
I18N.ja["Sauber"] = "清掃済み";
I18N.zh["Sauber"] = "已清扫";
I18N.ar["Sauber"] = "نظيفة";
I18N.en["Kontrolliert"] = "Inspected";
I18N.fr["Kontrolliert"] = "Contrôlée";
I18N.it["Kontrolliert"] = "Controllata";
I18N.es["Kontrolliert"] = "Revisada";
I18N.pt["Kontrolliert"] = "Inspecionado";
I18N.tr["Kontrolliert"] = "Kontrol edildi";
I18N.ja["Kontrolliert"] = "点検済み";
I18N.zh["Kontrolliert"] = "已检查";
I18N.ar["Kontrolliert"] = "تم فحصها";
I18N.en["Außer Betrieb"] = "Out of order";
I18N.fr["Außer Betrieb"] = "Hors service";
I18N.it["Außer Betrieb"] = "Fuori servizio";
I18N.es["Außer Betrieb"] = "Fuera de servicio";
I18N.pt["Außer Betrieb"] = "Fora de serviço";
I18N.tr["Außer Betrieb"] = "Hizmet dışı";
I18N.ja["Außer Betrieb"] = "使用停止";
I18N.zh["Außer Betrieb"] = "停用";
I18N.ar["Außer Betrieb"] = "خارج الخدمة";
I18N.en["Unbelegt"] = "Vacant";
I18N.fr["Unbelegt"] = "Libre";
I18N.it["Unbelegt"] = "Libera";
I18N.es["Unbelegt"] = "Libre";
I18N.pt["Unbelegt"] = "Livre";
I18N.tr["Unbelegt"] = "Boş";
I18N.ja["Unbelegt"] = "空室";
I18N.zh["Unbelegt"] = "空房";
I18N.ar["Unbelegt"] = "شاغرة";
I18N.en["Belegt"] = "Occupied";
I18N.fr["Belegt"] = "Occupée";
I18N.it["Belegt"] = "Occupata";
I18N.es["Belegt"] = "Ocupada";
I18N.pt["Belegt"] = "Ocupado";
I18N.tr["Belegt"] = "Dolu";
I18N.ja["Belegt"] = "在室";
I18N.zh["Belegt"] = "在住";
I18N.ar["Belegt"] = "مشغولة";
I18N.en["Abreise"] = "Departure";
I18N.fr["Abreise"] = "Départ";
I18N.it["Abreise"] = "Partenza";
I18N.es["Abreise"] = "Salida";
I18N.pt["Abreise"] = "Partida";
I18N.tr["Abreise"] = "Çıkış";
I18N.ja["Abreise"] = "チェックアウト";
I18N.zh["Abreise"] = "离店";
I18N.ar["Abreise"] = "مغادرة";
I18N.en["Anreise"] = "Arrival";
I18N.fr["Anreise"] = "Arrivée";
I18N.it["Anreise"] = "Arrivo";
I18N.es["Anreise"] = "Llegada";
I18N.pt["Anreise"] = "Chegada";
I18N.tr["Anreise"] = "Giriş";
I18N.ja["Anreise"] = "チェックイン";
I18N.zh["Anreise"] = "到店";
I18N.ar["Anreise"] = "وصول";
I18N.en["Normal"] = "Normal";
I18N.fr["Normal"] = "Normal";
I18N.it["Normal"] = "Normale";
I18N.es["Normal"] = "Normal";
I18N.pt["Normal"] = "Normal";
I18N.tr["Normal"] = "Normal";
I18N.ja["Normal"] = "通常";
I18N.zh["Normal"] = "普通";
I18N.ar["Normal"] = "عادي";
I18N.en["Dringend"] = "Urgent";
I18N.fr["Dringend"] = "Urgent";
I18N.it["Dringend"] = "Urgente";
I18N.es["Dringend"] = "Urgente";
I18N.pt["Dringend"] = "Urgente";
I18N.tr["Dringend"] = "Acil";
I18N.ja["Dringend"] = "緊急";
I18N.zh["Dringend"] = "紧急";
I18N.ar["Dringend"] = "عاجل";
I18N.en["Erledigt"] = "Done";
I18N.fr["Erledigt"] = "Terminé";
I18N.it["Erledigt"] = "Fatto";
I18N.es["Erledigt"] = "Hecho";
I18N.pt["Erledigt"] = "Concluído";
I18N.tr["Erledigt"] = "Tamamlandı";
I18N.ja["Erledigt"] = "完了";
I18N.zh["Erledigt"] = "已完成";
I18N.ar["Erledigt"] = "تم";
I18N.en["Alle"] = "All";
I18N.fr["Alle"] = "Tous";
I18N.it["Alle"] = "Tutte";
I18N.es["Alle"] = "Todos";
I18N.pt["Alle"] = "Todos";
I18N.tr["Alle"] = "Tümü";
I18N.ja["Alle"] = "すべて";
I18N.zh["Alle"] = "全部";
I18N.ar["Alle"] = "الكل";
I18N.en["Soll"] = "Target";
I18N.fr["Soll"] = "Prévu";
I18N.it["Soll"] = "Previste";
I18N.es["Soll"] = "Objetivo";
I18N.pt["Soll"] = "Previsto";
I18N.tr["Soll"] = "Hedef";
I18N.ja["Soll"] = "所定";
I18N.zh["Soll"] = "应出勤";
I18N.ar["Soll"] = "المستهدف";
I18N.en["+ Zeit nachtragen"] = "+ Add time";
I18N.fr["+ Zeit nachtragen"] = "+ Ajouter des heures";
I18N.it["+ Zeit nachtragen"] = "+ Aggiungi orario";
I18N.es["+ Zeit nachtragen"] = "+ Añadir horas";
I18N.pt["+ Zeit nachtragen"] = "+ Acrescentar horas";
I18N.tr["+ Zeit nachtragen"] = "+ Saat ekle";
I18N.ja["+ Zeit nachtragen"] = "+ 時間を追加";
I18N.zh["+ Zeit nachtragen"] = "+ 补录工时";
I18N.ar["+ Zeit nachtragen"] = "+ إضافة وقت";
I18N.en["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "After 6 hours of work, a break of at least 30 minutes is required.";
I18N.fr["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "Au-delà de 6 heures de travail, une pause d’au moins 30 minutes est obligatoire.";
I18N.it["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "Oltre 6 ore di lavoro è prevista una pausa di almeno 30 minuti.";
I18N.es["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "A partir de 6 horas de trabajo es obligatoria una pausa de al menos 30 minutos.";
I18N.pt["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "A partir de 6 horas de trabalho é obrigatória uma pausa de pelo menos 30 minutos.";
I18N.tr["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "6 saati aşan çalışmada en az 30 dakika mola zorunludur.";
I18N.ja["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "6 時間を超えて働く場合、30 分以上の休憩が必要です。";
I18N.zh["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "工作超过 6 小时须休息至少 30 分钟。";
I18N.ar["Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben."] = "بعد 6 ساعات عمل يلزم أخذ استراحة لا تقل عن 30 دقيقة.";
I18N.en["Abreisen → Schmutzig"] = "Departures → dirty";
I18N.fr["Abreisen → Schmutzig"] = "Départs → sales";
I18N.it["Abreisen → Schmutzig"] = "Partenze → sporche";
I18N.es["Abreisen → Schmutzig"] = "Salidas → sucias";
I18N.pt["Abreisen → Schmutzig"] = "Partidas → sujos";
I18N.tr["Abreisen → Schmutzig"] = "Çıkışlar → kirli";
I18N.ja["Abreisen → Schmutzig"] = "チェックアウト → 未清掃";
I18N.zh["Abreisen → Schmutzig"] = "离店 → 脏房";
I18N.ar["Abreisen → Schmutzig"] = "المغادرة → متسخة";
I18N.en["Alle Stockwerke"] = "All floors";
I18N.fr["Alle Stockwerke"] = "Tous les étages";
I18N.it["Alle Stockwerke"] = "Tutti i piani";
I18N.es["Alle Stockwerke"] = "Todas las plantas";
I18N.pt["Alle Stockwerke"] = "Todos os pisos";
I18N.tr["Alle Stockwerke"] = "Tüm katlar";
I18N.ja["Alle Stockwerke"] = "全フロア";
I18N.zh["Alle Stockwerke"] = "所有楼层";
I18N.ar["Alle Stockwerke"] = "كل الطوابق";
I18N.en["Alle meine Abteilungen"] = "All my departments";
I18N.fr["Alle meine Abteilungen"] = "Tous mes services";
I18N.it["Alle meine Abteilungen"] = "Tutti i miei reparti";
I18N.es["Alle meine Abteilungen"] = "Todos mis departamentos";
I18N.pt["Alle meine Abteilungen"] = "Todos os meus departamentos";
I18N.tr["Alle meine Abteilungen"] = "Tüm departmanlarım";
I18N.ja["Alle meine Abteilungen"] = "担当の全部門";
I18N.zh["Alle meine Abteilungen"] = "我负责的所有部门";
I18N.ar["Alle meine Abteilungen"] = "كل أقسامي";
I18N.en["Anderes Foto"] = "Other photo";
I18N.fr["Anderes Foto"] = "Autre photo";
I18N.it["Anderes Foto"] = "Altra foto";
I18N.es["Anderes Foto"] = "Otra foto";
I18N.pt["Anderes Foto"] = "Outra foto";
I18N.tr["Anderes Foto"] = "Başka fotoğraf";
I18N.ja["Anderes Foto"] = "別の写真";
I18N.zh["Anderes Foto"] = "换一张照片";
I18N.ar["Anderes Foto"] = "صورة أخرى";
I18N.en["Anlegen"] = "Create";
I18N.fr["Anlegen"] = "Créer";
I18N.it["Anlegen"] = "Crea";
I18N.es["Anlegen"] = "Crear";
I18N.pt["Anlegen"] = "Criar";
I18N.tr["Anlegen"] = "Oluştur";
I18N.ja["Anlegen"] = "作成";
I18N.zh["Anlegen"] = "创建";
I18N.ar["Anlegen"] = "إنشاء";
I18N.en["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "On iPhone, notifications work once Ouverture is installed as an app on the home screen.";
I18N.fr["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "Sur iPhone, les notifications fonctionnent dès qu’Ouverture est installé comme app sur l’écran d’accueil.";
I18N.it["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "Su iPhone le notifiche funzionano quando Ouverture è installato come app nella schermata Home.";
I18N.es["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "En iPhone, las notificaciones funcionan en cuanto Ouverture está instalado como app en la pantalla de inicio.";
I18N.pt["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "No iPhone, as notificações funcionam assim que o Ouverture estiver instalado como app no ecrã principal.";
I18N.tr["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "iPhone’da bildirimler, Ouverture ana ekrana uygulama olarak yüklendiğinde çalışır.";
I18N.ja["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "iPhone では、Ouverture をホーム画面にアプリとして追加すると通知が使えます。";
I18N.zh["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "在 iPhone 上，将 Ouverture 作为应用安装到主屏幕后即可接收通知。";
I18N.ar["Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist."] = "على iPhone تعمل الإشعارات بعد تثبيت Ouverture كتطبيق على الشاشة الرئيسية.";
I18N.en["Auf diesem Gerät eingeschaltet."] = "Turned on for this device.";
I18N.fr["Auf diesem Gerät eingeschaltet."] = "Activées sur cet appareil.";
I18N.it["Auf diesem Gerät eingeschaltet."] = "Attive su questo dispositivo.";
I18N.es["Auf diesem Gerät eingeschaltet."] = "Activadas en este dispositivo.";
I18N.pt["Auf diesem Gerät eingeschaltet."] = "Ativadas neste dispositivo.";
I18N.tr["Auf diesem Gerät eingeschaltet."] = "Bu cihazda açık.";
I18N.ja["Auf diesem Gerät eingeschaltet."] = "この端末で有効です。";
I18N.zh["Auf diesem Gerät eingeschaltet."] = "已在此设备上开启。";
I18N.ar["Auf diesem Gerät eingeschaltet."] = "مفعّلة على هذا الجهاز.";
I18N.en["Ausschalten"] = "Turn off";
I18N.fr["Ausschalten"] = "Désactiver";
I18N.it["Ausschalten"] = "Disattiva";
I18N.es["Ausschalten"] = "Desactivar";
I18N.pt["Ausschalten"] = "Desativar";
I18N.tr["Ausschalten"] = "Kapat";
I18N.ja["Ausschalten"] = "オフにする";
I18N.zh["Ausschalten"] = "关闭";
I18N.ar["Ausschalten"] = "إيقاف";
I18N.en["Belegung"] = "Occupancy";
I18N.fr["Belegung"] = "Occupation";
I18N.it["Belegung"] = "Occupazione";
I18N.es["Belegung"] = "Ocupación";
I18N.pt["Belegung"] = "Ocupação";
I18N.tr["Belegung"] = "Doluluk";
I18N.ja["Belegung"] = "在室状況";
I18N.zh["Belegung"] = "入住状态";
I18N.ar["Belegung"] = "الإشغال";
I18N.en["Benachrichtigungen aufs Handy"] = "Notifications on your phone";
I18N.fr["Benachrichtigungen aufs Handy"] = "Notifications sur le téléphone";
I18N.it["Benachrichtigungen aufs Handy"] = "Notifiche sul telefono";
I18N.es["Benachrichtigungen aufs Handy"] = "Notificaciones en el móvil";
I18N.pt["Benachrichtigungen aufs Handy"] = "Notificações no telemóvel";
I18N.tr["Benachrichtigungen aufs Handy"] = "Telefona bildirimler";
I18N.ja["Benachrichtigungen aufs Handy"] = "スマホへの通知";
I18N.zh["Benachrichtigungen aufs Handy"] = "手机通知";
I18N.ar["Benachrichtigungen aufs Handy"] = "إشعارات على الهاتف";
I18N.en["Benachrichtigungen einschalten"] = "Turn on notifications";
I18N.fr["Benachrichtigungen einschalten"] = "Activer les notifications";
I18N.it["Benachrichtigungen einschalten"] = "Attiva le notifiche";
I18N.es["Benachrichtigungen einschalten"] = "Activar notificaciones";
I18N.pt["Benachrichtigungen einschalten"] = "Ativar notificações";
I18N.tr["Benachrichtigungen einschalten"] = "Bildirimleri aç";
I18N.ja["Benachrichtigungen einschalten"] = "通知をオンにする";
I18N.zh["Benachrichtigungen einschalten"] = "开启通知";
I18N.ar["Benachrichtigungen einschalten"] = "تفعيل الإشعارات";
I18N.en["Benachrichtigungen sind eingeschaltet."] = "Notifications are on.";
I18N.fr["Benachrichtigungen sind eingeschaltet."] = "Les notifications sont activées.";
I18N.it["Benachrichtigungen sind eingeschaltet."] = "Le notifiche sono attive.";
I18N.es["Benachrichtigungen sind eingeschaltet."] = "Las notificaciones están activadas.";
I18N.pt["Benachrichtigungen sind eingeschaltet."] = "As notificações estão ativadas.";
I18N.tr["Benachrichtigungen sind eingeschaltet."] = "Bildirimler açık.";
I18N.ja["Benachrichtigungen sind eingeschaltet."] = "通知がオンになりました。";
I18N.zh["Benachrichtigungen sind eingeschaltet."] = "通知已开启。";
I18N.ar["Benachrichtigungen sind eingeschaltet."] = "تم تفعيل الإشعارات.";
I18N.en["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "Notifications are blocked in the browser. Please allow them in the browser settings.";
I18N.fr["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "Les notifications sont bloquées dans le navigateur. Autorise-les dans les réglages du navigateur.";
I18N.it["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "Le notifiche sono bloccate nel browser. Consentile nelle impostazioni del browser.";
I18N.es["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "Las notificaciones están bloqueadas en el navegador. Permítelas en los ajustes del navegador.";
I18N.pt["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "As notificações estão bloqueadas no navegador. Permite-as nas definições do navegador.";
I18N.tr["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "Bildirimler tarayıcıda engellendi. Lütfen tarayıcı ayarlarından izin ver.";
I18N.ja["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "ブラウザで通知がブロックされています。ブラウザの設定で許可してください。";
I18N.zh["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "浏览器已阻止通知，请在浏览器设置中允许。";
I18N.ar["Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben."] = "الإشعارات محظورة في المتصفح. يرجى السماح بها من إعدادات المتصفح.";
I18N.en["Buchung löschen?"] = "Delete entry?";
I18N.fr["Buchung löschen?"] = "Supprimer le pointage ?";
I18N.it["Buchung löschen?"] = "Eliminare la timbratura?";
I18N.es["Buchung löschen?"] = "¿Eliminar el fichaje?";
I18N.pt["Buchung löschen?"] = "Eliminar o registo?";
I18N.tr["Buchung löschen?"] = "Kayıt silinsin mi?";
I18N.ja["Buchung löschen?"] = "この打刻を削除しますか？";
I18N.zh["Buchung löschen?"] = "删除这条记录？";
I18N.ar["Buchung löschen?"] = "حذف التسجيل؟";
I18N.en["Buchungen"] = "Entries";
I18N.fr["Buchungen"] = "Pointages";
I18N.it["Buchungen"] = "Timbrature";
I18N.es["Buchungen"] = "Fichajes";
I18N.pt["Buchungen"] = "Registos";
I18N.tr["Buchungen"] = "Kayıtlar";
I18N.ja["Buchungen"] = "打刻";
I18N.zh["Buchungen"] = "打卡记录";
I18N.ar["Buchungen"] = "التسجيلات";
I18N.en["Danke – die Meldung ist bei der zuständigen Abteilung."] = "Thanks – the report has been sent to the responsible department.";
I18N.fr["Danke – die Meldung ist bei der zuständigen Abteilung."] = "Merci – le signalement a été transmis au service responsable.";
I18N.it["Danke – die Meldung ist bei der zuständigen Abteilung."] = "Grazie – la segnalazione è arrivata al reparto responsabile.";
I18N.es["Danke – die Meldung ist bei der zuständigen Abteilung."] = "Gracias – el aviso ha llegado al departamento responsable.";
I18N.pt["Danke – die Meldung ist bei der zuständigen Abteilung."] = "Obrigado – a ocorrência foi enviada ao departamento responsável.";
I18N.tr["Danke – die Meldung ist bei der zuständigen Abteilung."] = "Teşekkürler – bildirim sorumlu departmana iletildi.";
I18N.ja["Danke – die Meldung ist bei der zuständigen Abteilung."] = "ありがとうございます。報告は担当部門に届きました。";
I18N.zh["Danke – die Meldung ist bei der zuständigen Abteilung."] = "谢谢 – 报修已送达负责部门。";
I18N.ar["Danke – die Meldung ist bei der zuständigen Abteilung."] = "شكرًا – وصل البلاغ إلى القسم المسؤول.";
I18N.en["Das Foto ist zu groß."] = "The photo is too large.";
I18N.fr["Das Foto ist zu groß."] = "La photo est trop volumineuse.";
I18N.it["Das Foto ist zu groß."] = "La foto è troppo grande.";
I18N.es["Das Foto ist zu groß."] = "La foto es demasiado grande.";
I18N.pt["Das Foto ist zu groß."] = "A foto é demasiado grande.";
I18N.tr["Das Foto ist zu groß."] = "Fotoğraf çok büyük.";
I18N.ja["Das Foto ist zu groß."] = "写真のサイズが大きすぎます。";
I18N.zh["Das Foto ist zu groß."] = "照片过大。";
I18N.ar["Das Foto ist zu groß."] = "الصورة كبيرة جدًا.";
I18N.en["Das Foto konnte nicht gelesen werden."] = "The photo couldn't be read.";
I18N.fr["Das Foto konnte nicht gelesen werden."] = "La photo n’a pas pu être lue.";
I18N.it["Das Foto konnte nicht gelesen werden."] = "Impossibile leggere la foto.";
I18N.es["Das Foto konnte nicht gelesen werden."] = "No se pudo leer la foto.";
I18N.pt["Das Foto konnte nicht gelesen werden."] = "Não foi possível ler a foto.";
I18N.tr["Das Foto konnte nicht gelesen werden."] = "Fotoğraf okunamadı.";
I18N.ja["Das Foto konnte nicht gelesen werden."] = "写真を読み込めませんでした。";
I18N.zh["Das Foto konnte nicht gelesen werden."] = "无法读取照片。";
I18N.ar["Das Foto konnte nicht gelesen werden."] = "تعذّرت قراءة الصورة.";
I18N.en["Details (optional)"] = "Details (optional)";
I18N.fr["Details (optional)"] = "Détails (facultatif)";
I18N.it["Details (optional)"] = "Dettagli (facoltativo)";
I18N.es["Details (optional)"] = "Detalles (opcional)";
I18N.pt["Details (optional)"] = "Detalhes (opcional)";
I18N.tr["Details (optional)"] = "Ayrıntılar (isteğe bağlı)";
I18N.ja["Details (optional)"] = "詳細（任意）";
I18N.zh["Details (optional)"] = "详情（选填）";
I18N.ar["Details (optional)"] = "التفاصيل (اختياري)";
I18N.en["Diesen Monat: {0} h"] = "This month: {0} h";
I18N.fr["Diesen Monat: {0} h"] = "Ce mois-ci : {0} h";
I18N.it["Diesen Monat: {0} h"] = "Questo mese: {0} h";
I18N.es["Diesen Monat: {0} h"] = "Este mes: {0} h";
I18N.pt["Diesen Monat: {0} h"] = "Este mês: {0} h";
I18N.tr["Diesen Monat: {0} h"] = "Bu ay: {0} sa";
I18N.ja["Diesen Monat: {0} h"] = "今月：{0} 時間";
I18N.zh["Diesen Monat: {0} h"] = "本月：{0} 小时";
I18N.ar["Diesen Monat: {0} h"] = "هذا الشهر: {0} س";
I18N.en["Dieser Browser unterstützt keine Benachrichtigungen."] = "This browser doesn't support notifications.";
I18N.fr["Dieser Browser unterstützt keine Benachrichtigungen."] = "Ce navigateur ne prend pas en charge les notifications.";
I18N.it["Dieser Browser unterstützt keine Benachrichtigungen."] = "Questo browser non supporta le notifiche.";
I18N.es["Dieser Browser unterstützt keine Benachrichtigungen."] = "Este navegador no admite notificaciones.";
I18N.pt["Dieser Browser unterstützt keine Benachrichtigungen."] = "Este navegador não suporta notificações.";
I18N.tr["Dieser Browser unterstützt keine Benachrichtigungen."] = "Bu tarayıcı bildirimleri desteklemiyor.";
I18N.ja["Dieser Browser unterstützt keine Benachrichtigungen."] = "このブラウザは通知に対応していません。";
I18N.zh["Dieser Browser unterstützt keine Benachrichtigungen."] = "此浏览器不支持通知。";
I18N.ar["Dieser Browser unterstützt keine Benachrichtigungen."] = "هذا المتصفح لا يدعم الإشعارات.";
I18N.en["Differenz"] = "Difference";
I18N.fr["Differenz"] = "Écart";
I18N.it["Differenz"] = "Differenza";
I18N.es["Differenz"] = "Diferencia";
I18N.pt["Differenz"] = "Diferença";
I18N.tr["Differenz"] = "Fark";
I18N.ja["Differenz"] = "差分";
I18N.zh["Differenz"] = "差额";
I18N.ar["Differenz"] = "الفرق";
I18N.en["Differenz (h)"] = "Difference (h)";
I18N.fr["Differenz (h)"] = "Écart (h)";
I18N.it["Differenz (h)"] = "Differenza (h)";
I18N.es["Differenz (h)"] = "Diferencia (h)";
I18N.pt["Differenz (h)"] = "Diferença (h)";
I18N.tr["Differenz (h)"] = "Fark (sa)";
I18N.ja["Differenz (h)"] = "差分（時間）";
I18N.zh["Differenz (h)"] = "差额（小时）";
I18N.ar["Differenz (h)"] = "الفرق (س)";
I18N.en["Dringlichkeit"] = "Urgency";
I18N.fr["Dringlichkeit"] = "Urgence";
I18N.it["Dringlichkeit"] = "Urgenza";
I18N.es["Dringlichkeit"] = "Urgencia";
I18N.pt["Dringlichkeit"] = "Urgência";
I18N.tr["Dringlichkeit"] = "Aciliyet";
I18N.ja["Dringlichkeit"] = "緊急度";
I18N.zh["Dringlichkeit"] = "紧急程度";
I18N.ar["Dringlichkeit"] = "درجة الاستعجال";
I18N.en["Eingestempelt seit {0}"] = "Clocked in since {0}";
I18N.fr["Eingestempelt seit {0}"] = "Arrivée pointée à {0}";
I18N.it["Eingestempelt seit {0}"] = "In servizio dalle {0}";
I18N.es["Eingestempelt seit {0}"] = "Fichado desde las {0}";
I18N.pt["Eingestempelt seit {0}"] = "Entrada registada às {0}";
I18N.tr["Eingestempelt seit {0}"] = "{0} itibarıyla giriş yapıldı";
I18N.ja["Eingestempelt seit {0}"] = "{0} から出勤中";
I18N.zh["Eingestempelt seit {0}"] = "{0} 起已上班";
I18N.ar["Eingestempelt seit {0}"] = "مسجّل الحضور منذ {0}";
I18N.en["Einschalten"] = "Turn on";
I18N.fr["Einschalten"] = "Activer";
I18N.it["Einschalten"] = "Attiva";
I18N.es["Einschalten"] = "Activar";
I18N.pt["Einschalten"] = "Ativar";
I18N.tr["Einschalten"] = "Aç";
I18N.ja["Einschalten"] = "オンにする";
I18N.zh["Einschalten"] = "开启";
I18N.ar["Einschalten"] = "تفعيل";
I18N.en["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "Find out right away when your rota is out or a shift changes.";
I18N.fr["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "Sois prévenu·e dès que ton planning est publié ou qu’un poste change.";
I18N.it["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "Scopri subito quando escono i tuoi turni o cambia un turno.";
I18N.es["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "Entérate al momento cuando salga tu cuadrante o cambie un turno.";
I18N.pt["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "Fica a saber de imediato quando a tua escala sai ou um turno muda.";
I18N.tr["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "Vardiya planın yayınlandığında veya bir vardiya değiştiğinde hemen haberdar ol.";
I18N.ja["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "勤務表の公開やシフト変更をすぐに受け取れます。";
I18N.zh["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "排班表发布或班次变更时立即收到通知。";
I18N.ar["Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert."] = "اعرف فورًا عند نشر جدولك أو تغيّر مناوبة.";
I18N.en["Foto ansehen"] = "View photo";
I18N.fr["Foto ansehen"] = "Voir la photo";
I18N.it["Foto ansehen"] = "Vedi foto";
I18N.es["Foto ansehen"] = "Ver foto";
I18N.pt["Foto ansehen"] = "Ver foto";
I18N.tr["Foto ansehen"] = "Fotoğrafı gör";
I18N.ja["Foto ansehen"] = "写真を見る";
I18N.zh["Foto ansehen"] = "查看照片";
I18N.ar["Foto ansehen"] = "عرض الصورة";
I18N.en["Foto aufnehmen"] = "Take photo";
I18N.fr["Foto aufnehmen"] = "Prendre une photo";
I18N.it["Foto aufnehmen"] = "Scatta foto";
I18N.es["Foto aufnehmen"] = "Hacer foto";
I18N.pt["Foto aufnehmen"] = "Tirar foto";
I18N.tr["Foto aufnehmen"] = "Fotoğraf çek";
I18N.ja["Foto aufnehmen"] = "写真を撮る";
I18N.zh["Foto aufnehmen"] = "拍照";
I18N.ar["Foto aufnehmen"] = "التقاط صورة";
I18N.en["Foto ausblenden"] = "Hide photo";
I18N.fr["Foto ausblenden"] = "Masquer la photo";
I18N.it["Foto ausblenden"] = "Nascondi foto";
I18N.es["Foto ausblenden"] = "Ocultar foto";
I18N.pt["Foto ausblenden"] = "Ocultar foto";
I18N.tr["Foto ausblenden"] = "Fotoğrafı gizle";
I18N.ja["Foto ausblenden"] = "写真を隠す";
I18N.zh["Foto ausblenden"] = "隐藏照片";
I18N.ar["Foto ausblenden"] = "إخفاء الصورة";
I18N.en["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "There are no shifts or times for this month yet.";
I18N.fr["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "Aucun poste ni pointage pour ce mois.";
I18N.it["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "Per questo mese non ci sono ancora turni o orari.";
I18N.es["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "Todavía no hay turnos ni horas para este mes.";
I18N.pt["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "Ainda não há turnos nem horas para este mês.";
I18N.tr["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "Bu ay için henüz vardiya veya saat yok.";
I18N.ja["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "この月のシフトや打刻はまだありません。";
I18N.zh["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "本月还没有班次或工时。";
I18N.ar["Für diesen Monat gibt es noch keine Schichten oder Zeiten."] = "لا توجد مناوبات أو أوقات لهذا الشهر بعد.";
I18N.en["Gehen"] = "Clock out";
I18N.fr["Gehen"] = "Départ";
I18N.it["Gehen"] = "Uscita";
I18N.es["Gehen"] = "Salida";
I18N.pt["Gehen"] = "Saída";
I18N.tr["Gehen"] = "Çıkış";
I18N.ja["Gehen"] = "退勤";
I18N.zh["Gehen"] = "下班";
I18N.ar["Gehen"] = "انصراف";
I18N.en["Geplant (h)"] = "Planned (h)";
I18N.fr["Geplant (h)"] = "Planifié (h)";
I18N.it["Geplant (h)"] = "Pianificate (h)";
I18N.es["Geplant (h)"] = "Planificado (h)";
I18N.pt["Geplant (h)"] = "Planeado (h)";
I18N.tr["Geplant (h)"] = "Planlanan (sa)";
I18N.ja["Geplant (h)"] = "予定（時間）";
I18N.zh["Geplant (h)"] = "计划（小时）";
I18N.ar["Geplant (h)"] = "المخطط (س)";
I18N.en["Gerade ist niemand eingestempelt."] = "Nobody is clocked in right now.";
I18N.fr["Gerade ist niemand eingestempelt."] = "Personne n’est pointé en ce moment.";
I18N.it["Gerade ist niemand eingestempelt."] = "Al momento nessuno è in servizio.";
I18N.es["Gerade ist niemand eingestempelt."] = "Ahora mismo no hay nadie fichado.";
I18N.pt["Gerade ist niemand eingestempelt."] = "Neste momento ninguém tem entrada registada.";
I18N.tr["Gerade ist niemand eingestempelt."] = "Şu anda giriş yapan kimse yok.";
I18N.ja["Gerade ist niemand eingestempelt."] = "現在出勤中の人はいません。";
I18N.zh["Gerade ist niemand eingestempelt."] = "目前没有人在岗。";
I18N.ar["Gerade ist niemand eingestempelt."] = "لا أحد مسجّل الحضور الآن.";
I18N.en["Im Hotel {0}"] = "At hotel {0}";
I18N.fr["Im Hotel {0}"] = "À l’hôtel {0}";
I18N.it["Im Hotel {0}"] = "Nell’hotel {0}";
I18N.es["Im Hotel {0}"] = "En el hotel {0}";
I18N.pt["Im Hotel {0}"] = "No hotel {0}";
I18N.tr["Im Hotel {0}"] = "{0} otelinde";
I18N.ja["Im Hotel {0}"] = "ホテル：{0}";
I18N.zh["Im Hotel {0}"] = "所在酒店：{0}";
I18N.ar["Im Hotel {0}"] = "في فندق {0}";
I18N.en["In der Live-Demo nicht verfügbar."] = "Not available in the live demo.";
I18N.fr["In der Live-Demo nicht verfügbar."] = "Non disponible dans la démo.";
I18N.it["In der Live-Demo nicht verfügbar."] = "Non disponibile nella demo live.";
I18N.es["In der Live-Demo nicht verfügbar."] = "No disponible en la demo.";
I18N.pt["In der Live-Demo nicht verfügbar."] = "Não disponível na demo.";
I18N.tr["In der Live-Demo nicht verfügbar."] = "Canlı demoda kullanılamaz.";
I18N.ja["In der Live-Demo nicht verfügbar."] = "ライブデモでは利用できません。";
I18N.zh["In der Live-Demo nicht verfügbar."] = "在线演示中不可用。";
I18N.ar["In der Live-Demo nicht verfügbar."] = "غير متاح في العرض التجريبي.";
I18N.en["Ist (h)"] = "Actual (h)";
I18N.fr["Ist (h)"] = "Réel (h)";
I18N.it["Ist (h)"] = "Effettive (h)";
I18N.es["Ist (h)"] = "Real (h)";
I18N.pt["Ist (h)"] = "Real (h)";
I18N.tr["Ist (h)"] = "Gerçekleşen (sa)";
I18N.ja["Ist (h)"] = "実績（時間）";
I18N.zh["Ist (h)"] = "实际（小时）";
I18N.ar["Ist (h)"] = "الفعلي (س)";
I18N.en["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "Actual = clocked time minus breaks. Local time of this device; public holidays are not detected automatically.";
I18N.fr["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "Réel = temps pointé moins les pauses. Heure locale de cet appareil ; les jours fériés ne sont pas détectés automatiquement.";
I18N.it["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "Effettive = tempo timbrato meno le pause. Ora locale di questo dispositivo; i festivi non vengono riconosciuti automaticamente.";
I18N.es["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "Real = tiempo fichado menos pausas. Hora local de este dispositivo; los festivos no se detectan automáticamente.";
I18N.pt["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "Real = tempo registado menos pausas. Hora local deste dispositivo; os feriados não são detetados automaticamente.";
I18N.tr["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "Gerçekleşen = kaydedilen süre eksi molalar. Bu cihazın yerel saati; resmî tatiller otomatik algılanmaz.";
I18N.ja["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "実績 = 打刻時間から休憩を引いた時間。この端末の現地時刻です。祝日は自動で判定されません。";
I18N.zh["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "实际 = 打卡时长减去休息。以本设备的当地时间计算；法定节假日不会自动识别。";
I18N.ar["Ist = gestempelte Zeit abzüglich Pausen. Ortszeit dieses Geräts; Feiertage werden nicht automatisch erkannt."] = "الفعلي = الوقت المسجّل ناقص الاستراحات. بالتوقيت المحلي لهذا الجهاز؛ لا يتم التعرف على العطل الرسمية تلقائيًا.";
I18N.en["Jetzt im Dienst"] = "On duty now";
I18N.fr["Jetzt im Dienst"] = "En service";
I18N.it["Jetzt im Dienst"] = "In servizio ora";
I18N.es["Jetzt im Dienst"] = "De servicio ahora";
I18N.pt["Jetzt im Dienst"] = "Em serviço agora";
I18N.tr["Jetzt im Dienst"] = "Şu an görevde";
I18N.ja["Jetzt im Dienst"] = "現在勤務中";
I18N.zh["Jetzt im Dienst"] = "当前在岗";
I18N.ar["Jetzt im Dienst"] = "في الخدمة الآن";
I18N.en["Keine Abreisen offen."] = "No open departures.";
I18N.fr["Keine Abreisen offen."] = "Aucun départ en attente.";
I18N.it["Keine Abreisen offen."] = "Nessuna partenza in sospeso.";
I18N.es["Keine Abreisen offen."] = "No hay salidas pendientes.";
I18N.pt["Keine Abreisen offen."] = "Não há partidas pendentes.";
I18N.tr["Keine Abreisen offen."] = "Bekleyen çıkış yok.";
I18N.ja["Keine Abreisen offen."] = "未処理のチェックアウトはありません。";
I18N.zh["Keine Abreisen offen."] = "没有待处理的离店房。";
I18N.ar["Keine Abreisen offen."] = "لا توجد مغادرات معلّقة.";
I18N.en["Keine offenen Meldungen."] = "No open reports.";
I18N.fr["Keine offenen Meldungen."] = "Aucun signalement ouvert.";
I18N.it["Keine offenen Meldungen."] = "Nessuna segnalazione aperta.";
I18N.es["Keine offenen Meldungen."] = "No hay avisos abiertos.";
I18N.pt["Keine offenen Meldungen."] = "Não há ocorrências abertas.";
I18N.tr["Keine offenen Meldungen."] = "Açık bildirim yok.";
I18N.ja["Keine offenen Meldungen."] = "未対応の報告はありません。";
I18N.zh["Keine offenen Meldungen."] = "没有未处理的报修。";
I18N.ar["Keine offenen Meldungen."] = "لا توجد بلاغات مفتوحة.";
I18N.en["Kommen"] = "Clock in";
I18N.fr["Kommen"] = "Arrivée";
I18N.it["Kommen"] = "Entrata";
I18N.es["Kommen"] = "Entrada";
I18N.pt["Kommen"] = "Entrada";
I18N.tr["Kommen"] = "Giriş";
I18N.ja["Kommen"] = "出勤";
I18N.zh["Kommen"] = "上班";
I18N.ar["Kommen"] = "حضور";
I18N.en["Krankentage"] = "Sick days";
I18N.fr["Krankentage"] = "Jours de maladie";
I18N.it["Krankentage"] = "Giorni di malattia";
I18N.es["Krankentage"] = "Días de baja";
I18N.pt["Krankentage"] = "Dias de baixa";
I18N.tr["Krankentage"] = "Hastalık günleri";
I18N.ja["Krankentage"] = "病欠日数";
I18N.zh["Krankentage"] = "病假天数";
I18N.ar["Krankentage"] = "أيام المرض";
I18N.en["Lohn-Export"] = "Payroll export";
I18N.fr["Lohn-Export"] = "Export paie";
I18N.it["Lohn-Export"] = "Export buste paga";
I18N.es["Lohn-Export"] = "Exportación de nóminas";
I18N.pt["Lohn-Export"] = "Exportação salarial";
I18N.tr["Lohn-Export"] = "Bordro dışa aktarımı";
I18N.ja["Lohn-Export"] = "給与エクスポート";
I18N.zh["Lohn-Export"] = "薪资导出";
I18N.ar["Lohn-Export"] = "تصدير الرواتب";
I18N.en["Lohn-Export (Excel)"] = "Payroll export (Excel)";
I18N.fr["Lohn-Export (Excel)"] = "Export paie (Excel)";
I18N.it["Lohn-Export (Excel)"] = "Export buste paga (Excel)";
I18N.es["Lohn-Export (Excel)"] = "Exportar nóminas (Excel)";
I18N.pt["Lohn-Export (Excel)"] = "Exportação salarial (Excel)";
I18N.tr["Lohn-Export (Excel)"] = "Bordro dışa aktar (Excel)";
I18N.ja["Lohn-Export (Excel)"] = "給与エクスポート（Excel）";
I18N.zh["Lohn-Export (Excel)"] = "薪资导出（Excel）";
I18N.ar["Lohn-Export (Excel)"] = "تصدير الرواتب (Excel)";
I18N.en["Mangel melden"] = "Report a defect";
I18N.fr["Mangel melden"] = "Signaler une panne";
I18N.it["Mangel melden"] = "Segnala un guasto";
I18N.es["Mangel melden"] = "Avisar de una avería";
I18N.pt["Mangel melden"] = "Reportar avaria";
I18N.tr["Mangel melden"] = "Arıza bildir";
I18N.ja["Mangel melden"] = "不具合を報告";
I18N.zh["Mangel melden"] = "报修";
I18N.ar["Mangel melden"] = "الإبلاغ عن عطل";
I18N.en["Meine Zeiten"] = "My times";
I18N.fr["Meine Zeiten"] = "Mes heures";
I18N.it["Meine Zeiten"] = "I miei orari";
I18N.es["Meine Zeiten"] = "Mis horas";
I18N.pt["Meine Zeiten"] = "As minhas horas";
I18N.tr["Meine Zeiten"] = "Saatlerim";
I18N.ja["Meine Zeiten"] = "自分の打刻";
I18N.zh["Meine Zeiten"] = "我的工时";
I18N.ar["Meine Zeiten"] = "أوقاتي";
I18N.en["Meldung löschen?"] = "Delete report?";
I18N.fr["Meldung löschen?"] = "Supprimer le signalement ?";
I18N.it["Meldung löschen?"] = "Eliminare la segnalazione?";
I18N.es["Meldung löschen?"] = "¿Eliminar el aviso?";
I18N.pt["Meldung löschen?"] = "Eliminar a ocorrência?";
I18N.tr["Meldung löschen?"] = "Bildirim silinsin mi?";
I18N.ja["Meldung löschen?"] = "この報告を削除しますか？";
I18N.zh["Meldung löschen?"] = "删除这条报修？";
I18N.ar["Meldung löschen?"] = "حذف البلاغ؟";
I18N.en["Meldung senden"] = "Send report";
I18N.fr["Meldung senden"] = "Envoyer le signalement";
I18N.it["Meldung senden"] = "Invia segnalazione";
I18N.es["Meldung senden"] = "Enviar aviso";
I18N.pt["Meldung senden"] = "Enviar ocorrência";
I18N.tr["Meldung senden"] = "Bildirimi gönder";
I18N.ja["Meldung senden"] = "報告を送信";
I18N.zh["Meldung senden"] = "提交报修";
I18N.ar["Meldung senden"] = "إرسال البلاغ";
I18N.en["Min."] = "min";
I18N.fr["Min."] = "min";
I18N.it["Min."] = "min";
I18N.es["Min."] = "min";
I18N.pt["Min."] = "min";
I18N.tr["Min."] = "dk";
I18N.ja["Min."] = "分";
I18N.zh["Min."] = "分钟";
I18N.ar["Min."] = "د";
I18N.en["Monatsauswertung"] = "Monthly summary";
I18N.fr["Monatsauswertung"] = "Bilan mensuel";
I18N.it["Monatsauswertung"] = "Riepilogo mensile";
I18N.es["Monatsauswertung"] = "Resumen mensual";
I18N.pt["Monatsauswertung"] = "Resumo mensal";
I18N.tr["Monatsauswertung"] = "Aylık özet";
I18N.ja["Monatsauswertung"] = "月次集計";
I18N.zh["Monatsauswertung"] = "月度汇总";
I18N.ar["Monatsauswertung"] = "الملخص الشهري";
I18N.en["Nachtstunden 22–6 (h)"] = "Night hours 10 pm–6 am (h)";
I18N.fr["Nachtstunden 22–6 (h)"] = "Heures de nuit 22h–6h (h)";
I18N.it["Nachtstunden 22–6 (h)"] = "Ore notturne 22–6 (h)";
I18N.es["Nachtstunden 22–6 (h)"] = "Horas nocturnas 22–6 (h)";
I18N.pt["Nachtstunden 22–6 (h)"] = "Horas noturnas 22–6 (h)";
I18N.tr["Nachtstunden 22–6 (h)"] = "Gece saatleri 22–6 (sa)";
I18N.ja["Nachtstunden 22–6 (h)"] = "深夜時間 22–6時（時間）";
I18N.zh["Nachtstunden 22–6 (h)"] = "夜班小时 22–6 点（小时）";
I18N.ar["Nachtstunden 22–6 (h)"] = "ساعات الليل 22–6 (س)";
I18N.en["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "New rota, changed shift, decided request, new maintenance report or an important logbook entry – straight to this device as a notification.";
I18N.fr["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "Nouveau planning, poste modifié, demande traitée, nouveau signalement technique ou entrée importante du cahier de liaison – directement en notification sur cet appareil.";
I18N.it["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "Nuovi turni, turno cambiato, richiesta decisa, nuova segnalazione tecnica o voce importante nel registro consegne – direttamente come notifica su questo dispositivo.";
I18N.es["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "Nuevo cuadrante, turno cambiado, solicitud resuelta, nuevo aviso técnico o una entrada importante del libro de relevo – directamente como notificación en este dispositivo.";
I18N.pt["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "Nova escala, turno alterado, pedido decidido, nova ocorrência técnica ou uma entrada importante no livro de passagem – diretamente como notificação neste dispositivo.";
I18N.tr["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "Yeni vardiya planı, değişen vardiya, sonuçlanan talep, yeni arıza bildirimi veya devir defterindeki önemli bir not – doğrudan bu cihaza bildirim olarak.";
I18N.ja["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "新しい勤務表、シフト変更、申請の結果、新しい不具合報告、引継ぎ帳の重要事項 – この端末に通知で届きます。";
I18N.zh["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "新排班、班次变更、申请结果、新报修或交接本中的重要事项 – 直接以通知形式推送到此设备。";
I18N.ar["Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät."] = "جدول جديد، مناوبة متغيرة، طلب تم البت فيه، بلاغ صيانة جديد أو قيد مهم في سجل التسليم – مباشرة كإشعار على هذا الجهاز.";
I18N.en["Neuer Tag"] = "New day";
I18N.fr["Neuer Tag"] = "Nouvelle journée";
I18N.it["Neuer Tag"] = "Nuovo giorno";
I18N.es["Neuer Tag"] = "Nuevo día";
I18N.pt["Neuer Tag"] = "Novo dia";
I18N.tr["Neuer Tag"] = "Yeni gün";
I18N.ja["Neuer Tag"] = "新しい日";
I18N.zh["Neuer Tag"] = "新的一天";
I18N.ar["Neuer Tag"] = "يوم جديد";
I18N.en["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "New day: set all occupied rooms to “dirty”?";
I18N.fr["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "Nouvelle journée : passer toutes les chambres occupées en « sale » ?";
I18N.it["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "Nuovo giorno: impostare tutte le camere occupate su «sporca»?";
I18N.es["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "Nuevo día: ¿marcar todas las habitaciones ocupadas como «sucia»?";
I18N.pt["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "Novo dia: marcar todos os quartos ocupados como «sujo»?";
I18N.tr["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "Yeni gün: tüm dolu odalar “kirli” yapılsın mı?";
I18N.ja["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "新しい日：在室中の客室をすべて「未清掃」にしますか？";
I18N.zh["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "新的一天：将所有在住房设为“脏房”？";
I18N.ar["Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"] = "يوم جديد: تعيين كل الغرف المشغولة إلى «متسخة»؟";
I18N.en["Nicht eingestempelt."] = "Not clocked in.";
I18N.fr["Nicht eingestempelt."] = "Pas d’arrivée pointée.";
I18N.it["Nicht eingestempelt."] = "Non in servizio.";
I18N.es["Nicht eingestempelt."] = "Sin fichar.";
I18N.pt["Nicht eingestempelt."] = "Sem entrada registada.";
I18N.tr["Nicht eingestempelt."] = "Giriş yapılmadı.";
I18N.ja["Nicht eingestempelt."] = "未出勤";
I18N.zh["Nicht eingestempelt."] = "未打卡。";
I18N.ar["Nicht eingestempelt."] = "لم يتم تسجيل الحضور.";
I18N.en["Niemand zugewiesen"] = "Nobody assigned";
I18N.fr["Niemand zugewiesen"] = "Personne d’attribué";
I18N.it["Niemand zugewiesen"] = "Nessuno assegnato";
I18N.es["Niemand zugewiesen"] = "Sin asignar";
I18N.pt["Niemand zugewiesen"] = "Ninguém atribuído";
I18N.tr["Niemand zugewiesen"] = "Kimse atanmadı";
I18N.ja["Niemand zugewiesen"] = "担当者なし";
I18N.zh["Niemand zugewiesen"] = "未分配";
I18N.ar["Niemand zugewiesen"] = "لم يُسند لأحد";
I18N.en["Noch keine Meldungen."] = "No reports yet.";
I18N.fr["Noch keine Meldungen."] = "Aucun signalement pour l’instant.";
I18N.it["Noch keine Meldungen."] = "Ancora nessuna segnalazione.";
I18N.es["Noch keine Meldungen."] = "Todavía no hay avisos.";
I18N.pt["Noch keine Meldungen."] = "Ainda não há ocorrências.";
I18N.tr["Noch keine Meldungen."] = "Henüz bildirim yok.";
I18N.ja["Noch keine Meldungen."] = "まだ報告はありません。";
I18N.zh["Noch keine Meldungen."] = "还没有报修。";
I18N.ar["Noch keine Meldungen."] = "لا توجد بلاغات بعد.";
I18N.en["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "No rooms set up yet. The housekeeping or front office manager does this.";
I18N.fr["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "Aucune chambre créée. C’est le responsable housekeeping ou réception qui s’en charge.";
I18N.it["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "Nessuna camera ancora creata. Lo fa il responsabile di housekeeping o reception.";
I18N.es["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "Todavía no hay habitaciones. Las crea el jefe de housekeeping o de recepción.";
I18N.pt["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "Ainda não há quartos. Quem os cria é a chefia de housekeeping ou da receção.";
I18N.tr["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "Henüz oda oluşturulmadı. Bunu kat hizmetleri veya resepsiyon yöneticisi yapar.";
I18N.ja["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "まだ客室が登録されていません。ハウスキーピングまたはフロントの責任者が登録します。";
I18N.zh["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "还没有创建客房，由客房部或前台经理创建。";
I18N.ar["Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption."] = "لم تُنشأ أي غرف بعد. يقوم بذلك مدير التدبير الفندقي أو الاستقبال.";
I18N.en["Nur meine Zimmer"] = "Only my rooms";
I18N.fr["Nur meine Zimmer"] = "Seulement mes chambres";
I18N.it["Nur meine Zimmer"] = "Solo le mie camere";
I18N.es["Nur meine Zimmer"] = "Solo mis habitaciones";
I18N.pt["Nur meine Zimmer"] = "Só os meus quartos";
I18N.tr["Nur meine Zimmer"] = "Yalnızca odalarım";
I18N.ja["Nur meine Zimmer"] = "自分の担当のみ";
I18N.zh["Nur meine Zimmer"] = "只看我的房间";
I18N.ar["Nur meine Zimmer"] = "غرفي فقط";
I18N.en["Pause"] = "Break";
I18N.fr["Pause"] = "Pause";
I18N.it["Pause"] = "Pausa";
I18N.es["Pause"] = "Pausa";
I18N.pt["Pause"] = "Pausa";
I18N.tr["Pause"] = "Mola";
I18N.ja["Pause"] = "休憩";
I18N.zh["Pause"] = "休息";
I18N.ar["Pause"] = "استراحة";
I18N.en["Pause (Min.)"] = "Break (min)";
I18N.fr["Pause (Min.)"] = "Pause (min)";
I18N.it["Pause (Min.)"] = "Pausa (min)";
I18N.es["Pause (Min.)"] = "Pausa (min)";
I18N.pt["Pause (Min.)"] = "Pausa (min)";
I18N.tr["Pause (Min.)"] = "Mola (dk)";
I18N.ja["Pause (Min.)"] = "休憩（分）";
I18N.zh["Pause (Min.)"] = "休息（分钟）";
I18N.ar["Pause (Min.)"] = "الاستراحة (د)";
I18N.en["Pause {0} Min."] = "Break {0} min";
I18N.fr["Pause {0} Min."] = "Pause {0} min";
I18N.it["Pause {0} Min."] = "Pausa {0} min";
I18N.es["Pause {0} Min."] = "Pausa {0} min";
I18N.pt["Pause {0} Min."] = "Pausa {0} min";
I18N.tr["Pause {0} Min."] = "Mola {0} dk";
I18N.ja["Pause {0} Min."] = "休憩 {0} 分";
I18N.zh["Pause {0} Min."] = "休息 {0} 分钟";
I18N.ar["Pause {0} Min."] = "استراحة {0} د";
I18N.en["Pausen (h)"] = "Breaks (h)";
I18N.fr["Pausen (h)"] = "Pauses (h)";
I18N.it["Pausen (h)"] = "Pause (h)";
I18N.es["Pausen (h)"] = "Pausas (h)";
I18N.pt["Pausen (h)"] = "Pausas (h)";
I18N.tr["Pausen (h)"] = "Molalar (sa)";
I18N.ja["Pausen (h)"] = "休憩（時間）";
I18N.zh["Pausen (h)"] = "休息（小时）";
I18N.ar["Pausen (h)"] = "الاستراحات (س)";
I18N.en["Person"] = "Person";
I18N.fr["Person"] = "Personne";
I18N.it["Person"] = "Persona";
I18N.es["Person"] = "Persona";
I18N.pt["Person"] = "Pessoa";
I18N.tr["Person"] = "Kişi";
I18N.ja["Person"] = "担当者";
I18N.zh["Person"] = "人员";
I18N.ar["Person"] = "الشخص";
I18N.en["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "Push notifications aren't set up yet.";
I18N.fr["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "Les notifications push ne sont pas encore configurées.";
I18N.it["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "Le notifiche push non sono ancora configurate.";
I18N.es["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "Las notificaciones push aún no están configuradas.";
I18N.pt["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "As notificações push ainda não estão configuradas.";
I18N.tr["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "Anlık bildirimler henüz ayarlanmadı.";
I18N.ja["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "プッシュ通知はまだ設定されていません。";
I18N.zh["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "推送通知尚未设置。";
I18N.ar["Push-Benachrichtigungen sind noch nicht eingerichtet."] = "لم يتم إعداد الإشعارات الفورية بعد.";
I18N.en["Soll (h)"] = "Target (h)";
I18N.fr["Soll (h)"] = "Prévu (h)";
I18N.it["Soll (h)"] = "Previste (h)";
I18N.es["Soll (h)"] = "Objetivo (h)";
I18N.pt["Soll (h)"] = "Previsto (h)";
I18N.tr["Soll (h)"] = "Hedef (sa)";
I18N.ja["Soll (h)"] = "所定（時間）";
I18N.zh["Soll (h)"] = "应出勤（小时）";
I18N.ar["Soll (h)"] = "المستهدف (س)";
I18N.en["Soll bis heute"] = "Target to date";
I18N.fr["Soll bis heute"] = "Prévu à ce jour";
I18N.it["Soll bis heute"] = "Previste a oggi";
I18N.es["Soll bis heute"] = "Objetivo hasta hoy";
I18N.pt["Soll bis heute"] = "Previsto até hoje";
I18N.tr["Soll bis heute"] = "Bugüne kadar hedef";
I18N.ja["Soll bis heute"] = "本日までの所定";
I18N.zh["Soll bis heute"] = "截至今日应出勤";
I18N.ar["Soll bis heute"] = "المستهدف حتى اليوم";
I18N.en["Soll bis heute (h)"] = "Target to date (h)";
I18N.fr["Soll bis heute (h)"] = "Prévu à ce jour (h)";
I18N.it["Soll bis heute (h)"] = "Previste a oggi (h)";
I18N.es["Soll bis heute (h)"] = "Objetivo hasta hoy (h)";
I18N.pt["Soll bis heute (h)"] = "Previsto até hoje (h)";
I18N.tr["Soll bis heute (h)"] = "Bugüne kadar hedef (sa)";
I18N.ja["Soll bis heute (h)"] = "本日までの所定（時間）";
I18N.zh["Soll bis heute (h)"] = "截至今日应出勤（小时）";
I18N.ar["Soll bis heute (h)"] = "المستهدف حتى اليوم (س)";
I18N.en["Sonntag"] = "Sunday";
I18N.fr["Sonntag"] = "Dimanche";
I18N.it["Sonntag"] = "Domenica";
I18N.es["Sonntag"] = "Domingo";
I18N.pt["Sonntag"] = "Domingo";
I18N.tr["Sonntag"] = "Pazar";
I18N.ja["Sonntag"] = "日曜";
I18N.zh["Sonntag"] = "周日";
I18N.ar["Sonntag"] = "الأحد";
I18N.en["Sonntagsstunden (h)"] = "Sunday hours (h)";
I18N.fr["Sonntagsstunden (h)"] = "Heures du dimanche (h)";
I18N.it["Sonntagsstunden (h)"] = "Ore domenicali (h)";
I18N.es["Sonntagsstunden (h)"] = "Horas en domingo (h)";
I18N.pt["Sonntagsstunden (h)"] = "Horas ao domingo (h)";
I18N.tr["Sonntagsstunden (h)"] = "Pazar saatleri (sa)";
I18N.ja["Sonntagsstunden (h)"] = "日曜時間（時間）";
I18N.zh["Sonntagsstunden (h)"] = "周日工时（小时）";
I18N.ar["Sonntagsstunden (h)"] = "ساعات الأحد (س)";
I18N.en["Später"] = "Later";
I18N.fr["Später"] = "Plus tard";
I18N.it["Später"] = "Più tardi";
I18N.es["Später"] = "Más tarde";
I18N.pt["Später"] = "Mais tarde";
I18N.tr["Später"] = "Sonra";
I18N.ja["Später"] = "後で";
I18N.zh["Später"] = "稍后";
I18N.ar["Später"] = "لاحقًا";
I18N.en["Stock {0}"] = "Floor {0}";
I18N.fr["Stock {0}"] = "Étage {0}";
I18N.it["Stock {0}"] = "Piano {0}";
I18N.es["Stock {0}"] = "Planta {0}";
I18N.pt["Stock {0}"] = "Piso {0}";
I18N.tr["Stock {0}"] = "{0}. kat";
I18N.ja["Stock {0}"] = "{0}階";
I18N.zh["Stock {0}"] = "{0} 楼";
I18N.ar["Stock {0}"] = "الطابق {0}";
I18N.en["Stunden"] = "Hours";
I18N.fr["Stunden"] = "Heures";
I18N.it["Stunden"] = "Ore";
I18N.es["Stunden"] = "Horas";
I18N.pt["Stunden"] = "Horas";
I18N.tr["Stunden"] = "Saat";
I18N.ja["Stunden"] = "時間";
I18N.zh["Stunden"] = "小时";
I18N.ar["Stunden"] = "الساعات";
I18N.en["Team und Monatsauswertung"] = "Team and monthly summary";
I18N.fr["Team und Monatsauswertung"] = "Équipe et bilan mensuel";
I18N.it["Team und Monatsauswertung"] = "Team e riepilogo mensile";
I18N.es["Team und Monatsauswertung"] = "Equipo y resumen mensual";
I18N.pt["Team und Monatsauswertung"] = "Equipa e resumo mensal";
I18N.tr["Team und Monatsauswertung"] = "Ekip ve aylık özet";
I18N.ja["Team und Monatsauswertung"] = "チームと月次集計";
I18N.zh["Team und Monatsauswertung"] = "团队与月度汇总";
I18N.ar["Team und Monatsauswertung"] = "الفريق والملخص الشهري";
I18N.en["Test senden"] = "Send test";
I18N.fr["Test senden"] = "Envoyer un test";
I18N.it["Test senden"] = "Invia test";
I18N.es["Test senden"] = "Enviar prueba";
I18N.pt["Test senden"] = "Enviar teste";
I18N.tr["Test senden"] = "Test gönder";
I18N.ja["Test senden"] = "テスト送信";
I18N.zh["Test senden"] = "发送测试";
I18N.ar["Test senden"] = "إرسال تجربة";
I18N.en["Testnachricht gesendet."] = "Test message sent.";
I18N.fr["Testnachricht gesendet."] = "Message de test envoyé.";
I18N.it["Testnachricht gesendet."] = "Messaggio di prova inviato.";
I18N.es["Testnachricht gesendet."] = "Mensaje de prueba enviado.";
I18N.pt["Testnachricht gesendet."] = "Mensagem de teste enviada.";
I18N.tr["Testnachricht gesendet."] = "Test mesajı gönderildi.";
I18N.ja["Testnachricht gesendet."] = "テスト通知を送信しました。";
I18N.zh["Testnachricht gesendet."] = "测试消息已发送。";
I18N.ar["Testnachricht gesendet."] = "تم إرسال رسالة تجريبية.";
I18N.en["Urlaubstage"] = "Holiday days";
I18N.fr["Urlaubstage"] = "Jours de congé";
I18N.it["Urlaubstage"] = "Giorni di ferie";
I18N.es["Urlaubstage"] = "Días de vacaciones";
I18N.pt["Urlaubstage"] = "Dias de férias";
I18N.tr["Urlaubstage"] = "İzin günleri";
I18N.ja["Urlaubstage"] = "休暇日数";
I18N.zh["Urlaubstage"] = "休假天数";
I18N.ar["Urlaubstage"] = "أيام الإجازة";
I18N.en["Was ist kaputt?"] = "What is broken?";
I18N.fr["Was ist kaputt?"] = "Qu’est-ce qui est en panne ?";
I18N.it["Was ist kaputt?"] = "Cosa è guasto?";
I18N.es["Was ist kaputt?"] = "¿Qué está averiado?";
I18N.pt["Was ist kaputt?"] = "O que está avariado?";
I18N.tr["Was ist kaputt?"] = "Ne bozuk?";
I18N.ja["Was ist kaputt?"] = "何が壊れていますか？";
I18N.zh["Was ist kaputt?"] = "什么坏了？";
I18N.ar["Was ist kaputt?"] = "ما المعطّل؟";
I18N.en["Wieder öffnen"] = "Reopen";
I18N.fr["Wieder öffnen"] = "Rouvrir";
I18N.it["Wieder öffnen"] = "Riapri";
I18N.es["Wieder öffnen"] = "Reabrir";
I18N.pt["Wieder öffnen"] = "Reabrir";
I18N.tr["Wieder öffnen"] = "Yeniden aç";
I18N.ja["Wieder öffnen"] = "再オープン";
I18N.zh["Wieder öffnen"] = "重新打开";
I18N.ar["Wieder öffnen"] = "إعادة فتح";
I18N.en["Wo?"] = "Where?";
I18N.fr["Wo?"] = "Où ?";
I18N.it["Wo?"] = "Dove?";
I18N.es["Wo?"] = "¿Dónde?";
I18N.pt["Wo?"] = "Onde?";
I18N.tr["Wo?"] = "Nerede?";
I18N.ja["Wo?"] = "場所";
I18N.zh["Wo?"] = "位置";
I18N.ar["Wo?"] = "أين؟";
I18N.en["Zimmer anlegen"] = "Set up rooms";
I18N.fr["Zimmer anlegen"] = "Créer les chambres";
I18N.it["Zimmer anlegen"] = "Crea camere";
I18N.es["Zimmer anlegen"] = "Crear habitaciones";
I18N.pt["Zimmer anlegen"] = "Criar quartos";
I18N.tr["Zimmer anlegen"] = "Oda oluştur";
I18N.ja["Zimmer anlegen"] = "客室を登録";
I18N.zh["Zimmer anlegen"] = "创建客房";
I18N.ar["Zimmer anlegen"] = "إنشاء الغرف";
I18N.en["Zimmer hinzufügen"] = "Add rooms";
I18N.fr["Zimmer hinzufügen"] = "Ajouter des chambres";
I18N.it["Zimmer hinzufügen"] = "Aggiungi camere";
I18N.es["Zimmer hinzufügen"] = "Añadir habitaciones";
I18N.pt["Zimmer hinzufügen"] = "Adicionar quartos";
I18N.tr["Zimmer hinzufügen"] = "Oda ekle";
I18N.ja["Zimmer hinzufügen"] = "客室を追加";
I18N.zh["Zimmer hinzufügen"] = "添加客房";
I18N.ar["Zimmer hinzufügen"] = "إضافة غرف";
I18N.en["Zimmer {0}"] = "Room {0}";
I18N.fr["Zimmer {0}"] = "Chambre {0}";
I18N.it["Zimmer {0}"] = "Camera {0}";
I18N.es["Zimmer {0}"] = "Habitación {0}";
I18N.pt["Zimmer {0}"] = "Quarto {0}";
I18N.tr["Zimmer {0}"] = "Oda {0}";
I18N.ja["Zimmer {0}"] = "{0}号室";
I18N.zh["Zimmer {0}"] = "{0} 房";
I18N.ar["Zimmer {0}"] = "الغرفة {0}";
I18N.en["Zimmer {0} löschen?"] = "Delete room {0}?";
I18N.fr["Zimmer {0} löschen?"] = "Supprimer la chambre {0} ?";
I18N.it["Zimmer {0} löschen?"] = "Eliminare la camera {0}?";
I18N.es["Zimmer {0} löschen?"] = "¿Eliminar la habitación {0}?";
I18N.pt["Zimmer {0} löschen?"] = "Eliminar o quarto {0}?";
I18N.tr["Zimmer {0} löschen?"] = "Oda {0} silinsin mi?";
I18N.ja["Zimmer {0} löschen?"] = "{0}号室を削除しますか？";
I18N.zh["Zimmer {0} löschen?"] = "删除 {0} 房？";
I18N.ar["Zimmer {0} löschen?"] = "حذف الغرفة {0}؟";
I18N.en["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "Enter room numbers individually or as a range – the floor is detected from the number.";
I18N.fr["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "Saisis les numéros un par un ou par plage – l’étage est déduit du numéro.";
I18N.it["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "Inserisci i numeri singolarmente o come intervallo – il piano viene ricavato dal numero.";
I18N.es["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "Introduce los números uno a uno o como rango – la planta se detecta a partir del número.";
I18N.pt["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "Introduz os números um a um ou como intervalo – o piso é detetado a partir do número.";
I18N.tr["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "Oda numaralarını tek tek veya aralık olarak gir – kat, numaradan anlaşılır.";
I18N.ja["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "客室番号は個別または範囲で入力します。フロアは番号から自動判定されます。";
I18N.zh["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "逐个或按范围输入房号 – 楼层会根据房号自动识别。";
I18N.ar["Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt."] = "أدخل أرقام الغرف منفردة أو كنطاق – يُستنتج الطابق من الرقم.";
I18N.en["Zimmerstatus"] = "Room status";
I18N.fr["Zimmerstatus"] = "Statut des chambres";
I18N.it["Zimmerstatus"] = "Stato camere";
I18N.es["Zimmerstatus"] = "Estado de habitaciones";
I18N.pt["Zimmerstatus"] = "Estado dos quartos";
I18N.tr["Zimmerstatus"] = "Oda durumu";
I18N.ja["Zimmerstatus"] = "客室状態";
I18N.zh["Zimmerstatus"] = "房态";
I18N.ar["Zimmerstatus"] = "حالة الغرف";
I18N.en["Zimmertyp (optional)"] = "Room type (optional)";
I18N.fr["Zimmertyp (optional)"] = "Type de chambre (facultatif)";
I18N.it["Zimmertyp (optional)"] = "Tipo di camera (facoltativo)";
I18N.es["Zimmertyp (optional)"] = "Tipo de habitación (opcional)";
I18N.pt["Zimmertyp (optional)"] = "Tipo de quarto (opcional)";
I18N.tr["Zimmertyp (optional)"] = "Oda tipi (isteğe bağlı)";
I18N.ja["Zimmertyp (optional)"] = "客室タイプ（任意）";
I18N.zh["Zimmertyp (optional)"] = "房型（选填）";
I18N.ar["Zimmertyp (optional)"] = "نوع الغرفة (اختياري)";
I18N.en["Zugeteilt an"] = "Assigned to";
I18N.fr["Zugeteilt an"] = "Attribuée à";
I18N.it["Zugeteilt an"] = "Assegnata a";
I18N.es["Zugeteilt an"] = "Asignada a";
I18N.pt["Zugeteilt an"] = "Atribuído a";
I18N.tr["Zugeteilt an"] = "Atanan kişi";
I18N.ja["Zugeteilt an"] = "担当者";
I18N.zh["Zugeteilt an"] = "分配给";
I18N.ar["Zugeteilt an"] = "مُسندة إلى";
I18N.en["Zuständig: {0}"] = "Assigned: {0}";
I18N.fr["Zuständig: {0}"] = "Responsable : {0}";
I18N.it["Zuständig: {0}"] = "Assegnata a: {0}";
I18N.es["Zuständig: {0}"] = "Responsable: {0}";
I18N.pt["Zuständig: {0}"] = "Responsável: {0}";
I18N.tr["Zuständig: {0}"] = "Sorumlu: {0}";
I18N.ja["Zuständig: {0}"] = "担当：{0}";
I18N.zh["Zuständig: {0}"] = "负责人：{0}";
I18N.ar["Zuständig: {0}"] = "المسؤول: {0}";
I18N.en["davon korrigiert"] = "of which corrected";
I18N.fr["davon korrigiert"] = "dont corrigés";
I18N.it["davon korrigiert"] = "di cui corrette";
I18N.es["davon korrigiert"] = "de ellos corregidos";
I18N.pt["davon korrigiert"] = "dos quais corrigidos";
I18N.tr["davon korrigiert"] = "düzeltilenler";
I18N.ja["davon korrigiert"] = "うち修正";
I18N.zh["davon korrigiert"] = "其中已更正";
I18N.ar["davon korrigiert"] = "منها مصحَّحة";
I18N.en["korrigiert"] = "corrected";
I18N.fr["korrigiert"] = "corrigé";
I18N.it["korrigiert"] = "corretto";
I18N.es["korrigiert"] = "corregido";
I18N.pt["korrigiert"] = "corrigido";
I18N.tr["korrigiert"] = "düzeltildi";
I18N.ja["korrigiert"] = "修正済み";
I18N.zh["korrigiert"] = "已更正";
I18N.ar["korrigiert"] = "مصحَّح";
I18N.en["korrigiert am"] = "corrected on";
I18N.fr["korrigiert am"] = "corrigé le";
I18N.it["korrigiert am"] = "corretto il";
I18N.es["korrigiert am"] = "corregido el";
I18N.pt["korrigiert am"] = "corrigido em";
I18N.tr["korrigiert am"] = "düzeltme tarihi";
I18N.ja["korrigiert am"] = "修正日時";
I18N.zh["korrigiert am"] = "更正时间";
I18N.ar["korrigiert am"] = "تاريخ التصحيح";
I18N.en["korrigiert von"] = "corrected by";
I18N.fr["korrigiert von"] = "corrigé par";
I18N.it["korrigiert von"] = "corretto da";
I18N.es["korrigiert von"] = "corregido por";
I18N.pt["korrigiert von"] = "corrigido por";
I18N.tr["korrigiert von"] = "düzelten";
I18N.ja["korrigiert von"] = "修正者";
I18N.zh["korrigiert von"] = "更正人";
I18N.ar["korrigiert von"] = "صحّحه";
I18N.en["korrigiert von {0}"] = "corrected by {0}";
I18N.fr["korrigiert von {0}"] = "corrigé par {0}";
I18N.it["korrigiert von {0}"] = "corretto da {0}";
I18N.es["korrigiert von {0}"] = "corregido por {0}";
I18N.pt["korrigiert von {0}"] = "corrigido por {0}";
I18N.tr["korrigiert von {0}"] = "düzelten: {0}";
I18N.ja["korrigiert von {0}"] = "修正者：{0}";
I18N.zh["korrigiert von {0}"] = "由 {0} 更正";
I18N.ar["korrigiert von {0}"] = "صحّحه {0}";
I18N.en["z. B. 101-120, 201-220, Suite 1"] = "e.g. 101-120, 201-220, Suite 1";
I18N.fr["z. B. 101-120, 201-220, Suite 1"] = "p. ex. 101-120, 201-220, Suite 1";
I18N.it["z. B. 101-120, 201-220, Suite 1"] = "es. 101-120, 201-220, Suite 1";
I18N.es["z. B. 101-120, 201-220, Suite 1"] = "p. ej. 101-120, 201-220, Suite 1";
I18N.pt["z. B. 101-120, 201-220, Suite 1"] = "p. ex. 101-120, 201-220, Suite 1";
I18N.tr["z. B. 101-120, 201-220, Suite 1"] = "ör. 101-120, 201-220, Suite 1";
I18N.ja["z. B. 101-120, 201-220, Suite 1"] = "例：101-120, 201-220, Suite 1";
I18N.zh["z. B. 101-120, 201-220, Suite 1"] = "例如 101-120, 201-220, Suite 1";
I18N.ar["z. B. 101-120, 201-220, Suite 1"] = "مثل 101-120, 201-220, Suite 1";
I18N.en["z. B. Babybett, Late Check-out 14 Uhr"] = "e.g. baby cot, late check-out 2 pm";
I18N.fr["z. B. Babybett, Late Check-out 14 Uhr"] = "p. ex. lit bébé, départ tardif 14 h";
I18N.it["z. B. Babybett, Late Check-out 14 Uhr"] = "es. culla, late check-out ore 14";
I18N.es["z. B. Babybett, Late Check-out 14 Uhr"] = "p. ej. cuna, salida tardía a las 14 h";
I18N.pt["z. B. Babybett, Late Check-out 14 Uhr"] = "p. ex. berço, saída tardia às 14h";
I18N.tr["z. B. Babybett, Late Check-out 14 Uhr"] = "ör. bebek yatağı, geç çıkış 14:00";
I18N.ja["z. B. Babybett, Late Check-out 14 Uhr"] = "例：ベビーベッド、レイトチェックアウト 14時";
I18N.zh["z. B. Babybett, Late Check-out 14 Uhr"] = "例如 婴儿床，延迟退房 14 点";
I18N.ar["z. B. Babybett, Late Check-out 14 Uhr"] = "مثل سرير أطفال، مغادرة متأخرة 14:00";
I18N.en["z. B. Licht im Bad flackert"] = "e.g. bathroom light flickering";
I18N.fr["z. B. Licht im Bad flackert"] = "p. ex. la lumière de la salle de bain clignote";
I18N.it["z. B. Licht im Bad flackert"] = "es. la luce del bagno sfarfalla";
I18N.es["z. B. Licht im Bad flackert"] = "p. ej. la luz del baño parpadea";
I18N.pt["z. B. Licht im Bad flackert"] = "p. ex. a luz da casa de banho pisca";
I18N.tr["z. B. Licht im Bad flackert"] = "ör. banyodaki ışık titriyor";
I18N.ja["z. B. Licht im Bad flackert"] = "例：浴室の照明がちらつく";
I18N.zh["z. B. Licht im Bad flackert"] = "例如 浴室灯闪烁";
I18N.ar["z. B. Licht im Bad flackert"] = "مثل ضوء الحمام يومض";
I18N.en["z. B. Stempeln vergessen"] = "e.g. forgot to clock in";
I18N.fr["z. B. Stempeln vergessen"] = "p. ex. oubli de pointage";
I18N.it["z. B. Stempeln vergessen"] = "es. timbratura dimenticata";
I18N.es["z. B. Stempeln vergessen"] = "p. ej. olvidó fichar";
I18N.pt["z. B. Stempeln vergessen"] = "p. ex. esqueceu-se de registar";
I18N.tr["z. B. Stempeln vergessen"] = "ör. giriş yapmayı unuttu";
I18N.ja["z. B. Stempeln vergessen"] = "例：打刻忘れ";
I18N.zh["z. B. Stempeln vergessen"] = "例如 忘记打卡";
I18N.ar["z. B. Stempeln vergessen"] = "مثل نسيان تسجيل الحضور";
I18N.en["z. B. Zimmer 214, Lobby, Küche"] = "e.g. room 214, lobby, kitchen";
I18N.fr["z. B. Zimmer 214, Lobby, Küche"] = "p. ex. chambre 214, hall, cuisine";
I18N.it["z. B. Zimmer 214, Lobby, Küche"] = "es. camera 214, lobby, cucina";
I18N.es["z. B. Zimmer 214, Lobby, Küche"] = "p. ej. habitación 214, lobby, cocina";
I18N.pt["z. B. Zimmer 214, Lobby, Küche"] = "p. ex. quarto 214, lobby, cozinha";
I18N.tr["z. B. Zimmer 214, Lobby, Küche"] = "ör. oda 214, lobi, mutfak";
I18N.ja["z. B. Zimmer 214, Lobby, Küche"] = "例：214号室、ロビー、厨房";
I18N.zh["z. B. Zimmer 214, Lobby, Küche"] = "例如 214 房、大堂、厨房";
I18N.ar["z. B. Zimmer 214, Lobby, Küche"] = "مثل الغرفة 214، الردهة، المطبخ";
I18N.en["{0} Zimmer angelegt."] = "{0} rooms created.";
I18N.fr["{0} Zimmer angelegt."] = "{0} chambres créées.";
I18N.it["{0} Zimmer angelegt."] = "{0} camere create.";
I18N.es["{0} Zimmer angelegt."] = "{0} habitaciones creadas.";
I18N.pt["{0} Zimmer angelegt."] = "{0} quartos criados.";
I18N.tr["{0} Zimmer angelegt."] = "{0} oda oluşturuldu.";
I18N.ja["{0} Zimmer angelegt."] = "{0} 室を登録しました。";
I18N.zh["{0} Zimmer angelegt."] = "已创建 {0} 间客房。";
I18N.ar["{0} Zimmer angelegt."] = "تم إنشاء {0} غرفة.";
I18N.en["{0} Zimmer geändert."] = "{0} rooms updated.";
I18N.fr["{0} Zimmer geändert."] = "{0} chambres modifiées.";
I18N.it["{0} Zimmer geändert."] = "{0} camere aggiornate.";
I18N.es["{0} Zimmer geändert."] = "{0} habitaciones actualizadas.";
I18N.pt["{0} Zimmer geändert."] = "{0} quartos atualizados.";
I18N.tr["{0} Zimmer geändert."] = "{0} oda güncellendi.";
I18N.ja["{0} Zimmer geändert."] = "{0} 室を更新しました。";
I18N.zh["{0} Zimmer geändert."] = "已更新 {0} 间客房。";
I18N.ar["{0} Zimmer geändert."] = "تم تحديث {0} غرفة.";
I18N.en["{0} gab es schon."] = "{0} already existed.";
I18N.fr["{0} gab es schon."] = "{0} existaient déjà.";
I18N.it["{0} gab es schon."] = "{0} esistevano già.";
I18N.es["{0} gab es schon."] = "{0} ya existían.";
I18N.pt["{0} gab es schon."] = "{0} já existiam.";
I18N.tr["{0} gab es schon."] = "{0} tanesi zaten vardı.";
I18N.ja["{0} gab es schon."] = "{0} 室は既に登録済みでした。";
I18N.zh["{0} gab es schon."] = "{0} 间已存在。";
I18N.ar["{0} gab es schon."] = "{0} كانت موجودة بالفعل.";
I18N.en["Übernehmen"] = "Take on";
I18N.fr["Übernehmen"] = "Prendre en charge";
I18N.it["Übernehmen"] = "Prendi in carico";
I18N.es["Übernehmen"] = "Asumir";
I18N.pt["Übernehmen"] = "Assumir";
I18N.tr["Übernehmen"] = "Üstlen";
I18N.ja["Übernehmen"] = "対応する";
I18N.zh["Übernehmen"] = "接单";
I18N.ar["Übernehmen"] = "تولّي المهمة";

// 020: Chat, PMS-Anbindung, Feiertage
I18N.en["Chat"] = "Chat";
I18N.fr["Chat"] = "Chat";
I18N.it["Chat"] = "Chat";
I18N.es["Chat"] = "Chat";
I18N.pt["Chat"] = "Chat";
I18N.tr["Chat"] = "Sohbet";
I18N.ja["Chat"] = "チャット";
I18N.zh["Chat"] = "聊天";
I18N.ar["Chat"] = "الدردشة";
I18N.en["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "Sync done: {0} rooms new, {1} changed.";
I18N.fr["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "Synchronisation terminée : {0} chambres nouvelles, {1} modifiées.";
I18N.it["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "Sincronizzazione completata: {0} camere nuove, {1} modificate.";
I18N.es["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "Sincronización terminada: {0} habitaciones nuevas, {1} cambiadas.";
I18N.pt["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "Sincronização concluída: {0} quartos novos, {1} alterados.";
I18N.tr["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "Eşitleme tamam: {0} yeni oda, {1} değişiklik.";
I18N.ja["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "同期完了：新規 {0} 室、変更 {1} 室。";
I18N.zh["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "同步完成：新增 {0} 间，更改 {1} 间。";
I18N.ar["Abgleich fertig: {0} Zimmer neu, {1} geändert."] = "اكتملت المزامنة: {0} غرف جديدة، {1} تم تغييرها.";
I18N.en["Access Token aus Mews (Marketplace → Ouverture)"] = "Access token from Mews (Marketplace → Ouverture)";
I18N.fr["Access Token aus Mews (Marketplace → Ouverture)"] = "Access token de Mews (Marketplace → Ouverture)";
I18N.it["Access Token aus Mews (Marketplace → Ouverture)"] = "Access token di Mews (Marketplace → Ouverture)";
I18N.es["Access Token aus Mews (Marketplace → Ouverture)"] = "Access token de Mews (Marketplace → Ouverture)";
I18N.pt["Access Token aus Mews (Marketplace → Ouverture)"] = "Access token do Mews (Marketplace → Ouverture)";
I18N.tr["Access Token aus Mews (Marketplace → Ouverture)"] = "Mews access token’ı (Marketplace → Ouverture)";
I18N.ja["Access Token aus Mews (Marketplace → Ouverture)"] = "Mews のアクセストークン（Marketplace → Ouverture）";
I18N.zh["Access Token aus Mews (Marketplace → Ouverture)"] = "Mews 访问令牌（Marketplace → Ouverture）";
I18N.ar["Access Token aus Mews (Marketplace → Ouverture)"] = "رمز الوصول من Mews (Marketplace ← Ouverture)";
I18N.en["Anderes PMS (Webhook)"] = "Other PMS (webhook)";
I18N.fr["Anderes PMS (Webhook)"] = "Autre PMS (webhook)";
I18N.it["Anderes PMS (Webhook)"] = "Altro PMS (webhook)";
I18N.es["Anderes PMS (Webhook)"] = "Otro PMS (webhook)";
I18N.pt["Anderes PMS (Webhook)"] = "Outro PMS (webhook)";
I18N.tr["Anderes PMS (Webhook)"] = "Başka PMS (webhook)";
I18N.ja["Anderes PMS (Webhook)"] = "その他の PMS（Webhook）";
I18N.zh["Anderes PMS (Webhook)"] = "其他 PMS（Webhook）";
I18N.ar["Anderes PMS (Webhook)"] = "نظام آخر (Webhook)";
I18N.en["Aus Datei übernehmen"] = "Import from file";
I18N.fr["Aus Datei übernehmen"] = "Importer un fichier";
I18N.it["Aus Datei übernehmen"] = "Importa da file";
I18N.es["Aus Datei übernehmen"] = "Importar desde archivo";
I18N.pt["Aus Datei übernehmen"] = "Importar de ficheiro";
I18N.tr["Aus Datei übernehmen"] = "Dosyadan al";
I18N.ja["Aus Datei übernehmen"] = "ファイルから取り込む";
I18N.zh["Aus Datei übernehmen"] = "从文件导入";
I18N.ar["Aus Datei übernehmen"] = "استيراد من ملف";
I18N.en["Belegung übernehmen (Anreise, Abreise, belegt)"] = "Import occupancy (arrival, departure, occupied)";
I18N.fr["Belegung übernehmen (Anreise, Abreise, belegt)"] = "Reprendre l’occupation (arrivée, départ, occupée)";
I18N.it["Belegung übernehmen (Anreise, Abreise, belegt)"] = "Importa l’occupazione (arrivo, partenza, occupata)";
I18N.es["Belegung übernehmen (Anreise, Abreise, belegt)"] = "Importar ocupación (llegada, salida, ocupada)";
I18N.pt["Belegung übernehmen (Anreise, Abreise, belegt)"] = "Importar ocupação (chegada, partida, ocupado)";
I18N.tr["Belegung übernehmen (Anreise, Abreise, belegt)"] = "Doluluğu al (giriş, çıkış, dolu)";
I18N.ja["Belegung übernehmen (Anreise, Abreise, belegt)"] = "在室状況を取り込む（チェックイン、チェックアウト、在室）";
I18N.zh["Belegung übernehmen (Anreise, Abreise, belegt)"] = "同步入住状态（到店、离店、在住）";
I18N.ar["Belegung übernehmen (Anreise, Abreise, belegt)"] = "استيراد الإشغال (وصول، مغادرة، مشغولة)";
I18N.en["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "The PMS (or a service like Make/Zapier) sends via POST:";
I18N.fr["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "Le PMS (ou un service comme Make/Zapier) envoie en POST :";
I18N.it["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "Il PMS (o un servizio come Make/Zapier) invia via POST:";
I18N.es["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "El PMS (o un servicio como Make/Zapier) envía por POST:";
I18N.pt["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "O PMS (ou um serviço como Make/Zapier) envia por POST:";
I18N.tr["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "PMS (veya Make/Zapier gibi bir servis) POST ile gönderir:";
I18N.ja["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "PMS（または Make/Zapier などのサービス）が POST で送信します：";
I18N.zh["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "PMS（或 Make/Zapier 等服务）通过 POST 发送：";
I18N.ar["Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:"] = "يرسل نظام إدارة الفندق (أو خدمة مثل Make/Zapier) عبر POST:";
I18N.en["Der Chat ist für das Team."] = "The chat is for the team.";
I18N.fr["Der Chat ist für das Team."] = "Le chat est réservé à l’équipe.";
I18N.it["Der Chat ist für das Team."] = "La chat è riservata al team.";
I18N.es["Der Chat ist für das Team."] = "El chat es para el equipo.";
I18N.pt["Der Chat ist für das Team."] = "O chat é para a equipa.";
I18N.tr["Der Chat ist für das Team."] = "Sohbet ekip içindir.";
I18N.ja["Der Chat ist für das Team."] = "チャットはチーム用です。";
I18N.zh["Der Chat ist für das Team."] = "聊天仅供团队使用。";
I18N.ar["Der Chat ist für das Team."] = "الدردشة مخصصة للفريق.";
I18N.en["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "Excel or CSV export from the PMS with the columns room and status or occupancy";
I18N.fr["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "Export Excel ou CSV du PMS avec les colonnes chambre et statut ou occupation";
I18N.it["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "Export Excel o CSV dal PMS con le colonne camera e stato o occupazione";
I18N.es["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "Exportación Excel o CSV del PMS con las columnas habitación y estado u ocupación";
I18N.pt["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "Exportação Excel ou CSV do PMS com as colunas quarto e estado ou ocupação";
I18N.tr["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "PMS’ten oda ve durum ya da doluluk sütunlu Excel veya CSV dışa aktarımı";
I18N.ja["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "客室と状態（または在室状況）の列を含む PMS の Excel / CSV 出力";
I18N.zh["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "从 PMS 导出的 Excel 或 CSV，包含房号及状态或入住状态列";
I18N.ar["Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung"] = "ملف Excel أو CSV من نظام إدارة الفندق بعمودي الغرفة والحالة أو الإشغال";
I18N.en["Fehlende Zimmer automatisch anlegen"] = "Create missing rooms automatically";
I18N.fr["Fehlende Zimmer automatisch anlegen"] = "Créer automatiquement les chambres manquantes";
I18N.it["Fehlende Zimmer automatisch anlegen"] = "Crea automaticamente le camere mancanti";
I18N.es["Fehlende Zimmer automatisch anlegen"] = "Crear automáticamente las habitaciones que faltan";
I18N.pt["Fehlende Zimmer automatisch anlegen"] = "Criar automaticamente os quartos em falta";
I18N.tr["Fehlende Zimmer automatisch anlegen"] = "Eksik odaları otomatik oluştur";
I18N.ja["Fehlende Zimmer automatisch anlegen"] = "不足している客室を自動で登録";
I18N.zh["Fehlende Zimmer automatisch anlegen"] = "自动创建缺少的客房";
I18N.ar["Fehlende Zimmer automatisch anlegen"] = "إنشاء الغرف الناقصة تلقائيًا";
I18N.en["Feiertag"] = "Holiday";
I18N.fr["Feiertag"] = "Férié";
I18N.it["Feiertag"] = "Festivo";
I18N.es["Feiertag"] = "Festivo";
I18N.pt["Feiertag"] = "Feriado";
I18N.tr["Feiertag"] = "Tatil";
I18N.ja["Feiertag"] = "祝日";
I18N.zh["Feiertag"] = "节假日";
I18N.ar["Feiertag"] = "عطلة";
I18N.en["Feiertage"] = "Public holidays";
I18N.fr["Feiertage"] = "Jours fériés";
I18N.it["Feiertage"] = "Festività";
I18N.es["Feiertage"] = "Festivos";
I18N.pt["Feiertage"] = "Feriados";
I18N.tr["Feiertage"] = "Resmî tatiller";
I18N.ja["Feiertage"] = "祝日";
I18N.zh["Feiertage"] = "节假日";
I18N.ar["Feiertage"] = "العطل الرسمية";
I18N.en["Feiertage ({0}): {1}"] = "Public holidays ({0}): {1}";
I18N.fr["Feiertage ({0}): {1}"] = "Jours fériés ({0}) : {1}";
I18N.it["Feiertage ({0}): {1}"] = "Festività ({0}): {1}";
I18N.es["Feiertage ({0}): {1}"] = "Festivos ({0}): {1}";
I18N.pt["Feiertage ({0}): {1}"] = "Feriados ({0}): {1}";
I18N.tr["Feiertage ({0}): {1}"] = "Resmî tatiller ({0}): {1}";
I18N.ja["Feiertage ({0}): {1}"] = "祝日（{0}）：{1}";
I18N.zh["Feiertage ({0}): {1}"] = "节假日（{0}）：{1}";
I18N.ar["Feiertage ({0}): {1}"] = "العطل الرسمية ({0}): {1}";
I18N.en["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "Public holidays are included once a holiday region is chosen under “Edit hotel”.";
I18N.fr["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "Les jours fériés sont pris en compte dès qu’une région est choisie dans « Modifier l’hôtel ».";
I18N.it["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "Le festività vengono considerate non appena in «Modifica hotel» è scelta una regione.";
I18N.es["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "Los festivos se tienen en cuenta en cuanto se elige una región en «Editar hotel».";
I18N.pt["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "Os feriados são considerados assim que for escolhida uma região em «Editar hotel».";
I18N.tr["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "“Oteli düzenle” bölümünde bir tatil bölgesi seçildiğinde resmî tatiller dikkate alınır.";
I18N.ja["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "「ホテルを編集」で祝日地域を選ぶと祝日が反映されます。";
I18N.zh["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "在“编辑酒店”中选择节假日地区后即会计入节假日。";
I18N.ar["Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist."] = "تُحتسب العطل الرسمية بعد اختيار منطقة العطل في «تعديل الفندق».";
I18N.en["Feiertagsstunden (h)"] = "Holiday hours (h)";
I18N.fr["Feiertagsstunden (h)"] = "Heures fériées (h)";
I18N.it["Feiertagsstunden (h)"] = "Ore festive (h)";
I18N.es["Feiertagsstunden (h)"] = "Horas en festivo (h)";
I18N.pt["Feiertagsstunden (h)"] = "Horas em feriado (h)";
I18N.tr["Feiertagsstunden (h)"] = "Tatil saatleri (sa)";
I18N.ja["Feiertagsstunden (h)"] = "祝日時間（時間）";
I18N.zh["Feiertagsstunden (h)"] = "节假日工时（小时）";
I18N.ar["Feiertagsstunden (h)"] = "ساعات العطل (س)";
I18N.en["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "For live use, Ouverture must be approved by Mews as a partner. Until then, please use the test environment or the webhook.";
I18N.fr["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "Pour la production, Ouverture doit être homologué comme partenaire par Mews. D’ici là, utilise l’environnement de test ou le webhook.";
I18N.it["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "Per l’uso in produzione Ouverture deve essere abilitato da Mews come partner. Fino ad allora usa l’ambiente di test o il webhook.";
I18N.es["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "Para el uso en producción, Mews debe habilitar a Ouverture como socio. Hasta entonces, usa el entorno de pruebas o el webhook.";
I18N.pt["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "Para o uso em produção, o Ouverture tem de ser aprovado pelo Mews como parceiro. Até lá, usa o ambiente de teste ou o webhook.";
I18N.tr["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "Canlı kullanım için Ouverture’ın Mews tarafından iş ortağı olarak onaylanması gerekir. O zamana kadar test ortamını veya webhook’u kullan.";
I18N.ja["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "本番利用には、Ouverture が Mews のパートナーとして承認される必要があります。それまではテスト環境または Webhook をご利用ください。";
I18N.zh["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "正式使用前，Ouverture 需获得 Mews 的合作伙伴认证。在此之前请使用测试环境或 Webhook。";
I18N.ar["Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen."] = "للاستخدام الفعلي يجب أن يعتمد Mews شركة Ouverture كشريك. حتى ذلك الحين استخدم بيئة الاختبار أو الـ Webhook.";
I18N.en["Ganzes Hotel"] = "Whole hotel";
I18N.fr["Ganzes Hotel"] = "Tout l’hôtel";
I18N.it["Ganzes Hotel"] = "Tutto l’hotel";
I18N.es["Ganzes Hotel"] = "Todo el hotel";
I18N.pt["Ganzes Hotel"] = "Hotel inteiro";
I18N.tr["Ganzes Hotel"] = "Tüm otel";
I18N.ja["Ganzes Hotel"] = "ホテル全体";
I18N.zh["Ganzes Hotel"] = "全酒店";
I18N.ar["Ganzes Hotel"] = "الفندق كله";
I18N.en["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "Actual = clocked time minus breaks, in this device’s local time.";
I18N.fr["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "Réel = temps pointé moins les pauses, à l’heure locale de cet appareil.";
I18N.it["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "Effettive = tempo timbrato meno le pause, nell’ora locale di questo dispositivo.";
I18N.es["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "Real = tiempo fichado menos pausas, en la hora local de este dispositivo.";
I18N.pt["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "Real = tempo registado menos pausas, na hora local deste dispositivo.";
I18N.tr["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "Gerçekleşen = kaydedilen süre eksi molalar, bu cihazın yerel saatiyle.";
I18N.ja["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "実績 = 打刻時間から休憩を引いた時間（この端末の現地時刻）。";
I18N.zh["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "实际 = 打卡时长减去休息（按本设备当地时间）。";
I18N.ar["Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts."] = "الفعلي = الوقت المسجّل ناقص الاستراحات، بالتوقيت المحلي لهذا الجهاز.";
I18N.en["Jetzt abgleichen"] = "Sync now";
I18N.fr["Jetzt abgleichen"] = "Synchroniser";
I18N.it["Jetzt abgleichen"] = "Sincronizza ora";
I18N.es["Jetzt abgleichen"] = "Sincronizar ahora";
I18N.pt["Jetzt abgleichen"] = "Sincronizar agora";
I18N.tr["Jetzt abgleichen"] = "Şimdi eşitle";
I18N.ja["Jetzt abgleichen"] = "今すぐ同期";
I18N.zh["Jetzt abgleichen"] = "立即同步";
I18N.ar["Jetzt abgleichen"] = "مزامنة الآن";
I18N.en["Keine"] = "None";
I18N.fr["Keine"] = "Aucune";
I18N.it["Keine"] = "Nessuna";
I18N.es["Keine"] = "Ninguna";
I18N.pt["Keine"] = "Nenhuma";
I18N.tr["Keine"] = "Yok";
I18N.ja["Keine"] = "なし";
I18N.zh["Keine"] = "无";
I18N.ar["Keine"] = "لا شيء";
I18N.en["Keine Anbindung"] = "No connection";
I18N.fr["Keine Anbindung"] = "Aucune connexion";
I18N.it["Keine Anbindung"] = "Nessun collegamento";
I18N.es["Keine Anbindung"] = "Sin conexión";
I18N.pt["Keine Anbindung"] = "Sem ligação";
I18N.tr["Keine Anbindung"] = "Bağlantı yok";
I18N.ja["Keine Anbindung"] = "連携なし";
I18N.zh["Keine Anbindung"] = "不对接";
I18N.ar["Keine Anbindung"] = "بلا ربط";
I18N.en["Kopieren"] = "Copy";
I18N.fr["Kopieren"] = "Copier";
I18N.it["Kopieren"] = "Copia";
I18N.es["Kopieren"] = "Copiar";
I18N.pt["Kopieren"] = "Copiar";
I18N.tr["Kopieren"] = "Kopyala";
I18N.ja["Kopieren"] = "コピー";
I18N.zh["Kopieren"] = "复制";
I18N.ar["Kopieren"] = "نسخ";
I18N.en["Kopiert."] = "Copied.";
I18N.fr["Kopiert."] = "Copié.";
I18N.it["Kopiert."] = "Copiato.";
I18N.es["Kopiert."] = "Copiado.";
I18N.pt["Kopiert."] = "Copiado.";
I18N.tr["Kopiert."] = "Kopyalandı.";
I18N.ja["Kopiert."] = "コピーしました。";
I18N.zh["Kopiert."] = "已复制。";
I18N.ar["Kopiert."] = "تم النسخ.";
I18N.en["Letzter Abgleich: {0}"] = "Last sync: {0}";
I18N.fr["Letzter Abgleich: {0}"] = "Dernière synchro : {0}";
I18N.it["Letzter Abgleich: {0}"] = "Ultima sincronizzazione: {0}";
I18N.es["Letzter Abgleich: {0}"] = "Última sincronización: {0}";
I18N.pt["Letzter Abgleich: {0}"] = "Última sincronização: {0}";
I18N.tr["Letzter Abgleich: {0}"] = "Son eşitleme: {0}";
I18N.ja["Letzter Abgleich: {0}"] = "最終同期：{0}";
I18N.zh["Letzter Abgleich: {0}"] = "上次同步：{0}";
I18N.ar["Letzter Abgleich: {0}"] = "آخر مزامنة: {0}";
I18N.en["Mews-Testumgebung"] = "Mews test environment";
I18N.fr["Mews-Testumgebung"] = "Environnement de test Mews";
I18N.it["Mews-Testumgebung"] = "Ambiente di test Mews";
I18N.es["Mews-Testumgebung"] = "Entorno de pruebas de Mews";
I18N.pt["Mews-Testumgebung"] = "Ambiente de teste do Mews";
I18N.tr["Mews-Testumgebung"] = "Mews test ortamı";
I18N.ja["Mews-Testumgebung"] = "Mews テスト環境";
I18N.zh["Mews-Testumgebung"] = "Mews 测试环境";
I18N.ar["Mews-Testumgebung"] = "بيئة اختبار Mews";
I18N.en["Nachricht an {0} …"] = "Message to {0} …";
I18N.fr["Nachricht an {0} …"] = "Message à {0} …";
I18N.it["Nachricht an {0} …"] = "Messaggio a {0} …";
I18N.es["Nachricht an {0} …"] = "Mensaje a {0} …";
I18N.pt["Nachricht an {0} …"] = "Mensagem para {0} …";
I18N.tr["Nachricht an {0} …"] = "{0} için mesaj …";
I18N.ja["Nachricht an {0} …"] = "{0} へのメッセージ…";
I18N.zh["Nachricht an {0} …"] = "发给 {0} 的消息…";
I18N.ar["Nachricht an {0} …"] = "رسالة إلى {0} …";
I18N.en["Nachricht löschen?"] = "Delete message?";
I18N.fr["Nachricht löschen?"] = "Supprimer le message ?";
I18N.it["Nachricht löschen?"] = "Eliminare il messaggio?";
I18N.es["Nachricht löschen?"] = "¿Eliminar el mensaje?";
I18N.pt["Nachricht löschen?"] = "Eliminar a mensagem?";
I18N.tr["Nachricht löschen?"] = "Mesaj silinsin mi?";
I18N.ja["Nachricht löschen?"] = "メッセージを削除しますか？";
I18N.zh["Nachricht löschen?"] = "删除这条消息？";
I18N.ar["Nachricht löschen?"] = "حذف الرسالة؟";
I18N.en["Neue Adresse erzeugen"] = "Create new address";
I18N.fr["Neue Adresse erzeugen"] = "Générer une nouvelle adresse";
I18N.it["Neue Adresse erzeugen"] = "Genera nuovo indirizzo";
I18N.es["Neue Adresse erzeugen"] = "Crear nueva dirección";
I18N.pt["Neue Adresse erzeugen"] = "Criar novo endereço";
I18N.tr["Neue Adresse erzeugen"] = "Yeni adres oluştur";
I18N.ja["Neue Adresse erzeugen"] = "新しいアドレスを作成";
I18N.zh["Neue Adresse erzeugen"] = "生成新地址";
I18N.ar["Neue Adresse erzeugen"] = "إنشاء عنوان جديد";
I18N.en["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "Create a new address? The old one will stop working.";
I18N.fr["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "Générer une nouvelle adresse ? L’ancienne ne fonctionnera plus.";
I18N.it["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "Generare un nuovo indirizzo? Quello vecchio non funzionerà più.";
I18N.es["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "¿Crear una nueva dirección? La antigua dejará de funcionar.";
I18N.pt["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "Criar um novo endereço? O antigo deixa de funcionar.";
I18N.tr["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "Yeni adres oluşturulsun mu? Eskisi artık çalışmaz.";
I18N.ja["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "新しいアドレスを作成しますか？古いアドレスは使えなくなります。";
I18N.zh["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "生成新地址？旧地址将失效。";
I18N.ar["Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."] = "إنشاء عنوان جديد؟ سيتوقف العنوان القديم عن العمل.";
I18N.en["Neue Adresse erzeugt."] = "New address created.";
I18N.fr["Neue Adresse erzeugt."] = "Nouvelle adresse générée.";
I18N.it["Neue Adresse erzeugt."] = "Nuovo indirizzo generato.";
I18N.es["Neue Adresse erzeugt."] = "Nueva dirección creada.";
I18N.pt["Neue Adresse erzeugt."] = "Novo endereço criado.";
I18N.tr["Neue Adresse erzeugt."] = "Yeni adres oluşturuldu.";
I18N.ja["Neue Adresse erzeugt."] = "新しいアドレスを作成しました。";
I18N.zh["Neue Adresse erzeugt."] = "已生成新地址。";
I18N.ar["Neue Adresse erzeugt."] = "تم إنشاء عنوان جديد.";
I18N.en["Nicht verbunden"] = "Not connected";
I18N.fr["Nicht verbunden"] = "Non connecté";
I18N.it["Nicht verbunden"] = "Non collegato";
I18N.es["Nicht verbunden"] = "No conectado";
I18N.pt["Nicht verbunden"] = "Não ligado";
I18N.tr["Nicht verbunden"] = "Bağlı değil";
I18N.ja["Nicht verbunden"] = "未連携";
I18N.zh["Nicht verbunden"] = "未对接";
I18N.ar["Nicht verbunden"] = "غير مرتبط";
I18N.en["Noch keine Nachrichten. Schreib die erste!"] = "No messages yet. Write the first one!";
I18N.fr["Noch keine Nachrichten. Schreib die erste!"] = "Pas encore de messages. Écris le premier !";
I18N.it["Noch keine Nachrichten. Schreib die erste!"] = "Ancora nessun messaggio. Scrivi il primo!";
I18N.es["Noch keine Nachrichten. Schreib die erste!"] = "Todavía no hay mensajes. ¡Escribe el primero!";
I18N.pt["Noch keine Nachrichten. Schreib die erste!"] = "Ainda não há mensagens. Escreve a primeira!";
I18N.tr["Noch keine Nachrichten. Schreib die erste!"] = "Henüz mesaj yok. İlkini sen yaz!";
I18N.ja["Noch keine Nachrichten. Schreib die erste!"] = "まだメッセージはありません。最初のメッセージを送りましょう！";
I18N.zh["Noch keine Nachrichten. Schreib die erste!"] = "还没有消息，来发第一条吧！";
I18N.ar["Noch keine Nachrichten. Schreib die erste!"] = "لا توجد رسائل بعد. اكتب الأولى!";
I18N.en["PMS-Anbindung"] = "PMS connection";
I18N.fr["PMS-Anbindung"] = "Connexion PMS";
I18N.it["PMS-Anbindung"] = "Collegamento PMS";
I18N.es["PMS-Anbindung"] = "Conexión con el PMS";
I18N.pt["PMS-Anbindung"] = "Ligação ao PMS";
I18N.tr["PMS-Anbindung"] = "PMS bağlantısı";
I18N.ja["PMS-Anbindung"] = "PMS 連携";
I18N.zh["PMS-Anbindung"] = "PMS 对接";
I18N.ar["PMS-Anbindung"] = "ربط نظام إدارة الفندق";
I18N.en["Produktiv"] = "Live";
I18N.fr["Produktiv"] = "Production";
I18N.it["Produktiv"] = "Produzione";
I18N.es["Produktiv"] = "Producción";
I18N.pt["Produktiv"] = "Produção";
I18N.tr["Produktiv"] = "Canlı";
I18N.ja["Produktiv"] = "本番";
I18N.zh["Produktiv"] = "正式环境";
I18N.ar["Produktiv"] = "الإنتاج";
I18N.en["System"] = "System";
I18N.fr["System"] = "Système";
I18N.it["System"] = "Sistema";
I18N.es["System"] = "Sistema";
I18N.pt["System"] = "Sistema";
I18N.tr["System"] = "Sistem";
I18N.ja["System"] = "システム";
I18N.zh["System"] = "系统";
I18N.ar["System"] = "النظام";
I18N.en["Umgebung"] = "Environment";
I18N.fr["Umgebung"] = "Environnement";
I18N.it["Umgebung"] = "Ambiente";
I18N.es["Umgebung"] = "Entorno";
I18N.pt["Umgebung"] = "Ambiente";
I18N.tr["Umgebung"] = "Ortam";
I18N.ja["Umgebung"] = "環境";
I18N.zh["Umgebung"] = "环境";
I18N.ar["Umgebung"] = "البيئة";
I18N.en["Unbekannte Zimmer: {0}"] = "Unknown rooms: {0}";
I18N.fr["Unbekannte Zimmer: {0}"] = "Chambres inconnues : {0}";
I18N.it["Unbekannte Zimmer: {0}"] = "Camere sconosciute: {0}";
I18N.es["Unbekannte Zimmer: {0}"] = "Habitaciones desconocidas: {0}";
I18N.pt["Unbekannte Zimmer: {0}"] = "Quartos desconhecidos: {0}";
I18N.tr["Unbekannte Zimmer: {0}"] = "Bilinmeyen odalar: {0}";
I18N.ja["Unbekannte Zimmer: {0}"] = "不明な客室：{0}";
I18N.zh["Unbekannte Zimmer: {0}"] = "未知房间：{0}";
I18N.ar["Unbekannte Zimmer: {0}"] = "غرف غير معروفة: {0}";
I18N.en["Webhook (anderes PMS)"] = "Webhook (other PMS)";
I18N.fr["Webhook (anderes PMS)"] = "Webhook (autre PMS)";
I18N.it["Webhook (anderes PMS)"] = "Webhook (altro PMS)";
I18N.es["Webhook (anderes PMS)"] = "Webhook (otro PMS)";
I18N.pt["Webhook (anderes PMS)"] = "Webhook (outro PMS)";
I18N.tr["Webhook (anderes PMS)"] = "Webhook (başka PMS)";
I18N.ja["Webhook (anderes PMS)"] = "Webhook（その他の PMS）";
I18N.zh["Webhook (anderes PMS)"] = "Webhook（其他 PMS）";
I18N.ar["Webhook (anderes PMS)"] = "Webhook (نظام آخر)";
I18N.en["Webhook-Adresse (geheim halten)"] = "Webhook address (keep secret)";
I18N.fr["Webhook-Adresse (geheim halten)"] = "Adresse du webhook (à garder secrète)";
I18N.it["Webhook-Adresse (geheim halten)"] = "Indirizzo webhook (da tenere segreto)";
I18N.es["Webhook-Adresse (geheim halten)"] = "Dirección del webhook (mantener en secreto)";
I18N.pt["Webhook-Adresse (geheim halten)"] = "Endereço do webhook (manter em segredo)";
I18N.tr["Webhook-Adresse (geheim halten)"] = "Webhook adresi (gizli tut)";
I18N.ja["Webhook-Adresse (geheim halten)"] = "Webhook アドレス（秘密にしてください）";
I18N.zh["Webhook-Adresse (geheim halten)"] = "Webhook 地址（请保密）";
I18N.ar["Webhook-Adresse (geheim halten)"] = "عنوان الـ Webhook (احتفظ به سرًا)";
I18N.en["Zimmerstatus nach Mews zurückschreiben"] = "Write room status back to Mews";
I18N.fr["Zimmerstatus nach Mews zurückschreiben"] = "Renvoyer le statut des chambres vers Mews";
I18N.it["Zimmerstatus nach Mews zurückschreiben"] = "Riscrivi lo stato camere in Mews";
I18N.es["Zimmerstatus nach Mews zurückschreiben"] = "Devolver el estado de las habitaciones a Mews";
I18N.pt["Zimmerstatus nach Mews zurückschreiben"] = "Enviar o estado dos quartos de volta ao Mews";
I18N.tr["Zimmerstatus nach Mews zurückschreiben"] = "Oda durumunu Mews’e geri yaz";
I18N.ja["Zimmerstatus nach Mews zurückschreiben"] = "客室状態を Mews に書き戻す";
I18N.zh["Zimmerstatus nach Mews zurückschreiben"] = "将房态回写到 Mews";
I18N.ar["Zimmerstatus nach Mews zurückschreiben"] = "إعادة كتابة حالة الغرف إلى Mews";
I18N.en["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "Sync room status and occupancy automatically with the hotel system (PMS). Mews connects directly, other systems (e.g. Protel, Apaleo, Opera) via a webhook – or by file import.";
I18N.fr["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "Synchronise automatiquement le statut et l’occupation des chambres avec le logiciel hôtelier (PMS). Mews se connecte directement, les autres systèmes (p. ex. Protel, Apaleo, Opera) via un webhook – ou par import de fichier.";
I18N.it["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "Sincronizza automaticamente stato e occupazione delle camere con il gestionale (PMS). Mews si collega direttamente, gli altri sistemi (es. Protel, Apaleo, Opera) tramite webhook – oppure con l’importazione di file.";
I18N.es["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "Sincroniza automáticamente el estado y la ocupación de las habitaciones con el sistema del hotel (PMS). Mews se conecta directamente; otros sistemas (p. ej. Protel, Apaleo, Opera), mediante un webhook o importando un archivo.";
I18N.pt["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "Sincroniza automaticamente o estado e a ocupação dos quartos com o sistema do hotel (PMS). O Mews liga-se diretamente; outros sistemas (p. ex. Protel, Apaleo, Opera) por webhook – ou por importação de ficheiro.";
I18N.tr["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "Oda durumunu ve doluluğu otel yazılımıyla (PMS) otomatik eşitle. Mews doğrudan bağlanır, diğer sistemler (ör. Protel, Apaleo, Opera) webhook ile – ya da dosya içe aktararak.";
I18N.ja["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "客室状態と在室状況をホテルシステム（PMS）と自動同期します。Mews は直接連携、その他のシステム（Protel、Apaleo、Opera など）は Webhook またはファイル取り込みで連携します。";
I18N.zh["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "自动与酒店管理系统（PMS）同步房态和入住状态。Mews 直接对接，其他系统（如 Protel、Apaleo、Opera）通过 Webhook 或文件导入。";
I18N.ar["Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import."] = "مزامنة حالة الغرف والإشغال تلقائيًا مع نظام إدارة الفندق (PMS). يرتبط Mews مباشرة، والأنظمة الأخرى (مثل Protel وApaleo وOpera) عبر Webhook – أو باستيراد ملف.";
I18N.en["Zuletzt per Webhook: {0} Zimmer geändert."] = "Last via webhook: {0} rooms changed.";
I18N.fr["Zuletzt per Webhook: {0} Zimmer geändert."] = "Dernière fois par webhook : {0} chambres modifiées.";
I18N.it["Zuletzt per Webhook: {0} Zimmer geändert."] = "Ultimo tramite webhook: {0} camere modificate.";
I18N.es["Zuletzt per Webhook: {0} Zimmer geändert."] = "Última vez por webhook: {0} habitaciones cambiadas.";
I18N.pt["Zuletzt per Webhook: {0} Zimmer geändert."] = "Última vez por webhook: {0} quartos alterados.";
I18N.tr["Zuletzt per Webhook: {0} Zimmer geändert."] = "Son webhook: {0} oda değişti.";
I18N.ja["Zuletzt per Webhook: {0} Zimmer geändert."] = "前回（Webhook）：{0} 室を変更。";
I18N.zh["Zuletzt per Webhook: {0} Zimmer geändert."] = "上次通过 Webhook：更改 {0} 间。";
I18N.ar["Zuletzt per Webhook: {0} Zimmer geändert."] = "آخر مرة عبر Webhook: تم تغيير {0} غرفة.";
I18N.en["Zuletzt: {0} Zimmer neu, {1} geändert."] = "Last time: {0} rooms new, {1} changed.";
I18N.fr["Zuletzt: {0} Zimmer neu, {1} geändert."] = "Dernière fois : {0} chambres nouvelles, {1} modifiées.";
I18N.it["Zuletzt: {0} Zimmer neu, {1} geändert."] = "Ultima volta: {0} camere nuove, {1} modificate.";
I18N.es["Zuletzt: {0} Zimmer neu, {1} geändert."] = "Última vez: {0} habitaciones nuevas, {1} cambiadas.";
I18N.pt["Zuletzt: {0} Zimmer neu, {1} geändert."] = "Última vez: {0} quartos novos, {1} alterados.";
I18N.tr["Zuletzt: {0} Zimmer neu, {1} geändert."] = "Son: {0} yeni oda, {1} değişiklik.";
I18N.ja["Zuletzt: {0} Zimmer neu, {1} geändert."] = "前回：新規 {0} 室、変更 {1} 室。";
I18N.zh["Zuletzt: {0} Zimmer neu, {1} geändert."] = "上次：新增 {0} 间，更改 {1} 间。";
I18N.ar["Zuletzt: {0} Zimmer neu, {1} geändert."] = "آخر مرة: {0} غرف جديدة، {1} تم تغييرها.";
I18N.en["gespeichert – nur zum Ändern neu eingeben"] = "saved – only re-enter to change it";
I18N.fr["gespeichert – nur zum Ändern neu eingeben"] = "enregistré – à ressaisir seulement pour le modifier";
I18N.it["gespeichert – nur zum Ändern neu eingeben"] = "salvato – reinseriscilo solo per cambiarlo";
I18N.es["gespeichert – nur zum Ändern neu eingeben"] = "guardado – vuelve a introducirlo solo para cambiarlo";
I18N.pt["gespeichert – nur zum Ändern neu eingeben"] = "guardado – volta a introduzir só para alterar";
I18N.tr["gespeichert – nur zum Ändern neu eingeben"] = "kaydedildi – yalnızca değiştirmek için yeniden gir";
I18N.ja["gespeichert – nur zum Ändern neu eingeben"] = "保存済み – 変更する場合のみ再入力";
I18N.zh["gespeichert – nur zum Ändern neu eingeben"] = "已保存 – 仅在需要更改时重新输入";
I18N.ar["gespeichert – nur zum Ändern neu eingeben"] = "تم الحفظ – أعد الإدخال فقط للتغيير";
I18N.en["keine in diesem Monat"] = "none this month";
I18N.fr["keine in diesem Monat"] = "aucun ce mois-ci";
I18N.it["keine in diesem Monat"] = "nessuna questo mese";
I18N.es["keine in diesem Monat"] = "ninguno este mes";
I18N.pt["keine in diesem Monat"] = "nenhum este mês";
I18N.tr["keine in diesem Monat"] = "bu ay yok";
I18N.ja["keine in diesem Monat"] = "今月はなし";
I18N.zh["keine in diesem Monat"] = "本月没有";
I18N.ar["keine in diesem Monat"] = "لا توجد هذا الشهر";
I18N.en["{0} Zimmer aktualisiert."] = "{0} rooms updated.";
I18N.fr["{0} Zimmer aktualisiert."] = "{0} chambres mises à jour.";
I18N.it["{0} Zimmer aktualisiert."] = "{0} camere aggiornate.";
I18N.es["{0} Zimmer aktualisiert."] = "{0} habitaciones actualizadas.";
I18N.pt["{0} Zimmer aktualisiert."] = "{0} quartos atualizados.";
I18N.tr["{0} Zimmer aktualisiert."] = "{0} oda güncellendi.";
I18N.ja["{0} Zimmer aktualisiert."] = "{0} 室を更新しました。";
I18N.zh["{0} Zimmer aktualisiert."] = "已更新 {0} 间客房。";
I18N.ar["{0} Zimmer aktualisiert."] = "تم تحديث {0} غرفة.";
I18N.en["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Use the public Mews test hotel (sample data, no key of your own)";
I18N.fr["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Utiliser l’hôtel de test public de Mews (données d’exemple, sans clé propre)";
I18N.it["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Usa l’hotel di test pubblico di Mews (dati di esempio, senza chiave propria)";
I18N.es["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Usar el hotel de pruebas público de Mews (datos de ejemplo, sin clave propia)";
I18N.pt["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Usar o hotel de teste público do Mews (dados de exemplo, sem chave própria)";
I18N.tr["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Herkese açık Mews test otelini kullan (örnek veriler, kendi anahtarın olmadan)";
I18N.ja["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "Mews の公開テストホテルを使う（サンプルデータ、自分のキー不要）";
I18N.zh["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "使用 Mews 公共测试酒店（示例数据，无需自己的密钥）";
I18N.ar["Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"] = "استخدام فندق الاختبار العام من Mews (بيانات تجريبية، دون مفتاح خاص)";

// 021: Übersetzen, QR-/Offline-Stempeln, Wartung, Bedarf, HACCP, Unterweisungen, Fundsachen, Lager, Kennzahlen
I18N.en["Meldungen"] = "Reports";
I18N.fr["Meldungen"] = "Signalements";
I18N.it["Meldungen"] = "Segnalazioni";
I18N.es["Meldungen"] = "Avisos";
I18N.pt["Meldungen"] = "Ocorrências";
I18N.tr["Meldungen"] = "Bildirimler";
I18N.ja["Meldungen"] = "報告";
I18N.zh["Meldungen"] = "报修与需求";
I18N.ar["Meldungen"] = "البلاغات";
I18N.en["Kennzahlen"] = "Key figures";
I18N.fr["Kennzahlen"] = "Indicateurs";
I18N.it["Kennzahlen"] = "Indicatori";
I18N.es["Kennzahlen"] = "Indicadores";
I18N.pt["Kennzahlen"] = "Indicadores";
I18N.tr["Kennzahlen"] = "Göstergeler";
I18N.ja["Kennzahlen"] = "指標";
I18N.zh["Kennzahlen"] = "关键指标";
I18N.ar["Kennzahlen"] = "المؤشرات";
I18N.en["Lager"] = "Stock";
I18N.fr["Lager"] = "Stock";
I18N.it["Lager"] = "Magazzino";
I18N.es["Lager"] = "Almacén";
I18N.pt["Lager"] = "Stock";
I18N.tr["Lager"] = "Depo";
I18N.ja["Lager"] = "在庫";
I18N.zh["Lager"] = "库存";
I18N.ar["Lager"] = "المخزون";
I18N.en["Fundsachen"] = "Lost & found";
I18N.fr["Fundsachen"] = "Objets trouvés";
I18N.it["Fundsachen"] = "Oggetti smarriti";
I18N.es["Fundsachen"] = "Objetos perdidos";
I18N.pt["Fundsachen"] = "Perdidos e achados";
I18N.tr["Fundsachen"] = "Kayıp eşya";
I18N.ja["Fundsachen"] = "遺失物";
I18N.zh["Fundsachen"] = "失物招领";
I18N.ar["Fundsachen"] = "المفقودات";
I18N.en["Unterweisungen"] = "Briefings";
I18N.fr["Unterweisungen"] = "Consignes";
I18N.it["Unterweisungen"] = "Istruzioni";
I18N.es["Unterweisungen"] = "Instrucciones";
I18N.pt["Unterweisungen"] = "Instruções";
I18N.tr["Unterweisungen"] = "Talimatlar";
I18N.ja["Unterweisungen"] = "指導・研修";
I18N.zh["Unterweisungen"] = "培训须知";
I18N.ar["Unterweisungen"] = "التعليمات";
I18N.en["Projekt"] = "Project";
I18N.fr["Projekt"] = "Projet";
I18N.it["Projekt"] = "Progetto";
I18N.es["Projekt"] = "Proyecto";
I18N.pt["Projekt"] = "Projeto";
I18N.tr["Projekt"] = "Proje";
I18N.ja["Projekt"] = "プロジェクト";
I18N.zh["Projekt"] = "项目";
I18N.ar["Projekt"] = "المشروع";
I18N.en["Betrieb"] = "Operations";
I18N.fr["Betrieb"] = "Exploitation";
I18N.it["Betrieb"] = "Operatività";
I18N.es["Betrieb"] = "Operación";
I18N.pt["Betrieb"] = "Operação";
I18N.tr["Betrieb"] = "Operasyon";
I18N.ja["Betrieb"] = "運営";
I18N.zh["Betrieb"] = "运营";
I18N.ar["Betrieb"] = "التشغيل";
I18N.en["Aufbewahrt"] = "Stored";
I18N.fr["Aufbewahrt"] = "Conservé";
I18N.it["Aufbewahrt"] = "Custodito";
I18N.es["Aufbewahrt"] = "Guardado";
I18N.pt["Aufbewahrt"] = "Guardado";
I18N.tr["Aufbewahrt"] = "Saklanıyor";
I18N.ja["Aufbewahrt"] = "保管中";
I18N.zh["Aufbewahrt"] = "保管中";
I18N.ar["Aufbewahrt"] = "محفوظ";
I18N.en["Zurückgegeben"] = "Returned";
I18N.fr["Zurückgegeben"] = "Restitué";
I18N.it["Zurückgegeben"] = "Restituito";
I18N.es["Zurückgegeben"] = "Devuelto";
I18N.pt["Zurückgegeben"] = "Devolvido";
I18N.tr["Zurückgegeben"] = "İade edildi";
I18N.ja["Zurückgegeben"] = "返却済み";
I18N.zh["Zurückgegeben"] = "已归还";
I18N.ar["Zurückgegeben"] = "تمت الإعادة";
I18N.en["Entsorgt"] = "Disposed of";
I18N.fr["Entsorgt"] = "Éliminé";
I18N.it["Entsorgt"] = "Smaltito";
I18N.es["Entsorgt"] = "Desechado";
I18N.pt["Entsorgt"] = "Descartado";
I18N.tr["Entsorgt"] = "İmha edildi";
I18N.ja["Entsorgt"] = "廃棄済み";
I18N.zh["Entsorgt"] = "已处理";
I18N.ar["Entsorgt"] = "تم التخلص منه";
I18N.en["Wartung"] = "Maintenance";
I18N.fr["Wartung"] = "Maintenance";
I18N.it["Wartung"] = "Manutenzione";
I18N.es["Wartung"] = "Mantenimiento";
I18N.pt["Wartung"] = "Manutenção";
I18N.tr["Wartung"] = "Bakım";
I18N.ja["Wartung"] = "保守";
I18N.zh["Wartung"] = "维护";
I18N.ar["Wartung"] = "صيانة";
I18N.en["Tage"] = "days";
I18N.fr["Tage"] = "jours";
I18N.it["Tage"] = "giorni";
I18N.es["Tage"] = "días";
I18N.pt["Tage"] = "dias";
I18N.tr["Tage"] = "gün";
I18N.ja["Tage"] = "日";
I18N.zh["Tage"] = "天";
I18N.ar["Tage"] = "أيام";
I18N.en["Wochen"] = "weeks";
I18N.fr["Wochen"] = "semaines";
I18N.it["Wochen"] = "settimane";
I18N.es["Wochen"] = "semanas";
I18N.pt["Wochen"] = "semanas";
I18N.tr["Wochen"] = "hafta";
I18N.ja["Wochen"] = "週";
I18N.zh["Wochen"] = "周";
I18N.ar["Wochen"] = "أسابيع";
I18N.en["Monate"] = "months";
I18N.fr["Monate"] = "mois";
I18N.it["Monate"] = "mesi";
I18N.es["Monate"] = "meses";
I18N.pt["Monate"] = "meses";
I18N.tr["Monate"] = "ay";
I18N.ja["Monate"] = "か月";
I18N.zh["Monate"] = "个月";
I18N.ar["Monate"] = "أشهر";
I18N.en["Jahre"] = "years";
I18N.fr["Jahre"] = "ans";
I18N.it["Jahre"] = "anni";
I18N.es["Jahre"] = "años";
I18N.pt["Jahre"] = "anos";
I18N.tr["Jahre"] = "yıl";
I18N.ja["Jahre"] = "年";
I18N.zh["Jahre"] = "年";
I18N.ar["Jahre"] = "سنوات";
I18N.en["Gästewunsch"] = "Guest request";
I18N.fr["Gästewunsch"] = "Demande client";
I18N.it["Gästewunsch"] = "Richiesta ospite";
I18N.es["Gästewunsch"] = "Petición del huésped";
I18N.pt["Gästewunsch"] = "Pedido de hóspede";
I18N.tr["Gästewunsch"] = "Misafir isteği";
I18N.ja["Gästewunsch"] = "ゲストのリクエスト";
I18N.zh["Gästewunsch"] = "客人需求";
I18N.ar["Gästewunsch"] = "طلب ضيف";
I18N.en["Mangel"] = "Defect";
I18N.fr["Mangel"] = "Panne";
I18N.it["Mangel"] = "Guasto";
I18N.es["Mangel"] = "Avería";
I18N.pt["Mangel"] = "Avaria";
I18N.tr["Mangel"] = "Arıza";
I18N.ja["Mangel"] = "不具合";
I18N.zh["Mangel"] = "故障";
I18N.ar["Mangel"] = "عطل";
I18N.en["Mängel"] = "Defects";
I18N.fr["Mängel"] = "Pannes";
I18N.it["Mängel"] = "Guasti";
I18N.es["Mängel"] = "Averías";
I18N.pt["Mängel"] = "Avarias";
I18N.tr["Mängel"] = "Arızalar";
I18N.ja["Mängel"] = "不具合";
I18N.zh["Mängel"] = "故障";
I18N.ar["Mängel"] = "الأعطال";
I18N.en["Wartungsplan"] = "Maintenance plan";
I18N.fr["Wartungsplan"] = "Plan de maintenance";
I18N.it["Wartungsplan"] = "Piano di manutenzione";
I18N.es["Wartungsplan"] = "Plan de mantenimiento";
I18N.pt["Wartungsplan"] = "Plano de manutenção";
I18N.tr["Wartungsplan"] = "Bakım planı";
I18N.ja["Wartungsplan"] = "保守計画";
I18N.zh["Wartungsplan"] = "维护计划";
I18N.ar["Wartungsplan"] = "خطة الصيانة";
I18N.en["belegte Zimmer"] = "occupied rooms";
I18N.fr["belegte Zimmer"] = "chambres occupées";
I18N.it["belegte Zimmer"] = "camere occupate";
I18N.es["belegte Zimmer"] = "habitaciones ocupadas";
I18N.pt["belegte Zimmer"] = "quartos ocupados";
I18N.tr["belegte Zimmer"] = "dolu oda";
I18N.ja["belegte Zimmer"] = "在室客室";
I18N.zh["belegte Zimmer"] = "在住房间";
I18N.ar["belegte Zimmer"] = "غرف مشغولة";
I18N.en["Abreisen"] = "departures";
I18N.fr["Abreisen"] = "départs";
I18N.it["Abreisen"] = "partenze";
I18N.es["Abreisen"] = "salidas";
I18N.pt["Abreisen"] = "partidas";
I18N.tr["Abreisen"] = "çıkış";
I18N.ja["Abreisen"] = "チェックアウト";
I18N.zh["Abreisen"] = "离店";
I18N.ar["Abreisen"] = "مغادرات";
I18N.en["Anreisen"] = "arrivals";
I18N.fr["Anreisen"] = "arrivées";
I18N.it["Anreisen"] = "arrivi";
I18N.es["Anreisen"] = "llegadas";
I18N.pt["Anreisen"] = "chegadas";
I18N.tr["Anreisen"] = "giriş";
I18N.ja["Anreisen"] = "チェックイン";
I18N.zh["Anreisen"] = "到店";
I18N.ar["Anreisen"] = "وصولات";
I18N.en["Abreisen + Bleiber"] = "departures + stay-overs";
I18N.fr["Abreisen + Bleiber"] = "départs + recouches";
I18N.it["Abreisen + Bleiber"] = "partenze + fermate";
I18N.es["Abreisen + Bleiber"] = "salidas + estancias";
I18N.pt["Abreisen + Bleiber"] = "partidas + estadias";
I18N.tr["Abreisen + Bleiber"] = "çıkış + kalan";
I18N.ja["Abreisen + Bleiber"] = "チェックアウト + 連泊";
I18N.zh["Abreisen + Bleiber"] = "离店 + 续住";
I18N.ar["Abreisen + Bleiber"] = "مغادرات + مقيمون";
I18N.en["Letzte 7 Tage"] = "Last 7 days";
I18N.fr["Letzte 7 Tage"] = "7 derniers jours";
I18N.it["Letzte 7 Tage"] = "Ultimi 7 giorni";
I18N.es["Letzte 7 Tage"] = "Últimos 7 días";
I18N.pt["Letzte 7 Tage"] = "Últimos 7 dias";
I18N.tr["Letzte 7 Tage"] = "Son 7 gün";
I18N.ja["Letzte 7 Tage"] = "過去 7 日";
I18N.zh["Letzte 7 Tage"] = "最近 7 天";
I18N.ar["Letzte 7 Tage"] = "آخر 7 أيام";
I18N.en["Dieser Monat"] = "This month";
I18N.fr["Dieser Monat"] = "Ce mois-ci";
I18N.it["Dieser Monat"] = "Questo mese";
I18N.es["Dieser Monat"] = "Este mes";
I18N.pt["Dieser Monat"] = "Este mês";
I18N.tr["Dieser Monat"] = "Bu ay";
I18N.ja["Dieser Monat"] = "今月";
I18N.zh["Dieser Monat"] = "本月";
I18N.ar["Dieser Monat"] = "هذا الشهر";
I18N.en["Letzter Monat"] = "Last month";
I18N.fr["Letzter Monat"] = "Mois dernier";
I18N.it["Letzter Monat"] = "Mese scorso";
I18N.es["Letzter Monat"] = "Mes pasado";
I18N.pt["Letzter Monat"] = "Mês passado";
I18N.tr["Letzter Monat"] = "Geçen ay";
I18N.ja["Letzter Monat"] = "先月";
I18N.zh["Letzter Monat"] = "上月";
I18N.ar["Letzter Monat"] = "الشهر الماضي";
I18N.en["(leer lassen = kein Bedarf aus der Belegung)"] = "(leave empty = no need from occupancy)";
I18N.fr["(leer lassen = kein Bedarf aus der Belegung)"] = "(vide = pas de besoin calculé)";
I18N.it["(leer lassen = kein Bedarf aus der Belegung)"] = "(vuoto = nessun fabbisogno dall’occupazione)";
I18N.es["(leer lassen = kein Bedarf aus der Belegung)"] = "(vacío = sin necesidad según ocupación)";
I18N.pt["(leer lassen = kein Bedarf aus der Belegung)"] = "(vazio = sem necessidade pela ocupação)";
I18N.tr["(leer lassen = kein Bedarf aus der Belegung)"] = "(boş bırak = dolulukla ihtiyaç hesaplanmaz)";
I18N.ja["(leer lassen = kein Bedarf aus der Belegung)"] = "（空欄 = 在室状況から算出しない）";
I18N.zh["(leer lassen = kein Bedarf aus der Belegung)"] = "（留空 = 不按入住计算需求）";
I18N.ar["(leer lassen = kein Bedarf aus der Belegung)"] = "(اتركه فارغًا = بلا احتياج من الإشغال)";
I18N.en["+ Artikel"] = "+ Item";
I18N.fr["+ Artikel"] = "+ Article";
I18N.it["+ Artikel"] = "+ Articolo";
I18N.es["+ Artikel"] = "+ Artículo";
I18N.pt["+ Artikel"] = "+ Artigo";
I18N.tr["+ Artikel"] = "+ Ürün";
I18N.ja["+ Artikel"] = "+ 品目";
I18N.zh["+ Artikel"] = "+ 物品";
I18N.ar["+ Artikel"] = "+ صنف";
I18N.en["+ Fundsache erfassen"] = "+ Log found item";
I18N.fr["+ Fundsache erfassen"] = "+ Enregistrer un objet trouvé";
I18N.it["+ Fundsache erfassen"] = "+ Registra oggetto trovato";
I18N.es["+ Fundsache erfassen"] = "+ Registrar objeto encontrado";
I18N.pt["+ Fundsache erfassen"] = "+ Registar objeto encontrado";
I18N.tr["+ Fundsache erfassen"] = "+ Bulunan eşya kaydet";
I18N.ja["+ Fundsache erfassen"] = "+ 遺失物を登録";
I18N.zh["+ Fundsache erfassen"] = "+ 登记拾获物品";
I18N.ar["+ Fundsache erfassen"] = "+ تسجيل مفقود";
I18N.en["+ Messpunkt"] = "+ Measuring point";
I18N.fr["+ Messpunkt"] = "+ Point de mesure";
I18N.it["+ Messpunkt"] = "+ Punto di misura";
I18N.es["+ Messpunkt"] = "+ Punto de medición";
I18N.pt["+ Messpunkt"] = "+ Ponto de medição";
I18N.tr["+ Messpunkt"] = "+ Ölçüm noktası";
I18N.ja["+ Messpunkt"] = "+ 測定ポイント";
I18N.zh["+ Messpunkt"] = "+ 测量点";
I18N.ar["+ Messpunkt"] = "+ نقطة قياس";
I18N.en["+ Unterweisung"] = "+ Briefing";
I18N.fr["+ Unterweisung"] = "+ Consigne";
I18N.it["+ Unterweisung"] = "+ Istruzione";
I18N.es["+ Unterweisung"] = "+ Instrucción";
I18N.pt["+ Unterweisung"] = "+ Instrução";
I18N.tr["+ Unterweisung"] = "+ Talimat";
I18N.ja["+ Unterweisung"] = "+ 指導";
I18N.zh["+ Unterweisung"] = "+ 培训";
I18N.ar["+ Unterweisung"] = "+ تعليمات";
I18N.en["+ Wartung planen"] = "+ Plan maintenance";
I18N.fr["+ Wartung planen"] = "+ Planifier une maintenance";
I18N.it["+ Wartung planen"] = "+ Pianifica manutenzione";
I18N.es["+ Wartung planen"] = "+ Planificar mantenimiento";
I18N.pt["+ Wartung planen"] = "+ Planear manutenção";
I18N.tr["+ Wartung planen"] = "+ Bakım planla";
I18N.ja["+ Wartung planen"] = "+ 保守を計画";
I18N.zh["+ Wartung planen"] = "+ 计划维护";
I18N.ar["+ Wartung planen"] = "+ جدولة صيانة";
I18N.en["1 Person je"] = "1 person per";
I18N.fr["1 Person je"] = "1 personne pour";
I18N.it["1 Person je"] = "1 persona ogni";
I18N.es["1 Person je"] = "1 persona por cada";
I18N.pt["1 Person je"] = "1 pessoa por";
I18N.tr["1 Person je"] = "Kişi başına";
I18N.ja["1 Person je"] = "1 人あたり";
I18N.zh["1 Person je"] = "每人负责";
I18N.ar["1 Person je"] = "شخص واحد لكل";
I18N.en["Abweichung"] = "Deviation";
I18N.fr["Abweichung"] = "Écart";
I18N.it["Abweichung"] = "Scostamento";
I18N.es["Abweichung"] = "Desviación";
I18N.pt["Abweichung"] = "Desvio";
I18N.tr["Abweichung"] = "Sapma";
I18N.ja["Abweichung"] = "逸脱";
I18N.zh["Abweichung"] = "偏差";
I18N.ar["Abweichung"] = "انحراف";
I18N.en["Als entsorgt markieren?"] = "Mark as disposed of?";
I18N.fr["Als entsorgt markieren?"] = "Marquer comme éliminé ?";
I18N.it["Als entsorgt markieren?"] = "Segnare come smaltito?";
I18N.es["Als entsorgt markieren?"] = "¿Marcar como desechado?";
I18N.pt["Als entsorgt markieren?"] = "Marcar como descartado?";
I18N.tr["Als entsorgt markieren?"] = "İmha edildi olarak işaretlensin mi?";
I18N.ja["Als entsorgt markieren?"] = "廃棄済みにしますか？";
I18N.zh["Als entsorgt markieren?"] = "标记为已处理？";
I18N.ar["Als entsorgt markieren?"] = "وضع علامة «تم التخلص منه»؟";
I18N.en["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "Returned to whom? (name, room if any)";
I18N.fr["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "Restitué à qui ? (nom, chambre éventuelle)";
I18N.it["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "Restituito a chi? (nome, eventuale camera)";
I18N.es["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "¿Devuelto a quién? (nombre, habitación si procede)";
I18N.pt["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "Devolvido a quem? (nome, quarto se aplicável)";
I18N.tr["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "Kime iade edildi? (ad, varsa oda)";
I18N.ja["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "誰に返却しましたか？（氏名、部屋番号など）";
I18N.zh["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "归还给谁？（姓名，如有房号）";
I18N.ar["An wen zurückgegeben? (Name, ggf. Zimmer)"] = "أُعيد إلى من؟ (الاسم، والغرفة إن وجدت)";
I18N.en["Artikel"] = "Item";
I18N.fr["Artikel"] = "Article";
I18N.it["Artikel"] = "Articolo";
I18N.es["Artikel"] = "Artículo";
I18N.pt["Artikel"] = "Artigo";
I18N.tr["Artikel"] = "Ürün";
I18N.ja["Artikel"] = "品目";
I18N.zh["Artikel"] = "物品";
I18N.ar["Artikel"] = "الصنف";
I18N.en["Artikel löschen?"] = "Delete item?";
I18N.fr["Artikel löschen?"] = "Supprimer l’article ?";
I18N.it["Artikel löschen?"] = "Eliminare l’articolo?";
I18N.es["Artikel löschen?"] = "¿Eliminar el artículo?";
I18N.pt["Artikel löschen?"] = "Eliminar o artigo?";
I18N.tr["Artikel löschen?"] = "Ürün silinsin mi?";
I18N.ja["Artikel löschen?"] = "品目を削除しますか？";
I18N.zh["Artikel löschen?"] = "删除此物品？";
I18N.ar["Artikel löschen?"] = "حذف الصنف؟";
I18N.en["Aufbewahrt in"] = "Stored in";
I18N.fr["Aufbewahrt in"] = "Conservé dans";
I18N.it["Aufbewahrt in"] = "Custodito in";
I18N.es["Aufbewahrt in"] = "Guardado en";
I18N.pt["Aufbewahrt in"] = "Guardado em";
I18N.tr["Aufbewahrt in"] = "Saklandığı yer";
I18N.ja["Aufbewahrt in"] = "保管場所";
I18N.zh["Aufbewahrt in"] = "存放于";
I18N.ar["Aufbewahrt in"] = "محفوظ في";
I18N.en["Aushang drucken"] = "Print poster";
I18N.fr["Aushang drucken"] = "Imprimer l’affiche";
I18N.it["Aushang drucken"] = "Stampa avviso";
I18N.es["Aushang drucken"] = "Imprimir cartel";
I18N.pt["Aushang drucken"] = "Imprimir cartaz";
I18N.tr["Aushang drucken"] = "Afiş yazdır";
I18N.ja["Aushang drucken"] = "掲示用に印刷";
I18N.zh["Aushang drucken"] = "打印张贴";
I18N.ar["Aushang drucken"] = "طباعة الملصق";
I18N.en["Automatisch übersetzen"] = "Translate automatically";
I18N.fr["Automatisch übersetzen"] = "Traduire automatiquement";
I18N.it["Automatisch übersetzen"] = "Traduci automaticamente";
I18N.es["Automatisch übersetzen"] = "Traducir automáticamente";
I18N.pt["Automatisch übersetzen"] = "Traduzir automaticamente";
I18N.tr["Automatisch übersetzen"] = "Otomatik çevir";
I18N.ja["Automatisch übersetzen"] = "自動翻訳";
I18N.zh["Automatisch übersetzen"] = "自动翻译";
I18N.ar["Automatisch übersetzen"] = "ترجمة تلقائية";
I18N.en["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "Out of range – what action? e.g. door closed, goods moved, maintenance informed";
I18N.fr["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "Hors plage – quelle mesure ? p. ex. porte fermée, marchandise déplacée, technique prévenue";
I18N.it["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "Fuori intervallo – quale azione? es. porta chiusa, merce spostata, manutenzione avvisata";
I18N.es["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "Fuera de rango – ¿qué medida? p. ej. puerta cerrada, género trasladado, mantenimiento avisado";
I18N.pt["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "Fora do intervalo – que medida? p. ex. porta fechada, mercadoria mudada, manutenção avisada";
I18N.tr["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "Aralık dışında – hangi önlem? ör. kapı kapatıldı, ürün taşındı, teknik servise bildirildi";
I18N.ja["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "範囲外 – どの対応をしましたか？例：扉を閉めた、商品を移した、設備担当に連絡";
I18N.zh["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "超出范围 – 采取了什么措施？例如关门、转移货品、通知工程部";
I18N.ar["Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert"] = "خارج النطاق – ما الإجراء؟ مثل إغلاق الباب، نقل البضائع، إبلاغ الصيانة";
I18N.en["Bedarf / geplant"] = "Needed / planned";
I18N.fr["Bedarf / geplant"] = "Besoin / prévu";
I18N.it["Bedarf / geplant"] = "Fabbisogno / pianificati";
I18N.es["Bedarf / geplant"] = "Necesario / planificado";
I18N.pt["Bedarf / geplant"] = "Necessário / planeado";
I18N.tr["Bedarf / geplant"] = "İhtiyaç / planlanan";
I18N.ja["Bedarf / geplant"] = "必要 / 予定";
I18N.zh["Bedarf / geplant"] = "需求 / 已排";
I18N.ar["Bedarf / geplant"] = "المطلوب / المخطط";
I18N.en["Behebungszeit (Median)"] = "Time to fix (median)";
I18N.fr["Behebungszeit (Median)"] = "Délai de résolution (médiane)";
I18N.it["Behebungszeit (Median)"] = "Tempo di risoluzione (mediana)";
I18N.es["Behebungszeit (Median)"] = "Tiempo de solución (mediana)";
I18N.pt["Behebungszeit (Median)"] = "Tempo de resolução (mediana)";
I18N.tr["Behebungszeit (Median)"] = "Giderme süresi (medyan)";
I18N.ja["Behebungszeit (Median)"] = "対応時間（中央値）";
I18N.zh["Behebungszeit (Median)"] = "处理时长（中位数）";
I18N.ar["Behebungszeit (Median)"] = "وقت الإصلاح (الوسيط)";
I18N.en["Belegung und Personalbedarf"] = "Occupancy and staffing needs";
I18N.fr["Belegung und Personalbedarf"] = "Occupation et besoins en personnel";
I18N.it["Belegung und Personalbedarf"] = "Occupazione e fabbisogno di personale";
I18N.es["Belegung und Personalbedarf"] = "Ocupación y necesidad de personal";
I18N.pt["Belegung und Personalbedarf"] = "Ocupação e necessidades de pessoal";
I18N.tr["Belegung und Personalbedarf"] = "Doluluk ve personel ihtiyacı";
I18N.ja["Belegung und Personalbedarf"] = "在室状況と必要人員";
I18N.zh["Belegung und Personalbedarf"] = "入住情况与人员需求";
I18N.ar["Belegung und Personalbedarf"] = "الإشغال واحتياج الموظفين";
I18N.en["Bereich"] = "Range";
I18N.fr["Bereich"] = "Plage";
I18N.it["Bereich"] = "Intervallo";
I18N.es["Bereich"] = "Rango";
I18N.pt["Bereich"] = "Intervalo";
I18N.tr["Bereich"] = "Aralık";
I18N.ja["Bereich"] = "範囲";
I18N.zh["Bereich"] = "范围";
I18N.ar["Bereich"] = "النطاق";
I18N.en["Bestand"] = "Stock level";
I18N.fr["Bestand"] = "Stock";
I18N.it["Bestand"] = "Giacenza";
I18N.es["Bestand"] = "Existencias";
I18N.pt["Bestand"] = "Stock";
I18N.tr["Bestand"] = "Stok";
I18N.ja["Bestand"] = "在庫数";
I18N.zh["Bestand"] = "库存量";
I18N.ar["Bestand"] = "الرصيد";
I18N.en["Bestätigt am {0}"] = "Confirmed on {0}";
I18N.fr["Bestätigt am {0}"] = "Confirmé le {0}";
I18N.it["Bestätigt am {0}"] = "Confermato il {0}";
I18N.es["Bestätigt am {0}"] = "Confirmado el {0}";
I18N.pt["Bestätigt am {0}"] = "Confirmado em {0}";
I18N.tr["Bestätigt am {0}"] = "{0} tarihinde onaylandı";
I18N.ja["Bestätigt am {0}"] = "{0} に確認済み";
I18N.zh["Bestätigt am {0}"] = "已于 {0} 确认";
I18N.ar["Bestätigt am {0}"] = "تم التأكيد في {0}";
I18N.en["Danke – bestätigt."] = "Thanks – confirmed.";
I18N.fr["Danke – bestätigt."] = "Merci – confirmé.";
I18N.it["Danke – bestätigt."] = "Grazie – confermato.";
I18N.es["Danke – bestätigt."] = "Gracias – confirmado.";
I18N.pt["Danke – bestätigt."] = "Obrigado – confirmado.";
I18N.tr["Danke – bestätigt."] = "Teşekkürler – onaylandı.";
I18N.ja["Danke – bestätigt."] = "ありがとうございます。確認しました。";
I18N.zh["Danke – bestätigt."] = "谢谢 – 已确认。";
I18N.ar["Danke – bestätigt."] = "شكرًا – تم التأكيد.";
I18N.en["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "The plan suggestion fills open shifts based on minimum staffing and demand – respecting availability, target hours and 11 hours of rest. Existing shifts stay; everything is added as a draft.";
I18N.fr["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "La proposition remplit les postes libres selon l’effectif minimum et le besoin – en tenant compte des disponibilités, des heures prévues et de 11 heures de repos. Les postes existants restent, tout est ajouté en brouillon.";
I18N.it["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "La proposta riempie i turni liberi in base a copertura minima e fabbisogno – rispettando disponibilità, ore previste e 11 ore di riposo. I turni esistenti restano, tutto viene inserito come bozza.";
I18N.es["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "La propuesta rellena los turnos libres según el mínimo y la necesidad – respetando disponibilidad, horas objetivo y 11 horas de descanso. Los turnos existentes se mantienen; todo se añade como borrador.";
I18N.pt["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "A proposta preenche os turnos livres segundo o mínimo e a necessidade – respeitando disponibilidade, horas previstas e 11 horas de descanso. Os turnos existentes mantêm-se; tudo fica como rascunho.";
I18N.tr["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "Plan önerisi boş vardiyaları asgari kadro ve ihtiyaca göre doldurur – müsaitlik, hedef saatler ve 11 saat dinlenme dikkate alınır. Mevcut vardiyalar kalır, hepsi taslak olarak eklenir.";
I18N.ja["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "プラン提案は最低人員と必要数に基づき空きシフトを埋めます。勤務可能日、所定時間、11 時間の休息を考慮します。既存のシフトはそのままで、すべて下書きとして追加されます。";
I18N.zh["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "排班建议会按最低配置和需求补全空班，同时考虑可上班时间、目标工时和 11 小时休息。已有班次保持不变，全部作为草稿添加。";
I18N.ar["Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf."] = "يملأ اقتراح الجدول المناوبات الشاغرة حسب الحد الأدنى والاحتياج – مع مراعاة التوفر والساعات المستهدفة و11 ساعة راحة. تبقى المناوبات الحالية، وتُضاف كلها كمسودة.";
I18N.en["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "Occupancy comes automatically from the PMS (Mews) or can be entered under “Edit”.";
I18N.fr["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "L’occupation vient automatiquement du PMS (Mews) ou peut être saisie via « Modifier ».";
I18N.it["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "L’occupazione arriva automaticamente dal PMS (Mews) o si inserisce con «Modifica».";
I18N.es["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "La ocupación llega automáticamente del PMS (Mews) o se introduce en «Editar».";
I18N.pt["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "A ocupação vem automaticamente do PMS (Mews) ou pode ser introduzida em «Editar».";
I18N.tr["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "Doluluk PMS’ten (Mews) otomatik gelir ya da “Düzenle” ile girilebilir.";
I18N.ja["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "在室状況は PMS（Mews）から自動で取り込まれるか、「編集」から入力できます。";
I18N.zh["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "入住数据自动来自 PMS（Mews），也可在“编辑”中填写。";
I18N.ar["Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen."] = "يأتي الإشغال تلقائيًا من نظام إدارة الفندق (Mews) أو يمكن إدخاله عبر «تعديل».";
I18N.en["Die Woche ist bereits vollständig besetzt."] = "The week is already fully staffed.";
I18N.fr["Die Woche ist bereits vollständig besetzt."] = "La semaine est déjà entièrement couverte.";
I18N.it["Die Woche ist bereits vollständig besetzt."] = "La settimana è già completamente coperta.";
I18N.es["Die Woche ist bereits vollständig besetzt."] = "La semana ya está totalmente cubierta.";
I18N.pt["Die Woche ist bereits vollständig besetzt."] = "A semana já está totalmente preenchida.";
I18N.tr["Die Woche ist bereits vollständig besetzt."] = "Hafta zaten tamamen dolu.";
I18N.ja["Die Woche ist bereits vollständig besetzt."] = "今週はすでに必要人員がそろっています。";
I18N.zh["Die Woche ist bereits vollständig besetzt."] = "本周已排满。";
I18N.ar["Die Woche ist bereits vollständig besetzt."] = "الأسبوع مكتمل بالفعل.";
I18N.en["Einheit"] = "Unit";
I18N.fr["Einheit"] = "Unité";
I18N.it["Einheit"] = "Unità";
I18N.es["Einheit"] = "Unidad";
I18N.pt["Einheit"] = "Unidade";
I18N.tr["Einheit"] = "Birim";
I18N.ja["Einheit"] = "単位";
I18N.zh["Einheit"] = "单位";
I18N.ar["Einheit"] = "الوحدة";
I18N.en["Entnahme"] = "Take out";
I18N.fr["Entnahme"] = "Sortie";
I18N.it["Entnahme"] = "Prelievo";
I18N.es["Entnahme"] = "Salida";
I18N.pt["Entnahme"] = "Saída";
I18N.tr["Entnahme"] = "Çıkış";
I18N.ja["Entnahme"] = "出庫";
I18N.zh["Entnahme"] = "取用";
I18N.ar["Entnahme"] = "صرف";
I18N.en["Fertig"] = "Done";
I18N.fr["Fertig"] = "Terminé";
I18N.it["Fertig"] = "Fatto";
I18N.es["Fertig"] = "Listo";
I18N.pt["Fertig"] = "Concluído";
I18N.tr["Fertig"] = "Bitti";
I18N.ja["Fertig"] = "完了";
I18N.zh["Fertig"] = "完成";
I18N.ar["Fertig"] = "تم";
I18N.en["Fortsetzen"] = "Resume";
I18N.fr["Fortsetzen"] = "Reprendre";
I18N.it["Fortsetzen"] = "Riprendi";
I18N.es["Fortsetzen"] = "Reanudar";
I18N.pt["Fortsetzen"] = "Retomar";
I18N.tr["Fortsetzen"] = "Devam et";
I18N.ja["Fortsetzen"] = "再開";
I18N.zh["Fortsetzen"] = "继续";
I18N.ar["Fortsetzen"] = "استئناف";
I18N.en["Für (leer = alle)"] = "For (empty = everyone)";
I18N.fr["Für (leer = alle)"] = "Pour (vide = tout le monde)";
I18N.it["Für (leer = alle)"] = "Per (vuoto = tutti)";
I18N.es["Für (leer = alle)"] = "Para (vacío = todos)";
I18N.pt["Für (leer = alle)"] = "Para (vazio = todos)";
I18N.tr["Für (leer = alle)"] = "Kimin için (boş = herkes)";
I18N.ja["Für (leer = alle)"] = "対象（空欄 = 全員）";
I18N.zh["Für (leer = alle)"] = "适用（留空 = 所有人）";
I18N.ar["Für (leer = alle)"] = "لـ (فارغ = الجميع)";
I18N.en["Für diese Abteilung gibt es noch keine Artikel."] = "There are no items for this department yet.";
I18N.fr["Für diese Abteilung gibt es noch keine Artikel."] = "Aucun article pour ce service.";
I18N.it["Für diese Abteilung gibt es noch keine Artikel."] = "Per questo reparto non ci sono ancora articoli.";
I18N.es["Für diese Abteilung gibt es noch keine Artikel."] = "Todavía no hay artículos para este departamento.";
I18N.pt["Für diese Abteilung gibt es noch keine Artikel."] = "Ainda não há artigos para este departamento.";
I18N.tr["Für diese Abteilung gibt es noch keine Artikel."] = "Bu departman için henüz ürün yok.";
I18N.ja["Für diese Abteilung gibt es noch keine Artikel."] = "この部門の品目はまだありません。";
I18N.zh["Für diese Abteilung gibt es noch keine Artikel."] = "此部门还没有物品。";
I18N.ar["Für diese Abteilung gibt es noch keine Artikel."] = "لا توجد أصناف لهذا القسم بعد.";
I18N.en["Gearbeitete Stunden"] = "Hours worked";
I18N.fr["Gearbeitete Stunden"] = "Heures travaillées";
I18N.it["Gearbeitete Stunden"] = "Ore lavorate";
I18N.es["Gearbeitete Stunden"] = "Horas trabajadas";
I18N.pt["Gearbeitete Stunden"] = "Horas trabalhadas";
I18N.tr["Gearbeitete Stunden"] = "Çalışılan saat";
I18N.ja["Gearbeitete Stunden"] = "労働時間";
I18N.zh["Gearbeitete Stunden"] = "工作小时";
I18N.ar["Gearbeitete Stunden"] = "ساعات العمل";
I18N.en["Gefunden am"] = "Found on";
I18N.fr["Gefunden am"] = "Trouvé le";
I18N.it["Gefunden am"] = "Trovato il";
I18N.es["Gefunden am"] = "Encontrado el";
I18N.pt["Gefunden am"] = "Encontrado em";
I18N.tr["Gefunden am"] = "Bulunma tarihi";
I18N.ja["Gefunden am"] = "発見日";
I18N.zh["Gefunden am"] = "拾获日期";
I18N.ar["Gefunden am"] = "تاريخ العثور";
I18N.en["Gelesen und verstanden"] = "Read and understood";
I18N.fr["Gelesen und verstanden"] = "Lu et compris";
I18N.it["Gelesen und verstanden"] = "Letto e compreso";
I18N.es["Gelesen und verstanden"] = "Leído y entendido";
I18N.pt["Gelesen und verstanden"] = "Lido e compreendido";
I18N.tr["Gelesen und verstanden"] = "Okudum, anladım";
I18N.ja["Gelesen und verstanden"] = "読んで理解しました";
I18N.zh["Gelesen und verstanden"] = "已阅读并理解";
I18N.ar["Gelesen und verstanden"] = "قرأت وفهمت";
I18N.en["Gemessen von"] = "Measured by";
I18N.fr["Gemessen von"] = "Mesuré par";
I18N.it["Gemessen von"] = "Misurato da";
I18N.es["Gemessen von"] = "Medido por";
I18N.pt["Gemessen von"] = "Medido por";
I18N.tr["Gemessen von"] = "Ölçen";
I18N.ja["Gemessen von"] = "測定者";
I18N.zh["Gemessen von"] = "测量人";
I18N.ar["Gemessen von"] = "قاس بواسطة";
I18N.en["Gästewunsch erfassen"] = "Log guest request";
I18N.fr["Gästewunsch erfassen"] = "Saisir une demande client";
I18N.it["Gästewunsch erfassen"] = "Registra richiesta ospite";
I18N.es["Gästewunsch erfassen"] = "Registrar petición";
I18N.pt["Gästewunsch erfassen"] = "Registar pedido do hóspede";
I18N.tr["Gästewunsch erfassen"] = "Misafir isteği kaydet";
I18N.ja["Gästewunsch erfassen"] = "ゲストのリクエストを登録";
I18N.zh["Gästewunsch erfassen"] = "登记客人需求";
I18N.ar["Gästewunsch erfassen"] = "تسجيل طلب ضيف";
I18N.en["Gästewünsche"] = "Guest requests";
I18N.fr["Gästewünsche"] = "Demandes clients";
I18N.it["Gästewünsche"] = "Richieste ospiti";
I18N.es["Gästewünsche"] = "Peticiones de huéspedes";
I18N.pt["Gästewünsche"] = "Pedidos de hóspedes";
I18N.tr["Gästewünsche"] = "Misafir istekleri";
I18N.ja["Gästewünsche"] = "ゲストのリクエスト";
I18N.zh["Gästewünsche"] = "客人需求";
I18N.ar["Gästewünsche"] = "طلبات الضيوف";
I18N.en["HACCP-Messungen"] = "HACCP readings";
I18N.fr["HACCP-Messungen"] = "Relevés HACCP";
I18N.it["HACCP-Messungen"] = "Misurazioni HACCP";
I18N.es["HACCP-Messungen"] = "Mediciones APPCC";
I18N.pt["HACCP-Messungen"] = "Medições HACCP";
I18N.tr["HACCP-Messungen"] = "HACCP ölçümleri";
I18N.ja["HACCP-Messungen"] = "HACCP 測定";
I18N.zh["HACCP-Messungen"] = "HACCP 测量";
I18N.ar["HACCP-Messungen"] = "قراءات HACCP";
I18N.en["Heute noch nicht gemessen"] = "Not measured today yet";
I18N.fr["Heute noch nicht gemessen"] = "Pas encore mesuré aujourd’hui";
I18N.it["Heute noch nicht gemessen"] = "Oggi non ancora misurato";
I18N.es["Heute noch nicht gemessen"] = "Hoy aún sin medir";
I18N.pt["Heute noch nicht gemessen"] = "Ainda não medido hoje";
I18N.tr["Heute noch nicht gemessen"] = "Bugün henüz ölçülmedi";
I18N.ja["Heute noch nicht gemessen"] = "本日未測定";
I18N.zh["Heute noch nicht gemessen"] = "今天尚未测量";
I18N.ar["Heute noch nicht gemessen"] = "لم يُقس اليوم بعد";
I18N.en["Hier stempeln"] = "Clock in here";
I18N.fr["Hier stempeln"] = "Pointez ici";
I18N.it["Hier stempeln"] = "Timbra qui";
I18N.es["Hier stempeln"] = "Ficha aquí";
I18N.pt["Hier stempeln"] = "Registe aqui";
I18N.tr["Hier stempeln"] = "Buradan giriş yap";
I18N.ja["Hier stempeln"] = "ここで打刻";
I18N.zh["Hier stempeln"] = "在此打卡";
I18N.ar["Hier stempeln"] = "سجّل هنا";
I18N.en["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "Put the code up at the staff entrance. When it’s required, only people who have just scanned it can clock in – clocking in from home is no longer possible.";
I18N.fr["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "Affiche le code à l’entrée du personnel. Si l’obligation est activée, seul celui qui vient de le scanner peut pointer – pointer depuis chez soi devient impossible.";
I18N.it["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "Appendi il codice all’ingresso del personale. Se l’obbligo è attivo, può timbrare solo chi l’ha appena scansionato – da casa non è più possibile.";
I18N.es["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "Cuelga el código en la entrada de personal. Si es obligatorio, solo puede fichar quien lo acaba de escanear; fichar desde casa ya no es posible.";
I18N.pt["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "Afixa o código na entrada do pessoal. Se for obrigatório, só regista quem o acabou de ler – registar a partir de casa deixa de ser possível.";
I18N.tr["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "Kodu personel girişine as. Zorunluysa yalnızca az önce tarayan kişi giriş yapabilir – evden giriş artık mümkün değildir.";
I18N.ja["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "コードを従業員入口に掲示してください。必須にすると、直前に読み取った人だけが打刻でき、自宅からは打刻できません。";
I18N.zh["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "把二维码张贴在员工入口。开启强制后，只有刚扫描过的人才能打卡，在家无法打卡。";
I18N.ar["Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht."] = "علّق الرمز عند مدخل الموظفين. عند تفعيل الإلزام لا يمكن التسجيل إلا لمن مسحه للتو – ولا يمكن التسجيل من المنزل.";
I18N.en["Inhalt"] = "Content";
I18N.fr["Inhalt"] = "Contenu";
I18N.it["Inhalt"] = "Contenuto";
I18N.es["Inhalt"] = "Contenido";
I18N.pt["Inhalt"] = "Conteúdo";
I18N.tr["Inhalt"] = "İçerik";
I18N.ja["Inhalt"] = "内容";
I18N.zh["Inhalt"] = "内容";
I18N.ar["Inhalt"] = "المحتوى";
I18N.en["Ja"] = "Yes";
I18N.fr["Ja"] = "Oui";
I18N.it["Ja"] = "Sì";
I18N.es["Ja"] = "Sí";
I18N.pt["Ja"] = "Sim";
I18N.tr["Ja"] = "Evet";
I18N.ja["Ja"] = "はい";
I18N.zh["Ja"] = "是";
I18N.ar["Ja"] = "نعم";
I18N.en["Jetzt anlegen"] = "Create now";
I18N.fr["Jetzt anlegen"] = "Créer maintenant";
I18N.it["Jetzt anlegen"] = "Crea ora";
I18N.es["Jetzt anlegen"] = "Crear ahora";
I18N.pt["Jetzt anlegen"] = "Criar agora";
I18N.tr["Jetzt anlegen"] = "Şimdi oluştur";
I18N.ja["Jetzt anlegen"] = "今すぐ作成";
I18N.zh["Jetzt anlegen"] = "立即创建";
I18N.ar["Jetzt anlegen"] = "إنشاء الآن";
I18N.en["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "No signal – the entry has been saved and will be sent automatically.";
I18N.fr["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "Pas de réseau – le pointage est enregistré et sera envoyé automatiquement.";
I18N.it["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "Nessuna rete – la timbratura è salvata e verrà inviata automaticamente.";
I18N.es["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "Sin conexión – el fichaje está guardado y se enviará automáticamente.";
I18N.pt["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "Sem rede – o registo foi guardado e será enviado automaticamente.";
I18N.tr["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "Bağlantı yok – kayıt saklandı, otomatik gönderilecek.";
I18N.ja["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "圏外です。打刻は保存され、自動で送信されます。";
I18N.zh["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "没有网络 – 记录已保存，将自动发送。";
I18N.ar["Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet."] = "لا توجد شبكة – تم حفظ التسجيل وسيُرسل تلقائيًا.";
I18N.en["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "No suggestion possible: {0} shifts can’t be filled with the team.";
I18N.fr["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "Aucune proposition possible : {0} postes ne peuvent pas être couverts par l’équipe.";
I18N.it["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "Nessuna proposta possibile: {0} turni non si possono coprire con il team.";
I18N.es["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "No hay propuesta: {0} turnos no se pueden cubrir con el equipo.";
I18N.pt["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "Sem proposta possível: {0} turnos não podem ser preenchidos com a equipa.";
I18N.tr["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "Öneri yok: {0} vardiya ekiple doldurulamıyor.";
I18N.ja["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "提案できません：{0} シフトを現在のチームで埋められません。";
I18N.zh["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "无法给出建议：现有团队无法安排 {0} 个班次。";
I18N.ar["Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen."] = "لا يوجد اقتراح: لا يمكن تغطية {0} مناوبات بالفريق.";
I18N.en["Keine Fundsachen."] = "No lost items.";
I18N.fr["Keine Fundsachen."] = "Aucun objet trouvé.";
I18N.it["Keine Fundsachen."] = "Nessun oggetto smarrito.";
I18N.es["Keine Fundsachen."] = "No hay objetos perdidos.";
I18N.pt["Keine Fundsachen."] = "Não há objetos perdidos.";
I18N.tr["Keine Fundsachen."] = "Kayıp eşya yok.";
I18N.ja["Keine Fundsachen."] = "遺失物はありません。";
I18N.zh["Keine Fundsachen."] = "没有失物。";
I18N.ar["Keine Fundsachen."] = "لا توجد مفقودات.";
I18N.en["Korrigierte Zeitbuchungen"] = "Corrected time entries";
I18N.fr["Korrigierte Zeitbuchungen"] = "Pointages corrigés";
I18N.it["Korrigierte Zeitbuchungen"] = "Timbrature corrette";
I18N.es["Korrigierte Zeitbuchungen"] = "Fichajes corregidos";
I18N.pt["Korrigierte Zeitbuchungen"] = "Registos corrigidos";
I18N.tr["Korrigierte Zeitbuchungen"] = "Düzeltilen kayıtlar";
I18N.ja["Korrigierte Zeitbuchungen"] = "修正された打刻";
I18N.zh["Korrigierte Zeitbuchungen"] = "已更正的打卡";
I18N.ar["Korrigierte Zeitbuchungen"] = "تسجيلات مصحَّحة";
I18N.en["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "Add cold rooms, fridges and buffets – then the team records temperatures here on the phone.";
I18N.fr["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "Ajoute chambres froides, réfrigérateurs et buffets – l’équipe y saisit ensuite les températures sur mobile.";
I18N.it["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "Aggiungi celle, frigoriferi e buffet – poi il team registra qui le temperature dal telefono.";
I18N.es["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "Añade cámaras, neveras y bufés – después el equipo anota aquí las temperaturas en el móvil.";
I18N.pt["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "Adiciona câmaras, frigoríficos e buffets – depois a equipa regista aqui as temperaturas no telemóvel.";
I18N.tr["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "Soğuk odaları, buzdolaplarını ve büfeleri ekle – ekip sıcaklıkları burada telefondan girer.";
I18N.ja["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "冷蔵室・冷蔵庫・ビュッフェを登録すると、チームがここでスマホから温度を記録できます。";
I18N.zh["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "添加冷库、冰箱和自助餐台后，团队即可在手机上记录温度。";
I18N.ar["Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein."] = "أضف غرف التبريد والثلاجات والبوفيهات – ثم يسجّل الفريق درجات الحرارة هنا من الهاتف.";
I18N.en["Maßnahme"] = "Action";
I18N.fr["Maßnahme"] = "Mesure";
I18N.it["Maßnahme"] = "Azione";
I18N.es["Maßnahme"] = "Medida";
I18N.pt["Maßnahme"] = "Medida";
I18N.tr["Maßnahme"] = "Önlem";
I18N.ja["Maßnahme"] = "対応";
I18N.zh["Maßnahme"] = "措施";
I18N.ar["Maßnahme"] = "الإجراء";
I18N.en["Meldung angelegt."] = "Report created.";
I18N.fr["Meldung angelegt."] = "Signalement créé.";
I18N.it["Meldung angelegt."] = "Segnalazione creata.";
I18N.es["Meldung angelegt."] = "Aviso creado.";
I18N.pt["Meldung angelegt."] = "Ocorrência criada.";
I18N.tr["Meldung angelegt."] = "Bildirim oluşturuldu.";
I18N.ja["Meldung angelegt."] = "報告を作成しました。";
I18N.zh["Meldung angelegt."] = "已创建报修。";
I18N.ar["Meldung angelegt."] = "تم إنشاء البلاغ.";
I18N.en["Messpunkt"] = "Measuring point";
I18N.fr["Messpunkt"] = "Point de mesure";
I18N.it["Messpunkt"] = "Punto di misura";
I18N.es["Messpunkt"] = "Punto de medición";
I18N.pt["Messpunkt"] = "Ponto de medição";
I18N.tr["Messpunkt"] = "Ölçüm noktası";
I18N.ja["Messpunkt"] = "測定ポイント";
I18N.zh["Messpunkt"] = "测量点";
I18N.ar["Messpunkt"] = "نقطة القياس";
I18N.en["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "Delete measuring point? All its readings will be removed.";
I18N.fr["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "Supprimer le point de mesure ? Tous ses relevés seront supprimés.";
I18N.it["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "Eliminare il punto di misura? Tutte le sue misure verranno rimosse.";
I18N.es["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "¿Eliminar el punto de medición? Se borrarán todas sus mediciones.";
I18N.pt["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "Eliminar o ponto de medição? Todas as medições serão removidas.";
I18N.tr["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "Ölçüm noktası silinsin mi? Tüm ölçümleri de silinir.";
I18N.ja["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "測定ポイントを削除しますか？測定値もすべて削除されます。";
I18N.zh["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "删除此测量点？所有相关测量值都会被删除。";
I18N.ar["Messpunkt löschen? Alle Messwerte dazu werden entfernt."] = "حذف نقطة القياس؟ ستُحذف جميع قراءاتها.";
I18N.en["Mindestbestand"] = "Minimum stock";
I18N.fr["Mindestbestand"] = "Stock minimum";
I18N.it["Mindestbestand"] = "Scorta minima";
I18N.es["Mindestbestand"] = "Existencias mínimas";
I18N.pt["Mindestbestand"] = "Stock mínimo";
I18N.tr["Mindestbestand"] = "Asgari stok";
I18N.ja["Mindestbestand"] = "最低在庫";
I18N.zh["Mindestbestand"] = "最低库存";
I18N.ar["Mindestbestand"] = "الحد الأدنى للمخزون";
I18N.en["Minimum"] = "Minimum";
I18N.fr["Minimum"] = "Minimum";
I18N.it["Minimum"] = "Minimo";
I18N.es["Minimum"] = "Mínimo";
I18N.pt["Minimum"] = "Mínimo";
I18N.tr["Minimum"] = "Asgari";
I18N.ja["Minimum"] = "最低";
I18N.zh["Minimum"] = "最低";
I18N.ar["Minimum"] = "الحد الأدنى";
I18N.en["Minimum {0}"] = "Minimum {0}";
I18N.fr["Minimum {0}"] = "Minimum {0}";
I18N.it["Minimum {0}"] = "Minimo {0}";
I18N.es["Minimum {0}"] = "Mínimo {0}";
I18N.pt["Minimum {0}"] = "Mínimo {0}";
I18N.tr["Minimum {0}"] = "Asgari {0}";
I18N.ja["Minimum {0}"] = "最低 {0}";
I18N.zh["Minimum {0}"] = "最低 {0}";
I18N.ar["Minimum {0}"] = "الحد الأدنى {0}";
I18N.en["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "Scan with your phone camera, then tap “Clock in” or “Clock out”.";
I18N.fr["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "Scanne avec l’appareil photo du téléphone, puis touche « Arrivée » ou « Départ ».";
I18N.it["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "Scansiona con la fotocamera del telefono, poi tocca «Entrata» o «Uscita».";
I18N.es["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "Escanéalo con la cámara del móvil y toca «Entrada» o «Salida».";
I18N.pt["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "Lê com a câmara do telemóvel e toca em «Entrada» ou «Saída».";
I18N.tr["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "Telefon kamerasıyla tara, sonra “Giriş” veya “Çıkış”a dokun.";
I18N.ja["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "スマホのカメラで読み取り、「出勤」または「退勤」をタップします。";
I18N.zh["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "用手机相机扫描，然后点“上班”或“下班”。";
I18N.ar["Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen."] = "امسح الرمز بكاميرا الهاتف ثم اضغط «حضور» أو «انصراف».";
I18N.en["Nachweis als Excel"] = "Record as Excel";
I18N.fr["Nachweis als Excel"] = "Justificatif Excel";
I18N.it["Nachweis als Excel"] = "Registro in Excel";
I18N.es["Nachweis als Excel"] = "Registro en Excel";
I18N.pt["Nachweis als Excel"] = "Registo em Excel";
I18N.tr["Nachweis als Excel"] = "Excel kaydı";
I18N.ja["Nachweis als Excel"] = "Excel で記録を出力";
I18N.zh["Nachweis als Excel"] = "导出 Excel 记录";
I18N.ar["Nachweis als Excel"] = "سجل بصيغة Excel";
I18N.en["Neuen Code erzeugen"] = "Create new code";
I18N.fr["Neuen Code erzeugen"] = "Générer un nouveau code";
I18N.it["Neuen Code erzeugen"] = "Genera nuovo codice";
I18N.es["Neuen Code erzeugen"] = "Crear nuevo código";
I18N.pt["Neuen Code erzeugen"] = "Criar novo código";
I18N.tr["Neuen Code erzeugen"] = "Yeni kod oluştur";
I18N.ja["Neuen Code erzeugen"] = "新しいコードを作成";
I18N.zh["Neuen Code erzeugen"] = "生成新二维码";
I18N.ar["Neuen Code erzeugen"] = "إنشاء رمز جديد";
I18N.en["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "Create a new code? The old poster will stop working.";
I18N.fr["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "Générer un nouveau code ? L’ancienne affiche ne fonctionnera plus.";
I18N.it["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "Generare un nuovo codice? Il vecchio avviso non funzionerà più.";
I18N.es["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "¿Crear un nuevo código? El cartel antiguo dejará de funcionar.";
I18N.pt["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "Criar um novo código? O cartaz antigo deixa de funcionar.";
I18N.tr["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "Yeni kod oluşturulsun mu? Eski afiş artık çalışmaz.";
I18N.ja["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "新しいコードを作成しますか？古い掲示は使えなくなります。";
I18N.zh["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "生成新二维码？旧的张贴将失效。";
I18N.ar["Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."] = "إنشاء رمز جديد؟ سيتوقف الملصق القديم عن العمل.";
I18N.en["Neuer Mindestbestand"] = "New minimum stock";
I18N.fr["Neuer Mindestbestand"] = "Nouveau stock minimum";
I18N.it["Neuer Mindestbestand"] = "Nuova scorta minima";
I18N.es["Neuer Mindestbestand"] = "Nuevas existencias mínimas";
I18N.pt["Neuer Mindestbestand"] = "Novo stock mínimo";
I18N.tr["Neuer Mindestbestand"] = "Yeni asgari stok";
I18N.ja["Neuer Mindestbestand"] = "新しい最低在庫";
I18N.zh["Neuer Mindestbestand"] = "新的最低库存";
I18N.ar["Neuer Mindestbestand"] = "الحد الأدنى الجديد";
I18N.en["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "No items yet. Add linen, amenities or minibar items with a minimum stock.";
I18N.fr["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "Aucun article. Ajoute linge, produits d’accueil ou minibar avec un stock minimum.";
I18N.it["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "Ancora nessun articolo. Aggiungi biancheria, amenities o minibar con una scorta minima.";
I18N.es["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "Todavía no hay artículos. Añade lencería, amenities o minibar con existencias mínimas.";
I18N.pt["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "Ainda não há artigos. Adiciona roupa, amenities ou minibar com stock mínimo.";
I18N.tr["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "Henüz ürün yok. Çamaşır, buklet veya minibar ürünlerini asgari stokla ekle.";
I18N.ja["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "まだ品目がありません。リネン、アメニティ、ミニバー品を最低在庫付きで登録しましょう。";
I18N.zh["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "还没有物品。请添加布草、洗漱用品或迷你吧物品并设置最低库存。";
I18N.ar["Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an."] = "لا توجد أصناف بعد. أضف البياضات ومستلزمات الضيافة وأصناف الميني بار مع حد أدنى.";
I18N.en["Noch keine Unterweisungen."] = "No briefings yet.";
I18N.fr["Noch keine Unterweisungen."] = "Aucune consigne pour l’instant.";
I18N.it["Noch keine Unterweisungen."] = "Ancora nessuna istruzione.";
I18N.es["Noch keine Unterweisungen."] = "Todavía no hay instrucciones.";
I18N.pt["Noch keine Unterweisungen."] = "Ainda não há instruções.";
I18N.tr["Noch keine Unterweisungen."] = "Henüz talimat yok.";
I18N.ja["Noch keine Unterweisungen."] = "まだ指導はありません。";
I18N.zh["Noch keine Unterweisungen."] = "还没有培训。";
I18N.ar["Noch keine Unterweisungen."] = "لا توجد تعليمات بعد.";
I18N.en["Noch keine Wartungen geplant."] = "No maintenance planned yet.";
I18N.fr["Noch keine Wartungen geplant."] = "Aucune maintenance planifiée.";
I18N.it["Noch keine Wartungen geplant."] = "Nessuna manutenzione pianificata.";
I18N.es["Noch keine Wartungen geplant."] = "Todavía no hay mantenimientos planificados.";
I18N.pt["Noch keine Wartungen geplant."] = "Ainda não há manutenções planeadas.";
I18N.tr["Noch keine Wartungen geplant."] = "Henüz planlı bakım yok.";
I18N.ja["Noch keine Wartungen geplant."] = "まだ保守計画はありません。";
I18N.zh["Noch keine Wartungen geplant."] = "还没有计划维护。";
I18N.ar["Noch keine Wartungen geplant."] = "لا توجد صيانة مجدولة بعد.";
I18N.en["Noch offen"] = "Still open";
I18N.fr["Noch offen"] = "Encore en attente";
I18N.it["Noch offen"] = "Ancora in sospeso";
I18N.es["Noch offen"] = "Pendiente";
I18N.pt["Noch offen"] = "Ainda em falta";
I18N.tr["Noch offen"] = "Henüz açık";
I18N.ja["Noch offen"] = "未完了";
I18N.zh["Noch offen"] = "尚未完成";
I18N.ar["Noch offen"] = "لا يزال معلّقًا";
I18N.en["Nächster Termin"] = "Next date";
I18N.fr["Nächster Termin"] = "Prochaine échéance";
I18N.it["Nächster Termin"] = "Prossima scadenza";
I18N.es["Nächster Termin"] = "Próxima fecha";
I18N.pt["Nächster Termin"] = "Próxima data";
I18N.tr["Nächster Termin"] = "Sonraki tarih";
I18N.ja["Nächster Termin"] = "次回予定日";
I18N.zh["Nächster Termin"] = "下次日期";
I18N.ar["Nächster Termin"] = "الموعد التالي";
I18N.en["Original anzeigen"] = "Show original";
I18N.fr["Original anzeigen"] = "Afficher l’original";
I18N.it["Original anzeigen"] = "Mostra originale";
I18N.es["Original anzeigen"] = "Mostrar original";
I18N.pt["Original anzeigen"] = "Mostrar original";
I18N.tr["Original anzeigen"] = "Orijinali göster";
I18N.ja["Original anzeigen"] = "原文を表示";
I18N.zh["Original anzeigen"] = "显示原文";
I18N.ar["Original anzeigen"] = "عرض الأصل";
I18N.en["Pausieren"] = "Pause";
I18N.fr["Pausieren"] = "Mettre en pause";
I18N.it["Pausieren"] = "Metti in pausa";
I18N.es["Pausieren"] = "Pausar";
I18N.pt["Pausieren"] = "Pausar";
I18N.tr["Pausieren"] = "Duraklat";
I18N.ja["Pausieren"] = "一時停止";
I18N.zh["Pausieren"] = "暂停";
I18N.ar["Pausieren"] = "إيقاف مؤقت";
I18N.en["Plan-Vorschlag"] = "Plan suggestion";
I18N.fr["Plan-Vorschlag"] = "Proposition de planning";
I18N.it["Plan-Vorschlag"] = "Proposta di turni";
I18N.es["Plan-Vorschlag"] = "Propuesta de cuadrante";
I18N.pt["Plan-Vorschlag"] = "Proposta de escala";
I18N.tr["Plan-Vorschlag"] = "Plan önerisi";
I18N.ja["Plan-Vorschlag"] = "プラン提案";
I18N.zh["Plan-Vorschlag"] = "排班建议";
I18N.ar["Plan-Vorschlag"] = "اقتراح جدول";
I18N.en["Stempeln"] = "Clock in";
I18N.fr["Stempeln"] = "Pointage";
I18N.it["Stempeln"] = "Timbratura";
I18N.es["Stempeln"] = "Fichaje";
I18N.pt["Stempeln"] = "Registo de horas";
I18N.tr["Stempeln"] = "Giriş/çıkış";
I18N.ja["Stempeln"] = "打刻";
I18N.zh["Stempeln"] = "打卡";
I18N.ar["Stempeln"] = "التسجيل";
I18N.en["Stempeln nur mit QR-Code vor Ort"] = "Clock-in only with the on-site QR code";
I18N.fr["Stempeln nur mit QR-Code vor Ort"] = "Pointage uniquement avec le QR code sur place";
I18N.it["Stempeln nur mit QR-Code vor Ort"] = "Timbratura solo con il QR code sul posto";
I18N.es["Stempeln nur mit QR-Code vor Ort"] = "Fichaje solo con el código QR en el lugar";
I18N.pt["Stempeln nur mit QR-Code vor Ort"] = "Registo apenas com o código QR no local";
I18N.tr["Stempeln nur mit QR-Code vor Ort"] = "Yalnızca yerindeki QR kodla giriş";
I18N.ja["Stempeln nur mit QR-Code vor Ort"] = "現地の QR コードでのみ打刻";
I18N.zh["Stempeln nur mit QR-Code vor Ort"] = "仅限现场二维码打卡";
I18N.ar["Stempeln nur mit QR-Code vor Ort"] = "التسجيل برمز QR في الموقع فقط";
I18N.en["Stempeln per QR-Code"] = "Clock-in by QR code";
I18N.fr["Stempeln per QR-Code"] = "Pointage par QR code";
I18N.it["Stempeln per QR-Code"] = "Timbratura con QR code";
I18N.es["Stempeln per QR-Code"] = "Fichaje con código QR";
I18N.pt["Stempeln per QR-Code"] = "Registo com código QR";
I18N.tr["Stempeln per QR-Code"] = "QR kodla giriş";
I18N.ja["Stempeln per QR-Code"] = "QR コードで打刻";
I18N.zh["Stempeln per QR-Code"] = "二维码打卡";
I18N.ar["Stempeln per QR-Code"] = "التسجيل برمز QR";
I18N.en["Stunden je Abteilung"] = "Hours by department";
I18N.fr["Stunden je Abteilung"] = "Heures par service";
I18N.it["Stunden je Abteilung"] = "Ore per reparto";
I18N.es["Stunden je Abteilung"] = "Horas por departamento";
I18N.pt["Stunden je Abteilung"] = "Horas por departamento";
I18N.tr["Stunden je Abteilung"] = "Departman bazında saat";
I18N.ja["Stunden je Abteilung"] = "部門別の時間";
I18N.zh["Stunden je Abteilung"] = "各部门工时";
I18N.ar["Stunden je Abteilung"] = "الساعات حسب القسم";
I18N.en["Stunden je belegtem Zimmer"] = "Hours per occupied room";
I18N.fr["Stunden je belegtem Zimmer"] = "Heures par chambre occupée";
I18N.it["Stunden je belegtem Zimmer"] = "Ore per camera occupata";
I18N.es["Stunden je belegtem Zimmer"] = "Horas por habitación ocupada";
I18N.pt["Stunden je belegtem Zimmer"] = "Horas por quarto ocupado";
I18N.tr["Stunden je belegtem Zimmer"] = "Dolu oda başına saat";
I18N.ja["Stunden je belegtem Zimmer"] = "在室客室あたりの時間";
I18N.zh["Stunden je belegtem Zimmer"] = "每间在住房工时";
I18N.ar["Stunden je belegtem Zimmer"] = "الساعات لكل غرفة مشغولة";
I18N.en["Temperaturen (HACCP)"] = "Temperatures (HACCP)";
I18N.fr["Temperaturen (HACCP)"] = "Températures (HACCP)";
I18N.it["Temperaturen (HACCP)"] = "Temperature (HACCP)";
I18N.es["Temperaturen (HACCP)"] = "Temperaturas (APPCC)";
I18N.pt["Temperaturen (HACCP)"] = "Temperaturas (HACCP)";
I18N.tr["Temperaturen (HACCP)"] = "Sıcaklıklar (HACCP)";
I18N.ja["Temperaturen (HACCP)"] = "温度（HACCP）";
I18N.zh["Temperaturen (HACCP)"] = "温度（HACCP）";
I18N.ar["Temperaturen (HACCP)"] = "درجات الحرارة (HACCP)";
I18N.en["Uhrzeit"] = "Time";
I18N.fr["Uhrzeit"] = "Heure";
I18N.it["Uhrzeit"] = "Ora";
I18N.es["Uhrzeit"] = "Hora";
I18N.pt["Uhrzeit"] = "Hora";
I18N.tr["Uhrzeit"] = "Saat";
I18N.ja["Uhrzeit"] = "時刻";
I18N.zh["Uhrzeit"] = "时间";
I18N.ar["Uhrzeit"] = "الوقت";
I18N.en["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "Below minimum stock – purchasing has been notified.";
I18N.fr["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "Sous le stock minimum – les achats ont été prévenus.";
I18N.it["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "Sotto la scorta minima – l’ufficio acquisti è stato avvisato.";
I18N.es["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "Por debajo del mínimo – se ha avisado a compras.";
I18N.pt["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "Abaixo do stock mínimo – as compras foram avisadas.";
I18N.tr["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "Asgari stokun altında – satın alma bilgilendirildi.";
I18N.ja["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "最低在庫を下回りました。購買に通知しました。";
I18N.zh["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "低于最低库存 – 已通知采购。";
I18N.ar["Unter Mindestbestand – der Einkauf wurde benachrichtigt."] = "أقل من الحد الأدنى – تم إبلاغ المشتريات.";
I18N.en["Unter Mindestbestand:"] = "Below minimum stock:";
I18N.fr["Unter Mindestbestand:"] = "Sous le stock minimum :";
I18N.it["Unter Mindestbestand:"] = "Sotto la scorta minima:";
I18N.es["Unter Mindestbestand:"] = "Por debajo del mínimo:";
I18N.pt["Unter Mindestbestand:"] = "Abaixo do stock mínimo:";
I18N.tr["Unter Mindestbestand:"] = "Asgari stokun altında:";
I18N.ja["Unter Mindestbestand:"] = "最低在庫未満：";
I18N.zh["Unter Mindestbestand:"] = "低于最低库存：";
I18N.ar["Unter Mindestbestand:"] = "أقل من الحد الأدنى:";
I18N.en["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "Delete briefing? All confirmations will be removed.";
I18N.fr["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "Supprimer la consigne ? Toutes les confirmations seront supprimées.";
I18N.it["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "Eliminare l’istruzione? Tutte le conferme verranno rimosse.";
I18N.es["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "¿Eliminar la instrucción? Se borrarán todas las confirmaciones.";
I18N.pt["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "Eliminar a instrução? Todas as confirmações serão removidas.";
I18N.tr["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "Talimat silinsin mi? Tüm onaylar silinir.";
I18N.ja["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "指導を削除しますか？確認記録もすべて削除されます。";
I18N.zh["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "删除此培训？所有确认记录都会被删除。";
I18N.ar["Unterweisung löschen? Alle Bestätigungen werden entfernt."] = "حذف التعليمات؟ ستُحذف جميع التأكيدات.";
I18N.en["Verlauf"] = "History";
I18N.fr["Verlauf"] = "Historique";
I18N.it["Verlauf"] = "Cronologia";
I18N.es["Verlauf"] = "Historial";
I18N.pt["Verlauf"] = "Histórico";
I18N.tr["Verlauf"] = "Geçmiş";
I18N.ja["Verlauf"] = "履歴";
I18N.zh["Verlauf"] = "记录";
I18N.ar["Verlauf"] = "السجل";
I18N.en["Wartungsplan löschen?"] = "Delete maintenance plan?";
I18N.fr["Wartungsplan löschen?"] = "Supprimer le plan de maintenance ?";
I18N.it["Wartungsplan löschen?"] = "Eliminare il piano di manutenzione?";
I18N.es["Wartungsplan löschen?"] = "¿Eliminar el plan de mantenimiento?";
I18N.pt["Wartungsplan löschen?"] = "Eliminar o plano de manutenção?";
I18N.tr["Wartungsplan löschen?"] = "Bakım planı silinsin mi?";
I18N.ja["Wartungsplan löschen?"] = "保守計画を削除しますか？";
I18N.zh["Wartungsplan löschen?"] = "删除此维护计划？";
I18N.ar["Wartungsplan löschen?"] = "حذف خطة الصيانة؟";
I18N.en["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "What must everyone know? Where are fire extinguishers, the assembly point, whom to call …";
I18N.fr["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "Que doit savoir chacun ? Où sont les extincteurs, le point de rassemblement, qui appeler …";
I18N.it["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "Cosa deve sapere ciascuno? Dove sono gli estintori, il punto di raccolta, chi chiamare …";
I18N.es["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "¿Qué debe saber cada persona? Dónde están los extintores, el punto de encuentro, a quién llamar …";
I18N.pt["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "O que cada pessoa tem de saber? Onde estão os extintores, o ponto de encontro, quem chamar …";
I18N.tr["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "Herkes neyi bilmeli? Yangın söndürücüler, toplanma noktası nerede, kimi arayacağım …";
I18N.ja["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "全員が知っておくべきことは？消火器や集合場所の位置、連絡先など…";
I18N.zh["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "每个人需要知道什么？灭火器在哪里、集合点、该联系谁……";
I18N.ar["Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …"] = "ما الذي يجب أن يعرفه الجميع؟ أين طفايات الحريق ونقطة التجمع وبمن أتصل …";
I18N.en["Was wurde gefunden?"] = "What was found?";
I18N.fr["Was wurde gefunden?"] = "Qu’a-t-on trouvé ?";
I18N.it["Was wurde gefunden?"] = "Cosa è stato trovato?";
I18N.es["Was wurde gefunden?"] = "¿Qué se ha encontrado?";
I18N.pt["Was wurde gefunden?"] = "O que foi encontrado?";
I18N.tr["Was wurde gefunden?"] = "Ne bulundu?";
I18N.ja["Was wurde gefunden?"] = "何が見つかりましたか？";
I18N.zh["Was wurde gefunden?"] = "拾到了什么？";
I18N.ar["Was wurde gefunden?"] = "ما الذي عُثر عليه؟";
I18N.en["Was wünscht der Gast?"] = "What does the guest need?";
I18N.fr["Was wünscht der Gast?"] = "Que souhaite le client ?";
I18N.it["Was wünscht der Gast?"] = "Cosa desidera l’ospite?";
I18N.es["Was wünscht der Gast?"] = "¿Qué desea el huésped?";
I18N.pt["Was wünscht der Gast?"] = "O que deseja o hóspede?";
I18N.tr["Was wünscht der Gast?"] = "Misafir ne istiyor?";
I18N.ja["Was wünscht der Gast?"] = "お客様のご要望は？";
I18N.zh["Was wünscht der Gast?"] = "客人需要什么？";
I18N.ar["Was wünscht der Gast?"] = "ماذا يريد الضيف؟";
I18N.en["Was?"] = "What?";
I18N.fr["Was?"] = "Quoi ?";
I18N.it["Was?"] = "Cosa?";
I18N.es["Was?"] = "¿Qué?";
I18N.pt["Was?"] = "O quê?";
I18N.tr["Was?"] = "Ne?";
I18N.ja["Was?"] = "内容";
I18N.zh["Was?"] = "什么？";
I18N.ar["Was?"] = "ماذا؟";
I18N.en["Wiederholen nach Monaten (leer = einmalig)"] = "Repeat after months (empty = once)";
I18N.fr["Wiederholen nach Monaten (leer = einmalig)"] = "Répéter après X mois (vide = une fois)";
I18N.it["Wiederholen nach Monaten (leer = einmalig)"] = "Ripeti dopo mesi (vuoto = una volta)";
I18N.es["Wiederholen nach Monaten (leer = einmalig)"] = "Repetir tras meses (vacío = una vez)";
I18N.pt["Wiederholen nach Monaten (leer = einmalig)"] = "Repetir após meses (vazio = uma vez)";
I18N.tr["Wiederholen nach Monaten (leer = einmalig)"] = "Kaç ayda bir tekrarla (boş = bir kez)";
I18N.ja["Wiederholen nach Monaten (leer = einmalig)"] = "繰り返し（か月、空欄 = 1 回のみ）";
I18N.zh["Wiederholen nach Monaten (leer = einmalig)"] = "每隔几个月重复（留空 = 仅一次）";
I18N.ar["Wiederholen nach Monaten (leer = einmalig)"] = "التكرار بعد أشهر (فارغ = مرة واحدة)";
I18N.en["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "Recurring work such as filter changes, legionella tests or fire extinguisher checks. On the due date a report is created automatically for the responsible department.";
I18N.fr["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "Travaux récurrents comme le changement de filtres, le contrôle légionelles ou des extincteurs. À l’échéance, un signalement est créé automatiquement pour le service responsable.";
I18N.it["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "Lavori ricorrenti come cambio filtri, controllo legionella o degli estintori. Alla scadenza viene creata automaticamente una segnalazione per il reparto responsabile.";
I18N.es["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "Trabajos periódicos como cambio de filtros, control de legionela o de extintores. En la fecha prevista se crea automáticamente un aviso para el departamento responsable.";
I18N.pt["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "Trabalhos recorrentes como troca de filtros, controlo de legionela ou de extintores. Na data prevista é criada automaticamente uma ocorrência para o departamento responsável.";
I18N.tr["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "Filtre değişimi, lejyonella testi veya yangın söndürücü kontrolü gibi tekrarlayan işler. Vade gününde sorumlu departman için otomatik bildirim oluşturulur.";
I18N.ja["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "フィルター交換、レジオネラ検査、消火器点検などの定期作業。期日になると担当部門に報告が自動作成されます。";
I18N.zh["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "定期工作，如更换过滤器、军团菌检测或灭火器检查。到期当天会自动为负责部门创建报修。";
I18N.ar["Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung."] = "أعمال دورية مثل تغيير الفلاتر وفحص الليجيونيلا وطفايات الحريق. في تاريخ الاستحقاق يُنشأ بلاغ تلقائيًا للقسم المسؤول.";
I18N.en["Zugang"] = "Add";
I18N.fr["Zugang"] = "Entrée";
I18N.it["Zugang"] = "Carico";
I18N.es["Zugang"] = "Entrada";
I18N.pt["Zugang"] = "Entrada";
I18N.tr["Zugang"] = "Giriş";
I18N.ja["Zugang"] = "入庫";
I18N.zh["Zugang"] = "入库";
I18N.ar["Zugang"] = "إضافة";
I18N.en["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "To clock in, scan the QR code at the staff entrance with your phone camera.";
I18N.fr["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "Pour pointer, scanne le QR code à l’entrée du personnel avec l’appareil photo.";
I18N.it["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "Per timbrare, scansiona il QR code all’ingresso del personale con la fotocamera.";
I18N.es["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "Para fichar, escanea el código QR de la entrada de personal con la cámara del móvil.";
I18N.pt["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "Para registar, lê o código QR na entrada do pessoal com a câmara do telemóvel.";
I18N.tr["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "Giriş için personel girişindeki QR kodu telefon kamerasıyla tara.";
I18N.ja["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "打刻するには、従業員入口の QR コードをスマホのカメラで読み取ってください。";
I18N.zh["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "打卡请用手机相机扫描员工入口的二维码。";
I18N.ar["Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen."] = "للتسجيل امسح رمز QR عند مدخل الموظفين بكاميرا الهاتف.";
I18N.en["Zurückgegeben an"] = "Returned to";
I18N.fr["Zurückgegeben an"] = "Restitué à";
I18N.it["Zurückgegeben an"] = "Restituito a";
I18N.es["Zurückgegeben an"] = "Devuelto a";
I18N.pt["Zurückgegeben an"] = "Devolvido a";
I18N.tr["Zurückgegeben an"] = "İade edilen kişi";
I18N.ja["Zurückgegeben an"] = "返却先";
I18N.zh["Zurückgegeben an"] = "归还给";
I18N.ar["Zurückgegeben an"] = "أُعيد إلى";
I18N.en["alle {0} Monate"] = "every {0} months";
I18N.fr["alle {0} Monate"] = "tous les {0} mois";
I18N.it["alle {0} Monate"] = "ogni {0} mesi";
I18N.es["alle {0} Monate"] = "cada {0} meses";
I18N.pt["alle {0} Monate"] = "a cada {0} meses";
I18N.tr["alle {0} Monate"] = "{0} ayda bir";
I18N.ja["alle {0} Monate"] = "{0} か月ごと";
I18N.zh["alle {0} Monate"] = "每 {0} 个月";
I18N.ar["alle {0} Monate"] = "كل {0} أشهر";
I18N.en["alle {0} {1}"] = "every {0} {1}";
I18N.fr["alle {0} {1}"] = "tous les {0} {1}";
I18N.it["alle {0} {1}"] = "ogni {0} {1}";
I18N.es["alle {0} {1}"] = "cada {0} {1}";
I18N.pt["alle {0} {1}"] = "a cada {0} {1}";
I18N.tr["alle {0} {1}"] = "her {0} {1}";
I18N.ja["alle {0} {1}"] = "{0}{1}ごと";
I18N.zh["alle {0} {1}"] = "每 {0} {1}";
I18N.ar["alle {0} {1}"] = "كل {0} {1}";
I18N.en["bestätigt"] = "confirmed";
I18N.fr["bestätigt"] = "confirmé";
I18N.it["bestätigt"] = "confermato";
I18N.es["bestätigt"] = "confirmado";
I18N.pt["bestätigt"] = "confirmado";
I18N.tr["bestätigt"] = "onaylandı";
I18N.ja["bestätigt"] = "確認済み";
I18N.zh["bestätigt"] = "已确认";
I18N.ar["bestätigt"] = "مؤكَّد";
I18N.en["erneuern"] = "renew";
I18N.fr["erneuern"] = "à renouveler";
I18N.it["erneuern"] = "da rinnovare";
I18N.es["erneuern"] = "renovar";
I18N.pt["erneuern"] = "renovar";
I18N.tr["erneuern"] = "yenile";
I18N.ja["erneuern"] = "更新が必要";
I18N.zh["erneuern"] = "需更新";
I18N.ar["erneuern"] = "تجديد";
I18N.en["geplant {0}"] = "planned {0}";
I18N.fr["geplant {0}"] = "prévu {0}";
I18N.it["geplant {0}"] = "previste {0}";
I18N.es["geplant {0}"] = "planificado {0}";
I18N.pt["geplant {0}"] = "planeado {0}";
I18N.tr["geplant {0}"] = "planlanan {0}";
I18N.ja["geplant {0}"] = "予定 {0}";
I18N.zh["geplant {0}"] = "计划 {0}";
I18N.ar["geplant {0}"] = "مخطط {0}";
I18N.en["gültig bis {0}"] = "valid until {0}";
I18N.fr["gültig bis {0}"] = "valable jusqu’au {0}";
I18N.it["gültig bis {0}"] = "valido fino al {0}";
I18N.es["gültig bis {0}"] = "válido hasta el {0}";
I18N.pt["gültig bis {0}"] = "válido até {0}";
I18N.tr["gültig bis {0}"] = "{0} tarihine kadar geçerli";
I18N.ja["gültig bis {0}"] = "{0} まで有効";
I18N.zh["gültig bis {0}"] = "有效期至 {0}";
I18N.ar["gültig bis {0}"] = "صالح حتى {0}";
I18N.en["keine Belegungsdaten"] = "no occupancy data";
I18N.fr["keine Belegungsdaten"] = "pas de données d’occupation";
I18N.it["keine Belegungsdaten"] = "nessun dato di occupazione";
I18N.es["keine Belegungsdaten"] = "sin datos de ocupación";
I18N.pt["keine Belegungsdaten"] = "sem dados de ocupação";
I18N.tr["keine Belegungsdaten"] = "doluluk verisi yok";
I18N.ja["keine Belegungsdaten"] = "在室データなし";
I18N.zh["keine Belegungsdaten"] = "无入住数据";
I18N.ar["keine Belegungsdaten"] = "لا توجد بيانات إشغال";
I18N.en["max. °C"] = "max. °C";
I18N.fr["max. °C"] = "max. °C";
I18N.it["max. °C"] = "max. °C";
I18N.es["max. °C"] = "máx. °C";
I18N.pt["max. °C"] = "máx. °C";
I18N.tr["max. °C"] = "maks. °C";
I18N.ja["max. °C"] = "最高 °C";
I18N.zh["max. °C"] = "最高 °C";
I18N.ar["max. °C"] = "الحد الأقصى °م";
I18N.en["min. °C"] = "min. °C";
I18N.fr["min. °C"] = "min. °C";
I18N.it["min. °C"] = "min. °C";
I18N.es["min. °C"] = "mín. °C";
I18N.pt["min. °C"] = "mín. °C";
I18N.tr["min. °C"] = "min. °C";
I18N.ja["min. °C"] = "最低 °C";
I18N.zh["min. °C"] = "最低 °C";
I18N.ar["min. °C"] = "الحد الأدنى °م";
I18N.en["mindestens"] = "at least";
I18N.fr["mindestens"] = "au moins";
I18N.it["mindestens"] = "almeno";
I18N.es["mindestens"] = "como mínimo";
I18N.pt["mindestens"] = "no mínimo";
I18N.tr["mindestens"] = "en az";
I18N.ja["mindestens"] = "最低";
I18N.zh["mindestens"] = "至少";
I18N.ar["mindestens"] = "على الأقل";
I18N.en["nachbestellt"] = "reordered";
I18N.fr["nachbestellt"] = "recommandé";
I18N.it["nachbestellt"] = "riordinato";
I18N.es["nachbestellt"] = "pedido";
I18N.pt["nachbestellt"] = "encomendado";
I18N.tr["nachbestellt"] = "sipariş verildi";
I18N.ja["nachbestellt"] = "発注済み";
I18N.zh["nachbestellt"] = "已补货下单";
I18N.ar["nachbestellt"] = "تمت إعادة الطلب";
I18N.en["offline"] = "offline";
I18N.fr["offline"] = "hors ligne";
I18N.it["offline"] = "offline";
I18N.es["offline"] = "sin conexión";
I18N.pt["offline"] = "offline";
I18N.tr["offline"] = "çevrimdışı";
I18N.ja["offline"] = "オフライン";
I18N.zh["offline"] = "离线";
I18N.ar["offline"] = "دون اتصال";
I18N.en["seit {0} Tagen"] = "for {0} days";
I18N.fr["seit {0} Tagen"] = "depuis {0} jours";
I18N.it["seit {0} Tagen"] = "da {0} giorni";
I18N.es["seit {0} Tagen"] = "desde hace {0} días";
I18N.pt["seit {0} Tagen"] = "há {0} dias";
I18N.tr["seit {0} Tagen"] = "{0} gündür";
I18N.ja["seit {0} Tagen"] = "{0} 日経過";
I18N.zh["seit {0} Tagen"] = "已 {0} 天";
I18N.ar["seit {0} Tagen"] = "منذ {0} يومًا";
I18N.en["z. B. Brandschutz und Fluchtwege"] = "e.g. fire safety and escape routes";
I18N.fr["z. B. Brandschutz und Fluchtwege"] = "p. ex. sécurité incendie et évacuation";
I18N.it["z. B. Brandschutz und Fluchtwege"] = "es. antincendio e vie di fuga";
I18N.es["z. B. Brandschutz und Fluchtwege"] = "p. ej. incendios y evacuación";
I18N.pt["z. B. Brandschutz und Fluchtwege"] = "p. ex. incêndio e evacuação";
I18N.tr["z. B. Brandschutz und Fluchtwege"] = "ör. yangın güvenliği ve kaçış yolları";
I18N.ja["z. B. Brandschutz und Fluchtwege"] = "例：防火と避難経路";
I18N.zh["z. B. Brandschutz und Fluchtwege"] = "例如 消防与疏散通道";
I18N.ar["z. B. Brandschutz und Fluchtwege"] = "مثل السلامة من الحريق ومخارج الطوارئ";
I18N.en["z. B. Duschgel 30 ml, Handtuch groß"] = "e.g. shower gel 30 ml, large towel";
I18N.fr["z. B. Duschgel 30 ml, Handtuch groß"] = "p. ex. gel douche 30 ml, grande serviette";
I18N.it["z. B. Duschgel 30 ml, Handtuch groß"] = "es. bagnoschiuma 30 ml, asciugamano grande";
I18N.es["z. B. Duschgel 30 ml, Handtuch groß"] = "p. ej. gel de ducha 30 ml, toalla grande";
I18N.pt["z. B. Duschgel 30 ml, Handtuch groß"] = "p. ex. gel de banho 30 ml, toalha grande";
I18N.tr["z. B. Duschgel 30 ml, Handtuch groß"] = "ör. duş jeli 30 ml, büyük havlu";
I18N.ja["z. B. Duschgel 30 ml, Handtuch groß"] = "例：ボディソープ 30 ml、大判タオル";
I18N.zh["z. B. Duschgel 30 ml, Handtuch groß"] = "例如 沐浴露 30 ml、大毛巾";
I18N.ar["z. B. Duschgel 30 ml, Handtuch groß"] = "مثل جل استحمام 30 مل، منشفة كبيرة";
I18N.en["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "e.g. extra towels, baby cot, wake-up call 6 am";
I18N.fr["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "p. ex. serviettes en plus, lit bébé, réveil 6 h";
I18N.it["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "es. asciugamani extra, culla, sveglia alle 6";
I18N.es["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "p. ej. toallas extra, cuna, despertador a las 6";
I18N.pt["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "p. ex. toalhas extra, berço, despertar às 6h";
I18N.tr["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "ör. ekstra havlu, bebek yatağı, saat 6’da uyandırma";
I18N.ja["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "例：追加タオル、ベビーベッド、6 時のモーニングコール";
I18N.zh["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "例如 加毛巾、婴儿床、6 点叫醒";
I18N.ar["z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr"] = "مثل مناشف إضافية، سرير أطفال، تنبيه الساعة 6";
I18N.en["z. B. Fundschrank Rezeption, Fach 3"] = "e.g. reception lost property cupboard, shelf 3";
I18N.fr["z. B. Fundschrank Rezeption, Fach 3"] = "p. ex. armoire réception, case 3";
I18N.it["z. B. Fundschrank Rezeption, Fach 3"] = "es. armadio reception, ripiano 3";
I18N.es["z. B. Fundschrank Rezeption, Fach 3"] = "p. ej. armario de recepción, balda 3";
I18N.pt["z. B. Fundschrank Rezeption, Fach 3"] = "p. ex. armário da receção, prateleira 3";
I18N.tr["z. B. Fundschrank Rezeption, Fach 3"] = "ör. resepsiyon dolabı, raf 3";
I18N.ja["z. B. Fundschrank Rezeption, Fach 3"] = "例：フロントの遺失物棚 3 段目";
I18N.zh["z. B. Fundschrank Rezeption, Fach 3"] = "例如 前台失物柜第 3 格";
I18N.ar["z. B. Fundschrank Rezeption, Fach 3"] = "مثل خزانة الاستقبال، الرف 3";
I18N.en["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "e.g. cold room 1, freezer, breakfast buffet";
I18N.fr["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "p. ex. chambre froide 1, congélateur, buffet du petit-déjeuner";
I18N.it["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "es. cella 1, congelatore, buffet colazione";
I18N.es["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "p. ej. cámara 1, congelador, bufé de desayuno";
I18N.pt["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "p. ex. câmara 1, congelador, buffet do pequeno-almoço";
I18N.tr["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "ör. soğuk oda 1, derin dondurucu, kahvaltı büfesi";
I18N.ja["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "例：冷蔵室 1、冷凍庫、朝食ビュッフェ";
I18N.zh["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "例如 1 号冷库、冷冻柜、早餐台";
I18N.ar["z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet"] = "مثل غرفة التبريد 1، المجمّد، بوفيه الإفطار";
I18N.en["z. B. Lüftungsfilter tauschen"] = "e.g. replace ventilation filters";
I18N.fr["z. B. Lüftungsfilter tauschen"] = "p. ex. changer les filtres de ventilation";
I18N.it["z. B. Lüftungsfilter tauschen"] = "es. sostituire i filtri di ventilazione";
I18N.es["z. B. Lüftungsfilter tauschen"] = "p. ej. cambiar filtros de ventilación";
I18N.pt["z. B. Lüftungsfilter tauschen"] = "p. ex. trocar filtros de ventilação";
I18N.tr["z. B. Lüftungsfilter tauschen"] = "ör. havalandırma filtrelerini değiştir";
I18N.ja["z. B. Lüftungsfilter tauschen"] = "例：換気フィルターの交換";
I18N.zh["z. B. Lüftungsfilter tauschen"] = "例如 更换通风过滤器";
I18N.ar["z. B. Lüftungsfilter tauschen"] = "مثل تغيير فلاتر التهوية";
I18N.en["z. B. Technikraum"] = "e.g. plant room";
I18N.fr["z. B. Technikraum"] = "p. ex. local technique";
I18N.it["z. B. Technikraum"] = "es. locale tecnico";
I18N.es["z. B. Technikraum"] = "p. ej. sala técnica";
I18N.pt["z. B. Technikraum"] = "p. ex. sala técnica";
I18N.tr["z. B. Technikraum"] = "ör. teknik oda";
I18N.ja["z. B. Technikraum"] = "例：機械室";
I18N.zh["z. B. Technikraum"] = "例如 设备间";
I18N.ar["z. B. Technikraum"] = "مثل غرفة المعدات";
I18N.en["z. B. Zimmer 214, Restaurant"] = "e.g. room 214, restaurant";
I18N.fr["z. B. Zimmer 214, Restaurant"] = "p. ex. chambre 214, restaurant";
I18N.it["z. B. Zimmer 214, Restaurant"] = "es. camera 214, ristorante";
I18N.es["z. B. Zimmer 214, Restaurant"] = "p. ej. habitación 214, restaurante";
I18N.pt["z. B. Zimmer 214, Restaurant"] = "p. ex. quarto 214, restaurante";
I18N.tr["z. B. Zimmer 214, Restaurant"] = "ör. oda 214, restoran";
I18N.ja["z. B. Zimmer 214, Restaurant"] = "例：214号室、レストラン";
I18N.zh["z. B. Zimmer 214, Restaurant"] = "例如 214 房、餐厅";
I18N.ar["z. B. Zimmer 214, Restaurant"] = "مثل الغرفة 214، المطعم";
I18N.en["z. B. Zimmer 305"] = "e.g. room 305";
I18N.fr["z. B. Zimmer 305"] = "p. ex. chambre 305";
I18N.it["z. B. Zimmer 305"] = "es. camera 305";
I18N.es["z. B. Zimmer 305"] = "p. ej. habitación 305";
I18N.pt["z. B. Zimmer 305"] = "p. ex. quarto 305";
I18N.tr["z. B. Zimmer 305"] = "ör. oda 305";
I18N.ja["z. B. Zimmer 305"] = "例：305号室";
I18N.zh["z. B. Zimmer 305"] = "例如 305 房";
I18N.ar["z. B. Zimmer 305"] = "مثل الغرفة 305";
I18N.en["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "e.g. black leather jacket, charging cable, glasses";
I18N.fr["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "p. ex. veste en cuir noire, câble de charge, lunettes";
I18N.it["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "es. giacca di pelle nera, cavo di ricarica, occhiali";
I18N.es["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "p. ej. chaqueta de cuero negra, cable de carga, gafas";
I18N.pt["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "p. ex. casaco de pele preto, cabo de carregamento, óculos";
I18N.tr["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "ör. siyah deri ceket, şarj kablosu, gözlük";
I18N.ja["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "例：黒い革ジャケット、充電ケーブル、眼鏡";
I18N.zh["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "例如 黑色皮夹克、充电线、眼镜";
I18N.ar["z. B. schwarze Lederjacke, Ladekabel, Brille"] = "مثل سترة جلدية سوداء، كابل شحن، نظارة";
I18N.en["{0} Buchungen warten auf Netz."] = "{0} entries are waiting for a signal.";
I18N.fr["{0} Buchungen warten auf Netz."] = "{0} pointages attendent le réseau.";
I18N.it["{0} Buchungen warten auf Netz."] = "{0} timbrature in attesa di rete.";
I18N.es["{0} Buchungen warten auf Netz."] = "{0} fichajes esperan conexión.";
I18N.pt["{0} Buchungen warten auf Netz."] = "{0} registos à espera de rede.";
I18N.tr["{0} Buchungen warten auf Netz."] = "{0} kayıt bağlantı bekliyor.";
I18N.ja["{0} Buchungen warten auf Netz."] = "{0} 件の打刻が通信待ちです。";
I18N.zh["{0} Buchungen warten auf Netz."] = "{0} 条记录等待联网。";
I18N.ar["{0} Buchungen warten auf Netz."] = "{0} تسجيلات بانتظار الشبكة.";
I18N.en["{0} Schichten als Entwurf eingetragen."] = "{0} shifts added as a draft.";
I18N.fr["{0} Schichten als Entwurf eingetragen."] = "{0} postes ajoutés en brouillon.";
I18N.it["{0} Schichten als Entwurf eingetragen."] = "{0} turni inseriti come bozza.";
I18N.es["{0} Schichten als Entwurf eingetragen."] = "{0} turnos añadidos como borrador.";
I18N.pt["{0} Schichten als Entwurf eingetragen."] = "{0} turnos adicionados como rascunho.";
I18N.tr["{0} Schichten als Entwurf eingetragen."] = "{0} vardiya taslak olarak eklendi.";
I18N.ja["{0} Schichten als Entwurf eingetragen."] = "{0} シフトを下書きとして追加しました。";
I18N.zh["{0} Schichten als Entwurf eingetragen."] = "已添加 {0} 个班次（草稿）。";
I18N.ar["{0} Schichten als Entwurf eingetragen."] = "تمت إضافة {0} مناوبة كمسودة.";
I18N.en["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} shifts remain open (too few people, availability or rest time).";
I18N.fr["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} postes restent libres (trop peu de personnes, disponibilités ou repos).";
I18N.it["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} turni restano scoperti (poche persone, disponibilità o riposo).";
I18N.es["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} turnos quedan sin cubrir (pocas personas, disponibilidad o descanso).";
I18N.pt["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} turnos ficam por preencher (poucas pessoas, disponibilidade ou descanso).";
I18N.tr["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} vardiya boş kalıyor (az kişi, müsaitlik veya dinlenme süresi).";
I18N.ja["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} シフトが未充足です（人数・勤務可能日・休息時間の不足）。";
I18N.zh["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "{0} 个班次无法安排（人手、可上班时间或休息时间不足）。";
I18N.ar["{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit)."] = "تبقى {0} مناوبات شاغرة (أشخاص قليلون أو التوفر أو الراحة).";
I18N.en["{0} Schichten bleiben offen."] = "{0} shifts remain open.";
I18N.fr["{0} Schichten bleiben offen."] = "{0} postes restent libres.";
I18N.it["{0} Schichten bleiben offen."] = "{0} turni restano scoperti.";
I18N.es["{0} Schichten bleiben offen."] = "{0} turnos quedan sin cubrir.";
I18N.pt["{0} Schichten bleiben offen."] = "{0} turnos ficam por preencher.";
I18N.tr["{0} Schichten bleiben offen."] = "{0} vardiya boş kalıyor.";
I18N.ja["{0} Schichten bleiben offen."] = "{0} シフトが未充足です。";
I18N.zh["{0} Schichten bleiben offen."] = "{0} 个班次仍空缺。";
I18N.ar["{0} Schichten bleiben offen."] = "تبقى {0} مناوبات شاغرة.";
I18N.en["{0} Schichten eintragen?"] = "Add {0} shifts?";
I18N.fr["{0} Schichten eintragen?"] = "Ajouter {0} postes ?";
I18N.it["{0} Schichten eintragen?"] = "Inserire {0} turni?";
I18N.es["{0} Schichten eintragen?"] = "¿Añadir {0} turnos?";
I18N.pt["{0} Schichten eintragen?"] = "Adicionar {0} turnos?";
I18N.tr["{0} Schichten eintragen?"] = "{0} vardiya eklensin mi?";
I18N.ja["{0} Schichten eintragen?"] = "{0} シフトを追加しますか？";
I18N.zh["{0} Schichten eintragen?"] = "添加 {0} 个班次？";
I18N.ar["{0} Schichten eintragen?"] = "إضافة {0} مناوبة؟";
I18N.en["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} briefings are waiting for your confirmation.";
I18N.fr["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} consignes attendent ta confirmation.";
I18N.it["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} istruzioni attendono la tua conferma.";
I18N.es["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} instrucciones esperan tu confirmación.";
I18N.pt["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} instruções aguardam a tua confirmação.";
I18N.tr["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} talimat onayını bekliyor.";
I18N.ja["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} 件の指導があなたの確認を待っています。";
I18N.zh["{0} Unterweisungen warten auf deine Bestätigung."] = "有 {0} 项培训等待你确认。";
I18N.ar["{0} Unterweisungen warten auf deine Bestätigung."] = "{0} تعليمات بانتظار تأكيدك.";
I18N.en["{0} Zimmer gereinigt"] = "{0} rooms cleaned";
I18N.fr["{0} Zimmer gereinigt"] = "{0} chambres nettoyées";
I18N.it["{0} Zimmer gereinigt"] = "{0} camere pulite";
I18N.es["{0} Zimmer gereinigt"] = "{0} habitaciones limpiadas";
I18N.pt["{0} Zimmer gereinigt"] = "{0} quartos limpos";
I18N.tr["{0} Zimmer gereinigt"] = "{0} oda temizlendi";
I18N.ja["{0} Zimmer gereinigt"] = "{0} 室清掃";
I18N.zh["{0} Zimmer gereinigt"] = "已清扫 {0} 间";
I18N.ar["{0} Zimmer gereinigt"] = "تم تنظيف {0} غرفة";
I18N.en["{0} Zimmernächte"] = "{0} room nights";
I18N.fr["{0} Zimmernächte"] = "{0} nuitées";
I18N.it["{0} Zimmernächte"] = "{0} notti camera";
I18N.es["{0} Zimmernächte"] = "{0} noches de habitación";
I18N.pt["{0} Zimmernächte"] = "{0} noites de quarto";
I18N.tr["{0} Zimmernächte"] = "{0} oda gecesi";
I18N.ja["{0} Zimmernächte"] = "{0} 室泊";
I18N.zh["{0} Zimmernächte"] = "{0} 间夜";
I18N.ar["{0} Zimmernächte"] = "{0} ليلة غرفة";
I18N.en["{0} außerhalb des Bereichs"] = "{0} out of range";
I18N.fr["{0} außerhalb des Bereichs"] = "{0} hors plage";
I18N.it["{0} außerhalb des Bereichs"] = "{0} fuori intervallo";
I18N.es["{0} außerhalb des Bereichs"] = "{0} fuera de rango";
I18N.pt["{0} außerhalb des Bereichs"] = "{0} fora do intervalo";
I18N.tr["{0} außerhalb des Bereichs"] = "{0} aralık dışında";
I18N.ja["{0} außerhalb des Bereichs"] = "範囲外 {0} 件";
I18N.zh["{0} außerhalb des Bereichs"] = "{0} 次超出范围";
I18N.ar["{0} außerhalb des Bereichs"] = "{0} خارج النطاق";
I18N.en["{0} dringend offen"] = "{0} urgent open";
I18N.fr["{0} dringend offen"] = "{0} urgents ouverts";
I18N.it["{0} dringend offen"] = "{0} urgenti aperte";
I18N.es["{0} dringend offen"] = "{0} urgentes abiertos";
I18N.pt["{0} dringend offen"] = "{0} urgentes em aberto";
I18N.tr["{0} dringend offen"] = "{0} acil açık";
I18N.ja["{0} dringend offen"] = "緊急の未対応 {0} 件";
I18N.zh["{0} dringend offen"] = "{0} 个紧急待处理";
I18N.ar["{0} dringend offen"] = "{0} عاجلة مفتوحة";
I18N.en["{0} erledigt · {1} offen"] = "{0} done · {1} open";
I18N.fr["{0} erledigt · {1} offen"] = "{0} terminés · {1} ouverts";
I18N.it["{0} erledigt · {1} offen"] = "{0} fatte · {1} aperte";
I18N.es["{0} erledigt · {1} offen"] = "{0} hechos · {1} abiertos";
I18N.pt["{0} erledigt · {1} offen"] = "{0} concluídas · {1} em aberto";
I18N.tr["{0} erledigt · {1} offen"] = "{0} tamamlandı · {1} açık";
I18N.ja["{0} erledigt · {1} offen"] = "完了 {0} · 未対応 {1}";
I18N.zh["{0} erledigt · {1} offen"] = "已完成 {0} · 待处理 {1}";
I18N.ar["{0} erledigt · {1} offen"] = "{0} منجزة · {1} مفتوحة";
I18N.en["{0} im Dienst"] = "{0} on duty";
I18N.fr["{0} im Dienst"] = "{0} en service";
I18N.it["{0} im Dienst"] = "{0} in servizio";
I18N.es["{0} im Dienst"] = "{0} de servicio";
I18N.pt["{0} im Dienst"] = "{0} em serviço";
I18N.tr["{0} im Dienst"] = "{0} görevde";
I18N.ja["{0} im Dienst"] = "勤務中 {0} 人";
I18N.zh["{0} im Dienst"] = "{0} 人在岗";
I18N.ar["{0} im Dienst"] = "{0} في الخدمة";
I18N.en["{0} offline erfasst"] = "{0} recorded offline";
I18N.fr["{0} offline erfasst"] = "{0} saisis hors ligne";
I18N.it["{0} offline erfasst"] = "{0} registrate offline";
I18N.es["{0} offline erfasst"] = "{0} registrados sin conexión";
I18N.pt["{0} offline erfasst"] = "{0} registados offline";
I18N.tr["{0} offline erfasst"] = "{0} çevrimdışı kaydedildi";
I18N.ja["{0} offline erfasst"] = "オフライン記録 {0} 件";
I18N.zh["{0} offline erfasst"] = "{0} 条离线记录";
I18N.ar["{0} offline erfasst"] = "{0} مسجَّلة دون اتصال";
I18N.en["{0} offline gespeicherte Buchungen gesendet."] = "{0} entries saved offline have been sent.";
I18N.fr["{0} offline gespeicherte Buchungen gesendet."] = "{0} pointages enregistrés hors ligne ont été envoyés.";
I18N.it["{0} offline gespeicherte Buchungen gesendet."] = "{0} timbrature salvate offline sono state inviate.";
I18N.es["{0} offline gespeicherte Buchungen gesendet."] = "{0} fichajes guardados sin conexión se han enviado.";
I18N.pt["{0} offline gespeicherte Buchungen gesendet."] = "{0} registos guardados offline foram enviados.";
I18N.tr["{0} offline gespeicherte Buchungen gesendet."] = "Çevrimdışı saklanan {0} kayıt gönderildi.";
I18N.ja["{0} offline gespeicherte Buchungen gesendet."] = "オフラインで保存した {0} 件の打刻を送信しました。";
I18N.zh["{0} offline gespeicherte Buchungen gesendet."] = "已发送 {0} 条离线保存的记录。";
I18N.ar["{0} offline gespeicherte Buchungen gesendet."] = "تم إرسال {0} تسجيلات محفوظة دون اتصال.";
I18N.en["{0}/{1} bereit"] = "{0}/{1} ready";
I18N.fr["{0}/{1} bereit"] = "{0}/{1} prêtes";
I18N.it["{0}/{1} bereit"] = "{0}/{1} pronte";
I18N.es["{0}/{1} bereit"] = "{0}/{1} listas";
I18N.pt["{0}/{1} bereit"] = "{0}/{1} prontos";
I18N.tr["{0}/{1} bereit"] = "{0}/{1} hazır";
I18N.ja["{0}/{1} bereit"] = "{0}/{1} 準備完了";
I18N.zh["{0}/{1} bereit"] = "{0}/{1} 已就绪";
I18N.ar["{0}/{1} bereit"] = "{0}/{1} جاهزة";
I18N.en["Ø Reinigungszeit"] = "Avg. cleaning time";
I18N.fr["Ø Reinigungszeit"] = "Temps de nettoyage moyen";
I18N.it["Ø Reinigungszeit"] = "Tempo medio di pulizia";
I18N.es["Ø Reinigungszeit"] = "Tiempo medio de limpieza";
I18N.pt["Ø Reinigungszeit"] = "Tempo médio de limpeza";
I18N.tr["Ø Reinigungszeit"] = "Ort. temizlik süresi";
I18N.ja["Ø Reinigungszeit"] = "平均清掃時間";
I18N.zh["Ø Reinigungszeit"] = "平均清扫时长";
I18N.ar["Ø Reinigungszeit"] = "متوسط وقت التنظيف";
I18N.en["Übersetzung anzeigen"] = "Show translation";
I18N.fr["Übersetzung anzeigen"] = "Afficher la traduction";
I18N.it["Übersetzung anzeigen"] = "Mostra traduzione";
I18N.es["Übersetzung anzeigen"] = "Mostrar traducción";
I18N.pt["Übersetzung anzeigen"] = "Mostrar tradução";
I18N.tr["Übersetzung anzeigen"] = "Çeviriyi göster";
I18N.ja["Übersetzung anzeigen"] = "翻訳を表示";
I18N.zh["Übersetzung anzeigen"] = "显示译文";
I18N.ar["Übersetzung anzeigen"] = "عرض الترجمة";

startI18n(initialUiLanguage());
