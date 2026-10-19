function fmtEurPlain(n){ return Number(n).toLocaleString(UI_LOCALE,{style:"currency",currency:"EUR",maximumFractionDigits:0}); }

function BillingBanner({billing, onOpen}){
  if(!billing) return null;
  let tone = null, text = "";
  if(!billing.active){ tone = BAD; text = billing.status==="trialing" ? "Die Testphase ist abgelaufen. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten." : "Kein aktives Abo. Ouverture ist im Nur-Lesen-Modus – alle Daten bleiben erhalten."; }
  else if(billing.status==="past_due"){ tone = WARN; text = "Die letzte Zahlung ist fehlgeschlagen. Bitte die Zahlungsart aktualisieren."; }
  else if(billing.status==="trialing"){ tone = BRASS; text = billing.trial_days_left===1 ? tf("Testphase: noch 1 Tag.") : tf("Testphase: noch {0} Tage.", billing.trial_days_left); }
  if(!tone) return null;
  return (
    <div className="no-print" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",border:`1px solid ${tone}`,background:tone===BAD?BAD_SOFT:tone===WARN?WARN_SOFT:BRASS_SOFT,color:INK,borderRadius:8,padding:"9px 14px",marginBottom:16,fontSize:13.5}}>
      <div style={{flex:1,minWidth:200}}>{text}</div>
      <button className="btn-primary" style={{padding:"6px 12px",fontSize:12.5}} onClick={onOpen}>{billing.status==="past_due" ? "Zahlungsart ändern" : "Tarif wählen"}</button>
    </div>
  );
}

const BILLING_NOTICES = {
  success: {ok:true, text:"Danke! Die Zahlung war erfolgreich. Das Abo wird in wenigen Sekunden aktiviert."},
  cancel: {ok:false, text:"Die Bezahlung wurde abgebrochen. Es wurde nichts berechnet."},
};

// Vorschlag für die Abo-Währung aus dem Land des Browsers (gleiche Regel wie billing.js)
function suggestBillingCurrency(){
  const REGION = {ch:"CHF",li:"CHF",gb:"GBP",us:"USD",ca:"CAD",au:"AUD",nz:"NZD",jp:"JPY",cn:"CNY",hk:"HKD",sg:"SGD",kr:"KRW",ae:"AED",sa:"SAR",qa:"QAR",
    bh:"USD",kw:"USD",om:"USD",tr:"TRY",br:"BRL",mx:"MXN",za:"ZAR",se:"SEK",no:"NOK",dk:"DKK",pl:"PLN",cz:"CZK",hu:"HUF"};
  const LANG = {ja:"JPY",zh:"CNY",ko:"KRW",tr:"TRY",ar:"AED",sv:"SEK",nb:"NOK",no:"NOK",da:"DKK",pl:"PLN",cs:"CZK",hu:"HUF"};
  const [l, r] = (navigator.language || "").toLowerCase().split(/[-_]/);
  return REGION[r] || LANG[UI_LANG] || LANG[l] || "EUR";
}
function fmtPrice(n, cur){ return Number(n).toLocaleString(UI_LOCALE,{style:"currency",currency:cur,maximumFractionDigits:0}); }

