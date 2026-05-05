"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrendyolSellersProducts, importTrendyolProduct } from "./actions";
import { toast } from "sonner";
import { Loader2, Download, CheckCircle2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TrendyolImportWizard() {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [importingId, setImportingId] = useState<string | null>(null);

    const fetchTrendyolProducts = async () => {
        setLoading(true);
        const res = await getTrendyolSellersProducts(0, 50);
        if (res.success && res.data?.content) {
            setProducts(res.data.content);
            toast.success(`${res.data.content.length} ürün getirildi.`);
        } else {
            toast.error(res.message || "Ürünler çekilemedi.");
        }
        setLoading(false);
    };

    const handleImport = async (tProd: any) => {
        setImportingId(tProd.barcode);
        try {
            const res = await importTrendyolProduct(tProductMapping(tProd));
            if (res.success) {
                toast.success(res.message);
                // Mark as imported locally to show UI change
                setProducts(prev => prev.map(p => p.barcode === tProd.barcode ? { ...p, isImported: true } : p));
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
        setImportingId(null);
    };

    // Trendyol response format to our internal mapping
    const tProductMapping = (t: any) => ({
        title: t.title,
        barcode: t.barcode,
        stockCode: t.stockCode,
        quantity: t.quantity,
        listPrice: t.listPrice,
        salePrice: t.salePrice,
        description: t.description,
        images: t.images,
        attributes: t.attributes
    });

    return (
        <Card className="border-blue-100 shadow-md">
            <CardHeader className="bg-blue-50/50">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                    <Download className="w-5 h-5" />
                    Trendyol'dan Ürün Çek
                </CardTitle>
                <CardDescription>
                    Trendyol panelinizdeki aktif ürünleri sitenize aktarabilir veya mevcut ürünlerle eşleştirebilirsiniz.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {products.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-4">Henüz ürün listesi çekilmedi.</p>
                        <Button onClick={fetchTrendyolProducts} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                            Ürün Listesini Getir (Son 50)
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-muted-foreground">{products.length} ürün bulundu</span>
                            <Button variant="ghost" size="sm" onClick={fetchTrendyolProducts} disabled={loading}>
                                Yenile
                            </Button>
                        </div>
                        <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
                            {products.map((p) => (
                                <div key={p.barcode} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {p.images?.[0]?.url && (
                                            <img src={p.images[0].url} alt="" className="w-10 h-10 object-cover rounded border" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="text-[10px] bg-gray-100 px-1 rounded">{p.barcode}</code>
                                                <span className="text-[10px] text-muted-foreground">{p.quantity} Adet</span>
                                                <span className="text-[10px] font-bold text-orange-600">{p.salePrice} TL</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        size="sm" 
                                        variant={p.isImported ? "outline" : "default"}
                                        className={p.isImported ? "text-green-600 border-green-200 bg-green-50" : "bg-blue-600 hover:bg-blue-700"}
                                        onClick={() => handleImport(p)}
                                        disabled={importingId === p.barcode || p.isImported}
                                    >
                                        {importingId === p.barcode ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : p.isImported ? (
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                        ) : (
                                            <LinkIcon className="w-3.5 h-3.5 mr-1" />
                                        )}
                                        {p.isImported ? "Aktarıldı" : "İçeri Aktar / Eşleştir"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
