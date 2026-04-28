import { NextRequest, NextResponse } from "next/server";
import { mockCart, isMock } from "@/lib/mock-data";
import type { ApiResponse, CartItem } from "@/types";

// PATCH /api/cart/:id — update quantity
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { quantity } = (await req.json()) as { quantity: number };

  if (!quantity || quantity < 1) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "quantity must be >= 1" },
      { status: 400 }
    );
  }

  if (isMock()) {
    const item = mockCart.find((i) => i.id === id);
    if (!item) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cart item not found" },
        { status: 404 }
      );
    }
    item.quantity = quantity;
    return NextResponse.json<ApiResponse<CartItem>>({ success: true, data: item });
  }

  const { prisma } = await import("@/lib/prisma");
  const item = await prisma.cartItem.update({ where: { id }, data: { quantity } });

  return NextResponse.json<ApiResponse<CartItem>>({
    success: true,
    data: item as unknown as CartItem,
  });
}

// DELETE /api/cart/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (isMock()) {
    const idx = mockCart.findIndex((i) => i.id === id);
    if (idx !== -1) mockCart.splice(idx, 1);
    return NextResponse.json<ApiResponse<null>>({ success: true });
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.cartItem.delete({ where: { id } });

  return NextResponse.json<ApiResponse<null>>({ success: true });
}
