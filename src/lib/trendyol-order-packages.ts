import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";
import { CANCEL_STOCK_RESTORE_FROM, cancelOrderFromMarketplace, leastAdvanced, mapTrendyolPackageStatus, orderStatusRank } from "@/lib/order-status-sync";

/**
 * Trendyol'da var olan bir siparişin paketlerini işler (sipariş senkronu).
 *
 * Trendyol kısmi iptalde siparişi böler: aynı sipariş numarasında bir İptal paketi (iptal edilen kalemler) ve
 * yeni bir aktif paket (kalanlar) olur. Önceden paketler tek tek işleniyordu: aktif paket siparişi "Onaylandı"ya
 * geri çekiyor, iptal paketi siparişi TAMAMEN iptal edip bütün adetlerin stoğunu geri ekliyordu; her 15 dakikada
 * tekrarlanıp stok şişiyordu (11815982624: 2 adetten 1'i iptal, stok 4 kez +2 eklendi).
 *
 * Kurallar:
 *  - Paketler sipariş numarasına göre birlikte değerlendirilir.
 *  - Hepsi iptalse: ortak iptal (cancelOrderFromMarketplace; kargolanmamışta, stok iadesi bir kez).
 *  - Aktif paket varsa sipariş iptal edilmez; iptal paketlerindeki adetler siparişten düşülür ve SADECE o adetlerin
 *    stoğu geri eklenir. Her iptal paketi bir kez işlenir (paket numarası nota yazılır).
 *  - Durum sadece ileri gider, İptal'den geri dönülmez (aşağıdaki onarım hariç).
 *  - Onarım: eski hatayla tam iptal edilmiş ama Trendyol'da aktif paketi olan sipariş geri açılır ve adedi düzeltilir;
 *    stoğa dokunulmaz, fazladan eklenen adet nota yazılır (kullanıcı stoğu elle düzeltiyor).
 *
 * Bardakçı'dan alındı. Serin'de kalemde "stok düşüldü mü" alanı yok: "Tanımsız Ürün"e bağlı kalemin stoğu hiç
 * düşülmediği için stok iadesinde zaten atlanır (lib/stock-sync), aşağıda da bu kalemler stoğu düşülmemiş sayılır.
 */

const PKG_MARK = (id: string) => `[TY-IPTAL-PAKET:${id}]`;
const AUTO_CANCEL_RESTORED = /Pazaryerinde iptal edildi \([^)]*\); stok geri eklendi/g;

type Pkg = any;
type Item = { id: string; productId: string; variantId: string | null; productName: string; quantity: number; unitPrice: any; lineTotal: any; stockDeducted: boolean };

const isCancelledPkg = (p: Pkg) => mapTrendyolPackageStatus(p?.status) === "CANCELLED";

/** Paket satırını siparişin kalemine eşler: barkod (varyant / ürün), yoksa ürün adı */
async function itemForLine(items: Item[], line: any): Promise<Item | undefined> {
    const barcode = String(line?.barcode || "").trim();
    if (barcode) {
        const variant = await prisma.productVariant.findFirst({ where: { barcode }, select: { id: true, productId: true } });
        if (variant) {
            const hit = items.find((i) => i.variantId === variant.id) || items.find((i) => i.productId === variant.productId);
            if (hit) return hit;
        }
        const product = await prisma.product.findFirst({ where: { barcode }, select: { id: true } });
        if (product) {
            const hit = items.find((i) => i.productId === product.id);
            if (hit) return hit;
        }
    }
    const name = String(line?.productName || "").trim();
    return items.find((i) => i.productName === name);
}

/** Paket satırlarındaki adetleri kaleme göre toplar */
async function quantitiesByItem(items: Item[], pkgs: Pkg[]) {
    const byItem = new Map<string, number>();
    for (const p of pkgs) {
        for (const line of Array.isArray(p?.lines) ? p.lines : []) {
            const it = await itemForLine(items, line);
            if (!it) continue;
            byItem.set(it.id, (byItem.get(it.id) || 0) + Number(line?.quantity || 0));
        }
    }
    return byItem;
}

/**
 * Kalem başına iptal edilen adet. Trendyol kısmi iptalde eski paketi BÜTÜN adetleriyle "iptal" gösterebiliyor
 * (11815982624: 2 adetlik paket iptal + 1 adetlik yeni aktif paket); iptal paketlerinin toplamı alınınca kalem
 * tamamen siliniyordu. Doğrusu: siparişteki adet − aktif paketlerdeki adet (en fazla iptal paketlerindeki adet kadar;
 * aktif paketle eşleşmeyen kaleme, iptal paketinde görünmüyorsa dokunulmaz).
 */
async function cancelledQuantities(items: Item[], cancelled: Pkg[], active: Pkg[]) {
    const inCancelled = await quantitiesByItem(items, cancelled);
    const inActive = await quantitiesByItem(items, active);
    const cut = new Map<string, number>();
    for (const it of items) {
        const c = inCancelled.get(it.id) || 0;
        if (c <= 0) continue;
        const shouldCut = Math.min(c, Math.max(0, it.quantity - (inActive.get(it.id) || 0)));
        if (shouldCut > 0) cut.set(it.id, shouldCut);
    }
    return cut;
}

