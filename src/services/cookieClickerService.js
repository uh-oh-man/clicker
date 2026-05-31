import { APP_ID } from "../constants/app.js";

export const COOKIE_CLICKER_SAVE_KEY = "CookieClickerGame";
export const COOKIE_CLICKER_LANG_KEY = "CookieClickerLang";
export const COOKIE_CLICKER_SOLO_BACKUP_KEY = `${APP_ID}:cookie-clicker-solo-backup:v1`;

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

export const createCookieClickerSnapshot = (iframe) => {
  const result = exportCookieClickerSave(iframe);
  if (!result.ok) return result;
  return {
    ok: true,
    version: 1,
    revision: Date.now(),
    savedAt: new Date().toISOString(),
    saveKey: result.saveKey,
    saveData: result.saveData,
    source: result.source,
    stats: result.stats,
  };
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

export const restoreCookieClickerSnapshot = (snapshot, iframe) => {
  if (!snapshot?.saveData) return { ok: false, message: "Cookie Clicker snapshot did not include save data." };
  return restoreCookieClickerSave(snapshot.saveData, iframe);
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
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/clicker/cookie-clicker`;
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/clicker/cookie-clicker/`;
  });

  return {
    ok: true,
    liveReset,
    message: liveReset ? "Cookie Clicker was reset in the live iframe and stored saves were cleared." : "Cookie Clicker stored saves were cleared.",
  };
};

export const backupCookieClickerSoloSave = (iframe) => {
  if (window.localStorage?.getItem(COOKIE_CLICKER_SOLO_BACKUP_KEY)) return { ok: true, message: "Cookie Clicker solo backup already exists." };
  const current = exportCookieClickerSave(iframe);
  const backup = current.ok
    ? { appId: APP_ID, version: 1, empty: false, backedUpAt: new Date().toISOString(), saveData: current.saveData, saveKey: current.saveKey }
    : { appId: APP_ID, version: 1, empty: true, backedUpAt: new Date().toISOString() };
  window.localStorage?.setItem(COOKIE_CLICKER_SOLO_BACKUP_KEY, JSON.stringify(backup));
  return { ok: true, message: "Cookie Clicker solo save was backed up before shared snapshot sync." };
};

export const restoreCookieClickerSoloBackup = (iframe) => {
  const raw = window.localStorage?.getItem(COOKIE_CLICKER_SOLO_BACKUP_KEY);
  if (!raw) return { ok: true, restored: false, message: "No Cookie Clicker solo backup was present." };

  let backup;
  try {
    backup = JSON.parse(raw);
  } catch {
    backup = null;
  }

  window.localStorage?.removeItem(COOKIE_CLICKER_SOLO_BACKUP_KEY);
  if (!backup || backup.appId !== APP_ID) return { ok: false, restored: false, message: "Cookie Clicker solo backup was invalid and was discarded." };
  if (backup.empty) {
    const clear = clearCookieClickerData(iframe, { clearLanguage: false });
    return { ...clear, restored: true, message: "Cookie Clicker returned to an empty solo save after shared mode." };
  }

  const restored = restoreCookieClickerSave(backup.saveData, iframe);
  return { ...restored, restored: true, message: "Cookie Clicker solo save was restored after shared mode." };
};

export const getCookieClickerMultiplayerInvestigation = () => ({
  implemented: false,
  status:
    "Snapshot-only Cookie Clicker multiplayer groundwork is present, but it is not considered implemented until a two-session host/guest test passes.",
  design:
    "The current groundwork lets a host export Game.WriteSave(1), broadcast an encrypted cookie-clicker-save-snapshot message, and let guests restore it into a read-only iframe view while in Shared mode.",
  syncFrequency: "Every 10 seconds while the host is in Shared mode and a verified guest exists; unchanged save strings are not rebroadcast.",
  filesInspected: [
    "public/cookie-clicker/main.js",
    "public/cookie-clicker/index.html",
    "Cookie-Clicker/main.js",
    "src/services/cookieClickerService.js",
    "src/services/multiplayer/multiplayerHostService.js",
    "src/services/multiplayer/multiplayerGuestService.js",
    "src/utils/multiplayer/messageSchemas.js",
  ],
  works: [
    "Cookie totals, CPS, cookies per click, and save key can be read from iframe.contentWindow.Game.",
    "Cookie Clicker save snapshots can be exported with Game.WriteSave(1).",
    "Cookie Clicker save snapshots can be restored with Game.LoadSave(save, true) or localStorage key CookieClickerGame.",
    "Guests are read-only in Shared mode so they cannot directly mutate the host-owned Cookie Clicker state.",
  ],
  doesNotWork: [
    "The snapshot path has not been verified with two independent browser sessions in this pass.",
    "Guest Cookie clicks, building purchases, upgrades, and minigame actions are not sent as host-validated action requests yet.",
    "Snapshot sync is not real-time; it intentionally trades immediacy for save safety.",
  ],
  nextSteps: [
    "Add controlled Cookie Clicker request messages only after each action type can be safely validated by the host.",
    "Test long sessions with two independent browser profiles before increasing sync frequency.",
  ],
});
