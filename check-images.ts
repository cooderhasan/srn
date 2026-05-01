
import { prisma } from "./src/lib/db";

async function checkImages() {
    console.log("Checking product images...");
    try {
        const products = await prisma.product.findMany({
            take: 5,
            select: { name: true, images: true }
        });

        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`Images:`, p.images);
        });

    } catch (error) {
        console.error("Error checking images:", error);
    }
}

checkImages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
