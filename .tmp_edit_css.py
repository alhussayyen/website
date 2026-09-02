import re, sys, io

path = "css/style.css"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

orig_len = len(src)

def must_replace(s, old, new, expect=1, label=""):
    n = s.count(old)
    if n != expect:
        raise SystemExit(f"FAIL [{label}]: expected {expect} occurrence(s), found {n}\n---OLD---\n{old[:300]}")
    return s.replace(old, new, expect)

# ============================================================
# SECTION 1 (services showcase) — mobile: hide vertical icon rail
# ============================================================
old = """  @media (min-width:1025px){
    .svc-track.is-pinned .svc-body{
      grid-template-columns:minmax(100px,150px) 1fr; column-gap:clamp(3.5rem,6vw,5.5rem);
    }
    .svc-track.is-pinned .svc-icons{ gap:2rem; }
    .svc-track.is-pinned .svc-icon .ring-icon svg{ width:36px; height:36px; }
    .svc-panel-title{ font-size:clamp(1.9rem,2.6vw,2.5rem); }
    .svc-panel-desc{ font-size:1.2rem; line-height:1.85; max-width:42ch; }
    .svc-track.is-pinned .svc-panels{ min-height:290px; }
    .services-showcase .svc-scroll-hint svg{ width:26px; height:26px; }
  }"""
new = """  @media (min-width:1025px){
    .svc-track.is-pinned .svc-body{
      grid-template-columns:minmax(100px,150px) 1fr; column-gap:clamp(3.5rem,6vw,5.5rem);
    }
    .svc-track.is-pinned .svc-icons{ gap:2rem; }
    .svc-track.is-pinned .svc-icon .ring-icon svg{ width:36px; height:36px; }
    /* Sep 2026 pass: desktop-only enlargement of the moving service
       content (title/description/progress index) so it reads clearly
       larger and more prominent while scrolling — nav rail (.svc-icons),
       service order and icon sizing are all left untouched per spec. */
    .svc-panel-title{ font-size:clamp(2.2rem,3vw,2.9rem); }
    .svc-panel-desc{ font-size:1.35rem; line-height:1.85; max-width:44ch; }
    .svc-track.is-pinned .svc-progress{ font-size:1rem; }
    .svc-track.is-pinned .svc-panels{ min-height:340px; }
    .services-showcase .svc-scroll-hint svg{ width:26px; height:26px; }
  }

  /* Sep 2026 pass: mobile-only — remove the vertical icon rail
     (.svc-icons) from the pinned services story; nothing else about the
     mobile pinned layout changes (same pin/scroll mechanics, same
     content order). The icon column is dropped from the grid so the
     title/description fill the full width cleanly instead of leaving an
     empty gutter where the rail used to be. */
  @media (max-width:760px){
    .svc-track.is-pinned .svc-icons{ display:none; }
    .svc-track.is-pinned .svc-body{ grid-template-columns:1fr; }
  }"""
src = must_replace(src, old, new, label="svc-1025-block")

# ============================================================
# SECTION 2 (process) — fix oversized icon container + spacing/overlap
# ============================================================
old = """    .process-step{ max-width:44ch; gap:1.75rem; }
    .process-step .ring-icon{
      width:clamp(130px, 10vw, 175px); height:clamp(130px, 10vw, 175px);
      margin-bottom:clamp(1.8rem, 2.6vw, 2.6rem);
    }
    .process-step .ring-icon svg{ width:clamp(58px, 4.5vw, 76px); height:clamp(58px, 4.5vw, 76px); }
    .process-step-num{ font-size:clamp(2rem, 2.8vw, 3.2rem); }
    .process-step-name{ font-size:clamp(2.2rem, 2.8vw, 3.2rem); }
    .process-step-desc{ font-size:clamp(1.1rem, 1.3vw, 1.35rem); line-height:1.8; max-width:40ch; }
    .process-step-arrow svg{ width:30px; height:30px; }"""
new = """    .process-step{ max-width:44ch; gap:1.75rem; }
    /* Sep 2026 fix: the icon's own box used to be much bigger
       (130-175px) than the glyph drawn inside it (58-76px), so the
       visible icon floated in a large invisible box — read as "too much
       empty space above/below the icon". The box now matches the glyph
       size exactly (icon itself unchanged, per spec) and no longer adds
       its own margin-bottom on top of the step's shared gap, which used
       to double up the space below the icon. */
    .process-step .ring-icon{
      width:clamp(58px, 4.5vw, 76px); height:clamp(58px, 4.5vw, 76px);
      margin-bottom:0;
    }
    .process-step .ring-icon svg{ width:clamp(58px, 4.5vw, 76px); height:clamp(58px, 4.5vw, 76px); }
    .process-step-num{ font-size:clamp(2rem, 2.8vw, 3.2rem); }
    .process-step-name{ font-size:clamp(2.2rem, 2.8vw, 3.2rem); }
    .process-step-desc{ font-size:clamp(1.1rem, 1.3vw, 1.35rem); line-height:1.8; max-width:40ch; }
    .process-step-arrow svg{ width:30px; height:30px; }"""
