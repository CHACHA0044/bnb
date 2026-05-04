import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ratingsData = [
  { name: "Plain Benne Dosa", rating: 4.8, ratingCount: 5 },
  { name: "Masala Benne Dosa", rating: 4.9, ratingCount: 12 },
  { name: "Ghee Podi Benne Dosa", rating: 4.8, ratingCount: 8 },
  { name: "Ghee Podi Masala Benne Dosa", rating: 5.0, ratingCount: 10 },
  { name: "Garlic Ghee Roast Benne Dosa", rating: 4.7, ratingCount: 2 },
  { name: "Plain Dosa", rating: 4.5, ratingCount: 3 },
  { name: "Masala Dosa", rating: 4.7, ratingCount: 5 },
  { name: "Ghee Podi Masala Dosa", rating: 4.8, ratingCount: 4 },
  { name: "Mysore Masala Dosa", rating: 4.8, ratingCount: 6 },
  { name: "Idli - 2 pc", rating: 4.7, ratingCount: 4 },
  { name: "Ghee Podi Idli - 2pc", rating: 4.9, ratingCount: 15 },
  { name: "Ghee Podi Thatte Idli - 1pc", rating: 4.9, ratingCount: 12 },
  { name: "Veg Uttapam", rating: 4.6, ratingCount: 2 },
  { name: "Podi Masala Uttapam", rating: 4.8, ratingCount: 3 },
  { name: "Filter Coffee", rating: 4.9, ratingCount: 25 },
];

async function main() {
  console.log("Updating menu item ratings from Google Maps data...");

  for (const data of ratingsData) {
    const updated = await prisma.menuItem.updateMany({
      where: { name: data.name },
      data: {
        rating: data.rating,
        ratingCount: data.ratingCount,
      },
    });
    console.log(`Updated ${data.name}: ${updated.count} items affected`);
  }

  // Clear ratings for Water and Soft Drinks (just in case they have any)
  const cleared = await prisma.menuItem.updateMany({
    where: {
      OR: [
        { name: { contains: "Water", mode: "insensitive" } },
        { name: { contains: "Soft Drink", mode: "insensitive" } },
      ],
    },
    data: {
      rating: null,
      ratingCount: null,
    },
  });
  console.log(`Cleared ratings for ${cleared.count} water/soft drink items`);

  console.log("Database update complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
