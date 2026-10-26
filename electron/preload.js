import { ipcRenderer, contextBridge } from 'electron'

// 传话筒：把后台能力安全地递给界面（阶段3起在这里扩展记账相关接口）
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel, listener) {
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(channel, ...omit) {
    return ipcRenderer.off(channel, ...omit)
  },
  send(channel, ...omit) {
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(channel, ...omit) {
    return ipcRenderer.invoke(channel, ...omit)
  },
})
