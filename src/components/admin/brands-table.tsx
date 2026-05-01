"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createBrand, updateBrand, deleteBrand } from "@/app/admin/(protected)/brands/actions";

interface Brand {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isActive: boolean;
    trendyolBrandId?: number | null;
    n11BrandId?: number | null;
    hbBrandId?: string | null;
    createdAt: Date;
    _count: {
        products: number;
    };
}

interface BrandsTableProps {
    brands: Brand[];
}

export function BrandsTable({ brands }: BrandsTableProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editBrand, setEditBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [trendyolBrandId, setTrendyolBrandId] = useState<number | undefined>(undefined);
    const [n11BrandId, setN11BrandId] = useState<number | undefined>(undefined);
    const [hbBrandId, setHbBrandId] = useState<string | undefined>(undefined);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editBrand) {
                await updateBrand(editBrand.id, { name, logoUrl: logoUrl || undefined, trendyolBrandId, n11BrandId, hbBrandId });
                toast.success("Marka güncellendi.");
            } else {
                await createBrand({ name, logoUrl: logoUrl || undefined, trendyolBrandId, n11BrandId, hbBrandId });
                toast.success("Marka oluşturuldu.");
            }
            setIsOpen(false);
            resetForm();
        } catch {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // ... existing code ...

    const resetForm = () => {
        setName("");
        setLogoUrl("");
        setTrendyolBrandId(undefined);
        setN11BrandId(undefined);
        setHbBrandId(undefined);
        setEditBrand(null);
    };

    const openEditDialog = (brand: Brand) => {
        setEditBrand(brand);
        setName(brand.name);
        setLogoUrl(brand.logoUrl || "");
        setTrendyolBrandId(brand.trendyolBrandId ?? undefined);
        setN11BrandId(brand.n11BrandId ?? undefined);
        setHbBrandId(brand.hbBrandId ?? undefined);
        setIsOpen(true);
    };

    const openNewDialog = () => {
        resetForm();
        setIsOpen(true);
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateBrand(id, { isActive: currentStatus });
            toast.success("Marka durumu güncellendi.");
        } catch {
            toast.error("Durum güncellenemedi.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu markayı silmek istediğinize emin misiniz?")) return;

        try {
            await deleteBrand(id);
            toast.success("Marka silindi.");
        } catch {
            toast.error("Silme işlemi başarısız.");
        }
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Yeni Marka
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editBrand ? "Marka Düzenle" : "Yeni Marka"}
                            </DialogTitle>
                            <DialogDescription>
                                Marka bilgilerini girin
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Marka Adı</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Örn: Apple"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="logoUrl">Logo URL (Opsiyonel)</Label>
                                    <Input
                                        id="logoUrl"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="trendyolBrandId" className="text-orange-600">Trendyol Marka ID</Label>
                                    <Input
                                        id="trendyolBrandId"
                                        type="number"
                                        value={trendyolBrandId || ""}
                                        onChange={(e) => setTrendyolBrandId(e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Örn: 153"
                                        className="border-orange-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="n11BrandId" className="text-purple-600">N11 Marka ID</Label>
                                    <Input
                                        id="n11BrandId"
                                        type="number"
                                        value={n11BrandId || ""}
                                        onChange={(e) => setN11BrandId(e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Örn: 105"
                                        className="border-purple-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hbBrandId" className="text-orange-600">Hepsiburada Marka</Label>
                                    <Input
                                        id="hbBrandId"
                                        value={hbBrandId || ""}
                                        onChange={(e) => setHbBrandId(e.target.value)}
                                        placeholder="Örn: Samsung"
                                        className="border-orange-200"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    İptal
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Kaydediliyor..." : "Kaydet"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-lg border bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Logo</TableHead>
                            <TableHead>Marka Adı</TableHead>
                            <TableHead>Ürün Sayısı</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {brands.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    Henüz marka bulunmuyor.
                                </TableCell>
                            </TableRow>
                        ) : (
                            brands.map((brand) => (
                                <TableRow key={brand.id}>
                                    <TableCell>
                                        {brand.logoUrl ? (
                                            <img
                                                src={brand.logoUrl}
                                                alt={brand.name}
                                                className="h-10 w-10 object-contain rounded"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                                                Logo
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{brand.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {brand._count.products} ürün
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={brand.isActive}
                                            onCheckedChange={(checked) =>
                                                handleToggleStatus(brand.id, checked)
                                            }
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditDialog(brand)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => handleDelete(brand.id)}
                                                disabled={brand._count.products > 0}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
