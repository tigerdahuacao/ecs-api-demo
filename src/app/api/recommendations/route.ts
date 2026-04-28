import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECOMMENDATIONS, isMock } from "@/lib/mock-data";
import type { ApiResponse, Recommendation } from "@/types";

// GET /api/recommendations?productId=xxx&limit=3
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "3", 10);

  if (!productId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "productId required" },
      { status: 400 }
    );
  }

  if (isMock()) {
    const recs = MOCK_RECOMMENDATIONS.filter((r) => r.productId === productId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return NextResponse.json<ApiResponse<Recommendation[]>>({ success: true, data: recs });
  }

  const { prisma } = await import("@/lib/prisma");
  const recs = await prisma.recommendation.findMany({
    where: { productId },
    orderBy: { score: "desc" },
    take: limit,
  });

  const relatedIds = (recs as Array<{ relatedId: string } & Record<string, unknown>>).map(
    (r) => r.relatedId
  );
  const products = await prisma.product.findMany({
    where: { id: { in: relatedIds } },
  });

  const productMap = new Map(
    (products as Array<{ id: string }>).map((p) => [p.id, p])
  );

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
