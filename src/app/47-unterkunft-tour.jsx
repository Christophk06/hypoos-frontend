// ============================================================ Paket 044 (4): Personalunterkünfte – Übergabe-Protokoll (Ein-/Auszug, PDF mit Unterschrift)
// und Monatsliste für die Lohnverrechnung. Rechte prüft die Datenbank (Leitung Personal; jede Person sieht ihre eigenen Protokolle).

const HO_ITEMS = ["Bett und Matratze","Schrank","Tisch und Stuhl","Bettwäsche und Handtücher","Bad und WC","Küche / Kochnische","Fenster und Vorhänge","Wände und Boden","Licht und Steckdosen","Rauchmelder"];
const hoNew = (kind) => ({kind, day:todayIso(), items:HO_ITEMS.map(l=>({label:translateString(l), ok:null, note:""})), meters:{}, keys:"", damages:"", signer_name:"", signature_data:null});

function hoSheetHtml(hotel, h, unitName, personName){
  const rows = (h.items||[]).map(x=>'<tr><td>'+fsEsc(x.label)+'</td><td>'+(x.ok===true?fsT("in Ordnung"):x.ok===false?'<span class="bad">'+fsT("Mangel")+'</span>':"–")+'</td><td>'+fsEsc(x.note||"")+'</td></tr>').join("");
  const meters = Object.entries(h.meters||{}).map(([k,v])=>'<div class="f"><div class="l">'+fsEsc(k)+'</div><div class="v">'+fsEsc(v)+'</div></div>').join("");
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + fsHead(hotel, translateString(h.kind==="einzug"?"Übergabe-Protokoll Einzug":"Übergabe-Protokoll Auszug"), unitName)
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Bewohner/in")+'</div><div class="v">'+fsEsc(personName)+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Datum")+'</div><div class="v">'+fsEsc(fmtDate(h.day))+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Schlüssel")+'</div><div class="v">'+(h.keys==null||h.keys===""?"–":fsEsc(String(h.keys)))+'</div></div>'+meters+'</div>'
    + '<table class="t"><thead><tr><th>'+fsT("Punkt")+'</th><th>'+fsT("Zustand")+'</th><th>'+fsT("Bemerkung")+'</th></tr></thead><tbody>'+rows+'</tbody></table>'
    + '<div class="box" style="margin:10px 0"><h3>'+fsT("Schäden und Mängel")+'</h3><div class="b">'+fsEsc(h.damages||"–")+'</div></div>'
    + (h.signature_data ? '<div><div style="font-size:10px;color:#6B7280">'+fsT("Unterschrift")+(h.signer_name?' · '+fsEsc(h.signer_name):'')+'</div><img src="'+fsEsc(h.signature_data)+'" style="height:22mm;max-width:80mm" /></div>' : '<div class="sig"><div>'+fsT("Datum und Unterschrift Bewohner/in")+'</div><div>'+fsT("Datum und Unterschrift Hotel")+'</div></div>')
    + fsFoot()+'</div>';
}

