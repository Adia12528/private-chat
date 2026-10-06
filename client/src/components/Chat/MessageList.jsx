import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageList({ messages, myParticipantId, onReply, onEdit, onDelete, highlightIds }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="messages">
      {messages.length === 0 && <p className="subtle center-text">No messages yet. Say hi 👋</p>}
      {messages.map((m) => (
        <div key={m.id} className={highlightIds && highlightIds.has(m.id) ? "highlighted" : ""}>
          <MessageBubble message={m} isMine={m.authorId === myParticipantId} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
