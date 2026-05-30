import { CLICKER_MENU } from "../../constants/data/clickers.js";
import { ClickerTile } from "./ClickerTile.jsx";

export function ClickerGrid({ state, now, cookieStats, onOpenClicker }) {
  return (
    <section className="channel-grid" aria-label="Clicker channels">
      {CLICKER_MENU.map((clicker) => (
        <ClickerTile clicker={clicker} key={clicker.id} state={state} now={now} cookieStats={cookieStats} onOpen={onOpenClicker} />
      ))}
    </section>
  );
}
