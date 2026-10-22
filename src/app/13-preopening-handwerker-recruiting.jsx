// ------------------------------------------------------------ Kritischer Pfad (Aufgaben)
function CriticalPathCard({hotel, tasks}){
  const [open,setOpen] = useState(false);
  const [whatIf,setWhatIf] = useState({id:"", days:7});
  const linked = tasks.some(t=>(t.depends_on||[]).length);
  if(!linked) return <div className="no-print" style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}><Icon n="bulb" /> {tf("Tipp: Unter „Bearbeiten“ kannst du festlegen, wovon eine Aufgabe abhängt. Dann zeigt Ouverture den kritischen Pfad bis zur Eröffnung.")}</div>;
  const p = planTasks(tasks, hotel.opening_date);
  const byId = Object.fromEntries(tasks.map(t=>[t.id,t]));
  const crit = tasks.filter(t=>p.critical[t.id]).sort((a,b)=>(a.due_date||"")<(b.due_date||"")?-1:1);
  const impact = whatIf.id ? delayImpact(tasks, whatIf.id, Number(whatIf.days)||0, hotel.opening_date) : null;
  return (
    <Card className="no-print" style={{marginBottom:14,borderColor:p.conflicts.length?BAD:crit.length?WARN:BORDER}}>
      <div style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}} {...pressable(()=>setOpen(!open))} aria-expanded={open}>
        <div style={{fontWeight:700,flex:1}}><Icon n="route" /> {tf("Kritischer Pfad")}</div>
        {p.conflicts.length>0 && <Pill color={BAD} bg={BAD_SOFT}>{tf("{0} Konflikte", p.conflicts.length)}</Pill>}
        <Pill color={WARN} bg={WARN_SOFT}>{tf("{0} kritisch", crit.length)}</Pill>
        <span style={{color:INK_MUTED}}>{open?"▴":"▾"}</span>
      </div>
      {open && (
        <div style={{marginTop:10,fontSize:13.5}}>
          {p.conflicts.map((c,i)=><div key={i} style={{color:BAD,marginBottom:4}}><Icon n="alert" /> {tf("„{0}“ beginnt {1} Tage vor dem Ende von „{2}“.", byId[c.task].title, c.days, byId[c.pred].title)}</div>)}
          {crit.length>0 && <div style={{marginTop:6}}><div className="field-label">{tf("Ohne Puffer – jede Verspätung verschiebt die Kette")}</div>
            {crit.map(t=><div key={t.id} style={{padding:"3px 0"}} data-no-i18n="">{fmtDate(t.due_date)} · {t.title} <span style={{color:p.slack[t.id]<0?BAD:WARN}}>({p.slack[t.id]>0?"+":""}{p.slack[t.id]} {tf("Tage Puffer")})</span></div>)}</div>}
          <div style={{marginTop:10,background:PAPER,borderRadius:6,padding:"8px 10px"}}>
            <div className="field-label">{tf("Was wäre, wenn …")}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <select className="input" style={{flex:1,minWidth:180}} value={whatIf.id} onChange={e=>setWhatIf({...whatIf,id:e.target.value})}><option value="">{tf("Aufgabe wählen")}</option>{tasks.filter(t=>t.due_date && t.status!=="Abgeschlossen").map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
              <span>{tf("sich um")}</span><input className="input" type="number" style={{width:70}} value={whatIf.days} onChange={e=>setWhatIf({...whatIf,days:e.target.value})} /><span>{tf("Tage verschiebt?")}</span>
            </div>
            {impact && <div style={{marginTop:6}}>
              {impact.affected.length===0 ? <span style={{color:GOOD}}>✓ {tf("Keine andere Aufgabe ist betroffen.")}</span> : impact.affected.map(a=><div key={a.id} data-no-i18n="">→ {byId[a.id].title}: +{a.delay} {tf("Tage")} ({fmtDate(a.new_due)})</div>)}
              {impact.opening_delay>0 && <div style={{color:BAD,fontWeight:700,marginTop:4}}>{tf("Die Eröffnung wäre um {0} Tage gefährdet.", impact.opening_delay)}</div>}
            </div>}
          </div>
        </div>
      )}
    </Card>
  );
}
function DependsPicker({value, onChange, tasks, selfId}){
  const v = value || [];
  const opts = tasks.filter(t=>t.id!==selfId && !v.includes(t.id));
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      <span className="field-label" style={{margin:0}}>{tf("Hängt ab von")}</span>
      {v.map(id=>{ const t = tasks.find(x=>x.id===id); return <span key={id} style={{background:"#fff",border:`1px solid ${BORDER}`,borderRadius:999,padding:"2px 8px",fontSize:12}} data-no-i18n="">{t ? t.title : "?"} <button style={{...linkBtn,padding:0}} onClick={()=>onChange(v.filter(x=>x!==id))}>✕</button></span>; })}
      <select className="input" style={{width:"auto",maxWidth:240,padding:"4px 8px",fontSize:12.5}} value="" onChange={e=>e.target.value && onChange([...v, e.target.value])}><option value="">{tf("+ Vorgänger")}</option>{opts.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
    </div>
  );
}

