// ------------------------------------------------------------ Rezeption heute (Tablet-Ansicht)
// Ein Bildschirm für den Empfang: Anreisen, Abreisen, Zimmerstatus, offene Meldungen und Veranstaltungen von heute.
// Aktualisiert sich jede Minute selbst; nur lesen – Änderungen in den jeweiligen Bereichen.
function FrontDeskView({hotel, api, onOpen}){
  const [d,setD] = useState(null); const [error,setError] = useState("");
  const [stamp,setStamp] = useState(null);
  const today = todayIso();
  const load = useCallback(async()=>{
    const base = "/api/hotels/"+hotel.id;
    try {
      const [arrivals, rooms, tickets, events] = await Promise.all([
        api(base+"/arrivals?from="+today).catch(()=>[]), api(base+"/rooms").catch(()=>[]),
        api(base+"/tickets?status=open").catch(()=>[]), api(base+"/events").catch(()=>[]),
      ]);
      setD({arrivals:(arrivals||[]).filter(a=>a.arrival_date===today), departures:(arrivals||[]).filter(a=>a.departure_date===today),
        rooms:rooms||[], tickets:tickets||[], events:(events||[]).filter(e=>e.event_date===today && e.status!=="Storniert")});
      setStamp(new Date()); setError("");
    } catch(e){ setError(e.message); }
  },[api, hotel.id, today]);
  useEffect(()=>{ load(); const t = setInterval(load, 60000); return ()=>clearInterval(t); },[load]);
  if(error && !d) return <div style={{color:BAD}}>{error}</div>;
  if(!d) return <div style={{color:INK_MUTED}}>…</div>;
  const ready = d.rooms.filter(r=>r.status==="Kontrolliert" || r.status==="Sauber");
  const dirty = d.rooms.filter(r=>r.status==="Schmutzig" || r.status==="In Reinigung");
  const arrivingRooms = d.rooms.filter(r=>r.occupancy==="Anreise");
  const notReady = arrivingRooms.filter(r=>!(r.status==="Kontrolliert" || r.status==="Sauber"));
  const urgent = d.tickets.filter(t=>t.priority==="Dringend");
  const tile = (label, value, tone, key) => (
    <div {...pressable(()=>onOpen(key))} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"16px 18px",cursor:"pointer"}}>
      <div style={{fontSize:13,color:INK_MUTED,fontWeight:600}}>{label}</div>
      <div style={{fontFamily:"Fraunces, serif",fontSize:40,fontWeight:600,color:tone||INK,lineHeight:1.15}} data-no-i18n="">{value}</div>
    </div>
  );
  const list = (title, items, render, empty) => (
    <Card style={{marginBottom:0}}>
      <h2 className="ui-h" style={{fontWeight:700,marginBottom:8}}>{title} <span style={{color:INK_MUTED,fontWeight:400}} data-no-i18n="">({items.length})</span></h2>
      {items.length===0 ? <div style={{fontSize:13.5,color:INK_MUTED}}>{empty}</div> :
        <div style={{maxHeight:320,overflowY:"auto"}}>{items.map(render)}</div>}
    </Card>
  );
  const row = (key, a, b, c) => <div key={key} style={{display:"flex",gap:10,alignItems:"baseline",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:14.5}}>
    <div style={{flex:1,fontWeight:600}} data-no-i18n="">{a}</div><div style={{color:INK_MUTED,fontSize:13}}>{b}</div>{c}</div>;
  return (
    <div>
      <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap",marginBottom:14}}>
        <div style={{fontFamily:"Fraunces, serif",fontSize:24,fontWeight:600,flex:1}}>{tf("Rezeption heute")} · <span data-no-i18n="">{fmtDate(today)}</span></div>
        <div style={{fontSize:12.5,color:INK_MUTED}}>{stamp ? tf("Stand {0} – aktualisiert sich jede Minute", stamp.toLocaleTimeString(UI_LOCALE,{hour:"2-digit",minute:"2-digit"})) : ""}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12,marginBottom:14}}>
        {tile(tf("Anreisen"), d.arrivals.length || arrivingRooms.length, null, "arrivals")}
        {tile(tf("Abreisen"), d.departures.length || d.rooms.filter(r=>r.occupancy==="Abreise").length, null, "rooms")}
        {tile(tf("Zimmer bezugsfertig"), ready.length+" / "+d.rooms.length, GOOD, "rooms")}
        {tile(tf("Anreisezimmer noch nicht fertig"), notReady.length, notReady.length ? WARN_TEXT : GOOD, "rooms")}
        {tile(tf("Offene Meldungen"), d.tickets.length, urgent.length ? BAD : INK, "tickets")}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:14}}>
        {d.arrivals.length>0 || !arrivingRooms.length
          ? list(tf("Anreisen heute"), d.arrivals, a=>row(a.id, a.guest_name, [a.room_type, a.eta && tf("Ankunft {0}", a.eta)].filter(Boolean).join(" · "),
              (a.extras||[]).length || a.guest_note ? <Pill color={BRASS_TEXT} bg={BRASS_SOFT}>{tf("Wünsche")}</Pill> : null), tf("Keine Anreisen erfasst."))
          : list(tf("Anreisen heute"), arrivingRooms, r=>row(r.id, roomLocation(r.number), [r.room_type, translateString(r.status)].filter(Boolean).join(" · ")), "")}
        {list(tf("Anreisezimmer noch nicht fertig"), notReady, r=>row(r.id, roomLocation(r.number), translateString(r.status)), tf("Alle Anreisezimmer sind fertig."))}
        {list(tf("Dringende Meldungen"), urgent, t=>row(t.id, t.title, [t.location, translateString(t.department||"")].filter(Boolean).join(" · ")), tf("Keine dringenden Meldungen."))}
        {d.events.length>0 && list(tf("Veranstaltungen heute"), d.events, e=>row(e.id, e.title, [e.start_time && String(e.start_time).slice(0,5), e.location, e.guests && tf("{0} Personen", e.guests)].filter(Boolean).join(" · ")), "")}
      </div>
      {dirty.length>0 && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:12}}>{tf("{0} Zimmer werden gerade gereinigt oder sind noch schmutzig.", dirty.length)}</div>}
    </div>
  );
}
