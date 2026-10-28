// ============================================================ Paket 042: Zertifikat „Eröffnungsbereit“ und Ausfall-Notmodus
// Rechte prüft der Server (routes-resilience.js); die Oberfläche blendet nur aus.

const zmMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD_TEXT:BAD,fontSize:13,marginTop:8}}>{msg.text}</div> : null;
const zmBtn = {...smallBtn, minHeight:44};
const ZM_AREAS = {tasks:"Aufgaben", schedule:"Zeitplan (Bereitschafts-Score)", permits:"Genehmigungen", rooms:"Zimmer-Abnahme", equipment:"Erstausstattung", procurement:"Einkauf und Lieferungen", trainings:"Schulungen", staff:"Personal", risks:"Risiken", defects:"Baumängel"};
const ZM_STATUS = {"bereit":["#2F6B4E","#E4EFE8"], "fast bereit":["#8A5F14","#F5E9D5"], "offen":["#A23B32","#F5E1DE"], "keine Daten":["#626976","#F6F4EF"]};
const zmIso = (iso) => iso ? fmtDate(iso+"T12:00:00") : "–";
function zmCritDetail(c){
  switch(c.code){
    case "overdue": return tf("überfällig seit {0}", zmIso(c.arg));
    case "due": return tf("fällig am {0}", zmIso(c.arg));
    case "critical_task": return tf("Aufgabe mit Priorität Kritisch");
    case "milestone": return tf("kritischer Meilenstein gefährdet oder überfällig");
    case "risk": return tf("hohes Risiko ({0})", c.arg);
    case "permit_expired": return tf("abgelaufen am {0}", zmIso(c.arg));
    case "permit_rejected": return tf("abgelehnt");
    case "permit_requested": return tf("beantragt, noch nicht erteilt");
    case "permit_open": return tf("noch nicht beantragt");
    case "inspection_failed": return tf("Abnahme nicht bestanden");
    case "defect": return [c.arg, tf("dringender Baumangel")].filter(Boolean).join(" · ");
    default: return c.detail || "";
  }
}
function zmCriterion(c){
  if(c.key==="overall") return tf("Gesamtstand mindestens {0} %", 95);
  if(c.key==="critical") return tf("Keine offenen kritischen Punkte");
  if(c.key==="areas") return tf("Kein Bereich unter {0} %", 80);
  if(c.key==="data") return tf("Aufgaben und Genehmigungen sind erfasst");
  return translateString(c.text);
}

