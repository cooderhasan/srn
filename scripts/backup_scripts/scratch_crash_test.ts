const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const b = await prisma.banner.findMany();
    console.log('BANNERS:', b);

    const s = await prisma.slider.findMany();
    console.log('SLIDERS:', s);
    
    const cats = await prisma.category.findMany({ where: { isActive: true, isFeatured: true }});
    console.log('FEATURED CATS:', cats.map(c => ({id: c.id, imageUrl: c.imageUrl})));

}
main().finally(() => prisma.$disconnect());
