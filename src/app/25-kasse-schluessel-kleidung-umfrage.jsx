// ============================================================ Migration 034: Kassenbuch, Schlüssel und Karten, Dienstkleidung,
// anonyme Mitarbeiter-Umfrage. Rechte prüft die Datenbank; die Oberfläche blendet nur aus.
const memberOptions = (members) => (members||[]).map(m=><option key={m.user_id} value={m.user_id}>{shortName(m.email)}</option>);
const holderLabel = (members, r) => r.user_id ? (((members||[]).find(m=>m.user_id===r.user_id)||{}).email||"").split("@")[0] || tf("Teammitglied") : (r.holder_name||"–");
// Person aus dem Team wählen oder einen freien Namen (z. B. Fremdfirma) eintragen
function HolderField({members, value, onChange}){
  const free = value.user_id==="";
  return (
    <Field label={tf("Person")}>
      <div style={{display:"flex",gap:6}}>
        <select className="input" value={free ? "__free" : value.user_id||""} onChange={e=>onChange(e.target.value==="__free" ? {user_id:"", holder_name:value.holder_name||""} : {user_id:e.target.value, holder_name:""})}>
          <option value="">{tf("Bitte wählen")}</option>{memberOptions(members)}<option value="__free">{tf("Andere Person (Name eingeben)")}</option>
        </select>
        {free && <input className="input" value={value.holder_name||""} placeholder={tf("Name")} onChange={e=>onChange({user_id:"", holder_name:e.target.value})} />}
      </div>
    </Field>
  );
}

