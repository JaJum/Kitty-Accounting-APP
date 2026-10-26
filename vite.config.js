import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        // 后台管家（主进程）的入口文件
        entry: 'electron/main.js',
      },
      preload: {
        // 传话筒（后台与界面之间的安全通道）
        input: path.join(__dirname, 'electron/preload.js'),
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
