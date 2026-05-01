
import { prisma } from "./src/lib/db";

async function main() {
    console.log("Checking for products with no categories...");

    // 1. Find products with empty categories relation
    const uncategorizedProducts = await prisma.product.findMany({
        where: {
            categories: {
                none: {}
            }
        },
        select: {
            id: true,
            name: true,
            categoryId: true, // Check legacy field
            sku: true
        }
    });

    console.log(`Found ${uncategorizedProducts.length} products with NO categories relation.`);

    if (uncategorizedProducts.length > 0) {
        console.log("Sample uncategorized products:");
        uncategorizedProducts.slice(0, 10).forEach(p => {
            console.log(`- ${p.name} (Legacy ID: ${p.categoryId})`);
        });
    }

    // 2. Check for products where legacy categoryId exists but is NOT in the relation
    // This is harder to query directly with Prisma efficiently without fetching all, 
    // but we can check the subset of uncategorized ones first.

    const fixable = [];
    const activeCategoryIds = new Set((await prisma.category.findMany({ select: { id: true } })).map(c => c.id));

    for (const p of uncategorizedProducts) {
        // If legacy categoryId is a CUID that exists in Category table, valid candidate for migration
        if (p.categoryId && p.categoryId.length > 10 && activeCategoryIds.has(p.categoryId)) {
            fixable.push(p);
        }
    }

    console.log(`\nFound ${fixable.length} uncategorized products with a valid legacy Category ID that can be migrated.`);
    if (fixable.length > 0) {
        console.log("Sample fixable products:");
        fixable.slice(0, 5).forEach(p => console.log(`- ${p.name} -> CatID: ${p.categoryId}`));
    }
}

main();
