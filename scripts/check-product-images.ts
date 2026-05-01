
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Product Images...");

    // Get 10 products with images
    const products = await prisma.product.findMany({
        where: {
            images: {
                isEmpty: false
            }
        },
        select: {
            id: true,
            name: true,
            images: true
        },
        take: 10
    });

    if (products.length === 0) {
        console.log("No products with images found.");
        return;
    }

    console.log(`Found ${products.length} products with images.`);

    // Analyze the image URLs
    const sampleImages = products.flatMap(p => p.images);
    console.log("Sample Image URLs:");
    sampleImages.slice(0, 5).forEach(url => console.log(`- ${url}`));

    // Check distinct domains
    const domains = new Set();
    sampleImages.forEach(url => {
        try {
            const domain = new URL(url).hostname;
            domains.add(domain);
        } catch (e) {
            console.log(`Invalid URL: ${url}`);
        }
    });

    console.log("\nUnique Domains found:");
    domains.forEach(d => console.log(`- ${d}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
