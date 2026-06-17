/**
 * N11 Sipariş Toplam Düzeltme Scripti (Raw SQL)
 * 
 * Kullanım:
 *   npx tsx scripts/fix-n11-order-totals.ts          # Dry-run (sadece göster)
 *   npx tsx scripts/fix-n11-order-totals.ts --fix     # Gerçek düzeltme
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const isDryRun = !process.argv.includes('--fix');

    console.log(`\n${'='.repeat(60)}`);
    console.log(isDryRun 
        ? '🔍 DRY-RUN MODU — Sadece gösteriyor, değişiklik YAPMIYOR'
        : '🔧 FIX MODU — Yanlış toplamlar DÜZELTİLECEK');
    console.log(`${'='.repeat(60)}\n`);

    // Raw SQL ile N11 siparişlerini çek
    const n11Orders = await prisma.$queryRaw<any[]>`
        SELECT o.id, o."orderNumber", o.total, o.subtotal, o."vatAmount", o."discountAmount", o."createdAt"
        FROM orders o
        WHERE o.source = 'N11'
        ORDER BY o."createdAt" DESC
    `;

    console.log(`📦 Toplam N11 siparişi: ${n11Orders.length}\n`);

    let fixCount = 0;
    let okCount = 0;

    for (const order of n11Orders) {
        // Bu siparişin itemlerini çek
        const items = await prisma.$queryRaw<any[]>`
            SELECT "lineTotal", "vatRate" FROM order_items WHERE "orderId" = ${order.id}
        `;

        let calculatedTotal = 0;
        let calculatedVat = 0;

        for (const item of items) {
            const lineTotal = Number(item.lineTotal);
            const vatRate = Number(item.vatRate) || 20;
            const lineVat = lineTotal - (lineTotal / (1 + vatRate / 100));
            calculatedTotal += lineTotal;
            calculatedVat += lineVat;
        }

        const calculatedSubtotal = calculatedTotal - calculatedVat;
        const currentTotal = Number(order.total);
        const diff = Math.abs(currentTotal - calculatedTotal);

        if (diff > 1) {
            fixCount++;
            console.log(`❌ Sipariş #${order.orderNumber}`);
            console.log(`   Mevcut Toplam:    ₺${currentTotal.toFixed(2)}`);
            console.log(`   Doğru Toplam:     ₺${calculatedTotal.toFixed(2)}`);
            console.log(`   Fark:             ₺${diff.toFixed(2)}`);
            console.log(`   Mevcut KDV:       ₺${Number(order.vatAmount).toFixed(2)} → Doğru: ₺${calculatedVat.toFixed(2)}`);
            console.log(`   Mevcut Ara Top:   ₺${Number(order.subtotal).toFixed(2)} → Doğru: ₺${calculatedSubtotal.toFixed(2)}`);
            console.log(`   Ürün Sayısı:      ${items.length}`);
            console.log(`   Tarih:            ${new Date(order.createdAt).toLocaleDateString('tr-TR')}`);

            if (!isDryRun) {
                await prisma.$executeRaw`
                    UPDATE orders 
                    SET total = ${calculatedTotal}, 
                        subtotal = ${calculatedSubtotal}, 
                        "vatAmount" = ${calculatedVat}
                    WHERE id = ${order.id}
                `;
                console.log(`   ✅ DÜZELTİLDİ!`);
            }
            console.log('');
        } else {
            okCount++;
        }
    }

    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Sonuç:`);
    console.log(`   ✅ Doğru sipariş: ${okCount}`);
    console.log(`   ❌ Yanlış sipariş: ${fixCount}`);
    
    if (isDryRun && fixCount > 0) {
        console.log(`\n💡 Düzeltmek için: npx tsx scripts/fix-n11-order-totals.ts --fix`);
    } else if (!isDryRun && fixCount > 0) {
        console.log(`\n✅ ${fixCount} sipariş başarıyla düzeltildi!`);
    } else if (fixCount === 0) {
        console.log(`\n🎉 Tüm siparişler zaten doğru!`);
    }
    console.log(`${'='.repeat(60)}\n`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
