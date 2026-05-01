
import { prisma } from "./src/lib/db";

async function main() {
    const count = await prisma.banner.count({
        where: { isActive: true },
    });
    console.log(`Active Banners Count: ${count}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
