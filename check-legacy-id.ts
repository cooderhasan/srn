
import { prisma } from "./src/lib/db";

async function main() {
    const products = await prisma.product.findMany({
        where: {
            name: { contains: "GAZELLE", mode: "insensitive" }
        },
        select: { id: true, name: true, categoryId: true, categories: { select: { name: true } } }, // Check legacy categoryId
        take: 20
    });

    console.log(`Checking legacy categoryId for Gazelle products:`);
    products.forEach(p => {
        console.log(`${p.name} - LegacyID: ${p.categoryId} - CurrentCats: ${p.categories.map(c => c.name).join(", ")}`);
    });
}

main();
