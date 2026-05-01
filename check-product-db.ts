import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const p = await prisma.product.findFirst({
    where: { slug: { contains: "lada-samara-direksiyon-simidi" } },
    select: { slug: true, isActive: true, name: true }
  });
  console.log(p);
}

check().finally(() => prisma.$disconnect());