src = must_replace(src, old, new, label="process-icon-spacing")

old = """    .process-track.is-pinned .process-progress{ gap:.85rem; }
    .process-track.is-pinned .process-progress-count{ font-size:1.05rem; }
    .process-track.is-pinned .process-progress-dots i{ width:7px; height:7px; }

    .process-track.is-pinned .process-steps{ min-height:20rem; }
    .process-track.is-pinned .process-shared-arrow svg{ width:30px; height:30px; }
  }"""
new = """    .process-track.is-pinned .process-progress{ gap:.85rem; }
    .process-track.is-pinned .process-progress-count{ font-size:1.05rem; }
    .process-track.is-pinned .process-progress-dots i{ width:7px; height:7px; }

    /* Sep 2026 fix: raised so the tallest step (icon + number + name +
       a multi-line description) always fits inside this box without
       spilling into the head above or the progress/dots+arrow below —
       that overflow, not any one element's own size, was the real cause
       of the reported overlap. */
    .process-track.is-pinned .process-steps{ min-height:clamp(24rem, 28vw, 28rem); }
    .process-track.is-pinned .process-shared-arrow svg{ width:30px; height:30px; }
  }"""
src = must_replace(src, old, new, label="process-steps-minheight")

# ---- unscope the process pin mechanics so they also run on mobile ----
old = """  .process-shared-arrow{ display:none; }

  @media (min-width:761px){
    /* Fix (Sep 2026 visual-refinement pass): see the matching comment on
       #differentiators above — same root cause, same fix. .process-head
       now lives inside .process-stage-inner (see index.html) as the
       first, constant item of a flex column, instead of being a
       separately-sticky sibling that got shrunk/hidden to avoid
       overlapping .process-stage's own sticky box. .process-stage is the
       only sticky element now; only .process-progress + .process-steps
       below the head update as the active step changes. */
    .process-track.is-pinned{ height:420vh; }
    .process-track.is-pinned .process-triggers{ position:absolute; inset:0; display:flex; flex-direction:column; pointer-events:none; }
    .process-track.is-pinned .process-trigger{ flex:1 0 0; }
    .process-track.is-pinned .process-stage{ position:sticky; top:0; height:100vh; height:100dvh; display:flex; align-items:stretch; overflow:hidden; }
    .process-track.is-pinned .process-stage-inner{
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      width:100%; height:100%;
      padding-block:clamp(3.5rem,6vw,5rem);
    }
    .process-track.is-pinned .process-head{ flex:none; margin-bottom:clamp(1.25rem,2.5vw,2rem); }
    .process-track.is-pinned .process-steps{
      flex:none; min-height:clamp(260px,30vw,360px); position:relative;
      display:flex; align-items:center; justify-content:center; width:100%;
    }
    .process-track.is-pinned .process-progress{
      flex:none; display:flex; flex-direction:column; align-items:center; gap:.6rem;
      position:static; margin:clamp(1.1rem,2.2vw,1.75rem) 0 0;
    }
    .process-track.is-pinned .process-step .process-step-arrow{ display:none; }
    .process-track.is-pinned .process-shared-arrow{ display:block; margin-top:.6rem; transition:opacity .4s var(--ease-soft); }
    .process-track.is-pinned .process-shared-arrow.is-hidden{ opacity:0; }
    .process-track.is-pinned .process-step{
      position:absolute; inset:0; margin:auto; height:max-content; max-width:34ch;
      opacity:0; transform:translateY(28px) scale(.96); pointer-events:none;
      transition:opacity .6s var(--ease-soft), transform .6s var(--ease-soft);
    }
    .process-track.is-pinned .process-step.is-active{ opacity:1; transform:none; pointer-events:auto; }
    .process-track.is-pinned .process-step.is-past{ transform:translateY(-28px) scale(.96); }
  }

  @media (max-width:800px){"""
