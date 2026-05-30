# PROJECT_NOTES.md

Last updated: 2026-05-30
Project: Clicker
Domain target: clicker.uhohman.com

## Source Of Truth Note

Read this file before editing. It describes the current Clicker app state after the Cookie persistence/fullscreen/stats/reset polish pass.

## Current UI Direction

Implemented: the main page is a dark Wii-home-menu-inspired clicker grid.

Visible main page structure:

- Header label: `clicker.uhohman.com`.
- Large title: `Clicker`.
- Header mice counter beside the title.
- Description: `A Wii-style clicker menu. Each box is its own clicker; some are native fruit clickers, and some can be embedded websites like Cookie Clicker.`
- Top-right controls with `Multiplayer` and `Settings`, with Settings directly under Multiplayer.
- Responsive clicker tile grid.
- Each tile is a large dark rounded channel-style box with image, clicker name, unlock/status text, and a small stat/status line.
- Clicking a tile opens a dark/glassy modal for that clicker.

Removed/absent from the main page:

- Old dashboard-style layout.
- Main-page selected clicker section.
- Bottom bar/dock.
- Event Fruits preview section.
- Asset resolver or preview/test panels.
- Homepage/app-launcher references.

## Clickers

Native fruit clickers:

- Lime Clicker
- Apple Clicker
- Blueberry Clicker
- Charries Clicker

The name is intentionally `Charries`, not `Cherries`.

Unlock chain:

- Lime -> Apple -> Blueberry -> Charries

Starting behavior for native fruit clickers:

- Fresh user starts with Lime as the starter/default native clicker.
- Currency starts at 0.
- Base click value starts at 1.
- Passive/sec starts at 0.
- Upgrade ownership starts at 0.
- `highestEarned` starts at 0 and is used for lemon event gating/debt caps.

## Native Clicker Modals

Implemented:

- Native tiles open a full detail/game modal.
- The large fruit image in the detail modal is the playable click target.
- Clicking the large fruit image immediately adds native currency when the fruit is unlocked and click permissions allow it.
- No separate native clicker window or `Open Clicker` gate is required.
- The modal shows large fruit image, current currency, click value, passive/sec, ascension multiplier, orange boost status, overview text, unlock info, upgrades, and ascension controls.
- Upgrade purchases use the existing native clicker engine.
- Locked native clickers can still be opened for details. Their fruit click buttons are present but disabled until unlocked.
- Ascension remains reachable from the native modal through `Ascend This Fruit` once ascension is available.
- Modal body scrolling uses the modal content area, and bottom upgrade content is reachable.

## Mice Counter

Implemented:

- A simple mice counter appears next to the `Clicker` title.
- Image path: `/Images/mice.png`.
- Clicking the mice image/button increments only the mice count.
- The mice counter has no upgrades, boosts, passive production, shop, events, or fruit interactions.
- The mice count is saved under the namespaced localStorage key `clicker.uhohman.com:mice-counter:v1`.
- Export/import includes the mice count in `localCounters.mice`.
- Reset everything clears the mice count.

## Fruit Events And Notifications

Implemented:

- Fruit event cards and event notifications render from a global app-root layer, not only inside the currently open clicker modal.
- Active event cards can appear while the user is on the main grid or inside any modal.
- Toast/log notifications auto-dismiss after 4 seconds.
- Toast/log notifications also have a manual `Close` button.
- The event dock is constrained to the viewport and can scroll internally if several items are present.

Orange boost UX implemented:

- Clicking an orange event card activates the boost and removes that event card.
- The active orange boost notification/card can be clicked to dismiss the notification without cancelling the boost.
- Native clicker modals show an `Orange boost` timer near the clicker title while that fruit has an active orange boost.
- The timer updates live.
- The timer disappears after the boost expires.

Lemon balance implemented:

