function MilestonesView({milestones, callHotel, callId, refresh}){
  const [draft,setDraft]=useState({title:"",date:"",criticality:"Hoch"});
  const [editId,setEditId]=useState(null); const [edit,setEdit]=useState(null);
  const [error,setError]=useState("");
  const run = async (fn) => { setError(""); try { await fn(); refresh(); } catch(e){ setError(e.message); } };
  const add = () => { if(!draft.title||!draft.date) return; run(async()=>{ await callHotel("/milestones","POST",draft); setDraft({title:"",date:"",criticality:"Hoch"}); }); };
  const updateStatus = (id,status) => run(()=>callId("milestones",id,"PATCH",{status}));
  const [origDate,setOrigDate]=useState("");
  const startEdit = (m) => { setEditId(m.id); setOrigDate(m.date); setEdit({title:m.title,date:m.date,criticality:m.criticality}); };
  const saveEdit = () => { if(!edit.title||!edit.date) return; const body={...edit}; if(body.date===origDate) delete body.date; run(async()=>{ await callId("milestones",editId,"PATCH",body); setEditId(null); }); };
  const remove = (m) => { if(confirmDelete(tf("Meilenstein „{0}“", m.title))) run(()=>callId("milestones",m.id,"DELETE")); };
  return (
    <div>
      <Card style={{marginBottom:16}}>
        <div className="stack" style={{display:"flex",gap:10}}>
          <input className="input" placeholder="Titel" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} />
          <input type="date" className="input" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})} />
          <select className="input" value={draft.criticality} onChange={e=>setDraft({...draft,criticality:e.target.value})}><option>Kritisch</option><option>Hoch</option><option>Mittel</option></select>
          <button className="btn-primary" onClick={add}>+</button>
        </div>
      </Card>
      {error && <ErrorText style={{marginBottom:12}}>{error}</ErrorText>}
      {[...milestones].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(m=> editId===m.id ? (
        <Card key={m.id} style={{marginBottom:10,background:PAPER}}>
          <div className="stack" style={{display:"flex",gap:10,alignItems:"center"}}>
            <input className="input" value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} />
            <input type="date" className="input" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})} />
            <select className="input" value={edit.criticality} onChange={e=>setEdit({...edit,criticality:e.target.value})}><option>Kritisch</option><option>Hoch</option><option>Mittel</option></select>
            <button className="btn-primary" onClick={saveEdit}>Speichern</button>
            <button style={linkBtn} onClick={()=>setEditId(null)}>Abbrechen</button>
          </div>
        </Card>
      ) : (
        <Card key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:10,flexWrap:"wrap"}}>
          <div><div style={{fontWeight:600}}>{m.title}</div><div style={{fontSize:12.5,color:INK_MUTED}}>{fmtDate(m.date)} · {m.criticality}{offsetLabel(m.opening_offset_days)}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <select value={m.status} onChange={e=>updateStatus(m.id,e.target.value)} className="input" aria-label={tf("Status von „{0}“", m.title)} style={{width:"auto",padding:"6px 9px",fontSize:12.5}}>{MILESTONE_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            <button style={linkBtn} onClick={()=>startEdit(m)}>Bearbeiten</button>
            <button style={linkBtn} onClick={()=>remove(m)} title="Löschen">✕</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RiskFields({value, onChange}){
  return (
    <React.Fragment>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
        <input className="input" placeholder="Titel" value={value.title} onChange={e=>onChange({...value,title:e.target.value})} />
        <select className="input" value={value.department} onChange={e=>onChange({...value,department:e.target.value})}>{deptOptions(value.department).map(d=><option key={d}>{d}</option>)}</select>
      </div>
      <input className="input" placeholder="Gegenmaßnahme (optional)" value={value.mitigation||""} onChange={e=>onChange({...value,mitigation:e.target.value})} style={{marginBottom:10}} />
      <div className="stack" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12.5}}>{tf("Wahrscheinlichkeit: {0}", value.probability)}</span>
        <input type="range" min="1" max="5" value={value.probability} onChange={e=>onChange({...value,probability:Number(e.target.value)})} />
        <span style={{fontSize:12.5}}>{tf("Auswirkung: {0}", value.impact)}</span>
        <input type="range" min="1" max="5" value={value.impact} onChange={e=>onChange({...value,impact:Number(e.target.value)})} />
      </div>
    </React.Fragment>
  );
}

