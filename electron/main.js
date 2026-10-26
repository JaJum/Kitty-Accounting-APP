import { app, BrowserWindow } from 'electron'
import path from 'node:path'

// 工程根目录（开发和打包后都有效）
const APP_ROOT = app.getAppPath()

process.env.APP_ROOT = APP_ROOT

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, 'public')
  : RENDERER_DIST

let win

// 创建窗口：用户看到的那个"电脑窗口"
function createWindow() {
  win = new BrowserWindow({
    title: '黑马记账',
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // 界面不能直接碰数据库，必须通过这个"传话筒"
      preload: path.join(MAIN_DIST, 'preload.js'),
    },
  })

  // 测试消息通道（后台管家 → 界面），阶段3起会换成真实数据
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// 所有窗口关闭时退出（Mac 习惯是留着，直到 Cmd+Q）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

// Mac 点击 Dock 图标时重新开窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
