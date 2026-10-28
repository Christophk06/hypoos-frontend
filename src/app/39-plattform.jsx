// ============================================================ Paket 041 P: Plattform – Betreiber-Ansicht (Partner, Provision, Auszahlungen,
// Wunschliste moderieren, Nutzungsstatistik), Wunschliste für Kunden, Partner-Code merken, Bereichs-Zählung.
// Rechte prüfen Server und Datenbank (is_platform_admin); die Oberfläche blendet nur aus.

// ------------------------------------------------------------ Partner-Code aus ?partner=CODE merken (60 Tage)
const LS_PARTNER_KEY = "ouv_partner_v1";
try {
  const pc = new URLSearchParams(window.location.search).get("partner");
  if(pc && /^[A-Za-z0-9]{6,12}$/.test(pc)) window.localStorage.setItem(LS_PARTNER_KEY, JSON.stringify({code:pc.toUpperCase(), at:Date.now()}));
} catch(e){}
function partnerCodePending(){
  try {
    const x = JSON.parse(window.localStorage.getItem(LS_PARTNER_KEY) || "null");
    if(x && /^[A-Z0-9]{6,12}$/.test(x.code) && Date.now() - Number(x.at||0) < 60*86400000) return x.code;
  } catch(e){}
  return null;
}
// Nach Anlage der eigenen Organisation aufrufen. Fehler werden ignoriert; der Code wird danach vergessen.
async function claimPartnerAttribution(api, orgId){
  const code = partnerCodePending();
  if(!code || !orgId || window.OUVERTURE_DEMO) return null;
  try { const r = await api("/api/partner-attribution","POST",{code, organization_id:orgId}); try { window.localStorage.removeItem(LS_PARTNER_KEY); } catch(e){} return r; }
  catch(e){ if(e && e.status && e.status!==429) { try { window.localStorage.removeItem(LS_PARTNER_KEY); } catch(x){} } return null; }
}

// ------------------------------------------------------------ Bereichs-Zählung beim Tab-Wechsel
// Höchstens 1× je Bereich und Minute, nie in der Demo, Fehler werden ignoriert. Zählt nur Organisation + Bereich.
const TRACK_LAST = {};
function trackArea(area, orgId){
  try {
    if(window.OUVERTURE_DEMO || !area || !LAST_API || !LAST_API.url) return;
    const a = String(area).toLowerCase();
    if(!/^[a-z0-9_-]{1,40}$/.test(a)) return;
    let org = orgId; if(!org){ try { org = window.localStorage.getItem(LS_ORG_KEY); } catch(e){} }
    if(!org || !/^[0-9a-f-]{36}$/i.test(String(org))) return;
    const k = org+"|"+a, now = Date.now();
    if(TRACK_LAST[k] && now - TRACK_LAST[k] < 60000) return;
    TRACK_LAST[k] = now;
    const token = (Session.current && Session.current.access_token) || LAST_API.token;
    if(!token) return;
    apiCall(LAST_API.url, token, "/api/usage", "POST", {area:a, organization_id:org}, true).catch(()=>{});
  } catch(e){}
}

// Ist die angemeldete Person Betreiber? (null = lädt) – für den Menüpunkt „Plattform“
function usePlatformAdmin(api){
  const [admin,setAdmin] = useState(null);
  useEffect(()=>{ let on = true;
    if(window.OUVERTURE_DEMO){ setAdmin(false); return; }
    api("/api/platform/me").then(r=>{ if(on) setAdmin(!!(r && r.admin)); }).catch(()=>{ if(on) setAdmin(false); });
    return ()=>{ on = false; }; },[api]);
  return admin;
}

