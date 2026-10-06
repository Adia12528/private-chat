import { useState } from "react";
import { socket } from "../services/socket.js";

const STEPS = { CREDENTIALS: "credentials", NAME: "name" };

export default function Login({ onJoined }) {
  const [step, setStep] = useState(STEPS.CREDENTIALS);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("pc-last-name") || ""
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isNewRoom, setIsNewRoom] = useState(false);

  function handleCredentialsSubmit(e) {
    e.preventDefault();
    if (!id.trim() || !password) {
      setError("Please enter both Room ID and password.");
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
      setError("Enter a display name so others know who you are.");
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
    <div className="login-screen">
      <div className="login-glow-ambient" />

      <div className="login-card">
        <div className="login-logo-badge">
          <span className="logo-icon">🔐</span>
        </div>

        <h1 className="login-title">PrivateChat</h1>
        <p className="login-subtitle">
          Secure, peer-to-peer audio/video calls &amp; encrypted ephemeral group chat.
        </p>

        {step === STEPS.CREDENTIALS && (
          <form onSubmit={handleCredentialsSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="room-id" className="form-label">
                Room ID
              </label>
              <input
                id="room-id"
                autoFocus
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. room-alpha or any ID"
                autoComplete="username"
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="room-password" className="form-label">
                Password
              </label>
              <div className="password-input-wrap">
                <input
                  id="room-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Room secret password"
                  autoComplete="current-password"
                  className="login-input with-toggle"
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && <div className="error-alert">{error}</div>}

            <button type="submit" className="login-submit-btn" disabled={busy}>
              {busy ? (
                <span className="spinner-wrap">
                  <span className="mini-spinner" /> Checking…
                </span>
              ) : (
                "Continue →"
              )}
            </button>

            <div className="login-features-list">
              <span className="feature-pill">🛡️ P2P WebRTC Calls</span>
              <span className="feature-pill">⚡ Zero Logs</span>
              <span className="feature-pill">📱 Mobile &amp; PC</span>
            </div>
          </form>
        )}

        {step === STEPS.NAME && (
          <form onSubmit={handleNameSubmit} className="login-form">
            <div className="room-joined-pill">
              <span>Room: <strong>{id.trim()}</strong></span>
              {isNewRoom && <span className="new-tag">✨ Creating New Room</span>}
            </div>

            <div className="form-group">
              <label htmlFor="display-name" className="form-label">
                Choose your Display Name
              </label>
              <input
                id="display-name"
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your nickname"
                maxLength={40}
                className="login-input"
              />
            </div>

            {error && <div className="error-alert">{error}</div>}

            <button type="submit" className="login-submit-btn" disabled={busy}>
              {busy ? (
                <span className="spinner-wrap">
                  <span className="mini-spinner" /> Joining…
                </span>
              ) : (
                "Join Room 🚀"
              )}
            </button>

            <button
              type="button"
              className="login-back-btn"
              onClick={() => setStep(STEPS.CREDENTIALS)}
            >
              ← Back to Room ID
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
