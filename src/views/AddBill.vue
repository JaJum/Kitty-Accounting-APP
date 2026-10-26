<script setup>
// 记一笔：切换收支 → 点分类 → 数字键盘输金额 →（改日期/写备注）→ 保存
import { ref, computed, onMounted, watch } from 'vue'

const type = ref('expense') // expense=支出 / income=收入
const amountStr = ref('') // 用户输入的金额原文，如 "15.5"
const parents = ref([]) // 当前收支类型的一级分类
const activeParent = ref(null) // 选中的一级分类
const childCat = ref(null) // 选中的二级分类
const date = ref(todayStr())
const remark = ref('')
const tip = ref('') // 操作提示
const categories = ref([])

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadCategories() {
  categories.value = await window.ipcRenderer.invoke('category:list')
  refreshParents()
}

function refreshParents() {
  parents.value = categories.value.filter(
    (c) => c.type === type.value && c.parent_id == null && c.status === 1
  )
  if (!parents.value.find((p) => p.id === activeParent.value?.id)) {
    activeParent.value = parents.value[0] ?? null
  }
  if (childCat.value && childCat.value.parent_id !== activeParent.value?.id) {
    childCat.value = null
  }
}

const children = computed(() =>
  activeParent.value
    ? categories.value.filter((c) => c.parent_id === activeParent.value.id && c.status === 1)
    : []
)

// 切换 支出/收入，分类跟着换
watch(type, refreshParents)

const amountCents = computed(() => Math.round(parseFloat(amountStr.value || '0') * 100))
const amountValid = computed(() => amountStr.value !== '' && !Number.isNaN(amountCents.value) && amountCents.value > 0)

// 数字键盘：输入一位字符
function press(key) {
  tip.value = ''
  if (key === 'del') {
    amountStr.value = amountStr.value.slice(0, -1)
    return
  }
  if (key === '.' && amountStr.value.includes('.')) return
  // 限制两位小数
  const dot = amountStr.value.indexOf('.')
  if (dot >= 0 && amountStr.value.length - dot > 2) return
  if (amountStr.value.replace('.', '').length >= 9) return // 最多9位数字
  amountStr.value += key
}

async function save() {
  if (!amountValid.value) return tip.value = '请先输入金额'
  if (!childCat.value) return tip.value = '请选择二级分类'
  try {
    await window.ipcRenderer.invoke('bill:add', {
      type: type.value,
      amount: amountCents.value,
      categoryId: childCat.value.id,
      date: date.value,
      remark: remark.value.trim() || null,
    })
    tip.value = `✅ 已保存：${type.value === 'expense' ? '支出' : '收入'} ¥${(amountCents.value / 100).toFixed(2)}`
    amountStr.value = ''
    remark.value = ''
  } catch (err) {
    tip.value = `❌ ${err.message.replace(/^.*Error: /, '')}`
  }
}

onMounted(loadCategories)
</script>

<template>
  <div class="add-bill">
    <!-- 支出 / 收入 切换 -->
    <div class="segment">
      <button :class="{ on: type === 'expense' }" @click="type = 'expense'">支出</button>
      <button :class="{ on: type === 'income' }" @click="type = 'income'">收入</button>
    </div>

    <!-- 金额显示 -->
    <div class="amount" :class="{ expense: type === 'expense', income: type === 'income' }">
      <span class="cny">¥</span>{{ amountStr || '0.00' }}
    </div>

    <!-- 分类：先选一级，再点二级 -->
    <div class="parents">
      <button
        v-for="p in parents"
        :key="p.id"
        class="parent-chip"
        :class="{ on: activeParent?.id === p.id }"
        @click="activeParent = p"
      >{{ p.icon }} {{ p.name }}</button>
    </div>
    <div class="children">
      <button
        v-for="c in children"
        :key="c.id"
        class="child-chip"
        :class="{ on: childCat?.id === c.id }"
        @click="childCat = c"
      >{{ c.name }}</button>
    </div>

    <!-- 数字键盘 -->
    <div class="numpad">
      <button v-for="k in ['7','8','9','4','5','6','1','2','3','.','0','del']"
              :key="k" class="key" @click="press(k)">{{ k === 'del' ? '⌫' : k }}</button>
    </div>

    <!-- 日期 / 备注 / 保存 -->
    <div class="form-row">
      <label>日期 <input type="date" v-model="date" /></label>
      <label class="remark">备注 <input type="text" v-model="remark" maxlength="50" placeholder="这笔钱花在哪（可不填）" /></label>
    </div>

    <button class="save" @click="save">保 存</button>
    <div class="tip">{{ tip }}</div>
  </div>
</template>

<style scoped>
.add-bill {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
  margin: 0 auto;
  width: 100%;
}

.segment {
  display: flex;
  background: #262b36;
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
}
.segment button {
  flex: 1;
  padding: 10px 0;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8b93a7;
  cursor: pointer;
}
.segment button.on {
  background: #3b82f6;
  color: #fff;
  font-weight: bold;
}

.amount {
  text-align: center;
  font-size: 44px;
  font-weight: bold;
  padding: 8px 0;
  color: #e6e8ee;
}
.amount.expense { color: #f87171; }
.amount.income { color: #4ade80; }
.amount .cny { font-size: 24px; margin-right: 4px; }

.parents {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none; /* 隐藏横向滚动条，滑动仍然可用 */
}
.parents::-webkit-scrollbar { display: none; }
.parent-chip {
  flex-shrink: 0;
  padding: 7px 14px;
  border: 1px solid #3a4152;
  background: #262b36;
  color: #c3c9d6;
  border-radius: 18px;
  cursor: pointer;
  font-size: 14px;
}
.parent-chip.on { background: #3b82f6; border-color: #3b82f6; color: #fff; }

.children {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.child-chip {
  padding: 10px 0;
  background: #262b36;
  border: 1px solid #3a4152;
  color: #c3c9d6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.child-chip.on { background: #2f6fe0; border-color: #3b82f6; color: #fff; }

.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.key {
  padding: 13px 0;
  font-size: 20px;
  background: #262b36;
  border: 1px solid #3a4152;
  color: #e6e8ee;
  border-radius: 8px;
  cursor: pointer;
}
.key:hover { background: #303648; }

.form-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form-row label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #8b93a7;
}
.form-row input {
  flex: 1;
  padding: 9px 12px;
  background: #262b36;
  border: 1px solid #3a4152;
  border-radius: 8px;
  color: #e6e8ee;
  font-size: 14px;
}
.form-row input[type='date'] { max-width: 170px; }

.save {
  padding: 13px 0;
  font-size: 17px;
  font-weight: bold;
  color: #fff;
  background: #3b82f6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}
.save:hover { background: #2f6fe0; }

.tip {
  min-height: 20px;
  text-align: center;
  font-size: 14px;
  color: #9fe6a8;
}
</style>
