import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_FRUIT_ASSETS } from "../../constants/data/clickers.js";
import { handleImageFallback, resolveAsset } from "../../services/assetService.js";
import { getClickerConfig } from "../../services/clickerEngine.js";

const TOAST_AUTO_DISMISS_MS = 4_000;

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

export function EventLayer({ state, onEventClick, now }) {
  const [dismissedToastIds, setDismissedToastIds] = useState([]);
  const [dismissedBoostIds, setDismissedBoostIds] = useState([]);
  const toastTimerRef = useRef({});
  const activeEvents = state.events.active.filter((event) => event.expiresAt > now);
  const boosts = Object.entries(state.events.orangeBoosts ?? {})
    .map(([clickerId, boost]) => [clickerId, boost, `${clickerId}-${boost.expiresAt}`])
    .filter(([, boost, boostKey]) => boost.expiresAt > now && !dismissedBoostIds.includes(boostKey));
  const logs = useMemo(() => state.events.log ?? [], [state.events.log]);
  const logKey = logs.map((item) => item.id).join("|");
  const visibleLogs = logs.filter((item) => !dismissedToastIds.includes(item.id)).slice(0, 3);

  useEffect(() => {
    const ids = logKey ? logKey.split("|") : [];
    const activeLogIds = new Set(ids);

    Object.entries(toastTimerRef.current).forEach(([id, timer]) => {
      if (!activeLogIds.has(id)) {
        window.clearTimeout(timer);
        delete toastTimerRef.current[id];
      }
    });

    ids.forEach((id) => {
      if (toastTimerRef.current[id]) return;
      toastTimerRef.current[id] = window.setTimeout(() => {
        setDismissedToastIds((previous) => (previous.includes(id) ? previous : [...previous, id]));
        delete toastTimerRef.current[id];
      }, TOAST_AUTO_DISMISS_MS);
    });
  }, [logKey]);

  useEffect(() => () => {
    Object.values(toastTimerRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  if (!activeEvents.length && !boosts.length && !visibleLogs.length) return null;

  return (
    <aside className="event-dock" aria-live="polite">
      {activeEvents.map((event) => {
        const copy = eventCopy[event.type];
        const remaining = Math.max(0, Math.ceil((event.expiresAt - now) / 1000));
        return (
          <button className={`event-card event-card--${event.type}`} type="button" key={event.id} onClick={() => onEventClick(event.gameId, event.id)}>
            <img src={resolveAsset(EVENT_FRUIT_ASSETS[event.type])} alt="" onError={handleImageFallback} />
            <span>
              <strong>{copy.title}</strong>
              <small>{getClickerConfig(event.gameId).shortName} - {copy.body}</small>
              <em>{remaining}s left</em>
            </span>
          </button>
        );
      })}

      {boosts.map(([clickerId, boost, boostKey]) => (
        <button
          className={`event-card event-card--boost ${boost.autoClicked ? "is-auto" : ""}`}
          type="button"
          key={boostKey}
          onClick={() => setDismissedBoostIds((previous) => (previous.includes(boostKey) ? previous : [...previous, boostKey]))}
        >
          <img src={resolveAsset(EVENT_FRUIT_ASSETS.orange)} alt="" onError={handleImageFallback} />
          <span>
            <strong>Orange online</strong>
            <small>{getClickerConfig(clickerId).shortName} is boosted by {Math.round(boost.boost * 100)}%.</small>
            <em>{Math.ceil((boost.expiresAt - now) / 1000)}s left</em>
          </span>
        </button>
      ))}

      {visibleLogs.map((item) => (
        <div className="event-log" key={item.id}>
          <span>{item.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setDismissedToastIds((previous) => (previous.includes(item.id) ? previous : [...previous, item.id]))}
          >
            Close
          </button>
        </div>
      ))}
    </aside>
  );
}
