# Return to Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-game "Rematch" and "Restart" buttons with a single "Return to Lobby" button that sends all players back to the waiting lobby when the host clicks it.

**Architecture:** New `room:returnToLobby` socket event on the server resets game state to `'lobby'` phase and rebuilds `lobbySlots` from the current players, then broadcasts `room:lobbyState`. On the client, `setLobbyState` clears `gameState` (triggering the App router to show `LobbyWaiting`), and `GameStatus` shows one button for host and a disabled variant for non-hosts.

**Tech Stack:** Node/Express/Socket.io (server), React/Zustand/socket.io-client (client), TypeScript strict mode on both sides.

---

### Task 1: Add `room:returnToLobby` socket event on the server

**Files:**
- Modify: `server/src/socket/roomManager.ts` (after the `room:rematch` handler, ~line 422)

- [ ] **Step 1: Add the handler after the `room:rematch` block**

Locate this line in `roomManager.ts`:
```ts
  socket.on('room:rematch', () => {
```
After its closing `})`, add:

```ts
  socket.on('room:returnToLobby', () => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'ended' || state.hostId !== socket.id) return

    // Cancel any lingering disconnect grace timers
    for (const player of state.players) {
      const h = disconnectTimers.get(player.id)
      if (h) { clearTimeout(h); disconnectTimers.delete(player.id) }
    }

    // Rebuild lobbySlots from current players, preserving teams and AI flags
    const newSlots: LobbySlot[] = []
    for (let t = 0; t < state.numTeams; t++) {
      const teamColor = TEAM_COLORS[t]
      const teamPlayers = state.players.filter(p => p.color === teamColor)
      for (let s = 0; s < state.playersPerTeam; s++) {
        const player = teamPlayers[s]
        if (player) {
          newSlots.push({
            color: teamColor,
            seatIndex: s,
            playerId: player.isAI ? null : player.id,
            playerName: player.isAI ? null : player.name,
            isAI: player.isAI,
          })
        } else {
          newSlots.push({ color: teamColor, seatIndex: s, playerId: null, playerName: null, isAI: false })
        }
      }
    }

    // Reset to lobby state
    state.lobbySlots = newSlots
    state.players = []
    state.board = initBoard()
    state.deck = []
    state.discards = []
    state.currentPlayerIndex = 0
    state.sequences = []
    state.winner = null
    state.lastAction = null
    state.turnDeadline = null
    state.phase = 'lobby'

    broadcastLobbyState(state, io)
  })
```

- [ ] **Step 2: Typecheck the server**

```bash
npm run typecheck --workspace=server
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/socket/roomManager.ts
git commit -m "feat: add room:returnToLobby server event"
```

---

### Task 2: Add `returnToLobby` client socket function

**Files:**
- Modify: `client/src/socket/socketClient.ts`

- [ ] **Step 1: Replace `rematch` export with `returnToLobby`**

In `socketClient.ts`, find:
```ts
export const rematch = () =>
  socket.emit('room:rematch')
```

Replace with:
```ts
export const returnToLobby = () =>
  socket.emit('room:returnToLobby')
```

- [ ] **Step 2: Typecheck the client**

```bash
npm run typecheck --workspace=client
```

Expected: errors pointing to `rematch` usages in `GameStatus.tsx` (which Task 3 will fix). If any other file imports `rematch`, fix those too before proceeding.

- [ ] **Step 3: Commit**

```bash
git add client/src/socket/socketClient.ts
git commit -m "feat: replace rematch socket fn with returnToLobby"
```

---

### Task 3: Clear `gameState` when `setLobbyState` is called

**Files:**
- Modify: `client/src/store/gameStore.ts`

**Why:** `App.tsx` computes `inGame = gameState && gameState.phase !== 'lobby'`. When the server transitions back to lobby and sends `room:lobbyState`, the client must clear `gameState` so the router shows `LobbyWaiting` instead of the game screen.

- [ ] **Step 1: Update `setLobbyState` to also clear `gameState`**

In `gameStore.ts`, find:
```ts
  setLobbyState: (data) => set({
    lobbySlots: data.slots,
    hostId: data.hostId,
    numTeams: data.numTeams,
    playersPerTeam: data.playersPerTeam,
    turnTimer: data.turnTimer,
    sequencesToWin: data.sequencesToWin,
    hints: data.hints,
  }),
```

