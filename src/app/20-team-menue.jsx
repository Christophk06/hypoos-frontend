const ROLE_LABELS = {admin:"Admin", manager:"Abteilungsleitung", member:"Mitarbeitende", viewer:"Eigentümer (nur lesen)"};
const ROLES_WITH_DEPTS = ["manager","member"];

// Abteilungen als Auswahl-Chips
function DeptChips({value, onChange, disabled}){
  const list = value || [];
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {DEPARTMENTS.map(d=>{
        const on = list.includes(d);
        return <button key={d} type="button" disabled={disabled} onClick={()=>onChange(on ? list.filter(x=>x!==d) : [...list, d])}
          style={{border:`1px solid ${on?INK:BORDER}`,background:on?INK:"#fff",color:on?"#fff":INK,borderRadius:999,padding:"4px 10px",fontSize:12,cursor:disabled?"default":"pointer"}}>{d}</button>;
      })}
    </div>
  );
}

// Rechte-Übersicht (Admins): wer was sehen und ändern darf – je Rolle und je Person.
// Maßgeblich sind die Regeln in der Datenbank; diese Übersicht fasst sie verständlich zusammen.
const RIGHTS_AREAS = [
  // [Bereich, Admin, Leitung (mit Abteilungen), Mitarbeitende, Eigentümer]
  ["Team, Rollen und Abo", "ändern", "–", "–", "–"],
  ["Dienstplan", "ändern", "ändern (eigene Abteilungen)", "eigene Schichten sehen, Anträge stellen", "–"],
  ["Zeiterfassung und Lohnexport", "ändern", "korrigieren (eigene Abteilungen)", "eigene Zeiten stempeln", "–"],
  ["Aufgaben, Budget, Risiken", "ändern", "ändern (eigene Abteilungen)", "eigene Abteilung sehen", "sehen"],
  ["Zimmerstatus und Meldungen", "ändern", "ändern", "melden und bearbeiten", "–"],
  ["Kassenbuch", "ändern (auch älter als 7 Tage)", "Finanzen ändert, Rezeption/F&B sehen", "eigene Einträge", "–"],
  ["Mitarbeiter-Dokumente", "ändern", "nur Leitung Personal", "eigene sehen", "–"],
  ["Umfrage-Auswertung", "sehen (ab 5 Antworten)", "sehen (ab 5 Antworten)", "anonym teilnehmen", "–"],
  ["Kennzahlen und Berichte", "sehen", "sehen", "–", "sehen"],
];
function RightsOverview({members}){
  const [open,setOpen] = useState(false);
  const who = (m) => m.role==="admin" ? tf("darf alles, auch Team und Abo")
    : m.role==="viewer" ? tf("liest Berichte und Kennzahlen, ändert nichts")
    : m.role==="manager" ? ((m.departments||[]).length ? tf("leitet: {0}", (m.departments||[]).map(translateString).join(", ")) : tf("leitet alle Abteilungen (Direktion)"))
    : ((m.departments||[]).length ? tf("arbeitet in: {0}", (m.departments||[]).map(translateString).join(", ")) : tf("keine Abteilung – sieht nur Eigenes"));
  return (
    <Card style={{marginBottom:18}}>
      <div {...pressable(()=>setOpen(!open))} aria-expanded={open} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
        <div style={{flex:1}}><b><Icon n="users" /> {tf("Wer darf was?")}</b><div style={{fontSize:12.5,color:INK_MUTED}}>{tf("Rechte je Rolle und je Person auf einen Blick.")}</div></div>
        <span style={{color:INK_MUTED}}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{marginTop:12}}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:640}}>
          <thead><tr style={{color:INK_MUTED,textAlign:"start"}}><th style={{textAlign:"start",padding:"6px 8px"}}>{tf("Bereich")}</th>{["admin","manager","member","viewer"].map(r=><th key={r} style={{textAlign:"start",padding:"6px 8px"}}>{tf(ROLE_LABELS[r])}</th>)}</tr></thead>
          <tbody>{RIGHTS_AREAS.map(([area,...cells])=><tr key={area} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:"6px 8px",fontWeight:600}}>{tf(area)}</td>
            {cells.map((c,i)=><td key={i} style={{padding:"6px 8px",color:c==="–"?INK_MUTED:INK}}>{c==="–" ? "–" : tf(c)}</td>)}
          </tr>)}</tbody>
        </table></div>
        <div className="field-label" style={{marginTop:14}}>{tf("Je Person")}</div>
        {members.map(m=><div key={m.user_id} style={{display:"flex",gap:10,flexWrap:"wrap",padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:13}}>
          <b style={{minWidth:160}} data-no-i18n="">{shortName(m.email)}</b><span style={{color:INK_MUTED}}>{tf(ROLE_LABELS[m.role]||m.role)}</span><span style={{flex:1}}>{who(m)}</span></div>)}
        <div style={{fontSize:11.5,color:INK_MUTED,marginTop:8}}>{tf("Rechte ändern: Rolle und Abteilungen in der Mitgliederliste unten. Die Datenbank prüft jede Aktion selbst – auch wenn jemand die App umgeht.")}</div>
      </div>}
    </Card>
  );
}

