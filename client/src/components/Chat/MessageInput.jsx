import { useEffect, useRef, useState } from "react";
import { truncate, formatBytes, compressImageFile } from "../../utils/helpers.js";
import { PaperclipIcon, SendIcon, XIcon, FileTextIcon, ImageIcon } from "../UI/Icons.jsx";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [fileAttachment, setFileAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [processingFile, setProcessingFile] = useState(false);
  const taRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

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

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("File too large. Maximum size is 25 MB.");
      setTimeout(() => setFileError(""), 4000);
      e.target.value = "";
      return;
    }

    setFileError("");
    setProcessingFile(true);

    try {
      const isImg = file.type.startsWith("image/");
      if (isImg) {
        // Compress & optimize image for blazing fast mobile transfer without losing sharpness
        const compressed = await compressImageFile(file, 1920, 0.85);
        if (compressed.data) {
          setFileAttachment({
            name: file.name,
            size: compressed.size,
            type: compressed.type || file.type || "image/jpeg",
            data: compressed.data,
            isImage: true,
          });
        } else {
          setFileError("Failed to process image.");
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setFileAttachment({
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            data: reader.result,
            isImage: false,
          });
          setProcessingFile(false);
        };
        reader.onerror = () => {
          setFileError("Failed to read file.");
          setProcessingFile(false);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
        return;
      }
    } catch (err) {
      console.error("File selection error:", err);
      setFileError("Error attaching file.");
    } finally {
      setProcessingFile(false);
      e.target.value = "";
    }
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
      {processingFile && (
        <div className="file-processing-badge">
          <span className="mini-spinner" /> Processing photo…
        </div>
      )}

      <form
        className="message-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <div className="input-attach-actions">
          {/* Photo / Image button (Direct gallery/camera on mobile) */}
          <button
            type="button"
            className={"attach-btn photo-btn " + (fileAttachment?.isImage ? "has-file" : "")}
            title="Send photo / image"
            aria-label="Send photo or image"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon size={20} />
          </button>

          {/* Document / File button */}
          <button
            type="button"
            className={"attach-btn doc-btn " + (fileAttachment && !fileAttachment?.isImage ? "has-file" : "")}
            title="Send file or document"
            aria-label="Send file or document"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon size={19} />
          </button>
        </div>

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
