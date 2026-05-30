import { createId } from "../../utils/format.js";
import { CONNECTION_STATES } from "../../utils/multiplayer/connectionStates.js";
import { DEFAULT_PERMISSIONS, MESSAGE_TYPES, createMessage } from "../../utils/multiplayer/messageSchemas.js";
import { encryptMessage, decryptMessage, ensureWebCrypto, generateSessionKey } from "./multiplayerCryptoService.js";
import { encodeInviteCode, decodeResponseCode } from "./multiplayerMessageService.js";
import { closePeer, createPeerConnection, createReliableDataChannel, waitForIceGatheringComplete } from "./webrtcPeerService.js";

const openState = "open";

export class MultiplayerHostService {
  constructor({ identity, onStatus, onGuestMessage, onPlayersChange, onSystemMessage }) {
    this.identity = identity;
    this.onStatus = onStatus;
    this.onGuestMessage = onGuestMessage;
    this.onPlayersChange = onPlayersChange;
    this.onSystemMessage = onSystemMessage;
    this.sessionKey = null;
    this.sessionId = null;
    this.displayName = identity.displayName;
    this.peers = new Map();
    this.status = CONNECTION_STATES.IDLE;
  }

  emitStatus(status, detail = "") {
    this.status = status;
    this.onStatus?.({ status, detail });
  }

  emitPlayers() {
    this.onPlayersChange?.(this.getPlayers());
  }

  async ensureSession(displayName) {
    const support = ensureWebCrypto();
    if (!support.ok) throw new Error(support.message);
    this.displayName = displayName || this.displayName || "Host";
    if (!this.sessionKey) this.sessionKey = await generateSessionKey();
    if (!this.sessionId) this.sessionId = createId("room");
  }

  async createInvite(displayName) {
    await this.ensureSession(displayName);
    this.emitStatus(CONNECTION_STATES.GENERATING_INVITE, "Creating encrypted WebRTC offer.");

    const slotId = createId("guest-slot");
    const peerConnection = createPeerConnection();
    const channel = createReliableDataChannel(peerConnection);
    const peer = {
      slotId,
      peerId: slotId,
      displayName: "Pending guest",
      status: CONNECTION_STATES.WAITING_FOR_RESPONSE,
      peerConnection,
      channel,
      permissions: { ...DEFAULT_PERMISSIONS },
      verified: false,
      lastSeen: null,
    };

    this.peers.set(slotId, peer);
    this.setupPeerEvents(peer);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGatheringComplete(peerConnection);

    this.emitStatus(CONNECTION_STATES.WAITING_FOR_RESPONSE, "Invite ready. Send it to the guest manually.");
    this.emitPlayers();

    return encodeInviteCode({
      offer: peerConnection.localDescription,
      hostPeerId: this.identity.peerId,
      hostDisplayName: this.displayName,
      roomId: this.sessionId,
      guestSlotId: slotId,
      sessionKey: this.sessionKey,
      createdAt: new Date().toISOString(),
    });
  }

  setupPeerEvents(peer) {
    peer.channel.addEventListener("open", () => {
      peer.status = CONNECTION_STATES.VERIFYING;
      this.emitStatus(CONNECTION_STATES.VERIFYING, "Data channel open. Verifying ping/pong.");
      this.sendToPeer(peer, createMessage(MESSAGE_TYPES.PING, { hostPeerId: this.identity.peerId, displayName: this.displayName }));
      this.emitPlayers();
    });

    peer.channel.addEventListener("close", () => {
      peer.status = peer.verified ? CONNECTION_STATES.DISCONNECTED : CONNECTION_STATES.FAILED;
      this.emitStatus(CONNECTION_STATES.DISCONNECTED, `${peer.displayName} disconnected.`);
      this.emitPlayers();
    });

    peer.channel.addEventListener("message", async (event) => {
      try {
        const message = await decryptMessage(event.data, this.sessionKey);
        peer.lastSeen = new Date().toISOString();
        if (message.type === MESSAGE_TYPES.PONG) {
          peer.verified = true;
          peer.peerId = message.peerId || peer.peerId;
          peer.displayName = message.displayName || peer.displayName;
          peer.status = CONNECTION_STATES.CONNECTED;
          this.emitStatus(CONNECTION_STATES.CONNECTED, `${peer.displayName} verified.`);
          this.emitPlayers();
        }
        this.onGuestMessage?.(peer, message);
      } catch (error) {
        this.onSystemMessage?.(`Could not decrypt guest message: ${error.message}`);
      }
    });

    peer.peerConnection.addEventListener("connectionstatechange", () => {
      const state = peer.peerConnection.connectionState;
      if (["failed", "closed", "disconnected"].includes(state)) {
        peer.status = state === "failed" ? CONNECTION_STATES.FAILED : CONNECTION_STATES.DISCONNECTED;
        this.emitStatus(peer.status, `${peer.displayName} connection is ${state}.`);
        this.emitPlayers();
      }
    });
  }

