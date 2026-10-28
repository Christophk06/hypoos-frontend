// Logo: ein Torbogen – die "Öffnung" (Ouverture)
function Logo({size=24, color="#C9A66B"}){
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{flexShrink:0}}>
      <path d="M9 26V15a7 7 0 0 1 14 0v11M13 26v-9a3 3 0 0 1 6 0v9M5 26h22" fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function Card(props){ return <div className={"card"+(props.className ? " "+props.className : "")} style={props.style}>{props.children}</div>; }
function Field({label, children}){
  const uid = React.useId();
  const only = React.Children.count(children)===1 && React.isValidElement(children) && typeof children.type==="string" ? children : null;
  const id = only ? (only.props.id || uid) : undefined;
  return <label htmlFor={id} style={{display:"block",marginBottom:14}}><div className="field-label">{label}</div>{only ? React.cloneElement(only,{id}) : children}</label>;
}
function Pill({children,color,bg}){ return <span style={{color,background:bg,fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:999}}>{children}</span>; }

function SetupView({onSave}){
  const [form,setForm] = useState({backendUrl:"https://hpoos-backend-1.onrender.com", supabaseUrl:"", supabaseAnonKey:""});
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
      <Card style={{maxWidth:440,width:"100%"}}>
        <div style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,marginBottom:16}}>Ouverture — Verbindung einrichten</div>
        <Field label="Backend-URL">
          <input className="input" value={form.backendUrl} onChange={e=>setForm({...form,backendUrl:e.target.value})} />
        </Field>
        <Field label="Supabase Project URL">
          <input className="input" value={form.supabaseUrl} onChange={e=>setForm({...form,supabaseUrl:e.target.value})} placeholder="https://dein-projekt.supabase.co" />
        </Field>
        <Field label="Supabase anon / publishable Key">
          <input className="input" value={form.supabaseAnonKey} onChange={e=>setForm({...form,supabaseAnonKey:e.target.value})} />
        </Field>
        <button className="btn-primary" style={{width:"100%"}}
          onClick={()=> form.backendUrl && form.supabaseUrl && form.supabaseAnonKey && onSave(form)}>
          Speichern &amp; weiter
        </button>
      </Card>
    </div>
  );
}

