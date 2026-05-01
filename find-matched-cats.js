
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMatchedCategories() {
  try {
    const allCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        googleProductCategory: true
      }
    });

    console.log("Toplam Kategori Sayısı:", allCategories.length);
    const matched = allCategories.filter(c => 
      c.googleProductCategory && c.googleProductCategory.trim() !== ""
    );

    console.log("Eşleşmiş Kategori Sayısı (Süzülmüş):", matched.length);
    matched.forEach(c => {
      console.log(`- ${c.name}: ${c.googleProductCategory}`);
    });

    // Check for "Araçlar" string in any category name or field
    const search = allCategories.filter(c => 
      (c.googleProductCategory && c.googleProductCategory.includes("Araçlar")) ||
      (c.name && c.name.includes("Araçlar"))
    );
    console.log("Araçlar kelimesi geçenler:", search.length);

  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await prisma.$disconnect();
  }
}

findMatchedCategories();
