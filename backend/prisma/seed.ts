/**
 * Seed script: migrates the static menu from lib/menu.ts into the database.
 * Run once: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORDER_CATEGORIES = [
  "Benne Bliss",
  "Classic Dosas",
  "Idli",
  "Uttapam",
  "Beverages",
];

const ORDER_MENU = [
  /* ─── Benne Bliss ─────────────────────── */
  { name: "Plain Benne Dosa", price: 140, category: "Benne Bliss", image: "/images/menu/plain-benne-dosa.jpg", descriptionEn: "Authentic Davanagere style dosa with fresh butter, potato palya & coconut chutney.", descriptionHi: "ताजा मक्खन, आलू पाल्य और नारियल चटनी के साथ दावणगेरे शैली का डोसा।", rating: 4.8, ratingCount: 320 },
  { name: "Masala Benne Dosa", price: 160, category: "Benne Bliss", image: "/images/menu/masala-benne-dosa.jpg", descriptionEn: "Crispy benne dosa with generous spicy potato masala & extra butter.", descriptionHi: "मसालेदार आलू मसाला और अतिरिक्त मक्खन के साथ कुरकुरा बेने डोसा।", rating: 4.9, ratingCount: 450 },
  { name: "Ghee Podi Benne Dosa", price: 160, category: "Benne Bliss", image: "/images/menu/ghee-podi-benne-dosa.jpg", descriptionEn: "Dosa coated with aromatic ghee and signature spicy podi.", descriptionHi: "खुशबूदार घी और सिग्नेचर मसालेदार पोडी के साथ डोसा।", rating: 4.7, ratingCount: 215 },
  { name: "Ghee Podi Masala Benne Dosa", price: 180, category: "Benne Bliss", image: "/images/menu/ghee-podi-masala-benne-dosa.jpg", descriptionEn: "Ultimate combo of ghee, podi & spicy potato masala in crispy benne dosa.", descriptionHi: "कुरकुरे बेने डोसे में घी, पोडी और मसालेदार आलू मसाला।", rating: 4.9, ratingCount: 512 },
  { name: "Garlic Ghee Roast Benne Dosa", price: 200, category: "Benne Bliss", image: "/images/menu/garlic-ghee-roast-benne-dosa.jpg", descriptionEn: "Slow roasted with garlic infused ghee for a unique savory flavor.", descriptionHi: "लहसुन युक्त घी के साथ धीरे-धीरे भुना हुआ।", rating: 4.6, ratingCount: 180 },
  { name: "Paneer Benne Dosa", price: 200, category: "Benne Bliss", image: "/images/menu/paneer-benne-dosa.jpg", descriptionEn: "Benne dosa stuffed with rich & spicy paneer crumble filling.", descriptionHi: "मसालेदार पनीर क्रम्बल के साथ भरा हुआ बेने डोसा।", rating: 4.5, ratingCount: 145 },

  /* ─── Classic Dosas ───────────────────── */
  { name: "Plain Dosa", price: 90, category: "Classic Dosas", image: "/images/menu/plain-dosa.jpg", descriptionEn: "Thin, crispy rice & lentil crepe served with chutney and sambar.", descriptionHi: "पतला कुरकुरा क्रेप, चटनी और सांभर के साथ।", rating: 4.5, ratingCount: 110 },
  { name: "Masala Dosa", price: 120, category: "Classic Dosas", image: "/images/menu/masala-dosa.jpg", descriptionEn: "Classic crispy dosa with traditional spiced potato filling.", descriptionHi: "पारंपरिक मसालेदार आलू भरने के साथ क्लासिक कुरकुरा डोसा।", rating: 4.7, ratingCount: 380 },
  { name: "Ghee Podi Masala Dosa", price: 140, category: "Classic Dosas", image: "/images/menu/ghee-podi-masala-dosa.jpg", descriptionEn: "Classic masala dosa enhanced with aromatic ghee and spicy podi.", descriptionHi: "खुशबूदार घी और पोडी के साथ क्लासिक मसाला डोसा।", rating: 4.8, ratingCount: 290 },
  { name: "Mysore Masala Dosa", price: 140, category: "Classic Dosas", image: "/images/menu/mysore-masala-dosa.jpg", descriptionEn: "Spicy garlic chutney spread inside a crispy dosa with potato masala.", descriptionHi: "मसालेदार लहसुन चटनी और आलू मसाला वाला कुरकुरा डोसा।", rating: 4.6, ratingCount: 160 },
  { name: "Paneer Dosa", price: 140, category: "Classic Dosas", image: "/images/menu/paneer-dosa.jpg", descriptionEn: "Classic dosa filled with spiced grated paneer.", descriptionHi: "मसालेदार कसा हुआ पनीर के साथ क्लासिक डोसा।", rating: 4.4, ratingCount: 130 },
  { name: "Butter Paneer Dosa", price: 160, category: "Classic Dosas", image: "/images/menu/butter-paneer-dosa.jpg", descriptionEn: "Rich buttery dosa with a spicy paneer filling.", descriptionHi: "मसालेदार पनीर भरने वाला मक्खन डोसा।", rating: 4.5, ratingCount: 190 },

  /* ─── Idli ────────────────────────────── */
  { name: "Idli - 2 pc", price: 50, category: "Idli", image: "/images/menu/idli.jpg", descriptionEn: "Soft steamed rice cakes, a South Indian breakfast staple.", descriptionHi: "नरम स्टीम्ड राइस केक, दक्षिण भारतीय नाश्ता।", rating: 4.8, ratingCount: 420 },
  { name: "Ghee Podi Idli - 2pc", price: 70, category: "Idli", image: "/images/menu/ghee-podi-idli.jpg", descriptionEn: "Idlis tossed in aromatic ghee and spicy lentil powder.", descriptionHi: "घी और मसालेदार दाल पाउडर में लिपटी इडली।", rating: 4.9, ratingCount: 310 },
  { name: "Ghee Podi Thatte Idli - 1pc", price: 70, category: "Idli", image: "/images/menu/thatte-idli.jpg", descriptionEn: "Larger flat idli topped with ghee and spicy podi.", descriptionHi: "घी और पोडी के साथ बड़ी चपटी इडली।", rating: 4.7, ratingCount: 155 },

  /* ─── Uttapam ─────────────────────────── */
  { name: "Veg Uttapam", price: 100, category: "Uttapam", image: "/images/menu/veg-uttapam.jpg", descriptionEn: "Thick savory pancake topped with onions, tomatoes & chilies.", descriptionHi: "प्याज, टमाटर और मिर्च वाला मोटा नमकीन पैनकेक।", rating: 4.5, ratingCount: 125 },
  { name: "Podi Masala Uttapam", price: 120, category: "Uttapam", image: "/images/menu/podi-masala-uttapam.jpg", descriptionEn: "Thick savory pancake topped with spicy podi and vegetables.", descriptionHi: "मसालेदार पोडी और सब्जियों वाला मोटा पैनकेक।", rating: 4.6, ratingCount: 140 },

  /* ─── Beverages ───────────────────────── */
  { name: "Filter Coffee", price: 40, category: "Beverages", image: "/images/menu/filter-coffee.jpg", descriptionEn: "Traditional South Indian decoction coffee with hot milk.", descriptionHi: "गर्म दूध के साथ पारंपरिक दक्षिण भारतीय फिल्टर कॉफी।", rating: 4.9, ratingCount: 650 },
  { name: "Iced Filter Coffee", price: 90, category: "Beverages", image: "/images/menu/iced-filter-coffee.jpg", descriptionEn: "Our signature filter coffee served chilled over ice.", descriptionHi: "बर्फ के साथ ठंडी सिग्नेचर फिल्टर कॉफी।", rating: 4.7, ratingCount: 220 },
  { name: "Tea", price: 25, category: "Beverages", image: "/images/menu/tea.jpg", descriptionEn: "Classic spiced tea made with fresh milk.", descriptionHi: "ताजा दूध के साथ बनी क्लासिक मसाला चाय।" },
  { name: "Mineral Water", price: 10, category: "Beverages", image: "/images/menu/mineral-water.jpg", descriptionEn: "Chilled bottled mineral water.", descriptionHi: "ठंडा बोतलबंद मिनरल वाटर।" },
  {
    name: "Soft Drinks", price: 20, category: "Beverages",
    image: "/images/menu/soft-drinks.jpg",
    priceLabel: "MRP",
    descriptionEn: "Chilled 250ml soft drink — Thums Up, Coke, Diet Coke, or Sprite.",
    descriptionHi: "ठंडा सॉफ्ट ड्रिंक — थम्स अप, कोक, डाइट कोक या स्प्राइट।",
    variants: ["Thums Up", "Coke", "Diet Coke", "Sprite"],
    variantPrices: { "Thums Up": 20, "Coke": 20, "Diet Coke": 30, "Sprite": 20 }
  },
  { name: "Buttermilk", price: 40, category: "Beverages", image: "/images/menu/buttermilk.jpg", descriptionEn: "Refreshing spiced yogurt drink with coriander & ginger.", descriptionHi: "धनिया और अदरक के साथ ताज़ा मसालेदार छाछ।", rating: 4.6, ratingCount: 185 },

  /* ─── Others (hidden from ordering UI) ── */
  { name: "Packing Charges", price: 20, category: "Others" },
];