// ------------------------------------------------------------ Kassenbuch (Trinkgeld, kleine Einkäufe mit Beleg)
const CASH_CATEGORIES = ["Trinkgeld","Einkauf","Wechselgeld","Sonstiges"];
function CashView({hotel, api, me, members, myDepts}){
  const [month,setMonth] = useState(todayIso().slice(0,7));
  const [data,setData] = useState(null); const [msg,setMsg] = useState(null); const [form,setForm] = useState(null); const [photo,setPhoto] = useState(null);
  const lead = isLeadRole();
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/cash?month="+month).then(setData).catch(e=>setMsg({ok:false,text:e.message})),[api, hotel.id, month]);
  useEffect(()=>{ load(); },[load]);
  const money = (v) => Number(v||0).toLocaleString(UI_LOCALE,{style:"currency",currency:hotel.currency||"EUR"});
  const empty = {direction:"aus", category:"Einkauf", amount:"", entry_date:todayIso(), note:"", department:(myDepts||[])[0]||"", receipt_data:null};
  const save = async () => {
    setMsg(null);
    try {
      const r = await api("/api/hotels/"+hotel.id+"/cash","POST",{...form, amount:String(form.amount).replace(",",".")});
      setForm(null); load();
      setMsg({ok:true,text: r && r.queued ? tf("Ohne Verbindung gespeichert – wird gesendet, sobald das Netz wieder da ist.") : tf("Eingetragen.")});
    } catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const del = async (r) => { if(!confirm(tf("Eintrag löschen?"))) return; try { await api("/api/cash/"+r.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const pick = async (file) => { if(!file) return; try { const d = await compressImage(file, 1280, 0.72); setForm(f=>({...f, receipt_data:d})); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const csv = () => {
    const rows = [["Datum","Art","Kategorie","Betrag","Abteilung","Notiz","Beleg"], ...(data.entries||[]).map(r=>[r.entry_date, r.direction==="ein"?"Einnahme":"Ausgabe", r.category, String(r.amount).replace(".",","), r.department||"", r.note||"", r.has_receipt?"ja":"nein"])];
    const text = "﻿"+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(";")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text],{type:"text/csv"})); a.download = "kassenbuch-"+month+".csv"; a.click();
  };
  const saldo = data ? Math.round((data.total_in - data.total_out)*100)/100 : 0;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Kleine Bargeldbewegungen außerhalb der Registrierkasse: Trinkgeld-Kasse, Einkäufe mit Beleg, Wechselgeld. Einträge älter als 7 Tage ändert nur ein Admin.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
        {!form && <button className="btn-primary" onClick={()=>setForm(empty)}>{tf("Eintrag hinzufügen")}</button>}
        <input className="input" type="month" style={{width:170}} value={month} aria-label={tf("Monat")} onChange={e=>e.target.value && setMonth(e.target.value)} />
        {data && data.entries.length>0 && <button style={btnLine} onClick={csv}>{tf("Als CSV exportieren")}</button>}
      </div>
      {form && <Card style={{marginBottom:16,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Art")}><select className="input" value={form.direction} onChange={e=>setForm({...form,direction:e.target.value, category: e.target.value==="ein" ? "Trinkgeld" : "Einkauf"})}><option value="aus">{tf("Ausgabe")}</option><option value="ein">{tf("Einnahme")}</option></select></Field>
          <Field label={tf("Kategorie")}><select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CASH_CATEGORIES.map(c=><option key={c} value={c}>{tf(c)}</option>)}</select></Field>
          <Field label={tf("Betrag")}><input className="input" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></Field>
          <Field label={tf("Datum")}><input className="input" type="date" max={todayIso()} value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})} /></Field>
          <Field label={tf("Abteilung")}><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}><option value="">–</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select></Field>
        </div>
        <Field label={tf("Wofür?")}><input className="input" value={form.note} maxLength={500} placeholder={tf("z. B. Blumen für die Lobby")} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
          <label style={{...btnLine,display:"inline-block"}}>{form.receipt_data ? tf("Anderes Belegfoto") : tf("Belegfoto aufnehmen")}<input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>pick(e.target.files[0])} /></label>
          {form.receipt_data && <img src={form.receipt_data} alt={tf("Beleg")} style={{height:56,borderRadius:6,border:`1px solid ${BORDER}`}} />}
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.amount} onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {data && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:14}}>
        <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("Einnahmen")}</div><div style={{fontSize:20,fontWeight:600,color:GOOD}}>{money(data.total_in)}</div></Card>
        <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("Ausgaben")}</div><div style={{fontSize:20,fontWeight:600,color:BAD}}>{money(data.total_out)}</div></Card>
        <Card><div style={{fontSize:12,color:INK_MUTED}}>{tf("Saldo im Monat")}</div><div style={{fontSize:20,fontWeight:600}}>{money(saldo)}</div></Card>
      </div>}
      {data && !lead && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Sie sehen Ihre eigenen Einträge. Die Leitung sieht alle.")}</div>}
      {data && data.entries.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("In diesem Monat noch keine Einträge.")}</div>}
      {data && data.entries.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:600}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{padding:10,textAlign:"start"}}>{tf("Datum")}</th><th style={{textAlign:"start"}}>{tf("Kategorie")}</th><th style={{textAlign:"start"}}>{tf("Wofür?")}</th><th style={{textAlign:"start"}}>{tf("Von")}</th><th style={{textAlign:"end"}}>{tf("Betrag")}</th><th></th></tr></thead>
        <tbody>{data.entries.map(r=>(
          <tr key={r.id} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:10}}>{fmtDate(r.entry_date)}</td>
            <td>{tf(r.category)}{r.department ? <div style={{fontSize:12,color:INK_MUTED}}>{translateString(r.department)}</div> : null}</td>
            <td data-no-i18n="">{r.note||"–"}</td>
            <td>{memberLabel(members||[], me, r.created_by)}</td>
            <td style={{textAlign:"end",fontWeight:600,color:r.direction==="ein"?GOOD:BAD,whiteSpace:"nowrap"}}>{r.direction==="ein"?"+ ":"− "}{money(r.amount)}</td>
            <td style={{whiteSpace:"nowrap",textAlign:"end",paddingInlineEnd:10}}>
              {r.has_receipt && <button style={linkBtn} onClick={()=>api("/api/cash/"+r.id+"/receipt").then(x=>setPhoto(x.receipt_data)).catch(e=>setMsg({ok:false,text:e.message}))}>{tf("Beleg")}</button>}
              {lead && <button style={{...linkBtn,color:BAD}} aria-label={tf("Löschen")} onClick={()=>del(r)}>✕</button>}
            </td>
          </tr>))}</tbody></table></Card>}
      {photo && <Overlay onClose={()=>setPhoto(null)} width={640} label={tf("Beleg")}><img src={photo} alt={tf("Beleg")} style={{maxWidth:"100%",borderRadius:8}} /><div style={{marginTop:10}}><button className="btn-primary" onClick={()=>setPhoto(null)}>{tf("Schließen")}</button></div></Overlay>}
    </div>
  );
}

