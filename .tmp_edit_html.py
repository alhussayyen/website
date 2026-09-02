path = "index.html"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

orig_len = len(src)

def must_replace(s, old, new, expect=1, label=""):
    n = s.count(old)
    if n != expect:
        raise SystemExit(f"FAIL [{label}]: expected {expect} occurrence(s), found {n}\n---OLD (first 400)---\n{old[:400]}")
    return s.replace(old, new, expect)

# ============================================================
# SECTION 7 — move the company-profile download button into #about,
# then remove the #profile section entirely
# ============================================================
old_about_tail = """      <div class="tcol" data-anim="fade">
        <h3 data-en="Our Values">قيمنا</h3>
        <div class="values-row">
          <span data-en="Professionalism">الاحترافية</span><span data-en="Creativity">الإبداع</span><span data-en="Credibility">المصداقية</span><span data-en="Commitment">الالتزام</span><span data-en="Continuous growth">التطوير المستمر</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- services -->"""
new_about_tail = """      <div class="tcol" data-anim="fade">
        <h3 data-en="Our Values">قيمنا</h3>
        <div class="values-row">
          <span data-en="Professionalism">الاحترافية</span><span data-en="Creativity">الإبداع</span><span data-en="Credibility">المصداقية</span><span data-en="Commitment">الالتزام</span><span data-en="Continuous growth">التطوير المستمر</span>
        </div>
      </div>
    </div>

    <!-- Sep 2026: company-profile download moved here from the removed
         "تعرّف على سيرة عن قرب" section — same button/icon, same
         href/download attributes, function unchanged. -->
    <div class="about-profile-cta" style="text-align:center; margin-top:3rem;" data-anim="fade">
      <a class="profile-btn" href="assets/docs/company-profile.pdf" download="سيرة-الملف-التعريفي.pdf" data-en-download="SIIRAH-Company-Profile.pdf" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
        <span data-en="Download Company Profile (PDF)">تحميل الملف التعريفي (PDF)</span>
      </a>
    </div>
  </div>
</section>

<!-- services -->"""
src = must_replace(src, old_about_tail, new_about_tail, label="about-add-profile-btn")

old_profile_section = """<!-- company profile -->
<section class="profile sec-pad" id="profile">
  <div class="wrap">
    <h2 style="margin-top:1rem" data-en="Get to Know SIIRAH">تعرّف على "سيرة" عن قرب</h2>
    <p data-anim="fade" style="margin-top:1.2rem" data-en="Explore our story, our services, and highlights of our work in the company profile.">استكشف قصتنا، خدماتنا، وأبرز أعمالنا في الملف التعريفي للشركة.</p>
    <a class="profile-btn" href="assets/docs/company-profile.pdf" download="سيرة-الملف-التعريفي.pdf" data-en-download="SIIRAH-Company-Profile.pdf" rel="noopener">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
      <span data-en="Download Company Profile (PDF)">تحميل الملف التعريفي (PDF)</span>
    </a>
  </div>
</section>

<!-- 06 -->"""
new_profile_section = """<!-- 06 -->"""
src = must_replace(src, old_profile_section, new_profile_section, label="remove-profile-section")

# ============================================================
# SECTION 6 — social proof: keep only the Twitter/X card
# ============================================================
old_instagram = """    <a class="sp-card" data-anim="rise" href="https://instagram.com/siirah27" target="_blank" rel="noopener">
      <img class="sp-seal" src="assets/images/logo-mark.png" alt="" aria-hidden="true">
      <div class="sp-preview">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        <span data-en="Post preview coming soon">لقطة المنشور قيد الإضافة</span>
      </div>
      <div class="sp-meta">
        <span class="sp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><rect x="9" y="9" width="6" height="6" rx="2"/><rect x="16.5" y="5.5" width="2" height="2" rx=".5" fill="currentColor" stroke="none"/></svg></span>
        <span class="sp-info">
          <span class="sp-name">Instagram</span>
          <span class="sp-handle">@siirah27</span>
        </span>
        <span class="sp-cta"><span data-en="Visit account">زيارة الحساب</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg></span>
      </div>
    </a>
    <a class="sp-card" data-anim="rise" href="https://snapchat.com/add/siirah27" target="_blank" rel="noopener">
      <img class="sp-seal" src="assets/images/logo-mark.png" alt="" aria-hidden="true">
      <div class="sp-preview">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        <span data-en="Post preview coming soon">لقطة المنشور قيد الإضافة</span>
      </div>
      <div class="sp-meta">
        <span class="sp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2.9 0 4.8 2.2 4.7 5.1l-.1 2c1 .5 1.7.3 2.1.1.3-.1.7 0 .7.4-.1.8-1 1.3-1.8 1.6.1.4.3 1 .9 1.5.6.5 1.4.6 1.4 1.1 0 .6-1.3.9-2.1 1-.1.3-.1.7-.3.9-.3.3-1.4 0-2.3.3-.8.3-1.3 1.4-3.2 1.4s-2.4-1.1-3.2-1.4c-.9-.3-2 0-2.3-.3-.2-.2-.2-.6-.3-.9-.8-.1-2.1-.4-2.1-1 0-.5.8-.6 1.4-1.1.6-.5.8-1.1.9-1.5-.8-.3-1.7-.8-1.8-1.6 0-.4.4-.5.7-.4.4.2 1.1.4 2.1-.1l-.1-2C7.2 5.2 9.1 3 12 3Z"/></svg></span>
        <span class="sp-info">
          <span class="sp-name">Snapchat</span>
          <span class="sp-handle">@siirah27</span>
        </span>
        <span class="sp-cta"><span data-en="Visit account">زيارة الحساب</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg></span>
      </div>
    </a>
    <a class="sp-card" data-anim="rise" href="https://tiktok.com/@siirah27" target="_blank" rel="noopener">
      <img class="sp-seal" src="assets/images/logo-mark.png" alt="" aria-hidden="true">
      <div class="sp-preview">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        <span data-en="Post preview coming soon">لقطة المنشور قيد الإضافة</span>
      </div>
      <div class="sp-meta">
        <span class="sp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4v11.5a3.5 3.5 0 1 1-2-3.16"/><path d="M13 4a5 5 0 0 0 5 5"/></svg></span>
        <span class="sp-info">
          <span class="sp-name">TikTok</span>
          <span class="sp-handle">@siirah27</span>
        </span>
        <span class="sp-cta"><span data-en="Visit account">زيارة الحساب</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg></span>
      </div>
    </a>
    <a class="sp-card" data-anim="rise" href="https://x.com/siirah27" target="_blank" rel="noopener">"""
new_instagram = """    <a class="sp-card" data-anim="rise" href="https://x.com/siirah27" target="_blank" rel="noopener">"""
src = must_replace(src, old_instagram, new_instagram, label="social-proof-only-x")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("OK, wrote", path, "chars before/after:", orig_len, len(src))
