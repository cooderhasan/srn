
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.category.findMany({
        select: { id: true, name: true, slug: true }
    });
    console.log(categories);
}

main();
