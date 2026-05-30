import { CONNECTION_STATES } from "../../utils/multiplayer/connectionStates.js";
import { MESSAGE_TYPES, createMessage } from "../../utils/multiplayer/messageSchemas.js";
import { decryptMessage, encryptMessage, ensureWebCrypto } from "./multiplayerCryptoService.js";
import { decodeInviteCode, encodeResponseCode } from "./multiplayerMessageService.js";
import { closePeer, createPeerConnection, waitForIceGatheringComplete } from "./webrtcPeerService.js";

const openState = "open";

export class MultiplayerGuestService {
  constructor({ identity, onStatus, onMessage, onSystemMessage }) {
    this.identity = identity;
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.onSystemMessage = onSystemMessage;
    this.peerConnection = null;
    this.channel = null;
    this.sessionKey = null;
    this.host = null;
    this.permissions = null;
    this.status = CONNECTION_STATES.IDLE;
  }

  emitStatus(status, detail = "") {
    this.status = status;
    this.onStatus?.({ status, detail });
  }

  async generateResponse(inviteCode, displayName) {
    const support = ensureWebCrypto();
    if (!support.ok) throw new Error(support.message);
    const invite = decodeInviteCode(inviteCode);
    this.sessionKey = invite.sessionKey;
    this.host = {
      peerId: invite.hostPeerId,
      displayName: invite.hostDisplayName || "Host",
      roomId: invite.roomId,
      guestSlotId: invite.guestSlotId,
    };
    this.identity = { ...this.identity, displayName: displayName || this.identity.displayName || "Guest" };

    this.emitStatus(CONNECTION_STATES.CONNECTING, "Decoding invite and creating WebRTC answer.");
    this.peerConnection = createPeerConnection();
    this.peerConnection.addEventListener("datachannel", (event) => {
      this.channel = event.channel;
      this.setupChannelEvents();
    });
    this.peerConnection.addEventListener("connectionstatechange", () => {
      const state = this.peerConnection.connectionState;
      if (["failed", "closed", "disconnected"].includes(state)) {
        this.emitStatus(state === "failed" ? CONNECTION_STATES.FAILED : CONNECTION_STATES.DISCONNECTED, `Connection is ${state}.`);
      }
    });

    await this.peerConnection.setRemoteDescription(invite.offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    await waitForIceGatheringComplete(this.peerConnection);

    this.emitStatus(CONNECTION_STATES.WAITING_FOR_RESPONSE, "Response ready. Send it back to the host.");
    return encodeResponseCode({
      answer: this.peerConnection.localDescription,
      guestPeerId: this.identity.peerId,
      guestDisplayName: this.identity.displayName,
      roomId: invite.roomId,
      guestSlotId: invite.guestSlotId,
      hostPeerId: invite.hostPeerId,
      createdAt: new Date().toISOString(),
    });
  }

  setupChannelEvents() {
    this.channel.addEventListener("open", () => {
      this.emitStatus(CONNECTION_STATES.VERIFYING, "Connected to host. Waiting for verification ping.");
    });

    this.channel.addEventListener("close", () => {
      this.emitStatus(CONNECTION_STATES.DISCONNECTED, "The host data channel closed.");
    });

    this.channel.addEventListener("message", async (event) => {
      try {
        const message = await decryptMessage(event.data, this.sessionKey);
        if (message.type === MESSAGE_TYPES.PING) {
          await this.send(createMessage(MESSAGE_TYPES.PONG, { peerId: this.identity.peerId, displayName: this.identity.displayName }));
          this.emitStatus(CONNECTION_STATES.CONNECTED, "Ping/pong verified. Shared mode is available.");
        }
        if (message.type === MESSAGE_TYPES.PERMISSION_UPDATE) this.permissions = message.permissions;
        if (message.type === MESSAGE_TYPES.KICKED) {
          this.emitStatus(CONNECTION_STATES.DISCONNECTED, message.message || "You were removed from the session by the host.");
          this.onSystemMessage?.(message.message || "You were removed from the session by the host.");
        }
        this.onMessage?.(message);
      } catch (error) {
        this.onSystemMessage?.(`Could not decrypt host message: ${error.message}`);
      }
    });
  }

  async send(payload) {
    if (!this.channel || this.channel.readyState !== openState) return false;
    const encrypted = await encryptMessage(payload, this.sessionKey);
    this.channel.send(encrypted);
    return true;
  }

  disconnect() {
    closePeer(this.peerConnection);
    this.peerConnection = null;
    this.channel = null;
    this.emitStatus(CONNECTION_STATES.DISCONNECTED, "Disconnected from host.");
  }
}
