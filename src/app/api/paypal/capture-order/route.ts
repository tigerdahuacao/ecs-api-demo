/**
 * @file src/app/api/paypal/capture-order/route.ts
 * POST /api/paypal/capture-order — 捕获（完成）PayPal 订单支付
 * POST /api/paypal/capture-order — Capture (complete) a PayPal order payment
 *
 * 被以下两个流程调用 / Called by two flows:
 *   1. 标准结账（PaymentWall → PayPalButton.onApprove）
 *      Standard checkout: PaymentWall → PayPalButton.onApprove
 *   2. 快捷结账（CheckoutView express mode → "Confirm & Pay" button）
 *      Express checkout: CheckoutView express mode → "Confirm & Pay" button
 *
 * 请求体 / Request body:  { orderId: string }
 * 响应格式 / Response:
 *   成功: { success: true, data: { orderId, status } }
 *   失败: { success: false, error: string } (status 4xx/5xx)
 *
 * 环境变量 / Env vars: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

function getPayPalApiBase(): string {
  return (process.env.PAYPAL_ENV ?? "sandbox") === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const tag = "[/api/paypal/capture-order]";
  try {
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
    console.log(`${tag} orderId=${orderId}`);

    if (!orderId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    const base = getPayPalApiBase();
    const url = `${base}/v2/checkout/orders/${orderId}/capture`;
    console.log(`${tag} POST ${url}`);

    const captureRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(clientId, clientSecret),
        "Content-Type": "application/json",
      },
    });

    const captureText = await captureRes.text();
    console.log(`${tag} PayPal response status: ${captureRes.status}`);
    console.log(`${tag} PayPal response body:`, captureText);

    if (!captureRes.ok) {
      let details: unknown = captureText;
      try { details = JSON.parse(captureText); } catch { /* raw text is fine */ }
      console.error(`${tag} ERROR: PayPal capture failed`, details);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `PayPal capture failed: ${captureRes.status}` },
        { status: 502 }
      );
    }

    const captureJson = JSON.parse(captureText) as { id: string; status: string };
    console.log(`${tag} SUCCESS status=${captureJson.status}`);

    return NextResponse.json<ApiResponse<{ orderId: string; status: string }>>({
      success: true,
      data: { orderId: captureJson.id ?? orderId, status: captureJson.status },
    });
  } catch (err) {
    console.error(`${tag} EXCEPTION:`, err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: `Internal error: ${String(err)}` },
      { status: 500 }
    );
  }
}
