// Abteilungen, die man sehen darf (Dienstplan, Logbuch, Checklisten)
function visibleDeptsFor(role, myDepts){
  if(role==="admin" || role==="viewer" || (role==="manager" && myDepts.length===0)) return DEPARTMENTS;
  return DEPARTMENTS.filter(d=>myDepts.includes(d)).concat(myDepts.filter(d=>!DEPARTMENTS.includes(d)));
}
// Abteilungsauswahl als Reiter (gemerkt pro Bereich)
function DeptTabs({depts, value, onChange}){
  if(depts.length<=1) return null;
  return (
    <div className="no-print" style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12}}>
      {depts.map(d=>(
        <button key={d} onClick={()=>onChange(d)} style={{flexShrink:0,border:`1px solid ${d===value?INK:BORDER}`,background:d===value?INK:"#fff",color:d===value?"#fff":INK,
          borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer",whiteSpace:"nowrap"}}>{d}</button>
      ))}
    </div>
  );
}
function useRememberedDept(storageKey, depts){
  const [d,setD] = useState(()=>{ try { const s = window.localStorage.getItem(storageKey); if(s && depts.includes(s)) return s; } catch(e){} return depts[0] || ""; });
  const set = (v) => { setD(v); try { window.localStorage.setItem(storageKey, v); } catch(e){} };
  return [depts.includes(d) ? d : (depts[0]||""), set];
}

