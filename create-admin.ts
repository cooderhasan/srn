
import { prisma } from "./src/lib/db";
import bcrypt from "bcryptjs";

async function createAdmin() {
    const email = "admin@example.com";
    const password = "password123";

    console.log(`Checking if admin user exists: ${email}`);

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log("Admin user already exists. Updating password...");
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email },
                data: {
                    passwordHash: hashedPassword,
                    role: "ADMIN",
                    status: "APPROVED"
                }
            });
            console.log(`Password updated for ${email}`);
        } else {
            console.log("Creating new admin user...");
            const hashedPassword = await bcrypt.hash(password, 10);

            await prisma.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    companyName: "Admin User",
                    role: "ADMIN",
                    status: "APPROVED",
                },
            });
            console.log(`Admin user created successfully.`);
        }
    } catch (error) {
        console.error("Error creating/updating admin:", error);
    }
}

createAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
