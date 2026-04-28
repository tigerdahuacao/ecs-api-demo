/**
 * @file src/app/api/cart/route.ts
 * GET /api/cart  — 获取购物车列表 / Get cart items
 * POST /api/cart — 加入购物车   / Add item to cart
 *
 * 调用方 / Called by:
 *   GET:
 *     CartView.fetchCart()     → 购物车页加载时 / On cart page load
 *     CheckoutView.fetchData() → 结算页加载时 / On checkout page load
 *   POST:
 *     ProductDetail.handleAddToCart()  → 商品页"加入购物车"
 *     RecommendationCard.handleAdd()   → 购物车页推荐商品加购
 *     ImpulseItem.handleAdd()          → 结算页冲动消费加购
 */
import { NextRequest, NextResponse } from "next/server";
import { MOCK_PRODUCTS, mockCart, isMock } from "@/lib/mock-data";
import type { ApiResponse, CartItem } from "@/types";

/**
 * GET /api/cart?sessionId=xxx — 返回指定会话的购物车条目（含关联商品信息）
 * GET /api/cart?sessionId=xxx — return cart items for a session (with product info)
 *
 * 查询参数 / Query params:
 *   sessionId (必填) — 匿名用户会话 ID / Anonymous user session ID (required)
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: CartItem[] }（每条含 product 关联）
 *   缺参 / Missing param: { success: false, error: "sessionId required" } (status 400)
 *
 * @param req 含 sessionId 查询参数的请求 / Request with sessionId query param
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "sessionId required" },
      { status: 400 }
    );
  }

  if (isMock()) {
    const items = mockCart.filter((i) => i.sessionId === sessionId);
    return NextResponse.json<ApiResponse<CartItem[]>>({ success: true, data: items });
  }

  const { prisma } = await import("@/lib/prisma");
  const items = await prisma.cartItem.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const productIds = [...new Set(items.map((i: { productId: string }) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(
    (products as Array<{ id: string }>).map((p) => [p.id, p])
  );

  const enriched = (items as Array<{ productId: string } & Record<string, unknown>>).map(
    (item) => ({
      ...item,
      product: productMap.get(item.productId),
    })
  );

  return NextResponse.json<ApiResponse<CartItem[]>>({
    success: true,
    data: enriched as unknown as CartItem[],
  });
}

/**
 * POST /api/cart — 加购商品（相同 sessionId+productId+specs 则合并数量）
 * POST /api/cart — add item to cart (merges quantity if same sessionId+productId+specs)
 *
 * 请求体 / Request body:
 *   { sessionId: string, productId: string, quantity: number, specs: Record<string,string> }
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: CartItem } (status 201)（含 product 关联）
 *   缺参 / Missing fields: { success: false, error: "Missing required fields" } (status 400)
 *   商品不存在 / Product not found: { success: false, error: "Product not found" } (status 404)
 *
 * @param req 含购物车条目数据的请求体 / Request with cart item data in body
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    sessionId: string;
    productId: string;
    quantity: number;
    specs: Record<string, string>;
  };

  const { sessionId, productId, quantity, specs } = body;

  if (!sessionId || !productId || !quantity) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (isMock()) {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const existing = mockCart.find(
      (i) =>
        i.sessionId === sessionId &&
        i.productId === productId &&
        JSON.stringify(i.specs) === JSON.stringify(specs)
    );

    if (existing) {
      existing.quantity += quantity;
      return NextResponse.json<ApiResponse<CartItem>>(
        { success: true, data: existing },
        { status: 201 }
      );
    }

    const newItem: CartItem = {
      id: `mock-cart-${Date.now()}`,
      sessionId,
      productId,
      quantity,
      specs,
      createdAt: new Date(),
      product,
    };
    mockCart.push(newItem);
    return NextResponse.json<ApiResponse<CartItem>>(
      { success: true, data: newItem },
      { status: 201 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.cartItem.findFirst({
    where: { sessionId, productId, specs: { equals: specs } },
  });

  let item;
  if (existing) {
    item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    item = await prisma.cartItem.create({
      data: { sessionId, productId, quantity, specs },
    });
  }

  return NextResponse.json<ApiResponse<CartItem>>(
    { success: true, data: { ...item, product } as unknown as CartItem },
    { status: 201 }
  );
}
