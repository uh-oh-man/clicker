import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME, APP_VERSION } from "./constants/app.js";
import { CLICKER_IDS, CLICKER_MENU_BY_ID, COOKIE_CLICKER } from "./constants/data/clickers.js";
import { ClickerGrid } from "./components/clickers/ClickerGrid.jsx";
import { ClickerDetailModal } from "./components/clickers/ClickerDetailModal.jsx";
import { EmbeddedClickerModal } from "./components/clickers/EmbeddedClickerModal.jsx";
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
  backupCookieClickerSoloSave,
  clearCookieClickerData,
  createCookieClickerSnapshot,
  exportCookieClickerSave,
  persistCookieClickerSave,
  readCookieClickerStats,
  restoreCookieClickerSave,
  restoreCookieClickerSnapshot,
  restoreCookieClickerSoloBackup,
} from "./services/cookieClickerService.js";
import { MultiplayerGuestService } from "./services/multiplayer/multiplayerGuestService.js";
import { MultiplayerHostService } from "./services/multiplayer/multiplayerHostService.js";
import { getOrCreatePeerIdentity } from "./services/multiplayer/multiplayerIdentityService.js";
import { decodeInviteCode, decodeResponseCode, encodeInviteCode, encodeResponseCode } from "./services/multiplayer/multiplayerMessageService.js";
import {
  cancelInvite as cancelSignalingInvite,
  createInvite as createSignalingInvite,
  getAnswer as getSignalingAnswer,
  getInvite as getSignalingInvite,
  submitAnswer as submitSignalingAnswer,
} from "./services/multiplayer/signalingClient.js";
import {
  clearAllClickerStorage,
  createSaveSlot,
  createSlotSnapshot,
  deleteSaveSlot,
  exportSave,
  forgetKnownFriend,
  importSave,
  loadActiveSaveSlotId,
  loadKnownFriends,
  loadMiceCounter,
  loadSaveSlots,
  loadSettings,
  loadSoloSave,
  rememberFriend,
  renameSaveSlot,
  saveActiveSlotSnapshot,
  saveKnownFriends,
  saveMiceCounter,
  saveSettings,
  saveSoloState,
  setActiveSaveSlot,
  updateKnownFriend,
} from "./services/saveService.js";
import { CONNECTION_STATES } from "./utils/multiplayer/connectionStates.js";
import {
  DEFAULT_PERMISSIONS,
  MESSAGE_TYPES,
  createAscendRequest,
  createClickBatchRequest,
  createCookieClickerSnapshotMessage,
  createEventClickRequest,
  createMessage,
  createUpgradeRequest,
  isGuestActionMessage,
  isStaleRevision,
  permissionForMessage,
} from "./utils/multiplayer/messageSchemas.js";
import { copyToClipboard, createId } from "./utils/format.js";
import "./styles.css";

const COOKIE_SNAPSHOT_SYNC_MS = 10_000;
const SLOT_AUTOSAVE_MS = 800;
const SIGNALING_POLL_MS = 1_500;
const makeChat = (from, text, id = createId("chat")) => ({ id, from, text, at: new Date().toISOString() });

