// ============================================================ Paket 045: Spa & Freizeit – Leistungen, Ressourcen, Online-Buchung, Auswertung

const spEmptyService = (cat) => ({category:cat||"behandlung", name:"", description:"", duration_min:50, buffer_before:0, buffer_after:10, price:"", price_per:"buchung", capacity:1, staff_count:1, needs_room:true, room_ids:[], gear_id:"", gear_qty:1, min_age:"", health_form:false, online:true, guests_only:false, schedule:{}, color:SP_COLORS[0], deposit_pct:0, noshow_fee_pct:0, active:true});
const spSchedText = (sc) => SP_DAYS.map(([d])=>((sc||{})[d]||[]).join(", "));

function SpaServices({hotel, api, services, resources, canEdit, run}){
  const [form,setForm] = useState(null); const money = moneyOf(hotel);
  const rooms = (resources||[]).filter(r=>r.kind==="raum"), gear = (resources||[]).filter(r=>r.kind==="geraet");
  const addTemplates = () => run(async()=>{
    const have = new Set((services||[]).map(s=>s.name));
    // Verleih braucht ein Gerät, der Sportplatz einen Raum – fehlen sie, legen die Vorlagen sie mit an
    let bikes = gear[0];
    const court = (resources||[]).find(r=>r.kind==="raum" && /tennis/i.test(r.name)) || null;
    for(const t of SP_TEMPLATES){
      const name = translateString(t.name); if(have.has(name)) continue;
      const body = {...t, name};
      if(t.category==="verleih"){ if(!bikes) bikes = await api("/api/hotels/"+hotel.id+"/booking-resources","POST",{kind:"geraet", name:translateString("E-Bikes"), quantity:8}); body.gear_id = bikes.id; }
      if(t.category==="platz"){ const c = court || await api("/api/hotels/"+hotel.id+"/booking-resources","POST",{kind:"raum", name:translateString("Tennisplatz")}); body.room_ids = [c.id]; }
      await api("/api/hotels/"+hotel.id+"/booking-services","POST",body);
    }
  }, tf("Vorlagen angelegt. Preise und Zeiten bitte anpassen."));
  const save = () => run(async()=>{
    const body = {...form, gear_id:form.gear_id||null, price:form.price===""?null:form.price};
    if(form.category==="kurs") body.schedule = Object.fromEntries(SP_DAYS.map(([d],i)=>[d, String((form.schedText||[])[i]||"").split(/[,;\s]+/).filter(Boolean)]));
    delete body.schedText; delete body.id; delete body.created_at; delete body.hotel_id; delete body.organization_id;
    if(form.id) await api("/api/booking-services/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/booking-services","POST",body);
    setForm(null);
  }, tf("Gespeichert."));
  const sorted = [...(services||[])].sort((a,b)=>(a.sort||0)-(b.sort||0) || a.name.localeCompare(b.name));
  return (
    <div>
      {!canEdit && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Leistungen verwaltet die Leitung Spa & Wellness oder Rezeption.")}</div>}
      {canEdit && !form && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <button className="btn-primary" onClick={()=>setForm({...spEmptyService(), schedText:spSchedText({})})}>{tf("Leistung anlegen")}</button>
        <button style={btnLine} onClick={addTemplates}>{tf("Vorlagen hinzufügen")}</button>
      </div>}
      {form && <Card style={{marginBottom:12,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Art")}><select className="input" value={form.category} onChange={e=>{ const c = e.target.value; setForm({...form, category:c, staff_count:c==="paar"?2:["zeitfenster","verleih","platz"].includes(c)?0:Math.max(1,form.staff_count||1), needs_room:c!=="verleih" && form.needs_room, capacity:["zeitfenster","kurs","aktivitaet"].includes(c)?Math.max(2,form.capacity||2):1}); }}>{SP_CAT.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
          <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("Dauer (Minuten)")}><input className="input" type="number" min={5} max={1440} value={form.duration_min} onChange={e=>setForm({...form,duration_min:e.target.value})} /></Field>
          <Field label={tf("Puffer vorher (Min.)")}><input className="input" type="number" min={0} max={120} value={form.buffer_before} onChange={e=>setForm({...form,buffer_before:e.target.value})} /></Field>
          <Field label={tf("Puffer danach (Min.)")}><input className="input" type="number" min={0} max={120} value={form.buffer_after} onChange={e=>setForm({...form,buffer_after:e.target.value})} /></Field>
          <Field label={tf("Preis")}><input className="input" inputMode="decimal" value={form.price??""} onChange={e=>setForm({...form,price:e.target.value})} /></Field>
          <Field label={tf("Preis gilt pro")}><select className="input" value={form.price_per} onChange={e=>setForm({...form,price_per:e.target.value})}><option value="buchung">{tf("Buchung")}</option><option value="person">{tf("Person")}</option><option value="stunde">{tf("Stunde")}</option></select></Field>
          {["zeitfenster","kurs","aktivitaet"].includes(form.category) && <Field label={tf("Plätze je Termin")}><input className="input" type="number" min={1} max={500} value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} /></Field>}
          <Field label={tf("Personal gleichzeitig")}><input className="input" type="number" min={0} max={4} value={form.staff_count} onChange={e=>setForm({...form,staff_count:e.target.value})} /></Field>
          <Field label={tf("Mindestalter")}><input className="input" type="number" min={0} max={99} value={form.min_age??""} onChange={e=>setForm({...form,min_age:e.target.value})} /></Field>
        </div>
        <Field label={tf("Beschreibung (für Gäste)")}><textarea className="input" rows={2} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} /></Field>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!form.needs_room} onChange={e=>setForm({...form,needs_room:e.target.checked})} /> {tf("Braucht einen Raum")}</label>
        {form.needs_room && rooms.length>0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}><span className="field-label" style={{width:"100%"}}>{tf("Erlaubte Räume (keiner gewählt = alle)")}</span>
          {rooms.map(r=><label key={r.id} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:6,padding:"4px 8px",minHeight:32}}><input type="checkbox" checked={(form.room_ids||[]).includes(r.id)} onChange={()=>setForm({...form, room_ids:(form.room_ids||[]).includes(r.id)?form.room_ids.filter(x=>x!==r.id):[...(form.room_ids||[]), r.id]})} /> <span data-no-i18n="">{r.name}</span></label>)}</div>}
        {form.category==="verleih" && <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"0 10px"}}>
          <Field label={tf("Gerät")}><select className="input" value={form.gear_id||""} onChange={e=>setForm({...form,gear_id:e.target.value})}><option value="">–</option>{gear.map(g=><option key={g.id} value={g.id}>{g.name} ({g.quantity})</option>)}</select></Field>
          <Field label={tf("Stück je Person")}><input className="input" type="number" min={1} max={50} value={form.gear_qty} onChange={e=>setForm({...form,gear_qty:e.target.value})} /></Field>
        </div>}
        {form.category==="kurs" && <div style={{marginBottom:8}}><div className="field-label">{tf("Feste Kurszeiten (z. B. 07:30, 18:00)")}</div>
          {SP_DAYS.map(([d,l],i)=><div key={d} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><span style={{width:92,fontSize:13}}>{tf(l)}</span><input className="input" aria-label={tf("Kurszeiten {0}", translateString(l))} value={(form.schedText||[])[i]||""} onChange={e=>{ const t=[...(form.schedText||[])]; t[i]=e.target.value; setForm({...form,schedText:t}); }} /></div>)}</div>}
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!form.health_form} onChange={e=>setForm({...form,health_form:e.target.checked})} /> {tf("Gesundheitsfragen nötig")}</label>
          <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!form.online} onChange={e=>setForm({...form,online:e.target.checked})} /> {tf("Online buchbar")}</label>
          <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!form.guests_only} onChange={e=>setForm({...form,guests_only:e.target.checked})} /> {tf("Nur für Hausgäste")}</label>
          <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={form.active!==false} onChange={e=>setForm({...form,active:e.target.checked})} /> {tf("Aktiv")}</label>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Anzahlung online (%)")}><input className="input" type="number" min={0} max={100} value={form.deposit_pct} onChange={e=>setForm({...form,deposit_pct:e.target.value})} /></Field>
          <Field label={tf("No-Show-Gebühr (%)")}><input className="input" type="number" min={0} max={100} value={form.noshow_fee_pct} onChange={e=>setForm({...form,noshow_fee_pct:e.target.value})} /></Field>
          <Field label={tf("Farbe")}><div style={{display:"flex",gap:4}}>{SP_COLORS.map(c=><button key={c} type="button" aria-label={c} aria-pressed={form.color===c} onClick={()=>setForm({...form,color:c})} style={{width:28,height:28,borderRadius:"50%",background:c,border:form.color===c?`3px solid ${INK}`:"2px solid #fff",cursor:"pointer"}} />)}</div></Field>
        </div>
        <div style={{fontSize:12,color:INK_MUTED,marginBottom:8}}>{tf("Die Anzahlung wird nur bei Online-Buchungen verlangt und geht direkt auf das Stripe-Konto des Hotels (siehe Gutscheine → Online-Verkauf). Die No-Show-Gebühr erscheint als Hinweis in den Buchungsbedingungen.")}</div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!String(form.name).trim()} onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {SP_CAT.map(([k,l])=>{ const g = sorted.filter(s=>s.category===k); return g.length ? <div key={k} style={{marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:13.5,marginBottom:4}}>{tf(l)}</div>
        {g.map(s=><div key={s.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"8px 10px",border:`1px solid ${BORDER}`,borderInlineStart:`4px solid ${s.color||BRASS}`,borderRadius:8,marginBottom:6,background:"#fff",opacity:s.active===false?0.55:1}}>
          <b style={{flex:1,minWidth:160}} data-no-i18n="">{s.name}</b>
          <span style={{fontSize:12.5,color:INK_MUTED}}>{s.duration_min} {tf("Min.")}{s.capacity>1 ? " · "+tf("{0} Plätze", s.capacity) : ""}{s.staff_count>1 ? " · "+tf("{0} Personen Personal", s.staff_count) : ""}</span>
          <span style={{fontSize:13}}>{s.price==null ? "–" : money(s.price)}{s.price_per==="person" ? " / "+tf("Person") : s.price_per==="stunde" ? " / "+tf("Stunde") : ""}</span>
          {s.health_form && <Pill color={INK_MUTED} bg={PAPER}>{tf("Gesundheitsfragen")}</Pill>}
          {!s.online && <Pill color={INK_MUTED} bg={PAPER}>{tf("nur intern")}</Pill>}
          {s.guests_only && <Pill color={INK_MUTED} bg={PAPER}>{tf("nur Hausgäste")}</Pill>}
          {canEdit && <><button style={linkBtn} onClick={()=>setForm({...spEmptyService(), ...s, price:s.price??"", min_age:s.min_age??"", gear_id:s.gear_id||"", schedText:spSchedText(s.schedule)})}>{tf("Bearbeiten")}</button>
            <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Leistung löschen? Bestehende Buchungen bleiben erhalten, wenn die Datenbank das zulässt – sonst deaktivieren."))) run(()=>api("/api/booking-services/"+s.id,"DELETE")); }}>{tf("Löschen")}</button></>}
        </div>)}
      </div> : null; })}
    </div>
  );
}

