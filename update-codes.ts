
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MAX_RETRIES = 5;

function generateSKU(): string {
    const prefix = "LDM";
    const random = Math.floor(Math.random() * 10000000)
        .toString()
        .padStart(7, "0");
    return `${prefix}-${random}`;
}

function generateBarcode(): string {
    // Prefix 460 (Russia)
    let code = "460" + Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, "0");

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }

    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
}

async function updateProductWithRetry(product: any) {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const newSku = generateSKU();
            const newBarcode = generateBarcode();

            console.log(`Updating Product: ${product.name} (ID: ${product.id})`);
            console.log(`  - Old SKU: ${product.sku}, New SKU: ${newSku}`);
            console.log(`  - Old Barcode: ${product.barcode}, New Barcode: ${newBarcode}`);

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    sku: newSku,
                    barcode: newBarcode
                }
            });
            return; // Success
        } catch (error: any) {
            if (error.code === 'P2002') {
                console.log(`  ! Collision detected (SKU/Barcode), retrying... (${retries + 1}/${MAX_RETRIES})`);
                retries++;
            } else {
                throw error;
            }
        }
    }
    console.error(`  !! Failed to update product ${product.id} after ${MAX_RETRIES} retries.`);
}

async function updateVariantWithRetry(variant: any) {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const newSku = generateSKU();
            const newBarcode = generateBarcode();

            await prisma.productVariant.update({
                where: { id: variant.id },
                data: {
                    sku: newSku,
                    barcode: newBarcode
                }
            });
            console.log(`    - Variant ID: ${variant.id} updated.`);
            return;
        } catch (error: any) {
            if (error.code === 'P2002') {
                console.log(`    ! Collision detected (Variant), retrying...`);
                retries++;
            } else {
                throw error;
            }
        }
    }
}

async function main() {
    console.log("Starting bulk update of product codes...");

    const products = await prisma.product.findMany({
        include: {
            variants: true
        }
    });

    console.log(`Found ${products.length} products to update.`);

    for (const product of products) {
        await updateProductWithRetry(product);

        if (product.variants.length > 0) {
            console.log(`  - Updating ${product.variants.length} variants...`);
            for (const variant of product.variants) {
                await updateVariantWithRetry(variant);
            }
        }
    }

    console.log("Bulk update completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
