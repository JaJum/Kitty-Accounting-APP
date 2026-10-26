<script setup>
// 账单列表：按月浏览、按天分组、点条目编辑/删除
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({ active: Boolean }) // 是否显示在当前标签
const emit = defineEmits(['go-add'])

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1) // 1-12
const bills = ref([])
const categories = ref([])

// 编辑弹窗状态
const editing = ref(null) // 正在编辑的账单副本
const confirmDelete = ref(false) // 是否处于"确认删除"状态
const tip = ref('')
const editChild = ref(null)
const editParent = ref(null)

async function reload() {
  bills.value = await window.ipcRenderer.invoke('bill:list')
  categories.value = await window.ipcRenderer.invoke('category:list')
}

onMounted(reload)
// 切回"账单"标签时刷新（记了一笔新账后）
watch(() => props.active, (on) => { if (on) reload() })

const monthBills = computed(() =>
  bills.value.filter((b) => b.date.startsWith(`${year.value}-${String(month.value).padStart(2, '0')}`))
)

const totalExpense = computed(() => monthBills.value.filter((b) => b.type === 'expense').reduce((s, b) => s + b.amount, 0))
const totalIncome = computed(() => monthBills.value.filter((b) => b.type === 'income').reduce((s, b) => s + b.amount, 0))

// 按日期分组（日期倒序）
const groups = computed(() => {
  const map = new Map()
  for (const b of monthBills.value) {
    if (!map.has(b.date)) map.set(b.date, [])
    map.get(b.date).push(b)
  }
  return [...map.entries()].map(([date, list]) => ({ date, list }))
})

const canNext = computed(() => year.value < now.getFullYear() || month.value < now.getMonth() + 1)
function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- } else { month.value-- }
}
function nextMonth() {
  if (!canNext.value) return
  if (month.value === 12) { month.value = 1; year.value++ } else { month.value++ }
}

