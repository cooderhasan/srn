import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { QuoteDetailClient } from "./quote-detail-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getQuote(id: string) {
    const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    email: true,
                    companyName: true,
                    phone: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: { name: true }
                    }
                }
            },
        }
    });

    if (!quote) return null;

    return {
        ...quote,
        subtotal: quote.subtotal ? Number(quote.subtotal) : null,
        discount: quote.discount ? Number(quote.discount) : null,
        total: quote.total ? Number(quote.total) : null,
        validUntil: quote.validUntil?.toISOString() || null,
        createdAt: quote.createdAt.toISOString(),
        items: quote.items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            listPrice: Number(item.listPrice),
            quotedPrice: item.quotedPrice ? Number(item.quotedPrice) : null,
            lineTotal: item.lineTotal ? Number(item.lineTotal) : null,
        }))
    };
}

export default async function QuoteDetailPage({ params }: PageProps) {
    const { id } = await params;
    const quote = await getQuote(id);

    if (!quote) {
        notFound();
    }

    return <QuoteDetailClient quote={quote} />;
}