- Lemon spawn settings live in `EVENT_BALANCE` in `src/services/clickerEngine.js` instead of being scattered as magic numbers.
- Lemons do not spawn for a clicker until that clicker has reached at least `10,000` highest earned currency.
- Event spawn timing is a 45-120 second window.
- Lemon spawn chance after the threshold is `0.18` per eligible event spawn.
- Lemon stealing uses a base 25% steal rate every 2 seconds before upgrades reduce it.
- Lemon debt is capped with `maxDebt = max(100, highestEarnedForClicker * 0.1)`.
- Lemon stealing clamps count so it cannot go below `-maxDebt`.
- Existing saves migrate safely by adding `highestEarned` to each native clicker.

## Cookie Clicker Tile And Iframe

Implemented:

- `Cookie Clicker` remains a tile in the clicker grid.
- Type: `iframe`.
- Image: `/cookie-clicker/img/perfectCookie.png`.
- Iframe URL: `/cookie-clicker/`.
- Tile status no longer uses the old embedded-only status phrase as the live stat line.
- Before the iframe is initialized, the tile says `Open to start live stats`.
- After Cookie Clicker loads, the tile reads live same-origin iframe stats from `iframe.contentWindow.Game`:
  - `Game.cookies`
  - `Game.cookiesPs`
  - `Game.computedMouseCps`
- The tile displays cookies, cookies/sec, and cookies/click.
- Clicking the tile opens a large dark/glassy iframe modal.
- Modal label: `Embedded Clicker`.
- Modal title: `Cookie Clicker`.
- Iframe uses `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"`.
- The cloned Cookie Clicker files are served from `public/cookie-clicker/`.
- `public/cookie-clicker/index.html` is patched only for local embedding: it treats `/cookie-clicker/` on this site as local mode so Cookie Clicker does not show the `Oops. Wrong address!` iframe blocker.

Persistent iframe behavior implemented:

- Cookie Clicker iframe stays mounted after it is opened once.
- Closing the Cookie Clicker window hides the modal instead of unmounting/destroying the iframe.
- Reopening shows the same live iframe instance.
- The iframe `src` remains `/cookie-clicker/` and is not reassigned on each open.
- Native fruit clickers continue ticking while Cookie Clicker is open or hidden.
- The app quietly persists the live Cookie Clicker save every 5 seconds by calling `Game.WriteSave(1)` and writing the returned data to `CookieClickerGame` without triggering Cookie Clicker's visible save notification.
- Closing Cookie Clicker also performs a quiet save.

Fullscreen behavior implemented:

- Cookie Clicker modal has a `Fullscreen` button.
- Fullscreen expands the existing iframe into a full viewport overlay with a zoom-style transition.
- Fullscreen does not unmount or reload the iframe.
- `Exit fullscreen` appears as a styled Cookie-like overlay button.
- Exiting fullscreen returns to the normal embedded modal without reloading the iframe.

Important separation:

- Cookie Clicker is not synced with the native clicker engine.
- Cookie Clicker is not included in native fruit unlocks.
- Cookie Clicker is not included in fruit events.
- Cookie Clicker is not included in ascension.
- Cookie Clicker is not included in native fruit multiplayer game sync.
- Cookie Clicker may be patched only as needed to load/run locally inside this app; gameplay should not be rewritten for this Clicker site.

## Cookie Clicker Save Export / Import

Implemented:

- Settings export UI has an `Include Cookie Clicker save when exporting` checkbox.
- When unchecked, exports include `embedded.cookieClicker.included: false` and do not include Cookie Clicker save data.
- When checked, exports include Cookie Clicker save data from the live iframe via `Game.WriteSave(1)` or from localStorage key `CookieClickerGame` if the iframe is not currently loaded.
- Settings import UI has a `Restore Cookie Clicker save from imports when present` checkbox.
- Imports always restore the native Clicker save and mice counter when present.
- Imports restore Cookie Clicker only when the import contains Cookie Clicker data and the restore checkbox is enabled.
- Cookie Clicker restore uses `Game.LoadSave(saveData, true)` when the iframe is live, and also writes `CookieClickerGame` for future loads.
- Cookie Clicker remains isolated from the native fruit save state.

Cookie Clicker storage details inspected:

