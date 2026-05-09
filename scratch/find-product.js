
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProductByName(namePart) {
    console.log(`Searching for product containing "${namePart}"...`);
    try {
        const product = await prisma.product.findFirst({
            where: { name: { contains: namePart, mode: 'insensitive' } },
            select: { id: true, name: true, sku: true, barcode: true }
        });
        console.log("Product found:", JSON.stringify(product, null, 2));
    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

findProductByName("Bisiklet");