function HousingHandoverDialog({hotel, api, assignment, unitName, personName, onClose}){
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [meterKey,setMeterKey] = useState(""); const [meterVal,setMeterVal] = useState("");
  const load = useCallback(()=>api("/api/housing-assignments/"+assignment.id+"/handovers").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, assignment.id]);
  useEffect(()=>{ load(); },[load]);
  const save = async () => {
    setMsg(null);
    try {
      const body = {...form, keys:form.keys===""?null:form.keys}; delete body.id;
      if(form.id) await api("/api/housing-handovers/"+form.id,"PATCH",body); else await api("/api/housing-assignments/"+assignment.id+"/handovers","POST",body);
      setForm(null); load(); setMsg({ok:true,text:tf("Gespeichert.")});
    } catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const pdf = (h) => sheetPdf(hoSheetHtml(hotel, h, unitName, personName), safeFile(translateString("Übergabe")+" "+unitName+" "+h.day)+".pdf", true).catch(opErr(setMsg));
  const setItem = (i, patch) => { const l = form.items.map(x=>({...x})); l[i] = {...l[i], ...patch}; setForm({...form, items:l}); };
  return (
    <Overlay onClose={onClose} width={600} label={tf("Übergabe-Protokoll")}>
      <b>{tf("Übergabe-Protokoll")}</b> <span style={{color:INK_MUTED}} data-no-i18n="">{unitName} · {personName}</span>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,margin:"8px 0"}}>{msg.text}</div>}
      {!form && <div style={{marginTop:10}}>
        {list && list.length===0 && <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Noch kein Protokoll.")}</div>}
        {(list||[]).map(h=><div key={h.id} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <b style={{flex:1}}>{h.kind==="einzug" ? tf("Einzug") : tf("Auszug")} · {fmtDate(h.day)}</b>
          {h.signature_data && <span style={{fontSize:12,color:GOOD_TEXT}}>✓ {tf("unterschrieben")}</span>}
          <button style={linkBtn} onClick={()=>pdf(h)}>{tf("PDF")}</button>
          <button style={linkBtn} onClick={()=>setForm({...h, keys:h.keys==null?"":h.keys, damages:h.damages||"", signer_name:h.signer_name||"", items:h.items||[], meters:h.meters||{}})}>{tf("Bearbeiten")}</button>
        </div>)}
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
          <button className="btn-primary" onClick={()=>setForm(hoNew("einzug"))}>{tf("Einzug protokollieren")}</button>
          <button style={btnLine} onClick={()=>setForm(hoNew("auszug"))}>{tf("Auszug protokollieren")}</button>
          <button style={btnLine} onClick={onClose}>{tf("Schließen")}</button>
        </div>
      </div>}
      {form && <div style={{marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0 10px"}}>
          <Field label={tf("Art")}><select className="input" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="einzug">{tf("Einzug")}</option><option value="auszug">{tf("Auszug")}</option></select></Field>
          <Field label={tf("Datum")}><input className="input" type="date" value={form.day} onChange={e=>setForm({...form,day:e.target.value})} /></Field>
          <Field label={tf("Schlüssel (Anzahl)")}><input className="input" type="number" min={0} max={50} value={form.keys} onChange={e=>setForm({...form,keys:e.target.value})} /></Field>
        </div>
        <div className="field-label">{tf("Zustand")}</div>
        {form.items.map((x,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"minmax(120px,1fr) auto minmax(100px,1fr)",gap:8,alignItems:"center",padding:"4px 0",borderTop:`1px solid ${BORDER}`}}>
          <span style={{fontSize:13}} data-no-i18n="">{x.label}</span>
          <span role="radiogroup" aria-label={x.label} style={{display:"flex",gap:4}}>
            <button type="button" role="radio" aria-checked={x.ok===true} style={{...opSmall,minHeight:36,background:x.ok===true?GOOD_SOFT:"#fff"}} onClick={()=>setItem(i,{ok:x.ok===true?null:true})}>{tf("in Ordnung")}</button>
            <button type="button" role="radio" aria-checked={x.ok===false} style={{...opSmall,minHeight:36,background:x.ok===false?BAD_SOFT:"#fff"}} onClick={()=>setItem(i,{ok:x.ok===false?null:false})}>{tf("Mangel")}</button>
          </span>
          <input className="input" style={{padding:"4px 6px",fontSize:12.5}} aria-label={tf("Bemerkung zu {0}", x.label)} placeholder={tf("Bemerkung")} value={x.note||""} onChange={e=>setItem(i,{note:e.target.value})} />
        </div>)}
        <div className="field-label" style={{marginTop:10}}>{tf("Zählerstände")}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
          {Object.entries(form.meters||{}).map(([k,v])=><span key={k} style={{fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:999,padding:"2px 8px"}}><span data-no-i18n="">{k}: {v}</span> <button style={{...linkBtn,padding:0}} aria-label={tf("Entfernen")} onClick={()=>{ const m = {...form.meters}; delete m[k]; setForm({...form,meters:m}); }}>✕</button></span>)}
          <input className="input" style={{width:120}} placeholder={tf("z. B. Strom")} aria-label={tf("Zähler")} value={meterKey} onChange={e=>setMeterKey(e.target.value)} />
          <input className="input" style={{width:100}} placeholder={tf("Stand")} aria-label={tf("Stand")} value={meterVal} onChange={e=>setMeterVal(e.target.value)} />
          <button style={opSmall} disabled={!meterKey.trim()||!meterVal.trim()} onClick={()=>{ setForm({...form,meters:{...form.meters,[meterKey.trim()]:meterVal.trim()}}); setMeterKey(""); setMeterVal(""); }}>{tf("Hinzufügen")}</button>
        </div>
        <Field label={tf("Schäden und Mängel")}><textarea className="input" rows={3} value={form.damages} onChange={e=>setForm({...form,damages:e.target.value})} /></Field>
        <Field label={tf("Name der unterschreibenden Person")}><input className="input" value={form.signer_name} placeholder={personName} onChange={e=>setForm({...form,signer_name:e.target.value})} /></Field>
        {form.signature_data ? <div style={{marginBottom:8}}><img src={form.signature_data} alt={tf("Unterschrift")} style={{height:70,border:`1px solid ${BORDER}`,borderRadius:6,background:"#fff"}} /> <button style={linkBtn} onClick={()=>setForm({...form,signature_data:null})}>{tf("Neu unterschreiben")}</button></div>
          : <div style={{marginBottom:8}}><div className="field-label">{tf("Unterschrift Bewohner/in")}</div><SignaturePad onChange={(v)=>setForm(f=>({...f,signature_data:v}))} /></div>}
        <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </div>}
    </Overlay>
  );
}

