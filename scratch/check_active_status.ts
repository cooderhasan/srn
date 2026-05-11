
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        take: 10,
        select: { sku: true, isN11Active: true, isTrendyolActive: true }
    });
    console.log('--- DB Durumu (İlk 10 Ürün) ---');
    console.table(products);
}

main();
