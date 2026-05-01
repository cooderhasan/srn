
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getHepsiburadaConfig() {
    try {
        const config = await (prisma as any).hepsiburadaConfig.findFirst();
        return { success: true, data: config };
    } catch (error) {
        return { success: false, error: "Ayarlar alınamadı" };
    }
}

export async function saveHepsiburadaConfig(prevState: any, formData: FormData) {
    try {
        const username = formData.get("username") as string; // Usually Merchant ID
        const password = formData.get("password") as string;
        const merchantId = formData.get("merchantId") as string;
        const isActive = formData.get("isActive") === "on";

        if (!username || !password) {
            return { success: false, message: "Kullanıcı Adı ve Şifre zorunludur." };
        }

        const existing = await (prisma as any).hepsiburadaConfig.findFirst();

        if (existing) {
            await (prisma as any).hepsiburadaConfig.update({
                where: { id: existing.id },
                data: { username, password, merchantId, isActive }
            });
        } else {
            await (prisma as any).hepsiburadaConfig.create({
                data: { username, password, merchantId, isActive }
            });
        }

        revalidatePath("/admin/integrations/hepsiburada");
        return { success: true, message: "Ayarlar kaydedildi." };
    } catch (error) {
        console.error("HB Save Error:", error);
        return { success: false, message: "Kaydetme hatası." };
    }
}

import { HepsiburadaClient } from "@/services/hepsiburada/api";

// ... (get and save config remain same)

export async function syncProductsToHepsiburada(productId?: string) {
    try {
        const config = await (prisma as any).hepsiburadaConfig.findFirst({ where: { isActive: true } });
        if (!config) return { success: false, message: "Aktif entegrasyon bulunamadı." };

        const whereClause: any = {
            isActive: true,
            isHepsiburadaActive: true
        };

        if (productId) {
            whereClause.id = productId;
        }

        // 1. Fetch products (Include variants)
        const products = await prisma.product.findMany({
            where: whereClause,
            include: { variants: true }
        });

        if (products.length === 0) return { success: false, message: "Ürün bulunamadı." };

        const hbItems: any[] = [];

        // 2. Map to Hepsiburada format (simplified inventory payload)
        // HB Inventory: { merchantSku, availableStock, price, dispatchTime, cargoCompany1, cargoCompany2, cargoCompany3, maximumPurchasableQuantity }

        for (const p of products) {
            const basePrice = Number((p as any).hepsiburadaPrice) || Number(p.listPrice); // Use HB price if available

            // Variants?
            if ((p as any).variants && (p as any).variants.length > 0) {
                for (const v of (p as any).variants) {
                    if (!v.sku && !v.barcode) continue; // Need identifier (MerchantSku)

                    const varPrice = basePrice + Number(v.priceAdjustment || 0);

                    hbItems.push({
                        merchantSku: v.sku || v.barcode, // Important: Must match HB Listing SKU
                        availableStock: v.stock,
                        price: varPrice,
                        dispatchTime: 3, // Default dispatch time
                        cargoCompany1: "Yurtici Kargo", // Placeholder, should be config
                        maximumPurchasableQuantity: 10
                    });
                }
            } else {
                if (p.sku || p.barcode) {
                    hbItems.push({
                        merchantSku: p.sku || p.barcode,
                        availableStock: p.stock,
                        price: basePrice,
                        dispatchTime: 3,
                        cargoCompany1: "Yurtici Kargo",
                        maximumPurchasableQuantity: 10
                    });
                }
            }
        }

        if (hbItems.length === 0) return { success: false, message: "Gönderilecek uygun (SKU/Barkod'lu) ürün bulunamadı." };

        // 3. Send to HB
        const client = new HepsiburadaClient({
            username: config.username,
            password: config.password,
            merchantId: config.merchantId || config.username
        });

        // HB API might error if items > 100 or something, but usually supports bulk json list
        try {
            await client.uploadInventory(hbItems);
            return { success: true, message: `${hbItems.length} varyant/ürün için stok ve fiyat güncellendi.` };
        } catch (apiError: any) {
            return { success: false, message: "HB API Hatası: " + apiError.message };
        }

    } catch (error: any) {
        console.error("HB Sync Error:", error);
        return { success: false, message: "Sync Hatası: " + error.message };
    }
}

export async function syncOrdersFromHepsiburada() {
    try {
        const config = await (prisma as any).hepsiburadaConfig.findFirst({ where: { isActive: true } });
        if (!config) return { success: false, message: "Aktif entegrasyon bulunamadı." };

        const client = new HepsiburadaClient({
            username: config.username,
            password: config.password,
            merchantId: config.merchantId || config.username
        });

        // 1. Fetch HB Orders
        // HB API returns array of orders
        const orders = await client.getOrders("New"); // Status param handling needed in client if supported

        if (!orders || orders.length === 0) return { success: true, message: "Yeni Hepsiburada siparişi yok." };

        // 2. Import logic
        let importedCount = 0;

        for (const hbOrder of orders) {
            const existing = await prisma.order.findUnique({
                where: { orderNumber: hbOrder.orderNumber }
            });

            if (existing) continue;

            const orderItems = [];
            let total = 0;
            const items = Array.isArray(hbOrder.items) ? hbOrder.items : [];

            for (const item of items) {
                // HB uses MerchantSKU which could be our SKU or Barcode
                // We should search both Product and Variant
                let productId = "";
                let variantId = null;

                // 1. Try Variant (SKU or Barcode)
                const variant = await prisma.productVariant.findFirst({
                    where: {
                        OR: [
                            { sku: item.merchantSku },
                            { barcode: item.merchantSku }
                        ]
                    },
                    include: { product: true }
                });

                if (variant) {
                    productId = variant.productId;
                    variantId = variant.id;
                } else {
                    // 2. Try Product
                    const product = await prisma.product.findFirst({
                        where: {
                            OR: [
                                { sku: item.merchantSku },
                                { barcode: item.merchantSku }
                            ]
                        }
                    });
                    if (product) productId = product.id;
                }

                if (productId) {
                    const qty = item.quantity || 1;
                    const price = Number(item.price?.amount || item.totalPrice?.amount || 0) / qty; // HB structure varies

                    orderItems.push({
                        productId,
                        variantId,
                        productName: item.productName || "HB Ürünü",
                        quantity: qty,
                        unitPrice: price,
                        discountRate: 0,
                        vatRate: 20,
                        lineTotal: price * qty
                    });
                    total += price * qty;
                }
            }

            if (orderItems.length > 0) {
                await prisma.order.create({
                    data: {
                        orderNumber: hbOrder.orderNumber,
                        status: "PENDING",
                        total: Number(hbOrder.totalPrice?.amount || total),
                        subtotal: total,
                        discountAmount: 0,
                        appliedDiscountRate: 0,
                        vatAmount: total * 0.2, // Rough
                        guestEmail: hbOrder.customer?.email || "hb@customer.com",
                        shippingAddress: {
                            fullName: hbOrder.shippingAddress?.name || "HB Müşterisi",
                            address: hbOrder.shippingAddress?.address || "",
                            city: hbOrder.shippingAddress?.city || "",
                            district: hbOrder.shippingAddress?.district || ""
                        },
                        items: { create: orderItems }
                    }
                });
                importedCount++;
            }
        }

        return { success: true, message: `${importedCount} sipariş başarıyla çekildi.` };

    } catch (error: any) {
        console.error("HB Order Sync Error:", error);
        return { success: false, message: "Order Sync Hatası: " + error.message };
    }
}
