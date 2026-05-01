
import { prisma } from "./src/lib/db";

async function main() {
    const slug = "gazelle-80";
    const category = await prisma.category.findUnique({
        where: { slug },
        include: {
            products: {
                select: { id: true, name: true, isActive: true },
            },
            _count: {
                select: { products: true }
            }
        },
    });

    if (!category) {
        console.log(`Category with slug '${slug}' not found.`);
        // Try to find a partial match
        const similar = await prisma.category.findMany({
            where: { slug: { contains: "gazelle" } }
        });
        console.log("Similar categories:", similar);
    } else {
        console.log(`Found category: ${category.name} (${category.id})`);
        console.log(`Product count: ${category._count.products}`);
        console.log(`Sample products:`, category.products.slice(0, 5));
    }
}

main();
