// ============================================================ Migration 027: Word-Vorlagen, Rechnungen
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
function Overlay({onClose, children, width, label}){
  const ref = useDialog(onClose);
  return (
    <div className="no-print" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(20,24,31,0.45)",zIndex:200,display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"6vh 12px 12px",overflowY:"auto"}}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={e=>e.stopPropagation()} style={{outline:"none",background:CARD,borderRadius:12,padding:"18px 18px 16px",width:"100%",maxWidth:width||720,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>{children}</div>
    </div>
  );
}
async function loadDocx(){ if(!window.Docxtemplater) await loadScriptOnce(window.__DOCX_SRC || "vendor/docx.js"); return {PizZip:window.PizZip, Docxtemplater:window.Docxtemplater}; }
const blobToDataUrl = (blob) => new Promise((res, rej)=>{ const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
const dataUrlToBytes = (u) => { const b = atob(String(u).split(",")[1]||""); const a = new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i] = b.charCodeAt(i); return a; };
function downloadBlob(blob, name){ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 3000); }
const safeFile = (s) => String(s||"Dokument").replace(/[\\/:*?"<>|]+/g,"").slice(0,90);

// Platzhalter in einer hochgeladenen Word-Datei finden und befüllen
async function docxTags(dataUrl){
  const {PizZip} = await loadDocx();
  const zip = new PizZip(dataUrlToBytes(dataUrl));
  const xml = Object.keys(zip.files).filter(f=>/^word\/(document|header\d*|footer\d*)\.xml$/.test(f)).map(f=>zip.file(f).asText()).join(" ");
  const text = xml.replace(/<[^>]+>/g, "");
  return Array.from(new Set((text.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)||[]).map(t=>t.slice(1,-1))));
}
async function fillDocx(dataUrl, data){
  const {PizZip, Docxtemplater} = await loadDocx();
  let doc;
  try {
    doc = new Docxtemplater(new PizZip(dataUrlToBytes(dataUrl)), {paragraphLoop:true, linebreaks:true, nullGetter:()=>""});
    doc.render(data);
  } catch(e){
    const errs = (e.properties && e.properties.errors) || [e];
    throw new Error(tf("Die Word-Vorlage enthält einen fehlerhaften Platzhalter: {0}", errs.map(x=>(x.properties && (x.properties.xtag || x.properties.explanation)) || x.message).slice(0,3).join(", ")));
  }
  return doc.getZip().generate({type:"blob", mimeType:DOCX_MIME});
}
const fillText = (text, data) => String(text||"").replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (m, k) => data[k]==null ? "" : String(data[k]));
const textTags = (text) => Array.from(new Set((String(text||"").match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)||[]).map(t=>t.slice(1,-1))));

