import { useEffect, useState, useCallback } from "react";

export function usePresence(socket, initialMembers = [], roomId = null) {
  const [onlineUsers, setOnlineUsers] = useState(initialMembers || []);
  const [status, setStatus] = useState(socket.connected ? "connected" : "connecting");

  // Keep state in sync if initialMembers updates from caller
  useEffect(() => {
    if (Array.isArray(initialMembers) && initialMembers.length > 0) {
      setOnlineUsers(initialMembers);
    }
  }, [initialMembers]);

  // Fetch presence on demand (for reconnections, initial mount, and manual refresh)
  const requestPresence = useCallback(() => {
    socket.emit("presence:request", { roomId }, (users) => {
      if (Array.isArray(users)) {
        setOnlineUsers(users);
      }
    });
  }, [socket, roomId]);

  useEffect(() => {
    function onPresence(users) {
      if (Array.isArray(users)) {
        setOnlineUsers(users);
      }
    }
    function onConnect() {
      setStatus("connected");
      // After (re)connect, request fresh presence list
      requestPresence();
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

    // Request presence immediately on mount
    requestPresence();

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, [socket, requestPresence]);

  return { onlineUsers, status, setOnlineUsers, requestPresence };
}
