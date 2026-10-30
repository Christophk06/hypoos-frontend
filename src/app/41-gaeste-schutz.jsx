// ============================================================ Paket 043 (G): Gäste schützen und mehr verkaufen –
// Bewertungs-Frühwarnung, Allergie-Kette (Küche/Service bestätigen), Transfers (Planung, Fahrer am Handy, Gast-Statusseite),
// Upgrade-Verkauf. Rechte prüft der Server bzw. die Datenbank; die Oberfläche blendet nur aus.

const gzMain = {minHeight:44};
const gzBtn = {...smallBtn, minHeight:44};
const gzMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD_TEXT:BAD,fontSize:13,margin:"8px 0"}}>{msg.text}</div> : null;
const gzH = (text) => <h2 className="ui-h" style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,margin:"0 0 6px"}}>{text}</h2>;
const gzMoney = (hotel, v) => v==null || v==="" ? "–" : Number(v).toLocaleString(UI_LOCALE,{style:"currency",currency:(hotel&&hotel.currency)||"EUR"});
const gzIsReception = () => canManageDept("Rezeption & Empfang") || (ACCESS.role!=="viewer" && (ACCESS.depts||[]).includes("Rezeption & Empfang"));
const gzIsFb = () => canManageDept("Food & Beverage") || (ACCESS.role!=="viewer" && (ACCESS.depts||[]).includes("Food & Beverage"));
const gzAllergenName = (k) => { const a = ALLERGENS.find(x=>x[0]===k); return a ? tf(a[1]) : k; };
// datetime-local (Ortszeit des Geräts) ↔ ISO
const gzLocalInput = (iso) => { if(!iso) return ""; const d = new Date(iso); const p = (n)=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); };
const gzTime = (iso) => new Date(iso).toLocaleTimeString(UI_LOCALE,{hour:"2-digit",minute:"2-digit"});