// Platzhalter mit Beschriftung (Reihenfolge = Reihenfolge im Formular)
const DOC_FIELDS = [
  ["guest_name","Name Gast / Kunde",null,"guest","z. B. Familie Weber"],["persons","Personen",null,"guest","z. B. 2 Erwachsene, 1 Kind"],
  ["reservation_no","Reservierungsnummer",null,"stay"],["arrival","Anreise","date","stay"],["departure","Abreise","date","stay"],["nights","Nächte",null,"stay"],
  ["room_type","Zimmer",null,"stay","z. B. Doppelzimmer Deluxe"],["room_no","Zimmernummer",null,"stay","z. B. 214"],["board","Verpflegung","board","stay"],["wifi","WLAN-Zugang",null,"stay"],
  ["rate","Preis pro Nacht",null,"price","z. B. 149"],["total","Gesamtpreis",null,"price"],["payment","Zahlung / Anzahlung",null,"price","z. B. Anzahlung 30 % bis 1. Dezember"],
  ["event_title","Veranstaltung",null,"event"],["event_date","Datum","date","event"],["event_time","Zeit",null,"event"],["event_room","Raum",null,"event"],["guests","Personen (Veranstaltung)",null,"event"],["items","Positionen","area","event"],["offer_total","Gesamtsumme",null,"event"],["valid_until","Gültig bis","date","event"],
  ["voucher_value","Gutscheinwert",null,"voucher"],["voucher_code","Gutscheincode",null,"voucher"],
  ["notes","Notizen für den Gast","area","notes","z. B. Late Check-out bis 13 Uhr, Babybett im Zimmer, Parkplatz reserviert"],
  ["hotel_name","Hotel",null,"hotel"],["hotel_address","Adresse Hotel","area","hotel"],["hotel_phone","Telefon Hotel",null,"hotel"],["hotel_email","E-Mail Hotel",null,"hotel"],["today","Heutiges Datum","date","hotel"],["sender","Absender",null,"hotel"],
];
const DOC_GROUPS = [["guest","Gast"],["stay","Aufenthalt"],["price","Preis und Zahlung"],["event","Veranstaltung"],["voucher","Gutschein"],["notes","Notizen"],["other","Weitere Felder"],["hotel","Absender und Hotel"]];
const BOARD_OPTIONS = ["Nur Übernachtung","Übernachtung mit Frühstück","Halbpension","Vollpension","All inclusive"];
const numIn = (v) => { const t = String(v==null?"":v).replace(/[^\d,.-]/g,""); if(!t) return null; const n = Number(t.includes(",") && !t.includes(".") ? t.replace(",",".") : t.replace(/,/g,"")); return Number.isFinite(n) ? n : null; };
const DOC_FIELD_KEYS = DOC_FIELDS.map(f=>f[0]);
const DOC_KIND_LABELS = {reservierung:"Reservierung", storno:"Storno", willkommen:"Willkommen", angebot:"Angebot", veranstaltung:"Veranstaltung", gutschein:"Gutschein", rechnung:"Rechnung", sonstiges:"Sonstiges"};
const docLongDate = (iso, lang) => { if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||""))) return iso||""; try { return new Date(iso+"T12:00:00").toLocaleDateString(LOCALES[lang]||UI_LOCALE,{day:"numeric",month:"long",year:"numeric"}); } catch(e){ return iso; } };
const moneyIn = (n, cur) => (Number(n)||0).toLocaleString(UI_LOCALE,{style:"currency",currency:cur||HOTEL_CURRENCY||"EUR"});
function hotelDocDefaults(hotel, me){
  const s = hotel.invoice_settings || {};
  return {hotel_name: s.company || hotel.name, hotel_address: s.address || [hotel.name, hotel.city].filter(Boolean).join(", "), hotel_phone: s.phone || "", hotel_email: s.email || "", today: todayIso(), sender: me && me.email ? shortName(me.email) : ""};
}
function autoNights(form){ return /^\d{4}-/.test(form.arrival||"") && /^\d{4}-/.test(form.departure||"") ? Math.max(0, Math.round((new Date(form.departure) - new Date(form.arrival))/86400000)) : null; }
function autoTotal(form){ const n = form.nights ? numIn(form.nights) : autoNights(form), r = numIn(form.rate); return n && r!=null && /^[\s\d.,€$£¥]*$/.test(String(form.rate)) ? moneyIn(r*n) : null; }
function docData(form, lang){
  const out = {...form};
  ["arrival","departure","event_date","valid_until","today"].forEach(k=>{ out[k] = docLongDate(form[k], lang); });
  if(!out.nights){ const n = autoNights(form); if(n) out.nights = String(n); }
  if(form.rate && /^[\s\d.,]+$/.test(String(form.rate)) && numIn(form.rate)!=null) out.rate = moneyIn(numIn(form.rate));
  if(!out.total){ const t = autoTotal(form); if(t) out.total = t; }
  else if(/^[\s\d.,]+$/.test(String(form.total)) && numIn(form.total)!=null) out.total = moneyIn(numIn(form.total));
  return out;
}
function fromArrival(a){ return {guest_name:a.guest_name, arrival:a.arrival_date, departure:a.departure_date||"", room_type:a.room_type||"", reservation_no:a.reservation_ref||"", email:a.email||""}; }
function fromEvent(e){
  const sum = offerSum(e.offer_items, e.guests);
  const items = sum.lines.filter(l=>l.label).map(l=>l.label+": "+l.qtyEff+" × "+moneyIn(l.unit_price)+" = "+moneyIn(l.total)).join("\n");
  const m = String(e.contact||"").match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/);
  return {guest_name:e.client||"", event_title:e.title, event_date:e.event_date, event_time:[e.start_time&&e.start_time.slice(0,5), e.end_time&&e.end_time.slice(0,5)].filter(Boolean).join("–"), event_room:e.location||"",
    guests:e.guests==null?"":String(e.guests), items, offer_total: sum.total ? moneyIn(sum.total) : "", valid_until:e.offer_valid_until||"", email: m ? m[0] : ""};
}
const xmlEsc = (s) => String(s==null?"":s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// Brief-Vorlagen: Text → Abschnitte (Überschrift, Daten-Tabelle, Notiz, Absatz); gleiche Gestaltung für PDF, Vorschau und Word
const KV_RE = /^([^:：{}\s][^:：{}]{0,38}[^:：{}\s\d])\s?[:：]\s*(.*)$/;
function parseLetter(text){
  const blocks = [];
  String(text||"").replace(/\r\n/g,"\n").split(/\n\s*\n/).forEach(b=>{
    let lines = b.split("\n").map(l=>l.replace(/\s+$/,"")).filter((l,i,a)=>l || (i>0 && i<a.length-1));
    if(!lines.length) return;
    if(lines[0].startsWith("# ")){ blocks.push({t:"title", text:lines[0].slice(2)}); lines = lines.slice(1); if(!lines.length) return; if(lines.length===1){ blocks.push({t:"sub", text:lines[0]}); return; } }
    if(lines.length===1 && lines[0].trim()==="{notes}"){ blocks.push({t:"note", text:"{notes}"}); return; }
    if(lines.length>=2 && lines.every(l=>KV_RE.test(l))){ blocks.push({t:"facts", rows:lines.map(l=>{ const m = l.match(KV_RE); return [m[1], m[2]]; })}); return; }
    blocks.push({t:"para", lines});
  });
  return blocks;
}
// Platzhalter füllen; leere Zeilen, leere Tabellenzeilen und leere Klammern fallen weg (nur beim Befüllen)
function fillLetter(blocks, data){
  if(!data) return blocks;
  const f = (s) => fillText(s, data).replace(/\s*[（(][^()（）\d]*[)）]/g, "").trim();
  return blocks.map(b=>{
    if(b.t==="facts"){ const rows = b.rows.map(([l,v])=>[l, f(v)]).filter(([,v])=>v); return rows.length ? {...b, rows} : null; }
    if(b.t==="para"){ const lines = b.lines.map(f).filter(Boolean); return lines.length ? {...b, lines} : null; }
    if(b.t==="sub"){ const m = b.text.match(KV_RE); if(m && !f(m[2])) return null; }
    const text = f(b.text); return text ? {...b, text} : null;
  }).filter(Boolean);
}
function letterFooter(hotel){
  const s = hotel.invoice_settings || {};
  return [s.company||hotel.name, String(s.address||"").replace(/\n+/g,", "), s.phone, s.email, s.web, s.uid && "UID "+s.uid, s.iban && "IBAN "+s.iban].filter(Boolean);
}
const LETTER_CSS = `
  .fs.lt{font-size:13px;line-height:1.55}
  .fs.lt .lh{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid var(--fs-accent);padding-bottom:12px;margin-bottom:22px}
  .fs.lt .lh img{max-height:54px;max-width:170px;object-fit:contain}
  .fs.lt .lh .hn{font-family:Georgia,serif;font-size:19px;font-weight:600}
  .fs.lt .lh .ad{font-size:10.5px;color:#6B7280;white-space:pre-wrap;text-align:end}
  .fs.lt h1{font-family:Georgia,serif;font-size:25px;font-weight:600;margin:0 0 4px}
  .fs.lt .sub{color:#6B7280;font-size:12px;margin:0 0 16px}
  .fs.lt p{margin:0 0 12px;white-space:pre-wrap}
  .fs.lt table.kv{width:100%;border-collapse:separate;border-spacing:0;background:#F8F6F1;border-inline-start:4px solid var(--fs-accent);border-radius:8px;margin:4px 0 16px}
  .fs.lt table.kv td{padding:7px 12px;border-bottom:1px solid #ECE7DC;vertical-align:top}
  .fs.lt table.kv tr:last-child td{border-bottom:0}
  .fs.lt table.kv td.l{color:#6B7280;width:38%;font-size:12px}
  .fs.lt table.kv td.v{font-weight:600}
  .fs.lt .note{border:1px solid #E4DFD3;border-inline-start:4px solid var(--fs-accent);border-radius:8px;padding:10px 14px;margin:0 0 16px;white-space:pre-wrap;background:#fff}
  .fs.lt .lf{margin-top:26px;border-top:1px solid #E4DFD3;padding-top:7px;font-size:9.5px;color:#9aa3af;display:flex;flex-wrap:wrap;gap:3px 12px;justify-content:center}
`;
function letterHtml(text, hotel, data){
  const s = hotel.invoice_settings || {};
  const blocks = fillLetter(parseLetter(text), data);
  const body = blocks.map(b=> b.t==="title" ? '<h1>'+fsEsc(b.text)+'</h1>' : b.t==="sub" ? '<div class="sub">'+fsEsc(b.text)+'</div>'
    : b.t==="facts" ? '<table class="kv">'+b.rows.map(([l,v])=>'<tr><td class="l">'+fsEsc(l)+'</td><td class="v">'+fsEsc(v)+'</td></tr>').join("")+'</table>'
    : b.t==="note" ? '<div class="note">'+fsEsc(b.text)+'</div>' : '<p>'+fsEsc(b.lines.join("\n"))+'</p>').join("");
  return '<div class="fs lt" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'"><style>'+LETTER_CSS+'</style>'
    + '<div class="lh"><div>'+(hotel.logo_data?'<img src="'+fsEsc(hotel.logo_data)+'" />':'<div class="hn">'+fsEsc(s.company||hotel.name)+'</div>')+'</div><div class="ad">'+fsEsc([hotel.logo_data ? (s.company||hotel.name) : null, s.address, s.phone, s.email, s.web].filter(Boolean).join("\n"))+'</div></div>'
    + body + '<div class="lf">'+letterFooter(hotel).map(x=>'<span>'+fsEsc(x)+'</span>').join("")+'</div></div>';
}
// Logo für Word: als PNG mit Größe (SVG/WebP werden umgewandelt)
async function logoPng(dataUrl){
  if(!dataUrl) return null;
  try {
    const img = await new Promise((res, rej)=>{ const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const h = 300, w = Math.max(1, Math.round(img.naturalWidth / img.naturalHeight * h)) || 300;
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
    return {bytes:dataUrlToBytes(c.toDataURL("image/png")), w, h};
  } catch(e){ return null; }
}
// Word-Dokument im gleichen Stil; data = null lässt die Platzhalter stehen (Vorlage zum Gestalten in Word).
// Reihenfolge der Word-Formatangaben folgt dem Office-Schema (Word ist dabei streng).
async function docxFromText(text, {hotel, data, rtl} = {}){
  const {PizZip} = await loadDocx();
  const accent = String((hotel && hotel.brand_color) || "#A9834B").replace("#","");
  const s = (hotel && hotel.invoice_settings) || {};
  // Zeichenformat: Schrift, fett, Farbe, Größe, RTL
  const rp = ({font, b, color, sz} = {}) => (font?'<w:rFonts w:ascii="'+font+'" w:hAnsi="'+font+'"/>':'')+(b?'<w:b/>':'')+(color?'<w:color w:val="'+color+'"/>':'')+(sz?'<w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/>':'')+(rtl?'<w:rtl/>':'');
  const R = (t, f) => { const p = rp(f); return '<w:r>'+(p?'<w:rPr>'+p+'</w:rPr>':'')+'<w:t xml:space="preserve">'+xmlEsc(t)+'</w:t></w:r>'; };
  const runs = (lines, f) => lines.map((l,i)=>(i?'<w:r><w:br/></w:r>':'')+R(l, f)).join("");
  // Absatzformat: Vorlage, Rahmen, Schattierung, RTL, Abstand, Einzug, Ausrichtung
  const P = (inner, {style, bdr, shd, after, before, ind, jc} = {}) => '<w:p><w:pPr>'+(style?'<w:pStyle w:val="'+style+'"/>':'')+(bdr||'')+(shd?'<w:shd w:val="clear" w:color="auto" w:fill="'+shd+'"/>':'')+(rtl?'<w:bidi/>':'')
    +(after!=null||before!=null?'<w:spacing'+(before!=null?' w:before="'+before+'"':'')+(after!=null?' w:after="'+after+'"':'')+'/>':'')+(ind?'<w:ind w:left="'+ind+'"/>':'')+(jc?'<w:jc w:val="'+jc+'"/>':'')+'</w:pPr>'+inner+'</w:p>';
  const tblPr = (borders, mar) => '<w:tblPr>'+(rtl?'<w:bidiVisual/>':'')+'<w:tblW w:w="9070" w:type="dxa"/>'+(borders||'')+'<w:tblLayout w:type="fixed"/>'+(mar||'')+'</w:tblPr>';
  const blocks = fillLetter(parseLetter(text), data);
  let body = "";
  const logo = hotel && hotel.logo_data ? await logoPng(hotel.logo_data) : null;
  if(hotel){
    // Briefkopf: Logo bzw. Name links, Anschrift rechts, Linie in der Hotelfarbe
    const head = [logo ? (s.company||hotel.name) : null, ...String(s.address||"").split("\n"), s.phone, s.email, s.web].filter(Boolean);
    const cx = logo ? Math.round(logo.w/logo.h*540000) : 0;
    const left = logo
      ? '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="540000"/><wp:docPr id="1" name="Logo"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="540000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
      : R(s.company||hotel.name, {font:"Georgia", b:true, sz:30});
    const cell = (inner) => '<w:tc><w:tcPr><w:tcW w:w="4535" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="'+accent+'"/></w:tcBorders></w:tcPr>'+inner+'</w:tc>';
    body += '<w:tbl>'+tblPr()+'<w:tblGrid><w:gridCol w:w="4535"/><w:gridCol w:w="4535"/></w:tblGrid><w:tr>'
      + cell(P(left, {after:120})) + cell(P(runs(head, {color:"6B7280", sz:17}), {after:120, jc:rtl?"left":"right"}))
      + '</w:tr></w:tbl>' + P("", {after:240});
  }
  for(const b of blocks){
    if(b.t==="title") body += P(R(b.text), {style:"Title"});
    else if(b.t==="sub") body += P(R(b.text, {color:"6B7280", sz:19}), {after:240});
    else if(b.t==="facts"){
      body += '<w:tbl>'+tblPr('<w:tblBorders><w:left w:val="single" w:sz="24" w:space="0" w:color="'+accent+'"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="ECE7DC"/></w:tblBorders>',
          '<w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>')
        + '<w:tblGrid><w:gridCol w:w="3400"/><w:gridCol w:w="5670"/></w:tblGrid>'
        + b.rows.map(([l,v])=>'<w:tr>'
          + '<w:tc><w:tcPr><w:tcW w:w="3400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8F6F1"/></w:tcPr>'+P(R(l, {color:"6B7280", sz:20}), {after:0})+'</w:tc>'
          + '<w:tc><w:tcPr><w:tcW w:w="5670" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8F6F1"/></w:tcPr>'+P(runs(String(v).split("\n"), {b:true}), {after:0})+'</w:tc></w:tr>').join("")
        + '</w:tbl>' + P("", {after:120});
    }
    else if(b.t==="note") body += P(runs(String(b.text).split("\n")), {bdr:'<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="'+accent+'"/></w:pBdr>', shd:"FBFAF7", before:60, after:240, ind:200});
    else body += P(runs(b.lines));
  }
  const foot = hotel ? letterFooter(hotel).join("  ·  ") : "";
  const zip = new PizZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFoot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+(logo?'<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>':'')+'</Relationships>');
  if(logo) zip.file("word/media/logo.png", logo.bytes);
  zip.file("word/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Arial"/><w:color w:val="1C2430"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="80"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style></w:styles>');
  zip.file("word/footer1.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+P(foot ? R(foot, {color:"9AA3AF", sz:15}) : "", {bdr:'<w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="E4DFD3"/></w:pBdr>', jc:"center"})+'</w:ftr>');
  zip.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body+'<w:sectPr><w:footerReference w:type="default" r:id="rIdFoot"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1418" w:bottom="1134" w:left="1418" w:header="708" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return zip.generate({type:"blob", mimeType:DOCX_MIME});
}

function LettersView({hotel, api, role, me}){
  useLazyScript("doc-templates.js", ()=>!!window.builtinDocTemplates);
  const lead = role==="admin" || role==="manager" || canManageDept("Rezeption & Empfang") || canManageDept("Food & Beverage");
  const [mode,setMode] = useState("create");
  const [own,setOwn] = useState([]);
  const [lang,setLang] = useState(UI_LANG);
  const [tpl,setTpl] = useState(null);
  const [tags,setTags] = useState([]);
  const [form,setForm] = useState({});
  const [source,setSource] = useState("");
  const [arrivals,setArrivals] = useState(null); const [events,setEvents] = useState(null);
  const [edit,setEdit] = useState(null);
  const [busy,setBusy] = useState(""); const [msg,setMsg] = useState(null);
  const [mail,setMail] = useState(null);
  const base = "/api/hotels/"+hotel.id;
  const load = useCallback(()=>api(base+"/doc-templates").then(setOwn).catch(e=>{ setMsg({ok:false,text:e.message}); setOwn([]); }),[api, base]);
  useEffect(()=>{ load(); },[load]);
  const builtins = (window.builtinDocTemplates ? window.builtinDocTemplates(lang) : []);
  const all = [...own, ...builtins];
  const choose = async (t) => {
    setMsg(null); setTpl(t); setSource("");
    let list = [];
    try { list = t.has_file ? await docxTags((await api("/api/doc-templates/"+t.id+"/file")).file_data) : textTags(t.body); } catch(e){ setMsg({ok:false,text:e.message}); }
    setTags(list);
    setForm(f=>({...hotelDocDefaults(hotel, me), email:f.email||""}));
  };
  useEffect(()=>{ if(tpl && tpl.builtin){ const t = builtins.find(b=>b.kind===tpl.kind); if(t) setTpl(t); } },[lang]);
  const pickSource = async (k) => {
    setSource(k);
    try {
      if(k==="arrival" && arrivals===null) setArrivals(await api(base+"/arrivals?from="+addDaysIso(todayIso(),-30)+"&to="+addDaysIso(todayIso(),120)));
      if(k==="event" && events===null) setEvents(await api(base+"/events"));
    } catch(e){ setMsg({ok:false,text:e.message}); if(k==="arrival") setArrivals([]); else setEvents([]); }
  };
  const fields = DOC_FIELDS.filter(f=>tags.includes(f[0]));
  const unknown = tags.filter(t=>!DOC_FIELD_KEYS.includes(t));
  const title = tpl ? (tpl.name + (form.guest_name ? " – "+form.guest_name : "")) : "";
  const build = async (fmt) => {
    const data = docData(form, tpl.builtin ? lang : UI_LANG);
    if(fmt==="pdf"){ const blob = await sheetPdf(letterHtml(tpl.body, hotel, data), safeFile(title)+".pdf", false, "portrait", true); return blob; }
    if(tpl.has_file){ const f = await api("/api/doc-templates/"+tpl.id+"/file"); return fillDocx(f.file_data, data); }
    return docxFromText(tpl.body, {hotel, data, rtl:(tpl.builtin?lang:UI_LANG)==="ar"});
  };
  const act = async (k, fn) => { setBusy(k); setMsg(null); try { await fn(); } catch(e){ setMsg({ok:false,text:e.message}); } setBusy(""); };
  const download = (fmt) => act(fmt, async()=>{ const blob = await build(fmt); downloadBlob(blob, safeFile(title)+(fmt==="pdf"?".pdf":".docx")); });
  const send = () => act("mail", async()=>{
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.email||"")) throw new Error(tf("Ungültige E-Mail-Adresse."));
    const blob = await build(mail.format);
    await api(base+"/send-document","POST",{email:mail.email, title, format:mail.format, file:await blobToDataUrl(blob), message:mail.message, language:tpl.builtin?lang:UI_LANG});
    setMail(null); setMsg({ok:true,text:tf("Dokument per E-Mail verschickt.")});
  });
  const saveTpl = () => act("save", async()=>{
    const {id, ...b} = edit;
    if(id) await api("/api/doc-templates/"+id,"PATCH",b); else await api(base+"/doc-templates","POST",b);
    setEdit(null); setMsg({ok:true,text:tf("Gespeichert.")}); await load();
  });
  const pickFile = async (file) => {
    if(!file) return;
    if(!/\.docx$/i.test(file.name)) return setMsg({ok:false,text:tf("Bitte eine Word-Datei (.docx) hochladen.")});
    if(file.size > 2*1024*1024) return setMsg({ok:false,text:tf("Die Word-Datei ist zu groß (höchstens 2 MB).")});
    const d = await blobToDataUrl(file);
    const data = "data:"+DOCX_MIME+";base64,"+String(d).split(",")[1];
    let found = []; try { found = await docxTags(data); } catch(e){ return setMsg({ok:false,text:tf("Die Datei konnte nicht gelesen werden.")}); }
    setEdit(x=>({...x, file_data:data, file_name:file.name, body:null, name:x.name || file.name.replace(/\.docx$/i,""), _tags:found}));
  };
  const chip = (k) => <button key={k} type="button" onClick={()=>setEdit(x=>({...x, body:(x.body||"")+"{"+k+"}"}))} style={{border:`1px solid ${BORDER}`,background:PAPER,borderRadius:999,padding:"2px 8px",fontSize:11.5,cursor:"pointer",fontFamily:"monospace"}} title={tf((DOC_FIELDS.find(f=>f[0]===k)||[k,k])[1])}>{"{"+k+"}"}</button>;
  const tabBtn = (k, l) => <button onClick={()=>{ setMode(k); setMsg(null); }} style={{border:`1px solid ${mode===k?INK:BORDER}`,background:mode===k?INK:CARD,color:mode===k?"#fff":INK,borderRadius:999,padding:"6px 13px",fontSize:12.5,cursor:"pointer"}}>{tf(l)}</button>;
  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        {tabBtn("create","Dokument erstellen")}{lead && tabBtn("manage","Vorlagen verwalten")}
        <span style={{flex:1}} />
        <label style={{fontSize:12.5,color:INK_MUTED,display:"flex",gap:6,alignItems:"center"}}>{tf("Sprache der fertigen Vorlagen")}
          <select className="input" aria-label={tf("Sprache")} style={{width:"auto",padding:"5px 8px"}} value={lang} onChange={e=>setLang(e.target.value)}>{LANGS.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select></label>
      </div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}

      {mode==="create" && !tpl && (
        <div>
          <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{tf("Vorlage wählen, Daten aus einer Anreise oder Veranstaltung übernehmen und als Word, PDF oder per E-Mail ausgeben.")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))",gap:8}}>
            {all.map(t=>(
              <button key={t.id} onClick={()=>choose(t)} style={{border:`1px solid ${BORDER}`,background:CARD,borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"start"}}>
                <div style={{fontSize:20}}><Icon n={t.has_file ? "word" : t.builtin ? "filetext" : "star"} size={20} /></div>
                <b data-no-i18n="">{t.name}</b>
                <div style={{fontSize:11.5,color:INK_MUTED}}>{tf(DOC_KIND_LABELS[t.kind]||"Sonstiges")} · {t.has_file ? tf("eigene Word-Datei") : t.builtin ? tf("fertige Vorlage") : tf("eigene Vorlage")}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode==="create" && tpl && (
        <Card>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
            <b style={{fontSize:15}} data-no-i18n="">{tpl.name}</b>
            <span style={{flex:1}} />
            <button style={linkBtn} onClick={()=>{ setTpl(null); setTags([]); }}>{tf("Andere Vorlage")}</button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12.5,color:INK_MUTED}}>{tf("Daten übernehmen aus:")}</span>
            {[["","Von Hand"],["arrival","Anreise"],["event","Veranstaltung"]].map(([k,l])=><button key={k} onClick={()=>pickSource(k)} style={{border:`1px solid ${source===k?INK:BORDER}`,background:source===k?INK:CARD,color:source===k?"#fff":INK,borderRadius:999,padding:"4px 11px",fontSize:12,cursor:"pointer"}}>{tf(l)}</button>)}
          </div>
          {source==="arrival" && <select className="input" style={{marginBottom:10}} defaultValue="" onChange={e=>{ const a = (arrivals||[]).find(x=>x.id===e.target.value); if(!a) return; setForm(f=>({...f, ...fromArrival(a)}));
            // Brief automatisch in der Sprache des Gastes (fertige Vorlagen gibt es in 10 Sprachen)
            const gl = String(a.language||"").slice(0,2).toLowerCase(); if(tpl && tpl.builtin && LANGS.some(([c])=>c===gl) && gl!==lang){ setLang(gl); setMsg({ok:true, text:tf("Sprache des Briefs auf die Sprache des Gastes gestellt: {0}", (LANGS.find(([c])=>c===gl)||[])[1])}); } }}>
            <option value="">{arrivals===null ? "…" : arrivals.length ? tf("– Anreise wählen –") : tf("Keine Anreisen gefunden.")}</option>
            {(arrivals||[]).map(a=><option key={a.id} value={a.id}>{fmtDate(a.arrival_date)} · {a.guest_name}{a.room_type?" · "+a.room_type:""}</option>)}
          </select>}
          {source==="event" && <select className="input" style={{marginBottom:10}} defaultValue="" onChange={e=>{ const ev = (events||[]).find(x=>x.id===e.target.value); if(ev) setForm(f=>({...f, ...fromEvent(ev)})); }}>
            <option value="">{events===null ? "…" : events.length ? tf("– Veranstaltung wählen –") : tf("Keine Veranstaltungen.")}</option>
            {(events||[]).map(ev=><option key={ev.id} value={ev.id}>{fmtDate(ev.event_date)} · {ev.title}{ev.client?" · "+ev.client:""}</option>)}
          </select>}
          {fields.length===0 && unknown.length===0 && <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:8}}>{tf("Diese Vorlage enthält keine Platzhalter.")}</div>}
          <div style={{display:"grid",gridTemplateColumns:tpl.has_file ? "1fr" : "repeat(auto-fit, minmax(340px, 1fr))",gap:18,alignItems:"start"}}>
            <div>
              {DOC_GROUPS.map(([g, gl])=>{
                const list = g==="other" ? unknown.map(k=>[k,k,null,"other"]) : fields.filter(f=>f[3]===g);
                if(!list.length) return null;
                const inputs = (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:"0 10px"}}>
                    {list.map(([k,l,type,,hint])=>{
                      const auto = k==="nights" ? autoNights(form) : k==="total" ? autoTotal(form) : null;
                      const ph = auto!=null && auto!=="" ? tf("automatisch: {0}", auto) : hint ? tf(hint) : "";
                      return (
                        <Field key={k} label={tf(l)}>{type==="area"
                          ? <textarea className="input" rows={k==="notes"?5:3} placeholder={ph} value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} style={{fontFamily:"inherit"}} />
                          : type==="board" ? <React.Fragment><input className="input" list="doc-board" placeholder={tf("z. B. Übernachtung mit Frühstück")} value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} /><datalist id="doc-board">{BOARD_OPTIONS.map(o=><option key={o} value={translateString(o)} />)}</datalist></React.Fragment>
                          : <input className="input" type={type==="date"?"date":"text"} placeholder={ph} value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} />}</Field>
                      );
                    })}
                  </div>
                );
                return g==="hotel"
                  ? <details key={g} style={{marginBottom:10}}><summary style={{cursor:"pointer",fontSize:12.5,color:INK_MUTED,marginBottom:6}}>{tf(gl)}</summary>{inputs}</details>
                  : <div key={g} style={{marginBottom:6}}><div className="field-label" style={{color:BRASS_TEXT,marginBottom:4}}>{tf(gl)}</div>{inputs}</div>;
              })}
            </div>
            {!tpl.has_file && <div style={{position:"sticky",top:12}}>
              <div className="field-label">{tf("Vorschau")}</div>
              <div style={{background:"#E9E5DC",borderRadius:10,padding:12,overflow:"hidden"}}>
                <div style={{background:"#fff",borderRadius:4,boxShadow:"0 4px 18px rgba(0,0,0,.12)",padding:"22px 24px",zoom:0.6,color:"#1C2430"}} dir={(tpl.builtin?lang:UI_LANG)==="ar"?"rtl":"ltr"}
                  dangerouslySetInnerHTML={{__html:"<style>"+FS_CSS+"</style>"+letterHtml(tpl.body, hotel, docData(form, tpl.builtin ? lang : UI_LANG))}} />
              </div>
            </div>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
            <button className="btn-primary" disabled={!!busy} onClick={()=>download("docx")}>{busy==="docx"?"…":<React.Fragment><Icon n="word" /> Word</React.Fragment>}</button>
            {!tpl.has_file && <button style={smallBtn} disabled={!!busy} onClick={()=>download("pdf")}>{busy==="pdf"?"…":<React.Fragment><Icon n="filetext" /> PDF</React.Fragment>}</button>}
            {role!=="viewer" && <button style={smallBtn} disabled={!!busy} onClick={()=>setMail({email:form.email||"", format:tpl.has_file?"docx":"pdf", message:""})}>✉ {tf("Per E-Mail senden")}</button>}
          </div>
          {mail && (
            <div style={{background:PAPER,borderRadius:8,padding:"10px 12px",marginTop:10}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
                <label style={{flex:1,minWidth:200}}><div className="field-label">{tf("E-Mail-Adresse")}</div><input className="input" type="email" value={mail.email} onChange={e=>setMail({...mail,email:e.target.value})} /></label>
                <label><div className="field-label">{tf("Anhang")}</div><select className="input" value={mail.format} onChange={e=>setMail({...mail,format:e.target.value})}>{!tpl.has_file && <option value="pdf">PDF</option>}<option value="docx">Word</option></select></label>
              </div>
              <Field label={tf("Nachricht (optional)")}><textarea className="input" rows={2} value={mail.message} onChange={e=>setMail({...mail,message:e.target.value})} /></Field>
              <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!!busy} onClick={send}>{busy==="mail"?"…":tf("Senden")}</button><button style={linkBtn} onClick={()=>setMail(null)}>{tf("Abbrechen")}</button></div>
            </div>
          )}
        </Card>
      )}

      {mode==="manage" && lead && (
        <div>
          {!edit && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            <button className="btn-primary" onClick={()=>setEdit({name:"", kind:"sonstiges", body:""})}>{tf("+ Eigene Vorlage")}</button>
            <label style={{...smallBtn,display:"inline-flex",alignItems:"center",gap:6}}><Icon n="word" /> {tf("Word-Datei hochladen")}<input type="file" accept=".docx" style={{display:"none"}} onChange={e=>{ setEdit({name:"", kind:"sonstiges", body:null}); pickFile(e.target.files[0]); e.target.value=""; }} /></label>
          </div>}
          {!edit && <Card style={{marginBottom:12,fontSize:12.5,color:INK_SOFT,lineHeight:1.55}}>
            <b>{tf("So nutzen Sie eigene Word-Vorlagen:")}</b><br/>
            {tf("1. Eine fertige Vorlage als Word herunterladen oder eine eigene Datei nehmen. 2. In Word Logo, Schrift und Text anpassen – Platzhalter wie {guest_name} oder {arrival} an die gewünschte Stelle schreiben. 3. Die Datei hier hochladen. Beim Erstellen werden die Platzhalter automatisch befüllt.")}
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{DOC_FIELDS.map(([k,l])=><span key={k} title={tf(l)} style={{fontFamily:"monospace",fontSize:11,background:PAPER,borderRadius:4,padding:"1px 6px"}}>{"{"+k+"}"} <span style={{fontFamily:"inherit",color:INK_MUTED}}>{tf(l)}</span></span>)}</div>
          </Card>}
          {edit && (
            <Card style={{marginBottom:12,borderColor:BRASS}}>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <label style={{flex:2,minWidth:200}}><div className="field-label">{tf("Name")}</div><input className="input" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} /></label>
                <label><div className="field-label">{tf("Art")}</div><select className="input" value={edit.kind} onChange={e=>setEdit({...edit,kind:e.target.value})}>{Object.entries(DOC_KIND_LABELS).map(([k,l])=><option key={k} value={k}>{tf(l)}</option>)}</select></label>
              </div>
              {edit.file_data || edit.has_file ? (
                <div style={{margin:"10px 0",fontSize:13}}><Icon n="word" /> <span data-no-i18n="">{edit.file_name}</span>
                  {edit._tags && <div style={{fontSize:12,color:INK_MUTED,marginTop:4}}>{edit._tags.length ? tf("Gefundene Platzhalter: {0}", edit._tags.map(t=>"{"+t+"}").join(" ")) : tf("Keine Platzhalter gefunden – die Datei wird unverändert ausgegeben.")}</div>}
                  <label style={{...linkBtn,display:"inline-block",marginInlineStart:8,cursor:"pointer"}}>{tf("Andere Datei")}<input type="file" accept=".docx" style={{display:"none"}} onChange={e=>{ pickFile(e.target.files[0]); e.target.value=""; }} /></label>
                </div>
              ) : (
                <React.Fragment>
                  <Field label={tf("Text (erste Zeile mit # = Überschrift, Leerzeile = neuer Absatz)")}><textarea className="input" rows={14} style={{fontFamily:"inherit"}} value={edit.body||""} onChange={e=>setEdit({...edit,body:e.target.value})} /></Field>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{DOC_FIELD_KEYS.map(chip)}</div>
                </React.Fragment>
              )}
              <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={!!busy || !String(edit.name||"").trim()} onClick={saveTpl}>{tf("Speichern")}</button><button style={linkBtn} onClick={()=>setEdit(null)}>{tf("Abbrechen")}</button></div>
            </Card>
          )}
          {!edit && all.map(t=>(
            <Card key={t.id} style={{marginBottom:8,padding:"10px 14px"}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span><Icon n={t.has_file ? "word" : t.builtin ? "filetext" : "star"} /></span>
                <b style={{flex:1,minWidth:150}} data-no-i18n="">{t.name}</b>
                <span style={{fontSize:12,color:INK_MUTED}}>{tf(DOC_KIND_LABELS[t.kind]||"Sonstiges")}</span>
                {!t.has_file && <button style={smallBtn} title={tf("Als Word-Datei mit Platzhaltern herunterladen, in Word gestalten und wieder hochladen")} onClick={()=>act("dl"+t.id, async()=>downloadBlob(await docxFromText(t.body, {hotel, rtl:(t.builtin?lang:UI_LANG)==="ar"}), safeFile(t.name)+".docx"))}>{busy==="dl"+t.id?"…":"⬇ "+tf("Word-Vorlage")}</button>}
                {t.builtin && <button style={linkBtn} onClick={()=>setEdit({name:t.name, kind:t.kind, body:t.body})}>{tf("Kopieren und anpassen")}</button>}
                {!t.builtin && <button style={linkBtn} onClick={()=>setEdit({...t})}>{tf("Bearbeiten")}</button>}
                {!t.builtin && <button style={{...linkBtn,color:BAD}} onClick={()=>{ if(window.confirm(tf("Vorlage „{0}“ löschen?", t.name))) act("del", async()=>{ await api("/api/doc-templates/"+t.id,"DELETE"); await load(); }); }}>✕</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Rechnungen
const INV_KIND_TITLE = {Rechnung:"Rechnung", Anzahlung:"Anzahlungsrechnung", Schlussrechnung:"Schlussrechnung", Storno:"Stornorechnung"};
const INV_STATUS = {offen:[WARN_TEXT,WARN_SOFT,"offen"], bezahlt:[GOOD_TEXT,GOOD_SOFT,"bezahlt"], storniert:[INK_MUTED,PAPER,"storniert"]};
const r2 = (n) => Math.round((Number(n)||0)*100)/100;
function invTotals(items, gross){
  const by = {};
  (items||[]).forEach(i=>{ const a = r2((Number(i.qty)||0)*(Number(i.unit_price)||0)); by[i.tax_rate] = r2((by[i.tax_rate]||0)+a); });
  const rates = Object.keys(by).map(Number).sort((a,b)=>a-b).map(rate=>{ const amount = by[rate]; const tax = gross ? r2(amount*rate/(100+rate)) : r2(amount*rate/100); const net = gross ? r2(amount-tax) : amount; return {rate, net, tax, gross:r2(net+tax)}; });
  const net = r2(rates.reduce((s,x)=>s+x.net,0)), tax = r2(rates.reduce((s,x)=>s+x.tax,0));
  return {rates, net, tax, gross:r2(net+tax)};
}
const invDue = (inv) => r2(Number(inv.gross_total) - Number(inv.deducted||0));
// E-Rechnung im österreichischen Format ebInterface 6.1 (für öffentliche Auftraggeber über e-rechnung.gv.at / USP).
// Hinweis: nicht gegen das offizielle Schema geprüft – vor der ersten Übermittlung im Prüfwerkzeug von ebinterface.at testen.
const xmlE = (s) => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ebAmount = (n) => (Math.round((Number(n)||0)*100)/100).toFixed(2);
// Anschrift aus Freitext: 1. Zeile Name, Zeile mit PLZ + Ort, Rest Straße
function ebAddress(text, fallbackName){
  const lines = String(text||"").split(/\n|,/).map(x=>x.trim()).filter(Boolean);
  const name = lines[0] || fallbackName || "–";
  const zipLine = [...lines].reverse().find(l=>/^(A-|AT-|D-|DE-|CH-)?\d{4,5}\s+\S/.test(l)) || "";
  const m = zipLine.match(/^(?:[A-Z]{1,2}-)?(\d{4,5})\s+(.+)$/) || [];
  const street = lines.slice(1).find(l=>l!==zipLine) || "–";
  return '<Name>'+xmlE(name)+'</Name><Street>'+xmlE(street)+'</Street><Town>'+xmlE(m[2]||"–")+'</Town><ZIP>'+xmlE(m[1]||"0000")+'</ZIP><Country CountryCode="AT">Österreich</Country>';
}
function ebInterfaceXml(inv, hotel, orderRef){
  const s = inv.seller || {}, cur = inv.currency || "EUR", small = !!s.small_business;
  const credit = inv.kind==="Storno";
  const items = (inv.items||[]).map(i=>{
    const qty = Number(i.qty)||0, rate = small ? 0 : Number(i.tax_rate)||0;
    const unitNet = inv.prices_gross && !small ? (Number(i.unit_price)||0) / (1 + rate/100) : Number(i.unit_price)||0;
    const net = Math.round(unitNet*qty*100)/100;
    return {label:i.label, unit:i.unit, qty, unitNet, net, rate};
  });
  const t = invTotals(inv.items, inv.prices_gross);
  const cat = (rate) => small || rate===0 ? "E" : "S";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(inv.service_date||"") ? inv.service_date : inv.issued_on;
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<Invoice xmlns="http://www.ebinterface.at/schema/6p1/" GeneratingSystem="Ouverture" DocumentType="'+(credit?"CreditMemo":"Invoice")+'" InvoiceCurrency="'+xmlE(cur)+'" Language="ger">'
    + '<InvoiceNumber>'+xmlE(inv.number)+'</InvoiceNumber><InvoiceDate>'+xmlE(inv.issued_on)+'</InvoiceDate>'
    + '<Delivery><Date>'+xmlE(date)+'</Date></Delivery>'
    + '<Biller><VATIdentificationNumber>'+xmlE(s.uid||"00000000")+'</VATIdentificationNumber><Address>'+ebAddress((s.company||hotel.name)+"\n"+(s.address||""), hotel.name)+(s.email?'<Email>'+xmlE(s.email)+'</Email>':'')+'</Address></Biller>'
    + '<InvoiceRecipient><VATIdentificationNumber>'+xmlE(inv.recipient_uid||"00000000")+'</VATIdentificationNumber>'
    + (orderRef ? '<OrderReference><OrderID>'+xmlE(orderRef)+'</OrderID></OrderReference>' : '')
    + '<Address>'+ebAddress(inv.recipient)+(inv.recipient_email?'<Email>'+xmlE(inv.recipient_email)+'</Email>':'')+'</Address></InvoiceRecipient>'
    + '<Details><ItemList>' + items.map(i=>'<ListLineItem><Description>'+xmlE(i.label)+'</Description><Quantity Unit="'+xmlE(i.unit||"STK")+'">'+(i.qty).toFixed(4)+'</Quantity>'
      + '<UnitPrice>'+(Math.round(i.unitNet*10000)/10000).toFixed(4)+'</UnitPrice><TaxItem><TaxableAmount>'+ebAmount(i.net)+'</TaxableAmount><TaxPercent TaxCategoryCode="'+cat(i.rate)+'">'+i.rate+'</TaxPercent><TaxAmount>'+ebAmount(i.net*i.rate/100)+'</TaxAmount></TaxItem>'
      + '<LineItemAmount>'+ebAmount(i.net)+'</LineItemAmount></ListLineItem>').join("") + '</ItemList></Details>'
    + '<Tax>' + (small ? '<TaxItem><TaxableAmount>'+ebAmount(t.gross)+'</TaxableAmount><TaxPercent TaxCategoryCode="E">0</TaxPercent><TaxAmount>0.00</TaxAmount><Comment>'+xmlE(tf("Gemäß Kleinunternehmerregelung wird keine Umsatzsteuer berechnet."))+'</Comment></TaxItem>'
      : t.rates.map(x=>'<TaxItem><TaxableAmount>'+ebAmount(x.net)+'</TaxableAmount><TaxPercent TaxCategoryCode="'+cat(x.rate)+'">'+x.rate+'</TaxPercent><TaxAmount>'+ebAmount(x.tax)+'</TaxAmount></TaxItem>').join("")) + '</Tax>'
    + '<TotalGrossAmount>'+ebAmount(t.gross)+'</TotalGrossAmount>'
    + (Number(inv.deducted) ? '<PrepaidAmount>'+ebAmount(inv.deducted)+'</PrepaidAmount>' : '')
    + '<PayableAmount>'+ebAmount(invDue(inv))+'</PayableAmount>'
    + (s.iban ? '<PaymentMethod><UniversalBankTransaction><BeneficiaryAccount>'+(s.bic?'<BIC>'+xmlE(s.bic)+'</BIC>':'')+'<IBAN>'+xmlE(String(s.iban).replace(/\s+/g,""))+'</IBAN><BankAccountOwner>'+xmlE(s.company||hotel.name)+'</BankAccountOwner></BeneficiaryAccount></UniversalBankTransaction></PaymentMethod>' : '')
    + (inv.due_on && !credit ? '<PaymentConditions><DueDate>'+xmlE(inv.due_on)+'</DueDate></PaymentConditions>' : '')
    + '</Invoice>\n';
}
const invOverdue = (inv) => inv.status==="offen" && inv.kind!=="Storno" && inv.due_on && inv.due_on < todayIso();
function invoiceSheetHtml(inv, hotel, cancelsNumber){
  const s = inv.seller || {};
  const cur = inv.currency || "EUR";
  const m = (n) => (Number(n)||0).toLocaleString(UI_LOCALE,{style:"currency",currency:cur});
  const t = invTotals(inv.items, inv.prices_gross);
  const facts = [["Rechnungsnummer", inv.number], ["Rechnungsdatum", fmtDate(inv.issued_on)], ["Leistungszeitraum", /^\d{4}-\d{2}-\d{2}$/.test(inv.service_date||"") ? fmtDate(inv.service_date) : (inv.service_date||"–")], ...(inv.due_on && inv.kind!=="Storno" ? [["Zahlbar bis", fmtDate(inv.due_on)]] : [])]
    .map(([l,v])=>'<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+fsEsc(v)+'</div></div>').join("");
  const rows = (inv.items||[]).map((i,n)=>'<tr><td>'+(n+1)+'</td><td>'+fsEsc(i.label)+'</td><td class="r">'+fsEsc(String(i.qty).replace(".",","))+(i.unit?' '+fsEsc(i.unit):'')+'</td><td class="r">'+m(i.unit_price)+'</td><td class="r">'+(s.small_business?'–':fsEsc(i.tax_rate)+' %')+'</td><td class="r">'+m(r2(i.qty*i.unit_price))+'</td></tr>').join("");
  const sumRow = (l, v, strong) => '<tr'+(strong?' style="font-weight:700;font-size:13px"':'')+'><td colspan="5" class="r">'+l+'</td><td class="r">'+v+'</td></tr>';
  const sums = (s.small_business ? sumRow(fsT("Gesamtbetrag"), m(t.gross), true)
    : t.rates.map(x=>sumRow(fsT("Netto")+' '+x.rate+' %', m(x.net))+sumRow(fsT("USt")+' '+x.rate+' %', m(x.tax))).join("") + sumRow(fsT("Summe netto"), m(t.net)) + sumRow(fsT("Summe USt"), m(t.tax)) + sumRow(fsT("Gesamtbetrag"), m(t.gross), true))
    + (Number(inv.deducted) ? sumRow(fsT("abzüglich Anzahlungen"), m(-inv.deducted)) + sumRow(fsT("Zu zahlen"), m(invDue(inv)), true) : "");
  const bank = [s.bank, s.iban && "IBAN "+s.iban, s.bic && "BIC "+s.bic].filter(Boolean).join(" · ");
  return '<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+FS_TABLE
    + '<div class="hd">'+(hotel.logo_data?'<img src="'+fsEsc(hotel.logo_data)+'" />':'')+'<div class="h"><div class="hotel">'+fsEsc(s.company||s.hotel||hotel.name)+'</div><h1>'+fsT(INV_KIND_TITLE[inv.kind]||"Rechnung")+'</h1></div>'
    + '<div style="font-size:10.5px;color:#6B7280;white-space:pre-wrap;text-align:end">'+fsEsc([s.address, s.phone, s.email, s.web].filter(Boolean).join("\n"))+'</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px"><div class="box"><h3>'+fsT("Rechnungsempfänger")+'</h3><div class="b">'+fsEsc(inv.recipient)+'</div>'+(inv.recipient_uid?'<div style="margin-top:4px;font-size:10.5px">'+fsT("UID")+': '+fsEsc(inv.recipient_uid)+'</div>':'')+'</div><div class="facts" style="grid-template-columns:1fr 1fr;margin:0">'+facts+'</div></div>'
    + (inv.kind==="Storno" && cancelsNumber ? '<p style="margin:0 0 8px">'+fsEsc(tf("Storno zu Rechnung {0}", cancelsNumber))+'</p>' : '')
    + '<table class="t"><thead><tr><th>#</th><th>'+fsT("Bezeichnung")+'</th><th class="r">'+fsT("Menge")+'</th><th class="r">'+fsT("Einzelpreis")+'</th><th class="r">'+fsT("USt")+'</th><th class="r">'+fsT("Betrag")+'</th></tr></thead><tbody>'+rows+sums+'</tbody></table>'
    + (inv.prices_gross && !s.small_business ? '<p style="font-size:10.5px;color:#6B7280;margin:6px 0 0">'+fsT("Alle Preise inklusive Umsatzsteuer.")+'</p>' : '')
    + (s.small_business ? '<p style="font-size:11px;margin:8px 0 0">'+fsT("Gemäß Kleinunternehmerregelung wird keine Umsatzsteuer berechnet.")+'</p>' : '')
    + (inv.note ? '<div class="box" style="margin-top:12px"><div class="b">'+fsEsc(inv.note)+'</div></div>' : '')
    + (inv.kind!=="Storno" && inv.due_on && bank ? '<p style="margin:12px 0 0">'+fsEsc(tf("Bitte überweisen Sie {0} bis {1} unter Angabe der Rechnungsnummer {2}.", m(invDue(inv)), fmtDate(inv.due_on), inv.number))+'</p>' : '')
    + '<div style="margin-top:18px;border-top:1px solid #E4DFD3;padding-top:6px;font-size:9.5px;color:#6B7280;display:flex;flex-wrap:wrap;gap:4px 14px">'
    + [s.company||s.hotel, s.uid && tf("UID")+": "+s.uid, s.tax_number && tf("Steuernummer")+": "+s.tax_number, s.register, bank, s.footer].filter(Boolean).map(x=>'<span>'+fsEsc(x)+'</span>').join("")
    + '</div></div>';
}
const invoiceFile = (inv) => safeFile(translateString(INV_KIND_TITLE[inv.kind]||"Rechnung")+" "+inv.number)+".pdf";

function InvoiceSettingsCard({hotel, api, onHotel, onClose}){
  const isAdmin = ACCESS.role==="admin";
  const [s,setS] = useState({payment_days:14, default_tax_rate:10, prices_gross:true, prefix:"RE-", ...(hotel.invoice_settings||{})});
  const [msg,setMsg] = useState(null);
  const F = (k, l, props={}) => <Field label={tf(l)}><input className="input" disabled={!isAdmin} value={s[k]??""} onChange={e=>setS({...s,[k]:e.target.value})} {...props} /></Field>;
  const save = async () => { setMsg(null); try { const h = await api("/api/hotels/"+hotel.id,"PATCH",{invoice_settings:{...s, payment_days:Number(s.payment_days), default_tax_rate:Number(String(s.default_tax_rate).replace(",","."))}}); onHotel(h); setMsg({ok:true,text:tf("Gespeichert.")}); } catch(e){ setMsg({ok:false,text:e.message}); } };
  return (
    <Card style={{marginBottom:14,borderColor:BRASS}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:6}}><b style={{flex:1}}>{tf("Rechnungsdaten des Hotels")}</b>{onClose && <button style={linkBtn} onClick={onClose}>✕</button>}</div>
      <div style={{fontSize:12.5,color:INK_MUTED,marginBottom:10}}>{isAdmin ? tf("Diese Angaben stehen auf jeder Rechnung. Bitte mit Ihrer Steuerberatung abstimmen (Pflichtangaben, Steuersätze).") : tf("Nur Admins können die Rechnungsdaten ändern.")}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))",gap:"0 10px"}}>
        {F("company","Firma (wie im Firmenbuch)")}
        <Field label={tf("Anschrift")}><textarea className="input" rows={3} disabled={!isAdmin} value={s.address||""} onChange={e=>setS({...s,address:e.target.value})} /></Field>
        {F("uid","UID-Nummer")}{F("tax_number","Steuernummer")}{F("register","Firmenbuch / Handelsregister")}
        {F("bank","Bank")}{F("iban","IBAN")}{F("bic","BIC")}
        {F("phone","Telefon")}{F("email","E-Mail")}{F("web","Website")}
        {F("prefix","Präfix der Rechnungsnummer")}{F("payment_days","Zahlungsziel (Tage)",{type:"number",min:0,max:120})}{F("default_tax_rate","Standard-Steuersatz (%)",{inputMode:"decimal"})}
      </div>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,margin:"4px 0"}}><input type="checkbox" disabled={!isAdmin} checked={s.prices_gross!==false} onChange={e=>setS({...s,prices_gross:e.target.checked})} /> {tf("Preise sind Bruttopreise (inkl. USt)")}</label>
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,margin:"4px 0 10px"}}><input type="checkbox" disabled={!isAdmin} checked={!!s.small_business} onChange={e=>setS({...s,small_business:e.target.checked})} /> {tf("Kleinunternehmer (keine Umsatzsteuer)")}</label>
      <Field label={tf("Fußzeile (optional)")}><input className="input" disabled={!isAdmin} value={s.footer||""} onChange={e=>setS({...s,footer:e.target.value})} /></Field>
      {isAdmin && <button className="btn-primary" onClick={save}>{tf("Speichern")}</button>}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </Card>
  );
}

