
import { prisma } from "./src/lib/db";
import fs from 'fs';

async function main() {
    const categorySlug = "samara-1500i-12";
    console.log(`Loading products from samara_products_clean.json...`);

    const productNames: string[] = JSON.parse(fs.readFileSync('samara_products_clean.json', 'utf-8'));
    console.log(`Loaded ${productNames.length} products.`);

    // 1. Find the Category
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
    });

    if (!category) {
        console.error(`Category with slug '${categorySlug}' not found.`);
        return;
    }
    console.log(`Found target category: ${category.name} (${category.id})`);

    // 2. Sync
    let linkedCount = 0;
    let notFoundCount = 0;

    console.log("Starting sync...");

    for (const name of productNames) {
        // Try exact match first
        let products = await prisma.product.findMany({
            where: { name: { equals: name.trim(), mode: "insensitive" } }
        });

        if (products.length === 0) {
            // Try cleaning quotes or extra spaces
            const cleanName = name.replace(/['"]/g, "").trim();
            products = await prisma.product.findMany({
                where: { name: { contains: cleanName, mode: "insensitive" } }
            });
        }

        if (products.length === 0) {
            // console.log(`Product NOT FOUND: ${name}`);
            notFoundCount++;
            continue;
        }

        for (const product of products) {
            // Check if already linked to avoid redundant updates? 
            // Prisma 'connect' is usually safe but we can optimize.
            // Let's just update.
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    categories: {
                        connect: { id: category.id }
                    }
                }
            });
            linkedCount++;
        }
    }

    console.log(`\nSync Complete.`);
    console.log(`Total Products in List: ${productNames.length}`);
    console.log(`Linked/Updated: ${linkedCount}`);
    console.log(`Not Found in DB: ${notFoundCount}`);
}

main();
