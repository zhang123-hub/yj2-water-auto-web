/**
 * 水控智联 —— 评论系统后端服务
 *
 * 职责：
 * 1. 托管 public 目录中的前端页面（HTML / CSS / JS），访问根路径即返回 index.html；
 * 2. GET  /api/comments  读取全部评论，按时间倒序返回；
 * 3. POST /api/comments  接收昵称与评论内容，生成唯一 id 和时间戳后写入 comments.json。
 *
 * 运行环境：Node.js 18+，本地与 Render 均使用同一套代码。
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const express = require('express')
const cors = require('cors')

const app = express()

// Railway 会通过环境变量注入端口；本地未设置时默认 3000
const PORT = process.env.PORT || 3000
// 显式绑定 0.0.0.0，适配 Railway 容器环境，本地同样可用
const HOST = process.env.HOST || '0.0.0.0'

// 评论数据文件：默认与 server.js 同级，首次写入时自动创建
// 如需挂载外部持久磁盘，可通过环境变量 COMMENTS_FILE 指定绝对路径
const COMMENTS_FILE = process.env.COMMENTS_FILE || path.join(__dirname, 'comments.json')

const DEFAULT_NICKNAME = '匿名访客'
const MAX_NICKNAME_LENGTH = 20
const MAX_CONTENT_LENGTH = 500

// ---------- 中间件 ----------

// 跨域配置：允许任意来源访问接口
// 这样本地 localhost 调试、GitHub Pages 前端、Railway 线上域名都能正常请求
app.use(cors())

// 解析 JSON 请求体；限制 16KB，避免超大请求占用资源
app.use(express.json({ limit: '16kb' }))

// 托管前端静态资源，访问 http://localhost:3000/ 时自动返回 public/index.html
app.use(express.static(path.join(__dirname, 'public')))

// ---------- 数据读写 ----------

/**
 * 读取评论文件
 * 文件不存在、为空或内容损坏时返回空数组，保证接口不会直接崩溃
 */
function readComments() {
  try {
    const raw = fs.readFileSync(COMMENTS_FILE, 'utf8')
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

/**
 * 写入评论文件
 * 使用同步写保证「读取-追加-写回」在一次事件循环内完成，避免并发提交互相覆盖
 */
function writeComments(list) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(list, null, 2), 'utf8')
}

// ---------- 接口 ----------

/**
 * GET /api/comments
 * 返回全部评论，按时间戳从新到旧排序（时间倒序）
 */
app.get('/api/comments', (req, res) => {
  const comments = readComments()
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  res.json(comments)
})

/**
 * POST /api/comments
 * 请求体：{ "nickname": "昵称（可留空）", "content": "评论内容" }
 * 成功后返回 201 与新生成的评论对象
 */
app.post('/api/comments', (req, res) => {
  const body = req.body || {}

  // 只接受字符串，并去除首尾空白
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  // 服务端校验：空白评论一律拒绝，防止绕过前端校验直接调接口
  if (!content) {
    return res.status(400).json({ success: false, message: '评论内容不能为空' })
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res
      .status(400)
      .json({ success: false, message: `评论内容不能超过 ${MAX_CONTENT_LENGTH} 字` })
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return res
      .status(400)
      .json({ success: false, message: `昵称不能超过 ${MAX_NICKNAME_LENGTH} 字` })
  }

  // 自动生成唯一 id 与时间戳
  const createdAt = new Date()
  const comment = {
    id: crypto.randomUUID(),
    nickname: nickname || DEFAULT_NICKNAME,
    content,
    createdAt: createdAt.toISOString(),
    timestamp: createdAt.getTime()
  }

  try {
    const comments = readComments()
    comments.push(comment)
    writeComments(comments)
  } catch (error) {
    console.error('[comments] 写入 comments.json 失败：', error)
    return res.status(500).json({ success: false, message: '评论保存失败，请稍后重试' })
  }

  res.status(201).json({ success: true, comment })
})

// ---------- 启动 ----------

// 监听 0.0.0.0:PORT，适配 Railway 容器网络；本地开发同样可用
app.listen(PORT, HOST, () => {
  console.log(`服务已启动：http://localhost:${PORT}`)
  console.log(`评论接口：GET/POST http://localhost:${PORT}/api/comments`)
})
