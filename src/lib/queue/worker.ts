import { Worker, Job } from "bullmq";
import redisConnection from "./redis";
import { QUEUE_NAMES } from "./config";
import { SyncJobData } from "./producer";
import { syncProductsToTrendyol } from "@/app/admin/(protected)/integrations/trendyol/actions";
import { syncProductsToN11 } from "@/app/admin/(protected)/integrations/n11/actions";

let workerInstance: Worker<SyncJobData> | null = null;

export function initializeWorker() {
    if (workerInstance) {
        console.log("Worker is already initialized.");
        return;
    }

    workerInstance = new Worker<SyncJobData>(
        QUEUE_NAMES.MARKETPLACE_SYNC,
        async (job: Job<SyncJobData>) => {
            console.log(`🚀 İşleniyor: [${job.id}] ${job.name} (Marketplace: ${job.data.marketplace})`);
            
            try {
                if (job.data.marketplace === "trendyol") {
                    const result = await syncProductsToTrendyol(job.data.productIds);
                    if (!result.success) {
                        throw new Error(result.message);
                    }
                    console.log(`✅ Tamamlandı: Trendyol Sync - ${result.message}`);
                } else if (job.data.marketplace === "n11") {
                    const result = await syncProductsToN11(job.data.productIds);
                    if (!result.success) {
                        throw new Error(result.message);
                    }
                    console.log(`✅ Tamamlandı: N11 Sync - ${result.message}`);
                } else if (job.data.marketplace === "hepsiburada") {
                    const { syncProductsToHepsiburada } = await import("@/app/admin/(protected)/integrations/hepsiburada/actions");
                    const result = await syncProductsToHepsiburada(job.data.productIds);
                    if (!result.success) {
                        throw new Error(result.message);
                    }
                    console.log(`✅ Tamamlandı: Hepsiburada Sync - ${result.message}`);
                }
                
                await job.updateProgress(100);
            } catch (error: any) {
                console.error(`❌ Hata [${job.id}]:`, error.message);
                throw error; // Let BullMQ handle retries
            }
        },
        {
            connection: redisConnection,
            concurrency: 1, // Sadece 1 işlem aynı anda çalışsın, sunucuyu boğmasın
            limiter: {
                max: 1,         // Belirtilen süre içinde en fazla 1 görev işlensin
                duration: 2000, // 2 saniyede bir (API limitlerine takılmamak için global throttle)
            }
        }
    );

    workerInstance.on("completed", (job) => {
        console.log(`🎉 Görev Başarılı: ${job.id}`);
    });

    workerInstance.on("failed", (job, err) => {
        console.error(`⚠️ Görev Başarısız: ${job?.id} - Hata: ${err.message}`);
    });

    console.log("👷‍♂️ Marketplace Sync Worker başlatıldı.");
}
