const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const product = await prisma.product.findFirst({
            where: { sku: 'SRN-0120413' }
        });
        if (!product) {
            console.log("❌ Product not found");
            return;
        }
        console.log(`Product: ${product.name}, Current Stock: ${product.stock}`);
        
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: { stock: 20 }
        });
        console.log(`Updated stock to: ${updated.stock}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
