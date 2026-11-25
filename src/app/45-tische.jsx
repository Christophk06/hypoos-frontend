// ============================================================ Paket 044 (2): Tischreservierung – Tagesplan, Tische, Online-Buchung (tisch.html).
// Rechte prüft die Datenbank (F&B und Rezeption sehen, Leitung F&B verwaltet Tische und Einstellungen).

const DN_STATUS = {"angefragt":[WARN_TEXT,WARN_SOFT,"Angefragt"], "bestätigt":[GOOD_TEXT,GOOD_SOFT,"Bestätigt"], "abgesagt":[INK_MUTED,PAPER,"Abgesagt"], "nicht_erschienen":[BAD,BAD_SOFT,"Nicht erschienen"], "erledigt":[INK_MUTED,PAPER,"Erledigt"]};
const DN_DAYS = [["1","Montag"],["2","Dienstag"],["3","Mittwoch"],["4","Donnerstag"],["5","Freitag"],["6","Samstag"],["7","Sonntag"]];
const dnPublicUrl = (q) => { try { return new URL("tisch.html?"+q, location.href).href; } catch(e){ return "tisch.html?"+q; } };
const dnEmpty = (day) => ({day, time:"19:00", party:2, name:"", email:"", phone:"", room_no:"", allergens:[], note:""});

