import { NextRequest, NextResponse } from "next/server";
import { MOCK_PRODUCTS, isMock } from "@/lib/mock-data";
import type { ApiResponse, Product } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Product ID required" },
      { status: 400 }
    );
  }

  if (isMock()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse<Product>>({ success: true, data: product });
  }

  const { prisma } = await import("@/lib/prisma");
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResponse<Product>>({
    success: true,
    data: product as unknown as Product,
  });
}
