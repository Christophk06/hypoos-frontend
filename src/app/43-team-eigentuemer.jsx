// ============================================================ Paket 043: Team & Eigentümer
// (1) Unfall- und Schadensprotokoll, (2) Personalverpflegung, (3) KV-Lohnprüfung, (4) Renovierungs-Planer.
// Rechte prüfen Server und Datenbank (routes-ops2.js, Migration 043); die Oberfläche blendet nur aus.

const teMain = {minHeight:44};
const teBtn = {...smallBtn, minHeight:44};
const teMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD_TEXT:BAD,fontSize:13,margin:"6px 0 10px"}}>{msg.text}</div> : null;
const teH = (text, icon) => <h2 className="ui-h" style={{fontSize:16,fontWeight:700,margin:"0 0 8px"}}>{icon ? <Icon n={icon} /> : null} {text}</h2>;
const teGrid = {display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"};
const teEur = (n, d) => Number(n||0).toLocaleString(UI_LOCALE,{style:"currency",currency:"EUR",maximumFractionDigits:d==null?2:d,minimumFractionDigits:d==null?2:d});
const teLocal = (iso) => { if(!iso) return ""; const d = new Date(iso); const p = (n)=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); };
const teAddDays = (iso, n) => { const d = new Date(iso+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const teName = (members, me, id) => id ? memberLabel(members||[], me, id) : "–";
// CSV mit Semikolon; Zellen, die mit = + - @ beginnen, werden entschärft (Formel-Einschleusung in Tabellenprogrammen)
const teCsv = (rows, fileName) => {
  const cell = (x) => { let s = String(x==null?"":x); if(/^[=+\-@\t\r]/.test(s)) s = "'"+s; return '"'+s.replace(/"/g,'""')+'"'; };
  downloadBlob(new Blob(["﻿"+rows.map(r=>r.map(cell).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}), fileName);
};
const teIsHr = () => ACCESS.role==="admin" || (ACCESS.role==="manager" && canManageDept("Personal"));

// ------------------------------------------------------------ 1. Unfall- und Schadensprotokoll
const TE_KINDS = ["Gästeunfall","Mitarbeiterunfall","Sachschaden","Diebstahl","Sonstiges"];
const TE_INC_STATUS = {offen:[WARN_TEXT,WARN_SOFT], gemeldet:[BRASS_TEXT,BRASS_SOFT], abgeschlossen:[GOOD_TEXT,GOOD_SOFT]};
const teEmptyIncident = () => ({kind:"Gästeunfall", occurred_at:teLocal(new Date().toISOString()), location:"", description:"", persons:[{name:"",role:"",contact:""}], witnesses:[], measures:"", photos:[], signature_data:null, insurer:"", insurer_notified_at:"", status:"offen"});

function teIncidentHtml(hotel, x, members, me){
  const ppl = (list) => (list||[]).length ? '<table class="t"><thead><tr><th>'+fsT("Name")+'</th><th>'+fsT("Rolle")+'</th><th>'+fsT("Kontakt")+'</th></tr></thead><tbody>'
    + list.map(p=>'<tr><td>'+fsEsc(p.name||"")+'</td><td>'+fsEsc(p.role||"")+'</td><td>'+fsEsc(p.contact||"")+'</td></tr>').join("")+'</tbody></table>' : '<p>–</p>';
  const photos = (x.photos||[]).filter(p=>/^data:image\/(jpeg|png|webp);base64,/.test(p));
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, translateString("Unfall- und Schadensprotokoll"), translateString(x.kind))
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Zeitpunkt")+'</div><div class="v">'+fsEsc(fmtDateTime(x.occurred_at))+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Ort")+'</div><div class="v">'+fsEsc(x.location||"–")+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Status")+'</div><div class="v">'+fsT(x.status)+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Versicherung")+'</div><div class="v">'+fsEsc(x.insurer||"–")+(x.insurer_notified_at?' · '+fsEsc(tf("gemeldet am {0}", fmtDate(x.insurer_notified_at))):'')+'</div></div></div>'
    + '<div class="box" style="margin:10px 0"><h3>'+fsT("Was ist passiert?")+'</h3><div class="b">'+fsEsc(x.description||"–")+'</div></div>'
    + '<h3>'+fsT("Beteiligte Personen")+'</h3>'+ppl(x.persons)
    + '<h3>'+fsT("Zeugen")+'</h3>'+ppl(x.witnesses)
    + '<div class="box" style="margin:10px 0"><h3>'+fsT("Sofortmaßnahmen")+'</h3><div class="b">'+fsEsc(x.measures||"–")+'</div></div>'
    + (photos.length ? '<h3>'+fsT("Fotos")+'</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+photos.map(p=>'<img src="'+fsEsc(p)+'" style="width:56mm;height:42mm;object-fit:cover;border:1px solid #E4DFD3" />').join("")+'</div>' : '')
    + '<p style="font-size:10px;color:#6B7280">'+fsEsc(tf("Erfasst von {0} am {1}.", teName(members, me, x.created_by), fmtDateTime(x.created_at)))+'</p>'
    + (x.signature_data ? '<div><div style="font-size:10px;color:#6B7280">'+fsT("Unterschrift")+'</div><img src="'+fsEsc(x.signature_data)+'" style="height:22mm;max-width:80mm" /></div>' : '<div class="sig"><div>'+fsT("Datum und Unterschrift")+'</div><div></div></div>')
    + '<p style="font-size:9.5px;color:#6B7280">'+fsT("Vertraulich: enthält möglicherweise Gesundheitsdaten. Nur an Versicherung und Berechtigte weitergeben.")+'</p>'
    + fsFoot()+'</div>';
}

function IncidentsView({hotel, api, members, me}){
  const [list, load, err] = useList(api, "/api/hotels/"+hotel.id+"/incidents");
  const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [filter,setFilter] = useState("alle");
  const openEdit = async (x) => { setMsg(null); try { const full = await api("/api/incidents/"+x.id); setForm({...full, occurred_at:teLocal(full.occurred_at), insurer_notified_at:full.insurer_notified_at?full.insurer_notified_at.slice(0,10):"", photos:full.photos||[], persons:full.persons||[], witnesses:full.witnesses||[], location:full.location||"", measures:full.measures||"", insurer:full.insurer||""}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const pdf = async (x) => { setMsg(null); try { const full = await api("/api/incidents/"+x.id); await sheetPdf(teIncidentHtml(hotel, full, members, me), safeFile(translateString("Protokoll")+" "+translateString(full.kind)+" "+String(full.occurred_at).slice(0,10))+".pdf", true); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const save = async () => { setMsg(null); setBusy(true);
    try {
      const body = {kind:form.kind, occurred_at:form.occurred_at ? new Date(form.occurred_at).toISOString() : "", location:form.location, description:form.description,
        persons:form.persons.filter(p=>p.name||p.contact), witnesses:form.witnesses.filter(p=>p.name||p.contact), measures:form.measures, photos:form.photos,
        signature_data:form.signature_data||null, insurer:form.insurer, insurer_notified_at:form.insurer_notified_at || (form.status==="gemeldet" ? undefined : null), status:form.status};
      if(form.id) await api("/api/incidents/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/incidents","POST",body);
      setForm(null); setMsg({ok:true,text:tf("Protokoll gespeichert.")}); load();
    } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const setStatus = async (x, status) => { setMsg(null); try { await api("/api/incidents/"+x.id,"PATCH",{status}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const del = async (x) => { if(!window.confirm(tf("Dieses Protokoll endgültig löschen?"))) return; try { await api("/api/incidents/"+x.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const shown = (list||[]).filter(x=>filter==="alle" || x.status===filter);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Unfälle, Schäden und Diebstähle direkt am Handy festhalten – mit Fotos, Zeugen und Unterschrift – und als PDF an die Versicherung geben.")}</div>
      <div role="note" style={{fontSize:12.5,color:WARN_TEXT,background:WARN_SOFT,borderRadius:8,padding:"8px 10px",marginBottom:12}}><Icon n="alert" /> {tf("Datenschutz: Protokolle können Gesundheitsdaten enthalten. Nur das Nötige erfassen. Sehen können sie Admin, Gesamtleitung, die Leitung Sicherheit bzw. Personal und – solange offen – wer sie angelegt hat.")}</div>
      {teMsg(msg)}{err && teMsg({ok:false,text:err})}
      {form ? <TeIncidentForm form={form} setForm={setForm} onSave={save} onCancel={()=>setForm(null)} busy={busy} setMsg={setMsg} /> :
        <button className="btn-primary" style={{...teMain,marginBottom:12}} onClick={()=>{ setMsg(null); setForm(teEmptyIncident()); }}><Icon n="clipboard" /> {tf("Neues Protokoll")}</button>}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <div style={{flex:1}}>{teH(tf("Protokolle"), "filetext")}</div>
          <select className="input" style={{width:"auto",minHeight:44}} value={filter} onChange={e=>setFilter(e.target.value)} aria-label={tf("Nach Status filtern")}>
            <option value="alle">{tf("Alle")}</option>{Object.keys(TE_INC_STATUS).map(s=><option key={s} value={s}>{tf(s)}</option>)}
          </select>
        </div>
        {list && shown.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Protokolle.")}</div>}
        {shown.map(x=>(
          <div key={x.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:200}}><b>{tf(x.kind)}</b>{x.location ? <span data-no-i18n=""> · {x.location}</span> : null}
              <div style={{fontSize:12.5,color:INK_MUTED}}>{fmtDateTime(x.occurred_at)} · {teName(members, me, x.created_by)}{x.insurer_notified_at ? " · "+tf("gemeldet am {0}", fmtDate(x.insurer_notified_at)) : ""}</div></span>
            <Pill color={(TE_INC_STATUS[x.status]||[])[0]} bg={(TE_INC_STATUS[x.status]||[])[1]}>{tf(x.status)}</Pill>
            <button style={teBtn} onClick={()=>openEdit(x)}>{tf("Öffnen")}</button>
            <button style={teBtn} onClick={()=>pdf(x)} aria-label={tf("Protokoll als PDF")}><Icon n="filetext" /> PDF</button>
            {x.status==="offen" && <button style={teBtn} onClick={()=>setStatus(x,"gemeldet")}>{tf("Als gemeldet markieren")}</button>}
            {x.status!=="abgeschlossen" && <button style={teBtn} onClick={()=>setStatus(x,"abgeschlossen")}>{tf("Abschließen")}</button>}
            {isLeadRole() && <button style={{...linkBtn,color:BAD,minHeight:44,minWidth:44}} onClick={()=>del(x)} aria-label={tf("Protokoll löschen")}>✕</button>}
          </div>))}
      </Card>
    </div>
  );
}
function TePeople({label, list, onChange}){
  const set = (i, k, v) => onChange(list.map((p,j)=>j===i ? {...p, [k]:v} : p));
  return (
    <fieldset style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:"8px 10px",margin:"0 0 10px"}}>
      <legend style={{fontSize:13,fontWeight:700,padding:"0 4px"}}>{label}</legend>
      {list.map((p,i)=>(
        <div key={i} style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
          <input className="input" style={{flex:"2 1 140px",minHeight:44}} maxLength={120} value={p.name||""} onChange={e=>set(i,"name",e.target.value)} placeholder={tf("Name")} aria-label={tf("Name")} />
          <input className="input" style={{flex:"1 1 110px",minHeight:44}} maxLength={80} value={p.role||""} onChange={e=>set(i,"role",e.target.value)} placeholder={tf("Rolle (Gast, Mitarbeiter:in …)")} aria-label={tf("Rolle")} />
          <input className="input" style={{flex:"2 1 140px",minHeight:44}} maxLength={200} value={p.contact||""} onChange={e=>set(i,"contact",e.target.value)} placeholder={tf("Telefon oder E-Mail")} aria-label={tf("Kontakt")} />
          <button type="button" style={{...linkBtn,color:BAD,minHeight:44,minWidth:44}} onClick={()=>onChange(list.filter((_,j)=>j!==i))} aria-label={tf("Zeile entfernen")}>✕</button>
        </div>))}
      {list.length<20 && <button type="button" style={teBtn} onClick={()=>onChange([...list, {name:"",role:"",contact:""}])}>+ {tf("Person hinzufügen")}</button>}
    </fieldset>
  );
}
function TeIncidentForm({form, setForm, onSave, onCancel, busy, setMsg}){
  const set = (k) => (e) => setForm({...form, [k]: e.target.value});
  const [resign,setResign] = useState(!form.signature_data);
  const addPhoto = async (files) => {
    const room = 6 - form.photos.length; const pick = [...(files||[])].slice(0, room);
    if(!pick.length){ if(room<=0) setMsg({ok:false,text:tf("Höchstens 6 Fotos.")}); return; }
    try { const out = []; for(const f of pick) out.push(await compressImage(f, 1600, 0.75)); setForm(x=>({...x, photos:[...x.photos, ...out].slice(0,6)})); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  return (
    <Card style={{marginBottom:14}}>
      {teH(form.id ? tf("Protokoll bearbeiten") : tf("Neues Protokoll"), "clipboard")}
      <div style={teGrid}>
        <Field label={tf("Art")}><select className="input" value={form.kind} onChange={set("kind")}>{TE_KINDS.map(k=><option key={k} value={k}>{tf(k)}</option>)}</select></Field>
        <Field label={tf("Wann?")}><input className="input" type="datetime-local" value={form.occurred_at} onChange={set("occurred_at")} /></Field>
        <Field label={tf("Wo?")}><input className="input" maxLength={200} value={form.location} onChange={set("location")} placeholder={tf("z. B. Treppe Wellnessbereich, Zimmer 214")} /></Field>
        <Field label={tf("Status")}><select className="input" value={form.status} onChange={set("status")}>{Object.keys(TE_INC_STATUS).map(s=><option key={s} value={s}>{tf(s)}</option>)}</select></Field>
      </div>
      <Field label={tf("Was ist passiert?")}><textarea className="input" rows={4} maxLength={6000} value={form.description} onChange={set("description")} data-no-i18n="" /></Field>
      <TePeople label={tf("Beteiligte Personen")} list={form.persons} onChange={(v)=>setForm({...form, persons:v})} />
      <TePeople label={tf("Zeugen")} list={form.witnesses} onChange={(v)=>setForm({...form, witnesses:v})} />
      <Field label={tf("Sofortmaßnahmen (Erste Hilfe, Rettung, Absicherung …)")}><textarea className="input" rows={3} maxLength={4000} value={form.measures} onChange={set("measures")} data-no-i18n="" /></Field>
      <div className="field-label">{tf("Fotos")} ({form.photos.length}/6)</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
        {form.photos.map((p,i)=>(
          <div key={i} style={{position:"relative"}}>
            <img src={p} alt={tf("Foto {0}", i+1)} style={{width:92,height:70,objectFit:"cover",borderRadius:8,border:`1px solid ${BORDER}`}} />
            <button type="button" onClick={()=>setForm({...form, photos:form.photos.filter((_,j)=>j!==i)})} aria-label={tf("Foto {0} entfernen", i+1)}
              style={{position:"absolute",top:-8,insetInlineEnd:-8,width:44,height:44,borderRadius:22,border:"none",background:"transparent",cursor:"pointer",color:BAD,fontWeight:700}}>✕</button>
          </div>))}
        {form.photos.length<6 && <label style={{...teBtn,display:"inline-flex",alignItems:"center",gap:6}}><Icon n="camera" /> {tf("Foto aufnehmen")}
          <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>{ addPhoto(e.target.files); e.target.value=""; }} /></label>}
      </div>
      <div style={teGrid}>
        <Field label={tf("Versicherung")}><input className="input" maxLength={200} value={form.insurer} onChange={set("insurer")} placeholder={tf("z. B. Haftpflicht, AUVA, BG")} /></Field>
        <Field label={tf("Gemeldet am")}><input className="input" type="date" value={form.insurer_notified_at||""} onChange={set("insurer_notified_at")} /></Field>
      </div>
      <div className="field-label">{tf("Unterschrift (erfassende oder betroffene Person)")}</div>
      {resign ? <SignaturePad onChange={(d)=>setForm(x=>({...x, signature_data:d}))} /> :
        <div style={{marginBottom:10}}><img src={form.signature_data} alt={tf("Unterschrift")} style={{maxWidth:"100%",height:90,background:"#fff",border:`1px solid ${BORDER}`,borderRadius:8}} />
          <div><button type="button" style={{...linkBtn,minHeight:44}} onClick={()=>{ setResign(true); setForm({...form, signature_data:null}); }}>{tf("Neu unterschreiben")}</button></div></div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
        <button className="btn-primary" style={teMain} disabled={busy || !form.description.trim() || !form.occurred_at} onClick={onSave}>{busy ? "…" : tf("Speichern")}</button>
        <button style={{...linkBtn,minHeight:44}} onClick={onCancel}>{tf("Abbrechen")}</button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ 2. Personalverpflegung
const TE_MEALS = ["Frühstück","Mittag","Abend"];
function StaffMealsView({hotel, api, members, me}){
  const today = todayIso(), tomorrow = teAddDays(today, 1);
  const [mine,setMine] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState("");
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/staff-meals?from="+today+"&to="+tomorrow).then(r=>setMine((r||[]).filter(x=>!me || x.user_id===me.id))).catch(e=>{ setMine([]); setMsg({ok:false,text:e.message}); }),[api, hotel.id, today]);
  useEffect(()=>{ load(); },[load]);
  const kitchen = ACCESS.role==="admin" || ACCESS.role==="manager" || (ACCESS.depts||[]).includes("Food & Beverage");
  const [ver,setVer] = useState(0);
  const toggle = async (date, meal) => {
    const cur = (mine||[]).find(x=>x.meal_date===date && x.meal===meal); const k = date+meal; setBusy(k); setMsg(null);
    try { if(cur) await api("/api/staff-meals/"+cur.id,"DELETE"); else await api("/api/hotels/"+hotel.id+"/staff-meals","POST",{meal_date:date, meal}); await load(); setVer(v=>v+1); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy("");
  };
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Wer im Haus isst, trägt sich ein. Die Küche sieht die Mengen, die Lohnverrechnung bekommt die Monatsliste mit Sachbezugswerten.")}</div>
      {teMsg(msg)}
      <Card style={{marginBottom:14}}>
        {teH(tf("Ich esse mit"), "concierge")}
        {[today, tomorrow].map(d=>(
          <div key={d} style={{marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>{d===today ? tf("Heute") : tf("Morgen")} · {fmtDate(d)}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}} role="group" aria-label={d===today ? tf("Heute") : tf("Morgen")}>
              {TE_MEALS.map(m=>{ const on = (mine||[]).some(x=>x.meal_date===d && x.meal===m); return (
                <button key={m} aria-pressed={on} disabled={busy===d+m || mine===null} onClick={()=>toggle(d,m)}
                  style={{...teBtn,minWidth:110,background:on?GOOD_SOFT:"#fff",borderColor:on?GOOD:BORDER,color:on?GOOD_TEXT:INK,fontWeight:on?700:400}}>{on ? "✓ " : ""}{tf(m)}</button>); })}
            </div>
          </div>))}
      </Card>
      {kitchen && <TeMealCounts hotel={hotel} api={api} ver={ver} />}
      {teIsHr() && <TeMealSettings hotel={hotel} api={api} />}
      {teIsHr() && <TeMealMonth hotel={hotel} api={api} members={members} me={me} />}
    </div>
  );
}
function TeMealCounts({hotel, api, ver}){
  const from = todayIso(), to = teAddDays(from, 6);
  const [data,setData] = useState(null); const [err,setErr] = useState("");
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/staff-meals/counts?from="+from+"&to="+to).then(setData).catch(e=>setErr(e.message)); },[hotel.id, ver]);
  const days = Array.from({length:7}, (_,i)=>teAddDays(from, i));
  return (
    <Card style={{marginBottom:14}}>
      {teH(tf("Mengen für die Küche"), "users")}
      <ErrorText>{err}</ErrorText>
      {data && <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
        <thead><tr><th scope="col" style={{textAlign:"start",padding:6}}>{tf("Tag")}</th>{TE_MEALS.map(m=><th key={m} scope="col" style={{textAlign:"end",padding:6}}>{tf(m)}</th>)}</tr></thead>
        <tbody>{days.map(d=>{ const c = (data.days||{})[d] || {}; return (
          <tr key={d} style={{borderTop:`1px solid ${BORDER}`}}><th scope="row" style={{textAlign:"start",padding:6,fontWeight:d===from?700:400}}>{fmtDate(d)}</th>{TE_MEALS.map(m=><td key={m} style={{textAlign:"end",padding:6}}>{c[m]||0}</td>)}</tr>); })}</tbody>
      </table></div>}
    </Card>
  );
}
function TeMealSettings({hotel, api}){
  const [f,setF] = useState(null); const [msg,setMsg] = useState(null);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/staff-meal-settings").then(s=>setF({values:{Frühstück:"",Mittag:"",Abend:"",...((s&&s.values)||{})}, country:(s&&s.country)||hotel.country||""})).catch(e=>setMsg({ok:false,text:e.message})); },[hotel.id]);
  const save = async () => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/staff-meal-settings","PUT",f); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(!f) return teMsg(msg);
  return (
    <Card style={{marginBottom:14}}>
      {teH(tf("Sachbezugswerte je Mahlzeit"), "euro")}
      <div style={teGrid}>
        {TE_MEALS.map(m=><Field key={m} label={tf(m)+" (€)"}><input className="input" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={f.values[m]??""} onChange={e=>setF({...f, values:{...f.values, [m]:e.target.value}})} /></Field>)}
        <Field label={tf("Land")}><input className="input" maxLength={40} value={f.country} onChange={e=>setF({...f, country:e.target.value})} placeholder="AT / DE" /></Field>
      </div>
      <div style={{fontSize:12.5,color:WARN_TEXT,marginBottom:8}}><Icon n="alert" /> {tf("Sachbezugswerte ändern sich jährlich (Österreich: Sachbezugswerteverordnung, Deutschland: Sozialversicherungsentgeltverordnung). Bitte zu Jahresbeginn prüfen – Ouverture trägt keine Werte vor.")}</div>
      {teMsg(msg)}
      <button className="btn-primary" style={teMain} onClick={save}>{tf("Speichern")}</button>
    </Card>
  );
}
function TeMealMonth({hotel, api, members, me}){
  const [month,setMonth] = useState(todayIso().slice(0,7)); const [data,setData] = useState(null); const [err,setErr] = useState("");
  useEffect(()=>{ setErr(""); api("/api/hotels/"+hotel.id+"/staff-meals/month?month="+month).then(setData).catch(e=>{ setData(null); setErr(e.message); }); },[hotel.id, month]);
  const who = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? m.email : teName(members, me, id); };
  const rows = (data && data.people || []).slice().sort((a,b)=>who(a.user_id).localeCompare(who(b.user_id)));
  const csv = () => teCsv([[tf("Person"), tf("Monat"), ...TE_MEALS.map(m=>tf(m)), tf("Sachbezug (€)")],
    ...rows.map(p=>[who(p.user_id), month, ...TE_MEALS.map(m=>p.counts[m]||0), String(p.amount.toFixed(2)).replace(".", ",")])], "personalverpflegung-"+month+".csv");
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
        <div style={{flex:1}}>{teH(tf("Monatsauswertung für die Lohnverrechnung"), "table")}</div>
        <input className="input" type="month" style={{width:"auto",minHeight:44}} value={month} onChange={e=>e.target.value && setMonth(e.target.value)} aria-label={tf("Monat")} />
        <button style={teBtn} disabled={!rows.length} onClick={csv}><Icon n="table" /> CSV</button>
      </div>
      <ErrorText>{err}</ErrorText>
      {data && !rows.length && <div style={{fontSize:13,color:INK_MUTED}}>{tf("In diesem Monat hat sich niemand eingetragen.")}</div>}
      {rows.length>0 && <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
        <thead><tr><th scope="col" style={{textAlign:"start",padding:6}}>{tf("Person")}</th>{TE_MEALS.map(m=><th key={m} scope="col" style={{textAlign:"end",padding:6}}>{tf(m)}</th>)}<th scope="col" style={{textAlign:"end",padding:6}}>{tf("Sachbezug")}</th></tr></thead>
        <tbody>{rows.map(p=>(<tr key={p.user_id} style={{borderTop:`1px solid ${BORDER}`}}><td data-no-i18n="" style={{padding:6}}>{who(p.user_id)}</td>{TE_MEALS.map(m=><td key={m} style={{textAlign:"end",padding:6}}>{p.counts[m]||0}</td>)}<td style={{textAlign:"end",padding:6}}>{teEur(p.amount)}</td></tr>))}</tbody>
      </table></div>}
      {data && !Object.values(data.values||{}).some(v=>Number(v)>0) && <div style={{fontSize:12.5,color:WARN_TEXT,marginTop:8}}>{tf("Noch keine Sachbezugswerte eingetragen – die Beträge stehen deshalb auf 0.")}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ 3. KV-Lohnprüfung
// Keine Beträge vorgeben: die Vorlage hat eine Beispielzeile mit 0, die Werte stammen aus dem gültigen Kollektivvertrag/Tarif.
const teEmptyTable = () => ({name:"", country:"", valid_from:todayIso().slice(0,4)+"-01-01", valid_to:"", groups:[{key:"1", label:tf("Beispiel – bitte durch die Gruppen des Kollektivvertrags ersetzen"), monthly_min:0, hourly_min:0}]});
const TE_CHECK = {"ok":[GOOD_TEXT,GOOD_SOFT], "zu niedrig":[BAD,BAD_SOFT], "unklar":[WARN_TEXT,WARN_SOFT]};
function WageCheckView({api, orgId, members, me}){
  const hr = teIsHr();
  const [tables, loadTables, tErr] = useList(api, "/api/organizations/"+orgId+"/wage-tables");
  const [pays, loadPays, pErr] = useList(api, "/api/organizations/"+orgId+"/staff-pay");
  const [check,setCheck] = useState(null); const [msg,setMsg] = useState(null);
  const [tform,setTform] = useState(null); const [pform,setPform] = useState(null);
  const loadCheck = useCallback(()=>{ if(hr) api("/api/organizations/"+orgId+"/wage-check").then(setCheck).catch(e=>setMsg({ok:false,text:e.message})); },[api, orgId, hr]);
  useEffect(()=>{ loadCheck(); },[loadCheck]);
  const reload = () => { loadTables(); loadPays(); loadCheck(); };
  const who = (id) => teName(members, me, id);
  const saveTable = async () => { setMsg(null);
    try { const body = {...tform, groups:tform.groups.map(g=>({...g, monthly_min:g.monthly_min===""?0:g.monthly_min, hourly_min:g.hourly_min===""?0:g.hourly_min}))};
      if(tform.id) await api("/api/wage-tables/"+tform.id,"PATCH",body); else await api("/api/organizations/"+orgId+"/wage-tables","POST",body);
      setTform(null); reload(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const delTable = async (t) => { if(!window.confirm(tf("Lohntabelle „{0}“ löschen? Zuordnungen bleiben ohne Tabelle.", t.name))) return; try { await api("/api/wage-tables/"+t.id,"DELETE"); reload(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const savePay = async () => { setMsg(null);
    try { const body = {...pform}; if(pform.id){ delete body.user_id; await api("/api/staff-pay/"+pform.id,"PATCH",body); } else await api("/api/organizations/"+orgId+"/staff-pay","POST",body);
      setPform(null); reload(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const delPay = async (p) => { if(!window.confirm(tf("Diesen Lohneintrag löschen?"))) return; try { await api("/api/staff-pay/"+p.id,"DELETE"); reload(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const tName = (id) => ((tables||[]).find(t=>t.id===id)||{}).name || "–";
  const hint = <div role="note" style={{fontSize:12.5,color:INK_MUTED,margin:"0 0 12px"}}><Icon n="alert" /> {tf("Hilfe zur Selbstkontrolle, keine Rechtsberatung. Maßgeblich sind der gültige Kollektivvertrag bzw. Tarifvertrag, Zulagen und Anrechnungen; im Zweifel Lohnverrechnung oder Interessenvertretung fragen.")}</div>;
  if(!hr) return (
    <div>{hint}{teMsg(msg)}{pErr && teMsg({ok:false,text:pErr})}
      <Card>{teH(tf("Mein hinterlegter Lohn"), "euro")}
        {(pays||[]).length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Für dich ist noch nichts hinterlegt.")}</div> :
          (pays||[]).map(p=><div key={p.id} style={{fontSize:13.5,padding:"6px 0",borderTop:`1px solid ${BORDER}`}}>{tf("ab {0}", fmtDate(p.valid_from))} · {tf(p.pay_type==="Stunde"?"Stundenlohn":"Monatslohn")} {teEur(p.amount)}{p.hours_per_week ? " · "+tf("{0} Std./Woche", fmtNum(p.hours_per_week,1)) : ""}{p.wage_group ? " · "+tf("Gruppe {0}", p.wage_group) : ""}</div>)}
      </Card></div>);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:8}}>{tf("Lohntabellen aus dem Kollektivvertrag pflegen, Mitarbeitende einer Lohngruppe zuordnen und prüfen, ob der Lohn den Mindestwert erreicht.")}</div>
      {hint}{teMsg(msg)}{(tErr||pErr) && teMsg({ok:false,text:tErr||pErr})}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <div style={{flex:1}}>{teH(tf("Prüfung"), "gauge")}</div>
          {check && <Pill color={check.warnings?BAD:GOOD_TEXT} bg={check.warnings?BAD_SOFT:GOOD_SOFT}>{check.warnings ? tf("{0} Hinweise", check.warnings) : tf("alles im Rahmen")}</Pill>}
        </div>
        {check && check.rows.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Löhne hinterlegt.")}</div>}
        {check && check.rows.length>0 && <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{[tf("Person"),tf("Gruppe"),tf("Lohn"),tf("Mindestwert"),tf("Differenz"),tf("Ergebnis")].map((h,i)=><th key={i} scope="col" style={{textAlign:i>=2&&i<=4?"end":"start",padding:6}}>{h}</th>)}</tr></thead>
          <tbody>{check.rows.slice().sort((a,b)=>(a.status==="ok")-(b.status==="ok")).map(r=>(
            <tr key={r.user_id} style={{borderTop:`1px solid ${BORDER}`}}>
              <td data-no-i18n="" style={{padding:6}}>{who(r.user_id)}</td>
              <td style={{padding:6}}><span data-no-i18n="">{r.wage_group||"–"}</span><div style={{fontSize:11.5,color:INK_MUTED}} data-no-i18n="">{r.wage_table||""}</div></td>
              <td style={{padding:6,textAlign:"end"}}>{teEur(r.amount)}<div style={{fontSize:11.5,color:INK_MUTED}}>{tf(r.pay_type==="Stunde"?"je Stunde":"je Monat")}</div></td>
              <td style={{padding:6,textAlign:"end"}}>{r.minimum==null?"–":teEur(r.minimum)}<div style={{fontSize:11.5,color:INK_MUTED}}>{r.basis ? tf(r.basis==="Stunde"?"je Stunde":"je Monat") : ""}</div></td>
              <td style={{padding:6,textAlign:"end",color:r.diff<0?BAD:INK}}>{r.diff==null?"–":teEur(r.diff)}</td>
              <td style={{padding:6}}><Pill color={TE_CHECK[r.status][0]} bg={TE_CHECK[r.status][1]}>{tf(r.status)}</Pill>{r.reason && <div style={{fontSize:11.5,color:INK_MUTED}}>{tf(r.reason)}</div>}</td>
            </tr>))}</tbody></table></div>}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Rechnung: Stundenlohn gegen den Stunden-Mindestwert; Monatslohn mit Wochenstunden gegen Stunden-Mindestwert × Wochenstunden × {0} (Teilzeit anteilig), sonst gegen den Monats-Mindestwert.", "4,33")}</div>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <div style={{flex:1}}>{teH(tf("Lohntabellen"), "table")}</div>
          {!tform && <button className="btn-primary" style={teMain} onClick={()=>setTform(teEmptyTable())}>{tf("Neue Lohntabelle")}</button>}
        </div>
        {tform && <TeTableForm form={tform} setForm={setTform} onSave={saveTable} onCancel={()=>setTform(null)} />}
        {(tables||[]).map(t=>(
          <div key={t.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:180}}><b data-no-i18n="">{t.name}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{t.country ? t.country+" · " : ""}{tf("gültig ab {0}", fmtDate(t.valid_from))}{t.valid_to ? " "+tf("bis {0}", fmtDate(t.valid_to)) : ""} · {tf("{0} Gruppen", (t.groups||[]).length)}</div></span>
            <button style={teBtn} onClick={()=>setTform({...t, country:t.country||"", valid_to:t.valid_to||"", groups:(t.groups||[]).map(g=>({...g}))})}>{tf("Bearbeiten")}</button>
            <button style={{...linkBtn,color:BAD,minHeight:44,minWidth:44}} onClick={()=>delTable(t)} aria-label={tf("Lohntabelle löschen")}>✕</button>
          </div>))}
        {tables && !tables.length && !tform && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Lohntabelle. Die Mindestwerte bitte aus dem aktuellen Kollektivvertrag übernehmen.")}</div>}
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <div style={{flex:1}}>{teH(tf("Löhne und Zuordnung"), "users")}</div>
          {!pform && <button className="btn-primary" style={teMain} onClick={()=>setPform({user_id:"", wage_table_id:(tables&&tables[0]&&tables[0].id)||"", wage_group:"", pay_type:"Monat", amount:"", hours_per_week:"40", valid_from:todayIso()})}>{tf("Lohn hinterlegen")}</button>}
        </div>
        {pform && <TePayForm form={pform} setForm={setPform} tables={tables||[]} members={members} me={me} onSave={savePay} onCancel={()=>setPform(null)} />}
        {(pays||[]).map(p=>(
          <div key={p.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:180}}><b data-no-i18n="">{who(p.user_id)}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("ab {0}", fmtDate(p.valid_from))} · <span data-no-i18n="">{tName(p.wage_table_id)}{p.wage_group ? " / "+p.wage_group : ""}</span> · {teEur(p.amount)} {tf(p.pay_type==="Stunde"?"je Stunde":"je Monat")}{p.hours_per_week ? " · "+tf("{0} Std./Woche", fmtNum(p.hours_per_week,1)) : ""}</div></span>
            <button style={teBtn} onClick={()=>setPform({...p, wage_table_id:p.wage_table_id||"", wage_group:p.wage_group||"", hours_per_week:p.hours_per_week??""})}>{tf("Bearbeiten")}</button>
            <button style={{...linkBtn,color:BAD,minHeight:44,minWidth:44}} onClick={()=>delPay(p)} aria-label={tf("Lohneintrag löschen")}>✕</button>
          </div>))}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Lohndaten sehen nur Admin und Leitung Personal; jede Person sieht ihre eigenen Einträge.")}</div>
      </Card>
    </div>
  );
}
function TeTableForm({form, setForm, onSave, onCancel}){
  const set = (k) => (e) => setForm({...form, [k]: e.target.value});
  const setG = (i, k, v) => setForm({...form, groups:form.groups.map((g,j)=>j===i ? {...g, [k]:v} : g)});
  return (
    <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,margin:"8px 0"}}>
      <div style={teGrid}>
        <Field label={tf("Name")}><input className="input" maxLength={160} value={form.name} onChange={set("name")} placeholder={tf("z. B. KV Hotel- und Gastgewerbe 2026")} /></Field>
        <Field label={tf("Land")}><input className="input" maxLength={40} value={form.country} onChange={set("country")} placeholder="AT / DE" /></Field>
        <Field label={tf("Gültig ab")}><input className="input" type="date" value={form.valid_from} onChange={set("valid_from")} /></Field>
        <Field label={tf("Gültig bis (optional)")}><input className="input" type="date" value={form.valid_to||""} onChange={set("valid_to")} /></Field>
      </div>
      <div className="field-label">{tf("Lohngruppen")}</div>
      {form.groups.map((g,i)=>(
        <div key={i} style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
          <input className="input" style={{flex:"0 1 80px",minHeight:44}} maxLength={40} value={g.key} onChange={e=>setG(i,"key",e.target.value)} placeholder={tf("Kürzel")} aria-label={tf("Kürzel")} />
          <input className="input" style={{flex:"3 1 180px",minHeight:44}} maxLength={160} value={g.label||""} onChange={e=>setG(i,"label",e.target.value)} placeholder={tf("Bezeichnung")} aria-label={tf("Bezeichnung")} />
          <input className="input" style={{flex:"1 1 110px",minHeight:44}} type="number" min="0" step="0.01" inputMode="decimal" value={g.monthly_min} onChange={e=>setG(i,"monthly_min",e.target.value)} aria-label={tf("Mindestlohn je Monat (€)")} title={tf("Mindestlohn je Monat (€)")} />
          <input className="input" style={{flex:"1 1 90px",minHeight:44}} type="number" min="0" step="0.01" inputMode="decimal" value={g.hourly_min} onChange={e=>setG(i,"hourly_min",e.target.value)} aria-label={tf("Mindestlohn je Stunde (€)")} title={tf("Mindestlohn je Stunde (€)")} />
          <button type="button" style={{...linkBtn,color:BAD,minHeight:44,minWidth:44}} onClick={()=>setForm({...form, groups:form.groups.filter((_,j)=>j!==i)})} aria-label={tf("Lohngruppe entfernen")}>✕</button>
        </div>))}
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:8}}>{tf("Spalten: Kürzel, Bezeichnung, Mindestlohn je Monat, Mindestlohn je Stunde. Ouverture gibt keine Beträge vor – bitte aus dem gültigen Kollektivvertrag eintragen; 0 heißt „nicht eingetragen“.")}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" style={teBtn} onClick={()=>setForm({...form, groups:[...form.groups, {key:"", label:"", monthly_min:0, hourly_min:0}]})}>+ {tf("Lohngruppe")}</button>
        <button className="btn-primary" style={teMain} disabled={!form.name.trim() || !form.valid_from} onClick={onSave}>{tf("Speichern")}</button>
        <button style={{...linkBtn,minHeight:44}} onClick={onCancel}>{tf("Abbrechen")}</button>
      </div>
    </div>
  );
}
function TePayForm({form, setForm, tables, members, me, onSave, onCancel}){
  const set = (k) => (e) => setForm({...form, [k]: e.target.value});
  const groups = ((tables.find(t=>t.id===form.wage_table_id)||{}).groups) || [];
  return (
    <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,margin:"8px 0"}}>
      <div style={teGrid}>
        <Field label={tf("Person")}><select className="input" value={form.user_id} onChange={set("user_id")} disabled={!!form.id}>
          <option value="">{tf("Bitte wählen")}</option>{(members||[]).filter(m=>m.role!=="viewer").map(m=><option key={m.user_id} value={m.user_id} data-no-i18n="">{m.email || teName(members, me, m.user_id)}</option>)}</select></Field>
        <Field label={tf("Lohntabelle")}><select className="input" value={form.wage_table_id} onChange={e=>setForm({...form, wage_table_id:e.target.value, wage_group:""})}>
          <option value="">{tf("keine")}</option>{tables.map(t=><option key={t.id} value={t.id} data-no-i18n="">{t.name}</option>)}</select></Field>
        <Field label={tf("Lohngruppe")}><select className="input" value={form.wage_group} onChange={set("wage_group")}>
          <option value="">–</option>{groups.map(g=><option key={g.key} value={g.key} data-no-i18n="">{g.key}{g.label ? " – "+g.label : ""}</option>)}</select></Field>
        <Field label={tf("Lohnart")}><select className="input" value={form.pay_type} onChange={set("pay_type")}><option value="Monat">{tf("Monatslohn")}</option><option value="Stunde">{tf("Stundenlohn")}</option></select></Field>
        <Field label={tf("Betrag brutto (€)")}><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={set("amount")} /></Field>
        <Field label={tf("Wochenstunden")}><input className="input" type="number" min="0" max="80" step="0.5" inputMode="decimal" value={form.hours_per_week} onChange={set("hours_per_week")} /></Field>
        <Field label={tf("Gültig ab")}><input className="input" type="date" value={form.valid_from} onChange={set("valid_from")} /></Field>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn-primary" style={teMain} disabled={!form.user_id || form.amount==="" || !form.valid_from} onClick={onSave}>{tf("Speichern")}</button>
        <button style={{...linkBtn,minHeight:44}} onClick={onCancel}>{tf("Abbrechen")}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 4. Renovierungs-Planer (sichtbar auch für Eigentümer)
const teCapexEdit = () => ACCESS.role==="admin" || (ACCESS.role==="manager" && (!isScopedManager() || (ACCESS.depts||[]).includes("Technik")));
const TE_COND = {1:"sehr schlecht", 2:"schlecht", 3:"mittel", 4:"gut", 5:"wie neu"};
function teCapexHtml(hotel, plan){
  const head = '<tr><th>'+fsT("Komponente")+'</th><th>'+fsT("Bereich")+'</th><th>'+fsT("Eingebaut")+'</th><th class="r">'+fsT("Lebensdauer")+'</th><th>'+fsT("Zustand")+'</th><th class="r">'+fsT("Kosten")+'</th>'+plan.years.map(y=>'<th class="r">'+y+'</th>').join("")+'</tr>';
  const rows = plan.rows.slice().sort((a,b)=>(a.due_year||9999)-(b.due_year||9999)).map(r=>'<tr><td>'+fsEsc(r.component)+'</td><td>'+fsEsc(r.area||(r.rooms?translateString("Zimmer")+" "+r.rooms.number:""))+'</td><td>'+fsEsc(r.installed_on?fmtDate(r.installed_on):"–")+'</td><td class="r">'+fsEsc(r.lifetime_years?tf("{0} J.", fmtNum(r.lifetime_years,1)):"–")+'</td><td>'+fsEsc(r.condition?tf(TE_COND[r.condition]):"–")+'</td><td class="r">'+fsEsc(teEur(r.cost,0))+'</td>'
    + plan.years.map(y=>'<td class="r'+(r.due_year===y&&r.overdue?' bad':'')+'">'+(r.due_year===y?fsEsc(teEur(r.cost,0)):'')+'</td>').join("")+'</tr>').join("");
  const sum = '<tr class="g"><td colspan="6">'+fsT("Summe je Jahr")+'</td>'+plan.years.map(y=>'<td class="r">'+fsEsc(teEur(plan.sums[y],0))+'</td>').join("")+'</tr>';
  return FS_TABLE+'<div class="fs land" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Renovierungs-Planer"), tf("{0} bis {1}", plan.years[0], plan.years[plan.years.length-1]))
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Summe 5 Jahre")+'</div><div class="v">'+fsEsc(teEur(plan.total,0))+'</div></div><div class="f"><div class="l">'+fsT("Komponenten")+'</div><div class="v">'+plan.rows.length+'</div></div></div>'
    + '<table class="t"><thead>'+head+'</thead><tbody>'+rows+sum+'</tbody></table>'
    + '<p style="font-size:10px;color:#6B7280">'+fsT("Fällig = Einbaujahr + Lebensdauer. Vorgezogen bei Zustand „schlecht“ oder „sehr schlecht“ und bei vielen Meldungen im Zimmer in den letzten 12 Monaten. Überfälliges steht im ersten Jahr (rot). Schätzung auf Basis der erfassten Kosten, ohne Preissteigerung.")+'</p>'
    + fsFoot()+'</div>';
}
function CapexView({hotel, api}){
  const [plan,setPlan] = useState(null); const [msg,setMsg] = useState(null); const [form,setForm] = useState(null); const [rooms,setRooms] = useState([]);
  const edit = teCapexEdit();
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/capex").then(setPlan).catch(e=>{ setPlan({years:[],sums:{},total:0,rows:[]}); setMsg({ok:false,text:e.message}); }),[api, hotel.id]);
  useEffect(()=>{ load(); if(edit) api("/api/hotels/"+hotel.id+"/rooms").then(r=>setRooms(Array.isArray(r)?r:(r.rooms||[]))).catch(()=>{}); },[load]);
  const types = [...new Set(rooms.map(r=>r.room_type).filter(Boolean))].sort();
  const empty = {component:"", area:"", target:"none", room_id:"", room_type:"", installed_on:"", lifetime_years:"", condition:"", unit_cost:"", quantity:"1", note:""};
  const save = async () => { setMsg(null);
    const body = {component:form.component, area:form.area, installed_on:form.installed_on||null, lifetime_years:form.lifetime_years, condition:form.condition, unit_cost:form.unit_cost, quantity:form.quantity, note:form.note};
    try {
      if(form.id){ await api("/api/capex/"+form.id,"PATCH",{...body, room_id:form.room_id||null}); setMsg({ok:true,text:tf("Gespeichert.")}); }
      else {
        if(form.target==="type" && !window.confirm(tf("Für jedes Zimmer des Typs „{0}“ eine eigene Zeile anlegen?", form.room_type))) return;
        const r = await api("/api/hotels/"+hotel.id+"/capex","POST",{...body, room_id:form.target==="room"?form.room_id:null, room_type:form.target==="type"?form.room_type:undefined, all_rooms:form.target==="all"||undefined});
        setMsg({ok:true,text:tf("{0} Komponenten angelegt.", r.created)});
      }
      setForm(null); load();
    } catch(e){ setMsg({ok:false,text:e.message}); } };
  const del = async (r) => { if(!window.confirm(tf("„{0}“ löschen?", r.component))) return; try { await api("/api/capex/"+r.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const pdf = async () => { setMsg(null); try { await sheetPdf(teCapexHtml(hotel, plan), safeFile(translateString("Renovierungs-Planer")+" "+hotel.name+" "+todayIso())+".pdf", true, "landscape"); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const set = (k) => (e) => setForm({...form, [k]: e.target.value});
  const sorted = plan ? plan.rows.slice().sort((a,b)=>(a.due_year||9999)-(b.due_year||9999) || String(a.component).localeCompare(String(b.component))) : [];
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Wann sind Teppiche, Matratzen, Bäder oder Technik fällig – und was kostet das in den nächsten 5 Jahren? Für Eigentümer und Budgetplanung.")}</div>
      {teMsg(msg)}
      {plan && plan.years.length>0 && <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
          <div style={{flex:1}}>{teH(tf("Kosten je Jahr"), "euro")}</div>
          <button style={teBtn} disabled={!plan.rows.length} onClick={pdf}><Icon n="filetext" /> {tf("PDF für Eigentümer")}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))",gap:8}}>
          {plan.years.map(y=><div key={y} style={{background:PAPER,borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:12.5,color:INK_MUTED}}>{y}</div><div style={{fontSize:17,fontWeight:700}}>{teEur(plan.sums[y],0)}</div></div>)}
          <div style={{background:BRASS_SOFT,borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:12.5,color:BRASS_TEXT}}>{tf("Summe 5 Jahre")}</div><div style={{fontSize:17,fontWeight:700,color:BRASS_TEXT}}>{teEur(plan.total,0)}</div></div>
        </div>
      </Card>}
      {edit && (form ? <Card style={{marginBottom:14}}>
        {teH(form.id ? tf("Komponente bearbeiten") : tf("Komponente erfassen"), "wrench")}
        <div style={teGrid}>
          <Field label={tf("Komponente")}><input className="input" maxLength={160} value={form.component} onChange={set("component")} placeholder={tf("z. B. Teppich, Matratze, Klimagerät")} /></Field>
          {!form.id && <Field label={tf("Für")}><select className="input" value={form.target} onChange={set("target")}>
            <option value="none">{tf("Bereich (ohne Zimmer)")}</option><option value="room">{tf("ein Zimmer")}</option>
            {types.length>0 && <option value="type">{tf("alle Zimmer eines Typs")}</option>}{rooms.length>0 && <option value="all">{tf("alle Zimmer")}</option>}</select></Field>}
          {(form.id || form.target==="room") && <Field label={tf("Zimmer")}><select className="input" value={form.room_id||""} onChange={set("room_id")}><option value="">–</option>{rooms.map(r=><option key={r.id} value={r.id} data-no-i18n="">{r.number}{r.room_type ? " · "+r.room_type : ""}</option>)}</select></Field>}
          {!form.id && form.target==="type" && <Field label={tf("Zimmertyp")}><select className="input" value={form.room_type} onChange={set("room_type")}><option value="">–</option>{types.map(t=><option key={t} value={t} data-no-i18n="">{t} ({rooms.filter(r=>r.room_type===t).length})</option>)}</select></Field>}
          {(form.id || form.target==="none") && <Field label={tf("Bereich")}><input className="input" maxLength={160} value={form.area||""} onChange={set("area")} placeholder={tf("z. B. Lobby, Restaurant, Dach")} /></Field>}
          <Field label={tf("Eingebaut am")}><input className="input" type="date" value={form.installed_on||""} onChange={set("installed_on")} /></Field>
          <Field label={tf("Lebensdauer (Jahre)")}><input className="input" type="number" min="0" max="100" step="0.5" inputMode="decimal" value={form.lifetime_years??""} onChange={set("lifetime_years")} /></Field>
          <Field label={tf("Zustand")}><select className="input" value={form.condition??""} onChange={set("condition")}><option value="">–</option>{[5,4,3,2,1].map(c=><option key={c} value={c}>{c} – {tf(TE_COND[c])}</option>)}</select></Field>
          <Field label={tf("Kosten je Stück (€)")}><input className="input" type="number" min="0" step="1" inputMode="decimal" value={form.unit_cost??""} onChange={set("unit_cost")} /></Field>
          <Field label={tf("Menge")}><input className="input" type="number" min="0" step="1" inputMode="decimal" value={form.quantity??""} onChange={set("quantity")} /></Field>
        </div>
        <Field label={tf("Notiz")}><input className="input" maxLength={1000} value={form.note||""} onChange={set("note")} /></Field>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" style={teMain} disabled={!form.component.trim() || (form.target==="type" && !form.room_type) || (form.target==="room" && !form.room_id)} onClick={save}>{tf("Speichern")}</button>
          <button style={{...linkBtn,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      </Card> : <button className="btn-primary" style={{...teMain,marginBottom:12}} onClick={()=>setForm(empty)}>{tf("Komponente erfassen")}</button>)}
      <Card>
        {teH(tf("Komponenten"), "wrench")}
        {plan && !sorted.length && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Komponenten erfasst.")}</div>}
        {sorted.map(r=>(
          <div key={r.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:200}}><b data-no-i18n="">{r.component}</b> · <span data-no-i18n="">{r.area || (r.rooms ? tf("Zimmer")+" "+r.rooms.number : "–")}</span>
              <div style={{fontSize:12.5,color:INK_MUTED}}>{r.installed_on ? tf("eingebaut {0}", fmtDate(r.installed_on)) : tf("ohne Einbaudatum")}{r.lifetime_years ? " · "+tf("{0} Jahre", fmtNum(r.lifetime_years,1)) : ""}{r.condition ? " · "+tf(TE_COND[r.condition]) : ""}{r.tickets_12m ? " · "+tf("{0} Meldungen in 12 Monaten", r.tickets_12m) : ""} · {teEur(r.cost,0)}</div>
              {r.reasons && r.reasons.length>0 && <div style={{fontSize:12,color:WARN_TEXT}}>{r.reasons.map(x=>tf(x)).join(" · ")}</div>}</span>
            {r.due_year ? <Pill color={r.overdue?BAD:r.due_year<=plan.years[0]+1?WARN_TEXT:INK_MUTED} bg={r.overdue?BAD_SOFT:r.due_year<=plan.years[0]+1?WARN_SOFT:PAPER}>{r.overdue ? tf("überfällig") : tf("fällig {0}", r.due_year)}</Pill> : <Pill color={INK_MUTED} bg={PAPER}>{tf("offen")}</Pill>}
            {edit && <button style={teBtn} onClick={()=>setForm({...r, installed_on:r.installed_on||"", room_id:r.room_id||"", area:r.area||"", note:r.note||"", lifetime_years:r.lifetime_years??"", unit_cost:r.unit_cost??"", quantity:r.quantity??"", condition:r.condition??""})}>{tf("Bearbeiten")}</button>}
            {edit && <button style={{...linkBtn,color:BAD,minHeight:44,minWidth:44}} onClick={()=>del(r)} aria-label={tf("Komponente löschen")}>✕</button>}
          </div>))}
      </Card>
    </div>
  );
}
