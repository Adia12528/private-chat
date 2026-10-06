import { useState } from "react";
import { socket } from "../services/socket.js";

const STEPS = { CREDENTIALS: "credentials", NAME: "name" };

export default function Login({ onJoined }) {
  const [step, setStep] = useState(STEPS.CREDENTIALS);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("pc-last-name") || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isNewRoom, setIsNewRoom] = useState(false);

  function handleCredentialsSubmit(e) {
    e.preventDefault();
    if (!id.trim() || !password) {
      setError("Enter both ID and password.");
      return;
    }
    setBusy(true);
    setError("");
    if (!socket.connected) socket.connect();
    socket.emit("auth:login", { id: id.trim(), password }, (res) => {
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setIsNewRoom(!!res.isNew);
      setStep(STEPS.NAME);
    });
  }

  function handleNameSubmit(e) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Enter a display name.");
      return;
    }
    setBusy(true);
    setError("");
    socket.emit("room:join", { id: id.trim(), password, displayName: name }, (res) => {
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        setStep(STEPS.CREDENTIALS);
        return;
      }
      localStorage.setItem("pc-last-name", name);
      onJoined({
        accountId: id.trim(),
        password,
        displayName: name,
        roomId: res.roomId,
        participantId: res.participantId,
      });
    });
  }

  return (
    <div className="screen center">
      <div className="card">
        <h1>PrivateChat</h1>
        {step === STEPS.CREDENTIALS && (
          <form onSubmit={handleCredentialsSubmit}>
            <p className="subtle">Enter an existing ID &amp; password, or type a brand-new pair to create your own room</p>
            <input autoFocus value={id} onChange={(e) => setId(e.target.value)} placeholder="ID" autoComplete="username" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? "Checking…" : "Continue"}
            </button>
          </form>
        )}
        {step === STEPS.NAME && (
          <form onSubmit={handleNameSubmit}>
            {isNewRoom ? (
              <p className="subtle">
                🆕 "{id.trim()}" is a new ID — you're creating this room. Remember the password to invite others.
              </p>
            ) : (
              <p className="subtle">Choose your display name</p>
            )}
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={40}
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={busy}>
              {busy ? "Joining…" : "Join room"}
            </button>
            <button type="button" className="link-btn" onClick={() => setStep(STEPS.CREDENTIALS)}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
