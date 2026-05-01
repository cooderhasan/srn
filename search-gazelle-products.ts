
import { prisma } from "./src/lib/db";

async function main() {
    const products = await prisma.product.findMany({
        where: {
            name: { contains: "GAZELLE", mode: "insensitive" }
        },
        select: { id: true, name: true, sku: true, categories: { select: { name: true, slug: true } } },
        take: 20
    });

    console.log(`Found ${products.length} products with 'GAZELLE' in name.`);
    products.forEach(p => {
        console.log(`${p.sku} - ${p.name} - Cats: ${p.categories.map(c => c.name).join(", ")}`);
    });
}

main();
