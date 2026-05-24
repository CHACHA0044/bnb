const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sessions = await prisma.session.findMany({
    where: { tableId: 'T1', status: 'OPEN' },
    include: { orders: true, payments: true }
  });
  console.log('Open sessions for T1:', JSON.stringify(sessions, null, 2));
  process.exit(0);
}

check();
