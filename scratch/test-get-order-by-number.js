const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const config = await prisma.hepsiburadaConfig.findFirst({ where: { isActive: true } });
        if (!config) {
            console.log("❌ No active config");
            return;
        }

        const username = config.username;
        const password = config.password;
        const merchantId = config.merchantId || username;
        const isTestMode = config.isTestMode ?? false;

        const sitSuffix = isTestMode ? "-sit" : "";
        const orderBaseUrl = `https://oms-external${sitSuffix}.hepsiburada.com`;
        
        const pair = `${username}:${password}`;
        const authHeader = `Basic ${Buffer.from(pair).toString("base64")}`;
        
        const orderNumber = "4852187715";
        const url = `${orderBaseUrl}/orders/merchantid/${merchantId}/ordernumber/${orderNumber}`;
        console.log("Fetching order from URL:", url);
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "serinmotor_dev"
            }
        });

        const data = await response.json();
        console.log("Response structure:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
