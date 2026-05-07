/**
 * Seed script for the e-commerce demo database.
 * Run with: pnpm prisma db seed
 *
 * Creates:
 * - 5 mug products with i18n names, specs, images
 * - Recommendation edges between products
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.recommendation.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();

  // Create 5 products (mugs)
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: { zh: "青釉马克杯", en: "Celadon Mug" },
        description: {
          zh: "精选优质陶瓷，青绿釉色温润如玉，适合日常茶饮与咖啡享用。杯身厚实，保温效果出色。",
          en: "Premium ceramic with a warm celadon glaze. Thick walls for excellent heat retention, perfect for daily tea and coffee.",
        },
        price: 89.0,
        images: [
          "/products/mug-1.jpg",
          "/products/mug-2.jpg",
        ],
        category: "mug",
        specs: [
          {
            name: { zh: "颜色", en: "Color" },
            key: "color",
            options: [
              { value: "teal", label: { zh: "青绿", en: "Teal" } },
              { value: "white", label: { zh: "纯白", en: "White" } },
              { value: "navy", label: { zh: "深蓝", en: "Navy" } },
              { value: "terracotta", label: { zh: "砖红", en: "Terracotta" } },
            ],
          },
          {
            name: { zh: "规格", en: "Size" },
            key: "size",
            options: [
              { value: "small", label: { zh: "小杯 280ml", en: "Small 280ml" } },
              { value: "medium", label: { zh: "中杯 380ml", en: "Medium 380ml" } },
              { value: "large", label: { zh: "大杯 480ml", en: "Large 480ml" } },
            ],
          },
        ],
        stock: 100,
      },
    }),
    prisma.product.create({
      data: {
        name: { zh: "竹节纹陶杯", en: "Bamboo Texture Cup" },
        description: {
          zh: "以竹节为灵感设计，手感凹凸立体，防滑耐用，适合冷热饮品。",
          en: "Inspired by bamboo joints, with a textured grip surface. Versatile for hot and cold drinks.",
        },
        price: 65.0,
        images: [
          "/products/mug-3.jpg",
        ],
        category: "mug",
        specs: [
          {
            name: { zh: "颜色", en: "Color" },
            key: "color",
            options: [
              { value: "natural", label: { zh: "原木色", en: "Natural" } },
              { value: "charcoal", label: { zh: "炭黑", en: "Charcoal" } },
            ],
          },
          {
            name: { zh: "规格", en: "Size" },
            key: "size",
            options: [
              { value: "small", label: { zh: "小杯 250ml", en: "Small 250ml" } },
              { value: "large", label: { zh: "大杯 400ml", en: "Large 400ml" } },
            ],
          },
        ],
        stock: 80,
      },
    }),
    prisma.product.create({
      data: {
        name: { zh: "手工拉坯茶杯", en: "Handmade Wheel-thrown Teacup" },
        description: {
          zh: "由匠人手工拉坯制作，每只杯型略有差异，独一无二。釉色自然流动，气韵生动。",
          en: "Hand-thrown by artisans, each piece is unique. Natural glaze flows create one-of-a-kind patterns.",
        },
        price: 128.0,
        images: [
          "/products/mug-4.jpg",
        ],
        category: "teacup",
        specs: [
          {
            name: { zh: "釉色", en: "Glaze" },
            key: "glaze",
            options: [
              { value: "ash", label: { zh: "草木灰", en: "Wood Ash" } },
              { value: "celadon", label: { zh: "青瓷", en: "Celadon" } },
              { value: "tenmoku", label: { zh: "天目", en: "Tenmoku" } },
            ],
          },
        ],
        stock: 30,
      },
    }),
    prisma.product.create({
      data: {
        name: { zh: "玻璃双层保温杯", en: "Double-wall Glass Tumbler" },
        description: {
          zh: "双层硼硅酸盐玻璃，保温隔热，外壁不烫手，适合咖啡与热饮。",
          en: "Double-wall borosilicate glass keeps drinks hot without burning your hands. Ideal for coffee.",
        },
        price: 99.0,
        images: [
          "/products/mug-5.jpg",
        ],
        category: "tumbler",
        specs: [
          {
            name: { zh: "容量", en: "Volume" },
            key: "volume",
            options: [
              { value: "250ml", label: { zh: "250ml", en: "250ml" } },
              { value: "350ml", label: { zh: "350ml", en: "350ml" } },
            ],
          },
        ],
        stock: 60,
      },
    }),
    prisma.product.create({
      data: {
        name: { zh: "旅行咖啡杯套装", en: "Travel Coffee Cup Set" },
        description: {
          zh: "含隔热杯套与便携盖，可折叠硅胶设计，轻便出行必备。",
          en: "Includes insulating sleeve and travel lid. Collapsible silicone design, perfect for on-the-go.",
        },
        price: 149.0,
        images: [
          "/products/mug-6.jpg",
        ],
        category: "travel",
        specs: [
          {
            name: { zh: "颜色", en: "Color" },
            key: "color",
            options: [
              { value: "sage", label: { zh: "鼠尾草绿", en: "Sage Green" } },
              { value: "blush", label: { zh: "腮红粉", en: "Blush Pink" } },
              { value: "slate", label: { zh: "石板灰", en: "Slate" } },
            ],
          },
        ],
        stock: 50,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create recommendation edges (bidirectional)
  const [p0, p1, p2, p3, p4] = products;

  await prisma.recommendation.createMany({
    data: [
      { productId: p0.id, relatedId: p1.id, score: 0.9 },
      { productId: p0.id, relatedId: p2.id, score: 0.8 },
      { productId: p0.id, relatedId: p3.id, score: 0.7 },
      { productId: p1.id, relatedId: p0.id, score: 0.9 },
      { productId: p1.id, relatedId: p4.id, score: 0.85 },
      { productId: p2.id, relatedId: p0.id, score: 0.8 },
      { productId: p2.id, relatedId: p3.id, score: 0.75 },
      { productId: p3.id, relatedId: p4.id, score: 0.9 },
      { productId: p4.id, relatedId: p0.id, score: 0.7 },
      { productId: p4.id, relatedId: p3.id, score: 0.8 },
    ],
  });

  console.log("✅ Created recommendation edges");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
