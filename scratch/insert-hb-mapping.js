const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const product = await prisma.product.findFirst({
            where: { sku: 'SRN-0120413' }
        });

        if (!product) {
            console.log("❌ Product SRN-0120413 not found in DB.");
            return;
        }

        console.log(`Found product: ${product.name} (ID: ${product.id})`);

        const mapping = await prisma.hepsiburadaProduct.upsert({
            where: { productId: product.id },
            update: {
                merchantSku: 'DENEME22',
                hbSku: 'HBV0000116MZS',
                isSynced: true,
                lastSyncedAt: new Date()
            },
            create: {
                productId: product.id,
                merchantSku: 'DENEME22',
                hbSku: 'HBV0000116MZS',
                isSynced: true,
                lastSyncedAt: new Date()
            }
        });

        console.log("✅ Mapping created/updated:", mapping);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
