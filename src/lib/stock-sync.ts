/**
 * Kritik Stok Otomatik Sıfırlama Modülü
 * 
 * Herhangi bir kaynaktan sipariş geldiğinde (site, Trendyol, N11, HB),
 * stok düştükten sonra bu modül çağrılır. Eğer ürünün stoku kritik seviyeye
 * ulaşmış veya altına düşmüşse, TÜM pazaryerlerine anında stok=0 gönderir.
 * 
 * Bu sayede kuyruk gecikmesi beklenmeden pazaryerlerinde satış durdurulur.
 */

import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/app/admin/(protected)/settings/actions";

interface StockCheckResult {
    productId: string;
    productName: string;
    currentStock: number;
    criticalStock: number;
    isCritical: boolean;
}

export interface OrderStockItem {
    productId: string;
    variantId?: string | null;
    quantity: number;
}

/**
 * Varyantlı ürünlerde stok varyantlarda tutulur; ana ürün stoğu = aktif varyant stoklarının toplamı.
 * Önceden her yer farklı davranıyordu: site ve N11/HB siparişi varyantla birlikte ana stoğu da düşüyor, Trendyol sadece
 * varyantı düşüyor, iptal ise ya varyantı ya ana stoğu geri ekliyordu; ana stok zamanla gerçek toplamdan sapıyordu.
 */
export async function recalcVariantParentStocks(db: any, productIds: string[]): Promise<void> {
    const ids = [...new Set(productIds.filter(Boolean))];
    if (ids.length === 0) return;
    const variants = await db.productVariant.findMany({
        where: { productId: { in: ids } },
        select: { productId: true, stock: true, isActive: true },
    });
    const totals = new Map<string, number>();
    for (const v of variants) {
        totals.set(v.productId, (totals.get(v.productId) || 0) + (v.isActive ? v.stock : 0));
    }
    for (const [productId, total] of totals) {
        await db.product.updateMany({ where: { id: productId, isBundle: false, NOT: { stock: total } }, data: { stock: total } });
    }
}

/**
 * Stoğu değişen ürünleri içeren paketlerin (ve paketin kendisinin) stoğunu alt ürünlerden yeniden hesaplar.
 * Önceden paket stoğu sadece paket kaydedilince hesaplanıyordu; alt ürün satılınca paket eski stokla pazaryerlerine gidiyordu.
 * Hesaplanan paket ID'lerini döner (pazaryeri senkronuna eklensin diye).
 */
export async function recalcBundleStocks(db: any, changedProductIds: string[]): Promise<string[]> {
    if (changedProductIds.length === 0) return [];
    const bundles = await db.product.findMany({
        where: {
            isBundle: true,
            OR: [
                { id: { in: changedProductIds } },
                { bundleItems: { some: { childProductId: { in: changedProductIds } } } },
            ],
        },
        select: {
            id: true,
            stock: true,
            bundleItems: { select: { quantity: true, childProduct: { select: { stock: true } } } },
        },
    });
    const bundleIds: string[] = [];
    for (const b of bundles) {
        if (!b.bundleItems || b.bundleItems.length === 0) continue;
        const stock = Math.max(0, Math.min(...b.bundleItems.map((bi: any) => Math.floor((bi.childProduct?.stock || 0) / (bi.quantity || 1)))));
        if (stock !== b.stock) await db.product.update({ where: { id: b.id }, data: { stock } });
        bundleIds.push(b.id);
    }
    return bundleIds;
}

/**
 * Siparişte stok düşme / iptalde iade: site, Trendyol, N11, HB ve iptallerin hepsi bunu kullanır.
 * - Paket ürün: her alt ürünün stoğu değişir, paket stoğu alt ürünlerden yeniden hesaplanır.
 * - Varyantlı ürün: varyant stoğu değişir, ana stok = varyant toplamı.
 * - Normal ürün: kendi stoğu değişir.
 * - "Tanımsız Ürün" (pazaryerinde eşleşmeyen kalem) atlanır.
 * Etkilenen TÜM ürün ID'lerini döner (paket alt ürünleri ve paketler dahil); pazaryeri stok senkronu bunlarla tetiklenir.
 */
