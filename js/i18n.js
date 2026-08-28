// ============================================================
// SIIRAH — Phase 1 bilingual (AR/EN) engine.
//
// Loaded with `defer`, placed right before js/script.js (also `defer`) —
// defer scripts run in document order after the DOM is fully parsed but
// BEFORE the DOMContentLoaded event, so this file always finishes applying
// the saved language *before* script.js's scroll-reveal / word-split
// animation setup runs. That ordering matters: script.js splits every <h2>
// into per-word <span>s for its reveal animation by reading textContent
// at setup time, so the correct-language text has to already be in the
// DOM by the time that code executes, not swapped in afterwards.
//
// Mechanism: every translatable element keeps its original Arabic markup
// exactly as authored, plus a `data-en="…"` (or data-en-alt / data-en-
// aria-label / data-en-title / data-en-download / data-en-placeholder)
// attribute holding the English version. On first run this script snap-
// shots the current (Arabic) value of each into a matching data-ar-*
// attribute, then applies whichever language is active. Toggling later
// just swaps between the two snapshots — no re-fetching, no layout
// surprises, and it works identically on every page that loads this file
// (index.html, privacy-policy.html, terms.html).
// ============================================================
(function () {
  'use strict';

  var STORAGE_KEY = 'siirahLang';

  function getSavedLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode etc. — ignore */ }
  }

  // [data attribute holding the English value, DOM property to read/write, snapshot property to stash the Arabic original in]
  var ATTR_MAP = [
    ['en', 'textContent', 'ar'],
    ['enAlt', 'alt', 'arAlt'],                 // data-en-alt      -> alt attribute
    ['enAriaLabel', 'ariaLabel', 'arAriaLabel'], // data-en-aria-label -> aria-label
    ['enTitle', 'title', 'arTitle'],           // data-en-title    -> title attribute
    ['enDownload', 'download', 'arDownload'],  // data-en-download -> download attribute (n/a on non-<a> els, harmless)
    ['enPlaceholder', 'placeholder', 'arPlaceholder'] // data-en-placeholder -> placeholder (future contact/hiring forms)
  ];

  // capture groups once, before any language is applied, so the Arabic
  // original is always the true source-of-truth regardless of which
  // language happens to be active on this load.
  var groups = ATTR_MAP.map(function (entry) {
    var enKey = entry[0];
    var selector = '[data-' + enKey.replace(/([A-Z])/g, '-$1').toLowerCase() + ']';
    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    return { enKey: enKey, prop: entry[1], arKey: entry[2], els: els };
  });

  groups.forEach(function (g) {
    g.els.forEach(function (el) {
      if (el.dataset[g.arKey] === undefined) {
        el.dataset[g.arKey] = (g.prop === 'textContent') ? el.textContent : (el[g.prop] || '');
      }
    });
  });

  function applyLang(lang) {
    var isEn = lang === 'en';
    document.documentElement.lang = isEn ? 'en' : 'ar';
    document.documentElement.dir = isEn ? 'ltr' : 'rtl';
    if (document.body) {
      document.body.classList.toggle('lang-en', isEn);
      document.body.classList.toggle('lang-ar', !isEn);
    }

    groups.forEach(function (g) {
      g.els.forEach(function (el) {
        var enVal = el.dataset[g.enKey];
        var arVal = el.dataset[g.arKey];
        var val = isEn ? enVal : arVal;
        if (val === undefined) return;
        el[g.prop] = val;
      });
    });

    var toggleBtns = document.querySelectorAll('.lang-toggle-btn');
    Array.prototype.forEach.call(toggleBtns, function (btn) {
      btn.textContent = isEn ? 'العربية' : 'English';
      btn.setAttribute('aria-label', isEn ? 'التبديل إلى العربية' : 'التبديل إلى الإنجليزية');
    });

    window.SIIRAH_LANG = isEn ? 'en' : 'ar';
    try {
      document.dispatchEvent(new CustomEvent('siirah:langchange', { detail: { lang: window.SIIRAH_LANG } }));
    } catch (e) { /* very old browsers without CustomEvent — safe to ignore */ }
  }

  window.siirahSetLang = function (lang) {
    saveLang(lang);
    applyLang(lang);
  };
  window.siirahToggleLang = function () {
    var cur = window.SIIRAH_LANG || 'ar';
    window.siirahSetLang(cur === 'ar' ? 'en' : 'ar');
  };

  applyLang(getSavedLang() || 'ar');

  var btns = document.querySelectorAll('.lang-toggle-btn');
  Array.prototype.forEach.call(btns, function (btn) {
    btn.addEventListener('click', window.siirahToggleLang);
  });
})();
