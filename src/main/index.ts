import { app, BrowserWindow, ipcMain, Menu, session, shell } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'

const isTest = process.env.SKIPBO_TEST === '1'
if (process.env.SKIPBO_USER_DATA) app.setPath('userData', process.env.SKIPBO_USER_DATA)

// Audio must be allowed to start without a user gesture inside the window.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const settingsFile = () => join(app.getPath('userData'), 'settings.json')

function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsFile(), 'utf8'))
  } catch {
    return {}
  }
}

function writeSettings(data: Record<string, unknown>): void {
  mkdirSync(app.getPath('userData'), { recursive: true })
  const tmp = settingsFile() + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2))
  renameSync(tmp, settingsFile())
}

function createWindow(): void {
  const saved = readSettings() as { bounds?: { width: number; height: number } }
  const win = new BrowserWindow({
    width: Math.max(960, saved.bounds?.width ?? 1280),
    height: Math.max(600, saved.bounds?.height ?? 800),
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0e3b3a',
    title: 'Skip-Bo',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })
  win.once('ready-to-show', () => {
    if (!isTest) win.show()
    else win.showInactive()
  })
  win.on('close', () => {
    const [width, height] = win.getSize()
    writeSettings({ ...readSettings(), bounds: { width, height } })
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  const extra = Object.fromEntries(new URLSearchParams(process.env.SKIPBO_QUERY ?? ''))
  const query = isTest ? { query: { test: '1', ...extra } } : {}
  if (devUrl && !app.isPackaged) void win.loadURL(devUrl + (isTest ? '?test=1&' + (process.env.SKIPBO_QUERY ?? '') : ''))
  else void win.loadFile(join(__dirname, '../renderer/index.html'), query)
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
  Menu.setApplicationMenu(
    process.platform === 'darwin'
      ? Menu.buildFromTemplate([
          { role: 'appMenu' },
          { role: 'editMenu' },
          { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
          { role: 'windowMenu' },
        ])
      : null,
  )
  ipcMain.handle('settings:get', () => {
    const { bounds: _b, ...rest } = readSettings()
    return rest
  })
  ipcMain.handle('settings:set', (_e, patch: Record<string, unknown>) => {
    writeSettings({ ...readSettings(), ...patch })
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
