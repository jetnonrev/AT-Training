# AT Training Web App

This is a standalone, mobile-first training site for Weeks 1–4 of the current AT training plan.

## What it includes
- Week 1–4 selector
- Ankle, hip, strength, core/back, and balance exercises
- Week-specific sets/reps
- Instructions in every exercise card
- Direct YouTube video button in every exercise card
- Trail mileage progression
- Mobility and pain/recovery rules
- Checkboxes saved on the device with localStorage
- Basic offline app shell after the first successful load
- iPhone Home Screen / standalone web-app support

## Fastest way to test it
Open `index.html` on a computer in a browser.

For full iPhone / installable behavior, host the folder over HTTPS. Good static-host options include:
- GitHub Pages
- Netlify
- Cloudflare Pages
- Any standard web host

## iPhone use
After hosting:
1. Open the site in Safari.
2. Tap Share.
3. Choose **Add to Home Screen**.
4. If offered, enable **Open as Web App**.
5. Launch AT Training from the Home Screen.

## Important
YouTube videos require an internet connection unless they are separately available offline in the YouTube app. The training site itself can cache its basic pages after the first load.

## Updating later
The program data is inside the `exercises` JavaScript object in `index.html`. Future phases can be added without changing the overall site structure.
