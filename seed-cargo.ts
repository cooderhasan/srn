
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    const companies = ["Aras Kargo", "Yurtiçi Kargo", "MNG Kargo", "Sürat Kargo", "PTT Kargo"];

    console.log("Seeding cargo companies...");

    for (const name of companies) {
        await prisma.cargoCompany.upsert({
            where: { name },
            update: {},
            create: { name, isActive: true },
        });
    }

    console.log("Done.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
