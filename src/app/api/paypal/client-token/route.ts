/**
 * @file src/app/api/paypal/client-token/route.ts
 * GET /api/paypal/client-token — 获取 PayPal OAuth 访问令牌（带 10 分钟缓存）
 * GET /api/paypal/client-token — Fetch PayPal OAuth access token (with 10-minute cache)
 *
 * 设计说明 / Design notes:
 *   1. 10 分钟 TTL 缓存，避免频繁请求 PayPal OAuth 端点
 *      10-minute TTL cache to avoid hammering the PayPal OAuth endpoint
 *   2. fetchingPromise 并发去重：多个并发请求只发一次 HTTP 请求给 PayPal
 *      fetchingPromise deduplication: concurrent requests share a single HTTP call to PayPal
 *   3. 响应格式遵循项目统一的 ApiResponse 信封
 *      Response follows the project's unified ApiResponse envelope
 *
 * 调用方 / Called by:
 *   前端 CheckoutView → GET /api/paypal/client-token → 获取 clientToken → window.paypal.createInstance()
 *   Frontend CheckoutView → GET /api/paypal/client-token → get clientToken → window.paypal.createInstance()
 *
 * 环境变量 / Environment variables (server-only, no NEXT_PUBLIC_ prefix):
 *   PAYPAL_CLIENT_ID     — PayPal 应用 Client ID / PayPal app Client ID
 *   PAYPAL_CLIENT_SECRET — PayPal 应用 Client Secret / PayPal app Client Secret
 *   PAYPAL_ENV           — "sandbox" | "production"（默认 "sandbox"）
 */
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/** 缓存有效期 10 分钟 / Cache TTL: 10 minutes */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** 缓存的访问令牌 / Cached access token */
let cachedToken: string | null = null;
/** 缓存写入时间戳 / Timestamp when cache was written */
let cachedAt = 0;
/** 并发去重 Promise：若请求已在进行中，后续调用共享同一个 Promise
 *  Concurrent deduplication Promise: subsequent calls share the in-flight Promise */
let fetchingPromise: Promise<string> | null = null;

/**
 * getPayPalApiBase — 根据 PAYPAL_ENV 返回正确的 API base URL
 * getPayPalApiBase — return the correct API base URL based on PAYPAL_ENV
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
 * @param clientId     PayPal Client ID
 * @param clientSecret PayPal Client Secret
 * @returns "Basic <base64(clientId:clientSecret)>"
 */
function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * fetchTokenFromPayPal — 向 PayPal OAuth 端点请求新 token
 * fetchTokenFromPayPal — request a new token from the PayPal OAuth endpoint
 *
 * 并发去重：若已有进行中的请求，直接返回其 Promise 而不重复发送。
 * Concurrent deduplication: if a request is already in-flight, return its Promise.
 *
 * @returns Promise<string> 访问令牌 / access token
 * @throws Error 当 PayPal 返回非 2xx 或未包含 access_token 时 / when PayPal returns non-2xx or missing access_token
 */
async function fetchTokenFromPayPal(): Promise<string> {
  if (fetchingPromise) return fetchingPromise;

  fetchingPromise = (async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing PayPal credentials: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET");
    }

    const base = getPayPalApiBase();
    const form = new URLSearchParams();
    form.append("grant_type", "client_credentials");
    form.append("response_type", "client_token");

    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(clientId, clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PayPal OAuth failed: ${res.status} ${text}`);
    }

    const json = await res.json() as { access_token?: string };
    if (!json.access_token) throw new Error("PayPal returned no access_token");

    cachedToken = json.access_token;
    cachedAt = Date.now();
    fetchingPromise = null;
    return json.access_token;
  })();

  try {
    return await fetchingPromise;
  } catch (err) {
    fetchingPromise = null;
    throw err;
  }
}

/**
 * GET /api/paypal/client-token
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: { clientToken: string } }
 *   失败 / Error:   { success: false, error: string } (status 500)
 */
export async function GET() {
  try {
    if (cachedToken && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json<ApiResponse<{ clientToken: string }>>({
        success: true,
        data: { clientToken: cachedToken },
      });
    }

    const token = await fetchTokenFromPayPal();
    return NextResponse.json<ApiResponse<{ clientToken: string }>>({
      success: true,
      data: { clientToken: token },
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
