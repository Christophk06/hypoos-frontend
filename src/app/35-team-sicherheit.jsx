// ============================================================ Migration 040 (Paket B): Team & Sicherheit
// Bewerbermanagement mit Stellenanzeigen (öffentliche Seite jobs.html), Mitarbeiter-Empfehlung, Probezeit-Begleiter,
// Ersthelfer im Dienst, Übungsgast (KI-Rollenspiel), Dienstzeugnis-Entwurf. Rechte prüfen Server und Datenbank; die Oberfläche blendet nur aus.

const tmMain = {minHeight:44};
const tmBtn = {...smallBtn, minHeight:44};
const tmMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD:BAD,fontSize:13,margin:"6px 0 10px"}}>{msg.text}</div> : null;
const tmStages = ["Eingegangen","Gespräch","Angebot","Zusage","Absage"];
const tmStageColor = {Eingegangen:[INK_MUTED,PAPER], Gespräch:[BRASS,BRASS_SOFT], Angebot:[WARN,WARN_SOFT], Zusage:[GOOD,GOOD_SOFT], Absage:[BAD,BAD_SOFT]};
const tmEmployment = ["Vollzeit","Teilzeit","Saison","Lehre","Aushilfe"];
const tmName = (members, me, id) => id ? memberLabel(members||[], me, id) : "–";
const tmIsAT = (hotel) => /^(at|aut|österreich|oesterreich|austria)$/i.test(String((hotel && hotel.country) || "").trim());
const tmIsDE = (hotel) => /^(de|deu|deutschland|germany)$/i.test(String((hotel && hotel.country) || "").trim());
const tmLocalInput = (iso) => { if(!iso) return ""; const d = new Date(iso); const p = (n)=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); };
const tmPublicUrl = (q) => { try { return new URL("jobs.html?"+q, location.href).href; } catch(e){ return "jobs.html?"+q; } };
const tmCopy = async (text, setMsg) => { try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Link kopiert.")}); } catch(e){ window.prompt(tf("Link kopieren"), text); } };
// Nur PDF öffnen: Typ aus der Daten-URL prüfen und den Blob mit festem Typ neu bauen (kein HTML o. ä. im Browser ausführen)
const tmOpenDataUrl = async (dataUrl) => {
  const m = /^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl||""));
  if(!m) throw new Error(tf("Der Lebenslauf ist keine PDF-Datei und wird nicht geöffnet."));
  const bin = atob(m[1]); const bytes = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  if(String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3])!=="%PDF") throw new Error(tf("Der Lebenslauf ist keine PDF-Datei und wird nicht geöffnet."));
  const b = new Blob([bytes], {type:"application/pdf"}); const url = URL.createObjectURL(b);
  const w = window.open(url, "_blank", "noopener"); if(!w){ const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); }
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
};
// Kalendereintrag für das Bewerbungsgespräch (1 Stunde)
const tmIcs = (title, startIso, place, fileName) => {
  const f = (d) => new Date(d).toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const esc = (x) => String(x||"").replace(/[\\,;]/g, (m)=>"\\"+m).replace(/\n/g," ");
  const text = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Ouverture//Bewerbung//DE","BEGIN:VEVENT","UID:ouv-int-"+f(startIso)+"-"+Math.random().toString(36).slice(2)+"@ouverture",
    "DTSTAMP:"+f(Date.now()),"DTSTART:"+f(startIso),"DTEND:"+f(new Date(startIso).getTime()+3600000),"SUMMARY:"+esc(title),"LOCATION:"+esc(place),"END:VEVENT","END:VCALENDAR",""].join("\r\n");
  downloadBlob(new Blob([text],{type:"text/calendar"}), safeFile(fileName)+".ics");
};

