// Fertige Brief-Vorlagen (Reservierung, Storno, Willkommen, Angebot, Veranstaltung, Gutschein) in 10 Sprachen.
// Platzhalter in geschweiften Klammern werden beim Erstellen befüllt – auch in hochgeladenen Word-Dateien.
// Erste Zeile mit "# " = Überschrift, Leerzeile = neuer Absatz.
(function(){
const T = {
de: {
reservierung: ["Reservierungsbestätigung", `# Reservierungsbestätigung
Reservierungsnummer: {reservation_no}

Sehr geehrte/r {guest_name},

vielen Dank für Ihre Reservierung. Gerne bestätigen wir Ihren Aufenthalt:

Anreise: {arrival}
Abreise: {departure} ({nights} Nächte)
Zimmer: {room_type}
Zimmernummer: {room_no}
Personen: {persons}
Verpflegung: {board}
Preis pro Nacht: {rate}
Gesamtpreis: {total}
Zahlung: {payment}

{notes}

Check-in ist ab 15:00 Uhr möglich, Check-out bis 11:00 Uhr. Bei Fragen oder Wünschen sind wir jederzeit für Sie da.

Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen
{sender}
{hotel_name}`],
storno: ["Stornobestätigung", `# Stornobestätigung
Reservierungsnummer: {reservation_no}

Sehr geehrte/r {guest_name},

hiermit bestätigen wir die Stornierung Ihrer Reservierung vom {arrival} bis {departure}.

Stornogebühr: {total}

{notes}

Wir bedauern, Sie diesmal nicht begrüßen zu dürfen, und würden uns freuen, Sie bald bei uns willkommen zu heißen.

Mit freundlichen Grüßen
{sender}
{hotel_name}`],
willkommen: ["Willkommensbrief", `# Herzlich willkommen, {guest_name}!

Schön, dass Sie da sind. Wir wünschen Ihnen einen erholsamen Aufenthalt im {hotel_name}.

Frühstück: täglich 7:00 – 10:30 Uhr
WLAN: {wifi}
Rezeption: rund um die Uhr erreichbar unter {hotel_phone}

{notes}

Haben Sie einen Wunsch? Sprechen Sie uns jederzeit an – wir helfen gerne.

Ihr Team vom {hotel_name}`],
angebot: ["Angebot Veranstaltung", `# Angebot: {event_title}

Sehr geehrte/r {guest_name},

vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:

Datum: {event_date}, {event_time}
Raum: {event_room}
Personen: {guests}

{items}

Gesamtsumme: {offer_total}

{notes}

Dieses Angebot ist gültig bis {valid_until}. Wir freuen uns auf Ihre Rückmeldung.

Mit freundlichen Grüßen
{sender}
{hotel_name}`],
veranstaltung: ["Bestätigung Veranstaltung", `# Bestätigung: {event_title}

Sehr geehrte/r {guest_name},

wir bestätigen Ihre Veranstaltung verbindlich:

Datum: {event_date}, {event_time}
Raum: {event_room}
Personen: {guests}

{items}

Gesamtsumme: {offer_total}

{notes}

Bitte teilen Sie uns die endgültige Personenzahl spätestens 3 Tage vorher mit. Wir freuen uns darauf, Ihr Gastgeber zu sein.

Mit freundlichen Grüßen
{sender}
{hotel_name}`],
gutschein: ["Gutschein", `# Gutschein

im Wert von {voucher_value}

für {guest_name}

Einlösbar im {hotel_name} für Übernachtungen, Restaurant und Spa.
Gutscheincode: {voucher_code}
Gültig bis: {valid_until}

Ausgestellt am {today}`],
},
en: {
reservierung: ["Booking confirmation", `# Booking confirmation
Booking number: {reservation_no}

Dear {guest_name},

Thank you for your booking. We are pleased to confirm your stay:

Arrival: {arrival}
Departure: {departure} ({nights} nights)
Room: {room_type}
Room number: {room_no}
Guests: {persons}
Board: {board}
Rate per night: {rate}
Total: {total}
Payment: {payment}

{notes}

Check-in is from 3 pm, check-out until 11 am. If you have any questions or requests, we are always happy to help.

We look forward to welcoming you!

Kind regards
{sender}
{hotel_name}`],
storno: ["Cancellation confirmation", `# Cancellation confirmation
Booking number: {reservation_no}

Dear {guest_name},

We hereby confirm the cancellation of your booking from {arrival} to {departure}.

Cancellation fee: {total}

{notes}

We are sorry not to welcome you this time and hope to see you soon.

Kind regards
{sender}
{hotel_name}`],
willkommen: ["Welcome letter", `# Welcome, {guest_name}!

We are delighted to have you with us and wish you a relaxing stay at {hotel_name}.

Breakfast: daily 7:00 – 10:30
Wi-Fi: {wifi}
Reception: available around the clock at {hotel_phone}

{notes}

Is there anything you need? Just let us know – we are happy to help.

Your team at {hotel_name}`],
angebot: ["Event offer", `# Offer: {event_title}

Dear {guest_name},

Thank you for your enquiry. We are pleased to make you the following offer:

Date: {event_date}, {event_time}
Room: {event_room}
Guests: {guests}

{items}

Total: {offer_total}

{notes}

This offer is valid until {valid_until}. We look forward to hearing from you.

Kind regards
{sender}
{hotel_name}`],
veranstaltung: ["Event confirmation", `# Confirmation: {event_title}

Dear {guest_name},

We are pleased to confirm your event:

Date: {event_date}, {event_time}
Room: {event_room}
Guests: {guests}

{items}

Total: {offer_total}

{notes}

Please let us know the final number of guests no later than 3 days in advance. We look forward to being your hosts.

Kind regards
{sender}
{hotel_name}`],
gutschein: ["Gift voucher", `# Gift voucher

worth {voucher_value}

for {guest_name}

Redeemable at {hotel_name} for stays, restaurant and spa.
Voucher code: {voucher_code}
Valid until: {valid_until}

Issued on {today}`],
},
fr: {
reservierung: ["Confirmation de réservation", `# Confirmation de réservation
Numéro de réservation : {reservation_no}

Madame, Monsieur {guest_name},

Merci pour votre réservation. Nous avons le plaisir de vous confirmer votre séjour :

Arrivée : {arrival}
Départ : {departure} ({nights} nuits)
Chambre : {room_type}
Numéro de chambre: {room_no}
Personnes : {persons}
Formule: {board}
Prix par nuit : {rate}
Prix total : {total}
Paiement: {payment}

{notes}

L’enregistrement est possible à partir de 15 h, le départ jusqu’à 11 h. Pour toute question ou demande, nous restons à votre disposition.

Au plaisir de vous accueillir !

Cordialement
{sender}
{hotel_name}`],
storno: ["Confirmation d’annulation", `# Confirmation d’annulation
Numéro de réservation : {reservation_no}

Madame, Monsieur {guest_name},

Nous confirmons l’annulation de votre réservation du {arrival} au {departure}.

Frais d’annulation : {total}

{notes}

Nous regrettons de ne pas vous accueillir cette fois et espérons vous recevoir bientôt.

Cordialement
{sender}
{hotel_name}`],
willkommen: ["Lettre de bienvenue", `# Bienvenue, {guest_name} !

Nous sommes ravis de vous accueillir et vous souhaitons un agréable séjour au {hotel_name}.

Petit-déjeuner : tous les jours de 7 h à 10 h 30
Wi-Fi : {wifi}
Réception : joignable 24 h/24 au {hotel_phone}

{notes}

Un souhait ? N’hésitez pas à nous en faire part – nous vous aiderons avec plaisir.

Votre équipe du {hotel_name}`],
angebot: ["Offre événement", `# Offre : {event_title}

Madame, Monsieur {guest_name},

Merci pour votre demande. Nous avons le plaisir de vous soumettre l’offre suivante :

Date : {event_date}, {event_time}
Salle : {event_room}
Personnes : {guests}

{items}

Montant total : {offer_total}

{notes}

Cette offre est valable jusqu’au {valid_until}. Nous attendons votre retour avec plaisir.

Cordialement
{sender}
{hotel_name}`],
veranstaltung: ["Confirmation d’événement", `# Confirmation : {event_title}

Madame, Monsieur {guest_name},

Nous vous confirmons votre événement :

Date : {event_date}, {event_time}
Salle : {event_room}
Personnes : {guests}

{items}

Montant total : {offer_total}

{notes}

Merci de nous communiquer le nombre définitif de participants au plus tard 3 jours avant. Nous nous réjouissons de vous accueillir.

Cordialement
{sender}
{hotel_name}`],
gutschein: ["Bon cadeau", `# Bon cadeau

d’une valeur de {voucher_value}

pour {guest_name}

Valable au {hotel_name} pour l’hébergement, le restaurant et le spa.
Code : {voucher_code}
Valable jusqu’au : {valid_until}

Émis le {today}`],
},
it: {
reservierung: ["Conferma di prenotazione", `# Conferma di prenotazione
Numero di prenotazione: {reservation_no}

Gentile {guest_name},

grazie per la sua prenotazione. Siamo lieti di confermarle il soggiorno:

Arrivo: {arrival}
Partenza: {departure} ({nights} notti)
Camera: {room_type}
Numero camera: {room_no}
Persone: {persons}
Trattamento: {board}
Prezzo per notte: {rate}
Prezzo totale: {total}
Pagamento: {payment}

{notes}

Il check-in è possibile dalle 15:00, il check-out entro le 11:00. Per domande o richieste siamo sempre a sua disposizione.

Saremo lieti di accoglierla!

Cordiali saluti
{sender}
{hotel_name}`],
storno: ["Conferma di cancellazione", `# Conferma di cancellazione
Numero di prenotazione: {reservation_no}

Gentile {guest_name},

con la presente confermiamo la cancellazione della sua prenotazione dal {arrival} al {departure}.

Penale di cancellazione: {total}

{notes}

Ci dispiace non poterla accogliere questa volta e speriamo di rivederla presto.

Cordiali saluti
{sender}
{hotel_name}`],
willkommen: ["Lettera di benvenuto", `# Benvenuto, {guest_name}!

Siamo felici di averla con noi e le auguriamo un piacevole soggiorno al {hotel_name}.

Colazione: ogni giorno 7:00 – 10:30
Wi-Fi: {wifi}
Ricevimento: sempre raggiungibile al {hotel_phone}

{notes}

Ha un desiderio? Ce lo dica in qualsiasi momento – saremo lieti di aiutarla.

Il team del {hotel_name}`],
angebot: ["Offerta evento", `# Offerta: {event_title}

Gentile {guest_name},

grazie per la sua richiesta. Siamo lieti di sottoporle la seguente offerta:

Data: {event_date}, {event_time}
Sala: {event_room}
Persone: {guests}

{items}

Totale: {offer_total}

{notes}

L’offerta è valida fino al {valid_until}. Restiamo in attesa di un suo riscontro.

Cordiali saluti
{sender}
{hotel_name}`],
veranstaltung: ["Conferma evento", `# Conferma: {event_title}

Gentile {guest_name},

confermiamo il suo evento:

Data: {event_date}, {event_time}
Sala: {event_room}
Persone: {guests}

{items}

Totale: {offer_total}

{notes}

La preghiamo di comunicarci il numero definitivo di partecipanti entro 3 giorni prima. Saremo lieti di essere i vostri ospiti.

Cordiali saluti
{sender}
{hotel_name}`],
gutschein: ["Buono regalo", `# Buono regalo

del valore di {voucher_value}

per {guest_name}

Utilizzabile al {hotel_name} per pernottamenti, ristorante e spa.
Codice: {voucher_code}
Valido fino al: {valid_until}

Emesso il {today}`],
},
es: {
reservierung: ["Confirmación de reserva", `# Confirmación de reserva
Número de reserva: {reservation_no}

Estimado/a {guest_name}:

Gracias por su reserva. Nos complace confirmarle su estancia:

Llegada: {arrival}
Salida: {departure} ({nights} noches)
Habitación: {room_type}
Número de habitación: {room_no}
Personas: {persons}
Régimen: {board}
Precio por noche: {rate}
Precio total: {total}
Pago: {payment}

{notes}

El check-in es a partir de las 15:00 y el check-out hasta las 11:00. Para cualquier pregunta o deseo, estamos a su disposición.

¡Esperamos su visita!

Atentamente
{sender}
{hotel_name}`],
storno: ["Confirmación de cancelación", `# Confirmación de cancelación
Número de reserva: {reservation_no}

Estimado/a {guest_name}:

Por la presente confirmamos la cancelación de su reserva del {arrival} al {departure}.

Gastos de cancelación: {total}

{notes}

Lamentamos no poder recibirle esta vez y esperamos darle pronto la bienvenida.

Atentamente
{sender}
{hotel_name}`],
willkommen: ["Carta de bienvenida", `# ¡Bienvenido/a, {guest_name}!

Nos alegra tenerle con nosotros y le deseamos una estancia agradable en {hotel_name}.

Desayuno: todos los días de 7:00 a 10:30
Wi-Fi: {wifi}
Recepción: disponible las 24 horas en el {hotel_phone}

{notes}

¿Necesita algo? Díganoslo en cualquier momento; le ayudaremos con gusto.

Su equipo de {hotel_name}`],
angebot: ["Oferta de evento", `# Oferta: {event_title}

Estimado/a {guest_name}:

Gracias por su solicitud. Nos complace presentarle la siguiente oferta:

Fecha: {event_date}, {event_time}
Sala: {event_room}
Personas: {guests}

{items}

Importe total: {offer_total}

{notes}

Esta oferta es válida hasta el {valid_until}. Quedamos a la espera de su respuesta.

Atentamente
{sender}
{hotel_name}`],
veranstaltung: ["Confirmación de evento", `# Confirmación: {event_title}

Estimado/a {guest_name}:

Le confirmamos su evento:

Fecha: {event_date}, {event_time}
Sala: {event_room}
Personas: {guests}

{items}

Importe total: {offer_total}

{notes}

Le rogamos nos comunique el número definitivo de asistentes a más tardar 3 días antes. Será un placer ser sus anfitriones.

Atentamente
{sender}
{hotel_name}`],
gutschein: ["Vale regalo", `# Vale regalo

por valor de {voucher_value}

para {guest_name}

Canjeable en {hotel_name} para alojamiento, restaurante y spa.
Código: {voucher_code}
Válido hasta: {valid_until}

Emitido el {today}`],
},
pt: {
reservierung: ["Confirmação de reserva", `# Confirmação de reserva
Número da reserva: {reservation_no}

Caro/a {guest_name},

Obrigado pela sua reserva. Temos o prazer de confirmar a sua estadia:

Chegada: {arrival}
Partida: {departure} ({nights} noites)
Quarto: {room_type}
Número do quarto: {room_no}
Pessoas: {persons}
Regime: {board}
Preço por noite: {rate}
Preço total: {total}
Pagamento: {payment}

{notes}

O check-in é possível a partir das 15:00 e o check-out até às 11:00. Para qualquer questão ou pedido, estamos ao seu dispor.

Aguardamos a sua visita!

Com os melhores cumprimentos
{sender}
{hotel_name}`],
storno: ["Confirmação de cancelamento", `# Confirmação de cancelamento
Número da reserva: {reservation_no}

Caro/a {guest_name},

Confirmamos o cancelamento da sua reserva de {arrival} a {departure}.

Taxa de cancelamento: {total}

{notes}

Lamentamos não o receber desta vez e esperamos dar-lhe as boas-vindas em breve.

Com os melhores cumprimentos
{sender}
{hotel_name}`],
willkommen: ["Carta de boas-vindas", `# Bem-vindo/a, {guest_name}!

É um prazer tê-lo connosco. Desejamos-lhe uma estadia agradável no {hotel_name}.

Pequeno-almoço: diariamente das 7:00 às 10:30
Wi-Fi: {wifi}
Receção: disponível 24 horas pelo {hotel_phone}

{notes}

Precisa de alguma coisa? Diga-nos a qualquer momento – teremos todo o gosto em ajudar.

A sua equipa do {hotel_name}`],
angebot: ["Proposta de evento", `# Proposta: {event_title}

Caro/a {guest_name},

Obrigado pelo seu pedido. Temos o prazer de lhe apresentar a seguinte proposta:

Data: {event_date}, {event_time}
Sala: {event_room}
Pessoas: {guests}

{items}

Total: {offer_total}

{notes}

Esta proposta é válida até {valid_until}. Aguardamos o seu contacto.

Com os melhores cumprimentos
{sender}
{hotel_name}`],
veranstaltung: ["Confirmação de evento", `# Confirmação: {event_title}

Caro/a {guest_name},

Confirmamos o seu evento:

Data: {event_date}, {event_time}
Sala: {event_room}
Pessoas: {guests}

{items}

Total: {offer_total}

{notes}

Por favor, indique-nos o número final de participantes até 3 dias antes. Será um prazer recebê-los.

Com os melhores cumprimentos
{sender}
{hotel_name}`],
gutschein: ["Vale de oferta", `# Vale de oferta

no valor de {voucher_value}

para {guest_name}

Válido no {hotel_name} para estadias, restaurante e spa.
Código: {voucher_code}
Válido até: {valid_until}

Emitido a {today}`],
},
tr: {
reservierung: ["Rezervasyon onayı", `# Rezervasyon onayı
Rezervasyon numarası: {reservation_no}

Sayın {guest_name},

Rezervasyonunuz için teşekkür ederiz. Konaklamanızı memnuniyetle onaylıyoruz:

Giriş: {arrival}
Çıkış: {departure} ({nights} gece)
Oda: {room_type}
Oda numarası: {room_no}
Kişi sayısı: {persons}
Pansiyon: {board}
Gecelik fiyat: {rate}
Toplam fiyat: {total}
Ödeme: {payment}

{notes}

Giriş saat 15:00'ten itibaren, çıkış saat 11:00'e kadardır. Her türlü soru ve isteğiniz için hizmetinizdeyiz.

Sizi ağırlamayı dört gözle bekliyoruz!

Saygılarımızla
{sender}
{hotel_name}`],
storno: ["İptal onayı", `# İptal onayı
Rezervasyon numarası: {reservation_no}

Sayın {guest_name},

{arrival} – {departure} tarihleri arasındaki rezervasyonunuzun iptalini onaylıyoruz.

İptal ücreti: {total}

{notes}

Bu sefer sizi ağırlayamadığımız için üzgünüz, en kısa zamanda görüşmek dileğiyle.

Saygılarımızla
{sender}
{hotel_name}`],
willkommen: ["Hoş geldiniz mektubu", `# Hoş geldiniz, {guest_name}!

Sizi aramızda görmekten mutluluk duyuyor, {hotel_name} otelinde keyifli bir konaklama diliyoruz.

Kahvaltı: her gün 07:00 – 10:30
Wi-Fi: {wifi}
Resepsiyon: 7/24 {hotel_phone} numarasından ulaşılabilir

{notes}

Bir isteğiniz mi var? Bize her zaman söyleyebilirsiniz – memnuniyetle yardımcı oluruz.

{hotel_name} ekibi`],
angebot: ["Etkinlik teklifi", `# Teklif: {event_title}

Sayın {guest_name},

Talebiniz için teşekkür ederiz. Size aşağıdaki teklifi sunmaktan memnuniyet duyarız:

Tarih: {event_date}, {event_time}
Salon: {event_room}
Kişi sayısı: {guests}

{items}

Toplam tutar: {offer_total}

{notes}

Bu teklif {valid_until} tarihine kadar geçerlidir. Dönüşünüzü bekliyoruz.

Saygılarımızla
{sender}
{hotel_name}`],
veranstaltung: ["Etkinlik onayı", `# Onay: {event_title}

Sayın {guest_name},

Etkinliğinizi kesin olarak onaylıyoruz:

Tarih: {event_date}, {event_time}
Salon: {event_room}
Kişi sayısı: {guests}

{items}

Toplam tutar: {offer_total}

{notes}

Lütfen kesin katılımcı sayısını en geç 3 gün önceden bize bildirin. Ev sahibiniz olmaktan mutluluk duyacağız.

Saygılarımızla
{sender}
{hotel_name}`],
gutschein: ["Hediye çeki", `# Hediye çeki

{voucher_value} değerinde

{guest_name} için

{hotel_name} otelinde konaklama, restoran ve spa için kullanılabilir.
Çek kodu: {voucher_code}
Son geçerlilik: {valid_until}

Düzenlenme tarihi: {today}`],
},
ja: {
reservierung: ["ご予約確認書", `# ご予約確認書
予約番号：{reservation_no}

{guest_name} 様

このたびはご予約いただき誠にありがとうございます。ご宿泊を下記のとおり確認いたしました。

チェックイン日：{arrival}
チェックアウト日：{departure}（{nights}泊）
客室：{room_type}
部屋番号：{room_no}
人数：{persons}
食事：{board}
1泊料金：{rate}
合計料金：{total}
お支払い：{payment}

{notes}

チェックインは15時から、チェックアウトは11時までです。ご質問やご要望がございましたら、いつでもお申し付けください。

ご来館を心よりお待ちしております。

敬具
{sender}
{hotel_name}`],
storno: ["キャンセル確認書", `# キャンセル確認書
予約番号：{reservation_no}

{guest_name} 様

{arrival}から{departure}までのご予約のキャンセルを承りました。

キャンセル料：{total}

{notes}

今回お迎えできず残念ですが、またのお越しを心よりお待ちしております。

敬具
{sender}
{hotel_name}`],
willkommen: ["ウェルカムレター", `# {guest_name} 様、ようこそ！

ご到着を心より歓迎いたします。{hotel_name}でごゆっくりお過ごしください。

朝食：毎日 7:00〜10:30
Wi-Fi：{wifi}
フロント：24時間対応 {hotel_phone}

{notes}

ご要望がございましたら、どうぞお気軽にお申し付けください。

{hotel_name} スタッフ一同`],
angebot: ["イベントお見積り", `# お見積り：{event_title}

{guest_name} 様

お問い合わせいただきありがとうございます。下記のとおりお見積りいたします。

日時：{event_date}、{event_time}
会場：{event_room}
人数：{guests}

{items}

合計：{offer_total}

{notes}

本お見積りの有効期限は{valid_until}です。ご検討のほどよろしくお願いいたします。

敬具
{sender}
{hotel_name}`],
veranstaltung: ["イベント確認書", `# ご確認：{event_title}

{guest_name} 様

下記のとおりイベントを確定いたしました。

日時：{event_date}、{event_time}
会場：{event_room}
人数：{guests}

{items}

合計：{offer_total}

{notes}

最終的なご人数は3日前までにお知らせください。皆様のお越しを心よりお待ちしております。

敬具
{sender}
{hotel_name}`],
gutschein: ["ギフト券", `# ギフト券

{voucher_value} 相当

{guest_name} 様

{hotel_name}のご宿泊・レストラン・スパでご利用いただけます。
コード：{voucher_code}
有効期限：{valid_until}

発行日：{today}`],
},
zh: {
reservierung: ["预订确认函", `# 预订确认函
预订编号：{reservation_no}

尊敬的 {guest_name}：

感谢您的预订，现确认您的住宿如下：

入住：{arrival}
离店：{departure}（{nights} 晚）
房型：{room_type}
房间号：{room_no}
人数：{persons}
餐食：{board}
每晚价格：{rate}
总价：{total}
付款：{payment}

{notes}

入住时间为 15:00 起，退房时间为 11:00 前。如有任何问题或需求，我们随时为您服务。

期待您的光临！

此致
{sender}
{hotel_name}`],
storno: ["取消确认函", `# 取消确认函
预订编号：{reservation_no}

尊敬的 {guest_name}：

我们特此确认取消您 {arrival} 至 {departure} 的预订。

取消费用：{total}

{notes}

很遗憾此次未能接待您，期待不久后再次欢迎您。

此致
{sender}
{hotel_name}`],
willkommen: ["欢迎信", `# 欢迎您，{guest_name}！

很高兴您的到来，祝您在 {hotel_name} 度过愉快的时光。

早餐：每天 7:00 – 10:30
Wi-Fi：{wifi}
前台：全天候服务，电话 {hotel_phone}

{notes}

如有任何需要，请随时告诉我们，我们乐意为您效劳。

{hotel_name} 全体员工`],
angebot: ["活动报价", `# 报价：{event_title}

尊敬的 {guest_name}：

感谢您的咨询，现为您提供以下报价：

日期：{event_date}，{event_time}
场地：{event_room}
人数：{guests}

{items}

总计：{offer_total}

{notes}

本报价有效期至 {valid_until}，期待您的回复。

此致
{sender}
{hotel_name}`],
veranstaltung: ["活动确认函", `# 确认：{event_title}

尊敬的 {guest_name}：

我们正式确认您的活动：

日期：{event_date}，{event_time}
场地：{event_room}
人数：{guests}

{items}

总计：{offer_total}

{notes}

请最晚于活动前 3 天告知最终人数。我们期待为您服务。

此致
{sender}
{hotel_name}`],
gutschein: ["礼券", `# 礼券

价值 {voucher_value}

赠予 {guest_name}

可在 {hotel_name} 用于住宿、餐厅和水疗。
礼券代码：{voucher_code}
有效期至：{valid_until}

开具日期：{today}`],
},
ar: {
reservierung: ["تأكيد الحجز", `# تأكيد الحجز
رقم الحجز: {reservation_no}

عزيزنا {guest_name}،

شكرًا لحجزكم. يسعدنا تأكيد إقامتكم:

الوصول: {arrival}
المغادرة: {departure} ({nights} ليالٍ)
الغرفة: {room_type}
رقم الغرفة: {room_no}
عدد الأشخاص: {persons}
الوجبات: {board}
السعر لليلة: {rate}
السعر الإجمالي: {total}
الدفع: {payment}

{notes}

تسجيل الوصول متاح من الساعة 15:00، والمغادرة حتى الساعة 11:00. نحن في خدمتكم لأي استفسار أو طلب.

نتطلع إلى استقبالكم!

مع أطيب التحيات
{sender}
{hotel_name}`],
storno: ["تأكيد الإلغاء", `# تأكيد الإلغاء
رقم الحجز: {reservation_no}

عزيزنا {guest_name}،

نؤكد لكم إلغاء حجزكم من {arrival} إلى {departure}.

رسوم الإلغاء: {total}

{notes}

يؤسفنا عدم استقبالكم هذه المرة، ونأمل أن نرحب بكم قريبًا.

مع أطيب التحيات
{sender}
{hotel_name}`],
willkommen: ["رسالة ترحيب", `# أهلًا وسهلًا، {guest_name}!

يسعدنا وجودكم معنا ونتمنى لكم إقامة مريحة في {hotel_name}.

الإفطار: يوميًا 7:00 – 10:30
الواي فاي: {wifi}
الاستقبال: متاح على مدار الساعة على الرقم {hotel_phone}

{notes}

هل لديكم أي طلب؟ أخبرونا في أي وقت – يسعدنا مساعدتكم.

فريق {hotel_name}`],
angebot: ["عرض فعالية", `# عرض: {event_title}

عزيزنا {guest_name}،

شكرًا على استفساركم. يسعدنا أن نقدم لكم العرض التالي:

التاريخ: {event_date}، {event_time}
القاعة: {event_room}
عدد الأشخاص: {guests}

{items}

المبلغ الإجمالي: {offer_total}

{notes}

هذا العرض صالح حتى {valid_until}. نتطلع إلى ردكم.

مع أطيب التحيات
{sender}
{hotel_name}`],
veranstaltung: ["تأكيد الفعالية", `# تأكيد: {event_title}

عزيزنا {guest_name}،

نؤكد لكم فعاليتكم:

التاريخ: {event_date}، {event_time}
القاعة: {event_room}
عدد الأشخاص: {guests}

{items}

المبلغ الإجمالي: {offer_total}

{notes}

يرجى إبلاغنا بالعدد النهائي للحضور قبل 3 أيام على الأقل. يسعدنا أن نكون مضيفيكم.

مع أطيب التحيات
{sender}
{hotel_name}`],
gutschein: ["قسيمة هدية", `# قسيمة هدية

بقيمة {voucher_value}

لـ {guest_name}

صالحة في {hotel_name} للإقامة والمطعم والسبا.
رمز القسيمة: {voucher_code}
صالحة حتى: {valid_until}

تاريخ الإصدار: {today}`],
},
};
const ORDER = ["reservierung", "storno", "willkommen", "angebot", "veranstaltung", "gutschein"];
window.builtinDocTemplates = function(lang){
  const t = T[lang] || T.de;
  return ORDER.map(function(k){ return { id: "builtin-" + k, builtin: true, kind: k, name: t[k][0], body: t[k][1] }; });
};
})();
