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
        
        // Let's test with no status and different statuses
        const statuses = ["", "New", "Approved", "Unacked", "Packed", "Open", "Shipped"];
        
        for (const status of statuses) {
            let url = `${orderBaseUrl}/orders/merchantid/${merchantId}?limit=50&offset=0`;
            if (status) {
                url += `&status=${status}`;
            }
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": authHeader,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "User-Agent": "serinmotor_dev"
                }
            });

            if (!response.ok) {
                console.log(`Status ${status || 'ALL'}: HTTP ${response.status}`);
                continue;
            }

            const data = await response.json();
            const items = data?.items || [];
            console.log(`Status: ${status || 'ALL'} -> Count: ${items.length}`);
            if (items.length > 0) {
                console.log("Structure of first order:", JSON.stringify(items[0], null, 2));
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
