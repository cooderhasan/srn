import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
            OR: [
                { isInHeader: true },
                { parent: { name: "Home" } },
                { parentId: null }
            ]
        },
        orderBy: [
            { isInHeader: "desc" },
            { headerOrder: "asc" },
            { order: "asc" }
        ],
        take: 10,
        select: {
            id: true,
            name: true,
            isInHeader: true,
            parentId: true,
            parent: { select: { name: true } }
        }
    })
    console.log('Fetched Categories for Header:', JSON.stringify(categories, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
