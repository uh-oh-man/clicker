# PROJECT_NOTES.md

Last updated: 2026-05-31
Project: Clicker
Current app version: `0.1.8`

Read this file before editing. It is the current source-of-truth note after the save-slots, notification-removal, GitHub Pages, and Cloudflare Worker signaling pass.

## Current App State

- Main app is a dark Wii-home-menu-inspired clicker grid with native fruit clickers plus embedded Cookie Clicker.
- Header controls: `Multiplayer` and `Settings`.
- Header mice counter uses `https://github.com/uh-oh-man/clicker/blob/main/public/Images/mice.png?raw=true`.
- Settings shows app version, active save slot, save data import/export, save slots, known friends, Cookie sync status, and planned theme/motion/audio controls.
- Vite production base is `/clicker/` for GitHub Pages.

## Notifications

Implemented:

- Buggy app-level toast/notification/log system removed.
- `src/components/clickers/EventLayer.jsx` removed.
- No app notification queues, toast components, notification imports, `events.log`, or event-log mutators remain under `src`.
- Fruit events remain only as inline gameplay UI inside native clicker modals.
- Orange boost status/timer is inline in the native clicker modal title/status panel.

## Save Slots

Implemented and preview-tested:

- Create slot.
- Rename slot.
- Delete slot.
- Switch active slot.
- Active slot is clearly shown in Settings.
- Slots store native clickers, upgrades, ascensions, mice counter, settings, peer identity metadata, known friends, and optional Cookie Clicker save data.
- Cookie Clicker slot save is explicit through the “Include Cookie Clicker when creating or leaving a slot” checkbox.
- Host session creation uses the selected active save slot by seeding shared state from the current active solo state.

Partial:

- If the host changes active save slots while a multiplayer session is already running, the live shared session is not automatically reseeded. Start a fresh host session after switching slots.

## Known Friends

Implemented:

- Known friends persist in localStorage and survive reload.
- Settings exposes `Invite Again`, `Reconnect`, `Request Multiplayer`, and `Forget`.
- Invite/reconnect/request actions create a fresh invite link for the user to share.
- Forget removes the local friend record.

Limitation:

- Known friends are local records only. The app cannot contact a friend automatically without the user sharing an invite link or a future presence/push service.

## Multiplayer Status Button

Implemented and tested:

- Header Multiplayer button is based on actual `connectionStatus`, not whether the window is open.
- `Idle` / `Disconnected`: default styling.
- `Generating invite`, `Waiting for response`, `Connecting`, `Verifying`: amber styling.
- `Connected`: green styling.
- `Failed`: red styling.

## Cloudflare Worker Signaling

Implemented:

- Cloudflare Worker + KV invite-link signaling mailbox.
- Gameplay remains WebRTC peer-to-peer. Cloudflare is not used for fruit clicks, live game state, Cookie Clicker gameplay, or chat after connection.
- Worker files:
  - `worker/src/index.js`
  - `worker/wrangler.toml`
- KV binding: `CLICKER_INVITES`
- KV namespace ID: `b910a5ff68064fd9b1fad48b64a580aa`
- Current deployed Worker version: `38e10091-e074-4a68-a28e-ea5fd8afde0a`
- Working API base used by the frontend: `https://clicker-signaling.uhohman06.workers.dev/api`
- Intended custom API base: `https://clicker.uhohman.com/api`
- Custom route status: deployed as Worker triggers, but testing `POST https://clicker.uhohman.com/api/invite` returned `405 Not Allowed`, so the frontend uses workers.dev until DNS/route proxying is fixed.

Worker endpoints:

- `POST /api/invite`
- `GET /api/invite/:code`
- `POST /api/invite/:code/answer`
- `GET /api/invite/:code/answer`
- `DELETE /api/invite/:code`

Worker behavior:

- CORS and OPTIONS preflight are supported.
- Invite codes use a short random alphabet without confusing characters.
- Invites are stored in KV with a 30-minute TTL.
- Worker stores temporary WebRTC offer/answer metadata only.
- Worker does not store game saves, Cookie Clicker saves, or chat.

Approx Cloudflare usage:

- One invite uses a few Worker requests.
- One invite uses roughly 2-3 KV writes.
- Live gameplay does not call Cloudflare after WebRTC connects.

## Invite-Link Flow

