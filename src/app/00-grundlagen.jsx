const { useState, useEffect, useCallback } = React;

const INK="#1C2430", INK_SOFT="#2A3444", PAPER="#F6F4EF", CARD="#FFFFFF", BORDER="#E4DFD3";
const BRASS="#A9834B", BRASS_SOFT="#F1E8D8", GOOD="#3F7A5C", GOOD_SOFT="#E4EFE8";
const WARN="#B9822E", WARN_SOFT="#F5E9D5", BAD="#A23B32", BAD_SOFT="#F5E1DE", INK_MUTED="#6B7280";

const DEPARTMENTS = ["Rezeption & Empfang","Housekeeping","Food & Beverage","Technik","IT & Systeme","Personal","Einkauf","Sicherheit","Revenue Management","Finanzen & Controlling"];
// Eigene Rolle und Abteilungen in der gewählten Organisation (setzt App bei jedem Anzeigen).
// Die Datenbank erzwingt die Rechte; die Oberfläche blendet nur aus, was nicht geht.
let ACCESS = {role:"admin", depts:[]};
const isLeadRole = () => ACCESS.role==="admin" || ACCESS.role==="manager";
// Abteilungen, in denen man Einträge anlegen darf
// Abteilungsleitung mit zugeordneten Abteilungen: nur diese; ohne Zuordnung (z. B. Direktion): alle
const isScopedManager = () => ACCESS.role==="manager" && (ACCESS.depts||[]).length>0;
function editableDepts(){
  if(ACCESS.role==="admin" || (ACCESS.role==="manager" && !isScopedManager())) return DEPARTMENTS;
  const own = ACCESS.depts || [];
  return DEPARTMENTS.filter(d=>own.includes(d)).concat(own.filter(d=>!DEPARTMENTS.includes(d)));
}
function deptOptions(current){ const list = editableDepts(); return current && !list.includes(current) ? [current, ...list] : list; }
function canManageDept(d){ return ACCESS.role==="admin" || (ACCESS.role==="manager" && (!isScopedManager() || (ACCESS.depts||[]).includes(d))); }
const PRIORITIES = ["Kritisch","Hoch","Mittel","Niedrig"];
const TASK_STATUSES = ["Nicht begonnen","In Arbeit","Blockiert","In Prüfung","Abgeschlossen"];
const MILESTONE_STATUSES = ["Geplant","In Arbeit","Gefährdet","Abgeschlossen"];
const LS_KEY = "hpoos_connection_config_v1";
const LS_INVITE_KEY = "hpoos_pending_invite_v1";
const LS_ORG_KEY = "hpoos_last_org_v1";
const LS_HOTEL_KEY = "hpoos_last_hotel_v1";
// Öffentliche Verbindungsdaten. Der publishable Key darf im Frontend stehen –
// die Daten schützen Login-Pflicht und Row Level Security in der Datenbank.
const DEFAULT_CONFIG = {
  backendUrl: "https://hpoos-backend-1.onrender.com",
  supabaseUrl: "https://czixqievmbftumcavtqr.supabase.co",
  supabaseAnonKey: "sb_publishable_z7UkYgbek05ZFR199O93eg_0MxUM3Nx",
};


function fmtDate(d){ return d ? new Date(d).toLocaleDateString(UI_LOCALE,{day:"2-digit",month:"short",year:"numeric"}) : "—"; }
function priorityColor(p){
  if(p==="Kritisch") return {color:BAD,bg:BAD_SOFT};
  if(p==="Hoch") return {color:WARN,bg:WARN_SOFT};
  if(p==="Mittel") return {color:BRASS,bg:BRASS_SOFT};
  return {color:INK_MUTED,bg:PAPER};
}

/* ------------------------ Fehler an das Backend melden ------------------------
   Landet im Server-Protokoll und (falls eingerichtet) als Sammel-Mail beim Betreiber. */
let reportedErrors = 0;
function reportClientError(message, stack){
  if(reportedErrors++ >= 10) return; // pro Seitenaufruf höchstens 10 Meldungen
  try {
    fetch(DEFAULT_CONFIG.backendUrl.replace(/\/$/,"") + "/api/client-error", {
      method:"POST", headers:{"Content-Type":"application/json"}, keepalive:true,
      body: JSON.stringify({message:String(message||"").slice(0,500), stack:String(stack||"").slice(0,1500),
        url: window.location.pathname, userAgent: navigator.userAgent,
        tab: window.__ouvTab || "",
        lang: typeof UI_LANG !== "undefined" ? UI_LANG : "", demo: /[?&]demo/.test(location.search),
        version: window.__APP_VERSION || ""}),
    }).catch(()=>{});
  } catch(e){}
}
window.addEventListener("error", (e) => reportClientError(e.message, e.error && e.error.stack));
window.addEventListener("unhandledrejection", (e) => reportClientError(e.reason && e.reason.message || e.reason, e.reason && e.reason.stack));

