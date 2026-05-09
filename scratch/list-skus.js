
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSkus() {
    console.log("Listing some product SKUs...");
    try {
        const products = await prisma.product.findMany({
            take: 5,
            where: { isActive: true },
            select: { sku: true, name: true }
        });
        products.forEach(p => console.log(`Name: ${p.name}, SKU: ${p.sku}`));
    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

listSkus();
