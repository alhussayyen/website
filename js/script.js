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

    // The loading screen is shown for a fixed minimum of ~3s so it reads as an
    // intentional brand moment rather than a flicker, even on a fast connection
    // where the page itself is ready almost instantly. Progress animates
    // smoothly (capped at 96%) across that whole window; dismissal only fires
    // once BOTH the minimum time has elapsed AND the page has actually finished
    // loading, so on slower connections it still waits for the real load event
    // instead of ever showing an unfinished page.
    var MIN_DURATION = 3000;
    var pageLoaded = false;
    var minTimeElapsed = false;

    function tryDismiss(){
      if (pageLoaded && minTimeElapsed) dismiss();
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

    setTimeout(function(){
      minTimeElapsed = true;
      tryDismiss();
    }, MIN_DURATION);

    function onLoad(){
      pageLoaded = true;
      tryDismiss();
    }

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }
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
        btn.setAttribute('aria-label', btn.getAttribute('aria-label')?.replace('إيقاف', 'تشغيل') || 'تشغيل');
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
        btn.setAttribute('aria-label', btn.getAttribute('aria-label')?.replace('تشغيل', 'إيقاف') || 'إيقاف');
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
      toggle.setAttribute('aria-label', 'فتح القائمة');
      document.body.style.overflow = '';
      __lenis?.start();
    }
    function openNav(){
      nav.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'إغلاق القائمة');
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
  document.querySelectorAll('a, button, .story-slide, .client').forEach(el=>{
    el.addEventListener('mouseenter', ()=>ring.classList.add('big'));
    el.addEventListener('mouseleave', ()=>ring.classList.remove('big'));
  });

  // ---- scroll reveals (respects prefers-reduced-motion) ----
  if (!reduceMotion && window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
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
    // applies — the photography section is now the dedicated story-gallery
    // controller further down, which owns its own photos' opacity/transform
    // every frame; a generic GSAP reveal here would fight that.)

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

  // ---- clients: infinite, seamless logo marquee ----
  // Pure CSS now drives the motion (see .logo-marquee-track's `animation` in
  // style.css) — a GPU-composited transform:translateX loop, so there's no
  // per-frame JS cost and the strip never stalls, stutters, or pauses. The
  // track still holds two back-to-back copies of the logo set (identical
  // markup as before); the keyframes just shift it exactly one set-width
  // (-50%) so the loop point is invisible. Nothing to wire up here.

  // ---- work/photography story gallery: sticky-pinned, scroll-driven
  // fade + light parallax, one photo at a time — see markup in index.html
  // (#storyStickyOuter) and the dedicated CSS block in style.css. Same
  // core mechanism as the mobile services showcase below (sticky spacer +
  // fractional scroll-position index, lerped for a smooth settle), but:
  // (a) active at EVERY breakpoint, not just mobile — this section is in
  // scope for both mobile and desktop per spec — and (b) crossfades
  // opacity + a small translateY parallax instead of sliding cards
  // horizontally, since this is a single full-bleed photo stage, not a
  // multi-card row. No buttons, no arrows, no dots, no autoplay/timer: the
  // only input is normal, un-hijacked page scroll — position:sticky here
  // never intercepts or blocks scrolling, it only pins this box in place
  // while its spacer scrolls past (native scroll-snap "pause" removed
  // sitewide, see style.css — it was fighting the Lenis smooth-scroll
  // library and breaking normal scrolling). ----
  (function(){
    const outer = document.getElementById('storyStickyOuter');
    const slides = Array.from(document.querySelectorAll('.story-slide'));
    const captionEl = document.getElementById('storyCaption');
    const titleEl = document.getElementById('storyTitle');
    const descEl = document.getElementById('storyDesc');
    const countEl = document.getElementById('storyCountCurrent');
    if (!outer || !slides.length || !captionEl) return;

    // Scroll budget per photo transition, in dvh — generous enough (versus
    // the services row's 60dvh/step) that each photo needs a deliberate
    // scroll to advance, giving natural room to read the caption before the
    // next one settles in. css/style.css's `.story-snap-point[data-snap-step]`
    // offsets are hand-derived from this exact value and slides.length —
    // if either changes, those snap offsets need updating too.
    var STEP_VH = 65;
    var PIN_BUDGET_VH = 100 + (slides.length - 1) * STEP_VH;
    var LERP = 0.16;
    var SETTLE_EPSILON = 0.0015;
    var PARALLAX_PX = 26;

    let renderedIndex = 0;
    let paintedNearest = -1;
    let swapTimer = null;
    let raf = null;

    function targetIndex(){
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const scrollable = rect.height - vh;
      let progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      progress = Math.min(1, Math.max(0, progress));
      return progress * (slides.length - 1);
    }

    function swapCaption(idx){
      const slide = slides[idx];
      if (!slide) return;
      captionEl.classList.add('is-swap');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        titleEl.textContent = slide.dataset.title || '';
        descEl.textContent = slide.dataset.desc || '';
        countEl.textContent = String(idx + 1).padStart(2, '0');
        captionEl.classList.remove('is-swap');
      }, 180);
    }

    function paint(continuousIndex){
      const nearest = Math.round(continuousIndex);
      slides.forEach((el, idx) => {
        const delta = idx - continuousIndex;
        el.style.opacity = Math.max(0, 1 - Math.abs(delta));
        el.style.transform = 'translateY(' + (delta * PARALLAX_PX) + 'px)';
        const on = idx === nearest;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (nearest !== paintedNearest){
        paintedNearest = nearest;
        swapCaption(nearest);
      }
    }

    function tick(){
      raf = null;
      const target = targetIndex();
      renderedIndex += (target - renderedIndex) * LERP;
      if (Math.abs(target - renderedIndex) < SETTLE_EPSILON) renderedIndex = target;
      paint(renderedIndex);
      if (renderedIndex !== target) raf = requestAnimationFrame(tick);
    }

    function onScroll(){
      if (!raf) raf = requestAnimationFrame(tick);
    }

    outer.style.height = PIN_BUDGET_VH + 'dvh';
    // Initial paint so the first photo/caption are correct even before any
    // scroll event fires (e.g. landing directly on a #work URL). Caption
    // text is set directly (not via swapCaption()) and paintedNearest is
    // pre-seeded to match, so this first paint() never triggers the
    // fade-swap transition — that's reserved for actual in-scroll changes.
    renderedIndex = targetIndex();
    const initialNearest = Math.round(renderedIndex);
    titleEl.textContent = slides[initialNearest].dataset.title || '';
    descEl.textContent = slides[initialNearest].dataset.desc || '';
    countEl.textContent = String(initialNearest + 1).padStart(2, '0');
    paintedNearest = initialNearest;
    paint(renderedIndex);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { outer.style.height = PIN_BUDGET_VH + 'dvh'; onScroll(); });
  })();
