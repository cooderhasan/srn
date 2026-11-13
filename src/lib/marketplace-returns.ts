import { prisma } from "@/lib/db";
import { applyMarketplaceReturn } from "@/lib/order-returns";

/**
 * Pazaryeri iadelerini çekip siparişlere işler (Bardakçı'dan; Serin'de Trendyol, Hepsiburada ve N11) (lib/order-returns.ts kurallarıyla: sadece onaylanmış iade,
 * tam iade → "İade Edildi", kısmi → iade tutarı; stoğa dokunulmaz). Sipariş senkronlarının arkasından çalışır,
 * hata yakalar, senkronu bozmaz.
 */

const DAY = 24 * 60 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** İlk çalışmada geriye taranacak gün (sonra her turda son RECENT_DAYS gün) */
const BACKFILL_DAYS = 120;
const RECENT_DAYS = 3;
const CHUNK_DAYS = 14;

async function getState(key: string): Promise<any> {
    const row = await prisma.siteSettings.findUnique({ where: { key } }).catch(() => null);
    return (row?.value as any) || {};
}
async function setState(key: string, value: any) {
    await prisma.siteSettings.upsert({ where: { key }, create: { key, value }, update: { value } }).catch(() => {});
}

/** İade taraması saatte bir yeter (sipariş senkronları 15 dakikada bir çalışıyor) */
function throttled(state: any) {
    return !!state.backfilledAt && !!state.lastRunAt && Date.now() - new Date(state.lastRunAt).getTime() < 55 * 60 * 1000;
}
async function markRun(key: string, state: any) {
    const now = new Date().toISOString();
    await setState(key, { ...state, backfilledAt: state.backfilledAt || now, lastRunAt: now });
}

/** Taranacak zaman aralıkları: ilk çalışmada BACKFILL_DAYS geriye 14 günlük parçalar, sonra son RECENT_DAYS gün */
function windows(backfilled: boolean): [number, number][] {
    const now = Date.now();
    const from = now - (backfilled ? RECENT_DAYS : BACKFILL_DAYS) * DAY;
    const out: [number, number][] = [];
    for (let s = from; s < now; s += CHUNK_DAYS * DAY) out.push([s, Math.min(s + CHUNK_DAYS * DAY, now)]);
    return out;
}

