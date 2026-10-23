// ============================================================ Migration 037: Wäscherei, Minibar, Frühstücksplanung, Personalunterkünfte
const fmtNum = (n, d) => Number(n||0).toLocaleString(UI_LOCALE,{maximumFractionDigits:d==null?2:d});
const moneyOf = (hotel) => (v) => v==null ? "–" : Number(v).toLocaleString(UI_LOCALE,{style:"currency",currency:hotel.currency||"EUR"});

// ------------------------------------------------------------ Wäscherei
function LaundryView({hotel, api}){
  const [month,setMonth] = useState(todayIso().slice(0,7)); const [d,setD] = useState(null); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [move,setMove] = useState(null);
  const lead = canManageDept("Housekeeping"); const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/laundry?month="+month).then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD({items:[],moves:[],summary:[]}); }),[api, hotel.id, month]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); load(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const sum = (id) => (d && d.summary.find(s=>s.item_id===id)) || {};
  const totalCost = d ? d.summary.reduce((x,s)=>x+(s.cost||0),0) : 0;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Wäsche, die zur Wäscherei geht und zurückkommt. Ouverture zeigt Schwund und beschädigte Teile mit Kosten je Monat.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        {lead && !form && <button className="btn-primary" onClick={()=>setForm({name:"", unit_cost:"", par_level:""})}>{tf("Artikel anlegen")}</button>}
        <input className="input" type="month" style={{width:170}} value={month} aria-label={tf("Monat")} onChange={e=>e.target.value && setMonth(e.target.value)} />
        {d && totalCost>0 && <span style={{fontSize:13}}>{tf("Kosten für Schwund und Schäden")}: <b style={{color:BAD}}>{money(totalCost)}</b></span>}
      </div>
      {form && <Card style={{marginBottom:12,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Artikel")}><input className="input" value={form.name} placeholder={tf("z. B. Badetuch")} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Kosten je Stück")}><input className="input" inputMode="decimal" value={form.unit_cost??""} onChange={e=>setForm({...form,unit_cost:e.target.value})} /></Field>
          <Field label={tf("Sollbestand (Par)")}><input className="input" type="number" min={0} value={form.par_level??""} onChange={e=>setForm({...form,par_level:e.target.value})} /></Field>
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.name.trim()} onClick={()=>run(async()=>{ if(form.id) await api("/api/laundry-items/"+form.id,"PATCH",form); else await api("/api/hotels/"+hotel.id+"/laundry-items","POST",form); setForm(null); })}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {d && d.items.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Wäsche-Artikel.")}</div>}
      {d && d.items.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:560}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th scope="col" style={{padding:10,textAlign:"start"}}>{tf("Artikel")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Raus")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Zurück")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Beschädigt")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Fehlt")}</th><th></th></tr></thead>
        <tbody>{d.items.map(it=>{ const s = sum(it.id); return (
          <tr key={it.id} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:10}}><b data-no-i18n="">{it.name}</b>{it.unit_cost!=null && <div style={{fontSize:12,color:INK_MUTED}}>{money(it.unit_cost)} / {tf("Stück")}</div>}</td>
            <td style={{textAlign:"end"}}>{fmtNum(s.sent,0)}</td><td style={{textAlign:"end"}}>{fmtNum(s.returned,0)}</td>
            <td style={{textAlign:"end",color:s.damaged?WARN:INK}}>{fmtNum(s.damaged,0)}</td><td style={{textAlign:"end",color:s.missing?BAD:INK,fontWeight:s.missing?700:400}}>{fmtNum(s.missing,0)}</td>
            <td style={{textAlign:"end",paddingInlineEnd:10,whiteSpace:"nowrap"}}>
              <button style={linkBtn} onClick={()=>setMove({item:it, sent:"", returned:"", damaged:"", note:""})}>{tf("Buchen")}</button>
              {lead && <button style={linkBtn} onClick={()=>setForm({...it, unit_cost:it.unit_cost??"", par_level:it.par_level??""})}>{tf("Bearbeiten")}</button>}
            </td>
          </tr>); })}</tbody></table></Card>}
      {move && <Overlay onClose={()=>setMove(null)} width={420} label={tf("Wäsche buchen")}>
        <b>{tf("Wäsche buchen")}: <span data-no-i18n="">{move.item.name}</span></b>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
          {[["sent","Raus"],["returned","Zurück"],["damaged","Beschädigt"]].map(([k,l])=><Field key={k} label={tf(l)}><input className="input" type="number" min={0} inputMode="numeric" value={move[k]} onChange={e=>setMove({...move,[k]:e.target.value})} /></Field>)}
        </div>
        <Field label={tf("Notiz")}><input className="input" value={move.note} onChange={e=>setMove({...move,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={()=>run(async()=>{ await api("/api/laundry-items/"+move.item.id+"/moves","POST",move); setMove(null); }, tf("Gebucht."))}>{tf("Buchen")}</button><button style={btnLine} onClick={()=>setMove(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
    </div>
  );
}

// ------------------------------------------------------------ Minibar
function MinibarView({hotel, api}){
  const [items, loadItems] = useList(api, "/api/hotels/"+hotel.id+"/minibar-items");
  const [charges,setCharges] = useState(null); const [rooms,setRooms] = useState([]); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [book,setBook] = useState({room:"", qty:{}}); const [sel,setSel] = useState({});
  const money = moneyOf(hotel);
  const canItems = canManageDept("Rezeption & Empfang") || canManageDept("Food & Beverage") || canManageDept("Housekeeping");
  const canBill = canManageDept("Rezeption & Empfang") || (ACCESS.depts||[]).includes("Rezeption & Empfang");
  const loadCharges = () => api("/api/hotels/"+hotel.id+"/minibar-charges?open=1").then(setCharges).catch(e=>{ setMsg({ok:false,text:e.message}); setCharges([]); });
  useEffect(()=>{ loadCharges(); api("/api/hotels/"+hotel.id+"/rooms").then(r=>setRooms(Array.isArray(r)?r:(r.rooms||[]))).catch(()=>{}); },[hotel.id]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const active = (items||[]).filter(i=>i.active!==false);
  const byRoom = {}; (charges||[]).forEach(c=>{ (byRoom[c.room] = byRoom[c.room] || []).push(c); });
  const sum = (list) => list.reduce((x,c)=>x+Number(c.unit_price)*c.quantity,0);
  const roomObj = rooms.find(r=>r.number===book.room);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Housekeeping tippt den Verbrauch im Zimmer an – die Rezeption sieht offene Beträge je Zimmer und markiert sie nach der Abrechnung.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <Card style={{marginBottom:14}}>
        <b>{tf("Verbrauch buchen")}</b>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"8px 0"}}>
          <select className="input" style={{width:"auto",minWidth:120}} value={book.room} onChange={e=>setBook({...book,room:e.target.value})} aria-label={tf("Zimmer")}><option value="">{tf("Zimmer wählen")}</option>{rooms.map(r=><option key={r.id} value={r.number}>{r.number}</option>)}</select>
        </div>
        {active.length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Minibar-Artikel.")}</div> :
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:8}}>
            {active.map(it=>{ const q = book.qty[it.id]||0; return (
              <div key={it.id} style={{border:`1px solid ${q?BRASS:BORDER}`,borderRadius:10,padding:8,display:"flex",flexDirection:"column",gap:6}}>
                <span style={{fontSize:13}}><b data-no-i18n="">{it.name}</b><div style={{color:INK_MUTED,fontSize:12}}>{money(it.price)}</div></span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button style={{...smallBtn,minWidth:44}} aria-label={tf("Weniger")+": "+it.name} onClick={()=>setBook({...book,qty:{...book.qty,[it.id]:Math.max(0,q-1)}})}>−</button>
                  <b style={{minWidth:20,textAlign:"center"}} aria-live="polite">{q}</b>
                  <button style={{...smallBtn,minWidth:44}} aria-label={tf("Mehr")+": "+it.name} onClick={()=>setBook({...book,qty:{...book.qty,[it.id]:Math.min(50,q+1)}})}>+</button>
                </div>
              </div>); })}
          </div>}
        <button className="btn-primary" style={{marginTop:10}} disabled={!roomObj || !Object.values(book.qty).some(Boolean)} onClick={()=>run(async()=>{ await api("/api/rooms/"+roomObj.id+"/minibar","POST",{items:Object.entries(book.qty).filter(([,q])=>q).map(([item_id,quantity])=>({item_id,quantity}))}); setBook({room:"",qty:{}}); loadCharges(); }, tf("Gebucht."))}>{tf("Buchen")}</button>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
          <b style={{flex:1}}>{tf("Offen zur Abrechnung")}</b>
          {canBill && Object.keys(sel).some(k=>sel[k]) && <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={()=>run(async()=>{ await api("/api/minibar-charges/bill","POST",{ids:(charges||[]).filter(c=>sel[c.room]).map(c=>c.id)}); setSel({}); loadCharges(); }, tf("Als abgerechnet markiert."))}>{tf("Als abgerechnet markieren")}</button>}
        </div>
        {charges && charges.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Nichts offen.")}</div>}
        {Object.entries(byRoom).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),"de",{numeric:true})).map(([room,list])=>(
          <div key={room} style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <label style={{display:"flex",gap:8,alignItems:"center",cursor:canBill?"pointer":"default"}}>
              {canBill && <input type="checkbox" checked={!!sel[room]} onChange={e=>setSel({...sel,[room]:e.target.checked})} />}
              <b style={{flex:1}}>{tf("Zimmer")} <span data-no-i18n="">{room}</span></b><b>{money(sum(list))}</b>
            </label>
            <div style={{fontSize:12.5,color:INK_MUTED,paddingInlineStart:canBill?26:0}} data-no-i18n="">{list.map(c=>c.quantity+"× "+c.item_name).join(" · ")}</div>
          </div>))}
      </Card>
      {canItems && <Card>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><b style={{flex:1}}>{tf("Artikel und Preise")}</b>{!form && <button style={smallBtn} onClick={()=>setForm({name:"",price:"",sort:(items||[]).length})}>{tf("Artikel anlegen")}</button>}</div>
        {form && <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:8}}>
          <Field label={tf("Artikel")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Preis")}><input className="input" inputMode="decimal" style={{width:110}} value={form.price} onChange={e=>setForm({...form,price:e.target.value})} /></Field>
          <button className="btn-primary" style={{marginBottom:14}} disabled={!form.name.trim()} onClick={()=>run(async()=>{ if(form.id) await api("/api/minibar-items/"+form.id,"PATCH",form); else await api("/api/hotels/"+hotel.id+"/minibar-items","POST",form); setForm(null); loadItems(); })}>{tf("Speichern")}</button>
          <button style={{...btnLine,marginBottom:14}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>}
        {(items||[]).map(it=><div key={it.id} style={{display:"flex",gap:8,padding:"5px 0",borderTop:`1px solid ${BORDER}`,fontSize:13,opacity:it.active===false?0.5:1}}>
          <span style={{flex:1}} data-no-i18n="">{it.name}</span><span>{money(it.price)}</span>
          <button style={linkBtn} onClick={()=>setForm({...it})}>{tf("Bearbeiten")}</button>
          <button style={linkBtn} onClick={()=>run(async()=>{ await api("/api/minibar-items/"+it.id,"PATCH",{active:it.active===false}); loadItems(); })}>{it.active===false ? tf("Aktivieren") : tf("Deaktivieren")}</button></div>)}
      </Card>}
    </div>
  );
}

