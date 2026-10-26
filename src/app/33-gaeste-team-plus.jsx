// ============================================================ Migration 038: Gäste-Buchungen, Erster Eindruck, Tourismus-Statistik, Simulator,
// Saison-Übergabe, Nachhaltigkeit, Aushilfs-Börse, Lehrlinge, Google-Bewertungen. Rechte prüft die Datenbank; die Oberfläche blendet nur aus.

const gtMain = {minHeight:44};
const gtErr = (setMsg) => (e) => setMsg({ok:false,text:e.message});
const gtMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div> : null;
const gtMonday = (iso) => { const d = new Date(iso+"T12:00:00Z"); const wd = (d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-wd); return d.toISOString().slice(0,10); };
const gtMinutes = (m) => m==null ? "–" : m<90 ? tf("{0} Min.", Math.round(m)) : tf("{0} Std.", fmtNum(m/60,1));
const gtCsvDownload = (rows, fileName) => {
  const text = "﻿"+rows.map(r=>r.map(x=>'"'+String(x==null?"":x).replace(/"/g,'""')+'"').join(";")).join("\r\n");
  downloadBlob(new Blob([text],{type:"text/csv;charset=utf-8"}), fileName);
};
// Die häufigsten Herkunftsländer für Hotels in Österreich (ISO-2)
const GT_COUNTRIES = ["DE","AT","CH","IT","NL","FR","GB","US","CZ","PL","HU","SK","SI","BE","DK","SE","ES","RO","HR","LI","LU","RU","IL","CN","JP"];
const gtCountryName = (c) => { if(!c || c==="??") return tf("Unbekannt"); try { return new Intl.DisplayNames([UI_LANG||"de"],{type:"region"}).of(c) || c; } catch(e){ return c; } };
const gtKey = (title, i, used) => {
  let k = String(title||"").toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,36) || "o"+i;
  const base = k; let n = 2; while(used.has(k)) k = base+"-"+(n++);
  used.add(k); return k;
};

// ------------------------------------------------------------ 1. Meine Unterlagen (Mitarbeitende)
function MySelfServiceView({orgId, api, me, hotel}){
  const [docs,setDocs] = useState(null); const [housing,setHousing] = useState(null); const [units,setUnits] = useState([]);
  const [leave,setLeave] = useState(null); const [hours,setHours] = useState(null); const [msg,setMsg] = useState(null);
  const year = Number(todayIso().slice(0,4)); const month = todayIso().slice(0,7);
  useEffect(()=>{
    if(!me) return;
    api("/api/organizations/"+orgId+"/staff-documents").then(l=>setDocs((l||[]).filter(d=>!d.user_id || d.user_id===me.id))).catch(()=>setDocs([]));
    api("/api/hotels/"+hotel.id+"/housing-assignments").then(l=>setHousing((l||[]).filter(a=>a.user_id===me.id))).catch(()=>setHousing([]));
    api("/api/hotels/"+hotel.id+"/housing-units").then(l=>setUnits(Array.isArray(l)?l:[])).catch(()=>{});
    api("/api/organizations/"+orgId+"/leave?year="+year).then(setLeave).catch(()=>setLeave(null));
    const from = month+"-01", to = todayIso();
    api("/api/hotels/"+hotel.id+"/time-entries?from="+from+"&to="+to).then(l=>setHours((l||[]).filter(e=>e.user_id===me.id && e.clock_out && e.clock_in.slice(0,7)===month || false))).catch(()=>setHours(null));
  },[orgId, hotel.id, me && me.id]);
  const open = async (d) => { setMsg(null); try { const x = await api("/api/staff-documents/"+d.id+"/file"); const b = await safeFileBlob(x.file_data); const url = URL.createObjectURL(b); const w = window.open(url, "_blank", "noopener"); if(!w){ const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); } setTimeout(()=>URL.revokeObjectURL(url), 60000); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(!me) return null;
  const myDocs = (docs||[]).filter(d=>d.user_id===me.id);
  const bal = leave && (leave.balances||[]).find(b=>b.user_id===me.id);
  const used = leave && ((leave.used||{})[me.id]||0);
  const hasLeave = !!leave && (bal || used);
  const rest = leave ? Number((bal||{entitlement_days:25}).entitlement_days) + Number((bal||{}).carried_over_days||0) - (used||0) : 0;
  const worked = (hours||[]).reduce((s,e)=>s+Math.max(0,(new Date(e.clock_out)-new Date(e.clock_in))/3600000-(Number(e.break_minutes)||0)/60),0);
  const today = todayIso();
  const empty = myDocs.length===0 && !(housing||[]).length && !hasLeave && !(hours||[]).length;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Alles, was dich selbst betrifft: deine Dokumente und Lohnzettel, deine Unterkunft, dein Urlaub und deine Stunden in diesem Monat.")}</div>
      {gtMsg(msg)}
      {myDocs.length>0 && <Card style={{marginBottom:14}}>
        <b>{tf("Meine Dokumente")}</b>
        {myDocs.map(d=>{ const exp = d.valid_until && d.valid_until < today; return (
          <div key={d.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:160}}>{tf(d.kind)}{d.title ? <span data-no-i18n="" style={{color:INK_MUTED}}> · {d.title}</span> : null}
              {d.valid_until && <div style={{fontSize:12,color:INK_MUTED}}>{tf("Gültig bis")} {fmtDate(d.valid_until)} {exp && <Pill color={BAD} bg={BAD_SOFT}>{tf("abgelaufen")}</Pill>}</div>}</span>
            {d.has_file && <button style={{...smallBtn,minHeight:44}} onClick={()=>open(d)}>{tf("Öffnen")}</button>}
          </div>); })}
      </Card>}
      {(housing||[]).length>0 && <Card style={{marginBottom:14}}>
        <b>{tf("Meine Unterkunft")}</b>
        {housing.map(a=>{ const u = units.find(x=>x.id===a.unit_id); return (
          <div key={a.id} style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <b data-no-i18n="">{u ? u.name : tf("Unterkunft")}</b>
            <div style={{fontSize:12.5,color:INK_MUTED}}>{fmtDate(a.from_date)} – {a.to_date ? fmtDate(a.to_date) : tf("offen")}</div>
            {a.handover_note && <div style={{fontSize:12.5,marginTop:2}} data-no-i18n="">{a.handover_note}</div>}
          </div>); })}
      </Card>}
      {hasLeave && <Card style={{marginBottom:14}}>
        <b>{tf("Urlaubskonto {0}", year)}</b>
        <div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:8,fontSize:13.5}}>
          <span>{tf("Anspruch")}: <b>{fmtHours(Number((bal||{entitlement_days:25}).entitlement_days))}</b></span>
          <span>{tf("Übertrag")}: <b>{fmtHours(Number((bal||{}).carried_over_days||0))}</b></span>
          <span>{tf("Verbraucht")}: <b>{used||0}</b></span>
          <span>{tf("Rest")}: <b style={{color:rest<0?BAD:GOOD}}>{fmtHours(rest)}</b></span>
        </div>
      </Card>}
      {(hours||[]).length>0 && <Card style={{marginBottom:14}}>
        <b>{tf("Meine Stunden in diesem Monat")}</b>
        <div style={{fontSize:22,fontWeight:700,marginTop:6}}>{fmtHours(worked)} h</div>
        <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("{0} gestempelte Dienste, ohne Pausen", hours.length)}</div>
      </Card>}
      {empty && docs && housing && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch nichts hinterlegt. Dokumente und Lohnzettel lädt die Personalleitung hoch.")}</div>}
    </div>
  );
}

