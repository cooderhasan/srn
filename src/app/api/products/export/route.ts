import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {
    try {
        // Fetch all active products with relations
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                category: { select: { slug: true, name: true } },
                brand: { select: { slug: true, name: true } },
            },
            orderBy: { name: "asc" }
        });

        // Transform to Excel format
        const excelData = products.map(p => ({
            "ID": p.id,
            "Ürün Adı": p.name,
            "Slug": p.slug,
            "Liste Fiyatı": Number(p.listPrice),
            "Kategori": p.category?.name || "",
            "Kategori Slug": p.category?.slug || "",
            "Marka": p.brand?.name || "",
            "Marka Slug": p.brand?.slug || "",
            "Stok Kodu": p.sku || "",
            "Barkod": p.barcode || "",
            "Açıklama": p.description || "",
            "Stok Adedi": p.stock,
            "Kritik Stok": p.criticalStock,
            "KDV Oranı (%)": p.vatRate,
            "Minimum Sipariş": p.minQuantity,
            "Menşei": p.origin || "",
            "Öne Çıkan": p.isFeatured ? 1 : 0,
            "Yeni Ürün": p.isNew ? 1 : 0,
            "Çok Satan": p.isBestSeller ? 1 : 0,
            "Aktif": p.isActive ? 1 : 0,
            "Oluşturulma Tarihi": p.createdAt.toISOString().split("T")[0],
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        worksheet["!cols"] = [
            { wch: 25 }, // ID
            { wch: 35 }, // Ürün Adı
            { wch: 30 }, // Slug
            { wch: 12 }, // Liste Fiyatı
            { wch: 20 }, // Kategori
            { wch: 20 }, // Kategori Slug
            { wch: 15 }, // Marka
            { wch: 15 }, // Marka Slug
            { wch: 15 }, // Stok Kodu
            { wch: 18 }, // Barkod
            { wch: 50 }, // Açıklama
            { wch: 12 }, // Stok Adedi
            { wch: 12 }, // Kritik Stok
            { wch: 12 }, // KDV Oranı
            { wch: 15 }, // Minimum Sipariş
            { wch: 12 }, // Menşei
            { wch: 10 }, // Öne Çıkan
            { wch: 10 }, // Yeni Ürün
            { wch: 10 }, // Çok Satan
            { wch: 8 },  // Aktif
            { wch: 15 }, // Oluşturulma Tarihi
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Generate filename with date
        const date = new Date().toISOString().split("T")[0];
        const filename = `urunler-${date}.xlsx`;

        // Return Excel file
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename=${filename}`
            }
        });
    } catch (error) {
        console.error("Error exporting products:", error);
        return NextResponse.json({ error: "Failed to export products" }, { status: 500 });
    }
}