new = """  .process-shared-arrow{ display:none; }

  /* Sep 2026 pass: the pinned scroll-through story (same technique as
     #services) now runs at EVERY width, including mobile — per spec,
     mobile should use the exact same navigation/interaction concept as
     desktop, just sized for a phone screen (see the max-width:760px
     block further down + js/script.js, which no longer gates this
     behind a min-width:761px check). Previously this whole block only
     ran from 761px up, and mobile stayed a plain static list. */
  .process-track.is-pinned{ height:420vh; }
  .process-track.is-pinned .process-triggers{ position:absolute; inset:0; display:flex; flex-direction:column; pointer-events:none; }
  .process-track.is-pinned .process-trigger{ flex:1 0 0; }
  .process-track.is-pinned .process-stage{ position:sticky; top:0; height:100vh; height:100dvh; display:flex; align-items:stretch; overflow:hidden; }
  .process-track.is-pinned .process-stage-inner{
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    width:100%; height:100%;
    padding-block:clamp(3.5rem,6vw,5rem);
  }
  .process-track.is-pinned .process-head{ flex:none; margin-bottom:clamp(1.25rem,2.5vw,2rem); }
  .process-track.is-pinned .process-steps{
    flex:none; min-height:clamp(260px,30vw,360px); position:relative;
    display:flex; align-items:center; justify-content:center; width:100%;
  }
  .process-track.is-pinned .process-progress{
    flex:none; display:flex; flex-direction:column; align-items:center; gap:.6rem;
    position:static; margin:clamp(1.1rem,2.2vw,1.75rem) 0 0;
  }
  .process-track.is-pinned .process-step .process-step-arrow{ display:none; }
  .process-track.is-pinned .process-shared-arrow{ display:block; margin-top:.6rem; transition:opacity .4s var(--ease-soft); }
  .process-track.is-pinned .process-shared-arrow.is-hidden{ opacity:0; }
  .process-track.is-pinned .process-step{
    position:absolute; inset:0; margin:auto; height:max-content; max-width:34ch;
    opacity:0; transform:translateY(28px) scale(.96); pointer-events:none;
    transition:opacity .6s var(--ease-soft), transform .6s var(--ease-soft);
  }
  .process-track.is-pinned .process-step.is-active{ opacity:1; transform:none; pointer-events:auto; }
  .process-track.is-pinned .process-step.is-past{ transform:translateY(-28px) scale(.96); }

  /* Mobile sizing for the now-pinned story: smaller icon box, tighter
     paddings and a lower min-height so a full step (icon + number + name
     + description) always fits one small phone screen without
     overlapping the head above it or the progress dots/arrow below it. */
  @media (max-width:760px){
    .process-track.is-pinned .process-stage-inner{ padding-block:clamp(6.5rem,20vw,8rem) 1.5rem; }
    .process-track.is-pinned .process-head{ margin-bottom:1rem; }
    .process-track.is-pinned .process-steps{ min-height:clamp(230px,58vw,300px); }
    .process-track.is-pinned .process-step{ max-width:30ch; gap:.65rem; }
    .process-step .ring-icon{ margin-bottom:0; }
  }

  @media (max-width:800px){"""
src = must_replace(src, old, new, label="process-unscope-pin")

