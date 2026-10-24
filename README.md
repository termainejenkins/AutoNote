# AutoNote

Copyright © 2026 SENTIENT SOLUTIONS LLC. All rights reserved.  
Created by Termaine "TJ" Jenkins

This software and the associated documentation are the exclusive property of SENTIENT SOLUTIONS LLC. No part of this software may be used, copied, modified, or distributed without the prior written permission of SENTIENT SOLUTIONS LLC.

The repository is public so the work can be reviewed. Public visibility is not an open-source license. No license is granted by this repository.

## What AutoNote v1 is

AutoNote v1 is a Chrome extension that takes notes while you read. There is no AutoNote backend, account, or hosted database. Each person supplies their own Gemini API key. The key and the notes stay in Chrome on that person's device (`chrome.storage.local`).

This build can:

- Extract readable text from an article, or from `main` when there is no article, and skip password fields, browser pages, and a default blocklist (mail, banking, payments, government, checkout, cart, login, and account paths). You can add your own block rules, and optionally limit notes to an allowlist of domains
- Track visible time and scroll depth, with Study defaults of 45 seconds and 60% scroll and Skim defaults of 20 seconds and 40% scroll
- Write a Study note (summary, key terms, three questions) or a Skim note (two or three sentences and takeaways) through Gemini
- Keep notes on this device, grouped by site and the first one or two path segments
- Show the current page in the popup and generate a note when you click
- Open a notes page with Markdown copy and download
- Keep a local log of Gemini requests (time, URL, title, Study or Skim, character count, and success or error) without the page text or the key

Auto notes are off until you turn them on. Nothing on a page is sent until you confirm the notice in options.

The extractor is a small heuristic, not Mozilla Readability. It prefers `article`, then `main`, then the page body, drops scripts, styles, nav, footer, and forms, and caps the text at 12,000 characters.

## Load the extension unpacked

