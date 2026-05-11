
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.category.count();
    console.log('Total categories:', count);
    const categories = await prisma.category.findMany({
        take: 100,
        select: { id: true, name: true, slug: true }
    });
    console.log(categories);
}

main();