// ------------------------------------------------------------ 1. Bewerbermanagement (Stellenanzeigen + Pipeline)
function TmRecruitingView({hotel, api, members, me, orgId}){
  const [postings, loadPostings, pErr] = useList(api, "/api/hotels/"+hotel.id+"/job-postings");
  const [apps, loadApps, aErr] = useList(api, "/api/hotels/"+hotel.id+"/applications");
  const [sel,setSel] = useState("alle"); const [form,setForm] = useState(null); const [open,setOpen] = useState(null);
  const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const canWrite = DEPARTMENTS.some(d=>canManageDept(d));
  const save = async () => { setMsg(null); setBusy(true);
    try { const body = {title:form.title, department:form.department, employment:form.employment, start_date:form.start_date||"", salary_note:form.salary_note, description:form.description, status:form.status};
      if(form.id) await api("/api/job-postings/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/job-postings","POST",body);
      setForm(null); loadPostings(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const draft = async () => { setMsg(null); setBusy(true);
    try { const r = await api("/api/hotels/"+hotel.id+"/job-postings/draft","POST",{...form, status:"Entwurf", lang:UI_LANG}); setForm({...form, title:form.title||r.titel, description:r.text}); setMsg({ok:true,text:tf("Vorschlag der KI übernommen – bitte prüfen und anpassen.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const del = async (p) => { if(!window.confirm(tf("Diese Stellenanzeige löschen? Bewerbungen bleiben erhalten."))) return; try { await api("/api/job-postings/"+p.id,"DELETE"); if(sel===p.id) setSel("alle"); loadPostings(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const list = (apps||[]).filter(c=>sel==="alle" || c.posting_id===sel);
  const count = (pid) => (apps||[]).filter(c=>c.posting_id===pid && c.stage!=="Absage").length;
  const current = open && (apps||[]).find(c=>c.id===open);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Stellen ausschreiben, Bewerbungen über die eigene Bewerbungsseite empfangen und bis zur Zusage begleiten.")}</div>
      {tmMsg(msg)}{pErr && tmMsg({ok:false,text:pErr})}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <b style={{flex:1}}><Icon n="users" /> {tf("Stellenanzeigen")}</b>
          {(postings||[]).some(p=>p.status==="Veröffentlicht") && <button style={tmBtn} onClick={()=>tmCopy(tmPublicUrl("h="+hotel.id), setMsg)}>{tf("Link zu allen Stellen kopieren")}</button>}
          {canWrite && !form && <button className="btn-primary" style={tmMain} onClick={()=>setForm({title:"", department:editableDepts()[0]||"Personal", employment:"Vollzeit", start_date:hotel.opening_date||"", salary_note:"", description:"", status:"Entwurf"})}>{tf("Neue Stellenanzeige")}</button>}
        </div>
        {form && <TmPostingForm form={form} setForm={setForm} onSave={save} onDraft={draft} busy={busy} onCancel={()=>setForm(null)} />}
        {postings && postings.length===0 && !form && <div style={{fontSize:13,color:INK_MUTED,marginTop:8}}>{tf("Noch keine Stellenanzeigen. Veröffentlichte Anzeigen erscheinen auf der Bewerbungsseite des Hotels.")}</div>}
        {(postings||[]).map(p=>(
          <div key={p.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:180}}><b data-no-i18n="">{p.title}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf(p.department)} · {tf(p.employment)}{p.start_date ? " · "+tf("ab {0}", fmtDate(p.start_date)) : ""} · {tf("{0} offen", count(p.id))}</div></span>
            <Pill color={p.status==="Veröffentlicht"?GOOD:p.status==="Geschlossen"?INK_MUTED:WARN} bg={p.status==="Veröffentlicht"?GOOD_SOFT:p.status==="Geschlossen"?PAPER:WARN_SOFT}>{tf(p.status)}</Pill>
            <button style={tmBtn} aria-pressed={sel===p.id} onClick={()=>setSel(sel===p.id?"alle":p.id)}>{tf("Bewerbungen")}</button>
            {p.status==="Veröffentlicht" && p.public_token && <button style={tmBtn} onClick={()=>tmCopy(tmPublicUrl("p="+p.public_token), setMsg)}>{tf("Link kopieren")}</button>}
            {canManageDept(p.department) && <button style={tmBtn} onClick={()=>setForm({...p, start_date:p.start_date||"", salary_note:p.salary_note||"", description:p.description||""})}>{tf("Bearbeiten")}</button>}
            {canManageDept(p.department) && <button style={{...linkBtn,color:BAD,minHeight:44}} onClick={()=>del(p)} aria-label={tf("Stellenanzeige löschen")}>✕</button>}
          </div>))}
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
          <b style={{flex:1}}>{tf("Bewerbungen")}</b>
          <select className="input" style={{width:"auto",minHeight:44}} value={sel} onChange={e=>setSel(e.target.value)} aria-label={tf("Stelle wählen")}>
            <option value="alle">{tf("Alle Stellen")}</option>
            {(postings||[]).map(p=><option key={p.id} value={p.id} data-no-i18n="">{p.title}</option>)}
          </select>
        </div>
        {aErr && tmMsg({ok:false,text:aErr})}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:10}}>
          {tmStages.map(s=>{ const items = list.filter(c=>c.stage===s); return (
            <div key={s} style={{background:PAPER,borderRadius:10,padding:8,minHeight:80}}>
              <div style={{fontSize:12.5,fontWeight:700,color:tmStageColor[s][0],marginBottom:6}}>{tf(s)} · {items.length}</div>
              {items.map(c=>(
                <button key={c.id} onClick={()=>setOpen(open===c.id?null:c.id)} aria-expanded={open===c.id}
                  style={{display:"block",width:"100%",textAlign:"start",background:"#fff",border:`1px solid ${open===c.id?BRASS:BORDER}`,borderRadius:8,padding:"8px 10px",marginBottom:6,cursor:"pointer",minHeight:44,font:"inherit",color:INK}}>
                  <b data-no-i18n="" style={{fontSize:13.5}}>{c.name}</b>
                  <div style={{fontSize:11.5,color:INK_MUTED}}>{c.source ? tf(c.source) : tf("Manuell")}{c.interview_at ? " · "+fmtDateTime(c.interview_at) : ""}{c.has_cv ? " · "+tf("Lebenslauf") : ""}</div>
                </button>))}
            </div>); })}
        </div>
        {current && <TmCandidateDetail c={current} api={api} hotel={hotel} orgId={orgId} postings={postings||[]} onChanged={loadApps} onClose={()=>setOpen(null)} />}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:10}}><Icon n="alert" /> {tf("Löschfrist: Bewerbungen spätestens 6 Monate nach der Absage löschen. Abgelehnte Bewerbungen löscht Ouverture danach automatisch; wer die Daten länger behalten will, braucht dafür eine eigene Einwilligung.")}</div>
      </Card>
      {canManageDept("Personal") && <TmReferralBonusCard hotel={hotel} api={api} members={members} me={me} />}
    </div>
  );
}
function TmPostingForm({form, setForm, onSave, onDraft, onCancel, busy}){
  const set = (k) => (e) => setForm({...form, [k]: e.target.value});
  return (
    <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginTop:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Titel der Stelle")}><input className="input" maxLength={160} value={form.title} onChange={set("title")} placeholder={tf("z. B. Rezeptionist:in")} /></Field>
        <Field label={tf("Abteilung")}><select className="input" value={form.department} onChange={set("department")}>{deptOptions(form.department).map(d=><option key={d} value={d}>{tf(d)}</option>)}</select></Field>
        <Field label={tf("Anstellung")}><select className="input" value={form.employment} onChange={set("employment")}>{tmEmployment.map(x=><option key={x} value={x}>{tf(x)}</option>)}</select></Field>
        <Field label={tf("Beginn")}><input className="input" type="date" value={form.start_date||""} onChange={set("start_date")} /></Field>
        <Field label={tf("Gehalt (Angabe für die Anzeige)")}><input className="input" maxLength={300} value={form.salary_note} onChange={set("salary_note")} placeholder={tf("z. B. ab 2.300 € brutto, Überzahlung möglich")} /></Field>
        <Field label={tf("Status")}><select className="input" value={form.status} onChange={set("status")}>{["Entwurf","Veröffentlicht","Geschlossen"].map(x=><option key={x} value={x}>{tf(x)}</option>)}</select></Field>
      </div>
      <Field label={tf("Anzeigentext")}><textarea className="input" rows={10} maxLength={8000} value={form.description} onChange={set("description")} data-no-i18n="" /></Field>
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:10}}>{tf("In Österreich muss eine Stellenanzeige das kollektivvertragliche Mindestentgelt und die Bereitschaft zur Überzahlung nennen. Bitte geschlechtsneutral formulieren.")}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn-primary" style={tmMain} disabled={busy || !form.title.trim()} onClick={onSave}>{busy ? "…" : tf("Speichern")}</button>
        <button style={tmBtn} disabled={busy || !form.title.trim()} onClick={onDraft}><Icon n="sparkle" /> {tf("Text von der KI vorschlagen lassen")}</button>
        <button style={{...linkBtn,minHeight:44}} onClick={onCancel}>{tf("Abbrechen")}</button>
      </div>
    </div>
  );
}
function TmCandidateDetail({c, api, hotel, orgId, postings, onChanged, onClose}){
  const [msg,setMsg] = useState(null); const [when,setWhen] = useState(tmLocalInput(c.interview_at)); const [note,setNote] = useState(c.note||"");
  const posting = postings.find(p=>p.id===c.posting_id);
  const [dept,setDept] = useState(posting ? posting.department : "Personal");
  const [email,setEmail] = useState(c.email||"");
  useEffect(()=>{ setWhen(tmLocalInput(c.interview_at)); setNote(c.note||""); setEmail(c.email||""); setMsg(null); },[c.id]);
  const patch = async (body, ok) => { setMsg(null); try { await api("/api/applications/"+c.id,"PATCH",body); await onChanged(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const cv = async () => { setMsg(null); try { const r = await api("/api/applications/"+c.id+"/cv"); await tmOpenDataUrl(r.cv_data); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const hire = async () => {
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsg({ok:false,text:tf("Für die Einladung wird eine E-Mail-Adresse gebraucht.")}); return; }
    if(!window.confirm(tf("{0} per E-Mail ins Team einladen (Abteilung: {1})?", c.name, tf(dept)))) return;
    setMsg(null);
    try { const r = await api("/api/invites","POST",{organization_id:orgId, email:email.trim(), role:"member", departments:[dept]});
      if(c.stage!=="Zusage") await api("/api/applications/"+c.id,"PATCH",{stage:"Zusage"});
      await onChanged(); setMsg({ok:true,text:r.email_sent ? tf("Einladung verschickt.") : tf("Einladung angelegt – die E-Mail konnte nicht verschickt werden. Den Link findest du unter Team.")}); }
    catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const del = async () => { if(!window.confirm(tf("Bewerbung endgültig löschen?"))) return; try { await api("/api/candidates/"+c.id,"DELETE"); onClose(); onChanged(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <div style={{border:`1px solid ${BRASS}`,borderRadius:10,padding:12,marginTop:12}} role="region" aria-label={tf("Bewerbung")}>
      <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
        <b data-no-i18n="" style={{fontSize:16,flex:1}}>{c.name}</b>
        <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("eingegangen am {0}", fmtDate(c.created_at))}{posting ? <span data-no-i18n=""> · {posting.title}</span> : null}</span>
        <button style={{...linkBtn,minHeight:44}} onClick={onClose} aria-label={tf("Schließen")}>✕</button>
      </div>
      {tmMsg(msg)}
      <div style={{fontSize:13.5,margin:"6px 0"}} data-no-i18n="">{[c.email, c.phone].filter(Boolean).join(" · ") || "–"}</div>
      {c.consent_at && <div style={{fontSize:12,color:INK_MUTED}}>{tf("Einwilligung zur Datenverarbeitung vom {0}", fmtDate(c.consent_at))}</div>}
      {c.referred_by && <div style={{fontSize:12,color:INK_MUTED}}>{tf("Über eine Empfehlung aus dem Team")}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:10}}>
        <label style={{fontSize:12.5}}><div className="field-label">{tf("Status")}</div>
          <select className="input" style={{width:"auto",minHeight:44}} value={c.stage} onChange={e=>patch({stage:e.target.value})}>{tmStages.map(s=><option key={s} value={s}>{tf(s)}</option>)}</select></label>
        <label style={{fontSize:12.5}}><div className="field-label">{tf("Gesprächstermin")}</div>
          <input className="input" type="datetime-local" style={{minHeight:44}} value={when} onChange={e=>setWhen(e.target.value)} /></label>
        <button style={tmBtn} onClick={()=>patch({interview_at: when ? new Date(when).toISOString() : null, ...(when && c.stage==="Eingegangen" ? {stage:"Gespräch"} : {})}, tf("Termin gespeichert."))}>{tf("Termin speichern")}</button>
        {c.interview_at && <button style={tmBtn} onClick={()=>tmIcs(translateString("Bewerbungsgespräch")+": "+c.name, c.interview_at, hotel.name, translateString("Bewerbungsgespräch")+" "+c.name)}><Icon n="calendar" /> {tf("In den Kalender")}</button>}
        {c.has_cv && <button style={tmBtn} onClick={cv}><Icon n="file" /> {tf("Lebenslauf öffnen")}</button>}
      </div>
      <Field label={tf("Nachricht und Notizen")}><textarea className="input" rows={4} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} onBlur={()=>{ if(note!==(c.note||"")) patch({note}); }} data-no-i18n="" /></Field>
      <div style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:10,marginBottom:10}}>
        <b style={{fontSize:13.5}}>{tf("Ins Team übernehmen")}</b>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"2px 0 8px"}}>{tf("Schickt eine Einladung in die App mit der gewählten Abteilung und setzt die Bewerbung auf Zusage.")}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
          <input className="input" style={{flex:1,minWidth:180,minHeight:44}} value={email} onChange={e=>setEmail(e.target.value)} aria-label={tf("E-Mail-Adresse für die Einladung")} placeholder={tf("E-Mail")} data-no-i18n="" />
          <select className="input" style={{width:"auto",minHeight:44}} value={dept} onChange={e=>setDept(e.target.value)} aria-label={tf("Abteilung")}>{DEPARTMENTS.map(d=><option key={d} value={d}>{tf(d)}</option>)}</select>
          <button className="btn-primary" style={tmMain} onClick={hire}>{tf("Einladen")}</button>
        </div>
      </div>
      <button style={{...linkBtn,color:BAD,minHeight:44}} onClick={del}>{tf("Bewerbung löschen")}</button>
    </div>
  );
}

