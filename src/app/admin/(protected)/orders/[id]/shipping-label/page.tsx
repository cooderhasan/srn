import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/helpers";
import { getSiteSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { AutoPrint } from "@/components/admin/auto-print";
import { Barcode } from "@/components/admin/barcode";

export default async function ShippingLabelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            user: true,
            // Items are NOT included as per requirement
        },
    });

    if (!order) {
        notFound();
    }

    const settings = await getSiteSettings();

    // Prepare shipping address
    const shippingAddress = order.shippingAddress as any;

    return (
        <div className="bg-white min-h-screen text-black p-8 mx-auto max-w-[210mm]">
            {/* Print CSS */}
            <style>{`
                @media print {
                    @page { 
                        margin: 1cm; 
                        size: auto; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        background-color: white !important; 
                        margin: 0;
                        padding: 0;
                    }
                    .no-print { display: none !important; }
                    /* Reset layout padding from admin layout */
                    .lg\\:pl-64 { padding-left: 0 !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                    
                    /* Force A4/A5 compatibility by ensuring container fits */
                    .label-container {
                        width: 100%;
                        max-width: 100%;
                        border: 2px solid #000;
                        padding: 20px;
                        box-sizing: border-box;
                        page-break-inside: avoid;
                    }
                }
            `}</style>

            <AutoPrint />

            {/* Actions (Hidden in Print) */}
            <div className="no-print mb-8 flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-gray-600 font-medium">Kargo Etiketi Önizleme</span>
                    <span className="text-xs text-gray-500">Bu sayfa otomatik olarak yazıcı diyaloğunu açar. (A4/A5 Uyumlu)</span>
                </div>
                <PrintButton />
            </div>

            {/* Label Container */}
            <div className="label-container border-2 border-black p-6 md:p-10 max-w-2xl mx-auto bg-white rounded-none">

                {/* Header / Sender Info */}
                <div className="border-b-2 border-black pb-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div className="w-2/3">
                            <h2 className="text-xs font-bold text-gray-500 uppercase mb-1">GÖNDERİCİ</h2>
                            {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="h-12 w-auto object-contain mb-2" />
                            ) : (
                                <h1 className="text-xl font-bold uppercase mb-1">{settings.companyName || "Firma Adı"}</h1>
                            )}
                            <div className="text-sm font-medium">
                                <p>{settings.address}</p>
                                <p className="mt-1">{settings.phone} | {settings.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xs font-bold text-gray-500 uppercase mb-1">TARİH</h2>
                            <p className="font-bold text-lg">{new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* Receiver Info */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold text-gray-500 uppercase mb-2 border-b border-gray-300 pb-1">ALICI (TESLİMAT ADRESİ)</h2>
                    <div className="pl-2">
                        <div className="text-2xl font-bold uppercase mb-2 leading-tight">
                            {shippingAddress?.name || order.user?.companyName || order.user?.email || (order as any).guestEmail || "Müşteri"}
                        </div>
                        <div className="text-lg font-medium whitespace-pre-wrap leading-snug mb-2">
                            {shippingAddress?.address || order.user?.address || "Adres bilgisi yok"}
                        </div>
                        <div className="text-xl font-bold uppercase">
                            {shippingAddress?.district || order.user?.district} / {shippingAddress?.city || order.user?.city}
                        </div>
                        <div className="mt-3 font-mono text-lg">
                            Tel: {shippingAddress?.phone || order.user?.phone || "-"}
                        </div>
                    </div>
                </div>

                {/* Cargo & Order Info Grid */}
                <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-6">
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase mb-1">SİPARİŞ NO</h2>
                        <p className="text-2xl font-mono font-bold">#{order.orderNumber}</p>
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase mb-1">KARGO FİRMASI</h2>
                        <p className="text-xl font-bold uppercase">{order.cargoCompany || "BELİRTİLMEDİ"}</p>
                    </div>

                    {order.trackingUrl && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-300">
                            <h2 className="text-xs font-bold text-gray-500 uppercase mb-1">TAKİP NO / LİNK</h2>
                            <p className="text-sm break-all font-mono">{order.trackingUrl}</p>
                        </div>
                    )}

                    <div className="col-span-2 mt-4 pt-4 border-t border-black">
                        <div className="flex flex-col items-center justify-center space-y-2">
                             <Barcode 
                                value={(order as any).ykCargoKey || order.orderNumber} 
                                width={2.5} 
                                height={100} 
                                className="mb-2"
                             />
                             <div className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                                {settings.companyName || "Firma Adı"} - Kargo Etiketi
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
