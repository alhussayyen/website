// SIIRAH — forms configuration (Phase 9).
//
// This is the ONLY place a Google Apps Script Web App URL is referenced.
// It is not a secret: an Apps Script Web App URL is meant to be called
// from a browser (that's the whole point of deploying it "Anyone" can
// access) — it does not grant access to the underlying Sheet or Drive
// folder to whoever holds it, only to the specific doPost() logic in
// google-apps-script/Code.gs. No Google API key, OAuth client, or
// service-account credential is ever present in this website's code.
//
// Leave this empty until google-apps-script/SETUP.md has been completed —
// both forms detect the empty value and show the site's own "couldn't
// submit" error instead of attempting a request, so nothing breaks while
// this is still unset.
window.SIIRAH_FORMS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzFcE_HHShH9aaGxeBsldakUvLX6pHpcoSiqvTWV-n1D9PhqRN1dMXKz2hI8Tv55VFJhQ/exec";

// Must match MAX_FILE_MB in google-apps-script/Code.gs so the browser
// rejects an oversized file before spending time base64-encoding and
// uploading it, instead of only finding out from the server afterwards.
window.SIIRAH_FORMS_MAX_FILE_MB = 15;
