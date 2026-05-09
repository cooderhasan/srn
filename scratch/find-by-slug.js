
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findBySlug(slug) {
    console.log(`Searching for product with slug "${slug}"...`);
    try {
        const product = await prisma.product.findUnique({
            where: { slug: slug },
            select: { sku: true, id: true, name: true }
        });
        console.log("Product found:", JSON.stringify(product, null, 2));
    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

findBySlug("cg-cita-kirmizi-sakal2-adet-sivri-vida-takimi-buji-kabli-kilifi-995");
