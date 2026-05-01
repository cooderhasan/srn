import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking categories with raw SQL...');
    try {
        const result = await prisma.$queryRaw`SELECT id, name, "isInHeader" FROM categories WHERE "isInHeader" = true`
        console.log('Categories with isInHeader=true (Raw SQL):', JSON.stringify(result, null, 2))
    } catch (error) {
        console.error('Error fetching header categories with raw SQL:', error);
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
