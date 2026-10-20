// ------------------------------------------------------------ Gäste-Chat (Rezeption)
function GuestChatView({hotel, api}){
  const [threads,setThreads] = useState(null); const [cur,setCur] = useState(null); const [text,setText] = useState(""); const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id+"/guest-chats";
  const load = useCallback(()=>api(base).then(setThreads).catch(e=>{ setMsg({ok:false,text:e.message}); setThreads([]); }),[api, base]);
  useEffect(()=>{ load(); const t = setInterval(()=>{ if(!document.hidden) load(); }, 15000); return ()=>clearInterval(t); },[load]);
  const th = (threads||[]).find(t=>t.thread===cur);
  useEffect(()=>{ if(th && th.unread) api(base+"/"+th.thread,"POST",{}).then(load).catch(()=>{}); },[cur]);
  const { tr } = useTranslated(api, th ? th.messages.filter(m=>m.sender==="guest").map(m=>m.body) : []);
  const send = async () => { const b = text.trim(); if(!b) return; setText(""); try { await api(base+"/"+cur,"POST",{body:b}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <div style={{display:"grid",gridTemplateColumns:"minmax(200px, 280px) 1fr",gap:14}} className="stack">
      <Card style={{padding:0,alignSelf:"start"}}>
        {threads===null ? <div style={{padding:14,fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div> : threads.length===0 ? <div style={{padding:14,fontSize:13,color:INK_MUTED}}>{tf("Noch keine Nachrichten. Gäste schreiben über den QR-Code im Zimmer.")}</div> :
          threads.map(t=>(
            <div key={t.thread} {...pressable(()=>setCur(t.thread))} style={{padding:"10px 14px",borderTop:`1px solid ${BORDER}`,cursor:"pointer",background:cur===t.thread?BRASS_SOFT:"transparent"}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><b style={{flex:1}}>{tf("Zimmer {0}", t.room_number||"?")}</b>{t.unread>0 && <Pill color="#fff" bg={BAD}>{t.unread}</Pill>}</div>
              <div style={{fontSize:12.5,color:INK_MUTED,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} data-no-i18n="">{t.messages[t.messages.length-1].body}</div>
              <div style={{fontSize:11,color:INK_MUTED}}>{fmtDateTime(t.last_at)}</div>
            </div>
          ))}
      </Card>
      <Card style={{display:"flex",flexDirection:"column",minHeight:320}}>
        {!th ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Links einen Verlauf wählen.")}</div> : <React.Fragment>
          <div style={{fontWeight:700,marginBottom:8}}>{tf("Zimmer {0}", th.room_number||"?")}</div>
          <div style={{flex:1,overflowY:"auto",maxHeight:420,display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {th.messages.map(m=>{ const t2 = m.sender==="guest" && tr ? tr(m.body) : null; return (
              <div key={m.id} style={{alignSelf:m.sender==="staff"?"flex-end":"flex-start",maxWidth:"80%",background:m.sender==="staff"?INK:PAPER,color:m.sender==="staff"?"#fff":INK,borderRadius:12,padding:"8px 12px",fontSize:14}}>
                <div data-no-i18n="" style={{whiteSpace:"pre-wrap"}}>{t2 && t2!==m.body ? t2 : m.body}</div>
                {t2 && t2!==m.body && <div data-no-i18n="" style={{fontSize:11.5,opacity:0.7,marginTop:3}}>{m.body}</div>}
                <div style={{fontSize:10.5,opacity:0.6,marginTop:3}}>{fmtDateTime(m.created_at)}</div>
              </div>); })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input className="input" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={tf("Antwort an den Gast …")} />
            <button className="btn-primary" onClick={send} disabled={!text.trim()}>{tf("Senden")}</button>
          </div>
          <div style={{fontSize:11.5,color:INK_MUTED,marginTop:6}}>{tf("Der Gast sieht die Antwort auf seiner Zimmer-Seite. Verläufe werden nach 7 Tagen ausgeblendet.")}</div>
        </React.Fragment>}
        {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
      </Card>
    </div>
  );
}

// Startseite für Mitarbeitende: nur das, was sie heute brauchen
function MemberHome({hotel, api, me, orgId, tasks, myDepts, onOpen, members}){
  const sickCard = <SickNoteCard hotel={hotel} api={api} />;
  const [shifts,setShifts] = useState([]);
  const [duties,setDuties] = useState([]);
  const [openLog,setOpenLog] = useState([]);
  const [lists,setLists] = useState([]);
  const today = todayIso();
  useEffect(()=>{
    const base = "/api/hotels/"+hotel.id;
    api("/api/organizations/"+orgId+"/my-shifts").then(setShifts).catch(()=>{});
    api(base+"/duties?from="+today+"&to="+today).then(setDuties).catch(()=>{});
    api(base+"/logbook?open=true").then(setOpenLog).catch(()=>{});
    api(base+"/checklists?date="+today).then(setLists).catch(()=>{});
  },[hotel.id]);
  const myTasks = tasks.filter(t=>t.status!=="Abgeschlossen" && (t.assignee_id===(me&&me.id))).sort((a,b)=>(a.due_date||"9")<(b.due_date||"9")?-1:1);
  const deptSoon = tasks.filter(t=>t.status!=="Abgeschlossen" && t.assignee_id!==(me&&me.id) && myDepts.includes(t.department) && t.due_date && t.due_date<=addDaysIso(today,14)).sort((a,b)=>a.due_date<b.due_date?-1:1);
  const myDuty = duties.filter(d=>me && d.user_id===me.id);
  const todayShift = shifts.filter(s=>s.shift_date===today && s.hotel_id===hotel.id);
  const nextShifts = shifts.filter(s=>s.shift_date>today).slice(0,6);
  const listsMine = lists.filter(l=>myDepts.includes(l.department));
  const TaskLine = ({t}) => (
    <div style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
      <span style={{flex:1}}>{t.title} <span style={{color:INK_MUTED,fontSize:12}}>· <span>{t.department}</span></span></span>
      <Pill {...priorityColor(t.priority)}>{t.priority}</Pill>
      <span style={{fontSize:12,color:t.due_date && t.due_date<today ? BAD : INK_MUTED,width:90,textAlign:"end"}}>{fmtDate(t.due_date)}</span>
    </div>
  );
  return (
    <div>
      <PushPrompt api={api} />
      <ClockCard hotel={hotel} api={api} role="member" myDepts={myDepts} compact />
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <button style={smallBtn} onClick={()=>onOpen("tickets")}>🔧 {tf("Mangel melden")}</button>
        <SickButton hotel={hotel} api={api} />
        {myDepts.some(d=>d==="Housekeeping" || d==="Rezeption & Empfang") && <button style={smallBtn} onClick={()=>onOpen("rooms")}>🛏 {tf("Zimmerstatus")}</button>}
      </div>
      <OnboardingCard orgId={orgId} api={api} me={me} myDepts={myDepts} members={members} />
      <OpenShiftsCard hotel={hotel} api={api} me={me} role="member" myDepts={myDepts} compact />
      <BriefingCard hotel={hotel} api={api} me={me} role="member" myDepts={myDepts} />
      <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:14,marginBottom:14}}>
        <Card>
          <div style={{fontWeight:700,marginBottom:8}}>{tf("Heute")}</div>
          {todayShift.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Heute hast du keine Schicht.")}</div> : todayShift.map(s=><ShiftChip key={s.id} s={s} />)}
          {myDuty.map(d=><div key={d.id} style={{marginTop:8,fontSize:14}}><span style={{color:INK_MUTED,fontSize:12}}>{tf("Deine Aufgabe heute:")}</span><div data-no-i18n="" style={{whiteSpace:"pre-wrap",fontWeight:600}}>{d.task}</div></div>)}
        </Card>
        <Card>
          <div style={{fontWeight:700,marginBottom:8}}>{tf("Nächste Schichten")}</div>
          {nextShifts.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch nichts veröffentlicht.")}</div> : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))",gap:6}}>
              {nextShifts.map(s=><div key={s.id}><div style={{fontSize:11.5,color:INK_MUTED}} data-no-i18n="">{fmtDay(s.shift_date)}</div><ShiftChip s={s} /></div>)}
            </div>
          )}
          <button style={{...linkBtn,marginTop:6}} onClick={()=>onOpen("roster")}>{tf("Zum Dienstplan →")}</button>
        </Card>
        <Card>
          <div style={{fontWeight:700,marginBottom:8}}>{tf("Checklisten heute")}</div>
          {listsMine.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Checklisten.")}</div> : listsMine.map(l=>{
            const n = (l.items||[]).length, d = (l.items||[]).filter(i=>l.run && l.run.checked && l.run.checked[i.id]).length;
            return <div key={l.id} {...pressable(()=>onOpen("checklists"))} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,cursor:"pointer"}}>
              <span data-no-i18n="">{l.title}</span><b style={{color:d===n&&n?GOOD:INK_MUTED}} data-no-i18n="">{d}/{n}</b></div>;
          })}
        </Card>
      </div>
      {openLog.length>0 && (
        <Card style={{marginBottom:14,borderColor:WARN}}>
          <div style={{fontWeight:700,marginBottom:6}}>{tf("Offene Punkte im Übergabebuch")}</div>
          {openLog.slice(0,6).map(e=><div key={e.id} {...pressable(()=>onOpen("logbook"))} style={{padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,cursor:"pointer"}}>
            <span style={{color:INK_MUTED,fontSize:12}} data-no-i18n="">{fmtDay(e.entry_date)} · </span><span data-no-i18n="">{e.body}</span></div>)}
        </Card>
      )}
      <Card style={{marginBottom:14}}>
        <div style={{fontWeight:700,marginBottom:4}}>{tf("Meine Aufgaben")}</div>
        {myTasks.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Dir ist gerade keine offene Aufgabe zugewiesen.")}</div> : myTasks.slice(0,8).map(t=><TaskLine key={t.id} t={t} />)}
      </Card>
      {deptSoon.length>0 && (
        <Card>
          <div style={{fontWeight:700,marginBottom:4}}>{tf("Bald fällig in deiner Abteilung")}</div>
          {deptSoon.slice(0,8).map(t=><TaskLine key={t.id} t={t} />)}
        </Card>
      )}
      {sickCard}
    </div>
  );
}

// Kompakter Knopf (Seitenleiste, Anmeldung) – öffnet die Auswahl für Sprache und Währung
function LanguageSwitcher({dark, withDefault, api, me, onCurrency}){
  const [open,setOpen] = useState(false);
  const langName = (LANGS.find(([c])=>c===UI_LANG)||[null,"Deutsch"])[1];
  const style = dark
    ? {width:"100%",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.85)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:6,padding:"8px 10px",fontSize:12.5,cursor:"pointer",textAlign:"start"}
    : {background:"#fff",color:INK,border:`1px solid ${BORDER}`,borderRadius:6,padding:"7px 12px",fontSize:13,cursor:"pointer"};
  return (
    <React.Fragment>
      <button onClick={()=>setOpen(true)} style={style} aria-label={tf("Sprache und Währung")} title={tf("Sprache und Währung")}>
        <span aria-hidden="true">🌐</span> <span data-no-i18n="">{langName}</span>
        {api && <span data-no-i18n="" style={{opacity:0.7}}> · {DISPLAY_CURRENCY || HOTEL_CURRENCY}</span>}
      </button>
      {open && <LocaleDialog onClose={()=>setOpen(false)} withDefault={withDefault} api={api} me={me} onCurrency={onCurrency} />}
    </React.Fragment>
  );
}

// Fenster: Sprache als Kacheln, eigene Zeile für die Anzeigewährung
function LocaleDialog({onClose, withDefault, api, me, onCurrency}){
  const dialogRef = useDialog(onClose);
  const chosen = chosenUiLanguage();
  const [busy,setBusy] = useState(false);
  const [cur,setCur] = useState(DISPLAY_CURRENCY || "");
  const saveSettings = async (body) => { if(!api) return; try { await api("/api/me/settings", "PUT", body); } catch(e){} };
  const pickLang = async (lang) => {
    setBusy(true);
    await saveSettings({language: lang || null});
    chooseUiLanguage(lang || null); // lädt neu – Hotel und Ansicht bleiben erhalten
  };
  const pickCur = async (c) => {
    setCur(c); setDisplayCurrency(c || null);
    await saveSettings({currency: c || null});
    if(onCurrency) onCurrency(c || null);
  };
  const tile = (active) => ({border:`1px solid ${active?INK:BORDER}`,background:active?INK:"#fff",color:active?"#fff":INK,borderRadius:8,padding:"10px 12px",
    cursor:"pointer",textAlign:"start",fontSize:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8});
  return (
    <div className="no-print" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(28,36,48,0.45)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div ref={dialogRef} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={tf("Sprache und Währung")} tabIndex={-1}
        style={{outline:"none",background:"#fff",color:INK,borderRadius:10,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",padding:22,boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
          <div style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,flex:1}}>{tf("Sprache und Währung")}</div>
          <button onClick={onClose} aria-label={tf("Schließen")} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:INK_MUTED}}>✕</button>
        </div>
        <div className="field-label">{tf("Sprache")}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",gap:8,marginBottom:8}} data-no-i18n="">
          {LANGS.map(([c,l])=>(
            <button key={c} disabled={busy} onClick={()=>pickLang(c)} style={tile(UI_LANG===c)} dir="auto">
              <span>{l}</span><span style={{fontSize:11,opacity:0.6}}>{c.toUpperCase()}</span>
            </button>
          ))}
        </div>
        {withDefault && (
          <button disabled={busy} onClick={()=>pickLang(null)} style={{...linkBtn,fontSize:12.5,marginBottom:6,textDecoration:chosen?"underline":"none"}}>
            {tf("Wie die Organisation")}{!chosen ? " ✓" : ""}
          </button>
        )}
        <div style={{fontSize:12,color:INK_MUTED,marginBottom:18}}>{tf("Gilt nur für dich und auf allen deinen Geräten – auch für E-Mails und den KI-Lagebericht.")}</div>

        {api && (
          <React.Fragment>
            <div className="field-label">{tf("Währung für Beträge")}</div>
            <select className="input" value={cur} onChange={e=>pickCur(e.target.value)} data-no-i18n="">
              <option value="">{tf("Wie das Hotel")}{HOTEL_CURRENCY ? " ("+HOTEL_CURRENCY+")" : ""}</option>
              {CURRENCIES.map(([c,l])=><option key={c} value={c}>{l}</option>)}
            </select>
            <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Budgets werden zum Tageskurs umgerechnet angezeigt. Gespeichert wird weiter in der Währung des Hotels.")}</div>
          </React.Fragment>
        )}
        {busy && <div style={{fontSize:13,color:INK_MUTED,marginTop:12}}>{tf("Wird übersetzt…")}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------- Konto ---------------------------------- */
function PasswordCard({config, token}){
  const [pw,setPw] = useState(""); const [pw2,setPw2] = useState("");
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const save = async () => {
    setMsg(null);
    if(pw.length < 8) return setMsg({ok:false, text:"Das neue Passwort muss mindestens 8 Zeichen haben."});
    if(pw !== pw2) return setMsg({ok:false, text:"Die beiden Passwörter stimmen nicht überein."});
    setBusy(true);
    try {
      await supabaseSetNewPassword(config.supabaseUrl, config.supabaseAnonKey, await freshToken(token), pw);
      setPw(""); setPw2(""); setMsg({ok:true, text:"Passwort geändert."});
    } catch(e){ setMsg({ok:false, text:e.message}); }
    setBusy(false);
  };
  return (
    <Card style={{marginBottom:18,maxWidth:520}}>
      <div style={{fontWeight:700,marginBottom:12}}>Passwort ändern</div>
      <Field label="Neues Passwort"><input type="password" className="input" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Neues Passwort wiederholen"><input type="password" className="input" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} autoComplete="new-password" /></Field>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <button className="btn-primary" onClick={save} disabled={busy}>{busy?"Speichert…":"Passwort ändern"}</button>
    </Card>
  );
}

function DeleteAccountCard({api, onDeleted}){
  const [confirm,setConfirm] = useState(""); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const WORD = tf("LÖSCHEN");
  const run = async () => {
    setBusy(true); setError("");
    try { await api("/api/me","DELETE",{confirm:true}); onDeleted(); }
    catch(e){
      // Rechnungen vorhanden (Aufbewahrungspflicht): ausdrücklich bestätigen lassen
      if(e.code==="invoices" && window.confirm(e.message+"\n\n"+tf("Rechnungen sind gesichert – trotzdem endgültig löschen?"))){
        try { await api("/api/me","DELETE",{confirm:true, invoices_ack:true}); onDeleted(); return; } catch(e2){ e = e2; }
      }
      setError(e.message); setBusy(false);
    }
  };
  return (
    <Card style={{marginBottom:18,maxWidth:520,borderColor:BAD_SOFT}}>
      <div style={{fontWeight:700,marginBottom:6,color:BAD}}>Konto löschen</div>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>
        Löscht dein Login und deine Mitgliedschaften. Organisationen, in denen du allein bist, werden mit allen Daten gelöscht (ein laufendes Abo endet sofort).
        In Organisationen mit anderen Mitgliedern bleiben die Daten erhalten. Bist du dort der letzte Admin, gib die Rolle vorher unter „Team“ weiter.
      </div>
      <Field label={"Zur Bestätigung „"+WORD+"“ eingeben"}><input className="input" value={confirm} onChange={e=>setConfirm(e.target.value)} /></Field>
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      <button onClick={run} disabled={busy || confirm.trim().toUpperCase()!==WORD}
        style={{background:confirm.trim().toUpperCase()===WORD?BAD:"#ccc",color:"#fff",border:"none",borderRadius:4,padding:"9px 16px",fontSize:13.5,fontWeight:600,cursor:"pointer"}}>
        {busy ? "Wird gelöscht…" : "Konto endgültig löschen"}
      </button>
    </Card>
  );
}

// Gemeinsam genutztes Gerät (z. B. Rezeptions-PC): nach 15 Minuten ohne Nutzung automatisch abmelden
const SHARED_DEVICE_KEY = "hpoos_shared_device";
const isSharedDevice = () => { try { return window.localStorage.getItem(SHARED_DEVICE_KEY)==="1"; } catch(e){ return false; } };
function SharedDeviceCard(){
  const [on,setOn] = useState(isSharedDevice());
  const toggle = (v) => { try { v ? window.localStorage.setItem(SHARED_DEVICE_KEY,"1") : window.localStorage.removeItem(SHARED_DEVICE_KEY); } catch(e){} setOn(v); window.dispatchEvent(new Event("hpoos-shared-device")); };
  return (
    <Card style={{marginBottom:18,maxWidth:520}}>
      <div style={{fontWeight:700,marginBottom:6}}>{tf("Gemeinsam genutztes Gerät")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Für Rezeptions-PC oder Stationstablet: Ouverture meldet sich auf diesem Gerät nach 15 Minuten ohne Nutzung automatisch ab und löscht zwischengespeicherte Daten.")}</div>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,cursor:"pointer"}}><input type="checkbox" checked={on} onChange={e=>toggle(e.target.checked)} /> {tf("Auf diesem Gerät automatisch abmelden")}</label>
    </Card>
  );
}
// DSGVO: eigene Daten als Datei herunterladen
function DataExportCard({api}){
  const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const run = async () => {
    setBusy(true); setError("");
    try { const data = await api("/api/me/export"); downloadBlob(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}), "ouverture-meine-daten-"+todayIso()+".json"); }
    catch(e){ setError(e.message); }
    setBusy(false);
  };
  return (
    <Card style={{marginBottom:18,maxWidth:520}}>
      <div style={{fontWeight:700,marginBottom:6}}>{tf("Meine Daten herunterladen")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Alle Daten, die Ouverture zu deiner Person gespeichert hat – Schichten, Zeiten, Aufgaben, Einträge und Einstellungen – als Datei (DSGVO Art. 15 und 20).")}</div>
      {error && <div style={{color:BAD,fontSize:13,marginBottom:8}}>{error}</div>}
      <button style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 14px",fontSize:13.5,cursor:"pointer"}} disabled={busy || !!window.OUVERTURE_DEMO} onClick={run}>{busy ? tf("Wird vorbereitet…") : tf("Datei herunterladen")}</button>
    </Card>
  );
}

function AccountView({config, token, me, api, onDeleted}){
  return (
    <div>
      <Card style={{marginBottom:18,maxWidth:520}}>
        <div style={{fontSize:12.5,color:INK_MUTED,fontWeight:600}}>ANGEMELDET ALS</div>
        <div style={{fontSize:15,fontWeight:600,marginTop:4}}>{me ? me.email : "…"}</div>
      </Card>
      <Card style={{marginBottom:18,maxWidth:520}}>
        <div style={{fontWeight:700,marginBottom:6}}>Meine Sprache</div>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>Deine Sprache gilt nur für dich. Ohne Auswahl folgt Ouverture der Standardsprache der Organisation.</div>
        <LanguageSwitcher withDefault api={api} me={me} />
      </Card>
      <ThemeCard />
      <CalendarCard api={api} />
      <Card style={{marginBottom:18,maxWidth:520}}>
        <div style={{fontWeight:700,marginBottom:6}}>{tf("Ouverture als App")}</div>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Symbol auf dem Startbildschirm, Vollbild und schneller Start – ganz ohne App Store. Ideal für Dienstplan und Checklisten.")}</div>
        {isStandalone() ? <div style={{color:GOOD,fontSize:13.5}}>✓ {tf("Ouverture ist als App installiert.")}</div> : <InstallAppButton />}
        {!isStandalone() && !/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.__installPrompt && <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.")}</div>}
      </Card>
      <PushCard api={api} />
      <SharedDeviceCard />
      <PasswordCard config={config} token={token} />
      <DataExportCard api={api} />
      <DeleteAccountCard api={api} onDeleted={onDeleted} />
    </div>
  );
}

