// Impressum und Datenschutz des Hotels auf allen öffentlichen Gästeseiten.
// Liest „hotel.legal“ aus den Antworten von /api/public/… mit und hängt eine Fußzeile an.
(function () {
  "use strict";
  var L = {
    de: ["Impressum", "Datenschutz"], en: ["Legal notice", "Privacy"], fr: ["Mentions légales", "Confidentialité"],
    it: ["Note legali", "Privacy"], es: ["Aviso legal", "Privacidad"], pt: ["Aviso legal", "Privacidade"],
    tr: ["Künye", "Gizlilik"], ja: ["運営者情報", "プライバシー"], zh: ["法律声明", "隐私"], ar: ["بيانات قانونية", "الخصوصية"]
  };
  var legal = null, el = null;
  function lang() {
    var l = String(document.documentElement.lang || navigator.language || "de").slice(0, 2).toLowerCase();
    return L[l] ? l : "en";
  }
  function safe(u) { return typeof u === "string" && /^https:\/\/[^\s<>"'`]+$/i.test(u) ? u : null; }
  function link(href, text) {
    var a = document.createElement("a");
    a.href = href; a.textContent = text; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.style.color = "inherit";
    return a;
  }
  function render() {
    if (!legal || !document.body) return;
    var imp = safe(legal.imprint), pri = safe(legal.privacy);
    if (!imp && !pri) return;
    if (!el) {
      el = document.createElement("footer");
      el.className = "ouv-legal";
      el.style.cssText = "text-align:center;font-size:12px;opacity:.75;padding:12px 16px 24px;";
      document.body.appendChild(el);
    }
    var t = L[lang()];
    el.textContent = "";
    if (imp) el.appendChild(link(imp, t[0]));
    if (imp && pri) el.appendChild(document.createTextNode(" · "));
    if (pri) el.appendChild(link(pri, t[1]));
  }
  var orig = window.fetch;
  if (orig) {
    window.fetch = function (input) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var p = orig.apply(this, arguments);
      if (url.indexOf("/api/public/") < 0) return p;
      return p.then(function (res) {
        try {
          res.clone().json().then(function (d) {
            if (d && d.hotel && d.hotel.legal) { legal = d.hotel.legal; render(); }
          }).catch(function () {});
        } catch (e) {}
        return res;
      });
    };
  }
  // Sprachwechsel auf der Seite: Beschriftung anpassen
  if (window.MutationObserver) {
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
})();
