// ============================================================ Paket 040 (C): Meldeschein, Warteliste, Wiederkehr-Mail, Schwesterhotel,
// Fundsachen-Rückversand, Belegung nach Etagen, Reinigungs-Reihenfolge, Zimmer-Lebenslauf, Kassen-Anbindung.
// Rechte prüft der Server bzw. die Datenbank; die Oberfläche blendet nur aus.

const gsMain = {minHeight:44};
const gsBtn = {...smallBtn, minHeight:44};
const gsMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD:BAD,fontSize:13,margin:"8px 0"}}>{msg.text}</div> : null;
const gsNum = (v) => { if(v===""||v==null) return null; if(typeof v==="number") return v; let t = String(v).replace(/[\s'€$]|EUR|CHF/g,""); t = /,\d{1,2}$/.test(t) ? t.replace(/\./g,"").replace(",",".") : t.replace(/,/g,""); const n = Number(t); return t!=="" && isFinite(n) ? n : null; };
// Datum aus Tabellen: 2026-10-24, 24.10.2026, 24/10/2026 oder Excel-Seriennummer
const gsDate = (v) => {
  if(typeof v==="number" && v>20000 && v<80000) return new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);
  const s = String(v||"").trim(); let m;
  if((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1]+"-"+m[2]+"-"+m[3];
  if((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/))) { const y = m[3].length===2 ? "20"+m[3] : m[3]; return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"); }
  return "";
};
const gsCopy = async (text, setMsg) => { try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Kopiert.")}); } catch(e){ setMsg({ok:false,text:tf("Kopieren nicht möglich – bitte den Text markieren.")}); } };
// Einstellungen eines Hotels speichern (nur Admin; der Server prüft)
const gsSave = async (api, hotel, patch, onHotel) => { const h = await api("/api/hotels/"+hotel.id+"/guest-settings","PUT",patch); if(onHotel && h && h.id) onHotel(h); return h; };
function GsFold({title, status, children, defaultOpen}){
  const [open,setOpen] = useState(!!defaultOpen);
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",minHeight:32}} {...pressable(()=>setOpen(!open))} aria-expanded={open}>
        <div style={{fontWeight:700,flex:1}}>{title}{status ? <span style={{fontWeight:400,fontSize:13,color:INK_MUTED}}> · {status}</span> : null}</div>
        <span style={{color:INK_MUTED}} aria-hidden="true">{open?"▴":"▾"}</span>
      </div>
      {open && <div style={{marginTop:12}}>{children}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ 1. Digitaler Meldeschein
const GS_ID_TYPES = ["Reisepass","Personalausweis","Führerschein","Sonstiges"];
function gsRegistrationSheetHtml(g, hotel){
  const row = (l, v) => '<tr><td class="k">'+fsEsc(tf(l))+'</td><td>'+(v ? fsEsc(v) : '<span style="display:inline-block;width:70%;border-bottom:1px solid #9aa3af">&nbsp;</span>')+'</td></tr>';
  const comp = Array.isArray(g.companions) ? g.companions : [];
  const compRows = (comp.length ? comp : [{},{}]).map(c=>'<tr><td>'+fsEsc(c.name||"")+'&nbsp;</td><td>'+fsEsc(c.birth_date ? fmtDate(c.birth_date) : "")+'</td><td>'+fsEsc(c.nationality ? gtCountryName(c.nationality) : "")+'</td></tr>').join("");
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'
    + '<div class="hd">'+(hotel.logo_data?'<img src="'+fsEsc(hotel.logo_data)+'" />':'')+'<div class="h"><div class="hotel">'+fsEsc(hotel.name)+'</div><h1>'+fsEsc(tf("Meldeschein / Gästeblatt"))+'</h1></div>'
    + (g.registration_at ? '<span class="st">'+fsEsc(tf("online ausgefüllt"))+'</span>' : '')+'</div>'
    + '<div class="facts"><div class="f"><div class="l">'+fsEsc(tf("Anreise"))+'</div><div class="v">'+fsEsc(fmtDate(g.arrival_date))+'</div></div><div class="f"><div class="l">'+fsEsc(tf("Abreise"))+'</div><div class="v">'+fsEsc(g.departure_date ? fmtDate(g.departure_date) : "–")+'</div></div>'
    + '<div class="f"><div class="l">'+fsEsc(tf("Zimmer"))+'</div><div class="v">'+fsEsc(g.assigned_room||"–")+'</div></div><div class="f"><div class="l">'+fsEsc(tf("Personen"))+'</div><div class="v">'+fsEsc(g.adults!=null ? (g.adults+(g.children?" + "+g.children:"")) : "–")+'</div></div></div>'
    + '<div class="box"><table class="dp">'
    + row("Name", g.guest_name) + row("Geburtsdatum", g.birth_date ? fmtDate(g.birth_date) : "") + row("Staatsangehörigkeit", g.nationality ? gtCountryName(g.nationality) : "")
    + row("Straße und Hausnummer", g.street) + row("PLZ und Ort", [g.zip, g.city].filter(Boolean).join(" ")) + row("Wohnsitzland", g.address_country ? gtCountryName(g.address_country) : "")
    + row("Ausweisart", g.id_doc_type ? tf(g.id_doc_type) : "") + row("Ausweisnummer", g.id_doc_number)
    + '</table></div>'
    + '<div class="box" style="margin-top:10px"><h3>'+fsEsc(tf("Mitreisende"))+'</h3><table class="dp"><tr><td class="k">'+fsEsc(tf("Name"))+'</td><td class="k">'+fsEsc(tf("Geburtsdatum"))+'</td><td class="k">'+fsEsc(tf("Staatsangehörigkeit"))+'</td></tr>'+compRows+'</table></div>'
    + '<div class="sig"><div>'+fsEsc(tf("Ort, Datum"))+'</div><div>'+fsEsc(tf("Unterschrift des Gastes"))+'</div></div>'
    + '<div class="ft"><span>'+fsEsc(tf("Gesetzliche Meldepflicht (Österreich: Meldegesetz, Deutschland: Bundesmeldegesetz)"))+'</span><span>'+fsEsc(fmtDateTime(new Date().toISOString()))+'</span></div></div>';
}
// Pro Anreise: Status und Gästeblatt zum Unterschreiben beim Check-in
// Meldedaten liegen in guest_registrations (nur Admin, Gesamtleitung, Rezeption) und werden erst beim Druck geladen.
// guest.has_registration kommt aus GET /arrivals.
function GsRegistrationPanel({guest, hotel, api}){
  const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  if(!(hotel.registration_settings||{}).enabled) return null;
  const done = !!guest.has_registration;
  const pdf = async () => {
    setBusy(true); setMsg(null);
    try {
      const reg = done ? await api("/api/arrivals/"+guest.id+"/registration") : null;
      await sheetPdf(gsRegistrationSheetHtml({...guest, ...(reg||{})}, hotel), (tf("Meldeschein")+" "+guest.guest_name+" "+guest.arrival_date).replace(/[\\/:*?"<>|]+/g,"").slice(0,90)+".pdf", true);
    } catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); }
  };
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:6}}>
      <Pill color={done?GOOD_TEXT:WARN_TEXT} bg={done?GOOD_SOFT:WARN_SOFT}>{done ? "✓ "+tf("Meldeschein ausgefüllt") : tf("Meldeschein offen")}</Pill>
      <button style={gsBtn} disabled={busy} onClick={pdf}><Icon n="printer" /> {busy ? "…" : done ? tf("Gästeblatt (PDF)") : tf("Leeres Gästeblatt (PDF)")}</button>
      {gsMsg(msg)}
    </div>
  );
}
// Oben in den Anreisen: Einstellungen (Admin), Export als CSV, ehrliche Hinweise
function GsRegistrationCard({hotel, api, role, onHotel}){
  const s0 = hotel.registration_settings || {};
  const [s,setS] = useState({enabled:!!s0.enabled, require_id:!!s0.require_id});
  const [range,setRange] = useState({from:addDaysIso(todayIso(),-31), to:todayIso()});
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const save = async () => { setMsg(null); try { await gsSave(api, hotel, {registration_settings:s}, onHotel); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const exportCsv = async () => {
    setMsg(null); setBusy(true);
    try {
      const list = await api("/api/hotels/"+hotel.id+"/registrations?from="+range.from+"&to="+range.to);
      if(!list.length){ setMsg({ok:false,text:tf("Keine ausgefüllten Meldescheine in diesem Zeitraum.")}); return; }
      const head = ["Anreise","Abreise","Name","Geburtsdatum","Staatsangehörigkeit","Straße","PLZ","Ort","Wohnsitzland","Ausweisart","Ausweisnummer","Erwachsene","Kinder","Zimmer","Mitreisende","Ausgefüllt am"];
      const rows = list.map(g=>[g.arrival_date, g.departure_date||"", g.guest_name, g.birth_date||"", g.nationality||"", g.street||"", g.zip||"", g.city||"", g.address_country||"", g.id_doc_type||"", g.id_doc_number||"", g.adults??"", g.children??"", g.assigned_room||"",
        (g.companions||[]).map(c=>[c.name, c.birth_date, c.nationality].filter(Boolean).join(" / ")).join(" | "), g.registration_at ? g.registration_at.slice(0,16).replace("T"," ") : ""]);
      gtCsvDownload([head, ...rows], "meldescheine-"+range.from+"-"+range.to+".csv");
      setMsg({ok:true,text:tf("{0} Meldescheine exportiert.", list.length)});
    } catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); }
  };
  return (
    <GsFold title={tf("Digitaler Meldeschein")} status={s0.enabled ? tf("Eingeschaltet") : tf("Aus")}>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Gäste füllen den Meldeschein schon vor der Anreise auf der Anreise-Seite aus (Geburtsdatum, Staatsangehörigkeit, Adresse, auf Wunsch Ausweis, Mitreisende). Beim Check-in druckst du das Gästeblatt und lässt es unterschreiben. Das Herkunftsland wird für die Statistik übernommen.")}</div>
      {role==="admin" && <div style={{marginBottom:12}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> <b>{tf("Meldeschein auf der Anreise-Seite abfragen")}</b></label>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.require_id} disabled={!s.enabled} onChange={e=>setS({...s,require_id:e.target.checked})} /> {tf("Ausweisart und -nummer verlangen")}</label>
        <button className="btn-primary" style={gsMain} onClick={save}>{tf("Speichern")}</button>
      </div>}
      <div className="field-label">{tf("Export als CSV")}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <Field label={tf("Von")}><input className="input" type="date" value={range.from} onChange={e=>setRange({...range,from:e.target.value})} /></Field>
        <Field label={tf("Bis")}><input className="input" type="date" value={range.to} onChange={e=>setRange({...range,to:e.target.value})} /></Field>
        <button style={{...gsBtn,marginBottom:14}} disabled={busy} onClick={exportCsv}>{busy ? "…" : tf("CSV herunterladen")}</button>
      </div>
      {gsMsg(msg)}
      <div style={{fontSize:12.5,color:INK_MUTED,background:PAPER,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>
        <div>{tf("Ehrlicher Hinweis: Die elektronische Übermittlung an die Gemeinde bzw. Meldebehörde ist nicht angebunden. Bitte die CSV-Datei in das Programm der Gemeinde übernehmen oder die Gästeblätter wie bisher abgeben.")}</div>
        <div style={{marginTop:6}}>{tf("Aufbewahrung: In Österreich Gästeblätter 7 Jahre aufbewahren (Meldegesetz). In Deutschland 1 Jahr ab Abreise aufbewahren und danach innerhalb von 3 Monaten vernichten (Bundesmeldegesetz). Ouverture löscht nicht automatisch.")}</div>
      </div>
    </GsFold>
  );
}

// ------------------------------------------------------------ 4. Schwesterhotel: „bekannt aus …“ im Profil-Badge
function GuestProfileOrigin({profile, hotels, hotelId}){
  if(!profile || !profile.last_hotel_id || profile.last_hotel_id===hotelId) return null;
  const h = (hotels||[]).find(x=>x.id===profile.last_hotel_id);
  if(!h) return null;
  return <div style={{fontSize:12,marginTop:3,color:INK}}><Icon n="home" /> {tf("bekannt aus {0}", h.name)}{profile.last_stay_on ? <span style={{color:INK_MUTED}}> · {fmtDate(profile.last_stay_on)}</span> : null}</div>;
}

// ------------------------------------------------------------ 2. Gäste-Warteliste Restaurant/Spa
const GS_Q_STATUS = {wartet:["wartet",WARN_TEXT,WARN_SOFT], aufgerufen:["aufgerufen",BRASS_TEXT,BRASS_SOFT], platziert:["platziert",GOOD_TEXT,GOOD_SOFT], abgesagt:["abgesagt",INK_MUTED,"#EEF0F2"]};
const gsQueueUrl = (token, area) => { const u = new URL("warten.html", location.href); u.search = ""; u.searchParams.set("h", token); if(area) u.searchParams.set("a", area); return u.toString(); };
function GsQueueView({hotel, api, role, onHotel}){
  const qs = hotel.queue_settings || {};
  const [s,setS] = useState({enabled:!!qs.enabled, areas:(qs.areas||[]).join("\n")});
  const [list,setList] = useState(null); const [area,setArea] = useState(""); const [msg,setMsg] = useState(null); const [svgs,setSvgs] = useState({});
  const areas = qs.areas || [];
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/queue").then(setList).catch(()=>setList(false)),[api, hotel.id]);
  useEffect(()=>{ load(); const t = setInterval(load, 20000); return ()=>clearInterval(t); },[load]);
  useEffect(()=>{ if(!qs.token) return; let live = true; Promise.all(areas.map(a=>qrSvg(gsQueueUrl(qs.token, a), 4).then(x=>[a,x]))).then(l=>{ if(live) setSvgs(Object.fromEntries(l)); }).catch(()=>{}); return ()=>{ live = false; }; },[qs.token, areas.join("|")]);
  const save = async (rotate) => { setMsg(null); try { await gsSave(api, hotel, {queue_settings:{enabled:s.enabled, areas:s.areas.split(/\n|,/).map(x=>x.trim()).filter(Boolean)}, ...(rotate?{rotate_queue_token:true}:{})}, onHotel); setMsg({ok:true,text:rotate ? tf("Neuer Code erzeugt. Bitte die Aushänge neu drucken.") : tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const set = async (x, status) => { setMsg(null); try { const r = await api("/api/queue/"+x.id,"PATCH",{status}); setList(l=>(l||[]).map(y=>y.id===r.id?r:y)); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const shown = (list||[]).filter(x=>!area || x.area===area);
  const active = shown.filter(x=>x.status==="wartet"||x.status==="aufgerufen"), done = shown.filter(x=>!(x.status==="wartet"||x.status==="aufgerufen")).slice(-15).reverse();
  const waitMin = (x) => Math.max(0, Math.round((Date.now()-new Date(x.created_at).getTime())/60000));
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Gäste scannen den Aushang, tragen Name und Personenzahl ein und sehen ihren Platz in der Warteliste. Rufst du sie auf, meldet sich ihr Handy mit Ton und Vibration.")}</div>
      {role==="admin" && <GsFold title={tf("Einstellungen")} status={qs.enabled ? tf("Eingeschaltet") : tf("Aus")} defaultOpen={!qs.enabled}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> <b>{tf("Warteliste einschalten")}</b></label>
        <Field label={tf("Bereiche (einer je Zeile, z. B. Restaurant, Spa)")}><textarea className="input" rows={3} value={s.areas} onChange={e=>setS({...s,areas:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" style={gsMain} onClick={()=>save(false)}>{tf("Speichern")}</button>
          {qs.token && <button style={gsBtn} onClick={()=>{ if(window.confirm(tf("Neuen Code erzeugen? Die alten Aushänge funktionieren danach nicht mehr."))) save(true); }}>{tf("Neuen Code erzeugen")}</button>}
        </div>
      </GsFold>}
      {gsMsg(msg)}
      {qs.enabled && qs.token && areas.length>0 && <Card style={{marginBottom:14}}>
        <b><Icon n="clipboard" /> {tf("Aushang mit QR-Code")}</b>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:10}}>
          {areas.map(a=>(
            <div key={a} style={{textAlign:"center",width:150}}>
              <div style={{width:130,height:130,margin:"0 auto"}} aria-label={tf("QR-Code für {0}", a)} role="img" dangerouslySetInnerHTML={{__html:svgs[a]||""}} />
              <div style={{fontWeight:600,fontSize:13}} data-no-i18n="">{a}</div>
              <button style={{...linkBtn,minHeight:44}} onClick={()=>gsCopy(gsQueueUrl(qs.token, a), setMsg)}>{tf("Link kopieren")}</button>
            </div>))}
        </div>
        <button style={gsBtn} onClick={()=>printQrCards(areas.map(a=>({label:a, url:gsQueueUrl(qs.token, a), text:tf("Warteliste: scannen, eintragen, wir rufen Sie auf.")+" · Waiting list: scan & we’ll call you."})), tf("Warteliste"))}><Icon n="printer" /> {tf("Aushänge drucken")}</button>
      </Card>}
      {list===false && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Die Warteliste ist noch nicht eingerichtet (Datenbank-Update 040 nötig).")}</div>}
      {list && <>
        {areas.length>1 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}} role="group" aria-label={tf("Bereich")}>
          {["", ...areas].map(a=><button key={a||"_"} style={{...gsBtn,...(area===a?{background:INK,color:"#fff",borderColor:INK}:{})}} aria-pressed={area===a} onClick={()=>setArea(a)}>{a ? <span data-no-i18n="">{a}</span> : tf("Alle")}</button>)}
        </div>}
        <Card style={{padding:0,marginBottom:14}}>
          <div style={{padding:"10px 14px",fontWeight:700}}>{tf("Wartende")} · {active.length}</div>
          {active.length===0 && <div style={{padding:"0 14px 12px",fontSize:13,color:INK_MUTED}}>{tf("Gerade wartet niemand.")}</div>}
          {active.map((x,i)=>{ const st = GS_Q_STATUS[x.status]; return (
            <div key={x.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"10px 14px",borderTop:`1px solid ${BORDER}`}}>
              <b style={{width:26,fontSize:16}}>{i+1}</b>
              <div style={{flex:1,minWidth:160}}>
                <b data-no-i18n="">{x.name}</b> · {tf("{0} Personen", x.party_size)} {!area && areas.length>1 && <span style={{color:INK_MUTED,fontSize:12.5}} data-no-i18n=""> · {x.area}</span>}
                <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("wartet seit {0} Min.", waitMin(x))}{x.note ? <span data-no-i18n=""> · {x.note}</span> : null}</div>
              </div>
              <Pill color={st[1]} bg={st[2]}>{tf(st[0])}</Pill>
              {x.status==="wartet" && <button className="btn-primary" style={gsMain} onClick={()=>set(x,"aufgerufen")}><Icon n="bell" /> {tf("Aufrufen")}</button>}
              {x.status==="aufgerufen" && <button style={gsBtn} onClick={()=>set(x,"aufgerufen")}>{tf("Erneut aufrufen")}</button>}
              <button className="btn-primary" style={{...gsMain,background:GOOD}} onClick={()=>set(x,"platziert")}>{tf("Platziert")}</button>
              <button style={{...gsBtn,color:BAD}} onClick={()=>set(x,"abgesagt")}>{tf("Abgesagt")}</button>
            </div>); })}
        </Card>
        {done.length>0 && <Card style={{padding:0}}>
          <div style={{padding:"10px 14px",fontWeight:700,fontSize:13.5}}>{tf("Erledigt")}</div>
          {done.map(x=>{ const st = GS_Q_STATUS[x.status]; return (
            <div key={x.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 14px",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
              <span style={{flex:1}} data-no-i18n="">{x.name} · {x.party_size}</span><Pill color={st[1]} bg={st[2]}>{tf(st[0])}</Pill>
              <button style={{...linkBtn,minHeight:44}} onClick={()=>set(x,"wartet")}>{tf("Zurück in die Warteliste")}</button>
            </div>); })}
        </Card>}
      </>}
    </div>
  );
}

// ------------------------------------------------------------ 3. Wiederkehr-Mail mit Anlass
function GsOccasionMailCard({hotel, api, role, onHotel}){
  const o0 = hotel.occasion_mail || {};
  const [s,setS] = useState({enabled:!!o0.enabled, anniversary:o0.anniversary!==false, birthday:!!o0.birthday, offer:o0.offer||""});
  const [stats,setStats] = useState(null); const [prev,setPrev] = useState(null); const [msg,setMsg] = useState(null);
  const [pv,setPv] = useState({kind:"anniversary", lang:UI_LANG||"de"});
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/marketing-stats").then(setStats).catch(()=>setStats(null)); },[api, hotel.id]);
  const save = async () => { setMsg(null); try { await gsSave(api, hotel, {occasion_mail:s}, onHotel); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const preview = async () => { setMsg(null); try { setPrev(await api("/api/hotels/"+hotel.id+"/occasion-mail/preview?kind="+pv.kind+"&lang="+pv.lang)); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <GsFold title={tf("Wiederkehr-Mail mit Anlass")} status={o0.enabled ? tf("Eingeschaltet") : tf("Aus")}>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Gäste, die auf der Anreise-Seite Angebote per E-Mail gewünscht und das per Bestätigungsmail bestätigt haben (Double-Opt-in), bekommen zum Jahrestag ihres Aufenthalts bzw. zum Geburtstag einen Gruß – höchstens eine Mail in 30 Tagen, immer mit Abmeldelink.")}</div>
      {stats && <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13.5,marginBottom:10}}>
        <span>{tf("Bestätigt")}: <b>{stats.confirmed}</b></span><span>{tf("Noch nicht bestätigt")}: <b>{stats.pending}</b></span><span>{tf("Abgemeldet")}: <b>{stats.unsubscribed}</b></span><span>{tf("Mails in 30 Tagen")}: <b>{stats.mailed_30d}</b></span>
      </div>}
      {role==="admin" && <>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> <b>{tf("Einwilligung auf der Anreise-Seite anbieten und Mails verschicken")}</b></label>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.anniversary} onChange={e=>setS({...s,anniversary:e.target.checked})} /> {tf("Zum Jahrestag des letzten Aufenthalts")}</label>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.birthday} onChange={e=>setS({...s,birthday:e.target.checked})} /> {tf("Zum Geburtstag (wenn der Gast ihn freiwillig angegeben hat)")}</label>
        <Field label={tf("Angebot in der Mail (optional, z. B. 10 % auf den nächsten Aufenthalt)")}><textarea className="input" rows={3} maxLength={600} value={s.offer} onChange={e=>setS({...s,offer:e.target.value})} /></Field>
        <button className="btn-primary" style={gsMain} onClick={save}>{tf("Speichern")}</button>
      </>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:12}}>
        <Field label={tf("Vorschau")}><select className="input" value={pv.kind} onChange={e=>setPv({...pv,kind:e.target.value})}><option value="anniversary">{tf("Jahrestag")}</option><option value="birthday">{tf("Geburtstag")}</option></select></Field>
        <Field label={tf("Sprache")}><select className="input" value={pv.lang} onChange={e=>setPv({...pv,lang:e.target.value})}>{LANGS.map(([c,l])=><option key={c} value={c}>{l}</option>)}</select></Field>
        <button style={{...gsBtn,marginBottom:14}} onClick={preview}>{tf("Vorschau zeigen")}</button>
      </div>
      {gsMsg(msg)}
      {prev && <div style={{border:`1px solid ${BORDER}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"6px 10px",fontSize:12.5,background:PAPER}}><b>{tf("Betreff")}:</b> <span data-no-i18n="">{prev.subject}</span></div>
        <iframe title={tf("Vorschau")} sandbox="" srcDoc={prev.html} style={{width:"100%",height:420,border:0,background:"#fff"}} />
      </div>}
      <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Die Mail kommt in der Sprache des Gastes, sonst in der Sprache der Organisation. Wer sich abmeldet, bekommt keine Angebote mehr.")}</div>
    </GsFold>
  );
}

// ------------------------------------------------------------ 5. Fundsachen-Rückversand
function GsLostFoundShippingSettings({hotel, api, onHotel}){
  const l0 = hotel.lost_found_shipping || {};
  const [s,setS] = useState({enabled:!!l0.enabled, fee:l0.fee??"", payment_link:l0.payment_link||"", note:l0.note||""});
  const [msg,setMsg] = useState(null);
  const save = async () => { setMsg(null); try { await gsSave(api, hotel, {lost_found_shipping:{...s, fee:gsNum(s.fee)||0}}, onHotel); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <GsFold title={tf("Rückversand von Fundsachen")} status={l0.enabled ? tf("Eingeschaltet") : tf("Aus")}>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Der Gast gibt seine Adresse ein und bezahlt die Versandkosten über den eigenen Zahlungslink des Hotels (z. B. aus dem Kassen- oder Zahlungsanbieter). Ouverture kassiert dabei kein Geld.")}</div>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> <b>{tf("Rückversand anbieten")}</b></label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Versandgebühr")}><input className="input" inputMode="decimal" value={s.fee} onChange={e=>setS({...s,fee:e.target.value})} /></Field>
        <Field label={tf("Zahlungslink des Hotels (https://…)")}><input className="input" type="url" value={s.payment_link} onChange={e=>setS({...s,payment_link:e.target.value})} /></Field>
      </div>
      <Field label={tf("Hinweis für Gäste (z. B. Versandart, Länder)")}><input className="input" maxLength={500} value={s.note} onChange={e=>setS({...s,note:e.target.value})} /></Field>
      <button className="btn-primary" style={gsMain} onClick={save}>{tf("Speichern")}</button>
      {gsMsg(msg)}
    </GsFold>
  );
}
const GS_SHIP = {angefragt:["Angefragt",WARN_TEXT,WARN_SOFT], bezahlt:["Bezahlt",BRASS_TEXT,BRASS_SOFT], versendet:["Versendet",GOOD_TEXT,GOOD_SOFT]};
function LostFoundShippingPanel({item, api, hotel, onChange}){
  const [x,setX] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [form,setForm] = useState({email:/@/.test(item.guest_contact||"") ? item.guest_contact : "", language:"de", show_photo:false});
  const [tracking,setTracking] = useState("");
  const set = hotel.lost_found_shipping || {};
  useEffect(()=>{ api("/api/lost-found/"+item.id+"/shipping").then(setX).catch(()=>setX(false)); },[api, item.id]);
  const run = async (fn, ok) => { setMsg(null); setBusy(true); try { const r = await fn(); setX(r); if(onChange) onChange(r); setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); } };
  if(x===false || x===null) return null;
  const money = moneyOf(hotel);
  const st = x.ship_status && GS_SHIP[x.ship_status];
  const a = x.ship_address || {};
  if(!x.ship_status && item.status!=="Aufbewahrt") return null;
  if(!x.ship_status && !set.enabled) return <div style={{fontSize:12.5,color:INK_MUTED,marginTop:6}}>{tf("Rückversand: in den Einstellungen der Fundsachen einschalten (Gebühr und Zahlungslink).")}</div>;
  return (
    <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:10,marginTop:8,fontSize:13.5}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <b><Icon n="truck" /> {tf("Rückversand")}</b>
        {st && <Pill color={st[1]} bg={st[2]}>{tf(st[0])}</Pill>}
        {x.ship_fee!=null && x.ship_status && <span style={{color:INK_MUTED}}>{money(x.ship_fee)}</span>}
      </div>
      {!x.ship_status && <div style={{marginTop:8}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("E-Mail des Gastes")}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
          <Field label={tf("Sprache des Gastes")}><select className="input" value={form.language} onChange={e=>setForm({...form,language:e.target.value})}>{LANGS.map(([c,l])=><option key={c} value={c}>{l}</option>)}</select></Field>
        </div>
        {item.has_photo && <label style={{display:"flex",gap:8,alignItems:"center",minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={form.show_photo} onChange={e=>setForm({...form,show_photo:e.target.checked})} /> {tf("Foto auf der Gästeseite zeigen (nur bei unkritischen Gegenständen – keine Ausweise, Dokumente oder Karten)")}</label>}
        <button className="btn-primary" style={gsMain} disabled={busy || !/@/.test(form.email)} onClick={()=>run(()=>api("/api/lost-found/"+item.id+"/ship-offer","POST",form), tf("Mail an den Gast verschickt."))}>{busy ? "…" : tf("Rückversand anbieten")}</button>
      </div>}
      {x.ship_status && <div style={{marginTop:6}}>
        {x.ship_requested_at && <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Angeboten am {0}", fmtDateTime(x.ship_requested_at))}{x.guest_contact ? <span data-no-i18n=""> · {x.guest_contact}</span> : null}</div>}
        {a.street ? <div style={{marginTop:6,background:PAPER,borderRadius:6,padding:"6px 8px",whiteSpace:"pre-line"}} data-no-i18n="">{[a.name, a.street, (a.zip||"")+" "+(a.city||""), a.country ? gtCountryName(a.country) : "", a.phone].filter(Boolean).join("\n")}</div>
          : x.ship_status==="angefragt" && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:4}}>{tf("Der Gast hat noch keine Adresse angegeben.")}</div>}
        {x.link && x.ship_status!=="versendet" && <button style={{...linkBtn,minHeight:44}} onClick={()=>gsCopy(x.link, setMsg)}>{tf("Link für den Gast kopieren")}</button>}
        {x.ship_status==="angefragt" && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
          <button className="btn-primary" style={gsMain} disabled={busy} onClick={()=>{ if(window.confirm(tf("Ist die Zahlung auf dem Konto bzw. beim Zahlungsanbieter des Hotels eingegangen?"))) run(()=>api("/api/lost-found/"+item.id+"/ship-status","POST",{status:"bezahlt"}), tf("Als bezahlt vermerkt. Der Gast bekommt eine Mail.")); }}>{tf("Bezahlt bestätigen")}</button>
        </div>}
        {(x.ship_status==="bezahlt" || (x.ship_status==="angefragt" && a.street)) && <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:6}}>
          <Field label={tf("Sendungsnummer")}><input className="input" value={tracking} maxLength={120} onChange={e=>setTracking(e.target.value)} /></Field>
          <button style={{...gsBtn,marginBottom:14}} disabled={busy || !a.street} onClick={()=>run(()=>api("/api/lost-found/"+item.id+"/ship-status","POST",{status:"versendet", tracking}), tf("Als versendet vermerkt. Der Gast bekommt eine Mail."))}>{tf("Versendet")}</button>
        </div>}
        {x.ship_status==="versendet" && <div style={{marginTop:6,color:GOOD}}>✓ {tf("Versendet am {0}", fmtDateTime(x.shipped_at))}{x.tracking ? <span data-no-i18n=""> · {x.tracking}</span> : null}</div>}
      </div>}
      {gsMsg(msg)}
    </div>
  );
}

// ------------------------------------------------------------ 6. Belegung nach Etagen
function GsFloorPlanCard({hotel, api, role, onHotel}){
  const [date,setDate] = useState(todayIso()); const [plan,setPlan] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const f0 = hotel.floor_settings || {};
  const [fs,setFs] = useState({kwh_per_floor_day:f0.kwh_per_floor_day??"", price_kwh:f0.price_kwh??""});
  const [edit,setEdit] = useState({});
  const load = useCallback(()=>{ setMsg(null); api("/api/hotels/"+hotel.id+"/floor-plan?date="+date).then(p=>{ setPlan(p); setEdit({}); }).catch(e=>{ setPlan(null); setMsg({ok:false,text:e.message}); }); },[api, hotel.id, date]);
  useEffect(()=>{ load(); },[load]);
  const money = moneyOf(hotel);
  const saveFs = async () => { setMsg(null); try { await gsSave(api, hotel, {floor_settings:{kwh_per_floor_day:gsNum(fs.kwh_per_floor_day)||0, price_kwh:gsNum(fs.price_kwh)}}, onHotel); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const apply = async () => {
    setBusy(true); setMsg(null);
    try { const list = plan.assignments.filter(a=>!a.kept || edit[a.arrival_id]!==undefined).map(a=>({arrival_id:a.arrival_id, room: edit[a.arrival_id]!==undefined ? edit[a.arrival_id] : a.assigned_room}));
      const r = await api("/api/hotels/"+hotel.id+"/floor-plan/apply","POST",{assignments:list}); setMsg({ok:true,text:tf("{0} Zimmer übernommen. Bitte die Zuweisung auch im PMS eintragen.", r.saved)}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); }
  };
  return (
    <Card style={{marginBottom:14}}>
      <b><Icon n="home" /> {tf("Belegung nach Etagen")}</b>
      <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Ouverture verteilt die Anreisen auf freie, saubere Zimmer passender Kategorie – zuerst auf Etagen, die ohnehin belegt sind. So bleiben ganze Etagen leer und Heizung, Lüftung und Licht können dort herunter. VIP-Gäste bekommen ein Zimmer möglichst weit oben.")}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <Field label={tf("Datum")}><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field>
        <button style={{...gsBtn,marginBottom:14}} onClick={load}>{tf("Neu berechnen")}</button>
      </div>
      {gsMsg(msg)}
      {plan && <>
        {!plan.status_live && <div style={{fontSize:12.5,color:WARN_TEXT,marginBottom:8}}>{tf("Für spätere Tage ist der Zimmerstatus noch nicht bekannt – alle Zimmer außer „Außer Betrieb“ gelten als frei.")}</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {plan.floors.map(f=>{ const empty = plan.empty_floors.includes(f.floor); return <span key={f.floor} style={{border:`1px solid ${empty?GOOD:BORDER}`,background:empty?GOOD_SOFT:"#fff",borderRadius:8,padding:"6px 10px",fontSize:12.5}}><b>{tf("Etage {0}", f.floor)}</b> · {f.used}/{f.rooms}{empty ? " · "+tf("leer") : ""}</span>; })}
        </div>
        <div style={{fontSize:13.5,marginBottom:10}}>
          {tf("Leere Etagen")}: <b>{plan.empty_floors.length}</b>
          {plan.kwh_saved>0 && <span> · ≈ <b>{fmtNum(plan.kwh_saved,0)} kWh</b> {tf("am Tag")}</span>}
          {plan.saving!=null && <span> · ≈ <b>{money(plan.saving)}</b></span>}
          {!plan.kwh_per_floor_day && <span style={{color:INK_MUTED}}> · {tf("Für die Ersparnis bitte den Verbrauch je Etage und Tag eintragen.")}</span>}
          {plan.kwh_per_floor_day>0 && plan.price_kwh==null && <span style={{color:INK_MUTED}}> · {tf("Strompreis fehlt (Zähler „Strom“ mit Preis oder Einstellung).")}</span>}
        </div>
        {plan.assignments.length===0 && plan.unassigned.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Anreisen an diesem Tag.")}</div>}
        {plan.assignments.map(a=>(
          <div key={a.arrival_id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:150}}><span data-no-i18n="">{a.guest_name}</span>{a.vip && <> <Pill color={BRASS_TEXT} bg={BRASS_SOFT}>VIP</Pill></>}{a.room_type ? <span style={{color:INK_MUTED,fontSize:12}} data-no-i18n=""> · {a.room_type}</span> : null}</span>
            <input className="input" style={{width:90}} aria-label={tf("Zimmer für {0}", a.guest_name)} value={edit[a.arrival_id]!==undefined ? edit[a.arrival_id] : a.assigned_room} onChange={e=>setEdit({...edit,[a.arrival_id]:e.target.value})} />
            <span style={{fontSize:12,color:INK_MUTED,minWidth:70}}>{tf("Etage {0}", a.floor)}</span>
            {a.kept && <Pill color={INK_MUTED} bg={PAPER}>{tf("schon zugewiesen")}</Pill>}
            {a.needs_cleaning && <Pill color={WARN_TEXT} bg={WARN_SOFT}>{tf("noch reinigen")}</Pill>}
          </div>))}
        {plan.unassigned.length>0 && <div style={{fontSize:13,color:BAD,marginTop:8}}>{tf("Kein passendes freies Zimmer")}: <span data-no-i18n="">{plan.unassigned.map(u=>u.guest_name+(u.room_type?" ("+u.room_type+")":"")).join(", ")}</span></div>}
        {plan.assignments.length>0 && canManageDept("Rezeption & Empfang") && <button className="btn-primary" style={{...gsMain,marginTop:10}} disabled={busy} onClick={apply}>{busy ? "…" : tf("Vorschlag übernehmen")}</button>}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Ehrlicher Hinweis: Die Zuweisung gilt in Ouverture (Gästeliste, Reinigungs-Reihenfolge). Bitte die Zimmer auch im PMS selbst zuweisen – das Rückschreiben ins PMS ist nicht angebunden.")}</div>
      </>}
      {role==="admin" && <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:12,paddingTop:10,borderTop:`1px solid ${BORDER}`}}>
        <Field label={tf("Verbrauch je Etage und Tag (kWh)")}><input className="input" inputMode="decimal" style={{width:150}} value={fs.kwh_per_floor_day} onChange={e=>setFs({...fs,kwh_per_floor_day:e.target.value})} /></Field>
        <Field label={tf("Strompreis je kWh (wenn kein Zähler mit Preis)")}><input className="input" inputMode="decimal" style={{width:150}} value={fs.price_kwh} onChange={e=>setFs({...fs,price_kwh:e.target.value})} /></Field>
        <button style={{...gsBtn,marginBottom:14}} onClick={saveFs}>{tf("Speichern")}</button>
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ 7. Reinigungs-Reihenfolge
const gsReason = (r) => {
  if(r.reason.kind==="anreise") return [r.reason.eta ? tf("Anreise {0}", r.reason.eta) : tf("Anreise heute"), r.reason.vip ? "VIP" : "", r.reason.departure ? tf("nach Abreise") : ""].filter(Boolean).join(", ");
  return r.reason.kind==="abreise" ? tf("Abreise") : r.reason.kind==="bleibe" ? tf("Bleibe") : tf("Schmutzig, unbelegt");
};
function CleaningOrderCard({hotel, api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [all,setAll] = useState(false);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/cleaning-order").then(setList).catch(e=>{ setList(false); setMsg({ok:false,text:e.message}); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(list===false) return gsMsg(msg);
  const shown = (list||[]).slice(0, all ? 500 : 12);
  const PRIO = [[BAD,BAD_SOFT],[WARN_TEXT,WARN_SOFT],[INK_MUTED,PAPER],[INK_MUTED,"#EEF0F2"]];
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <b style={{flex:1}}><Icon n="route" /> {tf("Reinigungs-Reihenfolge")}</b>
        <button style={gsBtn} onClick={load}>{tf("Aktualisieren")}</button>
      </div>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Zuerst Zimmer mit Anreise heute (VIP, dann nach Ankunftszeit), dann Abreisen, Bleibe-Zimmer zuletzt – innerhalb gleicher Priorität nach Etage und Nummer.")}</div>
      {list===null ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div> : list.length===0 ? <div style={{fontSize:13,color:GOOD}}>✓ {tf("Alle Zimmer sind sauber.")}</div> :
        <ol style={{listStyle:"none",padding:0,margin:0}}>
          {shown.map(r=>(
            <li key={r.id} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
              <b style={{width:24,color:INK_MUTED}}>{r.order}</b>
              <b style={{width:60}} data-no-i18n="">{r.number}</b>
              <span style={{fontSize:12,color:INK_MUTED,width:64}}>{tf("Etage {0}", r.floor)}</span>
              <span style={{flex:1}}><Pill color={PRIO[r.prio][0]} bg={PRIO[r.prio][1]}>{gsReason(r)}</Pill></span>
              <span style={{fontSize:12,color:INK_MUTED}}>{tf(r.status)}</span>
            </li>))}
        </ol>}
      {list && list.length>12 && <button style={{...linkBtn,minHeight:44}} onClick={()=>setAll(!all)}>{all ? tf("Weniger zeigen") : tf("Alle {0} zeigen", list.length)}</button>}
    </Card>
  );
}

// ------------------------------------------------------------ 8. Zimmer-Lebenslauf und Problemzimmer
const GS_ACCESS = [["step_free","stufenlos"],["wide_door","breite Tür"],["roll_in_shower","bodengleiche Dusche"],["grab_bars","Haltegriffe"],["lowered_bed","niedriges Bett"],["hearing_loop","Induktionsschleife"],["visual_alarm","optischer Alarm"]];
const GS_HIST = {meldung:["wrench","Meldung"], abnahme:["clipboard","Zimmer-Abnahme"], minibar:["receipt","Minibar"], fundsache:["search","Fundsache"], status:["gauge","Status"]};
function RoomHistoryView({room, api, hotel, onClose}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [kind,setKind] = useState("");
  useEffect(()=>{ setD(null); api("/api/rooms/"+room.id+"/history").then(setD).catch(e=>setMsg({ok:false,text:e.message})); },[api, room.id]);
  const money = moneyOf(hotel);
  const acc = d ? GS_ACCESS.filter(([k])=>d.room.accessibility && d.room.accessibility[k]) : [];
  const tl = d ? d.timeline.filter(x=>!kind || x.kind===kind) : [];
  return (
    <Card style={{marginBottom:14,borderColor:BRASS}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <b style={{flex:1,fontSize:16}}>{tf("Zimmer-Lebenslauf")} · <span data-no-i18n="">{room.number}</span></b>
        {onClose && <button style={gsBtn} aria-label={tf("Schließen")} onClick={onClose}>✕</button>}
      </div>
      {gsMsg(msg)}
      {!d && !msg && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div>}
      {d && <>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>
          {d.room.floor ? tf("Etage {0}", d.room.floor)+" · " : ""}{d.room.room_type ? <span data-no-i18n="">{d.room.room_type} · </span> : null}{tf(d.room.status)} · {tf(d.room.occupancy)}
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:13.5,marginBottom:10}}>
          <span>{tf("Meldungen (90 Tage)")}: <b style={{color:d.counts.tickets_90d>=3?BAD:INK}}>{d.counts.tickets_90d}</b></span>
          <span>{tf("Offen")}: <b>{d.counts.open_tickets}</b></span>
          <span>{tf("Abnahmen")}: <b>{d.counts.inspections}</b>{d.counts.failed_inspections ? <span style={{color:BAD}}> ({tf("{0} nicht bestanden", d.counts.failed_inspections)})</span> : null}</span>
          <span>{tf("Minibar nicht abgerechnet")}: <b>{d.counts.minibar_unbilled}</b></span>
          <span>{tf("Fundsachen")}: <b>{d.counts.lost_found}</b></span>
        </div>
        {(acc.length>0 || (d.room.accessibility||{}).note) && <div style={{fontSize:13,marginBottom:8}}><b>{tf("Barrierefreiheit")}:</b> {acc.map(([k,l])=>tf(l)).join(", ")}{d.room.accessibility.note ? <span data-no-i18n=""> · {d.room.accessibility.note}</span> : null}</div>}
        {d.equipment && <div style={{fontSize:13,marginBottom:8}}><b>{tf("Ausstattung")}:</b> {tf("{0} Positionen geliefert, {1} eingebaut", Object.keys(d.equipment.delivered||{}).length, Object.values(d.equipment.installed||{}).filter(Boolean).length)}{d.equipment.note ? <span data-no-i18n=""> · {d.equipment.note}</span> : null}</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"8px 0"}} role="group" aria-label={tf("Filter")}>
          {["", ...Object.keys(GS_HIST)].map(k=><button key={k||"_"} style={{...gsBtn,...(kind===k?{background:INK,color:"#fff",borderColor:INK}:{})}} aria-pressed={kind===k} onClick={()=>setKind(k)}>{k ? tf(GS_HIST[k][1]) : tf("Alle")}</button>)}
        </div>
        {tl.length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Einträge zu diesem Zimmer.")}</div> :
          tl.slice(0,150).map((x,i)=>(
            <div key={x.kind+(x.id||"")+i} style={{display:"flex",gap:10,padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
              <span style={{width:20,color:INK_MUTED}}><Icon n={GS_HIST[x.kind][0]} /></span>
              <span style={{width:92,color:INK_MUTED,fontSize:12}}>{fmtDate(x.at)}</span>
              <span style={{flex:1}}>
                <span style={{color:INK_MUTED}}>{tf(GS_HIST[x.kind][1])}: </span>
                {x.kind==="status" ? tf(x.title) : x.kind==="abnahme" ? <>{x.passed ? <span style={{color:GOOD}}>✓ {tf("bestanden")}</span> : <span style={{color:BAD}}>✗ {tf("nicht bestanden")}</span>}{x.title ? <span data-no-i18n=""> · {x.title}</span> : null}</> : <span data-no-i18n="">{x.title}</span>}
                {x.kind==="minibar" && <span> · {money(x.amount)} {x.billed ? "" : <Pill color={WARN_TEXT} bg={WARN_SOFT}>{tf("nicht abgerechnet")}</Pill>}</span>}
                {(x.kind==="meldung"||x.kind==="fundsache") && x.status && <span style={{color:INK_MUTED}}> · {tf(x.status)}</span>}
                {x.priority==="Dringend" && <> <Pill color={BAD} bg={BAD_SOFT}>{tf("Dringend")}</Pill></>}
              </span>
            </div>))}
        {!d.status_log && <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Statuswechsel sieht nur die Leitung.")}</div>}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Meldungen und Fundsachen werden über den Ort zugeordnet (z. B. „Zimmer 214“).")}</div>
      </>}
    </Card>
  );
}
function ProblemRoomsCard({hotel, api, onOpen}){
  const [list,setList] = useState(null);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/problem-rooms?limit=10").then(setList).catch(()=>setList(false)); },[api, hotel.id]);
  if(!list || list.length===0) return null;
  const max = Math.max(...list.map(r=>r.tickets_90d));
  return (
    <Card style={{marginBottom:14}}>
      <b><Icon n="alert" /> {tf("Problemzimmer")}</b> <span style={{fontSize:12.5,color:INK_MUTED}}>· {tf("die meisten Meldungen der letzten 90 Tage")}</span>
      {list.map(r=>(
        <div key={r.id} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,cursor:onOpen?"pointer":"default",minHeight:44}} {...(onOpen ? pressable(()=>onOpen(r)) : {})}>
          <b style={{width:60}} data-no-i18n="">{r.number}</b>
          <span style={{flex:1}}><span style={{display:"inline-block",height:8,borderRadius:4,background:r.urgent?BAD:BRASS,width:Math.max(8, Math.round(r.tickets_90d/max*160)),verticalAlign:"middle"}} aria-hidden="true" /> <b>{r.tickets_90d}</b>{r.open ? <span style={{color:INK_MUTED}}> · {tf("{0} offen", r.open)}</span> : null}</span>
          {onOpen && <span style={{color:INK_MUTED}} aria-hidden="true">›</span>}
        </div>))}
    </Card>
  );
}

// ------------------------------------------------------------ 9. Kassen-Anbindung
const GS_POS_FIELDS = [["date","Datum",["datum","date","tag","day","geschäftstag","business date"]],["outlet","Outlet",["outlet","kasse","bereich","standort","register","location"]],["net","Netto",["netto","net","umsatz netto","net sales"]],["gross","Brutto",["brutto","gross","umsatz","umsatz brutto","gross sales","total"]],["tax","Steuer",["steuer","mwst","ust","tax","vat"]],["cash","Bar",["bar","cash","barumsatz"]],["card","Karte",["karte","card","ec","kreditkarte","unbar"]],["covers","Couverts",["couverts","gäste","covers","pax","gedecke","personen"]]];
function gsPosGuide(endpoint){
  return [tf("Schnittstelle für Tagesumsätze (Kasse → Ouverture)"), "",
    "POST "+endpoint, "Content-Type: application/json", "",
    tf("Ein Tag je Outlet, z. B. nach dem Tagesabschluss:"),
    '{ "date": "2026-10-24", "outlet": "Restaurant", "net": 3120.50, "gross": 3577.80, "tax": 457.30, "cash": 812.00, "card": 2765.80, "covers": 96 }', "",
    tf("Mehrere Tage oder Outlets auf einmal: { \"sales\": [ … ] } (höchstens 100 Zeilen)."),
    tf("Beträge als Zahl mit Punkt, Datum als JJJJ-MM-TT. Ein erneuter Aufruf für denselben Tag und dasselbe Outlet überschreibt die Werte."),
    tf("Antwort: 200 { \"ok\": true, \"saved\": 1 } · 400 Fehler in den Daten · 401 unbekannter Schlüssel · 429 zu viele Aufrufe."),
    tf("Der Schlüssel in der Adresse ist geheim – bitte nur an die Kassen-Firma weitergeben.")].join("\n");
}
function GsPosView({hotel, api, role, onHotel}){
  const [month,setMonth] = useState(todayIso().slice(0,7)); const [data,setData] = useState(null); const [msg,setMsg] = useState(null);
  const [imp,setImp] = useState(null); const [busy,setBusy] = useState(false); const [token,setToken] = useState(null);
  const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/pos-sales?month="+month).then(setData).catch(e=>{ setData(false); setMsg({ok:false,text:e.message}); }),[api, hotel.id, month]);
  useEffect(()=>{ load(); },[load]);
  const ps = hotel.pos_settings || {};
  const readFile = async (file) => {
    setMsg(null);
    try { const rows = await readSpreadsheet(file); if(!rows.length) throw new Error(tf("Die Datei ist leer."));
      const heads = Object.keys(rows[0]); const map = {};
      GS_POS_FIELDS.forEach(([k,,names])=>{ const h = heads.find(x=>names.includes(String(x).trim().toLowerCase())); map[k] = h || ""; });
      setImp({rows, heads, map, name:file.name}); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const doImport = async () => {
    setBusy(true); setMsg(null);
    try { const rows = imp.rows.map(r=>{ const o = {}; GS_POS_FIELDS.forEach(([k])=>{ const h = imp.map[k]; o[k] = h ? r[h] : ""; }); o.date = gsDate(o.date); ["net","gross","tax","cash","card","covers"].forEach(k=>{ o[k] = gsNum(o[k]); }); return o; }).filter(o=>o.date);
      const r = await api("/api/hotels/"+hotel.id+"/pos-sales/import","POST",{rows});
      setMsg({ok:true,text:tf("{0} Tageszeilen übernommen.", r.saved)+(r.skipped_count ? " "+tf("{0} Zeilen übersprungen.", r.skipped_count) : "")}); setImp(null); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); }
  };
  const toBook = async (date) => { setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/pos-sales/cash-to-book","POST",{date}); setMsg({ok:true,text:r.created.length ? tf("{0} Einträge ins Kassenbuch übernommen.", r.created.length) : tf("Schon im Kassenbuch oder kein Barumsatz.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const newToken = async () => { if(ps.token_hash && !window.confirm(tf("Neuen Schlüssel erzeugen? Der bisherige funktioniert danach nicht mehr – die Kassen-Firma muss den neuen eintragen."))) return; setMsg(null); try { const r = await api("/api/hotels/"+hotel.id+"/pos/token","POST",{}); setToken(r); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const rows = (data && data.rows) || [];
  const sum = (k) => rows.reduce((s,r)=>s+(Number(r[k])||0),0);
  const days = {}; rows.forEach(r=>{ (days[r.sale_date] = days[r.sale_date] || []).push(r); });
  const covers = sum("covers"), gross = sum("gross");
  // Ø Bon nur aus Zeilen mit Couverts (eine Bar ohne Couverts verfälscht ihn sonst)
  const grossCov = rows.filter(r=>Number(r.covers)>0).reduce((s,r)=>s+(Number(r.gross)||0),0);
  const outlets = [...new Set(rows.map(r=>r.outlet))];
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Tagesumsätze der Kassen (Restaurant, Bar, Spa …) – per CSV/Excel-Import oder automatisch über die Schnittstelle. Den Barumsatz übernimmst du mit einem Klick ins Kassenbuch.")}</div>
      {gsMsg(msg)}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
          <Field label={tf("Monat")}><input className="input" type="month" value={month} onChange={e=>setMonth(e.target.value)} /></Field>
          <div style={{marginBottom:14}}><FileButton label={tf("Tagesumsätze aus Datei übernehmen")} busy={busy} onFile={readFile} title={tf("Spalten: Datum, Outlet, Netto, Brutto, Steuer, Bar, Karte, Couverts")} /></div>
        </div>
        {imp && <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:10,marginBottom:10}}>
          <b data-no-i18n="">{imp.name}</b> · {tf("{0} Zeilen", imp.rows.length)}
          <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Welche Spalte enthält was? Erkannte Spalten sind schon gewählt.")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
            {GS_POS_FIELDS.map(([k,l])=>(
              <Field key={k} label={tf(l)}><select className="input" value={imp.map[k]} onChange={e=>setImp({...imp,map:{...imp.map,[k]:e.target.value}})}><option value="">–</option>{imp.heads.map(h=><option key={h} value={h}>{h}</option>)}</select></Field>))}
          </div>
          <button className="btn-primary" style={gsMain} disabled={busy || !imp.map.date || !(imp.map.gross||imp.map.net)} onClick={doImport}>{busy ? "…" : tf("Übernehmen")}</button>
          <button style={{...linkBtn,minHeight:44}} onClick={()=>setImp(null)}>{tf("Abbrechen")}</button>
        </div>}
        {data===false ? null : rows.length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Für diesen Monat sind noch keine Umsätze erfasst.")}</div> : <>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13.5,margin:"4px 0 10px"}}>
            <span>{tf("Monat brutto")}: <b>{money(gross)}</b></span><span>{tf("Netto")}: <b>{money(sum("net"))}</b></span><span>{tf("Bar")}: <b>{money(sum("cash"))}</b></span><span>{tf("Karte")}: <b>{money(sum("card"))}</b></span>
            <span>{tf("Couverts")}: <b>{fmtNum(covers,0)}</b></span><span>{tf("Ø Bon je Couvert")}: <b>{covers ? money(grossCov/covers) : "–"}</b></span>
          </div>
          {outlets.length>1 && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{outlets.map(o=>{ const rs = rows.filter(r=>r.outlet===o), g = rs.reduce((s,r)=>s+(Number(r.gross)||0),0); return <span key={o} style={{marginInlineEnd:12}}>{o ? <span data-no-i18n="">{o}</span> : tf("Ganzes Haus")}: <b>{money(g)}</b></span>; })}</div>}
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{color:INK_MUTED,textAlign:"start"}}>{["Datum","Outlet","Netto","Brutto","Bar","Karte","Couverts","Ø Bon",""].map(h=><th key={h} style={{padding:"6px 4px",textAlign:"start",fontWeight:600}}>{h ? tf(h) : ""}</th>)}</tr></thead>
              <tbody>{Object.keys(days).sort().map(d=>days[d].map((r,i)=>(
                <tr key={r.id} style={{borderTop:`1px solid ${BORDER}`}}>
                  <td style={{padding:"6px 4px",whiteSpace:"nowrap"}}>{i===0 ? fmtDay(d,{weekday:"short",day:"2-digit",month:"2-digit"}) : ""}</td>
                  <td style={{padding:"6px 4px"}}>{r.outlet ? <span data-no-i18n="">{r.outlet}</span> : tf("Ganzes Haus")}</td>
                  <td style={{padding:"6px 4px"}}>{r.net!=null ? money(r.net) : "–"}</td><td style={{padding:"6px 4px"}}>{r.gross!=null ? money(r.gross) : "–"}</td>
                  <td style={{padding:"6px 4px"}}>{r.cash!=null ? money(r.cash) : "–"}</td><td style={{padding:"6px 4px"}}>{r.card!=null ? money(r.card) : "–"}</td>
                  <td style={{padding:"6px 4px"}}>{r.covers ?? "–"}</td><td style={{padding:"6px 4px"}}>{r.covers && r.gross ? money(r.gross/r.covers) : "–"}</td>
                  <td style={{padding:"6px 4px",whiteSpace:"nowrap"}}>{i===0 && days[d].some(x=>Number(x.cash)>0) && <button style={gsBtn} onClick={()=>toBook(d)}><Icon n="cash" /> {tf("Barumsatz ins Kassenbuch")}</button>}</td>
                </tr>)))}</tbody>
            </table>
          </div>
          <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Der Barumsatz kommt als Einnahme (Kategorie „Sonstiges“ mit Vermerk) ins Kassenbuch; doppelt übernommen wird nichts.")}</div>
        </>}
      </Card>
      {role==="admin" && <GsFold title={tf("Schnittstelle für die Kassen-Firma")} status={ps.token_hash ? tf("Schlüssel vorhanden") : tf("Kein Schlüssel")}>
        <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>{tf("Die Kasse schickt nach dem Tagesabschluss die Tagesumsätze an Ouverture. Der Schlüssel wird nur einmal angezeigt; gespeichert ist nur eine Prüfsumme.")}</div>
        <button className="btn-primary" style={gsMain} onClick={newToken}>{ps.token_hash ? tf("Neuen Schlüssel erzeugen") : tf("Schlüssel erzeugen")}</button>
        {token && <div style={{marginTop:10}}>
          <div style={{fontSize:13,color:WARN_TEXT,marginBottom:6}}>{tf("Jetzt kopieren – der Schlüssel wird nicht noch einmal angezeigt.")}</div>
          <textarea className="input" readOnly rows={12} aria-label={tf("Anleitung für die Kassen-Firma")} value={gsPosGuide(token.endpoint)} style={{fontFamily:"monospace",fontSize:12}} data-no-i18n="" />
          <button style={gsBtn} onClick={()=>gsCopy(gsPosGuide(token.endpoint), setMsg)}>{tf("Anleitung kopieren")}</button>
        </div>}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:8}}>{tf("Ehrlicher Hinweis: Mit einer echten Kasse ist die Schnittstelle noch nicht getestet. Bitte die ersten Tage mit dem Kassenbericht vergleichen.")}</div>
      </GsFold>}
    </div>
  );
}