function RisksView({risks, callHotel, callId, refresh}){
  const [draft,setDraft]=useState({title:"",department:(editableDepts()[0]||DEPARTMENTS[0]),probability:3,impact:3,mitigation:""});
  const [editId,setEditId]=useState(null); const [edit,setEdit]=useState(null);
  const [error,setError]=useState("");
  const run = async (fn) => { setError(""); try { await fn(); refresh(); } catch(e){ setError(e.message); } };
  const add = () => { if(!draft.title) return; run(async()=>{ await callHotel("/risks","POST",draft); setDraft({...draft,title:"",mitigation:""}); }); };
  const startEdit = (r) => { setEditId(r.id); setEdit({title:r.title,department:r.department,probability:r.probability,impact:r.impact,mitigation:r.mitigation||""}); };
  const saveEdit = () => { if(!edit.title) return; run(async()=>{ await callId("risks",editId,"PATCH",edit); setEditId(null); }); };
  const remove = (r) => { if(confirmDelete(tf("Risiko „{0}“", r.title))) run(()=>callId("risks",r.id,"DELETE")); };
  return (
    <div>
      <Card style={{marginBottom:16}}>
        <RiskFields value={draft} onChange={setDraft} />
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><button className="btn-primary" onClick={add}>+ Risiko</button></div>
      </Card>
      {error && <ErrorText style={{marginBottom:12}}>{error}</ErrorText>}
      {[...risks].sort((a,b)=>b.probability*b.impact - a.probability*a.impact).map(r=> editId===r.id ? (
        <Card key={r.id} style={{marginBottom:10,background:PAPER}}>
          <RiskFields value={edit} onChange={setEdit} />
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
            <button style={linkBtn} onClick={()=>setEditId(null)}>Abbrechen</button>
            <button className="btn-primary" onClick={saveEdit}>Speichern</button>
          </div>
        </Card>
      ) : (
        <Card key={r.id} style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div>
            <div style={{fontWeight:600}}>{r.title} <Pill color={BAD} bg={BAD_SOFT}>{r.probability*r.impact}</Pill></div>
            <div style={{fontSize:12.5,color:INK_MUTED}}>{r.department} · W {r.probability} × A {r.impact}</div>
            {r.mitigation && <div style={{fontSize:12.5,marginTop:4}}>{tf("Maßnahme: {0}", r.mitigation)}</div>}
          </div>
          <div style={{whiteSpace:"nowrap"}}>
            <button style={linkBtn} onClick={()=>startEdit(r)}>Bearbeiten</button>
            <button style={linkBtn} onClick={()=>remove(r)} title="Löschen">✕</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function HotelEditForm({hotel, api, onSaved, onCancel}){
  const [form,setForm]=useState({name:hotel.name||"",city:hotel.city||"",country:hotel.country||"",rooms:hotel.rooms||"",opening_date:hotel.opening_date||"",currency:hotel.currency||"EUR",
    brand_color:hotel.brand_color||"", logo_data:hotel.logo_data||"", holiday_region:hotel.holiday_region||"", disabled_modules:hotel.disabled_modules||[], weekly_report:!!hotel.weekly_report, phase:hotel.phase});
  const [testMsg,setTestMsg] = useState(null);
  // Logo verkleinern (max. 320 px) und als Bild-Text speichern
  const pickLogo = (file) => {
    if(!file) return;
    if(!/^image\//.test(file.type)){ setError(tf("Bitte eine Bilddatei wählen.")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if(file.type==="image/svg+xml"){ if(String(reader.result).length>270000) return setError(tf("Das Logo ist zu groß.")); return setForm(f=>({...f, logo_data:reader.result})); }
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 320/Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/png");
        if(data.length>270000) return setError(tf("Das Logo ist zu groß."));
        setForm(f=>({...f, logo_data:data}));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  const [error,setError]=useState(""); const [saving,setSaving]=useState(false);
  const save = async () => {
    if(!form.name) return;
    setSaving(true); setError("");
    try { onSaved(await api("/api/hotels/"+hotel.id,"PATCH",{...form, rooms: form.rooms==="" ? "" : Number(form.rooms), brand_color: form.brand_color || null, logo_data: form.logo_data || null, holiday_region: form.holiday_region || null})); }
    catch(e){ setError(e.message); }
    setSaving(false);
  };
  return (
    <Card style={{marginBottom:18}}>
      <h2 className="ui-h" style={{fontWeight:700,marginBottom:10}}>Hotel bearbeiten</h2>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
        <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input className="input" placeholder="Stadt" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} />
        <input className="input" placeholder="Land" value={form.country} onChange={e=>setForm({...form,country:e.target.value})} />
      </div>
      <div className="stack" style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <label style={{flex:1}}><div className="field-label">Zimmeranzahl</div><input type="number" className="input" value={form.rooms} onChange={e=>setForm({...form,rooms:e.target.value})} /></label>
        <label style={{flex:1}}><div className="field-label">Eröffnungsdatum</div><input type="date" className="input" value={form.opening_date} onChange={e=>setForm({...form,opening_date:e.target.value})} /></label>
        <label style={{flex:1}}><div className="field-label">Währung</div><CurrencySelect value={form.currency} onChange={v=>setForm({...form,currency:v})} /></label>
        <label style={{flex:1}}><div className="field-label">{tf("Feiertage")}</div>
          <select className="input" value={form.holiday_region} onChange={e=>setForm({...form,holiday_region:e.target.value})}>
            <option value="">{tf("Keine")}</option>
            {HOLIDAY_REGIONS.map(c=>[c, holidayRegionLabel(c, UI_LOCALE)]).sort((a,b)=>a[1].localeCompare(b[1])).map(([c,l])=><option key={c} value={c}>{l}</option>)}
          </select></label>
      </div>
      {hotel.phase!==undefined && (
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}}>
          <div style={{fontWeight:700,marginBottom:4}}>{tf("Phase des Hotels")}</div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("In Eröffnung: Aufgaben, Meilensteine, Budget und Personalplanung stehen im Mittelpunkt. Im Betrieb: Dienstplan, Zimmer, Meldungen und Kennzahlen – die Eröffnungsplanung wird ausgeblendet, bleibt aber gespeichert.")}</div>
          <div role="radiogroup" aria-label={tf("Phase des Hotels")} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["opening", tf("In Eröffnung")], ["operations", tf("Im Betrieb")]].map(([k,l])=>(
              <button key={k} type="button" role="radio" aria-checked={form.phase===k} onClick={()=>setForm({...form,phase:k})}
                style={{border:`1px solid ${form.phase===k?INK:BORDER}`,background:form.phase===k?INK:"#fff",color:form.phase===k?"#fff":INK,borderRadius:999,padding:"8px 16px",fontSize:13.5,fontWeight:600,cursor:"pointer",minHeight:40}}>{l}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}}>
        <div style={{fontWeight:700,marginBottom:4}}>{tf("Bereiche im Menü")}</div>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Blende aus, was dieses Hotel nicht braucht – zum Beispiel alles rund um die Eröffnung, sobald das Haus läuft. Daten bleiben erhalten und lassen sich jederzeit wieder einblenden.")}</div>
        <ModulePicker value={form.disabled_modules} onChange={v=>setForm({...form,disabled_modules:v})} />
      </div>
      <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,cursor:"pointer"}}><input type="checkbox" checked={form.weekly_report} onChange={e=>setForm({...form,weekly_report:e.target.checked})} /> <b>{tf("Wochenbericht jeden Montag per E-Mail")}</b></label>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 0 26px"}}>{tf("An Admins und Eigentümer: Bereitschaft, überfällige Aufgaben, Risiken, KI-Zusammenfassung – nach der Eröffnung Stunden, Meldungen und Gäste-Bewertung.")}
          {!window.OUVERTURE_DEMO && <button type="button" style={{...linkBtn,marginInlineStart:6}} onClick={()=>api("/api/hotels/"+hotel.id+"/weekly-report/test","POST",{}).then(r=>setTestMsg(r.sent ? tf("Test an dich gesendet.") : tf("Konnte nicht gesendet werden."))).catch(e=>setTestMsg(e.message))}>{tf("Test an mich senden")}</button>}
          {testMsg && <span style={{marginInlineStart:6,color:INK}}>{testMsg}</span>}</div>
      </div>
      {ACCESS.role==="admin" && !hotel.is_demo && <div style={{marginTop:12}}><OwnerLinkCard hotel={hotel} api={api} /></div>}
      {ACCESS.role==="admin" && !hotel.is_demo && <InvestorViewCard hotel={hotel} api={api} />}
      <div className="stack" style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}}>
        <div>
          <div className="field-label">{tf("Logo")}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:56,height:56,border:`1px solid ${BORDER}`,borderRadius:6,display:"grid",placeItems:"center",background:"#fff",overflow:"hidden"}}>
              {form.logo_data ? <img src={form.logo_data} alt="" style={{maxWidth:"100%",maxHeight:"100%"}} /> : <Logo size={26} color={BRASS} />}
            </div>
            <label style={{...linkBtn,border:`1px solid ${BORDER}`,borderRadius:4,padding:"6px 10px",cursor:"pointer"}}>
              {tf("Logo hochladen")}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{display:"none"}} onChange={e=>pickLogo(e.target.files[0])} />
            </label>
            {form.logo_data && <button style={{...linkBtn,color:BAD}} onClick={()=>setForm({...form,logo_data:""})}>{tf("Entfernen")}</button>}
          </div>
        </div>
        <div>
          <div className="field-label">{tf("Markenfarbe")}</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="color" value={form.brand_color || "#C9A66B"} onChange={e=>setForm({...form,brand_color:e.target.value})} style={{width:44,height:34,border:`1px solid ${BORDER}`,borderRadius:4,padding:2,background:"#fff"}} />
            {form.brand_color && <button style={linkBtn} onClick={()=>setForm({...form,brand_color:""})}>{tf("Standard")}</button>}
          </div>
        </div>
        <div style={{fontSize:12,color:INK_MUTED,flex:"1 1 220px"}}>{tf("Logo und Farbe erscheinen in der Seitenleiste, im Statusbericht und auf geteilten Dienstplan-Bildern.")}</div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:12}}>
        <button style={linkBtn} onClick={onCancel}>Abbrechen</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving?"Speichert…":"Speichern"}</button>
      </div>
      {error && <ErrorText style={{marginTop:10}}>{error}</ErrorText>}
    </Card>
  );
}

