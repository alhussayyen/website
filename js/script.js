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

  // ---- soft section-settle ----
  // Gives every major section a gentle "it has arrived / settled into
  // place" feeling right as its top edge nears the top of the viewport,
  // without a hard CSS scroll-snap (which would fight Lenis's own
  // RAF-driven smooth scroll and cause exactly the stutter/jump this is
  // meant to avoid). Driven entirely through Lenis's own scrollTo, so the
  // two motion systems never fight:
  //   - only evaluated after scrolling has genuinely stopped (debounced
  //     on Lenis's 'scroll' event, not on every frame)
  //   - only nudges a section into place when it's already CLOSE to
  //     aligned (a small proximity window, not a long-range pull) —
  //     mirrors CSS scroll-snap:proximity, never :mandatory
  //   - a short, soft easing tween (not instant, not slow/blocking)
  //   - never locks input: the user can keep scrolling straight through
  //     it, which simply cancels the in-flight settle (Lenis's own
  //     scrollTo default; lock is left off on purpose)
  //   - fires at most once per approach (isSettling guard) so it can
  //     never loop/re-trigger itself
  // Pinned scroll-story sections (#process/#differentiators/#services)
  // are many viewport-heights tall; this only ever evaluates proximity
  // to the SECTION's own top edge, which is crossed once, right as the
  // sticky stage engages — their own IntersectionObserver step
  // controllers keep driving the internal story untouched afterward.
  if (!reduceMotion && __lenis) {
    const settleSections = Array.from(document.querySelectorAll('body > section'))
      .filter(el => el.offsetHeight > 200);
    let settleTimer = null;
    let isSettling = false;

    function trySettle(){
      if (isSettling) return;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const threshold = Math.min(160, Math.max(60, vh * 0.18));
      let target = null;
      let smallest = Infinity;
      for (const el of settleSections){
        const top = el.getBoundingClientRect().top;
        const dist = Math.abs(top);
        if (dist <= threshold && dist < smallest && dist > 2){
          smallest = dist;
          target = el;
        }
      }
      if (!target) return;
      isSettling = true;
      __lenis.scrollTo(target, {
        offset: 0,
        duration: 0.7,
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic, matches the site's soft-ease feel
        onComplete: () => { isSettling = false; }
      });
    }

    __lenis.on('scroll', () => {
      if (isSettling) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(trySettle, 180);
    });
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

    // ---- professional text reveal for section headings (auto word-split) ----
    // Skips the hero mark and any heading already hand-built with .reveal-line spans.
    document.querySelectorAll('h2').forEach(h2=>{
      if (h2.closest('.hero') || h2.querySelector('.reveal-line') || h2.dataset.anim === 'none') return;
      const words = h2.textContent.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return;
      // Fix (Aug 2026 visual-refinement pass): the outer word-mask span below
      // needs real vertical breathing room, not just the heading's own tight
      // line-height (1.05-1.2 depending on section) inherited by default —
      // Arabic glyphs/diacritics on large headings were being permanently
      // clipped at the bottom by this span's own overflow:hidden (this was
      // NOT limited to the reveal animation: the clip is on the wrapper's
      // static box, so it persisted forever after the reveal settled too).
      // line-height:1.3 gives every wrapped word enough box height to avoid
      // clipping while still reading as tight/editorial; text content is
      // unchanged, only this per-word mask box got taller.
      h2.innerHTML = words.map(w =>
        '<span style="display:inline-block;overflow:hidden;vertical-align:top;line-height:1.3">' +
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
      // #services is excluded here entirely: its pinned scroll controller
      // (further down) owns every .svc-panel's opacity/transform itself at
      // every width now, not just desktop — a generic stagger reveal here
      // would fight that the same way it used to on mobile only.
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

    // ---- Behind SIIRAH (Phase 4): very light parallax on the lead photo ----
    // Same scrub pattern as the video-grid drift just below: transform-only,
    // tied to real scroll position, capped small. Skipped entirely if the
    // section isn't present.
    if (document.querySelector('.behind-item--a img')){
      // Targets the absolutely-positioned <img> itself, not the grid cell,
      // so the cell's own overflow:hidden clips the drift and it can
      // never visually spill into the neighboring photo.
      gsap.to('.behind-item--a img', {
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

  // ---- Services (Phase X): pinned scroll-through of the 4 services ----
  // Same pinned-stage technique as #process / #differentiators — one
  // IntersectionObserver over evenly-spaced trigger points swaps the
  // active step — but running at EVERY width, not just desktop: the 4
  // services and their icon rail are the point of the scroll interaction
  // on phones too (see css/style.css, .svc-track.is-pinned is unscoped by
  // width for the same reason). Falls back to a plain stacked list (all 4
  // services, icons hidden) when reduced motion is set or
  // IntersectionObserver is unsupported — same safety net already used by
  // #process/#differentiators.
  (function(){
    const track = document.getElementById('svcTrack');
    const panels = Array.from(document.querySelectorAll('.svc-panel'));
    const icons = Array.from(document.querySelectorAll('.svc-icon'));
    const progressEl = document.getElementById('svcProgress');
    const scrollHint = document.getElementById('svcScrollHint');
    if (!track || !panels.length || !window.IntersectionObserver) return;

    function setActive(idx){
      panels.forEach((el, i)=>{
        el.classList.toggle('is-active', i === idx);
        el.classList.toggle('is-past', i < idx);
        el.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      });
      icons.forEach((el, i)=>{
        el.classList.toggle('is-active', i === idx);
      });
      if (progressEl) progressEl.textContent = String(idx + 1).padStart(2, '0') + ' / 04';
      // no "keep scrolling" hint once the last service is showing
      if (scrollHint) scrollHint.classList.toggle('is-hidden', idx === panels.length - 1);
    }

    function enable(){
      if (track.classList.contains('is-pinned')) return;
      track.classList.add('is-pinned');
      setActive(0);
      const observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting){
            const idx = parseInt(entry.target.dataset.triggerStep, 10) - 1;
            setActive(idx);
          }
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      track.querySelectorAll('.svc-trigger').forEach(m => observer.observe(m));
    }

    if (!reduceMotion) enable();
  })();

  // ---- Process (Phase 4): "how we work" scroll story ----
  // Deliberately NOT built on GSAP/ScrollTrigger: a single lightweight
  // IntersectionObserver (rootMargin -50% top/bottom shrinks the viewport
  // to a 1px line at dead-center, so a trigger "intersects" exactly when it
  // crosses center) swaps which step is focused; every visual change is a
  // plain CSS transition on opacity/transform, not per-frame JS.
  // Sep 2026: now runs at EVERY width, including mobile — same technique
  // as #services (no more min-width:761px gate) — per spec, mobile uses
  // the exact same navigation/interaction concept as desktop, just sized
  // for a phone screen (see the max-width:760px rules in style.css). Only
  // reduced motion or an unsupported IntersectionObserver leaves the
  // section in its default CSS state (plain static list).
  (function(){
    const track = document.getElementById('processTrack');
    const steps = Array.from(document.querySelectorAll('.process-step'));
    const countEl = document.getElementById('processProgressCount');
    const dots = Array.from(document.querySelectorAll('.process-progress-dots i'));
    const sharedArrow = document.getElementById('processSharedArrow');
    if (!track || !steps.length || !window.IntersectionObserver) return;

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
      // no arrow after the last step ("تسليم") — matches the per-step
      // markup, which never had a process-step-arrow on step 6 either.
      if (sharedArrow) sharedArrow.classList.toggle('is-hidden', idx === steps.length - 1);
    }

    function enable(){
      if (track.classList.contains('is-pinned')) return;
      track.classList.add('is-pinned');
      setActive(0);
      const observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting){
            const idx = parseInt(entry.target.dataset.triggerStep, 10) - 1;
            setActive(idx);
          }
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      track.querySelectorAll('.process-trigger').forEach(m => observer.observe(m));
    }

    if (!reduceMotion) enable();
  })();

  // ---- Differentiators (Phase 5): "why SIIRAH" scroll story ----
  // Same lightweight-observer philosophy as Process: no GSAP, no scroll
  // handler. Sep 2026: now pins and runs the same indexed panel story at
  // EVERY width, including mobile — same technique as #services/#process
  // (no more min-width:761px gate, no more separate "gentle emphasis"
  // fallback) — per spec, mobile uses the exact same navigation/
  // interaction concept as desktop, just sized for a phone screen (see
  // the max-width:760px rules in style.css).
  (function(){
    const track = document.getElementById('diffTrack');
    const panels = Array.from(document.querySelectorAll('.diff-panel'));
    const indexItems = Array.from(document.querySelectorAll('.diff-index-item'));
    const progressEl = document.getElementById('diffProgress');
    if (!track || !panels.length || !window.IntersectionObserver) return;

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

    function enable(){
      if (track.classList.contains('is-pinned')) return;
      track.classList.add('is-pinned');
      setActive(0);
      const observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting){
            const idx = parseInt(entry.target.dataset.triggerStep, 10) - 1;
            setActive(idx);
          }
        });
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      track.querySelectorAll('.diff-trigger').forEach(m => observer.observe(m));
    }

    if (!reduceMotion) enable();
  })();

  // ---- clients: infinite logo marquee (Phase 3 note: this comment
  // previously described the .cl-cell grid mosaic from an earlier phase —
  // that grid was replaced by the two-row .clients-marquee in
  // index.html/style.css; the marquee's own behavior now lives in its own
  // IIFE near the end of this file, "clients logo marquee: subtle scroll
  // speed-up"). Nothing to wire up here.

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

  // The live SIIRAH_FORMS_ENDPOINT (verified by a real test POST for
  // each of the three form types) replies `{success:true, message, type,
  // sheet}` on success and `{success:false, error:'...'}` on failure —
  // not the `{status:'success'|'error', message}` shape the older
  // google-apps-script/Code.gs in this repo documents (that file is not
  // what's behind this endpoint). Checked on `json.success`, not `json.status`,
  // to match what the endpoint actually returns.
  function submitToEndpoint(payload){
    var endpoint = window.SIIRAH_FORMS_ENDPOINT;
    if (!endpoint) return Promise.reject(new Error('endpoint_not_configured'));
    return fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      .then(function(res){ return res.json(); })
      .then(function(json){
        if (!json || !json.success) throw new Error(json && json.error || 'server_error');
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

// ---- Contact section: "01/02" switcher between the career and project
// panels (Phase 5). Exactly one .contact-panel is ever un-hidden (the
// other carries [hidden]) so the section can never show both forms at
// once — see .contact-options / .contact-panel in css/style.css.
(function(){
  var group = document.getElementById('contactOptions');
  if (!group) return;
  var tabs = Array.prototype.slice.call(group.querySelectorAll('.contact-option'));
  var panels = {
    careerPanel: document.getElementById('careerPanel'),
    projectPanel: document.getElementById('projectPanel')
  };

  function activate(targetId){
    tabs.forEach(function(tab){
      var isTarget = tab.getAttribute('aria-controls') === targetId;
      tab.classList.toggle('is-active', isTarget);
      tab.setAttribute('aria-selected', String(isTarget));
    });
    Object.keys(panels).forEach(function(id){
      var panel = panels[id];
      if (!panel) return;
      var show = id === targetId;
      panel.classList.toggle('is-active', show);
      panel.hidden = !show;
    });
  }

  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      activate(tab.getAttribute('aria-controls'));
    });
  });
})();

