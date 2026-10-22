// ============================================================ 24/7 KI-Service: Hilfe zur Bedienung, rund um die Uhr
// Knopf unten rechts (ersetzt den Feedback-Knopf). Die KI erklärt, wo und wie etwas geht, und springt in den
// passenden Bereich. Kann sie nicht helfen, geht die Frage samt Verlauf über „Problem melden“ an das Support-Team.
const SERVICE_STARTERS = {
  roster: ["Wie veröffentliche ich den Dienstplan?", "Was bedeutet die Warnung zur Ruhezeit?"],
  time: ["Wie korrigiere ich eine vergessene Buchung?", "Wie mache ich den Lohnexport?"],
  rooms: ["Wie verteile ich die Zimmer auf das Team?", "Wie verbinde ich mein PMS?"],
  team: ["Wie lade ich jemanden ins Team ein?", "Welche Rolle braucht eine Abteilungsleitung?"],
  tasks: ["Wie wende ich die Eröffnungs-Vorlage an?", "Wie verschiebe ich alle Termine mit dem Eröffnungsdatum?"],
};
const SERVICE_DEFAULT_STARTERS = ["Was kann ich in diesem Bereich tun?", "Wie lade ich jemanden ins Team ein?", "Wie richte ich die Zwei-Faktor-Anmeldung ein?"];

