// ============================================================ Hotel-Gedächtnis (KI über die eigenen Daten), Wohlbefinden im Team, Mängel-Vorhersage

// ------------------------------------------------------------ Hotel-Gedächtnis (Leitung)
const MEMORY_EXAMPLES = ["Warum waren die Personalkosten im letzten Monat höher als davor?", "Welche Zimmer haben die meisten Meldungen?", "Wie haben sich die Bewertungen entwickelt?", "Wie viel Wäsche fehlt pro Monat?", "Wo ist der Energieverbrauch gestiegen?"];
function HotelMemoryView({hotel, api}){
  const [q,setQ] = useState(""); const [list,setList] = useState([]); const [busy,setBusy] = useState(false); const [msg,setMsg] = useState("");
  const ask = async (question) => { const x = (question||q).trim(); if(!x || busy) return; setBusy(true); setMsg(""); setQ("");
    try { const r = await api("/api/hotels/"+hotel.id+"/ask-data","POST",{question:x, lang:UI_LANG}); setList(l=>[{q:x, ...r}, ...l]); } catch(e){ setMsg(e.message); setQ(x); } setBusy(false); };
  return (
    <div style={{maxWidth:820}}>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Fragen Sie Ihr Hotel in normaler Sprache. Die KI antwortet aus Meldungen, Stempelzeiten, Belegung, Bewertungen, Kassenbuch, Energie, Wäsche und Minibar der letzten sechs Monate – zusammengefasst je Monat und Abteilung, ohne Namen.")}</div>
      <form onSubmit={e=>{ e.preventDefault(); ask(); }} style={{display:"flex",gap:8,marginBottom:10}}>
        <input className="input" style={{flex:1}} value={q} maxLength={500} onChange={e=>setQ(e.target.value)} placeholder={tf("z. B. Was waren die häufigsten Mängel im Sommer?")} aria-label={tf("Frage an das Hotel-Gedächtnis")} />
        <button className="btn-primary" type="submit" disabled={busy || !q.trim()}>{busy ? tf("Denkt nach…") : tf("Fragen")}</button>
      </form>
      {list.length===0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{MEMORY_EXAMPLES.map(x=><button key={x} style={{...btnLine,fontSize:12.5,padding:"6px 10px"}} onClick={()=>ask(tf(x))}>{tf(x)}</button>)}</div>}
      {msg && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{msg}</div>}
      <div aria-live="polite">{list.map((r,i)=>(
        <Card key={i} style={{marginBottom:10,borderColor:r.unsicher?WARN:BORDER}}>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:6}} data-no-i18n=""><Icon n="search" /> {r.q}</div>
          <div style={{fontSize:14,lineHeight:1.55,whiteSpace:"pre-wrap"}} data-no-i18n="">{r.antwort}</div>
          <div style={{fontSize:11.5,color:INK_MUTED,marginTop:8}}>{tf("Quellen")}: <span data-no-i18n="">{(r.quellen||[]).join(", ") || "–"}</span>{r.unsicher ? " · "+tf("Die Daten reichen für eine sichere Antwort nicht aus.") : ""}</div>
        </Card>))}</div>
    </div>
  );
}

// ------------------------------------------------------------ Wohlbefinden im Team (im Dienstplan, Leitung)
const WELL_FLAGS = {streak:"6 Tage oder mehr am Stück", nights:"viele Nachtdienste", weekends:"fast jedes Wochenende im Dienst", jumped_in:"oft eingesprungen", overtime:"deutlich über der vereinbarten Zeit"};
function WellbeingCard({hotel, api, members}){
  const [d,setD] = useState(null); const [open,setOpen] = useState(false);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/wellbeing").then(setD).catch(()=>setD(null)); },[hotel.id]);
  if(!d) return null;
  const flagged = d.people.filter(p=>p.flags.length);
  const nameOf = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
  return (
    <Card style={{marginTop:14,borderColor:flagged.length?WARN:BORDER}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{flex:1}}><b><Icon n="users" /> {tf("Belastung im Team")}</b> <span style={{fontSize:12.5,color:flagged.length?WARN:INK_MUTED}}>· {flagged.length ? tf("{0} Personen mit hoher Belastung", flagged.length) : tf("keine Auffälligkeiten")}</span>
          <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Erkennt Muster, bevor jemand ausfällt oder kündigt – aus Dienstplan und Stempelzeiten der letzten 8 Wochen.")}</div></div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:10}}>
        {flagged.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Niemand fällt gerade auf.")}</div>}
        {flagged.map(p=><div key={p.user_id} style={{padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <b data-no-i18n="">{nameOf(p.user_id)}</b> <span style={{color:WARN}}>– {p.flags.map(f=>tf(WELL_FLAGS[f])).join(", ")}</span>
          <div style={{fontSize:12,color:INK_MUTED}}>{tf("{0} Nachtdienste · längste Serie {1} Tage · {2} Wochenenden · {3}× eingesprungen · {4} h in 4 Wochen", p.nights, p.max_streak, p.weekends_worked, p.jumped_in, fmtHours(p.hours_4w))}</div>
        </div>)}
        <div style={{fontSize:11.5,color:INK_MUTED,marginTop:6}}>{tf("Vorschlag: freie Wochenenden einplanen, Nachtdienste verteilen, Einspringen ausgleichen. Die Übersicht ist nur für die Leitung sichtbar.")}</div>
      </div>}
    </Card>
  );
}

// ------------------------------------------------------------ Mängel-Vorhersage (im Gerätebuch)
const RISK_REASON = {recent:"{0} Meldungen in 60 Tagen", rising:"häufiger als früher", overdue:"Prüfung überfällig seit {0}", old:"älter als 10 Jahre", warranty:"Garantie endet {0}"};
function AssetRiskCard({hotel, api}){
  const [list,setList] = useState(null);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/asset-risk").then(setList).catch(()=>setList([])); },[hotel.id]);
  if(!list || !list.length) return null;
  return (
    <Card style={{marginBottom:14,borderColor:WARN}}>
      <b><Icon n="alert" /> {tf("Auffällige Geräte")}</b>
      <div style={{fontSize:12.5,color:INK_MUTED,margin:"2px 0 8px"}}>{tf("Diese Geräte verhalten sich wie vor einem Ausfall: häufige Meldungen, überfällige Prüfung oder hohes Alter. Lieber jetzt warten lassen.")}</div>
      {list.map(a=><div key={a.asset_id} style={{display:"flex",gap:10,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,flexWrap:"wrap"}}>
        <b style={{minWidth:160}} data-no-i18n="">{a.name}{a.location ? " · "+a.location : ""}</b>
        <span style={{flex:1,color:WARN}}>{a.reasons.map(r=>tf(RISK_REASON[r.code], r.n!=null ? r.n : r.date ? fmtDate(r.date) : "")).join(" · ")}</span>
      </div>)}
    </Card>
  );
}

// ------------------------------------------------------------ Sprachbrücke: Chat-Nachricht vorlesen (übersetzter Text, Sprache der Oberfläche)
function SpeakMsg({text}){
  if(!canSpeak() || !text) return null;
  const go = () => { const s = window.speechSynthesis; s.cancel(); const u = new window.SpeechSynthesisUtterance(text); u.lang = SPEECH_LANG[UI_LANG] || "de-DE"; s.speak(u); };
  return <button onClick={go} aria-label={tf("Vorlesen")} title={tf("Vorlesen")} style={{...linkBtn,fontSize:10.5,padding:"0 0 0 6px"}}><Icon n="speaker" /></button>;
}
