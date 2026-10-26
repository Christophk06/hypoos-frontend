// ============================================================ Migration 040 A: Erstausstattung mit Lieferstatus, Angebotsvergleich,
// Eingangsrechnungen, Eröffnungs-Warteliste, Barrierefreiheit, Ereignisse in der Stadt. Rechte prüft die Datenbank; die Oberfläche blendet nur aus.

const opBtn = {minHeight:44};
const opSmall = {...smallBtn, minHeight:44};
const opMsg = (msg) => msg ? <div role={msg.ok?"status":"alert"} style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div> : null;
const opErr = (setMsg) => (e) => setMsg({ok:false,text:e.message});
const opCsv = (rows, fileName) => {
  const text = "﻿"+rows.map(r=>r.map(x=>'"'+String(x==null?"":x).replace(/"/g,'""')+'"').join(";")).join("\r\n");
  downloadBlob(new Blob([text],{type:"text/csv;charset=utf-8"}), fileName);
};
const opDays = (from, to) => Math.round((new Date(to+"T12:00:00Z") - new Date(from+"T12:00:00Z"))/86400000);
const opMonday = (iso) => { const d = new Date(iso+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)); return d.toISOString().slice(0,10); };
const opPct = (a, b) => b>0 ? Math.round(a*100/b) : 100;
const opBar = (pct, color) => <div aria-hidden="true" style={{height:6,background:PAPER,borderRadius:4,overflow:"hidden",marginTop:4}}><div style={{width:Math.min(100,pct)+"%",height:"100%",background:color||GOOD}} /></div>;
// Foto (verkleinert) oder PDF als Daten-URL, höchstens knapp 3 MB
const opPickFile = (file, onData, setMsg) => {
  if(!file) return;
  if(/^image\//.test(file.type)) return compressImage(file, 1800, 0.78).then(onData).catch(opErr(setMsg));
  if(file.type!=="application/pdf") return setMsg({ok:false,text:tf("Bitte PDF oder Foto wählen.")});
  if(file.size > 2900000) return setMsg({ok:false,text:tf("Bitte PDF oder Foto unter 3 MB.")});
  const r = new FileReader(); r.onload = () => onData(r.result); r.readAsDataURL(file);
};
// Beleg öffnen: nur PDF und Fotos, Blob mit festem Typ neu gebaut – nie HTML o. Ä. im Browser ausführen
const opOpenFile = async (api, path, setMsg) => {
  try {
    const x = await api(path);
    const m = /^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(x && x.file_data || ""));
    if(!m) return setMsg({ok:false,text:tf("Dieser Dateityp kann nicht geöffnet werden.")});
    const bin = atob(m[2]), bytes = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], {type:m[1]}));
    const w = window.open(url, "_blank", "noopener"); if(!w){ const a = document.createElement("a"); a.href = url; a.download = m[1]==="application/pdf" ? "beleg.pdf" : "beleg."+m[1].split("/")[1]; a.click(); }
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  } catch(e){ setMsg({ok:false,text:e.message}); }
};
const opCopy = async (text, setMsg) => { try { await navigator.clipboard.writeText(text); setMsg({ok:true,text:tf("Kopiert.")}); } catch(e){ setMsg({ok:false,text:tf("Kopieren nicht möglich – bitte den Text markieren.")}); } };
function OpSupplierInput({suppliers, value, onChange}){
  // value: {supplier_id, supplier_name}
  const known = (suppliers||[]).length>0;
  return (
    <Field label={tf("Lieferant")}>
      {known && <select className="input" value={value.supplier_id||""} onChange={e=>{ const s = suppliers.find(x=>x.id===e.target.value); onChange({supplier_id:s?s.id:"", supplier_name:s?s.name:value.supplier_name}); }}>
        <option value="">{tf("– frei eingeben –")}</option>
        {suppliers.map(s=><option key={s.id} value={s.id} data-no-i18n="">{s.name}</option>)}
      </select>}
      {!value.supplier_id && <input className="input" style={{marginTop:known?6:0}} aria-label={tf("Name des Lieferanten")} placeholder={tf("Name des Lieferanten")} maxLength={120} value={value.supplier_name||""} onChange={e=>onChange({supplier_id:"", supplier_name:e.target.value})} />}
    </Field>
  );
}

