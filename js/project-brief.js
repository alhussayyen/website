// ============================================================
// SIIRAH — Phase 10: Project Brief wizard engine.
//
// Drives #pbForm on project-brief.html: 6-step navigation, per-step
// validation with inline (non-alert) field errors, a multi-file
// drag-and-drop uploader, a read-only review screen built from live
// field values, and submission to the same Google Apps Script Web
// App the Phase 9 forms use (window.SIIRAH_FORMS_ENDPOINT, set in
// js/config.js). The backend dispatches on `type`, so this reuses that
// one deployment ("project-brief" alongside "project" and "career") —
// nothing new to configure beyond what the other two forms already need.
//
// No Google credential of any kind lives here — same as forms.js/
// script.js, the endpoint is a public invocation URL, not a secret.
// ============================================================
(function () {
  'use strict';

  function isEn() { return (window.SIIRAH_LANG || 'ar') === 'en'; }
  function t(ar, en) { return isEn() ? en : ar; }

  var TOTAL_STEPS = 6;
  var STEP_LABELS = [
    { ar: 'العميل', en: 'Client' },
    { ar: 'المشروع', en: 'Project' },
    { ar: 'الإبداع', en: 'Creative' },
    { ar: 'المحتوى', en: 'Content' },
    { ar: 'الملفات', en: 'Files' },
    { ar: 'المراجعة والإرسال', en: 'Review & Submit' }
  ];

  var MSG = {
    required: { ar: 'هذا الحقل مطلوب.', en: 'This field is required.' },
    email: { ar: 'يرجى إدخال بريد إلكتروني صحيح.', en: 'Please enter a valid email address.' },
    phone: { ar: 'يرجى إدخال رقم جوال صحيح.', en: 'Please enter a valid phone number.' },
    url: { ar: 'يرجى إدخال رابط صحيح.', en: 'Please enter a valid link.' },
    services: { ar: 'يرجى اختيار خدمة واحدة على الأقل.', en: 'Please select at least one service.' },
    reviewEmpty: { ar: '—', en: '—' },
    filesEmpty: { ar: 'لم تُرفق أي ملفات.', en: 'No files attached.' },
    errorTitle: { ar: 'تعذر إرسال تفاصيل المشروع حاليًا.', en: 'We couldn’t submit your project brief right now.' },
    errorNoEndpoint: { ar: 'النموذج غير مربوط بعد بخدمة الاستقبال. يرجى إبلاغ فريق سيرة.', en: 'This form isn’t connected to a receiving service yet. Please let the SIIRAH team know.' },
    errorGeneric: { ar: 'حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.', en: 'Something went wrong while sending. Please try again.' },
    removeFile: { ar: 'إزالة الملف', en: 'Remove file' },
    edit: { ar: 'تعديل', en: 'Edit' }
  };
  function m(key) { return MSG[key] ? t(MSG[key].ar, MSG[key].en) : ''; }

  var ICON_WARNING =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 9v4"/><path d="M12 16.5h.01"/>' +
    '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';
  var ICON_REMOVE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^(\+?\d{1,3}[\s-]?)?0?\d{8,10}$/;
  var ACCEPT_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.doc', '.docx', '.zip'];
  var MAX_FILES = 12;

  function maxFileBytes() { return (window.SIIRAH_FORMS_MAX_FILE_MB || 15) * 1024 * 1024; }

  function isUrlValid(v) {
    var s = String(v || '').trim();
    if (!s) return true;
    try { var u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch (e) { return false; }
  }
  function humanSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function boot() {
    var form = document.getElementById('pbForm');
    if (!form) return;

    var main = document.querySelector('.pb-main');
    var steps = Array.prototype.slice.call(form.querySelectorAll('.pb-step'));
    var current = 1;

    var progressFill = document.getElementById('pbProgressFill');
    var stepCurrentEl = document.getElementById('pbStepCurrent');
    var stepLabelEl = document.getElementById('pbStepLabel');

    var successScreen = document.getElementById('pbSuccess');
    var successIdWrap = document.getElementById('pbSuccessId');
    var successIdValue = document.getElementById('pbSuccessIdValue');

    var statusEl = document.getElementById('pbStatus');
    var submitBtn = document.getElementById('pbSubmitBtn');
    var honeypot = document.getElementById('pbHp');

    // ------------------------------------------------------------
    // Field-level required config, grouped by step. `type` drives
    // extra format validation beyond "has a value".
    // ------------------------------------------------------------
    var STEP_FIELDS = {
      1: [
        { id: 'pbName', key: 'name', required: true },
        { id: 'pbCompany', key: 'company', required: true },
        { id: 'pbEmail', key: 'email', required: true, type: 'email' },
        { id: 'pbPhone', key: 'phone', required: true, type: 'tel' },
        { id: 'pbPosition', key: 'position' },
        { id: 'pbWebsite', key: 'website', type: 'url' },
        { id: 'pbSocial', key: 'socialLinks' }
      ],
      2: [
        { id: 'pbProjectName', key: 'projectName', required: true },
        { id: 'pbProjectType', key: 'projectType', required: true },
        { id: 'pbAudience', key: 'targetAudience' },
        { id: 'pbDeadline', key: 'deadline' },
        { id: 'pbLocation', key: 'location' },
        { id: 'pbBudget', key: 'budget' },
        { id: 'pbProjectId', key: 'projectId' },
        { id: 'pbDescription', key: 'description', required: true },
        { id: 'pbGoal', key: 'goal', required: true },
        { id: 'pbDeliverables', key: 'deliverables', required: true }
      ],
      3: [
        { id: 'pbMainIdea', key: 'mainIdea' },
        { id: 'pbMessage', key: 'message' },
        { id: 'pbVisualIdentity', key: 'visualIdentity' },
        { id: 'pbColors', key: 'colors' },
        { id: 'pbStyle', key: 'style' },
        { id: 'pbReferences', key: 'visualReferences' },
        { id: 'pbAvoid', key: 'thingsToAvoid' }
      ],
      4: [
        { id: 'pbTexts', key: 'textsNeeded' },
        { id: 'pbLogos', key: 'logos' },
        { id: 'pbImages', key: 'images' },
        { id: 'pbVideos', key: 'videos' },
        { id: 'pbContentRefs', key: 'contentReferences' },
        { id: 'pbFilesNeeded', key: 'filesNeededFromClient' },
        { id: 'pbAdditionalInfo', key: 'additionalInfo' }
      ],
      5: [],
      6: []
    };
    var ALL_FIELDS = [].concat(STEP_FIELDS[1], STEP_FIELDS[2], STEP_FIELDS[3], STEP_FIELDS[4]);

    // Bilingual labels for the review screen (dt text) — kept next to
    // STEP_FIELDS so every field has both a validator and a review label.
    var LABELS = {
      name: { ar: 'الاسم', en: 'Name' },
      company: { ar: 'اسم الشركة / المؤسسة', en: 'Company / Organization' },
      email: { ar: 'البريد الإلكتروني', en: 'Email' },
      phone: { ar: 'رقم الجوال', en: 'Mobile Number' },
      position: { ar: 'المسمى الوظيفي', en: 'Job Title' },
      website: { ar: 'رابط الموقع', en: 'Website' },
      socialLinks: { ar: 'روابط الحسابات الرسمية', en: 'Official Social Accounts' },
      projectName: { ar: 'اسم المشروع', en: 'Project Name' },
      projectType: { ar: 'نوع المشروع', en: 'Project Type' },
      targetAudience: { ar: 'الجمهور المستهدف', en: 'Target Audience' },
      deadline: { ar: 'موعد التسليم المطلوب', en: 'Requested Delivery Date' },
      location: { ar: 'مكان التنفيذ', en: 'Execution Location' },
      budget: { ar: 'الميزانية المتفق عليها', en: 'Agreed Budget' },
      projectId: { ar: 'رقم المشروع / Project ID', en: 'Project ID' },
      description: { ar: 'وصف المشروع', en: 'Project Description' },
      goal: { ar: 'الهدف من المشروع', en: 'Project Goal' },
      services: { ar: 'الخدمات المطلوبة', en: 'Services Needed' },
      deliverables: { ar: 'المخرجات المطلوبة', en: 'Deliverables' },
      mainIdea: { ar: 'الفكرة الرئيسية', en: 'Main Idea' },
      message: { ar: 'الرسالة التي نريد إيصالها', en: 'Message We Want to Deliver' },
      visualIdentity: { ar: 'الهوية البصرية', en: 'Visual Identity' },
      colors: { ar: 'الألوان', en: 'Colors' },
      style: { ar: 'الأسلوب المطلوب', en: 'Style' },
      visualReferences: { ar: 'أمثلة أو مراجع بصرية', en: 'Visual Examples or References' },
      thingsToAvoid: { ar: 'أشياء نريد تجنبها', en: 'Things to Avoid' },
      textsNeeded: { ar: 'النصوص المطلوبة', en: 'Copy / Text Needed' },
      logos: { ar: 'الشعارات', en: 'Logos' },
      images: { ar: 'الصور', en: 'Images' },
      videos: { ar: 'الفيديوهات', en: 'Videos' },
      contentReferences: { ar: 'المراجع', en: 'References' },
      filesNeededFromClient: { ar: 'الملفات المطلوبة من العميل', en: 'Files Required From Client' },
      additionalInfo: { ar: 'أي معلومات إضافية', en: 'Additional Information' },
      files: { ar: 'الملفات المرفقة', en: 'Attached Files' }
    };

    // dt keys shown per review group, in display order
    var REVIEW_GROUPS = [
      { title: { ar: 'بيانات العميل', en: 'Client Information' }, step: 1, keys: ['name', 'company', 'email', 'phone', 'position', 'website', 'socialLinks'] },
      { title: { ar: 'تفاصيل المشروع', en: 'Project Details' }, step: 2, keys: ['projectName', 'projectType', 'targetAudience', 'services', 'deliverables', 'deadline', 'location', 'budget', 'projectId', 'description', 'goal'] },
      { title: { ar: 'التوجه الإبداعي', en: 'Creative Direction' }, step: 3, keys: ['mainIdea', 'message', 'visualIdentity', 'colors', 'style', 'visualReferences', 'thingsToAvoid'] },
      { title: { ar: 'المحتوى', en: 'Content' }, step: 4, keys: ['textsNeeded', 'logos', 'images', 'videos', 'contentReferences', 'filesNeededFromClient', 'additionalInfo'] },
      { title: { ar: 'الملفات', en: 'Files' }, step: 5, keys: ['files'] }
    ];

    // ------------------------------------------------------------
    // Services chip group
    // ------------------------------------------------------------
    var servicesGroup = document.getElementById('pbServices');
    var servicesWrap = servicesGroup ? servicesGroup.closest('.pb-field--full') : null;
    var servicesErr = document.getElementById('pbServices-error');
    if (servicesGroup) {
      servicesGroup.querySelectorAll('.pb-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var next = chip.getAttribute('aria-pressed') !== 'true';
          chip.setAttribute('aria-pressed', String(next));
          if (next && servicesWrap && servicesWrap.classList.contains('has-error')) {
            clearFieldError(servicesWrap, servicesErr);
          }
        });
      });
    }
    function getSelectedServices() {
      if (!servicesGroup) return [];
      return Array.prototype.map.call(
        servicesGroup.querySelectorAll('.pb-chip[aria-pressed="true"]'),
        function (chip) { return { value: chip.dataset.value, ar: chip.dataset.valueAr, en: chip.dataset.value }; }
      );
    }

    // ------------------------------------------------------------
    // Field error helpers (mirrors the site's live .form-field/
    // .field-error convention from js/script.js, "pb-" prefixed)
    // ------------------------------------------------------------
    function setFieldError(fieldEl, errEl, msgKey) {
      if (!fieldEl || !errEl) return;
      fieldEl.classList.add('has-error');
      errEl.dataset.msgKey = msgKey;
      errEl.innerHTML = ICON_WARNING + '<span>' + m(msgKey) + '</span>';
      var input = fieldEl.querySelector('input, textarea, select');
      if (input) input.setAttribute('aria-invalid', 'true');
    }
    function clearFieldError(fieldEl, errEl) {
      if (!fieldEl || !errEl) return;
      fieldEl.classList.remove('has-error');
      delete errEl.dataset.msgKey;
      errEl.innerHTML = '';
      var input = fieldEl.querySelector('input, textarea, select');
      if (input) input.removeAttribute('aria-invalid');
    }

    form.addEventListener('input', function (e) {
      var fieldWrap = e.target.closest('.pb-field, .pb-field--full');
      if (fieldWrap && fieldWrap.classList.contains('has-error')) {
        var errEl = fieldWrap.querySelector('.pb-error');
        if (errEl) clearFieldError(fieldWrap, errEl);
      }
    });

    // Re-render any currently visible error text (and step label / review)
    // when the visitor toggles language mid-fill.
    document.addEventListener('siirah:langchange', function () {
      form.querySelectorAll('.pb-error[data-msg-key]').forEach(function (errEl) {
        errEl.innerHTML = ICON_WARNING + '<span>' + m(errEl.dataset.msgKey) + '</span>';
      });
      updateProgress();
      if (current === 6) renderReview();
      form.querySelectorAll('.pb-file-chip-remove').forEach(function (btn) {
        btn.setAttribute('aria-label', m('removeFile') + ' ' + btn.dataset.filename);
      });
      if (statusEl.dataset.kind === 'error') showError(statusEl.dataset.errorKey || 'errorGeneric');
    });

    // ------------------------------------------------------------
    // Per-field validation
    // ------------------------------------------------------------
    function validateField(f) {
      var el = document.getElementById(f.id);
      var errEl = document.getElementById(f.id + '-error');
      if (!el) return true;
      var fieldWrap = el.closest('.pb-field, .pb-field--full');
      var value = (el.value || '').trim();
      var problem = null;

      if (f.required && !value) problem = 'required';
      else if (value && f.type === 'email' && !EMAIL_RE.test(value)) problem = 'email';
      else if (value && f.type === 'tel' && !PHONE_RE.test(value.replace(/[\s-]/g, ''))) problem = 'phone';
      else if (value && f.type === 'url' && !isUrlValid(value)) problem = 'url';

      if (problem) {
        if (errEl) setFieldError(fieldWrap, errEl, problem);
        return false;
      }
      if (errEl) clearFieldError(fieldWrap, errEl);
      return true;
    }

    function validateStep(stepNum) {
      var ok = true;
      var firstInvalid = null;
      (STEP_FIELDS[stepNum] || []).forEach(function (f) {
        if (!validateField(f)) {
          ok = false;
          if (!firstInvalid) firstInvalid = document.getElementById(f.id);
        }
      });
      if (stepNum === 2 && servicesGroup) {
        if (getSelectedServices().length === 0) {
          setFieldError(servicesWrap, servicesErr, 'services');
          ok = false;
          if (!firstInvalid) firstInvalid = servicesGroup.querySelector('.pb-chip');
        } else {
          clearFieldError(servicesWrap, servicesErr);
        }
      }
      if (firstInvalid) firstInvalid.focus();
      return ok;
    }

    function firstInvalidStep() {
      for (var s = 1; s <= 4; s++) {
        var fields = STEP_FIELDS[s] || [];
        for (var i = 0; i < fields.length; i++) {
          var f = fields[i];
          if (!f.required && f.type !== 'url' && f.type !== 'email' && f.type !== 'tel') continue;
          var el = document.getElementById(f.id);
          if (!el) continue;
          var value = (el.value || '').trim();
          if (f.required && !value) return s;
          if (value && f.type === 'email' && !EMAIL_RE.test(value)) return s;
          if (value && f.type === 'tel' && !PHONE_RE.test(value.replace(/[\s-]/g, ''))) return s;
          if (value && f.type === 'url' && !isUrlValid(value)) return s;
        }
        if (s === 2 && servicesGroup && getSelectedServices().length === 0) return s;
      }
      return 0;
    }

    // ------------------------------------------------------------
    // Step navigation
    // ------------------------------------------------------------
    function stepLabel(n) { return t(STEP_LABELS[n - 1].ar, STEP_LABELS[n - 1].en); }

    function updateProgress() {
      progressFill.style.width = (current / TOTAL_STEPS * 100) + '%';
      stepCurrentEl.textContent = String(current).padStart(2, '0');
      stepLabelEl.textContent = stepLabel(current);
    }

    function goToStep(n) {
      current = Math.min(Math.max(n, 1), TOTAL_STEPS);
      steps.forEach(function (s) { s.hidden = Number(s.dataset.step) !== current; });
      updateProgress();
      if (current === 6) renderReview();
      if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var title = document.getElementById('pbStep' + current + 'Title');
      if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
    }

    form.addEventListener('click', function (e) {
      var nextBtn = e.target.closest('[data-next]');
      if (nextBtn) {
        if (validateStep(current)) goToStep(current + 1);
        return;
      }
      var backBtn = e.target.closest('[data-back]');
      if (backBtn) { goToStep(current - 1); return; }
      var editBtn = e.target.closest('.pb-review-edit');
      if (editBtn) { goToStep(Number(editBtn.dataset.gotoStep)); }
    });

    // ------------------------------------------------------------
    // Review screen
    // ------------------------------------------------------------
    function fieldValue(key) {
      var f = ALL_FIELDS.filter(function (x) { return x.key === key; })[0];
      if (!f) return '';
      var el = document.getElementById(f.id);
      return el ? (el.value || '').trim() : '';
    }

    function renderReview() {
      var container = document.getElementById('pbReview');
      container.innerHTML = '';
      REVIEW_GROUPS.forEach(function (group) {
        var groupEl = document.createElement('div');
        groupEl.className = 'pb-review-group';

        var head = document.createElement('div');
        head.className = 'pb-review-head';
        var h3 = document.createElement('h3');
        h3.textContent = t(group.title.ar, group.title.en);
        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'pb-review-edit';
        editBtn.dataset.gotoStep = String(group.step);
        editBtn.textContent = m('edit');
        head.appendChild(h3);
        head.appendChild(editBtn);
        groupEl.appendChild(head);

        var dl = document.createElement('dl');
        dl.className = 'pb-review-rows';

        group.keys.forEach(function (key) {
          var row = document.createElement('div');
          row.className = 'pb-review-row';
          var dt = document.createElement('dt');
          dt.textContent = t(LABELS[key].ar, LABELS[key].en);
          var dd = document.createElement('dd');

          if (key === 'services') {
            var chosen = getSelectedServices();
            dd.textContent = chosen.length
              ? chosen.map(function (s) { return isEn() ? s.en : s.ar; }).join('، ')
              : m('reviewEmpty');
          } else if (key === 'files') {
            var files = dropzone.getFiles();
            dd.textContent = files.length
              ? files.map(function (f) { return f.name + ' (' + humanSize(f.size) + ')'; }).join('\n')
              : m('filesEmpty');
          } else {
            var v = fieldValue(key);
            dd.textContent = v || m('reviewEmpty');
          }
          row.appendChild(dt);
          row.appendChild(dd);
          dl.appendChild(row);
        });

        groupEl.appendChild(dl);
        container.appendChild(groupEl);
      });
    }

    // ------------------------------------------------------------
    // File dropzone (multi-file)
    // ------------------------------------------------------------
    function createDropzone(zoneEl, listEl, inputEl) {
      var files = [];

      function render() {
        listEl.innerHTML = '';
        files.forEach(function (file, idx) {
          var li = document.createElement('li');
          li.className = 'pb-file-chip';

          var info = document.createElement('span');
          info.className = 'pb-file-chip-info';
          var name = document.createElement('span');
          name.className = 'pb-file-chip-name';
          name.textContent = file.name;
          var size = document.createElement('span');
          size.className = 'pb-file-chip-size';
          size.textContent = humanSize(file.size);
          info.appendChild(name);
          info.appendChild(size);

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pb-file-chip-remove';
          btn.dataset.filename = file.name;
          btn.setAttribute('aria-label', m('removeFile') + ' ' + file.name);
          btn.innerHTML = ICON_REMOVE;
          btn.addEventListener('click', function () { files.splice(idx, 1); render(); });

          li.appendChild(info);
          li.appendChild(btn);
          listEl.appendChild(li);
        });
      }

      function addFiles(fileList) {
        Array.prototype.slice.call(fileList).forEach(function (file) {
          if (files.length >= MAX_FILES) return;
          var ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
          if (ACCEPT_EXT.indexOf(ext) === -1) return;
          if (file.size > maxFileBytes()) return;
          var dup = files.some(function (f) { return f.name === file.name && f.size === file.size; });
          if (!dup) files.push(file);
        });
        render();
      }

      zoneEl.addEventListener('click', function () { inputEl.click(); });
      zoneEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputEl.click(); }
      });
      inputEl.addEventListener('click', function (e) { e.stopPropagation(); });
      inputEl.addEventListener('change', function () { addFiles(inputEl.files); inputEl.value = ''; });

      ['dragenter', 'dragover'].forEach(function (evt) {
        zoneEl.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); zoneEl.classList.add('is-dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        zoneEl.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); zoneEl.classList.remove('is-dragover'); });
      });
      zoneEl.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
      });

      return {
        getFiles: function () { return files.slice(); },
        reset: function () { files = []; render(); }
      };
    }

    var dropzone = createDropzone(
      document.getElementById('pbDropzone'),
      document.getElementById('pbFileList'),
      document.getElementById('pbFileInput')
    );

    function fileToBase64(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          var result = String(reader.result || '');
          var comma = result.indexOf(',');
          resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', data: comma >= 0 ? result.slice(comma + 1) : result });
        };
        reader.onerror = function () { reject(reader.error); };
        reader.readAsDataURL(file);
      });
    }

    // ------------------------------------------------------------
    // Status / submit
    // ------------------------------------------------------------
    function showError(key) {
      statusEl.classList.add('is-error');
      statusEl.dataset.kind = 'error';
      statusEl.dataset.errorKey = key;
      statusEl.textContent = m('errorTitle') + ' ' + m(key === 'errorNoEndpoint' ? 'errorNoEndpoint' : 'errorGeneric');
    }
    function clearStatus() {
      statusEl.classList.remove('is-error');
      delete statusEl.dataset.kind;
      delete statusEl.dataset.errorKey;
      statusEl.textContent = '';
    }

    function showSuccess(projectId) {
      form.hidden = true;
      document.querySelector('.pb-progress').hidden = true;
      successScreen.hidden = false;
      if (projectId) {
        successIdValue.textContent = projectId;
        successIdWrap.hidden = false;
      }
      successScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearStatus();

      // honeypot — a real visitor never fills this
      if (honeypot && honeypot.value) {
        showSuccess('');
        return;
      }

      var badStep = firstInvalidStep();
      if (badStep) {
        goToStep(badStep);
        validateStep(badStep);
        return;
      }

      var endpoint = window.SIIRAH_FORMS_ENDPOINT;
      if (!endpoint) { showError('errorNoEndpoint'); return; }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      // Wire field names required by the SIIRAH_FORMS_ENDPOINT Apps Script
      // for a "project-brief" submission. This maps this file's internal
      // field keys (STEP_FIELDS / LABELS / REVIEW_GROUPS above — left
      // untouched, they only drive the step form / validation / review
      // screen DOM) to the exact JSON keys the backend expects. Nothing
      // about the form's fields, order, or UX changes here — only what
      // the outgoing payload calls each value.
      var WIRE_KEY = {
        name: 'clientName',
        company: 'companyName',
        position: 'jobTitle',
        deliverables: 'requiredDeliverables',
        deadline: 'deliveryDate',
        location: 'executionLocation',
        budget: 'agreedBudget',
        description: 'projectDescription',
        goal: 'projectGoal',
        message: 'keyMessage',
        style: 'desiredStyle',
        textsNeeded: 'requiredTexts',
        contentReferences: 'references',
        filesNeededFromClient: 'clientProvidedFiles',
        additionalInfo: 'additionalInformation'
      };

      var payload = {
        type: 'project-brief',
        submittedAt: new Date().toISOString(),
        // No dedicated input for this — it's a section heading (step 3)
        // whose own fields (mainIdea, keyMessage, ...) already have their
        // own columns, same as this project's Code.gs always treated it.
        creativeDirection: ''
      };
      ALL_FIELDS.forEach(function (f) { payload[WIRE_KEY[f.key] || f.key] = fieldValue(f.key); });
      payload.requiredServices = getSelectedServices().map(function (s) { return s.value; });

      var files = dropzone.getFiles();
      Promise.all(files.map(fileToBase64))
        .then(function (encoded) {
          payload.attachedFiles = encoded;
          return fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          // The live endpoint replies {success:true, ...} on success and
          // {success:false, error:'...'} on failure (verified with a real
          // test POST) — not {status:'success', projectId} like the
          // repo's google-apps-script/Code.gs, which isn't what's behind
          // this endpoint. It doesn't return a projectId, so the success
          // screen's project-number line simply stays hidden (it already
          // only shows when a truthy id comes back).
          if (result && result.success) {
            showSuccess(result.projectId || '');
          } else {
            showError('errorGeneric');
          }
        })
        .catch(function () { showError('errorGeneric'); })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
        });
    });

    updateProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
