"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(productId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Giriş yapmalısınız." };
    }

    try {
        const existingItem = await prisma.wishlist.findUnique({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId: productId,
                },
            },
        });

        if (existingItem) {
            await prisma.wishlist.delete({
                where: {
                    id: existingItem.id,
                },
            });
            revalidatePath("/account/wishlist");
            revalidatePath("/products/[slug]", "page");
            return { success: true, isWishlisted: false };
        } else {
            await prisma.wishlist.create({
                data: {
                    userId: session.user.id,
                    productId: productId,
                },
            });
            revalidatePath("/account/wishlist");
            revalidatePath("/products/[slug]", "page");
            return { success: true, isWishlisted: true };
        }
    } catch (error) {
        console.error("Wishlist toggle error:", error);
        return { success: false, error: "Bir hata oluştu." };
    }
}

export async function getWishlistStatus(productId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return false;
    }

    const item = await prisma.wishlist.findUnique({
        where: {
            userId_productId: {
                userId: session.user.id,
                productId: productId,
            },
        },
    });

    return !!item;
}

export async function getWishlistItems() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const items = await prisma.wishlist.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    listPrice: true,
                    salePrice: true,
                    images: true,
                    stock: true,
                    vatRate: true,
                    minQuantity: true,
                    weight: true,
                    width: true,
                    height: true,
                    length: true,
                    desi: true,
                    category: {
                        select: {
                            name: true,
                            slug: true,
                        }
                    },
                    _count: {
                        select: {
                            variants: true,
                        }
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return items;
}
