/**
 * @file src/app/api/paypal/create-order/route.ts
 * POST /api/paypal/create-order — 创建 PayPal 订单（标准结账流程）
 * POST /api/paypal/create-order — Create a PayPal order (standard checkout flow)
 *
 * 请求体 / Request body:
 *   { items: OrderItem[], totalAmount: number, currency: string }
 *
 * 响应 / Response:
 *   { success: true, data: { orderId: string } }
 *
 * 被引用于 / Called by:
 *   src/components/common/PayPalButton.tsx → createPayPalOrder()
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { withLogger } from "@/lib/route-logger";

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
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

async function logOrderToDb(_orderId: string, _body: CreateOrderBody): Promise<void> {
  // TODO: implement DB write in a future step
}

export const POST = withLogger("[/api/paypal/create-order]", async (req: NextRequest) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const env = process.env.PAYPAL_ENV ?? "sandbox";
  console.log("env:", env, "clientId:", clientId ? clientId.slice(0, 8) + "…" : "MISSING");

  if (!clientId || !clientSecret) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "PayPal credentials not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null) as CreateOrderBody | null;
  console.log("request body:", JSON.stringify(body, null, 2));

  if (!body) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];
  const totalAmount = Number(body.totalAmount ?? 0);
  const currency = String(body.currency ?? "USD").toUpperCase();
  console.log(`parsed — items:${items.length} totalAmount:${totalAmount} currency:${currency}`);

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
    purchase_units: [{
      amount: {
        currency_code: currency,
        value: totalAmount.toFixed(2),
        breakdown: {
          item_total: { currency_code: currency, value: totalAmount.toFixed(2) },
        },
      },
      items: paypalItems,
    }],
  };

  const url = `${getPayPalApiBase()}/v2/checkout/orders`;
  console.log("calling PayPal:", url);
  console.log("order body:", JSON.stringify(orderBody, null, 2));

  const createRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderBody),
  });

  const createText = await createRes.text();
  console.log("PayPal status:", createRes.status);
  console.log("PayPal body:", createText);

  if (!createRes.ok) {
    let details: unknown = createText;
    try { details = JSON.parse(createText); } catch { /* raw text */ }
    console.error("PayPal rejected the order:", details);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `PayPal order creation failed: ${createRes.status}` },
      { status: 502 }
    );
  }

  const createJson = JSON.parse(createText) as { id: string };
  const orderId: string = createJson.id;
  console.log("success, orderId:", orderId);

  await logOrderToDb(orderId, body);

  return NextResponse.json<ApiResponse<{ orderId: string }>>({
    success: true,
    data: { orderId },
  });
});