const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function dateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日 ${weekNames[new Date(y, m - 1, d).getDay()]}`
}
const fmt = (cents) => (cents / 100).toFixed(2)

// 打开编辑弹窗（通过账单挂的二级分类，反推它的一级分类）
function openEdit(bill) {
  editing.value = { ...bill, amountText: (bill.amount / 100).toFixed(2) }
  confirmDelete.value = false
  tip.value = ''
  const child = categories.value.find((c) => c.id === bill.category_id)
  editChild.value = child ?? null
  editParent.value = (child && categories.value.find((c) => c.id === child.parent_id)) || null
}

// 改类型 / 改一级分类时，二级跟着重置到第一个
function onChangeType() {
  editParent.value = editParents.value[0] ?? null
  editChild.value = editChildren.value[0] ?? null
}
function onChangeParent() {
  editChild.value = editChildren.value[0] ?? null
}

const editParents = computed(() =>
  categories.value.filter((c) => c.type === editing.value?.type && c.parent_id == null && c.status === 1)
)
const editChildren = computed(() =>
  editParent.value ? categories.value.filter((c) => c.parent_id === editParent.value.id && c.status === 1) : []
)

async function saveEdit() {
  const cents = Math.round(parseFloat(editing.value.amountText) * 100)
  if (Number.isNaN(cents) || cents <= 0) return (tip.value = '金额要大于 0')
  if (!editChild.value) return (tip.value = '请选择二级分类')
  try {
    await window.ipcRenderer.invoke('bill:update', editing.value.id, {
      type: editing.value.type,
      amount: cents,
      categoryId: editChild.value.id,
      date: editing.value.date,
      remark: editing.value.remark?.trim() || null,
    })
    editing.value = null
    await reload()
  } catch (err) {
    tip.value = `❌ ${err.message.replace(/^.*Error: /, '')}`
  }
}

async function doDelete() {
  await window.ipcRenderer.invoke('bill:delete', editing.value.id)
  editing.value = null
  await reload()
}
</script>

<template>
  <div class="bill-list">
    <!-- 月份切换 + 汇总 -->
    <div class="month-bar">
      <button class="nav" @click="prevMonth">‹</button>
      <div class="month-label">{{ year }}年{{ month }}月</div>
      <button class="nav" :disabled="!canNext" @click="nextMonth">›</button>
    </div>
    <div class="totals">
      <span class="exp">支出 ¥{{ fmt(totalExpense) }}</span>
      <span class="inc">收入 ¥{{ fmt(totalIncome) }}</span>
    </div>

    <!-- 空状态 -->
    <div v-if="groups.length === 0" class="empty">
      这个月还没有账单<br />
      <button class="go-add" @click="emit('go-add')">去记一笔 →</button>
    </div>

    <!-- 按日期分组 -->
    <div v-for="g in groups" :key="g.date" class="group">
      <div class="group-head">
        {{ dateLabel(g.date) }}
        <span class="group-sum">
          支出 ¥{{ fmt(g.list.filter(b => b.type === 'expense').reduce((s, b) => s + b.amount, 0)) }}
        </span>
      </div>
      <div class="row" v-for="b in g.list" :key="b.id" @click="openEdit(b)">
        <span class="icon">{{ b.parent_icon || '📦' }}</span>
        <span class="cat">{{ b.parent_name }}·{{ b.category_name }}</span>
        <span class="rmk">{{ b.remark || '' }}</span>
        <span class="val" :class="b.type">
          {{ b.type === 'expense' ? '-' : '+' }}¥{{ fmt(b.amount) }}
        </span>
      </div>
    </div>

    <!-- 编辑 / 删除 弹窗 -->
    <div class="mask" v-if="editing" @click.self="editing = null">
      <div class="modal">
        <template v-if="!confirmDelete">
          <h3>编辑账单</h3>
          <label>金额 <input v-model="editing.amountText" type="text" inputmode="decimal" /></label>
          <label>类型
            <select v-model="editing.type" @change="onChangeType">
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </label>
          <label>分类
            <select v-model="editParent" @change="onChangeParent">
              <option v-for="p in editParents" :key="p.id" :value="p">{{ p.icon }} {{ p.name }}</option>
            </select>
            <select v-model="editChild">
              <option v-for="c in editChildren" :key="c.id" :value="c">{{ c.name }}</option>
            </select>
          </label>
          <label>日期 <input v-model="editing.date" type="date" /></label>
          <label>备注 <input v-model="editing.remark" type="text" maxlength="50" /></label>
          <div class="tip">{{ tip }}</div>
          <div class="modal-btns">
            <button class="danger" @click="confirmDelete = true">删除</button>
            <button class="ghost" @click="editing = null">取消</button>
            <button class="primary" @click="saveEdit">保存修改</button>
          </div>
        </template>
        <template v-else>
          <h3>确认删除？</h3>
          <p class="confirm-text">
            将删除：{{ editing.parent_name }}·{{ editing.category_name }} ¥{{ fmt(editing.amount) }}<br />
            <small>删除后无法恢复</small>
          </p>
          <div class="modal-btns">
            <button class="ghost" @click="confirmDelete = false">取消</button>
            <button class="danger" @click="doDelete">确认删除</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bill-list {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.totals {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
}
.totals .exp { color: #f87171; }
.totals .inc { color: #4ade80; }

.empty {
  text-align: center;
  color: #8b93a7;
  padding: 60px 0;
  font-size: 15px;
}
.go-add {
  margin-top: 14px;
  padding: 9px 22px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.group { display: flex; flex-direction: column; }
.group-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #8b93a7;
  padding: 8px 4px 4px;
}
.group-sum { color: #f87171; }

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #262b36;
  border: 1px solid #303648;
  border-radius: 10px;
  margin-bottom: 6px;
  cursor: pointer;
}
.row:hover { background: #2c3240; }
.icon { font-size: 20px; }
.cat { font-size: 14px; color: #e6e8ee; white-space: nowrap; }
.rmk { font-size: 13px; color: #6d7488; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.val { font-size: 16px; font-weight: bold; white-space: nowrap; }
.val.expense { color: #f87171; }
.val.income { color: #4ade80; }

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  width: min(440px, calc(100vw - 40px));
  background: #1f2430;
  border: 1px solid #3a4152;
  border-radius: 14px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal h3 { margin: 0 0 4px; font-size: 18px; }
.modal label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #8b93a7;
}
.modal input, .modal select {
  flex: 1;
  padding: 8px 10px;
  background: #262b36;
  border: 1px solid #3a4152;
  border-radius: 8px;
  color: #e6e8ee;
  font-size: 14px;
}
.modal select { min-width: 0; }
.tip { min-height: 16px; font-size: 13px; color: #fca5a5; }
.confirm-text { font-size: 15px; line-height: 1.7; color: #c3c9d6; }
.confirm-text small { color: #f87171; }

.modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
.modal-btns button {
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.primary { background: #3b82f6; color: #fff; }
.ghost { background: #303648; color: #c3c9d6; }
.danger { background: #dc2626; color: #fff; }
</style>