async function changeOrderStock(tx: any, items: OrderStockItem[], direction: "decrement" | "increment"): Promise<string[]> {
    const { UNMATCHED_SLUG } = await import("@/lib/unmatched-product");
    const affectedIds = new Set<string>();
    const variantParents = new Set<string>();

    for (const item of items) {
        if (!item.productId || !(item.quantity > 0)) continue;

        const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, slug: true, isBundle: true, bundleItems: { select: { childProductId: true, quantity: true } } },
        });
        if (!product || product.slug === UNMATCHED_SLUG) continue;

        if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
            affectedIds.add(product.id);
            for (const bundleItem of product.bundleItems) {
                await tx.product.update({
                    where: { id: bundleItem.childProductId },
                    data: { stock: { [direction]: bundleItem.quantity * item.quantity } },
                });
                affectedIds.add(bundleItem.childProductId);
            }
        } else if (item.variantId) {
            await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { [direction]: item.quantity } },
            });
            affectedIds.add(product.id);
            variantParents.add(product.id);
        } else {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { [direction]: item.quantity } },
            });
            affectedIds.add(product.id);
        }
    }

    await recalcVariantParentStocks(tx, Array.from(variantParents));
    for (const id of await recalcBundleStocks(tx, Array.from(affectedIds))) affectedIds.add(id);

    return Array.from(affectedIds);
}

export async function decrementOrderStock(tx: any, items: OrderStockItem[]): Promise<string[]> {
    return changeOrderStock(tx, items, "decrement");
}

export async function restoreOrderStock(tx: any, items: OrderStockItem[]): Promise<string[]> {
    return changeOrderStock(tx, items, "increment");
}

/**
 * Verilen ürün ID'leri için stok durumunu kontrol eder.
 * Kritik seviyeye ulaşmış ürünleri döner.
 */
export async function checkCriticalStockLevels(productIds: string[]): Promise<StockCheckResult[]> {
    if (productIds.length === 0) return [];

    const generalSettings = await getSiteSettings("general");
    const defaultCritical = Number((generalSettings as any)?.defaultCriticalStock || 10);

    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
            id: true,
            name: true,
            stock: true,
            criticalStock: true,
            barcode: true,
            isBundle: true,
            bundleItems: { select: { quantity: true, childProduct: { select: { stock: true } } } },
            variants: {
                select: {
                    id: true,
                    stock: true,
                    barcode: true,
                    sku: true,
                },
            },
        },
    });

    return products.map((p) => {
        const criticalStock = p.criticalStock ?? defaultCritical;
        // Paket ürünün gerçek stoğu alt ürünlerden gelir (kayıtlı stok eski kalmış olabilir)
        const effectiveStock = p.isBundle && p.bundleItems.length > 0
            ? Math.min(...p.bundleItems.map((bi) => Math.floor(bi.childProduct.stock / (bi.quantity || 1))))
            : p.stock;
        let isCritical = effectiveStock <= criticalStock;
        if (!isCritical && p.variants && p.variants.length > 0) {
            isCritical = p.variants.some((v) => v.stock <= criticalStock);
        }
        return {
            productId: p.id,
            productName: p.name,
            currentStock: effectiveStock,
            criticalStock,
            isCritical,
        };
    });
}

/**
 * Kritik stoka ulaşmış ürünler için TÜM pazaryerlerine acil stok=0 gönderir.
 * Kuyruk (BullMQ) beklenmeden doğrudan API çağrısı yapar.
 * 
 * Bu fonksiyon fire-and-forget olarak çağrılmalıdır (.catch(console.error))
 */
