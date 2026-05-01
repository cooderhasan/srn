import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
        }

        const body = await request.json();
        const { items, notes } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "En az bir ürün gerekli" }, { status: 400 });
        }

        // Teklif numarası oluştur
        const quoteNumber = `TKL-${Date.now().toString(36).toUpperCase()}`;

        // Ürün bilgilerini veritabanından al
        const productIds = items.map((item: { productId: string }) => item.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, listPrice: true }
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // Teklif oluştur
        const quote = await prisma.quote.create({
            data: {
                quoteNumber,
                userId: session.user.id,
                status: "PENDING",
                notes: notes || null,
                items: {
                    create: items.map((item: { productId: string; quantity: number }) => {
                        const product = productMap.get(item.productId);
                        if (!product) throw new Error(`Ürün bulunamadı: ${item.productId}`);

                        return {
                            productId: item.productId,
                            productName: product.name,
                            quantity: item.quantity,
                            listPrice: product.listPrice,
                        };
                    })
                }
            },
            include: { items: true }
        });

        return NextResponse.json({
            success: true,
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber
        });
    } catch (error) {
        console.error("Quote creation error:", error);
        return NextResponse.json({ error: "Teklif oluşturulamadı" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
        }

        // Kullanıcının tekliflerini getir
        const quotes = await prisma.quote.findMany({
            where: { userId: session.user.id },
            include: {
                items: true
            },
            orderBy: { createdAt: "desc" }
        });

        const formattedQuotes = quotes.map(q => ({
            ...q,
            subtotal: q.subtotal ? Number(q.subtotal) : null,
            discount: q.discount ? Number(q.discount) : null,
            total: q.total ? Number(q.total) : null,
            items: q.items.map(item => ({
                ...item,
                listPrice: Number(item.listPrice),
                quotedPrice: item.quotedPrice ? Number(item.quotedPrice) : null,
                lineTotal: item.lineTotal ? Number(item.lineTotal) : null,
            }))
        }));

        return NextResponse.json(formattedQuotes);
    } catch (error) {
        console.error("Quotes fetch error:", error);
        return NextResponse.json({ error: "Teklifler getirilemedi" }, { status: 500 });
    }
}
