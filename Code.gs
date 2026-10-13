/**
 * Envoler Follow-ups – back end.
 * Runs inside envolerinnovations@gmail.com. Every meeting, follow-up, Google Doc and
 * calendar reminder is created by this account, so the sheet always stays with the owner.
 * The team never signs in with Google; they use the team PIN below.
 */

// ===== EDIT THESE TWO LINES =====
const TEAM_PIN = "CHANGE-THIS-PIN";                       // share this PIN with your team
const FOLDER_ID = "13w7MBnVf01JtHTBzL14M7h7onHdXgAcx";     // the "Envoler Meetings" Drive folder
// ================================

const SHEET_NAME = "Envoler Follow-ups Data";
const TIME_ZONE = "Asia/Kolkata";
const REMINDER_TIME = "10:00";
const M_COLS = ["id","date","person","org","summary","decisions","notes","createdBy","createdAt","docUrl"];
const F_COLS = ["id","task","contact","org","due","owner","status","meetingId","createdBy","createdAt","doneAt","eventId"];

/** Run this once from the editor to grant access and create/find the team sheet. */
function setup() {
  const ss = getSheet_();
  Logger.log("Team sheet: " + ss.getUrl());
  Logger.log("Drive folder: " + folder_().getUrl());
}

function doGet() {
  return json_({ ok: true, app: "Envoler Follow-ups" });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: "Bad request" }); }
  if (String(req.pin || "") !== String(TEAM_PIN)) return json_({ error: "Wrong team PIN", code: "pin" });
  try {
    switch (req.action) {
      case "hello": return json_({ ok: true });
      case "list": return json_(list_());
      case "saveMeeting": return json_(saveMeeting_(req));
      case "updateFollowup": return json_(updateFollowup_(req));
      default: return json_({ error: "Unknown action" });
    }
  } catch (err) {
    return json_({ error: String((err && err.message) || err) });
  }
}

/* ---------- storage ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function str_(v) { return v == null ? "" : String(v); }
function folder_() { return DriveApp.getFolderById(FOLDER_ID); }

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty("SHEET_ID");
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { const it = folder_().getFilesByName(SHEET_NAME); if (it.hasNext()) ss = SpreadsheetApp.open(it.next()); }
  if (!ss) { ss = SpreadsheetApp.create(SHEET_NAME); DriveApp.getFileById(ss.getId()).moveTo(folder_()); }
  ensureTab_(ss, "Meetings", M_COLS);
  ensureTab_(ss, "Followups", F_COLS);
  const extra = ss.getSheetByName("Sheet1");
  if (extra && ss.getSheets().length > 2) ss.deleteSheet(extra);
  props.setProperty("SHEET_ID", ss.getId());
  return ss;
}
function ensureTab_(ss, name, cols) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat("@"); // keep everything as plain text
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_(sh, cols) {
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, cols.length).getDisplayValues()
    .map(r => { const o = {}; cols.forEach((c, i) => o[c] = r[i]); return o; })
    .filter(o => o.id);
}
function findRow_(sh, id) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return 0;
}
function writeRow_(sh, cols, obj, row) {
  const values = [cols.map(c => str_(obj[c]).slice(0, 49000))];
  const r = row || sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, cols.length).setNumberFormat("@").setValues(values);
}

/* ---------- actions ---------- */
function list_() {
  const ss = getSheet_();
  return {
    meetings: rows_(ss.getSheetByName("Meetings"), M_COLS),
    followups: rows_(ss.getSheetByName("Followups"), F_COLS),
    sheetUrl: ss.getUrl(),
    folderUrl: folder_().getUrl(),
    owner: Session.getEffectiveUser().getEmail()
  };
}

function saveMeeting_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSheet_();
    const ms = ss.getSheetByName("Meetings"), fsh = ss.getSheetByName("Followups");
    const m = req.meeting || {}, fs = req.followups || [];
    if (!m.id) throw new Error("Missing meeting");
    if (findRow_(ms, m.id)) return { ok: true, duplicate: true }; // already saved (retry after a dropped signal)
    if (req.useCal) fs.forEach(f => { try { f.eventId = createEvent_(f); } catch (e) { f.eventId = ""; } });
    try { m.docUrl = createDoc_(m, fs); } catch (e) { m.docUrl = ""; }
    writeRow_(ms, M_COLS, m);
    fs.forEach(f => writeRow_(fsh, F_COLS, f));
    return { ok: true, docUrl: m.docUrl };
  } finally { lock.releaseLock(); }
}

function updateFollowup_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_().getSheetByName("Followups");
    const f = req.f || {};
    const row = findRow_(sh, f.id);
    if (!row) return { ok: true, missing: true };
    writeRow_(sh, F_COLS, f, row);
    if (f.eventId) {
      try {
        const ev = CalendarApp.getDefaultCalendar().getEventById(f.eventId);
        if (ev) {
          if (f.status === "done") ev.deleteEvent();
          else if (req.calMove) { const t = eventTimes_(f.due); ev.setTime(t.start, t.end); }
        }
      } catch (e) {}
    }
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ---------- calendar and docs ---------- */
function eventTimes_(due) {
  const start = Utilities.parseDate(due + " " + REMINDER_TIME, TIME_ZONE, "yyyy-MM-dd HH:mm");
  return { start, end: new Date(start.getTime() + 15 * 60000) };
}
function createEvent_(f) {
  const t = eventTimes_(f.due);
  const opts = { description: "With " + (f.contact || "—") + (f.org ? ", " + f.org : "") + "\nOwner: " + (f.owner || "—") + "\nFrom Envoler Follow-ups" };
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  if (f.ownerEmail && String(f.ownerEmail).toLowerCase() !== me) { opts.guests = f.ownerEmail; opts.sendInvites = true; }
  const ev = CalendarApp.getDefaultCalendar().createEvent("Follow up: " + f.task, t.start, t.end, opts);
  ev.removeAllReminders(); ev.addPopupReminder(0); ev.addPopupReminder(24 * 60);
  return ev.getId();
}
function createDoc_(m, fs) {
  const H = DocumentApp.ParagraphHeading;
  const doc = DocumentApp.create(m.date + " " + (m.person || "Meeting") + (m.org ? ", " + m.org : ""));
  const b = doc.getBody();
  b.appendParagraph("Meeting with " + (m.person || "—") + (m.org ? ", " + m.org : "")).setHeading(H.HEADING1);
  b.appendParagraph("Date: " + m.date + "    Logged by: " + (m.createdBy || ""));
  b.appendParagraph("Summary").setHeading(H.HEADING2);
  b.appendParagraph(m.summary || "—");
  b.appendParagraph("Decisions").setHeading(H.HEADING2);
  const ds = String(m.decisions || "").split("\n").filter(String);
  if (ds.length) ds.forEach(d => b.appendListItem(d)); else b.appendParagraph("None");
  b.appendParagraph("Follow-ups").setHeading(H.HEADING2);
  if (fs.length) fs.forEach(f => b.appendListItem(f.task + " (due " + f.due + ", owner " + (f.owner || "—") + ")")); else b.appendParagraph("None");
  b.appendParagraph("Notes").setHeading(H.HEADING2);
  b.appendParagraph(m.notes || "—");
  const first = b.getChild(0);
  if (first.getType() === DocumentApp.ElementType.PARAGRAPH && first.asParagraph().getText() === "") first.removeFromParent();
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(folder_());
  return doc.getUrl();
}
