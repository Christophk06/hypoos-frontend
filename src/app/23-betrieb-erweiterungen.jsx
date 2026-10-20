// ============================================================ Migration 031: Gerätebuch, Kontrollgänge, Arbeitsanweisungen,
// Urlaubskonto, Krankmeldung, Ortstaxe, Reinigungsaufwand. Rechte prüft die Datenbank; die Oberfläche blendet nur aus.
const isoMonthsAhead = (iso, n) => { const d = new Date(iso+"T12:00:00Z"); d.setUTCMonth(d.getUTCMonth()+n); return d.toISOString().slice(0,10); };
const useList = (api, url) => {
  const [list,setList] = useState(null); const [error,setError] = useState("");
  const load = useCallback(()=>api(url).then(x=>{ setList(x); setError(""); }).catch(e=>{ setError(e.message); setList([]); }),[api, url]);
  useEffect(()=>{ load(); },[load]);
  return [list, load, error];
};
const btnLine = {background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 14px",fontSize:13.5,cursor:"pointer",color:INK};

// ------------------------------------------------------------ Gerätebuch
function AssetsView({hotel, api}){
  const [list, load, error] = useList(api, "/api/hotels/"+hotel.id+"/assets");
  const [form,setForm] = useState(null); const [msg,setMsg] = useState(null);
  const empty = {name:"", category:"", location:"", manufacturer:"", model:"", serial_no:"", department:"Technik", purchased_on:"", warranty_until:"", inspection_interval_months:"", last_inspection:"", next_inspection:"", notes:""};
  const save = async () => {
    setMsg(null);
    try { if(form.id) await api("/api/assets/"+form.id,"PATCH",form); else await api("/api/hotels/"+hotel.id+"/assets","POST",form); setForm(null); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const inspected = async (a) => { try { await api("/api/assets/"+a.id,"PATCH",{last_inspection:todayIso(), next_inspection: a.inspection_interval_months ? isoMonthsAhead(todayIso(), a.inspection_interval_months) : a.next_inspection}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const today = todayIso(), soon = isoMonthsAhead(today, 1);
  const state = (a) => a.next_inspection && a.next_inspection < today ? [BAD,BAD_SOFT,tf("Prüfung überfällig")] : a.next_inspection && a.next_inspection <= soon ? [WARN,WARN_SOFT,tf("Prüfung bald fällig")] : a.warranty_until && a.warranty_until >= today && a.warranty_until <= soon ? [WARN,WARN_SOFT,tf("Garantie endet bald")] : null;
  const F = (k, label, props) => <Field label={tf(label)}><input className="input" value={form[k]??""} onChange={e=>setForm({...form,[k]:e.target.value})} {...(props||{})} /></Field>;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Geräte und Anlagen mit Garantie, Seriennummer und Prüfterminen. Ouverture zeigt, was bald geprüft werden muss.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      {!form && <button className="btn-primary" style={{marginBottom:14}} onClick={()=>setForm(empty)}>{tf("Gerät anlegen")}</button>}
      {form && <Card style={{marginBottom:16,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0 10px"}}>
          {F("name","Name")}{F("category","Art (z. B. Kühlung, Heizung, Aufzug)")}{F("location","Standort")}
          {F("manufacturer","Hersteller")}{F("model","Modell")}{F("serial_no","Seriennummer")}
          <Field label={tf("Abteilung")}><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select></Field>
          {F("purchased_on","Gekauft am",{type:"date"})}{F("warranty_until","Garantie bis",{type:"date"})}
          {F("inspection_interval_months","Prüfintervall (Monate)",{type:"number",min:1,max:120})}{F("last_inspection","Letzte Prüfung",{type:"date"})}{F("next_inspection","Nächste Prüfung",{type:"date"})}
        </div>
        <Field label={tf("Notizen (z. B. Wartungsfirma, Vertrag)")}><textarea className="input" rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {list && list.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Geräte erfasst.")}</div>}
      {list && list.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:640}}>
        <thead><tr style={{textAlign:"start",color:INK_MUTED,fontSize:12}}><th style={{padding:10,textAlign:"start"}}>{tf("Gerät")}</th><th style={{textAlign:"start"}}>{tf("Standort")}</th><th style={{textAlign:"start"}}>{tf("Garantie bis")}</th><th style={{textAlign:"start"}}>{tf("Nächste Prüfung")}</th><th></th></tr></thead>
        <tbody>{list.map(a=>{ const st = state(a); return (
          <tr key={a.id} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:10}}><b data-no-i18n="">{a.name}</b><div style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{[a.category, a.manufacturer, a.model, a.serial_no].filter(Boolean).join(" · ")}</div></td>
            <td data-no-i18n="">{a.location||"–"}</td>
            <td>{a.warranty_until ? fmtDate(a.warranty_until) : "–"}</td>
            <td>{a.next_inspection ? fmtDate(a.next_inspection) : "–"} {st && <Pill color={st[0]} bg={st[1]}>{st[2]}</Pill>}</td>
            <td style={{whiteSpace:"nowrap",textAlign:"end",paddingInlineEnd:10}}>
              {a.next_inspection && <button style={linkBtn} onClick={()=>inspected(a)}>{tf("Heute geprüft")}</button>}
              <button style={linkBtn} onClick={()=>setForm({...empty, ...Object.fromEntries(Object.entries(a).map(([k,v])=>[k, v??""]))})}>{tf("Bearbeiten")}</button>
            </td>
          </tr>); })}</tbody></table></Card>}
    </div>
  );
}

// ------------------------------------------------------------ Kontrollgänge mit QR-Code
const PATROL_KIND_LABEL = {brandschutz:"Brandschutz", legionellen:"Legionellen / Wassertemperatur", nachtrunde:"Nachtrunde", technik:"Technik", sonstiges:"Sonstiges"};
const patrolUrl = (token) => window.location.origin + window.location.pathname.replace(/[^/]*$/, "") + "index.html?patrol=" + encodeURIComponent(token);
function PatrolsView({hotel, api}){
  const [points, loadPoints] = useList(api, "/api/hotels/"+hotel.id+"/patrol-points");
  const [scans, loadScans] = useList(api, "/api/hotels/"+hotel.id+"/patrol-scans");
  const [form,setForm] = useState(null); const [msg,setMsg] = useState(null);
  const lead = isLeadRole();
  const save = async () => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/patrol-points","POST",form); setForm(null); loadPoints(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const lastScan = (p) => (scans||[]).find(s=>s.point_id===p.id);
  const pointName = (id) => ((points||[]).find(p=>p.id===id)||{}).name || "–";
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("QR-Codes an Brandschutztüren, Wasserhähnen oder Kontrollpunkten aufhängen. Wer den Code mit dem Handy scannt, bestätigt den Kontrollgang mit Uhrzeit – auf Wunsch mit Temperatur und Notiz.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {lead && !form && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <button className="btn-primary" onClick={()=>setForm({name:"", kind:"brandschutz", department:"Technik"})}>{tf("Kontrollpunkt anlegen")}</button>
        {(points||[]).length>0 && <button style={btnLine} onClick={()=>printQrCards(points.filter(p=>p.active).map(p=>({label:p.name, url:patrolUrl(p.token), text:tf(PATROL_KIND_LABEL[p.kind]||p.kind)})), tf("Kontrollgänge"))}>{tf("QR-Codes drucken")}</button>}
      </div>}
      {form && <Card style={{marginBottom:16,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name (z. B. Brandschutztür Keller)")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Art")}><select className="input" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{Object.entries(PATROL_KIND_LABEL).map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
          <Field label={tf("Abteilung")}><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select></Field>
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {points && points.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Kontrollpunkte.")}</div>}
      {points && points.length>0 && <Card style={{padding:0,marginBottom:16}}>
        {points.map(p=>{ const s = lastScan(p); return (
          <div key={p.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200}}><b data-no-i18n="">{p.name}</b><div style={{fontSize:12,color:INK_MUTED}}>{tf(PATROL_KIND_LABEL[p.kind]||p.kind)} · {translateString(p.department)}{!p.active ? " · "+tf("inaktiv") : ""}</div></div>
            <div style={{fontSize:12.5,color:s ? (s.ok ? GOOD : BAD) : INK_MUTED}}>{s ? tf("Zuletzt {0}", fmtDateTime(s.scanned_at)) + (s.ok ? "" : " · "+tf("Problem")) : tf("Noch nie kontrolliert")}</div>
            {lead && <button style={linkBtn} onClick={async()=>{ try { await api("/api/patrol-points/"+p.id,"PATCH",{active:!p.active}); loadPoints(); } catch(e){ setMsg({ok:false,text:e.message}); } }}>{p.active ? tf("Deaktivieren") : tf("Aktivieren")}</button>}
          </div>); })}
      </Card>}
      {scans && scans.length>0 && <Card>
        <div style={{fontWeight:700,marginBottom:8}}>{tf("Letzte Kontrollen (30 Tage)")}</div>
        {scans.slice(0,100).map(s=><div key={s.id} style={{display:"flex",gap:10,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,flexWrap:"wrap"}}>
          <div style={{minWidth:130,color:INK_MUTED}}>{fmtDateTime(s.scanned_at)}</div>
          <div style={{flex:1}} data-no-i18n="">{pointName(s.point_id)}{s.temperature!=null ? " · "+s.temperature+" °C" : ""}{s.note ? " – "+s.note : ""}</div>
          {s.ok ? <Pill color={GOOD} bg={GOOD_SOFT}>{tf("in Ordnung")}</Pill> : <Pill color={BAD} bg={BAD_SOFT}>{tf("Problem")}</Pill>}
        </div>)}
      </Card>}
    </div>
  );
}
// Nach dem Scannen eines Kontrollpunkt-QR-Codes (index.html?patrol=…)
function PatrolScanDialog({api, token, onClose}){
  const [point,setPoint] = useState(null); const [error,setError] = useState("");
  const [f,setF] = useState({ok:true, temperature:"", note:""}); const [done,setDone] = useState(false); const [busy,setBusy] = useState(false);
  useEffect(()=>{ api("/api/patrol/"+encodeURIComponent(token)).then(setPoint).catch(e=>setError(e.message)); },[token]);
  const send = async () => { setBusy(true); setError(""); try { await api("/api/patrol/"+encodeURIComponent(token)+"/scan","POST",f); setDone(true); } catch(e){ setError(e.message); } setBusy(false); };
  return (
    <Overlay onClose={onClose} width={460} label={tf("Kontrollgang bestätigen")}>
      <div style={{fontFamily:"Fraunces, serif",fontSize:20,fontWeight:600,marginBottom:6}}>{tf("Kontrollgang bestätigen")}</div>
      {error && <div style={{color:BAD,fontSize:13.5,marginBottom:10}}>{error}</div>}
      {point && !done && <div>
        <div style={{fontSize:15,marginBottom:12}}><b data-no-i18n="">{point.name}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf(PATROL_KIND_LABEL[point.kind]||point.kind)}{point.hotels ? " · " : ""}<span data-no-i18n="">{point.hotels ? point.hotels.name : ""}</span></div></div>
        <div role="radiogroup" style={{display:"flex",gap:8,marginBottom:12}}>
          {[[true, tf("Alles in Ordnung")], [false, tf("Problem gefunden")]].map(([v,l])=><button key={String(v)} type="button" role="radio" aria-checked={f.ok===v} onClick={()=>setF({...f,ok:v})}
            style={{flex:1,minHeight:48,border:`1px solid ${f.ok===v?(v?GOOD:BAD):BORDER}`,background:f.ok===v?(v?GOOD_SOFT:BAD_SOFT):"#fff",color:INK,borderRadius:10,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
        </div>
        {(point.kind==="legionellen" || point.kind==="technik") && <Field label={tf("Temperatur in °C (optional)")}><input className="input" inputMode="decimal" value={f.temperature} onChange={e=>setF({...f,temperature:e.target.value.replace(",",".")})} /></Field>}
        <Field label={f.ok ? tf("Notiz (optional)") : tf("Was ist das Problem?")}><textarea className="input" rows={2} value={f.note} onChange={e=>setF({...f,note:e.target.value})} /></Field>
        <button className="btn-primary" style={{width:"100%"}} disabled={busy || (!f.ok && !f.note.trim())} onClick={send}>{busy ? tf("Speichert…") : tf("Bestätigen")}</button>
      </div>}
      {done && <div><div style={{color:GOOD,fontSize:15,marginBottom:12}}>✓ {tf("Kontrolle gespeichert.")}</div><button className="btn-primary" onClick={onClose}>{tf("Schließen")}</button></div>}
      {!point && !error && <div style={{color:INK_MUTED}}>…</div>}
    </Overlay>
  );
}

// ------------------------------------------------------------ Arbeitsanweisungen mit Fotos
function InstructionsView({hotel, api}){
  const [list, load, error] = useList(api, "/api/hotels/"+hotel.id+"/work-instructions");
  const [open,setOpen] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [dept,setDept] = useState("");
  const canWrite = DEPARTMENTS.some(d=>canManageDept(d));
  const save = async () => { setMsg(null);
    try { const body = {title:form.title, department:form.department, steps:form.steps.filter(s=>s.text.trim())};
      if(form.id) await api("/api/work-instructions/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/work-instructions","POST",body);
      setForm(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const del = async (w) => { if(!window.confirm(tf("Diese Arbeitsanweisung löschen?"))) return; try { await api("/api/work-instructions/"+w.id,"DELETE"); setOpen(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const setStep = (i, k, v) => setForm({...form, steps: form.steps.map((s,j)=>j===i ? {...s,[k]:v} : s)});
  const shown = (list||[]).filter(w=>!dept || w.department===dept);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Schritt für Schritt mit Fotos – zum Beispiel „So wird das Bett gemacht“ oder „Kaffeemaschine reinigen“. Texte in anderen Sprachen übersetzt Ouverture beim Lesen.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      {!form && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {canWrite && <button className="btn-primary" onClick={()=>setForm({title:"", department:DEPARTMENTS.find(d=>canManageDept(d)), steps:[{text:""}]})}>{tf("Anweisung anlegen")}</button>}
        <select className="input" style={{width:"auto"}} value={dept} onChange={e=>setDept(e.target.value)} aria-label={tf("Abteilung")}><option value="">{tf("Alle Abteilungen")}</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select>
      </div>}
      {form && <Card style={{marginBottom:16,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"0 10px"}} className="stack">
          <Field label={tf("Titel")}><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></Field>
          <Field label={tf("Abteilung")}><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.filter(d=>canManageDept(d)).map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select></Field>
        </div>
        {form.steps.map((st,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
            <div style={{fontFamily:"Fraunces, serif",fontSize:20,color:BRASS,minWidth:24}} data-no-i18n="">{i+1}</div>
            <div style={{flex:1}}>
              <textarea className="input" rows={2} value={st.text} onChange={e=>setStep(i,"text",e.target.value)} aria-label={tf("Schritt {0}", i+1)} />
              <div style={{display:"flex",gap:10,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
                {st.photo_data && <img src={st.photo_data} alt="" style={{height:56,borderRadius:6}} />}
                <label style={{...smallBtn,cursor:"pointer"}}>{st.photo_data ? tf("Anderes Foto") : tf("Foto hinzufügen")}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{ try { setStep(i,"photo_data", await compressImage(e.target.files[0], 1280)); } catch(x){ setMsg({ok:false,text:x.message}); } }} /></label>
                {st.photo_data && <button style={linkBtn} onClick={()=>setStep(i,"photo_data",null)}>{tf("Foto entfernen")}</button>}
                {form.steps.length>1 && <button style={linkBtn} onClick={()=>setForm({...form,steps:form.steps.filter((_,j)=>j!==i)})}>{tf("Schritt entfernen")}</button>}
              </div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {form.steps.length<40 && <button style={btnLine} onClick={()=>setForm({...form,steps:[...form.steps,{text:""}]})}>{tf("Schritt hinzufügen")}</button>}
          <button className="btn-primary" onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      </Card>}
      {list && shown.length===0 && !form && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Arbeitsanweisungen.")}</div>}
      {!form && shown.map(w=>(
        <Card key={w.id} style={{marginBottom:10}}>
          <div {...pressable(()=>setOpen(open===w.id?null:w.id))} aria-expanded={open===w.id} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
            <div style={{flex:1}}><b>{w.title}</b><div style={{fontSize:12,color:INK_MUTED}}>{translateString(w.department)} · {tf("{0} Schritte", (w.steps||[]).length)}</div></div>
            <span style={{color:INK_MUTED}}>{open===w.id ? "▴" : "▾"}</span>
          </div>
          {open===w.id && <div style={{marginTop:12}}>
            {(w.steps||[]).map((st,i)=><div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderTop:`1px solid ${BORDER}`}}>
              <div style={{fontFamily:"Fraunces, serif",fontSize:22,color:BRASS,minWidth:26}} data-no-i18n="">{i+1}</div>
              <div style={{flex:1}}><div style={{fontSize:14.5,whiteSpace:"pre-wrap"}}>{st.text}</div>{st.photo_data && <img src={st.photo_data} alt="" style={{maxWidth:"100%",maxHeight:320,borderRadius:8,marginTop:8}} />}</div>
            </div>)}
            {canManageDept(w.department) && <div style={{display:"flex",gap:8,marginTop:8}}>
              <button style={linkBtn} onClick={()=>setForm({id:w.id, title:w.title, department:w.department, steps:(w.steps||[]).map(s=>({...s}))})}>{tf("Bearbeiten")}</button>
              <button style={{...linkBtn,color:BAD}} onClick={()=>del(w)}>{tf("Löschen")}</button>
            </div>}
          </div>}
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Krankmeldung (eigene) und Übersicht (Admin, Leitung Personal)
function SickNoteCard({hotel, api}){
  const [open,setOpen] = useState(false); const [f,setF] = useState({from_date:todayIso(), to_date:todayIso(), note:"", photo_data:null});
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const send = async () => { setBusy(true); setMsg(null);
    try { await api("/api/hotels/"+hotel.id+"/sick-notes","POST",f); setMsg({ok:true,text:tf("Krankmeldung gesendet. Gute Besserung!")}); setOpen(false); setF({from_date:todayIso(), to_date:todayIso(), note:"", photo_data:null}); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}><b>{tf("Krank melden")}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Mit Foto der Bestätigung. Sehen können das nur Admins und die Leitung Personal.")}</div></div>
        {!open && <button style={btnLine} onClick={()=>setOpen(true)}>{tf("Krank melden")}</button>}
      </div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
      {open && <div style={{marginTop:12}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Field label={tf("Von")}><input className="input" type="date" value={f.from_date} onChange={e=>setF({...f,from_date:e.target.value})} /></Field>
          <Field label={tf("Bis voraussichtlich")}><input className="input" type="date" value={f.to_date} min={f.from_date} onChange={e=>setF({...f,to_date:e.target.value})} /></Field>
        </div>
        <Field label={tf("Notiz (optional, keine Diagnose nötig)")}><input className="input" value={f.note} onChange={e=>setF({...f,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          {f.photo_data && <img src={f.photo_data} alt="" style={{height:56,borderRadius:6}} />}
          <label style={{...smallBtn,cursor:"pointer"}}>{f.photo_data ? tf("Anderes Foto") : tf("Foto der Bestätigung")}
            <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={async e=>{ try { setF({...f, photo_data: await compressImage(e.target.files[0], 1600)}); } catch(x){ setMsg({ok:false,text:x.message}); } }} /></label>
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={busy} onClick={send}>{busy ? tf("Speichert…") : tf("Senden")}</button><button style={btnLine} onClick={()=>setOpen(false)}>{tf("Abbrechen")}</button></div>
      </div>}
    </Card>
  );
}
function SickNotesView({hotel, api, members}){
  const [list, load, error] = useList(api, "/api/hotels/"+hotel.id+"/sick-notes");
  const [photo,setPhoto] = useState(null); const [msg,setMsg] = useState(null);
  const who = (id) => ((members||[]).find(m=>m.user_id===id)||{}).email || "–";
  return (
    <div>
      <SickNoteCard hotel={hotel} api={api} />
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Gesundheitsdaten: nur für Admins und die Leitung Personal sichtbar. Löschen kann nur ein Admin.")}</div>
      {(error || msg) && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error || msg}</div>}
      {list && list.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Krankmeldungen.")}</div>}
      {list && list.length>0 && <Card style={{padding:0}}>{list.map(n=>(
        <div key={n.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:200}}><b data-no-i18n="">{who(n.user_id)}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{fmtDate(n.from_date)} – {fmtDate(n.to_date)}{n.note ? " · " : ""}<span data-no-i18n="">{n.note||""}</span></div></div>
          {n.has_photo && <button style={linkBtn} onClick={()=>api("/api/sick-notes/"+n.id+"/photo").then(r=>setPhoto(r.photo_data)).catch(e=>setMsg(e.message))}>{tf("Bestätigung ansehen")}</button>}
          {ACCESS.role==="admin" && <button style={{...linkBtn,color:BAD}} onClick={async()=>{ if(!window.confirm(tf("Diese Krankmeldung löschen?"))) return; try { await api("/api/sick-notes/"+n.id,"DELETE"); load(); } catch(e){ setMsg(e.message); } }}>{tf("Löschen")}</button>}
        </div>))}</Card>}
      {photo && <Overlay onClose={()=>setPhoto(null)} width={640} label={tf("Bestätigung")}><img src={photo} alt={tf("Bestätigung")} style={{maxWidth:"100%",borderRadius:8}} /><div style={{marginTop:10}}><button className="btn-primary" onClick={()=>setPhoto(null)}>{tf("Schließen")}</button></div></Overlay>}
    </div>
  );
}

// ------------------------------------------------------------ Urlaubskonto (im Dienstplan)
function LeaveCard({orgId, api, members, me, canManage}){
  const year = Number(todayIso().slice(0,4));
  const [data,setData] = useState(null); const [msg,setMsg] = useState(null); const [open,setOpen] = useState(false);
  const load = useCallback(()=>api("/api/organizations/"+orgId+"/leave?year="+year).then(setData).catch(e=>setMsg({ok:false,text:e.message})),[orgId]);
  useEffect(()=>{ if(open || !canManage) load(); },[open, load]);
  if(!orgId) return null;
  const bal = (uid) => (data && data.balances.find(b=>b.user_id===uid)) || {entitlement_days:25, carried_over_days:0};
  const used = (uid) => (data && data.used[uid]) || 0;
  const rest = (uid) => { const b = bal(uid); return Number(b.entitlement_days) + Number(b.carried_over_days) - used(uid); };
  const save = async (uid, k, v) => { const b = {...bal(uid), [k]: Number(String(v).replace(",","."))};
    try { await api("/api/organizations/"+orgId+"/leave","PUT",{user_id:uid, year, entitlement_days:b.entitlement_days, carried_over_days:b.carried_over_days}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(!canManage) return data ? <div style={{fontSize:13.5,margin:"0 0 12px"}}>{tf("Dein Resturlaub {0}: {1} Tage", year, fmtHours(rest(me && me.id)))}</div> : null;
  const people = (members||[]).filter(m=>m.role!=="viewer");
  return (
    <Card style={{marginTop:14}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{fontWeight:700,flex:1}}>{tf("Urlaubskonto {0}", year)}</div><span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:10,overflowX:"auto"}}>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Verbraucht zählt jeden Tag mit einer Schicht „Urlaub“ im Dienstplan.")}</div>
        {msg && <div style={{color:BAD,fontSize:13,marginBottom:8}}>{msg.text}</div>}
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:520}}>
          <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{textAlign:"start",padding:6}}>{tf("Name")}</th><th>{tf("Anspruch")}</th><th>{tf("Übertrag")}</th><th>{tf("Verbraucht")}</th><th>{tf("Rest")}</th></tr></thead>
          <tbody>{people.map(m=>(
            <tr key={m.user_id} style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:6}} data-no-i18n="">{m.email}</td>
              <td style={{textAlign:"center"}}><input className="input" style={{width:70}} inputMode="decimal" defaultValue={bal(m.user_id).entitlement_days} onBlur={e=>save(m.user_id,"entitlement_days",e.target.value)} aria-label={tf("Anspruch")} /></td>
              <td style={{textAlign:"center"}}><input className="input" style={{width:70}} inputMode="decimal" defaultValue={bal(m.user_id).carried_over_days} onBlur={e=>save(m.user_id,"carried_over_days",e.target.value)} aria-label={tf("Übertrag")} /></td>
              <td style={{textAlign:"center"}}>{used(m.user_id)}</td>
              <td style={{textAlign:"center",fontWeight:700,color:rest(m.user_id)<0?BAD:INK}}>{fmtHours(rest(m.user_id))}</td>
            </tr>))}</tbody>
        </table>
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Ortstaxe / Nächtigungsabgabe
function TourismTaxView({hotel, api, onHotel}){
  const [year,setYear] = useState(Number(todayIso().slice(0,4)));
  const [data,setData] = useState(null); const [msg,setMsg] = useState(null);
  const [rate,setRate] = useState(String((hotel.tourism_tax && hotel.tourism_tax.rate_per_night) || ""));
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/tourism-tax?year="+year).then(setData).catch(e=>setMsg({ok:false,text:e.message})),[hotel.id, year]);
  useEffect(()=>{ load(); },[load]);
  const r = Number(String(rate).replace(",",".")) || 0;
  const cur = hotel.currency || "EUR";
  const money = (n) => Number(n||0).toLocaleString(UI_LOCALE,{style:"currency",currency:cur});
  const row = (m) => (data && data.months.find(x=>x.month.slice(0,7)===m)) || {overnight_stays:0, exempt_stays:0};
  const months = Array.from({length:12},(_,i)=>year+"-"+String(i+1).padStart(2,"0"));
  const saveMonth = async (m, k, v) => { const cur = row(m); const body = {month:m, overnight_stays:cur.overnight_stays, exempt_stays:cur.exempt_stays, [k]: Math.max(0, parseInt(v,10)||0)};
    try { await api("/api/hotels/"+hotel.id+"/tourism-tax","PUT",body); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const saveRate = async () => { try { onHotel(await api("/api/hotels/"+hotel.id,"PATCH",{tourism_tax:{...(hotel.tourism_tax||{}), rate_per_night:r}})); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const total = months.reduce((s,m)=>{ const x = row(m); return s + Math.max(0, x.overnight_stays - x.exempt_stays); }, 0);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Nächtigungen je Monat für die Ortstaxe bzw. Nächtigungsabgabe Ihrer Gemeinde. Satz und Befreiungen (z. B. Kinder) regelt das jeweilige Landesgesetz – bitte bei der Gemeinde prüfen.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <Card style={{marginBottom:14,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
        <Field label={tf("Abgabe je Person und Nacht ({0})", cur)}><input className="input" style={{width:140}} inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)} /></Field>
        {ACCESS.role==="admin" && <button style={{...btnLine,marginBottom:14}} onClick={saveRate}>{tf("Satz speichern")}</button>}
        <Field label={tf("Jahr")}><select className="input" value={year} onChange={e=>setYear(Number(e.target.value))}>{[year-1, year, year+1].map(y=><option key={y} value={y}>{y}</option>)}</select></Field>
      </Card>
      <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:520}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{textAlign:"start",padding:10}}>{tf("Monat")}</th><th>{tf("Nächtigungen")}</th><th>{tf("davon befreit")}</th><th>{tf("Abgabepflichtig")}</th><th style={{textAlign:"end",paddingInlineEnd:10}}>{tf("Betrag")}</th></tr></thead>
        <tbody>{months.map(m=>{ const x = row(m), due = Math.max(0, x.overnight_stays - x.exempt_stays); return (
          <tr key={m+(data?data.months.length:0)} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:10}}>{new Date(m+"-01T12:00:00Z").toLocaleDateString(UI_LOCALE,{month:"long"})}</td>
            <td style={{textAlign:"center"}}><input className="input" style={{width:90}} inputMode="numeric" defaultValue={x.overnight_stays||""} onBlur={e=>saveMonth(m,"overnight_stays",e.target.value)} aria-label={tf("Nächtigungen")} /></td>
            <td style={{textAlign:"center"}}><input className="input" style={{width:90}} inputMode="numeric" defaultValue={x.exempt_stays||""} onBlur={e=>saveMonth(m,"exempt_stays",e.target.value)} aria-label={tf("davon befreit")} /></td>
            <td style={{textAlign:"center"}}>{due}</td>
            <td style={{textAlign:"end",paddingInlineEnd:10}}>{r ? money(due*r) : "–"}</td>
          </tr>); })}
          <tr style={{borderTop:`2px solid ${INK}`,fontWeight:700}}><td style={{padding:10}}>{tf("Summe")}</td><td></td><td></td><td style={{textAlign:"center"}}>{total}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{r ? money(total*r) : "–"}</td></tr>
        </tbody></table></Card>
    </div>
  );
}

// ------------------------------------------------------------ Reinigungsaufwand je Zimmertyp (Zimmerstatus, Leitung Housekeeping)
function RoomCreditsCard({hotel, api, rooms, onDone}){
  const [open,setOpen] = useState(false); const [msg,setMsg] = useState(null);
  if(!canManageDept("Housekeeping") || !(rooms||[]).length || (rooms||[])[0].cleaning_credits===undefined) return null;
  const types = [...new Set(rooms.map(r=>r.room_type||""))].sort();
  const creditOf = (t) => { const r = rooms.find(x=>(x.room_type||"")===t); return r ? Number(r.cleaning_credits) : 1; };
  const save = async (t, v) => { const n = Number(String(v).replace(",",".")); if(!(n>=0.1 && n<=10)) return setMsg({ok:false,text:tf("Bitte einen Wert zwischen 0,1 und 10 angeben.")});
    try { await api("/api/hotels/"+hotel.id+"/room-credits","PUT",{room_type:t, credits:n}); setMsg({ok:true,text:tf("Gespeichert.")}); onDone && onDone(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <span>
      <button style={smallBtn} onClick={()=>setOpen(!open)} aria-expanded={open}>{tf("Aufwand je Zimmertyp")}</button>
      {open && <Card style={{marginTop:10,borderColor:BRASS}}>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("1,0 = normales Zimmer. Eine Suite mit 2,0 zählt beim fairen Verteilen doppelt.")}</div>
        {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:8}}>{msg.text}</div>}
        {types.map(t=><div key={t} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`}}>
          <div style={{flex:1}} data-no-i18n="">{t || tf("ohne Zimmertyp")}</div>
          <input className="input" style={{width:80}} inputMode="decimal" defaultValue={creditOf(t)} onBlur={e=>save(t, e.target.value)} aria-label={tf("Aufwand")} />
        </div>)}
      </Card>}
    </span>
  );
}