const plBtn = {...smallBtn, minHeight:44};
const plMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div> : null;
const plMoney = (n, cur) => { try { return new Intl.NumberFormat(UI_LOCALE,{style:"currency",currency:cur||"EUR"}).format(Number(n)||0); } catch(e){ return (Number(n)||0).toFixed(2)+" "+(cur||"EUR"); } };
const plCopy = async (text, setMsg) => { try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Kopiert.")}); } catch(e){ setMsg({ok:false,text:tf("Kopieren nicht möglich – bitte den Text markieren.")}); } };
const plTabs = (tab, setTab, list) => (
  <div role="tablist" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
    {list.map(([k,label])=><button key={k} role="tab" aria-selected={tab===k} style={{...plBtn,background:tab===k?INK:"#fff",color:tab===k?"#fff":INK}} onClick={()=>setTab(k)}>{label}</button>)}
  </div>);
const FR_STATUS_LIST = ["neu","geplant","in Arbeit","fertig","abgelehnt"];
const frStatusLabel = (s) => ({"neu":tf("Neu"),"geplant":tf("Geplant"),"in Arbeit":tf("In Arbeit"),"fertig":tf("Fertig"),"abgelehnt":tf("Abgelehnt")})[s] || s;
const frStatusColor = (s) => s==="fertig" ? {color:GOOD_TEXT,bg:GOOD_SOFT} : s==="abgelehnt" ? {color:BAD,bg:BAD_SOFT} : s==="neu" ? {color:INK_MUTED,bg:PAPER} : {color:BRASS,bg:BRASS_SOFT};
const subStatusLabel = (s) => ({trialing:tf("Testphase"),active:tf("Aktiv"),past_due:tf("Zahlung offen"),canceled:tf("Gekündigt"),unpaid:tf("Unbezahlt"),incomplete:tf("Unvollständig")})[s] || "—";

// ============================================================ Betreiber-Ansicht
function PlatformView({api}){
  const [me,setMe] = useState(null);
  const [tab,setTab] = useState("partners");
  useEffect(()=>{ let on = true; api("/api/platform/me").then(r=>{ if(on) setMe(r||{}); }).catch(()=>{ if(on) setMe({}); }); return ()=>{ on = false; }; },[api]);
  if(me===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(!me.admin) return <Card>{tf("Dieser Bereich ist nur für den Betreiber von Ouverture.")}</Card>;
  if(!me.mfa) return <Card style={{borderColor:WARN}}>{tf("Der Betreiber-Bereich ist nur mit Zwei-Faktor-Anmeldung erreichbar. Bitte die Zwei-Faktor-Anmeldung im Konto einrichten bzw. mit dem Code aus der Authenticator-App bestätigen und die Seite neu laden.")}</Card>;
  return (
    <div>
      {plTabs(tab, setTab, [["partners",tf("Partner")],["wishes",tf("Wunschliste")],["usage",tf("Nutzung")]])}
      {tab==="partners" && <PlatformPartners api={api} />}
      {tab==="wishes" && <PlatformWishes api={api} />}
      {tab==="usage" && <PlatformUsage api={api} />}
    </div>
  );
}

function PlatformPartners({api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [open,setOpen] = useState(null);
  const [form,setForm] = useState(null); const [busy,setBusy] = useState(false);
  const load = useCallback(()=>api("/api/platform/partners").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api]);
  useEffect(()=>{ load(); },[load]);
  const save = async () => { setBusy(true); setMsg(null);
    try {
      const body = {name:form.name, company:form.company, email:form.email, code:form.code, commission_percent:form.commission_percent, note:form.note};
      if(form.id) await api("/api/platform/partners/"+form.id,"PATCH",{...body, status:form.status});
      else await api("/api/platform/partners","POST",body);
      setForm(null); setMsg({ok:true,text:tf("Gespeichert.")}); load();
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  const newToken = async (p) => {
    if(!window.confirm(tf("Neuen Dashboard-Link erzeugen? Der bisherige Link funktioniert danach nicht mehr."))) return;
    try { await api("/api/platform/partners/"+p.id,"PATCH",{new_token:true}); setMsg({ok:true,text:tf("Neuer Link erstellt.")}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  const set = (k) => (e) => setForm({...form, [k]:e.target.value});
  return (
    <div>
      {plMsg(msg)}
      {!form && <button className="btn-primary" style={{minHeight:44,marginBottom:14}} onClick={()=>setForm({name:"",company:"",email:"",code:"",commission_percent:"20",note:""})}>+ {tf("Partner anlegen")}</button>}
      {form && <Card style={{marginBottom:14}}>
        <b style={{display:"block",marginBottom:10}}>{form.id ? tf("Partner bearbeiten") : tf("Neuer Partner")}</b>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0 12px"}}>
          <Field label={tf("Name")+" *"}><input className="input" maxLength={120} value={form.name} onChange={set("name")} /></Field>
          <Field label={tf("Firma")}><input className="input" maxLength={160} value={form.company||""} onChange={set("company")} /></Field>
          <Field label={tf("E-Mail")}><input className="input" type="email" maxLength={200} value={form.email||""} onChange={set("email")} /></Field>
          <Field label={tf("Code (6–12 Zeichen A–Z, 0–9; leer = automatisch)")}><input className="input" maxLength={12} value={form.code||""} onChange={e=>setForm({...form, code:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")})} /></Field>
          <Field label={tf("Provision in %")}><input className="input" type="number" min="0" max="50" step="0.5" value={form.commission_percent} onChange={set("commission_percent")} /></Field>
          {form.id && <Field label={tf("Status")}><select className="input" value={form.status} onChange={set("status")}><option value="aktiv">{tf("Aktiv")}</option><option value="pausiert">{tf("Pausiert")}</option></select></Field>}
        </div>
        <Field label={tf("Notiz (nur für den Betreiber)")}><textarea className="input" rows={2} maxLength={1000} value={form.note||""} onChange={set("note")} /></Field>
        {form.id && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Wird der Code geändert, gelten alte Werbelinks nicht mehr.")}</div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" style={{minHeight:44}} disabled={busy || !String(form.name||"").trim()} onClick={save}>{tf("Speichern")}</button>
          <button style={plBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      </Card>}
      {list.length===0 && <div style={{color:INK_MUTED}}>{tf("Noch keine Partner angelegt.")}</div>}
      {list.map(p=>(
        <Card key={p.id} style={{marginBottom:10}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:1,minWidth:180}}>
              <b data-no-i18n="">{p.name}</b>{p.company && <span style={{color:INK_MUTED}} data-no-i18n=""> · {p.company}</span>}
              <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Code")} <b data-no-i18n="">{p.code}</b> · {tf("{0} % Provision", p.commission_percent)} · {tf("{0} Organisationen", p.organizations)}</div>
            </div>
            <Pill {...(p.status==="aktiv" ? {color:GOOD_TEXT,bg:GOOD_SOFT} : {color:INK_MUTED,bg:PAPER})}>{p.status==="aktiv" ? tf("Aktiv") : tf("Pausiert")}</Pill>
            <button style={plBtn} onClick={()=>setForm({...p, commission_percent:String(p.commission_percent)})}>{tf("Bearbeiten")}</button>
            <button style={plBtn} aria-expanded={open===p.id} onClick={()=>setOpen(open===p.id?null:p.id)}>{open===p.id ? tf("Schließen") : tf("Abrechnung")}</button>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8,fontSize:12.5}}>
            <button style={plBtn} onClick={()=>plCopy(p.link, setMsg)}>{tf("Werbelink kopieren")}</button>
            {p.dashboard_link && <button style={plBtn} onClick={()=>plCopy(p.dashboard_link, setMsg)}>{tf("Dashboard-Link kopieren")}</button>}
            <button style={plBtn} onClick={()=>newToken(p)}>{tf("Dashboard-Link erneuern")}</button>
          </div>
          {open===p.id && <PlatformPartnerDetail api={api} id={p.id} />}
        </Card>))}
    </div>
  );
}

function PlatformPartnerDetail({api, id}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null);
  const [pay,setPay] = useState({period:new Date().toISOString().slice(0,7), amount:"", currency:"EUR", paid_at:new Date().toISOString().slice(0,10), note:""});
  const load = useCallback(()=>api("/api/platform/partners/"+id).then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, id]);
  useEffect(()=>{ load(); },[load]);
  if(d===null) return <div style={{color:INK_MUTED,marginTop:10}}>{tf("Lädt …")}</div>;
  if(d===false) return <div style={{marginTop:10}}>{plMsg(msg)}</div>;
  const addPay = async () => { setMsg(null);
    try { await api("/api/platform/partners/"+id+"/payouts","POST",pay); setPay({...pay, amount:"", note:""}); setMsg({ok:true,text:tf("Auszahlung erfasst.")}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const delPay = async (x) => { if(!window.confirm(tf("Diese Auszahlung löschen?"))) return;
    try { await api("/api/platform/payouts/"+x.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const th = {textAlign:"start",padding:6,fontSize:12,color:INK_MUTED}, td = {padding:6,borderTop:`1px solid ${BORDER}`};
  return (
    <div style={{marginTop:12,borderTop:`1px solid ${BORDER}`,paddingTop:12}}>
      {plMsg(msg)}
      {!d.stripe_available && <div style={{fontSize:13,color:WARN,marginBottom:8}}>{tf("Stripe ist nicht eingerichtet – bezahlte Umsätze können nicht gelesen werden. Es gibt nur die Schätzung.")}</div>}
      {d.stripe_error && <div style={{fontSize:13,color:WARN,marginBottom:8}}>{tf("Stripe war teilweise nicht erreichbar – die Zahlen sind unvollständig.")}</div>}
      <b>{tf("Zugeordnete Organisationen")}</b>
      {d.organizations.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5,margin:"6px 0 12px"}}>{tf("Noch keine Organisation über diesen Partner.")}</div> :
      <div style={{overflowX:"auto",margin:"6px 0 14px"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
        <thead><tr><th style={th}>{tf("Organisation")}</th><th style={th}>{tf("Seit")}</th><th style={th}>{tf("Tarif")}</th><th style={th}>{tf("Abo")}</th><th style={{...th,textAlign:"end"}}>{tf("Bezahlt (netto, Stripe)")}</th><th style={{...th,textAlign:"end"}}>{tf("Schätzung je Monat")}</th></tr></thead>
        <tbody>{d.organizations.map(o=><tr key={o.organization_id}>
          <td style={td} data-no-i18n="">{o.name}</td><td style={td}>{fmtDate(o.attributed_at)}</td><td style={td}>{o.plan_name || "—"}</td><td style={td}>{subStatusLabel(o.status)}</td>
          <td style={{...td,textAlign:"end"}}>{Object.keys(o.revenue_paid).length ? Object.entries(o.revenue_paid).map(([c,v])=><div key={c}>{plMoney(v,c)}</div>) : (o.revenue_source==="stripe" ? plMoney(0,"EUR") : "—")}</td>
          <td style={{...td,textAlign:"end",color:INK_MUTED}}>{o.estimated_monthly_eur ? "≈ "+plMoney(o.estimated_monthly_eur,"EUR") : "—"}</td></tr>)}</tbody>
      </table></div>}
      <b>{tf("Provision je Monat")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"2px 0 6px"}}>{tf("Grundlage: bezahlte Stripe-Rechnungen ohne Steuer im Monat der Zahlung (Jahresabos zählen im Zahlungsmonat).")}</div>
      {d.months.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5,marginBottom:12}}>{tf("Noch keine bezahlten Rechnungen.")}</div> :
      <div style={{overflowX:"auto",marginBottom:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
        <thead><tr><th style={th}>{tf("Monat")}</th><th style={{...th,textAlign:"end"}}>{tf("Umsatz")}</th><th style={{...th,textAlign:"end"}}>{tf("Provision")}</th><th style={{...th,textAlign:"end"}}>{tf("Ausgezahlt")}</th><th style={{...th,textAlign:"end"}}>{tf("Offen")}</th></tr></thead>
        <tbody>{d.months.map(m=><tr key={m.period+m.currency}>
          <td style={td} data-no-i18n="">{m.period}</td><td style={{...td,textAlign:"end"}}>{plMoney(m.revenue,m.currency)}</td><td style={{...td,textAlign:"end"}}>{plMoney(m.commission,m.currency)}</td>
          <td style={{...td,textAlign:"end"}}>{plMoney(m.paid,m.currency)}</td><td style={{...td,textAlign:"end",fontWeight:600,color:m.open>0?WARN:GOOD}}>{plMoney(m.open,m.currency)}</td></tr>)}</tbody>
      </table></div>}
      {d.estimate.monthly_revenue_eur>0 && <Card style={{background:WARN_SOFT,borderColor:WARN,marginBottom:12,padding:12}}>
        <b>{tf("Schätzung – kein abgerechneter Betrag")}</b>
        <div style={{fontSize:13.5,marginTop:4}}>{tf("Für Organisationen ohne bezahlte Stripe-Rechnung aus dem Tarif geschätzt: Umsatz ≈ {0} je Monat, Provision ≈ {1} je Monat.", plMoney(d.estimate.monthly_revenue_eur,"EUR"), plMoney(d.estimate.monthly_commission_eur,"EUR"))}</div>
      </Card>}
      <b>{tf("Auszahlungen")}</b>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:"0 10px",marginTop:6}}>
        <Field label={tf("Monat")}><input className="input" type="month" value={pay.period} onChange={e=>setPay({...pay, period:e.target.value})} /></Field>
        <Field label={tf("Betrag")}><input className="input" inputMode="decimal" value={pay.amount} onChange={e=>setPay({...pay, amount:e.target.value})} /></Field>
        <Field label={tf("Währung")}><input className="input" maxLength={3} value={pay.currency} onChange={e=>setPay({...pay, currency:e.target.value.toUpperCase().replace(/[^A-Z]/g,"")})} /></Field>
        <Field label={tf("Bezahlt am")}><input className="input" type="date" value={pay.paid_at} onChange={e=>setPay({...pay, paid_at:e.target.value})} /></Field>
      </div>
      <Field label={tf("Notiz")}><input className="input" maxLength={500} value={pay.note} onChange={e=>setPay({...pay, note:e.target.value})} /></Field>
      <button className="btn-primary" style={{minHeight:44,marginBottom:10}} disabled={!pay.amount || !pay.period} onClick={addPay}>{tf("Auszahlung erfassen")}</button>
      {d.payouts.map(x=>(
        <div key={x.id} style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <span data-no-i18n="" style={{minWidth:70}}>{x.period}</span><b>{plMoney(x.amount,x.currency)}</b><span style={{color:INK_MUTED,flex:1}}>{fmtDate(x.paid_at)}{x.note ? " · " : ""}<span data-no-i18n="">{x.note||""}</span></span>
          <button style={plBtn} aria-label={tf("Auszahlung löschen")} onClick={()=>delPay(x)}>{tf("Löschen")}</button>
        </div>))}
    </div>
  );
}

function PlatformWishes({api}){
  const [list,setList] = useState(null); const [msg,setMsg] = useState(null); const [filter,setFilter] = useState("");
  const [notes,setNotes] = useState({});
  const load = useCallback(()=>api("/api/platform/feature-requests").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api]);
  useEffect(()=>{ load(); },[load]);
  const patch = async (x, body) => { setMsg(null);
    try { const r = await api("/api/platform/feature-requests/"+x.id,"PATCH",body); setList(list.map(y=>y.id===x.id?{...y,...r}:y)); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  const shown = list.filter(x=>!filter || (filter==="hidden" ? x.hidden : x.status===filter && !x.hidden)).sort((a,b)=>b.vote_count-a.vote_count);
  return (
    <div>
      {plMsg(msg)}
      <select className="input" style={{width:"auto",marginBottom:12}} aria-label={tf("Filter")} value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="">{tf("Alle")}</option>{FR_STATUS_LIST.map(s=><option key={s} value={s}>{frStatusLabel(s)}</option>)}<option value="hidden">{tf("Versteckt")}</option>
      </select>
      {shown.length===0 && <div style={{color:INK_MUTED}}>{tf("Keine Wünsche.")}</div>}
      {shown.map(x=>(
        <Card key={x.id} style={{marginBottom:10,opacity:x.hidden?0.7:1}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:200}}>
              <b dir="auto" data-no-i18n="">{x.title}</b>
              <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("{0} Stimmen", x.vote_count)} · {fmtDate(x.created_at)}{x.organization_name ? " · " : ""}<span data-no-i18n="">{x.organization_name||""}</span>{x.hidden ? " · "+tf("Versteckt") : ""}</div>
              {x.description && <div dir="auto" data-no-i18n="" style={{fontSize:13.5,whiteSpace:"pre-line",marginTop:6}}>{x.description}</div>}
            </div>
            <select className="input" style={{width:"auto",minHeight:44}} aria-label={tf("Status")} value={x.status} onChange={e=>patch(x,{status:e.target.value})}>
              {FR_STATUS_LIST.map(s=><option key={s} value={s}>{frStatusLabel(s)}</option>)}
            </select>
            <button style={plBtn} onClick={()=>patch(x,{hidden:!x.hidden})}>{x.hidden ? tf("Wieder zeigen") : tf("Verstecken")}</button>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            <input className="input" style={{flex:1,minWidth:200}} maxLength={1000} aria-label={tf("Notiz des Betreibers")} placeholder={tf("Notiz des Betreibers")} value={notes[x.id]!==undefined ? notes[x.id] : (x.operator_note||"")} onChange={e=>setNotes({...notes,[x.id]:e.target.value})} />
            <button style={plBtn} disabled={notes[x.id]===undefined} onClick={()=>patch(x,{operator_note:notes[x.id]}).then(()=>{ const n = {...notes}; delete n[x.id]; setNotes(n); })}>{tf("Notiz speichern")}</button>
          </div>
        </Card>))}
    </div>
  );
}

function PlatformUsage({api}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [all,setAll] = useState(false);
  useEffect(()=>{ api("/api/platform/usage").then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }); },[api]);
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(d===false) return plMsg(msg);
  const max = Math.max(1, ...d.areas.map(a=>a.count));
  const orgs = all ? d.organizations : d.organizations.slice(0, 50);
  const daysAgo = (day) => day ? Math.round((Date.now() - new Date(day+"T12:00:00Z").getTime())/86400000) : null;
  return (
    <div>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>{tf("Gezählt werden nur Organisation, Bereich und Tag – keine Personen. Auswertung der letzten 90 Tage.")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:14}}>
        {[[tf("Organisationen gesamt"), d.organizations_total],[tf("Aktiv (7 Tage)"), d.active_7],[tf("Aktiv (30 Tage)"), d.active_30]].map(([l,v])=>
          <Card key={l}><div style={{fontSize:12.5,color:INK_MUTED}}>{l}</div><div style={{fontSize:22,fontWeight:700}}>{v}</div></Card>)}
      </div>
      <Card style={{marginBottom:14}}>
        <b>{tf("Bereiche nach Nutzung (30 Tage)")}</b>
        {d.areas.length===0 && <div style={{color:INK_MUTED,fontSize:13.5,marginTop:6}}>{tf("Noch keine Daten.")}</div>}
        {d.areas.map(a=>(
          <div key={a.area} style={{padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <div style={{display:"flex",gap:10}}><span style={{flex:1}} data-no-i18n="">{a.area}</span><span>{a.count}</span><span style={{color:INK_MUTED,minWidth:110,textAlign:"end"}}>{tf("{0} Organisationen", a.organizations)}</span></div>
            <div aria-hidden="true" style={{height:5,background:PAPER,borderRadius:4,overflow:"hidden",marginTop:3}}><div style={{width:Math.round(a.count*100/max)+"%",height:"100%",background:BRASS}} /></div>
          </div>))}
      </Card>
      <Card style={{marginBottom:14}}>
        <b>{tf("Nie genutzte Bereiche (90 Tage)")}</b>
        <div style={{fontSize:13.5,marginTop:6}} data-no-i18n="">{d.never_used.length ? d.never_used.join(", ") : "—"}</div>
      </Card>
      <Card>
        <b>{tf("Organisationen – zuletzt aktiv")}</b>
        <div style={{overflowX:"auto",marginTop:6}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
          <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{textAlign:"start",padding:6}}>{tf("Organisation")}</th><th style={{textAlign:"start",padding:6}}>{tf("Abo")}</th><th style={{textAlign:"start",padding:6}}>{tf("Zuletzt aktiv")}</th></tr></thead>
          <tbody>{orgs.map(o=>{ const n = daysAgo(o.last_active); return <tr key={o.id} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:6}} data-no-i18n="">{o.name}</td><td style={{padding:6}}>{subStatusLabel(o.status)}</td>
            <td style={{padding:6,color:n===null||n>30?BAD:n>7?WARN:GOOD}}>{o.last_active ? fmtDate(o.last_active)+" ("+tf("vor {0} Tagen", n)+")" : tf("Nicht in den letzten 90 Tagen")}</td></tr>; })}</tbody>
        </table></div>
        {!all && d.organizations.length>50 && <button style={{...plBtn,marginTop:8}} onClick={()=>setAll(true)}>{tf("Alle {0} zeigen", d.organizations.length)}</button>}
      </Card>
    </div>
  );
}

// ============================================================ Wunschliste für Kunden
function FeatureRequestsView({api, me, orgId}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [filter,setFilter] = useState("open");
  const [form,setForm] = useState(null); const [busy,setBusy] = useState(false); const [hp,setHp] = useState("");
  const load = useCallback(()=>api("/api/feature-requests").then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api]);
  useEffect(()=>{ load(); },[load]);
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(d===false) return plMsg(msg);
  const vote = async (x) => { setMsg(null);
    const on = !x.my_vote;
    setD({...d, items:d.items.map(y=>y.id===x.id?{...y, my_vote:on, vote_count:Math.max(0,(y.vote_count||0)+(on?1:-1))}:y)});
    try { await api("/api/feature-requests/"+x.id+"/vote", on?"POST":"DELETE"); } catch(e){ setMsg({ok:false,text:e.message}); load(); } };
  const save = async () => { setBusy(true); setMsg(null);
    try {
      if(form.id) await api("/api/feature-requests/"+form.id,"PATCH",{title:form.title, description:form.description});
      else await api("/api/feature-requests","POST",{title:form.title, description:form.description, organization_id:orgId, website:hp});
      setForm(null); setMsg({ok:true,text:form.id ? tf("Gespeichert.") : tf("Danke! Dein Wunsch ist eingegangen.")}); load();
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false); };
  const shown = d.items.filter(x=>filter==="all" || (filter==="mine" ? x.mine : filter==="done" ? x.status==="fertig" : !["fertig","abgelehnt"].includes(x.status)))
    .sort((a,b)=>b.vote_count-a.vote_count || String(b.created_at).localeCompare(String(a.created_at)));
  const tLen = String(form && form.title || "").trim().length;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Was fehlt dir in Ouverture? Stimme für Wünsche anderer Hotels ab oder reiche einen eigenen ein. Wir sehen die Stimmen und setzen den Status.")}</div>
      {plMsg(msg)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <select className="input" style={{width:"auto",minHeight:44}} aria-label={tf("Filter")} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="open">{tf("Offen")}</option><option value="done">{tf("Umgesetzt")}</option><option value="mine">{tf("Meine Wünsche")}</option><option value="all">{tf("Alle")}</option>
        </select>
        <div style={{flex:1}} />
        {d.can_create && !form && <button className="btn-primary" style={{minHeight:44}} onClick={()=>setForm({title:"",description:""})}>+ {tf("Wunsch einreichen")}</button>}
      </div>
      {form && <Card style={{marginBottom:14}}>
        <Field label={tf("Titel (5–120 Zeichen)")}><input className="input" maxLength={120} dir="auto" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} /></Field>
        <Field label={tf("Beschreibung (freiwillig)")}><textarea className="input" rows={4} maxLength={2000} dir="auto" value={form.description||""} onChange={e=>setForm({...form, description:e.target.value})} /></Field>
        <input className="hp" style={{position:"absolute",width:1,height:1,opacity:0,overflow:"hidden",clipPath:"inset(50%)"}} tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e=>setHp(e.target.value)} />
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Bitte keine Gäste- oder Personendaten eintragen. Andere Kunden sehen Titel und Beschreibung, aber nicht, von wem der Wunsch stammt.")}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" style={{minHeight:44}} disabled={busy || tLen<5} onClick={save}>{form.id ? tf("Speichern") : tf("Einreichen")}</button>
          <button style={plBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      </Card>}
      {shown.length===0 && <div style={{color:INK_MUTED}}>{tf("Hier ist noch nichts.")}</div>}
      {shown.map(x=>{ const sc = frStatusColor(x.status); return (
        <Card key={x.id} style={{marginBottom:10,padding:12}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <button style={{...plBtn,minWidth:58,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:x.my_vote?INK:"#fff",color:x.my_vote?"#fff":INK}}
              aria-pressed={!!x.my_vote} aria-label={x.my_vote ? tf("Stimme zurücknehmen") : tf("Dafür stimmen")} onClick={()=>vote(x)}>
              <span aria-hidden="true">▲</span><b>{x.vote_count||0}</b>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><b dir="auto" data-no-i18n="" style={{flex:1}}>{x.title}</b><Pill color={sc.color} bg={sc.bg}>{frStatusLabel(x.status)}</Pill></div>
              {x.description && <div dir="auto" data-no-i18n="" style={{fontSize:13.5,whiteSpace:"pre-line",marginTop:4}}>{x.description}</div>}
              <div style={{fontSize:12,color:INK_MUTED,marginTop:4}}>{fmtDate(x.created_at)}{x.mine ? " · "+tf("Dein Wunsch") : ""}</div>
              {x.mine && x.status==="neu" && <button style={{...plBtn,marginTop:6}} onClick={()=>setForm({id:x.id, title:x.title, description:x.description||""})}>{tf("Bearbeiten")}</button>}
            </div>
          </div>
        </Card>); })}
    </div>
  );
}
