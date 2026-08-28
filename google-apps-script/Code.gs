/**
 * SIIRAH — backend (Google Apps Script)
 * ============================================================
 * Receives submissions from the site's forms (js/forms.js is unused —
 * the two Phase 9 forms are actually driven by js/script.js):
 *   - Project inquiry  ("ابدأ مشروعك مع سيرة", #projectForm — home page)
 *   - Careers          ("انضم إلى فريق سيرة", #careersForm — home page)
 * ...and, as of Phase 10, the standalone client portal page
 * (js/project-brief.js):
 *   - Project Brief    ("تفاصيل مشروعك", project-brief.html — sent
 *                        directly to a client after a project is
 *                        agreed on; not linked from the site itself)
 *
 * Writes each submission as a row in a Google Sheet, and any attached
 * files into a matching folder in Google Drive. No database, no
 * third-party service — Google Sheets + Google Drive only, per spec.
 * One deployment serves all three forms: doPost() dispatches on the
 * `formType` field in the JSON body ("project" / "careers" /
 * "projectBrief").
 *
 * ------------------------------------------------------------
 * DEPLOYMENT (do this once, from your own Google account):
 * ------------------------------------------------------------
 * 1. Create a new Google Sheet (this becomes the "SIIRAH Forms" log).
 *    Leave it empty — this script creates its own tabs automatically.
 * 2. In that Sheet: Extensions -> Apps Script.
 * 3. Delete the placeholder code in the editor and paste this entire file.
 * 4. Click Deploy -> New deployment.
 *    - Type: "Web app"
 *    - Description: anything, e.g. "SIIRAH forms v1"
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Click Deploy. Google will ask you to authorize the script (it needs
 *    permission to edit this Sheet and create files in your Drive) —
 *    approve it under the same Google account that owns the Sheet.
 * 6. Copy the "Web app URL" it gives you.
 * 7. Paste that URL into `window.SIIRAH_FORMS_ENDPOINT` in
 *    js/config.js and re-publish the site. That single URL is what
 *    ALL THREE forms use (project inquiry, careers, and the Phase 10
 *    Project Brief page) — nothing else to configure per form.
 * 8. Send that Web app URL back so the front-end can be wired to it
 *    (or paste it into config.js yourself — it is not a secret, it is
 *    a public invocation endpoint; the Sheet/Drive access is entirely
 *    inside this script, under your Google account).
 *
 * The Sheet tabs ("PROJECT INQUIRIES", "CAREERS", "PROJECT BRIEFS") and
 * the Drive folder structures ("SIIRAH FORMS" / ... and, for Phase 10,
 * "SIIRAH PROJECTS" / ...) are created automatically on first
 * submission of each kind — nothing else to set up.
 *
 * Re-deploying after editing this file (including after adding the
 * Phase 10 code below): Deploy -> Manage deployments -> edit (pencil)
 * icon -> select "New version" -> Deploy. The Web app URL stays the
 * same across versions.
 * ============================================================
 */

var PROJECT_SHEET_NAME = 'PROJECT INQUIRIES';
var CAREERS_SHEET_NAME = 'CAREERS';
var DRIVE_ROOT_FOLDER = 'SIIRAH FORMS';
var DRIVE_PROJECT_SUBFOLDER = 'PROJECT INQUIRIES';
var DRIVE_CAREERS_SUBFOLDER = 'CAREERS';

// Phase 5 — both forms trimmed to a short shared shape (Timestamp, Type,
// First Name, Last Name, Email, Phone, Message), each with one form-
// specific extra column: Region / City for a project inquiry, CV / Files
// for a careers application (the optional CV attachment predates Phase 5
// and wasn't in its exact column list — kept and called out in the
// Phase 5 report rather than silently added; see SETUP.md).
var PROJECT_HEADERS = [
  'Timestamp', 'Type', 'First Name', 'Last Name', 'Email', 'Phone',
  'Message', 'Region / City'
];

var CAREERS_HEADERS = [
  'Timestamp', 'Type', 'First Name', 'Last Name', 'Email', 'Phone',
  'Message', 'CV / Files'
];