// ------------------------------------------------------------ 2. Mitarbeiter-Empfehlung
function TmReferralCard({hotel, api}){
  const [opts,setOpts] = useState(null); const [mine,setMine] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const load = useCallback(()=>{
    api("/api/hotels/"+hotel.id+"/referral-options").then(setOpts).catch(()=>setOpts(false));
    api("/api/hotels/"+hotel.id+"/my-referrals").then(setMine).catch(()=>setMine([]));
  },[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(opts===false) return null;
  const choices = opts ? [...opts.postings.map(p=>({v:"post:"+p.id, label:p.title, dept:p.department})), ...opts.positions.filter(p=>!opts.postings.some(x=>x.title===p.title && x.department===p.department)).map(p=>({v:"pos:"+p.id, label:p.title, dept:p.department}))] : [];
  const send = async () => { setMsg(null); setBusy(true);
    try { const [k, id] = form.choice.split(":");
      await api("/api/hotels/"+hotel.id+"/referrals","POST",{name:form.name, contact:form.contact, note:form.note, agreed:form.agreed, [k==="post"?"posting_id":"position_id"]:id});
      setForm(null); setMsg({ok:true,text:tf("Danke für deine Empfehlung! Die Personalleitung meldet sich bei der Person.")}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const st = {"läuft":[WARN,WARN_SOFT], "eingestellt":[GOOD,GOOD_SOFT], "abgesagt":[INK_MUTED,PAPER]};
  const s = (opts && opts.settings) || {};
  return (
    <Card style={{marginBottom:14}}>
      <b><Icon n="users" /> {tf("Jemanden empfehlen")}</b>
      <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 8px"}}>
        {tf("Du kennst jemanden, der gut zu uns passt? Empfiehl die Person für eine offene Stelle.")}
        {s.bonus ? " "+tf("Prämie: {0}", fmtEur(s.bonus))+(s.after_weeks ? " "+tf("(nach {0} Wochen im Team)", s.after_weeks) : "") : ""}
      </div>
      {s.note && <div style={{fontSize:12.5,marginBottom:8}} data-no-i18n="">{s.note}</div>}
      {tmMsg(msg)}
      {opts && !choices.length && !form && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Gerade sind keine Stellen offen.")}</div>}
      {form ? (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
            <Field label={tf("Name der Person")}><input className="input" maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} data-no-i18n="" /></Field>
            <Field label={tf("E-Mail oder Telefon")}><input className="input" maxLength={200} value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} data-no-i18n="" /></Field>
            <Field label={tf("Stelle")}><select className="input" value={form.choice} onChange={e=>setForm({...form,choice:e.target.value})}>{choices.map(c=><option key={c.v} value={c.v} data-no-i18n="">{c.label} · {translateString(c.dept)}</option>)}</select></Field>
          </div>
          <Field label={tf("Warum passt die Person? (freiwillig)")}><textarea className="input" rows={3} maxLength={1000} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} data-no-i18n="" /></Field>
          <label style={{display:"flex",gap:8,alignItems:"flex-start",minHeight:44,fontSize:13.5,cursor:"pointer"}}><input type="checkbox" style={{marginTop:3}} checked={form.agreed} onChange={e=>setForm({...form,agreed:e.target.checked})} /> <span>{tf("Die Person weiß Bescheid und ist einverstanden, dass ich ihre Kontaktdaten weitergebe.")}</span></label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
            <button className="btn-primary" style={tmMain} disabled={busy || !form.name.trim() || !form.contact.trim() || !form.agreed} onClick={send}>{busy ? "…" : tf("Empfehlung abschicken")}</button>
            <button style={{...linkBtn,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          </div>
        </div>
      ) : choices.length>0 && <button className="btn-primary" style={tmMain} onClick={()=>setForm({name:"", contact:"", note:"", agreed:false, choice:choices[0].v})}>{tf("Person empfehlen")}</button>}
      {(mine||[]).length>0 && <div style={{marginTop:12}}>
        <div style={{fontSize:12.5,fontWeight:700,color:INK_MUTED}}>{tf("Meine Empfehlungen")}</div>
        {mine.map(r=>(
          <div key={r.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:150}}><span data-no-i18n="">{r.name}</span><span style={{color:INK_MUTED,fontSize:12.5}}> · <span data-no-i18n="">{r.position}</span> · {fmtDate(r.created_at)}</span></span>
            <Pill color={st[r.status][0]} bg={st[r.status][1]}>{tf(r.status)}</Pill>
          </div>))}
      </div>}
    </Card>
  );
}
// Prämien (Leitung Personal): Einstellung und Auszahlung
function TmReferralBonusCard({hotel, api, members, me}){
  const [d,setD] = useState(null); const [set,setSet] = useState(null); const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/referral-bonuses").then(x=>{ setD(x); setSet({bonus:x.settings.bonus==null?"":x.settings.bonus, after_weeks:x.settings.after_weeks==null?"":x.settings.after_weeks, note:x.settings.note||""}); }).catch(()=>setD(false)),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(!d) return null;
  const save = async () => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/team-settings","PUT",{referral_settings:set}); setMsg({ok:true,text:tf("Gespeichert.")}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const paid = async (c, v) => { setMsg(null); try { await api("/api/applications/"+c.id+"/referral-paid","POST",{paid:v}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const today = todayIso();
  return (
    <Card style={{marginBottom:14}}>
      <b><Icon n="euro" /> {tf("Empfehlungsprämien")}</b>
      {tmMsg(msg)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",margin:"8px 0"}}>
        <label style={{fontSize:12.5}}><div className="field-label">{tf("Prämie")}</div><input className="input" style={{width:110,minHeight:44}} inputMode="decimal" value={set.bonus} onChange={e=>setSet({...set,bonus:e.target.value})} /></label>
        <label style={{fontSize:12.5}}><div className="field-label">{tf("fällig nach Wochen")}</div><input className="input" style={{width:90,minHeight:44}} type="number" min={0} max={104} value={set.after_weeks} onChange={e=>setSet({...set,after_weeks:e.target.value})} /></label>
        <label style={{fontSize:12.5,flex:1,minWidth:180}}><div className="field-label">{tf("Hinweis für das Team")}</div><input className="input" style={{minHeight:44}} maxLength={500} value={set.note} onChange={e=>setSet({...set,note:e.target.value})} data-no-i18n="" /></label>
        <button style={tmBtn} onClick={save}>{tf("Speichern")}</button>
      </div>
      {d.list.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Empfehlungen.")}</div>}
      {d.list.map(c=>(
        <div key={c.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <span style={{flex:1,minWidth:180}}><span data-no-i18n="">{c.name}</span> <span style={{color:INK_MUTED,fontSize:12.5}}>· <span data-no-i18n="">{c.position}</span> · {tf("empfohlen von {0}", tmName(members, me, c.referred_by))}</span>
            <div style={{fontSize:12,color:INK_MUTED}}>{tf(c.stage)}{c.referral_bonus!=null ? " · "+fmtEur(c.referral_bonus) : ""}{c.due_on ? " · "+tf("fällig am {0}", fmtDate(c.due_on)) : ""}</div></span>
          {c.referral_paid_at ? <><Pill color={GOOD} bg={GOOD_SOFT}>{tf("ausbezahlt am {0}", fmtDate(c.referral_paid_at))}</Pill><button style={{...linkBtn,minHeight:44}} onClick={()=>paid(c,false)}>{tf("Rückgängig")}</button></>
            : c.stage==="Zusage" && <button style={{...tmBtn,borderColor:c.due_on && c.due_on<=today?GOOD:BORDER}} onClick={()=>paid(c,true)}>{tf("Als ausbezahlt markieren")}</button>}
        </div>))}
    </Card>
  );
}

// ------------------------------------------------------------ 3. Probezeit-Begleiter
const tmWeeksKey = (hotel) => "ouv_probation_weeks_"+hotel.id;
function tmProbationPdf(r, hotel, name){
  const f = (l, v) => '<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+fsEsc(v)+'</div></div>';
  const html = '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Probezeit-Gespräch"), name)
    + '<div class="facts">'+f("Woche", String(r.week))+f("Fällig am", fmtDate(r.due_on))+f("Geführt am", r.done_at ? fmtDate(r.done_at) : "–")+f("Einschätzung", r.rating ? translateString(r.rating) : "–")+'</div>'
    + '<div class="box"><h3>'+fsT("Notizen")+'</h3><div class="b">'+fsEsc(r.notes||"")+'</div></div>'
    + '<div class="sig"><div>'+fsT("Führungskraft")+'</div><div>'+fsT("Mitarbeiter:in")+'</div></div></div>';
  return sheetPdf(html, safeFile(translateString("Probezeit-Gespräch")+" "+name+" "+translateString("Woche")+" "+r.week)+".pdf");
}
function TmProbationReview({r, api, hotel, name, onSaved}){
  const [notes,setNotes] = useState(r.notes||""); const [rating,setRating] = useState(r.rating||""); const [msg,setMsg] = useState(null);
  const save = async (extra) => { setMsg(null); try { const x = await api("/api/probation-reviews/"+r.id,"PATCH",{notes, rating, ...(extra||{})}); onSaved(x); if(!extra) setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const late = !r.done_at && r.due_on < todayIso();
  return (
    <div style={{padding:"10px 0",borderTop:`1px solid ${BORDER}`}}>
      <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap",fontSize:13.5}}>
        <b data-no-i18n="" style={{flex:1}}>{name}</b>
        <span>{tf("Woche {0}", r.week)} · {fmtDate(r.due_on)}</span>
        {r.done_at ? <Pill color={GOOD} bg={GOOD_SOFT}>{tf("geführt")}</Pill> : late ? <Pill color={BAD} bg={BAD_SOFT}>{tf("überfällig")}</Pill> : null}
      </div>
      {tmMsg(msg)}
      <textarea className="input" rows={3} maxLength={5000} style={{marginTop:6}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={tf("Wie läuft die Einarbeitung? Stärken, offene Punkte, Vereinbarungen")} aria-label={tf("Notizen zum Gespräch")} data-no-i18n="" />
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:6}}>
        <select className="input" style={{width:"auto",minHeight:44}} value={rating} onChange={e=>setRating(e.target.value)} aria-label={tf("Einschätzung")}>
          <option value="">{tf("Einschätzung …")}</option>{["gut","in Ordnung","kritisch"].map(x=><option key={x} value={x}>{tf(x)}</option>)}
        </select>
        <button style={tmBtn} onClick={()=>save()}>{tf("Speichern")}</button>
        {!r.done_at ? <button className="btn-primary" style={tmMain} onClick={()=>save({done:true})}>{tf("Gespräch geführt")}</button>
          : <button style={{...linkBtn,minHeight:44}} onClick={()=>save({done:false})}>{tf("Wieder öffnen")}</button>}
        <button style={tmBtn} onClick={()=>tmProbationPdf({...r, notes, rating}, hotel, name)}><Icon n="filetext" /> {tf("PDF")}</button>
      </div>
    </div>
  );
}
// Karte „Fällige Probezeit-Gespräche“ (auch für das Dashboard der Leitung Personal)
function TmProbationDueCard({hotel, api, members, me, data, onChanged}){
  const [own,setOwn] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/probation").then(setOwn).catch(()=>setOwn(false)),[api, hotel.id]);
  useEffect(()=>{ if(!data) load(); },[load, !!data]);
  const d = data || own;
  if(!d) return null;
  const soon = addDaysIso(todayIso(), 7);
  const due = d.reviews.filter(r=>!r.done_at && r.due_on<=soon);
  if(!due.length && !data) return null;
  const saved = () => { if(onChanged) onChanged(); else load(); };
  return (
    <Card style={{marginBottom:14,borderColor:due.some(r=>r.due_on<todayIso())?BAD:BRASS}}>
      <b><Icon n="clipboard" /> {tf("Fällige Probezeit-Gespräche")} <span style={{fontWeight:400,fontSize:12.5,color:INK_MUTED}}>· {tf("nächste 7 Tage")}</span></b>
      {due.length===0 && <div style={{fontSize:13,color:INK_MUTED,marginTop:6}}>{tf("Gerade ist kein Gespräch fällig.")}</div>}
      {due.map(r=><TmProbationReview key={r.id} r={r} api={api} hotel={hotel} name={tmName(members, me, r.user_id)} onSaved={saved} />)}
    </Card>
  );
}
function TmProbationView({hotel, api, members, me}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [err,setErr] = useState("");
  const [weeks,setWeeks] = useState(()=>{ try { return localStorage.getItem(tmWeeksKey(hotel)) || (tmIsAT(hotel) ? "1, 2, 4" : "2, 6, 10"); } catch(e){ return "2, 6, 10"; } });
  const [manual,setManual] = useState({user_id:"", start_date:todayIso()}); const [starts,setStarts] = useState({});
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/probation").then(x=>{ setD(x); setErr(""); }).catch(e=>{ setErr(e.message); setD(null); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const weekList = weeks.split(/[,;\s]+/).map(Number).filter(w=>Number.isInteger(w) && w>=1 && w<=26);
  const saveWeeks = (v) => { setWeeks(v); try { localStorage.setItem(tmWeeksKey(hotel), v); } catch(e){} };
  const plan = async (user_id, start_date) => { setMsg(null);
    try { const r = await api("/api/hotels/"+hotel.id+"/probation/plan","POST",{user_id, start_date, weeks:weekList}); setMsg({ok:true,text:tf("{0} Gespräche geplant.", r.length)}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } };
  const remove = async (r) => { if(!window.confirm(tf("Dieses Gespräch entfernen?"))) return; try { await api("/api/probation-reviews/"+r.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(err) return <div>{tmMsg({ok:false,text:err})}</div>;
  if(!d) return <div style={{color:INK_MUTED}}>…</div>;
  const maxWeek = Math.max(0, ...weekList);
  const byUser = {}; d.reviews.forEach(r=>(byUser[r.user_id] ||= []).push(r));
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Kurze Gespräche in der Probezeit: Wie läuft es, was fehlt, passt es für beide Seiten? Die Personalleitung bekommt am Fälligkeitstag eine Erinnerung.")}</div>
      {tmMsg(msg)}
      <TmProbationDueCard hotel={hotel} api={api} members={members} me={me} data={d} onChanged={load} />
      <Card style={{marginBottom:14}}>
        <b>{tf("Gespräche planen")}</b>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",margin:"8px 0"}}>
          <label style={{fontSize:12.5}}><div className="field-label">{tf("Gespräch nach Woche")}</div><input className="input" style={{width:140,minHeight:44}} value={weeks} onChange={e=>saveWeeks(e.target.value)} /></label>
        </div>
        <div style={{fontSize:12.5,color:tmIsAT(hotel) && maxWeek>4 ? BAD : INK_MUTED,marginBottom:10}}>
          <Icon n="alert" /> {tf("In Österreich dauert die Probezeit höchstens 1 Monat (Gespräche z. B. nach Woche 1, 2 und 4), in Deutschland bis zu 6 Monate (z. B. nach Woche 2, 6 und 10). Maßgeblich ist der Arbeitsvertrag bzw. Kollektiv-/Tarifvertrag.")}
        </div>
        {d.new_members.length>0 && <div style={{fontSize:12.5,fontWeight:700,color:INK_MUTED}}>{tf("Neu im Team, noch ohne Gespräche")}</div>}
        {d.new_members.map(m=>(
          <div key={m.user_id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <b data-no-i18n="" style={{flex:1,minWidth:140}}>{tmName(members, me, m.user_id)}</b>
            <label style={{fontSize:12.5,display:"flex",gap:6,alignItems:"center"}}>{tf("Eintritt")}
              <input className="input" type="date" style={{width:"auto",minHeight:44}} value={starts[m.user_id]||m.start_date} onChange={e=>setStarts({...starts,[m.user_id]:e.target.value})} /></label>
            <button style={tmBtn} disabled={!weekList.length} onClick={()=>plan(m.user_id, starts[m.user_id]||m.start_date)}>{tf("Gespräche planen")}</button>
          </div>))}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",paddingTop:10,borderTop:`1px solid ${BORDER}`}}>
          <label style={{fontSize:12.5}}><div className="field-label">{tf("Person")}</div>
            <select className="input" style={{width:"auto",minHeight:44}} value={manual.user_id} onChange={e=>setManual({...manual,user_id:e.target.value})}>
              <option value="">{tf("Bitte wählen")}</option>{(members||[]).filter(m=>m.role!=="viewer").map(m=><option key={m.user_id} value={m.user_id} data-no-i18n="">{shortName(m.email)}</option>)}
            </select></label>
          <label style={{fontSize:12.5}}><div className="field-label">{tf("Eintritt")}</div><input className="input" type="date" style={{minHeight:44}} value={manual.start_date} onChange={e=>setManual({...manual,start_date:e.target.value})} /></label>
          <button style={tmBtn} disabled={!manual.user_id || !manual.start_date || !weekList.length} onClick={()=>plan(manual.user_id, manual.start_date)}>{tf("Gespräche planen")}</button>
        </div>
      </Card>
      {Object.keys(byUser).length>0 && <Card>
        <b>{tf("Alle Probezeit-Gespräche")}</b>
        {Object.entries(byUser).map(([uid, rs])=>(
          <details key={uid} style={{borderTop:`1px solid ${BORDER}`,padding:"8px 0"}}>
            <summary style={{cursor:"pointer",minHeight:32,fontSize:13.5}}><b data-no-i18n="">{tmName(members, me, uid)}</b> <span style={{color:INK_MUTED}}>· {tf("{0} von {1} geführt", rs.filter(r=>r.done_at).length, rs.length)}</span></summary>
            {rs.map(r=><div key={r.id}><TmProbationReview r={r} api={api} hotel={hotel} name={tmName(members, me, uid)} onSaved={load} />
              <button style={{...linkBtn,color:BAD,minHeight:44}} onClick={()=>remove(r)}>{tf("Entfernen")}</button></div>)}
          </details>))}
      </Card>}
    </div>
  );
}

// ------------------------------------------------------------ 4. Ersthelfer im Dienst
const tmQualKinds = ["Erste Hilfe","Brandschutz","Evakuierungshelfer","Sicherheitsvertrauensperson","Hygiene","Sonstiges"];
function TmOnDutyCard({hotel, api, members, me}){
  const [d,setD] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/on-duty").then(setD).catch(()=>setD(false)),[api, hotel.id]);
  useEffect(()=>{ load(); const t = setInterval(load, 300000); return ()=>clearInterval(t); },[load]);
  if(!d) return null;
  const who = (p) => p.user_id ? tmName(members, me, p.user_id) : (p.name||"–");
  const warn = d.warn_first_aid || d.warn_fire;
  return (
    <Card style={{marginBottom:14,borderColor:warn?BAD:BORDER}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <b style={{flex:1}}><Icon n="user" /> {tf("Jetzt im Haus")} <span style={{fontWeight:400,fontSize:12.5,color:INK_MUTED}}>· {tf("{0} Personen", d.total)} · {d.at}</span></b>
        <button style={tmBtn} onClick={load}>{tf("Aktualisieren")}</button>
      </div>
      {d.warn_first_aid && <div role="alert" style={{color:BAD,fontSize:13.5,marginTop:6}}><Icon n="alert" /> {tf("Zu wenige Ersthelfer im Haus: {0} von mindestens {1}.", d.first_aid.length, d.min_first_aid)}</div>}
      {d.warn_fire && <div role="alert" style={{color:BAD,fontSize:13.5,marginTop:6}}><Icon n="alert" /> {tf("Zu wenige Brandschutzhelfer im Haus: {0} von mindestens {1}.", d.fire.length, d.min_fire)}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:10,marginTop:8,fontSize:13.5}}>
        <div><div style={{fontSize:12.5,fontWeight:700,color:GOOD}}>⛑ {tf("Erste Hilfe")} · {d.first_aid.length}</div>{d.first_aid.length ? d.first_aid.map((p,i)=><div key={i} data-no-i18n="">{who(p)} <span style={{color:INK_MUTED,fontSize:12}}>{translateString(p.department)}</span></div>) : <div style={{color:INK_MUTED}}>–</div>}</div>
        <div><div style={{fontSize:12.5,fontWeight:700,color:BAD}}><Icon n="fire" /> {tf("Brandschutz")} · {d.fire.length}</div>{d.fire.length ? d.fire.map((p,i)=><div key={i} data-no-i18n="">{who(p)} <span style={{color:INK_MUTED,fontSize:12}}>{translateString(p.department)}</span></div>) : <div style={{color:INK_MUTED}}>–</div>}</div>
      </div>
      {d.present && d.present.length>0 && <details style={{marginTop:8}}><summary style={{cursor:"pointer",fontSize:13,minHeight:32}}>{tf("Alle im Haus")}</summary>
        {d.present.map((p,i)=><div key={i} style={{fontSize:13,padding:"3px 0"}}><span data-no-i18n="">{who(p)}</span> <span style={{color:INK_MUTED,fontSize:12}}>· {translateString(p.department)} · {p.via==="Stempeluhr" ? tf("eingestempelt") : tf("laut Dienstplan")}</span></div>)}
      </details>}
      <div style={{fontSize:11.5,color:INK_MUTED,marginTop:8}}>{tf("Grundlage: eingestempelte Personen und Schichten, die laut Dienstplan gerade laufen.")}</div>
    </Card>
  );
}
// Vorschau für den Dienstplan: je Tag und Schicht genug Ersthelfer? days = Liste von Daten (JJJJ-MM-TT) oder Anzahl Tage ab heute
function FirstAidRosterHint({hotel, api, days}){
  const list = Array.isArray(days) ? days.filter(Boolean).slice().sort() : null;
  const from = list && list.length ? list[0] : todayIso();
  const n = list && list.length ? Math.min(31, Math.round((new Date(list[list.length-1]+"T12:00:00Z") - new Date(from+"T12:00:00Z"))/86400000)+1) : Math.min(31, Number(days)||7);
  const [d,setD] = useState(null);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/first-aid-roster?from="+from+"&days="+n).then(setD).catch(()=>setD(false)); },[api, hotel.id, from, n]);
  if(!d) return null;
  const needFa = Math.max(1, d.min_first_aid||0), needFire = d.min_fire||0;
  const gaps = [];
  d.days.forEach(day=>Object.entries(day.shifts).forEach(([kind, s])=>{ if(s.total>0 && (s.first_aid<needFa || (needFire && s.fire<needFire))) gaps.push({date:day.date, kind, ...s}); }));
  return (
    <div style={{border:`1px solid ${gaps.length?WARN:BORDER}`,background:gaps.length?WARN_SOFT:"transparent",borderRadius:8,padding:"8px 10px",fontSize:12.5,margin:"8px 0"}} role="status">
      <b>⛑ {tf("Ersthelfer im Dienstplan")}</b>{" "}
      {gaps.length===0 ? <span style={{color:GOOD}}>{tf("In jeder geplanten Schicht ist mindestens die nötige Zahl an Ersthelfern eingeteilt.")}</span>
        : <span>{tf("{0} Schichten ohne genug Ersthelfer bzw. Brandschutz:", gaps.length)}</span>}
      {gaps.length>0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
        {gaps.slice(0,21).map((g,i)=><span key={i} style={{background:"#fff",border:`1px solid ${BORDER}`,borderRadius:999,padding:"3px 9px"}}>
          {fmtDate(g.date)} · {tf(g.kind)}: {tf("{0} von {1} Erste Hilfe", g.first_aid, needFa)}{needFire ? " · "+tf("{0} von {1} Brandschutz", g.fire, needFire) : ""}</span>)}
      </div>}
    </div>
  );
}
function TmFirstAidView({hotel, api, members, me, orgId}){
  const [quals, load, err] = useList(api, "/api/organizations/"+orgId+"/qualifications");
  const [form,setForm] = useState(null); const [msg,setMsg] = useState(null);
  const [mins,setMins] = useState(null);
  const canWrite = canManageDept("Personal") || canManageDept("Sicherheit");
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/team-settings").then(s=>setMins({min_first_aid:(s.safety_settings||{}).min_first_aid||0, min_fire:(s.safety_settings||{}).min_fire||0})).catch(()=>{}); },[api, hotel.id]);
  const save = async () => { setMsg(null);
    try { const body = {user_id:form.user_id, kind:form.kind, valid_until:form.valid_until||"", note:form.note};
      if(form.id) await api("/api/qualifications/"+form.id,"PATCH",body); else await api("/api/organizations/"+orgId+"/qualifications","POST",body);
      setForm(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const del = async (q) => { if(!window.confirm(tf("Diesen Nachweis löschen?"))) return; try { await api("/api/qualifications/"+q.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const saveMins = async () => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/team-settings","PUT",{safety_settings:mins}); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const today = todayIso(), warnDay = addDaysIso(today, 30);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Wer ist Ersthelfer:in, Brandschutz- oder Evakuierungshelfer:in – und ist gerade jemand davon im Haus? Nachweise als Dokument legst du unter Mitarbeiter-Dokumente ab.")}</div>
      {tmMsg(msg)}{err && tmMsg({ok:false,text:err})}
      <TmOnDutyCard hotel={hotel} api={api} members={members} me={me} />
      {isLeadRole() && <FirstAidRosterHint hotel={hotel} api={api} days={7} />}
      {canWrite && mins && <Card style={{marginBottom:14}}>
        <b>{tf("Mindestbesetzung im Haus")}</b>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
          <label style={{fontSize:12.5}}><div className="field-label">{tf("Ersthelfer mindestens")}</div><input className="input" type="number" min={0} max={50} style={{width:90,minHeight:44}} value={mins.min_first_aid} onChange={e=>setMins({...mins,min_first_aid:e.target.value})} /></label>
          <label style={{fontSize:12.5}}><div className="field-label">{tf("Brandschutz mindestens")}</div><input className="input" type="number" min={0} max={50} style={{width:90,minHeight:44}} value={mins.min_fire} onChange={e=>setMins({...mins,min_fire:e.target.value})} /></label>
          <button style={tmBtn} onClick={saveMins}>{tf("Speichern")}</button>
        </div>
        <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Wie viele Ersthelfer nötig sind, hängt von der Zahl der Beschäftigten ab (Österreich: ASchG und AStV, Deutschland: DGUV Vorschrift 1). Bitte mit der Sicherheitsfachkraft abstimmen.")}</div>
      </Card>}
      <Card>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <b style={{flex:1}}>{tf("Qualifikationen")}</b>
          {canWrite && !form && <button className="btn-primary" style={tmMain} onClick={()=>setForm({user_id:"", kind:"Erste Hilfe", valid_until:"", note:""})}>{tf("Nachweis eintragen")}</button>}
        </div>
        {form && <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginTop:10}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px"}}>
            <Field label={tf("Person")}><select className="input" value={form.user_id} disabled={!!form.id} onChange={e=>setForm({...form,user_id:e.target.value})}><option value="">{tf("Bitte wählen")}</option>{(members||[]).map(m=><option key={m.user_id} value={m.user_id} data-no-i18n="">{shortName(m.email)}</option>)}</select></Field>
            <Field label={tf("Art")}><select className="input" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{tmQualKinds.map(k=><option key={k} value={k}>{tf(k)}</option>)}</select></Field>
            <Field label={tf("Gültig bis")}><input className="input" type="date" value={form.valid_until||""} onChange={e=>setForm({...form,valid_until:e.target.value})} /></Field>
          </div>
          <Field label={tf("Notiz")}><input className="input" maxLength={500} value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder={tf("z. B. 16-Stunden-Kurs, Auffrischung alle 2 Jahre")} data-no-i18n="" /></Field>
          <div style={{display:"flex",gap:8}}><button className="btn-primary" style={tmMain} disabled={!form.user_id} onClick={save}>{tf("Speichern")}</button><button style={{...linkBtn,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
        </div>}
        {quals && quals.length===0 && <div style={{fontSize:13,color:INK_MUTED,marginTop:8}}>{tf("Noch keine Qualifikationen eingetragen.")}</div>}
        {(quals||[]).map(q=>{ const exp = q.valid_until && q.valid_until<today, soon = !exp && q.valid_until && q.valid_until<=warnDay; return (
          <div key={q.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:160}}><b data-no-i18n="">{tmName(members, me, q.user_id)}</b> · {tf(q.kind)}{q.note ? <span data-no-i18n="" style={{color:INK_MUTED,fontSize:12.5}}> · {q.note}</span> : null}</span>
            <span style={{fontSize:12.5,color:INK_MUTED}}>{q.valid_until ? tf("gültig bis {0}", fmtDate(q.valid_until)) : tf("ohne Ablaufdatum")}</span>
            {exp && <Pill color={BAD} bg={BAD_SOFT}>{tf("abgelaufen")}</Pill>}
            {soon && <Pill color={WARN} bg={WARN_SOFT}>{tf("läuft bald ab")}</Pill>}
            {canWrite && <button style={tmBtn} onClick={()=>setForm({...q, valid_until:q.valid_until||"", note:q.note||""})}>{tf("Bearbeiten")}</button>}
            {canWrite && <button style={{...linkBtn,color:BAD,minHeight:44}} onClick={()=>del(q)} aria-label={tf("Nachweis löschen")}>✕</button>}
          </div>); })}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ 5. Übungsgast für die Rezeption (KI-Rollenspiel)
const tmScenarios = [["laerm","Beschwerde wegen Lärm"],["ueberbuchung","Überbuchung"],["zimmer","Zimmer noch nicht fertig"],["sonderwunsch","Sonderwunsch"],["rechnung","Rechnung ist falsch"],["vip","VIP-Gast ist unzufrieden"],["frei","Eigene Situation"]];
const tmLangs = [["de","Deutsch"],["en","English"],["fr","Français"],["it","Italiano"],["es","Español"],["pt","Português"],["tr","Türkçe"],["ja","日本語"],["zh","中文"],["ar","العربية"]];
const tmScenarioLabel = (s) => { const v = String(s||""); if(v.startsWith("frei:")) return v.slice(5); const x = tmScenarios.find(([k])=>k===v); return x ? translateString(x[1]) : v; };
const tmSay = (text, lang) => { if(!canSpeak()) return; try { const u = new window.SpeechSynthesisUtterance(text); u.lang = SPEECH_LANG[lang] || "de-DE"; u.rate = 1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch(e){} };
function TmMic({lang, onText}){
  const [on,setOn] = useState(false); const ref = React.useRef(null);
  if(!SpeechRec) return null; // Spracheingabe nur, wenn der Browser sie kann
  const toggle = () => { if(on && ref.current){ ref.current.stop(); return; }
    const r = new SpeechRec(); ref.current = r; r.lang = SPEECH_LANG[lang] || "de-DE"; r.interimResults = false; r.continuous = false;
    r.onresult = (e) => { const t = Array.from(e.results).map(x=>x[0].transcript).join(" ").trim(); if(t) onText(t); };
    r.onend = () => setOn(false); r.onerror = () => setOn(false); setOn(true); r.start(); };
  return <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? tf("Diktat beenden") : tf("Antwort sprechen")} style={{...tmBtn,background:on?BAD:"#fff",color:on?"#fff":INK}}>{on ? "■" : <Icon n="mic" />}</button>;
}
function TmRoleplayView({hotel, api, me, members}){
  const [list,setList] = useState(null); const [team,setTeam] = useState(null); const [cur,setCur] = useState(null);
  const [setup,setSetup] = useState({scenario:"laerm", custom:"", language:UI_LANG||"de"}); const [text,setText] = useState("");
  const [voice,setVoice] = useState(false); const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/roleplay").then(setList).catch(e=>{ setList([]); setMsg({ok:false,text:e.message}); }),[api, hotel.id]);
  useEffect(()=>{ load(); if(isLeadRole()) api("/api/hotels/"+hotel.id+"/roleplay?all=1").then(setTeam).catch(()=>setTeam(null)); },[load]);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const start = () => run(async()=>{ const s = await api("/api/hotels/"+hotel.id+"/roleplay","POST",setup); setCur(s); setText(""); if(voice) tmSay(s.transcript[0].text, s.language); });
  const send = () => { const t = text.trim(); if(!t) return; run(async()=>{ const s = await api("/api/roleplay/"+cur.id+"/turn","POST",{text:t}); setCur(s); setText(""); if(voice){ const last = s.transcript[s.transcript.length-1]; if(last) tmSay(last.text, s.language); } }); };
  const finish = () => run(async()=>{ const s = await api("/api/roleplay/"+cur.id+"/finish","POST",{}); setCur(s); load(); });
  const openOld = (s) => run(async()=>setCur(await api("/api/roleplay/"+s.id)));
  if(cur) return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
        <b style={{flex:1}}><Icon n="chat" /> {tf("Übungsgast")}: <span data-no-i18n="">{tmScenarioLabel(cur.scenario)}</span></b>
        {canSpeak() && <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)} /> {tf("Gast vorlesen")}</label>}
        <button style={tmBtn} onClick={()=>{ try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){} setCur(null); load(); }}>{tf("Zurück")}</button>
      </div>
      {tmMsg(msg)}
      <Card style={{marginBottom:12}}>
        <div aria-live="polite" lang={cur.language} dir={cur.language==="ar"?"rtl":"auto"}>
          {(cur.transcript||[]).map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="staff"?"flex-end":"flex-start",margin:"6px 0"}}>
              <div style={{maxWidth:"80%",background:m.role==="staff"?INK:BRASS_SOFT,color:m.role==="staff"?"#fff":INK,borderRadius:12,padding:"8px 12px",fontSize:14}} data-no-i18n="">
                <div style={{fontSize:11,opacity:.75}}>{m.role==="staff" ? tf("Du") : tf("Gast")}</div>{m.text}
              </div>
            </div>))}
          {busy && <div style={{color:INK_MUTED,fontSize:13}}>…</div>}
        </div>
        {!cur.finished_at && <div style={{display:"flex",gap:8,alignItems:"flex-end",marginTop:10}}>
          <textarea className="input" rows={2} style={{flex:1}} maxLength={1000} value={text} onChange={e=>setText(e.target.value)} aria-label={tf("Deine Antwort an den Gast")} placeholder={tf("Deine Antwort an den Gast …")} lang={cur.language} dir="auto" data-no-i18n=""
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); if(!busy) send(); } }} />
          <TmMic lang={cur.language} onText={(t)=>setText(appendText(text, t))} />
          <button className="btn-primary" style={tmMain} disabled={busy || !text.trim()} onClick={send}>{tf("Senden")}</button>
        </div>}
        {!cur.finished_at && <button style={{...tmBtn,marginTop:10}} disabled={busy} onClick={finish}>{tf("Übung beenden und Rückmeldung holen")}</button>}
      </Card>
      {cur.finished_at && (cur.feedback ? <TmRoleplayFeedback f={cur.feedback} /> : <div style={{color:INK_MUTED,fontSize:13}}>{tf("Ohne eigene Antworten gibt es keine Rückmeldung.")}</div>)}
    </div>
  );
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Üben ohne echten Gast: Die KI spielt eine:n Gast mit einem typischen Anliegen, du antwortest wie an der Rezeption. Danach gibt es eine Rückmeldung mit Punktzahl und Musterformulierungen.")}</div>
      {tmMsg(msg)}
      <Card style={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Szenario")}><select className="input" value={setup.scenario} onChange={e=>setSetup({...setup,scenario:e.target.value})}>{tmScenarios.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
          <Field label={tf("Sprache des Gastes")}><select className="input" value={setup.language} onChange={e=>setSetup({...setup,language:e.target.value})}>{tmLangs.map(([k,l])=><option key={k} value={k} data-no-i18n="">{l}</option>)}</select></Field>
        </div>
        {setup.scenario==="frei" && <Field label={tf("Situation beschreiben")}><textarea className="input" rows={3} maxLength={600} value={setup.custom} onChange={e=>setSetup({...setup,custom:e.target.value})} placeholder={tf("z. B. Gast möchte mit dem Hund ins Restaurant")} data-no-i18n="" /></Field>}
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn-primary" style={tmMain} disabled={busy || (setup.scenario==="frei" && !setup.custom.trim())} onClick={start}>{busy ? "…" : tf("Übung starten")}</button>
          {canSpeak() && <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)} /> {tf("Gast vorlesen")}</label>}
        </div>
      </Card>
      {(list||[]).length>0 && <Card style={{marginBottom:14}}>
        <b>{tf("Meine Übungen")}</b>
        {list.map(s=>(
          <div key={s.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:160}} data-no-i18n="">{tmScenarioLabel(s.scenario)}</span>
            <span style={{fontSize:12.5,color:INK_MUTED}}>{fmtDateTime(s.created_at)}</span>
            {s.score!=null ? <Pill color={s.score>=7?GOOD:s.score>=4?WARN:BAD} bg={s.score>=7?GOOD_SOFT:s.score>=4?WARN_SOFT:BAD_SOFT}>{s.score}/10</Pill> : !s.finished_at && <Pill color={INK_MUTED} bg={PAPER}>{tf("offen")}</Pill>}
            <button style={tmBtn} onClick={()=>openOld(s)}>{s.finished_at ? tf("Ansehen") : tf("Weiterüben")}</button>
          </div>))}
      </Card>}
      {team && team.length>0 && <TmRoleplayTeam list={team} members={members} me={me} />}
    </div>
  );
}
function TmRoleplayFeedback({f}){
  return (
    <Card style={{borderColor:BRASS}}>
      <div style={{display:"flex",gap:10,alignItems:"baseline",flexWrap:"wrap"}}><b style={{flex:1}}><Icon n="star" /> {tf("Rückmeldung")}</b><span style={{fontSize:26,fontWeight:700,color:f.punktzahl>=7?GOOD:f.punktzahl>=4?WARN:BAD}}>{f.punktzahl}/10</span></div>
      <div data-no-i18n="" style={{fontSize:14,margin:"6px 0 10px"}}>{f.zusammenfassung}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,fontSize:13.5}}>
        <div><div style={{fontWeight:700,color:GOOD}}>{tf("Stärken")}</div><ul style={{margin:"4px 0",paddingInlineStart:18}} data-no-i18n="">{(f.staerken||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div>
        <div><div style={{fontWeight:700,color:WARN}}>{tf("Verbesserungen")}</div><ul style={{margin:"4px 0",paddingInlineStart:18}} data-no-i18n="">{(f.verbesserungen||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></div>
      </div>
      {(f.musterformulierungen||[]).length>0 && <div style={{marginTop:10}}><div style={{fontWeight:700,fontSize:13.5}}>{tf("Musterformulierungen")}</div>
        {f.musterformulierungen.map((m,i)=><div key={i} style={{background:PAPER,borderRadius:8,padding:"8px 10px",marginTop:6,fontSize:13.5}} data-no-i18n=""><div style={{fontSize:12,color:INK_MUTED}}>{m.situation}</div>„{m.formulierung}“</div>)}</div>}
    </Card>
  );
}
// Übersicht für die Leitung: Übungen des Teams
function TmRoleplayTeam({list, members, me}){
  const done = list.filter(s=>s.score!=null);
  const byUser = {}; done.forEach(s=>(byUser[s.user_id] ||= []).push(s));
  return (
    <Card>
      <b><Icon n="users" /> {tf("Übungen im Team")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"2px 0 6px"}}>{tf("{0} Übungen, Durchschnitt {1} Punkte", done.length, done.length ? fmtNum(done.reduce((a,s)=>a+s.score,0)/done.length,1) : "–")}</div>
      {Object.entries(byUser).map(([uid, rs])=>(
        <div key={uid} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <b data-no-i18n="" style={{flex:1,minWidth:140}}>{tmName(members, me, uid)}</b>
          <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("{0} Übungen", rs.length)} · {tf("zuletzt {0}", fmtDate(rs[0].created_at))}</span>
          <Pill color={BRASS} bg={BRASS_SOFT}>Ø {fmtNum(rs.reduce((a,s)=>a+s.score,0)/rs.length,1)}</Pill>
        </div>))}
    </Card>
  );
}

// ------------------------------------------------------------ 6. Dienstzeugnis-Entwurf (Leitung Personal)
function TmReferenceLetterCard({hotel, api, members}){
  const [f,setF] = useState({user_id:"", type:"qualifiziert", country:tmIsDE(hotel)?"DE":"AT", name:"", position:"", start_date:"", end_date:"", tasks:"", notes:""});
  const [out,setOut] = useState(null); const [text,setText] = useState(""); const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  if(!canManageDept("Personal")) return null;
  const set = (k) => (e) => setF({...f, [k]: e.target.value});
  const gen = async () => { setBusy(true); setMsg(null);
    try { const r = await api("/api/hotels/"+hotel.id+"/reference-letter","POST",f); setOut(r); setText(r.text); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const word = async () => { try { const lines = text.split("\n"); const first = (lines[0]||"").trim();
    const body = first && first.length<=60 && !first.startsWith("# ") ? "# "+first+"\n\n"+lines.slice(1).join("\n").replace(/^\n+/,"") : text;
    downloadBlob(await docxFromText(body, {hotel}), safeFile(translateString("Dienstzeugnis")+" "+(f.name||""))+".docx"); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <Card style={{marginBottom:14}}>
      <b><Icon n="filetext" /> {tf("Dienstzeugnis-Entwurf")}</b>
      <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Die KI schreibt einen wohlwollenden Entwurf aus Eintritt, Abteilung, abgeschlossenen Kursen und Unterweisungen sowie deinen Notizen.")}</div>
      {tmMsg(msg)}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Person")}><select className="input" value={f.user_id} onChange={set("user_id")}><option value="">{tf("Bitte wählen")}</option>{(members||[]).map(m=><option key={m.user_id} value={m.user_id} data-no-i18n="">{shortName(m.email)}</option>)}</select></Field>
        <Field label={tf("Vollständiger Name")}><input className="input" maxLength={120} value={f.name} onChange={set("name")} data-no-i18n="" /></Field>
        <Field label={tf("Position")}><input className="input" maxLength={120} value={f.position} onChange={set("position")} placeholder={tf("z. B. Rezeptionistin")} data-no-i18n="" /></Field>
        <Field label={tf("Art")}><select className="input" value={f.type} onChange={set("type")}><option value="einfach">{tf("Einfaches Zeugnis")}</option><option value="qualifiziert">{tf("Qualifiziertes Zeugnis")}</option></select></Field>
        <Field label={tf("Land")}><select className="input" value={f.country} onChange={set("country")}><option value="AT">{tf("Österreich")}</option><option value="DE">{tf("Deutschland")}</option></select></Field>
        <Field label={tf("Eintritt (leer = aus der App)")}><input className="input" type="date" value={f.start_date} onChange={set("start_date")} /></Field>
        <Field label={tf("Austritt")}><input className="input" type="date" value={f.end_date} onChange={set("end_date")} /></Field>
      </div>
      <Field label={tf("Aufgaben")}><textarea className="input" rows={3} maxLength={2000} value={f.tasks} onChange={set("tasks")} placeholder={tf("z. B. Check-in und Check-out, Kassa, Beschwerden, Einschulung neuer Kolleg:innen")} data-no-i18n="" /></Field>
      <Field label={tf("Notizen der Leitung (Leistung und Verhalten)")}><textarea className="input" rows={3} maxLength={3000} value={f.notes} onChange={set("notes")} data-no-i18n="" /></Field>
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:10}}>{f.country==="AT"
        ? tf("Österreich: Das Zeugnis darf das berufliche Fortkommen nicht erschweren (Erschwerungsverbot) – keine versteckten Codes, keine negativen Andeutungen.")
        : tf("Deutschland: Das Zeugnis muss wahr und wohlwollend sein (§ 109 GewO) – keine versteckten Codes oder doppeldeutigen Formulierungen.")}</div>
      <button className="btn-primary" style={tmMain} disabled={busy || !f.user_id} onClick={gen}>{busy ? "…" : tf("Entwurf erstellen")}</button>
      {out && <div style={{marginTop:12}}>
        <div role="note" style={{border:`1px solid ${WARN}`,background:WARN_SOFT,borderRadius:8,padding:"8px 10px",fontSize:13,marginBottom:8}}>
          <b><Icon n="alert" /> {tf("Nur ein Entwurf")}</b> – {tf("bitte vollständig prüfen, Platzhalter in eckigen Klammern ergänzen, auf Briefpapier übernehmen und von der Leitung unterschreiben lassen.")}
        </div>
        {(out.hinweise||[]).length>0 && <ul style={{fontSize:12.5,color:INK_MUTED,margin:"0 0 8px",paddingInlineStart:18}} data-no-i18n="">{out.hinweise.map((h,i)=><li key={i}>{h}</li>)}</ul>}
        <textarea className="input" rows={16} value={text} onChange={e=>setText(e.target.value)} aria-label={tf("Text des Zeugnis-Entwurfs")} data-no-i18n="" />
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
          <button style={tmBtn} onClick={word}><Icon n="word" /> {tf("Als Word herunterladen")}</button>
          <button style={tmBtn} onClick={async()=>{ try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Text kopiert.")}); } catch(e){} }}>{tf("Text kopieren")}</button>
        </div>
      </div>}
    </Card>
  );
}
