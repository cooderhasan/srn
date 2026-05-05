import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const config = await (prisma as any).trendyolConfig.findFirst();
        if (!config) return NextResponse.json({ error: "No config found" });

        const gatewayUrl = "https://apigw.trendyol.com";
        const pair = `${config.apiKey}:${config.apiSecret}`;
        const headers = {
            "Authorization": `Basic ${Buffer.from(pair).toString("base64")}`,
            "User-Agent": `${config.supplierId} - SelfIntegration`,
            "Content-Type": "application/json"
        };

        const providerUrls = [
            `${gatewayUrl}/integration/cargo/sellers/${config.supplierId}/providers`,
            `${gatewayUrl}/integration/product/shipping-providers`,
            `https://api.trendyol.com/sapigw/suppliers/${config.supplierId}/providers`,
            `https://api.trendyol.com/sapigw/providers`
        ];

        const providerResults: any = {};
        for (const url of providerUrls) {
            try {
                const res = await fetch(url, { headers });
                const text = await res.text();
                providerResults[url] = { status: res.status, text: text.substring(0, 100) };
            } catch (e: any) {
                providerResults[url] = { error: e.message };
            }
        }

        const addressUrls = [
            `${gatewayUrl}/integration/cargo/sellers/${config.supplierId}/addresses`,
            `${gatewayUrl}/integration/sellers/${config.supplierId}/addresses`,
            `https://api.trendyol.com/sapigw/suppliers/${config.supplierId}/addresses`
        ];

        const addressResults: any = {};
        for (const url of addressUrls) {
            try {
                const res = await fetch(url, { headers });
                const text = await res.text();
                addressResults[url] = { status: res.status, text: text.substring(0, 100) };
            } catch (e: any) {
                addressResults[url] = { error: e.message };
            }
        }

        return NextResponse.json({
            providerResults,
            addressResults
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
