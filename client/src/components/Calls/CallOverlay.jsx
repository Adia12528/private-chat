import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../../utils/helpers.js";
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  SwitchCameraIcon,
  MinimizeIcon,
  MaximizeIcon,
} from "../UI/Icons.jsx";

export default function CallOverlay({
  callState,
  localStream,
  remoteStream,
  duration,
  muted,
  cameraOff,
  facingMode,
  onMute,
  onCamera,
  onSwitchCamera,
  onEnd,
}) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const el = localRef.current;
    if (el) {
      el.srcObject = localStream || null;
      if (localStream) {
        el.play().catch(() => {});
      }
    }
  }, [localStream]);

  useEffect(() => {
    const el = remoteRef.current;
    if (el) {
      el.srcObject = remoteStream || null;
      if (remoteStream) {
        el.onloadedmetadata = () => {
          el.play().catch(() => {});
        };
        el.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  if (!callState) return null;

  const isVideo = callState.mode === "video";
  const isConnected = callState.status === "connected";

  const statusLabel =
    {
      calling: "Ringing…",
      connecting: "Connecting…",
      connected: formatDuration(duration),
      failed: "Connection failed",
    }[callState.status] || (isConnected ? formatDuration(duration) : "Connecting…");

  // Minimized Floating Pip View
  if (minimized) {
    return (
      <div className="call-minimized" onClick={() => setMinimized(false)}>
        <div className="mini-info">
          <span className={"mini-dot " + (isConnected ? "connected" : "pulsing")} />
          <span className="mini-name">{callState.partnerName}</span>
          <span className="mini-time">{statusLabel}</span>
        </div>
        <div className="mini-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={"mini-btn " + (muted ? "muted" : "")}
            onClick={onMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
          </button>
          <button className="mini-btn expand" onClick={() => setMinimized(false)} aria-label="Expand call">
            <MaximizeIcon size={16} />
          </button>
          <button className="mini-btn end" onClick={onEnd} aria-label="End call">
            <PhoneOffIcon size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-overlay">
      {/* Top Header bar with status and minimize */}
      <div className="call-header-bar">
        <div className="call-info-badge">
          <span className={"status-pill " + (isConnected ? "live" : "ringing")}>
            <span className="pulse-indicator" />
            {statusLabel}
          </span>
          <span className="call-type-tag">{isVideo ? "Video Call" : "Voice Call"}</span>
        </div>
        <button
          className="call-header-btn"
          onClick={() => setMinimized(true)}
          title="Minimize to chat"
          aria-label="Minimize call"
        >
          <MinimizeIcon size={15} /> Minimize
        </button>
      </div>

      <div className="video-wrap">
        {isVideo ? (
          <>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className={"remote-video " + (!remoteStream ? "hidden" : "")}
            />
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className={"local-video " + (cameraOff ? "cam-off" : "")}
            />
            {cameraOff && <div className="local-cam-placeholder">Camera Off</div>}
          </>
        ) : (
          <audio ref={remoteRef} autoPlay playsInline />
        )}

        {/* Audio call or waiting for remote video placeholder */}
        {(!isVideo || !remoteStream) && (
          <div className="call-avatar-stage">
            <div className={"avatar-pulse-ring " + (isConnected ? "connected" : "pulsing")}>
              <div className="avatar-circle">
                {callState.partnerName?.[0]?.toUpperCase() || "?"}
              </div>
            </div>
            <h2 className="call-partner-name">{callState.partnerName}</h2>
            <p className="call-status-text">{statusLabel}</p>
            {!isConnected && (
              <p className="call-status-subtext">Establishing secure peer-to-peer connection…</p>
            )}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="call-controls">
        <button
          className={"call-action-btn " + (muted ? "active-off" : "")}
          onClick={onMute}
          title={muted ? "Unmute microphone" : "Mute microphone"}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <span className="btn-icon">{muted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}</span>
          <span className="btn-label">{muted ? "Unmute" : "Mute"}</span>
        </button>

        {isVideo && (
          <>
            <button
              className={"call-action-btn " + (cameraOff ? "active-off" : "")}
              onClick={onCamera}
              title={cameraOff ? "Turn camera on" : "Turn camera off"}
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
            >
              <span className="btn-icon">{cameraOff ? <VideoOffIcon size={20} /> : <VideoIcon size={20} />}</span>
              <span className="btn-label">{cameraOff ? "Start Video" : "Stop Video"}</span>
            </button>

            {onSwitchCamera && (
              <button
                className="call-action-btn"
                onClick={onSwitchCamera}
                title="Switch Camera (Front/Rear)"
                aria-label="Switch Camera"
              >
                <span className="btn-icon"><SwitchCameraIcon size={20} /></span>
                <span className="btn-label">Flip Cam</span>
              </button>
            )}
          </>
        )}

        <button
          className="call-action-btn end-call"
          onClick={onEnd}
          title={callState.status === "calling" ? "Cancel call" : "End call"}
          aria-label={callState.status === "calling" ? "Cancel call" : "End call"}
        >
          <span className="btn-icon"><PhoneOffIcon size={20} /></span>
          <span className="btn-label">{callState.status === "calling" ? "Cancel" : "End"}</span>
        </button>
      </div>
    </div>
  );
}