/**
 * Önceki hatanın kalemini tamamen sildiği siparişte kalemler aktif paketlerden yeniden oluşturulur
 * (stoğa dokunulmaz; kullanıcı stoğu elle düzeltiyor). Tutar kalemlerin toplamı olur.
 */
async function rebuildItemsFromActive(order: { id: string; notes: string | null }, active: Pkg[]) {
    const lines = active.flatMap((p) => (Array.isArray(p?.lines) ? p.lines : []));
    if (lines.length === 0) return false;
    const { getUnmatchedProduct } = await import("@/lib/unmatched-product");
    const rows: any[] = [];
    for (const line of lines) {
        const barcode = String(line?.barcode || "").trim();
        const variant = barcode ? await prisma.productVariant.findFirst({ where: { barcode }, select: { id: true, productId: true } }) : null;
        const product = !variant && barcode ? await prisma.product.findFirst({ where: { barcode }, select: { id: true } }) : null;
        const fallback = !variant && !product ? await getUnmatchedProduct() : null;
        const productId = variant?.productId || product?.id || fallback?.id;
        if (!productId) continue;
        const quantity = Number(line?.quantity) || 1;
        const price = Number(line?.price) || 0;
        rows.push({
            orderId: order.id, productId, variantId: variant?.id || null, productName: String(line?.productName || "Ürün"),
            quantity, unitPrice: price, discountRate: 0, vatRate: 20, lineTotal: price * quantity,
        });
    }
    if (rows.length === 0) return false;
    const total = Math.round(rows.reduce((s, r) => s + r.lineTotal, 0) * 100) / 100;
    const today = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
    await prisma.$transaction(async (tx) => {
        await tx.orderItem.createMany({ data: rows });
        await tx.order.update({
            where: { id: order.id },
            data: {
                total, subtotal: total, vatAmount: Math.round(total * (20 / 120) * 100) / 100,
                notes: [order.notes, `Trendyol kalemleri aktif paketten yeniden oluşturuldu (${today}); stoğa dokunulmadı`].filter(Boolean).join(" | "),
            },
        });
    });
    return true;
}

/** Kalem adetlerini düşürür (0 olan kalem silinir), sipariş tutarını yeniden hesaplar */
async function shrinkItems(tx: any, orderId: string, items: Item[], cut: Map<string, number>) {
    let removed = 0;
    for (const it of items) {
        const c = Math.min(cut.get(it.id) || 0, it.quantity);
        if (c <= 0) continue;
        const left = it.quantity - c;
        removed += Number(it.unitPrice) * c;
        if (left <= 0) await tx.orderItem.delete({ where: { id: it.id } });
        else await tx.orderItem.update({ where: { id: it.id }, data: { quantity: left, lineTotal: Number(it.unitPrice) * left } });
    }
    return Math.round(removed * 100) / 100;
}

/**
 * Var olan Trendyol siparişi için paketleri uygular. Değişiklik yaptıysa true.
 * pkgs: aynı sipariş numarasının senkronda gelen paketleri.
 */
