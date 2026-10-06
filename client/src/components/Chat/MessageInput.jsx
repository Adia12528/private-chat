import { useEffect, useRef, useState } from "react";
import { truncate, formatBytes } from "../../utils/helpers.js";
import { PaperclipIcon, SendIcon, XIcon, FileTextIcon, ImageIcon } from "../UI/Icons.jsx";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [fileAttachment, setFileAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const taRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 130)}px`;
    }
  }, [text]);

  function handleChange(e) {
    setText(e.target.value);
    onTyping(true);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("File too large. Maximum size is 20 MB.");
      setTimeout(() => setFileError(""), 4000);
      e.target.value = "";
      return;
    }

    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      setFileAttachment({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        data: reader.result,
        isImage: file.type.startsWith("image/"),
      });
    };
    reader.onerror = () => {
      setFileError("Failed to read file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeAttachment() {
    setFileAttachment(null);
    setFileError("");
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed && !fileAttachment) return;

    onSend(trimmed, replyTo, fileAttachment);
    setText("");
    setFileAttachment(null);
    setFileError("");
    onTyping(false);
    if (replyTo) onCancelReply();
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.focus();
    }
  }

  const canSend = text.trim().length > 0 || !!fileAttachment;

  return (
    <div className="message-form-wrap">
      {/* Reply bar */}
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-info">
            <span className="reply-indicator-bar" />
            <div className="reply-text-content">
              <strong className="reply-author">Replying to {replyTo.authorName}</strong>
              <span className="reply-snippet">{truncate(replyTo.text, 65)}</span>
            </div>
          </div>
          <button
            className="reply-close-btn"
            aria-label="Cancel reply"
            onClick={onCancelReply}
            title="Cancel reply"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* File Preview Bar */}
      {fileAttachment && (
        <div className="file-preview-bar">
          <div className="file-preview-chip">
            {fileAttachment.isImage ? (
              <img src={fileAttachment.data} alt="Preview" className="preview-thumb" />
            ) : (
              <div className="preview-file-icon">
                <FileTextIcon size={20} />
              </div>
            )}
            <div className="preview-meta">
              <span className="preview-filename">{truncate(fileAttachment.name, 35)}</span>
              <span className="preview-filesize">{formatBytes(fileAttachment.size)}</span>
            </div>
            <button
              type="button"
              className="preview-remove-btn"
              onClick={removeAttachment}
              title="Remove attachment"
              aria-label="Remove attachment"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {fileError && <div className="file-error-badge">{fileError}</div>}

      <form
        className="message-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {/* Attachment button */}
        <button
          type="button"
          className={"attach-btn " + (fileAttachment ? "has-file" : "")}
          title="Send image or file"
          aria-label="Send image or file"
          onClick={() => fileInputRef.current?.click()}
        >
          <PaperclipIcon size={19} />
        </button>

        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => onTyping(false)}
          placeholder={
            fileAttachment
              ? "Add a caption… (optional)"
              : "Type a message… (Enter to send, Shift+Enter for newline)"
          }
          maxLength={4000}
          aria-label="Message"
        />

        <button
          type="submit"
          className={"send-btn " + (canSend ? "has-text" : "")}
          disabled={!canSend}
          aria-label="Send message"
          title="Send message"
        >
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
}
