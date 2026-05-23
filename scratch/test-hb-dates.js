const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const config = await prisma.hepsiburadaConfig.findFirst({ where: { isActive: true } });
        if (!config) { console.log("No config"); return; }
        
        const username = config.username;
        const password = config.password;
        const merchantId = config.merchantId || username;
        const isTestMode = config.isTestMode ?? false;

        const sitSuffix = isTestMode ? "-sit" : "";
        const orderBaseUrl = `https://oms-external${sitSuffix}.hepsiburada.com`;
        
        const pair = `${username}:${password}`;
        const authHeader = `Basic ${Buffer.from(pair).toString("base64")}`;

        // 1. Fetch order details directly to see its creation date
        const detailsUrl = `${orderBaseUrl}/orders/merchantid/${merchantId}/ordernumber/HB1779377118128`;
        console.log("Fetching order details from:", detailsUrl);
        const res = await fetch(detailsUrl, {
            headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "serinmotor_dev"
            }
        });
        const orderData = await res.json();
        console.log("Order JSON:", JSON.stringify(orderData, null, 2));

        const orderCreatedDate = orderData?.createdDate || orderData?.[0]?.createdDate || orderData?.items?.[0]?.orderDate;
        console.log("\nOrder Creation Date in API response:", orderCreatedDate);

        // 2. Test fetching with begindate/enddate range containing this date
        // Let's try formatting it as "yyyy-MM-dd HH:mm:ss"
        // Wait, if orderCreatedDate is "2026-05-21T12:00:00Z" (for example), let's formulate range
        if (orderCreatedDate) {
            const dt = new Date(orderCreatedDate);
            const start = new Date(dt.getTime() - 60 * 60 * 1000); // 1 hour before
            const end = new Date(dt.getTime() + 60 * 60 * 1000); // 1 hour after

            const formatHBDate = (d) => {
                const pad = (num) => String(num).padStart(2, '0');
                return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
            };

            const startStr = formatHBDate(start);
            const endStr = formatHBDate(end);

            const baseDate = new Date(orderCreatedDate); // 2026-05-21T18:25:21.392
            console.log("\nBase order created date in JS Date:", baseDate.toISOString());

            const formatWithOffset = (date, hourOffset) => {
                // Formats a UTC date adding `hourOffset` hours, returns yyyy-MM-dd HH:mm
                const adjusted = new Date(date.getTime() + hourOffset * 60 * 60 * 1000);
                const pad = (num) => String(num).padStart(2, '0');
                return `${adjusted.getUTCFullYear()}-${pad(adjusted.getUTCMonth()+1)}-${pad(adjusted.getUTCDate())} ${pad(adjusted.getUTCHours())}:${pad(adjusted.getUTCMinutes())}`;
            };

            // We will test 3 range cases around the order creation time (18:25:21 in order response):
            // Case A: Querying with the assumption that the API expects UTC times.
            // If the API thinks 18:25:21 in response is UTC, querying UTC 18:00 to 19:00 should return it.
            // Case B: Querying with the assumption that the API expects Turkey local time (UTC+3) but the response date is UTC.
            // If response is 18:25:21 UTC (local 21:25:21), and we query with local time, we should query 21:00 to 22:00 local time.
            // Case C: Querying with assumption that response date is Turkey local time (18:25:21 is local time, UTC 15:25:21).
            // Let's test different ranges around the raw hours: 14:00-16:00, 15:00-17:00, 17:00-19:00, 18:00-20:00, 20:00-22:00.

            const testRanges = [
                { name: "Assumption: Raw hours (18:00 - 19:00)", startOffset: 0, endOffset: 0, startHour: 18, endHour: 19 },
                { name: "Assumption: 3 hours earlier (15:00 - 16:00)", startOffset: 0, endOffset: 0, startHour: 15, endHour: 16 },
                { name: "Assumption: 3 hours later (21:00 - 22:00)", startOffset: 0, endOffset: 0, startHour: 21, endHour: 22 },
                { name: "Assumption: 2 hours earlier (16:00 - 17:00)", startOffset: 0, endOffset: 0, startHour: 16, endHour: 17 }
            ];

            const pad = (num) => String(num).padStart(2, '0');
            const targetDateStr = "2026-05-21";

            for (const r of testRanges) {
                const startStr = `${targetDateStr} ${pad(r.startHour)}:00`;
                const endStr = `${targetDateStr} ${pad(r.endHour)}:00`;
                console.log(`\n--- Testing range: ${r.name} -> [${startStr} to ${endStr}] ---`);

                const listUrl = `${orderBaseUrl}/orders/merchantid/${merchantId}?begindate=${encodeURIComponent(startStr)}&enddate=${encodeURIComponent(endStr)}&limit=10&offset=0`;
                const listRes = await fetch(listUrl, {
                    headers: {
                        "Authorization": authHeader,
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "User-Agent": "serinmotor_dev"
                    }
                });
                const listResText = await listRes.text();
                console.log("Status:", listRes.status);
                try {
                    const listData = JSON.parse(listResText);
                    const count = listData?.items?.length || (Array.isArray(listData) ? listData.length : 0);
                    console.log("Returned count:", count);
                    if (count > 0) {
                        console.log("Sample Item orderNumber:", listData?.items?.[0]?.orderNumber || listData?.[0]?.orderNumber);
                        console.log("Sample Item orderDate:", listData?.items?.[0]?.orderDate || listData?.[0]?.orderDate);
                    }
                } catch (e) {
                    console.log("Failed to parse response body.");
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
