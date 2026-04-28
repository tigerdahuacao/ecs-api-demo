# ECS Playground — E-Commerce Payment Demo

全栈电商支付测试 Demo，技术栈：Next.js 15 + Tailwind v4 + Prisma + MongoDB + Zustand + next-intl。

## 快速启动

### 1. 配置环境变量

复制 `.env.example` 为 `.env.local`，填写 MongoDB 连接字符串：

```bash
cp .env.example .env.local
# 编辑 .env.local，填写 DATABASE_URL
```

MongoDB Atlas 免费账号：https://www.mongodb.com/atlas

### 2. 安装依赖并生成 Prisma 客户端

```bash
pnpm install
# postinstall 会自动执行 prisma generate
```

### 3. 推送数据库结构 + 种子数据

```bash
pnpm db:push    # 推送 schema 到 MongoDB
pnpm db:seed    # 写入示例商品数据
```

### 4. 启动开发服务器

```bash
pnpm dev
```

打开 http://localhost:3000 → 自动跳转至 `/zh/product`

---

## 页面路由

| 路由 | 说明 |
|------|------|
| `/zh/product` | 商品详情页（青釉马克杯） |
| `/zh/cart` | 购物车页面 |
| `/zh/checkout` | 结算页面 |
| `/en/product` | 英文版商品详情 |

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 获取商品列表 |
| GET | `/api/products/:id` | 获取单个商品 |
| GET | `/api/cart?sessionId=` | 获取购物车 |
| POST | `/api/cart` | 加入购物车 |
| PATCH | `/api/cart/:id` | 更新数量 |
| DELETE | `/api/cart/:id` | 删除商品 |
| GET | `/api/recommendations?productId=` | 获取推荐 |

## 功能特性

- 🌓 深色/浅色模式切换（Tailwind v4 class strategy）
- 🌐 i18n 中/英双语（next-intl，可扩展日语/西班牙语）
- 🔍 ApiPanel 调试面板 — 实时展示每个 API 的 request/response
- 📱 移动端响应式适配
- 💾 sessionStorage 持久化购物车

## Cloudflare Pages 部署

```bash
pnpm pages:build   # 构建 Cloudflare Pages 产物
```

在 Cloudflare Dashboard 配置 `DATABASE_URL` 环境变量后直接部署 `out/` 目录。
