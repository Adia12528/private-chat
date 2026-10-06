import { verifyCredentials, roomIdFor, accountExists, createDynamicAccount, releaseDynamicAccount } from "../config/accounts.js";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 40;
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_EVENTS = 20;

// roomId -> Map(participantId -> { displayName })
// roomId -> Map(participantId -> partnerParticipantId)  (who's in a call with whom)
// Purely in-memory, temporary, cleared whenever a room empties. This is
// presence/session state only — never a message store.
const rooms = new Map();
const busyMap = new Map();

function isBusy(roomId, participantId) {
  return !!busyMap.get(roomId)?.has(participantId);
}

function setBusyPair(roomId, a, b) {
  if (!busyMap.has(roomId)) busyMap.set(roomId, new Map());
  const m = busyMap.get(roomId);
  m.set(a, b);
  m.set(b, a);
}

// Clears the busy state for participantId (and whoever they were paired
// with). Returns the partner's id, if any, so the caller can notify them.
function clearBusy(roomId, participantId) {
  const m = busyMap.get(roomId);
  if (!m || !m.has(participantId)) return null;
  const partner = m.get(participantId);
  m.delete(participantId);
  m.delete(partner);
  if (m.size === 0) busyMap.delete(roomId);
  return partner;
}

function getRoomMembers(roomId) {
  const map = rooms.get(roomId);
  if (!map) return [];
  const busy = busyMap.get(roomId);
  return Array.from(map.entries()).map(([participantId, info]) => ({
    participantId,
    displayName: info.displayName,
    busyWith: busy?.get(participantId) || null,
  }));
}

function broadcastPresence(io, roomId) {
  io.to(roomId).emit("presence:update", getRoomMembers(roomId));
}

function safe(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      console.error("Socket handler error:", err.message);
    }
  };
}

