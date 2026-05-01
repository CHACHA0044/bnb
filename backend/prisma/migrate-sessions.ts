import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all sessions...");
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${sessions.length} sessions.`);

  // Group by date (local timezone or UTC offset). Let's use UTC for simplicity as a date string
  const groupedByDate: Record<string, typeof sessions> = {};

  for (const session of sessions) {
    // Treat everything from 4 AM today to 4 AM tomorrow as the same "business day"
    const date = new Date(session.createdAt);
    // Subtract 4 hours so that 3 AM belongs to the previous day
    const businessDate = new Date(date.getTime() - 4 * 60 * 60 * 1000);
    const dateString = businessDate.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!groupedByDate[dateString]) {
      groupedByDate[dateString] = [];
    }
    groupedByDate[dateString].push(session);
  }

  console.log("Updating session numbers...");
  let count = 0;

  for (const date in groupedByDate) {
    const daySessions = groupedByDate[date];
    console.log(`Date ${date}: ${daySessions.length} sessions`);
    
    // They are already sorted by createdAt asc because of the initial query
    for (let i = 0; i < daySessions.length; i++) {
      const session = daySessions[i];
      const sessionNumber = i + 1;

      if (session.sessionNumber !== sessionNumber) {
        await prisma.session.update({
          where: { id: session.id },
          data: { sessionNumber }
        });
        count++;
      }
    }
  }

  console.log(`Successfully updated ${count} sessions with daily numbers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
