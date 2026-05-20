const { PrismaClient } = require('@prisma/client');

// Since we want to run this quickly, let's read the HepsiburadaConfig from DB and fetch using standard fetch.
const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.hepsiburadaConfig.findMany();
    console.log("All configs:", JSON.stringify(configs, null, 2));
    const config = configs.find(c => c.isActive) || configs[0];
    if (!config) {
        console.error("No Hepsiburada config found!");
        return;
    }

    const orderNumber = "4773201639";
    const pair = `${config.username}:${config.password}`;
    const authHeader = `Basic ${Buffer.from(pair).toString("base64")}`;
    const url = `https://oms-external.hepsiburada.com/orders/merchantid/${config.merchantId}/ordernumber/${orderNumber}`;

    console.log("Fetching order:", url);
    const response = await fetch(url, {
        headers: {
            "Authorization": authHeader,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "serinmotor_dev",
        }
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Order Data:");
    console.log(JSON.stringify(data, null, 2));
}

main().finally(() => prisma.$disconnect());
