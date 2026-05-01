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
    where: { name: mainCategoryName },
    update: {},
    create: {
      name: mainCategoryName,
      slug: "motosiklet-yedek-parca",
      description: "Motosiklet yedek parça ve aksesuarları",
    },
  });

  console.log(`✅ Ana kategori hazır: ${mainCategory.name}`);

  // 2. Alt kategorileri ekle
  let count = 0;
  for (const subName of subCategories) {
    const slug = subName.toLowerCase()
      .replace(/ /g, "-")
      .replace(/[ığüşöç]/g, (m) => ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' }[m] || m));

    await prisma.category.upsert({
      where: { name: subName },
      update: { parentId: mainCategory.id },
      create: {
        name: subName,
        slug: slug,
        parentId: mainCategory.id,
      },
    });
    count++;
  }

  console.log(`🎉 Toplam ${count} alt kategori başarıyla eklendi!`);
}

main()
  .catch((e) => {
    console.error("❌ Hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
