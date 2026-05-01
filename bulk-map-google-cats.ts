import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  
  const mappings = [
    { key: "Şanzıman", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Şanzıman ve Aktarma Organları Parçaları" },
    { key: "Motor", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Motor Parçaları" },
    { key: "Elektrik", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Aydınlatma ve Elektrikli Parçaları" },
    { key: "Ateşleme", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Aydınlatma ve Elektrikli Parçaları" },
    { key: "Debriyaj", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Şanzıman ve Aktarma Organları Parçaları" },
    { key: "Filtre", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Yağ ve Sıvı Filtreleri" },
    { key: "Fren", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Fren Parçaları" },
    { key: "Aydınlatma", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Aydınlatma" },
    { key: "Dikiz Aynası", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Aynaları" },
    { key: "Silecek", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Cam Silecekleri" },
    { key: "Soğutma", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Motor Soğutma Parçaları" },
    { key: "Kalorifer", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Klima ve Isıtma Parçaları" },
    { key: "Direksiyon", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Direksiyon Parçaları" },
    { key: "Kaporta", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Gövde Parçaları" },
    { key: "Yakıt", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Yakıt Sistemi Parçaları" },
    { key: "Egzoz", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Egzoz Sistemi Parçaları" },
    { key: "Ön Düzen", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Süspansiyon Parçaları" },
    { key: "Arka Düzen", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Süspansiyon Parçaları" },
    { key: "Hortum", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları" },
    { key: "Sıvı", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları" },
    { key: "Aksesuar", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları > Araç Aksesuarları" },
    { key: "Yedek Parça", value: "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları" }
  ];

  const defaultCategory = "Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları";

  let updatedCount = 0;

  for (const cat of categories) {
    let matchedValue = defaultCategory;
    
    // En spesifik eşleşmeyi bulalım
    for (const mapping of mappings) {
      if (cat.name.toLowerCase().includes(mapping.key.toLowerCase())) {
        matchedValue = mapping.value;
        // Eğer Grubu veya Yedek Parça dışında daha spesifik bir anahtar kelimeyse dur
        if (mapping.key !== "Yedek Parça" && mapping.key !== "Grubu") break;
      }
    }

    if (cat.googleProductCategory !== matchedValue) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { googleProductCategory: matchedValue }
      });
      console.log(`Updated [${cat.name}] -> ${matchedValue}`);
      updatedCount++;
    }
  }

  console.log(`Total categories updated: ${updatedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
