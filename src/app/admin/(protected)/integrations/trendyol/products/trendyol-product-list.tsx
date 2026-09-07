"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
    History,
    Layers,
    FileText
} from "lucide-react";
import { toast } from "sonner";
import { sendProductToTrendyol, getTrendyolCategoryAttributes, enqueueTrendyolSync } from "../actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { AttributeSearchableSelect } from "./attribute-searchable-select";

interface TrendyolProductListProps {
    initialProducts: any[];
}

export function TrendyolProductList({ initialProducts }: TrendyolProductListProps) {
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState(initialProducts);
    const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    
    // Attribute Modal State
    const [showAttrModal, setShowAttrModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [categoryAttrs, setCategoryAttrs] = useState<any[]>([]);
    const [attrMappings, setAttrMappings] = useState<any>({});
    const [attrLoading, setAttrLoading] = useState(false);

    const handleBulkSync = async () => {
        setSyncing(true);
        try {
            const res = await enqueueTrendyolSync();
            if (res.success) {
                toast.success(res.message, {
                    description: "Ürünler arka planda sırayla güncelleniyor. Panelden çıkış yapabilirsiniz.",
                    duration: 5000
                });
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Kuyruk işlemi başlatılamadı.");
        } finally {
            setSyncing(false);
        }
    };

    const handleOpenWizard = async (product: any) => {
        const mappedCats = product.categories.filter((c: any) => c.trendyolCategoryId !== null);
        if (mappedCats.length === 0) {
            toast.error("Önce kategoriyi Trendyol ile eşleştirmelisiniz.");
            return;
        }

        // Akıllı kategori seçimi: Birden fazla kategori varsa parentId'si olan (alt) kategoriyi önceliklendir
        const defaultCat = mappedCats.length > 1
            ? (mappedCats.find((c: any) => c.parentId) || mappedCats[mappedCats.length - 1])
            : mappedCats[0];

        const targetCatId = Number(defaultCat.trendyolCategoryId);
        setSelectedProduct(product);
        setSelectedCategoryId(targetCatId);
        setShowAttrModal(true);
        setAttrLoading(true);

        // Otomatik varsayılan zorunlu alanlar
        const initialMappings: any = {
            1216: "Serin Motor", // Birincil İthalatçı Adı
            1116: "Ustanıza danışınız." // Kullanım Talimatı
        };

        try {
            const res = await getTrendyolCategoryAttributes(targetCatId);
            if (res.success) {
                const attrs = res.data || [];
                setCategoryAttrs(attrs);

                // Zorunlu alanları otomatik akıllı doldur (Menşei, Beden, vb.)
                attrs.forEach((attr: any) => {
                    const attrId = attr.attribute?.id;
                    const attrName = (attr.attribute?.name || "").toLowerCase();
                    const vals = attr.attributeValues || [];

                    if (attrId === 1192 || attrName.includes("menşei") || attrName.includes("mensei")) {
                        const cnVal = vals.find((v: any) => v.name === "CN" || v.id === 10617300);
                        const trVal = vals.find((v: any) => v.name === "TR");
                        if (cnVal) initialMappings[attrId] = cnVal.id;
                        else if (trVal) initialMappings[attrId] = trVal.id;
                    } else if (attrId === 338 || attrName.includes("beden")) {
                        const tekEbat = vals.find((v: any) => v.name.toLowerCase().includes("tek ebat") || v.id === 6821);
                        if (tekEbat) initialMappings[attrId] = tekEbat.id;
                    } else if (attrId === 1201 || attrName.includes("tamir")) {
                        const tamirEdilmez = vals.find((v: any) => v.name.toLowerCase().includes("tamir edilmez") || v.id === 10621829);
                        if (tamirEdilmez) initialMappings[attrId] = tamirEdilmez.id;
                    } else if (attrId === 1209 || attrName.includes("ece")) {
                        const gorselYok = vals.find((v: any) => v.name.toLowerCase().includes("görselinde bulunmuyor") || v.id === 10621791);
                        if (gorselYok) initialMappings[attrId] = gorselYok.id;
                    }
                });

                setAttrMappings(initialMappings);
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

    const handleCategoryChange = async (catId: number) => {
        setSelectedCategoryId(catId);
        setAttrLoading(true);
        try {
            const res = await getTrendyolCategoryAttributes(catId);
            if (res.success) {
                const attrs = res.data || [];
                setCategoryAttrs(attrs);

                // Mevcut mappings üzerine zorunlu alanları tekrar uygula
                const newMappings = { ...attrMappings };
                attrs.forEach((attr: any) => {
                    const attrId = attr.attribute?.id;
                    const attrName = (attr.attribute?.name || "").toLowerCase();
                    const vals = attr.attributeValues || [];

                    if (!newMappings[attrId]) {
                        if (attrId === 1192 || attrName.includes("menşei")) {
                            const cnVal = vals.find((v: any) => v.name === "CN" || v.id === 10617300);
                            if (cnVal) newMappings[attrId] = cnVal.id;
                        } else if (attrId === 338 || attrName.includes("beden")) {
                            const tekEbat = vals.find((v: any) => v.name.toLowerCase().includes("tek ebat") || v.id === 6821);
                            if (tekEbat) newMappings[attrId] = tekEbat.id;
                        }
                    }
                });
                setAttrMappings(newMappings);
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error("Kategori özellikleri yüklenemedi.");
        } finally {
            setAttrLoading(false);
        }
    };

    const handleSend = async () => {
        if (!selectedProduct) return;
        
        // Convert mappings to Trendyol format
        const finalAttrs = Object.entries(attrMappings)
            .filter(([_, val]) => val !== undefined && val !== "" && val !== null)
            .map(([id, val]) => ({
                attributeId: Number(id),
                attributeValueId: typeof val === "number" ? val : undefined,
                customAttributeValue: typeof val === "string" ? val : undefined
            }));

        setLoadingProductId(selectedProduct.id);
        setShowAttrModal(false);

        try {
            const res = await sendProductToTrendyol(selectedProduct.id, finalAttrs, selectedCategoryId || undefined);
            if (res.success) {
                toast.success(res.message);
                // Update local state
                setProducts(prev => prev.map(p => 
                    p.id === selectedProduct.id 
                    ? { ...p, trendyolProduct: { isSynced: true, lastSyncedAt: new Date() } }
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
            const res = await sendProductToTrendyol(product.id, []);
            if (res.success) {
                toast.success("Stok ve Fiyat başarıyla güncellendi.");
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Güncelleme başarısız.");
        } finally {
            setLoadingProductId(null);
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase())
    );

    // Kategori özelliklerini Zorunlu / Temel ve Opsiyonel / GPSR olarak grupla
    const { primaryAttrs, optionalGpsrAttrs } = useMemo(() => {
        const primary: any[] = [];
        const gpsr: any[] = [];

        const gpsrKeywords = ["ithalatçı", "ithalatci", "üretici", "uretici", "yetkili", "adres", "posta", "telefon", "mail", "gpsr", "sorumlu"];

        categoryAttrs.forEach(attr => {
            const name = (attr.attribute?.name || "").toLowerCase();
            const isGpsrRelated = gpsrKeywords.some(kw => name.includes(kw));

            if (!attr.required && isGpsrRelated) {
                gpsr.push(attr);
            } else {
                primary.push(attr);
            }
        });

        return { primaryAttrs: primary, optionalGpsrAttrs: gpsr };
    }, [categoryAttrs]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Ürün adı, barkod veya SKU ara..." 
                        className="pl-10 border-none bg-gray-50 dark:bg-gray-800/50 focus-visible:ring-orange-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/integrations/trendyol/batches">
                        <Button 
                            variant="outline"
                            className="border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 gap-2 h-10 px-4 rounded-xl shadow-sm transition-all active:scale-95"
                        >
                            <History className="w-4 h-4 text-gray-500" />
                            <span className="hidden sm:inline">İşlem Geçmişi (Batch İzle)</span>
                            <span className="sm:hidden">Geçmiş</span>
                        </Button>
                    </Link>

                    <Button 
                        onClick={handleBulkSync} 
                        disabled={syncing}
                        variant="outline"
                        className="border-orange-200 text-orange-600 hover:bg-orange-50 gap-2 h-10 px-4 rounded-xl shadow-sm transition-all active:scale-95"
                    >
                        {syncing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        <span className="hidden sm:inline">Tümünü Kuyrukta Güncelle</span>
                        <span className="sm:hidden">Toplu Güncelle</span>
                    </Button>

                    <Badge variant="outline" className="h-10 px-4 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border-orange-100 dark:border-orange-900 font-bold">
                        {initialProducts.length} ÜRÜN
                    </Badge>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                        <TableRow>
                            <TableHead className="w-[100px]">Görsel</TableHead>
                            <TableHead>Ürün Bilgisi</TableHead>
                            <TableHead>Fiyat / Stok</TableHead>
                            <TableHead>Kategori / Marka</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.map((product) => {
                            const isSynced = !!product.trendyolProduct?.isSynced;
                            const mappedCat = product.categories.find((c: any) => c.trendyolCategoryId !== null);
                            const mappedBrand = product.brand?.trendyolBrandId !== null;

                            return (
                                <TableRow key={product.id} className="hover:bg-orange-50/10 transition-colors">
                                    <TableCell>
                                        <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full" />
                                            ) : (
                                                <Box className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm line-clamp-1">{product.name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">SKU: {product.sku || "-"}</span>
                                            <span className="text-[10px] text-muted-foreground">Barkod: {product.barcode || "-"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="secondary" className="w-fit font-mono text-[10px]">
                                                {product.stock} Adet
                                            </Badge>
                                            <span className="font-bold text-orange-600 dark:text-orange-500">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(product.trendyolPrice || product.listPrice))}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {mappedCat ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-none text-[10px]">
                                                        {mappedCat.name}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-500 border-red-200 text-[10px]">
                                                        Kategori Eşleşmemiş
                                                    </Badge>
                                                )}
                                                {product.categories.filter((c: any) => c.trendyolCategoryId !== null).length > 1 && (
                                                    <Badge variant="outline" className="text-[9px] border-orange-200 text-orange-600 bg-orange-50/50">
                                                        +{product.categories.filter((c: any) => c.trendyolCategoryId !== null).length - 1} Kategori
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {mappedBrand ? (
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-none text-[10px]">
                                                        {product.brand?.name}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-500 border-red-200 text-[10px]">
                                                        Marka Eşleşmemiş
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {isSynced ? (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-500 text-xs font-medium">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Senkronize
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                                                <AlertCircle className="w-4 h-4" />
                                                Gönderilmedi
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {isSynced ? (
                                                <>
                                                    <Button size="sm" variant="outline" className="gap-2 text-xs border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => handleQuickSync(product)} disabled={loadingProductId === product.id}>
                                                        <RefreshCcw className={`w-3 h-3 ${loadingProductId === product.id ? 'animate-spin' : ''}`} />
                                                        Stok/Fiyat Güncelle
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => handleOpenWizard(product)}>
                                                        Düzenle
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button size="sm" className="gap-2 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20" onClick={() => handleOpenWizard(product)} disabled={loadingProductId === product.id || !mappedCat || !mappedBrand}>
                                                    <Send className="w-3 h-3" />
                                                    Trendyol'a Gönder
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

            {/* ATTRIBUTE MAPPING DIALOG */}
            <Dialog open={showAttrModal} onOpenChange={setShowAttrModal}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto rounded-3xl border-orange-100 dark:border-orange-900/30">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Box className="w-5 h-5 text-orange-500" />
                            Trendyol V2 Ürün & Özellik Eşleştirme
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Trendyol V2 Seller Center standartlarına göre zorunlu ve kategori bazlı özellikleri tamamlayın.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Çoklu Kategori Seçimi */}
                    {selectedProduct && selectedProduct.categories.filter((c: any) => c.trendyolCategoryId !== null).length > 1 && (
                        <div className="bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 p-3 rounded-2xl space-y-1.5 mt-2">
                            <Label className="text-xs font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-orange-500" />
                                Hedef Trendyol Kategorisi ({selectedProduct.categories.filter((c: any) => c.trendyolCategoryId !== null).length} Eşleşen Kategori)
                            </Label>
                            <Select 
                                value={selectedCategoryId?.toString()} 
                                onValueChange={(val) => handleCategoryChange(Number(val))}
                            >
                                <SelectTrigger className="bg-white dark:bg-gray-900 border-orange-200 text-xs h-9">
                                    <SelectValue placeholder="Kategori seçiniz..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedProduct.categories
                                        .filter((c: any) => c.trendyolCategoryId !== null)
                                        .map((c: any) => (
                                            <SelectItem key={c.trendyolCategoryId} value={c.trendyolCategoryId.toString()} className="text-xs">
                                                {c.name} {c.parentId ? "(Alt Kategori)" : ""} - #{c.trendyolCategoryId}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {attrLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <RefreshCcw className="w-10 h-10 animate-spin text-orange-500" />
                            <p className="text-sm text-muted-foreground animate-pulse">Trendyol V2 kategori özellikleri yükleniyor...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            {categoryAttrs.length === 0 && (
                                <div className="text-center py-2 bg-muted/40 rounded-xl">
                                    <p className="text-xs text-muted-foreground">Bu kategori için özel nitelik bulunamadı. Aşağıdaki zorunlu bilgileri kontrol edip devam edebilirsiniz.</p>
                                </div>
                            )}

                            {/* Temel ve Kategori Bazlı Özellikler (Arama Kutulu Seçim) */}
                            {primaryAttrs.map((attr: any) => {
                                const attrId = attr.attribute.id;
                                return (
                                    <div key={attrId} className="space-y-1.5">
                                        <Label className="flex items-center justify-between text-xs font-medium">
                                            <span className="flex items-center gap-1">
                                                {attr.attribute.name}
                                                {attr.required && <span className="text-red-500 font-bold">*</span>}
                                            </span>
                                            {attr.attributeValues && attr.attributeValues.length > 0 && (
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {attr.attributeValues.length} seçenek
                                                </span>
                                            )}
                                        </Label>
                                        
                                        <AttributeSearchableSelect
                                            attributeId={attrId}
                                            attributeName={attr.attribute.name}
                                            required={attr.required}
                                            allowCustom={attr.allowCustom}
                                            values={attr.attributeValues || []}
                                            value={attrMappings[attrId]}
                                            onChange={(val) => setAttrMappings((prev: any) => ({ ...prev, [attrId]: val }))}
                                            placeholder={`${attr.attribute.name} seçin veya arayın...`}
                                        />
                                    </div>
                                );
                            })}

                            {/* Her zaman gereken zorunlu metin alanları */}
                            <div className="border-t pt-3 mt-3">
                                <p className="text-xs font-semibold text-orange-600 mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    Zorunlu İthalatçı & Kullanım Bilgileri
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center gap-1 text-xs">
                                            Birincil İthalatçı Adı <span className="text-red-500">*</span>
                                        </Label>
                                        <Input 
                                            placeholder="Örn: Serin Motor" 
                                            value={attrMappings[1216] || ""}
                                            className="h-9 text-xs focus-visible:ring-orange-500"
                                            onChange={(e) => setAttrMappings((prev: any) => ({ ...prev, 1216: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="flex items-center gap-1 text-xs">
                                            Kullanım Talimatı / Uyarılar <span className="text-red-500">*</span>
                                        </Label>
                                        <Input 
                                            placeholder="Örn: Ustanıza danışınız." 
                                            value={attrMappings[1116] || ""}
                                            className="h-9 text-xs focus-visible:ring-orange-500"
                                            onChange={(e) => setAttrMappings((prev: any) => ({ ...prev, 1116: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* İsteğe Bağlı GPSR ve Ek Üretici Alanları (Akordiyon İçinde) */}
                            {optionalGpsrAttrs.length > 0 && (
                                <Accordion type="single" collapsible className="border rounded-2xl px-3 bg-gray-50/50 dark:bg-gray-800/30">
                                    <AccordionItem value="gpsr-section" className="border-none">
                                        <AccordionTrigger className="py-2.5 text-xs text-muted-foreground hover:text-foreground">
                                            <span>GPSR & İthalatçı / Üretici Ek Bilgileri (İsteğe Bağlı - {optionalGpsrAttrs.length} Alan)</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 space-y-3">
                                            {optionalGpsrAttrs.map((attr: any) => {
                                                const attrId = attr.attribute.id;
                                                return (
                                                    <div key={attrId} className="space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground">
                                                            {attr.attribute.name}
                                                        </Label>
                                                        <AttributeSearchableSelect
                                                            attributeId={attrId}
                                                            attributeName={attr.attribute.name}
                                                            required={false}
                                                            allowCustom={attr.allowCustom}
                                                            values={attr.attributeValues || []}
                                                            value={attrMappings[attrId]}
                                                            onChange={(val) => setAttrMappings((prev: any) => ({ ...prev, [attrId]: val }))}
                                                            placeholder={`${attr.attribute.name} girin veya seçin...`}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                        <Button variant="ghost" onClick={() => setShowAttrModal(false)}>İptal</Button>
                        <Button 
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20" 
                            onClick={handleSend} 
                            disabled={loadingProductId !== null || attrLoading}
                        >
                            {loadingProductId ? "Gönderiliyor..." : "Trendyol V2'ye Gönder"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
