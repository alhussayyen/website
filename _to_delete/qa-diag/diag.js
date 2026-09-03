const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname);
const URL = 'http://127.0.0.1:4173/index.html';

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

// sections with a direct nav link (native hash jump)
const navSections = ['about', 'services', 'work', 'clients', 'products', 'contact'];
// pinned scroll-story sections (no direct nav link, reached only by scrolling)
const pinnedSections = ['services', 'process', 'differentiators'];

async function measure(page, id) {
  return await page.evaluate((id) => {
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
    const header = document.querySelector('header.site-nav');
    const sec = document.getElementById(id);
    if (!sec) return { error: 'no section ' + id };
    const secRect = sec.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    // heading element heuristics
    const headingSelMap = {
      services: '.svc-head h2, .svc-title',
      process: '.process-title',
      differentiators: '.diff-title',
      work: '.pf-heading',
      about: '.about h2',
      clients: '.clients h2, .clients-head h2',
      products: '.products h2',
      contact: '.contact h2',
    };
    const headSel = headingSelMap[id];
    let headRect = null;
    if (headSel) {
      const h = sec.querySelector(headSel);
      if (h) headRect = h.getBoundingClientRect();
    }
    // next / prev sibling top-level section
    let node = sec.nextElementSibling;
    while (node && node.tagName !== 'SECTION') node = node.nextElementSibling;
    const nextRect = node ? node.getBoundingClientRect() : null;
    let pnode = sec.previousElementSibling;
    while (pnode && pnode.tagName !== 'SECTION') pnode = pnode.previousElementSibling;
    const prevRect = pnode ? pnode.getBoundingClientRect() : null;

    return {
      headerH,
      headerBottom: headerRect.bottom,
      vh: window.innerHeight,
      scrollY: window.scrollY,
      sec: { top: secRect.top, bottom: secRect.bottom, height: secRect.height },
      heading: headRect ? { top: headRect.top, bottom: headRect.bottom, text: (sec.querySelector(headSel)||{}).textContent } : null,
      next: nextRect ? { id: node.id, top: nextRect.top } : null,
      prev: prevRect ? { id: pnode.id, bottom: prevRect.bottom } : null,
      isPinnedTrack: !!sec.querySelector('.svc-track.is-pinned, .process-track.is-pinned, .diff-track.is-pinned'),
    };
  }, id);
}

(async () => {
  const browser = await chromium.launch();
  const results = {};

  for (const [vpName, vp] of Object.entries(viewports)) {
    results[vpName] = {};
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();

    // --- A: native hash-jump landing (like clicking the nav bar) ---
    for (const id of navSections) {
      await page.goto(URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.goto(URL + '#' + id, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900); // allow Lenis / soft-settle to finish
      const m = await measure(page, id);
      results[vpName]['hashjump_' + id] = m;
      await page.screenshot({ path: path.join(OUT, `hashjump_${vpName}_${id}.png`) });
    }

    // --- B: natural incremental scroll through the whole page, capturing
    // a screenshot + measurement each time a target section's top crosses
    // near the header bottom ---
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const scrollTargets = ['services', 'process', 'differentiators', 'work'];
    let remaining = new Set(scrollTargets);
    let lastScrollY = -1;
    let stableCount = 0;
    for (let i = 0; i < 400 && remaining.size > 0 && stableCount < 5; i++) {
      await page.mouse.wheel(0, 220);
      await page.waitForTimeout(120);
      const sy = await page.evaluate(() => window.scrollY);
      if (Math.abs(sy - lastScrollY) < 1) stableCount++; else stableCount = 0;
      lastScrollY = sy;
      for (const id of Array.from(remaining)) {
        const near = await page.evaluate((id) => {
          const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
          const el = document.getElementById(id);
          if (!el) return false;
          const top = el.getBoundingClientRect().top;
          return Math.abs(top - headerH) < 15;
        }, id);
        if (near) {
          await page.waitForTimeout(600); // let soft-settle finish
          const m = await measure(page, id);
          results[vpName]['scroll_' + id] = m;
          await page.screenshot({ path: path.join(OUT, `scroll_${vpName}_${id}.png`) });
          remaining.delete(id);
        }
      }
    }
    for (const id of remaining) {
      results[vpName]['scroll_' + id] = { error: 'never reached near-header threshold' };
    }

    await context.close();
  }

  await browser.close();
  require('fs').writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log('DONE');
})();
