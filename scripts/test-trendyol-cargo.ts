import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const config = await prisma.trendyolConfig.findFirst({ where: { isActive: true } });
    if (!config) {
        console.log("No config");
        return;
    }

    const gatewayUrl = "https://apigw.trendyol.com";
    const pair = `${config.apiKey}:${config.apiSecret}`;
    const headers = {
        "Authorization": `Basic ${Buffer.from(pair).toString("base64")}`,
        "User-Agent": `${config.supplierId} - SelfIntegration`,
        "Content-Type": "application/json"
    };

    // Get Addresses
    console.log("Fetching Addresses...");
    const addrResponse = await fetch(`${gatewayUrl}/integration/cargo/sellers/${config.supplierId}/addresses`, { headers });
    if (addrResponse.ok) {
        const addrData = await addrResponse.json();
        console.log("Addresses:", JSON.stringify(addrData, null, 2));
    } else {
        console.log("Failed to fetch addresses:", await addrResponse.text());
    }

    // Get Providers
    console.log("\nFetching Cargo Providers...");
    const provResponse = await fetch(`${gatewayUrl}/integration/cargo/sellers/${config.supplierId}/providers`, { headers });
    if (provResponse.ok) {
        const provData = await provResponse.json();
        console.log("Providers:", JSON.stringify(provData, null, 2));
    } else {
        console.log("Failed to fetch providers:", await provResponse.text());
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
