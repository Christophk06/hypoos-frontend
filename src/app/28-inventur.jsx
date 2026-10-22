// ============================================================ Inventur per Handy (Migration 035)
// Zählen je Abteilung; Artikel per Kamera-Scan (Strichcode/QR, wo der Browser es kann), Handscanner oder Suche finden.
// Abschließen bucht die Differenzen als Lagerbewegung „Inventur“.
function BarcodeScanner({onCode, onClose}){
  const video = React.useRef(null); const [err,setErr] = useState("");
  useEffect(()=>{
    let stream, timer, stop = false;
    (async () => {
      try {
        const det = new window.BarcodeDetector({formats:["ean_13","ean_8","code_128","code_39","upc_a","upc_e","qr_code","itf"]});
        stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        if(stop) return; video.current.srcObject = stream; await video.current.play();
        const tick = async () => { if(stop) return; try { const r = await det.detect(video.current); if(r && r[0] && r[0].rawValue){ onCode(r[0].rawValue); return; } } catch(e){} timer = setTimeout(tick, 250); };
        tick();
      } catch(e){ setErr(tf("Kamera nicht verfügbar – Strichcode bitte eintippen oder mit dem Handscanner scannen.")); }
    })();
    return () => { stop = true; clearTimeout(timer); if(stream) stream.getTracks().forEach(t=>t.stop()); };
  },[]);
  return (
    <Overlay onClose={onClose} width={420} label={tf("Strichcode scannen")}>
      <b>{tf("Strichcode scannen")}</b>
      {err ? <div style={{color:BAD,fontSize:13,margin:"10px 0"}}>{err}</div>
        : <video ref={video} playsInline muted style={{width:"100%",borderRadius:10,background:"#000",margin:"10px 0",aspectRatio:"4/3",objectFit:"cover"}} />}
      <button style={btnLine} onClick={onClose}>{tf("Schließen")}</button>
    </Overlay>
  );
}
const canScanCamera = () => typeof window!=="undefined" && "BarcodeDetector" in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function InventoryPanel({hotel, api, dept, items, onDone, onClose}){
  const [counts,setCounts] = useState(null); const [cur,setCur] = useState(null); const [q,setQ] = useState(""); const [scan,setScan] = useState(false);
  const [val,setVal] = useState({}); const [msg,setMsg] = useState(null); const [busy,setBusy] = useState(false); const [unknown,setUnknown] = useState(null);
  const lead = canManageDept(dept);
  const loadCounts = () => api("/api/hotels/"+hotel.id+"/inventory").then(setCounts).catch(e=>{ setMsg({ok:false,text:e.message}); setCounts([]); });
  useEffect(()=>{ loadCounts(); },[hotel.id]);
  const open = (counts||[]).find(c=>!c.finished_at && (c.department||"")===(dept||""));
  useEffect(()=>{ if(open && (!cur || cur.id!==open.id)) api("/api/inventory/"+open.id).then(setCur).catch(()=>{}); if(!open) setCur(null); },[open && open.id]);
  const mine = items.filter(i=>i.department===dept);
  const counted = {}; ((cur && cur.lines) || []).forEach(l=>{ counted[l.item_id] = Number(l.counted); });
  const fmtQ = (n) => Number(n).toLocaleString(UI_LOCALE,{maximumFractionDigits:2});
  const start = async () => { setMsg(null); try { await api("/api/hotels/"+hotel.id+"/inventory","POST",{department:dept}); await loadCounts(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const saveLine = async (it) => { const v = val[it.id]; if(v===undefined || v==="") return; setMsg(null);
    try { const l = await api("/api/inventory/"+cur.id+"/lines","PUT",{item_id:it.id, counted:v}); setCur(c=>({...c, lines:[...c.lines.filter(x=>x.item_id!==it.id), l]})); setVal(x=>({...x,[it.id]:undefined})); }
    catch(e){ setMsg({ok:false,text:e.message}); } };
  const finish = async () => {
    const missing = mine.filter(i=>counted[i.id]===undefined).length;
    if(!window.confirm(missing ? tf("{0} Artikel sind noch nicht gezählt und bleiben unverändert. Inventur abschließen?", missing) : tf("Inventur abschließen? Differenzen werden als Lagerbewegung gebucht."))) return;
    setBusy(true); setMsg(null);
    try { const r = await api("/api/inventory/"+cur.id+"/finish","POST",{}); setMsg({ok:true,text:tf("Inventur abgeschlossen – {0} Bestände angepasst.", r.changed)}); setCur(null); await loadCounts(); onDone(); }
    catch(e){ setMsg({ok:false,text:e.message}); } setBusy(false); };
  const cancel = async () => { if(!window.confirm(tf("Diese Inventur verwerfen? Gezählte Mengen gehen verloren."))) return; try { await api("/api/inventory/"+cur.id,"DELETE"); setCur(null); await loadCounts(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const onCode = (code) => { setScan(false); const it = mine.find(i=>i.barcode===code); if(it){ setQ(it.name); setUnknown(null); setTimeout(()=>{ const el = document.getElementById("inv-"+it.id); if(el){ el.focus(); el.scrollIntoView({block:"center"}); } }, 50); } else setUnknown(code); };
  const assign = async (itemId) => { try { await api("/api/stock/"+itemId,"PATCH",{barcode:unknown}); setMsg({ok:true,text:tf("Strichcode zugeordnet.")}); setUnknown(null); await onDone(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  const needle = q.trim().toLowerCase();
  const shown = mine.filter(i=>!needle || i.name.toLowerCase().includes(needle) || (i.barcode||"").toLowerCase()===needle);
  const done = mine.filter(i=>counted[i.id]!==undefined).length;
  return (
    <Card style={{marginBottom:12,borderColor:BRASS}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
        <b style={{flex:1}}><Icon n="clipboard" /> {tf("Inventur")} · {translateString(dept)}</b>
        <button style={linkBtn} aria-label={tf("Schließen")} onClick={onClose}>✕</button>
      </div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:8}}>{msg.text}</div>}
      {counts===null ? <div style={{color:INK_MUTED,fontSize:13}}>{tf("Lädt…")}</div>
      : !open ? <div>
          <div style={{fontSize:13,color:INK_MUTED,marginBottom:8}}>{tf("Zählen Sie den Bestand der Abteilung am Handy. Erst beim Abschließen werden die Bestände angepasst – bis dahin läuft der Betrieb normal weiter.")}</div>
          <button className="btn-primary" onClick={start}>{tf("Inventur starten")}</button>
          {(counts||[]).filter(c=>c.finished_at && (c.department||"")===(dept||"")).slice(0,3).map(c=><div key={c.id} style={{fontSize:12.5,color:INK_MUTED,marginTop:6}}>{tf("Abgeschlossen am {0} · {1} Artikel gezählt", fmtDate(c.finished_at.slice(0,10)), c.lines)}</div>)}
        </div>
      : !cur ? <div style={{color:INK_MUTED,fontSize:13}}>{tf("Lädt…")}</div>
      : <div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <input className="input" style={{flex:1,minWidth:160}} value={q} placeholder={tf("Artikel suchen oder Strichcode scannen …")} aria-label={tf("Artikel suchen")}
              onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ const c = q.trim(); if(e.key==="Enter" && /^[A-Za-z0-9._-]{4,64}$/.test(c) && !mine.some(i=>i.name.toLowerCase().includes(c.toLowerCase()))) onCode(c); }} />
            {canScanCamera() && <button style={smallBtn} onClick={()=>setScan(true)}><Icon n="camera" /> {tf("Scannen")}</button>}
          </div>
          {unknown && <div style={{background:WARN_SOFT,borderRadius:8,padding:"8px 10px",fontSize:13,marginBottom:8}}>
            {tf("Strichcode {0} ist noch keinem Artikel zugeordnet.", unknown)}
            {lead ? <select className="input" style={{marginTop:6}} defaultValue="" onChange={e=>e.target.value && assign(e.target.value)}><option value="">{tf("Artikel wählen …")}</option>{mine.filter(i=>!i.barcode).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select>
              : <div style={{color:INK_MUTED}}>{tf("Die Leitung der Abteilung kann ihn zuordnen.")}</div>}
          </div>}
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:6}}>{tf("{0} von {1} Artikeln gezählt", done, mine.length)}</div>
          {shown.map(it=>{ const c = counted[it.id], diff = c===undefined ? null : Math.round((c - Number(it.quantity))*100)/100; return (
            <div key={it.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 0",borderTop:`1px solid ${BORDER}`,fontSize:13.5}}>
              <div style={{flex:1,minWidth:0}}><span data-no-i18n="">{it.name}</span>
                <div style={{fontSize:11.5,color:INK_MUTED}}>{tf("Bestand laut System")}: <span data-no-i18n="">{fmtQ(it.quantity)} {it.unit}</span>{c!==undefined && <span> · {tf("gezählt")} <b>{fmtQ(c)}</b>{diff ? <b style={{color:diff<0?BAD:GOOD}}> ({diff>0?"+":""}{fmtQ(diff)})</b> : ""}</span>}</div></div>
              <input id={"inv-"+it.id} className="input" inputMode="decimal" style={{width:76,textAlign:"center"}} placeholder={c!==undefined ? fmtQ(c) : tf("Menge")} aria-label={tf("Gezählte Menge für {0}", it.name)}
                value={val[it.id]??""} onChange={e=>setVal({...val,[it.id]:e.target.value})} onKeyDown={e=>{ if(e.key==="Enter") saveLine(it); }} onBlur={()=>saveLine(it)} />
            </div>); })}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
            <button className="btn-primary" disabled={busy || !done} onClick={finish}>{busy ? tf("Wird gebucht…") : tf("Inventur abschließen")}</button>
            <button style={{...linkBtn,color:BAD}} onClick={cancel}>{tf("Verwerfen")}</button>
          </div>
        </div>}
      {scan && <BarcodeScanner onCode={onCode} onClose={()=>setScan(false)} />}
    </Card>
  );
}
