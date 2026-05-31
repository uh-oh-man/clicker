import {
  ACTIVE_SAVE_SLOT_KEY,
  APP_ID,
  EXPORT_MIME,
  KNOWN_FRIENDS_KEY,
  MICE_COUNTER_KEY,
  PEER_ID_KEY,
  SAVE_KEY,
  SAVE_SLOTS_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
} from "../constants/app.js";
import { createId } from "../utils/format.js";
import { createInitialState, sanitizeState } from "./clickerEngine.js";
import { safeJsonParse } from "../utils/format.js";

export const DEFAULT_SAVE_SLOT_ID = "slot-main";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const nowIso = () => new Date().toISOString();

const createDefaultSlot = (createdAt = nowIso()) => ({
  id: DEFAULT_SAVE_SLOT_ID,
  name: "Main Save",
  createdAt,
  updatedAt: createdAt,
  hasCookieClickerSave: false,
});

const emptySlotStore = () => {
  const slot = createDefaultSlot();
  return {
    appId: APP_ID,
    version: SAVE_VERSION,
    activeSlotId: slot.id,
    slots: [slot],
    snapshots: {},
  };
};

const sanitizeSlot = (slot, fallbackIndex = 0) => {
  const createdAt = slot?.createdAt || nowIso();
  return {
    id: typeof slot?.id === "string" && slot.id.trim() ? slot.id : `slot-${fallbackIndex}`,
    name: typeof slot?.name === "string" && slot.name.trim() ? slot.name.trim().slice(0, 48) : `Save Slot ${fallbackIndex + 1}`,
    createdAt,
    updatedAt: slot?.updatedAt || createdAt,
    hasCookieClickerSave: Boolean(slot?.hasCookieClickerSave),
  };
};

const normalizeSlotStore = (payload) => {
  if (!payload || typeof payload !== "object" || payload.appId !== APP_ID) return emptySlotStore();
  const slots = Array.isArray(payload.slots) ? payload.slots.map(sanitizeSlot).filter((slot) => slot.id) : [];
  const uniqueSlots = [];
  const seen = new Set();
  slots.forEach((slot) => {
    if (seen.has(slot.id)) return;
    seen.add(slot.id);
    uniqueSlots.push(slot);
  });
  if (!uniqueSlots.length) uniqueSlots.push(createDefaultSlot());

  const snapshots = payload.snapshots && typeof payload.snapshots === "object" ? payload.snapshots : {};
  const activeSlotId = uniqueSlots.some((slot) => slot.id === payload.activeSlotId) ? payload.activeSlotId : uniqueSlots[0].id;

  return {
    appId: APP_ID,
    version: SAVE_VERSION,
    activeSlotId,
    slots: uniqueSlots,
    snapshots,
  };
};

export const loadSaveSlots = () => {
  if (!canUseStorage()) return emptySlotStore();
  return normalizeSlotStore(safeJsonParse(window.localStorage.getItem(SAVE_SLOTS_KEY), null));
};

const saveSlotStore = (store) => {
  if (!canUseStorage()) return false;
  const normalized = normalizeSlotStore({ ...store, appId: APP_ID, version: SAVE_VERSION });
  window.localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(normalized));
  window.localStorage.setItem(ACTIVE_SAVE_SLOT_KEY, normalized.activeSlotId);
  return true;
};

export const loadActiveSaveSlotId = () => {
  if (!canUseStorage()) return DEFAULT_SAVE_SLOT_ID;
  const store = loadSaveSlots();
  const stored = window.localStorage.getItem(ACTIVE_SAVE_SLOT_KEY);
  return store.slots.some((slot) => slot.id === stored) ? stored : store.activeSlotId;
};

const getActiveSlotSnapshot = () => {
  if (!canUseStorage()) return null;
  const store = loadSaveSlots();
  const activeSlotId = loadActiveSaveSlotId();
  return store.snapshots?.[activeSlotId] ?? null;
};

export const getSaveSlotSnapshot = (slotId) => {
  if (!canUseStorage()) return null;
  const store = loadSaveSlots();
  return store.snapshots?.[slotId] ?? null;
};

