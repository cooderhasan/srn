
import { prisma } from "@/lib/db";

interface HepsiburadaCreds {
    username: string; // Merchant ID or User
    password: string;
    merchantId?: string;
}

export class HepsiburadaClient {
    // Listing API (https://listing-external-sit.hepsiburada.com for test, produce for prod)
    // Production Listing API: https://listing-external.hepsiburada.com
    // Production Order API: https://oms-external.hepsiburada.com

    private listingBaseUrl = "https://listing-external.hepsiburada.com";
    private orderBaseUrl = "https://oms-external.hepsiburada.com";

    private creds: HepsiburadaCreds | null = null;

    constructor(creds?: HepsiburadaCreds) {
        if (creds) {
            this.creds = creds;
        }
    }

    async init() {
        if (this.creds) return;
        const config = await (prisma as any).hepsiburadaConfig.findFirst({ where: { isActive: true } });
        if (!config) throw new Error("Aktif Hepsiburada yapılandırması bulunamadı.");

        this.creds = {
            username: config.username,
            password: config.password,
            merchantId: config.merchantId || config.username // Fallback if merchantId creates confusion
        };
    }

    private getAuthHeader() {
        if (!this.creds) throw new Error("Creds missing");
        // Basic Auth
        const pair = `${this.creds.username}:${this.creds.password}`;
        return `Basic ${Buffer.from(pair).toString("base64")}`;
    }

    /**
     * Check Connection (Simple GET to Listings)
     */
    async checkConnection(): Promise<boolean> {
        try {
            await this.init();
            if (!this.creds?.merchantId) return false;

            const response = await fetch(`${this.listingBaseUrl}/listings/merchantid/${this.creds.merchantId}?limit=1`, {
                headers: { "Authorization": this.getAuthHeader() }
            });
            return response.ok;
        } catch (error) {
            console.error("HB Check Connection Error:", error);
            return false;
        }
    }

    /**
     * Create/Update Listings (Bulk)
     * POST /listings/merchantid/{merchantId}/inventory-uploads
     */
    async uploadInventory(items: any[]) {
        await this.init();
        if (!this.creds?.merchantId) throw new Error("Merchant ID missing");

        const url = `${this.listingBaseUrl}/listings/merchantid/${this.creds.merchantId}/inventory-uploads`;

        // Hepsiburada format is specific. Usually XML or JSON depending on version.
        // Modern API uses JSON.
        // Payload structure: 
        // [ { merchantSku: "...", price: 100, availableStock: 10, dispatchTime: 3, cargoCompany1: "Yurtici", ... } ]

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": this.getAuthHeader(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(items)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HB API Error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Get Orders
     * GET /orders/merchantid/{merchantId}
     */
    async getOrders(status = "New") { // Status might be different in HB API
        await this.init();
        if (!this.creds?.merchantId) throw new Error("Merchant ID missing");

        // HB Orders Endpoint structure varies. Using standard OMS endpoint pattern.
        const url = `${this.orderBaseUrl}/orders/merchantid/${this.creds.merchantId}?limit=50`;

        const response = await fetch(url, {
            headers: { "Authorization": this.getAuthHeader() }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HB Order API Error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    }
}
