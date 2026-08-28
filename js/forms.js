// ============================================================
// SIIRAH — Phase 9 form engine.
//
// Drives both #projectForm ("ابدأ مشروعك مع سيرة", inside #contact) and
// #careersForm ("انضم إلى فريق سيرة", inside #join). Handles validation,
// drag-and-drop file attachments, bilingual copy (reacting to the
// `siirah:langchange` event dispatched by js/i18n.js), and submission to
// a Google Apps Script Web App that writes to Google Sheets + Drive.
//
// IMPORTANT — before these forms can actually submit anything:
// paste your deployed Apps Script Web App URL into SIIRAH_FORMS_CONFIG
// below. Until then, submissions safely show the "couldn't submit" error
// state (nothing pretends to succeed, nothing is lost — see section 23 of
// the Phase 9 brief). See google-apps-script/Code.gs for the backend and
// its deployment steps.
//
// No credentials/secrets live in this file — the Apps Script Web App URL
// is a public invocation endpoint, not a secret; the actual Sheet/Drive
// access happens entirely inside Apps Script under SIIRAH's own Google
// account.
// ============================================================
window.SIIRAH_FORMS_CONFIG = {
  endpoint: "" // TODO: paste the deployed Apps Script Web App URL here
};

(function () {
  'use strict';

  function isEn() { return (window.SIIRAH_LANG || 'ar') === 'en'; }

  var MSG = {
    required: { ar: 'هذا الحقل مطلوب.', en: 'This field is required.' },
    email: { ar: 'يرجى إدخال بريد إلكتروني صحيح.', en: 'Please enter a valid email address.' },
    phone: { ar: 'يرجى إدخال رقم جوال صحيح.', en: 'Please enter a valid phone number.' },
    number: { ar: 'يرجى إدخال رقم صحيح.', en: 'Please enter a valid number.' },
    url: { ar: 'يرجى إدخال رابط صحيح.', en: 'Please enter a valid link.' },
    services: { ar: 'يرجى اختيار خدمة واحدة على الأقل.', en: 'Please select at least one service.' },
    fileType: { ar: 'نوع الملف غير مدعوم.', en: 'This file type isn’t supported.' },
    fileSize: { ar: 'حجم الملف أكبر من الحد المسموح (15 ميجابايت).', en: 'The file is larger than the allowed limit (15MB).' },
    successTitle: { ar: 'تم استلام طلبك بنجاح.', en: 'Your request has been received successfully.' },
    successDesc: {
      ar: 'سنراجع التفاصيل ونتواصل معك عند الحاجة.',
      en: 'We’ll review the details and contact you if needed.'
    },
    errorTitle: { ar: 'تعذر إرسال الطلب حاليًا.', en: 'We couldn’t submit your request right now.' },
    errorDesc: { ar: 'يرجى المحاولة مرة أخرى.', en: 'Please try again.' }
  };

  function t(key) { return MSG[key] ? (isEn() ? MSG[key].en : MSG[key].ar) : ''; }

  var ICON_WARNING =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 9v4"/><path d="M12 16.5h.01"/>' +
    '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_REMOVE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';

  var MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB per file — keeps the base64 POST payload reasonable
  var MAX_FILES = 6;

  var PHONE_RE = /^(\+?\d{1,3}[\s-]?)?0?\d{8,10}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------------------------------------------------------------
  // Dropzone: manages its own array of File objects (independent from
  // the native <input type="file">'s FileList, which can't be mutated —
  // this lets "remove" work without rebuilding a DataTransfer).
  // ---------------------------------------------------------------
  function createDropzone(zoneEl, listEl, opts) {
    var input = zoneEl.querySelector('.rf-file-input');
    var files = [];

    function render() {
      listEl.innerHTML = '';
      files.forEach(function (file, idx) {
        var chip = document.createElement('span');
        chip.className = 'rf-file-chip';
        var name = document.createElement('span');
        name.className = 'rf-file-chip-name';
        name.textContent = file.name;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = ICON_REMOVE;
        btn.setAttribute('aria-label', isEn() ? 'Remove ' + file.name : 'إزالة ' + file.name);
        btn.addEventListener('click', function () {
          files.splice(idx, 1);
          render();
        });
        chip.appendChild(name);
        chip.appendChild(btn);
        listEl.appendChild(chip);
      });
    }

    function addFiles(fileList) {
      var incoming = Array.prototype.slice.call(fileList);
      incoming.forEach(function (file) {
        if (files.length >= MAX_FILES) return;
        var ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
        if (opts.accept && opts.accept.indexOf(ext) === -1) return;
        if (file.size > MAX_FILE_BYTES) return;
        var dup = files.some(function (f) { return f.name === file.name && f.size === file.size; });
        if (!dup) files.push(file);
      });
      render();
    }

    zoneEl.addEventListener('click', function () { input.click(); });
    zoneEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('click', function (e) { e.stopPropagation(); });
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });

    ['dragenter', 'dragover'].forEach(function (evt) {
      zoneEl.addEventListener(evt, function (e) {
        e.preventDefault(); e.stopPropagation();
        zoneEl.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      zoneEl.addEventListener(evt, function (e) {
        e.preventDefault(); e.stopPropagation();
        zoneEl.classList.remove('is-dragover');
      });
    });
    zoneEl.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    return {
      getFiles: function () { return files.slice(); },
      reset: function () { files = []; render(); }
    };
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result || '';
        var comma = result.indexOf(',');
        resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', data: result.slice(comma + 1) });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------
  // Field-level error UI helpers
  // ---------------------------------------------------------------
  function setFieldError(fieldEl, errEl, msgKey) {
    fieldEl.classList.add('is-invalid');
    errEl.dataset.msgKey = msgKey;
    errEl.innerHTML = ICON_WARNING + '<span>' + t(msgKey) + '</span>';
  }
  function clearFieldError(fieldEl, errEl) {
    fieldEl.classList.remove('is-invalid');
    delete errEl.dataset.msgKey;
    errEl.innerHTML = '';
  }

  // ---------------------------------------------------------------
  // Generic controller shared by both forms
  // ---------------------------------------------------------------
  function initForm(config) {
    var form = document.getElementById(config.formId);
    if (!form) return;

    var submitBtn = form.querySelector('.rf-submit');
    var statusEl = document.getElementById(config.statusId);
    var statusIcon = statusEl.querySelector('.form-status-icon');
    var statusTitle = statusEl.querySelector('.form-status-title');
    var statusDesc = statusEl.querySelector('.form-status-desc');
    var statusClose = statusEl.querySelector('.form-status-close');
    var honeypot = form.querySelector('.rf-honeypot input');

    var dropzones = {};
    (config.dropzones || []).forEach(function (dz) {
      var zoneEl = document.getElementById(dz.zoneId);
      var listEl = document.getElementById(dz.listId);
      if (zoneEl && listEl) dropzones[dz.field] = createDropzone(zoneEl, listEl, { accept: dz.accept });
    });

    // chip (checkbox) visual state
    form.querySelectorAll('.rf-chip input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        cb.closest('.rf-chip').classList.toggle('is-checked', cb.checked);
      });
    });

    // "other" position field toggle (careers form only, harmless no-op elsewhere)
    var positionSelect = form.querySelector('#jf-position');
    var positionOtherWrap = document.getElementById('jf-position-other-wrap');
    if (positionSelect && positionOtherWrap) {
      positionSelect.addEventListener('change', function () {
        var show = positionSelect.value === 'other';
        positionOtherWrap.hidden = !show;
        if (!show) {
          var otherInput = document.getElementById('jf-position-other');
          if (otherInput) otherInput.value = '';
        }
      });
    }

    function validators() { return config.fields; }

    function runValidation() {
      var firstInvalid = null;
      var ok = true;

      validators().forEach(function (f) {
        var el = document.getElementById(f.id);
        var errEl = document.getElementById(f.id + '-err');
        if (!el || !errEl) return;
        var fieldWrap = el.closest('.rf-field') || el.closest('.rf-fieldset');
        var value = (el.value || '').trim();
        var problem = null;

        if (f.required && !value) problem = 'required';
        else if (value && f.type === 'email' && !EMAIL_RE.test(value)) problem = 'email';
        else if (value && f.type === 'tel' && !PHONE_RE.test(value.replace(/[\s-]/g, ''))) problem = 'phone';
        else if (value && f.type === 'number' && isNaN(Number(value))) problem = 'number';

        if (problem) {
          setFieldError(fieldWrap, errEl, problem);
          if (!firstInvalid) firstInvalid = el;
          ok = false;
        } else {
          clearFieldError(fieldWrap, errEl);
        }
      });

      // "other" position requires its free-text companion once revealed
      var posSelect = document.getElementById('jf-position');
      if (posSelect && posSelect.value === 'other') {
        var otherEl = document.getElementById('jf-position-other');
        var otherErr = document.getElementById('jf-position-other-err');
        var otherWrap = otherEl && otherEl.closest('.rf-field');
        if (otherEl && otherErr && otherWrap && !otherEl.value.trim()) {
          setFieldError(otherWrap, otherErr, 'required');
          if (!firstInvalid) firstInvalid = otherEl;
          ok = false;
        } else if (otherWrap) {
          clearFieldError(otherWrap, otherErr);
        }
      }

      // services multi-select (project form only)
      if (config.servicesRequired) {
        var group = form.querySelector('.rf-fieldset');
        var checked = form.querySelectorAll('input[name="services"]:checked');
        var errEl = document.getElementById('pf-services-err');
        if (group && errEl) {
          if (checked.length === 0) {
            setFieldError(group, errEl, 'services');
            if (!firstInvalid) firstInvalid = group.querySelector('input[type="checkbox"]');
            ok = false;
          } else {
            clearFieldError(group, errEl);
          }
        }
      }

      if (firstInvalid) firstInvalid.focus();
      return ok;
    }

    // clear a field's error state as the user fixes it
    form.addEventListener('input', function (e) {
      var fieldWrap = e.target.closest('.rf-field');
      if (fieldWrap && fieldWrap.classList.contains('is-invalid')) {
        var errEl = fieldWrap.querySelector('.rf-err');
        if (errEl) clearFieldError(fieldWrap, errEl);
      }
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'services') {
        var group = form.querySelector('.rf-fieldset');
        if (group && group.classList.contains('is-invalid') && form.querySelectorAll('input[name="services"]:checked').length) {
          clearFieldError(group, document.getElementById('pf-services-err'));
        }
      }
    });

    function showStatus(kind) {
      statusEl.classList.remove('is-error');
      if (kind === 'error') statusEl.classList.add('is-error');
      statusIcon.innerHTML = kind === 'error' ? ICON_WARNING : ICON_CHECK;
      statusTitle.textContent = t(kind === 'error' ? 'errorTitle' : 'successTitle');
      statusDesc.textContent = t(kind === 'error' ? 'errorDesc' : 'successDesc');
      statusEl.dataset.kind = kind;
      statusEl.classList.add('is-visible');
    }
    function hideStatus() {
      statusEl.classList.remove('is-visible');
    }

    if (statusClose) {
      statusClose.addEventListener('click', hideStatus);
    }

    // keep visible status text correct if the visitor switches language mid-message
    document.addEventListener('siirah:langchange', function () {
      if (statusEl.classList.contains('is-visible')) {
        var kind = statusEl.dataset.kind || 'success';
        statusTitle.textContent = t(kind === 'error' ? 'errorTitle' : 'successTitle');
        statusDesc.textContent = t(kind === 'error' ? 'errorDesc' : 'successDesc');
      }
      form.querySelectorAll('.rf-err[data-msg-key]').forEach(function (errEl) {
        errEl.innerHTML = ICON_WARNING + '<span>' + t(errEl.dataset.msgKey) + '</span>';
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideStatus();

      // honeypot — a real visitor never fills or even sees this field
      if (honeypot && honeypot.value) {
        form.reset();
        showStatus('success');
        return;
      }

      if (!runValidation()) return;

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      var payload = { formType: config.formType, submittedAt: new Date().toISOString() };
      config.fields.forEach(function (f) {
        var el = document.getElementById(f.id);
        if (!el) { payload[f.key] = ''; return; }
        // For <select> fields, record the Arabic label (i18n.js snapshots
        // each <option>'s original Arabic text into data-ar) rather than
        // the internal value= slug, so the Sheet reads clearly regardless
        // of which language the visitor had the page in when they submitted.
        if (el.tagName === 'SELECT') {
          var opt = el.options[el.selectedIndex];
          payload[f.key] = opt ? (opt.dataset.ar || opt.textContent || '').trim() : '';
        } else {
          payload[f.key] = el.value.trim();
        }
      });
      if (config.extraFields) {
        config.extraFields.forEach(function (f) {
          var el = document.getElementById(f.id);
          payload[f.key] = el ? el.value.trim() : '';
        });
      }
      if (config.servicesRequired) {
        payload.services = Array.prototype.map.call(
          form.querySelectorAll('input[name="services"]:checked'),
          function (cb) { return cb.value; }
        );
      }

      var fileReads = [];
      Object.keys(dropzones).forEach(function (field) {
        var files = dropzones[field].getFiles();
        if (!files.length) return;
        fileReads.push(
          Promise.all(files.map(fileToBase64)).then(function (encoded) {
            payload[field] = encoded;
          })
        );
      });

      Promise.all(fileReads)
        .then(function () {
          var endpoint = (window.SIIRAH_FORMS_CONFIG || {}).endpoint;
          if (!endpoint) return Promise.reject(new Error('no-endpoint-configured'));
          // Plain-text body (no explicit Content-Type) avoids a CORS
          // preflight OPTIONS request, which Apps Script Web Apps don't
          // handle — see google-apps-script/Code.gs (doPost parses
          // e.postData.contents as JSON).
          return fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
            .then(function (res) { return res.json(); });
        })
        .then(function (result) {
          if (result && result.status === 'success') {
            form.reset();
            Object.keys(dropzones).forEach(function (f) { dropzones[f].reset(); });
            form.querySelectorAll('.rf-chip.is-checked').forEach(function (c) { c.classList.remove('is-checked'); });
            if (positionOtherWrap) positionOtherWrap.hidden = true;
            showStatus('success');
          } else {
            showStatus('error');
          }
        })
        .catch(function () {
          showStatus('error');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
        });
    });
  }

  function boot() {
    initForm({
      formId: 'projectForm',
      statusId: 'projectStatus',
      formType: 'project',
      servicesRequired: true,
      dropzones: [{ field: 'files', zoneId: 'pf-files-dropzone', listId: 'pf-files-list', accept: ['.pdf', '.jpg', '.jpeg', '.png', '.zip', '.doc', '.docx'] }],
      fields: [
        { id: 'pf-name', key: 'name', required: true },
        { id: 'pf-company', key: 'company' },
        { id: 'pf-email', key: 'email', required: true, type: 'email' },
        { id: 'pf-phone', key: 'phone', required: true, type: 'tel' },
        { id: 'pf-project-name', key: 'projectName', required: true },
        { id: 'pf-project-type', key: 'projectType', required: true },
        { id: 'pf-budget', key: 'budget' },
        { id: 'pf-date', key: 'requestedDate' },
        { id: 'pf-siteurl', key: 'website' },
        { id: 'pf-social', key: 'socialLinks' },
        { id: 'pf-details', key: 'details', required: true },
        { id: 'pf-notes', key: 'notes' },
        { id: 'pf-reference', key: 'referenceLink' }
      ]
    });

    initForm({
      formId: 'careersForm',
      statusId: 'careersStatus',
      formType: 'careers',
      dropzones: [{ field: 'cv', zoneId: 'jf-cv-dropzone', listId: 'jf-cv-list', accept: ['.pdf', '.doc', '.docx'] }],
      fields: [
        { id: 'jf-name', key: 'name', required: true },
        { id: 'jf-email', key: 'email', required: true, type: 'email' },
        { id: 'jf-phone', key: 'phone', required: true, type: 'tel' },
        { id: 'jf-gender', key: 'gender' },
        { id: 'jf-birthyear', key: 'birthYear', type: 'number' },
        { id: 'jf-field', key: 'field', required: true },
        { id: 'jf-position', key: 'position', required: true },
        { id: 'jf-position-other', key: 'positionOther' },
        { id: 'jf-experience', key: 'experience', required: true, type: 'number' },
        { id: 'jf-bio', key: 'bio', required: true },
        { id: 'jf-portfolio', key: 'portfolio', required: true }
      ]
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
