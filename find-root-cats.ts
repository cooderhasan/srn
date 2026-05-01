import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const roots = await prisma.category.findMany({
        where: { parentId: null },
        select: { id: true, name: true, slug: true }
    });
    console.log("Root categories:", JSON.stringify(roots, null, 2));
}

main().finally(() => prisma.$disconnect());
