import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const code = process.env.EVENT_CODE || 'wedding';
  const title = process.env.EVENT_TITLE || 'Drenusha & Egzon';

  await prisma.event.upsert({
    where: { code },
    update: { title, uploadEnabled: true },
    create: { code, title, uploadEnabled: true },
  });

  console.log(`Seeded event "${title}" with code: ${code}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
