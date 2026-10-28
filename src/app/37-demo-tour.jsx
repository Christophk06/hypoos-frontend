// ------------------------------------------------------------ Geführte Tour in der Live-Demo („So eröffnest du ein Hotel mit Ouverture“)
const DEMO_TOUR_KEY = "ouverture_demo_tour_seen";
const DEMO_TOUR_STEPS = [
  { tab:"dashboard", icon:"sparkle", title:"Dein Überblick", text:"Das Dashboard zeigt den Stand der Eröffnung. Der KI-Lagebericht fasst zusammen, was als Nächstes wichtig ist." },
  { tab:"tasks", icon:"clipboard", title:"Aufgaben und Zeitstrahl", text:"Alle To-dos mit Verantwortlichen und Terminen. Im Zeitstrahl siehst du, wie sie bis zum Eröffnungstag zusammenhängen." },
  { tab:"budget", icon:"euro", title:"Budget im Blick", text:"Geplante und tatsächliche Kosten je Posten, damit du früh siehst, wo es eng wird." },
  { tab:"staff", icon:"users", title:"Personal und Recruiting", text:"Stellen planen, Personalkosten berechnen und Bewerbungen im Blick behalten." },
  { tab:"roster", icon:"calendar", title:"Dienstplan", text:"Schichten planen und veröffentlichen. Das Team sieht seinen Plan direkt auf dem Handy." },
  { tab:"rooms", icon:"bed", title:"Zimmerstatus", text:"Housekeeping und Rezeption sehen, welches Zimmer sauber, belegt oder gesperrt ist." },
  { tab:"tickets", icon:"wrench", title:"Meldungen", text:"Defekte und Anliegen melden, zuweisen und bis zur Erledigung verfolgen." },
  { tab:"rooms", icon:"concierge", title:"Gäste-QR im Zimmer", text:"Gäste scannen den QR-Code im Zimmer und schreiben der Rezeption oder geben Feedback. Du findest ihn im Zimmerstatus." },
  { tab:"arrivals", icon:"key", title:"Anreisen", text:"Die Anreisen des Tages auf einen Blick, damit die Rezeption vorbereitet ist." },
  { tab:"memory", icon:"log", title:"Hotel-Gedächtnis", text:"Wissen, das sonst in Köpfen steckt, bleibt im Haus: Abläufe, Besonderheiten, Entscheidungen." },
  { tab:"simulator", icon:"play", title:"Probebetrieb", text:"Vor der Eröffnung durchspielen, was im Betrieb passieren wird, und Lücken früh finden." },
  { tab:"billing", icon:"receipt", title:"Abo und Preise", text:"Hier siehst du das Abo und die Preise. In der Demo wird nichts gebucht oder gespeichert." },
];
// Welche Bereiche die jeweilige Rolle sieht
const DEMO_TOUR_MEMBER_TABS = ["dashboard","tasks","roster","rooms","tickets","arrivals"];
function demoTourSteps(role){
  if(role==="admin") return DEMO_TOUR_STEPS;
  if(role==="member") return DEMO_TOUR_STEPS.filter(s=>DEMO_TOUR_MEMBER_TABS.includes(s.tab));
  return DEMO_TOUR_STEPS.filter(s=>s.tab!=="billing");
}
function demoTourSeen(){ try { return localStorage.getItem(DEMO_TOUR_KEY)==="1"; } catch(e){ return false; } }
function demoTourMarkSeen(){ try { localStorage.setItem(DEMO_TOUR_KEY,"1"); } catch(e){} }

