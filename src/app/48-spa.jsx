// ============================================================ Paket 045: Spa & Freizeit – Buchungskalender je Therapeut/in und Raum, Leistungen,
// Ressourcen (Personen, Räume, Geräte), Online-Buchung (buchen.html), Auswertung. Rechte prüft die Datenbank (Spa & Wellness, Rezeption).

const SP_CAT = [["behandlung","Behandlung"],["paar","Paar-Behandlung"],["zeitfenster","Zeitfenster (Sauna, Pool)"],["kurs","Kurs"],["aktivitaet","Aktivität / Ausflug"],["verleih","Verleih"],["platz","Sportplatz"]];
const SP_STATUS = {"angefragt":[WARN_TEXT,WARN_SOFT,"Angefragt"], "bestätigt":[GOOD_TEXT,GOOD_SOFT,"Bestätigt"], "angekommen":[INK,"#E6ECF5","Angekommen"], "erledigt":[INK_MUTED,PAPER,"Erledigt"], "storniert":[INK_MUTED,PAPER,"Storniert"], "nicht_erschienen":[BAD,BAD_SOFT,"Nicht erschienen"]};
const SP_PAY = [["vor_ort","Vor Ort"],["zimmer","Zimmerrechnung"],["online","Online bezahlt"],["gutschein","Gutschein"],["inklusive","Inklusive (Paket)"]];
const SP_HEALTH = [["pregnant","Schwangerschaft"],["heart","Herz-Kreislauf-Erkrankung"],["blood_pressure","Hoher oder niedriger Blutdruck"],["allergies","Allergien (z. B. Öle, Nüsse)"],["injuries","Verletzungen oder Operationen"],["skin","Hautprobleme"],["medication","Regelmäßige Medikamente"]];
const SP_DAYS = [["1","Montag"],["2","Dienstag"],["3","Mittwoch"],["4","Donnerstag"],["5","Freitag"],["6","Samstag"],["7","Sonntag"]];
const SP_COLORS = ["#A9834B","#6B8F71","#5B7DB1","#9B6B9E","#C0714F","#4F8A8B","#8A7F5B"];
const spMin = (t) => { const m = String(t||"").match(/^(\d{1,2}):(\d{2})/); return m ? +m[1]*60 + +m[2] : null; };
const spHm = (n) => String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const spPublicUrl = (q) => { try { return new URL("buchen.html?"+q, location.href).href; } catch(e){ return "buchen.html?"+q; } };
const SP_TEMPLATES = [
  {category:"behandlung", name:"Klassische Massage", duration_min:50, buffer_after:10, price:79, health_form:true},
  {category:"behandlung", name:"Aromaöl-Massage", duration_min:80, buffer_after:10, price:115, health_form:true},
  {category:"behandlung", name:"Gesichtsbehandlung", duration_min:50, buffer_after:10, price:85, health_form:true},
  {category:"paar", name:"Paarmassage", duration_min:50, buffer_after:15, price:160, health_form:true},
  {category:"zeitfenster", name:"Private Sauna", duration_min:60, capacity:4, price:25, price_per:"person", needs_room:false},
  {category:"kurs", name:"Yoga am Morgen", duration_min:60, capacity:10, price:0, needs_room:false, schedule:{"1":["07:30"],"3":["07:30"],"5":["07:30"],"6":["08:30"]}},
  {category:"verleih", name:"E-Bike (halber Tag)", duration_min:240, price:35},
  {category:"platz", name:"Tennisplatz", duration_min:60, price:20, staff_count:0},
];

function SpWeek({value, onChange, empty}){
  const v = value || {};
  const set = (d, l) => { const o = {...v}; if(l.length) o[d] = l; else delete o[d]; onChange(o); };
  return <div>{SP_DAYS.map(([d,l])=><div key={d} style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",padding:"4px 0",borderBottom:`1px solid ${BORDER}`}}>
    <span style={{width:92,fontSize:13}}>{tf(l)}</span>
    {(v[d]||[]).map((r,i)=><span key={i} style={{display:"flex",gap:4,alignItems:"center"}}>
      <input className="input" type="time" style={{width:104}} aria-label={tf("{0} von", translateString(l))} value={r[0]} onChange={e=>{ const x=(v[d]||[]).map(y=>[...y]); x[i][0]=e.target.value; set(d,x); }} />–
      <input className="input" type="time" style={{width:104}} aria-label={tf("{0} bis", translateString(l))} value={r[1]} onChange={e=>{ const x=(v[d]||[]).map(y=>[...y]); x[i][1]=e.target.value; set(d,x); }} />
      <button style={linkBtn} aria-label={tf("Entfernen")} onClick={()=>set(d,(v[d]||[]).filter((_,j)=>j!==i))}>✕</button>
    </span>)}
    {(v[d]||[]).length===0 && <span style={{fontSize:12.5,color:INK_MUTED}}>{empty||tf("geschlossen")}</span>}
    {(v[d]||[]).length<4 && <button style={linkBtn} onClick={()=>set(d,[...(v[d]||[]), ["09:00","18:00"]])}>+ {tf("Zeit")}</button>}
  </div>)}</div>;
}

