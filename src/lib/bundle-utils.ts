/**
 * Bundle (Paket Ürün) Utility Fonksiyonları
 * 
 * Paket ürünlerin stok hesaplama ve validasyon işlemleri
 */

interface BundleItemWithStock {
    childProductId: string;
    quantity: number;
    childProduct: {
        id: string;
        name: string;
        stock: number;
    };
}

/**
 * Paket stoku hesapla: Her alt ürünün stoğunu ilgili adede böl,
 * en küçük değeri al (floor ile tam sayıya yuvarla).
 * 
 * Örnek:
 *   Yağ Filtresi → stok: 50, adet: 1 → 50/1 = 50
 *   Hava Filtresi → stok: 30, adet: 1 → 30/1 = 30
 *   Motor Yağı → stok: 200, adet: 4 → 200/4 = 50
 *   Paket Stoku = MIN(50, 30, 50) = 30
 */
export function calculateBundleStock(bundleItems: BundleItemWithStock[]): number {
    if (bundleItems.length === 0) return 0;

    let minStock = Infinity;

    for (const item of bundleItems) {
        const availableForBundle = Math.floor(item.childProduct.stock / item.quantity);
        if (availableForBundle < minStock) {
            minStock = availableForBundle;
        }
    }

    return minStock === Infinity ? 0 : Math.max(0, minStock);
}

/**
 * Paket stok yeterliliğini kontrol et
 * Belirli miktarda paket satışı yapılabilir mi?
 */
export function validateBundleStock(
    bundleItems: BundleItemWithStock[],
    requestedQuantity: number
): { valid: boolean; insufficientItems: string[] } {
    const insufficientItems: string[] = [];

    for (const item of bundleItems) {
        const requiredStock = item.quantity * requestedQuantity;
        if (item.childProduct.stock < requiredStock) {
            insufficientItems.push(
                `${item.childProduct.name}: Gerekli ${requiredStock}, Mevcut ${item.childProduct.stock}`
            );
        }
    }

    return {
        valid: insufficientItems.length === 0,
        insufficientItems,
    };
}
