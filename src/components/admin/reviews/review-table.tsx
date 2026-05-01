"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Star, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateReviewStatus } from "@/app/actions/review";
import { toast } from "sonner";
import Image from "next/image";

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: Date;
    user: {
        companyName: string | null;
        email: string | null;
    };
    product: {
        name: string;
        slug: string;
        images: string[];
    };
}

interface ReviewTableProps {
    initialReviews: Review[];
}

export function ReviewTable({ initialReviews }: ReviewTableProps) {
    const [reviews, setReviews] = useState(initialReviews);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleStatusUpdate = async (id: string, newStatus: "APPROVED" | "REJECTED") => {
        setLoadingId(id);
        const result = await updateReviewStatus(id, newStatus);

        if (result.success) {
            toast.success(`Yorum ${newStatus === "APPROVED" ? "onaylandı" : "reddedildi"}.`);
            // Optimistic update or refetch? RevalidatePath refreshes the page, but client state might lag.
            // Since page revalidates, we rely on router refresh ideally, but simple state update here:
            setReviews(reviews.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } else {
            toast.error(result.error || "İşlem başarısız.");
        }
        setLoadingId(null);
    };

    return (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                    <tr>
                        <th className="px-6 py-4">Ürün</th>
                        <th className="px-6 py-4">Kullanıcı</th>
                        <th className="px-6 py-4">Puan & Yorum</th>
                        <th className="px-6 py-4">Durum</th>
                        <th className="px-6 py-4 text-right">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y text-gray-700 dark:text-gray-300">
                    {reviews.map((review) => (
                        <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                        {review.product.images[0] && (
                                            <Image
                                                src={review.product.images[0]}
                                                alt={review.product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="max-w-[200px]">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={review.product.name}>
                                            {review.product.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDistanceToNow(review.createdAt, { addSuffix: true, locale: tr })}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-medium">{review.user.companyName || "İsimsiz"}</div>
                                <div className="text-xs text-gray-500">{review.user.email}</div>
                            </td>
                            <td className="px-6 py-4 max-w-[300px]">
                                <div className="flex items-center gap-1 mb-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-3.5 h-3.5 ${review.rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 line-clamp-2" title={review.comment || ""}>
                                    {review.comment || "Yorum yok"}
                                </p>
                            </td>
                            <td className="px-6 py-4">
                                <Badge
                                    variant="secondary"
                                    className={
                                        review.status === "APPROVED" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                            review.status === "REJECTED" ? "bg-red-100 text-red-700 hover:bg-red-100" :
                                                "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                    }
                                >
                                    {review.status === "APPROVED" ? "Onaylandı" :
                                        review.status === "REJECTED" ? "Reddedildi" :
                                            "Bekliyor"}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {review.status !== "APPROVED" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                            onClick={() => handleStatusUpdate(review.id, "APPROVED")}
                                            disabled={loadingId === review.id}
                                            title="Onayla"
                                        >
                                            {loadingId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        </Button>
                                    )}
                                    {review.status !== "REJECTED" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            onClick={() => handleStatusUpdate(review.id, "REJECTED")}
                                            disabled={loadingId === review.id}
                                            title="Reddet"
                                        >
                                            {loadingId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {reviews.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-12 text-gray-500">
                                Gösterilecek yorum bulunamadı.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
