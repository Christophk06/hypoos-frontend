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

const LANGS = [["de","Deutsch"],["en","English"],["fr","Français"],["it","Italiano"],["es","Español"]];
const LOCALES = { de:"de-DE", en:"en-GB", fr:"fr-FR", it:"it-IT", es:"es-ES" };
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

startI18n(initialUiLanguage());
