
import { prisma } from "./src/lib/db";

async function verifyMenuData() {
    console.log("Verifying Menu Data...");

    const HARDCODED_HOME_ID = "cml9exnw20009orv864or2ni2";

    // Check if Home exists with this ID
    const home = await prisma.category.findUnique({
        where: { id: HARDCODED_HOME_ID }
    });
    console.log("Home Category:", home ? `${home.name} (Active: ${home.isActive})` : "Not Found");

    // Fetch children of this ID (exactly what layout.tsx does)
    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
            parentId: HARDCODED_HOME_ID
        },
        orderBy: { order: "asc" },
        select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
        },
    });

    console.log(`Fetched ${categories.length} children using ID ${HARDCODED_HOME_ID}`);
    if (categories.length > 0) {
        console.log("Categories:", categories.map(c => c.name));
    } else {
        // If 0, try without isActive check
        console.log("Trying without isActive check...");
        const allChildren = await prisma.category.findMany({
            where: { parentId: HARDCODED_HOME_ID },
            select: { name: true, isActive: true }
        });
        console.log("All Children (Active & Inactive):", allChildren);
    }
}

verifyMenuData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
