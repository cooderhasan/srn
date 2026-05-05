import { prisma } from "@/lib/db";
import { TrendyolBatchList } from "./trendyol-batch-list";

export const dynamic = "force-dynamic";

export default async function TrendyolBatchesPage() {
    // Sadece batch'e gönderilmiş ürünleri çek
    const batchProducts = await (prisma as any).trendyolProduct.findMany({
        where: {
            batchRequestId: { not: null }
        },
        include: {
            product: {
                select: {
                    name: true,
                    images: true,
                }
            }
        },
        orderBy: { lastSyncedAt: 'desc' },
        take: 100
    });

    const formattedData = batchProducts.map((bp: any) => ({
        id: bp.id,
        productId: bp.productId,
        productName: bp.product.name,
        image: bp.product.images?.[0] || "",
        barcode: bp.barcode,
        batchRequestId: bp.batchRequestId,
        batchStatus: bp.batchStatus || "UNKNOWN",
        isSynced: bp.isSynced,
        lastSyncError: bp.lastSyncError,
        lastSyncedAt: bp.lastSyncedAt?.toISOString(),
    }));

    return (
        <div className="space-y-6">
            <TrendyolBatchList initialData={formattedData} />
        </div>
    );
}