# ============================================================
# SECTION 3 (differentiators) — unscope pin mechanics for mobile +
# further desktop enlargement (title/desc/icon)
# ============================================================
old = """  .diff-panel-mark{ color:var(--accent); display:block; }
  .diff-panel-mark svg{ width:34px; height:34px; }
  .diff-panel-title{ font-family:var(--font-primary); font-weight:700; font-size:clamp(1.4rem,2.2vw,1.8rem); }
  .diff-panel-desc{ color:var(--ink-soft); font-weight:300; font-size:1.02rem; line-height:1.85; }

  @media (min-width:761px){
    /* Fix (Sep 2026 visual-refinement pass): "وش اللي يميز سيرة؟" used to
       be a SEPARATELY sticky sibling before .diff-track (top:92px),
       independent from .diff-stage's own sticky box (top:0, height:100vh)
       inside .diff-track — once .diff-stage pinned, its full-viewport-tall
       sticky box sat directly under the head's, so the only way to keep
       them from visually colliding was to shrink the head down to a
       compact single-line label and hide its accent mark — exactly the
       "shrunk the text, hid the phrase" regression the client flagged.
       The real fix is architectural, not cosmetic: .diff-head now lives
       INSIDE .diff-stage-inner (see index.html), as the first, constant
       item of a flex column, with the two-column index+panel reading
       (now .diff-body, previously the direct content of .diff-stage-inner)
       filling the remaining height below it. .diff-stage is the only
       sticky element left, so there is nothing for the head to collide
       with — the title is never resized and the mark is never hidden;
       only .diff-body updates as the active point changes. */
    .diff-track.is-pinned{ height:280vh; }
    .diff-track.is-pinned .diff-triggers{ position:absolute; inset:0; display:flex; flex-direction:column; pointer-events:none; }
    .diff-track.is-pinned .diff-trigger{ flex:1 0 0; }
    .diff-track.is-pinned .diff-stage{ position:sticky; top:0; height:100vh; height:100dvh; display:flex; align-items:stretch; overflow:hidden; }
    .diff-track.is-pinned .diff-stage-inner{
      display:flex; flex-direction:column; align-items:center; width:100%; height:100%;
      padding-block:clamp(7rem,11vw,9rem) 2.5rem;
    }
    .diff-track.is-pinned .diff-head{ flex:none; margin-bottom:clamp(1.5rem,3vw,2.25rem); }

    .diff-track.is-pinned .diff-body{
      flex:1 1 auto; min-height:0; width:100%; display:grid;
      grid-template-columns:minmax(120px,180px) 1fr;
      align-items:center; column-gap:clamp(3rem,6vw,5rem);
    }
    .diff-track.is-pinned .diff-index{
      display:flex; flex-direction:column; gap:1.4rem;
      padding-inline-end:clamp(2rem,4vw,3rem); border-inline-end:1px solid var(--line);
    }
    .diff-track.is-pinned .diff-index-item{
      font-family:var(--font-primary); font-weight:300; font-size:1.4rem; color:var(--ink-faint);
      transition:color .4s var(--ease-soft), font-weight .4s var(--ease-soft), font-size .4s var(--ease-soft);
    }
    .diff-track.is-pinned .diff-index-item.is-active{ color:var(--ink); font-weight:700; font-size:2rem; }
    .diff-track.is-pinned .diff-index-item.is-done{ color:var(--ink-soft); }

    .diff-track.is-pinned .diff-display{ position:relative; }
    .diff-track.is-pinned .diff-progress{
      display:block; margin-bottom:1.5rem; font-family:var(--font-primary); font-weight:600;
      font-size:.85rem; letter-spacing:var(--ls-meta); color:var(--ink-faint);
    }
    .diff-track.is-pinned .diff-panels{ position:relative; min-height:220px; display:block; }
    .diff-track.is-pinned .diff-panel{
      position:absolute; inset-inline-start:0; top:0; width:100%;
      align-items:flex-start; text-align:start; margin:0; max-width:44ch;
      padding-bottom:0; border-bottom:none;
      opacity:0; transform:translateY(24px); pointer-events:none;
      transition:opacity .6s var(--ease-soft), transform .6s var(--ease-soft);
    }
    .diff-track.is-pinned .diff-panel.is-active{ opacity:1; transform:none; pointer-events:auto; }
    .diff-track.is-pinned .diff-panel.is-past{ transform:translateY(-24px); }
  }

  @media (max-width:800px){"""
