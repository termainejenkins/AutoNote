# AutoNote

Copyright © 2026 SENTIENT SOLUTIONS LLC. All rights reserved.  
Created by Termaine "TJ" Jenkins

This software and the associated documentation are the exclusive property of SENTIENT SOLUTIONS LLC. No part of this software may be used, copied, modified, or distributed without the prior written permission of SENTIENT SOLUTIONS LLC.

The repository is public so the work can be reviewed. Public visibility is not an open-source license. No license is granted by this repository.

## What AutoNote v1 is

AutoNote v1 is a Chrome extension that takes notes while you read. There is no AutoNote backend, account, or hosted database. Each person supplies their own Gemini API key. The key and, in later v1 work, the notes stay in Chrome on that person's device.

This branch is the extension skeleton:

- Manifest V3 popup, options page, and background service worker
- A masked Gemini API key field on the options page
- A **Test key** button that contacts Gemini only after a click
- Placeholder toolbar icons

Reading detection, note generation, topic grouping, the notes viewer, and privacy lists are not in this skeleton yet. See [What this change leaves for later](#what-this-change-leaves-for-later).

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

## Add a Gemini API key

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey). AutoNote does not ship a key.
2. Open the popup and click **Gemini key settings**, or open **Extension options** from `chrome://extensions`.
3. Paste the key into **Gemini API key**. The field is masked (`type="password"`).
4. Click **Save key**. Chrome stores it with `chrome.storage.local` on this device. It is not synced to your Google account, and nothing in the extension writes it to disk in this repository.
5. Click **Test key** when you want to check it. That click is the only time this skeleton talks to Gemini. It sends one small `GET` for a single page of model names, using the `x-goog-api-key` header. It does not send page content. The first click also asks Chrome for permission to contact `generativelanguage.googleapis.com` only.
6. Click **Remove key** to delete the saved key from this device.

Do not commit a key, paste it into an issue, or put it in a tracked `.env` file. `.gitignore` ignores `.env` and `.venv/`.

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

GitHub Actions runs that command, plus a syntax check of the extension scripts, on pull requests and on pushes to `v1` and `main`. The workflow does not deploy and does not use secrets.

## What this change leaves for later

Later v1 work, not this skeleton:

- Readable-text extraction and skipping sensitive pages
- Passive read detection (time visible and scroll depth)
- Study and Skim notes through Gemini
- A local note store and topic grouping
- The full popup (mode, pause, badge) and a Markdown notes viewer
- Allowlist, blocklist, and a log of what was sent to the AI
- A packed-extension CI artifact and a demo video
- Google Docs export

Out of scope for v1: a hosted proxy, accounts, the old microservices, Notion export, Research mode, video or PDF capture, other browsers, and a Chrome Web Store listing.

## Proprietary notice

Copyright © 2026 SENTIENT SOLUTIONS LLC. All rights reserved.

Unauthorized copying, transfer, or reproduction of this software, via any medium, is strictly prohibited.
