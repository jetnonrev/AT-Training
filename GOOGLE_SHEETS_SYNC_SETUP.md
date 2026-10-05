# Google Sheets Sync Setup

The spreadsheet is already created:

**AT Training Progress**
https://docs.google.com/spreadsheets/d/1pUZkC4gEEGceSA5osoMBciH-LLNakjPaqCUcjLqIdG4/edit

## One-time Google Apps Script setup

1. Open the spreadsheet.
2. Choose **Extensions → Apps Script**.
3. Delete the starter code in `Code.gs`.
4. Copy the contents of this repository's `backend.gs` into `Code.gs`.
5. Click **Save**.
6. Click **Deploy → New deployment**.
7. Click the gear / deployment type and choose **Web app**.
8. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
9. Click **Deploy**.
10. Approve the Google authorization prompts.
11. Copy the **Web app URL** ending in `/exec`.

Send that `/exec` URL back to ChatGPT. The AT Training site can then be wired to use the Google Sheet for cross-device progress syncing.

## How sync works

- The site will keep localStorage for fast/offline use.
- Every checkbox change will also be written to the Progress sheet.
- On launch, the site will load cloud progress and merge it into the local state.
- Sunday Trail vs Rest remains mutually exclusive.
