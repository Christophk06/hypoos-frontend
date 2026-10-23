// ============================================================ Betrieb plus: Trinkgeld-Verteilung, Schulungs-Pflichtplan, Allergene,
// Reinigungszeiten, Notfall-Modus, Steuerberater-Paket. Ohne eigene Tabellen – nutzt vorhandene Daten.

// ------------------------------------------------------------ Trinkgeld fair verteilen (im Kassenbuch, Leitung)
function TipSplitCard({hotel, api, month, members}){
  const [d,setD] = useState(null); const [dept,setDept] = useState(""); const [msg,setMsg] = useState(""); const [busy,setBusy] = useState(false);
  const run = async () => { setBusy(true); setMsg(""); try { setD(await api("/api/hotels/"+hotel.id+"/tip-split?month="+month+(dept?"&department="+encodeURIComponent(dept):""))); } catch(e){ setMsg(e.message); } setBusy(false); };
  useEffect(()=>{ setD(null); },[month, dept]);
  const money = (v) => Number(v||0).toLocaleString(UI_LOCALE,{style:"currency",currency:(d&&d.currency)||hotel.currency||"EUR"});
  const nameOf = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
  const csv = () => {
    const rows = [["Name","Stunden","Anteil"], ...d.shares.map(s=>[nameOf(s.user_id), String(s.hours).replace(".",","), String(s.amount).replace(".",",")])];
    const text = "﻿"+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(";")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text],{type:"text/csv"})); a.download = "trinkgeld-"+month+".csv"; a.click();
  };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}><b><Icon n="users" /> {tf("Trinkgeld fair verteilen")}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Trinkgeld-Einnahmen des Monats anteilig nach gestempelten Stunden.")}</div></div>
        <select className="input" style={{width:"auto"}} value={dept} onChange={e=>setDept(e.target.value)} aria-label={tf("Abteilung")}><option value="">{tf("Alle Abteilungen")}</option>{DEPARTMENTS.map(x=><option key={x} value={x}>{translateString(x)}</option>)}</select>
        <button style={smallBtn} disabled={busy} onClick={run}>{busy ? tf("Rechnet…") : tf("Berechnen")}</button>
      </div>
      {msg && <div style={{color:BAD,fontSize:13,marginTop:8}}>{msg}</div>}
      {d && <div style={{marginTop:10,fontSize:13.5}}>
        <div style={{marginBottom:6}}>{tf("Trinkgeld gesamt")}: <b>{money(d.total)}</b> · {tf("Stunden gesamt")}: <b>{fmtHours(d.hours)}</b></div>
        {d.shares.length===0 ? <div style={{color:INK_MUTED}}>{tf("Keine gestempelten Stunden in diesem Monat.")}</div>
          : d.shares.map(s=><div key={s.user_id} style={{display:"flex",gap:10,padding:"5px 0",borderTop:`1px solid ${BORDER}`}}>
              <span style={{flex:1}} data-no-i18n="">{nameOf(s.user_id)}</span><span style={{color:INK_MUTED}}>{fmtHours(s.hours)} h</span><b style={{minWidth:90,textAlign:"end"}}>{money(s.amount)}</b></div>)}
        {d.shares.length>0 && <button style={{...smallBtn,marginTop:8}} onClick={csv}>{tf("Als CSV exportieren")}</button>}
        <div style={{fontSize:11.5,color:INK_MUTED,marginTop:6}}>{tf("Vorschlag zur Verteilung. Steuerliche Behandlung bitte mit der Lohnverrechnung klären.")}</div>
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Schulungs-Pflichtplan (Unterweisungen: wer braucht was bis wann)
function TrainingPlanCard({trainings, members}){
  const [open,setOpen] = useState(false);
  const today = todayIso(), soon = isoMonthsAhead(today, 1);
  const people = (members||[]).filter(m=>m.role!=="viewer");
  const needs = (t, m) => !(t.departments||[]).length || (m.departments||[]).some(d=>(t.departments||[]).includes(d));
  const status = (t, m) => {
    if(!needs(t, m)) return null;
    const last = (t.acks||[]).filter(a=>a.user_id===m.user_id).map(a=>a.acked_at).sort().pop();
    if(!last) return ["fehlt", BAD, BAD_SOFT, null];
    if(!t.valid_months) return ["ok", GOOD, GOOD_SOFT, null];
    const until = isoMonthsAhead(last.slice(0,10), t.valid_months);
    return until < today ? ["abgelaufen", BAD, BAD_SOFT, until] : until <= soon ? ["bald fällig", WARN, WARN_SOFT, until] : ["ok", GOOD, GOOD_SOFT, until];
  };
  const open_count = people.reduce((n,m)=>n+(trainings||[]).filter(t=>{ const s = status(t,m); return s && s[0]!=="ok"; }).length,0);
  if(!(trainings||[]).length) return null;
  return (
    <Card style={{marginBottom:14,borderColor:open_count?WARN:BORDER}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{flex:1}}><b><Icon n="clipboard" /> {tf("Pflichtplan")}</b> <span style={{fontSize:12.5,color:open_count?WARN:INK_MUTED}}>· {open_count ? tf("{0} offene Unterweisungen", open_count) : tf("alle aktuell")}</span></div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{overflowX:"auto",marginTop:10}}><table style={{borderCollapse:"collapse",fontSize:12.5,minWidth:400}}>
        <thead><tr><th style={{textAlign:"start",padding:"4px 8px"}}>{tf("Person")}</th>{trainings.map(t=><th key={t.id} style={{textAlign:"start",padding:"4px 8px",maxWidth:140}} data-no-i18n="">{t.title}</th>)}</tr></thead>
        <tbody>{people.map(m=><tr key={m.user_id} style={{borderTop:`1px solid ${BORDER}`}}>
          <td style={{padding:"4px 8px",whiteSpace:"nowrap"}} data-no-i18n="">{shortName(m.email)}</td>
          {trainings.map(t=>{ const s = status(t,m); return <td key={t.id} style={{padding:"4px 8px"}}>{s ? <Pill color={s[1]} bg={s[2]}>{tf(s[0])}{s[3] && s[0]!=="ok" ? " · "+fmtDate(s[3]) : ""}</Pill> : <span style={{color:INK_MUTED}}>–</span>}</td>; })}
        </tr>)}</tbody>
      </table></div>}
    </Card>
  );
}

// ------------------------------------------------------------ Allergene (österreichische Kennzeichnung A–R)
// ALLERGENS (A–R) steht in 16-veranstaltungen-pdfs-angebote.jsx
function AllergenPicker({value, onChange}){
  const v = value || [];
  return <div style={{display:"flex",gap:3,flexWrap:"wrap"}} role="group" aria-label={tf("Allergene")}>
    {ALLERGENS.map(([c,l])=><button key={c} type="button" title={tf(l)} aria-pressed={v.includes(c)} onClick={()=>onChange(v.includes(c) ? v.filter(x=>x!==c) : [...v,c].sort())}
      style={{minWidth:28,minHeight:28,borderRadius:6,border:`1px solid ${v.includes(c)?BRASS:BORDER}`,background:v.includes(c)?BRASS_SOFT:"#fff",color:INK,fontWeight:600,fontSize:12,cursor:"pointer"}}>{c}</button>)}
  </div>;
}
function allergenMatrixHtml(hotel, menu){
  const rows = (menu||[]).filter(m=>m.name);
  return FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Allergene"), translateString("Speisekarte"))
    + '<table class="t"><thead><tr><th>'+fsT("Gericht")+'</th>'+ALLERGENS.map(([c])=>'<th class="r">'+c+'</th>').join("")+'</tr></thead><tbody>'
    + rows.map(m=>'<tr><td>'+fsEsc(m.name)+'</td>'+ALLERGENS.map(([c])=>'<td class="r">'+((m.allergens||[]).includes(c)?"●":"")+'</td>').join("")+'</tr>').join("")
    + '</tbody></table><div style="font-size:10px;color:#6B7280;margin-top:8px">'+ALLERGENS.map(([c,l])=>c+" = "+fsEsc(translateString(l))).join(" · ")+'</div>'+fsFoot()+'</div>';
}

