// ============================================================ Migration 032: Gäste-Infos (Zimmer-QR) und Schulungs-Akademie

// ------------------------------------------------------------ Gäste-Infos bearbeiten (Admin, unter „Gäste-QR“)
function GuestInfoCard({hotel, api, onHotel}){
  const init = () => { const g = hotel.guest_info || {}; return {wifi_name:g.wifi_name||"", wifi_password:g.wifi_password||"", breakfast:g.breakfast||"", checkout:g.checkout||"", reception_phone:g.reception_phone||"", taxi:g.taxi||"", notes:g.notes||"", menu:g.menu||[], spa:g.spa||[], ai:g.ai===true}; };
  const [open,setOpen] = useState(false); const [f,setF] = useState(init); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  if(hotel.guest_info===undefined || ACCESS.role!=="admin") return null;
  const save = async () => { setBusy(true); setMsg(null);
    try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{guest_info:f}); onHotel && onHotel(h); setMsg({ok:true,text:tf("Gespeichert. Gäste sehen die Infos sofort nach dem Scannen des Zimmer-Codes.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const F = (k, l, ph) => <Field label={tf(l)}><input className="input" value={f[k]} placeholder={ph||""} onChange={e=>setF({...f,[k]:e.target.value})} /></Field>;
  const listEditor = (k, cols, extra) => (
    <div>
      {f[k].map((row,i)=>(
        <div key={i} style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
          {cols.map(([c,l,w])=><input key={c} className="input" style={{flex:w,minWidth:90}} placeholder={tf(l)} aria-label={tf(l)} value={row[c]||""} onChange={e=>setF({...f,[k]:f[k].map((x,j)=>j===i?{...x,[c]:e.target.value}:x)})} />)}
          <button style={linkBtn} aria-label={tf("Entfernen")} onClick={()=>setF({...f,[k]:f[k].filter((_,j)=>j!==i)})}>✕</button>
          {extra && <div style={{flexBasis:"100%"}}>{extra(row, i)}</div>}
        </div>))}
      <button style={smallBtn} onClick={()=>setF({...f,[k]:[...f[k],{}]})}>{tf("Zeile hinzufügen")}</button>
    </div>
  );
  return (
    <Card style={{marginBottom:14}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{flex:1}}><b>{tf("Gäste-Infos")}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("WLAN, Frühstück, Check-out, Speisekarte und Spa – erscheinen auf der Gästeseite hinter dem Zimmer-QR-Code.")}</div></div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0 10px"}}>
          {F("wifi_name","WLAN-Name")}{F("wifi_password","WLAN-Passwort")}{F("breakfast","Frühstück","07:00 – 10:30")}
          {F("checkout","Check-out","bis 11:00")}{F("reception_phone","Rezeption (Telefon/Durchwahl)")}{F("taxi","Taxi")}
        </div>
        <Field label={tf("Weitere Hinweise (optional)")}><textarea className="input" rows={2} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})} placeholder={tf("z. B. Parkplatz, Hunde, Sauna-Zeiten, Restaurant, Ausflugstipps – der digitale Concierge antwortet daraus")} /></Field>
        <label style={{display:"flex",gap:10,alignItems:"flex-start",background:BRASS_SOFT,borderRadius:10,padding:"10px 12px",margin:"4px 0 14px",fontSize:13.5,cursor:"pointer"}}>
          <input type="checkbox" checked={f.ai} onChange={e=>setF({...f,ai:e.target.checked})} style={{marginTop:3}} />
          <span><b><Icon n="sparkle" /> {tf("Digitaler Concierge (KI) – rund um die Uhr")}</b><br/>{tf("Gäste stellen auf der Gästeseite Fragen in ihrer Sprache. Die KI antwortet nur aus den Infos auf dieser Karte, bietet passende Wünsche zum Anfordern an und leitet alles andere an den Rezeptions-Chat weiter.")}</span>
        </label>
        <div className="field-label">{tf("Speisekarte")}</div>
        {listEditor("menu", [["name","Gericht",3],["note","Hinweis (optional)",2],["price","Preis",1]], (row,i)=><AllergenPicker value={row.allergens} onChange={(v)=>setF({...f,menu:f.menu.map((x,j)=>j===i?{...x,allergens:v}:x)})} />)}
        {f.menu.some(m=>m.name) && <button style={{...smallBtn,marginTop:6}} onClick={()=>sheetPdf(allergenMatrixHtml(hotel, f.menu), safeFile(translateString("Allergene")+" "+hotel.name)+".pdf")}><Icon n="filetext" /> {tf("Allergene-Matrix (PDF)")}</button>}
        <div className="field-label" style={{marginTop:12}}>{tf("Spa-Angebote")}</div>
        {listEditor("spa", [["name","Behandlung",3],["duration","Dauer",1],["price","Preis",1]])}
        {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,margin:"10px 0"}}>{msg.text}</div>}
        <div style={{marginTop:12}}><button className="btn-primary" disabled={busy} onClick={save}>{busy ? tf("Speichert…") : tf("Speichern")}</button></div>
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Schulungs-Akademie
function AcademyView({hotel, api, me, members}){
  const [courses, load, error] = useList(api, "/api/hotels/"+hotel.id+"/courses");
  const [results, loadResults] = useList(api, "/api/hotels/"+hotel.id+"/course-results");
  const [play,setPlay] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [showRes,setShowRes] = useState(null);
  const canWrite = isLeadRole();
  const myBest = (cid) => (results||[]).filter(r=>r.course_id===cid && me && r.user_id===me.id).sort((a,b)=>b.score-a.score)[0];
  const who = (id) => ((members||[]).find(m=>m.user_id===id)||{}).email || "–";
  const save = async () => { setMsg(null);
    try { const body = {...form, quiz: form.quiz.map(q=>({question:q.question, options:String(q.optionsText||"").split("\n").map(x=>x.trim()).filter(Boolean), correct:Number(q.correct)||0}))};
      if(form.id) await api("/api/courses/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/courses","POST",body);
      setForm(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(play) return <CoursePlayer course={play} api={api} onClose={()=>{ setPlay(null); loadResults(); }} />;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Kurze Lerneinheiten mit Quiz – ideal für neue Mitarbeitende. Wer das Quiz besteht, bekommt einen Nachweis. Verbindliche Pflicht-Unterweisungen mit Unterschrift bleiben unter „Unterweisungen“.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {error && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{error}</div>}
      {canWrite && !form && <button className="btn-primary" style={{marginBottom:14}} onClick={()=>setForm({title:"", description:"", department:"", pass_percent:80, lessons:[{title:"", text:""}], quiz:[{question:"", optionsText:"", correct:0}]})}>{tf("Kurs anlegen")}</button>}
      {form && <CourseEditor form={form} setForm={setForm} onSave={save} onCancel={()=>setForm(null)} onError={(t)=>setMsg({ok:false,text:t})} />}
      {courses && courses.filter(c=>c.active || canWrite).length===0 && !form && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Kurse.")}</div>}
      {!form && (courses||[]).filter(c=>c.active || canWrite).map(c=>{ const best = myBest(c.id); const done = (results||[]).filter(r=>r.course_id===c.id);
        return (
        <Card key={c.id} style={{marginBottom:10}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200}}><b>{c.title}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{c.department ? translateString(c.department)+" · " : ""}{tf("{0} Lektionen, {1} Fragen", (c.lessons||[]).length, (c.quiz||[]).length)}{!c.active ? " · "+tf("inaktiv") : ""}</div>
              {c.description && <div style={{fontSize:13.5,marginTop:4}}>{c.description}</div>}</div>
            {best && <Pill color={best.passed?GOOD:WARN} bg={best.passed?GOOD_SOFT:WARN_SOFT}>{best.passed ? tf("Bestanden ({0} %)", best.score) : tf("{0} % – noch nicht bestanden", best.score)}</Pill>}
            {c.active && <button className="btn-primary" onClick={()=>setPlay(c)}>{best ? tf("Wiederholen") : tf("Starten")}</button>}
            {canWrite && <button style={linkBtn} onClick={()=>setForm({...c, quiz:(c.quiz||[]).map(q=>({question:q.question, optionsText:(q.options||[]).join("\n"), correct:q.correct}))})}>{tf("Bearbeiten")}</button>}
            {canWrite && done.length>0 && <button style={linkBtn} onClick={()=>setShowRes(showRes===c.id?null:c.id)} aria-expanded={showRes===c.id}>{tf("Ergebnisse ({0})", done.length)}</button>}
          </div>
          {showRes===c.id && <div style={{marginTop:10}}>{done.map(r=><div key={r.id} style={{display:"flex",gap:10,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1}} data-no-i18n="">{who(r.user_id)}</span><span>{fmtDateTime(r.completed_at)}</span><b style={{color:r.passed?GOOD:BAD}}>{r.score} %</b></div>)}</div>}
        </Card>); })}
    </div>
  );
}
function CourseEditor({form, setForm, onSave, onCancel, onError}){
  const setL = (i,k,v) => setForm({...form, lessons:form.lessons.map((x,j)=>j===i?{...x,[k]:v}:x)});
  const setQ = (i,k,v) => setForm({...form, quiz:form.quiz.map((x,j)=>j===i?{...x,[k]:v}:x)});
  return (
    <Card style={{marginBottom:16,borderColor:BRASS}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0 10px"}} className="stack">
        <Field label={tf("Titel")}><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></Field>
        <Field label={tf("Abteilung")}><select className="input" value={form.department||""} onChange={e=>setForm({...form,department:e.target.value})}><option value="">{tf("Alle Abteilungen")}</option>{DEPARTMENTS.filter(d=>canManageDept(d)).map(d=><option key={d} value={d}>{translateString(d)}</option>)}</select></Field>
        <Field label={tf("Bestanden ab (%)")}><input className="input" type="number" min={50} max={100} value={form.pass_percent} onChange={e=>setForm({...form,pass_percent:e.target.value})} /></Field>
      </div>
      <Field label={tf("Kurzbeschreibung")}><input className="input" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} /></Field>
      {form.active!==undefined && <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,marginBottom:10}}><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})} /> {tf("Aktiv (für Mitarbeitende sichtbar)")}</label>}
      <div className="field-label">{tf("Lektionen")}</div>
      {form.lessons.map((l,i)=>(
        <div key={i} style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:10,marginBottom:8}}>
          <input className="input" placeholder={tf("Titel der Lektion")} aria-label={tf("Titel der Lektion")} value={l.title} onChange={e=>setL(i,"title",e.target.value)} style={{marginBottom:6}} />
          <textarea className="input" rows={4} placeholder={tf("Inhalt")} aria-label={tf("Inhalt")} value={l.text||""} onChange={e=>setL(i,"text",e.target.value)} />
          <div style={{display:"flex",gap:10,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
            {l.photo_data && <img src={l.photo_data} alt="" style={{height:50,borderRadius:6}} />}
            <label style={{...smallBtn,cursor:"pointer"}}>{l.photo_data ? tf("Anderes Foto") : tf("Foto hinzufügen")}<input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{ try { setL(i,"photo_data", await compressImage(e.target.files[0], 1280)); } catch(x){ onError(x.message); } }} /></label>
            {form.lessons.length>1 && <button style={linkBtn} onClick={()=>setForm({...form,lessons:form.lessons.filter((_,j)=>j!==i)})}>{tf("Lektion entfernen")}</button>}
          </div>
        </div>))}
      {form.lessons.length<30 && <button style={{...smallBtn,marginBottom:12}} onClick={()=>setForm({...form,lessons:[...form.lessons,{title:"",text:""}]})}>{tf("Lektion hinzufügen")}</button>}
      <div className="field-label">{tf("Quiz")}</div>
      {form.quiz.map((q,i)=>{ const opts = String(q.optionsText||"").split("\n").filter(x=>x.trim()); return (
        <div key={i} style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:10,marginBottom:8}}>
          <input className="input" placeholder={tf("Frage")} aria-label={tf("Frage")} value={q.question} onChange={e=>setQ(i,"question",e.target.value)} style={{marginBottom:6}} />
          <textarea className="input" rows={3} placeholder={tf("Antworten, eine pro Zeile")} aria-label={tf("Antworten, eine pro Zeile")} value={q.optionsText||""} onChange={e=>setQ(i,"optionsText",e.target.value)} />
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13}}>{tf("Richtige Antwort:")}</span>
            <select className="input" style={{width:"auto"}} value={q.correct} onChange={e=>setQ(i,"correct",Number(e.target.value))}>{opts.map((o,j)=><option key={j} value={j}>{o}</option>)}</select>
            {form.quiz.length>1 && <button style={linkBtn} onClick={()=>setForm({...form,quiz:form.quiz.filter((_,j)=>j!==i)})}>{tf("Frage entfernen")}</button>}
          </div>
        </div>); })}
      {form.quiz.length<30 && <button style={{...smallBtn,marginBottom:12}} onClick={()=>setForm({...form,quiz:[...form.quiz,{question:"",optionsText:"",correct:0}]})}>{tf("Frage hinzufügen")}</button>}
      <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={onSave}>{tf("Speichern")}</button><button style={btnLine} onClick={onCancel}>{tf("Abbrechen")}</button></div>
    </Card>
  );
}
function CoursePlayer({course, api, onClose}){
  const lessons = course.lessons||[], quiz = course.quiz||[];
  const [step,setStep] = useState(0); const [answers,setAnswers] = useState(quiz.map(()=>-1)); const [result,setResult] = useState(null); const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const inQuiz = step >= lessons.length;
  const submit = async () => { setBusy(true); setError(""); try { setResult(await api("/api/courses/"+course.id+"/submit","POST",{answers})); } catch(e){ setError(e.message); } setBusy(false); };
  return (
    <div>
      <button style={{...linkBtn,marginBottom:10}} onClick={onClose}>← {tf("Zurück zur Übersicht")}</button>
      <Card>
        <div style={{fontSize:12.5,color:INK_MUTED}}>{course.title} · {inQuiz ? tf("Quiz") : tf("Lektion {0} von {1}", step+1, lessons.length)}</div>
        {!inQuiz && <div>
          <h2 style={{fontFamily:"Fraunces, serif",fontWeight:600,fontSize:22,margin:"6px 0 10px"}}>{lessons[step].title}</h2>
          {lessons[step].photo_data && <img src={lessons[step].photo_data} alt="" style={{maxWidth:"100%",maxHeight:340,borderRadius:8,marginBottom:10}} />}
          <div style={{fontSize:15,whiteSpace:"pre-wrap",lineHeight:1.6}}>{lessons[step].text}</div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            {step>0 && <button style={btnLine} onClick={()=>setStep(step-1)}>{tf("Zurück")}</button>}
            <button className="btn-primary" onClick={()=>setStep(step+1)}>{step+1<lessons.length ? tf("Weiter") : quiz.length ? tf("Zum Quiz") : tf("Abschließen")}</button>
          </div>
        </div>}
        {inQuiz && !result && <div>
          {quiz.length===0 && <div style={{margin:"10px 0"}}>{tf("Dieser Kurs hat kein Quiz.")}</div>}
          {quiz.map((q,i)=>(
            <fieldset key={i} style={{border:"none",padding:0,margin:"14px 0"}}>
              <legend style={{fontWeight:700,marginBottom:6}}>{i+1}. {q.question}</legend>
              {(q.options||[]).map((o,j)=><label key={j} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",border:`1px solid ${answers[i]===j?INK:BORDER}`,borderRadius:8,marginBottom:6,cursor:"pointer",minHeight:44}}>
                <input type="radio" name={"q"+i} checked={answers[i]===j} onChange={()=>setAnswers(answers.map((a,k)=>k===i?j:a))} /> <span>{o}</span></label>)}
            </fieldset>))}
          {error && <div style={{color:BAD,fontSize:13,marginBottom:8}}>{error}</div>}
          <button className="btn-primary" disabled={busy || answers.some(a=>a<0)} onClick={submit}>{busy ? tf("Prüft…") : tf("Antworten abgeben")}</button>
        </div>}
        {result && <div style={{marginTop:10}}>
          <div style={{fontFamily:"Fraunces, serif",fontSize:26,fontWeight:600,color:result.passed?GOOD:WARN}}>{result.passed ? tf("Bestanden – {0} %", result.score) : tf("{0} % – leider noch nicht bestanden", result.score)}</div>
          <div style={{fontSize:14,margin:"6px 0 12px"}}>{tf("{0} von {1} Fragen richtig.", result.right, result.total)}</div>
          {result.wrong && result.wrong.length>0 && <div style={{fontSize:13.5,marginBottom:12}}>{tf("Noch einmal ansehen:")} {result.wrong.map(i=>quiz[i] && quiz[i].question).filter(Boolean).join(" · ")}</div>}
          <div style={{display:"flex",gap:8}}>{!result.passed && <button className="btn-primary" onClick={()=>{ setResult(null); setStep(0); setAnswers(quiz.map(()=>-1)); }}>{tf("Noch einmal")}</button>}<button style={btnLine} onClick={onClose}>{tf("Fertig")}</button></div>
        </div>}
      </Card>
    </div>
  );
}
