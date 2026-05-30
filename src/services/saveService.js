import { APP_ID, EXPORT_MIME, KNOWN_FRIENDS_KEY, MICE_COUNTER_KEY, PEER_ID_KEY, SAVE_KEY, SAVE_VERSION, SETTINGS_KEY } from "../constants/app.js";
import { createInitialState, sanitizeState } from "./clickerEngine.js";
import { safeJsonParse } from "../utils/format.js";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const loadSoloSave = () => {
  if (!canUseStorage()) return createInitialState();
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return createInitialState();
  const parsed = safeJsonParse(raw);
  if (!parsed || parsed.appId !== APP_ID) return createInitialState();
  return sanitizeState(parsed.state ?? parsed);
};

export const saveSoloState = (state) => {
  if (!canUseStorage()) return false;
  const payload = {
    appId: APP_ID,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state: sanitizeState(state),
  };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return true;
};

export const loadSettings = () => {
  if (!canUseStorage()) return {};
  return safeJsonParse(window.localStorage.getItem(SETTINGS_KEY), {}) ?? {};
};

export const saveSettings = (settings) => {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ appId: APP_ID, version: SAVE_VERSION, settings }));
  return true;
};

export const loadMiceCounter = () => {
  if (!canUseStorage()) return 0;
  const payload = safeJsonParse(window.localStorage.getItem(MICE_COUNTER_KEY), null);
  if (payload?.appId === APP_ID) return Math.max(0, Math.floor(Number(payload.count) || 0));
  return Math.max(0, Math.floor(Number(payload) || 0));
};

export const saveMiceCounter = (count) => {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(
    MICE_COUNTER_KEY,
    JSON.stringify({ appId: APP_ID, version: SAVE_VERSION, savedAt: new Date().toISOString(), count: Math.max(0, Math.floor(Number(count) || 0)) }),
  );
  return true;
};

export const loadKnownFriends = () => {
  if (!canUseStorage()) return [];
  const payload = safeJsonParse(window.localStorage.getItem(KNOWN_FRIENDS_KEY), []);
  if (Array.isArray(payload)) return payload;
  if (payload?.appId === APP_ID && Array.isArray(payload.friends)) return payload.friends;
  return [];
};

export const saveKnownFriends = (friends) => {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(
    KNOWN_FRIENDS_KEY,
    JSON.stringify({ appId: APP_ID, version: SAVE_VERSION, savedAt: new Date().toISOString(), friends: friends.slice(0, 50) }),
  );
  return true;
};

export const rememberFriend = (friend) => {
  const friends = loadKnownFriends();
  const existingIndex = friends.findIndex((item) => item.peerId === friend.peerId);
  const nextFriend = {
    displayName: friend.displayName || "Unknown fruit enjoyer",
    peerId: friend.peerId,
    lastConnected: new Date().toISOString(),
    roleUsed: friend.roleUsed || "unknown",
    notes: friend.notes || "",
  };

  if (existingIndex >= 0) friends.splice(existingIndex, 1, { ...friends[existingIndex], ...nextFriend });
  else friends.unshift(nextFriend);

  saveKnownFriends(friends);
  return friends;
};

export const getStoredPeerId = () => {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(PEER_ID_KEY);
};

export const storePeerId = (peerId) => {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(PEER_ID_KEY, peerId);
  return true;
};

export const buildExportPayload = (state, identity = null, knownFriends = [], options = {}) => ({
  appId: APP_ID,
  appName: "Clicker",
  version: SAVE_VERSION,
  mime: EXPORT_MIME,
  exportedAt: new Date().toISOString(),
  state: sanitizeState(state),
  localCounters: {
    mice: Math.max(0, Math.floor(Number(options.miceCount) || 0)),
  },
  multiplayer: {
    peerIdentity: identity,
    knownFriends,
  },
  embedded: {
    cookieClicker: options.cookieClickerSave
      ? {
          included: true,
          version: 1,
          savedAt: new Date().toISOString(),
          saveKey: options.cookieClickerSave.saveKey,
          source: options.cookieClickerSave.source,
          saveData: options.cookieClickerSave.saveData,
          stats: options.cookieClickerSave.stats,
        }
      : { included: false },
  },
});

export const exportSave = (state, identity, knownFriends, options = {}) => JSON.stringify(buildExportPayload(state, identity, knownFriends, options), null, 2);

export const importSave = (raw) => {
  const parsed = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "That import is not valid JSON." };
  }
  if (parsed.appId !== APP_ID) {
    return { ok: false, message: "This file is not a Clicker save for clicker.uhohman.com." };
  }
  if (!parsed.state) {
    return { ok: false, message: "The save is missing game state." };
  }

  const state = sanitizeState(parsed.state);
  saveSoloState(state);
  if (parsed.localCounters?.mice !== undefined) saveMiceCounter(parsed.localCounters.mice);

  if (parsed.multiplayer?.peerIdentity?.peerId) storePeerId(parsed.multiplayer.peerIdentity.peerId);
  if (Array.isArray(parsed.multiplayer?.knownFriends)) saveKnownFriends(parsed.multiplayer.knownFriends);

  return {
    ok: true,
    state,
    miceCount: parsed.localCounters?.mice !== undefined ? loadMiceCounter() : null,
    peerIdentity: parsed.multiplayer?.peerIdentity ?? null,
    knownFriends: Array.isArray(parsed.multiplayer?.knownFriends) ? parsed.multiplayer.knownFriends : null,
    cookieClicker: parsed.embedded?.cookieClicker?.included && typeof parsed.embedded.cookieClicker.saveData === "string" ? parsed.embedded.cookieClicker : null,
  };
};

export const clearAllClickerStorage = ({ clearIdentity = true } = {}) => {
  if (!canUseStorage()) return false;
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(MICE_COUNTER_KEY);
  if (clearIdentity) {
    window.localStorage.removeItem(PEER_ID_KEY);
    window.localStorage.removeItem(KNOWN_FRIENDS_KEY);
  }
  return true;
};