function DiningView({hotel, api}){
  const [view,setView] = useState("day"); const [day,setDay] = useState(todayIso());
  const [list,setList] = useState(null); const [tables, loadTables] = useList(api, "/api/hotels/"+hotel.id+"/restaurant-tables");
  const [settings,setSettings] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [err,setErr] = useState("");
  const [mode,setMode] = useState("list"); const [series,setSeries] = useState(null);
  const walkIn = () => { const d = new Date(), m = Math.ceil((d.getHours()*60+d.getMinutes())/5)*5; setDay(todayIso()); setForm({...dnEmpty(todayIso()), time:String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0"), name:translateString("Walk-in"), walkin:true}); };
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/table-reservations?from="+day+"&to="+day).then(l=>{ setList(l); setErr(""); }).catch(e=>{ setErr(e.message); setList([]); }),[api, hotel.id, day]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/restaurant-settings").then(setSettings).catch(()=>setSettings(false)); },[api, hotel.id]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); load(); loadTables(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const tName = (ids) => (ids||[]).map(id=>((tables||[]).find(t=>t.id===id)||{}).name).filter(Boolean).join(" + ") || tf("gelöschter Tisch");
  const active = (list||[]).filter(r=>r.status==="angefragt"||r.status==="bestätigt");
  const guests = active.reduce((s,r)=>s+r.party,0);
  const canEdit = settings && settings.can_edit;
  return (
    <div>
      <BgmHead title={tf("Tischreservierung")} intro={tf("Reservierungen fürs Restaurant – intern eingetragen oder online über deinen Buchungslink. Allergene gehen als Hinweis an Food & Beverage.")} />
      <BgmTabs value={view} onChange={setView} tabs={[["day",tf("Tagesplan")],["tables",tf("Tische")],["stats",tf("Auswertung")]].concat(canEdit?[["settings",tf("Online-Buchung")]]:[])} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {err && <ErrorText style={{marginBottom:10}}>{err}</ErrorText>}
      {view==="day" && <div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
          <button style={opSmall} aria-label={tf("Vortag")} onClick={()=>setDay(addDaysIso(day,-1))}>‹</button>
          <input className="input" type="date" style={{width:"auto"}} value={day} aria-label={tf("Datum")} onChange={e=>e.target.value && setDay(e.target.value)} />
          <button style={opSmall} aria-label={tf("Folgetag")} onClick={()=>setDay(addDaysIso(day,1))}>›</button>
          {day!==todayIso() && <button style={linkBtn} onClick={()=>setDay(todayIso())}>{tf("Heute")}</button>}
          <span style={{flex:1}} />
          <span style={{fontSize:13,color:INK_MUTED}}>{tf("{0} Reservierungen · {1} Gäste", active.length, guests)}</span>
          <span role="group" aria-label={tf("Ansicht")} style={{display:"flex",gap:4}}>
            <button style={{...opSmall,background:mode==="list"?INK:"#fff",color:mode==="list"?"#fff":INK}} aria-pressed={mode==="list"} onClick={()=>setMode("list")}>{tf("Liste")}</button>
            <button style={{...opSmall,background:mode==="plan"?INK:"#fff",color:mode==="plan"?"#fff":INK}} aria-pressed={mode==="plan"} onClick={()=>setMode("plan")}>{tf("Tischplan")}</button>
          </span>
          <button style={opSmall} onClick={walkIn}>{tf("Walk-in")}</button>
          <button style={opSmall} onClick={()=>setSeries({name:"", room_no:"", from:day, to:addDaysIso(day,6), time:"19:00", party:2, table_ids:[], allergens:[], note:""})}>{tf("Stammtisch")}</button>
          <button className="btn-primary" onClick={()=>setForm(dnEmpty(day))}>{tf("Reservierung eintragen")}</button>
        </div>
        {mode==="plan" && <DiningPlan list={list||[]} tables={(tables||[]).filter(t=>t.active!==false)} onOpen={(r)=>setForm({...r, email:r.email||"", phone:r.phone||"", room_no:r.room_no||"", note:r.note||"", allergens:r.allergens||[], table_ids:r.table_ids||[]})} />}
        {(tables||[]).length===0 && <Card style={{marginBottom:12,background:WARN_SOFT}}><div style={{fontSize:13.5}}>{tf("Noch keine Tische angelegt. Ohne Tische werden Reservierungen ohne Tischzuweisung gespeichert.")}</div></Card>}
        {list && list.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Reservierungen an diesem Tag.")}</div>}
        {mode==="list" && (list||[]).map(r=>{ const st = DN_STATUS[r.status]||DN_STATUS["bestätigt"]; return (
          <Card key={r.id} style={{marginBottom:8,opacity:r.status==="abgesagt"||r.status==="erledigt"?0.6:1}}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <b style={{fontSize:16,minWidth:52}}>{r.time}</b>
              <span style={{flex:1,minWidth:140}}><b data-no-i18n="">{r.name}</b> · {tf("{0} Pers.", r.party)}{r.room_no ? " · "+tf("Zimmer {0}", r.room_no) : ""}</span>
              {r.table_ids && r.table_ids.length>0 ? <span style={{fontSize:12.5}} data-no-i18n=""><Icon n="table" /> {tName(r.table_ids)}</span> : <span style={{fontSize:12.5,color:WARN_TEXT}}>{tf("ohne Tisch")}</span>}
              {r.source==="online" && <Pill color={INK_MUTED} bg={PAPER}>{tf("online")}</Pill>}
              {r.series_id && <Pill color={INK_MUTED} bg={PAPER}>{tf("Stammtisch")}</Pill>}
              {r.noshow_before>0 && <span title={tf("Mit dieser E-Mail-Adresse oder Telefonnummer im letzten Jahr nicht erschienen")}><Pill color={BAD} bg={BAD_SOFT}>⚠ {tf("{0}× nicht erschienen", r.noshow_before)}</Pill></span>}
              <Pill color={st[0]} bg={st[1]}>{tf(st[2])}</Pill>
            </div>
            {r.allergens && r.allergens.length>0 && <div style={{marginTop:6,fontSize:13,color:BAD,fontWeight:600}}>⚠ {tf("Allergene")}: {r.allergens.map(a=>a+" "+tf((ALLERGENS.find(x=>x[0]===a)||[])[1]||"")).join(", ")}</div>}
            {r.note && <div style={{marginTop:4,fontSize:13,color:INK_MUTED}} data-no-i18n="">{r.note}</div>}
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
              {r.status==="angefragt" && <button style={linkBtn} onClick={()=>run(()=>api("/api/table-reservations/"+r.id,"PATCH",{status:"bestätigt"}), tf("Bestätigt."))}>{tf("Bestätigen")}</button>}
              {(r.status==="angefragt"||r.status==="bestätigt") && <>
                <button style={linkBtn} onClick={()=>run(()=>api("/api/table-reservations/"+r.id,"PATCH",{status:"erledigt"}))}>{tf("Gast war da")}</button>
                <button style={linkBtn} onClick={()=>run(()=>api("/api/table-reservations/"+r.id,"PATCH",{status:"nicht_erschienen"}))}>{tf("Nicht erschienen")}</button>
                <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Reservierung absagen?"))) run(()=>api("/api/table-reservations/"+r.id,"PATCH",{status:"abgesagt"})); }}>{tf("Absagen")}</button>
              </>}
              <button style={linkBtn} onClick={()=>setForm({...r, email:r.email||"", phone:r.phone||"", room_no:r.room_no||"", note:r.note||"", allergens:r.allergens||[], table_ids:r.table_ids||[]})}>{tf("Bearbeiten")}</button>
              {r.series_id && (r.status==="angefragt"||r.status==="bestätigt") && <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Alle weiteren Abende dieses Stammtischs ab diesem Tag absagen?"))) run(()=>api("/api/table-reservation-series/"+r.series_id+"?from="+r.day,"DELETE"), tf("Abgesagt.")); }}>{tf("Stammtisch beenden")}</button>}
              {r.email && <a style={linkBtn} href={"mailto:"+r.email}>{tf("E-Mail")}</a>}
              {r.phone && <a style={linkBtn} href={"tel:"+r.phone.replace(/\s/g,"")}>{tf("Anrufen")}</a>}
            </div>
          </Card>); })}
      </div>}
      {view==="tables" && <DiningTables hotel={hotel} api={api} tables={tables} canEdit={canEdit} run={run} />}
      {view==="stats" && <DiningStats hotel={hotel} api={api} />}
      {series && <DiningSeriesForm form={series} setForm={setSeries} tables={tables||[]} onClose={()=>setSeries(null)} onSave={()=>run(async()=>{ const r = await api("/api/hotels/"+hotel.id+"/table-reservation-series","POST",series); setSeries(null); if(r.skipped && r.skipped.length) throw new Error(tf("{0} Abende angelegt, an {1} Abenden war der Tisch schon belegt: {2}", r.made, r.skipped.length, r.skipped.map(fmtDate).join(", "))); }, tf("Stammtisch angelegt."))} />}
      {view==="settings" && canEdit && <DiningSettings hotel={hotel} api={api} value={settings} onSaved={(s)=>{ setSettings({...s, can_edit:true}); setMsg({ok:true,text:tf("Gespeichert.")}); }} />}
      {form && <DiningForm form={form} setForm={setForm} tables={tables||[]} onClose={()=>setForm(null)} onSave={()=>run(async()=>{
        const body = {...form}; delete body.id;
        if(form.id) await api("/api/table-reservations/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/table-reservations","POST",body);
        setForm(null); if(form.day!==day) setDay(form.day);
      }, tf("Gespeichert."))} />}
    </div>
  );
}

function DiningForm({form, setForm, tables, onClose, onSave}){
  const tog = (a) => setForm({...form, allergens: form.allergens.includes(a) ? form.allergens.filter(x=>x!==a) : [...form.allergens, a]});
  const togT = (id) => { const l = form.table_ids||[]; setForm({...form, table_ids: l.includes(id) ? l.filter(x=>x!==id) : [...l, id]}); };
  return (
    <Overlay onClose={onClose} width={520} label={form.id ? tf("Reservierung bearbeiten") : tf("Reservierung eintragen")}>
      <b>{form.id ? tf("Reservierung bearbeiten") : tf("Reservierung eintragen")}</b>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0 10px",marginTop:8}}>
        <Field label={tf("Datum")}><input className="input" type="date" value={form.day} onChange={e=>setForm({...form,day:e.target.value})} /></Field>
        <Field label={tf("Uhrzeit")}><input className="input" type="time" step={900} value={form.time} onChange={e=>setForm({...form,time:e.target.value})} /></Field>
        <Field label={tf("Personen")}><input className="input" type="number" min={1} max={200} value={form.party} onChange={e=>setForm({...form,party:e.target.value})} /></Field>
      </div>
      <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Telefon")}><input className="input" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
        <Field label={tf("E-Mail")}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
        <Field label={tf("Zimmer (Hotelgast)")}><input className="input" value={form.room_no} onChange={e=>setForm({...form,room_no:e.target.value})} /></Field>
      </div>
      <fieldset style={{border:"none",padding:0,margin:"0 0 10px"}}><legend className="field-label">{tf("Allergene")}</legend>
        <div style={{fontSize:12,color:INK_MUTED,marginBottom:6}}>{tf("Nur mit Einverständnis des Gastes eintragen. Nach 90 Tagen werden Gastdaten und Allergene automatisch gelöscht.")}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ALLERGENS.map(([k,l])=><label key={k} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${form.allergens.includes(k)?BAD:BORDER}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",minHeight:32}}>
          <input type="checkbox" checked={form.allergens.includes(k)} onChange={()=>tog(k)} /> {k} {tf(l)}</label>)}</div>
      </fieldset>
      {tables.length>0 && <fieldset style={{border:"none",padding:0,margin:"0 0 10px"}}><legend className="field-label">{tf("Tisch (leer = automatisch)")}</legend>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{tables.filter(t=>t.active!==false).map(t=><label key={t.id} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",minHeight:32}}>
          <input type="checkbox" checked={(form.table_ids||[]).includes(t.id)} onChange={()=>togT(t.id)} /> <span data-no-i18n="">{t.name}</span> ({t.seats})</label>)}</div>
      </fieldset>}
      <Field label={tf("Notiz")}><textarea className="input" rows={2} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
      <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!String(form.name).trim() || !form.day || !form.time} onClick={onSave}>{tf("Speichern")}</button><button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button></div>
    </Overlay>
  );
}

function DiningTables({hotel, api, tables, canEdit, run}){
  const [form,setForm] = useState(null);
  const seats = (tables||[]).filter(t=>t.active!==false).reduce((s,t)=>s+t.seats,0);
  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
        <span style={{flex:1,fontSize:13,color:INK_MUTED}}>{tf("{0} Tische · {1} Plätze", (tables||[]).filter(t=>t.active!==false).length, seats)}</span>
        {canEdit && !form && <button className="btn-primary" onClick={()=>setForm({name:"", seats:4, area:"", sort:0})}>{tf("Tisch anlegen")}</button>}
      </div>
      {!canEdit && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Tische verwaltet die Leitung Food & Beverage.")}</div>}
      {form && <Card style={{marginBottom:12,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name")}><input className="input" value={form.name} placeholder={tf("z. B. T1")} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Plätze")}><input className="input" type="number" min={1} max={40} value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})} /></Field>
          <Field label={tf("Bereich")}><input className="input" value={form.area||""} placeholder={tf("z. B. Terrasse")} onChange={e=>setForm({...form,area:e.target.value})} /></Field>
          <Field label={tf("Reihenfolge")}><input className="input" type="number" value={form.sort||0} onChange={e=>setForm({...form,sort:e.target.value})} /></Field>
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!String(form.name).trim()} onClick={()=>run(async()=>{ if(form.id) await api("/api/restaurant-tables/"+form.id,"PATCH",form); else await api("/api/hotels/"+hotel.id+"/restaurant-tables","POST",form); setForm(null); })}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {(tables||[]).map(t=><div key={t.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,opacity:t.active===false?0.55:1,fontSize:13.5}}>
        <b style={{minWidth:60}} data-no-i18n="">{t.name}</b><span>{tf("{0} Plätze", t.seats)}</span><span style={{flex:1,color:INK_MUTED}} data-no-i18n="">{t.area||""}</span>
        {canEdit && <>
          <button style={linkBtn} onClick={()=>run(()=>api("/api/restaurant-tables/"+t.id,"PATCH",{active:t.active===false}))}>{t.active===false ? tf("Aktivieren") : tf("Sperren")}</button>
          <button style={linkBtn} onClick={()=>setForm({...t, area:t.area||""})}>{tf("Bearbeiten")}</button>
          <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Tisch löschen?"))) run(()=>api("/api/restaurant-tables/"+t.id,"DELETE")); }}>{tf("Löschen")}</button>
        </>}
      </div>)}
    </div>
  );
}