function SpaResources({hotel, api, services, resources, members, canEdit, run}){
  const [form,setForm] = useState(null);
  const save = () => run(async()=>{ const body = {...form, user_id:form.user_id||null, gender:form.gender||null}; ["id","created_at","hotel_id","organization_id"].forEach(k=>delete body[k]);
    if(form.id) await api("/api/booking-resources/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/booking-resources","POST",body); setForm(null); }, tf("Gespeichert."));
  const nameOf = (uid) => (((members||[]).find(m=>m.user_id===uid)||{}).email||"").split("@")[0];
  const KIND = {person:"Personen (Therapeut/innen, Trainer/innen)", raum:"Räume (Kabinen, Plätze, Sauna)", geraet:"Geräte (Verleih)"};
  return (
    <div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Personen arbeiten zu festen Zeiten oder – wenn mit einem Teammitglied verknüpft und keine Zeiten eingetragen – laut Dienstplan. Räume sind zu den Öffnungszeiten buchbar.")}</div>
      {canEdit && !form && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[["person","Person anlegen"],["raum","Raum anlegen"],["geraet","Gerät anlegen"]].map(([k,l])=><button key={k} className={k==="person"?"btn-primary":""} style={k==="person"?undefined:btnLine} onClick={()=>setForm({kind:k, name:"", user_id:"", service_ids:[], quantity:k==="geraet"?5:1, hours:{}, gender:"", active:true, sort:0})}>{tf(l)}</button>)}
      </div>}
      {form && <Card style={{marginBottom:12,borderColor:BRASS}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          {form.kind==="person" && <Field label={tf("Teammitglied (für Dienstplan und „Meine Termine“)")}><select className="input" value={form.user_id||""} onChange={e=>setForm({...form,user_id:e.target.value})}><option value="">–</option>{(members||[]).map(m=><option key={m.user_id} value={m.user_id}>{(m.email||"").split("@")[0]}</option>)}</select></Field>}
          {form.kind==="person" && <Field label={tf("Geschlecht (für Gästewunsch)")}><select className="input" value={form.gender||""} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">–</option><option value="w">{tf("weiblich")}</option><option value="m">{tf("männlich")}</option><option value="d">{tf("divers")}</option></select></Field>}
          {form.kind==="geraet" && <Field label={tf("Anzahl")}><input className="input" type="number" min={1} max={500} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></Field>}
        </div>
        {form.kind==="person" && <div style={{marginBottom:10}}><div className="field-label">{tf("Kann folgende Leistungen (keine gewählt = alle)")}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(services||[]).filter(s=>s.staff_count>0).map(s=><label key={s.id} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:6,padding:"4px 8px",minHeight:32}}><input type="checkbox" checked={(form.service_ids||[]).includes(s.id)} onChange={()=>setForm({...form, service_ids:(form.service_ids||[]).includes(s.id)?form.service_ids.filter(x=>x!==s.id):[...(form.service_ids||[]), s.id]})} /> <span data-no-i18n="">{s.name}</span></label>)}</div></div>}
        {form.kind!=="geraet" && <div style={{marginBottom:10}}><div className="field-label">{form.kind==="person" ? tf("Feste Arbeitszeiten (leer = laut Dienstplan)") : tf("Eigene Zeiten (leer = Öffnungszeiten)")}</div><SpWeek value={form.hours} onChange={(h)=>setForm({...form,hours:h})} empty={form.kind==="person" ? tf("laut Dienstplan") : tf("Öffnungszeiten")} /></div>}
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={form.active!==false} onChange={e=>setForm({...form,active:e.target.checked})} /> {tf("Aktiv")}</label>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!String(form.name).trim()} onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {["person","raum","geraet"].map(k=>{ const g = (resources||[]).filter(r=>r.kind===k); return g.length ? <div key={k} style={{marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:13.5,marginBottom:4}}>{tf(KIND[k])}</div>
        {g.map(r=><div key={r.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderBottom:`1px solid ${BORDER}`,fontSize:13.5,opacity:r.active===false?0.55:1}}>
          <b style={{minWidth:120}} data-no-i18n="">{r.name}</b>
          <span style={{flex:1,color:INK_MUTED,fontSize:12.5}}>{r.kind==="geraet" ? tf("{0} Stück", r.quantity) : r.hours && Object.keys(r.hours).length ? tf("feste Zeiten") : r.kind==="person" ? (r.user_id ? tf("laut Dienstplan ({0})", nameOf(r.user_id)) : tf("keine Arbeitszeit – bitte Zeiten eintragen oder Teammitglied verknüpfen")) : tf("Öffnungszeiten")}</span>
          {canEdit && <><button style={linkBtn} onClick={()=>setForm({...r, user_id:r.user_id||"", gender:r.gender||"", hours:r.hours||{}, service_ids:r.service_ids||[]})}>{tf("Bearbeiten")}</button>
            <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Ressource löschen?"))) run(()=>api("/api/booking-resources/"+r.id,"DELETE")); }}>{tf("Löschen")}</button></>}
        </div>)}
      </div> : null; })}
    </div>
  );
}

