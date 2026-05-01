import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Kategori aktarımı başlatılıyor...");

  const mainCategoryName = "Motosiklet Yedek Parça";
  const subCategories = [
    "Akü", "Buji", "Egzoz", "Gates Kayış", "Jant", 
    "Koruma Demiri", "Mekanik Parça", "Sinyal Grubu",
    "Ayna", "Cam", "Far Grubu", "Grenaj Aksamı", 
    "Kaporta Setleri", "Kumanda ve Tel", "Motosiklet Motoru", 
    "Stop Lamba Grubu", "Benzin Deposu", "Debriyaj Balatası", 
    "Fren Aksamı", "Hava Filtreleri", "Kilometre Saati", 
    "Lastik", "Motosiklet Zincirleri"
  ];

  // 1. Ana kategoriyi oluştur veya bul
  const mainCategory = await prisma.category.upsert({
    where: { slug: "motosiklet-yedek-parca" },
    update: {},
    create: {
      name: mainCategoryName,
      slug: "motosiklet-yedek-parca",
      description: "Motosiklet yedek parça ve aksesuarları",
    },
  });

  console.log(`✅ Ana kategori hazır: ${mainCategory.name}`);

  // 2. İkinci Ana Kategori: Motosiklet Koruma Ekipmanları
  const protectionCategoryName = "Motosiklet Koruma Ekipmanları";
  const protectionSubCategories = [
    "Bot", "Gözlük", "Mont", "Yağmurluk", "Boyunluk & Maske", 
    "Kask", "Pantolon", "Yelekler & Termal Giyim", "Eldiven", 
    "Korumalar", "T-shirt"
  ];

  const protectionCategory = await prisma.category.upsert({
    where: { slug: "motosiklet-koruma-ekipmanlari" },
    update: {},
    create: {
      name: protectionCategoryName,
      slug: "motosiklet-koruma-ekipmanlari",
      description: "Motosiklet koruma ekipmanları ve giyim",
    },
  });

  console.log(`✅ İkinci ana kategori hazır: ${protectionCategory.name}`);

  // 3. Üçüncü Ana Kategori: Bakım ve Tamir Ürünleri
  const maintenanceCategoryName = "Bakım ve Tamir Ürünleri";
  const maintenanceSubCategories = [
    "Amortisör Yağı", "Fren Hidrolik Yağı", "Motul Bakım Ürünleri", 
    "Temizlik Ürünleri", "Antifriz", "Hiflo Filtre", "Tamir Seti", 
    "Yağ", "Branda & Örtü", "K&N Yağ Filtreleri", "Tamirat Ürünleri", 
    "Zincir Temizleme Ürünleri"
  ];

  const maintenanceCategory = await prisma.category.upsert({
    where: { slug: "bakim-ve-tamir-urunleri" },
    update: {},
    create: {
      name: maintenanceCategoryName,
      slug: "bakim-ve-tamir-urunleri",
      description: "Motosiklet bakım ve tamir malzemeleri",
    },
  });

  console.log(`✅ Üçüncü ana kategori hazır: ${maintenanceCategory.name}`);

  // 4. Dördüncü Ana Kategori: Motosiklet Aksesuar
  const accessoryCategoryName = "Motosiklet Aksesuar";
  const accessorySubCategories = [
    "Aksiyon Kamera ve Aparatları", "Çanta", "Kilit Sistemi", 
    "Motosiklet Moto Play", "Telefon Tutucu", "Alarm Sistemi", 
    "Elcik Koruma", "Led", "Motosiklet Takip Cihazları", 
    "Anahtarlık", "Intercom & Bluetooth", "Motosiklet Kamp Ürünleri", 
    "Tank Pad & Sticker"
  ];

  const accessoryCategory = await prisma.category.upsert({
    where: { slug: "motosiklet-aksesuar" },
    update: {},
    create: {
      name: accessoryCategoryName,
      slug: "motosiklet-aksesuar",
      description: "Motosiklet aksesuarları ve yardımcı ekipmanlar",
    },
  });

  console.log(`✅ Dördüncü ana kategori hazır: ${accessoryCategory.name}`);

  // 5. Beşinci Ana Kategori: Markaya Göre
  const brandCategoryName = "Markaya Göre";
  const brandSubCategories = [
    "Mondial", "Bajaj", "Cf Moto", "Kanuni", "RKS", "TVS", 
    "Honda", "Arora", "Chopper", "KTM", "Suzuki", "Yamaha", 
    "Atv", "Hero", "Kuba", "SYM Motor"
  ];

  const brandCategory = await prisma.category.upsert({
    where: { slug: "markaya-gore" },
    update: {},
    create: {
      name: brandCategoryName,
      slug: "markaya-gore",
      description: "Markalara göre kategorize edilmiş ürünler",
    },
  });

  console.log(`✅ Beşinci ana kategori hazır: ${brandCategory.name}`);

  // 6. Alt kategorileri ekle (Tüm gruplar için)
  async function addSubs(subs: string[], parentId: string) {
    let subCount = 0;
    for (const subName of subs) {
      const slug = subName.toLowerCase()
        .replace(/ /g, "-")
        .replace(/[ığüşöç&]/g, (m) => ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', '&': 've' }[m] || m));

      await prisma.category.upsert({
        where: { slug: slug },
        update: { parentId: parentId },
        create: {
          name: subName,
          slug: slug,
          parentId: parentId,
        },
      });
      subCount++;
    }
    return subCount;
  }

  const count1 = await addSubs(subCategories, mainCategory.id);
  const count2 = await addSubs(protectionSubCategories, protectionCategory.id);
  const count3 = await addSubs(maintenanceSubCategories, maintenanceCategory.id);
  const count4 = await addSubs(accessorySubCategories, accessoryCategory.id);
  const count5 = await addSubs(brandSubCategories, brandCategory.id);

  console.log(`🎉 Toplam ${count1 + count2 + count3 + count4 + count5} alt kategori başarıyla eklendi!`);

  // 7. Markalar (Brand Tablosuna Ekleme)
  console.log("🏷️ Markalar ekleniyor...");
  const brands = [
    "Monero", "Gms", "Ncr", "Tvr", "Srn", "Gogo", 
    "Givis", "Bajaj", "Jet Motor", "Tvs", "Mondial", "Kuba"
  ];

  let brandCount = 0;
  for (const bName of brands) {
    const bSlug = bName.toLowerCase().replace(/ /g, "-");
    await prisma.brand.upsert({
      where: { name: bName },
      update: {},
      create: {
        name: bName,
        slug: bSlug,
      },
    });
    brandCount++;
  }

  console.log(`✅ ${brandCount} adet marka başarıyla eklendi!`);
}

main()
  .catch((e) => {
    console.error("❌ Hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
