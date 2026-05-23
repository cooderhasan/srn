const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const config = await prisma.hepsiburadaConfig.findFirst({ where: { isActive: true } });
        if (!config) { console.log("No config"); return; }
        const { HepsiburadaClient } = require('../src/services/hepsiburada/api');
        const client = new HepsiburadaClient({
            username: config.username,
            password: config.password,
            merchantId: config.merchantId,
            isTestMode: config.isTestMode
        });
        const res = await client.getOrders({ status: "New", size: 1 });
        console.log("GetOrders first item JSON:", JSON.stringify(res?.items?.[0] || res?.[0], null, 2));
    } catch(e) {
        console.error(e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
