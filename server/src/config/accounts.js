import dotenv from "dotenv";
dotenv.config();

const MAX_ID_LENGTH = 40;

/**
 * Two kinds of rooms exist:
 *
 * 1. STATIC_ACCOUNTS — admin-configured via the ACCOUNTS_JSON env var.
 *    These survive server restarts.
 *
 *      ACCOUNTS_JSON={"one":"badmosh","friends":"hello123"}
 *
 * 2. dynamicAccounts — anyone can also just type a brand-new ID + password
 *    on the login screen and it becomes a new room, first-come-first-served.
 *    This is kept ONLY in server memory (never written to disk), so it
 *    disappears whenever the server process restarts (redeploy, a free
 *    host going to sleep and waking back up, etc.) — and is also dropped
 *    automatically once everyone leaves that room, to avoid growing
 *    forever. That keeps the "no database" rule intact while still
 *    letting people self-serve a room without an admin pre-configuring it.
 */
const DEFAULT_ACCOUNTS = {
  one: "badmosh",
};

function loadStaticAccounts() {
  if (process.env.ACCOUNTS_JSON) {
    try {
      const parsed = JSON.parse(process.env.ACCOUNTS_JSON);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (err) {
      console.error("ACCOUNTS_JSON is not valid JSON — falling back to defaults.", err.message);
    }
  }
  return DEFAULT_ACCOUNTS;
}

const STATIC_ACCOUNTS = loadStaticAccounts();
const dynamicAccounts = new Map();

function clean(id) {
  return typeof id === "string" ? id.trim().slice(0, MAX_ID_LENGTH) : "";
}

export function accountExists(id) {
  const cleanId = clean(id);
  return Object.prototype.hasOwnProperty.call(STATIC_ACCOUNTS, cleanId) || dynamicAccounts.has(cleanId);
}

export function verifyCredentials(id, password) {
  const cleanId = clean(id);
  if (!cleanId || typeof password !== "string" || !password) return false;
  if (Object.prototype.hasOwnProperty.call(STATIC_ACCOUNTS, cleanId)) {
    return STATIC_ACCOUNTS[cleanId] === password;
  }
  if (dynamicAccounts.has(cleanId)) {
    return dynamicAccounts.get(cleanId) === password;
  }
  return false;
}

// Claims a brand-new ID + password as a room. No-op (safe) if the ID is
// already taken by a static or another dynamic account.
export function createDynamicAccount(id, password) {
  const cleanId = clean(id);
  if (!cleanId || accountExists(cleanId)) return false;
  dynamicAccounts.set(cleanId, password);
  return true;
}

// Frees up a self-created ID once its room is empty so it doesn't grow
// forever and so the name can be reclaimed. Never touches STATIC_ACCOUNTS.
export function releaseDynamicAccount(id) {
  dynamicAccounts.delete(clean(id));
}

export function isStaticAccount(id) {
  return Object.prototype.hasOwnProperty.call(STATIC_ACCOUNTS, clean(id));
}

export function roomIdFor(accountId) {
  return `private-${clean(accountId)}`;
}
