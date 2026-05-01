
import { prisma } from "../src/lib/db";
import fs from "fs";
import path from "path";

async function exportData() {
    console.log("Veriler dışarı aktarılıyor...");

    const data = {
        categories: await prisma.category.findMany(),
        brands: await prisma.brand.findMany(),
        products: await prisma.product.findMany({
            include: { categories: { select: { id: true } } }
        }),
        variants: await prisma.productVariant.findMany(),
        sliders: await prisma.slider.findMany(),
        siteSettings: await prisma.siteSettings.findMany(),
        policies: await prisma.policy.findMany(),
    };

    const filePath = path.join(process.cwd(), "full_backup.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`✅ Yedekleme başarılı! Dosya: ${filePath}`);
    console.log(`Toplam Kategori: ${data.categories.length}`);
    console.log(`Toplam Ürün: ${data.products.length}`);
}

exportData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
