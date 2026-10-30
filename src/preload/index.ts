import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('skipboApi', {
  getSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Record<string, unknown>): Promise<void> => ipcRenderer.invoke('settings:set', patch),
})
