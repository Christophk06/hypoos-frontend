// ============================================================ Paket 046: Digitale Speisekarte – Karten, Abschnitte, Gerichte mit Allergenen A–R und Hinweisen,
// „ausverkauft“ per Klick, PDF zum Drucken, öffentliche Ansicht speisekarte.html (QR am Tisch, Gäste-Seite). Rechte prüft die Datenbank.

const MN_TAGS = [["vegan","vegan"],["vegetarisch","vegetarisch"],["glutenfrei","glutenfrei"],["laktosefrei","laktosefrei"],["scharf","scharf"],["regional","regional"],["neu","neu"],["empfehlung","Empfehlung"],["alkoholfrei","alkoholfrei"],["kinder","Kinder"]];
const MN_CARDS = [["Mittagskarte","11:30–14:00"],["Abendkarte","18:00–22:00"],["Getränke",""],["Weinkarte",""],["Frühstück","07:00–10:30"],["Kinderkarte",""]];
const MN_SECTIONS = ["Vorspeisen","Suppen","Hauptspeisen","Vegetarisch","Desserts","Alkoholfreie Getränke","Bier","Wein","Heißgetränke"];
const mnPublicUrl = (q) => { try { return new URL("speisekarte.html?"+q, location.href).href; } catch(e){ return "speisekarte.html?"+q; } };

