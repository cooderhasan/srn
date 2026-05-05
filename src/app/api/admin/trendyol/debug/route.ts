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

        // 1. Config bilgileri
        const configInfo = {
            supplierId: config.supplierId,
            cargoCompanyId: config.cargoCompanyId,
            shipmentAddressId: config.shipmentAddressId,
            returningAddressId: config.returningAddressId,
        };

        // 2. Son gönderilen ürünleri kontrol et (TrendyolProduct tablosundan)
        let lastSyncedProducts: any[] = [];
        try {
            lastSyncedProducts = await (prisma as any).trendyolProduct.findMany({
                orderBy: { lastSyncedAt: "desc" },
                take: 5,
                include: { product: { select: { name: true, barcode: true, sku: true } } }
            });
        } catch (e) {}

        // 3. Batch request sonuçlarını kontrol et - son ürünlerin durumunu Trendyol'dan çek
        // Tüm mevcut ürünleri Trendyol'dan sorgula
        let trendyolProducts: any = null;
        try {
            const prodRes = await fetch(
                `${gatewayUrl}/integration/product/sellers/${config.supplierId}/products?page=0&size=10`,
                { headers }
            );
            if (prodRes.ok) {
                trendyolProducts = await prodRes.json();
            } else {
                trendyolProducts = { status: prodRes.status, text: await prodRes.text() };
            }
        } catch (e: any) {
            trendyolProducts = { error: e.message };
        }

        // 4. Test: Basit bir ürün oluşturma isteğini simüle et (gerçek göndermeden payload'u göster)
        let testProduct: any = null;
        try {
            testProduct = await prisma.product.findFirst({
                where: { 
                    isActive: true,
                    barcode: { not: null }
                },
                include: {
                    brand: true,
                    categories: true,
                    variants: true
                },
                orderBy: { updatedAt: "desc" }
            });
        } catch (e) {}

        let samplePayload: any = null;
        if (testProduct) {
            const mappedCat = (testProduct as any).categories?.find((c: any) => c.trendyolCategoryId !== null);
            const brandId = (testProduct as any).brand?.trendyolBrandId;
            
            const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.serinmotor.com";
            const imageUrls = testProduct.images
                .map((url: string) => url.startsWith("http") ? url : `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`)
                .filter((url: string) => url.startsWith("https://"));

            samplePayload = {
                productName: testProduct.name,
                barcode: testProduct.barcode,
                sku: testProduct.sku,
                brandId: brandId,
                categoryId: mappedCat?.trendyolCategoryId,
                categoryName: mappedCat?.name,
                cargoCompanyId: Number(config.cargoCompanyId),
                shipmentAddressId: Number(config.shipmentAddressId),
                returningAddressId: Number(config.returningAddressId),
                imageUrls,
                stock: testProduct.stock,
                listPrice: Number(testProduct.listPrice),
                vatRate: testProduct.vatRate,
                issues: [
                    !testProduct.barcode ? "❌ Barkod yok" : "✅ Barkod var",
                    !brandId ? "❌ Marka eşleşmemiş" : "✅ Marka eşleşmiş",
                    !mappedCat ? "❌ Kategori eşleşmemiş" : "✅ Kategori eşleşmiş",
                    imageUrls.length === 0 ? "❌ HTTPS görsel yok" : `✅ ${imageUrls.length} görsel`,
                    !config.cargoCompanyId ? "❌ Kargo firması seçilmemiş" : "✅ Kargo firması var",
                    !config.shipmentAddressId ? "❌ Sevkiyat adresi seçilmemiş" : "✅ Sevkiyat adresi var",
                    !config.returningAddressId ? "❌ İade adresi seçilmemiş" : "✅ İade adresi var",
                ]
            };
        }

        // 5. Adresleri kontrol et
        let addresses: any = null;
        try {
            const addrRes = await fetch(`${gatewayUrl}/integration/sellers/${config.supplierId}/addresses`, { headers });
            if (addrRes.ok) addresses = await addrRes.json();
            else addresses = { status: addrRes.status, text: await addrRes.text() };
        } catch (e: any) {
            addresses = { error: e.message };
        }

        return NextResponse.json({
            configInfo,
            lastSyncedProducts: lastSyncedProducts.map((p: any) => ({
                productName: p.product?.name,
                barcode: p.barcode,
                isSynced: p.isSynced,
                lastSyncedAt: p.lastSyncedAt,
                lastSyncError: p.lastSyncError
            })),
            trendyolProducts,
            samplePayload,
            addresses
        }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