// ------------------------------------------------------------
// Phase 10 — Project Brief (client project intake, project-brief.html)
// ------------------------------------------------------------
var BRIEF_SHEET_NAME = 'PROJECT BRIEFS';
var DRIVE_BRIEF_ROOT_FOLDER = 'SIIRAH PROJECTS';
// Created for every project, per spec's exact tree (§09 of the Phase 10
// brief): SIIRAH PROJECTS / <Project Name — Project ID> / these four.
// Uploaded files (spec §08 is one generic multi-file uploader — logo,
// brand guide, references, anything else the client attaches) are all
// saved into "Assets"; "Client Information", "References" and "Other
// Files" are created empty and ready for the project manager/team to
// use manually, since nothing in the brief form maps to them on its own.
var DRIVE_BRIEF_SUBFOLDERS = ['Client Information', 'References', 'Assets', 'Other Files'];

// Exact 30 columns from the Phase 10 brief (§10), in the order given.
// "Creative Direction" is that section's own header repeated in the
// client's column list — every field inside it already has its own
// dedicated column right after (Main Idea … Things To Avoid), so this
// cell is intentionally left blank rather than duplicating that data.
// "Content" combines the Phase 10 form's six content-description
// fields (Copy/Text, Logos, Images, Videos, References, Files Required
// From Client) into one labeled, line-broken cell, because the client's
// column list has a single "Content" column (not one per sub-field);
// "Additional Information" is its own field/column as listed.
var BRIEF_HEADERS = [
  'Timestamp', 'Project ID', 'Project Name', 'Client Name', 'Company',
  'Email', 'Phone', 'Position', 'Website', 'Social Links',
  'Project Type', 'Project Description', 'Project Goal', 'Target Audience',
  'Services', 'Deliverables', 'Deadline', 'Location', 'Budget',
  'Creative Direction', 'Main Idea', 'Message', 'Visual Identity', 'Colors',
  'Style', 'References', 'Things To Avoid', 'Content', 'Additional Information',
  'Files Links'
];

