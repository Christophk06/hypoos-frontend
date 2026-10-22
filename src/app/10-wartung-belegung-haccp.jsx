// ------------------------------------------------------------ Wartungsplan
const PLAN_UNITS = ["Tage","Wochen","Monate","Jahre"];
function MaintenancePlans({hotel, api, role, myDepts, members, me}){
  const depts = visibleDeptsFor(role, myDepts).filter(canManageDept);
  const [plans,setPlans] = useState([]);
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/maintenance-plans").then(setPlans).catch(e=>setMsg({ok:false,text:e.message})),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function"?ok(r):ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const today = todayIso();
  const save = () => run(async()=>{ const {id, ...b} = form; if(id) await api("/api/maintenance-plans/"+id,"PATCH",b); else await api(base+"/maintenance-plans","POST",b); setForm(null); }, tf("Gespeichert."));
  return (
    <div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Wiederkehrende Arbeiten wie Filterwechsel, Legionellen-Prüfung oder Feuerlöscher-Kontrolle. Am Fälligkeitstag entsteht automatisch eine Meldung für die zuständige Abteilung.")}</div>
      {depts.length>0 && !form && <button className="btn-primary" style={{marginBottom:12}} onClick={()=>setForm({title:"", location:"", description:"", department:depts.includes("Technik")?"Technik":depts[0], interval_value:3, interval_unit:"Monate", next_due:today, active:true})}>{tf("+ Wartung planen")}</button>}
      {form && (
        <Card style={{marginBottom:12,borderColor:BRASS}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <label style={{flex:2,minWidth:200}}><div className="field-label">{tf("Was?")}</div><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder={tf("z. B. Lüftungsfilter tauschen")} /></label>
            <label style={{flex:1,minWidth:140}}><div className="field-label">{tf("Wo?")}</div><input className="input" value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})} placeholder={tf("z. B. Technikraum")} /></label>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",margin:"10px 0"}}>
            <label><div className="field-label">{tf("Alle")}</div><div style={{display:"flex",gap:6}}>
              <input className="input" type="number" min="1" max="60" style={{width:70}} value={form.interval_value} onChange={e=>setForm({...form,interval_value:e.target.value})} />
              <select className="input" style={{width:"auto"}} value={form.interval_unit} onChange={e=>setForm({...form,interval_unit:e.target.value})}>{PLAN_UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div></label>
            <label><div className="field-label">{tf("Nächster Termin")}</div><input className="input" type="date" value={form.next_due} onChange={e=>setForm({...form,next_due:e.target.value})} /></label>
            <label><div className="field-label">{tf("Zuständig")}</div><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
          </div>
          <Field label={tf("Details (optional)")}><textarea className="input" rows={2} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} style={{fontFamily:"inherit"}} /></Field>
          {!form.id && <div style={{marginBottom:10}}>
            <div className="field-label">{tf("Vorlagen für wiederkehrende Prüfungen (Richtwerte – bitte an Vorschriften und Herstellerangaben anpassen)")}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{MAINT_PRESETS.filter(([,,,d])=>depts.includes(d)).map(([t,v,u,d])=><button key={t} type="button" onClick={()=>setForm({...form, title:translateString(t), interval_value:v, interval_unit:u, department:d})} style={{border:`1px solid ${BORDER}`,background:form.title===translateString(t)?BRASS_SOFT:CARD,borderRadius:999,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>{tf(t)} · {tf("alle {0} {1}", v, translateString(u))}</button>)}</div>
          </div>}
          <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.title.trim()} onClick={save}>{tf("Speichern")}</button><button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
        </Card>
      )}
      {plans.length===0 && !form && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Wartungen geplant.")}</div></Card>}
      {plans.map(p=>(
        <Card key={p.id} style={{marginBottom:8,padding:"11px 14px",opacity:p.active?1:0.55}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontWeight:600}} data-no-i18n="">{p.title}{p.location ? " · "+p.location : ""}</div>
              <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("alle {0} {1}", p.interval_value, translateString(p.interval_unit))} · <span>{p.department}</span></div>
            </div>
            <span style={{fontSize:12.5,fontWeight:600,color:p.next_due<=today?BAD:p.next_due<=addDaysIso(today,7)?WARN:INK_MUTED}}>{tf("fällig {0}", fmtDate(p.next_due))}</span>
            {canManageDept(p.department) && <button style={smallBtn} onClick={()=>run(()=>api("/api/maintenance-plans/"+p.id+"/run","POST",{}), tf("Meldung angelegt."))}>{tf("Jetzt anlegen")}</button>}
            {canManageDept(p.department) && <button style={linkBtn} onClick={()=>run(()=>api("/api/maintenance-plans/"+p.id,"PATCH",{active:!p.active}))}>{p.active ? tf("Pausieren") : tf("Fortsetzen")}</button>}
            <MaintProofButton hotel={hotel} api={api} plan={p} members={members} me={me} />
            {canManageDept(p.department) && <button style={linkBtn} onClick={()=>setForm({...p})}>{tf("Bearbeiten")}</button>}
            {canManageDept(p.department) && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Wartungsplan löschen?"))) run(()=>api("/api/maintenance-plans/"+p.id,"DELETE")); }}>✕</button>}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Belegung, Personalbedarf und Plan-Vorschlag (im Dienstplan)
const BASIS = [["belegt","belegte Zimmer"],["abreisen","Abreisen"],["anreisen","Anreisen"],["abreisen+bleiber","Abreisen + Bleiber"]];
function staffNeededFe(rule, f){
  if(!rule || !f) return null;
  const stay = Math.max(0,(f.occupied||0)-(f.arrivals||0));
  const units = rule.basis==="abreisen" ? f.departures : rule.basis==="anreisen" ? f.arrivals : rule.basis==="abreisen+bleiber" ? (f.departures||0)+stay : f.occupied;
  return Math.max(Number(rule.minimum)||0, Math.ceil((Number(units)||0)/Number(rule.units_per_person)));
}
function RosterDemand({hotel, api, dept, week, days, shifts, onApplied}){
  const [fc,setFc] = useState([]);
  const [rule,setRule] = useState(null);
  const [edit,setEdit] = useState(false);
  const [msg,setMsg] = useState(null);
  const [busy,setBusy] = useState(false);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>{
    api(base+"/forecast?from="+days[0]+"&to="+days[6]).then(setFc).catch(()=>setFc([]));
    api(base+"/staffing-rules").then(rs=>setRule(rs.find(r=>r.department===dept)||null)).catch(()=>setRule(null));
  },[api, base, dept, week]);
  useEffect(()=>{ load(); },[load]);
  const fOf = (d) => fc.find(f=>f.day===d) || {day:d, occupied:0, arrivals:0, departures:0};
  const planned = (d) => shifts.filter(s=>s.department===dept && s.shift_date===d && WORK_KINDS.includes(s.kind)).length;
  const saveF = (d, field, v) => { const f = {...fOf(d), [field]: Number(v)||0}; setFc(x=>[...x.filter(y=>y.day!==d), f]); api(base+"/forecast","PUT",{days:[f]}).catch(e=>setMsg({ok:false,text:e.message})); };
  const saveRule = (r) => { setRule(r); api(base+"/staffing-rules","PUT",{department:dept, ...r}).then(x=>setRule(x && x.department ? x : null)).catch(e=>setMsg({ok:false,text:e.message})); };
  const suggest = async (apply) => {
    setBusy(true); setMsg(null);
    try {
      const r = await api(base+"/roster/suggest","POST",{department:dept, week, apply});
      if(!apply){
        const open = r.unfilled.length;
        if(!r.shifts.length){ setMsg({ok:!open, text: open ? tf("Kein Vorschlag möglich: {0} Schichten lassen sich mit dem Team nicht besetzen.", open) : tf("Die Woche ist bereits vollständig besetzt.")}); }
        else if(window.confirm(tf("{0} Schichten eintragen?", r.shifts.length) + (open ? "\n"+tf("{0} Schichten bleiben offen (zu wenig Personen, Verfügbarkeit oder Ruhezeit).", open) : ""))) await suggest(true);
      } else { setMsg({ok:true, text:tf("{0} Schichten als Entwurf eingetragen.", r.created) + (r.unfilled.length ? " "+tf("{0} Schichten bleiben offen.", r.unfilled.length) : "")}); onApplied(); }
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false);
  };
  const hasFc = fc.some(f=>f.occupied||f.arrivals||f.departures);
  return (
    <Card className="no-print" style={{marginBottom:18}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
        <div style={{fontWeight:700,flex:1}}>{tf("Belegung und Personalbedarf")} · <span>{dept}</span></div>
        <button style={smallBtn} onClick={()=>setEdit(!edit)}>{edit ? tf("Fertig") : tf("Bearbeiten")}</button>
        <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} disabled={busy} onClick={()=>suggest(false)}>{busy ? "…" : <React.Fragment><Icon n="sparkle" /> {tf("Plan-Vorschlag")}</React.Fragment>}</button>
      </div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Der Plan-Vorschlag füllt freie Schichten nach Mindestbesetzung und Bedarf – mit Rücksicht auf Verfügbarkeit, Soll-Stunden und 11 Stunden Ruhezeit. Bestehende Schichten bleiben, alles kommt als Entwurf.")}</div>
      {edit && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",background:PAPER,borderRadius:6,padding:"8px 10px",marginBottom:8,fontSize:12.5}}>
          <span>{tf("1 Person je")}</span>
          <input className="input" type="number" min="1" style={{width:70}} defaultValue={rule ? rule.units_per_person : ""} key={"u"+dept+(rule&&rule.units_per_person)} onBlur={e=>saveRule({basis:(rule&&rule.basis)||"belegt", units_per_person:e.target.value===""?null:Number(e.target.value), minimum:(rule&&rule.minimum)||0})} />
          <select className="input" style={{width:"auto"}} value={(rule&&rule.basis)||"belegt"} onChange={e=>rule && saveRule({...rule, basis:e.target.value})}>{BASIS.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select>
          <span>{tf("mindestens")}</span>
          <input className="input" type="number" min="0" style={{width:60}} defaultValue={rule ? rule.minimum : 0} key={"m"+dept+(rule&&rule.minimum)} onBlur={e=>rule && saveRule({...rule, minimum:Number(e.target.value)||0})} />
          <span style={{color:INK_MUTED}}>{tf("(leer lassen = kein Bedarf aus der Belegung)")}</span>
        </div>
      )}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:560}}>
          <thead><tr><th></th>{days.map(d=><th key={d} style={{padding:"4px 6px",fontWeight:600,color:INK_MUTED,textAlign:"center"}} data-no-i18n="">{fmtDay(d)}</th>)}</tr></thead>
          <tbody>
            {[["occupied","Belegt"],["arrivals","Anreise"],["departures","Abreise"]].map(([k,l])=>(
              <tr key={k} style={{borderTop:`1px solid ${BORDER}`}}><td style={{padding:"4px 6px",color:INK_MUTED}}>{tf(l)}</td>
                {days.map(d=><td key={d} style={{textAlign:"center",padding:"3px 4px"}}>{edit
                  ? <input className="input" type="number" min="0" style={{width:56,padding:"3px 4px",textAlign:"center"}} defaultValue={fOf(d)[k]} key={d+k+fOf(d)[k]} onBlur={e=>Number(e.target.value)!==fOf(d)[k] && saveF(d,k,e.target.value)} />
                  : <span data-no-i18n="">{fOf(d)[k]||"–"}</span>}</td>)}
              </tr>
            ))}
            {rule && (
              <tr style={{borderTop:`1px solid ${BORDER}`,fontWeight:700}}><td style={{padding:"4px 6px"}}>{tf("Bedarf / geplant")}</td>
                {days.map(d=>{ const n = staffNeededFe(rule, fOf(d)), p = planned(d); return <td key={d} style={{textAlign:"center",color:p<n?BAD:GOOD}} data-no-i18n="">{n}/{p}</td>; })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!hasFc && <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Die Belegung kommt automatisch aus dem PMS (Mews) oder lässt sich unter „Bearbeiten“ eintragen.")}</div>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ HACCP-Temperaturen (in den Checklisten)
function TempView({hotel, api, me, members, role, myDepts}){
  const visible = visibleDeptsFor(role, myDepts);
  const [points,setPoints] = useState(null);
  const [vals,setVals] = useState({});
  const [acts,setActs] = useState({});
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/temp-points").then(setPoints).catch(e=>{ setMsg({ok:false,text:e.message}); setPoints([]); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const canSetup = ["Food & Beverage"].concat(visible).some(d=>canManageDept(d));
  if(points===null) return null;
  if(!points.length && !canSetup) return null;
  const outOf = (p, v) => v!=="" && !isNaN(Number(String(v).replace(",","."))) && ((p.min_c!=null && Number(String(v).replace(",","."))<Number(p.min_c)) || (p.max_c!=null && Number(String(v).replace(",","."))>Number(p.max_c)));
  const save = async (p) => {
    setMsg(null);
    try { await api("/api/temp-points/"+p.id+"/readings","POST",{value:vals[p.id], action:acts[p.id]||""}); setVals(v=>({...v,[p.id]:""})); setActs(a=>({...a,[p.id]:""})); await load(); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const exportMonth = async () => {
    try {
      const m0 = todayIso().slice(0,8)+"01";
      const rows = await api(base+"/temp-readings?from="+addDaysIso(m0,-31)+"&to="+todayIso());
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const head = [tf("Datum"), tf("Uhrzeit"), tf("Messpunkt"), "°C", tf("Bereich"), tf("Abweichung"), tf("Maßnahme"), tf("Gemessen von")];
      const data = rows.map(r=>[toLocalInput(r.taken_at).slice(0,10), fmtClock(r.taken_at), r.point_name, Number(r.value_c), (r.min_c??"")+"–"+(r.max_c??""), r.out_of_range?tf("Ja"):"", r.action||"", memberLabel(members, me, r.taken_by)]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...data]), "HACCP");
      XLSX.writeFile(wb, ("HACCP "+hotel.name+" "+todayIso()).replace(/[\\/:*?"<>|]+/g,"")+".xlsx");
    } catch(e){ setMsg({ok:false,text:tf("Export fehlgeschlagen: {0}", e.message)}); }
  };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
        <div style={{fontWeight:700,flex:1}}><Icon n="thermo" /> {tf("Temperaturen (HACCP)")}</div>
        {points.length>0 && <HaccpPdfButton hotel={hotel} api={api} members={members} me={me} />}
        {points.length>0 && <button style={smallBtn} onClick={exportMonth}>{tf("Nachweis als Excel")}</button>}
        {canSetup && !form && <button style={smallBtn} onClick={()=>setForm({name:"", min_c:"0", max_c:"4", department:"Food & Beverage"})}>{tf("+ Messpunkt")}</button>}
      </div>
      {form && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",background:PAPER,borderRadius:6,padding:"8px 10px",marginBottom:10}}>
          <label style={{flex:2,minWidth:160}}><div className="field-label">{tf("Name")}</div><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tf("z. B. Kühlraum 1, Tiefkühler, Frühstücksbuffet")} /></label>
          <label><div className="field-label">{tf("min. °C")}</div><input className="input" type="number" step="0.5" style={{width:80}} value={form.min_c} onChange={e=>setForm({...form,min_c:e.target.value})} /></label>
          <label><div className="field-label">{tf("max. °C")}</div><input className="input" type="number" step="0.5" style={{width:80}} value={form.max_c} onChange={e=>setForm({...form,max_c:e.target.value})} /></label>
          <label><div className="field-label">{tf("Abteilung")}</div><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.filter(canManageDept).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
          <button className="btn-primary" disabled={!form.name.trim()} onClick={async()=>{ try { await api(base+"/temp-points","POST",form); setForm(null); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } }}>{tf("Anlegen")}</button>
          <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      )}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:8}}>{msg.text}</div>}
      {points.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lege Kühlräume, Kühlschränke und Buffets an – dann trägt das Team die Temperaturen hier am Handy ein.")}</div>}
      {points.map(p=>{ const last = p.readings[0]; const bad = outOf(p, vals[p.id]||""); const todayDone = last && toLocalInput(last.taken_at).slice(0,10)===todayIso(); return (
        <div key={p.id} style={{borderTop:`1px solid ${BORDER}`,padding:"9px 0"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:150}}><b data-no-i18n="">{p.name}</b> <span style={{fontSize:12,color:INK_MUTED}} dir="ltr" data-no-i18n="">{p.min_c??"…"} – {p.max_c??"…"} °C</span>
              <div style={{fontSize:12,color:last?(last.out_of_range?BAD:todayDone?GOOD:WARN):WARN}} data-no-i18n="">{last ? (todayDone?"✓ ":"")+Number(last.value_c)+" °C · "+fmtDateTime(last.taken_at)+" · "+memberLabel(members, me, last.taken_by) : tf("Heute noch nicht gemessen")}</div></div>
            {role!=="viewer" && visible.includes(p.department) && <React.Fragment>
              <input className="input" inputMode="decimal" style={{width:80,borderColor:bad?BAD:undefined}} placeholder="°C" value={vals[p.id]||""} onChange={e=>setVals({...vals,[p.id]:e.target.value})} />
              <button className="btn-primary" style={{padding:"7px 12px"}} disabled={!vals[p.id] || (bad && !(acts[p.id]||"").trim())} onClick={()=>save(p)}>{tf("Eintragen")}</button>
            </React.Fragment>}
            {canManageDept(p.department) && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Messpunkt löschen? Alle Messwerte dazu werden entfernt."))) api("/api/temp-points/"+p.id,"DELETE").then(load); }}>✕</button>}
          </div>
          {bad && <input className="input" style={{marginTop:6,borderColor:BAD}} value={acts[p.id]||""} onChange={e=>setActs({...acts,[p.id]:e.target.value})} placeholder={tf("Außerhalb des Bereichs – welche Maßnahme? z. B. Tür geschlossen, Ware umgelagert, Technik informiert")} />}
        </div>
      ); })}
    </Card>
  );
}

