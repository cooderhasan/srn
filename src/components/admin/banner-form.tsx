"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { createBanner, updateBanner } from "@/app/admin/(protected)/banners/actions";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

// Define local interface to avoid build issues with prisma client generation
interface Banner {
    id: string;
    title: string | null;
    linkUrl: string | null;
    imageUrl: string;
    isActive: boolean;
    order: number;
}

const formSchema = z.object({
    title: z.string().optional().or(z.literal("")),
    linkUrl: z.string().optional().or(z.literal("")),
    imageUrl: z.string().min(1, "Görsel zorunludur."),
    isActive: z.boolean().default(true),
    order: z.coerce.number().default(0),
});

type BannerFormValues = z.infer<typeof formSchema>;

interface BannerFormProps {
    initialData?: any; // Use any or a custom type to avoid prisma client export issues during build
    onSuccess: () => void;
}

export function BannerForm({ initialData, onSuccess }: BannerFormProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            linkUrl: initialData?.linkUrl || "",
            imageUrl: initialData?.imageUrl || "",
            isActive: initialData?.isActive ?? true,
            order: initialData?.order ?? 0,
        },
    });

    const onSubmit = async (values: BannerFormValues) => {
        setLoading(true);
        try {
            if (initialData) {
                // Update
                const result = await updateBanner(initialData.id, values);
                if (result.success) {
                    toast.success("Banner güncellendi.");
                    onSuccess();
                } else {
                    toast.error(result.error);
                }
            } else {
                // Create
                const result = await createBanner(values);
                if (result.success) {
                    toast.success("Banner eklendi.");
                    onSuccess();
                } else {
                    toast.error(result.error);
                }
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Görsel</FormLabel>
                            <FormControl>
                                <ImageUpload
                                    value={field.value ? [field.value] : []}
                                    onChange={(urls) => field.onChange(urls[0] || "")}
                                    onRemove={() => field.onChange("")}
                                />
                            </FormControl>
                            <FormDescription>
                                Önerilen boyut: 800x600px.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Başlık (Opsiyonel)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Kampanya vb." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="order"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sıra</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        value={field.value as any}
                                        onChange={(e) => field.onChange(e.target.value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="linkUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Yönlendirilecek Link (Opsiyonel)</FormLabel>
                            <FormControl>
                                <Input placeholder="/kategori/yaz-sezonu" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Aktif</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Kaydediliyor..." : initialData ? "Güncelle" : "Oluştur"}
                </Button>
            </form>
        </Form>
    );
}
