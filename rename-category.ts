import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const categoryId = 'cml9exnw6000lorv8gfer3g7l'
    const newName = 'Samara 1100-1300-1500 Yedek Parçaları'

    console.log(`Renaming category ${categoryId} to "${newName}"...`)

    const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: { name: newName }
    })

    console.log('Category renamed successfully:', JSON.stringify(updatedCategory, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