function DemoTourButton({onStart}){
  if(!window.OUVERTURE_DEMO) return null;
  return <button type="button" className="no-print" onClick={onStart} style={{background:"none",border:`1px solid ${BRASS}`,color:INK,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer"}}><Icon n="compass" /> {tf("Tour starten")}</button>;
}

function DemoTour({tab, setTab, role}){
  const [open,setOpen] = useState(false);
  const [i,setI] = useState(0);
  const nextRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const prevFocus = React.useRef(null);
  const steps = demoTourSteps(role);
  const step = steps[Math.min(i, steps.length-1)];
  // Beim ersten Besuch automatisch starten
  useEffect(()=>{
    if(!window.OUVERTURE_DEMO || demoTourSeen()) return;
    const t = setTimeout(()=>{ setI(0); setOpen(true); }, 800);
    return ()=>clearTimeout(t);
  },[]);
  // Knopf „Tour starten“ löst ein Ereignis aus, falls die Hauptsitzung es so verdrahtet
  useEffect(()=>{
    const h = () => { setI(0); setOpen(true); };
    window.addEventListener("ouverture-demo-tour", h);
    return ()=>window.removeEventListener("ouverture-demo-tour", h);
  },[]);
  // Beim Schließen den Fokus dorthin zurückgeben, wo er vor der Tour war (sonst an den Hauptbereich)
  const close = useCallback(()=>{
    setOpen(false); demoTourMarkSeen();
    const p = prevFocus.current; prevFocus.current = null;
    setTimeout(()=>{ const t = (p && p!==document.body && document.contains(p)) ? p : document.getElementById("inhalt"); if(t && t.focus) t.focus({preventScroll:true}); }, 0);
  },[]);
  useEffect(()=>{ if(open && !prevFocus.current) prevFocus.current = document.activeElement; },[open]);
  // Beim Schrittwechsel in den Bereich springen
  useEffect(()=>{ if(open && step && step.tab!==tab) setTab(step.tab); },[open,i]);
  useEffect(()=>{ if(open && nextRef.current) nextRef.current.focus(); },[open,i]);
  useEffect(()=>{
    if(!open) return;
    const k = (e) => {
      // Tasten nur auswerten, wenn der Fokus im Tour-Fenster liegt (Esc auch ohne Fokus irgendwo)
      const inside = panelRef.current && panelRef.current.contains(document.activeElement);
      const idle = !document.activeElement || document.activeElement===document.body;
      if(!inside && !(e.key==="Escape" && idle)) return;
      if(e.key==="Escape"){ e.preventDefault(); close(); }
      else if(e.key==="ArrowRight"){ e.preventDefault(); setI(x=>Math.min(x+1, steps.length-1)); }
      else if(e.key==="ArrowLeft"){ e.preventDefault(); setI(x=>Math.max(x-1, 0)); }
    };
    window.addEventListener("keydown", k);
    return ()=>window.removeEventListener("keydown", k);
  },[open,steps.length,close]);
  if(!window.OUVERTURE_DEMO || !open || !step) return null;
  const last = i >= steps.length-1;
  const btn = {borderRadius:6,padding:"8px 14px",fontSize:13.5,cursor:"pointer",minHeight:36};
  return (
    <div ref={panelRef} className="no-print card" role="dialog" aria-modal="false" aria-labelledby="demo-tour-title"
      style={{position:"fixed",insetInlineStart:16,insetInlineEnd:16,bottom:role==="member"?76:16,marginInline:"auto",maxWidth:420,zIndex:1000,padding:"16px 18px",boxShadow:"0 10px 30px rgba(0,0,0,.28)",background:CARD,border:`1px solid ${BRASS}`,borderRadius:10,color:INK}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:6}}>
        <span style={{fontSize:12,color:INK_MUTED}}>{tf("So eröffnest du ein Hotel mit Ouverture")} · {tf("Schritt {0} von {1}", i+1, steps.length)}</span>
      </div>
      <div aria-live="polite">
        <div id="demo-tour-title" style={{fontWeight:700,fontSize:16,marginBottom:4,color:INK}}><Icon n={step.icon} /> {tf(step.title)}</div>
        <div style={{fontSize:14,lineHeight:1.5,color:INK}}>{tf(step.text)}</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap",alignItems:"center"}}>
        <button type="button" onClick={close} style={{...btn,background:"none",border:"none",color:INK_MUTED,paddingInlineStart:0}}>{tf("Beenden")}</button>
        <span style={{flex:1}} />
        {i>0 && <button type="button" onClick={()=>setI(i-1)} style={{...btn,background:"none",border:`1px solid ${BORDER}`,color:INK}}>{tf("Zurück")}</button>}
        <button type="button" ref={nextRef} className="btn-primary" onClick={()=>{ if(last) close(); else setI(i+1); }} style={{...btn,fontWeight:600}}>{last ? tf("Fertig") : tf("Weiter")}</button>
      </div>
    </div>
  );
}