function HousingPayrollCard({hotel, api, members}){
  const [month,setMonth] = useState(()=>todayIso().slice(0,7)); const [d,setD] = useState(null); const [open,setOpen] = useState(false);
  useEffect(()=>{ if(open) api("/api/hotels/"+hotel.id+"/housing/payroll?month="+month).then(setD).catch(e=>setD({error:e.message})); },[open, month, api, hotel.id]);
  const money = moneyOf(hotel);
  const nameOf = (r) => r.user_id ? (((members||[]).find(m=>m.user_id===r.user_id)||{}).email||"").split("@")[0] || tf("Teammitglied") : (r.person_name||"–");
  const csv = () => opCsv([[tf("Person"),tf("Unterkunft"),tf("von"),tf("bis"),tf("Tage"),tf("Monatsbetrag"),tf("Abzug")]].concat((d.rows||[]).map(r=>[nameOf(r), r.unit, r.from, r.to, r.days, r.monthly==null?"":r.monthly, r.amount==null?"":r.amount])),
    safeFile(translateString("Unterkunft Lohnverrechnung")+" "+hotel.name+" "+month)+".csv");
  return (
    <Card style={{marginBottom:12}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <b style={{flex:1}}><Icon n="receipt" /> {tf("Monatsliste für die Lohnverrechnung")}</b>
        {open && <input className="input" type="month" style={{width:"auto"}} aria-label={tf("Monat")} value={month} onChange={e=>e.target.value && setMonth(e.target.value)} />}
        <button style={opSmall} aria-expanded={open} onClick={()=>setOpen(!open)}>{open ? tf("Schließen") : tf("Anzeigen")}</button>
      </div>
      {open && d && d.error && <ErrorText style={{marginTop:8}}>{d.error}</ErrorText>}
      {open && d && d.rows && <div style={{marginTop:8}}>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:6}}>{tf("Anteilig nach Wohntagen im Monat. Betrag: eingetragener Abzug der Belegung, sonst die Miete der Unterkunft. Ob und wie viel als Sachbezug gilt, klärt die Lohnverrechnung.")}</div>
        {d.rows.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Belegungen in diesem Monat.")}</div>}
        {d.rows.length>0 && <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`2px solid ${BORDER}`}}><th style={bgmTh}>{tf("Person")}</th><th style={bgmTh}>{tf("Unterkunft")}</th><th style={bgmTh}>{tf("Zeitraum")}</th><th style={bgmThR}>{tf("Tage")}</th><th style={bgmThR}>{tf("Abzug")}</th></tr></thead>
          <tbody>{d.rows.map(r=><tr key={r.assignment_id} style={{borderBottom:`1px solid ${BORDER}`}}>
            <td style={bgmTd} data-no-i18n="">{nameOf(r)}</td><td style={bgmTd} data-no-i18n="">{r.unit}</td><td style={bgmTd}>{fmtDate(r.from)} – {fmtDate(r.to)}</td>
            <td style={bgmTdR}>{r.days}/{r.days_in_month}</td><td style={bgmTdR}>{r.amount==null ? <span style={{color:WARN_TEXT}}>{tf("kein Betrag")}</span> : money(r.amount)}</td></tr>)}
            <tr><td style={{...bgmTd,fontWeight:700}} colSpan={4}>{tf("Summe")}</td><td style={{...bgmTdR,fontWeight:700}}>{money(d.total)}</td></tr></tbody>
        </table></div>}
        {d.rows.length>0 && <button style={{...opSmall,marginTop:8}} onClick={csv}><Icon n="file" /> {tf("Excel/CSV")}</button>}
      </div>}
    </Card>
  );
}