function SpaSettings({hotel, api, value, onSaved}){
  const [s,setS] = useState(()=>({...value, open:{...(value.open||{})}, closed_days:value.closed_days||[]})); const [err,setErr] = useState(""); const [svg,setSvg] = useState(""); const [closed,setClosed] = useState("");
  const url = s.token ? spPublicUrl("h="+s.token) : null;
  useEffect(()=>{ if(url) qrSvg(url, 5).then(setSvg).catch(()=>{}); },[url]);
  const save = async (extra) => { setErr(""); try { const r = await api("/api/hotels/"+hotel.id+"/booking-settings","PUT",{...s, ...(extra||{})}); setS({...s, ...r}); onSaved(r); } catch(e){ setErr(e.message); } };
  const num = (k, lbl, min, max) => <Field label={lbl}><input className="input" type="number" min={min} max={max} value={s[k]} onChange={e=>setS({...s,[k]:e.target.value})} /></Field>;
  return (
    <div>
      <Card style={{marginBottom:12}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600,minHeight:36}}><input type="checkbox" checked={!!s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> {tf("Online-Buchung einschalten")}</label>
        <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Gäste buchen über die Website (Link oder QR-Code) und im Zimmer über die Gäste-Seite – dort auf Wunsch auf die Zimmerrechnung.")}</div>
        {url && s.enabled && <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
          {svg && <div style={{width:110}} aria-hidden="true" dangerouslySetInnerHTML={{__html:svg}} />}
          <div style={{flex:1,minWidth:200}}>
            <input className="input" readOnly value={url} aria-label={tf("Buchungslink")} onFocus={e=>e.target.select()} />
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <button style={opSmall} onClick={()=>navigator.clipboard && navigator.clipboard.writeText(url)}>{tf("Link kopieren")}</button>
              <a style={{...opSmall,textDecoration:"none",display:"inline-flex",alignItems:"center"}} href={url} target="_blank" rel="noopener">{tf("Ansehen")}</a>
              <button style={opSmall} onClick={()=>{ if(window.confirm(tf("Neuen Link erzeugen? Der alte Link funktioniert danach nicht mehr."))) save({new_token:true}); }}>{tf("Neuer Link")}</button>
            </div>
          </div>
        </div>}
      </Card>
      <Card style={{marginBottom:12}}><b>{tf("Öffnungszeiten Spa & Freizeit")}</b><SpWeek value={s.open} onChange={(o)=>setS({...s,open:o})} /></Card>
      <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Name auf der Buchungsseite")}><input className="input" value={s.name||""} placeholder={hotel.name} onChange={e=>setS({...s,name:e.target.value})} /></Field>
          <Field label={tf("Zeitraster")}><select className="input" value={s.slot_min} onChange={e=>setS({...s,slot_min:Number(e.target.value)})}>{[15,30,60].map(n=><option key={n} value={n}>{tf("{0} Minuten", n)}</option>)}</select></Field>
          {num("lead_hours", tf("Vorlauf (Stunden)"), 0, 72)}
          {num("max_days", tf("Buchbar für Tage"), 1, 365)}
          {num("cancel_hours", tf("Kostenlos stornierbar bis (Stunden vorher)"), 0, 168)}
        </div>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!s.reminder} onChange={e=>setS({...s,reminder:e.target.checked})} /> {tf("Erinnerung per E-Mail am Vortag")}</label>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!s.room_charge} onChange={e=>setS({...s,room_charge:e.target.checked})} /> {tf("Hausgäste können auf die Zimmerrechnung buchen")}</label>
        <Field label={tf("Buchungsbedingungen und Hinweise (z. B. Storno, Ankunft 10 Minuten vorher, Bademantel)")}><textarea className="input" rows={3} value={s.terms||""} onChange={e=>setS({...s,terms:e.target.value})} /></Field>
        <div className="field-label">{tf("Geschlossen am")}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {(s.closed_days||[]).map(d=><span key={d} style={{fontSize:12.5,border:`1px solid ${BORDER}`,borderRadius:999,padding:"2px 8px"}}>{fmtDate(d)} <button style={{...linkBtn,padding:0}} aria-label={tf("Entfernen")} onClick={()=>setS({...s,closed_days:s.closed_days.filter(x=>x!==d)})}>✕</button></span>)}
          <input className="input" type="date" style={{width:"auto"}} value={closed} aria-label={tf("Schließtag hinzufügen")} onChange={e=>setClosed(e.target.value)} />
          <button style={opSmall} disabled={!closed} onClick={()=>{ setS({...s,closed_days:[...new Set([...(s.closed_days||[]), closed])].sort()}); setClosed(""); }}>{tf("Hinzufügen")}</button>
        </div>
      </Card>
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <button className="btn-primary" onClick={()=>save()}>{tf("Speichern")}</button>
    </div>
  );
}

