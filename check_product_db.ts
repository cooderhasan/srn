const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const barcode = "5465153100555"; // Kullanıcının mesajındaki barkod
    const product = await prisma.product.findFirst({
        where: { barcode: barcode },
        include: { trendyolProduct: true, variants: true }
    });

    if (!product) {
        console.log("Product not found with barcode: " + barcode);
        // Varyantlarda mı?
        const variant = await prisma.productVariant.findFirst({
            where: { barcode: barcode },
            include: { product: { include: { trendyolProduct: true } } }
        });
        if (variant) {
            console.log("Found as variant:");
            console.log("Product Name:", variant.product.name);
            console.log("Variant Stock:", variant.stock);
            console.log("Product Critical Stock:", variant.product.criticalStock);
            console.log("Trendyol Synced:", variant.product.trendyolProduct?.isSynced);
        }
        return;
    }

    console.log("Product Name:", product.name);
    console.log("Product Stock:", product.stock);
    console.log("Critical Stock:", product.criticalStock);
    console.log("Trendyol Price:", product.trendyolPrice);
    console.log("Trendyol Synced:", product.trendyolProduct?.isSynced);
    console.log("Last Batch ID:", product.trendyolProduct?.batchRequestId);
}
main().finally(() => prisma.$disconnect());
