
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_EMAIL || 'info@ladamarketi.com';

if (!apiKey) {
    console.error('❌ HATA: RESEND_API_KEY bulunamadı!');
    console.error('Lütfen Coolify Environment Variables ayarlarını kontrol edin.');
    process.exit(1);
}

const resend = new Resend(apiKey);

async function main() {
    console.log(`📧 Test maili gönderiliyor...`);
    // Ensure apiKey is treated as string since we checked it above or provide fallback
    console.log(`- API Key: ${(apiKey || "").substring(0, 5)}...`);
    console.log(`- Alıcı:   ${adminEmail}`);

    try {
        const { data, error } = await resend.emails.send({
            from: 'Lada Marketi <siparis@ladamarketi.com>',
            to: [adminEmail],
            subject: 'Test Maili: Sistem Çalışıyor 🚀',
            html: `
                <h1>Merhaba! 👋</h1>
                <p>Bu bir test mailidir.</p>
                <p>Eğer bu maili görüyorsanız, Resend API ve DNS ayarlarınız başarıyla yapılmış demektir.</p>
                <br>
                <p><strong>Zaman:</strong> ${new Date().toLocaleString()}</p>
            `,
        });

        if (error) {
            console.error('❌ Mail gönderme başarısız:', error);
            process.exit(1);
        }

        console.log('✅ Mail başarıyla gönderildi!');
        console.log('ID:', data?.id);
        console.log(`📥 Lütfen ${adminEmail} adresini (ve Spam kutusunu) kontrol edin.`);
    } catch (e) {
        console.error('❌ Beklenmeyen hata:', e);
        process.exit(1);
    }
}

main();