// ------------------------------------------------------------ 1. Bewertungs-Frühwarnung (Rezeption)
const GZ_REASON = {
  tickets: (n)=>tf("{0} offene Meldungen im Zimmer", n),
  room_not_ready: (n)=>tf("Zimmer {0} Min. nach Ankunftszeit nicht fertig", n),
  wishes: (n)=>tf("{0} offene Gästewünsche", n),
  orders: (n)=>tf("{0} offene Bestellungen", n),
  feedback: ()=>tf("Schlechte Bewertung im Feedback"),
  complaint: ()=>tf("Beschwerde im Gäste-Chat"),
  unanswered: ()=>tf("Chat-Nachricht unbeantwortet"),
  vip: ()=>tf("VIP-Gast"),
};
const gzScoreColor = (s) => s>=70 ? [BAD, BAD_SOFT] : s>=40 ? [WARN_TEXT, WARN_SOFT] : [GOOD_TEXT, GOOD_SOFT];
function GuestRiskCard({hotel, api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [notes,setNotes] = useState({}); const [busy,setBusy] = useState("");
  const load = useCallback(()=>{ api("/api/hotels/"+hotel.id+"/guest-risk").then(setList).catch(e=>{ setList([]); setMsg({ok:false,text:e.message}); }); },[hotel.id]);
  useEffect(()=>{ load(); const t = setInterval(load, 5*60000); return ()=>clearInterval(t); },[load]);
  const patch = async (r, body) => {
    if(!r.id) return; setBusy(r.id); setMsg(null);
    try { await api("/api/guest-risk/"+r.id,"PATCH",body); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy("");
  };
  const open = (list||[]).filter(r=>!r.handled_at), done = (list||[]).filter(r=>r.handled_at);
  return (
    <Card style={{marginBottom:14}}>
      {gzH(tf("Bewertungs-Frühwarnung"))}
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Gäste im Haus mit Warnsignalen: Meldungen im Zimmer, Zimmer nicht fertig bei Ankunft, offene Wünsche und Bestellungen, schlechtes Feedback, Beschwerden im Gäste-Chat. Ab 70 Punkten kommt eine Push-Nachricht an die Rezeption. Die Punkte sind eine Schätzung – bitte selbst einschätzen.")}</div>
      {gzMsg(msg)}
      {!list ? <div style={{color:INK_MUTED}}>{tf("Lädt…")}</div> : !list.length ? <div style={{color:GOOD_TEXT}}>{tf("Keine Warnsignale – alle Gäste ohne Auffälligkeiten.")}</div> : null}
      {open.map(r=>{ const [c,bg] = gzScoreColor(r.score); return (
        <div key={r.arrival_guest_id} style={{borderTop:`1px solid ${BORDER}`,padding:"10px 0"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{minWidth:44,textAlign:"center",fontWeight:700,color:c,background:bg,borderRadius:8,padding:"6px 8px"}} aria-label={tf("Punkte: {0} von 100", r.score)}>{r.score}</span>
            <div style={{flex:1,minWidth:180}}>
              <b data-no-i18n="">{r.guest_name}</b> <span style={{color:INK_MUTED}}>· {tf("Zimmer")} <span data-no-i18n="">{r.room}</span></span>{r.vip && <span> <Pill color={BRASS_TEXT} bg={BRASS_SOFT}>VIP</Pill></span>}
              {r.likely_unhappy && <div style={{color:BAD,fontSize:13,fontWeight:600}}>{tf("wahrscheinlich unzufrieden")}</div>}
              <div style={{fontSize:13,color:INK_MUTED}}>{r.reasons.filter(x=>x.key!=="vip").map(x=>(GZ_REASON[x.key]||(()=>x.key))(x.n)).join(" · ")}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <input className="input" style={{flex:1,minWidth:180,minHeight:44}} aria-label={tf("Notiz")} placeholder={tf("Notiz (z. B. Getränk aufs Zimmer, Anruf)")} maxLength={1000}
              value={notes[r.arrival_guest_id]!==undefined ? notes[r.arrival_guest_id] : r.note||""} onChange={e=>setNotes({...notes,[r.arrival_guest_id]:e.target.value})} />
            <button style={gzBtn} disabled={!r.id || busy===r.id} onClick={()=>patch(r,{note:notes[r.arrival_guest_id]!==undefined ? notes[r.arrival_guest_id] : r.note||""})}>{tf("Notiz speichern")}</button>
            <button className="btn-primary" style={gzMain} disabled={!r.id || busy===r.id} onClick={()=>patch(r,{handled:true, ...(notes[r.arrival_guest_id]!==undefined?{note:notes[r.arrival_guest_id]}:{})})}>✓ {tf("Erledigt")}</button>
          </div>
        </div>
      ); })}
      {done.length>0 && <details style={{marginTop:10}}>
        <summary style={{cursor:"pointer",minHeight:32,fontSize:13}}>{tf("Erledigt ({0})", done.length)}</summary>
        {done.map(r=><div key={r.arrival_guest_id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
          <span style={{flex:1}}><span data-no-i18n="">{r.guest_name} · {r.room}</span> · {r.score} {r.note ? <span style={{color:INK_MUTED}} data-no-i18n=""> – {r.note}</span> : null}</span>
          <button style={gzBtn} disabled={busy===r.id} onClick={()=>patch(r,{handled:false})}>{tf("Wieder öffnen")}</button>
        </div>)}
      </details>}
    </Card>
  );
}

// ------------------------------------------------------------ 2. Allergie-Kette
function GzAllergenPicker({value, onChange}){
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6}} role="group" aria-label={tf("Allergene")}>
      {ALLERGENS.map(([c,n])=>{ const on = value.includes(c); return (
        <button key={c} type="button" aria-pressed={on} onClick={()=>onChange(on ? value.filter(x=>x!==c) : [...value,c].sort())}
          style={{minHeight:44,borderRadius:8,padding:"6px 10px",fontSize:13,cursor:"pointer",border:`1px solid ${on?BAD:BORDER}`,background:on?BAD_SOFT:"#fff",color:on?BAD:INK,fontWeight:on?700:400}}>
          <b>{c}</b> {tf(n)}
        </button>); })}
    </div>
  );
}
// Pro Anreise (Rezeption): Allergien ansehen und ergänzen. Props: guest (arrival_guests-Zeile), api
function ArrivalAllergyEditor({guest, api}){
  const [cur,setCur] = useState(undefined); const [edit,setEdit] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  useEffect(()=>{ api("/api/arrivals/"+guest.id+"/allergies").then(setCur).catch(()=>setCur(null)); },[guest.id]);
  if(cur===undefined) return null;
  const save = async () => { setBusy(true); setMsg(null);
    try { const r = await api("/api/arrivals/"+guest.id+"/allergies","PUT",{allergens:edit.allergens, note:edit.note}); setCur(r); setEdit(null); setMsg({ok:true,text:tf("Gespeichert.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const has = cur && ((cur.allergens||[]).length || cur.note);
  return (
    <div style={{marginTop:6}}>
      {!edit && <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        {has ? <Pill color={BAD} bg={BAD_SOFT}>⚠ {tf("Allergien")}: {(cur.allergens||[]).map(gzAllergenName).join(", ")}{cur.note ? " · "+cur.note : ""}</Pill> : <span style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Allergien bekannt")}</span>}
        {has && cur.source==="anreise" && <span style={{fontSize:12,color:INK_MUTED}}>{tf("vom Gast angegeben")}</span>}
        {gzIsReception() && <button style={gzBtn} onClick={()=>setEdit({allergens:(cur&&cur.allergens)||[], note:(cur&&cur.note)||""})}>{has ? tf("Allergien ändern") : tf("Allergien eintragen")}</button>}
      </div>}
      {edit && <div style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:10}}>
        <GzAllergenPicker value={edit.allergens} onChange={(a)=>setEdit({...edit,allergens:a})} />
        <Field label={tf("Hinweis für Küche und Service")}><textarea className="input" rows={2} maxLength={500} value={edit.note} onChange={e=>setEdit({...edit,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" style={gzMain} disabled={busy} onClick={save}>{busy?"…":tf("Speichern")}</button><button style={gzBtn} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button></div>
      </div>}
      {gzMsg(msg)}
    </div>
  );
}
function gzProtocolHtml(hotel, d){
  const yes = (a) => a.at ? fsEsc((a.by||"").split("@")[0]+" · "+fmtDateTime(a.at)) : '<span class="bad">'+fsT("fehlt")+'</span>';
  return FS_TABLE+'<div class="fs land" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Allergie-Protokoll Küche und Service"), fmtDate(d.from)+" – "+fmtDate(d.to))
    + '<table class="t"><thead><tr><th>'+fsT("Tag")+'</th><th>'+fsT("Mahlzeit")+'</th><th>'+fsT("Gast")+'</th><th>'+fsT("Zimmer")+'</th><th>'+fsT("Allergene")+'</th><th>'+fsT("Küche")+'</th><th>'+fsT("Service")+'</th></tr></thead><tbody>'
    + (d.rows.length ? d.rows.map(r=>'<tr><td>'+fsEsc(fmtDate(r.date))+'</td><td>'+fsT(r.meal)+'</td><td>'+fsEsc(r.guest_name)+'</td><td>'+fsEsc(r.room)+'</td><td>'+fsEsc(r.allergens.map(k=>k+" "+gzAllergenName(k)).join(", "))+(r.note?'<br><i>'+fsEsc(r.note)+'</i>':'')+'</td><td>'+yes(r.acks[0])+'</td><td>'+yes(r.acks[1])+'</td></tr>').join("")
      : '<tr><td colspan="7">'+fsT("Keine Gäste mit Allergien in diesem Zeitraum.")+'</td></tr>')
    + '</tbody></table>'+fsFoot()+'</div>';
}
// Küche und Service: je Mahlzeit die Gäste mit Allergien, bestätigen; Protokoll als PDF. Props: hotel, api
function AllergyBoard({hotel, api}){
  const [day,setDay] = useState(todayIso()); const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState("");
  const [range,setRange] = useState({from:addDaysIso(todayIso(),-6), to:todayIso()});
  const load = useCallback(()=>{ api("/api/hotels/"+hotel.id+"/allergy-board?date="+day).then(setD).catch(e=>{ setD({meals:[]}); setMsg({ok:false,text:e.message}); }); },[hotel.id, day]);
  useEffect(()=>{ load(); },[load]);
  const ack = async (g, meal, department) => { const k = g.allergy_id+meal+department; setBusy(k); setMsg(null);
    try { await api("/api/allergies/"+g.allergy_id+"/ack","POST",{meal_date:day, meal, department}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const pdf = async () => { setBusy("pdf"); setMsg(null);
    try { const p = await api("/api/hotels/"+hotel.id+"/allergy-protocol?from="+range.from+"&to="+range.to); await sheetPdf(gzProtocolHtml(hotel, p), safeFile(translateString("Allergie-Protokoll")+" "+p.from+" "+p.to)+".pdf", false, "landscape"); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const canAck = gzIsFb();
  return (
    <Card style={{marginBottom:14}}>
      {gzH(tf("Allergien je Mahlzeit"))}
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Küche und Service bestätigen vor jeder Mahlzeit, dass sie die Allergien kennen. Fehlt 30 Minuten vor Beginn eine Bestätigung, bekommt die Leitung Food & Beverage eine Push-Nachricht. Gesundheitsdaten – nur für den Service am Gast verwenden.")}</div>
      <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
        <Field label={tf("Tag")}><input className="input" type="date" value={day} onChange={e=>e.target.value && setDay(e.target.value)} /></Field>
        <button style={{...gzBtn,marginBottom:14}} onClick={()=>setDay(todayIso())}>{tf("Heute")}</button>
        <button style={{...gzBtn,marginBottom:14}} onClick={()=>setDay(addDaysIso(todayIso(),1))}>{tf("Morgen")}</button>
      </div>
      {gzMsg(msg)}
      {!d ? <div style={{color:INK_MUTED}}>{tf("Lädt…")}</div> : d.meals.map(m=>(
        <div key={m.meal} style={{borderTop:`1px solid ${BORDER}`,padding:"10px 0"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
            <b style={{fontSize:15}}>{tf(m.meal)}</b><span style={{color:INK_MUTED,fontSize:13}}>{tf("ab {0} Uhr", m.start)}</span>
            {m.guests.length===0 ? <span style={{fontSize:13,color:INK_MUTED}}>· {tf("keine Gäste mit Allergien")}</span>
              : m.missing.length ? <Pill color={WARN_TEXT} bg={WARN_SOFT}>{tf("offen")}: {m.missing.map(x=>tf(x)).join(", ")}</Pill> : <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>✓ {tf("alles bestätigt")}</Pill>}
          </div>
          {m.guests.map(g=>(
            <div key={g.allergy_id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"6px 0"}}>
              <div style={{flex:1,minWidth:200}}>
                <b data-no-i18n="">{g.room ? g.room+" · " : ""}{g.guest_name}</b>{g.persons ? <span style={{color:INK_MUTED,fontSize:13}}> · {tf("{0} Personen", g.persons)}</span> : null}
                <div style={{color:BAD,fontWeight:600,fontSize:13.5}}>⚠ {g.allergens.map(k=>k+" "+gzAllergenName(k)).join(", ")}</div>
                {g.note && <div style={{fontSize:13}} data-no-i18n="">{g.note}</div>}
              </div>
              {["Küche","Service"].map(dep=> g.acks[dep]
                ? <span key={dep} style={{fontSize:12.5,color:GOOD_TEXT}}>✓ {tf(dep)} {gzTime(g.acks[dep].at)}</span>
                : canAck ? <button key={dep} style={gzBtn} disabled={busy===g.allergy_id+m.meal+dep} onClick={()=>ack(g, m.meal, dep)} aria-label={tf("{0} bestätigt Allergien von {1}", tf(dep), g.guest_name)}>✓ {tf(dep)}</button>
                : <span key={dep} style={{fontSize:12.5,color:WARN_TEXT}}>{tf(dep)}: {tf("offen")}</span>)}
            </div>
          ))}
        </div>
      ))}
      <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:10,display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
        <Field label={tf("Protokoll von")}><input className="input" type="date" value={range.from} onChange={e=>setRange({...range,from:e.target.value})} /></Field>
        <Field label={tf("bis")}><input className="input" type="date" value={range.to} onChange={e=>setRange({...range,to:e.target.value})} /></Field>
        <button style={{...gzBtn,marginBottom:14}} disabled={busy==="pdf"} onClick={pdf}><Icon n="filetext" /> {busy==="pdf"?"…":tf("Protokoll (PDF)")}</button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ 3. Transfers
const GZ_TR_STATUS = {geplant:[INK_MUTED,PAPER], unterwegs:[WARN_TEXT,WARN_SOFT], erledigt:[GOOD_TEXT,GOOD_SOFT], abgesagt:[BAD,BAD_SOFT]};
const gzEmptyTransfer = (s) => ({guest_name:"", room_number:"", direction:"Abholung", pickup_at:"", place:(s.places||[])[0]||"", flight_no:"", pax:1, driver_id:"", vehicle:"", price:"", note:""});
function GzTransferForm({hotel, api, members, value, onDone, onCancel}){
  const s = hotel.transfer_settings || {};
  const [f,setF] = useState(value); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const set = (k) => (e) => setF({...f,[k]:e.target.value});
  const save = async () => { setBusy(true); setMsg(null);
    try {
      const body = {...f, pickup_at: f.pickup_at ? new Date(f.pickup_at).toISOString() : "", price: f.price===""||f.price==null ? null : f.price};
      delete body.id; delete body.link; delete body.status; delete body.hotel_id; delete body.created_at; delete body.guest_notified_at; delete body.arrival_guest_id;
      const r = f.id ? await api("/api/transfers/"+f.id,"PATCH",body) : await api("/api/hotels/"+hotel.id+"/transfers","POST",body);
      onDone(r);
    } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const drivers = (members||[]).filter(m=>m.role!=="viewer");
  return (
    <div style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:12,marginBottom:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"0 12px"}}>
        <Field label={tf("Gast")}><input className="input" maxLength={160} value={f.guest_name||""} onChange={set("guest_name")} /></Field>
        <Field label={tf("Zimmer")}><input className="input" maxLength={20} value={f.room_number||""} onChange={set("room_number")} /></Field>
        <Field label={tf("Richtung")}><select className="input" value={f.direction} onChange={set("direction")}><option value="Abholung">{tf("Abholung")}</option><option value="Bringen">{tf("Bringen")}</option></select></Field>
        <Field label={tf("Datum und Uhrzeit")}><input className="input" type="datetime-local" value={f.pickup_at||""} onChange={set("pickup_at")} /></Field>
        <Field label={tf("Ort")}>
          <input className="input" list="gz-places" maxLength={160} value={f.place||""} onChange={e=>{ const pl = e.target.value; const p = (s.prices||{})[pl]; setF({...f, place:pl, price: f.price==="" && p!=null ? String(p) : f.price}); }} />
        </Field>
        <datalist id="gz-places">{(s.places||[]).map(p=><option key={p} value={p} />)}</datalist>
        <Field label={tf("Flug- oder Zugnummer")}><input className="input" maxLength={20} value={f.flight_no||""} onChange={set("flight_no")} /></Field>
        <Field label={tf("Personen")}><input className="input" type="number" min={1} max={60} value={f.pax} onChange={set("pax")} /></Field>
        <Field label={tf("Fahrer/in")}><select className="input" value={f.driver_id||""} onChange={set("driver_id")}><option value="">{tf("– noch offen –")}</option>{drivers.map(m=><option key={m.user_id} value={m.user_id} data-no-i18n="">{shortName(m.email)}</option>)}</select></Field>
        <Field label={tf("Fahrzeug")}><input className="input" maxLength={80} value={f.vehicle||""} onChange={set("vehicle")} /></Field>
        <Field label={tf("Preis")}><input className="input" inputMode="decimal" value={f.price==null?"":f.price} onChange={set("price")} /></Field>
      </div>
      <Field label={tf("Notiz")}><textarea className="input" rows={2} maxLength={1000} value={f.note||""} onChange={set("note")} /></Field>
      {gzMsg(msg)}
      <div style={{display:"flex",gap:8}}><button className="btn-primary" style={gzMain} disabled={busy} onClick={save}>{busy?"…":tf("Speichern")}</button><button style={gzBtn} onClick={onCancel}>{tf("Abbrechen")}</button></div>
    </div>
  );
}
function GzTransferSettings({hotel, api, onHotel}){
  const s0 = hotel.transfer_settings || {};
  const [text,setText] = useState((s0.places||[]).map(p=>p+((s0.prices||{})[p]!=null?" ; "+s0.prices[p]:"")).join("\n"));
  const [enabled,setEnabled] = useState(!!s0.enabled); const [msg,setMsg] = useState(null);
  const save = async () => { setMsg(null);
    const lines = text.split("\n").map(l=>l.split(";").map(x=>x.trim())).filter(x=>x[0]);
    const prices = {}; lines.forEach(([p,v])=>{ if(v) prices[p] = v; });
    try { const h = await api("/api/hotels/"+hotel.id+"/guest2-settings","PUT",{transfer_settings:{enabled, places:lines.map(x=>x[0]), prices}}); onHotel && onHotel(h); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <details style={{marginTop:10}}><summary style={{cursor:"pointer",minHeight:32,fontSize:13}}>{tf("Einstellungen: Orte und Preise")}</summary>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:44}}><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /> {tf("Transfers anbieten")}</label>
      <Field label={tf("Orte, je Zeile „Ort ; Preis“ (Preis optional)")}><textarea className="input" rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder={"Flughafen Salzburg ; 65\nBahnhof ; 20"} /></Field>
      <button className="btn-primary" style={gzMain} onClick={save}>{tf("Speichern")}</button>{gzMsg(msg)}
    </details>
  );
}
// Planung für die Rezeption. Props: hotel, api, members, onHotel (nach Einstellungen), role
function TransferPlanner({hotel, api, members, onHotel, role}){
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState("");
  const [from,setFrom] = useState(todayIso());
  const load = useCallback(()=>{ api("/api/hotels/"+hotel.id+"/transfers?from="+from+"&to="+addDaysIso(from,13)).then(setList).catch(e=>{ setList([]); setMsg({ok:false,text:e.message}); }); },[hotel.id, from]);
  useEffect(()=>{ load(); },[load]);
  const act = async (t, fn) => { setBusy(t.id); setMsg(null); try { await fn(); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const notify = (t) => act(t, async ()=>{ let email; if(!t.arrival_guest_id){ email = window.prompt(tf("E-Mail-Adresse des Gastes")); if(!email) return; } await api("/api/transfers/"+t.id+"/notify","POST",{email}); setMsg({ok:true,text:tf("E-Mail mit Status-Link verschickt.")}); });
  const bill = (t) => act(t, async ()=>{ const r = await api("/api/transfers/"+t.id+"/bill","POST",{}); setMsg({ok:r.billed, text: r.already ? tf("Schon auf der Zimmerrechnung.") : tf(r.hint||"")}); });
  const del = (t) => act(t, async ()=>{ if(!window.confirm(tf("Transfer löschen?"))) return; await api("/api/transfers/"+t.id,"DELETE"); });
  const copy = async (t) => { try { await navigator.clipboard.writeText(t.link); setMsg({ok:true,text:tf("Link kopiert.")}); } catch(e){ setMsg({ok:false,text:tf("Kopieren nicht möglich – bitte den Text markieren.")}); } };
  const nameOf = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
  const days = {}; (list||[]).forEach(t=>{ const k = gzLocalInput(t.pickup_at).slice(0,10); (days[k] = days[k]||[]).push(t); });
  return (
    <Card style={{marginBottom:14}}>
      {gzH(tf("Transfers"))}
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Abholungen und Fahrten planen. Fahrerinnen und Fahrer sehen ihre Fahrten am Handy, der Gast bekommt einen Link mit Zeit, Ort, Vorname der Fahrerin bzw. des Fahrers und Status.")}</div>
      <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
        <Field label={tf("Ab")}><input className="input" type="date" value={from} onChange={e=>e.target.value && setFrom(e.target.value)} /></Field>
        {gzIsReception() && !form && <button className="btn-primary" style={{...gzMain,marginBottom:14}} onClick={()=>setForm(gzEmptyTransfer(hotel.transfer_settings||{}))}>+ {tf("Neuer Transfer")}</button>}
      </div>
      {form && <GzTransferForm hotel={hotel} api={api} members={members} value={form} onCancel={()=>setForm(null)} onDone={()=>{ setForm(null); load(); }} />}
      {gzMsg(msg)}
      {!list ? <div style={{color:INK_MUTED}}>{tf("Lädt…")}</div> : !list.length ? <div style={{color:INK_MUTED}}>{tf("Keine Transfers in den nächsten 14 Tagen.")}</div> : null}
      {Object.keys(days).sort().map(k=>(
        <div key={k} style={{marginTop:8}}>
          <div style={{fontWeight:700,fontSize:13,color:INK_MUTED,marginBottom:4}}>{fmtDate(k+"T12:00:00")}</div>
          {days[k].map(t=>{ const [c,bg] = GZ_TR_STATUS[t.status]||GZ_TR_STATUS.geplant; return (
            <div key={t.id} style={{borderTop:`1px solid ${BORDER}`,padding:"8px 0"}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <b style={{minWidth:52}}>{gzTime(t.pickup_at)}</b>
                <span style={{flex:1,minWidth:180}}>{tf(t.direction)} · <span data-no-i18n="">{t.place}</span> · <b data-no-i18n="">{t.guest_name}</b>{t.room_number ? <span data-no-i18n=""> ({t.room_number})</span> : null} · {tf("{0} Pers.", t.pax)}{t.flight_no ? <span data-no-i18n=""> · {t.flight_no}</span> : null}</span>
                <Pill color={c} bg={bg}>{tf(t.status)}</Pill>
              </div>
              <div style={{fontSize:13,color:INK_MUTED,marginTop:2}}>{t.driver_id ? tf("Fahrer/in: {0}", nameOf(t.driver_id)) : <span style={{color:WARN_TEXT}}>{tf("Fahrer/in noch offen")}</span>}{t.vehicle ? " · "+t.vehicle : ""}{t.price!=null ? " · "+gzMoney(hotel,t.price) : ""}{t.guest_notified_at ? " · ✉ "+fmtDateTime(t.guest_notified_at) : ""}</div>
              {gzIsReception() && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                <select className="input" style={{width:"auto",minHeight:44}} aria-label={tf("Status")} value={t.status} disabled={busy===t.id} onChange={e=>act(t, ()=>api("/api/transfers/"+t.id,"PATCH",{status:e.target.value}))}>
                  {["geplant","unterwegs","erledigt","abgesagt"].map(x=><option key={x} value={x}>{tf(x)}</option>)}
                </select>
                <button style={gzBtn} onClick={()=>setForm({...t, pickup_at:gzLocalInput(t.pickup_at), driver_id:t.driver_id||"", price:t.price==null?"":String(t.price)})}>{tf("Bearbeiten")}</button>
                <button style={gzBtn} disabled={busy===t.id || ["erledigt","abgesagt"].includes(t.status)} onClick={()=>notify(t)}>✉ {tf("Gast informieren")}</button>
                {t.link && <button style={gzBtn} onClick={()=>copy(t)}>{tf("Link kopieren")}</button>}
                {Number(t.price)>0 && <button style={gzBtn} disabled={busy===t.id} onClick={()=>bill(t)}>{tf("Auf Zimmerrechnung")}</button>}
                <button style={{...gzBtn,color:BAD}} disabled={busy===t.id} onClick={()=>del(t)} aria-label={tf("Transfer löschen")}><span aria-hidden="true">✕</span></button>
              </div>}
            </div>
          ); })}
        </div>
      ))}
      {role==="admin" && <GzTransferSettings hotel={hotel} api={api} onHotel={onHotel} />}
    </Card>
  );
}
// Fahrer-Ansicht am Handy: eigene Fahrten (heute und morgen), Status mit großen Knöpfen. Props: hotel, api
function DriverTransfers({hotel, api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState("");
  const load = useCallback(()=>{ api("/api/hotels/"+hotel.id+"/transfers?mine=1&from="+todayIso()+"&to="+addDaysIso(todayIso(),1)).then(setList).catch(e=>{ setList([]); setMsg({ok:false,text:e.message}); }); },[hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const setStatus = async (t, status) => { setBusy(t.id); setMsg(null); try { await api("/api/transfers/"+t.id,"PATCH",{status}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const big = {minHeight:52,flex:1,fontSize:15,fontWeight:700,borderRadius:10};
  return (
    <Card style={{marginBottom:14}}>
      {gzH(tf("Meine Fahrten"))}
      {gzMsg(msg)}
      {!list ? <div style={{color:INK_MUTED}}>{tf("Lädt…")}</div> : !list.length ? <div style={{color:INK_MUTED}}>{tf("Heute und morgen keine Fahrten für dich.")}</div> : null}
      {(list||[]).map(t=>{ const [c,bg] = GZ_TR_STATUS[t.status]||GZ_TR_STATUS.geplant; return (
        <div key={t.id} style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <b style={{fontSize:20}}>{gzTime(t.pickup_at)}</b><Pill color={c} bg={bg}>{tf(t.status)}</Pill>
          </div>
          <div style={{fontSize:13,color:INK_MUTED}}>{fmtDate(t.pickup_at)}</div>
          <div style={{fontSize:15,marginTop:6}}>{tf(t.direction)} · <b data-no-i18n="">{t.place}</b></div>
          <div style={{fontSize:14}} data-no-i18n="">{t.guest_name}{t.room_number ? " · "+t.room_number : ""} · {t.pax} ×{t.flight_no ? " · "+t.flight_no : ""}</div>
          {t.vehicle && <div style={{fontSize:13,color:INK_MUTED}} data-no-i18n="">{t.vehicle}</div>}
          {t.note && <div style={{fontSize:13,marginTop:4}} data-no-i18n="">{t.note}</div>}
          {!["erledigt","abgesagt"].includes(t.status) && <div style={{display:"flex",gap:8,marginTop:10}}>
            {t.status==="geplant" && <button className="btn-primary" style={big} disabled={busy===t.id} onClick={()=>setStatus(t,"unterwegs")}>{tf("Losgefahren")}</button>}
            {t.status==="unterwegs" && <button className="btn-primary" style={big} disabled={busy===t.id} onClick={()=>setStatus(t,"erledigt")}>✓ {tf("Erledigt")}</button>}
            {t.status==="unterwegs" && <button style={{...gzBtn,...big,fontWeight:400}} disabled={busy===t.id} onClick={()=>setStatus(t,"geplant")}>{tf("Zurück")}</button>}
          </div>}
        </div>
      ); })}
    </Card>
  );
}

// ------------------------------------------------------------ 4. Upgrade-Verkauf
function GzUpgradeSettings({hotel, api, onHotel}){
  const s0 = hotel.upgrade_settings || {};
  const [s,setS] = useState({enabled:!!s0.enabled, ranking:(s0.ranking||[]).join("\n"), price_per_step:s0.price_per_step||""}); const [msg,setMsg] = useState(null);
  const save = async () => { setMsg(null);
    try { const h = await api("/api/hotels/"+hotel.id+"/guest2-settings","PUT",{upgrade_settings:{enabled:s.enabled, ranking:s.ranking.split("\n").map(x=>x.trim()).filter(Boolean), price_per_step:s.price_per_step}}); onHotel && onHotel(h); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <details style={{marginTop:10}}><summary style={{cursor:"pointer",minHeight:32,fontSize:13}}>{tf("Einstellungen: Rangfolge und Preis")}</summary>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:44}}><input type="checkbox" checked={s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> {tf("Upgrade-Vorschläge anzeigen")}</label>
      <Field label={tf("Zimmertypen von einfach bis beste, je Zeile einer (genau wie in der Zimmerliste)")}><textarea className="input" rows={4} value={s.ranking} onChange={e=>setS({...s,ranking:e.target.value})} placeholder={"Standard\nSuperior\nJunior Suite\nSuite"} /></Field>
      <Field label={tf("Preis je Stufe und Nacht")}><input className="input" inputMode="decimal" value={s.price_per_step} onChange={e=>setS({...s,price_per_step:e.target.value})} /></Field>
      <button className="btn-primary" style={gzMain} onClick={save}>{tf("Speichern")}</button>{gzMsg(msg)}
    </details>
  );
}
// Props: hotel, api, role, onHotel
function UpgradeCard({hotel, api, role, onHotel}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(""); const [prices,setPrices] = useState({});
  const load = useCallback(()=>{ api("/api/hotels/"+hotel.id+"/upgrades").then(setD).catch(e=>{ setD({suggestions:[],today:[],stats:null,settings:{}}); setMsg({ok:false,text:e.message}); }); },[hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const offer = async (s) => { setBusy(s.arrival_guest_id); setMsg(null);
    try { await api("/api/hotels/"+hotel.id+"/upgrades","POST",{arrival_guest_id:s.arrival_guest_id, to_room:s.to_room, from_room_type:s.from_room_type, price: prices[s.arrival_guest_id]!==undefined ? prices[s.arrival_guest_id] : s.price}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const decide = async (o, status) => { setBusy(o.id); setMsg(null);
    try { const r = await api("/api/upgrades/"+o.id,"PATCH",{status}); if(r.hint) setMsg({ok:true,text:tf(r.hint)}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const st = d && d.stats;
  return (
    <Card style={{marginBottom:14}}>
      {gzH(tf("Upgrade-Verkauf"))}
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Freie, bessere Zimmer für die heutigen Anreisen – VIP und Stammgäste zuerst. Preis vorschlagen, beim Check-in anbieten, Ergebnis eintragen. Umbuchung und Abrechnung im PMS bitte selbst vornehmen.")}</div>
      {gzMsg(msg)}
      {!d ? <div style={{color:INK_MUTED}}>{tf("Lädt…")}</div> : !d.settings.enabled || !(d.settings.ranking||[]).length
        ? <div style={{color:WARN_TEXT,fontSize:13}}>{tf("Noch nicht eingerichtet: Rangfolge der Zimmertypen festlegen und einschalten (Admin).")}</div>
        : !d.suggestions.length ? <div style={{color:INK_MUTED}}>{tf("Heute keine passenden freien Zimmer oder alle Gäste haben schon ein Angebot.")}</div> : null}
      {d && d.suggestions.map(s=>(
        <div key={s.arrival_guest_id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderTop:`1px solid ${BORDER}`,padding:"8px 0"}}>
          <div style={{flex:1,minWidth:200}}>
            <b data-no-i18n="">{s.guest_name}</b> {s.vip && <Pill color={BRASS_TEXT} bg={BRASS_SOFT}>VIP</Pill>} {s.returning && <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>{tf("Stammgast")}</Pill>}
            <div style={{fontSize:13,color:INK_MUTED}}><span data-no-i18n="">{s.from_room_type} → {s.to_room_type} ({s.to_room})</span> · {tf("{0} Nächte", s.nights)}{!s.room_ready ? " · "+tf("Zimmer noch nicht fertig") : ""}</div>
          </div>
          <input className="input" style={{width:110,minHeight:44}} inputMode="decimal" aria-label={tf("Preis für {0}", s.guest_name)} value={prices[s.arrival_guest_id]!==undefined ? prices[s.arrival_guest_id] : String(s.price)} onChange={e=>setPrices({...prices,[s.arrival_guest_id]:e.target.value})} />
          <button className="btn-primary" style={gzMain} disabled={busy===s.arrival_guest_id} onClick={()=>offer(s)}>{tf("Anbieten")}</button>
        </div>
      ))}
      {d && d.today.length>0 && <div style={{marginTop:12}}>
        <b style={{fontSize:14}}>{tf("Angebote heute")}</b>
        {d.today.map(o=>(
          <div key={o.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderTop:`1px solid ${BORDER}`,padding:"8px 0"}}>
            <span style={{flex:1,minWidth:180}}><b data-no-i18n="">{o.guest_name}</b> → <span data-no-i18n="">{o.to_room}</span> · {gzMoney(hotel,o.price)}</span>
            {o.status==="vorgeschlagen" ? <React.Fragment>
              <button className="btn-primary" style={gzMain} disabled={busy===o.id} onClick={()=>decide(o,"angenommen")}>✓ {tf("Angenommen")}</button>
              <button style={gzBtn} disabled={busy===o.id} onClick={()=>decide(o,"abgelehnt")}>{tf("Abgelehnt")}</button>
            </React.Fragment> : <React.Fragment>
              <Pill color={o.status==="angenommen"?GOOD_TEXT:INK_MUTED} bg={o.status==="angenommen"?GOOD_SOFT:PAPER}>{tf(o.status)}</Pill>
              <button style={gzBtn} disabled={busy===o.id} onClick={()=>decide(o,"vorgeschlagen")}>{tf("Zurücksetzen")}</button>
            </React.Fragment>}
          </div>
        ))}
      </div>}
      {st && st.offered>0 && <div style={{marginTop:12,borderTop:`1px solid ${BORDER}`,paddingTop:10}}>
        <b style={{fontSize:14}}>{tf("Ergebnis der letzten 12 Monate")}</b>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,marginTop:6}}>
          <span>{tf("Angeboten")}: <b>{st.offered}</b></span><span>{tf("Angenommen")}: <b>{st.accepted}</b></span><span>{tf("Quote")}: <b>{st.rate==null?"–":st.rate+" %"}</b></span><span>{tf("Mehrumsatz")}: <b>{gzMoney(hotel,st.revenue)}</b></span>
        </div>
        {st.months.length>0 && <table style={{width:"100%",fontSize:13,marginTop:6,borderCollapse:"collapse"}}><caption className="sr-only">{tf("Mehrumsatz je Monat")}</caption><tbody>
          {st.months.slice(-6).map(m=><tr key={m.month}><td style={{padding:"3px 0"}}>{m.month}</td><td style={{textAlign:"end"}}>{gzMoney(hotel,m.revenue)}</td></tr>)}
        </tbody></table>}
      </div>}
      {role==="admin" && <GzUpgradeSettings hotel={hotel} api={api} onHotel={onHotel} />}
    </Card>
  );
}

// ------------------------------------------------------------ Seite „Gäste schützen“ (Menüplatz: Gäste/Rezeption, Route "guest-protection")
// Zeigt je nach Abteilung: Rezeption → Frühwarnung, Upgrades, Transfers; F&B → Allergien; Fahrer → eigene Fahrten.
// Props: hotel, api, role, members, onHotel
function GuestProtectionView({hotel, api, role, members, onHotel}){
  const rec = gzIsReception(), fb = gzIsFb();
  const tabs = [rec && ["risk", tf("Frühwarnung")], (rec || fb) && ["allergy", tf("Allergien")], rec && ["upgrade", tf("Upgrades")], ["transfer", rec ? tf("Transfers") : tf("Meine Fahrten")]].filter(Boolean);
  const [tab,setTab] = useState(tabs[0][0]);
  return (
    <div>
      <div role="tablist" aria-label={tf("Gäste schützen")} style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {tabs.map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}
          style={{...gzBtn, background:tab===k?INK:"#fff", color:tab===k?"#fff":INK, fontWeight:tab===k?700:400}}>{l}</button>)}
      </div>
      {tab==="risk" && <GuestRiskCard hotel={hotel} api={api} />}
      {tab==="allergy" && <AllergyBoard hotel={hotel} api={api} />}
      {tab==="upgrade" && <UpgradeCard hotel={hotel} api={api} role={role} onHotel={onHotel} />}
      {tab==="transfer" && (rec ? <TransferPlanner hotel={hotel} api={api} members={members} role={role} onHotel={onHotel} /> : null)}
      {tab==="transfer" && <DriverTransfers hotel={hotel} api={api} />}
    </div>
  );
}
