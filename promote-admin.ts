import "dotenv/config";
import { prisma } from "./src/lib/db";

async function main() {
    const emailsToPromote = ["admin@motovitrin.com", "admin@admin.com"];

    await prisma.user.updateMany({
        where: {
            email: {
                in: emailsToPromote,
            },
        },
        data: {
            role: "ADMIN",
            status: "APPROVED",
        },
    });

    const users = await prisma.user.findMany({
        where: {
            email: {
                in: emailsToPromote,
            },
        },
        select: {
            email: true,
            role: true,
            status: true,
        },
    });
    console.log("Updated Users:", users);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
