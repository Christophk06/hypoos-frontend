// ------------------------------------------------------------ Bereiche je Hotel und kurze Hilfe
const MODULE_GROUPS = [
  ["Pre-Opening", [["tasks","Aufgaben"],["milestones","Meilensteine"],["timeline","Zeitstrahl"],["risks","Risiken"],["budget","Budget"],["staff","Personal"],["procurement","Bestellungen"]]],
  ["Betrieb", [["roster","Dienstplan"],["time","Zeiterfassung"],["rooms","Zimmerstatus"],["tickets","Meldungen"],["logbook","Übergabebuch"],["checklists","Checklisten"],["stock","Lager"],["arrivals","Anreisen"],["guestchat","Gäste-Chat"],["events","Veranstaltungen"],["invoices","Rechnungen"],["letters","Briefe & Vorlagen"],["reviews","Bewertungen"],["energy","Energie"],["lostfound","Fundsachen"],["trainings","Unterweisungen"],["chat","Chat"],["kpis","Kennzahlen"],["feedback","Gäste-Feedback"]]],
  ["Allgemein", [["docs","Dokumente"],["permits","Genehmigungen"]]],
];
const PRE_MODULES = MODULE_GROUPS[0][1].map(([k])=>k);
const OPS_MODULES = MODULE_GROUPS[1][1].map(([k])=>k);
// Phase des Hotels (Migration 029): "operations" = Im Betrieb – dann sind die Pre-Opening-Bereiche ausgeblendet
const inOperations = (hotel) => !!hotel && hotel.phase === "operations";
const hotelDisabled = (hotel) => {
  const off = (hotel && hotel.disabled_modules) || [];
  return inOperations(hotel) ? [...new Set([...off, ...PRE_MODULES])] : off;
};

// Hotel ist eröffnet, steht aber noch auf „In Eröffnung“: Wechsel in den Betrieb anbieten (nur Admins)
function PhaseHint({hotel, api, onHotel}){
  const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const [hidden,setHidden] = useState(() => { try { return window.localStorage.getItem("hpoos_phase_hint_"+hotel.id)==="1"; } catch(e){ return false; } });
  if(hidden || hotel.phase!=="opening" || !hotel.opening_date || hotel.opening_date > todayIso() || hotel.is_demo) return null;
  const go = async () => {
    setBusy(true); setError("");
    try { onHotel(await api("/api/hotels/"+hotel.id, "PATCH", {phase:"operations"})); }
    catch(e){ setError(e.message); setBusy(false); }
  };
  const later = () => { try { window.localStorage.setItem("hpoos_phase_hint_"+hotel.id, "1"); } catch(e){} setHidden(true); };
  return (
    <Card style={{marginBottom:18,borderColor:BRASS}}>
      <div style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600,marginBottom:4}}>{tf("Das Hotel ist eröffnet")}</div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Im Betrieb blendet Ouverture die Eröffnungsplanung aus und zeigt auf der Startseite die Kennzahlen des Hauses. Aufgaben, Budget und Berichte bleiben gespeichert und lassen sich jederzeit wieder einblenden.")}</div>
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button className="btn-primary" onClick={go} disabled={busy}>{busy ? tf("Speichert…") : tf("In den Betrieb wechseln")}</button>
        <button style={{...linkBtn,fontSize:13.5}} onClick={later}>{tf("Später")}</button>
      </div>
    </Card>
  );
}
const preOpeningOff = (hotel) => hotelDisabled(hotel).includes("tasks");