export const createSlotSnapshot = ({ state, miceCount = 0, settings = {}, identity = null, knownFriends = [], cookieClickerSave = null } = {}) => ({
  appId: APP_ID,
  version: SAVE_VERSION,
  savedAt: nowIso(),
  state: sanitizeState(state ?? createInitialState()),
  settings: settings && typeof settings === "object" ? settings : {},
  localCounters: {
    mice: Math.max(0, Math.floor(Number(miceCount) || 0)),
  },
  multiplayer: {
    peerIdentity: identity,
    knownFriends: Array.isArray(knownFriends) ? knownFriends : [],
  },
  embedded: {
    cookieClicker: cookieClickerSave
      ? {
          included: true,
          version: 1,
          savedAt: nowIso(),
          saveKey: cookieClickerSave.saveKey,
          source: cookieClickerSave.source,
          saveData: cookieClickerSave.saveData,
          stats: cookieClickerSave.stats,
        }
      : { included: false },
  },
});

const writeSlotSnapshot = (slotId, snapshot, { name = null, preserveExistingCookie = true } = {}) => {
  if (!canUseStorage() || !slotId) return loadSaveSlots();
  const store = loadSaveSlots();
  const existingSnapshot = store.snapshots?.[slotId];
  const existingCookie = existingSnapshot?.embedded?.cookieClicker?.included ? existingSnapshot.embedded.cookieClicker : null;
  const nextSnapshot = structuredClone(snapshot);

  if (preserveExistingCookie && !nextSnapshot.embedded?.cookieClicker?.included && existingCookie) {
    nextSnapshot.embedded = { ...(nextSnapshot.embedded ?? {}), cookieClicker: existingCookie };
  }

  const existingIndex = store.slots.findIndex((slot) => slot.id === slotId);
  const updatedAt = nextSnapshot.savedAt || nowIso();
  const slot = existingIndex >= 0 ? store.slots[existingIndex] : { id: slotId, createdAt: updatedAt };
  const nextSlot = {
    ...slot,
    name: name?.trim() || slot.name || "Untitled Save",
    updatedAt,
    hasCookieClickerSave: Boolean(nextSnapshot.embedded?.cookieClicker?.included),
  };

  if (existingIndex >= 0) store.slots.splice(existingIndex, 1, nextSlot);
  else store.slots.unshift(nextSlot);
  store.snapshots = { ...(store.snapshots ?? {}), [slotId]: nextSnapshot };
  store.activeSlotId = store.activeSlotId || slotId;
  saveSlotStore(store);
  return store;
};

export const saveActiveSlotSnapshot = (slotId, snapshot, options = {}) => writeSlotSnapshot(slotId, snapshot, options);

export const createSaveSlot = (name, snapshot) => {
  const id = createId("slot");
  const store = writeSlotSnapshot(id, snapshot, { name: name || "New Save Slot", preserveExistingCookie: false });
  store.activeSlotId = id;
  saveSlotStore(store);
  return { store, slotId: id, snapshot: store.snapshots[id] };
};

export const renameSaveSlot = (slotId, name) => {
  const store = loadSaveSlots();
  const slot = store.slots.find((item) => item.id === slotId);
  if (!slot || !name?.trim()) return { ok: false, store, message: "Choose a slot and enter a name." };
  slot.name = name.trim().slice(0, 48);
  slot.updatedAt = nowIso();
  saveSlotStore(store);
  return { ok: true, store, message: "Save slot renamed." };
};

export const deleteSaveSlot = (slotId) => {
  const store = loadSaveSlots();
  if (store.slots.length <= 1) return { ok: false, store, message: "Keep at least one save slot." };
  const slot = store.slots.find((item) => item.id === slotId);
  if (!slot) return { ok: false, store, message: "That save slot no longer exists." };

  store.slots = store.slots.filter((item) => item.id !== slotId);
  delete store.snapshots[slotId];
  if (store.activeSlotId === slotId) store.activeSlotId = store.slots[0].id;
  saveSlotStore(store);
  return { ok: true, store, activeSlotId: store.activeSlotId, snapshot: store.snapshots[store.activeSlotId] ?? null, message: `Deleted ${slot.name}.` };
};

export const setActiveSaveSlot = (slotId) => {
  const store = loadSaveSlots();
  if (!store.slots.some((slot) => slot.id === slotId)) return { ok: false, store, message: "That save slot does not exist." };
  store.activeSlotId = slotId;
  saveSlotStore(store);
  return { ok: true, store, snapshot: store.snapshots[slotId] ?? null, message: "Active save slot switched." };
};

