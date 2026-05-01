import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Bekleyen teklif talepleri
        const pendingQuotes = await prisma.quote.count({
            where: { status: "PENDING" }
        });

        // Bekleyen bayi onayları
        const pendingDealers = await prisma.user.count({
            where: {
                role: "CUSTOMER",
                status: "PENDING"
            }
        });

        // Kritik stok uyarıları (Raw SQL kullanıyoruz çünkü Prisma'da column karşılaştırması yok)
        const lowStockProducts: { count: bigint }[] = await prisma.$queryRaw`
            SELECT COUNT(*)::bigint as count FROM products 
            WHERE stock <= "criticalStock" AND "isActive" = true
        `;
        const lowStock = Number(lowStockProducts[0]?.count || 0);

        // Yeni siparişler: Hazırlanması gereken (PENDING veya CONFIRMED) olanlar
        const newOrders = await prisma.order.count({
            where: {
                status: {
                    in: ["PENDING", "CONFIRMED"]
                }
            }
        });

        // Bekleyen havale bildirimleri
        const pendingTransfers = await prisma.bankTransferNotification.count({
            where: { status: "PENDING" }
        });

        const notifications = [];

        if (pendingQuotes > 0) {
            notifications.push({
                id: "quotes",
                title: "Yeni Teklif Talebi",
                description: `${pendingQuotes} adet bekleyen teklif var`,
                link: "/admin/quotes",
                type: "quote",
                count: pendingQuotes
            });
        }

        if (pendingTransfers > 0) {
            notifications.push({
                id: "bank-transfers",
                title: "Havale Bildirimi",
                description: `${pendingTransfers} adet yeni havale bildirimi var`,
                link: "/admin/bank-transfers",
                type: "bank-transfer",
                count: pendingTransfers
            });
        }

        if (pendingDealers > 0) {
            notifications.push({
                id: "dealers",
                title: "Bayi Onay Bekliyor",
                description: `${pendingDealers} üye onay bekliyor`,
                link: "/admin/customers?status=PENDING",
                type: "user",
                count: pendingDealers
            });
        }

        if (lowStock > 0) {
            notifications.push({
                id: "stock",
                title: "Düşük Stok Uyarısı",
                description: `${lowStock} üründe stok kritik`,
                link: "/admin/stock-alerts",
                type: "stock",
                count: lowStock
            });
        }

        if (newOrders > 0) {
            notifications.push({
                id: "orders",
                title: "Yeni Sipariş",
                description: `${newOrders} yeni sipariş var`,
                link: "/admin/orders?status=PENDING",
                type: "order",
                count: newOrders
            });
        }

        const totalCount = pendingQuotes + pendingDealers + lowStock + newOrders + pendingTransfers;

        return NextResponse.json({
            notifications,
            totalCount
        });
    } catch (error) {
        console.error("Notifications error:", error);
        return NextResponse.json({ error: "Bildirimler alınamadı" }, { status: 500 });
    }
}
