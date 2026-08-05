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
  document.querySelectorAll('a, button, .proj, .client').forEach(el=>{
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

    // (portfolio image scroll-triggered scale reveal removed per spec —
    // images are static within their frame; the .proj card wrapper itself
    // still gets the standard [data-anim="rise"] reveal above.)

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

  // ---- mobile-only: services section as a sticky, scroll-stepped HORIZONTAL
  // SLIDE showcase ----
  // No buttons, no arrows, no touch-drag/swipe — the ONLY input is the
  // page's normal vertical scroll (the same finger-scroll used everywhere
  // else on the site). Every item's horizontal position is a pure function
  // of (its own index − the active index): the active item sits at
  // translateX(0), items ahead of it sit one "stage width" to the right
  // (+100%), items behind it sit one stage width to the left (−100%). So
  // stepping the active index by exactly +1 (scrolling down) animates the
  // outgoing card from 0 → −100% (slides out to the left) at the exact same
  // moment the incoming card animates from +100% → 0 (slides in from the
  // right) — a single CSS `transition:transform` on every card drives both
  // halves of that motion at once. Stepping by −1 (scrolling up) is the
  // exact mirror: outgoing card 0 → +100% (exits right), incoming card
  // −100% → 0 (enters from the left). Never more than one index-step is
  // committed per update, so a fast fling still advances one service at a
  // time instead of jump-cutting past any of them. Once the user scrolls
  // past the last service the section unpins on its own and the page
  // continues normally — same in reverse past the first service. Fully
  // inert on desktop widths.
  (function(){
    const outer = document.getElementById('svcStickyOuter');
    const items = Array.from(document.querySelectorAll('.services-showcase .showcase-item'));
    if (!outer || !items.length) return;

    let active = false;
    let currentIndex = 0;
    let raf = null;
    // Minimum time each card must stay on screen before the NEXT step is
    // allowed to happen, regardless of how far/fast the user has already
    // scrolled — without this, scroll position alone decided the index, so
    // a normal-speed scroll could blow through all 4 cards in well under a
    // second, leaving no time to actually read one. This does not change
    // scroll as the only input, nor the one-card-at-a-time advance, nor the
    // CSS transition itself (still driven by the same `.showcase-item`
    // transition in style.css) — it only gates *when* update() is allowed
    // to commit the next step. 6000ms sits in the middle of the requested
    // 5-7s reading window.
    var MIN_DWELL_MS = 6000;
    let lastStepAt = 0;
    let dwellTimer = null;

    // Positions every card via inline transform, purely as a function of
    // (card index − currentIndex). `instant`, used only on first activation,
    // applies that starting layout with transitions switched off so nothing
    // visibly slides in on arrival — every index change after that goes
    // through the normal CSS transition declared in style.css.
    function layout(instant){
      items.forEach((el, idx) => {
        if (instant) el.style.transitionProperty = 'none';
        el.style.transform = 'translateX(' + ((idx - currentIndex) * 100) + '%)';
        const on = idx === currentIndex;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (instant){
        void outer.offsetWidth; // force the "no transition" frame to actually paint
        items.forEach(el => { el.style.transitionProperty = ''; });
      }
    }

    function update(){
      raf = null;
      if (!active) return;
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const scrollable = rect.height - vh;
      let progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      progress = Math.min(1, Math.max(0, progress));
      const target = Math.min(items.length - 1, Math.max(0, Math.round(progress * (items.length - 1))));
      if (target === currentIndex) return;

      const elapsed = Date.now() - lastStepAt;
      if (elapsed < MIN_DWELL_MS){
        // Current card hasn't been on screen long enough yet — hold this
        // step and re-check exactly when its dwell time runs out, so the
        // advance still lands on wherever the user has scrolled to by then
        // without requiring another scroll event to wake it up.
        if (!dwellTimer) dwellTimer = setTimeout(function(){ dwellTimer = null; update(); }, MIN_DWELL_MS - elapsed);
        return;
      }

      currentIndex += target > currentIndex ? 1 : -1; // one card per step, always
      lastStepAt = Date.now();
      layout(false);
      if (currentIndex !== target) raf = requestAnimationFrame(update); // keep advancing toward the target, one step at a time (each further step is still dwell-gated above)
    }

    function onScroll(){
      if (raf) return;
      raf = requestAnimationFrame(update);
    }

    function enable(){
      if (active) return;
      active = true;
      // dvh (not vh) so the spacer's height tracks the browser's actual
      // visible viewport as mobile address/toolbar chrome shows/hides —
      // matches the dvh unit already used for .services-sticky-inner below.
      // ROOT CAUSE of the section reserving far more vertical space than a
      // horizontal slider needs: this used to be `items.length * PER_STEP_VH`
      // (previously 100dvh/item, then 50dvh/item) — i.e. the spacer's height
      // scaled with the NUMBER of services, exactly as if each one still
      // needed its own vertical slot in a stacked layout. But the services
      // never stack — they only ever move sideways via `translateX` — so a
      // discrete-step slider only needs one small, CONSTANT scroll budget to
      // resolve which step the user is on, no matter how many cards exist.
      // PIN_BUDGET_VH is that fixed budget (the same 160dvh floor this code
      // already trusted as "a real, non-zero pin range" for small item
      // counts) applied uniformly instead of letting it grow with content —
      // so the section's scroll footprint no longer increases every time a
      // service is added, and stays as close to a single screen as the
      // scroll->index stepping algorithm below can resolve. That algorithm,
      // the one-card-at-a-time advance, and the CSS transition timing are
      // all unchanged.
      var PIN_BUDGET_VH = 160;
      outer.style.height = PIN_BUDGET_VH + 'dvh';
      currentIndex = 0;
      lastStepAt = Date.now(); // first card's dwell window starts now too
      layout(true);
      window.addEventListener('scroll', onScroll, { passive:true });
      window.addEventListener('orientationchange', onScroll);
      update();
    }

    function disable(){
      if (!active) return;
      active = false;
      if (dwellTimer){ clearTimeout(dwellTimer); dwellTimer = null; }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('orientationchange', onScroll);
      outer.style.height = '';
      items.forEach(el => {
        el.classList.remove('is-active');
        el.removeAttribute('aria-hidden');
        el.style.transform = '';
        el.style.transitionProperty = '';
      });
      currentIndex = 0;
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

  // ---- portfolio lightbox ----
  (function(){
    const items = Array.from(document.querySelectorAll('.work-grid a.proj'));
    const lightbox = document.getElementById('lightbox');
    if (!items.length || !lightbox) return;

    const lbImg = document.getElementById('lbImg');
    const lbCaption = document.getElementById('lbCaption');
    const btnClose = document.getElementById('lbClose');
    const btnPrev = document.getElementById('lbPrev');
    const btnNext = document.getElementById('lbNext');

    const slides = items.map(a => ({
      src: a.querySelector('img')?.getAttribute('src') || '',
      alt: a.querySelector('img')?.getAttribute('alt') || '',
      caption: a.querySelector('.cap .t')?.textContent.trim() || ''
    }));

    let index = 0;
    let lastFocused = null;

    function render(){
      const s = slides[index];
      lbImg.src = s.src;
      lbImg.alt = s.alt;
      lbCaption.textContent = s.caption;
    }

    function open(i){
      index = i;
      lastFocused = document.activeElement;
      render();
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add('lb-open'));
      document.body.style.overflow = 'hidden';
      __lenis?.stop();
      btnClose.focus();
    }

    function close(){
      lightbox.classList.remove('lb-open');
      document.body.style.overflow = '';
      __lenis?.start();
      setTimeout(() => { lightbox.hidden = true; }, 350);
      lastFocused?.focus?.();
    }

    function next(){ index = (index + 1) % slides.length; render(); }
    function prev(){ index = (index - 1 + slides.length) % slides.length; render(); }

    items.forEach((a, i) => {
      a.addEventListener('click', e => { e.preventDefault(); open(i); });
    });

    btnClose.addEventListener('click', close);
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', e => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') (getComputedStyle(document.documentElement).direction === 'rtl') ? prev() : next();
      if (e.key === 'ArrowLeft') (getComputedStyle(document.documentElement).direction === 'rtl') ? next() : prev();
    });
  })();
