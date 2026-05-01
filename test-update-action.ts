import { updateCategory } from './src/app/admin/(protected)/categories/actions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find a test category
    const category = await prisma.category.findFirst({
        where: { parent: { name: "Home" } }
    });

    if (!category) {
        console.error("No suitable category found for testing.");
        return;
    }

    console.log(`Testing update on category: ${category.name} (${category.id})`);
    console.log(`Current isInHeader: ${category.isInHeader}`);

    try {
        // Attempt to set isInHeader to true
        await updateCategory(category.id, { isInHeader: true });

        // Verify the update
        const updatedCategory = await prisma.category.findUnique({
            where: { id: category.id }
        });

        console.log(`Updated isInHeader: ${updatedCategory?.isInHeader}`);

        if (updatedCategory?.isInHeader === true) {
            console.log("SUCCESS: isInHeader was updated.");
        } else {
            console.error("FAILURE: isInHeader was NOT updated.");
        }

        // Cleanup (optional, set back to false if needed, but for now leaving it true is fine as it helps the user)
    } catch (error) {
        console.error("Error during test:", error);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
