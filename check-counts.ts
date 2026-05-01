
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Kategori sayımları kontrol ediliyor...');
    const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            _count: {
                select: { products: true }
            }
        },
        take: 20
    });

    console.log('--- Kategori Ürün Sayıları ---');
    categories.forEach(c => {
        console.log(`[${c.name}] : ${c._count.products} ürün`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
