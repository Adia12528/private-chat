import { useEffect, useState } from "react";

export function usePresence(socket) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [status, setStatus] = useState(socket.connected ? "connected" : "connecting");

  useEffect(() => {
    function onPresence(users) {
      setOnlineUsers(users);
    }
    function onConnect() {
      setStatus("connected");
    }
    function onDisconnect() {
      setStatus("disconnected");
    }
    function onReconnectAttempt() {
      setStatus("connecting");
    }

    socket.on("presence:update", onPresence);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, [socket]);

  return { onlineUsers, status };
}
