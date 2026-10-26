import Database from 'better-sqlite3'

// ============================================================
// 数据管家：负责建账本、建表、灌默认分类、账单的增删改查
// 账本文件由 main.js 传入，放在用户数据目录
// ============================================================

// 默认分类（与《产品需求文档.md》第五节一致）
// 结构：[ [一级名称, 图标, [二级名称...]], ... ]
const DEFAULT_EXPENSE = [
  ['餐饮', '🍜', ['早餐', '午餐', '晚餐', '外卖', '零食', '饮品']],
  ['交通', '🚌', ['公交地铁', '打车', '加油', '停车', '高铁机票', '汽车保养']],
  ['购物', '🛒', ['日用品', '服饰鞋包', '数码产品', '美妆护肤', '家居家装']],
  ['居住', '🏠', ['房租', '房贷', '物业费', '水电燃气', '网费话费', '维修装修']],
  ['娱乐', '🎮', ['电影演出', '游戏', '旅游', '会员订阅', '运动健身', '爱好']],
  ['医疗健康', '💊', ['门诊挂号', '药品', '体检保健', '医疗保险']],
  ['教育', '📚', ['书籍文具', '课程培训', '学费', '考试报名']],
  ['人情往来', '🎁', ['随礼', '请客', '红包', '节日礼物', '孝敬父母']],
  ['宠物', '🐱', ['宠物食品', '宠物医疗', '宠物用品', '宠物美容']],
  ['其他', '📦', ['手续费', '未分类', '其他']],
]

const DEFAULT_INCOME = [
  ['工资薪金', '💰', ['月薪', '奖金', '加班费', '补贴福利']],
  ['副业兼职', '💼', ['稿费', '兼职', '项目报酬']],
  ['投资理财', '📈', ['利息', '分红', '基金股票收益', '房租收入']],
  ['红包礼金', '🧧', ['收红包', '收礼金']],
  ['其他收入', '🎁', ['退款报销', '变卖闲置', '中奖', '其他']],
]

export function initDb(dbPath) {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // 建表（账单表、分类表、设置表）
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      parent_id  INTEGER,
      type       TEXT NOT NULL,
      icon       TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system  INTEGER NOT NULL DEFAULT 0,
      status     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bills (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      amount      INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      date        TEXT NOT NULL,
      remark      TEXT,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  seedDefaultCategories(db)

  return {
    getInfo: () => getInfo(db),
    listCategories: () => listCategories(db),
    addBill: (bill) => addBill(db, bill),
    listBills: () => listBills(db),
    deleteBill: (id) => deleteBill(db, id),
  }
}

// 首次启动：把默认分类灌进账本（只灌一次，记在 settings 表里）
function seedDefaultCategories(db) {
  const seeded = db.prepare(`SELECT value FROM settings WHERE key = 'categories_seeded'`).get()
  if (seeded) return

  const insert = db.prepare(`
    INSERT INTO categories (name, parent_id, type, icon, sort_order, is_system, status)
    VALUES (?, ?, ?, ?, ?, 1, 1)
  `)

  const seed = db.transaction(() => {
    for (const [type, groups] of [
      ['expense', DEFAULT_EXPENSE],
      ['income', DEFAULT_INCOME],
    ]) {
      let sort = 0
      for (const [name, icon, children] of groups) {
        const parent = insert.run(name, null, type, icon, sort++).lastInsertRowid
        for (const childName of children) {
          insert.run(childName, parent, type, null, sort++)
        }
      }
    }
    db.prepare(`INSERT INTO settings (key, value) VALUES ('categories_seeded', '1')`).run()
  })
  seed()
}

function getInfo(db) {
  const billCount = db.prepare('SELECT COUNT(*) AS c FROM bills').get().c
  const categoryCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c
  return { billCount, categoryCount }
}

function listCategories(db) {
  return db.prepare('SELECT * FROM categories ORDER BY id').all()
}

// 记一笔账：金额以"分"为单位存整数（如 ¥15.00 存 1500）
function addBill(db, { type, amount, categoryId, date, remark }) {
  if (type !== 'expense' && type !== 'income') {
    throw new Error('收支类型只能是"支出"或"收入"')
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('金额必须是大于 0 的数字（单位：分）')
  }
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId)
  if (!category) throw new Error('分类不存在')
  if (category.parent_id == null) throw new Error('账单必须挂在二级分类上')

  const result = db.prepare(`
    INSERT INTO bills (type, amount, category_id, date, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, amount, categoryId, date, remark ?? null)

  return db.prepare('SELECT * FROM bills WHERE id = ?').get(result.lastInsertRowid)
}

// 查看账单（带上分类名称，方便界面显示）
function listBills(db) {
  return db.prepare(`
    SELECT b.*,
           c.name AS category_name,
           p.name AS parent_name,
           p.icon AS parent_icon
    FROM bills b
    LEFT JOIN categories c ON c.id = b.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    ORDER BY b.date DESC, b.id DESC
  `).all()
}

function deleteBill(db, id) {
  const result = db.prepare('DELETE FROM bills WHERE id = ?').run(id)
  return { deleted: result.changes > 0 }
}