// ------------------------------------------------------------ 2. Gästebuchungen (Upselling) für die Rezeption
function GuestOrdersCard({hotel, api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null);
  const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/guest-orders?open=1").then(setList).catch(()=>setList(false)),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(!list || list.length===0) return null; // nicht geladen, Migration fehlt oder nichts offen
  const set = async (o, status) => { setMsg(null); try { await api("/api/guest-orders/"+o.id,"PATCH",{status}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <Card style={{marginBottom:14,borderColor:BRASS}}>
      <b><Icon n="bell" /> {tf("Gästebuchungen")} <span style={{fontSize:12.5,color:INK_MUTED,fontWeight:400}}>· {tf("{0} offen", list.length)}</span></b>
      {gtMsg(msg)}
      {list.map(o=>(
        <div key={o.id} style={{padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
            <b>{tf("Zimmer")} <span data-no-i18n="">{o.room||"–"}</span></b>
            <span data-no-i18n="" style={{flex:1}}>{o.title}</span>
            <b>{o.price!=null ? money(o.price) : ""}</b>
            <Pill color={o.status==="bestätigt"?GOOD:WARN} bg={o.status==="bestätigt"?GOOD_SOFT:WARN_SOFT}>{o.status==="bestätigt" ? tf("bestätigt") : tf("offen")}</Pill>
            {o.simulation && <Pill color={INK_MUTED} bg={PAPER}>{tf("Probe")}</Pill>}
          </div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginTop:2}}>
            {o.wish_date ? tf("Wunschtermin")+": "+fmtDate(o.wish_date)+" · " : ""}{fmtDateTime(o.created_at)}
          </div>
          {o.note && <div style={{fontSize:12.5,marginTop:2}} data-no-i18n="">{o.note}</div>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            {o.status==="offen" && <button className="btn-primary" style={gtMain} onClick={()=>set(o,"bestätigt")}>{tf("Bestätigen")}</button>}
            {o.status==="bestätigt" && <button className="btn-primary" style={gtMain} onClick={()=>set(o,"abgerechnet")}>{tf("Abgerechnet")}</button>}
            {o.status==="offen" && <button style={{...btnLine,minHeight:44}} onClick={()=>set(o,"abgerechnet")}>{tf("Abgerechnet")}</button>}
            <button style={{...btnLine,minHeight:44,color:BAD}} onClick={()=>set(o,"abgelehnt")}>{tf("Ablehnen")}</button>
          </div>
        </div>))}
    </Card>
  );
}

// ------------------------------------------------------------ 3. Editor für Zusatzangebote in den Gäste-Infos
function GuestOffersEditor({value, onChange}){
  const rows = Array.isArray(value) ? value : [];
  const emit = (next) => { const used = new Set(); onChange(next.map((x,i)=>({...x, key:gtKey(x.title, i, used)}))); };
  const set = (i, k, v) => emit(rows.map((x,j)=>j===i?{...x,[k]:v}:x));
  return (
    <div>
      {rows.length===0 && <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Noch keine Zusatzangebote. Gäste können sie über den QR-Code im Zimmer buchen; die Rezeption bekommt eine Meldung.")}</div>}
      {rows.map((x,i)=>(
        <div key={i} style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:10,marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
            <Field label={tf("Angebot")}><input className="input" value={x.title||""} maxLength={120} placeholder={tf("z. B. Late Check-out")} onChange={e=>set(i,"title",e.target.value)} /></Field>
            <Field label={tf("Preis")}><input className="input" inputMode="decimal" value={x.price==null?"":x.price} onChange={e=>set(i,"price",e.target.value)} /></Field>
          </div>
          <Field label={tf("Hinweis für Gäste")}><input className="input" value={x.note||""} maxLength={200} onChange={e=>set(i,"note",e.target.value)} /></Field>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13.5,cursor:"pointer"}}><input type="checkbox" checked={!!x.needs_date} onChange={e=>set(i,"needs_date",e.target.checked)} /> {tf("Gast muss ein Datum wählen")}</label>
            <span style={{flex:1}} />
            <button style={{...linkBtn,color:BAD,minHeight:44}} onClick={()=>emit(rows.filter((_,j)=>j!==i))}>{tf("Entfernen")}</button>
          </div>
        </div>))}
      {rows.length<20 && <button style={{...btnLine,minHeight:44}} onClick={()=>emit([...rows,{title:"",price:"",note:"",needs_date:false}])}>{tf("Angebot hinzufügen")}</button>}
    </div>
  );
}

// ------------------------------------------------------------ 4. Gespeicherte Gast-Vorlieben
function GuestProfileBadge({profile}){
  if(!profile) return null;
  return (
    <div style={{border:`1px solid ${BRASS}`,background:BRASS_SOFT,borderRadius:8,padding:"6px 10px",fontSize:12.5,display:"inline-block",maxWidth:"100%"}}>
      <b><Icon n="star" /> {tf("Stammgast")}</b>{profile.display_name ? <span data-no-i18n=""> · {profile.display_name}</span> : null}
      {profile.preferences && <div data-no-i18n="" style={{marginTop:2}}>{profile.preferences}</div>}
      {profile.consent_at && <div style={{color:INK_MUTED,fontSize:11.5,marginTop:2}}>{tf("Einwilligung vom {0}", fmtDate(profile.consent_at))}</div>}
    </div>
  );
}

// ------------------------------------------------------------ 5. Erster-Eindruck-Check für VIP- und Stammgäste
const GT_FIRST = [["room_checked","Zimmer kontrolliert"],["wishes_done","Wünsche erfüllt"],["front_desk_briefed","Rezeption informiert"],["welcome_ready","Willkommensgruß bereit"]];
function FirstImpressionCheck({guest, api, onSaved, members}){
  const [g,setG] = useState(guest); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [free,setFree] = useState(!!guest.country && !GT_COUNTRIES.includes(guest.country));
  useEffect(()=>{ setG(guest); },[guest]);
  const fi = g.first_impression || {};
  const patch = async (body) => { setBusy(true); setMsg(null); try { const r = await api("/api/arrivals/"+g.id,"PATCH",body); setG(r); onSaved && onSaved(r); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const who = (id) => id && members ? memberLabel(members, null, id) : "";
  const done = GT_FIRST.filter(([k])=>fi[k]).length;
  return (
    <div style={{border:`1px solid ${g.vip?BRASS:BORDER}`,borderRadius:10,padding:10,marginTop:8,background:g.vip?BRASS_SOFT:"transparent"}}>
      {gtMsg(msg)}
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:44,cursor:"pointer",fontSize:14}}>
        <input type="checkbox" checked={!!g.vip} disabled={busy} onChange={e=>patch({vip:e.target.checked})} />
        <b>{tf("VIP / Stammgast")}</b>
        {g.vip && <span style={{fontSize:12.5,color:INK_MUTED}}>· {tf("{0} von {1} erledigt", done, GT_FIRST.length)}</span>}
      </label>
      {g.vip && <div style={{marginTop:4}}>
        {GT_FIRST.map(([k,l])=>(
          <label key={k} style={{display:"flex",gap:8,alignItems:"flex-start",minHeight:44,padding:"4px 0",cursor:"pointer",fontSize:13.5}}>
            <input type="checkbox" style={{marginTop:3}} checked={!!fi[k]} disabled={busy} onChange={e=>patch({first_impression:{[k]:e.target.checked}})} />
            <span>{tf(l)}{fi[k] && <span style={{display:"block",fontSize:12,color:INK_MUTED}}>{fmtDateTime(fi[k].at)}{who(fi[k].by) ? " · "+who(fi[k].by) : ""}</span>}</span>
          </label>))}
      </div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
        <label style={{fontSize:12.5}}><div className="field-label">{tf("Herkunftsland")}</div>
          <select className="input" style={{width:"auto",minWidth:150}} disabled={busy} value={free ? "__free" : (g.country||"")} onChange={e=>{ const v = e.target.value; if(v==="__free") setFree(true); else { setFree(false); patch({country:v}); } }}>
            <option value="">{tf("Unbekannt")}</option>
            {GT_COUNTRIES.map(c=><option key={c} value={c} data-no-i18n="">{gtCountryName(c)} ({c})</option>)}
            <option value="__free">{tf("Anderes Land (Kürzel eingeben)")}</option>
          </select></label>
        {free && <label style={{fontSize:12.5}}><div className="field-label">{tf("Länderkürzel")}</div>
          <input className="input" style={{width:80}} maxLength={2} defaultValue={g.country||""} placeholder="TR" aria-label={tf("Länderkürzel (2 Buchstaben)")} onBlur={e=>{ const v = e.target.value.trim().toUpperCase(); if(/^[A-Z]{2}$/.test(v) && v!==g.country) patch({country:v}); }} /></label>}
        <label style={{fontSize:12.5}}><div className="field-label">{tf("Erwachsene")}</div>
          <input className="input" type="number" min={0} max={20} style={{width:80}} defaultValue={g.adults==null?"":g.adults} onBlur={e=>{ if(String(e.target.value)!==String(g.adults==null?"":g.adults)) patch({adults:e.target.value}); }} /></label>
        <label style={{fontSize:12.5}}><div className="field-label">{tf("Kinder")}</div>
          <input className="input" type="number" min={0} max={20} style={{width:80}} defaultValue={g.children==null?"":g.children} onBlur={e=>{ if(String(e.target.value)!==String(g.children==null?"":g.children)) patch({children:e.target.value}); }} /></label>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 6. Tourismus-Statistik nach Herkunftsland
function TourismStatsCard({hotel, api}){
  const [month,setMonth] = useState(()=>{ const d = new Date(todayIso()+"T12:00:00Z"); d.setUTCMonth(d.getUTCMonth()-1); return d.toISOString().slice(0,7); });
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null);
  useEffect(()=>{ setD(null); api("/api/hotels/"+hotel.id+"/tourism-statistics?month="+month).then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD({rows:[],missing_country:0}); }); },[api, hotel.id, month]);
  const rows = (d && d.rows) || [];
  const sum = (k) => rows.reduce((x,r)=>x+(r[k]||0),0);
  const csv = () => gtCsvDownload([["Land","Kürzel","Ankünfte","Nächtigungen"], ...rows.map(r=>[r.country==="??"?"Unbekannt":gtCountryName(r.country), r.country, r.arrivals, r.nights]), ["Summe","",sum("arrivals"),sum("nights")]], "tourismus-statistik-"+month+".csv");
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Ankünfte und Nächtigungen je Herkunftsland, gerechnet aus den Gästen unter „Anreisen“ (Erwachsene und Kinder).")}</div>
      {gtMsg(msg)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input className="input" type="month" style={{width:170,minHeight:44}} value={month} aria-label={tf("Monat")} onChange={e=>e.target.value && setMonth(e.target.value)} />
        {rows.length>0 && <button className="btn-primary" style={gtMain} onClick={csv}>{tf("CSV herunterladen")}</button>}
      </div>
      {d && d.missing_country>0 && <div style={{background:WARN_SOFT,color:INK,borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:12}}>{tf("Bei {0} Gästen fehlt das Herkunftsland. Sie stehen unter „Unbekannt“ – bitte in den Anreisen ergänzen.", d.missing_country)}</div>}
      {d && rows.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Anreisen in diesem Monat.")}</div>}
      {rows.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:360}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th scope="col" style={{padding:10,textAlign:"start"}}>{tf("Herkunftsland")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Ankünfte")}</th><th scope="col" style={{textAlign:"end",paddingInlineEnd:10}}>{tf("Nächtigungen")}</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.country} style={{borderTop:`1px solid ${BORDER}`}}>
          <td style={{padding:10}} data-no-i18n="">{gtCountryName(r.country)} {r.country!=="??" && <span style={{color:INK_MUTED}}>({r.country})</span>}</td>
          <td style={{textAlign:"end"}}>{fmtNum(r.arrivals,0)}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{fmtNum(r.nights,0)}</td></tr>)}
          <tr style={{borderTop:`2px solid ${BORDER}`,fontWeight:700}}><td style={{padding:10}}>{tf("Summe")}</td><td style={{textAlign:"end"}}>{fmtNum(sum("arrivals"),0)}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{fmtNum(sum("nights"),0)}</td></tr>
        </tbody></table></Card>}
      <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Format der Meldung bitte mit der Gemeinde/dem Land abgleichen.")}</div>
    </div>
  );
}

// ------------------------------------------------------------ 7. Eröffnungs-Simulator
function SimulatorView({hotel, api}){
  const [count,setCount] = useState(12); const [rep,setRep] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/simulation/report").then(setRep).catch(e=>{ setMsg({ok:false,text:e.message}); setRep({total:0,departments:[]}); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const start = () => run(async()=>{ const r = await api("/api/hotels/"+hotel.id+"/simulation/start","POST",{count}); setMsg({ok:true,text:tf("{0} Probe-Meldungen angelegt. Die Abteilungen bekommen eine Nachricht.", r.created)}); });
  const clear = () => { if(!window.confirm(tf("Alle Probedaten löschen? Echte Daten bleiben unberührt."))) return; run(async()=>{ const r = await api("/api/hotels/"+hotel.id+"/simulation/clear","POST",{}); setMsg({ok:true,text:tf("Probedaten gelöscht.")+(typeof r.deleted==="number" ? " ("+r.deleted+")" : "")}); }); };
  return (
    <div>
      <Card style={{marginBottom:14}}>
        <b>{tf("Probebetrieb vor der Eröffnung")}</b>
        <div style={{fontSize:13.5,color:INK_MUTED,margin:"6px 0 10px"}}>{tf("Ouverture legt erfundene Meldungen und Gästewünsche an, die mit „[Probe]“ beginnen. Die Teams bearbeiten sie wie im echten Betrieb. Danach siehst du, welche Abteilung wie schnell reagiert hat. Probedaten zählen in keiner Statistik und lassen sich mit einem Klick löschen.")}</div>
        {gtMsg(msg)}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select className="input" style={{width:"auto",minHeight:44}} value={count} aria-label={tf("Anzahl der Probe-Meldungen")} onChange={e=>setCount(Number(e.target.value))}>{[6,12,24].map(n=><option key={n} value={n}>{tf("{0} Meldungen", n)}</option>)}</select>
          <button className="btn-primary" style={gtMain} disabled={busy} onClick={start}>{tf("Probebetrieb starten")}</button>
          <button style={{...btnLine,minHeight:44,color:BAD}} disabled={busy || !rep || rep.total===0} onClick={clear}>{tf("Probedaten löschen")}</button>
        </div>
      </Card>
      <Card style={{padding:0,overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"center",padding:"10px 10px 0"}}><b style={{flex:1}}>{tf("Auswertung je Abteilung")}</b><button style={{...smallBtn,minHeight:44}} onClick={load}>{tf("Aktualisieren")}</button></div>
        {rep && rep.total===0 && <div style={{color:INK_MUTED,fontSize:13.5,padding:10}}>{tf("Noch kein Probebetrieb gestartet.")}</div>}
        {rep && rep.total>0 && <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:480}}>
          <thead><tr style={{color:INK_MUTED,fontSize:12}}><th scope="col" style={{padding:10,textAlign:"start"}}>{tf("Abteilung")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Erledigt")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Mittlere Zeit")}</th><th scope="col" style={{textAlign:"end",paddingInlineEnd:10}}>{tf("Längste Zeit")}</th></tr></thead>
          <tbody>{rep.departments.map(r=><tr key={r.department} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:10}}>{tf(r.department)}</td>
            <td style={{textAlign:"end",color:r.done===r.total?GOOD:INK}}>{r.done} / {r.total}</td>
            <td style={{textAlign:"end"}}>{gtMinutes(r.median_minutes)}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{gtMinutes(r.slowest_minutes)}</td></tr>)}</tbody></table>}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ 8. Saison-Übergabe
