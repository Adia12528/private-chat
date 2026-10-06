import { useCallback, useEffect, useRef, useState } from "react";
import * as storage from "../services/storage.js";
import { generateId } from "../utils/helpers.js";

export function useChatMessages(socket, roomId, myParticipantId, myDisplayName) {
  const [messages, setMessages] = useState(() => storage.loadMessages(roomId));
  const [typingUsers, setTypingUsers] = useState(new Map());

  const persist = useCallback(
    (updater) => {
      setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        storage.saveMessages(roomId, next);
        return next;
      });
    },
    [roomId]
  );

  const sendMessage = useCallback(
    (text, replyTo, file = null) => {
      const trimmed = (text || "").trim();
      if (!trimmed && !file) return;
      const msg = {
        id: generateId(),
        authorId: myParticipantId,
        authorName: myDisplayName,
        text: trimmed,
        file: file || null,
        ts: Date.now(),
        replyTo: replyTo ? { id: replyTo.id, authorName: replyTo.authorName, text: replyTo.text } : null,
      };
      socket.emit("chat:message", msg);
      persist((prev) => [...prev, msg]);
    },
    [socket, myParticipantId, myDisplayName, persist]
  );

  const editMessage = useCallback(
    (id, newText) => {
      const trimmed = newText.trim();
      if (!trimmed) return;
      socket.emit("chat:edit", { id, newText: trimmed });
      persist((prev) => prev.map((m) => (m.id === id ? { ...m, text: trimmed, edited: true } : m)));
    },
    [socket, persist]
  );

  const deleteMessage = useCallback(
    (id) => {
      socket.emit("chat:delete", { id });
      persist((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, text: "" } : m)));
    },
    [socket, persist]
  );

  const setTyping = useCallback(
    (typing) => {
      socket.emit("chat:typing", { typing });
    },
    [socket]
  );

  const clearChat = useCallback(() => {
    storage.clearMessages(roomId);
    setMessages([]);
  }, [roomId]);

  const exportChat = useCallback((format) => storage.exportMessages(roomId, format), [roomId]);
  const searchChat = useCallback((query) => storage.searchMessages(roomId, query), [roomId]);

  useEffect(() => {
    function onMessage(msg) {
      persist((prev) => [...prev, msg]);
    }
    function onEdit({ id, newText, authorId }) {
      persist((prev) =>
        prev.map((m) => (m.id === id && m.authorId === authorId ? { ...m, text: newText, edited: true } : m))
      );
    }
    function onDelete({ id, authorId }) {
      persist((prev) =>
        prev.map((m) => (m.id === id && m.authorId === authorId ? { ...m, deleted: true, text: "" } : m))
      );
    }
    function onTyping({ participantId, displayName, typing }) {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (typing) next.set(participantId, displayName);
        else next.delete(participantId);
        return next;
      });
    }

    socket.on("chat:message", onMessage);
    socket.on("chat:edit", onEdit);
    socket.on("chat:delete", onDelete);
    socket.on("chat:typing", onTyping);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:edit", onEdit);
      socket.off("chat:delete", onDelete);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, persist]);

  return { messages, typingUsers, sendMessage, editMessage, deleteMessage, setTyping, clearChat, exportChat, searchChat };
}
