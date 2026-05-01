import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Searching for 'Samara', '1100', '1300', '1500'...");

    const categories = await prisma.category.findMany({
        where: {
            OR: [
                { name: { contains: 'Samara', mode: 'insensitive' } },
                { name: { contains: '1100', mode: 'insensitive' } },
                { name: { contains: '1300', mode: 'insensitive' } },
                { name: { contains: '1500', mode: 'insensitive' } },
                { slug: { contains: '23', mode: 'insensitive' } } // Check for ID 23 in slug
            ]
        },
        select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            parentId: true,
            parent: { select: { name: true } },
            _count: { select: { products: true } }
        },
        orderBy: { name: 'asc' }
    })

    console.log(`Found ${categories.length} categories:`);
    console.log(JSON.stringify(categories, null, 2));
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
