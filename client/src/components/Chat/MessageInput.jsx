import { useRef, useState } from "react";
import { truncate } from "../../utils/helpers.js";

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const taRef = useRef(null);

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
    taRef.current?.focus();
  }

  return (
    <div className="message-form-wrap">
      {replyTo && (
        <div className="reply-bar">
          <div>
            <strong>{replyTo.authorName}</strong>
            <span> {truncate(replyTo.text, 70)}</span>
          </div>
          <button className="icon-btn tiny" aria-label="Cancel reply" onClick={onCancelReply}>
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
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          maxLength={4000}
          aria-label="Message"
        />
        <button type="submit" aria-label="Send message">
          ➤
        </button>
      </form>
    </div>
  );
}
