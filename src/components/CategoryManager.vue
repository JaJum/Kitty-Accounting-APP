<script setup>
// 分类管理面板（V1.1）：从设置页打开的全屏弹层
// 规则：预置分类锁死不可改删；自建分类可改名/换图标/删除；两级都能自建
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['close', 'changed'])

const categories = ref([])
const typeTab = ref('expense') // expense=支出 / income=收入

// 新建/编辑表单
const showForm = ref(false)
const formMode = ref('add-parent') // add-parent / add-child / edit
const form = ref({ id: null, name: '', icon: '📦', parentId: null })
const formError = ref('')

// 删除确认框
const showConfirm = ref(false)
const confirmTarget = ref(null)
const confirmError = ref('')

// 新建分类时可挑的表情（统一从这里选，界面风格一致）
const EMOJIS = [
  '🍜', '🍚', '🍔', '🥟', '🍰', '🧋', '☕', '🥤',
  '🍺', '🥛', '🚌', '🚇', '🚕', '🚗', '✈️', '🚲',
  '🚄', '🛒', '👗', '👟', '💻', '💄', '🎁', '📦',
  '🧧', '🏠', '🔌', '🚿', '🛋️', '🔑', '🎮', '🎬',
  '🎤', '⚽', '🎯', '🏖️', '🎣', '🎨', '💊', '🏥',
  '🩺', '📚', '✏️', '🎓', '🐶', '🐱', '🐟', '🐹',
  '💰', '💼', '📈', '💸', '🧾', '🎂', '🌱', '❓',
]

const parents = computed(() =>
  categories.value.filter((c) => c.type === typeTab.value && c.parent_id == null))

function childrenOf(parentId) {
  return categories.value.filter((c) => c.parent_id === parentId)
}

onMounted(load)

async function load() {
  categories.value = await window.ipcRenderer.invoke('category:list')
}

function close() {
  emit('close')
}

function switchType(t) {
  typeTab.value = t
}

// ---------- 表单 ----------
function openAddParent() {
  formMode.value = 'add-parent'
  form.value = { id: null, name: '', icon: '📦', parentId: null }
  formError.value = ''
  showForm.value = true
}

function openAddChild(parent) {
  formMode.value = 'add-child'
  form.value = { id: null, name: '', icon: null, parentId: parent.id }
  formError.value = ''
  showForm.value = true
}