function DiningSettings({hotel, api, value, onSaved}){
  const [s,setS] = useState(()=>({...value, open:{...(value.open||{})}, closed_days:value.closed_days||[]})); const [err,setErr] = useState(""); const [svg,setSvg] = useState(""); const [closed,setClosed] = useState("");
  const url = s.token ? dnPublicUrl("h="+s.token) : null;
  useEffect(()=>{ if(url) qrSvg(url, 5).then(setSvg).catch(()=>{}); },[url]);
  const save = async (extra) => { setErr(""); try { const r = await api("/api/hotels/"+hotel.id+"/restaurant-settings","PUT",{...s, ...(extra||{})}); setS({...r, open:{...(r.open||{})}}); onSaved(r); } catch(e){ setErr(e.message); } };
  const setRange = (d, i, k, v) => { const l = (s.open[d]||[]).map(x=>[...x]); l[i][k] = v; setS({...s, open:{...s.open, [d]:l}}); };
  const num = (k, lbl, min, max) => <Field label={lbl}><input className="input" type="number" min={min} max={max} value={s[k]} onChange={e=>setS({...s,[k]:e.target.value})} /></Field>;
  return (
    <div>
      <Card style={{marginBottom:12}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600,minHeight:36}}><input type="checkbox" checked={!!s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> {tf("Online-Buchung einschalten")}</label>
        <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Gäste buchen über einen Link oder QR-Code (Website, Zimmermappe, Gäste-Seite). Freie Tische werden automatisch zugewiesen.")}</div>
        {url && s.enabled && <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
          {svg && <div style={{width:110}} aria-hidden="true" dangerouslySetInnerHTML={{__html:svg}} />}
          <div style={{flex:1,minWidth:200}}>
            <input className="input" readOnly value={url} aria-label={tf("Buchungslink")} onFocus={e=>e.target.select()} />
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <button style={opSmall} onClick={()=>navigator.clipboard && navigator.clipboard.writeText(url)}>{tf("Link kopieren")}</button>
              <a style={{...opSmall,textDecoration:"none",display:"inline-flex",alignItems:"center"}} href={url} target="_blank" rel="noopener">{tf("Ansehen")}</a>
              <button style={opSmall} onClick={()=>{ if(window.confirm(tf("Neuen Link erzeugen? Der alte Link funktioniert danach nicht mehr."))) save({new_token:true}); }}>{tf("Neuer Link")}</button>
            </div>
          </div>
        </div>}
      </Card>
      <Card style={{marginBottom:12}}>
        <b>{tf("Öffnungszeiten für Reservierungen")}</b>
        {DN_DAYS.map(([d,l])=><div key={d} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
          <span style={{width:100,fontSize:13.5}}>{tf(l)}</span>
          {(s.open[d]||[]).map((r,i)=><span key={i} style={{display:"flex",gap:4,alignItems:"center"}}>
            <input className="input" type="time" style={{width:110}} aria-label={tf("{0} von", translateString(l))} value={r[0]} onChange={e=>setRange(d,i,0,e.target.value)} />–
            <input className="input" type="time" style={{width:110}} aria-label={tf("{0} bis", translateString(l))} value={r[1]} onChange={e=>setRange(d,i,1,e.target.value)} />
            <button style={linkBtn} aria-label={tf("Entfernen")} onClick={()=>setS({...s, open:{...s.open, [d]:(s.open[d]||[]).filter((_,j)=>j!==i)}})}>✕</button>
          </span>)}
          {(s.open[d]||[]).length===0 && <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("geschlossen")}</span>}
          {(s.open[d]||[]).length<4 && <button style={linkBtn} onClick={()=>setS({...s, open:{...s.open, [d]:[...(s.open[d]||[]), ["18:00","22:00"]]}})}>+ {tf("Zeit")}</button>}
        </div>)}
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name auf der Buchungsseite")}><input className="input" value={s.name||""} placeholder={hotel.name} onChange={e=>setS({...s,name:e.target.value})} /></Field>
          <Field label={tf("Zeitraster")}><select className="input" value={s.slot_min} onChange={e=>setS({...s,slot_min:Number(e.target.value)})}>{[15,30,60].map(n=><option key={n} value={n}>{tf("{0} Minuten", n)}</option>)}</select></Field>
          {num("duration_min", tf("Dauer je Tisch (Minuten)"), 30, 360)}
          {num("max_party", tf("Max. Personen online"), 1, 40)}
          {num("lead_hours", tf("Vorlauf (Stunden)"), 0, 72)}
          {num("max_days", tf("Buchbar für Tage"), 1, 180)}
        </div>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!s.auto_confirm} onChange={e=>setS({...s,auto_confirm:e.target.checked})} /> {tf("Automatisch bestätigen, wenn ein Tisch frei ist (sonst als Anfrage)")}</label>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={s.reminder!==false} onChange={e=>setS({...s,reminder:e.target.checked})} /> {tf("Erinnerung per E-Mail am Vortag")}</label>
        <div style={{maxWidth:260}}>{num("request_from", tf("Gruppen ab … Personen nur als Anfrage (0 = aus)"), 0, 200)}</div>
        <Field label={tf("Hinweis für Gäste")}><textarea className="input" rows={2} value={s.note||""} onChange={e=>setS({...s,note:e.target.value})} /></Field>
        <div className="field-label">{tf("Ruhetage / geschlossen am")}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
          {(s.closed_days||[]).map(d=><span key={d} style={{fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:999,padding:"2px 8px"}}>{fmtDate(d)} <button style={{...linkBtn,padding:0}} aria-label={tf("Entfernen")} onClick={()=>setS({...s,closed_days:s.closed_days.filter(x=>x!==d)})}>✕</button></span>)}
          <input className="input" type="date" style={{width:"auto"}} value={closed} aria-label={tf("Ruhetag hinzufügen")} onChange={e=>setClosed(e.target.value)} />
          <button style={opSmall} disabled={!closed} onClick={()=>{ setS({...s,closed_days:[...new Set([...(s.closed_days||[]), closed])].sort()}); setClosed(""); }}>{tf("Hinzufügen")}</button>
        </div>
      </Card>
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <button className="btn-primary" onClick={()=>save()}>{tf("Speichern")}</button>
    </div>
  );
}

