"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type MissingDesiProduct = {
    id: string;
    name: string;
    sku: string | null;
    image: string | null;
    category: string;
    stock: number;
};

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "OPERATOR") {
        throw new Error("Yetkisiz işlem.");
    }
}

/**
 * Desisi girilmemiş aktif ürünler (Bardakçı'daki sayfanın aynısı). Sepetteki kargo ürünün desisinden hesaplanır;
 * desi, ağırlık ve ölçüsü boş üründe kargo 0 çıkıyor, siparişte kargoyu firma ödüyor.
 */
export async function getMissingDesiProducts(): Promise<MissingDesiProduct[]> {
    await requireAdmin();

    const rows = await prisma.product.findMany({
        where: {
            isActive: true,
            AND: [
                { OR: [{ desi: null }, { desi: { lte: 0 } }] },
                { OR: [{ weight: null }, { weight: { lte: 0 } }] },
            ],
        },
        select: {
            id: true, name: true, sku: true, images: true, stock: true,
            width: true, height: true, length: true,
            category: { select: { name: true } },
            categories: { select: { name: true } },
            variants: { select: { stock: true } },
        },
    });

    return rows
        .filter((p) => Number(p.width || 0) * Number(p.height || 0) * Number(p.length || 0) <= 0)
        .map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            image: p.images?.[0] || null,
            // Kategoriler çoklu ilişkide (categories); categoryId eski tekli alan, yeni ürünlerde boş
            category: p.categories.map((c) => c.name).join(", ") || p.category?.name || "-",
            // Varyantlı üründe ana ürün stoğu 0 olabilir; satılabilir adet varyantların toplamı
            stock: p.variants.length ? p.variants.reduce((a, v) => a + (v.stock || 0), 0) : p.stock,
        }))
        .sort((a, b) => b.stock - a.stock || a.name.localeCompare(b.name, "tr"));
}

/** Seçilen ürünlere desi yazar; sadece hâlâ desisi boş olanlara (bu arada elle girilmiş desiyi ezmez) */
export async function setDesiForProducts(ids: string[], desi: number) {
    await requireAdmin();

    if (!Array.isArray(ids) || ids.length === 0) return { success: false, message: "Ürün seçilmedi." };
    if (!Number.isFinite(desi) || desi <= 0 || desi > 1000) return { success: false, message: "Desi 0'dan büyük olmalı." };

    const res = await prisma.product.updateMany({
        where: { id: { in: ids }, OR: [{ desi: null }, { desi: { lte: 0 } }] },
        data: { desi },
    });

    revalidatePath("/admin/products/missing-desi");
    return { success: true, message: `${res.count} ürüne ${desi} desi yazıldı.` };
}
