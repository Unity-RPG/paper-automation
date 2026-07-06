# 论文自动化 — 部署指南

## 项目结构

```
paper-automation/
├── api/
│   └── analyze.js          # 后端 API 代理（隐藏密钥 + 速率限制）
├── assets/
│   ├── app.js              # 主应用逻辑
│   ├── games.js            # 趣味互动游戏
│   ├── features.js         # 导出/笔记/进度/论文库/分享
│   ├── qa.js               # 深度问答
│   ├── compare.js          # 论文对比
│   └── discovery.js        # 论文推荐
├── _shared/
│   ├── js/                 # ECharts, Mermaid 等库
│   └── fonts/              # 字体文件
├── paper-automation.html   # 主页面
├── vercel.json             # Vercel 部署配置
└── DEPLOY.md               # 本文档
```

## 部署到 Vercel（推荐，5 分钟搞定）

### 第 1 步：安装 Vercel CLI

```bash
npm i -g vercel
```

### 第 2 步：登录 Vercel

```bash
vercel login
```

按提示选择用 GitHub / GitLab / Email 登录。

### 第 3 步：进入项目目录并部署

```bash
cd paper-automation
vercel
```

第一次部署会问几个问题，全部按回车用默认值即可：

```
? Set up and deploy "paper-automation"? [Y/n] Y
? Which scope do you want to deploy to? (你的用户名)
? Link to existing project? [y/N] N
? What's your project's name? paper-automation
? In which directory is your code located? ./
? Want to modify these settings? [y/N] N
```

部署完成后会给你一个 URL，类似 `https://paper-automation-xxx.vercel.app`。

### 第 4 步：设置 API 密钥（关键！）

这一步让你的 API Key 只存在服务器上，前端永远看不到。

**方法一：命令行设置**

```bash
vercel env add DEEPSEEK_API_KEY
```

输入你的 DeepSeek API Key：`sk-ecd3f460d5304b7f9d510fcf1df0b77d`

**方法二：网页设置**

1. 打开 https://vercel.com/dashboard
2. 点击你的项目 → Settings → Environment Variables
3. 添加：
   - Name: `DEEPSEEK_API_KEY`
   - Value: `sk-ecd3f460d5304b7f9d510fcf1df0b77d`
   - Environment: Production (勾选)
4. 点击 Save

### 第 5 步：重新部署（让环境变量生效）

```bash
vercel --prod
```

完成！打开 Vercel 给你的 URL 就能用了。

---

## 本地开发模式

### 方式一：后端代理模式（推荐，和生产环境一致）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 设置本地环境变量
vercel env add DEEPSEEK_API_KEY  # 输入你的密钥

# 本地运行（自动加载环境变量）
vercel dev
```

打开 http://localhost:3000/paper-automation.html

### 方式二：前端直连模式（快速测试用）

```bash
cd paper-automation
python -m http.server 8080
```

打开 http://localhost:8080/paper-automation.html

然后在页面底部"⚙️ AI 接口设置"中手动填入：
- API 端点：`https://api.deepseek.com/v1/chat/completions`
- API Key：`sk-ecd3f460d5304b7f9d510fcf1df0b77d`
- 模型：`deepseek-chat`

**注意：直连模式下密钥存在浏览器 localStorage 中，仅限本地开发使用，不要在生产环境用。**

---

## 架构说明

### 生产环境（安全）

```
用户浏览器 ──→ Vercel CDN (静态文件)
         ──→ Vercel Serverless (/api/analyze)
                 ──→ DeepSeek API (密钥在环境变量中)
```

- API Key 只存在 Vercel 环境变量中
- 前端代码中没有任何密钥
- 每个 IP 每分钟最多 10 次请求（防滥用）
- 输入内容限制 15000 字符

### 本地开发（直连）

```
用户浏览器 ──→ DeepSeek API (密钥在 localStorage 中)
```

- 仅用于本地测试
- 密钥存在浏览器中，不要在生产环境用

---

## 绑定自定义域名

1. 在 Vercel 项目设置中 → Domains
2. 添加你的域名（如 `paper.yourdomain.com`）
3. 到你的域名服务商添加 CNAME 记录：
   ```
   paper  CNAME  cname.vercel-dns.com
   ```
4. 等待 DNS 生效（通常几分钟到几小时）
5. Vercel 自动配置 HTTPS 证书

---

## 常见问题

### Q: 部署后 API 调用报 500 错误？

检查是否设置了环境变量 `DEEPSEEK_API_KEY`。在 Vercel Dashboard → Settings → Environment Variables 中确认。

### Q: API 调用报 429 错误？

速率限制触发了。每个 IP 每分钟最多 10 次请求。如果需要调整，修改 `api/analyze.js` 中的 `RATE_LIMIT_MAX`。

### Q: 如何更换 AI 模型？

在 Vercel 环境变量中添加 `DEEPSEEK_MODEL`，值设为你要用的模型名（如 `deepseek-coder`）。不设置则默认 `deepseek-chat`。

### Q: 如何查看服务器日志？

```bash
vercel logs
```

或在 Vercel Dashboard → Functions → Logs 中查看。

### Q: 部署费用？

- Vercel 免费层：每月 100GB 流量、1000 次 Serverless 调用（够个人用）
- DeepSeek API：注册送 500 万 token 免费额度，之后约 ¥1/百万 token
- 域名（可选）：`.com` 约 ¥60-80/年
