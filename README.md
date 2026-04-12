# Sequence

Online multiplayer implementation of the board game **Sequence** — play with friends or against an AI in real time.

## Features

- **Multiplayer** — create a room and share a code; supports 2–3 teams with 1, 2, or 4 players per team
- **AI opponent** — heuristic AI with instant quick-play mode
- **Turn timer** — optional 15 / 30 / 60 second per-turn countdown
- **Live rules editing** — host can adjust team count, players per team, and timer while in the lobby
- **Sequence hints** — cards in your hand are highlighted when they can complete or extend a sequence on the board
- **Rejoin support** — disconnect and reconnect without losing your spot

## Tech Stack

| Layer | Stack |
|---|---|
| Client | Vite + React + TypeScript, Tailwind CSS, Zustand, Framer Motion |
| Server | Node.js + Express + Socket.io (TypeScript) |
| Monorepo | npm workspaces + concurrently |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/your-username/sequence-app.git
cd sequence-app
npm install
```

### Run locally

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

### Build for production

```bash
npm run build
npm run start --workspace=server   # serves client + API on port 3001
```

## Game Rules

- 10×10 board; each non-Jack card appears twice; 4 corners are FREE (wild for all players)
- On your turn: play a card from your hand → place a chip on a matching board cell → draw a card
- **Two-eyed Jack** (J♥ / J♦) — wild; place your chip on any empty cell
- **One-eyed Jack** (J♠ / J♣) — remove any opponent chip that isn't part of a locked sequence
- **Dead card** — if both board positions for a card are occupied, exchange it (costs your turn)
- **Sequence** — 5 chips in a row (horizontal, vertical, or diagonal); locked once formed
- **Win** — first team to complete 2 sequences wins

Hand sizes: 2 players → 7 cards · 3–4 → 6 · 5–6 → 5 · 7+ → 4

## Deployment (Railway)

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Set **Build Command**: `npm run build`
4. Set **Start Command**: `npm run start --workspace=server`
5. Railway injects `PORT` automatically — no additional env vars needed

## Project Structure

```
sequence-app/
├── client/                  # Vite React app
│   └── src/
│       ├── components/      # UI components (Board, Hand, Lobby, …)
│       ├── store/           # Zustand game store
│       ├── socket/          # Socket.io client helpers
│       ├── hooks/           # useSocket event subscriptions
│       ├── utils/           # Dead card detection, sequence hints
│       ├── constants/       # Board layout (10×10)
│       └── types/           # Shared TypeScript types (mirrored from server)
└── server/
    └── src/
        ├── game/            # Pure logic: deck, board, rules, sequences, AI
        ├── socket/          # Room lifecycle and event routing
        ├── constants/       # Board layout source of truth
        └── types/           # Canonical type definitions
```