new = """  .diff-panel-mark{ color:var(--accent); display:block; }
  .diff-panel-mark svg{ width:34px; height:34px; }
  .diff-panel-title{ font-family:var(--font-primary); font-weight:700; font-size:clamp(1.4rem,2.2vw,1.8rem); }
  .diff-panel-desc{ color:var(--ink-soft); font-weight:300; font-size:1.02rem; line-height:1.85; }

  /* Sep 2026 pass: pin mechanics unscoped from min-width:761px so the
     same pinned index+panel story also runs on mobile (see
     js/script.js, which no longer gates this behind a desktop-only
     media query) — same navigation idea/interaction as desktop, sized
     down for phones in the max-width:760px block further down. */
  /* Fix (Sep 2026 visual-refinement pass): "وش اللي يميز سيرة؟" used to
     be a SEPARATELY sticky sibling before .diff-track (top:92px),
     independent from .diff-stage's own sticky box (top:0, height:100vh)
     inside .diff-track — once .diff-stage pinned, its full-viewport-tall
     sticky box sat directly under the head's, so the only way to keep
     them from visually colliding was to shrink the head down to a
     compact single-line label and hide its accent mark — exactly the
     "shrunk the text, hid the phrase" regression the client flagged.
     The real fix is architectural, not cosmetic: .diff-head now lives
     INSIDE .diff-stage-inner (see index.html), as the first, constant
     item of a flex column, with the two-column index+panel reading
     (now .diff-body, previously the direct content of .diff-stage-inner)
     filling the remaining height below it. .diff-stage is the only
     sticky element left, so there is nothing for the head to collide
     with — the title is never resized and the mark is never hidden;
     only .diff-body updates as the active point changes. */
  .diff-track.is-pinned{ height:280vh; }
  .diff-track.is-pinned .diff-triggers{ position:absolute; inset:0; display:flex; flex-direction:column; pointer-events:none; }
  .diff-track.is-pinned .diff-trigger{ flex:1 0 0; }
  .diff-track.is-pinned .diff-stage{ position:sticky; top:0; height:100vh; height:100dvh; display:flex; align-items:stretch; overflow:hidden; }
  .diff-track.is-pinned .diff-stage-inner{
    display:flex; flex-direction:column; align-items:center; width:100%; height:100%;
    padding-block:clamp(7rem,11vw,9rem) 2.5rem;
  }
  .diff-track.is-pinned .diff-head{ flex:none; margin-bottom:clamp(1.5rem,3vw,2.25rem); }

  .diff-track.is-pinned .diff-body{
    flex:1 1 auto; min-height:0; width:100%; display:grid;
    grid-template-columns:minmax(120px,180px) 1fr;
    align-items:center; column-gap:clamp(3rem,6vw,5rem);
  }
  .diff-track.is-pinned .diff-index{
    display:flex; flex-direction:column; gap:1.4rem;
    padding-inline-end:clamp(2rem,4vw,3rem); border-inline-end:1px solid var(--line);
  }
  .diff-track.is-pinned .diff-index-item{
    font-family:var(--font-primary); font-weight:300; font-size:1.4rem; color:var(--ink-faint);
    transition:color .4s var(--ease-soft), font-weight .4s var(--ease-soft), font-size .4s var(--ease-soft);
  }
  .diff-track.is-pinned .diff-index-item.is-active{ color:var(--ink); font-weight:700; font-size:2rem; }
  .diff-track.is-pinned .diff-index-item.is-done{ color:var(--ink-soft); }

  .diff-track.is-pinned .diff-display{ position:relative; }
  .diff-track.is-pinned .diff-progress{
    display:block; margin-bottom:1.5rem; font-family:var(--font-primary); font-weight:600;
    font-size:.85rem; letter-spacing:var(--ls-meta); color:var(--ink-faint);
  }
  .diff-track.is-pinned .diff-panels{ position:relative; min-height:220px; display:block; }
  .diff-track.is-pinned .diff-panel{
    position:absolute; inset-inline-start:0; top:0; width:100%;
    align-items:flex-start; text-align:start; margin:0; max-width:44ch;
    padding-bottom:0; border-bottom:none;
    opacity:0; transform:translateY(24px); pointer-events:none;
    transition:opacity .6s var(--ease-soft), transform .6s var(--ease-soft);
  }
  .diff-track.is-pinned .diff-panel.is-active{ opacity:1; transform:none; pointer-events:auto; }
  .diff-track.is-pinned .diff-panel.is-past{ transform:translateY(-24px); }

  /* Mobile sizing for the now-pinned story: narrower index rail, smaller
     type, lower min-height so it fits a phone screen without overlap or
     clipping. */
  @media (max-width:760px){
    .diff-track.is-pinned .diff-stage-inner{ padding-block:clamp(6.5rem,20vw,8rem) 1.5rem; }
    .diff-track.is-pinned .diff-head{ margin-bottom:1rem; }
    .diff-track.is-pinned .diff-body{ grid-template-columns:minmax(64px,86px) 1fr; column-gap:1.5rem; }
    .diff-track.is-pinned .diff-index{ gap:.9rem; padding-inline-end:1rem; }
    .diff-track.is-pinned .diff-index-item{ font-size:1.05rem; }
    .diff-track.is-pinned .diff-index-item.is-active{ font-size:1.5rem; }
    .diff-track.is-pinned .diff-panels{ min-height:clamp(200px,54vw,260px); }
    .diff-track.is-pinned .diff-panel{ max-width:26ch; }
  }

  @media (max-width:800px){"""
src = must_replace(src, old, new, label="diff-unscope-pin")