function openEdit(cat) {
  formMode.value = 'edit'
  form.value = { id: cat.id, name: cat.name, icon: cat.icon || '📦', parentId: cat.parent_id }
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function formTitle() {
  if (formMode.value === 'add-parent') return '新建大类'
  if (formMode.value === 'add-child') return '新建小类'
  return '修改分类'
}

// 大类才有图标；小类不用
function formShowsIcon() {
  return formMode.value === 'add-parent' || (formMode.value === 'edit' && form.value.parentId == null)
}

function parentInfo() {
  if (formMode.value !== 'add-child') return null
  return categories.value.find((c) => c.id === form.value.parentId) || null
}

async function saveForm() {
  formError.value = ''
  try {
    if (formMode.value === 'edit') {
      await window.ipcRenderer.invoke('category:update', form.value.id, {
        name: form.value.name,
        icon: form.value.parentId == null ? form.value.icon : null,
      })
    } else {
      await window.ipcRenderer.invoke('category:add', {
        type: typeTab.value,
        name: form.value.name,
        parentId: form.value.parentId,
        icon: formMode.value === 'add-parent' ? form.value.icon : null,
      })
    }
    showForm.value = false
    await load()
    emit('changed')
  } catch (err) {
    formError.value = String(err.message || err).replace(/^Error invoking remote method '[^']+': Error: /, '')
  }
}

// ---------- 删除 ----------
function askDelete(cat) {
  confirmTarget.value = cat
  confirmError.value = ''
  showConfirm.value = true
}

function closeConfirm() {
  showConfirm.value = false
  confirmTarget.value = null
}

function confirmMessage() {
  const cat = confirmTarget.value
  if (!cat) return ''
  const fallback = cat.type === 'expense' ? '其他·未分类' : '其他收入·其他'
  const childNote = cat.parent_id == null && childrenOf(cat.id).length > 0
    ? `它是大类，下面 ${childrenOf(cat.id).length} 个小类也会一起删除。`
    : ''
  return `「${cat.name}」删除后，名下已有的账单会自动归入「${fallback}」，账单不会丢失。${childNote}确定要删吗？`
}

async function confirmDelete() {
  confirmError.value = ''
  try {
    await window.ipcRenderer.invoke('category:delete', confirmTarget.value.id)
    showConfirm.value = false
    confirmTarget.value = null
    await load()
    emit('changed')
  } catch (err) {
    confirmError.value = String(err.message || err).replace(/^Error invoking remote method '[^']+': Error: /, '')
  }
}
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <!-- 标题栏 -->
      <div class="head">
        <div>
          <div class="title">分类管理</div>
          <div class="tip">预置分类不能改；自建分类可改名、换图标、删除。两级都可以自己建。</div>
        </div>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <!-- 支出 / 收入 切换 -->
      <div class="types">
        <button class="type-btn" :class="{ on: typeTab === 'expense' }" @click="switchType('expense')">支出</button>
        <button class="type-btn" :class="{ on: typeTab === 'income' }" @click="switchType('income')">收入</button>
      </div>

      <!-- 分类列表 -->
      <div class="list">
        <div v-for="p in parents" :key="p.id" class="parent-block">
          <div class="parent-row">
            <span class="p-name">{{ p.icon }} {{ p.name }}</span>
            <span class="badge" :class="p.is_system ? 'sys' : 'mine'">{{ p.is_system ? '预置' : '自建' }}</span>
            <span class="ops">
              <button v-if="!p.is_system" class="op" @click="openEdit(p)">改名/图标</button>
              <button v-if="!p.is_system" class="op danger" @click="askDelete(p)">删除</button>
            </span>
          </div>
          <div class="children">
            <span v-for="c in childrenOf(p.id)" :key="c.id" class="child">
              {{ c.name }}
              <template v-if="!c.is_system">
                <button class="op mini" @click="openEdit(c)">改</button>
                <button class="op mini danger" @click="askDelete(c)">删</button>
              </template>
            </span>
            <button class="add-child" @click="openAddChild(p)">＋ 小类</button>
          </div>
        </div>

        <button class="add-parent" @click="openAddParent">＋ 新建大类</button>
      </div>
    </div>

    <!-- 新建/编辑表单 -->
    <div v-if="showForm" class="modal-mask">
      <div class="modal">
        <div class="modal-title">{{ formTitle() }}</div>

        <div v-if="parentInfo()" class="form-info">将添加到：{{ parentInfo().icon }} {{ parentInfo().name }}</div>

        <input
          v-model="form.name"
          class="input"
          maxlength="8"
          placeholder="分类名称（最多8个字）"
          data-testid="cat-name"
        />

        <div v-if="formShowsIcon()" class="emoji-title">选个图标</div>
        <div v-if="formShowsIcon()" class="emojis">
          <button
            v-for="e in EMOJIS"
            :key="e"
            class="emoji"
            :class="{ on: form.icon === e }"
            @click="form.icon = e"
          >{{ e }}</button>
        </div>

        <div v-if="formError" class="error">{{ formError }}</div>

        <div class="modal-ops">
          <button class="btn ghost" @click="closeForm">取消</button>
          <button class="btn primary" data-testid="cat-save" @click="saveForm">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="showConfirm" class="modal-mask">
      <div class="modal">
        <div class="modal-title">删除分类</div>
        <div class="confirm-text">{{ confirmMessage() }}</div>
        <div v-if="confirmError" class="error">{{ confirmError }}</div>
        <div class="modal-ops">
          <button class="btn ghost" @click="closeConfirm">再想想</button>
          <button class="btn danger-solid" data-testid="cat-delete-yes" @click="confirmDelete">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: #12151c;
  z-index: 50;
  display: flex;
  justify-content: center;
  overflow-y: auto;
}
.panel {
  width: 100%;
  max-width: 720px;
  padding: 18px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.title { font-size: 20px; font-weight: bold; color: #eef1f7; }
.tip { font-size: 12px; color: #8b93a7; margin-top: 4px; }
.close-btn {
  background: none;
  border: 1px solid #303648;
  color: #c3c9d6;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}
.close-btn:hover { background: #262b36; }

.types { display: flex; gap: 8px; }
.type-btn {
  padding: 8px 22px;
  border-radius: 8px;
  border: 1px solid #303648;
  background: #1a1e27;
  color: #8b93a7;
  font-size: 14px;
  cursor: pointer;
}
.type-btn.on { background: #3b82f6; border-color: #3b82f6; color: #fff; font-weight: bold; }

.list { display: flex; flex-direction: column; gap: 10px; }
.parent-block {
  background: #262b36;
  border: 1px solid #303648;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.parent-row { display: flex; align-items: center; gap: 8px; }
.p-name { font-size: 15px; color: #eef1f7; font-weight: bold; }
.badge {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 20px;
}
.badge.sys { background: #303648; color: #8b93a7; }
.badge.mine { background: #1d3a2a; color: #9fe6a8; }
.ops { margin-left: auto; display: flex; gap: 6px; }
.op {
  background: none;
  border: 1px solid #3a4157;
  color: #9fb4dd;
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
}
.op:hover { background: #303648; }
.op.danger { color: #f2a2a2; border-color: #5a3a3a; }
.op.danger:hover { background: #3a2626; }
.op.mini { padding: 1px 6px; font-size: 11px; }

.children { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.child {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #1a1e27;
  border: 1px solid #303648;
  color: #c3c9d6;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 20px;
}
.add-child {
  background: none;
  border: 1px dashed #3a4157;
  color: #8b93a7;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
}
.add-child:hover { color: #7ea6ff; border-color: #7ea6ff; }

.add-parent {
  background: none;
  border: 1px dashed #3a4157;
  color: #8b93a7;
  font-size: 14px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
}
.add-parent:hover { color: #7ea6ff; border-color: #7ea6ff; }

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.modal {
  width: 360px;
  max-width: 92vw;
  background: #262b36;
  border: 1px solid #3a4157;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-title { font-size: 16px; font-weight: bold; color: #eef1f7; }
.form-info { font-size: 13px; color: #8b93a7; }
.input {
  background: #1a1e27;
  border: 1px solid #3a4157;
  border-radius: 8px;
  color: #eef1f7;
  font-size: 15px;
  padding: 9px 12px;
  outline: none;
}
.input:focus { border-color: #3b82f6; }
.emoji-title { font-size: 13px; color: #8b93a7; }
.emojis {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  max-height: 130px;
  overflow-y: auto;
}
.emoji {
  font-size: 18px;
  padding: 5px 0;
  background: #1a1e27;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}
.emoji.on { border-color: #3b82f6; background: #1d2a44; }
.error { font-size: 13px; color: #f2a2a2; }
.confirm-text { font-size: 14px; color: #c3c9d6; line-height: 1.6; }
.modal-ops { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
}
.btn.ghost { background: #1a1e27; color: #c3c9d6; border: 1px solid #3a4157; }
.btn.primary { background: #3b82f6; color: #fff; }
.btn.primary:hover { background: #2f6fe0; }
.btn.danger-solid { background: #d9534f; color: #fff; }
.btn.danger-solid:hover { background: #c4433f; }
</style>
