<script setup>
// 阶段5：月度统计
// 顶部：本月支出/收入/结余 三张卡片
// 中部：分类占比环形图（手写 SVG，见 CLAUDE.md 决策8）
// 底部：近6个月收支趋势（手写 SVG 柱状图）
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({ active: Boolean })

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1) // 1-12
const bills = ref([])
const chartType = ref('expense') // 占比图看"支出"还是"收入"

onMounted(reload)
watch(() => props.active, (on) => { if (on) reload() })
async function reload() {
  bills.value = await window.ipcRenderer.invoke('bill:list')
}

const canNext = computed(() => year.value < now.getFullYear() || month.value < now.getMonth() + 1)
function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- } else { month.value-- }
}
function nextMonth() {
  if (!canNext.value) return
  if (month.value === 12) { month.value = 1; year.value++ } else { month.value++ }
}

const fmt = (cents) => (cents / 100).toFixed(2)

const monthBills = computed(() =>
  bills.value.filter((b) => b.date.startsWith(`${year.value}-${String(month.value).padStart(2, '0')}`))
)
const totalExpense = computed(() => monthBills.value.filter((b) => b.type === 'expense').reduce((s, b) => s + b.amount, 0))
const totalIncome = computed(() => monthBills.value.filter((b) => b.type === 'income').reduce((s, b) => s + b.amount, 0))
const balance = computed(() => totalIncome.value - totalExpense.value)

// ---------- 环形图：按一级分类聚合 ----------
const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b']

const groups = computed(() => {
  const map = new Map()
  for (const b of monthBills.value.filter((b) => b.type === chartType.value)) {
    const cur = map.get(b.parent_name) || { name: b.parent_name, icon: b.parent_icon, amount: 0 }
    cur.amount += b.amount
    map.set(b.parent_name, cur)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
})

const donutTotal = computed(() => groups.value.reduce((s, g) => s + g.amount, 0))

// 圆环：半径 70，周长 = 2πr ≈ 439.8；每段用 stroke-dasharray 拼出来
const R = 70
const CIRC = 2 * Math.PI * R
const segments = computed(() => {
  let acc = 0
  return groups.value.map((g, i) => {
    const frac = g.amount / donutTotal.value
    const seg = {
      ...g,
      color: COLORS[i % COLORS.length],
      dash: `${frac * CIRC} ${CIRC}`,
      offset: -acc,
      percent: (frac * 100).toFixed(1),
    }
    acc += frac * CIRC
    return seg
  })
})

// ---------- 近6个月趋势（柱状图）----------
const trend = computed(() => {
  const arr = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year.value, month.value - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const list = bills.value.filter((b) => b.date.startsWith(key))
    arr.push({
      label: `${d.getMonth() + 1}月`,
      expense: list.filter((b) => b.type === 'expense').reduce((s, b) => s + b.amount, 0),
      income: list.filter((b) => b.type === 'income').reduce((s, b) => s + b.amount, 0),
      current: i === 0,
    })
  }
  return arr
})
const trendMax = computed(() => Math.max(1, ...trend.value.map((t) => Math.max(t.expense, t.income))))
</script>

