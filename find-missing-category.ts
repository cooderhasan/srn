import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const searchTerm = 'Samara'
    const searchTerm2 = '1100'

    console.log(`Searching for categories containing "${searchTerm}" or "${searchTerm2}"...`)

    const categories = await prisma.category.findMany({
        where: {
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { name: { contains: searchTerm2, mode: 'insensitive' } },
                { slug: { contains: '1100', mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            parentId: true,
            parent: {
                select: { name: true }
            }
        }
    })

    console.log('Found categories:', JSON.stringify(categories, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