// Stürzt eine Ansicht ab, erscheint eine Meldung statt einer weißen Seite.
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = {failed:false}; }
  static getDerivedStateFromError(){ return {failed:true}; }
  componentDidCatch(error, info){ reportClientError(error && error.message, (error && error.stack || "") + (info && info.componentStack || "")); }
  render(){
    if(!this.state.failed) return this.props.children;
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:PAPER,padding:20}}>
        <Card style={{maxWidth:420,width:"100%",textAlign:"center"}}>
          <div style={{fontFamily:"Fraunces, serif",fontSize:19,fontWeight:600,marginBottom:8}}>Da ist etwas schiefgelaufen</div>
          <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:16}}>Der Fehler wurde automatisch gemeldet. Deine Daten sind gespeichert – bitte die Seite neu laden.</div>
          <button className="btn-primary" onClick={()=>window.location.reload()}>Seite neu laden</button>
        </Card>
      </div>
    );
  }
}

/* --------------------------- Anmeldung merken ---------------------------
   Die Sitzung (Zugangs- und Erneuerungsschlüssel) liegt im Browser, damit man
   nach dem Neuladen angemeldet bleibt. Der Zugangsschlüssel gilt nur eine Stunde
   und wird vor jeder Anfrage bei Bedarf still erneuert – die App muss dafür nichts
   neu laden. Schlägt die Erneuerung fehl, geht es zurück zur Anmeldung. */
const LS_SESSION_KEY = "hpoos_session_v1";
const Session = {
  current: null,
  onExpired: null,
  load(){ try { this.current = JSON.parse(window.localStorage.getItem(LS_SESSION_KEY)); } catch(e){ this.current = null; } return this.current; },
  save(s){ this.current = s; try { if(s) window.localStorage.setItem(LS_SESSION_KEY, JSON.stringify(s)); else window.localStorage.removeItem(LS_SESSION_KEY); } catch(e){} },
};
function sessionFromAuth(data){
  return { access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now()/1000) + (data.expires_in || 3600) };
}
let refreshing = null;
function refreshSession(){
  if(!Session.current || !Session.current.refresh_token) return Promise.reject(new Error("Bitte erneut anmelden."));
  // Mehrere gleichzeitige Anfragen teilen sich eine Erneuerung
  refreshing = refreshing || (async () => {
    const res = await fetch(DEFAULT_CONFIG.supabaseUrl.replace(/\/$/,"") + "/auth/v1/token?grant_type=refresh_token", {
      method:"POST", headers:{apikey:DEFAULT_CONFIG.supabaseAnonKey, "Content-Type":"application/json"},
      body: JSON.stringify({refresh_token: Session.current.refresh_token}),
    });
    let data = null; try { data = await res.json(); } catch(e){}
    if(!res.ok || !data || !data.access_token){
      Session.save(null);
      if(Session.onExpired) Session.onExpired();
      throw new Error("Deine Sitzung ist abgelaufen – bitte erneut anmelden.");
    }
    Session.save(sessionFromAuth(data));
    return data.access_token;
  })().finally(() => { refreshing = null; });
  return refreshing;
}
// Liefert einen gültigen Zugangsschlüssel (erneuert ihn kurz vor Ablauf).
async function freshToken(token){
  const s = Session.current;
  if(!token || !s) return token;
  if(s.expires_at - 60 < Date.now()/1000) return refreshSession();
  return s.access_token;
}

// Offline: zuletzt geladene Listen zeigen und bestimmte Einträge (Meldung, Messwert, Checkliste, Übergabe, Fundsache) später senden
const OFFLINE_QUEUE_KEY = "hpoos_offline_queue";
const OFFLINE_CACHE = /^\/api\/(hotels\/[^/]+\/(tickets|checklists|temp-points|temp-readings|logbook|rooms|lost-found|briefing|shifts|stock)|me|organizations\/[^/]+\/(my-shifts|my-tasks))(\?|$)/;
const OFFLINE_SEND = [[/^\/api\/temp-points\/[^/]+\/readings$/, "POST"], [/^\/api\/checklists\/[^/]+\/run$/, "PUT"], [/^\/api\/hotels\/[^/]+\/tickets$/, "POST"], [/^\/api\/hotels\/[^/]+\/logbook$/, "POST"], [/^\/api\/hotels\/[^/]+\/lost-found$/, "POST"]];
let LAST_API = null, FLUSHING = false;
function offlineQueue(){ try { return JSON.parse(window.localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); } catch(e){ return []; } }
function saveOfflineQueue(q){ try { window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q)); } catch(e){} window.dispatchEvent(new Event("hpoos-queue")); }
function cachePut(path, data){
  try { const v = JSON.stringify(data); if(v.length < 300000) window.localStorage.setItem("hpoos_c:" + path, v); }
  catch(e){ try { Object.keys(window.localStorage).filter(k=>k.startsWith("hpoos_c:")).forEach(k=>window.localStorage.removeItem(k)); } catch(x){} }
}
function cacheGet(path){ try { const v = window.localStorage.getItem("hpoos_c:" + path); return v ? JSON.parse(v) : undefined; } catch(e){ return undefined; } }
async function flushOfflineQueue(){
  if(!LAST_API || FLUSHING || navigator.onLine===false) return;
  const q = offlineQueue(); if(!q.length) return;
  FLUSHING = true; const keep = [];
  for(const it of q){
    try { await apiCall(LAST_API.url, (Session.current && Session.current.access_token) || LAST_API.token, it.path, it.method, it.body, true); }
    catch(e){ if(e.offline) keep.push(it); } // vom Server abgelehnt: verwerfen, sonst später erneut
  }
  saveOfflineQueue(keep.concat(offlineQueue().slice(q.length)));
  FLUSHING = false;
}
if(typeof window!=="undefined"){ window.addEventListener("online", ()=>flushOfflineQueue()); setInterval(()=>{ if(offlineQueue().length) flushOfflineQueue(); }, 60000); }