function LoginView({config,onLogin,onReset}){
  const [mode,setMode]=useState("login"); // "login" | "register" | "forgot"
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(""); const [info,setInfo]=useState(""); const [loading,setLoading]=useState(false);
  const [mfa,setMfa] = useState(null);

  const submitLogin = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const data = await supabaseLogin(config.supabaseUrl, config.supabaseAnonKey, email, password);
      const f = verifiedTotp(data.user)[0];
      if(f) setMfa({token:data.access_token, factorId:f.id}); else onLogin(data);
    }
    catch(e){ setError(e.message); }
    setLoading(false);
  };
  if(mfa) return <MfaPrompt cfg={config} token={mfa.token} factorId={mfa.factorId} onDone={onLogin} onCancel={()=>{ setMfa(null); setPassword(""); }} />;

  const submitRegister = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      if(password.length < 6){ setError("Das Passwort muss mindestens 6 Zeichen haben."); setLoading(false); return; }
      const session = await supabaseSignUp(config.supabaseUrl, config.supabaseAnonKey, email, password);
      if(session){ onLogin(session); }
      else { setInfo("Konto angelegt! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an."); setMode("login"); }
    } catch(e){ setError(e.message); }
    setLoading(false);
  };

  const submitForgot = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      await supabaseRecover(config.supabaseUrl, config.supabaseAnonKey, email, redirectTo);
      setInfo("Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Bitte schau in dein Postfach (auch im Spam-Ordner).");
    } catch(e){ setError(e.message); }
    setLoading(false);
  };

  const run = mode==="login" ? submitLogin : mode==="register" ? submitRegister : submitForgot;
  const submit = () => {
    if(loading) return;
    if(!email.trim()){ setInfo(""); setError("Bitte gib deine E-Mail-Adresse ein."); return; }
    if(!/^[^\s@]+@[^\s@]+$/.test(email.trim())){ setInfo(""); setError("Bitte gib eine gültige E-Mail-Adresse ein."); return; }
    if(mode!=="forgot" && !password){ setInfo(""); setError("Bitte gib dein Passwort ein."); return; }
    run();
  };
  const onFormSubmit = (e) => { e.preventDefault(); submit(); };
  const errId = "login-error";
  const descr = error ? errId : undefined;
  const infoBox = info ? <div role="status" id="login-info" style={{color:GOOD_TEXT,fontSize:13,marginBottom:12}}>{info}</div> : null;
  const linkBtn = {background:"none",border:"none",color:INK_MUTED,fontSize:13,minHeight:24,padding:"2px 4px",cursor:"pointer",textDecoration:"underline"};

  if(mode==="forgot"){
    return (
      <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
        <Card style={{maxWidth:380,width:"100%"}}>
          <h1 style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,margin:"0 0 8px"}}>Passwort vergessen</h1>
          <div style={{fontSize:13,color:INK_MUTED,marginBottom:16}}>Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum Zurücksetzen.</div>
          <form onSubmit={onFormSubmit} noValidate>
            <Field label="E-Mail"><input type="email" autoComplete="username" className="input" value={email} onChange={e=>setEmail(e.target.value)} aria-invalid={error?true:undefined} aria-describedby={descr} /></Field>
            <ErrorText id={errId} style={{marginBottom:12}}>{error}</ErrorText>
            {infoBox}
            <button type="submit" className="btn-primary" style={{width:"100%"}} disabled={loading}>{loading?"Bitte warten…":"Link schicken"}</button>
          </form>
          <div style={{textAlign:"center",marginTop:12}}>
            <button type="button" onClick={()=>{setMode("login");setError("");setInfo("");}} style={linkBtn}>Zurück zur Anmeldung</button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",background:PAPER}}>
      <div className="login-side" style={{flex:"0 0 42%",background:INK,color:"#F6F4EF",padding:"48px 44px",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
        <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.5}}>
          <g fill="none" stroke="#C9A66B" strokeOpacity="0.22">
            <path d="M40 600V300a90 90 0 0 1 180 0v300M75 600V320a55 55 0 0 1 110 0v280" />
            <path d="M250 600V300a90 90 0 0 1 180 0v300M285 600V320a55 55 0 0 1 110 0v280" />
          </g>
        </svg>
        <div style={{display:"flex",alignItems:"center",gap:10,fontFamily:"Fraunces, serif",fontSize:22,position:"relative"}}><Logo size={28} />Ouverture</div>
        <div style={{position:"relative"}}>
          <div style={{fontSize:11.5,letterSpacing:"0.18em",color:"#C9A66B",marginBottom:14}}>PRE-OPENING-SOFTWARE FÜR HOTELS</div>
          <div style={{fontFamily:"Fraunces, serif",fontSize:30,lineHeight:1.2,maxWidth:340}}>Bis zum ersten Gast – <span style={{fontStyle:"italic",color:"#C9A66B"}}>alles im Blick.</span></div>
        </div>
        <div style={{fontSize:12,color:"rgba(246,244,239,0.5)",position:"relative"}}>Aufgaben · Meilensteine · Risiken · KI-Lagebericht</div>
      </div>
      <main style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:20,position:"relative"}}>
      <div style={{position:"absolute",top:16,right:16}}><LanguageSwitcher /></div>
      <Card style={{maxWidth:380,width:"100%"}}>
        <div style={{display:"flex",gap:6,marginBottom:18,background:PAPER,borderRadius:4,padding:4}}>
          <button type="button" aria-pressed={mode==="login"} onClick={()=>{setMode("login");setError("");setInfo("");}}
            style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13.5,fontWeight:600,
              background:mode==="login"?INK:"transparent",color:mode==="login"?"#fff":INK_MUTED}}>Anmelden</button>
          <button type="button" aria-pressed={mode==="register"} onClick={()=>{setMode("register");setError("");setInfo("");}}
            style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13.5,fontWeight:600,
              background:mode==="register"?INK:"transparent",color:mode==="register"?"#fff":INK_MUTED}}>Registrieren</button>
        </div>
        <h1 style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,margin:"0 0 18px"}}>
          {mode==="login" ? "Anmelden" : "Neues Konto erstellen"}
        </h1>
        <form onSubmit={onFormSubmit} noValidate>
          <Field label="E-Mail"><input type="email" autoComplete={mode==="register"?"email":"username"} className="input" value={email} onChange={e=>setEmail(e.target.value)} aria-invalid={error?true:undefined} aria-describedby={descr} /></Field>
          <Field label="Passwort"><input type="password" autoComplete={mode==="register"?"new-password":"current-password"} className="input" value={password} onChange={e=>setPassword(e.target.value)} aria-invalid={error?true:undefined} aria-describedby={descr} /></Field>
          <ErrorText id={errId} style={{marginBottom:12}}>{error}</ErrorText>
          {infoBox}
          <button type="submit" className="btn-primary" style={{width:"100%"}} disabled={loading}>
            {loading?"Bitte warten…":(mode==="login"?"Anmelden":"Konto erstellen")}
          </button>
        </form>
        <OAuthButtons config={config} />
        <div style={{textAlign:"center",marginTop:12,display:"flex",justifyContent:"center",gap:14}}>
          {mode==="login" && <button type="button" onClick={()=>{setMode("forgot");setError("");setInfo("");}} style={linkBtn}>Passwort vergessen?</button>}
        </div>
      </Card>
      </main>
    </div>
  );
}

