
import { prisma } from "@/lib/db";

interface N11Creds {
    apiKey: string;
    apiSecret: string;
}

export class N11Client {
    private productServiceUrl = "https://api.n11.com/ws/ProductService.wsdl";
    private orderServiceUrl = "https://api.n11.com/ws/OrderService.wsdl";
    private categoryServiceUrl = "https://api.n11.com/ws/CategoryService.wsdl";
    private creds: N11Creds | null = null;

    constructor(creds?: N11Creds) {
        if (creds) {
            this.creds = creds;
        }
    }

    async init() {
        if (this.creds) return;
        const config = await (prisma as any).n11Config.findFirst({ where: { isActive: true } });
        if (!config) throw new Error("Aktif N11 yapılandırması bulunamadı.");
        this.creds = { apiKey: config.apiKey, apiSecret: config.apiSecret };
    }

    private async callSoap(url: string, action: string, bodyXml: string) {
        if (!this.creds) await this.init();

        const envelope = `
         <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
            <soapenv:Header/>
            <soapenv:Body>
               ${bodyXml}
            </soapenv:Body>
         </soapenv:Envelope>`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": ""
            },
            body: envelope
        });

        return await response.text();
    }

    /**
     * Test connection with detailed error reporting
     */
    async checkConnectionDetailed(): Promise<{ success: boolean; message: string }> {
        try {
            await this.init();
            if (!this.creds) return { success: false, message: "Ayarlar yüklenemedi." };

            const xml = `
                <sch:GetTopLevelCategoriesRequest>
                    <auth>
                        <appKey>${this.creds.apiKey}</appKey>
                        <appSecret>${this.creds.apiSecret}</appSecret>
                    </auth>
                </sch:GetTopLevelCategoriesRequest>`;

            const response = await this.callSoap(this.categoryServiceUrl, "GetTopLevelCategories", xml);
            
            if (response.includes("<status>success</status>")) {
                return { success: true, message: "Tamam" };
            }

            // Extract error message from XML
            const errorMatch = response.match(/<errorMessage>(.*?)<\/errorMessage>/);
            const errorCodeMatch = response.match(/<errorCode>(.*?)<\/errorCode>/);
            const errorMsg = errorMatch ? errorMatch[1] : "Bilinmeyen N11 Hatası";
            const errorCode = errorCodeMatch ? errorCodeMatch[1] : "SOAP_ERR";

            return { success: false, message: `${errorMsg} (${errorCode})` };

        } catch (error: any) {
            return { success: false, message: "Bağlantı Kurulamadı: " + error.message };
        }
    }

    // --- Product Service ---

    async saveProduct(product: any) {
        const xml = `
           <sch:SaveProductRequest>
              <auth>
                 <appKey>${this.creds?.apiKey}</appKey>
                 <appSecret>${this.creds?.apiSecret}</appSecret>
              </auth>
              <product>
                 <productSellerCode>${product.sellerCode}</productSellerCode>
                 <title>${product.title}</title>
                 <subtitle>${product.subtitle || ""}</subtitle>
                 <description><![CDATA[${product.description}]]></description>
                 <category>
                    <id>${product.categoryId}</id>
                 </category>
                 <price>${product.price}</price>
                 <currencyType>TL</currencyType>
                 <images>
                    ${product.images.map((url: string) => `<image><url>${url}</url><order>1</order></image>`).join("")}
                 </images>
                 <approvalStatus>1</approvalStatus>
                 <preparingDay>3</preparingDay>
                 <stockItems>
                    <stockItem>
                       <quantity>${product.quantity}</quantity>
                       <sellerStockCode>${product.stockCode}</sellerStockCode>
                       <optionPrice>${product.price}</optionPrice>
                    </stockItem>
                 </stockItems>
              </product>
           </sch:SaveProductRequest>`;

        const response = await this.callSoap(this.productServiceUrl, "SaveProduct", xml);
        // Simple success check
        const success = response.includes("<status>success</status>") || response.includes("<result>true</result>");

        let message = "Success";
        if (!success) {
            const match = response.match(/<errorMessage>(.*?)<\/errorMessage>/);
            message = match ? match[1] : "Unknown Error";
        }
        return { success, message, raw: response };
    }

    // --- Stock/Price Update ---

    async updateStock(item: { sellerStockCode: string, quantity: number }) {
        const xml = `
           <sch:UpdateStockByStockSellerCodeRequest>
               <auth>
                   <appKey>${this.creds?.apiKey}</appKey>
                   <appSecret>${this.creds?.apiSecret}</appSecret>
               </auth>
               <stockSellerCode>${item.sellerStockCode}</stockSellerCode>
               <quantity>${item.quantity}</quantity>
           </sch:UpdateStockByStockSellerCodeRequest>`;

        const response = await this.callSoap(this.productServiceUrl, "UpdateStockByStockSellerCode", xml);
        const success = response.includes("<status>success</status>");
        return { success, raw: response };
    }

    async updatePrice(item: { sellerStockCode: string, price: number }) {
        const xml = `
           <sch:UpdateProductPriceBySellerCodeRequest>
               <auth>
                   <appKey>${this.creds?.apiKey}</appKey>
                   <appSecret>${this.creds?.apiSecret}</appSecret>
               </auth>
               <productSellerCode>${item.sellerStockCode}</productSellerCode>
               <price>${item.price}</price>
               <currencyType>TL</currencyType>
           </sch:UpdateProductPriceBySellerCodeRequest>`;

        const response = await this.callSoap(this.productServiceUrl, "UpdateProductPriceBySellerCode", xml);
        // Note: N11 uses UpdateProductPriceBySellerCodeRequest usually.
        // If it fails, check WSDL. Usually strict naming.
        const success = response.includes("<status>success</status>");
        return { success, raw: response };
    }

    // --- Order Service ---

    async getOrders(status = "New") { // Status: New, Approved, Rejected, Shipped, Delivered, Completed, Claimed, Lateness
        const xml = `
           <sch:OrderListRequest>
               <auth>
                   <appKey>${this.creds?.apiKey}</appKey>
                   <appSecret>${this.creds?.apiSecret}</appSecret>
               </auth>
               <searchData>
                   <status>${status}</status>
               </searchData>
           </sch:OrderListRequest>`;

        const response = await this.callSoap(this.orderServiceUrl, "OrderList", xml);

        // Manual XML Parsing for Orders is painful.
        // We will do a basic regex extraction for Order Numbers as a proof of concept
        // Or we could return raw XML for now.
        return { raw: response };
    }

    // --- Category Service ---

    async getCategoryAttributes(categoryId: number) {
        const xml = `
           <sch:GetCategoryAttributesRequest>
               <auth>
                   <appKey>${this.creds?.apiKey}</appKey>
                   <appSecret>${this.creds?.apiSecret}</appSecret>
               </auth>
               <categoryId>${categoryId}</categoryId>
           </sch:GetCategoryAttributesRequest>`;

        const response = await this.callSoap(this.categoryServiceUrl, "GetCategoryAttributes", xml);
        
        // Simple XML extraction for attributes (Name and ID)
        const attributes: any[] = [];
        const matches = response.matchAll(/<attribute>[\s\S]*?<id>(.*?)<\/id>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<mandatory>(.*?)<\/mandatory>[\s\S]*?<\/attribute>/g);
        
        for (const match of matches) {
            attributes.push({
                id: match[1],
                name: match[2],
                mandatory: match[3] === "true",
                // N11 values are separate call usually, but we could simplify or add them here if needed
            });
        }
        
        return { success: true, attributes };
    }
}