function InvoiceForm({hotel, api, ev, invoices, onDone, onCancel}){
  const set0 = hotel.invoice_settings || {};
  const rate0 = set0.default_tax_rate ?? 10;
  const hasDeposit = ev && (invoices||[]).some(i=>i.event_id===ev.id && i.kind==="Anzahlung" && i.status!=="storniert");
  const fromOffer = () => ev ? offerSum(ev.offer_items, ev.guests).lines.filter(l=>l.label).map(l=>({label:l.label, qty:l.qtyEff, unit:"", unit_price:Number(String(l.unit_price??0).replace(",","."))||0, tax_rate:rate0})) : [];
  const [f,setF] = useState({kind: ev ? (hasDeposit ? "Schlussrechnung" : "Anzahlung") : "Rechnung", deposit_percent:30,
    recipient:[ev && ev.client, ev && ev.contact].filter(Boolean).join("\n"), recipient_email:((ev && ev.contact)||"").match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/)?.[0]||"", recipient_uid:"",
    service_date: ev ? fmtDate(ev.event_date) : "", note:"", items: fromOffer().length ? fromOffer() : [{label:"", qty:1, unit:"", unit_price:"", tax_rate:rate0}]});
  const [busy,setBusy] = useState(false); const [msg,setMsg] = useState(null);
  const [minibarIds,setMinibarIds] = useState([]); const [mbOpen,setMbOpen] = useState(null);
  const loadMinibar = () => api("/api/hotels/"+hotel.id+"/minibar-charges?open=1").then(list=>{ const by = {}; list.filter(c=>!minibarIds.includes(c.id)).forEach(c=>{ (by[c.room] = by[c.room] || []).push(c); }); setMbOpen(by); }).catch(e=>setMsg({ok:false,text:e.message}));
  const takeMinibar = (room) => { const list = (mbOpen||{})[room] || [];
    const add = list.map(c=>({label:tf("Minibar")+": "+c.item_name+" ("+tf("Zimmer")+" "+room+")", qty:c.quantity, unit:"", unit_price:String(c.unit_price), tax_rate:rate0}));
    setF(x=>({...x, items:[...x.items.filter(i=>i.label || i.unit_price), ...add]})); setMinibarIds(ids=>[...ids, ...list.map(c=>c.id)]); setMbOpen(null); };
  const items = f.items.map(i=>({...i, qty:Number(String(i.qty).replace(",","."))||0, unit_price:Number(String(i.unit_price).replace(",","."))||0, tax_rate:Number(String(i.tax_rate).replace(",","."))||0}));
  const gross = set0.prices_gross!==false;
  const t = invTotals(items, gross);
  const deposits = ev ? (invoices||[]).filter(i=>i.event_id===ev.id && i.kind==="Anzahlung" && i.status!=="storniert") : [];
  const depAmount = f.kind==="Anzahlung" ? r2(t.gross*(Number(f.deposit_percent)||0)/100) : null;
  const setItem = (n, k, v) => setF({...f, items:f.items.map((x,j)=>j===n?{...x,[k]:v}:x)});
  const submit = async () => {
    setBusy(true); setMsg(null);
    try { const inv = await api("/api/hotels/"+hotel.id+"/invoices","POST",{...f, items, event_id: ev ? ev.id : undefined});
      // Übernommene Minibar-Posten als abgerechnet markieren
      if(minibarIds.length) await api("/api/minibar-charges/bill","POST",{ids:minibarIds}).catch(()=>{});
      onDone(inv); }
    catch(e){ setMsg({ok:false,text:e.message}); }
    setBusy(false);
  };
  const m = (n) => moneyIn(n);
  return (
    <div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:8}}><Icon n="receipt" /> {tf("Rechnung erstellen")}{ev ? <span style={{fontWeight:400,color:INK_MUTED}} data-no-i18n=""> · {ev.title}</span> : null}</div>
      {!(hotel.invoice_settings && hotel.invoice_settings.company) && <div style={{fontSize:12.5,color:WARN_TEXT,marginBottom:8}}>{tf("Tipp: Zuerst unter „Rechnungen“ die Rechnungsdaten des Hotels (Firma, UID, Bank) eintragen.")}</div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {(ev ? ["Anzahlung","Schlussrechnung","Rechnung"] : ["Rechnung"]).map(k=><button key={k} onClick={()=>setF({...f,kind:k})} style={{border:`1px solid ${f.kind===k?INK:BORDER}`,background:f.kind===k?INK:CARD,color:f.kind===k?"#fff":INK,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{tf(INV_KIND_TITLE[k])}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:"0 10px"}}>
        <Field label={tf("Rechnungsempfänger (Name, Firma, Anschrift)")}><textarea className="input" rows={3} value={f.recipient} onChange={e=>setF({...f,recipient:e.target.value})} /></Field>
        <div>
          <Field label={tf("E-Mail des Empfängers")}><input className="input" type="email" value={f.recipient_email} onChange={e=>setF({...f,recipient_email:e.target.value})} /></Field>
          <Field label={tf("Leistungsdatum / -zeitraum")}><input className="input" value={f.service_date} onChange={e=>setF({...f,service_date:e.target.value})} /></Field>
          <Field label={tf("UID-Nummer des Empfängers (bei Unternehmen)")}><input className="input" placeholder="ATU12345678" value={f.recipient_uid} onChange={e=>setF({...f,recipient_uid:e.target.value})} data-no-i18n="" /></Field>
          {!f.recipient_uid.trim() && (depAmount ?? t.gross) > 10000 && <div style={{fontSize:12.5,color:WARN_TEXT,marginTop:-4,marginBottom:8}}>{tf("Über 10.000 € brutto muss die UID-Nummer eines Unternehmens auf der Rechnung stehen (§ 11 UStG).")}</div>}
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:560}}>
          <thead><tr style={{color:INK_MUTED,fontSize:11.5}}><th style={{textAlign:"start"}}>{tf("Bezeichnung")}</th><th>{tf("Menge")}</th><th>{tf("Einzelpreis")}</th><th>{tf("USt %")}</th><th style={{textAlign:"end"}}>{tf("Betrag")}</th><th></th></tr></thead>
          <tbody>{f.items.map((x,n)=>(
            <tr key={n}>
              <td style={{padding:"3px 4px"}}><input className="input" value={x.label} onChange={e=>setItem(n,"label",e.target.value)} /></td>
              <td style={{padding:"3px 4px",width:70}}><input className="input" inputMode="decimal" value={x.qty} onChange={e=>setItem(n,"qty",e.target.value)} /></td>
              <td style={{padding:"3px 4px",width:100}}><input className="input" inputMode="decimal" value={x.unit_price} onChange={e=>setItem(n,"unit_price",e.target.value)} /></td>
              <td style={{padding:"3px 4px",width:70}}><input className="input" inputMode="decimal" disabled={!!set0.small_business} value={set0.small_business?0:x.tax_rate} onChange={e=>setItem(n,"tax_rate",e.target.value)} /></td>
              <td style={{padding:"3px 4px",textAlign:"end",whiteSpace:"nowrap"}} data-no-i18n="">{m(r2(items[n].qty*items[n].unit_price))}</td>
              <td><button style={linkBtn} onClick={()=>setF({...f,items:f.items.filter((_,j)=>j!==n)})}>✕</button></td>
            </tr>))}</tbody>
        </table>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <button style={{...linkBtn,paddingInlineStart:0}} onClick={()=>setF({...f,items:[...f.items,{label:"", qty:1, unit:"", unit_price:"", tax_rate:rate0}]})}>{tf("+ Position")}</button>
        {!ev && <button style={linkBtn} onClick={loadMinibar}>{tf("Minibar übernehmen")}</button>}
        {minibarIds.length>0 && <span style={{fontSize:12,color:INK_MUTED}}>{tf("{0} Minibar-Posten werden beim Ausstellen als abgerechnet markiert.", minibarIds.length)}</span>}
      </div>
      {mbOpen && <div style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:8,margin:"6px 0",fontSize:13}}>
        {Object.keys(mbOpen).length===0 ? <span style={{color:INK_MUTED}}>{tf("Keine offenen Minibar-Posten.")}</span>
          : Object.entries(mbOpen).map(([room,list])=><button key={room} style={{...smallBtn,margin:3}} onClick={()=>takeMinibar(room)}>{tf("Zimmer")} {room} · {moneyIn(list.reduce((x,c)=>x+Number(c.unit_price)*c.quantity,0))}</button>)}
        <button style={linkBtn} onClick={()=>setMbOpen(null)}>{tf("Schließen")}</button>
        <div style={{fontSize:11.5,color:INK_MUTED,marginTop:4}}>{tf("Steuersatz bitte prüfen (z. B. Getränke 20 %, Speisen 10 %).")}</div>
      </div>}
      <div style={{background:PAPER,borderRadius:8,padding:"8px 12px",margin:"8px 0",fontSize:13}}>
        {!set0.small_business && t.rates.map(x=><div key={x.rate} style={{display:"flex",justifyContent:"space-between"}} data-no-i18n=""><span>{tf("USt")} {x.rate} %</span><span>{m(x.tax)}</span></div>)}
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:700}}><span>{tf("Gesamtbetrag")}</span><span data-no-i18n="">{m(t.gross)}</span></div>
        {f.kind==="Anzahlung" && <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>{tf("Anzahlung")}
          <input className="input" type="number" min="1" max="100" style={{width:70}} value={f.deposit_percent} onChange={e=>setF({...f,deposit_percent:e.target.value})} /> % = <b data-no-i18n="">{m(depAmount)}</b></div>}
        {f.kind==="Schlussrechnung" && deposits.length>0 && <div style={{marginTop:4,color:INK_SOFT}}>{tf("Abzüglich Anzahlungen: {0}", deposits.map(d=>d.number+" ("+m(d.gross_total)+")").join(", "))} → <b data-no-i18n="">{m(r2(t.gross - deposits.reduce((s,d)=>s+Number(d.gross_total),0)))}</b></div>}
      </div>
      <Field label={tf("Hinweis auf der Rechnung (optional)")}><textarea className="input" rows={2} value={f.note} onChange={e=>setF({...f,note:e.target.value})} /></Field>
      <div style={{fontSize:12,color:INK_MUTED,marginBottom:8}}>{tf("Nach dem Ausstellen erhält die Rechnung eine fortlaufende Nummer und kann nicht mehr geändert werden – nur storniert.")}</div>
      <div style={{display:"flex",gap:8}}><button className="btn-primary" disabled={busy || !f.recipient.trim() || !t.gross} onClick={submit}>{busy?"…":tf("Rechnung ausstellen")}</button><button style={linkBtn} onClick={onCancel}>{tf("Abbrechen")}</button></div>
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginTop:8}}>{msg.text}</div>}
    </div>
  );
}

