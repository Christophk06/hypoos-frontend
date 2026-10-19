// ------------------------------------------------------------ Team-Chat
const chatSeenKey = (hotelId) => "hpoos_chat_seen_" + hotelId;
function chatSeen(hotelId){ try { return JSON.parse(window.localStorage.getItem(chatSeenKey(hotelId)) || "{}"); } catch(e){ return {}; } }
function markChatSeen(hotelId, channel, at){ try { const s = chatSeen(hotelId); if(!s[channel] || s[channel] < at){ s[channel] = at; window.localStorage.setItem(chatSeenKey(hotelId), JSON.stringify(s)); } } catch(e){} }
const chatChannels = (role, myDepts) => role==="viewer" ? [] : ["_all", ...visibleDeptsFor(role, myDepts)];
const channelLabel = (c) => c==="_all" ? tf("Ganzes Hotel") : c;

// Anzahl Kanäle mit ungelesenen Nachrichten (für das Menü)
function useChatUnread(api, hotel, me, role, tab){
  const [latest,setLatest] = useState([]);
  const [tick,setTick] = useState(0);
  useEffect(()=>{
    if(!hotel || role==="viewer") return;
    let stop = false;
    const load = () => api("/api/hotels/"+hotel.id+"/chat/latest").then(l=>{ if(!stop) setLatest(l); }).catch(()=>{});
    load(); const t = setInterval(load, 60000);
    return ()=>{ stop = true; clearInterval(t); };
  },[hotel && hotel.id, role, tab]);
  useEffect(()=>{ const f = () => setTick(x=>x+1); window.addEventListener("hpoos-chat-seen", f); return ()=>window.removeEventListener("hpoos-chat-seen", f); },[]);
  if(!hotel) return 0;
  const seen = chatSeen(hotel.id);
  return latest.filter(l=>(!me || l.author_id!==me.id) && (!seen[l.channel] || seen[l.channel] < l.at)).length + 0*tick;
}

