
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Ürün - Kategori ilişkileri onarılıyor...');

    // 1. Fetch all products with a categoryId
    const products = await prisma.product.findMany({
        where: {
            categoryId: { not: null },
            categories: { none: {} } // Only if not already connected
        },
        select: { id: true, categoryId: true }
    });

    console.log(`${products.length} adet ürünün kategori ilişkisi güncellenecek.`);

    let updated = 0;
    for (const p of products) {
        if (!p.categoryId) continue;

        await prisma.product.update({
            where: { id: p.id },
            data: {
                categories: {
                    connect: { id: p.categoryId }
                }
            }
        });

        updated++;
        if (updated % 100 === 0) process.stdout.write('.');
    }

    console.log(`\n✅ ${updated} ürün güncellendi.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
