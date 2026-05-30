import { PermissionEditor } from "./PermissionEditor.jsx";

export function PlayerList({ players, isHost, onPermissionChange, onKick }) {
  return (
    <div className="player-list">
      <h3>Players</h3>
      {players.length === 0 && <p className="muted">No guests connected yet.</p>}
      {players.map((player) => (
        <article className="player-card" key={player.slotId || player.peerId}>
          <div className="player-card__top">
            <div>
              <strong>{player.displayName}</strong>
              <small>{player.peerId}</small>
            </div>
            <span>{player.status}</span>
          </div>
          {isHost && (
            <>
              <PermissionEditor permissions={player.permissions} onChange={(permissions) => onPermissionChange(player.peerId, permissions)} />
              <button className="danger-button" type="button" onClick={() => onKick(player.peerId)}>Kick Guest</button>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
