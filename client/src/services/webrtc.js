const STUN_SERVER = import.meta.env.VITE_STUN_SERVER || "stun:stun.l.google.com:19302";
const TURN_SERVER = import.meta.env.VITE_TURN_SERVER;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD;

function parseUrls(val) {
  if (!val) return [];
  return val
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

export function buildIceServers() {
  const stunUrls = parseUrls(STUN_SERVER);
  const servers = [];

  if (stunUrls.length > 0) {
    servers.push({ urls: stunUrls });
  }

  const turnUrls = parseUrls(TURN_SERVER);
  if (turnUrls.length > 0) {
    const turnConfig = { urls: turnUrls };
    if (TURN_USERNAME) turnConfig.username = TURN_USERNAME;
    if (TURN_PASSWORD) turnConfig.credential = TURN_PASSWORD;
    servers.push(turnConfig);
  }

  return servers;
}

let cachedDynamicIceServers = null;

export async function fetchIceServers() {
  if (cachedDynamicIceServers) return cachedDynamicIceServers;

  // 1. If explicit client .env TURN credentials are set, use them directly
  if (TURN_SERVER) {
    cachedDynamicIceServers = buildIceServers();
    return cachedDynamicIceServers;
  }

  // 2. Otherwise try to fetch dynamically from server endpoint
  try {
    const baseUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
    const res = await fetch(`${baseUrl}/api/ice-servers`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedDynamicIceServers = data;
        return cachedDynamicIceServers;
      }
    }
  } catch (err) {
    console.warn("[WebRTC] Could not fetch server ICE servers:", err.message);
  }

  // 3. Fallback
  cachedDynamicIceServers = buildIceServers();
  return cachedDynamicIceServers;
}

export function createPeerConnection(handlers = {}, iceServers = null) {
  const activeServers = iceServers || cachedDynamicIceServers || buildIceServers();
  const pc = new RTCPeerConnection({ iceServers: activeServers });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      if (import.meta.env.DEV && e.candidate.type) {
        console.log(`[WebRTC] ICE candidate gathered (${e.candidate.type})`);
      }
      if (handlers.onIceCandidate) handlers.onIceCandidate(e.candidate);
    }
  };
  pc.ontrack = (e) => {
    if (handlers.onTrack) handlers.onTrack(e.streams[0]);
  };
  pc.onconnectionstatechange = () => {
    if (handlers.onStateChange) handlers.onStateChange(pc.connectionState);
  };
  pc.oniceconnectionstatechange = () => {
    if (handlers.onIceStateChange) handlers.onIceStateChange(pc.iceConnectionState);
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
