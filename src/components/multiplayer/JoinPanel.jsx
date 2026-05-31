export function JoinPanel({
  displayName,
  inviteCode,
  responseCode,
  linkInviteCode,
  linkInviteHostName,
  linkInviteStatus,
  linkInviteError,
  onDisplayNameChange,
  onInviteCodeChange,
  onLinkInviteCodeChange,
  onJoinInviteLink,
  onGenerateResponse,
  onCopyResponse,
  busy,
}) {
  return (
    <div className="multiplayer-panel-stack">
      <label className="field-label">
        <span>Display name</span>
        <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} placeholder="Guest display name" />
      </label>

      <label className="field-label">
        <span>Invite link code</span>
        <input value={linkInviteCode} onChange={(event) => onLinkInviteCodeChange(event.target.value.trim())} placeholder="uAk30AA" />
      </label>
      {linkInviteHostName && <p className="hint">Host: <strong>{linkInviteHostName}</strong></p>}
      <button type="button" onClick={onJoinInviteLink} disabled={!linkInviteCode.trim() || busy}>Join Invite</button>
      {(linkInviteStatus || linkInviteError) && <p className={`inline-status ${linkInviteError ? "is-error" : ""}`}>{linkInviteError || linkInviteStatus}</p>}
      <p className="hint">Invite links use Cloudflare only as a short-lived signaling mailbox. Gameplay still moves peer-to-peer after WebRTC connects.</p>

      <details className="advanced-pairing">
        <summary>Advanced Manual Pairing</summary>
        <label className="field-label">
          <span>Host Invite Code</span>
          <textarea value={inviteCode} onChange={(event) => onInviteCodeChange(event.target.value)} placeholder="Paste the host invite code here." />
        </label>
        <button type="button" onClick={onGenerateResponse} disabled={!inviteCode.trim() || busy}>Generate Response Code</button>
        <label className="field-label">
          <span>Response Code</span>
          <textarea value={responseCode} readOnly placeholder="Generate a response, then send it back to the host." />
        </label>
        <button type="button" onClick={onCopyResponse} disabled={!responseCode}>Copy Response Code</button>
        <p className="hint">After sending the response code, keep this tab open while the host clicks Connect.</p>
      </details>
    </div>
  );
}
