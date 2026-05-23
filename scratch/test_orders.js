const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const config = await prisma.hepsiburadaConfig.findFirst({ where: { isActive: true } });
    if (!config) throw new Error("No active config");

    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const headers = { 
        'Authorization': `Basic ${token}`, 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'User-Agent': 'serinmotor_dev'
    };

    const host = 'oms-external-sit.hepsiburada.com';
    const merchantId = config.merchantId || config.username;

    const beginDate3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const beginDate3Str = beginDate3.toISOString().substring(0, 19); // YYYY-MM-DDTHH:mm:ss
    
    // Note the unencoded beginDate here
    const url = `https://${host}/orders/merchantid/${merchantId}?limit=100&offset=0&beginDate=${beginDate3Str}`;
    console.log(`Fetching with unencoded beginDate: ${url}`);
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Result count:', data?.items?.length || 0);
}

run().catch(console.error).finally(() => prisma.$disconnect());
