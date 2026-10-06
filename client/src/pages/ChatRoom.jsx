import { useEffect, useCallback, useMemo, useRef, useState } from "react";
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
import {
  PhoneIcon,
  VideoIcon,
  SearchIcon,
  DownloadIcon,
  TrashIcon,
  LogOutIcon,
  FileTextIcon,
} from "../components/UI/Icons.jsx";

export default function ChatRoom({ session, theme, setTheme, onLeave }) {
  const [myParticipantId, setMyParticipantId] = useState(session.participantId);
  const { onlineUsers, status, setOnlineUsers, requestPresence } = usePresence(
    socket,
    session.members,
    session.roomId
  );
  const {
    messages,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    setTyping,
    clearChat,
    exportChat,
    searchChat,
  } = useChatMessages(socket, session.roomId, myParticipantId, session.displayName);
  const call = useCall(socket);
  const { toasts, push } = useToasts();

  const [replyTo, setReplyTo] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [unread, setUnread] = useState(0);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);

  // Auto-rejoin on socket reconnect
  useEffect(() => {
    function handleReconnect() {
      socket.emit(
        "room:rejoin",
        { id: session.accountId, password: session.password, displayName: session.displayName },
        (res) => {
          if (res.ok) {
            session.participantId = res.participantId;
            setMyParticipantId(res.participantId);
            if (Array.isArray(res.members) && res.members.length > 0) {
              setOnlineUsers(res.members);
            } else {
              requestPresence();
            }
          }
        }
      );
    }
    socket.io.on("reconnect", handleReconnect);
    return () => socket.io.off("reconnect", handleReconnect);
  }, [session, requestPresence, setOnlineUsers]);

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

  // Click outside to close header more menu
  useEffect(() => {
    function handleClickOutside(e) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setHeaderMenuOpen(false);
      }
    }
    if (headerMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [headerMenuOpen]);

  const highlightIds = useMemo(() => new Set(searchResults.map((m) => m.id)), [searchResults]);
  const otherUsers = useMemo(
    () => onlineUsers.filter((u) => u.participantId !== myParticipantId),
    [onlineUsers, myParticipantId]
  );

  function handleCall(user, mode) {
    if (sidebarMobileOpen) setSidebarMobileOpen(false);
    call.startCall(user.participantId, user.displayName, mode);
  }

  function handleHeaderCall(mode) {
    if (otherUsers.length === 0) {
      push("No one else is in this room yet. Share the room invite!");
      return;
    }
    if (otherUsers.length === 1) {
      handleCall(otherUsers[0], mode);
    } else {
      setSidebarMobileOpen(true);
      push("Select a user from the list to call.");
    }
  }

  function handleShareInvite() {
    const text = `Join my room on PrivateChat:\nRoom ID: ${session.accountId}\nPassword: ${session.password}\nLink: ${window.location.origin}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => push("Room invite copied to clipboard!"))
        .catch(() => push(`Room: ${session.accountId} | Password: ${session.password}`));
    } else {
      push(`Room: ${session.accountId} | Password: ${session.password}`);
    }
    setHeaderMenuOpen(false);
  }

  function handleOpenChat() {
    setSidebarMobileOpen(false);
    const el = document.querySelector(".message-form textarea");
    el?.focus();
  }

  function handleExport(format) {
    setHeaderMenuOpen(false);
    const data = exportChat(format);
    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.accountId}-chat.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    push(`Chat exported as .${format}`);
  }

  function handleClear() {
    setHeaderMenuOpen(false);
    if (confirm("Clear local chat history for this room? This only affects this browser.")) {
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
      {/* Mobile Backdrop for sidebar drawer */}
      {sidebarMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (People, Room details, actions) */}
      <aside className={"sidebar " + (sidebarMobileOpen ? "mobile-open" : "")}>
        <div className="sidebar-top">
          <div className="sidebar-header">
            <div className="me-badge">
              <div className="me-avatar">
                {session.displayName?.[0]?.toUpperCase() || "U"}
                <span className="dot online-badge" />
              </div>
              <div className="me-details">
                <span className="me-name">{session.displayName}</span>
                <span className="me-role">You</span>
              </div>
            </div>

            <div className="sidebar-actions">
              <ConnectionStatus status={status} />
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <button
                className="icon-btn leave-btn"
                title="Leave room"
                aria-label="Leave room"
                onClick={handleLeave}
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          </div>

          <div className="room-card">
            <div className="room-card-info">
              <span className="room-label">ROOM</span>
              <span className="room-code">{session.accountId}</span>
            </div>
            <button
              className="room-share-btn"
              onClick={handleShareInvite}
              title="Copy room invite"
              aria-label="Copy room invite"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Share
            </button>
          </div>
        </div>

        <UserList
          users={onlineUsers}
          myParticipantId={myParticipantId}
          onCall={handleCall}
          onOpenChat={handleOpenChat}
          activePartnerId={activePartnerId}
          onShareRoom={handleShareInvite}
        />

        <div className="sidebar-footer">
          <button
            className="sidebar-link-btn"
            onClick={() => {
              setSearchOpen((o) => !o);
              if (sidebarMobileOpen) setSidebarMobileOpen(false);
            }}
          >
            <SearchIcon size={15} /> Search messages
          </button>
          <div className="sidebar-export-row">
            <button className="sidebar-link-btn" onClick={() => handleExport("txt")}>
              <DownloadIcon size={13} /> .txt
            </button>
            <button className="sidebar-link-btn" onClick={() => handleExport("json")}>
              <DownloadIcon size={13} /> .json
            </button>
          </div>
          <button className="sidebar-link-btn danger" onClick={handleClear}>
            <TrashIcon size={15} /> Clear chat history
          </button>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main className="chat-panel">
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarMobileOpen((o) => !o)}
              aria-label="Toggle user list"
              title="Room members"
            >
              <span className="menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </span>
              <span className="mobile-badge-count">{onlineUsers.length}</span>
            </button>

            <div className="chat-title-group">
              <h1 className="chat-header-title">Room: {session.accountId}</h1>
              <span className="chat-header-sub">
                {otherUsers.length === 0
                  ? "Only you in room"
                  : `${otherUsers.length} other${otherUsers.length > 1 ? "s" : ""} online`}
              </span>
            </div>
          </div>

          {searchOpen ? (
            <SearchBar
              onSearch={handleSearch}
              onClose={() => {
                setSearchOpen(false);
                setSearchResults([]);
              }}
            />
          ) : (
            <div className="chat-header-right">
              {/* Quick direct call buttons in header */}
              <button
                className="header-action-btn voice"
                onClick={() => handleHeaderCall("audio")}
                title={
                  otherUsers.length === 1
                    ? `Voice call ${otherUsers[0].displayName}`
                    : "Start Voice Call"
                }
                aria-label="Voice call"
              >
                <PhoneIcon size={18} />
              </button>
              <button
                className="header-action-btn video"
                onClick={() => handleHeaderCall("video")}
                title={
                  otherUsers.length === 1
                    ? `Video call ${otherUsers[0].displayName}`
                    : "Start Video Call"
                }
                aria-label="Video call"
              >
                <VideoIcon size={18} />
              </button>

              <button
                className="header-action-btn search"
                onClick={() => setSearchOpen(true)}
                title="Search messages"
                aria-label="Search"
              >
                <SearchIcon size={18} />
              </button>

              {/* Header more options menu */}
              <div className="header-menu-wrap" ref={headerMenuRef}>
                <button
                  className="header-action-btn more"
                  onClick={() => setHeaderMenuOpen((o) => !o)}
                  title="More room options"
                  aria-label="More options"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
                {headerMenuOpen && (
                  <div className="header-dropdown-menu">
                    <button onClick={handleShareInvite}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy Room Invite
                    </button>
                    <button onClick={() => handleExport("txt")}>
                      <FileTextIcon size={15} /> Export Chat (.txt)
                    </button>
                    <button onClick={() => handleExport("json")}>
                      <DownloadIcon size={15} /> Export Chat (.json)
                    </button>
                    <button className="danger-text" onClick={handleClear}>
                      <TrashIcon size={15} /> Clear Local Chat
                    </button>
                    <hr />
                    <button className="danger-text" onClick={handleLeave}>
                      <LogOutIcon size={15} /> Leave Room
                    </button>
                  </div>
                )}
              </div>
            </div>
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

        <MessageInput
          onSend={sendMessage}
          onTyping={setTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </main>

      <IncomingCallModal
        call={call.incomingCall}
        onAccept={call.acceptCall}
        onReject={call.rejectCall}
      />

      <CallOverlay
        callState={call.callState}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        duration={call.duration}
        muted={call.muted}
        cameraOff={call.cameraOff}
        facingMode={call.facingMode}
        onMute={call.toggleMute}
        onCamera={call.toggleCamera}
        onSwitchCamera={call.switchCamera}
        onEnd={call.callState?.status === "calling" ? call.cancelOutgoing : call.endCall}
      />

      <Toast messages={toasts} />
    </div>
  );
}