Implemented and headless-tested:

- Host clicks `Create Invite Link`.
- App creates a WebRTC offer using the existing encrypted session-key flow.
- App sends the offer payload to the Worker.
- Worker returns a short code and hash invite URL.
- Invite URLs use GitHub Pages-safe hash routing: `https://uh-oh-man.github.io/clicker/#/invite/CODE`.
- Host polls `/api/invite/:code/answer` every 1.5 seconds.
- Guest opening `#/invite/:code` auto-opens Multiplayer in Join mode.
- Guest fetches the offer, creates an answer, submits it to the Worker, and waits for the host.
- Host polling receives the answer and connects through the existing WebRTC path.
- Manual copy/paste invite/response codes remain under `Advanced Manual Pairing`.

## Cookie Clicker

Implemented and tested:

- Cookie Clicker iframe URL resolves to `/clicker/cookie-clicker/` in production/GitHub Pages builds.
- `public/cookie-clicker/index.html` accepts both `/cookie-clicker/` and `/clicker/cookie-clicker/` as local embed paths.
- Cookie Clicker opens without the wrong-address error page.
- Live Cookie stats update on the tile after Cookie Clicker is opened and clicked.
- Cookie Clicker save export/import remains optional in Settings.

Cookie Clicker multiplayer sync status:

- Not implemented as a tested feature.
- Snapshot-only groundwork exists: host can export `Game.WriteSave(1)`, send `cookie-clicker-save-snapshot`, and guests can restore snapshots into a read-only iframe while in Shared mode.
- This was not verified with a two-session Cookie Clicker snapshot test, so it must not be described as implemented.
- Direct guest Cookie clicks, purchases, upgrades, minigames, and other Cookie actions are not synced.
- Exact next step: test snapshot-only Cookie sync with two independent sessions, then decide whether V1 remains read-only snapshots or adds host-validated Cookie action requests.

Files inspected for Cookie sync:

- `public/cookie-clicker/main.js`
- `public/cookie-clicker/index.html`
- `Cookie-Clicker/main.js`
- `src/services/cookieClickerService.js`
- `src/services/multiplayer/multiplayerHostService.js`
- `src/services/multiplayer/multiplayerGuestService.js`
- `src/services/multiplayer/multiplayerMessageService.js`
- `src/utils/multiplayer/messageSchemas.js`

## Testing Results

Passed:

- `npm run lint`
- `npm run build`
- Worker local smoke test with fake KV: create invite, fetch invite, submit answer, fetch answer, delete invite, malformed JSON error, missing offer/answer errors, missing invite error.
- Worker deploy with `npx wrangler deploy`.
- Live workers.dev API test: create invite, fetch invite, empty answer, submit answer, fetch answer, delete invite, post-delete 404.
- Production preview at `http://127.0.0.1:4175/clicker/`.
- Preview Settings opened and showed `Version 0.1.8`.
- Preview save slots: create, rename, switch, delete.
- Preview known friend record survived reload and exposed invite/reconnect/request/forget actions.
- Preview Cookie Clicker opened at `/clicker/cookie-clicker/`, did not show wrong-address page, and tile stats updated after a cookie click.
- Preview Multiplayer button showed amber while waiting, red on failed invite, and green after headless invite-link WebRTC connection.
- Headless invite-link flow: host created invite URL, guest opened `#/invite/:code`, guest submitted answer through Worker KV, host polling received answer, WebRTC connected.
- `npm run deploy` succeeded after adding Git to PATH and clearing the generated `node_modules/.cache/gh-pages` deploy cache.
- Public site verified at `https://uh-oh-man.github.io/clicker/`: app loads, Settings/version loads, mice image loads, invite-link UI is present, Cookie Clicker opens at `/clicker/cookie-clicker/`, no fatal console errors.

Not fully tested:

- Cookie Clicker multiplayer snapshot sync with two independent sessions.
- Physical mobile-device fullscreen/scroll behavior.
- Custom API route `https://clicker.uhohman.com/api` because it currently returns `405 Not Allowed` instead of reaching the Worker.

## Deployment Status

- Worker deployed: yes, version `38e10091-e074-4a68-a28e-ea5fd8afde0a`.
- GitHub Pages deployed: yes, public site verified.
- Source commit/push: this note is included in the source commit for this pass.
