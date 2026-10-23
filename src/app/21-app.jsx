function App(){
  // Verbindungsdaten sofort setzen: eine gespeicherte Sitzung braucht sie schon beim ersten Anzeigen
  const [config,setConfig] = useState(DEFAULT_CONFIG);
  // Gespeicherte Sitzung wiederherstellen – so bleibt man nach dem Neuladen angemeldet
  const [token,setToken] = useState(() => { if(window.OUVERTURE_DEMO) return "demo"; const s = Session.load(); return s ? s.access_token : null; });
  const [orgId,setOrgId] = useState(null);
  const [orgs,setOrgs] = useState([]);
  const [members,setMembers] = useState([]);
  const [me,setMe] = useState(null);
  const [hotels,setHotels] = useState(null);
  const [hotel,setHotel] = useState(null);
  const [tab,setTab] = useState("dashboard");
  useEffect(()=>{ window.__ouvTab = tab; window.scrollTo(0,0); },[tab]);
  const [searchOpen,setSearchOpen] = useState(false);
  useEffect(()=>{ const k = (e) => { if((e.ctrlKey||e.metaKey) && (e.key==="k"||e.key==="K")){ e.preventDefault(); setSearchOpen(true); } }; window.addEventListener("keydown", k); return ()=>window.removeEventListener("keydown", k); },[]); // neue Ansicht beginnt oben; Ansicht merken für Fehlermeldungen
  const [tasks,setTasks] = useState([]);
  const [milestones,setMilestones] = useState([]);
  const [risks,setRisks] = useState([]);
  const [budget,setBudget] = useState([]);
  const [staff,setStaff] = useState([]);
  const [readiness,setReadiness] = useState(null);
  const [fatalError,setFatalError] = useState("");
  const [recoveryToken,setRecoveryToken] = useState(null);
  const [recoveryDone,setRecoveryDone] = useState(false);
  const [editingHotel,setEditingHotel] = useState(false);
  const [helpOpen,setHelpOpen] = useState(false);
  const [showReport,setShowReport] = useState(false);
  const [billing,setBilling] = useState(null);
  const [billingNotice,setBillingNotice] = useState(null);
  const [ai,setAi] = useState(null);
  const [fxTick,setFxTick] = useState(0); // neu zeichnen, wenn Kurse oder Anzeigewährung sich ändern
  const [ticketPrefill,setTicketPrefill] = useState(null);
  // Aus einer Benachrichtigung geöffnet (?open=roster usw.): nach der Hotelauswahl dorthin
  const [openFromLink,setOpenFromLink] = useState(()=>{ try {
    const q = new URLSearchParams(window.location.search);
    if(q.get("clock")){ rememberClockCode(q.get("clock")); q.delete("clock"); window.history.replaceState(null,"",window.location.pathname+(q.toString()?"?"+q:"")); return "time"; }
    return q.get("open"); } catch(e){ return null; } });

  useEffect(()=>{
    // Verbindungsdaten sind fest eingebaut – niemand muss sie mehr eintragen.
    setConfig(DEFAULT_CONFIG);
    // Erkennt den Link aus der "Passwort vergessen"-E-Mail: Supabase hängt
    // #access_token=...&type=recovery an die URL an, wenn man draufklickt.
    try {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const params = new URLSearchParams(hash);
      if(params.get("type")==="recovery" && params.get("access_token")){
        setRecoveryToken(params.get("access_token"));
        window.history.replaceState(null,"",window.location.pathname);
      } else if(params.get("access_token") && params.get("refresh_token")){
        // Rückkehr von „Mit Google/Microsoft anmelden“
        const data = {access_token:params.get("access_token"), refresh_token:params.get("refresh_token"), expires_in:Number(params.get("expires_in"))||3600, expires_at:Number(params.get("expires_at"))||undefined};
        Session.save(sessionFromAuth(data)); setToken(data.access_token);
        window.history.replaceState(null,"",window.location.pathname + window.location.search);
      } else if(params.get("error_description")){
        window.history.replaceState(null,"",window.location.pathname);
        setTimeout(()=>window.alert(params.get("error_description")), 300);
      }
    } catch(e){}
    // Erkennt einen Team-Einladungslink: ?invite=<token>. Der Token wird im
    // Browser gemerkt, damit er auch nach Registrierung + E-Mail-Bestätigung
    // (die zurück auf die Seite ohne ?invite führt) noch da ist.
    try {
      const search = new URLSearchParams(window.location.search);
      if(search.get("invite")){
        try { window.localStorage.setItem(LS_INVITE_KEY, search.get("invite")); } catch(e){}
        window.history.replaceState(null,"",window.location.pathname);
      }
      // Kontrollgang: QR-Code am Kontrollpunkt führt auf ?patrol=<token> (nach der Anmeldung bestätigen)
      if(search.get("patrol")){
        try { window.sessionStorage.setItem("hpoos_patrol", search.get("patrol")); } catch(e){}
        window.history.replaceState(null,"",window.location.pathname);
      }
      // Rückkehr von der Stripe-Bezahlseite oder der Abo-Verwaltung: ?billing=success|cancel|portal
      if(search.get("billing")){
        setBillingNotice(search.get("billing"));
        setTab("billing");
        window.history.replaceState(null,"",window.location.pathname);
      }
    } catch(e){}
  },[]);

  // Erneuerung fehlgeschlagen (z. B. lange nicht benutzt) -> zurück zur Anmeldung
  useEffect(()=>{ Session.onExpired = () => { setToken(null); setOrgId(null); }; return () => { Session.onExpired = null; }; },[]);
  const login = (data) => { Session.save(sessionFromAuth(data)); setToken(data.access_token); };
  useEffect(()=>{
    if(!token) return;
    let timer = null, last = Date.now();
    const arm = () => { clearInterval(timer); if(!isSharedDevice()) return;
      timer = setInterval(()=>{ if(Date.now() - last > 15*60*1000) logoutRef.current && logoutRef.current(); }, 30000); };
    const bump = () => { last = Date.now(); };
    const evs = ["pointerdown","keydown","scroll","touchstart"];
    evs.forEach(e=>window.addEventListener(e, bump, {passive:true}));
    window.addEventListener("hpoos-shared-device", arm); arm();
    return () => { clearInterval(timer); evs.forEach(e=>window.removeEventListener(e, bump)); window.removeEventListener("hpoos-shared-device", arm); };
  },[token]);
  const [mfaNeeded,setMfaNeeded] = useState(null);
  useEffect(()=>{
    const on = async () => { try { const t = Session.current && Session.current.access_token; if(!t) return;
      const u = await supabaseAuth(config, t, "/user"); const f = verifiedTotp(u)[0]; if(f) setMfaNeeded({token:t, factorId:f.id}); } catch(e){} };
    window.addEventListener("hpoos-mfa-required", on); return () => window.removeEventListener("hpoos-mfa-required", on);
  },[config]);
  const logoutRef = React.useRef(null);
  const [patrolToken,setPatrolToken] = useState(() => { try { return window.sessionStorage.getItem("hpoos_patrol"); } catch(e){ return null; } });
  const closePatrol = () => { try { window.sessionStorage.removeItem("hpoos_patrol"); } catch(e){} setPatrolToken(null); };
  const logout = async () => { await unsubscribePushOnLogout(api); try { await flushOfflineQueue(); } catch(e){} clearOfflineData(); Session.save(null); setToken(null); setOrgId(null); setOrgs([]); setHotel(null); setHotels(null); };
  logoutRef.current = logout;

  const saveConfig = (cfg) => {
    setConfig(cfg);
    try { if(cfg) window.localStorage.setItem(LS_KEY, JSON.stringify(cfg)); else window.localStorage.removeItem(LS_KEY); } catch(e){}
  };

  const api = useCallback((path, method, body) => apiCall(config.backendUrl, token, path, method, body), [config, token]);

  useEffect(()=>{
    if(!token || !config) return;
    (async () => {
      try {
        let organizationId;
        let fromInvite = false;
        let inviteToken = null;
        try { inviteToken = window.localStorage.getItem(LS_INVITE_KEY); } catch(e){}
        if(inviteToken){
          try {
            const accepted = await apiCall(config.backendUrl, token, "/api/invites/accept", "POST", {token:inviteToken});
            organizationId = accepted.organization_id; fromInvite = true;
          } catch(e){ setFatalError(tf("Einladung: {0}", e.message)); }
          // Einladung nur einmal verarbeiten – egal ob angenommen oder ungültig.
          try { window.localStorage.removeItem(LS_INVITE_KEY); } catch(e){}
        }
        if(!organizationId){
          let ref = null; try { ref = window.localStorage.getItem(LS_REF_KEY); } catch(e){}
          const boot = await apiCall(config.backendUrl, token, "/api/bootstrap-organization", "POST", {name:"Meine Organisation", ref});
          organizationId = boot.organization_id;
          try { window.localStorage.removeItem(LS_REF_KEY); } catch(e){}
        }
        const list = await apiCall(config.backendUrl, token, "/api/organizations");
        // Zuletzt benutzte Organisation wiederherstellen – außer man kommt gerade über eine Einladung.
        let saved = null;
        try { saved = window.localStorage.getItem(LS_ORG_KEY); } catch(e){}
        if(!fromInvite && saved && list.some(o=>o.id===saved)) organizationId = saved;
        setOrgs(list);
        setOrgId(organizationId);
      } catch(e){ setFatalError(e.message); }
    })();
  },[token, config]);

  // Hotels immer nur für die gewählte Organisation laden.
  useEffect(()=>{
    if(!token || !orgId) return;
    let cancelled = false;
    setHotels(null);
    apiCall(config.backendUrl, token, "/api/hotels?organization_id=" + encodeURIComponent(orgId))
      .then(h=>{ if(!cancelled) setHotels(h); })
      .catch(e=>{ if(!cancelled) setFatalError(e.message); });
    return () => { cancelled = true; };
  },[token, orgId, config]);

  // Abo der gewählten Organisation. Fehlt es (z. B. Backend noch ohne Abo-Funktion), wird nichts angezeigt.
  const loadBilling = useCallback(() => {
    if(!token || !orgId) { setBilling(null); return; }
    apiCall(config.backendUrl, token, "/api/organizations/"+orgId+"/billing").then(setBilling).catch(()=>setBilling(null));
  },[token, orgId, config]);
  useEffect(()=>{ loadBilling(); },[loadBilling]);
  // Nach der Bezahlung meldet Stripe das Abo per Webhook – kann ein paar Sekunden dauern.
  useEffect(()=>{
    if(billingNotice!=="success" && billingNotice!=="portal") return;
    const timers = [2000, 5000, 10000, 20000].map(ms=>setTimeout(loadBilling, ms));
    return () => timers.forEach(clearTimeout);
  },[billingNotice, loadBilling]);

  const switchOrg = (id) => {
    setHotel(null); setTab("dashboard"); setFatalError(""); setOrgId(id);
    try { window.localStorage.setItem(LS_ORG_KEY, id); } catch(e){}
  };
  const currentOrg = orgs.find(o=>o.id===orgId);
  // Eigentümer-Zugang: alles sehen, nichts ändern (die Datenbank erzwingt das zusätzlich)
  const isViewer = !!(currentOrg && currentOrg.role==="viewer");
  const role = currentOrg ? currentOrg.role : "member";
  const myDepts = (currentOrg && currentOrg.departments) || [];
  ACCESS = {role, depts: myDepts};
  const isAdmin = role==="admin";
  const isLead = role==="admin" || role==="manager";
  // Oberfläche in der Sprache der Organisation
  useEffect(()=>{ if(currentOrg) followOrgLanguage(currentOrg.language || "de"); },[currentOrg && currentOrg.language]);
  useEffect(()=>{ if(currentOrg && hotel && !navFor(role, !!billing && !window.OUVERTURE_DEMO, myDepts, hotelDisabled(hotel)).some(n=>n.key===tab)) setTab("dashboard"); },[role, tab, !!billing, !!currentOrg, myDepts.join("|"), hotel && hotelDisabled(hotel).join("|")]);

  // Tageskurse für die eigene Anzeigewährung
  useEffect(()=>{
    apiCall(config.backendUrl, null, "/api/fx").then(r=>{ FX = r; setFxTick(x=>x+1); }).catch(()=>{});
  },[config]);
  // Sprache und Währung geräteübergreifend: gespeicherte Einstellung übernehmen bzw. nachtragen
  useEffect(()=>{
    if(!me) return;
    if(me.currency && !DISPLAY_CURRENCY){ setDisplayCurrency(me.currency); setFxTick(x=>x+1); }
    const chosen = chosenUiLanguage();
    if(me.language && !chosen && me.language !== UI_LANG){ chooseUiLanguage(me.language); return; }
    if(chosen && chosen !== me.language) apiCall(config.backendUrl, token, "/api/me/settings", "PUT", {language: chosen}).catch(()=>{});
  },[me && me.id]);
  // Zuletzt geöffnetes Hotel und Ansicht merken – nach Sprachwechsel oder Neuladen geht es dort weiter
  useEffect(()=>{
    if(!hotel || !orgId) return;
    try { window.localStorage.setItem(LS_HOTEL_KEY, JSON.stringify({orgId, hotelId: hotel.id, tab})); } catch(e){}
  },[hotel && hotel.id, tab, orgId]);
  useEffect(()=>{
    if(hotel || !hotels || !orgId) return;
    if(window.OUVERTURE_DEMO && hotels.length){ setHotel(hotels[0]); return; }
    let saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(LS_HOTEL_KEY) || "null"); } catch(e){}
    if(!saved || saved.orgId !== orgId) return;
    const h = hotels.find(x=>x.id===saved.hotelId);
    if(h){ setHotel(h); if(saved.tab) setTab(saved.tab); }
  },[hotels, orgId]);
  const leaveHotel = () => { try { window.localStorage.removeItem(LS_HOTEL_KEY); } catch(e){} setHotel(null); };
  useEffect(()=>{
    if(!hotel || !openFromLink) return;
    setTab(openFromLink); setOpenFromLink(null);
    try { const u = new URL(window.location.href); u.searchParams.delete("open"); window.history.replaceState(null,"",u.pathname+u.search); } catch(e){}
  },[hotel && hotel.id, openFromLink]);

  // Wer bin ich, und wer ist im Team? (für Zuständigkeiten)
  useEffect(()=>{
    if(!token) { setMe(null); return; }
    apiCall(config.backendUrl, token, "/api/me").then(setMe).catch(()=>setMe(null));
  },[token, config]);
  useEffect(()=>{
    if(!token || !orgId) { setMembers([]); return; }
    apiCall(config.backendUrl, token, "/api/organizations/"+orgId+"/members").then(setMembers).catch(()=>setMembers([]));
  },[token, orgId, config]);

  const loadHotelData = useCallback(async (h) => {
    if(!h) return;
    const base = "/api/hotels/" + h.id;
    try {
      const [t,m,r,rd,b,s] = await Promise.all([
        apiCall(config.backendUrl, token, base+"/tasks"),
        apiCall(config.backendUrl, token, base+"/milestones"),
        apiCall(config.backendUrl, token, base+"/risks"),
        apiCall(config.backendUrl, token, base+"/readiness"),
        // Budget/Personal dürfen das Laden der übrigen Daten nie blockieren.
        apiCall(config.backendUrl, token, base+"/budget").catch(()=>[]),
        apiCall(config.backendUrl, token, base+"/staff").catch(()=>[]),
      ]);
      setTasks(t); setMilestones(m); setRisks(r); setReadiness(rd); setBudget(b); setStaff(s);
    } catch(e){ setFatalError(e.message); }
  },[config, token]);

  useEffect(()=>{ if(hotel) loadHotelData(hotel); },[hotel, loadHotelData]);
  const chatUnread = useChatUnread(api, hotel, me, role, tab);
  useEffect(()=>{
    setAi(null);
    if(!hotel || !token) return;
    if(ACCESS.role==="member") return;
    apiCall(config.backendUrl, token, "/api/hotels/"+hotel.id+"/ai-report").then(setAi).catch(()=>setAi(null));
  },[hotel, token, config]);

  if(config===undefined) return <div style={{padding:40,color:INK_MUTED}}>Lädt…</div>;
  if(!config) return <SetupView onSave={saveConfig} />;
  if(recoveryToken && !recoveryDone) return <ResetPasswordView config={config} accessToken={recoveryToken} onDone={()=>{setRecoveryDone(true);setRecoveryToken(null);}} />;
  if(recoveryDone) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
      <Card style={{maxWidth:380,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600,marginBottom:10}}>Passwort geändert</div>
        <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:16}}>Du kannst dich jetzt mit deinem neuen Passwort anmelden.</div>
        <button className="btn-primary" style={{width:"100%"}} onClick={()=>setRecoveryDone(false)}>Zur Anmeldung</button>
      </Card>
    </div>
  );
  if(!token) return <LoginView config={config} onLogin={login} onReset={()=>saveConfig(null)} />;
  if(mfaNeeded) return <MfaPrompt cfg={config} token={mfaNeeded.token} factorId={mfaNeeded.factorId} onDone={(d)=>{ setMfaNeeded(null); login(d); window.location.reload(); }} onCancel={()=>{ setMfaNeeded(null); logout(); }} />;
  // hotels === null heißt: noch nicht geladen. Erst danach entscheiden, ob Liste oder Formular.
  if(!hotel && hotels===null) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
      <Card style={{maxWidth:380,width:"100%",textAlign:"center"}}>
        {fatalError
          ? <React.Fragment>
              <div style={{color:BAD,fontSize:13.5,marginBottom:14}}>{fatalError}</div>
              <button className="btn-primary" style={{width:"100%"}} onClick={()=>{setFatalError("");logout();}}>Zurück zur Anmeldung</button>
            </React.Fragment>
          : <div style={{color:INK_MUTED,fontSize:13.5}}>Hotels werden geladen…</div>}
      </Card>
    </div>
  );
  if(!hotel) return <HotelSetupView hotels={hotels} orgId={orgId} api={api} orgs={orgs} onSwitchOrg={switchOrg} readOnly={!isAdmin}
    onCreated={(h)=>{ setHotels([...hotels,h]); setHotel(h); }} onSelect={setHotel} />;
  if(hotel) HOTEL_CURRENCY = hotel.currency || "EUR";
  if(showReport) return <ReportView hotel={hotel} orgName={currentOrg ? currentOrg.name : ""} me={me}
    readiness={readiness} tasks={tasks} milestones={milestones} risks={risks} budget={budget} staff={staff}
    aiReport={ai && ai.report} onClose={()=>setShowReport(false)} />;

  const NAV = navFor(role, !!billing && !window.OUVERTURE_DEMO, myDepts, hotelDisabled(hotel)).filter(n=>n.key!=="group" || (hotels||[]).length>1)
    .filter(n=>n.key!=="invoices" || role==="admin" || role==="manager" || role==="viewer" || INVOICE_DEPTS_FE.some(d=>(myDepts||[]).includes(d)));

  HOTEL_CURRENCY = hotel.currency || "EUR";
  const callHotel = (suffix, method, body) => api("/api/hotels/"+hotel.id+suffix, method, body);
  // Für Dokumente: Upload direkt in den Supabase-Speicher; Admins dürfen alle Dokumente löschen
  const docCtx = {
    hotel,
    upload: {supabaseUrl: config.supabaseUrl, anonKey: config.supabaseAnonKey, token},
    me: me ? {...me, isAdmin: !!(currentOrg && currentOrg.role==="admin")} : null,
  };
  const callId = (resource, id, method, body) => api("/api/"+resource+"/"+id, method, body);

  return (
    <div className="app-shell" style={{fontFamily:"Inter, sans-serif",background:PAPER,minHeight:"100vh",display:"flex"}}>
      <a href="#inhalt" className="skip-link no-print" onClick={(e)=>{ e.preventDefault(); const m = document.getElementById("inhalt"); if(m){ m.focus(); m.scrollIntoView(); } }}>{tf("Zum Inhalt springen")}</a>
      <nav className="sidebar" aria-label={tf("Hauptmenü")} style={{width:210,background:INK,color:"#fff",padding:"22px 14px",flexShrink:0}}>
        <div className="brand" style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:500,letterSpacing:0.3,padding:"0 8px 20px",borderBottom:"1px solid "+(hotel.brand_color||"rgba(201,166,107,0.3)"),marginBottom:16,display:"flex",alignItems:"center",gap:9}}><Logo size={22} color={hotel.brand_color||"#C9A66B"} />Ouverture</div>
        <OrgSwitcher orgs={orgs} orgId={orgId} onSwitch={switchOrg} dark />
        <SideNav nav={NAV} tab={tab} onOpen={(k)=>{ setTab(k); setHelpOpen(false); }} accent={hotel.brand_color||"#C9A66B"} />
        <div className="nav-item" {...pressable(leaveHotel)} style={{padding:"9px 10px",borderRadius:7,cursor:"pointer",marginTop:14,fontSize:13,color:"rgba(255,255,255,0.65)"}}>Hotel wechseln</div>
        <div style={{marginTop:18}}><LanguageSwitcher dark withDefault api={api} me={me} onCurrency={()=>setFxTick(x=>x+1)} /></div>
        <div style={{marginTop:8}}><InstallAppButton dark /></div>
        <div className="logout" {...pressable(logout)} style={{marginTop:20,fontSize:13,color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Abmelden</div>
      </nav>
      <main id="inhalt" tabIndex={-1} style={{flex:1,minWidth:0,outline:"none"}}>
        <div className="page-header" style={{padding:"18px 28px",borderBottom:`1px solid ${BORDER}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div>
            <div style={{fontFamily:"Fraunces, serif",fontSize:20,fontWeight:600,display:"flex",alignItems:"center",gap:10}}>{hotel.logo_data && <img src={hotel.logo_data} alt="" style={{height:30,maxWidth:90,objectFit:"contain"}} />}<span data-no-i18n="">{hotel.name}</span>{hotel.is_demo && <Pill color={BRASS} bg={BRASS_SOFT}>Beispielhotel</Pill>}</div>
            <div style={{fontSize:12.5,color:INK_MUTED}}>{hotel.city} · {tf("{0} Zimmer · Eröffnung {1}", hotel.rooms, fmtDate(hotel.opening_date))}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <button className="no-print" onClick={()=>setSearchOpen(true)} title={tf("Suchen (Strg+K)")} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 11px",fontSize:12.5,cursor:"pointer",color:INK_MUTED,display:"flex",gap:8,alignItems:"center"}}><Icon n="search" /> <span>{tf("Suchen")}</span><kbd className="kbd-hint" style={{fontSize:10.5,border:`1px solid ${BORDER}`,borderRadius:4,padding:"0 4px"}}>Strg K</kbd></button>
            {!window.OUVERTURE_DEMO && <NotificationBell api={api} onOpen={(k)=>setTab(k)} />}
            {HELP[helpKey(tab, role, hotel)] && <button onClick={()=>setHelpOpen(x=>!x)} title={tf("Kurz erklärt")} aria-label={tf("Kurz erklärt")}
              style={{background:helpOpen?"#F4F7FB":"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 11px",fontSize:12.5,cursor:"pointer",fontWeight:700}}>?</button>}
            {role!=="member" && !preOpeningOff(hotel) && <button onClick={()=>{ setShowReport(true); window.scrollTo(0,0); }} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer"}}>Statusbericht</button>}
            {role!=="member" && !preOpeningOff(hotel) && <button onClick={async ()=>{ try { await exportHotelXlsx({hotel, tasks, milestones, risks, budget, staff, members}); } catch(e){ setFatalError(tf("Export fehlgeschlagen: {0}", e.message)); } }}
              style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer"}}>Excel-Export</button>}
            {!preOpeningOff(hotel) && <button onClick={()=>downloadIcs({hotel, tasks, milestones})} title="Offene Fristen und Meilensteine für Outlook, Google oder Apple Kalender"
              style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer"}}>Kalender</button>}
            {hotel.is_demo && isAdmin && !window.OUVERTURE_DEMO && <button onClick={async ()=>{
                if(!window.confirm("Beispielhotel mit allen Beispieldaten löschen? Du kannst es später jederzeit neu anlegen.")) return;
                try { await api("/api/hotels/"+hotel.id,"DELETE"); setHotels((hotels||[]).filter(x=>x.id!==hotel.id)); setHotel(null); }
                catch(e){ setFatalError(e.message); }
              }} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer",color:INK_MUTED}}>Beispiel entfernen</button>}
            {!editingHotel && isAdmin && <button onClick={()=>setEditingHotel(true)} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer"}}>Hotel bearbeiten</button>}
          </div>
        </div>
        <div className="page-content" style={{padding:"22px 28px"}}>
          <SearchPalette open={searchOpen} onClose={()=>setSearchOpen(false)} nav={NAV} tasks={tasks} milestones={milestones} risks={risks} members={members} hotel={hotel} api={api} onOpen={(k)=>{ setTab(k); setHelpOpen(false); }} />
          {role==="member" && <MobileTabBar nav={NAV} tab={tab} onOpen={(k)=>setTab(k)} />}
          <ServiceButton api={api} orgId={orgId} hotel={hotel} tab={tab} nav={NAV} onOpen={setTab} />
          <OfflineBadge />
          {window.OUVERTURE_DEMO && <DemoBar role={role} />}
          <HelpTip tab={tab} role={role} hotel={hotel} open={helpOpen} onClose={()=>setHelpOpen(false)} />
          {fatalError && <div style={{color:BAD,marginBottom:14}}>{fatalError}</div>}
          {tab!=="billing" && isAdmin && !window.OUVERTURE_DEMO && <BillingBanner billing={billing} onOpen={()=>setTab("billing")} />}
          {role==="member" && tab==="dashboard" && <MemberHome hotel={hotel} api={api} me={me} orgId={orgId} tasks={tasks} myDepts={myDepts} onOpen={setTab} members={members} />}
          {isViewer && <div className="no-print" style={{border:`1px solid ${BRASS}`,background:BRASS_SOFT,borderRadius:8,padding:"9px 14px",marginBottom:16,fontSize:13.5}}>
            <b>Eigentümer-Ansicht:</b> Du siehst den aktuellen Stand, den KI-Lagebericht und den Statusbericht. Ändern können nur Mitglieder des Projektteams.
          </div>}
          {editingHotel && <HotelEditForm hotel={hotel} api={api} onCancel={()=>setEditingHotel(false)}
            onSaved={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); setEditingHotel(false); }} />}
          {tab==="dashboard" && isAdmin && hotel.setup_completed===false && !hotel.is_demo && !window.OUVERTURE_DEMO && <SetupWizard hotel={hotel} api={api} orgId={orgId} onOpen={setTab} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); loadHotelData(h); }} />}
          {tab==="dashboard" && isAdmin && !window.OUVERTURE_DEMO && <PhaseHint key={hotel.id} hotel={hotel} api={api} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="dashboard" && isAdmin && !preOpeningOff(hotel) && hotel.setup_completed!==false && <GettingStarted hotel={hotel} api={api} tasks={tasks} members={members} onOpen={setTab} />}
          {tab==="dashboard" && role!=="member" && preOpeningOff(hotel) && <KpiView hotel={hotel} api={api} />}
          {tab==="dashboard" && role!=="member" && !preOpeningOff(hotel) && <AiReportCard hotel={hotel} api={api} ai={ai} onChange={setAi} readOnly={!isLead} />}
          {tab==="dashboard" && role!=="member" && !preOpeningOff(hotel) && <DashboardView readiness={readiness} tasks={tasks} risks={risks} budget={budget} staff={staff} lead={role!=="member"} onOpen={isLead ? setTab : ()=>{}} />}
          {tab==="mine" && <MyTasksView orgId={orgId} api={api} hotelId={hotel.id} refresh={()=>loadHotelData(hotel)} />}
          {tab==="tasks" && <TasksView tasks={tasks} callHotel={callHotel} callId={callId} refresh={()=>loadHotelData(hotel)} members={members} me={me} api={api} docCtx={docCtx} />}
          {tab==="timeline" && <TimelineView hotel={hotel} tasks={tasks} milestones={milestones} />}
          {tab==="milestones" && <MilestonesView milestones={milestones} callHotel={callHotel} callId={callId} refresh={()=>loadHotelData(hotel)} />}
          {tab==="risks" && <RisksView risks={risks} callHotel={callHotel} callId={callId} refresh={()=>loadHotelData(hotel)} />}
          {tab==="budget" && <ConversionNote />}
          {tab==="budget" && <BudgetView items={budget} callHotel={callHotel} callId={callId} refresh={()=>loadHotelData(hotel)} hotel={hotel} />}
          {tab==="time" && <TimeView hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="rooms" && <RoomsView hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} onReport={(loc)=>{ setTicketPrefill(loc); setTab("tickets"); }} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="tickets" && role==="admin" && <AutomationsCard hotel={hotel} api={api} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="tickets" && <TicketsView hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} prefill={ticketPrefill} onPrefillUsed={()=>setTicketPrefill(null)} />}
          {tab==="chat" && <ChatView hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} />}
          {tab==="logbook" && <LogbookView hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} />}
          {tab==="checklists" && <ChecklistsView hotel={hotel} api={api} me={me} role={role} myDepts={myDepts} members={members} />}
          {tab==="trainings" && <TrainingsView orgId={orgId} api={api} me={me} members={members} role={role} myDepts={myDepts} hotel={hotel} />}
          {tab==="lostfound" && <LostFoundView hotel={hotel} api={api} me={me} members={members} role={role} />}
          {tab==="stock" && <StockView hotel={hotel} api={api} me={me} role={role} myDepts={myDepts} />}
          {tab==="kpis" && <KpiView hotel={hotel} api={api} />}
          {tab==="procurement" && <ProcurementView hotel={hotel} api={api} role={role} myDepts={myDepts} />}
          {tab==="permits" && <PermitsView hotel={hotel} api={api} role={role} />}
          {tab==="feedback" && <FeedbackView hotel={hotel} api={api} me={me} role={role} />}
          {patrolToken && token && <PatrolScanDialog api={api} token={patrolToken} onClose={closePatrol} />}
          {tab==="assets" && <AssetRiskCard hotel={hotel} api={api} />}
          {tab==="assets" && <MaintenanceCalendarCard hotel={hotel} api={api} onOpen={setTab} />}
          {tab==="memory" && <HotelMemoryView hotel={hotel} api={api} />}
          {tab==="myself" && <MySelfServiceView orgId={orgId} api={api} me={me} hotel={hotel} />}
          {tab==="simulator" && <SimulatorView hotel={hotel} api={api} />}
          {tab==="season" && <SeasonHandoverView hotel={hotel} api={api} members={members} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="sustainability" && <SustainabilityView hotel={hotel} api={api} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="network" && <NetworkView hotel={hotel} api={api} me={me} myDepts={myDepts} />}
          {tab==="apprentices" && <ApprenticesView orgId={orgId} api={api} members={members} me={me} />}
          {tab==="assets" && <AssetsView hotel={hotel} api={api} />}
          {tab==="academy" && <AcademyView hotel={hotel} api={api} me={me} members={members} />}
          {tab==="patrols" && <PatrolsView hotel={hotel} api={api} />}
          {tab==="instructions" && <InstructionsView hotel={hotel} api={api} />}
          {tab==="sick" && <SickNotesView hotel={hotel} api={api} members={members} />}
          {tab==="cash" && <CashView hotel={hotel} api={api} me={me} members={members} myDepts={myDepts} />}
          {tab==="keys" && <KeysView hotel={hotel} api={api} members={members} />}
          {tab==="uniforms" && <UniformsView hotel={hotel} api={api} members={members} />}
          {tab==="emergency" && <EmergencyView hotel={hotel} api={api} />}
          {tab==="laundry" && <LaundryView hotel={hotel} api={api} />}
          {tab==="minibar" && <MinibarView hotel={hotel} api={api} />}
          {tab==="breakfast" && <BreakfastView hotel={hotel} api={api} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="housing" && <HousingView hotel={hotel} api={api} members={members} />}
          {tab==="staffdocs" && <StaffDocsView orgId={orgId} api={api} members={members} />}
          {tab==="pulse" && <PulseView orgId={orgId} api={api} hotel={hotel} myDepts={myDepts} />}
          {tab==="tourismtax" && <TourismStatsCard hotel={hotel} api={api} />}
          {tab==="tourismtax" && <TourismTaxView hotel={hotel} api={api} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="frontdesk" && <GuestOrdersCard hotel={hotel} api={api} />}
          {tab==="frontdesk" && <FrontDeskView hotel={hotel} api={api} onOpen={setTab} />}
          {tab==="arrivals" && <ArrivalsView hotel={hotel} api={api} role={role} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="reviews" && (role==="admin" || canManageDept("Rezeption & Empfang")) && <GoogleReviewsSync hotel={hotel} api={api} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} onDone={()=>{}} />}
          {tab==="reviews" && <ReviewsView hotel={hotel} api={api} role={role} />}
          {tab==="energy" && <EnergyView hotel={hotel} api={api} role={role} />}
          {tab==="help" && <HelpView onOpen={setTab} />}
          {tab==="events" && <EventsView hotel={hotel} api={api} role={role} />}
          {tab==="invoices" && <InvoicesView hotel={hotel} api={api} role={role} onHotel={(h)=>{ setHotel(h); setHotels((hotels||[]).map(x=>x.id===h.id?h:x)); }} />}
          {tab==="letters" && <LettersView hotel={hotel} api={api} role={role} me={me} />}
          {tab==="group" && <GroupView orgId={orgId} api={api} hotels={hotels} onPick={(id)=>{ const h = (hotels||[]).find(x=>x.id===id); if(h){ setHotel(h); setTab("dashboard"); } }} />}
          {tab==="guestchat" && <GuestChatView hotel={hotel} api={api} />}
          {tab==="roster" && <RosterView hotel={hotel} api={api} me={me} members={members} role={role} myDepts={myDepts} orgId={orgId} />}
          {tab==="docs" && <DocumentsPanel hotel={hotel} api={api} upload={docCtx.upload} me={docCtx.me} />}
          {tab==="staff" && <StaffView positions={staff} callHotel={callHotel} callId={callId} refresh={()=>loadHotelData(hotel)} hotel={hotel} api={api} />}
          {tab==="team" && <TeamView orgId={orgId} api={api} inviteLinkBase={window.location.origin + window.location.pathname}
            orgName={currentOrg ? currentOrg.name : ""} me={me} orgLanguage={currentOrg ? currentOrg.language : "de"}
            onRenamed={(org)=>setOrgs(orgs.map(o=>o.id===org.id?{...o,name:org.name}:o))}
            onLanguageChanged={(lang)=>setOrgs(orgs.map(o=>o.id===orgId?{...o,language:lang}:o))}
            onOrgGone={()=>{ try { window.localStorage.removeItem(LS_ORG_KEY); } catch(e){} window.location.reload(); }} />}
          {tab==="team" && (role==="admin"||role==="manager") && <OnboardingAdmin orgId={orgId} api={api} me={me} members={members} />}
          {tab==="team" && role==="admin" && !window.OUVERTURE_DEMO && <AuditView orgId={orgId} api={api} hotel={hotel} />}
          {tab==="account" && <AccountView config={config} token={token} me={me} api={api}
            onDeleted={()=>{ Session.save(null); try { window.localStorage.removeItem(LS_ORG_KEY); } catch(e){} window.location.reload(); }} />}
          {tab==="billing" && <BillingView hotel={hotel} billing={billing} orgId={orgId} api={api} notice={billingNotice}
            isAdmin={isAdmin} onReload={loadBilling} />}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
