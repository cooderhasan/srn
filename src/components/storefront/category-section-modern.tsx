import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
}

interface CategorySectionProps {
    categories: Category[];
}

export function CategorySectionModern({ categories }: CategorySectionProps) {
    if (!categories || categories.length === 0) return null;

    const topRow = categories.slice(0, 2);
    const bottomRow = categories.slice(2, 5);

    return (
        <section className="container mx-auto px-4">
            <div className="space-y-4">
                {/* Top Row: 2 Large Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {topRow.map((category) => (
                        <Link
                            key={category.id}
                            href={`/category/${category.slug}`}
                            className="relative h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden group block ring-1 ring-black/5 dark:ring-white/10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                        >
                            {category.imageUrl ? (
                                <Image
                                    src={category.imageUrl}
                                    alt={category.name}
                                    fill
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                    sizes="(max-width: 640px) 100vw, 50vw"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                            )}
                            {/* Gradient overlay with brand blue tint */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#002838]/80 via-[#002838]/20 to-transparent group-hover:from-[#002838]/70 transition-all duration-300" />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                                <h3 className="text-white font-bold text-lg sm:text-xl drop-shadow-lg mb-1">
                                    {category.name}
                                </h3>
                                <div className="flex items-center gap-1.5 text-white/0 group-hover:text-white/90 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Ürünleri İncele</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Bottom Row: 3 Smaller Cards */}
                {bottomRow.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {bottomRow.map((category, index) => (
                            <Link
                                key={category.id}
                                href={`/category/${category.slug}`}
                                className={`relative h-40 sm:h-44 md:h-52 rounded-2xl overflow-hidden group block ring-1 ring-black/5 dark:ring-white/10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${index === bottomRow.length - 1 ? 'hidden sm:block' : ''}`}
                            >
                                {category.imageUrl ? (
                                    <Image
                                        src={category.imageUrl}
                                        alt={category.name}
                                        fill
                                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                        sizes="(max-width: 640px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                                )}
                                {/* Gradient overlay with brand blue tint */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#002838]/80 via-[#002838]/20 to-transparent group-hover:from-[#002838]/70 transition-all duration-300" />

                                {/* Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                    <h3 className="text-white font-bold text-sm sm:text-base md:text-lg drop-shadow-lg mb-0.5">
                                        {category.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-white/0 group-hover:text-white/90 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Ürünleri İncele</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
