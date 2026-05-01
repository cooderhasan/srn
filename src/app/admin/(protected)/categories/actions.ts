"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function getCategories() {
    return prisma.category.findMany({
        orderBy: { order: "asc" },
        include: {
            _count: {
                select: { products: true },
            },
        },
    });
}

export async function createCategory(data: { name: string; slug: string; order?: number; parentId?: string | null; imageUrl?: string; isFeatured?: boolean; isInHeader?: boolean; headerOrder?: number; trendyolCategoryId?: number | null; n11CategoryId?: number | null; hbCategoryId?: string | null; googleProductCategory?: string | null }) {
    await prisma.category.create({
        data: {
            name: data.name,
            slug: data.slug,
            order: data.order ?? 0,
            parentId: data.parentId || null,
            imageUrl: data.imageUrl,
            isFeatured: data.isFeatured ?? false,
            isInHeader: data.isInHeader ?? false,
            headerOrder: data.headerOrder ?? 0,
            trendyolCategoryId: data.trendyolCategoryId ?? null,
            n11CategoryId: data.n11CategoryId ?? null,
            hbCategoryId: data.hbCategoryId ?? null,
            googleProductCategory: data.googleProductCategory ?? null,
        },
    });
    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; order?: number; isActive?: boolean; parentId?: string | null; imageUrl?: string; isFeatured?: boolean; isInHeader?: boolean; headerOrder?: number; trendyolCategoryId?: number | null; n11CategoryId?: number | null; hbCategoryId?: string | null; googleProductCategory?: string | null }) {
    console.log("updateCategory called with:", { id, data });
    try {
        const result = await prisma.category.update({
            where: { id },
            data,
        });
        console.log("updateCategory result:", result);
    } catch (error) {
        console.error("updateCategory error:", error);
        throw error;
    }
    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function deleteCategory(id: string) {
    await prisma.category.delete({
        where: { id },
    });
    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function toggleCategoryStatus(id: string, isActive: boolean) {
    await prisma.category.update({
        where: { id },
        data: { isActive },
    });
    revalidatePath("/admin/categories");
}

export async function updateCategoriesSidebarOrder(updates: { id: string; order: number }[]) {
    await prisma.$transaction(
        updates.map((update) =>
            prisma.category.update({
                where: { id: update.id },
                data: { order: update.order },
            })
        )
    );
    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function updateCategoriesHeaderOrder(updates: { id: string; headerOrder: number }[]) {
    await prisma.$transaction(
        updates.map((update) =>
            prisma.category.update({
                where: { id: update.id },
                data: { headerOrder: update.headerOrder },
            })
        )
    );
    revalidatePath("/admin/categories");
    revalidatePath("/");
}
