import { useMemo, useState } from "react";
import { copyToClipboard, formatDateTime } from "../../utils/format.js";

const plannedBadge = <span className="planned-badge">Preview / planned</span>;

export function SettingsModal({
  appVersion,
  identity,
  knownFriends,
  saveSlots,
  activeSaveSlotId,
  lastSharedCookieSnapshot,
  onClose,
  onExport,
  onImport,
  onResetEverything,
  onCreateSaveSlot,
  onRenameSaveSlot,
  onDeleteSaveSlot,
  onSwitchSaveSlot,
  onInviteFriend,
  onReconnectFriend,
  onRequestMultiplayer,
  onForgetFriend,
}) {
  const [saveText, setSaveText] = useState("");
  const [status, setStatus] = useState("");
  const [includeCookieClickerSave, setIncludeCookieClickerSave] = useState(false);
  const [restoreCookieClickerSave, setRestoreCookieClickerSave] = useState(false);
  const [slotName, setSlotName] = useState("");
  const [renameText, setRenameText] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(activeSaveSlotId);
  const [includeCookieInSlot, setIncludeCookieInSlot] = useState(false);

  const activeSlot = useMemo(
    () => saveSlots.find((slot) => slot.id === activeSaveSlotId) ?? saveSlots[0],
    [activeSaveSlotId, saveSlots],
  );

  const selectedSlot = saveSlots.find((slot) => slot.id === selectedSlotId) ?? activeSlot;

  const report = (result) => {
    if (!result) return;
    setStatus(result.message || (result.ok ? "Done." : "Something went wrong."));
  };

  const handleExport = async () => {
    const result = onExport({ includeCookieClickerSave });
    if (!result.ok) {
      report(result);
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
    report(result);
    if (result.ok) setSaveText("");
  };

  const handleCreateSlot = () => {
    const result = onCreateSaveSlot({ name: slotName.trim() || "New Save Slot", includeCookieClickerSave: includeCookieInSlot });
    report(result);
    if (result.ok) {
      setSlotName("");
      setRenameText("");
      if (result.slotId) setSelectedSlotId(result.slotId);
    }
  };

  const handleRenameSlot = () => {
    const result = onRenameSaveSlot({ slotId: selectedSlot?.id, name: renameText.trim() });
    report(result);
    if (result.ok) setRenameText("");
  };

  const handleSwitchSlot = () => {
    report(onSwitchSaveSlot({ slotId: selectedSlot?.id, includeCookieClickerSave: includeCookieInSlot }));
  };

  const handleDeleteSlot = () => {
    if (!selectedSlot) return;
    const confirmed = window.confirm(`Delete save slot "${selectedSlot.name}"? This cannot be undone.`);
    if (!confirmed) return;
    report(onDeleteSaveSlot({ slotId: selectedSlot.id }));
  };

  const handleResetEverything = () => {
    const confirmed = window.confirm(
      "Reset everything? This clears native fruit progress, settings, save slots, the mice counter, Cookie Clicker progress, multiplayer identity, and known friends on this browser.",
    );
    if (!confirmed) return;
    const result = onResetEverything();
    setSaveText("");
    report(result);
  };

  const handleFriendAction = async (action, friend) => {
    try {
      report(await action(friend));
    } catch (error) {
      setStatus(error.message || "Friend action failed.");
    }
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
              <h3>Build</h3>
              <span>Version {appVersion}</span>
            </div>
            <p>Version number is stored in the app constants and should be incremented each focused pass.</p>
            <div className="mini-stat-list">
              <span>Active slot: <strong>{activeSlot?.name ?? "Main Save"}</strong></span>
              <span>Peer ID: <strong>{identity?.peerId ?? "No peer id"}</strong></span>
            </div>
          </section>

          <section className="settings-card settings-card--wide">
            <div className="section-title-row">
              <h3>Save Data</h3>
              <span>{identity?.peerId ?? "No peer id"}</span>
            </div>
            <p>Exports stay compatible with older Clicker saves. Cookie Clicker data is optional and explicit.</p>
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
              This destructive reset clears native progress, save slots, settings, mice clicks, Cookie Clicker saves, multiplayer identity, and known friends on this browser.
            </p>
            {status && <p className="inline-status">{status}</p>}
          </section>

          <section className="settings-card settings-card--wide">
            <div className="section-title-row">
              <h3>Save Slots</h3>
              <span>Active: {activeSlot?.name ?? "Main Save"}</span>
            </div>
            <p>Slots store native clickers, upgrades, ascensions, mice, settings, identity metadata, friends, and optional Cookie Clicker saves.</p>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={includeCookieInSlot}
                onChange={(event) => setIncludeCookieInSlot(event.target.checked)}
              />
              <span>Include Cookie Clicker when creating or leaving a slot</span>
            </label>
            <div className="slot-controls">
              <label className="field-label">
                <span>Slot name</span>
                <input value={slotName} onChange={(event) => setSlotName(event.target.value)} placeholder="Weekend lime empire" />
              </label>
              <button type="button" onClick={handleCreateSlot}>Create Slot From Current Save</button>
            </div>
            <label className="field-label">
              <span>Selected slot</span>
              <select value={selectedSlot?.id ?? ""} onChange={(event) => setSelectedSlotId(event.target.value)}>
                {saveSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>{slot.name}{slot.id === activeSaveSlotId ? " (active)" : ""}</option>
                ))}
              </select>
            </label>
            <div className="slot-list">
              {saveSlots.map((slot) => (
                <article className={`slot-card ${slot.id === activeSaveSlotId ? "is-active" : ""}`} key={slot.id}>
                  <strong>{slot.name}</strong>
                  <span>{slot.id === activeSaveSlotId ? "Active slot" : "Stored slot"}</span>
                  <small>Updated {formatDateTime(slot.updatedAt)}</small>
                  <small>{slot.hasCookieClickerSave ? "Includes Cookie Clicker" : "No Cookie Clicker save stored"}</small>
                </article>
              ))}
            </div>
            <div className="save-actions">
              <button type="button" onClick={handleSwitchSlot} disabled={!selectedSlot || selectedSlot.id === activeSaveSlotId}>Switch Slot</button>
              <button className="danger-button" type="button" onClick={handleDeleteSlot} disabled={!selectedSlot || saveSlots.length <= 1}>Delete Slot</button>
            </div>
            <div className="slot-controls">
              <label className="field-label">
                <span>Rename selected slot</span>
                <input value={renameText} onChange={(event) => setRenameText(event.target.value)} placeholder={selectedSlot?.name ?? "Slot name"} />
              </label>
              <button type="button" onClick={handleRenameSlot} disabled={!renameText.trim()}>Rename Slot</button>
            </div>
          </section>

          <section className="settings-card settings-card--wide">
            <div className="section-title-row">
              <h3>Known Friends</h3>
              <span>{knownFriends.length} saved</span>
            </div>
            <p>Friends are remembered after successful encrypted WebRTC verification. They are local records, so invite/reconnect actions create a fresh invite link for you to share.</p>
            {!knownFriends.length && <p className="muted">No known friends yet. Connect once in Multiplayer and they will appear here with their peer ID.</p>}
            <div className="friend-list">
              {knownFriends.map((friend) => (
                <article className="friend-card" key={friend.peerId}>
                  <div>
                    <strong>{friend.displayName}</strong>
                    <small>{friend.peerId}</small>
                  </div>
                  <span>Last connected: {formatDateTime(friend.lastConnected)}</span>
                  <span>Role: {friend.lastRoleUsed || friend.roleUsed || "unknown"} · Connections: {friend.connectionCount ?? 1}</span>
                  <div className="friend-actions">
                    <button type="button" onClick={() => handleFriendAction(onInviteFriend, friend)}>Invite Again</button>
                    <button type="button" onClick={() => handleFriendAction(onReconnectFriend, friend)}>Reconnect</button>
                    <button type="button" onClick={() => handleFriendAction(onRequestMultiplayer, friend)}>Request Multiplayer</button>
                    <button className="danger-button" type="button" onClick={() => report(onForgetFriend(friend.peerId))}>Forget</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="settings-card">
            <div className="section-title-row">
              <h3>Cookie Sync</h3>
              <span>{lastSharedCookieSnapshot ? "Snapshot received" : "Idle"}</span>
            </div>
            <p>Cookie Clicker multiplayer has snapshot-only groundwork. It is not marked implemented until a two-session host/guest test passes; direct guest Cookie actions are not synced.</p>
            {lastSharedCookieSnapshot && <small>Last shared snapshot: {formatDateTime(lastSharedCookieSnapshot.savedAt)}</small>}
          </section>

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
