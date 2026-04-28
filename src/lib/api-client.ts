/**
 * @file src/lib/api-client.ts
 * 统一 API 请求封装 / Unified API fetch wrapper
 *
 * 作用 / Purpose:
 *   封装 fetch，在每次 API 调用后自动：
 *   1. 将请求 URL / method / body 记录到 ApiPanel 的对应面板
 *   2. 将响应 status / data 记录到 ApiPanel 的对应面板
 *   3. 自动展开对应的 ApiPanel（让用户看到最新的 API 数据）
 *
 *   Wraps fetch so that after every API call it automatically:
 *   1. Records the request URL / method / body into the matching ApiPanel
 *   2. Records the response status / data into the matching ApiPanel
 *   3. Auto-opens the matching ApiPanel so the user sees fresh API data
 *
 * 被引用于 / Imported by:
 *   - ProductDetail.tsx（加购、拉商品列表）
 *   - CartView.tsx（拉购物车、改数量、删条目）
 *   - CheckoutView.tsx（拉购物车、拉推荐）
 *   - RecommendationCard.tsx、ImpulseItem.tsx（加购推荐商品）
 */
import { useApiPanelStore } from "@/store/api-panel";

/**
 * 扩展的 fetch 选项，在标准 RequestInit 基础上增加 panelId
 * Extended fetch options — adds panelId on top of standard RequestInit
 */
interface FetchOptions extends RequestInit {
  /**
   * 目标 ApiPanel 的 ID，用于将请求/响应数据路由到正确的面板
   * Target ApiPanel ID — routes request/response data to the correct panel
   * 若不传则只发请求，不记录到 ApiPanel / If omitted, just fetches without recording
   */
  panelId?: string;
}

/**
 * apiFetch — 项目统一 API 请求函数
 * apiFetch — the project's unified API request function
 *
 * 执行流程 / Execution flow:
 *   1. 分离 panelId 与标准 fetchOptions
 *   2. 构造 request 记录对象（method、url、body）
 *   3. 调用原生 fetch 发送请求
 *   4. 解析 JSON 响应
 *   5. 若有 panelId，将 request + response 写入 ApiPanel store
 *   6. 若面板未展开，自动打开它
 *   7. 若响应 status 不 ok，抛出错误
 *   8. 返回解析后的数据
 *
 * @template T 期望的响应数据类型 / Expected response data type
 * @param url 请求 URL（相对路径）/ Request URL (relative path)
 * @param options fetch 选项 + 可选 panelId / fetch options plus optional panelId
 * @returns 解析后的响应数据 / Parsed response data
 * @throws 响应状态非 ok 时抛出含错误消息的 Error / Throws Error with error message when response is not ok
 *
 * @example
 * // 加购，结果显示在 "product-add-to-cart" 面板
 * const res = await apiFetch<ApiResponse<CartItem>>("/api/cart", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ sessionId, productId, quantity, specs }),
 *   panelId: "product-add-to-cart",
 * });
 */
export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  // 分离自定义属性与标准 fetch 参数
  // Separate our custom property from standard fetch params
  const { panelId, ...fetchOptions } = options;

  // 将 body 字符串反序列化为对象，方便 ApiPanel 展示可读 JSON
  // Deserialize body string to object for readable JSON display in ApiPanel
  const requestBody = fetchOptions.body
    ? JSON.parse(fetchOptions.body as string)
    : undefined;

  // 构造展示用的请求记录 / Build the request record for display
  const request = {
    method: fetchOptions.method ?? "GET",
    url,
    body: requestBody,
  };

  // 发送实际请求 / Send the actual request
  const res = await fetch(url, fetchOptions);
  const data = (await res.json()) as T;

  // 将请求/响应写入 ApiPanel store（仅当指定了 panelId）
  // Write request/response into ApiPanel store (only when panelId is specified)
  if (panelId) {
    const store = useApiPanelStore.getState();
    store.setEntry(panelId, {
      request,
      response: { status: res.status, ok: res.ok, data },
      timestamp: Date.now(),
    });
    // 若面板当前是折叠状态，自动展开让用户看到数据
    // Auto-open the panel if it's currently collapsed
    const instance = store.instances[panelId];
    if (!instance?.isOpen) {
      store.setOpen(panelId, true);
    }
  }

  // 非 2xx 响应时抛出错误，让调用方的 catch 处理
  // Throw for non-2xx responses so the caller's catch block handles it
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }

  return data;
}
