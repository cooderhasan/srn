"use client";

import { useState, useEffect } from "react";
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
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory, toggleCategoryStatus, updateCategoriesSidebarOrder, updateCategoriesHeaderOrder } from "@/app/admin/(protected)/categories/actions";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
    order: number;
    isActive: boolean;
    createdAt: Date;
    parentId?: string | null;
    imageUrl?: string | null;
    menuImageUrl?: string | null;
    isInHeader: boolean;
    headerOrder: number;
    isFeatured: boolean;
    trendyolCategoryId?: number | null;
    n11CategoryId?: number | null;
    hbCategoryId?: string | null;
    googleProductCategory?: string | null;
    parent?: {
        name: string;
    } | null;
    _count: {
        products: number;
    };
}

interface SortableRowProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string, isActive: boolean) => void;
    reorderMode: "none" | "sidebar" | "header";
}

function SortableRow({ category, onEdit, onDelete, onToggleStatus, reorderMode }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: "relative" as const,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell className="w-[80px]">
                {reorderMode !== "none" ? (
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>
                ) : (
                    category.order
                )}
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{category.name}</span>
                    {category.parent && (
                        <span className="text-xs text-gray-400">
                            ↳ {category.parent.name}
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-gray-500">{category.slug}</TableCell>
            <TableCell>
                {reorderMode === "header" ? (
                    <Badge variant={category.isInHeader ? "default" : "secondary"}>
                        {category.isInHeader ? "Üst Menüde" : "Değil"}
                    </Badge>
                ) : (
                    <Badge variant="secondary">
                        {category._count.products} ürün
                    </Badge>
                )}
            </TableCell>
            <TableCell>
                <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) =>
                        onToggleStatus(category.id, checked)
                    }
                    disabled={reorderMode !== "none"}
                />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(category)}
                        disabled={reorderMode !== "none"}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onDelete(category.id)}
                        disabled={reorderMode !== "none" || category._count.products > 0}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

