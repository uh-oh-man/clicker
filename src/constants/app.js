export const APP_ID = "clicker.uhohman.com";
export const APP_NAME = "Clicker";
export const APP_VERSION = "0.1.8";
export const SAVE_VERSION = 1;
export const SAVE_KEY = `${APP_ID}:solo-save:v${SAVE_VERSION}`;
export const SETTINGS_KEY = `${APP_ID}:settings:v${SAVE_VERSION}`;
export const PEER_ID_KEY = `${APP_ID}:peer-id:v${SAVE_VERSION}`;
export const KNOWN_FRIENDS_KEY = `${APP_ID}:known-friends:v${SAVE_VERSION}`;
export const MICE_COUNTER_KEY = `${APP_ID}:mice-counter:v${SAVE_VERSION}`;
export const SAVE_SLOTS_KEY = `${APP_ID}:save-slots:v${SAVE_VERSION}`;
export const ACTIVE_SAVE_SLOT_KEY = `${APP_ID}:active-save-slot:v${SAVE_VERSION}`;
export const EXPORT_MIME = "application/vnd.clicker.uhohman.save+json";

export const APP_BASE_PATH = import.meta.env?.BASE_URL || "/";

export const withAppBasePath = (path) => {
  if (!path) return APP_BASE_PATH;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const cleanBase = APP_BASE_PATH.endsWith("/") ? APP_BASE_PATH : `${APP_BASE_PATH}/`;
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}${cleanPath}`;
};