// ------------------------------------------------------------ Reinigungszeiten (Zimmerstatus, Leitung Housekeeping)
function CleaningTimesCard({hotel, api, members}){
  const [d,setD] = useState(null); const [open,setOpen] = useState(false); const [msg,setMsg] = useState("");
  useEffect(()=>{ if(open && !d) api("/api/hotels/"+hotel.id+"/cleaning-times").then(setD).catch(e=>setMsg(e.message)); },[open]);
  const nameOf = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? shortName(m.email) : "–"; };
  return (
    <Card style={{marginTop:14}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{flex:1}}><b><Icon n="clock" /> {tf("Reinigungszeiten (30 Tage)")}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Aus dem Zimmerstatus: von „In Reinigung“ bis „Sauber“. Hilft bei fairen Credits und der Planung.")}</div></div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:10,fontSize:13}}>
        {msg && <div style={{color:BAD}}>{msg}</div>}
        {d && d.runs===0 && <div style={{color:INK_MUTED}}>{tf("Noch keine Daten. Dafür beim Start „In Reinigung“ und am Ende „Sauber“ setzen.")}</div>}
        {d && d.runs>0 && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:14}}>
          <div><div className="field-label">{tf("Je Zimmertyp")}</div>{d.by_type.map(r=><div key={r.key} style={{display:"flex",gap:8,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}><span style={{flex:1}} data-no-i18n="">{r.key}</span><span style={{color:INK_MUTED}}>{r.count}×</span><b>{tf("{0} Min.", r.median)}</b></div>)}</div>
          <div><div className="field-label">{tf("Je Person")}</div>{d.by_user.map(r=><div key={r.key} style={{display:"flex",gap:8,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}><span style={{flex:1}} data-no-i18n="">{nameOf(r.key)}</span><span style={{color:INK_MUTED}}>{r.count}×</span><b>{tf("{0} Min.", r.median)}</b></div>)}</div>
        </div>}
        {d && d.runs>0 && <div style={{fontSize:11.5,color:INK_MUTED,marginTop:6}}>{tf("Median je Zimmer; unter 3 und über 180 Minuten werden nicht gezählt (vergessen umzustellen).")}</div>}
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Notfall-Modus (Leitung)
function EmergencyView({hotel, api}){
  const [d,setD] = useState(null); const [safe,setSafe] = useState({}); const [msg,setMsg] = useState(null); const [text,setText] = useState(""); const [busy,setBusy] = useState(false);
  const load = () => api("/api/hotels/"+hotel.id+"/emergency/present").then(setD).catch(e=>setMsg({ok:false,text:e.message}));
  useEffect(()=>{ load(); const t = setInterval(load, 30000); return ()=>clearInterval(t); },[hotel.id]);
  const alarm = async () => {
    if(!window.confirm(tf("Alarm wirklich an alle Mitarbeitenden senden?"))) return;
    setBusy(true); setMsg(null);
    try { const r = await api("/api/hotels/"+hotel.id+"/emergency","POST",{message:text}); setMsg({ok:true,text:tf("Alarm gesendet an {0} Personen.", r.sent)}); } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  const people = (d && d.people) || [], done = people.filter(p=>safe[p.user_id]).length;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Im Ernstfall: Alarm an alle aufs Handy und Anwesenheitsliste aus den Stempelzeiten. Bei Gefahr zuerst 122 (Feuerwehr), 144 (Rettung), 133 (Polizei) bzw. 112 anrufen.")}</div>
      <Card style={{marginBottom:14,borderColor:BAD,background:BAD_SOFT}}>
        <Field label={tf("Nachricht (optional)")}><input className="input" value={text} maxLength={200} placeholder={tf("z. B. Feueralarm – Sammelplatz Parkplatz Nord")} onChange={e=>setText(e.target.value)} /></Field>
        <button disabled={busy} onClick={alarm} style={{background:BAD,color:"#fff",border:"none",borderRadius:10,padding:"14px 18px",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%"}}>{busy ? "…" : tf("Alarm an alle senden")}</button>
        {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8,fontWeight:600}}>{msg.text}</div>}
      </Card>
      <Card>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <b style={{flex:1}}>{tf("Anwesend laut Stempelzeit")}: {people.length}</b>
          <span style={{fontSize:13,color:done===people.length&&people.length?GOOD:INK_MUTED}}>{tf("{0} von {1} in Sicherheit", done, people.length)}</span>
          <button style={smallBtn} onClick={()=>window.print()}>{tf("Drucken")}</button>
        </div>
        {d && people.length===0 && <div style={{color:INK_MUTED,fontSize:13}}>{tf("Gerade ist niemand eingestempelt.")}</div>}
        {people.map(p=><label key={p.user_id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:14,cursor:"pointer"}}>
          <input type="checkbox" checked={!!safe[p.user_id]} onChange={e=>setSafe({...safe,[p.user_id]:e.target.checked})} style={{width:22,height:22}} />
          <span style={{flex:1}} data-no-i18n="">{p.name}</span><span style={{color:INK_MUTED,fontSize:12.5}}>{translateString(p.department)} · {tf("seit {0}", fmtClock(p.since))}</span></label>)}
        <div style={{fontSize:11.5,color:INK_MUTED,marginTop:8}}>{tf("Gäste sind nicht enthalten – dafür die Belegungsliste der Rezeption nutzen. Die Liste aktualisiert sich alle 30 Sekunden.")}</div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ Steuerberater-Paket (ZIP je Monat: Kassenbuch, Ortstaxe, Rechnungen, Monatsabschluss)
async function taxAdvisorZip({api, hotel, month, members}){
  await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  const zip = new window.JSZip(), csv = (rows) => "﻿"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(";")).join("\r\n"), dec = (n) => n==null ? "" : String(n).replace(".",",");
  const [cash, tax, inv, close] = await Promise.all([
    api("/api/hotels/"+hotel.id+"/cash?month="+month).catch(()=>null),
    api("/api/hotels/"+hotel.id+"/tourism-tax?year="+month.slice(0,4)).catch(()=>null),
    api("/api/hotels/"+hotel.id+"/invoices").catch(()=>[]),
    api("/api/hotels/"+hotel.id+"/month-close?month="+month).catch(()=>null),
  ]);
  if(cash) zip.file("kassenbuch-"+month+".csv", csv([["Datum","Art","Kategorie","Betrag","Abteilung","Notiz","Beleg"], ...cash.entries.map(r=>[r.entry_date, r.direction==="ein"?"Einnahme":"Ausgabe", r.category, dec(r.amount), r.department, r.note, r.has_receipt?"ja":"nein"])]));
  if(tax) { const t = (tax.months||[]).find(x=>x.month.slice(0,7)===month); zip.file("ortstaxe-"+month+".csv", csv([["Monat","Nächtigungen","befreit","Notiz"], [month, t?t.overnight_stays:"", t?t.exempt_stays:"", t?t.note:""]])); }
  const invs = (inv||[]).filter(i=>(i.issued_on||"").slice(0,7)===month);
  zip.file("rechnungen-"+month+".csv", csv([["Nummer","Art","Datum","Empfänger","Netto","Steuer","Brutto","Währung"], ...invs.map(i=>[i.number, i.kind, i.issued_on, typeof i.recipient==="object" && i.recipient ? (i.recipient.name||"") : (i.recipient||""), dec(i.net_total), dec(i.tax_total), dec(i.gross_total), i.currency])]));
  if(close){ const nameOf = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
    const blob = await sheetPdf(monthCloseHtml(close, hotel, nameOf), "monatsabschluss.pdf", false, undefined, true); if(blob) zip.file("monatsabschluss-"+month+".pdf", blob); }
  zip.file("LIESMICH.txt", "Ouverture – Unterlagen "+hotel.name+" "+month+"\r\nKassenbuch (Belegfotos in der App), Ortstaxe, Rechnungsliste, Monatsabschluss.\r\nErstellt am "+new Date().toLocaleString("de-AT")+".");
  const out = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(out); a.download = safeFile("Steuerberatung "+hotel.name+" "+month)+".zip"; a.click();
}
