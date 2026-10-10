# Envoler Follow-ups

A phone app for the Envoler team to log meetings, pull out next steps, and get reminded before a follow-up slips. It runs from GitHub Pages and installs on Android and iPhone like a normal app.

Everything is stored in your own Google account:

- **Google Sheet** "Envoler Follow-ups Data" holds all meetings and follow-ups (the team's shared database).
- **Google Drive** folder "Envoler Meetings" gets one Google Doc per meeting.
- **Google Calendar** gets a reminder for each follow-up on its due date (and one the day before).

No server and no monthly cost.

---

## Step 1: Put the app on GitHub

1. Sign in to github.com and click **New repository**. Name it `envoler-followups`. It can be Public or Private (Private needs a paid GitHub plan for Pages).
2. Click **uploading an existing file** and drag in everything from this folder (`index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, `README.md` and the `icons` folder). Click **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and click **Save**.
4. After a minute your app is live at:
   `https://YOUR-GITHUB-USERNAME.github.io/envoler-followups/`

## Step 2: Create a Google Cloud project (one time, about 10 minutes)

Sign in as **envolerinnovations@gmail.com** (the account that owns the Envoler Meetings folder).

1. Open https://console.cloud.google.com and create a project called `Envoler Follow-ups`.
2. Go to **APIs & Services → Library** and enable these three:
   - Google Drive API
   - Google Sheets API
   - Google Calendar API
3. Go to **APIs & Services → OAuth consent screen** (also called *Google Auth Platform → Branding/Audience*):
   - User type: **External**
   - App name: `Envoler Follow-ups`, support email: your email
   - Leave publishing status as **Testing**
   - Under **Test users**, add the Gmail address of every team member who will use the app (up to 100).

## Step 3: Create the Client ID

1. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins:** `https://YOUR-GITHUB-USERNAME.github.io`
4. **Authorized redirect URIs:** `https://YOUR-GITHUB-USERNAME.github.io/envoler-followups/` (keep the slash at the end)
5. Click **Create** and copy the Client ID (ends in `.apps.googleusercontent.com`).
6. On GitHub, open `config.js`, click the pencil icon, paste the Client ID into `GOOGLE_CLIENT_ID`, and add team emails in `TEAM`. Commit.

## Step 4: First sign-in (owner)

1. Open your app link and tap **Sign in with Google**. Because the app is in Testing mode, Google shows a warning screen. Tap **Continue**. This is expected for an internal app.
2. The app creates the "Envoler Follow-ups Data" sheet inside the Envoler Meetings folder.
3. Open **Settings** (gear icon), copy the **Sheet ID**, paste it into `SHEET_ID` in `config.js` on GitHub, and commit. Now every teammate uses the same sheet.
4. In Google Drive, share the **Envoler Meetings** folder with each teammate as **Editor**.

## Step 5: Install on phones

**Android (Chrome):** open the app link, tap **Install app** in the banner, or use the ⋮ menu → **Install app** / **Add to Home screen**.

**iPhone (Safari):** open the app link in **Safari** (not Chrome), tap the **Share** button, then **Add to Home Screen**.

## Optional: pull follow-ups out of notes automatically

In the app, open **Settings** and paste a Claude API key from https://console.anthropic.com. The key is stored only on that phone. Then the **Pull out follow-ups** button reads your notes or a transcript and fills in the next steps, owners and due dates for you to check.

## How the team uses it

1. After a meeting, open **Log meeting**. Paste the transcript from your recorder app (Otter, Plaud, etc.) or tap **Dictate** / the mic on your keyboard and speak.
2. Add follow-ups (or let Claude pull them out), check the owners and dates, and tap **Save**.
3. Each morning, open the app. The board shows what's overdue, due today, and this week. Tap **Mark done** or **+3 days**.

No signal at a site? Log the meeting anyway. It's kept on the phone and syncs when you're back online.

## Updating the app

Edit files on GitHub and commit. Phones pick up the new version the next time the app is opened with internet.

## Troubleshooting

- **"redirect_uri_mismatch"**: the redirect URI in Step 3 must exactly match your app link, including the trailing slash.
- **"Access blocked: app has not completed verification"**: add that person's Gmail under Test users (Step 2.3).
- **"Can't open the team sheet"**: share the Envoler Meetings folder with that teammate as Editor, and make sure `SHEET_ID` is set in `config.js`.
- **Signed out every so often**: Google sign-ins last about an hour; the app quietly renews them when you open it. If it asks, tap **Sign in again**. Your drafts are kept.