function ResetPasswordView({config, accessToken, onDone}){
  const [password,setPassword]=useState(""); const [password2,setPassword2]=useState("");
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const submit = async () => {
    setError("");
    if(password.length < 6){ setError("Das Passwort muss mindestens 6 Zeichen haben."); return; }
    if(password !== password2){ setError("Die beiden Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    try { await supabaseSetNewPassword(config.supabaseUrl, config.supabaseAnonKey, accessToken, password); onDone(); }
    catch(e){ setError(e.message); }
    setLoading(false);
  };
  return (
    <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
      <Card style={{maxWidth:380,width:"100%"}}>
        <h1 style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,margin:"0 0 8px"}}>Neues Passwort festlegen</h1>
        <form onSubmit={e=>{e.preventDefault(); submit();}} noValidate>
          <Field label="Neues Passwort"><input type="password" autoComplete="new-password" className="input" value={password} onChange={e=>setPassword(e.target.value)} aria-invalid={error?true:undefined} aria-describedby={error?"reset-error":undefined} /></Field>
          <Field label="Neues Passwort wiederholen"><input type="password" autoComplete="new-password" className="input" value={password2} onChange={e=>setPassword2(e.target.value)} aria-invalid={error?true:undefined} aria-describedby={error?"reset-error":undefined} /></Field>
          <ErrorText id="reset-error" style={{marginBottom:12}}>{error}</ErrorText>
          <button type="submit" className="btn-primary" style={{width:"100%"}} disabled={loading}>{loading?"Bitte warten…":"Passwort speichern"}</button>
        </form>
      </Card>
    </main>
  );
}

