"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
    value: string[];
    onChange: (value: string[]) => void;
    onRemove: (value: string) => void;
    disabled?: boolean;
    maxFiles?: number;
}

export function ImageUpload({
    value,
    onChange,
    onRemove,
    disabled,
    maxFiles = 1
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    // Generate a fallback unique ID if relying on random isn't enough, but passing an id prop is better.
    // However, since we don't want to change the API everywhere, we can construct one or use useId if available.
    // Let's use a simple random string for now to avoid React version issues if useId isn't available,
    // though Next.js 13+ definitely has it. Let's assume useId is fine.

    // Actually, I'll use a simple approach to avoid imports if I can't verify React version easily, 
    // but standard React hooks are safer. 
    // Let's stick to modifying the imports too.
    const uniqueId = "upload-" + Math.random().toString(36).substr(2, 9);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const newImages: string[] = [];

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    newImages.push(data.url);
                } else {
                    console.error("Upload failed");
                }
            } catch (error) {
                console.error("Upload error", error);
            }
        }

        onChange([...value, ...newImages]);
        setUploading(false);
        e.target.value = ""; // Reset input
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                {value.map((url) => (
                    <div key={url} className="relative w-[200px] h-[200px] rounded-md overflow-hidden border">
                        <div className="z-10 absolute top-2 right-2">
                            <Button
                                type="button"
                                onClick={() => onRemove(url)}
                                variant="destructive"
                                size="icon"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <Image
                            fill
                            className="object-cover"
                            alt="Image"
                            src={url}
                        />
                    </div>
                ))}
            </div>
            {value.length < maxFiles && (
                <div className="flex items-center gap-4">
                    <Label
                        htmlFor={uniqueId}
                        className={`
                            cursor-pointer
                            flex flex-col items-center justify-center
                            w-[200px] h-[200px]
                            border-2 border-dashed border-gray-300 rounded-md
                            hover:bg-gray-50 transition-colors
                            ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Görsel Yükle</p>
                                </>
                            )}
                        </div>
                        <Input
                            id={uniqueId}
                            type="file"
                            accept="image/*"
                            multiple={maxFiles > 1}
                            className="hidden"
                            onChange={handleUpload}
                            disabled={disabled || uploading}
                        />
                    </Label>
                </div>
            )}
        </div>
    );
}
