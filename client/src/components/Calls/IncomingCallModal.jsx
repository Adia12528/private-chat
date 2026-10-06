import { PhoneIcon, VideoIcon, PhoneOffIcon } from "../UI/Icons.jsx";

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
          {isVideo ? <VideoIcon size={15} /> : <PhoneIcon size={15} />}
          <span>{isVideo ? "Incoming Video Call" : "Incoming Voice Call"}</span>
        </div>

        <h3 className="incoming-name">{call.fromName}</h3>
        <p className="incoming-sub">Incoming call from room member…</p>

        <div className="modal-actions incoming-actions">
          <button className="btn-decline" onClick={onReject} title="Decline call">
            <span className="btn-icon"><PhoneOffIcon size={18} /></span> Decline
          </button>
          <button className="btn-accept" onClick={onAccept} title="Accept call">
            <span className="btn-icon">{isVideo ? <VideoIcon size={18} /> : <PhoneIcon size={18} />}</span> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
