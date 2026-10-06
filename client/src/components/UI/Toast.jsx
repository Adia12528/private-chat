export default function Toast({ messages }) {
  if (!messages.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className="toast">
          {m.text}
        </div>
      ))}
    </div>
  );
}
