function addDaysIso(iso, n){ const d = new Date(iso+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function mondayOfIso(iso){ const d = new Date(iso+"T00:00:00Z"); return addDaysIso(iso, -((d.getUTCDay()+6)%7)); }
function todayIso(){ const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function isoWeekNumber(iso){
  const d = new Date(iso+"T00:00:00Z"); const day = (d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-day+3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(),0,4));
  return 1 + Math.round(((d - firstThu)/86400000 - 3 + ((firstThu.getUTCDay()+6)%7))/7);
}
function fmtDay(iso, opts){ return new Date(iso+"T12:00:00").toLocaleDateString(UI_LOCALE, opts || {weekday:"short",day:"2-digit",month:"2-digit"}); }
const shortName = (email) => (email||"").split("@")[0];
function shiftHoursOf(s){
  if(!s.start_time || !s.end_time) return 0;
  const m = (t) => { const [h, mi] = String(t).split(":").map(Number); return h*60 + mi; };
  let d = m(s.end_time) - m(s.start_time); if(d <= 0) d += 24*60;
  return d/60;
}
const fmtHours = (h) => (Math.round(h*10)/10).toLocaleString(UI_LOCALE);
const shiftTimes = (s) => s.start_time ? String(s.start_time).slice(0,5)+"–"+String(s.end_time||"").slice(0,5) : "";

function ShiftChip({s, onClick, draggable, onDragStart}){
  const st = SHIFT_STYLE[s.kind] || SHIFT_STYLE["Frei"];
  return (
    <div onClick={onClick} title={s.note || ""} draggable={!!draggable} onDragStart={onDragStart}
      style={{background:st.bg,color:st.fg,borderRadius:4,padding:"3px 6px",fontSize:11.5,lineHeight:1.3,marginBottom:3,cursor:draggable?"grab":(onClick?"pointer":"default")}}>
      <b>{s.kind}</b>{s.start_time && <div data-no-i18n="" dir="ltr" style={{unicodeBidi:"isolate",textAlign:"start"}}>{shiftTimes(s)}</div>}
    </div>
  );
}

// Dienstplan als Bild zeichnen (zum Teilen per WhatsApp & Co.) – alle Abteilungen, eine Woche
// Logo als Bild laden (für die Teilen-Bilder)
function loadImage(src){ return new Promise(r=>{ if(!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
function drawBrand(x, width, height, logo, color){
  if(color){ x.fillStyle = color; x.fillRect(0, height-4, width, 4); }
  if(logo){ const h = Math.min(height-20, 46), w = Math.min(140, logo.width*h/logo.height);
    x.fillStyle = "#FFFFFF"; x.fillRect(width-w-30, 10, w+16, h+8); x.drawImage(logo, width-w-22, 14, w, h); }
}
function drawRosterImage({hotelName, weekLabel, days, groups, logo, color}){
  const scale = 2, colName = 190, colDay = 132, rowH = 38, headH = 92, deptH = 34, pad = 24;
  const width = pad*2 + colName + colDay*7;
  const rowsTotal = groups.reduce((n,g)=>n + Math.max(1, g.rows.length), 0);
  const height = headH + groups.length*deptH + rowsTotal*rowH + pad + 30;
  const c = document.createElement("canvas");
  c.width = width*scale; c.height = height*scale;
  const x = c.getContext("2d"); x.scale(scale, scale);
  const rtl = document.documentElement.dir === "rtl";
  x.fillStyle = "#FFFFFF"; x.fillRect(0,0,width,height);
  const font = (w, size) => w+" "+size+"px Inter, 'Segoe UI', 'Noto Sans', 'Hiragino Sans', 'Microsoft YaHei', Arial, sans-serif";
  const text = (t, px, py, opts={}) => {
    x.font = font(opts.weight||"400", opts.size||13); x.fillStyle = opts.color||"#1C2430";
    x.textAlign = opts.align||"left"; x.direction = rtl ? "rtl" : "ltr";
    let s = String(t||""); const max = opts.max;
    if(max){ while(s.length>1 && x.measureText(s).width>max) s = s.slice(0,-1); if(s!==String(t||"")) s = s.slice(0,-1)+"…"; }
    x.fillText(s, px, py);
  };
  // Kopf
  x.fillStyle = "#1C2430"; x.fillRect(0,0,width,headH-22);
  drawBrand(x, width, headH-22, logo, color);
  text("Ouverture · " + hotelName, pad, 34, {weight:"600", size:20, color:"#FFFFFF", max: width-pad*2});
  text(tf("Dienstplan") + " · " + weekLabel, pad, 58, {size:14, color:"#C9A66B"});
  // Tage
  days.forEach((d,i)=>text(fmtDay(d), pad+colName+i*colDay+6, headH-6, {weight:"600", size:12, color:"#6B7280"}));
  let y = headH;
  for(const g of groups){
    x.fillStyle = "#F1E8D8"; x.fillRect(pad, y, width-pad*2, deptH);
    text(translateString(g.dept), pad+8, y+22, {weight:"700", size:14});
    y += deptH;
    const rows = g.rows.length ? g.rows : [{name:"—", empty:true}];
    rows.forEach((r,ri)=>{
      if(ri%2===1){ x.fillStyle = "#FAF8F4"; x.fillRect(pad, y, width-pad*2, rowH); }
      text(r.name, pad+8, y+24, {weight:"500", size:13, max: colName-14});
      days.forEach((d,i)=>{
        const list = r.empty ? [] : g.shiftsFor(r, d);
        list.slice(0,2).forEach((s,si)=>{
          const st = SHIFT_STYLE[s.kind] || SHIFT_STYLE["Frei"];
          const bx = pad+colName+i*colDay+4, by = y+4+si*16, bw = colDay-8, bh = list.length>1 ? 15 : rowH-8;
          x.fillStyle = st.bg; x.fillRect(bx, by, bw, bh);
          const label = translateString(s.kind) + (s.start_time ? " " + shiftTimes(s) : "");
          text(label, bx+5, by + (list.length>1 ? 11.5 : 19), {weight:"600", size: list.length>1 ? 10 : 11.5, color: st.fg, max: bw-8});
        });
      });
      x.strokeStyle = "#E4DFD3"; x.beginPath(); x.moveTo(pad, y+rowH); x.lineTo(width-pad, y+rowH); x.stroke();
      y += rowH;
    });
  }
  text(tf("Erstellt mit Ouverture") + " · " + new Date().toLocaleDateString(UI_LOCALE), pad, height-12, {size:11, color:"#6B7280"});
  return c;
}

// Hinweisleiste in der Live-Demo: Rolle ausprobieren, Konto anlegen
function DemoBar({role}){
  const go = (r) => { const u = new URL(location.href); u.searchParams.set("demo","1"); u.searchParams.set("role", r); location.href = u.toString(); };
  return (
    <div className="no-print" style={{border:`1px solid ${BRASS}`,background:BRASS_SOFT,borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",fontSize:13.5}}>
      <b>{tf("Live-Demo")}</b><span style={{flex:"1 1 220px"}}>{tf("Alles ausprobieren – Änderungen werden nicht gespeichert.")}</span>
      <span style={{color:INK_MUTED}}>{tf("Ansicht als:")}</span>
      <select className="input" style={{width:"auto",padding:"5px 8px"}} value={role} onChange={e=>go(e.target.value)}>
        <option value="admin">{tf("Admin / Direktion")}</option>
        <option value="manager">{tf("Abteilungsleitung Housekeeping")}</option>
        <option value="member">{tf("Mitarbeitende Housekeeping")}</option>
      </select>
      <a className="btn-primary" href="index.html" style={{textDecoration:"none",padding:"7px 12px",fontSize:13}}>{tf("Kostenlos testen")}</a>
    </div>
  );
}

// "App installieren": Android/Chrome über das Browser-Angebot, iPhone mit kurzer Anleitung
function isStandalone(){ return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
function InstallAppButton({dark}){
  const [can,setCan] = useState(!!window.__installPrompt);
  const [hint,setHint] = useState(false);
  useEffect(()=>{ const f = () => setCan(true); window.addEventListener("ouverture-installable", f); return () => window.removeEventListener("ouverture-installable", f); },[]);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isStandalone() || window.OUVERTURE_DEMO || (!can && !ios)) return null;
  const style = dark ? {width:"100%",background:"none",border:"1px solid rgba(255,255,255,0.18)",color:"rgba(255,255,255,0.85)",borderRadius:6,padding:"8px 10px",fontSize:12.5,cursor:"pointer",textAlign:"start"}
                     : {background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 12px",fontSize:13,cursor:"pointer"};
  const click = async () => {
    if(window.__installPrompt){ window.__installPrompt.prompt(); try { await window.__installPrompt.userChoice; } catch(e){} window.__installPrompt = null; setCan(false); }
    else setHint(!hint);
  };
  return (
    <div>
      <button onClick={click} style={style}><Icon n="phone" /> {tf("App installieren")}</button>
      {hint && <div style={{fontSize:12,marginTop:6,color:dark?"rgba(255,255,255,0.75)":INK_MUTED,lineHeight:1.4}}>{tf("Am iPhone: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.")}</div>}
    </div>
  );
}

// Erste Schritte für neue Kunden (nur Admins; verschwindet, wenn alles erledigt oder ausgeblendet)
function GettingStarted({hotel, api, tasks, members, onOpen}){
  const key = "hpoos_onboarding_hidden_"+hotel.id;
  const [hidden,setHidden] = useState(()=>{ try { return window.localStorage.getItem(key)==="1"; } catch(e){ return false; } });
  const [hasShifts,setHasShifts] = useState(null);
  useEffect(()=>{ const m = mondayOfIso(todayIso());
    api("/api/hotels/"+hotel.id+"/shifts?from="+addDaysIso(m,-28)+"&to="+addDaysIso(m,27)).then(r=>setHasShifts(r.length>0)).catch(()=>setHasShifts(false)); },[hotel.id]);
  if(hidden || hotel.is_demo) return null;
  const steps = [
    {done:true, label:tf("Hotel anlegen"), tab:null},
    {done:tasks.some(t=>t.template_key), label:tf("Pre-Opening-Vorlage anwenden"), tab:"tasks"},
    {done:members.length>1, label:tf("Team einladen"), tab:"team"},
    {done:members.some(m=>(m.departments||[]).length>0), label:tf("Rollen und Abteilungen zuordnen"), tab:"team"},
    {done:!!hasShifts, label:tf("Ersten Dienstplan anlegen"), tab:"roster"},
    {done:isStandalone(), label:tf("Ouverture als App aufs Handy holen"), tab:"account"},
  ];
  const n = steps.filter(x=>x.done).length;
  if(n===steps.length) return null;
  return (
    <Card style={{marginBottom:18,borderColor:BRASS}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{fontWeight:700,flex:1}}>{tf("Erste Schritte")} <span style={{color:INK_MUTED,fontWeight:400,fontSize:13}} data-no-i18n="">{n}/{steps.length}</span></div>
        <button style={linkBtn} onClick={()=>{ setHidden(true); try { window.localStorage.setItem(key,"1"); } catch(e){} }}>{tf("Ausblenden")}</button>
      </div>
      <div style={{height:5,background:PAPER,borderRadius:3,overflow:"hidden",marginBottom:10}}><div style={{width:(n/steps.length*100)+"%",height:"100%",background:BRASS}} /></div>
      {steps.map((x,i)=>(
        <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:14}}>
          <span style={{width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:12,flexShrink:0,
            background:x.done?GOOD:"#fff",color:x.done?"#fff":INK_MUTED,border:`1px solid ${x.done?GOOD:BORDER}`}} data-no-i18n="">{x.done?"✓":i+1}</span>
          <span style={{flex:1,color:x.done?INK_MUTED:INK,textDecoration:x.done?"line-through":"none"}}>{x.label}</span>
          {!x.done && x.tab && <button className="btn-primary" style={{padding:"5px 12px",fontSize:12.5}} onClick={()=>onOpen(x.tab)}>{tf("Los")}</button>}
        </div>
      ))}
    </Card>
  );
}

// Tageseinteilung als Bild: Abteilung, Person, Schicht, Aufgabe
function drawDutyImage({hotelName, dayLabel, groups, logo, color}){
  const scale = 2, pad = 24, width = 860, rowH = 44, deptH = 32, headH = 86;
  const rows = groups.reduce((n,g)=>n+g.rows.length, 0);
  const height = headH + groups.length*deptH + rows*rowH + pad + 26;
  const c = document.createElement("canvas"); c.width = width*scale; c.height = height*scale;
  const x = c.getContext("2d"); x.scale(scale, scale);
  const rtl = document.documentElement.dir === "rtl";
  const font = (w, size) => w+" "+size+"px Inter, 'Segoe UI', 'Noto Sans', 'Hiragino Sans', 'Microsoft YaHei', Arial, sans-serif";
  const text = (t, px, py, o={}) => { x.font = font(o.weight||"400", o.size||13); x.fillStyle = o.color||"#1C2430"; x.direction = rtl ? "rtl" : "ltr";
    let s = String(t||""); if(o.max){ while(s.length>1 && x.measureText(s).width>o.max) s = s.slice(0,-1); if(s!==String(t||"")) s = s.slice(0,-1)+"…"; } x.fillText(s, px, py); };
  x.fillStyle = "#FFFFFF"; x.fillRect(0,0,width,height);
  x.fillStyle = "#1C2430"; x.fillRect(0,0,width,headH-16);
  drawBrand(x, width, headH-16, logo, color);
  text("Ouverture · " + hotelName, pad, 32, {weight:"600", size:19, color:"#FFFFFF", max: width-pad*2});
  text(tf("Tageseinteilung") + " · " + dayLabel, pad, 56, {size:14, color:"#C9A66B"});
  let y = headH;
  groups.forEach(g=>{
    x.fillStyle = "#F1E8D8"; x.fillRect(pad, y, width-pad*2, deptH);
    text(translateString(g.dept), pad+8, y+21, {weight:"700", size:14}); y += deptH;
    g.rows.forEach((r,i)=>{
      if(i%2) { x.fillStyle = "#FAF8F4"; x.fillRect(pad, y, width-pad*2, rowH); }
      text(r.name, pad+8, y+19, {weight:"600", size:13, max:180});
      text(r.shift, pad+8, y+36, {size:11, color:"#6B7280", max:180});
      text(r.task || "–", pad+200, y+27, {size:13.5, max: width-pad*2-210});
      y += rowH;
    });
  });
  text(tf("Erstellt mit Ouverture") + " · " + new Date().toLocaleDateString(UI_LOCALE), pad, height-12, {size:11, color:"#6B7280"});
  return c;
}

function RosterView({hotel, api, me, members, role, myDepts, orgId}){
  const isAdmin = role==="admin";
  const canManage = isAdmin || role==="manager";
  const visibleDepts = (role==="admin" || role==="viewer" || (role==="manager" && myDepts.length===0)) ? DEPARTMENTS
    : DEPARTMENTS.filter(d=>myDepts.includes(d)).concat(myDepts.filter(d=>!DEPARTMENTS.includes(d)));
  // "" = alle sichtbaren Abteilungen auf einen Blick
  const [deptRaw,setDeptState] = useState(()=>{
    try { const saved = window.localStorage.getItem("hpoos_roster_dept"); if(saved && visibleDepts.includes(saved)) return saved; } catch(e){}
    return visibleDepts[0] || "";
  });
  const dept = visibleDepts.includes(deptRaw) ? deptRaw : (visibleDepts[0] || "");
  const setDept = (d) => { setDeptState(d); setEditor(null); try { window.localStorage.setItem("hpoos_roster_dept", d); } catch(e){} };
  const [week,setWeek] = useState(()=>mondayOfIso(todayIso()));
  const [shifts,setShifts] = useState([]);
  const [mins,setMins] = useState([]);
  const [requests,setRequests] = useState([]);
  const [myShifts,setMyShifts] = useState([]);
  const [msg,setMsg] = useState(null);
  const [editor,setEditor] = useState(null);
  const [extraNames,setExtraNames] = useState([]); // [{dept, name}]
  const [newName,setNewName] = useState("");
  const [newNameDept,setNewNameDept] = useState(visibleDepts[0] || "");
  const [minDept,setMinDept] = useState(visibleDepts[0] || "");
  const [sharing,setSharing] = useState(false);
  const [quick,setQuick] = useState(null); // {key, date}: kleines Menü direkt in der Zelle
  const [duties,setDuties] = useState([]);
  const [dutyDay,setDutyDay] = useState(null);
  const [pubs,setPubs] = useState([]);
  const [targets,setTargets] = useState([]);
  const [avail,setAvail] = useState([]);
  const [monthShifts,setMonthShifts] = useState([]);
  const [dragOver,setDragOver] = useState(null);
  const [dutyAll,setDutyAll] = useState(false); // auch Personen ohne Schicht an diesem Tag zeigen
  const [view,setViewState] = useState(()=>{
    try { const v = window.localStorage.getItem("hpoos_roster_view"); if(v) return v; } catch(e){}
    return window.innerWidth < 700 ? "days" : "week";
  });
  const setView = (v) => { setViewState(v); try { window.localStorage.setItem("hpoos_roster_view", v); } catch(e){} };
  const days = Array.from({length:7}, (_,i)=>addDaysIso(week,i));
  const weekHolidays = holidayMap(hotel.holiday_region, days[0], days[6]);
  const [dayInfo, reloadDayInfo] = useDayInfo(api, hotel, days);
  const base = "/api/hotels/"+hotel.id;
  const today = todayIso();
  const shownDepts = dept ? [dept] : visibleDepts;

  const load = useCallback(async () => {
    try {
      api(base+"/duties?from="+week+"&to="+addDaysIso(week,6)).then(setDuties).catch(()=>setDuties([]));
      api(base+"/publications?from="+addDaysIso(week,-7)+"&to="+addDaysIso(week,7)).then(setPubs).catch(()=>setPubs([]));
      api(base+"/availabilities?from="+week+"&to="+addDaysIso(week,6)).then(setAvail).catch(()=>setAvail([]));
      if(canManage){
        api(base+"/staff-hours").then(setTargets).catch(()=>setTargets([]));
        const m0 = week.slice(0,8)+"01", m1 = addDaysIso(addDaysIso(m0,32).slice(0,8)+"01",-1);
        if(dept) api(base+"/shifts?from="+m0+"&to="+m1+"&department="+encodeURIComponent(dept)).then(setMonthShifts).catch(()=>setMonthShifts([]));
      }
      const [s,m,r,my] = await Promise.all([
        visibleDepts.length ? api(base+"/shifts?from="+week+"&to="+addDaysIso(week,6)+(dept ? "&department="+encodeURIComponent(dept) : "")) : Promise.resolve([]),
        api(base+"/shift-minimums"),
        api(base+"/shift-requests"),
        api("/api/organizations/"+orgId+"/my-shifts"),
      ]);
      setShifts(s); setMins(m); setRequests(r); setMyShifts(my);
    } catch(e){ setMsg({ok:false, text:e.message}); }
  }, [api, base, dept, week, orgId]);
  useEffect(()=>{ load(); }, [load]);

  const run = async (fn, okText) => {
    setMsg(null);
    try { const out = await fn(); if(okText) setMsg({ok:true, text:tf(okText)}); await load(); return out; }
    catch(e){ setMsg({ok:false, text:e.message}); }
  };

  // Zeilen je Abteilung: zugeordnete Teammitglieder, Personen mit Schichten, neu eingetragene Namen
  const rowsFor = (d) => {
    const rows = []; const seen = new Set();
    const add = (key, row) => { if(!seen.has(key)){ seen.add(key); rows.push({key: d+"|"+key, dept: d, ...row}); } };
    members.filter(m=>m.role!=="viewer" && (m.departments||[]).includes(d))
      .forEach(m=>add("u:"+m.user_id, {user_id:m.user_id, name:shortName(m.email), title:m.email}));
    shifts.filter(s=>s.department===d).forEach(s=>{
      if(s.user_id){ const m = members.find(x=>x.user_id===s.user_id); add("u:"+s.user_id, {user_id:s.user_id, name:m ? shortName(m.email) : tf("Teammitglied"), title:m ? m.email : ""}); }
      else add("n:"+(s.employee_name||"").toLowerCase(), {user_id:null, name:s.employee_name, title:""});
    });
    extraNames.filter(e=>e.dept===d).forEach(e=>add("n:"+e.name.toLowerCase(), {user_id:null, name:e.name, title:""}));
    return rows;
  };
  const shiftsFor = (row, date) => shifts.filter(s=>s.shift_date===date && s.department===row.dept &&
    (row.user_id ? s.user_id===row.user_id : (!s.user_id && (s.employee_name||"").toLowerCase()===row.name.toLowerCase())));
  const groups = shownDepts.map(d=>({dept:d, rows:rowsFor(d), shiftsFor}));

  // Besetzung und Unterbesetzung je Abteilung
  const minFor = (d, kind) => { const m = mins.find(x=>x.department===d && x.kind===kind); return m ? m.min_count : 0; };
  const count = (d, date, kind) => shifts.filter(s=>s.department===d && s.shift_date===date && s.kind===kind).length;
  const gaps = [];
  shownDepts.forEach(d=>days.forEach(day=>WORK_KINDS.forEach(k=>{ const need = minFor(d,k); const have = count(d,day,k); if(need>0 && have<need) gaps.push({d,day,k,have,need}); })));

  // Bearbeiten
  // Zeiten je Abteilung (an der Mindestbesetzung gespeichert), sonst Standard
  const timesFor = (d, k) => { const m = mins.find(x=>x.department===d && x.kind===k);
    return m && m.start_time ? [String(m.start_time).slice(0,5), String(m.end_time||"").slice(0,5)] : SHIFT_TIMES[k]; };
  const openNew = (row, date) => setEditor({row, date, id:null, kind:"Früh", start_time:timesFor(row.dept,"Früh")[0], end_time:timesFor(row.dept,"Früh")[1], note:""});
  const openEdit = (row, s) => setEditor({row, date:s.shift_date, id:s.id, kind:s.kind,
    start_time:(s.start_time||"").slice(0,5), end_time:(s.end_time||"").slice(0,5), note:s.note||""});
  const setKind = (k) => setEditor(e=>{ const t = timesFor(e.row.dept, k); return {...e, kind:k, start_time:t ? t[0] : "", end_time:t ? t[1] : ""}; });
  const saveShift = () => run(async () => {
    const work = WORK_KINDS.includes(editor.kind);
    const body = {department:editor.row.dept, shift_date:editor.date, kind:editor.kind,
      start_time:work ? editor.start_time : null, end_time:work ? editor.end_time : null, note:editor.note,
      user_id:editor.row.user_id || null, employee_name:editor.row.user_id ? null : editor.row.name};
    if(editor.id) await api("/api/shifts/"+editor.id, "PATCH", body); else await api(base+"/shifts", "POST", body);
    setEditor(null);
  });
  const deleteShift = () => run(async () => { await api("/api/shifts/"+editor.id, "DELETE"); setEditor(null); });
  const quickAdd = (row, date, kind) => { setQuick(null); run(()=>api(base+"/shifts", "POST", {
    department:row.dept, shift_date:date, kind,
    start_time: timesFor(row.dept,kind) ? timesFor(row.dept,kind)[0] : null, end_time: timesFor(row.dept,kind) ? timesFor(row.dept,kind)[1] : null,
    user_id: row.user_id || null, employee_name: row.user_id ? null : row.name })); };
  // Ziehen & Ablegen: verschieben, mit Strg/Alt kopieren
  const dropShift = (e, row, date) => {
    e.preventDefault(); setDragOver(null);
    let src; try { src = JSON.parse(e.dataTransfer.getData("text/plain")); } catch(x){ return; }
    const sh = shifts.find(x=>x.id===src.id); if(!sh || !canManageDept(row.dept)) return;
    const target = {department:row.dept, shift_date:date, user_id:row.user_id||null, employee_name:row.user_id?null:row.name};
    if(sh.shift_date===date && sh.department===row.dept && (sh.user_id||null)===target.user_id && (target.user_id || (sh.employee_name||"")===target.employee_name)) return;
    const copy = e.ctrlKey || e.altKey || e.metaKey;
    run(()=> copy
      ? api(base+"/shifts", "POST", {...target, kind:sh.kind, start_time:sh.start_time&&sh.start_time.slice(0,5), end_time:sh.end_time&&sh.end_time.slice(0,5), note:sh.note})
      : api("/api/shifts/"+sh.id, "PATCH", {...target, kind:sh.kind, start_time:sh.start_time&&sh.start_time.slice(0,5), end_time:sh.end_time&&sh.end_time.slice(0,5)}));
  };
  // Veröffentlichung der Woche
  const pub = pubs.find(x=>x.department===dept && x.week_start===week);
  const publish = () => run(async()=>{ const r = await api(base+"/publish","POST",{department:dept, week});
    setMsg({ok:true, text: r.sent ? tf("Veröffentlicht. {0} Personen wurden per E-Mail informiert.", r.sent) : tf("Veröffentlicht.")}); });
  const unpublish = () => { if(!window.confirm(tf("Veröffentlichung zurückziehen? Mitarbeitende sehen diese Woche dann nicht mehr."))) return;
    run(()=>api(base+"/publish?department="+encodeURIComponent(dept)+"&week="+week, "DELETE")); };
  // Soll-Stunden und Arbeitszeit-Prüfung (Arbeitszeitgesetz: max. 10 h am Tag, 48 h pro Woche, 11 h Ruhezeit)
  const targetOf = (row) => { const t = targets.find(x=>x.department===row.dept && (row.user_id ? x.user_id===row.user_id : (!x.user_id && (x.employee_name||"").toLowerCase()===row.name.toLowerCase()))); return t ? Number(t.weekly_hours) : null; };
  const setTarget = (row) => {
    const cur = targetOf(row); const v = window.prompt(tf("Soll-Stunden pro Woche für {0} (leer = keine)", row.name), cur==null ? "" : String(cur));
    if(v===null) return;
    run(()=>api(base+"/staff-hours","PUT",{department:row.dept, user_id:row.user_id||null, employee_name:row.user_id?null:row.name, weekly_hours: v.trim()==="" ? null : Number(v.replace(",","."))}));
  };
  const toMin = (t) => { const [h,m] = String(t).split(":").map(Number); return h*60+m; };
  const shiftSpan = (s) => { const st = new Date(s.shift_date+"T00:00:00Z").getTime()/60000 + toMin(s.start_time); let en = new Date(s.shift_date+"T00:00:00Z").getTime()/60000 + toMin(s.end_time); if(en<=st) en += 1440; return [st,en]; };
  // Regeln je Land aus der Feiertagsregion des Hotels (labor.js); Sonn- und Feiertage nur als Hinweis
  const warningsFor = (row) => {
    const own = shifts.filter(s=>s.department===row.dept && WORK_KINDS.includes(s.kind) && s.start_time && s.end_time &&
      (row.user_id ? s.user_id===row.user_id : (!s.user_id && (s.employee_name||"").toLowerCase()===row.name.toLowerCase())));
    return laborWarnings(own, {region: hotel.holiday_region, holidays: weekHolidays, gastro: row.dept==="Food & Beverage"}).filter(w=>!LABOR_INFO.includes(w.code)).map(laborText);
  };
  // Verfügbarkeit (nur Personen mit Login)
  const availOf = (row, date) => row.user_id ? avail.find(a=>a.user_id===row.user_id && a.avail_date===date) : null;
  const AVAIL_STYLE = {"verfügbar":GOOD, "lieber nicht":WARN, "nicht verfügbar":BAD};
  // Tageseinteilung: ein freier Text je Person und Tag (Abteilung)
  const dDay = dutyDay && days.includes(dutyDay) ? dutyDay : (days.includes(today) ? today : days[0]);
  const dutyOf = (row, date) => duties.find(x=>x.duty_date===date && x.department===row.dept &&
    (row.user_id ? x.user_id===row.user_id : (!x.user_id && (x.employee_name||"").toLowerCase()===row.name.toLowerCase())));
  const saveDuty = async (row, date, text) => {
    const t = text.trim(); const ex = dutyOf(row, date);
    if(ex && ex.task===t) return;
    setMsg(null);
    try {
      if(ex && !t) await api("/api/duties/"+ex.id, "DELETE");
      else if(ex) await api("/api/duties/"+ex.id, "PATCH", {task:t});
      else if(t) await api(base+"/duties", "POST", {department:row.dept, duty_date:date, task:t, user_id:row.user_id||null, employee_name:row.user_id?null:row.name});
      setDuties(await api(base+"/duties?from="+week+"&to="+addDaysIso(week,6)));
    } catch(e){ setMsg({ok:false, text:e.message}); }
  };
  const dutyRows = (g, date) => {
    const rows = g.rows.slice();
    duties.filter(x=>x.duty_date===date && x.department===g.dept && !x.user_id).forEach(x=>{
      if(!rows.some(r=>!r.user_id && r.name.toLowerCase()===(x.employee_name||"").toLowerCase()))
        rows.push({key:g.dept+"|n:"+x.employee_name.toLowerCase(), dept:g.dept, user_id:null, name:x.employee_name, title:""});
    });
    return rows.filter(r=>dutyAll || dutyOf(r,date) || shiftsFor(r,date).some(s=>WORK_KINDS.includes(s.kind)));
  };
  const shareDuties = async () => {
    setSharing(true); setMsg(null);
    try {
      const items = shownDepts.map(d=>({dept:d, rows: dutyRows(groups.find(g=>g.dept===d), dDay).map(r=>({
        name:r.name, shift: shiftsFor(r,dDay).filter(s=>WORK_KINDS.includes(s.kind)).map(s=>translateString(s.kind)+" "+shiftTimes(s)).join(", "),
        task: (dutyOf(r,dDay)||{}).task || "" }))})).filter(g=>g.rows.length);
      const canvas = drawDutyImage({hotelName: hotel.name, dayLabel: fmtDay(dDay,{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}), groups: items, logo: await loadImage(hotel.logo_data), color: hotel.brand_color});
      const blob = await new Promise(r=>canvas.toBlob(r, "image/png"));
      const name = (tf("Tageseinteilung")+" "+hotel.name+" "+dDay).replace(/[\\/:*?"<>|]+/g,"") + ".png";
      const file = new File([blob], name, {type:"image/png"});
      if(navigator.canShare && navigator.canShare({files:[file]})) await navigator.share({files:[file], title: tf("Tageseinteilung")});
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
        setMsg({ok:true, text:tf("Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.")}); }
    } catch(e){ if(e && e.name!=="AbortError") setMsg({ok:false, text:e.message}); }
    setSharing(false);
  };

  const weekHours = (row) => days.reduce((h,d)=>h + shiftsFor(row,d).filter(s=>WORK_KINDS.includes(s.kind)).reduce((x,s)=>x+shiftHoursOf(s),0), 0);
  const copyPrev = () => {
    if(!window.confirm(tf("Arbeitsschichten der Vorwoche in diese Woche übernehmen? Bereits belegte Tage bleiben unverändert."))) return;
    run(async () => {
      let created = 0;
      for(const d of shownDepts){ const r = await api(base+"/shifts/copy-week", "POST", {department:d, from:addDaysIso(week,-7), to:week}); created += r.created || 0; }
      setMsg({ok:true, text:tf("Übernommene Schichten: {0}", created)});
    });
  };
  const saveMin = (d, kind, value) => {
    const v = Math.max(0, Math.min(200, parseInt(value,10) || 0));
    if(v===minFor(d, kind)) return;
    run(()=>api(base+"/shift-minimums", "PUT", {department:d, kind, min_count:v}));
  };
  const addName = () => {
    const n = newName.trim(); if(!n) return;
    const d = dept || newNameDept;
    setExtraNames([...extraNames, {dept:d, name:n}]); setNewName("");
  };

  const weekLabel = tf("KW {0}", isoWeekNumber(week)) + " · " + fmtDay(week,{day:"2-digit",month:"2-digit"}) + " – " + fmtDay(days[6],{day:"2-digit",month:"2-digit",year:"numeric"});

  // Als Bild teilen: Handy -> Teilen-Menü (WhatsApp, Signal, Mail …); Computer -> Bild speichern
  const shareImage = async () => {
    setSharing(true); setMsg(null);
    try {
      const filled = groups.filter(g=>g.rows.length);
      const canvas = drawRosterImage({hotelName: hotel.name, weekLabel, days, groups: filled.length ? filled : groups, logo: await loadImage(hotel.logo_data), color: hotel.brand_color});
      const blob = await new Promise(r=>canvas.toBlob(r, "image/png"));
      const name = (tf("Dienstplan")+" "+hotel.name+" "+week).replace(/[\\/:*?"<>|]+/g,"") + ".png";
      const file = new File([blob], name, {type:"image/png"});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title: tf("Dienstplan") + " · " + weekLabel});
      } else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
        setMsg({ok:true, text:tf("Bild gespeichert. Du kannst es jetzt in WhatsApp oder per E-Mail verschicken.")});
      }
    } catch(e){ if(e && e.name!=="AbortError") setMsg({ok:false, text:e.message}); }
    setSharing(false);
  };

  const exportPdf = async () => {
    try {
      const filled = groups.filter(g=>g.rows.length);
      await sheetPdf(rosterSheetHtml({hotel, weekLabel, days, groups: filled.length ? filled : groups, shiftsFor}), (tf("Dienstplan")+" "+hotel.name+" "+week).replace(/[\\/:*?"<>|]+/g,"")+".pdf", false, "landscape");
    } catch(e){ setMsg({ok:false, text:tf("PDF konnte nicht erstellt werden: {0}", e.message)}); }
  };
  const exportXlsx = async () => {
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const cell = (list) => list.map(s=>translateString(s.kind)+(s.start_time ? " "+shiftTimes(s) : "")).join(", ");
      const data = [[tf("Abteilung"), tf("Name"), ...days.map(d=>fmtDay(d))]];
      groups.forEach(g=>g.rows.forEach(r=>data.push([translateString(g.dept), r.title || r.name, ...days.map(d=>cell(shiftsFor(r,d)))])));
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [{wch:22}, {wch:26}, ...days.map(()=>({wch:18}))];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tf("Dienstplan").slice(0,31));
      XLSX.writeFile(wb, (tf("Dienstplan")+" "+hotel.name+" "+week).replace(/[\\/:*?"<>|]+/g,"")+".xlsx");
    } catch(e){ setMsg({ok:false, text:tf("Export fehlgeschlagen: {0}", e.message)}); }
  };

  // Anträge
  const requestDept = myDepts[0] || (dept || visibleDepts[0] || "");
  const emptyReq = {kind:"Urlaub", date_from:"", date_to:"", shift_id:"", swap_with:"", note:""};
  const [req,setReq] = useState(emptyReq);
  const myUpcoming = myShifts.filter(s=>s.hotel_id===hotel.id && WORK_KINDS.includes(s.kind));
  const swapShift = myUpcoming.find(s=>s.id===req.shift_id);
  const swapDept = swapShift ? swapShift.department : requestDept;
  const colleagues = members.filter(m=>m.role!=="viewer" && (!me || m.user_id!==me.id) && ((m.departments||[]).includes(swapDept) || m.role==="admin" || m.role==="manager"));
  const submitReq = () => run(async () => {
    await api(base+"/shift-requests", "POST", {...req, department:requestDept, date_to:req.date_to || req.date_from});
    setReq(emptyReq);
  }, "Antrag gestellt. Die Abteilungsleitung entscheidet darüber.");
  const decide = (r, approve) => {
    let note = "";
    if(!approve){ note = window.prompt(tf("Begründung für die Ablehnung (optional)")); if(note===null) return; }
    run(()=>api("/api/shift-requests/"+r.id+"/decide", "POST", {approve, note}), approve ? "Antrag genehmigt." : "Antrag abgelehnt.");
  };
  const withdraw = (r) => run(()=>api("/api/shift-requests/"+r.id+"/withdraw", "POST", {}), "Antrag zurückgezogen.");
  const nameOf = (uid) => { if(me && uid===me.id) return null; const m = members.find(x=>x.user_id===uid); return m ? shortName(m.email) : tf("Teammitglied"); };
  const toDecide = requests.filter(r=>r.status==="Offen" && (!me || r.user_id!==me.id) && canManageDept(r.department));
  const mine = me ? requests.filter(r=>r.user_id===me.id).slice(0,12) : [];
  const forMe = me ? requests.filter(r=>r.swap_with===me.id && r.status==="Offen") : [];

  const RequestLine = ({r, actions}) => {
    const st = REQUEST_STATUS_STYLE[r.status] || REQUEST_STATUS_STYLE["Offen"];
    const sh = r.kind==="Tausch" && shifts.concat(myShifts).find(s=>s.id===r.shift_id);
    return (
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"9px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
        <div style={{flex:"1 1 260px",minWidth:0}}>
          {nameOf(r.user_id) && <b data-no-i18n="" style={{marginInlineEnd:6}}>{nameOf(r.user_id)}</b>}
          <span>{r.kind==="Tausch" ? "Schichttausch" : r.kind}</span>
          <span style={{color:INK_MUTED}}> · </span>
          <bdi data-no-i18n="">{fmtDay(r.date_from)}{r.date_to!==r.date_from ? " – "+fmtDay(r.date_to) : ""}</bdi>
          {sh && <span style={{color:INK_MUTED}}> · <span>{sh.kind}</span> <bdi data-no-i18n="" dir="ltr">{shiftTimes(sh)}</bdi></span>}
          {r.kind==="Tausch" && r.swap_with && <span style={{color:INK_MUTED}}> → <span data-no-i18n="">{nameOf(r.swap_with) || translateString("Du")}</span></span>}
          <span style={{color:INK_MUTED}}> · <span>{r.department}</span></span>
          {r.note && <div style={{fontSize:12.5,color:INK_MUTED}} data-no-i18n="">„{r.note}“</div>}
          {r.decision_note && <div style={{fontSize:12.5,color:INK_MUTED}}><span>Antwort:</span> <span data-no-i18n="">{r.decision_note}</span></div>}
        </div>
        <Pill color={st.color} bg={st.bg}>{r.status}</Pill>
        {actions}
      </div>
    );
  };

  const navBtn = {background:"none",border:`1px solid ${BORDER}`,borderRadius:4,padding:"6px 10px",fontSize:13,cursor:"pointer"};
  const rtl = document.documentElement.dir==="rtl";
  const upcomingMine = myShifts.slice(0,14);

  return (
    <div>
      {role!=="viewer" && <div className="no-print" style={{marginBottom:10}}><SickButton hotel={hotel} api={api} onDone={load} /></div>}
      <OpenShiftsCard hotel={hotel} api={api} me={me} role={role} myDepts={myDepts} onChanged={load} members={members} />
      {msg && <div className="no-print" style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:12}}>{msg.text}</div>}

      {role!=="viewer" && upcomingMine.length>0 && (
        <Card className="no-print" style={{marginBottom:18}}>
          <div style={{fontWeight:700,marginBottom:8}}>Meine Schichten</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:8}}>
            {upcomingMine.map(s=>(
              <div key={s.id} style={{border:`1px solid ${s.shift_date===today?BRASS:BORDER}`,borderRadius:6,padding:"8px 10px"}}>
                <div style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{fmtDay(s.shift_date)}</div>
                <ShiftChip s={s} />
                <div style={{fontSize:11.5,color:INK_MUTED}}>{s.department}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <DeptTabs depts={visibleDepts} value={dept} onChange={setDept} />
      {(dept==="Food & Beverage" || dept==="") && <EventStaffHint hotel={hotel} api={api} days={days} />}
      {visibleDepts.length===0 ? (
        <Card style={{marginBottom:18}}><div style={{color:INK_MUTED,fontSize:13.5}}>Dir ist noch keine Abteilung zugeordnet. Ein Admin kann das unter „Team“ ändern – dann siehst du hier den Dienstplan deiner Abteilung.</div></Card>
      ) : (
      <Card style={{marginBottom:18,padding:0}}>
        <div className="no-print" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"14px 16px"}}>
          <button style={navBtn} onClick={()=>{ setWeek(addDaysIso(week,-7)); setEditor(null); }} aria-label="Vorige Woche">{rtl ? "›" : "‹"}</button>
          <div style={{fontSize:13.5,fontWeight:600,minWidth:150,textAlign:"center"}} data-no-i18n="">{weekLabel}</div>
          <button style={navBtn} onClick={()=>{ setWeek(addDaysIso(week,7)); setEditor(null); }} aria-label="Nächste Woche">{rtl ? "‹" : "›"}</button>
          <button style={navBtn} onClick={()=>{ setWeek(mondayOfIso(today)); setEditor(null); }}>Heute</button>
          <span style={{flex:1}}></span>
          <button className="btn-primary" onClick={shareImage} disabled={sharing} title={tf("Auf dem Handy direkt an WhatsApp & Co. – am Computer wird das Bild gespeichert.")}>
            {sharing ? "…" : tf("Als Bild teilen")}
          </button>
          {canManage && <button style={navBtn} onClick={copyPrev}>Vorwoche übernehmen</button>}
          <button style={navBtn} onClick={()=>window.print()}>Drucken</button>
          <button style={navBtn} onClick={exportPdf}>PDF</button>
          <button style={navBtn} onClick={exportXlsx}>Excel</button>
        </div>
        <div style={{padding:"0 16px 6px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontFamily:"Fraunces, serif",fontSize:16,fontWeight:600,flex:"1 1 auto"}}>
            <span>Dienstplan</span> · <span data-no-i18n="">{hotel.name}</span>
          </div>
          <div className="no-print" style={{display:"flex",border:`1px solid ${BORDER}`,borderRadius:999,overflow:"hidden"}}>
            {[["week",tf("Wochentabelle")],["days",tf("Tagesübersicht")],["duties",tf("Tageseinteilung")]].map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)} style={{border:"none",background:view===k?INK:"#fff",color:view===k?"#fff":INK,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
        </div>
        <div className="no-print" style={{display:"flex",gap:6,flexWrap:"wrap",padding:"0 16px 10px"}}>
          {SHIFT_KINDS.map(k=>{ const st = SHIFT_STYLE[k]; return (
            <span key={k} style={{background:st.bg,color:st.fg,borderRadius:4,padding:"2px 8px",fontSize:11.5}}>
              <b>{k}</b>{timesFor(dept,k) && <bdi data-no-i18n="" dir="ltr" style={{marginInlineStart:5,opacity:0.8}}>{timesFor(dept,k)[0]}–{timesFor(dept,k)[1]}</bdi>}
            </span>
          ); })}
        </div>

        {gaps.length>0 && (
          <div style={{margin:"6px 16px 10px",border:`1px solid ${BAD}`,background:BAD_SOFT,borderRadius:6,padding:"8px 12px",fontSize:13}}>
            <b>Unterbesetzt:</b>
            {shownDepts.filter(d=>gaps.some(g=>g.d===d)).map(d=>(
              <div key={d} style={{marginTop:2}}>
                <b>{translateString(d)}</b>{" – "}
                {days.filter(day=>gaps.some(g=>g.d===d && g.day===day)).map((day,i)=>(
                  <React.Fragment key={day}>{i>0 && " · "}<bdi data-no-i18n="">{fmtDay(day)}</bdi>{": "}
                    {gaps.filter(g=>g.d===d && g.day===day).map((g,j)=>(
                      <React.Fragment key={g.k}>{j>0 && ", "}<span>{g.k}</span> <bdi data-no-i18n="" dir="ltr">{g.have}/{g.need}</bdi></React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        )}

        {view==="duties" && (
          <div style={{padding:"4px 16px 14px"}}>
            <div className="no-print" style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
              {days.map(d=>(
                <button key={d} onClick={()=>setDutyDay(d)} style={{border:`1px solid ${d===dDay?INK:BORDER}`,background:d===dDay?INK:"#fff",color:d===dDay?"#fff":INK,
                  borderRadius:999,padding:"5px 11px",fontSize:12.5,cursor:"pointer"}} data-no-i18n="">{fmtDay(d)}</button>
              ))}
              <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12.5,color:INK_MUTED,marginInlineStart:"auto",cursor:"pointer"}}>
                <input type="checkbox" checked={dutyAll} onChange={e=>setDutyAll(e.target.checked)} /> {tf("Auch Personen ohne Schicht")}
              </label>
              <button className="btn-primary" onClick={shareDuties} disabled={sharing}>{sharing ? "…" : tf("Einteilung als Bild teilen")}</button>
            </div>
            <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Trag frei ein, wer heute was macht – z. B. Zimmer 101–120, Frühstück Service, Lobby, Wareneingang.")}</div>
            {shownDepts.map(d=>{
              const g = groups.find(x=>x.dept===d); const list = dutyRows(g, dDay);
              if(!list.length && !canManageDept(d)) return null;
              return (
                <div key={d} style={{border:`1px solid ${BORDER}`,borderRadius:8,marginBottom:10,overflow:"hidden"}}>
                  <div style={{background:"#F1E8D8",padding:"7px 12px",fontWeight:700,fontSize:13}}>{d}</div>
                  {list.length===0 && <div style={{padding:"10px 12px",fontSize:13,color:INK_MUTED}}>{tf("An diesem Tag ist niemand eingeplant.")}</div>}
                  {list.map(r=>{
                    const sh = shiftsFor(r,dDay).filter(s=>WORK_KINDS.includes(s.kind)); const ex = dutyOf(r,dDay);
                    return (
                      <div key={r.key+dDay} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 12px",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap"}}>
                        <div style={{width:170,flexShrink:0}}>
                          <div data-no-i18n="" style={{fontWeight:600,fontSize:13.5}}>{r.name}</div>
                          {sh.map(s=><ShiftChip key={s.id} s={s} />)}
                        </div>
                        {canManageDept(d)
                          ? <textarea className="input" rows={1} defaultValue={ex ? ex.task : ""} key={(ex ? ex.id+ex.task : "neu")+dDay}
                              placeholder={tf("Was macht diese Person heute?")} onBlur={e=>saveDuty(r, dDay, e.target.value)}
                              style={{flex:"1 1 260px",minHeight:38,resize:"vertical",fontFamily:"inherit"}} />
                          : <div style={{flex:"1 1 260px",fontSize:13.5,whiteSpace:"pre-wrap",color:ex?INK:INK_MUTED}} data-no-i18n="">{ex ? ex.task : "–"}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {view==="days" && (
          <div style={{padding:"4px 16px 14px"}}>
            {days.map(d=>{
              const dayShifts = shifts.filter(s=>s.shift_date===d && shownDepts.includes(s.department));
              const who = (s) => s.user_id ? ((members.find(m=>m.user_id===s.user_id)||{}).email ? shortName(members.find(m=>m.user_id===s.user_id).email) : tf("Teammitglied")) : s.employee_name;
              return (
                <div key={d} style={{border:`1px solid ${d===today?BRASS:BORDER}`,borderRadius:8,padding:"10px 12px",marginBottom:10,background:d===today?"#FBF8F2":"#fff"}}>
                  <div style={{fontWeight:700,marginBottom:6}} data-no-i18n="">{fmtDay(d,{weekday:"long",day:"2-digit",month:"2-digit"})}{weekHolidays[d] && <span style={{color:BAD,fontWeight:600,fontSize:12.5}}> · ★ {weekHolidays[d]}</span>}<DayInfoCell info={dayInfo} date={d} /></div>
                  {dayShifts.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Keine Schichten eingetragen.")}</div>}
                  {shownDepts.filter(dep=>dayShifts.some(s=>s.department===dep)).map(dep=>(
                    <div key={dep} style={{marginBottom:6}}>
                      {shownDepts.length>1 && <div style={{fontSize:12,color:INK_MUTED,fontWeight:600}}>{dep}</div>}
                      {SHIFT_KINDS.filter(k=>dayShifts.some(s=>s.department===dep && s.kind===k)).map(k=>{
                        const list = dayShifts.filter(s=>s.department===dep && s.kind===k); const st = SHIFT_STYLE[k];
                        const times = [...new Set(list.map(shiftTimes).filter(Boolean))];
                        return (
                          <div key={k} style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap",fontSize:13.5,padding:"2px 0"}}>
                            <span style={{background:st.bg,color:st.fg,borderRadius:4,padding:"1px 8px",fontSize:12,fontWeight:700,minWidth:64,textAlign:"center"}}>{k}</span>
                            {times.length>0 && <bdi data-no-i18n="" dir="ltr" style={{fontSize:12,color:INK_MUTED}}>{times.join(", ")}</bdi>}
                            <span data-no-i18n="">{list.map(who).join(", ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {canManage && dept && (
          <div className="no-print" style={{margin:"0 16px 10px",padding:"9px 12px",borderRadius:6,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",
            border:`1px solid ${pub?GOOD:WARN}`,background:pub?GOOD_SOFT:WARN_SOFT,fontSize:13}}>
            <b>{pub ? tf("Veröffentlicht") : tf("Entwurf")}</b>
            <span style={{flex:1}}>{pub ? tf("Mitarbeitende sehen diese Woche. Änderungen werden den Betroffenen per E-Mail gemeldet.") : tf("Für Mitarbeitende noch nicht sichtbar.")}</span>
            {pub ? <button style={{...linkBtn,fontSize:12.5}} onClick={unpublish}>{tf("Zurückziehen")}</button>
                 : <button className="btn-primary" style={{padding:"6px 12px",fontSize:12.5}} onClick={publish}>{tf("Veröffentlichen & benachrichtigen")}</button>}
          </div>
        )}
        {canManage && view==="week" && <div className="no-print" style={{padding:"0 16px 8px",fontSize:12,color:INK_MUTED}}>{tf("Tipp: Schichten mit der Maus ziehen, um sie zu verschieben – mit gedrückter Strg-Taste werden sie kopiert.")}</div>}
        {view==="week" && !dept && groups.some(g=>!g.rows.length) && (
          <div className="no-print" style={{padding:"0 16px 10px",fontSize:12.5,color:INK_MUTED}}>
            <span>{tf("Noch ohne Mitarbeitende:")}</span>{" "}
            {groups.filter(g=>!g.rows.length).map((g,i)=>(
              <React.Fragment key={g.dept}>{i>0 && ", "}<button onClick={()=>setDept(g.dept)} style={{...linkBtn,padding:0,fontSize:12.5,textDecoration:"underline"}}>{g.dept}</button></React.Fragment>
            ))}
            {" – "}<span>{tf("Abteilung anklicken, um Namen einzutragen, oder unter „Team“ zuordnen.")}</span>
          </div>
        )}
        {view==="week" && <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",minWidth:900,borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>
                <th style={{textAlign:"start",padding:"8px 12px",fontSize:12,color:INK_MUTED,fontWeight:600,borderTop:`1px solid ${BORDER}`,minWidth:150}}>Name</th>
                {days.map(d=>(
                  <th key={d} style={{textAlign:"start",padding:"8px 6px",fontSize:12,fontWeight:600,borderTop:`1px solid ${BORDER}`,
                    color:d===today?BRASS:INK_MUTED,background:d===today?BRASS_SOFT:"transparent"}} data-no-i18n="">{fmtDay(d)}{weekHolidays[d] && <div style={{fontSize:10.5,color:BAD,fontWeight:600}} title={weekHolidays[d]}>★ {weekHolidays[d]}</div>}<DayInfoCell info={dayInfo} date={d} /></th>
                ))}
                <th style={{textAlign:"end",padding:"8px 12px",fontSize:12,color:INK_MUTED,fontWeight:600,borderTop:`1px solid ${BORDER}`}} title={tf("Arbeitsstunden in dieser Woche")}>{tf("Std.")}</th>
              </tr>
            </thead>
            {(dept ? groups : groups.filter(g=>g.rows.length)).map(g=>(
              <tbody key={g.dept}>
                <tr style={{background:"#F1E8D8"}}>
                  <td colSpan={9} style={{padding:"7px 12px",fontWeight:700,fontSize:13}}>
                    <span>{g.dept}</span> <span style={{fontWeight:400,color:INK_MUTED}} data-no-i18n="">· {g.rows.length}</span>
                  </td>
                </tr>
                {g.rows.length===0 && (
                  <tr><td colSpan={9} style={{padding:"10px 12px",color:INK_MUTED,borderTop:`1px solid ${BORDER}`}}>
                    {tf("Noch niemand in dieser Abteilung. Ordne unter „Team“ Mitarbeitende zu oder trage unten einen Namen ein.")}
                  </td></tr>
                )}
                {g.rows.map(r=>(
                  <tr key={r.key} style={{borderTop:`1px solid ${BORDER}`}}>
                    <td style={{padding:"8px 12px",verticalAlign:"top",whiteSpace:"nowrap"}} title={r.title}>
                      <span data-no-i18n="" style={{fontWeight:me && r.user_id===me.id ? 700 : 500}}>{r.name}</span>
                      {!r.user_id && <div style={{fontSize:11,color:INK_MUTED}}>ohne Login</div>}
                    </td>
                    {days.map((d,di)=>{
                      const list = shiftsFor(r,d);
                      const active = editor && editor.row.key===r.key && editor.date===d;
                      const q = quick && quick.key===r.key && quick.date===d;
                      return (
                        <td key={d} onDragOver={canManage ? (e=>{ e.preventDefault(); setDragOver(r.key+d); }) : undefined} onDragLeave={()=>setDragOver(null)} onDrop={canManage ? (e=>dropShift(e,r,d)) : undefined}
                          style={{position:"relative",padding:"6px 4px",verticalAlign:"top",minWidth:96,outline:dragOver===r.key+d?`2px dashed ${BRASS}`:"none",outlineOffset:-2,background:active?BRASS_SOFT:(d===today?"#FBF8F2":"transparent")}}>
                          {availOf(r,d) && <div title={availOf(r,d).status+(availOf(r,d).note ? " – "+availOf(r,d).note : "")}
                            style={{fontSize:10.5,color:AVAIL_STYLE[availOf(r,d).status],marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>● <span>{availOf(r,d).status}</span></div>}
                          {list.map(s=><ShiftChip key={s.id} s={s} onClick={canManage ? ()=>openEdit(r,s) : null}
                            draggable={canManage} onDragStart={e=>{ e.dataTransfer.setData("text/plain", JSON.stringify({id:s.id})); e.dataTransfer.effectAllowed = "copyMove"; }} />)}
                          {canManage && list.length===0 && (
                            <button className="no-print" onClick={()=>setQuick(q ? null : {key:r.key, date:d})} title="Schicht eintragen"
                              style={{width:"100%",border:`1px dashed ${q?INK:BORDER}`,background:"none",color:INK_MUTED,borderRadius:4,padding:"4px 0",fontSize:13,cursor:"pointer"}}>+</button>
                          )}
                          {q && (
                            <div className="no-print" style={{position:"absolute",zIndex:5,top:"100%",...(di>=5 ? {insetInlineEnd:0} : {insetInlineStart:0}),background:"#fff",border:`1px solid ${BORDER}`,borderRadius:8,
                              boxShadow:"0 8px 24px rgba(0,0,0,0.14)",padding:6,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,width:200}}>
                              {SHIFT_KINDS.map(k=>{ const st = SHIFT_STYLE[k]; return (
                                <button key={k} onClick={()=>quickAdd(r,d,k)} style={{border:"none",background:st.bg,color:st.fg,borderRadius:4,padding:"6px 4px",fontSize:12,fontWeight:700,cursor:"pointer",lineHeight:1.2}}>
                                  {k}{timesFor(r.dept,k) && <div data-no-i18n="" dir="ltr" style={{fontWeight:400,fontSize:10.5}}>{timesFor(r.dept,k)[0]}–{timesFor(r.dept,k)[1]}</div>}
                                </button>
                              ); })}
                              <button onClick={()=>{ setQuick(null); openNew(r,d); }} style={{border:`1px solid ${BORDER}`,background:"#fff",borderRadius:4,padding:"6px 4px",fontSize:12,cursor:"pointer"}}>{tf("Andere Zeit …")}</button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{padding:"8px 12px",textAlign:"end",verticalAlign:"top",fontSize:12.5,color:INK_MUTED,whiteSpace:"nowrap"}}>
                      {(()=>{ const h = weekHours(r), t = targetOf(r), w = canManage ? warningsFor(r) : []; return (
                        <React.Fragment>
                          <div data-no-i18n="">{h ? fmtHours(h) : "–"}{t!=null && <span> / {fmtHours(t)}</span>}</div>
                          {t!=null && h-t!==0 && <div data-no-i18n="" style={{fontSize:11,color:h>t?WARN:INK_MUTED}}>{h>t?"+":""}{fmtHours(h-t)}</div>}
                          {w.length>0 && <div title={w.join("\n")} style={{color:BAD,fontSize:11,cursor:"help"}}><Icon n="alert" /> <span>{tf("Arbeitszeit")}</span></div>}
                          {canManage && <button className="no-print" onClick={()=>setTarget(r)} style={{...linkBtn,fontSize:11,padding:0}}>{tf("Soll")}</button>}
                        </React.Fragment>
                      ); })()}
                    </td>
                  </tr>
                ))}
                {(WORK_KINDS.some(k=>minFor(g.dept,k)>0) || shifts.some(s=>s.department===g.dept)) && (
                  <tr style={{borderTop:`1px solid ${BORDER}`,background:PAPER}}>
                    <td style={{padding:"6px 12px",fontSize:11.5,color:INK_MUTED,fontWeight:600,verticalAlign:"top"}}>Besetzung</td>
                    {days.map(d=>(
                      <td key={d} style={{padding:"4px 6px",fontSize:11,verticalAlign:"top"}}>
                        {WORK_KINDS.map(k=>{
                          const have = count(g.dept,d,k), need = minFor(g.dept,k);
                          if(!have && !need) return null;
                          return <div key={k} style={{color:need && have<need ? BAD : INK_MUTED,fontWeight:need && have<need ? 700 : 400}}>
                            <span>{k}</span> <bdi data-no-i18n="" dir="ltr">{have}{need ? "/"+need : ""}</bdi>
                          </div>;
                        })}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </div>}

        {canManage && (
          <div className="no-print" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"12px 16px",borderTop:`1px solid ${BORDER}`}}>
            <input className="input" style={{maxWidth:240}} placeholder="Name ohne Login (z. B. Aushilfe)" value={newName}
              onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter" && addName()} />
            {!dept && (
              <select className="input" style={{width:"auto"}} value={newNameDept} onChange={e=>setNewNameDept(e.target.value)}>
                {visibleDepts.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <button style={navBtn} onClick={addName}>Zeile hinzufügen</button>
          </div>
        )}
      </Card>
      )}

      {editor && canManage && (
        <Card style={{marginBottom:18,borderColor:BRASS}}>
          <div style={{fontWeight:700,marginBottom:10}}>
            <span>{editor.id ? "Schicht bearbeiten" : "Schicht eintragen"}</span>{" · "}
            <span data-no-i18n="">{editor.row.name}</span>{" · "}<span>{editor.row.dept}</span>{" · "}
            <span data-no-i18n="">{fmtDay(editor.date,{weekday:"long",day:"2-digit",month:"long"})}</span>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {SHIFT_KINDS.map(k=>{
              const st = SHIFT_STYLE[k]; const on = editor.kind===k;
              return <button key={k} onClick={()=>setKind(k)}
                style={{border:`1px solid ${on?st.fg:BORDER}`,background:on?st.bg:"#fff",color:on?st.fg:INK,fontWeight:on?700:400,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{k}</button>;
            })}
          </div>
          <div className="stack" style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            {WORK_KINDS.includes(editor.kind) && (
              <React.Fragment>
                <label><div className="field-label">Beginn</div><input type="time" className="input" style={{width:130}} value={editor.start_time} onChange={e=>setEditor({...editor,start_time:e.target.value})} /></label>
                <label><div className="field-label">Ende</div><input type="time" className="input" style={{width:130}} value={editor.end_time} onChange={e=>setEditor({...editor,end_time:e.target.value})} /></label>
              </React.Fragment>
            )}
            <label style={{flex:"1 1 200px"}}><div className="field-label">Notiz</div><input className="input" value={editor.note} onChange={e=>setEditor({...editor,note:e.target.value})} /></label>
            <button className="btn-primary" onClick={saveShift}>Speichern</button>
            {editor.id && <button style={{...linkBtn,color:BAD}} onClick={deleteShift}>Löschen</button>}
            <button style={linkBtn} onClick={()=>setEditor(null)}>Abbrechen</button>
          </div>
        </Card>
      )}

      {canManage && dept && <RosterDemand hotel={hotel} api={api} dept={dept} week={week} days={days} shifts={shifts} onApplied={load} />}
      {canManage && dept && <LaborAverageCard hotel={hotel} api={api} dept={dept} members={members} />}
      <LeaveCard orgId={orgId} api={api} members={members} me={me} canManage={canManage} />
      {canManage && <CalendarNotesCard hotel={hotel} api={api} info={dayInfo} onChanged={reloadDayInfo} />}
      {canManage && dept && (
        <Card className="no-print" style={{marginBottom:18}}>
          <div style={{fontWeight:700,marginBottom:6}}>{tf("Schichtzeiten und Mindestbesetzung")} · <span>{dept}</span></div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Eigene Zeiten je Schicht für diese Abteilung. Fehlen Personen gegenüber der Mindestbesetzung, warnt der Plan.")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))",gap:12}}>
            {WORK_KINDS.map(k=>{ const t = timesFor(dept,k); const st = SHIFT_STYLE[k]; return (
              <div key={k+dept+t.join()} style={{border:`1px solid ${BORDER}`,borderRadius:6,padding:10}}>
                <div style={{background:st.bg,color:st.fg,borderRadius:4,padding:"2px 8px",fontWeight:700,fontSize:12.5,display:"inline-block",marginBottom:8}}>{k}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}} dir="ltr">
                  <input type="time" className="input" style={{padding:"5px 6px"}} defaultValue={t[0]} onBlur={e=>e.target.value && e.target.value!==t[0] && run(()=>api(base+"/shift-minimums","PUT",{department:dept, kind:k, start_time:e.target.value, end_time:t[1]}))} />
                  <span>–</span>
                  <input type="time" className="input" style={{padding:"5px 6px"}} defaultValue={t[1]} onBlur={e=>e.target.value && e.target.value!==t[1] && run(()=>api(base+"/shift-minimums","PUT",{department:dept, kind:k, start_time:t[0], end_time:e.target.value}))} />
                </div>
                <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12.5,color:INK_MUTED}}>{tf("Mindestens")}
                  <input type="number" min="0" max="200" className="input" style={{width:70,padding:"5px 6px"}} defaultValue={minFor(dept,k)} key={k+dept+minFor(dept,k)} onBlur={e=>saveMin(dept, k, e.target.value)} />
                </label>
              </div>
            ); })}
          </div>
        </Card>
      )}

      {canManage && dept && (()=>{ // Stundenkonto des Monats (Soll aus den Wochenstunden anteilig)
        const m0 = week.slice(0,8)+"01"; const m1 = addDaysIso(addDaysIso(m0,32).slice(0,8)+"01",-1);
        const daysInMonth = Number(m1.slice(8,10));
        const rows = groups.find(g=>g.dept===dept) ? groups.find(g=>g.dept===dept).rows : [];
        const planned = (r) => monthShifts.filter(s=>WORK_KINDS.includes(s.kind) && (r.user_id ? s.user_id===r.user_id : (!s.user_id && (s.employee_name||"").toLowerCase()===r.name.toLowerCase()))).reduce((h,s)=>h+shiftHoursOf(s),0);
        const list = rows.map(r=>({r, h:planned(r), t:targetOf(r)})).filter(x=>x.h || x.t!=null);
        if(!list.length) return null;
        return (
          <Card className="no-print" style={{marginBottom:18}}>
            <div style={{fontWeight:700,marginBottom:6}}>{tf("Stundenkonto")} · <span data-no-i18n="">{new Date(m0+"T12:00:00").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"})}</span></div>
            <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Geplante Stunden im ganzen Monat gegenüber dem Soll (Wochenstunden anteilig).")}</div>
            {list.map(({r,h,t})=>{ const soll = t!=null ? t*daysInMonth/7 : null; const diff = soll!=null ? h-soll : null; return (
              <div key={r.key} style={{display:"flex",gap:10,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
                <span style={{flex:1}} data-no-i18n="">{r.name}</span>
                <span data-no-i18n="" style={{width:160,textAlign:"end",color:INK_MUTED}}>{fmtHours(h)} h{soll!=null && <span> / {fmtHours(soll)} h</span>}</span>
                <b data-no-i18n="" style={{width:70,textAlign:"end",color:diff==null?INK_MUTED:diff>0?WARN:diff<0?INK_MUTED:GOOD}}>{diff==null ? "–" : (diff>0?"+":"")+fmtHours(diff)}</b>
              </div>
            ); })}
          </Card>
        );
      })()}

      {toDecide.length>0 && (
        <Card className="no-print" style={{marginBottom:18,borderColor:WARN}}>
          <div style={{fontWeight:700,marginBottom:4}}>Anträge zur Entscheidung</div>
          {toDecide.map(r=>(
            <RequestLine key={r.id} r={r} actions={
              <span style={{display:"flex",gap:6}}>
                <button className="btn-primary" style={{padding:"6px 12px",fontSize:12.5}} onClick={()=>decide(r,true)}>Genehmigen</button>
                <button style={{...navBtn,color:BAD}} onClick={()=>decide(r,false)}>Ablehnen</button>
              </span>
            } />
          ))}
        </Card>
      )}

      {role!=="viewer" && me && (
        <Card className="no-print" style={{marginBottom:18}}>
          <div style={{fontWeight:700,marginBottom:4}}>{tf("Meine Verfügbarkeit")}</div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Tippe einen Tag an: verfügbar → lieber nicht → nicht verfügbar → keine Angabe. Die Leitung sieht das beim Planen.")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7, minmax(0, 1fr))",gap:6}}>
            {days.map(d=>{ const a = avail.find(x=>x.user_id===me.id && x.avail_date===d); const order = [null,"verfügbar","lieber nicht","nicht verfügbar"];
              const next = order[(order.indexOf(a ? a.status : null)+1) % order.length];
              return <button key={d} onClick={()=>run(()=>api(base+"/availabilities","PUT",{date:d, status:next}))}
                style={{border:`1px solid ${a?AVAIL_STYLE[a.status]:BORDER}`,background:"#fff",borderRadius:6,padding:"6px 2px",fontSize:11.5,cursor:"pointer",minHeight:52}}>
                <div data-no-i18n="" style={{color:INK_MUTED}}>{fmtDay(d)}</div>
                <div style={{color:a?AVAIL_STYLE[a.status]:INK_MUTED,fontWeight:600}}>{a ? a.status : "–"}</div>
              </button>; })}
          </div>
        </Card>
      )}

      {forMe.length>0 && (
        <Card className="no-print" style={{marginBottom:18}}>
          <div style={{fontWeight:700,marginBottom:4}}>Schichten, die du übernehmen sollst</div>
          <div style={{fontSize:12.5,color:INK_MUTED}}>Die Abteilungsleitung entscheidet; sprich dich bei Fragen direkt ab.</div>
          {forMe.map(r=><RequestLine key={r.id} r={r} />)}
        </Card>
      )}

      {role!=="viewer" && (myDepts.length>0 || isAdmin || role==="manager") && (
        <Card className="no-print" style={{marginBottom:18}}>
          <div style={{fontWeight:700,marginBottom:10}}>Antrag stellen</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {[["Urlaub","Urlaub"],["Frei-Wunsch","Frei-Wunsch"],["Tausch","Schichttausch"]].map(([k,l])=>(
              <button key={k} onClick={()=>setReq({...emptyReq, kind:k})}
                style={{border:`1px solid ${req.kind===k?INK:BORDER}`,background:req.kind===k?INK:"#fff",color:req.kind===k?"#fff":INK,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div className="stack" style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            {req.kind!=="Tausch" ? (
              <React.Fragment>
                <label><div className="field-label">Von</div><input type="date" className="input" style={{width:160}} value={req.date_from} onChange={e=>setReq({...req,date_from:e.target.value})} /></label>
                <label><div className="field-label">Bis</div><input type="date" className="input" style={{width:160}} value={req.date_to} min={req.date_from} onChange={e=>setReq({...req,date_to:e.target.value})} /></label>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <label style={{flex:"1 1 200px"}}><div className="field-label">Meine Schicht</div>
                  <select className="input" value={req.shift_id} onChange={e=>setReq({...req,shift_id:e.target.value,swap_with:""})}>
                    <option value="">Bitte wählen</option>
                    {myUpcoming.map(s=><option key={s.id} value={s.id} data-no-i18n="">{fmtDay(s.shift_date)} · {translateString(s.kind)} {shiftTimes(s)}</option>)}
                  </select>
                </label>
                <label style={{flex:"1 1 200px"}}><div className="field-label">Übernimmt</div>
                  <select className="input" value={req.swap_with} onChange={e=>setReq({...req,swap_with:e.target.value})}>
                    <option value="">Bitte wählen</option>
                    {colleagues.map(m=><option key={m.user_id} value={m.user_id} data-no-i18n="">{m.email}</option>)}
                  </select>
                </label>
              </React.Fragment>
            )}
            <label style={{flex:"1 1 200px"}}><div className="field-label">Notiz</div><input className="input" value={req.note} onChange={e=>setReq({...req,note:e.target.value})} /></label>
            <button className="btn-primary" onClick={submitReq}
              disabled={req.kind==="Tausch" ? !(req.shift_id && req.swap_with) : !req.date_from}>Antrag stellen</button>
          </div>
          {req.kind==="Tausch" && myUpcoming.length===0 && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:8}}>Du hast in diesem Hotel keine kommenden Schichten, die du tauschen könntest.</div>}
        </Card>
      )}

      {mine.length>0 && (
        <Card className="no-print">
          <div style={{fontWeight:700,marginBottom:4}}>Meine Anträge</div>
          {mine.map(r=>(
            <RequestLine key={r.id} r={r} actions={r.status==="Offen" && <button style={linkBtn} onClick={()=>withdraw(r)}>Zurückziehen</button>} />
          ))}
        </Card>
      )}
    </div>
  );
}

/* ------------------------- Übergabebuch, Checklisten, Startseite ------------------------- */
const LOG_KINDS = ["Info","Wichtig","Offen"];
const LOG_STYLE = {"Info":{color:INK_MUTED,bg:PAPER}, "Wichtig":{color:BAD,bg:BAD_SOFT}, "Offen":{color:WARN,bg:WARN_SOFT}};
