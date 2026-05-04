
import { prisma } from "@/lib/db";
import { N11ProductList } from "./n11-product-list";

export default async function N11ProductsPage() {
    const products = await prisma.product.findMany({
        include: {
            brand: true,
            categories: true,
            n11Product: true,
            variants: true
        },
        orderBy: { updatedAt: "desc" }
    });

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-500 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                        🟣
                    </div>
                    N11 Ürün Yönetimi
                </h1>
                <p className="text-muted-foreground mt-2">
                    Ürünlerinizi N11 mağazanıza gönderin ve stoklarınızı eşitleyin.
                </p>
            </div>

            <N11ProductList initialProducts={JSON.parse(JSON.stringify(products))} />
        </div>
    );
}
