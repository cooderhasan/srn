import { prisma } from "./src/lib/db";

async function main() {
    const targetSlug = "lada-niva-1700-i-yedek-paralar-41";

    console.log(`Searching for category slug: ${targetSlug}`);

    const category = await prisma.category.findUnique({
        where: { slug: targetSlug },
        include: {
            _count: {
                select: { products: true }
            }
        }
    });

    if (!category) {
        console.log("Category NOT FOUND in database!");

        // Try to find by name partially
        const similar = await prisma.category.findMany({
            where: { name: { contains: "1700" } }
        });
        console.log("Similar categories found:", similar);
        return;
    }

    console.log("Category Found:");
    console.log(`ID: ${category.id}`);
    console.log(`Name: ${category.name}`);
    console.log(`Product Count: ${category._count.products}`);

    // Fetch a few products if any
    const products = await prisma.product.findMany({
        where: { categoryId: category.id },
        take: 3
    });
    console.log("Sample Products:", products);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