export async function pushZeroStockToAllMarketplaces(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    console.log(`🚨 [Kritik Stok] ${productIds.length} ürün için acil stok=0 gönderimi başlatılıyor...`);

    // Her pazaryeri için paralel olarak stok=0 gönder
    const results = await Promise.allSettled([
        pushZeroStockToTrendyol(productIds),
        pushZeroStockToN11(productIds),
        pushZeroStockToHepsiburada(productIds),
    ]);

    for (const [index, result] of results.entries()) {
        const marketplaces = ["Trendyol", "N11", "Hepsiburada"];
        if (result.status === "fulfilled") {
            console.log(`✅ [Kritik Stok] ${marketplaces[index]} stok=0 gönderildi`);
        } else {
            console.error(`❌ [Kritik Stok] ${marketplaces[index]} hatası:`, result.reason?.message || result.reason);
        }
    }
}

/**
 * Ürün Trendyol/N11'de (veya sitede tamamen) kapatıldığında stok=0 gönderir.
 * Kritik stok fonksiyonlarından farkı: aktiflik ve stok seviyesi şartı aranmaz; kapatma sonrası bu bayraklar zaten false olur.
 * Hepsiburada burada yok: HB'nin normal senkronu kapalı ürüne stok 0 gönderir (syncProductsToHepsiburada).
 */
export async function pushZeroStockToMarketplaces(productIds: string[], marketplaces: ("trendyol" | "n11")[]): Promise<void> {
    if (productIds.length === 0 || marketplaces.length === 0) return;
    const pushers = { trendyol: pushZeroStockToTrendyol, n11: pushZeroStockToN11 };
    const results = await Promise.allSettled(marketplaces.map((m) => pushers[m](productIds, true)));
    results.forEach((r, i) => {
        if (r.status === "rejected") console.error(`❌ [Satıştan Çekme] ${marketplaces[i]} stok=0 hatası:`, r.reason?.message || r.reason);
        else console.log(`✅ [Satıştan Çekme] ${marketplaces[i]} stok=0 gönderildi`);
    });
}

/**
 * Sipariş geldiğinde çağrılacak ana fonksiyon.
 * 1. Etkilenen ürünlerin stok seviyesini kontrol eder
 * 2. Kritik seviyeye ulaşmış ürünler için acil stok=0 gönderir
 * 3. Kritik olmayan ürünler için normal kuyruk sync'i tetikler
 */
export async function handlePostOrderStockSync(
    affectedProductIds: string[],
    sourceMarketplace?: "trendyol" | "n11" | "hepsiburada" | "site"
): Promise<void> {
    if (affectedProductIds.length === 0) return;

    try {
        // 1. Kritik stok kontrolü
        const stockResults = await checkCriticalStockLevels(affectedProductIds);
        const criticalProducts = stockResults.filter((r) => r.isCritical);
        const normalProducts = stockResults.filter((r) => !r.isCritical);

        // 2. Kritik ürünler için ACIL stok=0 gönder (kuyruk BEKLENMEZ)
        if (criticalProducts.length > 0) {
            const criticalIds = criticalProducts.map((p) => p.productId);
            console.log(
                `🚨 [Kritik Stok] ${criticalProducts.length} ürün kritik seviyede:`,
                criticalProducts.map((p) => `${p.productName} (stok: ${p.currentStock}, kritik: ${p.criticalStock})`).join(", ")
            );

            // Fire and forget - doğrudan API çağrısı
            pushZeroStockToAllMarketplaces(criticalIds).catch(console.error);
        }

        // 3. Normal ürünler için kuyruk üzerinden sync (TÜM pazaryerleri dahil, kaynak platform DAHİL)
        if (normalProducts.length > 0) {
            const normalIds = normalProducts.map((p) => p.productId);
            const { addMarketplaceSyncJob } = await import("@/lib/queue/producer");

            // Tüm pazaryerlerine sync at (kaynak platform DAHİL - bu eskiden eksikti!)
            await Promise.all([
                addMarketplaceSyncJob({ marketplace: "trendyol", type: "stocks", productIds: normalIds }).catch(console.error),
                addMarketplaceSyncJob({ marketplace: "n11", type: "stocks", productIds: normalIds }).catch(console.error),
                addMarketplaceSyncJob({ marketplace: "hepsiburada", type: "stocks", productIds: normalIds }).catch(console.error),
            ]);
        }
    } catch (error) {
        console.error("❌ [PostOrder StockSync] Hata:", error);
        // Hata olsa bile kuyruk yedek olarak çalışsın
        try {
            const { addMarketplaceSyncJob } = await import("@/lib/queue/producer");
            await Promise.all([
                addMarketplaceSyncJob({ marketplace: "trendyol", type: "stocks", productIds: affectedProductIds }).catch(console.error),
                addMarketplaceSyncJob({ marketplace: "n11", type: "stocks", productIds: affectedProductIds }).catch(console.error),
                addMarketplaceSyncJob({ marketplace: "hepsiburada", type: "stocks", productIds: affectedProductIds }).catch(console.error),
            ]);
        } catch (e) {
            console.error("❌ [PostOrder StockSync] Yedek kuyruk da başarısız:", e);
        }
    }
}

