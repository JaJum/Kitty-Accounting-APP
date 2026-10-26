import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app').$nextTick(() => {
  // 接收后台管家发来的测试消息（后续阶段会换成真实数据）
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})