function BillingView({billing, orgId, api, isAdmin, notice, onReload, hotel}){
  const [cur,setCur] = useState(() => { try { return window.localStorage.getItem("hpoos_billing_currency") || (DISPLAY_CURRENCY && billing && (billing.currencies||[]).includes(DISPLAY_CURRENCY) ? DISPLAY_CURRENCY : suggestBillingCurrency()); } catch(e){ return suggestBillingCurrency(); } });
  const pickCur = (c) => { setCur(c); try { window.localStorage.setItem("hpoos_billing_currency", c); } catch(e){} };
  const [busy,setBusy] = useState(null);
  const [error,setError] = useState("");
  if(!billing) return <div style={{color:INK_MUTED}}>Abo-Daten werden geladen…</div>;

  const paid = billing.active && billing.plan!=="trial" && billing.has_customer;
  const go = async (path, body, key) => {
    setBusy(key); setError("");
    try { const r = await api("/api/organizations/"+orgId+"/billing/"+path, "POST", body); window.location.href = r.url; }
    catch(e){ setError(e.message); setBusy(null); }
  };
  const statusText = {
    trialing: billing.active ? tf("Testphase bis {0}", fmtDate(billing.trial_ends_at)) : tf("Testphase abgelaufen am {0}", fmtDate(billing.trial_ends_at)),
    active: billing.cancel_at_period_end ? tf("Gekündigt – läuft bis {0}", fmtDate(billing.current_period_end)) : (billing.current_period_end ? tf("Aktiv · nächste Abrechnung {0}", fmtDate(billing.current_period_end)) : tf("Aktiv")),
    past_due: "Zahlung offen – bitte Zahlungsart aktualisieren",
    canceled: "Beendet", unpaid: "Unbezahlt", incomplete: "Zahlung nicht abgeschlossen",
  }[billing.status] || billing.status;
  const n = notice && BILLING_NOTICES[notice];

  return (
    <div>
      {n && <div style={{color:n.ok?GOOD:WARN,fontSize:13.5,marginBottom:14}}>{n.text}</div>}
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12.5,color:INK_MUTED,fontWeight:600}}>AKTUELLER TARIF</div>
            <div style={{fontFamily:"Fraunces, serif",fontSize:22,fontWeight:600}}>{billing.plan_name}</div>
            <div style={{fontSize:13.5,color:billing.active?INK:BAD}}>{statusText}</div>
            <div style={{fontSize:13,color:INK_MUTED,marginTop:4}}>{tf("{0} von {1} Hotels genutzt", billing.hotel_count, billing.hotel_limit)}</div>
          </div>
          {isAdmin && billing.has_customer && billing.stripe_enabled && (
            <button onClick={()=>go("portal", null, "portal")} disabled={!!busy} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>
              {busy==="portal" ? "Öffnet…" : "Abo verwalten (Rechnungen, Zahlungsart, Kündigung)"}
            </button>
          )}
        </div>
        {error && <div style={{color:BAD,fontSize:13,marginTop:10}}>{error}</div>}
        {!isAdmin && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>Nur Admins der Organisation können das Abo ändern.</div>}
        {!billing.stripe_enabled && <div style={{fontSize:12.5,color:INK_MUTED,marginTop:10}}>Die Online-Bezahlung wird gerade eingerichtet.{CONTACT_EMAIL ? <span> Für ein Abo schreib an <a href={"mailto:"+CONTACT_EMAIL}>{CONTACT_EMAIL}</a>.</span> : null}</div>}
      </Card>

      {(billing.currencies||[]).length > 1 && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:INK_MUTED}}>{tf("Bezahlen in")}</span>
          <select className="input" style={{width:"auto",minWidth:240}} value={(billing.currencies||[]).includes(cur) ? cur : "EUR"} onChange={e=>pickCur(e.target.value)} data-no-i18n="">
            {billing.currencies.map(c=><option key={c} value={c}>{currencyName(c)} ({c})</option>)}
          </select>
          <span style={{fontSize:12,color:INK_MUTED}}>{tf("Abgebucht wird genau in dieser Währung.")}</span>
        </div>
      )}
      <div style={{fontFamily:"Fraunces, serif",fontSize:20,fontWeight:600,margin:"6px 0 2px"}}>{tf("Eröffnung")}</div>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>{tf("Für Hotels vor und während der Eröffnung: Pre-Opening-Plan, KI-Lagebericht und alle Betriebsbereiche. Läuft das Haus, wechselst du in den günstigeren Betriebs-Tarif.")}</div>
      <div className="stack" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:18}}>
        {(billing.plans||[]).filter(p=>(p.group||"opening")==="opening").map(p=>{
          const current = billing.plan===p.key && billing.active;
          return (
            <Card key={p.key} style={{display:"flex",flexDirection:"column",borderColor:current?BRASS:BORDER}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontWeight:700,fontSize:16}}>{p.name}</div>
                {current && <Pill color={BRASS} bg={BRASS_SOFT}>Aktuell</Pill>}
              </div>
              <div style={{fontFamily:"Fraunces, serif",fontSize:26,fontWeight:600,margin:"8px 0 2px"}}>{fmtPrice((p.monthly && p.monthly[cur]) || p.monthlyEur, p.monthly && p.monthly[cur] ? cur : "EUR")}</div>
              <div style={{fontSize:12,color:INK_MUTED,marginBottom:10}}>pro Monat zzgl. USt., monatlich kündbar</div>
              <ul style={{margin:"0 0 14px",paddingLeft:18,fontSize:13.5,lineHeight:1.6,flex:1}}>{p.features.map(f=><li key={f}>{f}</li>)}</ul>
              {isAdmin && billing.stripe_enabled && !current && (
                paid
                  ? <button onClick={()=>go("portal", null, "portal")} disabled={!!busy} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"9px 14px",fontSize:13.5,cursor:"pointer"}}>Über „Abo verwalten“ wechseln</button>
                  : <button className="btn-primary" onClick={()=>go("checkout", {plan:p.key, currency:cur}, p.key)} disabled={!!busy || !p.available}>{busy===p.key ? "Öffnet Bezahlseite…" : p.available ? p.name+" wählen" : "Bald verfügbar"}</button>
              )}
            </Card>
          );
        })}
        <Card style={{display:"flex",flexDirection:"column"}}>
          <div style={{fontWeight:700,fontSize:16}}>Enterprise</div>
          <div style={{fontFamily:"Fraunces, serif",fontSize:22,fontWeight:600,margin:"8px 0 2px"}}>auf Anfrage</div>
          <div style={{fontSize:12,color:INK_MUTED,marginBottom:10}}>Jahresvertrag</div>
          <ul style={{margin:"0 0 14px",paddingLeft:18,fontSize:13.5,lineHeight:1.6,flex:1}}>
            <li>Mehr als 5 Hotels</li><li>Eigene Vorlagen je Marke</li><li>Onboarding und Schulung</li>
          </ul>
          {CONTACT_EMAIL && <a href={"mailto:"+CONTACT_EMAIL+"?subject=Ouverture%20Enterprise"} style={{textAlign:"center",border:`1px solid ${BORDER}`,borderRadius:8,padding:"9px 14px",fontSize:13.5,color:INK,textDecoration:"none"}}>Kontakt aufnehmen</a>}
        </Card>
      </div>
      <OperationsPlans billing={billing} cur={cur} hotel={hotel} isAdmin={isAdmin} paid={paid} busy={busy} go={go} />
      <div style={{fontSize:12,color:INK_MUTED,marginTop:14}}>
        Die Bezahlung läuft sicher über Stripe. Rechnungen kommen per E-Mail und sind unter „Abo verwalten“ abrufbar.
        <button style={{...linkBtn,marginLeft:6}} onClick={onReload}>Status aktualisieren</button>
      </div>
    </div>
  );
}