// ======================== MARKETPLACE-SPECIFIC PUSH ========================

/**
 * Trendyol'a doğrudan stok=0 gönderir
 */
async function pushZeroStockToTrendyol(productIds: string[], includeClosed = false): Promise<void> {
    const config = await (prisma as any).trendyolConfig.findFirst({ where: { isActive: true } });
    if (!config) return;

    const generalSettings = await getSiteSettings("general");
    const defaultCritical = Number((generalSettings as any)?.defaultCriticalStock || 10);

    const { TrendyolClient } = await import("@/services/trendyol/api");
    const client = new TrendyolClient({
        supplierId: config.supplierId,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
    });

    // Ürünlerin barkodlarını çek (varyantlar dahil)
    const products = await prisma.product.findMany({
        where: includeClosed
            ? { id: { in: productIds } }
            : {
                id: { in: productIds },
                isActive: true,
                isTrendyolActive: true,
            },
        select: {
            id: true,
            stock: true,
            criticalStock: true,
            barcode: true,
            variants: { select: { id: true, stock: true, barcode: true } },
        },
    });

    const items: { barcode: string; quantity: number }[] = [];

    for (const p of products) {
        const criticalStock = p.criticalStock ?? defaultCritical;
        if (p.variants && p.variants.length > 0) {
            for (const v of p.variants) {
                if (v.barcode && (includeClosed || v.stock <= criticalStock)) {
                    items.push({ barcode: v.barcode, quantity: 0 });
                }
            }
        } else if (p.barcode && (includeClosed || p.stock <= criticalStock)) {
            items.push({ barcode: p.barcode, quantity: 0 });
        }
    }

    if (items.length === 0) return;

    const result = await client.updatePriceAndInventory(items);
    if (!result.ok) {
        throw new Error(`Trendyol stok=0 hatası: ${result.message || "Bilinmeyen"}`);
    }
}

/**
 * N11'e doğrudan stok=0 gönderir
 */
async function pushZeroStockToN11(productIds: string[], includeClosed = false): Promise<void> {
    const config = await (prisma as any).n11Config.findFirst({ where: { isActive: true } });
    if (!config) return;

    const generalSettings = await getSiteSettings("general");
    const defaultCritical = Number((generalSettings as any)?.defaultCriticalStock || 10);

    const { N11Client } = await import("@/services/n11/api");
    const client = new N11Client({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
    });

    const products = await prisma.product.findMany({
        where: includeClosed
            ? { id: { in: productIds } }
            : {
                id: { in: productIds },
                isActive: true,
                isN11Active: true,
            },
        select: {
            id: true,
            stock: true,
            criticalStock: true,
            sku: true,
            barcode: true,
            variants: { select: { id: true, stock: true, sku: true, barcode: true } },
        },
    });

    const items: { stockCode: string; quantity: number }[] = [];

    for (const p of products) {
        const criticalStock = p.criticalStock ?? defaultCritical;
        if (p.variants && p.variants.length > 0) {
            for (const v of p.variants) {
                const stockCode = v.sku || v.barcode;
                if (stockCode && (includeClosed || v.stock <= criticalStock)) {
                    items.push({ stockCode, quantity: 0 });
                }
            }
        } else {
            const stockCode = p.sku || p.barcode;
            if (stockCode && (includeClosed || p.stock <= criticalStock)) {
                items.push({ stockCode, quantity: 0 });
            }
        }
    }

    if (items.length === 0) return;

    // N11 updateStockAndPrice her item için quantity=0 gönder
    const syncItems = items.map((i) => ({
        stockCode: i.stockCode,
        quantity: 0,
        salePrice: 0, // N11 API price required, 0 = don't change
        listPrice: 0,
        currencyType: "TL" as const,
    }));

    await client.updateStockAndPrice(syncItems);
}

