# Skin to Smiles Multispeciality Website

A responsive static clinic website using HTML, CSS, and browser JavaScript. The free public version links visitors to call the clinic to request an appointment; it does not collect or transmit visitor details.

## Free public deployment with GitHub Pages

The GitHub Actions workflow deploys the contents of `public/` whenever code is pushed to `main`.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open the **Actions** tab and wait for **Deploy static clinic website** to complete.
4. Open the URL shown by the successful deployment. For this repository, it will usually be `https://unusroshnn.github.io/Real-time-project/`.

The site uses relative asset URLs so its styles, script, and images work from the GitHub Pages project URL. GitHub Pages hosting is free for public repositories, subject to GitHub's current terms and limits.

## Appointment and privacy note

Online appointment submissions are intentionally disabled. The public website offers a click-to-call link to **+91 73584 95406**. A static site cannot safely store requests or send clinic email. Do not re-enable an online form until a clinic-approved, secure service with persistent storage, notification delivery, access controls, backups, and an approved privacy notice is available.

## Local development

To run the Express prototype locally, install dependencies and run `npm start`, then open `http://localhost:3000`. The server's appointment API is for local development only and is not part of the public static deployment.

## Project layout

- `public/index.html` — static website
- `public/styles.css` — responsive design
- `public/script.js` — navigation and footer behavior
- `public/assets/logo.jpeg` — clinic logo
- `public/assets/clinic-banner.png` — clinic banner image
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow
- `server.js` — local Express prototype
