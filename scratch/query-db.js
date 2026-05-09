
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTasks() {
    console.log("Listing last 10 N11 tasks...");
    try {
        const tasks = await prisma.n11Task.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                n11Product: {
                    include: {
                        product: { select: { name: true, sku: true } }
                    }
                }
            }
        });
        tasks.forEach(t => {
            console.log(`Task ID: ${t.taskId}, Status: ${t.status}, Product: ${t.n11Product?.product?.name}, SKU: ${t.n11Product?.product?.sku}`);
        });
    } catch (err) {
        console.error("DB Query failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

listTasks();
