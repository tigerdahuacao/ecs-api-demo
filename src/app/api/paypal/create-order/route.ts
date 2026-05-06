/**
 * @file src/app/api/paypal/create-order/route.ts
 * POST /api/paypal/create-order — 创建 PayPal 订单
 * POST /api/paypal/create-order — Create a PayPal order
 *
 * 调用流程 / Flow:
 *   前端 PayPalButton → POST /api/paypal/create-order（带 items + totalAmount + currency）
 *   → 调用 PayPal v2/checkout/orders API
 *   → 返回 { success: true, data: { orderId } }
 *   → SDK 拿到 orderId 后弹出支付弹窗
 *
 * 请求体 / Request body:
 *   {
 *     items: Array<{ id?: string; name: string; unitPrice: number; quantity: number }>,
 *     totalAmount: number,   // 单位：分的浮点值（如 89.00）
 *     currency: string,      // 货币代码，如 "USD"
 *   }
 *
 * 响应格式 / Response format:
 *   成功 / Success:  { success: true,  data: { orderId: string } }
 *   参数错误 / Bad:  { success: false, error: string } (status 400)
 *   PayPal 失败:     { success: false, error: string } (status 502)
 *   内部错误:        { success: false, error: string } (status 500)
 *
 * 被引用于 / Called by:
 *   src/components/common/PayPalButton.tsx → createPayPalOrder()
 *
 * 扩展点 / Extension points:
 *   logOrderToDb() — 留白的 DB 写入占位，后续步骤实现
 *
 * 环境变量 / Env vars (server-only):
 *   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

// ── 类型 / Types ──────────────────────────────────────────────────────────────

/** 请求体中的单个商品条目 / Single item in the request body */
type OrderItem = {
  /** 商品 ID（可选，用作 PayPal SKU）/ Product ID (optional, used as PayPal SKU) */
  id?: string;
  /** 商品名称（多语言时传当前 locale 的字符串）/ Product name (pass current locale string) */
  name: string;
  /** 单价 / Unit price */
  unitPrice: number;
  /** 数量 / Quantity */
  quantity: number;
};

/** POST /api/paypal/create-order 的完整请求体 / Full request body */
type CreateOrderBody = {
  items: OrderItem[];
  totalAmount: number;
  currency: string;
};

// ── 辅助函数 / Helpers ────────────────────────────────────────────────────────

/**
 * getPayPalApiBase — 根据 PAYPAL_ENV 返回正确的 API base URL
 * getPayPalApiBase — return the correct PayPal API base URL
 */
function getPayPalApiBase(): string {
  const env = process.env.PAYPAL_ENV ?? "sandbox";
  return env === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * buildBasicAuthHeader — 构造 HTTP Basic Auth 头
 * buildBasicAuthHeader — build HTTP Basic Auth header
 *
 * @returns "Basic <base64(clientId:clientSecret)>"
 */
function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * logOrderToDb — 【占位】订单落库
 * logOrderToDb — [placeholder] persist order to database
 *
 * 当前为空实现，后续步骤中接入 Prisma 写入 Order 表。
 * Currently a no-op; will be implemented in a future step using Prisma to write to the Order table.
 *
 * @param _orderId  PayPal 返回的订单 ID / PayPal-returned order ID
 * @param _body     原始请求体（含商品列表和金额）/ Original request body (items + amount)
 */
async function logOrderToDb(_orderId: string, _body: CreateOrderBody): Promise<void> {
  // TODO: 后续步骤实现 DB 写入
  // TODO: implement DB write in a future step
  // Example:
  // const { prisma } = await import("@/lib/prisma");
  // await prisma.order.create({ data: { paypalOrderId: _orderId, ... } });
}

// ── 路由处理 / Route handler ───────────────────────────────────────────────

/**
 * POST /api/paypal/create-order
 *
 * 接收购物车商品列表，向 PayPal v2 orders API 创建订单，返回 orderId。
 * Receives cart items, creates a PayPal v2 order, and returns the orderId.
 */
export async function POST(req: NextRequest) {
  const tag = "[/api/paypal/create-order]";
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const env = process.env.PAYPAL_ENV ?? "sandbox";
    console.log(`${tag} env=${env} clientId=${clientId ? clientId.slice(0, 8) + "…" : "MISSING"}`);

    if (!clientId || !clientSecret) {
      console.error(`${tag} ERROR: PayPal credentials not configured`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "PayPal credentials not configured" },
        { status: 500 }
      );
    }

    // ── 解析请求体 / Parse request body ───────────────────────────────────
    const body = await req.json().catch(() => null) as CreateOrderBody | null;
    console.log(`${tag} request body:`, JSON.stringify(body, null, 2));

    if (!body) {
      console.error(`${tag} ERROR: invalid request body`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];
    const totalAmount = Number(body.totalAmount ?? 0);
    const currency = String(body.currency ?? "USD").toUpperCase();
    console.log(`${tag} parsed — items:${items.length} totalAmount:${totalAmount} currency:${currency}`);

    if (items.length === 0 || totalAmount <= 0) {
      console.error(`${tag} ERROR: items empty or totalAmount <= 0`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "items or totalAmount missing/invalid" },
        { status: 400 }
      );
    }

    // ── 组装 PayPal v2 订单体 / Build PayPal v2 order body ────────────────
    const paypalItems = items.map((item) => ({
      name: item.name.slice(0, 127),
      unit_amount: {
        currency_code: currency,
        value: item.unitPrice.toFixed(2),
      },
      quantity: String(item.quantity),
      ...(item.id ? { sku: item.id } : {}),
    }));

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: totalAmount.toFixed(2),
              },
            },
          },
          items: paypalItems,
        },
      ],
    };

    // ── 调用 PayPal API / Call PayPal API ─────────────────────────────────
    const base = getPayPalApiBase();
    const url = `${base}/v2/checkout/orders`;
    console.log(`${tag} POST ${url}`);
    console.log(`${tag} order body:`, JSON.stringify(orderBody, null, 2));

    const createRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(clientId, clientSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderBody),
    });

    const createText = await createRes.text();
    console.log(`${tag} PayPal response status: ${createRes.status}`);
    console.log(`${tag} PayPal response body:`, createText);

    if (!createRes.ok) {
      let details: unknown = createText;
      try { details = JSON.parse(createText); } catch { /* raw text is fine */ }
      console.error(`${tag} ERROR: PayPal rejected the order`, details);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `PayPal order creation failed: ${createRes.status}`, ...(details ? { details } : {}) },
        { status: 502 }
      );
    }

    const createJson = JSON.parse(createText) as { id: string };
    const orderId: string = createJson.id;
    console.log(`${tag} SUCCESS orderId:`, orderId);

    // ── 落库（占位）/ Persist to DB (placeholder) ─────────────────────────
    await logOrderToDb(orderId, body);

    return NextResponse.json<ApiResponse<{ orderId: string }>>({
      success: true,
      data: { orderId },
    });
  } catch (err) {
    console.error(`${tag} EXCEPTION:`, err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `Internal error: ${String(err)}` },
      { status: 500 }
    );
  }
}
