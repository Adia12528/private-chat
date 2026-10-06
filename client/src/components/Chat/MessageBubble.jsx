import { useEffect, useRef, useState } from "react";
import { formatTime, truncate, formatBytes } from "../../utils/helpers.js";
import {
  ReplyIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  XIcon,
} from "../UI/Icons.jsx";

export default function MessageBubble({ message, isMine, onReply, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text || "");
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState(false);
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
    const content = message.text || message.file?.name || "";
    navigator.clipboard?.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setMenuOpen(false);
  }

  function submitEdit(e) {
    e.preventDefault();
    if (draft.trim() && draft.trim() !== message.text) onEdit(message.id, draft.trim());
    setEditing(false);
  }

  const hasFile = !!message.file && !!message.file.data;
  const isImage = hasFile && (message.file.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(message.file.name));

  return (
    <>
      <div className={"msg-row " + (isMine ? "me" : "them")}>
        <div className="bubble-wrapper">
          <div className="bubble">
            {!isMine && <div className="bubble-author">{message.authorName}</div>}

            {/* Reply Preview */}
            {message.replyTo && (
              <div className="reply-preview">
                <span className="reply-preview-author">
                  <ReplyIcon size={12} /> {message.replyTo.authorName}
                </span>
                <span className="reply-preview-text">
                  {truncate(message.replyTo.text, 65)}
                </span>
              </div>
            )}

            {/* Editing mode */}
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
                {/* File Attachment Rendering */}
                {hasFile && !message.deleted && (
                  <div className="bubble-attachment">
                    {isImage ? (
                      <div className="bubble-image-wrap">
                        <img
                          src={message.file.data}
                          alt={message.file.name}
                          className="bubble-image"
                          loading="lazy"
                          onClick={() => setLightbox(true)}
                        />
                        <div className="image-overlay-actions">
                          <a
                            href={message.file.data}
                            download={message.file.name}
                            className="attachment-download-btn image-dl"
                            title={`Download ${message.file.name}`}
                          >
                            <DownloadIcon size={14} /> Download
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="bubble-file-card">
                        <div className="file-icon-box">
                          <FileTextIcon size={24} />
                        </div>
                        <div className="file-info-box">
                          <span className="file-title" title={message.file.name}>
                            {truncate(message.file.name, 35)}
                          </span>
                          <span className="file-size">{formatBytes(message.file.size)}</span>
                        </div>
                        <a
                          href={message.file.data}
                          download={message.file.name}
                          className="attachment-download-btn"
                          title={`Download ${message.file.name}`}
                        >
                          <DownloadIcon size={16} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Text content */}
                {message.text && (
                  <div className={"msg-text " + (message.deleted ? "is-deleted" : "")}>
                    {message.deleted ? "🚫 This message was deleted" : message.text}
                  </div>
                )}

                {/* Metadata */}
                <div className="meta">
                  <span>{formatTime(message.ts)}</span>
                  {message.edited && !message.deleted && (
                    <span className="edited-tag"> · edited</span>
                  )}
                  {isMine && <span className="read-tick"><CheckIcon size={12} /></span>}
                </div>
              </>
            )}
          </div>

          {/* Action buttons (hover) */}
          {!message.deleted && !editing && (
            <div className="bubble-actions" ref={menuRef}>
              <button
                className="action-icon-btn"
                title="Reply"
                aria-label="Reply to message"
                onClick={() => onReply(message)}
              >
                <ReplyIcon size={14} />
              </button>
              <button
                className="action-icon-btn"
                title={copied ? "Copied!" : "Copy text"}
                aria-label="Copy text"
                onClick={copyText}
              >
                {copied ? <CheckIcon size={14} /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy text
                  </button>
                  <button onClick={() => { onReply(message); setMenuOpen(false); }}>
                    <ReplyIcon size={14} /> Reply
                  </button>
                  {isMine && (
                    <>
                      {message.text && (
                        <button
                          onClick={() => {
                            setEditing(true);
                            setMenuOpen(false);
                          }}
                        >
                          <EditIcon size={14} /> Edit
                        </button>
                      )}
                      <button
                        className="danger-item"
                        onClick={() => {
                          onDelete(message.id);
                          setMenuOpen(false);
                        }}
                      >
                        <TrashIcon size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {lightbox && isImage && (
        <div className="image-lightbox-backdrop" onClick={() => setLightbox(false)}>
          <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-title">{message.file.name}</span>
              <div className="lightbox-actions">
                <a
                  href={message.file.data}
                  download={message.file.name}
                  className="lightbox-btn"
                  title="Download image"
                >
                  <DownloadIcon size={16} /> Download
                </a>
                <button
                  type="button"
                  className="lightbox-btn close"
                  onClick={() => setLightbox(false)}
                  title="Close viewer"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
            <img src={message.file.data} alt={message.file.name} className="lightbox-img" />
          </div>
        </div>
      )}
    </>
  );
}
