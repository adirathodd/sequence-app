import { BOARD_LAYOUT } from '../src/constants/boardLayout'

const counts: Record<string, number> = {}

for (const row of BOARD_LAYOUT) {
  for (const cell of row) {
    if (cell === 'XX') continue
    counts[cell] = (counts[cell] ?? 0) + 1
  }
}

const suits = ['S', 'H', 'D', 'C']
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'Q', 'K', 'A']

let errors = 0

for (const rank of ranks) {
  for (const suit of suits) {
    const key = `${rank}${suit}`
    const count = counts[key] ?? 0
    if (count !== 2) {
      console.error(`FAIL: ${key} appears ${count} times (expected 2)`)
      errors++
    }
  }
}

// Jacks must not appear on the board
for (const key of Object.keys(counts)) {
  if (key.startsWith('J')) {
    console.error(`FAIL: Jack found on board: ${key}`)
    errors++
  }
}

const totalNonFree = Object.values(counts).reduce((a, b) => a + b, 0)
const freeCount = BOARD_LAYOUT.flat().filter(c => c === 'XX').length

console.log(`Total non-FREE cells: ${totalNonFree} (expected 96)`)
console.log(`FREE corners: ${freeCount} (expected 4)`)
console.log(`Errors: ${errors}`)

if (errors > 0) process.exit(1)
