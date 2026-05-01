
import { prisma } from "./src/lib/db";

async function checkProduct() {
    const slug = "erkek-tisort-basic";
    console.log(`Searching for product with slug: ${slug}`);

    const product = await prisma.product.findUnique({
        where: { slug },
        include: { variants: true }
    });

    if (!product) {
        console.log("Product not found!");
        return;
    }

    console.log("Product:", {
        id: product.id,
        name: product.name,
        stock: product.stock,
        minQuantity: product.minQuantity,
        variantsCount: product.variants.length
    });

    if (product.variants.length > 0) {
        console.log("Variants:", product.variants.map(v => ({
            id: v.id,
            color: v.color,
            size: v.size,
            stock: v.stock
        })));
    }
}

checkProduct()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
