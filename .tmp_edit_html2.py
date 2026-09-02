import re

path = "index.html"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

orig_len = len(src)

start_marker = '<!-- Phase 3 (Behind SIIRAH / Clients revamp) — infinite two-row logo'
end_marker = '</section>'

start_idx = src.index(start_marker)
end_idx = src.index(end_marker, start_idx)  # boundary sits right before </section>, which is preserved

before = src[:start_idx]
after = src[end_idx:]

removed_block = src[start_idx:end_idx]
expected_files = [
    "client-01-al-faisaly.png",
    "client-02-saudi-football-federation.png",
    "client-03-florde.png",
    "client-04-saleh-alghalib-law.png",
    "client-05-alrajhi-alsudais-alsuhaibani.png",
    "client-06-weco.png",
    "client-07-autha-coffee-roasters.png",
    "client-08-roshn-league.png",
    "client-09-fares-academy.png",
    "client-10-table-tennis-federation.png",
]
for fn in expected_files:
    if fn not in removed_block:
        raise SystemExit(f"FAIL: expected logo file {fn} not found in the block being removed")

logos = [
    ("client-01-al-faisaly.png", 'alt="نادي الفيصلي" data-en-alt="Al-Faisaly Club"'),
    ("client-02-saudi-football-federation.png", 'alt="الاتحاد السعودي لكرة القدم" data-en-alt="Saudi Arabian Football Federation"'),
    ("client-03-florde.png", 'alt="فلورد" data-en-alt="Florde"'),
    ("client-04-saleh-alghalib-law.png", 'alt="مكتب محاماة صالح الغالب" data-en-alt="Saleh Alghalib Law Firm"'),
    ("client-05-alrajhi-alsudais-alsuhaibani.png", 'alt="الراجحي، السديس والسحيباني للاستشارات القانونية" data-en-alt="Alrajhi, Alsudais &amp; Alsuhaibani Legal Consultants"'),
    ("client-06-weco.png", 'alt="WECO"'),
    ("client-07-autha-coffee-roasters.png", 'alt="Autha Coffee Roasters"'),
    ("client-08-roshn-league.png", 'alt="دوري روشن السعودي" data-en-alt="Roshn Saudi League"'),
    ("client-09-fares-academy.png", 'alt="Fares Academy"'),
    ("client-10-table-tennis-federation.png", 'alt="الاتحاد السعودي لكرة الطاولة" data-en-alt="Saudi Table Tennis Federation"'),
]

logo_html = "\n".join(
    f'      <div class="clients-logo"><img src="assets/images/{fn}" {attrs} loading="lazy"></div>'
    for fn, attrs in logos
)

new_block = (
    '<!-- Sep 2026 pass: static, evenly-balanced grid of the 10 real client\n'
    '     logos — replaces the old auto-scrolling marquee per client request\n'
    '     (no motion, no auto-scroll). Same logo files, same alt text, each\n'
    '     shown once, nothing added or removed from the logo set. -->\n'
    '  <div class="wrap">\n'
    '    <div class="clients-grid" id="clientsGrid" data-anim="fade">\n'
    f'{logo_html}\n'
    '    </div>\n'
    '  </div>\n\n'
)

src = before + new_block + after

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("OK, wrote", path, "chars before/after:", orig_len, len(src))
