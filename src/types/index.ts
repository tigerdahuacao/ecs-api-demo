/**
 * @file src/types/index.ts
 * 全局 TypeScript 类型定义文件 / Global TypeScript type definitions
 *
 * 本文件是整个项目的类型"词典"，所有组件、API 路由、Store 都从这里导入类型。
 * This file is the type "dictionary" for the project. All components, API routes,
 * and stores import types from here.
 */

// ─── 国际化 / Internationalization ──────────────────────────────────────────

/**
 * 支持的语言枚举 / Supported locale enum
 * 使用场景 / Used in: useLocale(), i18n/routing.ts, URL 路径前缀
 */
export type Locale = "zh" | "en";

/**
 * 多语言文本对象 / Bilingual text object
 * 数据库中的 name、description 等字段都是此类型的 JSON
 * Database fields like name, description are stored as this JSON shape
 * @example { zh: "青釉马克杯", en: "Celadon Mug" }
 */
export interface I18nText {
  zh: string;
  en: string;
}

// ─── 商品 / Product ──────────────────────────────────────────────────────────

/**
 * 商品规格选项（单个 spec，如"颜色"）/ Product specification (a single spec like "Color")
 * 使用场景 / Used in: Product.specs[], ProductDetail.tsx 渲染规格选择器
 */
export interface ProductSpec {
  /** 规格名称，多语言 / Spec name, bilingual */
  name: I18nText;
  /** 选项值列表，如 ["teal", "white", "navy"] / Option values like ["teal", "white"] */
  options: string[];
}

/**
 * 商品数据结构 / Product data model
 * 使用场景 / Used in:
 *   - GET /api/products → 返回 Product[]
 *   - GET /api/products/[id] → 返回 Product
 *   - CartItem.product（关联嵌入）
 *   - ProductDetail.tsx 渲染商品详情
 */
export interface Product {
  id: string;
  /** 商品名称，多语言 JSON / Bilingual product name */
  name: I18nText;
  /** 商品描述，多语言 JSON / Bilingual description */
  description: I18nText;
  /** 价格（人民币）/ Price in CNY */
  price: number;
  /** 商品图片 URL 数组（相对路径）/ Array of image URLs (relative paths) */
  images: string[];
  /** 商品分类，如 "mug" / Category string */
  category: string;
  /** 规格列表，如 [颜色, 尺寸] / Spec list e.g. [Color, Size] */
  specs: ProductSpec[];
  /** 库存数量 / Stock quantity */
  stock: number;
  createdAt: Date;
}

// ─── 购物车 / Cart ───────────────────────────────────────────────────────────

/**
 * 购物车条目 / Cart item
 * 使用场景 / Used in:
 *   - GET /api/cart → 返回 CartItem[]
 *   - POST /api/cart → 返回新建的 CartItem
 *   - PATCH /api/cart/[id] → 返回更新后的 CartItem
 *   - CartView.tsx、CheckoutView.tsx 渲染列表
 *   - useCartStore.items 数组元素
 */
export interface CartItem {
  id: string;
  /** 匿名用户标识，存储在 sessionStorage / Anonymous user ID stored in sessionStorage */
  sessionId: string;
  productId: string;
  quantity: number;
  /** 用户选择的规格键值对 / Selected spec key-value pairs
   * @example { color: "teal", size: "medium" } */
  specs: Record<string, string>;
  createdAt: Date;
  /** 关联商品信息，API 响应时从数据库 join / Associated product, joined from DB in API response */
  product?: Product;
}

// ─── 推荐 / Recommendation ──────────────────────────────────────────────────

/**
 * 商品推荐关系 / Product recommendation relation
 * 使用场景 / Used in:
 *   - GET /api/recommendations?productId=xxx → 返回 Recommendation[]
 *   - RecommendationCard.tsx（购物车页推荐区）
 *   - ImpulseItem.tsx（结算页冲动消费区）
 */
export interface Recommendation {
  id: string;
  /** 触发推荐的商品 ID / The product that triggers this recommendation */
  productId: string;
  /** 被推荐的商品 ID / The recommended product ID */
  relatedId: string;
  /** 推荐分数，越高越优先展示 / Score; higher = shown first */
  score: number;
  /** 关联商品完整信息，API 响应时 join / Full product info, joined in API response */
  relatedProduct?: Product;
}

// ─── API 响应包装 / API Response Envelope ───────────────────────────────────

/**
 * 统一 API 响应格式 / Unified API response envelope
 * 所有 /api/* 路由都使用此格式返回数据
 * All /api/* routes return data in this shape
 * @template T 响应数据的类型 / Type of the response data
 * @example { success: true, data: [...] }
 * @example { success: false, error: "Product not found" }
 */
