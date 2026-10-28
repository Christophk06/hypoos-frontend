function DashboardView({readiness, tasks, risks, budget, staff, onOpen, lead=true}){
  if(!readiness) return <div style={{color:INK_MUTED}}>Lädt…</div>;
  const planned = budget.reduce((s,i)=>s+Number(i.planned||0),0);
  const actual = budget.reduce((s,i)=>s+Number(i.actual||0),0);
  const budgetPct = planned>0 ? Math.round(actual/planned*100) : 0;
  const need = staff.reduce((s,p)=>s+p.headcount,0);
  const have = staff.reduce((s,p)=>s+p.filled,0);
  const staffPct = need>0 ? Math.round(have/need*100) : 0;
  const overdue = tasks.filter(t=>t.due_date && new Date(t.due_date) < new Date() && t.status!=="Abgeschlossen" && t.priority==="Kritisch");
  const topRisks = [...risks].sort((a,b)=>b.probability*b.impact - a.probability*a.impact).slice(0,4);
  const color = readiness.overall>=80?GOOD_TEXT:readiness.overall>=60?WARN_TEXT:BAD;
  return (
    <div>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:18,marginBottom:18}}>
        <Card style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{fontFamily:"Fraunces, serif",fontSize:44,fontWeight:600,color}}>{readiness.overall}%</div>
          <div>
            <div style={{fontSize:12.5,color:INK_MUTED,fontWeight:600}} title="Wie viel von dem, was bis heute fällig war, erledigt ist – abzüglich Risiken, Personal- und Budgetlücken. 100 % heißt: voll im Zeitplan.">BEREITSCHAFT · IM ZEITPLAN ⓘ</div>
            <Pill color={color} bg={readiness.overall>=80?GOOD_SOFT:readiness.overall>=60?WARN_SOFT:BAD_SOFT}>
              {tf("{0} überfällig · {1} hohe Risiken", readiness.overdueCriticalTasksCount, readiness.highRisksCount)}
            </Pill>
            <div style={{fontSize:12,color:INK_MUTED,marginTop:6,lineHeight:1.5}}>
              {readiness.progressPct!=null && <div>Gesamtfortschritt: <b style={{color:INK}}>{readiness.progressPct} %</b> aller Aufgaben erledigt</div>}
              {readiness.daysToOpening!=null &&<div>{readiness.daysToOpening>=0 ? tf("Noch {0} Tage bis zur Eröffnung", readiness.daysToOpening) : tf("Eröffnung war vor {0} Tagen", -readiness.daysToOpening)}</div>}
              {readiness.staffingPct!=null && <div>{tf("Personal {0} % besetzt", readiness.staffingPct)}{readiness.overdueOpenPositionsCount>0 && <span style={{color:BAD}}> · {tf("{0} Stellen über Starttermin offen", readiness.overdueOpenPositionsCount)}</span>}</div>}
              {(readiness.overBudgetDepts||[]).length>0 && <div style={{color:BAD}}>{tf("Budget überschritten: {0}", readiness.overBudgetDepts.map(translateString).join(", "))}</div>}
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="ui-h" style={{fontWeight:700,marginBottom:8}}>Bereitschaft je Abteilung</h2>
          {Object.entries(readiness.deptScores||{}).map(([dept,score])=>(
            <div key={dept} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0"}}>
              <div className="dept-label" style={{width:150,fontSize:13}}>{dept}</div>
              <div style={{flex:1,height:6,background:PAPER,borderRadius:4,overflow:"hidden"}}>
                <div style={{width:score+"%",height:"100%",background:score>=80?GOOD:score>=60?WARN:BAD}}></div>
              </div>
              <div style={{width:32,textAlign:"right",fontSize:13,fontWeight:700}}>{score}%</div>
            </div>
          ))}
        </Card>
      </div>
      {lead && <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:18,marginBottom:18}}>
        <div {...pressable(()=>onOpen("budget"))} style={{cursor:"pointer"}}>
          <Card>
            <h2 className="ui-h" style={{fontWeight:700,marginBottom:8}}>Budget</h2>
            {budget.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>Noch keine Posten – hier anlegen →</div> : (
              <React.Fragment>
                <div style={{fontSize:13.5,marginBottom:8}}>{tf("{0} von {1} ausgegeben", fmtEur(actual), fmtEur(planned))}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Bar pct={budgetPct} color={budgetPct>100?BAD:budgetPct>90?WARN:GOOD} />
                  <div style={{width:40,textAlign:"right",fontSize:13,fontWeight:700}}>{budgetPct}%</div>
                </div>
                {actual>planned && <div style={{color:BAD,fontSize:12.5,marginTop:6}}>{tf("Um {0} überschritten", fmtEur(actual-planned))}</div>}
              </React.Fragment>
            )}
          </Card>
        </div>
        <div {...pressable(()=>onOpen("staff"))} style={{cursor:"pointer"}}>
          <Card>
            <h2 className="ui-h" style={{fontWeight:700,marginBottom:8}}>Personal</h2>
            {staff.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>Noch keine Stellen – hier anlegen →</div> : (
              <React.Fragment>
                <div style={{fontSize:13.5,marginBottom:8}}>{tf("{0} von {1} Personen eingestellt · {2} offen", have, need, need-have)}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Bar pct={staffPct} color={staffPct>=80?GOOD:staffPct>=50?WARN:BAD} />
                  <div style={{width:40,textAlign:"right",fontSize:13,fontWeight:700}}>{staffPct}%</div>
                </div>
              </React.Fragment>
            )}
          </Card>
        </div>
      </div>}
      <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:18}}>
        <Card>
          <h2 className="ui-h" style={{fontWeight:700,marginBottom:10}}>Überfällige kritische Aufgaben</h2>
          {overdue.length===0 ? <div style={{color:INK_MUTED,fontSize:13.5}}>Keine.</div> :
            overdue.map(t=><div key={t.id} style={{padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>{t.title} <span style={{color:INK_MUTED}}>· {t.department}</span></div>)}
        </Card>
        {lead && <Card>
          <h2 className="ui-h" style={{fontWeight:700,marginBottom:10}}>Höchste Risiken</h2>
          {topRisks.map(r=><div key={r.id} style={{padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>{r.title} <span style={{color:INK_MUTED}}>· {tf("Score {0}", r.probability*r.impact)}</span></div>)}
        </Card>}
      </div>
    </div>
  );
}

const linkBtn = {background:"none",border:"none",color:INK_MUTED,cursor:"pointer",fontSize:12.5,padding:"2px 4px"};
function confirmDelete(what){ return window.confirm(tf("{0} wirklich löschen? Das kann nicht rückgängig gemacht werden.", what)); }

// " · 90 Tage vor Eröffnung" für Einträge, deren Termin dem Eröffnungsdatum folgt.
function offsetLabel(days){
  if(days==null) return "";
  if(days===0) return " · am Eröffnungstag";
  return " · " + tf(days<0 ? "{0} Tage vor Eröffnung" : "{0} Tage nach Eröffnung", Math.abs(days));
}

function TemplatePanel({callHotel, refresh, onClose}){
  const [preview,setPreview]=useState(null);
  const [skipPast,setSkipPast]=useState(false);
  const [hotelType,setHotelType]=useState("");
  const [error,setError]=useState(""); const [result,setResult]=useState(""); const [busy,setBusy]=useState(false);
  useEffect(()=>{ callHotel("/template-preview"+(hotelType?"?hotelType="+hotelType:"")).then(setPreview).catch(e=>setError(e.message)); },[hotelType]);
  const apply = async () => {
    setBusy(true); setError("");
    try {
      const r = await callHotel("/apply-template","POST",{skipPast, hotelType:hotelType||undefined});
      setResult(tf("{0} Aufgaben und {1} Meilensteine angelegt.", r.tasksCreated, r.milestonesCreated)+(r.skippedPast?" "+tf("{0} vergangene weggelassen.", r.skippedPast):""));
      setPreview(null); refresh();
    } catch(e){ setError(e.message); }
    setBusy(false);
  };
  const total = preview ? preview.tasks + preview.milestones : 0;
  return (
    <Card style={{marginBottom:16,borderColor:BRASS}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <h2 className="ui-h" style={{fontWeight:700,marginBottom:6}}>Vorlage: Standard-Eröffnungsplanung</h2>
        {onClose && <button style={linkBtn} onClick={onClose}>Schließen</button>}
      </div>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>
        Typische Pre-Opening-Aufgaben und Meilensteine für alle Abteilungen, terminiert relativ zum Eröffnungsdatum.
        Verschiebt sich die Eröffnung, wandern diese Termine automatisch mit – bis du einen Termin selbst änderst.
      </div>
      {!result && <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,marginBottom:12,flexWrap:"wrap"}}><span>{tf("Art des Hotels")}:</span>
        <select className="input" style={{width:"auto"}} value={hotelType} onChange={e=>setHotelType(e.target.value)}>{HOTEL_TYPE_OPTIONS.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select>
        <span style={{color:INK_MUTED,fontSize:12}}>{tf("ergänzt passende Aufgaben, z. B. Spa und Pool beim Resort")}</span></label>}
      {error && <ErrorText>{error}</ErrorText>}
      {result && <div style={{color:GOOD,fontSize:13}}>{result}</div>}
      {!preview && !error && !result && <div style={{fontSize:13,color:INK_MUTED}}>Wird geprüft…</div>}
      {preview && total===0 && <div style={{fontSize:13}}>Die Vorlage ist bereits vollständig angewendet.</div>}
      {preview && total>0 && (
        <React.Fragment>
          <div style={{fontSize:13.5,marginBottom:10}}>
            <b>{tf("Neu angelegt werden {0} Aufgaben und {1} Meilensteine.", preview.tasks, preview.milestones)}</b>
            {preview.alreadyApplied>0 && <span style={{color:INK_MUTED}}> {tf("({0} sind schon vorhanden und werden übersprungen)", preview.alreadyApplied)}</span>}
          </div>
          {preview.past>0 && (
            <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13,marginBottom:12,cursor:"pointer"}}>
              <input type="checkbox" checked={skipPast} onChange={e=>setSkipPast(e.target.checked)} style={{marginTop:2}} />
              <span>{tf("{0} davon hätten ihren Termin schon vor heute. Diese weglassen (sonst werden sie als überfällig angelegt).", preview.past)}</span>
            </label>
          )}
          <button className="btn-primary" onClick={apply} disabled={busy}>{busy?"Wird angelegt…":"Vorlage anwenden"}</button>
        </React.Fragment>
      )}
    </Card>
  );
}

