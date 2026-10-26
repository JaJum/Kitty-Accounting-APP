<script setup>
// 阶段5：月度统计（汇总 + 分类占比图），现在是占位
</script>

<template>
  <div class="stats">
    <div class="placeholder">
      <div class="big">📊</div>
      <p>月度统计</p>
      <small>阶段5 见 —— 这里将显示本月支出/收入/结余和分类占比图</small>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}
.placeholder {
  text-align: center;
  color: #8b93a7;
}
.big { font-size: 60px; }
.placeholder p { font-size: 18px; margin: 12px 0 6px; }
.placeholder small { color: #6d7488; }
</style>
