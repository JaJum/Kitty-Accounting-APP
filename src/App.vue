<script setup>
// 主框架：底部 4 个标签切换页面（简单标签切换，见 CLAUDE.md 决策7）
import { ref } from 'vue'
import AddBill from './views/AddBill.vue'
import BillList from './views/BillList.vue'
import Stats from './views/Stats.vue'
import Settings from './views/Settings.vue'

const activeTab = ref('add') // add=记一笔 / list=账单 / stats=统计 / settings=设置

const tabs = [
  { key: 'add', icon: '✏️', label: '记一笔' },
  { key: 'list', icon: '📋', label: '账单' },
  { key: 'stats', icon: '📊', label: '统计' },
  { key: 'settings', icon: '⚙️', label: '设置' },
]
</script>

<template>
  <div class="app">
    <main class="content">
      <AddBill v-show="activeTab === 'add'" />
      <BillList v-show="activeTab === 'list'" :active="activeTab === 'list'" @go-add="activeTab = 'add'" />
      <Stats v-show="activeTab === 'stats'" />
      <Settings v-show="activeTab === 'settings'" />
    </main>

    <nav class="tabbar">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ on: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px 12px;
}
.tabbar {
  display: flex;
  border-top: 1px solid #303648;
  background: #1a1e27;
  padding: 6px 0 8px;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  background: none;
  border: none;
  color: #6d7488;
  font-size: 12px;
  cursor: pointer;
}
.tab-icon { font-size: 22px; }
.tab.on { color: #3b82f6; font-weight: bold; }
</style>
