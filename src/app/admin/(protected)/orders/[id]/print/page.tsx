import { prisma } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/helpers";
import { getSiteSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/components/admin/print-button";
import { AutoPrint } from "@/components/admin/auto-print";

// Helper to serialise decimals safely
const toNumber = (value: any) => {
    if (value === null || value === undefined) return 0;
    return typeof value === "object" && "toNumber" in value ? value.toNumber() : Number(value);
};

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
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
        notFound();
    }

    const settings = await getSiteSettings();

    // Prepare shipping address
    // Assuming shippingAddress is stored as JSON with standard fields
    const shippingAddress = order.shippingAddress as any; // Type assertion for now

    return (
        <div className="bg-white min-h-screen text-black p-8 max-w-[210mm] mx-auto">
            {/* Print CSS to hide non-print elements */}
            <style>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body { -webkit-print-color-adjust: exact; background-color: white !important; }
                    .no-print, header, aside { display: none !important; }
                    /* Reset layout padding from admin layout */
                    .lg\\:pl-64 { padding-left: 0 !important; }
                    /* Ensure main content takes full width */
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                }
            `}</style>


            {/* Auto-print component */}
            <AutoPrint />

            {/* Actions (Hidden in Print) */}
            <div className="no-print mb-8 flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-gray-600 font-medium">Baskı Önizleme</span>
                    <span className="text-xs text-gray-500">Bu sayfa otomatik olarak yazıcı diyaloğunu açar.</span>
                </div>
                <PrintButton />
            </div>

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-8 mb-8">
                <div className="space-y-2">
                    {settings.logoUrl && (
                        <div className="mb-4">
                            {/* Using standard img for print reliability */}
                            <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold">{settings.companyName || "Firma Adı"}</h1>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                        {settings.address}
                        <br />
                        {settings.phone} | {settings.email}
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <h2 className="text-3xl font-bold text-gray-800">SİPARİŞ BİLGİ FİŞİ</h2>
                    <p className="text-lg font-semibold">#{order.orderNumber}</p>
                    <p className="text-gray-600">{formatDate(order.createdAt)}</p>
                </div>
            </div>

            {/* Customer & Shipping */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                <div>
                    <h3 className="text-gray-500 font-semibold mb-2 uppercase tracking-wider text-sm">Müşteri Bilgileri</h3>
                    <div className="text-gray-800">
                        <p className="font-bold text-lg">{shippingAddress?.name || order.user?.companyName || order.user?.email || (order as any).guestEmail || "Misafir"}</p>
                        <p>{order.user?.email || (order as any).guestEmail}</p>
                        <p>{order.user?.phone || "-"}</p>
                        {/* Fallback to user address if no specific shipping address is in the JSON yet (depending on implementation) */}
                        <p className="mt-2 whitespace-pre-wrap">{order.user?.address}</p>
                        <p>{order.user?.district} {order.user?.district && '/'} {order.user?.city}</p>
                    </div>
                </div>
                <div>
                    <h3 className="text-gray-500 font-semibold mb-2 uppercase tracking-wider text-sm">Teslimat Adresi</h3>
                    <div className="text-gray-800">
                        {shippingAddress ? (
                            <>
                                <p className="font-bold">{shippingAddress.title || "Adres"}</p>
                                <p className="whitespace-pre-wrap">{shippingAddress.address}</p>
                                <p>{shippingAddress.district} / {shippingAddress.city}</p>
                                <p className="mt-1">Tel: {shippingAddress.phone}</p>
                            </>
                        ) : (
                            <p className="text-gray-500 italic">Müşteri adresi ile aynı veya belirtilmemiş.</p>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-gray-500 font-semibold mb-1 uppercase tracking-wider text-sm">Ödeme Yöntemi</h3>
                        <p className="font-medium">
                            {order.payment?.method === "BANK_TRANSFER" ? "Havale / EFT" : "Kredi Kartı"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Customer Note */}
            {order.notes && (
                <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-gray-500 font-semibold mb-2 uppercase tracking-wider text-xs">Müşteri Notu</h3>
                    <p className="text-gray-800 whitespace-pre-wrap">{order.notes}</p>
                </div>
            )}

            {/* Order Items */}
            <div className="mb-0">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-3 font-bold text-gray-700">Ürün Adı</th>
                            <th className="py-3 font-bold text-gray-700 text-center">Adet</th>
                            <th className="py-3 font-bold text-gray-700 text-right">Birim Fiyat</th>
                            <th className="py-3 font-bold text-gray-700 text-right">Toplam</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {order.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-3">
                                    <div className="font-medium">{item.productName}</div>
                                    <div className="text-xs text-gray-500">KDV: %{item.vatRate}</div>
                                </td>
                                <td className="py-3 text-center">{item.quantity}</td>
                                <td className="py-3 text-right">{formatPrice(toNumber(item.unitPrice))}</td>
                                <td className="py-3 text-right font-medium">{formatPrice(toNumber(item.lineTotal))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-6">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Ara Toplam:</span>
                        <span>{formatPrice(toNumber(order.subtotal))}</span>
                    </div>
                    {toNumber(order.discountAmount) > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>İskonto:</span>
                            <span>-{formatPrice(toNumber(order.discountAmount))}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                        <span>KDV Toplam:</span>
                        <span>{formatPrice(toNumber(order.vatAmount))}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t border-gray-800 pt-2 mt-2">
                        <span>GENEL TOPLAM:</span>
                        <span>{formatPrice(toNumber(order.total))}</span>
                    </div>
                </div>
            </div>

            {/* Bank Info (Only if Bank Transfer) */}
            {order.payment?.method === "BANK_TRANSFER" && (settings.bankIban1 || settings.bankIban2) && (
                <div className="mt-8 p-4 border rounded-lg border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-2">Ödeme Yapılacak Banka Hesapları</h4>
                    <p className="text-sm text-gray-600 mb-2">Lütfen ödeme açıklamasında <strong>sipariş numaranızı (#{order.orderNumber})</strong> belirtiniz.</p>
                    <div className="space-y-1 text-sm font-mono text-gray-700">
                        {settings.bankIban1 && <p>{settings.bankIban1}</p>}
                        {settings.bankIban2 && <p>{settings.bankIban2}</p>}
                    </div>
                </div>
            )}

            {/* Footer Notes */}
            <div className="mt-16 pt-8 border-t border-gray-300 text-center text-sm text-gray-500">
                <p>Bu belge bilgilendirme amaçlıdır. Fatura niteliği taşımaz.</p>
                <p className="mt-1">Teşekkürler, yine bekleriz.</p>
            </div>
        </div>
    );
}
