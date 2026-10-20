// ------------------------------------------------------------ Zimmerstatus
const ROOM_STATUS = ["Schmutzig","In Reinigung","Sauber","Kontrolliert","Außer Betrieb"];
const ROOM_OCC = ["Unbelegt","Belegt","Abreise","Anreise"];
const ROOM_STYLE = {"Schmutzig":{bg:BAD_SOFT,fg:BAD}, "In Reinigung":{bg:WARN_SOFT,fg:WARN}, "Sauber":{bg:"#E3ECF5",fg:"#2D5B87"}, "Kontrolliert":{bg:GOOD_SOFT,fg:GOOD}, "Außer Betrieb":{bg:"#E5E7EB",fg:"#4B5563"}};
const roomLocation = (n) => tf("Zimmer {0}", n);

function RoomsView({hotel, api, me, members, role, myDepts, onReport}){
  const visible = visibleDeptsFor(role, myDepts);
  const canEdit = role!=="viewer" && (visible.includes("Housekeeping") || visible.includes("Rezeption & Empfang"));
  const canSetup = canManageDept("Housekeeping") || canManageDept("Rezeption & Empfang");
  const [rooms,setRooms] = useState(null);
  const [tickets,setTickets] = useState([]);
  const [filter,setFilter] = useState("");
  const [floor,setFloor] = useState("");
  const [mine,setMine] = useState(false);
  const [sel,setSel] = useState(null);
  const [numbers,setNumbers] = useState("");
  const [rtype,setRtype] = useState("");
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(async()=>{
    try { setRooms(await api(base+"/rooms")); } catch(e){ setMsg({ok:false,text:e.message}); setRooms([]); }
    api(base+"/tickets?status=open").then(setTickets).catch(()=>setTickets([]));
  },[api, base]);
  useEffect(()=>{ load(); },[load]);
  const patch = (r, changes) => {
    setRooms(rs=>rs.map(x=>x.id===r.id ? {...x, ...changes, updated_by:me&&me.id, updated_at:new Date().toISOString()} : x));
    api("/api/rooms/"+r.id,"PATCH",changes).catch(e=>{ setMsg({ok:false,text:e.message}); load(); });
  };
  const bulk = async (ids, changes, label) => {
    if(!ids.length) return;
    setMsg(null);
    try { const r = await api(base+"/rooms/bulk","POST",{ids, ...changes}); setMsg({ok:true,text:tf("{0} Zimmer geändert.", r.updated)}); await load(); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const create = async () => {
    setMsg(null);
    try { const r = await api(base+"/rooms","POST",{numbers, room_type:rtype}); setMsg({ok:true,text:tf("{0} Zimmer angelegt.", r.created)+(r.skipped?" "+tf("{0} gab es schon.", r.skipped):"")}); setNumbers(""); await load(); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  if(rooms===null) return <div style={{color:INK_MUTED}}>…</div>;
  const floors = [...new Set(rooms.map(r=>r.floor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const ticketsFor = (n) => tickets.filter(t=>t.location && new RegExp("(^|\\D)"+String(n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|\\D)").test(t.location));
  const shown = rooms.filter(r=>(!filter || r.status===filter || r.occupancy===filter) && (!floor || r.floor===floor) && (!mine || (me && r.assigned_to===me.id)));
  const count = (k) => rooms.filter(r=>r.status===k || r.occupancy===k).length;
  const cur = sel && rooms.find(r=>r.id===sel);
  const hkMembers = members.filter(m=>m.role!=="viewer" && ((m.departments||[]).includes("Housekeeping") || m.role==="admin"));
  const chip = (k, st) => (
    <button key={k} onClick={()=>setFilter(filter===k?"":k)} style={{border:`1px solid ${filter===k?INK:(st?st.fg+"55":BORDER)}`,background:st?st.bg:"#fff",color:st?st.fg:INK,borderRadius:999,padding:"5px 11px",fontSize:12.5,cursor:"pointer",fontWeight:filter===k?700:500,whiteSpace:"nowrap"}}>
      {k} <b data-no-i18n="">{count(k)}</b>
    </button>
  );
  return (
    <div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {role==="admin" && <PmsCard hotel={hotel} api={api} onSynced={load} />}
      {role==="admin" && <GuestQrCard hotel={hotel} api={api} />}
      {canSetup && (
        <Card style={{marginBottom:14,borderColor:rooms.length?BORDER:BRASS}}>
          <div style={{fontWeight:700,marginBottom:4}}>{rooms.length ? tf("Zimmer hinzufügen") : tf("Zimmer anlegen")}</div>
          {!rooms.length && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Zimmernummern einzeln oder als Bereich eingeben – das Stockwerk wird aus der Nummer erkannt.")}</div>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input className="input" style={{flex:2,minWidth:200}} value={numbers} onChange={e=>setNumbers(e.target.value)} placeholder={tf("z. B. 101-120, 201-220, Suite 1")} />
            <input className="input" style={{flex:1,minWidth:120}} value={rtype} onChange={e=>setRtype(e.target.value)} placeholder={tf("Zimmertyp (optional)")} />
            <button className="btn-primary" disabled={!numbers.trim()} onClick={create}>{tf("Anlegen")}</button>
          </div>
        </Card>
      )}
      {rooms.length===0 ? (!canSetup && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Zimmer angelegt. Das macht die Leitung von Housekeeping oder Rezeption.")}</div></Card>) : (
        <React.Fragment>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{ROOM_STATUS.map(k=>chip(k, ROOM_STYLE[k]))}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
            {ROOM_OCC.slice(1).map(k=>chip(k, null))}
            {floors.length>1 && <select className="input" style={{width:"auto",padding:"5px 8px"}} value={floor} onChange={e=>setFloor(e.target.value)}><option value="">{tf("Alle Stockwerke")}</option>{floors.map(f=><option key={f} value={f}>{tf("Stock {0}", f)}</option>)}</select>}
            <label style={{fontSize:12.5,color:INK_MUTED,display:"flex",gap:5,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)} /> {tf("Nur meine Zimmer")}</label>
            <span style={{flex:1}}></span>
            {canManageDept("Housekeeping") && <RoomAssignCard hotel={hotel} api={api} members={members} onDone={load} />}
            <RoomCreditsCard hotel={hotel} api={api} rooms={rooms} onDone={load} />
            {canEdit && <RoomImportButton hotel={hotel} api={api} onDone={load} onMsg={setMsg} />}
            {canEdit && <button style={smallBtn} onClick={()=>{ const ids = rooms.filter(r=>r.occupancy==="Abreise" && r.status!=="Schmutzig" && r.status!=="Außer Betrieb").map(r=>r.id); if(!ids.length){ setMsg({ok:true,text:tf("Keine Abreisen offen.")}); return; } bulk(ids,{status:"Schmutzig"}); }}>{tf("Abreisen → Schmutzig")}</button>}
            {canEdit && <button style={smallBtn} onClick={()=>{ const ids = rooms.filter(r=>r.occupancy==="Belegt" && (r.status==="Sauber"||r.status==="Kontrolliert")).map(r=>r.id); if(!ids.length) return; if(window.confirm(tf("Neuer Tag: alle belegten Zimmer auf „Schmutzig“ setzen?"))) bulk(ids,{status:"Schmutzig"}); }}>{tf("Neuer Tag")}</button>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(84px, 1fr))",gap:7}}>
            {shown.map(r=>{ const st = ROOM_STYLE[r.status] || ROOM_STYLE["Schmutzig"]; const tk = ticketsFor(r.number).length; return (
              <button key={r.id} onClick={()=>setSel(r.id)} style={{background:st.bg,color:st.fg,border:`1px solid ${sel===r.id?INK:st.fg+"40"}`,borderRadius:8,padding:"8px 6px",cursor:"pointer",textAlign:"center",position:"relative",minHeight:70}}>
                <div style={{fontSize:18,fontWeight:700,fontFamily:"Fraunces, serif"}} data-no-i18n="">{r.number}</div>
                <div style={{fontSize:10.5,lineHeight:1.2,marginTop:2}}>{r.status}</div>
                {r.occupancy!=="Unbelegt" && <div style={{fontSize:10,lineHeight:1.2,color:INK,opacity:.7}}>{r.occupancy}</div>}
                {r.assigned_to && <div data-no-i18n="" style={{position:"absolute",top:4,insetInlineStart:5,fontSize:9.5,fontWeight:700,color:INK,opacity:.65}}>{memberLabel(members, me, r.assigned_to).slice(0,3).toUpperCase()}</div>}
                {(r.note || tk>0) && <div style={{position:"absolute",top:4,insetInlineEnd:5,fontSize:10,fontWeight:700,color:tk?BAD:INK}}>{tk ? "🔧" : "✎"}</div>}
              </button>
            ); })}
          </div>
        </React.Fragment>
      )}
      {cur && (
        <div className="no-print" style={{position:"fixed",insetInlineStart:0,insetInlineEnd:0,bottom:0,zIndex:60,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{background:"#fff",borderTop:`3px solid ${(ROOM_STYLE[cur.status]||{}).fg||BRASS}`,boxShadow:"0 -12px 40px rgba(28,36,48,.22)",borderRadius:"12px 12px 0 0",padding:"14px 16px 18px",width:"100%",maxWidth:620,maxHeight:"75vh",overflowY:"auto",pointerEvents:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{fontFamily:"Fraunces, serif",fontSize:20,fontWeight:600,flex:1}}>{roomLocation(cur.number)}<span style={{fontSize:13,color:INK_MUTED,fontFamily:"Inter, sans-serif",fontWeight:400}} data-no-i18n="">{cur.room_type ? " · "+cur.room_type : ""}</span></div>
              <button style={{...linkBtn,fontSize:20}} onClick={()=>setSel(null)} aria-label={tf("Schließen")}>✕</button>
            </div>
            <div className="field-label">{tf("Status")}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {ROOM_STATUS.map(k=>{ const st = ROOM_STYLE[k]; const on = cur.status===k; return <button key={k} disabled={!canEdit} onClick={()=>patch(cur,{status:k})} style={{border:`2px solid ${on?st.fg:"transparent"}`,background:st.bg,color:st.fg,borderRadius:8,padding:"9px 12px",fontSize:13,fontWeight:on?700:500,cursor:canEdit?"pointer":"default",flex:"1 1 30%"}}>{k}</button>; })}
            </div>
            <div className="field-label">{tf("Belegung")}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {ROOM_OCC.map(k=><button key={k} disabled={!canEdit} onClick={()=>patch(cur,{occupancy:k})} style={{border:`1px solid ${cur.occupancy===k?INK:BORDER}`,background:cur.occupancy===k?INK:"#fff",color:cur.occupancy===k?"#fff":INK,borderRadius:999,padding:"6px 12px",fontSize:12.5,cursor:canEdit?"pointer":"default"}}>{k}</button>)}
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
              <label style={{flex:1,minWidth:160}}><div className="field-label">{tf("Zugeteilt an")}</div>
                <select className="input" disabled={!canEdit} value={cur.assigned_to||""} onChange={e=>patch(cur,{assigned_to:e.target.value||null})}><option value="">–</option>{hkMembers.map(m=><option key={m.user_id} value={m.user_id}>{shortName(m.email)}</option>)}</select></label>
              <label style={{flex:2,minWidth:200}}><div className="field-label">{tf("Notiz")}</div>
                <input className="input" disabled={!canEdit} key={cur.id} defaultValue={cur.note||""} placeholder={tf("z. B. Babybett, Late Check-out 14 Uhr")} onBlur={e=>{ if((e.target.value||"")!==(cur.note||"")) patch(cur,{note:e.target.value}); }} /></label>
            </div>
            {ticketsFor(cur.number).map(t=><div key={t.id} style={{fontSize:13,color:BAD,marginBottom:4}}>🔧 <span data-no-i18n="">{t.title}</span> · <span>{t.status}</span></div>)}
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:6}}>
              {role!=="viewer" && <button style={smallBtn} onClick={()=>{ setSel(null); onReport(roomLocation(cur.number)); }}>🔧 {tf("Mangel melden")}</button>}
              <span style={{flex:1}}></span>
              {cur.updated_by && <span style={{fontSize:11.5,color:INK_MUTED}} data-no-i18n="">{memberLabel(members, me, cur.updated_by)} · {fmtClock(cur.updated_at)}</span>}
              {canSetup && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Zimmer {0} löschen?", cur.number))) { setSel(null); api("/api/rooms/"+cur.id,"DELETE").then(load).catch(e=>setMsg({ok:false,text:e.message})); } }}>{tf("Löschen")}</button>}
            </div>
          </div>
        </div>
      )}
      {cur && <div style={{height:300}}></div>}
    </div>
  );
}

// ------------------------------------------------------------ Technik-Meldungen
const TICKET_STATUS = ["Offen","In Arbeit","Prüfen","Erledigt"];
const TICKET_STYLE = {"Offen":{color:WARN,bg:WARN_SOFT}, "In Arbeit":{color:"#2D5B87",bg:"#E3ECF5"}, "Prüfen":{color:"#6B4BA1",bg:"#EEE7F7"}, "Erledigt":{color:GOOD,bg:GOOD_SOFT}};
const TICKET_DEPTS = ["Technik","IT & Systeme","Housekeeping","Sicherheit","Food & Beverage","Rezeption & Empfang"];

function TicketsView({hotel, api, me, members, role, myDepts, prefill, onPrefillUsed}){
  const visible = visibleDeptsFor(role, myDepts);
  const [section,setSection] = useState("defects"); // defects | wishes | plans
  const canPlans = TICKET_DEPTS.some(d=>canManageDept(d));
  const [list,setList] = useState(null);
  const [filter,setFilter] = useState("open");
  const [onlyMine,setOnlyMine] = useState(false);
  const [form,setForm] = useState(null);
  const [photos,setPhotos] = useState({});
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(async()=>{
    try { setList(await api(base+"/tickets?status="+filter)); } catch(e){ setMsg({ok:false,text:e.message}); setList([]); }
  },[api, base, filter]);
  useEffect(()=>{ load(); },[load]);
  const [contractors,setContractors] = useState([]);
  useEffect(()=>{ if(section==="snags" && role!=="member") api("/api/hotels/"+hotel.id+"/contractors").then(setContractors).catch(()=>setContractors([])); },[section]);
  const emptyForm = (loc) => section==="snags" ? {location:loc||"", title:"", description:"", priority:"Normal", department:"Technik", photo:null, kind:"Baumangel", contractor_id:""}
    : section==="wishes" ? {location:loc||"", title:"", description:"", priority:"Normal", department:"Housekeeping", photo:null, kind:"Gästewunsch"}
    : {location:loc||"", title:"", description:"", priority:"Normal", department:"Technik", photo:null, kind:"Mangel"};
  useEffect(()=>{ if(prefill){ setForm(emptyForm(prefill)); if(onPrefillUsed) onPrefillUsed(); window.scrollTo(0,0); } },[prefill]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const pickPhoto = async (file) => { if(!file) return; try { const d = await compressImage(file, 1280, 0.72); setForm(f=>({...f, photo:d})); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      await api(base+"/tickets","POST",{location:form.location, title:form.title, description:form.description, priority:form.priority, department:form.department, photo_data:form.photo||undefined, kind:form.kind, contractor_id:form.contractor_id||undefined, due_on:form.due_on||undefined});
      setForm(null); setMsg({ok:true,text:tf("Danke – die Meldung ist bei der zuständigen Abteilung.")}); await load();
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false);
  };
  const showPhoto = async (t) => { if(photos[t.id]) { setPhotos(p=>({...p,[t.id]:null})); return; } try { const r = await api("/api/tickets/"+t.id+"/photo"); setPhotos(p=>({...p,[t.id]:r.photo_data})); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const shown = (list||[]).filter(t=>(section==="wishes" ? t.kind==="Gästewunsch" : section==="snags" ? t.kind==="Baumangel" : t.kind!=="Gästewunsch" && t.kind!=="Baumangel") && (!onlyMine || (me && (t.reporter_id===me.id || t.assignee_id===me.id))));
  const T = useTranslated(api, shown.flatMap(t=>[t.title, t.description||""]));
  const canWork = (t) => visible.includes(t.department) || (me && t.assignee_id===me.id);
  const sections = [["defects","Mängel"],["wishes","Gästewünsche"], ...(preOpeningOff(hotel) ? [] : [["snags","Baumängel"]]), ...(canPlans ? [["plans","Wartungsplan"]] : [])];
  const tabs = (
    <div className="no-print" style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {sections.map(([k,l])=><button key={k} onClick={()=>{ setSection(k); setForm(null); }} style={{border:`1px solid ${section===k?INK:BORDER}`,background:section===k?INK:"#fff",color:section===k?"#fff":INK,borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:section===k?700:500}}>{tf(l)}</button>)}
    </div>
  );
  if(section==="plans") return <div>{tabs}<MaintenancePlans hotel={hotel} api={api} role={role} myDepts={myDepts} members={members} me={me} /></div>;
  return (
    <div>
      {tabs}
      {section==="snags" && (role==="admin"||role==="manager") && <ContractorsCard hotel={hotel} api={api} />}
      {section==="snags" && role!=="member" && <SnagReportButton hotel={hotel} api={api} contractors={contractors} members={members} me={me} />}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {role!=="member" && list && list.length>0 && <button style={{...smallBtn,marginBottom:14,marginInlineEnd:8}} onClick={async()=>{
        try {
          const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
          const rows = list.map(t=>({[tf("Erfasst")]: fmtDateTime(t.created_at), [tf("Art")]: translateString(t.kind||""), [tf("Wo?")]: t.location||"", [tf("Titel")]: t.title,
            [tf("Details")]: t.description||"", [tf("Abteilung")]: translateString(t.department||""), [tf("Dringlichkeit")]: translateString(t.priority||""), [tf("Status")]: translateString(t.status||""),
            [tf("Frist")]: t.due_on ? fmtDate(t.due_on) : "", [tf("Erledigt")]: t.done_at ? fmtDateTime(t.done_at) : ""}));
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), tf("Meldungen").slice(0,31));
          XLSX.writeFile(wb, (tf("Meldungen")+" "+hotel.name+" "+todayIso()).replace(/[\/:*?"<>|]+/g,"")+".xlsx");
        } catch(e){ setMsg({ok:false, text:tf("Export fehlgeschlagen: {0}", e.message)}); }
      }}>Excel</button>}
      {role!=="viewer" && !form && <button className="btn-primary" style={{marginBottom:14,padding:"11px 18px"}} onClick={()=>setForm(emptyForm(""))}>{section==="wishes" ? "🛎 "+tf("Gästewunsch erfassen") : section==="snags" ? "🔨 "+tf("Baumangel erfassen") : "🔧 "+tf("Mangel melden")}</button>}
      {form && (
        <Card style={{marginBottom:16,borderColor:BRASS}}>
          <div style={{fontWeight:700,marginBottom:10}}>{form.kind==="Gästewunsch" ? tf("Gästewunsch erfassen") : form.kind==="Baumangel" ? tf("Baumangel erfassen") : tf("Mangel melden")}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <label style={{flex:1,minWidth:150}}><div className="field-label">{tf("Wo?")}</div><input className="input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder={form.kind==="Gästewunsch" ? tf("z. B. Zimmer 305") : tf("z. B. Zimmer 214, Lobby, Küche")} /></label>
            <label style={{flex:2,minWidth:200}}><div className="field-label">{form.kind==="Gästewunsch" ? tf("Was wünscht der Gast?") : tf("Was ist kaputt?")}</div><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder={form.kind==="Gästewunsch" ? tf("z. B. Extra-Handtücher, Babybett, Wecker 6 Uhr") : tf("z. B. Licht im Bad flackert")} /></label>
          </div>
          <Field label={tf("Details (optional)")}><div style={{display:"flex",gap:6}}><textarea className="input" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{fontFamily:"inherit",resize:"vertical",flex:1}} /><MicButton onText={(x)=>setForm(f=>({...f, description:appendText(f.description,x)}))} /></div></Field>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
            <div><div className="field-label">{tf("Dringlichkeit")}</div>
              <div style={{display:"flex",gap:6}}>{["Normal","Dringend"].map(p=><button key={p} onClick={()=>setForm({...form,priority:p})} style={{border:`1px solid ${form.priority===p?(p==="Dringend"?BAD:INK):BORDER}`,background:form.priority===p?(p==="Dringend"?BAD_SOFT:PAPER):"#fff",color:p==="Dringend"&&form.priority===p?BAD:INK,fontWeight:form.priority===p?700:400,borderRadius:999,padding:"7px 14px",fontSize:13,cursor:"pointer"}}>{p}</button>)}</div></div>
            <label style={{minWidth:170}}><div className="field-label">{tf("Zuständig")}</div><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{TICKET_DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            {form.kind==="Baumangel" && <label><div className="field-label">{tf("Frist")}</div><input className="input" type="date" value={form.due_on||""} onChange={e=>setForm({...form,due_on:e.target.value})} /></label>}
            {form.kind==="Baumangel" && contractors.length>0 && <label style={{minWidth:170}}><div className="field-label">{tf("Firma")}</div><select className="input" value={form.contractor_id} onChange={e=>setForm({...form,contractor_id:e.target.value})}><option value="">–</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
            <label style={{...smallBtn,display:"inline-flex",alignItems:"center",gap:6,padding:"9px 13px"}}>📷 {form.photo ? tf("Anderes Foto") : tf("Foto aufnehmen")}
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>pickPhoto(e.target.files[0])} /></label>
            {form.photo && <img src={form.photo} alt="" style={{height:56,borderRadius:6,border:`1px solid ${BORDER}`}} />}
            {form.photo && <button style={linkBtn} onClick={()=>setForm({...form,photo:null})}>{tf("Entfernen")}</button>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-primary" disabled={busy || !form.title.trim()} onClick={submit}>{busy ? "…" : tf("Meldung senden")}</button>
            <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          </div>
        </Card>
      )}
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
        {[["open","Offen"],["done","Erledigt"],["all","Alle"]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{border:`1px solid ${filter===k?INK:BORDER}`,background:filter===k?INK:"#fff",color:filter===k?"#fff":INK,borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer"}}>{l}</button>)}
        <label style={{fontSize:12.5,color:INK_MUTED,display:"flex",gap:5,alignItems:"center",marginInlineStart:8,cursor:"pointer"}}><input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)} /> {tf("Nur meine")}</label>
        <span style={{flex:1}}></span><TranslateToggle t={T} />
      </div>
      {list===null ? <div style={{color:INK_MUTED}}>…</div> : shown.length===0 ? <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{filter==="open" ? tf("Keine offenen Meldungen.") : tf("Noch keine Meldungen.")}</div></Card> : shown.map(t=>{
        const st = TICKET_STYLE[t.status];
        return (
          <Card key={t.id} style={{marginBottom:10,padding:"12px 14px",borderInlineStart:t.priority==="Dringend" && t.status!=="Erledigt" ? `4px solid ${BAD}` : undefined}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
              {t.priority==="Dringend" && <Pill color={BAD} bg={BAD_SOFT}>Dringend</Pill>}
              {t.kind==="Wartung" && <Pill color={BRASS} bg={BRASS_SOFT}>Wartung</Pill>}
              {t.via_guest && <Pill color="#6B4BA1" bg="#EEE7F7">🛎 {tf("Gast")}</Pill>}
              <Pill color={st.color} bg={st.bg}>{t.status}</Pill>
              {t.due_on && t.status!=="Erledigt" && <Pill color={t.due_on<todayIso()?BAD:INK_MUTED} bg={t.due_on<todayIso()?BAD_SOFT:PAPER}>{tf("Frist {0}", fmtDate(t.due_on))}</Pill>}
              {t.location && <b data-no-i18n="">{t.location}</b>}
              <span style={{fontSize:12,color:INK_MUTED}}>· <span>{t.department}</span></span>
              <span style={{flex:1}}></span>
              <span style={{fontSize:11.5,color:INK_MUTED}} data-no-i18n="">{memberLabel(members, me, t.reporter_id)} · {fmtDateTime(t.created_at)}</span>
            </div>
            <div style={{fontSize:14.5,fontWeight:600}}><TrText text={t.title} tr={T.tr} /></div>
            {t.description && <div style={{fontSize:13.5,color:INK_SOFT,whiteSpace:"pre-wrap",marginTop:2}}><TrText text={t.description} tr={T.tr} /></div>}
            {t.has_photo && <button style={{...linkBtn,paddingInlineStart:0,marginTop:4}} onClick={()=>showPhoto(t)}>📷 {photos[t.id] ? tf("Foto ausblenden") : tf("Foto ansehen")}</button>}
            {photos[t.id] && <img src={photos[t.id]} alt="" style={{display:"block",maxWidth:"100%",maxHeight:360,borderRadius:8,marginTop:6,border:`1px solid ${BORDER}`}} />}
            {t.status==="Erledigt" && t.done_by && <div style={{fontSize:12,color:GOOD,marginTop:4}}>{tf("Erledigt von {0}", memberLabel(members, me, t.done_by))} · <span data-no-i18n="">{fmtDateTime(t.done_at)}</span></div>}
            {t.done_note && <div style={{fontSize:12.5,color:INK_SOFT,marginTop:2}}>{tf("Ergebnis")}: <span data-no-i18n="">{t.done_note}</span></div>}
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:8}}>
              {canWork(t) && t.status==="Offen" && <button style={smallBtn} onClick={()=>run(()=>api("/api/tickets/"+t.id,"PATCH",{status:"In Arbeit", ...(me && !t.assignee_id ? {assignee_id:me.id} : {})}))}>{tf("Übernehmen")}</button>}
              {canWork(t) && t.status!=="Erledigt" && <button className="btn-primary" style={{padding:"6px 12px",fontSize:12.5,background:GOOD}} onClick={()=>{ let note; if(t.kind==="Wartung" || t.kind==="Baumangel"){ note = window.prompt(tf("Ergebnis oder Prüfbericht (optional)"), t.done_note||""); if(note===null) return; } run(()=>api("/api/tickets/"+t.id,"PATCH",{status:"Erledigt", ...(note!==undefined ? {done_note:note} : {})})); }}>✓ {t.status==="Prüfen" ? tf("Abnehmen") : tf("Erledigt")}</button>}
              {canWork(t) && t.status==="Prüfen" && <button style={smallBtn} onClick={()=>run(()=>api("/api/tickets/"+t.id,"PATCH",{status:"Offen"}))}>{tf("Zurück an die Firma")}</button>}
              {canWork(t) && t.status==="Erledigt" && <button style={smallBtn} onClick={()=>run(()=>api("/api/tickets/"+t.id,"PATCH",{status:"Offen"}))}>{tf("Wieder öffnen")}</button>}
              {canWork(t) && t.status!=="Erledigt" && (
                <select className="input" style={{width:"auto",padding:"5px 8px",fontSize:12.5}} value={t.assignee_id||""} onChange={e=>run(()=>api("/api/tickets/"+t.id,"PATCH",{assignee_id:e.target.value||null}))}>
                  <option value="">{tf("Niemand zugewiesen")}</option>
                  {members.filter(m=>m.role!=="viewer" && ((m.departments||[]).includes(t.department) || m.user_id===t.assignee_id || m.role==="admin")).map(m=><option key={m.user_id} value={m.user_id}>{shortName(m.email)}</option>)}
                </select>
              )}
              {!canWork(t) && t.assignee_id && <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Zuständig: {0}", memberLabel(members, me, t.assignee_id))}</span>}
              <span style={{flex:1}}></span>
              {(canManageDept(t.department) || (me && t.reporter_id===me.id && t.status==="Offen")) && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Meldung löschen?"))) run(()=>api("/api/tickets/"+t.id,"DELETE")); }}>✕</button>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ Push-Benachrichtigungen
function urlB64ToUint8(b64){ const p = "=".repeat((4 - b64.length % 4) % 4); const raw = atob((b64 + p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0))); }
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function usePush(api){
  const [st,setSt] = useState({ready:false});
  const refresh = useCallback(async()=>{
    if(window.OUVERTURE_DEMO || !pushSupported()) { setSt({ready:true, supported:false}); return; }
    let key = null; try { key = (await api("/api/push/key")).key; } catch(e){}
    let sub = null; try { const reg = await navigator.serviceWorker.getRegistration(); sub = reg && await reg.pushManager.getSubscription(); } catch(e){}
    setSt({ready:true, supported:true, key, on:!!sub, perm:Notification.permission});
  },[api]);
  useEffect(()=>{ refresh(); },[refresh]);
  const enable = async () => {
    const perm = await Notification.requestPermission();
    if(perm!=="granted") { await refresh(); throw new Error(tf("Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben.")); }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:urlB64ToUint8(st.key)});
    await api("/api/push/subscribe","POST",{subscription:sub.toJSON()});
    await refresh();
  };
  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    if(sub){ await api("/api/push/subscribe","DELETE",{endpoint:sub.endpoint}).catch(()=>{}); await sub.unsubscribe(); }
    await refresh();
  };
  return {...st, enable, disable, refresh};
}
// Beim Abmelden: dieses Gerät bekommt keine Nachrichten mehr für die Person
async function unsubscribePushOnLogout(api){
  try { const reg = pushSupported() && await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    if(sub){ await api("/api/push/subscribe","DELETE",{endpoint:sub.endpoint}).catch(()=>{}); await sub.unsubscribe(); } } catch(e){}
}

function PushCard({api}){
  const p = usePush(api);
  const [msg,setMsg] = useState(null);
  const [busy,setBusy] = useState(false);
  const act = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  return (
    <Card style={{marginBottom:18,maxWidth:520}}>
      <div style={{fontWeight:700,marginBottom:6}}>{tf("Benachrichtigungen aufs Handy")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Neuer Dienstplan, geänderte Schicht, entschiedener Antrag, neue Technik-Meldung oder ein wichtiger Eintrag im Übergabebuch – direkt als Nachricht auf diesem Gerät.")}</div>
      {!p.ready ? <div style={{fontSize:13,color:INK_MUTED}}>…</div>
        : window.OUVERTURE_DEMO ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("In der Live-Demo nicht verfügbar.")}</div>
        : !p.supported ? <div style={{fontSize:13,color:INK_MUTED}}>{isIos() && !isStandalone() ? tf("Auf dem iPhone funktionieren Benachrichtigungen, sobald Ouverture als App auf dem Startbildschirm installiert ist.") : tf("Dieser Browser unterstützt keine Benachrichtigungen.")}</div>
        : !p.key ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Push-Benachrichtigungen sind noch nicht eingerichtet.")}</div>
        : p.on ? (
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{color:GOOD,fontSize:13.5,flex:1}}>✓ {tf("Auf diesem Gerät eingeschaltet.")}</span>
            <button style={smallBtn} disabled={busy} onClick={()=>act(()=>api("/api/push/test","POST",{}), tf("Testnachricht gesendet."))}>{tf("Test senden")}</button>
            <button style={linkBtn} disabled={busy} onClick={()=>act(p.disable)}>{tf("Ausschalten")}</button>
          </div>
        ) : (
          <div>
            <button className="btn-primary" disabled={busy} onClick={()=>act(p.enable, tf("Benachrichtigungen sind eingeschaltet."))}>{tf("Benachrichtigungen einschalten")}</button>
            {p.perm==="denied" && <div style={{fontSize:12.5,color:WARN,marginTop:8}}>{tf("Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen des Browsers erlauben.")}</div>}
          </div>
        )}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

// Kleiner Hinweis auf der Startseite, solange Benachrichtigungen aus sind
function PushPrompt({api, onOpen}){
  const p = usePush(api);
  const [hidden,setHidden] = useState(()=>{ try { return window.localStorage.getItem("hpoos_push_prompt_hidden")==="1"; } catch(e){ return false; } });
  if(hidden || !p.ready || !p.supported || !p.key || p.on || p.perm==="denied") return null;
  const hide = () => { setHidden(true); try { window.localStorage.setItem("hpoos_push_prompt_hidden","1"); } catch(e){} };
  return (
    <Card style={{marginBottom:14,borderColor:BRASS,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:20}}>🔔</span>
      <div style={{flex:1,minWidth:200,fontSize:13.5}}>{tf("Erfahre sofort, wenn dein Dienstplan da ist oder sich eine Schicht ändert.")}</div>
      <button className="btn-primary" onClick={()=>p.enable().catch(()=>{})}>{tf("Einschalten")}</button>
      <button style={linkBtn} onClick={hide}>{tf("Später")}</button>
    </Card>
  );
}