export const loadSoloSave = () => {
  const activeSnapshot = getActiveSlotSnapshot();
  if (activeSnapshot?.state) return sanitizeState(activeSnapshot.state);
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
    savedAt: nowIso(),
    state: sanitizeState(state),
  };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return true;
};

export const loadSettings = () => {
  const activeSnapshot = getActiveSlotSnapshot();
  if (activeSnapshot?.settings && typeof activeSnapshot.settings === "object") return activeSnapshot.settings;
  if (!canUseStorage()) return {};
  const payload = safeJsonParse(window.localStorage.getItem(SETTINGS_KEY), {}) ?? {};
  return payload.settings && typeof payload.settings === "object" ? payload.settings : payload;
};

export const saveSettings = (settings) => {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ appId: APP_ID, version: SAVE_VERSION, settings }));
  return true;
};

export const loadMiceCounter = () => {
  const activeSnapshot = getActiveSlotSnapshot();
  if (activeSnapshot?.localCounters?.mice !== undefined) return Math.max(0, Math.floor(Number(activeSnapshot.localCounters.mice) || 0));
  if (!canUseStorage()) return 0;
  const payload = safeJsonParse(window.localStorage.getItem(MICE_COUNTER_KEY), null);
  if (payload?.appId === APP_ID) return Math.max(0, Math.floor(Number(payload.count) || 0));
  return Math.max(0, Math.floor(Number(payload) || 0));
};

export const saveMiceCounter = (count) => {
  if (!canUseStorage()) return false;
  window.localStorage.setItem(
    MICE_COUNTER_KEY,
    JSON.stringify({ appId: APP_ID, version: SAVE_VERSION, savedAt: nowIso(), count: Math.max(0, Math.floor(Number(count) || 0)) }),
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
    JSON.stringify({ appId: APP_ID, version: SAVE_VERSION, savedAt: nowIso(), friends: friends.slice(0, 50) }),
  );
  return true;
};

export const rememberFriend = (friend) => {
  if (!friend?.peerId) return loadKnownFriends();
  const friends = loadKnownFriends();
  const existingIndex = friends.findIndex((item) => item.peerId === friend.peerId);
  const previous = existingIndex >= 0 ? friends[existingIndex] : {};
  const nextFriend = {
    ...previous,
    displayName: friend.displayName || previous.displayName || "Unknown fruit enjoyer",
    peerId: friend.peerId,
    firstConnected: previous.firstConnected || nowIso(),
    lastConnected: nowIso(),
    roleUsed: friend.roleUsed || previous.roleUsed || "unknown",
    lastRoleUsed: friend.roleUsed || previous.lastRoleUsed || "unknown",
    connectionCount: Math.max(0, Number(previous.connectionCount) || 0) + 1,
    notes: friend.notes ?? previous.notes ?? "",
  };

  if (existingIndex >= 0) friends.splice(existingIndex, 1, nextFriend);
  else friends.unshift(nextFriend);

  saveKnownFriends(friends);
  return friends;
};

export const updateKnownFriend = (peerId, updates) => {
  const friends = loadKnownFriends();
  const index = friends.findIndex((friend) => friend.peerId === peerId);
  if (index < 0) return friends;
  friends[index] = { ...friends[index], ...updates, updatedAt: nowIso() };
  saveKnownFriends(friends);
  return friends;
};

export const forgetKnownFriend = (peerId) => {
  const friends = loadKnownFriends().filter((friend) => friend.peerId !== peerId);
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
  exportedAt: nowIso(),
  state: sanitizeState(state),
  localCounters: {
    mice: Math.max(0, Math.floor(Number(options.miceCount) || 0)),
  },
  saveSlot: options.activeSlot
    ? {
        activeSlotId: options.activeSlot.id,
        activeSlotName: options.activeSlot.name,
      }
    : null,
  multiplayer: {
    peerIdentity: identity,
    knownFriends,
  },
  embedded: {
    cookieClicker: options.cookieClickerSave
      ? {
          included: true,
          version: 1,
          savedAt: nowIso(),
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
  window.localStorage.removeItem(SAVE_SLOTS_KEY);
  window.localStorage.removeItem(ACTIVE_SAVE_SLOT_KEY);
  if (clearIdentity) {
    window.localStorage.removeItem(PEER_ID_KEY);
    window.localStorage.removeItem(KNOWN_FRIENDS_KEY);
  }
  return true;
};