/**
 * Hepsiburada'ya doğrudan stok=0 gönderir
 */
async function pushZeroStockToHepsiburada(productIds: string[]): Promise<void> {
    const config = await (prisma as any).hepsiburadaConfig.findFirst({ where: { isActive: true } });
    if (!config) return;

    const generalSettings = await getSiteSettings("general");
    const defaultCritical = Number((generalSettings as any)?.defaultCriticalStock || 10);

    const { HepsiburadaClient } = await import("@/services/hepsiburada/api");
    const client = new HepsiburadaClient({
        username: config.username,
        password: config.password,
        merchantId: config.merchantId || config.username,
        isTestMode: config.isTestMode ?? false,
    });

    const products = await prisma.product.findMany({
        where: {
            id: { in: productIds },
            isActive: true,
        },
        include: { variants: true, hepsiburadaProduct: true },
    });

    // HB SKU eşleşmesi için listing'leri çekmemiz lazım
    let hbSkuMap: Record<string, string> = {};
    try {
        let offset = 0;
        const limit = 100;
        let hasMore = true;
        while (hasMore) {
            const res = await client.getListings(limit, offset);
            const arr = res?.listings || res?.items || (Array.isArray(res) ? res : []);
            if (arr.length === 0) {
                hasMore = false;
            } else {
                for (const l of arr) {
                    if (l.merchantSku && l.hepsiburadaSku) {
                        hbSkuMap[l.merchantSku] = l.hepsiburadaSku;
                    }
                }
                if (arr.length < limit) hasMore = false;
                else offset += limit;
            }
        }
    } catch (e: any) {
        console.error("[Kritik Stok HB] Listing çekilemedi:", e.message);
        return;
    }

    const hbItems: any[] = [];

    for (const p of products) {
        const criticalStock = p.criticalStock ?? defaultCritical;
        const hbMerchantSku = (p as any).hepsiburadaProduct?.merchantSku || p.sku || p.barcode || "";

        if (p.variants && p.variants.length > 0) {
            for (const v of p.variants) {
                if (v.stock > criticalStock) continue;
                const merchantSku = v.sku || v.barcode;
                if (!merchantSku) continue;
                const hepsiburadaSku = hbSkuMap[merchantSku] || hbSkuMap[hbMerchantSku] || (p as any).hepsiburadaProduct?.hbSku;
                if (!hepsiburadaSku) continue;

                hbItems.push({
                    hepsiburadaSku,
                    merchantSku,
                    availableStock: 0,
                    price: Number(p.listPrice),
                    dispatchTime: 1,
                    cargoCompany1: "Yurtiçi Kargo",
                    maximumPurchasableQuantity: 0,
                });
            }
        } else {
            if (p.stock > criticalStock) continue;
            const merchantSku = hbMerchantSku;
            const hepsiburadaSku = hbSkuMap[merchantSku] || (p as any).hepsiburadaProduct?.hbSku;
            if (!hepsiburadaSku) continue;

            hbItems.push({
                hepsiburadaSku,
                merchantSku,
                availableStock: 0,
                price: Number(p.listPrice),
                dispatchTime: 1,
                cargoCompany1: "Yurtiçi Kargo",
                maximumPurchasableQuantity: 0,
            });
        }
    }

    if (hbItems.length === 0) return;

    await client.uploadInventory(hbItems);
}

