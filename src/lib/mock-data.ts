/**
 * @file src/lib/mock-data.ts
 * Mock 数据与工具函数 / Mock data and utility functions
 *
 * 作用 / Purpose:
 *   在 mock 模式（pnpm mock / USE_MOCK=true）下提供离线数据，无需连接数据库。
 *   所有 /api/* 路由在 isMock()=true 时从此文件读取数据，而非查询 MongoDB。
 *
 *   Provides offline data in mock mode (pnpm mock / USE_MOCK=true),
 *   allowing development without a database connection.
 *   All /api/* routes read from this file when isMock()=true instead of querying MongoDB.
 *
 * 导出内容 / Exports:
 *   MOCK_PRODUCTS       — 静态商品数组（5 款马克杯）/ Static product array (5 mugs)
 *   mockCart            — 可变的内存购物车数组 / Mutable in-memory cart array
 *   MOCK_RECOMMENDATIONS— 静态推荐关系数组 / Static recommendation relations array
 *   isMock()            — 判断是否处于 mock 模式 / Check if mock mode is active
 *
 * 被引用于 / Imported by:
 *   所有 /api/* 路由文件 / All /api/* route files
 *
 * HMR 说明 / HMR note:
 *   mockCart 挂载在 global.__mockCart 上，以在 Next.js dev 热更新后保持数据不丢失。
 *   mockCart is attached to global.__mockCart to survive Next.js dev HMR reloads.
 */
import type { Product, CartItem, Recommendation } from "@/types";

/**
 * MOCK_PRODUCTS — 静态商品列表（5 款陶瓷马克杯/水杯）
 * MOCK_PRODUCTS — static product list (5 ceramic mugs/cups)
 *
 * 被引用于 / Used by:
 *   GET /api/products      → 返回全部商品
 *   GET /api/products/[id] → 按 id 查找单个商品
 *   POST /api/cart         → 验证 productId 是否存在
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "mock-product-001",
    name: { zh: "青釉马克杯", en: "Celadon Mug" },
    description: {
      zh: "精选优质陶瓷，青绿釉色温润如玉，适合日常茶饮与咖啡享用。杯身厚实，保温效果出色。",
      en: "Premium ceramic with a warm celadon glaze. Thick walls for excellent heat retention, perfect for daily tea and coffee.",
    },
    price: 89.0,
    images: [
      "/images/products/mug-celadon-1.jpg",
      "/images/products/mug-celadon-2.jpg",
    ],
    category: "mug",
    specs: [
      {
        name: { zh: "颜色", en: "Color" },
        key: "color",
        options: [
          { value: "teal", label: { zh: "青绿", en: "Teal" } },
          { value: "white", label: { zh: "纯白", en: "White" } },
          { value: "navy", label: { zh: "深蓝", en: "Navy" } },
          { value: "terracotta", label: { zh: "砖红", en: "Terracotta" } },
        ],
      },
      {
        name: { zh: "规格", en: "Size" },
        key: "size",
        options: [
          { value: "small", label: { zh: "小杯 280ml", en: "Small 280ml" } },
          { value: "medium", label: { zh: "中杯 380ml", en: "Medium 380ml" } },
          { value: "large", label: { zh: "大杯 480ml", en: "Large 480ml" } },
        ],
      },
    ] as unknown as Product["specs"],
    stock: 100,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "mock-product-002",
    name: { zh: "竹节纹陶杯", en: "Bamboo Texture Cup" },
    description: {
      zh: "以竹节为灵感设计，手感凹凸立体，防滑耐用，适合冷热饮品。",
      en: "Inspired by bamboo joints, with a textured grip surface. Versatile for hot and cold drinks.",
    },
    price: 65.0,
    images: ["/images/products/mug-bamboo.jpg"],
    category: "mug",
    specs: [
      {
        name: { zh: "颜色", en: "Color" },
        key: "color",
        options: [
          { value: "natural", label: { zh: "原木色", en: "Natural" } },
          { value: "charcoal", label: { zh: "炭黑", en: "Charcoal" } },
        ],
      },
    ] as unknown as Product["specs"],
    stock: 80,
    createdAt: new Date("2024-01-02"),
  },
  {
    id: "mock-product-003",
    name: { zh: "手工拉坯茶杯", en: "Handmade Teacup" },
    description: {
      zh: "由匠人手工拉坯制作，每只杯型略有差异，独一无二。",
      en: "Hand-thrown by artisans, each piece is unique with natural glaze patterns.",
    },
    price: 128.0,
    images: ["/images/products/cup-handmade.jpg"],
    category: "teacup",
    specs: [] as unknown as Product["specs"],
    stock: 30,
    createdAt: new Date("2024-01-03"),
  },
  {
    id: "mock-product-004",
    name: { zh: "玻璃双层保温杯", en: "Double-wall Glass Tumbler" },
    description: {
      zh: "双层硼硅酸盐玻璃，保温隔热，外壁不烫手。",
      en: "Double-wall borosilicate glass keeps drinks hot without burning your hands.",
    },
    price: 99.0,
    images: ["/images/products/glass-tumbler.jpg"],
    category: "tumbler",
    specs: [] as unknown as Product["specs"],
    stock: 60,
    createdAt: new Date("2024-01-04"),
  },
  {
    id: "mock-product-005",
    name: { zh: "旅行咖啡杯套装", en: "Travel Coffee Cup Set" },
    description: {
      zh: "含隔热杯套与便携盖，可折叠硅胶设计，轻便出行必备。",
      en: "Includes insulating sleeve and travel lid. Collapsible silicone design for on-the-go.",
    },
    price: 149.0,
    images: ["/images/products/travel-cup.jpg"],
    category: "travel",
    specs: [] as unknown as Product["specs"],
    stock: 50,
    createdAt: new Date("2024-01-05"),
  },
];

/**
 * mockCart — mock 模式下的内存购物车（可变数组）
 * mockCart — mutable in-memory cart for mock mode
 *
 * 之所以用 global.__mockCart 而不是直接声明数组：
 * Next.js dev 模式的 HMR 会重新执行模块，直接声明的数组会被重置为 []，
 * 导致用户加购的数据在热更新后消失。挂到 global 上则可以跨重载存活。
 *
 * Why global.__mockCart instead of a plain array declaration:
 * HMR in Next.js dev re-executes modules, resetting plain arrays to [].
 * Attaching to global survives reloads, preserving cart data across HMR.
 *
 * 被引用于 / Used by:
 *   GET  /api/cart       → 读取指定 sessionId 的条目 / Read items for a sessionId
 *   POST /api/cart       → 追加或合并新条目 / Append or merge new items
 *   PATCH /api/cart/[id] → 修改指定条目数量 / Update item quantity
 *   DELETE /api/cart/[id]→ 删除指定条目 / Remove item
 */
