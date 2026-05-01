import "dotenv/config";
import { prisma } from "./src/lib/db";

async function main() {
    const email = "cooderhasan@gmail.com";

    await prisma.user.update({
        where: { email },
        data: {
            role: "CUSTOMER",
        },
    });

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            email: true,
            role: true,
            status: true,
        },
    });
    console.log("Updated User:", user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
