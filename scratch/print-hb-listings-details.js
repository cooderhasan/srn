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
        const baseUrl = `https://listing-external${sitSuffix}.hepsiburada.com`;
        
        const pair = `${username}:${password}`;
        const authHeader = `Basic ${Buffer.from(pair).toString("base64")}`;
        
        const response = await fetch(`${baseUrl}/listings/merchantid/${merchantId}?limit=5&offset=0`, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "serinmotor_dev"
            }
        });

        const data = await response.json();
        const listings = data?.listings || data?.items || [];
        console.log("Listings count:", listings.length);
        console.log("Sample listings detail:", JSON.stringify(listings, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