- Save key: `CookieClickerGame`.
- Beta/legacy related keys inspected/cleared during reset: `CookieClickerGameBeta`, `CookieClickerGameBetaDungeons`, `CookieClickerGameOld`, `CookieClickerGamev10466`.
- Language key: `CookieClickerLang`.
- Save export API: `Game.WriteSave(1)`.
- Save import API: `Game.LoadSave(saveData, true)`.
- Reset API: `Game.HardReset(2)`.

## Settings Window

Implemented:

- `Settings` button is in the header top-right directly under `Multiplayer`.
- Settings opens a styled dark/glassy modal.
- Sections included: Theme, Save Data, Motion, Audio.
- Save Data has functional export/import for the native Clicker save.
- Save Data has optional Cookie Clicker save inclusion/restoration.
- Save Data has a destructive `Wipe / Reset Everything` button.
- Reset requires browser confirmation before wiping.
- Reset everything clearly states that it clears native fruit progress, settings, mice clicks, Cookie Clicker saves, multiplayer identity, and known friends on this browser.
- Reset everything clears native save/settings/mice keys, known friends, peer identity, and Cookie Clicker save keys.
- If Cookie Clicker is already loaded, reset also resets the live iframe through `Game.HardReset(2)`.
- Theme, Motion, and Audio controls are clearly labeled as `Preview / planned` where not functional yet.

## Multiplayer Window

Implemented:

- `Multiplayer` button is in the header top-right.
- Button opens the existing manual WebRTC multiplayer window.
- No separate password field exists.
- Invite code generation bundles the generated session encryption key automatically.
- Existing host/guest tabs, connection status, player list, permissions, kick, chat, shared mode toggle, invite/response code boxes, copy buttons, connect/disconnect controls, and limitations UI remain available.

Native fruit sync implemented:

- Game sync remains native-fruit-only.
- Cookie Clicker is not included in native fruit multiplayer sync.

Cookie Clicker multiplayer sync investigation result:

Not implemented.

Reason:

- Cookie Clicker exposes readable live stats and full save snapshot APIs, but safe multiplayer sync needs a new host-authoritative message protocol and conflict policy.
- A fragile half-sync that directly mutates guest/host iframes could corrupt Cookie Clicker saves, especially because Cookie Clicker has many internal systems beyond cookies/CPS: buildings, upgrades, achievements, buffs, minigames, seasons, wrinklers, ascension, and timers.
- The current multiplayer message schema only covers native fruit click, batch click, upgrade, event, ascend, state, chat, permission, and kick messages.

Files inspected for Cookie Clicker multiplayer sync:

- `public/cookie-clicker/main.js`
- `public/cookie-clicker/index.html`
- `Cookie-Clicker/main.js`
- `src/services/cookieClickerService.js`
- `src/services/multiplayer/multiplayerHostService.js`
- `src/services/multiplayer/multiplayerGuestService.js`
- `src/services/multiplayer/multiplayerMessageService.js`
- `src/utils/multiplayer/messageSchemas.js`

What works for future sync:

- Cookie totals can be read from `iframe.contentWindow.Game.cookies`.
- CPS can be read from `iframe.contentWindow.Game.cookiesPs`.
- Cookies per click can be read from `iframe.contentWindow.Game.computedMouseCps`.
- Full Cookie Clicker save snapshots can be exported with `Game.WriteSave(1)`.
- Full Cookie Clicker save snapshots can be restored with `Game.LoadSave(saveData, true)`.
- The app now has `src/services/cookieClickerService.js`, which isolates stat/save/reset helpers for future sync work.

What does not work yet:

- There are no Cookie Clicker multiplayer message types.
- There is no host-authoritative Cookie Clicker snapshot broadcast.
- There is no guest request path for Cookie Clicker clicks/building purchases/upgrades.
- There is no permission model for Cookie Clicker actions.
- There is no guest read-only Cookie Clicker iframe mode.
- There is no revision/merge policy for Cookie Clicker save snapshots.

Exact next steps for Cookie Clicker multiplayer sync:

