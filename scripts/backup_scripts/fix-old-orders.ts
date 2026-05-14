import { prisma } from "./src/lib/db";

async function fixOldOrders() {
    console.log("Eski Trendyol siparişleri düzeltiliyor...");
    
    // Cargo company contains Trendyol or shipmentPackageId exists
    const updated = await prisma.order.updateMany({
        where: {
            source: "WEB",
            OR: [
                { cargoCompany: { contains: "TRENDYOL", mode: "insensitive" } },
                { shipmentPackageId: { not: null } },
                { orderNumber: { startsWith: "1" } } // Trendyol numbers often start with 1 or 2 and are long
            ]
        },
        data: {
            source: "TRENDYOL"
        }
    });

    console.log(`${updated.count} adet eski sipariş TRENDYOL olarak güncellendi.`);
    
    // N11 check (often numbers like 202... or shipmentPackageId format)
    const updatedN11 = await prisma.order.updateMany({
        where: {
            source: "WEB",
            OR: [
                { cargoCompany: { contains: "DHL", mode: "insensitive" } }, // N11 user showed DHL earlier
                { guestEmail: { contains: "n11mail.com" } }
            ]
        },
        data: {
            source: "N11"
        }
    });
    
    console.log(`${updatedN11.count} adet eski sipariş N11 olarak güncellendi.`);
}

fixOldOrders()
    .catch(console.error)
    .finally(() => process.exit());
