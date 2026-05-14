import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking categories with isInHeader = true...');
    try {
        const headerCategories = await prisma.category.findMany({
            where: { isInHeader: true },
            select: { id: true, name: true, isInHeader: true }
        })
        console.log('Categories with isInHeader=true:', JSON.stringify(headerCategories, null, 2))
    } catch (error) {
        console.error('Error fetching header categories:', error);
    }

    console.log('Checking most recent categories...');
    try {
        const allCategories = await prisma.category.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, isInHeader: true, createdAt: true }
        })
        console.log('Most recently updated categories:', JSON.stringify(allCategories, null, 2))
    } catch (error) {
        console.error('Error fetching recent categories:', error);
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
