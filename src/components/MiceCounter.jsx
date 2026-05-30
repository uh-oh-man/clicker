import { formatNumber } from "../utils/format.js";

export function MiceCounter({ count, onClick }) {
  return (
    <button className="mice-counter" type="button" onClick={onClick} aria-label="Click mice counter">
      <img src="/Images/mice.png" alt="" draggable="false" />
      <span>
        <strong>{formatNumber(count, 0)}</strong>
        <small>mice clicks</small>
      </span>
    </button>
  );
}