// Betriebs-Tarife (ohne Pre-Opening), Preis nach Zimmerzahl. Die Stufe legt der Server fest.
function OperationsPlans({billing, cur, hotel, isAdmin, paid, busy, go}){
  const tiers = (billing.plans||[]).filter(p=>p.group==="operations");
  if(!tiers.length) return null;
  const rooms = Number(hotel && hotel.rooms) || 0;
  const mine = rooms ? tiers.find(t=>!t.maxRooms || rooms<=t.maxRooms) : null;
  const current = tiers.find(t=>t.key===billing.plan && billing.active);
  const range = (t, i) => i===0 ? tf("bis {0} Zimmer", t.maxRooms) : t.maxRooms ? tf("{0} bis {1} Zimmer", tiers[i-1].maxRooms+1, t.maxRooms) : tf("ab {0} Zimmern", tiers[i-1].maxRooms+1);
  const price = (t) => fmtPrice((t.monthly && t.monthly[cur]) || t.monthlyEur, t.monthly && t.monthly[cur] ? cur : "EUR");
  return (
    <div style={{marginTop:28}}>
      <div style={{fontFamily:"Fraunces, serif",fontSize:20,fontWeight:600,margin:"0 0 2px"}}>{tf("Betrieb")}</div>
      <div style={{fontSize:13,color:INK_MUTED,marginBottom:12}}>{tf("Für Hotels im laufenden Betrieb: Dienstplan, Zeiterfassung, Zimmer, Meldungen, Übergabebuch, Gäste und Rechnungen – ohne Eröffnungsplanung. Ein Hotel, Preis nach Zimmerzahl.")}</div>
      <Card style={{borderColor:current?BRASS:BORDER}}>
        <div className="stack" style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:22,alignItems:"start"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <tbody>
              {tiers.map((t,i)=>(
                <tr key={t.key} style={{borderTop:i?`1px solid ${BORDER}`:"none",background:mine&&mine.key===t.key?BRASS_SOFT:"transparent"}}>
                  <td style={{padding:"10px 8px",fontWeight:600}}>{t.name}</td>
                  <td style={{padding:"10px 8px",color:INK_MUTED}}>{range(t,i)}</td>
                  <td style={{padding:"10px 8px",textAlign:"end",fontFamily:"Fraunces, serif",fontSize:18,fontWeight:600}} data-no-i18n="">{price(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            {current && <Pill color={BRASS} bg={BRASS_SOFT}>Aktuell</Pill>}
            <div style={{fontSize:13.5,margin:"6px 0 12px"}}>
              {mine ? tf("Für {0} Zimmer gilt {1}: {2} pro Monat zzgl. USt., monatlich kündbar.", rooms, mine.name, price(mine)) : tf("Trag unter „Hotel bearbeiten“ die Zimmerzahl ein – danach richtet sich der Preis.")}
            </div>
            {isAdmin && billing.stripe_enabled && !current && mine && (
              paid
                ? <button onClick={()=>go("portal", null, "portal")} disabled={!!busy} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"9px 14px",fontSize:13.5,cursor:"pointer"}}>Über „Abo verwalten“ wechseln</button>
                : <button className="btn-primary" onClick={()=>go("checkout", {plan:"betrieb", currency:cur}, "betrieb")} disabled={!!busy || !mine.available}>{busy==="betrieb" ? "Öffnet Bezahlseite…" : mine.available ? tf("{0} wählen", mine.name) : "Bald verfügbar"}</button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------- Dienstplan --------------------------------
   Wochenplan je Abteilung. Planen dürfen Admins und die Abteilungsleitung;
   Mitarbeitende sehen den Plan ihrer Abteilung und stellen Anträge. */
const SHIFT_KINDS = ["Früh","Spät","Nacht","Zwischen","Frei","Urlaub","Krank"];
const WORK_KINDS = ["Früh","Spät","Nacht","Zwischen"];
const SHIFT_TIMES = {"Früh":["06:00","14:30"],"Spät":["14:00","22:30"],"Nacht":["22:00","06:30"],"Zwischen":["10:00","18:30"]};
const SHIFT_STYLE = {
  "Früh":{bg:"#F1E8D8",fg:"#7A5B2B"}, "Spät":{bg:"#F5E1D0",fg:"#8A4B1E"}, "Nacht":{bg:"#DCE1EA",fg:"#1C2430"},
  "Zwischen":{bg:"#E4EFE8",fg:"#3F7A5C"}, "Frei":{bg:"#F6F4EF",fg:"#6B7280"}, "Urlaub":{bg:"#E6EEF7",fg:"#2F5D8A"}, "Krank":{bg:"#F5E1DE",fg:"#A23B32"},
};
const REQUEST_STATUS_STYLE = {"Offen":{color:WARN,bg:WARN_SOFT}, "Genehmigt":{color:GOOD,bg:GOOD_SOFT}, "Abgelehnt":{color:BAD,bg:BAD_SOFT}, "Zurückgezogen":{color:INK_MUTED,bg:PAPER}};

