/**
 * @file src/i18n/request.ts
 * next-intl 服务端请求配置 / next-intl server-side request configuration
 *
 * 作用 / Purpose:
 *   在服务端（Server Components、API Route）每次请求时，根据 URL 中的 locale 前缀
 *   动态加载对应语言的翻译消息文件（messages/zh.json 或 messages/en.json）。
 *   On each server-side request, dynamically loads the translation messages file
 *   (messages/zh.json or messages/en.json) based on the locale prefix in the URL.
 *
 * 被引用于 / Imported by:
 *   next-intl 内部机制自动调用，无需手动引用。
 *   Called automatically by next-intl internals — no manual import needed.
 *
 * 加载流程 / Loading flow:
 *   1. Next.js 接收请求，Middleware 解析 locale
 *   2. next-intl 调用此函数，传入 requestLocale
 *   3. 函数校验 locale 合法性，回退到 defaultLocale
 *   4. 动态 import 对应的 JSON 消息文件
 *   5. 消息注入到 <NextIntlClientProvider> 供客户端组件使用
 */
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * getRequestConfig 返回的配置函数
 * Configuration function returned by getRequestConfig
 *
 * @param requestLocale - 从请求 URL 中提取的 locale（可能为 undefined）
 *                        Locale extracted from the request URL (may be undefined)
 * @returns 包含 locale 和 messages 的配置对象
 *          Config object containing locale and messages
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // 等待异步 locale（next-intl v4 API）/ Await async locale (next-intl v4 API)
  let locale = await requestLocale;

  // 如果 locale 无效或不在支持列表中，回退到默认语言
  // Fall back to default locale if locale is invalid or unsupported
  if (!locale || !routing.locales.includes(locale as "zh" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // 动态导入语言包 / Dynamically import the message file for this locale
    // e.g. locale="zh" → import("./messages/zh.json")
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
