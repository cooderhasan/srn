const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Hepsiburada product mappings...");
    const products = await prisma.hepsiburadaProduct.findMany({
        take: 20,
        include: { product: true }
    });
    console.log("Mappings count:", products.length);
    products.forEach(p => {
        console.log(`Product: ${p.product?.name}, hbSku: ${p.hbSku}, merchantSku: ${p.merchantSku}`);
    });

    console.log("\nChecking last 5 orders in database...");
    const orders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    });
    console.log("Orders count:", orders.length);
    orders.forEach(o => {
        console.log(`OrderNumber: ${o.orderNumber}, Source: ${o.source}, Status: ${o.status}, Total: ${o.total}, Items Count: ${o.items.length}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
