export default function IncomingCallModal({ call, onAccept, onReject }) {
  if (!call) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card">
        <p className="incoming-title">Incoming {call.mode === "video" ? "video" : "voice"} call</p>
        <p className="incoming-name">{call.fromName} is calling you</p>
        <div className="modal-actions">
          <button className="btn-accept" onClick={onAccept}>
            Accept
          </button>
          <button className="btn-reject" onClick={onReject}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
