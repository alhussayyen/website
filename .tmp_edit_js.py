path = "js/script.js"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

orig_len = len(src)

def must_replace(s, old, new, expect=1, label=""):
    n = s.count(old)
    if n != expect:
        raise SystemExit(f"FAIL [{label}]: expected {expect} occurrence(s), found {n}\n---OLD (first 400)---\n{old[:400]}")
    return s.replace(old, new, expect)

# ============================================================
# Process: pinned story now runs at EVERY width (mobile included),
# same technique as #services — no more min-width:761px gate.
# ============================================================
old = """  // ---- Process (Phase 4): "how we work" scroll story ----
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
    const sharedArrow = document.getElementById('processSharedArrow');
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
      // no arrow after the last step ("تسليم") — matches the per-step
      // markup, which never had a process-step-arrow on step 6 either.
      if (sharedArrow) sharedArrow.classList.toggle('is-hidden', idx === steps.length - 1);
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
  })();"""
new = """  // ---- Process (Phase 4): "how we work" scroll story ----
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
  })();"""
src = must_replace(src, old, new, label="process-js-unscope")

# ============================================================
# Differentiators: pinned story now runs at EVERY width (mobile
# included), same technique as #services — no more min-width:761px
# gate / no more separate "gentle emphasis" fallback for mobile.
# ============================================================
old = """  // ---- Differentiators (Phase 5): "why SIIRAH" scroll story ----
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
  })();"""
new = """  // ---- Differentiators (Phase 5): "why SIIRAH" scroll story ----
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
  })();"""
src = must_replace(src, old, new, label="diff-js-unscope")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("OK, wrote", path, "chars before/after:", orig_len, len(src))