function TeamView({orgId, api, inviteLinkBase, orgName, onRenamed, me, orgLanguage, onOrgGone, onLanguageChanged}){
  const [members,setMembers] = useState([]);
  const [invites,setInvites] = useState([]);
  const [email,setEmail] = useState(""); const [role,setRole] = useState("member"); const [inviteDepts,setInviteDepts] = useState([]);
  const [error,setError] = useState(""); const [copiedId,setCopiedId] = useState(null); const [loading,setLoading] = useState(false);
  const [isAdmin,setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m,r] = await Promise.all([
        api("/api/organizations/"+orgId+"/members"),
        api("/api/organizations/"+orgId+"/my-role"),
      ]);
      setMembers(m); setIsAdmin(r.is_admin);
      // Einladungen sehen und verwalten dürfen nur Admins (erzwingt auch die Datenbank).
      setInvites(r.is_admin ? await api("/api/organizations/"+orgId+"/invites") : []);
    } catch(e){ setError(e.message); }
  }, [api, orgId]);

  useEffect(()=>{ load(); }, [load]);

  const invite = async () => {
    if(!email) return;
    setError(""); setInviteMsg(null); setLoading(true);
    try {
      const inv = await api("/api/invites","POST",{organization_id:orgId, email, role, departments: ROLES_WITH_DEPTS.includes(role) ? inviteDepts : []});
      setInviteMsg(inv.email_sent
        ? {ok:true, text:tf("Einladung per E-Mail an {0} verschickt.", inv.email)}
        : {ok:false, text:"Einladung angelegt, aber keine E-Mail verschickt (E-Mail-Versand nicht eingerichtet). Bitte unten den Link kopieren und weitergeben."});
      setEmail(""); await load();
    }
    catch(e){ setError(e.message); }
    setLoading(false);
  };
  const [inviteMsg,setInviteMsg] = useState(null);

  const revoke = async (id) => { await api("/api/invites/"+id,"DELETE"); await load(); };

  const [teamMsg,setTeamMsg] = useState(null);
  const changeRole = async (m, newRole) => {
    setTeamMsg(null);
    try { await api("/api/organizations/"+orgId+"/members/"+m.user_id, "PATCH", {role:newRole}); await load(); setTeamMsg({ok:true, text:tf("{0} ist jetzt {1}.", m.email, translateString(ROLE_LABELS[newRole]))}); }
    catch(e){ setTeamMsg({ok:false, text:e.message}); }
  };
  const changeDepts = async (m, list) => {
    setTeamMsg(null);
    setMembers(ms=>ms.map(x=>x.user_id===m.user_id ? {...x, departments:list} : x));
    try { await api("/api/organizations/"+orgId+"/members/"+m.user_id, "PATCH", {departments:list}); }
    catch(e){ setTeamMsg({ok:false, text:e.message}); await load(); }
  };
  const removeMember = async (m) => {
    if(!window.confirm(tf("{0} aus der Organisation entfernen? Die Person verliert sofort den Zugriff; ihre Aufgaben bleiben erhalten, aber ohne Zuständigkeit.", m.email))) return;
    setTeamMsg(null);
    try { await api("/api/organizations/"+orgId+"/members/"+m.user_id, "DELETE"); await load(); setTeamMsg({ok:true, text:tf("{0} wurde entfernt.", m.email)}); }
    catch(e){ setTeamMsg({ok:false, text:e.message}); }
  };
  const leave = async () => {
    if(!window.confirm(tf("„{0}“ wirklich verlassen? Du verlierst den Zugriff, bis dich ein Admin wieder einlädt.", orgName))) return;
    try { await api("/api/organizations/"+orgId+"/members/"+me.id, "DELETE"); onOrgGone(); }
    catch(e){ setTeamMsg({ok:false, text:e.message}); }
  };
  const [confirmName,setConfirmName] = useState("");
  const [deleting,setDeleting] = useState(false);
  const deleteOrg = async () => {
    setDeleting(true); setTeamMsg(null);
    try { await api("/api/organizations/"+orgId, "DELETE", {confirm:true}); onOrgGone(); }
    catch(e){
      // Rechnungen vorhanden (Aufbewahrungspflicht): ausdrücklich bestätigen lassen
      if(e.code==="invoices" && window.confirm(e.message+"\n\n"+tf("Rechnungen sind gesichert – trotzdem endgültig löschen?"))){
        try { await api("/api/organizations/"+orgId, "DELETE", {confirm:true, invoices_ack:true}); onOrgGone(); return; } catch(e2){ e = e2; }
      }
      setTeamMsg({ok:false, text:e.message}); setDeleting(false);
    }
  };
  const setLanguage = async (lang) => {
    setTeamMsg(null);
    try { await api("/api/organizations/"+orgId, "PATCH", {language:lang}); onLanguageChanged(lang); }
    catch(e){ setTeamMsg({ok:false, text:e.message}); }
  };

  const [shownLinkId,setShownLinkId] = useState(null);
  const linkFor = (invite) => inviteLinkBase + "?invite=" + invite.token;
  const copyLink = (invite) => {
    // Link immer auch sichtbar anzeigen – manche Browser blockieren die Zwischenablage.
    setShownLinkId(invite.id);
    try {
      navigator.clipboard.writeText(linkFor(invite))
        .then(()=>{ setCopiedId(invite.id); setTimeout(()=>setCopiedId(null),1800); })
        .catch(()=>{});
    } catch(e){}
  };

  return (
    <div>
      {!isAdmin && error && <ErrorText style={{marginBottom:14}}>{error}</ErrorText>}
      {isAdmin && <OrgRenameCard orgId={orgId} orgName={orgName} api={api} onRenamed={onRenamed} />}
      {isAdmin && <Card style={{marginBottom:18}}>
        <h2 className="ui-h" style={{fontWeight:700,marginBottom:10}}>Teammitglied einladen</h2>
        <div className="stack" style={{display:"flex",gap:10}}>
          <input className="input" placeholder="E-Mail-Adresse" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&invite()} />
          <select className="input" style={{width:190}} value={role} onChange={e=>setRole(e.target.value)}>
            <option value="member">Mitarbeitende</option>
            <option value="manager">Abteilungsleitung</option>
            <option value="viewer">Eigentümer (nur lesen)</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary" onClick={invite} disabled={loading}>{loading?"…":"Einladen"}</button>
          <StaffImportButton orgId={orgId} api={api} onDone={load} />
        </div>
        {ROLES_WITH_DEPTS.includes(role) && (
          <div style={{marginTop:12}}>
            <div className="field-label">Abteilungen</div>
            <DeptChips value={inviteDepts} onChange={setInviteDepts} />
            <div style={{fontSize:12,color:INK_MUTED,marginTop:6}}>{role==="manager"
              ? tf("Abteilungsleitung: sieht und plant nur die markierten Abteilungen. Keine Abteilung markiert = alle Abteilungen (z. B. Direktion).")
              : tf("Mitarbeitende sehen nur Aufgaben und Dienstplan der markierten Abteilungen.")}</div>
          </div>
        )}
        {error && <ErrorText style={{marginTop:10}}>{error}</ErrorText>}
        {inviteMsg && <div style={{color:inviteMsg.ok?GOOD:WARN_TEXT,fontSize:13,marginTop:10}}>{inviteMsg.text}</div>}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:10}}>
          Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden,
          dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.
          <br /><b>Admin</b> sieht und verwaltet alles, auch Abo und Team.
          <br /><b>Abteilungsleitung</b> {tf("sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen.")}
          <br /><b>Mitarbeitende</b> sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.
          <br /><b>Eigentümer (nur lesen)</b> sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.
        </div>
      </Card>}

      {isAdmin && <RightsOverview members={members} />}
      <Card style={{marginBottom:18,padding:0}}>
        <h2 className="ui-h" style={{fontWeight:700,padding:"14px 16px 6px"}}>Mitglieder</h2>
        <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
          {members.filter(m=>ACCESS.role!=="member" || m.role==="admin" || (me && m.user_id===me.id)
              || (m.departments||[]).some(d=>(ACCESS.depts||[]).includes(d))).map(m=>{
            const isMe = me && m.user_id===me.id;
            return (
              <tr key={m.user_id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={{padding:12}}>
                  <span data-no-i18n="">{m.email}</span>{isMe && <span style={{color:INK_MUTED}}> (du)</span>}
                  {ROLES_WITH_DEPTS.includes(m.role) && (isAdmin
                    ? <div style={{marginTop:8}}><DeptChips value={m.departments} onChange={list=>changeDepts(m, list)} /></div>
                    : <div style={{fontSize:12,color:INK_MUTED,marginTop:4}}>{(m.departments||[]).length ? (m.departments||[]).map((d,i)=><React.Fragment key={d}>{i>0 && ", "}<span>{d}</span></React.Fragment>) : <span>Keine Abteilung</span>}</div>)}
                  {isAdmin && m.role==="member" && (m.departments||[]).length===0 && <div style={{fontSize:12,color:WARN_TEXT,marginTop:4}}>Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.</div>}
                  {isAdmin && m.role==="manager" && <div style={{fontSize:12,color:INK_MUTED,marginTop:4}}>{(m.departments||[]).length ? tf("Leitet nur die markierten Abteilungen.") : tf("Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion).")}</div>}
                </td>
                <td style={{padding:12,color:INK_MUTED}}>
                  {isAdmin && !isMe
                    ? <select className="input" aria-label={tf("Rolle")} style={{width:200,padding:"5px 8px",fontSize:13}} value={m.role} onChange={e=>changeRole(m, e.target.value)}>
                        {Object.entries(ROLE_LABELS).map(([k,l])=><option key={k} value={k}>{l}</option>)}
                      </select>
                    : (ROLE_LABELS[m.role] || m.role)}
                </td>
                <td style={{padding:12,color:INK_MUTED}}>{tf("seit {0}", fmtDate(m.joined_at))}</td>
                <td style={{padding:12,textAlign:"right"}}>
                  {isAdmin && !isMe && <button style={{...linkBtn,color:BAD}} onClick={()=>removeMember(m)}>Entfernen</button>}
                </td>
              </tr>
            );
          })}
        </tbody></table>
      </Card>

      {teamMsg && <div style={{color:teamMsg.ok?GOOD:BAD,fontSize:13,margin:"-8px 0 14px"}}>{teamMsg.text}</div>}

      {isAdmin && (
        <Card style={{marginBottom:18}}>
          <h2 className="ui-h" style={{fontWeight:700,marginBottom:6}}>Standardsprache der Organisation</h2>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>Gilt für E-Mails, die Pre-Opening-Vorlage, den KI-Lagebericht und für alle Mitglieder ohne eigene Sprachauswahl.</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}} data-no-i18n="">
            {LANGS.map(([k,l])=>(
              <button key={k} onClick={()=>setLanguage(k)} className={orgLanguage===k?"btn-primary":""}
                style={orgLanguage===k ? {} : {background:"none",border:`1px solid ${BORDER}`,borderRadius:4,padding:"9px 16px",fontSize:13.5,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
        </Card>
      )}

      {invites.filter(i=>i.status==="ausstehend").length > 0 && (
        <Card style={{padding:0}}>
          <h2 className="ui-h" style={{fontWeight:700,padding:"14px 16px 6px"}}>Ausstehende Einladungen</h2>
          <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
            {invites.filter(i=>i.status==="ausstehend").map(i=>(
              <tr key={i.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={{padding:12}}><span data-no-i18n="">{i.email}</span><div style={{fontSize:11.5,color:INK_MUTED}}>{ROLE_LABELS[i.role] || i.role}{i.expires_at ? " · " : ""}{i.expires_at ? (new Date(i.expires_at) < new Date() ? <span style={{color:BAD}}>{tf("abgelaufen – bitte neu einladen")}</span> : tf("gültig bis {0}", fmtDate(String(i.expires_at).slice(0,10)))) : null}</div>
                  {shownLinkId===i.id && (
                    <input readOnly className="input" value={linkFor(i)} onFocus={e=>e.target.select()} autoFocus
                      style={{marginTop:8,fontSize:12}} />
                  )}
                </td>
                <td style={{padding:12}}>
                  <button onClick={()=>copyLink(i)} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,padding:"5px 10px",fontSize:12.5,cursor:"pointer"}}>
                    {copiedId===i.id ? "Kopiert!" : "Link kopieren"}
                  </button>
                </td>
                <td style={{padding:12}}><button onClick={()=>revoke(i.id)} style={{background:"none",border:"none",color:INK_MUTED,cursor:"pointer"}}>✕</button></td>
              </tr>
            ))}
          </tbody></table>
        </Card>
      )}

      <Card style={{marginTop:18,borderColor:BAD_SOFT}}>
        <h2 className="ui-h" style={{fontWeight:700,marginBottom:6,color:BAD}}>Gefahrenzone</h2>
        {!isAdmin && (
          <div>
            <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>Wenn du die Organisation verlässt, verlierst du den Zugriff auf alle ihre Hotels.</div>
            <button onClick={leave} style={{background:"none",border:`1px solid ${BAD}`,color:BAD,borderRadius:4,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>Organisation verlassen</button>
          </div>
        )}
        {isAdmin && (
          <div>
            <div style={{fontSize:13,color:INK_MUTED,marginBottom:10}}>
              Löscht <b>„{orgName}“</b> endgültig mit allen Hotels, Aufgaben, Kommentaren, Dokumenten und Berichten. Ein laufendes Abo wird sofort beendet.
              Exportiere vorher bei Bedarf jedes Hotel über „Excel-Export“. <b>Das kann nicht rückgängig gemacht werden.</b>
            </div>
            <Field label={tf("Zur Bestätigung den Namen der Organisation eingeben: {0}", orgName)}>
              <input className="input" value={confirmName} onChange={e=>setConfirmName(e.target.value)} />
            </Field>
            <button onClick={deleteOrg} disabled={deleting || confirmName.trim()!==orgName.trim()}
              style={{background:confirmName.trim()===orgName.trim()?BAD:"#ccc",color:"#fff",border:"none",borderRadius:4,padding:"9px 16px",fontSize:13.5,fontWeight:600,cursor:"pointer"}}>
              {deleting ? "Wird gelöscht…" : "Organisation endgültig löschen"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Menü je Rolle. Der Betrieb ist in vier Gruppen geteilt, damit das Menü übersichtlich bleibt.
const NAV_DAY = "Tagesgeschäft", NAV_TEAM = "Team & Dienstplan", NAV_HOUSE = "Haus & Technik", NAV_GUESTS = "Gäste & Verkauf";
const NAV_SECTION_OF = {
  logbook:NAV_DAY, checklists:NAV_DAY, cash:NAV_DAY,
  roster:NAV_TEAM, time:NAV_TEAM, trainings:NAV_TEAM, academy:NAV_TEAM, instructions:NAV_TEAM, sick:NAV_TEAM, uniforms:NAV_TEAM, pulse:NAV_TEAM, staffdocs:NAV_TEAM, housing:NAV_TEAM, recruiting:NAV_TEAM, probation:NAV_TEAM, firstaid:NAV_TEAM, payables:NAV_DAY, pos:NAV_DAY, queue:NAV_GUESTS, cityevents:NAV_GUESTS, accessibility:NAV_HOUSE, network:NAV_TEAM, apprentices:NAV_TEAM, myself:NAV_TEAM, sustainability:NAV_HOUSE, laundry:NAV_HOUSE, minibar:NAV_GUESTS, breakfast:NAV_GUESTS, chat:NAV_TEAM,
  rooms:NAV_HOUSE, tickets:NAV_HOUSE, assets:NAV_HOUSE, patrols:NAV_HOUSE, keys:NAV_HOUSE, stock:NAV_HOUSE, lostfound:NAV_HOUSE, energy:NAV_HOUSE,
  frontdesk:NAV_GUESTS, arrivals:NAV_GUESTS, guestchat:NAV_GUESTS, reviews:NAV_GUESTS, feedback:NAV_GUESTS, events:NAV_GUESTS, letters:NAV_GUESTS, invoices:NAV_GUESTS, tourismtax:NAV_GUESTS,
};
const NAV_ORDER = ["", "Projekt", NAV_DAY, NAV_TEAM, NAV_HOUSE, NAV_GUESTS, "Betrieb", "Allgemein"];
function navFor(role, hasBilling, myDepts, disabled){
  const off = disabled || [];
  const list = navForAll(role, hasBilling, myDepts).filter(n=>!off.includes(n.key))
    .map(n=>n.section==="Betrieb" && NAV_SECTION_OF[n.key] ? {...n, section:NAV_SECTION_OF[n.key]} : n);
  const rank = (n) => { const i = NAV_ORDER.indexOf(n.section||""); return i<0 ? NAV_ORDER.length : i; };
  return list.map((n,i)=>({n,i})).sort((a,b)=>rank(a.n)-rank(b.n) || a.i-b.i).map(x=>x.n);
}
function navForAll(role, hasBilling, myDepts){
  const N = (key,label,section) => ({key,label,section});
  if(role==="viewer") return [N("dashboard","Dashboard"), N("group","Hotelgruppe"), N("timeline","Zeitstrahl"), N("kpis","Kennzahlen"), N("invoices","Rechnungen"), N("procurement","Bestellungen"), N("feedback","Gäste-Feedback"), N("reviews","Bewertungen"), N("energy","Energie"), N("events","Veranstaltungen"), N("permits","Genehmigungen"), N("team","Team"), N("help","Hilfe"), N("account","Konto")];
  // Zimmerstatus sehen alle; im Menü nur für Housekeeping, Rezeption und die Leitung
  const rooms = role!=="member" || (myDepts||[]).some(d=>d==="Housekeeping" || d==="Rezeption & Empfang");
  const ops = [N("roster","Dienstplan","Betrieb"), N("time","Zeiterfassung","Betrieb"), ...(rooms ? [N("rooms","Zimmerstatus","Betrieb")] : []), N("tickets","Meldungen","Betrieb"),
    N("logbook","Übergabebuch","Betrieb"), N("checklists","Checklisten","Betrieb"), N("stock","Lager","Betrieb"), N("lostfound","Fundsachen","Betrieb"), N("trainings","Unterweisungen","Betrieb"), N("chat","Chat","Betrieb")];
  // Anreisen und Bewertungen für Rezeption, Energie für Technik (Mitarbeitende); die Leitung sieht alles
  const reception = (myDepts||[]).includes("Rezeption & Empfang"), technik = (myDepts||[]).includes("Technik"), fnb = (myDepts||[]).includes("Food & Beverage");
  const housekeeping = (myDepts||[]).includes("Housekeeping");
  const memberExtra = [N("myself","Meine Unterlagen","Betrieb"), N("network","Aushilfs-Börse","Betrieb"), N("apprentices","Berichtsheft","Betrieb"), ...(reception || fnb ? [N("cash","Kassenbuch","Betrieb"), N("queue","Warteliste Gäste","Betrieb")] : []), ...(housekeeping ? [N("laundry","Wäscherei","Betrieb")] : []), ...(housekeeping || reception ? [N("minibar","Minibar","Betrieb")] : []), N("academy","Akademie","Betrieb"), N("instructions","Arbeitsanweisungen","Betrieb"), ...(technik ? [N("assets","Gerätebuch","Betrieb"), N("patrols","Kontrollgänge","Betrieb")] : []), ...(reception ? [N("frontdesk","Rezeption heute","Betrieb"), N("arrivals","Anreisen","Betrieb"), N("guestchat","Gäste-Chat","Betrieb"), N("reviews","Bewertungen","Betrieb"), N("letters","Briefe & Vorlagen","Betrieb")] : []), ...(technik ? [N("energy","Energie","Betrieb")] : []), N("events","Veranstaltungen","Betrieb")];
  if(role==="member") return [N("dashboard","Start"), N("mine","Meine Aufgaben"), N("tasks","Aufgaben","Projekt"), N("timeline","Zeitstrahl","Projekt"),
    ...ops, ...memberExtra, N("docs","Dokumente","Allgemein"), N("team","Team","Allgemein"), N("help","Hilfe","Allgemein"), N("wishes","Wünsche & Ideen","Allgemein"), N("account","Konto","Allgemein")];
  return [
    N("dashboard","Dashboard"), N("group","Hotelgruppe"), N("mine","Meine Aufgaben"), N("kpis","Kennzahlen"), N("memory","Hotel-Gedächtnis"),
    N("tasks","Aufgaben","Projekt"), N("milestones","Meilensteine","Projekt"), N("timeline","Zeitstrahl","Projekt"),
    N("risks","Risiken","Projekt"), N("simulator","Probebetrieb","Projekt"), N("equipment","Erstausstattung","Projekt"), N("quotes","Angebotsvergleich","Projekt"), N("waitlist","Eröffnungs-Warteliste","Projekt"), N("budget","Budget","Projekt"), N("staff","Personal","Projekt"), N("procurement","Bestellungen","Projekt"),
    ...ops, N("academy","Akademie","Betrieb"), N("instructions","Arbeitsanweisungen","Betrieb"), N("assets","Gerätebuch","Betrieb"), N("patrols","Kontrollgänge","Betrieb"), N("tourismtax","Ortstaxe","Betrieb"), N("sick","Krankmeldungen","Betrieb"), N("cash","Kassenbuch","Betrieb"), N("keys","Schlüssel & Karten","Betrieb"), N("uniforms","Dienstkleidung","Betrieb"), N("pulse","Mitarbeiter-Umfrage","Betrieb"), N("staffdocs","Mitarbeiter-Dokumente","Betrieb"), N("housing","Personalunterkünfte","Betrieb"), N("recruiting","Stellen & Bewerbungen","Betrieb"), N("probation","Probezeit","Betrieb"), N("firstaid","Ersthelfer & Sicherheit","Betrieb"), N("payables","Eingangsrechnungen","Betrieb"), N("pos","Kassenumsätze","Betrieb"), N("queue","Warteliste Gäste","Betrieb"), N("cityevents","Ereignisse in der Stadt","Betrieb"), N("accessibility","Barrierefreiheit","Betrieb"), N("network","Aushilfs-Börse","Betrieb"), N("apprentices","Lehrlinge","Betrieb"), N("sustainability","Nachhaltigkeit","Betrieb"), N("season","Saison-Übergabe","Allgemein"), N("laundry","Wäscherei","Betrieb"), N("minibar","Minibar","Betrieb"), N("breakfast","Frühstücksplanung","Betrieb"), N("frontdesk","Rezeption heute","Betrieb"), N("arrivals","Anreisen","Betrieb"), N("guestchat","Gäste-Chat","Betrieb"), N("events","Veranstaltungen","Betrieb"), N("invoices","Rechnungen","Betrieb"), N("letters","Briefe & Vorlagen","Betrieb"), N("feedback","Gäste-Feedback","Betrieb"), N("reviews","Bewertungen","Betrieb"), N("energy","Energie","Betrieb"),
    N("emergency","Notfall","Allgemein"), N("permits","Genehmigungen","Allgemein"), N("docs","Dokumente","Allgemein"), N("team","Team","Allgemein"), N("help","Hilfe","Allgemein"),
    N("wishes","Wünsche & Ideen","Allgemein"),
    ...(role==="admin" ? [N("integrations","Schnittstellen","Allgemein")] : []),
    ...(role==="admin" && hasBilling ? [N("billing","Abo","Allgemein")] : []),
    ...(PLATFORM_ADMIN ? [N("platform","Plattform","Allgemein")] : []),
    N("account","Konto","Allgemein"),
  ];
}

