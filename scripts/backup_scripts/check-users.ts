import "dotenv/config";
import { prisma } from "./src/lib/db";

async function main() {
    const users = await prisma.user.findMany({
        select: {
            email: true,
            role: true,
            status: true,
        },
    });
    console.log("Users:", users);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
