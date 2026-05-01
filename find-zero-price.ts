
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fiyatı 0 olan ürünler aranıyor...');
    const products = await prisma.product.findMany({
        where: { listPrice: 0 },
        take: 5,
        select: { id: true, name: true, sku: true, listPrice: true, slug: true }
    });

    if (products.length === 0) {
        console.log('Fiyatı 0 olan ürün bulunamadı.');
    } else {
        console.log('Fiyatı 0 olan ilk 5 ürün:');
        products.forEach(p => {
            console.log(`- [${p.id}] ${p.name} (Slug: ${p.slug})`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
