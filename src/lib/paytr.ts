import crypto from "crypto";

interface PayTRConfig {
    merchantId: string;
    merchantKey: string;
    merchantSalt: string;
    debugMode: string;
    testMode: string;
    appUrl: string;
}

const config: PayTRConfig = {
    merchantId: process.env.PAYTR_MERCHANT_ID || "",
    merchantKey: process.env.PAYTR_MERCHANT_KEY || "",
    merchantSalt: process.env.PAYTR_MERCHANT_SALT || "",
    debugMode: process.env.PAYTR_DEBUG_MODE || "1",
    testMode: process.env.PAYTR_TEST_MODE || "1",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3021",
};

export interface PayTRTokenData {
    user_ip: string;
    merchant_oid: string;
    email: string;
    payment_amount: number;
    user_basket: [string, string, number][];
    user_name: string;
    user_address: string;
    user_phone: string;
}

export async function getPayTRToken(data: PayTRTokenData) {
    const merchant_ok_url = `${config.appUrl}/payment/success`;
    const merchant_fail_url = `${config.appUrl}/payment/fail`;

    // Amount is in kuruş (cents) * 100
    const payment_amount = Math.round(data.payment_amount * 100);
    const user_basket = Buffer.from(JSON.stringify(data.user_basket)).toString("base64");

    const hash_str =
        config.merchantId +
        data.user_ip +
        data.merchant_oid +
        data.email +
        payment_amount +
        user_basket +
        "0" + // no_installment: 0 (enable installments)
        "0" + // max_installment: 0 (no limit)
        "TRY" + // currency
        config.testMode;

    const paytr_token = crypto
        .createHmac("sha256", config.merchantKey)
        .update(hash_str + config.merchantSalt)
        .digest("base64");

    const params = {
        merchant_id: config.merchantId,
        user_ip: data.user_ip,
        merchant_oid: data.merchant_oid,
        email: data.email,
        payment_amount: payment_amount,
        paytr_token: paytr_token,
        user_basket: user_basket,
        debug_mode: config.debugMode,
        no_installment: "0",
        max_installment: "0",
        user_name: data.user_name,
        user_address: data.user_address,
        user_phone: data.user_phone,
        merchant_ok_url: merchant_ok_url,
        merchant_fail_url: merchant_fail_url,
        timeout_limit: "30",
        currency: "TRY",
        test_mode: config.testMode,
    };

    try {
        const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(params as any).toString(),
        });

        const result = await response.json();

        if (result.status === "success") {
            return { success: true, token: result.token };
        } else {
            return { success: false, error: result.reason };
        }
    } catch (error) {
        console.error("PayTR getPayTRToken error:", error);
        return { success: false, error: "PayTR bağlantı hatası" };
    }
}

export function verifyPayTRCallback(params: any) {
    const { merchant_oid, status, total_amount, hash } = params;

    const hash_str = merchant_oid + config.merchantSalt + status + total_amount;
    const expected_hash = crypto
        .createHmac("sha256", config.merchantKey)
        .update(hash_str)
        .digest("base64");

    return hash === expected_hash;
}

export async function getInstallmentRates() {
    const request_id = Date.now().toString();
    const hash_str = config.merchantId + request_id + config.merchantSalt;

    const paytr_token = crypto
        .createHmac("sha256", config.merchantKey)
        .update(hash_str)
        .digest("base64");

    const params = new URLSearchParams();
    params.append('merchant_id', config.merchantId);
    params.append('request_id', request_id);
    params.append('paytr_token', paytr_token);

    try {
        const response = await fetch("https://www.paytr.com/odeme/api/get-installment-rates", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
            cache: 'no-store'
        });

        console.log("PayTR API Status:", response.status, response.statusText);

        const responseText = await response.text();

        try {
            if (!response.ok) {
                return {
                    status: "error",
                    err_msg: `PayTR Hatası (${response.status}): ${responseText.substring(0, 100)}`
                };
            }

            const result = JSON.parse(responseText);
            if (result.status === "error") {
                console.error("PayTR API Error Response:", result);
            }
            return result;
        } catch (e) {
            console.error("PayTR raw response (not JSON):", responseText);
            return {
                status: "error",
                err_msg: `PayTR geçersiz yanıt döndürdü. Durum: ${response.status}. Yanıt: ${responseText.substring(0, 100) || "Boş"}`
            };
        }
    } catch (error: any) {

        console.error("PayTR getInstallmentRates fetch error details:", {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        return { status: "error", err_msg: `Bağlantı hatası: ${error.message || "Sunucu PayTR'a erişemedi."}` };
    }
}



