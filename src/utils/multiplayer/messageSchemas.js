import { createId } from "../format.js";

export const MESSAGE_TYPES = {
  PING: "ping",
  PONG: "pong",
  STATE: "clicker-state",
  CLICK_REQUEST: "clicker-click-request",
  CLICK_BATCH_REQUEST: "clicker-click-batch-request",
  BUY_UPGRADE_REQUEST: "clicker-buy-upgrade-request",
  EVENT_CLICK_REQUEST: "clicker-event-click-request",
  ASCEND_REQUEST: "clicker-ascend-request",
  CHAT: "chat-message",
  PLAYER_UPDATE: "player-update",
  PERMISSION_UPDATE: "permission-update",
  REQUEST_DENIED: "request-denied",
  KICKED: "kicked",
};

export const DEFAULT_PERMISSIONS = {
  canViewSharedClickers: true,
  canClickSharedFruit: true,
  canBuyUpgrades: true,
  canAscendFruit: true,
  canInteractWithFruitEvents: true,
  canUseLiveChat: true,
  canSaveLocalCopy: true,
};

export const createMessage = (type, payload = {}) => ({
  type,
  requestId: payload.requestId ?? createId("msg"),
  sentAt: new Date().toISOString(),
  ...payload,
});

export const createClickRequest = (gameId, amount = 1) =>
  createMessage(MESSAGE_TYPES.CLICK_REQUEST, { gameId, amount, requestId: createId("click") });

export const createClickBatchRequest = (gameId, clicks) =>
  createMessage(MESSAGE_TYPES.CLICK_BATCH_REQUEST, { gameId, clicks, requestId: createId("batch") });

export const createUpgradeRequest = (gameId, upgradeId) =>
  createMessage(MESSAGE_TYPES.BUY_UPGRADE_REQUEST, { gameId, upgradeId, requestId: createId("upgrade") });

export const createEventClickRequest = (gameId, eventId) =>
  createMessage(MESSAGE_TYPES.EVENT_CLICK_REQUEST, { gameId, eventId, requestId: createId("event") });

export const createAscendRequest = (gameId) =>
  createMessage(MESSAGE_TYPES.ASCEND_REQUEST, { gameId, requestId: createId("ascend") });

export const isGuestActionMessage = (message) =>
  [
    MESSAGE_TYPES.CLICK_REQUEST,
    MESSAGE_TYPES.CLICK_BATCH_REQUEST,
    MESSAGE_TYPES.BUY_UPGRADE_REQUEST,
    MESSAGE_TYPES.EVENT_CLICK_REQUEST,
    MESSAGE_TYPES.ASCEND_REQUEST,
  ].includes(message?.type);

export const permissionForMessage = (messageType) => {
  if (messageType === MESSAGE_TYPES.CLICK_REQUEST || messageType === MESSAGE_TYPES.CLICK_BATCH_REQUEST) return "canClickSharedFruit";
  if (messageType === MESSAGE_TYPES.BUY_UPGRADE_REQUEST) return "canBuyUpgrades";
  if (messageType === MESSAGE_TYPES.EVENT_CLICK_REQUEST) return "canInteractWithFruitEvents";
  if (messageType === MESSAGE_TYPES.ASCEND_REQUEST) return "canAscendFruit";
  if (messageType === MESSAGE_TYPES.CHAT) return "canUseLiveChat";
  return "canViewSharedClickers";
};

export const isStaleRevision = (incomingRevision, currentRevision) => Number(incomingRevision ?? 0) < Number(currentRevision ?? 0);
