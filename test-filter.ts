import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function test() {
    console.log("Searching for 'Aras' (insensitive contains)...");
    const aras = await prisma.order.findMany({
        where: { cargoCompany: { contains: "Aras", mode: "insensitive" } },
        select: { id: true, cargoCompany: true }
    });
    console.log("Found Aras:", aras.length, aras[0] || "");

    console.log("Searching for 'Yurtici' (insensitive contains)...");
    const yk1 = await prisma.order.findMany({
        where: { cargoCompany: { contains: "Yurtici", mode: "insensitive" } },
        select: { id: true, cargoCompany: true }
    });
    console.log("Found Yurtici:", yk1.length);

    console.log("Searching for 'Yurti' (insensitive contains)...");
    const yk2 = await prisma.order.findMany({
        where: { cargoCompany: { contains: "Yurti", mode: "insensitive" } },
        select: { id: true, cargoCompany: true }
    });
    console.log("Found Yurti:", yk2.length);
    
    console.log("Searching for 'Yurt' (insensitive contains)...");
    const yk3 = await prisma.order.findMany({
        where: { cargoCompany: { contains: "Yurt", mode: "insensitive" } },
        select: { id: true, cargoCompany: true }
    });
    console.log("Found Yurt:", yk3.length);
}

test();
