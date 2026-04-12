# Hints Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-room `hintsEnabled` configuration option that the host sets in the Create Game menu (and can edit in the lobby), which controls whether sequence-potential hint highlighting is shown to players during the game.

**Architecture:** `hintsEnabled` is stored as a boolean on `GameState` (server-authoritative, like `turnTimer`), broadcast via `room:lobbyState` and `game:state`, and checked by the client's `selectCard` action before computing `hintCells`. The toggle appears in `Lobby.tsx` (configure panel) and `LobbyWaiting.tsx` (rules editor, host only).

**Tech Stack:** TypeScript, Vite + React, Zustand, Socket.io, Tailwind CSS, Node/Express

---

### Task 1: Add `hintsEnabled` to shared GameState type

**Files:**
- Modify: `server/src/types/game.ts:56-57`
- Modify: `client/src/types/game.ts:56-57`

- [ ] **Step 1: Add `hintsEnabled` field to GameState in server types**

In `server/src/types/game.ts`, add after line 56 (`turnDeadline: number | null`):

```typescript
export interface GameState {
  roomCode: string
  board: Cell[][]
  deck: Card[]
  discards: Card[]
  players: Player[]
  currentPlayerIndex: number
  sequences: Sequence[]
  phase: 'lobby' | 'playing' | 'ended'
  winner: ChipColor | null
  lastAction: string | null
  numTeams: 2 | 3
  playersPerTeam: number
  hostId: string
  lobbySlots: LobbySlot[]
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  turnDeadline: number | null
  hintsEnabled: boolean
}
```

- [ ] **Step 2: Mirror the change in client types**

Replace the `GameState` interface in `client/src/types/game.ts` with the identical block from Step 1 (the two files must stay in sync).

- [ ] **Step 3: Run typecheck — expect type errors that will be fixed in subsequent tasks**

```bash
npm run typecheck --workspace=server 2>&1 | head -30
npm run typecheck --workspace=client 2>&1 | head -30
```

Expected: errors about `hintsEnabled` missing from object literals in `roomManager.ts` and `gameStore.ts` — these are intentional and will be resolved in Tasks 2 and 4.

---

### Task 2: Update server socket handlers

**Files:**
- Modify: `server/src/socket/roomManager.ts:300-334` (`room:create` handler)
- Modify: `server/src/socket/roomManager.ts:106-115` (`broadcastLobbyState`)
- Modify: `server/src/socket/roomManager.ts:508-547` (`room:updateRules` handler)

- [ ] **Step 1: Accept `hintsEnabled` in the `room:create` handler payload and persist it**

Replace the `room:create` handler signature (lines 300–326) so it reads:

```typescript
socket.on('room:create', ({ playerName, numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled }: {
  playerName: string
  numTeams: 2 | 3
  playersPerTeam: number
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  hintsEnabled: boolean
}) => {
  const roomCode = generateRoomCode()
  const lobbySlots: LobbySlot[] = []
  for (let t = 0; t < numTeams; t++) {
    for (let s = 0; s < playersPerTeam; s++) {
      lobbySlots.push({
        color: TEAM_COLORS[t],
        seatIndex: s,
        playerId: t === 0 && s === 0 ? socket.id : null,
        playerName: t === 0 && s === 0 ? playerName : null,
        isAI: false,
      })
    }
  }

  const state: GameState = {
    roomCode, board: initBoard(), deck: [], discards: [], players: [],
    currentPlayerIndex: 0, sequences: [], phase: 'lobby', winner: null,
    lastAction: null, numTeams, playersPerTeam, hostId: socket.id,
    lobbySlots, turnTimer, sequencesToWin: sequencesToWin ?? 2,
    turnDeadline: null, hintsEnabled: hintsEnabled ?? true,
  }

  rooms.set(roomCode, state)
  socketToRoom.set(socket.id, roomCode)
  socket.join(roomCode)
  const token = issueRejoinToken(socket.id, roomCode)
  socket.emit('room:joined', { roomCode, playerId: socket.id, color: 'blue', rejoinToken: token })
  broadcastLobbyState(state, io)
})
```

- [ ] **Step 2: Include `hintsEnabled` in `broadcastLobbyState`**

Replace the `broadcastLobbyState` function (lines 106–115):

```typescript
function broadcastLobbyState(state: GameState, io: Server): void {
  io.to(state.roomCode).emit('room:lobbyState', {
    slots: state.lobbySlots,
    hostId: state.hostId,
    numTeams: state.numTeams,
    playersPerTeam: state.playersPerTeam,
    turnTimer: state.turnTimer,
    sequencesToWin: state.sequencesToWin,
    hintsEnabled: state.hintsEnabled,
  })
}
```

