import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking database...");
    const product = await prisma.product.findFirst({
        where: { slug: 'kablosuz-mouse' },
        select: { id: true, name: true, origin: true, sku: true, barcode: true }
    });
    console.log('Product Data:', JSON.stringify(product, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
