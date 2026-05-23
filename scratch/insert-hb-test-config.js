const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Inserting Hepsiburada SIT configurations...");
    const existing = await prisma.hepsiburadaConfig.findFirst();
    if (existing) {
        await prisma.hepsiburadaConfig.update({
            where: { id: existing.id },
            data: {
                username: "2c8b04a9-3898-4925-99a5-98875224b436",
                password: "xraAz49GJu29",
                merchantId: "2c8b04a9-3898-4925-99a5-98875224b436",
                isActive: true,
                isTestMode: true
            }
        });
        console.log("Updated existing config with SIT creds.");
    } else {
        await prisma.hepsiburadaConfig.create({
            data: {
                username: "2c8b04a9-3898-4925-99a5-98875224b436",
                password: "xraAz49GJu29",
                merchantId: "2c8b04a9-3898-4925-99a5-98875224b436",
                isActive: true,
                isTestMode: true
            }
        });
        console.log("Created new SIT config.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
