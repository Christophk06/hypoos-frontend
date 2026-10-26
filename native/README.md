# Ouverture als App für App Store und Play Store

Dieser Ordner enthält eine Capacitor-Hülle: eine kleine native App, die die Live-Seite https://hypoos-frontend.onrender.com in einer WebView zeigt. Stand: 2026-10-24. **Noch nichts davon wurde auf einem Gerät gebaut oder getestet.**

## Inhalt
- `package.json` – Pakete mit festen Versionen (Capacitor 8.5.3, Push-Plugin 8.1.3, Assets 3.0.5, geprüft am 2026-10-24 mit `npm view`; `npm install --dry-run` lief fehlerfrei).
- `capacitor.config.json` – App-ID `app.ouverture.hotel` (**Vorschlag**, siehe unten), Name „Ouverture“, `server.url` auf die Live-Seite, `androidScheme: https`.
- `www/` – Notfallseite „Keine Verbindung“ (`offline.html`, wird bei Ladefehler gezeigt; `index.html` ist identisch).
- `BACKEND-PUSH.md` – Entwurf für nativen Push (FCM/APNs). Noch nicht umgesetzt.

**App-ID:** Sie lässt sich nach der Veröffentlichung nie mehr ändern. `app.ouverture.hotel` setzt voraus, dass dir die Domain `ouverture.hotel` gehört oder du bewusst eine andere wählst (üblich: umgekehrte eigene Domain). Bitte vor dem ersten Build entscheiden und in `capacitor.config.json` anpassen.

## 1. Voraussetzungen
| Ziel | Was du brauchst |
|---|---|
| Android | Windows, Mac oder Linux; Android Studio „Otter“ (2025.2.1) oder neuer; Node.js 22 oder neuer |
| iOS | **Mac** mit Xcode 26 oder neuer, oder ein Cloud-Build-Dienst (Codemagic, Ionic Appflow o. ä.), der auf einem Mac baut. Unter Windows ist ein iOS-Build nicht möglich. |

(Mindestversionen laut Capacitor-8-Dokumentation, am 2026-10-24 per Web-Recherche geprüft. Bitte vor dem Start in der offiziellen Capacitor-Doku gegenprüfen.) Cloud-Dienste brauchen trotzdem dein Apple-Developer-Konto und Signierzertifikate.

## 2. Konten (Kosten, geprüft am 2026-10-24)
- **Apple Developer Program:** 99 USD pro Jahr (laut Apple-Seite „Choosing a Membership“; Preis kann je nach Land in Landeswährung abweichen). Läuft das Abo aus, verschwindet die App aus dem Store. Firmenkonto braucht eine D-U-N-S-Nummer.
- **Google Play Console:** 25 USD einmalig (laut Google-Hilfe). Du brauchst Ausweis und Karte auf deinen Namen. Private Konten, die nach dem 13.11.2023 angelegt wurden, müssen vor der Veröffentlichung einen Test mit mehreren Testern nachweisen; Firmenkonten nicht in gleicher Form. Genaue Anforderungen in der Play Console prüfen.

Die Konten legst du selbst an. Zugangsdaten gehören nicht in diesen Ordner.

## 3. Einrichten (einmalig)
Im Ordner `hypoos-frontend/native/` in einem Terminal:

```
npm install
npx cap add android
npx cap add ios        (nur am Mac)
```
`android/` und `ios/` entstehen neu und gehören nicht ins Hauptrepo, solange nicht entschieden ist, wie ihr sie verwaltet. Empfehlung: eigenes Git-Repo oder eigener Branch.

