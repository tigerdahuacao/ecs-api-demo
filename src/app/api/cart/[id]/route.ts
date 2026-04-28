/**
 * @file src/app/api/cart/[id]/route.ts
 * PATCH /api/cart/:id — 更新购物车条目数量 / Update cart item quantity
 * DELETE /api/cart/:id — 删除购物车条目 / Delete cart item
 *
 * 路由参数 / Route params:
 *   id — 购物车条目 ID (CartItem.id)
 *
 * 被引用于 / Called by:
 *   CartView.handleQuantityChange() → PATCH（修改数量）
 *   CartView.handleRemove()         → DELETE（删除条目）
 */
import { NextRequest, NextResponse } from "next/server";
import { mockCart, isMock } from "@/lib/mock-data";
import type { ApiResponse, CartItem } from "@/types";

/**
 * PATCH /api/cart/:id — 更新指定购物车条目的数量
 * PATCH /api/cart/:id — update quantity for a specific cart item
 *
 * 请求体 / Request body: { quantity: number }
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true, data: CartItem }（更新后的条目 / Updated item）
 *   数量无效 / Invalid qty: { success: false, error: "quantity must be >= 1" } (status 400)
 *   找不到 / Not found: { success: false, error: "Cart item not found" } (status 404)
 *
 * @param req 含 { quantity } 的请求体 / Request with { quantity } body
 * @param params.id 购物车条目 ID / Cart item ID
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { quantity } = (await req.json()) as { quantity: number };

  // 参数校验：数量必须 >= 1 / Validate: quantity must be >= 1
  if (!quantity || quantity < 1) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "quantity must be >= 1" },
      { status: 400 }
    );
  }

  // mock 模式：直接修改内存中的 mockCart 条目
  // Mock mode: directly mutate the in-memory mockCart item
  if (isMock()) {
    const item = mockCart.find((i) => i.id === id);
    if (!item) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cart item not found" },
        { status: 404 }
      );
    }
    item.quantity = quantity;  // 直接赋值（mock 场景下允许 mutation）/ Direct assignment OK in mock
    return NextResponse.json<ApiResponse<CartItem>>({ success: true, data: item });
  }

  // 真实模式：数据库更新 / Real mode: update in database
  const { prisma } = await import("@/lib/prisma");
  const item = await prisma.cartItem.update({ where: { id }, data: { quantity } });

  return NextResponse.json<ApiResponse<CartItem>>({
    success: true,
    data: item as unknown as CartItem,
  });
}

/**
 * DELETE /api/cart/:id — 删除指定购物车条目
 * DELETE /api/cart/:id — remove a specific cart item
 *
 * 响应格式 / Response format:
 *   成功 / Success: { success: true }（无 data 字段）/ No data field
 *
 * @param _req 请求对象（本接口不读取 body）/ Request object (body not read)
 * @param params.id 购物车条目 ID / Cart item ID
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // mock 模式：从内存数组中删除 / Mock mode: splice from in-memory array
  if (isMock()) {
    const idx = mockCart.findIndex((i) => i.id === id);
    if (idx !== -1) mockCart.splice(idx, 1);
    return NextResponse.json<ApiResponse<null>>({ success: true });
  }

  // 真实模式：数据库删除 / Real mode: delete from database
  const { prisma } = await import("@/lib/prisma");
  await prisma.cartItem.delete({ where: { id } });

  return NextResponse.json<ApiResponse<null>>({ success: true });
}
