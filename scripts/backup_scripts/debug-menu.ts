
import { prisma } from "./src/lib/db";

async function debugMenu() {
    console.log("Debugging Menu Logic...");

    // 1. Get Root
    const root = await prisma.category.findFirst({
        where: { parentId: null, isActive: true }
    });
    console.log("Root found:", root ? `${root.name} (${root.id})` : "None");

    let targetParentId = root?.id;

    if (root) {
        // 2. Try to find "Home" under Root
        const home = await prisma.category.findFirst({
            where: { parentId: root.id, isActive: true }
        });
        console.log("Home found:", home ? `${home.name} (${home.id})` : "None");

        if (home) {
            targetParentId = home.id;
        }
    }

    console.log("Target Parent ID:", targetParentId);

    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
            parentId: targetParentId
        },
        orderBy: { order: "asc" },
        select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
        },
    });

    console.log(`Fetched ${categories.length} categories.`);
    if (categories.length > 0) {
        console.log("Categories:", categories.map(c => c.name));
    }
}

debugMenu()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
