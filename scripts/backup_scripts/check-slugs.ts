import { prisma } from "./src/lib/db";

async function main() {
    const products = await prisma.product.findMany({
        take: 5,
        select: {
            id: true,
            name: true,
            slug: true
        }
    });

    console.log("Sample Products Slugs:");
    console.log(JSON.stringify(products, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
