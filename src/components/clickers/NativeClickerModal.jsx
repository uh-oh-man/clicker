import { useState } from "react";
import { EVENT_FRUIT_ASSETS } from "../../constants/data/clickers.js";
import { handleImageFallback, resolveAsset } from "../../services/assetService.js";
import {
  canAscend,
  getActiveOrangeMultiplier,
  getClickPower,
  getPassiveProduction,
  getUpgradeCost,
  getUpgradeLevel,
  isClickerUnlocked,
  isUpgradeMaxed,
} from "../../services/clickerEngine.js";
import { formatNumber } from "../../utils/format.js";

const eventCopy = {
  lemon: {
    title: "Lemon Raid",
    body: "Steals about 25% every 2 seconds. Click to remove.",
  },
  orange: {
    title: "Orange Boost",
    body: "+30% clicks and passive for 30 seconds. Click to activate.",
  },
  eggplant: {
    title: "Eggplant Lockdown",
    body: "Stops passive production for 60 seconds. Click to clear early.",
  },
};

const pickVisual = (clicker) => {
  const variant = clicker.rareVisualVariants?.find((item) => Math.random() < item.chance);
  return variant ?? { id: "default", name: clicker.shortName, image: clicker.image };
};

export function NativeClickerModal({ state, clicker, now, modeLabel, permissions, onClose, onFruitClick, onBuyUpgrade, onAscend, onEventClick }) {
  const [visual, setVisual] = useState(() => pickVisual(clicker));
  const progress = state.clickers[clicker.id];
  const unlocked = isClickerUnlocked(state, clicker.id);
  const clickPower = getClickPower(state, clicker.id, now);
  const passive = getPassiveProduction(state, clicker.id, now);
  const orangeMultiplier = getActiveOrangeMultiplier(state, clicker.id, now);
  const activeOrangeBoost = state.events.orangeBoosts?.[clicker.id];
  const orangeRemaining = activeOrangeBoost?.expiresAt > now ? Math.ceil((activeOrangeBoost.expiresAt - now) / 1000) : 0;
  const activeEvents = state.events.active.filter((event) => event.gameId === clicker.id && event.expiresAt > now);
  const canClick = unlocked && permissions.canClick;
  const canBuy = unlocked && permissions.canBuy;
  const canEvents = unlocked && permissions.canEvents;

  const handleFruitClick = () => {
    if (!canClick) return;
    onFruitClick(clicker.id);
    setVisual(pickVisual(clicker));
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="clicker-modal native-modal" role="dialog" aria-modal="true" aria-label={`${clicker.name} details`} style={{ "--accent": clicker.accent, "--glow": clicker.glow }}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">Native Fruit Clicker</p>
            <h2>{clicker.name}</h2>
            {orangeRemaining > 0 && (
              <span className="orange-title-timer">
                Orange boost {orangeRemaining}s · {formatNumber(orangeMultiplier, 1)}x
              </span>
            )}
          </div>
          <button className="modal-close" type="button" onClick={onClose}>Close</button>
        </header>

        <div className="native-modal__body">
          <section className="native-hero-card">
            <button
              className="native-image-wrap native-image-button"
              type="button"
              onClick={handleFruitClick}
              disabled={!canClick}
              aria-label={`Click ${clicker.shortName}`}
            >
              <span className="native-image-ring" aria-hidden="true" />
              <img src={resolveAsset(visual.image)} alt={visual.name} onError={handleImageFallback} draggable="false" />
            </button>
            <div className="native-summary">
              <span className={`status-chip ${unlocked ? "is-ready" : "is-locked"}`}>{unlocked ? modeLabel : "Locked"}</span>
              <h3>{formatNumber(progress.count)} {clicker.currency}</h3>
              <p>{clicker.description}</p>
              <p className="click-hint">
                {canClick ? `Click the fruit image for ${formatNumber(clickPower)} ${clicker.currency}.` : "Unlock this fruit or restore click permissions to play it here."}
              </p>
              <div className="metric-row">
                <div><strong>{formatNumber(clickPower)}</strong><span>click value</span></div>
                <div><strong>{formatNumber(passive)}</strong><span>passive/sec</span></div>
                <div><strong>{formatNumber(2 ** progress.ascensionLevel, 1)}x</strong><span>ascension</span></div>
                <div><strong>{orangeMultiplier > 1 ? `${formatNumber(orangeMultiplier, 1)}x` : "idle"}</strong><span>orange</span></div>
              </div>
              <div className="unlock-note">
                <strong>Unlock info</strong>
                <span>{unlocked ? "Available now." : clicker.unlockLabel}</span>
              </div>
              <div className="native-actions native-actions--single">
                <button type="button" className="ghost-button" onClick={() => onAscend(clicker.id)} disabled={!unlocked || !canAscend(state)}>
                  Ascend This Fruit
                </button>
              </div>
            </div>
          </section>

          {(activeEvents.length > 0 || orangeRemaining > 0) && (
            <section className="inline-events-panel">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Fruit Events</p>
                  <h3>Active Status</h3>
                </div>
                <span>{activeEvents.length} event{activeEvents.length === 1 ? "" : "s"}</span>
              </div>
              <div className="inline-event-grid">
                {orangeRemaining > 0 && (
                  <article className={`event-card event-card--boost ${activeOrangeBoost?.autoClicked ? "is-auto" : ""}`}>
                    <img src={resolveAsset(EVENT_FRUIT_ASSETS.orange)} alt="" onError={handleImageFallback} />
                    <span>
                      <strong>Orange online</strong>
                      <small>{clicker.shortName} is boosted by {Math.round((activeOrangeBoost?.boost ?? 0.3) * 100)}%.</small>
                      <em>{orangeRemaining}s left</em>
                    </span>
                  </article>
                )}

                {activeEvents.map((event) => {
                  const copy = eventCopy[event.type];
                  const remaining = Math.max(0, Math.ceil((event.expiresAt - now) / 1000));
                  return (
                    <button
                      className={`event-card event-card--${event.type}`}
                      type="button"
                      key={event.id}
                      onClick={() => onEventClick(clicker.id, event.id)}
                      disabled={!canEvents}
                    >
                      <img src={resolveAsset(EVENT_FRUIT_ASSETS[event.type])} alt="" onError={handleImageFallback} />
                      <span>
                        <strong>{copy.title}</strong>
                        <small>{copy.body}</small>
                        <em>{remaining}s left</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="modal-upgrades">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Upgrade Channel</p>
                <h3>Upgrades</h3>
              </div>
              <span>{clicker.upgrades.length} modules</span>
            </div>
            <div className="modal-upgrade-grid">
              {clicker.upgrades.map((upgrade) => {
                const level = getUpgradeLevel(state, clicker.id, upgrade.id);
                const maxed = isUpgradeMaxed(state, clicker.id, upgrade.id);
                const cost = getUpgradeCost(state, clicker.id, upgrade.id);
                const afford = canBuy && !maxed && progress.count >= cost;

                return (
                  <button
                    className={`modal-upgrade ${afford ? "can-buy" : ""}`}
                    key={upgrade.id}
                    type="button"
                    disabled={!afford}
                    onClick={() => onBuyUpgrade(clicker.id, upgrade.id)}
                  >
                    <span>
                      <strong>{upgrade.name}</strong>
                      <small>{upgrade.description}</small>
                    </span>
                    <em>Lv {level}{upgrade.maxLevel ? `/${upgrade.maxLevel}` : ""} · {maxed ? "Maxed" : `${formatNumber(cost)} ${clicker.currency}`}</em>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}