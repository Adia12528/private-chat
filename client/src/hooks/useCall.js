import { useCallback, useEffect, useRef, useState } from "react";
import { createPeerConnection, getLocalStream, stopStream, closePeerConnection, fetchIceServers } from "../services/webrtc.js";

export function useCall(socket) {
  const [incomingCall, setIncomingCall] = useState(null); // { from, fromName, mode, offer }
  const [callState, setCallState] = useState(null); // { partnerId, partnerName, mode, direction, status }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  const pcRef = useRef(null);
  const partnerRef = useRef(null);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    fetchIceServers().catch(() => {});
  }, []);

  const cleanup = useCallback(() => {
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setIncomingCall(null);
    setMuted(false);
    setCameraOff(false);
    setDuration(0);
    partnerRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }, []);

  const setupPeer = useCallback(
    (toId, iceServers = null) => {
      const pc = createPeerConnection({
        onIceCandidate: (candidate) => socket.emit("call:ice", { to: toId, candidate }),
        onTrack: (stream) => setRemoteStream(stream),
        onStateChange: (state) => {
          if (state === "connected") {
            setCallState((s) => (s ? { ...s, status: "connected" } : s));
            startTimer();
          } else if (state === "failed") {
            setError("Call connection failed. A TURN relay server may be needed for your network.");
            cleanup();
          }
        },
      }, iceServers);
      pcRef.current = pc;
      return pc;
    },
    [socket, startTimer, cleanup]
  );

  const startCall = useCallback(
    async (toId, toName, mode) => {
      setError("");
      try {
        const [stream, iceServers] = await Promise.all([
          getLocalStream(mode),
          fetchIceServers().catch(() => null),
        ]);
        localStreamRef.current = stream;
        setLocalStream(stream);
        partnerRef.current = toId;
        setCallState({ partnerId: toId, partnerName: toName, mode, direction: "outgoing", status: "calling" });
        const pc = setupPeer(toId, iceServers);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:invite", { to: toId, mode, offer });
      } catch (err) {
        setError(err.message === "unsupported" ? "Calling isn't supported in this browser." : "Microphone/camera permission was denied.");
        cleanup();
      }
    },
    [setupPeer, socket, cleanup]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { from, fromName, mode, offer } = incomingCall;
    setError("");
    try {
      const [stream, iceServers] = await Promise.all([
        getLocalStream(mode),
        fetchIceServers().catch(() => null),
      ]);
      localStreamRef.current = stream;
      setLocalStream(stream);
      partnerRef.current = from;
      setCallState({ partnerId: from, partnerName: fromName, mode, direction: "incoming", status: "connecting" });
      setIncomingCall(null);
      const pc = setupPeer(from, iceServers);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { to: from, answer });
    } catch (err) {
      setError(err.message === "unsupported" ? "Calling isn't supported in this browser." : "Microphone/camera permission was denied.");
      socket.emit("call:reject", { to: from });
      cleanup();
    }
  }, [incomingCall, setupPeer, socket, cleanup]);

  const rejectCall = useCallback(() => {
    if (incomingCall) socket.emit("call:reject", { to: incomingCall.from });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  const endCall = useCallback(() => {
    if (partnerRef.current) socket.emit("call:end", { to: partnerRef.current });
    cleanup();
  }, [socket, cleanup]);

  const cancelOutgoing = useCallback(() => {
    if (partnerRef.current) socket.emit("call:cancel", { to: partnerRef.current });
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    setMuted((m) => {
      const next = !m;
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    setCameraOff((c) => {
      const next = !c;
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  useEffect(() => {
    function onInvite({ from, fromName, mode, offer }) {
      if (callState || incomingCall) {
        socket.emit("call:reject", { to: from }); // already busy
        return;
      }
      setIncomingCall({ from, fromName, mode, offer });
    }
    function onAnswer({ answer }) {
      if (pcRef.current) {
        pcRef.current.setRemoteDescription(answer);
        setCallState((s) => (s ? { ...s, status: "connecting" } : s));
      }
    }
    function onIce({ candidate }) {
      if (pcRef.current && candidate) {
        pcRef.current.addIceCandidate(candidate).catch(() => {});
      }
    }
    function onReject() {
      setError("Call declined.");
      cleanup();
    }
    function onEnd() {
      cleanup();
    }
    function onCancel() {
      setIncomingCall(null);
    }
    function onBusy({ toName }) {
      setError(`${toName || "They"} are currently on another call.`);
      cleanup();
    }
    function onUnavailable() {
      setError("That person is no longer available.");
      cleanup();
    }
    function onPeerLeft({ participantId }) {
      if (partnerRef.current === participantId) cleanup();
    }

    socket.on("call:invite", onInvite);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:reject", onReject);
    socket.on("call:end", onEnd);
    socket.on("call:cancel", onCancel);
    socket.on("call:busy", onBusy);
    socket.on("call:unavailable", onUnavailable);
    socket.on("call:peer-left", onPeerLeft);

    return () => {
      socket.off("call:invite", onInvite);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:reject", onReject);
      socket.off("call:end", onEnd);
      socket.off("call:cancel", onCancel);
      socket.off("call:busy", onBusy);
      socket.off("call:unavailable", onUnavailable);
      socket.off("call:peer-left", onPeerLeft);
    };
  }, [socket, callState, incomingCall, cleanup]);

  return {
    incomingCall,
    callState,
    localStream,
    remoteStream,
    duration,
    muted,
    cameraOff,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cancelOutgoing,
    toggleMute,
    toggleCamera,
  };
}