- [ ] **Step 3: Accept and persist `hintsEnabled` in the `room:updateRules` handler**

Replace the `room:updateRules` handler signature and `state.turnTimer` / `state.sequencesToWin` assignment block (lines 508–546):

```typescript
socket.on('room:updateRules', ({ numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled }: {
  numTeams: 2 | 3
  playersPerTeam: number
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  hintsEnabled: boolean
}) => {
  const roomCode = socketToRoom.get(socket.id)
  if (!roomCode) return
  const state = rooms.get(roomCode)
  if (!state || state.phase !== 'lobby' || state.hostId !== socket.id) return

  state.turnTimer = turnTimer
  state.sequencesToWin = sequencesToWin
  state.hintsEnabled = hintsEnabled

  if (state.numTeams !== numTeams || state.playersPerTeam !== playersPerTeam) {
    const humans = state.lobbySlots
      .filter(s => s.playerId !== null)
      .map(s => ({ playerId: s.playerId!, playerName: s.playerName! }))

    state.lobbySlots = []
    for (let t = 0; t < numTeams; t++) {
      for (let s = 0; s < playersPerTeam; s++) {
        state.lobbySlots.push({ color: TEAM_COLORS[t], seatIndex: s, playerId: null, playerName: null, isAI: false })
      }
    }

    for (let i = 0; i < humans.length && i < state.lobbySlots.length; i++) {
      state.lobbySlots[i].playerId = humans[i].playerId
      state.lobbySlots[i].playerName = humans[i].playerName
    }

    state.numTeams = numTeams
    state.playersPerTeam = playersPerTeam
  }

  broadcastLobbyState(state, io)
})
```

- [ ] **Step 4: Verify server typechecks clean**

```bash
npm run typecheck --workspace=server
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/types/game.ts client/src/types/game.ts server/src/socket/roomManager.ts
git commit -m "feat: add hintsEnabled to GameState and server socket handlers"
```

---

### Task 3: Update client socket emitters

**Files:**
- Modify: `client/src/socket/socketClient.ts:6-7` (`createRoom`)
- Modify: `client/src/socket/socketClient.ts:30-31` (`updateRules`)

- [ ] **Step 1: Add `hintsEnabled` parameter to `createRoom`**

Replace line 6–7 in `client/src/socket/socketClient.ts`:

```typescript
export const createRoom = (playerName: string, numTeams: 2 | 3, playersPerTeam: number, turnTimer: 15 | 30 | 60 | null, sequencesToWin: 1 | 2 | 3, hintsEnabled: boolean) =>
  socket.emit('room:create', { playerName, numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled })
```

- [ ] **Step 2: Add `hintsEnabled` parameter to `updateRules`**

Replace line 30–31 in `client/src/socket/socketClient.ts`:

```typescript
export const updateRules = (numTeams: 2 | 3, playersPerTeam: number, turnTimer: 15 | 30 | 60 | null, sequencesToWin: 1 | 2 | 3, hintsEnabled: boolean) =>
  socket.emit('room:updateRules', { numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled })
```

---

### Task 4: Update Zustand store

**Files:**
- Modify: `client/src/store/gameStore.ts`

- [ ] **Step 1: Add `hintsEnabled` to `LobbyStatePayload`, `GameStore` interface, initial state, `setLobbyState`, and `resetGame`**

Replace `gameStore.ts` with the following (every changed line is marked inline):

