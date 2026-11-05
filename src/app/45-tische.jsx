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
      <BgmTabs value={view} onChange={setView} tabs={[["day",tf("Tagesplan")],["tables",tf("Tische")]].concat(canEdit?[["settings",tf("Online-Buchung")]]:[])} />
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
          <button className="btn-primary" onClick={()=>setForm(dnEmpty(day))}>{tf("Reservierung eintragen")}</button>
        </div>
        {(tables||[]).length===0 && <Card style={{marginBottom:12,background:WARN_SOFT}}><div style={{fontSize:13.5}}>{tf("Noch keine Tische angelegt. Ohne Tische werden Reservierungen ohne Tischzuweisung gespeichert.")}</div></Card>}
        {list && list.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Reservierungen an diesem Tag.")}</div>}
        {(list||[]).map(r=>{ const st = DN_STATUS[r.status]||DN_STATUS["bestätigt"]; return (
          <Card key={r.id} style={{marginBottom:8,opacity:r.status==="abgesagt"||r.status==="erledigt"?0.6:1}}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <b style={{fontSize:16,minWidth:52}}>{r.time}</b>
              <span style={{flex:1,minWidth:140}}><b data-no-i18n="">{r.name}</b> · {tf("{0} Pers.", r.party)}{r.room_no ? " · "+tf("Zimmer {0}", r.room_no) : ""}</span>
              {r.table_ids && r.table_ids.length>0 ? <span style={{fontSize:12.5}} data-no-i18n=""><Icon n="table" /> {tName(r.table_ids)}</span> : <span style={{fontSize:12.5,color:WARN_TEXT}}>{tf("ohne Tisch")}</span>}
              {r.source==="online" && <Pill color={INK_MUTED} bg={PAPER}>{tf("online")}</Pill>}
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
              {r.email && <a style={linkBtn} href={"mailto:"+r.email}>{tf("E-Mail")}</a>}
              {r.phone && <a style={linkBtn} href={"tel:"+r.phone.replace(/\s/g,"")}>{tf("Anrufen")}</a>}
            </div>
          </Card>); })}
      </div>}
      {view==="tables" && <DiningTables hotel={hotel} api={api} tables={tables} canEdit={canEdit} run={run} />}
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
