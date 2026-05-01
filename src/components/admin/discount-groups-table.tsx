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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDiscountGroup, updateDiscountGroup, deleteDiscountGroup } from "@/app/admin/(protected)/discount-groups/actions";

interface DiscountGroup {
    id: string;
    name: string;
    discountRate: number | { toNumber(): number };
    isActive: boolean;
    createdAt: Date;
    _count: {
        users: number;
    };
}

interface DiscountGroupsTableProps {
    groups: DiscountGroup[];
}

export function DiscountGroupsTable({ groups }: DiscountGroupsTableProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editGroup, setEditGroup] = useState<DiscountGroup | null>(null);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [discountRate, setDiscountRate] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editGroup) {
                await updateDiscountGroup(editGroup.id, { name, discountRate });
                toast.success("İskonto grubu güncellendi.");
            } else {
                await createDiscountGroup({ name, discountRate });
                toast.success("İskonto grubu oluşturuldu.");
            }
            setIsOpen(false);
            resetForm();
        } catch {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu iskonto grubunu silmek istediğinize emin misiniz?")) return;

        try {
            await deleteDiscountGroup(id);
            toast.success("İskonto grubu silindi.");
        } catch {
            toast.error("Bir hata oluştu.");
        }
    };

    const resetForm = () => {
        setName("");
        setDiscountRate(0);
        setEditGroup(null);
    };

    const openEditDialog = (group: DiscountGroup) => {
        setEditGroup(group);
        setName(group.name);
        const rate = typeof group.discountRate === "number"
            ? group.discountRate
            : group.discountRate.toNumber();
        setDiscountRate(rate);
        setIsOpen(true);
    };

    const openNewDialog = () => {
        resetForm();
        setIsOpen(true);
    };

    const getRate = (rate: number | { toNumber(): number }) => {
        return typeof rate === "number" ? rate : rate.toNumber();
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Yeni Grup
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editGroup ? "Grup Düzenle" : "Yeni İskonto Grubu"}
                            </DialogTitle>
                            <DialogDescription>
                                İskonto grubu bilgilerini girin
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Grup Adı</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Örn: VIP Bayi"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discountRate">İskonto Oranı (%)</Label>
                                    <Input
                                        id="discountRate"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={discountRate}
                                        onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                        required
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
                            <TableHead>Grup Adı</TableHead>
                            <TableHead>İskonto Oranı</TableHead>
                            <TableHead>Bayi Sayısı</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    Henüz iskonto grubu bulunmuyor.
                                </TableCell>
                            </TableRow>
                        ) : (
                            groups.map((group) => (
                                <TableRow key={group.id}>
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            %{getRate(group.discountRate)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{group._count.users} bayi</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditDialog(group)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => handleDelete(group.id)}
                                                disabled={group._count.users > 0}
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
