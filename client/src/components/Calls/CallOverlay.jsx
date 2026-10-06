import { useEffect, useRef } from "react";
import { formatDuration } from "../../utils/helpers.js";

export default function CallOverlay({ callState, localStream, remoteStream, duration, muted, cameraOff, onMute, onCamera, onEnd }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream || null;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  if (!callState) return null;

  const statusLabel =
    {
      calling: "Calling…",
      connecting: "Connecting…",
      connected: formatDuration(duration),
      failed: "Connection failed",
    }[callState.status] || "Connecting…";

  const isVideo = callState.mode === "video";

  return (
    <div className="call-overlay">
      <div className="video-wrap">
        {isVideo ? (
          <>
            <video ref={remoteRef} autoPlay playsInline className="remote-video" />
            <video ref={localRef} autoPlay playsInline muted className="local-video" />
          </>
        ) : (
          <audio ref={remoteRef} autoPlay />
        )}
        {(!isVideo || callState.status !== "connected") && (
          <div className="audio-call-label">
            <div className="avatar-circle">{callState.partnerName?.[0]?.toUpperCase()}</div>
            <p className="call-partner-name">{callState.partnerName}</p>
            <p className="subtle">{statusLabel}</p>
          </div>
        )}
      </div>
      <div className="call-controls">
        <button className={"icon-btn round" + (muted ? " active-off" : "")} onClick={onMute} title="Mute" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🎤"}
        </button>
        {isVideo && (
          <button
            className={"icon-btn round" + (cameraOff ? " active-off" : "")}
            onClick={onCamera}
            title="Camera"
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {cameraOff ? "📷" : "📹"}
          </button>
        )}
        <button
          className="icon-btn round end-call"
          onClick={onEnd}
          title={callState.status === "calling" ? "Cancel call" : "End call"}
          aria-label={callState.status === "calling" ? "Cancel call" : "End call"}
        >
          ⛔
        </button>
      </div>
    </div>
  );
}
