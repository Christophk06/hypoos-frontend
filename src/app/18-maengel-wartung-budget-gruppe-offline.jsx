// ------------------------------------------------------------ Baumängel: Abnahmeprotokoll als PDF
function snagReportHtml({hotel, tickets, contractors, members, me, contractorId}){
  const firm = (id) => (contractors.find(c=>c.id===id)||{}).name || "";
  const list = tickets.filter(t=>t.kind==="Baumangel" && (!contractorId || t.contractor_id===contractorId));
  const groups = {}; list.forEach(t=>{ const k = t.location || translateString("Ohne Ort"); (groups[k]=groups[k]||[]).push(t); });
  const today = todayIso();
  const open = list.filter(t=>t.status!=="Erledigt").length;
  const rows = Object.keys(groups).sort((a,b)=>a.localeCompare(b, undefined, {numeric:true})).map(loc=>'<tr class="g"><td colspan="6">'+fsEsc(loc)+'</td></tr>'+groups[loc].map((t,i)=>
    '<tr><td>'+(i+1)+'</td><td><b>'+fsEsc(t.title)+'</b>'+(t.description?'<div style="color:#6B7280">'+fsEsc(t.description)+'</div>':'')+(t.done_note?'<div style="color:#2F7D4F">'+fsEsc(t.done_note)+'</div>':'')+'</td><td>'+fsEsc(firm(t.contractor_id))+'</td>'
    +'<td class="'+(t.due_on && t.due_on<today && t.status!=="Erledigt"?'bad':'')+'">'+fsEsc(t.due_on?fmtDate(t.due_on):"–")+'</td><td>'+fsT(t.status)+'</td><td>'+fsEsc(t.done_at?fmtDate(t.done_at):"")+'</td></tr>').join("")).join("");
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, translateString("Abnahmeprotokoll Baumängel"), contractorId ? firm(contractorId) : null)
    + '<div class="facts" style="grid-template-columns:repeat(3,1fr)">'+[["Mängel gesamt", list.length], ["Offen", open], ["Erledigt", list.length-open]].map(([l,v])=>'<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+v+'</div></div>').join("")+'</div>'
    + '<table class="t"><thead><tr><th>#</th><th>'+fsT("Mangel")+'</th><th>'+fsT("Firma")+'</th><th>'+fsT("Frist")+'</th><th>'+fsT("Status")+'</th><th>'+fsT("Erledigt am")+'</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6">'+fsT("Keine Baumängel.")+'</td></tr>')+'</tbody></table>'
    + '<div class="sig"><div>'+fsT("Bauherr / Hotel")+' – '+fsT("Datum und Unterschrift")+'</div><div>'+fsT("Firma")+' – '+fsT("Datum und Unterschrift")+'</div></div>'
    + fsFoot() + '</div>';
}
function SnagReportButton({hotel, api, contractors, members, me}){
  const [busy,setBusy] = useState(false); const [firm,setFirm] = useState("");
  const run = async () => { setBusy(true); try { const t = await api("/api/hotels/"+hotel.id+"/tickets?status=all&kind=Baumangel"); await sheetPdf(snagReportHtml({hotel, tickets:t, contractors, members, me, contractorId:firm}), safeFile(translateString("Abnahmeprotokoll")+" "+hotel.name+" "+todayIso())+".pdf"); } catch(e){ window.alert(tf("PDF konnte nicht erstellt werden: {0}", e.message)); } setBusy(false); };
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
      <button style={smallBtn} disabled={busy} onClick={run}>{busy?"…":"📄 "+tf("Abnahmeprotokoll (PDF)")}</button>
      {contractors.length>0 && <select className="input" style={{width:"auto",padding:"5px 8px",fontSize:12.5}} value={firm} onChange={e=>setFirm(e.target.value)}><option value="">{tf("Alle Firmen")}</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
    </div>
  );
}

