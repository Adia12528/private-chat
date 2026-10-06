export default function IncomingCallModal({ call, onAccept, onReject }) {
  if (!call) return null;
  const isVideo = call.mode === "video";

  return (
    <div className="modal incoming-modal" role="dialog" aria-modal="true">
      <div className="modal-card incoming-card">
        <div className="incoming-avatar-ring">
          <div className="incoming-avatar">
            {call.fromName?.[0]?.toUpperCase() || "?"}
          </div>
        </div>

        <div className="incoming-badge">
          <span>{isVideo ? "📹 Video Call" : "📞 Voice Call"}</span>
        </div>

        <h3 className="incoming-name">{call.fromName}</h3>
        <p className="incoming-sub">Incoming call from room member…</p>

        <div className="modal-actions incoming-actions">
          <button className="btn-decline" onClick={onReject} title="Decline call">
            <span className="btn-icon">✕</span> Decline
          </button>
          <button className="btn-accept" onClick={onAccept} title="Accept call">
            <span className="btn-icon">{isVideo ? "🎥" : "📞"}</span> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
