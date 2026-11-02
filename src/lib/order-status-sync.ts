import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

/**
 * Pazaryeri siparişlerinin durumunu pazaryerindeki gerçek duruma göre İLERİ taşır.
 *
 * Güvenlik kuralları:
 * - Durum sadece ileri gider: Onaylandı → Hazırlanıyor → Kargolandı → Teslim Edildi. Asla geri gitmez.
 * - İptal / ödeme bekleyen siparişlere dokunulmaz.
 * - Pazaryerinde iptal edilen sipariş sadece henüz kargolanmamışsa iptal edilir (cancelOrderFromMarketplace).
 *
 * Neden: Trendyol senkronu sadece son 24 saatte oluşan siparişlere bakıyor, HB/N11 importları siparişi bir kez
 * aktarıp sonraki durum değişikliklerini hiç almıyordu; yüzlerce sipariş "Onaylandı"da kalıyordu
 * (2026-11-02: 369 sipariş "Kargolanacak", 361'i 2 günden eski).
 */

const RANK: Record<string, number> = { PENDING: 0, CONFIRMED: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4 };
type Forward = "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
/** Pazaryerinden okunan durum: ileri durumlar + iptal */
export type MarketplaceStatus = Forward | "CANCELLED";

export function orderStatusRank(s: string): number | undefined {
    return RANK[s];
}

/**
 * En az ilerlemiş kalemin durumu (çok kalemli siparişte hepsi kargolanmadan "Kargolandı" denmez).
 * İptal sadece TÜM kalemler iptalse döner; kısmi iptalde iptal kalemleri yok sayılır.
 */
export function leastAdvanced(statuses: (MarketplaceStatus | null)[]): MarketplaceStatus | null {
    if (statuses.length > 0 && statuses.every((s) => s === "CANCELLED")) return "CANCELLED";
    const valid = statuses.filter((s): s is Forward => !!s && s !== "CANCELLED");
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));
}

/** Durumu sadece ileri taşır; değiştiyse true */
export async function advanceOrderStatus(order: { id: string; status: OrderStatus | string }, next: MarketplaceStatus | null): Promise<boolean> {
    if (!next || next === "CANCELLED") return false; // iptal cancelOrderFromMarketplace ile işlenir
    const cur = RANK[String(order.status)];
    if (cur === undefined) return false; // CANCELLED / WAITING_FOR_PAYMENT
    if (RANK[next] <= cur) return false;
    await prisma.order.update({ where: { id: order.id }, data: { status: next as OrderStatus } });
    return true;
}

/**
 * Durumu takılı kalmış olabilecek siparişler: 6 saatten eski, Beklemede/Onaylandı/Hazırlanıyor.
 * En uzun süredir kontrol edilmeyenden başlar (updatedAt), kontrol edilenin updatedAt'i güncellenir;
 * böylece her senkronda sıradaki siparişlere bakılır.
 */
export async function getStaleOrders(source: string, limit = 25) {
    return prisma.order.findMany({
        where: {
            source,
            status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] },
            createdAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000), gt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: "asc" },
        take: limit,
        select: { id: true, orderNumber: true, status: true, shipmentPackageId: true, createdAt: true },
    });
}

