export function SharedModeToggle({ mode, canUseShared, onChange }) {
  return (
    <div className="shared-toggle" role="group" aria-label="Solo or shared mode">
      <button type="button" className={mode === "solo" ? "is-active" : ""} onClick={() => onChange("solo")}>Solo</button>
      <button type="button" className={mode === "shared" ? "is-active" : ""} onClick={() => onChange("shared")} disabled={!canUseShared}>Shared</button>
      <small>{mode === "shared" ? "Local events paused" : "Local save active"}</small>
    </div>
  );
}
