// ============================================================ Paket 044 (1): Preisempfehlung – Zimmerpreis-Vorschläge mit Gründen.
// Die Rechnung macht der Server (routes-rates.js); Feiertage kommen aus dem Browser (holidayMap). Nichts wird ins PMS übertragen.

const RT_FACTOR = {belegung:"Belegung", wochenende:"Wochenende", feiertag:"Feiertag", ereignis:"Ereignis", lastminute:"Kurzfristig", fruehbucher:"Frühbucher"};
const rtPct = (p) => (p>0?"+":"")+Number(p).toLocaleString(UI_LOCALE,{maximumFractionDigits:1})+" %";
const rtWd = (iso) => new Date(iso+"T12:00:00Z").toLocaleDateString(UI_LOCALE,{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"});

function RatesView({hotel, api}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [days,setDays] = useState(60);
  const [edit,setEdit] = useState(null); const [draft,setDraft] = useState({});
  const money = moneyOf(hotel);
  const load = useCallback(()=>{
    const from = todayIso(), to = addDaysIso(from, days-1);
    const hol = opHolidays(hotel, from, to).filter(h=>h.own).map(h=>h.date);
    return api("/api/hotels/"+hotel.id+"/rates?days="+days+"&holidays="+encodeURIComponent(hol.join(","))).then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); });
  },[api, hotel.id, days]);
  useEffect(()=>{ load(); },[load]);
  const save = async (r, final) => {
    setMsg(null);
    try { await api("/api/hotels/"+hotel.id+"/rates/"+r.day,"PUT",{room_type:r.room_type, suggested:r.price, final:final===""?null:final}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(d===false) return <div>{msg && <ErrorText>{msg.text}</ErrorText>}</div>;
  const types = Object.keys(d.settings.base||{});
  const byDay = {}; d.rates.forEach(r=>{ (byDay[r.day]=byDay[r.day]||[]).push(r); });
  const csv = () => opCsv([[tf("Datum"),tf("Zimmertyp"),tf("Belegung %"),tf("Vorschlag"),tf("Endpreis"),tf("Gründe")]]
    .concat(d.rates.map(r=>[r.day, r.room_type||tf("alle Zimmer"), r.occupancy==null?"":r.occupancy, r.price, r.decision&&r.decision.final!=null?r.decision.final:"", r.factors.map(f=>translateString(RT_FACTOR[f.key])+" "+rtPct(f.pct)).join("; ")])),
    safeFile(translateString("Preisempfehlung")+" "+hotel.name+" "+todayIso())+".csv");
  return (
    <div>
      <BgmHead title={tf("Preisempfehlung")} intro={tf("Vorschläge für den Zimmerpreis aus Belegung, Wochentag, Feiertagen, Ereignissen in der Stadt und Vorlaufzeit. Jeder Vorschlag nennt seine Gründe – entscheiden und im PMS eintragen tust du.")} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {!d.has_forecast && <Card style={{marginBottom:12,background:WARN_SOFT}}><div style={{fontSize:13.5}}>{tf("Für diesen Zeitraum ist keine Belegung erfasst. Ohne Belegung rechnet die Empfehlung nur mit Wochentag, Feiertagen und Ereignissen. Die Belegung kommt aus dem PMS oder wird unter Kennzahlen eingetragen.")}</div></Card>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        <select className="input" style={{width:"auto"}} value={days} aria-label={tf("Zeitraum")} onChange={e=>setDays(Number(e.target.value))}>
          {[14,30,60,90,120].map(n=><option key={n} value={n}>{tf("{0} Tage", n)}</option>)}
        </select>
        {d.rates.length>0 && <button style={opSmall} onClick={csv}><Icon n="file" /> {tf("Excel/CSV")}</button>}
        {d.can_edit && <button style={opSmall} onClick={()=>setEdit(JSON.parse(JSON.stringify(d.settings)))}><Icon n="gear" /> {tf("Einstellungen")}</button>}
      </div>
      {!types.length && <Card><div style={{fontSize:13.5}}>{d.can_edit ? tf("Lege zuerst in den Einstellungen einen Grundpreis fest (für alle Zimmer oder je Zimmertyp).") : tf("Die Leitung Revenue Management oder Finanzen hat noch keinen Grundpreis festgelegt.")}</div></Card>}
      {types.length>0 && <div className="card" style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:`2px solid ${BORDER}`}}>
            <th style={bgmTh}>{tf("Datum")}</th><th style={bgmThR}>{tf("Belegung")}</th>
            {types.map(t=><th key={t} style={bgmThR} data-no-i18n={t?"":undefined}>{t || tf("Preis")}</th>)}
            <th style={bgmTh}>{tf("Gründe")}</th>
          </tr></thead>
          <tbody>{Object.keys(byDay).map(day=>{ const rows = byDay[day], f = rows[0].factors; return (
            <tr key={day} style={{borderBottom:`1px solid ${BORDER}`}}>
              <td style={{...bgmTd,whiteSpace:"nowrap"}}>{rtWd(day)}</td>
              <td style={bgmTdR}>{rows[0].occupancy==null ? "–" : rows[0].occupancy+" %"}</td>
              {rows.map(r=>{ const k = day+"|"+r.room_type, fin = r.decision && r.decision.final!=null ? r.decision.final : null; return (
                <td key={k} style={{...bgmTdR,whiteSpace:"nowrap"}}>
                  <div style={{fontWeight:700}}>{money(r.price)}</div>
                  <input className="input" inputMode="decimal" aria-label={tf("Endpreis {0}", rtWd(day)+" "+(r.room_type||""))} placeholder={tf("Endpreis")}
                    style={{width:96,padding:"4px 6px",fontSize:12.5,textAlign:"end",marginTop:2}} value={draft[k]!==undefined ? draft[k] : (fin==null?"":String(fin))}
                    onChange={e=>setDraft({...draft,[k]:e.target.value})}
                    onBlur={()=>{ if(draft[k]===undefined) return; const v = draft[k].trim(); const nd = {...draft}; delete nd[k]; setDraft(nd); if(v!==(fin==null?"":String(fin))) save(r, v); }} />
                </td>); })}
              <td style={bgmTd}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{f.length ? f.map(x=><span key={x.key} title={x.label||""} style={{fontSize:11.5,padding:"1px 7px",borderRadius:999,background:x.pct>0?WARN_SOFT:GOOD_SOFT,color:x.pct>0?WARN_TEXT:GOOD_TEXT}}>{tf(RT_FACTOR[x.key])} {rtPct(x.pct)}</span>) : <span style={{color:INK_MUTED,fontSize:12}}>{tf("Grundpreis")}</span>}</div></td>
            </tr>); })}</tbody>
        </table>
      </div>}
      {d.adr_weekday && d.adr_weekday.some(x=>x!=null) && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>
        {tf("Durchschnittspreis der letzten 12 Monate je Wochentag:")} {[1,2,3,4,5,6,0].map(w=>d.adr_weekday[w]==null?null:<span key={w} style={{marginInlineEnd:10}}>{new Date(Date.UTC(2026,10,1+((w+7)%7))).toLocaleDateString(UI_LOCALE,{weekday:"short",timeZone:"UTC"})} {money(d.adr_weekday[w])}</span>)}
      </div>}
      {edit && <RateSettingsForm hotel={hotel} api={api} value={edit} onClose={()=>setEdit(null)} onSaved={()=>{ setEdit(null); setMsg({ok:true,text:tf("Gespeichert.")}); load(); }} />}
    </div>
  );
}

function RateSettingsForm({hotel, api, value, onClose, onSaved}){
  const [s,setS] = useState(()=>({...value, baseList:Object.entries(value.base||{}).map(([k,v])=>({type:k, price:String(v)})).concat(Object.keys(value.base||{}).length?[]:[{type:"",price:""}])}));
  const [err,setErr] = useState(""); const [busy,setBusy] = useState(false);
  const num = (k) => <input className="input" inputMode="decimal" value={s[k]==null?"":s[k]} onChange={e=>setS({...s,[k]:e.target.value})} />;
  const save = async () => {
    setErr(""); setBusy(true);
    try {
      const base = {}; s.baseList.forEach(b=>{ if(String(b.price).trim()!=="") base[b.type.trim()] = String(b.price).replace(",","."); });
      const body = {...s, base, min:s.min===""?null:s.min, max:s.max===""?null:s.max}; delete body.baseList;
      await api("/api/hotels/"+hotel.id+"/rate-settings","PUT",body); onSaved();
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Overlay onClose={onClose} width={560} label={tf("Einstellungen Preisempfehlung")}>
      <b>{tf("Einstellungen Preisempfehlung")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Grundpreis je Zimmertyp; leerer Zimmertyp gilt für alle Zimmer. Zuschläge und Abschläge in Prozent.")}</div>
      {s.baseList.map((b,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 120px auto",gap:8,alignItems:"end"}}>
        <Field label={tf("Zimmertyp (leer = alle)")}><input className="input" value={b.type} onChange={e=>{ const l=[...s.baseList]; l[i]={...b,type:e.target.value}; setS({...s,baseList:l}); }} /></Field>
        <Field label={tf("Grundpreis")}><input className="input" inputMode="decimal" value={b.price} onChange={e=>{ const l=[...s.baseList]; l[i]={...b,price:e.target.value}; setS({...s,baseList:l}); }} /></Field>
        <button style={{...linkBtn,marginBottom:14}} aria-label={tf("Entfernen")} onClick={()=>setS({...s,baseList:s.baseList.filter((_,j)=>j!==i)})}>✕</button>
      </div>)}
      <button style={{...linkBtn,paddingInlineStart:0,marginBottom:10}} onClick={()=>setS({...s,baseList:[...s.baseList,{type:"",price:""}]})}>+ {tf("Zimmertyp")}</button>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Mindestpreis")}>{num("min")}</Field>
        <Field label={tf("Höchstpreis")}>{num("max")}</Field>
        <Field label={tf("Wochenende Fr/Sa %")}>{num("weekend_pct")}</Field>
        <Field label={tf("Feiertag %")}>{num("holiday_pct")}</Field>
        <Field label={tf("Kurzfristig: Tage vorher")}>{num("lastminute_days")}</Field>
        <Field label={tf("Kurzfristig %")}>{num("lastminute_pct")}</Field>
        <Field label={tf("Frühbucher ab Tagen")}>{num("early_days")}</Field>
        <Field label={tf("Frühbucher %")}>{num("early_pct")}</Field>
        <Field label={tf("Runden auf")}><select className="input" value={s.rounding} onChange={e=>setS({...s,rounding:Number(e.target.value)})}>{[1,5,10].map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
      </div>
      <div style={{fontWeight:600,fontSize:13.5,margin:"6px 0"}}>{tf("Ereignis in der Stadt %")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0 10px"}}>
        {["niedrig","mittel","hoch"].map(k=><Field key={k} label={tf(k)}><input className="input" inputMode="decimal" value={s.event_pct[k]} onChange={e=>setS({...s,event_pct:{...s.event_pct,[k]:e.target.value}})} /></Field>)}
      </div>
      <div style={{fontWeight:600,fontSize:13.5,margin:"6px 0"}}>{tf("Belegung: ab … % → Auf-/Abschlag %")}</div>
      {s.occ_steps.map((st,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end"}}>
        <Field label={tf("ab Belegung %")}><input className="input" inputMode="numeric" value={st[0]} onChange={e=>{ const l=s.occ_steps.map(x=>[...x]); l[i][0]=e.target.value; setS({...s,occ_steps:l}); }} /></Field>
        <Field label={tf("Auf-/Abschlag %")}><input className="input" inputMode="decimal" value={st[1]} onChange={e=>{ const l=s.occ_steps.map(x=>[...x]); l[i][1]=e.target.value; setS({...s,occ_steps:l}); }} /></Field>
        <button style={{...linkBtn,marginBottom:14}} aria-label={tf("Entfernen")} onClick={()=>setS({...s,occ_steps:s.occ_steps.filter((_,j)=>j!==i)})}>✕</button>
      </div>)}
      {s.occ_steps.length<10 && <button style={{...linkBtn,paddingInlineStart:0,marginBottom:10}} onClick={()=>setS({...s,occ_steps:[...s.occ_steps,["",""]]})}>+ {tf("Stufe")}</button>}
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={busy} onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button></div>
    </Overlay>
  );
}
