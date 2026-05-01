import { prisma } from "./src/lib/db";

async function main() {
    const products = await prisma.product.findMany({
        take: 5,
        select: {
            id: true,
            name: true,
            sku: true,
            barcode: true
        }
    });

    console.log("Sample Products SKU check:");
    console.log(JSON.stringify(products, null, 2));

    const emptySkuCount = await prisma.product.count({
        where: {
            OR: [
                { sku: null },
                { sku: "" }
            ]
        }
    });
    console.log(`Products with empty SKU: ${emptySkuCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