old = """    .diff-index-item{ font-size:1.6rem; }
    .diff-track.is-pinned .diff-index{ gap:1.75rem; }
    .diff-track.is-pinned .diff-index-item{ font-size:1.6rem; }
    .diff-track.is-pinned .diff-index-item.is-active{ font-size:2.4rem; }
    .diff-track.is-pinned .diff-body{ grid-template-columns:minmax(140px,200px) 1fr; column-gap:clamp(3.5rem,6vw,6rem); }
    .diff-panel-mark svg{ width:46px; height:46px; }
    .diff-panel-title{ font-size:clamp(1.9rem, 2.6vw, 2.5rem); }
    .diff-panel-desc{ font-size:1.2rem; line-height:1.85; max-width:42ch; }
    .diff-track.is-pinned .diff-panels{ min-height:290px; }
  }"""
new = """    .diff-index-item{ font-size:1.7rem; }
    .diff-track.is-pinned .diff-index{ gap:1.85rem; }
    .diff-track.is-pinned .diff-index-item{ font-size:1.7rem; }
    .diff-track.is-pinned .diff-index-item.is-active{ font-size:2.6rem; }
    .diff-track.is-pinned .diff-body{ grid-template-columns:minmax(150px,210px) 1fr; column-gap:clamp(3.5rem,6vw,6rem); }
    /* Sep 2026 pass: content enlarged further per spec (icon/visual mark,
       title and description all clearly bigger) — navigation idea and
       order are unchanged, sizing only. */
    .diff-panel-mark svg{ width:58px; height:58px; }
    .diff-panel-title{ font-size:clamp(2.2rem, 2.9vw, 2.85rem); }
    .diff-panel-desc{ font-size:1.32rem; line-height:1.85; max-width:44ch; }
    .diff-track.is-pinned .diff-panels{ min-height:340px; }
  }"""
src = must_replace(src, old, new, label="diff-1025-enlarge")

# ============================================================
# SECTION 4 (behind-siirah) — black-edge root cause fix + center caption
# ============================================================
old = """  .behind-item{ position:relative; border-radius:var(--radius-lg); overflow:hidden; background:#141412; }
  /* img is drawn 1px past each edge (instead of a flush inset:0) so no
     sub-pixel rounding gap between the grid track's fractional height and
     the image box can ever show the dark .behind-item background through
     as a hairline — this was the cause of the black line under the photo.
     The image file itself is never touched. */
  .behind-item img{ position:absolute; inset:-1px; width:calc(100% + 2px); height:calc(100% + 2px); object-fit:cover; }

  .behind-caption{
    flex:0 0 auto; width:clamp(180px,27%,260px);
    display:flex; flex-direction:column; justify-content:center; align-items:flex-start;
    gap:1.4rem;
  }
  .behind-snap-text{
    font-family:var(--font-primary); font-weight:700; font-size:clamp(1.15rem,1.8vw,1.5rem);
    line-height:1.5; text-wrap:balance;
  }"""
new = """  /* Sep 2026 fix (root cause): the container's own fallback background
     was near-black (#141412). object-fit:cover always fills the box, so
     that color was never meant to be visible behind a loaded photo — but
     any sub-pixel rounding gap between the grid track's fractional
     height and the image box (or a not-yet-loaded lazy image) showed
     this dark fill through as a black edge/line. Background now matches
     the page instead of black, and the image's own overhang is widened
     (1px -> 3px) for a bigger safety margin against that rounding gap —
     so nothing dark can ever show at the photo's edges. Image files and
     object-fit:cover (no letterboxing) are both untouched. */
  .behind-item{ position:relative; border-radius:var(--radius-lg); overflow:hidden; background:var(--white); }
  .behind-item img{ position:absolute; inset:-3px; width:calc(100% + 6px); height:calc(100% + 6px); object-fit:cover; }

  .behind-caption{
    flex:0 0 auto; width:clamp(180px,27%,260px);
    display:flex; flex-direction:column; justify-content:center; align-items:center;
    text-align:center; gap:1.4rem;
  }
  .behind-snap-text{
    font-family:var(--font-primary); font-weight:700; font-size:clamp(1.15rem,1.8vw,1.5rem);
    line-height:1.5; text-wrap:balance; text-align:center;
  }"""
src = must_replace(src, old, new, label="behind-black-edge-and-center")

old = """  @media (max-width:800px){
    .behind-composition{ flex-direction:column; gap:1.75rem; }
    .behind-gallery{
      grid-template-columns:1fr; grid-template-areas:"a" "b";
      grid-auto-rows:auto; gap:1rem;
    }
    .behind-item{ aspect-ratio:4/3; }
    .behind-caption{ width:auto; align-items:flex-start; justify-content:flex-start; gap:1.25rem; }
  }"""