function LogbookView({hotel, api, me, members, role, myDepts}){
  const depts = visibleDeptsFor(role, myDepts);
  const [dept,setDept] = useRememberedDept("hpoos_log_dept", depts);
  const [entries,setEntries] = useState([]);
  const [onlyOpen,setOnlyOpen] = useState(false);
  const [kind,setKind] = useState("Info");
  const [text,setText] = useState("");
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const canWrite = role!=="viewer";
  const load = useCallback(async()=>{
    if(!dept) return;
    try { setEntries(await api(base+"/logbook?department="+encodeURIComponent(dept)+(onlyOpen?"&open=true":""))); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  },[api, base, dept, onlyOpen]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const add = () => { if(!text.trim()) return; run(async()=>{ await api(base+"/logbook","POST",{department:dept, kind, body:text}); setText(""); setKind("Info"); }); };
  const who = (id) => { if(me && id===me.id) return tf("Du"); const m = members.find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
  const T = useTranslated(api, entries.map(e=>e.body));
  const byDate = []; entries.forEach(e=>{ let g = byDate.find(x=>x.date===e.entry_date); if(!g){ g = {date:e.entry_date, items:[]}; byDate.push(g); } g.items.push(e); });
  const openCount = entries.filter(e=>e.kind==="Offen" && !e.done).length;
  return (
    <div>
      <BriefingCard hotel={hotel} api={api} me={me} role={role} myDepts={myDepts} />
      <DeptTabs depts={depts} value={dept} onChange={setDept} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {canWrite && dept && (
        <Card style={{marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:8}}>{tf("Neuer Eintrag")} · <span>{dept}</span></div>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            {LOG_KINDS.map(k=><button key={k} onClick={()=>setKind(k)} style={{border:`1px solid ${kind===k?LOG_STYLE[k].color:BORDER}`,background:kind===k?LOG_STYLE[k].bg:"#fff",
              color:kind===k?LOG_STYLE[k].color:INK,fontWeight:kind===k?700:400,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{k}</button>)}
          </div>
          <textarea className="input" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder={tf("Was sollte die nächste Schicht wissen? z. B. Zimmer 214: Fernbedienung fehlt, Gast in 305 reist früher ab …")}
            style={{fontFamily:"inherit",resize:"vertical"}} />
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8}}><MicButton onText={(x)=>setText(v=>appendText(v,x))} /><button className="btn-primary" onClick={add} disabled={!text.trim()}>{tf("Eintragen")}</button></div>
        </Card>
      )}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{fontWeight:700,flex:1}}>{tf("Übergabebuch")}{openCount>0 && <span style={{color:WARN,fontWeight:400,fontSize:13}}> · {tf("{0} offene Punkte", openCount)}</span>}</div>
        <TranslateToggle t={T} />
        <label style={{fontSize:12.5,color:INK_MUTED,display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={onlyOpen} onChange={e=>setOnlyOpen(e.target.checked)} /> {tf("Nur offene Punkte")}</label>
      </div>
      {byDate.length===0 && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Einträge.")}</div></Card>}
      {byDate.map(g=>(
        <div key={g.date} style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:INK_MUTED,textTransform:"uppercase",margin:"4px 0 6px"}} data-no-i18n="">{fmtDay(g.date,{weekday:"long",day:"2-digit",month:"long"})}</div>
          {g.items.map(e=>{ const st = LOG_STYLE[e.kind]; const mine = me && e.author_id===me.id; return (
            <Card key={e.id} style={{padding:"12px 14px",marginBottom:8,opacity:e.done?0.6:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                <Pill color={st.color} bg={st.bg}>{e.kind}</Pill>
                <span style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{who(e.author_id)} · {new Date(e.created_at).toLocaleTimeString(UI_LOCALE,{hour:"2-digit",minute:"2-digit"})}</span>
                <span style={{flex:1}}></span>
                {e.kind==="Offen" && canWrite && (
                  <label style={{fontSize:12.5,display:"flex",gap:6,alignItems:"center",cursor:"pointer",color:e.done?GOOD:INK}}>
                    <input type="checkbox" checked={e.done} onChange={ev=>run(()=>api("/api/logbook/"+e.id,"PATCH",{done:ev.target.checked}))} /> {e.done ? tf("Erledigt von {0}", who(e.done_by)) : tf("Erledigt")}
                  </label>
                )}
                {(mine || canManageDept(e.department)) && <button style={{...linkBtn,color:BAD}} title="Löschen" onClick={()=>{ if(window.confirm(tf("Eintrag löschen?"))) run(()=>api("/api/logbook/"+e.id,"DELETE")); }}>✕</button>}
              </div>
              <div style={{fontSize:14,whiteSpace:"pre-wrap",textDecoration:e.done?"line-through":"none"}}><TrText text={e.body} tr={T.tr} /></div>
            </Card>
          ); })}
        </div>
      ))}
    </div>
  );
}

function ChecklistsView({hotel, api, me, role, myDepts, members}){
  const depts = visibleDeptsFor(role, myDepts);
  const [dept,setDept] = useRememberedDept("hpoos_cl_dept", depts);
  const [date,setDate] = useState(todayIso());
  const [lists,setLists] = useState([]);
  const [templates,setTemplates] = useState([]);
  const [editing,setEditing] = useState(null); // {id?, title, itemsText}
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const canTick = role!=="viewer";
  const canEdit = canManageDept(dept);
  const load = useCallback(async()=>{
    try { setLists(await api(base+"/checklists?date="+date)); } catch(e){ setMsg({ok:false,text:e.message}); }
  },[api, base, date]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ if(canEdit && dept) api("/api/checklist-templates?department="+encodeURIComponent(dept)).then(setTemplates).catch(()=>setTemplates([])); else setTemplates([]); },[dept, canEdit]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const tick = (l, item, on) => {
    // sofort anzeigen, dann speichern
    setLists(ls=>ls.map(x=>x.id!==l.id ? x : {...x, run:{...(x.run||{}), checked: on ? {...((x.run||{}).checked||{}), [item]:{by:me?me.email:"",at:new Date().toISOString()}} : Object.fromEntries(Object.entries((x.run||{}).checked||{}).filter(([k])=>k!==item))}}));
    api("/api/checklists/"+l.id+"/run","PUT",{date, item, checked:on}).catch(e=>{ setMsg({ok:false,text:e.message}); load(); });
  };
  const saveEdit = () => run(async()=>{
    const items = editing.itemsText.split("\n").map(t=>t.trim()).filter(Boolean).map((text,i)=>({id:(editing.ids&&editing.ids[i])||("i"+Date.now().toString(36)+i), text}));
    if(editing.id) await api("/api/checklists/"+editing.id,"PATCH",{title:editing.title, items});
    else await api(base+"/checklists","POST",{department:dept, title:editing.title, items});
    setEditing(null);
  });
  const mine = lists.filter(l=>l.department===dept);
  const usedTemplates = new Set(mine.map(l=>l.template_key).filter(Boolean));
  return (
    <div>
      <TempView hotel={hotel} api={api} me={me} members={members||[]} role={role} myDepts={myDepts} />
      <DeptTabs depts={depts} value={dept} onChange={setDept} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div className="no-print" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        <input type="date" className="input" style={{width:170}} value={date} onChange={e=>setDate(e.target.value || todayIso())} />
        {date!==todayIso() && <button style={linkBtn} onClick={()=>setDate(todayIso())}>{tf("Heute")}</button>}
        <span style={{flex:1}}></span>
        {canEdit && <button className="btn-primary" onClick={()=>setEditing({title:"", itemsText:""})}>{tf("+ Checkliste")}</button>}
      </div>
      {canEdit && templates.filter(t=>!usedTemplates.has(t.template_key)).length>0 && (
        <Card style={{marginBottom:12,padding:"10px 14px"}}>
          <span style={{fontSize:13,color:INK_MUTED}}>{tf("Vorlagen:")}</span>{" "}
          {templates.filter(t=>!usedTemplates.has(t.template_key)).map(t=>(
            <button key={t.template_key} onClick={()=>run(()=>api(base+"/checklists","POST",{template_key:t.template_key, department:dept}))}
              style={{border:`1px solid ${BRASS}`,background:BRASS_SOFT,borderRadius:999,padding:"4px 11px",fontSize:12.5,cursor:"pointer",margin:"2px 4px"}} data-no-i18n="">+ {t.title}</button>
          ))}
        </Card>
      )}
      {editing && (
        <Card style={{marginBottom:14,borderColor:BRASS}}>
          <Field label={tf("Titel")}><input className="input" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} /></Field>
          <Field label={tf("Punkte (einer pro Zeile)")}><textarea className="input" rows={7} value={editing.itemsText} onChange={e=>setEditing({...editing,itemsText:e.target.value})} style={{fontFamily:"inherit"}} /></Field>
          <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={saveEdit} disabled={!editing.title.trim()}>{tf("Speichern")}</button><button style={linkBtn} onClick={()=>setEditing(null)}>{tf("Abbrechen")}</button></div>
        </Card>
      )}
      {mine.length===0 && !editing && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{canEdit ? tf("Noch keine Checklisten. Lege eine an oder übernimm eine Vorlage.") : tf("Für diese Abteilung gibt es noch keine Checklisten.")}</div></Card>}
      {mine.map(l=>{
        const checked = (l.run && l.run.checked) || {}; const items = l.items || [];
        const done = items.filter(i=>checked[i.id]).length; const pct = items.length ? Math.round(done/items.length*100) : 0;
        return (
          <Card key={l.id} style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{fontWeight:700,flex:1}} data-no-i18n="">{l.title}</div>
              <span style={{fontSize:12.5,color:pct===100?GOOD:INK_MUTED,fontWeight:600}} data-no-i18n="">{done}/{items.length}</span>
              {canEdit && <button style={linkBtn} onClick={()=>setEditing({id:l.id, title:l.title, itemsText:items.map(i=>i.text).join("\n"), ids:items.map(i=>i.id)})}>{tf("Bearbeiten")}</button>}
              {canEdit && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Checkliste löschen?"))) run(()=>api("/api/checklists/"+l.id,"DELETE")); }}>✕</button>}
            </div>
            <div style={{height:5,background:PAPER,borderRadius:3,overflow:"hidden",marginBottom:8}}><div style={{width:pct+"%",height:"100%",background:pct===100?GOOD:BRASS}} /></div>
            {items.map(i=>{ const c = checked[i.id]; return (
              <label key={i.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 4px",borderTop:`1px solid ${BORDER}`,cursor:canTick?"pointer":"default"}}>
                <input type="checkbox" checked={!!c} disabled={!canTick} onChange={e=>tick(l, i.id, e.target.checked)} style={{width:22,height:22,flexShrink:0}} />
                <span style={{flex:1,fontSize:14,textDecoration:c?"line-through":"none",color:c?INK_MUTED:INK}} data-no-i18n="">{i.text}</span>
                {c && <span style={{fontSize:11,color:INK_MUTED,whiteSpace:"nowrap"}} data-no-i18n="">{shortName(c.by)} · {new Date(c.at).toLocaleTimeString(UI_LOCALE,{hour:"2-digit",minute:"2-digit"})}</span>}
              </label>
            ); })}
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ Betrieb: Zeiterfassung, Zimmer, Meldungen, Push
const pad2 = (n) => String(n).padStart(2,"0");
const fmtClock = (iso) => new Date(iso).toLocaleTimeString(UI_LOCALE,{hour:"2-digit",minute:"2-digit"});
const fmtHM = (h) => { const neg = h<0; const m = Math.round(Math.abs(h)*60); return (neg?"−":"")+Math.floor(m/60)+":"+pad2(m%60); };
const toLocalInput = (iso) => { if(!iso) return ""; const d = new Date(iso); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+"T"+pad2(d.getHours())+":"+pad2(d.getMinutes()); };
const fromLocalInput = (v) => v ? new Date(v).toISOString() : null;
const entryHours = (e, now) => Math.max(0, ((e.clock_out ? new Date(e.clock_out) : (now||new Date())) - new Date(e.clock_in))/3600000 - (Number(e.break_minutes)||0)/60);
const memberLabel = (members, me, id) => { if(me && id===me.id) return tf("Du"); const m = members.find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
function myClockDepts(role, myDepts){ return (role==="admin" || role==="manager") && myDepts.length===0 ? DEPARTMENTS : myDepts; }
const currentMonth = () => todayIso().slice(0,7);
const smallBtn = {background:"#fff",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 11px",fontSize:12.5,cursor:"pointer",color:INK};

// Foto verkleinern (lange Seite höchstens 1280 px, JPEG), damit es schnell hochlädt
function compressImage(file, maxSide, quality){
  return new Promise((resolve, reject) => {
    if(!file || !/^image\//.test(file.type)) return reject(new Error(tf("Bitte eine Bilddatei wählen.")));
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight; const s = Math.min(1, (maxSide||1280)/Math.max(w,h)); w = Math.round(w*s); h = Math.round(h*s);
      const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      let q = quality||0.72, out = c.toDataURL("image/jpeg", q);
      while(out.length > 650000 && q > 0.3){ q -= 0.12; out = c.toDataURL("image/jpeg", q); }
      out.length > 690000 ? reject(new Error(tf("Das Foto ist zu groß."))) : resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(tf("Das Foto konnte nicht gelesen werden."))); };
    img.src = url;
  });
}

// Kommen / Gehen – für alle, die im Dienstplan stehen
function ClockCard({hotel, api, role, myDepts, compact, onChanged}){
  const depts = myClockDepts(role, myDepts);
  const [dept,setDept] = useRememberedDept("hpoos_clock_dept", depts);
  const [data,setData] = useState(null);
  const [brk,setBrk] = useState("");
  const [msg,setMsg] = useState(null);
  const [busy,setBusy] = useState(false);
  const [,setTick] = useState(0);
  const [queued,setQueued] = useState(clockQueue().length);
  const load = useCallback(()=>api("/api/time/me").then(d=>{ setData(d); if(d.open){ const h = (Date.now()-new Date(d.open.clock_in))/3600000; setBrk(b=>b!=="" ? b : String(h>6?30:0)); } })
    .catch(e=>{ if(isNetworkError(e)) setData(d=>d||{open:null, entries:[], offline:true}); else setMsg({ok:false,text:e.message}); }),[api]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ const t = setInterval(()=>setTick(x=>x+1), 30000); return ()=>clearInterval(t); },[]);
  // offline gespeicherte Buchungen senden, sobald wieder Netz da ist
  useEffect(()=>{
    const f = () => flushClockQueue(api).then(r=>{ setQueued(clockQueue().length); if(r.sent){ setMsg({ok:true,text:tf("{0} offline gespeicherte Buchungen gesendet.", r.sent)}); load(); } if(r.errors.length) setMsg({ok:false,text:r.errors[0]}); });
    f(); window.addEventListener("online", f); return ()=>window.removeEventListener("online", f);
  },[api]);
  const code = clockCodeNow();
  const needQr = !!hotel.clock_qr_required && !code;
  const doClock = async (kind) => {
    setBusy(true); setMsg(null);
    const b = Number(brk)||0;
    try {
      if(kind==="in") await api("/api/hotels/"+hotel.id+"/time/clock-in","POST",{department:dept, code});
      else await api("/api/time/clock-out","POST",{break_minutes:b, code});
      setBrk(""); await load(); if(onChanged) onChanged();
    } catch(e){
      if(isNetworkError(e)){ setClockQueue([...clockQueue(), {kind, hotel:hotel.id, dept, brk:b, code, at:new Date().toISOString()}]); setQueued(clockQueue().length); setBrk("");
        setMsg({ok:true,text:tf("Kein Netz – die Buchung ist gespeichert und wird automatisch gesendet.")}); }
      else setMsg({ok:false,text:e.message});
    }
    setBusy(false);
  };
  if(role==="viewer") return null;
  const q = clockQueue(); const lastQ = q[q.length-1];
  const open = lastQ ? (lastQ.kind==="in" ? {clock_in:lastQ.at, department:lastQ.dept, hotel_id:lastQ.hotel, break_minutes:0} : null) : (data && data.open);
  const month = currentMonth();
  const monthEntries = data ? data.entries.filter(e=>e.clock_out && e.hotel_id===hotel.id && toLocalInput(e.clock_in).slice(0,7)===month) : [];
  const monthTotal = monthEntries.reduce((s,e)=>s+entryHours(e),0);
  return (
    <Card style={{marginBottom:14,borderColor:open?GOOD:BORDER}}>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}>
          <div style={{fontWeight:700}}>{tf("Zeiterfassung")}</div>
          {!data ? <div style={{fontSize:13,color:INK_MUTED}}>…</div> : open ? (
            <div style={{fontSize:13.5,marginTop:2}}>
              <span style={{color:GOOD,fontWeight:700}}>● {tf("Eingestempelt seit {0}", fmtClock(open.clock_in))}</span>
              <span style={{color:INK_MUTED}}> · <span data-no-i18n="">{fmtHM(entryHours({...open, break_minutes:0}))} h</span> · <span>{open.department}</span></span>
              {open.hotel_id!==hotel.id && <div style={{fontSize:12.5,color:WARN}}>{tf("Im Hotel {0}", open.hotel_name)}</div>}
            </div>
          ) : <div style={{fontSize:13,color:INK_MUTED,marginTop:2}}>{tf("Nicht eingestempelt.")}</div>}
          {data && <div style={{fontSize:12,color:INK_MUTED,marginTop:4}}>{tf("Diesen Monat: {0} h", fmtHM(monthTotal))}</div>}
        </div>
        {data && !open && depts.length>1 && <select className="input" style={{width:"auto",minWidth:150}} value={dept} onChange={e=>setDept(e.target.value)}>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select>}
        {data && open && (
          <label style={{fontSize:12.5,color:INK_MUTED,display:"flex",alignItems:"center",gap:6}}>{tf("Pause")}
            <input className="input" type="number" min="0" max="600" step="5" value={brk} onChange={e=>setBrk(e.target.value)} style={{width:74}} /> {tf("Min.")}
          </label>
        )}
        {data && needQr && <div style={{fontSize:13,color:WARN,maxWidth:260}}><Icon n="camera" /> {tf("Zum Stempeln den QR-Code am Mitarbeitereingang mit der Handykamera scannen.")}</div>}
        {data && !needQr && (open
          ? <button className="btn-primary" disabled={busy} style={{background:BAD,minWidth:110,padding:"11px 18px"}} onClick={()=>doClock("out")}>{tf("Gehen")}</button>
          : <button className="btn-primary" disabled={busy || !dept} style={{background:GOOD,minWidth:110,padding:"11px 18px"}} onClick={()=>doClock("in")}>{tf("Kommen")}</button>)}
      </div>
      {open && Number(brk)===0 && entryHours({...open, break_minutes:0})>6 && <div style={{fontSize:12.5,color:WARN,marginTop:8}}>{tf("Ab 6 Stunden Arbeit sind mindestens 30 Minuten Pause vorgeschrieben.")}</div>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
      {queued>0 && <div style={{fontSize:12.5,color:WARN,marginTop:6}}><Icon n="clock" /> {tf("{0} Buchungen warten auf Netz.", queued)}</div>}
      {!compact && monthEntries.length>0 && (
        <div style={{marginTop:12}}>
          <div style={{fontSize:12,fontWeight:700,color:INK_MUTED,textTransform:"uppercase",marginBottom:4}}>{tf("Meine Zeiten")}</div>
          {monthEntries.map(e=>(
            <div key={e.id} style={{display:"flex",gap:10,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}} data-no-i18n="">
              <span style={{width:110,color:INK_MUTED}}>{fmtDay(toLocalInput(e.clock_in).slice(0,10))}</span>
              <span style={{flex:1}} dir="ltr">{fmtClock(e.clock_in)}–{fmtClock(e.clock_out)}{e.break_minutes ? " · "+e.break_minutes+" min" : ""}</span>
              {e.edited_by && <span style={{fontSize:11.5,color:WARN}}>{tf("korrigiert")}</span>}
              {e.offline && <span style={{fontSize:11.5,color:INK_MUTED}}>{tf("offline")}</span>}
              <b>{fmtHM(entryHours(e))}</b>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TimeView({hotel, api, me, members, role, myDepts, onHotel}){
  const lead = role==="admin" || role==="manager";
  return (
    <div>
      <ClockCard hotel={hotel} api={api} role={role} myDepts={myDepts} />
      {role==="admin" && !window.OUVERTURE_DEMO && <ClockQrCard hotel={hotel} api={api} onHotel={onHotel} />}
      {lead && <TeamTime hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} onHotel={onHotel} />}
    </div>
  );
}

// Leitung: wer ist da, Monatsauswertung, Korrekturen, Lohn-Export
function TeamTime({hotel, api, me, members, role, myDepts, onHotel}){
  const depts = visibleDeptsFor(role, myDepts).filter(canManageDept);
  const [laOpen,setLaOpen] = useState(false);
  const [dept,setDept] = useState("");
  const [month,setMonth] = useState(currentMonth());
  const [entries,setEntries] = useState([]);
  const [shifts,setShifts] = useState([]);
  const [targets,setTargets] = useState([]);
  const [openKey,setOpenKey] = useState(null);
  const [edit,setEdit] = useState(null);
  const [add,setAdd] = useState(null);
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const mb = payrollMonthBounds(month);
  const load = useCallback(async()=>{
    const q = "?from="+mb.first+"&to="+mb.last+(dept ? "&department="+encodeURIComponent(dept) : "");
    try {
      const [e,s,t] = await Promise.all([api(base+"/time-entries"+q), api(base+"/shifts"+q), api(base+"/staff-hours")]);
      const ok = (d) => dept ? d===dept : depts.includes(d);
      setEntries(e.filter(x=>ok(x.department))); setShifts(s.filter(x=>ok(x.department))); setTargets(t.filter(x=>ok(x.department)));
    } catch(e){ setMsg({ok:false,text:e.message}); }
  },[api, base, dept, month]);
  useEffect(()=>{ load(); },[load]);
  if(!depts.length) return null;
  const nameOf = (id) => { const m = members.find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
  const partial = payrollSollDays(month, todayIso()) < mb.days; // laufender Monat: Soll bis heute
  const holidays = holidayMap(hotel.holiday_region, mb.first, mb.last);
  const rows = payrollSummary({month, entries, shifts, targets, nameOf, today: todayIso(), holidays});
  const openNow = entries.filter(e=>!e.clock_out);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const saveEdit = () => run(async()=>{ await api("/api/time-entries/"+edit.id,"PATCH",{clock_in:fromLocalInput(edit.in), clock_out:fromLocalInput(edit.out), break_minutes:Number(edit.brk)||0, note:edit.note}); setEdit(null); });
  const saveAdd = () => run(async()=>{ await api(base+"/time-entries","POST",{user_id:add.user, department:add.dept, clock_in:fromLocalInput(add.in), clock_out:fromLocalInput(add.out), break_minutes:Number(add.brk)||0, note:add.note}); setAdd(null); });
  const H = (n) => n==null ? "–" : fmtHours(n);
  const exportRows = () => rows.map(r=>[r.name, r.user_id ? (members.find(m=>m.user_id===r.user_id)||{}).email||"" : "", r.departments.join(", "), r.target, r.planned, r.entries?r.worked:null, r.diff, r.breaks, r.night, r.sunday, r.holiday, r.vacation, r.sick, r.entries, r.corrected, r.open]);
  const header = [tf("Name"), tf("E-Mail"), tf("Abteilung"), partial ? tf("Soll bis heute (h)") : tf("Soll (h)"), tf("Geplant (h)"), tf("Ist (h)"), tf("Differenz (h)"), tf("Pausen (h)"), tf("Nachtstunden 22–6 (h)"), tf("Sonntagsstunden (h)"), tf("Feiertagsstunden (h)"), tf("Urlaubstage"), tf("Krankentage"), tf("Buchungen"), tf("davon korrigiert"), tf("offen")];
  const bookingRows = () => entries.filter(e=>e.clock_out).map(e=>[toLocalInput(e.clock_in).slice(0,10), nameOf(e.user_id), e.department, fmtClock(e.clock_in), fmtClock(e.clock_out), e.break_minutes, Math.round(entryHours(e)*100)/100, e.note||"", e.edited_by ? nameOf(e.edited_by) : "", e.edited_at ? fmtDateTime(e.edited_at) : ""]);
  const bookingHeader = [tf("Datum"), tf("Name"), tf("Abteilung"), tf("Kommen"), tf("Gehen"), tf("Pause (Min.)"), tf("Stunden"), tf("Notiz"), tf("korrigiert von"), tf("korrigiert am")];
  const fileName = (ext) => (tf("Lohn-Export")+" "+hotel.name+" "+month+(dept?" "+dept:"")).replace(/[\\/:*?"<>|]+/g,"")+"."+ext;
  const exportXlsx = async () => {
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const wb = XLSX.utils.book_new();
      const s1 = XLSX.utils.aoa_to_sheet([header, ...exportRows()]); s1["!cols"] = header.map((h,i)=>({wch:i<3?22:12}));
      XLSX.utils.book_append_sheet(wb, s1, tf("Monatsauswertung").slice(0,31));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([bookingHeader, ...bookingRows()]), tf("Buchungen").slice(0,31));
      XLSX.writeFile(wb, fileName("xlsx"));
    } catch(e){ setMsg({ok:false,text:tf("Export fehlgeschlagen: {0}", e.message)}); }
  };
  const exportCsv = () => {
    const blob = new Blob([payrollCsv(header, exportRows())], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName("csv"); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  };
  const deptMembers = members.filter(m=>m.role!=="viewer" && (!add || !add.dept || (m.departments||[]).includes(add.dept) || m.role==="admin"));
  const th = {textAlign:"end",padding:"6px 8px",fontSize:11.5,color:INK_MUTED,fontWeight:700,whiteSpace:"nowrap"};
  const td = {textAlign:"end",padding:"7px 8px",fontSize:13,whiteSpace:"nowrap"};
  return (
    <div>
      <div className="no-print" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",margin:"18px 0 12px"}}>
        <div style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600,flex:1,minWidth:200}}>{tf("Team und Monatsauswertung")}</div>
        <select className="input" style={{width:"auto"}} value={dept} onChange={e=>setDept(e.target.value)}>
          {depts.length>1 && <option value="">{tf("Alle meine Abteilungen")}</option>}
          {depts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <input type="month" className="input" style={{width:160}} value={month} onChange={e=>e.target.value && setMonth(e.target.value)} />
      </div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {laOpen && <PayrollExportCard hotel={hotel} api={api} rows={rows} month={month} onHotel={(h)=>{ if(onHotel) onHotel(h); }} onClose={()=>setLaOpen(false)} />}
      <Card style={{marginBottom:14}}>
        <div style={{fontWeight:700,marginBottom:6}}>{tf("Jetzt im Dienst")} <span style={{color:INK_MUTED,fontWeight:400}} data-no-i18n="">({openNow.length})</span></div>
        {openNow.length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Gerade ist niemand eingestempelt.")}</div> : openNow.map(e=>(
          <div key={e.id} style={{display:"flex",gap:10,padding:"5px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{color:GOOD}}>●</span><span style={{flex:1}}><span data-no-i18n="">{nameOf(e.user_id)}</span> · <span>{e.department}</span></span><span dir="ltr" data-no-i18n="">{fmtClock(e.clock_in)} · {fmtHM(entryHours({...e,break_minutes:0}))} h</span>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:14,padding:0,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 16px 6px",flexWrap:"wrap"}}>
          <div style={{fontWeight:700,flex:1}}>{tf("Monatsauswertung")} · <span data-no-i18n="">{new Date(mb.first+"T12:00:00").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"})}</span></div>
          <button style={smallBtn} onClick={()=>setAdd({user:"", dept:dept||depts[0], in:"", out:"", brk:"30", note:""})}>{tf("+ Zeit nachtragen")}</button>
          <button style={smallBtn} onClick={exportCsv}>CSV</button>
          <button style={smallBtn} onClick={()=>setLaOpen(!laOpen)}>{tf("Lohnarten-Export")}</button>
          <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={exportXlsx}>{tf("Lohn-Export (Excel)")}</button>
        </div>
        <div style={{fontSize:12,color:INK_MUTED,padding:"0 16px 8px"}}>{tf("Ist = gestempelte Zeit abzüglich Pausen, in der Ortszeit dieses Geräts.")}{" "}
          {hotel.holiday_region ? <span>{tf("Feiertage ({0}): {1}", holidayRegionLabel(hotel.holiday_region, UI_LOCALE), Object.keys(holidays).length ? Object.entries(holidays).map(([d,n])=>fmtDay(d,{day:"2-digit",month:"2-digit"})+" "+n).join(", ") : tf("keine in diesem Monat"))}</span>
            : <span>{tf("Feiertage werden berücksichtigt, sobald unter „Hotel bearbeiten“ eine Feiertagsregion gewählt ist.")}</span>}</div>
        {add && (
          <div style={{padding:"10px 16px",background:PAPER,borderTop:`1px solid ${BORDER}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label style={{fontSize:12}}><div className="field-label">{tf("Abteilung")}</div><select className="input" value={add.dept} onChange={e=>setAdd({...add,dept:e.target.value})}>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            <label style={{fontSize:12}}><div className="field-label">{tf("Person")}</div><select className="input" value={add.user} onChange={e=>setAdd({...add,user:e.target.value})}><option value="">–</option>{deptMembers.map(m=><option key={m.user_id} value={m.user_id}>{shortName(m.email)}</option>)}</select></label>
            <label style={{fontSize:12}}><div className="field-label">{tf("Kommen")}</div><input className="input" type="datetime-local" value={add.in} onChange={e=>setAdd({...add,in:e.target.value})} /></label>
            <label style={{fontSize:12}}><div className="field-label">{tf("Gehen")}</div><input className="input" type="datetime-local" value={add.out} onChange={e=>setAdd({...add,out:e.target.value})} /></label>
            <label style={{fontSize:12}}><div className="field-label">{tf("Pause (Min.)")}</div><input className="input" type="number" min="0" style={{width:80}} value={add.brk} onChange={e=>setAdd({...add,brk:e.target.value})} /></label>
            <label style={{fontSize:12,flex:1,minWidth:140}}><div className="field-label">{tf("Notiz")}</div><input className="input" value={add.note} onChange={e=>setAdd({...add,note:e.target.value})} placeholder={tf("z. B. Stempeln vergessen")} /></label>
            <button className="btn-primary" disabled={!add.user||!add.in||!add.out} onClick={saveAdd}>{tf("Speichern")}</button>
            <button style={linkBtn} onClick={()=>setAdd(null)}>{tf("Abbrechen")}</button>
          </div>
        )}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead><tr style={{borderTop:`1px solid ${BORDER}`,background:PAPER}}>
              <th style={{...th,textAlign:"start"}}>{tf("Name")}</th><th style={th}>{partial ? tf("Soll bis heute") : tf("Soll")}</th><th style={th}>{tf("Geplant")}</th><th style={th}>{tf("Ist")}</th><th style={th}>{tf("Differenz")}</th>
              <th style={th}>{tf("Nacht")}</th><th style={th}>{tf("Sonntag")}</th><th style={th}>{tf("Feiertag")}</th><th style={th}>{tf("Urlaub")}</th><th style={th}>{tf("Krank")}</th>
            </tr></thead>
            <tbody>
              {rows.length===0 && <tr><td colSpan={10} style={{padding:16,fontSize:13,color:INK_MUTED}}>{tf("Für diesen Monat gibt es noch keine Schichten oder Zeiten.")}</td></tr>}
              {rows.map(r=>(
                <React.Fragment key={r.key}>
                  <tr onClick={()=>r.user_id && setOpenKey(openKey===r.key?null:r.key)} style={{borderTop:`1px solid ${BORDER}`,cursor:r.user_id?"pointer":"default",background:openKey===r.key?BRASS_SOFT:"transparent"}}>
                    <td style={{...td,textAlign:"start"}}><b data-no-i18n="">{r.name}</b>{r.open>0 && <span style={{color:GOOD}}> ●</span>}{r.corrected>0 && <span style={{color:WARN,fontSize:11}} data-no-i18n=""> ✎{r.corrected}</span>}<div style={{fontSize:11,color:INK_MUTED}}>{r.departments.map((d,i)=><span key={d}>{i?", ":""}<span>{d}</span></span>)}</div></td>
                    <td style={td}>{H(r.target)}</td><td style={td}>{H(r.planned)}</td><td style={td}>{r.entries?H(r.worked):"–"}</td>
                    <td style={{...td,fontWeight:700,color:r.diff==null?INK_MUTED:r.diff>0.01?WARN:r.diff<-0.01?BAD:GOOD}}>{r.diff==null?"–":(r.diff>0?"+":"")+fmtHours(r.diff)}</td>
                    <td style={td}>{r.night?H(r.night):"–"}</td><td style={td}>{r.sunday?H(r.sunday):"–"}</td><td style={td}>{r.holiday?H(r.holiday):"–"}</td><td style={td}>{r.vacation||"–"}</td><td style={td}>{r.sick||"–"}</td>
                  </tr>
                  {openKey===r.key && <tr style={{background:"#FBFAF7"}}><td colSpan={10} style={{padding:"7px 12px"}}>
                    <button style={smallBtn} onClick={async()=>{ try { await sheetPdf(timesheetHtml({hotel, name:r.name, month, entries:entries.filter(e=>e.user_id===r.user_id), row:r}), (tf("Arbeitszeit-Nachweis")+" "+r.name+" "+month).replace(/[\\/:*?"<>|]+/g,"")+".pdf"); } catch(e){ setMsg({ok:false,text:tf("PDF konnte nicht erstellt werden: {0}", e.message)}); } }}><Icon n="filetext" /> {tf("Arbeitszeit-Nachweis (PDF)")}</button>
                  </td></tr>}
                  {openKey===r.key && entries.filter(e=>e.user_id===r.user_id).map(e=>(
                    <tr key={e.id} style={{background:"#FBFAF7",borderTop:`1px dashed ${BORDER}`}}>
                      <td colSpan={10} style={{padding:"7px 12px",fontSize:13}}>
                        {edit && edit.id===e.id ? (
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                            <input className="input" type="datetime-local" style={{width:"auto"}} value={edit.in} onChange={ev=>setEdit({...edit,in:ev.target.value})} />
                            <input className="input" type="datetime-local" style={{width:"auto"}} value={edit.out} onChange={ev=>setEdit({...edit,out:ev.target.value})} />
                            <input className="input" type="number" min="0" style={{width:80}} value={edit.brk} onChange={ev=>setEdit({...edit,brk:ev.target.value})} title={tf("Pause (Min.)")} />
                            <input className="input" style={{flex:1,minWidth:120}} value={edit.note} onChange={ev=>setEdit({...edit,note:ev.target.value})} placeholder={tf("Notiz")} />
                            <button className="btn-primary" style={{padding:"6px 12px"}} onClick={saveEdit}>{tf("Speichern")}</button>
                            <button style={linkBtn} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                            <span style={{width:110,color:INK_MUTED}} data-no-i18n="">{fmtDay(toLocalInput(e.clock_in).slice(0,10))}</span>
                            <span dir="ltr">{fmtClock(e.clock_in)}–{e.clock_out?fmtClock(e.clock_out):"…"}</span>
                            <span style={{color:INK_MUTED}}>{e.break_minutes?tf("Pause {0} Min.", e.break_minutes):""}</span>
                            <b data-no-i18n="">{fmtHM(entryHours(e))} h</b>
                            {e.department!==r.departments[0] && <span style={{color:INK_MUTED}}>{e.department}</span>}
                            {e.note && <span style={{color:INK_MUTED}} data-no-i18n="">· {e.note}</span>}
                            {e.edited_by && <span style={{color:WARN,fontSize:11.5}}>{tf("korrigiert von {0}", nameOf(e.edited_by))}</span>}
                            <span style={{flex:1}}></span>
                            {canManageDept(e.department) && <button style={linkBtn} onClick={()=>setEdit({id:e.id, in:toLocalInput(e.clock_in), out:toLocalInput(e.clock_out), brk:String(e.break_minutes||0), note:e.note||""})}>{tf("Bearbeiten")}</button>}
                            {canManageDept(e.department) && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Buchung löschen?"))) run(()=>api("/api/time-entries/"+e.id,"DELETE")); }}>✕</button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

