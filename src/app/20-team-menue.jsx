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
    catch(e){ setTeamMsg({ok:false, text:e.message}); setDeleting(false); }
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
      {!isAdmin && error && <div style={{color:BAD,fontSize:13,marginBottom:14}}>{error}</div>}
      {isAdmin && <OrgRenameCard orgId={orgId} orgName={orgName} api={api} onRenamed={onRenamed} />}
      {isAdmin && <Card style={{marginBottom:18}}>
        <div style={{fontWeight:700,marginBottom:10}}>Teammitglied einladen</div>
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
        {error && <div style={{color:BAD,fontSize:13,marginTop:10}}>{error}</div>}
        {inviteMsg && <div style={{color:inviteMsg.ok?GOOD:WARN,fontSize:13,marginTop:10}}>{inviteMsg.text}</div>}
        <div style={{fontSize:12,color:INK_MUTED,marginTop:10}}>
          Die Person bekommt den Einladungslink per E-Mail. Sie muss sich damit registrieren oder anmelden,
          dann gehört sie automatisch zu deiner Organisation. Kommt keine Mail an, kannst du den Link unten auch kopieren und selbst weitergeben.
          <br /><b>Admin</b> sieht und verwaltet alles, auch Abo und Team.
          <br /><b>Abteilungsleitung</b> {tf("sieht und verwaltet die zugeordneten Abteilungen – Aufgaben, Budget, Risiken, Personal und Dienstplan – und genehmigt Anträge. Ohne Abteilung: alle Abteilungen.")}
          <br /><b>Mitarbeitende</b> sehen nur die Aufgaben ihrer Abteilungen und ihre eigenen, ihren Dienstplan und können Urlaub, Frei-Wünsche und Schichttausch beantragen.
          <br /><b>Eigentümer (nur lesen)</b> sehen Dashboard, KI-Lagebericht und Statusbericht und können kommentieren, aber nichts ändern – ideal für Eigentümer und Investoren.
        </div>
      </Card>}

      <Card style={{marginBottom:18,padding:0}}>
        <div style={{fontWeight:700,padding:"14px 16px 6px"}}>Mitglieder</div>
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
                  {isAdmin && m.role==="member" && (m.departments||[]).length===0 && <div style={{fontSize:12,color:WARN,marginTop:4}}>Ohne Abteilung sieht diese Person nur Aufgaben, die ihr direkt zugewiesen sind.</div>}
                  {isAdmin && m.role==="manager" && <div style={{fontSize:12,color:INK_MUTED,marginTop:4}}>{(m.departments||[]).length ? tf("Leitet nur die markierten Abteilungen.") : tf("Ohne Abteilung: leitet alle Abteilungen (z. B. Direktion).")}</div>}
                </td>
                <td style={{padding:12,color:INK_MUTED}}>
                  {isAdmin && !isMe
                    ? <select className="input" style={{width:200,padding:"5px 8px",fontSize:13}} value={m.role} onChange={e=>changeRole(m, e.target.value)}>
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
          <div style={{fontWeight:700,marginBottom:6}}>Standardsprache der Organisation</div>
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
          <div style={{fontWeight:700,padding:"14px 16px 6px"}}>Ausstehende Einladungen</div>
          <table className="resp-table" style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}><tbody>
            {invites.filter(i=>i.status==="ausstehend").map(i=>(
              <tr key={i.id} style={{borderTop:`1px solid ${BORDER}`}}>
                <td style={{padding:12}}><span data-no-i18n="">{i.email}</span><div style={{fontSize:11.5,color:INK_MUTED}}>{ROLE_LABELS[i.role] || i.role}</div>
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
        <div style={{fontWeight:700,marginBottom:6,color:BAD}}>Gefahrenzone</div>
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

// Menü je Rolle
function navFor(role, hasBilling, myDepts, disabled){
  const off = disabled || [];
  return navForAll(role, hasBilling, myDepts).filter(n=>!off.includes(n.key));
}
function navForAll(role, hasBilling, myDepts){
  const N = (key,label,section) => ({key,label,section});
  if(role==="viewer") return [N("dashboard","Dashboard"), N("group","Hotelgruppe"), N("timeline","Zeitstrahl"), N("kpis","Kennzahlen"), N("invoices","Rechnungen"), N("procurement","Bestellungen"), N("feedback","Gäste-Feedback"), N("reviews","Bewertungen"), N("energy","Energie"), N("events","Veranstaltungen"), N("permits","Genehmigungen"), N("team","Team"), N("help","Hilfe"), N("account","Konto")];
  // Zimmerstatus sehen alle; im Menü nur für Housekeeping, Rezeption und die Leitung
  const rooms = role!=="member" || (myDepts||[]).some(d=>d==="Housekeeping" || d==="Rezeption & Empfang");
  const ops = [N("roster","Dienstplan","Betrieb"), N("time","Zeiterfassung","Betrieb"), ...(rooms ? [N("rooms","Zimmerstatus","Betrieb")] : []), N("tickets","Meldungen","Betrieb"),
    N("logbook","Übergabebuch","Betrieb"), N("checklists","Checklisten","Betrieb"), N("stock","Lager","Betrieb"), N("lostfound","Fundsachen","Betrieb"), N("trainings","Unterweisungen","Betrieb"), N("chat","Chat","Betrieb")];
  // Anreisen und Bewertungen für Rezeption, Energie für Technik (Mitarbeitende); die Leitung sieht alles
  const reception = (myDepts||[]).includes("Rezeption & Empfang"), technik = (myDepts||[]).includes("Technik");
  const memberExtra = [...(reception ? [N("arrivals","Anreisen","Betrieb"), N("guestchat","Gäste-Chat","Betrieb"), N("reviews","Bewertungen","Betrieb"), N("letters","Briefe & Vorlagen","Betrieb")] : []), ...(technik ? [N("energy","Energie","Betrieb")] : []), N("events","Veranstaltungen","Betrieb")];
  if(role==="member") return [N("dashboard","Start"), N("mine","Meine Aufgaben"), N("tasks","Aufgaben","Projekt"), N("timeline","Zeitstrahl","Projekt"),
    ...ops, ...memberExtra, N("docs","Dokumente","Allgemein"), N("team","Team","Allgemein"), N("help","Hilfe","Allgemein"), N("account","Konto","Allgemein")];
  return [
    N("dashboard","Dashboard"), N("group","Hotelgruppe"), N("mine","Meine Aufgaben"), N("kpis","Kennzahlen"),
    N("tasks","Aufgaben","Projekt"), N("milestones","Meilensteine","Projekt"), N("timeline","Zeitstrahl","Projekt"),
    N("risks","Risiken","Projekt"), N("budget","Budget","Projekt"), N("staff","Personal","Projekt"), N("procurement","Bestellungen","Projekt"),
    ...ops, N("arrivals","Anreisen","Betrieb"), N("guestchat","Gäste-Chat","Betrieb"), N("events","Veranstaltungen","Betrieb"), N("invoices","Rechnungen","Betrieb"), N("letters","Briefe & Vorlagen","Betrieb"), N("feedback","Gäste-Feedback","Betrieb"), N("reviews","Bewertungen","Betrieb"), N("energy","Energie","Betrieb"),
    N("permits","Genehmigungen","Allgemein"), N("docs","Dokumente","Allgemein"), N("team","Team","Allgemein"), N("help","Hilfe","Allgemein"),
    ...(role==="admin" && hasBilling ? [N("billing","Abo","Allgemein")] : []),
    N("account","Konto","Allgemein"),
  ];
}

