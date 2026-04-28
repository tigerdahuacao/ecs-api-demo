import { NextRequest, NextResponse } from "next/server";
import { MOCK_PRODUCTS, mockCart, isMock } from "@/lib/mock-data";
import type { ApiResponse, CartItem } from "@/types";

// GET /api/cart?sessionId=xxx
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

// POST /api/cart
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