new = """  @media (max-width:800px){
    .behind-composition{ flex-direction:column; gap:1.75rem; }
    .behind-gallery{
      grid-template-columns:1fr; grid-template-areas:"a" "b";
      grid-auto-rows:auto; gap:1rem;
    }
    .behind-item{ aspect-ratio:4/3; }
    .behind-caption{ width:auto; align-items:center; justify-content:center; text-align:center; gap:1.25rem; }
  }"""
src = must_replace(src, old, new, label="behind-mobile-center")

# ============================================================
# SECTION 5 (clients) — static grid instead of animated marquee
# ============================================================
old = """  .clients-marquee{
    margin-top:2rem; display:flex; flex-direction:column; gap:.9rem;
  }
  .marquee-row{
    position:relative; overflow:hidden; width:100%;
    -webkit-mask-image:linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
    mask-image:linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
  }
  .marquee-track{
    display:flex; align-items:center; width:max-content;
    animation:marquee-slide 42s linear infinite;
  }
  .marquee-row-2 .marquee-track{ animation-direction:reverse; animation-duration:48s; }
  /* Fix (Aug 2026 visual-refinement pass): this used to shrink
     animation-duration to 16s/19s on scroll (via a .is-scrolling class —
     see js/script.js, now removed). Changing animation-duration on an
     already-running infinite CSS animation makes the browser re-time the
     current progress against the new duration, which is exactly what
     produced the reported "speeds up, then jumps at the repeat point"
     glitch. The marquee itself was always seamless (identical
     .marquee-set copies per track, translateX = exactly one set width —
     a real infinite loop, nothing to fix there; copy count/percentage
     since raised from 2/-50% to 4/-25%, see the keyframe comment below);
     removing the
     duration change makes the one already-constant, already-smooth speed
     the only speed, so there's nothing left to jump. */
  .marquee-set{ display:flex; align-items:center; flex:none; }
  .marquee-logo{
    flex:none; display:flex; align-items:center; justify-content:center;
    width:clamp(96px,11vw,148px); height:clamp(42px,6vw,60px);
    margin:0 clamp(1rem,3vw,2.25rem);
  }
  /* Fix (Aug 2026 visual-refinement pass): logos used to render
     grayscale/dimmed by default (filter:grayscale(1) opacity(.8)) and
     only regain their real color on hover — exactly the "colors get
     removed/changed near the mouse" behavior asked to go. Logos now show
     their natural color at all times; no filter added in its place, and
     no other hover/animation existed on this element to preserve (the
     marquee's own scroll motion is untouched, see .marquee-track below). */
  .marquee-logo img{
    width:100%; height:100%; object-fit:contain;
  }

  /* Aug 2026 visual-refinement pass: 2 copies per track (1 real +
     1 aria-hidden duplicate) only ever covered ~2 set-widths, so on very
     wide desktop monitors the track could run out of copies before the
     next loop, showing a blank gap for an instant — exactly what "لا
     أريد فراغ بعد آخر شعار" asks to avoid. Now 4 identical copies per
     track (1 real + 3 aria-hidden), so translateX(-25%) — one quarter of
     the total 4-set track width — still equals exactly one set's width,
     keeping the same seamless reset point, but with 2 full extra set-
     widths of margin before a gap could ever show, comfortably covering
     any realistic desktop viewport. */
  @keyframes marquee-slide{
    from{ transform:translateX(0); }
    to{ transform:translateX(-25%); }
  }

  @media (min-width:761px){
    /* Aug 2026 visual-refinement pass: #clients used to read as a minor
       strip (~2.5-3.5rem padding, body-size heading) rather than a real
       section — enlarged here to match the presence of the site's other
       major sections (Behind SIIRAH, Differentiators), per client
       request ("القسم حاليًا ضيق جدًا"). Two-row marquee mechanics, the
       seamless loop, and the logo images themselves are all untouched —
       sizing/spacing only. Mobile (<=760px block below) is untouched. */
    .clients{ padding:clamp(6rem, 11vw, 10rem) 0; }
    .clients-head p{ margin-top:1rem; font-size:1.2rem; }
    .clients-marquee{ margin-top:3.5rem; gap:1.5rem; }
    .marquee-logo{
      width:clamp(120px,13vw,180px); height:clamp(52px,7vw,72px);
      margin:0 clamp(1.5rem,3.5vw,2.75rem);
    }
  }

  @media (max-width:760px){
    /* Audit fix carried over from the previous markup: .clients{padding:
       clamp(...)} (above) overrides .sec-pad's own padding (same
       specificity, .clients declared later), so #clients only got a
       small top padding on phone widths — less than the fixed mobile
       header's ~91px height. Reachable directly via the "العملاء" nav
       link, so a click landed with "عملاؤنا" partly covered. padding-
       bottom is left exactly as authored; only padding-top is raised
       here, mobile-only, enough to clear the header with a small
       comfortable gap. */
    .clients{ padding-top:calc(2.4rem + 43px + 1rem); }
    .clients-marquee{ margin-top:1.5rem; gap:.6rem; }
    .marquee-logo{ width:clamp(76px,22vw,108px); height:clamp(34px,9vw,46px); margin:0 clamp(.65rem,4vw,1.25rem); }
    .marquee-track{ animation-duration:34s; }
    .marquee-row-2 .marquee-track{ animation-duration:39s; }
    /* .is-scrolling duration overrides removed here too — same reason as
       the desktop rule above. */
  }

  @media (prefers-reduced-motion: reduce){
    .marquee-track{ animation:none !important; transform:none !important; }
    .marquee-set[aria-hidden="true"]{ display:none; }
    .marquee-row{ overflow-x:auto; -webkit-mask-image:none; mask-image:none; }
  }"""
