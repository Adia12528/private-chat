import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPeerConnection,
  getLocalStream,
  stopStream,
  closePeerConnection,
  fetchIceServers,
} from "../services/webrtc.js";
import {
  playRingtone,
  playDialTone,
  playCallConnected,
  playCallEnded,
  stopRingtone,
} from "../utils/sound.js";

export function useCall(socket) {
  const [incomingCall, setIncomingCall] = useState(null); // { from, fromName, mode, offer }
  const [callState, setCallState] = useState(null); // { partnerId, partnerName, mode, direction, status }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState("user");

  const pcRef = useRef(null);
  const partnerRef = useRef(null);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    fetchIceServers().catch(() => {});
  }, []);

  const cleanup = useCallback(() => {
    stopRingtone();
    hasConnectedRef.current = false;
    pendingCandidatesRef.current = [];

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

  // Flush buffered ICE candidates onto RTCPeerConnection
  const drainCandidates = useCallback(async (pc) => {
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) return;
    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const cand of queued) {
      try {
        if (cand) {
          await pc.addIceCandidate(cand);
        }
      } catch (err) {
        console.warn("[WebRTC] Error applying buffered ICE candidate:", err);
      }
    }
  }, []);

  const setupPeer = useCallback(
    (toId, iceServers = null) => {
      const handleConnected = () => {
        if (!hasConnectedRef.current) {
          hasConnectedRef.current = true;
          stopRingtone();
          playCallConnected();
          setCallState((s) => (s ? { ...s, status: "connected" } : s));
          startTimer();
        }
      };

      const pc = createPeerConnection(
        {
          onIceCandidate: (candidate) => {
            socket.emit("call:ice", { to: toId, candidate });
          },
          onTrack: (stream, track) => {
            setRemoteStream((prev) => {
              if (!prev) return stream;
              if (track && !prev.getTracks().some((t) => t.id === track.id)) {
                prev.addTrack(track);
              }
              return new MediaStream(prev.getTracks());
            });
            handleConnected();
          },
          onStateChange: (state) => {
            if (state === "connected") {
              handleConnected();
            } else if (state === "failed") {
              setError("Call connection failed. A network relay or firewall issue occurred.");
              playCallEnded();
              cleanup();
            }
          },
          onIceStateChange: (iceState) => {
            if (iceState === "connected" || iceState === "completed") {
              handleConnected();
            } else if (iceState === "failed") {
              if (!hasConnectedRef.current) {
                setError("Direct network connection could not be established.");
                playCallEnded();
                cleanup();
              }
            }
          },
        },
        iceServers
      );

      pcRef.current = pc;
      return pc;
    },
    [socket, startTimer, cleanup]
  );

  const startCall = useCallback(
    async (toId, toName, mode) => {
      setError("");
      pendingCandidatesRef.current = [];
      hasConnectedRef.current = false;

      try {
        const [stream, iceServers] = await Promise.all([
          getLocalStream(mode),
          fetchIceServers().catch(() => null),
        ]);

        localStreamRef.current = stream;
        setLocalStream(stream);
        partnerRef.current = toId;
        setCallState({
          partnerId: toId,
          partnerName: toName,
          mode,
          direction: "outgoing",
          status: "calling",
        });

        playDialTone();

        const pc = setupPeer(toId, iceServers);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mode === "video",
        });
        await pc.setLocalDescription(offer);

        socket.emit("call:invite", { to: toId, mode, offer });
      } catch (err) {
        stopRingtone();
        setError(
          err.message === "unsupported"
            ? "Calling isn't supported in this browser."
            : "Microphone or camera permission was denied."
        );
        cleanup();
      }
    },
    [setupPeer, socket, cleanup]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { from, fromName, mode, offer } = incomingCall;
    stopRingtone();
    setError("");
    hasConnectedRef.current = false;

    try {
      const [stream, iceServers] = await Promise.all([
        getLocalStream(mode),
        fetchIceServers().catch(() => null),
      ]);

      localStreamRef.current = stream;
      setLocalStream(stream);
      partnerRef.current = from;
      setCallState({
        partnerId: from,
        partnerName: fromName,
        mode,
        direction: "incoming",
        status: "connecting",
      });
      setIncomingCall(null);

      const pc = setupPeer(from, iceServers);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Flush any ICE candidates that arrived before user accepted
      await drainCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:answer", { to: from, answer });
    } catch (err) {
      setError(
        err.message === "unsupported"
          ? "Calling isn't supported in this browser."
          : "Microphone or camera permission was denied."
      );
      socket.emit("call:reject", { to: from });
      cleanup();
    }
  }, [incomingCall, setupPeer, socket, drainCandidates, cleanup]);

  const rejectCall = useCallback(() => {
    stopRingtone();
    if (incomingCall) socket.emit("call:reject", { to: incomingCall.from });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  const endCall = useCallback(() => {
    playCallEnded();
    if (partnerRef.current) socket.emit("call:end", { to: partnerRef.current });
    cleanup();
  }, [socket, cleanup]);

  const cancelOutgoing = useCallback(() => {
    playCallEnded();
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

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || callState?.mode !== "video") return;
    try {
      const nextMode = facingMode === "user" ? "environment" : "user";
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextMode },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentVideoTrack) {
        localStreamRef.current.removeTrack(currentVideoTrack);
        currentVideoTrack.stop();
      }
      localStreamRef.current.addTrack(newVideoTrack);

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      setFacingMode(nextMode);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (e) {
      console.warn("Could not switch camera:", e);
    }
  }, [facingMode, callState]);

  useEffect(() => {
    function onInvite({ from, fromName, mode, offer }) {
      if (callState || incomingCall) {
        socket.emit("call:reject", { to: from }); // already busy
        return;
      }
      playRingtone();
      setIncomingCall({ from, fromName, mode, offer });
    }

    async function onAnswer({ answer }) {
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainCandidates(pc);
          setCallState((s) => (s ? { ...s, status: "connecting" } : s));
        } catch (err) {
          console.error("[WebRTC] Error setting remote description for answer:", err);
        }
      }
    }

    async function onIce({ candidate }) {
      if (!candidate) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.warn("[WebRTC] Error adding ICE candidate:", err);
        }
      } else {
        // Buffer candidate until remoteDescription is set!
        pendingCandidatesRef.current.push(candidate);
      }
    }

    function onReject() {
      playCallEnded();
      setError("Call declined.");
      cleanup();
    }

    function onEnd() {
      playCallEnded();
      cleanup();
    }

    function onCancel() {
      stopRingtone();
      setIncomingCall(null);
    }

    function onBusy({ toName }) {
      playCallEnded();
      setError(`${toName || "User"} is currently on another call.`);
      cleanup();
    }

    function onUnavailable() {
      playCallEnded();
      setError("That user is no longer available.");
      cleanup();
    }

    function onPeerLeft({ participantId }) {
      if (partnerRef.current === participantId) {
        playCallEnded();
        cleanup();
      }
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
  }, [socket, callState, incomingCall, drainCandidates, cleanup]);

  return {
    incomingCall,
    callState,
    localStream,
    remoteStream,
    duration,
    muted,
    cameraOff,
    facingMode,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cancelOutgoing,
    toggleMute,
    toggleCamera,
    switchCamera,
  };
}
