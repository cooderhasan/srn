
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  try {
    const product = await prisma.product.findFirst({
      where: {
        slug: {
          contains: 'gazelle'
        }
      },
      include: {
        category: true,
        categories: true
      }
    });

    if (!product) {
      console.log("Ürün bulunamadı.");
      return;
    }

    console.log("Ürün Adı:", product.name);
    console.log("Legacy categoryId:", product.categoryId);
    console.log("Legacy category name:", product.category?.name);
    console.log("Legacy googleProductCategory:", product.category?.googleProductCategory);
    
    console.log("M-N Categories count:", product.categories.length);
    product.categories.forEach((cat, index) => {
      console.log(`Category ${index + 1}:`, cat.name);
      console.log(`Google Category ${index + 1}:`, cat.googleProductCategory);
    });

  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProduct();
