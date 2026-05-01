import "dotenv/config";
import { prisma } from "./src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
    const oldEmail = "admin@b2b.com";
    const newEmail = "ahmetufekci91@gmail.com";
    const password = "Ahmet.91!Tufekci_2025*Guvenli";

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Check if the old admin exists
    const oldAdmin = await prisma.user.findUnique({
        where: { email: oldEmail }
    });

    if (oldAdmin) {
        console.log(`Found old admin (${oldEmail}), updating to new email...`);
        const updatedUser = await prisma.user.update({
            where: { email: oldEmail },
            data: {
                email: newEmail,
                passwordHash: hashedPassword,
                role: "ADMIN",
                status: "APPROVED"
            }
        });
        console.log("Admin user updated (migrated):", { email: updatedUser.email });
    } else {
        console.log(`Old admin (${oldEmail}) not found, checking for new admin...`);
        // 2. Upsert the new admin directly
        const user = await prisma.user.upsert({
            where: { email: newEmail },
            update: {
                passwordHash: hashedPassword,
                role: "ADMIN",
                status: "APPROVED"
            },
            create: {
                email: newEmail,
                passwordHash: hashedPassword,
                role: "ADMIN",
                status: "APPROVED",
                companyName: "B2B Admin"
            }
        });
        console.log("Admin user updated/created:", { email: user.email });
    }

    console.log(`\nNew Admin Credentials:\nEmail: ${newEmail}\nPassword: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
