import { getStoredPeerId, storePeerId } from "../saveService.js";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomChunk = (length = 4) => {
  const bytes = window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(length)) : null;
  return Array.from({ length }, (_, index) => {
    const value = bytes ? bytes[index] : Math.floor(Math.random() * alphabet.length);
    return alphabet[value % alphabet.length];
  }).join("");
};

export const generatePeerId = () => `PEER-${randomChunk()}-${randomChunk()}`;

export const getOrCreatePeerIdentity = (displayName = "Local Player") => {
  const existing = getStoredPeerId();
  const peerId = existing || generatePeerId();
  if (!existing) storePeerId(peerId);
  return {
    peerId,
    displayName,
    createdAt: new Date().toISOString(),
  };
};
