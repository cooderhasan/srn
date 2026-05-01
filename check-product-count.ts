import { prisma } from "./src/lib/db";

async function main() {
    const count = await prisma.product.count({
        where: { isActive: true }
    });
    console.log(`Total Active Products: ${count}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