function MenuView({hotel, api}){
  const [cards, loadCards] = useList(api, "/api/hotels/"+hotel.id+"/menu-cards");
  const [items, loadItems] = useList(api, "/api/hotels/"+hotel.id+"/menu-items");
  const [settings,setSettings] = useState(null); const [card,setCard] = useState(null); const [msg,setMsg] = useState(null);
  const [form,setForm] = useState(null); const [cform,setCform] = useState(null); const [view,setView] = useState("cards");
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/menu-settings").then(setSettings).catch(()=>setSettings(false)); },[api, hotel.id]);
  const sorted = [...(cards||[])].sort((a,b)=>(a.sort||0)-(b.sort||0) || a.name.localeCompare(b.name));
  const cur = sorted.find(c=>c.id===card) || sorted[0];
  const money = moneyOf(hotel);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); loadCards(); loadItems(); if(ok) setMsg({ok:true,text:ok}); return true; } catch(e){ setMsg({ok:false,text:e.message}); return false; } };
  const canEdit = settings && settings.can_edit;
  const its = (items||[]).filter(i=>cur && i.card_id===cur.id).sort((a,b)=>(a.sort||0)-(b.sort||0) || a.name.localeCompare(b.name));
  const sections = [...new Set(its.map(i=>i.section||""))];
  const toggle = (i) => run(()=>api("/api/menu-items/"+i.id,"PATCH",{sold_out:!i.sold_out}), i.sold_out ? tf("Wieder verfügbar.") : tf("Als ausverkauft markiert."));
  const pdf = () => {
    if(!cur) return;
    const legend = '<p style="font-size:9.5px;color:#6B7280">'+ALLERGENS.map(([k,l])=>k+' '+fsEsc(translateString(l))).join(" · ")+'</p>';
    const body = sections.map(sec=>'<h3 style="margin:10px 0 4px">'+fsEsc(sec||"")+'</h3>'+its.filter(i=>(i.section||"")===sec && i.active!==false).map(i=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid #F0ECE3"><div><b>'+fsEsc(i.name)+'</b>'+(i.allergens&&i.allergens.length?' <span style="font-size:9.5px;color:#6B7280">'+fsEsc(i.allergens.join(", "))+'</span>':'')+(i.tags&&i.tags.length?' <span style="font-size:9.5px;color:#3F7A5C">'+fsEsc(i.tags.map(t=>translateString((MN_TAGS.find(x=>x[0]===t)||[t,t])[1])).join(" · "))+'</span>':'')+(i.description?'<div style="font-size:10.5px;color:#374151">'+fsEsc(i.description)+'</div>':'')+'</div><div style="white-space:nowrap">'+(i.price_note?fsEsc(i.price_note)+' ':'')+(i.price!=null?fsEsc(money(i.price)):'')+'</div></div>').join("")).join("");
    const html = '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, cur.name, cur.hours||"")+(cur.note?'<p>'+fsEsc(cur.note)+'</p>':'')+body+'<h3 style="margin-top:14px">'+fsT("Allergene")+'</h3>'+legend+(settings&&settings.footer?'<p style="font-size:10px">'+fsEsc(settings.footer)+'</p>':'')+fsFoot()+'</div>';
    sheetPdf(html, safeFile(cur.name+" "+hotel.name)+".pdf", true).catch(opErr(setMsg));
  };
  const addStarter = () => run(async()=>{ for(const [n,h] of MN_CARDS.slice(0,3)) await api("/api/hotels/"+hotel.id+"/menu-cards","POST",{name:translateString(n), hours:h, sort:MN_CARDS.findIndex(x=>x[0]===n)}); }, tf("Karten angelegt."));
  return (
    <div>
      <BgmHead title={tf("Speisekarte")} intro={tf("Karten mit Allergenen und Hinweisen pflegen, Gerichte mit einem Klick als ausverkauft markieren und als QR-Code am Tisch oder auf der Gäste-Seite zeigen – automatisch in der Sprache des Gastes.")} />
      <BgmTabs value={view} onChange={(v)=>{ setView(v); setMsg(null); }} tabs={[["cards",tf("Karten")]].concat(canEdit?[["online",tf("Online & QR")]]:[])} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {view==="cards" && <div>
        {cards && cards.length===0 && <Card style={{marginBottom:12}}><div style={{fontSize:13.5,marginBottom:8}}>{tf("Noch keine Karte angelegt.")}</div>{canEdit && <button className="btn-primary" onClick={addStarter}>{tf("Mittagskarte, Abendkarte und Getränke anlegen")}</button>}</Card>}
        {sorted.length>0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
          {sorted.map(c=><button key={c.id} style={{...opSmall,background:cur&&cur.id===c.id?INK:"#fff",color:cur&&cur.id===c.id?"#fff":INK,opacity:c.active===false?0.6:1}} aria-pressed={!!(cur&&cur.id===c.id)} onClick={()=>setCard(c.id)}><span data-no-i18n="">{c.name}</span></button>)}
          {canEdit && <button style={linkBtn} onClick={()=>setCform({name:"", hours:"", note:"", public:true, active:true, sort:sorted.length})}>+ {tf("Karte")}</button>}
        </div>}
        {cur && <div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
            <span style={{flex:1,fontSize:13,color:INK_MUTED}}>{cur.hours||""}{cur.public===false ? " · "+tf("nicht öffentlich") : ""}{cur.active===false ? " · "+tf("inaktiv") : ""}</span>
            <button style={opSmall} onClick={pdf}><Icon n="printer" /> {tf("PDF")}</button>
            {canEdit && <button style={opSmall} onClick={()=>setCform({...cur, hours:cur.hours||"", note:cur.note||""})}>{tf("Karte bearbeiten")}</button>}
            {canEdit && <button className="btn-primary" onClick={()=>setForm({card_id:cur.id, section:sections[sections.length-1]||"", name:"", description:"", price:"", price_note:"", allergens:[], tags:[], sold_out:false, active:true, sort:its.length})}>{tf("Gericht anlegen")}</button>}
          </div>
          {its.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Gerichte auf dieser Karte.")}</div>}
          {sections.map(sec=><div key={sec} style={{marginBottom:12}}>
            {sec && <div style={{fontWeight:600,fontSize:13.5,margin:"4px 0"}} data-no-i18n="">{sec}</div>}
            {its.filter(i=>(i.section||"")===sec).map(i=><div key={i.id} style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:"8px 10px",border:`1px solid ${BORDER}`,borderRadius:8,marginBottom:6,background:i.sold_out?PAPER:"#fff",opacity:i.active===false?0.55:1}}>
              <div style={{flex:1,minWidth:180}}>
                <b data-no-i18n="" style={{textDecoration:i.sold_out?"line-through":"none"}}>{i.name}</b>
                {i.allergens && i.allergens.length>0 && <span style={{fontSize:12,color:INK_MUTED,marginInlineStart:6}} title={i.allergens.map(a=>a+" "+tf((ALLERGENS.find(x=>x[0]===a)||[])[1]||"")).join(", ")}>{i.allergens.join(", ")}</span>}
                {i.tags && i.tags.length>0 && <span style={{fontSize:11.5,color:GOOD_TEXT,marginInlineStart:6}}>{i.tags.map(t=>tf((MN_TAGS.find(x=>x[0]===t)||[t,t])[1])).join(" · ")}</span>}
                {i.description && <div style={{fontSize:12.5,color:INK_MUTED}} data-no-i18n="">{i.description}</div>}
              </div>
              <span style={{fontSize:13.5,whiteSpace:"nowrap"}}>{i.price_note ? <span data-no-i18n="">{i.price_note} </span> : null}{i.price!=null ? money(i.price) : ""}</span>
              <button style={{...opSmall,background:i.sold_out?BAD_SOFT:"#fff",color:i.sold_out?BAD:INK,minWidth:120}} aria-pressed={!!i.sold_out} onClick={()=>toggle(i)}>{i.sold_out ? tf("Ausverkauft") : tf("Verfügbar")}</button>
              {canEdit && <button style={linkBtn} onClick={()=>setForm({...i, price:i.price??"", price_note:i.price_note||"", description:i.description||"", section:i.section||""})}>{tf("Bearbeiten")}</button>}
            </div>)}
          </div>)}
        </div>}
      </div>}
      {view==="online" && canEdit && <MenuOnline hotel={hotel} api={api} value={settings} onSaved={(s)=>{ setSettings({...settings, ...s}); setMsg({ok:true,text:tf("Gespeichert.")}); }} />}
      {form && <MenuItemForm form={form} setForm={setForm} cards={sorted} sections={[...new Set((items||[]).map(i=>i.section).filter(Boolean).concat(MN_SECTIONS.map(translateString)))]} onClose={()=>setForm(null)}
        onSave={()=>run(async()=>{ const body = {...form}; ["id","created_at","updated_at","hotel_id","organization_id"].forEach(k=>delete body[k]); if(form.id) await api("/api/menu-items/"+form.id,"PATCH",body); else await api("/api/hotels/"+hotel.id+"/menu-items","POST",body); setForm(null); }, tf("Gespeichert."))}
        onDelete={form.id ? ()=>{ if(window.confirm(tf("Gericht löschen?"))) run(async()=>{ await api("/api/menu-items/"+form.id,"DELETE"); setForm(null); }); } : null} />}
      {cform && <Overlay onClose={()=>setCform(null)} width={460} label={tf("Karte")}>
        <b>{cform.id ? tf("Karte bearbeiten") : tf("Karte anlegen")}</b>
        <Field label={tf("Name")}><input className="input" list="mn-cards" value={cform.name} onChange={e=>setCform({...cform,name:e.target.value})} /><datalist id="mn-cards">{MN_CARDS.map(([n])=><option key={n} value={translateString(n)} />)}</datalist></Field>
        <Field label={tf("Zeiten (z. B. 11:30–14:00)")}><input className="input" value={cform.hours} onChange={e=>setCform({...cform,hours:e.target.value})} /></Field>
        <Field label={tf("Hinweis oben auf der Karte")}><textarea className="input" rows={2} value={cform.note} onChange={e=>setCform({...cform,note:e.target.value})} /></Field>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={cform.public!==false} onChange={e=>setCform({...cform,public:e.target.checked})} /> {tf("Für Gäste sichtbar (QR-Code)")}</label>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={cform.active!==false} onChange={e=>setCform({...cform,active:e.target.checked})} /> {tf("Aktiv")}</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-primary" disabled={!String(cform.name).trim()} onClick={()=>run(async()=>{ const body = {...cform}; ["id","created_at","hotel_id","organization_id"].forEach(k=>delete body[k]); if(cform.id) await api("/api/menu-cards/"+cform.id,"PATCH",body); else { const c = await api("/api/hotels/"+hotel.id+"/menu-cards","POST",body); setCard(c.id); } setCform(null); }, tf("Gespeichert."))}>{tf("Speichern")}</button>
          {cform.id && <button style={{...btnLine,color:BAD}} onClick={()=>{ if(window.confirm(tf("Karte mit allen Gerichten löschen?"))) run(async()=>{ await api("/api/menu-cards/"+cform.id,"DELETE"); setCform(null); setCard(null); }); }}>{tf("Löschen")}</button>}
          <button style={btnLine} onClick={()=>setCform(null)}>{tf("Abbrechen")}</button>
        </div>
      </Overlay>}
    </div>
  );
}

