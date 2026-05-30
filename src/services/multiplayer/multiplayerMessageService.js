import { base64UrlToBytes, bytesToBase64Url } from "./multiplayerCryptoService.js";

const INVITE_PREFIX = "CLICKER_INVITE_V1.";
const RESPONSE_PREFIX = "CLICKER_RESPONSE_V1.";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodePayload = (payload) => bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
const decodePayload = (encoded) => JSON.parse(textDecoder.decode(base64UrlToBytes(encoded)));

export const encodeInviteCode = (payload) => `${INVITE_PREFIX}${encodePayload({ kind: "clicker-webrtc-invite", version: 1, ...payload })}`;

export const decodeInviteCode = (code) => {
  const trimmed = code.trim();
  if (!trimmed.startsWith(INVITE_PREFIX)) throw new Error("Invite code is not a Clicker V1 invite.");
  const payload = decodePayload(trimmed.slice(INVITE_PREFIX.length));
  if (payload.kind !== "clicker-webrtc-invite" || !payload.offer || !payload.sessionKey) {
    throw new Error("Invite code is missing required multiplayer data.");
  }
  return payload;
};

export const encodeResponseCode = (payload) => `${RESPONSE_PREFIX}${encodePayload({ kind: "clicker-webrtc-response", version: 1, ...payload })}`;

export const decodeResponseCode = (code) => {
  const trimmed = code.trim();
  if (!trimmed.startsWith(RESPONSE_PREFIX)) throw new Error("Response code is not a Clicker V1 response.");
  const payload = decodePayload(trimmed.slice(RESPONSE_PREFIX.length));
  if (payload.kind !== "clicker-webrtc-response" || !payload.answer) {
    throw new Error("Response code is missing a WebRTC answer.");
  }
  return payload;
};