const BUDGET_CATEGORIES = ["Ausstattung","Personal & Schulung","Marketing","IT & Technik","Bau & Instandhaltung","Vorräte","Dienstleister","Sonstiges"];
// Währungen, die ein Hotel haben kann (muss zu migrations/012 passen)
// Budget-Währungen je Hotel (wie CURRENCIES im Backend / migrations/014)
const CURRENCY_CODES = ["EUR","CHF","GBP","USD","CAD","AUD","NZD","JPY","CNY","HKD","SGD","KRW","INR","THB","MYR","IDR",
  "AED","SAR","QAR","KWD","BHD","OMR","EGP","MAD","TRY","BRL","MXN","ZAR","SEK","NOK","DKK","PLN","CZK","HUF","RON"];
// Name der Währung in der Sprache der Oberfläche (vom Browser, z. B. "日本円" oder "Japanese Yen")
function currencyName(c){ try { return new Intl.DisplayNames([UI_LOCALE], {type:"currency"}).of(c) || c; } catch(e){ return c; } }
const CURRENCIES = CURRENCY_CODES.map(c=>[c, currencyName(c)+" ("+c+")"]);
let HOTEL_CURRENCY = "EUR";
// Eigene Anzeigewährung (null = Währung des Hotels) und Tageskurse (Basis EUR, vom Backend)
const LS_DISPLAY_CURRENCY = "hpoos_display_currency";
let DISPLAY_CURRENCY = (() => { try { return window.localStorage.getItem(LS_DISPLAY_CURRENCY) || null; } catch(e){ return null; } })();
let FX = null;
function setDisplayCurrency(c){ DISPLAY_CURRENCY = c || null; try { if(c) window.localStorage.setItem(LS_DISPLAY_CURRENCY, c); else window.localStorage.removeItem(LS_DISPLAY_CURRENCY); } catch(e){} }
// Betrag aus der Hotelwährung in die Anzeigewährung umrechnen
function convertAmount(n){
  const from = HOTEL_CURRENCY, to = DISPLAY_CURRENCY;
  if(!to || to===from || !FX || !FX.rates || !FX.rates[from] || !FX.rates[to]) return {value:n, currency:from, converted:false};
  return {value: n / FX.rates[from] * FX.rates[to], currency: to, converted: true};
}
function isConverting(){ return convertAmount(1).converted; }
// Beträge des geöffneten Hotels – in der eigenen Anzeigewährung, falls gewählt
function fmtEur(n){ const x = convertAmount(Number(n||0)); return x.value.toLocaleString(UI_LOCALE,{style:"currency",currency:x.currency,maximumFractionDigits:0}); }
function currencySymbol(){ try { return (0).toLocaleString(UI_LOCALE,{style:"currency",currency:HOTEL_CURRENCY,maximumFractionDigits:0}).replace(/[\d\s.,]/g,"") || HOTEL_CURRENCY; } catch(e){ return HOTEL_CURRENCY; } }
function CurrencySelect({value, onChange}){
  return <select className="input" value={value||"EUR"} onChange={e=>onChange(e.target.value)} data-no-i18n="">{CURRENCIES.map(([c,l])=><option key={c} value={c}>{l}</option>)}</select>;
}
function sumBy(items, key, field){
  const out = {};
  items.forEach(i=>{ const k=i[key]; out[k]=(out[k]||0)+Number(i[field]||0); });
  return out;
}
function StatTile({label, value, sub, color}){
  return (
    <Card style={{flex:1,minWidth:150}}>
      <div style={{fontSize:12,color:INK_MUTED,fontWeight:600,marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"Fraunces, serif",fontSize:24,fontWeight:600,color:color||INK}}>{value}</div>
      {sub && <div style={{fontSize:12,color:INK_MUTED,marginTop:2}}>{sub}</div>}
    </Card>
  );
}
function Bar({pct, color}){
  return (
    <div style={{flex:1,height:6,background:PAPER,borderRadius:4,overflow:"hidden"}}>
      <div style={{width:Math.max(0,Math.min(100,pct))+"%",height:"100%",background:color}}></div>
    </div>
  );
}

