export function HostPanel({
  displayName,
  inviteCode,
  responseCode,
  activeSaveSlotName,
  linkInvite,
  onDisplayNameChange,
  onCreateInviteLink,
  onCancelInviteLink,
  onStart,
  onResponseCodeChange,
  onConnectResponse,
  onCopyInvite,
  onCopyInviteLink,
  busy,
}) {
  return (
    <div className="multiplayer-panel-stack">
      <label className="field-label">
        <span>Display name</span>
        <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} placeholder="Host display name" />
      </label>
      <p className="hint">Hosting uses active save slot: <strong>{activeSaveSlotName}</strong>.</p>
      <button type="button" onClick={onCreateInviteLink} disabled={busy}>Create Invite Link</button>
      <label className="field-label">
        <span>Invite URL</span>
        <input value={linkInvite.inviteUrl} readOnly placeholder="Create an invite link to get a shareable URL." />
      </label>
      <div className="pairing-actions">
        <button type="button" onClick={onCopyInviteLink} disabled={!linkInvite.inviteUrl}>Copy Invite Link</button>
        <button className="danger-button" type="button" onClick={onCancelInviteLink} disabled={!linkInvite.code}>Cancel Invite</button>
      </div>
      <p className="hint">Anyone with this invite link can join until it expires. Cloudflare only stores the temporary WebRTC offer and answer.</p>
      <p className={`inline-status ${linkInvite.error ? "is-error" : ""}`}>{linkInvite.error || linkInvite.status}</p>
      {linkInvite.expiresAt && <p className="hint">Expires {new Date(linkInvite.expiresAt).toLocaleString()}</p>}

      <details className="advanced-pairing">
        <summary>Advanced Manual Pairing</summary>
        <button type="button" onClick={onStart} disabled={busy}>Generate Manual Invite Code</button>
        <label className="field-label">
          <span>Invite Code</span>
          <textarea value={inviteCode} readOnly placeholder="Generate a manual invite code." />
        </label>
        <button type="button" onClick={onCopyInvite} disabled={!inviteCode}>Copy Invite Code</button>
        <label className="field-label">
          <span>Guest Response Code</span>
          <textarea value={responseCode} onChange={(event) => onResponseCodeChange(event.target.value)} placeholder="Paste the guest response code here." />
        </label>
        <button type="button" onClick={onConnectResponse} disabled={!responseCode.trim() || busy}>Connect</button>
        <p className="hint">Manual codes include the session encryption key. Do not share them publicly.</p>
      </details>
    </div>
  );
}
