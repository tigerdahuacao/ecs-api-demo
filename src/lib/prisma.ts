/**
 * @file src/lib/prisma.ts
 * Prisma 客户端单例 / Prisma client singleton
 *
 * 作用 / Purpose:
 *   创建并导出全局唯一的 Prisma 客户端实例。
 *   在 Next.js dev 模式下，热更新（HMR）会反复重新执行模块，
 *   若每次都 new PrismaClient() 则会创建过多连接，导致数据库连接耗尽。
 *   通过挂载到 globalThis 实现跨 HMR 的单例复用。
 *
 *   Creates and exports a single global Prisma client instance.
 *   In Next.js dev mode, HMR re-executes modules repeatedly.
 *   Creating a new PrismaClient() each time would exhaust database connections.
 *   Mounting on globalThis ensures the instance survives HMR reloads.
 *
 * 被引用于 / Imported by:
 *   所有 API 路由（非 mock 模式下）/ All API routes (when not in mock mode)
 *   e.g. src/app/api/cart/route.ts、products/route.ts 等
 *
 * 注意 / Note:
 *   使用 require() 而非 ES import 是为了规避 Prisma 5 在某些构建场景下的
 *   类型生成兼容性问题 / Using require() instead of ES import works around
 *   Prisma 5 type generation compatibility issues in certain build setups.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

/**
 * 在 globalThis 上声明一个可选的 prisma 属性，用于跨 HMR 保持单例
 * Declare an optional prisma property on globalThis for cross-HMR singleton
 */
const globalForPrisma = globalThis as unknown as { prisma?: any };

/**
 * prisma — 全局唯一的 Prisma 客户端实例（通过 Accelerate 代理）
 * prisma — the globally unique Prisma client instance (via Accelerate proxy)
 *
 * withAccelerate() 使 Prisma 通过 Accelerate 连接，兼容 Edge Runtime，
 * 同时支持 Cloudflare Pages 和 Vercel 部署。
 * withAccelerate() routes connections through Accelerate, making Prisma
 * compatible with Edge Runtime — works on both Cloudflare Pages and Vercel.
 */
export const prisma: any =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  }).$extends(withAccelerate());

// 非生产环境下将实例挂载到 global，使 HMR 重载后可复用
// In non-production, attach to global so HMR reloads can reuse the instance
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