// ------------------------------------------------------------ Wartung: Vorlagen für wiederkehrende Prüfungen, Prüfnachweis
const MAINT_PRESETS = [
  ["Feuerlöscher prüfen", 2, "Jahre", "Technik"], ["Brandmeldeanlage – Inspektion", 3, "Monate", "Technik"], ["Sicherheitsbeleuchtung testen", 1, "Monate", "Technik"],
  ["Rauchmelder prüfen", 1, "Jahre", "Technik"], ["Aufzug – wiederkehrende Prüfung", 1, "Jahre", "Technik"], ["Legionellen-Prüfung Trinkwasser", 1, "Jahre", "Technik"],
  ["Elektrische Anlagen prüfen", 1, "Jahre", "Technik"], ["Lüftungsfilter tauschen", 6, "Monate", "Technik"], ["Fettabscheider leeren", 1, "Monate", "Food & Beverage"],
  ["Küchenabluft reinigen", 6, "Monate", "Food & Beverage"], ["Poolwasser – Laborprobe", 1, "Monate", "Technik"], ["Erste-Hilfe-Kästen kontrollieren", 6, "Monate", "Personal"],
];
function maintProofHtml({hotel, plan, tickets, nameOf}){
  const done = tickets.filter(t=>t.status==="Erledigt").sort((a,b)=>String(b.done_at).localeCompare(String(a.done_at)));
  const open = tickets.filter(t=>t.status!=="Erledigt");
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, plan.title, translateString("Prüfnachweis"))
    + '<div class="facts">'+[["Ort", plan.location||"–"], ["Intervall", tf("alle {0} {1}", plan.interval_value, translateString(plan.interval_unit))], ["Zuständig", translateString(plan.department)], ["Nächster Termin", fmtDate(plan.next_due)]].map(([l,v])=>'<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+fsEsc(v)+'</div></div>').join("")+'</div>'
    + (plan.description ? '<div class="box" style="margin-bottom:10px"><div class="b">'+fsEsc(plan.description)+'</div></div>' : '')
    + '<table class="t"><thead><tr><th>'+fsT("Fällig seit")+'</th><th>'+fsT("Erledigt am")+'</th><th>'+fsT("Erledigt von")+'</th><th>'+fsT("Ergebnis")+'</th></tr></thead><tbody>'
    + (done.length ? done.map(t=>'<tr><td>'+fsEsc(fmtDate(t.created_at))+'</td><td>'+fsEsc(fmtDate(t.done_at))+'</td><td>'+fsEsc(nameOf(t.done_by))+'</td><td>'+fsEsc(t.done_note||"")+'</td></tr>').join("") : '<tr><td colspan="4">'+fsT("Noch keine erledigten Prüfungen.")+'</td></tr>')
    + open.map(t=>'<tr><td>'+fsEsc(fmtDate(t.created_at))+'</td><td class="bad">'+fsT("offen")+'</td><td></td><td></td></tr>').join("")
    + '</tbody></table>' + fsFoot() + '</div>';
}
function MaintProofButton({hotel, api, plan, members, me}){
  const [busy,setBusy] = useState(false);
  const run = async () => { setBusy(true); try { const t = await api("/api/hotels/"+hotel.id+"/tickets?status=all&plan_id="+plan.id); await sheetPdf(maintProofHtml({hotel, plan, tickets:t, nameOf:(id)=>id ? memberLabel(members||[], me, id) : ""}), safeFile(translateString("Prüfnachweis")+" "+plan.title)+".pdf"); } catch(e){ window.alert(tf("PDF konnte nicht erstellt werden: {0}", e.message)); } setBusy(false); };
  return <button style={linkBtn} disabled={busy} onClick={run}>{busy?"…":"📄 "+tf("Nachweis")}</button>;
}