// ------------------------------------------------------------ Handwerker (Baumängel)
function ContractorsCard({hotel, api}){
  const [list,setList] = useState(null);
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/contractors").then(setList).catch(()=>setList([])),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(list===null) return null;
  const run = async (fn, ok) => { setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const copy = (u) => { try { navigator.clipboard.writeText(u); setMsg({ok:true,text:tf("Link kopiert – per E-Mail oder WhatsApp an die Firma schicken.")}); } catch(e){} };
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
        <div style={{fontWeight:700,flex:1}}><Icon n="hammer" /> {tf("Handwerker und Firmen")}</div>
        {!form && <button style={smallBtn} onClick={()=>setForm({name:"", trade:"", email:""})}>{tf("+ Firma")}</button>}
      </div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Jede Firma bekommt einen eigenen Link ohne Anmeldung. Dort sieht sie nur ihre Mängel und meldet sie als behoben – ihr nehmt sie dann ab.")}</div>
      {form && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <input className="input" style={{flex:2,minWidth:160}} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tf("Firma, z. B. Elektro Huber")} />
          <input className="input" style={{flex:1,minWidth:120}} value={form.trade} onChange={e=>setForm({...form,trade:e.target.value})} placeholder={tf("Gewerk, z. B. Elektro")} />
          <button className="btn-primary" disabled={!form.name.trim()} onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/contractors","POST",form); setForm(null); })}>{tf("Anlegen")}</button>
          <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      )}
      {list.map(c=>(
        <div key={c.id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderTop:`1px solid ${BORDER}`,flexWrap:"wrap",fontSize:13.5}}>
          <b style={{flex:1,minWidth:140}} data-no-i18n="">{c.name}{c.trade ? <span style={{fontWeight:400,color:INK_MUTED}}> · {c.trade}</span> : ""}</b>
          <button style={smallBtn} onClick={()=>copy(c.url)}>{tf("Link kopieren")}</button>
          <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Neuen Link erzeugen? Der alte funktioniert dann nicht mehr."))) run(()=>api("/api/contractors/"+c.id+"/rotate","POST",{})); }}>{tf("Neuer Link")}</button>
          <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Firma entfernen?"))) run(()=>api("/api/contractors/"+c.id,"DELETE")); }}>✕</button>
        </div>
      ))}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:6}}>{msg.text}</div>}
    </Card>
  );
}

