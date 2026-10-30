// ============================================================ Migration 043 B: Betrieb & Geld – Preisanstieg im Einkauf, Mahnwesen,
// Schwund (Lagerabgang gegen Kassenverkäufe), Lastspitzen. Rechte prüft die Datenbank; die Oberfläche blendet nur aus.

const bgmTh = {textAlign:"start",padding:6,fontWeight:600};
const bgmThR = {...bgmTh,textAlign:"end"};
const bgmTd = {padding:6};
const bgmTdR = {padding:6,textAlign:"end"};
const bgmPct = (p) => p==null ? "–" : (p>0?"+":"")+Number(p).toLocaleString(UI_LOCALE,{maximumFractionDigits:1})+" %";
const bgmNum = (n, d) => n==null ? "–" : Number(n).toLocaleString(UI_LOCALE,{maximumFractionDigits:d==null?2:d});
const bgmPctColor = (p) => p==null ? INK_MUTED : p>=10 ? BAD : p>=5 ? WARN_TEXT : p<0 ? GOOD_TEXT : INK;
const bgmApiBase = () => ((typeof LAST_API!=="undefined" && LAST_API && LAST_API.url) || DEFAULT_CONFIG.backendUrl).replace(/\/$/,"");
function BgmHead({title, intro}){
  return <div style={{marginBottom:12}}><h2 className="ui-h" style={{fontFamily:"Fraunces, serif",fontSize:20,fontWeight:600,marginBottom:4}}>{title}</h2>{intro && <div style={{fontSize:13.5,color:INK_MUTED}}>{intro}</div>}</div>;
}
function BgmTabs({tabs, value, onChange}){
  return <div role="tablist" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
    {tabs.map(([k,label])=><button key={k} role="tab" aria-selected={value===k} style={{...opSmall,background:value===k?INK:"#fff",color:value===k?"#fff":INK}} onClick={()=>onChange(k)}>{label}</button>)}
  </div>;
}
// Kleiner Preisverlauf (Balken) – nur Schmuck, die Zahlen stehen daneben
function BgmSpark({points}){
  if(!points || points.length<2) return null;
  const max = Math.max(...points.map(p=>p.price)), min = Math.min(...points.map(p=>p.price)), w = 6, gap = 2;
  return <svg aria-hidden="true" width={points.length*(w+gap)} height={28} style={{display:"block"}}>
    {points.map((p,i)=>{ const h = max===min ? 14 : 6+Math.round((p.price-min)*20/(max-min)); return <rect key={i} x={i*(w+gap)} y={28-h} width={w} height={h} rx={1} fill={i===points.length-1?BRASS:BORDER} />; })}
  </svg>;
}

