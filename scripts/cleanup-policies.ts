import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🧹 Cleaning up unused policies...");

    const policiesToDelete = ["membership", "commercial-communication"];

    const result = await prisma.policy.deleteMany({
        where: {
            slug: {
                in: policiesToDelete,
            },
        },
    });

    console.log(`✅ Deleted ${result.count} policies.`);
}

main()
    .catch((e) => {
        console.error("❌ Cleanup error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