function InvoiceActions({inv, hotel, api, list, onChanged, onMsg}){
  const [busy,setBusy] = useState("");
  const cancelsNo = inv.cancels ? ((list||[]).find(x=>x.id===inv.cancels)||{}).number : null;
  const canEdit = INVOICE_DEPTS_FE.some(d=>canManageDept(d));
  const act = async (k, fn) => { setBusy(k); try { await fn(); } catch(e){ onMsg({ok:false,text:e.message}); } setBusy(""); };
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      <button style={smallBtn} disabled={!!busy} onClick={()=>act("pdf", ()=>sheetPdf(invoiceSheetHtml(inv, hotel, cancelsNo), invoiceFile(inv)))}>{busy==="pdf"?"…":<React.Fragment><Icon n="filetext" /> PDF</React.Fragment>}</button>
      <button style={smallBtn} disabled={!!busy} title={tf("E-Rechnung für öffentliche Auftraggeber (ebInterface)")} onClick={()=>act("ebi", async()=>{
        const ref = window.prompt(tf("Auftragsreferenz des Auftraggebers (bei Bundesdienststellen Pflicht, sonst leer lassen):"), ""); if(ref===null) return;
        downloadBlob(new Blob([ebInterfaceXml(inv, hotel, ref.trim())], {type:"application/xml"}), invoiceFile(inv).replace(/\.pdf$/i,"")+".xml");
      })}>{busy==="ebi"?"…":"E-Rechnung"}</button>
      {canEdit && <button style={smallBtn} disabled={!!busy} onClick={()=>act("mail", async()=>{
        const email = window.prompt(tf("An welche E-Mail-Adresse soll die Rechnung gehen?"), inv.recipient_email||""); if(!email) return;
        const blob = await sheetPdf(invoiceSheetHtml(inv, hotel, cancelsNo), invoiceFile(inv), false, "portrait", true);
        await api("/api/invoices/"+inv.id+"/send","POST",{email, pdf:await blobToDataUrl(blob), file_name:invoiceFile(inv).replace(/\.pdf$/,""), language:UI_LANG});
        onMsg({ok:true,text:tf("Rechnung per E-Mail verschickt.")}); onChanged();
      })}>{busy==="mail"?"…":"✉ "+tf("Senden")}</button>}
      {canEdit && inv.kind!=="Storno" && inv.status!=="storniert" && <button style={smallBtn} disabled={!!busy} onClick={()=>act("paid", async()=>{ await api("/api/invoices/"+inv.id,"PATCH",{status:inv.status==="bezahlt"?"offen":"bezahlt"}); onChanged(); })}>{inv.status==="bezahlt" ? tf("Als offen markieren") : "✓ "+tf("Bezahlt")}</button>}
      {canEdit && inv.kind!=="Storno" && inv.status!=="storniert" && <button style={{...linkBtn,color:BAD}} disabled={!!busy} onClick={()=>{ if(window.confirm(tf("Rechnung {0} stornieren? Es wird eine Stornorechnung mit neuer Nummer erstellt.", inv.number))) act("cancel", async()=>{ await api("/api/invoices/"+inv.id+"/cancel","POST",{}); onChanged(); }); }}>{tf("Stornieren")}</button>}
    </div>
  );
}
const INVOICE_DEPTS_FE = ["Food & Beverage","Rezeption & Empfang","Finanzen & Controlling"];

