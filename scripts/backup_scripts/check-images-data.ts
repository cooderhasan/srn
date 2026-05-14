
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Kategori Resimleri:");
    const categories = await prisma.category.findMany({
        select: { id: true, name: true, imageUrl: true },
        take: 5
    });
    console.log(categories);

    console.log("\nSite Ayarları (Logo):");
    const settings = await prisma.siteSettings.findMany({
        where: { key: { in: ['logo', 'logoUrl', 'site_logo'] } }
    });
    // Also check all settings just in case logic is different
    const allSettings = await prisma.siteSettings.findMany();
    console.log(allSettings);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
