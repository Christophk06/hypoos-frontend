// ============================================================ Paket 046: Arrangements (Pakete aus Spa-Leistungen, Tisch und Extras), Warteliste,
// Gutschein-Einlösung bei Spa, Restaurant und Arrangement, Tagesbericht im Dashboard. Rechte prüft die Datenbank.

const PK_EMPTY = () => ({name:"", description:"", price:"", price_per:"person", persons_min:1, persons_max:2, items:[], online:false, active:true, color:SP_COLORS[2], sort:0});
const PK_STATUS = {"angefragt":[WARN_TEXT,WARN_SOFT,"Angefragt"], "bestätigt":[GOOD_TEXT,GOOD_SOFT,"Bestätigt"], "storniert":[INK_MUTED,PAPER,"Storniert"], "erledigt":[INK_MUTED,PAPER,"Erledigt"]};
const WL_STATUS = {"wartet":"wartet","angeboten":"Angebot verschickt","gebucht":"gebucht","abgelaufen":"Angebot abgelaufen","entfernt":"entfernt"};

// Knopf „Mit Gutschein bezahlen“ – kind: bookings | table-reservations | package-bookings
function VoucherPayButton({api, kind, id, price, currency, onDone}){
  const [open,setOpen] = useState(false); const [code,setCode] = useState(""); const [amount,setAmount] = useState(price!=null?String(price):""); const [err,setErr] = useState(""); const [busy,setBusy] = useState(false);
  const pay = async () => { setErr(""); setBusy(true); try { const r = await api("/api/"+kind+"/"+id+"/voucher","POST",{code, amount}); setOpen(false); onDone && onDone(r); } catch(e){ setErr(e.message); } finally { setBusy(false); } };
  return <>
    <button style={btnLine} onClick={()=>setOpen(true)}>{tf("Mit Gutschein bezahlen")}</button>
    {open && <Overlay onClose={()=>setOpen(false)} width={400} label={tf("Mit Gutschein bezahlen")}>
      <b>{tf("Mit Gutschein bezahlen")}</b>
      <Field label={tf("Gutscheincode")}><input className="input" autoFocus placeholder="XXXX-XXXX-XXXX" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} style={{fontFamily:"monospace",letterSpacing:".08em"}} /></Field>
      <Field label={tf("Betrag ({0})", currency||"EUR")}><input className="input" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} /></Field>
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:8}}>{tf("Ist der Restwert kleiner, wird nur der Restwert eingelöst; den Rest bitte anders kassieren.")}</div>
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={busy || code.replace(/[^A-Z0-9]/g,"").length!==12 || !String(amount).trim()} onClick={pay}>{tf("Einlösen")}</button><button style={btnLine} onClick={()=>setOpen(false)}>{tf("Abbrechen")}</button></div>
    </Overlay>}
  </>;
}