function ChatView({hotel, api, me, members, role, myDepts}){
  const channels = chatChannels(role, myDepts);
  const [channel,setChannel] = useRememberedDept("hpoos_chat_channel", channels);
  const [msgs,setMsgs] = useState([]);
  const [latest,setLatest] = useState([]);
  const [text,setText] = useState("");
  const [msg,setMsg] = useState(null);
  const [busy,setBusy] = useState(false);
  const listRef = React.useRef(null);
  const T = useTranslated(api, msgs.map(m=>m.body));
  const base = "/api/hotels/"+hotel.id;
  const lastAt = msgs.length ? msgs[msgs.length-1].created_at : null;
  const seen = (list) => { if(list.length){ markChatSeen(hotel.id, channel, list[list.length-1].created_at); window.dispatchEvent(new Event("hpoos-chat-seen")); } };
  useEffect(()=>{
    if(!channel) return;
    let stop = false; setMsgs([]);
    api(base+"/chat?channel="+encodeURIComponent(channel)).then(l=>{ if(!stop){ setMsgs(l); seen(l); } }).catch(e=>setMsg({ok:false,text:e.message}));
    return ()=>{ stop = true; };
  },[channel, hotel.id]);
  // neue Nachrichten alle 8 Sekunden, solange der Chat offen ist
  useEffect(()=>{
    if(!channel) return;
    const t = setInterval(()=>{
      if(document.hidden) return;
      api(base+"/chat?channel="+encodeURIComponent(channel)+(lastAt ? "&after="+encodeURIComponent(lastAt) : "")).then(l=>{ if(l.length){ setMsgs(m=>{ const ids = new Set(m.map(x=>x.id)); const all = [...m, ...l.filter(x=>!ids.has(x.id))]; seen(all); return all; }); } }).catch(()=>{});
      api(base+"/chat/latest").then(setLatest).catch(()=>{});
    }, 8000);
    return ()=>clearInterval(t);
  },[channel, lastAt]);
  useEffect(()=>{ api(base+"/chat/latest").then(setLatest).catch(()=>{}); },[channel]);
  useEffect(()=>{ if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; },[msgs.length]);
  const send = async () => {
    const body = text.trim(); if(!body) return;
    setBusy(true); setMsg(null);
    try { const m = await api(base+"/chat","POST",{channel, body}); setText(""); setMsgs(x=>[...x, m]); seen([m]); }
    catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false);
  };
  const del = async (m) => { if(!window.confirm(tf("Nachricht löschen?"))) return; try { await api("/api/chat/"+m.id,"DELETE"); setMsgs(x=>x.filter(y=>y.id!==m.id)); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(!channels.length) return <Card><div style={{color:INK_MUTED}}>{tf("Der Chat ist für das Team.")}</div></Card>;
  const seenMap = chatSeen(hotel.id);
  const unread = (c) => latest.some(l=>l.channel===c && c!==channel && (!me || l.author_id!==me.id) && (!seenMap[c] || seenMap[c] < l.at));
  const canDelete = (m) => (me && m.author_id===me.id) || role==="admin" || (m.channel!=="_all" && canManageDept(m.channel));
  let lastDay = null;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}><TranslateToggle t={T} /></div>
      <div className="no-print" style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12}}>
        {channels.map(c=>(
          <button key={c} onClick={()=>setChannel(c)} style={{flexShrink:0,border:`1px solid ${c===channel?INK:BORDER}`,background:c===channel?INK:"#fff",color:c===channel?"#fff":INK,
            borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer",whiteSpace:"nowrap",position:"relative"}}>
            {c==="_all" ? "# " : ""}<span>{channelLabel(c)}</span>{unread(c) && <span style={{color:BAD,marginInlineStart:5}}>●</span>}
          </button>
        ))}
      </div>
      <Card style={{padding:0,display:"flex",flexDirection:"column",height:"min(68vh, 640px)"}}>
        <div ref={listRef} style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
          {msgs.length===0 && <div style={{color:INK_MUTED,fontSize:13.5,textAlign:"center",marginTop:30}}>{tf("Noch keine Nachrichten. Schreib die erste!")}</div>}
          {msgs.map(m=>{
            const mine = me && m.author_id===me.id; const day = toLocalInput(m.created_at).slice(0,10);
            const showDay = day!==lastDay; lastDay = day;
            return (
              <React.Fragment key={m.id}>
                {showDay && <div style={{textAlign:"center",fontSize:11.5,color:INK_MUTED,margin:"10px 0 8px"}} data-no-i18n="">{fmtDay(day,{weekday:"long",day:"2-digit",month:"long"})}</div>}
                <div style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:6}}>
                  <div style={{maxWidth:"78%",background:mine?BRASS_SOFT:PAPER,border:`1px solid ${mine?BRASS+"55":BORDER}`,borderRadius:12,padding:"7px 11px"}}>
                    {!mine && <div style={{fontSize:11.5,fontWeight:700,color:BRASS,marginBottom:2}} data-no-i18n="">{memberLabel(members, me, m.author_id)}</div>}
                    <div style={{fontSize:14,whiteSpace:"pre-wrap",wordBreak:"break-word"}}><TrText text={m.body} tr={T.tr} /></div>
                    <div style={{fontSize:10.5,color:INK_MUTED,textAlign:"end",marginTop:2}} data-no-i18n="">{fmtClock(m.created_at)}
                      {canDelete(m) && <button style={{...linkBtn,fontSize:10.5,padding:"0 0 0 6px"}} onClick={()=>del(m)} title={tf("Löschen")}>✕</button>}</div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {msg && <div style={{color:BAD,fontSize:13,padding:"0 16px 6px"}}>{msg.text}</div>}
        <div style={{display:"flex",gap:8,padding:10,borderTop:`1px solid ${BORDER}`}}>
          <textarea className="input" rows={1} value={text} onChange={e=>setText(e.target.value)} placeholder={tf("Nachricht an {0} …", channelLabel(channel))}
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} style={{flex:1,resize:"none",fontFamily:"inherit",minHeight:40,maxHeight:120}} />
          <MicButton onText={(x)=>setText(v=>appendText(v,x))} />
          <button className="btn-primary" disabled={busy || !text.trim()} onClick={send}>{tf("Senden")}</button>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ PMS-Anbindung und Datei-Import (Zimmerstatus)
function PmsCard({hotel, api, onSynced}){
  const [conn,setConn] = useState(undefined);
  const [open,setOpen] = useState(false);
  const [form,setForm] = useState(null);
  const [token,setToken] = useState("");
  const [apaleo,setApaleo] = useState({client_id:"", client_secret:""});
  const [msg,setMsg] = useState(null);
  const [busy,setBusy] = useState(false);
  const base = "/api/hotels/"+hotel.id+"/pms";
  const load = useCallback(()=>api(base).then(c=>{ setConn(c); setForm(c ? {provider:c.provider, ...c.settings} : {provider:"", env:"demo", use_demo_hotel:true, sync_occupancy:true, push_status:true, create_missing:true, import_arrivals:true, property_id:""}); }).catch(()=>setConn(null)),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const act = async (fn, ok) => { setBusy(true); setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function" ? ok(r) : ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  if(conn===undefined || !form) return null;
  const save = () => act(async()=>{
    if(!form.provider){ if(conn) await api(base,"DELETE"); return; }
    const {provider, ...settings} = form;
    await api(base,"PUT",{provider, settings, access_token: token || undefined, ...(provider==="apaleo" && apaleo.client_id && apaleo.client_secret ? apaleo : {})}); setToken(""); setApaleo({client_id:"", client_secret:""});
  }, tf("Gespeichert."));
  const sync = () => act(async()=>{ const r = await api(base+"/sync","POST",{}); if(onSynced) onSynced(); return r; },
    (r)=>tf("Abgleich fertig: {0} Zimmer neu, {1} geändert.", r.created, r.updated));
  const res = conn && conn.last_result;
  const status = !conn ? tf("Nicht verbunden") : conn.provider==="mews" ? "Mews" : conn.provider==="apaleo" ? "Apaleo" : tf("Webhook (anderes PMS)");
  const chk = (k, label) => <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,margin:"6px 0",cursor:"pointer"}}><input type="checkbox" checked={!!form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} /> {label}</label>;
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{fontWeight:700,flex:1}}>{tf("PMS-Anbindung")} <span style={{fontWeight:400,color:conn?GOOD:INK_MUTED,fontSize:13}}>· {status}</span></div>
        {conn && conn.last_sync_at && <span style={{fontSize:12,color:INK_MUTED}}>{tf("Letzter Abgleich: {0}", fmtDateTime(conn.last_sync_at))}</span>}
        <span style={{color:INK_MUTED}}>{open?"▴":"▾"}</span>
      </div>
      {open && (
        <div style={{marginTop:12}}>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Zimmerstatus und Belegung automatisch mit dem Hotelprogramm (PMS) abgleichen. Mews wird direkt angebunden, andere Systeme (z. B. Protel, Apaleo, Opera) über einen Webhook – oder per Datei-Import.")}</div>
          <Field label={tf("System")}>
            <select className="input" value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})}>
              <option value="">{tf("Keine Anbindung")}</option><option value="mews">Mews</option><option value="apaleo">Apaleo</option><option value="webhook">{tf("Anderes PMS (Webhook)")}</option>
            </select>
          </Field>
          {form.provider==="mews" && (
            <div style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div className="field-label">{tf("Umgebung")}</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:6}}>
                {[["demo",tf("Mews-Testumgebung")],["production",tf("Produktiv")]].map(([k,l])=><label key={k} style={{fontSize:13,display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}><input type="radio" checked={form.env===k} onChange={()=>setForm({...form,env:k})} /> {l}</label>)}
              </div>
              {form.env==="production" && <div style={{fontSize:12.5,color:WARN,marginBottom:6}}>{tf("Für den Produktivbetrieb muss Ouverture von Mews als Partner freigeschaltet sein. Bis dahin bitte die Testumgebung oder den Webhook nutzen.")}</div>}
              {form.env==="demo" && chk("use_demo_hotel", tf("Öffentliches Mews-Testhotel verwenden (Beispieldaten, ohne eigenen Schlüssel)"))}
              {!(form.env==="demo" && form.use_demo_hotel) && (
                <Field label={tf("Access Token aus Mews (Marketplace → Ouverture)")}>
                  <input className="input" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder={conn && conn.has_token ? tf("gespeichert – nur zum Ändern neu eingeben") : ""} />
                </Field>
              )}
              {chk("sync_occupancy", tf("Belegung übernehmen (Anreise, Abreise, belegt)"))}
              {chk("push_status", tf("Zimmerstatus nach Mews zurückschreiben"))}
              {chk("create_missing", tf("Fehlende Zimmer automatisch anlegen"))}
            </div>
          )}
          {form.provider==="apaleo" && (
            <div style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("In Apaleo unter „Apps → Connected Apps → Add app“ eine eigene App mit „Client Credentials“ anlegen und Client-ID und Secret hier eintragen.")}</div>
              <Field label={tf("Property-Code (z. B. MUC)")}><input className="input" style={{width:160}} value={form.property_id||""} onChange={e=>setForm({...form,property_id:e.target.value})} /></Field>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Field label="Client-ID"><input className="input" autoComplete="off" value={apaleo.client_id} onChange={e=>setApaleo({...apaleo,client_id:e.target.value})} placeholder={conn && conn.has_token ? tf("gespeichert – nur zum Ändern neu eingeben") : ""} /></Field>
                <Field label="Client-Secret"><input className="input" type="password" autoComplete="off" value={apaleo.client_secret} onChange={e=>setApaleo({...apaleo,client_secret:e.target.value})} /></Field>
              </div>
              {chk("sync_occupancy", tf("Belegung übernehmen (Anreise, Abreise, belegt)"))}
              {chk("push_status", tf("Zimmerstatus nach Apaleo zurückschreiben"))}
              {chk("create_missing", tf("Fehlende Zimmer automatisch anlegen"))}
              {chk("import_arrivals", tf("Anreisen für die Mail vor der Anreise übernehmen"))}
            </div>
          )}
          {form.provider==="webhook" && conn && conn.provider==="webhook" && conn.webhook_url && (
            <div style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:12.5}}>
              <div className="field-label">{tf("Webhook-Adresse (geheim halten)")}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <code style={{flex:1,overflowX:"auto",whiteSpace:"nowrap",background:"#fff",border:`1px solid ${BORDER}`,borderRadius:4,padding:"6px 8px"}} data-no-i18n="">{conn.webhook_url}</code>
                <button style={smallBtn} onClick={()=>{ try { navigator.clipboard.writeText(conn.webhook_url); setMsg({ok:true,text:tf("Kopiert.")}); } catch(e){} }}>{tf("Kopieren")}</button>
              </div>
              <div style={{color:INK_MUTED,margin:"8px 0 4px"}}>{tf("Das PMS (oder ein Dienst wie Make/Zapier) schickt per POST:")}</div>
              <pre dir="ltr" style={{background:"#fff",border:`1px solid ${BORDER}`,borderRadius:4,padding:8,margin:0,fontSize:11.5,overflowX:"auto"}} data-no-i18n="">{'{"rooms":[{"number":"101","status":"dirty","occupancy":"departure"}]}'}</pre>
              <div style={{color:INK_MUTED,marginTop:4}}>{tf("status: dirty, clean, inspected, out of order · occupancy: vacant, occupied, departure, arrival")}</div>
              <button style={{...linkBtn,paddingInlineStart:0,marginTop:6}} onClick={()=>{ if(window.confirm(tf("Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr."))) act(()=>api(base+"/rotate-token","POST",{}), tf("Neue Adresse erzeugt.")); }}>{tf("Neue Adresse erzeugen")}</button>
            </div>
          )}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <button className="btn-primary" disabled={busy} onClick={save}>{tf("Speichern")}</button>
            {conn && (conn.provider==="mews" || conn.provider==="apaleo") && <button style={smallBtn} disabled={busy} onClick={sync}>{busy ? "…" : tf("Jetzt abgleichen")}</button>}
            {res && !res.ok && <span style={{fontSize:12.5,color:BAD}} data-no-i18n="">{res.error}</span>}
            {res && res.ok && res.via!=="webhook" && <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Zuletzt: {0} Zimmer neu, {1} geändert.", res.created||0, res.updated||0)}</span>}
            {res && res.ok && res.via==="webhook" && <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Zuletzt per Webhook: {0} Zimmer geändert.", res.updated||0)}</span>}
          </div>
          {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
        </div>
      )}
    </Card>
  );
}