function doGet() {
  return ContentService
    .createTextOutput('SIIRAH Forms API is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: 'error', message: 'Empty request body.' });
    }
    var data = JSON.parse(e.postData.contents);

    if (data.formType === 'project') {
      return jsonResponse(handleProjectInquiry(data));
    }
    if (data.formType === 'careers') {
      return jsonResponse(handleCareersApplication(data));
    }
    if (data.formType === 'projectBrief') {
      return jsonResponse(handleProjectBrief(data));
    }
    return jsonResponse({ status: 'error', message: 'Unknown formType.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err && err.message ? err.message : err) });
  }
}

function handleProjectInquiry(data) {
  if (!data.firstName || !data.lastName || !data.email || !data.phone || !data.message) {
    return { status: 'error', message: 'Missing required fields.' };
  }

  var sheet = getOrCreateSheet(PROJECT_SHEET_NAME, PROJECT_HEADERS);
  sheet.appendRow([
    new Date(),
    'project',
    data.firstName || '',
    data.lastName || '',
    data.email || '',
    data.phone || '',
    data.message || '',
    data.region || ''
  ]);

  return { status: 'success' };
}

function handleCareersApplication(data) {
  if (!data.firstName || !data.lastName || !data.email || !data.phone || !data.message) {
    return { status: 'error', message: 'Missing required fields.' };
  }

  var submissionFolderName = sanitizeName((data.firstName || '') + ' ' + (data.lastName || '') || 'Applicant');
  var fileUrls = [];
  if (data.cv && data.cv.length) {
    var folder = getOrCreateFolder(getOrCreateFolder(getRootFolder(), DRIVE_CAREERS_SUBFOLDER), submissionFolderName);
    fileUrls = saveFiles(folder, data.cv);
  }

  var sheet = getOrCreateSheet(CAREERS_SHEET_NAME, CAREERS_HEADERS);
  sheet.appendRow([
    new Date(),
    'career',
    data.firstName || '',
    data.lastName || '',
    data.email || '',
    data.phone || '',
    data.message || '',
    fileUrls.join(', ')
  ]);

  return { status: 'success' };
}

// ------------------------------------------------------------
// Phase 10 — Project Brief
// ------------------------------------------------------------
function handleProjectBrief(data) {
  var hasServices = data.services && data.services.length;
  if (!data.name || !data.company || !data.email || !data.phone ||
      !data.projectName || !data.projectType || !data.description ||
      !data.goal || !hasServices || !data.deliverables) {
    return { status: 'error', message: 'Missing required fields.' };
  }

  var sheet = getOrCreateSheet(BRIEF_SHEET_NAME, BRIEF_HEADERS);

  var projectId = String(data.projectId || '').trim();
  if (!projectId) projectId = generateProjectId(sheet);

  var folderLabel = sanitizeName((data.projectName || 'Project') + ' — ' + projectId);
  var projectsRoot = getOrCreateFolder(DriveApp.getRootFolder(), DRIVE_BRIEF_ROOT_FOLDER);
  var projectFolder = getOrCreateFolder(projectsRoot, folderLabel);
  var subfolders = {};
  DRIVE_BRIEF_SUBFOLDERS.forEach(function (name) {
    subfolders[name] = getOrCreateFolder(projectFolder, name);
  });

  var fileUrls = [];
  if (data.files && data.files.length) {
    fileUrls = saveFiles(subfolders['Assets'], data.files);
  }

  var contentLines = [];
  function addContentLine(label, value) {
    if (value) contentLines.push(label + ': ' + value);
  }
  addContentLine('Copy / Text Needed', data.textsNeeded);
  addContentLine('Logos', data.logos);
  addContentLine('Images', data.images);
  addContentLine('Videos', data.videos);
  addContentLine('References', data.contentReferences);
  addContentLine('Files Required From Client', data.filesNeededFromClient);

  sheet.appendRow([
    new Date(),
    projectId,
    data.projectName || '',
    data.name || '',
    data.company || '',
    data.email || '',
    data.phone || '',
    data.position || '',
    data.website || '',
    data.socialLinks || '',
    data.projectType || '',
    data.description || '',
    data.goal || '',
    data.targetAudience || '',
    (data.services || []).join(', '),
    data.deliverables || '',
    data.deadline || '',
    data.location || '',
    data.budget || '',
    '', // Creative Direction — see BRIEF_HEADERS comment above
    data.mainIdea || '',
    data.message || '',
    data.visualIdentity || '',
    data.colors || '',
    data.style || '',
    data.visualReferences || '',
    data.thingsToAvoid || '',
    contentLines.join('\n'),
    data.additionalInfo || '',
    fileUrls.join(', ')
  ]);

  return { status: 'success', projectId: projectId };
}

// Format: SIIRAH-<year>-<4 digits>, unique within the sheet. Sequential
// from the current row count (not random) so IDs are easy to eyeball as
// "the Nth brief this year", with a collision check/increment loop as a
// safety net against manually edited/deleted rows.
function generateProjectId(sheet) {
  var year = new Date().getFullYear();
  var lastRow = sheet.getLastRow();
  var existing = {};
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // column 2 = Project ID
    ids.forEach(function (row) { if (row[0]) existing[String(row[0]).trim()] = true; });
  }
  var seq = Math.max(lastRow, 1);
  var id;
  do {
    seq += 1;
    id = 'SIIRAH-' + year + '-' + ('0000' + seq).slice(-4);
  } while (existing[id]);
  return id;
}

// ---------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------
function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // the default "Sheet1" that comes with a brand-new spreadsheet is
    // left alone here — delete it manually if you don't want it.
  }
  return sheet;
}

// ---------------------------------------------------------------
// Drive helpers
// ---------------------------------------------------------------
function getRootFolder() {
  return getOrCreateFolder(DriveApp.getRootFolder(), DRIVE_ROOT_FOLDER);
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function saveFiles(folder, files) {
  var urls = [];
  files.forEach(function (f) {
    if (!f || !f.data) return;
    try {
      var bytes = Utilities.base64Decode(f.data);
      var blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', f.name || 'file');
      var driveFile = folder.createFile(blob);
      urls.push(driveFile.getUrl());
    } catch (err) {
      // one bad file shouldn't fail the whole submission
      urls.push('(failed to save: ' + (f.name || 'unnamed') + ')');
    }
  });
  return urls;
}

function sanitizeName(name) {
  var clean = String(name).replace(/[\\\/:*?"<>|]/g, ' ').trim();
  return clean.length ? clean.slice(0, 120) : 'Untitled';
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