// ------------------------------------------------------------ Schlüssel und Karten
const KEY_KINDS = ["Generalschlüssel","Schlüssel","Karte","Transponder","Sonstiges"];
function KeysView({hotel, api, members}){
  const [keys, loadKeys, error] = useList(api, "/api/hotels/"+hotel.id+"/keys");
  const [loans, loadLoans] = useList(api, "/api/hotels/"+hotel.id+"/key-loans");
  const [form,setForm] = useState(null); const [lend,setLend] = useState(null); const [msg,setMsg] = useState(null); const [showHistory,setShowHistory] = useState(false);
  const reload = () => { loadKeys(); loadLoans(); };
  const run = async (fn, ok) => { setMsg(null); try { await fn(); reload(); if(ok) setMsg({ok:true,text:ok}); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } };
  const openLoan = (k) => (loans||[]).find(l=>l.key_id===k.id && !l.returned_at);
  const today = todayIso();
  const saveKey = () => run(async()=>{ if(form.id) await api("/api/keys/"+form.id,"PATCH",form); else await api("/api/hotels/"+hotel.id+"/keys","POST",form); setForm(null); });
  const issue = () => run(async()=>{ await api("/api/keys/"+lend.key.id+"/loan","POST",{user_id:lend.user_id||null, holder_name:lend.holder_name, due_back:lend.due_back||null, note:lend.note}); setLend(null); }, tf("Ausgabe eingetragen."));
  const giveBack = (l) => run(()=>api("/api/key-loans/"+l.id+"/return","POST"), tf("Rückgabe eingetragen."));
  const keyName = (id) => ((keys||[]).find(k=>k.id===id)||{}).name || "–";
  const active = (keys||[]).filter(k=>k.active!==false), out = active.filter(openLoan);
  const overdue = out.filter(k=>{ const l = openLoan(k); return l.due_back && l.due_back < today; });
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Wer hat welchen Schlüssel, welche Generalkarte, welchen Transponder? Ausgabe und Rückgabe mit Zeitpunkt – auch für Fremdfirmen.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      {keys && keys.length>0 && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <Pill color={INK} bg={BRASS_SOFT}>{tf("{0} im Bestand", active.length)}</Pill>
        <Pill color={WARN} bg={WARN_SOFT}>{tf("{0} ausgegeben", out.length)}</Pill>
        {overdue.length>0 && <Pill color={BAD} bg={BAD_SOFT}>{tf("{0} überfällig", overdue.length)}</Pill>}
      </div>}
      {!form && <button className="btn-primary" style={{marginBottom:14}} onClick={()=>setForm({name:"", kind:"Schlüssel", code:"", note:""})}>{tf("Schlüssel oder Karte anlegen")}</button>}
      {form && <Card style={{marginBottom:16,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Bezeichnung")}><input className="input" value={form.name} placeholder={tf("z. B. General Etage 2")} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Art")}><select className="input" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{KEY_KINDS.map(k=><option key={k} value={k}>{tf(k)}</option>)}</select></Field>
          <Field label={tf("Nummer / Kennung")}><input className="input" value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})} /></Field>
        </div>
        <Field label={tf("Notiz (z. B. sperrt welche Türen)")}><input className="input" value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" disabled={!form.name.trim()} onClick={saveKey}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          {form.id && <button style={btnLine} onClick={()=>run(async()=>{ await api("/api/keys/"+form.id,"PATCH",{active: form.active===false}); setForm(null); })}>{form.active===false ? tf("Wieder aktivieren") : tf("Als verloren / ausgemustert markieren")}</button>}
        </div>
      </Card>}
      {keys && keys.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Schlüssel erfasst.")}</div>}
      {keys && keys.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:600}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{padding:10,textAlign:"start"}}>{tf("Schlüssel / Karte")}</th><th style={{textAlign:"start"}}>{tf("Bei")}</th><th style={{textAlign:"start"}}>{tf("Zurück bis")}</th><th></th></tr></thead>
        <tbody>{keys.map(k=>{ const l = openLoan(k); const late = l && l.due_back && l.due_back < today; return (
          <tr key={k.id} style={{borderTop:`1px solid ${BORDER}`,opacity:k.active===false?0.55:1}}>
            <td style={{padding:10}}><b data-no-i18n="">{k.name}</b><div style={{fontSize:12,color:INK_MUTED}}>{tf(k.kind)}{k.code ? <span data-no-i18n=""> · {k.code}</span> : null}{k.active===false ? " · "+tf("ausgemustert") : ""}</div></td>
            <td>{l ? <span><b data-no-i18n="">{holderLabel(members, l)}</b><div style={{fontSize:12,color:INK_MUTED}}>{tf("seit {0}", fmtDate(l.issued_at.slice(0,10)))}</div></span> : <span style={{color:GOOD}}>{k.active===false ? "–" : tf("im Haus")}</span>}</td>
            <td>{l && l.due_back ? <span style={{color:late?BAD:INK}}>{fmtDate(l.due_back)}{late ? " · "+tf("überfällig") : ""}</span> : "–"}</td>
            <td style={{whiteSpace:"nowrap",textAlign:"end",paddingInlineEnd:10}}>
              {l && <button style={linkBtn} onClick={()=>giveBack(l)}>{tf("Zurückgegeben")}</button>}
              {!l && k.active!==false && <button style={linkBtn} onClick={()=>setLend({key:k, user_id:null, holder_name:"", due_back:"", note:""})}>{tf("Ausgeben")}</button>}
              <button style={linkBtn} onClick={()=>setForm({...k, code:k.code||"", note:k.note||""})}>{tf("Bearbeiten")}</button>
            </td>
          </tr>); })}</tbody></table></Card>}
      {loans && loans.some(l=>l.returned_at) && <div style={{marginTop:14}}>
        <button style={linkBtn} aria-expanded={showHistory} onClick={()=>setShowHistory(!showHistory)}>{showHistory ? "▴ " : "▾ "}{tf("Verlauf der Ausgaben")}</button>
        {showHistory && <Card style={{marginTop:8}}>{loans.filter(l=>l.returned_at).slice(0,100).map(l=>(
          <div key={l.id} style={{display:"flex",gap:10,flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
            <b style={{flex:1}} data-no-i18n="">{keyName(l.key_id)}</b><span data-no-i18n="">{holderLabel(members, l)}</span>
            <span style={{color:INK_MUTED}}>{fmtDate(l.issued_at.slice(0,10))} – {fmtDate(l.returned_at.slice(0,10))}</span>
          </div>))}</Card>}
      </div>}
      {lend && <Overlay onClose={()=>setLend(null)} width={460} label={tf("Schlüssel ausgeben")}>
        <h3 style={{marginTop:0}}>{tf("Schlüssel ausgeben")}: <span data-no-i18n="">{lend.key.name}</span></h3>
        <HolderField members={members} value={lend} onChange={(v)=>setLend({...lend, ...v})} />
        <Field label={tf("Zurück bis (optional)")}><input className="input" type="date" min={today} value={lend.due_back} onChange={e=>setLend({...lend,due_back:e.target.value})} /></Field>
        <Field label={tf("Notiz")}><input className="input" value={lend.note} placeholder={tf("z. B. Firma Elektro Huber, Umbau 3. Stock")} onChange={e=>setLend({...lend,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!lend.user_id && !(lend.holder_name||"").trim()} onClick={issue}>{tf("Ausgeben")}</button><button style={btnLine} onClick={()=>setLend(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
    </div>
  );
}

// ------------------------------------------------------------ Dienstkleidung
function UniformsView({hotel, api, members}){
  const [list, load, error] = useList(api, "/api/hotels/"+hotel.id+"/uniforms");
  const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [showReturned,setShowReturned] = useState(false);
  const empty = {user_id:null, holder_name:"", item:"", size:"", quantity:1, issued_at:todayIso(), note:""};
  const save = async () => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/uniforms","POST",{...form, user_id:form.user_id||null}); setForm({...empty, user_id:form.user_id, holder_name:form.holder_name}); load(); setMsg({ok:true,text:tf("Ausgabe eingetragen.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const giveBack = async (u) => { try { await api("/api/uniforms/"+u.id,"PATCH",{returned_at:todayIso()}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  // nach Person gruppieren
  const open = (list||[]).filter(u=>!u.returned_at), returned = (list||[]).filter(u=>u.returned_at);
  const groups = {}; open.forEach(u=>{ const k = u.user_id || "n:"+(u.holder_name||""); (groups[k] = groups[k] || []).push(u); });
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Ausgegebene Dienstkleidung je Person mit Größe – beim Austritt sehen Sie sofort, was zurückkommen muss.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      {!form && <button className="btn-primary" style={{marginBottom:14}} onClick={()=>setForm(empty)}>{tf("Kleidung ausgeben")}</button>}
      {form && <Card style={{marginBottom:16,borderColor:BRASS}}>
        <HolderField members={members} value={form} onChange={(v)=>setForm({...form, ...v})} />
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Kleidungsstück")}><input className="input" value={form.item} placeholder={tf("z. B. Kochjacke")} onChange={e=>setForm({...form,item:e.target.value})} /></Field>
          <Field label={tf("Größe")}><input className="input" value={form.size} onChange={e=>setForm({...form,size:e.target.value})} /></Field>
          <Field label={tf("Anzahl")}><input className="input" type="number" min={1} max={50} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></Field>
          <Field label={tf("Ausgegeben am")}><input className="input" type="date" value={form.issued_at} onChange={e=>setForm({...form,issued_at:e.target.value})} /></Field>
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.item.trim() || (!form.user_id && !(form.holder_name||"").trim())} onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Fertig")}</button></div>
      </Card>}
      {list && open.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Derzeit ist keine Dienstkleidung ausgegeben.")}</div>}
      {Object.entries(groups).map(([k, items])=>(
        <Card key={k} style={{marginBottom:10}}>
          <div style={{display:"flex",gap:10,alignItems:"baseline",marginBottom:4}}><b style={{flex:1}} data-no-i18n="">{holderLabel(members, items[0])}</b><span style={{fontSize:12,color:INK_MUTED}}>{tf("{0} Teile", items.reduce((s,u)=>s+(u.quantity||1),0))}</span></div>
          {items.map(u=><div key={u.id} style={{display:"flex",gap:10,padding:"5px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,alignItems:"center"}}>
            <span style={{flex:1}}><span data-no-i18n="">{u.quantity>1 ? u.quantity+" × " : ""}{u.item}</span>{u.size ? <span style={{color:INK_MUTED}} data-no-i18n=""> · {u.size}</span> : null}</span>
            <span style={{fontSize:12,color:INK_MUTED}}>{fmtDate(u.issued_at)}</span>
            <button style={linkBtn} onClick={()=>giveBack(u)}>{tf("Zurückgegeben")}</button>
          </div>)}
        </Card>))}
      {returned.length>0 && <div style={{marginTop:8}}>
        <button style={linkBtn} aria-expanded={showReturned} onClick={()=>setShowReturned(!showReturned)}>{showReturned ? "▴ " : "▾ "}{tf("Zurückgegeben ({0})", returned.length)}</button>
        {showReturned && <Card style={{marginTop:8}}>{returned.slice(0,200).map(u=><div key={u.id} style={{display:"flex",gap:10,flexWrap:"wrap",padding:"5px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
          <span style={{flex:1}} data-no-i18n="">{holderLabel(members, u)}: {u.quantity>1 ? u.quantity+" × " : ""}{u.item}{u.size ? " · "+u.size : ""}</span><span style={{color:INK_MUTED}}>{fmtDate(u.issued_at)} – {fmtDate(u.returned_at)}</span></div>)}</Card>}
      </div>}
    </div>
  );
}

// ------------------------------------------------------------ Anonyme Mitarbeiter-Umfrage
const PULSE_FACES = [[1,"Schlecht"],[2,"Eher schlecht"],[3,"Geht so"],[4,"Gut"],[5,"Sehr gut"]];
// Karte für alle im Team: einmal im Monat, anonym
function PulseCard({orgId, api, hotel, myDepts}){
  const [status,setStatus] = useState(null); const [score,setScore] = useState(0); const [comment,setComment] = useState(""); const [dept,setDept] = useState((myDepts||[])[0]||""); const [msg,setMsg] = useState(null);
  useEffect(()=>{ api("/api/organizations/"+orgId+"/pulse/status").then(setStatus).catch(()=>setStatus(null)); },[orgId]);
  if(!status || status.done) return null;
  const send = async () => { setMsg(null); try { await api("/api/organizations/"+orgId+"/pulse","POST",{score, comment, department:dept||null, hotel_id:hotel && hotel.id}); setStatus({...status, done:true}); } catch(e){ setMsg(e.message); } };
  return (
    <Card style={{marginBottom:14,borderColor:BRASS}}>
      <b>{tf("Wie geht es Ihnen bei der Arbeit diesen Monat?")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Anonym: Ihre Antwort wird ohne Namen gespeichert. Die Leitung sieht nur Durchschnitte ab 5 Antworten.")}</div>
      <div role="radiogroup" aria-label={tf("Bewertung")} style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {PULSE_FACES.map(([n,label])=><button key={n} role="radio" aria-checked={score===n} onClick={()=>setScore(n)}
          style={{...btnLine, padding:"8px 12px", background:score===n?BRASS_SOFT:"none", borderColor:score===n?BRASS:BORDER, fontWeight:score===n?600:400}}>{n} · {tf(label)}</button>)}
      </div>
      {(myDepts||[]).length>1 && <Field label={tf("Abteilung (optional)")}><select className="input" value={dept} onChange={e=>setDept(e.target.value)}><option value="">–</option>{myDepts.map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select></Field>}
      <Field label={tf("Was sollte besser werden? (optional)")}><textarea className="input" rows={2} maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} /></Field>
      {msg && <div style={{color:BAD,fontSize:13,marginBottom:8}}>{msg}</div>}
      <button className="btn-primary" disabled={!score} onClick={send}>{tf("Anonym absenden")}</button>
    </Card>
  );
}
// Auswertung für Admins und die Leitung
function PulseView({orgId, api, hotel, myDepts}){
  const [rows,setRows] = useState(null); const [comments,setComments] = useState(null); const [msg,setMsg] = useState(null);
  useEffect(()=>{
    api("/api/organizations/"+orgId+"/pulse/summary").then(setRows).catch(e=>{ setMsg(e.message); setRows([]); });
    api("/api/organizations/"+orgId+"/pulse/comments").then(setComments).catch(()=>setComments(null));
  },[orgId]);
  const monthLabel = (m) => new Date(m+"T12:00:00Z").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"});
  const total = (rows||[]).filter(r=>!r.department);
  const depts = (rows||[]).filter(r=>r.department);
  const bar = (v) => <div style={{background:BORDER,borderRadius:4,height:8,width:120,display:"inline-block",verticalAlign:"middle",marginInlineEnd:8}}><div style={{background:v>=4?GOOD:v>=3?WARN:BAD,height:8,borderRadius:4,width:(v/5*100)+"%"}} /></div>;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Einmal im Monat fragt Ouverture alle im Team anonym, wie es ihnen geht (1 bis 5). Namen werden nicht gespeichert; Werte erscheinen erst ab 5 Antworten, Abteilungen nur, wenn niemand erkennbar ist.")}</div>
      <PulseCard orgId={orgId} api={api} hotel={hotel} myDepts={myDepts} />
      {msg && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{msg}</div>}
      {rows && total.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:460}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{padding:10,textAlign:"start"}}>{tf("Monat")}</th><th style={{textAlign:"start"}}>{tf("Durchschnitt")}</th><th style={{textAlign:"end",paddingInlineEnd:10}}>{tf("Antworten")}</th></tr></thead>
        <tbody>{total.map(r=>(
          <React.Fragment key={r.month}>
            <tr style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:10}}><b>{monthLabel(r.month)}</b></td>
              <td>{r.hidden ? <span style={{color:INK_MUTED}}>{tf("Weniger als 5 Antworten – aus Datenschutzgründen ausgeblendet")}</span> : r.responses ? <span>{bar(Number(r.avg_score))}{Number(r.avg_score).toLocaleString(UI_LOCALE)}</span> : <span style={{color:INK_MUTED}}>{tf("Noch keine Antworten")}</span>}</td>
              <td style={{textAlign:"end",paddingInlineEnd:10}}>{r.hidden ? "< 5" : r.responses}</td>
            </tr>
            {depts.filter(d=>d.month===r.month).map(d=><tr key={d.department} style={{fontSize:12.5,color:INK_MUTED}}>
              <td style={{padding:"4px 10px",paddingInlineStart:24}}>{translateString(d.department)}</td><td>{bar(Number(d.avg_score))}{Number(d.avg_score).toLocaleString(UI_LOCALE)}</td><td style={{textAlign:"end",paddingInlineEnd:10}}>{d.responses}</td></tr>)}
          </React.Fragment>))}</tbody></table></Card>}
      {comments && comments.length>0 && <Card style={{marginTop:14}}>
        <b>{tf("Kommentare aus dem Vormonat")}</b>
        {comments.map((c,i)=><div key={i} style={{padding:"8px 0",borderTop:i?`1px solid ${BORDER}`:"none",fontSize:13.5,whiteSpace:"pre-wrap"}} data-no-i18n="">„{c}“</div>)}
      </Card>}
    </div>
  );
}
