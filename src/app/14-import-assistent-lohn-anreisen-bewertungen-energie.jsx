// ============================================================ Migration 024: Einrichtung, Import, Hilfe, Lohnexport,
// Arbeitsrecht, Anreisen, Bewertungen, Energie, Countdown, Dokumente, Kalender, Anmeldung mit Google/Microsoft

// ------------------------------------------------------------ Tabelle (Excel/CSV) lesen
async function readSpreadsheet(file){
  const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const wb = XLSX.read(await file.arrayBuffer(), {type:"array", cellDates:false});
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:"", raw:true});
}
function FileButton({label, onFile, busy, primary, title}){
  return (
    <label className={primary?"btn-primary":undefined} style={{...(primary?{padding:"7px 12px",fontSize:12.5}:smallBtn),display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",opacity:busy?0.6:1}} title={title}>
      {busy ? "…" : label}
      <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{ const f = e.target.files[0]; e.target.value=""; if(f) onFile(f); }} />
    </label>
  );
}
const colOf = (row, names) => { const k = Object.keys(row).find(h=>names.includes(String(h).trim().toLowerCase())); return k===undefined ? "" : row[k]; };
function downloadText(text, name, type){
  const blob = new Blob([text], {type: type || "text/plain;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

// ------------------------------------------------------------ Mitarbeitende aus einer Liste einladen
const ROLE_WORDS = { admin:"admin", administrator:"admin", leitung:"manager", manager:"manager", abteilungsleitung:"manager", mitarbeiter:"member", mitarbeitende:"member", member:"member", staff:"member", eigentümer:"viewer", owner:"viewer", viewer:"viewer" };
function StaffImportButton({orgId, api, onDone}){
  const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  const pick = async (file) => {
    setBusy(true); setMsg(null);
    try {
      const rows = await readSpreadsheet(file);
      let sent = 0, failed = 0, skipped = 0;
      for(const r of rows.slice(0,300)){
        const email = String(colOf(r,["e-mail","email","mail"])).trim().toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ skipped++; continue; }
        const role = ROLE_WORDS[String(colOf(r,["rolle","role","funktion"])).trim().toLowerCase()] || "member";
        const deptRaw = String(colOf(r,["abteilung","department","bereich"])).trim().toLowerCase();
        const dept = DEPARTMENTS.find(d=>d.toLowerCase()===deptRaw || d.toLowerCase().startsWith(deptRaw) && deptRaw.length>2);
        try { await api("/api/invites","POST",{organization_id:orgId, email, role, departments: dept && role!=="admin" && role!=="viewer" ? [dept] : []}); sent++; }
        catch(e){ failed++; }
      }
      setMsg({ok:sent>0, text:tf("{0} Einladungen verschickt.", sent) + (skipped ? " "+tf("{0} Zeilen ohne gültige E-Mail übersprungen.", skipped) : "") + (failed ? " "+tf("{0} nicht möglich (z. B. schon eingeladen).", failed) : "")});
      if(onDone) onDone();
    } catch(e){ setMsg({ok:false, text:e.message}); }
    setBusy(false);
  };
  return (
    <div style={{display:"inline-flex",flexDirection:"column",gap:4}}>
      <FileButton label={tf("Liste importieren (Excel/CSV)")} busy={busy} onFile={pick} title={tf("Spalten: Name, E-Mail, Abteilung, Rolle")} />
      {msg && <span style={{fontSize:12.5,color:msg.ok?GOOD:BAD}}>{msg.text}</span>}
    </div>
  );
}

// ------------------------------------------------------------ Lager aus einer Liste übernehmen
function StockImportButton({hotel, api, dept, onDone, onMsg}){
  const [busy,setBusy] = useState(false);
  const pick = async (file) => {
    setBusy(true);
    try {
      const rows = await readSpreadsheet(file);
      let ok = 0, failed = 0;
      for(const r of rows.slice(0,1000)){
        const name = String(colOf(r,["artikel","name","bezeichnung","item"])).trim();
        if(!name) continue;
        const dRaw = String(colOf(r,["abteilung","department"])).trim().toLowerCase();
        const department = DEPARTMENTS.find(d=>d.toLowerCase()===dRaw) || dept;
        try { await api("/api/hotels/"+hotel.id+"/stock","POST",{name, department, unit: String(colOf(r,["einheit","unit"])||"Stück"), quantity: colOf(r,["bestand","menge","quantity","stock"]), min_quantity: colOf(r,["mindestbestand","minimum","min","min_quantity"])}); ok++; }
        catch(e){ failed++; }
      }
      onMsg({ok:ok>0, text:tf("{0} Artikel angelegt.", ok) + (failed ? " "+tf("{0} übersprungen (schon vorhanden oder keine Berechtigung).", failed) : "")});
      onDone();
    } catch(e){ onMsg({ok:false,text:e.message}); }
    setBusy(false);
  };
  return <FileButton label={tf("Aus Datei übernehmen")} busy={busy} onFile={pick} title={tf("Spalten: Artikel, Abteilung, Einheit, Bestand, Mindestbestand")} />;
}

// ------------------------------------------------------------ Einrichtungs-Assistent für neue Hotels
const HOTEL_TYPE_OPTIONS = [["", "Standard"], ["city", "Stadthotel"], ["resort", "Resort / Ferienhotel"], ["boutique", "Boutique-Hotel"]];
function SetupWizard({hotel, api, orgId, onHotel, onOpen}){
  const [step,setStep] = useState(0);
  const [form,setForm] = useState({name:hotel.name||"", city:hotel.city||"", rooms:hotel.rooms||"", opening_date:hotel.opening_date||"", holiday_region:hotel.holiday_region||"AT", type:""});
  const [modules,setModules] = useState(hotel.disabled_modules||[]);
  const [roomSpec,setRoomSpec] = useState({floors:"1-3", per:"20"});
  const [invites,setInvites] = useState("");
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const run = async (fn, next=true) => { setBusy(true); setMsg(null); try { const r = await fn(); if(r) setMsg({ok:true,text:r}); if(next) setStep(s=>s+1); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const patch = async (b) => { const h = await api("/api/hotels/"+hotel.id,"PATCH",b); onHotel(h); return h; };
  const finish = () => run(async()=>{ await patch({setup_completed:true}); }, false);
  const steps = [tf("Hotel"), tf("Bereiche"), tf("Vorlage"), tf("Zimmer"), tf("Team")];
  const preOff = modules.includes("tasks");
  const roomNumbers = () => {
    const [a,b] = String(roomSpec.floors).split("-").map(x=>parseInt(x,10)); const per = parseInt(roomSpec.per,10);
    if(!(a>=0) || !(per>0) || per>99) return "";
    const last = b>=a ? Math.min(b, a+40) : a;
    const parts = []; for(let f=a; f<=last; f++) parts.push((f*100+1)+"-"+(f*100+per));
    return parts.join(", ");
  };
  const box = {background:PAPER,borderRadius:8,padding:"12px 14px",marginBottom:12};
  return (
    <Card style={{marginBottom:18,borderColor:BRASS}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
        <div style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,flex:1}}>{tf("Willkommen! In fünf Schritten startklar")}</div>
        <button style={linkBtn} onClick={finish}>{tf("Später einrichten")}</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {steps.map((s,i)=><button key={i} onClick={()=>setStep(i)} style={{border:"none",borderRadius:999,padding:"5px 11px",fontSize:12.5,cursor:"pointer",fontWeight:600,
          background:i===step?INK:i<step?GOOD_SOFT:PAPER,color:i===step?"#fff":i<step?GOOD:INK_MUTED}}>{i<step?"✓ ":(i+1)+". "}{s}</button>)}
      </div>
      {step===0 && <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0 14px"}}>
          <Field label={tf("Name des Hotels")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Ort")}><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></Field>
          <Field label={tf("Zimmer")}><input className="input" type="number" min="1" value={form.rooms} onChange={e=>setForm({...form,rooms:e.target.value})} /></Field>
          <Field label={tf("Eröffnungstermin")}><input className="input" type="date" value={form.opening_date||""} onChange={e=>setForm({...form,opening_date:e.target.value})} /></Field>
          <Field label={tf("Feiertage und Arbeitsrecht")}><select className="input" value={form.holiday_region} onChange={e=>setForm({...form,holiday_region:e.target.value})}>
            {HOLIDAY_REGIONS.map(r=><option key={r} value={r}>{holidayRegionLabel(r, UI_LANG)}</option>)}</select></Field>
          <Field label={tf("Art des Hotels")}><select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
            {HOTEL_TYPE_OPTIONS.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
        </div>
        <button className="btn-primary" disabled={busy||!form.name.trim()} onClick={()=>run(async()=>{ await patch({name:form.name.trim(), city:form.city, rooms:Number(form.rooms)||null, opening_date:form.opening_date||null, holiday_region:form.holiday_region}); })}>{tf("Weiter")}</button>
      </div>}
      {step===1 && <div>
        <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Was braucht dieses Hotel? Ausgeblendetes lässt sich jederzeit wieder einschalten.")}</div>
        <ModulePicker value={modules} onChange={setModules} />
        <button className="btn-primary" style={{marginTop:12}} disabled={busy} onClick={()=>run(async()=>{ await patch({disabled_modules:modules}); })}>{tf("Weiter")}</button>
      </div>}
      {step===2 && <div>
        {preOff || !form.opening_date
          ? <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{preOff ? tf("Pre-Opening ist ausgeblendet – dieser Schritt entfällt.") : tf("Ohne Eröffnungstermin lässt sich die Vorlage nicht terminieren. Du kannst sie später unter „Aufgaben“ anwenden.")}</div>
          : <div style={box}>
              <div style={{fontWeight:600,marginBottom:4}}>{tf("Eröffnungsplan aus der Vorlage")}</div>
              <div style={{fontSize:13,color:INK_MUTED}}>{tf("Über 100 typische Aufgaben und Meilensteine für alle Abteilungen, terminiert ab dem Eröffnungstag.")}{form.type ? " "+tf("Dazu passende Aufgaben für: {0}.", tf(HOTEL_TYPE_OPTIONS.find(x=>x[0]===form.type)[1])) : ""}</div>
              <button className="btn-primary" style={{marginTop:10}} disabled={busy} onClick={()=>run(async()=>{ const r = await api("/api/hotels/"+hotel.id+"/apply-template","POST",{skipPast:true, hotelType:form.type||undefined}); return tf("{0} Aufgaben und {1} Meilensteine angelegt.", r.tasksCreated, r.milestonesCreated); })}>{tf("Vorlage anwenden")}</button>
            </div>}
        <button style={smallBtn} onClick={()=>setStep(3)}>{tf("Weiter")}</button>
      </div>}
      {step===3 && <div>
        <div style={box}>
          <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Zimmer schnell anlegen: Stockwerke und Zimmer je Stock – z. B. 1-3 und 20 ergibt 101–120, 201–220, 301–320.")}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <Field label={tf("Stockwerke")}><input className="input" style={{width:110}} value={roomSpec.floors} onChange={e=>setRoomSpec({...roomSpec,floors:e.target.value})} /></Field>
            <Field label={tf("Zimmer je Stock")}><input className="input" type="number" min="1" max="99" style={{width:110}} value={roomSpec.per} onChange={e=>setRoomSpec({...roomSpec,per:e.target.value})} /></Field>
            <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:16}} data-no-i18n="">{roomNumbers()}</div>
          </div>
          <button className="btn-primary" disabled={busy||!roomNumbers()} onClick={()=>run(async()=>{ const r = await api("/api/hotels/"+hotel.id+"/rooms","POST",{numbers:roomNumbers()}); return tf("{0} Zimmer angelegt.", r.created); }, false)}>{tf("Zimmer anlegen")}</button>
        </div>
        <button style={smallBtn} onClick={()=>setStep(4)}>{tf("Weiter")}</button>
      </div>}
      {step===4 && <div>
        <div style={box}>
          <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Eine E-Mail-Adresse pro Zeile. Alle bekommen eine Einladung als Mitarbeitende – Rollen und Abteilungen lassen sich danach unter „Team“ anpassen.")}</div>
          <textarea className="input" rows={4} value={invites} onChange={e=>setInvites(e.target.value)} placeholder="anna@hotel.at&#10;ben@hotel.at" />
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8,alignItems:"flex-start"}}>
            <button className="btn-primary" disabled={busy||!invites.trim()} onClick={()=>run(async()=>{
              const list = invites.split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
              let n = 0; for(const email of list.slice(0,100)){ try { await api("/api/invites","POST",{organization_id:orgId, email, role:"member", departments:[]}); n++; } catch(e){} }
              setInvites(""); return tf("{0} Einladungen verschickt.", n); }, false)}>{tf("Einladen")}</button>
            <StaffImportButton orgId={orgId} api={api} />
          </div>
        </div>
        <button className="btn-primary" disabled={busy} onClick={finish}>{tf("Fertig – los geht’s")}</button>
      </div>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:10}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Hilfe-Center
const HELP_ARTICLES = [
  {id:"start", icon:"play", title:"Erste Schritte", steps:["Unter „Hotel bearbeiten“ Name, Eröffnungstermin und Feiertagsregion eintragen.","Unter „Team“ Personen einladen und ihnen Rolle und Abteilung geben.","Für die Eröffnung unter „Aufgaben“ die Vorlage anwenden – für den Betrieb unter „Dienstplan“ die erste Woche planen.","Ouverture auf dem Handy als App installieren: Konto → „Ouverture als App“."]},
  {id:"roles", icon:"users", title:"Rollen und Rechte", steps:["Admin: sieht und ändert alles, verwaltet Team und Abo.","Abteilungsleitung: plant und genehmigt für die eigenen Abteilungen; ohne Abteilung für alle (z. B. Direktion).","Mitarbeitende: sehen ihre Abteilung, ihren Dienstplan und ihre Aufgaben.","Eigentümer: lesen alles, ändern nichts."]},
  {id:"roster", icon:"calendar", title:"Dienstplan erstellen und veröffentlichen", steps:["Abteilung und Woche wählen, auf ein Feld tippen und Schicht wählen – oder „Plan-Vorschlag“ nutzen.","Warnungen zu Ruhezeit, Höchstarbeitszeit und Wochenruhe erscheinen direkt neben der Person.","Erst „Veröffentlichen“ macht die Woche für Mitarbeitende sichtbar – sie bekommen eine Nachricht.","Krankmeldungen erzeugen offene Schichten, die Kolleginnen und Kollegen übernehmen können."]},
  {id:"time", icon:"clock", title:"Zeiterfassung und Lohnexport", steps:["Mitarbeitende stempeln unter „Zeiterfassung“ – auch ohne Netz.","Die Leitung korrigiert Buchungen und trägt vergessene Zeiten nach.","Die Monatsauswertung gibt es als Excel; unter „Lohnarten-Export“ als Datei für BMD, DATEV & Co.","Personalnummern und Lohnarten einmal eintragen – sie bleiben gespeichert."]},
  {id:"rooms", icon:"bed", title:"Zimmer, Housekeeping und PMS", steps:["Zimmerstatus antippen, um ihn zu ändern; mehrere Zimmer lassen sich gemeinsam setzen.","„Zimmer verteilen“ teilt die schmutzigen Zimmer fair auf das Team auf.","Unter „PMS-Anbindung“ Mews oder Apaleo verbinden – oder ein anderes System per Webhook.","Gäste-QR-Codes im Zimmer melden Wünsche direkt an Housekeeping oder Technik."]},
  {id:"arrivals", icon:"suitcase", title:"Gäste vor der Anreise anschreiben", steps:["Unter „Anreisen“ die Mail einschalten und Check-in-Zeit, Infos und Extras eintragen.","Gäste kommen aus dem PMS (Apaleo) oder per Excel-Import.","Ouverture schickt die Mail automatisch einige Tage vor der Anreise.","Antworten (Ankunftszeit, Extras, Wünsche) erscheinen in der Liste – die Rezeption bekommt eine Nachricht."]},
  {id:"reviews", icon:"star", title:"Bewertungen auswerten", steps:["Bewertungen aus Google, Booking.com & Co. als Excel/CSV exportieren und unter „Bewertungen“ importieren.","Die Übersicht zeigt den Schnitt je Portal und Monat.","„Mit KI auswerten“ fasst Lob und wiederkehrende Probleme zusammen – mit Abteilung und Vorschlag."]},
  {id:"energy", icon:"bolt", title:"Energie und Verbrauch", steps:["Unter „Energie“ Zähler für Strom, Gas, Wasser oder Wärme anlegen.","Zählerstände regelmäßig eintragen – am besten immer am gleichen Wochentag.","Ouverture rechnet den Verbrauch je Monat aus und warnt bei ungewöhnlich hohem Verbrauch."]},
  {id:"docs", icon:"filetext", title:"Dokumente mit Ablaufdatum", steps:["Verträge, Zertifikate und Wartungsnachweise unter „Dokumente“ hochladen.","Bei „Ablauf“ das Ablaufdatum und die Vorwarnzeit eintragen.","Admins bekommen rechtzeitig eine Erinnerung aufs Handy."]},
  {id:"owner", icon:"flag", title:"Eigentümer auf dem Laufenden halten", steps:["Unter „Hotel bearbeiten“ den Eröffnungs-Countdown einschalten und den Link teilen – ohne Anmeldung.","Den Wochenbericht jeden Montag per E-Mail einschalten.","Für volle Einsicht Eigentümer mit der Rolle „Eigentümer“ ins Team einladen."]},
  {id:"calendar", icon:"calendar", title:"Dienstplan im Handy-Kalender", steps:["Unter „Konto“ das Kalender-Abo einschalten.","Den Link in Google Kalender, Apple Kalender oder Outlook als Abo hinzufügen.","Veröffentlichte Schichten erscheinen automatisch und bleiben aktuell."]},
];
function HelpView({onOpen}){
  const [q,setQ] = useState(""); const [open,setOpen] = useState("start");
  const norm = (s) => String(s).toLowerCase();
  const list = HELP_ARTICLES.filter(a=>!q.trim() || norm(translateString(a.title)+" "+a.steps.map(translateString).join(" ")).includes(norm(q)) || norm(a.title+" "+a.steps.join(" ")).includes(norm(q)));
  return (
    <div style={{maxWidth:760}}>
      <input className="input" style={{marginBottom:14}} placeholder={tf("Suchen, z. B. Dienstplan, Lohn, Zimmer …")} value={q} onChange={e=>setQ(e.target.value)} />
      {list.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Nichts gefunden. Frag den KI-Service unten rechts – „Hilfe 24/7“.")}</div>}
      {list.map(a=>(
        <Card key={a.id} style={{marginBottom:10,padding:"14px 18px"}}>
          <button onClick={()=>setOpen(open===a.id?null:a.id)} style={{display:"flex",gap:10,alignItems:"center",width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"start",color:INK}}>
            <Icon n={a.icon} size={20} /><span style={{fontWeight:700,fontSize:15,flex:1}}>{a.title}</span><span style={{color:INK_MUTED}}>{open===a.id||q?"▴":"▾"}</span>
          </button>
          {(open===a.id || q) && <ol style={{margin:"10px 0 0",paddingInlineStart:22,fontSize:13.5,lineHeight:1.55}}>{a.steps.map((s,i)=><li key={i} style={{marginBottom:4}}>{s}</li>)}</ol>}
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Lohnarten-Export (BMD, DATEV & Co.)
const LA_LABELS = [["worked","Normalstunden"],["overtime","Überstunden"],["night","Nachtstunden"],["sunday","Sonntagsstunden"],["holiday","Feiertagsstunden"],["vacation","Urlaubstage"],["sick","Krankentage"]];
function PayrollExportCard({hotel, api, rows, month, onHotel, onClose}){
  const [s,setS] = useState(()=>({format:"csv", berater:"", mandant:"", la:{}, pnr:{}, ...(hotel.payroll_settings||{})}));
  const [msg,setMsg] = useState(null);
  const set = (k, v) => setS({...s, [k]:v});
  const save = async () => { try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{payroll_settings:s}); onHotel(h); setMsg({ok:true,text:tf("Gespeichert.")}); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } };
  const lines = payrollLines(rows, s);
  const missing = rows.filter(r=>r.entries && !(s.pnr||{})[r.key]).length;
  const download = async () => {
    if(!(await save())) return;
    const name = (tf("Lohnarten")+" "+hotel.name+" "+month).replace(/[\\/:*?"<>|]+/g,"");
    if(s.format==="datev") downloadText(payrollDatevLodas(lines, month, s), name+".txt", "text/plain;charset=windows-1252");
    else downloadText(payrollLinesCsv(lines, month, [tf("Personalnummer"), tf("Name"), tf("Lohnart"), tf("Menge"), tf("Zeitraum")]), name+".csv", "text/csv;charset=utf-8");
  };
  return (
    <Card style={{marginBottom:14,borderColor:BRASS}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{fontWeight:700,flex:1}}>{tf("Lohnarten-Export")}</div>
        <button style={linkBtn} onClick={onClose}>{tf("Schließen")}</button>
      </div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Je Person und Lohnart eine Zeile – zum Einlesen in BMD, DATEV, Sage oder Lexware. Die Nummern stimmst du einmal mit deiner Lohnverrechnung ab; sie bleiben gespeichert.")}</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Field label={tf("Format")}><select className="input" value={s.format} onChange={e=>set("format",e.target.value)}><option value="csv">{tf("CSV (BMD, Sage, Lexware, Excel)")}</option><option value="datev">DATEV LODAS</option></select></Field>
        {s.format==="datev" && <Field label={tf("Beraternummer")}><input className="input" style={{width:130}} value={s.berater} onChange={e=>set("berater",e.target.value)} /></Field>}
        {s.format==="datev" && <Field label={tf("Mandantennummer")}><input className="input" style={{width:130}} value={s.mandant} onChange={e=>set("mandant",e.target.value)} /></Field>}
        <Field label={tf("Personalkosten je Stunde (inkl. Lohnnebenkosten, für Kennzahlen)")}><input className="input" style={{width:150}} inputMode="decimal" value={s.hourly_cost??""} onChange={e=>set("hourly_cost",e.target.value.replace(",","."))} /></Field>
      </div>
      <div className="field-label">{tf("Lohnart-Nummern")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px",marginBottom:6}}>
        {LA_LABELS.map(([k,l])=><Field key={k} label={tf(l)}><input className="input" value={(s.la||{})[k]||""} onChange={e=>set("la",{...s.la,[k]:e.target.value})} placeholder="–" /></Field>)}
      </div>
      <div className="field-label">{tf("Personalnummern")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:"6px 10px",marginBottom:12}}>
        {rows.map(r=><label key={r.key} style={{display:"flex",gap:8,alignItems:"center",fontSize:13}}><span style={{flex:1}} data-no-i18n="">{r.name}</span><input className="input" style={{width:100}} value={(s.pnr||{})[r.key]||""} onChange={e=>set("pnr",{...s.pnr,[r.key]:e.target.value})} /></label>)}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn-primary" onClick={download} disabled={!lines.length}>{tf("Datei herunterladen")}</button>
        <button style={smallBtn} onClick={save}>{tf("Nur speichern")}</button>
        <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("{0} Zeilen", lines.length)}{missing ? " · "+tf("{0} Personen ohne Personalnummer", missing) : ""}</span>
      </div>
      {s.format==="datev" && <div style={{fontSize:12,color:WARN,marginTop:8}}>{tf("Bitte die erste Datei gemeinsam mit der Lohnverrechnung prüfen – Lohnarten und Einstellungen unterscheiden sich je Kanzlei.")}</div>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Arbeitszeit im Durchschnitt (AT: höchstens 48 h über 17 Wochen)
function LaborAverageCard({hotel, api, dept, members}){
  const [open,setOpen] = useState(false); const [rows,setRows] = useState(null); const [error,setError] = useState("");
  const rules = laborRulesFor(hotel.holiday_region);
  useEffect(()=>{ if(!open || !rules.avgWeeks) return; setRows(null); setError("");
    const to = todayIso(), from = (()=>{ const d = new Date(to+"T12:00:00Z"); d.setUTCDate(d.getUTCDate() - rules.avgWeeks*7); return d.toISOString().slice(0,10); })();
    api("/api/hotels/"+hotel.id+"/shifts?from="+from+"&to="+to+"&department="+encodeURIComponent(dept)).then(sh=>{
      const work = sh.filter(s=>WORK_KINDS.includes(s.kind) && s.start_time && s.end_time);
      const by = {};
      work.forEach(s=>{ const k = s.user_id || ("n:"+(s.employee_name||"").toLowerCase()); (by[k] = by[k] || {name: s.user_id ? ((members.find(m=>m.user_id===s.user_id)||{}).email || "–") : s.employee_name, list: []}).list.push(s); });
      setRows(Object.values(by).map(p=>({name:p.name, ...laborAverage(p.list, {region: hotel.holiday_region, endDate: to})})).sort((a,b)=>b.average-a.average));
    }).catch(e=>setError(e.message)); },[open, dept]);
  if(!rules.avgWeeks) return null;
  return (
    <Card style={{marginTop:14}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{fontWeight:700,flex:1}}>{tf("Arbeitszeit im Durchschnitt ({0} Wochen)", rules.avgWeeks)}</div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:10}}>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Nach § 9 AZG dürfen es im Schnitt höchstens {0} Stunden pro Woche sein. Gerechnet werden geplante Schichten abzüglich Pausen. Hinweis, keine Rechtsberatung.", rules.avgMax)}</div>
        {error && <div style={{color:BAD,fontSize:13}}>{error}</div>}
        {!rows && !error && <div style={{fontSize:13,color:INK_MUTED}}>…</div>}
        {rows && !rows.length && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Schichten im Zeitraum.")}</div>}
        {rows && rows.length>0 && <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
          {rows.map(r=><tr key={r.name} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:"7px 4px"}} data-no-i18n="">{r.name}</td>
            <td style={{padding:"7px 4px",textAlign:"end",fontWeight:600,color:r.over?BAD:INK}}>{tf("{0} h pro Woche", fmtHours(r.average))}</td>
            <td style={{padding:"7px 4px",textAlign:"end"}}>{r.over ? <Pill color={BAD} bg={BAD_SOFT}>{tf("über {0} h", r.max)}</Pill> : <Pill color={GOOD} bg={GOOD_SOFT}>{tf("im Rahmen")}</Pill>}</td>
          </tr>)}
        </tbody></table>}
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Arbeitsrecht: Hinweise als Text
function laborText(w){
  if(w.code==="day") return tf("{0}: {1} h Arbeitszeit – mehr als erlaubt", fmtDay(w.date), fmtHours(w.value));
  if(w.code==="rest") return tf("{0}: nur {1} h Ruhezeit", fmtDay(w.date), fmtHours(w.value));
  if(w.code==="splitRest") return tf("{0}: {1} h Ruhezeit nach geteiltem Dienst – im Gastgewerbe zulässig, Ausgleich beachten", fmtDay(w.date), fmtHours(w.value));
  if(w.code==="week") return tf("{0} h in der Woche – mehr als erlaubt", fmtHours(w.value));
  if(w.code==="weeklyRest") return tf("Keine ausreichende Wochenruhe (längste Pause {0} h)", fmtHours(w.value));
  if(w.code==="daysInRow") return tf("{0} Tage in Folge ohne freien Tag", w.value);
  if(w.code==="break") return tf("{0}: Pause unter {1} Min.", fmtDay(w.date), w.value);
  if(w.code==="sunday") return tf("{0}: Sonntagsarbeit", fmtDay(w.date));
  if(w.code==="holiday") return tf("{0}: Feiertag ({1})", fmtDay(w.date), w.value);
  return w.code;
}
const LABOR_INFO = ["sunday","holiday"];

// ------------------------------------------------------------ Gäste vor der Anreise
function GuestMailSettings({hotel, api, onHotel}){
  const [open,setOpen] = useState(false);
  const [s,setS] = useState(()=>({enabled:false, days_before:3, checkin_time:"15:00", info:"", extras:[], ...(hotel.guest_mail||{})}));
  const [msg,setMsg] = useState(null);
  const save = async () => { try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{guest_mail:s}); onHotel(h); setS({...s, ...(h.guest_mail||{})}); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const setX = (i, k, v) => setS({...s, extras:s.extras.map((x,j)=>j===i?{...x,[k]:v}:x)});
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} {...pressable(()=>setOpen(!open))} aria-expanded={open}>
        <div style={{fontWeight:700,flex:1}}>{tf("Mail vor der Anreise")} <span style={{fontWeight:400,fontSize:13,color:s.enabled?GOOD:INK_MUTED}}>· {s.enabled ? tf("Eingeschaltet") : tf("Aus")}</span></div>
        <span style={{color:INK_MUTED}}>{open?"▴":"▾"}</span>
      </div>
      {open && <div style={{marginTop:12}}>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Ouverture schreibt Gäste automatisch vor der Anreise an – in ihrer Sprache. Sie geben Ankunftszeit und Wünsche an und können Extras dazubuchen.")}</div>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,marginBottom:10,cursor:"pointer"}}><input type="checkbox" checked={!!s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> <b>{tf("Automatisch verschicken")}</b></label>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Field label={tf("Tage vor der Anreise")}><input className="input" type="number" min="1" max="14" style={{width:110}} value={s.days_before} onChange={e=>setS({...s,days_before:e.target.value})} /></Field>
          <Field label={tf("Check-in ab")}><input className="input" type="time" style={{width:130}} value={s.checkin_time} onChange={e=>setS({...s,checkin_time:e.target.value})} /></Field>
        </div>
        <Field label={tf("Infos für Gäste (Anfahrt, Parken, Hinweise)")}><textarea className="input" rows={3} value={s.info} onChange={e=>setS({...s,info:e.target.value})} /></Field>
        <div className="field-label">{tf("Extras zum Dazubuchen")}</div>
        {s.extras.map((x,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
            <input className="input" style={{flex:1}} value={x.name} placeholder={tf("z. B. Frühstück, Parkplatz, später Check-out")} onChange={e=>setX(i,"name",e.target.value)} />
            <input className="input" style={{width:110}} value={x.price??""} placeholder={tf("Preis")} onChange={e=>setX(i,"price",e.target.value)} />
            <button style={linkBtn} onClick={()=>setS({...s,extras:s.extras.filter((_,j)=>j!==i)})}>✕</button>
          </div>
        ))}
        {s.extras.length<12 && <button style={{...linkBtn,paddingInlineStart:0}} onClick={()=>setS({...s,extras:[...s.extras,{name:"",price:""}]})}>{tf("+ Extra")}</button>}
        <div style={{fontSize:12,color:INK_MUTED,margin:"8px 0 12px"}}>{tf("Hinweis: Angebote in Service-Mails sind in der Regel erlaubt, wenn sie zur Buchung gehören. Im Zweifel bitte mit der Datenschutz-Beratung abstimmen.")}</div>
        <button className="btn-primary" onClick={save}>{tf("Speichern")}</button>
        {msg && <span style={{color:msg.ok?GOOD:BAD,fontSize:13,marginInlineStart:10}}>{msg.text}</span>}
      </div>}
    </Card>
  );
}
function ArrivalsView({hotel, api, role, onHotel}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [form,setForm] = useState(null);
  const lead = canManageDept("Rezeption & Empfang");
  const base = "/api/hotels/"+hotel.id+"/arrivals";
  const load = useCallback(()=>api(base).then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function"?ok(r):ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const importFile = async (file) => { setBusy(true); await run(async()=>api(base+"/import","POST",{rows: await readSpreadsheet(file)}), r=>tf("{0} Gäste übernommen, {1} schon vorhanden.", r.created, r.existing)); setBusy(false); };
  const extrasOffered = (hotel.guest_mail && hotel.guest_mail.extras) || [];
  const extraName = (id) => (extrasOffered.find(x=>x.id===id)||{}).name || id;
  const byDay = {}; (list||[]).forEach(g=>{ (byDay[g.arrival_date] = byDay[g.arrival_date] || []).push(g); });
  return (
    <div>
      {role==="admin" && <GuestMailSettings hotel={hotel} api={api} onHotel={onHotel} />}
      {lead && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        <FileButton primary label={tf("Gäste aus Datei übernehmen")} busy={busy} onFile={importFile} title={tf("Spalten: Name, E-Mail, Anreise, Abreise, Sprache, Zimmerkategorie, Reservierung")} />
        <button style={smallBtn} onClick={()=>setForm({guest_name:"", email:"", arrival_date:addDaysIso(todayIso(),3), departure_date:"", language:"de"})}>{tf("+ Gast")}</button>
        <span style={{fontSize:12,color:INK_MUTED}}>{tf("Mit Apaleo-Anbindung kommen Anreisen automatisch.")}</span>
      </div>}
      {form && <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name")}><input className="input" value={form.guest_name} onChange={e=>setForm({...form,guest_name:e.target.value})} /></Field>
          <Field label={tf("E-Mail")}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
          <Field label={tf("Anreise")}><input className="input" type="date" value={form.arrival_date} onChange={e=>setForm({...form,arrival_date:e.target.value})} /></Field>
          <Field label={tf("Abreise")}><input className="input" type="date" value={form.departure_date} onChange={e=>setForm({...form,departure_date:e.target.value})} /></Field>
          <Field label={tf("Sprache")}><select className="input" value={form.language} onChange={e=>setForm({...form,language:e.target.value})}>{LANGS.map(([c,l])=><option key={c} value={c}>{l}</option>)}</select></Field>
        </div>
        <button className="btn-primary" disabled={!form.guest_name.trim()} onClick={()=>run(async()=>{ await api(base,"POST",form); setForm(null); })}>{tf("Anlegen")}</button>
        <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
      </Card>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {list===null ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div> : list.length===0 ? <Card><div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Anreisen. Übernimm sie aus dem PMS oder aus einer Excel-Liste.")}</div></Card> :
        Object.keys(byDay).sort().map(day=>(
          <div key={day} style={{marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,color:INK_MUTED,margin:"0 0 6px"}}>{fmtDay(day,{weekday:"long",day:"numeric",month:"long"})} · {tf("{0} Gäste", byDay[day].length)}</div>
            <Card style={{padding:0}}>
              {byDay[day].map(g=>(
                <div key={g.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 14px",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontWeight:600}} data-no-i18n="">{g.guest_name} <span style={{fontWeight:400,color:INK_MUTED,fontSize:12}}>{g.language.toUpperCase()}{g.room_type ? " · "+g.room_type : ""}</span></div>
                    <div style={{fontSize:12.5,color:INK_MUTED}}>
                      {g.answered_at ? <span style={{color:GOOD}}>✓ {tf("Geantwortet")}</span> : g.mail_sent_at ? tf("Mail verschickt {0}", fmtDateTime(g.mail_sent_at)) : g.email ? tf("Mail noch nicht verschickt") : tf("Keine E-Mail-Adresse")}
                      {g.eta && <span> · {tf("Ankunft {0}", g.eta)}</span>}
                    </div>
                    {(g.extras||[]).length>0 && <div style={{fontSize:12.5,marginTop:3}}>{(g.extras||[]).map(x=><Pill key={x} color={BRASS} bg={BRASS_SOFT}>{extraName(x)}</Pill>)}</div>}
                    {g.guest_note && <div style={{fontSize:13,marginTop:4,background:PAPER,borderRadius:6,padding:"6px 8px"}} data-no-i18n="">„{g.guest_note}“</div>}
                  </div>
                  {lead && <div style={{whiteSpace:"nowrap"}}>
                    {g.email && !g.answered_at && <button style={linkBtn} onClick={()=>run(()=>api("/api/arrivals/"+g.id+"/send","POST",{}), tf("Mail verschickt."))}>{g.mail_sent_at ? tf("Erneut senden") : tf("Jetzt senden")}</button>}
                    <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Gast aus der Liste entfernen?"))) run(()=>api("/api/arrivals/"+g.id,"DELETE")); }}>✕</button>
                  </div>}
                </div>
              ))}
            </Card>
          </div>
        ))}
    </div>
  );
}

// ------------------------------------------------------------ Bewertungen
const REVIEW_SOURCE_LABELS = {google:"Google", booking:"Booking.com", tripadvisor:"Tripadvisor", holidaycheck:"HolidayCheck", expedia:"Expedia", andere:"Andere"};
function Stars({value}){ if(value==null) return <span style={{color:INK_MUTED}}>–</span>; const v = Math.round(value*2)/2; return <span style={{color:BRASS,letterSpacing:1}} title={String(value)}>{"★".repeat(Math.floor(v))}{v%1?"½":""}<span style={{color:"#ddd"}}>{"★".repeat(5-Math.ceil(v))}</span></span>; }
function ReviewsView({hotel, api, role}){
  const [data,setData] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState("");
  const [source,setSource] = useState("google"); const [filter,setFilter] = useState("");
  const lead = canManageDept("Rezeption & Empfang");
  const base = "/api/hotels/"+hotel.id+"/reviews";
  const load = useCallback(()=>api(base).then(setData).catch(e=>{ setMsg({ok:false,text:e.message}); setData({reviews:[],stats:{count:0,sources:[],months:[]}}); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const importFile = async (file) => { setBusy("import"); setMsg(null); try { const r = await api(base+"/import","POST",{rows: await readSpreadsheet(file), source}); setMsg({ok:true,text:tf("{0} Bewertungen übernommen, {1} schon vorhanden.", r.created, r.existing)}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const summarize = async () => { setBusy("ai"); setMsg(null); try { await api(base+"/summary","POST",{}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  if(!data) return <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div>;
  const st = data.stats, sum = data.summary && data.summary.summary;
  const shown = data.reviews.filter(r=>!filter || (filter==="__open" ? (r.reply_status||"offen")==="offen" || r.reply_status==="entwurf" : r.source===filter));
  const maxM = Math.max(1, ...st.months.map(m=>m.count));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:12,marginBottom:14}}>
        <Card><div className="field-label">{tf("Durchschnitt")}</div><div style={{fontFamily:"Fraunces, serif",fontSize:28,fontWeight:600}} data-no-i18n="">{st.average!=null ? st.average.toLocaleString(UI_LOCALE,{maximumFractionDigits:2}) : "–"}<span style={{fontSize:14,color:INK_MUTED}}> / 5</span></div><Stars value={st.average} /></Card>
        <Card><div className="field-label">{tf("Bewertungen")}</div><div style={{fontFamily:"Fraunces, serif",fontSize:28,fontWeight:600}} data-no-i18n="">{st.count}</div></Card>
        {st.sources.slice(0,3).map(s=><Card key={s.source}><div className="field-label">{tf(REVIEW_SOURCE_LABELS[s.source]||s.source)}</div><div style={{fontSize:20,fontWeight:700}} data-no-i18n="">{s.average!=null ? s.average.toLocaleString(UI_LOCALE,{maximumFractionDigits:1}) : "–"} <span style={{fontSize:12.5,color:INK_MUTED,fontWeight:400}}>· {tf("{0} Bewertungen", s.count)}</span></div></Card>)}
      </div>
      {st.months.length>1 && <Card style={{marginBottom:14}}>
        <div className="field-label">{tf("Verlauf je Monat")}</div>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:110,paddingTop:6}}>
          {st.months.map(m=>(
            <div key={m.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:0}} title={m.month+": "+m.average+" ★ · "+m.count}>
              <div style={{fontSize:10.5,color:INK_MUTED}} data-no-i18n="">{m.average!=null ? m.average.toFixed(1) : ""}</div>
              <div style={{width:"100%",maxWidth:34,height:Math.max(6, 70*m.count/maxM),background:m.average>=4.3?GOOD:m.average>=3.5?BRASS:BAD,borderRadius:"4px 4px 0 0",opacity:0.85}} />
              <div style={{fontSize:10.5,color:INK_MUTED}} data-no-i18n="">{new Date(m.month+"-15T12:00:00").toLocaleDateString(UI_LOCALE,{month:"short"})}</div>
            </div>
          ))}
        </div>
      </Card>}
      <Card style={{marginBottom:14,borderColor:sum?BRASS:BORDER}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:sum?10:0}}>
          <div style={{fontWeight:700,flex:1}}><Icon n="sparkle" /> {tf("KI-Auswertung")} {data.summary && <span style={{fontWeight:400,fontSize:12.5,color:INK_MUTED}}>· {tf("{0} Bewertungen, Stand {1}", data.summary.review_count, fmtDateTime(data.summary.created_at))}</span>}</div>
          {lead && data.ai && <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} disabled={!!busy} onClick={summarize}>{busy==="ai" ? tf("Wird ausgewertet…") : sum ? tf("Neu auswerten") : tf("Mit KI auswerten")}</button>}
          {!data.ai && <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Die KI ist noch nicht eingerichtet.")}</span>}
        </div>
        {sum && <div>
          <div style={{fontSize:14,lineHeight:1.5,marginBottom:10}} data-no-i18n="">{sum.gesamteindruck}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:12}}>
            <div><div className="field-label" style={{color:BAD}}>{tf("Wiederkehrende Probleme")}</div>
              {sum.probleme.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine wiederkehrenden Probleme.")}</div>}
              {sum.probleme.map((p,i)=><div key={i} style={{borderTop:`1px solid ${BORDER}`,padding:"7px 0",fontSize:13}}>
                <div><b data-no-i18n="">{p.thema}</b> <span style={{color:INK_MUTED}}>· {p.abteilung} · {tf("{0}×", p.anzahl)}</span></div>
                <div style={{color:INK_MUTED,fontStyle:"italic"}} data-no-i18n="">„{p.beispiel}“</div>
                <div data-no-i18n="">→ {p.vorschlag}</div></div>)}
            </div>
            <div><div className="field-label" style={{color:GOOD}}>{tf("Was Gäste loben")}</div>
              {sum.lob.map((p,i)=><div key={i} style={{borderTop:`1px solid ${BORDER}`,padding:"7px 0",fontSize:13}}><b data-no-i18n="">{p.thema}</b> <span style={{color:INK_MUTED}}>· {tf("{0}×", p.anzahl)}</span><div style={{color:INK_MUTED,fontStyle:"italic"}} data-no-i18n="">„{p.beispiel}“</div></div>)}
              {sum.trend && <div style={{fontSize:13,marginTop:8}} data-no-i18n=""><Icon n="trend" /> {sum.trend}</div>}
            </div>
          </div>
        </div>}
      </Card>
      {lead && <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        <select className="input" style={{width:"auto"}} value={source} onChange={e=>setSource(e.target.value)}>{Object.entries(REVIEW_SOURCE_LABELS).map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select>
        <FileButton primary label={tf("Bewertungen importieren (Excel/CSV)")} busy={busy==="import"} onFile={importFile} title={tf("Spalten z. B. Bewertung, Text, Datum, Autor – wie im Export des Portals")} />
        <span style={{fontSize:12,color:INK_MUTED}}>{tf("Den Export gibt es im Partnerbereich des Portals (z. B. Booking.com Extranet, Google Unternehmensprofil).")}</span>
      </div>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {data.reviews.length>0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        {[["",tf("Alle")], ...(lead ? [["__open",tf("Unbeantwortet")]] : []), ...st.sources.map(s=>[s.source, tf(REVIEW_SOURCE_LABELS[s.source]||s.source)])].map(([k,l])=><button key={k||"all"} aria-pressed={filter===k} onClick={()=>setFilter(k)} style={{border:`1px solid ${filter===k?INK:BORDER}`,background:filter===k?INK:"#fff",color:filter===k?"#fff":INK,borderRadius:999,padding:"4px 11px",fontSize:12.5,cursor:"pointer"}}>{l}</button>)}
      </div>}
      {data.reviews.length===0 ? <Card><div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Bewertungen. Exportiere sie aus Google, Booking.com & Co. und importiere die Datei hier.")}</div></Card> :
        <Card style={{padding:0}}>{shown.slice(0,100).map(r=>(
          <div key={r.id} style={{padding:"10px 14px",borderTop:`1px solid ${BORDER}`}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",fontSize:12.5,color:INK_MUTED}}>
              <Stars value={r.rating==null?null:r.rating/(r.scale||5)*5} /><span>{tf(REVIEW_SOURCE_LABELS[r.source]||r.source)}</span>{r.review_date && <span>· {fmtDate(r.review_date)}</span>}{r.author && <span data-no-i18n="">· {r.author}</span>}
              <span style={{flex:1}} />{lead && <button style={{...linkBtn,fontSize:12}} onClick={async()=>{ if(window.confirm(tf("Bewertung löschen?"))){ try { await api("/api/reviews/"+r.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } } }}>✕</button>}
            </div>
            {r.title && <div style={{fontWeight:600,fontSize:13.5,marginTop:3}} data-no-i18n="">{r.title}</div>}
            {r.body && <div style={{fontSize:13.5,marginTop:2,whiteSpace:"pre-line"}} data-no-i18n="">{r.body}</div>}
            {lead && <ReviewReply r={r} api={api} ai={data.ai} onSaved={(x)=>setData(d=>({...d, reviews:d.reviews.map(y=>y.id===x.id?{...y,...x}:y)}))} />}
          </div>
        ))}</Card>}
    </div>
  );
}

// Antwort auf eine Bewertung: KI-Entwurf, bearbeiten, kopieren, als beantwortet markieren
const REPLY_STATUS = {offen:["Unbeantwortet",WARN,WARN_SOFT], entwurf:["Entwurf",BRASS,BRASS_SOFT], beantwortet:["Beantwortet",GOOD,GOOD_SOFT], ignoriert:["Keine Antwort nötig",INK_MUTED,"#EEF0F2"]};
function ReviewReply({r, api, ai, onSaved}){
  const [open,setOpen] = useState(false); const [text,setText] = useState(r.reply_draft||""); const [busy,setBusy] = useState(""); const [msg,setMsg] = useState(null);
  useEffect(()=>{ setText(r.reply_draft||""); },[r.reply_draft]);
  if(r.reply_status===undefined) return null; // Migration 035 noch nicht eingespielt
  const st = REPLY_STATUS[r.reply_status||"offen"] || REPLY_STATUS.offen;
  const run = async (key, fn) => { setBusy(key); setMsg(null); try { const x = await fn(); if(x) onSaved(x); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const draft = () => run("ai", async()=>{ const x = await api("/api/reviews/"+r.id+"/reply-draft","POST",{}); setOpen(true); return x; });
  const save = (status) => run(status||"save", ()=>api("/api/reviews/"+r.id,"PATCH",{reply_draft:text, ...(status?{reply_status:status}:{})}));
  const copy = async () => { try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Kopiert – jetzt im Portal einfügen.")}); } catch(e){ setMsg({ok:false,text:tf("Kopieren nicht möglich – bitte den Text markieren.")}); } };
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <Pill color={st[1]} bg={st[2]}>{tf(st[0])}</Pill>
        {!open && <button style={{...linkBtn,fontSize:12.5}} onClick={()=>setOpen(true)}>{r.reply_draft ? tf("Antwort ansehen") : tf("Antwort schreiben")}</button>}
        {ai && !r.reply_draft && <button style={{...linkBtn,fontSize:12.5,color:BRASS}} disabled={!!busy} onClick={draft}><Icon n="sparkle" /> {busy==="ai" ? tf("Wird geschrieben…") : tf("Antwort mit KI entwerfen")}</button>}
      </div>
      {open && <div style={{marginTop:8}}>
        <textarea className="input" rows={5} maxLength={3000} value={text} onChange={e=>setText(e.target.value)} placeholder={tf("Antwort an den Gast …")} aria-label={tf("Antwort an den Gast …")} autoFocus />
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
          <button style={smallBtn} disabled={!text.trim()} onClick={copy}>{tf("Kopieren")}</button>
          <button style={smallBtn} disabled={!!busy || !text.trim()} onClick={()=>save("beantwortet")}>{tf("Als beantwortet markieren")}</button>
          <button style={smallBtn} disabled={!!busy} onClick={()=>save(text.trim() ? "entwurf" : "offen")}>{tf("Entwurf speichern")}</button>
          {ai && <button style={smallBtn} disabled={!!busy} onClick={draft}><Icon n="sparkle" /> {busy==="ai" ? tf("Wird geschrieben…") : tf("Neu entwerfen")}</button>}
          <button style={{...linkBtn,fontSize:12.5}} disabled={!!busy} onClick={()=>save("ignoriert")}>{tf("Keine Antwort nötig")}</button>
        </div>
        <div style={{fontSize:11.5,color:INK_MUTED,marginTop:4}}>{tf("Bitte vor dem Veröffentlichen lesen – die Antwort erscheint öffentlich im Portal.")}</div>
      </div>}
      {msg && <div style={{fontSize:12.5,color:msg.ok?GOOD:BAD,marginTop:4}}>{msg.text}</div>}
    </div>
  );
}

// ------------------------------------------------------------ Energie und Verbrauch
const METER_KINDS = [["Strom","kWh","bolt"],["Gas","m³","fire"],["Wasser","m³","drop"],["Wärme","kWh","heat"],["Öl","l","barrel"],["Pellets","kg","log"],["Andere","","gauge"]];
function energyAlertText(a, unit){
  if(a.code==="high") return tf("Zuletzt {0} % mehr Verbrauch pro Tag als üblich", a.value);
  if(a.code==="reset") return tf("Zählerstand gesunken ({0}) – Zählertausch oder Tippfehler?", fmtDay(a.to,{day:"2-digit",month:"2-digit",year:"numeric"}));
  if(a.code==="stale") return tf("Seit {0} Tagen nicht abgelesen", a.value);
  return a.code;
}
function EnergyView({hotel, api, role}){
  const [data,setData] = useState(null); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [reading,setReading] = useState({});
  const lead = canManageDept("Technik");
  const base = "/api/hotels/"+hotel.id+"/meters";
  const load = useCallback(()=>api(base).then(setData).catch(e=>{ setMsg({ok:false,text:e.message}); setData({meters:[],readings:[]}); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(!data) return <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div>;
  const today = todayIso();
  return (
    <div>
      {lead && !form && <button className="btn-primary" style={{marginBottom:12}} onClick={()=>setForm({name:"", kind:"Strom", unit:"kWh", price_per_unit:""})}>{tf("+ Zähler")}</button>}
      {form && <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name")}><input className="input" value={form.name} placeholder={tf("z. B. Hauptzähler Strom")} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Art")}><select className="input" value={form.kind} onChange={e=>{ const k = METER_KINDS.find(x=>x[0]===e.target.value); setForm({...form,kind:e.target.value,unit:k[1]||form.unit}); }}>{METER_KINDS.map(([k])=><option key={k} value={k}>{tf(k)}</option>)}</select></Field>
          <Field label={tf("Einheit")}><input className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} /></Field>
          <Field label={tf("Preis je Einheit (optional)")}><input className="input" value={form.price_per_unit} onChange={e=>setForm({...form,price_per_unit:e.target.value})} /></Field>
        </div>
        <button className="btn-primary" disabled={!form.name.trim()} onClick={()=>run(async()=>{ const {id,...b} = form; if(id) await api("/api/meters/"+id,"PATCH",b); else await api(base,"POST",b); setForm(null); })}>{tf("Speichern")}</button>
        <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
      </Card>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {data.meters.length===0 && !form && <Card><div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Zähler. Lege Strom, Gas, Wasser oder Wärme an und trage regelmäßig die Zählerstände ein – Ouverture rechnet den Verbrauch aus und warnt bei Ausreißern.")}</div></Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:14}}>
        {data.meters.map(m=>{
          const rs = data.readings.filter(r=>r.meter_id===m.id);
          const months = energyMonthly(rs).slice(-12);
          const alerts = energyAlerts(rs, {today});
          const last = rs[rs.length-1];
          const max = Math.max(1, ...months.map(x=>x.used));
          const icon = (METER_KINDS.find(k=>k[0]===m.kind)||METER_KINDS[6])[2];
          const r = reading[m.id] || {read_on:today, value:""};
          const thisMonth = months.find(x=>x.month===today.slice(0,7));
          return (
            <Card key={m.id}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Icon n={icon} size={20} />
                <div style={{flex:1}}><div style={{fontWeight:700}} data-no-i18n="">{m.name}</div><div style={{fontSize:12,color:INK_MUTED}}>{tf(m.kind)} · {m.unit}</div></div>
                {lead && <button style={linkBtn} onClick={()=>setForm({...m, price_per_unit:m.price_per_unit??""})}>{tf("Bearbeiten")}</button>}
              </div>
              {alerts.map((a,i)=><div key={i} style={{fontSize:12.5,color:a.code==="high"?BAD:WARN,marginBottom:4}}><Icon n="alert" /> {energyAlertText(a, m.unit)}</div>)}
              <div style={{display:"flex",gap:14,fontSize:12.5,color:INK_MUTED,marginBottom:8,flexWrap:"wrap"}}>
                <span>{tf("Letzter Stand")}: <b style={{color:INK}} data-no-i18n="">{last ? Number(last.value).toLocaleString(UI_LOCALE)+" "+m.unit : "–"}</b>{last && " ("+fmtDay(last.read_on,{day:"2-digit",month:"2-digit"})+")"}</span>
                {thisMonth && <span>{tf("Dieser Monat")}: <b style={{color:INK}} data-no-i18n="">{Math.round(thisMonth.used).toLocaleString(UI_LOCALE)} {m.unit}</b>{m.price_per_unit ? " ≈ "+fmtEur(thisMonth.used*m.price_per_unit) : ""}</span>}
              </div>
              {months.length>0 && <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80,marginBottom:10}}>
                {months.map(x=><div key={x.month} title={x.month+": "+Math.round(x.used)+" "+m.unit} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:0}}>
                  <div style={{width:"100%",height:Math.max(3,60*x.used/max),background:x.month===today.slice(0,7)?BRASS:"#C9D3DF",borderRadius:"3px 3px 0 0"}} />
                  <div style={{fontSize:9.5,color:INK_MUTED}} data-no-i18n="">{new Date(x.month+"-15T12:00:00").toLocaleDateString(UI_LOCALE,{month:"narrow"})}</div>
                </div>)}
              </div>}
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <input className="input" type="date" style={{width:150}} value={r.read_on} onChange={e=>setReading({...reading,[m.id]:{...r,read_on:e.target.value}})} />
                <input className="input" inputMode="decimal" style={{width:120}} placeholder={tf("Zählerstand")} value={r.value} onChange={e=>setReading({...reading,[m.id]:{...r,value:e.target.value}})} />
                <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} disabled={!String(r.value).trim()} onClick={()=>run(async()=>{ await api("/api/meters/"+m.id+"/readings","POST",r); setReading({...reading,[m.id]:{read_on:today,value:""}}); })}>{tf("Eintragen")}</button>
              </div>
              {rs.length>0 && <details style={{marginTop:8,fontSize:12.5}}><summary style={{cursor:"pointer",color:INK_MUTED}}>{tf("Alle Stände ({0})", rs.length)}</summary>
                {rs.slice().reverse().slice(0,30).map(x=><div key={x.id} style={{display:"flex",gap:8,padding:"3px 0",borderTop:`1px solid ${BORDER}`}}><span style={{flex:1}} data-no-i18n="">{fmtDay(x.read_on,{day:"2-digit",month:"2-digit",year:"numeric"})}</span><span data-no-i18n="">{Number(x.value).toLocaleString(UI_LOCALE)}</span>
                  <button style={{...linkBtn,fontSize:11.5,padding:0}} onClick={()=>{ if(window.confirm(tf("Zählerstand löschen?"))) run(()=>api("/api/meter-readings/"+x.id,"DELETE")); }}>✕</button></div>)}
              </details>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Eröffnungs-Countdown für Eigentümer
function OwnerLinkCard({hotel, api}){
  const [link,setLink] = useState(undefined); const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id+"/owner-link";
  useEffect(()=>{ api(base).then(r=>setLink(r?r.url:null)).catch(()=>setLink(null)); },[hotel.id]);
  if(link===undefined) return null;
  const copy = (u) => { try { navigator.clipboard.writeText(u); setMsg({ok:true,text:tf("Link kopiert.")}); } catch(e){} };
  return (
    <div style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
      <div style={{fontWeight:700,fontSize:13.5,marginBottom:4}}><Icon n="flag" /> {tf("Eröffnungs-Countdown für Eigentümer")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Eine Seite ohne Anmeldung: Tage bis zur Eröffnung, Bereitschaft je Abteilung und die nächsten Meilensteine. Aufgaben, Budget und Personal bleiben verborgen.")}</div>
      {link ? <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <code style={{flex:1,minWidth:200,overflowX:"auto",whiteSpace:"nowrap",background:"#fff",border:`1px solid ${BORDER}`,borderRadius:4,padding:"6px 8px",fontSize:12}} data-no-i18n="">{link}</code>
        <button type="button" style={smallBtn} onClick={()=>copy(link)}>{tf("Kopieren")}</button>
        <a href={link} target="_blank" rel="noopener" style={{...smallBtn,textDecoration:"none",color:INK}}>{tf("Ansehen")}</a>
        <button type="button" style={linkBtn} onClick={async()=>{ if(window.confirm(tf("Link abschalten? Wer ihn hat, sieht dann nichts mehr."))){ await api(base,"DELETE"); setLink(null); } }}>{tf("Abschalten")}</button>
      </div> : <button type="button" className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={async()=>{ try { const r = await api(base,"POST",{}); setLink(r.url); copy(r.url); } catch(e){ setMsg({ok:false,text:e.message}); } }}>{tf("Link erstellen")}</button>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:12.5,marginTop:6}}>{msg.text}</div>}
    </div>
  );
}

// ------------------------------------------------------------ Dokumente: Ablaufdatum
function docExpiryInfo(d){
  if(!d.expires_at) return null;
  const days = Math.round((new Date(d.expires_at+"T12:00:00") - new Date(todayIso()+"T12:00:00"))/86400000);
  if(days<0) return {color:BAD, text:tf("abgelaufen am {0}", fmtDate(d.expires_at))};
  if(days<=d.remind_days) return {color:WARN, text:tf("läuft ab am {0}", fmtDate(d.expires_at))};
  return {color:INK_MUTED, text:tf("gültig bis {0}", fmtDate(d.expires_at))};
}
function DocExpiryEditor({d, api, onSaved, onClose}){
  const [f,setF] = useState({expires_at:d.expires_at||"", remind_days:String(d.remind_days??30), category:d.category||""});
  const [err,setErr] = useState("");
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",background:PAPER,borderRadius:6,padding:"8px 10px",marginTop:6}}>
      <label style={{fontSize:12}}><div className="field-label">{tf("Art")}</div><input className="input" style={{width:150}} list="doc-cats" value={f.category} onChange={e=>setF({...f,category:e.target.value})} /></label>
      <datalist id="doc-cats">{["Vertrag","Wartungsvertrag","Versicherung","Zertifikat","Genehmigung","Prüfbericht"].map(x=><option key={x} value={tf(x)} />)}</datalist>
      <label style={{fontSize:12}}><div className="field-label">{tf("Gültig bis")}</div><input className="input" type="date" style={{width:150}} value={f.expires_at} onChange={e=>setF({...f,expires_at:e.target.value})} /></label>
      <label style={{fontSize:12}}><div className="field-label">{tf("Erinnern")}</div><select className="input" style={{width:150}} value={f.remind_days} onChange={e=>setF({...f,remind_days:e.target.value})}>{[7,14,30,60,90].map(n=><option key={n} value={n}>{tf("{0} Tage vorher", n)}</option>)}</select></label>
      <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={async()=>{ try { await api("/api/documents/"+d.id,"PATCH",{expires_at:f.expires_at||null, remind_days:Number(f.remind_days), category:f.category}); onSaved(); } catch(e){ setErr(e.message); } }}>{tf("Speichern")}</button>
      <button style={linkBtn} onClick={onClose}>{tf("Abbrechen")}</button>
      {err && <span style={{color:BAD,fontSize:12}}>{err}</span>}
    </div>
  );
}

// ------------------------------------------------------------ Kalender-Abo
function CalendarCard({api}){
  const [feed,setFeed] = useState(undefined); const [msg,setMsg] = useState(null);
  useEffect(()=>{ api("/api/me/calendar").then(setFeed).catch(()=>setFeed(null)); },[]);
  if(feed===undefined) return null;
  const copy = () => { try { navigator.clipboard.writeText(feed.url); setMsg({ok:true,text:tf("Link kopiert.")}); } catch(e){} };
  return (
    <Card style={{marginBottom:18,maxWidth:520}}>
      <div style={{fontWeight:700,marginBottom:6}}><Icon n="calendar" /> {tf("Dienstplan im Handy-Kalender")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Deine veröffentlichten Schichten erscheinen automatisch in Google Kalender, Apple Kalender oder Outlook – und bleiben aktuell. Der Link ist persönlich: bitte nicht weitergeben.")}</div>
      {feed ? <div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          <a className="btn-primary" style={{padding:"7px 12px",fontSize:12.5,textDecoration:"none"}} href={feed.webcal}>{tf("Im Kalender öffnen")}</a>
          <button style={smallBtn} onClick={copy}>{tf("Link kopieren")}</button>
          <button style={linkBtn} onClick={async()=>{ if(window.confirm(tf("Neuen Link erzeugen? Der alte funktioniert dann nicht mehr."))){ setFeed(await api("/api/me/calendar","POST",{})); setMsg({ok:true,text:tf("Neuer Link erstellt.")}); } }}>{tf("Neuer Link")}</button>
          <button style={linkBtn} onClick={async()=>{ await api("/api/me/calendar","DELETE"); setFeed(null); }}>{tf("Abschalten")}</button>
        </div>
        <div style={{fontSize:12,color:INK_MUTED}}>{tf("Google Kalender: Weitere Kalender → Per URL → Link einfügen.")}</div>
      </div> : <button className="btn-primary" onClick={async()=>{ try { setFeed(await api("/api/me/calendar","POST",{})); } catch(e){ setMsg({ok:false,text:e.message}); } }}>{tf("Kalender-Abo einschalten")}</button>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:12.5,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Anmeldung mit Google / Microsoft (Supabase OAuth)
let OAUTH_PROVIDERS = null;
function useOAuthProviders(config){
  const [list,setList] = useState(OAUTH_PROVIDERS || []);
  useEffect(()=>{
    if(OAUTH_PROVIDERS || window.OUVERTURE_DEMO) return;
    fetch(config.supabaseUrl.replace(/\/$/,"")+"/auth/v1/settings", {headers:{apikey:config.supabaseAnonKey}})
      .then(r=>r.ok?r.json():{}).then(s=>{ const ext = s.external||{}; OAUTH_PROVIDERS = ["google","azure"].filter(p=>ext[p]); setList(OAUTH_PROVIDERS); }).catch(()=>{});
  },[]);
  return list;
}
function oauthStart(config, provider){
  const redirect = window.location.origin + window.location.pathname;
  const extra = provider==="azure" ? "&scopes="+encodeURIComponent("email") : "";
  window.location.href = config.supabaseUrl.replace(/\/$/,"")+"/auth/v1/authorize?provider="+provider+"&redirect_to="+encodeURIComponent(redirect)+extra;
}
function OAuthButtons({config}){
  const list = useOAuthProviders(config);
  if(!list.length) return null;
  const btn = {width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",border:`1px solid ${BORDER}`,borderRadius:6,padding:"9px 12px",fontSize:13.5,fontWeight:600,cursor:"pointer",marginBottom:8,color:INK};
  return (
    <div style={{marginTop:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 0 10px",color:INK_MUTED,fontSize:12}}><div style={{flex:1,height:1,background:BORDER}} />{tf("oder")}<div style={{flex:1,height:1,background:BORDER}} /></div>
      {list.includes("google") && <button style={btn} onClick={()=>oauthStart(config,"google")}><svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>{tf("Mit Google anmelden")}</button>}
      {list.includes("azure") && <button style={btn} onClick={()=>oauthStart(config,"azure")}><svg width="15" height="15" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>{tf("Mit Microsoft anmelden")}</button>}
    </div>
  );
}

