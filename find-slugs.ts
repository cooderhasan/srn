
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findSlugs() {
    const names = [
        "Samara 1500i",
        "Samara 1100-1300-1500",
        "Vega 1500-8V",
        "Vega 1500-16V",
        "Kalina",
        "Niva",
        "Lada Samara", // extra check
        "Lada Niva" // extra check
    ];

    console.log("Searching for slugs...");

    for (const name of names) {
        // Search effectively (contains or starts with to be safe)
        const categories = await prisma.category.findMany({
            where: {
                name: {
                    contains: name, // generic match
                },
            },
            select: {
                name: true,
                slug: true,
                id: true
            }
        });

        if (categories.length > 0) {
            console.log(`\nResults for "${name}":`);
            categories.forEach(c => console.log(` - ${c.name}: ${c.slug}`));
        } else {
            console.log(`\nNo results for "${name}"`);
        }
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