function SpaPackages({hotel, api, services, canEdit, onChanged}){
  const [pkgs, loadPkgs] = useList(api, "/api/hotels/"+hotel.id+"/packages");
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [book,setBook] = useState(null); const [msg,setMsg] = useState(null);
  const money = moneyOf(hotel);
  const loadList = useCallback(()=>api("/api/hotels/"+hotel.id+"/package-bookings?from="+todayIso()+"&to="+addDaysIso(todayIso(),60)).then(setList).catch(()=>setList([])),[api, hotel.id]);
  useEffect(()=>{ loadList(); },[loadList]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); loadPkgs(); loadList(); onChanged && onChanged(); if(ok) setMsg({ok:true,text:ok}); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } };
  const svcName = (id) => ((services||[]).find(s=>s.id===id)||{}).name || "?";
  const pkgName = (id) => ((pkgs||[]).find(p=>p.id===id)||{}).name || "";
  const setItem = (i, patch) => { const l = form.items.map(x=>({...x})); l[i] = {...l[i], ...patch}; setForm({...form, items:l}); };
  return (
    <div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <button className="btn-primary" disabled={!(pkgs||[]).some(p=>p.active!==false)} onClick={()=>setBook({package_id:((pkgs||[]).find(p=>p.active!==false)||{}).id||"", day:todayIso(), persons:2, time:"", guest_name:"", email:"", phone:"", room_no:"", wishes:"", payment:"vor_ort"})}>{tf("Arrangement buchen")}</button>
        {canEdit && <button style={btnLine} onClick={()=>setForm(PK_EMPTY())}>{tf("Arrangement anlegen")}</button>}
      </div>
      {pkgs && pkgs.length===0 && <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Noch keine Arrangements. Beispiel: Spa-Tag mit Massage, Sauna und Mittagessen – oder Romantik mit Paarmassage, Tisch und einem Glas Sekt.")}</div>}
      {(pkgs||[]).map(p=><div key={p.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"8px 10px",border:`1px solid ${BORDER}`,borderInlineStart:`4px solid ${p.color||BRASS}`,borderRadius:8,marginBottom:6,background:"#fff",opacity:p.active===false?0.55:1}}>
        <b style={{minWidth:140}} data-no-i18n="">{p.name}</b>
        <span style={{flex:1,fontSize:12.5,color:INK_MUTED}}>{(p.items||[]).map(i=>i.kind==="service" ? "+"+(i.offset_min||0)+" "+tf("Min.")+" "+svcName(i.service_id) : i.kind==="table" ? "+"+(i.offset_min||0)+" "+tf("Min.")+" "+tf("Tisch") : i.text).join(" · ")}</span>
        <span style={{fontSize:13}}>{p.price==null ? "–" : money(p.price)+(p.price_per==="person"?" / "+tf("Person"):"")}</span>
        {p.online && <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>{tf("online")}</Pill>}
        {canEdit && <button style={linkBtn} onClick={()=>setForm({...PK_EMPTY(), ...p, price:p.price??"", items:(p.items||[]).map(x=>({...x}))})}>{tf("Bearbeiten")}</button>}
      </div>)}
      <b style={{fontSize:13.5,display:"block",marginTop:16}}>{tf("Gebuchte Arrangements (nächste 60 Tage)")}</b>
      {list && list.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine.")}</div>}
      {(list||[]).map(b=>{ const st = PK_STATUS[b.status]||PK_STATUS["bestätigt"]; return <div key={b.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,fontSize:13.5,opacity:b.status==="storniert"?0.55:1}}>
        <b style={{minWidth:130}}>{fmtDate(b.day)} {b.time}</b>
        <span style={{flex:1,minWidth:160}}><span data-no-i18n="">{pkgName(b.package_id)}</span> · <span data-no-i18n="">{b.guest_name}</span> · {tf("{0} Pers.", b.persons)}{b.room_no?" · "+tf("Zimmer {0}", b.room_no):""}</span>
        <span>{b.price==null?"":money(b.price)}{b.paid?" ✓":""}</span>
        <Pill color={st[0]} bg={st[1]}>{tf(st[2])}</Pill>
        {b.status==="angefragt" && <button style={linkBtn} onClick={()=>run(()=>api("/api/package-bookings/"+b.id,"PATCH",{status:"bestätigt"}), tf("Bestätigt."))}>{tf("Bestätigen")}</button>}
        {(b.status==="bestätigt"||b.status==="angefragt") && <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Arrangement mit allen Terminen stornieren?"))) run(()=>api("/api/package-bookings/"+b.id,"PATCH",{status:"storniert"}), tf("Storniert.")); }}>{tf("Stornieren")}</button>}
        {b.status==="bestätigt" && !b.paid && <VoucherPayButton api={api} kind="package-bookings" id={b.id} price={b.price} currency={hotel.currency} onDone={(r)=>{ setMsg({ok:true,text:tf("{0} eingelöst.", money(r.amount))+(r.open?" "+tf("Offen: {0}", money(r.open)):"")}); loadList(); }} />}
      </div>; })}
      {form && <Overlay onClose={()=>setForm(null)} width={640} label={tf("Arrangement")}>
        <b>{form.id ? tf("Arrangement bearbeiten") : tf("Arrangement anlegen")}</b>
        <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
        <Field label={tf("Beschreibung (für Gäste)")}><textarea className="input" rows={2} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} /></Field>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Preis")}><input className="input" inputMode="decimal" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} /></Field>
          <Field label={tf("Preis gilt pro")}><select className="input" value={form.price_per} onChange={e=>setForm({...form,price_per:e.target.value})}><option value="person">{tf("Person")}</option><option value="paket">{tf("Paket")}</option></select></Field>
          <Field label={tf("Personen ab")}><input className="input" type="number" min={1} max={20} value={form.persons_min} onChange={e=>setForm({...form,persons_min:e.target.value})} /></Field>
          <Field label={tf("Personen bis")}><input className="input" type="number" min={1} max={20} value={form.persons_max} onChange={e=>setForm({...form,persons_max:e.target.value})} /></Field>
        </div>
        <div className="field-label">{tf("Ablauf (Minuten nach Beginn)")}</div>
        {form.items.map((x,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"90px 1fr auto",gap:8,alignItems:"center",marginBottom:6}}>
          {x.kind!=="extra" ? <input className="input" type="number" min={0} max={720} aria-label={tf("Minuten nach Beginn")} value={x.offset_min||0} onChange={e=>setItem(i,{offset_min:e.target.value})} /> : <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Extra")}</span>}
          {x.kind==="service" ? <select className="input" aria-label={tf("Leistung")} value={x.service_id||""} onChange={e=>setItem(i,{service_id:e.target.value})}><option value="">–</option>{(services||[]).filter(s=>s.active!==false).map(s=><option key={s.id} value={s.id}>{s.name} · {s.duration_min} {tf("Min.")}</option>)}</select>
            : x.kind==="table" ? <span style={{display:"flex",gap:6,alignItems:"center",fontSize:13}}>{tf("Tisch im Restaurant für")} <input className="input" type="number" min={30} max={360} style={{width:90}} aria-label={tf("Dauer (Minuten)")} value={x.duration_min||90} onChange={e=>setItem(i,{duration_min:e.target.value})} /> {tf("Min.")}</span>
            : <input className="input" aria-label={tf("Extra")} placeholder={tf("z. B. Glas Sekt, Bademantel, Obstkorb")} value={x.text||""} onChange={e=>setItem(i,{text:e.target.value})} />}
          <button style={linkBtn} aria-label={tf("Entfernen")} onClick={()=>setForm({...form,items:form.items.filter((_,j)=>j!==i)})}>✕</button>
        </div>)}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          <button style={opSmall} onClick={()=>setForm({...form,items:[...form.items,{kind:"service",service_id:"",offset_min:form.items.length?60*form.items.length:0}]})}>+ {tf("Leistung")}</button>
          <button style={opSmall} onClick={()=>setForm({...form,items:[...form.items,{kind:"table",offset_min:120,duration_min:90}]})}>+ {tf("Tisch")}</button>
          <button style={opSmall} onClick={()=>setForm({...form,items:[...form.items,{kind:"extra",text:""}]})}>+ {tf("Extra")}</button>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!form.online} onChange={e=>setForm({...form,online:e.target.checked})} /> {tf("Online buchbar")}</label>
          <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={form.active!==false} onChange={e=>setForm({...form,active:e.target.checked})} /> {tf("Aktiv")}</label>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" disabled={!String(form.name).trim() || !form.items.some(x=>x.kind!=="extra")} onClick={()=>run(async()=>{ const body = {...form}; ["id","created_at","hotel_id","organization_id"].forEach(k=>delete body[k]); if(form.id) await api("/api/packages/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/packages","POST",body); setForm(null); }, tf("Gespeichert."))}>{tf("Speichern")}</button>
          <button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      </Overlay>}
      {book && <PackageBookForm hotel={hotel} api={api} form={book} setForm={setBook} pkgs={(pkgs||[]).filter(p=>p.active!==false)} onClose={()=>setBook(null)} onSaved={()=>{ setBook(null); run(async()=>{}, tf("Arrangement gebucht.")); }} />}
    </div>
  );
}