function InvoicesView({hotel, api, role, onHotel}){
  const [list,setList] = useState(null); const [filter,setFilter] = useState("all");
  const [form,setForm] = useState(false); const [settings,setSettings] = useState(false);
  const [msg,setMsg] = useState(null);
  const canEdit = INVOICE_DEPTS_FE.some(d=>canManageDept(d));
  const load = useCallback(()=>api("/api/hotels/"+hotel.id+"/invoices").then(setList).catch(e=>{ setMsg({ok:false,text:e.message}); setList([]); }),[api, hotel.id]);
  useEffect(()=>{ load(); },[load]);
  if(list===null) return <div style={{color:INK_MUTED}}>…</div>;
  const shown = list.filter(i=>filter==="all" || (filter==="open" && i.status==="offen" && i.kind!=="Storno") || (filter==="overdue" && invOverdue(i)));
  const openSum = r2(list.filter(i=>i.status==="offen" && i.kind!=="Storno").reduce((s,i)=>s+invDue(i),0));
  const overdue = list.filter(invOverdue);
  const m0 = todayIso().slice(0,7);
  const paidMonth = r2(list.filter(i=>i.status==="bezahlt" && (i.paid_on||"").startsWith(m0)).reduce((s,i)=>s+invDue(i),0));
  const exportXlsx = async () => {
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const rows = list.slice().reverse().map(i=>({[translateString("Rechnungsnummer")]:i.number, [translateString("Art")]:translateString(INV_KIND_TITLE[i.kind]), [translateString("Rechnungsdatum")]:i.issued_on, [translateString("Rechnungsempfänger")]:String(i.recipient).split("\n")[0],
        [translateString("Summe netto")]:Number(i.net_total), [translateString("Summe USt")]:Number(i.tax_total), [translateString("Gesamtbetrag")]:Number(i.gross_total), [translateString("abzüglich Anzahlungen")]:Number(i.deducted||0), [translateString("Status")]:translateString(i.status), [translateString("Bezahlt am")]:i.paid_on||""}));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Rechnungen");
      XLSX.writeFile(wb, safeFile(translateString("Rechnungsausgangsbuch")+" "+hotel.name)+".xlsx");
    } catch(e){ setMsg({ok:false,text:e.message}); }
  };
  return (
    <div>
      <div className="stack" style={{display:"flex",gap:14,marginBottom:14}}>
        <StatTile label={tf("Offen")} value={moneyIn(openSum)} sub={tf("{0} Rechnungen", list.filter(i=>i.status==="offen" && i.kind!=="Storno").length)} />
        <StatTile label={tf("Überfällig")} value={moneyIn(r2(overdue.reduce((s,i)=>s+invDue(i),0)))} sub={tf("{0} Rechnungen", overdue.length)} color={overdue.length?BAD:undefined} />
        <StatTile label={tf("Bezahlt diesen Monat")} value={moneyIn(paidMonth)} color={GOOD} />
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        {canEdit && <button className="btn-primary" onClick={()=>setForm(true)}>{tf("+ Rechnung")}</button>}
        <button style={smallBtn} onClick={()=>setSettings(!settings)}><Icon n="gear" /> {tf("Rechnungsdaten")}</button>
        {list.length>0 && <button style={smallBtn} onClick={exportXlsx}>Excel</button>}
        <span style={{flex:1}} />
        {[["all","Alle"],["open","Offen"],["overdue","Überfällig"]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{border:`1px solid ${filter===k?INK:BORDER}`,background:filter===k?INK:CARD,color:filter===k?"#fff":INK,borderRadius:999,padding:"5px 12px",fontSize:12.5,cursor:"pointer"}}>{tf(l)}</button>)}
      </div>
      {settings && <InvoiceSettingsCard hotel={hotel} api={api} onHotel={onHotel} onClose={()=>setSettings(false)} />}
      {msg && <div style={{color:msg.ok?GOOD:BAD,fontSize:13,marginBottom:10}}>{msg.text}</div>}
      {form && <Overlay onClose={()=>setForm(false)}><InvoiceForm hotel={hotel} api={api} invoices={list} onCancel={()=>setForm(false)} onDone={(inv)=>{ setForm(false); setMsg({ok:true,text:tf("Rechnung {0} ausgestellt.", inv.number)}); load(); }} /></Overlay>}
      {shown.length===0 ? <Card><div style={{color:INK_MUTED,fontSize:13.5}}>{tf("Noch keine Rechnungen. Rechnungen entstehen hier oder direkt aus einer Veranstaltung mit Angebot.")}</div></Card> : shown.map(i=>{ const [c,bg,l] = INV_STATUS[i.status]; const od = invOverdue(i); return (
        <Card key={i.id} style={{marginBottom:8,padding:"11px 14px",borderInlineStart:od?`4px solid ${BAD}`:undefined,opacity:i.status==="storniert"&&i.kind!=="Storno"?0.6:1}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
            <b data-no-i18n="">{i.number}</b><span style={{fontSize:12.5,color:INK_MUTED}}>{tf(INV_KIND_TITLE[i.kind])}</span>
            <Pill color={od?BAD:c} bg={od?BAD_SOFT:bg}>{od ? tf("überfällig") : tf(l)}</Pill>
            <span style={{flex:1,minWidth:120,fontSize:13}} data-no-i18n="">{String(i.recipient).split("\n")[0]}</span>
            <span style={{fontSize:12.5,color:INK_MUTED}}>{fmtDate(i.issued_on)}{i.due_on && i.kind!=="Storno" ? " · "+tf("fällig {0}", fmtDate(i.due_on)) : ""}</span>
            <b data-no-i18n="">{moneyIn(invDue(i), i.currency)}</b>
          </div>
          <InvoiceActions inv={i} hotel={hotel} api={api} list={list} onChanged={load} onMsg={setMsg} />
        </Card>); })}
    </div>
  );
}
// In der Veranstaltung: Rechnungen zu diesem Event und Knopf zum Erstellen
function EventInvoices({ev, hotel, api, invoices, onChanged}){
  const [open,setOpen] = useState(false); const [msg,setMsg] = useState(null);
  const mine = (invoices||[]).filter(i=>i.event_id===ev.id);
  const canEdit = INVOICE_DEPTS_FE.some(d=>canManageDept(d));
  if(!canEdit && !mine.length) return null;
  return (
    <div style={{marginTop:6}}>
      {mine.map(i=>{ const [c,bg,l] = INV_STATUS[i.status]; return <div key={i.id} style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",fontSize:12.5,marginBottom:3}}>
        <Icon n="receipt" /> <b data-no-i18n="">{i.number}</b> <span style={{color:INK_MUTED}}>{tf(INV_KIND_TITLE[i.kind])}</span> <span data-no-i18n="">{moneyIn(invDue(i), i.currency)}</span> <Pill color={invOverdue(i)?BAD:c} bg={invOverdue(i)?BAD_SOFT:bg}>{invOverdue(i)?tf("überfällig"):tf(l)}</Pill>
        <button style={{...linkBtn,padding:"0 4px"}} onClick={()=>sheetPdf(invoiceSheetHtml(i, hotel, i.cancels ? ((invoices||[]).find(x=>x.id===i.cancels)||{}).number : null), invoiceFile(i)).catch(e=>setMsg({ok:false,text:e.message}))}>PDF</button>
      </div>; })}
      {canEdit && <button style={smallBtn} onClick={()=>setOpen(true)}><Icon n="receipt" /> {tf("Rechnung")}</button>}
      {msg && <div style={{fontSize:12,color:msg.ok?GOOD:BAD}}>{msg.text}</div>}
      {open && <Overlay onClose={()=>setOpen(false)}><InvoiceForm hotel={hotel} api={api} ev={ev} invoices={invoices} onCancel={()=>setOpen(false)} onDone={(inv)=>{ setOpen(false); setMsg({ok:true,text:tf("Rechnung {0} ausgestellt.", inv.number)}); onChanged(); }} /></Overlay>}
    </div>
  );
}

