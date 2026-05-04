
"use client";

import { useState } from "react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Search, 
    Send, 
    RefreshCcw, 
    AlertCircle, 
    CheckCircle2, 
    Box
} from "lucide-react";
import { toast } from "sonner";
import { sendProductToN11, getN11CategoryAttributes } from "../actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface N11ProductListProps {
    initialProducts: any[];
}

export function N11ProductList({ initialProducts }: N11ProductListProps) {
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState(initialProducts);
    const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
    
    const [showAttrModal, setShowAttrModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [categoryAttrs, setCategoryAttrs] = useState<any[]>([]);
    const [attrMappings, setAttrMappings] = useState<any>({});
    const [attrLoading, setAttrLoading] = useState(false);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenWizard = async (product: any) => {
        const mappedCat = product.categories.find((c: any) => c.n11CategoryId !== null);
        if (!mappedCat) {
            toast.error("Önce kategoriyi N11 ile eşleştirmelisiniz.");
            return;
        }

        setSelectedProduct(product);
        setShowAttrModal(true);
        setAttrLoading(true);
        setAttrMappings({});

        try {
            const res = await getN11CategoryAttributes(mappedCat.n11CategoryId);
            if (res.success) {
                setCategoryAttrs(res.data || []);
            } else {
                toast.error(res.message);
                setShowAttrModal(false);
            }
        } catch (error) {
            toast.error("Özellikler yüklenemedi.");
            setShowAttrModal(false);
        } finally {
            setAttrLoading(false);
        }
    };

    const handleSend = async () => {
        if (!selectedProduct) return;
        
        const finalAttrs = Object.entries(attrMappings).map(([id, val]) => ({
            id: Number(id),
            value: val
        }));

        setLoadingProductId(selectedProduct.id);
        setShowAttrModal(false);

        try {
            const res = await sendProductToN11(selectedProduct.id, finalAttrs);
            if (res.success) {
                toast.success(res.message);
                setProducts(prev => prev.map(p => 
                    p.id === selectedProduct.id 
                    ? { ...p, n11Product: { isSynced: true, lastSyncedAt: new Date() } }
                    : p
                ));
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Gönderim sırasında hata oluştu.");
        } finally {
            setLoadingProductId(null);
        }
    };

    const handleQuickSync = async (product: any) => {
        setLoadingProductId(product.id);
        try {
            const res = await sendProductToN11(product.id, []); 
            if (res.success) {
                toast.success("N11 Stok/Fiyat güncellendi.");
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Güncelleme başarısız.");
        } finally {
            setLoadingProductId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="N11 ürünlerini ara..." 
                        className="pl-10 border-none bg-gray-50 dark:bg-gray-800/50 focus-visible:ring-purple-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                        <TableRow>
                            <TableHead className="w-[80px]">Görsel</TableHead>
                            <TableHead>Ürün</TableHead>
                            <TableHead>Stok / N11 Fiyat</TableHead>
                            <TableHead>Eşleşme</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.map((product) => {
                            const isSynced = !!product.n11Product?.isSynced;
                            const mappedCat = product.categories.find((c: any) => c.n11CategoryId !== null);

                            return (
                                <TableRow key={product.id} className="hover:bg-purple-50/10 transition-colors">
                                    <TableCell>
                                        <img src={product.images?.[0]} className="w-12 h-12 object-cover rounded-lg border" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm line-clamp-1">{product.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{product.sku || product.barcode}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">{product.stock} Adet</span>
                                            <span className="text-sm text-purple-600 font-bold">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(product.n11Price || product.listPrice))}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {mappedCat ? (
                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none text-[10px]">
                                                Kategori OK
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-red-500 text-[10px]">Kategori Eksik</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isSynced ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-500" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {isSynced ? (
                                                <Button size="sm" variant="outline" className="h-8 border-purple-200 text-purple-600" onClick={() => handleQuickSync(product)} disabled={loadingProductId === product.id}>
                                                    <RefreshCcw className={`w-3 h-3 mr-1 ${loadingProductId === product.id ? 'animate-spin' : ''}`} />
                                                    Sync
                                                </Button>
                                            ) : (
                                                <Button size="sm" className="h-8 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleOpenWizard(product)} disabled={loadingProductId === product.id || !mappedCat}>
                                                    <Send className="w-3 h-3 mr-1" />
                                                    N11'e Gönder
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={showAttrModal} onOpenChange={setShowAttrModal}>
                <DialogContent className="rounded-3xl border-purple-100 dark:border-purple-900/30">
                    <DialogHeader>
                        <DialogTitle>N11 Özelliklerini Eşleştir</DialogTitle>
                        <DialogDescription>Zorunlu alanları doldurarak ürünü N11'e kaydedin.</DialogDescription>
                    </DialogHeader>

                    {attrLoading ? (
                        <div className="py-8 flex justify-center"><RefreshCcw className="animate-spin text-purple-500" /></div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {categoryAttrs.map((attr: any) => (
                                <div key={attr.id} className="space-y-1">
                                    <Label className="text-xs">{attr.name} {attr.mandatory && "*"}</Label>
                                    <Input 
                                        className="h-8 text-sm"
                                        placeholder={`${attr.name} değerini girin...`}
                                        onChange={(e) => setAttrMappings((prev: any) => ({ ...prev, [attr.id]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowAttrModal(false)}>İptal</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSend}>Kaydet ve Gönder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