/* -------------------------------- Excel-Import -------------------------------- */
// Welche Spaltenüberschriften (klein geschrieben, ohne Sonderzeichen) zu welchem Feld gehören
const IMPORT_FIELDS = [
  {key:"title", label:"Aufgabe", hints:["aufgabe","titel","task","title","bezeichnung","beschreibung","todo","massnahme","maßnahme","name"]},
  {key:"department", label:"Abteilung", hints:["abteilung","bereich","department","dept","team","gewerk"]},
  {key:"priority", label:"Priorität", hints:["prioritat","priorität","prio","priority","wichtigkeit"]},
  {key:"status", label:"Status", hints:["status","stand","state","erledigt","done"]},
  {key:"due_date", label:"Fällig am", hints:["fallig","fällig","fälligkeit","termin","deadline","due","datum","date","bis","frist","enddatum","ende"]},
  {key:"owner", label:"Zuständig", hints:["zustandig","zuständig","verantwortlich","owner","responsible","wer","assigned","person"]},
];
const normHeader = (h) => String(h||"").toLowerCase().replace(/[^a-zäöüß]/g,"");
function guessMapping(headers){
  const used = new Set(); const map = {};
  for(const f of IMPORT_FIELDS){
    // Erst exakte Treffer ("Status"), dann enthaltene ("Fälligkeitsdatum" enthält "fällig")
    const free = (test) => headers.findIndex((h,i)=>!used.has(i) && f.hints.some(x=>test(normHeader(h), normHeader(x))));
    const exact = free((h,x)=>h===x);
    const idx = exact>=0 ? exact : free((h,x)=>x.length>=4 && h.includes(x));
    if(idx>=0){ map[f.key]=idx; used.add(idx); }
  }
  return map;
}
// Excel-Datumswerte (Seriennummern) in der Vorschau lesbar zeigen; der Server wertet sie selbst aus.
function previewCell(v){
  if(typeof v==="number" && v>20000 && v<80000) return new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000).toLocaleDateString(UI_LOCALE);
  return String(v ?? "");
}

