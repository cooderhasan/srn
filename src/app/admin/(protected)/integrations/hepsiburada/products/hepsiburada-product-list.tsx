
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
    Box,
    Link2
} from "lucide-react";
import { toast } from "sonner";
import { sendProductToHepsiburada, getHepsiburadaCategoryAttributes } from "../actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface HepsiburadaProductListProps {
    initialProducts: any[];
}

export function HepsiburadaProductList({ initialProducts }: HepsiburadaProductListProps) {
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
        const mappedCat = product.categories.find((c: any) => c.hepsiburadaCategoryId !== null);
        if (!mappedCat) {
            toast.error("Önce kategoriyi Hepsiburada ile eşleştirmelisiniz.");
            return;
        }

        setSelectedProduct(product);
        setShowAttrModal(true);
        setAttrLoading(true);
        setAttrMappings({});

        try {
            const res = await getHepsiburadaCategoryAttributes(mappedCat.hepsiburadaCategoryId);
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
        
        const finalAttrs = Object.entries(attrMappings).map(([name, val]) => ({
            name,
            value: val
        }));

        setLoadingProductId(selectedProduct.id);
        setShowAttrModal(false);

        try {
            const res = await sendProductToHepsiburada(selectedProduct.id, finalAttrs);
            if (res.success) {
                toast.success(res.message);
                setProducts(prev => prev.map(p => 
                    p.id === selectedProduct.id 
                    ? { ...p, hepsiburadaProduct: { isSynced: true, lastSyncedAt: new Date() } }
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

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="HB ürünlerini ara..." 
                        className="pl-10 border-none bg-gray-50 dark:bg-gray-800/50 focus-visible:ring-blue-500"
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
                            <TableHead>HB Fiyat</TableHead>
                            <TableHead>Katalog</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.map((product) => {
                            const isSynced = !!product.hepsiburadaProduct?.isSynced;
                            const mappedCat = product.categories.find((c: any) => c.hepsiburadaCategoryId !== null);

                            return (
                                <TableRow key={product.id} className="hover:bg-blue-50/10 transition-colors">
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
                                        <span className="text-sm font-bold text-blue-600">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(product.hepsiburadaPrice || product.listPrice))}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {mappedCat ? (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none text-[10px]">
                                                Katalog Hazır
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-500 text-[10px]">Kategori Bekliyor</Badge>
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
                                                <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-600" onClick={() => handleOpenWizard(product)} disabled={loadingProductId === product.id}>
                                                    <RefreshCcw className="w-3 h-3 mr-1" />
                                                    Güncelle
                                                </Button>
                                            ) : (
                                                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOpenWizard(product)} disabled={loadingProductId === product.id || !mappedCat}>
                                                    <Link2 className="w-3 h-3 mr-1" />
                                                    HB Kataloğuna Gönder
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
                <DialogContent className="rounded-3xl border-blue-100 dark:border-blue-900/30">
                    <DialogHeader>
                        <DialogTitle>HB Katalog Eşleştirme</DialogTitle>
                        <DialogDescription>HB Kataloğu için zorunlu teknik detayları doldurun.</DialogDescription>
                    </DialogHeader>

                    {attrLoading ? (
                        <div className="py-8 flex justify-center"><RefreshCcw className="animate-spin text-blue-500" /></div>
                    ) : (
                        <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
                            {categoryAttrs.map((attr: any) => (
                                <div key={attr.id} className="space-y-1">
                                    <Label className="text-xs">{attr.name} {attr.required && "*"}</Label>
                                    <Input 
                                        className="h-8 text-sm"
                                        placeholder={`${attr.name} değerini girin...`}
                                        onChange={(e) => setAttrMappings((prev: any) => ({ ...prev, [attr.name]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowAttrModal(false)}>İptal</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSend}>Kataloğa Gönder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
