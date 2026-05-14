import { prisma } from "./src/lib/db";

async function main() {
    const idsToCheck = [16, 66, 329, 330, 331]; // From dump inspection

    console.log("Checking products that should be in Category 41:");

    for (const originalId of idsToCheck) {
        // Find by slug ending with "-ID"
        const products = await prisma.product.findMany({
            where: {
                slug: { endsWith: `-${originalId}` }
            },
            include: {
                category: true
            }
        });

        if (products.length === 0) {
            console.log(`Product ID ${originalId}: NOT FOUND in DB`);
        } else {
            for (const p of products) {
                console.log(`Product ID ${originalId} (DB ID: ${p.id}):`);
                console.log(`  Name: ${p.name}`);
                console.log(`  Current Category: ${p.category ? `${p.category.name} (ID: ${p.categoryId})` : "NULL"}`);
                console.log(`  Slug: ${p.slug}`);
            }
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