/** Türkiye saatiyle "yyyy-MM-dd HH:mm" */
function trStamp(ms: number) {
    const d = new Date(ms + 3 * 60 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// ---------------- Hepsiburada ----------------

// Bardakçı'daki v4 kuralı (talep tipine göre); ilk çalışmada 120 gün geriye taranır
const HB_STATE_KEY = "returns-sync:hepsiburada:v4";
const HB_MARK = (no: string, qty: number) => `[HB-IADE:${no}:${qty}]`;
const HB_MARK_RE = /\[HB-IADE:([^:\]]+):(\d+)\]/g;
/**
 * Talep tipine göre iade sayılır mı (claimType: return | change | renewproduct | missingitem | missingpart |
 * missinginvoice | extraproduct; panelde "Teslim edilememiş ürün" de var):
 * - Fatura (missinginvoice) ve fazla ürün (extraproduct): asla (fatura yüklenince / ürün kalınca "kabul" olur, para dönmez)
 * - Eksik ürün/parça, değişim, yeni ürün: sadece para iadesi yapıldıysa (Refunded ya da finalizedWith=Refund).
 *   "Onaylandı" eksiğin gönderildiği / ürünün değiştirildiği anlamına gelir (2026-11-12: 731258425 eksik ürün
 *   onaylanıp gönderilmişti, iade sayılmıştı).
 * - İade ve teslim edilemedi: Accepted da Refunded da sayılır.
 */
function hbCountsAsReturn(r: any, status: string): boolean {
    const text = `${r?.claimType ?? ""} ${r?.explanation ?? ""}`.toLowerCase();
    if (/invoice|fatura|extraproduct|excess/.test(text)) return false;
    const refunded = status === "Refunded" || String(r?.finalizedWith || "").toLowerCase() === "refund";
    const type = String(r?.claimType ?? "").toLowerCase();
    if (/missing|change|renew/.test(type)) return refunded;
    if (String(r?.finalizedWith || "").toLowerCase() === "change") return false;
    return true;
}
/** Satıcının kabul ettiği (Accepted) ve parası iade edilmiş (Refunded) talepler; aynı talep iki listede olsa da bir kez sayılır */
const HB_DONE_STATUSES = ["Accepted", "Refunded"];

/**
 * Hepsiburada: satıcının kabul ettiği / parası iade edilmiş talepler (değişimle kapanan talepler iade sayılmaz).
 * Satıcı kabul edince talep Accepted olur, para iadesi sonra Refunded'a geçebilir (2026-11-12: kabul edilen iade
 * sadece Refunded'a bakıldığı için yakalanmadı, 4041712640).
 * Her talep bir kez işlenir (talep no + adet siparişin notuna yazılır); iade tutarı refundAmount, yoksa totalPriceAmount.
 */
export async function runHepsiburadaReturnSync(): Promise<{ orders: number; updated: number; error?: string }> {
    const config = await (prisma as any).hepsiburadaConfig.findFirst({ where: { isActive: true } });
    if (!config) return { orders: 0, updated: 0 };
    const { HepsiburadaClient } = await import("@/services/hepsiburada/api");
    const client = new HepsiburadaClient({
        username: config.username,
        password: config.password,
        merchantId: config.merchantId,
        isTestMode: config.isTestMode ?? false,
    });

    const state = await getState(HB_STATE_KEY);
    const backfilled = !!state.backfilledAt;
    if (throttled(state)) return { orders: 0, updated: 0 };

    const byOrder = new Map<string, any[]>();
    const typeCounts: Record<string, number> = {};
    try {
        for (const [start, end] of windows(backfilled)) {
            for (const status of HB_DONE_STATUSES) {
                for (let page = 0; page < 50; page++) {
                    const rows = await client.getClaimsByStatus(status, { offset: page * 100, limit: 100, statusBeginDate: trStamp(start), statusEndDate: trStamp(end) });
                    for (const r of rows) {
                        const no = String(r?.orderNumber ?? "").trim();
                        if (!no) continue;
                        const type = `${status}:${String(r?.claimType ?? "-")}`;
                        typeCounts[type] = (typeCounts[type] || 0) + 1;
                        if (!hbCountsAsReturn(r, status)) continue;
                        byOrder.set(no, [...(byOrder.get(no) || []), r]);
                    }
                    if (rows.length < 100) break;
                    await sleep(300);
                }
                await sleep(300);
            }
        }
    } catch (e: any) {
        console.warn("[iade] Hepsiburada talep listesi:", e?.message);
        return { orders: 0, updated: 0, error: e?.message };
    }
    if (Object.keys(typeCounts).length) console.log("[iade] Hepsiburada talep tipleri:", JSON.stringify(typeCounts));

    let updated = 0;
    const orders = byOrder.size
        ? await prisma.order.findMany({
            where: { source: "HEPSIBURADA", orderNumber: { in: Array.from(byOrder.keys()) }, status: { notIn: ["RETURNED", "WAITING_FOR_PAYMENT", "CANCELLED"] } },
            select: { id: true, orderNumber: true, notes: true, returnedAmount: true, items: { select: { quantity: true } } },
        })
        : [];
    for (const o of orders) {
        try {
            const notes = o.notes || "";
            const prev = Array.from(notes.matchAll(HB_MARK_RE));
            const done = new Set(prev.map((m) => m[1]));
            const prevQty = prev.reduce((s, m) => s + Number(m[2] || 0), 0);
            const fresh = (byOrder.get(o.orderNumber) || []).filter((r) => r?.number && !done.has(String(r.number)));
            const uniq = Array.from(new Map(fresh.map((r) => [String(r.number), r])).values());
            if (uniq.length === 0) continue;
            const qty = uniq.reduce((s, r) => s + (Number(r?.quantity) || 1), 0);
            const amount = Number(o.returnedAmount || 0) + uniq.reduce((s, r) => s + (Number(r?.refundAmount) || Number(r?.totalPriceAmount) || 0), 0);
            const units = o.items.reduce((s, i) => s + i.quantity, 0);
            const full = units > 0 && prevQty + qty >= units;
            const types = Array.from(new Set(uniq.map((r) => String(r?.claimType || "")).filter(Boolean))).join(", ");
            const detail = `${qty} adet${types ? ` (${types})` : ""} ${uniq.map((r) => HB_MARK(String(r.number), Number(r?.quantity) || 1)).join(" ")}`;
            if (await applyMarketplaceReturn(o.id, amount, "hepsiburada", { full, detail })) updated++;
        } catch (e: any) {
            console.warn(`[iade] Hepsiburada ${o.orderNumber}:`, e?.message);
        }
    }

    await markRun(HB_STATE_KEY, state);
    if (updated > 0) console.log(`[iade] Hepsiburada: ${orders.length} iadeli sipariş, ${updated} güncellendi`);
    return { orders: orders.length, updated };
}

// ---------------- N11 ----------------

const N11_STATE_KEY = "returns-sync:n11";
const N11_DONE = new Set(["APPROVED", "MANUAL_REFUND"]);
/** N11 talep tarihi biçimi "dd/MM/yyyy" (Türkiye saati) */
function n11Day(ms: number) {
    const d = new Date(ms + 3 * 60 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * N11: iade talepleri (SOAP ClaimReturnList); APPROVED (İade Onaylandı) ve MANUAL_REFUND sayılır.
 * Tarih süzgeci talep tarihine göre olduğu için her turda son 20 günün talepleri taranır (onay talepten günler sonra gelir).
 * Tutar finalPrice (ödenen tutar), adet quantity.
 */
export async function runN11ReturnSync(): Promise<{ orders: number; updated: number; error?: string }> {
    const config = await (prisma as any).n11Config.findFirst();
    if (!config) return { orders: 0, updated: 0 };
    const { N11Client } = await import("@/services/n11/api");
    const client = new N11Client({ apiKey: config.apiKey, apiSecret: config.apiSecret });

    const state = await getState(N11_STATE_KEY);
    const backfilled = !!state.backfilledAt;
    if (throttled(state)) return { orders: 0, updated: 0 };
    const from = Date.now() - (backfilled ? 20 : BACKFILL_DAYS) * DAY;

    const orderNumbers = new Set<string>();
    try {
        for (let s = from; s < Date.now(); s += CHUNK_DAYS * DAY) {
            const e = Math.min(s + CHUNK_DAYS * DAY, Date.now());
            for (const status of N11_DONE) {
                for (let page = 0; page < 100; page++) {
                    const res = await client.getClaimReturns({ status, page, startDate: n11Day(s), endDate: n11Day(e) });
                    for (const c of res.claims) if (c.orderNumber && N11_DONE.has(c.status)) orderNumbers.add(c.orderNumber);
                    if (res.claims.length === 0 || page + 1 >= res.pageCount) break;
                    await sleep(500);
                }
                await sleep(500);
            }
        }
    } catch (e: any) {
        console.warn("[iade] N11 iade listesi:", e?.message);
        return { orders: 0, updated: 0, error: e?.message };
    }

    let updated = 0;
    const orders = orderNumbers.size
        ? await prisma.order.findMany({
            where: { source: "N11", orderNumber: { in: Array.from(orderNumbers) }, status: { notIn: ["RETURNED", "WAITING_FOR_PAYMENT", "CANCELLED"] } },
            select: { id: true, orderNumber: true, items: { select: { quantity: true } } },
        })
        : [];
    for (const o of orders) {
        try {
            const res = await client.getClaimReturns({ status: "ALL", orderNumber: o.orderNumber });
            const done = Array.from(new Map(
                res.claims.filter((c) => c.orderNumber === o.orderNumber && N11_DONE.has(c.status)).map((c) => [c.claimReturnId, c]),
            ).values());
            if (done.length === 0) continue;
            const qty = done.reduce((s, c) => s + c.quantity, 0);
            const amount = done.reduce((s, c) => s + (c.finalPrice || c.unitPrice * c.quantity), 0);
            const units = o.items.reduce((s, i) => s + i.quantity, 0);
            const names = Array.from(new Set(done.map((c) => c.productName).filter(Boolean))).slice(0, 3).join(", ");
            const reasons = Array.from(new Set(done.map((c) => c.returnReasonType).filter(Boolean))).slice(0, 2).join(", ");
            const detail = `${qty} adet${names ? `: ${names}` : ""}${reasons ? ` (${reasons})` : ""}`;
            if (await applyMarketplaceReturn(o.id, amount, "n11", { full: units > 0 && qty >= units, detail })) updated++;
        } catch (e: any) {
            console.warn(`[iade] N11 ${o.orderNumber}:`, e?.message);
        }
        await sleep(500);
    }

    await markRun(N11_STATE_KEY, state);
    if (updated > 0) console.log(`[iade] N11: ${orders.length} iadeli sipariş, ${updated} güncellendi`);
    return { orders: orders.length, updated };
}

// ---------------- Trendyol ----------------

const TY_STATE_KEY = "returns-sync:trendyol";

/** Trendyol'da iade talebinde onaylanmış (Accepted) kalemler: her claim item tek adettir, tutarı orderLine.price */
function trendyolAcceptedItems(claims: any[], orderNumber: string) {
    const items: { id: string; price: number; name: string; reason: string }[] = [];
    const seen = new Set<string>();
    for (const c of claims) {
        if (String(c?.orderNumber || "") !== orderNumber) continue;
        for (const it of (c?.items || []) as any[]) {
            const line = it?.orderLine || {};
            for (const ci of (it?.claimItems || []) as any[]) {
                const status = String(ci?.claimItemStatus?.name ?? ci?.claimItemStatus ?? "");
                const id = String(ci?.id ?? `${c?.id}-${line?.id}-${items.length}`);
                if (status !== "Accepted" || seen.has(id)) continue;
                seen.add(id);
                items.push({
                    id,
                    price: Number(line?.price || 0),
                    name: String(line?.productName || line?.barcode || ""),
                    reason: String(ci?.customerClaimItemReason?.name || ""),
                });
            }
        }
    }
    return items;
}

export async function runTrendyolReturnSync(): Promise<{ orders: number; updated: number; error?: string }> {
    const config = await (prisma as any).trendyolConfig.findFirst({ where: { isActive: true } });
    if (!config) return { orders: 0, updated: 0 };
    const { TrendyolClient } = await import("@/services/trendyol/api");
    const client = new TrendyolClient({ supplierId: config.supplierId, apiKey: config.apiKey, apiSecret: config.apiSecret });

    const state = await getState(TY_STATE_KEY);
    const backfilled = !!state.backfilledAt;
    if (throttled(state)) return { orders: 0, updated: 0 };

    // 1) Onaylanan iadelerin sipariş numaraları (son değişiklik zamanına göre)
    const orderNumbers = new Set<string>();
    try {
        for (const [start, end] of windows(backfilled)) {
            for (let page = 0; page < 50; page++) {
                const res = await client.getClaims({ claimItemStatus: "Accepted", startDate: start, endDate: end, page, size: 200 });
                for (const c of res.content) if (c?.orderNumber) orderNumbers.add(String(c.orderNumber));
                if (page + 1 >= res.totalPages || res.content.length === 0) break;
                await sleep(300);
            }
            await sleep(300);
        }
    } catch (e: any) {
        console.warn("[iade] Trendyol iade listesi:", e?.message);
        return { orders: 0, updated: 0, error: e?.message };
    }
    if (orderNumbers.size === 0) {
        await markRun(TY_STATE_KEY, state);
        return { orders: 0, updated: 0 };
    }

    // 2) Bizdeki siparişler; her biri için siparişin BÜTÜN iade talepleri (farklı günlerde açılmış olabilir)
    const orders = await prisma.order.findMany({
        where: { source: "TRENDYOL", orderNumber: { in: Array.from(orderNumbers) }, status: { notIn: ["RETURNED", "WAITING_FOR_PAYMENT", "CANCELLED"] } },
        select: { id: true, orderNumber: true, items: { select: { quantity: true } } },
    });

    let updated = 0;
    for (const o of orders) {
        try {
            const res = await client.getClaims({ orderNumber: o.orderNumber, size: 200 });
            const accepted = trendyolAcceptedItems(res.content, o.orderNumber);
            if (accepted.length === 0) continue;
            const units = o.items.reduce((s, i) => s + i.quantity, 0);
            const amount = accepted.reduce((s, i) => s + i.price, 0);
            const full = units > 0 && accepted.length >= units;
            const names = Array.from(new Set(accepted.map((a) => a.name).filter(Boolean))).slice(0, 3).join(", ");
            const reasons = Array.from(new Set(accepted.map((a) => a.reason).filter(Boolean))).slice(0, 2).join(", ");
            const detail = `${accepted.length} adet${names ? `: ${names}` : ""}${reasons ? ` (${reasons})` : ""}`;
            if (await applyMarketplaceReturn(o.id, amount, "trendyol", { full, detail })) updated++;
        } catch (e: any) {
            console.warn(`[iade] Trendyol ${o.orderNumber}:`, e?.message);
        }
        await sleep(300);
    }

    await markRun(TY_STATE_KEY, state);
    if (updated > 0) console.log(`[iade] Trendyol: ${orders.length} iadeli sipariş, ${updated} güncellendi`);
    return { orders: orders.length, updated };
}
