process.env.DATABASE_URL = "postgres://postgres:YIVjfixFdgdSPMDEm9pf7UMFfO354AggIMrJAszjyyWGKjdMfBYuj8Lzh3Rb490S@vo4gook4kcwgocwo4wgk0cgw:5432/postgres";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Connecting using Prisma...");
        const config = await prisma.hepsiburadaConfig.findFirst({ where: { isActive: true } });
        console.log("Production Hepsiburada Config:", JSON.stringify(config, null, 2));
    } catch (e) {
        console.error("Prisma connection failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
