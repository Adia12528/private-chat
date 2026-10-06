export default function TypingIndicator({ typingUsers }) {
  const names = Array.from(typingUsers.values());

  if (names.length === 0) return <div className="typing-line" aria-hidden="true" />;

  let text;
  if (names.length === 1) text = `${names[0]} is typing…`;
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing…`;
  else text = `${names.length} people are typing…`;

  return (
    <div className="typing-line" role="status" aria-live="polite">
      <span className="typing-dots">
        <span /><span /><span />
      </span>
      {text}
    </div>
  );
}
