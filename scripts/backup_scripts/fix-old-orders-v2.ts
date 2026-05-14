import { prisma } from "./src/lib/db";

async function diagnoseAndFix() {
    console.log("Siparişler inceleniyor...");
    
    // Tüm siparişleri bir kontrol edelim (Özellikle Trendyol ibaresi geçenleri)
    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { cargoCompany: { contains: "TRENDYOL", mode: "insensitive" } },
                { shipmentPackageId: { not: null } },
                { guestEmail: { contains: "n11mail.com" } }
            ]
        },
        select: {
            id: true,
            orderNumber: true,
            source: true,
            cargoCompany: true
        }
    });

    console.log(`Toplam ${orders.length} adet potansiyel pazaryeri siparişi bulundu.`);

    for (const order of orders) {
        let newSource = null;
        if (order.cargoCompany?.toUpperCase().includes("TRENDYOL")) {
            newSource = "TRENDYOL";
        } else if (order.cargoCompany?.toUpperCase().includes("DHL") || order.orderNumber.length > 11) {
            // N11 Genelde uzun numaralar veya DHL kullanıyor bu örnekte
            newSource = "N11";
        }

        if (newSource && order.source !== newSource) {
            await prisma.order.update({
                where: { id: order.id },
                data: { source: newSource }
            });
            console.log(`Düzenlendi: #${order.orderNumber} -> ${newSource}`);
        }
    }

    console.log("İşlem tamamlandı.");
}

diagnoseAndFix()
    .catch(console.error)
    .finally(() => process.exit());