// ------------------------------------------------------------ Budget: PDF und Excel
function budgetSheetHtml(hotel, items){
  const m = (n) => fmtEur(n);
  const by = {}; items.forEach(b=>{ const d = by[b.department] = by[b.department] || {planned:0, actual:0, committed:0, items:[]}; d.planned += Number(b.planned||0); d.actual += Number(b.actual||0); d.committed += Number(b.committed||0); d.items.push(b); });
  const tot = Object.values(by).reduce((s,d)=>({planned:s.planned+d.planned, actual:s.actual+d.actual, committed:s.committed+d.committed}), {planned:0, actual:0, committed:0});
  const line = (l, d, cls) => '<tr class="'+(cls||"")+'"><td>'+l+'</td><td class="r">'+m(d.planned)+'</td><td class="r">'+m(d.actual)+'</td><td class="r">'+m(d.committed)+'</td><td class="r '+(d.actual+d.committed>d.planned?'bad':'')+'">'+m(d.planned-d.actual-d.committed)+'</td></tr>';
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, translateString("Budget"), fmtDate(todayIso()))
    + '<div class="facts">'+[["Plan", m(tot.planned)], ["Ist", m(tot.actual)], ["Beauftragt", m(tot.committed)], ["Noch verfügbar", m(tot.planned-tot.actual-tot.committed)]].map(([l,v])=>'<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+v+'</div></div>').join("")+'</div>'
    + '<table class="t"><thead><tr><th>'+fsT("Posten")+'</th><th class="r">'+fsT("Plan")+'</th><th class="r">'+fsT("Ist")+'</th><th class="r">'+fsT("Beauftragt")+'</th><th class="r">'+fsT("Noch verfügbar")+'</th></tr></thead><tbody>'
    + Object.keys(by).sort().map(d=>line(fsT(d), by[d], "g")+by[d].items.map(b=>line(fsEsc(b.title)+'<span style="color:#6B7280"> · '+fsT(b.category)+'</span>', {planned:Number(b.planned||0), actual:Number(b.actual||0), committed:Number(b.committed||0)})).join("")).join("")
    + line('<b>'+fsT("Summe")+'</b>', tot, "g") + '</tbody></table>' + fsFoot() + '</div>';
}
async function budgetXlsx(hotel, items){
  const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const rows = items.map(b=>({[translateString("Abteilung")]:translateString(b.department), [translateString("Kategorie")]:translateString(b.category), [translateString("Posten")]:b.title,
    [translateString("Plan")]:Number(b.planned||0), [translateString("Ist")]:Number(b.actual||0), [translateString("Beauftragt")]:Number(b.committed||0), [translateString("Noch verfügbar")]:Number(b.planned||0)-Number(b.actual||0)-Number(b.committed||0), [translateString("Notiz")]:b.note||""}));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Budget");
  XLSX.writeFile(wb, safeFile(translateString("Budget")+" "+hotel.name)+".xlsx");
}

// ------------------------------------------------------------ Kennzahlen: Belegung und Logis-Umsatz je Tag eintragen
function RevenueEditor({hotel, api, from, to, onSaved}){
  const [rows,setRows] = useState(null); const [msg,setMsg] = useState(null);
  const days = []; for(let d=from; d<=to; d=addDaysIso(d,1)) days.push(d);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/forecast?from="+from+"&to="+to).then(l=>setRows(Object.fromEntries(l.map(x=>[x.day,x])))).catch(e=>{ setMsg({ok:false,text:e.message}); setRows({}); }); },[from, to]);
  if(rows===null) return <div style={{color:INK_MUTED}}>…</div>;
  const save = async (d, k, v) => {
    const cur = rows[d] || {day:d, occupied:0, arrivals:0, departures:0, revenue:null};
    const next = {...cur, [k]: k==="revenue" ? (v===""?null:v) : Number(v)||0};
    setRows({...rows, [d]:next});
    try { await api("/api/hotels/"+hotel.id+"/forecast","PUT",{days:[{day:d, occupied:next.occupied, arrivals:next.arrivals, departures:next.departures, revenue:next.revenue}]}); onSaved && onSaved(); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{fontWeight:700,marginBottom:4}}>{tf("Belegung und Logis-Umsatz je Tag")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Kommt aus dem PMS oder hier von Hand: belegte Zimmer und Logis-Umsatz (ohne Frühstück und Extras). Daraus entstehen Auslastung, Durchschnittspreis und RevPAR.")}</div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",fontSize:12.5}}>
          <thead><tr><th></th>{days.map(d=><th key={d} style={{padding:"3px 4px",color:INK_MUTED,fontWeight:600}} data-no-i18n="">{fmtDay(d,{day:"2-digit",month:"2-digit"})}</th>)}</tr></thead>
          <tbody>{[["occupied","Belegt"],["revenue","Umsatz"]].map(([k,l])=>(
            <tr key={k}><td style={{padding:"3px 6px",color:INK_MUTED,whiteSpace:"nowrap"}}>{tf(l)}</td>
              {days.map(d=><td key={d} style={{padding:"2px"}}><input className="input" inputMode="decimal" style={{width:k==="revenue"?78:52,padding:"3px 4px",textAlign:"center"}} defaultValue={rows[d] ? (rows[d][k] ?? "") : ""} key={d+k+(rows[d]?rows[d][k]:"")} onBlur={e=>{ const v = e.target.value.replace(",","."); if(String(v)!==String(rows[d] ? (rows[d][k] ?? "") : "")) save(d,k,v); }} /></td>)}
            </tr>))}</tbody>
        </table>
      </div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:6}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Unterweisungen: Unterschrift und Nachweis
