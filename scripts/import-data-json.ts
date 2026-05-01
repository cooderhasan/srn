
import { prisma } from "../src/lib/db";
import fs from "fs";
import path from "path";

async function importData() {
    const filePath = path.join(process.cwd(), "full_backup.json");

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Yedek dosyası bulunamadı: ${filePath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);

    console.log("Veriler içeri aktarılıyor...");

    // Sıralama önemli: Önce bağımsız tablolar, sonra bağımlı tablolar

    // 1. Kategoriler
    console.log(`Kategoriler yükleniyor (${data.categories.length})...`);

    // Pass 1: Önce tüm kategorileri parentsız oluştur (FK hatasını önlemek için)
    console.log("  - Aşama 1: Kategoriler oluşturuluyor (İlişkisiz)...");
    for (const cat of data.categories) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { parentId, ...catNoParent } = cat;
        await prisma.category.upsert({
            where: { id: cat.id },
            update: { ...catNoParent }, // Mevcutsa diğer alanları güncelle, parent'a dokunma
            create: { ...catNoParent, parentId: null }, // Yeni ise parentsız oluştur
        });
    }

    // Pass 2: Parent ilişkilerini kur
    console.log("  - Aşama 2: Kategori ağacı kuruluyor...");
    for (const cat of data.categories) {
        if (cat.parentId) {
            await prisma.category.update({
                where: { id: cat.id },
                data: { parentId: cat.parentId },
            });
        }
    }


    // 2. Markalar
    console.log(`Markalar yükleniyor (${data.brands.length})...`);
    for (const brand of data.brands) {
        await prisma.brand.upsert({
            where: { id: brand.id },
            update: brand,
            create: brand,
        });
    }

    // 3. Ürünler
    console.log(`Ürünler yükleniyor (${data.products.length})...`);
    for (const product of data.products) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { categories, ...productData } = product;

        try {
            await prisma.product.upsert({
                where: { id: product.id },
                update: {
                    ...productData,
                    // Kategorileri güncelle (varsa bağla)
                    categories: categories ? { set: categories.map((c: any) => ({ id: c.id })) } : undefined
                },
                create: {
                    ...productData,
                    // Kategorileri oluştururken bağla
                    categories: categories ? { connect: categories.map((c: any) => ({ id: c.id })) } : undefined
                },
            });
        } catch (e) {
            console.error(`Ürün yüklenirken hata: ${product.name}`, e);
        }
    }

    // 4. Varyantlar
    console.log(`Varyantlar yükleniyor (${data.variants.length})...`);
    for (const variant of data.variants) {
        await prisma.productVariant.upsert({
            where: { id: variant.id },
            update: variant,
            create: variant,
        });
    }

    // 5. Sliderlar
    console.log(`Sliderlar yükleniyor (${data.sliders.length})...`);
    if (data.sliders) {
        for (const slider of data.sliders) {
            await prisma.slider.upsert({
                where: { id: slider.id },
                update: slider,
                create: slider,
            });
        }
    }

    // 6. Ayarlar
    console.log(`Ayarlar yükleniyor...`);
    if (data.siteSettings) {
        for (const setting of data.siteSettings) {
            await prisma.siteSettings.upsert({
                where: { key: setting.key },
                update: setting,
                create: setting,
            });
        }
    }

    // 7. Politikalar
    console.log(`Politikalar yükleniyor...`);
    if (data.policies) {
        for (const policy of data.policies) {
            await prisma.policy.upsert({
                where: { slug: policy.slug },
                update: policy,
                create: policy,
            });
        }
    }

    console.log("✅ Tüm veriler başarıyla yüklendi!");
}

importData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
