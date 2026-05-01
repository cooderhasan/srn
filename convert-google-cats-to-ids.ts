import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const taxonomyPath = path.join(process.cwd(), 'src', 'data', 'google-taxonomy.json');
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));

  const nameToId = new Map();
  taxonomy.forEach((item: any) => {
    nameToId.set(item.name, item.id);
  });

  const categories = await prisma.category.findMany({
    where: {
      AND: [
        { googleProductCategory: { not: null } },
        { googleProductCategory: { not: "" } }
      ]
    }
  });

  let updatedCount = 0;

  for (const cat of categories) {
    const id = nameToId.get(cat.googleProductCategory);
    if (id) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { googleProductCategory: id }
      });
      console.log(`Updated [${cat.name}] -> ${id} (${cat.googleProductCategory})`);
      updatedCount++;
    }
  }

  console.log(`Total categories converted to IDs: ${updatedCount}`);
}

main().finally(() => prisma.$disconnect());
