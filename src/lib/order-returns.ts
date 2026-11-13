import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

/**
 * Pazaryeri iadelerinin siparişe işlenmesi (Bardakçı'daki kullanıcı kararı 2026-11-12, Serin'e aynen alındı).
 *
 * - Sadece iadesi TAMAMLANAN (pazaryerinde onaylanmış / iade edildi) kalemler sayılır; açık talepler sayılmaz.
 * - Siparişin tamamı iadeyse durum "İade Edildi" (RETURNED), kısmi iadede durum değişmez, iade edilen tutar
 *   `returnedAmount`a yazılır. Raporlar: brüt satış − iade = net satış.
 * - Stoğa ASLA dokunulmaz (ürün bozuk dönebilir; kullanıcı elle değerlendirir).
 * - İdempotent: aynı iade her senkronda tekrar işlense de sonuç değişmez (tutar eklenmez, yeniden hesaplanıp yazılır).
 */

const NOTE_MARK = "[IADE]";

type ReturnSource = "trendyol" | "hepsiburada" | "n11";

const SOURCE_LABEL: Record<ReturnSource, string> = {
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
    n11: "N11",
};

/** İade işlenemeyecek durumlar: ödenmemiş / hiç gönderilmemiş iptal siparişi iade sayılmaz */
const SKIP_STATUSES = new Set(["WAITING_FOR_PAYMENT"]);

/**
 * Siparişe tamamlanmış iade tutarını işler. `amount` o siparişte şimdiye kadar iadesi tamamlanan TOPLAM tutardır
 * (bu senkronda gelen fark değil). Tutar sipariş toplamına ulaşırsa (1 TL tolerans) sipariş "İade Edildi" olur.
 * Değişiklik olduysa true.
 */
export async function applyMarketplaceReturn(
    orderId: string,
    amount: number,
    source: ReturnSource,
    opts: { full?: boolean; detail?: string } = {},
): Promise<boolean> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, status: true, total: true, returnedAmount: true, returnedAt: true, notes: true },
    });
    if (!order || SKIP_STATUSES.has(String(order.status))) return false;

    const total = Number(order.total || 0);
    const amt = Math.max(0, Math.round(amount * 100) / 100);
    const full = opts.full || (total > 0 && amt >= total - 1);
    const today = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
    const label = SOURCE_LABEL[source];

    if (full) {
        if (String(order.status) === "RETURNED") return false;
        const note = `${NOTE_MARK} ${label}'da iade tamamlandı (${today}): sipariş İade Edildi yapıldı, stoğa dokunulmadı${opts.detail ? ` · ${opts.detail}` : ""}`;
        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: "RETURNED" as OrderStatus,
                returnedAmount: total,
                returnedAt: order.returnedAt || new Date(),
                notes: [order.notes, note].filter(Boolean).join(" | "),
            },
        });
        console.log(`[iade] ${label} ${order.orderNumber}: tam iade (${total} TL)`);
        return true;
    }

    if (amt <= 0 || Math.abs(Number(order.returnedAmount || 0) - amt) < 0.01) return false;
    if (String(order.status) === "RETURNED") return false;
    const note = `${NOTE_MARK} ${label}'da kısmi iade (${today}): ${amt.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL iade, stoğa dokunulmadı${opts.detail ? ` · ${opts.detail}` : ""}`;
    await prisma.order.update({
        where: { id: order.id },
        data: {
            returnedAmount: amt,
            returnedAt: order.returnedAt || new Date(),
            notes: [order.notes, note].filter(Boolean).join(" | "),
        },
    });
    console.log(`[iade] ${label} ${order.orderNumber}: kısmi iade ${amt} TL`);
    return true;
}
