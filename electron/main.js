import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { initDb } from './db.js'

// 应用名字（决定用户数据目录的名字：C:\Users\你\AppData\Roaming\黑马记账\）
app.setName('黑马记账')

// 工程根目录（开发和打包后都有效）
const APP_ROOT = app.getAppPath()

process.env.APP_ROOT = APP_ROOT

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(APP_ROOT, 'public')
  : RENDERER_DIST

// 账本文件放在用户数据目录（自己家的抽屉，不是程序安装目录）
const db = initDb(path.join(app.getPath('userData'), 'bookkeeping.db'))

// 记账数据接口（界面通过传话筒调用这些"点菜窗口"）
ipcMain.handle('db:info', () => ({ ...db.getInfo(), dbPath: app.getPath('userData') }))
ipcMain.handle('category:list', () => db.listCategories())
ipcMain.handle('bill:add', (_event, bill) => db.addBill(bill))
ipcMain.handle('bill:update', (_event, id, bill) => db.updateBill(id, bill))
ipcMain.handle('bill:list', () => db.listBills())
ipcMain.handle('bill:delete', (_event, id) => db.deleteBill(id))

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
