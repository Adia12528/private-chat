import { useEffect, useMemo, useState } from "react";
import { socket } from "../services/socket.js";
import { usePresence } from "../hooks/usePresence.js";
import { useChatMessages } from "../hooks/useChatMessages.js";
import { useCall } from "../hooks/useCall.js";
import { useToasts } from "../hooks/useToasts.js";
import ThemeToggle from "../components/UI/ThemeToggle.jsx";
import ConnectionStatus from "../components/UI/ConnectionStatus.jsx";
import Toast from "../components/UI/Toast.jsx";
import UserList from "../components/Users/UserList.jsx";
import MessageList from "../components/Chat/MessageList.jsx";
import MessageInput from "../components/Chat/MessageInput.jsx";
import TypingIndicator from "../components/Chat/TypingIndicator.jsx";
import SearchBar from "../components/Chat/SearchBar.jsx";
import IncomingCallModal from "../components/Calls/IncomingCallModal.jsx";
import CallOverlay from "../components/Calls/CallOverlay.jsx";

export default function ChatRoom({ session, theme, setTheme, onLeave }) {
  const { onlineUsers, status } = usePresence(socket);
  const { messages, typingUsers, sendMessage, editMessage, deleteMessage, setTyping, clearChat, exportChat, searchChat } =
    useChatMessages(socket, session.roomId, session.participantId, session.displayName);
  const call = useCall(socket);
  const { toasts, push } = useToasts();

  const [replyTo, setReplyTo] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (call.error) push(call.error);
  }, [call.error, push]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") setUnread(0);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (document.visibilityState !== "visible" && messages.length > 0) {
      setUnread((u) => u + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) PrivateChat` : "PrivateChat";
  }, [unread]);

  const highlightIds = useMemo(() => new Set(searchResults.map((m) => m.id)), [searchResults]);

  function handleCall(user, mode) {
    call.startCall(user.participantId, user.displayName, mode);
  }

  function handleOpenChat() {
    // This app uses one shared group chat per room (not separate 1-to-1 DM
    // threads), so "open chat" jumps to and focuses the message box —
    // handy on mobile where the sidebar and chat aren't both on screen.
    const el = document.querySelector(".message-form textarea");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }

  function handleExport(format) {
    const data = exportChat(format);
    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.accountId}-chat.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    if (confirm("Clear your local chat history for this room? This only affects this browser.")) {
      clearChat();
      push("Local chat history cleared.");
    }
  }

  function handleSearch(query) {
    setSearchResults(query.trim() ? searchChat(query) : []);
  }

  function handleLeave() {
    socket.disconnect();
    onLeave();
  }

  const activePartnerId = call.callState?.partnerId || call.incomingCall?.from || null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="me">
            <span className="dot online" />
            <span>{session.displayName}</span>
          </div>
          <div className="sidebar-actions">
            <ConnectionStatus status={status} />
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <button className="icon-btn" title="Leave room" aria-label="Leave room" onClick={handleLeave}>
              ⏻
            </button>
          </div>
        </div>
        <p className="room-tag">Room: {session.accountId}</p>
        <UserList
          users={onlineUsers}
          myParticipantId={session.participantId}
          onCall={handleCall}
          onOpenChat={handleOpenChat}
          activePartnerId={activePartnerId}
        />
        <div className="sidebar-footer">
          <button className="link-btn" onClick={() => setSearchOpen((o) => !o)}>
            🔍 Search
          </button>
          <button className="link-btn" onClick={() => handleExport("txt")}>
            ⬇ Export .txt
          </button>
          <button className="link-btn" onClick={() => handleExport("json")}>
            ⬇ Export .json
          </button>
          <button className="link-btn danger" onClick={handleClear}>
            🗑 Clear local chat
          </button>
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div className="chat-header-title">Group chat</div>
          {searchOpen && (
            <SearchBar
              onSearch={handleSearch}
              onClose={() => {
                setSearchOpen(false);
                setSearchResults([]);
              }}
            />
          )}
        </header>

        <MessageList
          messages={messages}
          myParticipantId={session.participantId}
          onReply={setReplyTo}
          onEdit={editMessage}
          onDelete={deleteMessage}
          highlightIds={highlightIds}
        />
        <TypingIndicator typingUsers={typingUsers} />
        <MessageInput onSend={sendMessage} onTyping={setTyping} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </main>

      <IncomingCallModal call={call.incomingCall} onAccept={call.acceptCall} onReject={call.rejectCall} />
      <CallOverlay
        callState={call.callState}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        duration={call.duration}
        muted={call.muted}
        cameraOff={call.cameraOff}
        onMute={call.toggleMute}
        onCamera={call.toggleCamera}
        onEnd={call.callState?.status === "calling" ? call.cancelOutgoing : call.endCall}
      />
      <Toast messages={toasts} />
    </div>
  );
}
