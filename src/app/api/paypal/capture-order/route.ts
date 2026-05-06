/**
 * @file src/app/api/paypal/capture-order/route.ts
 * POST /api/paypal/capture-order — 捕获（完成）PayPal 订单支付
 * POST /api/paypal/capture-order — Capture (complete) a PayPal order payment
 *
 * 被以下两个流程调用 / Called by two flows:
 *   1. 标准结账（PayPalButton.onApprove）
 *   2. 快捷结账（CheckoutView express mode → "Confirm & Pay"）
 *
 * 请求体 / Request body:  { orderId: string }
 * 响应 / Response:  { success: true, data: { orderId, status } }
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { withLogger } from "@/lib/route-logger";

function getPayPalApiBase(): string {
  return (process.env.PAYPAL_ENV ?? "sandbox") === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export const POST = withLogger("[/api/paypal/capture-order]", async (req: NextRequest) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "PayPal credentials not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null) as { orderId?: string } | null;
  const orderId = body?.orderId;
  console.log("orderId:", orderId);

  if (!orderId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "orderId is required" },
      { status: 400 }
    );
  }

  const url = `${getPayPalApiBase()}/v2/checkout/orders/${orderId}/capture`;
  console.log("calling PayPal:", url);

  const captureRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/json",
    },
  });

  const captureText = await captureRes.text();
  console.log("PayPal status:", captureRes.status);
  console.log("PayPal body:", captureText);

  if (!captureRes.ok) {
    let details: unknown = captureText;
    try { details = JSON.parse(captureText); } catch { /* raw text */ }
    console.error("PayPal capture failed:", details);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `PayPal capture failed: ${captureRes.status}` },
      { status: 502 }
    );
  }

  const captureJson = JSON.parse(captureText) as { id: string; status: string };
  console.log("success, status:", captureJson.status);

  return NextResponse.json<ApiResponse<{ orderId: string; status: string }>>({
    success: true,
    data: { orderId: captureJson.id ?? orderId, status: captureJson.status },
  });
});