// ------------------------------------------------------------ Bestellliste (OS&E)
const PROC_STATUS = ["geplant","bestellt","geliefert","montiert"];
const PROC_STYLE = {geplant:{color:INK_MUTED,bg:PAPER}, bestellt:{color:"#2D5B87",bg:"#E3ECF5"}, geliefert:{color:GOOD,bg:GOOD_SOFT}, montiert:{color:GOOD,bg:GOOD_SOFT}};
function ProcurementView({hotel, api, role, myDepts}){
  const [list,setList] = useState(null);
  const [filter,setFilter] = useState("");
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/procurement").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return <div style={{color:INK_MUTED}}>…</div>;
  const today = todayIso(), opening = hotel.opening_date;
  const canEdit = (d) => canManageDept(d) || canManageDept("Einkauf");
  const shown = list.filter(i=>!filter || i.department===filter);
  const total = shown.reduce((s,i)=>s+(Number(i.unit_price)||0)*Number(i.quantity),0);
  const warn = (i) => i.status==="geplant" && i.order_by && i.order_by < today ? tf("Bestelltermin überschritten")
    : i.status!=="geliefert" && i.status!=="montiert" && opening && i.delivery_date && i.delivery_date > addDaysIso(opening,-7) ? tf("Lieferung zu knapp vor der Eröffnung")
    : i.status!=="geliefert" && i.status!=="montiert" && i.delivery_date && i.delivery_date < today ? tf("Lieferung überfällig") : null;
  const save = () => run(async()=>{ const {id, ...b} = form; if(id) await api("/api/procurement/"+id,"PATCH",b); else await api(base+"/procurement","POST",b); setForm(null); });
  const depts = [...new Set(list.map(i=>i.department))];
  return (
    <div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        <select className="input" style={{width:"auto"}} value={filter} onChange={e=>setFilter(e.target.value)}><option value="">{tf("Alle Abteilungen")}</option>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select>
        <span style={{flex:1,fontSize:13,color:INK_MUTED}}>{tf("{0} Positionen · Summe {1}", shown.length, fmtEur(total))}</span>
        {role!=="viewer" && role!=="member" && !form && <button className="btn-primary" onClick={()=>setForm({name:"", department:DEPARTMENTS.find(canEdit)||DEPARTMENTS[0], quantity:"1", unit:"Stück", supplier:"", unit_price:"", status:"geplant", order_by:"", delivery_date:"", note:""})}>{tf("+ Position")}</button>}
      </div>
      {form && (
        <Card style={{marginBottom:12,borderColor:BRASS}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label style={{flex:2,minWidth:180}}><div className="field-label">{tf("Artikel")}</div><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tf("z. B. Bettwäsche-Sets, Kaffeemaschinen, Uniformen")} /></label>
            <label><div className="field-label">{tf("Abteilung")}</div><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.filter(canEdit).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            <label><div className="field-label">{tf("Menge")}</div><input className="input" type="number" style={{width:90}} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></label>
            <label><div className="field-label">{tf("Einheit")}</div><input className="input" style={{width:80}} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} /></label>
            <label><div className="field-label">{tf("Stückpreis")} ({currencySymbol()})</div><input className="input" type="number" style={{width:100}} value={form.unit_price??""} onChange={e=>setForm({...form,unit_price:e.target.value})} /></label>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
            <label style={{flex:1,minWidth:150}}><div className="field-label">{tf("Lieferant")}</div><input className="input" value={form.supplier||""} onChange={e=>setForm({...form,supplier:e.target.value})} /></label>
            <label><div className="field-label">{tf("Bestellen bis")}</div><input className="input" type="date" value={form.order_by||""} onChange={e=>setForm({...form,order_by:e.target.value})} /></label>
            <label><div className="field-label">{tf("Lieferung")}</div><input className="input" type="date" value={form.delivery_date||""} onChange={e=>setForm({...form,delivery_date:e.target.value})} /></label>
            <label><div className="field-label">{tf("Status")}</div><select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{PROC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
            <button className="btn-primary" disabled={!form.name.trim()} onClick={save}>{tf("Speichern")}</button>
            <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          </div>
        </Card>
      )}
      <Card style={{padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:640}}>
          <tbody>
            {shown.length===0 && <tr><td style={{padding:16,color:INK_MUTED}}>{tf("Noch keine Positionen. Erfasse hier Ausstattung und Bestellungen bis zur Eröffnung – mit Bestell- und Liefertermin.")}</td></tr>}
            {shown.map(i=>{ const w = warn(i), st = PROC_STYLE[i.status]; return (
              <tr key={i.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={{padding:"9px 12px"}}><b data-no-i18n="">{i.name}</b><div style={{fontSize:11.5,color:INK_MUTED}}><span>{i.department}</span>{i.supplier ? <span data-no-i18n=""> · {i.supplier}</span> : ""}</div>{w && <div style={{fontSize:11.5,color:BAD,fontWeight:600}}><Icon n="alert" /> {w}</div>}</td>
                <td style={{padding:"9px 8px",whiteSpace:"nowrap"}} data-no-i18n="">{Number(i.quantity).toLocaleString(UI_LOCALE)} {i.unit}</td>
                <td style={{padding:"9px 8px",whiteSpace:"nowrap",textAlign:"end"}} data-no-i18n="">{i.unit_price!=null ? fmtEur(Number(i.unit_price)*Number(i.quantity)) : "–"}</td>
                <td style={{padding:"9px 8px",fontSize:12,color:INK_MUTED,whiteSpace:"nowrap"}} data-no-i18n="">{i.order_by ? <React.Fragment><Icon n="clock" /> {fmtDate(i.order_by)}</React.Fragment> : ""}{i.delivery_date ? <div><Icon n="truck" /> {fmtDate(i.delivery_date)}</div> : ""}</td>
                <td style={{padding:"9px 8px"}}>{canEdit(i.department) ? <select className="input" style={{width:"auto",padding:"4px 8px",fontSize:12.5,background:st.bg,color:st.color}} value={i.status} onChange={e=>run(()=>api("/api/procurement/"+i.id,"PATCH",{status:e.target.value}))}>{PROC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select> : <Pill color={st.color} bg={st.bg}>{i.status}</Pill>}</td>
                <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}>{canEdit(i.department) && <React.Fragment><button style={linkBtn} onClick={()=>setForm({...i, unit_price:i.unit_price??"", order_by:i.order_by||"", delivery_date:i.delivery_date||""})}>{tf("Bearbeiten")}</button><button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Position löschen?"))) run(()=>api("/api/procurement/"+i.id,"DELETE")); }}>✕</button></React.Fragment>}</td>
              </tr>); })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------ Recruiting und Personalkosten (Personal)
const STAGES = ["Eingegangen","Gespräch","Angebot","Zusage","Absage"];
const STAGE_STYLE = {Eingegangen:{color:INK_MUTED,bg:PAPER}, Gespräch:{color:"#2D5B87",bg:"#E3ECF5"}, Angebot:{color:WARN,bg:WARN_SOFT}, Zusage:{color:GOOD,bg:GOOD_SOFT}, Absage:{color:BAD,bg:BAD_SOFT}};
function CandidatesPanel({hotel, api, position, onChanged}){
  const [list,setList] = useState(null);
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/candidates").then(l=>setList(l.filter(c=>c.position_id===position.id))).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, hotel.id, position.id]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); if(onChanged) onChanged(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return <div style={{fontSize:12.5,color:INK_MUTED}}>…</div>;
  return (
    <div style={{background:PAPER,borderRadius:6,padding:"8px 10px"}}>
      {msg && <div style={{color:BAD,fontSize:12.5}}>{msg.text}</div>}
      {list.length===0 && !form && <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Noch keine Bewerbungen.")}</div>}
      {list.map(c=>(
        <div key={c.id} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",flexWrap:"wrap",fontSize:13}}>
          <b style={{flex:1,minWidth:120}} data-no-i18n="">{c.name}<span style={{fontWeight:400,color:INK_MUTED}}>{c.email ? " · "+c.email : ""}{c.phone ? " · "+c.phone : ""}</span></b>
          <select className="input" style={{width:"auto",padding:"3px 8px",fontSize:12.5,background:STAGE_STYLE[c.stage].bg,color:STAGE_STYLE[c.stage].color}} value={c.stage} onChange={e=>run(()=>api("/api/candidates/"+c.id,"PATCH",{stage:e.target.value}))}>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Bewerbung löschen?"))) run(()=>api("/api/candidates/"+c.id,"DELETE")); }}>✕</button>
        </div>
      ))}
      {form ? (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
          <input className="input" style={{flex:1,minWidth:120}} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tf("Name")} />
          <input className="input" style={{flex:1,minWidth:140}} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder={tf("E-Mail")} />
          <input className="input" style={{width:130}} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={tf("Telefon")} />
          <button className="btn-primary" style={{padding:"6px 12px"}} disabled={!form.name.trim()} onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/candidates","POST",{...form, position_id:position.id}); setForm(null); })}>{tf("Hinzufügen")}</button>
          <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
        </div>
      ) : <button style={{...linkBtn,paddingInlineStart:0,marginTop:4}} onClick={()=>setForm({name:"", email:"", phone:""})}>{tf("+ Bewerbung")}</button>}
    </div>
  );
}
function CostRampCard({hotel, positions}){
  const withCost = positions.filter(p=>Number(p.monthly_cost)>0);
  if(!withCost.length) return <div className="no-print" style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}><Icon n="bulb" /> {tf("Trage bei den Stellen die Monatskosten pro Person ein – dann zeigt Ouverture, wie die Personalkosten bis zur Eröffnung steigen.")}</div>;
  const opening = hotel.opening_date || todayIso();
  const months = []; for(let i=-6;i<=3;i++){ const d = new Date(opening.slice(0,7)+"-01T00:00:00Z"); d.setUTCMonth(d.getUTCMonth()+i); months.push(d.toISOString().slice(0,7)); }
  const costOf = (m) => withCost.reduce((s,p)=>{ const start = (p.start_date || opening).slice(0,7); return start<=m ? s + Number(p.monthly_cost)*Number(p.headcount) : s; },0);
  const vals = months.map(costOf); const max = Math.max(...vals,1);
  const sumBefore = months.filter(m=>m<opening.slice(0,7)).reduce((s,m)=>s+costOf(m),0);
  return (
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:10,alignItems:"baseline",flexWrap:"wrap",marginBottom:10}}>
        <div style={{fontWeight:700,flex:1}}><Icon n="trend" /> {tf("Personalkosten-Hochlauf")}</div>
        <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("bis zur Eröffnung: {0}", fmtEur(sumBefore))}</span>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"flex-end",height:130}}>
        {months.map((m,i)=>(
          <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{fontSize:10,color:INK_MUTED}} data-no-i18n="">{vals[i] ? Math.round(vals[i]/1000)+"k" : ""}</div>
            <div style={{width:"100%",height:Math.max(2,vals[i]/max*100),background:m===opening.slice(0,7)?BRASS:"#C9D6E3",borderRadius:"3px 3px 0 0"}} />
            <div style={{fontSize:10.5,color:m===opening.slice(0,7)?BRASS:INK_MUTED,fontWeight:m===opening.slice(0,7)?700:400}} data-no-i18n="">{new Date(m+"-15T00:00:00Z").toLocaleDateString(UI_LOCALE,{month:"short"})}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11.5,color:INK_MUTED,marginTop:6}}>{tf("Benötigte Personen × Monatskosten ab dem Startdatum der Stelle. Der hervorgehobene Monat ist die Eröffnung.")}</div>
    </Card>
  );
}

