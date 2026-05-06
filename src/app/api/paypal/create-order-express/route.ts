/**
 * @file src/app/api/paypal/create-order-express/route.ts
 * POST /api/paypal/create-order-express — 创建 PayPal Express Checkout 订单
 * POST /api/paypal/create-order-express — Create a PayPal Express Checkout (shortcut) order
 *
 * 与标准 create-order 的区别 / Differences from standard create-order:
 *   - 添加 payment_source.paypal.experience_context 控制结账体验
 *     Adds payment_source.paypal.experience_context to control checkout experience
 *   - shipping_preference: "GET_FROM_FILE" — 从买家 PayPal 账户获取收货地址
 *     Retrieves shipping address from buyer's PayPal account
 *   - user_action: "CONTINUE" — 授权后返回商家网站，不立即扣款
 *     Returns to merchant site after approval; payment not captured immediately
 *
 * 被引用于 / Called by:
 *   src/components/common/PayPalExpressButton.tsx → createExpressOrder()
 *
 * 请求体 / Request body:
 *   { items: OrderItem[], totalAmount: number, currency: string }
 *
 * 响应 / Response:
 *   { success: true, data: { orderId: string } }
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

type OrderItem = {
  id?: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

type CreateOrderBody = {
  items: OrderItem[];
  totalAmount: number;
  currency: string;
};

function getPayPalApiBase(): string {
  return (process.env.PAYPAL_ENV ?? "sandbox") === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const tag = "[/api/paypal/create-order-express]";
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const env = process.env.PAYPAL_ENV ?? "sandbox";
    console.log(`${tag} env=${env}`);

    if (!clientId || !clientSecret) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "PayPal credentials not configured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null) as CreateOrderBody | null;
    if (!body) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];
    const totalAmount = Number(body.totalAmount ?? 0);
    const currency = String(body.currency ?? "USD").toUpperCase();

    if (items.length === 0 || totalAmount <= 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "items or totalAmount missing/invalid" },
        { status: 400 }
      );
    }

    const paypalItems = items.map((item) => ({
      name: item.name.slice(0, 127),
      unit_amount: { currency_code: currency, value: item.unitPrice.toFixed(2) },
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
              item_total: { currency_code: currency, value: totalAmount.toFixed(2) },
            },
          },
          items: paypalItems,
        },
      ],
      // Express Checkout Shortcut: 从买家 PayPal 账户获取收货地址，授权后返回商家页完成 capture
      // Gets shipping address from buyer's PayPal account; returns to merchant for final capture
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: "GET_FROM_FILE",
            user_action: "CONTINUE",
            landing_page: "LOGIN",
            locale: "en-US",
          },
        },
      },
    };

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
      try { details = JSON.parse(createText); } catch { /* raw text */ }
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `PayPal order creation failed: ${createRes.status}` },
        { status: 502 }
      );
    }

    const createJson = JSON.parse(createText) as { id: string };
    console.log(`${tag} SUCCESS orderId:`, createJson.id);

    return NextResponse.json<ApiResponse<{ orderId: string }>>({
      success: true,
      data: { orderId: createJson.id },
    });
  } catch (err) {
    console.error(`${tag} EXCEPTION:`, err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `Internal error: ${String(err)}` },
      { status: 500 }
    );
  }
}
