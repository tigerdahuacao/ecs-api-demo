import { NextResponse } from "next/server";
import { MOCK_PRODUCTS, isMock } from "@/lib/mock-data";
import type { ApiResponse, Product } from "@/types";

export async function GET() {
  if (isMock()) {
    return NextResponse.json<ApiResponse<Product[]>>({
      success: true,
      data: MOCK_PRODUCTS,
    });
  }

  const { prisma } = await import("@/lib/prisma");
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json<ApiResponse<Product[]>>({
    success: true,
    data: products as unknown as Product[],
  });
}