function SignaturePad({onChange}){
  const ref = React.useRef(null); const drawing = React.useRef(false); const has = React.useRef(false);
  useEffect(()=>{ const c = ref.current; const ctx = c.getContext("2d"); const r = window.devicePixelRatio||1; c.width = c.offsetWidth*r; c.height = 150*r; ctx.scale(r,r); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#1C2430"; },[]);
  const pos = (e) => { const b = ref.current.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [p.clientX-b.left, p.clientY-b.top]; };
  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = ref.current.getContext("2d"); const [x,y] = pos(e); ctx.beginPath(); ctx.moveTo(x,y); };
  const move = (e) => { if(!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext("2d"); const [x,y] = pos(e); ctx.lineTo(x,y); ctx.stroke(); has.current = true; };
  const end = () => { if(!drawing.current) return; drawing.current = false; if(has.current) onChange(ref.current.toDataURL("image/png")); };
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0,0,c.width,c.height); has.current = false; onChange(null); };
  return (
    <div>
      <canvas ref={ref} style={{width:"100%",height:150,border:`1px dashed ${BORDER}`,borderRadius:8,background:"#fff",touchAction:"none",cursor:"crosshair"}}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button type="button" style={{...linkBtn,paddingInlineStart:0}} onClick={clear}>{tf("Unterschrift löschen")}</button>
    </div>
  );
}
function SignAckDialog({training, me, api, onDone, onClose}){
  const [name,setName] = useState(me && me.email ? shortName(me.email) : ""); const [sig,setSig] = useState(null);
  const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  const submit = async () => { setBusy(true); setMsg(null); try { await api("/api/trainings/"+training.id+"/ack","POST",{signature_data:sig, signer_name:name}); onDone(); } catch(e){ setMsg(e.message); } setBusy(false); };
  return (
    <Overlay onClose={onClose} width={520}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}} data-no-i18n="">{training.title}</div>
      <div style={{fontSize:13,color:INK_SOFT,marginBottom:10}}>{tf("Ich bestätige, dass ich die Unterweisung gelesen und verstanden habe.")}</div>
      <Field label={tf("Vor- und Nachname")}><input className="input" value={name} onChange={e=>setName(e.target.value)} /></Field>
      <div className="field-label">{tf("Unterschrift (mit Finger oder Maus)")}</div>
      <SignaturePad onChange={setSig} />
      <div style={{display:"flex",gap:8,marginTop:8}}><button className="btn-primary" disabled={busy || !name.trim() || !sig} onClick={submit}>{busy?"…":tf("Bestätigen")}</button><button style={linkBtn} onClick={onClose}>{tf("Abbrechen")}</button></div>
      {msg && <div style={{color:BAD,fontSize:13,marginTop:6}}>{msg}</div>}
    </Overlay>
  );
}
function trainingProofHtml({hotel, training, acks, target, nameOf}){
  const latest = {}; acks.forEach(a=>{ if(!latest[a.user_id] || a.acked_at > latest[a.user_id].acked_at) latest[a.user_id] = a; });
  const rows = Object.values(latest).sort((a,b)=>String(a.signer_name||nameOf(a.user_id)).localeCompare(String(b.signer_name||nameOf(b.user_id))));
  const missing = target.filter(m=>!latest[m.user_id]);
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, training.title, translateString("Unterweisungsnachweis"))
    + '<div class="box" style="margin-bottom:10px"><h3>'+fsT("Inhalt")+'</h3><div class="b">'+fsEsc(training.body||"–")+'</div></div>'
    + '<table class="t"><thead><tr><th>'+fsT("Name")+'</th><th>'+fsT("Bestätigt am")+'</th><th>'+fsT("Unterschrift")+'</th></tr></thead><tbody>'
    + (rows.length ? rows.map(a=>'<tr><td>'+fsEsc(a.signer_name||nameOf(a.user_id))+'<div style="color:#6B7280;font-size:10px">'+fsEsc(nameOf(a.user_id))+'</div></td><td>'+fsEsc(fmtDateTime(a.acked_at))+'</td><td>'+(a.signature_data?'<img src="'+fsEsc(a.signature_data)+'" style="height:34px;max-width:170px" />':'<span style="color:#6B7280">'+fsT("ohne Unterschrift")+'</span>')+'</td></tr>').join("") : '<tr><td colspan="3">'+fsT("Noch keine Bestätigungen.")+'</td></tr>')
    + '</tbody></table>'
    + (missing.length ? '<p style="margin-top:10px"><b>'+fsT("Noch offen")+':</b> '+fsEsc(missing.map(m=>nameOf(m.user_id)).join(", "))+'</p>' : '')
    + '<div class="sig"><div>'+fsT("Unterwiesen durch")+' – '+fsT("Datum und Unterschrift")+'</div><div></div></div>'
    + fsFoot() + '</div>';
}

