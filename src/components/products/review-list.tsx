import { Star, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: {
        name: string | null;
        image: string | null;
    };
}

interface ReviewListProps {
    reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                Henüz değerlendirme yapılmamış. İlk değerlendirmeyi siz yapın!
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 dark:border-gray-800 pb-6 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                {review.user.image ? (
                                    <img src={review.user.image} alt={review.user.name || "Kullanıcı"} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {review.user.name ? review.user.name[0] + "***" + review.user.name.slice(-1) : "İsimsiz Kullanıcı"}
                                </p>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                "w-3 h-3",
                                                review.rating >= star
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-gray-200 dark:text-gray-700"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: tr })}
                        </span>
                    </div>
                    {review.comment && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mt-2 pl-12">
                            {review.comment}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
