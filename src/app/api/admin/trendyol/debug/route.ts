import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const config = await (prisma as any).trendyolConfig.findFirst();
        if (!config) return NextResponse.json({ error: "No config found" });

        const gatewayUrl = "https://apigw.trendyol.com";
        const pair = `${config.apiKey}:${config.apiSecret}`;
        const headers: Record<string, string> = {
            "Authorization": `Basic ${Buffer.from(pair).toString("base64")}`,
            "User-Agent": `${config.supplierId} - SelfIntegration`,
            "Content-Type": "application/json"
        };

        // 1. Son gönderilen ürünleri DB'den al
        let lastSyncedProducts: any[] = [];
        try {
            lastSyncedProducts = await (prisma as any).trendyolProduct.findMany({
                orderBy: { lastSyncedAt: "desc" },
                take: 5,
                include: { product: { select: { name: true, barcode: true, sku: true } } }
            });
        } catch (e) {}

        // 2. Her birinin barkodunu Trendyol'da ara
        const barcodeSearchResults: any = {};
        for (const sp of lastSyncedProducts) {
            const barcode = sp.barcode || sp.product?.barcode;
            if (!barcode) continue;
            
            try {
                const url = `${gatewayUrl}/integration/product/sellers/${config.supplierId}/products?barcode=${barcode}`;
                const res = await fetch(url, { headers });
                if (res.ok) {
                    const data = await res.json();
                    barcodeSearchResults[barcode] = {
                        found: data.totalElements > 0,
                        totalElements: data.totalElements,
                        products: data.content?.map((p: any) => ({
                            title: p.title,
                            approved: p.approved,
                            rejected: p.rejected,
                            onSale: p.onSale,
                            rejectReasonDetails: p.rejectReasonDetails,
                            quantity: p.quantity,
                            listPrice: p.listPrice,
                            salePrice: p.salePrice,
                        }))
                    };
                } else {
                    barcodeSearchResults[barcode] = { status: res.status, text: (await res.text()).substring(0, 200) };
                }
            } catch (e: any) {
                barcodeSearchResults[barcode] = { error: e.message };
            }
        }

        // 3. Trendyol'un toplam ürün sayısı
        let totalProductCount = 0;
        try {
            const countRes = await fetch(`${gatewayUrl}/integration/product/sellers/${config.supplierId}/products?page=0&size=1`, { headers });
            if (countRes.ok) {
                const countData = await countRes.json();
                totalProductCount = countData.totalElements;
            }
        } catch (e) {}

        // 4. Onay bekleyen (approved=false, rejected=false) ürünleri ara
        let pendingProducts: any = null;
        try {
            const pendingRes = await fetch(
                `${gatewayUrl}/integration/product/sellers/${config.supplierId}/products?approved=false&page=0&size=10`,
                { headers }
            );
            if (pendingRes.ok) {
                const pendingData = await pendingRes.json();
                pendingProducts = {
                    totalElements: pendingData.totalElements,
                    products: pendingData.content?.map((p: any) => ({
                        title: p.title,
                        barcode: p.barcode,
                        approved: p.approved,
                        rejected: p.rejected,
                        onSale: p.onSale,
                        rejectReasonDetails: p.rejectReasonDetails,
                        createDateTime: new Date(p.createDateTime).toISOString(),
                    }))
                };
            } else {
                pendingProducts = { status: pendingRes.status, text: (await pendingRes.text()).substring(0, 200) };
            }
        } catch (e: any) {
            pendingProducts = { error: e.message };
        }

        return NextResponse.json({
            totalApprovedProducts: totalProductCount,
            lastSyncedFromDB: lastSyncedProducts.map((p: any) => ({
                name: p.product?.name,
                barcode: p.barcode,
                isSynced: p.isSynced,
                lastSyncedAt: p.lastSyncedAt,
                lastSyncError: p.lastSyncError
            })),
            barcodeSearchResults,
            pendingProducts
        }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
