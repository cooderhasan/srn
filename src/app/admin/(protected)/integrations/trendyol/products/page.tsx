
import { prisma } from "@/lib/db";
import { TrendyolProductList } from "./trendyol-product-list";

export default async function TrendyolProductsPage() {
    const products = await prisma.product.findMany({
        include: {
            brand: true,
            categories: true,
            trendyolProduct: true,
            variants: true
        },
        orderBy: { updatedAt: "desc" }
    });

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-500 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                        🟠
                    </div>
                    Trendyol Ürün Yönetimi
                </h1>
                <p className="text-muted-foreground mt-2">
                    Ürünlerinizi Trendyol kataloğuna gönderin, stok ve fiyatlarını anlık yönetin.
                </p>
            </div>

            <TrendyolProductList initialProducts={JSON.parse(JSON.stringify(products))} />
        </div>
    );
}