function SpaView({hotel, api, me, members}){
  const [view,setView] = useState("cal"); const [day,setDay] = useState(todayIso());
  const [services, loadServices] = useList(api, "/api/hotels/"+hotel.id+"/booking-services");
  const [resources, loadResources] = useList(api, "/api/hotels/"+hotel.id+"/booking-resources");
  const [blocks, loadBlocks] = useList(api, "/api/hotels/"+hotel.id+"/booking-blocks");
  const [list,setList] = useState(null); const [settings,setSettings] = useState(null); const [msg,setMsg] = useState(null); const [err,setErr] = useState("");
  const [form,setForm] = useState(null); const [open,setOpen] = useState(null); const [block,setBlock] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/bookings?from="+day+"&to="+day).then(l=>{ setList(l); setErr(""); }).catch(e=>{ setErr(e.message); setList([]); }),[api, hotel.id, day]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/booking-settings").then(setSettings).catch(()=>setSettings(false)); },[api, hotel.id]);
  const reloadAll = () => { load(); loadServices(); loadResources(); loadBlocks(); };
  const run = async (fn, ok) => { setMsg(null); try { await fn(); reloadAll(); if(ok) setMsg({ok:true,text:ok}); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } };
  const svc = (id) => (services||[]).find(s=>s.id===id) || {};
  const res = (id) => (resources||[]).find(r=>r.id===id) || {};
  const canEdit = settings && settings.can_edit;
  const mine = (resources||[]).filter(r=>r.user_id && me && r.user_id===me.id).map(r=>r.id);
  const tabs = [["cal",tf("Kalender")]].concat(mine.length?[["mine",tf("Meine Termine")]]:[]).concat([["services",tf("Leistungen")],["resources",tf("Ressourcen")]]).concat(canEdit?[["online",tf("Online-Buchung")],["stats",tf("Auswertung")]]:[]);
  const active = (list||[]).filter(b=>["angefragt","bestätigt","angekommen"].includes(b.status));
  const printDay = () => {
    const rows = (list||[]).filter(b=>b.status!=="storniert").map(b=>'<tr><td>'+fsEsc(b.time+"–"+b.end)+'</td><td>'+fsEsc(svc(b.service_id).name||"")+'</td><td>'+fsEsc(b.guest_name)+(b.room_no?' · '+fsEsc(tf("Zimmer {0}", b.room_no)):'')+'</td><td>'+fsEsc((b.resource_ids||[]).map(id=>res(id).name).filter(Boolean).join(", "))+'</td><td>'+fsEsc(b.wishes||"")+(b.health_flag?' ⚠':'')+'</td><td>'+fsT((SP_STATUS[b.status]||[])[2]||"")+'</td></tr>').join("");
    const html = '<div class="fs land" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE+fsHead(hotel, translateString("Spa & Freizeit – Tagesplan"), fmtDate(day))
      +'<table class="t"><thead><tr><th>'+fsT("Zeit")+'</th><th>'+fsT("Leistung")+'</th><th>'+fsT("Gast")+'</th><th>'+fsT("Ressourcen")+'</th><th>'+fsT("Hinweise")+'</th><th>'+fsT("Status")+'</th></tr></thead><tbody>'+rows+'</tbody></table>'+fsFoot()+'</div>';
    sheetPdf(html, safeFile(translateString("Spa Tagesplan")+" "+day)+".pdf", true, "landscape").catch(opErr(setMsg));
  };
  return (
    <div>
      <BgmHead title={tf("Spa & Freizeit")} intro={tf("Behandlungen, Sauna- und Pool-Zeiten, Kurse, Aktivitäten, Verleih und Sportplätze buchen – mit Therapeut/innen, Räumen und Geräten ohne Doppelbuchung.")} />
      <BgmTabs value={view} onChange={(v)=>{ setView(v); setMsg(null); }} tabs={tabs} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {err && <ErrorText style={{marginBottom:10}}>{err}</ErrorText>}
      {(view==="cal"||view==="mine") && <div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
          <button style={opSmall} aria-label={tf("Vortag")} onClick={()=>setDay(addDaysIso(day,-1))}>‹</button>
          <input className="input" type="date" style={{width:"auto"}} value={day} aria-label={tf("Datum")} onChange={e=>e.target.value && setDay(e.target.value)} />
          <button style={opSmall} aria-label={tf("Folgetag")} onClick={()=>setDay(addDaysIso(day,1))}>›</button>
          {day!==todayIso() && <button style={linkBtn} onClick={()=>setDay(todayIso())}>{tf("Heute")}</button>}
          <span style={{flex:1}} />
          <span style={{fontSize:13,color:INK_MUTED}}>{tf("{0} Buchungen · {1} Gäste", active.length, active.reduce((s,b)=>s+(b.persons||1),0))}</span>
          <button style={opSmall} onClick={printDay}><Icon n="printer" /> {tf("Tagesplan")}</button>
          <button style={opSmall} onClick={()=>setBlock({resource_id:"", day, from:"12:00", to:"13:00", reason:""})}>{tf("Sperrzeit")}</button>
          <button className="btn-primary" disabled={!(services||[]).length} onClick={()=>setForm({service_id:"", day, persons:1, staff_pref:"egal", time:"", guest_name:"", email:"", phone:"", room_no:"", wishes:"", payment:"vor_ort", arrival_guest_id:null})}>{tf("Buchung eintragen")}</button>
        </div>
        {services && services.length===0 && <Card style={{marginBottom:12,background:WARN_SOFT}}><div style={{fontSize:13.5}}>{tf("Noch keine Leistungen angelegt. Unter „Leistungen“ kannst du mit Vorlagen starten.")}</div></Card>}
        {view==="cal" && <SpaCalendar day={day} list={list||[]} resources={(resources||[]).filter(r=>r.kind!=="geraet" && r.active!==false)} blocks={(blocks||[]).filter(b=>b.day===day)} svc={svc} onOpen={setOpen} onDeleteBlock={(b)=>{ if(window.confirm(tf("Sperrzeit entfernen?"))) run(()=>api("/api/booking-blocks/"+b.id,"DELETE")); }} />}
        {view==="mine" && <div>{(list||[]).filter(b=>(b.resource_ids||[]).some(id=>mine.includes(id)) && b.status!=="storniert").map(b=><SpaRow key={b.id} b={b} svc={svc} res={res} onOpen={setOpen} />)}
          {(list||[]).filter(b=>(b.resource_ids||[]).some(id=>mine.includes(id))).length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Termine an diesem Tag.")}</div>}</div>}
        {view==="cal" && (list||[]).length>0 && <div style={{marginTop:14}}><b style={{fontSize:13.5}}>{tf("Liste")}</b>{(list||[]).map(b=><SpaRow key={b.id} b={b} svc={svc} res={res} onOpen={setOpen} />)}</div>}
      </div>}
      {view==="services" && <SpaServices hotel={hotel} api={api} services={services} resources={resources} canEdit={canEdit} run={run} />}
      {view==="resources" && <SpaResources hotel={hotel} api={api} services={services} resources={resources} members={members} canEdit={canEdit} run={run} />}
      {view==="online" && canEdit && <SpaSettings hotel={hotel} api={api} value={settings} onSaved={(s)=>{ setSettings({...settings, ...s}); setMsg({ok:true,text:tf("Gespeichert.")}); }} />}
      {view==="stats" && canEdit && <SpaStats hotel={hotel} api={api} />}
      {form && <SpaBookingForm hotel={hotel} api={api} form={form} setForm={setForm} services={(services||[]).filter(s=>s.active!==false)} onClose={()=>setForm(null)} onSaved={(b)=>{ setForm(null); if(b && b.day!==day) setDay(b.day); setMsg({ok:true,text:tf("Gebucht.")}); reloadAll(); }} />}
      {open && <SpaBookingDetail hotel={hotel} api={api} b={open} svc={svc} res={res} onClose={()=>setOpen(null)} run={run} onMove={(b)=>{ setOpen(null); setForm({...b, time:b.time, move:true}); }} />}
      {block && <Overlay onClose={()=>setBlock(null)} width={420} label={tf("Sperrzeit")}>
        <b>{tf("Sperrzeit")}</b>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Pause, Reinigung oder Abwesenheit – in dieser Zeit ist die Ressource nicht buchbar.")}</div>
        <Field label={tf("Ressource")}><select className="input" value={block.resource_id} onChange={e=>setBlock({...block,resource_id:e.target.value})}><option value="">–</option>{(resources||[]).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0 10px"}}>
          <Field label={tf("Datum")}><input className="input" type="date" value={block.day} onChange={e=>setBlock({...block,day:e.target.value})} /></Field>
          <Field label={tf("von")}><input className="input" type="time" value={block.from} onChange={e=>setBlock({...block,from:e.target.value})} /></Field>
          <Field label={tf("bis")}><input className="input" type="time" value={block.to} onChange={e=>setBlock({...block,to:e.target.value})} /></Field>
        </div>
        <Field label={tf("Grund")}><input className="input" value={block.reason} onChange={e=>setBlock({...block,reason:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!block.resource_id} onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/booking-blocks","POST",block); setBlock(null); }, tf("Gespeichert."))}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setBlock(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
    </div>
  );
}

function SpaRow({b, svc, res, onOpen}){
  const st = SP_STATUS[b.status]||SP_STATUS["bestätigt"], s = svc(b.service_id);
  return <button type="button" onClick={()=>onOpen(b)} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",width:"100%",textAlign:"start",background:"#fff",border:`1px solid ${BORDER}`,borderInlineStart:`4px solid ${s.color||BRASS}`,borderRadius:8,padding:"8px 10px",marginTop:6,cursor:"pointer",opacity:b.status==="storniert"?0.55:1,color:INK,font:"inherit"}}>
    <b style={{minWidth:92}}>{b.time}–{b.end}</b>
    <span style={{flex:1,minWidth:160}}><span data-no-i18n="">{s.name||""}</span> · <span data-no-i18n="">{b.guest_name}</span>{b.persons>1?" · "+tf("{0} Pers.", b.persons):""}{b.room_no?" · "+tf("Zimmer {0}", b.room_no):""}</span>
    <span style={{fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{(b.resource_ids||[]).map(id=>res(id).name).filter(Boolean).join(", ")}</span>
    {b.health_flag && <span title={tf("Gesundheitsfragen mit Hinweis")} style={{color:BAD,fontWeight:700}}>⚠</span>}
    {b.payment==="zimmer" && !b.charged_at && <Pill color={WARN_TEXT} bg={WARN_SOFT}>{tf("Zimmerrechnung offen")}</Pill>}
    <Pill color={st[0]} bg={st[1]}>{tf(st[2])}</Pill>
  </button>;
}

// Tageskalender: Spalten = Personen und Räume, Zeilen = Zeit (1 Minute = 1 Pixel)
function SpaCalendar({day, list, resources, blocks, svc, onOpen, onDeleteBlock}){
  const shown = list.filter(b=>b.status!=="storniert");
  if(!resources.length) return <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Personen oder Räume angelegt (Reiter „Ressourcen“).")}</div>;
  const starts = shown.map(b=>b.start_min).concat(blocks.map(b=>b.start_min)), ends = shown.map(b=>b.end_min).concat(blocks.map(b=>b.end_min));
  const from = Math.min(8*60, ...starts.map(x=>Math.floor(x/60)*60)), to = Math.max(20*60, ...ends.map(x=>Math.ceil(x/60)*60));
  const hours = []; for(let t=from; t<to; t+=60) hours.push(t);
  const colW = 150;
  return (
    <div className="card" style={{padding:0,overflowX:"auto"}} role="region" aria-label={tf("Kalender")}>
      <div style={{display:"grid",gridTemplateColumns:`52px repeat(${resources.length}, minmax(${colW}px, 1fr))`,minWidth:52+resources.length*colW}}>
        <div style={{borderBottom:`1px solid ${BORDER}`}} />
        {resources.map(r=><div key={r.id} style={{padding:"8px 6px",fontWeight:600,fontSize:13,borderBottom:`1px solid ${BORDER}`,borderInlineStart:`1px solid ${BORDER}`}} data-no-i18n="">{r.name}<div style={{fontSize:11,color:INK_MUTED,fontWeight:400}}>{r.kind==="person"?tf("Person"):tf("Raum")}</div></div>)}
        <div style={{position:"relative",height:to-from}}>{hours.map(t=><div key={t} style={{position:"absolute",top:t-from,insetInlineEnd:6,fontSize:11,color:INK_MUTED}}>{spHm(t)}</div>)}</div>
        {resources.map(r=><div key={r.id} style={{position:"relative",height:to-from,borderInlineStart:`1px solid ${BORDER}`,background:`repeating-linear-gradient(to bottom, transparent 0, transparent 59px, ${BORDER} 59px, ${BORDER} 60px)`}}>
          {blocks.filter(b=>b.resource_id===r.id).map(b=><button key={b.id} type="button" onClick={()=>onDeleteBlock(b)} title={tf("Sperrzeit entfernen")} style={{position:"absolute",top:b.start_min-from,height:Math.max(14,b.end_min-b.start_min),insetInlineStart:2,insetInlineEnd:2,background:`repeating-linear-gradient(45deg, ${PAPER}, ${PAPER} 6px, #fff 6px, #fff 12px)`,border:`1px dashed ${BORDER}`,borderRadius:6,fontSize:11,color:INK_MUTED,cursor:"pointer",padding:2,textAlign:"start"}}><span data-no-i18n="">{b.reason||tf("gesperrt")}</span></button>)}
          {shown.filter(b=>(b.resource_ids||[]).includes(r.id)).map(b=>{ const s = svc(b.service_id); return (
            <button key={b.id} type="button" onClick={()=>onOpen(b)} style={{position:"absolute",top:b.start_min-from,height:Math.max(22,b.end_min-b.start_min-2),insetInlineStart:3,insetInlineEnd:3,background:"#fff",border:`1px solid ${s.color||BRASS}`,borderInlineStart:`4px solid ${s.color||BRASS}`,borderRadius:6,padding:"2px 5px",fontSize:11.5,textAlign:"start",overflow:"hidden",cursor:"pointer",color:INK,opacity:b.status==="nicht_erschienen"?0.5:1}}>
              <b>{b.time}</b> <span data-no-i18n="">{b.guest_name}</span>{b.health_flag?" ⚠":""}<div style={{color:INK_MUTED}} data-no-i18n="">{s.name||""}</div>
            </button>); })}
        </div>)}
      </div>
    </div>
  );
}

function SpaBookingForm({hotel, api, form, setForm, services, onClose, onSaved}){
  const [slots,setSlots] = useState(null); const [err,setErr] = useState(""); const [busy,setBusy] = useState(false);
  const [guests,setGuests] = useState(null); const [q,setQ] = useState(""); const [health,setHealth] = useState(null);
  const s = services.find(x=>x.id===form.service_id);
  useEffect(()=>{ setSlots(null); if(!form.service_id || !form.day) return;
    api("/api/hotels/"+hotel.id+"/booking-slots?service="+form.service_id+"&day="+form.day+"&persons="+(form.persons||1)+"&pref="+(form.staff_pref||"egal")+(form.move&&form.id?"&ignore="+form.id:"")).then(setSlots).catch(e=>{ setErr(e.message); setSlots([]); });
  },[form.service_id, form.day, form.persons, form.staff_pref]);
  useEffect(()=>{ if(form.move) return; api("/api/hotels/"+hotel.id+"/arrivals?from="+addDaysIso(form.day,-30)+"&to="+form.day).then(l=>setGuests((Array.isArray(l)?l:[]).filter(g=>g.arrival_date<=form.day && (!g.departure_date || g.departure_date>=form.day)))).catch(()=>setGuests([])); },[form.day]);
  const save = async (force) => {
    setErr(""); setBusy(true);
    try {
      let b;
      if(form.move) b = await api("/api/bookings/"+form.id,"PATCH",{day:form.day, time:form.time, persons:form.persons, service_id:form.service_id, staff_pref:form.staff_pref, force_time:!!force});
      else {
        b = await api("/api/hotels/"+hotel.id+"/bookings","POST",{...form, force_time:!!force});
        if(health && health.consent && s && s.health_form) await api("/api/bookings/"+b.id+"/health","PUT",{consent:true, answers:health.answers}).catch(e=>{ throw new Error(tf("Gebucht, aber die Gesundheitsfragen wurden nicht gespeichert: {0}", e.message)); });
      }
      onSaved(b);
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };
  const fit = (guests||[]).filter(g=>!q.trim() || (g.guest_name+" "+(g.assigned_room||"")).toLowerCase().includes(q.trim().toLowerCase())).slice(0,6);
  return (
    <Overlay onClose={onClose} width={620} label={form.move ? tf("Buchung verschieben") : tf("Buchung eintragen")}>
      <b>{form.move ? tf("Buchung verschieben") : tf("Buchung eintragen")}</b>
      <Field label={tf("Leistung")}><select className="input" value={form.service_id} onChange={e=>setForm({...form,service_id:e.target.value,time:""})}>
        <option value="">–</option>{SP_CAT.map(([k,l])=>{ const g = services.filter(x=>x.category===k); return g.length ? <optgroup key={k} label={translateString(l)}>{g.map(x=><option key={x.id} value={x.id}>{x.name} · {x.duration_min} {tf("Min.")}</option>)}</optgroup> : null; })}
      </select></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0 10px"}}>
        <Field label={tf("Datum")}><input className="input" type="date" value={form.day} onChange={e=>setForm({...form,day:e.target.value,time:""})} /></Field>
        <Field label={s && s.category==="verleih" ? tf("Anzahl") : tf("Personen")}><input className="input" type="number" min={1} max={500} value={form.persons} onChange={e=>setForm({...form,persons:e.target.value,time:""})} /></Field>
        <Field label={tf("Wunsch")}><select className="input" value={form.staff_pref} onChange={e=>setForm({...form,staff_pref:e.target.value,time:""})}><option value="egal">{tf("egal")}</option><option value="w">{tf("Therapeutin")}</option><option value="m">{tf("Therapeut")}</option></select></Field>
      </div>
      {form.service_id && <div style={{marginBottom:10}}>
        <div className="field-label">{tf("Freie Zeiten")}</div>
        {slots===null && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt …")}</div>}
        {slots && slots.length===0 && <div style={{fontSize:13,color:WARN_TEXT}}>{tf("An diesem Tag ist nichts frei.")}</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}} role="group" aria-label={tf("Freie Zeiten")}>{(slots||[]).map(x=><button key={x.time} type="button" aria-pressed={form.time===x.time} style={{...opSmall,minHeight:40,background:form.time===x.time?INK:"#fff",color:form.time===x.time?"#fff":INK}} onClick={()=>setForm({...form,time:x.time})}>{x.time}{x.left>1 && s && (s.capacity>1||s.gear_id) ? " ("+x.left+")" : ""}</button>)}</div>
        <details style={{marginTop:6}}><summary style={{fontSize:12.5,color:INK_MUTED,cursor:"pointer"}}>{tf("Andere Uhrzeit (außerhalb der Öffnungszeit)")}</summary>
          <input className="input" type="time" step={300} style={{width:130,marginTop:6}} aria-label={tf("Uhrzeit")} value={form.time} onChange={e=>setForm({...form,time:e.target.value,force:true})} /></details>
      </div>}
      {!form.move && <>
        {guests && guests.length>0 && <div style={{marginBottom:8}}>
          <div className="field-label">{tf("Hausgast übernehmen")}</div>
          <input className="input" placeholder={tf("Name oder Zimmer suchen")} aria-label={tf("Hausgast suchen")} value={q} onChange={e=>setQ(e.target.value)} />
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>{fit.map(g=><button key={g.id} type="button" style={{...opSmall,minHeight:36}} onClick={()=>setForm({...form, guest_name:g.guest_name, email:g.email||"", room_no:g.assigned_room||"", arrival_guest_id:g.id, payment:"zimmer"})}><span data-no-i18n="">{g.guest_name}</span>{g.assigned_room?" · "+g.assigned_room:""}</button>)}</div>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name")}><input className="input" value={form.guest_name} onChange={e=>setForm({...form,guest_name:e.target.value})} /></Field>
          <Field label={tf("Zimmer")}><input className="input" value={form.room_no} onChange={e=>setForm({...form,room_no:e.target.value})} /></Field>
          <Field label={tf("Telefon")}><input className="input" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
          <Field label={tf("E-Mail")}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
          <Field label={tf("Bezahlung")}><select className="input" value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}>{SP_PAY.filter(p=>p[0]!=="online").map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
        </div>
        <Field label={tf("Wünsche und Hinweise")}><textarea className="input" rows={2} value={form.wishes} onChange={e=>setForm({...form,wishes:e.target.value})} /></Field>
        {s && s.health_form && spaSeesHealth() && <SpaHealthForm value={health} onChange={setHealth} />}
      </>}
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn-primary" disabled={busy || !form.service_id || !form.time || (!form.move && !String(form.guest_name).trim())} onClick={()=>save(!!form.force)}>{form.move ? tf("Verschieben") : tf("Buchen")}</button>
        <button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button>
      </div>
    </Overlay>
  );
}

// Gesundheitsangaben speichern und sehen nur Admin, Gesamtleitung und Spa & Wellness (wie die Datenbank)
const spaSeesHealth = () => ACCESS.role==="admin" || (ACCESS.role==="manager" && !(ACCESS.depts||[]).length) || (ACCESS.depts||[]).includes("Spa & Wellness");
function SpaHealthForm({value, onChange}){
  const v = value || {answers:{}, consent:false};
  const set = (k, x) => onChange({...v, answers:{...v.answers, [k]:x}});
  return <fieldset style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 10px",margin:"0 0 10px"}}>
    <legend className="field-label" style={{padding:"0 4px"}}>{tf("Gesundheitsfragen (nur Spa & Wellness sieht die Antworten)")}</legend>
    {SP_HEALTH.map(([k,l])=><label key={k} style={{display:"flex",gap:8,alignItems:"center",fontSize:13,minHeight:32}}><input type="checkbox" checked={!!v.answers[k]} onChange={e=>set(k, e.target.checked)} /> {tf(l)}</label>)}
    <Field label={tf("Weitere Hinweise")}><input className="input" value={v.answers.note||""} onChange={e=>set("note", e.target.value)} /></Field>
    <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12.5}}><input type="checkbox" style={{marginTop:3}} checked={!!v.consent} onChange={e=>onChange({...v, consent:e.target.checked})} /> {tf("Der Gast willigt ein, dass diese Gesundheitsangaben für die Behandlung gespeichert werden (Löschung 30 Tage nach dem Termin).")}</label>
  </fieldset>;
}

function SpaBookingDetail({hotel, api, b, svc, res, onClose, run, onMove}){
  const [health,setHealth] = useState(undefined); const s = svc(b.service_id), st = SP_STATUS[b.status]||SP_STATUS["bestätigt"];
  const money = moneyOf(hotel);
  useEffect(()=>{ if(b.health_flag || (s && s.health_form)) api("/api/bookings/"+b.id+"/health").then(setHealth).catch(()=>setHealth(null)); },[b.id]);
  const set = async (patch, ok) => { if(await run(()=>api("/api/bookings/"+b.id,"PATCH",patch), ok)) onClose(); };
  const act = ["angefragt","bestätigt","angekommen"].includes(b.status);
  return (
    <Overlay onClose={onClose} width={520} label={tf("Buchung")}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><b style={{flex:1}} data-no-i18n="">{s.name||""}</b><Pill color={st[0]} bg={st[1]}>{tf(st[2])}</Pill></div>
      <div style={{fontSize:14,margin:"8px 0"}}>{fmtDate(b.day)} · <b>{b.time}–{b.end}</b>{b.persons>1 ? " · "+tf("{0} Pers.", b.persons) : ""}</div>
      <div style={{fontSize:13.5,lineHeight:1.6}}>
        <div><span data-no-i18n="">{b.guest_name}</span>{b.room_no ? " · "+tf("Zimmer {0}", b.room_no) : ""}</div>
        {(b.phone||b.email) && <div>{b.phone && <a href={"tel:"+b.phone.replace(/\s/g,"")}>{b.phone}</a>} {b.email && <a href={"mailto:"+b.email}>{b.email}</a>}</div>}
        <div style={{color:INK_MUTED}} data-no-i18n="">{(b.resource_ids||[]).map(id=>res(id).name).filter(Boolean).join(", ")}</div>
        {b.wishes && <div data-no-i18n="">„{b.wishes}“</div>}
        <div>{tf("Preis")}: {b.price==null ? "–" : money(b.price)} · {tf((SP_PAY.find(p=>p[0]===b.payment)||[0,b.payment])[1])}{b.deposit ? " · "+tf("Anzahlung {0}", money(b.deposit))+(b.deposit_paid_at?" ✓":"") : ""}{b.paid ? " · "+tf("bezahlt") : ""}</div>
        {b.source!=="intern" && <div style={{color:INK_MUTED}}>{b.source==="gast" ? tf("vom Gast im Zimmer gebucht") : tf("online gebucht")}</div>}
      </div>
      {health && <div style={{marginTop:8,padding:8,borderRadius:8,background:b.health_flag?BAD_SOFT:PAPER,fontSize:13}}>
        <b>{tf("Gesundheitsfragen")}</b> <span style={{color:INK_MUTED}}>({tf("Einwilligung {0}", fmtDate(health.consent_at))})</span>
        <div>{SP_HEALTH.filter(([k])=>health.answers && health.answers[k]).map(([k,l])=>tf(l)).join(" · ") || tf("Keine Auffälligkeiten angegeben.")}</div>
        {health.answers && health.answers.note && <div data-no-i18n="">{health.answers.note}</div>}
      </div>}
      {b.health_flag && health===null && <div style={{marginTop:8,fontSize:13,color:BAD}}>⚠ {tf("Gesundheitsfragen mit Hinweis – Details sieht Spa & Wellness.")}</div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>
        {b.status==="angefragt" && <button className="btn-primary" onClick={()=>set({status:"bestätigt"}, tf("Bestätigt."))}>{tf("Bestätigen")}</button>}
        {b.status==="bestätigt" && <button className="btn-primary" onClick={()=>set({status:"angekommen"})}>{tf("Gast ist da")}</button>}
        {(b.status==="bestätigt"||b.status==="angekommen") && <button style={btnLine} onClick={()=>set({status:"erledigt"})}>{tf("Erledigt")}</button>}
        {b.status==="bestätigt" && <button style={btnLine} onClick={()=>set({status:"nicht_erschienen"})}>{tf("Nicht erschienen")}</button>}
        {act && <button style={btnLine} onClick={()=>onMove(b)}>{tf("Verschieben")}</button>}
        {b.payment==="zimmer" && <button style={btnLine} onClick={()=>set({charged:!b.charged_at}, b.charged_at ? null : tf("Als auf die Zimmerrechnung gebucht markiert."))}>{b.charged_at ? tf("Zimmerrechnung zurücknehmen") : tf("Auf Zimmerrechnung gebucht")}</button>}
        {b.payment!=="zimmer" && !b.paid && b.status!=="storniert" && <button style={btnLine} onClick={()=>set({paid:true}, tf("Als bezahlt markiert."))}>{tf("Bezahlt")}</button>}
        {act && <button style={{...btnLine,color:BAD}} onClick={()=>{ const r = window.confirm(tf("Buchung stornieren?")); if(r) set({status:"storniert", cancel_reason:"vom Hotel storniert"}, tf("Storniert.")); }}>{tf("Stornieren")}</button>}
        <button style={btnLine} onClick={onClose}>{tf("Schließen")}</button>
      </div>
    </Overlay>
  );
}

// „Rezeption heute“: Spa- und Freizeitbuchungen des Tages, offene Zimmerrechnungen
function SpaTodayCard({hotel, api, onOpen}){
  const [list,setList] = useState(null); const [svc,setSvc] = useState([]);
  useEffect(()=>{ const d = todayIso();
    api("/api/hotels/"+hotel.id+"/bookings?from="+d+"&to="+d).then(setList).catch(()=>setList(false));
    api("/api/hotels/"+hotel.id+"/booking-services").then(l=>setSvc(Array.isArray(l)?l:[])).catch(()=>{}); },[api, hotel.id]);
  if(!list || !list.length) return null;
  const act = list.filter(b=>["angefragt","bestätigt","angekommen"].includes(b.status)), open = list.filter(b=>b.payment==="zimmer" && !b.charged_at && b.status!=="storniert");
  const name = (id) => ((svc.find(s=>s.id===id)||{}).name||"");
  return <Card style={{marginBottom:14}}>
    <div style={{display:"flex",gap:8,alignItems:"center"}}><b style={{flex:1}}>{tf("Spa & Freizeit heute")}</b><button style={linkBtn} onClick={()=>onOpen("spa")}>{tf("Öffnen")}</button></div>
    <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 6px"}}>{tf("{0} Buchungen · {1} offen für die Zimmerrechnung", act.length, open.length)}</div>
    {open.slice(0,8).map(b=><div key={b.id} style={{fontSize:13,padding:"3px 0",borderTop:`1px solid ${BORDER}`}}>{b.time} · <span data-no-i18n="">{name(b.service_id)}</span> · <span data-no-i18n="">{b.guest_name}</span>{b.room_no?" · "+tf("Zimmer {0}", b.room_no):""}{b.price!=null?" · "+moneyOf(hotel)(b.price):""}</div>)}
  </Card>;
}
