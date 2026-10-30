import { test } from '@playwright/test'
import { launch, startGame } from './helpers'

for (const n of [2, 3, 4, 5, 6]) {
  test(`screenshot ${n} players`, async () => {
    const { app, page } = await launch({ SKIPBO_QUERY: 'seed=5&fast=1' })
    await page.screenshot({ path: 'screenshots/menu.png' })
    const names = ['Steve', 'Pixel', 'Bolt', 'Nova', 'Pogo', 'Zig']
    await startGame(
      page,
      names.slice(0, n).map((name, i) => ({ name, kind: i === 0 ? ('human' as const) : ('cpu' as const) })),
      { passScreen: false },
    )
    await page.waitForTimeout(300)
    await page.screenshot({ path: `screenshots/game${n}.png` })
    await app.close()
  })
}
