// ------------------------------------------------------------ Unterweisungen
function trainingStatus(t, userId){
  const mine = t.acks.filter(a=>a.user_id===userId).sort((a,b)=>a.acked_at<b.acked_at?1:-1)[0];
  if(!mine) return {state:"offen"};
  if(t.valid_months){ const until = new Date(mine.acked_at); until.setMonth(until.getMonth()+t.valid_months); if(until < new Date()) return {state:"abgelaufen", at:mine.acked_at}; return {state:"ok", at:mine.acked_at, until:until.toISOString()}; }
  return {state:"ok", at:mine.acked_at};
}
const appliesTo = (t, m) => m.role!=="viewer" && (!t.departments.length || (m.departments||[]).some(d=>t.departments.includes(d)) || m.role==="admin");
function TrainingsView({orgId, api, me, members, role, myDepts, hotel}){
  const lead = role==="admin" || role==="manager";
  const [sign,setSign] = useState(null); const [proofBusy,setProofBusy] = useState("");
  const [list,setList] = useState(null);
  const [open,setOpen] = useState(null);
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/organizations/"+orgId+"/trainings").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, orgId]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return <div style={{color:INK_MUTED}}>…</div>;
  const meRow = {role, departments:myDepts};
  const mine = list.filter(t=>appliesTo(t, meRow));
  const pending = mine.filter(t=>trainingStatus(t, me && me.id).state!=="ok");
  const save = () => run(async()=>{ const {id, ...b} = form; if(id) await api("/api/trainings/"+id,"PATCH",b); else await api("/api/organizations/"+orgId+"/trainings","POST",b); setForm(null); }, tf("Gespeichert."));
  return (
    <div>
      {lead && list && <TrainingPlanCard trainings={list} members={members} />}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {pending.length>0 && <Card style={{marginBottom:14,borderColor:WARN,background:WARN_SOFT}}><b>{tf("{0} Unterweisungen warten auf deine Bestätigung.", pending.length)}</b></Card>}
      {lead && !form && <button className="btn-primary" style={{marginBottom:12}} onClick={()=>setForm({title:"", body:"", departments:[], valid_months:12})}>{tf("+ Unterweisung")}</button>}
      {form && (
        <Card style={{marginBottom:14,borderColor:BRASS}}>
          <Field label={tf("Titel")}><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder={tf("z. B. Brandschutz und Fluchtwege")} /></Field>
          <Field label={tf("Inhalt")}><textarea className="input" rows={8} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} style={{fontFamily:"inherit"}} placeholder={tf("Was muss jede Person wissen? Wo sind Feuerlöscher, Sammelplatz, wen rufe ich an …")} /></Field>
          <div className="field-label">{tf("Für (leer = alle)")}</div>
          <DeptChips value={form.departments} onChange={v=>setForm({...form,departments:v})} />
          <label style={{display:"block",marginTop:10}}><div className="field-label">{tf("Wiederholen nach Monaten (leer = einmalig)")}</div><input className="input" type="number" min="1" max="120" style={{width:100}} value={form.valid_months??""} onChange={e=>setForm({...form,valid_months:e.target.value})} /></label>
          <div style={{display:"flex",gap:8,marginTop:10}}><button className="btn-primary" disabled={!form.title.trim()} onClick={save}>{tf("Speichern")}</button><button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
        </Card>
      )}
      {sign && <SignAckDialog training={sign} me={me} api={api} onClose={()=>setSign(null)} onDone={()=>{ setSign(null); setMsg({ok:true,text:tf("Danke – bestätigt.")}); load(); }} />}
      {(lead ? list : mine).length===0 && !form && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Unterweisungen.")}</div></Card>}
      {(lead ? list : mine).map(t=>{
        const st = trainingStatus(t, me && me.id); const applies = appliesTo(t, meRow);
        const target = members.filter(m=>appliesTo(t, m));
        const okCount = target.filter(m=>trainingStatus(t, m.user_id).state==="ok").length;
        return (
          <Card key={t.id} style={{marginBottom:10,borderInlineStart:applies && st.state!=="ok" ? `4px solid ${WARN}` : undefined}}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setOpen(open===t.id?null:t.id)}>
              <div style={{flex:1,minWidth:200}}><div style={{fontWeight:700}} data-no-i18n="">{t.title}</div>
                <div style={{fontSize:12,color:INK_MUTED}}>{t.departments.length ? t.departments.map((d,i)=><span key={d}>{i?", ":""}<span>{d}</span></span>) : tf("Alle")}{t.valid_months ? " · "+tf("alle {0} Monate", t.valid_months) : ""}</div></div>
              {applies && <Pill color={st.state==="ok"?GOOD_TEXT:WARN_TEXT} bg={st.state==="ok"?GOOD_SOFT:WARN_SOFT}>{st.state==="ok" ? tf("bestätigt") : st.state==="abgelaufen" ? tf("erneuern") : tf("offen")}</Pill>}
              {lead && <span style={{fontSize:12.5,fontWeight:600,color:okCount===target.length?GOOD:INK_MUTED}} data-no-i18n="">{okCount}/{target.length}</span>}
            </div>
            {open===t.id && (
              <div style={{marginTop:10}}>
                <div style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.55,background:PAPER,borderRadius:6,padding:"10px 12px"}} data-no-i18n="">{t.body || "—"}</div>
                {applies && role!=="viewer" && <div style={{marginTop:10,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  {st.state==="ok" ? <span style={{color:GOOD,fontSize:13}}>✓ {tf("Bestätigt am {0}", fmtDate(st.at))}{st.until ? " · "+tf("gültig bis {0}", fmtDate(st.until)) : ""}</span>
                    : <button className="btn-primary" onClick={()=>setSign(t)}><Icon n="pen" /> {tf("Gelesen und verstanden")}</button>}
                </div>}
                {lead && (
                  <div style={{marginTop:12}}>
                    <div className="field-label">{tf("Noch offen")}</div>
                    <div style={{fontSize:13}} data-no-i18n="">{target.filter(m=>trainingStatus(t, m.user_id).state!=="ok").map(m=>shortName(m.email)).join(", ") || "—"}</div>
                    <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                      <button style={smallBtn} disabled={!!proofBusy} onClick={async()=>{ setProofBusy(t.id); try { const r = await api("/api/trainings/"+t.id+"/proof"); await sheetPdf(trainingProofHtml({hotel:hotel||{name:""}, training:r.training, acks:r.acks, target, nameOf:(id)=>memberLabel(members, me, id)}), safeFile(translateString("Unterweisungsnachweis")+" "+t.title)+".pdf"); } catch(e){ setMsg({ok:false,text:e.message}); } setProofBusy(""); }}>{proofBusy===t.id?"…":<React.Fragment><Icon n="filetext" /> {tf("Nachweis (PDF)")}</React.Fragment>}</button>
                      <button style={linkBtn} onClick={()=>setForm({...t})}>{tf("Bearbeiten")}</button>
                      <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Unterweisung löschen? Alle Bestätigungen werden entfernt."))) run(()=>api("/api/trainings/"+t.id,"DELETE")); }}>{tf("Löschen")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ Fundsachen
const LF_STYLE = {"Aufbewahrt":{color:WARN_TEXT,bg:WARN_SOFT}, "Zurückgegeben":{color:GOOD_TEXT,bg:GOOD_SOFT}, "Entsorgt":{color:INK_MUTED,bg:PAPER}};
function LostFoundView({hotel, api, me, members, role}){
  const [list,setList] = useState(null);
  const [filter,setFilter] = useState("open");
  const [form,setForm] = useState(null);
  const [photos,setPhotos] = useState({});
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/lost-found"+(filter==="open"?"?status=open":"")).then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, base, filter]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const pick = async (file) => { if(!file) return; try { const d = await compressImage(file, 1280, 0.72); setForm(f=>({...f, photo_data:d})); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const days = (d) => Math.floor((new Date(todayIso()) - new Date(d))/86400000);
  return (
    <div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {role!=="viewer" && !form && <button className="btn-primary" style={{marginBottom:14}} onClick={()=>setForm({description:"", location:"", storage:"", found_on:todayIso(), photo_data:null, guest_name:"", guest_contact:"", keep_until:addDaysIso(todayIso(),180)})}>{tf("+ Fundsache erfassen")}</button>}
      {form && (
        <Card style={{marginBottom:14,borderColor:BRASS}}>
          <Field label={tf("Was wurde gefunden?")}><input className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tf("z. B. schwarze Lederjacke, Ladekabel, Brille")} /></Field>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <label style={{flex:1,minWidth:140}}><div className="field-label">{tf("Wo?")}</div><input className="input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder={tf("z. B. Zimmer 214, Restaurant")} /></label>
            <label style={{flex:1,minWidth:140}}><div className="field-label">{tf("Aufbewahrt in")}</div><input className="input" value={form.storage} onChange={e=>setForm({...form,storage:e.target.value})} placeholder={tf("z. B. Fundschrank Rezeption, Fach 3")} /></label>
            <label><div className="field-label">{tf("Gefunden am")}</div><input className="input" type="date" value={form.found_on} onChange={e=>setForm({...form,found_on:e.target.value})} /></label>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:6}}>
            <label style={{flex:1,minWidth:140}}><div className="field-label">{tf("Gast (falls bekannt)")}</div><input className="input" value={form.guest_name||""} onChange={e=>setForm({...form,guest_name:e.target.value})} placeholder={tf("Name, Zimmer")} /></label>
            <label style={{flex:1,minWidth:160}}><div className="field-label">{tf("E-Mail oder Telefon des Gastes")}</div><input className="input" value={form.guest_contact||""} onChange={e=>setForm({...form,guest_contact:e.target.value})} /></label>
            <label><div className="field-label">{tf("Aufbewahren bis")}</div><input className="input" type="date" value={form.keep_until||""} onChange={e=>setForm({...form,keep_until:e.target.value})} /></label>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",margin:"10px 0"}}>
            <label style={{...smallBtn,display:"inline-flex",alignItems:"center",gap:6,padding:"9px 13px"}}><Icon n="camera" /> {form.photo_data ? tf("Anderes Foto") : tf("Foto aufnehmen")}<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>pick(e.target.files[0])} /></label>
            {form.photo_data && <img src={form.photo_data} alt="" style={{height:56,borderRadius:6}} />}
          </div>
          <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.description.trim()} onClick={()=>run(async()=>{ await api(base+"/lost-found","POST",form); setForm(null); }, tf("Gespeichert."))}>{tf("Speichern")}</button><button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
        </Card>
      )}
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["open","Aufbewahrt"],["all","Alle"]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{border:`1px solid ${filter===k?INK:BORDER}`,background:filter===k?INK:"#fff",color:filter===k?"#fff":INK,borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer"}}>{l}</button>)}
        <span style={{flex:1}} />
        {list && list.length>0 && <button style={smallBtn} onClick={()=>sheetPdf(lostFoundSheetHtml(hotel, list, (id)=>memberLabel(members, me, id)), safeFile(translateString("Fundsachen")+" "+hotel.name+" "+todayIso())+".pdf").catch(e=>setMsg({ok:false,text:e.message}))}><Icon n="filetext" /> PDF</button>}
      </div>
      {list===null ? <div style={{color:INK_MUTED}}>…</div> : list.length===0 ? <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Fundsachen.")}</div></Card> : list.map(x=>{ const st = LF_STYLE[x.status]; return (
        <Card key={x.id} style={{marginBottom:8,padding:"11px 14px"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <Pill color={st.color} bg={st.bg}>{x.status}</Pill>
            <b data-no-i18n="">{x.description}</b>
            <span style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{[x.location, fmtDate(x.found_on), memberLabel(members, me, x.found_by)].filter(Boolean).join(" · ")}</span>
            <span style={{flex:1}}></span>
            {x.status==="Aufbewahrt" && x.keep_until && x.keep_until<todayIso() ? <span style={{fontSize:12,color:BAD}}>{tf("Frist abgelaufen ({0})", fmtDate(x.keep_until))}</span>
              : x.status==="Aufbewahrt" && days(x.found_on)>=90 && <span style={{fontSize:12,color:WARN_TEXT}}>{tf("seit {0} Tagen", days(x.found_on))}</span>}
          </div>
          {(x.guest_name || x.guest_contact) && <div style={{fontSize:12.5,color:INK_SOFT,marginTop:2}}>{tf("Gast")}: <span data-no-i18n="">{[x.guest_name, x.guest_contact].filter(Boolean).join(" · ")}</span>{x.notified_at ? " · ✉ "+tf("benachrichtigt am {0}", fmtDate(x.notified_at)) : ""}</div>}
          {x.storage && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:2}}>{tf("Aufbewahrt in")}: <span data-no-i18n="">{x.storage}</span></div>}
          {x.returned_to && <div style={{fontSize:12.5,color:GOOD,marginTop:2}}>{tf("Zurückgegeben an")}: <span data-no-i18n="">{x.returned_to}</span></div>}
          {role!=="viewer" && <LostFoundShippingPanel item={x} api={api} hotel={hotel} onChange={load} />}
          {x.has_photo && <button style={{...linkBtn,paddingInlineStart:0}} onClick={async()=>{ if(photos[x.id]) return setPhotos(p=>({...p,[x.id]:null})); const r = await api("/api/lost-found/"+x.id+"/photo"); setPhotos(p=>({...p,[x.id]:r.photo_data})); }}><Icon n="camera" /> {photos[x.id] ? tf("Foto ausblenden") : tf("Foto ansehen")}</button>}
          {photos[x.id] && <img src={photos[x.id]} alt="" style={{display:"block",maxWidth:"100%",maxHeight:300,borderRadius:8,marginTop:6}} />}
          {role!=="viewer" && x.status==="Aufbewahrt" && <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <button style={smallBtn} onClick={()=>{ const who = window.prompt(tf("An wen zurückgegeben? (Name, ggf. Zimmer)")); if(who!==null) run(()=>api("/api/lost-found/"+x.id,"PATCH",{status:"Zurückgegeben", returned_to:who})); }}>✓ {tf("Zurückgegeben")}</button>
            <button style={smallBtn} onClick={()=>{ if(window.confirm(tf("Als entsorgt markieren?"))) run(()=>api("/api/lost-found/"+x.id,"PATCH",{status:"Entsorgt"})); }}>{tf("Entsorgt")}</button>
            <button style={smallBtn} onClick={()=>{ const m = String(x.guest_contact||"").match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/); const email = window.prompt(tf("E-Mail-Adresse des Gastes"), m ? m[0] : ""); if(email) run(()=>api("/api/lost-found/"+x.id+"/notify","POST",{email, language:UI_LANG}), tf("Gast benachrichtigt.")); }}>✉ {tf("Gast benachrichtigen")}</button>
          </div>}
        </Card>
      ); })}
    </div>
  );
}

// ------------------------------------------------------------ Lager
function StockView({hotel, api, me, role, myDepts}){
  const depts = Array.from(new Set(visibleDeptsFor(role, myDepts)));
  const [dept,setDept] = useRememberedDept("hpoos_stock_dept", depts);
  const [items,setItems] = useState(null);
  const [amount,setAmount] = useState({});
  const [form,setForm] = useState(null);
  const [hist,setHist] = useState({});
  const [msg,setMsg] = useState(null); const [inv,setInv] = useState(false);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/stock").then(setItems).catch(e=>{ setMsg({ok:false,text:e.message}); setItems([]); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  // ohne gemerkte Auswahl: erste Abteilung mit Artikeln zeigen
  useEffect(()=>{ let saved = null; try { saved = window.localStorage.getItem("hpoos_stock_dept"); } catch(e){}
    if(items && !saved && !items.some(i=>i.department===dept)){ const d = depts.find(x=>items.some(i=>i.department===x)); if(d) setDept(d); } },[items]);
  const move = async (it, sign) => {
    const n = Number(String(amount[it.id]||"1").replace(",",".")); if(!n) return;
    setMsg(null);
    try { const r = await api("/api/stock/"+it.id+"/move","POST",{delta:sign*n}); setItems(xs=>xs.map(x=>x.id===it.id?r:x)); setAmount(a=>({...a,[it.id]:""}));
      if(r.reorder_created) setMsg({ok:true,text:tf("Unter Mindestbestand – der Einkauf wurde benachrichtigt.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  if(items===null) return <div style={{color:INK_MUTED}}>…</div>;
  const mine = items.filter(i=>i.department===dept);
  const low = items.filter(i=>Number(i.quantity)<Number(i.min_quantity));
  const fmtQ = (n) => Number(n).toLocaleString(UI_LOCALE, {maximumFractionDigits:2});
  return (
    <div>
      <OrdersPanel hotel={hotel} api={api} onStockChanged={load} />
      <DeptTabs depts={depts} value={dept} onChange={setDept} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {low.length>0 && <Card style={{marginBottom:12,borderColor:BAD,background:BAD_SOFT,fontSize:13}}><b>{tf("Unter Mindestbestand:")}</b> <span data-no-i18n="">{low.map(i=>i.name).join(", ")}</span></Card>}
      {inv && <InventoryPanel hotel={hotel} api={api} dept={dept} items={items} onDone={load} onClose={()=>setInv(false)} />}
      {role!=="viewer" && !inv && mine.length>0 && items.some(i=>"barcode" in i) && <button style={{...smallBtn,marginBottom:12}} onClick={()=>setInv(true)}><Icon n="clipboard" /> {tf("Inventur")}</button>}
      {canManageDept(dept) && !form && <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        <button className="btn-primary" onClick={()=>setForm({name:"", unit:"Stück", quantity:"0", min_quantity:"0", department:dept})}>{tf("+ Artikel")}</button>
        <StockImportButton hotel={hotel} api={api} dept={dept} onDone={load} onMsg={setMsg} />
      </div>}
      {form && (
        <Card style={{marginBottom:12,borderColor:BRASS}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label style={{flex:2,minWidth:160}}><div className="field-label">{tf("Artikel")}</div><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tf("z. B. Duschgel 30 ml, Handtuch groß")} /></label>
            <label><div className="field-label">{tf("Einheit")}</div><input className="input" style={{width:90}} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} /></label>
            <label><div className="field-label">{tf("Bestand")}</div><input className="input" type="number" style={{width:90}} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></label>
            <label><div className="field-label">{tf("Mindestbestand")}</div><input className="input" type="number" style={{width:90}} value={form.min_quantity} onChange={e=>setForm({...form,min_quantity:e.target.value})} /></label>
            <button className="btn-primary" disabled={!form.name.trim()} onClick={async()=>{ try { await api(base+"/stock","POST",form); setForm(null); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } }}>{tf("Anlegen")}</button>
            <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          </div>
        </Card>
      )}
      {mine.length===0 && !form && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{canManageDept(dept) ? tf("Noch keine Artikel. Lege Wäsche, Amenities oder Minibar-Artikel mit Mindestbestand an.") : tf("Für diese Abteilung gibt es noch keine Artikel.")}</div></Card>}
      {mine.map(it=>{ const isLow = Number(it.quantity)<Number(it.min_quantity); return (
        <Card key={it.id} style={{marginBottom:8,padding:"10px 14px",borderInlineStart:isLow?`4px solid ${BAD}`:undefined}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:150}}><b data-no-i18n="">{it.name}</b>
              <div style={{fontSize:12,color:isLow?BAD:INK_MUTED}}><span data-no-i18n="">{fmtQ(it.quantity)} {it.unit}</span> · {tf("Minimum {0}", fmtQ(it.min_quantity))}{it.reorder_ticket ? " · "+tf("nachbestellt") : ""}</div></div>
            {role!=="viewer" && <React.Fragment>
              <button style={{...smallBtn,minWidth:38,fontWeight:700}} onClick={()=>move(it,-1)} title={tf("Entnahme")} aria-label={tf("Entnahme")+": "+it.name}>−</button>
              <input className="input" inputMode="decimal" aria-label={tf("Menge")+": "+it.name} style={{width:64,textAlign:"center"}} placeholder="1" value={amount[it.id]||""} onChange={e=>setAmount({...amount,[it.id]:e.target.value})} />
              <button style={{...smallBtn,minWidth:38,fontWeight:700}} onClick={()=>move(it,1)} title={tf("Zugang")} aria-label={tf("Zugang")+": "+it.name}>+</button>
            </React.Fragment>}
            <button style={linkBtn} onClick={async()=>{ if(hist[it.id]) return setHist(h=>({...h,[it.id]:null})); const r = await api("/api/stock/"+it.id+"/moves"); setHist(h=>({...h,[it.id]:r})); }}>{tf("Verlauf")}</button>
            {canManageDept(it.department) && <button style={linkBtn} onClick={()=>{ const v = window.prompt(tf("Neuer Mindestbestand"), it.min_quantity); if(v!==null) api("/api/stock/"+it.id,"PATCH",{min_quantity:v}).then(load).catch(e=>setMsg({ok:false,text:e.message})); }}>{tf("Minimum")}</button>}
            {canManageDept(it.department) && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Artikel löschen?"))) api("/api/stock/"+it.id,"DELETE").then(load); }}>✕</button>}
          </div>
          {hist[it.id] && <div style={{marginTop:6,fontSize:12,color:INK_MUTED}} data-no-i18n="">{hist[it.id].length ? hist[it.id].map(m=><div key={m.id}>{fmtDateTime(m.created_at)} · <b style={{color:m.delta>0?GOOD:INK}}>{m.delta>0?"+":""}{fmtQ(m.delta)}</b>{m.note?" · "+m.note:""}</div>) : "—"}</div>}
        </Card>
      ); })}
    </div>
  );
}

// ------------------------------------------------------------ Kennzahlen
function KpiView({hotel, api}){
  const [range,setRange] = useState("month"); const [rev,setRev] = useState(false); const [tick,setTick] = useState(0);
  const [k,setK] = useState(null);
  const [msg,setMsg] = useState(null);
  const today = todayIso();
  const m0 = today.slice(0,8)+"01";
  const ranges = {week:[addDaysIso(today,-6), today], month:[m0, today], last:[addDaysIso(m0,-1).slice(0,8)+"01", addDaysIso(m0,-1)]};
  const [from,to] = ranges[range];
  useEffect(()=>{ setK(null); api("/api/hotels/"+hotel.id+"/kpis?from="+from+"&to="+to).then(setK).catch(e=>setMsg({ok:false,text:e.message})); },[range, hotel.id, tick]);
  const lead = ACCESS.role==="admin" || ACCESS.role==="manager";
  const money = (v) => v==null ? null : Number(v).toLocaleString(UI_LOCALE,{style:"currency",currency:hotel.currency||"EUR"});
  const T = ({label, value, sub, color}) => <StatTile label={label} value={value==null||value===""?"–":value} sub={sub} color={color} />;
  const n = (v, d) => v==null ? null : Number(v).toLocaleString(UI_LOCALE, {maximumFractionDigits:d==null?1:d});
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["week","Letzte 7 Tage"],["month","Dieser Monat"],["last","Letzter Monat"]].map(([key,l])=><button key={key} onClick={()=>setRange(key)} style={{border:`1px solid ${range===key?INK:BORDER}`,background:range===key?INK:"#fff",color:range===key?"#fff":INK,borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer"}}>{tf(l)}</button>)}
        <span style={{flex:1}} />
        {lead && <button style={smallBtn} onClick={()=>setRev(!rev)}>{rev ? tf("Fertig") : "✎ "+tf("Belegung und Umsatz eintragen")}</button>}
      </div>
      {rev && <RevenueEditor hotel={hotel} api={api} from={from} to={to} onSaved={()=>setTick(t=>t+1)} />}
      {msg && <ErrorText>{msg.text}</ErrorText>}
      {!k ? <div style={{color:INK_MUTED}}>…</div> : (
        <React.Fragment>
          <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:12,marginBottom:14}}>
            <T label={tf("Auslastung")} value={k.occupancy_pct!=null ? n(k.occupancy_pct)+" %" : null} sub={k.rooms_available ? tf("{0} von {1} Zimmernächten", k.room_nights, k.rooms_available) : tf("Zimmeranzahl fehlt")} />
            <T label={tf("Durchschnittspreis (ADR)")} value={money(k.adr)} sub={k.room_revenue!=null ? tf("Logis-Umsatz {0}", money(k.room_revenue)) : tf("kein Umsatz eingetragen")} />
            <T label="RevPAR" value={money(k.revpar)} sub={tf("Umsatz je verfügbarem Zimmer")} />
            <T label={tf("Gearbeitete Stunden")} value={n(k.worked_hours)} sub={tf("geplant {0}", n(k.planned_hours))} />
            <T label={tf("Stunden je belegtem Zimmer")} value={n(k.hours_per_room_night,2)} sub={k.room_nights ? tf("{0} Zimmernächte", k.room_nights) : tf("keine Belegungsdaten")} />
            <T label={tf("Ø Reinigungszeit")} value={k.avg_cleaning_minutes!=null ? k.avg_cleaning_minutes+" min" : null} sub={tf("{0} Zimmer gereinigt", k.rooms_cleaned)} />
            <T label={tf("Meldungen")} value={k.tickets_opened} sub={tf("{0} erledigt · {1} offen", k.tickets_done, k.tickets_open)} color={k.tickets_urgent_open?BAD:undefined} />
            <T label={tf("Behebungszeit (Median)")} value={k.median_hours_to_fix!=null ? n(k.median_hours_to_fix)+" h" : null} sub={tf("{0} dringend offen", k.tickets_urgent_open)} />
            <T label={tf("Gästewünsche")} value={k.guest_requests} />
            <T label={tf("HACCP-Messungen")} value={k.temp_readings} sub={tf("{0} außerhalb des Bereichs", k.temp_out_of_range)} color={k.temp_out_of_range?BAD:undefined} />
            <T label={tf("Korrigierte Zeitbuchungen")} value={k.corrected_entries} sub={tf("{0} offline erfasst", k.offline_entries)} />
          </div>
          {k.departments.length>0 && (
            <Card>
              <h2 className="ui-h" style={{fontWeight:700,marginBottom:6}}>{tf("Stunden je Abteilung")}</h2>
              {k.departments.map(d=>(
                <div key={d.department} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
                  <span style={{flex:1}}>{d.department}</span>
                  <span style={{width:200}}><Bar pct={d.planned ? Math.min(100, d.worked/d.planned*100) : 0} color={d.worked>d.planned*1.05?WARN:GOOD} /></span>
                  <span style={{width:120,textAlign:"end",color:INK_MUTED}} data-no-i18n="">{n(d.worked)} / {n(d.planned)} h</span>
                </div>
              ))}
            </Card>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Gruppenansicht (Hotelauswahl)
function useOrgOverview(api, orgId, hotels){
  const [ov,setOv] = useState({});
  useEffect(()=>{ if(!orgId || !hotels || !hotels.length) return; api("/api/organizations/"+orgId+"/overview").then(l=>setOv(Object.fromEntries(l.map(x=>[x.id,x])))).catch(()=>{}); },[orgId, hotels && hotels.length]);
  return ov;
}
function HotelStats({s}){
  if(!s) return null;
  const chip = (txt, color) => <span style={{fontSize:11.5,color:color||INK_MUTED,background:PAPER,borderRadius:999,padding:"2px 8px"}} data-no-i18n="">{txt}</span>;
  return (
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:5}}>
      {s.on_duty>0 && chip("● "+tf("{0} im Dienst", s.on_duty), GOOD)}
      {s.rooms_total>0 && chip(<React.Fragment><Icon n="bed" /> {tf("{0}/{1} bereit", s.rooms_ready, s.rooms_total)}</React.Fragment>)}
      {(s.arrivals>0 || s.departures>0) && chip("↘ "+s.arrivals+" · ↗ "+s.departures)}
      {s.tickets_open>0 && chip(<React.Fragment><Icon n="wrench" /> {tf("{0} offen", s.tickets_open)}</React.Fragment>, s.tickets_urgent ? BAD : undefined)}
    </div>
  );
}

