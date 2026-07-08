const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  await prisma.user.upsert({
    where: { email: 'admin@aurora.local' },
    update: {},
    create: {
      email: 'admin@aurora.local',
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
