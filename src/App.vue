<script setup>
// 阶段2：骨架欢迎页。
// 后续阶段会替换成"记一笔 / 账单 / 统计 / 设置"四个页面。
</script>

<template>
  <div class="welcome">
    <div class="logo">🐎</div>
    <h1>黑马记账</h1>
    <p class="subtitle">界面骨架已经跑通啦！</p>
    <p class="hint">下一步：接上数据库，开始记第一笔账。</p>
  </div>
</template>

<style scoped>
.welcome {
  height: 100vh;
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

.hint {
  font-size: 14px;
  color: #5c6479;
  margin: 4px 0 0;
}
</style>