### Icons und Splash-Screen
Vorhandene Dateien im Frontend: `icon-512.png`, `icon-maskable-512.png`, `icon-192.png`, Hintergrund `#F6F4EF`, Akzent `#1C2430`. Für @capacitor/assets legst du einen Ordner `assets/` an:
- `assets/icon-only.png` (mindestens 1024 x 1024; das 512er-Icon reicht nur zum Testen, besser aus dem Logo-Original neu exportieren)
- `assets/icon-foreground.png` und `assets/icon-background.png` (für Android adaptive Icons; das Maskable-Icon dient als Vorlage)
- `assets/splash.png` (2732 x 2732, Logo mittig) und `assets/splash-dark.png`

Dann `npm run assets`. Das erzeugt alle Größen für Android und iOS.

## 4. Berechtigungstexte (Kamera für Fotos)
Fotos laufen über ein normales Datei-Feld (`<input type="file" accept="image/*" capture>`). Das funktioniert in der WebView meist. Nach `cap add` Folgendes ergänzen:

**iOS, `ios/App/App/Info.plist`** (ohne diese Texte stürzt die App beim Kamerazugriff ab, und Apple lehnt ab):
```xml
<key>NSCameraUsageDescription</key>
<string>Ouverture nutzt die Kamera, um Fotos zu Meldungen, Rundgängen und Dokumenten aufzunehmen.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Ouverture greift auf deine Fotos zu, damit du Bilder an Meldungen und Dokumente anhängen kannst.</string>
```

