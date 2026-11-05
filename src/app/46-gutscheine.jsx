// ============================================================ Paket 044 (3): Gutscheine – Verkauf online (gutschein.html, eigenes Stripe-Konto des Hotels)
// und an der Rezeption, Einlösen in Teilbeträgen, Druck als PDF. Rechte prüft die Datenbank (Rezeption, F&B, Finanzen; Einstellungen nur Admin).

const VC_STATUS = {"ausstehend":[INK_MUTED,PAPER,"Zahlung offen"], "aktiv":[GOOD_TEXT,GOOD_SOFT,"Aktiv"], "eingelöst":[INK_MUTED,PAPER,"Eingelöst"], "storniert":[BAD,BAD_SOFT,"Storniert"]};
const VC_METHODS = [["bar","Bar"],["karte","Karte"],["überweisung","Überweisung"],["sonstiges","Sonstiges"]];
const vcPublicUrl = (q) => { try { return new URL("gutschein.html?"+q, location.href).href; } catch(e){ return "gutschein.html?"+q; } };
const vcMoney = (v, cur) => v==null ? "–" : Number(v).toLocaleString(UI_LOCALE,{style:"currency",currency:cur||"EUR"});

function vcSheetHtml(hotel, v, text){
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'
    + fsHead(hotel, v.title || translateString("Gutschein"), hotel.city||"")
    + '<div style="border:2px solid var(--fs-accent);border-radius:8px;padding:18mm 12mm;text-align:center;margin:8mm 0">'
    + '<div style="font-size:12px;color:#6B7280;letter-spacing:.08em;text-transform:uppercase">'+fsT("Gutschein im Wert von")+'</div>'
    + '<div style="font-family:Georgia,serif;font-size:34px;font-weight:700;margin:4mm 0">'+fsEsc(vcMoney(v.amount, v.currency))+'</div>'
    + (v.recipient_name ? '<div style="font-size:14px">'+fsT("für")+' <b>'+fsEsc(v.recipient_name)+'</b></div>' : '')
    + (v.message ? '<div style="font-size:13px;font-style:italic;margin-top:4mm;white-space:pre-wrap">„'+fsEsc(v.message)+'“</div>' : '')
    + '<div style="margin-top:8mm;font-size:11px;color:#6B7280">'+fsT("Gutscheincode")+'</div><div style="font-family:monospace;font-size:20px;font-weight:700;letter-spacing:.12em">'+fsEsc(v.code)+'</div>'
    + '<div style="margin-top:4mm;font-size:11px;color:#6B7280">'+(v.valid_until ? fsEsc(tf("Gültig bis {0}", fmtDate(v.valid_until))) : fsT("Ohne Ablaufdatum"))+'</div>'
    + '</div>'
    + (text ? '<p style="font-size:11px;color:#374151;white-space:pre-wrap">'+fsEsc(text)+'</p>' : '')
    + '<p style="font-size:10px;color:#6B7280">'+fsT("Einlösbar für alle Leistungen des Hotels, auch in Teilbeträgen. Keine Barauszahlung.")+'</p>'
    + fsFoot()+'</div>';
}

