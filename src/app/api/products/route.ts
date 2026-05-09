/**
 * @file src/app/api/products/route.ts
 * GET /api/products — 商品列表接口 / Product list API
 *
 * 作用 / Purpose:
 *   返回所有商品列表。mock 模式下从内存中的 MOCK_PRODUCTS 读取；
 *   真实模式下从 MongoDB（通过 Prisma）查询。
 *
 *   Returns the list of all products. In mock mode, reads from the in-memory
 *   MOCK_PRODUCTS array. In real mode, queries MongoDB via Prisma.
 *
 * 调用方 / Called by:
 *   ProductDetail.tsx → fetchProduct()（GET /api/products 拉取第一个商品展示）
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: Product[] }
 *
 * 注意 / Note:
 *   目前 ProductDetail 直接取第一个商品展示，生产环境应改为 GET /api/products/[id]
 *   按商品 ID 查询。Currently ProductDetail takes the first product; production
 *   should use GET /api/products/[id] with a specific product ID.
 */
import { NextResponse } from "next/server";
import { MOCK_PRODUCTS, isMock } from "@/lib/mock-data";
import type { ApiResponse, Product } from "@/types";

export const runtime = 'edge';

/**
 * GET — 返回所有商品列表
 * GET — return all products
 *
 * @returns ApiResponse<Product[]>
 */
export async function GET() {
  // mock 模式：直接返回内存中的静态商品数据 / Mock mode: return in-memory static products
  if (isMock()) {
    return NextResponse.json<ApiResponse<Product[]>>({
      success: true,
      data: MOCK_PRODUCTS,
    });
  }

  // 真实模式：从数据库查询，按创建时间降序排列
  // Real mode: query database, ordered by creation time descending
  const { prisma } = await import("@/lib/prisma");
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json<ApiResponse<Product[]>>({
    success: true,
    data: products as unknown as Product[],
  });
}
