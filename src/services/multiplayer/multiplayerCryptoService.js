const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const ensureWebCrypto = () => {
  if (!window.crypto?.subtle) {
    return { ok: false, message: "WebCrypto is unavailable. Use a modern browser over HTTPS or localhost." };
  }
  if (!window.isSecureContext) {
    return { ok: false, message: "Encrypted multiplayer requires HTTPS or localhost." };
  }
  return { ok: true };
};

export const bytesToBase64Url = (bytes) => {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const base64UrlToBytes = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const generateSessionKey = async () => {
  const support = ensureWebCrypto();
  if (!support.ok) throw new Error(support.message);
  const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return bytesToBase64Url(raw);
};

export const importSessionKey = async (sessionKey) => {
  const support = ensureWebCrypto();
  if (!support.ok) throw new Error(support.message);
  const raw = base64UrlToBytes(sessionKey);
  return window.crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const encryptMessage = async (message, sessionKey) => {
  const key = await importSessionKey(sessionKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(JSON.stringify(message));
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return JSON.stringify({
    type: "encrypted-clicker-message",
    version: 1,
    iv: bytesToBase64Url(iv),
    data: bytesToBase64Url(encrypted),
  });
};

export const decryptMessage = async (raw, sessionKey) => {
  const envelope = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (envelope?.type !== "encrypted-clicker-message") throw new Error("Unexpected multiplayer message envelope.");
  const key = await importSessionKey(sessionKey);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(envelope.iv) },
    key,
    base64UrlToBytes(envelope.data),
  );
  return JSON.parse(textDecoder.decode(decrypted));
};
