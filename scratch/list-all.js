
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAll() {
    console.log("Listing all products...");
    try {
        const products = await prisma.product.findMany({ take: 10 });
        console.log(`Count: ${products.length}`);
        products.forEach(p => console.log(`- ${p.name} (SKU: ${p.sku})`));
    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

listAll();
