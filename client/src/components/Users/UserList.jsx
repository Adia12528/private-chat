import { PhoneIcon, VideoIcon } from "../UI/Icons.jsx";

export default function UserList({
  users,
  myParticipantId,
  onCall,
  onOpenChat,
  activePartnerId,
  onShareRoom,
}) {
  const others = users.filter((u) => u.participantId !== myParticipantId);
  const nameById = new Map(users.map((u) => [u.participantId, u.displayName]));

  return (
    <div className="user-list">
      <div className="user-list-header">
        <span className="sidebar-section-title">In this room</span>
        <span className="user-count-badge">{others.length + 1}</span>
      </div>

      {others.length === 0 ? (
        <div className="empty-room-prompt">
          <div className="empty-room-icon">👋</div>
          <p className="empty-room-title">You are the only one here</p>
          <p className="subtle small">
            Share your room ID &amp; password with friends so they can join and call you.
          </p>
          {onShareRoom && (
            <button className="copy-invite-btn" onClick={onShareRoom}>
              📋 Copy Room Invite
            </button>
          )}
        </div>
      ) : (
        <ul className="contact-items-list">
          {others.map((u) => {
            const busy = !!u.busyWith;
            const busyWithName = busy ? nameById.get(u.busyWith) : null;
            const isTarget = u.participantId === activePartnerId;

            return (
              <li
                key={u.participantId}
                className={"contact-item" + (isTarget ? " active-call-peer" : "")}
              >
                <div className="contact-avatar-wrap">
                  <div className="contact-avatar">
                    {u.displayName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span
                    className={"contact-status-dot " + (busy ? "busy" : "online")}
                    title={busy ? "Busy on a call" : "Available"}
                  />
                </div>

                <div className="contact-info">
                  <span className="contact-name">{u.displayName}</span>
                  <span className={"contact-status-text " + (busy ? "busy" : "online")}>
                    {busy
                      ? busyWithName
                        ? `On call with ${busyWithName}`
                        : "On a call"
                      : "Available"}
                  </span>
                </div>

                <div className="contact-actions">
                  <button
                    className="action-pill-btn voice"
                    title={busy ? "User is busy" : `Voice call ${u.displayName}`}
                    aria-label={`Voice call ${u.displayName}`}
                    disabled={busy}
                    onClick={() => onCall(u, "audio")}
                  >
                    <PhoneIcon size={14} />
                  </button>
                  <button
                    className="action-pill-btn video"
                    title={busy ? "User is busy" : `Video call ${u.displayName}`}
                    aria-label={`Video call ${u.displayName}`}
                    disabled={busy}
                    onClick={() => onCall(u, "video")}
                  >
                    <VideoIcon size={14} />
                  </button>
                  {onOpenChat && (
                    <button
                      className="action-pill-btn chat mobile-only"
                      title="Jump to chat"
                      aria-label="Jump to chat"
                      onClick={() => onOpenChat(u)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
