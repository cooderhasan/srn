import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";
import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                user: true,
                items: true,
                payment: true,
            },
        });

        if (!order) {
            return new NextResponse("Order not found", { status: 404 });
        }

        const settings = await getSiteSettings();

        // Ensure order has expected shape for the PDF component (serialize decimals if needed, but PDF renderer handles primitives mostly)
        // We might need to cast Decimals to Numbers if our component expects numbers.
        const orderData = {
            ...order,
            subtotal: Number(order.subtotal),
            discountAmount: Number(order.discountAmount),
            vatAmount: Number(order.vatAmount),
            total: Number(order.total),
            items: order.items.map(item => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                lineTotal: Number(item.lineTotal)
            })),
            payment: order.payment ? {
                ...order.payment,
                amount: Number(order.payment.amount)
            } : null
        };

        const stream = await renderToStream(<InvoicePDF order={orderData} settings={settings} />);

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="siparis-${order.orderNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error("PDF generation error:", error);
        return new NextResponse("Error generating PDF", { status: 500 });
    }
}