// Tischplan: Spalten = Tische, Zeilen = Uhrzeit (1 Minute = 1 Pixel) – Lücken sofort sichtbar
function DiningPlan({list, tables, onOpen}){
  const shown = list.filter(r=>r.status==="angefragt"||r.status==="bestätigt"||r.status==="erledigt");
  if(!tables.length) return <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Tische angelegt.")}</div>;
  const from = Math.min(11*60, ...shown.map(r=>Math.floor(r.start_min/60)*60)), to = Math.max(23*60, ...shown.map(r=>Math.ceil((r.start_min+(r.duration_min||120))/60)*60));
  const hours = []; for(let t=from; t<to; t+=60) hours.push(t);
  return <div className="card" style={{padding:0,overflowX:"auto",marginBottom:12}} role="region" aria-label={tf("Tischplan")}>
    <div style={{display:"grid",gridTemplateColumns:`52px repeat(${tables.length}, minmax(110px, 1fr))`,minWidth:52+tables.length*110}}>
      <div style={{borderBottom:`1px solid ${BORDER}`}} />
      {tables.map(t=><div key={t.id} style={{padding:"8px 6px",fontWeight:600,fontSize:13,borderBottom:`1px solid ${BORDER}`,borderInlineStart:`1px solid ${BORDER}`}}><span data-no-i18n="">{t.name}</span> <span style={{fontWeight:400,color:INK_MUTED,fontSize:11.5}}>({t.seats})</span></div>)}
      <div style={{position:"relative",height:to-from}}>{hours.map(t=><div key={t} style={{position:"absolute",top:t-from,insetInlineEnd:6,fontSize:11,color:INK_MUTED}}>{String(Math.floor(t/60)%24).padStart(2,"0")}:00</div>)}</div>
      {tables.map(t=><div key={t.id} style={{position:"relative",height:to-from,borderInlineStart:`1px solid ${BORDER}`,background:`repeating-linear-gradient(to bottom, transparent 0, transparent 59px, ${BORDER} 59px, ${BORDER} 60px)`}}>
        {shown.filter(r=>(r.table_ids||[]).includes(t.id)).map(r=><button key={r.id} type="button" onClick={()=>onOpen(r)} style={{position:"absolute",top:r.start_min-from,height:Math.max(22,(r.duration_min||120)-2),insetInlineStart:3,insetInlineEnd:3,background:r.status==="angefragt"?WARN_SOFT:"#fff",border:`1px solid ${BRASS}`,borderInlineStart:`4px solid ${r.allergens&&r.allergens.length?BAD:BRASS}`,borderRadius:6,padding:"2px 5px",fontSize:11.5,textAlign:"start",overflow:"hidden",cursor:"pointer",color:INK,opacity:r.status==="erledigt"?0.55:1}}>
          <b>{r.time}</b> <span data-no-i18n="">{r.name}</span><div style={{color:INK_MUTED}}>{tf("{0} Pers.", r.party)}{r.allergens&&r.allergens.length?" · ⚠":""}</div></button>)}
      </div>)}
    </div>
  </div>;
}

