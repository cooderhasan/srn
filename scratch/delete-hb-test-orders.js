const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Deleting HEPSIBURADA orders...");
        const result = await prisma.order.deleteMany({
            where: { source: 'HEPSIBURADA' }
        });
        console.log(`Deleted ${result.count} orders.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