function SpaStats({hotel, api}){
  const [to,setTo] = useState(todayIso()); const [from,setFrom] = useState(addDaysIso(todayIso(),-29)); const [d,setD] = useState(null);
  const money = moneyOf(hotel);
  useEffect(()=>{ setD(null); api("/api/hotels/"+hotel.id+"/booking-stats?from="+from+"&to="+to).then(setD).catch(e=>setD({error:e.message})); },[api, hotel.id, from, to]);
  return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input className="input" type="date" style={{width:"auto"}} aria-label={tf("von")} value={from} onChange={e=>e.target.value && setFrom(e.target.value)} /> – <input className="input" type="date" style={{width:"auto"}} aria-label={tf("bis")} value={to} onChange={e=>e.target.value && setTo(e.target.value)} />
      </div>
      {!d && <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>}
      {d && d.error && <ErrorText>{d.error}</ErrorText>}
      {d && d.total && <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:14}}>
          {[[tf("Buchungen"), d.total.bookings],[tf("Umsatz"), money(d.total.revenue)],[tf("Storniert"), d.total.cancelled],[tf("No-Show-Quote"), d.total.no_show_pct==null?"–":d.total.no_show_pct+" %"]].map(([l,v])=><Card key={l}><div style={{fontSize:12,color:INK_MUTED}}>{l}</div><div style={{fontSize:20,fontWeight:700}}>{v}</div></Card>)}
        </div>
        <b style={{fontSize:13.5}}>{tf("Auslastung")}</b>
        {d.resources.map(r=><div key={r.id} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${BORDER}`,fontSize:13}}>
          <span style={{width:150}} data-no-i18n="">{r.name}</span>
          <div style={{flex:1,height:10,background:PAPER,borderRadius:5,overflow:"hidden"}} aria-hidden="true"><div style={{width:Math.min(100,r.pct||0)+"%",height:"100%",background:BRASS}} /></div>
          <span style={{width:130,textAlign:"end"}}>{r.pct==null ? tf("keine Arbeitszeit") : r.pct+" %"}</span>
        </div>)}
        <b style={{fontSize:13.5,display:"block",marginTop:14}}>{tf("Leistungen")}</b>
        {d.services.filter(s=>s.count).map(s=><div key={s.id} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:`1px solid ${BORDER}`,fontSize:13}}><span style={{flex:1}} data-no-i18n="">{s.name}</span><span>{tf("{0}×", s.count)}</span><span style={{width:110,textAlign:"end"}}>{money(s.revenue)}</span></div>)}
        {!d.services.some(s=>s.count) && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Buchungen im Zeitraum.")}</div>}
      </div>}
    </div>
  );
}
