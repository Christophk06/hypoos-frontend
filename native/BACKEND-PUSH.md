# Push in der nativen Hülle (Vorschlag, noch nichts umgesetzt)

Stand: 2026-10-24. Das ist nur ein Entwurf. `hpoos-backend/push.js` wurde nicht verändert.

## Ausgangslage
- Heute: Web Push mit VAPID (`web-push`), Abos in `push_subscriptions` (`endpoint`, `p256dh`, `auth`, `user_id`). `sendPush(admin, userIds, langs, build)` schreibt zuerst in die Glocke (`notifications`) und sendet dann per `webpush.sendNotification`.
- In der nativen Hülle lädt die WebView die Live-Seite. Web Push funktioniert dort unter iOS nicht (WKWebView in einer App unterstützt es nicht), unter Android nur unzuverlässig. Deshalb braucht die Hülle nativen Push: Android über FCM, iOS über APNs (Apple-Push-Dienst).
- Die Glocke funktioniert in der Hülle weiter, nur das Aufwecken des Handys fehlt.

## Ablauf
1. App (Hülle) fragt Erlaubnis und holt einen Geräte-Token (`@capacitor/push-notifications`: `requestPermissions()`, `register()`, Ereignis `registration`).
2. Die Web-App erkennt die Hülle über `window.Capacitor?.isNativePlatform()` und schickt den Token an das Backend (neue Route).
3. Backend sendet über Firebase Cloud Messaging (FCM HTTP v1). FCM leitet iOS-Nachrichten an APNs weiter. Dafür lädt der Betreiber in Firebase einen APNs-Auth-Key (.p8) hoch.
4. Tippen auf die Nachricht öffnet die App; Ereignis `pushNotificationActionPerformed` navigiert zu `data.url`.

## Datenbank (Migration, vom Betreiber auszuführen)
Zwei Möglichkeiten. Empfehlung: eigene Tabelle, damit die Web-Push-Zeilen unverändert bleiben.

```sql
-- 0xx_native_push_tokens.sql (Entwurf)
create table public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android')),
  lang text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.native_push_tokens enable row level security;
create policy "eigene Tokens" on public.native_push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
select public.ensure_mfa_policies();
```
(Projektregeln beachten: `schema.sql` ergänzen, Test in `tests/schema.test.mjs`, Code erst nach „0xx erledigt“ pushen.)

## Backend-Code (Skizze)
Paket: `firebase-admin` (Version vor Einbau per `npm view firebase-admin version` prüfen und pinnen).

```js
// push.js – Ergänzung (Entwurf)
import admin_fcm from "firebase-admin";
let fcmReady = false;
function initFcm() {
  if (fcmReady) return true;
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON; // Render-Umgebungsvariable, vom Betreiber gesetzt
  if (!raw) return false;
  admin_fcm.initializeApp({ credential: admin_fcm.credential.cert(JSON.parse(raw)) });
  return (fcmReady = true);
}

async function sendNative(admin, ids, langs, build) {
  if (!initFcm()) return 0;
  const { data: toks } = await admin.from("native_push_tokens").select("*").in("user_id", ids);
  let sent = 0;
  for (const t of toks || []) {
    const msg = build(langs[t.user_id] || "de");
    try {
      await admin_fcm.messaging().send({
        token: t.token,
        notification: { title: String(msg.title).slice(0, 120), body: String(msg.body || "").slice(0, 240) },
        data: { url: msg.url || "" },
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });
      sent++;
    } catch (e) {
      if (e.code === "messaging/registration-token-not-registered" || e.code === "messaging/invalid-registration-token")
        await admin.from("native_push_tokens").delete().eq("id", t.id);
      else console.error("[fcm]", e.code || "", e.message);
    }
  }
  return sent;
}
// in sendPush(): nach dem Web-Push-Teil `sent += await sendNative(admin, ids, langs, build);`
// Achtung: der bestehende Code bricht mit `if (!init()) return 0;` früh ab – das muss so umgebaut werden,
// dass native Push auch ohne VAPID-Schlüssel läuft.
```

Neue Routen in `server.js` (angemeldet, MFA-geprüft wie die bestehende Push-Anmeldung):
- `POST /api/push/native` mit `{ token, platform }` speichert oder aktualisiert (upsert auf `token`).
- `DELETE /api/push/native` entfernt das Token (beim Abmelden).

## Frontend (Vorschlag, nicht umgesetzt)
Neuer Bereich in `src/app/NN-native.jsx`. Das Plugin steht in der Hülle zur Verfügung, weil die WebView `window.Capacitor.Plugins.PushNotifications` bereitstellt, wenn die Seite von `server.url` geladen wird (bei Bedarf prüfen; sonst ist ein kleiner Bridge-Import nötig).

```js
const isNative = !!window.Capacitor?.isNativePlatform?.();
if (isNative) {
  const P = window.Capacitor.Plugins.PushNotifications;
  const r = await P.requestPermissions();
  if (r.receive === "granted") {
    await P.register();
    P.addListener("registration", (t) => api("/api/push/native", { method: "POST", body: { token: t.value, platform: window.Capacitor.getPlatform() } }));
    P.addListener("pushNotificationActionPerformed", (a) => { const u = a.notification.data?.url; if (u) location.href = u; });
  }
}
```
Die vorhandene Web-Push-Anmeldung muss in der Hülle ausgeblendet werden (sonst zeigt die Oberfläche „Benachrichtigungen“ doppelt).

## Was der Betreiber einrichten muss
1. Firebase-Projekt anlegen (kostenlos), Android-App `app.ouverture.hotel` registrieren, `google-services.json` herunterladen und in `android/app/` legen.
2. iOS-App in Firebase registrieren, in Apple Developer einen APNs-Auth-Key (.p8) erzeugen und in Firebase hochladen.
3. In Xcode die Fähigkeiten „Push Notifications“ und „Background Modes > Remote notifications“ aktivieren.
4. Dienstkonto-JSON aus Firebase als `FCM_SERVICE_ACCOUNT_JSON` in Render eintragen (nie in Chat, Code oder Repo).

## Ungeprüft
Nichts davon wurde gebaut oder getestet. Insbesondere die Frage, ob `window.Capacitor.Plugins` bei einer von `server.url` geladenen Seite ohne eigenen Bundler verfügbar ist, ist am Gerät zu prüfen.
