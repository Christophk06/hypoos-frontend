// ============================================================ Migration 036: Automatik-Regeln, Zimmer-Abnahme, Mitarbeiter-Dokumente

// ------------------------------------------------------------ Automatik-Regeln (Admin, über den Meldungen)
const AUTOMATIONS = [
  ["ooo_ticket", "Zimmer „Außer Betrieb“ → Meldung an die Technik", "Wird ein Zimmer auf „Außer Betrieb“ gesetzt, entsteht automatisch eine Meldung für die Technik (nicht doppelt)."],
  ["overdue_tickets", "Dringende Meldungen länger als 24 Stunden offen → Erinnerung", "Jeden Morgen eine Nachricht an die Leitung der Abteilung, wenn dringende oder hohe Meldungen liegen bleiben."],
  ["feedback_alert", "Unzufriedener Gast → sofort an die Rezeption", "Bei einer schlechten Bewertung im Gäste-Feedback geht sofort eine Nachricht an die Rezeption – solange der Gast noch im Haus ist."],
  ["after_stay_mail", "Nach der Abreise → Bitte um Feedback per Mail", "Gäste aus „Anreisen“ mit E-Mail bekommen am Tag nach der Abreise eine kurze Bitte um Bewertung."],
];
function AutomationsCard({hotel, api, onHotel}){
  const [open,setOpen] = useState(false); const [msg,setMsg] = useState("");
  if(hotel.automations===undefined) return null; // Migration 036 noch nicht eingespielt
  const a = hotel.automations || {};
  const on = (k) => a[k] !== false;
  const toggle = async (k) => { setMsg(""); try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{automations:{...a, [k]: !on(k)}}); onHotel && onHotel(h); } catch(e){ setMsg(e.message); } };
  const active = AUTOMATIONS.filter(([k])=>on(k)).length;
  return (
    <Card style={{marginBottom:14}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{flex:1}}><b><Icon n="bolt" /> {tf("Automatik")}</b> <span style={{fontSize:12.5,color:INK_MUTED}}>· {tf("{0} von {1} Regeln aktiv", active, AUTOMATIONS.length+1)}</span></div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:10}}>
        {AUTOMATIONS.map(([k,title,desc])=>(
          <label key={k} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderTop:`1px solid ${BORDER}`,cursor:"pointer"}}>
            <input type="checkbox" checked={on(k)} onChange={()=>toggle(k)} style={{marginTop:3}} />
            <span><b style={{fontSize:13.5}}>{tf(title)}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf(desc)}</div></span>
          </label>))}
        <div style={{display:"flex",gap:10,padding:"8px 0",borderTop:`1px solid ${BORDER}`}}>
          <input type="checkbox" checked readOnly disabled style={{marginTop:3}} />
          <span><b style={{fontSize:13.5}}>{tf("Unter Mindestbestand → Nachbestellung")}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Immer aktiv: Fällt ein Lagerartikel unter den Mindestbestand, wird der Einkauf benachrichtigt.")}</div></span>
        </div>
        {msg && <ErrorText>{msg}</ErrorText>}
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Zimmer-Abnahme mit Foto-Checkliste
const DEFAULT_INSPECTION_ITEMS = ["Bett gemacht, Wäsche fleckenfrei", "Bad sauber, Armaturen glänzen", "Handtücher und Pflegeprodukte vollständig", "Boden gesaugt, keine Haare", "Minibar/Kaffee aufgefüllt", "Fenster, Spiegel ohne Streifen", "Licht, TV, Klima funktionieren", "Geruch frisch"];
const canInspect = () => canManageDept("Housekeeping") || canManageDept("Rezeption & Empfang");
function InspectionDialog({room, hotel, api, onHotel, onClose, onDone}){
  const list = (hotel.inspection_items && hotel.inspection_items.length) ? hotel.inspection_items : DEFAULT_INSPECTION_ITEMS;
  const [items,setItems] = useState(list.map(l=>({label:l, ok:true, note:"", photo_data:null})));
  const [note,setNote] = useState(""); const [busy,setBusy] = useState(false); const [msg,setMsg] = useState("");
  const [hist,setHist] = useState(null); const [edit,setEdit] = useState(null);
  useEffect(()=>{ api("/api/rooms/"+room.id+"/inspections").then(setHist).catch(()=>setHist([])); },[room.id]);
  const set = (i, k, v) => setItems(items.map((x,j)=>j===i?{...x,[k]:v}:x));
  const photos = items.filter(x=>x.photo_data).length;
  const save = async () => { setBusy(true); setMsg("");
    try { const r = await api("/api/rooms/"+room.id+"/inspections","POST",{items, note}); onDone(r); onClose(); } catch(e){ setMsg(e.message); } setBusy(false); };
  const saveList = async () => { try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{inspection_items:edit.split("\n").map(x=>x.trim()).filter(Boolean)}); onHotel && onHotel(h); setItems((h.inspection_items||[]).map(l=>({label:l, ok:true, note:"", photo_data:null}))); setEdit(null); } catch(e){ setMsg(e.message); } };
  return (
    <Overlay onClose={onClose} width={560} label={tf("Zimmer-Abnahme")}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <b style={{flex:1,fontSize:16}}>{tf("Zimmer-Abnahme")} · <span data-no-i18n="">{room.number}</span></b>
        {ACCESS.role==="admin" && edit===null && <button style={linkBtn} onClick={()=>setEdit(list.join("\n"))}>{tf("Prüfpunkte bearbeiten")}</button>}
      </div>
      {edit!==null ? <div>
          <Field label={tf("Ein Prüfpunkt je Zeile (höchstens 40)")}><textarea className="input" rows={10} value={edit} onChange={e=>setEdit(e.target.value)} /></Field>
          <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={saveList}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button></div>
        </div>
      : <div>
        {items.map((x,i)=>(
          <div key={i} style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{flex:1,fontSize:13.5}}>{tf(x.label)}</span>
              <button aria-pressed={x.ok} onClick={()=>set(i,"ok",true)} style={{...smallBtn,background:x.ok?GOOD_SOFT:"#fff",borderColor:x.ok?GOOD:BORDER,color:x.ok?GOOD_TEXT:INK}}>✓</button>
              <button aria-pressed={!x.ok} onClick={()=>set(i,"ok",false)} style={{...smallBtn,background:!x.ok?BAD_SOFT:"#fff",borderColor:!x.ok?BAD:BORDER,color:!x.ok?BAD:INK}}>✕</button>
            </div>
            {!x.ok && <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
              <input className="input" style={{flex:1,minWidth:160}} value={x.note} maxLength={300} placeholder={tf("Was fehlt oder ist nicht in Ordnung?")} onChange={e=>set(i,"note",e.target.value)} />
              {(x.photo_data || photos<5) && <label style={{...smallBtn,display:"inline-flex",gap:4,alignItems:"center"}}><Icon n="camera" /> {x.photo_data ? tf("Anderes Foto") : tf("Foto")}
                <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={async e=>{ try { set(i,"photo_data", await compressImage(e.target.files[0], 1280, 0.7)); } catch(err){ setMsg(err.message); } }} /></label>}
              {x.photo_data && <img src={x.photo_data} alt="" style={{height:40,borderRadius:4}} />}
            </div>}
          </div>))}
        <Field label={tf("Bemerkung (optional)")}><input className="input" value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} /></Field>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{items.every(x=>x.ok) ? tf("Bestanden – das Zimmer wird auf „Kontrolliert“ gesetzt.") : tf("Nicht bestanden – das Zimmer geht zurück auf „Schmutzig“, jeder Mangel wird eine Meldung an Housekeeping.")}</div>
        {msg && <ErrorText style={{marginBottom:8}}>{msg}</ErrorText>}
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={busy} onClick={save}>{busy ? tf("Speichert…") : tf("Abnahme speichern")}</button><button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button></div>
        {hist && hist.length>0 && <div style={{marginTop:14}}>
          <div className="field-label">{tf("Letzte Abnahmen")}</div>
          {hist.slice(0,5).map(h=><div key={h.id} style={{fontSize:12.5,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}>
            {fmtDateTime(h.created_at)} · <b style={{color:h.passed?GOOD:BAD}}>{h.passed ? tf("bestanden") : tf("nicht bestanden")}</b>
            {!h.passed && <span style={{color:INK_MUTED}}> – {h.items.filter(x=>!x.ok).map(x=>tf(x.label)).join(", ")}</span>}</div>)}
        </div>}
      </div>}
    </Overlay>
  );
}

