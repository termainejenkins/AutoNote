# AutoNote

Copyright © 2026 SENTIENT SOLUTIONS LLC. All rights reserved.  
Created by Termaine "TJ" Jenkins

This software and the associated documentation are the exclusive property of SENTIENT SOLUTIONS LLC. No part of this software may be used, copied, modified, or distributed without the prior written permission of SENTIENT SOLUTIONS LLC.

The repository is public so the work can be reviewed. Public visibility is not an open-source license. No license is granted by this repository.

## What it is

AutoNote v1 is a Chrome extension (Manifest V3) that writes a Study or Skim note from the page you are reading. You bring your own Google Gemini API key. There is no AutoNote account, backend, or hosted database: the key and the notes stay in Chrome on this device.

The model is fixed in `extension/gemini.js` as `gemini-3.5-flash-lite`. The extension does not let you pick a different model.

## Features

- **Generate note** in the popup, for the active page, as Study or Skim.
- **Auto notes**, off until you turn them on. After the time and scroll threshold, AutoNote saves one note per page URL per local day. The `#fragment` is ignored, so the same path with a different hash counts as one page.
- **Notes page** with topics, Markdown copy and download, copy for Google Docs, rename, and delete.
- **Blocklist** for pages that should never be sent, plus an optional "only these sites" list.
- **Privacy controls**: a send notice you must confirm, and a local log of Gemini calls.
- **Toolbar badge**: a green count of notes saved during this browser session.

## How it works and privacy

AutoNote reads the page in the browser, then asks Gemini to turn that extract into a note. A content script on `http` and `https` pages reports the page URL, whether the tab is visible, whether you have been idle for a minute, and how far you have scrolled. Those reports stay in the extension. Page text is taken only when you click Generate note, or when auto notes pass the threshold.

The extractor is a small heuristic, not Mozilla Readability. It uses `article`, then `main`, then the page body. It drops scripts, styles, nav, footer, and forms, and caps the text at 12,000 characters. Up to 20 headings (`h1`–`h3`) are kept. A page with a password field is skipped, and its HTML is not collected.

**What is sent to Google.** Two calls exist, and both go only to `generativelanguage.googleapis.com`. The API key is the `x-goog-api-key` header. It is not put in the URL or the request body.

- **Note.** `POST /v1beta/models/gemini-3.5-flash-lite:generateContent`. The message is the note instructions for Study or Skim, the page title, the page URL, the headings, and the extracted text (12,000 characters at most).
- **Test key.** `GET /v1beta/models?pageSize=1`, and only after you click Test key. That call does not include page content.

Study asks for one summary paragraph, key terms, and three review questions. Skim asks for two or three sentences and three to five short takeaways. The reply is stored as Markdown on this device. Copying a note for Google Docs writes the clipboard on this device only. It does not contact Google Docs or Gemini.

**What stays on this device.** `chrome.storage.local` (not synced) holds:

- the Gemini API key
- notes (URL, title, Study or Skim, Markdown, topic, time)
- settings: the send notice, auto on or off, pause time, Study and Skim thresholds, your blocklist, and the optional site list
- the send log, newest 200 entries: time, URL, title, Study, Skim, or key test, character count, and success or error. The log does not keep the page text or the key. A key test is stored with no URL.

`chrome.storage.session` lasts until the browser session ends. It holds reading progress for open tabs and the session note count used by the badge. Removing the key leaves notes in place until you delete them.

Nothing on a page is sent until you check the notice in Options. Auto notes stay off until you turn them on. A blocked page is skipped for both Generate note and auto notes, and the popup says why.

Built-in block rules are always on and cannot be removed. They match a fixed set of mail, bank, and payment hosts (including `mail.google.com`, PayPal, Chase, Bank of America, and Wells Fargo), `accounts.google.com`, hosts ending in `.gov` or `.gov.uk`, and the paths `/checkout`, `/cart`, `/signin`, `/login`, and `/account`. Options lists every built-in rule. Your own rules are extra: a domain also matches its subdomains, a path such as `/billing` matches that segment, and `shop.example.com/private` matches that host and path. Your own blocklist holds up to 100 patterns.

