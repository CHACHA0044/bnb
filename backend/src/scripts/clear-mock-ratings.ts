import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const realRatingItems = [
  "Plain Benne Dosa",
  "Masala Benne Dosa",
  "Ghee Podi Benne Dosa",
  "Ghee Podi Masala Benne Dosa",
  "Garlic Ghee Roast Benne Dosa",
  "Plain Dosa",
  "Masala Dosa",
  "Ghee Podi Masala Dosa",
  "Mysore Masala Dosa",
  "Idli - 2 pc",
  "Ghee Podi Idli - 2pc",
  "Ghee Podi Thatte Idli - 1pc",
  "Veg Uttapam",
  "Podi Masala Uttapam",
  "Filter Coffee"
];

async function main() {
  console.log("Cleaning up mock ratings...");

  const cleared = await prisma.menuItem.updateMany({
    where: {
      name: { notIn: realRatingItems },
      OR: [
        { rating: { not: null } },
        { ratingCount: { not: null } }
      ]
    },
    data: {
      rating: null,
      ratingCount: null,
    },
  });

  console.log(`Cleared mock ratings for ${cleared.count} items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