// ------------------------------------------------------------ Mitarbeiter-Dokumente (Admin und Leitung Personal)
const STAFF_DOC_KINDS = ["Arbeitsvertrag","Gesundheitszeugnis","Aufenthaltstitel","Arbeitserlaubnis","Ausweis","Zeugnis","Sonstiges"];
function StaffDocsView({orgId, api, members}){
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [q,setQ] = useState("");
  const load = () => api("/api/organizations/"+orgId+"/staff-documents").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); });
  useEffect(()=>{ load(); },[orgId]);
  const nameOf = (d) => d.user_id ? (((members||[]).find(m=>m.user_id===d.user_id)||{}).email||"").split("@")[0] || tf("Teammitglied") : (d.person_name||"–");
  const today = todayIso(), soon = isoMonthsAhead(today, 1);
  const state = (d) => !d.valid_until ? null : d.valid_until < today ? [BAD,BAD_SOFT,tf("abgelaufen")] : d.valid_until <= soon ? [WARN_TEXT,WARN_SOFT,tf("läuft bald ab")] : null;
  const save = async () => { setMsg(null);
    try { const body = {...form, user_id: form.user_id || null}; if(form.id) await api("/api/staff-documents/"+form.id,"PATCH",body); else await api("/api/organizations/"+orgId+"/staff-documents","POST",body); setForm(null); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } };
  const pickFile = (file) => { if(!file) return; if(file.size > 2000000) return setMsg({ok:false,text:tf("Bitte PDF oder Foto unter 2 MB.")});
    if(/^image\//.test(file.type)) compressImage(file, 1600, 0.75).then(d=>setForm(f=>({...f,file_data:d}))).catch(e=>setMsg({ok:false,text:e.message}));
    else { const r = new FileReader(); r.onload = () => setForm(f=>({...f,file_data:r.result})); r.readAsDataURL(file); } };
  const open = async (d) => { try { const x = await api("/api/staff-documents/"+d.id+"/file"); const b = await safeFileBlob(x.file_data); const url = URL.createObjectURL(b); const w = window.open(url, "_blank", "noopener"); if(!w){ const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click(); } setTimeout(()=>URL.revokeObjectURL(url), 60000); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const del = async (d) => { if(!window.confirm(tf("Dokument löschen?"))) return; try { await api("/api/staff-documents/"+d.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const shown = (list||[]).filter(d=>!q.trim() || (nameOf(d)+" "+d.kind+" "+(d.title||"")).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Arbeitsverträge, Gesundheitszeugnisse, Aufenthaltstitel und Arbeitserlaubnisse mit Ablaufdatum. Nur Admins und die Leitung Personal sehen alle; jede Person sieht ihre eigenen. Erinnerung rechtzeitig vor dem Ablauf.")}</div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {!form && <button className="btn-primary" onClick={()=>setForm({user_id:"", person_name:"", kind:"Arbeitsvertrag", title:"", valid_until:"", remind_days:30, note:"", file_data:undefined})}>{tf("Dokument hinzufügen")}</button>}
        <input className="input" style={{flex:1,minWidth:180}} value={q} onChange={e=>setQ(e.target.value)} placeholder={tf("Suchen …")} aria-label={tf("Suchen")} />
      </div>
      {form && <Card style={{marginBottom:14,borderColor:BRASS}}>
        <HolderField members={members} value={form} onChange={(v)=>setForm({...form,...v})} />
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Art")}><select className="input" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{STAFF_DOC_KINDS.map(k=><option key={k} value={k}>{tf(k)}</option>)}</select></Field>
          <Field label={tf("Bezeichnung (optional)")}><input className="input" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} /></Field>
          <Field label={tf("Gültig bis")}><input className="input" type="date" value={form.valid_until||""} onChange={e=>setForm({...form,valid_until:e.target.value})} /></Field>
          <Field label={tf("Erinnern (Tage vorher)")}><input className="input" type="number" min={0} max={365} value={form.remind_days} onChange={e=>setForm({...form,remind_days:e.target.value})} /></Field>
        </div>
        <Field label={tf("Notiz")}><input className="input" value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <label style={{...btnLine,display:"inline-block"}}>{form.file_data ? tf("Andere Datei") : tf("PDF oder Foto anhängen")}<input type="file" accept="application/pdf,image/*" style={{display:"none"}} onChange={e=>pickFile(e.target.files[0])} /></label>
          {form.file_data && <span style={{fontSize:12.5,color:GOOD}}>✓ {tf("Datei angehängt")}</span>}
        </div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!form.user_id && !(form.person_name||"").trim()} onClick={save}>{tf("Speichern")}</button><button style={btnLine} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button></div>
      </Card>}
      {list && shown.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Dokumente.")}</div>}
      {shown.length>0 && <Card style={{padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:560}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{padding:10,textAlign:"start"}}>{tf("Person")}</th><th style={{textAlign:"start"}}>{tf("Dokument")}</th><th style={{textAlign:"start"}}>{tf("Gültig bis")}</th><th></th></tr></thead>
        <tbody>{shown.map(d=>{ const st = state(d); return (
          <tr key={d.id} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:10}} data-no-i18n="">{nameOf(d)}</td>
            <td>{tf(d.kind)}{d.title ? <span data-no-i18n="" style={{color:INK_MUTED}}> · {d.title}</span> : null}</td>
            <td>{d.valid_until ? fmtDate(d.valid_until) : "–"} {st && <Pill color={st[0]} bg={st[1]}>{st[2]}</Pill>}</td>
            <td style={{whiteSpace:"nowrap",textAlign:"end",paddingInlineEnd:10}}>
              {d.has_file && <button style={linkBtn} onClick={()=>open(d)}>{tf("Öffnen")}</button>}
              <button style={linkBtn} onClick={()=>setForm({...d, title:d.title||"", note:d.note||"", valid_until:d.valid_until||"", user_id:d.user_id||"", person_name:d.person_name||"", file_data:undefined})}>{tf("Bearbeiten")}</button>
              <button style={{...linkBtn,color:BAD}} aria-label={tf("Löschen")} onClick={()=>del(d)}>✕</button>
            </td>
          </tr>); })}</tbody></table></Card>}
    </div>
  );
}