function BudgetFields({value, onChange}){
  return (
    <React.Fragment>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
        <input className="input" placeholder="Posten, z. B. Matratzen" value={value.title} onChange={e=>onChange({...value,title:e.target.value})} />
        <select className="input" value={value.department} onChange={e=>onChange({...value,department:e.target.value})}>{deptOptions(value.department).map(d=><option key={d}>{d}</option>)}</select>
        <select className="input" value={value.category} onChange={e=>onChange({...value,category:e.target.value})}>{BUDGET_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
      </div>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 2fr",gap:10}}>
        <label><div className="field-label">{"Plan ("+currencySymbol()+")"}</div><input type="number" min="0" className="input" value={value.planned} onChange={e=>onChange({...value,planned:e.target.value})} /></label>
        <label><div className="field-label">{"Ist ("+currencySymbol()+")"}</div><input type="number" min="0" className="input" value={value.actual} onChange={e=>onChange({...value,actual:e.target.value})} /></label>
        <label title={tf("Bereits bestellt oder beauftragt, aber noch nicht bezahlt")}><div className="field-label">{tf("Beauftragt")+" ("+currencySymbol()+")"}</div><input type="number" min="0" className="input" value={value.committed??""} onChange={e=>onChange({...value,committed:e.target.value})} /></label>
        <label><div className="field-label">Notiz</div><input className="input" value={value.note||""} onChange={e=>onChange({...value,note:e.target.value})} /></label>
      </div>
    </React.Fragment>
  );
}

function ConversionNote(){
  if(!isConverting()) return null;
  return <div className="no-print" style={{fontSize:12.5,color:INK_MUTED,margin:"-4px 0 12px"}}>
    {tf("Beträge umgerechnet von {0} in {1} (Tageskurs{2}). Eingaben bleiben in {0}.", HOTEL_CURRENCY, DISPLAY_CURRENCY, FX && FX.date ? " " + fmtDate(FX.date) : "")}
  </div>;
}

function BudgetView({items, callHotel, callId, refresh, hotel}){
  const empty = {title:"",department:(editableDepts()[0]||DEPARTMENTS[0]),category:BUDGET_CATEGORIES[0],planned:"",actual:"",committed:"",note:""};
  const [showForm,setShowForm]=useState(false);
  const [draft,setDraft]=useState(empty);
  const [editId,setEditId]=useState(null); const [edit,setEdit]=useState(null);
  const [error,setError]=useState("");
  const run = async (fn) => { setError(""); try { await fn(); refresh(); } catch(e){ setError(e.message); } };
  const toBody = (v) => ({...v, planned:Number(v.planned||0), actual:Number(v.actual||0), committed:Number(v.committed||0)});
  const add = () => { if(!draft.title) return; run(async()=>{ await callHotel("/budget","POST",toBody(draft)); setDraft({...empty,department:draft.department,category:draft.category}); setShowForm(false); }); };
  const startEdit = (b) => { setEditId(b.id); setEdit({title:b.title,department:b.department,category:b.category,planned:b.planned,actual:b.actual,committed:b.committed||"",note:b.note||""}); };
  const saveEdit = () => { if(!edit.title) return; run(async()=>{ await callId("budget",editId,"PATCH",toBody(edit)); setEditId(null); }); };
  const remove = (b) => { if(confirmDelete(tf("Budgetposten „{0}“", b.title))) run(()=>callId("budget",b.id,"DELETE")); };

  const planned = items.reduce((s,i)=>s+Number(i.planned||0),0);
  const actual = items.reduce((s,i)=>s+Number(i.actual||0),0);
  const committed = items.reduce((s,i)=>s+Number(i.committed||0),0);
  const diff = planned - actual - committed;
  const over = items.filter(i=>Number(i.planned||0)>0 && Number(i.actual||0)+Number(i.committed||0)>Number(i.planned||0));
  const plannedByDept = sumBy(items,"department","planned");
  const actualByDept = sumBy(items,"department","actual");
  const depts = Object.keys(plannedByDept).sort();

  return (
    <div>
      <div className="stack" style={{display:"flex",gap:14,marginBottom:18}}>
        <StatTile label="PLAN" value={fmtEur(planned)} sub={tf("{0} Posten", items.length)} />
        <StatTile label="IST" value={fmtEur(actual)} sub={planned>0 ? tf("{0} % vom Plan", Math.round(actual/planned*100)) : "—"} />
        <StatTile label="BEAUFTRAGT" value={fmtEur(committed)} sub={tf("Prognose {0}", fmtEur(actual+committed))} color={actual+committed>planned && planned>0 ? WARN : undefined} />
        <StatTile label={diff>=0 ? "NOCH VERFÜGBAR" : "ÜBERSCHRITTEN"} value={fmtEur(Math.abs(diff))} color={diff>=0?GOOD:BAD} />
      </div>

      {depts.length>0 && (
        <Card style={{marginBottom:18}}>
          <h2 className="ui-h" style={{fontWeight:700,marginBottom:8}}>Ist vs. Plan je Abteilung</h2>
          {depts.map(d=>{
            const p=plannedByDept[d], a=actualByDept[d]||0, pct = p>0 ? a/p*100 : (a>0?100:0);
            return (
              <div key={d} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0"}}>
                <div className="dept-label" style={{width:150,fontSize:13}}>{d}</div>
                <Bar pct={pct} color={pct>100?BAD:pct>90?WARN:GOOD} />
                <div style={{width:150,textAlign:"right",fontSize:12.5,color:INK_MUTED}}>{fmtEur(a)} / {fmtEur(p)}</div>
              </div>
            );
          })}
        </Card>
      )}

      {over.length>0 && <Card style={{marginBottom:14,borderColor:BAD,background:BAD_SOFT,fontSize:13}}><b><Icon n="alert" /> {tf("Über dem Plan (Ist + beauftragt):")}</b> <span data-no-i18n="">{over.map(i=>i.title+" ("+fmtEur(Number(i.actual||0)+Number(i.committed||0)-Number(i.planned||0))+")").join(", ")}</span></Card>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {items.length>0 && hotel && <button style={smallBtn} onClick={()=>sheetPdf(budgetSheetHtml(hotel, items), safeFile(translateString("Budget")+" "+hotel.name+" "+todayIso())+".pdf").catch(e=>setError(e.message))}><Icon n="filetext" /> PDF</button>}
        {items.length>0 && hotel && <button style={smallBtn} onClick={()=>budgetXlsx(hotel, items).catch(e=>setError(e.message))}>Excel</button>}
        <button className="btn-primary" onClick={()=>setShowForm(!showForm)}>+ Budgetposten</button>
      </div>
      {error && <ErrorText style={{marginBottom:12}}>{error}</ErrorText>}
      {showForm && (
        <Card style={{marginBottom:16}}>
          <BudgetFields value={draft} onChange={setDraft} />
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
            <button style={linkBtn} onClick={()=>setShowForm(false)}>Abbrechen</button>
            <button className="btn-primary" onClick={add}>Speichern</button>
          </div>
        </Card>
      )}
      <Card style={{padding:0}}>
        <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
          {items.length===0 && <tr><td style={{padding:16,color:INK_MUTED}}>Noch keine Budgetposten.</td></tr>}
          {items.map(b=> editId===b.id ? (
            <tr key={b.id} style={{borderTop:`1px solid ${BORDER}`,background:PAPER}}>
              <td colSpan={4} style={{padding:12}}>
                <BudgetFields value={edit} onChange={setEdit} />
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
                  <button style={linkBtn} onClick={()=>setEditId(null)}>Abbrechen</button>
                  <button className="btn-primary" onClick={saveEdit}>Speichern</button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={b.id} style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:12}}>{b.title}<div style={{fontSize:11.5,color:INK_MUTED}}>{b.department} · {b.category}{b.note ? " · "+b.note : ""}</div></td>
              <td style={{padding:12,whiteSpace:"nowrap"}}><span style={{color:INK_MUTED,fontSize:12}}>Plan </span>{fmtEur(b.planned)}</td>
              <td style={{padding:12,whiteSpace:"nowrap",color:Number(b.actual)+Number(b.committed||0)>Number(b.planned)?BAD:INK}}><span style={{color:INK_MUTED,fontSize:12}}>Ist </span>{fmtEur(b.actual)}{Number(b.committed||0)>0 && <div style={{fontSize:11.5,color:INK_MUTED}}>{tf("+ {0} beauftragt", fmtEur(b.committed))}</div>}</td>
              <td style={{padding:12,whiteSpace:"nowrap"}}>
                <button style={linkBtn} onClick={()=>startEdit(b)}>Bearbeiten</button>
                <button style={linkBtn} onClick={()=>remove(b)} title="Löschen">✕</button>
              </td>
            </tr>
          ))}
        </tbody></table>
      </Card>
    </div>
  );
}

