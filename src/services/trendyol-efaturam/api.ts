import axios from "axios";

export interface EFaturamAuth {
    username: string;
    password: string;
    companyId?: string;
    isTestMode?: boolean;
}

export class TrendyolEFaturamClient {
    private baseUrl: string;
    private auth: EFaturamAuth;
    private token: string | null = null;

    constructor(auth: EFaturamAuth) {
        this.auth = auth;
        // Test ve Canlı ortam URL'leri farklı olabilir, dokümana göre güncellenecek
        this.baseUrl = auth.isTestMode 
            ? "https://test-api.trendyolefaturam.com" // Örnek test URL
            : "https://api.trendyolefaturam.com";   // Örnek canlı URL
    }

    private async login() {
        try {
            console.log("📡 Trendyol e-Faturam Login Attempt...");
            const response = await axios.post(`${this.baseUrl}/token`, {
                username: this.auth.username,
                password: this.auth.password
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                console.log("✅ Trendyol e-Faturam Login Success");
                return true;
            }
            return false;
        } catch (error: any) {
            console.error("❌ Trendyol e-Faturam Login Error:", error.response?.data || error.message);
            return false;
        }
    }

    private async request(method: string, endpoint: string, data?: any) {
        if (!this.token) {
            const success = await this.login();
            if (!success) throw new Error("API Login failed");
        }

        try {
            const response = await axios({
                method,
                url: `${this.baseUrl}${endpoint}`,
                data,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error(`❌ Trendyol e-Faturam API Error [${endpoint}]:`, error.response?.data || error.message);
            throw error;
        }
    }

    // Mükellef Sorgulama (e-Fatura mı e-Arşiv mi?)
    async checkTaxPayer(taxId: string) {
        try {
            const result = await this.request('GET', `/api/v1/taxpayer/check/${taxId}`);
            // Eğer mükellef ise e-fatura, değilse e-arşiv
            return {
                isEFatura: result.isTaxPayer || false,
                alias: result.alias || null
            };
        } catch (error) {
            return { isEFatura: false, alias: null };
        }
    }

    // Fatura Oluşturma
    async createInvoice(invoiceData: any) {
        return await this.request('POST', '/api/v1/invoice/create', invoiceData);
    }

    // Fatura PDF Linki Alma
    async getInvoicePdf(invoiceId: string) {
        return await this.request('GET', `/api/v1/invoice/pdf/${invoiceId}`);
    }
}