function ModulePicker({value, onChange}){
  const off = value || [];
  const toggle = (k) => onChange(off.includes(k) ? off.filter(x=>x!==k) : [...off, k]);
  const preset = (list) => onChange(list);
  const btn = {background:"#fff",border:`1px solid ${BORDER}`,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"};
  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <button type="button" style={btn} onClick={()=>preset(OPS_MODULES)}>{tf("Nur Pre-Opening")}</button>
        <button type="button" style={btn} onClick={()=>preset(PRE_MODULES)}>{tf("Nur laufender Betrieb")}</button>
        <button type="button" style={btn} onClick={()=>preset([])}>{tf("Alles")}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:12}}>
        {MODULE_GROUPS.map(([g, items])=>(
          <div key={g}>
            <div className="field-label">{g}</div>
            {items.map(([k,l])=>(
              <label key={k} style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,padding:"3px 0",cursor:"pointer"}}>
                <input type="checkbox" checked={!off.includes(k)} onChange={()=>toggle(k)} /> <span>{l}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Kurz erklärt – erscheint beim ersten Besuch eines Bereichs, danach über „?“
const HELP = {
  group: "Alle Hotels Ihrer Gruppe im Vergleich: Zimmer, Personal im Dienst, Auslastung, Durchschnittspreis, RevPAR, offene Meldungen, überfällige Aufgaben, Budget und Bewertungen. Ein Klick auf den Namen öffnet das Hotel.",
  invoices: "Rechnungen mit fortlaufender Nummer: Anzahlung und Schlussrechnung direkt aus der Veranstaltung, Steuer je Satz, PDF und Versand per E-Mail. Ausgestellte Rechnungen lassen sich nur stornieren, nicht ändern. Unter „Rechnungsdaten“ stehen Firma, UID und Bank.",
  letters: "Fertige Vorlagen für Reservierungsbestätigung, Storno, Willkommensbrief, Angebot, Veranstaltung und Gutschein – als Word, PDF oder per E-Mail. Eigene Word-Dateien mit Platzhaltern wie {guest_name} hochladen; sie werden automatisch befüllt.",
  dashboard: "Hier siehst du auf einen Blick, wie weit die Eröffnung ist: Bereitschaft je Abteilung, überfällige Aufgaben, Risiken und den KI-Lagebericht.",
  home: "Deine Schicht heute, Kommen und Gehen, deine Aufgaben und offene Punkte – alles, was du für den Tag brauchst.",
  mine: "Alle Aufgaben, für die du zuständig bist – über alle Hotels hinweg. Erledigtes einfach abhaken.",
  kpis: "Kennzahlen aus dem laufenden Betrieb: Stunden, Stunden je belegtem Zimmer, Reinigungszeit, Meldungen und HACCP. Den Zeitraum wählst du oben.",
  tasks: "Die Aufgabenliste der Eröffnung. Mit der Pre-Opening-Vorlage bekommst du über 90 typische Aufgaben; alle Termine hängen am Eröffnungsdatum. Filtern, zuweisen, kommentieren und Dateien anhängen.",
  milestones: "Die großen Etappen bis zur Eröffnung, zum Beispiel Übergabe des Gebäudes oder Soft Opening. Verschiebt sich ein Meilenstein, sieht es das ganze Team im Zeitstrahl.",
  timeline: "Alle Aufgaben und Meilensteine auf einer Zeitachse – ideal, um Engpässe und Abhängigkeiten zu erkennen.",
  risks: "Was die Eröffnung gefährden könnte, mit Wahrscheinlichkeit, Auswirkung und Gegenmaßnahme. Hohe Risiken fließen in den Bereitschafts-Score und den KI-Lagebericht ein.",
  budget: "Das Pre-Opening-Budget je Abteilung: geplant gegenüber ausgegeben. Überschreitungen werden rot markiert.",
  staff: "Der Stellenplan für die Eröffnung: welche Stellen besetzt sind, welche noch offen sind und ab wann sie gebraucht werden.",
  roster: "Der Wochenplan je Abteilung. Schichten anklicken oder ziehen, Mindestbesetzung und Bedarf aus der Belegung prüfen, mit dem Plan-Vorschlag automatisch füllen. Erst „Veröffentlichen“ macht die Woche für Mitarbeitende sichtbar.",
  time: "Kommen und Gehen per Knopfdruck – auch ohne Netz. Die Leitung sieht, wer im Dienst ist, korrigiert Buchungen und lädt die Monatsauswertung für die Lohnverrechnung herunter.",
  rooms: "Der Status jedes Zimmers: schmutzig, in Reinigung, sauber, kontrolliert. Zum Ändern das Zimmer antippen. Mit PMS-Anbindung kommen Belegung und Status automatisch.",
  tickets: "Mängel mit Foto melden, Gästewünsche weitergeben und Wartungen planen. Die zuständige Abteilung bekommt eine Nachricht aufs Handy.",
  logbook: "Das Übergabebuch für jede Schicht: Wichtiges festhalten, offene Punkte abhaken. Texte in anderen Sprachen werden automatisch übersetzt.",
  checklists: "Wiederkehrende Kontrollen wie Zimmerabnahme oder Schichtbeginn – jeden Tag am Handy abhaken. Oben stehen die HACCP-Temperaturen für die Küche.",
  stock: "Bestände je Abteilung mit Mindestbestand. Entnahmen mit − buchen; fällt ein Artikel unter das Minimum, bekommt der Einkauf automatisch eine Meldung.",
  lostfound: "Fundsachen mit Foto erfassen, den Aufbewahrungsort notieren und bei der Rückgabe festhalten, an wen.",
  trainings: "Unterweisungen wie Brandschutz oder Hygiene. Jede Person bestätigt mit „Gelesen und verstanden“, die Leitung sieht, wer noch fehlt.",
  chat: "Ein Kanal je Abteilung und einer für das ganze Hotel. Nachrichten in anderen Sprachen werden automatisch übersetzt.",
  docs: "Verträge, Pläne und Nachweise zentral ablegen – auf Wunsch direkt an einer Aufgabe.",
  team: "Personen einladen sowie Rollen und Abteilungen festlegen. Mitarbeitende sehen nur ihre eigene Abteilung.",
  procurement: "Alles, was bis zur Eröffnung bestellt werden muss – mit Menge, Lieferant, Bestell- und Liefertermin. Ouverture warnt, wenn eine Lieferung zu knapp vor der Eröffnung kommt.",
  permits: "Genehmigungen und behördliche Abnahmen mit Frist und Gültigkeit. Admins bekommen eine Erinnerung, bevor eine Frist abläuft.",
  feedback: "Gäste bewerten per QR-Code Zimmer, Sauberkeit, Service, Frühstück und Check-in – ideal im Probebetrieb. Kommentare in anderen Sprachen werden übersetzt.",
  arrivals: "Gäste der nächsten Tage – aus dem PMS oder aus einer Excel-Liste. Ouverture schreibt sie vor der Anreise an; Ankunftszeit, Wünsche und gebuchte Extras erscheinen hier.",
  reviews: "Bewertungen aus Google, Booking.com & Co. an einem Ort: Schnitt je Portal und Monat. Die KI fasst Lob und wiederkehrende Probleme zusammen – mit Abteilung und Vorschlag.",
  energy: "Zähler für Strom, Gas, Wasser und Wärme. Zählerstände eintragen – Ouverture rechnet den Verbrauch je Monat aus und warnt bei Ausreißern.",
  help: "Kurze Anleitungen zu allen Bereichen. Oben suchen oder ein Thema aufklappen.",
  events: "Hochzeiten, Tagungen und Feiern mit Datum, Raum, Personen, Menü, Aufbau und Technik. Das Function Sheet druckt alles für Küche, Service und Technik auf eine Seite.",
  guestchat: "Gäste schreiben über den QR-Code im Zimmer, die Rezeption antwortet hier. Nachrichten in anderen Sprachen werden übersetzt.",
};
const helpKey = (tab, role, hotel) => tab==="dashboard" ? (role==="member" ? "home" : preOpeningOff(hotel) ? "kpis" : "dashboard") : tab;
function helpSeen(key){ try { return window.localStorage.getItem("hpoos_help_"+key)==="1"; } catch(e){ return false; } }
function HelpTip({tab, role, hotel, open, onClose}){
  const key = helpKey(tab, role, hotel);
  const text = HELP[key];
  const [seen,setSeen] = useState(()=>helpSeen(key));
  useEffect(()=>{ setSeen(helpSeen(key)); },[key]);
  if(!text || (seen && !open)) return null;
  const close = () => { try { window.localStorage.setItem("hpoos_help_"+key,"1"); } catch(e){} setSeen(true); if(onClose) onClose(); };
  return (
    <div className="no-print" style={{display:"flex",gap:10,alignItems:"flex-start",background:"#F4F7FB",border:"1px solid #D6E2F0",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13.5,lineHeight:1.5}}>
      <span style={{fontSize:16}}>💡</span>
      <div style={{flex:1}}>{tf(text)}</div>
      <button onClick={close} style={{...linkBtn,fontWeight:600,color:INK,whiteSpace:"nowrap"}}>{tf("Verstanden")}</button>
    </div>
  );
}

// ------------------------------------------------------------ Diktieren (Spracheingabe des Geräts)
const SpeechRec = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
function MicButton({onText, style}){
  const [on,setOn] = useState(false);
  const recRef = React.useRef(null);
  if(!SpeechRec) return null;
  const toggle = () => {
    if(on && recRef.current){ recRef.current.stop(); return; }
    const r = new SpeechRec(); recRef.current = r;
    r.lang = LOCALES[UI_LANG] ? LOCALES[UI_LANG].split("-u-")[0] : "de-DE"; r.interimResults = false; r.continuous = false;
    r.onresult = (e) => { const txt = Array.from(e.results).map(x=>x[0].transcript).join(" ").trim(); if(txt) onText(txt); };
    r.onend = () => setOn(false); r.onerror = () => setOn(false);
    setOn(true); r.start();
  };
  return <button type="button" onClick={toggle} title={on ? tf("Diktat beenden") : tf("Diktieren")} aria-label={tf("Diktieren")}
    style={{background:on?BAD:"#fff",color:on?"#fff":INK,border:`1px solid ${on?BAD:BORDER}`,borderRadius:8,padding:"0 11px",cursor:"pointer",fontSize:16,minHeight:38,...(style||{})}}>{on ? "■" : "🎤"}</button>;
}
const appendText = (prev, add) => (prev && !/\s$/.test(prev) ? prev + " " : (prev||"")) + add;

// ------------------------------------------------------------ Gäste-QR im Zimmer (Zimmerstatus, Admins)
async function printQrCards(cards, title){
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js");
  const svg = (txt) => { const q = window.qrcode(0, "M"); q.addData(txt); q.make(); return q.createSvgTag({cellSize:4, margin:1, scalable:true}); };
  const w = window.open("", "_blank"); if(!w) return;
  const esc = (s) => String(s||"").replace(/[<>&]/g, "");
  w.document.write('<!doctype html><meta charset="utf-8"><title>'+esc(title)+'</title><style>body{font-family:Inter,Arial,sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.c{border:1px dashed #bbb;border-radius:10px;padding:12px;text-align:center;page-break-inside:avoid}.c svg{width:150px;height:150px}.n{font-size:20px;font-weight:700;margin:4px 0}.l{font-size:11px;color:#444;line-height:1.35}@media print{.g{gap:8px}}</style>'
    + '<div class="g">' + cards.map(c=>'<div class="c"><div class="n">'+esc(c.label)+'</div>'+svg(c.url)+'<div class="l">'+esc(c.text)+'</div></div>').join("") + '</div><script>setTimeout(function(){window.print()},500)<\/script>');
  w.document.close();
}
const GUEST_CARD_TEXT = "Wunsch oder Problem? Scannen. · Need anything? Scan me. · Besoin de quelque chose ? Scannez.";
function GuestQrCard({hotel, api}){
  const [info,setInfo] = useState(null);
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/guest-qr").then(setInfo).catch(e=>setMsg({ok:false,text:e.message})),[api, hotel.id]);
  useEffect(()=>{ if(!window.OUVERTURE_DEMO) load(); },[load]);
  if(window.OUVERTURE_DEMO) return (
    <Card style={{marginBottom:14}}><div style={{fontWeight:700,marginBottom:4}}>🛎 {tf("Gäste-QR im Zimmer")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Gäste scannen den Code im Zimmer und melden Wünsche oder Mängel – ohne App und ohne Anmeldung. So sieht es für Gäste aus:")} <a href="gast.html?demo=1" target="_blank" rel="noopener">{tf("Gästeseite ansehen")}</a></div></Card>);
  if(!info) return msg ? null : null;
  const toggle = async (v) => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/guest-qr","PUT",{enabled:v}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:220}}>
          <div style={{fontWeight:700}}>🛎 {tf("Gäste-QR im Zimmer")}</div>
          <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Gäste scannen den Code im Zimmer und melden Wünsche oder Mängel – ohne App und ohne Anmeldung. Die Meldung landet sofort bei Housekeeping oder Technik.")}</div>
        </div>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,cursor:"pointer"}}><input type="checkbox" checked={info.enabled} onChange={e=>toggle(e.target.checked)} /> {tf("Eingeschaltet")}</label>
        {info.enabled && info.rooms.length>0 && <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={()=>printQrCards(info.rooms.map(r=>({label:roomLocation(r.number), url:r.url, text:GUEST_CARD_TEXT})), tf("Gäste-QR im Zimmer"))}>{tf("{0} Karten drucken", info.rooms.length)}</button>}
        {info.enabled && info.rooms[0] && <a href={info.rooms[0].url} target="_blank" rel="noopener" style={{fontSize:12.5}}>{tf("Gästeseite ansehen")}</a>}
      </div>
      {msg && <div style={{color:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Zimmer fair verteilen (Housekeeping-Leitung)
function RoomAssignCard({hotel, api, members, onDone}){
  const hk = members.filter(m=>m.role!=="viewer" && (m.departments||[]).includes("Housekeeping"));
  const [open,setOpen] = useState(false);
  const [sel,setSel] = useState([]);
  const [plan,setPlan] = useState(null);
  const [msg,setMsg] = useState(null);
  const today = todayIso();
  useEffect(()=>{ if(!open) return;
    api("/api/hotels/"+hotel.id+"/shifts?from="+today+"&to="+today+"&department=Housekeeping").then(sh=>{
      const on = sh.filter(s=>WORK_KINDS.includes(s.kind) && s.user_id).map(s=>s.user_id); setSel(on.length ? [...new Set(on)] : hk.map(m=>m.user_id)); }).catch(()=>setSel(hk.map(m=>m.user_id))); },[open]);
  useEffect(()=>{ if(!open || !sel.length){ setPlan(null); return; } api("/api/hotels/"+hotel.id+"/rooms/assign","POST",{user_ids:sel}).then(setPlan).catch(e=>setMsg({ok:false,text:e.message})); },[sel.join("|"), open]);
  if(!hk.length) return null;
  const apply = async () => { setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/rooms/assign","POST",{user_ids:sel, apply:true}); setMsg({ok:true,text:tf("{0} Zimmer verteilt.", r.assign.length)}); setOpen(false); onDone(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <span>
      <button style={smallBtn} onClick={()=>setOpen(!open)}>👥 {tf("Zimmer verteilen")}</button>
      {msg && !open && <span style={{fontSize:12.5,color:msg.ok?GOOD:BAD,marginInlineStart:8}}>{msg.text}</span>}
      {open && (
        <Card style={{marginTop:10,borderColor:BRASS}}>
          <div style={{fontWeight:700,marginBottom:4}}>{tf("Schmutzige Zimmer fair verteilen")}</div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Abreisen zählen voll, Bleiben halb. Jede Person bekommt einen zusammenhängenden Bereich, damit die Wege kurz bleiben. Heute eingeteilte Personen sind vorausgewählt.")}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {hk.map(m=>{ const on = sel.includes(m.user_id); const l = plan && plan.load[m.user_id]; return (
              <button key={m.user_id} onClick={()=>setSel(on ? sel.filter(x=>x!==m.user_id) : [...sel, m.user_id])} style={{border:`1px solid ${on?INK:BORDER}`,background:on?INK:"#fff",color:on?"#fff":INK,borderRadius:999,padding:"6px 12px",fontSize:12.5,cursor:"pointer"}} data-no-i18n="">
                {shortName(m.email)}{on && l ? " · "+l.rooms+" ("+fmtHours(l.credits)+")" : ""}</button>); })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-primary" disabled={!plan || !plan.assign.length} onClick={apply}>{plan ? tf("{0} Zimmer zuteilen", plan.assign.length) : "…"}</button>
            <button style={linkBtn} onClick={()=>setOpen(false)}>{tf("Abbrechen")}</button>
          </div>
          {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
        </Card>
      )}
    </span>
  );
}

// ------------------------------------------------------------ Krankmeldung und offene Schichten
function SickButton({hotel, api, onDone}){
  const [open,setOpen] = useState(false);
  const [from,setFrom] = useState(todayIso()); const [to,setTo] = useState(todayIso()); const [note,setNote] = useState("");
  const [msg,setMsg] = useState(null);
  const send = async () => { setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/sick","POST",{from, to, note}); setMsg({ok:true,text:tf("Gute Besserung! {0} Schichten wurden zur Übernahme ausgeschrieben, die Leitung ist informiert.", r.shifts)}); setOpen(false); if(onDone) onDone(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <span>
      <button style={smallBtn} onClick={()=>setOpen(!open)}>🤒 {tf("Krank melden")}</button>
      {msg && <div style={{fontSize:13,color:msg.ok?GOOD:BAD,marginTop:6}}>{msg.text}</div>}
      {open && (
        <Card style={{marginTop:8,borderColor:WARN}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label><div className="field-label">{tf("Von")}</div><input className="input" type="date" value={from} onChange={e=>{ setFrom(e.target.value); if(e.target.value>to) setTo(e.target.value); }} /></label>
            <label><div className="field-label">{tf("Bis")}</div><input className="input" type="date" value={to} min={from} onChange={e=>setTo(e.target.value)} /></label>
            <label style={{flex:1,minWidth:160}}><div className="field-label">{tf("Notiz (optional)")}</div><input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder={tf("z. B. Arztbesuch, Krankmeldung folgt")} /></label>
            <button className="btn-primary" style={{background:WARN}} onClick={send}>{tf("Krank melden")}</button>
            <button style={linkBtn} onClick={()=>setOpen(false)}>{tf("Abbrechen")}</button>
          </div>
          <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Deine Schichten in diesem Zeitraum werden als „Krank“ eingetragen und für Kolleg:innen zur Übernahme ausgeschrieben.")}</div>
        </Card>
      )}
    </span>
  );
}
function OpenShiftsCard({hotel, api, me, role, myDepts, onChanged, compact, members}){
  const depts = visibleDeptsFor(role, myDepts);
  const lead = depts.some(d=>canManageDept(d));
  const [list,setList] = useState(null);
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/open-shifts?from="+todayIso()).then(setList).catch(()=>setList([])),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); await load(); if(onChanged) onChanged(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return null;
  const open = list.filter(o=>o.status==="offen");
  if(compact && !open.length) return null;
  return (
    <Card style={{marginBottom:14,borderColor:open.length?WARN:BORDER}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
        <div style={{fontWeight:700,flex:1}}>🔔 {tf("Offene Schichten")} <span style={{color:INK_MUTED,fontWeight:400}} data-no-i18n="">({open.length})</span></div>
        {lead && !form && <button style={smallBtn} onClick={()=>setForm({department:depts.find(canManageDept), shift_date:addDaysIso(todayIso(),1), kind:"Früh", note:""})}>{tf("+ Schicht ausschreiben")}</button>}
      </div>
      {form && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",background:PAPER,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
          <select className="input" style={{width:"auto"}} value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{depts.filter(canManageDept).map(d=><option key={d} value={d}>{d}</option>)}</select>
          <input className="input" type="date" style={{width:"auto"}} value={form.shift_date} onChange={e=>setForm({...form,shift_date:e.target.value})} />
          <select className="input" style={{width:"auto"}} value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{WORK_KINDS.map(k=><option key={k} value={k}>{k}</option>)}</select>
          <input className="input" style={{flex:1,minWidth:120}} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder={tf("Notiz (optional)")} />
          <button className="btn-primary" onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/open-shifts","POST",form); setForm(null); }, tf("Ausgeschrieben – passende Kolleg:innen bekommen eine Nachricht."))}>{tf("Ausschreiben")}</button>
          <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      )}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:6}}>{msg.text}</div>}
      {open.length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Gerade sind alle Schichten besetzt.")}</div> : open.map(o=>(
        <div key={o.id} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap"}}>
          <span style={{width:110}} data-no-i18n="">{fmtDay(o.shift_date)}</span>
          <ShiftChip s={o} />
          <span style={{fontSize:12.5,color:INK_MUTED,flex:1}}><span>{o.department}</span>{o.reason==="krank" ? " · "+tf("Krankheitsvertretung") : ""}{o.note ? " · " : ""}<span data-no-i18n="">{o.note||""}</span></span>
          {role!=="viewer" && <button className="btn-primary" style={{padding:"6px 12px",fontSize:12.5}} onClick={()=>run(()=>api("/api/open-shifts/"+o.id+"/claim","POST",{}), tf("Danke! Die Schicht steht jetzt in deinem Dienstplan."))}>{tf("Übernehmen")}</button>}
          {canManageDept(o.department) && <button style={{...linkBtn,color:BAD}} onClick={()=>run(()=>api("/api/open-shifts/"+o.id,"DELETE"))}>✕</button>}
        </div>
      ))}
      {!compact && list.filter(o=>o.status==="vergeben").slice(0,5).map(o=>(
        <div key={o.id} style={{fontSize:12,color:GOOD,padding:"3px 0"}} data-no-i18n="">✓ {fmtDay(o.shift_date)} · {translateString(o.kind)} · {memberLabel(members||[], me, o.taken_by)}</div>
      ))}
    </Card>
  );
}

// ------------------------------------------------------------ Schichtbriefing
function BriefingCard({hotel, api, me, role, myDepts}){
  const depts = visibleDeptsFor(role, myDepts);
  const [dept,setDept] = useRememberedDept("hpoos_brief_dept", depts);
  const [b,setB] = useState(null);
  const load = useCallback(()=>{ if(dept) api("/api/hotels/"+hotel.id+"/briefing?department="+encodeURIComponent(dept)).then(setB).catch(()=>setB(null)); },[api, hotel.id, dept]);
  useEffect(()=>{ load(); },[load]);
  const T = useTranslated(api, b ? [...b.logbook.map(l=>l.body), ...b.tickets.map(t=>t.title)] : []);
  if(!b) return null;
  const sec = (title, children) => <div style={{marginTop:10}}><div style={{fontSize:11.5,fontWeight:700,color:INK_MUTED,textTransform:"uppercase",letterSpacing:.4,marginBottom:3}}>{title}</div>{children}</div>;
  return (
    <Card style={{marginBottom:14,borderColor:b.read_by_me?BORDER:BRASS}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontWeight:700,flex:1}}>📋 {tf("Schichtbriefing")} · <span data-no-i18n="">{fmtDay(b.day,{weekday:"long",day:"2-digit",month:"2-digit"})}</span></div>
        {depts.length>1 && <select className="input" style={{width:"auto",padding:"4px 8px"}} value={dept} onChange={e=>setDept(e.target.value)}>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select>}
      </div>
      {sec(tf("Heute im Dienst"), b.staff.length ? <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{b.staff.map((s,i)=><span key={i} style={{fontSize:12.5,background:PAPER,borderRadius:999,padding:"2px 9px"}}><b data-no-i18n="">{s.name}</b> · <span>{s.kind}</span></span>)}</div> : <span style={{fontSize:13,color:INK_MUTED}}>{tf("Niemand eingeplant.")}</span>)}
      {b.forecast && sec(tf("Belegung"), <span style={{fontSize:13.5}} data-no-i18n="">{tf("{0} belegt · {1} Anreisen · {2} Abreisen", b.forecast.occupied, b.forecast.arrivals, b.forecast.departures)}</span>)}
      {b.rooms && sec(tf("Zimmer"), <span style={{fontSize:13.5}}>{tf("{0} schmutzig · {1} bereit", b.rooms.dirty, b.rooms.ready)}{b.rooms.out_of_order.length ? <span style={{color:BAD}}> · {tf("Außer Betrieb: {0}", b.rooms.out_of_order.join(", "))}</span> : ""}</span>)}
      {b.logbook.length>0 && sec(tf("Übergabebuch"), b.logbook.map((l,i)=><div key={i} style={{fontSize:13.5,marginBottom:2}}><Pill color={LOG_STYLE[l.kind].color} bg={LOG_STYLE[l.kind].bg}>{l.kind}</Pill> <TrText text={l.body} tr={T.tr} /></div>))}
      {b.tickets_open>0 && sec(tf("Offene Meldungen ({0})", b.tickets_open), b.tickets.map((t,i)=><div key={i} style={{fontSize:13.5}}>{t.priority==="Dringend" && <span style={{color:BAD,fontWeight:700}}>! </span>}<span data-no-i18n="">{t.location ? t.location+" · " : ""}</span><TrText text={t.title} tr={T.tr} /></div>))}
      {b.haccp_missing.length>0 && sec(tf("HACCP heute noch messen"), <span style={{fontSize:13.5,color:WARN}} data-no-i18n="">{b.haccp_missing.join(", ")}</span>)}
      {b.open_shifts.length>0 && sec(tf("Offene Schichten"), <span style={{fontSize:13.5,color:WARN}} data-no-i18n="">{b.open_shifts.map(o=>fmtDay(o.shift_date)+" "+translateString(o.kind)).join(" · ")}</span>)}
      <div style={{display:"flex",gap:10,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
        {b.read_by_me ? <span style={{fontSize:12.5,color:GOOD}}>✓ {tf("Gelesen")}</span> : role!=="viewer" && <button className="btn-primary" style={{padding:"6px 14px"}} onClick={()=>api("/api/hotels/"+hotel.id+"/briefing/read","POST",{department:dept}).then(load)}>{tf("Gelesen")}</button>}
        {canManageDept(dept) && <span style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{tf("Gelesen von: {0}", b.reads.map(r=>r.name).join(", ") || "–")}</span>}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ Einarbeitung
function OnboardingCard({orgId, api, me, myDepts, members}){
  const [d,setD] = useState(null);
  const load = useCallback(()=>api("/api/organizations/"+orgId+"/onboarding").then(setD).catch(()=>setD(null)),[api, orgId]);
  useEffect(()=>{ load(); },[load]);
  if(!d || !me) return null;
  const mine = d.onboardings.find(o=>o.user_id===me.id && !o.completed_at);
  const buddyOf = d.onboardings.filter(o=>o.buddy_id===me.id && !o.completed_at);
  if(!mine && !buddyOf.length) return null;
  const itemsFor = (o) => d.items; // Vorlage gilt für alle (Abteilungs-Punkte werden mit Abteilung angezeigt)
  const done = (uid, id) => d.done.some(x=>x.user_id===uid && x.item_id===id);
  const toggle = (uid, id, v) => api("/api/organizations/"+orgId+"/onboarding/"+uid+"/toggle","POST",{item_id:id, done:v}).then(load);
  const Block = ({o, title}) => { const items = itemsFor(o); const n = items.filter(i=>done(o.user_id, i.id)).length; return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><b style={{flex:1}}>{title}</b><span style={{fontSize:12.5,color:n===items.length?GOOD:INK_MUTED}} data-no-i18n="">{n}/{items.length}</span></div>
      {items.map(i=>(
        <label key={i.id} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 2px",borderTop:`1px solid ${BORDER}`,cursor:"pointer"}}>
          <input type="checkbox" checked={done(o.user_id, i.id)} onChange={e=>toggle(o.user_id, i.id, e.target.checked)} style={{width:20,height:20}} />
          <span style={{flex:1,fontSize:13.5,textDecoration:done(o.user_id,i.id)?"line-through":"none"}} data-no-i18n="">{i.text}</span>
          {i.department && <span style={{fontSize:11,color:INK_MUTED}}>{i.department}</span>}
        </label>
      ))}
    </div>); };
  return (
    <Card style={{marginBottom:14,borderColor:BRASS}}>
      <div style={{fontWeight:700,marginBottom:8}}>🧭 {tf("Einarbeitung")}</div>
      {mine && <Block o={mine} title={tf("Deine ersten Tage")+(mine.buddy_id ? " · "+tf("Ansprechperson: {0}", memberLabel(members||[], me, mine.buddy_id)) : "")} />}
      {buddyOf.map(o=><Block key={o.user_id} o={o} title={tf("Du begleitest {0}", memberLabel(members||[], me, o.user_id))} />)}
    </Card>
  );
}
function OnboardingAdmin({orgId, api, me, members}){
  const [d,setD] = useState(null);
  const [text,setText] = useState(""); const [dept,setDept] = useState("");
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/organizations/"+orgId+"/onboarding").then(setD).catch(e=>setMsg({ok:false,text:e.message})),[api, orgId]);
  useEffect(()=>{ load(); },[load]);
  if(!d) return null;
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const staff = members.filter(m=>m.role!=="viewer");
  return (
    <Card style={{marginBottom:18}}>
      <div style={{fontWeight:700,marginBottom:4}}>🧭 {tf("Einarbeitung neuer Mitarbeitender")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Lege die Punkte für die ersten Tage fest. Wer neu ins Team kommt, bekommt die Liste automatisch auf die Startseite – zusammen mit einer Ansprechperson.")}</div>
      {d.items.map(i=>(
        <div key={i.id} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <span style={{flex:1}} data-no-i18n="">{i.text}</span>{i.department && <span style={{fontSize:11.5,color:INK_MUTED}}>{i.department}</span>}
          <button style={{...linkBtn,color:BAD}} onClick={()=>run(()=>api("/api/onboarding-items/"+i.id,"DELETE"))}>✕</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
        <input className="input" style={{flex:2,minWidth:200}} value={text} onChange={e=>setText(e.target.value)} placeholder={tf("z. B. Schlüssel und Uniform abholen, Rundgang durchs Haus")} />
        <select className="input" style={{width:"auto"}} value={dept} onChange={e=>setDept(e.target.value)}><option value="">{tf("Alle")}</option>{DEPARTMENTS.map(x=><option key={x} value={x}>{x}</option>)}</select>
        <button className="btn-primary" disabled={!text.trim()} onClick={()=>run(async()=>{ await api("/api/organizations/"+orgId+"/onboarding/items","POST",{text, department:dept||null, position:d.items.length}); setText(""); })}>{tf("Hinzufügen")}</button>
      </div>
      {d.items.length>0 && (
        <div style={{marginTop:14}}>
          <div className="field-label">{tf("Wer gerade eingearbeitet wird")}</div>
          {staff.map(m=>{ const o = d.onboardings.find(x=>x.user_id===m.user_id); const n = o ? d.done.filter(x=>x.user_id===m.user_id).length : 0; return (
            <div key={m.user_id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap",fontSize:13.5}}>
              <span style={{flex:1,minWidth:120}} data-no-i18n="">{shortName(m.email)}</span>
              {o ? <React.Fragment>
                <span style={{width:120}}><Bar pct={d.items.length ? n/d.items.length*100 : 0} color={o.completed_at?GOOD:BRASS} /></span>
                <span style={{fontSize:12,color:INK_MUTED,width:44}} data-no-i18n="">{n}/{d.items.length}</span>
                <select className="input" style={{width:"auto",padding:"4px 8px",fontSize:12.5}} value={o.buddy_id||""} onChange={e=>run(()=>api("/api/organizations/"+orgId+"/onboarding/"+m.user_id,"PUT",{buddy_id:e.target.value||null, start_date:o.start_date}))}>
                  <option value="">{tf("Ansprechperson wählen")}</option>{staff.filter(x=>x.user_id!==m.user_id).map(x=><option key={x.user_id} value={x.user_id}>{shortName(x.email)}</option>)}</select>
                {!o.completed_at ? <button style={linkBtn} onClick={()=>run(()=>api("/api/organizations/"+orgId+"/onboarding/"+m.user_id,"PUT",{buddy_id:o.buddy_id, start_date:o.start_date, completed:true}))}>{tf("Abschließen")}</button> : <span style={{fontSize:12,color:GOOD}}>✓ {tf("abgeschlossen")}</span>}
              </React.Fragment> : <button style={smallBtn} onClick={()=>run(()=>api("/api/organizations/"+orgId+"/onboarding/"+m.user_id,"PUT",{}))}>{tf("Einarbeitung starten")}</button>}
            </div>); })}
        </div>
      )}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