// ------------------------------------------------------------ 1. Preisanstieg
function BgPriceWatchView({hotel, api}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [onlyWarn,setOnlyWarn] = useState(false); const [q,setQ] = useState(""); const [open,setOpen] = useState(null);
  const [form,setForm] = useState(null); const [suppliers,setSuppliers] = useState([]); const [invoices,setInvoices] = useState([]);
  const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/price-watch").then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  const startForm = () => {
    setForm({item_name:"", unit:"", unit_price:"", observed_on:todayIso(), supplier_id:"", supplier_name:"", source:"manuell", ref_id:""});
    api("/api/hotels/"+hotel.id+"/suppliers").then(l=>setSuppliers(Array.isArray(l)?l:[])).catch(()=>{});
    api("/api/hotels/"+hotel.id+"/price-watch/invoices").then(l=>setInvoices(Array.isArray(l)?l:[])).catch(()=>{});
  };
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function"?ok(r):ok}); load(); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } finally { setBusy(false); } };
  const save = async () => { const {ref_id, ...b} = form; const body = {...b, ref_id:form.source==="rechnung"?ref_id||null:null, supplier_id:b.supplier_id||null};
    if(await run(()=>api("/api/hotels/"+hotel.id+"/price-observations","POST",body), tf("Preis gespeichert."))) setForm({...form, item_name:"", unit:"", unit_price:""}); };
  const quote = (it) => run(()=>api("/api/hotels/"+hotel.id+"/price-watch/quote-request","POST",{item_name:it.item_name}),
    (r)=>r.existed ? tf("Für diesen Artikel gibt es schon eine offene Angebotsanfrage (Menü „Angebotsvergleich“).") : tf("Angebotsanfrage angelegt – Angebote im Menü „Angebotsvergleich“ eintragen."));
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  const items = d ? d.items : [];
  const shown = items.filter(it=>(!onlyWarn || it.warn) && (!q || it.item_name.toLowerCase().includes(q.toLowerCase())));
  const csv = () => opCsv([[tf("Artikel"),tf("Einheit"),tf("Aktueller Preis"),tf("Datum"),tf("Lieferant"),tf("vor 3 Monaten"),tf("vor 6 Monaten"),tf("vor 12 Monaten")]]
    .concat(items.map(it=>[it.item_name,it.unit||"",it.latest.price,it.latest.on,it.latest.supplier_name||"",...["m3","m6","m12"].map(k=>it.change[k]?it.change[k].pct:"")])), safeFile(translateString("Preisentwicklung")+" "+hotel.name+" "+todayIso())+".csv");
  const pickInvoice = (id) => { const inv = invoices.find(x=>x.id===id); setForm({...form, ref_id:id, supplier_id:inv&&inv.supplier_id||form.supplier_id, supplier_name:inv&&inv.supplier_name||form.supplier_name, observed_on:inv&&inv.invoice_date||form.observed_on}); };
  return (
    <div>
      <BgmHead title={tf("Preisentwicklung im Einkauf")} intro={tf("Stückpreise je Artikel aus Bestellungen, Rechnungen und eigenen Einträgen. Ab 10 % Anstieg gegenüber vor 3, 6 oder 12 Monaten gibt es eine Warnung.")} />
      {opMsg(msg)}
      {d && d.warn_count>0 && <Card style={{marginBottom:12,borderColor:BAD,background:BAD_SOFT,fontSize:13.5}}><b><Icon n="alert" /> {tf("{0} Artikel sind um 10 % oder mehr teurer geworden.", d.warn_count)}</b></Card>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        {!form && <button className="btn-primary" style={opBtn} onClick={startForm}>+ {tf("Preis eintragen")}</button>}
        <input className="input" style={{width:"auto",flex:"1 1 160px",minHeight:44}} aria-label={tf("Artikel suchen")} placeholder={tf("Artikel suchen")} value={q} onChange={e=>setQ(e.target.value)} />
        <label style={{display:"inline-flex",gap:6,alignItems:"center",fontSize:13.5,minHeight:44}}><input type="checkbox" checked={onlyWarn} onChange={e=>setOnlyWarn(e.target.checked)} /> {tf("nur Warnungen")}</label>
        {items.length>0 && <button style={opSmall} onClick={csv}><Icon n="file" /> {tf("Excel/CSV")}</button>}
      </div>
      {form && <Card style={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("Artikel")}><input className="input" list="bgm-items" maxLength={120} value={form.item_name} onChange={e=>setForm({...form,item_name:e.target.value})} /></Field>
          <Field label={tf("Einheit")}><input className="input" maxLength={30} placeholder={tf("z. B. kg, Flasche, Karton")} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} /></Field>
          <Field label={tf("Stückpreis netto")}><input className="input" inputMode="decimal" value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})} /></Field>
          <Field label={tf("Datum")}><input className="input" type="date" max={todayIso()} value={form.observed_on} onChange={e=>setForm({...form,observed_on:e.target.value})} /></Field>
          <Field label={tf("Quelle")}><select className="input" value={form.source} onChange={e=>setForm({...form,source:e.target.value,ref_id:""})}>
            <option value="manuell">{tf("Eigener Eintrag (z. B. Preisliste)")}</option><option value="rechnung">{tf("Eingangsrechnung")}</option></select></Field>
          {form.source==="rechnung" && <Field label={tf("Rechnung")}><select className="input" value={form.ref_id} onChange={e=>pickInvoice(e.target.value)}>
            <option value="">{tf("– wählen –")}</option>
            {invoices.map(x=><option key={x.id} value={x.id} data-no-i18n="">{[x.supplier_name, x.invoice_number, x.invoice_date?fmtDate(x.invoice_date):null].filter(Boolean).join(" · ")}</option>)}</select></Field>}
        </div>
        <datalist id="bgm-items">{items.map(it=><option key={it.key} value={it.item_name} />)}</datalist>
        <OpSupplierInput suppliers={suppliers} value={form} onChange={(v)=>setForm({...form,...v})} />
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Eingangsrechnungen haben in Ouverture keine Einzelpositionen – den Stückpreis bitte von der Rechnung abschreiben.")}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={{...btnLine,minHeight:44}} onClick={()=>setForm(null)}>{tf("Schließen")}</button>
          <button className="btn-primary" style={opBtn} disabled={busy || !form.item_name.trim() || !form.unit_price} onClick={save}>{tf("Speichern")}</button></div>
      </Card>}
      {d && items.length===0 && <Card style={{fontSize:13.5}}>{tf("Noch keine Preise. Trag Preise aus Preislisten oder Rechnungen ein. Bestellungen fließen automatisch ein, sobald ihre Positionen einen Stückpreis haben.")}</Card>}
      {shown.length>0 && <Card style={{padding:0}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
        <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={bgmTh}>{tf("Artikel")}</th><th style={bgmThR}>{tf("Aktuell")}</th><th style={bgmThR}>{tf("3 Mon.")}</th><th style={bgmThR}>{tf("6 Mon.")}</th><th style={bgmThR}>{tf("12 Mon.")}</th><th style={bgmTh}><span className="sr-only">{tf("Aktionen")}</span></th></tr></thead>
        <tbody>{shown.map(it=><React.Fragment key={it.key}>
          <tr style={{borderTop:`1px solid ${BORDER}`,background:it.warn?BAD_SOFT:undefined}}>
            <td style={bgmTd}><button style={{all:"unset",cursor:"pointer",minHeight:44,display:"flex",flexDirection:"column",justifyContent:"center"}} aria-expanded={open===it.key} onClick={()=>setOpen(open===it.key?null:it.key)}>
              <b data-no-i18n="">{it.item_name}{it.unit ? " / "+it.unit : ""}</b>
              <span style={{fontSize:12,color:INK_MUTED}}>{fmtDate(it.latest.on)}{it.latest.supplier_name ? <span data-no-i18n=""> · {it.latest.supplier_name}</span> : null} · {tf("{0} Preise", it.count)}</span></button></td>
            <td style={{...bgmTdR,fontWeight:600}}>{money(it.latest.price)}</td>
            {["m3","m6","m12"].map(k=><td key={k} style={{...bgmTdR,color:bgmPctColor(it.change[k]&&it.change[k].pct),fontWeight:it.change[k]&&it.change[k].pct>=10?700:400}}>{it.change[k] ? bgmPct(it.change[k].pct) : "–"}</td>)}
            <td style={bgmTd}>{it.warn && <button style={opSmall} disabled={busy} onClick={()=>quote(it)}>{tf("Angebot einholen")}</button>}</td>
          </tr>
          {open===it.key && <tr><td colSpan={6} style={{padding:"6px 10px 12px",background:PAPER}}>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-end",marginBottom:8}}>
              <BgmSpark points={it.history} />
              <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Spanne {0} – {1}", money(it.min), money(it.max))}{it.previous ? " · "+tf("zum vorigen Preis {0}", bgmPct(it.previous.pct)) : ""}</span>
              {!it.warn && <button style={opSmall} disabled={busy} onClick={()=>quote(it)}>{tf("Angebot einholen")}</button>}
            </div>
            {it.history.slice().reverse().map(h=><div key={h.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",fontSize:13,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}>
              <span style={{width:110}}>{fmtDate(h.on)}</span><b style={{width:90,textAlign:"end"}}>{money(h.price)}</b>
              <span style={{flex:1,color:INK_MUTED}}>{h.supplier_name ? <span data-no-i18n="">{h.supplier_name} · </span> : null}{tf(h.source==="bestellung"?"aus Bestellung":h.source==="rechnung"?"aus Rechnung":"eigener Eintrag")}</span>
              <button style={{...opSmall,color:BAD}} aria-label={tf("Preis löschen")} onClick={()=>window.confirm(tf("Diesen Preis löschen?")) && run(()=>api("/api/price-observations/"+h.id,"DELETE"))}>✕</button>
            </div>)}
          </td></tr>}
        </React.Fragment>)}</tbody>
      </table></div></Card>}
      <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Verglichen wird nur derselbe Artikel mit derselben Einheit. Ein anderer Lieferant oder eine andere Packungsgröße kann den Preis verzerren.")}</div>
    </div>
  );
}

