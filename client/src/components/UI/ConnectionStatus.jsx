const LABEL = { connected: "Connected", connecting: "Connecting…", disconnected: "Disconnected" };
const DOT = { connected: "🟢", connecting: "🟡", disconnected: "🔴" };

export default function ConnectionStatus({ status }) {
  return (
    <span className={"conn-status conn-" + status} title={LABEL[status]}>
      {DOT[status]} <span className="conn-label">{LABEL[status]}</span>
    </span>
  );
}
