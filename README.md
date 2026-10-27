# yj2-water-auto-web

河海大学网页设计大赛参赛作品
队伍：YJ²
成员：张庆元、顾杰、祝仕杰

## 项目主题

水利自动化监测平台动态网页。
以智慧水库水位监测、闸门自动化调度为核心，页面搭载粒子动效，内置【守护水位】交互小游戏。

小游戏玩法：拖动泄洪闸门承接雨滴，控制水库水位维持在安全区间，模拟防汛调度自动化闭环。

## 技术栈

- 前端：HTML + CSS + 原生 JavaScript（页面主体为 React 构建产物，单文件内联，离线可运行）
- 后端：Node.js + Express
- 数据：`comments.json` 文件持久化，实现跨设备共享评论
- 部署：Replit（Node.js Repl）

## 功能

- 水利自动化数据可视化面板
- 动态粒子背景
- 弹窗式小游戏「守护水位」
- 响应交互动画
- **跨设备共享评论区**：评论写入服务器，任何设备打开页面都能看到同一份评论

## 目录结构

```
.
├── .replit            # Replit 运行配置，确保一键 Run 即可启动
├── server.js          # Express 服务入口：静态托管 + 评论接口
├── package.json       # 依赖与启动命令
├── comments.json      # 评论数据文件（服务运行时自动读写）
├── public/            # 所有前端页面资源
│   ├── index.html     # 单页前端（含原有监测平台、守护水位小游戏）
│   ├── comments.css   # 评论区样式（跟随页面深浅色主题）
│   └── comments.js    # 评论区前端逻辑：拉取、校验、提交、刷新
└── README.md
```

## 评论系统接口

### GET /api/comments

获取全部评论，按时间倒序返回（最新在前）。响应为 JSON 数组：

```json
[
  {
    "id": "eee48ac7-b056-413c-af8b-a0eb7a221980",
    "nickname": "测试同学",
    "content": "第一条云端评论",
    "createdAt": "2026-10-27T07:08:25.675Z",
    "timestamp": 1793084905675
  }
]
```

### POST /api/comments

请求体：

```json
{
  "nickname": "昵称（可留空，默认匿名访客）",
  "content": "评论内容（必填，最多 500 字）"
}
```

服务端行为：

- 自动生成唯一 `id`（`crypto.randomUUID()`）与时间戳
- 追加写入 `comments.json`
- 成功返回 `201` 与 `{ success: true, comment: {...} }`
- 内容为空或超长返回 `400` 与错误说明

本地自测命令：

```bash
curl http://localhost:3000/api/comments

curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"测试同学\",\"content\":\"你好，水控智联\"}"
```

接口已开启 CORS（`Access-Control-Allow-Origin: *`），本地 localhost、GitHub Pages、Replit 外网链接等均可直接访问。

## 本地启动步骤

环境要求：Node.js 18 或更高版本。

1. 安装依赖（npm 安装命令）：

```bash
npm install
```

2. 启动服务：

```bash
npm start
```

3. 浏览器访问：<http://localhost:3000>

页面底部的评论区会自动拉取评论；提交后列表自动刷新。

> 默认端口为 3000，也可以通过环境变量修改，例如 `PORT=8080 npm start`。

## Replit 部署完整步骤

### 1. 准备代码

确保仓库已推送到 GitHub（当前已推送至 `main`），仓库根目录包含 `.replit`、`server.js`、`package.json`、`comments.json` 和 `public/`。

### 2. 在 Replit 创建项目

1. 打开 [Replit](https://replit.com/) 并登录。
2. 点击右上角 **Create** → **Import from GitHub**。
3. 粘贴仓库地址：

```
https://github.com/zhang123-hub/yj2-water-auto-web
```

4. 选择模板为 **Node.js**，点击 **Import from GitHub**。

Replit 会自动识别 `package.json` 和 `.replit`，配置好运行命令。

### 3. 一键运行

1. 导入完成后，直接点击顶部 **Run** 按钮。
2. 等待右侧 **Shell** 输出：

```
服务已启动：http://localhost:3000
```

3. 页面会自动在右侧 **Webview** 中打开，滚动到最底部即可看到评论区。

### 4. 外网访问说明

- **Webview（预览窗口）**：只在当前 Replit 页面内可见，用于调试。
- **公开链接**：点击 Webview 右上角的 **Open in new tab**（或顶部 **Open website**），得到形如：

```
https://yj2-water-auto-web.yourusername.repl.co
```

的公网地址，任何设备、任何浏览器都可以打开。
- 在另一台设备上打开该链接，提交评论后刷新，即可验证跨设备共享。

### Replit 使用提示

- Replit 的 Repl 文件系统是持久化的，服务停止或重启后，`comments.json` 中的评论不会丢失。
- 免费版每月有一定计算资源配额，演示/答辩期间通常够用。
- 后端已监听 `0.0.0.0:3000`，并兼容 Replit 注入的 `PORT` 环境变量，无需修改代码即可运行。

## 前端单独部署（可选）

如果希望前端继续放在 GitHub Pages、仅把接口部署到 Replit，在 `public/index.html` 中引入 `comments.js` 之前加入：

```html
<script>
  window.COMMENTS_API_URL = 'https://yj2-water-auto-web.yourusername.repl.co/api/comments'
</script>
```

后端已开启 CORS，跨域请求可正常使用。

## 答辩讲解要点

1. **请求链路**：页面加载 → `GET /api/comments` → 渲染列表；提交表单 → 前端校验 → `POST /api/comments` → 写入 JSON → 重新拉取列表。
2. **双层校验**：前端拦截空白/超长内容，后端再次校验，防止绕过页面直接调接口。
3. **唯一标识**：使用 `crypto.randomUUID()` 生成 id，用 ISO 时间与毫秒时间戳记录时间，排序稳定。
4. **倒序展示**：接口按 `timestamp` 降序排序，最新评论始终在最上方。
5. **跨域与部署**：`cors()` 中间件允许任意来源；Express 同时托管 `public` 静态资源，前后端同源，Replit 上直接点击 Run 即可运行。
6. **安全渲染**：前端使用 `textContent` 写入昵称与评论，浏览器自动转义，避免 XSS。
7. **原功能保留**：监测大屏、粒子动效与「守护水位」小游戏代码完整保留，评论区以独立文件追加在页面底部，未改动游戏核心逻辑。

## 原页面使用方式

访问部署后的网址即可浏览网页，点击 YJ² 队标打开小游戏；页面底部可直接参与评论。