// ---- Project inquiry form (#inquiryForm) ----
// Phase 5 — trimmed to exactly: First Name, Last Name, Email, Phone,
// Region/City, Message (no company/project/budget/date/services/files —
// see google-apps-script/Code.gs's PROJECT_HEADERS for the matching
// Sheet columns). Shows the same hide-form-and-reveal-a-success-panel
// pattern the careers form already used, for a consistent "professional
// success message" between both forms (spec §8).
(function(){
  var form = document.getElementById('inquiryForm');
  if (!form) return;
  var F = SIIRAHForms;

  var renderedAt = document.getElementById('inqRenderedAt');
  if (renderedAt) renderedAt.value = String(Date.now());

  var submitBtn = document.getElementById('inqSubmitBtn');
  var statusEl = document.getElementById('inqStatus');
  var successEl = document.getElementById('projectSuccess');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    F.clearAllErrors(form);
    F.setStatus(statusEl, null, '');

    var firstName = document.getElementById('inqFirstName').value.trim();
    var lastName = document.getElementById('inqLastName').value.trim();
    var email = document.getElementById('inqEmail').value.trim();
    var phone = document.getElementById('inqPhone').value.trim();
    var region = document.getElementById('inqRegion').value.trim();
    var message = document.getElementById('inqMessage').value.trim();

    var ok = true;
    if (!firstName){ F.setFieldError('inqFirstName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!lastName){ F.setFieldError('inqLastName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!email){ F.setFieldError('inqEmail', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isEmailValid(email)){ F.setFieldError('inqEmail', F.t('يرجى إدخال بريد إلكتروني صحيح.', 'Please enter a valid email address.')); ok = false; }
    if (!phone){ F.setFieldError('inqPhone', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isPhoneValid(phone)){ F.setFieldError('inqPhone', F.t('يرجى إدخال رقم جوال صحيح.', 'Please enter a valid mobile number.')); ok = false; }
    if (!message){ F.setFieldError('inqMessage', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }

    if (!ok){
      F.focusFirstError(form);
      F.setStatus(statusEl, 'error', F.t('يرجى مراجعة الحقول المظللة أعلاه.', 'Please review the highlighted fields above.'));
      return;
    }

    var payload = {
      type: 'project',
      hp: document.getElementById('inqHp').value,
      renderedAt: document.getElementById('inqRenderedAt').value,
      firstName: firstName, lastName: lastName,
      email: email, phone: phone,
      region: region, message: message
    };

    F.setSubmitting(submitBtn, true);
    F.submitToEndpoint(payload)
      .then(function(){
        form.hidden = true;
        if (successEl) successEl.classList.add('is-visible');
      })
      .catch(function(){
        F.setStatus(statusEl, 'error', F.t(
          'حدث خطأ أثناء الإرسال. حاول مرة أخرى.',
          'Something went wrong. Please try again.'
        ));
      })
      .finally(function(){
        F.setSubmitting(submitBtn, false);
      });
  });
})();

// ---- Careers form (#careersForm) ----
// Phase 5 — trimmed to exactly: First Name, Last Name, Email, Phone,
// Message (renamed from "About You"/bio), plus the pre-existing optional
// CV attachment (kept — see the Phase 5 report). Gender, Birth Year,
// Field/Specialization, Desired Position, Years of Experience and
// Portfolio Link are all gone — see google-apps-script/Code.gs's
// CAREERS_HEADERS for the matching Sheet columns.
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

  var submitBtn = document.getElementById('carSubmitBtn');
  var statusEl = document.getElementById('carStatus');
  var successEl = document.getElementById('joinSuccess');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    F.clearAllErrors(form);
    F.setStatus(statusEl, null, '');

    var firstName = document.getElementById('carFirstName').value.trim();
    var lastName = document.getElementById('carLastName').value.trim();
    var email = document.getElementById('carEmail').value.trim();
    var phone = document.getElementById('carPhone').value.trim();
    var message = document.getElementById('carMessage').value.trim();

    var ok = true;
    if (!firstName){ F.setFieldError('carFirstName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!lastName){ F.setFieldError('carLastName', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    if (!email){ F.setFieldError('carEmail', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isEmailValid(email)){ F.setFieldError('carEmail', F.t('يرجى إدخال بريد إلكتروني صحيح.', 'Please enter a valid email address.')); ok = false; }
    if (!phone){ F.setFieldError('carPhone', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }
    else if (!F.isPhoneValid(phone)){ F.setFieldError('carPhone', F.t('يرجى إدخال رقم جوال صحيح.', 'Please enter a valid mobile number.')); ok = false; }
    if (!message){ F.setFieldError('carMessage', F.t('هذا الحقل مطلوب.', 'This field is required.')); ok = false; }

    if (!ok){
      F.focusFirstError(form);
      F.setStatus(statusEl, 'error', F.t('يرجى مراجعة الحقول المظللة أعلاه.', 'Please review the highlighted fields above.'));
      return;
    }

    var payload = {
      type: 'career',
      hp: document.getElementById('carHp').value,
      renderedAt: document.getElementById('carRenderedAt').value,
      firstName: firstName, lastName: lastName,
      email: email, phone: phone, message: message,
      // The live Apps Script's saveAttachments() only reads
      // `attachedFiles` (array of {name, mimeType, data:<base64>}) —
      // verified straight from its deployed source. It never looked at
      // a `cv` field, which is why a CV was accepted by the form but
      // never actually saved to Drive.
      attachedFiles: []
    };

    F.setSubmitting(submitBtn, true);
    var selectedFiles = dropzone.getFiles();
    Promise.all(selectedFiles.map(function(file){
      return F.fileToBase64(file).then(function(base64){
        return { name: file.name, mimeType: file.type, data: base64 };
      });
    }))
      .then(function(encoded){
        payload.attachedFiles = encoded;
        return F.submitToEndpoint(payload);
      })
      .then(function(){
        form.hidden = true;
        if (successEl) successEl.classList.add('is-visible');
      })
      .catch(function(){
        F.setStatus(statusEl, 'error', F.t(
          'حدث خطأ أثناء الإرسال. حاول مرة أخرى.',
          'Something went wrong. Please try again.'
        ));
      })
      .finally(function(){
        F.setSubmitting(submitBtn, false);
      });
  });
})();

// ============================================================
// Phase 3 — "Behind SIIRAH" animated team viewer
// Single-person-at-a-time editorial carousel: one large portrait plus an
// info panel, cross-fading between the three members (see the
// .team-stage/.team-slide/.team-card markup in index.html #team and the
// matching CSS in style.css). All three .team-slide images and
// .team-card text blocks stay in the DOM at all times — this only ever
// toggles which one carries .is-active — so js/i18n.js keeps translating
// every data-en/data-en-alt element on them exactly like the rest of the
// page, and switching language just changes what's already showing.
// ============================================================
(function(){
  var stage = document.getElementById('teamStage');
  if (!stage) return;

  var visual = document.getElementById('teamVisual');
  var cardsWrap = document.getElementById('teamCards');
  if (!visual || !cardsWrap) return;

  var slides = Array.prototype.slice.call(visual.querySelectorAll('.team-slide'));
  var cards = Array.prototype.slice.call(cardsWrap.querySelectorAll('.team-card'));
  var segs = Array.prototype.slice.call(document.querySelectorAll('#teamProgressBar .team-progress-seg'));
  var curEl = document.getElementById('teamProgressCur');
  var prevBtn = document.getElementById('teamPrev');
  var nextBtn = document.getElementById('teamNext');
  var total = slides.length;
  if (!total) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTOPLAY_MS = 7000;
  var current = 0;
  var timer = null;
  var isHovering = false;
  var userInteracted = false;
  var isVisible = true;

  function pad(n){ return (n + 1) < 10 ? ('0' + (n + 1)) : ('' + (n + 1)); }

  function measure(){
    cards.forEach(function(c){ c.style.position = 'static'; });
    var max = 0;
    cards.forEach(function(c){ max = Math.max(max, c.offsetHeight); });
    cards.forEach(function(c){ c.style.position = ''; });
    if (max) cardsWrap.style.minHeight = max + 'px';
  }

  function render(autoFill){
    slides.forEach(function(s, i){ s.classList.toggle('is-active', i === current); });
    cards.forEach(function(c, i){ c.classList.toggle('is-active', i === current); });
    segs.forEach(function(seg, i){
      seg.classList.toggle('is-active', i === current);
      seg.classList.toggle('is-done', i < current);
      seg.setAttribute('aria-current', i === current ? 'true' : 'false');
      var fill = seg.querySelector('.team-progress-fill');
      if (!fill) return;
      fill.style.transition = 'none';
      fill.style.width = (i < current) ? '100%' : '0%';
      if (i === current){
        void fill.offsetWidth; // force reflow before enabling the transition below
        if (autoFill && !reduceMotion){
          fill.style.transition = 'width ' + AUTOPLAY_MS + 'ms linear';
        } else {
          fill.style.transition = 'width .35s ease';
        }
        fill.style.width = '100%';
      }
    });
    if (curEl) curEl.textContent = pad(current);
  }

  function stopAutoplay(){
    if (timer){ clearTimeout(timer); timer = null; }
  }

  function startAutoplay(){
    stopAutoplay();
    if (reduceMotion || userInteracted || isHovering || !isVisible) return;
    render(true);
    timer = setTimeout(function(){
      current = (current + 1) % total;
      startAutoplay();
    }, AUTOPLAY_MS);
  }

  function goTo(index){
    current = ((index % total) + total) % total;
    userInteracted = true;
    stopAutoplay();
    render(false);
  }

  prevBtn && prevBtn.addEventListener('click', function(){ goTo(current - 1); });
  nextBtn && nextBtn.addEventListener('click', function(){ goTo(current + 1); });
  segs.forEach(function(seg, i){ seg.addEventListener('click', function(){ goTo(i); }); });

  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    stage.addEventListener('mouseenter', function(){ isHovering = true; stopAutoplay(); });
    stage.addEventListener('mouseleave', function(){ isHovering = false; startAutoplay(); });
  }

  // touch swipe anywhere on the stage — direction is mirrored under RTL so
  // "forward" always means 01→02→03 regardless of language
  (function(){
    var startX = null, startY = null, tracking = false;
    stage.addEventListener('touchstart', function(e){
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    stage.addEventListener('touchend', function(e){
      if (!tracking || startX === null){ tracking = false; return; }
      tracking = false;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      var isRtl = document.documentElement.dir === 'rtl';
      var forward = isRtl ? (dx > 0) : (dx < 0);
      goTo(forward ? current + 1 : current - 1);
    }, { passive: true });
  })();

  // keyboard: arrow keys bubble up here from the prev/next buttons or a
  // focused progress segment
  stage.addEventListener('keydown', function(e){
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var isRtl = document.documentElement.dir === 'rtl';
    var isNext = isRtl ? (e.key === 'ArrowLeft') : (e.key === 'ArrowRight');
    e.preventDefault();
    goTo(isNext ? current + 1 : current - 1);
  });

  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        isVisible = entry.isIntersecting;
        if (isVisible) startAutoplay(); else stopAutoplay();
      });
    }, { threshold: 0.35 });
    io.observe(stage);
  }

  document.addEventListener('siirah:langchange', function(){ measure(); });
  window.addEventListener('resize', (function(){
    var t;
    return function(){ clearTimeout(t); t = setTimeout(measure, 150); };
  })());
  window.addEventListener('load', measure);
  setTimeout(measure, 60);

  render(false);
  if (!reduceMotion) startAutoplay();
})();

// ============================================================
// Fix (Aug 2026 visual-refinement pass) — this IIFE used to toggle
// .is-scrolling on #clientsMarquee to shrink animation-duration on
// scroll. Changing animation-duration on an already-running infinite
// CSS animation forces the browser to re-time its current progress
// against the new duration, which is what caused the marquee to visibly
// speed up and jump at the loop point. The marquee's motion is (and
// always was) pure CSS `animation` on .marquee-track — see the
// .marquee-track / @keyframes marquee-slide rules in style.css — running
// on its own at one constant duration, so this listener has nothing left
// to do and has been removed rather than left toggling a now-unused class.
// ============================================================