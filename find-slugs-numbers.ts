
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findSlugs() {
    const terms = ["1100", "1300", "1500", "Niva"];

    for (const term of terms) {
        const categories = await prisma.category.findMany({
            where: {
                name: { contains: term }
            },
            select: { name: true, slug: true }
        });
        console.log(`\n--- Matches for ${term} ---`);
        categories.forEach(c => console.log(`${c.name} : ${c.slug}`));
    }
}

findSlugs()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