function DiningSeriesForm({form, setForm, tables, onClose, onSave}){
  const togT = (id) => { const l = form.table_ids||[]; setForm({...form, table_ids: l.includes(id) ? l.filter(x=>x!==id) : [...l, id]}); };
  return <Overlay onClose={onClose} width={520} label={tf("Stammtisch")}>
    <b>{tf("Stammtisch")}</b>
    <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Für Hausgäste mit Halbpension oder Stammgäste: derselbe Tisch zur selben Zeit an jedem Abend des Aufenthalts.")}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:"0 10px"}}>
      <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
      <Field label={tf("Zimmer")}><input className="input" value={form.room_no} onChange={e=>setForm({...form,room_no:e.target.value})} /></Field>
      <Field label={tf("von")}><input className="input" type="date" value={form.from} onChange={e=>setForm({...form,from:e.target.value})} /></Field>
      <Field label={tf("bis")}><input className="input" type="date" value={form.to} onChange={e=>setForm({...form,to:e.target.value})} /></Field>
      <Field label={tf("Uhrzeit")}><input className="input" type="time" step={900} value={form.time} onChange={e=>setForm({...form,time:e.target.value})} /></Field>
      <Field label={tf("Personen")}><input className="input" type="number" min={1} max={40} value={form.party} onChange={e=>setForm({...form,party:e.target.value})} /></Field>
    </div>
    {tables.length>0 && <fieldset style={{border:"none",padding:0,margin:"0 0 10px"}}><legend className="field-label">{tf("Tisch (leer = automatisch)")}</legend>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{tables.filter(t=>t.active!==false).map(t=><label key={t.id} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:6,padding:"4px 8px",minHeight:32}}><input type="checkbox" checked={(form.table_ids||[]).includes(t.id)} onChange={()=>togT(t.id)} /> <span data-no-i18n="">{t.name}</span> ({t.seats})</label>)}</div></fieldset>}
    <Field label={tf("Notiz")}><input className="input" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
    <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!String(form.name).trim()||!form.from||!form.to} onClick={onSave}>{tf("Anlegen")}</button><button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button></div>
  </Overlay>;
}

