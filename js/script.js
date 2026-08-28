// ---- preloader (white loading screen, logo + live progress %, shown once per page load) ----
  (function(){
    var pre = document.getElementById('preloader');
    if (!pre) return;
    var navLogoSrc = document.getElementById('navLogo').src;
    // loading screen shows the brand mark; footer keeps the full wordmark logo
    document.getElementById('preloaderLogo').src = 'assets/images/logo-mark.png';
    document.getElementById('footerLogo').src = navLogoSrc;

    var fillEl = document.getElementById('preloaderFill');
    var pctEl = document.getElementById('preloaderPercent');
    var pct = 0;
    var finishing = false;

    function setPct(p){
      pct = Math.min(100, Math.max(pct, p));
      if (fillEl) fillEl.style.transform = 'scaleX(' + (pct / 100) + ')'; // GPU-accelerated fill (transform, not width)
      if (pctEl) pctEl.textContent = pct + '%';
    }

    function dismiss(){
      if (finishing) return;
      finishing = true;
      setPct(100);
      setTimeout(function(){
        pre.classList.add('hide');            // 500ms opacity fade-out (see CSS)
        setTimeout(function(){ pre.remove(); }, 500); // removed for good after the fade
      }, 200);
    }

    // The loading screen animates its progress bar over ~1s so it still
    // reads as an intentional brand moment rather than a flicker — but that
    // 1s is only a cosmetic pace for the progress bar, not a forced minimum
    // wait. Dismissal fires the instant the real page `load` event happens,
    // even if that's well under 1s (fast connections skip straight to the
    // homepage, no artificial delay); on slower connections the bar simply
    // holds at 96% until the real load event arrives — but never past
    // MAX_DURATION below, which hard-caps how long the splash can ever stay
    // on screen regardless of load time.
    var MIN_DURATION = 1000;
    // Hard ceiling: the splash is dismissed the moment the page finishes
    // loading, or after 2s, whichever comes first — same visuals/transition
    // as a normal dismiss (dismiss()'s own `finishing` guard makes it safe
    // to call from both places, so whichever fires first wins and the other
    // becomes a no-op).
    var MAX_DURATION = 2000;
    var pageLoaded = false;

    function tryDismiss(){
      if (pageLoaded) dismiss();
    }

    var steps = 24;
    var stepDur = MIN_DURATION / steps;
    var i = 0;
    (function tick(){
      if (i >= steps) return;
      i++;
      setPct(Math.min(96, Math.round((i / steps) * 100)));
      setTimeout(tick, stepDur);
    })();

    function onLoad(){
      pageLoaded = true;
      tryDismiss();
    }

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    setTimeout(dismiss, MAX_DURATION);
  })();

  // ---- shared background video ----
  const bgVideoSrc = "assets/video/hero-bg.mp4";
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // shared with the services-showcase drift/pin blocks further below, and
  // also used just below to keep the generic GSAP card-stagger reveal off
  // .showcase-item on mobile (where its own dedicated sticky/cross-fade
  // controller owns each item's opacity instead).
  const mqServicesMobile = window.matchMedia('(max-width:760px)');
  ['heroVideo'].forEach(id => {
    const v = document.getElementById(id);
    if (v) {
      v.src = bgVideoSrc;
      if (reduceMotion) { v.pause(); } else { v.play?.().catch(()=>{}); }
    }
  });

  // ---- video production section: click-to-play, exactly one clip active ----
  // Videos sit paused at their poster until explicitly activated. Starting
  // any clip (click, whether HTML5 <video> — the only player type used here)
  // immediately stops/mutes whichever other clip was playing first, so more
  // than one can never play at the same time; clicking the active clip again
  // toggles it off. Scrolling a playing clip out of view also stops it, as a
  // battery/perf safety net (it never auto-starts playback on its own).
  (function(){
    const slots = Array.from(document.querySelectorAll('.video-section .video-slot'));
    if (!slots.length) return;

    let activeSlot = null;

    // brief "play" flash overlay: fades in the instant a clip starts, then
    // fades itself back out on its own after a moment (CSS transition on
    // .is-visible, see style.css) — purely decorative confirmation, separate
    // from the persistent .play-ring button which keeps its own play/pause state.
    function flashPlayIcon(slot){
      const flash = slot.querySelector('.play-flash');
      if (!flash) return;
      clearTimeout(flash._flashTimer);
      flash.classList.remove('is-visible');
      // force reflow so retriggering the class (e.g. rapid clip switching)
      // always restarts the fade cleanly instead of being a no-op
      void flash.offsetWidth;
      flash.classList.add('is-visible');
      flash._flashTimer = setTimeout(()=> flash.classList.remove('is-visible'), 700);
    }

    function stopSlot(slot){
      const video = slot.querySelector('.v-media');
      const btn = slot.querySelector('.play-ring');
      const svgPath = btn?.querySelector('svg path');
      if (!video) return;
      video.pause();
      video.muted = true;
      slot.classList.remove('is-unmuted');
      if (btn){
        btn.setAttribute('aria-pressed', 'false');
        // language-aware label: reads the two data-label-play-*/pause-* variants
        // baked into the markup (see index.html) instead of the old Arabic-only
        // string replace, so it stays correct after an EN/AR toggle (js/i18n.js).
        btn.setAttribute('aria-label', (window.SIIRAH_LANG === 'en') ? (btn.dataset.labelPlayEn || 'Play') : (btn.dataset.labelPlayAr || 'تشغيل'));
      }
      if (svgPath) svgPath.setAttribute('d', 'M8 5.5v13l11-6.5-11-6.5Z');
      if (activeSlot === slot) activeSlot = null;
    }

    slots.forEach(slot=>{
      const video = slot.querySelector('.v-media');
      const btn = slot.querySelector('.play-ring');
      const svgPath = btn?.querySelector('svg path');
      if (!video) return;

      function loadSrc(){
        if (video.src) return;
        const src = video.dataset.src;
        if (src) { video.src = src; video.load(); }
      }

      btn?.addEventListener('click', ()=>{
        const wasActive = activeSlot === slot;

        // enforce exclusivity: stop every other slot before doing anything else
        slots.forEach(other=>{ if (other !== slot) stopSlot(other); });

        if (wasActive){
          stopSlot(slot); // clicking the already-playing clip toggles it off
          return;
        }

        loadSrc();
        video.muted = false;
        slot.classList.add('is-unmuted');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', (window.SIIRAH_LANG === 'en') ? (btn.dataset.labelPauseEn || 'Pause') : (btn.dataset.labelPauseAr || 'إيقاف'));
        if (svgPath) svgPath.setAttribute('d', 'M8 5v14M16 5v14');
        video.play?.().catch(()=>{});
        flashPlayIcon(slot);
        activeSlot = slot;
      });

      const io = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (!entry.isIntersecting && activeSlot === slot) stopSlot(slot);
        });
      }, { threshold:.15 });
      io.observe(slot);
    });
  })();

  // ---- smooth scroll ----
  let __lenis = null;
  if (!reduceMotion && window.Lenis) {
    __lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    function raf(time){ __lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) __lenis.on('scroll', ScrollTrigger.update);
  }

  // ---- mobile nav toggle ----
  (function(){
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('siteNav');
    if (!toggle || !nav) return;

    function closeNav(){
      nav.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', (window.SIIRAH_LANG === 'en') ? (toggle.dataset.labelOpenEn || 'Open menu') : (toggle.dataset.labelOpenAr || 'فتح القائمة'));
      document.body.style.overflow = '';
      __lenis?.start();
    }
    function openNav(){
      nav.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', (window.SIIRAH_LANG === 'en') ? (toggle.dataset.labelCloseEn || 'Close menu') : (toggle.dataset.labelCloseAr || 'إغلاق القائمة'));
      document.body.style.overflow = 'hidden';
      __lenis?.stop();
    }
    toggle.addEventListener('click', () => {
      nav.classList.contains('nav-open') ? closeNav() : openNav();
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) closeNav(); });
  })();

  // ---- "الخدمات" nav link ----
  // Plain <a href="#services">, native fragment navigation, no JS scroll-
  // offset interception needed: the header clearance under "أبرز خدماتنا
  // الإعلامية" is now real padding baked into .services-sticky-inner's own
  // layout (see css/style.css), so the heading sits correctly below the
  // fixed header no matter how #services is reached — clicking this link,
  // a manual scroll, a direct #services URL, or back/forward — without
  // needing a per-click JS-computed offset or scroll-margin-top.

  // ---- nav logo theme (invert over dark sections) ----
  const navLogo = document.getElementById('navLogo');
  function updateNavTheme(){
    const el = document.elementFromPoint(window.innerWidth/2, 40);
    const dark = el?.closest('.hero, .services-showcase, .contact');
    navLogo?.classList.toggle('inverted', !!dark);
  }
  window.addEventListener('scroll', ()=>requestAnimationFrame(updateNavTheme), {passive:true});
  window.addEventListener('resize', updateNavTheme);
  updateNavTheme();

  // ---- custom cursor ----
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx=0,my=0, rx=0, ry=0;
  window.addEventListener('mousemove', e=>{
    mx=e.clientX; my=e.clientY;
    dot.style.left = mx+'px'; dot.style.top = my+'px';
    const dark = document.elementFromPoint(mx,my)?.closest('.hero,.services-showcase,.contact');
    ring.classList.toggle('on-dark', !!dark);
  });
  (function loop(){
    rx += (mx-rx)*0.18; ry += (my-ry)*0.18;
    ring.style.left = rx+'px'; ring.style.top = ry+'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a, button, .pf-dot, .pf-gallery-track, .cl-cell').forEach(el=>{
    el.addEventListener('mouseenter', ()=>ring.classList.add('big'));
    el.addEventListener('mouseleave', ()=>ring.classList.remove('big'));
  });

  // ---- scroll reveals (respects prefers-reduced-motion) ----
  if (!reduceMotion && window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    // iPhone-only scroll shake fix: Safari's address bar collapses/expands
    // as the page scrolls, which fires a `resize` event on window even
    // though the user never actually resized anything. By default
    // ScrollTrigger reacts to that with a refresh(), recalculating every
    // trigger's start/end against the new viewport height mid-scroll —
    // for the scrub-driven animations on this page (hero video parallax,
    // the video-production grid drift right after the "أعمال فوتوغرافية"
    // section, etc.) that recalculation makes the interpolated scroll
    // value jump, which reads as the whole page shaking up/down while
    // scrolling past those sections. This is GSAP's own documented flag
    // for exactly that iOS/Safari address-bar case — it only ever
    // suppresses refreshes caused by that mobile chrome resize, so
    // desktop/tablet resize behavior (and everything else) is untouched.
    ScrollTrigger.config({ ignoreMobileResize: true });
    // clearProps:'transform' after each one-off reveal so CSS :hover transforms
    // (lift/scale on cards, buttons, avatars…) keep working normally afterwards.

    // Every one-shot scroll reveal below pairs its existing motion with a
    // subtle scale:.95 → 1 (transform-only, GPU-accelerated), per the site's
    // "opacity 0→1, scale 0.95→1, once" scroll-reveal standard — capped well
    // under the 1.15 ceiling and cleared back to CSS control once it settles.
    document.querySelectorAll('[data-anim="fade"]').forEach(el=>{
      gsap.fromTo(el, {opacity:0, y:22, scale:.95}, {
        opacity:1, y:0, scale:1, duration:1, ease:'power3.out', clearProps:'transform',
        scrollTrigger:{ trigger:el, start:'top 88%' }
      });
    });

    document.querySelectorAll('[data-anim="line"]').forEach(el=>{
      gsap.fromTo(el, {yPercent:110, opacity:0, scale:.95}, {
        yPercent:0, opacity:1, scale:1, duration:1, ease:'power4.out', clearProps:'transform',
        scrollTrigger:{ trigger:el, start:'top 90%' }
      });
    });

    document.querySelectorAll('[data-anim="rise"]').forEach((el,i)=>{
      gsap.fromTo(el, {opacity:0, y:40, scale:.95}, {
        opacity:1, y:0, scale:1, duration:.9, ease:'power3.out', delay:(i%3)*0.06, clearProps:'transform',
        scrollTrigger:{ trigger:el, start:'top 92%' }
      });
    });

    // ---- Team (Phase 3): editorial "passing through" scroll story ----
    // Distinct from the generic fade/line/rise handlers above: each member
    // glides in from an alternating side on desktop (a felt sense of moving
    // from one person to the next, not three identical fade-ins), and a
    // thin vertical spine draws down the list in sync with scroll to tie
    // the three members into one continuous passage.
    (function(){
      const teamMembers = document.querySelectorAll('#team [data-anim="team"]');
      if (teamMembers.length){
        const teamWide = window.matchMedia('(min-width:761px)').matches;
        teamMembers.forEach((el, i)=>{
          const fromX = teamWide ? (i % 2 === 0 ? -32 : 32) : 0;
          gsap.fromTo(el, {opacity:0, x:fromX, y:26, scale:.97}, {
            opacity:1, x:0, y:0, scale:1, duration:1.05, ease:'power3.out', clearProps:'transform',
            scrollTrigger:{ trigger:el, start:'top 86%' }
          });
          const num = el.querySelector('.member-num');
          if (num){
            gsap.fromTo(num, {opacity:0, scale:.7}, {
              opacity:1, scale:1, duration:.8, ease:'back.out(1.7)', delay:.15, clearProps:'transform,opacity',
              scrollTrigger:{ trigger:el, start:'top 86%' }
            });
          }
        });
      }
      const teamSpine = document.querySelector('#team [data-anim="team-spine"]');
      const teamListEl = document.querySelector('.team-list');
      if (teamSpine && teamListEl){
        gsap.fromTo(teamSpine, {scaleY:0}, {
          scaleY:1, ease:'none',
          scrollTrigger:{ trigger:teamListEl, start:'top 75%', end:'bottom 60%', scrub:.6 }
        });
      }
    })();

    // ---- Clients (Phase 7): whole-grid "arrives together" settle ----
    // On top of each .cl-cell's own one-time [data-anim="rise"] reveal
    // (unchanged, generic handler above), a single subtle scrub-linked
    // opacity/scale tween on the *container* so the mosaic reads as one
    // considered composition assembling as you scroll into it, not ten
    // separate logo animations firing off. transform/opacity only, capped
    // well under the 1.15 scale ceiling, and skipped entirely with the
    // rest of this file when prefers-reduced-motion is on.
    (function(){
      const grid = document.getElementById('clientsGrid');
      if (!grid) return;
      gsap.fromTo(grid, {opacity:.7, scale:.985}, {
        opacity:1, scale:1, ease:'none',
        scrollTrigger:{ trigger:grid, start:'top 95%', end:'top 55%', scrub:.6 }
      });
    })();

    // ---- professional text reveal for section headings (auto word-split) ----
    // Skips the hero mark and any heading already hand-built with .reveal-line spans.
    document.querySelectorAll('h2').forEach(h2=>{
      if (h2.closest('.hero') || h2.querySelector('.reveal-line') || h2.dataset.anim === 'none') return;
      const words = h2.textContent.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return;
      h2.innerHTML = words.map(w =>
        '<span style="display:inline-block;overflow:hidden;vertical-align:top">' +
          '<span style="display:inline-block;will-change:transform">' + w + '</span>' +
        '</span>'
      ).join(' ');
      const inner = h2.querySelectorAll(':scope > span > span');
      gsap.fromTo(inner, {yPercent:112, opacity:0, scale:.95}, {
        yPercent:0, opacity:1, scale:1, duration:.85, ease:'power4.out', stagger:.045, clearProps:'transform',
        scrollTrigger:{ trigger:h2, start:'top 88%' }
      });
    });

    // ---- cards appear in a gentle stagger, section by section ----
    // (client logos use the generic [data-anim="rise"] handler above instead
    // of this group config — same fade+translateY reveal, just applied per
    // element like every other "rise" card on the site)
    [
      { group:'.stats',            items:'.stat',            from:{opacity:0, y:26, scale:.95} },
      // skipped entirely on mobile: below 760px the services section is a
      // sticky/pinned, scroll-stepped single-card cross-fade (see the
      // dedicated controller further down) which owns each .showcase-item's
      // opacity/transform itself — this generic stagger reveal would
      // otherwise force every card to opacity:1 via an inline style the
      // moment the section scrolls into view, breaking the one-at-a-time
      // effect. Desktop is unaffected and keeps this reveal exactly as before.
      ...(mqServicesMobile.matches ? [] : [
        { group:'.services-showcase',items:'.showcase-item',   from:{opacity:0, y:26, scale:.95} }
      ]),
      { group:'.socials',          items:'.icon-btn',        from:{opacity:0, y:16, scale:.95} },
      { group:'.contact-list',     items:'a, .contact-row',  from:{opacity:0, y:14, scale:.95} }
    ].forEach(cfg=>{
      const container = document.querySelector(cfg.group);
      if (!container) return;
      const items = container.querySelectorAll(cfg.items);
      if (!items.length) return;
      gsap.fromTo(items, cfg.from, {
        opacity:1, y:0, scale:1, duration:.8, ease:'power3.out', stagger:.07, clearProps:'transform',
        scrollTrigger:{ trigger:container, start:'top 85%' }
      });
    });

    // ---- statistics numbers: scale 0.9 → 1 with fade as they enter view ----
    // Separate from the plain-JS count-up IntersectionObserver below (which
    // only drives the digits' text content) — this purely handles the visual
    // entrance of the number element itself.
    if (document.querySelector('.stats-grid')){
      gsap.fromTo('.stat .num', {opacity:0, scale:.9}, {
        opacity:1, scale:1, duration:.8, ease:'power3.out', stagger:.08, clearProps:'transform',
        scrollTrigger:{ trigger:'.stats-grid', start:'top 85%' }
      });
    }

    // ---- very light parallax on the hero ----
    gsap.to('#heroVideo', {
      yPercent:8, ease:'none',
      scrollTrigger:{ trigger:'.hero', start:'top top', end:'bottom top', scrub:.6 }
    });
    gsap.to('.hero-inner', {
      yPercent:-6, ease:'none',
      scrollTrigger:{ trigger:'.hero', start:'top top', end:'bottom top', scrub:.6 }
    });

    // (portfolio image drift-on-scroll removed per spec — images stay fully
    // static inside their frame; only the CSS :hover zoom remains.)

    // =========================================================
    // ---- premium scroll-driven scale / parallax / zoom set ----
    // Cinematic, Apple/Linear/Stripe-style treatments: everything below is
    // subtle (small ranges, soft easing), tied to real scroll position, and
    // capped so it never fights the reveals above. Each block guards for the
    // element existing so the script stays safe if a section is edited out.
    // =========================================================

    // ---- hero: soft cinematic zoom-out as the page settles ----
    // The background video starts a touch zoomed-in and eases to its native
    // scale over the first half of the hero, echoing the "intro exhale" used
    // on Apple product pages. Runs on transform only; #heroVideo has no
    // competing hover transform, so no clearProps is needed here.
    gsap.fromTo('#heroVideo', {scale:1.12}, {
      scale:1, ease:'none',
      scrollTrigger:{ trigger:'.hero', start:'top top', end:'60% top', scrub:.6 }
    });

    // (the old grid's portfolio image scroll-scale reveal no longer
    // applies — the photography section is now the accordion/two-column
    // portfolio further down, which drives its own gallery photos'
    // opacity/transform via CSS classes; a generic GSAP reveal here would
    // fight that.)

    // ---- Behind SIIRAH (Phase 6): very light parallax on the large tile ----
    // Same scrub pattern as the video-grid drift just below: transform-only,
    // tied to real scroll position, capped small. Skipped entirely if the
    // section isn't present (still just placeholder tiles pre-real-photos).
    if (document.querySelector('.behind-item--a .behind-placeholder')){
      // Targets the absolutely-positioned inner layer, not the grid cell
      // itself, so the cell's own overflow:hidden clips the drift and it
      // can never visually spill into neighboring grid cells.
      gsap.to('.behind-item--a .behind-placeholder', {
        yPercent:-4, ease:'none',
        scrollTrigger:{ trigger:'.behind-gallery', start:'top bottom', end:'bottom top', scrub:.8 }
      });
    }

    // ---- video production section: pinned-feel zoom + drift on the grid ----
    if (document.querySelector('.video-grid')){
      gsap.fromTo('.video-grid', {scale:.95, opacity:0}, {
        scale:1, opacity:1, duration:1.2, ease:'power3.out', clearProps:'transform',
        scrollTrigger:{ trigger:'.video-section', start:'top 78%' }
      });
      // slow independent drift for depth while the section is in view
      gsap.to('.video-grid', {
        yPercent:-4, ease:'none',
        scrollTrigger:{ trigger:'.video-section', start:'top bottom', end:'bottom top', scrub:.8 }
      });
    }

    // ---- stats: the whole block breathes in with a soft scale ----
    if (document.querySelector('.stats-grid')){
      gsap.fromTo('.stats-grid', {scale:.95, opacity:0}, {
        scale:1, opacity:1, duration:1, ease:'power3.out', clearProps:'transform',
        scrollTrigger:{ trigger:'.stats', start:'top 82%' }
      });
    }

    // ---- "coming soon" panel: soft zoom + blur-in, like a spotlight ----
    document.querySelectorAll('.coming-soon').forEach(el=>{
      gsap.fromTo(el, {scale:.95, opacity:0, filter:'blur(6px)'}, {
        scale:1, opacity:1, filter:'blur(0px)', duration:1.1, ease:'power3.out',
        clearProps:'transform,filter',
        scrollTrigger:{ trigger:el, start:'top 88%' }
      });
    });

    // ---- profile download card: soft scale pop on arrival ----
    document.querySelectorAll('.profile-btn').forEach(btn=>{
      gsap.fromTo(btn, {scale:.95, opacity:0}, {
        scale:1, opacity:1, duration:.9, ease:'back.out(1.6)', clearProps:'transform',
        scrollTrigger:{ trigger:btn, start:'top 92%' }
      });
    });

  } else {
    // reduced motion (or GSAP unavailable): show everything immediately, no movement.
    // Elements hand-built with the .reveal-line pattern start hidden via CSS
    // transform:translateY(110%) as well as opacity:0 — clearing only
    // opacity would leave them permanently clipped by their .reveal
    // parent's overflow:hidden, so reset both.
    document.querySelectorAll('[data-anim]').forEach(el=>{
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

  // ---- magnetic pull + proximity + press scale on the key CTAs (primary
  // download button, social icons, PDF icon) ----
  // Everything here drives only `x`, `y`, `scale` and `rotation` — all
  // transform components, so it stays GPU-accelerated with no width/height
  // or layout changes, capped well under the site's 1.15 max-scale rule.
  if (!reduceMotion && window.gsap && window.matchMedia('(hover:hover)').matches) {
    const targets = Array.from(document.querySelectorAll('.profile-btn, .icon-btn')).map(btn=>{
      const isDownload = btn.classList.contains('icon-btn-download');
      const isPrimary  = btn.classList.contains('profile-btn');
      return {
        el: btn,
        strength: 14,
        hoverScale: isPrimary ? 1.08 : 1.15,   // "الزر الرئيسي" vs social/PDF icons
        pressScale: isPrimary ? .98 : .9,
        rotation: isDownload ? 3 : 0,           // PDF download icon's signature tilt
        xTo: gsap.quickTo(btn, 'x', {duration:.5, ease:'power3.out'}),
        yTo: gsap.quickTo(btn, 'y', {duration:.5, ease:'power3.out'}),
        scaleTo: gsap.quickTo(btn, 'scale', {duration:.4, ease:'power3.out'}),
        rotateTo: gsap.quickTo(btn, 'rotation', {duration:.4, ease:'power3.out'}),
        hovering: false,
        pressed: false
      };
    });

    targets.forEach(t=>{
      t.el.addEventListener('mouseenter', ()=>{
        t.hovering = true;
        t.scaleTo(t.pressed ? t.pressScale : t.hoverScale);
        t.rotateTo(t.rotation);
      });
      t.el.addEventListener('mouseleave', ()=>{
        t.hovering = false; t.pressed = false;
        t.xTo(0); t.yTo(0); t.scaleTo(1); t.rotateTo(0);
      });
      t.el.addEventListener('mousemove', e=>{
        const r = t.el.getBoundingClientRect();
        t.xTo((e.clientX - r.left - r.width/2) / r.width * t.strength);
        t.yTo((e.clientY - r.top - r.height/2) / r.height * t.strength);
      });
      t.el.addEventListener('mousedown', ()=>{ t.pressed = true; t.scaleTo(t.pressScale); });
      t.el.addEventListener('mouseup', ()=>{ t.pressed = false; t.scaleTo(t.hovering ? t.hoverScale : 1); });
    });

    // ---- proximity: a very light scale-toward-1.02 as the cursor nears an
    // important element, before it's actually hovered — the subtle "reach
    // toward the cursor" cue used on Linear/Stripe-style CTAs. Only touches
    // elements that aren't already under direct hover/press control above,
    // and is throttled to one check per animation frame.
    const PROX_RADIUS = 110;
    let proxRaf = null;
    function updateProximity(mx, my){
      targets.forEach(t=>{
        if (t.hovering) return;
        const r = t.el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dist = Math.hypot(mx - cx, my - cy);
        const proximity = Math.max(0, 1 - dist / PROX_RADIUS);
        t.scaleTo(1 + proximity * 0.02);
      });
      proxRaf = null;
    }
    window.addEventListener('mousemove', e=>{
      if (proxRaf) return;
      const mx = e.clientX, my = e.clientY;
      proxRaf = requestAnimationFrame(()=> updateProximity(mx, my));
    }, { passive:true });
  }

  // ---- count up ----
  const counters = document.querySelectorAll('[data-count]');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; io.unobserve(el); return; }
      const dur = 1400;
      const start = performance.now();
      function tick(now){
        const p = Math.min(1, (now-start)/dur);
        const eased = 1 - Math.pow(1-p, 3);
        el.textContent = Math.round(eased*target) + suffix;
        if(p<1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, {threshold:.6});
  counters.forEach(c=>io.observe(c));

  // ---- services showcase: full-width single row, scroll-linked horizontal drift ----
  // Vanilla implementation only (no GSAP/external libs, per spec): the row's
  // horizontal position is driven by CSS transform, updated on a requestAnimationFrame
  // loop that is only active while the section intersects the viewport
  // (IntersectionObserver), so it stays lazy and never runs off-screen.
  // Scrolling down moves the cards left; scrolling up eases them back right;
  // motion is smoothed with a simple lerp so it always feels continuous, never abrupt.
  //
  // Desktop-only: on mobile (<=760px) the services section is instead a
  // sticky, scroll-stepped pin (see the dedicated block further below), so
  // this decorative row-drift is skipped there entirely — it would otherwise
  // fight the single-card cross-fade with its own transform on #svcRow.
  (function(){
    const section = document.querySelector('.services-showcase');
    const row = document.getElementById('svcRow');
    if (reduceMotion || !section || !row) return;

    let current = 0;
    let raf = null;

    function computeTarget(){
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // progress: 0 as the section arrives at the bottom of the viewport,
      // 1 once it has fully passed the top of the viewport.
      let progress = (vh - rect.top) / (vh + rect.height);
      progress = Math.min(1, Math.max(0, progress));
      const amp = Math.min(90, window.innerWidth * 0.05);
      // starts shifted right (+amp), ends shifted left (-amp) as the user scrolls down
      return amp * (1 - 2 * progress);
    }

    function loop(){
      if (mqServicesMobile.matches){
        // mobile: hand full control to the sticky-pin cross-fade below —
        // make sure no leftover horizontal offset lingers on the row.
        if (row.style.transform) row.style.transform = '';
        current = 0;
        raf = requestAnimationFrame(loop);
        return;
      }
      const target = computeTarget();
      current += (target - current) * 0.08;
      row.style.transform = `translateX(${current.toFixed(2)}px)`;
      raf = requestAnimationFrame(loop);
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          if (!raf) raf = requestAnimationFrame(loop);
        } else if (raf){
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { threshold: 0 });
    io.observe(section);
  })();

  // ---- mobile-only: services section as a sticky, SCROLL-DRIVEN (not
  // timer-driven) HORIZONTAL SLIDE showcase ----
  // No buttons, no arrows, no touch-drag/swipe on the row itself, no
  // autoplay/timer of any kind — the ONLY input is the page's normal
  // vertical scroll (the same finger-scroll used everywhere else on the
  // site). targetIndex() is a fractional position (e.g. 1.35 = 35% of the
  // way from card 1 to card 2) recomputed fresh from scroll progress every
  // time; renderedIndex follows it with a per-frame lerp (see LERP below)
  // for a smooth, slightly-weighted feel instead of a raw 1:1 snap to
  // scroll pixels — but it can only ever move TOWARD wherever scroll
  // currently points, and it stops completely (no more rAF requested) the
  // moment it catches up, typically within a few hundred ms of the last
  // scroll event. That's a bounded smoothing tail, not autoplay: verified
  // by leaving the page scrolled mid-transition and idle for several
  // seconds — the frame is identical throughout, nothing advances to a new
  // card on its own. PIN_BUDGET_VH sets how much physical scrolling the
  // full journey across all cards takes (increased — see git history — so
  // a small scroll no longer sweeps past a card almost instantly). Once
  // the user scrolls past the last service the section unpins on its own
  // and the page continues normally — same in reverse past the first
  // service. Fully inert on desktop widths.
  (function(){
    const outer = document.getElementById('svcStickyOuter');
    const items = Array.from(document.querySelectorAll('.services-showcase .showcase-item'));
    if (!outer || !items.length) return;

    let active = false;
    let raf = null;
    let renderedIndex = 0;

    // Fraction of the remaining distance closed per animation frame. Small
    // enough to feel smooth/weighted rather than robotic, but converges
    // within a handful of frames (~300-400ms) of the last scroll input, so
    // it reads as "gentle inertia", never as content moving on its own.
    var LERP = 0.16;
    var SETTLE_EPSILON = 0.0015;

    // Pure function of scroll position — no stored step, no timers.
    function targetIndex(){
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const scrollable = rect.height - vh;
      let progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      progress = Math.min(1, Math.max(0, progress));
      return progress * (items.length - 1);
    }

    function paint(continuousIndex){
      const nearest = Math.round(continuousIndex);
      items.forEach((el, idx) => {
        const delta = idx - continuousIndex; // signed distance from centered, in "card widths"
        el.style.transform = 'translateX(' + (delta * 100) + '%)';
        // Linear cross-fade tied to the same distance, so the outgoing card
        // fades out and the incoming one fades in at exactly the rate the
        // (smoothed) position is moving — never a separate timed fade.
        el.style.opacity = Math.max(0, 1 - Math.abs(delta));
        const on = idx === nearest;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    }

    function tick(){
      raf = null;
      if (!active) return;
      const target = targetIndex();
      renderedIndex += (target - renderedIndex) * LERP;
      if (Math.abs(target - renderedIndex) < SETTLE_EPSILON) renderedIndex = target;
      paint(renderedIndex);
      if (renderedIndex !== target) raf = requestAnimationFrame(tick); // keep converging toward the current scroll target; stops on its own once caught up
    }

    function onScroll(){
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function enable(){
      if (active) return;
      active = true;
      // dvh (not vh) so the spacer's height tracks the browser's actual
      // visible viewport as mobile address/toolbar chrome shows/hides —
      // matches the dvh unit already used for .services-sticky-inner below.
      // PIN_BUDGET_VH is a fixed scroll budget (not scaled per item — see
      // git history), raised from 160 to 280dvh so each card requires a
      // deliberately larger scroll distance to traverse (roughly 60dvh per
      // transition instead of ~20dvh) instead of transitioning on a small
      // scroll nudge.
      // NOTE: css/style.css's four `.svc-snap-point[data-snap-step]` scroll-
      // snap targets are positioned at 0/60/120/180dvh — i.e. hand-derived
      // from this exact value (280) and items.length (4). If either changes,
      // those offsets (and the number of snap points) need updating too.
      var PIN_BUDGET_VH = 280;
      outer.style.height = PIN_BUDGET_VH + 'dvh';
      renderedIndex = targetIndex();
      paint(renderedIndex);
      window.addEventListener('scroll', onScroll, { passive:true });
      window.addEventListener('orientationchange', onScroll);
    }

    function disable(){
      if (!active) return;
      active = false;
      if (raf){ cancelAnimationFrame(raf); raf = null; }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('orientationchange', onScroll);
      outer.style.height = '';
      items.forEach(el => {
        el.classList.remove('is-active');
        el.removeAttribute('aria-hidden');
        el.style.transform = '';
        el.style.opacity = '';
      });
    }

    function sync(){ mqServicesMobile.matches ? enable() : disable(); }
    sync();
    if (mqServicesMobile.addEventListener) mqServicesMobile.addEventListener('change', sync);
    else mqServicesMobile.addListener(sync); // Safari <14 fallback
    window.addEventListener('resize', sync);
  })();

  // ---- Process (Phase 4): "how we work" scroll story ----
  // Deliberately NOT built on GSAP/ScrollTrigger: a single lightweight
  // IntersectionObserver (rootMargin -50% top/bottom shrinks the viewport
  // to a 1px line at dead-center, so a trigger "intersects" exactly when it
  // crosses center) swaps which step is focused; every visual change is a
  // plain CSS transition on opacity/transform, not per-frame JS. Below
  // 761px, or with reduced motion on, or if IntersectionObserver is
  // unsupported, the section is simply left in its default CSS state (see
  // style.css) — a plain static list, already exactly the mobile layout.
  (function(){
    const track = document.getElementById('processTrack');
    const steps = Array.from(document.querySelectorAll('.process-step'));
    const countEl = document.getElementById('processProgressCount');
    const dots = Array.from(document.querySelectorAll('.process-progress-dots i'));
    if (!track || !steps.length || !window.IntersectionObserver) return;

    const mqProcessDesktop = window.matchMedia('(min-width:761px)');
    let observer = null;

    function setActive(idx){
      steps.forEach((el, i)=>{
        el.classList.toggle('is-active', i === idx);
        el.classList.toggle('is-past', i < idx);
        el.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      });
      if (countEl) countEl.textContent = String(idx + 1).padStart(2, '0') + ' / 06';
      dots.forEach((d, i)=>{
        d.classList.toggle('is-active', i === idx);
        d.classList.toggle('is-done', i < idx);
      });
    }

    function enable(){
      if (track.classList.contains('is-pinned')) return;
      track.classList.add('is-pinned');
      setActive(0);
      observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting){
            const idx = parseInt(entry.target.dataset.triggerStep, 10) - 1;
            setActive(idx);
          }
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      track.querySelectorAll('.process-trigger').forEach(m => observer.observe(m));
    }

    function disable(){
      if (!track.classList.contains('is-pinned')) return;
      track.classList.remove('is-pinned');
      if (observer){ observer.disconnect(); observer = null; }
      steps.forEach(el=>{
        el.classList.remove('is-active', 'is-past');
        el.removeAttribute('aria-hidden');
      });
      dots.forEach(d => d.classList.remove('is-active', 'is-done'));
    }

    function syncProcess(){
      if (!reduceMotion && mqProcessDesktop.matches) enable(); else disable();
    }
    syncProcess();
    if (mqProcessDesktop.addEventListener) mqProcessDesktop.addEventListener('change', syncProcess);
    else mqProcessDesktop.addListener(syncProcess); // Safari <14 fallback
    window.addEventListener('resize', syncProcess);
  })();

  // ---- Differentiators (Phase 5): "why SIIRAH" scroll story ----
  // Same lightweight-observer philosophy as Process: no GSAP, no scroll
  // handler. Desktop pins the stage and an IntersectionObserver (rootMargin
  // -50% top/bottom = fires exactly as a trigger crosses dead-center)
  // swaps the active point. Below 761px (or wherever pinning is off) the
  // section stays a plain static list, but still gets a much gentler
  // "in view" emphasis via a second, independent observer, so the mobile
  // experience keeps some interactive feel without ever hiding content.
  (function(){
    const track = document.getElementById('diffTrack');
    const panels = Array.from(document.querySelectorAll('.diff-panel'));
    const indexItems = Array.from(document.querySelectorAll('.diff-index-item'));
    const progressEl = document.getElementById('diffProgress');
    if (!track || !panels.length || !window.IntersectionObserver) return;

    const mqDiffDesktop = window.matchMedia('(min-width:761px)');
    let pinObserver = null;
    let viewObserver = null;

    function setActive(idx){
      panels.forEach((el, i)=>{
        el.classList.toggle('is-active', i === idx);
        el.classList.toggle('is-past', i < idx);
        el.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      });
      indexItems.forEach((el, i)=>{
        el.classList.toggle('is-active', i === idx);
        el.classList.toggle('is-done', i < idx);
      });
      if (progressEl) progressEl.textContent = String(idx + 1).padStart(2, '0') + ' / 04';
    }

    function disableInView(){
      if (!viewObserver) return;
      viewObserver.disconnect();
      viewObserver = null;
      track.classList.remove('has-inview');
      panels.forEach(p => p.classList.remove('is-in-view'));
    }

    function enablePinned(){
      if (track.classList.contains('is-pinned')) return;
      disableInView();
      track.classList.add('is-pinned');
      setActive(0);
      pinObserver = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting){
            const idx = parseInt(entry.target.dataset.triggerStep, 10) - 1;
            setActive(idx);
          }
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      track.querySelectorAll('.diff-trigger').forEach(m => pinObserver.observe(m));
    }

    function disablePinned(){
      if (!track.classList.contains('is-pinned')) return;
      track.classList.remove('is-pinned');
      if (pinObserver){ pinObserver.disconnect(); pinObserver = null; }
      panels.forEach(el=>{
        el.classList.remove('is-active', 'is-past');
        el.removeAttribute('aria-hidden');
      });
      indexItems.forEach(el => el.classList.remove('is-active', 'is-done'));
    }

    function enableInView(){
      if (viewObserver) return;
      track.classList.add('has-inview');
      viewObserver = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          entry.target.classList.toggle('is-in-view', entry.isIntersecting);
        });
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
      panels.forEach(p => viewObserver.observe(p));
    }

    function syncDiff(){
      if (reduceMotion){ disablePinned(); disableInView(); return; }
      if (mqDiffDesktop.matches){ enablePinned(); }
      else { disablePinned(); enableInView(); }
    }
    syncDiff();
    if (mqDiffDesktop.addEventListener) mqDiffDesktop.addEventListener('change', syncDiff);
    else mqDiffDesktop.addListener(syncDiff); // Safari <14 fallback
    window.addEventListener('resize', syncDiff);
  })();

  // ---- clients: static logo grid (Phase 11 note: this comment previously
  // described an infinite marquee/.logo-marquee-track — that was replaced
  // by the current .cl-cell grid in an earlier phase and the comment was
  // never updated; correcting it here, no behavior change). The grid's
  // entrance is the generic [data-anim="rise"] handler on each .cl-cell
  // above, plus the whole-grid scrub settle a few dozen lines up in this
  // same file ("Clients (Phase 7): whole-grid 'arrives together' settle").
  // Hover state (lift + de-saturate-to-color) is pure CSS, see .cl-cell in
  // style.css. Nothing to wire up here.

  // ---- work/photography portfolio: mobile single-open accordion + desktop
  // permanent two-column switcher, each service's 3-photo gallery being an
  // independent swipeable/draggable carousel — see markup in index.html
  // (#work .pf-*) and the dedicated CSS block in style.css. Deliberately
  // scroll-agnostic: nothing here reads window scroll position or calls
  // preventDefault on page scroll/wheel/touchmove. The accordion open/close
  // is a pure CSS grid-template-rows transition (no JS height measurement,
  // no layout jump); the desktop switch is a pure class-toggle crossfade
  // (grid-stacked panel-sets so the tallest one already sets the stage's
  // height — see CSS comment). Only the gallery below reads/writes scroll,
  // and only its OWN horizontal track, never the page. ----
  (function(){
    const root = document.getElementById('work');
    if (!root) return;

    // -- mobile accordion: tap a name to open it; opening one closes
    // whichever else was open, so exactly one is always expanded (one starts
    // open — "التصوير الرياضي", data-pf-index="0" — via the is-open class
    // already baked into index.html, no JS needed for that initial state).
    // Re-tapping the already-open service is a no-op: it never closes on its
    // own, so there's always a gallery visible to signal "every service has
    // one of these".
    //
    // The open/closed state is driven from here, not CSS alone: each closed
    // panel's <div class="pf-acc-body"> carries a real inline
    // display:none (set in the HTML for the six that start closed). CSS's
    // grid-template-rows:0fr→1fr trick still drives the smooth open/close
    // animation exactly as before, but a 0fr row can fail to fully collapse
    // to zero height in some engines when its content includes an
    // aspect-ratio box (the gallery slides do) — that's what let a sliver of
    // description/gallery peek through on a "closed" service. Toggling the
    // real `display` property here — removed just before opening, restored
    // only after the closing transition has fully finished — guarantees a
    // closed service renders nothing at all, regardless of that edge case.
    const accItems = Array.from(root.querySelectorAll('.pf-acc-item'));
    const ACC_CLOSE_MS = 550; // matches .pf-acc-body's grid-template-rows transition duration in css/style.css

    function closeAccItem(item){
      const head = item.querySelector('.pf-acc-head');
      const body = item.querySelector('.pf-acc-body');
      if (!item.classList.contains('is-open')) return;
      item.classList.remove('is-open');
      if (head) head.setAttribute('aria-expanded', 'false');
      if (!body) return;
      let hidden = false;
      const hideNow = () => {
        if (hidden) return;
        hidden = true;
        // only actually hide if it wasn't re-opened again in the meantime
        if (!item.classList.contains('is-open')) body.style.display = 'none';
        body.removeEventListener('transitionend', onEnd);
      };
      const onEnd = (e) => {
        if (e.target === body && e.propertyName === 'grid-template-rows') hideNow();
      };
      body.addEventListener('transitionend', onEnd);
      setTimeout(hideNow, ACC_CLOSE_MS); // fallback in case transitionend doesn't fire
    }

    function openAccItem(item){
      const head = item.querySelector('.pf-acc-head');
      const body = item.querySelector('.pf-acc-body');
      if (!body) return;
      body.style.display = ''; // un-hide first so the grid-rows transition can actually run
      void body.offsetHeight;  // force a reflow so the browser registers that un-hidden state
      // before the class below flips grid-template-rows and starts animating
      item.classList.add('is-open');
      if (head) head.setAttribute('aria-expanded', 'true');
    }

    accItems.forEach(item => {
      const head = item.querySelector('.pf-acc-head');
      if (!head) return;
      head.addEventListener('click', () => {
        if (item.classList.contains('is-open')) return; // already open: stays open, never closes on re-tap
        accItems.forEach(other => { if (other !== item) closeAccItem(other); });
        openAccItem(item);
      });
    });

    // -- desktop two-column: clicking a row crossfades the right panel to
    // that service's panel-set only; nothing else on the page moves. --
    const rows = Array.from(root.querySelectorAll('.pf-row'));
    const panels = Array.from(root.querySelectorAll('.pf-panel-set'));
    rows.forEach(row => {
      row.addEventListener('click', () => {
        if (row.classList.contains('is-active')) return;
        const idx = row.dataset.pfIndex;
        rows.forEach(r => { r.classList.remove('is-active'); r.setAttribute('aria-selected', 'false'); });
        row.classList.add('is-active');
        row.setAttribute('aria-selected', 'true');
        panels.forEach(p => p.classList.toggle('is-active', p.dataset.pfIndex === idx));
      });
    });

    // -- gallery: native swipe (touch, free from the browser via the
    // scroll-snap track in CSS) + desktop mouse-drag + dot sync/click. Runs
    // once per .pf-gallery, so every accordion panel and every desktop
    // panel-set gets its own fully independent 3-photo carousel. --
    function initGallery(gallery){
      const track = gallery.querySelector('.pf-gallery-track');
      const slides = Array.from(gallery.querySelectorAll('.pf-gallery-slide'));
      const dots = Array.from(gallery.querySelectorAll('.pf-dot'));
      if (!track || !slides.length) return;

      let activeIndex = 0;
      let rafPending = false;

      function setActive(idx){
        idx = Math.max(0, Math.min(slides.length - 1, idx));
        activeIndex = idx;
        slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      }

      function nearestIndex(){
        const w = track.clientWidth || 1;
        return Math.round(track.scrollLeft / w);
      }

      function onScroll(){
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          setActive(nearestIndex());
        });
      }
      track.addEventListener('scroll', onScroll, { passive: true });

      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
        });
      });

      // Desktop mouse-drag-to-scroll only (pointerType 'mouse'); touch/pen
      // input is left entirely to the browser's own native swipe+momentum
      // on the scroll-snap track above, so nothing is duplicated there.
      let dragging = false, startX = 0, startScroll = 0;
      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        dragging = true;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      track.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        track.scrollLeft = startScroll - (e.clientX - startX);
      });
      function endDrag(){
        if (!dragging) return;
        dragging = false;
        track.classList.remove('is-dragging');
        track.scrollTo({ left: nearestIndex() * track.clientWidth, behavior: 'smooth' });
      }
      track.addEventListener('pointerup', endDrag);
      track.addEventListener('pointercancel', endDrag);
      track.addEventListener('pointerleave', endDrag);

      setActive(0);
      window.addEventListener('resize', () => {
        track.scrollLeft = activeIndex * track.clientWidth;
      });
    }

    root.querySelectorAll('[data-pf-gallery]').forEach(initGallery);
  })();

