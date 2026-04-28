/**
 * @file src/app/api/products/[id]/route.ts
 * GET /api/products/:id — 单个商品详情接口 / Single product detail API
 *
 * 作用 / Purpose:
 *   根据商品 ID 返回单个商品的完整信息。
 *   mock 模式下从 MOCK_PRODUCTS 数组中查找；真实模式下从 MongoDB 查询。
 *
 *   Returns full details for a single product by ID.
 *   Mock mode: finds from MOCK_PRODUCTS array.
 *   Real mode: queries MongoDB.
 *
 * 调用方 / Called by:
 *   目前未被前端直接调用（ProductDetail 使用 GET /api/products 取第一个商品）。
 *   保留供未来按 ID 查询商品时使用。
 *   Not directly called by the frontend yet (ProductDetail uses GET /api/products
 *   and takes the first product). Retained for future product-by-ID queries.
 *
 * 路由参数 / Route params:
 *   id — 商品 ID（MongoDB ObjectId 格式 / MongoDB ObjectId format）
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: Product }
 *   找不到 / Not found: { success: false, error: "Product not found" } (status 404)
 *   缺少 ID / Missing ID: { success: false, error: "Product ID required" } (status 400)
 */
import { NextRequest, NextResponse } from "next/server";
import { MOCK_PRODUCTS, isMock } from "@/lib/mock-data";
import type { ApiResponse, Product } from "@/types";

/**
 * GET — 根据 ID 返回单个商品
 * GET — return a single product by ID
 *
 * @param _req 请求对象（本接口不读取 request body）/ Request object (body not used)
 * @param params.id 动态路由中的商品 ID / Product ID from dynamic route
 * @returns ApiResponse<Product>
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 参数校验 / Parameter validation
  if (!id) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Product ID required" },
      { status: 400 }
    );
  }

  // mock 模式：从内存数组中查找 / Mock mode: find from in-memory array
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

  // 真实模式：数据库查询 / Real mode: database query
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