function VouchersView({hotel, api}){
  const [view,setView] = useState("list"); const [q,setQ] = useState(""); const [status,setStatus] = useState("");
  const [list,setList] = useState(null); const [err,setErr] = useState(""); const [msg,setMsg] = useState(null);
  const [settings,setSettings] = useState(null); const [pay,setPay] = useState(null);
  const [sell,setSell] = useState(null); const [redeem,setRedeem] = useState(null); const [hist,setHist] = useState(null);
  const load = useCallback(()=>{
    const p = new URLSearchParams(); if(q.replace(/[^A-Za-z0-9]/g,"").length===12) p.set("code", q); if(status) p.set("status", status);
    return api("/api/hotels/"+hotel.id+"/vouchers?"+p.toString()).then(l=>{ setList(l); setErr(""); }).catch(e=>{ setErr(e.message); setList([]); });
  },[api, hotel.id, q, status]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    api("/api/hotels/"+hotel.id+"/voucher-settings").then(setSettings).catch(()=>setSettings(false));
    api("/api/hotels/"+hotel.id+"/payments/status").then(setPay).catch(()=>setPay(false));
  },[api, hotel.id]);
  const run = async (fn, ok) => { setMsg(null); try { await fn(); load(); if(ok) setMsg({ok:true,text:ok}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const cur = (settings && settings.currency) || hotel.currency || "EUR";
  const pdf = (v) => sheetPdf(vcSheetHtml(hotel, v, settings && settings.text), safeFile(translateString("Gutschein")+" "+v.code)+".pdf", true).catch(opErr(setMsg));
  const filtered = (list||[]).filter(v=>{ const s = q.trim().toLowerCase(); return !s || [v.code, v.buyer_name, v.recipient_name, v.buyer_email].some(x=>String(x||"").toLowerCase().includes(s)); });
  const open = (list||[]).filter(v=>v.status==="aktiv").reduce((s,v)=>s+Number(v.remaining||0),0);
  const isAdmin = settings && settings.can_edit;
  return (
    <div>
      <BgmHead title={tf("Gutscheine")} intro={tf("Gutscheine online verkaufen (Zahlung direkt auf das Stripe-Konto des Hotels) oder an der Rezeption ausgeben – und in Teilbeträgen einlösen.")} />
      <BgmTabs value={view} onChange={setView} tabs={[["list",tf("Gutscheine")]].concat(isAdmin?[["online",tf("Online-Verkauf")]]:[])} />
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {err && <ErrorText style={{marginBottom:10}}>{err}</ErrorText>}
      {view==="list" && <div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
          <input className="input" style={{flex:1,minWidth:180}} placeholder={tf("Code, Name oder E-Mail")} aria-label={tf("Gutschein suchen")} value={q} onChange={e=>setQ(e.target.value)} />
          <select className="input" style={{width:"auto"}} aria-label={tf("Status")} value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">{tf("Alle")}</option>{Object.keys(VC_STATUS).map(k=><option key={k} value={k}>{tf(VC_STATUS[k][2])}</option>)}
          </select>
          <button className="btn-primary" onClick={()=>setSell({amount:"", payment_method:"bar", buyer_name:"", buyer_email:"", recipient_name:"", message:""})}>{tf("Gutschein verkaufen")}</button>
        </div>
        {list && list.length>0 && <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Offener Gutscheinwert: {0}", vcMoney(open, cur))}</div>}
        {list && filtered.length===0 && <div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Keine Gutscheine gefunden.")}</div>}
        {filtered.map(v=>{ const st = VC_STATUS[v.status]||VC_STATUS.aktiv; const expired = v.valid_until && v.valid_until<todayIso(); return (
          <Card key={v.id} style={{marginBottom:8}}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <b style={{fontFamily:"monospace",fontSize:15,letterSpacing:".05em"}} data-no-i18n="">{v.code}</b>
              <span style={{flex:1,minWidth:150,fontSize:13}}><span data-no-i18n="">{v.recipient_name || v.buyer_name}</span>{v.source==="online" ? " · "+tf("online") : ""}</span>
              <span style={{fontWeight:700}}>{vcMoney(v.remaining, v.currency)}</span>{Number(v.remaining)!==Number(v.amount) && <span style={{fontSize:12,color:INK_MUTED}}>{tf("von {0}", vcMoney(v.amount, v.currency))}</span>}
              <Pill color={expired&&v.status==="aktiv"?BAD:st[0]} bg={expired&&v.status==="aktiv"?BAD_SOFT:st[1]}>{expired&&v.status==="aktiv" ? tf("Abgelaufen") : tf(st[2])}</Pill>
            </div>
            <div style={{fontSize:12.5,color:INK_MUTED,marginTop:4}}>{tf("Verkauft am {0}", fmtDate(v.paid_at||v.created_at))}{v.payment_method ? " · "+tf((VC_METHODS.find(m=>m[0]===v.payment_method)||[0,v.payment_method==="stripe"?"Online (Stripe)":v.payment_method])[1]) : ""}{v.valid_until ? " · "+tf("gültig bis {0}", fmtDate(v.valid_until)) : ""}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
              {v.status==="aktiv" && !expired && <button style={linkBtn} onClick={()=>setRedeem({v, amount:String(v.remaining), note:""})}>{tf("Einlösen")}</button>}
              {v.status!=="ausstehend" && <button style={linkBtn} onClick={()=>pdf(v)}>{tf("PDF")}</button>}
              <button style={linkBtn} onClick={()=>api("/api/vouchers/"+v.id+"/redemptions").then(l=>setHist({v, l})).catch(opErr(setMsg))}>{tf("Verlauf")}</button>
              {v.status==="aktiv" && <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Gutschein {0} stornieren? Eine Erstattung an den Käufer machst du selbst (bei Online-Kauf im Stripe-Konto).", v.code))) run(()=>api("/api/vouchers/"+v.id,"PATCH",{status:"storniert"}), tf("Storniert.")); }}>{tf("Stornieren")}</button>}
              {isAdmin && v.status==="storniert" && Number(v.remaining)===Number(v.amount) && <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Gutschein endgültig löschen?"))) run(()=>api("/api/vouchers/"+v.id,"DELETE")); }}>{tf("Löschen")}</button>}
            </div>
          </Card>); })}
      </div>}
      {view==="online" && isAdmin && <VoucherOnline hotel={hotel} api={api} settings={settings} pay={pay} onSettings={setSettings} onMsg={setMsg} />}
      {sell && <Overlay onClose={()=>setSell(null)} width={480} label={tf("Gutschein verkaufen")}>
        <b>{tf("Gutschein verkaufen")}</b>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px",marginTop:8}}>
          <Field label={tf("Betrag ({0})", cur)}><input className="input" inputMode="decimal" autoFocus value={sell.amount} onChange={e=>setSell({...sell,amount:e.target.value})} /></Field>
          <Field label={tf("Bezahlt mit")}><select className="input" value={sell.payment_method} onChange={e=>setSell({...sell,payment_method:e.target.value})}>{VC_METHODS.map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></Field>
        </div>
        <Field label={tf("Käufer")}><input className="input" value={sell.buyer_name} onChange={e=>setSell({...sell,buyer_name:e.target.value})} /></Field>
        <Field label={tf("E-Mail Käufer (optional)")}><input className="input" type="email" value={sell.buyer_email} onChange={e=>setSell({...sell,buyer_email:e.target.value})} /></Field>
        <Field label={tf("Für (Name auf dem Gutschein)")}><input className="input" value={sell.recipient_name} onChange={e=>setSell({...sell,recipient_name:e.target.value})} /></Field>
        <Field label={tf("Persönliche Nachricht")}><textarea className="input" rows={2} value={sell.message} onChange={e=>setSell({...sell,message:e.target.value})} /></Field>
        <div style={{fontSize:12,color:INK_MUTED,marginBottom:8}}>{tf("Der Gutschein ist sofort gültig. Den Betrag im Kassenbuch oder in der Kasse wie gewohnt buchen.")}</div>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!String(sell.amount).trim()} onClick={()=>run(async()=>{ const v = await api("/api/hotels/"+hotel.id+"/vouchers","POST",sell); setSell(null); pdf(v); }, tf("Gutschein angelegt."))}>{tf("Anlegen und PDF")}</button><button style={btnLine} onClick={()=>setSell(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
      {redeem && <Overlay onClose={()=>setRedeem(null)} width={420} label={tf("Gutschein einlösen")}>
        <b>{tf("Gutschein einlösen")}</b> <span style={{fontFamily:"monospace"}} data-no-i18n="">{redeem.v.code}</span>
        <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Restwert: {0}", vcMoney(redeem.v.remaining, redeem.v.currency))}</div>
        <Field label={tf("Betrag")}><input className="input" inputMode="decimal" autoFocus value={redeem.amount} onChange={e=>setRedeem({...redeem,amount:e.target.value})} /></Field>
        <Field label={tf("Notiz (z. B. Rechnung, Zimmer)")}><input className="input" value={redeem.note} onChange={e=>setRedeem({...redeem,note:e.target.value})} /></Field>
        <div style={{display:"flex",gap:8}}><button className="btn-primary" onClick={()=>run(async()=>{ await api("/api/vouchers/"+redeem.v.id+"/redeem","POST",{amount:redeem.amount, note:redeem.note}); setRedeem(null); }, tf("Eingelöst."))}>{tf("Einlösen")}</button><button style={btnLine} onClick={()=>setRedeem(null)}>{tf("Abbrechen")}</button></div>
      </Overlay>}
      {hist && <Overlay onClose={()=>setHist(null)} width={420} label={tf("Verlauf")}>
        <b>{tf("Verlauf")}</b> <span style={{fontFamily:"monospace"}} data-no-i18n="">{hist.v.code}</span>
        <div style={{fontSize:13,margin:"8px 0"}}>{tf("Ausgestellt über {0} am {1}", vcMoney(hist.v.amount, hist.v.currency), fmtDate(hist.v.paid_at||hist.v.created_at))}</div>
        {hist.l.length===0 && <div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch nicht eingelöst.")}</div>}
        {hist.l.map(x=><div key={x.id} style={{display:"flex",gap:10,fontSize:13,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}><span>{fmtDate(x.redeemed_at)}</span><b>{vcMoney(x.amount, hist.v.currency)}</b><span style={{color:INK_MUTED}} data-no-i18n="">{x.note||""}</span></div>)}
        <button style={{...btnLine,marginTop:10}} onClick={()=>setHist(null)}>{tf("Schließen")}</button>
      </Overlay>}
    </div>
  );
}

function VoucherOnline({hotel, api, settings, pay, onSettings, onMsg}){
  const [s,setS] = useState(()=>({...settings, presets:(settings.presets||[]).join(", ")})); const [err,setErr] = useState(""); const [busy,setBusy] = useState(false); const [svg,setSvg] = useState("");
  const url = s.token ? vcPublicUrl("h="+s.token) : null;
  useEffect(()=>{ if(url) qrSvg(url, 5).then(setSvg).catch(()=>{}); },[url]);
  const save = async (extra) => {
    setErr("");
    try { const r = await api("/api/hotels/"+hotel.id+"/voucher-settings","PUT",{...s, presets:String(s.presets).split(/[;,\s]+/).filter(Boolean), ...(extra||{})}); setS({...s, ...r, presets:r.presets.join(", ")}); onSettings({...settings, ...r}); onMsg({ok:true,text:tf("Gespeichert.")}); }
    catch(e){ setErr(e.message); }
  };
  const connect = async () => { setErr(""); setBusy(true); try { const r = await api("/api/hotels/"+hotel.id+"/payments/connect","POST",{}); window.location.href = r.url; } catch(e){ setErr(e.message); setBusy(false); } };
  return (
    <div>
      <Card style={{marginBottom:12}}>
        <b><Icon n="euro" /> {tf("Zahlung über Stripe")}</b>
        <div style={{fontSize:13,color:INK_MUTED,margin:"4px 0 8px"}}>{tf("Gäste zahlen direkt auf das Stripe-Konto deines Hotels. Ouverture erhält dabei nichts und behält keine Gebühr ein; es gelten nur die Stripe-Gebühren deines Kontos.")}</div>
        {pay===null && <div style={{color:INK_MUTED}}>{tf("Lädt …")}</div>}
        {pay && !pay.stripe_enabled && <div style={{fontSize:13,color:WARN_TEXT}}>{tf("Die Bezahlung ist auf dem Server noch nicht eingerichtet.")}</div>}
        {pay && pay.stripe_enabled && !pay.connected && <button className="btn-primary" disabled={busy} onClick={connect}>{tf("Stripe-Konto verbinden")}</button>}
        {pay && pay.connected && !pay.charges_enabled && <div>
          <div style={{fontSize:13,color:WARN_TEXT,marginBottom:6}}>{tf("Das Stripe-Konto ist angelegt, aber noch nicht freigeschaltet. Bitte die Angaben bei Stripe vervollständigen.")}</div>
          <button className="btn-primary" disabled={busy} onClick={connect}>{tf("Bei Stripe fortsetzen")}</button>
        </div>}
        {pay && pay.charges_enabled && <div style={{fontSize:13,color:GOOD_TEXT}}>✓ {tf("Stripe-Konto verbunden und bereit für Zahlungen.")} <span style={{color:INK_MUTED}} data-no-i18n="">{pay.account}</span></div>}
      </Card>
      <Card style={{marginBottom:12}}>
        <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600,minHeight:36}}><input type="checkbox" checked={!!s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} /> {tf("Online-Verkauf einschalten")}</label>
        {s.enabled && pay && !pay.charges_enabled && <div style={{fontSize:12.5,color:WARN_TEXT}}>{tf("Die Verkaufsseite ist erst erreichbar, wenn das Stripe-Konto freigeschaltet ist.")}</div>}
        {url && s.enabled && <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
          {svg && <div style={{width:110}} aria-hidden="true" dangerouslySetInnerHTML={{__html:svg}} />}
          <div style={{flex:1,minWidth:200}}>
            <input className="input" readOnly value={url} aria-label={tf("Link zur Verkaufsseite")} onFocus={e=>e.target.select()} />
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <button style={opSmall} onClick={()=>navigator.clipboard && navigator.clipboard.writeText(url)}>{tf("Link kopieren")}</button>
              <a style={{...opSmall,textDecoration:"none",display:"inline-flex",alignItems:"center"}} href={url} target="_blank" rel="noopener">{tf("Ansehen")}</a>
              <button style={opSmall} onClick={()=>{ if(window.confirm(tf("Neuen Link erzeugen? Der alte Link funktioniert danach nicht mehr."))) save({new_token:true}); }}>{tf("Neuer Link")}</button>
            </div>
          </div>
        </div>}
      </Card>
      <Card style={{marginBottom:12}}>
        <Field label={tf("Beträge zur Auswahl ({0}, mit Komma getrennt)", settings.currency||"EUR")}><input className="input" value={s.presets} onChange={e=>setS({...s,presets:e.target.value})} /></Field>
        <label style={{display:"flex",gap:8,alignItems:"center",minHeight:36}}><input type="checkbox" checked={!!s.custom} onChange={e=>setS({...s,custom:e.target.checked})} /> {tf("Freien Betrag erlauben")}</label>
        {s.custom && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
          <Field label={tf("Mindestbetrag")}><input className="input" inputMode="decimal" value={s.custom_min} onChange={e=>setS({...s,custom_min:e.target.value})} /></Field>
          <Field label={tf("Höchstbetrag")}><input className="input" inputMode="decimal" value={s.custom_max} onChange={e=>setS({...s,custom_max:e.target.value})} /></Field>
        </div>}
        <Field label={tf("Gültigkeit")}><select className="input" value={s.valid_years} onChange={e=>setS({...s,valid_years:Number(e.target.value)})}>
          <option value={0}>{tf("Ohne Ablaufdatum")}</option>{[2,3,5,10,30].map(n=><option key={n} value={n}>{tf("{0} Jahre (bis Jahresende)", n)}</option>)}
        </select></Field>
        <div style={{fontSize:12,color:INK_MUTED,marginTop:-6,marginBottom:10}}>{tf("In Österreich sind kurze Befristungen von Gutscheinen oft unwirksam; in Deutschland gelten meist 3 Jahre. Im Zweifel rechtlich prüfen lassen.")}</div>
        <Field label={tf("Titel")}><input className="input" value={s.title||""} placeholder={tf("z. B. Wellness-Gutschein")} onChange={e=>setS({...s,title:e.target.value})} /></Field>
        <Field label={tf("Text auf dem Gutschein und der Verkaufsseite")}><textarea className="input" rows={3} value={s.text||""} onChange={e=>setS({...s,text:e.target.value})} /></Field>
      </Card>
      {err && <ErrorText style={{marginBottom:8}}>{err}</ErrorText>}
      <button className="btn-primary" onClick={()=>save()}>{tf("Speichern")}</button>
    </div>
  );
}
