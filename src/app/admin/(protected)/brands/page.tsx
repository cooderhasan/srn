import { prisma } from "@/lib/db";
import { BrandsTable } from "@/components/admin/brands-table";

export default async function BrandsPage() {
    const brands = await prisma.brand.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { products: true },
            },
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Marka Yönetimi
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Ürün markalarını yönetin
                </p>
            </div>

            <BrandsTable brands={brands} />
        </div>
    );
}
