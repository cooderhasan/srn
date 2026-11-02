import { prisma } from "@/lib/db";
import {
    advanceOrderStatus,
    cancelOrderFromMarketplace,
    catchUpStaleOrders,
    leastAdvanced,
    mapHepsiburadaItemStatus,
    mapN11PackageStatus,
    mapTrendyolPackageStatus,
} from "@/lib/order-status-sync";

/**
 * Kuyruktaki sipariş senkronlarının ardından çalışır: o pazaryerinde durumu takılı kalmış siparişleri
 * pazaryerine sorup İLERİ taşır. Kurallar için lib/order-status-sync.ts.
 * Hepsi hata yakalar; sipariş senkronunu asla bozmaz.
 */

export async function runHepsiburadaStatusCatchUp() {
    const config = await (prisma as any).hepsiburadaConfig.findFirst({ where: { isActive: true } });
    if (!config) return { checked: 0, advanced: 0 };
    const { HepsiburadaClient } = await import("@/services/hepsiburada/api");
    const client = new HepsiburadaClient({
        username: config.username,
        password: config.password,
        merchantId: config.merchantId,
        isTestMode: config.isTestMode ?? false,
    });

    // 1) Dokümandaki "kargoya verilen" ve "teslim edilen" paket listeleri (son 1 ay, sipariş numarasıyla).
    //    Sipariş detayındaki kalem durumu beklenen alanda gelmeyebildiği için esas yol bu.
    let listChecked = 0;
    let listAdvanced = 0;
    for (const [state, next] of [["delivered", "DELIVERED"], ["shipped", "SHIPPED"]] as const) {
        for (let page = 0; page < 20; page++) {
            let rows: any[] = [];
            try {
                rows = await client.getPackagesByState(state, page * 50, 50);
            } catch (e: any) {
                console.warn(`[status-sync] HB ${state} listesi:`, e?.message);
                break;
            }
            if (rows.length === 0) break;
            const nums = Array.from(new Set(rows.map((r) => String(r?.orderNumber ?? r?.OrderNumber ?? "").trim()).filter(Boolean)));
            if (nums.length > 0) {
                const orders = await prisma.order.findMany({
                    where: { source: "HEPSIBURADA", orderNumber: { in: nums }, status: { in: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"] } },
                    select: { id: true, status: true },
                });
                for (const o of orders) {
                    listChecked++;
                    if (await advanceOrderStatus(o, next)) listAdvanced++;
                }
            }
            if (rows.length < 50) break;
            await new Promise((r) => setTimeout(r, 300));
        }
    }
    // İptal listesi (son 1 ay, kalem bazlı): siparişin TÜM adetleri iptalse sitede iptal (kısmi iptale dokunulmaz)
    try {
        const cancelledQty = new Map<string, number>();
        for (let page = 0; page < 20; page++) {
            const rows = await client.getCancelledOrderLines(page * 50, 50);
            if (rows.length === 0) break;
            for (const r of rows) {
                const no = String(r?.orderNumber ?? r?.OrderNumber ?? "").trim();
                if (!no) continue;
                cancelledQty.set(no, (cancelledQty.get(no) || 0) + (Number(r?.quantity ?? r?.Quantity) || 1));
            }
            if (rows.length < 50) break;
            await new Promise((r) => setTimeout(r, 300));
        }
        if (cancelledQty.size > 0) {
            const orders = await prisma.order.findMany({
                where: { source: "HEPSIBURADA", orderNumber: { in: Array.from(cancelledQty.keys()) }, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } },
                select: { id: true, orderNumber: true, items: { select: { quantity: true } } },
            });
            for (const o of orders) {
                const total = o.items.reduce((sum, i) => sum + i.quantity, 0);
                listChecked++;
                if (total > 0 && (cancelledQty.get(o.orderNumber) || 0) >= total) {
                    if (await cancelOrderFromMarketplace(o.id, "hepsiburada")) listAdvanced++;
                }
            }
        }
    } catch (e: any) {
        console.warn("[status-sync] HB iptal listesi:", e?.message);
    }

    if (listAdvanced > 0) console.log(`[status-sync] HEPSIBURADA (listeler): ${listChecked} eşleşme, ${listAdvanced} güncellendi`);

    // 2) Listelerde olmayan (1 aydan eski vb.) takılı siparişler tek tek: önce paket durumu (Intransit/Delivered),
    //    yoksa sipariş detayındaki kalem durumu
    const single = await catchUpStaleOrders("HEPSIBURADA", async ({ orderNumber, shipmentPackageId }) => {
        let pkgNo = shipmentPackageId && /^\d{6,}$/.test(shipmentPackageId) ? shipmentPackageId : null;
        let detailItems: any[] = [];
        if (!pkgNo) {
            const detail: any = await client.getOrderByNumber(orderNumber);
            detailItems = detail?.items || (Array.isArray(detail) ? detail : []);
            const pn = detailItems.map((i) => String(i?.packageNumber || "")).find((x) => /^\d{6,}$/.test(x));
            pkgNo = pn || null;
        }
        if (pkgNo) {
            const info = await client.getPackageCargoInfo(pkgNo);
            const st = String(info?.status || "").toLowerCase();
            if (st === "delivered") return "DELIVERED";
            if (st === "intransit" || st === "shipped") return "SHIPPED";
        }
        return leastAdvanced(detailItems.map((i) => mapHepsiburadaItemStatus(i?.status ?? i?.orderStatus)));
    });

    return { checked: listChecked + single.checked, advanced: listAdvanced + single.advanced };
}

/**
 * N11: sipariş numarasıyla paket sorgusu (dokümana göre). Tarih verilmezse sadece son 15 gün döndüğü için
 * siparişin oluşturulma tarihi etrafında 14 günlük aralık verilir. Bölünmüş siparişte en az ilerlemiş paket esas.
 */
export async function runN11StatusCatchUp() {
    const config = await (prisma as any).n11Config.findFirst();
    if (!config) return { checked: 0, advanced: 0 };
    const { N11Client } = await import("@/services/n11/api");
    const client = new N11Client({ apiKey: config.apiKey, apiSecret: config.apiSecret });
    const DAY = 24 * 60 * 60 * 1000;
    return catchUpStaleOrders("N11", async ({ orderNumber, createdAt }) => {
        const start = createdAt.getTime() - 2 * DAY;
        const end = Math.min(createdAt.getTime() + 12 * DAY, Date.now() + DAY);
        const pkgs = await client.getPackagesByOrderNumber(orderNumber, start, end);
        const mine = pkgs.filter((p: any) => String(p?.orderNumber || "") === String(orderNumber));
        return leastAdvanced(mine.map((p: any) => mapN11PackageStatus(p?.shipmentPackageStatus)));
    });
}

/** Trendyol: kendi senkronu sadece son 24 saatte oluşan siparişleri tarıyor; eski takılı siparişler sipariş numarasıyla tek tek */
/**
 * Tek seferlik onarım: Trendyol siparişlerine sipariş tarihi olarak aktarım anı yazılıyordu. 2 Kasım'da daha önce
 * aktarılamayan ~70 eski sipariş birden gelince "Bu Ay" Trendyol tutarı şişti. 31 Ekim'den beri oluşturulan
 * Trendyol siparişlerinin tarihi Trendyol'dan okunup düzeltilir; bitince Redis'e işaret konur, bir daha çalışmaz.
 */
const DATE_FIX_KEY = "trendyol-orderdate-fix-v1";
const DATE_FIX_FROM = new Date("2026-10-31T00:00:00+03:00");

export async function repairTrendyolOrderDates() {
    const { default: redis } = await import("@/lib/queue/redis");
    if (await redis.get(DATE_FIX_KEY)) return { skipped: true };
    const config = await (prisma as any).trendyolConfig.findFirst({ where: { isActive: true } });
    if (!config) return { checked: 0, fixed: 0 };
    const { TrendyolClient } = await import("@/services/trendyol/api");
    const { parseTrendyolDate } = await import("@/lib/order-status-sync");
    const client = new TrendyolClient({ supplierId: config.supplierId, apiKey: config.apiKey, apiSecret: config.apiSecret });

    const orders = await prisma.order.findMany({
        where: { source: "TRENDYOL", createdAt: { gte: DATE_FIX_FROM } },
        select: { id: true, orderNumber: true, createdAt: true },
    });
    let checked = 0;
    let fixed = 0;
    let failed = 0;
    for (const o of orders) {
        try {
            const pkgs = await client.getOrderPackages(o.orderNumber);
            const mine = pkgs.find((p: any) => String(p?.orderNumber || "") === String(o.orderNumber));
            const date = parseTrendyolDate(mine?.orderDate);
            checked++;
            if (date && Math.abs(o.createdAt.getTime() - date.getTime()) > 10 * 60 * 1000) {
                await prisma.order.update({ where: { id: o.id }, data: { createdAt: date } });
                fixed++;
            }
        } catch (e: any) {
            failed++;
            console.warn(`[trendyol-date-fix] ${o.orderNumber}:`, e?.message);
        }
        await new Promise((r) => setTimeout(r, 300));
    }
    // Hata alan sipariş varsa işaret konmaz, sonraki saatte tekrar denenir
    if (failed === 0) await redis.set(DATE_FIX_KEY, new Date().toISOString());
    console.log(`[trendyol-date-fix] ${orders.length} sipariş, ${checked} kontrol, ${fixed} tarih düzeltildi, ${failed} hata`);
    return { checked, fixed, failed };
}

export async function runTrendyolStatusCatchUp() {
    const config = await (prisma as any).trendyolConfig.findFirst({ where: { isActive: true } });
    if (!config) return { checked: 0, advanced: 0 };
    const { TrendyolClient } = await import("@/services/trendyol/api");
    const client = new TrendyolClient({ supplierId: config.supplierId, apiKey: config.apiKey, apiSecret: config.apiSecret });
    return catchUpStaleOrders("TRENDYOL", async ({ orderNumber }) => {
        const pkgs = await client.getOrderPackages(orderNumber);
        const mine = pkgs.filter((p: any) => String(p?.orderNumber || "") === String(orderNumber));
        return leastAdvanced(mine.map((p: any) => mapTrendyolPackageStatus(p?.status)));
    });
}