export function registerSocketHandlers(io, socket) {
  let myRoomId = null;
  let myAccountId = null;
  let myParticipantId = null;
  let eventTimestamps = [];

  function rateLimited() {
    const now = Date.now();
    eventTimestamps = eventTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    eventTimestamps.push(now);
    return eventTimestamps.length > RATE_LIMIT_MAX_EVENTS;
  }

  function endMyActiveCall() {
    if (!myRoomId) return null;
    const partner = clearBusy(myRoomId, myParticipantId);
    if (partner) broadcastPresence(io, myRoomId);
    return partner;
  }

  socket.on(
    "auth:login",
    safe(({ id, password } = {}, cb) => {
      if (typeof cb !== "function") return;
      if (!id || !password) {
        return cb({ ok: false, error: "Enter both ID and password." });
      }
      if (!accountExists(id)) {
        // Brand-new ID — nothing to verify yet. They'll create this room
        // for real (claiming this password) once they pick a display name.
        return cb({ ok: true, isNew: true });
      }
      if (!verifyCredentials(id, password)) {
        return cb({ ok: false, error: "Invalid ID or password." });
      }
      cb({ ok: true, isNew: false });
    })
  );

  socket.on(
    "room:join",
    safe(({ id, password, displayName } = {}, cb) => {
      if (typeof cb !== "function") return;
      if (!id || !password) return cb({ ok: false, error: "Enter both ID and password." });
      const name = String(displayName || "").trim().slice(0, MAX_NAME_LENGTH);
      if (!name) return cb({ ok: false, error: "Display name is required." });
      if (myRoomId) return cb({ ok: false, error: "Already in a room." });

      const isNew = !accountExists(id);
      if (isNew) {
        createDynamicAccount(id, password);
      } else if (!verifyCredentials(id, password)) {
        return cb({ ok: false, error: "Invalid ID or password." });
      }

      const roomId = roomIdFor(id);
      myRoomId = roomId;
      myAccountId = String(id).trim().slice(0, MAX_NAME_LENGTH);
      myParticipantId = socket.id;
      socket.data.roomId = roomId;
      socket.data.displayName = name;

      socket.join(roomId);
      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      rooms.get(roomId).set(myParticipantId, { displayName: name });

      cb({ ok: true, participantId: myParticipantId, roomId, isNew });
      broadcastPresence(io, roomId);
    })
  );

  socket.on(
    "chat:message",
    safe((msg = {}) => {
      if (!myRoomId || rateLimited()) return;
      if (typeof msg.text !== "string") return;
      const text = msg.text.trim();
      if (!text || text.length > MAX_MESSAGE_LENGTH) return;
      socket.to(myRoomId).emit("chat:message", {
        id: String(msg.id || ""),
        text,
        ts: Date.now(),
        replyTo: msg.replyTo || null,
        authorId: myParticipantId,
        authorName: socket.data.displayName,
      });
    })
  );

  socket.on(
    "chat:edit",
    safe(({ id, newText } = {}) => {
      if (!myRoomId || rateLimited()) return;
      if (typeof newText !== "string") return;
      const text = newText.trim();
      if (!text || text.length > MAX_MESSAGE_LENGTH) return;
      socket.to(myRoomId).emit("chat:edit", { id, newText: text, authorId: myParticipantId });
    })
  );

  socket.on(
    "chat:delete",
    safe(({ id } = {}) => {
      if (!myRoomId) return;
      socket.to(myRoomId).emit("chat:delete", { id, authorId: myParticipantId });
    })
  );

  socket.on(
    "chat:typing",
    safe(({ typing } = {}) => {
      if (!myRoomId) return;
      socket.to(myRoomId).emit("chat:typing", {
        participantId: myParticipantId,
        displayName: socket.data.displayName,
        typing: !!typing,
      });
    })
  );

  // ---- WebRTC signaling (1-to-1 calls between two members of the room) ----
  // The room is only ever used for discovery/presence/signaling. A call's
  // actual media is peer-to-peer and only ever targeted at one specific
  // socket id — it is never broadcast to the room.
  socket.on(
    "call:invite",
    safe(({ to, mode, offer } = {}) => {
      if (!myRoomId || typeof to !== "string" || rateLimited()) return;
      const roomMembers = rooms.get(myRoomId);
      const target = roomMembers?.get(to);
      const targetSocketStillConnected = io.sockets.sockets.has(to);

      if (!target || !targetSocketStillConnected) {
        socket.emit("call:unavailable", { to });
        return;
      }
      if (isBusy(myRoomId, to)) {
        socket.emit("call:busy", { to, toName: target.displayName });
        return;
      }
      if (isBusy(myRoomId, myParticipantId)) {
        // Caller is already mid-call elsewhere (shouldn't happen if the
        // client disables calling while busy, but guard anyway).
        return;
      }

      setBusyPair(myRoomId, myParticipantId, to);
      broadcastPresence(io, myRoomId);
      io.to(to).emit("call:invite", { from: myParticipantId, fromName: socket.data.displayName, mode, offer });
    })
  );

  socket.on(
    "call:answer",
    safe(({ to, answer } = {}) => {
      if (typeof to !== "string") return;
      io.to(to).emit("call:answer", { from: myParticipantId, answer });
    })
  );

  socket.on(
    "call:ice",
    safe(({ to, candidate } = {}) => {
      if (typeof to !== "string") return;
      io.to(to).emit("call:ice", { from: myParticipantId, candidate });
    })
  );

  socket.on(
    "call:reject",
    safe(({ to } = {}) => {
      if (typeof to !== "string") return;
      endMyActiveCall();
      io.to(to).emit("call:reject", { from: myParticipantId });
    })
  );

  socket.on(
    "call:end",
    safe(({ to } = {}) => {
      if (typeof to !== "string") return;
      endMyActiveCall();
      io.to(to).emit("call:end", { from: myParticipantId });
    })
  );

  socket.on(
    "call:cancel",
    safe(({ to } = {}) => {
      if (typeof to !== "string") return;
      endMyActiveCall();
      io.to(to).emit("call:cancel", { from: myParticipantId });
    })
  );

  socket.on(
    "disconnect",
    safe(() => {
      if (!myRoomId) return;
      const partner = endMyActiveCall();
      if (partner) io.to(partner).emit("call:peer-left", { participantId: myParticipantId });

      if (rooms.has(myRoomId)) {
        rooms.get(myRoomId).delete(myParticipantId);
        if (rooms.get(myRoomId).size === 0) {
          rooms.delete(myRoomId);
          // Frees a self-created ID once its room is empty (no-op for
          // admin-configured ACCOUNTS_JSON rooms — those are never touched).
          if (myAccountId) releaseDynamicAccount(myAccountId);
        }
        broadcastPresence(io, myRoomId);
      }
    })
  );
}