// ------------------------------------------------------------ Genehmigungen und Abnahmen
const PERMIT_STATUS = ["offen","beantragt","erteilt","abgelehnt"];
const PERMIT_STYLE = {offen:{color:WARN,bg:WARN_SOFT}, beantragt:{color:"#2D5B87",bg:"#E3ECF5"}, erteilt:{color:GOOD,bg:GOOD_SOFT}, abgelehnt:{color:BAD,bg:BAD_SOFT}};
const PERMIT_SUGGESTIONS = ["Betriebsanlagengenehmigung","Brandschutzabnahme","Lebensmittelrechtliche Registrierung","Aufzugsabnahme","Gewerbeanmeldung","Schankkonzession","Trinkwasser- und Legionellenprüfung","Elektro-Abnahme (E-Check)"];
function PermitsView({hotel, api, role}){
  const lead = role==="admin" || role==="manager";
  const [list,setList] = useState(null);
  const [form,setForm] = useState(null);
  const [msg,setMsg] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/permits").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const run = async (fn) => { setMsg(null); try { await fn(); await load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  if(list===null) return <div style={{color:INK_MUTED}}>…</div>;
  const today = todayIso();
  const flag = (p) => (p.status==="offen"||p.status==="beantragt") && p.due_date && p.due_date < today ? {t:tf("Frist überschritten"), c:BAD}
    : (p.status==="offen"||p.status==="beantragt") && p.due_date && p.due_date <= addDaysIso(today,14) ? {t:tf("Frist in {0} Tagen", Math.round((new Date(p.due_date)-new Date(today))/86400000)), c:WARN}
    : p.status==="erteilt" && p.valid_until && p.valid_until <= addDaysIso(today,30) ? {t:p.valid_until<today ? tf("abgelaufen") : tf("läuft bald ab"), c:p.valid_until<today?BAD:WARN} : null;
  const save = () => run(async()=>{ const {id, ...b} = form; if(id) await api("/api/permits/"+id,"PATCH",b); else await api(base+"/permits","POST",b); setForm(null); });
  const used = new Set(list.map(p=>p.title));
  return (
    <div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {lead && !form && <button className="btn-primary" style={{marginBottom:12}} onClick={()=>setForm({title:"", authority:"", status:"offen", due_date:"", valid_until:"", note:""})}>{tf("+ Genehmigung")}</button>}
      {lead && !form && <div style={{marginBottom:12}}>{PERMIT_SUGGESTIONS.filter(s=>!used.has(s)).map(s=><button key={s} onClick={()=>setForm({title:s, authority:"", status:"offen", due_date:"", valid_until:"", note:""})} style={{border:`1px solid ${BRASS}`,background:BRASS_SOFT,borderRadius:999,padding:"4px 11px",fontSize:12.5,cursor:"pointer",margin:"2px 4px 2px 0"}}>+ <span>{s}</span></button>)}</div>}
      {form && (
        <Card style={{marginBottom:12,borderColor:BRASS}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label style={{flex:2,minWidth:200}}><div className="field-label">{tf("Genehmigung / Abnahme")}</div><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></label>
            <label style={{flex:1,minWidth:150}}><div className="field-label">{tf("Behörde / Stelle")}</div><input className="input" value={form.authority||""} onChange={e=>setForm({...form,authority:e.target.value})} placeholder={tf("z. B. Bezirkshauptmannschaft")} /></label>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
            <label><div className="field-label">{tf("Status")}</div><select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{PERMIT_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
            <label><div className="field-label">{tf("Frist")}</div><input className="input" type="date" value={form.due_date||""} onChange={e=>setForm({...form,due_date:e.target.value})} /></label>
            <label><div className="field-label">{tf("Gültig bis")}</div><input className="input" type="date" value={form.valid_until||""} onChange={e=>setForm({...form,valid_until:e.target.value})} /></label>
            <label style={{flex:1,minWidth:150}}><div className="field-label">{tf("Notiz")}</div><input className="input" value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} /></label>
            <button className="btn-primary" disabled={!form.title.trim()} onClick={save}>{tf("Speichern")}</button>
            <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          </div>
        </Card>
      )}
      {list.length===0 && !form && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Genehmigungen erfasst. Ouverture erinnert Admins, wenn eine Frist näher rückt oder eine Genehmigung abläuft.")}</div></Card>}
      {list.map(p=>{ const f = flag(p), st = PERMIT_STYLE[p.status]; return (
        <Card key={p.id} style={{marginBottom:8,padding:"11px 14px",borderInlineStart:f?`4px solid ${f.c}`:undefined}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <Pill color={st.color} bg={st.bg}>{p.status}</Pill>
            <b style={{flex:1,minWidth:180}}><span>{p.title}</span>{p.authority ? <span style={{fontWeight:400,color:INK_MUTED}} data-no-i18n=""> · {p.authority}</span> : ""}</b>
            <span style={{fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{p.due_date ? <React.Fragment><Icon n="clock" /> {fmtDate(p.due_date)}</React.Fragment> : ""}{p.valid_until ? " · ✓ "+fmtDate(p.valid_until) : ""}</span>
            {f && <span style={{fontSize:12,fontWeight:700,color:f.c}}>{f.t}</span>}
            {lead && <button style={linkBtn} onClick={()=>setForm({...p, due_date:p.due_date||"", valid_until:p.valid_until||""})}>{tf("Bearbeiten")}</button>}
            {lead && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Genehmigung löschen?"))) run(()=>api("/api/permits/"+p.id,"DELETE")); }}>✕</button>}
          </div>
          {p.note && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:3}} data-no-i18n="">{p.note}</div>}
        </Card>); })}
    </div>
  );
}

// ------------------------------------------------------------ Gäste-Feedback
const FB_LABELS = {zimmer:"Zimmerqualität", sauberkeit:"Sauberkeit", service:"Service", fruehstueck:"Frühstück", checkin:"Check-in"};
// Welche Abteilung ist für welche Bewertung zuständig
const FB_DEPT = {zimmer:"Housekeeping", sauberkeit:"Housekeeping", service:"Food & Beverage", fruehstueck:"Food & Beverage", checkin:"Rezeption & Empfang"};
// Lob und Kritik je Abteilung, Monat für Monat (letzte 6 Monate) – aus den Gäste-Bewertungen
function FeedbackByDept({hotel, api}){
  const [rows,setRows] = useState(null);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/feedback?from="+addDaysIso(todayIso(),-183)).then(d=>{
    const months = []; const t = new Date(todayIso()+"T12:00:00Z"); t.setUTCDate(1);
    for(let i=5;i>=0;i--){ const m = new Date(t); m.setUTCMonth(t.getUTCMonth()-i); months.push(m.toISOString().slice(0,7)); }
    const depts = [...new Set(Object.values(FB_DEPT))];
    const acc = {}; depts.forEach(dp=>{ acc[dp] = {months:Object.fromEntries(months.map(m=>[m,{sum:0,n:0}])), praise:0, critique:0}; });
    (d.entries||[]).forEach(e=>{ const m = String(e.created_at).slice(0,7);
      Object.entries(e.ratings||{}).forEach(([k,v])=>{ const dp = FB_DEPT[k]; if(!dp || v==null) return;
        const a = acc[dp]; if(a.months[m]){ a.months[m].sum += Number(v); a.months[m].n++; }
        if(v>=4) a.praise++; else if(v<=2) a.critique++; }); });
    setRows({months, list: depts.map(dp=>({dept:dp, ...acc[dp]}))});
  }).catch(()=>setRows({months:[], list:[]})); },[hotel.id]);
  if(!rows || !rows.list.length) return null;
  const avg = (c) => c.n ? (c.sum/c.n) : null;
  const tone = (v) => v==null ? INK_MUTED : v>=4.2 ? GOOD : v>=3.5 ? INK : v>=2.8 ? WARN : BAD;
  return (
    <Card style={{marginBottom:14,overflowX:"auto"}}>
      <div style={{fontWeight:700,marginBottom:4}}>{tf("Je Abteilung")}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Durchschnitt der Gäste-Bewertungen (1–5) je Monat. Lob = 4–5 Sterne, Kritik = 1–2 Sterne.")}</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5,minWidth:560}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={{textAlign:"start",padding:6}}>{tf("Abteilung")}</th>
          {rows.months.map(m=><th key={m} style={{padding:6}}>{new Date(m+"-01T12:00:00Z").toLocaleDateString(UI_LOCALE,{month:"short"})}</th>)}
          <th style={{padding:6}}>{tf("Lob")}</th><th style={{padding:6}}>{tf("Kritik")}</th></tr></thead>
        <tbody>{rows.list.map(r=>(
          <tr key={r.dept} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:6,fontWeight:600}}>{translateString(r.dept)}</td>
            {rows.months.map(m=>{ const v = avg(r.months[m]); return <td key={m} style={{padding:6,textAlign:"center",fontWeight:600,color:tone(v)}} data-no-i18n="">{v==null ? "–" : v.toLocaleString(UI_LOCALE,{minimumFractionDigits:1,maximumFractionDigits:1})}</td>; })}
            <td style={{padding:6,textAlign:"center",color:GOOD}} data-no-i18n="">{r.praise}</td>
            <td style={{padding:6,textAlign:"center",color:r.critique?BAD:INK_MUTED}} data-no-i18n="">{r.critique}</td>
          </tr>))}</tbody>
      </table>
    </Card>
  );
}
function FeedbackView({hotel, api, me, role}){
  const [d,setD] = useState(null);
  const [link,setLink] = useState(null);
  const [days,setDays] = useState(30);
  const [msg,setMsg] = useState(null);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/feedback?from="+addDaysIso(todayIso(),-days)).then(setD).catch(e=>setMsg({ok:false,text:e.message})),[api, hotel.id, days]);
  useEffect(()=>{ load(); },[load]);
  const T = useTranslated(api, d ? d.entries.map(e=>e.comment||"") : []);
  const getLink = async (rotate) => { try { const r = window.OUVERTURE_DEMO ? {url:"feedback.html?demo=1"} : await api("/api/hotels/"+hotel.id+"/feedback-link","POST",{rotate:!!rotate}); setLink(r.url); return r.url; } catch(e){ setMsg({ok:false,text:e.message}); } };
  const stars = (v) => v==null ? "–" : "★".repeat(Math.round(v)) + "☆".repeat(5-Math.round(v));
  return (
    <div>
      {msg && <div style={{color:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      <Card style={{marginBottom:14}}>
        <div style={{fontWeight:700,marginBottom:4}}>{tf("Gäste bewerten per QR-Code")}</div>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Ideal im Probebetrieb und danach: Aufsteller an der Rezeption, Karte im Zimmer oder Link in der Abreise-Mail. Gäste bewerten Zimmer, Sauberkeit, Service, Frühstück und Check-in – in ihrer Sprache.")}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {(role==="admin"||role==="manager") && <button className="btn-primary" style={{padding:"7px 12px",fontSize:12.5}} onClick={async()=>{ const u = link || await getLink(); if(u) printQrCards([{label:hotel.name, url:u.startsWith("http")?u:location.origin+location.pathname.replace(/[^/]*$/,"")+u, text:"Wie war Ihr Aufenthalt? · How was your stay? · Com’è stato il soggiorno?"}], tf("Gäste-Feedback")); }}>{tf("QR-Aufsteller drucken")}</button>}
          {(role==="admin"||role==="manager") && <button style={smallBtn} onClick={()=>getLink()}>{tf("Link anzeigen")}</button>}
          {link && <a href={link} target="_blank" rel="noopener" style={{fontSize:12.5,wordBreak:"break-all"}} data-no-i18n="">{link}</a>}
        </div>
      </Card>
      <FeedbackByDept hotel={hotel} api={api} />
      <div style={{display:"flex",gap:6,marginBottom:12}}>{[[7,"Letzte 7 Tage"],[30,"Letzte 30 Tage"],[90,"Letzte 90 Tage"]].map(([n,l])=><button key={n} onClick={()=>setDays(n)} style={{border:`1px solid ${days===n?INK:BORDER}`,background:days===n?INK:"#fff",color:days===n?"#fff":INK,borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer"}}>{tf(l)}</button>)}</div>
      {!d ? <div style={{color:INK_MUTED}}>…</div> : (
        <React.Fragment>
          <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:14}}>
            {Object.keys(FB_LABELS).map(k=><Card key={k} style={{padding:"12px 14px"}}><div style={{fontSize:12,color:INK_MUTED}}>{FB_LABELS[k]}</div><div style={{fontSize:22,fontWeight:700}} data-no-i18n="">{d.averages[k]!=null ? d.averages[k].toLocaleString(UI_LOCALE) : "–"}</div><div style={{color:"#E0A93B",letterSpacing:1}} data-no-i18n="">{stars(d.averages[k])}</div></Card>)}
          </div>
          <div style={{display:"flex",alignItems:"center",marginBottom:8}}><b style={{flex:1}}>{tf("{0} Bewertungen", d.count)}</b><TranslateToggle t={T} /></div>
          {d.entries.length===0 && <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Bewertungen in diesem Zeitraum.")}</div></Card>}
          {d.entries.map(e=>(
            <Card key={e.id} style={{marginBottom:8,padding:"10px 14px"}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{fmtDateTime(e.created_at)}{e.room ? " · "+roomLocation(e.room) : ""}{e.lang ? " · "+e.lang.toUpperCase() : ""}
                <span style={{flex:1}}></span>{Object.entries(e.ratings||{}).map(([k,v])=><span key={k}><span>{FB_LABELS[k]||k}</span> <b style={{color:v<=2?BAD:v>=4?GOOD:INK}}>{v}</b></span>)}</div>
              {e.comment && <div style={{fontSize:14,marginTop:4,whiteSpace:"pre-wrap"}}><TrText text={e.comment} tr={T.tr} /></div>}
            </Card>
          ))}
        </React.Fragment>
      )}
    </div>
  );
}