- Add Cookie Clicker message types in `src/utils/multiplayer/messageSchemas.js`, such as `cookie-clicker-state`, `cookie-clicker-save-snapshot`, and controlled request types.
- Add host-only Cookie Clicker snapshot broadcasting in `src/App.jsx` using `Game.WriteSave(1)` at a low frequency while in Shared mode.
- Add a guest restore/render path in `src/App.jsx` that applies host snapshots with `Game.LoadSave(snapshot, true)`.
- Decide whether guests can actively click Cookie Clicker through approved host requests or only view host snapshots for V1.
- Add permissions for Cookie Clicker view/click/buy if active guest interaction is allowed.
- Test with two real browser sessions before calling Cookie Clicker multiplayer sync implemented.

## Data-Driven Config

Main native data lives in `src/constants/data/clickers.js`.

Current config exports:

- `CLICKERS`: native fruit clickers only, used by the native engine/save/multiplayer systems.
- `CLICKER_BY_ID`: native lookup.
- `COOKIE_CLICKER`: iframe clicker config.
- `CLICKER_MENU`: menu/tile config that combines native clickers plus Cookie Clicker.
- `CLICKER_MENU_BY_ID`: lookup for any tile, native or iframe.

Native menu entries include type metadata derived from the native configs:

- `type: "native"`
- `color` / `accent`
- `baseCps: 0`
- `unlockLabel`
- `description`

Cookie Clicker config includes:

- `id: "cookie-clicker"`
- `name: "Cookie Clicker"`
- `type: "iframe"`
- `image: "/cookie-clicker/img/perfectCookie.png"`
- `externalUrl: "/cookie-clicker/"`
- `unlockLabel`
- `statusText`
- `description`
- `upgrades: []`

## Save System

Save code lives in `src/services/saveService.js`.

Namespaced keys:

- `clicker.uhohman.com:solo-save:v1`
- `clicker.uhohman.com:settings:v1`
- `clicker.uhohman.com:peer-id:v1`
- `clicker.uhohman.com:known-friends:v1`
- `clicker.uhohman.com:mice-counter:v1`

Save data includes native Clicker data plus the simple mice counter:

- unlocked native fruits
- native counts
- native highest earned values
- native upgrade levels
- native ascension levels
- settings
- mice count
- local peer identity through a separate namespaced key
- known friends through a separate namespaced key

Export format includes:

- `appId: "clicker.uhohman.com"`
- `appName: "Clicker"`
- `version`
- MIME marker
- exported timestamp
- solo native state
- `localCounters.mice`
- multiplayer peer identity
- known friends
- optional `embedded.cookieClicker` payload

## Local Network / Meshnet Preview

For development or phone testing over a trusted local network or NordVPN Meshnet, start the Vite server with:

```powershell
npm run dev:mesh
```

On the other Meshnet device, open:

```text
http://uhohman06-himalayas.nord:5173
```

Notes:

- NordVPN Meshnet must be enabled on both devices.
- The other device must be allowed to access this host device through Meshnet.
- Vite is configured to allow the Meshnet hostname `uhohman06-himalayas.nord`.
- Windows Firewall may ask whether Node.js/Vite can accept inbound connections. Prefer allowing that prompt only for trusted/private networks or Meshnet testing.
- If needed, add a narrow optional inbound firewall rule for Node.js or TCP port `5173`; do not disable the firewall globally.
- Do not open router ports.
- Keep `npm run dev:mesh` for development/testing only.
- Production preview remains local-only through `npm run preview`.

## Files Changed In This Pass

Updated app files:

- `src/App.jsx`
- `src/components/clickers/ClickerDetailModal.jsx`
- `src/components/clickers/ClickerGrid.jsx`
- `src/components/clickers/ClickerTile.jsx`
- `src/components/clickers/EmbeddedClickerModal.jsx`
- `src/components/clickers/EventLayer.jsx`
- `src/components/clickers/NativeClickerModal.jsx`
- `src/components/settings/SettingsModal.jsx`
- `src/constants/app.js`
- `src/constants/data/clickers.js`
- `src/services/saveService.js`
- `src/styles.css`
- `PROJECT_NOTES.md`

