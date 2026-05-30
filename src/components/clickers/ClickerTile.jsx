import { handleImageFallback, resolveAsset } from "../../services/assetService.js";
import { getClickPower, getPassiveProduction, isClickerUnlocked } from "../../services/clickerEngine.js";
import { formatNumber } from "../../utils/format.js";

const getNativeStatus = (clicker, state, now) => {
  const unlocked = isClickerUnlocked(state, clicker.id);
  const progress = state.clickers[clicker.id];
  if (!progress) return { unlocked: false, status: "Unavailable", stat: "No native state" };

  return {
    unlocked,
    status: unlocked ? "Ready to click" : clicker.unlockLabel,
    stat: unlocked
      ? `${formatNumber(progress.count)} ${clicker.currency} · ${formatNumber(getPassiveProduction(state, clicker.id, now))}/sec`
      : `Locked · ${formatNumber(getClickPower(state, clicker.id, now))} base click`,
  };
};

const getIframeStatus = (clicker, cookieStats) => {
  if (clicker.id !== "cookie-clicker") return { status: clicker.unlockLabel, stat: clicker.statusText };
  if (!cookieStats?.ready) return { status: "Local Cookie Clicker", stat: cookieStats ? "Loading cookie stats..." : "Open to start live stats" };

  return {
    status: cookieStats.bakeryName ?? "Cookie bakery",
    stat: `${formatNumber(cookieStats.cookies)} cookies · ${formatNumber(cookieStats.cookiesPs, 1)}/sec · ${formatNumber(cookieStats.cookiesPerClick, 1)}/click`,
  };
};

export function ClickerTile({ clicker, state, now, cookieStats, onOpen }) {
  const nativeStatus = clicker.type === "native" ? getNativeStatus(clicker, state, now) : null;
  const iframeStatus = clicker.type === "iframe" ? getIframeStatus(clicker, cookieStats) : null;
  const unlocked = clicker.type === "iframe" || nativeStatus.unlocked;
  const status = clicker.type === "iframe" ? iframeStatus.status : nativeStatus.status;
  const stat = clicker.type === "iframe" ? iframeStatus.stat : nativeStatus.stat;

  return (
    <button
      className={`channel-tile ${unlocked ? "is-unlocked" : "is-locked"} channel-tile--${clicker.type}`}
      type="button"
      onClick={() => onOpen(clicker.id)}
      style={{ "--accent": clicker.accent, "--glow": clicker.glow }}
      aria-label={`Open ${clicker.name}`}
    >
      <span className="channel-tile__shine" />
      <span className="channel-tile__screen">
        <img src={resolveAsset(clicker.image)} alt="" onError={handleImageFallback} draggable="false" />
      </span>
      <span className="channel-tile__copy">
        <strong>{clicker.name}</strong>
        <small>{status}</small>
        <em>{stat}</em>
      </span>
    </button>
  );
}