// Zeigt die aktuelle Organisation; bei mehreren Mitgliedschaften als Auswahl zum Umschalten.
function OrgSwitcher({orgs, orgId, onSwitch, dark}){
  if(!orgs || orgs.length===0) return null;
  const current = orgs.find(o=>o.id===orgId);
  const style = dark
    ? {width:"100%",background:INK_SOFT,color:"#fff",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"7px 8px",fontSize:12.5}
    : {width:"100%",background:PAPER,color:INK,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 10px",fontSize:13.5};
  return (
    <div className="org-switcher" style={{marginBottom:dark?14:16}}>
      <div style={{fontSize:11,fontWeight:600,letterSpacing:0.4,color:dark?"rgba(255,255,255,0.5)":INK_MUTED,marginBottom:4}}>ORGANISATION</div>
      {orgs.length===1
        ? <div style={{fontSize:13,fontWeight:600,color:dark?"#fff":INK}}>{current ? current.name : ""}</div>
        : <select value={orgId||""} onChange={e=>onSwitch(e.target.value)} style={style}>
            {orgs.map(o=><option key={o.id} value={o.id}>{o.name}{o.role==="admin"?" (Admin)":""}</option>)}
          </select>}
    </div>
  );
}

function HotelSetupView({hotels, orgId, api, onCreated, onSelect, orgs, onSwitchOrg, readOnly}){
  const overview = useOrgOverview(api, orgId, hotels);
  const [showForm,setShowForm] = useState(hotels.length===0 && !readOnly);
  const [form,setForm] = useState({name:"",city:"",country:"",rooms:100,opening_date:"",currency:"EUR"});
  const [saving,setSaving] = useState(false); const [error,setError]=useState("");
  const [demoBusy,setDemoBusy] = useState(false);
  const submit = async () => {
    if(!form.name) return;
    setSaving(true); setError("");
    try { const hotel = await api("/api/hotels","POST",{organization_id:orgId, ...form, rooms:Number(form.rooms)}); onCreated(hotel); }
    catch(e){ setError(e.message); }
    setSaving(false);
  };
  // Beispielhotel: gefülltes Projekt zum Ausprobieren, zählt nicht zum Hotel-Limit
  const hasDemo = hotels.some(h=>h.is_demo);
  const openDemo = async () => {
    setDemoBusy(true); setError("");
    try { onCreated(await api("/api/organizations/"+orgId+"/demo-hotel","POST")); }
    catch(e){ setError(e.message); }
    setDemoBusy(false);
  };
  const demoBox = !hasDemo && (
    <div style={{marginTop:18,paddingTop:16,borderTop:`1px solid ${BORDER}`}}>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>Erst einmal ausprobieren? Das Beispielhotel zeigt ein Projekt 30 Tage vor der Eröffnung – mit Aufgaben, Risiken, Budget und Personal. Es zählt nicht zu deinem Tarif.</div>
      <button onClick={openDemo} disabled={demoBusy} style={{width:"100%",background:"none",border:`1px solid ${BRASS}`,color:INK,borderRadius:4,padding:"9px 14px",fontSize:13.5,fontWeight:600,cursor:"pointer"}}>
        {demoBusy ? "Wird angelegt…" : "Beispielhotel öffnen"}
      </button>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
      <Card style={{maxWidth:440,width:"100%"}}>
        <OrgSwitcher orgs={orgs} orgId={orgId} onSwitch={onSwitchOrg} />
        {!showForm && hotels.length>0 && (
          <React.Fragment>
            <div style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600,marginBottom:14}}>Hotel auswählen</div>
            {hotels.map(h=>(
              <div key={h.id} {...pressable(()=>onSelect(h))} style={{padding:"10px 12px",border:`1px solid ${BORDER}`,borderRadius:8,marginBottom:8,cursor:"pointer"}}>
                <div style={{fontWeight:600,display:"flex",alignItems:"center",gap:8}}>{h.name}{h.is_demo && <Pill color={BRASS} bg={BRASS_SOFT}>Beispiel</Pill>}</div>
                <div style={{fontSize:12.5,color:INK_MUTED}}>{h.city} · {tf("{0} Zimmer", h.rooms)}</div>
                <HotelStats s={overview[h.id]} />
              </div>
            ))}
            {!readOnly && <button className="btn-primary" style={{width:"100%",marginTop:6}} onClick={()=>setShowForm(true)}>+ Neues Hotel</button>}
            {error && <div style={{color:BAD,fontSize:13,marginTop:10}}>{error}</div>}
            {!readOnly && demoBox}
          </React.Fragment>
        )}
        {readOnly && hotels.length===0 && (
          <div style={{fontSize:13.5,color:INK_MUTED}}>In dieser Organisation gibt es noch kein Hotel. Sobald das Projektteam eines anlegt, siehst du es hier.</div>
        )}
        {showForm && (
          <React.Fragment>
            <div style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600,marginBottom:14}}>Neues Hotel</div>
            <Field label="Name"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
            <Field label="Stadt"><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></Field>
            <Field label="Land"><input className="input" value={form.country} onChange={e=>setForm({...form,country:e.target.value})} /></Field>
            <Field label="Zimmeranzahl"><input type="number" className="input" value={form.rooms} onChange={e=>setForm({...form,rooms:e.target.value})} /></Field>
            <Field label="Eröffnungsdatum"><input type="date" className="input" value={form.opening_date} onChange={e=>setForm({...form,opening_date:e.target.value})} /></Field>
            <Field label="Währung für das Budget"><CurrencySelect value={form.currency} onChange={v=>setForm({...form,currency:v})} /></Field>
            {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
            <button className="btn-primary" style={{width:"100%"}} onClick={submit} disabled={saving}>{saving?"Speichert…":"Hotel anlegen"}</button>
            {hotels.length>0 && <button onClick={()=>setShowForm(false)} style={{width:"100%",textAlign:"center",marginTop:8,fontSize:12.5,background:"none",border:"none",color:INK_MUTED,cursor:"pointer"}}>Abbrechen</button>}
            {hotels.length===0 && demoBox}
          </React.Fragment>
        )}
      </Card>
    </div>
  );
}

