// 开发启动入口（npm run dev 会先跑这里）
// 作用：清掉 VSCode 等环境遗留的 ELECTRON_RUN_AS_NODE
//（这个变量会把 Electron 强行变成普通 Node，GUI 全开不起来），
// 然后再启动 vite 开发服务器 + Electron 窗口。
const { spawn } = require('node:child_process')
const path = require('node:path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js')
const child = spawn(process.execPath, [viteBin], {
  cwd: __dirname,
  env,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