Added app files:

- `src/components/MiceCounter.jsx`
- `src/services/cookieClickerService.js`

Existing static/source files inspected:

- `public/cookie-clicker/index.html`
- `public/cookie-clicker/main.js`
- `Cookie-Clicker/main.js`

Generated locally:

- `dist/` from `npm run build`

## Testing Results

Passed:

- Service smoke test: Cookie stats can be read from a mocked `iframe.contentWindow.Game`.
- Service smoke test: quiet Cookie save persistence writes `CookieClickerGame`.
- Service smoke test: Cookie export pulls save data from `Game.WriteSave(1)`.
- Service smoke test: app export includes `localCounters.mice`.
- Service smoke test: app export includes Cookie Clicker only when a Cookie save payload is provided.
- Service smoke test: app import restores mice counter and returns Cookie payload for caller-controlled restore.
- Service smoke test: Cookie restore works through mocked `Game.LoadSave`.
- `npm run lint`
- `npm run build`
- Browser smoke test on fresh dev origin: mice counter appeared next to title.
- Browser smoke test: clicking mice three times changed the counter to `3`.
- Browser smoke test: refresh preserved `3` mice clicks.
- Browser smoke test: Cookie Clicker opened at `/cookie-clicker/` and did not show the wrong-address screen.
- Browser smoke test: Cookie tile live stats updated to `1 cookies · 0.0/sec · 1.0/click` after clicking Cookie Clicker.
- Browser smoke test: closing Cookie Clicker hid the modal but kept exactly one iframe mounted.
- Browser smoke test: reopening Cookie Clicker showed the same iframe and preserved `1 cookies`.
- Browser smoke test: fullscreen entered with exactly one iframe still mounted.
- Browser smoke test: fullscreen exit returned to normal modal with exactly one iframe still mounted.
- Browser smoke test: after waiting for quiet persistence and refreshing the whole site, Cookie Clicker restored `1 cookies`.
- Browser smoke test: export without Cookie Clicker had `embedded.cookieClicker.included: false` and no `saveData` field.
- Browser smoke test: export with Cookie Clicker had `embedded.cookieClicker.included: true`, included `saveData`, and included `localCounters.mice`.
- Browser smoke test: reset everything cleared native Lime to `0 limes`.
- Browser smoke test: reset everything cleared mice to `0`.
- Browser smoke test: reset everything cleared Cookie Clicker to `0 cookies · 0.0/sec · 1.0/click`.
- Browser smoke test: importing a save with Cookie restore enabled restored mice to `3` and Cookie Clicker to `1 cookies`.
- Browser smoke test: clicking an orange event activated the boost.
- Browser smoke test: clicking the active orange boost notification dismissed that notification while keeping the boost active.
- Browser smoke test: Lime modal showed `Orange boost 26s · 1.3x` near the title.
- Browser smoke test: orange timer counted down from `26s` to `24s`.
- Browser smoke test: orange timer disappeared after the boost expired.

Not fully re-tested in this pass:

- Real two-browser multiplayer invite/response flow.
- Cookie Clicker multiplayer sync, because it is not implemented.
- Physical mobile-device fullscreen/scroll behavior. Desktop browser behavior and responsive CSS were checked.

## Known Limitations

- Cookie Clicker opens its own first-run language dialog and manages its own internal UI/save format.
- Cookie Clicker can be exported/imported through the Clicker Settings UI, but it remains separate from native fruit mechanics.
- Cookie Clicker multiplayer sync is not implemented for the reasons documented above.
- Theme, Motion, and Audio settings are styled placeholders and clearly marked as preview/planned.
- Direct WebRTC may fail on restrictive networks because V1 intentionally has no TURN server.
- Full manual multiplayer copy/paste across two independent real browsers was not completed in this environment.
- `git` was not available in this shell, so no git status, branch, stage, commit, or push actions were performed.
