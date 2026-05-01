const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMigration() {
    const brandCount = await prisma.brand.count();
    const catCount = await prisma.category.count();
    const prodCount = await prisma.product.count();

    console.log('--- MIGRATION RESULTS ---');
    console.log(`Brands: ${brandCount}`);
    console.log(`Categories: ${catCount}`);
    console.log(`Products: ${prodCount}`);

    const sample = await prisma.product.findFirst();
    console.log('Any Product:', {
        id: sample?.id,
        name: sample?.name,
        stock: sample?.stock,
        images: sample?.images,
        isActive: sample?.isActive
    });
}

checkMigration()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
