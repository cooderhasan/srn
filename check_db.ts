import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking configurations...");
    const hb = await prisma.hepsiburadaConfig.findMany();
    const ty = await prisma.trendyolConfig.findMany();
    const n11 = await prisma.n11Config.findMany();
    console.log('HB Configs:', JSON.stringify(hb, null, 2));
    console.log('Trendyol Configs:', JSON.stringify(ty, null, 2));
    console.log('N11 Configs:', JSON.stringify(n11, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
