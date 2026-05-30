export function HostPanel({
  displayName,
  inviteCode,
  responseCode,
  onDisplayNameChange,
  onStart,
  onResponseCodeChange,
  onConnectResponse,
  onCopyInvite,
  busy,
}) {
  return (
    <div className="multiplayer-panel-stack">
      <label className="field-label">
        <span>Display name</span>
        <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} placeholder="Host display name" />
      </label>
      <button type="button" onClick={onStart} disabled={busy}>Start Multiplayer Session</button>
      <label className="field-label">
        <span>Invite Code</span>
        <textarea value={inviteCode} readOnly placeholder="Start a session to generate an invite code." />
      </label>
      <button type="button" onClick={onCopyInvite} disabled={!inviteCode}>Copy Invite Code</button>
      <label className="field-label">
        <span>Guest Response Code</span>
        <textarea value={responseCode} onChange={(event) => onResponseCodeChange(event.target.value)} placeholder="Paste the guest response code here." />
      </label>
      <button type="button" onClick={onConnectResponse} disabled={!responseCode.trim() || busy}>Connect</button>
      <p className="hint">The invite code contains the generated encryption key. Anyone with it can join or decrypt this session, so do not share it publicly.</p>
    </div>
  );
}
