import { useState } from "react";
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

const pickVisual = (clicker) => {
  const variant = clicker.rareVisualVariants?.find((item) => Math.random() < item.chance);
  return variant ?? { id: "default", name: clicker.shortName, image: clicker.image };
};

export function NativeClickerModal({ state, clicker, now, modeLabel, permissions, onClose, onFruitClick, onBuyUpgrade, onAscend }) {
  const [visual, setVisual] = useState(() => pickVisual(clicker));
  const progress = state.clickers[clicker.id];
  const unlocked = isClickerUnlocked(state, clicker.id);
  const clickPower = getClickPower(state, clicker.id, now);
  const passive = getPassiveProduction(state, clicker.id, now);
  const orangeMultiplier = getActiveOrangeMultiplier(state, clicker.id, now);
  const activeOrangeBoost = state.events.orangeBoosts?.[clicker.id];
  const orangeRemaining = activeOrangeBoost?.expiresAt > now ? Math.ceil((activeOrangeBoost.expiresAt - now) / 1000) : 0;
  const canClick = unlocked && permissions.canClick;
  const canBuy = unlocked && permissions.canBuy;

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
