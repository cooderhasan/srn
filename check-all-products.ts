
import { prisma } from "./src/lib/db";

async function checkAll() {
    console.log("Checking database...");
    try {
        const productCount = await prisma.product.count();
        console.log(`Total Products: ${productCount}`);

        const featuredCount = await prisma.product.count({ where: { isActive: true, isFeatured: true } });
        console.log(`Featured Products: ${featuredCount}`);

        const newCount = await prisma.product.count({ where: { isActive: true, isNew: true } });
        console.log(`New Products: ${newCount}`);

        const bestSellerCount = await prisma.product.count({ where: { isActive: true, isBestSeller: true } });
        console.log(`Best Seller Products: ${bestSellerCount}`);

        const sliderCount = await prisma.slider.count({ where: { isActive: true } });
        console.log(`Active Sliders: ${sliderCount}`);

    } catch (error) {
        console.error("Error checking database:", error);
    }
}

checkAll()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
