const STUN_SERVER = import.meta.env.VITE_STUN_SERVER || "stun:stun.l.google.com:19302";
const TURN_SERVER = import.meta.env.VITE_TURN_SERVER;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD;

function buildIceServers() {
  const servers = [{ urls: STUN_SERVER }];
  if (TURN_SERVER) {
    servers.push({ urls: TURN_SERVER, username: TURN_USERNAME, credential: TURN_PASSWORD });
  }
  return servers;
}

export function createPeerConnection(handlers = {}) {
  const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

  pc.onicecandidate = (e) => {
    if (e.candidate && handlers.onIceCandidate) handlers.onIceCandidate(e.candidate);
  };
  pc.ontrack = (e) => {
    if (handlers.onTrack) handlers.onTrack(e.streams[0]);
  };
  pc.onconnectionstatechange = () => {
    if (handlers.onStateChange) handlers.onStateChange(pc.connectionState);
  };
  return pc;
}

export async function getLocalStream(mode) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("unsupported");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video",
  });
}

export function stopStream(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

export function closePeerConnection(pc) {
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }
}