interface CategoriesTableProps {
    categories: Category[];
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function CategoriesTable({ categories }: CategoriesTableProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [order, setOrder] = useState(0);
    const [isInHeader, setIsInHeader] = useState(false);
    const [headerOrder, setHeaderOrder] = useState(0);
    const [parentId, setParentId] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState("");
    const [menuImageUrl, setMenuImageUrl] = useState("");
    const [isFeatured, setIsFeatured] = useState(false);
    const [trendyolCategoryId, setTrendyolCategoryId] = useState<number | undefined>(undefined);
    const [n11CategoryId, setN11CategoryId] = useState<number | undefined>(undefined);
    const [hbCategoryId, setHbCategoryId] = useState<string | undefined>(undefined);
    const [googleProductCategory, setGoogleProductCategory] = useState<string | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [reorderMode, setReorderMode] = useState<"none" | "sidebar" | "header">("none");
    const [localCategories, setLocalCategories] = useState<Category[]>(categories);

    // Sync local state when server data updates
    useEffect(() => {
        setLocalCategories(categories);
    }, [categories]);

    const ITEMS_PER_PAGE = reorderMode === "none" ? 10 : 1000; // Show all when reordering

    // Filter categories based on search
    const filteredCategories = localCategories.filter(category => {
        if (reorderMode === "header" && !category.isInHeader && !searchTerm) return false;

        return category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (category.parent?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.slug.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Sort based on mode
    const sortedCategories = [...filteredCategories].sort((a, b) => {
        if (reorderMode === "header") return a.headerOrder - b.headerOrder;
        return a.order - b.order;
    });

    // Pagination logic
    const totalPages = Math.ceil(sortedCategories.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCategories = sortedCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
            const newIndex = sortedCategories.findIndex((c) => c.id === over.id);

            const newArray = arrayMove(sortedCategories, oldIndex, newIndex);

            // Update local state first for immediate UI response
            const updatedLocal = localCategories.map(cat => {
                const index = newArray.findIndex(n => n.id === cat.id);
                if (index !== -1) {
                    return {
                        ...cat,
                        [reorderMode === "sidebar" ? "order" : "headerOrder"]: index
                    };
                }
                return cat;
            });
            setLocalCategories(updatedLocal);

            try {
                if (reorderMode === "sidebar") {
                    const updates = newArray.map((cat, index) => ({
                        id: cat.id,
                        order: index
                    }));
                    await updateCategoriesSidebarOrder(updates);
                } else if (reorderMode === "header") {
                    const updates = newArray.map((cat, index) => ({
                        id: cat.id,
                        headerOrder: index
                    }));
                    await updateCategoriesHeaderOrder(updates);
                }
                toast.success("Sıralama güncellendi.");
            } catch {
                toast.error("Sıralama kaydedilirken bir hata oluştu.");
                setLocalCategories(categories); // Rollback
            }
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setImageUrl(data.url);
            toast.success("Resim yüklendi");
        } catch {
            toast.error("Resim yüklenirken hata oluştu");
        } finally {
            setUploading(false);
        }
    };

    const handleMenuImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setMenuImageUrl(data.url);
            toast.success("Mega menü görseli yüklendi");
        } catch {
            toast.error("Resim yüklenirken hata oluştu");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editCategory) {
                await updateCategory(editCategory.id, {
                    name,
                    slug,
                    order,
                    parentId: parentId || null,
                    imageUrl,
                    menuImageUrl,
                    isFeatured,
                    isInHeader,
                    headerOrder,
                    trendyolCategoryId,
                    n11CategoryId,
                    hbCategoryId,
                    googleProductCategory
                });
                toast.success("Kategori güncellendi.");
            } else {
                await createCategory({
                    name,
                    slug,
                    order,
                    parentId: parentId || null,
                    imageUrl,
                    menuImageUrl,
                    isFeatured,
                    isInHeader,
                    headerOrder,
                    trendyolCategoryId,
                    n11CategoryId,
                    hbCategoryId,
                    googleProductCategory
                });
                toast.success("Kategori oluşturuldu.");
            }
            setIsOpen(false);
            resetForm();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;

        try {
            await deleteCategory(id);
            toast.success("Kategori silindi.");
        } catch {
            toast.error("Bir hata oluştu.");
        }
    };

    const handleToggleStatus = async (id: string, isActive: boolean) => {
        try {
            await toggleCategoryStatus(id, isActive);
            toast.success(isActive ? "Kategori aktifleştirildi." : "Kategori pasifleştirildi.");
        } catch {
            toast.error("Bir hata oluştu.");
        }
    };


    const resetForm = () => {
        setName("");
        setSlug("");
        setOrder(0);
        setIsInHeader(false);
        setHeaderOrder(0);
        setParentId(null);
        setImageUrl("");
        setMenuImageUrl("");
        setIsFeatured(false);
        setTrendyolCategoryId(undefined);
        setN11CategoryId(undefined);
        setHbCategoryId(undefined);
        setGoogleProductCategory(undefined);
        setEditCategory(null);
    };

    const openEditDialog = (category: Category) => {
        setEditCategory(category);
        setName(category.name);
        setSlug(category.slug);
        setOrder(category.order);
        setIsInHeader(category.isInHeader);
        setHeaderOrder(category.headerOrder);
        setParentId(category.parentId || null);
        setImageUrl(category.imageUrl || "");
        setMenuImageUrl(category.menuImageUrl || "");
        setIsFeatured(category.isFeatured);
        setTrendyolCategoryId(category.trendyolCategoryId ?? undefined);
        setN11CategoryId(category.n11CategoryId ?? undefined);
        setHbCategoryId(category.hbCategoryId ?? undefined);
        setGoogleProductCategory(category.googleProductCategory ?? undefined);
        setIsOpen(true);
    };

    const openNewDialog = () => {
        resetForm();
        setIsOpen(true);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-72">
                        <Input
                            placeholder="Kategori Ara..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-8"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <Button
                            variant={reorderMode === "none" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setReorderMode("none")}
                        >
                            Liste
                        </Button>
                        <Button
                            variant={reorderMode === "sidebar" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setReorderMode("sidebar")}
                        >
                            Yan Menü Sırası
                        </Button>
                        <Button
                            variant={reorderMode === "header" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setReorderMode("header")}
                        >
                            Üst Menü Sırası
                        </Button>
                    </div>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Yeni Kategori
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editCategory ? "Kategori Düzenle" : "Yeni Kategori"}
                            </DialogTitle>
                            <DialogDescription>
                                Kategori bilgilerini girin
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Kategori Adı</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (!editCategory) {
                                                setSlug(slugify(e.target.value));
                                            }
                                        }}
                                        placeholder="Örn: Temizlik Ürünleri"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="slug">URL Slug</Label>
                                    <Input
                                        id="slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="temizlik-urunleri"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="trendyolCategoryId" className="text-orange-600">Trendyol Kategori ID</Label>
                                    <Input
                                        id="trendyolCategoryId"
                                        type="number"
                                        value={trendyolCategoryId || ""}
                                        onChange={(e) => setTrendyolCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Örn: 1234"
                                        className="border-orange-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="n11CategoryId" className="text-purple-600">N11 Kategori ID</Label>
                                    <Input
                                        id="n11CategoryId"
                                        type="number"
                                        value={n11CategoryId || ""}
                                        onChange={(e) => setN11CategoryId(e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Örn: 10001"
                                        className="border-purple-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hbCategoryId" className="text-orange-600">Hepsiburada Kategori ID</Label>
                                    <Input
                                        id="hbCategoryId"
                                        value={hbCategoryId || ""}
                                        onChange={(e) => setHbCategoryId(e.target.value)}
                                        placeholder="Örn: telefon-kiliflari"
                                        className="border-orange-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="googleProductCategory" className="text-blue-600">Google Ürün Kategorisi (Taxonomy)</Label>
                                    <Input
                                        id="googleProductCategory"
                                        value={googleProductCategory || ""}
                                        onChange={(e) => setGoogleProductCategory(e.target.value)}
                                        placeholder="Örn: Araçlar ve Motorlu Taşıtlar > Araç Parçaları ve Aksesuarları"
                                        className="border-blue-200"
                                    />
                                    <p className="text-[10px] text-gray-500">
                                        Google Merchant Center için geçerli taksonomi yolunu tam olarak girin.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="order">Sıralama</Label>
                                    <Input
                                        id="order"
                                        type="number"
                                        value={order}
                                        onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Üst Kategori</Label>
                                    <Select
                                        value={parentId || "root"}
                                        onValueChange={(value) => setParentId(value === "root" ? null : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Üst Kategori Seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="root">Ana Kategori</SelectItem>
                                            {categories
                                                .filter(c => c.id !== editCategory?.id) // Prevent self-parenting
                                                .map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Kategori Görseli</Label>
                                    <div className="flex items-center gap-4">
                                        {imageUrl && (
                                            <div className="relative w-16 h-16 border rounded-md overflow-hidden">
                                                <img src={imageUrl} alt="Kategori" className="object-cover w-full h-full" />
                                                <button
                                                    type="button"
                                                    onClick={() => setImageUrl("")}
                                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mega Menü Görseli</Label>
                                    <div className="flex items-center gap-4">
                                        {menuImageUrl && (
                                            <div className="relative w-16 h-16 border rounded-md overflow-hidden">
                                                <img src={menuImageUrl} alt="Mega Menü" className="object-cover w-full h-full" />
                                                <button
                                                    type="button"
                                                    onClick={() => setMenuImageUrl("")}
                                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleMenuImageUpload}
                                            disabled={uploading}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="featured"
                                            checked={isFeatured}
                                            onCheckedChange={setIsFeatured}
                                        />
                                        <Label htmlFor="featured">Ana Sayfada Göster</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="inHeader"
                                            checked={isInHeader}
                                            onCheckedChange={setIsInHeader}
                                        />
                                        <Label htmlFor="inHeader">Üst Menüde Göster</Label>
                                    </div>
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

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="rounded-lg border bg-white dark:bg-gray-800">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sıra</TableHead>
                                <TableHead>Kategori Adı</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Ürün Sayısı</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        {searchTerm ? "Sonuç bulunamadı." : "Henüz kategori bulunmuyor."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <SortableContext
                                    items={paginatedCategories.map((c) => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {paginatedCategories.map((category) => (
                                        <SortableRow
                                            key={category.id}
                                            category={category}
                                            onEdit={openEditDialog}
                                            onDelete={handleDelete}
                                            onToggleStatus={handleToggleStatus}
                                            reorderMode={reorderMode}
                                        />
                                    ))}
                                </SortableContext>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DndContext>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Önceki
                    </Button>
                    <div className="text-sm font-medium">
                        Sayfa {currentPage} / {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Sonraki
                    </Button>
                </div>
            )}
        </>
    );
}
