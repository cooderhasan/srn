import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
        }

        const quote = await prisma.quote.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!quote) {
            return NextResponse.json({ error: "Teklif bulunamadı" }, { status: 404 });
        }

        if (quote.userId !== session.user.id) {
            return NextResponse.json({ error: "Bu teklif size ait değil" }, { status: 403 });
        }

        if (quote.status !== "QUOTED") {
            return NextResponse.json({ error: "Bu teklif kabul edilemez" }, { status: 400 });
        }

        // Geçerlilik kontrolü
        if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
            await prisma.quote.update({
                where: { id },
                data: { status: "EXPIRED" }
            });
            return NextResponse.json({ error: "Teklifin süresi dolmuş" }, { status: 400 });
        }

        // Teklifi kabul et
        await prisma.quote.update({
            where: { id },
            data: { status: "ACCEPTED" }
        });

        return NextResponse.json({ success: true, message: "Teklif kabul edildi" });
    } catch (error) {
        console.error("Quote accept error:", error);
        return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
    }
}
