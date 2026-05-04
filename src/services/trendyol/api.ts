
import { prisma } from "@/lib/db";
import { TrendyolConfig } from "@prisma/client";

interface TrendyolCreds {
    supplierId: string;
    apiKey: string;
    apiSecret: string;
}

export class TrendyolClient {
    private baseUrl = "https://api.trendyol.com/sapigw";
    private creds: TrendyolCreds | null = null;

    constructor(creds?: TrendyolCreds) {
        if (creds) {
            this.creds = creds;
        }
    }

    /**
     * Initialize client by fetching active config from DB
     */
    async init() {
        if (this.creds) return;

        // We use 'any' cast here because Prisma Client might not be fully regenerated yet in dev environment
        // due to file locking issues. In production/fresh build, this will work natively.
        const config = await (prisma as any).trendyolConfig.findFirst({
            where: { isActive: true }
        });

        if (!config) {
            throw new Error("Active Trendyol configuration not found.");
        }

        this.creds = {
            supplierId: config.supplierId,
            apiKey: config.apiKey,
            apiSecret: config.apiSecret
        };
    }

    private getAuthHeader(): string {
        if (!this.creds) throw new Error("Client not initialized.");
        const pair = `${this.creds.apiKey}:${this.creds.apiSecret}`;
        return `Basic ${Buffer.from(pair).toString("base64")}`;
    }

    /**
     * Test connection with detailed error reporting
     */
    async checkConnectionDetailed(): Promise<{ success: boolean; message: string }> {
        try {
            await this.init();
            if (!this.creds) return { success: false, message: "Ayarlar yüklenemedi." };

            const response = await fetch(`${this.baseUrl}/suppliers/${this.creds.supplierId}/products?size=1`, {
                headers: { "Authorization": this.getAuthHeader() }
            });
            
            if (response.ok) {
                return { success: true, message: "Tamam" };
            }

            if (response.status === 401) {
                return { success: false, message: "Yetkisiz Erişim (401). API Key veya Secret hatalı olabilir." };
            }

            if (response.status === 403) {
                return { success: false, message: "Erişim Reddedildi (403). Satıcı ID'nizin bu API'ye yetkisi olmayabilir." };
            }

            const errorText = await response.text();
            return { success: false, message: `Trendyol Hatası (${response.status}): ${errorText}` };

        } catch (error: any) {
            return { success: false, message: "Bağlantı Kurulamadı: " + error.message };
        }
    }

    /**
     * Get Brands from Trendyol
     */
    async getBrands(page = 0, size = 100) {
        await this.init();
        const response = await fetch(`${this.baseUrl}/brands?page=${page}&size=${size}`, {
            headers: { "Authorization": this.getAuthHeader() }
        });

        if (!response.ok) throw new Error(`Trendyol API Error: ${response.statusText}`);
        return await response.json();
    }

    /**
     * Get Categories
     */
    async getCategories() {
        await this.init();
        const response = await fetch(`${this.baseUrl}/product-categories`, {
            headers: { "Authorization": this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Trendyol API Error: ${response.statusText}`);
        return await response.json();
    }

    /**
     * Create Products (Bulk)
     * https://developers.trendyol.com/en/product-integration/v2/create-products
     */
    async createProducts(items: any[]) {
        await this.init();
        if (!this.creds) throw new Error("No creds");

        const url = `${this.baseUrl}/suppliers/${this.creds.supplierId}/v2/products`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": this.getAuthHeader(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ items })
        });

        const data = await response.json();
        return { ok: response.ok, ...data };
    }

    /**
     * Update Price and Inventory
     * https://developers.trendyol.com/en/product-integration/update-price-and-inventory
     */
    async updatePriceAndInventory(items: { barcode: string, quantity?: number, salePrice?: number, listPrice?: number }[]) {
        await this.init();
        if (!this.creds) throw new Error("No creds");

        const url = `${this.baseUrl}/suppliers/${this.creds.supplierId}/products/price-and-inventory`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": this.getAuthHeader(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ items })
        });

        const data = await response.json();
        return { ok: response.ok, ...data };
    }
    /**
     * Get Attributes for a Category
     * https://developers.trendyol.com/en/product-integration/get-category-attributes
     */
    async getCategoryAttributes(categoryId: number) {
        await this.init();
        const response = await fetch(`${this.baseUrl}/product-categories/${categoryId}/attributes`, {
            headers: { "Authorization": this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Trendyol API Error: ${response.statusText}`);
        return await response.json();
    }
}
