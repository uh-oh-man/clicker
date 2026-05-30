import { useState } from "react";
import { copyToClipboard } from "../../utils/format.js";

const plannedBadge = <span className="planned-badge">Preview / planned</span>;

export function SettingsModal({ identity, knownFriends, onClose, onExport, onImport, onResetEverything }) {
  const [saveText, setSaveText] = useState("");
  const [status, setStatus] = useState("");
  const [includeCookieClickerSave, setIncludeCookieClickerSave] = useState(false);
  const [restoreCookieClickerSave, setRestoreCookieClickerSave] = useState(false);

  const handleExport = async () => {
    const result = onExport({ includeCookieClickerSave });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    setSaveText(result.text);
    try {
      await copyToClipboard(result.text);
      setStatus(`${result.message} Copied to clipboard.`);
    } catch {
      setStatus(`${result.message} Clipboard copy was blocked by the browser.`);
    }
  };

  const handleImport = () => {
    const result = onImport(saveText, { restoreCookieClicker: restoreCookieClickerSave });
    setStatus(result.message);
    if (result.ok) setSaveText("");
  };

  const handleResetEverything = () => {
    const confirmed = window.confirm(
      "Reset everything? This clears native fruit progress, settings, the mice counter, Cookie Clicker progress, multiplayer identity, and known friends on this browser.",
    );
    if (!confirmed) return;
    const result = onResetEverything();
    setSaveText("");
    setStatus(result.message);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="clicker-modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="modal-head">
          <div>
            <p className="eyebrow">Clicker Control</p>
            <h2>Settings</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>Close</button>
        </header>

        <div className="settings-grid">
          <section className="settings-card">
            <div className="section-title-row">
              <h3>Theme</h3>
              {plannedBadge}
            </div>
            <p>Dark Wii glass is active. Future theme slots can tune fruit accents and tile density.</p>
            <label className="setting-row is-disabled">
              <span>Channel glow intensity</span>
              <input type="range" min="0" max="100" value="72" disabled readOnly />
            </label>
          </section>

          <section className="settings-card settings-card--wide">
            <div className="section-title-row">
              <h3>Save Data</h3>
              <span>{identity?.peerId ?? "No peer id"}</span>
            </div>
            <p>Native fruit progress, the mice counter, Cookie Clicker export data, peer identity, and known friends are local-first.</p>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={includeCookieClickerSave}
                onChange={(event) => setIncludeCookieClickerSave(event.target.checked)}
              />
              <span>Include Cookie Clicker save when exporting</span>
            </label>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={restoreCookieClickerSave}
                onChange={(event) => setRestoreCookieClickerSave(event.target.checked)}
              />
              <span>Restore Cookie Clicker save from imports when present</span>
            </label>
            <div className="save-actions">
              <button type="button" onClick={handleExport}>Export Save</button>
              <button type="button" onClick={handleImport} disabled={!saveText.trim()}>Import Save</button>
            </div>
            <textarea
              value={saveText}
              onChange={(event) => setSaveText(event.target.value)}
              placeholder="Export your Clicker save or paste a Clicker export here."
            />
            <button className="danger-button reset-everything-button" type="button" onClick={handleResetEverything}>
              Wipe / Reset Everything
            </button>
            <p className="danger-note">
              This destructive reset clears native progress, settings, mice clicks, Cookie Clicker saves, multiplayer identity, and known friends on this browser.
            </p>
            {status && <p className="inline-status">{status}</p>}
            <small>{knownFriends.length ? `${knownFriends.length} known friend records stored locally.` : "No known friends stored yet."}</small>
          </section>

          <section className="settings-card">
            <div className="section-title-row">
              <h3>Motion</h3>
              {plannedBadge}
            </div>
            <p>Hover lifts and modal motion are enabled. A proper reduced-motion toggle is planned; system reduced-motion is already respected.</p>
            <label className="setting-row is-disabled">
              <input type="checkbox" disabled readOnly />
              <span>Reduce channel animation</span>
            </label>
          </section>

          <section className="settings-card">
            <div className="section-title-row">
              <h3>Audio</h3>
              {plannedBadge}
            </div>
            <p>Audio is not active yet. Future clicks can get soft channel blips without becoming arcade chaos.</p>
            <label className="setting-row is-disabled">
              <input type="checkbox" disabled readOnly />
              <span>Enable click sounds</span>
            </label>
          </section>
        </div>
      </section>
    </div>
  );
}
