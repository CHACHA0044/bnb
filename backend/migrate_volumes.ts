import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateVolumes() {
  console.log("Starting volume migration...");
  
  const updates = [
    { name: "Sprite", volume: "250 ml" },
    { name: "Diet Coke", volume: "200 ml" },
    { name: "Thums Up", volume: "250 ml" },
    { name: "Coke", volume: "400 ml" },
    { name: "Mineral Water", volume: "1 L" }
  ];

  for (const update of updates) {
    // @ts-ignore
    const result = await prisma.menuItem.updateMany({
      where: {
        OR: [
          { name: { contains: update.name, mode: 'insensitive' } }
        ]
      },
      data: {
        volume: update.volume
      }
    });
    console.log(`Updated volume for items matching "${update.name}" (${result.count} items)`);
  }

  // Update variants
  const itemsWithVariants = await prisma.menuItem.findMany({
    where: {
      variants: {
        isEmpty: false
      }
    }
  });

  console.log(`Checking ${itemsWithVariants.length} items with variants...`);

  for (const item of itemsWithVariants) {
    let prices = item.variantPrices as any || {};
    let changed = false;

    for (const vName of item.variants) {
      for (const u of updates) {
        if (vName.toLowerCase().includes(u.name.toLowerCase())) {
          if (typeof prices[vName] === 'number') {
            prices[vName] = { price: prices[vName], volume: u.volume };
            changed = true;
          } else if (typeof prices[vName] === 'object' && prices[vName] !== null && !prices[vName].volume) {
            prices[vName].volume = u.volume;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: {
          variantPrices: prices
        }
      });
      console.log(`Updated variant volumes for item: ${item.name}`);
    }
  }

  console.log("Migration complete!");
}

migrateVolumes()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
