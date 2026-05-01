"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleWishlist, getWishlistStatus } from "@/app/actions/wishlist";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface WishlistButtonProps {
    productId: string;
    variant?: "default" | "icon" | "full";
    className?: string;
}

export function WishlistButton({ productId, variant = "default", className }: WishlistButtonProps) {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session?.user) {
            getWishlistStatus(productId).then(setIsWishlisted).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [productId, session]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!session?.user) {
            toast.error("Favorilere eklemek için giriş yapmalısınız.");
            router.push("/login");
            return;
        }

        setIsLoading(true);
        // Optimistic update
        setIsWishlisted((prev) => !prev);

        const result = await toggleWishlist(productId);

        if (!result.success) {
            toast.error(result.error);
            setIsWishlisted((prev) => !prev); // Revert
        } else {
            if (result.isWishlisted) {
                toast.success("Ürün favorilere eklendi.");
            } else {
                toast.success("Ürün favorilerden çıkarıldı.");
            }
        }
        setIsLoading(false);
    };

    if (variant === "icon") {
        return (
            <button
                onClick={handleToggle}
                disabled={isLoading}
                className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                    isWishlisted ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-600",
                    className
                )}
                aria-label={isWishlisted ? "Favorilerden çıkar" : "Favorilere ekle"}
            >
                <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
            </button>
        );
    }

    if (variant === "full") {
        return (
            <button
                onClick={handleToggle}
                disabled={isLoading}
                className={cn(
                    "flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-medium transition-colors border",
                    isWishlisted
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900",
                    className
                )}
            >
                <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
                {isWishlisted ? "Favorilerde" : "Favorilere Ekle"}
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                isWishlisted ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-gray-700",
                className
            )}
        >
            <Heart className={cn("w-4 h-4", isWishlisted && "fill-current")} />
            {isWishlisted ? "Favorilerden Çıkar" : "Favorilere Ekle"}
        </button>
    );
}
