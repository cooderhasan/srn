
import { prisma } from "./src/lib/db";

async function checkAdmin() {
    console.log("Checking for admin users...");
    try {
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true, email: true, companyName: true, role: true }
        });

        if (admins.length === 0) {
            console.log("No ADMIN users found.");
        } else {
            console.log("Admin users found:", admins);
        }
    } catch (error) {
        console.error("Error checking users:", error);
    }
}

checkAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
