import { useEffect, useRef, useState } from "react";
import { truncate } from "../../utils/helpers.js";

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const taRef = useRef(null);

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

  function submit() {
    if (!text.trim()) return;
    onSend(text, replyTo);
    setText("");
    onTyping(false);
    if (replyTo) onCancelReply();
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.focus();
    }
  }

  return (
    <div className="message-form-wrap">
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
            ✕
          </button>
        </div>
      )}
      <form
        className="message-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => onTyping(false)}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          maxLength={4000}
          aria-label="Message"
        />
        <button
          type="submit"
          className={"send-btn " + (text.trim() ? "has-text" : "")}
          disabled={!text.trim()}
          aria-label="Send message"
          title="Send message"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