function DiningStats({hotel, api}){
  const [days,setDays] = useState(30); const [d,setD] = useState(null);
  useEffect(()=>{ setD(null); api("/api/hotels/"+hotel.id+"/dining-stats?days="+days).then(setD).catch(e=>setD({error:e.message})); },[api, hotel.id, days]);
  const max = d && d.weekdays ? Math.max(1, ...d.weekdays.map(w=>w.guests)) : 1;
  return <div>
    <select className="input" style={{width:"auto",marginBottom:12}} aria-label={tf("Zeitraum")} value={days} onChange={e=>setDays(Number(e.target.value))}>{[30,90,365].map(n=><option key={n} value={n}>{tf("letzte {0} Tage", n)}</option>)}</select>
    {!d && <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>}
    {d && d.error && <ErrorText>{d.error}</ErrorText>}
    {d && d.weekdays && <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:14}}>
        {[[tf("Reservierungen"), d.total],[tf("Gäste"), d.guests],[tf("davon online"), d.online],[tf("Storno-Quote"), d.cancel_pct==null?"–":d.cancel_pct+" %"],[tf("No-Show-Quote"), d.no_show_pct==null?"–":d.no_show_pct+" %"]].map(([l,v])=><Card key={l}><div style={{fontSize:12,color:INK_MUTED}}>{l}</div><div style={{fontSize:20,fontWeight:700}}>{v}</div></Card>)}
      </div>
      <b style={{fontSize:13.5}}>{tf("Gäste je Wochentag")}</b>
      {d.weekdays.map((w,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"5px 0",fontSize:13}}>
        <span style={{width:100}}>{tf(DN_DAYS[i][1])}</span>
        <div style={{flex:1,height:10,background:PAPER,borderRadius:5,overflow:"hidden"}} aria-hidden="true"><div style={{width:(w.guests/max*100)+"%",height:"100%",background:BRASS}} /></div>
        <span style={{width:120,textAlign:"end"}}>{tf("{0} Gäste", w.guests)}</span>
      </div>)}
    </div>}
  </div>;
}