1. Install [Google Chrome](https://www.google.com/chrome/).
2. Clone this repository and check out the `v1` branch (or the pull request branch under review).
3. Open `chrome://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked** and choose the `extension` directory in this repository. Do not choose the repository root.
6. Pin AutoNote if you want the placeholder icon in the toolbar.
7. Click the toolbar icon. The popup should open with no error on `chrome://extensions`.
8. On the extension card, open **Service worker**. The console should include `AutoNote service worker started`.

Chrome reads `extension/manifest.json` directly. There is no build step.

## Download a build

You can load AutoNote without cloning.

1. Open the [Actions](https://github.com/termainejenkins/AutoNote/actions) run for the pull request, or for the push to `v1` or `main`.
2. Under **Artifacts**, download `autonote-extension-<version>-<short sha>`. The version is `version` in `manifest.json`. The short sha is the first seven characters of that run's commit.
3. Unzip the download.
4. Open `chrome://extensions`, turn on **Developer mode**, and click **Load unpacked**. Choose the unzipped folder, the one that contains `manifest.json`.

The artifact is kept for 14 days. The workflow does not publish a release or deploy.

## Try it with your own Gemini key

AutoNote does not ship a key. Do not commit a key, paste it into an issue, or put it in a tracked `.env` file.

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. In Chrome, open the AutoNote popup and click **Options** (or open **Extension options** from `chrome://extensions`).
3. Read **Before page text is sent**. Check **I understand page text will be sent to Gemini** if you want Generate note or auto notes to work. Leave **Turn on auto notes** unchecked for the first try.
4. Paste the key into **Gemini API key**. The field is masked. Click **Save key**. The field is cleared; the key stays in `chrome.storage.local` on this device and is not synced.
5. Optional: click **Test key**. That click sends one small request that lists a single page of model names. It does not send page content. The first test also asks Chrome for permission to contact `generativelanguage.googleapis.com`.
6. Open a normal article, such as a Wikipedia page or a docs page. Do not use a mail, bank, government, checkout, or login page; those are skipped. Your own blocklist and the optional only-these-sites list are described under Privacy controls in options.
7. Open the AutoNote popup. It should name the page and say how many characters Generate note would send. Auto notes should say they are off.
8. Choose **Study** or **Skim**, then click **Generate note**. The popup says it is sending that character count before the request goes out. A successful note says it was saved on this device.
9. Click **My notes**. The page is grouped under the site and the first part of the path. Use **Copy topic as Markdown** or **Download topic**. The file has a heading per page and a source link on each note. **Delete note** removes it from this device only.
10. Optional auto mode: in options, confirm the notice, check **Turn on auto notes**, and click **Save reading settings**. Chrome asks for permission to read http and https pages. Leave a docs page open and scrolled until the popup's Auto line passes the time and scroll threshold. One note is saved for that URL per day. **Pause auto for 1 hour** in the popup stops that without deleting the key. Turning auto notes off removes the broad site permission.

You can change the Study and Skim seconds and scroll percent in options before saving reading settings. Time counts only while the tab is visible and you have moved the pointer, scrolled, or typed within the last minute. A page that does not scroll counts as fully scrolled.

Click **Remove key** to delete the saved key from this device. Notes are kept until you delete them.

## Privacy controls in options

Open **Options** to review sites and the send log. These controls do not change the defaults: auto notes stay off, the send notice stays unchecked, and the built-in blocklist stays on.

- **Built-in blocklist.** Mail, banking, payments, government, checkout, cart, login, and account paths are listed under Built-in rules. They are always on and cannot be removed. A blocked page never sends text, from Generate note or from auto notes. The popup says why.
- **Your blocklist.** Add or remove your own domains or URL patterns. `example.com` also matches subdomains such as `notes.example.com`. A path pattern such as `/billing` matches that path segment. `shop.example.com/private` matches that host and path. Removing a rule only removes one you added.
- **Only these sites.** Off by default, which keeps the previous behaviour: any site that is not blocked can be noted. When the checkbox is on, auto notes and Generate note run only on the domains you list, including their subdomains. The blocklist still wins. With the checkbox on and no domains listed, nothing is sent.
- **What was sent to Gemini.** Each Gemini request is stored in `chrome.storage.local` on this device: time, URL, title, Study or Skim, the extracted character count, and success or error. The page text and the API key are not stored. The list keeps the newest 200 entries. **Test key** is stored as a key test with no URL. **Clear log** deletes the list from this device.

## Placeholder icons

The toolbar icons are generated placeholders:

- `extension/icons/icon16.png`
- `extension/icons/icon32.png`
- `extension/icons/icon48.png`
- `extension/icons/icon128.png`

Replace those files with brand art when it is ready. Keep the file names so `manifest.json` does not need to change.

## Legacy microservices archive

The previous product was a FastAPI microservices stack (gateway, auth, notes, content, and AI), a React app, Docker Compose, Postgres, Redis, RabbitMQ, Elasticsearch, Prometheus, and Grafana. That tree is archived, not deleted from history.

The lightweight tag [`legacy-microservices`](https://github.com/termainejenkins/AutoNote/tree/legacy-microservices) points at commit `dc72d42b83be3f09d078eb5511c417482a73c1b4`, the tip of `Development--C` on May 29, 2025. Creating the tag did not move `main` or `Development--C`.

Files under `documentation/` describe that archived stack. Each one is marked legacy. Do not use them to run AutoNote v1.

## Checks

Unit tests use Node's built-in test runner. From the repository root:

```bash
node --test
```

End-to-end tests launch Chromium with the unpacked extension and answer Gemini with canned responses. They do not use a real API key. Install Playwright's Chromium, then run:

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` needs a display. GitHub Actions starts that display with `xvfb`. `node --test` does not collect the end-to-end files.

GitHub Actions runs the unit tests, a syntax check of the extension scripts, and the end-to-end job on pull requests and on pushes to `v1` and `main`. When the unit tests pass, it zips `extension/` and uploads the package as an artifact kept for 14 days. See [Download a build](#download-a-build). To build the same zip locally:

```bash
node scripts/package-extension.mjs
```

That writes `dist/autonote-extension-<version>-<short sha>.zip` and fails if `manifest.json` is missing from the zip root or a file the manifest references is not in the archive. The workflow does not deploy and does not use secrets.

## What is still later

Not in this build:

- Research mode, video or PDF capture, and Google Docs or Notion export
- A demo video
- Firefox, Safari, and a Chrome Web Store listing

Out of scope for v1: a hosted proxy, accounts, and the archived microservices stack.

## Proprietary notice

Copyright © 2026 SENTIENT SOLUTIONS LLC. All rights reserved.

Unauthorized copying, transfer, or reproduction of this software, via any medium, is strictly prohibited.
