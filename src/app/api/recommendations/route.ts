/**
 * @file src/app/api/recommendations/route.ts
 * GET /api/recommendations — 商品推荐接口 / Product recommendations API
 *
 * 作用 / Purpose:
 *   根据指定商品 ID，返回相关推荐商品列表（含完整商品信息）。
 *   mock 模式下从 MOCK_RECOMMENDATIONS 过滤；真实模式下从 MongoDB 查询并 join 商品表。
 *
 *   Returns recommended products for a given product ID (with full product info).
 *   Mock mode: filters from MOCK_RECOMMENDATIONS.
 *   Real mode: queries MongoDB and joins the product table.
 *
 * 查询参数 / Query params:
 *   productId (必填) — 触发推荐的商品 ID / The product ID that triggers recommendations
 *   limit (可选, 默认 3) — 最多返回几条推荐 / Max number of recommendations to return
 *
 * 调用方 / Called by:
 *   CartView.fetchCart()      → GET /api/recommendations?productId=...&limit=3（购物车推荐区）
 *   CheckoutView.fetchData()  → GET /api/recommendations?productId=...&limit=2（结算页冲动消费区）
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: Recommendation[] }（含 relatedProduct 字段）
 *   缺少参数 / Missing param: { success: false, error: "productId required" } (status 400)
 */
import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECOMMENDATIONS, isMock } from "@/lib/mock-data";
import type { ApiResponse, Recommendation } from "@/types";

export const runtime = 'edge';

/**
 * GET — 返回指定商品的推荐列表
 * GET — return recommendations for a specific product
 *
 * @param req 请求对象（从 URL 读取 productId 和 limit）/ Request (reads productId and limit from URL)
 * @returns ApiResponse<Recommendation[]>（每条包含 relatedProduct 完整信息）
 *          Each item includes full relatedProduct info
 */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "3", 10);

  // 参数校验 / Parameter validation
  if (!productId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "productId required" },
      { status: 400 }
    );
  }

  // mock 模式：按 productId 过滤并按 score 降序取 top N
  // Mock mode: filter by productId, sort by score descending, take top N
  if (isMock()) {
    const recs = MOCK_RECOMMENDATIONS.filter((r) => r.productId === productId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return NextResponse.json<ApiResponse<Recommendation[]>>({ success: true, data: recs });
  }

  // 真实模式：从数据库查询推荐关系，再 join 被推荐商品的完整信息
  // Real mode: query recommendation relations, then join full product info for each
  const { prisma } = await import("@/lib/prisma");
  const recs = await prisma.recommendation.findMany({
    where: { productId },
    orderBy: { score: "desc" },
    take: limit,
  });

  // 收集所有被推荐商品的 ID，批量查询（避免 N+1）
  // Collect all related product IDs, batch query (avoids N+1)
  const relatedIds = (recs as Array<{ relatedId: string } & Record<string, unknown>>).map(
    (r) => r.relatedId
  );
  const products = await prisma.product.findMany({
    where: { id: { in: relatedIds } },
  });

  // 构建 productId → product 的查找 Map，O(1) 关联
  // Build a productId → product lookup Map for O(1) association
  const productMap = new Map(
    (products as Array<{ id: string }>).map((p) => [p.id, p])
  );

  // 将 relatedProduct 嵌入每条推荐记录
  // Embed relatedProduct into each recommendation record
  const enriched = (recs as Array<{ relatedId: string } & Record<string, unknown>>).map(
    (r) => ({
      ...r,
      relatedProduct: productMap.get(r.relatedId),
    })
  );

  return NextResponse.json<ApiResponse<Recommendation[]>>({
    success: true,
    data: enriched as unknown as Recommendation[],
  });
}