export async function applyTrendyolPackages(existing: { id: string }, pkgs: Pkg[]): Promise<boolean> {
    const order = await prisma.order.findUnique({
        where: { id: existing.id },
        select: {
            id: true, status: true, notes: true, createdAt: true, orderNumber: true, total: true, subtotal: true,
            cargoTrackingNumber: true, shipmentPackageId: true,
            items: { select: { id: true, productId: true, variantId: true, productName: true, quantity: true, unitPrice: true, lineTotal: true, product: { select: { slug: true } } } },
        },
    });
    if (!order) return false;
    const { UNMATCHED_SLUG } = await import("@/lib/unmatched-product");
    const items: Item[] = order.items.map(({ product, ...it }) => ({ ...it, stockDeducted: product?.slug !== UNMATCHED_SLUG }));
    const notes = order.notes || "";

    const active = pkgs.filter((p) => !isCancelledPkg(p));
    const cancelled = pkgs.filter(isCancelledPkg);

    // Hepsi iptal: ortak iptal (kargolanmamışsa; stok bir kez iade edilir, iptal edilmiş siparişe tekrar dokunulmaz)
    if (active.length === 0) {
        return cancelOrderFromMarketplace(order.id, "trendyol");
    }

    const rep = active[0];
    const activeStatus = leastAdvanced(active.map((p) => mapTrendyolPackageStatus(p?.status)));
    const newCancelled = cancelled.filter((p) => !notes.includes(PKG_MARK(String(p.id))));
    const today = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
    const restoreAllowed = order.createdAt >= CANCEL_STOCK_RESTORE_FROM;
    const { restoreOrderStock, handlePostOrderStockSync } = await import("@/lib/stock-sync");

    // ---- Onarım: eski hata siparişi tamamen iptal etmiş, Trendyol'da ise aktif paket var ----
    if (String(order.status) === "CANCELLED") {
        const restoredTimes = (notes.match(AUTO_CANCEL_RESTORED) || []).length;
        if (!notes.includes("Pazaryerinde iptal edildi")) return false; // elle iptal edilmiş: dokunulmaz
        if (!activeStatus || activeStatus === "CANCELLED") return false; // aktif paketin durumu belirsiz (iade vb.): dokunulmaz
        const cut = await cancelledQuantities(items, cancelled, active);
        // Stoğa dokunulmaz (kullanıcı kararı 2026-11-11: hatalı iptallerde fazladan eklenen stok elle düzeltilir).
        // Fazlalık bilgisi nota yazılır: n kez tüm adet eklendi, olması gereken sadece iptal edilen adet.
        const excess = restoredTimes > 0
            ? items.reduce((s, it) => it.stockDeducted === false ? s : s + Math.max(0, it.quantity - Math.min(cut.get(it.id) || 0, it.quantity)) + (restoredTimes - 1) * it.quantity, 0)
            : 0;
        const status = activeStatus as OrderStatus;

        await prisma.$transaction(async (tx) => {
            const removed = await shrinkItems(tx, order.id, items, cut);
            const marks = cancelled.map((p) => PKG_MARK(String(p.id))).join(" ");
            const note = `Trendyol kısmi iptal düzeltmesi (${today}): sipariş hatayla tamamen iptal edilmişti, aktif paket olduğu için geri açıldı; `
                + `iptal edilen adet siparişten düşüldü${excess > 0 ? `. DİKKAT: stoğa hatayla ${excess} adet fazla eklendi, stok elle düzeltilmeli` : ""} ${marks}`;
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status,
                    notes: [notes, note].filter(Boolean).join(" | "),
                    ...(removed > 0 ? { total: Math.max(0, Number(order.total) - removed), subtotal: Math.max(0, Number(order.subtotal) - removed) } : {}),
                    ...(rep?.id ? { shipmentPackageId: String(rep.id) } : {}),
                    ...(rep?.cargoTrackingNumber ? { cargoTrackingNumber: String(rep.cargoTrackingNumber), cargoCompany: rep.cargoProviderName } : {}),
                },
            });
        });
        console.log(`[trendyol] ${order.orderNumber}: hatalı tam iptal onarıldı (stoğa dokunulmadı, fazla: ${excess})`);
        return true;
    }

    let changed = false;

    // Önceki hatanın kalemini sildiği (0 TL kalmış) sipariş: kalemler aktif paketten yeniden oluşturulur
    if (items.length === 0 && orderStatusRank(String(order.status)) !== undefined) {
        if (await rebuildItemsFromActive(order, active)) changed = true;
    }

    // ---- Kısmi iptal: yeni iptal paketlerinin adetleri düşülür, sadece onların stoğu eklenir (paket başına bir kez) ----
    const rank = orderStatusRank(String(order.status));
    if (newCancelled.length > 0 && rank !== undefined) {
        const cut = await cancelledQuantities(items, newCancelled, active);
        const restoreItems = items
            .map((it) => ({ productId: it.productId, variantId: it.variantId, quantity: Math.min(cut.get(it.id) || 0, it.quantity) }))
            .filter((x) => x.quantity > 0);
        const units = restoreItems.reduce((s, x) => s + x.quantity, 0);
        const affected: string[] = await prisma.$transaction(async (tx) => {
            const removed = await shrinkItems(tx, order.id, items, cut);
            const marks = newCancelled.map((p) => PKG_MARK(String(p.id))).join(" ");
            const note = `Trendyol'da kısmi iptal (${today}): ${units} adet iptal edildi; ${restoreAllowed ? "stok geri eklendi" : "eski sipariş, stok değiştirilmedi"} ${marks}`;
            await tx.order.update({
                where: { id: order.id },
                data: {
                    notes: [notes, note].filter(Boolean).join(" | "),
                    ...(removed > 0 ? { total: Math.max(0, Number(order.total) - removed), subtotal: Math.max(0, Number(order.subtotal) - removed) } : {}),
                },
            });
            return restoreAllowed && restoreItems.length ? restoreOrderStock(tx, restoreItems) : [];
        });
        if (affected.length > 0) handlePostOrderStockSync(affected, "trendyol").catch(console.error);
        console.log(`[trendyol] ${order.orderNumber}: kısmi iptal, ${units} adet`);
        changed = true;
    }

    // ---- Durum (sadece ileri) ve aktif paketin kargo bilgisi ----
    const updates: any = {};
    const nextRank = activeStatus && activeStatus !== "CANCELLED" ? orderStatusRank(activeStatus) : undefined;
    if (rank !== undefined && nextRank !== undefined && nextRank > rank) {
        updates.status = activeStatus;
    }
    const tracking = rep?.cargoTrackingNumber?.toString();
    if (tracking && order.cargoTrackingNumber !== tracking) {
        updates.cargoTrackingNumber = tracking;
        updates.cargoCompany = rep.cargoProviderName;
    }
    const pkgId = rep?.id?.toString();
    if (pkgId && order.shipmentPackageId !== pkgId) updates.shipmentPackageId = pkgId;
    if (Object.keys(updates).length > 0) {
        await prisma.order.update({ where: { id: order.id }, data: updates });
        changed = true;
    }
    return changed;
}