// Zimmerstatus/Belegung aus einer Excel- oder CSV-Datei (Export aus jedem PMS)
function RoomImportButton({hotel, api, onDone, onMsg}){
  const [busy,setBusy] = useState(false);
  const pick = async (file) => {
    if(!file) return;
    setBusy(true);
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const wb = XLSX.read(await file.arrayBuffer(), {type:"array"});
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:""});
      const keyOf = (h) => { const k = String(h).toLowerCase(); if(/zimmer|room|nr\.?$|^nummer|number/.test(k)) return "number"; if(/belegung|occupancy|res(ervation)?\s*status|anreise|abreise/.test(k)) return "occupancy"; if(/status|housekeeping|reinigung|hk/.test(k)) return "status"; return null; };
      const rows = raw.map(r=>{ const o = {}; Object.keys(r).forEach(h=>{ const k = keyOf(h); if(k && o[k]===undefined) o[k] = r[h]; }); return o; });
      const r = await api("/api/hotels/"+hotel.id+"/rooms/import","POST",{rows});
      onMsg({ok:true, text:tf("{0} Zimmer aktualisiert.", r.updated) + (r.unknown.length ? " "+tf("Unbekannte Zimmer: {0}", r.unknown.join(", ")) : "")});
      onDone();
    } catch(e){ onMsg({ok:false, text:e.message}); }
    setBusy(false);
  };
  return (
    <label style={{...smallBtn,display:"inline-flex",alignItems:"center",gap:6,opacity:busy?0.6:1}} title={tf("Excel- oder CSV-Export aus dem PMS mit den Spalten Zimmer und Status bzw. Belegung")}>
      {busy ? "…" : tf("Aus Datei übernehmen")}
      <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{ pick(e.target.files[0]); e.target.value=""; }} />
    </label>
  );
}