const readInviteCodeFromHash = () => {
  if (typeof window === "undefined") return "";
  const match = window.location.hash.match(/^#\/invite\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
};

const getMultiplayerButtonState = (status) => {
  if (status === CONNECTION_STATES.CONNECTED) return "connected";
  if (status === CONNECTION_STATES.FAILED) return "failed";
  if (
    [
      CONNECTION_STATES.CONNECTING,
      CONNECTION_STATES.GENERATING_INVITE,
      CONNECTION_STATES.WAITING_FOR_RESPONSE,
      CONNECTION_STATES.VERIFYING,
    ].includes(status)
  ) {
    return "connecting";
  }
  return "disconnected";
};

function App() {
  const [clock, setClock] = useState(() => Date.now());
  const [soloState, setSoloState] = useState(() => loadSoloSave());
  const [sharedState, setSharedState] = useState(() => createInitialState());
  const [settings, setSettings] = useState(() => loadSettings());
  const [slotStore, setSlotStore] = useState(() => loadSaveSlots());
  const [activeSaveSlotId, setActiveSaveSlotId] = useState(() => loadActiveSaveSlotId());
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
  const [linkInvite, setLinkInvite] = useState({ code: "", inviteUrl: "", expiresAt: "", status: "No invite link active.", error: "" });
  const [pendingInviteCode, setPendingInviteCode] = useState(() => readInviteCodeFromHash());
  const [pendingInvite, setPendingInvite] = useState(null);
  const [pendingInviteStatus, setPendingInviteStatus] = useState("");
  const [pendingInviteError, setPendingInviteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [guestPermissions, setGuestPermissions] = useState(DEFAULT_PERMISSIONS);
  const [guestSelectedClickerId, setGuestSelectedClickerId] = useState(CLICKER_IDS.LIME);
  const [lastSharedCookieSnapshot, setLastSharedCookieSnapshot] = useState(null);

  const soloStateRef = useRef(soloState);
  const sharedStateRef = useRef(sharedState);
  const settingsRef = useRef(settings);
  const knownFriendsRef = useRef(knownFriends);
  const identityRef = useRef(identity);
  const miceCountRef = useRef(miceCount);
  const modeRef = useRef(mode);
  const roleRef = useRef(multiplayerRole);
  const guestPermissionsRef = useRef(guestPermissions);
  const activeSaveSlotIdRef = useRef(activeSaveSlotId);
  const hostServiceRef = useRef(null);
  const guestServiceRef = useRef(null);
  const cookieIframeRef = useRef(null);
  const clickBatchRef = useRef({});
  const clickBatchTimerRef = useRef(null);
  const signalingPollRef = useRef(null);
  const activeSignalingCodeRef = useRef("");
  const activeSignalingExpiresAtRef = useRef("");
  const lastCookieSnapshotSaveRef = useRef(null);
  const guestCookieSnapshotRevisionRef = useRef(0);
  const pendingGuestCookieSnapshotRef = useRef(null);
  const guestCookieSoloBackedUpRef = useRef(false);

  const applyGuestCookieSnapshot = useCallback((snapshot) => {
    if (!snapshot || !guestPermissionsRef.current.canViewSharedCookieClicker) return;
    if (!guestCookieSoloBackedUpRef.current) {
      backupCookieClickerSoloSave(cookieIframeRef.current);
      guestCookieSoloBackedUpRef.current = true;
    }
    restoreCookieClickerSnapshot(snapshot, cookieIframeRef.current);
    setLastSharedCookieSnapshot(snapshot);
    setCookieStats(readCookieClickerStats(cookieIframeRef.current));
  }, []);

  const clearSignalingPoll = useCallback(() => {
    if (signalingPollRef.current) {
      window.clearInterval(signalingPollRef.current);
      signalingPollRef.current = null;
    }
    activeSignalingCodeRef.current = "";
    activeSignalingExpiresAtRef.current = "";
  }, []);

  useEffect(() => { soloStateRef.current = soloState; }, [soloState]);
  useEffect(() => { sharedStateRef.current = sharedState; }, [sharedState]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { knownFriendsRef.current = knownFriends; }, [knownFriends]);
  useEffect(() => { identityRef.current = identity; }, [identity]);
  useEffect(() => { miceCountRef.current = miceCount; }, [miceCount]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { roleRef.current = multiplayerRole; }, [multiplayerRole]);
  useEffect(() => { guestPermissionsRef.current = guestPermissions; }, [guestPermissions]);
  useEffect(() => { activeSaveSlotIdRef.current = activeSaveSlotId; }, [activeSaveSlotId]);

  useEffect(() => () => clearSignalingPoll(), [clearSignalingPoll]);

  useEffect(() => {
    const handleInviteHash = () => {
      const code = readInviteCodeFromHash();
      if (!code) return;
      setPendingInviteCode(code);
      setPendingInvite(null);
      setPendingInviteError("");
      setPendingInviteStatus("Fetching invite link...");
      setMultiplayerOpen(true);
      setActiveTab("join");
      setStatusDetail(`Invite link ${code} detected. Fetching host offer.`);

      getSignalingInvite(code)
        .then((invite) => {
          setPendingInvite(invite);
          setPendingInviteStatus(`Ready to join ${invite.hostName || "Host"}.`);
          setStatusDetail(`Invite from ${invite.hostName || "Host"} is ready.`);
        })
        .catch((error) => {
          setPendingInviteError(error.message);
          setPendingInviteStatus("Invite link could not be loaded.");
          setStatusDetail(error.message);
        });
    };

    handleInviteHash();
    window.addEventListener("hashchange", handleInviteHash);
    return () => window.removeEventListener("hashchange", handleInviteHash);
  }, []);

  useEffect(() => {
    if (connectionStatus === CONNECTION_STATES.CONNECTED) clearSignalingPoll();
  }, [clearSignalingPoll, connectionStatus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => saveSoloState(soloState), 500);
    return () => window.clearTimeout(timeout);
  }, [soloState]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveMiceCounter(miceCount);
  }, [miceCount]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const snapshot = createSlotSnapshot({
        state: soloState,
        miceCount,
        settings,
        identity,
        knownFriends,
      });
      saveActiveSlotSnapshot(activeSaveSlotId, snapshot, { preserveExistingCookie: true });
      setSlotStore(loadSaveSlots());
    }, SLOT_AUTOSAVE_MS);
    return () => window.clearTimeout(timeout);
  }, [activeSaveSlotId, identity, knownFriends, miceCount, settings, soloState]);

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
    const interval = window.setInterval(() => {
      persistCookieClickerSave(cookieIframeRef.current);
      const currentStore = loadSaveSlots();
      const activeSlot = currentStore.slots.find((slot) => slot.id === activeSaveSlotIdRef.current);
      if (!activeSlot?.hasCookieClickerSave) return;
      const cookieSave = exportCookieClickerSave(cookieIframeRef.current);
      if (!cookieSave.ok) return;
      const snapshot = createSlotSnapshot({
        state: soloStateRef.current,
        miceCount: miceCountRef.current,
        settings: settingsRef.current,
        identity: identityRef.current,
        knownFriends: knownFriendsRef.current,
        cookieClickerSave: cookieSave,
      });
      saveActiveSlotSnapshot(activeSaveSlotIdRef.current, snapshot, { preserveExistingCookie: false });
      setSlotStore(loadSaveSlots());
    }, 5000);
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      publishCookieSnapshot();
    }, COOKIE_SNAPSHOT_SYNC_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mode === "shared" && multiplayerRole === "guest" && !guestCookieSoloBackedUpRef.current) {
      backupCookieClickerSoloSave(cookieIframeRef.current);
      guestCookieSoloBackedUpRef.current = true;
    }
    if (mode === "shared" && multiplayerRole === "guest" && pendingGuestCookieSnapshotRef.current) {
      applyGuestCookieSnapshot(pendingGuestCookieSnapshotRef.current);
    }
    if ((mode !== "shared" || multiplayerRole !== "guest") && guestCookieSoloBackedUpRef.current) {
      restoreCookieClickerSoloBackup(cookieIframeRef.current);
      setCookieStats(readCookieClickerStats(cookieIframeRef.current));
      guestCookieSoloBackedUpRef.current = false;
      setLastSharedCookieSnapshot(null);
    }
  }, [applyGuestCookieSnapshot, mode, multiplayerRole]);

  const renderedState = mode === "shared" ? sharedState : soloState;
  const activeClicker = openClickerId ? CLICKER_MENU_BY_ID[openClickerId] : null;
  const activeSaveSlot = slotStore.slots.find((slot) => slot.id === activeSaveSlotId) ?? slotStore.slots[0];
  const canUseShared = multiplayerRole === "host" || connectionStatus === CONNECTION_STATES.CONNECTED;
  const modeLabel = mode === "shared" ? `Shared ${multiplayerRole === "host" ? "Host" : "Guest"}` : "Solo Local";
  const cookieReadOnly = mode === "shared" && multiplayerRole === "guest";
  const multiplayerButtonState = getMultiplayerButtonState(connectionStatus);
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

  const applySignalingAnswer = async (answerPayload) => {
    if (!answerPayload) return;
    const responseCode = encodeResponseCode(answerPayload);
    setHostResponseCode(responseCode);
    setLinkInvite((previous) => ({ ...previous, status: "Guest answer received. Connecting WebRTC.", error: "" }));
    clearSignalingPoll();
    await hostServiceRef.current?.connectResponse(responseCode);
    setStatusDetail("Invite answer received. Waiting for WebRTC to open and verify.");
  };

  const pollSignalingAnswer = async (code) => {
    if (!code || activeSignalingCodeRef.current !== code) return;
    if (activeSignalingExpiresAtRef.current && Date.parse(activeSignalingExpiresAtRef.current) <= Date.now()) {
      clearSignalingPoll();
      setLinkInvite((previous) => ({ ...previous, status: "Invite link expired.", error: "Create a fresh invite link." }));
      setStatusDetail("Invite link expired before a guest answered.");
      return;
    }

    try {
      const result = await getSignalingAnswer(code);
      if (result.answer) {
        await applySignalingAnswer(result.answer);
        return;
      }
      setLinkInvite((previous) => ({ ...previous, status: "Waiting for guest answer...", error: "" }));
    } catch (error) {
      clearSignalingPoll();
      setLinkInvite((previous) => ({ ...previous, status: "Invite polling stopped.", error: error.message }));
      setStatusDetail(error.message);
    }
  };

  const startSignalingAnswerPolling = (code, expiresAt) => {
    clearSignalingPoll();
    activeSignalingCodeRef.current = code;
    activeSignalingExpiresAtRef.current = expiresAt || "";
    signalingPollRef.current = window.setInterval(() => {
      pollSignalingAnswer(code);
    }, SIGNALING_POLL_MS);
    pollSignalingAnswer(code);
  };

  const cancelActiveSignalingInvite = async () => {
    const code = activeSignalingCodeRef.current || linkInvite.code;
    clearSignalingPoll();
    if (code) {
      try {
        await cancelSignalingInvite(code);
      } catch (error) {
        setLinkInvite((previous) => ({ ...previous, error: error.message }));
      }
    }
    setLinkInvite({ code: "", inviteUrl: "", expiresAt: "", status: "Invite link canceled.", error: "" });
    setStatusDetail("Invite link canceled. Manual pairing remains available.");
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

  async function publishCookieSnapshot(force = false) {
    if (!hostServiceRef.current || roleRef.current !== "host" || modeRef.current !== "shared") return;
    const snapshot = createCookieClickerSnapshot(cookieIframeRef.current);
    if (!snapshot.ok || !snapshot.saveData) return;
    if (!force && snapshot.saveData === lastCookieSnapshotSaveRef.current) return;
    lastCookieSnapshotSaveRef.current = snapshot.saveData;
    const payload = createCookieClickerSnapshotMessage(snapshot);
    const sends = [];
    hostServiceRef.current.peers?.forEach((peer) => {
      if (peer.verified && peer.permissions?.canViewSharedCookieClicker) sends.push(hostServiceRef.current.sendToPeer(peer, payload));
    });
    await Promise.allSettled(sends);
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
      publishCookieSnapshot(true);
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
    if (message.type === MESSAGE_TYPES.PING && message.hostPeerId) {
      const friends = rememberFriend({ displayName: message.displayName || "Host", peerId: message.hostPeerId, roleUsed: "host" });
      setKnownFriends(friends);
      return;
    }

    if (message.type === MESSAGE_TYPES.STATE) {
      if (isStaleRevision(message.revision, sharedStateRef.current.revision)) return;
      const next = sanitizeState(message.state);
      setSharedState(next);
      if (!isClickerUnlocked(next, guestSelectedClickerId)) setGuestSelectedClickerId(next.selectedClickerId);
      return;
    }

    if (message.type === MESSAGE_TYPES.COOKIE_SAVE_SNAPSHOT) {
      if (!guestPermissionsRef.current.canViewSharedCookieClicker) return;
      const revision = Number(message.revision ?? 0);
      if (revision <= guestCookieSnapshotRevisionRef.current) return;
      guestCookieSnapshotRevisionRef.current = revision;
      pendingGuestCookieSnapshotRef.current = message.snapshot;
      if (modeRef.current === "shared" && roleRef.current === "guest") {
        applyGuestCookieSnapshot(message.snapshot);
      }
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
    const hostIdentity = { ...identityRef.current, displayName };
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
    const guestIdentity = { ...identityRef.current, displayName };
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

  const handleCreateInviteLink = async () => {
    setBusy(true);
    setActiveTab("host");
    setLinkInvite((previous) => ({ ...previous, status: "Creating invite link...", error: "" }));
    try {
      const service = hostServiceRef.current ?? createHostService(hostDisplayName);
      setMultiplayerRole("host");
      const manualInvite = await service.createInvite(hostDisplayName);
      setHostInviteCode(manualInvite);
      setSharedState(soloStateRef.current);

      const offerPayload = decodeInviteCode(manualInvite);
      try {
        const created = await createSignalingInvite({
          offer: offerPayload,
          hostPeerId: offerPayload.hostPeerId,
          hostName: offerPayload.hostDisplayName || hostDisplayName,
          createdAt: offerPayload.createdAt,
        });
        setLinkInvite({
          code: created.code,
          inviteUrl: created.inviteUrl,
          expiresAt: created.expiresAt,
          status: "Waiting for guest answer...",
          error: "",
        });
        setStatusDetail(`Invite link created from active slot "${activeSaveSlot?.name ?? "Main Save"}". Share it with a guest.`);
        startSignalingAnswerPolling(created.code, created.expiresAt);
        return { ok: true, inviteUrl: created.inviteUrl, message: "Invite link created and ready to share." };
      } catch (error) {
        setLinkInvite({ code: "", inviteUrl: "", expiresAt: "", status: "Invite link failed.", error: error.message });
        setStatusDetail(`Invite link failed: ${error.message}. Manual pairing remains available.`);
        return { ok: false, message: `Invite link failed: ${error.message}. Manual pairing remains available.` };
      }
    } catch (error) {
      setConnectionStatus(CONNECTION_STATES.FAILED);
      setLinkInvite((previous) => ({ ...previous, status: "Invite link failed.", error: error.message }));
      setStatusDetail(error.message);
      return { ok: false, message: error.message };
    } finally {
      setBusy(false);
    }
  };

  const handleStartHost = async () => {
    setBusy(true);
    try {
      clearSignalingPoll();
      setLinkInvite((previous) => ({ ...previous, status: "Manual invite generated.", error: "" }));
      const service = hostServiceRef.current ?? createHostService(hostDisplayName);
      setMultiplayerRole("host");
      setActiveTab("host");
      const invite = await service.createInvite(hostDisplayName);
      setHostInviteCode(invite);
      setSharedState(soloStateRef.current);
      setStatusDetail(`Invite code generated from active slot "${activeSaveSlot?.name ?? "Main Save"}". Send it to a guest manually.`);
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

  const handleJoinInviteLink = async () => {
    const code = pendingInviteCode.trim();
    if (!code) {
      setPendingInviteError("No invite code was provided.");
      return { ok: false, message: "No invite code was provided." };
    }

    setBusy(true);
    setActiveTab("join");
    setPendingInviteStatus("Joining invite link...");
    setPendingInviteError("");
    try {
      const invite = pendingInvite?.code === code ? pendingInvite : await getSignalingInvite(code);
      setPendingInvite(invite);
      const manualInvite = encodeInviteCode(invite.offer);
      setJoinInviteCode(manualInvite);
      const service = createGuestService(joinDisplayName);
      const response = await service.generateResponse(manualInvite, joinDisplayName);
      const answerPayload = decodeResponseCode(response);
      setJoinResponseCode(response);
      await submitSignalingAnswer(code, {
        answer: answerPayload,
        guestPeerId: answerPayload.guestPeerId,
        guestName: answerPayload.guestDisplayName || joinDisplayName,
      });
      setMultiplayerRole("guest");
      setPendingInviteStatus("Answer sent. Waiting for host to connect.");
      setStatusDetail("Answer sent through invite link. Keep this page open while the host connects.");
      return { ok: true, message: "Answer sent through invite link." };
    } catch (error) {
      setConnectionStatus(CONNECTION_STATES.FAILED);
      setPendingInviteError(error.message);
      setPendingInviteStatus("Invite join failed.");
      setStatusDetail(error.message);
      return { ok: false, message: error.message };
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    const inviteToCancel = activeSignalingCodeRef.current || linkInvite.code;
    if (inviteToCancel) cancelSignalingInvite(inviteToCancel).catch(() => {});
    clearSignalingPoll();
    hostServiceRef.current?.disconnect();
    guestServiceRef.current?.disconnect();
    hostServiceRef.current = null;
    guestServiceRef.current = null;
    setMode("solo");
    setMultiplayerRole("none");
    setPlayers([]);
    setChatMessages([]);
    setGuestPermissions(DEFAULT_PERMISSIONS);
    setLinkInvite({ code: "", inviteUrl: "", expiresAt: "", status: "Disconnected.", error: "" });
    setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
    setStatusDetail("Disconnected. Solo save remains untouched.");
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === "shared" && !canUseShared) return;
    if (nextMode === "shared") {
      setSoloState((previous) => resetEvents(previous));
      if (multiplayerRole === "host") setSharedState(soloStateRef.current);
    }
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

  const makeSlotSnapshot = ({ includeCookieClickerSave = false } = {}) => {
    let cookieClickerSave = null;
    if (includeCookieClickerSave) {
      const cookieResult = exportCookieClickerSave(cookieIframeRef.current);
      if (!cookieResult.ok) return { ok: false, message: cookieResult.message };
      cookieClickerSave = cookieResult;
    }
    return {
      ok: true,
      snapshot: createSlotSnapshot({
        state: soloStateRef.current,
        miceCount: miceCountRef.current,
        settings: settingsRef.current,
        identity: identityRef.current,
        knownFriends: knownFriendsRef.current,
        cookieClickerSave,
      }),
    };
  };

  const applySlotSnapshot = (snapshot, { restoreCookieClicker = true, clearCookieIfMissing = true } = {}) => {
    if (!snapshot) return;
    if (snapshot.state) setSoloState(sanitizeState(snapshot.state));
    if (snapshot.localCounters?.mice !== undefined) setMiceCount(Math.max(0, Math.floor(Number(snapshot.localCounters.mice) || 0)));
    if (snapshot.settings && typeof snapshot.settings === "object") setSettings(snapshot.settings);
    if (snapshot.multiplayer?.peerIdentity?.peerId) setIdentity(snapshot.multiplayer.peerIdentity);
    if (Array.isArray(snapshot.multiplayer?.knownFriends) && snapshot.multiplayer.knownFriends.length) {
      setKnownFriends(snapshot.multiplayer.knownFriends);
      saveKnownFriends(snapshot.multiplayer.knownFriends);
    }

    const cookiePayload = snapshot.embedded?.cookieClicker;
    if (restoreCookieClicker && cookiePayload?.included && cookiePayload.saveData) {
      restoreCookieClickerSave(cookiePayload.saveData, cookieIframeRef.current);
      setCookieStats(readCookieClickerStats(cookieIframeRef.current));
    } else if (restoreCookieClicker && clearCookieIfMissing) {
      clearCookieClickerData(cookieIframeRef.current, { clearLanguage: false });
      setCookieStats(readCookieClickerStats(cookieIframeRef.current));
    }
  };

  const handleCreateSaveSlot = ({ name, includeCookieClickerSave = false }) => {
    const result = makeSlotSnapshot({ includeCookieClickerSave });
    if (!result.ok) return result;
    saveActiveSlotSnapshot(activeSaveSlotIdRef.current, result.snapshot, { preserveExistingCookie: true });
    const created = createSaveSlot(name, result.snapshot);
    setSlotStore(created.store);
    setActiveSaveSlotId(created.slotId);
    return { ok: true, slotId: created.slotId, message: `Created and switched to save slot "${name || "New Save Slot"}".` };
  };

  const handleRenameSaveSlot = ({ slotId, name }) => {
    const result = renameSaveSlot(slotId, name);
    setSlotStore(result.store);
    return result;
  };

  const handleDeleteSaveSlot = ({ slotId }) => {
    const result = deleteSaveSlot(slotId);
    setSlotStore(result.store);
    if (result.ok && result.activeSlotId) {
      setActiveSaveSlotId(result.activeSlotId);
      applySlotSnapshot(result.snapshot, { restoreCookieClicker: true, clearCookieIfMissing: true });
    }
    return result;
  };

  const handleSwitchSaveSlot = ({ slotId, includeCookieClickerSave = false }) => {
    if (slotId === activeSaveSlotIdRef.current) return { ok: true, message: "That save slot is already active." };
    const current = makeSlotSnapshot({ includeCookieClickerSave });
    if (!current.ok) return current;
    saveActiveSlotSnapshot(activeSaveSlotIdRef.current, current.snapshot, { preserveExistingCookie: !includeCookieClickerSave });
    const result = setActiveSaveSlot(slotId);
    if (!result.ok) return result;
    setSlotStore(result.store);
    setActiveSaveSlotId(slotId);
    applySlotSnapshot(result.snapshot, { restoreCookieClicker: true, clearCookieIfMissing: true });
    const slot = result.store.slots.find((item) => item.id === slotId);
    return { ok: true, message: `Switched to "${slot?.name ?? "save slot"}".` };
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
      text: exportSave(soloStateRef.current, identityRef.current, knownFriendsRef.current, {
        miceCount: miceCountRef.current,
        cookieClickerSave,
        activeSlot: activeSaveSlot,
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
      window.setTimeout(() => {
        const snapshot = createSlotSnapshot({
          state: result.state,
          miceCount: result.miceCount ?? miceCountRef.current,
          settings: settingsRef.current,
          identity: result.peerIdentity ?? identityRef.current,
          knownFriends: result.knownFriends ?? knownFriendsRef.current,
          cookieClickerSave: restoreCookieClicker && result.cookieClicker ? result.cookieClicker : null,
        });
        saveActiveSlotSnapshot(activeSaveSlotIdRef.current, snapshot, { preserveExistingCookie: !restoreCookieClicker });
        setSlotStore(loadSaveSlots());
      }, 0);
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
    const freshSlots = loadSaveSlots();
    setSoloState(freshSolo);
    setSharedState(freshShared);
    setSettings({});
    setSlotStore(freshSlots);
    setActiveSaveSlotId(freshSlots.activeSlotId);
    setMiceCount(0);
    setKnownFriends([]);
    setIdentity(getOrCreatePeerIdentity("Local Player"));
    setMode("solo");
    setMultiplayerRole("none");
    setPlayers([]);
    setChatMessages([]);
    setGuestPermissions(DEFAULT_PERMISSIONS);
    setConnectionStatus(CONNECTION_STATES.IDLE);
    setStatusDetail("Everything was reset. Native progress, mice, Cookie Clicker, settings, identity, friends, and save slots were cleared.");
    setCookieStats(readCookieClickerStats(cookieIframeRef.current));
    return { ok: true, message: cookieReset.message };
  };

  const createFriendInviteLink = async (friend, updates = {}) => {
    const friends = updateKnownFriend(friend.peerId, updates);
    setKnownFriends(friends);
    setSettingsOpen(false);
    setMultiplayerOpen(true);
    setActiveTab("host");
    const result = await handleCreateInviteLink();
    if (!result.ok) return result;
    try {
      await copyToClipboard(`Join my Clicker multiplayer session: ${result.inviteUrl}`);
      return { ok: true, message: `Created and copied a fresh invite link for ${friend.displayName}.` };
    } catch {
      return { ok: true, message: `Created an invite link for ${friend.displayName}. Copy it from the Multiplayer window.` };
    }
  };

  const handleInviteFriend = (friend) => createFriendInviteLink(friend, { lastInviteAt: new Date().toISOString() });

  const handleReconnectFriend = (friend) => createFriendInviteLink(friend, { lastReconnectAt: new Date().toISOString() });

  const handleRequestMultiplayer = (friend) => createFriendInviteLink(friend, { lastRequestedAt: new Date().toISOString() });

  const handleForgetFriend = (peerId) => {
    const friends = forgetKnownFriend(peerId);
    setKnownFriends(friends);
    return { ok: true, message: "Known friend removed from this browser." };
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
    activeSaveSlotName: activeSaveSlot?.name ?? "Main Save",
    linkInvite,
    onDisplayNameChange: setHostDisplayName,
    onCreateInviteLink: handleCreateInviteLink,
    onCancelInviteLink: cancelActiveSignalingInvite,
    onStart: handleStartHost,
    onResponseCodeChange: setHostResponseCode,
    onConnectResponse: handleConnectHostResponse,
    onCopyInvite: () => copyToClipboard(hostInviteCode).then(() => setStatusDetail("Invite code copied.")),
    onCopyInviteLink: () => copyToClipboard(linkInvite.inviteUrl).then(() => setStatusDetail("Invite link copied.")),
    busy,
  };

  const joinProps = {
    displayName: joinDisplayName,
    inviteCode: joinInviteCode,
    responseCode: joinResponseCode,
    linkInviteCode: pendingInviteCode,
    linkInviteHostName: pendingInvite?.hostName || "",
    linkInviteStatus: pendingInviteStatus,
    linkInviteError: pendingInviteError,
    onDisplayNameChange: setJoinDisplayName,
    onInviteCodeChange: setJoinInviteCode,
    onLinkInviteCodeChange: setPendingInviteCode,
    onJoinInviteLink: handleJoinInviteLink,
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
          <button type="button" className={`multiplayer-button multiplayer-button--${multiplayerButtonState}`} onClick={() => setMultiplayerOpen(true)}>
            Multiplayer
            <span>{connectionStatus}</span>
          </button>
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
        onEventClick={handleEventClick}
      />

      {cookieClickerInitialized && (
        <EmbeddedClickerModal
          clicker={COOKIE_CLICKER}
          open={cookieClickerOpen}
          fullscreen={cookieClickerFullscreen}
          readOnly={cookieReadOnly || guestPermissions.canViewSharedCookieClicker === false}
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

      {settingsOpen && (
        <SettingsModal
          appVersion={APP_VERSION}
          identity={identity}
          knownFriends={knownFriends}
          saveSlots={slotStore.slots}
          activeSaveSlotId={activeSaveSlotId}
          lastSharedCookieSnapshot={lastSharedCookieSnapshot}
          onClose={() => setSettingsOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
          onResetEverything={handleResetEverything}
          onCreateSaveSlot={handleCreateSaveSlot}
          onRenameSaveSlot={handleRenameSaveSlot}
          onDeleteSaveSlot={handleDeleteSaveSlot}
          onSwitchSaveSlot={handleSwitchSaveSlot}
          onInviteFriend={handleInviteFriend}
          onReconnectFriend={handleReconnectFriend}
          onRequestMultiplayer={handleRequestMultiplayer}
          onForgetFriend={handleForgetFriend}
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
        onClose={() => {
          clearSignalingPoll();
          setMultiplayerOpen(false);
        }}
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
