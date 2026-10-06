import { useState } from "react";
import { formatTime, truncate } from "../../utils/helpers.js";

export default function MessageBubble({ message, isMine, onReply, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  function copyText() {
    navigator.clipboard?.writeText(message.text).catch(() => {});
    setMenuOpen(false);
  }

  function submitEdit(e) {
    e.preventDefault();
    if (draft.trim() && draft.trim() !== message.text) onEdit(message.id, draft.trim());
    setEditing(false);
  }

  return (
    <div className={"msg-row " + (isMine ? "me" : "them")}>
      <div className="bubble">
        {!isMine && <div className="bubble-author">{message.authorName}</div>}
        {message.replyTo && (
          <div className="reply-preview">
            <strong>{message.replyTo.authorName}</strong>
            <span>{truncate(message.replyTo.text, 60)}</span>
          </div>
        )}
        {editing ? (
          <form onSubmit={submitEdit} className="edit-form">
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <div className="msg-text">{message.deleted ? "🚫 This message was deleted" : message.text}</div>
            <div className="meta">
              {formatTime(message.ts)}
              {message.edited && !message.deleted && <span className="edited-tag"> · edited</span>}
            </div>
          </>
        )}
      </div>
      {!message.deleted && !editing && (
        <div className="bubble-actions">
          <button className="icon-btn tiny" title="Reply" aria-label="Reply to message" onClick={() => onReply(message)}>
            ↩
          </button>
          <button className="icon-btn tiny" title="More actions" aria-label="More actions" onClick={() => setMenuOpen((o) => !o)}>
            ⋯
          </button>
          {menuOpen && (
            <div className="bubble-menu">
              <button onClick={copyText}>Copy</button>
              {isMine && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                >
                  Edit
                </button>
              )}
              {isMine && (
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setMenuOpen(false);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
