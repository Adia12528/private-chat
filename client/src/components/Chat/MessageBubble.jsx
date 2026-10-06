import { useEffect, useRef, useState } from "react";
import { formatTime, truncate } from "../../utils/helpers.js";

export default function MessageBubble({ message, isMine, onReply, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen]);

  function copyText() {
    navigator.clipboard?.writeText(message.text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setMenuOpen(false);
  }

  function submitEdit(e) {
    e.preventDefault();
    if (draft.trim() && draft.trim() !== message.text) onEdit(message.id, draft.trim());
    setEditing(false);
  }

  return (
    <div className={"msg-row " + (isMine ? "me" : "them")}>
      <div className="bubble-wrapper">
        <div className="bubble">
          {!isMine && <div className="bubble-author">{message.authorName}</div>}
          {message.replyTo && (
            <div className="reply-preview">
              <span className="reply-preview-author">
                ↩ {message.replyTo.authorName}
              </span>
              <span className="reply-preview-text">
                {truncate(message.replyTo.text, 65)}
              </span>
            </div>
          )}
          {editing ? (
            <form onSubmit={submitEdit} className="edit-form">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="edit-input"
              />
              <div className="edit-actions">
                <button type="submit" className="edit-save-btn">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="edit-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className={"msg-text " + (message.deleted ? "is-deleted" : "")}>
                {message.deleted ? "🚫 This message was deleted" : message.text}
              </div>
              <div className="meta">
                <span>{formatTime(message.ts)}</span>
                {message.edited && !message.deleted && (
                  <span className="edited-tag"> · edited</span>
                )}
                {isMine && <span className="read-tick"> ✓</span>}
              </div>
            </>
          )}
        </div>

        {!message.deleted && !editing && (
          <div className="bubble-actions" ref={menuRef}>
            <button
              className="action-icon-btn"
              title="Reply"
              aria-label="Reply to message"
              onClick={() => onReply(message)}
            >
              ↩
            </button>
            <button
              className="action-icon-btn"
              title={copied ? "Copied!" : "Copy text"}
              aria-label="Copy text"
              onClick={copyText}
            >
              {copied ? "✓" : "📋"}
            </button>
            <button
              className="action-icon-btn"
              title="More options"
              aria-label="More message options"
              onClick={() => setMenuOpen((o) => !o)}
            >
              ⋯
            </button>

            {menuOpen && (
              <div className="bubble-menu">
                <button onClick={copyText}>
                  <span>📋</span> Copy message
                </button>
                <button onClick={() => { onReply(message); setMenuOpen(false); }}>
                  <span>↩</span> Reply
                </button>
                {isMine && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                    >
                      <span>✏️</span> Edit
                    </button>
                    <button
                      className="danger-item"
                      onClick={() => {
                        onDelete(message.id);
                        setMenuOpen(false);
                      }}
                    >
                      <span>🗑</span> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
