import { useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "./constants/app.js";
import { CLICKER_IDS, CLICKER_MENU_BY_ID, COOKIE_CLICKER } from "./constants/data/clickers.js";
import { ClickerGrid } from "./components/clickers/ClickerGrid.jsx";
import { ClickerDetailModal } from "./components/clickers/ClickerDetailModal.jsx";
import { EmbeddedClickerModal } from "./components/clickers/EmbeddedClickerModal.jsx";
import { EventLayer } from "./components/clickers/EventLayer.jsx";
import { MiceCounter } from "./components/MiceCounter.jsx";
import { MultiplayerWindow } from "./components/multiplayer/MultiplayerWindow.jsx";
import { SettingsModal } from "./components/settings/SettingsModal.jsx";
import {
  activateFruitEvent,
  applyGameTick,
  ascendFruit,
  buyUpgrade,
  clickFruit,
  createInitialState,
  isClickerUnlocked,
  resetEvents,
  sanitizeState,
  selectClicker,
} from "./services/clickerEngine.js";
import {
  clearCookieClickerData,
  exportCookieClickerSave,
  persistCookieClickerSave,
  readCookieClickerStats,
  restoreCookieClickerSave,
} from "./services/cookieClickerService.js";
import { MultiplayerGuestService } from "./services/multiplayer/multiplayerGuestService.js";
import { MultiplayerHostService } from "./services/multiplayer/multiplayerHostService.js";
import { getOrCreatePeerIdentity } from "./services/multiplayer/multiplayerIdentityService.js";
import {
  clearAllClickerStorage,
  exportSave,
  importSave,
  loadKnownFriends,
  loadMiceCounter,
  loadSoloSave,
  rememberFriend,
  saveMiceCounter,
  saveSoloState,
} from "./services/saveService.js";
import { CONNECTION_STATES } from "./utils/multiplayer/connectionStates.js";
import {
  DEFAULT_PERMISSIONS,
  MESSAGE_TYPES,
  createAscendRequest,
  createClickBatchRequest,
  createEventClickRequest,
  createMessage,
  createUpgradeRequest,
  isGuestActionMessage,
  isStaleRevision,
  permissionForMessage,
} from "./utils/multiplayer/messageSchemas.js";
import { copyToClipboard, createId } from "./utils/format.js";
import "./styles.css";

const makeChat = (from, text, id = createId("chat")) => ({ id, from, text, at: new Date().toISOString() });

function App() {
  const [clock, setClock] = useState(() => Date.now());
  const [soloState, setSoloState] = useState(() => loadSoloSave());
  const [sharedState, setSharedState] = useState(() => createInitialState());
  const [identity, setIdentity] = useState(() => getOrCreatePeerIdentity("Local Player"));
  const [knownFriends, setKnownFriends] = useState(() => loadKnownFriends());
  const [mode, setMode] = useState("solo");
  const [openClickerId, setOpenClickerId] = useState(null);
  const [cookieClickerInitialized, setCookieClickerInitialized] = useState(false);
  const [cookieClickerOpen, setCookieClickerOpen] = useState(false);
  const [cookieClickerFullscreen, setCookieClickerFullscreen] = useState(false);
  const [cookieStats, setCookieStats] = useState(null);
  const [miceCount, setMiceCount] = useState(() => loadMiceCounter());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const [multiplayerRole, setMultiplayerRole] = useState("none");
  const [activeTab, setActiveTab] = useState("host");
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATES.IDLE);
  const [statusDetail, setStatusDetail] = useState("Ready for solo clicking.");
  const [players, setPlayers] = useState([]);
  const [hostDisplayName, setHostDisplayName] = useState("Host");
  const [joinDisplayName, setJoinDisplayName] = useState("Guest");
  const [hostInviteCode, setHostInviteCode] = useState("");
  const [hostResponseCode, setHostResponseCode] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joinResponseCode, setJoinResponseCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [guestPermissions, setGuestPermissions] = useState(DEFAULT_PERMISSIONS);
  const [guestSelectedClickerId, setGuestSelectedClickerId] = useState(CLICKER_IDS.LIME);

  const soloStateRef = useRef(soloState);
  const sharedStateRef = useRef(sharedState);
  const modeRef = useRef(mode);
  const roleRef = useRef(multiplayerRole);
  const hostServiceRef = useRef(null);
  const guestServiceRef = useRef(null);
  const cookieIframeRef = useRef(null);
  const clickBatchRef = useRef({});
  const clickBatchTimerRef = useRef(null);

  useEffect(() => { soloStateRef.current = soloState; }, [soloState]);
  useEffect(() => { sharedStateRef.current = sharedState; }, [sharedState]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { roleRef.current = multiplayerRole; }, [multiplayerRole]);

  useEffect(() => {
    const timeout = window.setTimeout(() => saveSoloState(soloState), 500);
    return () => window.clearTimeout(timeout);
  }, [soloState]);

  useEffect(() => {
    saveMiceCounter(miceCount);
  }, [miceCount]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cookieClickerInitialized) return undefined;
    const updateStats = () => setCookieStats(readCookieClickerStats(cookieIframeRef.current));
    updateStats();
    const interval = window.setInterval(updateStats, 1000);
    return () => window.clearInterval(interval);
  }, [cookieClickerInitialized]);

  useEffect(() => {
    if (!cookieClickerInitialized) return undefined;
    const interval = window.setInterval(() => persistCookieClickerSave(cookieIframeRef.current), 5000);
    return () => window.clearInterval(interval);
  }, [cookieClickerInitialized]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSoloState((previous) => {
        if (modeRef.current === "shared") return previous;
        return applyGameTick(previous, { allowSpawns: true, selectedClickerId: previous.selectedClickerId });
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (roleRef.current !== "host" || modeRef.current !== "shared") return;
      let nextState = null;
      setSharedState((previous) => {
        nextState = applyGameTick(previous, { allowSpawns: true, selectedClickerId: previous.selectedClickerId });
        return nextState;
      });
      if (nextState) publishSharedState(nextState);
    }, 750);
    return () => window.clearInterval(interval);
  }, []);

  const renderedState = mode === "shared" ? sharedState : soloState;
  const activeClicker = openClickerId ? CLICKER_MENU_BY_ID[openClickerId] : null;
  const canUseShared = multiplayerRole === "host" || connectionStatus === CONNECTION_STATES.CONNECTED;
  const modeLabel = mode === "shared" ? `Shared ${multiplayerRole === "host" ? "Host" : "Guest"}` : "Solo Local";
  const nativePermissions = useMemo(() => ({
    canClick: mode !== "shared" || multiplayerRole !== "guest" || guestPermissions.canClickSharedFruit,
    canBuy: mode !== "shared" || multiplayerRole !== "guest" || guestPermissions.canBuyUpgrades,
    canAscend: mode !== "shared" || multiplayerRole !== "guest" || guestPermissions.canAscendFruit,
    canEvents: mode !== "shared" || multiplayerRole !== "guest" || guestPermissions.canInteractWithFruitEvents,
  }), [guestPermissions, mode, multiplayerRole]);

  const setStatus = ({ status, detail }) => {
    setConnectionStatus(status);
    if (detail) setStatusDetail(detail);
  };

  const addChatMessage = (message) => {
    setChatMessages((previous) => (previous.some((item) => item.id === message.id) ? previous : [...previous.slice(-60), message]));
  };

  async function publishSharedState(state) {
    if (!hostServiceRef.current) return;
    await hostServiceRef.current.broadcast(
      createMessage(MESSAGE_TYPES.STATE, {
        gameId: state.selectedClickerId,
        state,
        revision: state.revision,
      }),
    );
  }

  const applySharedHostMutation = (mutator) => {
    let nextState = null;
    setSharedState((previous) => {
      nextState = mutator(previous);
      return nextState;
    });
    if (nextState) publishSharedState(nextState);
  };

  const denyGuestRequest = (peer, requestId, reason) => {
    hostServiceRef.current?.sendToPeer(peer, createMessage(MESSAGE_TYPES.REQUEST_DENIED, { requestId, reason }));
  };

  const handleHostGuestMessage = (peer, message) => {
    if (message.type === MESSAGE_TYPES.PONG) {
      const friends = rememberFriend({ displayName: peer.displayName, peerId: peer.peerId, roleUsed: "guest" });
      setKnownFriends(friends);
      publishSharedState(sharedStateRef.current);
      return;
    }

    if (message.type === MESSAGE_TYPES.CHAT) {
      if (!peer.permissions.canUseLiveChat) {
        denyGuestRequest(peer, message.requestId, "Chat permission is disabled by the host.");
        return;
      }
      const chat = makeChat(peer.displayName, message.text, message.id);
      addChatMessage(chat);
      hostServiceRef.current?.broadcast(createMessage(MESSAGE_TYPES.CHAT, chat));
      return;
    }

    if (!isGuestActionMessage(message)) return;

    const neededPermission = permissionForMessage(message.type);
    if (!peer.permissions[neededPermission]) {
      denyGuestRequest(peer, message.requestId, "The host disabled that permission for you.");
      return;
    }

    let result = { ok: false, state: sharedStateRef.current, message: "Unsupported request." };
    const now = Date.now();
    if (message.type === MESSAGE_TYPES.CLICK_REQUEST) result = clickFruit(sharedStateRef.current, message.gameId, message.amount ?? 1, now);
    if (message.type === MESSAGE_TYPES.CLICK_BATCH_REQUEST) result = clickFruit(sharedStateRef.current, message.gameId, message.clicks ?? 1, now);
    if (message.type === MESSAGE_TYPES.BUY_UPGRADE_REQUEST) result = buyUpgrade(sharedStateRef.current, message.gameId, message.upgradeId, now);
    if (message.type === MESSAGE_TYPES.EVENT_CLICK_REQUEST) result = activateFruitEvent(sharedStateRef.current, message.eventId, now);
    if (message.type === MESSAGE_TYPES.ASCEND_REQUEST) result = ascendFruit(sharedStateRef.current, message.gameId, now);

    if (!result.ok) {
      denyGuestRequest(peer, message.requestId, result.message || "Host rejected that request.");
      return;
    }

    setSharedState(result.state);
    publishSharedState(result.state);
  };

  const handleGuestMessage = (message) => {
    if (message.type === MESSAGE_TYPES.STATE) {
      if (isStaleRevision(message.revision, sharedStateRef.current.revision)) return;
      const next = sanitizeState(message.state);
      setSharedState(next);
      if (!isClickerUnlocked(next, guestSelectedClickerId)) setGuestSelectedClickerId(next.selectedClickerId);
      return;
    }

    if (message.type === MESSAGE_TYPES.CHAT) addChatMessage(makeChat(message.from, message.text, message.id));
    if (message.type === MESSAGE_TYPES.PERMISSION_UPDATE) setGuestPermissions({ ...DEFAULT_PERMISSIONS, ...message.permissions });
    if (message.type === MESSAGE_TYPES.REQUEST_DENIED) setStatusDetail(message.reason || "Host rejected a request.");
    if (message.type === MESSAGE_TYPES.KICKED) {
      setMode("solo");
      setStatusDetail(message.message || "You were removed from the session by the host.");
    }
  };

  const createHostService = (displayName) => {
    const hostIdentity = { ...identity, displayName };
    setIdentity(hostIdentity);
    const service = new MultiplayerHostService({
      identity: hostIdentity,
      onStatus: setStatus,
      onGuestMessage: handleHostGuestMessage,
      onPlayersChange: setPlayers,
      onSystemMessage: setStatusDetail,
    });
    hostServiceRef.current = service;
    return service;
  };

  const createGuestService = (displayName) => {
    const guestIdentity = { ...identity, displayName };
    setIdentity(guestIdentity);
    const service = new MultiplayerGuestService({
      identity: guestIdentity,
      onStatus: setStatus,
      onMessage: handleGuestMessage,
      onSystemMessage: setStatusDetail,
    });
    guestServiceRef.current = service;
    return service;
  };

  const handleStartHost = async () => {
    setBusy(true);
    try {
      const service = hostServiceRef.current ?? createHostService(hostDisplayName);
      setMultiplayerRole("host");
      setActiveTab("host");
      const invite = await service.createInvite(hostDisplayName);
      setHostInviteCode(invite);
      setStatusDetail("Invite code generated. Send it to a guest manually.");
    } catch (error) {
      setConnectionStatus(CONNECTION_STATES.FAILED);
      setStatusDetail(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConnectHostResponse = async () => {
    setBusy(true);
    try {
      await hostServiceRef.current?.connectResponse(hostResponseCode);
      setStatusDetail("Response applied. Waiting for WebRTC to open and verify.");
    } catch (error) {
      setConnectionStatus(CONNECTION_STATES.FAILED);
      setStatusDetail(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateGuestResponse = async () => {
    setBusy(true);
    try {
      const service = createGuestService(joinDisplayName);
      const response = await service.generateResponse(joinInviteCode, joinDisplayName);
      setJoinResponseCode(response);
      setMultiplayerRole("guest");
      setActiveTab("join");
      setStatusDetail("Response generated. Send it back to the host.");
    } catch (error) {
      setConnectionStatus(CONNECTION_STATES.FAILED);
      setStatusDetail(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    hostServiceRef.current?.disconnect();
    guestServiceRef.current?.disconnect();
    hostServiceRef.current = null;
    guestServiceRef.current = null;
    setMode("solo");
    setMultiplayerRole("none");
    setPlayers([]);
    setChatMessages([]);
    setGuestPermissions(DEFAULT_PERMISSIONS);
    setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
    setStatusDetail("Disconnected. Solo save remains untouched.");
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === "shared" && !canUseShared) return;
    if (nextMode === "shared") setSoloState((previous) => resetEvents(previous));
    setMode(nextMode);
  };

  const selectNativeClicker = (clickerId) => {
    if (mode === "shared" && multiplayerRole === "guest") {
      if (isClickerUnlocked(sharedState, clickerId)) setGuestSelectedClickerId(clickerId);
      return;
    }
    if (mode === "shared" && multiplayerRole === "host") {
      applySharedHostMutation((previous) => selectClicker(previous, clickerId));
      return;
    }
    setSoloState((previous) => selectClicker(previous, clickerId));
  };

  const handleOpenClicker = (clickerId) => {
    const clicker = CLICKER_MENU_BY_ID[clickerId];
    if (clicker?.type === "iframe") {
      setCookieClickerInitialized(true);
      setCookieClickerOpen(true);
      return;
    }
    setOpenClickerId(clickerId);
    if (clicker?.type === "native") selectNativeClicker(clickerId);
  };

  const flushGuestClickBatch = async () => {
    const batches = clickBatchRef.current;
    clickBatchRef.current = {};
    clickBatchTimerRef.current = null;
    await Promise.all(
      Object.entries(batches).map(([gameId, clicks]) => guestServiceRef.current?.send(createClickBatchRequest(gameId, clicks))),
    );
  };

  const queueGuestClick = (clickerId) => {
    clickBatchRef.current[clickerId] = (clickBatchRef.current[clickerId] ?? 0) + 1;
    if (!clickBatchTimerRef.current) {
      clickBatchTimerRef.current = window.setTimeout(flushGuestClickBatch, 150);
    }
  };

  const handleFruitClick = (clickerId) => {
    const now = Date.now();
    if (mode === "shared" && multiplayerRole === "guest") {
      if (!guestPermissions.canClickSharedFruit) {
        setStatusDetail("Host disabled fruit clicking for you.");
        return;
      }
      queueGuestClick(clickerId);
      return;
    }
    if (mode === "shared" && multiplayerRole === "host") {
      applySharedHostMutation((previous) => clickFruit(previous, clickerId, 1, now).state);
      return;
    }
    setSoloState((previous) => clickFruit(previous, clickerId, 1, now).state);
  };

  const handleBuyUpgrade = (clickerId, upgradeId) => {
    const now = Date.now();
    if (mode === "shared" && multiplayerRole === "guest") {
      if (!guestPermissions.canBuyUpgrades) {
        setStatusDetail("Host disabled upgrade buying for you.");
        return;
      }
      guestServiceRef.current?.send(createUpgradeRequest(clickerId, upgradeId));
      return;
    }
    if (mode === "shared" && multiplayerRole === "host") {
      applySharedHostMutation((previous) => buyUpgrade(previous, clickerId, upgradeId, now).state);
      return;
    }
    setSoloState((previous) => buyUpgrade(previous, clickerId, upgradeId, now).state);
  };

  const handleEventClick = (clickerId, eventId) => {
    const now = Date.now();
    if (mode === "shared" && multiplayerRole === "guest") {
      if (!guestPermissions.canInteractWithFruitEvents) {
        setStatusDetail("Host disabled event interaction for you.");
        return;
      }
      guestServiceRef.current?.send(createEventClickRequest(clickerId, eventId));
      return;
    }
    if (mode === "shared" && multiplayerRole === "host") {
      applySharedHostMutation((previous) => activateFruitEvent(previous, eventId, now).state);
      return;
    }
    setSoloState((previous) => activateFruitEvent(previous, eventId, now).state);
  };

  const handleAscend = (clickerId) => {
    const now = Date.now();
    if (mode === "shared" && multiplayerRole === "guest") {
      if (!guestPermissions.canAscendFruit) {
        setStatusDetail("Host disabled ascension for you.");
        return;
      }
      guestServiceRef.current?.send(createAscendRequest(clickerId));
      return;
    }
    if (mode === "shared" && multiplayerRole === "host") {
      applySharedHostMutation((previous) => ascendFruit(previous, clickerId, now).state);
      return;
    }
    setSoloState((previous) => ascendFruit(previous, clickerId, now).state);
  };

  const handleExport = ({ includeCookieClickerSave = false } = {}) => {
    let cookieClickerSave = null;
    if (includeCookieClickerSave) {
      const cookieResult = exportCookieClickerSave(cookieIframeRef.current);
      if (!cookieResult.ok) return { ok: false, message: cookieResult.message };
      cookieClickerSave = cookieResult;
    }

    return {
      ok: true,
      text: exportSave(soloStateRef.current, identity, knownFriends, {
        miceCount,
        cookieClickerSave,
      }),
      message: includeCookieClickerSave ? "Save exported with Cookie Clicker data." : "Save exported without Cookie Clicker data.",
    };
  };

  const handleImport = (raw, { restoreCookieClicker = false } = {}) => {
    const result = importSave(raw);
    if (result.ok) {
      setSoloState(result.state);
      if (result.miceCount !== null) setMiceCount(result.miceCount);
      if (result.peerIdentity?.peerId) setIdentity(result.peerIdentity);
      if (result.knownFriends) setKnownFriends(result.knownFriends);
      let message = "Save imported. Solo state, mice counter, identity, and known friends were validated.";
      if (result.cookieClicker) {
        if (restoreCookieClicker) {
          const cookieRestore = restoreCookieClickerSave(result.cookieClicker.saveData, cookieIframeRef.current);
          setCookieStats(readCookieClickerStats(cookieIframeRef.current));
          message += ` ${cookieRestore.message}`;
        } else {
          message += " Cookie Clicker data was present but not restored because the restore option was off.";
        }
      }
      return { ok: true, message };
    }
    return result;
  };

  const handleResetEverything = () => {
    clearAllClickerStorage({ clearIdentity: true });
    const cookieReset = clearCookieClickerData(cookieIframeRef.current, { clearLanguage: true });
    hostServiceRef.current?.disconnect();
    guestServiceRef.current?.disconnect();
    hostServiceRef.current = null;
    guestServiceRef.current = null;
    const freshSolo = createInitialState();
    const freshShared = createInitialState();
    setSoloState(freshSolo);
    setSharedState(freshShared);
    setMiceCount(0);
    setKnownFriends([]);
    setIdentity(getOrCreatePeerIdentity("Local Player"));
    setMode("solo");
    setMultiplayerRole("none");
    setPlayers([]);
    setChatMessages([]);
    setGuestPermissions(DEFAULT_PERMISSIONS);
    setConnectionStatus(CONNECTION_STATES.IDLE);
    setStatusDetail("Everything was reset. Native progress, mice, Cookie Clicker, settings, identity, and friends were cleared.");
    setCookieStats(readCookieClickerStats(cookieIframeRef.current));
    return { ok: true, message: cookieReset.message };
  };

  const handlePermissionChange = (peerId, permissions) => {
    hostServiceRef.current?.updatePermissions(peerId, permissions);
  };

  const handleKick = (peerId) => {
    hostServiceRef.current?.kickGuest(peerId);
  };

  const handleSendChat = (text) => {
    if (multiplayerRole === "guest") {
      if (!guestPermissions.canUseLiveChat) {
        setStatusDetail("Host disabled live chat for you.");
        return;
      }
      const chat = makeChat(identity.displayName || joinDisplayName, text);
      addChatMessage(chat);
      guestServiceRef.current?.send(createMessage(MESSAGE_TYPES.CHAT, { ...chat, text }));
      return;
    }
    const chat = makeChat(identity.displayName || hostDisplayName, text);
    addChatMessage(chat);
    hostServiceRef.current?.broadcast(createMessage(MESSAGE_TYPES.CHAT, chat));
  };

  const hostProps = {
    displayName: hostDisplayName,
    inviteCode: hostInviteCode,
    responseCode: hostResponseCode,
    onDisplayNameChange: setHostDisplayName,
    onStart: handleStartHost,
    onResponseCodeChange: setHostResponseCode,
    onConnectResponse: handleConnectHostResponse,
    onCopyInvite: () => copyToClipboard(hostInviteCode).then(() => setStatusDetail("Invite code copied.")),
    busy,
  };

  const joinProps = {
    displayName: joinDisplayName,
    inviteCode: joinInviteCode,
    responseCode: joinResponseCode,
    onDisplayNameChange: setJoinDisplayName,
    onInviteCodeChange: setJoinInviteCode,
    onGenerateResponse: handleGenerateGuestResponse,
    onCopyResponse: () => copyToClipboard(joinResponseCode).then(() => setStatusDetail("Response code copied.")),
    busy,
  };

  return (
    <div className="app-shell wii-shell">
      <header className="menu-hero">
        <div className="menu-hero__copy">
          <p className="eyebrow">clicker.uhohman.com</p>
          <div className="hero-title-row">
            <h1>{APP_NAME}</h1>
            <MiceCounter count={miceCount} onClick={() => setMiceCount((previous) => previous + 1)} />
          </div>
          <p>A Wii-style clicker menu. Each box is its own clicker; some are native fruit clickers, and some can be embedded websites like Cookie Clicker.</p>
        </div>
        <div className="menu-controls" aria-label="Main controls">
          <button type="button" onClick={() => setMultiplayerOpen(true)}>Multiplayer</button>
          <button type="button" className="ghost-button" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      <ClickerGrid state={renderedState} now={clock} cookieStats={cookieStats} onOpenClicker={handleOpenClicker} />

      <ClickerDetailModal
        clicker={activeClicker}
        state={renderedState}
        now={clock}
        modeLabel={modeLabel}
        permissions={nativePermissions}
        onClose={() => setOpenClickerId(null)}
        onFruitClick={handleFruitClick}
        onBuyUpgrade={handleBuyUpgrade}
        onAscend={handleAscend}
      />

      {cookieClickerInitialized && (
        <EmbeddedClickerModal
          clicker={COOKIE_CLICKER}
          open={cookieClickerOpen}
          fullscreen={cookieClickerFullscreen}
          iframeRef={cookieIframeRef}
          onClose={() => {
            persistCookieClickerSave(cookieIframeRef.current);
            setCookieClickerOpen(false);
            setCookieClickerFullscreen(false);
          }}
          onEnterFullscreen={() => setCookieClickerFullscreen(true)}
          onExitFullscreen={() => setCookieClickerFullscreen(false)}
          onLoad={() => setCookieStats(readCookieClickerStats(cookieIframeRef.current))}
        />
      )}

      <EventLayer state={renderedState} onEventClick={handleEventClick} now={clock} />

      {settingsOpen && (
        <SettingsModal
          identity={identity}
          knownFriends={knownFriends}
          onClose={() => setSettingsOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
          onResetEverything={handleResetEverything}
        />
      )}

      <MultiplayerWindow
        open={multiplayerOpen}
        activeTab={activeTab}
        mode={mode}
        canUseShared={canUseShared}
        status={connectionStatus}
        statusDetail={statusDetail}
        hostProps={hostProps}
        joinProps={joinProps}
        players={players}
        isHost={multiplayerRole === "host"}
        chatMessages={chatMessages}
        canChat={multiplayerRole === "host" || (multiplayerRole === "guest" && guestPermissions.canUseLiveChat)}
        onClose={() => setMultiplayerOpen(false)}
        onTabChange={setActiveTab}
        onModeChange={handleModeChange}
        onPermissionChange={handlePermissionChange}
        onKick={handleKick}
        onSendChat={handleSendChat}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}

export default App;