function ImportPanel({callHotel, refresh, onClose}){
  const [sheet,setSheet] = useState(null); // {name, headers, rows}
  const [map,setMap] = useState({});
  const [error,setError] = useState(""); const [result,setResult] = useState(""); const [busy,setBusy] = useState(false);

  const readFile = async (file) => {
    setError(""); setResult(""); setSheet(null);
    if(!file) return;
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const wb = XLSX.read(await file.arrayBuffer(), {type:"array"});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const all = XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:""}).filter(r=>r.some(c=>String(c).trim()!==""));
      if(all.length<2) throw new Error("In der Datei wurden keine Zeilen unter der Überschrift gefunden.");
      // Überschrift = erste Zeile mit mindestens zwei Textzellen
      const headIdx = Math.max(0, all.findIndex(r=>r.filter(c=>typeof c==="string" && c.trim()).length>=2));
      const headers = all[headIdx].map(h=>String(h).trim());
      const rows = all.slice(headIdx+1);
      setSheet({name:file.name, headers, rows});
      setMap(guessMapping(headers));
    } catch(e){ setError(tf("Datei konnte nicht gelesen werden: {0}", e.message)); }
  };

  const rowsForImport = () => (sheet ? sheet.rows : []).map(r => {
    const o = {}; for(const f of IMPORT_FIELDS) if(map[f.key]!=null && map[f.key]!=="") o[f.key] = r[map[f.key]];
    return o;
  });
  const valid = rowsForImport().filter(r=>String(r.title??"").trim());

  const doImport = async () => {
    setBusy(true); setError("");
    try {
      const r = await callHotel("/tasks/bulk","POST",{tasks: rowsForImport()});
      setResult(r.skipped ? tf("{0} Aufgaben importiert, {1} leere Zeilen übersprungen.", r.created, r.skipped) : tf("{0} Aufgaben importiert.", r.created));
      setSheet(null); refresh();
    } catch(e){ setError(e.message); }
    setBusy(false);
  };

  return (
    <Card style={{marginBottom:16,borderColor:BRASS}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <h2 className="ui-h" style={{fontWeight:700,marginBottom:6}}>Aufgaben aus Excel oder CSV importieren</h2>
        <button style={linkBtn} onClick={onClose}>Schließen</button>
      </div>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>
        Erste Tabelle der Datei, eine Aufgabe pro Zeile. Spalten wie „Aufgabe“, „Abteilung“, „Priorität“, „Status“, „Fällig“ und „Zuständig“ werden automatisch erkannt – auch auf Englisch.
      </div>
      <input type="file" accept=".xlsx,.xls,.csv,.ods" onChange={e=>readFile(e.target.files[0])} style={{fontSize:13,marginBottom:10}} />
      {error && <ErrorText style={{marginTop:6}}>{error}</ErrorText>}
      {result && <div style={{color:GOOD,fontSize:13,marginTop:6}}>{result}</div>}
      {sheet && (
        <div style={{marginTop:8}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Spalten zuordnen</div>
          <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:10,marginBottom:12}}>
            {IMPORT_FIELDS.map(f=>(
              <Field key={f.key} label={f.label + (f.key==="title"?" (Pflicht)":"")}>
                <select className="input" value={map[f.key]??""} onChange={e=>setMap({...map,[f.key]:e.target.value===""?null:Number(e.target.value)})}>
                  <option value="">– nicht importieren –</option>
                  {sheet.headers.map((h,i)=><option key={i} value={i}>{h || tf("Spalte {0}", i+1)}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:6}}>{tf("Vorschau der ersten Zeilen ({0} von {1} Zeilen haben einen Aufgabentitel):", valid.length, sheet.rows.length)}</div>
          <div style={{overflowX:"auto",border:`1px solid ${BORDER}`,borderRadius:6,marginBottom:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
              <thead><tr>{IMPORT_FIELDS.filter(f=>map[f.key]!=null).map(f=><th key={f.key} style={{textAlign:"left",padding:"6px 8px",background:PAPER,whiteSpace:"nowrap"}}>{f.label}</th>)}</tr></thead>
              <tbody>{sheet.rows.slice(0,5).map((r,i)=>(
                <tr key={i} style={{borderTop:`1px solid ${BORDER}`}}>{IMPORT_FIELDS.filter(f=>map[f.key]!=null).map(f=><td key={f.key} style={{padding:"6px 8px"}}>{previewCell(r[map[f.key]])}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{fontSize:12,color:INK_MUTED,marginBottom:10}}>Unbekannte Prioritäten werden zu „Mittel“, unbekannter Status zu „Nicht begonnen“, fehlende Abteilung zu „Allgemein“. Zuständige werden als Text übernommen – Teammitglieder kannst du danach zuweisen.</div>
          <button className="btn-primary" onClick={doImport} disabled={busy || map.title==null || valid.length===0}>
            {busy ? "Importiert…" : tf("{0} Aufgaben importieren", valid.length)}
          </button>
        </div>
      )}
    </Card>
  );
}

function MyTasksView({orgId, api, hotelId, refresh}){
  const [items,setItems] = useState(null);
  const [error,setError] = useState("");
  const [showDone,setShowDone] = useState(false);
  const load = useCallback(()=>{ api("/api/organizations/"+orgId+"/my-tasks").then(setItems).catch(e=>setError(e.message)); }, [api, orgId]);
  useEffect(()=>{ load(); }, [load]);
  const updateStatus = async (t, status) => {
    setError("");
    try { await api("/api/tasks/"+t.id, "PATCH", {status}); load(); if(t.hotel_id===hotelId) refresh(); }
    catch(e){ setError(e.message); }
  };
  if(items===null) return <div style={{color:error?BAD:INK_MUTED}}>{error || "Lädt…"}</div>;
  const today = new Date().toISOString().slice(0,10);
  const open = items.filter(t=>t.status!=="Abgeschlossen");
  const done = items.filter(t=>t.status==="Abgeschlossen");
  const overdue = open.filter(t=>t.due_date && t.due_date < today).length;
  const list = showDone ? items : open;
  return (
    <div>
      <div className="stack" style={{display:"flex",gap:14,marginBottom:18}}>
        <StatTile label="OFFEN" value={open.length} sub={tf("dir zugewiesen, alle Hotels")} />
        <StatTile label="ÜBERFÄLLIG" value={overdue} color={overdue>0?BAD:INK} sub={tf("Termin schon vorbei")} />
        <StatTile label="ERLEDIGT" value={done.length} color={GOOD} />
      </div>
      {error && <ErrorText style={{marginBottom:12}}>{error}</ErrorText>}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
        <label style={{fontSize:13,display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}>
          <input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)} /> Erledigte anzeigen
        </label>
      </div>
      <Card style={{padding:0}}>
        <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
          {list.length===0 && <tr><td style={{padding:16,color:INK_MUTED}}>
            {items.length===0 ? "Dir ist noch keine Aufgabe zugewiesen. Zuständigkeiten legst du unter „Aufgaben“ beim Bearbeiten fest." : "Keine offenen Aufgaben – alles erledigt."}
          </td></tr>}
          {list.map(t=>{
            const late = t.status!=="Abgeschlossen" && t.due_date && t.due_date < today;
            return (
              <tr key={t.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={{padding:12}}>{t.title}<div style={{fontSize:11.5,color:INK_MUTED}}>{t.hotel_name} · {t.department}</div></td>
                <td style={{padding:12}}><Pill {...priorityColor(t.priority)}>{t.priority}</Pill></td>
                <td style={{padding:12}}>
                  <select value={t.status} onChange={e=>updateStatus(t,e.target.value)} className="input" aria-label={tf("Status von „{0}“", t.title)} style={{width:"auto",padding:"5px 8px",fontSize:12.5}}>{TASK_STATUSES.map(st=><option key={st}>{st}</option>)}</select>
                </td>
                <td style={{padding:12,whiteSpace:"nowrap",color:late?BAD:INK_MUTED,fontWeight:late?600:400}}>{fmtDate(t.due_date)}{late ? " · überfällig" : ""}</td>
              </tr>
            );
          })}
        </tbody></table>
      </Card>
    </div>
  );
}

// Auswahl eines Teammitglieds als Zuständige/n.
function AssigneeSelect({value, onChange, members}){
  return (
    <select className="input" value={value||""} onChange={e=>onChange(e.target.value)} title={tf("Zuständig im Team")} aria-label={tf("Zuständig im Team")}>
      <option value="">— niemand aus dem Team —</option>
      {members.map(m=><option key={m.user_id} value={m.user_id}>{m.email}</option>)}
    </select>
  );
}
function memberEmail(members, id){ const m = members.find(x=>x.user_id===id); return m ? m.email : ""; }

const LS_TASK_FILTERS = "hpoos_task_filters_v1";
const TASK_FILTER_DEFAULTS = {q:"", department:"", status:"", sort:"due", mine:false, overdue:false, unassigned:false};
const PRIORITY_RANK = {Kritisch:0, Hoch:1, Mittel:2, Niedrig:3};

// Wendet Suche, Filter und Sortierung auf die Aufgabenliste an.
function filterTasks(tasks, f, {me, members}){
  const today = new Date().toISOString().slice(0,10);
  const q = f.q.trim().toLowerCase();
  const list = tasks.filter(t=>{
    if(f.department && t.department!==f.department) return false;
    if(f.status==="open" && t.status==="Abgeschlossen") return false;
    if(f.status && f.status!=="open" && t.status!==f.status) return false;
    if(f.mine && !(me && t.assignee_id===me.id)) return false;
    if(f.unassigned && t.assignee_id) return false;
    if(f.overdue && !(t.due_date && t.due_date<today && t.status!=="Abgeschlossen")) return false;
    if(q){
      const hay = [t.title, t.owner, t.department, memberEmail(members,t.assignee_id)].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const byDue = (a,b) => (a.due_date||"9999") < (b.due_date||"9999") ? -1 : (a.due_date||"9999") > (b.due_date||"9999") ? 1 : 0;
  const cmp = {
    due: byDue,
    priority: (a,b) => (PRIORITY_RANK[a.priority]??9) - (PRIORITY_RANK[b.priority]??9) || byDue(a,b),
    department: (a,b) => a.department.localeCompare(b.department,"de") || byDue(a,b),
  }[f.sort] || byDue;
  return [...list].sort(cmp);
}

// Was im Verlauf für eine Änderung angezeigt wird
function describeEvent(e){
  const v = (x) => x==null || x==="" ? "—" : x;
  const d = (x) => x ? fmtDate(x) : "kein Termin";
  switch(e.kind){
    case "created":  return "hat die Aufgabe angelegt";
    case "status":   return <span>Status: {v(e.old_value)} → <b>{v(e.new_value)}</b></span>;
    case "due_date": return <span>Termin: {d(e.old_value)} → <b>{d(e.new_value)}</b>{e.automatic ? " (Eröffnung verschoben)" : ""}</span>;
    case "assignee": return <span>Zuständig: {e.old_value || "niemand"} → <b>{e.new_value || "niemand"}</b></span>;
    case "priority": return <span>Priorität: {v(e.old_value)} → <b>{v(e.new_value)}</b></span>;
    case "title":    return <span>Titel: „{v(e.old_value)}“ → <b>„{v(e.new_value)}“</b></span>;
    default:         return e.kind;
  }
}
function fmtDateTime(iso){
  return new Date(iso).toLocaleString(UI_LOCALE,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

// Kommentare und Änderungsverlauf einer Aufgabe
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
function fmtBytes(n){
  if(!n) return "0 KB";
  if(n < 1024*1024) return Math.max(1, Math.round(n/1024)) + " KB";
  return (n/1024/1024).toLocaleString(UI_LOCALE,{maximumFractionDigits:1}) + " MB";
}
function fileIcon(mime, name){
  const ext = (name.split(".").pop()||"").toLowerCase();
  if((mime||"").startsWith("image/")) return "image";
  if(ext==="pdf") return "file";
  if(["xls","xlsx","csv"].includes(ext)) return "table";
  if(["doc","docx","odt","txt"].includes(ext)) return "filetext";
  return "filetext";
}
// Dateiname für den Speicherpfad: nur unproblematische Zeichen (der Originalname bleibt im Eintrag)
function storageSafeName(name){
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9._-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,100) || "datei";
}

// Liste + Upload von Dokumenten eines Hotels (optional nur einer Aufgabe)
function DocumentsPanel({hotel, api, upload, me, taskId, compact, onChanged}){
  const [docs,setDocs] = useState(null);
  const [error,setError] = useState(""); const [busy,setBusy] = useState("");
  const inputRef = React.useRef(null);
  const load = useCallback(()=>{
    api("/api/hotels/"+hotel.id+"/documents"+(taskId?"?task_id="+taskId:"")).then(setDocs).catch(e=>setError(e.message));
  }, [api, hotel.id, taskId]);
  useEffect(()=>{ load(); }, [load]);

  const uploadFiles = async (files) => {
    setError("");
    for(const file of files){
      if(file.size > MAX_UPLOAD_BYTES){ setError(tf("„{0}“ ist größer als 25 MB.", file.name)); continue; }
      setBusy(tf("Lädt hoch: {0}", file.name));
      const path = hotel.organization_id+"/"+hotel.id+"/"+crypto.randomUUID().slice(0,8)+"-"+storageSafeName(file.name);
      try {
        // Datei direkt in den Supabase-Speicher – mit dem Login des Nutzers, die Regeln greifen dort
        const res = await fetch(upload.supabaseUrl.replace(/\/$/,"")+"/storage/v1/object/documents/"+path.split("/").map(encodeURIComponent).join("/"), {
          method:"POST",
          headers:{Authorization:"Bearer "+(await freshToken(upload.token)), apikey:upload.anonKey, "Content-Type":file.type||"application/octet-stream", "x-upsert":"false"},
          body:file,
        });
        if(!res.ok){ let m=""; try{ m=(await res.json()).message; }catch(e){} throw new Error(m ? tf("Hochladen fehlgeschlagen: {0}", m) : tf("Hochladen fehlgeschlagen")); }
        await api("/api/hotels/"+hotel.id+"/documents","POST",{name:file.name, storage_path:path, size_bytes:file.size, mime_type:file.type, task_id:taskId||null});
      } catch(e){ setError(e.message); }
    }
    setBusy(""); load(); if(onChanged) onChanged();
  };
  const download = async (d) => {
    try {
      const {url} = await api("/api/documents/"+d.id+"/download");
      const a = document.createElement("a"); a.href = url; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    } catch(e){ setError(e.message); }
  };
  const remove = async (d) => {
    if(!window.confirm(tf("„{0}“ löschen? Die Datei wird endgültig entfernt.", d.name))) return;
    try { await api("/api/documents/"+d.id,"DELETE"); load(); if(onChanged) onChanged(); } catch(e){ setError(e.message); }
  };
  const [dragOver,setDragOver] = useState(false);
  const [expiryFor,setExpiryFor] = useState(null);
  const canDelete = (d) => me && (d.uploaded_by===me.id || me.isAdmin);
  const canEditExpiry = (d) => me && (d.uploaded_by===me.id || me.isAdmin || ACCESS.role==="manager");

  return (
    <div>
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);uploadFiles([...e.dataTransfer.files]);}}
        style={{border:`1.5px dashed ${dragOver?BRASS:BORDER}`,background:dragOver?BRASS_SOFT:(compact?"#fff":PAPER),borderRadius:8,padding:compact?"8px 10px":"14px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
        <input ref={inputRef} type="file" multiple style={{display:"none"}} onChange={e=>{ uploadFiles([...e.target.files]); e.target.value=""; }} />
        <button className="btn-primary" onClick={()=>inputRef.current.click()} disabled={!!busy} style={compact?{padding:"6px 12px",fontSize:12.5}:{}}>{compact?"Datei anhängen":"Dateien hochladen"}</button>
        <span style={{fontSize:12,color:INK_MUTED}}>{busy || "oder hierher ziehen · max. 25 MB je Datei"}</span>
      </div>
      {error && <ErrorText style={{fontSize:12.5,marginBottom:8}}>{error}</ErrorText>}
      {docs===null && !error && <div style={{fontSize:12.5,color:INK_MUTED}}>Lädt…</div>}
      {docs && docs.length===0 && <div style={{fontSize:12.5,color:INK_MUTED}}>{taskId ? "Keine Anhänge." : "Noch keine Dokumente."}</div>}
      {docs && docs.length>0 && (
        <Card style={{padding:0}}>
          <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>
            {docs.map(d=>(
              <tr key={d.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={{padding:"8px 12px"}}>
                  <button onClick={()=>download(d)} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:INK,fontWeight:600,fontSize:13.5,textAlign:"left",wordBreak:"break-word"}}><Icon n={fileIcon(d.mime_type,d.name)} /> {d.name}</button>
                  <div style={{fontSize:11.5,color:INK_MUTED}}>
                    {fmtBytes(d.size_bytes)} · {d.uploaded_by && me && d.uploaded_by===me.id ? tf("von dir") : (d.uploaded_by_email ? tf("von {0}", d.uploaded_by_email) : "")} · {fmtDateTime(d.created_at)}
                    {!taskId && d.task_title ? <span> · {tf("Aufgabe: {0}", d.task_title)}</span> : null}
                    {d.category ? <span> · {d.category}</span> : null}
                    {(()=>{ const x = docExpiryInfo(d); return x ? <span style={{color:x.color,fontWeight:x.color===INK_MUTED?400:600}}> · {x.text}</span> : null; })()}
                  </div>
                  {expiryFor===d.id && <DocExpiryEditor d={d} api={api} onSaved={()=>{ setExpiryFor(null); load(); }} onClose={()=>setExpiryFor(null)} />}
                </td>
                <td style={{padding:"8px 12px",whiteSpace:"nowrap",textAlign:"right"}}>
                  {!taskId && canEditExpiry(d) && <button style={linkBtn} onClick={()=>setExpiryFor(expiryFor===d.id?null:d.id)}>{tf("Ablauf")}</button>}
                  <button style={linkBtn} onClick={()=>download(d)}>Herunterladen</button>
                  {canDelete(d) && <button style={linkBtn} onClick={()=>remove(d)} title="Löschen">✕</button>}
                </td>
              </tr>
            ))}
          </tbody></table>
        </Card>
      )}
    </div>
  );
}

function TaskActivity({taskId, api, me, onChanged, docCtx}){
  const [items,setItems] = useState(null);
  const [text,setText] = useState("");
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const [showHistory,setShowHistory] = useState(true);
  const load = useCallback(()=>{ api("/api/tasks/"+taskId+"/activity").then(setItems).catch(e=>setError(e.message)); }, [api, taskId]);
  useEffect(()=>{ load(); }, [load]);
  const who = (it) => it.user_id && me && it.user_id===me.id ? "Du" : (it.email || "Unbekannt");
  const send = async () => {
    if(!text.trim()) return;
    setBusy(true); setError("");
    try { await api("/api/tasks/"+taskId+"/comments","POST",{body:text}); setText(""); load(); onChanged(); }
    catch(e){ setError(e.message); }
    setBusy(false);
  };
  const del = async (c) => {
    if(!window.confirm("Kommentar löschen?")) return;
    try { await api("/api/comments/"+c.id,"DELETE"); load(); onChanged(); } catch(e){ setError(e.message); }
  };
  const shown = (items||[]).filter(it => it.type==="comment" || showHistory);
  return (
    <div style={{paddingTop:6}}>
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        <textarea className="input" rows={2} placeholder="Kommentar schreiben … (Strg+Enter zum Senden)" value={text}
          onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && (e.ctrlKey||e.metaKey)) send(); }}
          style={{resize:"vertical",fontSize:13.5,background:"#fff"}} />
        <button className="btn-primary" onClick={send} disabled={busy||!text.trim()}>{busy?"…":"Senden"}</button>
      </div>
      {error && <ErrorText style={{fontSize:12.5,marginTop:6}}>{error}</ErrorText>}
      <div style={{display:"flex",justifyContent:"flex-end",margin:"8px 0 4px"}}>
        <label style={{fontSize:12,color:INK_MUTED,display:"flex",gap:5,alignItems:"center",cursor:"pointer"}}>
          <input type="checkbox" checked={showHistory} onChange={e=>setShowHistory(e.target.checked)} /> Änderungsverlauf anzeigen
        </label>
      </div>
      {items===null && !error && <div style={{fontSize:12.5,color:INK_MUTED}}>Lädt…</div>}
      {items && shown.length===0 && <div style={{fontSize:12.5,color:INK_MUTED}}>Noch keine Kommentare.</div>}
      {docCtx && (
        <div style={{margin:"10px 0"}}>
          <div style={{fontSize:12,fontWeight:700,color:INK_MUTED,margin:"0 0 6px"}}>ANHÄNGE</div>
          <DocumentsPanel hotel={docCtx.hotel} api={api} upload={docCtx.upload} me={docCtx.me} taskId={taskId} compact onChanged={onChanged} />
        </div>
      )}
      {shown.map(it => it.type==="comment" ? (
        <div key={it.id} style={{background:"#fff",border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 10px",margin:"6px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11.5,color:INK_MUTED,marginBottom:3}}>
            <span><b style={{color:INK}}>{who(it)}</b> · {fmtDateTime(it.at)}</span>
            {me && it.user_id===me.id && <button style={{...linkBtn,fontSize:11.5,padding:0}} onClick={()=>del(it)}>löschen</button>}
          </div>
          <div style={{fontSize:13.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{it.body}</div>
        </div>
      ) : (
        <div key={it.id} style={{fontSize:12,color:INK_MUTED,padding:"3px 2px 3px 10px",borderLeft:`2px solid ${BORDER}`,margin:"2px 0"}}>
          {it.automatic ? "Automatisch" : who(it)} · {describeEvent(it)} · {fmtDateTime(it.at)}
        </div>
      ))}
    </div>
  );
}

function TasksView({tasks, callHotel, callId, refresh, members, me, api, docCtx}){
  const empty = {title:"",department:(editableDepts()[0]||DEPARTMENTS[0]),priority:"Mittel",status:"Nicht begonnen",due_date:"",owner:"",assignee_id:""};
  const [showForm,setShowForm]=useState(false);
  const [draft,setDraft]=useState(empty);
  const [editId,setEditId]=useState(null); const [edit,setEdit]=useState(null);
  const [error,setError]=useState("");
  const run = async (fn) => { setError(""); try { await fn(); refresh(); } catch(e){ setError(e.message); } };
  const [titleErr,setTitleErr]=useState("");
  const titleRef = React.useRef(null);
  const add = () => {
    if(!draft.title.trim()){ setTitleErr(tf("Bitte einen Titel für die Aufgabe eingeben.")); if(titleRef.current) titleRef.current.focus(); return; }
    setTitleErr("");
    run(async()=>{ await callHotel("/tasks","POST",draft); setShowForm(false); setDraft({...draft,title:""}); });
  };
  const updateStatus = (id,status) => run(()=>callId("tasks",id,"PATCH",{status}));
  const [origDue,setOrigDue]=useState("");
  const [showTemplate,setShowTemplate]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [openActivity,setOpenActivity]=useState(null);
  const startEdit = (t) => { setEditId(t.id); setOrigDue(t.due_date||""); setEdit({title:t.title,department:t.department,priority:t.priority,due_date:t.due_date||"",owner:t.owner||"",assignee_id:t.assignee_id||"",depends_on:t.depends_on||[],duration_days:t.duration_days||""}); };
  const plan = planTasks(tasks, docCtx && docCtx.hotel ? docCtx.hotel.opening_date : null);
  const conflictOf = (id) => plan.conflicts.filter(c=>c.task===id);
  // Termin nur mitschicken, wenn er geändert wurde – sonst bliebe die Aufgabe nicht mehr ans Eröffnungsdatum gekoppelt.
  const saveEdit = () => { if(!edit.title) return; const body={...edit}; if(body.due_date===origDue) delete body.due_date; run(async()=>{ await callId("tasks",editId,"PATCH",body); setEditId(null); }); };
  const remove = (t) => { if(confirmDelete(tf("Aufgabe „{0}“", t.title))) run(()=>callId("tasks",t.id,"DELETE")); };

  // Filter und Sortierung (pro Browser gemerkt)
  const [filters,setFilters] = useState(()=>{
    try { return {...TASK_FILTER_DEFAULTS, ...JSON.parse(window.localStorage.getItem(LS_TASK_FILTERS)||"{}")}; }
    catch(e){ return TASK_FILTER_DEFAULTS; }
  });
  const setFilter = (k,v) => setFilters(f=>{ const n={...f,[k]:v}; try { window.localStorage.setItem(LS_TASK_FILTERS, JSON.stringify(n)); } catch(e){} return n; });
  const resetFilters = () => { setFilters(TASK_FILTER_DEFAULTS); try { window.localStorage.removeItem(LS_TASK_FILTERS); } catch(e){} };
  const visible = filterTasks(tasks, filters, {me, members});
  const filtersActive = JSON.stringify({...filters, sort:null}) !== JSON.stringify({...TASK_FILTER_DEFAULTS, sort:null});
  const chip = (key,label) => (
    <button onClick={()=>setFilter(key,!filters[key])}
      style={{border:`1px solid ${filters[key]?INK:BORDER}`,background:filters[key]?INK:"#fff",color:filters[key]?"#fff":INK,borderRadius:999,padding:"6px 12px",fontSize:12.5,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
  );

  return (
    <div>
      {docCtx && docCtx.hotel && <CriticalPathCard hotel={docCtx.hotel} tasks={tasks} />}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        {ACCESS.role==="admin" && <button onClick={()=>setShowImport(!showImport)} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"9px 14px",fontSize:13.5,cursor:"pointer",marginRight:8}}>Aus Excel importieren</button>}
        {ACCESS.role==="admin" && <button onClick={()=>setShowTemplate(!showTemplate)} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"9px 14px",fontSize:13.5,cursor:"pointer",marginRight:8}}>Aus Vorlage ergänzen</button>}
        {editableDepts().length>0 && <button className="btn-primary" onClick={()=>setShowForm(!showForm)}>+ Aufgabe</button>}
      </div>
      {error && <ErrorText style={{marginBottom:12}}>{error}</ErrorText>}
      {showImport && <ImportPanel callHotel={callHotel} refresh={refresh} onClose={()=>setShowImport(false)} />}
      {ACCESS.role==="admin" && (showTemplate || (tasks.length===0 && !showImport)) && <TemplatePanel callHotel={callHotel} refresh={()=>{ setShowTemplate(true); refresh(); }} onClose={tasks.length>0 ? ()=>setShowTemplate(false) : null} />}
      {showForm && (
        <Card style={{marginBottom:16}}>
          <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <input ref={titleRef} className="input" placeholder={tf("Titel")} aria-label={tf("Titel")} aria-required="true" aria-invalid={titleErr ? "true" : undefined} aria-describedby={titleErr ? "task-title-err" : undefined}
              value={draft.title} onChange={e=>{ setDraft({...draft,title:e.target.value}); if(titleErr && e.target.value.trim()) setTitleErr(""); }} onKeyDown={e=>{ if(e.key==="Enter") add(); }} />
            <select className="input" aria-label={tf("Abteilung")} value={draft.department} onChange={e=>setDraft({...draft,department:e.target.value})}>{deptOptions(draft.department).map(d=><option key={d}>{d}</option>)}</select>
            <select className="input" aria-label={tf("Priorität")} value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
          </div>
          {titleErr && <ErrorText id="task-title-err" style={{marginBottom:10}}>{titleErr}</ErrorText>}
          <div className="stack" style={{display:"flex",gap:10}}>
            <input type="date" className="input" aria-label={tf("Fällig am")} value={draft.due_date} onChange={e=>setDraft({...draft,due_date:e.target.value})} />
            <AssigneeSelect value={draft.assignee_id} onChange={v=>setDraft({...draft,assignee_id:v})} members={members} />
            <input className="input" placeholder={tf("Extern / Sonstige")} aria-label={tf("Extern / Sonstige")} value={draft.owner} onChange={e=>setDraft({...draft,owner:e.target.value})} />
            <button className="btn-primary" onClick={add}>Speichern</button>
          </div>
        </Card>
      )}
      {tasks.length>0 && (
        <Card style={{marginBottom:12,padding:14}}>
          <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1.2fr 1fr",gap:10,marginBottom:10}}>
            <input className="input" type="search" placeholder="Suchen: Titel, Zuständige, Externe …" aria-label={tf("Aufgaben durchsuchen")} value={filters.q} onChange={e=>setFilter("q",e.target.value)} />
            <select className="input" aria-label={tf("Nach Abteilung filtern")} value={filters.department} onChange={e=>setFilter("department",e.target.value)}>
              <option value="">Alle Abteilungen</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
            <select className="input" aria-label={tf("Nach Status filtern")} value={filters.status} onChange={e=>setFilter("status",e.target.value)}>
              <option value="">Alle Status</option><option value="open">Alle offenen</option>{TASK_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <select className="input" value={filters.sort} onChange={e=>setFilter("sort",e.target.value)} title={tf("Sortierung")} aria-label={tf("Sortierung")}>
              <option value="due">Nach Termin</option><option value="priority">Nach Priorität</option><option value="department">Nach Abteilung</option>
            </select>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {chip("mine","Nur meine")}{chip("overdue","Überfällig")}{chip("unassigned","Ohne Zuständigkeit")}
            <span style={{marginLeft:"auto",fontSize:12.5,color:INK_MUTED}} aria-live="polite">
              {tf("{0} von {1} Aufgaben", visible.length, tasks.length)}
              {filtersActive && <button style={{...linkBtn,textDecoration:"underline"}} onClick={resetFilters}>Filter zurücksetzen</button>}
            </span>
          </div>
        </Card>
      )}
      <Card style={{padding:0}}>
        <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
          {tasks.length>0 && visible.length===0 && <tr><td style={{padding:16,color:INK_MUTED}}>Keine Aufgabe passt zu den Filtern.</td></tr>}
          {visible.map(t=> editId===t.id ? (
            <tr key={t.id} style={{borderTop:`1px solid ${BORDER}`,background:PAPER}}>
              <td colSpan={5} style={{padding:12}}>
                <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
                  <input className="input" aria-label={tf("Titel")} value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} />
                  <select className="input" aria-label={tf("Abteilung")} value={edit.department} onChange={e=>setEdit({...edit,department:e.target.value})}>{deptOptions(edit.department).map(d=><option key={d}>{d}</option>)}</select>
                  <select className="input" aria-label={tf("Priorität")} value={edit.priority} onChange={e=>setEdit({...edit,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
                </div>
                <div className="stack" style={{display:"flex",gap:10,alignItems:"center"}}>
                  <input type="date" className="input" aria-label={tf("Fällig am")} value={edit.due_date} onChange={e=>setEdit({...edit,due_date:e.target.value})} />
                  <AssigneeSelect value={edit.assignee_id} onChange={v=>setEdit({...edit,assignee_id:v})} members={members} />
                  <input className="input" placeholder={tf("Extern / Sonstige")} aria-label={tf("Extern / Sonstige")} value={edit.owner} onChange={e=>setEdit({...edit,owner:e.target.value})} />
                  <input className="input" type="number" min="1" max="365" style={{width:110}} title={tf("Dauer (Tage)")} aria-label={tf("Dauer (Tage)")} placeholder={tf("Dauer (Tage)")} value={edit.duration_days} onChange={e=>setEdit({...edit,duration_days:e.target.value})} />
                  <button className="btn-primary" onClick={saveEdit}>Speichern</button>
                  <button style={linkBtn} onClick={()=>setEditId(null)}>Abbrechen</button>
                </div>
                <div style={{marginTop:10}}><DependsPicker value={edit.depends_on} onChange={v=>setEdit({...edit,depends_on:v})} tasks={tasks} selfId={editId} /></div>
              </td>
            </tr>
          ) : (
            <React.Fragment key={t.id}>
            <tr style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:12}}>{t.title}<div style={{fontSize:11.5,color:INK_MUTED}}>{t.department}{t.assignee_id ? <span style={{color:t.assignee_id===(me&&me.id)?BRASS_TEXT:INK_MUTED,fontWeight:t.assignee_id===(me&&me.id)?600:400}}> · {t.assignee_id===(me&&me.id) ? "Du" : (memberEmail(members,t.assignee_id)||"Teammitglied")}</span> : ""}{t.owner ? " · "+t.owner : ""}{offsetLabel(t.opening_offset_days)}</div>
                {conflictOf(t.id).map((c,i)=><div key={i} style={{fontSize:11.5,color:BAD,fontWeight:600}}><Icon n="alert" /> {tf("beginnt {0} Tage vor dem Ende von „{1}“", c.days, (tasks.find(x=>x.id===c.pred)||{}).title)}</div>)}
                {plan.critical[t.id] && !conflictOf(t.id).length && <div style={{fontSize:11.5,color:WARN_TEXT,fontWeight:600}}><Icon n="route" /> {tf("kritisch – kein Puffer")}</div>}</td>
              <td style={{padding:12}}><Pill {...priorityColor(t.priority)}>{t.priority}</Pill></td>
              <td style={{padding:12}}>
                <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)} className="input" aria-label={tf("Status von „{0}“", t.title)} style={{width:"auto",padding:"5px 8px",fontSize:12.5}}>{TASK_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
              </td>
              <td style={{padding:12,color:INK_MUTED}}>{fmtDate(t.due_date)}</td>
              <td style={{padding:12,whiteSpace:"nowrap"}}>
                <button style={{...linkBtn,color:openActivity===t.id?INK:INK_MUTED,fontWeight:openActivity===t.id?600:400}} onClick={()=>setOpenActivity(openActivity===t.id?null:t.id)} title="Kommentare und Verlauf">
                  <Icon n="chat" /> {t.comment_count||0}{t.document_count ? <React.Fragment>{"  "}<Icon n="clip" /> {t.document_count}</React.Fragment> : ""}
                </button>
                <button style={linkBtn} onClick={()=>startEdit(t)}>Bearbeiten</button>
                {canManageDept(t.department) && <button style={linkBtn} onClick={()=>remove(t)} title={tf("Löschen")} aria-label={tf("Aufgabe „{0}“ löschen", t.title)}><span aria-hidden="true">✕</span></button>}
              </td>
            </tr>
            {openActivity===t.id && (
              <tr style={{background:PAPER}}>
                <td colSpan={5} style={{padding:"4px 12px 14px"}}>
                  <TaskActivity taskId={t.id} api={api} me={me} onChanged={refresh} docCtx={docCtx} />
                </td>
              </tr>
            )}
            </React.Fragment>
          ))}
        </tbody></table>
      </Card>
    </div>
  );
}

