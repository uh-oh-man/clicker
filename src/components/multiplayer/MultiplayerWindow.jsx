import { ConnectionStatus } from "./ConnectionStatus.jsx";
import { HostPanel } from "./HostPanel.jsx";
import { JoinPanel } from "./JoinPanel.jsx";
import { MultiplayerChat } from "./MultiplayerChat.jsx";
import { PlayerList } from "./PlayerList.jsx";
import { SharedModeToggle } from "./SharedModeToggle.jsx";

export function MultiplayerWindow({
  open,
  activeTab,
  mode,
  canUseShared,
  status,
  statusDetail,
  hostProps,
  joinProps,
  players,
  isHost,
  chatMessages,
  canChat,
  onClose,
  onTabChange,
  onModeChange,
  onPermissionChange,
  onKick,
  onSendChat,
  onDisconnect,
}) {
  if (!open) return null;

  return (
    <div className="window-backdrop" role="presentation">
      <section className="desktop-window multiplayer-window" role="dialog" aria-modal="true" aria-label="Multiplayer window">
        <header className="desktop-window__titlebar">
          <div>
            <span className="window-dot window-dot--red" />
            <span className="window-dot window-dot--yellow" />
            <span className="window-dot window-dot--green" />
          </div>
          <strong>Multiplayer</strong>
          <button type="button" onClick={onClose} aria-label="Close multiplayer window">Close</button>
        </header>

        <div className="multiplayer-window__body">
          <div className="multiplayer-window__sidebar">
            <SharedModeToggle mode={mode} canUseShared={canUseShared} onChange={onModeChange} />
            <ConnectionStatus status={status} detail={statusDetail} />
            <div className="tab-row">
              <button type="button" className={activeTab === "host" ? "is-active" : ""} onClick={() => onTabChange("host")}>Host</button>
              <button type="button" className={activeTab === "join" ? "is-active" : ""} onClick={() => onTabChange("join")}>Join</button>
            </div>
            <button className="ghost-button" type="button" onClick={onDisconnect}>Disconnect</button>
            <div className="limitations-box">
              <h3>V1 Limits</h3>
              <p>Host must stay online.</p>
              <p>Both browsers must stay open.</p>
              <p>Some networks may block direct WebRTC.</p>
              <p>Reconnect may require fresh invite/response codes.</p>
              <p>TURN or signaling can be added later.</p>
            </div>
          </div>

          <div className="multiplayer-window__main">
            {activeTab === "host" ? <HostPanel {...hostProps} /> : <JoinPanel {...joinProps} />}
            <PlayerList players={players} isHost={isHost} onPermissionChange={onPermissionChange} onKick={onKick} />
            <MultiplayerChat messages={chatMessages} canSend={canChat} onSend={onSendChat} />
          </div>
        </div>
      </section>
    </div>
  );
}