Replace with:
```ts
  setLobbyState: (data) => set({
    gameState: null,
    lobbySlots: data.slots,
    hostId: data.hostId,
    numTeams: data.numTeams,
    playersPerTeam: data.playersPerTeam,
    turnTimer: data.turnTimer,
    sequencesToWin: data.sequencesToWin,
    hints: data.hints,
  }),
```

- [ ] **Step 2: Typecheck the client**

```bash
npm run typecheck --workspace=client
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/store/gameStore.ts
git commit -m "fix: clear gameState when setLobbyState is called"
```

---

### Task 4: Replace end-game buttons in `GameStatus.tsx`

**Files:**
- Modify: `client/src/components/GameStatus.tsx`

- [ ] **Step 1: Update the import**

In `GameStatus.tsx`, find:
```ts
import { rematch, startVsAI, quitGame } from '../socket/socketClient'
```

Replace with:
```ts
import { returnToLobby, quitGame } from '../socket/socketClient'
```

- [ ] **Step 2: Replace buttons in the "no winner" (forfeit/quit) modal**

Find the block inside `if (gameState.phase === 'ended')` → `if (!gameState.winner)` that currently contains:
```tsx
            <div className="flex flex-col gap-2 w-full">
              {isHost && (
                <button onClick={() => rematch()} className={`${BTN_INDIGO} w-full py-3 text-sm`}>
                  Rematch
                </button>
              )}
              <button onClick={() => startVsAI(myName)} className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}>
                Restart
              </button>
              <button onClick={() => { quitGame(); resetGame() }} className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}>
                Back to Menu
              </button>
            </div>
```

Replace with:
```tsx
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => { if (isHost) returnToLobby() }}
                disabled={!isHost}
                className={`${BTN_INDIGO} w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isHost ? 'Return to Lobby' : 'Waiting for host…'}
              </button>
              <button onClick={() => { quitGame(); resetGame() }} className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}>
                Back to Menu
              </button>
            </div>
```

- [ ] **Step 3: Replace buttons in the win/loss modal**

Find the block inside the `return (...)` for the win/loss screen that currently contains:
```tsx
          <div className="flex flex-col gap-2 w-full">
            {isHost && (
              <button
                onClick={() => rematch()}
                className={`${iWon ? BTN_GOLD : BTN_INDIGO} w-full py-3 text-sm`}
              >
                Rematch
              </button>
            )}
            <button
              onClick={() => startVsAI(myName)}
              className={[
                'w-full py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 active:scale-[0.97]',
                iWon
                  ? 'bg-white border-yellow-200 text-yellow-800 hover:bg-yellow-50 shadow-sm'
                  : 'bg-white/6 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 shadow-sm',
              ].join(' ')}
            >
              Restart
            </button>
            <button
              onClick={() => { quitGame(); resetGame() }}
              className={[
                'w-full py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 active:scale-[0.97]',
                iWon
                  ? 'bg-yellow-100 border-yellow-200 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-white/6 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300',
              ].join(' ')}
            >
              Back to Menu
            </button>
          </div>
```

Replace with:
```tsx
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => { if (isHost) returnToLobby() }}
              disabled={!isHost}
              className={[
                `${iWon ? BTN_GOLD : BTN_INDIGO} w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed`,
              ].join(' ')}
            >
              {isHost ? 'Return to Lobby' : 'Waiting for host…'}
            </button>
            <button
              onClick={() => { quitGame(); resetGame() }}
              className={[
                'w-full py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 active:scale-[0.97]',
                iWon
                  ? 'bg-yellow-100 border-yellow-200 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-white/6 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300',
              ].join(' ')}
            >
              Back to Menu
            </button>
          </div>
```

- [ ] **Step 4: Typecheck the client**

```bash
npm run typecheck --workspace=client
```

Expected: no errors.

- [ ] **Step 5: Run server tests**

```bash
npm test --workspace=server
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/GameStatus.tsx
git commit -m "feat: replace rematch/restart buttons with return-to-lobby"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open two browser tabs/windows and join the same room (one as host, one as non-host).

- [ ] **Step 2: Verify end-game screen for non-host**

When the game ends, non-host should see:
- "Waiting for host…" button (disabled, 40% opacity)
- "Back to Menu" button

- [ ] **Step 3: Verify host triggers return to lobby**

Host clicks "Return to Lobby". Both players should:
- See the `LobbyWaiting` screen with the same room code and player assignments
- Be able to start a new game from the lobby

- [ ] **Step 4: Verify "Back to Menu" still works**

Any player clicking "Back to Menu" should be taken back to the main menu (not the lobby).
