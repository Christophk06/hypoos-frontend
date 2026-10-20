// Druckfertiger Statusbericht (A4) – über den Druckdialog des Browsers als PDF speicherbar.
function ReportView({hotel, orgName, me, readiness, tasks, milestones, risks, budget, staff, aiReport, onClose}){
  useEffect(()=>{
    const prev = document.title;
    // Der Titel wird im Druckdialog als Dateiname vorgeschlagen.
    document.title = tf("Statusbericht {0}", hotel.name) + " " + new Date().toISOString().slice(0,10);
    return () => { document.title = prev; };
  }, [hotel.name]);

  const today = new Date().toISOString().slice(0,10);
  const r = readiness || {overall:0, deptScores:{}};
  const scoreColor = (s) => s>=80 ? GOOD : s>=60 ? WARN : BAD;
  const isLate = (t) => t.due_date && t.due_date < today && t.status!=="Abgeschlossen";

  const doneTasks = tasks.filter(t=>t.status==="Abgeschlossen").length;
  const openTasks = tasks.length - doneTasks;
  const lateTasks = tasks.filter(isLate);
  const urgentLate = lateTasks.filter(t=>t.priority==="Kritisch"||t.priority==="Hoch")
    .sort((a,b)=>(PRIORITY_RANK[a.priority]-PRIORITY_RANK[b.priority]) || (a.due_date<b.due_date?-1:1));
  const blocked = tasks.filter(t=>t.status==="Blockiert");

  const msOpen = milestones.filter(m=>m.status!=="Abgeschlossen").sort((a,b)=>a.date<b.date?-1:1);
  const msAtRisk = msOpen.filter(m=>m.status==="Gefährdet" || m.date < today);
  const msNext = msOpen.filter(m=>!msAtRisk.includes(m)).slice(0,5);

  const planned = budget.reduce((s,i)=>s+Number(i.planned||0),0);
  const actual = budget.reduce((s,i)=>s+Number(i.actual||0),0);
  const pB = sumBy(budget,"department","planned"), aB = sumBy(budget,"department","actual");
  const overDepts = Object.keys(pB).filter(d=>(aB[d]||0)>pB[d]).map(d=>({d, over:(aB[d]||0)-pB[d], pct: pB[d]>0 ? Math.round(((aB[d]||0)-pB[d])/pB[d]*100) : null}));

  const need = staff.reduce((s,p)=>s+p.headcount,0), have = staff.reduce((s,p)=>s+Math.min(p.filled,p.headcount),0);
  const openPositions = staff.filter(p=>p.filled<p.headcount).sort((a,b)=>(a.start_date||"9999")<(b.start_date||"9999")?-1:1);

  const topRisks = [...risks].sort((a,b)=>b.probability*b.impact - a.probability*a.impact).slice(0,5);
  const days = r.daysToOpening;

  const Kpi = ({label, value, sub, color}) => (
    <div style={{flex:1,border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 10px"}}>
      <div style={{fontSize:10.5,color:INK_MUTED,fontWeight:600}}>{label}</div>
      <div style={{fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600,color:color||INK}}>{value}</div>
      {sub && <div style={{fontSize:10.5,color:INK_MUTED}}>{sub}</div>}
    </div>
  );
  const None = ({children}) => <div style={{color:INK_MUTED}}>{children}</div>;

  return (
    <div className="report-wrap" style={{background:PAPER,minHeight:"100vh",padding:"16px 12px"}}>
      <div className="no-print" style={{maxWidth:"210mm",margin:"0 auto 12px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button style={{...linkBtn,fontSize:13.5}} onClick={onClose}>← Zurück</button>
        <div style={{flex:1,fontSize:12.5,color:INK_MUTED}}>Im Druckdialog als Ziel „Als PDF speichern“ wählen.</div>
        <button className="btn-primary" onClick={()=>window.print()}>Als PDF speichern / Drucken</button>
      </div>

      <div className="report" style={{boxShadow:"0 1px 8px rgba(0,0,0,0.08)",borderRadius:6}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div>
            {hotel.logo_data && <img src={hotel.logo_data} alt="" style={{height:44,maxWidth:160,objectFit:"contain",marginBottom:6,display:"block"}} />}
            <div style={{fontSize:11,color:hotel.brand_color||INK_MUTED,fontWeight:600,letterSpacing:0.5}}>STATUSBERICHT PRE-OPENING</div>
            <div style={{fontFamily:"Fraunces, serif",fontSize:24,fontWeight:600}}>{hotel.name}</div>
            <div style={{color:INK_MUTED}}>{[hotel.city, hotel.country].filter(Boolean).join(", ")}{hotel.rooms ? " · "+tf("{0} Zimmer", hotel.rooms) : ""}{orgName ? " · "+orgName : ""}</div>
          </div>
          <div style={{textAlign:"right",fontSize:11.5,color:INK_MUTED}}>
            <div>Stand: <b style={{color:INK}}>{fmtDate(today)}</b></div>
            <div>Eröffnung: <b style={{color:INK}}>{fmtDate(hotel.opening_date)}</b></div>
            {days!=null && <div>{days>=0 ? tf("noch {0} Tage", days) : tf("seit {0} Tagen eröffnet", -days)}</div>}
            {me && <div>{tf("erstellt von {0}", me.email)}</div>}
          </div>
        </div>

        <div className="avoid-break" style={{display:"flex",gap:16,marginTop:16,alignItems:"stretch"}}>
          <div style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 16px",textAlign:"center",minWidth:120}}>
            <div style={{fontSize:10.5,color:INK_MUTED,fontWeight:600}}>IM ZEITPLAN</div>
            <div style={{fontFamily:"Fraunces, serif",fontSize:40,fontWeight:600,color:scoreColor(r.overall),lineHeight:1.1}}>{r.overall}%</div>
            {r.progressPct!=null && <div style={{fontSize:10.5,color:INK_MUTED,marginTop:2}}>{tf("{0} % aller Aufgaben erledigt", r.progressPct)}</div>}
          </div>
          <div style={{flex:1}}>
            {Object.entries(r.deptScores||{}).sort((a,b)=>a[1]-b[1]).map(([d,s])=>(
              <div key={d} style={{display:"flex",alignItems:"center",gap:8,padding:"2px 0"}}>
                <div style={{width:140,fontSize:11.5}}>{d}</div>
                <Bar pct={s} color={scoreColor(s)} />
                <div style={{width:34,textAlign:"right",fontSize:11.5,fontWeight:700}}>{s}%</div>
              </div>
            ))}
            {Object.keys(r.deptScores||{}).length===0 && <None>Noch keine Abteilungsdaten.</None>}
          </div>
        </div>

        <div className="avoid-break" style={{display:"flex",gap:8,marginTop:12}}>
          <Kpi label="AUFGABEN" value={doneTasks+" / "+tasks.length} sub={tf("{0} offen · {1} überfällig", openTasks, lateTasks.length)} color={lateTasks.length?BAD:INK} />
          <Kpi label="MEILENSTEINE" value={msAtRisk.length ? tf("{0} gefährdet", msAtRisk.length) : tf("im Plan")} sub={tf("{0} offen", msOpen.length)} color={msAtRisk.length?BAD:GOOD} />
          <Kpi label="BUDGET (IST / PLAN)" value={planned>0 ? Math.round(actual/planned*100)+" %" : "—"} sub={fmtEur(actual)+" / "+fmtEur(planned)} color={actual>planned?BAD:INK} />
          <Kpi label="PERSONAL" value={need>0 ? Math.round(have/need*100)+" %" : "—"} sub={tf("{0} / {1} besetzt", have, need)} color={need>0 && have/need<0.5?BAD:INK} />
        </div>

        {aiReport && (
          <React.Fragment>
            <h2 style={{display:"flex",alignItems:"center",gap:8}}>
              Einschätzung
              <span style={{fontFamily:"Inter, sans-serif",fontSize:11,fontWeight:700,color:(AMPEL[aiReport.content.ampel]||AMPEL["gelb"]).color}}>● {(AMPEL[aiReport.content.ampel]||AMPEL["gelb"]).label}</span>
              <span style={{fontFamily:"Inter, sans-serif",fontSize:10.5,fontWeight:400,color:INK_MUTED,marginLeft:"auto"}}>{tf("KI-Lagebericht vom {0}", fmtDateTime(aiReport.created_at))}</span>
            </h2>
            <AiReportBody content={aiReport.content} full />
          </React.Fragment>
        )}

        <h2>Überfällige Aufgaben mit hoher Priorität</h2>
        {urgentLate.length===0 ? <None>Keine.</None> : (
          <table><thead><tr><th>Aufgabe</th><th>Abteilung</th><th>Priorität</th><th>Fällig</th><th>Status</th></tr></thead><tbody>
            {urgentLate.slice(0,12).map(t=>(
              <tr key={t.id}><td>{t.title}</td><td>{t.department}</td><td style={{color:priorityColor(t.priority).color,fontWeight:600}}>{t.priority}</td><td style={{color:BAD}}>{fmtDate(t.due_date)}</td><td>{t.status}</td></tr>
            ))}
          </tbody></table>
        )}
        {urgentLate.length>12 && <None>{tf("… und {0} weitere.", urgentLate.length-12)}</None>}
        {blocked.length>0 && <div style={{marginTop:6}}><b>Blockiert:</b> {blocked.map(t=>t.title).join(" · ")}</div>}

        <h2>Meilensteine</h2>
        {msAtRisk.length===0 && msNext.length===0 ? <None>Keine offenen Meilensteine.</None> : (
          <table><thead><tr><th>Meilenstein</th><th>Datum</th><th>Kritikalität</th><th>Status</th></tr></thead><tbody>
            {[...msAtRisk, ...msNext].map(m=>{
              const risk = msAtRisk.includes(m);
              return <tr key={m.id}><td style={{fontWeight:risk?600:400}}>{m.title}</td><td style={{color:risk?BAD:INK}}>{fmtDate(m.date)}</td><td>{m.criticality}</td><td style={{color:risk?BAD:INK}}>{m.date<today ? "überfällig" : m.status}</td></tr>;
            })}
          </tbody></table>
        )}

        <h2>Größte Risiken</h2>
        {topRisks.length===0 ? <None>Keine Risiken erfasst.</None> : (
          <table><thead><tr><th>Risiko</th><th>Abteilung</th><th>Score</th><th>Gegenmaßnahme</th></tr></thead><tbody>
            {topRisks.map(x=>(
              <tr key={x.id} className="avoid-break"><td>{x.title}</td><td>{x.department}</td><td style={{fontWeight:700,color:x.probability*x.impact>=16?BAD:x.probability*x.impact>=9?WARN:INK}}>{x.probability*x.impact}</td><td>{x.mitigation || <span style={{color:BAD}}>keine festgelegt</span>}</td></tr>
            ))}
          </tbody></table>
        )}

        <div className="avoid-break" style={{display:"flex",gap:20}}>
          <div style={{flex:1}}>
            <h2>Budget</h2>
            {budget.length===0 ? <None>Kein Budget erfasst.</None> : (
              <React.Fragment>
                <div>{tf("Plan {0} · Ist {1}", fmtEur(planned), fmtEur(actual))} · {planned>=actual ? tf("verfügbar {0}", fmtEur(planned-actual)) : <b style={{color:BAD}}>{tf("überschritten um {0}", fmtEur(actual-planned))}</b>}</div>
                {overDepts.length>0 ? (
                  <div style={{marginTop:6}}>{overDepts.map(o=><div key={o.d} style={{color:BAD}}>{translateString(o.d)}: +{fmtEur(o.over)}{o.pct!=null ? " "+tf("({0} % über Plan)", o.pct) : ""}</div>)}</div>
                ) : <div style={{marginTop:6,color:GOOD}}>Alle Abteilungen im Plan.</div>}
              </React.Fragment>
            )}
          </div>
          <div style={{flex:1}}>
            <h2>Personal</h2>
            {staff.length===0 ? <None>Keine Stellen erfasst.</None> : (
              <React.Fragment>
                <div>{tf("{0} von {1} Personen eingestellt · {2} offen", have, need, need-have)}</div>
                {openPositions.slice(0,8).map(p=>(
                  <div key={p.id} style={{color:p.start_date && p.start_date<today ? BAD : INK}}>
                    {p.title} ({translateString(p.department)}): {tf("{0} offen", p.headcount-p.filled)}{p.start_date ? ", "+tf("Start {0}", fmtDate(p.start_date)) : ""}
                  </div>
                ))}
                {openPositions.length>8 && <None>{tf("… und {0} weitere Stellen.", openPositions.length-8)}</None>}
              </React.Fragment>
            )}
          </div>
        </div>

        <div style={{marginTop:18,paddingTop:6,borderTop:`1px solid ${BORDER}`,fontSize:10,color:INK_MUTED,display:"flex",justifyContent:"space-between"}}>
          <span>Erstellt mit Ouverture</span><span>{new Date().toLocaleString(UI_LOCALE)}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Excel-Export ------------------------------- */
// Alle Daten eines Hotels als Excel-Datei mit einem Blatt je Bereich.
async function exportHotelXlsx({hotel, tasks, milestones, risks, budget, staff, members}){
  const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const email = (id) => (members.find(m=>m.user_id===id)||{}).email || "";
  const T = translateString, C = (k) => tf(k);
  const sheets = [
    [C("Aufgaben"), tasks.map(t=>({[C("Aufgabe")]:t.title, [C("Abteilung")]:T(t.department), [C("Priorität")]:T(t.priority), [C("Status")]:T(t.status), [C("Fällig")]:t.due_date||"", [C("Zuständig")]:email(t.assignee_id)||t.owner||""}))],
    [C("Meilensteine"), milestones.map(m=>({[C("Meilenstein")]:m.title, [C("Datum")]:m.date, [C("Kritikalität")]:T(m.criticality), [C("Status")]:T(m.status)}))],
    [C("Risiken"), risks.map(r=>({[C("Risiko")]:r.title, [C("Abteilung")]:T(r.department), [C("Wahrscheinlichkeit")]:r.probability, [C("Auswirkung")]:r.impact, [C("Score")]:r.probability*r.impact, [C("Gegenmaßnahme")]:r.mitigation||""}))],
    [C("Budget"), budget.map(b=>({[C("Posten")]:b.title, [C("Abteilung")]:T(b.department), [C("Kategorie")]:T(b.category), [tf("Plan ({0})", HOTEL_CURRENCY)]:Number(b.planned), [tf("Ist ({0})", HOTEL_CURRENCY)]:Number(b.actual), [C("Notiz")]:b.note||""}))],
    [C("Personal"), staff.map(p=>({[C("Stelle")]:p.title, [C("Abteilung")]:T(p.department), [C("Benötigt")]:p.headcount, [C("Besetzt")]:p.filled, [C("Offen")]:p.headcount-p.filled, [C("Start")]:p.start_date||""}))],
  ];
  const wide = [C("Aufgabe"), C("Risiko"), C("Posten"), C("Meilenstein"), C("Gegenmaßnahme")];
  const wb = XLSX.utils.book_new();
  for(const [name, rows] of sheets){
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{[C("Hinweis")]:C("Keine Einträge")}]);
    ws["!cols"] = Object.keys(rows[0]||{x:""}).map(k=>({wch: wide.includes(k) ? 48 : 16}));
    XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0,31));
  }
  const safe = hotel.name.replace(/[\\/:*?"<>|\[\]]+/g,"").trim() || "Hotel";
  XLSX.writeFile(wb, "Ouverture " + safe + " " + new Date().toISOString().slice(0,10) + ".xlsx");
}

/* ------------------------------ Kalender-Export ------------------------------ */
// Offene Fristen und Meilensteine als ganztägige Termine (.ics) für Outlook, Google, Apple.
function icsEscape(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/([,;])/g,"\\$1"); }
function icsFold(line){
  // Zeilen über 75 Zeichen umbrechen (Folgezeilen beginnen mit einem Leerzeichen)
  const parts = []; let rest = line;
  while(rest.length > 74){ parts.push(rest.slice(0,74)); rest = " " + rest.slice(74); }
  parts.push(rest); return parts.join("\r\n");
}
function buildIcs({hotel, tasks, milestones}){
  const day = (iso) => iso.replace(/-/g,"");
  const next = (iso) => { const d = new Date(iso+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10).replace(/-/g,""); };
  const stamp = new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const ev = (uid, date, summary, desc) => [
    "BEGIN:VEVENT", "UID:"+uid+"@ouverture", "DTSTAMP:"+stamp,
    "DTSTART;VALUE=DATE:"+day(date), "DTEND;VALUE=DATE:"+next(date),
    "SUMMARY:"+icsEscape(summary), "DESCRIPTION:"+icsEscape(desc), "TRANSP:TRANSPARENT", "END:VEVENT",
  ];
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Ouverture//Pre-Opening//DE","CALSCALE:GREGORIAN",
    "X-WR-CALNAME:"+icsEscape("Ouverture – "+hotel.name)];
  const T = translateString;
  if(hotel.opening_date) lines.push(...ev("opening-"+hotel.id, hotel.opening_date, "🎉 "+tf("Eröffnung {0}", hotel.name), tf("Eröffnungstermin")));
  milestones.filter(m=>m.date && m.status!=="Abgeschlossen").forEach(m=>lines.push(...ev("m-"+m.id, m.date, "◆ "+m.title, T("Meilenstein")+" · "+T(m.criticality)+" · "+T(m.status))));
  tasks.filter(t=>t.due_date && t.status!=="Abgeschlossen").forEach(t=>lines.push(...ev("t-"+t.id, t.due_date, t.title, T(t.department)+" · "+tf("Priorität {0}", T(t.priority))+" · "+T(t.status)+(t.owner?" · "+t.owner:""))));
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
function downloadIcs(data){
  const blob = new Blob([buildIcs(data)], {type:"text/calendar;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Ouverture " + data.hotel.name.replace(/[^\wäöüÄÖÜß -]/g,"").trim() + " " + tf("Termine") + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

/* -------------------------------- Zeitstrahl -------------------------------- */
function TimelineView({hotel, tasks, milestones}){
  const [onlyOpen,setOnlyOpen] = useState(false);
  const [range,setRange] = useState(()=>{ try { return window.localStorage.getItem("hpoos_timeline_range") || "all"; } catch(e){ return "all"; } });
  const pickRange = (r) => { setRange(r); try { window.localStorage.setItem("hpoos_timeline_range", r); } catch(e){} };
  const [picked,setPicked] = useState(null);
  const [labelsPref,setLabelsPref] = useState(null); // null = automatisch (Beschriftung im 6-Wochen-Zeitraum)
  // Breite der Zeitachse messen, damit nahe Aufgaben in eigene Spuren rücken statt sich zu überlappen
  const boxRef = React.useRef(null);
  const [boxW,setBoxW] = useState(1000);
  useEffect(()=>{
    if(!boxRef.current || !window.ResizeObserver) return;
    const ro = new ResizeObserver(es=>setBoxW(es[0].contentRect.width));
    ro.observe(boxRef.current); return () => ro.disconnect();
  },[boxRef.current]);
  const today = new Date().toISOString().slice(0,10);
  const toT = (iso) => new Date(iso+"T00:00:00Z").getTime();
  const addD = (iso, n) => new Date(toT(iso)+n*86400000).toISOString().slice(0,10);
  const allDated = tasks.filter(t=>t.due_date);
  if(allDated.length===0 && milestones.length===0) return <Card><div style={{color:INK_MUTED,fontSize:13.5}}>Noch keine Aufgaben oder Meilensteine mit Termin.</div></Card>;

  // Zeitraum: alles, nächste 3 Monate oder nächste 6 Wochen (jeweils mit zwei Wochen Rückblick)
  const dates = [...allDated.map(t=>t.due_date), ...milestones.map(m=>m.date), today, hotel.opening_date].filter(Boolean).sort();
  let startIso = dates[0], endIso = dates[dates.length-1];
  if(range!=="all"){ startIso = addD(today,-14); endIso = addD(today, range==="6w" ? 42 : 91); }
  const inRange = (iso) => iso >= startIso && iso <= endIso;
  const dated = allDated.filter(t=>(!onlyOpen || t.status!=="Abgeschlossen") && inRange(t.due_date));
  const ms = milestones.filter(m=>m.date && inRange(m.date));
  const pad = 3*86400000;
  const start = toT(startIso) - pad, end = toT(endIso) + pad;
  const frac = (iso) => (toT(iso)-start)/(end-start);
  const pos = (iso) => (frac(iso)*100) + "%";

  const depts = [...new Set(allDated.map(t=>t.department))].sort((a,b)=>DEPARTMENTS.indexOf(a)-DEPARTMENTS.indexOf(b));
  const colorOf = (t) => t.status==="Abgeschlossen" ? GOOD : (t.due_date<today ? BAD : t.status==="Blockiert" ? WARN : BRASS);
  // Achse: Monate, im kurzen Zeitraum Wochen
  const ticks = [];
  if(range==="all"){ const d = new Date(start); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+1);
    while(d.getTime() < end){ const iso = d.toISOString().slice(0,10); ticks.push({iso, label:new Date(iso+"T12:00:00").toLocaleDateString(UI_LOCALE,{month:"short",year:"2-digit"})}); d.setUTCMonth(d.getUTCMonth()+1); } }
  else { let iso = mondayOfIso(startIso); while(toT(iso) < end){ if(toT(iso) > start) ticks.push({iso, label:tf("KW {0}", isoWeekNumber(iso))}); iso = addD(iso, 7); } }

  // Kennzahlen
  const open = allDated.filter(t=>t.status!=="Abgeschlossen");
  const late = open.filter(t=>t.due_date<today);
  const doneShare = allDated.length ? Math.round((allDated.length-open.length)/allDated.length*100) : 0;
  const nextMs = milestones.filter(m=>m.date && m.date>=today && m.status!=="Abgeschlossen").sort((a,b)=>a.date<b.date?-1:1)[0];
  const daysLeft = hotel.opening_date ? Math.round((toT(hotel.opening_date)-toT(today))/86400000) : null;

  // Agenda: Überfälliges und die nächsten 3 Wochen, nach Woche gruppiert
  const agendaEnd = addD(today, 21);
  const agendaItems = [
    ...open.filter(t=>t.due_date<=agendaEnd).map(t=>({kind:"task", date:t.due_date, item:t})),
    ...milestones.filter(m=>m.date && m.status!=="Abgeschlossen" && m.date<=agendaEnd && m.date>=addD(today,-30)).map(m=>({kind:"ms", date:m.date, item:m})),
  ].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const agendaGroups = [];
  agendaItems.forEach(a=>{
    const key = a.date<today ? "late" : mondayOfIso(a.date);
    let g = agendaGroups.find(x=>x.key===key); if(!g){ g = {key, items:[]}; agendaGroups.push(g); }
    g.items.push(a);
  });

  const LABEL_W = 190;
  const Row = ({label, sub, children, height=40}) => (
    <div style={{display:"flex",alignItems:"stretch",borderTop:`1px solid ${BORDER}`,minHeight:height}}>
      <div style={{width:LABEL_W,flexShrink:0,fontSize:12.5,padding:"6px 10px",display:"flex",flexDirection:"column",justifyContent:"center",gap:3}}>
        <div style={{fontWeight:600}}>{label}</div>{sub}
      </div>
      <div style={{position:"relative",flex:1,height}}>{children}</div>
    </div>
  );
  const VLine = ({iso, color, label, dashed}) => frac(iso)<0 || frac(iso)>1 ? null : (
    <div style={{position:"absolute",top:0,bottom:0,insetInlineStart:`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${frac(iso)})`,borderInlineStart:`2px ${dashed?"dashed":"solid"} ${color}`,pointerEvents:"none",zIndex:1}}>
      <div style={{position:"absolute",top:-20,insetInlineStart:-40,width:80,textAlign:"center",fontSize:11,fontWeight:700,color}}>{label}</div>
    </div>
  );
  // Spuren: Aufgaben, die sich sonst überdecken würden, kommen in die nächste Zeile
  const showLabels = labelsPref===null ? range==="6w" : labelsPref;
  const trackW = Math.max(300, boxW - LABEL_W);
  const CHIP_W = 168, LANE_H = showLabels ? 26 : 18;
  const layout = (list) => {
    const sorted = [...list].sort((a,b)=>a.due_date<b.due_date?-1:a.due_date>b.due_date?1:0);
    const ends = []; const placed = [];
    for(const t of sorted){
      const x = frac(t.due_date)*trackW;
      const left = showLabels ? x-7 : x-9, right = showLabels ? x-7+CHIP_W : x+9;
      let lane = ends.findIndex(e=>e <= left);
      if(lane<0){ lane = ends.length; ends.push(0); }
      ends[lane] = right + 4; placed.push({t, lane});
    }
    return {placed, lanes: Math.max(1, ends.length)};
  };
  // Meilenstein-Beschriftungen in Spuren, damit sich die Namen nicht überdecken
  const msLane = {}; let msLanes = 1;
  { const ends = []; [...ms].sort((a,b)=>a.date<b.date?-1:1).forEach(m=>{
      const x = frac(m.date)*trackW; let l = ends.findIndex(e=>e<=x-75);
      if(l<0){ l = ends.length; ends.push(0); } ends[l] = x+81; msLane[m.id] = l; });
    msLanes = Math.max(1, ends.length); }
  const Dot = ({t, lane}) => {
    const big = t.priority==="Kritisch", size = big ? 14 : 10, on = picked && picked.item.id===t.id;
    const top = 8 + lane*LANE_H + LANE_H/2;
    const title = t.title+" · "+tf("fällig {0}", fmtDate(t.due_date))+" · "+translateString(t.status);
    const dot = <span style={{display:"inline-block",width:size,height:size,flexShrink:0,borderRadius:"50%",background:colorOf(t),border:"2px solid #fff",boxShadow:"0 0 0 "+(on?3:1)+"px "+colorOf(t)}} />;
    if(!showLabels) return <button onClick={()=>setPicked(on ? null : {kind:"task", item:t})} title={title} aria-label={t.title}
      style={{position:"absolute",insetInlineStart:pos(t.due_date),top,marginInlineStart:-size/2,marginTop:-size/2,padding:0,border:"none",background:"none",lineHeight:0,cursor:"pointer"}}>{dot}</button>;
    return <button onClick={()=>setPicked(on ? null : {kind:"task", item:t})} title={title}
      style={{position:"absolute",insetInlineStart:pos(t.due_date),top:top-10,height:20,maxWidth:CHIP_W,marginInlineStart:-7,display:"flex",alignItems:"center",gap:5,
        padding:"0 7px 0 2px",border:`1px solid ${on?colorOf(t):BORDER}`,borderRadius:999,background:"#fff",cursor:"pointer",fontSize:11,color:INK,whiteSpace:"nowrap",overflow:"hidden"}}>
      {dot}<span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</span>
    </button>;
  };
  const Kpi = ({label, value, color}) => (
    <Card style={{padding:"12px 14px"}}>
      <div style={{fontSize:11.5,color:INK_MUTED,fontWeight:600}}>{label}</div>
      <div style={{fontFamily:"Fraunces, serif",fontSize:22,fontWeight:600,color:color||INK}}>{value}</div>
    </Card>
  );
  const seg = (k, label) => <button key={k} onClick={()=>pickRange(k)} style={{border:`1px solid ${range===k?INK:BORDER}`,background:range===k?INK:"#fff",color:range===k?"#fff":INK,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{label}</button>;

  return (
    <div>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12,marginBottom:14}}>
        <Kpi label={tf("Bis zur Eröffnung")} value={daysLeft==null ? "—" : daysLeft>=0 ? tf("{0} Tage", daysLeft) : tf("seit {0} Tagen eröffnet", -daysLeft)} />
        <Kpi label={tf("Erledigt")} value={doneShare+" %"} color={doneShare>=80?GOOD:INK} />
        <Kpi label={tf("Überfällig")} value={late.length} color={late.length?BAD:GOOD} />
        <Kpi label={tf("Nächster Meilenstein")} value={nextMs ? <span style={{fontSize:14,fontFamily:"Inter, sans-serif",display:"block",lineHeight:1.3}}><span>{nextMs.title}</span><br /><span style={{color:INK_MUTED,fontSize:12.5}}>{fmtDate(nextMs.date)}</span></span> : "—"} />
      </div>

      <div className="no-print" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12,fontSize:12.5,color:INK_MUTED}}>
        {seg("all", tf("Gesamt"))}{seg("3m", tf("3 Monate"))}{seg("6w", tf("6 Wochen"))}
        <span style={{marginInlineStart:10}}><span style={{color:GOOD}}>●</span> erledigt</span><span><span style={{color:BRASS}}>●</span> {tf("noch offen")}</span>
        <span><span style={{color:WARN}}>●</span> blockiert</span><span><span style={{color:BAD}}>●</span> überfällig</span><span>◆ Meilenstein</span>
        <label style={{marginInlineStart:"auto",display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={showLabels} onChange={e=>setLabelsPref(e.target.checked)} /> {tf("Titel anzeigen")}</label>
        <label style={{display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={onlyOpen} onChange={e=>setOnlyOpen(e.target.checked)} /> nur offene Aufgaben</label>
      </div>

      <Card style={{padding:"28px 0 0",overflowX:"auto",marginBottom:12}}>
        <div ref={boxRef} style={{position:"relative",minWidth:820}}>
          <VLine iso={today} color={INK} label={tf("Heute")} dashed />
          {hotel.opening_date && <VLine iso={hotel.opening_date} color={BRASS} label={tf("Eröffnung")} />}
          <Row label={range==="all" ? tf("Monate") : tf("Wochen")} height={26}>
            {ticks.map(m=><div key={m.iso} style={{position:"absolute",insetInlineStart:pos(m.iso),top:5,fontSize:11,color:INK_MUTED,whiteSpace:"nowrap",borderInlineStart:`1px solid ${BORDER}`,paddingInlineStart:4}} data-no-i18n="">{m.label}</div>)}
          </Row>
          <Row label={tf("Meilensteine")} height={30 + msLanes*14}>
            {ms.map((m,i)=>{
              const isLate = m.status!=="Abgeschlossen" && (m.date<today || m.status==="Gefährdet");
              const color = m.status==="Abgeschlossen"?GOOD:isLate?BAD:INK;
              return <React.Fragment key={m.id}>
                <button onClick={()=>setPicked({kind:"ms", item:m})} title={m.title+" · "+fmtDate(m.date)+" · "+translateString(m.status)} aria-label={m.title}
                  style={{position:"absolute",insetInlineStart:pos(m.date),top:10,width:13,height:13,marginInlineStart:-6.5,padding:0,border:"none",transform:"rotate(45deg)",background:color,cursor:"pointer"}} />
                <div style={{position:"absolute",insetInlineStart:pos(m.date),top:27 + (msLane[m.id]||0)*14,transform:"translateX(-50%)",fontSize:10.5,color,whiteSpace:"nowrap",maxWidth:146,overflow:"hidden",textOverflow:"ellipsis",pointerEvents:"none"}}>{m.title}</div>
              </React.Fragment>;
            })}
          </Row>
          {depts.map(d=>{
            const all = allDated.filter(t=>t.department===d);
            const lay = layout(dated.filter(t=>t.department===d));
            const done = all.filter(t=>t.status==="Abgeschlossen").length;
            const lateN = all.filter(t=>t.status!=="Abgeschlossen" && t.due_date<today).length;
            const pct = all.length ? Math.round(done/all.length*100) : 0;
            return (
              <Row key={d} label={translateString(d)} height={Math.max(44, 16 + lay.lanes*LANE_H)} sub={
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{flex:1,height:4,background:PAPER,borderRadius:3,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:pct>=80?GOOD:BRASS}} /></div>
                  <span style={{fontSize:10.5,color:lateN?BAD:INK_MUTED,whiteSpace:"nowrap"}} data-no-i18n="">{done}/{all.length}{lateN ? " · "+tf("{0} überfällig", lateN) : ""}</span>
                </div>}>
                {lay.placed.map(({t,lane})=><Dot key={t.id} t={t} lane={lane} />)}
              </Row>
            );
          })}
        </div>
      </Card>

      {picked && (
        <Card style={{marginBottom:14,borderColor:BRASS}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,marginBottom:4}}>{picked.item.title}</div>
              <div style={{fontSize:13,color:INK_MUTED,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {picked.kind==="task" ? <React.Fragment>
                  <span>{translateString(picked.item.department)}</span><span>·</span>
                  <span>{tf("fällig {0}", fmtDate(picked.item.due_date))}</span><span>·</span>
                  <Pill {...priorityColor(picked.item.priority)}>{picked.item.priority}</Pill>
                  <span>{picked.item.status}</span>
                  {picked.item.owner && <span data-no-i18n="">· {picked.item.owner}</span>}
                </React.Fragment> : <React.Fragment>
                  <span>◆ {tf("Meilenstein")}</span><span>·</span><span>{fmtDate(picked.item.date)}</span><span>·</span><span>{picked.item.status}</span>
                </React.Fragment>}
              </div>
            </div>
            <button onClick={()=>setPicked(null)} aria-label={tf("Schließen")} style={{...linkBtn,fontSize:16}}>✕</button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{fontWeight:700,marginBottom:6}}>{tf("Was steht an")}</div>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Überfälliges und alles, was in den nächsten 3 Wochen fällig ist.")}</div>
        {agendaGroups.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("In den nächsten 3 Wochen ist nichts fällig.")}</div>}
        {agendaGroups.map(g=>(
          <div key={g.key} style={{marginTop:10}}>
            <div style={{fontSize:12,fontWeight:700,color:g.key==="late"?BAD:INK_MUTED,textTransform:"uppercase",letterSpacing:0.3,marginBottom:4}}>
              {g.key==="late" ? tf("Überfällig") : tf("KW {0}", isoWeekNumber(g.key)) + " · " + fmtDay(g.key,{day:"2-digit",month:"2-digit"}) + " – " + fmtDay(addD(g.key,6),{day:"2-digit",month:"2-digit"})}
            </div>
            {g.items.map(a=>(
              <div key={a.kind+a.item.id} {...pressable(()=>setPicked({kind:a.kind, item:a.item}))}
                style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,cursor:"pointer"}}>
                <span style={{width:84,flexShrink:0,color:a.date<today?BAD:INK_MUTED,fontSize:12.5}} data-no-i18n="">{fmtDay(a.date)}</span>
                {a.kind==="ms"
                  ? <span style={{flex:1,fontWeight:600}}>◆ <span>{a.item.title}</span></span>
                  : <span style={{flex:1}}><span>{a.item.title}</span> <span style={{color:INK_MUTED,fontSize:12}}>· <span>{a.item.department}</span></span></span>}
                {a.kind==="task" && <Pill {...priorityColor(a.item.priority)}>{a.item.priority}</Pill>}
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ------------------------------ KI-Lagebericht ------------------------------ */
const AMPEL = {
  "grün": {color:GOOD, bg:GOOD_SOFT, label:"Im Plan"},
  "gelb": {color:WARN, bg:WARN_SOFT, label:"Verzug – aufholbar"},
  "rot":  {color:BAD,  bg:BAD_SOFT,  label:"Eröffnung gefährdet"},
};
const URGENCY_COLOR = {"sofort":BAD, "diese Woche":WARN, "diesen Monat":INK_MUTED};

// Inhalt eines Lageberichts – im Dashboard und im druckbaren Statusbericht.
function AiReportBody({content, full}){
  const List = ({title, items}) => items && items.length>0 ? (
    <div className="avoid-break" style={{marginTop:12}}>
      <div style={{fontWeight:700,marginBottom:4}}>{title}</div>
      <ul style={{margin:0,paddingLeft:18,lineHeight:1.55}}>{items.map((x,i)=><li key={i}>{x}</li>)}</ul>
    </div>
  ) : null;
  return (
    <div>
      <div style={{lineHeight:1.6}}>{content.zusammenfassung}</div>
      {(content.handlungsbedarf||[]).length>0 && (
        <div style={{marginTop:12}}>
          <div style={{fontWeight:700,marginBottom:4}}>Handlungsbedarf</div>
          {content.handlungsbedarf.map((h,i)=>(
            <div key={i} className="avoid-break" style={{padding:"7px 0",borderTop:`1px solid ${BORDER}`}}>
              <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
                <span style={{fontWeight:600}}>{h.titel}</span>
                <span style={{fontSize:"0.85em",fontWeight:700,color:URGENCY_COLOR[h.dringlichkeit]||INK_MUTED}}>{h.dringlichkeit}</span>
                <span style={{fontSize:"0.85em",color:INK_MUTED}}>{h.abteilung}</span>
              </div>
              <div style={{color:INK_MUTED,marginTop:2,lineHeight:1.5}}>{h.begruendung}</div>
            </div>
          ))}
        </div>
      )}
      {full && <List title="Risikohinweise" items={content.risikohinweise} />}
      {full && <List title="Was gut läuft" items={content.positiv} />}
      {full && <List title="Nächste Schritte (7 Tage)" items={content.naechste_schritte} />}
    </div>
  );
}

function AiReportCard({hotel, api, ai, onChange, readOnly}){
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [full,setFull] = useState(false);
  if(!ai || !ai.enabled) return null;
  const report = ai.report;
  if(readOnly && !report) return null;
  const a = report ? (AMPEL[report.content.ampel] || AMPEL["gelb"]) : null;

  const generate = async () => {
    setBusy(true); setError("");
    try { onChange({...ai, report: await api("/api/hotels/"+hotel.id+"/ai-report","POST")}); setFull(true); }
    catch(e){ setError(e.message); }
    setBusy(false);
  };

  return (
    <Card style={{marginBottom:18,borderColor:a ? a.color : BORDER}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:report||busy||error?12:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontWeight:700}}>KI-Lagebericht</div>
          {a && <Pill color={a.color} bg={a.bg}>{a.label}</Pill>}
          {report && <span style={{fontSize:12,color:INK_MUTED}}>{tf("Stand {0}", fmtDateTime(report.created_at))}</span>}
        </div>
        {!readOnly && <button className={report ? "" : "btn-primary"} onClick={generate} disabled={busy}
          style={report ? {background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"6px 12px",fontSize:12.5,cursor:"pointer"} : {}}>
          {busy ? "Analysiert…" : report ? "Neu erstellen" : "Lagebericht erstellen"}
        </button>}
      </div>
      {!report && !busy && <div style={{fontSize:13,color:INK_MUTED,marginTop:8}}>
        Die KI wertet Aufgaben, Meilensteine, Risiken, Budget und Personal aus und schreibt eine Einschätzung für Geschäftsführung und Eigentümer – mit Ampel, Handlungsbedarf und nächsten Schritten.
      </div>}
      {busy && <div style={{fontSize:13,color:INK_MUTED}}>Die KI analysiert den Projektstand. Das dauert meist 20–60 Sekunden …</div>}
      {error && <div style={{color:BAD,fontSize:13}}>{error}</div>}
      {report && !busy && (
        <div style={{fontSize:13.5}}>
          <AiReportBody content={report.content} full={full} />
          <button style={{...linkBtn,marginTop:8,paddingLeft:0}} onClick={()=>setFull(!full)}>{full ? "Weniger anzeigen" : "Risikohinweise und nächste Schritte anzeigen"}</button>
        </div>
      )}
    </Card>
  );
}

/* ----------------------------------- Abo ----------------------------------- */
// Kontaktadresse für Enterprise-Anfragen; leer = kein Mail-Link
const CONTACT_EMAIL = "";