<template>
  <div class="stats">
    <!-- 月份切换 -->
    <div class="month-bar">
      <button class="nav" @click="prevMonth">‹</button>
      <div class="month-label">{{ year }}年{{ month }}月</div>
      <button class="nav" :disabled="!canNext" @click="nextMonth">›</button>
    </div>

    <!-- 三张汇总卡片 -->
    <div class="cards">
      <div class="card">
        <span>本月支出</span>
        <b class="exp">¥{{ fmt(totalExpense) }}</b>
      </div>
      <div class="card">
        <span>本月收入</span>
        <b class="inc">¥{{ fmt(totalIncome) }}</b>
      </div>
      <div class="card">
        <span>本月结余</span>
        <b :class="balance >= 0 ? 'inc' : 'exp'">{{ balance >= 0 ? '' : '-' }}¥{{ fmt(Math.abs(balance)) }}</b>
      </div>
    </div>

    <!-- 分类占比环形图 -->
    <div class="chart-card">
      <div class="chart-head">
        <span>分类占比</span>
        <div class="toggle">
          <button :class="{ on: chartType === 'expense' }" @click="chartType = 'expense'">支出</button>
          <button :class="{ on: chartType === 'income' }" @click="chartType = 'income'">收入</button>
        </div>
      </div>

      <div v-if="donutTotal === 0" class="empty-chart">
        本月没有{{ chartType === 'expense' ? '支出' : '收入' }}账单
      </div>

      <div v-else class="donut-wrap">
        <svg viewBox="0 0 180 180" class="donut">
          <circle cx="90" cy="90" :r="R" fill="none" stroke="#262b36" stroke-width="22" />
          <circle
            v-for="s in segments"
            :key="s.name"
            cx="90" cy="90" :r="R"
            fill="none"
            :stroke="s.color"
            stroke-width="22"
            :stroke-dasharray="s.dash"
            :stroke-dashoffset="s.offset"
            transform="rotate(-90 90 90)"
          />
        </svg>
        <div class="donut-center">
          <small>{{ chartType === 'expense' ? '总支出' : '总收入' }}</small>
          <b>¥{{ fmt(donutTotal) }}</b>
        </div>

        <!-- 图例 -->
        <div class="legend">
          <div class="legend-row" v-for="(s, i) in segments" :key="s.name">
            <span class="dot" :style="{ background: s.color }"></span>
            <span class="lname">{{ s.icon || '' }} {{ s.name }}</span>
            <span class="lval">¥{{ fmt(s.amount) }}</span>
            <span class="lpct">{{ s.percent }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 近6个月趋势 -->
    <div class="chart-card">
      <div class="chart-head"><span>近6个月趋势</span></div>
      <svg viewBox="0 0 600 200" class="trend">
        <!-- 基线 -->
        <line x1="20" y1="160" x2="590" y2="160" stroke="#3a4152" stroke-width="1" />
        <g v-for="(t, i) in trend" :key="t.label">
          <!-- 支出柱 -->
          <rect
            :x="55 + i * 95" :y="160 - (t.expense / trendMax) * 120"
            width="26" :height="Math.max(t.expense > 0 ? 2 : 0, (t.expense / trendMax) * 120)"
            rx="4" :fill="t.current ? '#f87171' : '#7f4a4e'"
          />
          <!-- 收入柱 -->
          <rect
            :x="84 + i * 95" :y="160 - (t.income / trendMax) * 120"
            width="26" :height="Math.max(t.income > 0 ? 2 : 0, (t.income / trendMax) * 120)"
            rx="4" :fill="t.current ? '#4ade80' : '#3d7a52'"
          />
          <text :x="77 + i * 95" y="180" text-anchor="middle" class="tlabel"
                :fill="t.current ? '#e6e8ee' : '#8b93a7'">{{ t.label }}</text>
        </g>
      </svg>
      <div class="trend-legend">
        <span><i class="dot exp-dot"></i> 支出</span>
        <span><i class="dot inc-dot"></i> 收入</span>
        <span class="hint">（颜色亮的是当前月）</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats {
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}
.nav {
  width: 36px;
  height: 36px;
  font-size: 20px;
  background: #262b36;
  border: 1px solid #3a4152;
  color: #c3c9d6;
  border-radius: 50%;
  cursor: pointer;
}
.nav:disabled { opacity: 0.3; cursor: default; }
.month-label { font-size: 17px; font-weight: bold; min-width: 110px; text-align: center; }

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.card {
  background: #262b36;
  border: 1px solid #303648;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #8b93a7;
}
.card b { font-size: 19px; color: #e6e8ee; }
.exp { color: #f87171 !important; }
.inc { color: #4ade80 !important; }

.chart-card {
  background: #262b36;
  border: 1px solid #303648;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
}
.toggle {
  display: flex;
  background: #1f2430;
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
}
.toggle button {
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8b93a7;
  font-size: 13px;
  cursor: pointer;
}
.toggle button.on { background: #3b82f6; color: #fff; }

.empty-chart {
  text-align: center;
  color: #6d7488;
  padding: 36px 0;
  font-size: 14px;
}

.donut-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.donut { width: 200px; height: 200px; }
.donut-center {
  position: absolute;
  top: 0;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
}
.donut-center small { color: #8b93a7; font-size: 13px; }
.donut-center b { font-size: 20px; }

.legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 420px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #c3c9d6;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}
.lname { flex: 1; }
.lval { color: #e6e8ee; }
.lpct { width: 52px; text-align: right; color: #8b93a7; }

.trend { width: 100%; height: auto; }
.tlabel { font-size: 14px; }
.trend-legend {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #8b93a7;
  justify-content: center;
}
.trend-legend .dot { margin-right: 4px; }
.exp-dot { background: #f87171; }
.inc-dot { background: #4ade80; }
.hint { color: #6d7488; }
</style>