function PackageBookForm({hotel, api, form, setForm, pkgs, onClose, onSaved}){
  const [slots,setSlots] = useState(null); const [err,setErr] = useState(""); const [busy,setBusy] = useState(false);
  const p = pkgs.find(x=>x.id===form.package_id);
  useEffect(()=>{ setSlots(null); if(!form.package_id || !form.day) return; api("/api/hotels/"+hotel.id+"/package-slots?package="+form.package_id+"&day="+form.day+"&persons="+form.persons).then(setSlots).catch(e=>{ setErr(e.message); setSlots([]); }); },[form.package_id, form.day, form.persons]);
  const sel = (slots||[]).find(s=>s.time===form.time);
  const save = async () => { setErr(""); setBusy(true); try { await api("/api/hotels/"+hotel.id+"/package-bookings","POST",form); onSaved(); } catch(e){ setErr(e.message); } finally { setBusy(false); } };
  return (
    <Overlay onClose={onClose} width={600} label={tf("Arrangement buchen")}>
      <b>{tf("Arrangement buchen")}</b>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px",marginTop:8}}>
        <Field label={tf("Arrangement")}><select className="input" value={form.package_id} onChange={e=>setForm({...form,package_id:e.target.value,time:""})}>{pkgs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label={tf("Datum")}><input className="input" type="date" value={form.day} onChange={e=>setForm({...form,day:e.target.value,time:""})} /></Field>
        <Field label={tf("Personen")}><input className="input" type="number" min={p?p.persons_min:1} max={p?p.persons_max:20} value={form.persons} onChange={e=>setForm({...form,persons:e.target.value,time:""})} /></Field>
      </div>
      <div className="field-label">{tf("Mögliche Beginnzeiten")}</div>
      {slots===null && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt …")}</div>}
      {slots && slots.length===0 && <div style={{fontSize:13,color:WARN_TEXT}}>{tf("An diesem Tag ist das Arrangement nicht verfügbar.")}</div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{(slots||[]).map(s=><button key={s.time} type="button" aria-pressed={form.time===s.time} style={{...opSmall,minHeight:40,background:form.time===s.time?INK:"#fff",color:form.time===s.time?"#fff":INK}} onClick={()=>setForm({...form,time:s.time})}>{s.time}</button>)}</div>
      {sel && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{sel.parts.map(x=>(x.time?x.time+" ":"")+(x.kind==="table"?tf("Tisch"):x.name||"")).join(" · ")}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Name")}><input className="input" value={form.guest_name} onChange={e=>setForm({...form,guest_name:e.target.value})} /></Field>
        <Field label={tf("Zimmer")}><input className="input" value={form.room_no} onChange={e=>setForm({...form,room_no:e.target.value})} /></Field>
        <Field label={tf("Telefon")}><input className="input" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
        <Field label={tf("E-Mail")}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
        <Field label={tf("Bezahlung")}><select className="input" value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}>{SP_PAY.filter(x=>x[0]!=="online").map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
      </div>
      <Field label={tf("Wünsche und Hinweise")}><textarea className="input" rows={2} value={form.wishes} onChange={e=>setForm({...form,wishes:e.target.value})} /></Field>
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={busy || !form.time || !String(form.guest_name).trim()} onClick={save}>{tf("Buchen")}</button><button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button></div>
    </Overlay>
  );
}

function SpaWaitlist({hotel, api, services}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/booking-waitlist").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const svcName = (id) => ((services||[]).find(s=>s.id===id)||{}).name || "?";
  const active = (list||[]).filter(w=>w.status==="wartet"||w.status==="angeboten");
  return (
    <div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Wird ein Platz frei, bekommt der Nächste auf der Liste automatisch eine E-Mail mit einem Angebot. Es gilt 2 Stunden – danach rückt der Nächste nach.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {list && active.length===0 && <div style={{fontSize:13.5,color:INK_MUTED}}>{tf("Niemand auf der Warteliste.")}</div>}
      {active.map(w=><div key={w.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,fontSize:13.5}}>
        <b style={{minWidth:110}}>{fmtDate(w.day)} {w.time || tf("jede Zeit")}</b>
        <span style={{flex:1,minWidth:160}}><span data-no-i18n="">{svcName(w.service_id)}</span> · <span data-no-i18n="">{w.guest_name}</span>{w.persons>1?" · "+tf("{0} Pers.", w.persons):""}{w.room_no?" · "+tf("Zimmer {0}", w.room_no):""}</span>
        <Pill color={w.status==="angeboten"?WARN_TEXT:INK_MUTED} bg={w.status==="angeboten"?WARN_SOFT:PAPER}>{tf(WL_STATUS[w.status])}{w.offered ? " · "+w.offered : ""}</Pill>
        <button style={linkBtn} onClick={async()=>{ try { await api("/api/booking-waitlist/"+w.id,"PATCH",{status:"entfernt"}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } }}>{tf("Entfernen")}</button>
      </div>)}
    </div>
  );
}

// Dashboard: Tagesbericht (Vorschau der Zahlen, Schalter für die Mail am Morgen)
function DailyReportCard({hotel, api, role}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [open,setOpen] = useState(false);
  useEffect(()=>{ if(open && !d) api("/api/hotels/"+hotel.id+"/daily-report").then(setD).catch(e=>setD({error:e.message})); },[open]);
  const money = moneyOf(hotel);
  const toggle = async (v) => { setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/daily-report","PUT",{enabled:v}); setD({...d, enabled:r.enabled}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const test = async () => { setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/daily-report/test","POST",{}); setMsg({ok:!!r.sent, text:r.sent ? tf("Test-Mail verschickt.") : tf("Die Mail konnte nicht verschickt werden.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const r = d && d.report;
  const Row = ({l, v}) => <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:13,padding:"3px 0",borderTop:`1px solid ${BORDER}`}}><span style={{color:INK_MUTED}}>{l}</span><b>{v}</b></div>;
  return <Card style={{marginBottom:14}}>
    <div style={{display:"flex",gap:8,alignItems:"center"}}><b style={{flex:1}}><Icon n="log" /> {tf("Tagesbericht")}</b><button style={linkBtn} aria-expanded={open} onClick={()=>setOpen(!open)}>{open ? tf("Schließen") : tf("Anzeigen")}</button></div>
    {open && d && d.error && <ErrorText style={{marginTop:8}}>{d.error}</ErrorText>}
    {open && r && <div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))",gap:"0 18px"}}>
      <div><Row l={tf("Belegung heute")} v={r.rooms.pct==null?"–":r.rooms.pct+" %"} /><Row l={tf("Anreisen / Abreisen")} v={r.rooms.arrivals+" / "+r.rooms.departures} /><Row l={tf("Offene Meldungen")} v={r.tickets.open+(r.tickets.urgent?" ("+tf("{0} dringend", r.tickets.urgent)+")":"")} /></div>
      <div><Row l={tf("Spa gestern")} v={r.spa.yesterday_count+" · "+money(r.spa.yesterday_revenue)} /><Row l={tf("Spa heute")} v={r.spa.today_count+(r.spa.today_requests?" ("+tf("{0} Anfragen", r.spa.today_requests)+")":"")} /><Row l={tf("Offen für die Zimmerrechnung")} v={r.spa.room_charge_open} /></div>
      <div><Row l={tf("Restaurant gestern")} v={tf("{0} Gäste", r.dining.yesterday_guests)} /><Row l={tf("Restaurant heute")} v={r.dining.today_count+" · "+tf("{0} Gäste", r.dining.today_guests)+(r.dining.today_allergies?" · ⚠ "+r.dining.today_allergies:"")} /><Row l={tf("Arrangements heute")} v={r.packages.today} /></div>
      <div><Row l={tf("Gäste-Feedback gestern")} v={r.feedback.count ? r.feedback.count+" · Ø "+(r.feedback.avg??"–")+(r.feedback.bad?" · "+tf("{0} schlecht", r.feedback.bad):"") : "–"} /><Row l={tf("Gutscheine gestern")} v={r.vouchers.sold+" · "+money(r.vouchers.value)} /><Row l={tf("Warteliste")} v={r.waitlist} /></div>
    </div>}
    {open && d && !d.error && <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
      {role==="admin" && <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!d.enabled} onChange={e=>toggle(e.target.checked)} /> {tf("Jeden Morgen per E-Mail an Admins, Gesamtleitung und Eigentümer")}</label>}
      <button style={opSmall} onClick={test}>{tf("Test-Mail an mich")}</button>
    </div>}
    {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:6}}>{msg.text}</div>}
  </Card>;
}
