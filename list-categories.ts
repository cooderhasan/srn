import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const headerCategories = await prisma.category.findMany({
        where: { isInHeader: true },
        select: { id: true, name: true, order: true }
    })
    console.log('Categories with isInHeader=true:', JSON.stringify(headerCategories, null, 2))

    const rootCategories = await prisma.category.findMany({
        where: { parentId: null },
        select: { id: true, name: true }
    })
    console.log('Root categories (parentId=null):', JSON.stringify(rootCategories, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
