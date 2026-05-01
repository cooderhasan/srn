import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const products = await prisma.product.findMany({
        where: { name: { contains: 'diş' } }
    });
    console.log(`Found ${products.length} products with 'diş'`);
    for (const p of products.slice(0, 5)) {
        console.log(`Name: ${p.name}`);
        console.log(`Slug: ${p.slug}`);
        console.log(`Hex:  ${Buffer.from(p.name).toString('hex')}`);
        console.log('---');
    }
}

check().finally(() => prisma.$disconnect());