declare global {
  // eslint-disable-next-line no-var
  var __mockCart: CartItem[] | undefined;
}
global.__mockCart = global.__mockCart ?? [];
export const mockCart: CartItem[] = global.__mockCart;

/**
 * MOCK_RECOMMENDATIONS — 静态推荐关系（商品 → 相关商品）
 * MOCK_RECOMMENDATIONS — static recommendation relations (product → related product)
 *
 * 被引用于 / Used by:
 *   GET /api/recommendations?productId=xxx
 *   → 过滤出以 productId 为触发的推荐，返回给购物车页和结算页
 */
export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-001",
    productId: "mock-product-001",
    relatedId: "mock-product-002",
    score: 0.9,
    relatedProduct: MOCK_PRODUCTS[1],
  },
  {
    id: "rec-002",
    productId: "mock-product-001",
    relatedId: "mock-product-003",
    score: 0.8,
    relatedProduct: MOCK_PRODUCTS[2],
  },
  {
    id: "rec-003",
    productId: "mock-product-001",
    relatedId: "mock-product-004",
    score: 0.7,
    relatedProduct: MOCK_PRODUCTS[3],
  },
];

/**
 * isMock — 判断当前是否处于 mock 模式
 * isMock — check whether mock mode is currently active
 *
 * 通过环境变量 USE_MOCK 控制，在 pnpm mock（cross-env USE_MOCK=true next dev）时为 true。
 * Controlled by the USE_MOCK environment variable; true when running `pnpm mock`.
 *
 * 被引用于 / Used by: 所有 /api/* 路由的分支判断 / All /api/* route branch checks
 * @returns true → 使用内存 mock 数据；false → 使用真实数据库
 *          true → use in-memory mock data; false → use real database
 */
export const isMock = () => process.env.USE_MOCK === "true";
