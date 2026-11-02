import { Queue, Worker, Job } from "bullmq";
import redisConnection from "./redis";
import { prisma } from "@/lib/db";

/**
 * Otomatik e-fatura kuyruğu (Trendyol e-Faturam).
 *
 * N11 ve Hepsiburada siparişi "Kargolandı" (veya doğrudan "Teslim Edildi") olunca fatura kuyruğa girer ve
 * e-Faturam'a tek tek, aralarında 7 sn olacak şekilde gönderilir: durum senkronu bir seferde onlarca siparişi
 * kargolandı yapabiliyor, e-Faturam'a aynı anda istek gitmesin. Faturayı, Siparişler ekranındaki e-fatura
 * düğmesinin çağırdığı fonksiyonun aynısı keser (fatura linki N11/HB'ye iletilir, müşteriye e-posta gider).
 *
 * Trendyol siparişleri dahil DEĞİL: faturalarını Trendyol kendisi kesiyor. Site siparişleri de şimdilik dahil değil.
 *
 * Güvenlik:
 * - Sadece AUTO_INVOICE_FROM'dan sonra oluşan siparişler: durum senkronu eski siparişleri toplu "Kargolandı"ya taşıyor,
 *   faturası sistem dışında kesilmiş eski siparişe ikinci fatura kesilmesin.
 * - Otomatik tekrar deneme YOK: e-Faturam isteği zaman aşımına uğrayıp faturayı yine de kesmiş olabilir; tekrar
 *   denemek çift fatura riski. Hata olursa sipariş "Fatura: Hatalı" kalır, düğmeyle elle kesilir.
 * - Kuyrukta beklerken elle kesilen, durumu değişen sipariş atlanır; aynı sipariş kuyruğa ikinci kez girmez (jobId).
 */

const INVOICE_QUEUE = "invoice-queue";
const GAP_MS = 7000;
const AUTO_INVOICE_SOURCES = ["N11", "HEPSIBURADA"];
export const AUTO_INVOICE_FROM = new Date("2026-11-03T00:00:00+03:00");

let invoiceQueue: Queue | null = null;
let invoiceWorker: Worker | null = null;

function getInvoiceQueue() {
    if (!invoiceQueue) invoiceQueue = new Queue(INVOICE_QUEUE, { connection: redisConnection });
    return invoiceQueue;
}

type InvoiceCandidate = { source: string | null; status: string; invoiceNo: string | null; invoiceStatus: string | null; createdAt: Date };

/** Otomatik faturaya uygun sipariş: N11/HB, kargolandı veya teslim edildi, faturası yok, daha önce hata almamış, yeni sipariş */
function isEligible(o: InvoiceCandidate) {
    return (
        AUTO_INVOICE_SOURCES.includes(String(o.source)) &&
        (o.status === "SHIPPED" || o.status === "DELIVERED") &&
        !o.invoiceNo &&
        o.invoiceStatus !== "ERROR" &&
        o.createdAt >= AUTO_INVOICE_FROM
    );
}

const candidateSelect = { id: true, source: true, status: true, invoiceNo: true, invoiceStatus: true, createdAt: true, orderNumber: true } as const;

/**
 * Kargolandı/teslim edildi olan siparişleri fatura kuyruğuna ekler. Hata olursa durum değişikliğini bozmaz.
 */
export async function enqueueAutoInvoices(orderIds: string[]) {
    try {
        if (orderIds.length === 0) return;
        const config = await (prisma as any).trendyolEFaturamConfig.findFirst({ where: { isActive: true }, select: { id: true } });
        if (!config) return;
        const orders = await prisma.order.findMany({ where: { id: { in: orderIds } }, select: candidateSelect });
        const eligible = orders.filter((o) => isEligible(o as InvoiceCandidate));
        if (eligible.length === 0) return;
        const queue = getInvoiceQueue();
        for (const o of eligible) {
            // jobId: aynı sipariş kuyrukta zaten bekliyorsa ikinci kez eklenmez
            await queue.add("efaturam-invoice", { orderId: o.id }, {
                jobId: `invoice-${o.id}`,
                attempts: 1,
                removeOnComplete: true,
                removeOnFail: 200,
            });
        }
        console.log(`🧾 Otomatik fatura kuyruğuna eklendi: ${eligible.map((o) => o.orderNumber).join(", ")}`);
    } catch (e: any) {
        console.error("Otomatik fatura kuyruğa eklenemedi:", e?.message);
    }
}

export function initializeInvoiceWorker() {
    if (invoiceWorker) return;
    invoiceWorker = new Worker(
        INVOICE_QUEUE,
        async (job: Job<{ orderId: string }>) => {
            const order = await prisma.order.findUnique({ where: { id: job.data.orderId }, select: candidateSelect });
            // Kuyrukta beklerken elle kesildiyse, durum değiştiyse veya silindiyse atla
            if (!order || !isEligible(order as InvoiceCandidate)) {
                console.log(`🧾 Otomatik fatura atlandı (${order?.orderNumber || job.data.orderId}): uygun değil veya zaten kesilmiş`);
                return;
            }
            const { sendOrderInvoice } = await import("@/app/admin/(protected)/integrations/trendyol-efaturam/actions");
            const result: any = await sendOrderInvoice(order.id);
            if (result?.success) {
                console.log(`🧾 Otomatik fatura kesildi: ${order.orderNumber} — ${result.message}`);
                return;
            }
            if (/zaten fatura kesilmiş/i.test(result?.message || "")) return;
            // Tekrar denenmez (çift fatura riski); sipariş "Fatura: Hatalı"da kalır
            await prisma.order.update({ where: { id: order.id }, data: { invoiceStatus: "ERROR" } }).catch(() => {});
            throw new Error(result?.message || "e-Faturam fatura hatası");
        },
        {
            connection: redisConnection,
            concurrency: 1,
            limiter: { max: 1, duration: GAP_MS },
        }
    );
    invoiceWorker.on("failed", (job, err) => {
        console.error(`⚠️ Otomatik fatura başarısız (${job?.data?.orderId}): ${err.message} — Siparişler ekranından elle kesilebilir`);
    });
    console.log("🧾 Otomatik fatura kuyruğu başlatıldı.");
}
