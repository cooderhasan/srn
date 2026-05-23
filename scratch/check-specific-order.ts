import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log("--- CHECKING ORDER ---");
    const order = await prisma.order.findUnique({
        where: { orderNumber: "4852187715" },
        include: { items: true }
    });
    console.log("Order in DB:", order ? JSON.stringify(order, null, 2) : "NOT FOUND");

    console.log("\n--- CHECKING PRODUCT BY SKU/BARCODE ---");
    const product = await prisma.product.findFirst({
        where: {
            OR: [
                { sku: "Y02112CFMOTO1" },
                { barcode: "Y02112CFMOTO1" }
            ]
        },
        include: { hepsiburadaProduct: true }
    });
    console.log("Product in DB:", product ? JSON.stringify(product, null, 2) : "NOT FOUND");

    console.log("\n--- CHECKING HEPSIBURADA PRODUCT MAPPINGS ---");
    const mappings = await (prisma as any).hepsiburadaProduct.findMany({
        where: {
            OR: [
                { merchantSku: "Y02112CFMOTO1" },
                { hbSku: "HBCV00007C797O" }
            ]
        },
        include: { product: true }
    });
    console.log("Hepsiburada Product Mappings:", JSON.stringify(mappings, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