// ------------------------------------------------------------ 2. Mahnwesen
const BGM_LEVELS = ["Zahlungserinnerung","1. Mahnung","2. Mahnung","Letzte Mahnung"];
function bgmReminderSheetHtml(hotel, inv, rem){
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, rem.subject, fmtDate(todayIso()))
    + '<div style="font-size:11.5px;margin:10px 0 16px;white-space:pre-line">'+fsEsc(inv.recipient)+'</div>'
    + '<div style="font-size:12px;line-height:1.55;white-space:pre-line">'+fsEsc(rem.text)+'</div>'+fsFoot()+'</div>';
}
function BgDunningView({hotel, api}){
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [settings,setSettings] = useState(null); const [can,setCan] = useState({}); const [edit,setEdit] = useState(null); const [show,setShow] = useState("due");
  const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/dunning").then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id]);
  useEffect(()=>{ load(); api("/api/hotels/"+hotel.id+"/money-settings").then(s=>{ setSettings(s.dunning_settings); setCan(s.can||{}); }).catch(()=>{}); },[load, api, hotel.id]);
  const saveSettings = async () => { setBusy(true); setMsg(null);
    try { const r = await api("/api/hotels/"+hotel.id+"/money-settings","PUT",{dunning_settings:settings}); setSettings(r.dunning_settings); setMsg({ok:true,text:tf("Gespeichert.")}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); } };
  const openEdit = async (inv, language) => { setMsg(null);
    try { const p = await api("/api/invoices/"+inv.id+"/reminder-preview?language="+(language||"de")); setEdit({inv, language:language||"de", attach:true, ...p}); }
    catch(e){ setMsg({ok:false,text:e.message}); } };
  const send = async (manual) => {
    if(manual && !window.confirm(tf("Als per Post verschickt vermerken? Es wird keine E-Mail gesendet."))) return;
    setBusy(true); setMsg(null);
    try {
      const body = {level:edit.level, manual:!!manual, email:edit.email, subject:edit.subject, text:edit.text, language:edit.language};
      if(!manual && edit.attach){ const blob = await sheetPdf(bgmReminderSheetHtml(hotel, edit.inv, edit), "mahnung.pdf", false, undefined, true); body.pdf = await blobToDataUrl(blob); }
      await api("/api/invoices/"+edit.inv.id+"/reminder","POST",body);
      setMsg({ok:true,text:manual ? tf("Vermerkt.") : tf("{0} an {1} gesendet.", translateString(BGM_LEVELS[edit.level]||""), edit.email)}); setEdit(null); load();
    } catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); }
  };
  const pdf = () => sheetPdf(bgmReminderSheetHtml(hotel, edit.inv, edit), safeFile(edit.subject)+".pdf").catch(opErr(setMsg));
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  const rows = d ? d.invoices.filter(r=>show==="all" ? true : show==="due" ? r.next && r.next.due_now : r.days_overdue>0) : [];
  const ag = d && d.aging;
  const setDays = (i, v) => { const days = settings.days.slice(); days[i] = v; setSettings({...settings, days}); };
  const setFee = (i, v) => { const fees = settings.fees.slice(); fees[i] = v; setSettings({...settings, fees}); };
  return (
    <div>
      <BgmHead title={tf("Mahnwesen")} intro={tf("Offene Ausgangsrechnungen nach Alter, Mahnstufen mit Vorschau und Versand per E-Mail. Mahnungen gehen nur raus, wenn du sie sendest – außer die Automatik ist eingeschaltet.")} />
      {opMsg(msg)}
      {ag && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:14}}>
        {[["not_due",tf("noch nicht fällig"),INK],["d0_30",tf("1–30 Tage überfällig"),WARN_TEXT],["d31_60",tf("31–60 Tage"),BAD],["d60p",tf("über 60 Tage"),BAD]].map(([k,l,c])=>(
          <Card key={k}><div style={{fontSize:12.5,color:INK_MUTED}}>{l}</div><div style={{fontSize:21,fontWeight:700,color:ag[k].amount>0?c:INK}}>{money(ag[k].amount)}</div><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("{0} Rechnungen", ag[k].count)}</div></Card>))}
      </div>}
      {edit && <Card style={{marginBottom:14,borderColor:BRASS}}>
        <b data-no-i18n="">{translateString(BGM_LEVELS[edit.level]||"")} · {edit.inv.number}</b>
        <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Neue Zahlungsfrist {0}", fmtDate(edit.pay_until))}{edit.fee>0 ? " · "+tf("Mahnspesen {0}", money(edit.fee)) : ""}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:"0 10px"}}>
          <Field label={tf("E-Mail an")}><input className="input" type="email" maxLength={200} value={edit.email} onChange={e=>setEdit({...edit,email:e.target.value})} /></Field>
          <Field label={tf("Sprache des Schreibens")}><select className="input" value={edit.language} onChange={e=>openEdit(edit.inv, e.target.value)}><option value="de">Deutsch</option><option value="en">English</option></select></Field>
        </div>
        <Field label={tf("Betreff")}><input className="input" maxLength={200} value={edit.subject} onChange={e=>setEdit({...edit,subject:e.target.value})} data-no-i18n="" /></Field>
        <Field label={tf("Text")}><textarea className="input" rows={12} maxLength={5000} value={edit.text} onChange={e=>setEdit({...edit,text:e.target.value})} /></Field>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44}}><input type="checkbox" checked={edit.attach} onChange={e=>setEdit({...edit,attach:e.target.checked})} /> {tf("Schreiben zusätzlich als PDF anhängen")}</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
          <button style={{...btnLine,minHeight:44}} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button>
          <button style={opSmall} onClick={pdf}><Icon n="filetext" /> {tf("PDF")}</button>
          <button style={opSmall} disabled={busy} onClick={()=>send(true)}>{tf("Per Post verschickt")}</button>
          <button className="btn-primary" style={opBtn} disabled={busy || !edit.email || !edit.subject.trim() || !edit.text.trim()} onClick={()=>send(false)}>{busy?"…":tf("Per E-Mail senden")}</button>
        </div>
      </Card>}
      {d && <BgmTabs value={show} onChange={setShow} tabs={[["due",tf("Jetzt mahnen ({0})", d.due_now)],["overdue",tf("Überfällig")],["all",tf("Alle offenen")]]} />}
      {d && rows.length===0 && <Card style={{fontSize:13.5,marginBottom:14}}>{show==="due" ? tf("Heute ist keine Mahnung fällig.") : tf("Keine Rechnungen in dieser Ansicht.")}</Card>}
      {rows.map(r=>(
        <Card key={r.id} style={{marginBottom:8,padding:12}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:180}}>
              <b data-no-i18n="">{r.number}</b> <span data-no-i18n="" style={{color:INK_MUTED}}>· {String(r.recipient||"").split("\n")[0]}</span>
              <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("fällig {0}", fmtDate(r.due_on))}{r.days_overdue>0 ? " · "+tf("{0} Tage überfällig", r.days_overdue) : ""}
                {r.reminders.length>0 ? " · "+tf("zuletzt: {0} am {1}", translateString(BGM_LEVELS[r.last_level]||""), fmtDate(r.reminders[r.reminders.length-1].sent_at)) : ""}</div>
            </div>
            <b>{money(r.open)}</b>
            {r.next ? <Pill color={r.next.due_now?BAD:INK_MUTED} bg={r.next.due_now?BAD_SOFT:PAPER}>{translateString(BGM_LEVELS[r.next.level])}{r.next.due_now ? "" : " "+tf("ab {0}", fmtDate(r.next.due_at))}</Pill>
              : r.final_reached ? <Pill color={WARN_TEXT} bg={WARN_SOFT}>{tf("alle Stufen verschickt")}</Pill> : null}
            {r.next && r.days_overdue>0 && d.can_send && <button style={opSmall} onClick={()=>openEdit(r)}>{tf("Vorschau")}</button>}
          </div>
        </Card>))}
      {settings && <Card style={{marginTop:16}}>
        <b>{tf("Einstellungen")}</b>
        {!can.dunning && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:4}}>{tf("Ändern können ein Admin oder die Leitung Finanzen.")}</div>}
        <fieldset disabled={!can.dunning} style={{border:0,padding:0,margin:"8px 0 0"}}>
          <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44}}><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked,auto:e.target.checked&&settings.auto})} /> {tf("Mahnwesen verwenden")}</label>
          <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontSize:13.5,marginBottom:8}}>
            <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={bgmTh}>{tf("Stufe")}</th><th style={bgmTh}>{tf("Tage nach Fälligkeit bzw. voriger Stufe")}</th><th style={bgmTh}>{tf("Mahnspesen")}</th></tr></thead>
            <tbody>{settings.days.map((x,i)=><tr key={i}>
              <td style={bgmTd}>{translateString(BGM_LEVELS[i])}</td>
              <td style={bgmTd}><input className="input" style={{width:90}} type="number" min={1} max={120} aria-label={tf("Tage für {0}", translateString(BGM_LEVELS[i]))} value={x} onChange={e=>setDays(i, e.target.value)} /></td>
              <td style={bgmTd}><input className="input" style={{width:100}} inputMode="decimal" aria-label={tf("Mahnspesen für {0}", translateString(BGM_LEVELS[i]))} value={settings.fees[i]==null?"":settings.fees[i]} onChange={e=>setFee(i, e.target.value)} /></td>
            </tr>)}</tbody></table></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {settings.days.length<4 && <button style={opSmall} onClick={()=>setSettings({...settings,days:settings.days.concat([14]),fees:settings.fees.concat([0])})}>+ {tf("Stufe")}</button>}
            {settings.days.length>1 && <button style={opSmall} onClick={()=>setSettings({...settings,days:settings.days.slice(0,-1),fees:settings.fees.slice(0,-1)})}>− {tf("Stufe")}</button>}
          </div>
          <Field label={tf("Neue Zahlungsfrist in Tagen")}><input className="input" style={{maxWidth:120}} type="number" min={3} max={60} value={settings.pay_days} onChange={e=>setSettings({...settings,pay_days:e.target.value})} /></Field>
          <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44}}><input type="checkbox" disabled={!settings.enabled} checked={settings.auto} onChange={e=>setSettings({...settings,auto:e.target.checked})} /> {tf("Fällige Mahnungen jeden Morgen automatisch per E-Mail senden (ohne PDF, mit dem Standardtext)")}</label>
          <button className="btn-primary" style={{...opBtn,marginTop:8}} disabled={busy} onClick={saveSettings}>{tf("Speichern")}</button>
        </fieldset>
        <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Mahnspesen und Verzugszinsen sind rechtlich begrenzt – bitte mit Steuerberatung oder Rechtsberatung abstimmen. Die Mahnspesen stehen nur im Schreiben; die Rechnung selbst bleibt unverändert.")}</div>
      </Card>}
    </div>
  );
}