**Android, `android/app/src/main/AndroidManifest.xml`** (innerhalb `<manifest>`):
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```
`CAMERA` nur ergänzen, wenn ihr später die Kamera direkt (nicht über das Datei-Feld) ansprecht; dann in den Store-Angaben begründen. **Gerätetest nötig:** Prüfe auf echten Geräten, dass „Foto aufnehmen“ aus dem Datei-Feld in beiden Systemen die Kamera öffnet. Falls nicht, ist `@capacitor/camera` die Alternative.

## 5. Bauen
**Android (auch unter Windows):**
```
npx cap sync android
npx cap open android
```
In Android Studio: Build > Generate Signed Bundle (AAB). Den Signierschlüssel (Keystore) sichern und nie verlieren; Passwörter nicht in Dateien im Repo speichern. In der Play Console zuerst „Interner Test“, später Produktion.

**iOS (Mac):**
```
npx cap sync ios
npx cap open ios
```
In Xcode: Team wählen, Bundle Identifier prüfen, Product > Archive > Distribute App > App Store Connect. Dann in TestFlight testen, danach zur Prüfung einreichen.

Weil `server.url` auf die Live-Seite zeigt, kommen Änderungen an Ouverture ohne neuen Store-Build in der App an. Die Hülle muss nur bei neuen Plugins, Icons oder Berechtigungen neu eingereicht werden.

## 6. Apple-Richtlinie 4.2 (Minimum Functionality)
Apple lehnt Apps ab, die nur eine Website in einem Rahmen zeigen („repackaged website“). Die Richtlinie ist nach meinem Wissen in den App Review Guidelines Abschnitt 4.2 zu finden; den aktuellen Wortlaut bitte selbst auf developer.apple.com nachlesen, ich habe ihn hier nicht erneut abgerufen.

**Für Ouverture spricht:**
- Echte Arbeits-App mit Anmeldung und Zwei-Faktor, nicht bloß Marketing.
- Push-Benachrichtigungen (Dienstplan, Meldungen, Notfall), sobald der native Push aus `BACKEND-PUSH.md` umgesetzt ist. **Das ist der wichtigste Punkt: ohne nativen Push besteht die Hülle vermutlich nicht.**
- Kamera für Fotos zu Meldungen und Dokumenten.
- Offline-Verhalten über den Service Worker (`sw.js`) und die Offline-Seite.

**Empfohlene Ergänzungen:**
- Nativer Push funktionsfähig (siehe oben) und im Review-Hinweis erwähnt.
- Biometrische Entsperrung (Face ID/Touch ID) per Plugin.
- Teilen/Öffnen von Dateien (PDF, Word) über das System-Teilen-Menü.
- Sauber gestaltete Offline-Ansicht mit zuletzt geladenen Daten (Dienstplan, Übergabebuch) statt nur „Keine Verbindung“.
- Hinweise für die Prüfer: **Demo-Zugang** in App Store Connect hinterlegen (Demo-Rolle oder Testkonto, vom Betreiber angelegt) inklusive Hinweis zur Zwei-Faktor-Anmeldung, sonst kommt Apple nicht hinein und lehnt ab.
- Abos: Verkauft ihr Abos in der App (Stripe), sind Apples Regeln zu In-App-Käufen (Abschnitt 3.1) zu prüfen. Sicherster Weg: In der iOS-App keine Kaufwege zeigen, Abschluss nur auf der Website, und klären lassen, ob B2B-Ausnahmen greifen. Rechtlich/mit Apple abklären, ich gebe hier keine Gewähr.

## 7. Datenschutz-Angaben im Store (aus Sicht der App abgeleitet)
Das ist ein **Entwurf aus der Funktionsliste**, kein Rechtsrat. Vor dem Ausfüllen mit der Datenschutzerklärung und dem tatsächlichen Backend (Supabase, Stripe, Mailversand, evtl. Mews/Apaleo) abgleichen.

| Datenart | Wird erhoben? | Zweck | Verknüpft mit Person |
|---|---|---|---|
| Name, E-Mail, Telefon (Konto, Mitarbeiter, Gäste) | ja | App-Funktion, Konto | ja |
| Anmeldedaten / Nutzerkennung | ja | Authentifizierung, Zwei-Faktor | ja |
| Arbeitszeiten, Dienstpläne, Urlaub, Krankmeldungen | ja | App-Funktion | ja |
| Fotos (Meldungen, Dokumente, Uploads) | ja, nur wenn der Nutzer sie hochlädt | App-Funktion | ja |
| Dokumente und Inhalte (Übergabebuch, Tickets, Chat) | ja | App-Funktion | ja |
| Zahlungsdaten | nicht in der App; Abrechnung über Stripe auf der Website (prüfen) | Abo | ja |
| Push-Token / Geräte-ID | ja, sobald nativer Push läuft | Benachrichtigungen | ja |
| Standort | nein (nach aktuellem Stand nicht abgefragt, bitte prüfen) | – | – |
| Tracking über andere Apps/Websites | nein (Werbung/Tracking nicht erkennbar, bitte prüfen) | – | – |
| Absturz-/Nutzungsdaten | nur wenn ein Analyse- oder Fehlerdienst eingebunden ist (bisher nicht bekannt) | – | – |

Hinweise:
- Apple „App Privacy“: Daten, die mit der Person verknüpft sind, angeben; „Tracking“ mit Nein beantworten, solange keine Werbe-/Analysedaten weitergegeben werden.
- Google „Data Safety“: Verschlüsselung bei der Übertragung (HTTPS) mit Ja; Möglichkeit, die Löschung zu beantragen, muss vorhanden und beschrieben sein (Konto-/Datenlöschung prüfen und eine Löschungs-URL angeben).
- Beide Stores verlangen eine öffentliche Datenschutz-URL (`rechtliches.html` prüfen, ob sie ausreicht) und eine Support-Adresse.
- Gästedaten und Mitarbeiterdaten sind Daten Dritter. Als Auftragsverarbeiter müssen Hotels einen AV-Vertrag haben; im Store wird die Sicht der App angegeben.

## 8. Reihenfolge-Checkliste für den Betreiber
1. App-ID entscheiden. 2. Apple- und Google-Konto anlegen. 3. Firebase-Projekt und APNs-Key (siehe `BACKEND-PUSH.md`). 4. Push im Backend umsetzen lassen. 5. `npm install`, `cap add`, Assets, Berechtigungstexte. 6. Android-Interner-Test und TestFlight mit echten Geräten. 7. Store-Texte, Screenshots, Datenschutzangaben, Demo-Zugang. 8. Einreichen.
