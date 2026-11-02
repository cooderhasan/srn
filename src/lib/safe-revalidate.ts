import { revalidatePath } from "next/cache";

/**
 * revalidatePath, kullanıcı isteği dışında (BullMQ kuyruğu, cron) çağrılınca
 * "Invariant: static generation store missing" hatası fırlatır. Fatura ve pazaryeri senkronları kuyruktan da
 * çalıştığı için bu hata başarılı bir işlemi hatalı gösteriyordu (ör. fatura kesildiği halde sipariş "Fatura: Hatalı"
 * işaretleniyor, müşteriye e-posta gitmiyordu). Önbellek yenilemesi kritik olmadığından hata yutulur.
 */
export function safeRevalidatePath(...args: Parameters<typeof revalidatePath>): void {
    try {
        revalidatePath(...args);
    } catch {
        // İstek bağlamı yok (kuyruk/cron); sayfa bir sonraki istekte zaten taze veri çeker
    }
}