function MenuItemForm({form, setForm, cards, sections, onClose, onSave, onDelete}){
  const tog = (k, v) => setForm({...form, [k]: (form[k]||[]).includes(v) ? form[k].filter(x=>x!==v) : [...(form[k]||[]), v]});
  return (
    <Overlay onClose={onClose} width={600} label={form.id ? tf("Gericht bearbeiten") : tf("Gericht anlegen")}>
      <b>{form.id ? tf("Gericht bearbeiten") : tf("Gericht anlegen")}</b>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0 10px",marginTop:8}}>
        <Field label={tf("Karte")}><select className="input" value={form.card_id} onChange={e=>setForm({...form,card_id:e.target.value})}>{cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label={tf("Abschnitt")}><input className="input" list="mn-sections" value={form.section} onChange={e=>setForm({...form,section:e.target.value})} /><datalist id="mn-sections">{sections.map(s=><option key={s} value={s} />)}</datalist></Field>
      </div>
      <Field label={tf("Name")}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
      <Field label={tf("Beschreibung")}><textarea className="input" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
        <Field label={tf("Preis")}><input className="input" inputMode="decimal" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} /></Field>
        <Field label={tf("Menge (z. B. 0,1 l)")}><input className="input" value={form.price_note} onChange={e=>setForm({...form,price_note:e.target.value})} /></Field>
      </div>
      <fieldset style={{border:"none",padding:0,margin:"0 0 10px"}}><legend className="field-label">{tf("Allergene")}</legend>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ALLERGENS.map(([k,l])=><label key={k} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${(form.allergens||[]).includes(k)?BAD:BORDER}`,borderRadius:6,padding:"4px 8px",minHeight:32,cursor:"pointer"}}><input type="checkbox" checked={(form.allergens||[]).includes(k)} onChange={()=>tog("allergens",k)} /> {k} {tf(l)}</label>)}</div>
      </fieldset>
      <fieldset style={{border:"none",padding:0,margin:"0 0 10px"}}><legend className="field-label">{tf("Hinweise")}</legend>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{MN_TAGS.map(([k,l])=><label key={k} style={{display:"flex",gap:4,alignItems:"center",fontSize:12.5,border:`1px solid ${(form.tags||[]).includes(k)?GOOD:BORDER}`,borderRadius:6,padding:"4px 8px",minHeight:32,cursor:"pointer"}}><input type="checkbox" checked={(form.tags||[]).includes(k)} onChange={()=>tog("tags",k)} /> {tf(l)}</label>)}</div>
      </fieldset>
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!form.sold_out} onChange={e=>setForm({...form,sold_out:e.target.checked})} /> {tf("Ausverkauft")}</label>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={form.active!==false} onChange={e=>setForm({...form,active:e.target.checked})} /> {tf("Aktiv")}</label>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn-primary" disabled={!String(form.name).trim()||!form.card_id} onClick={onSave}>{tf("Speichern")}</button>
        {onDelete && <button style={{...btnLine,color:BAD}} onClick={onDelete}>{tf("Löschen")}</button>}
        <button style={btnLine} onClick={onClose}>{tf("Abbrechen")}</button>
      </div>
    </Overlay>
  );
}

function MenuOnline({hotel, api, value, onSaved}){
  const [s,setS] = useState(()=>({...value})); const [err,setErr] = useState(""); const [svg,setSvg] = useState("");
  const url = s.token ? mnPublicUrl("h="+s.token) : null;
  useEffect(()=>{ if(url) qrSvg(url, 5).then(setSvg).catch(()=>{}); },[url]);
  const save = async (extra) => { setErr(""); try { const r = await api("/api/hotels/"+hotel.id+"/menu-settings","PUT",{...s, ...(extra||{})}); setS({...s, ...r}); onSaved(r); } catch(e){ setErr(e.message); } };
  const qrPdf = () => { if(!svg) return; sheetPdf('<div class="fs" style="text-align:center">'+fsHead(hotel, translateString("Speisekarte"), "")+'<div style="width:90mm;margin:12mm auto">'+svg+'</div><p style="font-size:14px">'+fsT("QR-Code scannen – Speisekarte in Ihrer Sprache")+'</p>'+fsFoot()+'</div>', safeFile(translateString("Speisekarte QR")+" "+hotel.name)+".pdf", true).catch(e=>setErr(e.message)); };
  return (
    <div>
      <Card style={{marginBottom:12}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600,minHeight:36}}><input type="checkbox" checked={!!s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> {tf("Speisekarte online zeigen")}</label>
        <div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Gäste öffnen die Karte per QR-Code am Tisch, über die Gäste-Seite im Zimmer oder über einen Link auf deiner Website.")}</div>
        {url && s.enabled && <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
          {svg && <div style={{width:110}} aria-hidden="true" dangerouslySetInnerHTML={{__html:svg}} />}
          <div style={{flex:1,minWidth:200}}>
            <input className="input" readOnly value={url} aria-label={tf("Link zur Speisekarte")} onFocus={e=>e.target.select()} />
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <button style={opSmall} onClick={()=>navigator.clipboard && navigator.clipboard.writeText(url)}>{tf("Link kopieren")}</button>
              <a style={{...opSmall,textDecoration:"none",display:"inline-flex",alignItems:"center"}} href={url} target="_blank" rel="noopener">{tf("Ansehen")}</a>
              <button style={opSmall} onClick={qrPdf}>{tf("Tischaufsteller (PDF)")}</button>
              <button style={opSmall} onClick={()=>{ if(window.confirm(tf("Neuen Link erzeugen? Der alte Link funktioniert danach nicht mehr."))) save({new_token:true}); }}>{tf("Neuer Link")}</button>
            </div>
          </div>
        </div>}
      </Card>
      <Card style={{marginBottom:12}}>
        <Field label={tf("Name auf der Speisekarte")}><input className="input" value={s.name||""} placeholder={hotel.name} onChange={e=>setS({...s,name:e.target.value})} /></Field>
        <Field label={tf("Fußtext (z. B. Hinweis zu Allergenen, Preise inkl. MwSt.)")}><textarea className="input" rows={2} value={s.footer||""} onChange={e=>setS({...s,footer:e.target.value})} /></Field>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={s.translate!==false} onChange={e=>setS({...s,translate:e.target.checked})} /> {tf("Automatisch in die Sprache des Gastes übersetzen (KI)")}</label>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={s.show_prices!==false} onChange={e=>setS({...s,show_prices:e.target.checked})} /> {tf("Preise anzeigen")}</label>
      </Card>
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <button className="btn-primary" onClick={()=>save()}>{tf("Speichern")}</button>
    </div>
  );
}