function ServiceButton({api, orgId, hotel, tab, nav, onOpen}){
  const [open,setOpen] = useState(false); const [mode,setMode] = useState("chat");
  const [enabled,setEnabled] = useState(null);
  const [msgs,setMsgs] = useState([]); const [text,setText] = useState(""); const [busy,setBusy] = useState(false); const [err,setErr] = useState("");
  const listRef = React.useRef(null); const inputRef = React.useRef(null);
  useEffect(()=>{ if(open && enabled===null) api("/api/assistant").then(r=>setEnabled(!!r.enabled)).catch(()=>setEnabled(false)); },[open]);
  useEffect(()=>{ if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; },[msgs, busy]);
  useEffect(()=>{ if(open && mode==="chat" && inputRef.current) inputRef.current.focus(); },[open, mode]);
  useEffect(()=>{ if(!open) return; const k = (e) => { if(e.key==="Escape") setOpen(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); },[open]);
  const navLabel = (k) => ((nav||[]).find(n=>n.key===k)||{}).label;
  const ask = async (q) => {
    const question = (q||text).trim(); if(!question || busy) return;
    const next = [...msgs, {role:"user", content:question}];
    setMsgs(next); setText(""); setErr(""); setBusy(true);
    try {
      const r = await api("/api/assistant","POST",{messages: next.map(m=>({role:m.role, content:m.content})), organization_id: orgId, hotel_id: hotel && hotel.id,
        tab, lang: UI_LANG, nav: (nav||[]).map(n=>[n.key, n.label])});
      setMsgs([...next, {role:"assistant", content:r.antwort, bereich:r.bereich, weiterleiten:r.weiterleiten}]);
    } catch(e){ setErr(e.message); }
    setBusy(false);
  };
  // Verlauf als Text für die Support-Meldung
  const transcript = () => [tf("Frage an den KI-Service (Bereich: {0})", tab||"–"), ...msgs.map(m=>(m.role==="user" ? "» " : "KI: ")+m.content)].join("\n\n");
  const starters = SERVICE_STARTERS[tab] || SERVICE_DEFAULT_STARTERS;
  return (
    <div className="feedback-ui no-print">
      {!open && <button className="feedback-fab" aria-haspopup="dialog" onClick={()=>{ setOpen(true); setMode("chat"); }}><Icon n="sparkle" /> {tf("Hilfe 24/7")}</button>}
      {open && <div className="service-panel" role="dialog" aria-label={tf("KI-Service")} style={{background:CARD,border:`1px solid ${BORDER}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",borderBottom:`1px solid ${BORDER}`}}>
          <Icon n="sparkle" size={18} style={{color:BRASS}} />
          <div style={{flex:1}}><b>{mode==="chat" ? tf("KI-Service") : tf("Problem melden")}</b><div style={{fontSize:11.5,color:INK_MUTED}}>{mode==="chat" ? tf("Antwortet rund um die Uhr auf Fragen zur Bedienung") : tf("Geht direkt an das Support-Team")}</div></div>
          {mode==="chat" && msgs.length>0 && <button style={linkBtn} onClick={()=>{ setMsgs([]); setErr(""); }}>{tf("Neu")}</button>}
          <button style={linkBtn} aria-label={tf("Schließen")} onClick={()=>setOpen(false)}>✕</button>
        </div>
        {mode==="feedback" ? <div style={{padding:14,overflowY:"auto"}}>
            <FeedbackButton api={api} orgId={orgId} tab={tab} embedded initialText={msgs.length ? transcript() : ""} onClose={()=>setMode("chat")} />
          </div>
        : <React.Fragment>
          <div ref={listRef} aria-live="polite" style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
            {enabled===false && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Der KI-Service ist gerade nicht verfügbar. Unter „Hilfe“ findest du Anleitungen – oder melde dein Anliegen direkt.")}</div>}
            {enabled!==false && msgs.length===0 && <div>
              <div style={{fontSize:13.5,marginBottom:10}}>{tf("Hallo! Frag mich alles zur Bedienung von Ouverture – zum Beispiel:")}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>{starters.map(s=><button key={s} onClick={()=>ask(tf(s))} style={{...btnLine,textAlign:"start",fontSize:13,padding:"8px 12px"}}>{tf(s)}</button>)}</div>
              <div style={{fontSize:11.5,color:INK_MUTED,marginTop:12}}>{tf("Die KI sieht keine Daten deines Hotels und kann sich irren. Bei Fehlern oder Fragen zum Abo hilft das Support-Team.")}</div>
            </div>}
            {msgs.map((m,i)=>(
              <div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"88%"}}>
                <div data-no-i18n="" style={{background:m.role==="user"?INK:PAPER,color:m.role==="user"?"#fff":INK,borderRadius:12,padding:"8px 12px",fontSize:13.5,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.content}</div>
                {m.role==="assistant" && (m.bereich || m.weiterleiten) && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                  {m.bereich && navLabel(m.bereich) && <button style={{...btnLine,fontSize:12.5,padding:"5px 10px"}} onClick={()=>onOpen(m.bereich)}>{tf("Öffnen")}: {tf(navLabel(m.bereich))} →</button>}
                  {m.weiterleiten && <button style={{...btnLine,fontSize:12.5,padding:"5px 10px"}} onClick={()=>setMode("feedback")}>{tf("An das Support-Team senden")}</button>}
                </div>}
              </div>))}
            {busy && <div style={{alignSelf:"flex-start",fontSize:13,color:INK_MUTED}}>{tf("Denkt nach…")}</div>}
            {err && <div style={{fontSize:13,color:BAD}}>{err}</div>}
          </div>
          <div style={{borderTop:`1px solid ${BORDER}`,padding:10}}>
            <form onSubmit={e=>{ e.preventDefault(); ask(); }} style={{display:"flex",gap:8}}>
              <input ref={inputRef} className="input" style={{flex:1}} value={text} maxLength={2000} disabled={enabled===false} placeholder={tf("Frage eingeben …")} aria-label={tf("Frage an den KI-Service")} onChange={e=>setText(e.target.value)} />
              <button className="btn-primary" type="submit" disabled={busy || !text.trim() || enabled===false}>{tf("Senden")}</button>
            </form>
            <button style={{...linkBtn,marginTop:6,paddingInlineStart:0}} onClick={()=>setMode("feedback")}><Icon n="chat" /> {tf("Problem melden")}</button>
          </div>
        </React.Fragment>}
      </div>}
    </div>
  );
}