// ---- FAQ accordion (Phase 8) ----
// Plain DOM, independent of GSAP/ScrollTrigger above (so it still works if
// those fail to load) and independent of prefers-reduced-motion (the actual
// open/close animation is CSS-only — grid-template-rows on .faq-answer,
// see css/style.css — and is already neutralized site-wide by the
// `*{transition-duration:.001ms}` reduced-motion rule). This block only
// ever toggles a class plus the accessibility attributes; one answer open
// at a time, closing whichever else was open. Each question keeps the
// site's standard [data-anim="rise"] scroll-reveal (handled generically
// earlier in this file) — nothing extra needed here for that.
(function(){
  var list = document.getElementById('faqList');
  if (!list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll('.faq-item'));

  items.forEach(function(item){
    var trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', function(){
      var willOpen = !item.classList.contains('is-open');
      items.forEach(function(other){
        if (other === item) return;
        other.classList.remove('is-open');
        var otherTrigger = other.querySelector('.faq-trigger');
        if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
  });
})();

// ---- Forms (Phase 9): shared helpers ----------------------------------
// Both the project-inquiry form (#inquiryForm) and the careers form
// (#careersForm) post to the same Google Apps Script Web App
// (window.SIIRAH_FORMS_ENDPOINT, set in js/config.js — empty until
// google-apps-script/SETUP.md has been completed). No Google credential
// of any kind lives in this file or anywhere else client-side; the
// endpoint is a Web App URL, not a secret (see the comment in config.js).
//
// The POST body is sent as plain text (no explicit Content-Type header,
// which makes the browser default to `text/plain` — a CORS "simple
// request" that skips the preflight OPTIONS call Apps Script Web Apps
// cannot answer). Code.gs reads it via `e.postData.contents` and
// JSON.parses it regardless of the declared type, so this is safe.
var SIIRAHForms = (function(){
  function lang(){ return (window.SIIRAH_LANG === 'en') ? 'en' : 'ar'; }
  function t(ar, en){ return lang() === 'en' ? en : ar; }

  function isEmailValid(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  }
  function isPhoneValid(v){
    var digits = String(v || '').replace(/[^0-9]/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
  function isUrlValid(v){
    var s = String(v || '').trim();
    if (!s) return true; // optional fields: empty is valid, required is checked separately
    try { var u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch (e) { return false; }
  }

  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function(){ reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function maxFileBytes(){
    return (window.SIIRAH_FORMS_MAX_FILE_MB || 15) * 1024 * 1024;
  }

  function setFieldError(fieldId, message){
    var input = document.getElementById(fieldId);
    var errorEl = document.getElementById(fieldId + '-error');
    var wrap = input ? input.closest('.form-field') : (errorEl ? errorEl.closest('.form-field') : null);
    if (errorEl) errorEl.textContent = message || '';
    if (wrap) wrap.classList.toggle('has-error', !!message);
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  function clearAllErrors(form){
    form.querySelectorAll('.field-error').forEach(function(el){ el.textContent = ''; });
    form.querySelectorAll('.form-field.has-error').forEach(function(el){ el.classList.remove('has-error'); });
    form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
  }

  function focusFirstError(form){
    var firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
  }

  function setStatus(statusEl, kind, message){
    statusEl.textContent = message;
    statusEl.classList.remove('is-success', 'is-error');
    if (kind) statusEl.classList.add('is-' + kind);
  }

  function setSubmitting(btn, isSubmitting){
    btn.disabled = isSubmitting;
    btn.classList.toggle('is-loading', isSubmitting);
  }

  function submitToEndpoint(payload){
    var endpoint = window.SIIRAH_FORMS_ENDPOINT;
    if (!endpoint) return Promise.reject(new Error('endpoint_not_configured'));
    return fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      .then(function(res){ return res.json(); })
      .then(function(json){
        if (!json || json.ok !== true) throw new Error(json && json.error || 'server_error');
        return json;
      });
  }

  // Reusable drag-and-drop file picker. Renders selected files as a list
  // of chips with a remove (×) button each; keeps its own File[] state
  // and exposes it via getFiles(). Enforces window.SIIRAH_FORMS_MAX_FILE_MB
  // client-side (Code.gs enforces the same cap again server-side).
  function initDropzone(opts){
    var zone = document.getElementById(opts.zoneId);
    var input = document.getElementById(opts.inputId);
    var list = document.getElementById(opts.listId);
    if (!zone || !input || !list) return { getFiles: function(){ return []; }, reset: function(){} };

    var files = opts.multiple ? [] : null;

    function render(){
      list.innerHTML = '';
      var arr = opts.multiple ? files : (files ? [files] : []);
      arr.forEach(function(file, idx){
        var li = document.createElement('li');
        li.className = 'file-chip';
        var name = document.createElement('span');
        name.className = 'file-chip-name';
        name.textContent = file.name;
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'file-chip-remove';
        remove.setAttribute('aria-label', t('إزالة الملف', 'Remove file') + ' ' + file.name);
        remove.textContent = '×';
        remove.addEventListener('click', function(){
          if (opts.multiple) files.splice(idx, 1);
          else files = null;
          render();
        });
        li.appendChild(name);
        li.appendChild(remove);
        list.appendChild(li);
      });
    }

    function addFiles(fileList){
      var incoming = Array.prototype.slice.call(fileList);
      var accepted = incoming.filter(function(f){ return f.size <= maxFileBytes(); });
      var rejected = incoming.length - accepted.length;
      if (opts.multiple){
        files = files.concat(accepted);
        if (opts.maxFiles) files = files.slice(0, opts.maxFiles);
      } else {
        files = accepted[0] || files;
      }
      if (rejected > 0 && opts.onOversize) opts.onOversize(rejected);
      render();
    }

    input.addEventListener('change', function(){
      if (input.files && input.files.length) addFiles(input.files);
      input.value = '';
    });
    zone.addEventListener('click', function(){ input.click(); });
    zone.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach(function(evt){
      zone.addEventListener(evt, function(e){ e.preventDefault(); zone.classList.add('is-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function(evt){
      zone.addEventListener(evt, function(e){ e.preventDefault(); zone.classList.remove('is-dragover'); });
    });
    zone.addEventListener('drop', function(e){
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    return {
      getFiles: function(){ return opts.multiple ? files.slice() : (files ? [files] : []); },
      reset: function(){ files = opts.multiple ? [] : null; render(); }
    };
  }

  function initChipGroup(groupId, hiddenInputId){
    var group = document.getElementById(groupId);
    var hidden = document.getElementById(hiddenInputId);
    if (!group || !hidden) return { getValues: function(){ return []; }, reset: function(){} };
    var chips = Array.prototype.slice.call(group.querySelectorAll('.chip'));

    function sync(){
      var values = chips.filter(function(c){ return c.getAttribute('aria-pressed') === 'true'; })
                         .map(function(c){ return c.getAttribute('data-value'); });
      hidden.value = values.join(', ');
      return values;
    }
    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        var pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', String(!pressed));
        sync();
      });
    });
    return {
      getValues: sync,
      reset: function(){ chips.forEach(function(c){ c.setAttribute('aria-pressed', 'false'); }); sync(); }
    };
  }

  return {
    t: t,
    isEmailValid: isEmailValid,
    isPhoneValid: isPhoneValid,
    isUrlValid: isUrlValid,
    fileToBase64: fileToBase64,
    setFieldError: setFieldError,
    clearAllErrors: clearAllErrors,
    focusFirstError: focusFirstError,
    setStatus: setStatus,
    setSubmitting: setSubmitting,
    submitToEndpoint: submitToEndpoint,
    initDropzone: initDropzone,
    initChipGroup: initChipGroup
  };
})();

// ---- Project inquiry form (#inquiryForm) ----
(function(){
  var form = document.getElementById('inquiryForm');
  if (!form) return;
  var F = SIIRAHForms;

  var renderedAt = document.getElementById('inqRenderedAt');
  if (renderedAt) renderedAt.value = String(Date.now());

  var dropzone = F.initDropzone({
    zoneId: 'inqDropzone', inputId: 'inqFileInput', listId: 'inqFileList',
    multiple: true, maxFiles: 10,
    onOversize: function(){
      F.setFieldError('inqFiles', F.t(
        'بعض الملفات أكبر من ' + (window.SIIRAH_FORMS_MAX_FILE_MB || 15) + 'MB ولم تُضف.',
        'Some files were larger than ' + (window.SIIRAH_FORMS_MAX_FILE_MB || 15) + 'MB and were not added.'
      ));
    }
  });
  // initChipGroup expects a distinct hidden-input id; #inqServices is the
  // group wrapper itself, so give it a real hidden input to sync into
  // BEFORE initChipGroup reads it.
  (function ensureHiddenInput(){
    if (document.getElementById('inqServicesValue')) return;
    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'inqServicesValue';
    hidden.name = 'services';
    document.getElementById('inqServices').appendChild(hidden);
  })();
  var services = F.initChipGroup('inqServices', 'inqServicesValue');

  var submitBtn = document.getElementById('inqSubmitBtn');
  var statusEl = document.getElementById('inqStatus');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    F.clearAllErrors(form);
    F.setStatus(statusEl, null, '');

    var name = document.getElementById('inqName').value.trim();
    var email = document.getElementById('inqEmail').value.trim();
    var phone = document.getElementById('inqPhone').value.trim();
    var projectName = document.getElementById('inqProjectName').value.trim();
    var projectType = document.getElementById('inqProjectType').value.trim();
    var selectedServices = services.getValues();
    var projectDetails = document.getElementById('inqDetails').value.trim();

    var ok = true;
    if (!name){ F.setFieldError('inqName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!email){ F.setFieldError('inqEmail', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isEmailValid(email)){ F.setFieldError('inqEmail', F.t('يرجى إدخال بريد إلكتروني صحيح.', 'Please enter a valid email address.')); ok = false; }
    if (!phone){ F.setFieldError('inqPhone', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isPhoneValid(phone)){ F.setFieldError('inqPhone', F.t('يرجى إدخال رقم جوال صحيح.', 'Please enter a valid mobile number.')); ok = false; }
    if (!projectName){ F.setFieldError('inqProjectName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!projectType){ F.setFieldError('inqProjectType', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!selectedServices.length){ F.setFieldError('inqServices', F.t('يرجى اختيار خدمة واحدة على الأقل.', 'Please select at least one service.')); ok = false; }
    if (!projectDetails){ F.setFieldError('inqDetails', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }

    var website = document.getElementById('inqWebsite').value.trim();
    if (website && !F.isUrlValid(website)){ F.setFieldError('inqWebsite', F.t('يرجى إدخال رابط صحيح.', 'Please enter a valid URL.')); ok = false; }
    var reference = document.getElementById('inqReference').value.trim();
    if (reference && !F.isUrlValid(reference)){ F.setFieldError('inqReference', F.t('يرجى إدخال رابط صحيح.', 'Please enter a valid URL.')); ok = false; }

    if (!ok){
      F.focusFirstError(form);
      F.setStatus(statusEl, 'error', F.t('يرجى مراجعة الحقول المظللة أعلاه.', 'Please review the highlighted fields above.'));
      return;
    }

    var payload = {
      formType: 'project',
      hp: document.getElementById('inqHp').value,
      renderedAt: document.getElementById('inqRenderedAt').value,
      fields: {
        name: name, company: document.getElementById('inqCompany').value.trim(),
        email: email, phone: phone,
        projectName: projectName, projectType: projectType,
        services: selectedServices,
        budget: document.getElementById('inqBudget').value.trim(),
        requestedDate: document.getElementById('inqDate').value,
        website: website, socialLinks: document.getElementById('inqSocial').value.trim(),
        projectDetails: projectDetails, notes: document.getElementById('inqNotes').value.trim(),
        referenceLink: reference
      },
      files: []
    };

    F.setSubmitting(submitBtn, true);
    var selectedFiles = dropzone.getFiles();
    Promise.all(selectedFiles.map(function(file){
      return F.fileToBase64(file).then(function(base64){
        return { name: file.name, mimeType: file.type, base64: base64 };
      });
    }))
      .then(function(encoded){
        payload.files = encoded;
        return F.submitToEndpoint(payload);
      })
      .then(function(){
        F.setStatus(statusEl, 'success', F.t(
          'تم استلام طلبك بنجاح.\nسنراجع التفاصيل ونتواصل معك عند الحاجة.',
          'Your request has been received successfully.\nWe\'ll review the details and contact you if needed.'
        ));
        form.reset();
        dropzone.reset();
        services.reset();
        if (document.getElementById('inqRenderedAt')) document.getElementById('inqRenderedAt').value = String(Date.now());
      })
      .catch(function(){
        F.setStatus(statusEl, 'error', F.t(
          'تعذر إرسال الطلب حاليًا.\nيرجى المحاولة مرة أخرى.',
          'We couldn\'t submit your request right now.\nPlease try again.'
        ));
      })
      .finally(function(){
        F.setSubmitting(submitBtn, false);
      });
  });
})();

// ---- Careers form (#careersForm) ----
(function(){
  var form = document.getElementById('careersForm');
  if (!form) return;
  var F = SIIRAHForms;

  var renderedAt = document.getElementById('carRenderedAt');
  if (renderedAt) renderedAt.value = String(Date.now());

  var dropzone = F.initDropzone({
    zoneId: 'carDropzone', inputId: 'carFileInput', listId: 'carFileList',
    multiple: false,
    onOversize: function(){
      F.setStatus(document.getElementById('carStatus'), 'error', F.t(
        'حجم الملف أكبر من ' + (window.SIIRAH_FORMS_MAX_FILE_MB || 15) + 'MB.',
        'The file is larger than ' + (window.SIIRAH_FORMS_MAX_FILE_MB || 15) + 'MB.'
      ));
    }
  });

  var positionSelect = document.getElementById('carPosition');
  var otherWrap = document.getElementById('carPositionOtherWrap');
  var otherInput = document.getElementById('carPositionOther');
  if (positionSelect && otherWrap && otherInput){
    positionSelect.addEventListener('change', function(){
      var isOther = positionSelect.value === 'Other';
      otherWrap.hidden = !isOther;
      if (isOther) otherInput.setAttribute('required', 'required');
      else { otherInput.removeAttribute('required'); otherInput.value = ''; }
    });
  }

  var submitBtn = document.getElementById('carSubmitBtn');
  var statusEl = document.getElementById('carStatus');
  var successEl = document.getElementById('joinSuccess');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    F.clearAllErrors(form);
    F.setStatus(statusEl, null, '');

    var name = document.getElementById('carName').value.trim();
    var email = document.getElementById('carEmail').value.trim();
    var phone = document.getElementById('carPhone').value.trim();
    var field = document.getElementById('carField').value.trim();
    var desiredPosition = positionSelect.value;
    var desiredPositionOther = otherInput ? otherInput.value.trim() : '';
    var experience = document.getElementById('carExperience').value.trim();
    var bio = document.getElementById('carBio').value.trim();
    var portfolio = document.getElementById('carPortfolio').value.trim();

    var ok = true;
    if (!name){ F.setFieldError('carName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!email){ F.setFieldError('carEmail', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isEmailValid(email)){ F.setFieldError('carEmail', F.t('يرجى إدخال بريد إلكتروني صحيح.', 'Please enter a valid email address.')); ok = false; }
    if (!phone){ F.setFieldError('carPhone', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isPhoneValid(phone)){ F.setFieldError('carPhone', F.t('يرجى إدخال رقم جوال صحيح.', 'Please enter a valid mobile number.')); ok = false; }
    if (!field){ F.setFieldError('carField', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!desiredPosition){ F.setFieldError('carPosition', F.t('يرجى اختيار المسمى الوظيفي.', 'Please select a position.')); ok = false; }
    if (desiredPosition === 'Other' && !desiredPositionOther){ F.setFieldError('carPositionOther', F.t('يرجى تحديد المسمى الوظيفي.', 'Please specify the position.')); ok = false; }
    if (!experience){ F.setFieldError('carExperience', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!bio){ F.setFieldError('carBio', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!portfolio){ F.setFieldError('carPortfolio', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isUrlValid(portfolio)){ F.setFieldError('carPortfolio', F.t('يرجى إدخال رابط صحيح.', 'Please enter a valid URL.')); ok = false; }

    if (!ok){
      F.focusFirstError(form);
      F.setStatus(statusEl, 'error', F.t('يرجى مراجعة الحقول المظللة أعلاه.', 'Please review the highlighted fields above.'));
      return;
    }

    var payload = {
      formType: 'careers',
      hp: document.getElementById('carHp').value,
      renderedAt: document.getElementById('carRenderedAt').value,
      fields: {
        name: name, email: email, phone: phone,
        gender: document.getElementById('carGender').value,
        birthYear: document.getElementById('carBirthYear').value,
        field: field,
        desiredPosition: desiredPosition === 'Other' ? desiredPositionOther : desiredPosition,
        experience: experience, bio: bio, portfolio: portfolio
      },
      files: []
    };

    F.setSubmitting(submitBtn, true);
    var selectedFiles = dropzone.getFiles();
    Promise.all(selectedFiles.map(function(file){
      return F.fileToBase64(file).then(function(base64){
        return { name: file.name, mimeType: file.type, base64: base64 };
      });
    }))
      .then(function(encoded){
        payload.files = encoded;
        return F.submitToEndpoint(payload);
      })
      .then(function(){
        form.hidden = true;
        if (successEl) successEl.classList.add('is-visible');
      })
      .catch(function(){
        F.setStatus(statusEl, 'error', F.t(
          'تعذر إرسال الطلب حاليًا.\nيرجى المحاولة مرة أخرى.',
          'We couldn\'t submit your request right now.\nPlease try again.'
        ));
      })
      .finally(function(){
        F.setSubmitting(submitBtn, false);
      });
  });
})();
