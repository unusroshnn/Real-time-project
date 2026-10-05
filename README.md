# Skin to Smiles Multispeciality Website

A responsive clinic website using HTML, CSS, browser JavaScript, and Node.js/Express. The supplied layout is already arranged correctly: the homepage and its CSS/JS are inside `public/`, and the server is at the project root.

## Run in VS Code on Windows

1. Extract this ZIP to a normal folder (not inside another `assets` folder).
2. In VS Code choose **File → Open Folder** and select the extracted `skin-to-smiles` folder containing `package.json`.
3. Create a local environment file by copying `.env.example` to `.env` and update the SMTP values if you want to test email notifications.
4. Open **Terminal → New Terminal** and run:

   ```powershell
   npm install
   npm start
   ```

5. Open `http://localhost:3000` in Chrome.
6. Stop the server with `Ctrl+C` in the terminal.

If port 3000 is already in use, stop the earlier Node server terminal first, or close the old Node process before starting another copy.

## Email setup for appointment requests

In local development, appointment submissions save to `data/appointments.json`. When `DATABASE_URL` is configured, submissions are stored in PostgreSQL. If SMTP is configured, accepted requests are also sent to the configured clinic inbox.

To enable email delivery:

1. Create a Gmail account or use an existing one.
2. Generate an app password from Google account security settings.
3. Add the SMTP credentials in a `.env` file: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, and `EMAIL_TO`.
4. Restart the Node server.

In production, the server refuses to start unless PostgreSQL and SMTP credentials, including the real clinic `EMAIL_TO` address, are configured. If an email fails after the request is stored, the form tells the visitor to call the clinic.

## Render deployment preparation

`render.yaml` provisions an always-on Starter web service and a Basic PostgreSQL database in Singapore. Render's current pricing applies to both resources; review the live pricing and terms before creating the Blueprint. The notification recipient is configured as `skintosmiles@gmail.com`. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` as private Render environment variables when prompted. Never put SMTP credentials in source control. The appointment endpoint limits each IP to five submissions per 15 minutes.

Do not deploy the public appointment form until the clinic has approved the privacy wording, recipient inbox, email provider, retention/access process, and database backup plan. A Render account and a live SMTP mailbox are also required; this repository cannot create those accounts or send mail by itself.

## Project layout

- `server.js` — Express server and appointment endpoint
- `public/index.html` — website page
- `public/styles.css` — responsive design
- `public/script.js` — menu and appointment form behavior
- `public/assets/logo.jpeg` — clinic logo
- `public/assets/clinic-banner.png` — clinic banner image
- `data/appointments.json` — local demo submissions, created automatically

## Important appointment and privacy note

Local development may use a JSON file, but production requires PostgreSQL and clinic SMTP settings. Before collecting real patient information, obtain clinic approval for the privacy notice and retention policy, restrict database access, configure backups and HTTPS, and use a clinic-approved email provider. Keep credentials in hosting environment settings; never share or commit passwords or app passwords. If an app password was previously exposed, revoke it and create a new one.
