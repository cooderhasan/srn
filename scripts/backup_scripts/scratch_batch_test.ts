const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.trendyolConfig.findFirst();
    if(!config) { console.log("No config"); return; }
    
    const gatewayUrl = "https://apigw.trendyol.com";
    const pair = `${config.apiKey}:${config.apiSecret}`;
    const headers = {
        "Authorization": `Basic ${Buffer.from(pair).toString("base64")}`,
        "User-Agent": `${config.supplierId} - SelfIntegration`,
        "Content-Type": "application/json"
    };

    const batchId = "a839bac4-f006-46bc-bd7c-0ac52c39673e-1778598832";
    const batchUrl = `${gatewayUrl}/integration/product/sellers/${config.supplierId}/products/batch-requests/${batchId}`;
    console.log("Fetching batch", batchId);
    
    const bRes = await fetch(batchUrl, { headers });
    console.log("Status:", bRes.status);
    if(bRes.ok) {
        const data = await bRes.json();
        console.log("RESPONSE DATA:");
        console.dir(data, { depth: null });
    } else {
        console.log(await bRes.text());
    }
}
main().finally(() => prisma.$disconnect());
