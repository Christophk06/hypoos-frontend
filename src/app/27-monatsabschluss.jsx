// ============================================================ Monatsabschluss (PDF für die Lohnverrechnung)
// Stunden, Kranken- und Urlaubstage je Person, Kassenbuch, Ortstaxe und Belegung eines Monats auf einen Blick.
function monthCloseHtml(d, hotel, nameOf){
  const mLabel = new Date(d.month+"-15T12:00:00").toLocaleDateString(UI_LOCALE,{month:"long",year:"numeric"});
  const money = (v) => v==null ? "–" : Number(v).toLocaleString(UI_LOCALE,{style:"currency",currency:d.hotel.currency||"EUR"});
  const people = d.people.map(p=>({...p, label: p.user_id ? nameOf(p.user_id) : (p.name||"–")})).sort((a,b)=>a.label.localeCompare(b.label));
  const totalH = people.reduce((s,p)=>s+p.hours,0);
  const f = (l, v) => '<div class="f"><div class="l">'+fsT(l)+'</div><div class="v">'+fsEsc(v)+'</div></div>';
  let h = FS_TABLE+'<div class="fs" style="--fs-accent:'+fsEsc(hotel.brand_color||"#A9834B")+'">'+fsHead(hotel, translateString("Monatsabschluss"), mLabel)
    + '<div class="facts">'+f("Stunden gesamt", fmtHours(totalH))+f("Personen", String(people.length))
    + f("Krankentage", String(people.reduce((s,p)=>s+p.sick_days,0)))+f("Urlaubstage", String(people.reduce((s,p)=>s+p.leave_days,0)))
    + (d.room_nights!=null ? f("Belegte Zimmernächte", String(d.room_nights)) : "")+'</div>';
  h += '<h3 style="font-size:13px;margin:14px 0 4px">'+fsT("Arbeitszeit, Krankenstand und Urlaub")+'</h3><table class="t"><thead><tr><th>'+fsT("Name")+'</th><th>'+fsT("Abteilung")+'</th><th class="r">'+fsT("Dienste")+'</th><th class="r">'+fsT("Stunden")+'</th><th class="r">'+fsT("Krankentage")+'</th><th class="r">'+fsT("Urlaubstage")+'</th></tr></thead><tbody>'
    + (people.length ? people.map(p=>'<tr><td>'+fsEsc(p.label)+'</td><td>'+fsEsc(p.departments.map(translateString).join(", "))+'</td><td class="r">'+p.shifts+'</td><td class="r">'+fsEsc(fmtHours(p.hours))+'</td><td class="r">'+p.sick_days+'</td><td class="r">'+p.leave_days+'</td></tr>').join("")
      : '<tr><td colspan="6">'+fsT("Keine Einträge in diesem Monat.")+'</td></tr>')
    + '<tr class="g"><td colspan="3">'+fsT("Gesamt")+'</td><td class="r">'+fsEsc(fmtHours(totalH))+'</td><td></td><td></td></tr></tbody></table>';
  const cats = Object.entries(d.cash.by_category||{});
  h += '<h3 style="font-size:13px;margin:14px 0 4px">'+fsT("Kassenbuch")+'</h3>'
    + (d.cash.count ? '<table class="t"><tbody>'+cats.map(([k,v])=>{ const [dir,cat]=k.split("|"); return '<tr><td>'+fsT(dir==="ein"?"Einnahme":"Ausgabe")+' · '+fsT(cat)+'</td><td class="r">'+fsEsc(money(v))+'</td></tr>'; }).join("")
      + '<tr class="g"><td>'+fsT("Saldo im Monat")+'</td><td class="r">'+fsEsc(money(d.cash.total_in - d.cash.total_out))+'</td></tr></tbody></table>' : '<div style="font-size:11px;color:#6B7280">'+fsT("Keine Einträge in diesem Monat.")+'</div>');
  h += '<h3 style="font-size:13px;margin:14px 0 4px">'+fsT("Ortstaxe")+'</h3>'
    + (d.tourism_tax ? '<table class="t"><tbody><tr><td>'+fsT("Nächtigungen")+'</td><td class="r">'+d.tourism_tax.stays+'</td></tr><tr><td>'+fsT("davon befreit")+'</td><td class="r">'+d.tourism_tax.exempt+'</td></tr>'
      + (d.tourism_tax.amount!=null ? '<tr class="g"><td>'+fsT("Betrag")+'</td><td class="r">'+fsEsc(money(d.tourism_tax.amount))+'</td></tr>' : '')+'</tbody></table>'
      : '<div style="font-size:11px;color:#6B7280">'+fsT("Für diesen Monat noch nicht erfasst.")+'</div>');
  h += '<div style="font-size:10px;color:#6B7280;margin-top:10px">'+fsT("Stunden = gestempelte Zeit abzüglich Pausen. Krankentage aus Krankmeldungen und Dienstplan, Urlaubstage aus dem Dienstplan.")+'</div>';
  return h + '<div class="sig"><div>'+fsT("Erstellt von")+' – '+fsT("Datum und Unterschrift")+'</div><div>'+fsT("Geprüft")+' – '+fsT("Datum und Unterschrift")+'</div></div>'+fsFoot()+'</div>';
}
async function monthClosePdf({api, hotel, month, members}){
  const d = await api("/api/hotels/"+hotel.id+"/month-close?month="+month);
  const nameOf = (id) => { const m = (members||[]).find(x=>x.user_id===id); return m ? shortName(m.email) : tf("Teammitglied"); };
  await sheetPdf(monthCloseHtml(d, hotel, nameOf), safeFile(translateString("Monatsabschluss")+" "+hotel.name+" "+d.month)+".pdf");
}
