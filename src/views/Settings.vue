<script setup>
// 设置：分类管理入口 + 数据自检 + 关于
import { ref, onMounted } from 'vue'
import CategoryManager from '../components/CategoryManager.vue'

const dbPath = ref('')
const billCount = ref(0)
const categoryCount = ref(0)
const result = ref('')
const showManager = ref(false)

onMounted(refreshInfo)

async function refreshInfo() {
  const info = await window.ipcRenderer.invoke('db:info')
  dbPath.value = info.dbPath
  billCount.value = info.billCount
  categoryCount.value = info.categoryCount
}

// 分类管理面板关闭后刷新数字（可能增删过分类）
async function onManagerChanged() {
  await refreshInfo()
}

// 自检：写入一条测试账单并读回
async function writeTestBill() {
  try {
    const categories = await window.ipcRenderer.invoke('category:list')
    const lunch = categories.find((c) => c.name === '午餐')
    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    await window.ipcRenderer.invoke('bill:add', {
      type: 'expense',
      amount: 1500,
      categoryId: lunch.id,
      date,
      remark: '自检测试账单',
    })
    const bills = await window.ipcRenderer.invoke('bill:list')
    billCount.value = bills.length
    const justAdded = bills[0]
    result.value = `✅ 写入并读回成功：${justAdded.parent_name}·${justAdded.category_name} ¥${(justAdded.amount / 100).toFixed(2)}`
  } catch (err) {
    result.value = `❌ 出错了：${err.message.replace(/^.*Error: /, '')}`
  }
}
</script>

<template>
  <div class="settings">
    <div class="card">
      <h3>🎨 分类管理</h3>
      <div class="row">自己新建分类（两级都可以），自建的可以改名、换图标、删除。预置分类不能改动。</div>
      <button class="btn" data-testid="open-manager" @click="showManager = true">管理分类</button>
    </div>

    <div class="card">
      <h3>📁 数据</h3>
      <div class="row">账本文件：<span class="path">{{ dbPath }}\bookkeeping.db</span></div>
      <div class="row">全部分类：{{ categoryCount }} 个　·　已有账单：{{ billCount }} 条</div>
      <button class="btn" @click="writeTestBill">数据自检（写入并读回一条测试账单）</button>
      <div class="result" v-if="result">{{ result }}</div>
    </div>

    <div class="card">
      <h3>ℹ️ 关于</h3>
      <div class="row">黑马记账 v0.1.0（开发预览版）</div>
      <div class="row">所有数据只保存在你自己的电脑上，不联网、不上传。</div>
      <div class="row">打包安装版将在阶段6提供。</div>
    </div>

    <!-- 分类管理全屏面板 -->
    <CategoryManager
      v-if="showManager"
      @close="showManager = false"
      @changed="onManagerChanged"
    />
  </div>
</template>

<style scoped>
.settings {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card {
  background: #262b36;
  border: 1px solid #303648;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card h3 { margin: 0; font-size: 16px; }
.row { font-size: 14px; color: #c3c9d6; }
.path { color: #7ea6ff; word-break: break-all; }
.btn {
  align-self: flex-start;
  padding: 9px 18px;
  font-size: 14px;
  color: #fff;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn:hover { background: #2f6fe0; }
.result { font-size: 14px; color: #9fe6a8; }
</style>
