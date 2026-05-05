const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.trendyolConfig.findFirst({ where: { isActive: true } });
    if(!config) { console.log("No config"); return; }
    
    const gatewayUrl = "https://apigw.trendyol.com";
    const pair = `${config.apiKey}:${config.apiSecret}`;
    const headers = {
        "Authorization": `Basic ${Buffer.from(pair).toString("base64")}`,
        "User-Agent": `${config.supplierId} - SelfIntegration`,
        "Content-Type": "application/json"
    };

    // Son 5 batch ID'sini veritabanından bulalım
    const latestProducts = await prisma.trendyolProduct.findMany({
        where: { batchRequestId: { not: null } },
        orderBy: { lastSyncedAt: 'desc' },
        take: 10
    });

    console.log(`Checking ${latestProducts.length} latest batches...`);

    for (const tp of latestProducts) {
        const batchId = tp.batchRequestId;
        const url = `${gatewayUrl}/integration/product/sellers/${config.supplierId}/products/batch-requests/${batchId}`;
        const res = await fetch(url, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log(`Batch ${batchId} (Status: ${data.status}):`);
            if (data.items) {
                data.items.forEach(item => {
                    const barcode = item.requestItem?.barcode || item.requestItem?.product?.barcode || "Unknown";
                    console.log(`  - Item ${barcode}: ${item.status}`);
                    if (item.failureReasons) {
                        console.log(`    Failures: ${JSON.stringify(item.failureReasons)}`);
                    }
                });
            }
        } else {
            console.log(`Batch ${batchId} fetch failed: ${res.status}`);
        }
    }
}
main().finally(() => prisma.$disconnect());
