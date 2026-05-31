import { SIGNALING_API_BASE } from "../../constants/signaling.js";

const apiUrl = (path) => `${SIGNALING_API_BASE.replace(/\/+$/, "")}${path}`;

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const data = await readJson(response);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `Signaling request failed with HTTP ${response.status}.`);
  }
  return data;
};

export const createInvite = ({ offer, hostPeerId, hostName, createdAt }) =>
  requestJson("/invite", {
    method: "POST",
    body: JSON.stringify({ offer, hostPeerId, hostName, createdAt }),
  });

export const getInvite = (code) => requestJson(`/invite/${encodeURIComponent(code)}`);

export const submitAnswer = (code, { answer, guestPeerId, guestName }) =>
  requestJson(`/invite/${encodeURIComponent(code)}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer, guestPeerId, guestName }),
  });

export const getAnswer = (code) => requestJson(`/invite/${encodeURIComponent(code)}/answer`);

export const cancelInvite = (code) =>
  requestJson(`/invite/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });

