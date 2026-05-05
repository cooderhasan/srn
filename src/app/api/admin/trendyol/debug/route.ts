import { NextResponse } from "next/server";
import { getTrendyolCargoAndAddresses } from "@/app/admin/(protected)/integrations/trendyol/actions";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const config = await (prisma as any).trendyolConfig.findFirst();
        if (!config) return NextResponse.json({ error: "No config found" });

        const optRes = await getTrendyolCargoAndAddresses();
        
        // Also do a manual fetch to show raw response
        const gatewayUrl = "https://apigw.trendyol.com";
        const pair = `${config.apiKey}:${config.apiSecret}`;
        const headers = {
            "Authorization": `Basic ${Buffer.from(pair).toString("base64")}`,
            "User-Agent": `${config.supplierId} - SelfIntegration`,
            "Content-Type": "application/json"
        };

        const provRes = await fetch(`${gatewayUrl}/integration/cargo/sellers/${config.supplierId}/providers`, { headers });
        const provStatus = provRes.status;
        const provText = await provRes.text();

        const addrRes = await fetch(`${gatewayUrl}/integration/cargo/sellers/${config.supplierId}/addresses`, { headers });
        const addrStatus = addrRes.status;
        const addrText = await addrRes.text();

        return NextResponse.json({
            configValues: {
                supplierId: config.supplierId,
                apiKeyLength: config.apiKey?.length,
                apiSecretLength: config.apiSecret?.length
            },
            getTrendyolCargoAndAddressesResult: optRes,
            rawProviders: { status: provStatus, text: provText },
            rawAddresses: { status: addrStatus, text: addrText }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
