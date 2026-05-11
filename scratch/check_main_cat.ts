
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const cat = await prisma.category.findUnique({
        where: { slug: "motosiklet-yedek-parca" }
    });
    console.log(cat);
}

main();
