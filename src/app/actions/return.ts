"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createReturnRequest(
    orderId: string,
    orderItemId: string,
    reason: string,
    details: string,
    images: string[] = []
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Giriş yapmalısınız." };
    }

    try {
        // Verify ownership and eligibility
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order || order.userId !== session.user.id) {
            return { success: false, error: "Sipariş bulunamadı." };
        }

        const orderItem = order.items.find((item) => item.id === orderItemId);
        if (!orderItem) {
            return { success: false, error: "Ürün bulunamadı." };
        }

        if (order.status !== "DELIVERED") {
            return { success: false, error: "İade işlemi sadece teslim edilmiş siparişler için yapılabilir." };
        }

        // Check if return request already exists for this item
        const existingRequest = await prisma.returnRequest.findFirst({
            where: {
                orderItemId: orderItemId,
            },
        });

        if (existingRequest) {
            return { success: false, error: "Bu ürün için zaten bir talebiniz var." };
        }

        await prisma.returnRequest.create({
            data: {
                userId: session.user.id,
                orderId: orderId,
                orderItemId: orderItemId,
                reason: reason,
                details: details,
                images: images,
                status: "PENDING",
            },
        });

        revalidatePath(`/account/orders/${orderId}`);
        return { success: true };
    } catch (error) {
        console.error("Create return request error:", error);
        return { success: false, error: "Bir hata oluştu." };
    }
}

export async function getReturnRequests() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    return await prisma.returnRequest.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            order: {
                select: {
                    orderNumber: true,
                }
            },
            orderItem: {
                select: {
                    productName: true,
                    unitPrice: true,
                    quantity: true,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getAdminReturnRequests(status?: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED") {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    return await prisma.returnRequest.findMany({
        where: status ? { status } : {},
        include: {
            user: {
                select: {
                    companyName: true,
                    email: true,
                    phone: true,
                }
            },
            order: {
                select: {
                    orderNumber: true,
                    createdAt: true,
                }
            },
            orderItem: {
                select: {
                    productName: true,
                    quantity: true,
                    unitPrice: true,
                    variantInfo: true,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function updateReturnRequestStatus(requestId: string, status: "APPROVED" | "REJECTED" | "COMPLETED", adminNote?: string) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.returnRequest.update({
            where: { id: requestId },
            data: {
                status,
                adminNote: adminNote
            },
        });
        revalidatePath("/admin/returns");
        return { success: true };
    } catch (error) {
        console.error("Update return request status error:", error);
        return { success: false, error: "Bir hata oluştu." };
    }
}
