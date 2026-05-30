export const COOKIE_CLICKER_SAVE_KEY = "CookieClickerGame";
export const COOKIE_CLICKER_LANG_KEY = "CookieClickerLang";

const COOKIE_STORAGE_KEYS = [
  COOKIE_CLICKER_SAVE_KEY,
  "CookieClickerGameBeta",
  "CookieClickerGameBetaDungeons",
  "CookieClickerGameOld",
  "CookieClickerGamev10466",
];

const getFrameWindow = (iframe) => {
  try {
    return iframe?.contentWindow ?? null;
  } catch {
    return null;
  }
};

const getGame = (iframe) => {
  const frameWindow = getFrameWindow(iframe);
  return frameWindow?.Game ?? null;
};

const safeNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const readCookieClickerStats = (iframe) => {
  const game = getGame(iframe);
  if (!game?.ready) {
    return {
      ready: false,
      cookies: 0,
      cookiesPs: 0,
      cookiesPerClick: 0,
      statusText: "Cookie Clicker loading...",
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ready: true,
    cookies: safeNumber(game.cookies),
    cookiesEarned: safeNumber(game.cookiesEarned),
    cookiesPs: safeNumber(game.cookiesPs) * (1 - safeNumber(game.cpsSucked)),
    cookiesPerClick: safeNumber(game.computedMouseCps, 1),
    bakeryName: game.bakeryName || "Cookie bakery",
    saveKey: game.SaveTo || COOKIE_CLICKER_SAVE_KEY,
    updatedAt: new Date().toISOString(),
  };
};

export const exportCookieClickerSave = (iframe) => {
  const game = getGame(iframe);
  if (game?.WriteSave) {
    const saveData = game.WriteSave(1);
    if (saveData) {
      return {
        ok: true,
        saveData,
        saveKey: game.SaveTo || COOKIE_CLICKER_SAVE_KEY,
        source: "game-api",
        stats: readCookieClickerStats(iframe),
      };
    }
  }

  const stored = window.localStorage?.getItem(COOKIE_CLICKER_SAVE_KEY);
  if (stored) {
    return {
      ok: true,
      saveData: stored,
      saveKey: COOKIE_CLICKER_SAVE_KEY,
      source: "localStorage",
      stats: readCookieClickerStats(iframe),
    };
  }

  return { ok: false, message: "Cookie Clicker has not produced a save yet. Open it once and let it load first." };
};

export const persistCookieClickerSave = (iframe) => {
  const game = getGame(iframe);
  if (!game?.WriteSave) return false;
  const saveData = game.WriteSave(1);
  if (!saveData) return false;
  window.localStorage?.setItem(game.SaveTo || COOKIE_CLICKER_SAVE_KEY, saveData);
  return true;
};

export const restoreCookieClickerSave = (saveData, iframe) => {
  if (!saveData || typeof saveData !== "string") return { ok: false, message: "No Cookie Clicker save data was provided." };
  window.localStorage?.setItem(COOKIE_CLICKER_SAVE_KEY, saveData);

  const game = getGame(iframe);
  if (game?.LoadSave) {
    const loaded = game.LoadSave(saveData, true);
    game.recalculateGains = 1;
    game.toSave = true;
    game.WriteSave?.();
    return { ok: Boolean(loaded), message: loaded ? "Cookie Clicker save restored into the live iframe." : "Cookie Clicker save was stored and will load on next open." };
  }

  return { ok: true, message: "Cookie Clicker save stored. It will load when Cookie Clicker opens." };
};

export const clearCookieClickerData = (iframe, { clearLanguage = false } = {}) => {
  const game = getGame(iframe);
  let liveReset = false;

  if (game?.HardReset) {
    game.HardReset(2);
    game.toSave = false;
    liveReset = true;
  }

  COOKIE_STORAGE_KEYS.forEach((key) => window.localStorage?.removeItem(key));
  if (clearLanguage) window.localStorage?.removeItem(COOKIE_CLICKER_LANG_KEY);

  COOKIE_STORAGE_KEYS.forEach((key) => {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/cookie-clicker`;
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/cookie-clicker/`;
  });

  return {
    ok: true,
    liveReset,
    message: liveReset ? "Cookie Clicker was reset in the live iframe and stored saves were cleared." : "Cookie Clicker stored saves were cleared.",
  };
};

export const getCookieClickerMultiplayerInvestigation = () => ({
  implemented: false,
  reason:
    "Cookie Clicker exposes reliable save snapshots and readable live stats, but this pass did not add host-authoritative WebRTC sync because safe syncing needs a new message protocol and conflict policy instead of mutating the iframe directly from guests.",
  filesInspected: [
    "public/cookie-clicker/main.js",
    "public/cookie-clicker/index.html",
    "Cookie-Clicker/main.js",
    "src/services/multiplayer/multiplayerHostService.js",
    "src/services/multiplayer/multiplayerGuestService.js",
    "src/utils/multiplayer/messageSchemas.js",
  ],
  works: [
    "Cookie totals, CPS, cookies per click, and save key can be read from iframe.contentWindow.Game.",
    "Cookie Clicker save snapshots can be exported with Game.WriteSave(1).",
    "Cookie Clicker save snapshots can be restored with Game.LoadSave(save, true) or localStorage key CookieClickerGame.",
  ],
  doesNotWork: [
    "No host-authoritative Cookie Clicker action-request protocol exists yet.",
    "No guest read-only Cookie Clicker iframe mode exists yet.",
    "No snapshot revision/merge policy exists for Cookie Clicker saves.",
  ],
  nextSteps: [
    "Add cookie-clicker-state and cookie-clicker-action-request message types in src/utils/multiplayer/messageSchemas.js.",
    "Add host-only Cookie Clicker snapshot broadcasting in src/App.jsx using Game.WriteSave(1) at a low frequency.",
    "Add guest restore/render path that calls Game.LoadSave(snapshot, true) without letting guests directly write host state.",
    "Decide whether guests may click Cookie Clicker through approved click requests or should only view host snapshots in V1.",
  ],
});