// ------------------------------------------------------------ 3. Schwund
const BGM_SALE_FIELDS = [["date","Datum",["datum","date","tag","day","geschäftstag","business date"]],["outlet","Outlet",["outlet","kasse","bereich","standort","register","location"]],
  ["sku","Artikelnummer",["sku","artikelnummer","artikel-nr","artikelnr","plu","nummer","code","item id","item_id"]],["item_name","Artikel",["artikel","artikelname","bezeichnung","name","item","produkt","product"]],
  ["qty","Menge",["menge","anzahl","qty","quantity","stück","stk","verkauft","sold"]]];
const BGM_LIGHT = {rot:[BAD,BAD_SOFT,"rot"], gelb:[WARN_TEXT,WARN_SOFT,"gelb"], gruen:[GOOD_TEXT,GOOD_SOFT,"grün"], grau:[INK_MUTED,PAPER,"keine Daten"]};
function BgShrinkageView({hotel, api}){
  const [from,setFrom] = useState(()=>{ const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); });
  const [to,setTo] = useState(todayIso());
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [tab,setTab] = useState("result"); const [imp,setImp] = useState(null); const [map,setMap] = useState({});
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/shrinkage?from="+from+"&to="+to).then(x=>{ setD(x); setMap({}); }).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id, from, to]);
  useEffect(()=>{ load(); },[load]);
  const readFile = async (file) => { setMsg(null);
    try { const rows = await readSpreadsheet(file); if(!rows.length) throw new Error(tf("Die Datei ist leer."));
      const heads = Object.keys(rows[0]), m = {};
      BGM_SALE_FIELDS.forEach(([k,,names])=>{ const h = heads.find(x=>names.includes(String(x).trim().toLowerCase())); m[k] = h || ""; });
      setImp({rows, heads, map:m, name:file.name}); }
    catch(e){ setMsg({ok:false,text:e.message}); } };
  const doImport = async () => { setBusy(true); setMsg(null);
    try { const rows = imp.rows.map(r=>{ const o = {}; BGM_SALE_FIELDS.forEach(([k])=>{ const h = imp.map[k]; o[k] = h ? r[h] : ""; }); o.date = gsDate(o.date); o.qty = gsNum(o.qty); o.sku = String(o.sku==null?"":o.sku).trim(); o.item_name = String(o.item_name==null?"":o.item_name).trim(); o.outlet = String(o.outlet==null?"":o.outlet).trim(); return o; }).filter(o=>o.date && o.qty!=null && (o.sku || o.item_name));
      if(!rows.length) throw new Error(tf("Keine Zeile mit Datum, Artikel und Menge erkannt – bitte die Spalten zuordnen."));
      const r = await api("/api/hotels/"+hotel.id+"/pos-items/import","POST",{rows});
      setMsg({ok:true,text:tf("{0} Verkaufszeilen übernommen.", r.saved)+(r.skipped_count ? " "+tf("{0} Zeilen übersprungen.", r.skipped_count) : "")}); setImp(null); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } finally { setBusy(false); } };
  const saveMap = async (it) => { const m = map[it.id] || {}; setMsg(null);
    try { await api("/api/stock-items/"+it.id+"/pos-mapping","PATCH",{pos_sku:m.pos_sku!==undefined?m.pos_sku:it.pos_sku||"", pos_units_per_stock:m.units!==undefined?m.units:it.pos_units_per_stock}); setMsg({ok:true,text:tf("Zuordnung gespeichert.")}); load(); }
    catch(e){ setMsg({ok:false,text:e.message}); } };
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  const rows = d ? d.rows : [], skus = d ? d.unmapped : [];
  const csv = () => opCsv([[tf("Artikel"),tf("Artikelnummer"),tf("Abgang Lager"),tf("Portionen"),tf("verkauft"),tf("Differenz"),tf("Schwund %")]].concat(rows.map(r=>[r.name,r.pos_sku,r.out_stock,r.portions,r.sold,r.diff,r.rate==null?"":r.rate])), safeFile(translateString("Schwund")+" "+hotel.name+" "+from+" "+to)+".csv");
  return (
    <div>
      <BgmHead title={tf("Schwund")} intro={tf("Vergleicht, was laut Lager entnommen wurde, mit dem, was die Kasse verkauft hat. Dafür jeden Lagerartikel einer Kassen-Artikelnummer zuordnen und angeben, wie viele Portionen eine Lagereinheit ergibt.")} />
      {opMsg(msg)}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
        <Field label={tf("Von")}><input className="input" type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} /></Field>
        <Field label={tf("Bis")}><input className="input" type="date" value={to} min={from} onChange={e=>setTo(e.target.value)} /></Field>
      </div>
      <BgmTabs value={tab} onChange={setTab} tabs={[["result",tf("Auswertung")],["map",tf("Zuordnung")],["import",tf("Kassenverkäufe")]]} />
      {tab==="result" && d && <div>
        {d.total_rate!=null && <Card style={{marginBottom:12}}><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Schwundquote gesamt (zugeordnete Artikel)")}</div><div style={{fontSize:22,fontWeight:700,color:d.total_rate>8?BAD:d.total_rate>3?WARN_TEXT:GOOD_TEXT}}>{bgmNum(d.total_rate,1)} %</div></Card>}
        {rows.length===0 && <Card style={{fontSize:13.5}}>{tf("Noch keine Lagerartikel zugeordnet (Reiter „Zuordnung“).")}</Card>}
        {rows.length>0 && <Card style={{padding:0}}>
          <div style={{display:"flex",justifyContent:"flex-end",padding:8}}><button style={opSmall} onClick={csv}><Icon n="file" /> {tf("Excel/CSV")}</button></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
          <thead><tr style={{color:INK_MUTED,fontSize:12}}><th style={bgmTh}>{tf("Artikel")}</th><th style={bgmThR}>{tf("Abgang Lager")}</th><th style={bgmThR}>{tf("= Portionen")}</th><th style={bgmThR}>{tf("verkauft")}</th><th style={bgmThR}>{tf("Differenz")}</th><th style={bgmThR}>{tf("Schwund")}</th></tr></thead>
          <tbody>{rows.map(r=>{ const L = BGM_LIGHT[r.light]||BGM_LIGHT.grau; return <tr key={r.id} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={bgmTd}><b data-no-i18n="">{r.name}</b><div style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{r.pos_sku} · 1 {r.unit} = {bgmNum(r.units_per_stock)}</div>{r.sold_more && <div style={{fontSize:12,color:WARN_TEXT}}>{tf("Mehr verkauft als entnommen – fehlen Entnahmen im Lager?")}</div>}</td>
            <td style={bgmTdR}>{bgmNum(r.out_stock)}</td><td style={bgmTdR}>{bgmNum(r.portions)}</td><td style={bgmTdR}>{bgmNum(r.sold)}</td>
            <td style={{...bgmTdR,fontWeight:600}}>{bgmNum(r.diff)}</td>
            <td style={bgmTdR}><Pill color={L[0]} bg={L[1]}>{r.rate==null ? tf(L[2]) : bgmNum(r.rate,1)+" %"}</Pill><span className="sr-only"> {tf(L[2])}</span></td>
          </tr>; })}</tbody></table></div></Card>}
        <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Ampel: bis 3 % grün, bis 8 % gelb, darüber rot. Lagerabgang = alle Minus-Buchungen im Zeitraum. Bruch, Personalgetränke, Verkostung, Einladungen und Rezepte mit mehreren Zutaten erscheinen ebenfalls als Differenz – die Zahl ist ein Hinweis, kein Beweis.")}</div>
      </div>}
      {tab==="map" && d && <div>
        <datalist id="bgm-skus">{skus.map(s=><option key={s.sku} value={s.sku}>{s.item_name}</option>)}{rows.map(r=><option key={r.id} value={r.pos_sku} />)}</datalist>
        {d.items.length===0 && <Card style={{fontSize:13.5}}>{tf("Noch keine Lagerartikel angelegt.")}</Card>}
        {d.items.map(it=>{ const m = map[it.id] || {}; const changed = m.pos_sku!==undefined || m.units!==undefined; return (
          <div key={it.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
            <span style={{flex:"1 1 160px"}}><b data-no-i18n="">{it.name}</b> <span style={{fontSize:12,color:INK_MUTED}} data-no-i18n="">{it.department} · {it.unit}</span></span>
            <input className="input" style={{width:150,minHeight:44}} list="bgm-skus" maxLength={80} aria-label={tf("Kassen-Artikelnummer für {0}", it.name)} placeholder={tf("Artikelnummer")} value={m.pos_sku!==undefined?m.pos_sku:it.pos_sku||""} onChange={e=>setMap({...map,[it.id]:{...m,pos_sku:e.target.value}})} />
            <input className="input" style={{width:90,minHeight:44}} inputMode="decimal" aria-label={tf("Portionen je Lagereinheit für {0}", it.name)} title={tf("Portionen je Lagereinheit")} value={m.units!==undefined?m.units:it.pos_units_per_stock} onChange={e=>setMap({...map,[it.id]:{...m,units:e.target.value}})} />
            <button style={opSmall} disabled={!changed} onClick={()=>saveMap(it)}>{tf("Speichern")}</button>
          </div>); })}
        <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>{tf("Beispiel: 1 Flasche Aperol (0,7 l) ergibt 14 Spritz – dann 14 eintragen. Leere Artikelnummer hebt die Zuordnung auf.")}</div>
        {skus.length>0 && <Card style={{marginTop:14}}><b>{tf("Verkaufte Artikel ohne Zuordnung")}</b>
          {skus.slice(0,40).map(s=><div key={s.sku} style={{display:"flex",gap:8,fontSize:13,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}><span style={{flex:1}} data-no-i18n="">{s.item_name} <span style={{color:INK_MUTED}}>({s.sku})</span></span><span>{bgmNum(s.qty)}</span></div>)}</Card>}
      </div>}
      {tab==="import" && <div>
        <Card style={{marginBottom:12}}>
          <b>{tf("Artikelverkäufe aus der Kasse (Excel/CSV)")}</b>
          <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 10px"}}>{tf("Spalten: Datum, Artikelnummer und/oder Artikelname, Menge, optional Outlet. Gleiche Artikel am selben Tag werden zusammengezählt; ein erneuter Import desselben Tages überschreibt.")}</div>
          {!imp && <FileButton label={tf("Datei wählen")} onFile={readFile} busy={busy} />}
          {imp && <div>
            <div style={{fontSize:13,marginBottom:8}} data-no-i18n="">{imp.name} · {imp.rows.length}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
              {BGM_SALE_FIELDS.map(([k,label])=><Field key={k} label={tf(label)}><select className="input" value={imp.map[k]} onChange={e=>setImp({...imp,map:{...imp.map,[k]:e.target.value}})}>
                <option value="">{tf("– keine –")}</option>{imp.heads.map(h=><option key={h} value={h} data-no-i18n="">{h}</option>)}</select></Field>)}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={{...btnLine,minHeight:44}} onClick={()=>setImp(null)}>{tf("Abbrechen")}</button>
              <button className="btn-primary" style={opBtn} disabled={busy || !imp.map.date || !imp.map.qty || !(imp.map.sku || imp.map.item_name)} onClick={doImport}>{busy?"…":tf("Übernehmen")}</button></div>
          </div>}
        </Card>
        <Card>
          <b>{tf("Direkt von der Kasse (Schnittstelle)")}</b>
          <div style={{fontSize:12.5,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Verwendet denselben geheimen Schlüssel wie die Tagesumsätze (Menü „Kasse“). Die Kassen-Firma sendet nach dem Tagesabschluss:")}</div>
          <pre style={{fontSize:12,background:PAPER,padding:10,borderRadius:6,whiteSpace:"pre-wrap",wordBreak:"break-all"}} data-no-i18n="">{"POST "+bgmApiBase()+"/api/public/pos-items/<SCHLÜSSEL>\nContent-Type: application/json\n\n{ \"items\": [ { \"date\": \"2026-10-24\", \"outlet\": \"Bar\", \"sku\": \"4711\", \"item_name\": \"Aperol Spritz\", \"qty\": 38 } ] }"}</pre>
          <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Höchstens 500 Zeilen je Aufruf. Noch nicht mit einer echten Kasse getestet.")}</div>
        </Card>
      </div>}
    </div>
  );
}

// ------------------------------------------------------------ 4. Lastspitzen
const bgmMonday = (d) => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; };
const bgmTime = (iso) => new Date(iso).toLocaleTimeString(UI_LOCALE,{hour:"2-digit",minute:"2-digit"});
const bgmDay = (iso) => new Date(iso).toLocaleDateString(UI_LOCALE,{weekday:"short",day:"2-digit",month:"2-digit"});
const bgmLocalIso = (date, hm) => { const [h,m] = String(hm||"00:00").split(":").map(Number); const x = new Date(date); x.setHours(h||0,m||0,0,0); return x.toISOString(); };
function BgPeakView({hotel, api}){
  const [week,setWeek] = useState(()=>bgmMonday(new Date()));
  const [d,setD] = useState(null); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false);
  const [can,setCan] = useState({}); const [settings,setSettings] = useState(null); const [shift,setShift] = useState(6);
  const [devForm,setDevForm] = useState(null); const [runForm,setRunForm] = useState(null); const [tab,setTab] = useState("week");
  const from = week.toISOString(), to = new Date(week.getTime()+7*86400000).toISOString();
  const money = moneyOf(hotel);
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/energy-peaks?from="+encodeURIComponent(from)+"&to="+encodeURIComponent(to)+"&max_shift_h="+shift).then(setD).catch(e=>{ setMsg({ok:false,text:e.message}); setD(false); }),[api, hotel.id, from, to, shift]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/money-settings").then(s=>{ setSettings(s.energy_peak_settings); setCan(s.can||{}); }).catch(()=>{}); },[api, hotel.id]);
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { const r = await fn(); if(ok) setMsg({ok:true,text:typeof ok==="function"?ok(r):ok}); await load(); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } finally { setBusy(false); } };
  const moveWeek = (n) => setWeek(new Date(week.getTime()+n*7*86400000));
  const days = [0,1,2,3,4,5,6].map(i=>new Date(week.getTime()+i*86400000));
  const devName = (id) => { const x = d && d.devices.find(v=>v.id===id); return x ? x.name : "?"; };
  const saveDevice = async () => { const {id, ...b} = devForm; if(await run(()=> id ? api("/api/energy-devices/"+id,"PATCH",b) : api("/api/hotels/"+hotel.id+"/energy-devices","POST",b), tf("Gespeichert."))) setDevForm(null); };
  const saveRun = async () => { const day = days[Number(runForm.day)]; const s = bgmLocalIso(day, runForm.start); let e = bgmLocalIso(day, runForm.end); if(e<=s) e = new Date(Date.parse(e)+86400000).toISOString();
    if(await run(()=>api("/api/hotels/"+hotel.id+"/device-runs","POST",{device_id:runForm.device_id, start_at:s, end_at:e, planned:runForm.planned}), tf("Lauf eingetragen."))) setRunForm({...runForm}); };
  const applyMoves = () => run(async()=>{ for(const m of d.suggestion.moves) await api("/api/device-runs/"+m.run_id,"PATCH",{start_at:m.to_start, end_at:m.to_end}); }, tf("Vorschlag übernommen."));
  const copyLast = () => run(()=>api("/api/hotels/"+hotel.id+"/device-runs/copy-week","POST",{from:new Date(week.getTime()-7*86400000).toISOString(), to:from}), (r)=>tf("{0} Läufe aus der Vorwoche übernommen.", r.copied));
  const saveSettings = () => run(async()=>{ const r = await api("/api/hotels/"+hotel.id+"/money-settings","PUT",{energy_peak_settings:settings}); setSettings(r.energy_peak_settings); }, tf("Gespeichert."));
  if(d===null) return <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>;
  const peak = d ? d.peak : null, sug = d ? d.suggestion : null, maxH = d ? Math.max(1, ...d.hours) : 1;
  const cellColor = (kw) => { if(!kw) return "#fff"; const t = kw/maxH; return t>0.85 ? BAD : t>0.6 ? WARN : t>0.3 ? BRASS_SOFT : GOOD_SOFT; };
  return (
    <div>
      <BgmHead title={tf("Lastspitzen")} intro={tf("Geräte mit Leistung und geplante Läufe ergeben die Last je Viertelstunde. Die höchste Viertelstunde bestimmt bei vielen Stromverträgen den Leistungspreis – flexible Geräte lassen sich oft verschieben.")} />
      {opMsg(msg)}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        <button style={opSmall} aria-label={tf("Vorige Woche")} onClick={()=>moveWeek(-1)}>‹</button>
        <b>{fmtDate(days[0].toISOString())} – {fmtDate(days[6].toISOString())}</b>
        <button style={opSmall} aria-label={tf("Nächste Woche")} onClick={()=>moveWeek(1)}>›</button>
        <button style={opSmall} onClick={()=>setWeek(bgmMonday(new Date()))}>{tf("Diese Woche")}</button>
      </div>
      <BgmTabs value={tab} onChange={setTab} tabs={[["week",tf("Wochenraster")],["runs",tf("Läufe")],["devices",tf("Geräte")]]} />
      {tab==="week" && d && <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:12}}>
          <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Spitze (15 Min.)")}</div><div style={{fontSize:22,fontWeight:700}}>{bgmNum(peak.kw,1)} kW</div><div style={{fontSize:12.5,color:INK_MUTED}}>{peak.at ? bgmDay(peak.at)+" "+bgmTime(peak.at) : "–"}</div></Card>
          {sug && sug.moves.length>0 && <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Mit Vorschlag")}</div><div style={{fontSize:22,fontWeight:700,color:GOOD_TEXT}}>{bgmNum(sug.after,1)} kW</div><div style={{fontSize:12.5,color:INK_MUTED}}>−{bgmNum(sug.before-sug.after,1)} kW</div></Card>}
          {sug && sug.saving_month!=null && sug.moves.length>0 && <Card><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Mögliche Ersparnis je Monat")}</div><div style={{fontSize:22,fontWeight:700,color:GOOD_TEXT}}>{money(sug.saving_month)}</div></Card>}
          {d.over_max>0 && <Card style={{borderColor:BAD,background:BAD_SOFT}}><div style={{fontSize:12.5}}>{tf("Über der Höchstleistung")}</div><div style={{fontSize:22,fontWeight:700,color:BAD}}>+{bgmNum(d.over_max,1)} kW</div></Card>}
        </div>
        <Card style={{marginBottom:12,padding:10}}>
          <div style={{overflowX:"auto"}}><table style={{borderCollapse:"separate",borderSpacing:2,fontSize:11}} aria-label={tf("Höchste Last je Stunde in kW")}>
            <thead><tr><th style={{padding:2}}><span className="sr-only">{tf("Tag")}</span></th>{Array.from({length:24},(_,h)=><th key={h} style={{padding:2,color:INK_MUTED,fontWeight:400,minWidth:22}}>{h}</th>)}</tr></thead>
            <tbody>{days.map((day,di)=><tr key={di}><th style={{padding:"2px 6px",textAlign:"start",whiteSpace:"nowrap",fontWeight:600}}>{bgmDay(day.toISOString())}</th>
              {Array.from({length:24},(_,h)=>{ const kw = d.hours[di*24+h]||0; return <td key={h} title={kw+" kW"} style={{background:cellColor(kw),border:`1px solid ${BORDER}`,height:24,minWidth:22,textAlign:"center",color:kw/maxH>0.6?"#fff":INK}}>{kw>0 ? Math.round(kw) : ""}</td>; })}</tr>)}</tbody>
          </table></div>
          <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{tf("Zahlen: höchste Viertelstunde der Stunde in kW (Zeiten in deiner Zeitzone).")}</div>
        </Card>
        {sug && <Card style={{marginBottom:12}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <b style={{flex:1}}>{tf("Vorschlag: flexible Geräte verschieben")}</b>
            <label style={{fontSize:13,display:"inline-flex",gap:6,alignItems:"center"}}>{tf("höchstens")} <select className="input" style={{width:"auto",minHeight:44}} value={shift} onChange={e=>setShift(Number(e.target.value))}>{[1,2,3,4,6,8,12].map(h=><option key={h} value={h}>{h} h</option>)}</select></label>
          </div>
          {sug.moves.length===0 && <div style={{fontSize:13.5,color:INK_MUTED,marginTop:6}}>{tf("Kein Vorschlag – die Spitze lässt sich mit den flexiblen, geplanten Läufen nicht senken.")}</div>}
          {sug.moves.map(m=><div key={m.run_id} style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:13.5,padding:"6px 0",borderTop:`1px solid ${BORDER}`}}>
            <b style={{flex:1}} data-no-i18n="">{m.device} ({bgmNum(m.kw)} kW)</b>
            <span>{bgmDay(m.from_start)} {bgmTime(m.from_start)} → {bgmTime(m.to_start)}</span>
            <span style={{color:INK_MUTED}}>{m.shift_min>0?"+":""}{m.shift_min} {tf("Min.")}</span></div>)}
          {sug.moves.length>0 && <button className="btn-primary" style={{...opBtn,marginTop:8}} disabled={busy} onClick={applyMoves}>{tf("Vorschlag übernehmen")}</button>}
          {sug.moves.length>0 && sug.saving_month==null && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:6}}>{tf("Für eine Ersparnis in Euro den Leistungspreis je kW und Monat eintragen (Reiter „Geräte“).")}</div>}
        </Card>}
        <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Ehrlich gesagt: Die Rechnung kennt nur die eingetragenen Geräte. Der Netzbetreiber misst die echte Spitze am Zähler – Grundlast, Lift, Küche ohne Eintrag usw. kommen dazu. Die Ersparnis entsteht nur, wenn genau diese Spitze die Monatsspitze ist und der Vertrag einen Leistungspreis hat.")}</div>
      </div>}
      {tab==="runs" && d && <div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {!runForm && <button className="btn-primary" style={opBtn} disabled={!d.devices.length} onClick={()=>setRunForm({device_id:d.devices[0]?d.devices[0].id:"", day:"0", start:"06:00", end:"08:00", planned:true})}>+ {tf("Lauf")}</button>}
          <button style={opSmall} disabled={busy} onClick={copyLast}>{tf("Läufe der Vorwoche übernehmen")}</button>
        </div>
        {!d.devices.length && <Card style={{fontSize:13.5,marginBottom:12}}>{tf("Zuerst Geräte anlegen (Reiter „Geräte“).")}</Card>}
        {runForm && <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:"0 10px"}}>
            <Field label={tf("Gerät")}><select className="input" value={runForm.device_id} onChange={e=>setRunForm({...runForm,device_id:e.target.value})}>{d.devices.map(x=><option key={x.id} value={x.id} data-no-i18n="">{x.name}</option>)}</select></Field>
            <Field label={tf("Tag")}><select className="input" value={runForm.day} onChange={e=>setRunForm({...runForm,day:e.target.value})}>{days.map((x,i)=><option key={i} value={i}>{bgmDay(x.toISOString())}</option>)}</select></Field>
            <Field label={tf("Beginn")}><input className="input" type="time" value={runForm.start} onChange={e=>setRunForm({...runForm,start:e.target.value})} /></Field>
            <Field label={tf("Ende")}><input className="input" type="time" value={runForm.end} onChange={e=>setRunForm({...runForm,end:e.target.value})} /></Field>
          </div>
          <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44}}><input type="checkbox" checked={runForm.planned} onChange={e=>setRunForm({...runForm,planned:e.target.checked})} /> {tf("geplant (darf verschoben werden, wenn das Gerät flexibel ist)")}</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={{...btnLine,minHeight:44}} onClick={()=>setRunForm(null)}>{tf("Schließen")}</button>
            <button className="btn-primary" style={opBtn} disabled={busy || !runForm.device_id} onClick={saveRun}>{tf("Speichern")}</button></div>
        </Card>}
        {d.runs.length===0 && <Card style={{fontSize:13.5}}>{tf("Keine Läufe in dieser Woche.")}</Card>}
        {d.runs.map(r=><div key={r.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <span style={{width:150}}>{bgmDay(r.start_at)} {bgmTime(r.start_at)}–{bgmTime(r.end_at)}</span>
          <b style={{flex:1}} data-no-i18n="">{devName(r.device_id)}</b>
          {!r.planned && <Pill color={INK_MUTED} bg={PAPER}>{tf("fest")}</Pill>}
          <button style={{...opSmall,color:BAD}} aria-label={tf("Lauf löschen")} onClick={()=>run(()=>api("/api/device-runs/"+r.id,"DELETE"))}>✕</button>
        </div>)}
      </div>}
      {tab==="devices" && d && <div>
        {!devForm && <button className="btn-primary" style={{...opBtn,marginBottom:12}} onClick={()=>setDevForm({name:"", kw:"", flexible:true, note:""})}>+ {tf("Gerät")}</button>}
        {devForm && <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:"0 10px"}}>
            <Field label={tf("Name")}><input className="input" maxLength={120} placeholder={tf("z. B. Bandspülmaschine")} value={devForm.name} onChange={e=>setDevForm({...devForm,name:e.target.value})} /></Field>
            <Field label={tf("Leistung (kW)")}><input className="input" inputMode="decimal" value={devForm.kw} onChange={e=>setDevForm({...devForm,kw:e.target.value})} /></Field>
          </div>
          <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,minHeight:44}}><input type="checkbox" checked={!!devForm.flexible} onChange={e=>setDevForm({...devForm,flexible:e.target.checked})} /> {tf("flexibel (Laufzeit lässt sich verschieben, z. B. Wäsche, Spülen, Laden)")}</label>
          <Field label={tf("Notiz")}><input className="input" maxLength={500} value={devForm.note||""} onChange={e=>setDevForm({...devForm,note:e.target.value})} /></Field>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={{...btnLine,minHeight:44}} onClick={()=>setDevForm(null)}>{tf("Abbrechen")}</button>
            <button className="btn-primary" style={opBtn} disabled={busy || !devForm.name.trim() || !devForm.kw} onClick={saveDevice}>{tf("Speichern")}</button></div>
        </Card>}
        {d.devices.map(x=><div key={x.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
          <b style={{flex:1}} data-no-i18n="">{x.name}</b><span>{bgmNum(x.kw)} kW</span>
          {x.flexible ? <Pill color={GOOD_TEXT} bg={GOOD_SOFT}>{tf("flexibel")}</Pill> : <Pill color={INK_MUTED} bg={PAPER}>{tf("fest")}</Pill>}
          <button style={opSmall} onClick={()=>setDevForm({...x, note:x.note||""})}>{tf("Bearbeiten")}</button>
          <button style={{...opSmall,color:BAD}} aria-label={tf("Gerät löschen")} onClick={()=>window.confirm(tf("Gerät mit allen Läufen löschen?")) && run(()=>api("/api/energy-devices/"+x.id,"DELETE"))}>✕</button>
        </div>)}
        {settings && <Card style={{marginTop:16}}>
          <b>{tf("Stromvertrag")}</b>
          {!can.energy && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:4}}>{tf("Ändern können ein Admin oder die Leitung Technik.")}</div>}
          <fieldset disabled={!can.energy} style={{border:0,padding:0,margin:"8px 0 0"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
              <Field label={tf("Leistungspreis je kW und Monat")}><input className="input" inputMode="decimal" value={settings.price_per_kw_month==null?"":settings.price_per_kw_month} onChange={e=>setSettings({...settings,price_per_kw_month:e.target.value})} /></Field>
              <Field label={tf("Vereinbarte Höchstleistung (kW)")}><input className="input" inputMode="decimal" value={settings.max_kw==null?"":settings.max_kw} onChange={e=>setSettings({...settings,max_kw:e.target.value})} /></Field>
            </div>
            <button className="btn-primary" style={opBtn} disabled={busy} onClick={saveSettings}>{tf("Speichern")}</button>
          </fieldset>
          <div style={{fontSize:12.5,color:INK_MUTED,marginTop:8}}>{tf("Beide Werte stehen auf der Stromrechnung oder im Netzvertrag. Ohne Leistungspreis zeigt Ouverture nur die kW.")}</div>
        </Card>}
      </div>}
    </div>
  );
}