function StaffFields({value, onChange}){
  return (
    <div className="stack" style={{display:"grid",gridTemplateColumns:"2fr 1.3fr 0.7fr 0.7fr 1fr 1fr",gap:10}}>
      <label><div className="field-label">Stelle</div><input className="input" placeholder="z. B. Rezeptionist/in" value={value.title} onChange={e=>onChange({...value,title:e.target.value})} /></label>
      <label><div className="field-label">Abteilung</div><select className="input" value={value.department} onChange={e=>onChange({...value,department:e.target.value})}>{deptOptions(value.department).map(d=><option key={d}>{d}</option>)}</select></label>
      <label><div className="field-label">Benötigt</div><input type="number" min="1" className="input" value={value.headcount} onChange={e=>onChange({...value,headcount:e.target.value})} /></label>
      <label><div className="field-label">Besetzt</div><input type="number" min="0" className="input" value={value.filled} onChange={e=>onChange({...value,filled:e.target.value})} /></label>
      <label><div className="field-label">Start</div><input type="date" className="input" value={value.start_date||""} onChange={e=>onChange({...value,start_date:e.target.value})} /></label>
      <label><div className="field-label">{tf("Kosten/Monat je Person")}</div><input type="number" min="0" className="input" value={value.monthly_cost??""} onChange={e=>onChange({...value,monthly_cost:e.target.value})} /></label>
    </div>
  );
}

