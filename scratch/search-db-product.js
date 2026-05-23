const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Searching for 'DENEME22' in DB...");
        
        // 1. Search products
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { sku: 'DENEME22' },
                    { barcode: 'DENEME22' }
                ]
            }
        });
        console.log(`Found in Product table: ${products.length} products`);
        for (const p of products) {
            console.log(`- ID: ${p.id}, Name: ${p.name}, SKU: ${p.sku}, Barcode: ${p.barcode}`);
        }

        // 2. Search variants
        if (prisma.productVariant) {
            const variants = await prisma.productVariant.findMany({
                where: {
                    OR: [
                        { sku: 'DENEME22' },
                        { barcode: 'DENEME22' }
                    ]
                },
                include: { product: true }
            });
            console.log(`Found in ProductVariant table: ${variants.length} variants`);
            for (const v of variants) {
                console.log(`- ID: ${v.id}, SKU: ${v.sku}, Barcode: ${v.barcode}, Parent: ${v.product?.name}`);
            }
        }

        // 3. Search hepsiburadaProduct
        if (prisma.hepsiburadaProduct) {
            const hbProds = await prisma.hepsiburadaProduct.findMany({
                where: {
                    OR: [
                        { merchantSku: 'DENEME22' },
                        { hbSku: 'DENEME22' }
                    ]
                },
                include: { product: true }
            });
            console.log(`Found in HepsiburadaProduct table: ${hbProds.length} mappings`);
            for (const hb of hbProds) {
                console.log(`- ID: ${hb.id}, merchantSku: ${hb.merchantSku}, hbSku: ${hb.hbSku}, Product: ${hb.product?.name}`);
            }
        }

        // Let's print any arbitrary products from the DB to see some sample SKUs
        const samples = await prisma.product.findMany({ take: 5 });
        console.log("\nSample products in DB:");
        for (const s of samples) {
            console.log(`- Name: ${s.name}, SKU: ${s.sku}, Barcode: ${s.barcode}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
