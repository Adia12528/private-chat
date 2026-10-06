import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageList({
  messages,
  myParticipantId,
  onReply,
  onEdit,
  onDelete,
  highlightIds,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div className="empty-chat-welcome">
          <div className="welcome-shield-icon">🛡️</div>
          <h3>Private, Real-Time Group</h3>
          <p>
            No server message logs. Audio &amp; video are peer-to-peer encrypted via WebRTC.
          </p>
          <div className="welcome-tips">
            <span>💡 Click 📞 or 🎥 to start an instant call</span>
            <span>💬 Send a greeting below to start chatting</span>
          </div>
        </div>
      ) : (
        <div className="messages-flow">
          {messages.map((m) => (
            <div
              key={m.id}
              className={highlightIds && highlightIds.has(m.id) ? "msg-highlight-wrap" : ""}
            >
              <MessageBubble
                message={m}
                isMine={m.authorId === myParticipantId}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
      <div ref={bottomRef} className="scroll-anchor" />
    </div>
  );
}
