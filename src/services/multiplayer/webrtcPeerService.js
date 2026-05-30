export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

export const createPeerConnection = () => new RTCPeerConnection({ iceServers: ICE_SERVERS });

export const waitForIceGatheringComplete = (peerConnection, timeoutMs = 8000) =>
  new Promise((resolve) => {
    if (peerConnection.iceGatheringState === "complete") {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const checkState = () => {
      if (peerConnection.iceGatheringState === "complete") {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      peerConnection.removeEventListener("icegatheringstatechange", checkState);
    };

    peerConnection.addEventListener("icegatheringstatechange", checkState);
  });

export const createReliableDataChannel = (peerConnection, label = "clicker-data") =>
  peerConnection.createDataChannel(label, { ordered: true });

export const closePeer = (peerConnection) => {
  try {
    peerConnection?.getSenders?.().forEach((sender) => sender.track?.stop?.());
    peerConnection?.close?.();
  } catch {
    // Closing is best-effort; stale browser connections should not break UI cleanup.
  }
};