// ------------------------------------------------------------ 1. Zertifikat als PDF (A4 quer)
function zmCertificateHtml(hotel, c){
  const accent = hotel.brand_color || "#A9834B", good = c.ready, mark = good ? "#2F6B4E" : "#7E5F2C";
  const css = '<style>.fs .zc{display:grid;grid-template-columns:1.25fr 1fr;gap:12px}.fs .seal{display:flex;align-items:center;gap:14px;border:2px solid '+mark+';border-radius:10px;padding:10px 14px;margin-bottom:12px;background:'+(good?"#E4EFE8":"#F6F4EF")+'}'
    + '.fs .seal .p{font-family:Georgia,serif;font-size:38px;font-weight:700;color:'+mark+'}.fs .seal .t{font-family:Georgia,serif;font-size:20px;font-weight:700;color:'+mark+'}'
    + '.fs .bar{height:6px;background:#F0ECE3;border-radius:3px;overflow:hidden;margin-top:3px}.fs .bar i{display:block;height:100%}'
    + '.fs .chip{font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;white-space:nowrap}.fs .code{font-family:Consolas,monospace;font-size:11px;word-break:break-all;background:#F6F4EF;padding:6px;border-radius:5px}'
    + '.fs .cr{display:flex;gap:6px;padding:3px 0}.fs .cr b{width:14px}</style>';
  const areas = c.areas.map(a=>{ const st = ZM_STATUS[a.status] || ZM_STATUS["keine Daten"];
    return '<tr><td><b>'+fsT(ZM_AREAS[a.key]||a.label)+'</b>'+(a.in_total?'':' <span style="color:#6B7280">('+fsT("nur Information")+')</span>')+'</td>'
      + '<td style="width:34%">'+(a.pct==null?'–':'<b>'+a.pct+' %</b><div class="bar"><i style="width:'+a.pct+'%;background:'+st[0]+'"></i></div>')+'</td>'
      + '<td><span class="chip" style="color:'+st[0]+';background:'+st[1]+'">'+fsT(a.status)+'</span></td><td style="color:#6B7280">'+fsEsc(a.detail||"")+'</td></tr>'; }).join("");
  const crit = c.critical.length
    ? '<table class="t"><thead><tr><th>'+fsT("Bereich")+'</th><th>'+fsT("Punkt")+'</th><th>'+fsT("Hinweis")+'</th></tr></thead><tbody>'
      + c.critical.map(x=>'<tr><td>'+fsT(ZM_AREAS[x.area]||x.area)+'</td><td><b>'+fsEsc(x.text)+'</b></td><td class="bad">'+fsEsc(zmCritDetail(x))+'</td></tr>').join("")+'</tbody></table>'
      + (c.critical_count > c.critical.length ? '<p>'+fsEsc(tf("… und {0} weitere.", c.critical_count - c.critical.length))+'</p>' : '')
    : '<p style="color:#2F6B4E;font-weight:700">'+fsT("Keine offenen kritischen Punkte.")+'</p>';
  const opening = c.hotel.opening_date ? zmIso(c.hotel.opening_date)+(c.days_to_opening!=null?' ('+fsEsc(tf("in {0} Tagen", c.days_to_opening))+')':'') : '–';
  return FS_TABLE+css+'<div class="fs land" style="--fs-accent:'+fsEsc(accent)+'">'+fsHead(hotel, translateString(c.title), [c.hotel.city, zmIso(c.date)].filter(Boolean).join(" · "))
    + '<div class="seal"><div class="p">'+c.overall+' %</div><div><div class="t">'+fsT(c.title)+'</div><div>'+fsEsc(good ? tf("Alle Kriterien für die Eröffnungsbereitschaft sind erfüllt.") : tf("Die Kriterien für „Eröffnungsbereit“ sind noch nicht erfüllt. Dieses Dokument zeigt den ehrlichen Stand."))+'</div></div></div>'
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Datum")+'</div><div class="v">'+fsEsc(zmIso(c.date))+'</div></div><div class="f"><div class="l">'+fsT("Eröffnung")+'</div><div class="v">'+fsEsc(opening)+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Bereitschafts-Score (Zeitplan)")+'</div><div class="v">'+fsEsc(c.readiness_score)+' %</div></div><div class="f"><div class="l">'+fsT("Offene kritische Punkte")+'</div><div class="v">'+c.critical_count+'</div></div></div>'
    + '<div class="zc"><div><table class="t"><thead><tr><th>'+fsT("Bereich")+'</th><th>'+fsT("Stand")+'</th><th>'+fsT("Status")+'</th><th></th></tr></thead><tbody>'+areas+'</tbody></table></div>'
    + '<div><div class="box" style="margin-bottom:8px"><h3>'+fsT("Kriterien für „Eröffnungsbereit“")+'</h3>'+c.criteria.map(k=>'<div class="cr"><b style="color:'+(k.ok?"#2F6B4E":"#A23B32")+'">'+(k.ok?"✓":"✗")+'</b><span>'+fsEsc(zmCriterion(k))+'</span></div>').join("")
    + '<div style="font-size:10px;color:#6B7280;margin-top:4px">'+fsT("Gesamtstand = Mittelwert der Bereiche mit Daten (ohne Zeitplan). Kritisch sind: offene Aufgaben mit Priorität Kritisch, gefährdete kritische Meilensteine, Risiken ab 16 Punkten, nicht erteilte oder abgelaufene Genehmigungen, nicht bestandene Zimmer-Abnahmen und dringende Baumängel.")+'</div></div>'
    + '<div class="box"><h3>'+fsT("Prüfcode")+'</h3><div class="code">'+fsEsc(c.code)+'</div><div style="font-size:10px;color:#6B7280;margin-top:4px">'+fsT("Echtheit prüfen")+': '+fsEsc(c.verify_url)+'</div></div></div></div>'
    + '<h2 style="font-family:Georgia,serif;font-size:15px;margin:12px 0 4px">'+fsT("Offene kritische Punkte")+'</h2>'+crit
    + '<p style="font-size:10px;color:#6B7280">'+fsT("Grundlage sind die Angaben im Projekt in Ouverture zum Zeitpunkt der Erstellung. Es handelt sich nicht um eine Prüfung durch Dritte oder Behörden.")+'</p>'
    + '<div class="sig"><div>'+fsT("Gesamtleitung")+' – '+fsT("Datum und Unterschrift")+'</div><div>'+fsT("Eigentümer")+' – '+fsT("Datum und Unterschrift")+'</div></div>'
    + fsFoot()+'</div>';
}
function ReadinessCertificateCard({hotel, api, role}){
  const [c,setC] = useState(null); const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  const allowed = role==="admin" || (role==="manager" && !((ACCESS && ACCESS.depts) || []).length);
  if(!allowed) return null;
  const make = async () => { setBusy(true); setMsg(null);
    try { const d = await api("/api/hotels/"+hotel.id+"/readiness-certificate","POST",{}); setC(d);
      await sheetPdf(zmCertificateHtml(hotel, d), safeFile(translateString(d.title)+" "+hotel.name+" "+d.date)+".pdf", false, "landscape");
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <b>{tf("Zertifikat für Eigentümer und Bank")}</b>
          <div style={{fontSize:13,color:INK_MUTED}}>{tf("PDF mit Gesamtstand, Bereichen, offenen kritischen Punkten und Prüfcode. „Eröffnungsbereit“ steht nur da, wenn mindestens 95 % erreicht sind, kein Bereich unter 80 % liegt und nichts Kritisches offen ist.")}</div>
        </div>
        <button style={zmBtn} disabled={busy} onClick={make}>{busy?"…":<React.Fragment><Icon n="filetext" /> {tf("Zertifikat erstellen")}</React.Fragment>}</button>
      </div>
      {c && <div style={{marginTop:8,fontSize:13}} role="status">
        <b style={{color:c.ready?GOOD_TEXT:WARN_TEXT}}>{translateString(c.title)} · {c.overall} %</b>
        {c.critical_count>0 && <span style={{color:BAD}}> · {tf("{0} offene kritische Punkte", c.critical_count)}</span>}
        {c.secret_fallback && <div style={{color:WARN_TEXT,fontSize:12,marginTop:4}}>{tf("Hinweis für den Betreiber: CERT_SECRET ist nicht gesetzt.")}</div>}
      </div>}
      <ErrorText>{msg && !msg.ok ? msg.text : null}</ErrorText>
    </Card>
  );
}

// ------------------------------------------------------------ 2a. Notfallmappe als PDF (auch ohne Verbindung aus dem Zwischenspeicher)
const zmFolderKey = (hotel) => "/emergency-folder/"+hotel.id;
async function zmLoadFolder(api, hotel){
  try { const d = await api("/api/hotels/"+hotel.id+"/emergency-folder"); cachePut(zmFolderKey(hotel), d); return {d, cached:false}; }
  catch(e){
    const c = cacheGet(zmFolderKey(hotel)); if(c) return {d:c, cached:true};
    const rooms = cacheGet("/api/hotels/"+hotel.id+"/rooms"); // Zimmerliste aus dem normalen Zwischenspeicher
    if(e.offline && Array.isArray(rooms)) return {cached:true, d:{hotel:{id:hotel.id,name:hotel.name}, today:todayIso(), tomorrow:addDaysIso(todayIso(),1), generated_at:null,
      arrivals:[], rooms, shifts:[], contacts:[], public_numbers:[{label:"Euro-Notruf",number:"112"}], reception_phone:null, missing:["arrivals","shifts"]}};
    throw e;
  }
}
function zmFolderHtml(hotel, d, cached){
  const sec = (t) => '<h2 style="font-family:Georgia,serif;font-size:14px;margin:12px 0 4px;border-bottom:1px solid #E4DFD3">'+fsEsc(t)+'</h2>';
  const tbl = (head, rows, empty) => rows.length ? '<table class="t"><thead><tr>'+head.map(h=>'<th>'+fsT(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table>' : '<p style="color:#6B7280">'+fsT(empty)+'</p>';
  const arr = (day) => d.arrivals.filter(a=>a.arrival_date===day).map(a=>'<tr><td><b>'+fsEsc(a.guest_name)+(a.vip?' ★':'')+'</b></td><td>'+fsEsc(a.room||"–")+'</td><td>'+fsEsc(a.room_type||"")+'</td><td>'+fsEsc([a.adults, a.children?"+"+a.children:null].filter(x=>x!=null).join(" "))+'</td><td>'+fsEsc(a.eta||"")+'</td><td>'+fsEsc(a.departure_date?zmIso(a.departure_date):"")+'</td></tr>');
  const occ = d.rooms.filter(r=>r.occupancy==="Belegt"||r.occupancy==="Abreise").length;
  const warn = cached ? '<div class="box" style="border-color:#B9822E;margin-bottom:8px">'+fsEsc(tf("Ohne Verbindung erstellt – Stand vom {0}.", d.generated_at?fmtDateTime(d.generated_at):tf("unbekannt")))+'</div>' : '';
  const missing = (d.missing||[]).length ? '<div class="box" style="border-color:#A23B32;margin-bottom:8px">'+fsT("Nicht alle Daten konnten gelesen werden.")+'</div>' : '';
  const phones = d.public_numbers.map(n=>'<tr><td>'+fsT(n.label)+'</td><td><b>'+fsEsc(n.number)+'</b></td><td></td></tr>').concat(d.reception_phone?['<tr><td>'+fsT("Rezeption")+'</td><td><b>'+fsEsc(d.reception_phone)+'</b></td><td></td></tr>']:[])
    .concat(d.contacts.map(c=>'<tr><td><b>'+fsEsc(c.name)+'</b></td><td><b>'+fsEsc(c.phone)+'</b></td><td>'+fsEsc(c.role)+'</td></tr>'));
  return FS_TABLE+'<div class="fs" style="--fs-accent:#A23B32">'+fsHead(hotel, translateString("Notfallmappe"), zmIso(d.today))
    + '<div class="box" style="border-color:#A23B32;background:#F5E1DE;margin-bottom:8px"><b>'+fsT("Vertraulich.")+'</b> '+fsT("Enthält Namen von Gästen und Mitarbeitenden. Nur für den Notfall verwenden und danach vernichten.")+'</div>'+warn+missing
    + sec(tf("Notrufnummern und Notfallkontakte"))+tbl(["Stelle","Telefon","Funktion"], phones, "Keine Nummern hinterlegt.")
    + sec(tf("Anreisen heute")+" ("+zmIso(d.today)+")")+tbl(["Gast","Zimmer","Kategorie","Personen","Ankunft","Abreise"], arr(d.today), "Keine Anreisen.")
    + sec(tf("Anreisen morgen")+" ("+zmIso(d.tomorrow)+")")+tbl(["Gast","Zimmer","Kategorie","Personen","Ankunft","Abreise"], arr(d.tomorrow), "Keine Anreisen.")
    + sec(tf("Dienstplan heute"))+tbl(["Abteilung","Name","Schicht","Qualifikation"], d.shifts.map(x=>'<tr><td>'+fsT(x.department)+'</td><td><b>'+fsEsc(x.name)+'</b></td><td>'+fsT(x.kind)+' '+fsEsc(x.from+"–"+x.to)+'</td><td>'+[x.first_aid?fsT("Ersthelfer"):"", x.fire?fsT("Brandschutz"):""].filter(Boolean).join(", ")+'</td></tr>'), "Heute sind keine Schichten geplant.")
    + sec(tf("Zimmerstatus")+" · "+tf("Belegt")+": "+occ+" / "+d.rooms.length)+tbl(["Zimmer","Etage","Status","Belegung"], d.rooms.map(r=>'<tr><td><b>'+fsEsc(r.number)+'</b></td><td>'+fsEsc(r.floor||"")+'</td><td>'+fsT(r.status)+'</td><td>'+fsT(r.occupancy)+'</td></tr>'), "Keine Zimmer angelegt.")
    + fsFoot()+'</div>';
}
function EmergencyFolderButton({hotel, api, me}){
  const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  // Im Hintergrund aktuell halten, damit die Mappe bei einem Ausfall aus dem Zwischenspeicher kommt (höchstens alle 30 Minuten)
  useEffect(()=>{
    if(navigator.onLine===false) return;
    const c = cacheGet(zmFolderKey(hotel));
    if(c && c.generated_at && Date.now()-new Date(c.generated_at).getTime() < 1800000) return;
    api("/api/hotels/"+hotel.id+"/emergency-folder").then(d=>cachePut(zmFolderKey(hotel), d)).catch(()=>{});
  },[hotel.id]);
  const run = async () => { setBusy(true); setMsg(null);
    try {
      const {d, cached} = await zmLoadFolder(api, hotel);
      const html = zmFolderHtml(hotel, d, cached), name = safeFile(translateString("Notfallmappe")+" "+hotel.name+" "+d.today)+".pdf";
      // Ohne Netz lädt die PDF-Bibliothek evtl. nicht – dann über den Druckdialog des Browsers
      try { await sheetPdf(html, name); } catch(e){ printSheet(html, name); }
      if(cached) setMsg({ok:false,text:tf("Ohne Verbindung: Die Mappe zeigt den zuletzt gespeicherten Stand.")});
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  return (
    <span style={{display:"inline-flex",flexDirection:"column",gap:4}}>
      <button style={{...zmBtn,borderColor:BAD,color:BAD,fontWeight:700}} disabled={busy} onClick={run}>{busy?"…":<React.Fragment><Icon n="printer" /> {tf("Notfallmappe als PDF")}</React.Fragment>}</button>
      {msg && <span role={msg.ok?"status":"alert"} style={{fontSize:12.5,color:msg.ok?GOOD_TEXT:WARN_TEXT}}>{msg.text}</span>}
    </span>
  );
}

// Notfallkontakte pflegen (Admin, Gesamtleitung, Leitung Sicherheit) – für Notfall-Bereich
function EmergencyContactsCard({hotel, api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/team-settings").then(d=>setList(((d.safety_settings||{}).emergency_contacts)||[])).catch(()=>setList([])); },[hotel.id]);
  if(list===null) return null;
  const set = (i, k, v) => setList(list.map((c,j)=>j===i?{...c,[k]:v}:c));
  const save = async () => { setBusy(true); setMsg(null);
    try { const r = await api("/api/hotels/"+hotel.id+"/emergency-contacts","PUT",{contacts:list}); setList(r.contacts); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  return (
    <Card style={{marginBottom:14}}>
      <b>{tf("Notfallkontakte")}</b>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Erscheinen in der Notfallmappe und der täglichen Notfall-Mail, z. B. Haustechnik-Notdienst, Aufzugsfirma, Gesamtleitung.")}</div>
      {list.map((c,i)=><div key={i} style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
        <input className="input" style={{flex:"1 1 140px"}} aria-label={tf("Name")} placeholder={tf("Name")} maxLength={60} value={c.name||""} onChange={e=>set(i,"name",e.target.value)} />
        <input className="input" style={{flex:"1 1 140px"}} aria-label={tf("Funktion")} placeholder={tf("Funktion")} maxLength={60} value={c.role||""} onChange={e=>set(i,"role",e.target.value)} />
        <input className="input" style={{flex:"1 1 120px"}} type="tel" aria-label={tf("Telefon")} placeholder="+43 …" maxLength={30} value={c.phone||""} onChange={e=>set(i,"phone",e.target.value)} />
        <button style={zmBtn} aria-label={tf("Entfernen")} onClick={()=>setList(list.filter((_,j)=>j!==i))}>✕</button>
      </div>)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {list.length<15 && <button style={zmBtn} onClick={()=>setList([...list,{name:"",role:"",phone:""}])}>+ {tf("Kontakt")}</button>}
        <button style={{...zmBtn,background:INK,color:"#fff"}} disabled={busy} onClick={save}>{busy?"…":tf("Speichern")}</button>
      </div>
      {zmMsg(msg)}
    </Card>
  );
}

// ------------------------------------------------------------ 2b. Einstellung: tägliche Notfall-Mail
function EmergencyMailSettings({hotel, api, me}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/emergency-mail").then(setD).catch(e=>setMsg({ok:false,text:e.message})); },[hotel.id]);
  const toggle = async (on) => { setBusy(true); setMsg(null);
    try { setD(await api("/api/hotels/"+hotel.id+"/emergency-mail","PUT",{enabled:on})); setMsg({ok:true,text:on?tf("Eingeschaltet."):tf("Ausgeschaltet.")}); } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  if(!d) return msg ? <ErrorText>{msg.text}</ErrorText> : null;
  return (
    <Card style={{marginBottom:14}}>
      <b>{tf("Tägliche Notfall-Mail")}</b>
      <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Jeden Morgen zwischen 5 und 8 Uhr: Anreisen heute und morgen, Zimmerstatus, Dienstplan heute und Notfallnummern als einfache Mail – lesbar auch ohne Internet, wenn App oder PMS ausfallen. Enthält Gästenamen, aber keine Kontaktdaten der Gäste.")}</div>
      {!d.available ? <div style={{fontSize:13,color:WARN_TEXT}}>{tf("Diese Einstellung ist nach dem nächsten Datenbank-Update verfügbar.")}</div>
        : !d.eligible ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Die Notfall-Mail gibt es nur für Admin, Gesamtleitung und Leitung Rezeption.")}</div>
        : <label style={{display:"flex",gap:10,alignItems:"center",minHeight:44,cursor:"pointer"}}>
            <input type="checkbox" checked={!!d.enabled} disabled={busy} onChange={e=>toggle(e.target.checked)} style={{width:22,height:22}} />
            <span>{tf("Notfall-Mail für {0} an {1} senden", hotel.name, (me && me.email) || tf("meine Adresse"))}</span>
          </label>}
      {zmMsg(msg)}
    </Card>
  );
}