async function seed() {
  console.log("🌱 Seeding menu data...\n");

  // Create categories
  const categoryMap: Record<string, string> = {};
  for (let i = 0; i < ORDER_CATEGORIES.length; i++) {
    const cat = await prisma.category.upsert({
      where: { name: ORDER_CATEGORIES[i] },
      update: { sortOrder: i },
      create: { name: ORDER_CATEGORIES[i], sortOrder: i },
    });
    categoryMap[ORDER_CATEGORIES[i]] = cat.id;
    console.log(`  ✓ Category: ${cat.name} (${cat.id})`);
  }

  // Also create "Others" category for packing charges etc.
  const othersCat = await prisma.category.upsert({
    where: { name: "Others" },
    update: { sortOrder: 99 },
    create: { name: "Others", sortOrder: 99 },
  });
  categoryMap["Others"] = othersCat.id;
  console.log(`  ✓ Category: Others (${othersCat.id})\n`);

  // Create menu items
  for (let i = 0; i < ORDER_MENU.length; i++) {
    const item = ORDER_MENU[i];
    const categoryId = categoryMap[item.category];
    if (!categoryId) {
      console.warn(`  ⚠ Skipping "${item.name}" — category "${item.category}" not found`);
      continue;
    }

    // Check if item already exists (by name + category)
    const existing = await prisma.menuItem.findFirst({
      where: { name: item.name, categoryId },
    });

    if (existing) {
      console.log(`  → Updating: ${item.name}`);
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          price: item.price,
          descriptionEn: item.descriptionEn || null,
          descriptionHi: item.descriptionHi || null,
          image: item.image || null,
          priceLabel: (item as any).priceLabel || null,
          rating: (item as any).rating || null,
          ratingCount: (item as any).ratingCount || null,
          variants: (item as any).variants || [],
          variantPrices: (item as any).variantPrices || undefined,
          sortOrder: i,
        },
      });
    } else {
      console.log(`  + Creating: ${item.name}`);
      await prisma.menuItem.create({
        data: {
          name: item.name,
          price: item.price,
          categoryId,
          descriptionEn: item.descriptionEn || null,
          descriptionHi: item.descriptionHi || null,
          image: item.image || null,
          priceLabel: (item as any).priceLabel || null,
          rating: (item as any).rating || null,
          ratingCount: (item as any).ratingCount || null,
          variants: (item as any).variants || [],
          variantPrices: (item as any).variantPrices || undefined,
          sortOrder: i,
        },
      });
    }
  }

  // Create initial version snapshot
  const allCategories = await prisma.category.findMany({ include: { items: true }, orderBy: { sortOrder: "asc" } });
  await prisma.menuVersion.create({
    data: {
      snapshot: JSON.parse(JSON.stringify(allCategories)),
      note: "Initial seed from static menu data",
    },
  });

  console.log("\n✅ Seed complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
