// ------------------------------------------------------------ Veranstaltungen und Bankett
const EVENT_STATUS = {"Anfrage":[INK_MUTED,PAPER], "Option":[WARN_TEXT,WARN_SOFT], "Fix":[GOOD_TEXT,GOOD_SOFT], "Storniert":[BAD,BAD_SOFT]};
// ------------------------------------------------------------ Function Sheet als gestaltetes PDF (Drucken, Herunterladen, Teilen)
const FS_CSS = `
  .fs{font-family:Inter,Arial,sans-serif;color:#1C2430;font-size:12.5px;line-height:1.45;width:182mm;background:#fff}
  .fs *{box-sizing:border-box}
  .fs .hd{display:flex;align-items:center;gap:12px;border-bottom:3px solid var(--fs-accent);padding-bottom:10px;margin-bottom:12px}
  .fs .hd img{height:38px;max-width:110px;object-fit:contain}
  .fs .hd .h{flex:1}
  .fs .hd .hotel{font-size:11px;color:#6B7280;letter-spacing:.08em}
  .fs h1{font-family:Georgia,serif;font-size:22px;margin:2px 0 0;font-weight:600}
  .fs .st{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:#F1E8D8;color:#7a5c22;white-space:nowrap}
  .fs .facts{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
  .fs .f{background:#F6F4EF;border-radius:6px;padding:7px 9px}
  .fs .f .l{font-size:9.5px;color:#6B7280;letter-spacing:.06em}
  .fs .f .v{font-weight:700;font-size:13px;margin-top:1px}
  .fs .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fs .box{border:1px solid #E4DFD3;border-radius:8px;padding:9px 11px;break-inside:avoid;page-break-inside:avoid}
  .fs .box h3{margin:0 0 5px;font-size:10.5px;color:var(--fs-accent);letter-spacing:.07em}
  .fs .box .b{white-space:pre-wrap}
  .fs .full{grid-column:1 / -1}
  .fs .tl{display:flex;flex-wrap:wrap;gap:6px}
  .fs .tl span{background:#F6F4EF;border-left:3px solid var(--fs-accent);padding:4px 8px;border-radius:4px;font-size:12px}
  .fs .tl b{margin-inline-end:4px}
  .fs table.dp{width:100%;border-collapse:collapse}
  .fs table.dp td{padding:5px 4px;border-top:1px solid #F0ECE3;vertical-align:top}
  .fs table.dp td.c{width:18px}
  .fs table.dp td.c i{display:inline-block;width:11px;height:11px;border:1.5px solid #9aa3af;border-radius:2px}
  .fs table.dp td.k{width:34%;font-weight:700}
  .fs .sig{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:22px}
  .fs .sig div{border-top:1px solid #1C2430;padding-top:4px;font-size:10.5px;color:#6B7280}
  .fs .ft{margin-top:12px;font-size:9.5px;color:#9aa3af;display:flex;justify-content:space-between}
  .fs .wk h2{font-family:Georgia,serif;font-size:15px;margin:14px 0 6px;border-bottom:1px solid #E4DFD3;padding-bottom:3px}
  .fs .wk table{width:100%;border-collapse:collapse;font-size:12px}
  .fs .wk td{padding:5px 4px;border-top:1px solid #F0ECE3;vertical-align:top}
  .fs .pb{page-break-before:always;break-before:page}
`;
const fsEsc = (s) => String(s==null?"":s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fsT = (s) => fsEsc(translateString(s));
// Hinweise: Zeile "Ablauf: 14:00 Trauung · 15:00 Empfang …" wird zur Zeitleiste, "Küche: …" zu Aufgaben je Abteilung
// Allergene: österreichische Kürzel A–R (14 Hauptallergene) in Klammern hinter dem Gericht, z. B. „Rindssuppe (A, C, L)“
const ALLERGENS = [["A","Gluten"],["B","Krebstiere"],["C","Eier"],["D","Fisch"],["E","Erdnüsse"],["F","Soja"],["G","Milch und Laktose"],["H","Schalenfrüchte"],["L","Sellerie"],["M","Senf"],["N","Sesam"],["O","Sulfite"],["P","Lupinen"],["R","Weichtiere"]];
const allergenCodes = (text) => { const set = new Set(); String(text||"").replace(/\(([A-R](?:\s*,\s*[A-R])*)\)/g, (m, g) => { g.split(",").forEach(x=>set.add(x.trim())); return m; }); return ALLERGENS.filter(([c])=>set.has(c)); };
// Kürzel an die letzte Zeile anhängen: „(A)“ → „(A, C)“
function addAllergen(menu, code){
  const lines = String(menu||"").split("\n"); let last = lines.pop() || "";
  const m = last.match(/\(([A-R](?:\s*,\s*[A-R])*)\)\s*$/);
  if(m){ const codes = m[1].split(",").map(x=>x.trim()); if(!codes.includes(code)) codes.push(code); codes.sort(); last = last.slice(0, m.index).replace(/\s+$/,"") + " (" + codes.join(", ") + ")"; }
  else last = last.replace(/\s+$/,"") + " (" + code + ")";
  return [...lines, last].join("\n").replace(/^\s+/, "");
}
function allergenLegendHtml(menu){
  const list = allergenCodes(menu); if(!list.length) return "";
  return '<div class="box"><h3>'+fsT("Allergene")+'</h3><div class="b">'+list.map(([c,n])=>'<b>'+c+'</b> '+fsEsc(tf(n))).join(" · ")+'</div></div>';
}
function AllergenHelp({onPick, menu}){
  const [open,setOpen] = useState(false);
  const used = allergenCodes(menu).map(([c])=>c);
  return (
    <div style={{marginTop:-6,marginBottom:10}}>
      <button type="button" style={{...linkBtn,fontSize:12.5}} aria-expanded={open} onClick={()=>setOpen(!open)}>{tf("Allergene (A–R) einfügen")}</button>
      {open && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
        {ALLERGENS.map(([c,n])=><button key={c} type="button" title={tf(n)} onClick={()=>onPick(c)}
          style={{border:`1px solid ${used.includes(c)?INK:BORDER}`,background:used.includes(c)?INK:"#fff",color:used.includes(c)?"#fff":INK,borderRadius:999,padding:"4px 10px",fontSize:12.5,cursor:"pointer"}}><b data-no-i18n="">{c}</b> {tf(n)}</button>)}
        <div style={{fontSize:12,color:INK_MUTED,width:"100%"}}>{tf("Kürzel werden an die letzte Zeile angehängt. Das Function Sheet druckt die Legende automatisch.")}</div>
      </div>}
    </div>
  );
}

function fsNotes(notes){
  const lines = String(notes||"").split(/\n+/).map(l=>l.trim()).filter(Boolean);
  let timeline = null; const rows = [], rest = [];
  lines.forEach((l, i)=>{
    const m = l.match(/^([^:：]{1,40})[:：]\s*(.+)$/);
    if(i===0 && m && /\d{1,2}[:.]\d{2}|\d{1,2}\s?(am|pm|h)/i.test(m[2])) timeline = m[2].split(/\s*·\s*/).filter(Boolean);
    else if(m) rows.push([m[1], m[2]]);
    else rest.push(l);
  });
  return {timeline, rows, rest};
}
function functionSheetHtml(ev, hotel){
  const time = [ev.start_time&&String(ev.start_time).slice(0,5), ev.end_time&&String(ev.end_time).slice(0,5)].filter(Boolean).join("–");
  const facts = [["Datum", fmtDay(ev.event_date,{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})], ["Zeit", time], ["Raum", ev.location], ["Personen", ev.guests]]
    .map(([l,v])=>'<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+fsEsc(v==null||v===""?"–":v)+'</div></div>').join("");
  const box = (l, v, cls) => v ? '<div class="box '+(cls||"")+'"><h3>'+fsT(l)+'</h3><div class="b">'+fsEsc(v)+'</div></div>' : "";
  const n = fsNotes(ev.notes);
  const contact = [ev.client, ev.contact].filter(Boolean).join(" · ");
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'
    + '<div class="hd">'+(hotel.logo_data?'<img src="'+fsEsc(hotel.logo_data)+'" />':'')+'<div class="h"><div class="hotel">'+fsEsc(hotel.name)+' · '+fsT("Function Sheet")+'</div><h1>'+fsEsc(ev.title)+'</h1></div><span class="st">'+fsT(ev.status||"Anfrage")+'</span></div>'
    + '<div class="facts">'+facts+'</div>'
    + (contact ? '<div class="box" style="margin-bottom:10px"><h3>'+fsT("Kunde")+'</h3><div class="b">'+fsEsc(contact)+'</div></div>' : "")
    + (n.timeline ? '<div class="box" style="margin-bottom:10px"><h3>'+fsT("Ablauf")+'</h3><div class="tl">'+n.timeline.map(t=>{ const m = t.match(/^(\S+\s?(am|pm)?)\s+(.+)$/i); return '<span>'+(m?'<b>'+fsEsc(m[1])+'</b>'+fsEsc(m[3]):fsEsc(t))+'</span>'; }).join("")+'</div></div>' : "")
    + '<div class="grid">'+box("Menü und Getränke", ev.menu)+allergenLegendHtml(ev.menu)+box("Aufbau und Bestuhlung", ev.setup)+box("Technik", ev.tech)
    + (n.rows.length ? '<div class="box'+(ev.tech?'':' ')+'"><h3>'+fsT("Aufgaben je Abteilung")+'</h3><table class="dp">'+n.rows.map(([k,v])=>'<tr><td class="c"><i></i></td><td class="k">'+fsEsc(k)+'</td><td>'+fsEsc(v)+'</td></tr>').join("")+'</table></div>' : "")
    + (n.rest.length ? '<div class="box full"><h3>'+fsT("Hinweise")+'</h3><div class="b">'+fsEsc(n.rest.join("\n"))+'</div></div>' : "")
    + '</div>'
    + '<div class="sig"><div>'+fsT("Kunde")+' – '+fsT("Datum und Unterschrift")+'</div><div>'+fsT("Bankettleitung")+' – '+fsT("Datum und Unterschrift")+'</div></div>'
    + '<div class="ft"><span>'+fsT("Erstellt mit Ouverture")+'</span><span>'+fsEsc(fmtDateTime(new Date().toISOString()))+'</span></div></div>';
}
function weekSheetHtml(events, hotel, from){
  const to = addDaysIso(from, 6);
  const list = events.filter(e=>e.event_date>=from && e.event_date<=to && e.status!=="Storniert").sort((a,b)=>(a.event_date+(a.start_time||"")).localeCompare(b.event_date+(b.start_time||"")));
  const days = {}; list.forEach(e=>{ (days[e.event_date]=days[e.event_date]||[]).push(e); });
  return '<div class="fs wk" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'
    + '<div class="hd">'+(hotel.logo_data?'<img src="'+fsEsc(hotel.logo_data)+'" />':'')+'<div class="h"><div class="hotel">'+fsEsc(hotel.name)+'</div><h1>'+fsT("Veranstaltungen")+' '+fsEsc(fmtDay(from,{day:"2-digit",month:"2-digit"}))+'–'+fsEsc(fmtDay(to,{day:"2-digit",month:"2-digit",year:"numeric"}))+'</h1></div></div>'
    + (list.length ? Object.keys(days).map(d=>'<h2>'+fsEsc(fmtDay(d,{weekday:"long",day:"numeric",month:"long"}))+'</h2><table>'+days[d].map(e=>'<tr><td style="width:70px"><b>'+fsEsc((e.start_time||"").slice(0,5))+'</b>'+(e.end_time?'–'+fsEsc(e.end_time.slice(0,5)):'')+'</td><td><b>'+fsEsc(e.title)+'</b> · '+fsEsc([e.location, e.guests!=null&&e.guests!==""?tf("{0} Personen", e.guests):null].filter(Boolean).join(" · "))+'<div style="color:#6B7280;white-space:pre-wrap">'+fsEsc(e.menu||"")+'</div></td><td style="width:70px;text-align:end">'+fsT(e.status)+'</td></tr>').join("")+'</table>').join("")
      : '<p>'+fsT("Keine Veranstaltungen in diesem Zeitraum.")+'</p>')
    + '<div class="ft"><span>'+fsT("Erstellt mit Ouverture")+'</span><span>'+fsEsc(fmtDateTime(new Date().toISOString()))+'</span></div></div>';
}
function printSheet(html, title){
  const w = window.open("", "_blank"); if(!w) return;
  w.document.write('<!doctype html><html lang="'+UI_LANG+'" dir="'+(UI_LANG==="ar"?"rtl":"ltr")+'"><meta charset="utf-8"><title>'+fsEsc(title)+'</title><style>@page{size:A4;margin:14mm}body{margin:0}'+FS_CSS+'</style>'+html+'<script>setTimeout(function(){window.print()},350)<\/script>');
  w.document.close();
}
// PDF erzeugen (html2pdf) und herunterladen bzw. am Handy teilen
async function sheetPdf(html, fileName, share, orientation, asBlob){
  await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff";
  host.dir = UI_LANG==="ar" ? "rtl" : "ltr";
  host.innerHTML = "<style>"+FS_CSS+"</style>"+html;
  document.body.appendChild(host);
  try {
    const opt = {margin:orientation==="landscape"?[10,12,10,12]:[12,14,12,14], filename:fileName, image:{type:"jpeg", quality:0.95}, html2canvas:{scale:2, useCORS:true, backgroundColor:"#ffffff"}, jsPDF:{unit:"mm", format:"a4", orientation:orientation||"portrait"}, pagebreak:{mode:["css","legacy"]}};
    // html2pdf zentriert den Inhalt; mit Bildlaufleiste verrutscht er dabei um ein paar Pixel nach rechts – daher linksbündig
    const blob = await window.html2pdf().set(opt).from(host.querySelector(".fs")).toContainer().then(function(){ this.prop.container.style.margin = "0"; this.prop.container.style.right = "auto"; }).outputPdf("blob");
    if(asBlob) return blob;
    const file = new File([blob], fileName, {type:"application/pdf"});
    if(share && navigator.canShare && navigator.canShare({files:[file]})){ try { await navigator.share({files:[file], title:fileName}); return; } catch(e){ if(e && e.name==="AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
  } finally { host.remove(); }
}
const sheetName = (ev) => (translateString("Function Sheet")+" "+ev.title+" "+ev.event_date).replace(/[\\/:*?"<>|]+/g,"").slice(0,90)+".pdf";
function printFunctionSheet(ev, hotel){ printSheet(functionSheetHtml(ev, hotel), ev.title); }
function SheetButtons({ev, hotel}){
  const [busy,setBusy] = useState("");
  const run = async (k, fn) => { setBusy(k); try { await fn(); } catch(e){ window.alert(tf("PDF konnte nicht erstellt werden: {0}", e.message)); } setBusy(""); };
  const canShare = typeof navigator!=="undefined" && !!navigator.share;
  return (
    <React.Fragment>
      <button style={smallBtn} disabled={!!busy} onClick={()=>run("pdf", ()=>sheetPdf(functionSheetHtml(ev, hotel), sheetName(ev), false))}>{busy==="pdf"?"…":<React.Fragment><Icon n="filetext" /> PDF</React.Fragment>}</button>
      {canShare && <button style={smallBtn} disabled={!!busy} onClick={()=>run("share", ()=>sheetPdf(functionSheetHtml(ev, hotel), sheetName(ev), true))}>{busy==="share"?"…":"↗ "+tf("Teilen")}</button>}
      <button style={smallBtn} onClick={()=>printFunctionSheet(ev, hotel)} title={tf("Drucken")}><Icon n="printer" /></button>
    </React.Fragment>
  );
}

// ============================================================ Migration 026: weitere PDFs, Personalbedarf, Räume, Angebote

const fsHead = (hotel, title, sub) => '<div class="hd">'+(hotel.logo_data?'<img src="'+fsEsc(hotel.logo_data)+'" />':'')+'<div class="h"><div class="hotel">'+fsEsc(hotel.name)+(sub?' · '+fsEsc(sub):'')+'</div><h1>'+fsEsc(title)+'</h1></div></div>';
const fsFoot = () => '<div class="ft"><span>'+fsT("Erstellt mit Ouverture")+'</span><span>'+fsEsc(fmtDateTime(new Date().toISOString()))+'</span></div>';
const FS_TABLE = '<style>.fs table.t{width:100%;border-collapse:collapse;font-size:11px}.fs table.t th{text-align:start;font-size:10px;font-weight:700;color:#6B7280;letter-spacing:.02em;padding:4px;border-bottom:2px solid var(--fs-accent)}.fs table.t td{padding:4px;border-bottom:1px solid #F0ECE3;vertical-align:top}.fs table.t tr.g td{background:#F6F4EF;font-weight:700}.fs table.t .r{text-align:end}.fs table.t .bad{color:#A23B32;font-weight:700}.fs.land{width:269mm}</style>';

// ------------------------------------------------------------ Dienstplan als PDF (A4 quer)
function rosterSheetHtml({hotel, weekLabel, days, groups, shiftsFor}){
  const cell = (list) => list.map(s=>'<div>'+fsEsc(translateString(s.kind))+(s.start_time?' '+fsEsc(shiftTimes(s)):'')+'</div>').join("");
  return FS_TABLE+'<div class="fs land" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Dienstplan"), weekLabel)
    + '<table class="t"><thead><tr><th>'+fsT("Name")+'</th>'+days.map(d=>'<th>'+fsEsc(fmtDay(d))+'</th>').join("")+'</tr></thead><tbody>'
    + groups.filter(g=>g.rows.length).map(g=>'<tr class="g"><td colspan="'+(days.length+1)+'">'+fsEsc(translateString(g.dept))+'</td></tr>'
      + g.rows.map(r=>'<tr><td><b>'+fsEsc(r.title||r.name)+'</b></td>'+days.map(d=>'<td>'+cell(shiftsFor(r,d))+'</td>').join("")+'</tr>').join("")).join("")
    + '</tbody></table>'+fsFoot()+'</div>';
}

// ------------------------------------------------------------ Arbeitszeit-Nachweis je Person und Monat (zum Unterschreiben)
function timesheetHtml({hotel, name, month, entries, row}){
  const list = entries.filter(e=>e.clock_out).sort((a,b)=>a.clock_in<b.clock_in?-1:1);
  const hrs = (e) => Math.max(0, (new Date(e.clock_out)-new Date(e.clock_in))/3600000 - (Number(e.break_minutes)||0)/60);
  const total = list.reduce((s,e)=>s+hrs(e),0);
  const mLabel = new Date(month+"-15T12:00:00").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"});
  return FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Arbeitszeit-Nachweis"), mLabel)
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Name")+'</div><div class="v">'+fsEsc(name)+'</div></div><div class="f"><div class="l">'+fsT("Ist (h)")+'</div><div class="v">'+fsEsc(fmtHours(total))+'</div></div>'
    + '<div class="f"><div class="l">'+fsT("Soll (h)")+'</div><div class="v">'+fsEsc(row && row.target!=null?fmtHours(row.target):"–")+'</div></div><div class="f"><div class="l">'+fsT("Urlaubstage")+' / '+fsT("Krankentage")+'</div><div class="v">'+fsEsc((row&&row.vacation||0)+" / "+(row&&row.sick||0))+'</div></div></div>'
    + '<table class="t"><thead><tr><th>'+fsT("Datum")+'</th><th>'+fsT("Abteilung")+'</th><th>'+fsT("Kommen")+'</th><th>'+fsT("Gehen")+'</th><th class="r">'+fsT("Pause (Min.)")+'</th><th class="r">'+fsT("Stunden")+'</th><th>'+fsT("Notiz")+'</th></tr></thead><tbody>'
    + (list.length ? list.map(e=>'<tr><td>'+fsEsc(fmtDay(toLocalInput(e.clock_in).slice(0,10),{weekday:"short",day:"2-digit",month:"2-digit"}))+'</td><td>'+fsEsc(translateString(e.department||""))+'</td><td>'+fsEsc(fmtClock(e.clock_in))+'</td><td>'+fsEsc(fmtClock(e.clock_out))+'</td><td class="r">'+fsEsc(e.break_minutes||0)+'</td><td class="r">'+fsEsc(fmtHours(hrs(e)))+'</td><td>'+fsEsc((e.note||"")+(e.edited_by?" ✎":""))+'</td></tr>').join("")
      : '<tr><td colspan="7">'+fsT("Keine Zeitbuchungen in diesem Monat.")+'</td></tr>')
    + '<tr class="g"><td colspan="5">'+fsT("Gesamt")+'</td><td class="r">'+fsEsc(fmtHours(total))+'</td><td></td></tr></tbody></table>'
    + '<div style="font-size:10px;color:#6B7280;margin-top:6px">'+fsT("✎ = von der Leitung korrigiert")+'</div>'
    + '<div class="sig"><div>'+fsT("Mitarbeiter/in")+' – '+fsT("Datum und Unterschrift")+'</div><div>'+fsT("Arbeitgeber")+' – '+fsT("Datum und Unterschrift")+'</div></div>'+fsFoot()+'</div>';
}

// ------------------------------------------------------------ HACCP-Monatsprotokoll
function haccpSheetHtml({hotel, month, readings, nameOf}){
  const mLabel = new Date(month+"-15T12:00:00").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"});
  const byPoint = {}; readings.forEach(r=>{ (byPoint[r.point_name||"?"]=byPoint[r.point_name||"?"]||[]).push(r); });
  const out = readings.filter(r=>r.out_of_range).length;
  return FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("HACCP-Temperaturprotokoll"), mLabel)
    + '<div class="facts"><div class="f"><div class="l">'+fsT("Messungen")+'</div><div class="v">'+readings.length+'</div></div><div class="f"><div class="l">'+fsT("Messpunkte")+'</div><div class="v">'+Object.keys(byPoint).length+'</div></div><div class="f"><div class="l">'+fsT("Abweichungen")+'</div><div class="v" style="color:'+(out?'#A23B32':'#3F7A5C')+'">'+out+'</div></div><div class="f"><div class="l">'+fsT("Zeitraum")+'</div><div class="v">'+fsEsc(mLabel)+'</div></div></div>'
    + Object.keys(byPoint).sort().map(p=>{ const l = byPoint[p]; const r0 = l[0];
      return '<div class="box" style="margin-bottom:8px"><h3>'+fsEsc(p)+' · '+fsEsc((r0.min_c??"")+"–"+(r0.max_c??""))+' °C</h3><table class="t"><thead><tr><th>'+fsT("Datum")+'</th><th>'+fsT("Uhrzeit")+'</th><th class="r">°C</th><th>'+fsT("Maßnahme")+'</th><th>'+fsT("Gemessen von")+'</th></tr></thead><tbody>'
        + l.map(r=>'<tr><td>'+fsEsc(fmtDay(toLocalInput(r.taken_at).slice(0,10),{day:"2-digit",month:"2-digit"}))+'</td><td>'+fsEsc(fmtClock(r.taken_at))+'</td><td class="r'+(r.out_of_range?' bad':'')+'">'+fsEsc(String(r.value_c).replace(".",","))+'</td><td>'+fsEsc(r.action||"")+'</td><td>'+fsEsc(nameOf(r.taken_by))+'</td></tr>').join("")+'</tbody></table></div>'; }).join("")
    + (readings.length ? "" : '<p>'+fsT("Keine Messungen in diesem Monat.")+'</p>')
    + '<div class="sig"><div>'+fsT("Küchenleitung")+' – '+fsT("Datum und Unterschrift")+'</div><div>'+fsT("Geprüft")+' – '+fsT("Datum und Unterschrift")+'</div></div>'+fsFoot()+'</div>';
}
function HaccpPdfButton({hotel, api, members, me}){
  const [month,setMonth] = useState(todayIso().slice(0,7)); const [busy,setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    try {
      const from = month+"-01", last = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate(), to = month+"-"+String(last).padStart(2,"0");
      const readings = await api("/api/hotels/"+hotel.id+"/temp-readings?from="+from+"&to="+to);
      await sheetPdf(haccpSheetHtml({hotel, month, readings, nameOf:(id)=>memberLabel(members, me, id)}), ("HACCP "+hotel.name+" "+month).replace(/[\\/:*?"<>|]+/g,"")+".pdf");
    } catch(e){ window.alert(tf("PDF konnte nicht erstellt werden: {0}", e.message)); }
    setBusy(false);
  };
  return <span style={{display:"inline-flex",gap:4,alignItems:"center"}}><input type="month" className="input" style={{width:140,padding:"4px 6px",fontSize:12.5}} value={month} onChange={e=>e.target.value&&setMonth(e.target.value)} /><button style={smallBtn} disabled={busy} onClick={make}>{busy?"…":<React.Fragment><Icon n="filetext" /> {tf("Protokoll (PDF)")}</React.Fragment>}</button></span>;
}

// ------------------------------------------------------------ Personalbedarf aus Veranstaltungen (Richtwerte)
const EVENT_STAFF_RATIO = {service: 15, kitchen: 30}; // eine Servicekraft je 15 Gäste, eine Küchenkraft je 30 Gäste
const eventStaff = (e) => { const g = Number(e.guests)||0; return g>0 ? {service: Math.ceil(g/EVENT_STAFF_RATIO.service), kitchen: Math.ceil(g/EVENT_STAFF_RATIO.kitchen)} : null; };
function EventStaffHint({hotel, api, days}){
  const [events,setEvents] = useState([]);
  useEffect(()=>{ api("/api/hotels/"+hotel.id+"/events?from="+days[0]).then(l=>setEvents((l||[]).filter(e=>e.event_date<=days[days.length-1] && e.status!=="Storniert"))).catch(()=>setEvents([])); },[hotel.id, days[0]]);
  if(!events.length) return null;
  return (
    <Card style={{marginBottom:12,padding:"12px 16px",borderColor:BRASS}}>
      <h2 className="ui-h" style={{fontWeight:700,marginBottom:4}}><Icon n="glass" /> {tf("Veranstaltungen in dieser Woche")}</h2>
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:6}}>{tf("Zusätzlicher Personalbedarf als Richtwert: eine Servicekraft je 15 Gäste, eine Küchenkraft je 30 Gäste.")}</div>
      {events.map(e=>{ const s = eventStaff(e); return (
        <div key={e.id} style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:13,padding:"4px 0",borderTop:`1px solid ${BORDER}`}}>
          <b style={{minWidth:90}}>{fmtDay(e.event_date)}</b><span style={{flex:1}} data-no-i18n="">{e.title}{e.start_time?" · "+e.start_time.slice(0,5):""}{e.guests?" · "+tf("{0} Personen", e.guests):""}</span>
          {s ? <span style={{color:BRASS_TEXT,fontWeight:600}}>{tf("+{0} Service · +{1} Küche", s.service, s.kitchen)}</span> : <span style={{color:INK_MUTED}}>{tf("Personenzahl fehlt")}</span>}
        </div>); })}
    </Card>
  );
}

// ------------------------------------------------------------ Räume verwalten
function SpacesManager({hotel, api, spaces, onChanged}){
  const [name,setName] = useState(""); const [cap,setCap] = useState(""); const [msg,setMsg] = useState(null);
  const run = async (fn) => { setMsg(null); try { await fn(); onChanged(); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <Card style={{marginBottom:14}}>
      <h2 className="ui-h" style={{fontWeight:700,marginBottom:6}}>{tf("Räume für Veranstaltungen")}</h2>
      {spaces.map(s=><div key={s.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:13.5,padding:"5px 0",borderTop:`1px solid ${BORDER}`}}>
        <b style={{flex:1}} data-no-i18n="">{s.name}</b><span style={{color:INK_MUTED}}>{s.capacity?tf("bis {0} Personen", s.capacity):""}</span>
        <button style={linkBtn} onClick={()=>{ if(window.confirm(tf("Raum löschen? Veranstaltungen bleiben erhalten."))) run(()=>api("/api/event-spaces/"+s.id,"DELETE")); }}>✕</button></div>)}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
        <Field label={tf("Name")}><input className="input" value={name} placeholder={tf("z. B. Festsaal, Seminarraum 1")} onChange={e=>setName(e.target.value)} /></Field>
        <Field label={tf("Personen (max.)")}><input className="input" type="number" min="0" style={{width:110}} value={cap} onChange={e=>setCap(e.target.value)} /></Field>
        <button className="btn-primary" style={{marginBottom:14}} disabled={!name.trim()} onClick={()=>run(async()=>{ await api("/api/hotels/"+hotel.id+"/event-spaces","POST",{name, capacity:cap}); setName(""); setCap(""); })}>{tf("Hinzufügen")}</button>
      </div>
      {msg && <ErrorText>{msg.text}</ErrorText>}
    </Card>
  );
}

// ------------------------------------------------------------ Raumkalender (Woche × Räume)
function evOverlap(a, b){
  if(!a.space_id || a.space_id!==b.space_id || a.event_date!==b.event_date || a.id===b.id || a.status==="Storniert" || b.status==="Storniert") return false;
  const m = (t, f) => { const x = String(t||"").match(/^(\d{1,2}):(\d{2})/); return x ? Number(x[1])*60+Number(x[2]) : f; };
  const span = (e) => { const s = m(e.start_time,0); let x = m(e.end_time,1440); if(x<=s) x = 1440; return [s,x]; };
  const [a0,a1] = span(a), [b0,b1] = span(b); return a0<b1 && b0<a1;
}
function RoomCalendar({events, spaces, onOpen}){
  const [week,setWeek] = useState(mondayOfIso(todayIso()));
  const days = Array.from({length:7},(_,i)=>addDaysIso(week,i));
  const rows = [...spaces, {id:null, name:tf("Ohne Raum")}];
  const inCell = (sp, d) => events.filter(e=>e.event_date===d && (sp.id ? e.space_id===sp.id : !e.space_id) && e.status!=="Storniert");
  return (
    <Card style={{padding:0,overflowX:"auto",marginBottom:14}}>
      <div style={{display:"flex",gap:8,alignItems:"center",padding:"10px 14px"}}>
        <button style={smallBtn} onClick={()=>setWeek(addDaysIso(week,-7))}>‹</button>
        <b data-no-i18n="">{fmtDay(days[0],{day:"2-digit",month:"2-digit"})} – {fmtDay(days[6],{day:"2-digit",month:"2-digit",year:"numeric"})}</b>
        <button style={smallBtn} onClick={()=>setWeek(addDaysIso(week,7))}>›</button>
        <button style={smallBtn} onClick={()=>setWeek(mondayOfIso(todayIso()))}>{tf("Heute")}</button>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,minWidth:760}}>
        <thead><tr><th style={{textAlign:"start",padding:"6px 10px",fontSize:11.5,color:INK_MUTED}}>{tf("Raum")}</th>{days.map(d=><th key={d} style={{textAlign:"start",padding:"6px 6px",fontSize:11.5,color:d===todayIso()?BRASS_TEXT:INK_MUTED}}>{fmtDay(d)}</th>)}</tr></thead>
        <tbody>{rows.map(sp=>(
          <tr key={sp.id||"none"} style={{borderTop:`1px solid ${BORDER}`}}>
            <td style={{padding:"8px 10px",fontWeight:700,verticalAlign:"top",whiteSpace:"nowrap"}} data-no-i18n="">{sp.name}</td>
            {days.map(d=><td key={d} style={{padding:4,verticalAlign:"top",minWidth:96}}>
              {inCell(sp,d).map(e=>{ const clash = events.some(o=>evOverlap(e,o)); const [c,bg] = EVENT_STATUS[e.status]||EVENT_STATUS.Anfrage; return (
                <div key={e.id} {...pressable(()=>onOpen(e))} title={clash?tf("Doppelbuchung"):""} style={{cursor:"pointer",background:clash?BAD_SOFT:bg,borderInlineStart:`3px solid ${clash?BAD:c}`,borderRadius:4,padding:"3px 5px",marginBottom:3}}>
                  <div style={{fontSize:11,color:INK_MUTED}} data-no-i18n="">{(e.start_time||"").slice(0,5)}{e.end_time?"–"+e.end_time.slice(0,5):""}{clash?<React.Fragment>{" "}<Icon n="alert" /></React.Fragment>:""}</div>
                  <div style={{fontWeight:600,fontSize:12}} data-no-i18n="">{e.title}</div>
                </div>); })}
            </td>)}
          </tr>
        ))}</tbody>
      </table>
    </Card>
  );
}

// ------------------------------------------------------------ Angebot: Positionen, Summe, Link senden
function offerSum(items, guests){
  const lines = (items||[]).map(i=>{ const qty = i.per_person ? Number(guests)||0 : Number(String(i.qty??0).replace(",","."))||0; return {...i, qtyEff:qty, total:Math.round(qty*(Number(String(i.unit_price??0).replace(",","."))||0)*100)/100}; });
  return {lines, total: Math.round(lines.reduce((s,l)=>s+l.total,0)*100)/100};
}
const OFFER_STATUS = {"keins":[INK_MUTED,PAPER,"Kein Angebot"], "offen":[BRASS_TEXT,BRASS_SOFT,"Angebot offen"], "angenommen":[GOOD_TEXT,GOOD_SOFT,"Angebot angenommen"], "abgelehnt":[BAD,BAD_SOFT,"Angebot abgelehnt"]};
function OfferEditor({form, setForm}){
  const items = form.offer_items || [];
  const set = (i, k, v) => setForm({...form, offer_items: items.map((x,j)=>j===i?{...x,[k]:v}:x)});
  const sum = offerSum(items, form.guests);
  const money = (n) => (Number(n)||0).toLocaleString(UI_LOCALE,{style:"currency",currency:HOTEL_CURRENCY||"EUR"});
  return (
    <div style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
      <div style={{fontWeight:700,marginBottom:6}}><Icon n="euro" /> {tf("Angebot")}</div>
      {items.map((x,i)=>(
        <div key={i} style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <input className="input" style={{flex:2,minWidth:160}} value={x.label} placeholder={tf("z. B. 4-Gang-Menü, Raummiete, Getränkepauschale")} onChange={e=>set(i,"label",e.target.value)} />
          <label style={{fontSize:12,display:"flex",gap:4,alignItems:"center"}}><input type="checkbox" checked={!!x.per_person} onChange={e=>set(i,"per_person",e.target.checked)} />{tf("pro Person")}</label>
          {!x.per_person && <input className="input" style={{width:70}} value={x.qty??""} placeholder={tf("Menge")} onChange={e=>set(i,"qty",e.target.value)} />}
          <input className="input" style={{width:100}} value={x.unit_price??""} placeholder={tf("Preis")} onChange={e=>set(i,"unit_price",e.target.value)} />
          <span style={{width:100,textAlign:"end",fontSize:13}} data-no-i18n="">{money(sum.lines[i].total)}</span>
          <button style={linkBtn} onClick={()=>setForm({...form, offer_items:items.filter((_,j)=>j!==i)})}>✕</button>
        </div>
      ))}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button style={{...linkBtn,paddingInlineStart:0}} onClick={()=>setForm({...form, offer_items:[...items, {label:"", qty:1, unit_price:"", per_person:items.length===0}]})}>{tf("+ Position")}</button>
        <span style={{flex:1}} />
        <b data-no-i18n="">{tf("Summe")}: {money(sum.total)}</b>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0 10px",marginTop:8}}>
        <Field label={tf("Gültig bis")}><input className="input" type="date" value={form.offer_valid_until||""} onChange={e=>setForm({...form,offer_valid_until:e.target.value})} /></Field>
        <Field label={tf("Hinweis im Angebot (Zahlung, Storno …)")}><textarea className="input" rows={2} value={form.offer_note||""} onChange={e=>setForm({...form,offer_note:e.target.value})} /></Field>
      </div>
    </div>
  );
}
function OfferButtons({ev, api, onChanged}){
  const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  const [c,bg,label] = OFFER_STATUS[ev.offer_status||"keins"];
  if(!(ev.offer_items||[]).length) return null;
  const send = async (withMail) => {
    let email = "";
    if(withMail){ const m = String(ev.contact||"").match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/); email = window.prompt(tf("An welche E-Mail-Adresse soll das Angebot gehen?"), m ? m[0] : ""); if(!email) return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api("/api/events/"+ev.id+"/offer","POST",{email});
      try { await navigator.clipboard.writeText(r.url); } catch(e){}
      setMsg({ok:true, text: withMail ? (r.email_sent ? tf("Angebot per E-Mail verschickt.") : tf("Die E-Mail konnte nicht verschickt werden – der Link wurde kopiert.")) : tf("Link kopiert – per E-Mail oder WhatsApp an den Kunden schicken.")});
      onChanged();
    } catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false);
  };
  return (
    <div style={{marginTop:6}}>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <Pill color={c} bg={bg}>{tf(label)}</Pill>
        {ev.offer_status!=="angenommen" && ev.offer_status!=="abgelehnt" && <React.Fragment>
          <button style={smallBtn} disabled={busy} onClick={()=>send(true)}>✉ {tf("Angebot senden")}</button>
          <button style={linkBtn} disabled={busy} onClick={()=>send(false)}>{tf("Link kopieren")}</button>
        </React.Fragment>}
      </div>
      {ev.offer_answered_at && <div style={{fontSize:12,color:INK_MUTED,marginTop:3}} data-no-i18n="">{ev.offer_answer_name||""} · {fmtDateTime(ev.offer_answered_at)}{ev.offer_answer_note?" · „"+ev.offer_answer_note+"“":""}</div>}
      {msg && <div style={{fontSize:12,color:msg.ok?GOOD:BAD,marginTop:3}}>{msg.text}</div>}
    </div>
  );
}

function EventsView({hotel, api, role}){
  const templatesReady = useLazyScript("event-templates.js", ()=>!!window.eventTemplates);
  const [list,setList] = useState(null); const [form,setForm] = useState(null); const [msg,setMsg] = useState(null); const [past,setPast] = useState(false);
  const [picker,setPicker] = useState(false); const [view,setView] = useState("list");
  const [spaces,setSpaces] = useState([]); const [mine,setMine] = useState([]); const [invoices,setInvoices] = useState([]);
  const lead = canManageDept("Food & Beverage") || canManageDept("Rezeption & Empfang");
  const seeInvoices = role==="admin" || role==="manager" || role==="viewer" || INVOICE_DEPTS_FE.some(d=>canManageDept(d));
  const emptyEvent = {title:"", event_date:addDaysIso(todayIso(),14), start_time:"", end_time:"", location:"", space_id:"", guests:"", status:"Anfrage", client:"", contact:"", menu:"", setup:"", tech:"", notes:"", offer_items:[], offer_note:"", offer_valid_until:""};
  // Vorlage (mitgeliefert oder eigene) bzw. bestehende Veranstaltung als Ausgangspunkt
  const startFrom = (t) => { setPicker(false); setView("list"); setForm({...emptyEvent, ...t, id:undefined, created_at:undefined, updated_at:undefined, created_by:undefined, hotel_id:undefined, organization_id:undefined,
    offer_token:undefined, offer_status:undefined, offer_answered_at:undefined, offer_answer_name:undefined, offer_answer_note:undefined, offer_valid_until:"",
    event_date: addDaysIso(todayIso(),14), status:"Anfrage", client:"", contact:"", guests: t.guests ?? "", space_id: t.space_id || "", start_time:(t.start_time||"").slice(0,5), end_time:(t.end_time||"").slice(0,5)}); window.scrollTo(0,0); };
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>Promise.all([
    api(base+"/events"+(past?"?from="+addDaysIso(todayIso(),-120):"")).then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),
    api(base+"/event-spaces").then(setSpaces).catch(()=>setSpaces([])),
    api(base+"/event-templates").then(setMine).catch(()=>setMine([])),
    seeInvoices ? api(base+"/invoices").then(setInvoices).catch(()=>setInvoices([])) : Promise.resolve(),
  ]),[api, base, past]);
  useEffect(()=>{ load(); },[load]);
  const spaceName = (id) => (spaces.find(s=>s.id===id)||{}).name;
  const save = async () => {
    setMsg(null);
    try {
      const {id, ...b} = form; const payload = {...b, space_id: b.space_id || null, location: b.space_id ? (spaceName(b.space_id)||b.location) : b.location};
      const r = id ? await api("/api/events/"+id,"PATCH",payload) : await api(base+"/events","POST",payload);
      const sp = spaces.find(s=>s.id===payload.space_id);
      const warn = [];
      if(r.conflicts && r.conflicts.length) warn.push(tf("Achtung Doppelbuchung: {0} ist zur gleichen Zeit im selben Raum.", r.conflicts.map(c=>"„"+c.title+"“").join(", ")));
      if(sp && sp.capacity && Number(payload.guests) > sp.capacity) warn.push(tf("Mehr Personen ({0}) als der Raum fasst ({1}).", payload.guests, sp.capacity));
      setMsg(warn.length ? {ok:false, text:warn.join(" ")} : null);
      setForm(null); load();
    } catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const saveAsTemplate = async () => {
    const name = window.prompt(tf("Name der Vorlage"), form.title || ""); if(!name) return;
    try { await api(base+"/event-templates","POST",{name, data:form}); setMsg({ok:true,text:tf("Vorlage gespeichert.")}); load(); } catch(e){ setMsg({ok:false,text:e.message}); }
  };
  const F = (k, label, props={}) => <Field label={tf(label)}><input className="input" value={form[k]??""} onChange={e=>setForm({...form,[k]:e.target.value})} {...props} /></Field>;
  const T = (k, label) => <Field label={tf(label)}><textarea className="input" rows={3} value={form[k]??""} onChange={e=>setForm({...form,[k]:e.target.value})} /></Field>;
  const byMonth = {}; (list||[]).forEach(e=>{ const m = e.event_date.slice(0,7); (byMonth[m]=byMonth[m]||[]).push(e); });
  const tab = (k, l) => <button onClick={()=>setView(k)} style={{border:`1px solid ${view===k?INK:BORDER}`,background:view===k?INK:CARD,color:view===k?"#fff":INK,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{tf(l)}</button>;
  const card = (t, onClick, extra) => <button key={t.id} onClick={onClick} style={{border:`1px solid ${BORDER}`,background:CARD,borderRadius:10,padding:"12px 10px",cursor:"pointer",textAlign:"start",fontSize:13.5,position:"relative"}}>{extra}
    <div style={{fontSize:20}}><Icon n={t.icon||"star"} size={20} /></div><b data-no-i18n="">{t.title}</b><div style={{fontSize:11.5,color:INK_MUTED}} data-no-i18n="">{[t.start_time && (t.start_time+"–"+(t.end_time||"")), t.guests && tf("{0} Personen", t.guests)].filter(Boolean).join(" · ")}</div></button>;
  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
        {lead && !form && <button className="btn-primary" onClick={()=>setPicker(!picker)}>{tf("+ Veranstaltung")}</button>}
        {tab("list","Liste")}{tab("calendar","Raumkalender")}{lead && tab("spaces","Räume")}
        <span style={{flex:1}} />
        {view==="list" && <label style={{fontSize:13,display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={past} onChange={e=>setPast(e.target.checked)} /> {tf("Vergangene anzeigen")}</label>}
        {list && list.length>0 && <button style={smallBtn} onClick={async()=>{ try { await sheetPdf(weekSheetHtml(list, hotel, todayIso()), (translateString("Veranstaltungen")+" "+todayIso()+".pdf")); } catch(e){ setMsg({ok:false,text:e.message}); } }}><Icon n="filetext" /> {tf("Wochen-Übersicht (PDF)")}</button>}
      </div>
      {picker && !form && <Card style={{marginBottom:14}}>
        <h2 className="ui-h" style={{fontWeight:700,marginBottom:4}}>{tf("Womit beginnen?")}</h2>
        <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Vorlagen füllen Menü, Aufbau, Technik und den Ablauf mit Aufgaben je Abteilung vor – alles lässt sich danach anpassen.")}</div>
        {mine.length>0 && <React.Fragment>
          <div className="field-label"><Icon n="star" /> {tf("Eigene Vorlagen")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:8,marginBottom:12}}>
            {mine.map(m=>card({...m.data, id:m.id, title:m.name, icon:"star"}, ()=>startFrom({...m.data}),
              <span role="button" title={tf("Vorlage löschen")} onClick={async(ev)=>{ ev.stopPropagation(); if(!window.confirm(tf("Vorlage „{0}“ löschen?", m.name))) return; try { await api("/api/event-templates/"+m.id,"DELETE"); load(); } catch(e){ setMsg({ok:false,text:e.message}); } }}
                style={{position:"absolute",top:6,insetInlineEnd:8,color:INK_MUTED,fontSize:12}}>✕</span>))}
          </div>
        </React.Fragment>}
        <div className="field-label">{tf("Vorlagen")}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:8}}>
          <button onClick={()=>startFrom({})} style={{border:`1px dashed ${BORDER}`,background:CARD,borderRadius:10,padding:"12px 10px",cursor:"pointer",textAlign:"start",fontSize:13.5}}><div style={{fontSize:20}}>＋</div><b>{tf("Leer beginnen")}</b></button>
          {templatesReady ? eventTemplates(UI_LANG).map(t=>card(t, ()=>startFrom(t))) : <div style={{color:INK_MUTED,fontSize:13,padding:12}}>{tf("Lädt…")}</div>}
        </div>
        <button style={{...linkBtn,marginTop:8,paddingInlineStart:0}} onClick={()=>setPicker(false)}>{tf("Abbrechen")}</button>
      </Card>}
      {form && <Card style={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:"0 10px"}}>
          {F("title","Titel")}{F("event_date","Datum",{type:"date"})}{F("start_time","Beginn",{type:"time"})}{F("end_time","Ende",{type:"time"})}
          {spaces.length>0
            ? <Field label={tf("Raum")}><select className="input" value={form.space_id||""} onChange={e=>setForm({...form,space_id:e.target.value})}><option value="">{tf("– kein Raum –")}</option>{spaces.map(s=><option key={s.id} value={s.id}>{s.name}{s.capacity?" ("+s.capacity+")":""}</option>)}</select></Field>
            : F("location","Raum")}
          {F("guests","Personen",{type:"number",min:0})}
          <Field label={tf("Status")}><select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(EVENT_STATUS).map(s=><option key={s} value={s}>{tf(s)}</option>)}</select></Field>
          {F("client","Kunde")}{F("contact","Kontakt (Name, Telefon, E-Mail)")}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:"0 10px"}}>
          <div>{T("menu","Menü und Getränke")}<AllergenHelp onPick={(c)=>setForm(f=>({...f, menu: addAllergen(f.menu, c)}))} menu={form.menu} /></div>
          {T("setup","Aufbau und Bestuhlung")}{T("tech","Technik")}{T("notes","Hinweise")}
        </div>
        <OfferEditor form={form} setForm={setForm} />
        {(()=>{ const s = eventStaff(form); return s ? <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}><Icon n="users" /> {tf("Personalbedarf (Richtwert): {0} Service, {1} Küche", s.service, s.kitchen)}</div> : null; })()}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button className="btn-primary" disabled={!String(form.title).trim()} onClick={save}>{tf("Speichern")}</button>
          <button style={smallBtn} onClick={saveAsTemplate}><Icon n="star" /> {tf("Als eigene Vorlage speichern")}</button>
          <button style={linkBtn} onClick={()=>setForm(null)}>{tf("Abbrechen")}</button>
          {form.id && <button style={{...linkBtn,color:BAD}} onClick={async()=>{ if(window.confirm(tf("Veranstaltung löschen?"))){ try { await api("/api/events/"+form.id,"DELETE"); setForm(null); load(); } catch(e){ setMsg({ok:false,text:e.message}); } } }}>{tf("Löschen")}</button>}
        </div>
      </Card>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {view==="spaces" && lead && <SpacesManager hotel={hotel} api={api} spaces={spaces} onChanged={load} />}
      {view==="calendar" && list && <RoomCalendar events={list} spaces={spaces} onOpen={(e)=>{ if(lead){ setForm({...emptyEvent, ...e, space_id:e.space_id||"", start_time:(e.start_time||"").slice(0,5), end_time:(e.end_time||"").slice(0,5), guests:e.guests??"", offer_valid_until:e.offer_valid_until||""}); window.scrollTo(0,0); } }} />}
      {view==="list" && (list===null ? <div style={{fontSize:13,color:INK_MUTED}}>{tf("Lädt…")}</div> : list.length===0 ? <Card><div style={{fontSize:13,color:INK_MUTED}}>{tf("Noch keine Veranstaltungen. Lege Hochzeiten, Tagungen oder Feiern an – Küche, Service und Technik sehen alles auf einen Blick.")}</div></Card> :
        Object.keys(byMonth).sort().map(m=>(
          <div key={m} style={{marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:13,color:INK_MUTED,margin:"0 0 6px"}} data-no-i18n="">{new Date(m+"-15T12:00:00").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"})}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:10}}>
              {byMonth[m].map(e=>{ const [c,bg] = EVENT_STATUS[e.status]||EVENT_STATUS.Anfrage; const clash = list.some(o=>evOverlap(e,o)); const st = eventStaff(e); return (
                <Card key={e.id} style={{padding:"14px 16px",opacity:e.status==="Storniert"?0.6:1,borderColor:clash?BAD:undefined}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><Pill color={c} bg={bg}>{tf(e.status)}</Pill><span style={{fontSize:12.5,color:INK_MUTED}}>{fmtDay(e.event_date,{weekday:"short",day:"2-digit",month:"2-digit"})}{e.start_time?" · "+e.start_time.slice(0,5)+(e.end_time?"–"+e.end_time.slice(0,5):""):""}</span></div>
                  <div style={{fontWeight:700,fontSize:15}} data-no-i18n="">{e.title}</div>
                  <div style={{fontSize:12.5,color:INK_MUTED,marginTop:2}}>{[spaceName(e.space_id)||e.location, e.guests!=null && tf("{0} Personen", e.guests), e.client].filter(Boolean).join(" · ")}</div>
                  {clash && <div style={{fontSize:12.5,color:BAD,marginTop:3}}><Icon n="alert" /> {tf("Doppelbuchung im selben Raum")}</div>}
                  {st && e.status!=="Storniert" && <div style={{fontSize:12,color:INK_MUTED,marginTop:3}}><Icon n="users" /> {tf("+{0} Service · +{1} Küche", st.service, st.kitchen)}</div>}
                  <OfferButtons ev={e} api={api} onChanged={load} />
                  {seeInvoices && <EventInvoices ev={e} hotel={hotel} api={api} invoices={invoices} onChanged={load} />}
                  <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                    <SheetButtons ev={e} hotel={hotel} />
                    {lead && <button style={linkBtn} onClick={()=>setForm({...emptyEvent, ...e, space_id:e.space_id||"", start_time:(e.start_time||"").slice(0,5), end_time:(e.end_time||"").slice(0,5), guests:e.guests??"", offer_valid_until:e.offer_valid_until||"", offer_note:e.offer_note||""})}>{tf("Bearbeiten")}</button>}
                    {lead && <button style={linkBtn} title={tf("Neue Veranstaltung mit gleichem Menü, Aufbau, Technik und Ablauf")} onClick={()=>startFrom(e)}>{tf("Als Vorlage nutzen")}</button>}
                  </div>
                </Card>); })}
            </div>
          </div>
        )))}
    </div>
  );
}