```typescript
import { create } from 'zustand'
import type { GameState, Card, ChipColor, LobbySlot } from '../types/game'
import { BOARD_LAYOUT } from '../constants/boardLayout'
import { maxRunAt } from '../utils/sequenceHint'

export type HighlightMode = 'place' | 'remove' | null

interface LobbyStatePayload {
  slots: LobbySlot[]
  hostId: string
  numTeams: 2 | 3
  playersPerTeam: number
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  hintsEnabled: boolean          // ← added
}

interface GameStore {
  gameState: GameState | null
  roomCode: string | null
  myPlayerId: string | null
  myColor: ChipColor
  selectedCardIndex: number | null
  highlightedCells: [number, number][]
  hintCells: Record<string, 'complete' | 'near'>
  highlightMode: HighlightMode
  pendingDeadCardIndex: number | null
  error: string | null
  lobbySlots: LobbySlot[]
  numTeams: 2 | 3
  playersPerTeam: number
  hostId: string | null
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  hintsEnabled: boolean          // ← added

  setGameState: (s: GameState) => void
  setRoomInfo: (roomCode: string, playerId: string, color: ChipColor) => void
  setLobbyState: (data: LobbyStatePayload) => void
  selectCard: (index: number | null) => void
  setPendingDeadCard: (index: number | null) => void
  setError: (e: string | null) => void
  clearSelection: () => void
  resetGame: () => void
}

function getBoardPositions(card: Card): [number, number][] {
  const key = `${card.rank}${card.suit}`
  const positions: [number, number][] = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD_LAYOUT[r][c] === key) positions.push([r, c])
    }
  }
  return positions
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  roomCode: null,
  myPlayerId: null,
  myColor: null,
  selectedCardIndex: null,
  highlightedCells: [],
  hintCells: {},
  highlightMode: null,
  pendingDeadCardIndex: null,
  error: null,
  lobbySlots: [],
  numTeams: 2,
  playersPerTeam: 1,
  hostId: null,
  turnTimer: null,
  sequencesToWin: 2,
  hintsEnabled: true,            // ← added (default on)

  setGameState: (s) => set({ gameState: s }),

  setRoomInfo: (roomCode, playerId, color) =>
    set({ roomCode, myPlayerId: playerId, myColor: color }),

  setLobbyState: (data) => set({
    lobbySlots: data.slots,
    hostId: data.hostId,
    numTeams: data.numTeams,
    playersPerTeam: data.playersPerTeam,
    turnTimer: data.turnTimer,
    sequencesToWin: data.sequencesToWin,
    hintsEnabled: data.hintsEnabled,  // ← added
  }),

  selectCard: (index) => {
    const { gameState, myColor, myPlayerId } = get()
    if (index === null || !gameState) {
      set({ selectedCardIndex: null, highlightedCells: [], hintCells: {}, highlightMode: null })
      return
    }

    const me = gameState.players.find(p => p.id === myPlayerId)
    if (!me) return
    const card = me.hand[index]
    if (!card || card.hidden) return

    let highlighted: [number, number][] = []
    let highlightMode: HighlightMode = 'place'

    if (card.rank === 'J2') {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = gameState.board[r][c]
          if (cell.chip === null && cell.card !== 'FREE') highlighted.push([r, c])
        }
      }
      highlightMode = 'place'
    } else if (card.rank === 'J1') {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = gameState.board[r][c]
          if (cell.chip !== null && cell.chip !== myColor && cell.sequenceId === null)
            highlighted.push([r, c])
        }
      }
      highlightMode = 'remove'
    } else {
      const positions = getBoardPositions(card)
      highlighted = positions.filter(([r, c]) => gameState.board[r][c].chip === null)
      highlightMode = 'place'
    }

    // Compute sequence potential — only when hints are enabled for this room
    const hintCells: Record<string, 'complete' | 'near'> = {}
    if (highlightMode === 'place' && myColor && gameState.hintsEnabled) {  // ← added hintsEnabled check
      for (const [r, c] of highlighted) {
        const run = maxRunAt(gameState.board, r, c, myColor, gameState.sequences)
        if (run >= 4) hintCells[`${r}-${c}`] = 'complete'
        else if (run >= 3) hintCells[`${r}-${c}`] = 'near'
      }
    }

    set({ selectedCardIndex: index, highlightedCells: highlighted, hintCells, highlightMode })
  },

  setPendingDeadCard: (index) => set({ pendingDeadCardIndex: index }),

  setError: (e) => set({ error: e }),

  clearSelection: () => set({ selectedCardIndex: null, highlightedCells: [], hintCells: {}, highlightMode: null }),

  resetGame: () => {
    localStorage.removeItem('sequence:rejoin')
    set({
      gameState: null,
      roomCode: null,
      myPlayerId: null,
      myColor: null,
      selectedCardIndex: null,
      highlightedCells: [],
      hintCells: {},
      highlightMode: null,
      pendingDeadCardIndex: null,
      error: null,
      lobbySlots: [],
      numTeams: 2,
      playersPerTeam: 1,
      hostId: null,
      turnTimer: null,
      sequencesToWin: 2,
      hintsEnabled: true,        // ← added
    })
  },
}))
```

---

### Task 5: Add hints toggle to Create Game panel (`Lobby.tsx`)

**Files:**
- Modify: `client/src/components/Lobby.tsx`

- [ ] **Step 1: Add `hintsEnabled` local state and pass it to `createRoom`**

Add `hintsEnabled` state alongside the other config states (after line 30):

```typescript
const [hintsEnabled, setHintsEnabled] = useState(true)
```

- [ ] **Step 2: Add the toggle row in the configure panel**

After the "Sequences to win" block (after line 119, before the `<p>` summary), insert:

```tsx
<div className="flex items-center justify-between">
  <label className="text-xs text-gray-500 uppercase tracking-wide">Hints</label>
  <SegmentedControl
    options={[true, false] as const}
    value={hintsEnabled}
    onChange={setHintsEnabled}
    label={v => v ? 'On' : 'Off'}
  />
</div>
```