// ------------------------------------------------------------ Frühstücksplanung
function BreakfastView({hotel, api, onHotel}){
  const [from,setFrom] = useState(todayIso()); const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [edit,setEdit] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/breakfast-plan?from="+from).then(setD).catch(e=>setMsg({ok:false,text:e.message})),[api, hotel.id, from]);
  useEffect(()=>{ load(); },[load]);
  const save = async () => { setMsg(null); try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{breakfast_settings:{...edit, items: edit.itemsText.split("\n").map(l=>{ const [name,per,unit] = l.split(";").map(x=>(x||"").trim()); return {name, per_guest:per, unit}; }).filter(x=>x.name)}}); onHotel && onHotel(h); setEdit(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const st = d && d.settings;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Erwartete Frühstücksgäste aus der Belegung der Vornacht – mit Personalbedarf und Einkaufsliste für die Woche.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input className="input" type="date" style={{width:170}} value={from} aria-label={tf("Ab")} onChange={e=>e.target.value && setFrom(e.target.value)} />
        {ACCESS.role==="admin" && st && !edit && <button style={smallBtn} onClick={()=>setEdit({...st, itemsText:(st.items||[]).map(i=>[i.name,i.per_guest,i.unit].join("; ")).join("\n")})}>{tf("Annahmen bearbeiten")}</button>}
      </div>
      {edit && <Card style={{marginBottom:12,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Personen je Zimmer")}><input className="input" inputMode="decimal" value={edit.persons_per_room} onChange={e=>setEdit({...edit,persons_per_room:e.target.value})} /></Field>
          <Field label={tf("Anteil mit Frühstück (0–1)")}><input className="input" inputMode="decimal" value={edit.share} onChange={e=>setEdit({...edit,share:e.target.value})} /></Field>
          <Field label={tf("Gäste je Servicekraft")}><input className="input" type="number" value={edit.guests_per_staff} onChange={e=>setEdit({...edit,guests_per_staff:e.target.value})} /></Field>
          <Field label={tf("Mindestbesetzung")}><input className="input" type="number" value={edit.min_staff} onChange={e=>setEdit({...edit,min_staff:e.target.value})} /></Field>
        </div>
        <Field label={tf("Einkaufsliste: je Zeile „Artikel; Menge je Gast; Einheit“")}><textarea className="input" rows={5} value={edit.itemsText} placeholder={"Eier; 1,5; Stk\nSemmeln; 2; Stk\nKaffee; 0,02; kg"} onChange={e=>setEdit({...edit,itemsText:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {d && <Card style={{padding:0,overflowX:"auto",marginBottom:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:420}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th scope="col" style={{padding:10,textAlign:"start"}}>{tf("Tag")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Zimmer (Vornacht)")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Gäste")}</th><th scope="col" style={{textAlign:"end",paddingInlineEnd:10}}>{tf("Servicekräfte")}</th></tr></thead>
        <tbody>{d.days.map(x=><tr key={x.date} style={{borderTop:`1px solid ${BORDER}`}}>
          <td style={{padding:10}}>{fmtDay(x.date,{weekday:"short",day:"2-digit",month:"2-digit"})}</td>
          <td style={{textAlign:"end"}}>{x.rooms ?? "–"}</td><td style={{textAlign:"end",fontWeight:600}}>{x.guests ?? "–"}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{x.staff ?? "–"}</td></tr>)}</tbody></table></Card>}
      {d && d.days.every(x=>x.rooms==null) && <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>{tf("Noch keine Belegung für diese Woche – unter „Belegung und Umsatz“ eintragen oder aus dem PMS übernehmen.")}</div>}
      {d && d.shopping.length>0 && <Card><b>{tf("Einkaufsliste für 7 Tage")}</b>
        {d.shopping.map(it=><div key={it.name} style={{display:"flex",gap:8,padding:"5px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}><span style={{flex:1}} data-no-i18n="">{it.name}</span><b data-no-i18n="">{fmtNum(it.total,1)} {it.unit}</b></div>)}
      </Card>}
      {st && <div style={{fontSize:11.5,color:INK_MUTED,marginTop:8}}>{tf("Annahmen: {0} Personen je Zimmer, {1} % mit Frühstück, {2} Gäste je Servicekraft.", fmtNum(st.persons_per_room,1), Math.round(st.share*100), st.guests_per_staff)}</div>}
    </div>
  );
}

// ------------------------------------------------------------ Personalunterkünfte
function HousingView({hotel, api, members}){
  const [units, loadUnits, err] = useList(api, "/api/hotels/"+hotel.id+"/housing-units");
  const [asg, loadAsg] = useList(api, "/api/hotels/"+hotel.id+"/housing-assignments");
  const [form,setForm] = useState(null); const [move,setMove] = useState(null); const [msg,setMsg] = useState(null);
  const today = todayIso(); const money = moneyOf(hotel);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); loadUnits(); loadAsg(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const current = (u) => (asg||[]).filter(a=>a.unit_id===u.id && a.from_date<=today && (!a.to_date || a.to_date>=today));
  const nameOf = (a) => a.user_id ? (((members||[]).find(m=>m.user_id===a.user_id)||{}).email||"").split("@")[0] || tf("Teammitglied") : (a.person_name||"–");
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Zimmer im Personalhaus: wer wohnt wo, seit wann, Kaution und Übergabe. Sehen können das Admins und die Leitung Personal; jede Person sieht ihre eigene Unterkunft.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {err && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{err}</div>}
      {!form && <button className="btn-primary" style={{marginBottom:12}} onClick={()=>setForm({name:"", beds:1, rent_month:"", note:""})}>{tf("Unterkunft anlegen")}</button>}
      {form && <Card style={{marginBottom:12,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Bezeichnung")}><input className="input" value={form.name} placeholder={tf("z. B. Personalhaus Zimmer 3")} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Betten")}><input className="input" type="number" min={1} max={20} value={form.beds} onChange={e=>setForm({...form,beds:e.target.value})} /></Field>
          <Field label={tf("Miete pro Monat")}><input className="input" inputMode="decimal" value={form.rent_month??""} onChange={e=>setForm({...form,rent_month:e.target.value})} /></Field>
        </div>
        <Field label={tf("Notiz")}><input className="input" value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.name.trim()} onClick={()=>run(async()=>{ if(form.id) await api("/api/housing-units/"+form.id,"PATCH",form); else await api("/api/hotels/"+hotel.id+"/housing-units","POST",form); setForm(null); })}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {units && units.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Unterkünfte.")}</div>}
      {(units||[]).map(u=>{ const cur = current(u); return (
        <Card key={u.id} style={{marginBottom:10}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <b style={{flex:1}} data-no-i18n="">{u.name}</b>
            <Pill color={cur.length>=u.beds?WARN:GOOD} bg={cur.length>=u.beds?WARN_SOFT:GOOD_SOFT}>{tf("{0} von {1} Betten belegt", cur.length, u.beds)}</Pill>
            {u.rent_month!=null && <span style={{fontSize:12.5,color:INK_MUTED}}>{money(u.rent_month)} / {tf("Monat")}</span>}
            <button style={linkBtn} onClick={()=>setMove({unit_id:u.id, user_id:"", person_name:"", from_date:today, to_date:"", deposit:"", handover_note:""})}>{tf("Einzug eintragen")}</button>
            <button style={linkBtn} onClick={()=>setForm({...u, rent_month:u.rent_month??"", note:u.note||""})}>{tf("Bearbeiten")}</button>
          </div>
          {(asg||[]).filter(a=>a.unit_id===u.id).slice(0,8).map(a=>{ const active = a.from_date<=today && (!a.to_date || a.to_date>=today); return (
            <div key={a.id} style={{display:"flex",gap:10,flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13,opacity:active?1:0.6}}>
              <span style={{flex:1,minWidth:140}} data-no-i18n="">{nameOf(a)}</span>
              <span style={{color:INK_MUTED}}>{fmtDate(a.from_date)} – {a.to_date ? fmtDate(a.to_date) : tf("offen")}</span>
              {a.deposit!=null && <span>{tf("Kaution")} {money(a.deposit)}{a.deposit_returned_at ? " · "+tf("zurück am {0}", fmtDate(a.deposit_returned_at)) : ""}</span>}
              {active && <button style={linkBtn} onClick={()=>run(()=>api("/api/housing-assignments/"+a.id,"PATCH",{to_date:today}), tf("Auszug eingetragen."))}>{tf("Auszug heute")}</button>}
              {a.deposit!=null && !a.deposit_returned_at && !active && <button style={linkBtn} onClick={()=>run(()=>api("/api/housing-assignments/"+a.id,"PATCH",{deposit_returned_at:today}))}>{tf("Kaution zurück")}</button>}
            </div>); })}
        </Card>); })}
      {move && <Overlay onClose={()=>setMove(null)} width={460} label={tf("Einzug eintragen")}>
        <b>{tf("Einzug eintragen")}</b>
        <HolderField members={members} value={{user_id:move.user_id, holder_name:move.person_name}} onChange={(v)=>setMove({...move, user_id:v.user_id, person_name:v.holder_name})} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
          <Field label={tf("Einzug")}><input className="input" type="date" value={move.from_date} onChange={e=>setMove({...move,from_date:e.target.value})} /></Field>
          <Field label={tf("Auszug (optional)")}><input className="input" type="date" value={move.to_date} onChange={e=>setMove({...move,to_date:e.target.value})} /></Field>
        </div>
        <Field label={tf("Kaution (optional)")}><input className="input" inputMode="decimal" value={move.deposit} onChange={e=>setMove({...move,deposit:e.target.value})} /></Field>
        <Field label={tf("Übergabe (Zustand, Schlüssel, Inventar)")}><textarea className="input" rows={3} value={move.handover_note} onChange={e=>setMove({...move,handover_note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!move.user_id && !(move.person_name||"").trim()} onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/housing-assignments","POST",{...move, holder_name:move.person_name, user_id:move.user_id||null}); setMove(null); }, tf("Einzug eingetragen."))}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setMove(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
    </div>
  );
}

// ------------------------------------------------------------ Wartungskalender (im Gerätebuch): Prüfungen, Wartungspläne, Verträge, Dokumente, Genehmigungen
const MCAL_KIND = {pruefung:["Prüfung","wrench"], wartung:["Wartungsplan","gear"], vertrag:["Vertrag endet","filetext"], dokument:["Dokument läuft ab","file"], genehmigung:["Genehmigung läuft ab","flag"]};
function MaintenanceCalendarCard({hotel, api, onOpen}){
  const [d,setD] = useState(null); const [open,setOpen] = useState(true);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/maintenance-calendar").then(setD).catch(()=>setD({items:[]})); },[hotel.id]);
  const today = todayIso();
  const ics = () => {
    const esc = (x) => String(x||"").replace(/[\\,;]/g, (m)=>"\\"+m).replace(/\n/g," ");
    const ev = d.items.map((x,i)=>["BEGIN:VEVENT","UID:ouv-mcal-"+i+"-"+x.date+"@ouverture","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z","DTSTART;VALUE=DATE:"+x.date.replace(/-/g,""),"SUMMARY:"+esc(translateString(MCAL_KIND[x.kind][0])+": "+x.title),"DESCRIPTION:"+esc(x.detail),"END:VEVENT"].join("\r\n")).join("\r\n");
    const text = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Ouverture//Wartung//DE\r\n"+ev+"\r\nEND:VCALENDAR\r\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text],{type:"text/calendar"})); a.download = safeFile(tf("Wartungskalender")+" "+hotel.name)+".ics"; a.click();
  };
  if(!d || !d.items.length) return null;
  const late = d.items.filter(x=>x.date<today).length;
  return (
    <Card style={{marginBottom:14,borderColor:late?BAD:BORDER}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <b style={{flex:1}} {...pressable(()=>setOpen(!open))} aria-expanded={open}><Icon n="calendar" /> {tf("Wartungskalender")} <span style={{fontWeight:400,fontSize:12.5,color:late?BAD:INK_MUTED}}>· {late ? tf("{0} überfällig", late) : tf("{0} Termine in 120 Tagen", d.items.length)}</span></b>
        <button style={smallBtn} onClick={ics}>{tf("In den Kalender (ICS)")}</button>
      </div>
      {open && <div style={{marginTop:8}}>{d.items.slice(0,40).map((x,i)=>(
        <div key={i} {...pressable(()=>onOpen && onOpen(x.tab))} style={{display:"flex",gap:10,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13,cursor:"pointer"}}>
          <span style={{minWidth:86,color:x.date<today?BAD:INK,fontWeight:x.date<today?700:400}}>{fmtDate(x.date)}</span>
          <span style={{minWidth:150,color:INK_MUTED}}><Icon n={MCAL_KIND[x.kind][1]} /> {tf(MCAL_KIND[x.kind][0])}</span>
          <span style={{flex:1}} data-no-i18n="">{x.title}{x.detail ? " · "+x.detail : ""}</span>
        </div>))}</div>}
    </Card>
  );
}
