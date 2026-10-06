export default function ConnectionStatus({ status }) {
  const label = {
    connected: "Connected",
    connecting: "Connecting…",
    disconnected: "Disconnected",
  }[status] || "Connecting…";

  const dotClass = {
    connected: "online",
    connecting: "connecting",
    disconnected: "offline",
  }[status] || "connecting";

  return (
    <span className={"conn-status conn-" + status} title={label} aria-label={label}>
      <span className={"dot " + dotClass} />
      <span className="conn-label">{label}</span>
    </span>
  );
}
