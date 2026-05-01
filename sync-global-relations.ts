
import { prisma } from "./src/lib/db";
import fs from 'fs';

async function main() {
    const RELATIONS_FILE = 'global_relations.json';
    console.log(`Loading relations from ${RELATIONS_FILE}...`);

    if (!fs.existsSync(RELATIONS_FILE)) {
        console.error("Relations file not found!");
        return;
    }

    const relations: Record<string, string[]> = JSON.parse(fs.readFileSync(RELATIONS_FILE, 'utf-8'));
    const categories = Object.keys(relations);
    console.log(`Loaded ${categories.length} categories to sync.`);

    let totalLinked = 0;
    let totalErrors = 0;

    for (const catName of categories) {
        // Skip obvious junk
        if (catName.trim().length === 0) continue;

        // Find Category in DB
        // Try precise name match, or slug match logic if needed
        let category = await prisma.category.findFirst({
            where: {
                OR: [
                    { name: { equals: catName, mode: 'insensitive' } },
                    // Try removing spaces/trimming
                    { name: { equals: catName.trim(), mode: 'insensitive' } }
                ]
            }
        });

        // Special Mapping for known mismatches if any
        if (!category) {
            // Try "Lada [Name]" pattern if simple name fails, or vice versa
            if (catName.includes("Lada")) {
                const shortName = catName.replace("Lada", "").trim();
                category = await prisma.category.findFirst({ where: { name: { contains: shortName, mode: 'insensitive' } } });
            }
        }

        if (!category) {
            console.log(`[SKIP] Category not found in DB: "${catName}"`);
            continue;
        }

        const productNames = relations[catName];
        console.log(`Processing "${category.name}" (${productNames.length} products)...`);

        const productsToConnect: string[] = [];

        // Batch processing? 
        // We can findMany products by names IN list to be faster
        // But names might need fuzzy match. 
        // Let's do batch find for exact matches first.

        // Optimize: Fetch all DB products ID and Name map for fast lookup?
        // Assume names are relatively consistent from dump

        // Chunking to avoid massive query
        const CHUNK_SIZE = 50;
        for (let i = 0; i < productNames.length; i += CHUNK_SIZE) {
            const chunk = productNames.slice(i, i + CHUNK_SIZE);

            // 1. Direct fetch
            const foundProducts = await prisma.product.findMany({
                where: { name: { in: chunk, mode: 'insensitive' } },
                select: { id: true }
            });

            // 2. Connect
            if (foundProducts.length > 0) {
                await prisma.category.update({
                    where: { id: category.id },
                    data: {
                        products: {
                            connect: foundProducts.map(p => ({ id: p.id }))
                        }
                    }
                });
                totalLinked += foundProducts.length;
            }

            // 3. Log missing (Optional: try fuzzy match for missing?)
            // If strict sync is preferred, we skip fuzzy for global sync to avoid mismatch accumulation
            // But we can report counts
        }
    }

    console.log("\n=================================");
    console.log(`Global Sync Complete.`);
    console.log(`Total Connections Created/Verified: ${totalLinked}`);
}

main();
