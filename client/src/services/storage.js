const PREFIX = "privatechat";

function isAvailable() {
  try {
    const testKey = "__pc_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const AVAILABLE = isAvailable();
// In-memory fallback only if localStorage is unavailable (private
// browsing lockdown, quota exceeded, etc.) so messaging still works
// for the current session even then.
const memoryStore = new Map();

function key(roomId) {
  return `${PREFIX}:${roomId}:messages`;
}

export function loadMessages(roomId) {
  if (!roomId) return [];
  if (memoryStore.has(roomId) && memoryStore.get(roomId).length > 0) {
    return memoryStore.get(roomId);
  }
  try {
    if (AVAILABLE) {
      const raw = localStorage.getItem(key(roomId));
      const parsed = raw ? JSON.parse(raw) : [];
      memoryStore.set(roomId, parsed);
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load local chat history, starting fresh.", err);
  }
  return memoryStore.get(roomId) || [];
}

export function saveMessages(roomId, messages) {
  if (!roomId) return;
  // Always keep complete messages with intact files in memoryStore for active session
  memoryStore.set(roomId, messages);

  if (!AVAILABLE) return;

  try {
    localStorage.setItem(key(roomId), JSON.stringify(messages));
  } catch (err) {
    try {
      // If quota exceeded, save the most recent 25 messages intact instead of corrupting base64
      const recent = messages.slice(-25);
      localStorage.setItem(key(roomId), JSON.stringify(recent));
    } catch {
      // Preserved in memoryStore
    }
  }
}

export function clearMessages(roomId) {
  if (!roomId) return;
  try {
    if (AVAILABLE) localStorage.removeItem(key(roomId));
    memoryStore.delete(roomId);
  } catch (err) {
    console.error("Failed to clear local chat history.", err);
  }
}

export function searchMessages(roomId, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return loadMessages(roomId).filter((m) => !m.deleted && m.text.toLowerCase().includes(q));
}

export function exportMessages(roomId, format = "txt") {
  const messages = loadMessages(roomId);
  if (format === "json") return JSON.stringify(messages, null, 2);
  return messages
    .map((m) => {
      const time = new Date(m.ts).toLocaleString();
      const text = m.deleted ? "[message deleted]" : m.text;
      return `[${time}] ${m.authorName}: ${text}`;
    })
    .join("\n");
}

export function isStorageAvailable() {
  return AVAILABLE;
}
