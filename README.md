# PrivateChat

A small, private, invite-by-password communication space. One ID + password
= one private room. Give the same pair to as many trusted people as you
want — everyone who logs in with it lands in the same group chat and can
make 1-to-1 voice/video calls with anyone else in that room.

**No signup. No database. No message history on the server — ever.**

```
   ID: one
Password: badmosh
        │
        ▼
┌─────────────────┐
│  PRIVATE ROOM    │
└────────┬─────────┘
         │
 ┌───────┼───────┐
 │       │       │
Aditya  Rahul   Aman
 │       │       │
 └───────┼───────┘
     GROUP CHAT
         +
 1-to-1 WebRTC calls
```

## Overview

- **Messaging**: realtime group chat per room — send, edit, delete, reply,
  copy, search, typing indicator, online presence, unread count.
- **Calling**: 1-to-1 voice & video calls between any two people currently
  in the same room (not group video — calls stay simple and fast).
- **Auth**: a handful of hardcoded ID/password pairs (`ACCOUNTS`), each one
  mapping to its own isolated room. Not enterprise security — a shared
  secret for a small trusted group.
- **Storage**: nothing persists on the server. Each person's chat history
  lives only in **their own browser's localStorage**.

## Architecture

```
React + Vite (client)
        │  Socket.IO
        ▼
Node.js + Express + Socket.IO (server)
        │  WebRTC signaling (offer/answer/ICE)
        ▼
   Direct WebRTC peer-to-peer
   (actual audio/video never touches the server)
```

```
private-chat/
├── client/   React + Vite frontend
│   └── src/
│       ├── pages/        Login.jsx, ChatRoom.jsx
│       ├── components/   Chat/, Calls/, Users/, UI/
│       ├── services/     socket.js, webrtc.js, storage.js
│       └── hooks/        useChatMessages, useCall, usePresence, useTheme…
└── server/   Express + Socket.IO realtime server
    └── src/
        ├── config/accounts.js   ID/password → room mapping
        └── socket/index.js      presence, chat relay, WebRTC signaling
```

## Authentication model

Edit `server/.env` (copy from `server/.env.example`) and set:

```env
ACCOUNTS_JSON={"one":"badmosh","friends":"hello123"}
```

Each `id:password` pair is its own private room (`private-one`,
`private-friends`, …). Anyone with a pair can join; as many people as you
like can share one pair and will all appear in the same room. After
entering valid credentials, each person picks a **display name** (not
tied to the account) so multiple people sharing one login still show up
as distinct people in the room.

**Anyone can also create their own room.** If someone enters an ID that
doesn't exist yet (neither in `ACCOUNTS_JSON` nor already self-created by
someone else), that ID+password pair becomes a brand-new room on the
spot — first-come-first-served, no admin step needed. These self-created
rooms live **only in server memory** (never written to disk, consistent
with the no-database rule): they disappear the instant the room empties
out, and also whenever the server process restarts (a redeploy, or a free
host spinning down after being idle and waking back up). `ACCOUNTS_JSON`
rooms are unaffected by any of this and always survive restarts — use
those for rooms you want to be permanent, and let people self-create
rooms for anything more casual/throwaway.

**Security notes (read this honestly):**
- Credentials are checked server-side; passwords are never sent to other
  clients and never logged.
- This is lightweight private access control, **not** enterprise
  authentication — no password hashing, no rate-limited lockouts, no
  audit trail. Good for a small group of people you trust; not for
  anything adversarial.
- A short in-memory rate limit on chat/signaling events is in place to
  curb accidental spam/flooding, cleared on server restart.

## Storage model — important

- The server keeps **zero message history**. It only relays live events
  between currently connected sockets and holds a temporary in-memory
  list of who's online right now (cleared the instant they disconnect).
- Each browser keeps its own chat log in `localStorage`, scoped per room.
  If someone is offline when a message is sent, they simply won't get
  it — there is no store-and-forward.
- Different browsers/devices have separate histories. Clearing browser
  data clears your chat log. "Clear local chat" in the sidebar does the
  same, deliberately, and only for your own browser.
- Export your own history anytime as `.txt` or `.json` from the sidebar.

## Calling

WebRTC handles the actual audio/video, peer-to-peer — it never passes
through the server. Socket.IO is only used to exchange the initial offer/
answer/ICE candidates. Default ICE config uses Google's free public STUN
server (no signup needed). If calls fail on strict/corporate networks,
add TURN credentials to `client/.env` (`VITE_TURN_SERVER`,
`VITE_TURN_USERNAME`, `VITE_TURN_PASSWORD`) — any TURN provider works.

## Local development

```bash
# one-time setup
npm run install:all

# terminal 1
npm run dev:server     # http://localhost:3001

# terminal 2
npm run dev:client     # http://localhost:5173
```

Open `http://localhost:5173` in two different browsers (or one normal +
one incognito window), log in with the same ID/password, pick different
display names, and test chat + calling against yourself.

## Environment variables

**`server/.env`** (copy from `server/.env.example`):
| Variable | Meaning |
|---|---|
| `PORT` | Port the realtime server listens on |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS — comma-separate for more than one |
| `ACCOUNTS_JSON` | `{"id":"password", ...}` — your private rooms |

**`client/.env`** (copy from `client/.env.example`):
| Variable | Meaning |
|---|---|
| `VITE_SOCKET_URL` | URL of the deployed realtime server |
| `VITE_STUN_SERVER` | STUN server for WebRTC (default: Google's free one) |
| `VITE_TURN_SERVER` / `VITE_TURN_USERNAME` / `VITE_TURN_PASSWORD` | Optional TURN relay for tricky networks |

## Pushing to GitHub

`.gitignore` already excludes `node_modules/`, `dist/`, and every `.env`
file — only the `.env.example` templates get committed, so your real
`ACCOUNTS_JSON` and passwords never reach GitHub.

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## Deploying

### ⚠️ Vercel cannot host the Socket.IO server
Vercel's hosting is serverless and doesn't keep a persistent connection
alive, which Socket.IO needs for realtime chat/calling. Split the
deployment:

**1. Realtime server → Render (or Railway/Fly.io)**
- New → Web Service → connect your GitHub repo.
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables: `CLIENT_URL` (your Vercel URL, filled in
  after step 2), `ACCOUNTS_JSON`.
- Deploy → note the URL, e.g. `https://your-app.onrender.com`.

**2. Frontend → Vercel**
- New Project → import your repo.
- Root directory: `client`
- Framework preset: Vite (auto-detected).
- Add environment variable: `VITE_SOCKET_URL=https://your-app.onrender.com`
- Deploy → note the URL, e.g. `https://your-app.vercel.app`.

**3. Close the loop**
- Back on Render, set `CLIENT_URL=https://your-app.vercel.app` and
  redeploy the server so CORS allows your real frontend origin.

Free tiers on Render/Railway sleep after inactivity and take a few
seconds to wake on the next visit — that's normal, not a bug. Pushing to
GitHub auto-redeploys both services once connected.

## Limitations (by design)

- No server-side message history — offline recipients don't get missed
  messages; there's no sync when they come back online.
- Local chat history is per-browser/per-device, not shared across your
  own devices.
- Login is a shared secret, not real user accounts — refreshing the page
  requires logging in again (no persisted session), and there's no way
  to prove *which* of the people who share a login sent a given message
  beyond what their client honestly reports.
- Calls are 1-to-1 only — no group video.
- Free hosting tiers (Render/Railway) sleep when idle.
#   p r i v a t e - c h a t  
 