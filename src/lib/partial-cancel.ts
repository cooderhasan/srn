import { prisma } from "@/lib/db";
import { CANCEL_STOCK_RESTORE_FROM, cancelOrderFromMarketplace } from "@/lib/order-status-sync";

/**
 * Pazaryerinde KISMİ iptal (Bardakçı'dakinin aynısı): iptal edilen kalem adetleri siparişten düşülür, sadece o adetlerin
 * stoğu bir kez geri eklenir. Önceden kısmi iptal hiç işlenmiyordu (2 adet alınıp 1'i iptal edilince sipariş 2 adet ve
 * eski tutarla kalıyor, iptal edilen adedin stoğu dönmüyordu).
 *
 * - Sadece kargolanmamış siparişte (Beklemede / Onaylandı / Hazırlanıyor).
 * - Her iptal satırı bir kez işlenir: satır anahtarı nota yazılır ([PREFIX-IPTAL:anahtar]).
 * - İptal satırları siparişin tamamını kapsıyorsa ortak tam iptal (cancelOrderFromMarketplace) uygulanır.
 * - CANCEL_STOCK_RESTORE_FROM öncesi siparişlerde stok değiştirilmez (tam iptaldeki kuralla aynı).
 * - "Tanımsız Ürün"e bağlı kalemin stoğu zaten hiç düşülmediği için iade edilmez (lib/stock-sync atlar).
 * Trendyol'un paket yapısı farklı olduğu için onunki ayrı (lib/trendyol-order-packages.ts).
 */

export type Marketplace = "n11" | "hepsiburada";

export type CancelLine = {
    /** Pazaryerindeki iptal satırının tekil anahtarı (kalem id'si vb.) */
    key: string;
    quantity: number;
    productId?: string | null;
    variantId?: string | null;
    name?: string | null;
};

const PREFIX: Record<Marketplace, string> = { n11: "N11", hepsiburada: "HB" };
const LABEL: Record<Marketplace, string> = { n11: "N11'de", hepsiburada: "Hepsiburada'da" };
export const cancelMark = (mp: Marketplace, key: string) => `[${PREFIX[mp]}-IPTAL:${key}]`;

/** Ürün kodundan (stok kodu / barkod, ürün ya da varyant) bizdeki ürünü bulur */
export async function productByCode(codes: (string | null | undefined)[]): Promise<{ productId: string; variantId: string | null } | null> {
    const list = [...new Set(codes.map((c) => String(c || "").trim()).filter(Boolean))];
    if (list.length === 0) return null;
    const variant = await prisma.productVariant.findFirst({
        where: { OR: [{ sku: { in: list } }, { barcode: { in: list } }] },
        select: { id: true, productId: true },
    });
    if (variant) return { productId: variant.productId, variantId: variant.id };
    const product = await prisma.product.findFirst({
        where: { OR: [{ sku: { in: list } }, { barcode: { in: list } }, { gtin: { in: list } }] },
        select: { id: true },
    });
    return product ? { productId: product.id, variantId: null } : null;
}

export async function applyPartialCancel(orderId: string, lines: CancelLine[], mp: Marketplace): Promise<boolean> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true, status: true, notes: true, createdAt: true, orderNumber: true, total: true, subtotal: true,
            items: { select: { id: true, productId: true, variantId: true, productName: true, quantity: true, unitPrice: true } },
        },
    });
    if (!order || !["PENDING", "CONFIRMED", "PROCESSING"].includes(String(order.status))) return false;
    const notes = order.notes || "";
    const fresh = lines.filter((l) => l.key && l.quantity > 0 && !notes.includes(cancelMark(mp, l.key)));
    if (fresh.length === 0) return false;

    // Satırı kaleme eşle: varyant, ürün, ad
    const cut = new Map<string, number>();
    const used: CancelLine[] = [];
    for (const l of fresh) {
        const it = (l.variantId && order.items.find((i) => i.variantId === l.variantId))
            || (l.productId && order.items.find((i) => i.productId === l.productId && (cut.get(i.id) || 0) < i.quantity))
            || (l.productId && order.items.find((i) => i.productId === l.productId))
            || (l.name && order.items.find((i) => i.productName === l.name));
        if (!it) continue;
        cut.set(it.id, (cut.get(it.id) || 0) + l.quantity);
        used.push(l);
    }
    if (used.length === 0) return false;

    // Bütün adetler iptalse: tam iptal (ortak kural)
    const allCancelled = order.items.every((i) => (cut.get(i.id) || 0) >= i.quantity);
    if (allCancelled) return cancelOrderFromMarketplace(order.id, mp);

    const restoreAllowed = order.createdAt >= CANCEL_STOCK_RESTORE_FROM;
    const today = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
    const { restoreOrderStock, handlePostOrderStockSync } = await import("@/lib/stock-sync");
    const restoreItems = order.items
        .map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: Math.min(cut.get(i.id) || 0, i.quantity) }))
        .filter((x) => x.quantity > 0);
    const units = restoreItems.reduce((s, x) => s + x.quantity, 0);

    const affected: string[] = await prisma.$transaction(async (tx) => {
        let removed = 0;
        for (const it of order.items) {
            const c = Math.min(cut.get(it.id) || 0, it.quantity);
            if (c <= 0) continue;
            removed += Number(it.unitPrice) * c;
            const left = it.quantity - c;
            if (left <= 0) await tx.orderItem.delete({ where: { id: it.id } });
            else await tx.orderItem.update({ where: { id: it.id }, data: { quantity: left, lineTotal: Number(it.unitPrice) * left } });
        }
        removed = Math.round(removed * 100) / 100;
        const note = `${LABEL[mp]} kısmi iptal (${today}): ${units} adet iptal edildi, siparişten düşüldü; `
            + `${restoreAllowed ? "stok geri eklendi" : "eski sipariş, stok değiştirilmedi"} ${used.map((l) => cancelMark(mp, l.key)).join(" ")}`;
        await tx.order.update({
            where: { id: order.id },
            data: {
                notes: [notes, note].filter(Boolean).join(" | "),
                ...(removed > 0 ? { total: Math.max(0, Number(order.total) - removed), subtotal: Math.max(0, Number(order.subtotal) - removed) } : {}),
            },
        });
        return restoreAllowed ? restoreOrderStock(tx, restoreItems) : [];
    });
    if (affected.length > 0) handlePostOrderStockSync(affected, mp).catch(console.error);
    console.log(`[partial-cancel] ${mp} ${order.orderNumber}: ${units} adet kısmi iptal`);
    return true;
}