  async connectResponse(responseCode) {
    if (!this.sessionId) throw new Error("Start a multiplayer session before applying a response code.");
    const response = decodeResponseCode(responseCode);
    if (response.roomId !== this.sessionId) throw new Error("Response code belongs to a different session.");
    const peer = this.peers.get(response.guestSlotId);
    if (!peer) throw new Error("Response code does not match an active invite slot.");

    peer.peerId = response.guestPeerId || peer.peerId;
    peer.displayName = response.guestDisplayName || "Guest";
    peer.status = CONNECTION_STATES.CONNECTING;
    await peer.peerConnection.setRemoteDescription(response.answer);
    this.emitStatus(CONNECTION_STATES.CONNECTING, `Connecting ${peer.displayName}.`);
    this.emitPlayers();
    return peer;
  }

  async sendToPeer(peer, payload) {
    if (!peer?.channel || peer.channel.readyState !== openState) return false;
    const encrypted = await encryptMessage(payload, this.sessionKey);
    peer.channel.send(encrypted);
    return true;
  }

  async sendToGuest(peerId, payload) {
    const peer = this.findPeer(peerId);
    if (!peer) return false;
    return this.sendToPeer(peer, payload);
  }

  async broadcast(payload) {
    const sends = [];
    this.peers.forEach((peer) => {
      if (peer.verified && peer.channel.readyState === openState) sends.push(this.sendToPeer(peer, payload));
    });
    await Promise.allSettled(sends);
  }

  findPeer(peerId) {
    return Array.from(this.peers.values()).find((peer) => peer.peerId === peerId || peer.slotId === peerId) ?? null;
  }

  getPlayers() {
    return Array.from(this.peers.values()).map((peer) => ({
      peerId: peer.peerId,
      slotId: peer.slotId,
      displayName: peer.displayName,
      status: peer.status,
      permissions: peer.permissions,
      verified: peer.verified,
      lastSeen: peer.lastSeen,
    }));
  }

  async updatePermissions(peerId, permissions) {
    const peer = this.findPeer(peerId);
    if (!peer) return;
    peer.permissions = { ...peer.permissions, ...permissions };
    this.emitPlayers();
    await this.sendToPeer(peer, createMessage(MESSAGE_TYPES.PERMISSION_UPDATE, { permissions: peer.permissions }));
  }

  async kickGuest(peerId) {
    const peer = this.findPeer(peerId);
    if (!peer) return;
    await this.sendToPeer(peer, createMessage(MESSAGE_TYPES.KICKED, { message: "You were removed from the session by the host." }));
    closePeer(peer.peerConnection);
    peer.status = CONNECTION_STATES.DISCONNECTED;
    this.emitPlayers();
  }

  disconnect() {
    this.peers.forEach((peer) => closePeer(peer.peerConnection));
    this.peers.clear();
    this.sessionKey = null;
    this.sessionId = null;
    this.emitPlayers();
    this.emitStatus(CONNECTION_STATES.DISCONNECTED, "Host session closed.");
  }
}
