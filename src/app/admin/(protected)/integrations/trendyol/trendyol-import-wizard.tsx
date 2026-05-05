"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTrendyolSellersProducts, importTrendyolProduct } from "./actions";
import { getCategories } from "@/app/admin/(protected)/categories/actions";
import { toast } from "sonner";
import { Loader2, Download, CheckCircle2, Link as LinkIcon, Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TrendyolImportWizard() {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [importingId, setImportingId] = useState<string | null>(null);
    
    // Config states
    const [siteCategories, setSiteCategories] = useState<any[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [discountRate, setDiscountRate] = useState<number>(20);

    useEffect(() => {
        fetchSiteCategories();
    }, []);

    const fetchSiteCategories = async () => {
        const cats = await getCategories();
        setSiteCategories(cats);
        if (cats.length > 0) setSelectedCategoryId(cats[0].id);
    };

    const fetchTrendyolProducts = async (isMore = false) => {
        setLoading(true);
        const nextPage = isMore ? page + 1 : 0;
        const res = await getTrendyolSellersProducts(nextPage, 50);
        
        if (res.success && res.data?.content) {
            const newItems = res.data.content;
            if (isMore) {
                setProducts(prev => [...prev, ...newItems]);
            } else {
                setProducts(newItems);
            }
            setPage(nextPage);
            setHasMore(newItems.length === 50);
            toast.success(`${newItems.length} ürün getirildi.`);
        } else {
            toast.error(res.message || "Ürünler çekilemedi.");
        }
        setLoading(false);
    };

    const handleImport = async (tProd: any) => {
        if (!selectedCategoryId) {
            toast.error("Lütfen önce bir hedef kategori seçin.");
            return;
        }

        setImportingId(tProd.barcode);
        try {
            const res = await importTrendyolProduct(tProductMapping(tProd), selectedCategoryId, discountRate);
            if (res.success) {
                toast.success(res.message);
                setProducts(prev => prev.map(p => p.barcode === tProd.barcode ? { ...p, isImported: true } : p));
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
        setImportingId(null);
    };

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
                    Trendyol'dan Ürün Aktar (Gelişmiş)
                </CardTitle>
                <CardDescription>
                    Ürünleri çekerken hedef kategoriyi ve fiyat indirim oranını belirleyebilirsiniz.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                {/* SETTINGS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-dashed">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                            <Settings2 className="w-3 h-3" /> Hedef Kategori
                        </label>
                        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Kategori Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                {siteCategories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                            💰 Fiyat İndirimi (%)
                        </label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                value={discountRate} 
                                onChange={(e) => setDiscountRate(Number(e.target.value))}
                                className="bg-white"
                                placeholder="Örn: 20"
                            />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">daha ucuz</span>
                        </div>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-4">Henüz ürün listesi çekilmedi.</p>
                        <Button onClick={() => fetchTrendyolProducts(false)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                            Trendyol Ürünlerini Getir
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-medium text-muted-foreground">{products.length} ürün listeleniyor</span>
                            <Button variant="ghost" size="sm" onClick={() => fetchTrendyolProducts(false)} disabled={loading} className="text-xs h-7">
                                Listeyi Sıfırla
                            </Button>
                        </div>
                        
                        <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto bg-white">
                            {products.map((p) => {
                                const tPrice = Number(p.salePrice || p.listPrice || 0);
                                const sPrice = (tPrice * (1 - discountRate / 100)).toFixed(2);
                                
                                return (
                                    <div key={p.barcode} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {p.images?.[0]?.url && (
                                                <img src={p.images[0].url} alt="" className="w-12 h-12 object-cover rounded border bg-white" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{p.barcode}</code>
                                                    <span className="text-[10px] font-medium text-gray-400">{p.quantity} Adet</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-gray-400 line-through">{tPrice} TL</span>
                                                        <span className="text-xs font-bold text-green-600">{sPrice} TL</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            size="sm" 
                                            variant={p.isImported ? "outline" : "default"}
                                            className={p.isImported ? "text-green-600 border-green-200 bg-green-50" : "bg-blue-600 hover:bg-blue-700 shadow-sm"}
                                            onClick={() => handleImport(p)}
                                            disabled={importingId === p.barcode || p.isImported}
                                        >
                                            {importingId === p.barcode ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : p.isImported ? (
                                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                            ) : (
                                                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            {p.isImported ? "Aktarıldı" : "Aktar"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        {hasMore && (
                            <Button 
                                variant="outline" 
                                className="w-full border-blue-100 text-blue-600 hover:bg-blue-50" 
                                onClick={() => fetchTrendyolProducts(true)}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Daha Fazla Ürün Yükle (Sonrakı 50)"}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