new = """  /* Sep 2026 pass: replaced the auto-scrolling marquee with a static,
     evenly-balanced grid of the same 10 client logos — no motion, no
     auto-scroll, nothing added or removed from the logo set itself.
     Fixed-size boxes + object-fit:contain (same convention the old
     marquee already used) keep every logo's own aspect ratio intact. */
  .clients-grid{
    margin-top:2rem; display:grid; grid-template-columns:repeat(5,minmax(0,1fr));
    gap:1.5rem 1rem; align-items:center; justify-items:center;
  }
  .clients-logo{
    width:100%; max-width:148px; height:clamp(52px,7vw,72px);
    display:flex; align-items:center; justify-content:center;
  }
  .clients-logo img{ width:100%; height:100%; object-fit:contain; }

  @media (min-width:761px){
    /* Aug 2026 visual-refinement pass: #clients used to read as a minor
       strip (~2.5-3.5rem padding, body-size heading) rather than a real
       section — enlarged here to match the presence of the site's other
       major sections (Behind SIIRAH, Differentiators), per client
       request ("القسم حاليًا ضيق جدًا"). The logo images themselves are
       untouched — sizing/spacing only. Mobile (<=760px block below) is
       untouched. */
    .clients{ padding:clamp(6rem, 11vw, 10rem) 0; }
    .clients-head p{ margin-top:1rem; font-size:1.2rem; }
    .clients-grid{ margin-top:3.5rem; gap:2.25rem 1.5rem; }
    .clients-logo{ max-width:170px; height:clamp(56px,7vw,76px); }
  }

  @media (max-width:760px){
    /* Audit fix carried over from the previous markup: .clients{padding:
       clamp(...)} (above) overrides .sec-pad's own padding (same
       specificity, .clients declared later), so #clients only got a
       small top padding on phone widths — less than the fixed mobile
       header's ~91px height. Reachable directly via the "العملاء" nav
       link, so a click landed with "عملاؤنا" partly covered. padding-
       bottom is left exactly as authored; only padding-top is raised
       here, mobile-only, enough to clear the header with a small
       comfortable gap. */
    .clients{ padding-top:calc(2.4rem + 43px + 1rem); }
    .clients-grid{ grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.5rem .75rem; margin-top:1.75rem; }
    .clients-logo{ height:clamp(38px,10vw,50px); }
  }"""
src = must_replace(src, old, new, label="clients-static-grid")

# ============================================================
# SECTION 6 (social proof) — single Twitter/X card, centered
# ============================================================
old = """  .social-proof-grid{
    margin-top:3rem;
    display:grid; grid-template-columns:1fr; gap:1.25rem;
  }"""
new = """  .social-proof-grid{
    margin-top:3rem;
    display:grid; grid-template-columns:1fr; gap:1.25rem;
    max-width:420px; margin-inline:auto;
  }"""
src = must_replace(src, old, new, label="social-proof-grid-single")

old = """  @media (min-width:761px){
    .social-proof-grid{ grid-template-columns:repeat(2,1fr); gap:1.5rem; }
  }"""
new = """  /* Sep 2026 pass: only the Twitter/X card remains (see index.html),
     so the grid stays a single centered column at every width instead
     of the old 2-column desktop layout, which would otherwise leave a
     lone card with an empty gap beside it. */"""
src = must_replace(src, old, new, label="social-proof-remove-2col")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("OK, wrote", path, "chars before/after:", orig_len, len(src))
