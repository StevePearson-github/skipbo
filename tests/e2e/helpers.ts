import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface Launched {
  app: ElectronApplication
  page: Page
  userData: string
  errors: string[]
}

export async function launch(extraEnv: Record<string, string> = {}, userData?: string): Promise<Launched> {
  userData = userData ?? mkdtempSync(join(tmpdir(), 'skipbo-e2e-'))
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, SKIPBO_TEST: '1', SKIPBO_USER_DATA: userData, ...extraEnv },
  })
  const page = await app.firstWindow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.waitForSelector('body[data-ready="1"]')
  return { app, page, userData, errors }
}

export type SeatSpec = { name: string; kind: 'human' | 'cpu'; level?: 'easy' | 'medium' | 'hard' }

export async function startGame(page: Page, seats: SeatSpec[], extra: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(
    ({ seats, extra }) => {
      window.__skipbo!.startGame({
        seats: seats.map((s) => ({ level: 'medium', ...s })),
        stockSize: 0,
        target: 0,
        passScreen: true,
        ...extra,
      } as never)
    },
    { seats, extra },
  )
  await page.waitForSelector('#game .tray-hand')
}

/** Current engine state, read from the running game. */
export const getState = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__skipbo!.game()!.state)))