function StaffView({positions, callHotel, callId, refresh, hotel, api}){
  const [cands,setCands] = useState(null);
  const empty = {title:"",department:(editableDepts()[0]||DEPARTMENTS[0]),headcount:1,filled:0,start_date:""};
  const [showForm,setShowForm]=useState(false);
  const [draft,setDraft]=useState(empty);
  const [editId,setEditId]=useState(null); const [edit,setEdit]=useState(null);
  const [error,setError]=useState("");
  const run = async (fn) => { setError(""); try { await fn(); refresh(); } catch(e){ setError(e.message); } };
  const check = (v) => {
    const h=Number(v.headcount), f=Number(v.filled);
    if(!v.title) return "Bitte eine Stellenbezeichnung eingeben.";
    if(!(h>=1)) return "„Benötigt“ muss mindestens 1 sein.";
    if(f<0 || f>h) return "„Besetzt“ muss zwischen 0 und „Benötigt“ liegen.";
    return "";
  };
  const toBody = (v) => ({...v, headcount:Number(v.headcount), filled:Number(v.filled), monthly_cost: v.monthly_cost===""||v.monthly_cost==null ? null : Number(v.monthly_cost)});
  const add = () => { const m=check(draft); if(m) return setError(m); run(async()=>{ await callHotel("/staff","POST",toBody(draft)); setDraft({...empty,department:draft.department}); setShowForm(false); }); };
  const startEdit = (p) => { setEditId(p.id); setEdit({title:p.title,department:p.department,headcount:p.headcount,filled:p.filled,start_date:p.start_date||"",monthly_cost:p.monthly_cost??""}); };
  const saveEdit = () => { const m=check(edit); if(m) return setError(m); run(async()=>{ await callId("staff",editId,"PATCH",toBody(edit)); setEditId(null); }); };
  const step = (p, d) => { const f=p.filled+d; if(f<0||f>p.headcount) return; run(()=>callId("staff",p.id,"PATCH",{filled:f})); };
  const remove = (p) => { if(confirmDelete(tf("Stelle „{0}“", p.title))) run(()=>callId("staff",p.id,"DELETE")); };

  const need = positions.reduce((s,p)=>s+p.headcount,0);
  const have = positions.reduce((s,p)=>s+p.filled,0);
  const pct = need>0 ? Math.round(have/need*100) : 0;
  const needByDept = sumBy(positions,"department","headcount");
  const haveByDept = sumBy(positions,"department","filled");
  const depts = Object.keys(needByDept).sort();
  const today = new Date();
  const urgent = positions.filter(p=>p.filled<p.headcount && p.start_date && (new Date(p.start_date)-today)/86400000 <= 30).length;

  return (
    <div>
      {hotel && <CostRampCard hotel={hotel} positions={positions} />}
      <div className="stack" style={{display:"flex",gap:14,marginBottom:18}}>
        <StatTile label="BESETZT" value={pct+" %"} sub={tf("{0} von {1} Personen", have, need)} color={pct>=80?GOOD:pct>=50?WARN:BAD} />
        <StatTile label="OFFEN" value={need-have} sub={(n=>n===1?tf("1 Stelle mit Lücken"):tf("{0} Stellen mit Lücken", n))(positions.filter(p=>p.filled<p.headcount).length)} />
        <StatTile label="DRINGEND" value={urgent} sub={tf("offen, Start in ≤ 30 Tagen")} color={urgent>0?BAD:INK} />
      </div>

      {depts.length>0 && (
        <Card style={{marginBottom:18}}>
          <h2 className="ui-h" style={{fontWeight:700,marginBottom:8}}>Besetzung je Abteilung</h2>
          {depts.map(d=>{
            const n=needByDept[d], h=haveByDept[d]||0, p=n>0?h/n*100:0;
            return (
              <div key={d} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0"}}>
                <div className="dept-label" style={{width:150,fontSize:13}}>{d}</div>
                <Bar pct={p} color={p>=80?GOOD:p>=50?WARN:BAD} />
                <div style={{width:60,textAlign:"right",fontSize:12.5,color:INK_MUTED}}>{h} / {n}</div>
              </div>
            );
          })}
        </Card>
      )}

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <button className="btn-primary" onClick={()=>setShowForm(!showForm)}>+ Stelle</button>
      </div>
      {error && <ErrorText style={{marginBottom:12}}>{error}</ErrorText>}
      {showForm && (
        <Card style={{marginBottom:16}}>
          <StaffFields value={draft} onChange={setDraft} />
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
            <button style={linkBtn} onClick={()=>setShowForm(false)}>Abbrechen</button>
            <button className="btn-primary" onClick={add}>Speichern</button>
          </div>
        </Card>
      )}
      <Card style={{padding:0}}>
        <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
          {positions.length===0 && <tr><td style={{padding:16,color:INK_MUTED}}>Noch keine Stellen angelegt.</td></tr>}
          {[...positions].sort((a,b)=>a.department.localeCompare(b.department)).map(p=> editId===p.id ? (
            <tr key={p.id} style={{borderTop:`1px solid ${BORDER}`,background:PAPER}}>
              <td colSpan={4} style={{padding:12}}>
                <StaffFields value={edit} onChange={setEdit} />
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
                  <button style={linkBtn} onClick={()=>setEditId(null)}>Abbrechen</button>
                  <button className="btn-primary" onClick={saveEdit}>Speichern</button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={p.id} style={{borderTop:`1px solid ${BORDER}`}}>
              <td style={{padding:12}}>{p.title}<div style={{fontSize:11.5,color:INK_MUTED}}>{p.department}{p.start_date ? " · "+tf("Start {0}", fmtDate(p.start_date)) : ""}</div></td>
              <td style={{padding:12,whiteSpace:"nowrap"}}>
                <button style={{...linkBtn,border:`1px solid ${BORDER}`,borderRadius:6,padding:"2px 9px"}} onClick={()=>step(p,-1)} title="Eine Person weniger">−</button>
                <span style={{display:"inline-block",minWidth:54,textAlign:"center",fontWeight:600}}>{p.filled} / {p.headcount}</span>
                <button style={{...linkBtn,border:`1px solid ${BORDER}`,borderRadius:6,padding:"2px 9px"}} onClick={()=>step(p,1)} title="Eine Person mehr">+</button>
              </td>
              <td style={{padding:12}}>
                {p.filled>=p.headcount ? <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>Besetzt</Pill> : <Pill color={WARN_TEXT} bg={WARN_SOFT}>{tf("{0} offen", p.headcount-p.filled)}</Pill>}
              </td>
              <td style={{padding:12,whiteSpace:"nowrap"}}>
                {api && canManageDept(p.department) && <button style={linkBtn} onClick={()=>setCands(cands===p.id?null:p.id)}>{tf("Bewerbungen")}</button>}
                <button style={linkBtn} onClick={()=>startEdit(p)}>Bearbeiten</button>
                <button style={linkBtn} onClick={()=>remove(p)} title="Löschen">✕</button>
              </td>
            </tr>
          ))}
          {cands && positions.find(p=>p.id===cands) && <tr><td colSpan={4} style={{padding:"8px 12px"}}><div className="field-label">{tf("Bewerbungen")} · <span data-no-i18n="">{positions.find(p=>p.id===cands).title}</span></div><CandidatesPanel hotel={hotel} api={api} position={positions.find(p=>p.id===cands)} /></td></tr>}
        </tbody></table>
      </Card>
    </div>
  );
}

