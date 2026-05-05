import { NextRequest, NextResponse } from "next/server";
import { checkTrendyolBatchRequest } from "@/app/admin/(protected)/integrations/trendyol/actions";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const res = await checkTrendyolBatchRequest(params.id);
    return NextResponse.json(res);
}