export async function markChecked(orderId: string) {
    await prisma.order.update({ where: { id: orderId }, data: { updatedAt: new Date() } }).catch(() => {});
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Marketplace = "trendyol" | "n11" | "hepsiburada";

/**
 * Bir pazaryerinin takılı siparişlerini tek tek sorgulayıp ilerletir.
 * resolve: sipariş numarasından pazaryerindeki durumu döndürür (bilinmiyorsa null).
 * Hata olursa senkronu bozmaz.
 */
export async function catchUpStaleOrders(
    source: string,
    resolve: (order: { orderNumber: string; shipmentPackageId: string | null; createdAt: Date }) => Promise<MarketplaceStatus | null>,
    opts: { limit?: number; delayMs?: number } = {},
): Promise<{ checked: number; advanced: number }> {
    let checked = 0;
    let advanced = 0;
    try {
        const stale = await getStaleOrders(source, opts.limit ?? 25);
        for (const o of stale) {
            try {
                const next = await resolve({ orderNumber: o.orderNumber, shipmentPackageId: o.shipmentPackageId, createdAt: o.createdAt });
                checked++;
                if (next === "CANCELLED") {
                    if (await cancelOrderFromMarketplace(o.id, source.toLowerCase() as Marketplace)) advanced++;
                    else await markChecked(o.id);
                } else if (await advanceOrderStatus(o, next)) advanced++;
                else await markChecked(o.id);
            } catch (e: any) {
                console.warn(`[status-sync] ${source} ${o.orderNumber}:`, e?.message);
                await markChecked(o.id);
            }
            await sleep(opts.delayMs ?? 300);
        }
    } catch (e: any) {
        console.warn(`[status-sync] ${source} genel hata:`, e?.message);
    }
    if (advanced > 0) console.log(`[status-sync] ${source}: ${checked} kontrol, ${advanced} ilerletildi`);
    return { checked, advanced };
}

// ---- Pazaryeri durum eşlemeleri ----

/** Trendyol paket durumu */
export function mapTrendyolPackageStatus(s: any): MarketplaceStatus | null {
    const v = String(s || "").trim().toLowerCase();
    if (v === "created" || v === "awaiting") return "CONFIRMED";
    if (v === "picking" || v === "invoiced") return "PROCESSING";
    if (v === "shipped" || v === "atcollectionpoint") return "SHIPPED";
    if (v === "delivered") return "DELIVERED";
    if (v === "cancelled" || v === "unsupplied") return "CANCELLED";
    return null; // Returned, UnDelivered, UnPacked
}

/** N11 shipmentPackageStatus (dokümandaki değerler; örnekte başında boşluk olabiliyor) */
export function mapN11PackageStatus(s: any): MarketplaceStatus | null {
    const v = String(s || "").trim().toLowerCase();
    if (v === "cancelled" || v === "unsupplied") return "CANCELLED";
    if (v === "created") return "CONFIRMED";
    if (v === "picking") return "PROCESSING";
    if (v === "shipped") return "SHIPPED";
    if (v === "delivered") return "DELIVERED";
    return null; // UnPacked
}

/** Hepsiburada sipariş detayı kalem durumu */
export function mapHepsiburadaItemStatus(s: any): MarketplaceStatus | null {
    const v = String(s || "").toLowerCase();
    if (v === "cancelledbymerchant" || v === "cancelledbycustomer" || v === "cancelledbysap") return "CANCELLED";
    if (v === "open" || v === "unpacked") return "CONFIRMED";
    if (v === "packaged" || v === "readytoship") return "PROCESSING";
    if (v === "intransit" || v === "shipped") return "SHIPPED";
    if (v === "delivered") return "DELIVERED";
    return null; // talep (claim/iade) vb.
}

// ---- Pazaryerinde iptal ----

/**
 * Bu tarihten önce oluşan siparişler pazaryerinde iptal edilirse sadece durum "İptal" olur, stok değişmez:
 * önceden pazaryeri iptallerinde stok hiç geri eklenmiyordu, eski siparişlerin stoğu elle düzeltilmiş olabilir
 * (iki kez eklenmesin). Sonraki siparişlerde stok geri eklenir ve diğer pazaryerlerine gönderilir.
 */
export const CANCEL_STOCK_RESTORE_FROM = new Date("2026-11-02T00:00:00+03:00");

/**
 * Pazaryerinde İPTAL edilen siparişi sitede iptal eder. Sadece henüz kargolanmamış siparişlerde
 * (Beklemede / Onaylandı / Hazırlanıyor) çalışır; kargolanmış/teslim edilmiş siparişe dokunmaz (ürün depodan çıkmıştır).
 * İadeler için kullanılmaz. Değiştiyse true.
 */
export async function cancelOrderFromMarketplace(orderId: string, marketplace: Marketplace): Promise<boolean> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true, status: true, createdAt: true, notes: true, orderNumber: true,
            items: { select: { productId: true, variantId: true, quantity: true } },
        },
    });
    if (!order || !["PENDING", "CONFIRMED", "PROCESSING"].includes(String(order.status))) return false;

    const restore = order.createdAt >= CANCEL_STOCK_RESTORE_FROM;
    const today = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
    const note = `Pazaryerinde iptal edildi (${today}); ${restore ? "stok geri eklendi" : "eski sipariş, stok değiştirilmedi"}`;

    const { restoreOrderStock, handlePostOrderStockSync } = await import("@/lib/stock-sync");
    const affected: string[] = await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" as OrderStatus, notes: [order.notes, note].filter(Boolean).join(" | ") },
        });
        return restore ? restoreOrderStock(tx, order.items) : [];
    });
    if (affected.length > 0) handlePostOrderStockSync(affected, marketplace).catch(console.error);
    console.log(`[status-sync] ${marketplace} ${order.orderNumber}: pazaryerinde iptal → sitede iptal${restore ? " + stok iade" : ""}`);
    return true;
}