function OrgRenameCard({orgId, orgName, api, onRenamed}){
  const [name,setName] = useState(orgName);
  const [msg,setMsg] = useState(""); const [error,setError] = useState(""); const [saving,setSaving] = useState(false);
  useEffect(()=>{ setName(orgName); }, [orgName]);
  const save = async () => {
    if(!name.trim() || name.trim()===orgName) return;
    setSaving(true); setError(""); setMsg("");
    try { onRenamed(await api("/api/organizations/"+orgId,"PATCH",{name})); setMsg("Gespeichert."); }
    catch(e){ setError(e.message); }
    setSaving(false);
  };
  return (
    <Card style={{marginBottom:18}}>
      <h2 className="ui-h" style={{fontWeight:700,marginBottom:10}}>Organisation</h2>
      <div className="stack" style={{display:"flex",gap:10}}>
        <input className="input" value={name} onChange={e=>{setName(e.target.value);setMsg("");}} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="Name der Organisation, z. B. Hotelgruppe Wien" />
        <button className="btn-primary" onClick={save} disabled={saving}>{saving?"…":"Umbenennen"}</button>
      </div>
      {error && <ErrorText style={{marginTop:10}}>{error}</ErrorText>}
      {msg && <div style={{color:GOOD,fontSize:13,marginTop:10}}>{msg}</div>}
    </Card>
  );
}