// ------------------------------------------------------------ Fundsachen: Liste als PDF
function lostFoundSheetHtml(hotel, list, nameOf){
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, translateString("Fundsachen"), fmtDate(todayIso()))
    + '<table class="t"><thead><tr><th>'+fsT("Gefunden am")+'</th><th>'+fsT("Gegenstand")+'</th><th>'+fsT("Wo?")+'</th><th>'+fsT("Aufbewahrt in")+'</th><th>'+fsT("Gast")+'</th><th>'+fsT("Status")+'</th></tr></thead><tbody>'
    + list.map(x=>'<tr><td>'+fsEsc(fmtDate(x.found_on))+'<div style="color:#6B7280;font-size:10px">'+fsEsc(nameOf(x.found_by))+'</div></td><td>'+fsEsc(x.description)+'</td><td>'+fsEsc(x.location||"")+'</td><td>'+fsEsc(x.storage||"")+(x.keep_until?'<div style="color:#6B7280;font-size:10px">'+fsEsc(tf("bis {0}", fmtDate(x.keep_until)))+'</div>':'')+'</td><td>'+fsEsc([x.guest_name, x.guest_contact].filter(Boolean).join(" · "))+'</td><td>'+fsT(x.status)+(x.returned_to?'<div style="font-size:10px">'+fsEsc(x.returned_to)+'</div>':'')+'</td></tr>').join("")
    + '</tbody></table>' + fsFoot() + '</div>';
}

