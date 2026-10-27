/**
 * 访客评论区前端逻辑（网页大赛答辩可重点讲解本文件）
 *
 * 数据流：
 * 1. 页面加载完成后调用 loadComments()，通过 GET /api/comments 拉取全部评论；
 * 2. 表单提交时先在浏览器端做非空 / 长度校验，再 POST /api/comments 写入后端；
 * 3. 提交成功后重新调用 loadComments()，实现"提交后自动刷新列表"。
 *
 * 接口地址说明：
 * - 默认使用相对路径 /api/comments，因为 Express 同时托管 public 静态页面，前后端同源；
 * - 若前端单独部署（例如 GitHub Pages）、接口部署在 Render，可在引入本文件之前设置：
 *     window.COMMENTS_API_URL = 'https://你的服务名.onrender.com/api/comments'
 *   此时后端已开启 CORS，跨域请求同样可以正常访问。
 */
;(function () {
  'use strict'

  var API_URL = window.COMMENTS_API_URL || '/api/comments'
  var MAX_CONTENT_LENGTH = 500
  var MAX_NICKNAME_LENGTH = 20
  var DEFAULT_NICKNAME = '匿名访客'

  // 页面元素引用
  var form = document.getElementById('comment-form')
  var nicknameInput = document.getElementById('comment-nickname')
  var contentInput = document.getElementById('comment-content')
  var submitButton = document.getElementById('comment-submit')
  var hint = document.getElementById('comment-hint')
  var statusText = document.getElementById('comments-status')
  var countText = document.getElementById('comments-count')
  var list = document.getElementById('comments-list')
  var emptyText = document.getElementById('comments-empty')

  if (!form || !list) return // 页面中不存在评论区时直接退出，避免报错

  var DEFAULT_HINT = hint.textContent

  /** 设置表单下方的提示文案（isError 控制红色错误样式） */
  function setHint(message, type) {
    hint.textContent = message || DEFAULT_HINT
    hint.className = 'comments__hint'
    if (type === 'error') hint.className += ' comments__hint--error'
    if (type === 'ok') hint.className += ' comments__hint--ok'
  }

  /** 设置列表上方的状态文案 */
  function setStatus(message, isError) {
    statusText.textContent = message || ''
    statusText.className = 'comments__status' + (isError ? ' comments__status--error' : '')
  }

  /** 将 ISO 时间字符串格式化为「2026-10-27 15:30」 */
  function formatTime(value) {
    var date = new Date(value)
    if (isNaN(date.getTime())) return ''
    return date
      .toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      .replace(/\//g, '-')
  }

  /**
   * 渲染评论列表
   * 使用 textContent 写入用户内容，浏览器会自动转义，天然避免 XSS 注入。
   */
  function renderComments(comments) {
    list.textContent = ''
    countText.textContent = String(comments.length)
    emptyText.hidden = comments.length > 0

    comments.forEach(function (comment) {
      var item = document.createElement('li')
      item.className = 'comments__item'

      // 头像：取昵称首字符
      var avatar = document.createElement('div')
      avatar.className = 'comments__avatar'
      avatar.setAttribute('aria-hidden', 'true')
      avatar.textContent = (comment.nickname || DEFAULT_NICKNAME).slice(0, 1)

      var body = document.createElement('div')
      body.className = 'comments__body'

      var meta = document.createElement('div')
      meta.className = 'comments__meta'

      var nick = document.createElement('span')
      nick.className = 'comments__nick'
      nick.textContent = comment.nickname || DEFAULT_NICKNAME

      var time = document.createElement('time')
      time.className = 'comments__time'
      time.dateTime = comment.createdAt || ''
      time.textContent = formatTime(comment.createdAt)

      var text = document.createElement('p')
      text.className = 'comments__text'
      text.textContent = comment.content || ''

      meta.appendChild(nick)
      meta.appendChild(time)
      body.appendChild(meta)
      body.appendChild(text)
      item.appendChild(avatar)
      item.appendChild(body)
      list.appendChild(item)
    })
  }

  /** 拉取全部评论（后端已按时间倒序返回） */
  async function loadComments() {
    setStatus('正在加载评论…')
    try {
      var response = await fetch(API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      })
      if (!response.ok) throw new Error('接口返回状态码 ' + response.status)
      var data = await response.json()
      var comments = Array.isArray(data) ? data : []
      renderComments(comments)
      setStatus('')
    } catch (error) {
      setStatus('评论加载失败，请确认后端服务已启动', true)
      console.error('[comments] 加载失败：', error)
    }
  }

  /** 提交表单：校验 → POST → 重新拉取列表 */
  form.addEventListener('submit', async function (event) {
    event.preventDefault()

    var nickname = nicknameInput.value.trim()
    var content = contentInput.value.trim()

    // 前端校验：空白内容直接拦截，不发请求
    if (!content) {
      setHint('评论内容不能为空', 'error')
      contentInput.focus()
      return
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setHint('评论内容不能超过 ' + MAX_CONTENT_LENGTH + ' 字', 'error')
      return
    }
    if (nickname.length > MAX_NICKNAME_LENGTH) {
      setHint('昵称不能超过 ' + MAX_NICKNAME_LENGTH + ' 字', 'error')
      return
    }

    submitButton.disabled = true
    submitButton.textContent = '提交中…'
    setHint('')

    try {
      var response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname,
          content: content
        })
      })
      var result = await response.json().catch(function () {
        return {}
      })

      if (!response.ok) {
        throw new Error(result.message || '评论提交失败')
      }

      contentInput.value = ''
      setHint('提交成功，评论已同步到云端', 'ok')
      await loadComments()
    } catch (error) {
      setHint(error.message || '网络异常，请稍后重试', 'error')
    } finally {
      submitButton.disabled = false
      submitButton.textContent = '提交评论'
    }
  })

  // 页面加载后自动拉取评论
  loadComments()
})()
