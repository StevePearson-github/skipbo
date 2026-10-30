import { expect, test } from '@playwright/test'
import { Launched, getState, launch, startGame } from './helpers'

const HUMAN_CPU = [
  { name: 'Steve', kind: 'human' as const },
  { name: 'Pixel', kind: 'cpu' as const, level: 'easy' as const },
]

let ctx: Launched
test.afterEach(async () => {
  expect(ctx.errors, 'no console or page errors').toEqual([])
  await ctx.app.close()
})

test('menu shows title and starts a game with the chosen player count', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=11&fast=1' })
  const { page } = ctx
  await expect(page.locator('.logo')).toHaveText('SKIP-BO')
  await expect(page.locator('.seat-row')).toHaveCount(2)
  await page.click('[data-count="5"]')
  await expect(page.locator('.seat-row')).toHaveCount(5)
  await page.click('[data-count="3"]')
  await expect(page.locator('.seat-row')).toHaveCount(3)
  await page.fill('[data-name="0"]', 'Alice')
  await page.click('#play')
  await page.waitForSelector('#game .tray-hand')
  const s = await getState(page)
  expect(s.players).toHaveLength(3)
  expect(s.players[0].stock).toHaveLength(30)
  await expect(page.locator('.seat')).toHaveCount(2)
  await expect(page.locator('.tray-name')).toContainText(/Alice|Pixel|Bolt/)
})

test('5-6 players use a 20-card stock and render every opponent seat', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=3&fast=1' })
  const { page } = ctx
  const seats = ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({ name, kind: 'human' as const }))
  await page.evaluate((seats) => window.__skipbo!.startGame({ seats: seats.map((s) => ({ ...s, level: 'medium' })), stockSize: 0, target: 0, passScreen: false } as never), seats)
  await page.waitForSelector('#game .tray-hand')
  const s = await getState(page)
  expect(s.players[0].stock).toHaveLength(20)
  await expect(page.locator('.seat')).toHaveCount(5)
})

test('a human can select a card, play it to a building pile, and discard to end the turn', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=11&fast=1' })
  const { page } = ctx
  await startGame(page, HUMAN_CPU)
  let s = await getState(page)
  // make the first player human by restarting until the human has the move (seed rotates by round)
  expect(s.players[s.current]).toBeTruthy()
  if (s.current !== 0) {
    await page.waitForFunction(() => window.__skipbo!.game()!.state.current === 0, undefined, { timeout: 20000 })
    s = await getState(page)
  }
  const hand: number[] = s.players[0].hand
  const playable = hand.findIndex((c) => c === 1 || c === 0)
  if (playable >= 0) {
    await page.click(`.tray-hand [data-hand="${playable}"]`)
    await expect(page.locator('.tray-hand .sel')).toHaveCount(1)
    await expect(page.locator('[data-build].legal').first()).toBeVisible()
    await page.click('[data-build="0"]')
    await page.waitForFunction(() => window.__skipbo!.game()!.state.build[0]!.length === 1)
  }
  // discard the first remaining card onto pile 2
  const before = await getState(page)
  await page.click('.tray-hand [data-hand="0"]')
  await page.click('.tray-left [data-discard="2"]')
  await page.waitForFunction(() => window.__skipbo!.game()!.state.players[0]!.discards[2]!.length === 1)
  const after = await getState(page)
  expect(after.players[0].discards[2]).toHaveLength(1)
  expect(after.turnCount).toBeGreaterThan(before.turnCount)
  // the computer then plays and control returns to the human (or the game ends)
  await page.waitForFunction(() => window.__skipbo!.game()!.state.current === 0 || window.__skipbo!.game()!.state.winner !== null, undefined, { timeout: 20000 })
})

test('an illegal move is rejected, shakes the pile and leaves the game unchanged', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=2&fast=1' })
  const { page } = ctx
  await startGame(page, [{ name: 'Steve', kind: 'human' }, { name: 'Bo', kind: 'human' }], { passScreen: false })
  const s = await getState(page)
  const idx = s.players[s.current].hand.findIndex((c: number) => c > 1)
  expect(idx).toBeGreaterThanOrEqual(0)
  await page.click(`.tray-hand [data-hand="${idx}"]`)
  await page.click('[data-build="1"]')
  await expect(page.locator('[data-build="1"]')).toHaveClass(/shake/)
  const after = await getState(page)
  expect(after.build).toEqual(s.build)
  expect(after.players[s.current].hand).toEqual(s.players[s.current].hand)
})

