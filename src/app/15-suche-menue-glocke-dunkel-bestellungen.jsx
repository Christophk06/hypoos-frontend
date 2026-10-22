// ============================================================ Migration 025: Suche, Menü, Glocke, Handy-Leiste, Dunkelmodus,
// Feedback, Änderungsverlauf, Lieferanten und Bestellungen, Veranstaltungen, Gäste-Chat

// ------------------------------------------------------------ Suche über alles (Strg+K)
function SearchPalette({open, onClose, nav, tasks, milestones, risks, members, hotel, api, onOpen}){
  const dialogRef = useDialog(onClose, open);
  const [q,setQ] = useState(""); const [sel,setSel] = useState(0);
  const [extra,setExtra] = useState({rooms:null, docs:null, events:null});
  const inputRef = React.useRef(null);
  useEffect(()=>{ if(!open) return; setQ(""); setSel(0); setTimeout(()=>inputRef.current && inputRef.current.focus(), 30);
    if(extra.rooms===null){ const base = "/api/hotels/"+hotel.id;
      Promise.all([api(base+"/rooms").catch(()=>[]), api(base+"/documents").catch(()=>[]), api(base+"/events").catch(()=>[])]).then(([rooms,docs,events])=>setExtra({rooms:rooms||[], docs:docs||[], events:Array.isArray(events)?events:[]})); }
  },[open]);
  if(!open) return null;
  const norm = (s) => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const words = norm(q).split(/\s+/).filter(Boolean);
  const hit = (...xs) => { const t = norm(xs.join(" ")); return words.every(w=>t.includes(w)); };
  const openTask = (t) => { try { window.localStorage.setItem(LS_TASK_FILTERS, JSON.stringify({...TASK_FILTER_DEFAULTS, q:t.title})); } catch(e){} onOpen("tasks"); };
  const groups = !words.length ? [[tf("Bereiche"), nav.slice(0,12).map(n=>({icon:"↗", label:translateString(n.label), go:()=>onOpen(n.key)}))]] : [
    [tf("Bereiche"), nav.filter(n=>hit(translateString(n.label), n.label)).map(n=>({icon:"↗", label:translateString(n.label), go:()=>onOpen(n.key)}))],
    [tf("Aufgaben"), (tasks||[]).filter(t=>hit(t.title, t.department, t.owner)).slice(0,8).map(t=>({icon:t.status==="Abgeschlossen"?"✓":"□", label:t.title, sub:[t.department, t.due_date && fmtDate(t.due_date)].filter(Boolean).join(" · "), go:()=>openTask(t)}))],
    [tf("Meilensteine"), (milestones||[]).filter(m=>hit(m.title)).slice(0,5).map(m=>({icon:"◆", label:m.title, sub:fmtDate(m.date), go:()=>onOpen("milestones")}))],
    [tf("Risiken"), (risks||[]).filter(r=>hit(r.title, r.department)).slice(0,5).map(r=>({icon:"alert", label:r.title, sub:r.department, go:()=>onOpen("risks")}))],
    [tf("Zimmer"), (extra.rooms||[]).filter(r=>hit(r.number, r.room_type, r.status)).slice(0,6).map(r=>({icon:"bed", label:r.number, sub:[r.status, r.occupancy].filter(Boolean).join(" · "), go:()=>onOpen("rooms")}))],
    [tf("Personen"), (members||[]).filter(m=>hit(m.email, (m.departments||[]).join(" "))).slice(0,6).map(m=>({icon:"user", label:shortName(m.email), sub:m.email, go:()=>onOpen("team")}))],
    [tf("Dokumente"), (extra.docs||[]).filter(d=>hit(d.name, d.category)).slice(0,5).map(d=>({icon:"filetext", label:d.name, sub:d.category, go:()=>onOpen("docs")}))],
    [tf("Veranstaltungen"), (extra.events||[]).filter(e=>hit(e.title, e.client, e.location)).slice(0,5).map(e=>({icon:"glass", label:e.title, sub:fmtDate(e.event_date), go:()=>onOpen("events")}))],
  ];
  const flat = groups.flatMap(([,items])=>items);
  const choose = (it) => { if(it){ onClose(); it.go(); } };
  const onKey = (e) => {
    if(e.key==="Escape") onClose();
    else if(e.key==="ArrowDown"){ e.preventDefault(); setSel(s=>Math.min(flat.length-1, s+1)); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setSel(s=>Math.max(0, s-1)); }
    else if(e.key==="Enter") choose(flat[sel]);
  };
  let idx = -1;
  return (
    <div className="no-print" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(20,24,31,0.45)",zIndex:200,display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"10vh 14px 14px"}}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={tf("Suchen")} tabIndex={-1} onClick={e=>e.stopPropagation()} style={{outline:"none",background:CARD,width:"100%",maxWidth:560,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden",border:`1px solid ${BORDER}`}}>
        <input ref={inputRef} className="input" style={{border:"none",borderBottom:`1px solid ${BORDER}`,borderRadius:0,fontSize:16,padding:"14px 16px",background:CARD}} placeholder={tf("Suchen: Aufgabe, Zimmer, Person, Dokument, Bereich …")} value={q} onChange={e=>{ setQ(e.target.value); setSel(0); }} onKeyDown={onKey} />
        <div style={{maxHeight:"60vh",overflowY:"auto",padding:"6px 0"}}>
          {flat.length===0 && <div style={{padding:"14px 16px",fontSize:13,color:INK_MUTED}}>{tf("Nichts gefunden.")}</div>}
          {groups.filter(([,items])=>items.length).map(([g,items])=>(
            <div key={g}>
              <div style={{fontSize:11,fontWeight:700,color:INK_MUTED,textTransform:"uppercase",letterSpacing:0.6,padding:"8px 16px 4px"}}>{g}</div>
              {items.map((it)=>{ idx++; const i = idx; return (
                <div key={i} onMouseEnter={()=>setSel(i)} onClick={()=>choose(it)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 16px",cursor:"pointer",background:sel===i?BRASS_SOFT:"transparent"}}>
                  <span style={{width:20,textAlign:"center"}}><Icon n={it.icon} /></span>
                  <span style={{flex:1,minWidth:0}}><span style={{fontSize:14}} data-no-i18n="">{it.label}</span>{it.sub && <span style={{fontSize:12,color:INK_MUTED}} data-no-i18n=""> · {it.sub}</span>}</span>
                  {sel===i && <span style={{fontSize:11,color:INK_MUTED}}>↵</span>}
                </div>); })}
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:INK_MUTED,padding:"7px 16px",borderTop:`1px solid ${BORDER}`}}>{tf("↑↓ auswählen · ↵ öffnen · Esc schließen")}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Menü: Bereiche einklappen und Favoriten
const LS_NAV_COLLAPSED = "hpoos_nav_collapsed", LS_NAV_FAVS = "hpoos_nav_favs";
function useStoredList(key){
  const [v,setV] = useState(()=>{ try { return JSON.parse(window.localStorage.getItem(key)||"[]"); } catch(e){ return []; } });
  const set = (n) => { setV(n); try { window.localStorage.setItem(key, JSON.stringify(n)); } catch(e){} };
  return [v, set];
}
function SideNav({nav, tab, onOpen, accent}){
  const [collapsed,setCollapsed] = useStoredList(LS_NAV_COLLAPSED);
  // Noch nie auf- oder zugeklappt: alle Gruppen zu außer der mit dem geöffneten Bereich
  const [auto,setAuto] = useState(()=>{ try { return window.localStorage.getItem(LS_NAV_COLLAPSED)===null; } catch(e){ return false; } });
  const [favs,setFavs] = useStoredList(LS_NAV_FAVS);
  const favItems = favs.map(k=>nav.find(n=>n.key===k)).filter(Boolean);
  const item = (n, fav) => (
    <div key={(fav?"f-":"")+n.key} className="nav-item nav-row" {...pressable(()=>onOpen(n.key))} style={{padding:"8px 10px 8px 12px",cursor:"pointer",marginBottom:2,fontSize:13.5,display:"flex",alignItems:"center",gap:6,
      borderInlineStart:"2px solid "+(tab===n.key?accent:"transparent"),background:tab===n.key?"rgba(201,166,107,0.08)":"transparent",color:tab===n.key?"#fff":"rgba(255,255,255,0.72)"}}>
      <span style={{flex:1}}>{n.label}</span>
      <button className="nav-star" title={favs.includes(n.key)?tf("Aus Favoriten entfernen"):tf("Zu Favoriten")} aria-label={tf("Favorit")}
        onClick={e=>{ e.stopPropagation(); setFavs(favs.includes(n.key) ? favs.filter(k=>k!==n.key) : [...favs, n.key]); }}
        style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:12,color:favs.includes(n.key)?accent:"rgba(255,255,255,0.35)"}}>{favs.includes(n.key)?"★":"☆"}</button>
    </div>
  );
  const sections = []; nav.forEach(n=>{ const s = n.section || ""; let g = sections.find(x=>x.name===s); if(!g){ g = {name:s, items:[]}; sections.push(g); } g.items.push(n); });
  return (
    <div className="sidenav">
      {favItems.length>0 && <div className="sidenav-favs" style={{marginBottom:6}}>
        <div style={{fontSize:10.5,letterSpacing:0.8,textTransform:"uppercase",color:"rgba(255,255,255,0.38)",margin:"6px 0 4px 12px"}}>★ {tf("Favoriten")}</div>
        {favItems.map(n=>item(n, true))}
      </div>}
      {sections.map(g=>{
        const closed = !!g.name && (auto ? !g.items.some(n=>n.key===tab) : collapsed.includes(g.name));
        return (
          <div key={g.name||"_"} className="sidenav-group">
            {g.name && <button className="nav-section" aria-expanded={!closed} onClick={()=>{
                const now = auto ? sections.filter(x=>x.name && !x.items.some(n=>n.key===tab)).map(x=>x.name) : collapsed;
                setAuto(false); setCollapsed(closed ? now.filter(x=>x!==g.name) : [...now, g.name]); }}
              style={{display:"flex",alignItems:"center",gap:6,width:"100%",background:"none",border:"none",cursor:"pointer",fontSize:10.5,letterSpacing:0.8,textTransform:"uppercase",color:"rgba(255,255,255,0.45)",margin:"14px 0 4px",padding:"0 0 0 12px",textAlign:"start"}}>
              <span style={{flex:1}}>{g.name}</span><span style={{fontSize:10}}>{closed?"▸":"▾"}</span></button>}
            {g.items.filter(n=>!closed || n.key===tab).map(n=>item(n, false))}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ Benachrichtigungs-Zentrale (Glocke)
function NotificationBell({api, onOpen}){
  const [data,setData] = useState({items:[], unread:0}); const [open,setOpen] = useState(false);
  const load = useCallback(()=>{ if(document.hidden) return; api("/api/me/notifications").then(setData).catch(()=>{}); },[api]);
  useEffect(()=>{ load(); const t = setInterval(load, 60000); const v = ()=>load(); document.addEventListener("visibilitychange", v); return ()=>{ clearInterval(t); document.removeEventListener("visibilitychange", v); }; },[load]);
  const openItem = async (n) => {
    setOpen(false);
    if(!n.read_at){ try { await api("/api/me/notifications/read","POST",{ids:[n.id]}); } catch(e){} load(); }
    const m = String(n.url||"").match(/[?&]open=([a-z]+)/); if(m) onOpen(m[1]);
  };
  const readAll = async () => { try { await api("/api/me/notifications/read","POST",{}); } catch(e){} load(); };
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>{ setOpen(!open); if(!open) load(); }} title={tf("Benachrichtigungen")} aria-label={tf("Benachrichtigungen")}
        style={{position:"relative",background:open?BRASS_SOFT:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"5px 10px",fontSize:15,cursor:"pointer",lineHeight:1}}>
        <Icon n="bell" />{data.unread>0 && <span style={{position:"absolute",top:-6,insetInlineEnd:-6,background:BAD,color:"#fff",borderRadius:999,fontSize:10.5,fontWeight:700,padding:"1px 5px",minWidth:16}} data-no-i18n="">{data.unread>99?"99+":data.unread}</span>}
      </button>
      {open && <div className="no-print" style={{position:"absolute",top:"calc(100% + 6px)",insetInlineEnd:0,width:340,maxWidth:"86vw",background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,boxShadow:"0 14px 40px rgba(0,0,0,0.18)",zIndex:120}}>
        <div style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${BORDER}`}}>
          <b style={{flex:1,fontSize:14}}>{tf("Benachrichtigungen")}</b>
          {data.unread>0 && <button style={{...linkBtn,fontSize:12}} onClick={readAll}>{tf("Alle gelesen")}</button>}
        </div>
        <div style={{maxHeight:380,overflowY:"auto"}}>
          {data.items.length===0 && <div style={{padding:"16px 14px",fontSize:13,color:INK_MUTED}}>{tf("Keine Benachrichtigungen.")}</div>}
          {data.items.map(n=>(
            <div key={n.id} {...pressable(()=>openItem(n))} style={{padding:"9px 14px",borderTop:`1px solid ${BORDER}`,cursor:"pointer",background:n.read_at?"transparent":BRASS_SOFT}}>
              <div style={{fontSize:13.5,fontWeight:n.read_at?500:700}} data-no-i18n="">{n.title}</div>
              {n.body && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:2}} data-no-i18n="">{n.body}</div>}
              <div style={{fontSize:11,color:INK_MUTED,marginTop:3}}>{fmtDateTime(n.created_at)}</div>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

// ------------------------------------------------------------ Untere Leiste am Handy (Mitarbeitende)
function MobileTabBar({nav, tab, onOpen}){
  const want = [["dashboard","home"],["roster","calendar"],["time","clock"],["tickets","wrench"],["chat","chat"]];
  const items = want.map(([k,icon])=>{ const n = nav.find(x=>x.key===k); return n && {...n, icon}; }).filter(Boolean);
  if(items.length<3) return null;
  return (
    <div className="mobile-tabbar no-print">
      {items.map(n=>(
        <button key={n.key} onClick={()=>onOpen(n.key)} className={tab===n.key?"on":""}>
          <span style={{fontSize:19,lineHeight:1}}><Icon n={n.icon} /></span><span className="lbl">{String(n.label).replace("●","")}</span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Dunkler Modus
const LS_THEME = "hpoos_theme";
function applyTheme(mode){
  const dark = mode==="dark" || (mode!=="light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}
function ThemeCard(){
  const [mode,setMode] = useState(()=>{ try { return window.localStorage.getItem(LS_THEME)||"auto"; } catch(e){ return "auto"; } });
  const set = (m) => { setMode(m); try { window.localStorage.setItem(LS_THEME, m); } catch(e){} applyTheme(m); };
  return (
    <Card style={{marginBottom:18,maxWidth:520}}>
      <div style={{fontWeight:700,marginBottom:6}}><Icon n="moon" /> {tf("Darstellung")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Dunkel schont die Augen in der Nachtschicht. „Automatisch“ folgt der Einstellung des Geräts.")}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[["auto","Automatisch"],["light","Hell"],["dark","Dunkel"]].map(([k,l])=><button key={k} onClick={()=>set(k)} style={{border:`1px solid ${mode===k?INK:BORDER}`,background:mode===k?INK:CARD,color:mode===k?"#fff":INK,borderRadius:999,padding:"6px 14px",fontSize:13,cursor:"pointer"}}>{tf(l)}</button>)}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ Feedback mit Bildschirmfoto
// embedded: im Hilfe-Fenster des KI-Service (ohne eigenen Knopf, mit vorbefülltem Text)
function FeedbackButton({api, orgId, tab, embedded, initialText, onClose}){
  const [open,setOpen] = useState(!!embedded); const [text,setText] = useState(initialText||""); const [shot,setShot] = useState(null);
  const [busy,setBusy] = useState(""); const [msg,setMsg] = useState(null);
  const capture = async () => {
    setBusy("shot"); setOpen(false);
    try {
      await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await new Promise(r=>setTimeout(r,150));
      const c = await window.html2canvas(document.body, {scale:Math.min(1, 1400/document.body.clientWidth), logging:false, useCORS:true, ignoreElements:(el)=>el.classList && el.classList.contains("feedback-ui")});
      setShot(c.toDataURL("image/jpeg", 0.7));
    } catch(e){ setMsg({ok:false,text:tf("Bildschirmfoto nicht möglich – du kannst trotzdem senden.")}); }
    setOpen(true); setBusy("");
  };
  const send = async () => {
    setBusy("send"); setMsg(null);
    try { await api("/api/feedback","POST",{message:text, page:tab, screenshot:shot, organization_id:orgId}); setText(""); setShot(null); setMsg({ok:true,text:tf("Danke! Wir melden uns, falls wir Fragen haben.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy("");
  };
  if(window.OUVERTURE_DEMO && !embedded) return null;
  const close = () => { setOpen(false); if(onClose) onClose(); };
  return (
    <div className="feedback-ui no-print">
      {!open && !embedded && <button className="feedback-fab" onClick={()=>{ setOpen(true); setMsg(null); }} disabled={busy==="shot"}><Icon n="chat" /> {tf("Feedback")}</button>}
      {open && <div className="feedback-panel" style={{background:CARD,border:`1px solid ${BORDER}`}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:8}}><b style={{flex:1}}>{tf("Feedback oder Problem melden")}</b><button style={linkBtn} aria-label={tf("Schließen")} onClick={close}>✕</button></div>
        <textarea className="input" rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder={tf("Was ist passiert oder was wünschst du dir?")} />
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",margin:"8px 0"}}>
          {shot ? <span style={{fontSize:12.5,color:GOOD}}><Icon n="camera" /> {tf("Bildschirmfoto angehängt")} <button style={{...linkBtn,fontSize:12}} onClick={()=>setShot(null)}>✕</button></span>
            : <button style={smallBtn} onClick={capture}><Icon n="camera" /> {tf("Bildschirmfoto anhängen")}</button>}
        </div>
        {shot && <img src={shot} alt="" style={{width:"100%",maxHeight:140,objectFit:"cover",borderRadius:6,border:`1px solid ${BORDER}`,marginBottom:8}} />}
        <button className="btn-primary" disabled={!text.trim()||busy==="send"} onClick={send}>{busy==="send"?"…":tf("Senden")}</button>
        {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:12.5,marginTop:8}}>{msg.text}</div>}
      </div>}
    </div>
  );
}

// ------------------------------------------------------------ Änderungsverlauf (Admins)
const AUDIT_TABLES = {tasks:"Aufgabe", milestones:"Meilenstein", risks:"Risiko", budget_items:"Budget", staff_positions:"Stelle", shifts:"Schicht", documents:"Dokument", permits:"Genehmigung", procurement_items:"Bestellposition", organization_members:"Teammitglied", hotels:"Hotel", events:"Veranstaltung"};
const AUDIT_ACTIONS = {INSERT:"angelegt", UPDATE:"geändert", DELETE:"gelöscht"};
const AUDIT_FIELDS = {title:"Titel", status:"Status", due_date:"Termin", priority:"Priorität", assignee_id:"Zuständig", department:"Abteilung", date:"Datum", kind:"Art", start_time:"Beginn", end_time:"Ende", user_id:"Person", planned:"Plan", actual:"Ist", headcount:"Anzahl", filled:"Besetzt", role:"Rolle", departments:"Abteilungen", name:"Name", opening_date:"Eröffnungstermin", expires_at:"Gültig bis", probability:"Wahrscheinlichkeit", impact:"Auswirkung", owner:"Verantwortlich", event_date:"Datum", guests:"Gäste", shift_date:"Datum"};
function AuditView({orgId, api, hotel}){
  const [list,setList] = useState(null); const [table,setTable] = useState(""); const [err,setErr] = useState("");
  useEffect(()=>{ setList(null); api("/api/organizations/"+orgId+"/audit?limit=300"+(table?"&table="+table:"")).then(setList).catch(e=>{ setErr(e.message); setList([]); }); },[orgId, table]);
  const val = (v) => { try { const x = JSON.parse(v); return x===null ? "–" : Array.isArray(x) ? x.join(", ") : String(x); } catch(e){ return String(v); } };
  return (
    <Card style={{marginTop:18}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
        <div style={{fontWeight:700,flex:1}}><Icon n="clock" /> {tf("Änderungsverlauf")}</div>
        <select className="input" style={{width:"auto"}} value={table} onChange={e=>setTable(e.target.value)}>
          <option value="">{tf("Alles")}</option>{Object.entries(AUDIT_TABLES).map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}
        </select>
      </div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Wer hat was wann geändert – die letzten Einträge der Organisation. Nur Admins sehen den Verlauf.")}</div>
      {err && <div style={{color:BAD,fontSize:13}}>{err}</div>}
      {list===null ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div> : list.length===0 ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Einträge.")}</div> :
        <div style={{maxHeight:460,overflowY:"auto"}}>{list.map(r=>(
          <div key={r.id} style={{padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
            <div><span style={{color:INK_MUTED}}>{fmtDateTime(r.created_at)}</span> · <b data-no-i18n="">{r.actor_email ? shortName(r.actor_email) : tf("System")}</b> · {tf(AUDIT_TABLES[r.table_name]||r.table_name)} <span data-no-i18n="">„{r.label}“</span> {tf(AUDIT_ACTIONS[r.action]||r.action)}</div>
            {r.action==="UPDATE" && <div style={{fontSize:12,color:INK_MUTED,marginTop:2}}>{Object.entries(r.changes||{}).slice(0,6).map(([k,[a,b]])=><div key={k}>{tf(AUDIT_FIELDS[k]||k)}: <span data-no-i18n="">{val(a)} → {val(b)}</span></div>)}</div>}
          </div>
        ))}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Lieferanten und Bestellungen (im Lager)
const PO_STATUS = {"Entwurf":[INK_MUTED,PAPER], "Bestellt":[BRASS,BRASS_SOFT], "Geliefert":[GOOD,GOOD_SOFT], "Storniert":[BAD,BAD_SOFT]};
function OrdersPanel({hotel, api, onStockChanged}){
  const [open,setOpen] = useState(false);
  const [sup,setSup] = useState([]); const [sugg,setSugg] = useState([]); const [orders,setOrders] = useState([]);
  const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const base = "/api/hotels/"+hotel.id;
  const lead = ACCESS.role==="admin" || ACCESS.role==="manager" || canManageDept("Einkauf");
  const load = useCallback(()=>Promise.all([api(base+"/suppliers").catch(()=>[]), api(base+"/purchase-suggestions").catch(()=>[]), api(base+"/purchase-orders").catch(()=>[])])
    .then(([s,g,o])=>{ setSup(s); setSugg(g); setOrders(o); }),[api, base]);
  useEffect(()=>{ if(open) load(); },[open, load]);
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function"?ok(r):ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const groups = {}; sugg.forEach(i=>{ const k = i.supplier_id||""; (groups[k]=groups[k]||[]).push(i); });
  const supName = (id) => (sup.find(s=>s.id===id)||{}).name || tf("Ohne Lieferant");
  const setItemSup = (i, supplier_id) => run(async()=>{ await api("/api/stock/"+i.stock_item_id+"/ordering","PATCH",{supplier_id}); });
  if(!lead) return null;
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} {...pressable(()=>setOpen(!open))} aria-expanded={open}>
        <div style={{fontWeight:700,flex:1}}><Icon n="truck" /> {tf("Lieferanten und Bestellungen")}</div><span style={{color:INK_MUTED}}>{open?"▴":"▾"}</span>
      </div>
      {open && <div style={{marginTop:12}}>
        {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:8}}>{msg.text}</div>}
        <div className="field-label">{tf("Unter Mindestbestand")}</div>
        {sugg.length===0 ? <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>{tf("Alles über dem Mindestbestand.")}</div> :
          Object.entries(groups).map(([sid,items])=>(
            <div key={sid||"none"} style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><b style={{flex:1}} data-no-i18n="">{supName(sid)}</b>
                {sid && <button className="btn-primary" style={{padding:"6px 12px",fontSize:12.5}} disabled={busy} onClick={()=>run(async()=>api(base+"/purchase-orders","POST",{supplier_id:sid, items}), tf("Bestellung angelegt – unten prüfen und senden."))}>{tf("Bestellung anlegen")}</button>}
              </div>
              {items.map(i=><div key={i.stock_item_id} style={{display:"flex",gap:8,alignItems:"center",fontSize:13,padding:"3px 0",flexWrap:"wrap"}}>
                <span style={{flex:1}} data-no-i18n="">{i.name}</span><span data-no-i18n="">{i.quantity} {i.unit}</span>
                <select className="input" style={{width:"auto",padding:"3px 6px",fontSize:12}} value={i.supplier_id||""} onChange={e=>setItemSup(i, e.target.value||null)}>
                  <option value="">{tf("Lieferant wählen")}</option>{sup.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </div>)}
            </div>
          ))}
        <div className="field-label" style={{marginTop:12}}>{tf("Bestellungen")}</div>
        {orders.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Bestellungen.")}</div>}
        {orders.slice(0,20).map(o=>{ const [c,bg] = PO_STATUS[o.status]||PO_STATUS.Entwurf; return (
          <div key={o.id} style={{borderTop:`1px solid ${BORDER}`,padding:"8px 0",fontSize:13}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <Pill color={c} bg={bg}>{tf(o.status)}</Pill><b data-no-i18n="">{o.supplier_name || tf("Ohne Lieferant")}</b>
              <span style={{color:INK_MUTED}}>{fmtDateTime(o.sent_at || o.created_at)}</span><span style={{flex:1}} />
              {o.status==="Entwurf" && o.supplier_email && <button className="btn-primary" style={{padding:"5px 10px",fontSize:12}} disabled={busy} onClick={()=>run(()=>api("/api/purchase-orders/"+o.id+"/send","POST",{}), tf("Bestellung per E-Mail verschickt."))}>{tf("Per E-Mail senden")}</button>}
              {o.status==="Entwurf" && !o.supplier_email && <span style={{fontSize:12,color:WARN}}>{tf("Lieferant ohne E-Mail")}</span>}
              {o.status==="Bestellt" && <button style={smallBtn} disabled={busy} onClick={()=>run(async()=>{ await api("/api/purchase-orders/"+o.id,"PATCH",{status:"Geliefert"}); if(onStockChanged) onStockChanged(); }, tf("Geliefert – Bestand wurde erhöht."))}>{tf("Geliefert")}</button>}
              {o.status==="Entwurf" && <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Bestellung löschen?"))) run(()=>api("/api/purchase-orders/"+o.id,"DELETE")); }}>✕</button>}
            </div>
            <div style={{color:INK_MUTED,fontSize:12.5,marginTop:3}} data-no-i18n="">{(o.items||[]).map(i=>i.name+" "+i.quantity+" "+i.unit).join(" · ")}</div>
            {o.supplier_status && o.status!=="Entwurf" && <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:4,fontSize:12.5}}>
              {o.supplier_status==="offen"
                ? <span style={{color:INK_MUTED}}>{tf("Lieferant hat noch nicht geantwortet.")}</span>
                : <Pill color={o.supplier_status==="abgelehnt"?BAD:GOOD} bg={o.supplier_status==="abgelehnt"?BAD_SOFT:GOOD_SOFT}>{tf({"bestätigt":"Vom Lieferanten bestätigt","abgelehnt":"Vom Lieferanten abgelehnt","geliefert":"Laut Lieferant geliefert"}[o.supplier_status]||o.supplier_status)}</Pill>}
              {o.supplier_delivery_date && <span>{tf("Liefertermin {0}", fmtDate(o.supplier_delivery_date))}</span>}
              {o.supplier_note && <span style={{color:INK_MUTED}} data-no-i18n="">„{o.supplier_note}“</span>}
              <button style={linkBtn} onClick={async()=>{ try { const r = await api("/api/purchase-orders/"+o.id+"/supplier-link","POST",{}); try { await navigator.clipboard.writeText(r.url); } catch(e){} window.prompt(tf("Link für den Lieferanten (kopiert):"), r.url); } catch(e){ alert(e.message); } }}>{tf("Link für den Lieferanten")}</button>
            </div>}
          </div>); })}
        <div className="field-label" style={{marginTop:12}}>{tf("Lieferanten")}</div>
        {sup.map(s=><div key={s.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:13,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}>
          <b style={{flex:1}} data-no-i18n="">{s.name}</b><span style={{color:INK_MUTED}} data-no-i18n="">{s.email||"–"}</span>
          <button style={linkBtn} onClick={()=>setForm({...s, email:s.email||"", phone:s.phone||""})}>{tf("Bearbeiten")}</button></div>)}
        {!form && <button style={{...linkBtn,paddingInlineStart:0}} onClick={()=>setForm({name:"",email:"",phone:""})}>{tf("+ Lieferant")}</button>}
        {form && <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
          <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label={tf("E-Mail für Bestellungen")}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
          <Field label={tf("Telefon")}><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
          <div style={{marginBottom:14,display:"flex",gap:6}}>
            <button className="btn-primary" disabled={!form.name.trim()} onClick={()=>run(async()=>{ const {id,...b} = form; if(id) await api("/api/suppliers/"+id,"PATCH",b); else await api(base+"/suppliers","POST",b); setForm(null); })}>{tf("Speichern")}</button>
            {form.id && <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Lieferant löschen?"))) run(async()=>{ await api("/api/suppliers/"+form.id,"DELETE"); setForm(null); }); }}>{tf("Löschen")}</button>}
            <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          </div>
        </div>}
      </div>}
    </Card>
  );
}