- [ ] **Step 3: Pass `hintsEnabled` to `createRoom` on line 125**

Replace:

```typescript
<button onClick={() => createRoom(name || 'Player', numTeams, playersPerTeam, turnTimer, sequencesToWin)} className={`${BTN_PRIMARY} py-2.5`}>
```

With:

```typescript
<button onClick={() => createRoom(name || 'Player', numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled)} className={`${BTN_PRIMARY} py-2.5`}>
```

- [ ] **Step 4: Run client typecheck**

```bash
npm run typecheck --workspace=client
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/socket/socketClient.ts client/src/store/gameStore.ts client/src/components/Lobby.tsx
git commit -m "feat: add hintsEnabled toggle to Create Game panel"
```

---

### Task 6: Add hints toggle to LobbyWaiting rules editor

**Files:**
- Modify: `client/src/components/LobbyWaiting.tsx`

- [ ] **Step 1: Pull `hintsEnabled` from store and add local state**

On line 17, add `hintsEnabled` to the destructured store values:

```typescript
const { lobbySlots, hostId, roomCode, myPlayerId, numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled, resetGame } = useGameStore()
```

After line 26 (`const [localSeqToWin, ...]`), add:

```typescript
const [localHints, setLocalHints] = useState(hintsEnabled)
```

- [ ] **Step 2: Sync local hints state when the rules panel opens**

In the `useEffect` (lines 38–45), add `hintsEnabled` to the dependency array and sync:

```typescript
useEffect(() => {
  if (rulesOpen) {
    setLocalTeams(numTeams)
    setLocalPPT(playersPerTeam as 1 | 2 | 4)
    setLocalTimer(turnTimer)
    setLocalSeqToWin(sequencesToWin)
    setLocalHints(hintsEnabled)
  }
}, [rulesOpen, numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled])
```

- [ ] **Step 3: Add `handleHints` change handler**

After the existing `handleSeqToWin` function (line 50), add:

```typescript
function handleHints(v: boolean) { setLocalHints(v); updateRules(localTeams, localPPT, localTimer, localSeqToWin, v) }
```

- [ ] **Step 4: Update existing `handleTeams`, `handlePPT`, `handleTimer`, `handleSeqToWin` to pass `localHints`**

Replace lines 47–50:

```typescript
function handleTeams(v: 2 | 3) { setLocalTeams(v); updateRules(v, localPPT, localTimer, localSeqToWin, localHints) }
function handlePPT(v: 1 | 2 | 4) { setLocalPPT(v); updateRules(localTeams, v, localTimer, localSeqToWin, localHints) }
function handleTimer(v: 15 | 30 | 60 | null) { setLocalTimer(v); updateRules(localTeams, localPPT, v, localSeqToWin, localHints) }
function handleSeqToWin(v: 1 | 2 | 3) { setLocalSeqToWin(v); updateRules(localTeams, localPPT, localTimer, v, localHints) }
```

- [ ] **Step 5: Add hints toggle row in the rules editor panel**

After the "Sequences to win" `<div>` block (after line 129), insert:

```tsx
<div className="flex items-center justify-between">
  <label className="text-xs text-gray-500 uppercase tracking-wide">Hints</label>
  <SegmentedControl
    options={[true, false] as const}
    value={localHints}
    onChange={handleHints}
    label={v => v ? 'On' : 'Off'}
  />
</div>
```

- [ ] **Step 6: Update the rules summary line to include hints**

Replace line 88–90 (the summary `<motion.p>` body text):

```tsx
{numTeams} teams · {playersPerTeam} per team
{turnTimer ? ` · ${turnTimer}s timer` : ' · no timer'}
{` · ${sequencesToWin} to win`}
{hintsEnabled ? ' · hints on' : ' · hints off'}
```

- [ ] **Step 7: Run full typecheck on both workspaces**

```bash
npm run typecheck --workspace=server && npm run typecheck --workspace=client
```

Expected: 0 errors on both sides.

- [ ] **Step 8: Run the app and verify end-to-end**

```bash
npm run dev
```

Manual checks:
1. Open the Create Game panel — a "Hints · On / Off" row appears below "Sequences to win".
2. Create a room with Hints Off → hints summary shows "hints off" in LobbyWaiting.
3. Open the rules editor in LobbyWaiting → Hints toggle is present, changes broadcast to all players in room.
4. Start a game with Hints Off → selecting a card does NOT show colored hint cells on the board.
5. Start a game with Hints On → selecting a card DOES show colored hint cells (existing behavior).

- [ ] **Step 9: Commit**

```bash
git add client/src/components/LobbyWaiting.tsx
git commit -m "feat: add hintsEnabled toggle to LobbyWaiting rules editor"
```
