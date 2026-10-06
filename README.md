# Omkar & Shweta wedding invitation

A static invitation using the client's original illustrated scenes. No framework or installed dependencies are needed to build or preview it.

```sh
npm run build
npm start
```

Open http://127.0.0.1:4173. The preview serves only `dist/`. The release ZIP contains only the files needed by the customer-facing static host.

## Editing and publishing

- Edit `index.html`, `styles.css`, and `app.js` in the project root.
- `invitation.json` holds the confirmed names, parents, event times, date, venue and music setting. Elements marked `data-copy` are populated from it during the build and at runtime.
- Run `npm run build` after editing. Upload **only the contents of `dist/`** to the existing host. `.openai/hosting.json` already points to that directory.
- The build validates referenced public assets, rebuilds `dist/`, and changes the CSS, JavaScript and configuration version whenever source content changes. `_headers` requests fresh HTML on hosts that support that file.
- Root PNG/JPG originals are preserved. The site uses optimized WebP copies, lazy-loads later illustrations, and plays scene video only when visible. The door video plays once without a second CSS animation; the hands video holds its final frame.
- `wedding.ics` is generated from the wedding date and Vidhi time. It uses 3:15 PM India time (09:45 UTC) and lists the later celebrations. No unconfirmed end time is invented.

## Music still needed

The chat requests **Jashn-e-Bahaaraa, instrumental**. No audio file was supplied. Once an appropriate audio file is available, place it at `assets/wedding-music.mp3`, set `music.src` to that path in `invitation.json`, and rebuild. The play/pause control appears only when an audio source is configured. Music starts after opening the invitation, with a manual retry if the browser blocks playback.

## Source material

The extracted WhatsApp export and attachments are in `.private/whatsapp/`. The request checklist is in `CLIENT-CHANGES.md`. The private folder and ZIP archive are excluded from Git and the deployment build. Always serve `dist/`, never the project root, which contains private client messages and payment screenshots.

Original artwork and video files remain in `assets/`. The original PDF is reference material and contains superseded wording; it is excluded from the published invitation.

## Browser verification

`tests/invitation.cjs` checks mobile/tablet/desktop layouts, name placement, scratching, motion, video failure handling and JavaScript-free access. Run it against `npm start` with Playwright available to Node. Set `CHROMIUM_PATH` if using an existing browser installation.
