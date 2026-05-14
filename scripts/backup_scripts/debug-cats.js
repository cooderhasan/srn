
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCategories() {
  try {
    const cats = await prisma.category.findMany();
    console.log("Total Categories:", cats.length);
    
    cats.forEach(c => {
      if (c.googleProductCategory || c.name.includes("Aksesuar") || c.name.includes("Trim")) {
        console.log(`- ID: ${c.id}, Name: ${c.name}, GoogleCat: "${c.googleProductCategory}"`);
      }
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCategories();
