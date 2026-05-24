const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking DB tables...");
  try {
    const logsCount = await prisma.analyticsLog.count();
    console.log("AnalyticsLog count:", logsCount);
    
    const summaryCount = await prisma.dailySummary.count();
    console.log("DailySummary count:", summaryCount);
    
    const logs = await prisma.analyticsLog.findMany({ take: 1 });
    console.log("Sample log:", JSON.stringify(logs[0], null, 2));
  } catch (err) {
    console.error("DB check failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
