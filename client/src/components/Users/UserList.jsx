export default function UserList({ users, myParticipantId, onCall, onOpenChat, activePartnerId }) {
  const others = users.filter((u) => u.participantId !== myParticipantId);
  const nameById = new Map(users.map((u) => [u.participantId, u.displayName]));

  return (
    <div className="user-list">
      <div className="sidebar-title">Online ({others.length})</div>
      {others.length === 0 && (
        <p className="subtle small">No one else is here yet. Share your ID &amp; password with others to invite them.</p>
      )}
      <ul>
        {others.map((u) => {
          const busy = !!u.busyWith;
          const busyWithName = busy ? nameById.get(u.busyWith) : null;
          return (
            <li key={u.participantId} className={"contact-item" + (u.participantId === activePartnerId ? " active" : "")}>
              <span className={"dot" + (busy ? " busy" : " online")} />
              <span className="contact-info">
                <span className="contact-name">{u.displayName}</span>
                {busy && (
                  <span className="contact-status">{busyWithName ? `On a call with ${busyWithName}` : "On another call"}</span>
                )}
              </span>
              <span className="contact-actions">
                <button className="icon-btn small" title="Open chat" aria-label={`Jump to chat, ${u.displayName}`} onClick={() => onOpenChat(u)}>
                  💬
                </button>
                <button
                  className="icon-btn small"
                  title={busy ? "User is currently on another call" : "Voice call"}
                  aria-label={`Voice call ${u.displayName}`}
                  disabled={busy}
                  onClick={() => onCall(u, "audio")}
                >
                  📞
                </button>
                <button
                  className="icon-btn small"
                  title={busy ? "User is currently on another call" : "Video call"}
                  aria-label={`Video call ${u.displayName}`}
                  disabled={busy}
                  onClick={() => onCall(u, "video")}
                >
                  🎥
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
