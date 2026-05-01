
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        googleProductCategory: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        googleProductCategory: true,
        parentId: true
      }
    });

    console.log("Google Kategorisi Atanmış Kategoriler:", categories.length);
    categories.forEach(c => {
      console.log(`- ${c.name} (ID: ${c.id}): ${c.googleProductCategory}`);
    });

  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
