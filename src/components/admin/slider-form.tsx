"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSlider, updateSlider } from "@/app/admin/(protected)/sliders/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SliderFormProps {
    initialData?: {
        id: string;
        title?: string | null;
        subtitle?: string | null;
        imageUrl: string;
        linkUrl?: string | null;
        order: number;
        isActive: boolean;
    };
    onSuccess?: () => void;
}

export function SliderForm({ initialData, onSuccess }: SliderFormProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState(initialData?.title || "");
    const [subtitle, setSubtitle] = useState(initialData?.subtitle || "");
    const [linkUrl, setLinkUrl] = useState(initialData?.linkUrl || "");
    const [order, setOrder] = useState(initialData?.order || 0);
    const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);
    const [images, setImages] = useState<string[]>(initialData?.imageUrl ? [initialData.imageUrl] : []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (images.length === 0) {
            toast.error("Lütfen bir görsel yükleyin.");
            return;
        }

        setLoading(true);
        const data = {
            title,
            subtitle,
            linkUrl,
            order: Number(order),
            isActive,
            imageUrl: images[0],
        };

        try {
            let result;
            if (initialData) {
                result = await updateSlider(initialData.id, data);
            } else {
                result = await createSlider(data);
            }

            if (result.success) {
                toast.success(initialData ? "Slider güncellendi." : "Slider oluşturuldu.");
                if (onSuccess) onSuccess();
            } else {
                toast.error(result.error || "Bir hata oluştu.");
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label>Görsel (Zorunlu)</Label>
                <ImageUpload
                    value={images}
                    onChange={(urls) => setImages(urls)}
                    onRemove={(url) => setImages(images.filter((i) => i !== url))}
                    maxFiles={1}
                    disabled={loading}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Başlık</Label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Slider Başlığı (Opsiyonel)"
                        disabled={loading}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Alt Başlık</Label>
                    <Input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Alt Başlık (Opsiyonel)"
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="/urunler/yeni-sezon"
                        disabled={loading}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Sıralama</Label>
                    <Input
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(Number(e.target.value))}
                        disabled={loading}
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    id="is-active"
                    disabled={loading}
                />
                <Label htmlFor="is-active">Aktif</Label>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Güncelle" : "Oluştur"}
            </Button>
        </form>
    );
}
