<script setup>
// 阶段3：数据层自检面板（阶段4会替换成真正的记账/账单页面）
import { ref, onMounted } from 'vue'

const dbPath = ref('')
const billCount = ref(0)
const categoryCount = ref(0)
const result = ref('')

onMounted(async () => {
  const info = await window.ipcRenderer.invoke('db:info')
  dbPath.value = info.dbPath
  billCount.value = info.billCount
  categoryCount.value = info.categoryCount
})

// 写入一条测试账单并读回，证明账本真的存住了
async function writeTestBill() {
  try {
    const categories = await window.ipcRenderer.invoke('category:list')
    const lunch = categories.find((c) => c.name === '午餐')

    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    await window.ipcRenderer.invoke('bill:add', {
      type: 'expense',
      amount: 1500, // ¥15.00，金额以"分"为单位
      categoryId: lunch.id,
      date,
      remark: '阶段3测试账单',
    })

    const bills = await window.ipcRenderer.invoke('bill:list')
    const justAdded = bills[0]
    billCount.value = bills.length

    result.value = `✅ 写入并读回成功：${justAdded.parent_name}·${justAdded.category_name} ¥${(justAdded.amount / 100).toFixed(2)}（${justAdded.date}）`
  } catch (err) {
    result.value = `❌ 出错了：${err.message}`
  }
}
</script>

<template>
  <div class="welcome">
    <div class="logo">🐎</div>
    <h1>黑马记账</h1>
    <p class="subtitle">数据层已经接上啦！</p>

    <div class="panel">
      <div class="row">📁 账本文件：<span class="path">{{ dbPath || '加载中…' }}\bookkeeping.db</span></div>
      <div class="row">📊 内置分类：{{ categoryCount }} 个　·　已有账单：{{ billCount }} 条</div>
      <button class="btn" @click="writeTestBill">写入测试账单</button>
      <div v-if="result" class="result">{{ result }}</div>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.logo {
  font-size: 72px;
  line-height: 1;
}

h1 {
  font-size: 42px;
  margin: 8px 0 0;
  letter-spacing: 4px;
}

.subtitle {
  font-size: 18px;
  color: #8b93a7;
  margin: 0;
}

.panel {
  margin-top: 16px;
  padding: 20px 28px;
  background: #262b36;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 640px;
}

.row {
  font-size: 14px;
  color: #c3c9d6;
}

.path {
  color: #7ea6ff;
  word-break: break-all;
}

.btn {
  align-self: flex-start;
  padding: 10px 24px;
  font-size: 15px;
  color: #fff;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn:hover {
  background: #2f6fe0;
}

.result {
  font-size: 14px;
  color: #9fe6a8;
}
</style>