test('hint highlights a move and undo takes back a play', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=4&fast=1' })
  const { page } = ctx
  await startGame(page, [{ name: 'Steve', kind: 'human' }, { name: 'Bo', kind: 'human' }], { passScreen: false })
  await page.click('[data-act="hint"]')
  await expect(page.locator('.hint').first()).toBeVisible()
  await expect(page.locator('[data-act="undo"]')).toBeDisabled()
  const s = await getState(page)
  const hand: number[] = s.players[s.current].hand
  const i = hand.findIndex((c) => c <= 1)
  test.skip(i < 0, 'seed has no opening card in hand')
  await page.click(`.tray-hand [data-hand="${i}"]`)
  await page.click('[data-build="0"]')
  await page.waitForFunction(() => window.__skipbo!.game()!.state.build[0]!.length === 1)
  await expect(page.locator('[data-act="undo"]')).toBeEnabled()
  await page.click('[data-act="undo"]')
  const u = await getState(page)
  expect(u.build[0]).toHaveLength(0)
  expect(u.players[s.current].hand).toEqual(hand)
})

test('two humans get a pass-the-device screen that hides the hand until ready', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=6&fast=1' })
  const { page } = ctx
  await page.evaluate(() => window.__skipbo!.startGame({ seats: [{ name: 'Ann', kind: 'human', level: 'medium' }, { name: 'Ben', kind: 'human', level: 'medium' }], stockSize: 0, target: 0, passScreen: true } as never))
  await page.waitForSelector('#pass')
  const s = await getState(page)
  const who = ['Ann', 'Ben'][s.current]
  await expect(page.locator('#pass h2')).toHaveText(who!)
  await page.click('#ready')
  await expect(page.locator('#pass')).toHaveCount(0)
  await page.click('.tray-hand [data-hand="0"]')
  await page.click('.tray-left [data-discard="0"]')
  await page.waitForSelector('#pass')
  const other = ['Ann', 'Ben'][1 - s.current]
  await expect(page.locator('#pass h2')).toHaveText(other!)
})

test('an all-computer game plays to a winner and shows the results screen', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=9&fast=1' })
  const { page } = ctx
  await page.evaluate(() => window.__skipbo!.startGame({ seats: [1, 2, 3].map((n) => ({ name: `Bot${n}`, kind: 'cpu', level: 'hard' })), stockSize: 10, target: 0, passScreen: false } as never))
  await page.waitForSelector('#winner', { timeout: 60000 })
  await expect(page.locator('#winner h2')).toContainText(/wins|closest/)
  const s = await getState(page)
  expect(s.winner).not.toBeNull()
  await expect(page.locator('#again')).toHaveText('Play again')
})

test('match play accumulates points across rounds until a target is reached', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=21&fast=1' })
  const { page } = ctx
  await page.evaluate(() => window.__skipbo!.startGame({ seats: [1, 2].map((n) => ({ name: `Bot${n}`, kind: 'cpu', level: 'hard' })), stockSize: 10, target: 100, passScreen: false } as never))
  let rounds = 0
  for (let i = 0; i < 40; i++) {
    await page.waitForSelector('#winner', { timeout: 60000 })
    const label = await page.locator('#again').innerText()
    rounds++
    if (label === 'Play again') break
    await page.click('#again')
    await page.waitForFunction((r) => window.__skipbo!.game()!.round === r, rounds)
  }
  const scores: number[] = await page.evaluate(() => window.__skipbo!.game()!.scores)
  expect(Math.max(...scores)).toBeGreaterThanOrEqual(100)
  expect(rounds).toBeGreaterThan(1)
  await expect(page.locator('#winner h2')).toContainText(/win(s)? the match/)
})

test('leave-game confirmation returns to the menu', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=11&fast=1' })
  const { page } = ctx
  await startGame(page, HUMAN_CPU)
  await page.click('[data-act="menu"]')
  await page.click('#no')
  await expect(page.locator('#game')).toBeVisible()
  await page.click('[data-act="menu"]')
  await page.click('#yes')
  await expect(page.locator('#menu')).toBeVisible()
  await expect(page.locator('#game')).toHaveCount(0)
})

test('sound settings persist to disk and the rules dialog opens', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'fast=1' })
  const { page, userData } = ctx
  await page.click('#rules')
  await expect(page.locator('#rules-overlay')).toContainText('stock pile')
  await page.click('#rules-overlay #close')
  await page.click('#snd')
  await page.check('#mute')
  await page.click('#settings-overlay #close')
  await expect.poll(() => require('fs').existsSync(require('path').join(userData, 'settings.json'))).toBe(true)
  const saved = JSON.parse(require('fs').readFileSync(require('path').join(userData, 'settings.json'), 'utf8'))
  expect(saved.audio.muted).toBe(true)
})

test('settings survive a relaunch', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'fast=1' })
  await ctx.page.click('[data-count="4"]')
  await ctx.page.fill('[data-name="0"]', 'Zed')
  await ctx.page.click('#play')
  await ctx.page.waitForSelector('#game')
  const userData = ctx.userData
  await ctx.app.close()
  ctx = await launch({ SKIPBO_QUERY: 'fast=1' }, userData)
  await expect(ctx.page.locator('.seat-row')).toHaveCount(4)
  await expect(ctx.page.locator('[data-name="0"]')).toHaveValue('Zed')
})

