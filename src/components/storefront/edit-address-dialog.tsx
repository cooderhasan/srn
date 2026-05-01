"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateAddress } from "@/app/(storefront)/account/actions";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { getCities, getDistrictsOfCity } from "@/lib/cities";

interface EditAddressDialogProps {
    initialData: {
        address?: string | null;
        city?: string | null;
        district?: string | null;
        phone?: string | null;
    };
}

export function EditAddressDialog({ initialData }: EditAddressDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>(initialData.city || "");
    const [selectedDistrict, setSelectedDistrict] = useState<string>(initialData.district || "");
    const cities = getCities();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const result = await updateAddress(formData);
        setLoading(false);

        if (result.success) {
            toast.success("Adres başarıyla güncellendi.");
            setOpen(false);
        } else {
            toast.error(result.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                    <Pencil className="w-3 h-3 mr-2" />
                    Düzenle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adres Düzenle</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">Şehir</Label>
                        <Select
                            name="city"
                            required
                            value={selectedCity}
                            onValueChange={(val) => {
                                setSelectedCity(val);
                                setSelectedDistrict("");
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Şehir seçiniz" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {cities.map((c) => (
                                    <SelectItem key={c.name} value={c.name}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="district">İlçe</Label>
                        <Select
                            name="district"
                            value={selectedDistrict}
                            onValueChange={setSelectedDistrict}
                            disabled={!selectedCity}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="İlçe seçiniz" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {selectedCity &&
                                    getDistrictsOfCity(selectedCity).map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Adres</Label>
                        <Textarea
                            id="address"
                            name="address"
                            defaultValue={initialData.address || ""}
                            required
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                            id="phone"
                            name="phone"
                            defaultValue={initialData.phone || ""}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