async function apiCall(backendUrl, token, path, method, body, noQueue){
  LAST_API = {url:backendUrl, token};
  const send = (t) => fetch(backendUrl.replace(/\/$/,"") + path, {
    method: method || "GET",
    // Sprache der Oberfläche: Server antwortet mit Meldungen, Vorlage, Beispielhotel und KI-Bericht darin
    headers: { "Content-Type":"application/json", "Accept-Language": UI_LANG, ...(t ? {Authorization:`Bearer ${t}`} : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const m = (method || "GET").toUpperCase();
  let res;
  try {
    res = await send(await freshToken(token));
    // Schlüssel trotzdem abgelehnt (z. B. Rechner war im Ruhezustand): einmal erneuern und wiederholen
    if(res.status === 401 && token && Session.current) res = await send(await refreshSession());
  } catch(e){
    // Kein Netz: Lesen aus dem Zwischenspeicher, ausgewählte Einträge in die Warteschlange
    if(m === "GET"){ const c = cacheGet(path); if(c !== undefined){ window.dispatchEvent(new Event("hpoos-queue")); return c; } }
    if(!noQueue && OFFLINE_SEND.some(([re, mm]) => mm === m && re.test(path))){
      saveOfflineQueue([...offlineQueue(), {path, method:m, body, at:new Date().toISOString()}]);
      return {...(body||{}), id:"offline-"+Date.now(), queued:true, offline:true};
    }
    const err = new Error(tf("Keine Verbindung zum Server. Bitte Internet prüfen und erneut versuchen.")); err.offline = true; throw err;
  }
  let data = null;
  try { data = await res.json(); } catch(e) {}
  if(!res.ok) throw new Error((data && data.error) || tf("Fehler {0}", res.status));
  if(m === "GET" && OFFLINE_CACHE.test(path)) cachePut(path, data);
  return data;
}
async function supabaseLogin(supabaseUrl, anonKey, email, password){
  const res = await fetch(supabaseUrl.replace(/\/$/,"") + "/auth/v1/token?grant_type=password", {
    method:"POST", headers:{apikey:anonKey,"Content-Type":"application/json"},
    body: JSON.stringify({email,password}),
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error_description || data.msg || "Login fehlgeschlagen.");
  return data;
}
async function supabaseSignUp(supabaseUrl, anonKey, email, password){
  const res = await fetch(supabaseUrl.replace(/\/$/,"") + "/auth/v1/signup", {
    method:"POST", headers:{apikey:anonKey,"Content-Type":"application/json"},
    body: JSON.stringify({email,password}),
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error_description || data.msg || "Registrierung fehlgeschlagen.");
  // Wenn E-Mail-Bestätigung in Supabase deaktiviert ist, liefert Supabase sofort
  // eine Session (access_token) zurück. Ist Bestätigung aktiviert, ist
  // access_token leer und der Nutzer muss zuerst auf den Link in der Mail klicken.
  return data.access_token ? data : null;
}
async function supabaseRecover(supabaseUrl, anonKey, email, redirectTo){
  const res = await fetch(supabaseUrl.replace(/\/$/,"") + "/auth/v1/recover", {
    method:"POST", headers:{apikey:anonKey,"Content-Type":"application/json"},
    body: JSON.stringify({email, redirect_to: redirectTo}),
  });
  if(!res.ok){
    let data = null; try { data = await res.json(); } catch(e){}
    throw new Error((data && (data.error_description||data.msg)) || "Anfrage fehlgeschlagen.");
  }
}
async function supabaseSetNewPassword(supabaseUrl, anonKey, accessToken, newPassword){
  const res = await fetch(supabaseUrl.replace(/\/$/,"") + "/auth/v1/user", {
    method:"PUT",
    headers:{apikey:anonKey,"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},
    body: JSON.stringify({password:newPassword}),
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data && (data.error_description||data.msg)) || "Passwort konnte nicht geändert werden.");
  return data;
}

