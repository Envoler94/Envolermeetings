/* Envoler Follow-ups settings. Edit this file, then upload it to GitHub. */
window.ENVOLER_CONFIG = {
  // From Google Cloud Console > APIs & Services > Credentials (see README step 3)
  GOOGLE_CLIENT_ID: "PASTE-YOUR-CLIENT-ID.apps.googleusercontent.com",

  // The "Envoler Meetings" folder in Google Drive. Meeting notes are saved here.
  DRIVE_FOLDER_ID: "13w7MBnVf01JtHTBzL14M7h7onHdXgAcx",

  // Leave empty the first time. After your first sign-in, copy the Sheet ID from
  // the app's Settings screen and paste it here so the whole team uses the same sheet.
  SHEET_ID: "",

  // People who can own follow-ups. Add emails so they get Google Calendar reminders.
  TEAM: [
    { name: "Piyush Jain", email: "" },
    { name: "Abhishek Goyal", email: "" }
  ],

  // Claude model used to pull follow-ups out of meeting notes (optional feature).
  CLAUDE_MODEL: "claude-sonnet-5-5",

  // Your time zone for calendar reminders.
  TIME_ZONE: "Asia/Kolkata",
  REMINDER_TIME: "10:00"
};