// ------------------------------------------------------------ Hotelgruppe: alle Hotels im Vergleich
function GroupView({orgId, api, hotels, onPick}){
  const [rows,setRows] = useState(null); const [msg,setMsg] = useState(null);
  useEffect(()=>{ api("/api/organizations/"+orgId+"/overview").then(setRows).catch(e=>{ setMsg(e.message); setRows([]); }); },[orgId]);
  if(rows===null) return <div style={{color:INK_MUTED}}>…</div>;
  const money = (n, cur) => n==null ? "–" : Number(n).toLocaleString(UI_LOCALE,{style:"currency",currency:cur||"EUR",maximumFractionDigits:0});
  const sum = (k) => rows.reduce((s,r)=>s+(Number(r[k])||0),0);
  const cols = [
    ["Zimmer bereit", r=>r.rooms_total ? r.rooms_ready+"/"+r.rooms_total : "–"],
    ["Im Dienst", r=>r.on_duty||0],
    ["An-/Abreisen heute", r=>(r.arrivals||0)+" / "+(r.departures||0)],
    ["Auslastung (Monat)", r=>r.month_occupancy!=null ? r.month_occupancy+" %" : "–"],
    ["ADR", r=>money(r.month_adr, r.currency)],
    ["RevPAR", r=>money(r.month_revpar, r.currency)],
    ["Std. je belegtem Zimmer", r=>r.hours_per_room_night!=null ? r.hours_per_room_night.toLocaleString(UI_LOCALE,{maximumFractionDigits:2}) : "–"],
    ["Personalkosten je belegtem Zimmer", r=>r.staff_cost_per_room_night!=null ? Number(r.staff_cost_per_room_night).toLocaleString(UI_LOCALE,{style:"currency",currency:r.currency||"EUR"}) : "–"],
    ["Personalkosten-Quote", r=>r.staff_cost_share!=null ? r.staff_cost_share.toLocaleString(UI_LOCALE)+" %" : "–"],
    ["Meldungen offen", r=><span style={{color:r.tickets_urgent?BAD:undefined}}>{r.tickets_open||0}{r.tickets_urgent?" ("+r.tickets_urgent+"!)":""}</span>],
    ["Aufgaben überfällig", r=><span style={{color:r.tasks_overdue?BAD:undefined}}>{r.tasks_overdue||0}</span>],
    ["Budget verbraucht", r=>r.budget_planned ? <span style={{color:r.budget_spent>r.budget_planned?BAD:undefined}}>{Math.round(r.budget_spent/r.budget_planned*100)} %</span> : "–"],
    ["Bewertungen (90 Tage)", r=>r.review_avg!=null ? "★ "+r.review_avg : "–"],
    ["Gäste-Feedback", r=>r.feedback_avg!=null ? "★ "+r.feedback_avg : "–"],
  ];
  return (
    <div>
      {msg && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{msg}</div>}
      <div className="stack" style={{display:"flex",gap:14,marginBottom:14}}>
        <StatTile label={tf("Hotels")} value={rows.length} />
        <StatTile label={tf("Im Dienst")} value={sum("on_duty")} />
        <StatTile label={tf("Meldungen offen")} value={sum("tickets_open")} color={sum("tickets_urgent")?BAD:undefined} sub={tf("{0} dringend", sum("tickets_urgent"))} />
        <StatTile label={tf("Aufgaben überfällig")} value={sum("tasks_overdue")} color={sum("tasks_overdue")?BAD:undefined} />
      </div>
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900}}>
          <thead><tr style={{background:PAPER}}><th style={{textAlign:"start",padding:"9px 12px"}}>{tf("Hotel")}</th>{cols.map(([l])=><th key={l} style={{padding:"9px 8px",fontSize:11.5,color:INK_MUTED,fontWeight:600,textAlign:"end"}}>{tf(l)}</th>)}</tr></thead>
          <tbody>{rows.map(r=>(
            <tr key={r.id} style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:"9px 12px"}}><button style={{...linkBtn,padding:0,fontWeight:700,color:INK}} onClick={()=>onPick(r.id)} data-no-i18n="">{r.name}</button><div style={{fontSize:11.5,color:INK_MUTED}} data-no-i18n="">{[r.city, r.opening_date && r.opening_date>todayIso() ? tf("Eröffnung {0}", fmtDate(r.opening_date)) : null].filter(Boolean).join(" · ")}</div></td>
              {cols.map(([l,f])=><td key={l} style={{padding:"9px 8px",textAlign:"end",whiteSpace:"nowrap"}} data-no-i18n="">{f(r)}</td>)}
            </tr>))}</tbody>
        </table>
      </Card>
      {rows.length<2 && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Mit mehreren Hotels sehen Sie hier alle Häuser im Vergleich.")}</div>}
      <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Personalkennzahlen: gestempelte Stunden im laufenden Monat; Personalkosten aus dem Stundensatz unter „Zeiterfassung → Lohnexport“. Belegte Zimmer und Umsatz aus „Belegung und Umsatz“.")}</div>
    </div>
  );
}

// ------------------------------------------------------------ Offline: Einträge ohne Netz merken und später senden
function OfflineBadge(){
  const [n,setN] = useState(offlineQueue().length); const [online,setOnline] = useState(navigator.onLine!==false);
  useEffect(()=>{
    const upd = () => { setN(offlineQueue().length); setOnline(navigator.onLine!==false); };
    window.addEventListener("hpoos-queue", upd); window.addEventListener("online", upd); window.addEventListener("offline", upd);
    return () => { window.removeEventListener("hpoos-queue", upd); window.removeEventListener("online", upd); window.removeEventListener("offline", upd); };
  },[]);
  if(online && !n) return null;
  return (
    <div className="no-print" style={{position:"fixed",bottom:76,insetInlineStart:"50%",transform:"translateX(-50%)",zIndex:150,background:online?BRASS:INK,color:"#fff",borderRadius:999,padding:"7px 14px",fontSize:12.5,boxShadow:"0 6px 18px rgba(0,0,0,.2)",display:"flex",gap:8,alignItems:"center"}}>
      {online ? "⟳ "+tf("{0} Einträge werden gesendet …", n) : "⚡ "+(n ? tf("Offline – {0} Einträge warten und werden automatisch gesendet.", n) : tf("Offline – Sie sehen den zuletzt geladenen Stand."))}
      {online && n>0 && <button style={{background:"transparent",border:"1px solid #fff",color:"#fff",borderRadius:999,padding:"2px 9px",fontSize:12,cursor:"pointer"}} onClick={()=>flushOfflineQueue()}>{tf("Jetzt senden")}</button>}
    </div>
  );
}

