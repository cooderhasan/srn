
import { prisma } from "./src/lib/db";

async function main() {
    const categorySlug = "gazelle-80"; // Slug for Gazelle category
    const productNames = [
        "GAZELLE SİNYAL KOLU KORNASIZ",
        "GAZELLE SİNYAL KOLU KORNALI",
        "GAZELLE YAN SÜRGÜ MEKANİZMASI GERGİ",
        "GAZELLE YAN SÜRGÜ MEKANİZMASI ORTA",
        "GAZELLE YAN KAPI AÇMA KOLU DIŞ",
        "GAZELLE YAN SÜRGÜ MEKANİZMASI +BAĞLANTI DEMİRİ KOMPLE",
        "GAZELLE DİFRANSİYEL MAHRUTİ BORUSU",
        "GAZELLE CAM SİLECEK KOLU ÖN",
        "GAZELLE DIŞ DİKİZ AYNASI SAĞ",
        "GAZELLE DIS DİKİZ AYNASI SOL SİNYALLİ",
        "GAZELLE ORTA ROT KISA",
        "GAZELLE NEXT RADYATÖR KOMPLE RUS",
        "GAZELLE NEXT ARKA FREN HORTUMU"
    ];

    // 1. Find the Gazelle category
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
    });

    if (!category) {
        console.error(`Category with slug '${categorySlug}' not found.`);
        return;
    }
    console.log(`Found target category: ${category.name} (${category.id})`);

    // 2. Find and update products
    let updatedCount = 0;
    for (const name of productNames) {
        // We use 'contains' to be safer with potential whitespace differences
        const products = await prisma.product.findMany({
            where: {
                name: { equals: name.trim(), mode: "insensitive" }
            }
        });

        if (products.length === 0) {
            console.log(`Product not found: ${name}`);
            // Try with contains if exact match failed
            const similar = await prisma.product.findFirst({
                where: { name: { contains: name.split(" ")[0] + " " + name.split(" ")[1], mode: 'insensitive' } }
            });
            if (similar) console.log(`  -> Did you mean: ${similar.name}?`);
            continue;
        }

        for (const product of products) {
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    categories: {
                        connect: { id: category.id }
                    }
                }
            });
            console.log(`Updated product: ${product.name}`);
            updatedCount++;
        }
    }

    console.log(`\nSuccess! Linked ${updatedCount} products to '${category.name}' category.`);
}

main();