test('the stage scales with the window', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'fast=1' })
  const { page } = ctx
  await page.setViewportSize({ width: 960, height: 540 })
  await page.waitForTimeout(100)
  const t = await page.evaluate(() => (document.getElementById('stage') as HTMLElement).style.transform)
  expect(t).toContain('scale(0.5)')
})

test('at normal speed, animated computer turns complete and hand control back to the human', async () => {
  test.setTimeout(120000)
  ctx = await launch({ SKIPBO_QUERY: 'seed=12' })
  const { page } = ctx
  await startGame(page, [{ name: 'Steve', kind: 'human' }, { name: 'Pixel', kind: 'cpu', level: 'hard' }, { name: 'Bolt', kind: 'cpu', level: 'medium' }])
  const humanTurn = () => page.waitForFunction(() => window.__skipbo!.game()!.state.current === 0 && !window.__skipbo!.game()!.busy, undefined, { timeout: 60000 })
  for (let round = 0; round < 3; round++) {
    await humanTurn()
    const s = await getState(page)
    const hand: number[] = s.players[0].hand
    const playable = hand.findIndex((c) => c === 1 || c === 0)
    if (playable >= 0) {
      await page.click(`.tray-hand [data-hand="${playable}"]`)
      await page.click('[data-build="0"]')
      await page.waitForFunction(() => !window.__skipbo!.game()!.busy)
    }
    await page.click('.tray-hand [data-hand="0"]')
    await page.click(`.tray-left [data-discard="${round}"]`)
    await page
      .waitForFunction(() => window.__skipbo!.game()!.state.current !== 0 || window.__skipbo!.game()!.state.winner !== null, undefined, { timeout: 20000 })
      .catch(async (e) => {
        const dbg = await page.evaluate(() => {
          const g = window.__skipbo!.game()!
          return JSON.stringify({ round: g.round, busy: g.busy, selected: g.selected, cur: g.state.current, hand: g.state.players[0]!.hand, build: g.state.build, errors: document.querySelectorAll('.shake').length, fly: document.querySelectorAll('.fly').length })
        })
        throw new Error(`stuck in round ${round}: ${dbg}\n${e}`)
      })
    if (round === 1) await page.screenshot({ path: 'screenshots/midgame.png' })
  }
  await expect(page.locator('.fly')).toHaveCount(0, { timeout: 30000 })
})

test('right-clicking a discard pile shows every card in it, including opponents piles', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=2&fast=1' })
  const { page } = ctx
  await startGame(page, [{ name: 'Steve', kind: 'human' }, { name: 'Bo', kind: 'human' }], { passScreen: false })
  // build up three cards on one of the current player's discard piles via the engine-backed UI
  const who = (await getState(page)).current
  for (let i = 0; i < 2; i++) {
    const before = (await getState(page)).current
    await page.click('.tray-hand [data-hand="0"]')
    await page.click('.tray-left [data-discard="1"]')
    await page.waitForFunction((c) => window.__skipbo!.game()!.state.current !== c, before)
    // opponent turn: also discard onto pile 1 so both players have piles
    await page.click('.tray-hand [data-hand="0"]')
    await page.click('.tray-left [data-discard="1"]')
    await page.waitForFunction((c) => window.__skipbo!.game()!.state.current === c, before)
  }
  const s = await getState(page)
  const n = s.players[who].discards[1].length
  expect(n).toBeGreaterThanOrEqual(2)
  await page.click('.tray-left [data-discard="1"]', { button: 'right' })
  await expect(page.locator('#peek .peek-card')).toHaveCount(n)
  await expect(page.locator('#peek .peek-top')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('#peek')).toHaveCount(0)
  // an opponent's pile can be inspected too, and a click closes it
  await page.click('.seat [data-peek$=":1"]', { button: 'right' })
  await expect(page.locator('#peek .peek-card').first()).toBeVisible()
  await page.click('#peek')
  await expect(page.locator('#peek')).toHaveCount(0)
  // right-click must not play or select anything
  expect((await getState(page)).turnCount).toBe(s.turnCount)
})

test('the winner banner reads "You win!" for a player named You and "Name wins!" otherwise', async () => {
  ctx = await launch({ SKIPBO_QUERY: 'seed=9&fast=1' })
  const { page } = ctx
  await page.evaluate(() => window.__skipbo!.startGame({ seats: [{ name: 'You', kind: 'cpu', level: 'hard' }, { name: 'Pixel', kind: 'cpu', level: 'hard' }], stockSize: 10, target: 0, passScreen: false } as never))
  await page.waitForSelector('#winner')
  const s = await getState(page)
  const text = await page.locator('#winner h2').innerText()
  expect(text).toBe(s.winner === 0 ? 'You win!' : 'Pixel wins!')
})
