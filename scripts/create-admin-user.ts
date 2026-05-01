
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generatePassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

async function main() {
    const email = "info@ladamarketi.com";
    const password = generatePassword();

    console.log("🔒 Şifre hashleniyor...");
    const passwordHash = await bcrypt.hash(password, 10);

    console.log(`👤 Kullanıcı oluşturuluyor/güncelleniyor: ${email}`);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            role: 'ADMIN',
            status: 'APPROVED',
        },
        create: {
            email,
            passwordHash,
            role: 'ADMIN',
            status: 'APPROVED',
            companyName: 'Lada Marketi Admin',
        },
    });

    console.log("\n✅ Admin kullanıcısı başarıyla oluşturuldu/güncellendi!");
    console.log("==================================================");
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("==================================================");
    console.log("⚠️  Lütfen bu şifreyi güvenli bir yere kaydedin!");
    console.log("⚠️  Bu script güvenlik amacıyla çalıştıktan sonra silinmelidir.");
}

main()
    .catch((e) => {
        console.error("❌ Hata:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