const GT_REHIRE = [["ja","Ja"],["vielleicht","Vielleicht"],["nein","Nein"]];
function SeasonHandoverView({hotel, api, members, onHotel}){
  const people = (members||[]).filter(m=>m.role!=="viewer");
  const [f,setF] = useState({good:"", bad:"", next:""});
  const [rehire,setRehire] = useState({}); const [savedAt,setSavedAt] = useState(null);
  // Die Mappe liegt geschützt beim Server (Wiedereinstellung ist eine Personalbewertung)
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/season-handover").then(sh=>{ const by = {}; (sh.rehire||[]).forEach(r=>{ if(r.user_id) by[r.user_id] = r; });
    setF({good:sh.good||"", bad:sh.bad||"", next:sh.next||""}); setRehire(by); setSavedAt(sh.updated_at||null); }).catch(()=>{}); },[api, hotel.id]);
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const lead = isLeadRole();
  const rowOf = (uid) => rehire[uid] || {rehire:"vielleicht", note:""};
  const setRow = (uid, k, v) => setRehire({...rehire, [uid]:{...rowOf(uid), [k]:v}});
  const body = () => ({ ...f, rehire: people.filter(m=>rehire[m.user_id]).map(m=>({user_id:m.user_id, name:shortName(m.email), rehire:rowOf(m.user_id).rehire, note:rowOf(m.user_id).note||""})) });
  const save = async () => { setBusy(true); setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/season-handover","PUT",body()); setSavedAt(r.updated_at||null); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const pdf = async () => { setBusy(true); setMsg(null);
    try {
      const safe = (p) => p.catch(()=>[]);
      const [tickets, stock, cal] = await Promise.all([
        safe(api("/api/hotels/"+hotel.id+"/tickets?status=open")), safe(api("/api/hotels/"+hotel.id+"/stock")),
        api("/api/hotels/"+hotel.id+"/maintenance-calendar").then(x=>x.items||[]).catch(()=>[])]);
      const low = (stock||[]).filter(s=>Number(s.quantity) < Number(s.min_quantity));
      const kindL = {pruefung:"Prüfung", vertrag:"Vertrag", wartung:"Wartung", dokument:"Dokument", genehmigung:"Genehmigung"};
      const sec = (title, inner) => '<h2 style="font-size:13px;margin:16px 0 4px;color:#1C2430">'+fsEsc(title)+'</h2>'+inner;
      const txt = (v) => v && v.trim() ? '<div style="font-size:11.5px;white-space:pre-wrap">'+fsEsc(v)+'</div>' : '<div style="font-size:11px;color:#6B7280">–</div>';
      const tbl = (head, rows) => rows.length ? '<table class="t"><thead><tr>'+head.map(h=>'<th>'+fsEsc(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+fsEsc(c)+'</td>').join("")+'</tr>').join("")+'</tbody></table>' : '<div style="font-size:11px;color:#6B7280">'+fsT("Nichts offen.")+'</div>';
      const b = body();
      const html = FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Saison-Übergabe"), fmtDate(todayIso()))
        + sec(translateString("Was lief gut?"), txt(b.good)) + sec(translateString("Was lief schlecht?"), txt(b.bad)) + sec(translateString("Was muss vor der nächsten Saison passieren?"), txt(b.next))
        + sec(translateString("Wiedereinstellung"), tbl([translateString("Name"),translateString("Wiedereinstellen?"),translateString("Notiz")], b.rehire.map(r=>[r.name, translateString(r.rehire==="ja"?"Ja":r.rehire==="nein"?"Nein":"Vielleicht"), r.note])))
        + sec(translateString("Offene Meldungen")+" ("+(tickets||[]).length+")", tbl([translateString("Titel"),translateString("Abteilung"),translateString("Ort"),translateString("Priorität")], (tickets||[]).map(t=>[t.title, translateString(t.department||""), t.location||"", translateString(t.priority||"")])))
        + sec(translateString("Lager unter Mindestbestand"), tbl([translateString("Artikel"),translateString("Abteilung"),translateString("Bestand"),translateString("Mindestbestand")], low.map(s=>[s.name, translateString(s.department||""), String(s.quantity)+" "+(s.unit||""), String(s.min_quantity)])))
        + sec(translateString("Verträge und Prüfungen"), tbl([translateString("Datum"),translateString("Art"),translateString("Titel"),translateString("Details")], cal.filter(i=>i.date>=todayIso()).map(i=>[fmtDate(i.date), translateString(kindL[i.kind]||i.kind), i.title, i.detail||""])))
        + fsFoot()+'</div>';
      await sheetPdf(html, safeFile(translateString("Saison-Übergabe")+" "+hotel.name+" "+todayIso())+".pdf");
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Am Saisonende festhalten, was die nächste Leitung wissen muss. Die Mappe als PDF enthält zusätzlich offene Meldungen, Lager unter Mindestbestand und anstehende Verträge und Prüfungen.")}</div>
      {gtMsg(msg)}
      <Card style={{marginBottom:14}}>
        <Field label={tf("Was lief gut?")}><textarea className="input" rows={4} maxLength={3000} value={f.good} disabled={!lead} onChange={e=>setF({...f,good:e.target.value})} /></Field>
        <Field label={tf("Was lief schlecht?")}><textarea className="input" rows={4} maxLength={3000} value={f.bad} disabled={!lead} onChange={e=>setF({...f,bad:e.target.value})} /></Field>
        <Field label={tf("Was muss vor der nächsten Saison passieren?")}><textarea className="input" rows={4} maxLength={3000} value={f.next} disabled={!lead} onChange={e=>setF({...f,next:e.target.value})} /></Field>
      </Card>
      <Card style={{marginBottom:14}}>
        <b>{tf("Wiedereinstellung")}</b>
        {people.length===0 && <div style={{color:INK_MUTED,fontSize:13.5,marginTop:6}}>{tf("Noch keine Teammitglieder.")}</div>}
        {people.map(m=>{ const r = rowOf(m.user_id); const set = !!rehire[m.user_id]; return (
          <div key={m.user_id} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${BORDER}`}}>
            <span style={{flex:"1 1 140px",fontSize:13.5}} data-no-i18n="">{shortName(m.email)}</span>
            <select className="input" style={{width:"auto",minHeight:44,color:set?INK:INK_MUTED}} disabled={!lead} value={set ? r.rehire : ""} aria-label={tf("Wiedereinstellen?")+": "+shortName(m.email)} onChange={e=>setRow(m.user_id,"rehire",e.target.value||"vielleicht")}>
              {!set && <option value="">{tf("Nicht bewertet")}</option>}{GT_REHIRE.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select>
            <input className="input" style={{flex:"2 1 180px"}} maxLength={300} disabled={!lead} value={r.note||""} placeholder={tf("Notiz")} aria-label={tf("Notiz")+": "+shortName(m.email)} onChange={e=>setRow(m.user_id,"note",e.target.value)} />
          </div>); })}
      </Card>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {lead && <button className="btn-primary" style={gtMain} disabled={busy} onClick={save}>{tf("Speichern")}</button>}
        <button style={{...btnLine,minHeight:44}} disabled={busy} onClick={pdf}><Icon n="filetext" /> {tf("Mappe als PDF")}</button>
      </div>
      {savedAt && <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Zuletzt gespeichert")}: {fmtDateTime(savedAt)}</div>}
    </div>
  );
}

// ------------------------------------------------------------ 9. Nachhaltigkeit
function SustainabilityView({hotel, api, onHotel}){
  const [year,setYear] = useState(Number(todayIso().slice(0,4)));
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [edit,setEdit] = useState(null); const [busy,setBusy] = useState(false);
  const admin = ACCESS.role==="admin";
  const load = useCallback(()=>{ setD(null); api("/api/hotels/"+hotel.id+"/sustainability?year="+year).then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }); },[api, hotel.id, year]);
  useEffect(()=>{ load(); },[load]);
  const years = []; for(let y=Number(todayIso().slice(0,4)); y>=Number(todayIso().slice(0,4))-4; y--) years.push(y);
  const save = async () => { setBusy(true); setMsg(null); try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{sustainability_settings:{factors:edit.factors, laundry_kg_per_piece:edit.laundry}}); onHotel && onHotel(h); setEdit(null); load(); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const pdf = async () => { setMsg(null);
    try {
      const html = FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Nachhaltigkeitsbericht"), String(d.year))
        + '<table class="t"><thead><tr><th>'+fsT("Kennzahl")+'</th><th class="r">'+fsT("Verbrauch")+'</th><th class="r">'+fsT("je Zimmernacht")+'</th><th class="r">CO₂ (kg)</th></tr></thead><tbody>'
        + '<tr><td>'+fsT("Zimmernächte")+'</td><td class="r">'+fsEsc(fmtNum(d.room_nights,0))+'</td><td class="r"></td><td class="r"></td></tr>'
        + d.energy.map(k=>'<tr><td>'+fsT(k.kind)+'</td><td class="r">'+fsEsc(fmtNum(k.used,0)+" "+(k.unit||""))+'</td><td class="r">'+fsEsc(k.per_night==null?"–":fmtNum(k.per_night,2))+'</td><td class="r">'+fsEsc(k.co2_kg==null?"–":fmtNum(k.co2_kg,0))+'</td></tr>').join("")
        + '<tr><td>'+fsT("Wäsche")+'</td><td class="r">'+fsEsc(fmtNum(d.laundry_pieces,0)+" "+translateString("Stück")+" ≈ "+fmtNum(d.laundry_kg,0)+" kg")+'</td><td class="r"></td><td class="r"></td></tr>'
        + '<tr class="g"><td>'+fsT("CO₂ gesamt")+'</td><td class="r"></td><td class="r">'+fsEsc(d.co2_per_night_kg==null?"–":fmtNum(d.co2_per_night_kg,2)+" kg")+'</td><td class="r">'+fsEsc(fmtNum(d.co2_kg,0))+'</td></tr></tbody></table>'
        + '<div style="font-size:10px;color:#6B7280;margin-top:8px">'+fsT("Richtwerte – für Zertifizierungen bitte die Vorgaben der Stelle verwenden.")+' '+fsEsc(Object.entries(d.settings.factors).map(([k,v])=>translateString(k)+" "+v).join(", "))+'</div>'+fsFoot()+'</div>';
      await sheetPdf(html, safeFile(translateString("Nachhaltigkeit")+" "+hotel.name+" "+d.year)+".pdf");
    } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Kennzahlen aus Zählerständen (Energie), Wäscherei und Belegung. Die Zimmernächte kommen aus der Belegungsprognose.")}</div>
      {gtMsg(msg)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <select className="input" style={{width:"auto",minHeight:44}} value={year} aria-label={tf("Jahr")} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
        {d && <button style={{...btnLine,minHeight:44}} onClick={pdf}><Icon n="filetext" /> {tf("PDF-Bericht")}</button>}
        {d && admin && !edit && <button style={{...btnLine,minHeight:44}} onClick={()=>setEdit({factors:{...d.settings.factors}, laundry:String(d.settings.laundry_kg_per_piece)})}>{tf("Faktoren bearbeiten")}</button>}
      </div>
      {d && <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:14}}>
          <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("Zimmernächte")}</div><div style={{fontSize:22,fontWeight:700}}>{fmtNum(d.room_nights,0)}</div></Card>
          <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("CO₂ gesamt")}</div><div style={{fontSize:22,fontWeight:700}}>{fmtNum(d.co2_kg,0)} kg</div></Card>
          <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("CO₂ je Zimmernacht")}</div><div style={{fontSize:22,fontWeight:700}}>{d.co2_per_night_kg==null ? "–" : fmtNum(d.co2_per_night_kg,2)+" kg"}</div></Card>
          <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("Wäsche")}</div><div style={{fontSize:22,fontWeight:700}}>{fmtNum(d.laundry_kg,0)} kg</div><div style={{fontSize:12,color:INK_MUTED}}>{fmtNum(d.laundry_pieces,0)} {tf("Stück")}</div></Card>
        </div>
        {d.energy.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Zählerstände für dieses Jahr.")}</div> :
          <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:460}}>
            <thead><tr style={{color:INK_MUTED,fontSize:12}}><th scope="col" style={{padding:10,textAlign:"start"}}>{tf("Energie")}</th><th scope="col" style={{textAlign:"end"}}>{tf("Verbrauch")}</th><th scope="col" style={{textAlign:"end"}}>{tf("je Zimmernacht")}</th><th scope="col" style={{textAlign:"end",paddingInlineEnd:10}}>CO₂ (kg)</th></tr></thead>
            <tbody>{d.energy.map(k=><tr key={k.kind} style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:10}}>{tf(k.kind)}</td><td style={{textAlign:"end"}}>{fmtNum(k.used,0)} {k.unit||""}</td>
              <td style={{textAlign:"end"}}>{k.per_night==null?"–":fmtNum(k.per_night,2)}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{k.co2_kg==null?"–":fmtNum(k.co2_kg,0)}</td></tr>)}</tbody></table></Card>}
        {edit && <Card style={{marginTop:14,borderColor:BRASS}}>
          <b>{tf("Emissionsfaktoren")}</b>
          <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("kg CO₂ je Einheit des Zählers (kWh, m³ …)")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:"0 10px"}}>
            {Object.keys(edit.factors).map(k=><Field key={k} label={tf(k)}><input className="input" inputMode="decimal" value={edit.factors[k]} onChange={e=>setEdit({...edit,factors:{...edit.factors,[k]:e.target.value}})} /></Field>)}
            <Field label={tf("kg je Wäschestück")}><input className="input" inputMode="decimal" value={edit.laundry} onChange={e=>setEdit({...edit,laundry:e.target.value})} /></Field>
          </div>
          <div style={{display:"flex",gap:8}}><button className="btn-primary" style={gtMain} disabled={busy} onClick={save}>{tf("Speichern")}</button><button style={{...btnLine,minHeight:44}} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button></div>
        </Card>}
        <div style={{fontSize:12.5,color:INK_MUTED,marginTop:12}}>{tf("Richtwerte – für Zertifizierungen bitte die Vorgaben der Stelle verwenden.")}</div>
      </div>}
    </div>
  );
}

// ------------------------------------------------------------ 10. Investoren-Seite: was wird zusätzlich gezeigt
function InvestorViewCard({hotel, api, onHotel}){
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  if(ACCESS.role!=="admin" || hotel.investor_view===undefined) return null; // nur Admin; Migration 038 noch nicht eingespielt
  const v = hotel.investor_view || {};
  const OPT = [["budget","Budget (Plan und Ist)"],["risks","Risiken (offen und hoch)"],["tasks","Aufgaben (erledigt, kritisch überfällig)"]];
  const toggle = async (k) => { setBusy(true); setMsg(null); try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{investor_view:{budget:!!v.budget, risks:!!v.risks, tasks:!!v.tasks, [k]:!v[k]}}); onHotel && onHotel(h); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  return (
    <Card style={{marginBottom:14}}>
      <b>{tf("Eigentümer- und Investoren-Seite")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 6px"}}>{tf("Der Link zeigt immer den Fortschritt der Eröffnung. Hier legst du fest, was zusätzlich sichtbar ist.")}</div>
      {gtMsg(msg)}
      {OPT.map(([k,l])=><label key={k} style={{display:"flex",gap:10,alignItems:"center",minHeight:44,cursor:"pointer",fontSize:13.5,borderTop:`1px solid ${BORDER}`}}>
        <input type="checkbox" checked={!!v[k]} disabled={busy} onChange={()=>toggle(k)} /> {tf(l)}</label>)}
    </Card>
  );
}

// ------------------------------------------------------------ 11. Aushilfs-Börse
function NetworkView({hotel, api, me, myDepts}){
  const [opt,setOpt] = useState(undefined); const [jobs,setJobs] = useState(null); const [msg,setMsg] = useState(null);
  const [optForm,setOptForm] = useState(null); const [apply,setApply] = useState(null); const [jobForm,setJobForm] = useState(null); const [apps,setApps] = useState({});
  const lead = isLeadRole();
  const depts = (myDepts && myDepts.length) ? myDepts : DEPARTMENTS;
  const loadOpt = () => api("/api/network/optin").then(setOpt).catch(()=>setOpt(null));
  const loadJobs = () => api("/api/network/jobs").then(setJobs).catch(e=>{ setMsg({ok:false,text:e.message}); setJobs([]); });
  useEffect(()=>{ loadOpt(); loadJobs(); },[hotel.id]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const isOwn = (j) => j.own!==undefined ? !!j.own : (j.hotel_id===hotel.id || (!!hotel.organization_id && j.organization_id===hotel.organization_id));
  const loadApps = (j) => api("/api/network-jobs/"+j.id+"/applications").then(l=>setApps(a=>({...a,[j.id]:l}))).catch(e=>setMsg({ok:false,text:e.message}));
  const stColor = (s) => s==="angenommen" ? [GOOD,GOOD_SOFT] : s==="abgelehnt" ? [BAD,BAD_SOFT] : [WARN,WARN_SOFT];
  const leadDepts = DEPARTMENTS.filter(d=>canManageDept(d));
  return (
    <div>
      <div role="note" style={{background:WARN_SOFT,border:`1px solid ${WARN}`,borderRadius:10,padding:"10px 14px",fontSize:13.5,marginBottom:14}}>
        <b>{tf("Wichtig")}:</b> {tf("Ouverture vermittelt nur den Kontakt. Der Arbeitsvertrag für den Einsatz entsteht direkt zwischen der Person und dem einsetzenden Hotel. Bitte Arbeitszeitgrenzen (AZG) über beide Arbeitgeber beachten. Rechtlich prüfen lassen.")}
      </div>
      {gtMsg(msg)}
      <Card style={{marginBottom:14}}>
        <b>{tf("Meine Teilnahme")}</b>
        {opt===undefined ? null : opt && !optForm ? <div style={{marginTop:6,fontSize:13.5}}>
            <div>{tf("Du bist dabei")}: <b data-no-i18n="">{opt.city}</b> · <span data-no-i18n="">{(opt.departments||[]).map(d=>tf(d)).join(", ")}</span></div>
            <div style={{fontSize:12.5,color:INK_MUTED,margin:"2px 0 8px"}}>{tf("Du siehst offene Einsätze anderer Hotels an deinem Ort. Dein Name wird erst bei einer Bewerbung sichtbar.")}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={{...btnLine,minHeight:44}} onClick={()=>setOptForm({city:opt.city, departments:opt.departments||[]})}>{tf("Ändern")}</button>
              <button style={{...btnLine,minHeight:44}} onClick={()=>run(async()=>{ await api("/api/network/optin","DELETE"); setOpt(null); loadJobs(); }, tf("Teilnahme beendet."))}>{tf("Nicht mehr teilnehmen")}</button>
            </div></div>
          : !optForm ? <div style={{marginTop:6}}>
            <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:8}}>{tf("Wenn du freiwillig teilnimmst, siehst du Aushilfs-Einsätze anderer Hotels in deinem Ort und kannst dich bewerben. Jederzeit widerrufbar.")}</div>
            <button className="btn-primary" style={gtMain} onClick={()=>setOptForm({city:hotel.city||"", departments:[]})}>{tf("Teilnehmen")}</button></div> : null}
        {optForm && <div style={{marginTop:8}}>
          <Field label={tf("Ort")}><input className="input" value={optForm.city} maxLength={80} onChange={e=>setOptForm({...optForm,city:e.target.value})} /></Field>
          <div className="field-label">{tf("Abteilungen")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 16px",marginBottom:10}}>{depts.map(d=><label key={d} style={{display:"flex",gap:6,alignItems:"center",minHeight:44,fontSize:13.5,cursor:"pointer"}}>
            <input type="checkbox" checked={optForm.departments.includes(d)} onChange={e=>setOptForm({...optForm,departments:e.target.checked?[...optForm.departments,d]:optForm.departments.filter(x=>x!==d)})} /> {tf(d)}</label>)}</div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-primary" style={gtMain} disabled={!optForm.city.trim() || optForm.departments.length===0} onClick={()=>run(async()=>{ const r = await api("/api/network/optin","PUT",optForm); setOpt(r); setOptForm(null); loadJobs(); }, tf("Gespeichert."))}>{tf("Speichern")}</button>
            <button style={{...btnLine,minHeight:44}} onClick={()=>setOptForm(null)}>{tf("Abbrechen")}</button></div>
        </div>}
      </Card>

      {lead && <div style={{marginBottom:14}}>
        {!jobForm && leadDepts.length>0 && <button className="btn-primary" style={gtMain} onClick={()=>setJobForm({department:leadDepts[0], job_date:"", start_time:"", end_time:"", pay_note:"", note:""})}>{tf("Einsatz ausschreiben")}</button>}
        {jobForm && <Card style={{borderColor:BRASS}}>
          <b>{tf("Einsatz ausschreiben")}</b>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px",marginTop:8}}>
            <Field label={tf("Abteilung")}><select className="input" value={jobForm.department} onChange={e=>setJobForm({...jobForm,department:e.target.value})}>{leadDepts.map(d=><option key={d} value={d}>{tf(d)}</option>)}</select></Field>
            <Field label={tf("Datum")}><input className="input" type="date" value={jobForm.job_date} min={todayIso()} onChange={e=>setJobForm({...jobForm,job_date:e.target.value})} /></Field>
            <Field label={tf("Von")}><input className="input" type="time" value={jobForm.start_time} onChange={e=>setJobForm({...jobForm,start_time:e.target.value})} /></Field>
            <Field label={tf("Bis")}><input className="input" type="time" value={jobForm.end_time} onChange={e=>setJobForm({...jobForm,end_time:e.target.value})} /></Field>
          </div>
          <Field label={tf("Bezahlung")}><input className="input" maxLength={120} value={jobForm.pay_note} placeholder={tf("z. B. 16 € pro Stunde")} onChange={e=>setJobForm({...jobForm,pay_note:e.target.value})} /></Field>
          <Field label={tf("Notiz")}><input className="input" maxLength={500} value={jobForm.note} onChange={e=>setJobForm({...jobForm,note:e.target.value})} /></Field>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-primary" style={gtMain} disabled={!jobForm.job_date} onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/network-jobs","POST",jobForm); setJobForm(null); loadJobs(); }, tf("Einsatz ausgeschrieben."))}>{tf("Ausschreiben")}</button>
            <button style={{...btnLine,minHeight:44}} onClick={()=>setJobForm(null)}>{tf("Abbrechen")}</button></div>
        </Card>}
      </div>}

      <b style={{display:"block",marginBottom:8}}>{tf("Einsätze")}</b>
      {jobs && jobs.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Zurzeit gibt es keine offenen Einsätze.")}</div>}
      {(jobs||[]).map(j=>{ const own = isOwn(j); const list = apps[j.id]; return (
        <Card key={j.id} style={{marginBottom:10,opacity:j.status==="offen"?1:0.7}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"baseline"}}>
            <b data-no-i18n="">{j.hotel_name||"–"}</b>
            <span style={{fontSize:13}}>{tf(j.department)}</span>
            <span style={{flex:1}} />
            {j.status!=="offen" && <Pill color={INK_MUTED} bg={PAPER}>{tf(j.status)}</Pill>}
            {own && <Pill color={BRASS} bg={BRASS_SOFT}>{tf("Eigener Einsatz")}</Pill>}
          </div>
          <div style={{fontSize:13.5,marginTop:4}}>{fmtDay(j.job_date,{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})}{j.start_time ? " · "+j.start_time.slice(0,5)+(j.end_time?"–"+j.end_time.slice(0,5):"") : ""}{j.city ? <span data-no-i18n=""> · {j.city}</span> : null}</div>
          {j.pay_note && <div style={{fontSize:13}} data-no-i18n="">{tf("Bezahlung")}: {j.pay_note}</div>}
          {j.note && <div style={{fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{j.note}</div>}
          {!own && j.status==="offen" && (j.my_application
            ? <div style={{marginTop:8}}>{tf("Deine Bewerbung")}: <Pill color={stColor(j.my_application)[0]} bg={stColor(j.my_application)[1]}>{tf(j.my_application)}</Pill></div>
            : <button className="btn-primary" style={{...gtMain,marginTop:8}} onClick={()=>setApply({job:j, contact:"", message:""})}>{tf("Bewerben")}</button>)}
          {own && lead && <div style={{marginTop:8}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={{...btnLine,minHeight:44}} onClick={()=>list ? setApps(a=>{ const c = {...a}; delete c[j.id]; return c; }) : loadApps(j)}>{list ? tf("Bewerbungen ausblenden") : tf("Bewerbungen ansehen")}</button>
              {j.status==="offen" && <button style={{...btnLine,minHeight:44}} onClick={()=>run(async()=>{ await api("/api/network-jobs/"+j.id,"PATCH",{status:"vergeben"}); loadJobs(); })}>{tf("Als vergeben markieren")}</button>}
              {j.status==="offen" && <button style={{...btnLine,minHeight:44,color:BAD}} onClick={()=>run(async()=>{ await api("/api/network-jobs/"+j.id,"PATCH",{status:"abgesagt"}); loadJobs(); })}>{tf("Absagen")}</button>}
            </div>
            {list && list.length===0 && <div style={{fontSize:13,color:INK_MUTED,marginTop:6}}>{tf("Noch keine Bewerbungen.")}</div>}
            {list && list.map(a=>(
              <div key={a.id} style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,marginTop:6}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <b data-no-i18n="">{a.contact}</b><Pill color={stColor(a.status)[0]} bg={stColor(a.status)[1]}>{tf(a.status)}</Pill><span style={{fontSize:12,color:INK_MUTED}}>{fmtDateTime(a.created_at)}</span></div>
                {a.message && <div style={{fontSize:12.5,marginTop:2}} data-no-i18n="">{a.message}</div>}
                {a.status!=="zurückgezogen" && <div style={{display:"flex",gap:8,marginTop:6}}>
                  {a.status!=="angenommen" && <button className="btn-primary" style={gtMain} onClick={()=>run(async()=>{ await api("/api/network-applications/"+a.id,"PATCH",{status:"angenommen"}); loadApps(j); })}>{tf("Annehmen")}</button>}
                  {a.status!=="abgelehnt" && <button style={{...btnLine,minHeight:44,color:BAD}} onClick={()=>run(async()=>{ await api("/api/network-applications/"+a.id,"PATCH",{status:"abgelehnt"}); loadApps(j); })}>{tf("Ablehnen")}</button>}
                </div>}
              </div>))}
          </div>}
        </Card>); })}
      {apply && <Overlay onClose={()=>setApply(null)} width={440} label={tf("Bewerben")}>
        <b>{tf("Bewerben")}: <span data-no-i18n="">{apply.job.hotel_name}</span> · {fmtDate(apply.job.job_date)}</b>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"6px 0 10px"}}>{tf("Telefon oder E-Mail wird nur der Leitung dieses Einsatzes angezeigt.")}</div>
        <Field label={tf("Telefon oder E-Mail")}><input className="input" value={apply.contact} maxLength={160} onChange={e=>setApply({...apply,contact:e.target.value})} /></Field>
        <Field label={tf("Nachricht (optional)")}><textarea className="input" rows={3} maxLength={500} value={apply.message} onChange={e=>setApply({...apply,message:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}>
          <button className="btn-primary" style={gtMain} disabled={!apply.contact.trim()} onClick={()=>run(async()=>{ await api("/api/network-jobs/"+apply.job.id+"/apply","POST",{contact:apply.contact, message:apply.message}); setApply(null); loadJobs(); }, tf("Bewerbung gesendet."))}>{tf("Bewerbung senden")}</button>
          <button style={{...btnLine,minHeight:44}} onClick={()=>setApply(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
    </div>
  );
}

// ------------------------------------------------------------ 12. Lehrlinge: Ausbildungsplan und Berichtsheft
function ApprenticesView({orgId, api, members, me}){
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [sel,setSel] = useState(null); const [msg,setMsg] = useState(null);
  const lead = canManageDept("Personal");
  const load = () => api("/api/organizations/"+orgId+"/apprentices").then(l=>{ setList(l); setSel(s=>s ? (l.find(x=>x.id===s.id)||null) : null); }).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); });
  useEffect(()=>{ load(); },[orgId]);
  const nameOf = (a) => holderLabel(members, {user_id:a.user_id, holder_name:a.person_name});
  const trainerOf = (a) => a.trainer_user_id ? holderLabel(members, {user_id:a.trainer_user_id}) : "–";
  const save = async () => { setMsg(null);
    const body = {user_id:form.user_id||null, person_name:form.holder_name||"", trade:form.trade, start_date:form.start_date, end_date:form.end_date||null, trainer_user_id:form.trainer_user_id||null};
    try { if(form.id) await api("/api/apprentices/"+form.id,"PATCH",body); else await api("/api/organizations/"+orgId+"/apprentices","POST",{...body, plan:[]}); setForm(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const people = (members||[]).filter(m=>m.role!=="viewer");
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Lehrlinge mit Ausbildungsplan zum Abhaken und wöchentlichem Berichtsheft. Der Lehrling schreibt, der Ausbilder gibt Rückmeldung.")}</div>
      {gtMsg(msg)}
      {lead && !form && <button className="btn-primary" style={{...gtMain,marginBottom:12}} onClick={()=>setForm({user_id:"", holder_name:"", trade:"", start_date:todayIso(), end_date:"", trainer_user_id:""})}>{tf("Lehrling anlegen")}</button>}
      {form && <Card style={{marginBottom:14,borderColor:BRASS}}>
        <HolderField members={members} value={form} onChange={(v)=>setForm({...form,...v})} />
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Lehrberuf")}><input className="input" value={form.trade} maxLength={80} placeholder={tf("z. B. Restaurantfachmann/-frau")} onChange={e=>setForm({...form,trade:e.target.value})} /></Field>
          <Field label={tf("Lehrbeginn")}><input className="input" type="date" value={form.start_date||""} onChange={e=>setForm({...form,start_date:e.target.value})} /></Field>
          <Field label={tf("Lehrende")}><input className="input" type="date" value={form.end_date||""} onChange={e=>setForm({...form,end_date:e.target.value})} /></Field>
          <Field label={tf("Ausbilder")}><select className="input" value={form.trainer_user_id||""} onChange={e=>setForm({...form,trainer_user_id:e.target.value})}><option value="">{tf("Bitte wählen")}</option>{memberOptions(people)}</select></Field>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn-primary" style={gtMain} disabled={!form.trade.trim() || !form.start_date || (!form.user_id && !(form.holder_name||"").trim())} onClick={save}>{tf("Speichern")}</button>
          <button style={{...btnLine,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {list && list.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Lehrlinge.")}</div>}
      {(list||[]).map(a=>{ const plan = a.plan||[]; const done = plan.filter(x=>x.done).length; return (
        <Card key={a.id} style={{marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:"1 1 200px"}}>
              <b data-no-i18n="">{nameOf(a)}</b> <span data-no-i18n="" style={{color:INK_MUTED,fontSize:13}}>· {a.trade}</span>
              <div style={{fontSize:12.5,color:INK_MUTED}}>{fmtDate(a.start_date)} – {a.end_date ? fmtDate(a.end_date) : "…"} · {tf("Ausbilder")}: <span data-no-i18n="">{trainerOf(a)}</span></div>
              {plan.length>0 && <div style={{fontSize:12.5,marginTop:2}}>{tf("Ausbildungsplan")}: <b>{done}/{plan.length}</b></div>}
            </div>
            <button className="btn-primary" style={gtMain} onClick={()=>setSel(a)}>{tf("Plan und Berichtsheft")}</button>
            {lead && <button style={{...btnLine,minHeight:44}} onClick={()=>setForm({id:a.id, user_id:a.user_id||"", holder_name:a.person_name||"", trade:a.trade, start_date:a.start_date, end_date:a.end_date||"", trainer_user_id:a.trainer_user_id||""})}>{tf("Bearbeiten")}</button>}
          </div>
        </Card>); })}
      {sel && <ApprenticeDetail a={sel} api={api} me={me} lead={lead} name={nameOf(sel)} onClose={()=>setSel(null)} onChanged={load} />}
    </div>
  );
}
function ApprenticeDetail({a, api, me, lead, name, onClose, onChanged}){
  const isSelf = !!me && a.user_id===me.id; const isTrainer = !!me && a.trainer_user_id===me.id;
  const canPlan = lead || isTrainer; const canFeedback = lead || isTrainer;
  const [week,setWeek] = useState(gtMonday(todayIso())); const [logs,setLogs] = useState(null);
  const [text,setText] = useState(""); const [fb,setFb] = useState(""); const [newItem,setNewItem] = useState(""); const [msg,setMsg] = useState(null);
  const plan = a.plan||[];
  const loadLogs = () => api("/api/apprentices/"+a.id+"/logs").then(setLogs).catch(e=>{ setMsg({ok:false,text:e.message}); setLogs([]); });
  useEffect(()=>{ loadLogs(); },[a.id]);
  useEffect(()=>{ const l = (logs||[]).find(x=>x.week_start===week); setText(l ? l.text||"" : ""); setFb(l ? l.trainer_feedback||"" : ""); },[logs, week]);
  const savePlan = async (next) => { setMsg(null); try { await api("/api/apprentices/"+a.id,"PATCH",{plan:next}); onChanged(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const saveLog = async (body) => { setMsg(null); try { await api("/api/apprentices/"+a.id+"/logs","PUT",{week_start:week, ...body}); setMsg({ok:true,text:tf("Gespeichert.")}); loadLogs(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <Overlay onClose={onClose} width={640} label={tf("Plan und Berichtsheft")}>
      <b style={{fontSize:16}}><span data-no-i18n="">{name}</span> · <span data-no-i18n="">{a.trade}</span></b>
      {gtMsg(msg)}
      <div className="field-label" style={{marginTop:12}}>{tf("Ausbildungsplan")}</div>
      {plan.length===0 && <div style={{fontSize:13,color:INK_MUTED,marginBottom:6}}>{tf("Noch keine Punkte.")}</div>}
      {plan.map((p,i)=>(
        <label key={i} style={{display:"flex",gap:8,alignItems:"flex-start",minHeight:44,padding:"4px 0",borderTop:`1px solid ${BORDER}`,cursor:canPlan?"pointer":"default",fontSize:13.5}}>
          <input type="checkbox" style={{marginTop:3}} checked={!!p.done} disabled={!canPlan} onChange={e=>savePlan(plan.map((x,j)=>j===i?{...x,done:e.target.checked,done_at:e.target.checked?todayIso():null}:x))} />
          <span style={{flex:1}}><span data-no-i18n="" style={{textDecoration:p.done?"line-through":"none",color:p.done?INK_MUTED:INK}}>{p.item}</span>{p.done && p.done_at && <span style={{display:"block",fontSize:12,color:INK_MUTED}}>{fmtDate(p.done_at)}</span>}</span>
          {canPlan && <button style={{...linkBtn,color:BAD,minHeight:44}} aria-label={tf("Löschen")} onClick={e=>{ e.preventDefault(); savePlan(plan.filter((_,j)=>j!==i)); }}>✕</button>}
        </label>))}
      {canPlan && <div style={{display:"flex",gap:8,margin:"8px 0 14px"}}>
        <input className="input" style={{flex:1}} maxLength={200} value={newItem} placeholder={tf("Neuer Punkt, z. B. Servieren und Abräumen")} aria-label={tf("Neuer Punkt im Ausbildungsplan")} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && newItem.trim()){ savePlan([...plan,{item:newItem.trim(),done:false,done_at:null}]); setNewItem(""); } }} />
        <button className="btn-primary" style={gtMain} disabled={!newItem.trim()} onClick={()=>{ savePlan([...plan,{item:newItem.trim(),done:false,done_at:null}]); setNewItem(""); }}>{tf("Hinzufügen")}</button>
      </div>}
      <div className="field-label" style={{marginTop:14}}>{tf("Berichtsheft")}</div>
      <Field label={tf("Woche ab Montag")}><input className="input" type="date" style={{maxWidth:200}} value={week} onChange={e=>e.target.value && setWeek(gtMonday(e.target.value))} /></Field>
      <Field label={tf("Was habe ich diese Woche gemacht und gelernt?")}><textarea className="input" rows={5} maxLength={4000} value={text} disabled={!isSelf} onChange={e=>setText(e.target.value)} /></Field>
      {isSelf && <button className="btn-primary" style={{...gtMain,marginBottom:12}} onClick={()=>saveLog({text})}>{tf("Eintrag speichern")}</button>}
      <Field label={tf("Rückmeldung des Ausbilders")}><textarea className="input" rows={3} maxLength={2000} value={fb} disabled={!canFeedback} onChange={e=>setFb(e.target.value)} /></Field>
      {canFeedback && <button className="btn-primary" style={{...gtMain,marginBottom:12}} onClick={()=>saveLog({trainer_feedback:fb})}>{tf("Rückmeldung speichern")}</button>}
      {logs && logs.length>0 && <div>
        <div className="field-label">{tf("Frühere Wochen")}</div>
        {logs.slice(0,12).map(l=><div key={l.id||l.week_start} style={{padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:12.5}}>
          <button style={{...linkBtn,fontSize:13,minHeight:44}} onClick={()=>setWeek(l.week_start)}>{tf("Woche ab {0}", fmtDate(l.week_start))}</button>
          {l.trainer_feedback && <span style={{color:GOOD}}> ✓ {tf("Rückmeldung")}</span>}
        </div>)}
      </div>}
      <div style={{marginTop:12}}><button style={{...btnLine,minHeight:44}} onClick={onClose}>{tf("Schließen")}</button></div>
    </Overlay>
  );
}

// ------------------------------------------------------------ 13. Google-Bewertungen abholen
function GoogleReviewsSync({hotel, api, onHotel, onDone}){
  const [pid,setPid] = useState(hotel.google_place_id||""); const [msg,setMsg] = useState(null); const [res,setRes] = useState(null); const [busy,setBusy] = useState(false);
  const saved = (hotel.google_place_id||"")===pid.trim();
  const save = async () => { setBusy(true); setMsg(null); try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{google_place_id:pid.trim()}); onHotel && onHotel(h); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const sync = async () => { setBusy(true); setMsg(null); setRes(null); try { const r = await api("/api/hotels/"+hotel.id+"/reviews/google-sync","POST",{}); setRes(r); onDone && onDone(r); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  return (
    <Card style={{marginBottom:14}}>
      <b>{tf("Bewertungen von Google abholen")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>
        {tf("Dafür braucht Ouverture die Place-ID deines Hotels. Du findest sie mit dem „Place ID Finder“ von Google:")} <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" style={{color:BRASS}}>developers.google.com/maps/documentation/places/web-service/place-id</a>
      </div>
      {gtMsg(msg)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 240px"}}><Field label={tf("Google Place-ID")}><input className="input" value={pid} maxLength={200} placeholder="ChIJ…" onChange={e=>setPid(e.target.value)} /></Field></div>
        <button style={{...btnLine,minHeight:44,marginBottom:14}} disabled={busy || saved} onClick={save}>{tf("Speichern")}</button>
        <button className="btn-primary" style={{...gtMain,marginBottom:14}} disabled={busy || !saved || !pid.trim()} onClick={sync}>{busy ? tf("Holt ab…") : tf("Von Google abholen")}</button>
      </div>
      {res && <div role="status" style={{background:GOOD_SOFT,borderRadius:8,padding:"8px 12px",fontSize:13.5}}>
        {tf("{0} neue Bewertungen übernommen, {1} waren schon da.", res.created, res.existing)}
        {res.google_rating!=null && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:2}}>{tf("Google-Gesamtbewertung")}: <b>{res.google_rating}</b>{res.google_count!=null ? " ("+res.google_count+")" : ""}</div>}
      </div>}
      <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Google liefert nur die neuesten 5 Bewertungen. Der Server-Schlüssel GOOGLE_PLACES_API_KEY muss in Render eingetragen sein; sonst meldet der Abruf einen Fehler.")}</div>
    </Card>
  );
}
