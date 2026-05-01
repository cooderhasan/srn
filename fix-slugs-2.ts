import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        select: { id: true, name: true, slug: true }
    });
    
    let brokenCount = 0;
    
    for (const p of products) {
        if (p.slug.includes('-k-n-i-') || p.slug.match(/(^[knişçömöüğ]-|-[knişçömöüğ]-)/)) {
            if (brokenCount < 10) {
                console.log(`Bozuk: ${p.name}`);
                console.log(`Eski:  ${p.slug}\n`);
            }
            brokenCount++;
        }
    }
    console.log("Toplam bozuk ürün:", brokenCount);
}

main().finally(() => prisma.$disconnect());
