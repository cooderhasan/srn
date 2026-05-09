
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSyncedProduct() {
    console.log("Searching for a synced N11 product...");
    try {
        const syncedProduct = await prisma.n11Product.findFirst({
            where: { isSynced: true },
            include: {
                product: { select: { sku: true, name: true } }
            }
        });
        if (syncedProduct) {
            console.log(`Found synced product: ${syncedProduct.product?.name}, SKU: ${syncedProduct.product?.sku}`);
        } else {
            console.log("No synced N11 products found.");
        }
    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

findSyncedProduct();
