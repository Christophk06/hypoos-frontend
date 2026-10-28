// ============================================================ Paket 041 I: Schnittstellen – API-Schlüssel und öffentliche API, Webhooks,
// WhatsApp im Gäste-Chat, Google-Unternehmensprofil. Nur für Admins der Organisation (Server und Datenbank prüfen das zusätzlich).
// Geheimnisse kommen vom Server nie zurück – Ausnahme: neuer API-Schlüssel, neues Webhook-Geheimnis und neuer Prüf-Token je genau einmal.

const igBtn = {...smallBtn, minHeight:44};
const igMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div> : null;
const igCopy = async (text, setMsg) => { try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Kopiert.")}); } catch(e){ setMsg({ok:false,text:tf("Kopieren nicht möglich – bitte den Text markieren.")}); } };
const igNote = (children, color) => <div style={{fontSize:12.5,color:color||INK_MUTED,background:PAPER,borderRadius:6,padding:"8px 10px",marginBottom:12,lineHeight:1.5}}>{children}</div>;
const igWhen = (iso) => iso ? new Date(iso).toLocaleString(UI_LOCALE,{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
const IG_SCOPES = [
  ["read:tasks", "Aufgaben lesen"], ["read:rooms", "Zimmer lesen"], ["read:tickets", "Meldungen lesen"],
  ["read:arrivals", "Anreisen lesen"], ["write:tickets", "Meldungen anlegen"],
];
const IG_EVENTS = [
  ["ticket.created", "Neue Meldung"], ["ticket.done", "Meldung erledigt"], ["task.done", "Aufgabe abgeschlossen"],
  ["arrival.answered", "Gast hat Anreise-Fragen beantwortet"], ["guest_order.created", "Neue Gästebestellung"],
  ["review.created", "Neue Bewertung"], ["application.created", "Neue Bewerbung"],
];
// Einmal angezeigtes Geheimnis mit Kopierknopf
function IgSecretBox({label, value, onClose, setMsg}){
  return (
    <div role="status" style={{border:`1px solid ${WARN}`,background:WARN_SOFT,borderRadius:8,padding:12,marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{label}</div>
      <div style={{fontSize:12.5,color:INK,marginBottom:8}}>{tf("Wird nur jetzt angezeigt. Bitte sicher speichern – wir können ihn später nicht mehr anzeigen.")}</div>
      <code data-no-i18n="" style={{display:"block",wordBreak:"break-all",background:"#fff",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",fontSize:13,marginBottom:8}}>{value}</code>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button style={igBtn} onClick={()=>igCopy(value, setMsg)}>{tf("Kopieren")}</button>
        <button style={igBtn} onClick={onClose}>{tf("Gespeichert, ausblenden")}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 1. API-Schlüssel + kurze API-Doku
function IgApiKeys({api, orgId, hotel}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [fresh,setFresh] = useState(null); const [busy,setBusy] = useState(false); const [doc,setDoc] = useState(false);
  const load = useCallback(()=>api("/api/organizations/"+orgId+"/api-keys").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, orgId]);
  useEffect(()=>{ load(); },[load]);
  const create = async () => { setBusy(true); setMsg(null);
    try { const r = await api("/api/organizations/"+orgId+"/api-keys","POST",{name:form.name, scopes:form.scopes}); setFresh(r.key); setForm(null); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const revoke = async (k) => { if(!window.confirm(tf("Schlüssel „{0}“ widerrufen? Programme, die ihn nutzen, verlieren sofort den Zugriff.", k.name))) return;
    try { await api("/api/api-keys/"+k.id+"/revoke","POST",{}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const toggle = (s) => setForm({...form, scopes: form.scopes.includes(s) ? form.scopes.filter(x=>x!==s) : [...form.scopes, s]});
  return (
    <div>
      {igNote(tf("Mit einem API-Schlüssel können andere Programme (z. B. Kassensystem, Haustechnik, Auswertungen) Daten Ihrer Hotels lesen oder Meldungen anlegen. Jeder Schlüssel hat nur die Rechte, die Sie hier wählen, und gilt für alle Hotels der Organisation."))}
      <div role="note" style={{fontSize:13,color:BAD,background:BAD_SOFT,borderRadius:6,padding:"8px 10px",marginBottom:12,lineHeight:1.5}}>
        <b>{tf("Wichtig:")}</b> {tf("Ein API-Schlüssel gehört der Organisation, nicht der Person, die ihn angelegt hat. Er gilt weiter, wenn diese Person das Team verlässt oder keine Admin-Rechte mehr hat. Beim Ausscheiden eines Admins bitte alle Schlüssel prüfen und nicht mehr benötigte sofort widerrufen.")}
      </div>
      {igMsg(msg)}
      {fresh && <IgSecretBox label={tf("Neuer API-Schlüssel")} value={fresh} setMsg={setMsg} onClose={()=>setFresh(null)} />}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
          <b style={{flex:1}}>{tf("API-Schlüssel")}</b>
          <button style={igBtn} aria-expanded={doc} onClick={()=>setDoc(!doc)}>{doc ? tf("Doku ausblenden") : tf("API-Doku")}</button>
          {!form && <button className="btn-primary" style={{minHeight:44}} onClick={()=>setForm({name:"", scopes:["read:tickets"]})}>{tf("Neuer Schlüssel")}</button>}
        </div>
        {form && (
          <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:10}}>
            <Field label={tf("Name (wofür?)")}><input className="input" maxLength={80} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tf("z. B. Kassensystem")} /></Field>
            <fieldset style={{border:"none",padding:0,margin:"0 0 12px"}}>
              <legend className="field-label">{tf("Berechtigungen")}</legend>
              {IG_SCOPES.map(([s,l])=>(
                <label key={s} style={{display:"flex",gap:8,alignItems:"center",minHeight:36,fontSize:13.5}}>
                  <input type="checkbox" checked={form.scopes.includes(s)} onChange={()=>toggle(s)} /> {tf(l)} <code data-no-i18n="" style={{fontSize:12,color:INK_MUTED}}>{s}</code>
                </label>))}
            </fieldset>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn-primary" style={{minHeight:44}} disabled={busy || !form.name.trim() || !form.scopes.length} onClick={create}>{busy ? tf("Bitte warten…") : tf("Schlüssel erzeugen")}</button>
              <button style={igBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
            </div>
          </div>)}
        {list===null && <div style={{color:INK_MUTED,fontSize:13}}>{tf("Lädt …")}</div>}
        {list && list.length===0 && !form && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine API-Schlüssel.")}</div>}
        {(list||[]).map(k=>(
          <div key={k.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,opacity:k.revoked_at?0.6:1}}>
            <span style={{flex:1,minWidth:200}}>
              <b data-no-i18n="">{k.name}</b> <code data-no-i18n="" style={{fontSize:12,color:INK_MUTED}}>ouv_{k.prefix}…</code>
              <div style={{fontSize:12.5,color:INK_MUTED}}>{(k.scopes||[]).join(", ")} · {tf("angelegt {0}", igWhen(k.created_at))} · {tf("zuletzt genutzt {0}", igWhen(k.last_used_at))}</div>
            </span>
            {k.revoked_at ? <Pill color={INK_MUTED} bg={PAPER}>{tf("widerrufen")}</Pill>
              : <button style={{...igBtn,color:BAD}} onClick={()=>revoke(k)}>{tf("Widerrufen")}</button>}
          </div>))}
      </Card>
      {doc && <IgApiDoc hotel={hotel} />}
    </div>
  );
}
function IgApiDoc({hotel}){
  const base = DEFAULT_CONFIG.backendUrl.replace(/\/$/,"") + "/api/v1";
  const pre = {background:INK,color:"#F6F4EF",borderRadius:6,padding:"10px 12px",fontSize:12.5,overflowX:"auto",whiteSpace:"pre",margin:"6px 0 12px"};
  const rows = [
    ["GET", "/tasks", "read:tasks", tf("Aufgaben (Filter status=open|done)")],
    ["GET", "/rooms", "read:rooms", tf("Zimmer mit Reinigungs- und Belegungsstatus")],
    ["GET", "/tickets", "read:tickets", tf("Meldungen (Filter status=open|done)")],
    ["GET", "/arrivals", "read:arrivals", tf("Anreisen (Filter from, to als JJJJ-MM-TT; ohne E-Mail-Adressen)")],
    ["POST", "/tickets", "write:tickets", tf("Meldung anlegen: hotel_id, title, optional description, location, department, priority (Normal|Dringend)")],
  ];
  return (
    <Card>
      <b>{tf("Kurze API-Doku")}</b>
      <div style={{fontSize:13,color:INK_MUTED,margin:"6px 0 10px",lineHeight:1.55}}>
        {tf("Jede Anfrage braucht den Schlüssel im Header Authorization und die hotel_id des Hotels. Antworten sind JSON: {0} – für die nächste Seite cursor=next_cursor anhängen. limit höchstens 200 (Standard 50). Höchstens 600 Anfragen je Stunde und Schlüssel. Ohne aktives Abo antwortet die API mit 402.", '{"data":[…],"next_cursor":"…"}')}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",fontSize:13,width:"100%"}}>
          <thead><tr>{[tf("Methode"),tf("Pfad"),tf("Berechtigung"),tf("Inhalt")].map(x=><th key={x} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${BORDER}`}}>{x}</th>)}</tr></thead>
          <tbody>{rows.map(r=><tr key={r[0]+r[1]}><td style={{padding:"6px 8px"}} data-no-i18n="">{r[0]}</td><td style={{padding:"6px 8px"}}><code data-no-i18n="">{r[1]}</code></td><td style={{padding:"6px 8px"}}><code data-no-i18n="">{r[2]}</code></td><td style={{padding:"6px 8px"}}>{r[3]}</td></tr>)}</tbody>
        </table>
      </div>
      <div style={{fontSize:13,marginTop:12}}>{tf("Beispiel: offene Meldungen lesen")}</div>
      <pre data-no-i18n="" style={pre}>{'curl -H "Authorization: Bearer ouv_…" \\\n  "'+base+'/tickets?hotel_id='+hotel.id+'&status=open&limit=100"'}</pre>
      <div style={{fontSize:13}}>{tf("Beispiel: Meldung anlegen")}</div>
      <pre data-no-i18n="" style={pre}>{'curl -X POST -H "Authorization: Bearer ouv_…" -H "Content-Type: application/json" \\\n  -d \'{"hotel_id":"'+hotel.id+'","title":"Licht defekt","location":"Zimmer 204","priority":"Normal"}\' \\\n  "'+base+'/tickets"'}</pre>
      <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Fehler: 401 Schlüssel ungültig oder widerrufen · 403 Berechtigung fehlt · 404 Hotel nicht gefunden · 429 zu viele Anfragen.")}</div>
    </Card>
  );
}

// ------------------------------------------------------------ 2. Webhooks
function IgWebhooks({api, orgId, hotel}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [form,setForm] = useState(null);
  const [fresh,setFresh] = useState(null); const [busy,setBusy] = useState(false); const [log,setLog] = useState(null);
  const load = useCallback(()=>api("/api/organizations/"+orgId+"/webhooks").then(r=>setList(r.webhooks||[])).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, orgId]);
  useEffect(()=>{ load(); },[load]);
  const save = async () => { setBusy(true); setMsg(null);
    try {
      const body = {url:form.url.trim(), events:form.events, hotel_id:form.scope==="hotel" ? hotel.id : null};
      if(form.id){ await api("/api/webhooks/"+form.id,"PATCH",body); }
      else { const r = await api("/api/organizations/"+orgId+"/webhooks","POST",body); setFresh(r.secret); }
      setForm(null); load();
    } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const act = async (fn) => { setMsg(null); try { await fn(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const test = (w) => act(async ()=>{ const r = await api("/api/webhooks/"+w.id+"/test","POST",{});
    setMsg(r.ok ? {ok:true,text:tf("Testereignis zugestellt (HTTP {0}).", r.status_code)} : {ok:false,text:tf("Testereignis nicht zugestellt: {0}", r.error || ("HTTP "+r.status_code))});
    if(log && log.id===w.id) showLog(w); });
  const rotate = (w) => act(async ()=>{ if(!window.confirm(tf("Neues Geheimnis erzeugen? Das alte gilt sofort nicht mehr – der Empfänger muss das neue eintragen."))) return;
    const r = await api("/api/webhooks/"+w.id+"/rotate-secret","POST",{}); setFresh(r.secret); });
  const del = (w) => act(async ()=>{ if(!window.confirm(tf("Diesen Webhook löschen?"))) return; await api("/api/webhooks/"+w.id,"DELETE"); load(); });
  const setActive = (w, on) => act(async ()=>{ await api("/api/webhooks/"+w.id,"PATCH",{active:on}); load(); });
  const showLog = (w) => act(async ()=>{ setLog({id:w.id, rows:await api("/api/webhooks/"+w.id+"/deliveries")}); });
  const toggle = (ev) => setForm({...form, events: form.events.includes(ev) ? form.events.filter(x=>x!==ev) : [...form.events, ev]});
  const evName = (ev) => { const x = IG_EVENTS.find(e=>e[0]===ev); return x ? tf(x[1]) : ev; };
  return (
    <div>
      {igNote(tf("Ein Webhook schickt bei bestimmten Ereignissen eine Nachricht (JSON per HTTPS-POST) an ein anderes System. Jede Nachricht ist mit dem Geheimnis signiert: Header X-Ouverture-Signature = sha256=HMAC-SHA256(Geheimnis, Inhalt). Nur https-Adressen im öffentlichen Internet; nach 20 Fehlern in Folge wird der Webhook abgeschaltet. Es werden nur nötige Daten gesendet, keine E-Mail-Adressen oder Telefonnummern."))}
      {igMsg(msg)}
      {fresh && <IgSecretBox label={tf("Signatur-Geheimnis")} value={fresh} setMsg={setMsg} onClose={()=>setFresh(null)} />}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
          <b style={{flex:1}}>{tf("Webhooks")}</b>
          {!form && <button className="btn-primary" style={{minHeight:44}} onClick={()=>setForm({url:"https://", events:["ticket.created"], scope:"all"})}>{tf("Neuer Webhook")}</button>}
        </div>
        {form && (
          <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:10}}>
            <Field label={tf("Ziel-Adresse (https)")}><input className="input" type="url" inputMode="url" maxLength={500} value={form.url} onChange={e=>setForm({...form,url:e.target.value})} /></Field>
            <Field label={tf("Für welche Hotels?")}>
              <select className="input" value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}>
                <option value="all">{tf("Alle Hotels der Organisation")}</option>
                <option value="hotel">{tf("Nur dieses Hotel: {0}", hotel.name)}</option>
              </select>
            </Field>
            <fieldset style={{border:"none",padding:0,margin:"0 0 12px"}}>
              <legend className="field-label">{tf("Ereignisse")}</legend>
              {IG_EVENTS.map(([ev,l])=>(
                <label key={ev} style={{display:"flex",gap:8,alignItems:"center",minHeight:36,fontSize:13.5}}>
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={()=>toggle(ev)} /> {tf(l)} <code data-no-i18n="" style={{fontSize:12,color:INK_MUTED}}>{ev}</code>
                </label>))}
            </fieldset>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn-primary" style={{minHeight:44}} disabled={busy || !form.events.length || !/^https:\/\/.+/.test(form.url.trim())} onClick={save}>{busy ? tf("Bitte warten…") : tf("Speichern")}</button>
              <button style={igBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
            </div>
          </div>)}
        {list===null && <div style={{color:INK_MUTED,fontSize:13}}>{tf("Lädt …")}</div>}
        {list && list.length===0 && !form && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Webhooks.")}</div>}
        {(list||[]).map(w=>(
          <div key={w.id} style={{padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{flex:1,minWidth:200,wordBreak:"break-all"}}><code data-no-i18n="">{w.url}</code>
                <div style={{fontSize:12.5,color:INK_MUTED}}>{(w.events||[]).map(evName).join(", ")} · {w.hotel_id ? tf("ein Hotel") : tf("alle Hotels")}{w.failure_count ? " · "+tf("{0} Fehler in Folge", w.failure_count) : ""}</div>
              </span>
              {w.active ? <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>{tf("aktiv")}</Pill> : <Pill color={w.disabled_at?BAD:INK_MUTED} bg={w.disabled_at?BAD_SOFT:PAPER}>{w.disabled_at ? tf("automatisch abgeschaltet") : tf("pausiert")}</Pill>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              <button style={igBtn} onClick={()=>test(w)}>{tf("Testereignis senden")}</button>
              <button style={igBtn} aria-expanded={!!(log && log.id===w.id)} onClick={()=>log && log.id===w.id ? setLog(null) : showLog(w)}>{tf("Zustellprotokoll")}</button>
              <button style={igBtn} onClick={()=>setForm({id:w.id, url:w.url, events:w.events||[], scope:w.hotel_id?"hotel":"all"})}>{tf("Bearbeiten")}</button>
              <button style={igBtn} onClick={()=>setActive(w, !w.active)}>{w.active ? tf("Pausieren") : tf("Wieder einschalten")}</button>
              <button style={igBtn} onClick={()=>rotate(w)}>{tf("Neues Geheimnis")}</button>
              <button style={{...igBtn,color:BAD}} onClick={()=>del(w)}>{tf("Löschen")}</button>
            </div>
            {log && log.id===w.id && (
              <div style={{marginTop:8,overflowX:"auto"}}>
                {log.rows.length===0 ? <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Noch keine Zustellungen (Protokoll der letzten 30 Tage).")}</div> :
                <table style={{borderCollapse:"collapse",fontSize:12.5,width:"100%"}}>
                  <thead><tr>{[tf("Zeit"),tf("Ereignis"),tf("Ergebnis"),tf("Versuche"),tf("Fehler")].map(x=><th key={x} style={{textAlign:"left",padding:"4px 6px",borderBottom:`1px solid ${BORDER}`}}>{x}</th>)}</tr></thead>
                  <tbody>{log.rows.map(d=><tr key={d.id}>
                    <td style={{padding:"4px 6px",whiteSpace:"nowrap"}}>{igWhen(d.created_at)}</td>
                    <td style={{padding:"4px 6px"}}><code data-no-i18n="">{d.event}</code></td>
                    <td style={{padding:"4px 6px",color:d.ok?GOOD:BAD}}>{d.ok ? tf("zugestellt") : tf("fehlgeschlagen")}{d.status_code ? " ("+d.status_code+")" : ""}</td>
                    <td style={{padding:"4px 6px"}}>{d.attempt}</td>
                    <td style={{padding:"4px 6px"}} data-no-i18n="">{d.error||""}</td></tr>)}</tbody>
                </table>}
              </div>)}
          </div>))}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ 3. WhatsApp (Meta WhatsApp Cloud API)
function IgWhatsApp({api, hotel}){
  const [st,setSt] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [form,setForm] = useState({phone_number_id:"", display_number:"", access_token:"", app_secret:""}); const [verify,setVerify] = useState(null);
  const base = "/api/hotels/"+hotel.id+"/whatsapp";
  const load = useCallback(()=>api(base).then(r=>{ setSt(r); setForm({phone_number_id:r.phone_number_id||"", display_number:r.display_number||"", access_token:"", app_secret:""}); }).catch(e=>{ setMsg({ok:false,text:e.message}); setSt(false); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const save = async (extra) => { setBusy(true); setMsg(null);
    try { const r = await api(base,"PUT",{...form, access_token:form.access_token||undefined, app_secret:form.app_secret||undefined, ...(extra||{})});
      if(r.verify_token) setVerify(r.verify_token);
      setSt(r); setForm({...form, access_token:"", app_secret:""}); setMsg({ok:true,text:tf("Gespeichert.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const disconnect = async () => { if(!window.confirm(tf("WhatsApp für dieses Hotel trennen? Zugangsdaten werden gelöscht."))) return;
    try { await api(base,"DELETE"); setVerify(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(st===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(st===false) return igMsg(msg);
  const ready = st.phone_number_id && st.has_access_token && st.has_app_secret;
  return (
    <div>
      {igNote(<span>{tf("Gäste schreiben dem Hotel per WhatsApp; die Nachrichten erscheinen im Gäste-Chat (ein Verlauf je Telefonnummer), Antworten gehen per WhatsApp zurück. WhatsApp erlaubt freie Antworten nur bis 24 Stunden nach der letzten Nachricht des Gastes.")}<br/><b>{tf("Voraussetzung: ein Meta-Business-Konto mit verifiziertem Unternehmen und eine bei der WhatsApp Cloud API registrierte Nummer. Diese Anbindung ist noch nicht mit einem echten Konto getestet.")}</b></span>, INK)}
      {igMsg(msg)}
      {verify && <IgSecretBox label={tf("Prüf-Token (Verify Token) für Meta")} value={verify} setMsg={setMsg} onClose={()=>setVerify(null)} />}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <b style={{flex:1}}>{tf("Status")}</b>
          {st.enabled ? <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>{tf("eingeschaltet")}</Pill> : <Pill color={INK_MUTED} bg={PAPER}>{tf("aus")}</Pill>}
        </div>
        <ul style={{fontSize:13,margin:"0 0 10px",paddingLeft:18,lineHeight:1.7}}>
          <li>{tf("Phone-Number-ID")}: {st.phone_number_id ? "✓" : tf("fehlt")}</li>
          <li>{tf("Zugangstoken")}: {st.has_access_token ? tf("hinterlegt") : tf("fehlt")}</li>
          <li>{tf("App-Secret (für die Signaturprüfung)")}: {st.has_app_secret ? tf("hinterlegt") : tf("fehlt")}</li>
          <li>{tf("Prüf-Token")}: {st.has_verify_token ? tf("hinterlegt") : tf("fehlt")}</li>
        </ul>
        <Field label={tf("Webhook-Adresse (Callback URL) für die Meta-App")}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input className="input" readOnly value={st.webhook_url} style={{flex:1,minWidth:200}} data-no-i18n="" />
            <button style={igBtn} onClick={()=>igCopy(st.webhook_url, setMsg)}>{tf("Kopieren")}</button>
          </div>
        </Field>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:12}}>{tf("In der Meta-App unter WhatsApp → Konfiguration: Callback URL und Prüf-Token eintragen und das Feld „messages“ abonnieren.")}</div>
      </Card>
      <Card>
        <b>{tf("Einrichtung")}</b>
        <div style={{marginTop:10}}>
          <Field label={tf("Phone-Number-ID")}><input className="input" inputMode="numeric" maxLength={30} value={form.phone_number_id} onChange={e=>setForm({...form,phone_number_id:e.target.value.replace(/\D/g,"")})} /></Field>
          <Field label={tf("Angezeigte Nummer (für Gäste)")}><input className="input" type="tel" maxLength={30} placeholder="+49 …" value={form.display_number} onChange={e=>setForm({...form,display_number:e.target.value})} /></Field>
          <Field label={st.has_access_token ? tf("Zugangstoken ersetzen (leer lassen = behalten)") : tf("Zugangstoken (dauerhafter System-User-Token)")}>
            <input className="input" type="password" autoComplete="off" value={form.access_token} onChange={e=>setForm({...form,access_token:e.target.value})} /></Field>
          <Field label={st.has_app_secret ? tf("App-Secret ersetzen (leer lassen = behalten)") : tf("App-Secret der Meta-App")}>
            <input className="input" type="password" autoComplete="off" value={form.app_secret} onChange={e=>setForm({...form,app_secret:e.target.value})} /></Field>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:12}}>{tf("Token und App-Secret werden nur auf dem Server gespeichert und nie wieder angezeigt.")}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn-primary" style={{minHeight:44}} disabled={busy} onClick={()=>save()}>{busy ? tf("Bitte warten…") : tf("Speichern")}</button>
            {ready && <button style={igBtn} disabled={busy} onClick={()=>save({enabled:!st.enabled})}>{st.enabled ? tf("Ausschalten") : tf("Einschalten")}</button>}
            <button style={igBtn} disabled={busy} onClick={()=>{ if(window.confirm(tf("Neuen Prüf-Token erzeugen? Der alte muss danach auch in der Meta-App ersetzt werden."))) save({new_verify_token:true}); }}>{tf("Neuer Prüf-Token")}</button>
            {(st.has_access_token || st.phone_number_id) && <button style={{...igBtn,color:BAD}} onClick={disconnect}>{tf("Trennen")}</button>}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ 4. Google-Unternehmensprofil
function IgGoogle({api, hotel}){
  const [st,setSt] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [locs,setLocs] = useState(null); const [post,setPost] = useState({summary:"", image_url:"", link:"", action:"LEARN_MORE"});
  const base = "/api/hotels/"+hotel.id+"/google-business";
  const load = useCallback(()=>api(base).then(setSt).catch(e=>{ setMsg({ok:false,text:e.message}); setSt(false); }),[api, base]);
  useEffect(()=>{ load();
    // Rückkehr von Google: ?google=ok|abgebrochen|fehler
    try { const q = new URLSearchParams(window.location.search); const g = q.get("google");
      if(g){ setMsg(g==="ok" ? {ok:true,text:tf("Google-Unternehmensprofil verbunden. Bitte jetzt den Standort wählen.")} : {ok:false,text:tf("Die Verbindung mit Google wurde nicht abgeschlossen.")});
        q.delete("google"); window.history.replaceState(null,"",window.location.pathname+(q.toString()?"?"+q:"")); } } catch(e){}
  },[load]);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const connect = () => run(async ()=>{ const r = await api(base+"/connect","POST",{}); window.location.href = r.url; });
  const loadLocs = () => run(async ()=>{ setLocs(await api(base+"/locations")); });
  const pick = (l) => run(async ()=>{ setSt(await api(base+"/location","PUT",l)); setLocs(null); setMsg({ok:true,text:tf("Standort gespeichert.")}); });
  const publish = () => run(async ()=>{ await api(base+"/post","POST",{...post, language:UI_LANG}); setPost({...post, summary:""}); setMsg({ok:true,text:tf("Beitrag an Google übergeben. Google prüft Beiträge, bevor sie erscheinen.")}); load(); });
  const disconnect = () => run(async ()=>{ if(!window.confirm(tf("Verbindung zu Google trennen?"))) return; await api(base,"DELETE"); load(); });
  const copyAndOpen = async () => { await igCopy([post.summary, post.link].filter(Boolean).join("\n\n"), setMsg); window.open("https://business.google.com/locations", "_blank", "noopener"); };
  if(st===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(st===false) return igMsg(msg);
  const canPost = st.connected && st.location_name;
  return (
    <div>
      {igNote(<span>{tf("Beiträge (Neuigkeiten, Angebote, Veranstaltungen) direkt im Google-Unternehmensprofil des Hotels veröffentlichen.")}<br/><b>{tf("Google muss den Zugang zur Business Profile API für das Projekt erst freischalten (Antrag bei Google). Diese Anbindung ist noch nicht mit einem echten Profil getestet.")}</b></span>, INK)}
      {igMsg(msg)}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <b style={{flex:1}}>{tf("Verbindung")}</b>
          {st.connected ? <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>{tf("verbunden")}</Pill> : <Pill color={INK_MUTED} bg={PAPER}>{tf("nicht verbunden")}</Pill>}
        </div>
        {st.connected && <div style={{fontSize:13,color:INK_MUTED,marginTop:6}}>{tf("Standort")}: <span data-no-i18n="">{st.location_title || st.location_name || "—"}</span>{st.last_post_at ? " · "+tf("letzter Beitrag {0}", igWhen(st.last_post_at)) : ""}</div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          {!st.configured && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Auf dem Server ist die Google-Anmeldung noch nicht eingerichtet. Bis dahin: Text unten schreiben und mit „Text kopieren und Google-Profil öffnen“ selbst einfügen.")}</div>}
          {st.configured && !st.connected && <button className="btn-primary" style={{minHeight:44}} disabled={busy} onClick={connect}>{tf("Mit Google verbinden")}</button>}
          {st.connected && <button style={igBtn} disabled={busy} onClick={loadLocs}>{st.location_name ? tf("Standort ändern") : tf("Standort wählen")}</button>}
          {st.connected && <button style={{...igBtn,color:BAD}} disabled={busy} onClick={disconnect}>{tf("Trennen")}</button>}
        </div>
        {locs && (
          <div style={{marginTop:10}}>
            {locs.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Standorte gefunden.")}</div>}
            {locs.map(l=>(
              <div key={l.account+l.location} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
                <span style={{flex:1}} data-no-i18n="">{l.title}{l.city ? " · "+l.city : ""}<div style={{fontSize:12,color:INK_MUTED}}>{l.account_title}</div></span>
                <button style={igBtn} onClick={()=>pick(l)}>{tf("Wählen")}</button>
              </div>))}
          </div>)}
      </Card>
      <Card>
        <b>{tf("Beitrag")}</b>
        <div style={{marginTop:10}}>
          <Field label={tf("Text (höchstens 1500 Zeichen)")}><textarea className="input" rows={5} maxLength={1500} value={post.summary} onChange={e=>setPost({...post,summary:e.target.value})} /></Field>
          <div style={{fontSize:12,color:INK_MUTED,marginTop:-10,marginBottom:10,textAlign:"right"}}>{post.summary.length}/1500</div>
          <Field label={tf("Bild (optional, öffentliche https-Adresse)")}><input className="input" type="url" inputMode="url" maxLength={500} value={post.image_url} onChange={e=>setPost({...post,image_url:e.target.value})} /></Field>
          <Field label={tf("Link (optional)")}><input className="input" type="url" inputMode="url" maxLength={500} placeholder="https://" value={post.link} onChange={e=>setPost({...post,link:e.target.value})} /></Field>
          {post.link && <Field label={tf("Schaltfläche")}><select className="input" value={post.action} onChange={e=>setPost({...post,action:e.target.value})}>
            <option value="LEARN_MORE">{tf("Mehr erfahren")}</option><option value="BOOK">{tf("Buchen")}</option></select></Field>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {canPost && <button className="btn-primary" style={{minHeight:44}} disabled={busy || !post.summary.trim()} onClick={publish}>{busy ? tf("Bitte warten…") : tf("Bei Google veröffentlichen")}</button>}
            <button style={igBtn} disabled={!post.summary.trim()} onClick={copyAndOpen}>{tf("Text kopieren und Google-Profil öffnen")}</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ Bereich „Schnittstellen“ (nur Admin)
function IntegrationsView({hotel, api, orgId, role}){
  const [tab,setTab] = useState(()=>{ try { return /[?&]google=/.test(window.location.search) ? "google" : "keys"; } catch(e){ return "keys"; } });
  if(role!=="admin") return <Card><div style={{fontSize:13.5,color:INK_MUTED}}>{tf("Schnittstellen verwalten nur Admins der Organisation.")}</div></Card>;
  const tabs = [["keys", tf("API-Schlüssel")], ["webhooks", tf("Webhooks")], ["whatsapp", tf("WhatsApp")], ["google", tf("Google-Profil")]];
  const onKey = (e, i) => { if(e.key!=="ArrowRight" && e.key!=="ArrowLeft") return; const n = (i + (e.key==="ArrowRight"?1:tabs.length-1)) % tabs.length; setTab(tabs[n][0]);
    const el = document.getElementById("ig-tab-"+tabs[n][0]); if(el) el.focus(); };
  return (
    <div>
      <div role="tablist" aria-label={tf("Schnittstellen")} style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {tabs.map(([k,l],i)=>(
          <button key={k} id={"ig-tab-"+k} role="tab" aria-selected={tab===k} aria-controls="ig-panel" tabIndex={tab===k?0:-1} onKeyDown={e=>onKey(e,i)} onClick={()=>setTab(k)}
            style={{...igBtn, background:tab===k?INK:"#fff", color:tab===k?"#fff":INK, fontWeight:600}}>{l}</button>))}
      </div>
      <div id="ig-panel" role="tabpanel" aria-labelledby={"ig-tab-"+tab}>
        {tab==="keys" && <IgApiKeys api={api} orgId={orgId} hotel={hotel} />}
        {tab==="webhooks" && <IgWebhooks api={api} orgId={orgId} hotel={hotel} />}
        {tab==="whatsapp" && <IgWhatsApp api={api} hotel={hotel} />}
        {tab==="google" && <IgGoogle api={api} hotel={hotel} />}
      </div>
    </div>
  );
}
