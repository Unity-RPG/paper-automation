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

---

## 国内访问方案

> 背景：Vercel 默认分配的 `*.vercel.app` 域名在中国大陆**无法稳定访问**（DNS 污染 / 连接被重置）。如果你的主要用户在国内，请从下列方案中选择一种。

### 方案1：绑定自定义域名 + Cloudflare CDN（推荐，成本最低）

思路：用一个国内可解析的自定义域名指向 Vercel，并在前面套一层 Cloudflare CDN 加速与隐藏源站。

1. 准备一个已备案（或海外）域名，例如 `paper.yourdomain.com`。
2. 在 Vercel 项目 → Settings → Domains 中添加该域名，按提示在域名服务商添加 CNAME 记录指向 `cname.vercel-dns.com`。
3. 把域名托管到 Cloudflare（将域名 NS 改为 Cloudflare 提供的 NS）。
4. 在 Cloudflare 添加该子域名记录（CNAME → `cname.vercel-dns.com`），开启橙色云朵（代理）。
5. 开启 Cloudflare 的 "Always Use HTTPS"、缓存与自动压缩。
6. 更新 `index.html` 中的 `<link rel="canonical">`、Open Graph/Twitter 的 `og:url`，以及 `public/sitemap.xml` 中的 `<loc>` 为该正式域名。

- 优点：几乎零额外成本，全球加速，隐藏源站 IP。
- 缺点：Cloudflare 部分节点在国内仍偶有波动；若使用国内服务器则域名需 ICP 备案。

### 方案2：迁移到 Zeabur（日本节点，国内可访问）

思路：Zeabur 的东京节点在国内访问较顺畅，且同样支持 Serverless Function 与环境变量，迁移成本低。

1. 注册 https://zeabur.com ，新建项目。
2. 选择「Git 部署」，绑定本仓库，根目录选 `./`。
3. 在项目的 Variables 中添加环境变量 `DEEPSEEK_API_KEY`（与 Vercel 一致）。
4. Zeabur 会自动识别静态站点与 `/api` 路由（`api/analyze.js` 可作为 Serverless Function 运行）；如需自定义路由，参考 Zeabur 文档配置。
5. 部署完成后使用 Zeabur 提供的 `*.zeabur.app` 域名，或绑定自定义域名。
6. 把 `api/analyze.js` 中依赖 Vercel 的部分（如 `req.body` 自动解析）确认兼容；Zeabur Node 运行时同样支持 `module.exports = async (req, res) => {}` 形式。

- 优点：日本节点国内直连体验好，配置简单，免费额度足够个人使用。
- 缺点：免费额度有限，超出后需付费；Serverless 细节与 Vercel 略有差异需测试。

### 方案3：使用腾讯云 / 阿里云国内服务（最稳定，需备案）

思路：把前端静态文件托管到国内对象存储 + CDN，后端 API 用云函数部署，彻底解决国内访问问题。

1. 前端：将 `index.html`、`assets/`、`_shared/`、`public/` 上传到腾讯云 COS / 阿里云 OSS，开启静态网站托管，并配置 CDN 加速域名（域名需 ICP 备案）。
2. 后端：把 `api/analyze.js` 改写为云函数：
   - 腾讯云：云函数 SCF（Node.js），使用 API 网关触发；
   - 阿里云：函数计算 FC（Node.js），配置 HTTP 触发器。
   - 注意适配入参格式（云函数的事件对象与 Vercel 的 `req/res` 不同，需做转换）。
3. 在云函数环境变量中配置 `DEEPSEEK_API_KEY`。
4. 把前端 `API_PROXY_URL`（`assets/app.js`）改为云函数的 HTTP 触发地址。
5. 建议在 CDN 控制台配置 HTTPS 证书、缓存策略与防盗链。

- 优点：国内访问最稳定、速度最快，可控性最强。
- 缺点：需要域名 ICP 备案（约 1-2 周），配置步骤较多，有少量持续成本。

### 方案对比

| 方案 | 国内可达性 | 成本 | 配置难度 | 是否需备案 |
| --- | --- | --- | --- | --- |
| 自定义域名 + Cloudflare | 较好（偶有波动） | 低 | 低 | 海外域名无需 |
| Zeabur 日本节点 | 好 | 低-中 | 低 | 否 |
| 腾讯云/阿里云国内 | 最好 | 中 | 高 | 是 |

> 建议：个人/小团队优先尝试**方案2（Zeabur）**或**方案1（Cloudflare）**；面向国内大众用户且追求稳定时选择**方案3**。