// ------------------------------------------------------------ 1. Erstausstattung mit Lieferstatus
function opEquipmentSheetHtml(hotel, d){
  const s = d.summary;
  return FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Erstausstattung – fehlende Mengen"), fmtDate(todayIso()))
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Zimmer")+'</div><div class="v">'+fsEsc(s.rooms)+'</div></div><div class="f"><div class="l">'+fsT("Soll")+'</div><div class="v">'+fsEsc(s.need)+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Geliefert")+'</div><div class="v">'+fsEsc(s.delivered)+'</div></div><div class="f"><div class="l">'+fsT("Montiert")+'</div><div class="v">'+fsEsc(s.installed)+'</div></div></div>'
    + '<table class="t"><thead><tr><th>'+fsT("Artikel")+'</th><th class="r">'+fsT("Soll")+'</th><th class="r">'+fsT("Geliefert")+'</th><th class="r">'+fsT("Fehlt")+'</th><th class="r">'+fsT("Montiert")+'</th></tr></thead><tbody>'
    + s.articles.map(a=>'<tr><td><b>'+fsEsc(a.name)+'</b></td><td class="r">'+a.need+'</td><td class="r">'+a.delivered+'</td><td class="r'+(a.missing>0?' bad':'')+'">'+a.missing+'</td><td class="r">'+a.installed+'</td></tr>').join("")
    + '</tbody></table>'+fsFoot()+'</div>';
}
function OpEquipmentView({hotel, api}){
  const [d,setD] = useState(null); const [tab,setTab] = useState("overview"); const [msg,setMsg] = useState(null);
  const [floor,setFloor] = useState(""); const [open,setOpen] = useState(null); const [edit,setEdit] = useState(null); const [busy,setBusy] = useState(false);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/room-equipment").then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(d===false) return opMsg(msg);
  const s = d.summary;
  const types = [""].concat([...new Set(d.rooms.map(r=>r.room_type).filter(Boolean))].sort());
  const startEdit = (rt) => { const t = d.templates.find(x=>x.room_type===rt); setEdit({room_type:rt, items:(t?t.items:[]).map(x=>({...x}))}); };
  const saveTpl = async () => { setBusy(true); setMsg(null);
    try { await api("/api/hotels/"+hotel.id+"/equipment-templates","PUT",{room_type:edit.room_type, items:edit.items.filter(x=>String(x.name||"").trim())}); setEdit(null); setMsg({ok:true,text:tf("Gespeichert.")}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const saveRoom = async (room, items, note) => { setMsg(null);
    const delivered = {}, installed = {}; items.forEach(x=>{ if(x.delivered>0) delivered[x.key] = x.delivered; if(x.installed) installed[x.key] = true; });
    try { await api("/api/room-equipment/"+room.id,"PUT",{delivered, installed, note}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const csv = () => opCsv([[tf("Artikel"),tf("Soll"),tf("Geliefert"),tf("Fehlt"),tf("Montiert")]].concat(s.articles.map(a=>[a.name,a.need,a.delivered,a.missing,a.installed])), safeFile(translateString("Erstausstattung")+" "+hotel.name+" "+todayIso())+".csv");
  const pdf = () => sheetPdf(opEquipmentSheetHtml(hotel, d), safeFile(translateString("Erstausstattung")+" "+hotel.name+" "+todayIso())+".pdf").catch(opErr(setMsg));
  const floors = [...new Set(d.rooms.map(r=>r.floor||""))];
  const shown = d.rooms.filter(r=>!floor || (r.floor||"")===floor);
  const tabBtn = (k, label) => <button key={k} role="tab" aria-selected={tab===k} style={{...opSmall,background:tab===k?INK:"#fff",color:tab===k?"#fff":INK}} onClick={()=>setTab(k)}>{label}</button>;
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Soll-Listen je Zimmertyp, Lieferstand und Montage je Zimmer. Verkaufsfertig ist ein Zimmer, wenn alles montiert ist und die letzte Zimmer-Abnahme bestanden wurde.")}</div>
      {opMsg(msg)}
      <div role="tablist" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{[tabBtn("overview",tf("Übersicht")), tabBtn("rooms",tf("Zimmer")), tabBtn("lists",tf("Soll-Listen"))]}</div>
      {tab==="overview" && <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:14}}>
          {[[tf("Verkaufsfertig"), s.ready+" / "+s.rooms, opPct(s.ready,s.rooms)], [tf("Geliefert"), s.delivered+" / "+s.need, opPct(s.delivered,s.need)], [tf("Montiert"), s.installed+" / "+s.need, opPct(s.installed,s.need)]].map(([l,v,p])=>(
            <Card key={l}><div style={{fontSize:12.5,color:INK_MUTED}}>{l}</div><div style={{fontSize:22,fontWeight:700}}>{v}</div>{opBar(p)}</Card>))}
        </div>
        {d.templates.length===0 && <Card style={{marginBottom:14,borderColor:BRASS}}>{tf("Noch keine Soll-Liste. Lege zuerst fest, was in jedes Zimmer gehört (Reiter „Soll-Listen“).")}</Card>}
        {s.floors.length>0 && <Card style={{marginBottom:14}}>
          <b>{tf("Je Etage")}</b>
          {s.floors.map(f=>(
            <div key={f.floor} style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><b style={{flex:1}}>{f.floor ? <span>{tf("Etage")} <span data-no-i18n="">{f.floor}</span></span> : tf("Ohne Etage")}</b>
                <span>{tf("{0} von {1} verkaufsfertig", f.ready, f.rooms)}</span><span style={{color:INK_MUTED}}>{tf("Montiert")} {opPct(f.installed,f.need)} %</span></div>
              {opBar(opPct(f.installed,f.need))}
            </div>))}
        </Card>}
        {s.articles.length>0 && <Card>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
            <b style={{flex:1}}>{tf("Je Artikel")}</b>
            <button style={opSmall} onClick={csv}><Icon n="file" /> {tf("Excel/CSV")}</button>
            <button style={opSmall} onClick={pdf}><Icon n="filetext" /> {tf("PDF für Lieferanten")}</button>
          </div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
            <thead><tr style={{textAlign:"start",color:INK_MUTED,fontSize:12}}><th style={{textAlign:"start",padding:6}}>{tf("Artikel")}</th><th style={{textAlign:"end",padding:6}}>{tf("Soll")}</th><th style={{textAlign:"end",padding:6}}>{tf("Geliefert")}</th><th style={{textAlign:"end",padding:6}}>{tf("Fehlt")}</th><th style={{textAlign:"end",padding:6}}>{tf("Montiert")}</th></tr></thead>
            <tbody>{s.articles.map(a=><tr key={a.key} style={{borderTop:`1px solid ${BORDER}`}}><td style={{padding:6}} data-no-i18n="">{a.name}</td><td style={{padding:6,textAlign:"end"}}>{a.need}</td><td style={{padding:6,textAlign:"end"}}>{a.delivered}</td><td style={{padding:6,textAlign:"end",color:a.missing>0?BAD:GOOD,fontWeight:600}}>{a.missing}</td><td style={{padding:6,textAlign:"end"}}>{a.installed}</td></tr>)}</tbody>
          </table></div>
        </Card>}
      </div>}
      {tab==="rooms" && <div>
        {floors.length>1 && <select className="input" style={{width:"auto",marginBottom:10}} aria-label={tf("Etage")} value={floor} onChange={e=>setFloor(e.target.value)}>
          <option value="">{tf("Alle Etagen")}</option>{floors.map(f=><option key={f} value={f}>{f || tf("Ohne Etage")}</option>)}</select>}
        {shown.length===0 && <div style={{color:INK_MUTED}}>{tf("Noch keine Zimmer angelegt.")}</div>}
        {shown.map(r=>(
          <Card key={r.id} style={{marginBottom:8,padding:12}}>
            <button style={{all:"unset",cursor:"pointer",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",width:"100%",minHeight:44}} aria-expanded={open===r.id} onClick={()=>setOpen(open===r.id?null:r.id)}>
              <b style={{minWidth:60}} data-no-i18n="">{r.number}</b>
              <span style={{flex:1,minWidth:120,fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{[r.room_type, r.floor?translateString("Etage")+" "+r.floor:null].filter(Boolean).join(" · ")}</span>
              <span style={{fontSize:12.5}}>{tf("Geliefert")} {r.delivered}/{r.need} · {tf("Montiert")} {r.installed}/{r.need}</span>
              {r.ready ? <Pill color={GOOD} bg={GOOD_SOFT}>{tf("verkaufsfertig")}</Pill>
                : r.complete && !r.inspection ? <Pill color={WARN} bg={WARN_SOFT}>{tf("Abnahme fehlt")}</Pill>
                : r.complete && r.inspection && !r.inspection.passed ? <Pill color={BAD} bg={BAD_SOFT}>{tf("Abnahme nicht bestanden")}</Pill> : null}
            </button>
            {open===r.id && <OpRoomEquipment room={r} onSave={saveRoom} />}
          </Card>))}
      </div>}
      {tab==="lists" && <div>
        {!edit && types.map(rt=>{ const t = d.templates.find(x=>x.room_type===rt); return (
          <Card key={rt||"_all"} style={{marginBottom:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <b style={{flex:1}}>{rt ? <span data-no-i18n="">{rt}</span> : tf("Alle Zimmer")}</b>
              <span style={{fontSize:12.5,color:INK_MUTED}}>{t ? tf("{0} Artikel", t.items.length) : tf("keine Liste")}</span>
              <button style={opSmall} onClick={()=>startEdit(rt)}>{tf("Bearbeiten")}</button>
            </div>
            {t && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:6}} data-no-i18n="">{t.items.map(x=>x.qty+"× "+x.name).join(" · ")}</div>}
          </Card>); })}
        {!edit && <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("„Alle Zimmer“ gilt für jedes Zimmer; die Liste eines Zimmertyps kommt dazu (gleicher Artikel: die Menge des Zimmertyps gilt). Zimmertypen kommen aus der Zimmerliste.")}</div>}
        {edit && <Card>
          <b>{tf("Soll-Liste")}: {edit.room_type ? <span data-no-i18n="">{edit.room_type}</span> : tf("Alle Zimmer")}</b>
          {edit.items.map((x,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}>
              <input className="input" style={{flex:1}} aria-label={tf("Artikel")} placeholder={tf("z. B. Fön")} maxLength={120} value={x.name||""} onChange={e=>setEdit({...edit,items:edit.items.map((y,j)=>j===i?{...y,name:e.target.value}:y)})} />
              <input className="input" style={{width:80}} type="number" min={1} max={999} aria-label={tf("Menge")} value={x.qty||1} onChange={e=>setEdit({...edit,items:edit.items.map((y,j)=>j===i?{...y,qty:e.target.value}:y)})} />
              <button style={{...opSmall,color:BAD}} aria-label={tf("Entfernen")} onClick={()=>setEdit({...edit,items:edit.items.filter((y,j)=>j!==i)})}>✕</button>
            </div>))}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
            <button style={opSmall} onClick={()=>setEdit({...edit,items:edit.items.concat([{name:"",qty:1}])})}>+ {tf("Artikel")}</button>
            <span style={{flex:1}} />
            <button style={{...btnLine,minHeight:44}} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button>
            <button className="btn-primary" style={opBtn} disabled={busy} onClick={saveTpl}>{tf("Speichern")}</button>
          </div>
        </Card>}
      </div>}
    </div>
  );
}
function OpRoomEquipment({room, onSave}){
  const [items,setItems] = useState(room.items.map(x=>({...x}))); const [note,setNote] = useState(room.note||""); const [busy,setBusy] = useState(false);
  const set = (i, k, v) => setItems(items.map((x,j)=>j===i?{...x,[k]:v}:x));
  const save = async (list) => { setBusy(true); await onSave(room, list||items, note); setBusy(false); };
  if(!items.length) return <div style={{fontSize:13,color:INK_MUTED,marginTop:8}}>{tf("Für dieses Zimmer gibt es keine Soll-Liste.")}</div>;
  return (
    <div style={{marginTop:8}}>
      {items.map((x,i)=>(
        <div key={x.key} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <span style={{flex:1,minWidth:140}} data-no-i18n="">{x.qty}× {x.name}</span>
          <label style={{display:"flex",gap:6,alignItems:"center"}}>{tf("Geliefert")}
            <input className="input" type="number" min={0} max={x.qty} style={{width:70}} value={x.delivered} onChange={e=>set(i,"delivered",Math.max(0,Math.min(x.qty,Math.round(Number(e.target.value)||0))))} /></label>
          <label style={{display:"flex",gap:6,alignItems:"center",minHeight:44,cursor:"pointer"}}><input type="checkbox" style={{width:20,height:20}} checked={!!x.installed} onChange={e=>set(i,"installed",e.target.checked)} /> {tf("Montiert")}</label>
        </div>))}
      <Field label={tf("Notiz")}><input className="input" maxLength={500} value={note} onChange={e=>setNote(e.target.value)} /></Field>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button style={{...btnLine,minHeight:44}} disabled={busy} onClick={()=>{ const all = items.map(x=>({...x,delivered:x.qty,installed:true})); setItems(all); save(all); }}>{tf("Alles geliefert und montiert")}</button>
        <button className="btn-primary" style={opBtn} disabled={busy} onClick={()=>save()}>{tf("Speichern")}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 2. Angebotsvergleich
function opAwardHtml(hotel, r, quotes, budget, decidedBy){
  const q = quotes.find(x=>x.id===r.decided_quote_id) || {};
  const money = moneyOf(hotel);
  return FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Vergabevermerk"), r.title)
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Abteilung")+'</div><div class="v">'+fsEsc(translateString(r.department||""))+'</div></div><div class="f"><div class="l">'+fsT("Entschieden am")+'</div><div class="v">'+fsEsc(fmtDate(r.decided_at))+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Vergeben an")+'</div><div class="v">'+fsEsc(q.supplier_name||"–")+'</div></div><div class="f"><div class="l">'+fsT("Betrag")+'</div><div class="v">'+fsEsc(q.amount!=null?(q.currency&&q.currency!==hotel.currency?q.amount+" "+q.currency:money(q.amount)):"–")+'</div></div></div>'
    + '<h2>'+fsT("Eingeholte Angebote")+'</h2><table class="t"><thead><tr><th>'+fsT("Lieferant")+'</th><th class="r">'+fsT("Betrag")+'</th><th class="r">'+fsT("Lieferzeit (Tage)")+'</th><th>'+fsT("Gültig bis")+'</th><th>'+fsT("Notiz")+'</th></tr></thead><tbody>'
    + quotes.map(x=>'<tr'+(x.id===r.decided_quote_id?' class="g"':'')+'><td>'+fsEsc(x.supplier_name||"")+'</td><td class="r">'+fsEsc(x.currency&&x.currency!==hotel.currency?x.amount+" "+x.currency:money(x.amount))+'</td><td class="r">'+fsEsc(x.delivery_days==null?"–":x.delivery_days)+'</td><td>'+fsEsc(x.valid_until?fmtDate(x.valid_until):"–")+'</td><td>'+fsEsc(x.note||"")+'</td></tr>').join("")
    + '</tbody></table><h2>'+fsT("Begründung")+'</h2><p style="white-space:pre-wrap">'+fsEsc(r.decision_reason||"")+'</p>'
    + (budget ? '<p>'+fsT("Budgetposten")+': <b>'+fsEsc(budget.title)+'</b> ('+fsEsc(translateString(budget.department||""))+')</p>' : '')
    + '<p style="margin-top:28px">'+fsT("Entschieden von")+': '+fsEsc(decidedBy||"")+'</p><p style="margin-top:34px;border-top:1px solid #1C2430;width:60mm;padding-top:4px;font-size:10px">'+fsT("Unterschrift")+'</p>'+fsFoot()+'</div>';
}
function OpQuotesView({hotel, api, members, me}){
  const [list,setList] = useState(null); const [suppliers,setSuppliers] = useState([]); const [budget,setBudget] = useState([]); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [open,setOpen] = useState(null); const [qf,setQf] = useState(null); const [decide,setDecide] = useState(null); const [busy,setBusy] = useState(false); const [showAll,setShowAll] = useState(false);
  const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/quote-requests").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, hotel.id]);
  useEffect(()=>{ load();
    api("/api/hotels/"+hotel.id+"/suppliers").then(l=>setSuppliers(Array.isArray(l)?l:[])).catch(()=>{});
    api("/api/hotels/"+hotel.id+"/budget").then(l=>setBudget(Array.isArray(l)?l:[])).catch(()=>{}); },[load]);
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); if(ok) setMsg({ok:true,text:ok}); load(); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } finally { setBusy(false); } };
  const fmtAmt = (q) => q.currency && q.currency!==(hotel.currency||"EUR") ? fmtNum(q.amount)+" "+q.currency : money(q.amount);
  const nameOf = (id) => id ? memberLabel(members||[], me, id) : "";
  const shown = (list||[]).filter(r=>showAll || r.status==="offen");
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Angebote nebeneinander vergleichen, begründet entscheiden und den Betrag im Budget als beauftragt vormerken. Der Vergabevermerk ist als PDF abrufbar.")}</div>
      {opMsg(msg)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {!form && <button className="btn-primary" style={opBtn} onClick={()=>setForm({title:"",department:"Einkauf",budget_item_id:""})}>+ {tf("Neue Anfrage")}</button>}
        <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)} /> {tf("Auch entschiedene und verworfene zeigen")}</label>
      </div>
      {form && <Card style={{marginBottom:14}}>
        <Field label={tf("Was wird angefragt?")}><input className="input" maxLength={200} placeholder={tf("z. B. Bettwäsche 120 Zimmer")} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></Field>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Abteilung")}><select className="input" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.map(x=><option key={x} value={x}>{translateString(x)}</option>)}</select></Field>
          <Field label={tf("Budgetposten (optional)")}><select className="input" value={form.budget_item_id} onChange={e=>setForm({...form,budget_item_id:e.target.value})}>
            <option value="">{tf("– keiner –")}</option>{budget.map(b=><option key={b.id} value={b.id} data-no-i18n="">{b.title} · {translateString(b.department)}</option>)}</select></Field>
        </div>
        <div style={{display:"flex",gap:8}}><button style={{...btnLine,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          <button className="btn-primary" style={opBtn} disabled={busy || !form.title.trim()} onClick={async()=>{ if(await run(()=>api("/api/hotels/"+hotel.id+"/quote-requests","POST",{...form, budget_item_id:form.budget_item_id||null}))) setForm(null); }}>{tf("Anlegen")}</button></div>
      </Card>}
      {list && shown.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine offenen Anfragen.")}</div>}
      {shown.map(r=>{
        const qs = r.quotes||[]; const minA = qs.length ? Math.min(...qs.map(q=>Number(q.amount))) : null;
        const withDays = qs.filter(q=>q.delivery_days!=null); const minD = withDays.length ? Math.min(...withDays.map(q=>q.delivery_days)) : null;
        const bi = budget.find(b=>b.id===r.budget_item_id);
        return (
        <Card key={r.id} style={{marginBottom:10}}>
          <button style={{all:"unset",cursor:"pointer",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",width:"100%",minHeight:44}} aria-expanded={open===r.id} onClick={()=>setOpen(open===r.id?null:r.id)}>
            <b style={{flex:1}} data-no-i18n="">{r.title}</b>
            <span style={{fontSize:12.5,color:INK_MUTED}}>{translateString(r.department)} · {tf("{0} Angebote", qs.length)}</span>
            <Pill color={r.status==="entschieden"?GOOD:r.status==="verworfen"?INK_MUTED:WARN} bg={r.status==="entschieden"?GOOD_SOFT:r.status==="verworfen"?PAPER:WARN_SOFT}>{tf(r.status)}</Pill>
          </button>
          {open===r.id && <div style={{marginTop:10}}>
            {bi && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Budgetposten")}: <span data-no-i18n="">{bi.title}</span> · {tf("Plan")} {money(bi.planned)} · {tf("beauftragt")} {money(bi.committed)}</div>}
            {qs.length>0 && <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontSize:13.5,minWidth:"100%"}}>
              <tbody>
                <tr><th scope="row" style={{textAlign:"start",padding:6,color:INK_MUTED,fontSize:12}}>{tf("Lieferant")}</th>{qs.map(q=><td key={q.id} style={{padding:6,fontWeight:700,minWidth:130,background:q.id===r.decided_quote_id?GOOD_SOFT:undefined}} data-no-i18n="">{q.supplier_name||"–"}</td>)}</tr>
                <tr style={{borderTop:`1px solid ${BORDER}`}}><th scope="row" style={{textAlign:"start",padding:6,color:INK_MUTED,fontSize:12}}>{tf("Betrag")}</th>{qs.map(q=><td key={q.id} style={{padding:6}}>{fmtAmt(q)} {qs.length>1 && Number(q.amount)===minA && <Pill color={GOOD} bg={GOOD_SOFT}>{tf("günstigstes")}</Pill>}</td>)}</tr>
                <tr style={{borderTop:`1px solid ${BORDER}`}}><th scope="row" style={{textAlign:"start",padding:6,color:INK_MUTED,fontSize:12}}>{tf("Lieferzeit")}</th>{qs.map(q=><td key={q.id} style={{padding:6}}>{q.delivery_days==null?"–":tf("{0} Tage", q.delivery_days)} {withDays.length>1 && q.delivery_days===minD && <Pill color={BRASS} bg={BRASS_SOFT}>{tf("schnellstes")}</Pill>}</td>)}</tr>
                <tr style={{borderTop:`1px solid ${BORDER}`}}><th scope="row" style={{textAlign:"start",padding:6,color:INK_MUTED,fontSize:12}}>{tf("Gültig bis")}</th>{qs.map(q=><td key={q.id} style={{padding:6,color:q.valid_until&&q.valid_until<todayIso()?BAD:undefined}}>{q.valid_until?fmtDate(q.valid_until):"–"}</td>)}</tr>
                <tr style={{borderTop:`1px solid ${BORDER}`}}><th scope="row" style={{textAlign:"start",padding:6,color:INK_MUTED,fontSize:12}}>{tf("Notiz")}</th>{qs.map(q=><td key={q.id} style={{padding:6,fontSize:12.5}} data-no-i18n="">{q.note||""}</td>)}</tr>
                <tr style={{borderTop:`1px solid ${BORDER}`}}><td />{qs.map(q=><td key={q.id} style={{padding:6}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {q.has_file && <button style={opSmall} onClick={()=>opOpenFile(api, "/api/quotes/"+q.id+"/file", setMsg)}><Icon n="filetext" /> {tf("Öffnen")}</button>}
                    {r.status==="offen" && <button className="btn-primary" style={opBtn} onClick={()=>setDecide({request:r, quote:q, reason:"", create:!r.budget_item_id})}>{tf("Wählen")}</button>}
                    {r.status==="offen" && <button style={{...opSmall,color:BAD}} aria-label={tf("Angebot löschen")} onClick={()=>window.confirm(tf("Angebot löschen?")) && run(()=>api("/api/quotes/"+q.id,"DELETE"))}>✕</button>}
                  </div></td>)}</tr>
              </tbody></table></div>}
            {r.status==="entschieden" && <div style={{marginTop:10,fontSize:13.5}}>
              <div><b>{tf("Begründung")}:</b> <span data-no-i18n="" style={{whiteSpace:"pre-wrap"}}>{r.decision_reason}</span></div>
              <button style={{...opSmall,marginTop:8}} onClick={()=>sheetPdf(opAwardHtml(hotel, r, qs, budget.find(b=>b.id===r.budget_item_id), nameOf(r.decided_by)), safeFile(translateString("Vergabevermerk")+" "+r.title)+".pdf").catch(opErr(setMsg))}><Icon n="filetext" /> {tf("Vergabevermerk (PDF)")}</button>
            </div>}
            {r.status==="offen" && !qf && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              <button style={{...btnLine,minHeight:44}} onClick={()=>setQf({request_id:r.id, supplier_id:"", supplier_name:"", amount:"", currency:hotel.currency||"EUR", delivery_days:"", valid_until:"", note:"", file_data:""})}>+ {tf("Angebot hinzufügen")}</button>
              <span style={{flex:1}} />
              <button style={{...btnLine,minHeight:44,color:BAD}} onClick={()=>window.confirm(tf("Anfrage verwerfen?")) && run(()=>api("/api/quote-requests/"+r.id,"PATCH",{status:"verworfen"}))}>{tf("Verwerfen")}</button>
            </div>}
            {r.status==="verworfen" && <button style={{...btnLine,minHeight:44,marginTop:10}} onClick={()=>run(()=>api("/api/quote-requests/"+r.id,"PATCH",{status:"offen"}))}>{tf("Wieder öffnen")}</button>}
            {qf && qf.request_id===r.id && <div style={{borderTop:`1px solid ${BORDER}`,marginTop:12,paddingTop:12}}>
              <OpSupplierInput suppliers={suppliers} value={qf} onChange={v=>setQf({...qf,...v})} />
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0 10px"}}>
                <Field label={tf("Betrag (netto)")}><input className="input" inputMode="decimal" value={qf.amount} onChange={e=>setQf({...qf,amount:e.target.value})} /></Field>
                <Field label={tf("Währung")}><input className="input" maxLength={3} value={qf.currency} onChange={e=>setQf({...qf,currency:e.target.value.toUpperCase()})} /></Field>
                <Field label={tf("Lieferzeit (Tage)")}><input className="input" type="number" min={0} value={qf.delivery_days} onChange={e=>setQf({...qf,delivery_days:e.target.value})} /></Field>
                <Field label={tf("Gültig bis")}><input className="input" type="date" value={qf.valid_until} onChange={e=>setQf({...qf,valid_until:e.target.value})} /></Field>
              </div>
              <Field label={tf("Notiz")}><input className="input" maxLength={1000} value={qf.note} onChange={e=>setQf({...qf,note:e.target.value})} /></Field>
              <Field label={tf("Angebot als PDF oder Foto (optional)")}><input type="file" accept="application/pdf,image/*" onChange={e=>opPickFile(e.target.files[0], d=>setQf(f=>({...f,file_data:d})), setMsg)} /></Field>
              {qf.file_data && <div style={{fontSize:12.5,color:GOOD,marginBottom:8}}>✓ {tf("Datei angehängt")}</div>}
              <div style={{display:"flex",gap:8}}><button style={{...btnLine,minHeight:44}} onClick={()=>setQf(null)}>{tf("Abbrechen")}</button>
                <button className="btn-primary" style={opBtn} disabled={busy} onClick={async()=>{ const {request_id, ...b} = qf; if(await run(()=>api("/api/quote-requests/"+request_id+"/quotes","POST",{...b, supplier_id:b.supplier_id||null, delivery_days:b.delivery_days===""?null:b.delivery_days, valid_until:b.valid_until||null, file_data:b.file_data||null}))) setQf(null); }}>{tf("Speichern")}</button></div>
            </div>}
          </div>}
        </Card>); })}
      {decide && <div role="dialog" aria-modal="true" aria-label={tf("Entscheidung")} style={{position:"fixed",inset:0,background:"rgba(28,36,48,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:50}}>
        <Card style={{maxWidth:480,width:"100%"}}>
          <b>{tf("Entscheidung")}: <span data-no-i18n="">{decide.quote.supplier_name}</span> · {fmtAmt(decide.quote)}</b>
          {decide.quote.amount > Math.min(...decide.request.quotes.map(q=>Number(q.amount))) && <div style={{fontSize:12.5,color:WARN,marginTop:6}}>{tf("Nicht das günstigste Angebot – bitte begründen, warum.")}</div>}
          <Field label={tf("Begründung")}><textarea className="input" rows={4} maxLength={2000} value={decide.reason} onChange={e=>setDecide({...decide,reason:e.target.value})} /></Field>
          {decide.request.budget_item_id ? <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Der Betrag wird beim verknüpften Budgetposten als beauftragt vorgemerkt.")}</div>
            : <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer",marginBottom:6}}><input type="checkbox" checked={decide.create} onChange={e=>setDecide({...decide,create:e.target.checked})} /> {tf("Neuen Budgetposten anlegen (Plan und beauftragt = Betrag)")}</label>}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{...btnLine,minHeight:44}} onClick={()=>setDecide(null)}>{tf("Abbrechen")}</button>
            <button className="btn-primary" style={opBtn} disabled={busy || !decide.reason.trim()} onClick={async()=>{ if(await run(()=>api("/api/quote-requests/"+decide.request.id+"/decide","POST",{quote_id:decide.quote.id, reason:decide.reason, create_budget_item: !decide.request.budget_item_id && decide.create ? {department:decide.request.department, title:decide.request.title} : false}), tf("Entschieden."))){ setDecide(null); api("/api/hotels/"+hotel.id+"/budget").then(l=>setBudget(Array.isArray(l)?l:[])).catch(()=>{}); } }}>{tf("Entscheiden")}</button>
          </div>
        </Card>
      </div>}
    </div>
  );
}

// ------------------------------------------------------------ 3. Eingangsrechnungen und Liquidität
function OpPayablesView({hotel, api}){
  const [list,setList] = useState(null); const [suppliers,setSuppliers] = useState([]); const [budget,setBudget] = useState([]); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [busy,setBusy] = useState(false); const [showPaid,setShowPaid] = useState(false);
  const money = moneyOf(hotel); const today = todayIso();
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/supplier-invoices").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, hotel.id]);
  useEffect(()=>{ load();
    api("/api/hotels/"+hotel.id+"/suppliers").then(l=>setSuppliers(Array.isArray(l)?l:[])).catch(()=>{});
    api("/api/hotels/"+hotel.id+"/budget").then(l=>setBudget(Array.isArray(l)?l:[])).catch(()=>{}); },[load]);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); load(); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } finally { setBusy(false); } };
  const fmtAmt = (x) => x.currency && x.currency!==(hotel.currency||"EUR") ? fmtNum(x.amount)+" "+x.currency : money(x.amount);
  const skontoOf = (x) => Number(x.skonto_percent)>0 && x.skonto_until && x.skonto_until>=today ? Math.round(Number(x.amount)*Number(x.skonto_percent))/100 : 0;
  const open = (list||[]).filter(x=>!x.paid_at), paid = (list||[]).filter(x=>x.paid_at);
  const sum = (l) => l.reduce((s,x)=>s+Number(x.amount||0),0);
  const overdue = open.filter(x=>x.due_on && x.due_on<today), soon = open.filter(x=>x.due_on && x.due_on>=today && opDays(today,x.due_on)<=7);
  const savings = open.reduce((s,x)=>s+skontoOf(x),0);
  // Liquidität: offene Beträge je Woche (nach Fälligkeit; Überfälliges zählt zur laufenden Woche)
  const weeks = []; const w0 = opMonday(today);
  for(let i=0;i<8;i++){ const from = addDaysIso(w0, i*7), to = addDaysIso(from, 6);
    const l = open.filter(x=>{ const d = x.skonto_until && skontoOf(x)>0 ? x.skonto_until : x.due_on; return d && (i===0 ? d<=to : d>=from && d<=to); });
    weeks.push({from, to, sum:sum(l), n:l.length}); }
  const later = open.filter(x=>!x.due_on || (x.due_on > weeks[7].to && !(skontoOf(x)>0 && x.skonto_until<=weeks[7].to)));
  const maxW = Math.max(1, ...weeks.map(w=>w.sum));
  const blank = {supplier_id:"", supplier_name:"", invoice_number:"", amount:"", currency:hotel.currency||"EUR", invoice_date:today, due_on:addDaysIso(today,14), skonto_percent:"", skonto_until:"", budget_item_id:"", note:"", file_data:""};
  const save = async () => { const {id, has_file, ...b} = form; const body = {...b, supplier_id:b.supplier_id||null, budget_item_id:b.budget_item_id||null, skonto_until:b.skonto_until||null, skonto_percent:b.skonto_percent===""?null:b.skonto_percent};
    if(id && !b.file_data) delete body.file_data;
    if(await run(()=> id ? api("/api/supplier-invoices/"+id,"PATCH",body) : api("/api/hotels/"+hotel.id+"/supplier-invoices","POST",body))) setForm(null); };
  const row = (x) => {
    const sk = skontoOf(x), days = x.due_on ? opDays(today, x.due_on) : null;
    return (
      <div key={x.id} style={{padding:"10px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
        <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <b style={{flex:1,minWidth:150}} data-no-i18n="">{x.supplier_name||"–"}{x.invoice_number ? <span style={{fontWeight:400,color:INK_MUTED}}> · {x.invoice_number}</span> : null}</b>
          <b>{fmtAmt(x)}</b>
          {!x.paid_at && days!=null && (days<0 ? <Pill color={BAD} bg={BAD_SOFT}>{tf("{0} Tage überfällig", -days)}</Pill> : days<=7 ? <Pill color={WARN} bg={WARN_SOFT}>{days===0?tf("heute fällig"):tf("fällig in {0} Tagen", days)}</Pill> : null)}
          {x.paid_at && <Pill color={GOOD} bg={GOOD_SOFT}>{tf("bezahlt")} {fmtDate(x.paid_at)}</Pill>}
        </div>
        <div style={{fontSize:12.5,color:INK_MUTED,marginTop:2}}>{x.invoice_date ? tf("Rechnung vom {0}", fmtDate(x.invoice_date))+" · " : ""}{x.due_on ? tf("fällig am {0}", fmtDate(x.due_on)) : tf("ohne Fälligkeit")}</div>
        {!x.paid_at && sk>0 && <div style={{fontSize:12.5,color:GOOD,marginTop:2,fontWeight:600}}>{tf("Bis {0} zahlen = {1} sparen", fmtDay(x.skonto_until,{day:"2-digit",month:"2-digit"}), money(sk))}</div>}
        {x.note && <div style={{fontSize:12.5,marginTop:2}} data-no-i18n="">{x.note}</div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
          {!x.paid_at && <button className="btn-primary" style={opBtn} disabled={busy} onClick={()=>run(()=>api("/api/supplier-invoices/"+x.id,"PATCH",{paid:true}))}>{tf("Als bezahlt markieren")}</button>}
          {x.paid_at && <button style={opSmall} disabled={busy} onClick={()=>run(()=>api("/api/supplier-invoices/"+x.id,"PATCH",{paid:false}))}>{tf("Doch nicht bezahlt")}</button>}
          {x.has_file && <button style={opSmall} onClick={()=>opOpenFile(api, "/api/supplier-invoices/"+x.id+"/file", setMsg)}><Icon n="filetext" /> {tf("Beleg")}</button>}
          {!x.paid_at && <button style={opSmall} onClick={()=>setForm({...blank, ...x, supplier_id:x.supplier_id||"", budget_item_id:x.budget_item_id||"", skonto_percent:x.skonto_percent==null?"":x.skonto_percent, skonto_until:x.skonto_until||"", due_on:x.due_on||"", invoice_date:x.invoice_date||"", note:x.note||"", file_data:""})}>{tf("Bearbeiten")}</button>}
          <button style={{...opSmall,color:BAD}} aria-label={tf("Rechnung löschen")} onClick={()=>window.confirm(tf("Rechnung löschen?")) && run(()=>api("/api/supplier-invoices/"+x.id,"DELETE"))}>✕</button>
        </div>
      </div>);
  };
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Eingangsrechnungen mit Beleg erfassen, Fälligkeiten und Skonto im Blick behalten. Die Leitung Finanzen bekommt am Vortag eine Erinnerung.")}</div>
      {opMsg(msg)}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:14}}>
        <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Offen")}</div><div style={{fontSize:20,fontWeight:700}}>{money(sum(open))}</div><div style={{fontSize:12,color:INK_MUTED}}>{tf("{0} Rechnungen", open.length)}</div></Card>
        <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Überfällig")}</div><div style={{fontSize:20,fontWeight:700,color:overdue.length?BAD:INK}}>{money(sum(overdue))}</div><div style={{fontSize:12,color:INK_MUTED}}>{tf("{0} Rechnungen", overdue.length)}</div></Card>
        <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Fällig in 7 Tagen")}</div><div style={{fontSize:20,fontWeight:700}}>{money(sum(soon))}</div><div style={{fontSize:12,color:INK_MUTED}}>{tf("{0} Rechnungen", soon.length)}</div></Card>
        <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Mögliche Skonto-Ersparnis")}</div><div style={{fontSize:20,fontWeight:700,color:savings>0?GOOD:INK}}>{money(savings)}</div></Card>
      </div>
      {open.length>0 && <Card style={{marginBottom:14}}>
        <b>{tf("Liquidität: offen je Woche")}</b>
        <div style={{fontSize:12,color:INK_MUTED,marginBottom:6}}>{tf("Nach Skonto-Frist bzw. Fälligkeit; Überfälliges zählt zur laufenden Woche.")}</div>
        {weeks.map((w,i)=>(
          <div key={w.from} style={{display:"flex",gap:10,alignItems:"center",fontSize:13,padding:"3px 0"}}>
            <span style={{width:120,flexShrink:0}}>{i===0?tf("Diese Woche"):fmtDay(w.from,{day:"2-digit",month:"2-digit"})+" – "+fmtDay(w.to,{day:"2-digit",month:"2-digit"})}</span>
            <div aria-hidden="true" style={{flex:1,height:10,background:PAPER,borderRadius:4,overflow:"hidden"}}><div style={{width:(w.sum*100/maxW)+"%",height:"100%",background:i===0&&overdue.length?BAD:BRASS}} /></div>
            <span style={{width:110,textAlign:"end",fontWeight:600}}>{w.sum ? money(w.sum) : "–"}</span>
          </div>))}
        {later.length>0 && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:4}}>{tf("Später oder ohne Fälligkeit")}: {money(sum(later))}</div>}
      </Card>}
      {!form && <button className="btn-primary" style={{...opBtn,marginBottom:12}} onClick={()=>setForm({...blank})}>+ {tf("Rechnung erfassen")}</button>}
      {form && <Card style={{marginBottom:14}}>
        <OpSupplierInput suppliers={suppliers} value={form} onChange={v=>setForm({...form,...v})} />
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Rechnungsnummer")}><input className="input" maxLength={80} value={form.invoice_number||""} onChange={e=>setForm({...form,invoice_number:e.target.value})} /></Field>
          <Field label={tf("Betrag (brutto)")}><input className="input" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></Field>
          <Field label={tf("Währung")}><input className="input" maxLength={3} value={form.currency||""} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})} /></Field>
          <Field label={tf("Rechnungsdatum")}><input className="input" type="date" value={form.invoice_date||""} onChange={e=>setForm({...form,invoice_date:e.target.value})} /></Field>
          <Field label={tf("Fällig am")}><input className="input" type="date" value={form.due_on||""} onChange={e=>setForm({...form,due_on:e.target.value})} /></Field>
          <Field label={tf("Skonto %")}><input className="input" inputMode="decimal" value={form.skonto_percent} onChange={e=>setForm({...form,skonto_percent:e.target.value})} /></Field>
          <Field label={tf("Skonto bis")}><input className="input" type="date" value={form.skonto_until||""} onChange={e=>setForm({...form,skonto_until:e.target.value})} /></Field>
          <Field label={tf("Budgetposten")}><select className="input" value={form.budget_item_id||""} onChange={e=>setForm({...form,budget_item_id:e.target.value})}>
            <option value="">{tf("– keiner –")}</option>{budget.map(b=><option key={b.id} value={b.id} data-no-i18n="">{b.title} · {translateString(b.department)}</option>)}</select></Field>
        </div>
        <Field label={tf("Notiz")}><input className="input" maxLength={1000} value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
        <Field label={tf("Beleg als Foto oder PDF")}><input type="file" accept="application/pdf,image/*" capture="environment" onChange={e=>opPickFile(e.target.files[0], d=>setForm(f=>({...f,file_data:d})), setMsg)} /></Field>
        {form.file_data && <div style={{fontSize:12.5,color:GOOD,marginBottom:8}}>✓ {tf("Datei angehängt")}</div>}
        <div style={{display:"flex",gap:8}}><button style={{...btnLine,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          <button className="btn-primary" style={opBtn} disabled={busy} onClick={save}>{tf("Speichern")}</button></div>
      </Card>}
      {list && <Card>
        <b>{tf("Offene Rechnungen")}</b>
        {open.length===0 && <div style={{fontSize:13.5,color:INK_MUTED,marginTop:6}}>{tf("Keine offenen Rechnungen.")}</div>}
        {open.map(row)}
        {paid.length>0 && <button style={{...opSmall,marginTop:10}} aria-expanded={showPaid} onClick={()=>setShowPaid(!showPaid)}>{showPaid?tf("Bezahlte ausblenden"):tf("Bezahlte zeigen ({0})", paid.length)}</button>}
        {showPaid && paid.map(row)}
      </Card>}
    </div>
  );
}

// ------------------------------------------------------------ 4. Eröffnungs-Warteliste
function OpWaitlistView({hotel, api}){
  const [d,setD] = useState(null); const [form,setForm] = useState(null); const [mail,setMail] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/waitlist").then(x=>{ setD(x); setForm(f=>f||x.settings); }).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(d===false) return opMsg(msg);
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function"?ok(r):ok}); load(); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } finally { setBusy(false); } };
  const stateOf = (s) => s.unsubscribed_at ? [INK_MUTED,PAPER,tf("abgemeldet")] : s.notified_at ? [GOOD,GOOD_SOFT,tf("benachrichtigt")] : s.confirmed_at ? [GOOD,GOOD_SOFT,tf("bestätigt")] : [WARN,WARN_SOFT,tf("unbestätigt")];
  const confirmed = d.signups.filter(s=>s.confirmed_at && !s.unsubscribed_at), waiting = confirmed.filter(s=>!s.notified_at);
  const csv = () => opCsv([[tf("E-Mail"),tf("Name"),tf("Sprache"),tf("Eingetragen"),tf("Bestätigt"),tf("Benachrichtigt"),tf("Abgemeldet")]].concat(d.signups.map(s=>[s.email,s.name||"",s.language||"",s.created_at.slice(0,10),(s.confirmed_at||"").slice(0,10),(s.notified_at||"").slice(0,10),(s.unsubscribed_at||"").slice(0,10)])), safeFile(translateString("Warteliste")+" "+hotel.name+" "+todayIso())+".csv");
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Interessierte tragen sich vor der Eröffnung auf einer eigenen Seite ein. Erst nach Bestätigung per E-Mail (Double-Opt-in) zählt der Eintrag; jede Mail enthält einen Abmeldelink.")}</div>
      {opMsg(msg)}
      <Card style={{marginBottom:14}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,minHeight:44,cursor:"pointer"}}><input type="checkbox" style={{width:20,height:20}} checked={!!form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})} /> <b>{tf("Warteliste ist öffentlich")}</b></label>
        <Field label={tf("Überschrift")}><input className="input" maxLength={160} placeholder={tf("z. B. Wir öffnen im Frühling – seien Sie die Ersten")} value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} /></Field>
        <Field label={tf("Text")}><textarea className="input" rows={4} maxLength={3000} value={form.text} onChange={e=>setForm({...form,text:e.target.value})} /></Field>
        <Field label={tf("Angebot für die Warteliste (optional)")}><input className="input" maxLength={1000} placeholder={tf("z. B. 15 % auf die ersten zwei Wochen")} value={form.offer} onChange={e=>setForm({...form,offer:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" style={opBtn} disabled={busy} onClick={()=>run(()=>api("/api/hotels/"+hotel.id+"/waitlist","PUT",form), tf("Gespeichert."))}>{tf("Speichern")}</button>
          {d.url && <button style={opSmall} onClick={()=>opCopy(d.url, setMsg)}>{tf("Link kopieren")}</button>}
          {d.url && <a href={d.url} target="_blank" rel="noopener" style={{...opSmall,display:"inline-flex",alignItems:"center",textDecoration:"none"}}>{tf("Seite ansehen")}</a>}
          {d.url && <button style={opSmall} disabled={busy} onClick={()=>window.confirm(tf("Neuen Link erzeugen? Der alte Link funktioniert danach nicht mehr.")) && run(()=>api("/api/hotels/"+hotel.id+"/waitlist","PUT",{...form, rotate:true}), tf("Neuer Link erzeugt."))}>{tf("Neuer Link")}</button>}
        </div>
        {d.url && <div style={{fontSize:12,color:INK_MUTED,marginTop:8,wordBreak:"break-all"}} data-no-i18n="">{d.url}</div>}
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <b style={{flex:1}}>{tf("Einträge")} <span style={{fontWeight:400,color:INK_MUTED,fontSize:12.5}}>· {tf("{0} bestätigt", confirmed.length)} · {tf("{0} unbestätigt", d.signups.filter(s=>!s.confirmed_at).length)}</span></b>
          {d.signups.length>0 && <button style={opSmall} onClick={csv}><Icon n="file" /> CSV</button>}
          {waiting.length>0 && !mail && <button className="btn-primary" style={opBtn} onClick={()=>setMail({subject:tf("Wir haben geöffnet: {0}", hotel.name), text:[form.text, form.offer].filter(Boolean).join("\n\n")})}>{tf("Eröffnungs-Mail an alle Bestätigten senden")}</button>}
        </div>
        {d.signups.length===0 && <div style={{fontSize:13.5,color:INK_MUTED,marginTop:6}}>{tf("Noch keine Einträge.")}</div>}
        {d.signups.map(s=>{ const [c,bg,l] = stateOf(s); return (
          <div key={s.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:1,minWidth:180}} data-no-i18n="">{s.name ? s.name+" · " : ""}{s.email}</span>
            <span style={{fontSize:12,color:INK_MUTED}}>{fmtDate(s.created_at)}</span>
            <Pill color={c} bg={bg}>{l}</Pill>
            <button style={{...opSmall,color:BAD}} aria-label={tf("Eintrag löschen")} onClick={()=>window.confirm(tf("Eintrag endgültig löschen?")) && run(()=>api("/api/waitlist-signups/"+s.id,"DELETE"))}>✕</button>
          </div>); })}
      </Card>
      {mail && <Card style={{borderColor:BRASS}}>
        <b>{tf("Eröffnungs-Mail")}</b>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Geht an {0} bestätigte Einträge, die noch keine Eröffnungs-Mail bekommen haben. Anrede und Abmeldelink kommen automatisch dazu.", waiting.length)}</div>
        <Field label={tf("Betreff")}><input className="input" maxLength={160} value={mail.subject} onChange={e=>setMail({...mail,subject:e.target.value})} /></Field>
        <Field label={tf("Text")}><textarea className="input" rows={7} maxLength={6000} value={mail.text} onChange={e=>setMail({...mail,text:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}>
          <button style={{...btnLine,minHeight:44}} onClick={()=>setMail(null)}>{tf("Abbrechen")}</button>
          <button className="btn-primary" style={opBtn} disabled={busy || !mail.subject.trim() || !mail.text.trim()} onClick={async()=>{ if(!window.confirm(tf("Jetzt an {0} Personen senden?", waiting.length))) return; if(await run(()=>api("/api/hotels/"+hotel.id+"/waitlist/send","POST",mail), (r)=>tf("{0} Mails werden im Hintergrund verschickt.", r && r.queued))) setMail(null); }}>{tf("Senden")}</button>
        </div>
      </Card>}
    </div>
  );
}

// ------------------------------------------------------------ 5. Barrierefreiheit
const OP_ROOM_FLAGS = [["step_free","stufenlos erreichbar"],["wide_door","breite Tür (mind. 90 cm)"],["roll_in_shower","bodengleiche Dusche"],["grab_bars","Haltegriffe im Bad"],["lowered_bed","unterfahrbares / niedriges Bett"],["hearing_loop","Höranlage (Induktion)"],["visual_alarm","optischer Alarm"]];
const OP_AREAS = [["entrance","Eingang",[["step_free","stufenlos"],["automatic_door","automatische Tür"]]],["parking","Parken",[["accessible_spaces","Behindertenparkplätze"],["near_entrance","nahe am Eingang"]]],
  ["elevator","Aufzug",[["available","vorhanden"],["wheelchair_size","rollstuhlgerecht"]]],["restaurant","Restaurant",[["step_free","stufenlos"],["accessible_table","unterfahrbare Tische"]]],
  ["spa","Wellness",[["step_free","stufenlos"],["pool_lift","Poollift"]]],["toilets","Toiletten",[["accessible_public","öffentliche barrierefreie Toilette"]]]];
function OpAccessibilityView({hotel, api}){
  const [d,setD] = useState(null); const [info,setInfo] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false); const [lang,setLang] = useState("de");
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/accessibility").then(x=>{ setD(x); setInfo(i=>i||x.info); }).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  if(d===false) return opMsg(msg);
  const setArea = (a, k, v) => setInfo({...info, areas:{...info.areas, [a]:{...info.areas[a], [k]:v}}});
  const saveInfo = async () => { setBusy(true); setMsg(null); try { await api("/api/hotels/"+hotel.id+"/accessibility","PUT",{...info, saved:true}); setMsg({ok:true,text:tf("Gespeichert.")}); load(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const saveRoom = async (r, acc) => { setMsg(null); setD({...d, rooms:d.rooms.map(x=>x.id===r.id?{...x,accessibility:acc}:x)});
    try { await api("/api/rooms/"+r.id+"/accessibility","PUT",acc); load(); } catch(e){ setMsg({ok:false,text:e.message}); load(); } };
  const c = d.public.rooms;
  const summary = OP_ROOM_FLAGS.filter(([k])=>c[k]>0).map(([k,l])=>tf("{0} Zimmer", c[k])+" "+translateString(l));
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Was Ihr Haus für Gäste mit Behinderung bietet – je Zimmer und für die Bereiche. Daraus entsteht ein ehrlicher Infotext für Website und Buchungsportale: Es steht nur drin, was hier angehakt ist.")}</div>
      {opMsg(msg)}
      <Card style={{marginBottom:14,borderColor:BRASS}}>
        <b>{tf("Übersicht")}</b>
        <div style={{fontSize:14,marginTop:6}}>{summary.length ? summary.join(", ") : tf("Noch keine Zimmer mit besonderer Ausstattung angegeben.")}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
          <b style={{flex:1,fontSize:13.5}}>{tf("Infotext für Gäste")}</b>
          <select className="input" style={{width:"auto"}} aria-label={tf("Sprache")} value={lang} onChange={e=>setLang(e.target.value)}><option value="de">Deutsch</option><option value="en">English</option></select>
          <button style={opSmall} onClick={()=>opCopy(d.public.text[lang], setMsg)}>{tf("Kopieren")}</button>
        </div>
        <textarea className="input" readOnly rows={7} aria-label={tf("Infotext für Gäste")} data-no-i18n="" value={d.public.text[lang]} style={{marginTop:6,fontSize:13}} dir="ltr" />
      </Card>
      <Card style={{marginBottom:14}}>
        <b>{tf("Bereiche des Hauses")}</b>
        {OP_AREAS.map(([a,label,flags])=>(
          <div key={a} style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`}}>
            <div style={{fontWeight:600,fontSize:13.5}}>{translateString(label)}</div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              {flags.map(([k,l])=><label key={k} style={{display:"flex",gap:6,alignItems:"center",fontSize:13.5,minHeight:44,cursor:"pointer"}}><input type="checkbox" style={{width:20,height:20}} checked={!!info.areas[a][k]} onChange={e=>setArea(a,k,e.target.checked)} /> {translateString(l)}</label>)}
            </div>
            <input className="input" maxLength={200} aria-label={tf("Notiz")+": "+translateString(label)} placeholder={tf("Notiz, z. B. Rampe am Seiteneingang")} value={info.areas[a].note||""} onChange={e=>setArea(a,"note",e.target.value)} />
          </div>))}
        <Field label={tf("Weitere Hinweise für Gäste")}><textarea className="input" rows={3} maxLength={1000} value={info.note||""} onChange={e=>setInfo({...info,note:e.target.value})} /></Field>
        <button className="btn-primary" style={opBtn} disabled={busy} onClick={saveInfo}>{tf("Speichern")}</button>
      </Card>
      <Card>
        <b>{tf("Zimmer")}</b>
        {d.rooms.length===0 && <div style={{fontSize:13.5,color:INK_MUTED,marginTop:6}}>{tf("Noch keine Zimmer angelegt.")}</div>}
        {d.rooms.map(r=><OpRoomAccess key={r.id} room={r} onSave={saveRoom} />)}
      </Card>
    </div>
  );
}
function OpRoomAccess({room, onSave}){
  const a = room.accessibility || {}; const [note,setNote] = useState(a.note||"");
  return (
    <div style={{padding:"8px 0",borderTop:`1px solid ${BORDER}`}}>
      <b data-no-i18n="">{room.number}</b> <span style={{fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{room.room_type||""}</span>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {OP_ROOM_FLAGS.map(([k,l])=><label key={k} style={{display:"flex",gap:6,alignItems:"center",fontSize:13,minHeight:44,cursor:"pointer"}}><input type="checkbox" style={{width:20,height:20}} checked={!!a[k]} onChange={e=>onSave(room,{...a,note,[k]:e.target.checked})} /> {translateString(l)}</label>)}
      </div>
      <input className="input" maxLength={300} aria-label={tf("Notiz")+": "+room.number} placeholder={tf("Notiz, z. B. Türbreite 92 cm")} value={note} onChange={e=>setNote(e.target.value)} onBlur={()=>{ if(note!==(a.note||"")) onSave(room,{...a,note}); }} />
    </div>
  );
}

// ------------------------------------------------------------ 6. Ereignisse in der Stadt
// Nachbarländer, aus denen Gäste kommen (nur Länder, die holidays.js kennt; Schweiz u. a. nur je Kanton)
const OP_NEIGHBORS = {AT:["DE","IT","CH","CZ","HU","SI","SK"], DE:["AT","CH","FR","NL","BE","LU","DK","PL","CZ"], CH:["DE","AT","IT","FR","LI"], IT:["AT","CH","FR","SI"],
  FR:["DE","CH","IT","ES","BE","LU"], ES:["FR","PT"], PT:["ES"], NL:["DE","BE"], GB:["IE","FR"], IE:["GB"], US:["CA","MX"]};
const OP_COUNTRY_NAMES = {"österreich":"AT","austria":"AT","deutschland":"DE","germany":"DE","schweiz":"CH","switzerland":"CH","suisse":"CH","italien":"IT","italy":"IT","italia":"IT","frankreich":"FR","france":"FR",
  "spanien":"ES","spain":"ES","españa":"ES","portugal":"PT","niederlande":"NL","netherlands":"NL","großbritannien":"GB","vereinigtes königreich":"GB","united kingdom":"GB","england":"GB","irland":"IE","ireland":"IE","usa":"US","united states":"US"};
function opHotelCountry(hotel){
  if(hotel.holiday_region) return hotel.holiday_region.slice(0,2);
  const c = String(hotel.country||"").trim(); if(/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  return OP_COUNTRY_NAMES[c.toLowerCase()] || "AT";
}
// Feiertagsregion zu einem Land: das Land selbst oder die erste bekannte Region (z. B. CH-ZH, GB-ENG)
function opRegionOf(code){
  const all = window.HOLIDAY_REGIONS || [];
  return all.includes(code) ? code : all.find(r=>r.indexOf(code+"-")===0) || null;
}
function opHolidays(hotel, from, to){
  if(typeof window.holidayMap!=="function") return [];
  const own = opHotelCountry(hotel), out = [];
  const regions = [[hotel.holiday_region || opRegionOf(own), own, true]].concat((OP_NEIGHBORS[own]||[]).map(c=>[opRegionOf(c), c, false]));
  const seen = new Set();
  regions.forEach(([reg, code, isOwn])=>{ if(!reg || seen.has(code)) return; seen.add(code);
    const m = window.holidayMap(reg, from, to); Object.keys(m).forEach(date=>out.push({date, name:m[date], code, own:isOwn})); });
  return out;
}
const opCountryName = (c) => { try { return new Intl.DisplayNames([UI_LANG||"de"],{type:"region"}).of(c) || c; } catch(e){ return c; } };
const OP_IMPACT = {niedrig:[INK_MUTED,PAPER], mittel:[WARN,WARN_SOFT], hoch:[BAD,BAD_SOFT]};
function CityEventsCard({hotel, api}){
  const [list,setList] = useState(null);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/city-events").then(l=>setList(Array.isArray(l)?l:[])).catch(()=>setList(false)); },[api, hotel.id]);
  if(list===false) return null; // Migration fehlt oder keine Rechte
  const from = todayIso(), to = addDaysIso(from, 30);
  const evs = (list||[]).filter(e=>(e.end_date||e.start_date)>=from && e.start_date<=to).map(e=>({kind:"event", date:e.start_date<from?from:e.start_date, ...e}));
  // Feiertage desselben Tages zusammenfassen (z. B. Allerheiligen in mehreren Ländern)
  const hol = {}; opHolidays(hotel, from, to).forEach(h=>{ (hol[h.date]=hol[h.date]||[]).push(h); });
  const items = evs.concat(Object.keys(hol).map(date=>({kind:"holiday", date, list:hol[date]}))).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.kind==="event"?-1:1);
  const high = evs.filter(e=>e.impact==="hoch");
  return (
    <Card style={{marginBottom:14}}>
      <b><Icon n="calendar" /> {tf("Die nächsten 30 Tage")}</b>
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:6}}>{tf("Ereignisse in der Stadt und Feiertage im eigenen Land und in den Nachbarländern")}</div>
      {high.length>0 && <div role="status" style={{background:BAD_SOFT,color:BAD,borderRadius:8,padding:"8px 10px",fontSize:13,marginBottom:8,fontWeight:600}}>{tf("{0} Ereignisse mit hoher Wirkung – mehr Personal einplanen.", high.length)}</div>}
      {list===null && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt …")}</div>}
      {list && items.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Nichts Besonderes in den nächsten 30 Tagen.")}</div>}
      {items.map(x=> x.kind==="event" ? (
        <div key={"e"+x.id} style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <span style={{width:92,flexShrink:0,color:INK_MUTED,fontSize:12.5}}>{fmtDay(x.start_date,{weekday:"short",day:"2-digit",month:"2-digit"})}{x.end_date && x.end_date!==x.start_date ? "–"+fmtDay(x.end_date,{day:"2-digit",month:"2-digit"}) : ""}</span>
          <b style={{flex:1,minWidth:120}} data-no-i18n="">{x.title}</b>
          <Pill color={(OP_IMPACT[x.impact]||OP_IMPACT.mittel)[0]} bg={(OP_IMPACT[x.impact]||OP_IMPACT.mittel)[1]}>{tf(x.impact||"mittel")}</Pill>
          {x.impact==="hoch" && <span style={{width:"100%",fontSize:12,color:BAD,paddingInlineStart:100}}>{tf("Mehr Personal einplanen")}</span>}
        </div>) : (
        <div key={"h"+x.date} style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
          <span style={{width:92,flexShrink:0,color:INK_MUTED,fontSize:12.5}}>{fmtDay(x.date,{weekday:"short",day:"2-digit",month:"2-digit"})}</span>
          <span style={{flex:1,minWidth:120}}>{x.list.map(h=><span key={h.code} style={{marginInlineEnd:10}}><span data-no-i18n="">{h.name}</span> <span style={{color:INK_MUTED,fontSize:12}}>({opCountryName(h.code)}{h.own?" · "+translateString("eigenes Land"):""})</span></span>)}</span>
        </div>))}
    </Card>
  );
}
function OpCityEventsView({hotel, api}){
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false); const [k,setK] = useState(0);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/city-events").then(l=>setList(Array.isArray(l)?l:[])).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const today = todayIso();
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); load(); setK(k+1); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } finally { setBusy(false); } };
  const save = async () => { const {id, ...b} = form; const body = {title:b.title, start_date:b.start_date, end_date:b.end_date||null, impact:b.impact, note:b.note||null};
    if(await run(()=> id ? api("/api/city-events/"+id,"PATCH",body) : api("/api/hotels/"+hotel.id+"/city-events","POST",body))) setForm(null); };
  const upcoming = (list||[]).filter(e=>(e.end_date||e.start_date)>=today), past = (list||[]).filter(e=>(e.end_date||e.start_date)<today);
  return (
    <div>
      <div style={{fontSize:13.5,color:INK_MUTED,marginBottom:12}}>{tf("Messen, Konzerte, Sportereignisse und Märkte in der Umgebung – damit Dienstplan, Preise und Einkauf rechtzeitig darauf reagieren.")}</div>
      {opMsg(msg)}
      <CityEventsCard key={k} hotel={hotel} api={api} />
      {!form && <button className="btn-primary" style={{...opBtn,marginBottom:12}} onClick={()=>setForm({title:"",start_date:today,end_date:"",impact:"mittel",note:""})}>+ {tf("Ereignis")}</button>}
      {form && <Card style={{marginBottom:14}}>
        <Field label={tf("Was?")}><input className="input" maxLength={160} placeholder={tf("z. B. Stadtmarathon")} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></Field>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Von")}><input className="input" type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} /></Field>
          <Field label={tf("Bis (optional)")}><input className="input" type="date" value={form.end_date||""} onChange={e=>setForm({...form,end_date:e.target.value})} /></Field>
          <Field label={tf("Wirkung aufs Haus")}><select className="input" value={form.impact} onChange={e=>setForm({...form,impact:e.target.value})}>{["niedrig","mittel","hoch"].map(x=><option key={x} value={x}>{tf(x)}</option>)}</select></Field>
        </div>
        <Field label={tf("Notiz")}><input className="input" maxLength={1000} value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button style={{...btnLine,minHeight:44}} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          <button className="btn-primary" style={opBtn} disabled={busy || !form.title.trim() || !form.start_date} onClick={save}>{tf("Speichern")}</button></div>
      </Card>}
      {list && <Card>
        <b>{tf("Ereignisse")}</b>
        {upcoming.length===0 && <div style={{fontSize:13.5,color:INK_MUTED,marginTop:6}}>{tf("Keine kommenden Ereignisse eingetragen.")}</div>}
        {upcoming.concat(past.slice(-10).reverse()).map(e=>(
          <div key={e.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5,opacity:(e.end_date||e.start_date)<today?0.6:1}}>
            <span style={{width:150,flexShrink:0,fontSize:12.5,color:INK_MUTED}}>{fmtDate(e.start_date)}{e.end_date && e.end_date!==e.start_date ? " – "+fmtDate(e.end_date) : ""}</span>
            <span style={{flex:1,minWidth:140}}><b data-no-i18n="">{e.title}</b>{e.note ? <span data-no-i18n="" style={{color:INK_MUTED}}> · {e.note}</span> : null}</span>
            <Pill color={(OP_IMPACT[e.impact]||OP_IMPACT.mittel)[0]} bg={(OP_IMPACT[e.impact]||OP_IMPACT.mittel)[1]}>{tf(e.impact||"mittel")}</Pill>
            <button style={opSmall} onClick={()=>setForm({...e, end_date:e.end_date||"", note:e.note||""})}>{tf("Bearbeiten")}</button>
            <button style={{...opSmall,color:BAD}} aria-label={tf("Ereignis löschen")} onClick={()=>window.confirm(tf("Ereignis löschen?")) && run(()=>api("/api/city-events/"+e.id,"DELETE"))}>✕</button>
          </div>))}
      </Card>}
    </div>
  );
}