// ------------------------------------------------------------ Automatische Übersetzung von Teamtexten
const LS_AUTO_TR = "hpoos_auto_translate";
const autoTranslateOn = () => { try { return window.localStorage.getItem(LS_AUTO_TR) !== "0"; } catch(e){ return true; } };
let TR_STATUS = null; // null = unbekannt, true/false
const TR_CACHE = {}; // "lang|text" -> Übersetzung
function useTranslated(api, texts){
  const [on,setOn] = useState(autoTranslateOn());
  const [tick,setTick] = useState(0);
  const [enabled,setEnabled] = useState(TR_STATUS);
  useEffect(()=>{ if(TR_STATUS===null && !window.OUVERTURE_DEMO) api("/api/translate/status").then(r=>{ TR_STATUS = !!r.enabled; setEnabled(TR_STATUS); }).catch(()=>{ TR_STATUS = false; setEnabled(false); }); },[]);
  const want = (texts||[]).filter(t=>t && t.trim() && TR_CACHE[UI_LANG+"|"+t]===undefined);
  const key = want.slice(0,60).join("\u0001");
  useEffect(()=>{
    if(!on || !enabled || !want.length) return;
    let stop = false;
    const batch = [...new Set(want)].slice(0,60);
    batch.forEach(t=>{ TR_CACHE[UI_LANG+"|"+t] = null; }); // läuft
    api("/api/translate","POST",{texts:batch, lang:UI_LANG}).then(r=>{ batch.forEach((t,i)=>{ TR_CACHE[UI_LANG+"|"+t] = r.translations[i]; }); if(!stop) setTick(x=>x+1); })
      .catch(()=>{ batch.forEach(t=>{ delete TR_CACHE[UI_LANG+"|"+t]; }); });
    return ()=>{ stop = true; };
  },[key, on, enabled]);
  const tr = (t) => { if(!on || !t) return t; const x = TR_CACHE[UI_LANG+"|"+t]; return x || t; };
  const toggle = (v) => { setOn(v); try { window.localStorage.setItem(LS_AUTO_TR, v?"1":"0"); } catch(e){} };
  return {tr, on, toggle, enabled: !!enabled, tick};
}
// Text mit Übersetzung; Antippen zeigt das Original
function TrText({text, tr, style}){
  const [orig,setOrig] = useState(false);
  const t = tr(text); const differs = t && t !== text;
  return <span style={style} data-no-i18n="">{orig || !differs ? text : t}{differs && <button onClick={()=>setOrig(!orig)} style={{...linkBtn,fontSize:10.5,padding:"0 0 0 6px",verticalAlign:"baseline"}} title={orig ? tf("Übersetzung anzeigen") : tf("Original anzeigen")}>🌐</button>}</span>;
}
function TranslateToggle({t}){
  if(!t.enabled) return null;
  return <label style={{fontSize:12.5,color:INK_MUTED,display:"flex",gap:6,alignItems:"center",cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={t.on} onChange={e=>t.toggle(e.target.checked)} /> 🌐 {tf("Automatisch übersetzen")}</label>;
}

// ------------------------------------------------------------ Stempeln: QR-Code und Offline-Speicher
const LS_CLOCK_QUEUE = "hpoos_clock_queue";
function clockCodeNow(){ try { const c = JSON.parse(window.sessionStorage.getItem("hpoos_clock_code") || "null"); return c && Date.now() - c.at < 15*60000 ? c.code : null; } catch(e){ return null; } }
function rememberClockCode(code){ try { window.sessionStorage.setItem("hpoos_clock_code", JSON.stringify({code, at:Date.now()})); } catch(e){} }
function clockQueue(){ try { return JSON.parse(window.localStorage.getItem(LS_CLOCK_QUEUE) || "[]"); } catch(e){ return []; } }
function setClockQueue(q){ try { window.localStorage.setItem(LS_CLOCK_QUEUE, JSON.stringify(q)); } catch(e){} }
const isNetworkError = (e) => e instanceof TypeError || (typeof navigator!=="undefined" && navigator.onLine===false);
async function flushClockQueue(api){
  const q = clockQueue(); if(!q.length) return {sent:0, errors:[]};
  const left = [], errors = []; let sent = 0;
  for(const it of q){
    try {
      if(it.kind==="in") await api("/api/hotels/"+it.hotel+"/time/clock-in","POST",{department:it.dept, code:it.code, at:it.at});
      else await api("/api/time/clock-out","POST",{break_minutes:it.brk, code:it.code, at:it.at});
      sent++;
    } catch(e){ if(isNetworkError(e)) left.push(it); else errors.push(e.message); }
  }
  setClockQueue(left);
  return {sent, errors};
}

function loadScriptOnce(src){ return new Promise((res, rej)=>{ if(document.querySelector('script[src="'+src+'"]')) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Script")); document.head.appendChild(s); }); }
async function qrSvg(text, cell){
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js");
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  return q.createSvgTag({cellSize: cell || 6, margin: 2, scalable: true});
}
function ClockQrCard({hotel, api, onHotel}){
  const [info,setInfo] = useState(null);
  const [svg,setSvg] = useState("");
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/clock-code").then(async i=>{ setInfo(i); setSvg(await qrSvg(i.url, 5)); }).catch(e=>setMsg({ok:false,text:e.message})),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(!info) return msg ? <Card style={{marginBottom:14}}><div style={{color:BAD,fontSize:13}}>{msg.text}</div></Card> : null;
  const setRequired = async (v) => { try { const r = await api("/api/hotels/"+hotel.id+"/clock-qr","PUT",{required:v}); onHotel({...hotel, clock_qr_required:r.clock_qr_required}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const print = async () => {
    const big = await qrSvg(info.url, 12);
    const w = window.open("", "_blank"); if(!w) return;
    w.document.write('<!doctype html><meta charset="utf-8"><title>'+tf("Stempeln")+'</title><body style="font-family:Inter,Arial,sans-serif;text-align:center;padding:40px">'
      + '<div style="font-size:30px;font-weight:700;margin-bottom:6px">'+tf("Hier stempeln")+'</div><div style="font-size:18px;color:#555;margin-bottom:24px">'+String(info.hotel_name).replace(/[<>&]/g,"")+'</div>'
      + '<div style="width:380px;margin:0 auto">'+big+'</div><div style="font-size:16px;margin-top:24px;color:#333">'+tf("Mit der Handykamera scannen, dann „Kommen“ oder „Gehen“ tippen.")+'</div>'
      + '<script>setTimeout(function(){window.print()},400)<\/script></body>');
    w.document.close();
  };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:220}}>
          <div style={{fontWeight:700,marginBottom:4}}>{tf("Stempeln per QR-Code")}</div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Hänge den Code am Mitarbeitereingang auf. Ist die Pflicht eingeschaltet, kann nur stempeln, wer ihn gerade gescannt hat – Stempeln von zu Hause geht dann nicht.")}</div>
          <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,cursor:"pointer",marginBottom:10}}><input type="checkbox" checked={!!hotel.clock_qr_required} onChange={e=>setRequired(e.target.checked)} /> {tf("Stempeln nur mit QR-Code vor Ort")}</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={print}>{tf("Aushang drucken")}</button>
            <button style={smallBtn} onClick={()=>{ if(window.confirm(tf("Neuen Code erzeugen? Der alte Aushang funktioniert dann nicht mehr."))) api("/api/hotels/"+hotel.id+"/clock-code/rotate","POST",{}).then(load).catch(e=>setMsg({ok:false,text:e.message})); }}>{tf("Neuen Code erzeugen")}</button>
          </div>
          {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
        </div>
        <div style={{width:130,height:130,border:`1px solid ${BORDER}`,borderRadius:6,padding:4,background:"#fff"}} dangerouslySetInnerHTML={{__html:svg}} />
      </div>
    </Card>
  );
}

