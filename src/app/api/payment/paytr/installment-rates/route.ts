import { NextResponse } from "next/server";
import { getInstallmentRates } from "@/lib/paytr";

export async function GET() {
    try {
        const rates = await getInstallmentRates();
        return NextResponse.json(rates);
    } catch (error) {
        console.error("Installment rates API error:", error);
        return NextResponse.json({ status: "error", err_msg: "Sunucu hatası" }, { status: 500 });
    }
}