**Only these sites** is off by default, so any page that is not blocked can be noted. When it is on, Generate note and auto notes run only on the domains you list, including subdomains. The blocklist still wins. With the checkbox on and no domains listed, nothing is sent.

## Install

You need [Google Chrome](https://www.google.com/chrome/). Open `chrome://extensions`, turn on **Developer mode**, and click **Load unpacked**. Choose the folder that contains `manifest.json`. Do not choose the repository root, and do not choose the `.zip` file.

### Load the extension folder

Clone this repository, check out `v1` (or the pull request branch you are reviewing), and load the `extension` directory. Chrome reads those files directly. There is no compile step for this path.

Pin AutoNote if you want it in the toolbar. Click the icon. On a normal article the popup names the page. On `chrome://extensions` the popup opens and says that browser page cannot be read. On the extension card, open **Service worker**. The console includes `AutoNote service worker started`.

### Build a zip

`node scripts/package-extension.mjs` writes the same package CI uploads. Run it from a git checkout. It needs the `zip` and `unzip` commands on `PATH`. If either is missing, the script stops with `zip failed:` or `unzip failed:`.

```bash
node scripts/package-extension.mjs
```

That writes:

- `dist/autonote-extension-<version>-<short sha>.zip`, with `manifest.json` at the root of the archive
- `dist/autonote-extension-<version>-<short sha>/`, the same files unpacked

`<version>` is `version` in `extension/manifest.json`. `<short sha>` is the first seven characters of `HEAD`. The script refuses the zip if `manifest.json` is missing from the archive root or a file the manifest references is absent. Load unpacked the extracted folder.

GitHub Actions runs this on pull requests and on pushes to `v1` and `main`, after the unit tests pass. The artifact name is `autonote-extension-<version>-<short sha>`, kept for 14 days. Actions stores that folder as one zip, so unzip the download once and load the folder that contains `manifest.json`. The workflow does not publish a Chrome Web Store release and does not use secrets.

## Gemini API key

AutoNote does not ship a key. Do not commit a key, paste one into an issue, or put one in a tracked `.env` file.

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Open the AutoNote popup and click **Options**, or open **Extension options** from `chrome://extensions`.
3. Read **Before page text is sent**. Check **I understand page text will be sent to Gemini when I generate a note or when auto notes are on.**
4. Paste the key into **Gemini API key**. The field is masked. Click **Save key**. The field is cleared. The key stays in `chrome.storage.local` on this device.
5. Click **Test key**. Chrome asks permission to contact `generativelanguage.googleapis.com`. That permission is what later note requests use. Generate note does not ask for it on its own. Test key sends the small model-list request above, not page text.

**Remove key** deletes the saved key from this device. Notes stay until you delete them.

## Usage

### Popup

On a page that can be noted, the popup shows the title and how much Generate note would send: the title, the URL, the heading count, and the extracted character count. If a note for that URL is already saved today, it says so. You can still generate another one by hand.

Choose **Study** or **Skim**, then click **Generate note**. The popup says it is sending that character count before the request goes out. A saved note says `Note saved on this device.`

**My notes** opens the notes page. **Pause auto for 1 hour** stops auto notes without removing the key. The button then says **Resume auto notes**.

### Auto notes

Leave **Turn on auto notes** unchecked until you want it. In Options, confirm the notice, set the style and thresholds if you want, check **Turn on auto notes**, and click **Save reading settings**. Chrome asks for permission to read `http` and `https` pages and to contact Gemini. If you decline, auto notes stay off. Manual Generate note can still work once Gemini permission has been granted (Test key does that).

Defaults are Study 45 seconds and 60% scroll, Skim 20 seconds and 40% scroll. You can change them in Options before saving: Study seconds 10–600, Skim seconds 5–600, scroll 10–100% for either. Time counts only while the tab is visible and you have moved the pointer, scrolled, or typed within the last minute. A page that does not scroll counts as fully scrolled.

When the threshold is met, AutoNote saves one note for that URL for the local day. A later visit the same day does not send again. The popup's Auto line shows the running time and scroll while you are short of the threshold. Turning auto notes off removes the broad `http` and `https` permission.

### Notes page

Notes are grouped by topic. A topic is the site plus the first one or two path segments (`docs.example.com/course/module/overview` lands in `docs.example.com/course/module`). You can rename a topic on this device.

**Copy topic as Markdown** and **Download topic** write a heading per page and a source link on each note. **Copy for Google Docs** copies one note, or the whole topic, as formatted text you can paste into a Google Doc. That copy stays on this device and is not sent anywhere. **Download all notes** exports every topic. **Delete note** asks you to confirm, then removes that note from this device only.

### Toolbar badge

Each note that is saved, from Generate note or from auto notes, adds one to a count stored for this browser session. The toolbar badge shows that count in green. The tooltip reads `AutoNote: 1 note this session` or `AutoNote: N notes this session`, using the full count. A count of 0 leaves the badge blank. Above 99 the badge text shows `99+`.

The count is in `chrome.storage.session`, so it resets when the browser session ends. It remains if the service worker restarts. While auto notes are generating on a tab, that tab can show `…`. If that attempt is blocked or fails, the tab shows `!`. A saved note clears that tab marker so the session count shows.

## Troubleshooting

The popup and the Options status line show these messages. HTTP 400 is reported with 401 and 403.

| What you see | When |
| --- | --- |
| `Gemini note failed (HTTP 404). The model may be unavailable for this key.` | Note request returned HTTP 404. |
| `Gemini rejected this key. Check the key in options.` | Note request returned HTTP 400, 401, or 403. |
| `Gemini rejected this key. Check the key and try again.` | Test key returned HTTP 400, 401, or 403. |
| `Gemini rate-limited the note. Wait a moment and try again.` | Note request returned HTTP 429. |
| `Gemini rate-limited the test. Wait a moment and try again.` | Test key returned HTTP 429. |
| `Gemini note failed (HTTP <status>).` | Note request returned some other non-success status. |
| `Gemini test failed (HTTP <status>).` | Test key returned some other non-success status, including 404. |
| `Key works. Gemini accepted a tiny test request.` | Test key returned a success status. |
| `Could not reach Gemini. …` | The request threw before a status came back. The key is removed from the message if it appeared there. |
| `Gemini returned a response AutoNote could not read.` | The success body was not JSON. |
| `Gemini did not return note JSON.` | The body had no note JSON. |
| `Gemini returned a note with no summary.` | The note JSON had an empty summary, so nothing was saved. |
| `Open options and confirm the notice before AutoNote can send page text to Gemini.` | The send notice is unchecked. |
| `Add a Gemini API key in options before generating a note.` | No key is saved. |
| `Permission to contact Gemini was not granted. The key was not sent.` | You dismissed the Test key permission prompt. |
| `Auto notes stay off because site access was not granted. Manual generate can still work.` | You turned auto notes on and dismissed the site permission prompt. |

A blocked, password, or browser page is skipped before any Gemini call. The popup repeats the reason (for example `Checkout, cart, login, and account pages are skipped.` or `Pages with a password field are skipped.`).

## Development

Unit tests use Node's built-in test runner. This project is tested on Node 22. From the repository root:

```bash
node --test
```

`npm test` runs the same command. That run does not collect the end-to-end files.

End-to-end tests launch Chromium with the unpacked extension and answer Gemini with canned responses. They do not use a real API key. They need a display because Playwright is configured with `headless: false`. GitHub Actions starts that display with `xvfb`.

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

CI also syntax-checks `extension/*.js` and `scripts/package-extension.mjs`, then builds the zip described under [Build a zip](#build-a-zip).

Files under `documentation/` describe the old microservices stack. Each one is marked legacy. The tag [`legacy-microservices`](https://github.com/termainejenkins/AutoNote/tree/legacy-microservices) points at commit `dc72d42` on `Development--C`. Do not use those documents, Docker Compose, or that tree to run AutoNote v1.

Not in this version: a hosted proxy, accounts, Research mode, video or PDF capture, a Notion integration, Firefox, Safari, and a Chrome Web Store listing.

## License

Copyright © 2026 SENTIENT SOLUTIONS LLC. All rights reserved.

Unauthorized copying, transfer, or reproduction of this software, via any medium, is strictly prohibited.
