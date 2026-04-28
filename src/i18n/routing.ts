/**
 * @file src/i18n/routing.ts
 * next-intl 路由配置 / next-intl routing configuration
 *
 * 作用 / Purpose:
 *   定义项目支持的语言列表和默认语言。
 *   此配置对象会被 middleware.ts 和 request.ts 共同引用，确保两者使用同一份配置。
 *   Defines the list of supported locales and the default locale.
 *   Shared between middleware.ts and request.ts to keep configuration in sync.
 *
 * 被引用于 / Imported by:
 *   - src/middleware.ts（用于路由拦截/重定向）
 *   - src/i18n/request.ts（用于服务端消息加载）
 *   - src/components/common/LanguageSwitcher.tsx（读取 locales 列表）
 *   - src/app/[locale]/layout.tsx（验证 locale 参数是否合法）
 */
import { defineRouting } from "next-intl/routing";

/**
 * 路由配置对象 / Routing configuration object
 * locales: 所有支持的语言代码 / All supported locale codes
 * defaultLocale: 无语言前缀时的默认语言 / Default locale when no prefix is present
 *
 * 扩展语言方法 / To add a new language (e.g. Japanese):
 *   1. 在 locales 中添加 "ja"
 *   2. 创建 src/i18n/messages/ja.json
 *   3. LanguageSwitcher 会自动出现新按钮
 */
export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
});
