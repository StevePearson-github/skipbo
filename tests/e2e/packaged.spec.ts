import { _electron as electron, expect, test } from '@playwright/test'
import { existsSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const exe = join(__dirname, '../../dist/mac-universal/Skip-Bo.app/Contents/MacOS/Skip-Bo')

test('packaged macOS app launches, shows the menu and starts a game', async () => {
  test.skip(!existsSync(exe), 'no packaged build (run npm run dist:mac)')
  const app = await electron.launch({
    executablePath: exe,
    env: { ...process.env, SKIPBO_TEST: '1', SKIPBO_USER_DATA: mkdtempSync(join(tmpdir(), 'skipbo-pkg-')) },
  })
  const page = await app.firstWindow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await expect(page.locator('.logo')).toHaveText('SKIP-BO')
  await page.click('#play')
  await expect(page.locator('#game .tray-hand')).toBeVisible()
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
  await app.close()
})