export interface ApiResponse<T> {
  success: boolean;
  /** 成功时的数据 / Data on success */
  data?: T;
  /** 失败时的错误消息 / Error message on failure */
  error?: string;
}

// ─── ApiPanel 相关 / ApiPanel Types ─────────────────────────────────────────

/**
 * ApiPanel 面板位置 / Panel dock position
 * 使用场景 / Used in: ApiPanelProvider.tsx、api-panel store、各页面 <ApiPanel> 组件
 */
export type ApiPanelPosition = "top" | "bottom" | "left" | "right";

/**
 * ApiPanel 标签页配置（保留类型，当前通过 key 硬编码）
 * Tab config type (retained; currently tabs are hardcoded by key)
 */
export interface ApiPanelTab {
  key: "request" | "response" | "suggestions" | "nextSteps";
  staticContent?: string;
}

/**
 * 注册一个 ApiPanel 面板所需的配置 / Config required to register an ApiPanel instance
 * 使用场景 / Used in:
 *   - <ApiPanel> 组件的 props
 *   - useApiPanelStore.registerPanel() 的参数
 *   - useApiPanelStore.configs 中的存储值
 */
export interface ApiPanelConfig {
  /** 面板唯一标识，跨页面唯一 / Unique panel ID, must be unique across pages */
  id: string;
  /** 显示在工具栏的标题 / Title shown in the toolbar */
  title: string;
  /** 初始停靠方向（会被用户持久化设置覆盖）/ Initial dock position (overridden by user's saved pref) */
  defaultPosition?: ApiPanelPosition;
  /** 是否默认展开 / Whether to open on first render */
  defaultOpen?: boolean;
  /** "建议"标签页的静态文案 / Static text for the "Suggestions" tab */
  suggestions?: string;
  /** "下一步"标签页的静态文案 / Static text for the "Next Steps" tab */
  nextSteps?: string;
  /** Request 标签页的默认内容（无 API 调用时显示）/ Default content for Request tab (shown before any API call) */
  defaultRequest?: unknown;
  /** Response 标签页的默认内容（无 API 调用时显示）/ Default content for Response tab (shown before any API call) */
  defaultResponse?: unknown;
}

/**
 * ApiPanel 面板中一次 API 调用的请求/响应记录
 * One API call's request + response captured by the panel
 * 使用场景 / Used in: useApiPanelStore.entries、apiFetch() 写入、PanelUI 展示
 */
export interface ApiPanelEntry {
  request: unknown;
  response: unknown;
  isOpen: boolean;
  timestamp: number;
}

/**
 * ApiPanel store 的顶层数据结构（所有面板的条目集合）
 * Top-level data structure of the ApiPanel store (all panel entries)
 */
export type ApiPanelStore = Record<string, ApiPanelEntry>;

// ─── 购物车 Store / Cart Store State ────────────────────────────────────────

/**
 * Zustand 购物车 store 的完整状态 + 操作定义
 * Full state + action definitions for the Zustand cart store
 * 使用场景 / Used in: src/store/cart.ts create<CartState>()
 */
export interface CartState {
  /** 当前购物车中的所有商品 / All items currently in the cart */
  items: CartItem[];
  /** 当前会话 ID（从 sessionStorage 读取）/ Current session ID (read from sessionStorage) */
  sessionId: string;

  /**
   * 用 API 返回的完整列表替换购物车 / Replace cart with the full list from API
   * 调用方 / Called by: CartView.fetchCart()、CheckoutView.fetchData()
   */
  setItems: (items: CartItem[]) => void;

  /**
   * 加购一个条目（相同 productId+specs 则合并数量）
   * Add one item (merges quantity if same productId+specs)
   * 调用方 / Called by: ProductDetail.handleAddToCart()、ImpulseItem.handleAdd()、RecommendationCard.handleAdd()
   */
  addItem: (item: CartItem) => void;

  /**
   * 更新指定条目的数量 / Update quantity for a specific item
   * 调用方 / Called by: CartView.handleQuantityChange()
   */
  updateQuantity: (id: string, quantity: number) => void;

  /**
   * 删除指定条目 / Remove a specific item
   * 调用方 / Called by: CartView.handleRemove()
   */
  removeItem: (id: string) => void;

  /**
   * 清空购物车（下单后调用）/ Clear the cart (called after order placement)
   * 调用方 / Called by: CheckoutView.handlePlaceOrder()
   */
  clearCart: () => void;

  /**
   * 计算购物车总件数（用于 Navbar Badge）
   * Compute total item count (used for Navbar badge)
   * 调用方 / Called by: Navbar.tsx
   */
  totalCount: () => number;

  /**
   * 计算购物车总金额 / Compute total price
   * 调用方 / Called by: CartView.tsx（本地计算，目前未直接使用此方法）
   */
  totalPrice: () => number;
}
