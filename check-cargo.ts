import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const cargoCompanies = await prisma.cargoCompany.findMany();
    console.log("Cargo Companies:", JSON.stringify(cargoCompanies, null, 2));
    
    const sampleOrders = await prisma.order.findMany({
        take: 5,
        select: { cargoCompany: true }
    });
    console.log("Sample Orders Cargo Co:", JSON.stringify(sampleOrders, null, 2));
}

main();
