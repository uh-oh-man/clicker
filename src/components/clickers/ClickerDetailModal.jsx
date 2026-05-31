import { NativeClickerModal } from "./NativeClickerModal.jsx";

export function ClickerDetailModal({ clicker, state, now, modeLabel, permissions, onClose, onFruitClick, onBuyUpgrade, onAscend, onEventClick }) {
  if (!clicker || clicker.type === "iframe") return null;

  return (
    <NativeClickerModal
      clicker={clicker}
      state={state}
      now={now}
      modeLabel={modeLabel}
      permissions={permissions}
      onClose={onClose}
      onFruitClick={onFruitClick}
      onBuyUpgrade={onBuyUpgrade}
      onAscend={onAscend}
      onEventClick={onEventClick}
    />
  );
}