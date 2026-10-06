const DEFAULT_STUN =
  "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302,stun:stun3.l.google.com:19302,stun:stun4.l.google.com:19302";
const STUN_SERVER = import.meta.env.VITE_STUN_SERVER || DEFAULT_STUN;
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
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    let baseUrl = envUrl || "http://localhost:3001";
    if (typeof window !== "undefined" && window.location.hostname) {
      const host = window.location.hostname;
      if (host !== "localhost" && host !== "127.0.0.1" && (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
        baseUrl = `${window.location.protocol}//${host}:3001`;
      }
    }
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
  const pc = new RTCPeerConnection({
    iceServers: activeServers,
    bundlePolicy: "max-bundle",
    iceCandidatePoolSize: 2,
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      if (import.meta.env.DEV && e.candidate.type) {
        console.log(`[WebRTC] ICE candidate gathered (${e.candidate.type})`);
      }
      if (handlers.onIceCandidate) handlers.onIceCandidate(e.candidate);
    }
  };

  pc.ontrack = (e) => {
    const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
    if (handlers.onTrack) handlers.onTrack(stream, e.track);
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
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: mode === "video" ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    } : false,
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
    pc.oniceconnectionstatechange = null;
    try {
      pc.close();
    } catch {}
  }
}
